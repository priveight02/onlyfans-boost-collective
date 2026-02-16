import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PURCHASE-CREDITS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Base price per credit in cents (display rate — matches frontend)
const BASE_PRICE_PER_CREDIT_CENTS = 1.816;

// Public URL for custom credits checkout image
const CUSTOM_CREDITS_IMAGE = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/product-images/credits-custom.png";

// Volume discount tiers (max 40%)
const getVolumeDiscount = (credits: number): number => {
  if (credits >= 10000) return 0.40;
  if (credits >= 5000) return 0.35;
  if (credits >= 3000) return 0.30;
  if (credits >= 2000) return 0.25;
  if (credits >= 1000) return 0.20;
  if (credits >= 500) return 0.15;
  if (credits >= 200) return 0.10;
  if (credits >= 100) return 0.05;
  return 0;
};

// Discount price maps (loyalty discounts: 10%, 20%, 30%)
const DISCOUNT_PRICE_MAP: Record<string, Record<number, string>> = {
  "price_1T1SVSAMkMnyWeZ5lpbo5nnM": { 0: "price_1T1SVSAMkMnyWeZ5lpbo5nnM", 10: "price_1T1SXIAMkMnyWeZ5bpR97WZH", 20: "price_1T1SXfAMkMnyWeZ5wxGX7D72", 30: "price_1T1SXrAMkMnyWeZ5ClWJ75fp" },
  "price_1T1SVlAMkMnyWeZ5PiBiexTs": { 0: "price_1T1SVlAMkMnyWeZ5PiBiexTs", 10: "price_1T1SYQAMkMnyWeZ5lDASBhy3", 20: "price_1T1SZ2AMkMnyWeZ5qvL9fRwB", 30: "price_1T1SZQAMkMnyWeZ5kkNOaLVz" },
  "price_1T1SWCAMkMnyWeZ5DIVbUk38": { 0: "price_1T1SWCAMkMnyWeZ5DIVbUk38", 10: "price_1T1SZzAMkMnyWeZ5T3tdVHgg", 20: "price_1T1SbGAMkMnyWeZ5Tjqw0SUa", 30: "price_1T1SbXAMkMnyWeZ5Jp4D8U8r" },
  "price_1T1SWxAMkMnyWeZ5yrq2uX3g": { 0: "price_1T1SWxAMkMnyWeZ5yrq2uX3g", 10: "price_1T1SeWAMkMnyWeZ5sf9eG8uA", 20: "price_1T1SgqAMkMnyWeZ5DmN02WxJ", 30: "price_1T1ShlAMkMnyWeZ5MC6tzeic" },
};

// Retention price map (50% one-time discount)
const RETENTION_PRICE_MAP: Record<string, string> = {
  "price_1T1SVSAMkMnyWeZ5lpbo5nnM": "price_1T1SYFAMkMnyWeZ53rDu8CSN",
  "price_1T1SVlAMkMnyWeZ5PiBiexTs": "price_1T1SZbAMkMnyWeZ5wLc3xOjh",
  "price_1T1SWCAMkMnyWeZ5DIVbUk38": "price_1T1SdOAMkMnyWeZ50Gz5FNLT",
  "price_1T1SWxAMkMnyWeZ5yrq2uX3g": "price_1T1Si3AMkMnyWeZ5pOyBXxlG",
};


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { packageId, customCredits, useRetentionDiscount } = body;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("purchase_count, retention_credits_used")
      .eq("user_id", user.id)
      .single();
    const currentPurchaseCount = wallet?.purchase_count || 0;
    const retentionAlreadyUsed = wallet?.retention_credits_used || false;

    // Declining discount: 1st repurchase=30%, 2nd=20%, 3rd=10%, then 0%
    const getReturningDiscount = (count: number): number => {
      if (count === 1) return 30;
      if (count === 2) return 20;
      if (count === 3) return 10;
      return 0;
    };
    const returningDiscountPercent = getReturningDiscount(currentPurchaseCount);

    const origin = "https://ozcagency.com";

    // --- CUSTOM CREDITS MODE ---
    if (customCredits && typeof customCredits === "number" && customCredits >= 10) {
      logStep("Custom credits mode", { customCredits });

      const volumeDiscount = getVolumeDiscount(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscount);
      let totalCents = Math.round(customCredits * pricePerCredit);

      // Apply returning discount on top
      if (returningDiscountPercent > 0) {
        totalCents = Math.round(totalCents * (1 - returningDiscountPercent / 100));
      }

      logStep("Price calculated", { volumeDiscount: `${Math.round(volumeDiscount * 100)}%`, returningDiscount: `${returningDiscountPercent}%`, totalCents });

      const product = await stripe.products.create({
        name: `${customCredits.toLocaleString()} Credits${volumeDiscount > 0 ? ` (${Math.round(volumeDiscount * 100)}% vol.)` : ''}${returningDiscountPercent > 0 ? ` + ${returningDiscountPercent}% loyalty` : ''}`,
        images: [CUSTOM_CREDITS_IMAGE],
        metadata: { type: 'custom_credits', credits: String(customCredits) },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: totalCents,
        currency: 'usd',
      });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/pricing?success=true&credits=${customCredits}`,
        cancel_url: `${origin}/pricing?canceled=true`,
        metadata: {
          user_id: user.id,
          package_id: "custom",
          credits: String(customCredits),
          bonus_credits: "0",
          is_returning: String(returningDiscountPercent > 0),
        },
      });

      logStep("Custom checkout session created", { sessionId: session.id });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- PACKAGE MODE ---
    if (!packageId) throw new Error("Package ID or customCredits required");

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();
    if (pkgError || !pkg) throw new Error("Invalid package");
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    // Use the price ID directly from the database
    let checkoutPriceId = pkg.stripe_price_id;
    const discountMap = DISCOUNT_PRICE_MAP[checkoutPriceId];

    // Check if retention 50% discount requested (non-stackable, one-time only)
    if (useRetentionDiscount && !retentionAlreadyUsed && RETENTION_PRICE_MAP[checkoutPriceId]) {
      checkoutPriceId = RETENTION_PRICE_MAP[checkoutPriceId];
      logStep("Using retention 50% price", { priceId: checkoutPriceId });

      // Mark retention as used immediately
      await supabaseAdmin
        .from("wallets")
        .update({ retention_credits_used: true })
        .eq("user_id", user.id);
    } else if (useRetentionDiscount && retentionAlreadyUsed) {
      throw new Error("Retention discount already used. This is a one-time offer.");
    } else if (discountMap && returningDiscountPercent > 0 && discountMap[returningDiscountPercent]) {
      checkoutPriceId = discountMap[returningDiscountPercent];
      logStep(`Using pre-created discounted price`, { discount: `${returningDiscountPercent}%`, priceId: checkoutPriceId });
    } else {
      logStep(`Using normal price`, { priceId: checkoutPriceId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/pricing?success=true&credits=${pkg.credits + pkg.bonus_credits}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        bonus_credits: String(pkg.bonus_credits),
        is_returning: String(returningDiscountPercent > 0),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, discount: returningDiscountPercent });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

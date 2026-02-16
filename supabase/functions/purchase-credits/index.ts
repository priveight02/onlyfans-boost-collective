import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

// Volume discount tiers (starts at 10k, max 40%)
const getVolumeDiscount = (credits: number): number => {
  if (credits >= 100000) return 0.40;
  if (credits >= 75000) return 0.35;
  if (credits >= 50000) return 0.30;
  if (credits >= 30000) return 0.25;
  if (credits >= 20000) return 0.20;
  if (credits >= 15000) return 0.15;
  if (credits >= 10000) return 0.05;
  return 0;
};

// Stripe coupon IDs for discounts (applied at checkout on base price)
const LOYALTY_COUPON_MAP: Record<number, string> = {
  10: "j5jMOrlU",   // Loyalty 10% Off
  20: "r71MZDc7",   // Loyalty 20% Off
  30: "DsXHlXrd",   // Loyalty 30% Off
};
const RETENTION_COUPON_ID = "5P34jI5L"; // Retention 50% Off


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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

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
    if (customCredits && typeof customCredits === "number" && customCredits >= 500) {
      logStep("Custom credits mode", { customCredits });

      const volumeDiscount = getVolumeDiscount(customCredits);
      const volumeDiscountPercent = Math.round(volumeDiscount * 100);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscount);
      let totalCents = Math.round(customCredits * pricePerCredit);

      // Apply returning discount on top
      if (returningDiscountPercent > 0) {
        totalCents = Math.round(totalCents * (1 - returningDiscountPercent / 100));
      }

      logStep("Price calculated", { volumeDiscount: `${volumeDiscountPercent}%`, returningDiscount: `${returningDiscountPercent}%`, totalCents });

      // Check for cached product/price in database
      let checkoutPriceId: string;
      const { data: cached } = await supabaseAdmin
        .from("custom_credit_products")
        .select("stripe_price_id, unit_amount_cents")
        .eq("credits", customCredits)
        .eq("volume_discount_percent", volumeDiscountPercent)
        .single();

      if (cached && cached.unit_amount_cents === totalCents) {
        // Reuse existing Stripe product/price
        checkoutPriceId = cached.stripe_price_id;
        logStep("Using cached custom product", { priceId: checkoutPriceId });
      } else {
        // Create new Stripe product + price and cache it
        const product = await stripe.products.create({
          name: `${customCredits.toLocaleString()} Credits${volumeDiscount > 0 ? ` (${volumeDiscountPercent}% vol.)` : ''}`,
          images: [CUSTOM_CREDITS_IMAGE],
          metadata: { type: 'custom_credits', credits: String(customCredits) },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: totalCents,
          currency: 'usd',
        });

        checkoutPriceId = price.id;

        // Cache in database (upsert on unique constraint)
        await supabaseAdmin.from("custom_credit_products").upsert({
          credits: customCredits,
          volume_discount_percent: volumeDiscountPercent,
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          unit_amount_cents: totalCents,
        }, { onConflict: "credits,volume_discount_percent" });

        logStep("Created & cached new custom product", { productId: product.id, priceId: price.id });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: checkoutPriceId, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded",
        return_url: `${origin}/pricing?success=true&credits=${customCredits}`,
        metadata: {
          user_id: user.id,
          package_id: "custom",
          credits: String(customCredits),
          bonus_credits: "0",
          is_returning: String(returningDiscountPercent > 0),
        },
      });

      logStep("Custom checkout session created", { sessionId: session.id });
      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
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

    // Always use the base price from the database
    const checkoutPriceId = pkg.stripe_price_id;

    // Determine which coupon to auto-apply (if any)
    let couponId: string | undefined;

    if (useRetentionDiscount && !retentionAlreadyUsed) {
      couponId = RETENTION_COUPON_ID;
      logStep("Applying retention 50% coupon", { couponId });

      // Mark retention as used immediately
      await supabaseAdmin
        .from("wallets")
        .update({ retention_credits_used: true })
        .eq("user_id", user.id);
    } else if (useRetentionDiscount && retentionAlreadyUsed) {
      throw new Error("Retention discount already used. This is a one-time offer.");
    } else if (returningDiscountPercent > 0 && LOYALTY_COUPON_MAP[returningDiscountPercent]) {
      couponId = LOYALTY_COUPON_MAP[returningDiscountPercent];
      logStep("Applying loyalty coupon", { discount: `${returningDiscountPercent}%`, couponId });
    } else {
      logStep("No discount coupon applied", { priceId: checkoutPriceId });
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded",
      return_url: `${origin}/pricing?success=true&credits=${pkg.credits + pkg.bonus_credits}`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        bonus_credits: String(pkg.bonus_credits),
        is_returning: String(returningDiscountPercent > 0),
      },
    };

    // Auto-apply coupon so user sees discount on Stripe checkout page
    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, discount: returningDiscountPercent });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
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

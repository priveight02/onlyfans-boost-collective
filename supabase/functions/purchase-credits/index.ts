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

// Base price per credit in cents
const BASE_PRICE_PER_CREDIT_CENTS = 9.99;

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

// Detect test vs live mode from Stripe key
const isTestMode = () => (Deno.env.get("STRIPE_SECRET_KEY") || "").startsWith("sk_test_");

// Live mode price maps
const LIVE_DISCOUNT_PRICE_MAP: Record<string, Record<number, string>> = {
  "price_1T1AusP8Id8IBpd0HrNyaRWe": { 0: "price_1T1AusP8Id8IBpd0HrNyaRWe", 10: "price_1T1CycP8Id8IBpd0bQpuDaiR", 20: "price_1T1CyRP8Id8IBpd0yzku7LvD", 30: "price_1T1CyDP8Id8IBpd0TjT9sq9G" },
  "price_1T1AvOP8Id8IBpd0jM8b94Al": { 0: "price_1T1AvOP8Id8IBpd0jM8b94Al", 10: "price_1T1CzMP8Id8IBpd0SWdDvq6V", 20: "price_1T1CyyP8Id8IBpd0yihRkIU3", 30: "price_1T1CynP8Id8IBpd0MGCVyRhE" },
  "price_1T1AvlP8Id8IBpd03ocd2mOy": { 0: "price_1T1AvlP8Id8IBpd03ocd2mOy", 10: "price_1T1D06P8Id8IBpd0mhpxLZeK", 20: "price_1T1CzuP8Id8IBpd0e9rFMVKy", 30: "price_1T1CzkP8Id8IBpd0ZyAlES0z" },
  "price_1T1AwMP8Id8IBpd0PfrPX50i": { 0: "price_1T1AwMP8Id8IBpd0PfrPX50i", 10: "price_1T1D1RP8Id8IBpd0D0yBkzcL", 20: "price_1T1D0mP8Id8IBpd06fwa5Aqn", 30: "price_1T1D0KP8Id8IBpd0nm2nxxAe" },
};

const TEST_DISCOUNT_PRICE_MAP: Record<string, Record<number, string>> = {
  "price_1T1EzQP8Id8IBpd0EUEHb3xO": { 0: "price_1T1EzQP8Id8IBpd0EUEHb3xO", 10: "price_1T1F0QP8Id8IBpd08PJqAwPH", 20: "price_1T1F0bP8Id8IBpd0qasgeLHj", 30: "price_1T1F0pP8Id8IBpd0XumPrEBI" },
  "price_1T1EzcP8Id8IBpd0XF0N6eyw": { 0: "price_1T1EzcP8Id8IBpd0XF0N6eyw", 10: "price_1T1F16P8Id8IBpd0pVGOVb7H", 20: "price_1T1F1GP8Id8IBpd00lRLLggQ", 30: "price_1T1F1RP8Id8IBpd0XPCBGi2w" },
  "price_1T1EznP8Id8IBpd0QjxuzkPs": { 0: "price_1T1EznP8Id8IBpd0QjxuzkPs", 10: "price_1T1F1eP8Id8IBpd0uGSmHQVK", 20: "price_1T1F1oP8Id8IBpd0InkGXdtd", 30: "price_1T1F22P8Id8IBpd0E6ULh8K2" },
  "price_1T1F04P8Id8IBpd0xJCSez0v": { 0: "price_1T1F04P8Id8IBpd0xJCSez0v", 10: "price_1T1F2GP8Id8IBpd0wU7YdTb5", 20: "price_1T1F2SP8Id8IBpd0WdyE3Jkk", 30: "price_1T1F2dP8Id8IBpd0elbmX4cN" },
};

const LIVE_RETENTION_PRICE_MAP: Record<string, string> = {
  "price_1T1AusP8Id8IBpd0HrNyaRWe": "price_1T1EaQP8Id8IBpd02WQr8zhR",
  "price_1T1AvOP8Id8IBpd0jM8b94Al": "price_1T1EabP8Id8IBpd03miZJi8B",
  "price_1T1AvlP8Id8IBpd03ocd2mOy": "price_1T1EalP8Id8IBpd0DYdqUlCO",
  "price_1T1AwMP8Id8IBpd0PfrPX50i": "price_1T1EaxP8Id8IBpd0nU22G2sB",
};

const TEST_RETENTION_PRICE_MAP: Record<string, string> = {
  "price_1T1EzQP8Id8IBpd0EUEHb3xO": "price_1T1F2pP8Id8IBpd0AIe5XdPA",
  "price_1T1EzcP8Id8IBpd0XF0N6eyw": "price_1T1F2zP8Id8IBpd0VYvKRGj4",
  "price_1T1EznP8Id8IBpd0QjxuzkPs": "price_1T1F38P8Id8IBpd0IgzzP26i",
  "price_1T1F04P8Id8IBpd0xJCSez0v": "price_1T1F3PP8Id8IBpd02EG7DEco",
};

// Live ↔ Test base price mapping
const LIVE_TO_TEST_PRICE: Record<string, string> = {
  "price_1T1AusP8Id8IBpd0HrNyaRWe": "price_1T1EzQP8Id8IBpd0EUEHb3xO",
  "price_1T1AvOP8Id8IBpd0jM8b94Al": "price_1T1EzcP8Id8IBpd0XF0N6eyw",
  "price_1T1AvlP8Id8IBpd03ocd2mOy": "price_1T1EznP8Id8IBpd0QjxuzkPs",
  "price_1T1AwMP8Id8IBpd0PfrPX50i": "price_1T1F04P8Id8IBpd0xJCSez0v",
  "price_1T1AwXP8Id8IBpd0BT0fgcRw": "price_1T1F0FP8Id8IBpd0xgh35Exp",
};

const getDiscountPriceMap = () => isTestMode() ? TEST_DISCOUNT_PRICE_MAP : LIVE_DISCOUNT_PRICE_MAP;
const getRetentionPriceMap = () => isTestMode() ? TEST_RETENTION_PRICE_MAP : LIVE_RETENTION_PRICE_MAP;
const resolvePrice = (livePriceId: string) => isTestMode() ? (LIVE_TO_TEST_PRICE[livePriceId] || livePriceId) : livePriceId;

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
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents, testMode: isTestMode() });

    // Resolve the price ID for test/live mode
    const resolvedPriceId = resolvePrice(pkg.stripe_price_id);
    let checkoutPriceId = resolvedPriceId;
    const DISCOUNT_PRICE_MAP = getDiscountPriceMap();
    const RETENTION_PRICE_MAP = getRetentionPriceMap();
    const discountMap = DISCOUNT_PRICE_MAP[resolvedPriceId];

    // Check if retention 50% discount requested (non-stackable, one-time only)
    if (useRetentionDiscount && !retentionAlreadyUsed && RETENTION_PRICE_MAP[resolvedPriceId]) {
      checkoutPriceId = RETENTION_PRICE_MAP[resolvedPriceId];
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

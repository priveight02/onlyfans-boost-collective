import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Detect test vs live mode from Stripe key
const isTestMode = () => (Deno.env.get("STRIPE_SECRET_KEY") || "").startsWith("sk_test_");

// Live → Test subscription price mapping
const LIVE_TO_TEST_SUB_PRICE: Record<string, string> = {
  // Starter
  "price_1T1CVAP8Id8IBpd0heXxbsUk": "price_1T1EyGP8Id8IBpd0tNAn9MrU", // monthly
  "price_1T1CcdP8Id8IBpd0AppiCEdo": "price_1T1EyRP8Id8IBpd0T0nuzf8K", // yearly
  // Pro
  "price_1T1CVfP8Id8IBpd0B8EfZeGR": "price_1T1EybP8Id8IBpd0G6zKzoSS", // monthly
  "price_1T1CcuP8Id8IBpd0X5c5Nqbs": "price_1T1EymP8Id8IBpd0nJZGVBlM", // yearly
  // Business
  "price_1T1CVpP8Id8IBpd07EYina3g": "price_1T1Ez2P8Id8IBpd0SjMOkzvg", // monthly
  "price_1T1Cd3P8Id8IBpd0Ds2Y7HoM": "price_1T1EzDP8Id8IBpd0VOZZoLYG", // yearly
};

const resolveSubPrice = (priceId: string) => isTestMode() ? (LIVE_TO_TEST_SUB_PRICE[priceId] || priceId) : priceId;

// Plan tier ordering for upgrade/downgrade detection
const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };

// Product ID → plan ID mapping (both live and test)
const PRODUCT_TO_PLAN: Record<string, string> = {
  // Live products
  "prod_TzAqP0zH90vzyR": "starter",
  "prod_TzAypr06as419B": "starter",
  "prod_TzArZUF2DIlzHq": "pro",
  "prod_TzAywFFZ0SdhfZ": "pro",
  "prod_TzAram9it2Kedf": "business",
  "prod_TzAzgoteaSHuDB": "business",
  // Test products
  "prod_TzDPwhTrnCOnYm": "starter",
  "prod_TzDPUEvS935A88": "starter",
  "prod_TzDPNCljqBJ2Cq": "pro",
  "prod_TzDPxffqvU9iSq": "pro",
  "prod_TzDPr3jeAGF9mm": "business",
  "prod_TzDQJVbiYpTH9Y": "business",
};

// Credits per plan for granting after subscription
const PLAN_CREDITS: Record<string, number> = {
  starter: 215,
  pro: 1075,
  business: 4300,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, planId, billingCycle, currentPlanId } = await req.json();
    if (!priceId) throw new Error("Price ID required");
    const resolvedPriceId = resolveSubPrice(priceId);
    logStep("Checkout request", { priceId, resolvedPriceId, planId, billingCycle, currentPlanId, testMode: isTestMode() });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-04-30.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let existingSub: Stripe.Subscription | null = null;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check for existing active subscription
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      if (subs.data.length > 0) {
        existingSub = subs.data[0];
      }
    }

    // ─── SERVER-SIDE plan detection from existing subscription ───
    // Don't trust the frontend's currentPlanId — detect from Stripe directly
    let detectedCurrentPlanId = "free";
    if (existingSub) {
      const existingProductId = typeof existingSub.items.data[0].price.product === "string"
        ? existingSub.items.data[0].price.product
        : (existingSub.items.data[0].price.product as any)?.id || "";
      detectedCurrentPlanId = PRODUCT_TO_PLAN[existingProductId] || "free";
      logStep("Detected current plan from Stripe", { existingProductId, detectedCurrentPlanId });
    }

    const currentTier = PLAN_TIER_ORDER[detectedCurrentPlanId] ?? 0;
    const targetTier = PLAN_TIER_ORDER[planId] ?? 0;
    const isUpgrade = targetTier > currentTier && currentTier > 0;
    const isDowngrade = targetTier < currentTier && currentTier > 0;

    logStep("Plan change direction", { detectedCurrentPlanId, planId, currentTier, targetTier, isUpgrade, isDowngrade, hasExistingSub: !!existingSub });

    // ─── UPGRADE: update subscription in-place with proration ───
    if (existingSub && isUpgrade) {
      const subItemId = existingSub.items.data[0].id;
      logStep("Upgrading subscription with proration", { subId: existingSub.id, subItemId, newPrice: resolvedPriceId });

      const updatedSub = await stripe.subscriptions.update(existingSub.id, {
        items: [{ id: subItemId, price: resolvedPriceId }],
        proration_behavior: "always_invoice", // charge the difference immediately
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle || "monthly",
          credits: String(PLAN_CREDITS[planId] || 0),
          type: "upgrade",
          previous_plan: detectedCurrentPlanId,
        },
      });

      logStep("Subscription upgraded successfully", { subId: updatedSub.id, status: updatedSub.status });

      // Grant credits for the new plan
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const credits = PLAN_CREDITS[planId] || 0;
      if (credits > 0) {
        const { data: wallet } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
        if (wallet) {
          await adminClient.from("wallets").update({ balance: wallet.balance + credits }).eq("user_id", user.id);
          logStep("Credits granted for upgrade", { credits, newBalance: wallet.balance + credits });
        }
      }

      return new Response(JSON.stringify({ upgraded: true, message: `Upgraded to ${planId}. You only pay the prorated difference.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DOWNGRADE: update subscription at period end ───
    if (existingSub && isDowngrade) {
      const subItemId = existingSub.items.data[0].id;
      logStep("Downgrading subscription (takes effect at period end)", { subId: existingSub.id, newPrice: resolvedPriceId });

      // Schedule the price change at the end of the current billing period
      await stripe.subscriptions.update(existingSub.id, {
        items: [{ id: subItemId, price: resolvedPriceId }],
        proration_behavior: "none", // no refund, change takes effect at renewal
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle || "monthly",
          credits: String(PLAN_CREDITS[planId] || 0),
          type: "downgrade",
          previous_plan: detectedCurrentPlanId,
        },
      });

      logStep("Subscription downgraded (effective at renewal)");

      return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Takes effect at the end of your current billing period.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SAME PLAN: prevent re-buying the same plan ───
    if (existingSub && detectedCurrentPlanId === planId) {
      logStep("User already on this plan", { planId });
      return new Response(JSON.stringify({ error: "You're already on this plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ─── NEW SUBSCRIPTION (from free tier): create checkout session ───
    // Cancel any leftover subs just in case
    if (existingSub) {
      logStep("Canceling existing subscription before new checkout", { subId: existingSub.id });
      await stripe.subscriptions.cancel(existingSub.id, { prorate: true });
    }

    const origin = "https://ozcagency.com";
    const credits = PLAN_CREDITS[planId] || 0;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/profile?subscription=success&plan=${planId}`,
      cancel_url: `${origin}/profile?subscription=canceled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle || "monthly",
        credits: String(credits),
        bonus_credits: "0",
        type: "subscription",
      },
    });

    logStep("Checkout session created", { sessionId: session.id });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

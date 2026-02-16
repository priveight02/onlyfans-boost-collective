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

// ═══════════════════════════════════════════════════════
// Stripe Plans — LIVE price IDs (auto-mapped to TEST below)
// ═══════════════════════════════════════════════════════
const STRIPE_PLAN_MAP: Record<string, { monthly: string; yearly: string; product_monthly: string; product_yearly: string }> = {
  starter: {
    monthly: "price_1T1CVAP8Id8IBpd0heXxbsUk",
    yearly: "price_1T1CcdP8Id8IBpd0AppiCEdo",
    product_monthly: "prod_TzAqP0zH90vzyR",
    product_yearly: "prod_TzAypr06as419B",
  },
  pro: {
    monthly: "price_1T1CVfP8Id8IBpd0B8EfZeGR",
    yearly: "price_1T1CcuP8Id8IBpd0X5c5Nqbs",
    product_monthly: "prod_TzArZUF2DIlzHq",
    product_yearly: "prod_TzAywFFZ0SdhfZ",
  },
  business: {
    monthly: "price_1T1CVpP8Id8IBpd07EYina3g",
    yearly: "price_1T1Cd3P8Id8IBpd0Ds2Y7HoM",
    product_monthly: "prod_TzAram9it2Kedf",
    product_yearly: "prod_TzAzgoteaSHuDB",
  },
};

// TEST environment equivalents
const LIVE_TO_TEST_PRICE: Record<string, string> = {
  "price_1T1CVAP8Id8IBpd0heXxbsUk": "price_1T1S56AVBBvDGKKB8EV7ZvO1",
  "price_1T1CcdP8Id8IBpd0AppiCEdo": "price_1T1S5fAVBBvDGKKBfv4Yzmvi",
  "price_1T1CVfP8Id8IBpd0B8EfZeGR": "price_1T1S5yAVBBvDGKKBhM9khxrJ",
  "price_1T1CcuP8Id8IBpd0X5c5Nqbs": "price_1T1S6JAVBBvDGKKBMqAezmPe",
  "price_1T1CVpP8Id8IBpd07EYina3g": "price_1T1S6YAVBBvDGKKBhYhs5Odi",
  "price_1T1Cd3P8Id8IBpd0Ds2Y7HoM": "price_1T1S6qAVBBvDGKKBiWitaZzY",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  // Live
  "prod_TzAqP0zH90vzyR": "starter", "prod_TzAypr06as419B": "starter",
  "prod_TzArZUF2DIlzHq": "pro", "prod_TzAywFFZ0SdhfZ": "pro",
  "prod_TzAram9it2Kedf": "business", "prod_TzAzgoteaSHuDB": "business",
  // Test
  "prod_TzQxzU5hz8sdwa": "starter", "prod_TzQxbSs93pQQtb": "starter",
  "prod_TzQxBoodMhERqW": "pro", "prod_TzQyWX1DZuWpdA": "pro",
  "prod_TzQyMmAEWuE1Ls": "business", "prod_TzQyfPCDZvRxLn": "business",
};

const PLAN_CREDITS: Record<string, number> = { starter: 215, pro: 1075, business: 4300 };
const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const isTestMode = stripeKey.startsWith("sk_test_");

    const { planId, billingCycle } = await req.json();
    if (!planId) throw new Error("planId required");

    const planInfo = STRIPE_PLAN_MAP[planId];
    if (!planInfo) {
      return new Response(JSON.stringify({ error: "Contact sales for Enterprise plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    let priceId = planInfo[cycle];
    if (isTestMode && LIVE_TO_TEST_PRICE[priceId]) {
      priceId = LIVE_TO_TEST_PRICE[priceId];
    }
    logStep("Checkout request", { planId, cycle, priceId, isTestMode });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });

      // Check for active subscription
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length > 0) {
        const existingSub = subs.data[0];
        const existingProductId = existingSub.items.data[0]?.price?.product as string || "";
        const detectedCurrentPlanId = PRODUCT_TO_PLAN[existingProductId] || "free";
        const currentTier = PLAN_TIER_ORDER[detectedCurrentPlanId] ?? 0;
        const targetTier = PLAN_TIER_ORDER[planId] ?? 0;

        logStep("Existing subscription found", { subId: existingSub.id, detectedCurrentPlanId, planId });

        // Same plan
        if (detectedCurrentPlanId === planId) {
          return new Response(JSON.stringify({ error: "You're already on this plan." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
          });
        }

        // Upgrade: prorate immediately
        if (targetTier > currentTier) {
          logStep("Upgrading subscription", { from: detectedCurrentPlanId, to: planId });
          await stripe.subscriptions.update(existingSub.id, {
            items: [{ id: existingSub.items.data[0].id, price: priceId }],
            proration_behavior: "always_invoice",
          });

          // Grant credits
          const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
          const credits = PLAN_CREDITS[planId] || 0;
          if (credits > 0) {
            const { data: wallet } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
            if (wallet) {
              await adminClient.from("wallets").update({ balance: wallet.balance + credits }).eq("user_id", user.id);
              logStep("Credits granted for upgrade", { credits });
            }
          }

          return new Response(JSON.stringify({ upgraded: true, message: `Upgraded to ${planId}. You only pay the prorated difference.` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Downgrade: schedule change at period end
        if (targetTier < currentTier) {
          logStep("Downgrading subscription", { from: detectedCurrentPlanId, to: planId });
          await stripe.subscriptions.update(existingSub.id, {
            items: [{ id: existingSub.items.data[0].id, price: priceId }],
            proration_behavior: "none",
          });

          return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Takes effect at the end of your current billing period.` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // No existing subscription — create Stripe checkout session
    const credits = PLAN_CREDITS[planId] || 0;
    const origin = req.headers.get("origin") || "https://ozcagency.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/profile?subscription=success&plan=${planId}`,
      cancel_url: `${origin}/profile?subscription=canceled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: cycle,
        credits: String(credits),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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

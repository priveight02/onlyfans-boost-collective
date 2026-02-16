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

// Plan tier ordering for upgrade/downgrade detection
const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };

// Product ID → plan ID mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TzRgEeRDcQGUHO": "starter",  // starter monthly
  "prod_TzRgDinqZCjhkj": "starter",  // starter yearly
  "prod_TzRg6tvanQWkyW": "pro",       // pro monthly
  "prod_TzRhV74aOMLdYQ": "pro",       // pro yearly
  "prod_TzRiKIs7vwe9gD": "business",  // business monthly
  "prod_TzRkvTVWaGWgCp": "business",  // business yearly
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
    logStep("Checkout request", { priceId, planId, billingCycle, currentPlanId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let existingSub: Stripe.Subscription | null = null;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      if (subs.data.length > 0) {
        existingSub = subs.data[0];
      }
    }

    // Server-side plan detection from existing subscription
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

    logStep("Plan change direction", { detectedCurrentPlanId, planId, currentTier, targetTier, isUpgrade, isDowngrade });

    // UPGRADE: update subscription in-place with proration
    if (existingSub && isUpgrade) {
      const subItemId = existingSub.items.data[0].id;
      logStep("Upgrading subscription with proration", { subId: existingSub.id, subItemId, newPrice: priceId });

      const updatedSub = await stripe.subscriptions.update(existingSub.id, {
        items: [{ id: subItemId, price: priceId }],
        proration_behavior: "always_invoice",
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

    // DOWNGRADE: update subscription at period end
    if (existingSub && isDowngrade) {
      const subItemId = existingSub.items.data[0].id;
      logStep("Downgrading subscription (takes effect at period end)", { subId: existingSub.id, newPrice: priceId });

      await stripe.subscriptions.update(existingSub.id, {
        items: [{ id: subItemId, price: priceId }],
        proration_behavior: "none",
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle || "monthly",
          credits: String(PLAN_CREDITS[planId] || 0),
          type: "downgrade",
          previous_plan: detectedCurrentPlanId,
        },
      });

      return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Takes effect at the end of your current billing period.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAME PLAN: prevent re-buying
    if (existingSub && detectedCurrentPlanId === planId) {
      return new Response(JSON.stringify({ error: "You're already on this plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // NEW SUBSCRIPTION (from free tier)
    if (existingSub) {
      logStep("Canceling existing subscription before new checkout", { subId: existingSub.id });
      await stripe.subscriptions.cancel(existingSub.id, { prorate: true });
    }

    const origin = "https://ozcagency.com";
    const credits = PLAN_CREDITS[planId] || 0;

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

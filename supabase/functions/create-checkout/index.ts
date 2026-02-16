import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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
  "prod_TzUtPv1PXmYddy": "starter",
  "prod_TzUtpBDWyb3qR6": "starter",
  "prod_TzUuDHxcoyItCj": "pro",
  "prod_TzUuv2bXrA1EVF": "pro",
  "prod_TzUu26T8Hiv2lS": "business",
  "prod_TzUv67N4QUbXHN": "business",
};

// Credits per plan for granting after subscription
const PLAN_CREDITS: Record<string, number> = {
  starter: 215,
  pro: 1075,
  business: 4300,
};

// Stripe coupon IDs for auto-applied discounts
const LOYALTY_COUPON_MAP: Record<number, string> = {
  10: "j5jMOrlU",
  20: "r71MZDc7",
  30: "DsXHlXrd",
};
const RETENTION_COUPON_ID = "5P34jI5L";

// Yearly discount coupons (auto-applied at checkout)
const YEARLY_COUPON_MAP: Record<string, string> = {
  starter: "tY7Dc8CS",  // 15% off
  pro: "Tw4fW0YB",      // 30% off
  business: "OC7IWjQT",  // 33% off
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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let existingSub: any = null;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      if (subs.data.length > 0) {
        existingSub = subs.data[0];
      }
    }

    // Check wallet for loyalty discount info
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: wallet } = await adminClient
      .from("wallets")
      .select("purchase_count, retention_credits_used")
      .eq("user_id", user.id)
      .single();
    const purchaseCount = wallet?.purchase_count || 0;
    const retentionAlreadyUsed = wallet?.retention_credits_used || false;

    // Declining loyalty discount: 1st repurchase=30%, 2nd=20%, 3rd=10%, then 0%
    const getReturningDiscount = (count: number): number => {
      if (count === 1) return 30;
      if (count === 2) return 20;
      if (count === 3) return 10;
      return 0;
    };
    const returningDiscountPercent = getReturningDiscount(purchaseCount);

    // Determine coupon to auto-apply
    let couponId: string | undefined;

    // Yearly plans get their own discount coupon
    if (billingCycle === "yearly" && YEARLY_COUPON_MAP[planId]) {
      couponId = YEARLY_COUPON_MAP[planId];
      logStep("Will apply yearly discount coupon", { planId, couponId });
    } else if (returningDiscountPercent > 0 && LOYALTY_COUPON_MAP[returningDiscountPercent]) {
      couponId = LOYALTY_COUPON_MAP[returningDiscountPercent];
      logStep("Will apply loyalty coupon to checkout", { discount: `${returningDiscountPercent}%`, couponId });
    }

    // Server-side plan detection from existing subscription
    let detectedCurrentPlanId = "free";
    if (existingSub) {
      const existingProductId = typeof existingSub.items.data[0].price.product === "string"
        ? existingSub.items.data[0].price.product
        : existingSub.items.data[0].price.product?.id || "";
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

      const credits = PLAN_CREDITS[planId] || 0;
      if (credits > 0) {
        const { data: walletData } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
        if (walletData) {
          await adminClient.from("wallets").update({ balance: walletData.balance + credits }).eq("user_id", user.id);
          logStep("Credits granted for upgrade", { credits, newBalance: walletData.balance + credits });
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

    const sessionParams: any = {
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
    };

    // Auto-apply coupon so user sees discount on Stripe checkout page
    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
      logStep("Coupon auto-applied to subscription checkout", { couponId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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

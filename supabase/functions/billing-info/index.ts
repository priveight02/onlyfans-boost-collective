import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[BILLING-INFO] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

const PRODUCT_NAME_MAP: Record<string, string> = {
  "prod_TzAqP0zH90vzyR": "Starter", "prod_TzAypr06as419B": "Starter",
  "prod_TzArZUF2DIlzHq": "Pro", "prod_TzAywFFZ0SdhfZ": "Pro",
  "prod_TzAram9it2Kedf": "Business", "prod_TzAzgoteaSHuDB": "Business",
  "prod_TzQxzU5hz8sdwa": "Starter", "prod_TzQxbSs93pQQtb": "Starter",
  "prod_TzQxBoodMhERqW": "Pro", "prod_TzQyWX1DZuWpdA": "Pro",
  "prod_TzQyMmAEWuE1Ls": "Business", "prod_TzQyfPCDZvRxLn": "Business",
};

// Pro + Business product IDs eligible for retention
const ELIGIBLE_PRODUCT_IDS = [
  // Live
  "prod_TzArZUF2DIlzHq", "prod_TzAywFFZ0SdhfZ",
  "prod_TzAram9it2Kedf", "prod_TzAzgoteaSHuDB",
  // Test
  "prod_TzQxBoodMhERqW", "prod_TzQyWX1DZuWpdA",
  "prod_TzQyMmAEWuE1Ls", "prod_TzQyfPCDZvRxLn",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Not authenticated");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "info";

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        subscription: null,
        payments: [],
        eligible_for_retention: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Action: apply retention coupon
    if (action === "apply_retention_coupon") {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length === 0) {
        return new Response(JSON.stringify({ error: "No active subscription" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      // Apply 50% coupon
      await stripe.subscriptions.update(subs.data[0].id, {
        coupon: "retention_50",
      });

      return new Response(JSON.stringify({ success: true, message: "50% discount applied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscription info
    const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    let sub = activeSubs.data[0] || null;

    // Check for canceled subs still within billing period
    if (!sub) {
      const canceledSubs = await stripe.subscriptions.list({ customer: customerId, status: "canceled", limit: 5 });
      const now = Math.floor(Date.now() / 1000);
      for (const cs of canceledSubs.data) {
        if (cs.current_period_end > now) {
          sub = cs;
          break;
        }
      }
    }

    let subscription = null;
    if (sub) {
      const productId = sub.items.data[0]?.price?.product as string || "";
      const priceId = sub.items.data[0]?.price?.id || "";
      const interval = sub.items.data[0]?.price?.recurring?.interval || "month";
      const planName = PRODUCT_NAME_MAP[productId] || "Unknown Plan";

      // Get coupon info
      let discount = null;
      if (sub.discount?.coupon) {
        discount = {
          coupon_name: sub.discount.coupon.name || "Discount",
          percent_off: sub.discount.coupon.percent_off,
          amount_off: sub.discount.coupon.amount_off,
        };
      }

      subscription = {
        id: sub.id,
        status: sub.status,
        product_id: productId,
        product_name: `${planName} (${interval === "year" ? "Yearly" : "Monthly"})`,
        price_id: priceId,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        discount,
        amount: sub.items.data[0]?.price?.unit_amount || 0,
        currency: sub.currency || "usd",
        interval,
      };
    }

    // Get payment history
    const charges = await stripe.charges.list({ customer: customerId, limit: 50 });
    const payments = charges.data.map((c) => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      created: new Date(c.created * 1000).toISOString(),
      description: c.description,
      receipt_email: c.receipt_email,
      receipt_url: c.receipt_url,
      refunded: c.refunded,
      amount_refunded: c.amount_refunded,
      payment_method_details: c.payment_method_details ? {
        type: c.payment_method_details.type,
        card: c.payment_method_details.card ? {
          brand: c.payment_method_details.card.brand,
          last4: c.payment_method_details.card.last4,
        } : null,
      } : null,
      discount: null,
    }));

    // Check retention eligibility
    const hasEligibleSub = (activeSubs.data || []).some((s) =>
      s.items.data.some((item) => ELIGIBLE_PRODUCT_IDS.includes(item.price?.product as string))
    );
    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
    const reasons: string[] = [];
    if (hasEligibleSub) reasons.push("active_pro_or_business");
    if (totalSpent > 5000) reasons.push("spent_over_50");
    if (payments.length > 3) reasons.push("more_than_3_purchases");

    let retentionCreditsUsed = false;
    const { data: walletData } = await supabase
      .from("wallets")
      .select("retention_credits_used")
      .eq("user_id", userData.user.id)
      .single();
    if (walletData) retentionCreditsUsed = walletData.retention_credits_used || false;

    return new Response(JSON.stringify({
      subscription,
      payments,
      eligible_for_retention: reasons.length >= 2,
      eligibility_reasons: reasons,
      retention_credits_used: retentionCreditsUsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

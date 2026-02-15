import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pro and Business product IDs (monthly + yearly)
const ELIGIBLE_PRODUCT_IDS = [
  "prod_TzArZUF2DIlzHq", // pro monthly
  "prod_TzAywFFZ0SdhfZ", // pro yearly
  "prod_TzAram9it2Kedf", // business monthly
  "prod_TzAzgoteaSHuDB", // business yearly
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Not authenticated");

    const body = await req.json().catch(() => ({}));
    const action = body.action || "info";
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        subscription: null,
        payments: [],
        eligible_for_retention: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const customerId = customers.data[0].id;

    // Action: apply retention coupon
    if (action === "apply_retention_coupon") {
      // Check eligibility first
      const eligible = await checkRetentionEligibility(stripe, customerId);
      if (!eligible.eligible) {
        return new Response(JSON.stringify({ error: "Not eligible for retention discount", reason: eligible.reason }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      // Find or create the 50% retention coupon
      let coupon: Stripe.Coupon;
      try {
        coupon = await stripe.coupons.retrieve("RETENTION_50");
      } catch {
        coupon = await stripe.coupons.create({
          id: "RETENTION_50",
          name: "Retention Offer – 50% Off",
          percent_off: 50,
          duration: "forever",
        });
      }

      // Remove existing discounts and apply new one
      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.update(sub.id, { coupon: coupon.id });
      }

      return new Response(JSON.stringify({ success: true, message: "50% discount applied to all active subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    let subscription = null;
    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      const priceItem = sub.items.data[0];
      subscription = {
        id: sub.id,
        status: sub.status,
        product_id: priceItem.price.product,
        price_id: priceItem.price.id,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        discount: sub.discount ? {
          coupon_name: sub.discount.coupon.name,
          percent_off: sub.discount.coupon.percent_off,
          amount_off: sub.discount.coupon.amount_off,
        } : null,
        amount: priceItem.price.unit_amount,
        currency: priceItem.price.currency,
        interval: priceItem.price.recurring?.interval,
      };
    }

    // Get payment history (charges)
    const charges = await stripe.charges.list({ customer: customerId, limit: 50 });
    const payments = charges.data.map(ch => ({
      id: ch.id,
      amount: ch.amount,
      currency: ch.currency,
      status: ch.status,
      created: new Date(ch.created * 1000).toISOString(),
      description: ch.description,
      receipt_email: ch.receipt_email,
      receipt_url: ch.receipt_url,
      refunded: ch.refunded,
      amount_refunded: ch.amount_refunded,
      payment_method_details: ch.payment_method_details ? {
        type: ch.payment_method_details.type,
        card: ch.payment_method_details.card ? {
          brand: ch.payment_method_details.card.brand,
          last4: ch.payment_method_details.card.last4,
        } : null,
      } : null,
      // Check if discount was applied
      invoice_id: ch.invoice,
    }));

    // For each payment with an invoice, get the discount info
    const paymentsWithDiscount = await Promise.all(payments.map(async (p) => {
      if (p.invoice_id) {
        try {
          const inv = await stripe.invoices.retrieve(p.invoice_id as string);
          return {
            ...p,
            discount: inv.discount ? {
              coupon_name: inv.discount.coupon.name,
              percent_off: inv.discount.coupon.percent_off,
              amount_off: inv.discount.coupon.amount_off,
            } : null,
            subtotal: inv.subtotal,
            total: inv.total,
          };
        } catch {
          return { ...p, discount: null };
        }
      }
      return { ...p, discount: null };
    }));

    // Check retention eligibility
    const eligibility = await checkRetentionEligibility(stripe, customerId);

    // Check if retention credits discount already used (from wallets table)
    let retentionCreditsUsed = false;
    const { data: walletData } = await supabase
      .from("wallets")
      .select("retention_credits_used")
      .eq("user_id", userData.user.id)
      .single();
    if (walletData) retentionCreditsUsed = walletData.retention_credits_used || false;

    return new Response(JSON.stringify({
      subscription,
      payments: paymentsWithDiscount,
      eligible_for_retention: eligibility.eligible,
      eligibility_reasons: eligibility.reasons,
      retention_credits_used: retentionCreditsUsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function checkRetentionEligibility(stripe: Stripe, customerId: string): Promise<{ eligible: boolean; reasons: string[]; reason?: string }> {
  const reasons: string[] = [];

  // Condition 1: Active Pro or Business subscription
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
  const hasEligibleSub = subs.data.some(s =>
    s.items.data.some(item => ELIGIBLE_PRODUCT_IDS.includes(item.price.product as string))
  );
  if (hasEligibleSub) reasons.push("active_pro_or_business");

  // Condition 2: Spent more than $50 on top-ups (check total charges)
  const charges = await stripe.charges.list({ customer: customerId, limit: 100 });
  const totalSpent = charges.data
    .filter(c => c.status === "succeeded" && !c.refunded)
    .reduce((sum, c) => sum + c.amount, 0);
  if (totalSpent > 5000) reasons.push("spent_over_50");

  // Condition 3: More than 3 purchases
  const successfulCharges = charges.data.filter(c => c.status === "succeeded").length;
  if (successfulCharges > 3) reasons.push("more_than_3_purchases");

  // Check if already has retention coupon
  const alreadyHasRetention = subs.data.some(s => s.discount?.coupon?.id === "RETENTION_50");
  if (alreadyHasRetention) {
    return { eligible: false, reasons, reason: "Retention discount already active" };
  }

  return { eligible: reasons.length > 0, reasons };
}

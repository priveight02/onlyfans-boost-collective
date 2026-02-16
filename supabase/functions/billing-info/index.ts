import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PADDLE_API = "https://sandbox-api.paddle.com";

const PRODUCT_TO_PLAN: Record<string, string> = {
  "pro_01khk8849zz71cnn6phwezgz6h": "starter",
  "pro_01khk884je9ssmmgq17m850nt6": "pro",
  "pro_01khk884s1s79fcga36rfqxexq": "business",
};

const PRODUCT_NAME_MAP: Record<string, string> = {
  "pro_01khk8849zz71cnn6phwezgz6h": "Starter",
  "pro_01khk884je9ssmmgq17m850nt6": "Pro",
  "pro_01khk884s1s79fcga36rfqxexq": "Business",
};

const ELIGIBLE_PRODUCT_IDS = [
  "pro_01khk884je9ssmmgq17m850nt6", // pro
  "pro_01khk884s1s79fcga36rfqxexq", // business
];

const paddleFetch = async (path: string, method: string, body?: any) => {
  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) throw new Error("PADDLE_API_KEY not set");
  const res = await fetch(`${PADDLE_API}${path}`, {
    method,
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Paddle API error [${res.status}]: ${JSON.stringify(data)}`);
  return data;
};

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

    const body = await req.json().catch(() => ({}));
    const action = body.action || "info";

    // Find Paddle customer
    let customerId: string | null = null;
    const customers = await paddleFetch(`/customers?search=${encodeURIComponent(userData.user.email)}`, "GET");
    if (customers.data?.length === 0) {
      return new Response(JSON.stringify({
        subscription: null,
        payments: [],
        eligible_for_retention: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    customerId = customers.data[0].id;

    // Action: apply retention discount
    if (action === "apply_retention_coupon") {
      const subs = await paddleFetch(`/subscriptions?customer_id=${customerId}&status=active`, "GET");
      if (subs.data?.length === 0) {
        return new Response(JSON.stringify({ error: "No active subscription" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      // Apply 50% discount to subscription
      for (const sub of subs.data) {
        await paddleFetch(`/subscriptions/${sub.id}`, "PATCH", {
          discount: { id: "dsc_01khk888kz0h5mk2v2cq8gw60m", effective_from: "next_billing_period" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "50% discount applied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active subscription
    const activeSubs = await paddleFetch(`/subscriptions?customer_id=${customerId}&status=active`, "GET");
    const canceledSubs = await paddleFetch(`/subscriptions?customer_id=${customerId}&status=canceled`, "GET");

    let sub = activeSubs.data?.[0] || null;
    if (!sub && canceledSubs.data?.length > 0) {
      const now = new Date();
      for (const cs of canceledSubs.data) {
        if (cs.current_billing_period?.ends_at && new Date(cs.current_billing_period.ends_at) > now) {
          sub = cs;
          break;
        }
      }
    }

    let subscription = null;
    if (sub) {
      const productId = sub.items?.[0]?.price?.product_id || "";
      const priceId = sub.items?.[0]?.price?.id || "";
      const planName = PRODUCT_NAME_MAP[productId] || "Unknown Plan";
      const billingCycle = sub.items?.[0]?.price?.billing_cycle;
      const interval = billingCycle?.interval || "month";

      subscription = {
        id: sub.id,
        status: sub.status,
        product_id: productId,
        product_name: `${planName} (${interval === "year" ? "Yearly" : "Monthly"})`,
        price_id: priceId,
        current_period_start: sub.current_billing_period?.starts_at || null,
        current_period_end: sub.current_billing_period?.ends_at || null,
        cancel_at_period_end: sub.scheduled_change?.action === "cancel",
        discount: sub.discount ? {
          coupon_name: "Discount",
          percent_off: null,
          amount_off: null,
        } : null,
        amount: parseInt(sub.items?.[0]?.price?.unit_price?.amount || "0"),
        currency: sub.items?.[0]?.price?.unit_price?.currency_code?.toLowerCase() || "usd",
        interval,
      };
    }

    // Get transaction history (payments)
    const txns = await paddleFetch(`/transactions?customer_id=${customerId}&status=completed&per_page=50`, "GET");
    const payments = (txns.data || []).map((t: any) => ({
      id: t.id,
      amount: parseInt(t.details?.totals?.total || "0"),
      currency: t.currency_code?.toLowerCase() || "usd",
      status: t.status === "completed" ? "succeeded" : t.status,
      created: t.created_at,
      description: t.items?.[0]?.price?.description || null,
      receipt_email: null,
      receipt_url: t.checkout?.url || null,
      refunded: false,
      amount_refunded: 0,
      payment_method_details: null,
      discount: null,
    }));

    // Check retention eligibility
    const hasEligibleSub = (activeSubs.data || []).some((s: any) =>
      s.items?.some((item: any) => ELIGIBLE_PRODUCT_IDS.includes(item.price?.product_id))
    );
    const totalSpent = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

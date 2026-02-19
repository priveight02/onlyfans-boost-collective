import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_MODE = Deno.env.get("POLAR_MODE") || "live";
const POLAR_API = (POLAR_MODE === "sandbox" || POLAR_MODE === "test") ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";

const polarFetch = async (path: string, options: RequestInit = {}) => {
  const token = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!token) throw new Error("POLAR_ACCESS_TOKEN not set");
  return fetch(`${POLAR_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
};

const log = (step: string, d?: any) => console.log(`[BILLING-INFO] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

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

    // Check admin plan override
    let adminPlanOverride: string | null = null;
    try {
      const { data: profileData } = await supabase.from("profiles").select("admin_notes").eq("user_id", userData.user.id).single();
      if (profileData?.admin_notes) {
        const match = profileData.admin_notes.match(/\[PLAN_OVERRIDE\]\s*(\w+)/);
        if (match) adminPlanOverride = match[1].toLowerCase();
      }
    } catch {}

    // Handle retention coupon action
    if (action === "apply_retention_coupon") {
      await supabase.from("wallets").update({ retention_credits_used: true }).eq("user_id", userData.user.id);
      return new Response(JSON.stringify({ success: true, message: "Retention discount activated for next purchase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find Polar customer
    let customerId: string | null = null;
    const custRes = await polarFetch(`/customers?external_id=${encodeURIComponent(userData.user.id)}&limit=1`);
    if (custRes.ok) {
      const custData = await custRes.json();
      customerId = custData.items?.[0]?.id || null;
    }
    if (!customerId) {
      const emailRes = await polarFetch(`/customers?email=${encodeURIComponent(userData.user.email)}&limit=1`);
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        customerId = emailData.items?.[0]?.id || null;
      }
    }

    if (!customerId) {
      return new Response(JSON.stringify({
        subscription: null, payments: [], eligible_for_retention: false,
        eligibility_reasons: [], retention_credits_used: false, admin_plan_override: adminPlanOverride,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log("Customer found", { customerId });

    // Get subscriptions
    let subscription = null;
    const subsRes = await polarFetch(`/subscriptions?customer_id=${customerId}&limit=10`);
    const subsData = subsRes.ok ? await subsRes.json() : { items: [] };

    const activeSub = (subsData.items || []).find((s: any) => s.status === "active");
    const canceledSub = !activeSub ? (subsData.items || []).find((s: any) =>
      s.status === "canceled" && s.current_period_end && new Date(s.current_period_end) > new Date()
    ) : null;
    const sub = activeSub || canceledSub;

    if (sub) {
      const productName = sub.product?.name || "Unknown Plan";
      const meta = sub.product?.metadata || {};

      const planId = meta.plan || (() => {
        const n = productName.toLowerCase();
        if (n.includes("business")) return "business";
        if (n.includes("pro")) return "pro";
        if (n.includes("starter")) return "starter";
        return null;
      })();

      const cycleInfo = meta.cycle || (() => {
        const n = productName.toLowerCase();
        if (n.includes("yearly") || n.includes("year")) return "yearly";
        return "monthly";
      })();

      const amount = sub.price?.price_amount || sub.amount || 0;

      subscription = {
        id: sub.id,
        status: sub.status,
        product_id: sub.product?.id || "",
        product_name: productName,
        plan_id: planId,
        cycle: cycleInfo,
        price_id: sub.price?.id || "",
        current_period_start: sub.current_period_start || sub.created_at,
        current_period_end: sub.current_period_end || sub.ends_at,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        discount: null,
        amount,
        currency: "usd",
        interval: cycleInfo === "yearly" ? "year" : "month",
      };
    }

    // Get orders (payment history)
    const ordersRes = await polarFetch(`/orders?customer_id=${customerId}&limit=50&sorting=-created_at`);
    const ordersData = ordersRes.ok ? await ordersRes.json() : { items: [] };

    const payments = (ordersData.items || []).map((order: any) => ({
      id: order.id,
      amount: order.amount || 0,
      currency: (order.currency || "usd").toLowerCase(),
      status: order.status === "paid" ? "succeeded" : order.status,
      created: order.created_at,
      description: order.product?.name || "Credit Purchase",
      receipt_email: order.customer?.email || null,
      receipt_url: null,
      refunded: order.refunded || false,
      amount_refunded: order.refunded_amount || 0,
      payment_method_details: null,
      discount: null,
    }));

    // Retention eligibility
    const reasons: string[] = [];
    if (subscription?.plan_id && ["pro", "business"].includes(subscription.plan_id)) {
      reasons.push("active_pro_or_business");
    }
    const totalSpent = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    if (totalSpent > 5000) reasons.push("spent_over_50");
    if (payments.length > 3) reasons.push("more_than_3_purchases");

    let retentionCreditsUsed = false;
    const { data: walletData } = await supabase.from("wallets").select("retention_credits_used").eq("user_id", userData.user.id).single();
    if (walletData) retentionCreditsUsed = walletData.retention_credits_used || false;

    return new Response(JSON.stringify({
      subscription, payments,
      eligible_for_retention: reasons.length >= 2 && !retentionCreditsUsed,
      eligibility_reasons: reasons,
      retention_credits_used: retentionCreditsUsed,
      admin_plan_override: adminPlanOverride,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

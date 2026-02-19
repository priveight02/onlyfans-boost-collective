import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_API = "https://api.polar.sh/v1";

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
      const { data: profileData } = await supabase
        .from("profiles")
        .select("admin_notes")
        .eq("user_id", userData.user.id)
        .single();
      if (profileData?.admin_notes) {
        const match = profileData.admin_notes.match(/\[PLAN_OVERRIDE\]\s*(\w+)/);
        if (match) adminPlanOverride = match[1].toLowerCase();
      }
    } catch {}

    // Find Polar customer
    const customersRes = await polarFetch(`/customers?external_id=${userData.user.id}&limit=1`);
    const customersData = customersRes.ok ? await customersRes.json() : { items: [] };

    if (!customersData.items?.length) {
      return new Response(JSON.stringify({
        subscription: null,
        payments: [],
        eligible_for_retention: false,
        eligibility_reasons: [],
        retention_credits_used: false,
        admin_plan_override: adminPlanOverride,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const customerId = customersData.items[0].id;

    // Handle retention coupon action
    if (action === "apply_retention_coupon") {
      // For Polar MoR, we handle retention discounts at checkout time via ad-hoc pricing
      // Mark retention as used
      await supabase.from("wallets").update({ retention_credits_used: true }).eq("user_id", userData.user.id);
      return new Response(JSON.stringify({ success: true, message: "Retention discount activated for next purchase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscriptions
    const subsRes = await polarFetch(`/subscriptions?customer_id=${customerId}&limit=10`);
    const subsData = subsRes.ok ? await subsRes.json() : { items: [] };

    // Find active subscription
    let subscription = null;
    const activeSub = (subsData.items || []).find((s: any) => s.status === "active");
    const canceledSub = !activeSub ? (subsData.items || []).find((s: any) =>
      s.status === "canceled" && s.current_period_end && new Date(s.current_period_end) > new Date()
    ) : null;
    const sub = activeSub || canceledSub;

    if (sub) {
      // Get product details
      let productName = sub.product?.name || "Unknown Plan";
      const productId = sub.product_id || sub.product?.id;

      subscription = {
        id: sub.id,
        status: sub.status,
        product_id: productId,
        product_name: productName,
        price_id: sub.price_id || "",
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        discount: null, // Polar handles discounts differently
        amount: sub.price?.price_amount || sub.amount || 0,
        currency: sub.price?.price_currency || "usd",
        interval: sub.recurring_interval || sub.product?.recurring_interval || "month",
      };
    }

    // Get orders (payment history)
    const ordersRes = await polarFetch(`/orders?customer_id=${customerId}&limit=50`);
    const ordersData = ordersRes.ok ? await ordersRes.json() : { items: [] };

    const payments = (ordersData.items || []).map((order: any) => ({
      id: order.id,
      amount: order.amount || order.total_amount || 0,
      currency: order.currency || "usd",
      status: "succeeded", // Polar orders are always succeeded
      created: order.created_at,
      description: order.product?.name || "Credit Purchase",
      receipt_email: null,
      receipt_url: null,
      refunded: false,
      amount_refunded: 0,
      payment_method_details: null,
      discount: null,
    }));

    // Check retention eligibility (same logic as before)
    const reasons: string[] = [];
    if (sub && sub.product?.metadata?.plan && ["pro", "business"].includes(sub.product.metadata.plan)) {
      reasons.push("active_pro_or_business");
    }
    const totalSpent = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
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
      eligible_for_retention: reasons.length >= 2 && !retentionCreditsUsed,
      eligibility_reasons: reasons,
      retention_credits_used: retentionCreditsUsed,
      admin_plan_override: adminPlanOverride,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

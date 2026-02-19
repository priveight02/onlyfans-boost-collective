import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LS_API = "https://api.lemonsqueezy.com/v1";

const lsFetch = async (path: string, options: RequestInit = {}) => {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY not set");
  return fetch(`${LS_API}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${key}`,
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
      const { data: profileData } = await supabase.from("profiles").select("admin_notes").eq("user_id", userData.user.id).single();
      if (profileData?.admin_notes) {
        const match = profileData.admin_notes.match(/\[PLAN_OVERRIDE\]\s*(\w+)/);
        if (match) adminPlanOverride = match[1].toLowerCase();
      }
    } catch {}

    // Get store ID
    const storesRes = await lsFetch("/stores");
    const storesData = await storesRes.json();
    const storeId = storesData.data?.[0]?.id;
    if (!storeId) {
      return new Response(JSON.stringify({
        subscription: null, payments: [], eligible_for_retention: false,
        eligibility_reasons: [], retention_credits_used: false, admin_plan_override: adminPlanOverride,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle retention coupon action
    if (action === "apply_retention_coupon") {
      await supabase.from("wallets").update({ retention_credits_used: true }).eq("user_id", userData.user.id);
      return new Response(JSON.stringify({ success: true, message: "Retention discount activated for next purchase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscriptions
    const subsRes = await lsFetch(`/subscriptions?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(userData.user.email)}&page[size]=10`);
    const subsData = subsRes.ok ? await subsRes.json() : { data: [] };

    let subscription = null;
    const activeSub = (subsData.data || []).find((s: any) => s.attributes.status === "active");
    const canceledSub = !activeSub ? (subsData.data || []).find((s: any) =>
      s.attributes.status === "cancelled" && s.attributes.ends_at && new Date(s.attributes.ends_at) > new Date()
    ) : null;
    const sub = activeSub || canceledSub;

    if (sub) {
      const attrs = sub.attributes;
      const productName = attrs.product_name || "Unknown Plan";

      // Detect plan from product name
      const nameLower = productName.toLowerCase();
      let planId: string | null = null;
      let cycleInfo: string | null = null;
      if (nameLower.includes("business")) planId = "business";
      else if (nameLower.includes("pro")) planId = "pro";
      else if (nameLower.includes("starter")) planId = "starter";
      if (nameLower.includes("yearly") || nameLower.includes("year")) cycleInfo = "yearly";
      else if (nameLower.includes("monthly") || nameLower.includes("month")) cycleInfo = "monthly";

      // Get variant price
      let amount = 0;
      if (attrs.variant_id) {
        try {
          const varRes = await lsFetch(`/variants/${attrs.variant_id}`);
          if (varRes.ok) {
            const varData = await varRes.json();
            amount = varData.data?.attributes?.price || 0;
          }
        } catch {}
      }

      subscription = {
        id: String(sub.id),
        status: attrs.status === "cancelled" ? "canceled" : attrs.status,
        product_id: String(attrs.product_id),
        product_name: productName,
        plan_id: planId,
        cycle: cycleInfo,
        price_id: String(attrs.variant_id || ""),
        current_period_start: attrs.created_at,
        current_period_end: attrs.renews_at || attrs.ends_at,
        cancel_at_period_end: attrs.cancelled || false,
        discount: null,
        amount,
        currency: "usd",
        interval: cycleInfo === "yearly" ? "year" : "month",
      };
    }

    // Get orders (payment history)
    const ordersRes = await lsFetch(`/orders?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(userData.user.email)}&page[size]=50&sort=-created_at`);
    const ordersData = ordersRes.ok ? await ordersRes.json() : { data: [] };

    const payments = (ordersData.data || []).map((order: any) => {
      const attrs = order.attributes;
      return {
        id: String(order.id),
        amount: attrs.total || 0,
        currency: (attrs.currency || "USD").toLowerCase(),
        status: attrs.status === "paid" ? "succeeded" : attrs.status,
        created: attrs.created_at,
        description: attrs.first_order_item?.product_name || "Credit Purchase",
        receipt_email: attrs.user_email,
        receipt_url: attrs.urls?.receipt || null,
        refunded: attrs.refunded || false,
        amount_refunded: attrs.refunded_amount || 0,
        payment_method_details: null,
        discount: null,
      };
    });

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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

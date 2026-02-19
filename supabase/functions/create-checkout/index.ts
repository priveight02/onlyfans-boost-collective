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

const log = (step: string, d?: any) => console.log(`[CREATE-CHECKOUT] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };
const PLAN_CREDITS: Record<string, number> = { starter: 215, pro: 1075, business: 4300 };

// ═══════════════════════════════════════════════════════
// LS SUBSCRIPTION VARIANT MAP (synced from Lemon Squeezy)
// ═══════════════════════════════════════════════════════

const LS_SUBSCRIPTION_VARIANTS: Record<string, Record<string, { productId: string; variantId: string; priceCents: number }>> = {
  starter: {
    monthly: { productId: "840231", variantId: "1323972", priceCents: 900 },
    yearly:  { productId: "840234", variantId: "1323977", priceCents: 10800 },
  },
  pro: {
    monthly: { productId: "840240", variantId: "1323985", priceCents: 2900 },
    yearly:  { productId: "840246", variantId: "1323992", priceCents: 34800 },
  },
  business: {
    monthly: { productId: "840249", variantId: "1323995", priceCents: 7900 },
    yearly:  { productId: "840253", variantId: "1324000", priceCents: 94800 },
  },
};

// Yearly discount coupons (auto-applied at checkout)
const YEARLY_DISCOUNT_CODES: Record<string, string> = { starter: "YEARLY15", pro: "YEARLY30", business: "YEARLY33" };

const resolveDiscountId = async (storeId: string, code: string): Promise<string | null> => {
  try {
    const res = await lsFetch(`/discounts?filter[store_id]=${storeId}&filter[code]=${code}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.id ? String(data.data[0].id) : null;
  } catch {
    return null;
  }
};

const getStoreId = async (): Promise<string> => {
  const res = await lsFetch("/stores");
  if (!res.ok) throw new Error("Failed to fetch stores");
  const data = await res.json();
  if (!data.data?.length) throw new Error("No store found");
  return String(data.data[0].id);
};

// Detect plan from product name (for existing subscriptions)
const detectPlan = (productName: string): { plan: string; cycle: string } => {
  const name = productName.toLowerCase();
  let plan = "free";
  let cycle = "monthly";
  if (name.includes("business")) plan = "business";
  else if (name.includes("pro")) plan = "pro";
  else if (name.includes("starter")) plan = "starter";
  if (name.includes("yearly") || name.includes("year")) cycle = "yearly";
  return { plan, cycle };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    log("User authenticated", { userId: user.id, email: user.email });

    const { planId, billingCycle } = await req.json();
    if (!planId) throw new Error("Plan ID required");

    if (planId === "enterprise") {
      return new Response(JSON.stringify({ error: "Please contact sales for Enterprise plans." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const origin = req.headers.get("origin") || "https://uplyze.ai";
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const storeId = await getStoreId();

    // Resolve target subscription variant from hardcoded map
    const planVariants = LS_SUBSCRIPTION_VARIANTS[planId];
    if (!planVariants) throw new Error(`Unknown plan: ${planId}`);
    const target = planVariants[cycle];
    if (!target) throw new Error(`No variant for ${planId}/${cycle}`);
    log("Target variant", { planId, cycle, productId: target.productId, variantId: target.variantId });

    // Check existing subscription
    const subsRes = await lsFetch(`/subscriptions?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(user.email)}&filter[status]=active`);
    const subsData = subsRes.ok ? await subsRes.json() : { data: [] };
    const existingSub = subsData.data?.[0] || null;

    let detectedCurrentPlanId = "free";
    if (existingSub) {
      const detected = detectPlan(existingSub.attributes.product_name || "");
      detectedCurrentPlanId = detected.plan;
      log("Existing subscription found", { subId: existingSub.id, currentPlan: detectedCurrentPlanId });
    }

    const currentTier = PLAN_TIER_ORDER[detectedCurrentPlanId] ?? 0;
    const targetTier = PLAN_TIER_ORDER[planId] ?? 0;
    const isUpgrade = targetTier > currentTier && currentTier > 0;
    const isDowngrade = targetTier < currentTier && currentTier > 0;

    // SAME PLAN
    if (existingSub && detectedCurrentPlanId === planId) {
      return new Response(JSON.stringify({ error: "You're already on this plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // UPGRADE: change variant, invoice immediately
    if (existingSub && isUpgrade) {
      log("Upgrading subscription", { subId: existingSub.id, newVariant: target.variantId });
      const updateRes = await lsFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            type: "subscriptions",
            id: String(existingSub.id),
            attributes: { variant_id: Number(target.variantId), invoice_immediately: true },
          },
        }),
      });
      if (!updateRes.ok) throw new Error(`Upgrade failed: ${await updateRes.text()}`);

      // Grant credits
      const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const credits = PLAN_CREDITS[planId] || 0;
      if (credits > 0) {
        const { data: walletData } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
        if (walletData) {
          await adminClient.from("wallets").update({ balance: walletData.balance + credits }).eq("user_id", user.id);
        }
      }

      return new Response(JSON.stringify({ upgraded: true, message: `Upgraded to ${planId}. Prorated charges applied.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOWNGRADE: change variant, no proration
    if (existingSub && isDowngrade) {
      log("Downgrading subscription", { subId: existingSub.id, newVariant: target.variantId });
      const updateRes = await lsFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            type: "subscriptions",
            id: String(existingSub.id),
            attributes: { variant_id: Number(target.variantId), disable_prorations: true },
          },
        }),
      });
      if (!updateRes.ok) throw new Error(`Downgrade failed: ${await updateRes.text()}`);
      return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Changes take effect at next renewal.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NEW SUBSCRIPTION: cancel existing if any, create checkout
    if (existingSub) {
      log("Canceling existing subscription", { subId: existingSub.id });
      await lsFetch(`/subscriptions/${existingSub.id}`, { method: "DELETE" });
    }

    const credits = PLAN_CREDITS[planId] || 0;

    // Auto-apply yearly discount coupon
    let yearlyDiscountId: string | null = null;
    if (cycle === "yearly" && YEARLY_DISCOUNT_CODES[planId]) {
      yearlyDiscountId = await resolveDiscountId(storeId, YEARLY_DISCOUNT_CODES[planId]);
      log("Yearly discount", { code: YEARLY_DISCOUNT_CODES[planId], discountId: yearlyDiscountId });
    }

    const checkoutBody: any = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            custom: {
              user_id: user.id,
              plan_id: planId,
              billing_cycle: cycle,
              credits: String(credits),
              type: "subscription",
            },
            ...(yearlyDiscountId ? { discount_code: YEARLY_DISCOUNT_CODES[planId] } : {}),
          },
          product_options: {
            redirect_url: `${origin}/profile?subscription=success&plan=${planId}`,
            receipt_button_text: "Back to Uplyze",
          },
          checkout_options: { embed: true, dark: true, media: true, logo: true, discount: false },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: target.variantId } },
        },
      },
    };

    if (yearlyDiscountId) {
      checkoutBody.data.relationships.discount = { data: { type: "discounts", id: yearlyDiscountId } };
    }

    const checkoutRes = await lsFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify(checkoutBody),
    });

    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
    const checkout = await checkoutRes.json();
    const checkoutUrl = checkout.data?.attributes?.url;
    log("Checkout created", { url: checkoutUrl });

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

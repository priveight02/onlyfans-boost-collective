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

const log = (step: string, d?: any) => console.log(`[CREATE-CHECKOUT] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };
const PLAN_CREDITS: Record<string, number> = { starter: 215, pro: 1075, business: 4300 };

// Yearly discount code mapping per plan
const YEARLY_DISCOUNT_CODES: Record<string, string> = {
  starter: "YEARLY15",
  pro: "YEARLY30",
  business: "YEARLY33",
};

// Find subscription product by metadata
const findSubscriptionProduct = async (plan: string, cycle: string): Promise<{ productId: string; priceId: string } | null> => {
  const res = await polarFetch("/products?limit=100");
  if (!res.ok) throw new Error("Failed to fetch Polar products");
  const data = await res.json();
  const products = data.items || [];

  for (const product of products) {
    const meta = product.metadata || {};
    if (meta.type === "subscription" && meta.plan === plan && meta.cycle === cycle) {
      const priceId = product.prices?.[0]?.id;
      if (priceId) return { productId: product.id, priceId };
    }
  }
  return null;
};

// Find a Polar discount by code
const findDiscountByCode = async (code: string): Promise<string | null> => {
  const res = await polarFetch(`/discounts?limit=100`);
  if (!res.ok) return null;
  const data = await res.json();
  for (const d of data.items || []) {
    if (d.code?.toUpperCase() === code.toUpperCase()) return d.id;
  }
  return null;
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

// Find Polar customer by external ID
const findCustomer = async (externalId: string): Promise<string | null> => {
  const res = await polarFetch(`/customers?external_id=${encodeURIComponent(externalId)}&limit=1`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.id || null;
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

    const { planId, billingCycle, useRetentionDiscount } = await req.json();
    if (!planId) throw new Error("Plan ID required");

    if (planId === "enterprise") {
      return new Response(JSON.stringify({ error: "Please contact sales for Enterprise plans." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const origin = req.headers.get("origin") || "https://uplyze.ai";
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";

    // Find target subscription product
    const target = await findSubscriptionProduct(planId, cycle);
    if (!target) throw new Error(`No Polar subscription product found for ${planId}/${cycle}`);
    log("Target product", { planId, cycle, productId: target.productId, priceId: target.priceId });

    // Check existing subscription via Polar
    const customerId = await findCustomer(user.id);
    let existingSub: any = null;
    let detectedCurrentPlanId = "free";

    if (customerId) {
      const subsRes = await polarFetch(`/subscriptions?customer_id=${customerId}&active=true&limit=1`);
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        existingSub = subsData.items?.[0] || null;
        if (existingSub) {
          const detected = detectPlan(existingSub.product?.name || "");
          detectedCurrentPlanId = detected.plan;
          log("Existing subscription found", { subId: existingSub.id, currentPlan: detectedCurrentPlanId });
        }
      }
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

    // UPGRADE: update subscription product price
    if (existingSub && isUpgrade) {
      log("Upgrading subscription", { subId: existingSub.id, newPrice: target.priceId });
      const updateRes = await polarFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ product_price_id: target.priceId }),
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

    // DOWNGRADE: update subscription
    if (existingSub && isDowngrade) {
      log("Downgrading subscription", { subId: existingSub.id, newPrice: target.priceId });
      const updateRes = await polarFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ product_price_id: target.priceId }),
      });
      if (!updateRes.ok) throw new Error(`Downgrade failed: ${await updateRes.text()}`);
      return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Changes take effect at next renewal.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NEW SUBSCRIPTION: cancel existing if any, create checkout
    if (existingSub) {
      log("Canceling existing subscription", { subId: existingSub.id });
      await polarFetch(`/subscriptions/${existingSub.id}`, { method: "DELETE" });
    }

    const credits = PLAN_CREDITS[planId] || 0;

    // ═══ AUTO-APPLY DISCOUNT LOGIC ═══
    let discountId: string | null = null;
    let discountCode: string | null = null;

    // Check retention discount first (SPECIAL50 - highest priority)
    if (useRetentionDiscount) {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      const { data: wallet } = await adminClient.from("wallets").select("retention_credits_used").eq("user_id", user.id).single();
      
      if (!wallet?.retention_credits_used) {
        discountId = await findDiscountByCode("SPECIAL50");
        if (discountId) {
          discountCode = "SPECIAL50";
          // Mark retention as used
          await adminClient.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
          log("Auto-applied SPECIAL50 retention discount", { discountId });
        }
      }
    }

    // If no retention discount, check yearly discounts
    if (!discountId && cycle === "yearly") {
      const yearlyCode = YEARLY_DISCOUNT_CODES[planId];
      if (yearlyCode) {
        discountId = await findDiscountByCode(yearlyCode);
        if (discountId) {
          discountCode = yearlyCode;
          log("Auto-applied yearly discount", { code: yearlyCode, discountId });
        }
      }
    }

    const checkoutBody: any = {
      products: [target.productId],
      customer_email: user.email,
      customer_external_id: user.id,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: cycle,
        credits: String(credits),
        type: "subscription",
        discount_applied: discountCode || "none",
      },
      success_url: `${origin}/profile?subscription=success&plan=${planId}`,
      allow_discount_codes: false,
      embed_origin: origin,
    };

    // Attach discount if eligible
    if (discountId) {
      checkoutBody.discount_id = discountId;
    }

    const checkoutRes = await polarFetch("/checkouts/", {
      method: "POST",
      body: JSON.stringify(checkoutBody),
    });

    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
    const checkout = await checkoutRes.json();
    const checkoutUrl = checkout.url;
    log("Checkout created", { url: checkoutUrl, discountCode, discountId });

    return new Response(JSON.stringify({ checkoutUrl, discount_applied: discountCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

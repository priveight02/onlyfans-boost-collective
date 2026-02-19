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
    let detectedCurrentCycle = "monthly";

    if (customerId) {
      const subsRes = await polarFetch(`/subscriptions?customer_id=${customerId}&active=true&limit=1`);
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        existingSub = subsData.items?.[0] || null;
        if (existingSub) {
          const detected = detectPlan(existingSub.product?.name || "");
          detectedCurrentPlanId = detected.plan;
          detectedCurrentCycle = detected.cycle;
          log("Existing subscription found", { subId: existingSub.id, currentPlan: detectedCurrentPlanId, currentCycle: detectedCurrentCycle });
        }
      }
    }

    const currentTier = PLAN_TIER_ORDER[detectedCurrentPlanId] ?? 0;
    const targetTier = PLAN_TIER_ORDER[planId] ?? 0;
    const isUpgrade = targetTier > currentTier && currentTier > 0;
    const isDowngrade = targetTier < currentTier && currentTier > 0;

    // SAME PLAN (any cycle) — prevent re-subscribing to what you already have
    if (existingSub && detectedCurrentPlanId === planId) {
      return new Response(JSON.stringify({ error: "You're already on this plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // ═══ ANTI-ABUSE: Rate-limit plan changes to max 2 per 24 hours ═══
    const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentChanges } = await adminClient
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "plan_change")
      .gte("created_at", oneDayAgo);

    const changeCount = recentChanges?.length || 0;
    if (changeCount >= 2) {
      log("ABUSE BLOCKED — too many plan changes in 24h", { count: changeCount, userId: user.id });
      // Send real-time notification
      await adminClient.from("admin_user_notifications").insert({
        user_id: user.id,
        title: "Plan Change Limit Reached",
        message: "You've reached the maximum of 2 plan changes per 24 hours. Please try again later.",
        notification_type: "warning",
      });
      return new Response(JSON.stringify({ error: "You've reached the maximum of 2 plan changes per 24 hours. Please try again later.", blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429,
      });
    }

    // UPGRADE: PATCH subscription, charge prorated difference immediately
    if (existingSub && isUpgrade) {
      log("Upgrading subscription", { subId: existingSub.id, from: detectedCurrentPlanId, to: planId });

      const updateRes = await polarFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ product_id: target.productId, proration_behavior: "invoice" }),
      });
      const updateBody = await updateRes.text();
      if (!updateRes.ok) throw new Error(`Upgrade failed: ${updateBody}`);
      log("Polar upgrade PATCH success — prorated invoice charged", { response: updateBody.substring(0, 200) });

      // Log this plan change for rate-limiting (ALWAYS, before credit check)
      const { error: planChangeErr } = await adminClient.from("wallet_transactions").insert({
        user_id: user.id,
        amount: 0,
        type: "plan_change",
        description: `Upgraded from ${detectedCurrentPlanId} to ${planId}`,
        reference_id: existingSub.id,
        metadata: { from_plan: detectedCurrentPlanId, to_plan: planId, direction: "upgrade" },
      });
      if (planChangeErr) log("ERROR inserting plan_change record", { error: planChangeErr.message });
      else log("Plan change logged for rate-limiting");

      // Grant credits ONLY if not already granted for this plan tier in last 30 days
      const credits = PLAN_CREDITS[planId] || 0;
      let creditsGranted = false;
      if (credits > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentGrant, error: grantCheckErr } = await adminClient
          .from("wallet_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "upgrade_credit")
          .gte("created_at", thirtyDaysAgo);

        // Count how many upgrade credits for THIS SPECIFIC plan
        const { data: planSpecificGrants } = await adminClient
          .from("wallet_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "upgrade_credit")
          .gte("created_at", thirtyDaysAgo)
          .eq("reference_id", planId);

        if (planSpecificGrants && planSpecificGrants.length > 0) {
          log("Credits already granted for this plan tier — skipping", { planId, existingGrants: planSpecificGrants.length });
        } else {
          const { data: walletData } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
          if (walletData) {
            await adminClient.from("wallets").update({ balance: walletData.balance + credits }).eq("user_id", user.id);
            const { error: creditErr } = await adminClient.from("wallet_transactions").insert({
              user_id: user.id,
              amount: credits,
              type: "upgrade_credit",
              description: `Upgrade credits for ${planId} plan`,
              reference_id: planId,
              metadata: { plan: planId, from_plan: detectedCurrentPlanId },
            });
            if (creditErr) log("ERROR inserting upgrade_credit record", { error: creditErr.message });
            creditsGranted = true;
            log("Upgrade credits granted", { credits, planId });
          }
        }
      }

      // Notify user
      await adminClient.from("admin_user_notifications").insert({
        user_id: user.id,
        title: `Upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
        message: creditsGranted
          ? `Your plan has been upgraded. ${credits} credits added. Prorated difference charged.`
          : `Your plan has been upgraded. Prorated difference charged. Credits were already granted for this plan.`,
        notification_type: "success",
      });

      return new Response(JSON.stringify({ upgraded: true, creditsGranted, message: `Upgraded to ${planId}. Prorated difference charged immediately.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOWNGRADE: PATCH subscription — use "prorate" (credit applied to next invoice, NO instant refund)
    if (existingSub && isDowngrade) {
      log("Downgrading subscription", { subId: existingSub.id, from: detectedCurrentPlanId, to: planId });

      const updateRes = await polarFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ product_id: target.productId, proration_behavior: "prorate" }),
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        log("Downgrade PATCH failed", { error: errText });

        // Handle already-cancelled subscription gracefully
        if (errText.includes("AlreadyCanceledSubscription") || errText.includes("already canceled")) {
          await adminClient.from("admin_user_notifications").insert({
            user_id: user.id,
            title: "Downgrade Not Possible",
            message: "Your subscription is already cancelled or ending. No changes were made.",
            notification_type: "warning",
          });
          return new Response(JSON.stringify({ error: "Your subscription is already cancelled. No changes can be made.", friendly: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }

        // Generic Polar error — still return 200 with error field so frontend handles it gracefully
        await adminClient.from("admin_user_notifications").insert({
          user_id: user.id,
          title: "Plan Change Failed",
          message: "Something went wrong while changing your plan. Please try again or contact support.",
          notification_type: "urgent",
        });
        return new Response(JSON.stringify({ error: "Plan change failed. Please try again or contact support.", friendly: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // Log plan change for rate-limiting
      const { error: downgradeLogErr } = await adminClient.from("wallet_transactions").insert({
        user_id: user.id,
        amount: 0,
        type: "plan_change",
        description: `Downgraded from ${detectedCurrentPlanId} to ${planId}`,
        reference_id: existingSub.id,
        metadata: { from_plan: detectedCurrentPlanId, to_plan: planId, direction: "downgrade" },
      });
      if (downgradeLogErr) log("ERROR inserting downgrade plan_change", { error: downgradeLogErr.message });
      else log("Downgrade plan change logged");

      await adminClient.from("admin_user_notifications").insert({
        user_id: user.id,
        title: `Downgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
        message: "Your plan has been downgraded. Credit will be applied to your next invoice.",
        notification_type: "info",
      });

      return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Credit applied to next invoice.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BLOCK if active sub exists but didn't match upgrade/downgrade (same-tier edge case)
    if (existingSub) {
      log("BLOCKED — active sub exists, no valid upgrade/downgrade path", { currentPlan: detectedCurrentPlanId, targetPlan: planId });
      return new Response(JSON.stringify({ error: "You already have an active subscription. Please upgrade or downgrade instead." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const credits = PLAN_CREDITS[planId] || 0;

    // ═══ AUTO-APPLY DISCOUNT LOGIC ═══
    let discountId: string | null = null;
    let discountCode: string | null = null;

    // Check retention discount first (SPECIAL50 - highest priority)
    if (useRetentionDiscount) {
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
    const errMsg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errMsg });

    // Try to send a notification so user always sees something in-app
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && supabaseServiceKey) {
        const errClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
        // Try to extract user from auth header
        const authH = req.headers.get("Authorization");
        if (authH) {
          const anonC = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authH } } });
          const { data: ud } = await anonC.auth.getUser();
          if (ud?.user?.id) {
            await errClient.from("admin_user_notifications").insert({
              user_id: ud.user.id,
              title: "Checkout Error",
              message: "Something went wrong during checkout. Please try again or contact support.",
              notification_type: "urgent",
            });
          }
        }
      }
    } catch (_) { /* best effort */ }

    return new Response(JSON.stringify({ error: "Something went wrong. Please try again or contact support.", friendly: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});

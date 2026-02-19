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

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };
const PLAN_CREDITS: Record<string, number> = { starter: 215, pro: 1075, business: 4300 };

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

    const { planId, billingCycle, currentPlanId } = await req.json();
    if (!planId) throw new Error("Plan ID required");
    logStep("Checkout request", { planId, billingCycle, currentPlanId });

    if (planId === "enterprise") {
      return new Response(JSON.stringify({ error: "Please contact sales for Enterprise plans." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const origin = req.headers.get("origin") || "https://uplyze.ai";
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";

    // Find the matching Polar subscription product
    const productsRes = await polarFetch("/products?limit=50");
    const productsData = await productsRes.json();
    const matchingProduct = (productsData.items || []).find(
      (p: any) => p.metadata?.type === "subscription" && p.metadata?.plan === planId && p.metadata?.cycle === cycle
    );
    if (!matchingProduct) throw new Error(`Subscription product not found for ${planId}/${cycle}. Run polar-setup first.`);
    logStep("Found Polar product", { productId: matchingProduct.id, name: matchingProduct.name });

    // Check for existing Polar subscription
    let existingSub: any = null;
    let detectedCurrentPlanId = "free";

    // Find Polar customer by external_id
    const customersRes = await polarFetch(`/customers?external_id=${user.id}&limit=1`);
    if (customersRes.ok) {
      const customersData = await customersRes.json();
      if (customersData.items?.length > 0) {
        const customerId = customersData.items[0].id;

        // Get active subscriptions for this customer
        const subsRes = await polarFetch(`/subscriptions?customer_id=${customerId}&active=true&limit=10`);
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          if (subsData.items?.length > 0) {
            existingSub = subsData.items[0];
            // Detect current plan from product metadata
            const subProductId = existingSub.product_id;
            const subProduct = (productsData.items || []).find((p: any) => p.id === subProductId);
            if (subProduct?.metadata?.plan) {
              detectedCurrentPlanId = subProduct.metadata.plan;
            }
            logStep("Existing subscription found", { subId: existingSub.id, currentPlan: detectedCurrentPlanId });
          }
        }
      }
    }

    const currentTier = PLAN_TIER_ORDER[detectedCurrentPlanId] ?? 0;
    const targetTier = PLAN_TIER_ORDER[planId] ?? 0;
    const isUpgrade = targetTier > currentTier && currentTier > 0;
    const isDowngrade = targetTier < currentTier && currentTier > 0;

    logStep("Plan change direction", { detectedCurrentPlanId, planId, isUpgrade, isDowngrade });

    // SAME PLAN: prevent re-buying
    if (existingSub && detectedCurrentPlanId === planId) {
      return new Response(JSON.stringify({ error: "You're already on this plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // UPGRADE: update subscription product
    if (existingSub && isUpgrade) {
      logStep("Upgrading subscription", { subId: existingSub.id, newProduct: matchingProduct.id });
      const updateRes = await polarFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ product_id: matchingProduct.id }),
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Upgrade failed: ${errText}`);
      }

      // Grant credits for upgrade
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const credits = PLAN_CREDITS[planId] || 0;
      if (credits > 0) {
        const { data: walletData } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
        if (walletData) {
          await adminClient.from("wallets").update({ balance: walletData.balance + credits }).eq("user_id", user.id);
        }
      }

      return new Response(JSON.stringify({ upgraded: true, message: `Upgraded to ${planId}. Prorated charges applied automatically.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOWNGRADE: update subscription product (takes effect at period end)
    if (existingSub && isDowngrade) {
      logStep("Downgrading subscription", { subId: existingSub.id, newProduct: matchingProduct.id });
      const updateRes = await polarFetch(`/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ product_id: matchingProduct.id }),
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Downgrade failed: ${errText}`);
      }
      return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Changes take effect at end of billing period.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NEW SUBSCRIPTION: create checkout
    // Cancel existing subscription if any
    if (existingSub) {
      logStep("Canceling existing subscription", { subId: existingSub.id });
      await polarFetch(`/subscriptions/${existingSub.id}`, { method: "DELETE" });
    }

    const credits = PLAN_CREDITS[planId] || 0;
    const checkoutRes = await polarFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        products: [matchingProduct.id],
        customer_email: user.email,
        external_customer_id: user.id,
        embed_origin: origin,
        success_url: `${origin}/profile?subscription=success&plan=${planId}`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: cycle,
          credits: String(credits),
          type: "subscription",
        },
      }),
    });

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      throw new Error(`Polar checkout failed: ${errText}`);
    }

    const checkout = await checkoutRes.json();
    logStep("Checkout created", { checkoutId: checkout.id });

    return new Response(JSON.stringify({ checkoutUrl: checkout.url }), {
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

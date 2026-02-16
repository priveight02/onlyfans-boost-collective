import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PADDLE_API = "https://sandbox-api.paddle.com";

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Paddle product/price mapping (sandbox)
const PADDLE_PLAN_MAP: Record<string, { monthly: { price_id: string; product_id: string }; yearly: { price_id: string; product_id: string } }> = {
  starter: {
    monthly: { price_id: "pri_01khk8854veaqz3jy2nns7c3ng", product_id: "pro_01khk8849zz71cnn6phwezgz6h" },
    yearly:  { price_id: "pri_01khk885axy7sp9jjp7t6pdk1r", product_id: "pro_01khk8849zz71cnn6phwezgz6h" },
  },
  pro: {
    monthly: { price_id: "pri_01khk885fx88k3c7nyydybh13k", product_id: "pro_01khk884je9ssmmgq17m850nt6" },
    yearly:  { price_id: "pri_01khk885y604t14yncgxjrvrxq", product_id: "pro_01khk884je9ssmmgq17m850nt6" },
  },
  business: {
    monthly: { price_id: "pri_01khk88654jq2078qds26my167", product_id: "pro_01khk884s1s79fcga36rfqxexq" },
    yearly:  { price_id: "pri_01khk886apadcebr4p5gtkswab", product_id: "pro_01khk884s1s79fcga36rfqxexq" },
  },
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "pro_01khk8849zz71cnn6phwezgz6h": "starter",
  "pro_01khk884je9ssmmgq17m850nt6": "pro",
  "pro_01khk884s1s79fcga36rfqxexq": "business",
};

const PLAN_CREDITS: Record<string, number> = {
  starter: 215,
  pro: 1075,
  business: 4300,
};

const PLAN_TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };

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

    const { planId, billingCycle } = await req.json();
    if (!planId) throw new Error("planId required");

    const planInfo = PADDLE_PLAN_MAP[planId];
    if (!planInfo) {
      // Enterprise
      return new Response(JSON.stringify({ error: "Contact sales for Enterprise plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const priceId = planInfo[cycle].price_id;
    logStep("Checkout request", { planId, cycle, priceId });

    // Check for existing Paddle customer
    let customerId: string | null = null;
    try {
      const customers = await paddleFetch(`/customers?search=${encodeURIComponent(user.email)}`, "GET");
      if (customers.data?.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Paddle customer", { customerId });

        // Check for active subscription
        const subs = await paddleFetch(`/subscriptions?customer_id=${customerId}&status=active`, "GET");
        if (subs.data?.length > 0) {
          const existingSub = subs.data[0];
          const existingProductId = existingSub.items?.[0]?.price?.product_id || "";
          const detectedCurrentPlanId = PRODUCT_TO_PLAN[existingProductId] || "free";
          const currentTier = PLAN_TIER_ORDER[detectedCurrentPlanId] ?? 0;
          const targetTier = PLAN_TIER_ORDER[planId] ?? 0;

          logStep("Existing subscription found", { subId: existingSub.id, detectedCurrentPlanId, planId });

          // Same plan
          if (detectedCurrentPlanId === planId) {
            return new Response(JSON.stringify({ error: "You're already on this plan." }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
            });
          }

          // Upgrade: update subscription with proration
          if (targetTier > currentTier) {
            logStep("Upgrading subscription", { from: detectedCurrentPlanId, to: planId });
            await paddleFetch(`/subscriptions/${existingSub.id}`, "PATCH", {
              items: [{ price_id: priceId, quantity: 1 }],
              proration_billing_mode: "prorated_immediately",
            });

            // Grant credits
            const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
            const credits = PLAN_CREDITS[planId] || 0;
            if (credits > 0) {
              const { data: wallet } = await adminClient.from("wallets").select("balance").eq("user_id", user.id).single();
              if (wallet) {
                await adminClient.from("wallets").update({ balance: wallet.balance + credits }).eq("user_id", user.id);
                logStep("Credits granted for upgrade", { credits });
              }
            }

            return new Response(JSON.stringify({ upgraded: true, message: `Upgraded to ${planId}. You only pay the prorated difference.` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Downgrade: schedule change at period end
          if (targetTier < currentTier) {
            logStep("Downgrading subscription", { from: detectedCurrentPlanId, to: planId });
            await paddleFetch(`/subscriptions/${existingSub.id}`, "PATCH", {
              items: [{ price_id: priceId, quantity: 1 }],
              proration_billing_mode: "do_not_bill",
              on_payment_failure: "apply_change",
            });

            return new Response(JSON.stringify({ downgraded: true, message: `Downgraded to ${planId}. Takes effect at the end of your current billing period.` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    } catch (e) {
      logStep("Customer lookup note", { error: e instanceof Error ? e.message : String(e) });
    }

    // No existing subscription — return price info for Paddle.js overlay checkout
    const credits = PLAN_CREDITS[planId] || 0;

    return new Response(JSON.stringify({
      checkout: true,
      priceId,
      customerId,
      customerEmail: user.email,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: cycle,
        credits: String(credits),
      },
    }), {
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

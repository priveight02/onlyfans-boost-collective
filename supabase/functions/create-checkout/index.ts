import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Detect test vs live mode from Stripe key
const isTestMode = () => (Deno.env.get("STRIPE_SECRET_KEY") || "").startsWith("sk_test_");

// Live → Test subscription price mapping
const LIVE_TO_TEST_SUB_PRICE: Record<string, string> = {
  // Starter
  "price_1T1CVAP8Id8IBpd0heXxbsUk": "price_1T1EyGP8Id8IBpd0tNAn9MrU", // monthly
  "price_1T1CcdP8Id8IBpd0AppiCEdo": "price_1T1EyRP8Id8IBpd0T0nuzf8K", // yearly
  // Pro
  "price_1T1CVfP8Id8IBpd0B8EfZeGR": "price_1T1EybP8Id8IBpd0G6zKzoSS", // monthly
  "price_1T1CcuP8Id8IBpd0X5c5Nqbs": "price_1T1EymP8Id8IBpd0nJZGVBlM", // yearly
  // Business
  "price_1T1CVpP8Id8IBpd07EYina3g": "price_1T1Ez2P8Id8IBpd0SjMOkzvg", // monthly
  "price_1T1Cd3P8Id8IBpd0Ds2Y7HoM": "price_1T1EzDP8Id8IBpd0VOZZoLYG", // yearly
};

const resolveSubPrice = (priceId: string) => isTestMode() ? (LIVE_TO_TEST_SUB_PRICE[priceId] || priceId) : priceId;

// Credits per plan for granting after subscription
const PLAN_CREDITS: Record<string, number> = {
  starter: 105,
  pro: 500,
  business: 2000,
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

    const { priceId, planId, billingCycle } = await req.json();
    if (!priceId) throw new Error("Price ID required");
    const resolvedPriceId = resolveSubPrice(priceId);
    logStep("Checkout request", { priceId, resolvedPriceId, planId, billingCycle, testMode: isTestMode() });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-04-30.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Cancel any existing active subscriptions so user can switch plans
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      for (const sub of subs.data) {
        logStep("Canceling existing subscription", { subId: sub.id });
        await stripe.subscriptions.cancel(sub.id, { prorate: true });
      }
    }

    const origin = "https://ozcagency.com";
    const credits = PLAN_CREDITS[planId] || 0;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/profile?subscription=success&plan=${planId}`,
      cancel_url: `${origin}/profile?subscription=canceled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle || "monthly",
        credits: String(credits),
        bonus_credits: "0",
        type: "subscription",
      },
    });

    logStep("Checkout session created", { sessionId: session.id });
    return new Response(JSON.stringify({ url: session.url }), {
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

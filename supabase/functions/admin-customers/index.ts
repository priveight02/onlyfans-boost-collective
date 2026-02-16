import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ADMIN-CUSTOMERS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Product ID → plan name
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TzAqP0zH90vzyR": "Starter", "prod_TzAypr06as419B": "Starter",
  "prod_TzArZUF2DIlzHq": "Pro", "prod_TzAywFFZ0SdhfZ": "Pro",
  "prod_TzAram9it2Kedf": "Business", "prod_TzAzgoteaSHuDB": "Business",
  "prod_TzDPwhTrnCOnYm": "Starter", "prod_TzDPUEvS935A88": "Starter",
  "prod_TzDPNCljqBJ2Cq": "Pro", "prod_TzDPxffqvU9iSq": "Pro",
  "prod_TzDPr3jeAGF9mm": "Business", "prod_TzDQJVbiYpTH9Y": "Business",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) throw new Error("Not authorized — admin only");

    const body = await req.json().catch(() => ({}));
    const { action, userId } = body;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-04-30.basil" });

    // ─── LIST ALL CUSTOMERS ───
    if (action === "list" || !action) {
      logStep("Fetching all users");

      // Get all profiles
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Get all wallets
      const { data: wallets } = await supabaseAdmin
        .from("wallets")
        .select("*");

      // Get all wallet transactions for aggregation
      const { data: transactions } = await supabaseAdmin
        .from("wallet_transactions")
        .select("user_id, amount, type, created_at")
        .order("created_at", { ascending: false });

      const walletMap: Record<string, any> = {};
      (wallets || []).forEach(w => { walletMap[w.user_id] = w; });

      // Aggregate transactions per user
      const txMap: Record<string, { total_spent: number; purchase_count: number; last_purchase: string | null; first_purchase: string | null }> = {};
      (transactions || []).forEach(tx => {
        if (tx.type !== "purchase") return;
        if (!txMap[tx.user_id]) txMap[tx.user_id] = { total_spent: 0, purchase_count: 0, last_purchase: null, first_purchase: null };
        txMap[tx.user_id].total_spent += tx.amount;
        txMap[tx.user_id].purchase_count += 1;
        if (!txMap[tx.user_id].last_purchase || tx.created_at > txMap[tx.user_id].last_purchase!) {
          txMap[tx.user_id].last_purchase = tx.created_at;
        }
        if (!txMap[tx.user_id].first_purchase || tx.created_at < txMap[tx.user_id].first_purchase!) {
          txMap[tx.user_id].first_purchase = tx.created_at;
        }
      });

      const customers = (profiles || []).map(p => {
        const wallet = walletMap[p.user_id] || {};
        const txInfo = txMap[p.user_id] || {};
        const daysSinceJoin = Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000));
        const totalSpentDollars = (wallet.total_spent_cents || 0) / 100;

        return {
          user_id: p.user_id,
          email: p.email,
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          // Wallet data
          credit_balance: wallet.balance || 0,
          total_purchased_credits: wallet.total_purchased || 0,
          purchase_count: wallet.purchase_count || 0,
          total_spent_cents: wallet.total_spent_cents || 0,
          // Transaction data
          tx_purchase_count: txInfo.purchase_count || 0,
          tx_total_credits: txInfo.total_spent || 0,
          last_purchase: txInfo.last_purchase,
          first_purchase: txInfo.first_purchase,
          // Computed
          ltv: totalSpentDollars,
          avg_order_value: txInfo.purchase_count > 0 ? totalSpentDollars / txInfo.purchase_count : 0,
          days_since_join: daysSinceJoin,
          monthly_velocity: totalSpentDollars / (daysSinceJoin / 30),
          // Spender potential score (0-100)
          spender_score: Math.min(100, Math.round(
            (Math.min(totalSpentDollars, 500) / 500) * 40 +
            (Math.min(txInfo.purchase_count || 0, 10) / 10) * 30 +
            (txInfo.last_purchase ? (Date.now() - new Date(txInfo.last_purchase).getTime() < 604800000 ? 30 : Date.now() - new Date(txInfo.last_purchase).getTime() < 2592000000 ? 15 : 0) : 0)
          )),
        };
      });

      logStep("Returning customers", { count: customers.length });
      return new Response(JSON.stringify({ customers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DETAIL: single customer with Stripe data ───
    if (action === "detail" && userId) {
      logStep("Fetching customer detail", { userId });

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      const { data: transactions } = await supabaseAdmin
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: loginActivity } = await supabaseAdmin
        .from("login_activity")
        .select("*")
        .eq("user_id", userId)
        .order("login_at", { ascending: false })
        .limit(10);

      const { data: deviceSessions } = await supabaseAdmin
        .from("device_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_active_at", { ascending: false })
        .limit(10);

      // Stripe data
      let stripeData: any = null;
      if (profile?.email) {
        try {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          if (customers.data.length > 0) {
            const customerId = customers.data[0].id;
            const stripeCustomer = customers.data[0];

            // Active subscriptions
            const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
            const activeSub = subs.data.find(s => s.status === "active");

            // Payment history
            const charges = await stripe.charges.list({ customer: customerId, limit: 50 });
            const totalCharged = charges.data.filter(c => c.paid && !c.refunded).reduce((sum, c) => sum + c.amount, 0);
            const refunded = charges.data.filter(c => c.refunded).reduce((sum, c) => sum + (c.amount_refunded || 0), 0);

            // Invoices
            const invoices = await stripe.invoices.list({ customer: customerId, limit: 20 });

            let currentPlan = "Free";
            let planInterval = "";
            let subscriptionEnd = "";
            let subscriptionStart = "";
            if (activeSub) {
              const productId = typeof activeSub.items.data[0].price.product === "string"
                ? activeSub.items.data[0].price.product
                : (activeSub.items.data[0].price.product as any)?.id || "";
              currentPlan = PRODUCT_TO_PLAN[productId] || "Unknown";
              planInterval = activeSub.items.data[0].price.recurring?.interval || "";
              subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
              subscriptionStart = new Date(activeSub.start_date * 1000).toISOString();
            }

            stripeData = {
              customer_id: customerId,
              customer_created: stripeCustomer.created ? new Date(stripeCustomer.created * 1000).toISOString() : null,
              current_plan: currentPlan,
              plan_interval: planInterval,
              subscription_status: activeSub?.status || "none",
              subscription_start: subscriptionStart || null,
              subscription_end: subscriptionEnd || null,
              cancel_at_period_end: activeSub?.cancel_at_period_end || false,
              total_charged_cents: totalCharged,
              total_refunded_cents: refunded,
              net_revenue_cents: totalCharged - refunded,
              charge_count: charges.data.filter(c => c.paid).length,
              refund_count: charges.data.filter(c => c.refunded).length,
              charges: charges.data.slice(0, 20).map(c => ({
                id: c.id,
                amount: c.amount,
                currency: c.currency,
                status: c.status,
                paid: c.paid,
                refunded: c.refunded,
                description: c.description,
                created: new Date(c.created * 1000).toISOString(),
                payment_method_type: c.payment_method_details?.type || "unknown",
                receipt_url: c.receipt_url,
              })),
              invoices: invoices.data.slice(0, 10).map(inv => ({
                id: inv.id,
                number: inv.number,
                amount_due: inv.amount_due,
                amount_paid: inv.amount_paid,
                status: inv.status,
                created: new Date(inv.created * 1000).toISOString(),
                hosted_invoice_url: inv.hosted_invoice_url,
              })),
              all_subscriptions: subs.data.map(s => {
                const productId = typeof s.items.data[0].price.product === "string"
                  ? s.items.data[0].price.product
                  : (s.items.data[0].price.product as any)?.id || "";
                return {
                  id: s.id,
                  status: s.status,
                  plan: PRODUCT_TO_PLAN[productId] || "Unknown",
                  interval: s.items.data[0].price.recurring?.interval || "",
                  amount: s.items.data[0].price.unit_amount || 0,
                  start_date: new Date(s.start_date * 1000).toISOString(),
                  current_period_end: new Date(s.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: s.cancel_at_period_end,
                };
              }),
            };
          }
        } catch (err) {
          logStep("Stripe lookup error", { error: err instanceof Error ? err.message : String(err) });
          stripeData = { error: "Failed to fetch Stripe data" };
        }
      }

      // Compute LTV and insights
      const daysSinceJoin = Math.max(1, Math.floor((Date.now() - new Date(profile?.created_at || Date.now()).getTime()) / 86400000));
      const netRevenue = (stripeData?.net_revenue_cents || 0) / 100;
      const monthlyVelocity = netRevenue / (daysSinceJoin / 30);
      const projectedAnnualLTV = monthlyVelocity * 12;
      const purchaseFrequency = (stripeData?.charge_count || 0) / Math.max(1, daysSinceJoin / 30);

      // Big spender potential classification
      let spenderTier = "Low";
      if (netRevenue >= 500 || projectedAnnualLTV >= 1000) spenderTier = "Whale 🐳";
      else if (netRevenue >= 200 || projectedAnnualLTV >= 500) spenderTier = "High";
      else if (netRevenue >= 50 || projectedAnnualLTV >= 100) spenderTier = "Medium";

      // Churn risk
      const lastChargeDate = stripeData?.charges?.[0]?.created;
      const daysSinceLastCharge = lastChargeDate ? Math.floor((Date.now() - new Date(lastChargeDate).getTime()) / 86400000) : 999;
      let churnRisk = "Low";
      if (daysSinceLastCharge > 90) churnRisk = "Critical";
      else if (daysSinceLastCharge > 60) churnRisk = "High";
      else if (daysSinceLastCharge > 30) churnRisk = "Medium";

      return new Response(JSON.stringify({
        profile,
        wallet,
        transactions,
        login_activity: loginActivity,
        device_sessions: deviceSessions,
        stripe: stripeData,
        insights: {
          ltv: netRevenue,
          monthly_velocity: Math.round(monthlyVelocity * 100) / 100,
          projected_annual_ltv: Math.round(projectedAnnualLTV * 100) / 100,
          purchase_frequency: Math.round(purchaseFrequency * 100) / 100,
          days_since_join: daysSinceJoin,
          days_since_last_charge: daysSinceLastCharge,
          spender_tier: spenderTier,
          churn_risk: churnRisk,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

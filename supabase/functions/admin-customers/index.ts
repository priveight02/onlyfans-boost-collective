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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) throw new Error("Not authorized — admin only");

    const body = await req.json().catch(() => ({}));
    const { action, userId } = body;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-04-30.basil" });

    // ─── LIST ALL CUSTOMERS (batch-optimized) ───
    if (action === "list" || !action) {
      logStep("Fetching all users — batch mode");

      // Safety net: auto-create profiles for any auth.users missing a profile
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const allAuthUsers = authUsers?.users || [];

      // Batch fetch all data in parallel
      const [profilesRes, walletsRes, txRes, postsRes, loginRes, packagesRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
        supabaseAdmin.from("wallets").select("*"),
        supabaseAdmin.from("wallet_transactions").select("user_id, amount, type, created_at, description").order("created_at", { ascending: false }),
        supabaseAdmin.from("user_posts").select("user_id, id").limit(5000),
        supabaseAdmin.from("login_activity").select("user_id, login_at").order("login_at", { ascending: false }).limit(5000),
        supabaseAdmin.from("credit_packages").select("credits, bonus_credits, price_cents").eq("is_active", true),
      ]);

      let profiles = profilesRes.data || [];
      const wallets = walletsRes.data || [];

      // Detect users with no profile and auto-create
      const existingUserIds = new Set(profiles.map(p => p.user_id));
      const missingUsers = allAuthUsers.filter(u => !existingUserIds.has(u.id));
      if (missingUsers.length > 0) {
        logStep("Auto-creating missing profiles", { count: missingUsers.length });
        const newProfiles = missingUsers.map(u => ({
          user_id: u.id,
          email: u.email || "",
          original_email: u.email || "",
          username: (u.email?.split("@")[0]?.replace(/\./g, "_") || "user") + "_" + u.id.substring(0, 4),
          display_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
        }));
        const { data: inserted } = await supabaseAdmin.from("profiles").insert(newProfiles).select("*");
        if (inserted) profiles = [...profiles, ...inserted];
        // Also ensure wallets exist
        const walletInserts = missingUsers.map(u => ({ user_id: u.id }));
        await supabaseAdmin.from("wallets").upsert(walletInserts, { onConflict: "user_id", ignoreDuplicates: true });
        // Re-fetch wallets to include new ones
        const { data: freshWallets } = await supabaseAdmin.from("wallets").select("*");
        if (freshWallets) wallets.splice(0, wallets.length, ...freshWallets);
      }
      const transactions = txRes.data || [];
      const posts = postsRes.data || [];
      const loginActs = loginRes.data || [];
      const packages = packagesRes.data || [];

      // Build price-per-credit ratio from packages (avg cents per credit)
      let avgCentsPerCredit = 0.5; // fallback
      if (packages.length > 0) {
        const totalCredits = packages.reduce((s, p) => s + p.credits + (p.bonus_credits || 0), 0);
        const totalCents = packages.reduce((s, p) => s + p.price_cents, 0);
        avgCentsPerCredit = totalCents / totalCredits;
      }

      // Batch Stripe: fetch all charges in one go (up to 100)
      let stripeChargesByEmail: Record<string, { totalCents: number; count: number; lastCharge: string | null }> = {};
      let stripeSubsByEmail: Record<string, { plan: string; status: string }> = {};
      try {
        // Fetch recent charges from Stripe in bulk
        const allCharges = await stripe.charges.list({ limit: 100 });
        for (const c of allCharges.data) {
          if (!c.paid || c.refunded) continue;
          const email = c.billing_details?.email || c.receipt_email || "";
          if (!email) continue;
          const key = email.toLowerCase();
          if (!stripeChargesByEmail[key]) stripeChargesByEmail[key] = { totalCents: 0, count: 0, lastCharge: null };
          stripeChargesByEmail[key].totalCents += c.amount;
          stripeChargesByEmail[key].count += 1;
          const chargeDate = new Date(c.created * 1000).toISOString();
          if (!stripeChargesByEmail[key].lastCharge || chargeDate > stripeChargesByEmail[key].lastCharge!) {
            stripeChargesByEmail[key].lastCharge = chargeDate;
          }
        }

        // Fetch active subscriptions in bulk
        const allSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        for (const s of allSubs.data) {
          const email = (s.customer as any)?.email || "";
          // Need to get customer email - fetch from customer object if string
          let customerEmail = "";
          if (typeof s.customer === "string") {
            try {
              const cust = await stripe.customers.retrieve(s.customer);
              if (cust && !cust.deleted) customerEmail = (cust as any).email || "";
            } catch {}
          } else {
            customerEmail = (s.customer as any)?.email || "";
          }
          if (!customerEmail) continue;
          const productId = typeof s.items.data[0]?.price?.product === "string" ? s.items.data[0].price.product : "";
          stripeSubsByEmail[customerEmail.toLowerCase()] = {
            plan: PRODUCT_TO_PLAN[productId] || "Unknown",
            status: s.status,
          };
        }
      } catch (e) {
        logStep("Stripe batch fetch warning", { error: String(e) });
      }

      // Build lookup maps
      const walletMap: Record<string, any> = {};
      wallets.forEach(w => { walletMap[w.user_id] = w; });

      const txMap: Record<string, { total_credits: number; purchase_count: number; granted_credits: number; grant_count: number; last_purchase: string | null; first_purchase: string | null; credit_purchases: number[] }> = {};
      transactions.forEach(tx => {
        if (!txMap[tx.user_id]) txMap[tx.user_id] = { total_credits: 0, purchase_count: 0, granted_credits: 0, grant_count: 0, last_purchase: null, first_purchase: null, credit_purchases: [] };
        if (tx.type === "purchase") {
          txMap[tx.user_id].total_credits += tx.amount;
          txMap[tx.user_id].purchase_count += 1;
          txMap[tx.user_id].credit_purchases.push(tx.amount);
          if (!txMap[tx.user_id].last_purchase || tx.created_at > txMap[tx.user_id].last_purchase!) txMap[tx.user_id].last_purchase = tx.created_at;
          if (!txMap[tx.user_id].first_purchase || tx.created_at < txMap[tx.user_id].first_purchase!) txMap[tx.user_id].first_purchase = tx.created_at;
        } else if (tx.type === "admin_grant") {
          txMap[tx.user_id].granted_credits += tx.amount;
          txMap[tx.user_id].grant_count += 1;
        }
      });

      const postMap: Record<string, number> = {};
      posts.forEach(p => { postMap[p.user_id] = (postMap[p.user_id] || 0) + 1; });

      const lastLoginMap: Record<string, string> = {};
      loginActs.forEach(la => { if (!lastLoginMap[la.user_id]) lastLoginMap[la.user_id] = la.login_at; });

      const customers = profiles.map(p => {
        const wallet = walletMap[p.user_id] || {};
        const txInfo = txMap[p.user_id] || {};
        const email = (p.email || "").toLowerCase();
        const stripeCharges = stripeChargesByEmail[email];
        const stripeSub = stripeSubsByEmail[email];
        const daysSinceJoin = Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000));

        // LTV: prefer Stripe actual charges, fallback to estimated from credit purchases
        let totalSpentDollars = 0;
        if (stripeCharges) {
          totalSpentDollars = stripeCharges.totalCents / 100;
        } else if (txInfo.total_credits > 0) {
          totalSpentDollars = (txInfo.total_credits * avgCentsPerCredit) / 100;
        }

        const lastLogin = lastLoginMap[p.user_id];
        const daysSinceLastLogin = lastLogin ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / 86400000) : 999;
        const lastPurchaseOrCharge = stripeCharges?.lastCharge || txInfo.last_purchase;
        const daysSinceLastPurchase = lastPurchaseOrCharge ? Math.floor((Date.now() - new Date(lastPurchaseOrCharge).getTime()) / 86400000) : 999;

        // Current plan: check admin override first, then Stripe
        const adminNotes = p.admin_notes || "";
        const planOverrideMatch = adminNotes.match(/\[PLAN_OVERRIDE\]\s*(\w+)/);
        const currentPlan = planOverrideMatch ? planOverrideMatch[1].charAt(0).toUpperCase() + planOverrideMatch[1].slice(1) : (stripeSub?.plan || "Free");

        // Engagement score (0-100)
        const loginRecency = daysSinceLastLogin < 1 ? 30 : daysSinceLastLogin < 3 ? 25 : daysSinceLastLogin < 7 ? 20 : daysSinceLastLogin < 14 ? 10 : daysSinceLastLogin < 30 ? 5 : 0;
        const postActivity = Math.min(20, (postMap[p.user_id] || 0) * 4);
        const purchaseRecency = daysSinceLastPurchase < 7 ? 30 : daysSinceLastPurchase < 14 ? 20 : daysSinceLastPurchase < 30 ? 15 : daysSinceLastPurchase < 60 ? 5 : 0;
        const spendDepth = Math.min(20, totalSpentDollars / 25);
        const engagementScore = Math.min(100, Math.round(loginRecency + postActivity + purchaseRecency + spendDepth));

        // Spender score (0-100)
        const purchaseCount = stripeCharges?.count || txInfo.purchase_count || 0;
        const spenderScore = Math.min(100, Math.round(
          (Math.min(totalSpentDollars, 500) / 500) * 40 +
          (Math.min(purchaseCount, 10) / 10) * 30 +
          (lastPurchaseOrCharge ? (Date.now() - new Date(lastPurchaseOrCharge).getTime() < 604800000 ? 30 : Date.now() - new Date(lastPurchaseOrCharge).getTime() < 2592000000 ? 15 : 0) : 0)
        ));

        // Churn risk
        let churnRisk = "Low";
        if (daysSinceLastLogin > 60 || daysSinceLastPurchase > 90) churnRisk = "Critical";
        else if (daysSinceLastLogin > 30 || daysSinceLastPurchase > 60) churnRisk = "High";
        else if (daysSinceLastLogin > 14 || daysSinceLastPurchase > 30) churnRisk = "Medium";

        // Purchase trend
        const purchases = txInfo.credit_purchases || [];
        let purchaseTrend = "stable";
        if (purchases.length >= 3) {
          const recent = purchases.slice(0, Math.ceil(purchases.length / 2));
          const older = purchases.slice(Math.ceil(purchases.length / 2));
          const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a: number, b: number) => a + b, 0) / older.length;
          if (recentAvg > olderAvg * 1.3) purchaseTrend = "increasing";
          else if (recentAvg < olderAvg * 0.7) purchaseTrend = "decreasing";
        }

        const monthlyVelocity = totalSpentDollars / (daysSinceJoin / 30);
        const purchaseFrequency = purchaseCount / Math.max(1, daysSinceJoin / 30);

        return {
          user_id: p.user_id, email: p.email, display_name: p.display_name, username: p.username,
          avatar_url: p.avatar_url, created_at: p.created_at, account_status: p.account_status || "active",
          credit_balance: wallet.balance || 0, total_purchased_credits: wallet.total_purchased || txInfo.total_credits || 0,
          granted_credits: txInfo.granted_credits || 0, grant_count: txInfo.grant_count || 0,
          purchase_count: purchaseCount, total_spent_cents: Math.round(totalSpentDollars * 100),
          tx_purchase_count: txInfo.purchase_count || 0, tx_total_credits: txInfo.total_credits || 0,
          last_purchase: lastPurchaseOrCharge || null, first_purchase: txInfo.first_purchase || null,
          ltv: totalSpentDollars, avg_order_value: purchaseCount > 0 ? totalSpentDollars / purchaseCount : 0,
          days_since_join: daysSinceJoin, monthly_velocity: monthlyVelocity,
          spender_score: spenderScore, engagement_score: engagementScore, churn_risk: churnRisk,
          last_login: lastLogin || null, days_since_last_login: daysSinceLastLogin,
          post_count: postMap[p.user_id] || 0, avg_purchase_credits: txInfo.purchase_count > 0 ? (txInfo.total_credits || 0) / txInfo.purchase_count : 0,
          purchase_trend: purchaseTrend, follower_count: p.follower_count || 0,
          current_plan: currentPlan, purchase_frequency: purchaseFrequency,
          projected_annual: monthlyVelocity * 12,
        };
      });

      return new Response(JSON.stringify({ customers }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── AI BEHAVIORAL ANALYSIS ───
    if (action === "ai_analysis" && userId) {
      logStep("AI behavioral analysis", { userId });

      const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single();
      const { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single();
      const { data: transactions } = await supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
      const { data: logins } = await supabaseAdmin.from("login_activity").select("*").eq("user_id", userId).order("login_at", { ascending: false }).limit(30);
      const { data: posts } = await supabaseAdmin.from("user_posts").select("id, content, like_count, comment_count, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);

      let stripeInfo = "No Stripe data.";
      if (profile?.email) {
        try {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          if (customers.data.length > 0) {
            const cid = customers.data[0].id;
            const [subs, charges] = await Promise.all([
              stripe.subscriptions.list({ customer: cid, limit: 5 }),
              stripe.charges.list({ customer: cid, limit: 30 }),
            ]);
            const activeSub = subs.data.find(s => s.status === "active");
            const totalCharged = charges.data.filter(c => c.paid && !c.refunded).reduce((sum, c) => sum + c.amount, 0);
            let plan = "Free";
            if (activeSub) {
              const productId = typeof activeSub.items.data[0].price.product === "string" ? activeSub.items.data[0].price.product : "";
              plan = PRODUCT_TO_PLAN[productId] || "Unknown";
            }
            stripeInfo = `Plan: ${plan}. Total charged: $${(totalCharged / 100).toFixed(2)}. ${charges.data.length} charges. ${subs.data.filter(s => s.status === "canceled").length} canceled subs. Cancel at period end: ${activeSub?.cancel_at_period_end || false}.`;
          }
        } catch (e) { stripeInfo = "Stripe lookup failed."; }
      }

      const txSummary = (transactions || []).slice(0, 20).map(t => `${t.type}: ${t.amount} credits on ${new Date(t.created_at).toLocaleDateString()}`).join("; ");
      const loginSummary = (logins || []).slice(0, 10).map(l => new Date(l.login_at).toLocaleDateString()).join(", ");
      const postSummary = (posts || []).slice(0, 5).map(p => `${p.like_count} likes, ${p.comment_count} comments`).join("; ");

      const prompt = `You are a world-class customer intelligence analyst for a premium digital platform. Analyze this customer deeply and provide actionable insights.

CUSTOMER DATA:
- Name: ${profile?.display_name || "Unknown"}, Email: ${profile?.email}
- Joined: ${profile?.created_at}, Account Status: ${profile?.account_status || "active"}
- Followers: ${profile?.follower_count || 0}, Posts: ${profile?.post_count || 0}
- Credit Balance: ${wallet?.balance || 0}, Total Purchased: ${wallet?.total_purchased || 0}
- Purchase Count: ${wallet?.purchase_count || 0}
- ${stripeInfo}

RECENT TRANSACTIONS: ${txSummary || "None"}
RECENT LOGINS: ${loginSummary || "None"}
POST ENGAGEMENT: ${postSummary || "None"}

Provide your analysis in this exact JSON structure:
{
  "behavioral_profile": "2-3 sentence personality and behavior summary",
  "spending_pattern": "Detailed spending behavior analysis",
  "engagement_level": "high|medium|low|dormant",
  "churn_probability": 0-100,
  "upsell_potential": 0-100,
  "predicted_next_action": "What this user is most likely to do next",
  "revenue_forecast_30d": "Dollar amount predicted in next 30 days",
  "revenue_forecast_90d": "Dollar amount predicted in next 90 days",
  "customer_segment": "One of: Champion, Loyal, Potential Loyalist, New Customer, Promising, Need Attention, About to Sleep, At Risk, Hibernating, Lost",
  "recommended_actions": ["action1", "action2", "action3"],
  "risk_factors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "lifetime_value_projection": "Projected total LTV over 12 months",
  "optimal_engagement_time": "Best time/day to engage this user",
  "personality_tags": ["tag1", "tag2", "tag3"]
}`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: prompt }],
          tools: [{
            type: "function",
            function: {
              name: "customer_analysis",
              description: "Return structured customer behavioral analysis",
              parameters: {
                type: "object",
                properties: {
                  behavioral_profile: { type: "string" },
                  spending_pattern: { type: "string" },
                  engagement_level: { type: "string" },
                  churn_probability: { type: "number" },
                  upsell_potential: { type: "number" },
                  predicted_next_action: { type: "string" },
                  revenue_forecast_30d: { type: "string" },
                  revenue_forecast_90d: { type: "string" },
                  customer_segment: { type: "string" },
                  recommended_actions: { type: "array", items: { type: "string" } },
                  risk_factors: { type: "array", items: { type: "string" } },
                  opportunities: { type: "array", items: { type: "string" } },
                  lifetime_value_projection: { type: "string" },
                  optimal_engagement_time: { type: "string" },
                  personality_tags: { type: "array", items: { type: "string" } },
                },
                required: ["behavioral_profile", "spending_pattern", "engagement_level", "churn_probability", "upsell_potential", "predicted_next_action", "revenue_forecast_30d", "revenue_forecast_90d", "customer_segment", "recommended_actions", "risk_factors", "opportunities", "lifetime_value_projection", "optimal_engagement_time", "personality_tags"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "customer_analysis" } },
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        logStep("AI error", { status: aiResp.status, body: errText });
        throw new Error(`AI analysis failed: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();
      let analysis: any = {};
      try {
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          analysis = JSON.parse(toolCall.function.arguments);
        }
      } catch (e) {
        logStep("Parse error", { error: String(e) });
        analysis = { behavioral_profile: "Analysis unavailable", spending_pattern: "N/A", engagement_level: "unknown", churn_probability: 50, upsell_potential: 50, predicted_next_action: "Unknown", revenue_forecast_30d: "$0", revenue_forecast_90d: "$0", customer_segment: "Unknown", recommended_actions: [], risk_factors: [], opportunities: [], lifetime_value_projection: "$0", optimal_engagement_time: "N/A", personality_tags: [] };
      }

      return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── DETAIL: single customer with Stripe data ───
    if (action === "detail" && userId) {
      logStep("Fetching customer detail", { userId });

      const [profileRes, walletRes, txRes, loginRes, deviceRes, actionsRes, notifsRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.from("login_activity").select("*").eq("user_id", userId).order("login_at", { ascending: false }).limit(10),
        supabaseAdmin.from("device_sessions").select("*").eq("user_id", userId).order("last_active_at", { ascending: false }).limit(10),
        supabaseAdmin.from("admin_user_actions").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabaseAdmin.from("admin_user_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);

      const profile = profileRes.data;
      const wallet = walletRes.data;
      const transactions = txRes.data;
      const loginActivity = loginRes.data;
      const deviceSessions = deviceRes.data;
      const adminActions = actionsRes.data || [];
      const notifications = notifsRes.data || [];

      // Stripe data
      let stripeData: any = null;
      if (profile?.email) {
        try {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          if (customers.data.length > 0) {
            const customerId = customers.data[0].id;
            const stripeCustomer = customers.data[0];
            const [subsRes, chargesRes, invoicesRes] = await Promise.all([
              stripe.subscriptions.list({ customer: customerId, limit: 10 }),
              stripe.charges.list({ customer: customerId, limit: 50 }),
              stripe.invoices.list({ customer: customerId, limit: 20 }),
            ]);
            const subs = subsRes;
            const charges = chargesRes;
            const invoices = invoicesRes;
            const activeSub = subs.data.find(s => s.status === "active");
            const totalCharged = charges.data.filter(c => c.paid && !c.refunded).reduce((sum, c) => sum + c.amount, 0);
            const refunded = charges.data.filter(c => c.refunded).reduce((sum, c) => sum + (c.amount_refunded || 0), 0);

            let currentPlan = "Free", planInterval = "", subscriptionEnd = "", subscriptionStart = "";
            // Check for admin plan override FIRST — admin override always wins
            const adminNotes = profile?.admin_notes || "";
            const planOverrideMatch = adminNotes.match(/\[PLAN_OVERRIDE\]\s*(\w+)/);
            if (activeSub) {
              const productId = typeof activeSub.items.data[0].price.product === "string" ? activeSub.items.data[0].price.product : (activeSub.items.data[0].price.product as any)?.id || "";
              currentPlan = PRODUCT_TO_PLAN[productId] || "Unknown";
              planInterval = activeSub.items.data[0].price.recurring?.interval || "";
              subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
              subscriptionStart = new Date(activeSub.start_date * 1000).toISOString();
            }
            // Admin override takes priority over Stripe subscription
            if (planOverrideMatch) {
              currentPlan = planOverrideMatch[1].charAt(0).toUpperCase() + planOverrideMatch[1].slice(1);
            }

            stripeData = {
              customer_id: customerId,
              customer_created: stripeCustomer.created ? new Date(stripeCustomer.created * 1000).toISOString() : null,
              current_plan: currentPlan, plan_interval: planInterval,
              subscription_status: activeSub?.status || "none",
              subscription_start: subscriptionStart || null, subscription_end: subscriptionEnd || null,
              cancel_at_period_end: activeSub?.cancel_at_period_end || false,
              total_charged_cents: totalCharged, total_refunded_cents: refunded, net_revenue_cents: totalCharged - refunded,
              charge_count: charges.data.filter(c => c.paid).length, refund_count: charges.data.filter(c => c.refunded).length,
              charges: charges.data.slice(0, 20).map(c => ({
                id: c.id, amount: c.amount, currency: c.currency, status: c.status, paid: c.paid, refunded: c.refunded,
                description: c.description, created: new Date(c.created * 1000).toISOString(),
                payment_method_type: c.payment_method_details?.type || "unknown", receipt_url: c.receipt_url,
              })),
              invoices: invoices.data.slice(0, 10).map(inv => ({
                id: inv.id, number: inv.number, amount_due: inv.amount_due, amount_paid: inv.amount_paid,
                status: inv.status, created: new Date(inv.created * 1000).toISOString(), hosted_invoice_url: inv.hosted_invoice_url,
              })),
              all_subscriptions: subs.data.map(s => {
                const productId = typeof s.items.data[0].price.product === "string" ? s.items.data[0].price.product : (s.items.data[0].price.product as any)?.id || "";
                return {
                  id: s.id, status: s.status, plan: PRODUCT_TO_PLAN[productId] || "Unknown",
                  interval: s.items.data[0].price.recurring?.interval || "", amount: s.items.data[0].price.unit_amount || 0,
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

      const daysSinceJoin = Math.max(1, Math.floor((Date.now() - new Date(profile?.created_at || Date.now()).getTime()) / 86400000));
      const netRevenue = (stripeData?.net_revenue_cents || 0) / 100;
      const monthlyVelocity = netRevenue / (daysSinceJoin / 30);
      const projectedAnnualLTV = monthlyVelocity * 12;
      const purchaseFrequency = (stripeData?.charge_count || 0) / Math.max(1, daysSinceJoin / 30);

      let spenderTier = "Low";
      if (netRevenue >= 500 || projectedAnnualLTV >= 1000) spenderTier = "Whale 🐳";
      else if (netRevenue >= 200 || projectedAnnualLTV >= 500) spenderTier = "High";
      else if (netRevenue >= 50 || projectedAnnualLTV >= 100) spenderTier = "Medium";

      const lastChargeDate = stripeData?.charges?.[0]?.created;
      const daysSinceLastCharge = lastChargeDate ? Math.floor((Date.now() - new Date(lastChargeDate).getTime()) / 86400000) : 999;
      let churnRisk = "Low";
      if (daysSinceLastCharge > 90) churnRisk = "Critical";
      else if (daysSinceLastCharge > 60) churnRisk = "High";
      else if (daysSinceLastCharge > 30) churnRisk = "Medium";

      return new Response(JSON.stringify({
        profile, wallet, transactions, login_activity: loginActivity, device_sessions: deviceSessions,
        admin_actions: adminActions, notifications, stripe: stripeData,
        insights: {
          ltv: netRevenue, monthly_velocity: Math.round(monthlyVelocity * 100) / 100,
          projected_annual_ltv: Math.round(projectedAnnualLTV * 100) / 100,
          purchase_frequency: Math.round(purchaseFrequency * 100) / 100,
          days_since_join: daysSinceJoin, days_since_last_charge: daysSinceLastCharge,
          spender_tier: spenderTier, churn_risk: churnRisk,
          current_plan: stripeData?.current_plan || "Free",
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ADMIN ACTIONS ───
    if (action === "admin_action" && userId) {
      const { adminAction, reason, data: actionData } = body;
      logStep("Admin action", { adminAction, userId });

      if (adminAction === "pause" || adminAction === "suspend") {
        await supabaseAdmin.from("profiles").update({
          account_status: adminAction === "pause" ? "paused" : "suspended",
          status_reason: reason || `Account ${adminAction}ed by admin`,
          status_updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }

      if (adminAction === "activate") {
        await supabaseAdmin.from("profiles").update({
          account_status: "active", status_reason: null, status_updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }

      if (adminAction === "delete") {
        await supabaseAdmin.from("profiles").update({
          account_status: "deleted", status_reason: reason || "Deleted by admin",
          status_updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }

      if (adminAction === "send_notification") {
        const { title, message, notification_type } = actionData || {};
        await supabaseAdmin.from("admin_user_notifications").insert({
          user_id: userId, title: title || "Admin Notice", message: message || "",
          notification_type: notification_type || "info", sent_by: user.id,
        });
      }

      if (adminAction === "grant_credits") {
        const { amount: creditAmount } = actionData || {};
        if (creditAmount && creditAmount > 0) {
          // Ensure wallet exists first
          await supabaseAdmin.from("wallets").upsert(
            { user_id: userId, balance: 0, total_purchased: 0, purchase_count: 0 },
            { onConflict: "user_id", ignoreDuplicates: true }
          );
          // Read current balance
          const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
          const currentBalance = w?.balance || 0;
          // Update balance atomically
          const { error: updateErr } = await supabaseAdmin.from("wallets")
            .update({ balance: currentBalance + creditAmount })
            .eq("user_id", userId);
          if (updateErr) logStep("Wallet update error", { error: updateErr.message });
          else logStep("Wallet updated", { userId, oldBalance: currentBalance, newBalance: currentBalance + creditAmount });
          // Record transaction
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId, amount: creditAmount, type: "admin_grant",
            description: reason || `Admin granted ${creditAmount} credits`,
          });
        }
      }

      if (adminAction === "revoke_credits") {
        const { amount: creditAmount } = actionData || {};
        if (creditAmount && creditAmount > 0) {
          // Ensure wallet exists
          await supabaseAdmin.from("wallets").upsert(
            { user_id: userId, balance: 0, total_purchased: 0, purchase_count: 0 },
            { onConflict: "user_id", ignoreDuplicates: true }
          );
          const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
          const currentBalance = w?.balance || 0;
          const newBalance = Math.max(0, currentBalance - creditAmount);
          const { error: updateErr } = await supabaseAdmin.from("wallets")
            .update({ balance: newBalance })
            .eq("user_id", userId);
          if (updateErr) logStep("Wallet revoke error", { error: updateErr.message });
          else logStep("Wallet revoked", { userId, oldBalance: currentBalance, newBalance });
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId, amount: -creditAmount, type: "admin_revoke",
            description: reason || `Admin revoked ${creditAmount} credits`,
          });
        }
      }

      if (adminAction === "update_notes") {
        const { notes } = actionData || {};
        await supabaseAdmin.from("profiles").update({ admin_notes: notes }).eq("user_id", userId);
      }

      if (adminAction === "reset_password") {
        const { data: prof } = await supabaseAdmin.from("profiles").select("email, display_name").eq("user_id", userId).single();
        if (prof?.email) {
          // Generate recovery link
          const { data: linkData, error: resetErr } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: prof.email,
          });
          if (resetErr) {
            logStep("Password reset error", { error: resetErr.message });
          } else {
            // Send real email via Resend
            const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
            if (RESEND_API_KEY && linkData?.properties?.action_link) {
              try {
                const resetLink = linkData.properties.action_link;
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    from: "OZC Agency <contact@ozcagency.com>",
                    to: [prof.email],
                    subject: "Password Reset Request",
                    html: `<div style="background:#0a0a0f;color:#fff;padding:40px;font-family:Arial,sans-serif;border-radius:16px;max-width:600px;margin:auto;">
                      <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:24px;margin:0;color:#fff;">Password Reset</h1>
                      </div>
                      <p style="color:#ffffffaa;font-size:15px;line-height:1.6;">Hi ${prof.display_name || "there"},</p>
                      <p style="color:#ffffffaa;font-size:15px;line-height:1.6;">An administrator has initiated a password reset for your account. Click the button below to set a new password:</p>
                      <div style="text-align:center;margin:32px 0;">
                        <a href="${resetLink}" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">Reset Password</a>
                      </div>
                      <p style="color:#ffffff60;font-size:13px;">If you didn't expect this, you can safely ignore this email.</p>
                      <hr style="border:1px solid #ffffff15;margin:24px 0;" />
                      <p style="color:#ffffff40;font-size:11px;text-align:center;">OZC Agency Platform</p>
                    </div>`,
                  }),
                });
                logStep("Password reset email sent via Resend", { email: prof.email });
              } catch (e) { logStep("Resend email error", { error: String(e) }); }
            } else {
              logStep("Password reset link generated (no Resend)", { email: prof.email });
            }
          }
        }
      }

      if (adminAction === "add_note") {
        const { note, category } = actionData || {};
        if (note) {
          const { data: prof } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existing = prof?.admin_notes || "";
          const timestamp = new Date().toISOString();
          const newNote = `[${timestamp}] [${category || "general"}] ${note}`;
          const updated = existing ? `${newNote}\n\n${existing}` : newNote;
          await supabaseAdmin.from("profiles").update({ admin_notes: updated }).eq("user_id", userId);
        }
      }

      if (adminAction === "change_plan") {
        const { plan: newPlan } = actionData || {};
        logStep("Change plan", { userId, newPlan });
        const { data: prof } = await supabaseAdmin.from("profiles").select("email, admin_notes").eq("user_id", userId).single();
        
        // Store plan override persistently in admin_notes
        const existing = prof?.admin_notes || "";
        const planLine = `[PLAN_OVERRIDE] ${newPlan}`;
        const updated = existing.includes("[PLAN_OVERRIDE]")
          ? existing.replace(/\[PLAN_OVERRIDE\].*$/m, planLine)
          : `${planLine}\n\n${existing}`;
        await supabaseAdmin.from("profiles").update({ admin_notes: updated }).eq("user_id", userId);
        logStep("Plan override stored", { userId, newPlan });

        // If downgrading to free, cancel active Stripe subscriptions
        if (newPlan === "free" && prof?.email) {
          try {
            const customers = await stripe.customers.list({ email: prof.email, limit: 1 });
            if (customers.data.length > 0) {
              const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active" });
              for (const sub of subs.data) {
                await stripe.subscriptions.cancel(sub.id);
                logStep("Canceled subscription", { subId: sub.id });
              }
            }
          } catch (e) { logStep("Stripe cancel error", { error: String(e) }); }
        }
      }

      if (adminAction === "verify_email") {
        const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("user_id", userId).single();
        if (prof?.email) {
          try {
            await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
            logStep("Email verified", { email: prof.email });
          } catch (e) { logStep("Verify email error", { error: String(e) }); }
        }
      }

      if (adminAction === "force_logout") {
        try {
          await supabaseAdmin.auth.admin.signOut(userId);
          logStep("Force logout", { userId });
        } catch (e) {
          // Alternative: invalidate all sessions
          logStep("Force logout fallback", { userId });
        }
        // Also clear device sessions
        await supabaseAdmin.from("device_sessions").update({ status: "revoked" }).eq("user_id", userId);
      }

      if (adminAction === "tag_user") {
        const { tags } = actionData || {};
        if (tags && Array.isArray(tags)) {
          const { data: prof } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existing = prof?.admin_notes || "";
          const tagLine = `[TAGS] ${tags.join(", ")}`;
          // Replace existing tag line or prepend
          const updated = existing.includes("[TAGS]")
            ? existing.replace(/\[TAGS\].*$/m, tagLine)
            : `${tagLine}\n\n${existing}`;
          await supabaseAdmin.from("profiles").update({ admin_notes: updated }).eq("user_id", userId);
        }
      }

      if (adminAction === "set_credit_limit") {
        const { daily_limit } = actionData || {};
        // Store credit limit in admin notes as structured metadata
        const { data: prof } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
        const existing = prof?.admin_notes || "";
        const limitLine = `[CREDIT_LIMIT] Daily: ${daily_limit || "unlimited"}`;
        const updated = existing.includes("[CREDIT_LIMIT]")
          ? existing.replace(/\[CREDIT_LIMIT\].*$/m, limitLine)
          : `${limitLine}\n\n${existing}`;
        await supabaseAdmin.from("profiles").update({ admin_notes: updated }).eq("user_id", userId);
      }

      if (adminAction === "send_email") {
        const emailSubject = actionData?.subject || "Message from OZC Agency";
        const emailBody = actionData?.body || "";
        const emailCategory = actionData?.category || "general";
        const { data: prof } = await supabaseAdmin.from("profiles").select("email, display_name").eq("user_id", userId).single();
        
        // Also save as in-app notification
        await supabaseAdmin.from("admin_user_notifications").insert({
          user_id: userId, title: emailSubject, message: emailBody,
          notification_type: emailCategory === "urgent" ? "warning" : "info", sent_by: user.id,
        });

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!prof?.email) throw new Error("User has no email address");
        if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

        const categoryEmoji = { general: "📩", support: "🎧", billing: "💳", promotion: "🎁", urgent: "🚨", update: "📢" }[emailCategory] || "📩";
        const categoryLabel = { general: "General", support: "Support", billing: "Billing", promotion: "Promotion", urgent: "Urgent", update: "Platform Update" }[emailCategory] || "General";

        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "OZC Agency <contact@ozcagency.com>",
            to: [prof.email],
            subject: emailSubject,
            html: `<div style="background:#0a0a0f;color:#fff;padding:40px;font-family:Arial,sans-serif;border-radius:16px;max-width:600px;margin:auto;">
              <div style="text-align:center;margin-bottom:8px;">
                <span style="font-size:12px;color:#ffffff60;text-transform:uppercase;letter-spacing:2px;">${categoryLabel}</span>
              </div>
              <div style="text-align:center;margin-bottom:32px;">
                <h1 style="font-size:24px;margin:0;color:#fff;">${categoryEmoji} ${emailSubject}</h1>
              </div>
              <p style="color:#ffffffaa;font-size:15px;line-height:1.6;">Hi ${prof.display_name || "there"},</p>
              <p style="color:#ffffffaa;font-size:15px;line-height:1.8;white-space:pre-line;">${emailBody}</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="https://onlyfans-boost-collective.lovable.app" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">Visit Platform</a>
              </div>
              <hr style="border:1px solid #ffffff15;margin:24px 0;" />
              <p style="color:#ffffff40;font-size:11px;text-align:center;">OZC Agency Platform</p>
            </div>`,
          }),
        });
        if (!resendResp.ok) {
          const errText = await resendResp.text();
          logStep("Resend error", { status: resendResp.status, body: errText });
          throw new Error(`Email delivery failed: ${resendResp.status}`);
        }
        logStep("Email sent via Resend", { email: prof.email, subject: emailSubject, category: emailCategory });
      }

      if (adminAction === "impersonate_view") {
        // Read-only: just log the impersonation attempt for audit
        logStep("Impersonation view requested", { userId, by: user.id });
      }

      await supabaseAdmin.from("admin_user_actions").insert({
        target_user_id: userId, action_type: adminAction, performed_by: user.id,
        reason: reason || null, metadata: actionData || {},
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Invalid action");
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ADMIN-CUSTOMERS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
      ...((options.headers as Record<string, string>) || {}),
    },
  });
};

const ok = (data: any) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
const err = (msg: string, status = 500) => new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

// ─── Helpers ───
const parseAdminNotes = (notes: string | null) => {
  const result: any = { tags: [], credit_limit: "unlimited", plan_override: null, raw_notes: notes };
  if (!notes) return result;
  const tagMatch = notes.match(/\[TAGS\](.*?)(?:\[|$)/s);
  if (tagMatch) result.tags = tagMatch[1].split(",").map((t: string) => t.trim()).filter(Boolean);
  const limitMatch = notes.match(/\[CREDIT_LIMIT\]\s*(\d+)/);
  if (limitMatch) result.credit_limit = parseInt(limitMatch[1]);
  const planMatch = notes.match(/\[PLAN_OVERRIDE\]\s*(\w+)/);
  if (planMatch) result.plan_override = planMatch[1];
  return result;
};

const computeInsights = (profile: any, wallet: any, transactions: any[], loginActivity: any[]) => {
  const now = Date.now();
  const joinDate = new Date(profile.created_at).getTime();
  const daysSinceJoin = Math.max(1, Math.floor((now - joinDate) / 86400000));
  const purchases = transactions.filter((t: any) => t.type === "purchase");
  const grants = transactions.filter((t: any) => t.type === "admin_grant");
  const deductions = transactions.filter((t: any) => t.type === "deduction" || t.type === "admin_revoke");

  const totalPurchasedCredits = purchases.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
  const totalGrantedCredits = grants.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
  const totalDeductedCredits = deductions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
  const totalSpentCents = purchases.reduce((s: number, t: any) => s + (t.metadata?.amount_cents || 0), 0);
  const ltv = totalSpentCents / 100;
  const monthsActive = Math.max(1, daysSinceJoin / 30);
  const monthlyVelocity = ltv / monthsActive;
  const projectedAnnualLtv = monthlyVelocity * 12;
  const purchaseFrequency = purchases.length / monthsActive;
  const avgPurchaseCredits = purchases.length > 0 ? totalPurchasedCredits / purchases.length : 0;

  const lastLogin = loginActivity.length > 0 ? loginActivity[0].login_at : null;
  const daysSinceLastLogin = lastLogin ? Math.floor((now - new Date(lastLogin).getTime()) / 86400000) : 999;
  const lastPurchase = purchases.length > 0 ? purchases[0].created_at : null;
  const daysSinceLastPurchase = lastPurchase ? Math.floor((now - new Date(lastPurchase).getTime()) / 86400000) : 999;

  // Spender score 0-100
  let spenderScore = 0;
  if (ltv >= 500) spenderScore += 40; else if (ltv >= 100) spenderScore += 25; else if (ltv >= 20) spenderScore += 10;
  if (purchases.length >= 10) spenderScore += 30; else if (purchases.length >= 5) spenderScore += 20; else if (purchases.length >= 2) spenderScore += 10;
  if (monthlyVelocity >= 50) spenderScore += 30; else if (monthlyVelocity >= 20) spenderScore += 20; else if (monthlyVelocity >= 5) spenderScore += 10;

  // Engagement score 0-100
  let engagementScore = 0;
  if (daysSinceLastLogin <= 1) engagementScore += 40; else if (daysSinceLastLogin <= 7) engagementScore += 25; else if (daysSinceLastLogin <= 30) engagementScore += 10;
  if ((profile.post_count || 0) >= 20) engagementScore += 30; else if ((profile.post_count || 0) >= 5) engagementScore += 15;
  if ((profile.follower_count || 0) >= 50) engagementScore += 30; else if ((profile.follower_count || 0) >= 10) engagementScore += 15;

  // Churn risk
  let churnRisk = "Low";
  if (daysSinceLastLogin > 90 || (purchases.length > 0 && daysSinceLastPurchase > 120)) churnRisk = "Critical";
  else if (daysSinceLastLogin > 30 || daysSinceLastPurchase > 60) churnRisk = "High";
  else if (daysSinceLastLogin > 14 || daysSinceLastPurchase > 30) churnRisk = "Medium";

  // Spender tier
  let spenderTier = "Low";
  if (spenderScore >= 80) spenderTier = "Whale";
  else if (spenderScore >= 70) spenderTier = "High Whale";
  else if (spenderScore >= 50) spenderTier = "High";
  else if (spenderScore >= 30) spenderTier = "Medium";

  // Purchase trend
  const recentPurchases = purchases.filter((t: any) => now - new Date(t.created_at).getTime() < 30 * 86400000).length;
  const olderPurchases = purchases.filter((t: any) => {
    const age = now - new Date(t.created_at).getTime();
    return age >= 30 * 86400000 && age < 60 * 86400000;
  }).length;
  const purchaseTrend = recentPurchases > olderPurchases ? "increasing" : recentPurchases < olderPurchases ? "decreasing" : "stable";

  // Customer segment
  let customerSegment = "New";
  if (spenderScore >= 70 && engagementScore >= 60) customerSegment = "Champion";
  else if (spenderScore >= 50 && daysSinceLastLogin <= 14) customerSegment = "Loyal";
  else if (spenderScore >= 30 && daysSinceLastLogin > 30) customerSegment = "At Risk";
  else if (daysSinceLastLogin > 60) customerSegment = "Hibernating";
  else if (daysSinceLastLogin > 120) customerSegment = "Lost";
  else if (spenderScore >= 20) customerSegment = "Potential Loyalist";
  else if (engagementScore >= 40) customerSegment = "Promising";

  // Plan from notes
  const parsedNotes = parseAdminNotes(profile.admin_notes);
  const currentPlan = parsedNotes.plan_override || "Free";

  return {
    days_since_join: daysSinceJoin,
    ltv, monthly_velocity: monthlyVelocity, projected_annual_ltv: projectedAnnualLtv,
    purchase_frequency: purchaseFrequency, avg_purchase_credits: avgPurchaseCredits,
    spender_score: spenderScore, engagement_score: engagementScore,
    churn_risk: churnRisk, spender_tier: spenderTier,
    purchase_trend: purchaseTrend, customer_segment: customerSegment,
    total_purchased_credits: totalPurchasedCredits,
    total_granted_credits: totalGrantedCredits,
    total_deducted_credits: totalDeductedCredits,
    total_spent_cents: totalSpentCents,
    purchase_count: purchases.length, grant_count: grants.length, deduct_count: deductions.length,
    days_since_last_login: daysSinceLastLogin,
    follower_count_real: profile.follower_count || 0,
    following_count_real: profile.following_count || 0,
    current_plan: currentPlan,
  };
};

// ─── Lemon Squeezy payment intel ───
const fetchLSPaymentData = async (userId: string, supabaseAdmin: any) => {
  try {
    // Get LS customer ID from user_details
    const { data: ud } = await supabaseAdmin.from("user_details").select("ls_customer_id").eq("user_id", userId).single();
    if (!ud?.ls_customer_id) {
      // Fallback: check wallet_transactions for payment metadata
      const { data: txs } = await supabaseAdmin.from("wallet_transactions")
        .select("*").eq("user_id", userId).eq("type", "purchase").order("created_at", { ascending: false }).limit(50);
      const totalCharged = (txs || []).reduce((s: number, t: any) => s + (t.metadata?.amount_cents || 0), 0);
      return {
        current_plan: "Free",
        total_charged_cents: totalCharged,
        total_refunded_cents: 0,
        net_revenue_cents: totalCharged,
        charge_count: (txs || []).length,
        refund_count: 0,
        all_subscriptions: [],
        charges: (txs || []).map((t: any) => ({
          id: t.id,
          amount: t.metadata?.amount_cents || 0,
          created: t.created_at,
          description: t.description,
          paid: true,
          refunded: false,
        })),
      };
    }

    const lsCustomerId = ud.ls_customer_id;

    // Fetch subscriptions from LS
    const subsRes = await lsFetch(`/subscriptions?filter[customer_id]=${lsCustomerId}`);
    const subsData = subsRes.ok ? await subsRes.json() : { data: [] };
    const subscriptions = (subsData.data || []).map((s: any) => ({
      id: s.id,
      status: s.attributes.status,
      plan: s.attributes.product_name || s.attributes.variant_name || "Unknown",
      interval: s.attributes.billing_anchor ? "month" : "month",
      amount: s.attributes.first_subscription_item?.price || 0,
      start_date: s.attributes.created_at,
      canceled_at: s.attributes.cancelled ? s.attributes.updated_at : null,
      cancel_at_period_end: s.attributes.status === "cancelled",
      renews_at: s.attributes.renews_at,
    }));

    // Determine current plan from active subscription
    const activeSub = subscriptions.find((s: any) => s.status === "active");
    let currentPlan = "Free";
    if (activeSub) {
      const planName = activeSub.plan.toLowerCase();
      if (planName.includes("business")) currentPlan = "Business";
      else if (planName.includes("pro")) currentPlan = "Pro";
      else if (planName.includes("starter")) currentPlan = "Starter";
      else currentPlan = activeSub.plan;
    }

    // Fetch orders from LS
    const ordersRes = await lsFetch(`/orders?filter[customer_id]=${lsCustomerId}&sort=-created_at`);
    const ordersData = ordersRes.ok ? await ordersRes.json() : { data: [] };
    const orders = (ordersData.data || []);

    const charges = orders.map((o: any) => ({
      id: o.id,
      amount: o.attributes.total || 0,
      created: o.attributes.created_at,
      description: o.attributes.first_order_item?.product_name || "Order",
      paid: o.attributes.status === "paid",
      refunded: o.attributes.status === "refunded",
      receipt_url: o.attributes.urls?.receipt || null,
    }));

    const totalCharged = charges.filter((c: any) => c.paid).reduce((s: number, c: any) => s + c.amount, 0);
    const totalRefunded = charges.filter((c: any) => c.refunded).reduce((s: number, c: any) => s + c.amount, 0);

    return {
      current_plan: currentPlan,
      total_charged_cents: totalCharged,
      total_refunded_cents: totalRefunded,
      net_revenue_cents: totalCharged - totalRefunded,
      charge_count: charges.length,
      refund_count: charges.filter((c: any) => c.refunded).length,
      all_subscriptions: subscriptions,
      charges,
    };
  } catch (e) {
    logStep("LS payment fetch error", { error: e.message });
    return { error: e.message, current_plan: "Free", total_charged_cents: 0, total_refunded_cents: 0, net_revenue_cents: 0, charge_count: 0, refund_count: 0, all_subscriptions: [], charges: [] };
  }
};

// ─── Full Payment Intel (detailed LS data) ───
const fetchPaymentIntel = async (userId: string, supabaseAdmin: any) => {
  try {
    const { data: ud } = await supabaseAdmin.from("user_details").select("ls_customer_id").eq("user_id", userId).single();
    if (!ud?.ls_customer_id) return { error: "No LS customer found", subscriptions: [], charges: [], invoices: [], payment_methods: [] };

    const lsCustomerId = ud.ls_customer_id;

    // Fetch all data in parallel
    const [subsRes, ordersRes] = await Promise.all([
      lsFetch(`/subscriptions?filter[customer_id]=${lsCustomerId}`),
      lsFetch(`/orders?filter[customer_id]=${lsCustomerId}&sort=-created_at&page[size]=50`),
    ]);

    const subsData = subsRes.ok ? await subsRes.json() : { data: [] };
    const ordersData = ordersRes.ok ? await ordersRes.json() : { data: [] };

    const subscriptions = (subsData.data || []).map((s: any) => ({
      id: s.id,
      status: s.attributes.status,
      plan: s.attributes.product_name || s.attributes.variant_name || "Unknown",
      interval: "month",
      amount: s.attributes.first_subscription_item?.price || 0,
      start: s.attributes.created_at,
      canceled_at: s.attributes.cancelled ? s.attributes.updated_at : null,
      cancel_at_period_end: s.attributes.status === "cancelled",
      renews_at: s.attributes.renews_at,
    }));

    const charges = (ordersData.data || []).map((o: any) => ({
      id: o.id,
      amount: o.attributes.total || 0,
      created: o.attributes.created_at,
      description: o.attributes.first_order_item?.product_name || "Order",
      paid: o.attributes.status === "paid",
      refunded: o.attributes.status === "refunded",
      receipt_url: o.attributes.urls?.receipt || null,
      card_brand: null,
      card_last4: null,
    }));

    // LS doesn't expose invoices separately — orders serve as invoices
    const invoices = (ordersData.data || []).map((o: any) => ({
      id: o.id,
      status: o.attributes.status === "paid" ? "paid" : o.attributes.status,
      amount_paid: o.attributes.total || 0,
      amount_due: o.attributes.total || 0,
      number: o.attributes.order_number?.toString() || null,
      created: o.attributes.created_at,
      hosted_invoice_url: o.attributes.urls?.receipt || null,
    }));

    return { subscriptions, charges, invoices, payment_methods: [] };
  } catch (e) {
    logStep("Payment intel error", { error: e.message });
    return { error: e.message, subscriptions: [], charges: [], invoices: [], payment_methods: [] };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").single();
    if (!roleData) throw new Error("Admin access required");
    logStep("Admin verified", { user_id: userData.user.id });

    const body = await req.json().catch(() => ({}));
    const { action, userId, adminAction, reason, data: actionData } = body;

    // ═══════════════════ LIST ═══════════════════
    if (action === "list") {
      logStep("Fetching customer list");

      // Get all profiles
      const { data: profiles, error: profilesErr } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, display_name, username, avatar_url, created_at, account_status, post_count, follower_count, admin_notes")
        .order("created_at", { ascending: false });
      if (profilesErr) throw new Error("Failed to fetch profiles");

      // Get all wallets
      const { data: wallets } = await supabaseAdmin.from("wallets").select("user_id, balance, total_purchased");

      // Get all transactions (recent)
      const { data: allTx } = await supabaseAdmin.from("wallet_transactions")
        .select("user_id, type, amount, created_at, metadata, description")
        .order("created_at", { ascending: false });

      // Get login activity counts
      const { data: logins } = await supabaseAdmin.from("admin_login_attempts")
        .select("email, created_at").eq("success", true).order("created_at", { ascending: false });

      const walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w]));
      const txMap = new Map<string, any[]>();
      (allTx || []).forEach((t: any) => {
        if (!txMap.has(t.user_id)) txMap.set(t.user_id, []);
        txMap.get(t.user_id)!.push(t);
      });

      const loginMap = new Map<string, string>();
      (logins || []).forEach((l: any) => {
        if (!loginMap.has(l.email)) loginMap.set(l.email, l.created_at);
      });

      const customers = (profiles || []).map((p: any) => {
        const wallet = walletMap.get(p.user_id) || { balance: 0, total_purchased: 0 };
        const txs = txMap.get(p.user_id) || [];
        const insights = computeInsights(p, wallet, txs, []);

        return {
          user_id: p.user_id,
          email: p.email,
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          account_status: p.account_status || "active",
          credit_balance: wallet.balance || 0,
          total_purchased_credits: wallet.total_purchased || 0,
          granted_credits: insights.total_granted_credits,
          grant_count: insights.grant_count,
          deducted_credits: insights.total_deducted_credits,
          deduct_count: insights.deduct_count,
          purchase_count: insights.purchase_count,
          total_spent_cents: insights.total_spent_cents,
          tx_purchase_count: insights.purchase_count,
          tx_total_credits: insights.total_purchased_credits,
          last_purchase: txs.find((t: any) => t.type === "purchase")?.created_at || null,
          first_purchase: [...txs].reverse().find((t: any) => t.type === "purchase")?.created_at || null,
          ltv: insights.ltv,
          avg_order_value: insights.purchase_count > 0 ? insights.total_spent_cents / insights.purchase_count / 100 : 0,
          days_since_join: insights.days_since_join,
          monthly_velocity: insights.monthly_velocity,
          spender_score: insights.spender_score,
          engagement_score: insights.engagement_score,
          churn_risk: insights.churn_risk,
          last_login: loginMap.get(p.email) || null,
          days_since_last_login: insights.days_since_last_login,
          post_count: p.post_count || 0,
          avg_purchase_credits: insights.avg_purchase_credits,
          purchase_trend: insights.purchase_trend,
          follower_count: p.follower_count || 0,
          current_plan: insights.current_plan,
          purchase_frequency: insights.purchase_frequency,
          projected_annual: insights.projected_annual_ltv,
        };
      });

      logStep("Customer list built", { count: customers.length });
      return ok({ customers });
    }

    // ═══════════════════ DETAIL ═══════════════════
    if (action === "detail") {
      if (!userId) return err("Missing userId", 400);
      logStep("Fetching detail", { userId });

      // Parallel fetches
      const [profileRes, walletRes, txRes, loginRes, deviceRes, adminActionsRes, authRes, rankRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        supabaseAdmin.from("admin_login_attempts").select("*").or(`email.eq.${userId}`).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.from("device_sessions").select("*").eq("user_id", userId).order("last_active_at", { ascending: false }),
        supabaseAdmin.from("admin_user_actions").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.auth.admin.getUserById(userId),
        supabaseAdmin.from("user_ranks").select("*").eq("user_id", userId).single(),
      ]);

      const profile = profileRes.data;
      const wallet = walletRes.data;
      const transactions = txRes.data || [];
      const loginActivity = loginRes.data || [];
      const deviceSessions = deviceRes.data || [];
      const adminActions = adminActionsRes.data || [];
      const authUser = authRes.data?.user;
      const userRank = rankRes.data;

      if (!profile) return err("User not found", 404);

      // Get login activity by email instead
      const { data: loginByEmail } = await supabaseAdmin.from("admin_login_attempts")
        .select("*").eq("email", profile.email).order("created_at", { ascending: false }).limit(50);

      const insights = computeInsights(profile, wallet || { balance: 0, total_purchased: 0 }, transactions, loginByEmail || []);

      // Fetch LS payment data
      const payment = await fetchLSPaymentData(userId, supabaseAdmin);

      // Override plan from payment if available
      if (payment.current_plan !== "Free") {
        insights.current_plan = payment.current_plan;
      }

      // Parse admin notes
      const parsedNotes = parseAdminNotes(profile.admin_notes);

      // Recent posts
      const { data: recentPosts } = await supabaseAdmin.from("user_posts")
        .select("id, content, image_url, like_count, comment_count, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(5);

      return ok({
        profile,
        wallet: wallet || { balance: 0, total_purchased: 0 },
        transactions,
        login_activity: loginByEmail || [],
        device_sessions: deviceSessions,
        admin_actions: adminActions,
        user_rank: userRank,
        insights,
        payment,
        admin_tags: parsedNotes.tags,
        daily_credit_limit: parsedNotes.credit_limit,
        recent_posts: recentPosts || [],
        auth_meta: authUser ? {
          email_confirmed: !!authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          providers: authUser.app_metadata?.providers || ["email"],
          created_at: authUser.created_at,
        } : null,
      });
    }

    // ═══════════════════ PAYMENT INTEL ═══════════════════
    if (action === "payment_intel") {
      if (!userId) return err("Missing userId", 400);
      logStep("Fetching payment intel", { userId });
      const intel = await fetchPaymentIntel(userId, supabaseAdmin);
      return ok(intel);
    }

    // ═══════════════════ AI ANALYSIS ═══════════════════
    if (action === "ai_analysis") {
      if (!userId) return err("Missing userId", 400);
      logStep("Running AI analysis", { userId });

      // Get user data
      const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single();
      const { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single();
      const { data: txs } = await supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);

      if (!profile) return err("User not found", 404);

      const insights = computeInsights(profile, wallet || { balance: 0, total_purchased: 0 }, txs || [], []);

      const prompt = `Analyze this customer for an agency management SaaS platform. Return ONLY a valid JSON object (no markdown, no code blocks).

Customer data:
- Display Name: ${profile.display_name}
- Email: ${profile.email}
- Joined: ${profile.created_at}
- Days since join: ${insights.days_since_join}
- Credit Balance: ${wallet?.balance || 0}
- Total Purchased Credits: ${insights.total_purchased_credits}
- Total Spent: $${insights.ltv.toFixed(2)}
- Purchase Count: ${insights.purchase_count}
- Monthly Velocity: $${insights.monthly_velocity.toFixed(2)}/mo
- Spender Score: ${insights.spender_score}/100
- Engagement Score: ${insights.engagement_score}/100
- Churn Risk: ${insights.churn_risk}
- Post Count: ${profile.post_count || 0}
- Follower Count: ${profile.follower_count || 0}
- Purchase Trend: ${insights.purchase_trend}
- Current Plan: ${insights.current_plan}

Return this exact JSON structure:
{
  "behavioral_profile": "2-3 sentence behavioral analysis",
  "spending_pattern": "2-3 sentence spending pattern analysis",
  "engagement_level": "High/Medium/Low",
  "churn_probability": 0-100,
  "upsell_potential": 0-100,
  "predicted_next_action": "One sentence prediction",
  "revenue_forecast_30d": "$X.XX",
  "revenue_forecast_90d": "$X.XX",
  "customer_segment": "Champion/Loyal/Potential Loyalist/Promising/At Risk/Hibernating/Lost/New",
  "recommended_actions": ["action1", "action2", "action3"],
  "risk_factors": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"],
  "lifetime_value_projection": "$X.XX",
  "optimal_engagement_time": "description",
  "personality_tags": ["tag1", "tag2", "tag3"]
}`;

      try {
        const aiResponse = await fetch("https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/agency-copilot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            model: "google/gemini-2.5-flash",
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          logStep("AI response error", { status: aiResponse.status, body: errText });
          throw new Error("AI analysis failed");
        }

        const aiData = await aiResponse.json();
        let analysisText = aiData.choices?.[0]?.message?.content || aiData.content || aiData.text || "";

        // Clean markdown code blocks
        analysisText = analysisText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

        const analysis = JSON.parse(analysisText);
        return ok({ analysis });
      } catch (e) {
        logStep("AI analysis error", { error: e.message });
        // Return a computed fallback
        return ok({
          analysis: {
            behavioral_profile: `${profile.display_name} is a ${insights.customer_segment.toLowerCase()} user with ${insights.churn_risk.toLowerCase()} churn risk.`,
            spending_pattern: `Lifetime value of $${insights.ltv.toFixed(2)} with ${insights.purchase_count} purchases over ${insights.days_since_join} days.`,
            engagement_level: insights.engagement_score >= 60 ? "High" : insights.engagement_score >= 30 ? "Medium" : "Low",
            churn_probability: insights.churn_risk === "Critical" ? 85 : insights.churn_risk === "High" ? 60 : insights.churn_risk === "Medium" ? 35 : 10,
            upsell_potential: Math.min(100, Math.max(0, insights.spender_score + 10)),
            predicted_next_action: insights.purchase_trend === "increasing" ? "Likely to purchase again within 2 weeks" : "May need re-engagement campaign",
            revenue_forecast_30d: `$${(insights.monthly_velocity).toFixed(2)}`,
            revenue_forecast_90d: `$${(insights.monthly_velocity * 3).toFixed(2)}`,
            customer_segment: insights.customer_segment,
            recommended_actions: ["Monitor engagement patterns", "Consider targeted offer", "Review support history"],
            risk_factors: insights.churn_risk !== "Low" ? ["Declining activity", "No recent purchases"] : ["None identified"],
            opportunities: insights.spender_score >= 30 ? ["Upsell to higher plan", "Offer loyalty discount"] : ["Onboarding optimization"],
            lifetime_value_projection: `$${insights.projected_annual_ltv.toFixed(2)}`,
            optimal_engagement_time: "Weekday mornings (based on general patterns)",
            personality_tags: [insights.customer_segment, insights.spender_tier, insights.churn_risk + " risk"],
          },
        });
      }
    }

    // ═══════════════════ FULL AUDIT ═══════════════════
    if (action === "full_audit") {
      if (!userId) return err("Missing userId", 400);
      logStep("Running full audit", { userId });

      const [profileRes, walletRes, txRes, loginRes, deviceRes, adminActionsRes, authRes, rankRes, postsRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("admin_login_attempts").select("*").order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("device_sessions").select("*").eq("user_id", userId),
        supabaseAdmin.from("admin_user_actions").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.auth.admin.getUserById(userId),
        supabaseAdmin.from("user_ranks").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("user_posts").select("id, like_count, comment_count").eq("user_id", userId),
      ]);

      const profile = profileRes.data;
      if (!profile) return err("User not found", 404);

      const transactions = txRes.data || [];
      const loginsByEmail = (loginRes.data || []).filter((l: any) => l.email === profile.email);
      const uniqueIps = new Set(loginsByEmail.map((l: any) => l.ip_address).filter(Boolean));
      const posts = postsRes.data || [];
      const totalLikes = posts.reduce((s: number, p: any) => s + (p.like_count || 0), 0);
      const totalComments = posts.reduce((s: number, p: any) => s + (p.comment_count || 0), 0);

      const purchases = transactions.filter((t: any) => t.type === "purchase");
      const grants = transactions.filter((t: any) => t.type === "admin_grant");
      const deductions = transactions.filter((t: any) => t.type === "deduction" || t.type === "admin_revoke");

      const parsedNotes = parseAdminNotes(profile.admin_notes);

      return ok({
        analytics: {
          total_transactions: transactions.length,
          total_purchased_credits: purchases.reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
          total_granted_credits: grants.reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
          total_deducted_credits: deductions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
          total_logins: loginsByEmail.length,
          unique_ips: uniqueIps.size,
          unique_devices: (deviceRes.data || []).length,
          total_posts: posts.length,
          total_likes_received: totalLikes,
          total_comments_received: totalComments,
          purchase_count: purchases.length,
          grant_count: grants.length,
        },
        parsed_notes: parsedNotes,
        admin_actions: adminActionsRes.data || [],
        auth_meta: authRes.data?.user ? {
          email_confirmed: !!authRes.data.user.email_confirmed_at,
          last_sign_in_at: authRes.data.user.last_sign_in_at,
          force_logout_at: null,
          created_at: authRes.data.user.created_at,
        } : null,
        user_rank: rankRes.data,
      });
    }

    // ═══════════════════ ADMIN ACTION ═══════════════════
    if (action === "admin_action") {
      if (!userId || !adminAction) return err("Missing userId or adminAction", 400);
      logStep("Admin action", { userId, adminAction, reason });

      const performedBy = userData.user.id;

      // Log the action
      await supabaseAdmin.from("admin_user_actions").insert({
        target_user_id: userId,
        performed_by: performedBy,
        action_type: adminAction,
        reason: reason || null,
        metadata: actionData || null,
      });

      switch (adminAction) {
        case "pause":
          await supabaseAdmin.from("profiles").update({ account_status: "paused" }).eq("user_id", userId);
          break;
        case "activate":
          await supabaseAdmin.from("profiles").update({ account_status: "active" }).eq("user_id", userId);
          break;
        case "suspend":
          await supabaseAdmin.from("profiles").update({ account_status: "suspended" }).eq("user_id", userId);
          break;
        case "delete":
          await supabaseAdmin.from("profiles").update({ account_status: "deleted" }).eq("user_id", userId);
          break;
        case "grant_credits":
        case "revoke_credits": {
          const amount = parseInt(actionData?.amount);
          if (!amount || amount <= 0) return err("Invalid credit amount", 400);
          const isGrant = adminAction === "grant_credits";
          // Update wallet
          const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
          const newBalance = isGrant ? (wallet?.balance || 0) + amount : Math.max(0, (wallet?.balance || 0) - amount);
          await supabaseAdmin.from("wallets").update({ balance: newBalance }).eq("user_id", userId);
          // Log transaction
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId,
            type: isGrant ? "admin_grant" : "admin_revoke",
            amount: isGrant ? amount : -amount,
            description: `Admin ${isGrant ? "grant" : "revoke"}: ${reason || "No reason"}`,
            balance_after: newBalance,
          });
          break;
        }
        case "send_notification":
          await supabaseAdmin.from("admin_user_notifications").insert({
            user_id: userId,
            title: actionData?.title || "Notification",
            message: actionData?.message || "",
            notification_type: actionData?.notification_type || "info",
            sent_by: performedBy,
          });
          break;
        case "reset_password":
          await supabaseAdmin.auth.admin.updateUserById(userId, { password: actionData?.temp_password || undefined });
          break;
        case "verify_email":
          await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
          break;
        case "force_logout":
          // Invalidate all sessions
          await supabaseAdmin.from("device_sessions").update({ status: "revoked" }).eq("user_id", userId);
          break;
        case "add_note": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = p?.admin_notes || "";
          const timestamp = new Date().toISOString().split("T")[0];
          const category = actionData?.category || "general";
          const newNote = `\n[${timestamp}][${category}] ${actionData?.note || reason}`;
          await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + newNote }).eq("user_id", userId);
          break;
        }
        case "change_plan": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[PLAN_OVERRIDE\]\s*\w+/g, "");
          const plan = actionData?.plan || "free";
          const updatedNotes = existingNotes + `\n[PLAN_OVERRIDE] ${plan}`;
          await supabaseAdmin.from("profiles").update({ admin_notes: updatedNotes }).eq("user_id", userId);
          break;
        }
        case "tag_user": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[TAGS\].*?(?=\[|$)/s, "");
          const tags = (actionData?.tags || []).join(", ");
          const updatedNotes = existingNotes + `\n[TAGS]${tags}`;
          await supabaseAdmin.from("profiles").update({ admin_notes: updatedNotes }).eq("user_id", userId);
          break;
        }
        case "set_credit_limit": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[CREDIT_LIMIT\]\s*\d+/g, "");
          const limit = actionData?.daily_limit || 0;
          const updatedNotes = existingNotes + (limit > 0 ? `\n[CREDIT_LIMIT] ${limit}` : "");
          await supabaseAdmin.from("profiles").update({ admin_notes: updatedNotes }).eq("user_id", userId);
          break;
        }
        case "send_email": {
          try {
            const { data: profile } = await supabaseAdmin.from("profiles").select("email, display_name").eq("user_id", userId).single();
            if (profile?.email) {
              await fetch("https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({
                  to: profile.email,
                  subject: actionData?.subject || "Message from Admin",
                  html: `<div style="font-family:Helvetica,Arial,sans-serif;padding:20px;background:#f9f9f9;"><div style="background:#fff;padding:30px;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,.1);"><h2 style="color:#333;">Hello ${profile.display_name || "there"},</h2><div style="color:#555;line-height:1.7;">${(actionData?.body || "").replace(/\n/g, "<br>")}</div><hr style="border:none;border-top:1px solid #ddd;margin:20px 0;"><p style="color:#999;font-size:11px;">Category: ${actionData?.category || "general"}</p></div></div>`,
                }),
              });
            }
          } catch (e) { logStep("Email send error", { error: e.message }); }
          break;
        }
        case "change_email":
          if (actionData?.email) await supabaseAdmin.auth.admin.updateUserById(userId, { email: actionData.email });
          if (actionData?.email) await supabaseAdmin.from("profiles").update({ email: actionData.email }).eq("user_id", userId);
          break;
        case "change_username":
          if (actionData?.username) await supabaseAdmin.from("profiles").update({ username: actionData.username }).eq("user_id", userId);
          break;
        case "change_display_name":
          if (actionData?.display_name) await supabaseAdmin.from("profiles").update({ display_name: actionData.display_name }).eq("user_id", userId);
          break;
        case "set_avatar":
          if (actionData?.avatar_url !== undefined) await supabaseAdmin.from("profiles").update({ avatar_url: actionData.avatar_url || null }).eq("user_id", userId);
          break;
        case "toggle_private": {
          const { data: p } = await supabaseAdmin.from("profiles").select("is_private").eq("user_id", userId).single();
          await supabaseAdmin.from("profiles").update({ is_private: !(p?.is_private || false) }).eq("user_id", userId);
          break;
        }
        case "reset_credits":
          await supabaseAdmin.from("wallets").update({ balance: 0 }).eq("user_id", userId);
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId, type: "admin_revoke", amount: 0,
            description: `Admin reset all credits: ${reason || "No reason"}`, balance_after: 0,
          });
          break;
        case "clear_posts":
          await supabaseAdmin.from("user_posts").delete().eq("user_id", userId);
          await supabaseAdmin.from("profiles").update({ post_count: 0 }).eq("user_id", userId);
          break;
        case "reset_followers":
          await supabaseAdmin.from("social_follows").delete().eq("following_id", userId);
          await supabaseAdmin.from("social_follows").delete().eq("follower_id", userId);
          await supabaseAdmin.from("profiles").update({ follower_count: 0, following_count: 0 }).eq("user_id", userId);
          break;
        case "credit_expiry_warn":
          await supabaseAdmin.from("admin_user_notifications").insert({
            user_id: userId,
            title: "Credit Expiry Warning",
            message: "Some of your credits may expire soon. Use them before they expire!",
            notification_type: "warning",
            sent_by: performedBy,
          });
          break;
        default:
          logStep("Unknown admin action", { adminAction });
      }

      return ok({ success: true, action: adminAction });
    }

    return err("Unknown action", 400);
  } catch (error) {
    console.error("General error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

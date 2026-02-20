import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ADMIN-CUSTOMERS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
  const bannedMatch = notes.match(/\[BANNED_IPS\](.*?)(?:\[|$)/s);
  if (bannedMatch) result.banned_ips = bannedMatch[1].split(",").map((ip: string) => ip.trim()).filter(Boolean);
  const flagMatch = notes.match(/\[FLAGS\](.*?)(?:\[|$)/s);
  if (flagMatch) result.flags = flagMatch[1].split(",").map((f: string) => f.trim()).filter(Boolean);
  return result;
};

// ─── computeInsights function (lines 49-150) ───
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

  const lastLogin = loginActivity.length > 0 ? loginActivity[0].login_at || loginActivity[0].created_at : null;
  const daysSinceLastLogin = lastLogin ? Math.floor((now - new Date(lastLogin).getTime()) / 86400000) : 999;
  const lastPurchase = purchases.length > 0 ? purchases[0].created_at : null;
  const daysSinceLastPurchase = lastPurchase ? Math.floor((now - new Date(lastPurchase).getTime()) / 86400000) : 999;

  let spenderScore = 0;
  if (ltv >= 500) spenderScore += 40; else if (ltv >= 100) spenderScore += 25; else if (ltv >= 20) spenderScore += 10;
  if (purchases.length >= 10) spenderScore += 30; else if (purchases.length >= 5) spenderScore += 20; else if (purchases.length >= 2) spenderScore += 10;
  if (monthlyVelocity >= 50) spenderScore += 30; else if (monthlyVelocity >= 20) spenderScore += 20; else if (monthlyVelocity >= 5) spenderScore += 10;

  let engagementScore = 0;
  if (daysSinceLastLogin <= 1) engagementScore += 40; else if (daysSinceLastLogin <= 7) engagementScore += 25; else if (daysSinceLastLogin <= 30) engagementScore += 10;
  if ((profile.post_count || 0) >= 20) engagementScore += 30; else if ((profile.post_count || 0) >= 5) engagementScore += 15;
  if ((profile.follower_count || 0) >= 50) engagementScore += 30; else if ((profile.follower_count || 0) >= 10) engagementScore += 15;

  let churnRisk = "Low";
  if (daysSinceLastLogin > 90 || (purchases.length > 0 && daysSinceLastPurchase > 120)) churnRisk = "Critical";
  else if (daysSinceLastLogin > 30 || daysSinceLastPurchase > 60) churnRisk = "High";
  else if (daysSinceLastLogin > 14 || daysSinceLastPurchase > 30) churnRisk = "Medium";

  let spenderTier = "Low";
  if (spenderScore >= 80) spenderTier = "Whale";
  else if (spenderScore >= 70) spenderTier = "High Whale";
  else if (spenderScore >= 50) spenderTier = "High";
  else if (spenderScore >= 30) spenderTier = "Medium";

  const recentPurchases = purchases.filter((t: any) => now - new Date(t.created_at).getTime() < 30 * 86400000).length;
  const olderPurchases = purchases.filter((t: any) => {
    const age = now - new Date(t.created_at).getTime();
    return age >= 30 * 86400000 && age < 60 * 86400000;
  }).length;
  const purchaseTrend = recentPurchases > olderPurchases ? "increasing" : recentPurchases < olderPurchases ? "decreasing" : "stable";

  let customerSegment = "New";
  if (spenderScore >= 70 && engagementScore >= 60) customerSegment = "Champion";
  else if (spenderScore >= 50 && daysSinceLastLogin <= 14) customerSegment = "Loyal";
  else if (spenderScore >= 30 && daysSinceLastLogin > 30) customerSegment = "At Risk";
  else if (daysSinceLastLogin > 120) customerSegment = "Lost";
  else if (daysSinceLastLogin > 60) customerSegment = "Hibernating";
  else if (spenderScore >= 20) customerSegment = "Potential Loyalist";
  else if (engagementScore >= 40) customerSegment = "Promising";

  const parsedNotes = parseAdminNotes(profile.admin_notes);
  const currentPlan = parsedNotes.plan_override || "Free";
  const creditVelocity = totalDeductedCredits / daysSinceJoin;

  let retentionProb = 100;
  if (churnRisk === "Critical") retentionProb = 15;
  else if (churnRisk === "High") retentionProb = 40;
  else if (churnRisk === "Medium") retentionProb = 65;
  else retentionProb = 90;

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
    days_since_last_purchase: daysSinceLastPurchase,
    follower_count_real: profile.follower_count || 0,
    following_count_real: profile.following_count || 0,
    current_plan: currentPlan,
    credit_velocity: creditVelocity,
    retention_probability: retentionProb,
  };
};

// ─── Polar payment data (summary) ───
const fetchPolarPaymentData = async (userId: string, supabaseAdmin: any) => {
  try {
    // Find Polar customer by external_id (Supabase user ID)
    let polarCustomerId: string | null = null;

    const custRes = await polarFetch(`/customers?external_id=${encodeURIComponent(userId)}&limit=1`);
    if (custRes.ok) {
      const custData = await custRes.json();
      polarCustomerId = custData.items?.[0]?.id || null;
    }

    // Fallback: find by email
    if (!polarCustomerId) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("user_id", userId).single();
      if (profile?.email) {
        const emailRes = await polarFetch(`/customers?email=${encodeURIComponent(profile.email)}&limit=1`);
        if (emailRes.ok) {
          const emailData = await emailRes.json();
          polarCustomerId = emailData.items?.[0]?.id || null;
        }
      }
    }

    if (!polarCustomerId) {
      // Fallback: check wallet_transactions for payment metadata
      const { data: txs } = await supabaseAdmin.from("wallet_transactions")
        .select("*").eq("user_id", userId).eq("type", "purchase").order("created_at", { ascending: false }).limit(50);
      const totalCharged = (txs || []).reduce((s: number, t: any) => s + (t.metadata?.amount_cents || 0), 0);
      return {
        current_plan: "Free",
        polar_customer_id: null,
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

    // Fetch subscriptions from Polar
    const subsRes = await polarFetch(`/subscriptions?customer_id=${polarCustomerId}&limit=50`);
    const subsData = subsRes.ok ? await subsRes.json() : { items: [] };
    const subscriptions = (subsData.items || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      plan: s.product?.name || "Unknown",
      interval: s.recurring_interval || "month",
      amount: s.amount || s.price?.price_amount || 0,
      start_date: s.created_at,
      canceled_at: s.canceled_at || null,
      cancel_at_period_end: s.cancel_at_period_end || false,
      current_period_start: s.current_period_start,
      current_period_end: s.current_period_end,
      product_id: s.product_id,
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

    // Fetch orders from Polar
    const ordersRes = await polarFetch(`/orders?customer_id=${polarCustomerId}&limit=50&sorting=-created_at`);
    const ordersData = ordersRes.ok ? await ordersRes.json() : { items: [] };
    const orders = ordersData.items || [];

    const charges = orders.map((o: any) => ({
      id: o.id,
      amount: o.amount || 0,
      created: o.created_at,
      description: o.product?.name || "Order",
      paid: true,
      refunded: o.refunded || false,
      currency: o.currency || "usd",
    }));

    const totalCharged = charges.filter((c: any) => c.paid).reduce((s: number, c: any) => s + c.amount, 0);
    const totalRefunded = charges.filter((c: any) => c.refunded).reduce((s: number, c: any) => s + c.amount, 0);

    return {
      current_plan: currentPlan,
      polar_customer_id: polarCustomerId,
      total_charged_cents: totalCharged,
      total_refunded_cents: totalRefunded,
      net_revenue_cents: totalCharged - totalRefunded,
      charge_count: charges.length,
      refund_count: charges.filter((c: any) => c.refunded).length,
      all_subscriptions: subscriptions,
      charges,
      active_subscription: activeSub || null,
    };
  } catch (e) {
    logStep("Polar payment fetch error", { error: e.message });
    return { error: e.message, current_plan: "Free", polar_customer_id: null, total_charged_cents: 0, total_refunded_cents: 0, net_revenue_cents: 0, charge_count: 0, refund_count: 0, all_subscriptions: [], charges: [], active_subscription: null };
  }
};

// ─── Full Payment Intel (detailed Polar data) ───
const fetchPaymentIntel = async (userId: string, supabaseAdmin: any) => {
  try {
    // Find Polar customer
    let polarCustomerId: string | null = null;
    const custRes = await polarFetch(`/customers?external_id=${encodeURIComponent(userId)}&limit=1`);
    if (custRes.ok) {
      const custData = await custRes.json();
      polarCustomerId = custData.items?.[0]?.id || null;
    }
    if (!polarCustomerId) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("user_id", userId).single();
      if (profile?.email) {
        const emailRes = await polarFetch(`/customers?email=${encodeURIComponent(profile.email)}&limit=1`);
        if (emailRes.ok) {
          const emailData = await emailRes.json();
          polarCustomerId = emailData.items?.[0]?.id || null;
        }
      }
    }
    if (!polarCustomerId) return { error: "No Polar customer found", subscriptions: [], charges: [], invoices: [], payment_methods: [], subscription_invoices: [] };

    // Fetch all data in parallel
    const [subsRes, ordersRes] = await Promise.all([
      polarFetch(`/subscriptions?customer_id=${polarCustomerId}&limit=50`),
      polarFetch(`/orders?customer_id=${polarCustomerId}&limit=50&sorting=-created_at`),
    ]);

    const subsData = subsRes.ok ? await subsRes.json() : { items: [] };
    const ordersData = ordersRes.ok ? await ordersRes.json() : { items: [] };

    const subscriptions = (subsData.items || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      plan: s.product?.name || "Unknown",
      interval: s.recurring_interval || "month",
      amount: s.amount || s.price?.price_amount || 0,
      start: s.created_at,
      canceled_at: s.canceled_at || null,
      cancel_at_period_end: s.cancel_at_period_end || false,
      current_period_start: s.current_period_start,
      current_period_end: s.current_period_end,
      product_id: s.product_id,
    }));

    const charges = (ordersData.items || []).map((o: any) => ({
      id: o.id,
      amount: o.amount || 0,
      created: o.created_at,
      description: o.product?.name || "Order",
      paid: true,
      refunded: o.refunded || false,
      currency: o.currency || "usd",
    }));

    // Orders serve as invoices in Polar
    const invoices = (ordersData.items || []).map((o: any) => ({
      id: o.id,
      status: "paid",
      amount_paid: o.amount || 0,
      amount_due: o.amount || 0,
      number: o.id,
      created: o.created_at,
      hosted_invoice_url: null,
    }));

    return { subscriptions, charges, invoices, payment_methods: [], subscription_invoices: [] };
  } catch (e) {
    logStep("Payment intel error", { error: e.message });
    return { error: e.message, subscriptions: [], charges: [], invoices: [], payment_methods: [], subscription_invoices: [] };
  }
};

// ─── Polar Subscription Management ───
const managePolarSubscription = async (subscriptionId: string, action: string) => {
  try {
    switch (action) {
      case "cancel": {
        const res = await polarFetch(`/subscriptions/${subscriptionId}`, {
          method: "DELETE",
        });
        return { success: res.ok, action: "cancelled" };
      }
      case "revoke": {
        // Immediate cancellation
        const res = await polarFetch(`/subscriptions/${subscriptionId}`, {
          method: "DELETE",
        });
        return { success: res.ok, action: "revoked" };
      }
      default:
        return { success: false, error: `Unknown subscription action: ${action}` };
    }
  } catch (e) {
    logStep("Polar subscription management error", { error: e.message });
    return { success: false, error: e.message };
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
    const { action, userId, adminAction, reason, data: actionData, query, filters } = body;

    // ═══════════════════ SEARCH ═══════════════════
    if (action === "search") {
      logStep("Searching customers", { query });
      const searchQuery = (query || "").trim().toLowerCase();
      if (!searchQuery) return err("Search query required", 400);

      const { data: results } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, display_name, username, avatar_url, created_at, account_status, post_count, follower_count, admin_notes")
        .or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      const userIds = (results || []).map((r: any) => r.user_id);
      const { data: wallets } = await supabaseAdmin.from("wallets").select("user_id, balance, total_purchased").in("user_id", userIds);
      const walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w]));

      const enriched = (results || []).map((p: any) => {
        const wallet = walletMap.get(p.user_id) || { balance: 0, total_purchased: 0 };
        const parsedNotes = parseAdminNotes(p.admin_notes);
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
          current_plan: parsedNotes.plan_override || "Free",
          tags: parsedNotes.tags,
        };
      });

      return ok({ customers: enriched, total: enriched.length });
    }

    // ═══════════════════ LIST ═══════════════════
    if (action === "list") {
      logStep("Fetching customer list");

      const { data: profiles, error: profilesErr } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, display_name, username, avatar_url, created_at, account_status, post_count, follower_count, admin_notes")
        .order("created_at", { ascending: false });
      if (profilesErr) throw new Error("Failed to fetch profiles");

      const { data: wallets } = await supabaseAdmin.from("wallets").select("user_id, balance, total_purchased");
      const { data: allTx } = await supabaseAdmin.from("wallet_transactions")
        .select("user_id, type, amount, created_at, metadata, description")
        .order("created_at", { ascending: false });
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
          user_id: p.user_id, email: p.email, display_name: p.display_name, username: p.username,
          avatar_url: p.avatar_url, created_at: p.created_at, account_status: p.account_status || "active",
          credit_balance: wallet.balance || 0, total_purchased_credits: wallet.total_purchased || 0,
          granted_credits: insights.total_granted_credits, grant_count: insights.grant_count,
          deducted_credits: insights.total_deducted_credits, deduct_count: insights.deduct_count,
          purchase_count: insights.purchase_count, total_spent_cents: insights.total_spent_cents,
          tx_purchase_count: insights.purchase_count, tx_total_credits: insights.total_purchased_credits,
          last_purchase: txs.find((t: any) => t.type === "purchase")?.created_at || null,
          first_purchase: [...txs].reverse().find((t: any) => t.type === "purchase")?.created_at || null,
          ltv: insights.ltv, avg_order_value: insights.purchase_count > 0 ? insights.total_spent_cents / insights.purchase_count / 100 : 0,
          days_since_join: insights.days_since_join, monthly_velocity: insights.monthly_velocity,
          spender_score: insights.spender_score, engagement_score: insights.engagement_score,
          churn_risk: insights.churn_risk, last_login: loginMap.get(p.email) || null,
          days_since_last_login: insights.days_since_last_login, post_count: p.post_count || 0,
          avg_purchase_credits: insights.avg_purchase_credits, purchase_trend: insights.purchase_trend,
          follower_count: p.follower_count || 0, current_plan: insights.current_plan,
          purchase_frequency: insights.purchase_frequency, projected_annual: insights.projected_annual_ltv,
          customer_segment: insights.customer_segment, spender_tier: insights.spender_tier,
          retention_probability: insights.retention_probability,
        };
      });

      let filtered = customers;
      if (filters) {
        if (filters.status) filtered = filtered.filter((c: any) => c.account_status === filters.status);
        if (filters.plan) filtered = filtered.filter((c: any) => c.current_plan === filters.plan);
        if (filters.segment) filtered = filtered.filter((c: any) => c.customer_segment === filters.segment);
        if (filters.churn_risk) filtered = filtered.filter((c: any) => c.churn_risk === filters.churn_risk);
        if (filters.spender_tier) filtered = filtered.filter((c: any) => c.spender_tier === filters.spender_tier);
        if (filters.min_ltv) filtered = filtered.filter((c: any) => c.ltv >= filters.min_ltv);
        if (filters.max_ltv) filtered = filtered.filter((c: any) => c.ltv <= filters.max_ltv);
      }

      logStep("Customer list built", { count: filtered.length, total: customers.length });
      return ok({ customers: filtered, total: customers.length });
    }

    // ═══════════════════ DETAIL ═══════════════════
    if (action === "detail") {
      if (!userId) return err("Missing userId", 400);
      logStep("Fetching detail", { userId });

      const [profileRes, walletRes, txRes, loginRes, deviceRes, adminActionsRes, authRes, rankRes, notificationsRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        supabaseAdmin.from("admin_login_attempts").select("*").or(`email.eq.${userId}`).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.from("device_sessions").select("*").eq("user_id", userId).order("last_active_at", { ascending: false }),
        supabaseAdmin.from("admin_user_actions").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.auth.admin.getUserById(userId),
        supabaseAdmin.from("user_ranks").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("admin_user_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);

      const profile = profileRes.data;
      const wallet = walletRes.data;
      const transactions = txRes.data || [];
      const deviceSessions = deviceRes.data || [];
      const adminActions = adminActionsRes.data || [];
      const authUser = authRes.data?.user;
      const userRank = rankRes.data;
      const notifications = notificationsRes.data || [];

      if (!profile) return err("User not found", 404);

      const { data: loginByEmail } = await supabaseAdmin.from("admin_login_attempts")
        .select("*").eq("email", profile.email).order("created_at", { ascending: false }).limit(50);

      const insights = computeInsights(profile, wallet || { balance: 0, total_purchased: 0 }, transactions, loginByEmail || []);

      // Fetch Polar payment data
      const payment = await fetchPolarPaymentData(userId, supabaseAdmin);

      if (payment.current_plan !== "Free") {
        insights.current_plan = payment.current_plan;
      }

      const parsedNotes = parseAdminNotes(profile.admin_notes);

      const { data: recentPosts } = await supabaseAdmin.from("user_posts")
        .select("id, content, image_url, like_count, comment_count, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(5);

      const { data: followers } = await supabaseAdmin.from("social_follows")
        .select("follower_id").eq("following_id", userId);
      const { data: following } = await supabaseAdmin.from("social_follows")
        .select("following_id").eq("follower_id", userId);

      return ok({
        profile, wallet: wallet || { balance: 0, total_purchased: 0 },
        transactions, login_activity: loginByEmail || [], device_sessions: deviceSessions,
        admin_actions: adminActions, user_rank: userRank, insights, payment,
        admin_tags: parsedNotes.tags, admin_flags: parsedNotes.flags || [],
        daily_credit_limit: parsedNotes.credit_limit, recent_posts: recentPosts || [],
        notifications,
        social: { follower_count: (followers || []).length, following_count: (following || []).length },
        auth_meta: authUser ? {
          email_confirmed: !!authUser.email_confirmed_at, last_sign_in_at: authUser.last_sign_in_at,
          providers: authUser.app_metadata?.providers || ["email"], created_at: authUser.created_at,
          phone: authUser.phone || null, role: authUser.role || null,
        } : null,
      });
    }

    // ═══════════════════ VIEW AS USER ═══════════════════
    if (action === "view_as_user") {
      if (!userId) return err("Missing userId", 400);
      logStep("View as user snapshot", { userId });

      const [profileRes, walletRes, rankRes, postsRes, followersRes, followingRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("user_ranks").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("user_posts").select("id, content, image_url, like_count, comment_count, save_count, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabaseAdmin.from("social_follows").select("follower_id").eq("following_id", userId),
        supabaseAdmin.from("social_follows").select("following_id").eq("follower_id", userId),
      ]);

      const profile = profileRes.data;
      if (!profile) return err("User not found", 404);

      const wallet = walletRes.data || { balance: 0, total_purchased: 0 };
      const rank = rankRes.data;

      const { count: unreadCount } = await supabaseAdmin
        .from("admin_user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("is_read", false);

      const { data: activeDevices } = await supabaseAdmin.from("device_sessions")
        .select("device_name, device_type, last_active_at, status")
        .eq("user_id", userId).eq("status", "active").order("last_active_at", { ascending: false }).limit(5);

      const payment = await fetchPolarPaymentData(userId, supabaseAdmin);

      return ok({
        user_view: {
          display_name: profile.display_name, username: profile.username,
          avatar_url: profile.avatar_url, bio: profile.bio,
          is_private: profile.is_private || false, credit_balance: wallet.balance,
          total_purchased: wallet.total_purchased, rank_tier: rank?.rank_tier || "metal",
          xp: rank?.xp || 0, points_balance: rank?.points_balance || 0,
          post_count: profile.post_count || 0,
          follower_count: (followersRes.data || []).length,
          following_count: (followingRes.data || []).length,
          unread_notifications: unreadCount || 0,
          current_plan: payment.current_plan,
          active_subscription: payment.active_subscription,
          recent_posts: postsRes.data || [],
          active_devices: activeDevices || [],
          joined_at: profile.created_at,
        },
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
- Total Granted Credits: ${insights.total_granted_credits}
- Total Deducted Credits: ${insights.total_deducted_credits}
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
- Customer Segment: ${insights.customer_segment}
- Spender Tier: ${insights.spender_tier}
- Retention Probability: ${insights.retention_probability}%
- Credit Velocity: ${insights.credit_velocity.toFixed(2)}/day

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
  "personality_tags": ["tag1", "tag2", "tag3"],
  "retention_strategy": "Recommended retention approach",
  "credit_usage_efficiency": "High/Medium/Low"
}`;

      try {
        const aiResponse = await fetch("https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/agency-copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "google/gemini-2.5-flash" }),
        });

        if (!aiResponse.ok) throw new Error("AI analysis failed");

        const aiData = await aiResponse.json();
        let analysisText = aiData.choices?.[0]?.message?.content || aiData.content || aiData.text || "";
        analysisText = analysisText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const analysis = JSON.parse(analysisText);
        return ok({ analysis });
      } catch (e) {
        logStep("AI analysis error", { error: e.message });
        return ok({
          analysis: {
            behavioral_profile: `${profile.display_name} is a ${insights.customer_segment.toLowerCase()} user with ${insights.churn_risk.toLowerCase()} churn risk.`,
            spending_pattern: `Lifetime value of $${insights.ltv.toFixed(2)} with ${insights.purchase_count} purchases over ${insights.days_since_join} days.`,
            engagement_level: insights.engagement_score >= 60 ? "High" : insights.engagement_score >= 30 ? "Medium" : "Low",
            churn_probability: insights.churn_risk === "Critical" ? 85 : insights.churn_risk === "High" ? 60 : insights.churn_risk === "Medium" ? 35 : 10,
            upsell_potential: Math.min(100, Math.max(0, insights.spender_score + 10)),
            predicted_next_action: insights.purchase_trend === "increasing" ? "Likely to purchase again within 2 weeks" : "May need re-engagement campaign",
            revenue_forecast_30d: `$${insights.monthly_velocity.toFixed(2)}`,
            revenue_forecast_90d: `$${(insights.monthly_velocity * 3).toFixed(2)}`,
            customer_segment: insights.customer_segment,
            recommended_actions: ["Monitor engagement patterns", "Consider targeted offer", "Review support history"],
            risk_factors: insights.churn_risk !== "Low" ? ["Declining activity", "No recent purchases"] : ["None identified"],
            opportunities: insights.spender_score >= 30 ? ["Upsell to higher plan", "Offer loyalty discount"] : ["Onboarding optimization"],
            lifetime_value_projection: `$${insights.projected_annual_ltv.toFixed(2)}`,
            optimal_engagement_time: "Weekday mornings (based on general patterns)",
            personality_tags: [insights.customer_segment, insights.spender_tier, insights.churn_risk + " risk"],
            retention_strategy: insights.churn_risk === "Critical" ? "Immediate outreach with retention offer" : "Continue current engagement cadence",
            credit_usage_efficiency: insights.credit_velocity > 10 ? "High" : insights.credit_velocity > 3 ? "Medium" : "Low",
          },
        });
      }
    }

    // ═══════════════════ FULL AUDIT ═══════════════════
    if (action === "full_audit") {
      if (!userId) return err("Missing userId", 400);
      logStep("Running full audit", { userId });

      const [profileRes, walletRes, txRes, loginRes, deviceRes, adminActionsRes, authRes, rankRes, postsRes, notifRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("admin_login_attempts").select("*").order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("device_sessions").select("*").eq("user_id", userId),
        supabaseAdmin.from("admin_user_actions").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.auth.admin.getUserById(userId),
        supabaseAdmin.from("user_ranks").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("user_posts").select("id, like_count, comment_count, save_count, created_at").eq("user_id", userId),
        supabaseAdmin.from("admin_user_notifications").select("id, title, notification_type, is_read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);

      const profile = profileRes.data;
      if (!profile) return err("User not found", 404);

      const transactions = txRes.data || [];
      const loginsByEmail = (loginRes.data || []).filter((l: any) => l.email === profile.email);
      const uniqueIps = new Set(loginsByEmail.map((l: any) => l.ip_address).filter(Boolean));
      const uniqueAgents = new Set(loginsByEmail.map((l: any) => l.user_agent).filter(Boolean));
      const posts = postsRes.data || [];
      const totalLikes = posts.reduce((s: number, p: any) => s + (p.like_count || 0), 0);
      const totalComments = posts.reduce((s: number, p: any) => s + (p.comment_count || 0), 0);
      const totalSaves = posts.reduce((s: number, p: any) => s + (p.save_count || 0), 0);

      const purchases = transactions.filter((t: any) => t.type === "purchase");
      const grants = transactions.filter((t: any) => t.type === "admin_grant");
      const deductions = transactions.filter((t: any) => t.type === "deduction" || t.type === "admin_revoke");

      const parsedNotes = parseAdminNotes(profile.admin_notes);
      const payment = await fetchPolarPaymentData(userId, supabaseAdmin);

      return ok({
        analytics: {
          total_transactions: transactions.length,
          total_purchased_credits: purchases.reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
          total_granted_credits: grants.reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
          total_deducted_credits: deductions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
          total_logins: loginsByEmail.length, unique_ips: uniqueIps.size,
          unique_user_agents: uniqueAgents.size, unique_devices: (deviceRes.data || []).length,
          total_posts: posts.length, total_likes_received: totalLikes,
          total_comments_received: totalComments, total_saves_received: totalSaves,
          purchase_count: purchases.length, grant_count: grants.length, deduction_count: deductions.length,
          notification_count: (notifRes.data || []).length,
          unread_notifications: (notifRes.data || []).filter((n: any) => !n.is_read).length,
        },
        parsed_notes: parsedNotes,
        admin_actions: adminActionsRes.data || [],
        payment_summary: {
          current_plan: payment.current_plan,
          polar_customer_id: payment.polar_customer_id,
          total_charged: payment.total_charged_cents,
          total_refunded: payment.total_refunded_cents,
          net_revenue: payment.net_revenue_cents,
          subscription_count: payment.all_subscriptions?.length || 0,
          active_subscription: payment.active_subscription || null,
        },
        auth_meta: authRes.data?.user ? {
          email_confirmed: !!authRes.data.user.email_confirmed_at,
          last_sign_in_at: authRes.data.user.last_sign_in_at,
          force_logout_at: null, created_at: authRes.data.user.created_at,
          phone: authRes.data.user.phone || null,
          providers: authRes.data.user.app_metadata?.providers || ["email"],
        } : null,
        user_rank: rankRes.data,
        recent_notifications: notifRes.data || [],
        ip_addresses: [...uniqueIps],
      });
    }

    // ═══════════════════ EXPORT ═══════════════════
    if (action === "export") {
      logStep("Exporting customer data");

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, display_name, username, created_at, account_status, post_count, follower_count, following_count, admin_notes")
        .order("created_at", { ascending: false });

      const { data: wallets } = await supabaseAdmin.from("wallets").select("user_id, balance, total_purchased");
      const walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w]));

      const { data: allTx } = await supabaseAdmin.from("wallet_transactions")
        .select("user_id, type, amount, metadata").order("created_at", { ascending: false });

      const txMap = new Map<string, any[]>();
      (allTx || []).forEach((t: any) => {
        if (!txMap.has(t.user_id)) txMap.set(t.user_id, []);
        txMap.get(t.user_id)!.push(t);
      });

      const exportData = (profiles || []).map((p: any) => {
        const wallet = walletMap.get(p.user_id) || { balance: 0, total_purchased: 0 };
        const txs = txMap.get(p.user_id) || [];
        const purchases = txs.filter((t: any) => t.type === "purchase");
        const totalSpentCents = purchases.reduce((s: number, t: any) => s + (t.metadata?.amount_cents || 0), 0);
        const parsedNotes = parseAdminNotes(p.admin_notes);
        return {
          user_id: p.user_id, email: p.email, display_name: p.display_name, username: p.username,
          joined: p.created_at, status: p.account_status || "active",
          credit_balance: wallet.balance || 0, total_purchased_credits: wallet.total_purchased || 0,
          total_spent_usd: (totalSpentCents / 100).toFixed(2), purchase_count: purchases.length,
          post_count: p.post_count || 0, follower_count: p.follower_count || 0,
          following_count: p.following_count || 0, plan: parsedNotes.plan_override || "Free",
          tags: (parsedNotes.tags || []).join("; "),
        };
      });

      return ok({ export: exportData, count: exportData.length, exported_at: new Date().toISOString() });
    }

    // ═══════════════════ BULK ACTION ═══════════════════
    if (action === "bulk_action") {
      const { userIds, bulkAction } = body;
      if (!userIds?.length || !bulkAction) return err("Missing userIds or bulkAction", 400);
      logStep("Bulk action", { count: userIds.length, bulkAction });

      const performedBy = userData.user.id;
      const results: any[] = [];

      for (const uid of userIds) {
        try {
          await supabaseAdmin.from("admin_user_actions").insert({
            target_user_id: uid, performed_by: performedBy,
            action_type: `bulk_${bulkAction}`, reason: reason || `Bulk action: ${bulkAction}`,
            metadata: { bulk: true, total_in_batch: userIds.length },
          });

          switch (bulkAction) {
            case "activate":
              await supabaseAdmin.from("profiles").update({ account_status: "active" }).eq("user_id", uid);
              break;
            case "suspend":
              await supabaseAdmin.from("profiles").update({ account_status: "suspended" }).eq("user_id", uid);
              break;
            case "pause":
              await supabaseAdmin.from("profiles").update({ account_status: "paused" }).eq("user_id", uid);
              break;
            case "grant_credits": {
              const amount = parseInt(actionData?.amount);
              if (amount > 0) {
                const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", uid).single();
                const newBal = (w?.balance || 0) + amount;
                await supabaseAdmin.from("wallets").update({ balance: newBal }).eq("user_id", uid);
                await supabaseAdmin.from("wallet_transactions").insert({
                  user_id: uid, type: "admin_grant", amount,
                  description: `Bulk grant: ${reason || "No reason"}`, balance_after: newBal,
                });
              }
              break;
            }
            case "send_notification":
              await supabaseAdmin.from("admin_user_notifications").insert({
                user_id: uid, title: actionData?.title || "Notification",
                message: actionData?.message || "", notification_type: actionData?.notification_type || "info",
                sent_by: performedBy,
              });
              break;
            case "tag": {
              const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", uid).single();
              const existingNotes = (p?.admin_notes || "").replace(/\[TAGS\].*?(?=\[|$)/s, "");
              const tags = (actionData?.tags || []).join(", ");
              await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + `\n[TAGS]${tags}` }).eq("user_id", uid);
              break;
            }
          }
          results.push({ user_id: uid, success: true });
        } catch (e) {
          results.push({ user_id: uid, success: false, error: e.message });
        }
      }

      return ok({ results, total: userIds.length, succeeded: results.filter((r: any) => r.success).length });
    }

    // ═══════════════════ ADMIN ACTION ═══════════════════
    if (action === "admin_action") {
      if (!userId || !adminAction) return err("Missing userId or adminAction", 400);
      logStep("Admin action", { userId, adminAction, reason });

      const performedBy = userData.user.id;

      await supabaseAdmin.from("admin_user_actions").insert({
        target_user_id: userId, performed_by: performedBy,
        action_type: adminAction, reason: reason || null, metadata: actionData || null,
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
          const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
          const newBalance = isGrant ? (wallet?.balance || 0) + amount : Math.max(0, (wallet?.balance || 0) - amount);
          await supabaseAdmin.from("wallets").update({ balance: newBalance }).eq("user_id", userId);
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId, type: isGrant ? "admin_grant" : "admin_revoke",
            amount: isGrant ? amount : -amount,
            description: `Admin ${isGrant ? "grant" : "revoke"}: ${reason || "No reason"}`,
            balance_after: newBalance,
          });
          break;
        }
        case "send_notification":
          await supabaseAdmin.from("admin_user_notifications").insert({
            user_id: userId, title: actionData?.title || "Notification",
            message: actionData?.message || "", notification_type: actionData?.notification_type || "info",
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
          await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + `\n[PLAN_OVERRIDE] ${plan}` }).eq("user_id", userId);
          break;
        }
        case "tag_user": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[TAGS\].*?(?=\[|$)/s, "");
          const tags = (actionData?.tags || []).join(", ");
          await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + `\n[TAGS]${tags}` }).eq("user_id", userId);
          break;
        }
        case "set_credit_limit": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[CREDIT_LIMIT\]\s*\d+/g, "");
          const limit = actionData?.daily_limit || 0;
          await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + (limit > 0 ? `\n[CREDIT_LIMIT] ${limit}` : "") }).eq("user_id", userId);
          break;
        }
        case "flag_user": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[FLAGS\].*?(?=\[|$)/s, "");
          const flags = (actionData?.flags || []).join(", ");
          await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + `\n[FLAGS]${flags}` }).eq("user_id", userId);
          break;
        }
        case "ban_ip": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = p?.admin_notes || "";
          const bannedMatch = existingNotes.match(/\[BANNED_IPS\](.*?)(?:\[|$)/s);
          const existingBanned = bannedMatch ? bannedMatch[1].split(",").map((ip: string) => ip.trim()).filter(Boolean) : [];
          const newIp = actionData?.ip_address;
          if (newIp && !existingBanned.includes(newIp)) existingBanned.push(newIp);
          const cleanNotes = existingNotes.replace(/\[BANNED_IPS\].*?(?=\[|$)/s, "");
          await supabaseAdmin.from("profiles").update({ admin_notes: cleanNotes + `\n[BANNED_IPS]${existingBanned.join(", ")}` }).eq("user_id", userId);
          break;
        }
        case "cancel_subscription": {
          if (actionData?.subscription_id) {
            const result = await managePolarSubscription(actionData.subscription_id, "cancel");
            if (!result.success) return err(result.error || "Failed to cancel subscription", 500);
          }
          break;
        }
        case "pause_subscription": {
          // Polar doesn't support pause — cancel instead
          if (actionData?.subscription_id) {
            const result = await managePolarSubscription(actionData.subscription_id, "cancel");
            if (!result.success) return err(result.error || "Failed to cancel subscription", 500);
          }
          break;
        }
        case "resume_subscription": {
          // Polar doesn't support resume — user needs to re-subscribe
          return ok({ success: true, action: "resume_subscription", note: "User must re-subscribe via checkout. Polar does not support resuming cancelled subscriptions." });
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
            user_id: userId, title: "Credit Expiry Warning",
            message: actionData?.message || "Some of your credits may expire soon. Use them before they expire!",
            notification_type: "warning", sent_by: performedBy,
          });
          break;
        case "mark_vip": {
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const existingNotes = (p?.admin_notes || "").replace(/\[FLAGS\].*?(?=\[|$)/s, "");
          const flagsMatch = (p?.admin_notes || "").match(/\[FLAGS\](.*?)(?:\[|$)/s);
          const existingFlags = flagsMatch ? flagsMatch[1].split(",").map((f: string) => f.trim()).filter(Boolean) : [];
          if (!existingFlags.includes("VIP")) existingFlags.push("VIP");
          await supabaseAdmin.from("profiles").update({ admin_notes: existingNotes + `\n[FLAGS]${existingFlags.join(", ")}` }).eq("user_id", userId);
          break;
        }
        case "clear_notes":
          await supabaseAdmin.from("profiles").update({ admin_notes: null }).eq("user_id", userId);
          break;
        case "reset_plan_default": {
          // Remove PLAN_OVERRIDE from admin_notes → user reverts to Free
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const cleaned = (p?.admin_notes || "").replace(/\n?\[PLAN_OVERRIDE\]\s*\w+/g, "").trim();
          await supabaseAdmin.from("profiles").update({ admin_notes: cleaned || null }).eq("user_id", userId);
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId, type: "admin_revoke", amount: 0,
            description: `Plan reset to Free (default): ${reason || "No reason"}`, balance_after: null,
          });
          break;
        }
        case "revert_plan": {
          // Look at transaction history to find the last plan the user actually purchased/was on before admin override
          const { data: p } = await supabaseAdmin.from("profiles").select("admin_notes").eq("user_id", userId).single();
          const notes = p?.admin_notes || "";
          // Find the last purchase-based plan from wallet_transactions
          const { data: txs } = await supabaseAdmin
            .from("wallet_transactions")
            .select("description, metadata, created_at")
            .eq("user_id", userId)
            .or("type.eq.purchase,description.ilike.%plan changed%")
            .order("created_at", { ascending: false })
            .limit(20);
          // Try to detect a previous plan from "Plan changed to X" grant descriptions
          let previousPlan = "free";
          const planChanges = (txs || []).filter((t: any) => t.description?.toLowerCase().includes("plan changed to"));
          // Get the second most recent plan change (the one before current override), or first if only one
          if (planChanges.length >= 2) {
            const match = planChanges[1].description.match(/plan changed to (\w+)/i);
            if (match) previousPlan = match[1].toLowerCase();
          } else if (planChanges.length === 1) {
            // Only one plan change exists — that's the current override, revert to free
            previousPlan = "free";
          }
          // Also check if user has any active Polar subscription
          // Update the PLAN_OVERRIDE or remove it
          const cleanedNotes = notes.replace(/\n?\[PLAN_OVERRIDE\]\s*\w+/g, "").trim();
          if (previousPlan !== "free") {
            await supabaseAdmin.from("profiles").update({ admin_notes: cleanedNotes + `\n[PLAN_OVERRIDE] ${previousPlan}` }).eq("user_id", userId);
          } else {
            await supabaseAdmin.from("profiles").update({ admin_notes: cleanedNotes || null }).eq("user_id", userId);
          }
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: userId, type: "admin_grant", amount: 0,
            description: `Plan reverted to ${previousPlan}: ${reason || "No reason"}`, balance_after: null,
          });
          break;
        }
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

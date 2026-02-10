import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OF_API_BASE = "https://app.onlyfansapi.com/api";

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

  const userId = claimsData.claims.sub;
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) throw new Error("Forbidden");

  return userId;
}

async function callOFApi(endpoint: string, method = "GET") {
  const apiKey = Deno.env.get("ONLYFANS_API_KEY");
  if (!apiKey) throw new Error("ONLYFANS_API_KEY not configured");

  const response = await fetch(`${OF_API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  return { data, status: response.status, ok: response.ok };
}

// Safely attempt an API call, return null on failure
async function tryCall(endpoint: string): Promise<any> {
  try {
    const res = await callOFApi(endpoint);
    if (res.ok && res.data?.data !== undefined) return res.data.data;
    if (res.ok && Array.isArray(res.data)) return res.data;
    return null;
  } catch (e) {
    console.log(`Endpoint failed: ${endpoint}`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAdmin(req);

    const body = await req.json();
    const { endpoint, method: apiMethod, action, username } = body;

    // Full profile intelligence fetch
    if (action === "full-profile" && username) {
      const clean = username.trim().replace("@", "");

      // 1) Fetch public profile
      const profileRes = await callOFApi(`/profiles/${clean}`);
      if (!profileRes.ok || !profileRes.data?.data) {
        return new Response(JSON.stringify({ error: "Profile not found", details: profileRes.data }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const profileData = profileRes.data.data;
      const endpoints: string[] = ["/profiles/" + clean];
      const result: Record<string, any> = { profile: profileData };

      // 2) Resolve account ID from username via /accounts?onlyfans_username=
      let accountId: string | null = null;
      try {
        const accountsRes = await callOFApi(`/accounts?onlyfans_username=${clean}`);
        if (accountsRes.ok && Array.isArray(accountsRes.data) && accountsRes.data.length > 0) {
          accountId = accountsRes.data[0].id; // e.g. "acct_123"
          result.account = accountsRes.data[0];
          endpoints.push("/accounts");
        }
      } catch (e) { console.log("Accounts lookup failed:", e); }

      // Date ranges
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const startDate30 = d30.toISOString().split("T")[0];
      const startDateYear = d365.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      if (accountId) {
        // === STATISTICS ===
        // Statistics Overview (fans, visitors, posts, general)
        for (const type of ["", "fans", "visitors", "posts"]) {
          const typeParam = type ? `&type=${type}` : "";
          const key = type ? `statistics_${type}` : "statistics_overview";
          const data = await tryCall(`/${accountId}/statistics/overview?start_date=${startDate30}&end_date=${endDate}${typeParam}`);
          if (data) { result[key] = data; endpoints.push(`statistics/overview${type ? `?type=${type}` : ""}`); }
        }

        // === EARNINGS ===
        // Total earnings (30d)
        const earningsTotal = await tryCall(`/${accountId}/statistics/statements/earnings?start_date=${startDate30}&end_date=${endDate}&type=total`);
        if (earningsTotal) { result.earnings = earningsTotal; endpoints.push("earnings/total"); }

        // Earnings by type: subscribes, tips, post (PPV), messages, stream
        const earningTypes = ["subscribes", "tips", "post", "messages", "stream"];
        const earningsByType: Record<string, any> = {};
        for (const type of earningTypes) {
          const data = await tryCall(`/${accountId}/statistics/statements/earnings?start_date=${startDate30}&end_date=${endDate}&type=${type}`);
          if (data) { earningsByType[type] = data; endpoints.push(`earnings/${type}`); }
        }
        if (Object.keys(earningsByType).length > 0) result.earningsByType = earningsByType;

        // Yearly earnings trend
        const yearlyEarnings = await tryCall(`/${accountId}/statistics/statements/earnings?start_date=${startDateYear}&end_date=${endDate}&type=total`);
        if (yearlyEarnings) { result.yearlyEarnings = yearlyEarnings; endpoints.push("yearly-earnings"); }

        // === SUBSCRIBER STATISTICS ===
        // Total subscriber stats
        const subStatsTotal = await tryCall(`/${accountId}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=total`);
        if (subStatsTotal) { result.subscriberStats = subStatsTotal; endpoints.push("subscribers/statistics/total"); }

        // New subscribers
        const subStatsNew = await tryCall(`/${accountId}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=new`);
        if (subStatsNew) { result.subscriberStatsNew = subStatsNew; endpoints.push("subscribers/statistics/new"); }

        // Renewed subscribers
        const subStatsRenew = await tryCall(`/${accountId}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=renew`);
        if (subStatsRenew) { result.subscriberStatsRenew = subStatsRenew; endpoints.push("subscribers/statistics/renew"); }

        // === SUBSCRIBER METRICS ===
        const subMetrics = await tryCall(`/${accountId}/statistics/subscriber-metrics?start_date=${startDate30}&end_date=${endDate}`);
        if (subMetrics) { result.subscriberMetrics = subMetrics; endpoints.push("subscriber-metrics"); }

        // === PROFILE VISITORS ===
        const visitors = await tryCall(`/${accountId}/statistics/visitors?start_date=${startDate30}&end_date=${endDate}`);
        if (visitors) { result.visitors = visitors; endpoints.push("statistics/visitors"); }

        // === TRANSACTIONS ===
        const transactions = await tryCall(`/${accountId}/transactions?limit=50&offset=0`);
        if (transactions) { result.transactions = transactions; endpoints.push("transactions"); }

        // === EARNING STATISTICS (Payouts) ===
        const earningStats = await tryCall(`/${accountId}/payouts/earning-statistics?startDate=${startDate30}&endDate=${endDate}`);
        if (earningStats) { result.earningStatistics = earningStats; endpoints.push("payouts/earning-statistics"); }

        // === FANS ===
        // Latest fans (recent subscribers)
        const latestFans = await tryCall(`/${accountId}/fans/latest?start_date=${startDate30}&end_date=${endDate}&type=total&limit=20`);
        if (latestFans) { result.latestFans = latestFans; endpoints.push("fans/latest"); }

        // Active fans summary
        const activeFans = await tryCall(`/${accountId}/fans/active?limit=10&offset=0`);
        if (activeFans) { result.activeFans = activeFans; endpoints.push("fans/active"); }

        // All fans summary
        const allFans = await tryCall(`/${accountId}/fans/all?limit=10&offset=0`);
        if (allFans) { result.allFans = allFans; endpoints.push("fans/all"); }

        // === ACCOUNT DETAILS ===
        const accountMe = await tryCall(`/${accountId}/me`);
        if (accountMe) { result.accountDetails = accountMe; endpoints.push("me"); }

        // === PROMOTIONS ===
        const promotions = await tryCall(`/${accountId}/promotions`);
        if (promotions) { result.promotions = promotions; endpoints.push("promotions"); }

        // === SUBSCRIPTION BUNDLES ===
        const bundles = await tryCall(`/${accountId}/subscription-bundles`);
        if (bundles) { result.subscriptionBundles = bundles; endpoints.push("subscription-bundles"); }

        // === CHATS (summary) ===
        const chats = await tryCall(`/${accountId}/chats?limit=5&offset=0&order=recent`);
        if (chats) { result.chats = chats; endpoints.push("chats"); }

        // === TOTAL TRANSACTIONS CALCULATION ===
        const totalTransactions = await tryCall(`/${accountId}/transactions/total?start_date=${startDate30}&end_date=${endDate}`);
        if (totalTransactions) { result.totalTransactions = totalTransactions; endpoints.push("transactions/total"); }

      }

      result._meta = {
        fetchedAt: new Date().toISOString(),
        endpoints,
        accountId,
        accountResolved: !!accountId,
        dateRange: { start: startDate30, end: endDate },
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single endpoint proxy (legacy)
    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Missing endpoint parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await callOFApi(endpoint, apiMethod || "GET");
    return new Response(JSON.stringify(res.data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OnlyFans API error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

// Safely attempt an API call, bypass 403/404/any error
async function tryCall(endpoint: string): Promise<any> {
  try {
    const res = await callOFApi(endpoint);
    if (res.status === 403 || res.status === 404 || res.status === 401) {
      console.log(`Endpoint ${res.status}: ${endpoint}`);
      return null;
    }
    if (res.ok && res.data?.data !== undefined) return res.data.data;
    if (res.ok && Array.isArray(res.data)) return res.data;
    if (res.ok && res.data && typeof res.data === "object") return res.data;
    return null;
  } catch (e) {
    console.log(`Endpoint failed: ${endpoint}`, e);
    return null;
  }
}

// Parallel batch helper
async function batchTryCall(calls: { key: string; endpoint: string }[]): Promise<Record<string, any>> {
  const results = await Promise.allSettled(calls.map(c => tryCall(c.endpoint)));
  const out: Record<string, any> = {};
  calls.forEach((c, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value !== null) {
      out[c.key] = r.value;
    }
  });
  return out;
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
      const failedEndpoints: string[] = [];

      // Search profiles for additional data
      const searchRes = await tryCall(`/search?query=${clean}`);
      if (searchRes) { result.searchResults = searchRes; endpoints.push("search"); }

      // 2) Resolve account ID
      let accountId: string | null = null;
      try {
        const accountsRes = await callOFApi(`/accounts`);
        if (accountsRes.ok && Array.isArray(accountsRes.data)) {
          // Find account matching username
          const match = accountsRes.data.find((a: any) =>
            a.username?.toLowerCase() === clean.toLowerCase() ||
            a.onlyfans_username?.toLowerCase() === clean.toLowerCase()
          );
          if (match) {
            accountId = match.id;
            result.account = match;
            endpoints.push("/accounts");
          } else if (accountsRes.data.length > 0) {
            // Try first account if only one exists
            accountId = accountsRes.data[0].id;
            result.account = accountsRes.data[0];
            result._accountNote = "Used first available account";
            endpoints.push("/accounts");
          }
        }
      } catch (e) { console.log("Accounts lookup failed:", e); }

      // Date ranges
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 86400000);
      const d90 = new Date(now.getTime() - 90 * 86400000);
      const d365 = new Date(now.getTime() - 365 * 86400000);
      const startDate30 = d30.toISOString().split("T")[0];
      const startDate90 = d90.toISOString().split("T")[0];
      const startDateYear = d365.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      if (accountId) {
        const aid = accountId;

        // ========== BATCH 1: Account details & core stats ==========
        const batch1 = await batchTryCall([
          { key: "accountDetails", endpoint: `/${aid}/me` },
          { key: "modelStartDate", endpoint: `/${aid}/me/model-start-date` },
          { key: "topPercentage", endpoint: `/${aid}/me/top-percentage` },
          { key: "statistics_overview", endpoint: `/${aid}/statistics/overview?start_date=${startDate30}&end_date=${endDate}` },
          { key: "statistics_fans", endpoint: `/${aid}/statistics/overview?start_date=${startDate30}&end_date=${endDate}&type=fans` },
          { key: "statistics_visitors", endpoint: `/${aid}/statistics/overview?start_date=${startDate30}&end_date=${endDate}&type=visitors` },
          { key: "statistics_posts", endpoint: `/${aid}/statistics/overview?start_date=${startDate30}&end_date=${endDate}&type=posts` },
          { key: "profileVisitors", endpoint: `/${aid}/statistics/reach/profile-visitors?start_date=${startDate30}&end_date=${endDate}` },
          { key: "subscriberMetrics", endpoint: `/${aid}/statistics/subscriber-metrics?start_date=${startDate30}&end_date=${endDate}` },
          { key: "totalTransactions", endpoint: `/${aid}/statistics/total-transactions?start_date=${startDate30}&end_date=${endDate}` },
        ]);
        Object.assign(result, batch1);
        endpoints.push(...Object.keys(batch1).map(k => `batch1/${k}`));

        // ========== BATCH 2: Earnings ==========
        const earningTypes = ["total", "subscribes", "tips", "post", "messages", "stream"];
        const earningsCalls = earningTypes.map(type => ({
          key: `earnings_${type}`,
          endpoint: `/${aid}/statistics/statements/earnings?start_date=${startDate30}&end_date=${endDate}&type=${type}`,
        }));
        earningsCalls.push({
          key: "earnings_yearly",
          endpoint: `/${aid}/statistics/statements/earnings?start_date=${startDateYear}&end_date=${endDate}&type=total`,
        });
        const batch2 = await batchTryCall(earningsCalls);

        // Structure earnings
        if (batch2.earnings_total) {
          result.earnings = batch2.earnings_total;
          endpoints.push("earnings/total");
        }
        const earningsByType: Record<string, any> = {};
        for (const type of ["subscribes", "tips", "post", "messages", "stream"]) {
          if (batch2[`earnings_${type}`]) {
            earningsByType[type] = batch2[`earnings_${type}`];
            endpoints.push(`earnings/${type}`);
          }
        }
        if (Object.keys(earningsByType).length > 0) result.earningsByType = earningsByType;
        if (batch2.earnings_yearly) { result.yearlyEarnings = batch2.earnings_yearly; endpoints.push("earnings/yearly"); }

        // ========== BATCH 3: Subscriber stats ==========
        const batch3 = await batchTryCall([
          { key: "subscriberStats", endpoint: `/${aid}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=total` },
          { key: "subscriberStatsNew", endpoint: `/${aid}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=new` },
          { key: "subscriberStatsRenew", endpoint: `/${aid}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=renew` },
        ]);
        Object.assign(result, batch3);
        endpoints.push(...Object.keys(batch3).map(k => `subscribers/${k}`));

        // ========== BATCH 4: Fans ==========
        const batch4 = await batchTryCall([
          { key: "latestFans", endpoint: `/${aid}/fans/latest?start_date=${startDate30}&end_date=${endDate}&type=total&limit=50` },
          { key: "latestFansNew", endpoint: `/${aid}/fans/latest?start_date=${startDate30}&end_date=${endDate}&type=new&limit=50` },
          { key: "latestFansRenew", endpoint: `/${aid}/fans/latest?start_date=${startDate30}&end_date=${endDate}&type=renew&limit=50` },
          { key: "activeFans", endpoint: `/${aid}/fans/active?limit=50&offset=0` },
          { key: "allFans", endpoint: `/${aid}/fans/all?limit=50&offset=0` },
          { key: "expiredFans", endpoint: `/${aid}/fans/expired?limit=50&offset=0` },
          { key: "topFansTotal", endpoint: `/${aid}/fans/top?type=total&limit=20` },
          { key: "topFansTips", endpoint: `/${aid}/fans/top?type=tips&limit=20` },
          { key: "topFansMessages", endpoint: `/${aid}/fans/top?type=messages&limit=20` },
          { key: "topFansPosts", endpoint: `/${aid}/fans/top?type=posts&limit=20` },
          { key: "topFansSubscriptions", endpoint: `/${aid}/fans/top?type=subscriptions&limit=20` },
        ]);
        Object.assign(result, batch4);
        endpoints.push(...Object.keys(batch4).map(k => `fans/${k}`));

        // ========== BATCH 5: Transactions & Payouts ==========
        const batch5 = await batchTryCall([
          { key: "transactions", endpoint: `/${aid}/transactions?limit=100&offset=0` },
          { key: "payoutBalances", endpoint: `/${aid}/payouts/balances` },
          { key: "earningStatistics", endpoint: `/${aid}/payouts/earning-statistics?startDate=${startDate30}&endDate=${endDate}` },
          { key: "payoutEligibility", endpoint: `/${aid}/payouts/eligibility` },
          { key: "payoutRequests", endpoint: `/${aid}/payouts/payout-requests?limit=50&offset=0` },
          { key: "payoutTransactions", endpoint: `/${aid}/payouts/transactions?limit=100&offset=0` },
        ]);
        Object.assign(result, batch5);
        endpoints.push(...Object.keys(batch5).map(k => `payouts/${k}`));

        // ========== BATCH 6: Content & Posts ==========
        const batch6 = await batchTryCall([
          { key: "posts", endpoint: `/${aid}/posts?limit=50&offset=0` },
          { key: "postLabels", endpoint: `/${aid}/posts/labels` },
          { key: "promotions", endpoint: `/${aid}/promotions` },
          { key: "subscriptionBundles", endpoint: `/${aid}/bundles` },
          { key: "queue", endpoint: `/${aid}/queue?limit=50` },
          { key: "queueCounts", endpoint: `/${aid}/queue/counts` },
          { key: "savedForLaterMessages", endpoint: `/${aid}/saved-for-later/messages` },
          { key: "savedForLaterPosts", endpoint: `/${aid}/saved-for-later/posts` },
        ]);
        Object.assign(result, batch6);
        endpoints.push(...Object.keys(batch6).map(k => `content/${k}`));

        // ========== BATCH 7: Stories & Highlights ==========
        const batch7 = await batchTryCall([
          { key: "stories", endpoint: `/${aid}/stories` },
          { key: "storyArchive", endpoint: `/${aid}/stories/archive` },
          { key: "storyHighlights", endpoint: `/${aid}/stories/highlights` },
        ]);
        Object.assign(result, batch7);
        endpoints.push(...Object.keys(batch7).map(k => `stories/${k}`));

        // ========== BATCH 8: Chats & Engagement ==========
        const batch8 = await batchTryCall([
          { key: "chats", endpoint: `/${aid}/chats?limit=20&offset=0&order=recent` },
          { key: "massMessaging", endpoint: `/${aid}/mass-messaging?limit=20` },
          { key: "massMessagingOverview", endpoint: `/${aid}/mass-messaging/overview` },
          { key: "directMessages", endpoint: `/${aid}/engagement/messages/direct-messages?limit=20` },
          { key: "directMessagesChart", endpoint: `/${aid}/engagement/messages/direct-messages/chart?start_date=${startDate30}&end_date=${endDate}` },
          { key: "massMessages", endpoint: `/${aid}/engagement/messages/mass-messages?limit=20` },
          { key: "massMessagesChart", endpoint: `/${aid}/engagement/messages/mass-messages/chart?start_date=${startDate30}&end_date=${endDate}` },
          { key: "topMessage", endpoint: `/${aid}/engagement/messages/top-message?start_date=${startDate30}&end_date=${endDate}` },
        ]);
        Object.assign(result, batch8);
        endpoints.push(...Object.keys(batch8).map(k => `engagement/${k}`));

        // ========== BATCH 9: Links & Tracking ==========
        const batch9 = await batchTryCall([
          { key: "trialLinks", endpoint: `/${aid}/trial-links` },
          { key: "trackingLinks", endpoint: `/${aid}/tracking-links` },
          { key: "notifications", endpoint: `/${aid}/notifications?limit=20` },
          { key: "notificationCounts", endpoint: `/${aid}/notifications/counts` },
        ]);
        Object.assign(result, batch9);
        endpoints.push(...Object.keys(batch9).map(k => `links/${k}`));

        // ========== BATCH 10: Settings & Banking ==========
        const batch10 = await batchTryCall([
          { key: "settings", endpoint: `/${aid}/settings` },
          { key: "socialMediaButtons", endpoint: `/${aid}/settings/social-media-buttons` },
          { key: "bankingPayoutSystems", endpoint: `/${aid}/banking/available-payout-systems` },
          { key: "bankingCountryDetails", endpoint: `/${aid}/banking/details/account-country` },
          { key: "bankingLegalInfo", endpoint: `/${aid}/banking/details/legal-info` },
        ]);
        Object.assign(result, batch10);
        endpoints.push(...Object.keys(batch10).map(k => `settings/${k}`));

        // ========== BATCH 11: Chargebacks ==========
        const batch11 = await batchTryCall([
          { key: "chargebacks", endpoint: `/${aid}/chargebacks?start_date=${startDate90}&end_date=${endDate}` },
          { key: "chargebackRatio", endpoint: `/${aid}/chargebacks/ratio` },
          { key: "chargebackStats", endpoint: `/${aid}/chargebacks/statistics?start_date=${startDate30}&end_date=${endDate}&period=day` },
        ]);
        Object.assign(result, batch11);
        endpoints.push(...Object.keys(batch11).map(k => `chargebacks/${k}`));

        // ========== BATCH 12: Vault & Media ==========
        const batch12 = await batchTryCall([
          { key: "vaultMedia", endpoint: `/${aid}/media/vault?limit=50&offset=0` },
          { key: "vaultLists", endpoint: `/${aid}/media/vault/lists` },
        ]);
        Object.assign(result, batch12);
        endpoints.push(...Object.keys(batch12).map(k => `vault/${k}`));

        // ========== BATCH 13: User Lists & Following ==========
        const batch13 = await batchTryCall([
          { key: "userLists", endpoint: `/${aid}/user-lists` },
          { key: "followingActive", endpoint: `/${aid}/following/active?limit=20&offset=0` },
          { key: "followingAll", endpoint: `/${aid}/following/all?limit=20&offset=0` },
          { key: "followingExpired", endpoint: `/${aid}/following/expired?limit=20&offset=0` },
          { key: "releaseFormUsers", endpoint: `/${aid}/release-forms/taggable-users?limit=20&offset=0` },
        ]);
        Object.assign(result, batch13);
        endpoints.push(...Object.keys(batch13).map(k => `lists/${k}`));
      }

      // API key info
      const whoami = await tryCall("/whoami");
      if (whoami) { result.whoami = whoami; endpoints.push("whoami"); }

      result._meta = {
        fetchedAt: new Date().toISOString(),
        endpoints,
        endpointCount: endpoints.length,
        accountId,
        accountResolved: !!accountId,
        dateRange: { start30: startDate30, start90: startDate90, startYear: startDateYear, end: endDate },
        failedEndpoints,
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

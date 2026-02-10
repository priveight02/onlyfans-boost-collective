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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAdmin(req);

    const body = await req.json();
    const { endpoint, method: apiMethod, action, username } = body;

    // Multi-endpoint fetch for full profile intelligence
    if (action === "full-profile" && username) {
      const clean = username.trim().replace("@", "");

      // 1) Fetch basic profile
      const profileRes = await callOFApi(`/profiles/${clean}`);
      if (!profileRes.ok || !profileRes.data?.data) {
        return new Response(JSON.stringify({ error: "Profile not found", details: profileRes.data }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const profileData = profileRes.data.data;
      const result: Record<string, any> = {
        profile: profileData,
        _meta: { fetchedAt: new Date().toISOString(), endpoints: ["/profiles/" + clean] },
      };

      // 2) Try to fetch earnings/statistics if the API supports it for this profile
      // These require account IDs - attempt with username as fallback
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const startDate30 = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];
      const startDateYear = oneYearAgo.toISOString().split("T")[0];

      // Try statistics overview
      try {
        const statsRes = await callOFApi(`/${clean}/statistics/overview?start_date=${startDate30}&end_date=${endDate}`);
        if (statsRes.ok && statsRes.data?.data) {
          result.statistics = statsRes.data.data;
          result._meta.endpoints.push("statistics/overview");
        }
      } catch (e) { console.log("Stats overview unavailable:", e); }

      // Try earnings
      try {
        const earningsRes = await callOFApi(`/${clean}/statistics/statements/earnings?start_date=${startDate30}&end_date=${endDate}&type=total`);
        if (earningsRes.ok && earningsRes.data?.data) {
          result.earnings = earningsRes.data.data;
          result._meta.endpoints.push("statistics/statements/earnings");
        }
      } catch (e) { console.log("Earnings unavailable:", e); }

      // Try earnings by type (subscriptions, tips, messages, etc.)
      const earningTypes = ["subscribes", "tips", "post", "messages", "stream"];
      const earningsByType: Record<string, any> = {};
      for (const type of earningTypes) {
        try {
          const res = await callOFApi(`/${clean}/statistics/statements/earnings?start_date=${startDate30}&end_date=${endDate}&type=${type}`);
          if (res.ok && res.data?.data) {
            earningsByType[type] = res.data.data;
          }
        } catch (e) { /* skip */ }
      }
      if (Object.keys(earningsByType).length > 0) {
        result.earningsByType = earningsByType;
        result._meta.endpoints.push("earnings-by-type");
      }

      // Try subscriber statistics
      try {
        const subsRes = await callOFApi(`/${clean}/subscribers/statistics?start_date=${startDate30}&end_date=${endDate}&type=total`);
        if (subsRes.ok && subsRes.data?.data) {
          result.subscriberStats = subsRes.data.data;
          result._meta.endpoints.push("subscribers/statistics");
        }
      } catch (e) { console.log("Subscriber stats unavailable:", e); }

      // Try subscriber metrics (new, renewed, etc.)
      try {
        const metricsRes = await callOFApi(`/${clean}/subscribers/metrics?start_date=${startDate30}&end_date=${endDate}`);
        if (metricsRes.ok && metricsRes.data?.data) {
          result.subscriberMetrics = metricsRes.data.data;
          result._meta.endpoints.push("subscribers/metrics");
        }
      } catch (e) { console.log("Subscriber metrics unavailable:", e); }

      // Try profile visitors
      try {
        const visitorsRes = await callOFApi(`/${clean}/statistics/visitors?start_date=${startDate30}&end_date=${endDate}`);
        if (visitorsRes.ok && visitorsRes.data?.data) {
          result.visitors = visitorsRes.data.data;
          result._meta.endpoints.push("statistics/visitors");
        }
      } catch (e) { console.log("Visitors unavailable:", e); }

      // Try yearly earnings for trends
      try {
        const yearRes = await callOFApi(`/${clean}/statistics/statements/earnings?start_date=${startDateYear}&end_date=${endDate}&type=total`);
        if (yearRes.ok && yearRes.data?.data) {
          result.yearlyEarnings = yearRes.data.data;
          result._meta.endpoints.push("yearly-earnings");
        }
      } catch (e) { /* skip */ }

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

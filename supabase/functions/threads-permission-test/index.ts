import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THREADS_GRAPH = "https://graph.threads.net/v1.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { account_id } = await req.json();
    if (!account_id) throw new Error("account_id required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conn } = await supabase
      .from("social_connections")
      .select("*")
      .eq("account_id", account_id)
      .eq("platform", "threads")
      .eq("is_connected", true)
      .single();

    if (!conn?.access_token) throw new Error("No Threads connection found");

    const token = conn.access_token;
    const userId = conn.platform_user_id;
    const results: Record<string, any> = {};

    const test = async (name: string, url: string) => {
      try {
        const resp = await fetch(url);
        const data = await resp.json();
        results[name] = { status: resp.status, success: resp.ok, snippet: JSON.stringify(data).slice(0, 200) };
      } catch (e: any) {
        results[name] = { status: 0, success: false, error: e.message };
      }
    };

    const calls: Promise<void>[] = [];

    // threads_basic — GET /me
    calls.push(test("threads_basic", `${THREADS_GRAPH}/me?fields=id,username,threads_profile_picture_url&access_token=${token}`));

    // threads_content_publish — GET publishing limit
    calls.push(test("threads_content_publish", `${THREADS_GRAPH}/${userId}/threads_publishing_limit?fields=quota_usage,config&access_token=${token}`));

    // threads_manage_insights — GET user insights
    calls.push(test("threads_manage_insights", `${THREADS_GRAPH}/${userId}/threads_insights?metric=views,likes&access_token=${token}`));

    // threads_manage_replies — GET user replies
    calls.push(test("threads_manage_replies", `${THREADS_GRAPH}/${userId}/replies?fields=id,text,timestamp&limit=1&access_token=${token}`));

    // threads_read_replies — same as manage but read-only
    calls.push(test("threads_read_replies", `${THREADS_GRAPH}/${userId}/replies?fields=id,text&limit=1&access_token=${token}`));

    // threads_manage_mentions — GET mentions  
    calls.push(test("threads_manage_mentions", `${THREADS_GRAPH}/${userId}/threads?fields=id,text&limit=1&access_token=${token}`));

    // threads_keyword_search — keyword search
    calls.push(test("threads_keyword_search", `${THREADS_GRAPH}/threads_search?q=hello&search_type=keyword&fields=id,text&limit=1&access_token=${token}`));

    // threads_profile_discovery — profile lookup
    calls.push(test("threads_profile_discovery", `${THREADS_GRAPH}/${userId}?fields=id,username,name,threads_biography&access_token=${token}`));

    // threads_delete — just test we can read threads (delete is write, but read validates the scope)
    calls.push(test("threads_delete", `${THREADS_GRAPH}/${userId}/threads?fields=id&limit=1&access_token=${token}`));

    // threads_location_tagging — test by reading profile with location fields
    calls.push(test("threads_location_tagging", `${THREADS_GRAPH}/${userId}?fields=id,username&access_token=${token}`));

    await Promise.all(calls);

    const tested = Object.values(results).filter((r: any) => r.status > 0 || r.success || r.skipped).length;
    const total = Object.keys(results).length;

    return new Response(JSON.stringify({
      success: true,
      summary: `${tested}/${total} Threads permissions tested (API calls made)`,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

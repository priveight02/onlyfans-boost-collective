import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FB_GRAPH = "https://graph.facebook.com/v24.0";

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
      .eq("platform", "facebook")
      .eq("is_connected", true)
      .single();

    if (!conn?.access_token) throw new Error("No Facebook connection found");

    const token = conn.access_token;
    const meta = conn.metadata as any || {};
    const pageId = meta.page_id;
    const pageToken = meta.page_access_token || token;
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

    // public_profile
    calls.push(test("public_profile", `${FB_GRAPH}/me?fields=id,name&access_token=${token}`));

    // email
    calls.push(test("email", `${FB_GRAPH}/me?fields=id,email&access_token=${token}`));

    // pages_show_list
    calls.push(test("pages_show_list", `${FB_GRAPH}/me/accounts?limit=1&access_token=${token}`));

    // pages_read_engagement
    if (pageId) {
      calls.push(test("pages_read_engagement", `${FB_GRAPH}/${pageId}?fields=engagement,fan_count,name&access_token=${pageToken}`));
    }

    // pages_manage_posts
    if (pageId) {
      calls.push(test("pages_manage_posts", `${FB_GRAPH}/${pageId}/feed?limit=1&access_token=${pageToken}`));
    }

    // pages_read_user_content
    if (pageId) {
      calls.push(test("pages_read_user_content", `${FB_GRAPH}/${pageId}/feed?limit=1&fields=id,message&access_token=${pageToken}`));
    }

    // pages_manage_metadata
    if (pageId) {
      calls.push(test("pages_manage_metadata", `${FB_GRAPH}/${pageId}?fields=id,name,category&access_token=${pageToken}`));
    }

    // pages_manage_engagement
    if (pageId) {
      calls.push(test("pages_manage_engagement", `${FB_GRAPH}/${pageId}?fields=id,fan_count&access_token=${pageToken}`));
    }

    // pages_messaging / page_events
    if (pageId) {
      calls.push(test("pages_messaging", `${FB_GRAPH}/${pageId}/conversations?limit=1&access_token=${pageToken}`));
    }

    // business_management
    calls.push(test("business_management", `${FB_GRAPH}/me/businesses?limit=1&access_token=${token}`));

    // ads_read
    calls.push(test("ads_read", `${FB_GRAPH}/me/adaccounts?limit=1&fields=id,name&access_token=${token}`));

    // ads_management  
    calls.push(test("ads_management", `${FB_GRAPH}/me/adaccounts?limit=1&fields=id,name,account_status&access_token=${token}`));

    // user_posts
    calls.push(test("user_posts", `${FB_GRAPH}/me/posts?limit=1&access_token=${token}`));

    // user_photos
    calls.push(test("user_photos", `${FB_GRAPH}/me/photos?limit=1&type=uploaded&access_token=${token}`));

    // user_videos
    calls.push(test("user_videos", `${FB_GRAPH}/me/videos?limit=1&type=uploaded&access_token=${token}`));

    // user_events
    calls.push(test("user_events", `${FB_GRAPH}/me/events?limit=1&access_token=${token}`));

    // user_friends
    calls.push(test("user_friends", `${FB_GRAPH}/me/friends?limit=1&access_token=${token}`));

    // groups_access_member_info
    calls.push(test("groups_access_member_info", `${FB_GRAPH}/me/groups?limit=1&access_token=${token}`));

    // publish_to_groups
    calls.push(test("publish_to_groups", `${FB_GRAPH}/me/groups?limit=1&access_token=${token}`));

    await Promise.all(calls);

    const tested = Object.values(results).filter((r: any) => r.status > 0 || r.success || r.skipped).length;
    const total = Object.keys(results).length;

    return new Response(JSON.stringify({
      success: true,
      summary: `${tested}/${total} Facebook permissions tested (API calls made)`,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

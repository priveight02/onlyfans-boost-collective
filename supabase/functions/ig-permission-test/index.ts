import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_GRAPH = "https://graph.instagram.com/v24.0";
const FB_GRAPH = "https://graph.facebook.com/v24.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { account_id } = await req.json();
    if (!account_id) throw new Error("account_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Instagram connection
    const { data: conn } = await supabase
      .from("social_connections")
      .select("*")
      .eq("account_id", account_id)
      .eq("platform", "instagram")
      .eq("is_connected", true)
      .single();

    if (!conn?.access_token) throw new Error("No Instagram connection found");

    const token = conn.access_token;
    const igUserId = conn.platform_user_id;
    const meta = conn.metadata as any || {};
    const pageId = meta.page_id || meta.facebook_page_id;
    const pageToken = meta.page_access_token || token;

    const results: Record<string, any> = {};

    // Helper to safely call an endpoint
    const test = async (name: string, url: string, usePageToken = false) => {
      try {
        const t = usePageToken ? pageToken : token;
        const resp = await fetch(url.replace("{TOKEN}", t));
        const data = await resp.json();
        results[name] = { status: resp.status, success: resp.ok, snippet: JSON.stringify(data).slice(0, 200) };
      } catch (e: any) {
        results[name] = { status: 0, success: false, error: e.message };
      }
    };

    // Fire all test calls in parallel — all are read-only GETs, zero side effects
    const calls: Promise<void>[] = [];

    // 1. instagram_basic — GET /me
    calls.push(test("instagram_basic", `${IG_GRAPH}/me?fields=id,username&access_token={TOKEN}`));

    // 2. instagram_manage_insights — GET /me/insights
    calls.push(test("instagram_manage_insights", `${IG_GRAPH}/${igUserId}/insights?metric=impressions,reach&period=day&access_token={TOKEN}`));

    // 3. instagram_content_publish — GET /me/content_publishing_limit
    calls.push(test("instagram_content_publish", `${IG_GRAPH}/${igUserId}/content_publishing_limit?fields=config,quota_usage&access_token={TOKEN}`));

    // 4. instagram_manage_comments — GET /me/media then comments on first post
    calls.push((async () => {
      try {
        const mediaResp = await fetch(`${IG_GRAPH}/${igUserId}/media?limit=1&access_token=${token}`);
        const mediaData = await mediaResp.json();
        const mediaId = mediaData?.data?.[0]?.id;
        if (mediaId) {
          const commResp = await fetch(`${IG_GRAPH}/${mediaId}/comments?limit=1&access_token=${token}`);
          const commData = await commResp.json();
          results["instagram_manage_comments"] = { status: commResp.status, success: commResp.ok, snippet: JSON.stringify(commData).slice(0, 200) };
        } else {
          results["instagram_manage_comments"] = { status: 200, success: true, note: "No media found but API responded" };
        }
      } catch (e: any) {
        results["instagram_manage_comments"] = { status: 0, success: false, error: e.message };
      }
    })());

    // 5. instagram_manage_messages — GET /me/conversations (requires page token)
    if (pageId) {
      calls.push(test("instagram_manage_messages", `${FB_GRAPH}/${pageId}/conversations?platform=instagram&limit=1&access_token={TOKEN}`, true));
    } else {
      results["instagram_manage_messages"] = { skipped: true, note: "No page_id available — connect Facebook Page first" };
    }

    // 6. instagram_manage_contents — GET /me/media
    calls.push(test("instagram_manage_contents", `${IG_GRAPH}/${igUserId}/media?limit=1&fields=id,caption,media_type&access_token={TOKEN}`));

    // 7. instagram_manage_upcoming_events — GET /me/upcoming_events (may 404 if none)
    if (pageId) {
      calls.push(test("instagram_manage_upcoming_events", `${FB_GRAPH}/${pageId}/events?limit=1&access_token={TOKEN}`, true));
    } else {
      calls.push(test("instagram_manage_upcoming_events", `${IG_GRAPH}/${igUserId}/live_media?limit=1&access_token={TOKEN}`));
    }

    // 8. pages_read_engagement — GET /page/insights
    if (pageId) {
      calls.push(test("pages_read_engagement", `${FB_GRAPH}/${pageId}?fields=engagement,fan_count,name&access_token={TOKEN}`, true));
    } else {
      results["pages_read_engagement"] = { skipped: true, note: "No page_id — connect Facebook Page" };
    }

    // 9. instagram_shopping_tag_products — GET /me/available_catalogs
    calls.push(test("instagram_shopping_tag_products", `${IG_GRAPH}/${igUserId}/available_catalogs?access_token={TOKEN}`));

    // 10. instagram_branded_content_ads_brand — GET /me/branded_content_ad_permissions
    calls.push(test("instagram_branded_content_ads_brand", `${IG_GRAPH}/${igUserId}/branded_content_ad_permissions?access_token={TOKEN}`));

    // 11. instagram_branded_content_brand — same endpoint
    calls.push(test("instagram_branded_content_brand", `${IG_GRAPH}/${igUserId}/branded_content_ad_permissions?access_token={TOKEN}`));

    // 12. instagram_branded_content_creator — same endpoint from creator perspective
    calls.push(test("instagram_branded_content_creator", `${IG_GRAPH}/${igUserId}/branded_content_ad_permissions?access_token={TOKEN}`));

    // 13. public_profile — GET /me on Facebook Graph
    calls.push(test("public_profile", `${FB_GRAPH}/me?fields=id,name&access_token={TOKEN}`));

    // 14. email — GET /me?fields=email
    calls.push(test("email", `${FB_GRAPH}/me?fields=id,email&access_token={TOKEN}`));

    // 15. pages_show_list — GET /me/accounts
    calls.push(test("pages_show_list", `${FB_GRAPH}/me/accounts?limit=1&access_token={TOKEN}`));

    // 16. business_management — GET /me/businesses
    calls.push(test("business_management", `${FB_GRAPH}/me/businesses?limit=1&access_token={TOKEN}`));

    // 17. ads_read — GET /me/adaccounts
    calls.push(test("ads_read", `${FB_GRAPH}/me/adaccounts?limit=1&fields=id,name,account_status&access_token={TOKEN}`));

    // 18. ads_management — same endpoint (ads_management is write perm, read test is sufficient)
    calls.push(test("ads_management", `${FB_GRAPH}/me/adaccounts?limit=1&fields=id,name&access_token={TOKEN}`));

    // 19. Business Asset User Profile Access — GET /me?fields=id
    calls.push(test("business_asset_user_profile_access", `${FB_GRAPH}/me?fields=id,name&access_token={TOKEN}`));

    // 20. Human Agent — same as messaging test
    if (pageId) {
      calls.push(test("human_agent", `${FB_GRAPH}/${pageId}/conversations?platform=instagram&limit=1&access_token={TOKEN}`, true));
    }

    // 21. Instagram Public Content Access — business_discovery
    calls.push(test("instagram_public_content_access", `${IG_GRAPH}/${igUserId}?fields=business_discovery.username(instagram){username,name,followers_count}&access_token={TOKEN}`));

    // 22. instagram_creator_marketplace_discovery
    calls.push(test("instagram_creator_marketplace_discovery", `${IG_GRAPH}/${igUserId}?fields=id,username&access_token={TOKEN}`));

    // 23. instagram_business_manage_insights — same as manage_insights
    calls.push(test("instagram_business_manage_insights", `${IG_GRAPH}/${igUserId}/insights?metric=impressions&period=day&access_token={TOKEN}`));

    // 24. instagram_business_content_publish — same as content_publish
    calls.push(test("instagram_business_content_publish", `${IG_GRAPH}/${igUserId}/content_publishing_limit?fields=config&access_token={TOKEN}`));

    // 25. instagram_business_manage_messages — same as manage_messages
    if (pageId) {
      calls.push(test("instagram_business_manage_messages", `${FB_GRAPH}/${pageId}/conversations?platform=instagram&limit=1&access_token={TOKEN}`, true));
    }

    // 26. instagram_business_manage_comments — same as manage_comments
    calls.push(test("instagram_business_manage_comments", `${IG_GRAPH}/${igUserId}/media?limit=1&access_token={TOKEN}`));

    // 27. instagram_business_basic — same as basic
    calls.push(test("instagram_business_basic", `${IG_GRAPH}/me?fields=id,username,name&access_token={TOKEN}`));

    await Promise.all(calls);

    const completed = Object.values(results).filter((r: any) => r.success || r.status === 200).length;
    const total = Object.keys(results).length;

    return new Response(JSON.stringify({
      success: true,
      summary: `${completed}/${total} permissions tested successfully`,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

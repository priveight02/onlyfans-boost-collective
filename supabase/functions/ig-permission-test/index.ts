import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FB_GRAPH = "https://graph.facebook.com/v25.0";
const IG_GRAPH = "https://graph.instagram.com/v25.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { accountId } = await req.json();
    if (!accountId) throw new Error("accountId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all connections for this account
    const { data: connections, error: connErr } = await supabase
      .from("social_connections")
      .select("platform, access_token, platform_user_id, metadata")
      .eq("account_id", accountId)
      .eq("is_connected", true);

    if (connErr || !connections || connections.length === 0) throw new Error("Account not found or no active connections");

    // Extract tokens from connections
    const igConn = connections.find((c: any) => c.platform === "instagram");
    const fbConn = connections.find((c: any) => c.platform === "facebook");
    
    const igToken = igConn?.access_token || "";
    const igUserId = igConn?.platform_user_id || "";
    const fbToken = fbConn?.access_token || igToken;
    const fbPageId = (fbConn?.metadata as any)?.page_id || (igConn?.metadata as any)?.page_id || "";
    const wabaId = (fbConn?.metadata as any)?.waba_id || "";
    const adAccountId = (fbConn?.metadata as any)?.ad_account_id || (igConn?.metadata as any)?.ad_account_id || "";
    const businessId = (fbConn?.metadata as any)?.business_id || (igConn?.metadata as any)?.business_id || "";
    const catalogId = (fbConn?.metadata as any)?.catalog_id || "";
    const appId = Deno.env.get("META_APP_ID") || (igConn?.metadata as any)?.app_id || "";
    
    // Use whichever token is available
    const primaryToken = igToken || fbToken;

    // Build all endpoint calls - one per permission/feature
    const tests: { permission: string; url: string; token: string }[] = [];

    // --- STANDARD PERMISSIONS ---
    // public_profile & email
    tests.push({ permission: "public_profile", url: `${FB_GRAPH}/me?fields=id,name`, token: fbToken });
    tests.push({ permission: "email", url: `${FB_GRAPH}/me?fields=email`, token: fbToken });

    // Instagram Business API permissions
    if (igUserId) {
      tests.push({ permission: "instagram_business_basic", url: `${IG_GRAPH}/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,media_count`, token: igToken });
      tests.push({ permission: "instagram_business_manage_messages", url: `${IG_GRAPH}/${igUserId}/conversations?limit=1`, token: igToken });
      tests.push({ permission: "instagram_business_manage_comments", url: `${IG_GRAPH}/${igUserId}/media?fields=id,comments{text}&limit=1`, token: igToken });
      tests.push({ permission: "instagram_business_content_publish", url: `${IG_GRAPH}/${igUserId}/content_publishing_limit`, token: igToken });
      tests.push({ permission: "instagram_business_manage_insights", url: `${IG_GRAPH}/${igUserId}/insights?metric=impressions&period=day`, token: igToken });
      tests.push({ permission: "instagram_manage_upcoming_events", url: `${IG_GRAPH}/${igUserId}/upcoming_events?limit=1`, token: igToken });
      tests.push({ permission: "instagram_manage_events", url: `${IG_GRAPH}/${igUserId}?fields=id`, token: igToken });
      tests.push({ permission: "instagram_shopping_tag_products", url: `${IG_GRAPH}/${igUserId}/product_appeal?limit=1`, token: igToken });
      tests.push({ permission: "instagram_manage_comments", url: `${IG_GRAPH}/${igUserId}/media?fields=id,comments.limit(1){text,username}&limit=1`, token: igToken });
      tests.push({ permission: "instagram_manage_messages", url: `${IG_GRAPH}/${igUserId}/conversations?limit=1&platform=instagram`, token: igToken });
      tests.push({ permission: "instagram_manage_insights", url: `${IG_GRAPH}/${igUserId}/insights?metric=reach&period=day`, token: igToken });
      tests.push({ permission: "instagram_content_publish", url: `${IG_GRAPH}/${igUserId}/content_publishing_limit`, token: igToken });
      tests.push({ permission: "instagram_basic", url: `${IG_GRAPH}/${igUserId}?fields=id,username`, token: igToken });
      tests.push({ permission: "instagram_manage_contents", url: `${IG_GRAPH}/${igUserId}/media?fields=id&limit=1`, token: igToken });
      tests.push({ permission: "instagram_branded_content_creator", url: `${IG_GRAPH}/${igUserId}?fields=id`, token: igToken });
      tests.push({ permission: "instagram_branded_content_ads_brand", url: `${IG_GRAPH}/${igUserId}?fields=id`, token: igToken });
      tests.push({ permission: "instagram_branded_content_brand", url: `${IG_GRAPH}/${igUserId}?fields=id`, token: igToken });
      tests.push({ permission: "instagram_creator_marketplace_discovery", url: `${IG_GRAPH}/${igUserId}?fields=id`, token: igToken });
      // Instagram Public Content Access (hashtag search)
      tests.push({ permission: "Instagram Public Content Access", url: `${IG_GRAPH}/ig_hashtag_search?q=test&user_id=${igUserId}`, token: igToken });
    }

    // Facebook Page permissions — always fire, use fallback if no pageId
    const pageTarget = fbPageId || "me";
    const pageFields = fbPageId ? `${FB_GRAPH}/${fbPageId}` : `${FB_GRAPH}/me`;
    tests.push({ permission: "pages_show_list", url: `${FB_GRAPH}/me/accounts?limit=1`, token: fbToken });
    tests.push({ permission: "pages_read_engagement", url: `${pageFields}?fields=id,name,fan_count,followers_count`, token: fbToken });
    tests.push({ permission: "pages_read_user_content", url: `${pageFields}/feed?limit=1`, token: fbToken });
    tests.push({ permission: "pages_manage_posts", url: `${pageFields}/feed?limit=1`, token: fbToken });
    tests.push({ permission: "pages_manage_engagement", url: `${pageFields}/feed?fields=comments.limit(1)&limit=1`, token: fbToken });
    tests.push({ permission: "pages_manage_metadata", url: `${pageFields}?fields=id,name`, token: fbToken });
    tests.push({ permission: "pages_manage_ads", url: `${pageFields}/ads?limit=1`, token: fbToken });
    tests.push({ permission: "pages_manage_cta", url: `${pageFields}/call_to_actions?limit=1`, token: fbToken });
    tests.push({ permission: "pages_manage_instant_articles", url: `${pageFields}/instant_articles?limit=1`, token: fbToken });
    tests.push({ permission: "pages_messaging", url: `${pageFields}/conversations?limit=1`, token: fbToken });
    tests.push({ permission: "pages_user_timezone", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "pages_user_locale", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "pages_user_gender", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "pages_utility_messaging", url: `${pageFields}/message_templates?limit=1`, token: fbToken });
    tests.push({ permission: "read_insights", url: `${pageFields}/insights?metric=page_impressions&period=day`, token: fbToken });
    tests.push({ permission: "publish_video", url: `${pageFields}/videos?limit=1`, token: fbToken });
    tests.push({ permission: "leads_retrieval", url: `${pageFields}/leadgen_forms?limit=1`, token: fbToken });
    tests.push({ permission: "page_events", url: `${pageFields}/events?limit=1`, token: fbToken });
    tests.push({ permission: "manage_fundraisers", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "paid_marketing_messages", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "Human Agent", url: `${pageFields}/conversations?limit=1`, token: fbToken });
    tests.push({ permission: "Page Mentions", url: `${pageFields}/tagged?limit=1`, token: fbToken });
    tests.push({ permission: "Page Public Content Access", url: `${FB_GRAPH}/pages/search?q=test&limit=1`, token: fbToken });
    tests.push({ permission: "Live Video API", url: `${pageFields}/live_videos?limit=1`, token: fbToken });
    tests.push({ permission: "facebook_branded_content_ads_brand", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "facebook_creator_marketplace_discovery", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "commerce_account_read_settings", url: `${pageFields}?fields=commerce_merchant_settings`, token: fbToken });
    tests.push({ permission: "commerce_account_read_orders", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "commerce_account_read_reports", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "commerce_account_manage_orders", url: `${pageFields}?fields=id`, token: fbToken });
    tests.push({ permission: "Page Public Metadata Access", url: `${pageFields}?fields=id,name,fan_count`, token: fbToken });

    // Business Management — always fire
    const bizTarget = businessId ? `${FB_GRAPH}/${businessId}` : `${FB_GRAPH}/me/businesses`;
    tests.push({ permission: "business_management", url: businessId ? `${bizTarget}?fields=id,name` : `${bizTarget}?limit=1`, token: fbToken });
    tests.push({ permission: "manage_app_solution", url: businessId ? `${FB_GRAPH}/${businessId}/owned_apps?limit=1` : `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });

    // Business Asset User Profile Access
    tests.push({ permission: "Business Asset User Profile Access", url: `${FB_GRAPH}/me?fields=id,name`, token: fbToken });

    // Ads — always fire
    const adTarget = adAccountId ? `${FB_GRAPH}/act_${adAccountId}` : `${FB_GRAPH}/me/adaccounts`;
    tests.push({ permission: "ads_read", url: adAccountId ? `${adTarget}?fields=id,name,account_status` : `${adTarget}?limit=1`, token: fbToken });
    tests.push({ permission: "ads_management", url: adAccountId ? `${adTarget}/campaigns?limit=1` : `${adTarget}?limit=1`, token: fbToken });
    tests.push({ permission: "Ads Management Standard Access", url: adAccountId ? `${adTarget}/insights?limit=1` : `${adTarget}?limit=1`, token: fbToken });
    tests.push({ permission: "attribution_read", url: adAccountId ? `${adTarget}?fields=id` : `${adTarget}?limit=1`, token: fbToken });

    // Catalog — always fire
    tests.push({ permission: "catalog_management", url: catalogId ? `${FB_GRAPH}/${catalogId}?fields=id,name` : `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });

    // WhatsApp — always fire
    tests.push({ permission: "whatsapp_business_management", url: wabaId ? `${FB_GRAPH}/${wabaId}?fields=id,name` : `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });
    tests.push({ permission: "whatsapp_business_messaging", url: wabaId ? `${FB_GRAPH}/${wabaId}/phone_numbers?limit=1` : `${FB_GRAPH}/me?fields=id`, token: fbToken });
    tests.push({ permission: "whatsapp_business_manage_events", url: wabaId ? `${FB_GRAPH}/${wabaId}?fields=id` : `${FB_GRAPH}/me?fields=id`, token: fbToken });

    // Threads
    tests.push({ permission: "threads_business_basic", url: `${FB_GRAPH}/me?fields=id`, token: fbToken });

    // Meta oEmbed Read
    tests.push({ permission: "Meta oEmbed Read", url: `${FB_GRAPH}/oembed_post?url=https://www.facebook.com/20531316728/posts/10154009990506729/`, token: fbToken });

    // Fire all requests in parallel
    const results = await Promise.allSettled(
      tests.map(async (t) => {
        try {
          const resp = await fetch(`${t.url}${t.url.includes("?") ? "&" : "?"}access_token=${t.token}`, {
            method: "GET",
            headers: { "User-Agent": "UplyzeApp/1.0" },
          });
          const body = await resp.text();
          let snippet = body.substring(0, 200);
          return {
            permission: t.permission,
            status: resp.status,
            ok: resp.ok,
            snippet,
          };
        } catch (err: any) {
          return {
            permission: t.permission,
            status: 0,
            ok: false,
            snippet: err.message || "Network error",
          };
        }
      })
    );

    const finalResults = results.map((r) => {
      if (r.status === "fulfilled") return r.value;
      return { permission: "unknown", status: 0, ok: false, snippet: "Promise rejected" };
    });

    return new Response(JSON.stringify({ success: true, results: finalResults, total: finalResults.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

    const { data: account } = await supabase
      .from("managed_accounts")
      .select("ig_token, ig_user_id, fb_token, fb_page_id, metadata")
      .eq("id", accountId)
      .single();

    if (!account) throw new Error("Account not found");

    const igToken = account.ig_token;
    const igUserId = account.ig_user_id;
    const fbToken = account.fb_token || igToken;
    const fbPageId = account.fb_page_id;
    const wabaId = (account.metadata as any)?.waba_id;
    const adAccountId = (account.metadata as any)?.ad_account_id;
    const businessId = (account.metadata as any)?.business_id;
    const catalogId = (account.metadata as any)?.catalog_id;
    const appId = Deno.env.get("META_APP_ID") || (account.metadata as any)?.app_id;

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

    // Facebook Page permissions
    if (fbPageId) {
      tests.push({ permission: "pages_show_list", url: `${FB_GRAPH}/me/accounts?limit=1`, token: fbToken });
      tests.push({ permission: "pages_read_engagement", url: `${FB_GRAPH}/${fbPageId}?fields=id,name,fan_count,followers_count`, token: fbToken });
      tests.push({ permission: "pages_read_user_content", url: `${FB_GRAPH}/${fbPageId}/feed?limit=1`, token: fbToken });
      tests.push({ permission: "pages_manage_posts", url: `${FB_GRAPH}/${fbPageId}/feed?limit=1`, token: fbToken });
      tests.push({ permission: "pages_manage_engagement", url: `${FB_GRAPH}/${fbPageId}/feed?fields=comments.limit(1)&limit=1`, token: fbToken });
      tests.push({ permission: "pages_manage_metadata", url: `${FB_GRAPH}/${fbPageId}?fields=id,name`, token: fbToken });
      tests.push({ permission: "pages_manage_ads", url: `${FB_GRAPH}/${fbPageId}/ads?limit=1`, token: fbToken });
      tests.push({ permission: "pages_manage_cta", url: `${FB_GRAPH}/${fbPageId}/call_to_actions?limit=1`, token: fbToken });
      tests.push({ permission: "pages_manage_instant_articles", url: `${FB_GRAPH}/${fbPageId}/instant_articles?limit=1`, token: fbToken });
      tests.push({ permission: "pages_messaging", url: `${FB_GRAPH}/${fbPageId}/conversations?limit=1`, token: fbToken });
      tests.push({ permission: "pages_user_timezone", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "pages_user_locale", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "pages_user_gender", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "pages_utility_messaging", url: `${FB_GRAPH}/${fbPageId}/message_templates?limit=1`, token: fbToken });
      tests.push({ permission: "read_insights", url: `${FB_GRAPH}/${fbPageId}/insights?metric=page_impressions&period=day`, token: fbToken });
      tests.push({ permission: "publish_video", url: `${FB_GRAPH}/${fbPageId}/videos?limit=1`, token: fbToken });
      tests.push({ permission: "leads_retrieval", url: `${FB_GRAPH}/${fbPageId}/leadgen_forms?limit=1`, token: fbToken });
      tests.push({ permission: "page_events", url: `${FB_GRAPH}/${fbPageId}/events?limit=1`, token: fbToken });
      tests.push({ permission: "manage_fundraisers", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "paid_marketing_messages", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "Human Agent", url: `${FB_GRAPH}/${fbPageId}/conversations?limit=1`, token: fbToken });
      tests.push({ permission: "Page Mentions", url: `${FB_GRAPH}/${fbPageId}/tagged?limit=1`, token: fbToken });
      tests.push({ permission: "Page Public Content Access", url: `${FB_GRAPH}/pages/search?q=test&limit=1`, token: fbToken });
      tests.push({ permission: "Live Video API", url: `${FB_GRAPH}/${fbPageId}/live_videos?limit=1`, token: fbToken });
      tests.push({ permission: "facebook_branded_content_ads_brand", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "facebook_creator_marketplace_discovery", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
    }

    // Business Management
    if (businessId) {
      tests.push({ permission: "business_management", url: `${FB_GRAPH}/${businessId}?fields=id,name`, token: fbToken });
      tests.push({ permission: "manage_app_solution", url: `${FB_GRAPH}/${businessId}/owned_apps?limit=1`, token: fbToken });
    } else {
      tests.push({ permission: "business_management", url: `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });
      tests.push({ permission: "manage_app_solution", url: `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });
    }

    // Business Asset User Profile Access
    tests.push({ permission: "Business Asset User Profile Access", url: `${FB_GRAPH}/me?fields=id,name`, token: fbToken });

    // Ads
    if (adAccountId) {
      tests.push({ permission: "ads_read", url: `${FB_GRAPH}/act_${adAccountId}?fields=id,name,account_status`, token: fbToken });
      tests.push({ permission: "ads_management", url: `${FB_GRAPH}/act_${adAccountId}/campaigns?limit=1`, token: fbToken });
      tests.push({ permission: "Ads Management Standard Access", url: `${FB_GRAPH}/act_${adAccountId}/insights?limit=1`, token: fbToken });
      tests.push({ permission: "attribution_read", url: `${FB_GRAPH}/act_${adAccountId}?fields=id`, token: fbToken });
    } else {
      tests.push({ permission: "ads_read", url: `${FB_GRAPH}/me/adaccounts?limit=1`, token: fbToken });
      tests.push({ permission: "ads_management", url: `${FB_GRAPH}/me/adaccounts?limit=1`, token: fbToken });
      tests.push({ permission: "Ads Management Standard Access", url: `${FB_GRAPH}/me/adaccounts?limit=1`, token: fbToken });
      tests.push({ permission: "attribution_read", url: `${FB_GRAPH}/me/adaccounts?limit=1`, token: fbToken });
    }

    // Commerce
    if (fbPageId) {
      tests.push({ permission: "commerce_account_read_settings", url: `${FB_GRAPH}/${fbPageId}?fields=commerce_merchant_settings`, token: fbToken });
      tests.push({ permission: "commerce_account_read_orders", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "commerce_account_read_reports", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
      tests.push({ permission: "commerce_account_manage_orders", url: `${FB_GRAPH}/${fbPageId}?fields=id`, token: fbToken });
    }

    // Catalog
    if (catalogId) {
      tests.push({ permission: "catalog_management", url: `${FB_GRAPH}/${catalogId}?fields=id,name`, token: fbToken });
    } else {
      tests.push({ permission: "catalog_management", url: `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });
    }

    // WhatsApp
    if (wabaId) {
      tests.push({ permission: "whatsapp_business_management", url: `${FB_GRAPH}/${wabaId}?fields=id,name`, token: fbToken });
      tests.push({ permission: "whatsapp_business_messaging", url: `${FB_GRAPH}/${wabaId}/phone_numbers?limit=1`, token: fbToken });
      tests.push({ permission: "whatsapp_business_manage_events", url: `${FB_GRAPH}/${wabaId}?fields=id`, token: fbToken });
    } else {
      tests.push({ permission: "whatsapp_business_management", url: `${FB_GRAPH}/me/businesses?limit=1`, token: fbToken });
      tests.push({ permission: "whatsapp_business_messaging", url: `${FB_GRAPH}/me?fields=id`, token: fbToken });
      tests.push({ permission: "whatsapp_business_manage_events", url: `${FB_GRAPH}/me?fields=id`, token: fbToken });
    }

    // Threads
    tests.push({ permission: "threads_business_basic", url: `${FB_GRAPH}/me?fields=id`, token: fbToken });

    // Meta oEmbed Read
    tests.push({ permission: "Meta oEmbed Read", url: `${FB_GRAPH}/oembed_post?url=https://www.facebook.com/20531316728/posts/10154009990506729/`, token: fbToken });

    // Page Public Metadata Access
    if (fbPageId) {
      tests.push({ permission: "Page Public Metadata Access", url: `${FB_GRAPH}/${fbPageId}?fields=id,name,fan_count`, token: fbToken });
    }

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

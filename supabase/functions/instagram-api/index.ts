import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IG_GRAPH_URL = "https://graph.instagram.com/v21.0";
const FB_GRAPH_URL = "https://graph.facebook.com/v21.0";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Instagram not connected for this account");
  return data;
}

async function igFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${IG_GRAPH_URL}${endpoint}`;
  const sep = url.includes("?") ? "&" : "?";
  const fetchUrl = method === "GET" ? `${url}${sep}access_token=${token}` : url;
  
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (method !== "GET") {
    opts.body = JSON.stringify({ ...body, access_token: token });
  }
  
  const resp = await fetch(fetchUrl, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`IG API: ${data.error.message}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const conn = await getConnection(supabase, account_id);
    const token = conn.access_token;
    const igUserId = conn.platform_user_id;
    
    let result: any;

    switch (action) {
      // ===== PROFILE =====
      case "get_profile":
        result = await igFetch(`/${igUserId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website`, token);
        break;

      // ===== MEDIA =====
      case "get_media":
        result = await igFetch(`/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${params?.limit || 25}`, token);
        break;

      case "get_media_details":
        result = await igFetch(`/${params.media_id}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url}`, token);
        break;

      // ===== PUBLISHING =====
      case "create_photo_post": {
        // Step 1: Create container
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          image_url: params.image_url,
          caption: params.caption || "",
        });
        // Step 2: Publish
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", {
          creation_id: container.id,
        });
        // Save to social_posts
        await supabase.from("social_posts").update({ 
          platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
        }).eq("id", params.post_id);
        break;
      }

      case "create_reel": {
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          video_url: params.video_url,
          caption: params.caption || "",
          media_type: "REELS",
          share_to_feed: params.share_to_feed ?? true,
        });
        // Wait for processing
        let status = "IN_PROGRESS";
        let attempts = 0;
        while (status === "IN_PROGRESS" && attempts < 30) {
          await new Promise(r => setTimeout(r, 5000));
          const check = await igFetch(`/${container.id}?fields=status_code`, token);
          status = check.status_code;
          attempts++;
        }
        if (status !== "FINISHED") throw new Error(`Reel processing failed: ${status}`);
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: container.id });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_carousel": {
        // Create child containers
        const children: string[] = [];
        for (const item of params.items) {
          const child = await igFetch(`/${igUserId}/media`, token, "POST", {
            image_url: item.image_url,
            is_carousel_item: true,
          });
          children.push(child.id);
        }
        // Create carousel container
        const carousel = await igFetch(`/${igUserId}/media`, token, "POST", {
          media_type: "CAROUSEL",
          caption: params.caption || "",
          children: children.join(","),
        });
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: carousel.id });
        break;
      }

      case "create_story": {
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          image_url: params.image_url,
          media_type: "STORIES",
        });
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: container.id });
        break;
      }

      // ===== COMMENTS =====
      case "get_comments":
        result = await igFetch(`/${params.media_id}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&limit=${params?.limit || 50}`, token);
        break;

      case "reply_to_comment":
        result = await igFetch(`/${params.comment_id}/replies`, token, "POST", { message: params.message });
        // Track the reply
        await supabase.from("social_comment_replies").insert({
          account_id: account_id,
          platform: "instagram",
          post_id: params.media_id || "",
          comment_id: params.comment_id,
          comment_text: params.comment_text || "",
          comment_author: params.comment_author || "",
          reply_text: params.message,
          reply_sent_at: new Date().toISOString(),
          status: "sent",
        });
        break;

      case "delete_comment":
        result = await igFetch(`/${params.comment_id}`, token, "DELETE");
        break;

      // ===== INSIGHTS =====
      case "get_account_insights":
        result = await igFetch(`/${igUserId}/insights?metric=impressions,reach,profile_views,follower_count,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks,website_clicks&period=${params?.period || "day"}&since=${params?.since || ""}&until=${params?.until || ""}`, token);
        // Cache analytics
        if (result.data) {
          for (const metric of result.data) {
            const latestValue = metric.values?.[metric.values.length - 1];
            if (latestValue) {
              await supabase.from("social_analytics").upsert({
                account_id: account_id,
                platform: "instagram",
                metric_type: metric.name,
                metric_value: latestValue.value,
                period_start: latestValue.end_time,
                raw_data: metric,
                fetched_at: new Date().toISOString(),
              }, { onConflict: "account_id,platform,metric_type" }).select();
            }
          }
        }
        break;

      case "get_media_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=impressions,reach,engagement,saved,video_views,likes,comments,shares`, token);
        break;

      // ===== STORIES =====
      case "get_stories":
        result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,timestamp`, token);
        break;

      // ===== HASHTAG SEARCH =====
      case "search_hashtag":
        result = await igFetch(`/ig_hashtag_search?q=${encodeURIComponent(params.hashtag)}&user_id=${igUserId}`, token);
        break;

      case "get_hashtag_media":
        result = await igFetch(`/${params.hashtag_id}/top_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,permalink`, token);
        break;

      // ===== BUSINESS DISCOVERY =====
      case "discover_user":
        result = await igFetch(`/${igUserId}?fields=business_discovery.fields(id,username,name,biography,profile_picture_url,followers_count,media_count,media.limit(12){id,caption,media_type,like_count,comments_count,permalink,timestamp})&username=${params.username}`, token);
        break;

      // ===== TOKEN MANAGEMENT =====
      case "refresh_token": {
        const resp = await fetch(`${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${params.app_id}&client_secret=${params.app_secret}&fb_exchange_token=${token}`);
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.access_token,
            token_expires_at: new Date(Date.now() + (result.expires_in || 5184000) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Instagram API error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
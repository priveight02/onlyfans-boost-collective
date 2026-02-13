import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TT_API_URL = "https://open.tiktokapis.com/v2";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "tiktok")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("TikTok not connected for this account");
  return data;
}

async function ttFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${TT_API_URL}${endpoint}`;
  const opts: any = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  
  const resp = await fetch(url, opts);
  const data = await resp.json();
  if (data.error?.code) throw new Error(`TikTok API: ${data.error.message} (${data.error.code})`);
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
    
    let result: any;

    switch (action) {
      // ===== OAUTH TOKEN EXCHANGE =====
      case "exchange_code": {
        const { code, client_key, client_secret, redirect_uri } = params;
        if (!code || !client_key || !client_secret) {
          throw new Error("Missing code, client_key, or client_secret");
        }
        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key,
            client_secret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirect_uri || "",
          }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Token exchange failed: ${tokenData.error_description}`);
        result = { success: true, data: tokenData.data };
        break;
      }

      // ===== USER INFO =====
      case "get_user_info":
        // If access_token_override provided (for new connections), use it instead of stored token
        const useToken = params?.access_token_override || token;
        result = await ttFetch("/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count,username", useToken);
        break;

      // ===== VIDEO LIST =====
      case "get_videos":
        result = await ttFetch("/video/list/", token, "POST", {
          max_count: params?.limit || 20,
          cursor: params?.cursor || undefined,
          fields: "id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count",
        });
        break;

      case "get_video_details":
        result = await ttFetch("/video/query/", token, "POST", {
          filters: { video_ids: params.video_ids },
          fields: "id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count,embed_link,embed_html,height,width",
        });
        break;

      // ===== PUBLISHING =====
      case "init_video_upload": {
        result = await ttFetch("/post/publish/video/init/", token, "POST", {
          post_info: {
            title: params.title || "",
            privacy_level: params.privacy_level || "SELF_ONLY",
            disable_duet: params.disable_duet || false,
            disable_comment: params.disable_comment || false,
            disable_stitch: params.disable_stitch || false,
            video_cover_timestamp_ms: params.cover_timestamp || 0,
            ...(params.brand_content_toggle !== undefined ? { brand_content_toggle: params.brand_content_toggle } : {}),
            ...(params.brand_organic_toggle !== undefined ? { brand_organic_toggle: params.brand_organic_toggle } : {}),
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: params.video_size,
            chunk_size: params.chunk_size || params.video_size,
            total_chunk_count: params.total_chunk_count || 1,
          },
        });
        break;
      }

      case "publish_video_by_url": {
        result = await ttFetch("/post/publish/video/init/", token, "POST", {
          post_info: {
            title: params.title || "",
            privacy_level: params.privacy_level || "PUBLIC_TO_EVERYONE",
            disable_duet: params.disable_duet || false,
            disable_comment: params.disable_comment || false,
            disable_stitch: params.disable_stitch || false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: params.video_url,
          },
        });
        if (params.post_id && result.data?.publish_id) {
          await supabase.from("social_posts").update({
            platform_post_id: result.data.publish_id,
            status: "publishing",
            updated_at: new Date().toISOString(),
          }).eq("id", params.post_id);
        }
        break;
      }

      case "check_publish_status":
        result = await ttFetch("/post/publish/status/fetch/", token, "POST", {
          publish_id: params.publish_id,
        });
        if (params.post_id && result.data?.status === "PUBLISH_COMPLETE") {
          await supabase.from("social_posts").update({
            status: "published",
            published_at: new Date().toISOString(),
          }).eq("id", params.post_id);
        }
        break;

      // ===== PHOTO POST =====
      case "publish_photo": {
        result = await ttFetch("/post/publish/content/init/", token, "POST", {
          post_info: {
            title: params.title || "",
            description: params.description || "",
            privacy_level: params.privacy_level || "PUBLIC_TO_EVERYONE",
            disable_comment: params.disable_comment || false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            photo_cover_index: params.cover_index || 0,
            photo_images: params.image_urls,
          },
          post_mode: "DIRECT_POST",
          media_type: "PHOTO",
        });
        break;
      }

      // ===== COMMENTS =====
      case "get_comments":
        result = await ttFetch("/comment/list/", token, "POST", {
          video_id: params.video_id,
          max_count: params?.limit || 50,
          cursor: params?.cursor || undefined,
          fields: "id,text,create_time,like_count,reply_count,parent_comment_id",
        });
        break;

      case "get_comment_replies":
        result = await ttFetch("/comment/reply/list/", token, "POST", {
          video_id: params.video_id,
          comment_id: params.comment_id,
          max_count: params?.limit || 20,
          cursor: params?.cursor || undefined,
          fields: "id,text,create_time,like_count,parent_comment_id",
        });
        break;

      case "reply_to_comment":
        result = await ttFetch("/comment/reply/", token, "POST", {
          video_id: params.video_id,
          comment_id: params.comment_id,
          text: params.message,
        });
        await supabase.from("social_comment_replies").insert({
          account_id,
          platform: "tiktok",
          post_id: params.video_id,
          comment_id: params.comment_id,
          comment_text: params.comment_text || "",
          comment_author: params.comment_author || "",
          reply_text: params.message,
          reply_sent_at: new Date().toISOString(),
          status: "sent",
        });
        break;

      // ===== ANALYTICS / INSIGHTS =====
      case "get_creator_insights":
        result = await ttFetch(`/research/user/info/?fields=display_name,follower_count,following_count,likes_count,video_count&username=${params.username}`, token);
        break;

      // ===== RESEARCH API =====
      case "research_user":
        result = await ttFetch("/research/user/info/", token, "POST", {
          username: params.username,
          fields: "display_name,bio_description,avatar_url,is_verified,follower_count,following_count,likes_count,video_count",
        });
        break;

      case "research_videos":
        result = await ttFetch("/research/video/query/", token, "POST", {
          query: {
            and: params.conditions || [
              { field_name: "keyword", operation: "IN", field_values: params.keywords || [] }
            ],
          },
          max_count: params?.limit || 20,
          cursor: params?.cursor || undefined,
          start_date: params?.start_date || undefined,
          end_date: params?.end_date || undefined,
          search_id: params?.search_id || undefined,
          fields: "id,video_description,create_time,region_code,share_count,view_count,like_count,comment_count,music_id,hashtag_names,username,effect_ids,playlist_id,voice_to_text",
        });
        break;

      case "research_hashtag":
        result = await ttFetch("/research/hashtag/query/", token, "POST", {
          query: { names: params.hashtags },
          fields: "id,name,publish_count,video_count,view_count",
        });
        break;

      case "research_comments":
        result = await ttFetch("/research/video/comment/list/", token, "POST", {
          video_id: params.video_id,
          max_count: params?.limit || 100,
          cursor: params?.cursor || undefined,
          fields: "id,text,like_count,reply_count,create_time,video_id",
        });
        break;

      // ===== PLAYLIST MANAGEMENT =====
      case "get_playlists":
        result = await ttFetch("/playlist/list/", token, "POST", {
          cursor: params?.cursor || 0,
          count: params?.limit || 20,
        });
        break;

      case "create_playlist":
        result = await ttFetch("/playlist/create/", token, "POST", {
          playlist_name: params.name,
        });
        break;

      // ===== DIRECT MESSAGES =====
      case "get_conversations":
        result = await ttFetch("/dm/conversation/list/", token, "POST", {
          cursor: params?.cursor || 0,
        });
        break;

      case "get_messages":
        result = await ttFetch("/dm/message/list/", token, "POST", {
          conversation_id: params.conversation_id,
          cursor: params?.cursor || 0,
          max_count: params?.limit || 20,
        });
        break;

      case "send_dm":
        result = await ttFetch("/dm/message/send/", token, "POST", {
          conversation_id: params.conversation_id,
          content: {
            text: params.message,
          },
        });
        break;

      // ===== TOKEN REFRESH =====
      case "refresh_token": {
        const clientKey = params.client_key;
        const clientSecret = params.client_secret;
        const refreshToken = conn.refresh_token;
        
        if (!refreshToken) throw new Error("No refresh token available");
        
        const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
        result = await resp.json();
        
        if (result.data?.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token || refreshToken,
            token_expires_at: new Date(Date.now() + (result.data.expires_in || 86400) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        }
        break;
      }

      // ===== CREATOR INFO (Public) =====
      case "get_creator_info":
        result = await ttFetch("/post/publish/creator_info/", token, "POST", {});
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("TikTok API error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

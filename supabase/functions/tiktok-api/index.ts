import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TT_API_URL = "https://open.tiktokapis.com/v2";
const DEFAULT_TIKTOK_OAUTH_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
  "video.publish",
  "video.upload",
].join(",");

function normalizeTikTokScopes(rawScopes?: string | null) {
  const normalized = (rawScopes || DEFAULT_TIKTOK_OAUTH_SCOPES)
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
    .join(",");
  return normalized || DEFAULT_TIKTOK_OAUTH_SCOPES;
}

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
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await resp.text();
    console.error("TikTok non-JSON response:", resp.status, text.substring(0, 300));
    if (resp.status === 404) {
      throw new Error(`This TikTok API endpoint is not available (404). This feature may require approved scopes or is not available in sandbox mode.`);
    }
    throw new Error(`TikTok API returned non-JSON (status ${resp.status}). This may indicate an expired token, rate limit, or server error.`);
  }
  const data = await resp.json();
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok API: ${data.error.message || "Unknown error"} (${data.error.code})`);
  }
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

    let result: any;
    let conn: any;
    let token: string;

    // Return client key for frontend use
    if (action === "get_client_key") {
      const clientKey = (Deno.env.get("TIKTOK_CLIENT_KEY") || "").trim();
      const scopes = normalizeTikTokScopes(Deno.env.get("TIKTOK_OAUTH_SCOPES"));
      return new Response(JSON.stringify({ success: true, client_key: clientKey || null, scopes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Actions that don't need a connection
    if (action === "exchange_code") {
      const { code, client_key, client_secret, redirect_uri } = params;
      const finalClientKey = (client_key || Deno.env.get("TIKTOK_CLIENT_KEY") || "").trim();
      const finalClientSecret = (client_secret || Deno.env.get("TIKTOK_CLIENT_SECRET") || "").trim();
      if (!code || !finalClientKey || !finalClientSecret) throw new Error("Missing code, client_key, or client_secret");

      const bodyParams = new URLSearchParams({
        client_key: finalClientKey,
        client_secret: finalClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirect_uri || "",
      });

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyParams.toString(),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
      result = { success: true, data: tokenData.data || tokenData };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SINGLE POST PUBLISH (triggered by per-post cron job) =====
    if (action === "publish_scheduled_post") {
      const { post_id } = { post_id: params?.post_id || (await req.clone().json().catch(() => ({}))).post_id };
      const actualPostId = post_id || (await req.clone().json().catch(() => ({}))).post_id;
      
      // Accept post_id from body root or params
      const resolvedPostId = actualPostId || (() => {
        try { const b = JSON.parse(JSON.stringify(arguments)); return b.post_id; } catch { return null; }
      })();

      const bodyData = await req.clone().json().catch(() => ({}));
      const finalPostId = resolvedPostId || bodyData.post_id;

      if (!finalPostId) {
        return new Response(JSON.stringify({ success: false, error: "Missing post_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: post } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", finalPostId)
        .single();

      if (!post) {
        // Post was deleted — cron will self-destruct via trigger
        return new Response(JSON.stringify({ success: true, data: { skipped: true, reason: "post_not_found" } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Skip if already published or not scheduled
      if (post.status !== "scheduled") {
        return new Response(JSON.stringify({ success: true, data: { skipped: true, reason: `status_is_${post.status}` } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const postConn = await getConnection(supabase, post.account_id);
        const meta = post.metadata || {};
        const mediaUrl = Array.isArray(post.media_urls) ? post.media_urls[0] : null;

        if (!mediaUrl) {
          await supabase.from("social_posts").update({
            status: "failed", error_message: "No media URL available",
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
          return new Response(JSON.stringify({ success: false, error: "No media URL" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mark as publishing (triggers cron cleanup via DB trigger)
        await supabase.from("social_posts").update({
          status: "publishing", updated_at: new Date().toISOString(),
        }).eq("id", post.id);

        const postType = meta.content_type || post.post_type || "video";
        let publishResult: any;

        if (postType === "video") {
          publishResult = await ttFetch("/post/publish/video/init/", postConn.access_token, "POST", {
            post_info: {
              title: post.caption || "",
              privacy_level: meta.privacy_level || "PUBLIC_TO_EVERYONE",
              disable_duet: meta.disable_duet || false,
              disable_comment: meta.disable_comment || false,
              disable_stitch: meta.disable_stitch || false,
              ...(meta.brand_content ? { brand_content_toggle: true } : {}),
            },
            source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
          });
        } else {
          const mediaType = postType === "carousel" ? "CAROUSEL" : "PHOTO";
          publishResult = await ttFetch("/post/publish/content/init/", postConn.access_token, "POST", {
            post_info: {
              title: post.caption || "",
              description: post.caption || "",
              privacy_level: meta.privacy_level || "PUBLIC_TO_EVERYONE",
              disable_comment: meta.disable_comment || false,
            },
            source_info: {
              source: "PULL_FROM_URL",
              photo_cover_index: 0,
              photo_images: post.media_urls,
            },
            post_mode: "DIRECT_POST",
            media_type: mediaType,
          });
        }

        const publishId = publishResult?.data?.publish_id;
        // Status change to publishing/published triggers cron self-destruct via DB trigger
        await supabase.from("social_posts").update({
          platform_post_id: publishId || null,
          status: publishId ? "publishing" : "published",
          published_at: publishId ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);

        return new Response(JSON.stringify({ success: true, data: { published: true, publish_id: publishId } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        console.error(`Cron publish failed for post ${post.id}:`, e.message);
        // Status change to failed triggers cron self-destruct via DB trigger
        await supabase.from("social_posts").update({
          status: "failed",
          error_message: e.message || "Publishing failed",
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ===== PROCESS SCHEDULED POSTS (bulk fallback) =====
    if (action === "process_scheduled") {
      const now = new Date().toISOString();
      const { data: duePosts } = await supabase
        .from("social_posts")
        .select("*")
        .eq("platform", "tiktok")
        .eq("status", "scheduled")
        .lte("scheduled_at", now)
        .limit(10);

      if (!duePosts || duePosts.length === 0) {
        return new Response(JSON.stringify({ success: true, data: { processed: 0 } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;
      let failed = 0;

      for (const post of duePosts) {
        try {
          const postConn = await getConnection(supabase, post.account_id);
          const meta = post.metadata || {};
          const mediaUrl = Array.isArray(post.media_urls) ? post.media_urls[0] : null;
          if (!mediaUrl) {
            await supabase.from("social_posts").update({
              status: "failed", error_message: "No media URL available",
              updated_at: new Date().toISOString(),
            }).eq("id", post.id);
            failed++;
            continue;
          }

          await supabase.from("social_posts").update({
            status: "publishing", updated_at: new Date().toISOString(),
          }).eq("id", post.id);

          const postType = meta.content_type || post.post_type || "video";
          let publishResult: any;

          if (postType === "video") {
            publishResult = await ttFetch("/post/publish/video/init/", postConn.access_token, "POST", {
              post_info: {
                title: post.caption || "",
                privacy_level: meta.privacy_level || "PUBLIC_TO_EVERYONE",
                disable_duet: meta.disable_duet || false,
                disable_comment: meta.disable_comment || false,
                disable_stitch: meta.disable_stitch || false,
                ...(meta.brand_content ? { brand_content_toggle: true } : {}),
              },
              source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
            });
          } else {
            const mediaType = postType === "carousel" ? "CAROUSEL" : "PHOTO";
            publishResult = await ttFetch("/post/publish/content/init/", postConn.access_token, "POST", {
              post_info: {
                title: post.caption || "",
                description: post.caption || "",
                privacy_level: meta.privacy_level || "PUBLIC_TO_EVERYONE",
                disable_comment: meta.disable_comment || false,
              },
              source_info: {
                source: "PULL_FROM_URL",
                photo_cover_index: 0,
                photo_images: post.media_urls,
              },
              post_mode: "DIRECT_POST",
              media_type: mediaType,
            });
          }

          const publishId = publishResult?.data?.publish_id;
          await supabase.from("social_posts").update({
            platform_post_id: publishId || null,
            status: publishId ? "publishing" : "published",
            published_at: publishId ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);

          processed++;
        } catch (e: any) {
          console.error(`Failed to publish post ${post.id}:`, e.message);
          await supabase.from("social_posts").update({
            status: "failed",
            error_message: e.message || "Publishing failed",
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
          failed++;
        }
      }

      return new Response(JSON.stringify({ success: true, data: { processed, failed, total: duePosts.length } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== CHECK & UPDATE ALL PUBLISHING POSTS =====
    if (action === "sync_publish_statuses") {
      const { data: publishingPosts } = await supabase
        .from("social_posts")
        .select("*")
        .eq("platform", "tiktok")
        .eq("status", "publishing")
        .not("platform_post_id", "is", null)
        .limit(20);

      if (!publishingPosts || publishingPosts.length === 0) {
        return new Response(JSON.stringify({ success: true, data: { synced: 0 } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let synced = 0;
      for (const post of publishingPosts) {
        try {
          const postConn = await getConnection(supabase, post.account_id);
          const statusResult = await ttFetch("/post/publish/status/fetch/", postConn.access_token, "POST", {
            publish_id: post.platform_post_id,
          });
          const pubStatus = statusResult?.data?.status;
          if (pubStatus === "PUBLISH_COMPLETE") {
            await supabase.from("social_posts").update({
              status: "published",
              published_at: new Date().toISOString(),
              error_message: null,
              updated_at: new Date().toISOString(),
            }).eq("id", post.id);
            synced++;
          } else if (pubStatus === "FAILED") {
            const failReason = statusResult?.data?.fail_reason || "TikTok publishing failed";
            await supabase.from("social_posts").update({
              status: "failed",
              error_message: failReason,
              updated_at: new Date().toISOString(),
            }).eq("id", post.id);
            synced++;
          }
        } catch (e: any) {
          console.error(`Status check failed for post ${post.id}:`, e.message);
        }
      }

      return new Response(JSON.stringify({ success: true, data: { synced, total: publishingPosts.length } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GET POST ENGAGEMENT DATA =====
    if (action === "get_post_engagement") {
      conn = await getConnection(supabase, account_id);
      token = conn.access_token;
      
      // Get video IDs from published posts
      const { data: publishedPosts } = await supabase
        .from("social_posts")
        .select("id, platform_post_id, caption")
        .eq("account_id", account_id)
        .eq("platform", "tiktok")
        .eq("status", "published")
        .not("platform_post_id", "is", null)
        .order("published_at", { ascending: false })
        .limit(20);

      if (!publishedPosts || publishedPosts.length === 0) {
        return new Response(JSON.stringify({ success: true, data: { posts: [] } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch video details for engagement data
      const videoFields = "id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count";
      const videoList = await ttFetch(`/video/list/?fields=${videoFields}`, token, "POST", { max_count: 20 });
      const apiVideos = videoList?.data?.videos || [];

      // Update engagement data on posts
      for (const post of publishedPosts) {
        const matchedVideo = apiVideos.find((v: any) => v.id === post.platform_post_id);
        if (matchedVideo) {
          await supabase.from("social_posts").update({
            engagement_data: {
              views: matchedVideo.view_count || 0,
              likes: matchedVideo.like_count || 0,
              comments: matchedVideo.comment_count || 0,
              shares: matchedVideo.share_count || 0,
              engagement_rate: matchedVideo.view_count > 0
                ? ((matchedVideo.like_count + matchedVideo.comment_count + matchedVideo.share_count) / matchedVideo.view_count * 100).toFixed(2)
                : "0",
              cover_url: matchedVideo.cover_image_url || null,
              share_url: matchedVideo.share_url || null,
              duration: matchedVideo.duration || 0,
              synced_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
        }
      }

      return new Response(JSON.stringify({ success: true, data: { posts: publishedPosts.length, videos_matched: apiVideos.length } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions need connection
    if (action !== "exchange_code") {
      if (params?.access_token_override) {
        token = params.access_token_override;
      } else {
        conn = await getConnection(supabase, account_id);
        token = conn.access_token;
      }
    }

    switch (action) {
      // ===== USER INFO =====
      case "get_user_info": {
        const useToken = params?.access_token_override || token!;
        const fullFields = "open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count,username";
        const basicFields = "open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name";
        try {
          result = await ttFetch(`/user/info/?fields=${fullFields}`, useToken);
        } catch (fullErr: any) {
          console.log("Full fields failed, falling back to basic:", fullErr.message);
          result = await ttFetch(`/user/info/?fields=${basicFields}`, useToken);
        }
        break;
      }

      // ===== VIDEO LIST =====
      case "get_videos": {
        const videoFields = "id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count";
        const videoBody: any = { max_count: params?.limit || 20 };
        if (params?.cursor) videoBody.cursor = params.cursor;
        result = await ttFetch(`/video/list/?fields=${videoFields}`, token!, "POST", videoBody);
        break;
      }

      case "get_video_details": {
        const detailFields = "id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count,embed_link,embed_html,height,width";
        result = await ttFetch(`/video/query/?fields=${detailFields}`, token!, "POST", {
          filters: { video_ids: params.video_ids },
        });
        break;
      }

      // ===== PUBLISHING: VIDEO =====
      case "init_video_upload":
        result = await ttFetch("/post/publish/video/init/", token!, "POST", {
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

      case "publish_video_by_url":
        result = await ttFetch("/post/publish/video/init/", token!, "POST", {
          post_info: {
            title: params.title || "",
            privacy_level: params.privacy_level || "PUBLIC_TO_EVERYONE",
            disable_duet: params.disable_duet || false,
            disable_comment: params.disable_comment || false,
            disable_stitch: params.disable_stitch || false,
            ...(params.brand_content_toggle ? { brand_content_toggle: true } : {}),
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

      case "check_publish_status":
        result = await ttFetch("/post/publish/status/fetch/", token!, "POST", {
          publish_id: params.publish_id,
        });
        if (params.post_id && result.data?.status === "PUBLISH_COMPLETE") {
          await supabase.from("social_posts").update({
            status: "published",
            published_at: new Date().toISOString(),
          }).eq("id", params.post_id);
        }
        break;

      // ===== PUBLISHING: PHOTO =====
      case "publish_photo":
        result = await ttFetch("/post/publish/content/init/", token!, "POST", {
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

      // ===== PUBLISHING: CAROUSEL =====
      case "publish_carousel":
        result = await ttFetch("/post/publish/content/init/", token!, "POST", {
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
          media_type: "CAROUSEL",
        });
        break;

      // ===== CREATOR INFO =====
      case "get_creator_info":
        result = await ttFetch("/post/publish/creator_info/", token!, "POST", {});
        break;

      // ===== COMMENTS (requires unapproved scopes) =====
      case "get_comments":
      case "get_comment_replies":
      case "reply_to_comment":
        result = { data: { comments: [] }, _unavailable: true, message: "Comment API requires additional TikTok scopes not yet approved." };
        break;

      // ===== RESEARCH API (requires unapproved scopes) =====
      case "research_user":
      case "research_videos":
      case "research_hashtag":
      case "research_comments":
        result = { data: {}, _unavailable: true, message: "Research API requires additional TikTok scopes not yet approved." };
        break;

      // ===== PLAYLIST MANAGEMENT =====
      case "get_playlists":
        result = await ttFetch("/playlist/list/", token!, "POST", {
          cursor: params?.cursor || 0,
          count: params?.limit || 20,
        });
        break;

      case "create_playlist":
        result = await ttFetch("/playlist/create/", token!, "POST", {
          playlist_name: params.name,
        });
        break;

      // ===== DIRECT MESSAGES (requires unapproved DM scopes) =====
      case "get_conversations":
        result = { data: { conversations: [] }, _unavailable: true, message: "Direct Messages API requires additional TikTok scopes not yet approved." };
        break;
      case "get_messages":
        result = { data: { messages: [] }, _unavailable: true, message: "Direct Messages API requires additional TikTok scopes not yet approved." };
        break;
      case "send_dm":
      case "send_message":
        result = { data: {}, _unavailable: true, message: "Direct Messages API requires additional TikTok scopes not yet approved." };
        break;

      // ===== TOKEN REFRESH =====
      case "refresh_token": {
        const clientKey = params.client_key || Deno.env.get("TIKTOK_CLIENT_KEY") || "";
        const clientSecret = params.client_secret || Deno.env.get("TIKTOK_CLIENT_SECRET") || "";
        const refreshTok = conn!.refresh_token;
        if (!refreshTok) throw new Error("No refresh token available");
        const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshTok,
          }),
        });
        result = await resp.json();
        if (result.data?.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token || refreshTok,
            token_expires_at: new Date(Date.now() + (result.data.expires_in || 86400) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn!.id);
        }
        break;
      }

      // ===== REVOKE TOKEN =====
      case "revoke_token": {
        const clientKey = (params?.client_key || Deno.env.get("TIKTOK_CLIENT_KEY") || "").trim();
        result = await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_key: clientKey, token: token! }),
        });
        result = await result.json();
        await supabase.from("social_connections").update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          metadata: {},
          updated_at: new Date().toISOString(),
        }).eq("id", conn!.id);
        break;
      }

      // ===== CREATOR INSIGHTS (Research — requires unapproved scopes) =====
      case "get_creator_insights":
        result = { data: {}, _unavailable: true, message: "Research API requires additional TikTok scopes not yet approved." };
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

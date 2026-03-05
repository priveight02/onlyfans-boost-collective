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

// TikTok API field limits (as of March 2026)
const PHOTO_TITLE_MAX = 90;
const PHOTO_DESC_MAX = 4000;
const VIDEO_TITLE_MAX = 2200;

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
    console.error("TikTok non-JSON response:", resp.status, text.substring(0, 500));
    if (resp.status === 404) {
      throw new Error(`This TikTok API endpoint is not available (404). This feature may require approved scopes or is not available in sandbox mode.`);
    }
    throw new Error(`TikTok API returned non-JSON (status ${resp.status}). This may indicate an expired token, rate limit, or server error.`);
  }
  const data = await resp.json();
  if (data.error?.code && data.error.code !== "ok") {
    const logCode = data.error.code;
    const logMsg = data.error.message || "Unknown error";
    const logExtra = data.error.log_id ? ` [log_id: ${data.error.log_id}]` : "";
    console.error(`TikTok API error: ${logCode} - ${logMsg}${logExtra}`, JSON.stringify(data.error));
    throw new Error(`TikTok API: ${logMsg} (${logCode})`);
  }
  return data;
}

// For unaudited TikTok apps, ONLY "SELF_ONLY" is allowed.
// The creator_info endpoint may return other options but TikTok will reject them
// with "unaudited_client_can_only_post_to_private_accounts".
// Once the app passes TikTok's audit, remove this override.
async function resolvePrivacyLevel(token: string, requested: string): Promise<string> {
  // FORCE SELF_ONLY until app is audited by TikTok
  console.log(`Privacy level requested: ${requested}, forcing SELF_ONLY (unaudited app)`);
  return "SELF_ONLY";
}

function clampVideoTitle(title?: string): string {
  return (title || "").substring(0, VIDEO_TITLE_MAX);
}

function clampPhotoTitle(title?: string): string {
  return (title || "").substring(0, PHOTO_TITLE_MAX);
}

function clampPhotoDesc(desc?: string): string {
  return (desc || "").substring(0, PHOTO_DESC_MAX);
}

// Download a video from sourceUrl and upload it to TikTok via FILE_UPLOAD.
// This completely bypasses the url_ownership_unverified error that PULL_FROM_URL requires.
async function uploadVideoViaFileUpload(
  token: string,
  sourceUrl: string,
  postInfo: Record<string, any>
): Promise<any> {
  console.log(`[FILE_UPLOAD] Downloading video from: ${sourceUrl.substring(0, 100)}...`);
  const fileResp = await fetch(sourceUrl);
  if (!fileResp.ok) throw new Error(`Failed to download video from source: ${fileResp.status}`);
  const fileBuffer = await fileResp.arrayBuffer();
  const videoSize = fileBuffer.byteLength;
  console.log(`[FILE_UPLOAD] Video downloaded: ${videoSize} bytes, initializing upload...`);

  const initResult = await ttFetch("/post/publish/video/init/", token, "POST", {
    post_info: postInfo,
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  });

  const uploadUrl = initResult?.data?.upload_url;
  const publishId = initResult?.data?.publish_id;
  if (!uploadUrl) {
    console.log("[FILE_UPLOAD] No upload_url returned, publish_id:", publishId);
    return initResult;
  }

  console.log(`[FILE_UPLOAD] Uploading ${videoSize} bytes to TikTok...`);
  const putResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoSize),
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: fileBuffer,
  });

  if (!putResp.ok) {
    const errText = await putResp.text();
    console.error(`[FILE_UPLOAD] PUT failed: ${putResp.status}`, errText.substring(0, 500));
    throw new Error(`Video upload to TikTok failed (${putResp.status})`);
  }
  await putResp.text(); // consume body

  console.log(`[FILE_UPLOAD] Success, publish_id: ${publishId}`);
  return initResult;
}

// For photo/carousel, PULL_FROM_URL is the ONLY supported source.
// If url_ownership_unverified occurs, provide clear instructions.
function handlePhotoUrlOwnershipError(err: any, imageUrls: string[]): never {
  const msg = err?.message || String(err);
  if (msg.includes("url_ownership_unverified")) {
    // Extract the domain from the first image URL
    let domain = "your media host";
    try { domain = new URL(imageUrls[0]).hostname; } catch {}
    throw new Error(
      `TikTok rejected your photo URLs because the domain "${domain}" is not verified in your TikTok app's URL Properties. ` +
      `Photos ONLY support PULL_FROM_URL (no file upload alternative). ` +
      `To fix: Go to TikTok Developer Portal → Your App → Settings → URL Properties → Add URL Prefix → add "https://${domain}/". ` +
      `TikTok may take a few minutes to verify it after adding.`
    );
  }
  throw err;
}

// Build a valid video post_info object
function buildVideoPostInfo(opts: {
  title?: string;
  privacy_level: string;
  disable_duet?: boolean;
  disable_comment?: boolean;
  disable_stitch?: boolean;
  video_cover_timestamp_ms?: number;
  brand_content_toggle?: boolean;
  brand_organic_toggle?: boolean;
}): Record<string, any> {
  const info: Record<string, any> = {
    title: clampVideoTitle(opts.title),
    privacy_level: opts.privacy_level,
    disable_duet: opts.disable_duet ?? false,
    disable_comment: opts.disable_comment ?? false,
    disable_stitch: opts.disable_stitch ?? false,
  };
  if (opts.video_cover_timestamp_ms !== undefined && opts.video_cover_timestamp_ms > 0) {
    info.video_cover_timestamp_ms = opts.video_cover_timestamp_ms;
  }
  if (opts.brand_content_toggle) info.brand_content_toggle = true;
  if (opts.brand_organic_toggle) info.brand_organic_toggle = true;
  return info;
}

// Build a valid photo/carousel post_info + top-level fields
function buildPhotoPublishBody(opts: {
  title?: string;
  description?: string;
  privacy_level: string;
  disable_comment?: boolean;
  auto_add_music?: boolean;
  brand_content_toggle?: boolean;
  brand_organic_toggle?: boolean;
  image_urls: string[];
  cover_index?: number;
  media_type: "PHOTO" | "CAROUSEL";
}): Record<string, any> {
  const postInfo: Record<string, any> = {
    title: clampPhotoTitle(opts.title),
    description: clampPhotoDesc(opts.description || opts.title),
    privacy_level: opts.privacy_level,
    disable_comment: opts.disable_comment ?? false,
    auto_add_music: opts.auto_add_music ?? true,
  };
  if (opts.brand_content_toggle) postInfo.brand_content_toggle = true;
  if (opts.brand_organic_toggle) postInfo.brand_organic_toggle = true;

  return {
    post_info: postInfo,
    source_info: {
      source: "PULL_FROM_URL",
      photo_cover_index: opts.cover_index ?? 0,
      photo_images: opts.image_urls,
    },
    post_mode: "DIRECT_POST",
    media_type: opts.media_type,
  };
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

    // ===== BATCH PUBLISH =====
    if (action === "publish_scheduled_batch") {
      const bodyData = await req.clone().json().catch(() => ({}));
      const slotTs = params?.slot_ts || bodyData.slot_ts;

      if (!slotTs) {
        return new Response(JSON.stringify({ success: false, error: "Missing slot_ts" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const slotStart = new Date(slotTs);
      const slotEnd = new Date(slotStart.getTime() + 60000);

      const { data: posts, error: fetchErr } = await supabase
        .from("social_posts")
        .select("*")
        .eq("platform", "tiktok")
        .eq("status", "scheduled")
        .gte("scheduled_at", slotStart.toISOString())
        .lt("scheduled_at", slotEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (fetchErr || !posts || posts.length === 0) {
        return new Response(JSON.stringify({ success: true, data: { skipped: true, reason: "no_posts_in_slot", slot: slotTs } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];

      for (const post of posts) {
        try {
          const postConn = await getConnection(supabase, post.account_id);
          const meta = post.metadata || {};
          const mediaUrl = Array.isArray(post.media_urls) ? post.media_urls[0] : null;

          if (!mediaUrl) {
            await supabase.from("social_posts").update({
              status: "failed", error_message: "No media URL available",
              updated_at: new Date().toISOString(),
            }).eq("id", post.id);
            results.push({ id: post.id, status: "failed", error: "No media URL" });
            continue;
          }

          await supabase.from("social_posts").update({
            status: "publishing", updated_at: new Date().toISOString(),
          }).eq("id", post.id);

          const postType = meta.content_type || post.post_type || "video";
          let publishResult: any;

          if (postType === "video") {
            const privacy = await resolvePrivacyLevel(postConn.access_token, meta.privacy_level || "PUBLIC_TO_EVERYONE");
            publishResult = await uploadVideoViaFileUpload(postConn.access_token, mediaUrl, buildVideoPostInfo({
              title: post.caption,
              privacy_level: privacy,
              disable_duet: meta.disable_duet,
              disable_comment: meta.disable_comment,
              disable_stitch: meta.disable_stitch,
              brand_content_toggle: meta.brand_content,
            }));
          } else {
            const mediaType = postType === "carousel" ? "CAROUSEL" : "PHOTO";
            const privacy = await resolvePrivacyLevel(postConn.access_token, meta.privacy_level || "PUBLIC_TO_EVERYONE");
            publishResult = await ttFetch("/post/publish/content/init/", postConn.access_token, "POST",
              buildPhotoPublishBody({
                title: post.caption,
                description: post.caption,
                privacy_level: privacy,
                disable_comment: meta.disable_comment,
                image_urls: post.media_urls,
                media_type: mediaType as "PHOTO" | "CAROUSEL",
              })
            );
          }

          const publishId = publishResult?.data?.publish_id;
          await supabase.from("social_posts").update({
            platform_post_id: publishId || null,
            status: publishId ? "publishing" : "published",
            published_at: publishId ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);

          results.push({ id: post.id, status: "published", publish_id: publishId });
        } catch (e: any) {
          console.error(`Batch publish failed for post ${post.id}:`, e.message);
          await supabase.from("social_posts").update({
            status: "failed",
            error_message: e.message || "Publishing failed",
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
          results.push({ id: post.id, status: "failed", error: e.message });
        }
      }

      return new Response(JSON.stringify({ success: true, data: { batch_size: posts.length, results } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SINGLE POST PUBLISH (legacy/direct fallback) =====
    if (action === "publish_scheduled_post") {
      const bodyData = await req.clone().json().catch(() => ({}));
      const finalPostId = params?.post_id || bodyData.post_id;

      if (!finalPostId) {
        return new Response(JSON.stringify({ success: false, error: "Missing post_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: post } = await supabase
        .from("social_posts")
        .select("scheduled_at")
        .eq("id", finalPostId)
        .eq("status", "scheduled")
        .single();

      if (!post) {
        return new Response(JSON.stringify({ success: true, data: { skipped: true, reason: "post_not_found_or_not_scheduled" } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const slotTs = new Date(new Date(post.scheduled_at).setSeconds(0, 0)).toISOString();
      return new Response(JSON.stringify({ success: true, data: { redirected_to_batch: true, slot_ts: slotTs } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            const privacy = await resolvePrivacyLevel(postConn.access_token, meta.privacy_level || "PUBLIC_TO_EVERYONE");
            publishResult = await uploadVideoViaFileUpload(postConn.access_token, mediaUrl, buildVideoPostInfo({
              title: post.caption,
              privacy_level: privacy,
              disable_duet: meta.disable_duet,
              disable_comment: meta.disable_comment,
              disable_stitch: meta.disable_stitch,
              brand_content_toggle: meta.brand_content,
            }));
          } else {
            const mediaType = postType === "carousel" ? "CAROUSEL" : "PHOTO";
            const privacy = await resolvePrivacyLevel(postConn.access_token, meta.privacy_level || "PUBLIC_TO_EVERYONE");
            publishResult = await ttFetch("/post/publish/content/init/", postConn.access_token, "POST",
              buildPhotoPublishBody({
                title: post.caption,
                description: post.caption,
                privacy_level: privacy,
                disable_comment: meta.disable_comment,
                image_urls: post.media_urls,
                media_type: mediaType as "PHOTO" | "CAROUSEL",
              })
            );
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

      const videoFields = "id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count";
      const videoList = await ttFetch(`/video/list/?fields=${videoFields}`, token, "POST", { max_count: 20 });
      const apiVideos = videoList?.data?.videos || [];

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

      // ===== PUBLISHING: VIDEO (FILE UPLOAD) =====
      case "init_video_upload": {
        const uploadPrivacy = await resolvePrivacyLevel(token!, params.privacy_level || "SELF_ONLY");
        result = await ttFetch("/post/publish/video/init/", token!, "POST", {
          post_info: buildVideoPostInfo({
            title: params.title,
            privacy_level: uploadPrivacy,
            disable_duet: params.disable_duet,
            disable_comment: params.disable_comment,
            disable_stitch: params.disable_stitch,
            video_cover_timestamp_ms: params.cover_timestamp,
            brand_content_toggle: params.brand_content_toggle,
            brand_organic_toggle: params.brand_organic_toggle,
          }),
          source_info: {
            source: "FILE_UPLOAD",
            video_size: params.video_size,
            chunk_size: params.chunk_size || params.video_size,
            total_chunk_count: params.total_chunk_count || 1,
          },
        });
        break;
      }

      // ===== PUBLISHING: VIDEO (via FILE_UPLOAD to bypass url_ownership) =====
      case "publish_video_by_url": {
        const vidPrivacy = await resolvePrivacyLevel(token!, params.privacy_level || "PUBLIC_TO_EVERYONE");
        if (!params.video_url) throw new Error("Missing video_url parameter");
        result = await uploadVideoViaFileUpload(token!, params.video_url, buildVideoPostInfo({
          title: params.title,
          privacy_level: vidPrivacy,
          disable_duet: params.disable_duet,
          disable_comment: params.disable_comment,
          disable_stitch: params.disable_stitch,
          brand_content_toggle: params.brand_content_toggle,
          brand_organic_toggle: params.brand_organic_toggle,
        }));
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
      case "publish_photo": {
        const photoPrivacy = await resolvePrivacyLevel(token!, params.privacy_level || "PUBLIC_TO_EVERYONE");
        if (!params.image_urls || !Array.isArray(params.image_urls) || params.image_urls.length === 0) {
          throw new Error("Missing or empty image_urls array for photo publish");
        }
        try {
          result = await ttFetch("/post/publish/content/init/", token!, "POST",
            buildPhotoPublishBody({
              title: params.title,
              description: params.description,
              privacy_level: photoPrivacy,
              disable_comment: params.disable_comment,
              auto_add_music: params.auto_add_music,
              brand_content_toggle: params.brand_content_toggle,
              brand_organic_toggle: params.brand_organic_toggle,
              image_urls: params.image_urls,
              cover_index: params.cover_index,
              media_type: "PHOTO",
            })
          );
        } catch (photoErr: any) {
          handlePhotoUrlOwnershipError(photoErr, params.image_urls);
        }
        break;
      }

      // ===== PUBLISHING: CAROUSEL =====
      case "publish_carousel": {
        const carouselPrivacy = await resolvePrivacyLevel(token!, params.privacy_level || "PUBLIC_TO_EVERYONE");
        if (!params.image_urls || !Array.isArray(params.image_urls) || params.image_urls.length === 0) {
          throw new Error("Missing or empty image_urls array for carousel publish");
        }
        try {
          result = await ttFetch("/post/publish/content/init/", token!, "POST",
            buildPhotoPublishBody({
              title: params.title,
              description: params.description,
              privacy_level: carouselPrivacy,
              disable_comment: params.disable_comment,
              auto_add_music: params.auto_add_music,
              brand_content_toggle: params.brand_content_toggle,
              brand_organic_toggle: params.brand_organic_toggle,
              image_urls: params.image_urls,
              cover_index: params.cover_index,
              media_type: "CAROUSEL",
            })
          );
        } catch (carouselErr: any) {
          handlePhotoUrlOwnershipError(carouselErr, params.image_urls);
        }
        break;
      }

      // ===== CREATOR INFO =====
      case "get_creator_info":
        result = await ttFetch("/post/publish/creator_info/query/", token!, "POST", {});
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

      // =======================================================================
      // ===== TIKTOK BUSINESS DEVELOPER API v1.3 (Ads / Commercial) ===========
      // =======================================================================
      // These are SEPARATE from the standard TikTok Developer API above.
      // Base URL: https://business-api.tiktok.com/open_api/v1.3
      // All actions prefixed with "biz_" to differentiate from standard API.
      // Generic proxy: action = "biz_proxy", params.endpoint, params.method, params.body, params.query
      // =======================================================================

      case "biz_proxy": {
        const BIZ_BASE = "https://business-api.tiktok.com/open_api/v1.3";
        const bizEndpoint = params?.endpoint;
        if (!bizEndpoint) throw new Error("Missing params.endpoint for biz_proxy");
        const bizMethod = (params?.method || "GET").toUpperCase();
        const bizQuery = params?.query ? "?" + new URLSearchParams(params.query).toString() : "";
        const bizUrl = `${BIZ_BASE}${bizEndpoint}${bizQuery}`;
        const bizHeaders: Record<string, string> = {
          "Access-Token": token!,
          "Content-Type": "application/json",
        };
        const bizOpts: RequestInit = { method: bizMethod, headers: bizHeaders };
        if (params?.body && ["POST", "PUT", "PATCH"].includes(bizMethod)) {
          bizOpts.body = JSON.stringify(params.body);
        }
        console.log(`[BIZ_PROXY] ${bizMethod} ${bizUrl}`);
        const bizResp = await fetch(bizUrl, bizOpts);
        const bizData = await bizResp.json();
        result = bizData;
        break;
      }

      // ===== AD ACCOUNT MANAGEMENT =====
      case "biz_advertiser_info":
      case "biz_oauth2_advertiser_get":
      case "biz_term_get":
      case "biz_term_check":
      case "biz_term_confirm":
      case "biz_pangle_block_list_get":
      case "biz_pangle_block_list_update":
      case "biz_pangle_block_list_campaign_update":
      case "biz_pangle_block_list_campaign_get":
      case "biz_pangle_block_list_report_get":
      case "biz_pangle_audience_package_get":
      case "biz_bc_inspiration_audience_insight":
      case "biz_bc_inspiration_ad_performance":
      case "biz_bc_get":
      case "biz_bc_balance_get":
      case "biz_bc_transaction_get":
      case "biz_bc_image_upload":
      case "biz_bc_advertiser_create":
      case "biz_advertiser_update":
      case "biz_bc_advertiser_disable":
      case "biz_bc_advertiser_qualification_get":
      case "biz_bc_advertiser_attribute":
      case "biz_bc_advertiser_unionpay_check":
      case "biz_bc_advertiser_unionpay_submit":
      case "biz_bc_transfer":
      case "biz_advertiser_balance_get":
      case "biz_advertiser_transaction_get":
      case "biz_bc_account_transaction_get":
      case "biz_bc_account_cost_get":
      case "biz_bc_account_budget_changelog_get":
      case "biz_bc_asset_get":
      case "biz_bc_asset_admin_get":
      case "biz_bc_asset_assign":
      case "biz_bc_asset_unassign":
      case "biz_bc_asset_partner_get":
      case "biz_bc_asset_member_get":
      case "biz_bc_asset_admin_delete":
      case "biz_bc_pixel_link_update":
      case "biz_bc_pixel_link_get":
      case "biz_bc_pixel_transfer":
      case "biz_asset_bind_quota":
      case "biz_bc_pixel_get":
      case "biz_bc_asset_account_authorization":
      case "biz_bc_asset_advertiser_assign":
      case "biz_bc_asset_advertiser_unassign":
      case "biz_bc_asset_advertiser_assigned":
      case "biz_bc_oa_create":
      case "biz_bc_partner_asset_get":
      case "biz_bc_partner_delete":
      case "biz_bc_partner_add":
      case "biz_bc_partner_get":
      case "biz_bc_partner_asset_delete":
      case "biz_bc_member_delete":
      case "biz_bc_member_update":
      case "biz_bc_member_get":
      case "biz_bc_member_invite":
      case "biz_bc_member_assign":
      case "biz_bc_billing_group_update":
      case "biz_bc_billing_group_get":
      case "biz_bc_billing_group_create":
      case "biz_bc_billing_group_advertiser_list":
      case "biz_bc_invoice_task_create":
      case "biz_bc_invoice_get":
      case "biz_bc_invoice_download":
      case "biz_bc_invoice_task_get":
      case "biz_bc_invoice_unpaid_get":
      case "biz_bc_invoice_task_list":
      case "biz_bc_invoice_billing_report_get":
      case "biz_bc_asset_group_create":
      case "biz_bc_asset_group_get":
      case "biz_bc_asset_group_update":
      case "biz_bc_asset_group_list":
      case "biz_bc_asset_group_delete":
      case "biz_bc_child_invite":
      case "biz_bc_child_unbind":
      // ===== ADS MANAGEMENT =====
      case "biz_campaign_get":
      case "biz_campaign_quota_get":
      case "biz_campaign_quota_info":
      case "biz_campaign_spc_get":
      case "biz_campaign_copy_task_check":
      case "biz_campaign_gmv_max_info":
      case "biz_gmv_max_bid_recommend":
      case "biz_gmv_max_campaign_get":
      case "biz_campaign_spc_quota_get":
      case "biz_campaign_create":
      case "biz_campaign_update":
      case "biz_campaign_status_update":
      case "biz_campaign_spc_create":
      case "biz_campaign_spc_update":
      case "biz_campaign_copy_task_create":
      case "biz_campaign_gmv_max_create":
      case "biz_campaign_gmv_max_update":
      case "biz_business_spark_ad_create":
      case "biz_campaign_spc_material_status_update":
      case "biz_adgroup_get":
      case "biz_adgroup_review_info":
      case "biz_adgroup_quota":
      case "biz_adgroup_create":
      case "biz_adgroup_update":
      case "biz_ad_audience_size_estimate":
      case "biz_adgroup_status_update":
      case "biz_adgroup_budget_update":
      case "biz_ad_get":
      case "biz_ad_review_info":
      case "biz_ad_aco_get":
      case "biz_showcase_product_get":
      case "biz_showcase_identity_get":
      case "biz_showcase_region_get":
      case "biz_smart_plus_mmt_ad_get":
      case "biz_ad_create":
      case "biz_ad_update":
      case "biz_ad_aco_create":
      case "biz_ad_aco_update":
      case "biz_ad_status_update":
      case "biz_ad_aco_material_status_update":
      case "biz_changelog_task_create":
      case "biz_changelog_task_download":
      case "biz_changelog_task_check":
      case "biz_changelog_get":
      case "biz_split_test_promote":
      case "biz_split_test_result_get":
      case "biz_split_test_create":
      case "biz_split_test_end":
      case "biz_split_test_update":
      case "biz_split_test_power_value_estimate":
      case "biz_search_ad_negative_keyword_download":
      case "biz_search_ad_negative_keyword_add":
      case "biz_search_ad_negative_keyword_delete":
      case "biz_search_ad_negative_keyword_update":
      case "biz_search_ad_negative_keyword_get":
      case "biz_tool_search_keyword_recommend":
      case "biz_account_optimization_account":
      case "biz_account_optimization_entity":
      case "biz_gmv_max_exclusive_authorization_create":
      case "biz_gmv_max_exclusive_authorization_get":
      case "biz_gmv_max_store_list":
      case "biz_gmv_max_store_shop_ad_usage_check":
      case "biz_gmv_max_occupied_custom_shop_ads_list":
      case "biz_gmv_max_identity_get":
      case "biz_gmv_max_video_get":
      case "biz_gmv_max_custom_anchor_video_list_get":
      case "biz_campaign_gmv_max_creative_update":
      case "biz_campaign_gmv_max_session_update":
      case "biz_campaign_gmv_max_session_delete":
      case "biz_campaign_gmv_max_session_list":
      case "biz_campaign_gmv_max_session_get":
      case "biz_campaign_gmv_max_session_create":
      case "biz_smart_plus_campaign_get":
      case "biz_smart_plus_adgroup_get":
      case "biz_smart_plus_ad_get":
      case "biz_smart_plus_material_review_info":
      case "biz_smart_plus_ad_review_info":
      case "biz_smart_plus_campaign_create":
      case "biz_smart_plus_campaign_update":
      case "biz_smart_plus_campaign_status_update":
      case "biz_smart_plus_adgroup_create":
      case "biz_smart_plus_adgroup_update":
      case "biz_smart_plus_ad_create":
      case "biz_smart_plus_ad_update":
      case "biz_smart_plus_ad_status_update":
      case "biz_smart_plus_ad_material_status_update":
      case "biz_smart_plus_ad_appeal":
      case "biz_smart_plus_adgroup_status_update":
      case "biz_smart_plus_adgroup_budget_update":
      case "biz_campaign_label_get":
      // ===== AUDIENCE MANAGEMENT =====
      case "biz_dmp_custom_audience_list":
      case "biz_dmp_custom_audience_get":
      case "biz_dmp_saved_audience_list":
      case "biz_dmp_custom_audience_overlap":
      case "biz_dmp_custom_audience_potential":
      case "biz_audience_insight_overlap":
      case "biz_audience_insight_info":
      case "biz_dmp_custom_audience_file_upload":
      case "biz_dmp_custom_audience_create":
      case "biz_dmp_custom_audience_update":
      case "biz_dmp_custom_audience_delete":
      case "biz_dmp_custom_audience_rule_create":
      case "biz_dmp_custom_audience_lookalike_create":
      case "biz_dmp_custom_audience_apply":
      case "biz_dmp_custom_audience_apply_log":
      case "biz_dmp_custom_audience_lookalike_update":
      case "biz_dmp_saved_audience_delete":
      case "biz_dmp_saved_audience_create":
      case "biz_dmp_custom_audience_share_cancel":
      case "biz_dmp_custom_audience_share_log":
      case "biz_dmp_custom_audience_share":
      // ===== REPORTING =====
      case "biz_report_integrated_get":
      case "biz_report_task_download":
      case "biz_report_task_create":
      case "biz_report_task_check":
      case "biz_report_subscription_subscribe":
      case "biz_report_subscription_unsubscribe":
      case "biz_report_subscription_update":
      case "biz_report_subscription_get":
      case "biz_campaign_spc_report_get":
      case "biz_report_task_cancel":
      case "biz_report_ad_benchmark_get":
      case "biz_report_video_performance_get":
      case "biz_creative_fatigue_get":
      case "biz_gmv_max_report_get":
      case "biz_smart_plus_material_report_overview":
      case "biz_smart_plus_material_report_breakdown":
      // ===== MEASUREMENT =====
      case "biz_app_track":
      case "biz_app_batch":
      case "biz_business_sdk_config_get":
      case "biz_open_api_business_sdk_config_get":
      case "biz_app_monitor":
      case "biz_app_s2s_deeplink":
      case "biz_pixel_track":
      case "biz_pixel_batch":
      case "biz_event_track":
      case "biz_pps_advertiser_verify":
      case "biz_pps_advertiser_event_update":
      case "biz_pps_survey_upload":
      case "biz_pps_survey_metric":
      // ===== CREATIVE MANAGEMENT =====
      case "biz_file_image_ad_search":
      case "biz_file_image_ad_info":
      case "biz_file_image_ad_upload":
      case "biz_file_image_ad_update":
      case "biz_file_video_ad_search":
      case "biz_file_video_ad_info":
      case "biz_file_video_ad_upload":
      case "biz_file_video_ad_update":
      case "biz_file_video_smart_tag_programs":
      case "biz_file_video_smart_tag_upload":
      case "biz_file_video_suggestcover":
      case "biz_video_template_task_create":
      case "biz_video_template_status_get":
      case "biz_file_music_get":
      case "biz_file_music_upload":
      case "biz_creative_status_get":
      case "biz_creative_quick_optimization_create":
      case "biz_creative_smart_video_create":
      case "biz_creative_ads_preview_create":
      case "biz_creative_video_soundtrack_create":
      case "biz_creative_image_edit":
      case "biz_creative_asset_share":
      case "biz_creative_shareable_link_create":
      case "biz_creative_app_center_user_record":
      case "biz_creative_app_center_advanced_function_check":
      case "biz_file_delete":
      case "biz_creative_asset_delete":
      case "biz_smart_plus_ad_preview":
      case "biz_creative_report_get":
      case "biz_playable_get":
      case "biz_playable_validate":
      case "biz_playable_upload":
      case "biz_playable_save":
      case "biz_playable_delete":
      case "biz_audit_machine_audit":
      case "biz_page_get":
      case "biz_tt_video_info":
      case "biz_tt_video_authorize":
      case "biz_tt_video_unbind":
      case "biz_tt_video_list":
      case "biz_identity_create":
      case "biz_identity_get":
      case "biz_identity_info":
      case "biz_identity_video_get":
      case "biz_identity_video_info":
      case "biz_identity_music_authorization":
      case "biz_identity_live_get":
      case "biz_identity_delete":
      case "biz_creative_tag_report_get":
      case "biz_creative_portfolio_create":
      case "biz_creative_portfolio_get":
      case "biz_creative_cta_recommend":
      case "biz_creative_portfolio_list":
      case "biz_creative_portfolio_delete":
      case "biz_creative_smart_text_generate":
      case "biz_creative_smart_text_feedback":
      case "biz_dynamic_scene_material_submit":
      case "biz_dynamic_scene_task_create":
      case "biz_dynamic_scene_get":
      case "biz_dynamic_scene_task_get":
      case "biz_dynamic_scene_report_get":
      case "biz_video_fix_task_create":
      case "biz_video_fix_task_get":
      case "biz_file_name_check":
      case "biz_discovery_trending_list":
      case "biz_discovery_detail":
      case "biz_discovery_video_list":
      case "biz_discovery_cml_video_list":
      case "biz_discovery_cml_trending_list":
      case "biz_discovery_trending_search":
      case "biz_discovery_trending_search_keyword":
      case "biz_discovery_trending_hashtag_list":
      case "biz_discovery_trending_hashtag_detail_get":
      case "biz_discovery_cml_list":
      case "biz_discovery_search":
      case "biz_discovery_search_recommend":
      case "biz_discovery_cml_post_list":
      case "biz_discovery_hashtag_post_list":
      case "biz_creative_shared_folder_associated_advertiser":
      case "biz_creative_shared_folder_create":
      case "biz_creative_shared_folder_advertiser_authorize":
      case "biz_creative_shared_folder_partner":
      case "biz_creative_shared_folder_detail":
      case "biz_creative_auto_message_get":
      case "biz_creative_auto_message_create":
      case "biz_creative_pre_review_task_get":
      case "biz_creative_pre_review_task_create":
      case "biz_creative_gmv_max_pre_review_task_create":
      case "biz_creative_gmv_max_pre_review_task_get":
      // ===== APP MANAGEMENT =====
      case "biz_app_list":
      case "biz_app_info":
      case "biz_app_optimization_event":
      case "biz_app_optimization_event_retargeting":
      case "biz_app_create":
      case "biz_app_update":
      // ===== PIXEL MANAGEMENT =====
      case "biz_pixel_list":
      case "biz_pixel_create":
      case "biz_pixel_update":
      case "biz_pixel_event_create":
      case "biz_pixel_event_update":
      case "biz_pixel_event_delete":
      case "biz_pixel_instant_page_event":
      case "biz_pixel_event_stats":
      case "biz_pixel_event_health_reporting":
      // ===== DPA CATALOG MANAGEMENT =====
      case "biz_catalog_get":
      case "biz_catalog_lexicon_get":
      case "biz_catalog_overview":
      case "biz_catalog_location_currency_get":
      case "biz_catalog_available_country_get":
      case "biz_catalog_create":
      case "biz_catalog_update":
      case "biz_catalog_delete":
      case "biz_catalog_capitalize":
      case "biz_catalog_product_get":
      case "biz_catalog_product_log":
      case "biz_catalog_product_upload":
      case "biz_catalog_product_delete":
      case "biz_catalog_product_upload_file":
      case "biz_catalog_product_file":
      case "biz_catalog_product_update":
      case "biz_catalog_product_appeal":
      case "biz_catalog_product_single_upload":
      case "biz_catalog_set_get":
      case "biz_catalog_set_product_get":
      case "biz_catalog_set_create":
      case "biz_catalog_set_update":
      case "biz_catalog_set_delete":
      case "biz_catalog_set_upload":
      case "biz_catalog_video_package_get":
      case "biz_catalog_video_log":
      case "biz_catalog_video_package_update":
      case "biz_catalog_video_package_create":
      case "biz_catalog_video_package_delete":
      case "biz_catalog_video_package_audit":
      case "biz_catalog_video_file":
      case "biz_catalog_video_delete":
      case "biz_catalog_template_upload":
      case "biz_catalog_template_preview_create":
      case "biz_catalog_eventsource_bind_get":
      case "biz_diagnostic_catalog_eventsource_metric":
      case "biz_diagnostic_catalog_eventsource_issue":
      case "biz_catalog_eventsource_bind":
      case "biz_catalog_eventsource_unbind":
      case "biz_catalog_feed_get":
      case "biz_catalog_feed_log":
      case "biz_catalog_feed_create":
      case "biz_catalog_feed_update":
      case "biz_catalog_feed_delete":
      case "biz_catalog_feed_switch":
      case "biz_diagnostic_catalog_product_task_create":
      case "biz_diagnostic_catalog":
      case "biz_diagnostic_catalog_product_task_get":
      case "biz_catalog_insight_product_get":
      case "biz_catalog_insight_filter_get":
      case "biz_catalog_insight_category_get":
      // ===== REACH & FREQUENCY =====
      case "biz_adgroup_rf_create":
      case "biz_adgroup_rf_update":
      case "biz_adgroup_rf_estimated_info":
      case "biz_rf_inventory_estimate":
      case "biz_rf_order_cancel":
      case "biz_rf_contract_query":
      case "biz_rf_delivery_timezone":
      // ===== LEAD MANAGEMENT =====
      case "biz_pages_fields_get":
      case "biz_page_lead_get":
      case "biz_lead_field_get":
      case "biz_lead_get":
      case "biz_page_lead_mock_create":
      case "biz_page_lead_mock_get":
      case "biz_page_lead_mock_delete":
      case "biz_page_field_get":
      case "biz_page_lead_task_download":
      case "biz_page_lead_task":
      // ===== TCM (CREATOR MARKETPLACE) =====
      case "biz_tto_tcm_campaign_create":
      case "biz_tto_tcm_campaign_link":
      case "biz_tto_tcm_anchor_create":
      case "biz_tto_tcm_anchor_delete":
      case "biz_tto_tcm_brand_profile_create":
      case "biz_tto_tcm_campaign_update":
      case "biz_tto_brand_profile_create":
      case "biz_tto_campaign_create":
      case "biz_tto_campaign_update":
      case "biz_tto_campaign_link":
      case "biz_tto_anchor_create":
      case "biz_tto_anchor_delete":
      case "biz_tcm_order_get_v2":
      case "biz_tto_tcm_campaign":
      case "biz_tto_tcm_report":
      case "biz_tto_tcm_category_label":
      case "biz_tto_tcm_rank":
      case "biz_tto_tcm_creator_discover":
      case "biz_tto_tcm_campaign_link_status":
      case "biz_tto_tcm_anchor_get":
      case "biz_tto_tcm_brand_profile_get":
      case "biz_tto_oauth2_info":
      case "biz_tto_tcm_audience_match":
      case "biz_tcm_report_get_v2":
      case "biz_tto_oauth2_tcm":
      case "biz_tto_oauth2_get":
      case "biz_tto_info_get":
      case "biz_tto_audience_creator_match":
      case "biz_tto_creator_category_label":
      case "biz_tto_creator_rank_scoreboard":
      case "biz_tto_creator_discover":
      case "biz_tto_brand_profile_get":
      case "biz_tto_campaign_get":
      case "biz_tto_campaign_link_status_get":
      case "biz_tto_campaign_report_get":
      case "biz_tto_anchor_get":
      case "biz_tto_tcm_creator_status_get":
      case "biz_tto_creator_status_get":
      case "biz_tcm_tt_video_status":
      case "biz_tcm_tt_video_apply":
      case "biz_tto_campaign_video_auth_apply":
      case "biz_tto_campaign_video_auth_status_get":
      // ===== TIKTOK CREATOR =====
      case "biz_tcm_creator_authorized":
      case "biz_tto_tcm_creator_public":
      case "biz_tto_creator_authorized":
      case "biz_tto_creator_authorized_get":
      case "biz_tto_creator_public_get":
      case "biz_tcm_creator_authorized_video_list":
      case "biz_tto_tcm_creator_public_video_list":
      case "biz_tto_creator_authorized_video_list":
      case "biz_tto_creator_public_video_list":
      case "biz_tto_creator_campaign_join":
      case "biz_tto_creator_campaign_video_link":
      case "biz_tto_creator_link_request_confirm":
      case "biz_tto_creator_link_request_get":
      // ===== AD COMMENTS =====
      case "biz_comment_list":
      case "biz_comment_reference":
      case "biz_comment_task_create":
      case "biz_comment_task_check":
      case "biz_comment_task_download":
      case "biz_comment_status_update":
      case "biz_comment_delete":
      case "biz_comment_post":
      case "biz_blockedword_list":
      case "biz_blockedword_task_create":
      case "biz_blockedword_task_check":
      case "biz_blockedword_task_download":
      case "biz_blockedword_check":
      case "biz_blockedword_create":
      case "biz_blockedword_update":
      case "biz_blockedword_delete":
      // ===== TIKTOK BUSINESS PLUGIN =====
      case "biz_tbp_business_profile_get":
      case "biz_tbp_business_profile_disconnect":
      // ===== AUTOMATED RULES =====
      case "biz_optimizer_rule_create":
      case "biz_optimizer_rule_update":
      case "biz_optimizer_rule_batch_bind":
      case "biz_optimizer_rule_update_status":
      case "biz_optimizer_rule_get":
      case "biz_optimizer_rule_list":
      case "biz_optimizer_rule_result_get":
      case "biz_optimizer_rule_result_list":
      // ===== ONSITE COMMERCE STORE =====
      case "biz_commerce_store_create":
      case "biz_commerce_store_bind_to_catalog":
      case "biz_commerce_window_update":
      case "biz_commerce_store_get":
      case "biz_commerce_store_product_get":
      case "biz_commerce_store_trusted_create":
      case "biz_store_list":
      case "biz_store_product_get":
      // ===== OFFLINE EVENTS MANAGEMENT =====
      case "biz_offline_create":
      case "biz_offline_update":
      case "biz_offline_delete":
      case "biz_offline_track":
      case "biz_offline_batch":
      case "biz_offline_get":
      // ===== AD DIAGNOSIS =====
      case "biz_tool_diagnosis_get":
      // ===== MENTIONS =====
      case "biz_business_mention_top_word_list":
      case "biz_business_mention_top_hashtag_list":
      case "biz_business_mention_video_list":
      case "biz_business_mention_hashtag_video_list":
      case "biz_business_mention_video_get":
      case "biz_business_mention_hashtag_verify_list":
      case "biz_business_mention_hashtag_manage_list":
      case "biz_business_mention_hashtag_add":
      case "biz_business_mention_hashtag_remove":
      case "biz_business_mention_comment_list":
      case "biz_business_mention_comment_get":
      // ===== CRM EVENT MANAGEMENT =====
      case "biz_crm_list":
      case "biz_crm_create":
      // ===== BUSINESS RECOMMENDATION =====
      case "biz_business_video_recommend":
      case "biz_spark_ad_recommend":
      case "biz_tto_post_recommend":
      // ===== CTX EVENTS MANAGEMENT =====
      case "biz_ctm_create":
      case "biz_ctm_get_or_create":
      case "biz_ctm_message_event_set_get":
      case "biz_ctm_list":
      // ===== BRAND SAFETY =====
      case "biz_video_exclusion_list_get":
      case "biz_video_exclusion_list_update":
      case "biz_video_exclusion_list_change_log":
      case "biz_video_exclusion_list_change_log_id":
      case "biz_tiktok_inventory_filters_get":
      case "biz_tiktok_inventory_filters_update":
      case "biz_profile_exclusion_list_get":
      case "biz_profile_exclusion_list_update":
      case "biz_profile_exclusion_list_change_log":
      // ===== PARTNER INSIGHTS =====
      case "biz_partner_insights_update":
      // ===== PAYMENT PORTFOLIO =====
      case "biz_payment_portfolio_create":
      case "biz_payment_portfolio_advertiser_update":
      case "biz_payment_portfolio_credit_line_update":
      case "biz_payment_portfolio_get":
      case "biz_payment_portfolio_advertiser_get":
      case "biz_payment_portfolio_user_get":
      // ===== CUSTOM CONVERSION MANAGEMENT =====
      case "biz_custom_conversion_create":
      case "biz_custom_conversion_update":
      case "biz_custom_conversion_delete":
      case "biz_custom_conversion_get":
      case "biz_custom_conversion_list":
      // ===== MINIS MANAGEMENT =====
      case "biz_minis_get":
      // ===== DIRECT MESSAGES (Business API) =====
      case "biz_direct_message_send":
      case "biz_direct_message_get":
      case "biz_direct_message_list":
      case "biz_message_send":
      case "biz_message_list":
      case "biz_conversation_list":
      case "biz_conversation_get":
      // ===== BUSINESS MESSAGING API (Organic - DMs for Business Accounts) =====
      // Direct Message Management
      case "biz_business_message_send":
      case "biz_business_message_list":
      case "biz_business_message_get":
      case "biz_business_conversation_list":
      case "biz_business_conversation_get":
      case "biz_business_conversation_read":
      case "biz_business_dm_send":
      case "biz_business_dm_list":
      case "biz_business_dm_get":
      case "biz_business_dm_conversation_list":
      case "biz_business_dm_conversation_get":
      // Welcome Message Management
      case "biz_business_welcome_message_get":
      case "biz_business_welcome_message_create":
      case "biz_business_welcome_message_update":
      case "biz_business_welcome_message_delete":
      // Suggested Questions Management
      case "biz_business_suggested_question_get":
      case "biz_business_suggested_question_create":
      case "biz_business_suggested_question_update":
      case "biz_business_suggested_question_delete":
      case "biz_business_suggested_question_list":
      // Chat Prompts Management
      case "biz_business_chat_prompt_get":
      case "biz_business_chat_prompt_create":
      case "biz_business_chat_prompt_update":
      case "biz_business_chat_prompt_delete":
      case "biz_business_chat_prompt_list":
      // Keyword Reply / Auto-Reply
      case "biz_business_keyword_reply_get":
      case "biz_business_keyword_reply_create":
      case "biz_business_keyword_reply_update":
      case "biz_business_keyword_reply_delete":
      case "biz_business_keyword_reply_list":
      // Unlock Conversations
      case "biz_business_unlock_conversation":
      case "biz_business_conversation_unlock":
      // Messaging Limits
      case "biz_business_messaging_limit_get":
      case "biz_business_messaging_quota_get":
      // Business Messaging Webhooks
      case "biz_business_messaging_webhook_create":
      case "biz_business_messaging_webhook_get":
      case "biz_business_messaging_webhook_update":
      case "biz_business_messaging_webhook_delete":
      // Auto Message (Organic Accounts API)
      case "biz_business_auto_message_get":
      case "biz_business_auto_message_create":
      case "biz_business_auto_message_update":
      case "biz_business_auto_message_delete":
      case "biz_business_auto_message_list":
      // Mentions Comments (messaging-related)
      case "biz_business_mention_comment_reply":
      // Subscription / Webhook for Business Messaging events
      case "biz_business_messaging_subscription_create":
      case "biz_business_messaging_subscription_get":
      case "biz_business_messaging_subscription_delete": {
        // All Business API v1.3 actions route through the same proxy logic
        const BIZ_BASE = "https://business-api.tiktok.com/open_api/v1.3";
        // Convert action name to API path: biz_campaign_get → /campaign/get/
        const actionPath = action.replace(/^biz_/, "").replace(/_/g, "/");
        const bizEndpoint = params?.endpoint || `/${actionPath}/`;
        const bizMethod = (params?.method || "GET").toUpperCase();
        const bizQuery = params?.query ? "?" + new URLSearchParams(params.query).toString() : "";
        const bizUrl = `${BIZ_BASE}${bizEndpoint}${bizQuery}`;
        const bizHeaders: Record<string, string> = {
          "Access-Token": token!,
          "Content-Type": "application/json",
        };
        const bizOpts: RequestInit = { method: bizMethod, headers: bizHeaders };
        if (params?.body && ["POST", "PUT", "PATCH"].includes(bizMethod)) {
          bizOpts.body = JSON.stringify(params.body);
        }
        console.log(`[BIZ_API] ${bizMethod} ${bizUrl}`);
        const bizResp = await fetch(bizUrl, bizOpts);
        result = await bizResp.json();
        break;
      }

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

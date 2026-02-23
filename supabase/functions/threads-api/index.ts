import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const THREADS_API = "https://graph.threads.net/v1.0";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "threads").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("Threads not connected for this account");
  return data;
}

async function threadsFetch(endpoint: string, token: string, method = "GET", body?: any, formEncoded = false) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `${THREADS_API}${endpoint}${sep}access_token=${token}`;
  const opts: any = { method };
  if (body && method !== "GET") {
    if (formEncoded) {
      opts.headers = { "Content-Type": "application/x-www-form-urlencoded" };
      opts.body = new URLSearchParams(body).toString();
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
  }
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await resp.text();
    console.error("Threads non-JSON response:", resp.status, text.substring(0, 300));
    if (resp.status === 404) throw new Error("This Threads API endpoint is not available (404). This feature may require approved scopes.");
    throw new Error(`Threads API returned non-JSON (status ${resp.status}). This may indicate an expired token or rate limit.`);
  }
  const data = await resp.json();
  if (data.error) throw new Error(`Threads API: ${data.error.message}`);
  return data;
}

// All available media fields for comprehensive retrieval
const MEDIA_FIELDS = "id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post,quoted_post,has_replies,root_post,replied_to,is_reply,is_reply_owned_by_me,reply_audience,hide_status,reply_approval_status,topic_tag,gif_url,poll_attachment,link_attachment_url,reposted_post,is_verified,profile_picture_url,alt_text";

const USER_REPLY_FIELDS = "id,media_product_type,media_type,media_url,permalink,username,text,topic_tag,timestamp,shortcode,thumbnail_url,children,is_quote_post,quoted_post,has_replies,root_post,replied_to,is_reply,is_reply_owned_by_me,reply_audience,gif_url,poll_attachment,is_verified,profile_picture_url";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let result: any;

    // ===== OAUTH =====
    if (action === "get_app_id") {
      const appId = Deno.env.get("THREADS_APP_ID");
      return new Response(JSON.stringify({ success: true, app_id: appId || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      const { code, client_id, client_secret, redirect_uri } = params;
      const finalClientId = (client_id || Deno.env.get("THREADS_APP_ID") || "").trim();
      const finalClientSecret = (client_secret || Deno.env.get("THREADS_APP_SECRET") || "").trim();
      if (!code || !finalClientId || !finalClientSecret) throw new Error("Missing code, client_id, or client_secret");
      const resp = await fetch(`${THREADS_API}/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: finalClientId, client_secret: finalClientSecret, code, grant_type: "authorization_code", redirect_uri }).toString(),
      });
      const shortToken = await resp.json();
      if (shortToken.error_message) throw new Error(shortToken.error_message);
      const longResp = await fetch(`${THREADS_API}/access_token?grant_type=th_exchange_token&client_secret=${finalClientSecret}&access_token=${shortToken.access_token}`);
      const longToken = await longResp.json();
      result = { ...shortToken, ...longToken };
      return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // All other actions need connection
    const conn = await getConnection(supabase, account_id);
    const userId = conn.platform_user_id || "me";

    switch (action) {
      // ===== TOKEN MANAGEMENT =====
      case "refresh_token": {
        const resp = await fetch(`${THREADS_API}/refresh_access_token?grant_type=th_refresh_token&access_token=${conn.access_token}`);
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

      // ===== PROFILE =====
      case "get_profile": {
        result = await threadsFetch(`/me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified`, conn.access_token);
        break;
      }
      case "get_user_profile": {
        result = await threadsFetch(`/${params.user_id}?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified`, conn.access_token);
        break;
      }

      // ===== PROFILE DISCOVERY (public lookup by username) =====
      case "discover_profile": {
        const username = params.username;
        if (!username) throw new Error("Username is required for profile discovery");
        result = await threadsFetch(`/profile_lookup?username=${encodeURIComponent(username)}&fields=username,name,profile_picture_url,biography,is_verified,follower_count,likes_count,quotes_count,reposts_count,views_count`, conn.access_token);
        break;
      }

      // ===== THREADS (Posts) =====
      case "get_threads": {
        const limit = params?.limit || 25;
        const cursor = params?.after ? `&after=${params.after}` : "";
        const since = params?.since ? `&since=${params.since}` : "";
        const until = params?.until ? `&until=${params.until}` : "";
        result = await threadsFetch(`/${userId}/threads?fields=${MEDIA_FIELDS}&limit=${limit}${cursor}${since}${until}`, conn.access_token);
        break;
      }
      case "get_thread": {
        result = await threadsFetch(`/${params.thread_id}?fields=${MEDIA_FIELDS}`, conn.access_token);
        break;
      }

      // ===== USER REPLIES =====
      case "get_user_replies": {
        const limit = params?.limit || 25;
        const cursor = params?.after ? `&after=${params.after}` : "";
        const since = params?.since ? `&since=${params.since}` : "";
        const until = params?.until ? `&until=${params.until}` : "";
        result = await threadsFetch(`/${userId}/replies?fields=${USER_REPLY_FIELDS}&limit=${limit}${cursor}${since}${until}`, conn.access_token);
        break;
      }

      // ===== DELETE =====
      case "delete_thread": {
        const resp = await fetch(`${THREADS_API}/${params.thread_id}?access_token=${conn.access_token}`, { method: "DELETE" });
        if (resp.status === 204) { result = { success: true }; break; }
        result = await resp.json();
        break;
      }

      // ===== REPOST =====
      case "repost": {
        const resp = await fetch(`${THREADS_API}/${params.thread_id}/repost?access_token=${conn.access_token}`, { method: "POST" });
        result = await resp.json();
        if (result.error) throw new Error(result.error.message);
        break;
      }

      // ===== PUBLISH =====
      case "create_text_thread": {
        const cp = new URLSearchParams({ media_type: "TEXT", text: params.text, access_token: conn.access_token });
        if (params.reply_to_id) cp.set("reply_to_id", params.reply_to_id);
        if (params.quote_post_id) cp.set("quote_post_id", params.quote_post_id);
        if (params.reply_control) cp.set("reply_control", params.reply_control);
        if (params.link_attachment) cp.set("link_attachment", params.link_attachment);
        if (params.topic_tag) cp.set("topic_tag", params.topic_tag);
        if (params.gif_attachment) cp.set("gif_attachment", JSON.stringify(params.gif_attachment));
        if (params.poll_attachment) cp.set("poll_attachment", JSON.stringify(params.poll_attachment));
        if (params.enable_reply_approvals) cp.set("enable_reply_approvals", "true");
        if (params.is_spoiler) cp.set("is_spoiler", "true");
        if (params.is_ghost_post) cp.set("allowlisted_country_codes", "[]"); // ghost post = no countries
        if (params.allowlisted_country_codes) cp.set("allowlisted_country_codes", JSON.stringify(params.allowlisted_country_codes));
        const containerResp = await fetch(`${THREADS_API}/${userId}/threads?${cp.toString()}`, { method: "POST" });
        const container = await containerResp.json();
        if (container.error) throw new Error(container.error.message);
        await new Promise(r => setTimeout(r, 1000));
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${container.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        if (result.error) throw new Error(result.error.message);
        if (result.id) {
          await supabase.from("social_posts").insert({
            account_id, platform: "threads", platform_post_id: result.id,
            post_type: "text", caption: params.text, status: "published",
            published_at: new Date().toISOString(),
          }).then(() => {});
        }
        break;
      }
      case "create_image_thread": {
        const cp = new URLSearchParams({ media_type: "IMAGE", image_url: params.image_url, text: params.text || "", access_token: conn.access_token });
        if (params.reply_to_id) cp.set("reply_to_id", params.reply_to_id);
        if (params.reply_control) cp.set("reply_control", params.reply_control);
        if (params.quote_post_id) cp.set("quote_post_id", params.quote_post_id);
        if (params.topic_tag) cp.set("topic_tag", params.topic_tag);
        if (params.alt_text) cp.set("alt_text", params.alt_text);
        if (params.enable_reply_approvals) cp.set("enable_reply_approvals", "true");
        if (params.is_spoiler) cp.set("is_spoiler", "true");
        if (params.allowlisted_country_codes) cp.set("allowlisted_country_codes", JSON.stringify(params.allowlisted_country_codes));
        if (params.location_id) cp.set("location_id", params.location_id);
        const containerResp = await fetch(`${THREADS_API}/${userId}/threads?${cp.toString()}`, { method: "POST" });
        const container = await containerResp.json();
        if (container.error) throw new Error(container.error.message);
        await new Promise(r => setTimeout(r, 1500));
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${container.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        if (result.error) throw new Error(result.error.message);
        break;
      }
      case "create_video_thread": {
        const cp = new URLSearchParams({ media_type: "VIDEO", video_url: params.video_url, text: params.text || "", access_token: conn.access_token });
        if (params.reply_control) cp.set("reply_control", params.reply_control);
        if (params.reply_to_id) cp.set("reply_to_id", params.reply_to_id);
        if (params.quote_post_id) cp.set("quote_post_id", params.quote_post_id);
        if (params.topic_tag) cp.set("topic_tag", params.topic_tag);
        if (params.alt_text) cp.set("alt_text", params.alt_text);
        if (params.enable_reply_approvals) cp.set("enable_reply_approvals", "true");
        if (params.is_spoiler) cp.set("is_spoiler", "true");
        if (params.allowlisted_country_codes) cp.set("allowlisted_country_codes", JSON.stringify(params.allowlisted_country_codes));
        if (params.location_id) cp.set("location_id", params.location_id);
        const containerResp = await fetch(`${THREADS_API}/${userId}/threads?${cp.toString()}`, { method: "POST" });
        const container = await containerResp.json();
        if (container.error) throw new Error(container.error.message);
        await new Promise(r => setTimeout(r, 2000));
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${container.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        if (result.error) throw new Error(result.error.message);
        break;
      }
      case "create_carousel_thread": {
        const itemIds: string[] = [];
        for (const item of params.items || []) {
          const ip = new URLSearchParams({ media_type: item.media_type || "IMAGE", is_carousel_item: "true", access_token: conn.access_token });
          if (item.image_url) ip.set("image_url", item.image_url);
          if (item.video_url) ip.set("video_url", item.video_url);
          if (item.alt_text) ip.set("alt_text", item.alt_text);
          const itemResp = await fetch(`${THREADS_API}/${userId}/threads?${ip.toString()}`, { method: "POST" });
          const itemData = await itemResp.json();
          if (itemData.error) throw new Error(`Carousel item error: ${itemData.error.message}`);
          if (itemData.id) itemIds.push(itemData.id);
        }
        await new Promise(r => setTimeout(r, 1500));
        const cp = new URLSearchParams({ media_type: "CAROUSEL", children: itemIds.join(","), text: params.text || "", access_token: conn.access_token });
        if (params.reply_control) cp.set("reply_control", params.reply_control);
        if (params.topic_tag) cp.set("topic_tag", params.topic_tag);
        if (params.quote_post_id) cp.set("quote_post_id", params.quote_post_id);
        if (params.reply_to_id) cp.set("reply_to_id", params.reply_to_id);
        if (params.enable_reply_approvals) cp.set("enable_reply_approvals", "true");
        if (params.is_spoiler) cp.set("is_spoiler", "true");
        if (params.allowlisted_country_codes) cp.set("allowlisted_country_codes", JSON.stringify(params.allowlisted_country_codes));
        if (params.location_id) cp.set("location_id", params.location_id);
        const carouselResp = await fetch(`${THREADS_API}/${userId}/threads?${cp.toString()}`, { method: "POST" });
        const carousel = await carouselResp.json();
        if (carousel.error) throw new Error(carousel.error.message);
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${carousel.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        if (result.error) throw new Error(result.error.message);
        break;
      }

      // ===== MEDIA CONTAINER STATUS =====
      case "get_container_status": {
        result = await threadsFetch(`/${params.container_id}?fields=status,error_message`, conn.access_token);
        break;
      }

      // ===== REPLIES =====
      case "get_replies": {
        const fields = "id,text,username,permalink,timestamp,media_type,media_url,shortcode,thumbnail_url,is_quote_post,hide_status,has_replies,root_post,replied_to,is_reply,is_reply_owned_by_me,reply_audience,topic_tag,is_verified,profile_picture_url";
        result = await threadsFetch(`/${params.thread_id}/replies?fields=${fields}&limit=${params?.limit || 25}${params?.reverse === false ? "&reverse=false" : ""}`, conn.access_token);
        break;
      }
      case "get_conversation": {
        result = await threadsFetch(`/${params.thread_id}/conversation?fields=id,text,username,permalink,timestamp,media_type,media_url,hide_status,has_replies,root_post,replied_to,is_reply,is_reply_owned_by_me,topic_tag,is_verified,profile_picture_url&limit=${params?.limit || 25}${params?.reverse === false ? "&reverse=false" : ""}`, conn.access_token);
        break;
      }
      case "hide_reply": {
        const resp = await fetch(`${THREADS_API}/${params.reply_id}/manage_reply`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ hide: params.hide !== false ? "true" : "false", access_token: conn.access_token }).toString(),
        });
        result = await resp.json();
        break;
      }

      // ===== REPLY APPROVALS =====
      case "get_pending_replies": {
        const fields = "id,text,topic_tag,timestamp,media_product_type,media_type,media_url,shortcode,thumbnail_url,children,has_replies,root_post,replied_to,is_reply,hide_status,reply_approval_status,username,is_verified,profile_picture_url";
        let qs = `fields=${fields}`;
        if (params?.reverse === false) qs += "&reverse=false";
        if (params?.approval_status) qs += `&approval_status=${params.approval_status}`;
        result = await threadsFetch(`/${params.thread_id}/pending_replies?${qs}`, conn.access_token);
        break;
      }
      case "manage_pending_reply": {
        const resp = await fetch(`${THREADS_API}/${params.reply_id}/manage_pending_reply`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ approve: params.approve ? "true" : "false", access_token: conn.access_token }).toString(),
        });
        result = await resp.json();
        break;
      }

      // ===== MENTIONS =====
      case "get_mentions": {
        result = await threadsFetch(`/${userId}/mentions?fields=${MEDIA_FIELDS}&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== KEYWORD SEARCH =====
      case "keyword_search": {
        let qs = `q=${encodeURIComponent(params.query)}&fields=id,text,username,permalink,timestamp,media_type,media_url,has_replies,is_quote_post,is_reply,topic_tag,is_verified,profile_picture_url`;
        if (params.search_type) qs += `&search_type=${params.search_type}`;
        if (params.search_mode) qs += `&search_mode=${params.search_mode}`;
        if (params.media_type) qs += `&media_type=${params.media_type}`;
        if (params.since) qs += `&since=${params.since}`;
        if (params.until) qs += `&until=${params.until}`;
        if (params.author_username) qs += `&author_username=${encodeURIComponent(params.author_username)}`;
        qs += `&limit=${params?.limit || 25}`;
        result = await threadsFetch(`/keyword_search?${qs}`, conn.access_token);
        break;
      }

      // ===== RECENTLY SEARCHED KEYWORDS =====
      case "get_recent_searches": {
        result = await threadsFetch(`/${userId}/recent_keyword_searches`, conn.access_token);
        break;
      }

      // ===== INSIGHTS =====
      case "get_thread_insights": {
        result = await threadsFetch(`/${params.thread_id}/insights?metric=views,likes,replies,reposts,quotes,shares`, conn.access_token);
        break;
      }
      case "get_user_insights": {
        let qs = `metric=${params.metric || "views,likes,replies,reposts,quotes,followers_count"}`;
        if (params.since) qs += `&since=${params.since}`;
        if (params.until) qs += `&until=${params.until}`;
        if (params.breakdown) qs += `&breakdown=${params.breakdown}`;
        result = await threadsFetch(`/${userId}/threads_insights?${qs}`, conn.access_token);
        break;
      }

      // ===== PUBLISHING LIMIT =====
      case "get_publishing_limit": {
        result = await threadsFetch(`/${userId}/threads_publishing_limit?fields=quota_usage,config`, conn.access_token);
        break;
      }

      // ===== LOCATION =====
      case "search_locations": {
        let qs = `fields=id,name,address`;
        if (params.query) qs += `&q=${encodeURIComponent(params.query)}`;
        if (params.latitude && params.longitude) qs += `&latitude=${params.latitude}&longitude=${params.longitude}`;
        qs += `&limit=${params?.limit || 10}`;
        result = await threadsFetch(`/threads/location_search?${qs}`, conn.access_token);
        break;
      }

      // ===== REPLY CONTROL (read) =====
      case "get_reply_control": {
        result = await threadsFetch(`/${params.thread_id}?fields=reply_audience`, conn.access_token);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("Threads API error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

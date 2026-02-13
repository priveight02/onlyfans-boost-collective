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

async function threadsFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `${THREADS_API}${endpoint}${sep}access_token=${token}`;
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.error) throw new Error(`Threads API: ${data.error.message}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let result: any;

    switch (action) {
      // ===== OAUTH =====
      case "exchange_code": {
        const { code, client_id, client_secret, redirect_uri } = params;
        // Short-lived token
        const resp = await fetch(`${THREADS_API}/oauth/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id, client_secret, code, grant_type: "authorization_code", redirect_uri }).toString(),
        });
        const shortToken = await resp.json();
        if (shortToken.error_message) throw new Error(shortToken.error_message);
        // Exchange for long-lived token
        const longResp = await fetch(`${THREADS_API}/access_token?grant_type=th_exchange_token&client_secret=${client_secret}&access_token=${shortToken.access_token}`);
        const longToken = await longResp.json();
        result = { ...shortToken, ...longToken };
        return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "refresh_token": {
        const conn = await getConnection(supabase, account_id);
        const resp = await fetch(`${THREADS_API}/refresh_access_token?grant_type=th_refresh_token&access_token=${conn.access_token}`);
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({ access_token: result.access_token, token_expires_at: new Date(Date.now() + (result.expires_in || 5184000) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", conn.id);
        }
        break;
      }

      // ===== PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/me?fields=id,username,name,threads_profile_picture_url,threads_biography`, conn.access_token);
        break;
      }
      case "get_user_profile": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/${params.user_id}?fields=id,username,name,threads_profile_picture_url,threads_biography`, conn.access_token);
        break;
      }

      // ===== THREADS (Posts) =====
      case "get_threads": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/me/threads?fields=id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_thread": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/${params.thread_id}?fields=id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post`, conn.access_token);
        break;
      }

      // ===== PUBLISH =====
      case "create_text_thread": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id || "me";
        // Create container
        const containerParams = new URLSearchParams({ media_type: "TEXT", text: params.text, access_token: conn.access_token });
        if (params.reply_to_id) containerParams.set("reply_to_id", params.reply_to_id);
        if (params.quote_post_id) containerParams.set("quote_post_id", params.quote_post_id);
        const containerResp = await fetch(`${THREADS_API}/${userId}/threads?${containerParams.toString()}`, { method: "POST" });
        const container = await containerResp.json();
        if (container.error) throw new Error(container.error.message);
        // Publish
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${container.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        break;
      }
      case "create_image_thread": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id || "me";
        const containerParams = new URLSearchParams({ media_type: "IMAGE", image_url: params.image_url, text: params.text || "", access_token: conn.access_token });
        if (params.reply_to_id) containerParams.set("reply_to_id", params.reply_to_id);
        const containerResp = await fetch(`${THREADS_API}/${userId}/threads?${containerParams.toString()}`, { method: "POST" });
        const container = await containerResp.json();
        if (container.error) throw new Error(container.error.message);
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${container.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        break;
      }
      case "create_video_thread": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id || "me";
        const containerParams = new URLSearchParams({ media_type: "VIDEO", video_url: params.video_url, text: params.text || "", access_token: conn.access_token });
        const containerResp = await fetch(`${THREADS_API}/${userId}/threads?${containerParams.toString()}`, { method: "POST" });
        const container = await containerResp.json();
        if (container.error) throw new Error(container.error.message);
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${container.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        break;
      }
      case "create_carousel_thread": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id || "me";
        // Create item containers
        const itemIds: string[] = [];
        for (const item of params.items || []) {
          const itemParams = new URLSearchParams({ media_type: item.media_type || "IMAGE", is_carousel_item: "true", access_token: conn.access_token });
          if (item.image_url) itemParams.set("image_url", item.image_url);
          if (item.video_url) itemParams.set("video_url", item.video_url);
          const itemResp = await fetch(`${THREADS_API}/${userId}/threads?${itemParams.toString()}`, { method: "POST" });
          const itemData = await itemResp.json();
          if (itemData.id) itemIds.push(itemData.id);
        }
        // Create carousel container
        const carouselParams = new URLSearchParams({ media_type: "CAROUSEL", children: itemIds.join(","), text: params.text || "", access_token: conn.access_token });
        const carouselResp = await fetch(`${THREADS_API}/${userId}/threads?${carouselParams.toString()}`, { method: "POST" });
        const carousel = await carouselResp.json();
        const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish?creation_id=${carousel.id}&access_token=${conn.access_token}`, { method: "POST" });
        result = await publishResp.json();
        break;
      }

      // ===== REPLIES =====
      case "get_replies": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/${params.thread_id}/replies?fields=id,text,username,permalink,timestamp,media_type,media_url,shortcode,thumbnail_url,is_quote_post&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_conversation": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/${params.thread_id}/conversation?fields=id,text,username,permalink,timestamp,media_type,media_url&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== MANAGE REPLY =====
      case "hide_reply": {
        const conn = await getConnection(supabase, account_id);
        const resp = await fetch(`${THREADS_API}/${params.reply_id}?hide=${params.hide !== false}&access_token=${conn.access_token}`, { method: "POST" });
        result = await resp.json();
        break;
      }
      case "get_reply_control": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/${params.thread_id}?fields=reply_audience`, conn.access_token);
        break;
      }

      // ===== INSIGHTS =====
      case "get_thread_insights": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/${params.thread_id}/insights?metric=views,likes,replies,reposts,quotes`, conn.access_token);
        break;
      }
      case "get_user_insights": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id || "me";
        const period = params.period || "last_30_days";
        result = await threadsFetch(`/${userId}/threads_insights?metric=views,likes,replies,reposts,quotes,followers_count,follower_demographics&period=${period}`, conn.access_token);
        break;
      }

      // ===== SEARCH =====
      case "search_threads": {
        const conn = await getConnection(supabase, account_id);
        result = await threadsFetch(`/me/threads?fields=id,text,username,timestamp,permalink&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== PUBLISHING LIMIT =====
      case "get_publishing_limit": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id || "me";
        result = await threadsFetch(`/${userId}/threads_publishing_limit?fields=quota_usage,config`, conn.access_token);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

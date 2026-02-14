import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v24.0";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "facebook").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("Facebook not connected for this account");
  return data;
}

async function fbFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `${GRAPH_API}${endpoint}${sep}access_token=${token}`;
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.error) throw new Error(`Facebook API: ${data.error.message}`);
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
        const resp = await fetch(`${GRAPH_API}/oauth/access_token?client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`);
        result = await resp.json();
        if (result.error) throw new Error(result.error.message);
        return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ===== PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me?fields=id,name,email,picture.width(200),link,birthday,location,about`, conn.access_token);
        break;
      }
      case "get_user": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.user_id}?fields=id,name,picture.width(200),link`, conn.access_token);
        break;
      }

      // ===== PAGES =====
      case "get_pages": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/accounts?fields=id,name,access_token,category,fan_count,picture&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_page": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}?fields=id,name,about,category,fan_count,followers_count,picture,cover,website,phone,emails,location`, conn.access_token);
        break;
      }

      // ===== POSTS =====
      case "get_feed": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        result = await fbFetch(`/${target}/feed?fields=id,message,created_time,full_picture,permalink_url,shares,type,status_type&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_post": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.post_id}?fields=id,message,created_time,full_picture,permalink_url,shares,type,status_type,reactions.summary(true),comments.summary(true)`, conn.access_token);
        break;
      }
      case "create_post": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        const token = params.page_access_token || conn.access_token;
        const postParams: any = {};
        if (params.message) postParams.message = params.message;
        if (params.link) postParams.link = params.link;
        result = await fbFetch(`/${target}/feed`, token, "POST", postParams);
        break;
      }
      case "create_photo_post": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        const token = params.page_access_token || conn.access_token;
        result = await fbFetch(`/${target}/photos`, token, "POST", { url: params.image_url, caption: params.caption || "" });
        break;
      }
      case "create_video_post": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        const token = params.page_access_token || conn.access_token;
        result = await fbFetch(`/${target}/videos`, token, "POST", { file_url: params.video_url, description: params.description || "" });
        break;
      }
      case "delete_post": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.post_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== COMMENTS =====
      case "get_comments": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.object_id}/comments?fields=id,message,from,created_time,like_count,comment_count&limit=${params?.limit || 50}`, conn.access_token);
        break;
      }
      case "post_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.object_id}/comments`, conn.access_token, "POST", { message: params.message });
        break;
      }
      case "delete_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.comment_id}`, conn.access_token, "DELETE");
        break;
      }
      case "hide_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.comment_id}`, conn.access_token, "POST", { is_hidden: params.hide !== false });
        break;
      }

      // ===== REACTIONS =====
      case "get_reactions": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.object_id}/reactions?summary=true&limit=${params?.limit || 50}`, conn.access_token);
        break;
      }

      // ===== INSIGHTS =====
      case "get_page_insights": {
        const conn = await getConnection(supabase, account_id);
        const metrics = params.metrics || "page_impressions,page_engaged_users,page_fans,page_views_total";
        result = await fbFetch(`/${params.page_id}/insights?metric=${metrics}&period=${params.period || "day"}`, params.page_access_token || conn.access_token);
        break;
      }
      case "get_post_insights": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.post_id}/insights?metric=post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total`, conn.access_token);
        break;
      }

      // ===== GROUPS =====
      case "get_groups": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/groups?fields=id,name,description,member_count,privacy,picture&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_group_feed": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.group_id}/feed?fields=id,message,from,created_time,permalink_url&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "post_to_group": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.group_id}/feed`, conn.access_token, "POST", { message: params.message });
        break;
      }

      // ===== EVENTS =====
      case "get_events": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        result = await fbFetch(`/${target}/events?fields=id,name,description,start_time,end_time,place,cover&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== ALBUMS / PHOTOS =====
      case "get_albums": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        result = await fbFetch(`/${target}/albums?fields=id,name,count,cover_photo,created_time&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_album_photos": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.album_id}/photos?fields=id,picture,source,name,created_time&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== CONVERSATIONS (Page Inbox) =====
      case "get_conversations": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/conversations?fields=id,updated_time,snippet,message_count,participants&limit=${params?.limit || 20}`, params.page_access_token || conn.access_token);
        break;
      }
      case "get_conversation_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.conversation_id}/messages?fields=id,message,from,created_time,attachments&limit=${params?.limit || 20}`, params.page_access_token || conn.access_token);
        break;
      }
      case "send_page_message": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/messages`, params.page_access_token || conn.access_token, "POST", {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
          messaging_type: "RESPONSE",
        });
        break;
      }

      // ===== SEARCH =====
      case "search_pages": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/pages/search?q=${encodeURIComponent(params.query)}&fields=id,name,category,fan_count,picture&limit=${params?.limit || 10}`, conn.access_token);
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

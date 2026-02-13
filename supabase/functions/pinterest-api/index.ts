import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIN_API = "https://api.pinterest.com/v5";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "pinterest").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("Pinterest not connected for this account");
  return data;
}

async function pinFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${PIN_API}${endpoint}`;
  const opts: any = { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Pinterest API [${resp.status}]: ${JSON.stringify(data)}`);
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
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const resp = await fetch("https://api.pinterest.com/v5/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${basicAuth}` },
          body: new URLSearchParams({ code, redirect_uri, grant_type: "authorization_code" }).toString(),
        });
        result = await resp.json();
        if (result.error) throw new Error(result.error_description || result.error);
        return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      case "refresh_token": {
        const conn = await getConnection(supabase, account_id);
        const { client_id, client_secret } = params;
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const resp = await fetch("https://api.pinterest.com/v5/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${basicAuth}` },
          body: new URLSearchParams({ refresh_token: conn.refresh_token!, grant_type: "refresh_token" }).toString(),
        });
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({ access_token: result.access_token, refresh_token: result.refresh_token || conn.refresh_token, token_expires_at: new Date(Date.now() + (result.expires_in || 2592000) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", conn.id);
        }
        break;
      }

      // ===== USER =====
      case "get_account": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/user_account", conn.access_token);
        break;
      }
      case "get_account_analytics": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await pinFetch(`/user_account/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=IMPRESSION,PIN_CLICK,SAVE,OUTBOUND_CLICK`, conn.access_token);
        break;
      }
      case "get_top_pins": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await pinFetch(`/user_account/analytics/top_pins?start_date=${startDate}&end_date=${endDate}&sort_by=${params.sort_by || "IMPRESSION"}&metric_types=IMPRESSION,PIN_CLICK,SAVE`, conn.access_token);
        break;
      }
      case "get_top_video_pins": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await pinFetch(`/user_account/analytics/top_video_pins?start_date=${startDate}&end_date=${endDate}&sort_by=${params.sort_by || "IMPRESSION"}&metric_types=IMPRESSION,V50_WATCH_TIME,VIDEO_START`, conn.access_token);
        break;
      }

      // ===== PINS =====
      case "get_pins": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/pins?page_size=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_pin": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/pins/${params.pin_id}`, conn.access_token);
        break;
      }
      case "create_pin": {
        const conn = await getConnection(supabase, account_id);
        const pinData: any = {
          title: params.title, description: params.description || "",
          board_id: params.board_id, link: params.link || "",
          media_source: { source_type: "image_url", url: params.image_url },
        };
        if (params.alt_text) pinData.alt_text = params.alt_text;
        result = await pinFetch("/pins", conn.access_token, "POST", pinData);
        break;
      }
      case "create_video_pin": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/pins", conn.access_token, "POST", {
          title: params.title, description: params.description || "",
          board_id: params.board_id, link: params.link || "",
          media_source: { source_type: "video_id", media_id: params.media_id, cover_image_url: params.cover_url || "" },
        });
        break;
      }
      case "update_pin": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/pins/${params.pin_id}`, conn.access_token, "PATCH", {
          title: params.title, description: params.description, link: params.link, board_id: params.board_id,
        });
        break;
      }
      case "delete_pin": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/pins/${params.pin_id}`, conn.access_token, "DELETE");
        break;
      }
      case "save_pin": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/pins/${params.pin_id}/save`, conn.access_token, "POST", { board_id: params.board_id });
        break;
      }
      case "get_pin_analytics": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await pinFetch(`/pins/${params.pin_id}/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`, conn.access_token);
        break;
      }

      // ===== BOARDS =====
      case "get_boards": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards?page_size=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_board": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}`, conn.access_token);
        break;
      }
      case "create_board": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/boards", conn.access_token, "POST", {
          name: params.name, description: params.description || "", privacy: params.privacy || "PUBLIC",
        });
        break;
      }
      case "update_board": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}`, conn.access_token, "PATCH", {
          name: params.name, description: params.description,
        });
        break;
      }
      case "delete_board": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}`, conn.access_token, "DELETE");
        break;
      }
      case "get_board_pins": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}/pins?page_size=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== BOARD SECTIONS =====
      case "get_board_sections": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}/sections`, conn.access_token);
        break;
      }
      case "create_board_section": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}/sections`, conn.access_token, "POST", { name: params.name });
        break;
      }
      case "get_section_pins": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/boards/${params.board_id}/sections/${params.section_id}/pins`, conn.access_token);
        break;
      }

      // ===== SEARCH =====
      case "search_pins": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/search/pins?query=${encodeURIComponent(params.query)}&page_size=${params?.limit || 10}`, conn.access_token);
        break;
      }
      case "search_boards": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/search/boards?query=${encodeURIComponent(params.query)}&page_size=${params?.limit || 10}`, conn.access_token);
        break;
      }

      // ===== MEDIA =====
      case "create_media_upload": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/media", conn.access_token, "POST", { media_type: params.media_type || "video" });
        break;
      }
      case "get_media_upload": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/media/${params.media_id}`, conn.access_token);
        break;
      }

      // ===== ADS =====
      case "get_ad_accounts": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/ad_accounts", conn.access_token);
        break;
      }
      case "get_campaigns": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/ad_accounts/${params.ad_account_id}/campaigns`, conn.access_token);
        break;
      }
      case "get_ad_groups": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/ad_accounts/${params.ad_account_id}/ad_groups`, conn.access_token);
        break;
      }
      case "get_ads": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/ad_accounts/${params.ad_account_id}/ads`, conn.access_token);
        break;
      }
      case "get_ad_analytics": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await pinFetch(`/ad_accounts/${params.ad_account_id}/analytics?start_date=${startDate}&end_date=${endDate}&granularity=${params.granularity || "DAY"}&columns=SPEND_IN_MICRO_DOLLAR,TOTAL_IMPRESSION,TOTAL_CLICKTHROUGH`, conn.access_token);
        break;
      }
      case "get_targeting_options": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/ad_accounts/${params.ad_account_id}/targeting_analytics`, conn.access_token);
        break;
      }

      // ===== KEYWORDS =====
      case "get_keywords": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/ad_accounts/${params.ad_account_id}/keywords?ad_group_id=${params.ad_group_id}`, conn.access_token);
        break;
      }

      // ===== TERMS =====
      case "get_related_terms": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/terms/related?term=${encodeURIComponent(params.term)}`, conn.access_token);
        break;
      }
      case "get_suggested_terms": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/terms/suggested?term=${encodeURIComponent(params.term)}&limit=${params?.limit || 10}`, conn.access_token);
        break;
      }

      // ===== CATALOGS =====
      case "get_catalogs": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/catalogs", conn.access_token);
        break;
      }
      case "get_feeds": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/catalogs/feeds", conn.access_token);
        break;
      }
      case "get_product_groups": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch("/catalogs/product_groups", conn.access_token);
        break;
      }
      case "get_items": {
        const conn = await getConnection(supabase, account_id);
        result = await pinFetch(`/catalogs/items?country=${params.country || "US"}&language=${params.language || "en"}&item_ids=${(params.item_ids || []).join(",")}`, conn.access_token);
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

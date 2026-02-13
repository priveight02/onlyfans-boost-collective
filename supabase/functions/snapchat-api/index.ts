import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SNAP_API = "https://adsapi.snapchat.com/v1";
const SNAP_ACCOUNTS_API = "https://accounts.snapchat.com";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "snapchat").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("Snapchat not connected for this account");
  return data;
}

async function snapFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${SNAP_API}${endpoint}`;
  const opts: any = { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Snapchat API [${resp.status}]: ${JSON.stringify(data)}`);
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
        const resp = await fetch(`${SNAP_ACCOUNTS_API}/login/oauth2/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" }).toString(),
        });
        result = await resp.json();
        if (result.error) throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
        return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "refresh_token": {
        const conn = await getConnection(supabase, account_id);
        const { client_id, client_secret } = params;
        if (!conn.refresh_token) throw new Error("No refresh token");
        const resp = await fetch(`${SNAP_ACCOUNTS_API}/login/oauth2/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ refresh_token: conn.refresh_token, client_id, client_secret, grant_type: "refresh_token" }).toString(),
        });
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({ access_token: result.access_token, refresh_token: result.refresh_token || conn.refresh_token, token_expires_at: new Date(Date.now() + (result.expires_in || 1800) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", conn.id);
        }
        break;
      }

      // ===== USER / ORG =====
      case "get_me": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch("/me", conn.access_token);
        break;
      }
      case "get_organizations": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch("/me/organizations", conn.access_token);
        break;
      }
      case "get_ad_accounts": {
        const conn = await getConnection(supabase, account_id);
        const orgId = params?.organization_id;
        result = await snapFetch(`/organizations/${orgId}/adaccounts`, conn.access_token);
        break;
      }

      // ===== CAMPAIGNS =====
      case "get_campaigns": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/campaigns`, conn.access_token);
        break;
      }
      case "create_campaign": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/campaigns`, conn.access_token, "POST", { campaigns: [{ name: params.name, status: params.status || "PAUSED", objective: params.objective || "AWARENESS", start_time: params.start_time }] });
        break;
      }
      case "update_campaign": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/campaigns`, conn.access_token, "PUT", { campaigns: [{ id: params.campaign_id, name: params.name, status: params.status }] });
        break;
      }
      case "delete_campaign": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/campaigns/${params.campaign_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== AD SQUADS =====
      case "get_ad_squads": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/campaigns/${params.campaign_id}/adsquads`, conn.access_token);
        break;
      }
      case "create_ad_squad": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/campaigns/${params.campaign_id}/adsquads`, conn.access_token, "POST", { adsquads: [params.ad_squad] });
        break;
      }

      // ===== ADS =====
      case "get_ads": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adsquads/${params.ad_squad_id}/ads`, conn.access_token);
        break;
      }
      case "create_ad": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adsquads/${params.ad_squad_id}/ads`, conn.access_token, "POST", { ads: [{ name: params.name, status: params.status || "PAUSED", creative_id: params.creative_id, type: params.type || "SNAP_AD" }] });
        break;
      }

      // ===== CREATIVES =====
      case "get_creatives": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/creatives`, conn.access_token);
        break;
      }
      case "create_creative": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/creatives`, conn.access_token, "POST", { creatives: [params.creative] });
        break;
      }

      // ===== MEDIA =====
      case "get_media": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/media`, conn.access_token);
        break;
      }
      case "create_media": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/media`, conn.access_token, "POST", { media: [{ name: params.name, type: params.type || "VIDEO", ad_account_id: params.ad_account_id }] });
        break;
      }

      // ===== AUDIENCES =====
      case "get_audiences": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/segments`, conn.access_token);
        break;
      }
      case "create_audience": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/segments`, conn.access_token, "POST", { segments: [{ name: params.name, description: params.description, source_type: params.source_type || "FIRST_PARTY", retention_in_days: params.retention || 180, ad_account_id: params.ad_account_id }] });
        break;
      }

      // ===== TARGETING =====
      case "get_targeting_options": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/targeting`, conn.access_token);
        break;
      }
      case "get_interest_targeting": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch("/targeting/interests", conn.access_token);
        break;
      }
      case "get_location_targeting": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/targeting/geo/country_code/${params.country_code || "US"}`, conn.access_token);
        break;
      }
      case "get_demographics_targeting": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch("/targeting/demographics", conn.access_token);
        break;
      }

      // ===== PIXELS =====
      case "get_pixels": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/pixels`, conn.access_token);
        break;
      }
      case "create_pixel": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adaccounts/${params.ad_account_id}/pixels`, conn.access_token, "POST", { pixels: [{ name: params.name, ad_account_id: params.ad_account_id }] });
        break;
      }
      case "get_pixel_stats": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/pixels/${params.pixel_id}/stats`, conn.access_token);
        break;
      }

      // ===== ANALYTICS / STATS =====
      case "get_campaign_stats": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/campaigns/${params.campaign_id}/stats?granularity=${params.granularity || "TOTAL"}&fields=impressions,swipes,spend,video_views`, conn.access_token);
        break;
      }
      case "get_ad_squad_stats": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/adsquads/${params.ad_squad_id}/stats?granularity=${params.granularity || "TOTAL"}&fields=impressions,swipes,spend`, conn.access_token);
        break;
      }
      case "get_ad_stats": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/ads/${params.ad_id}/stats?granularity=${params.granularity || "TOTAL"}&fields=impressions,swipes,spend,video_views`, conn.access_token);
        break;
      }

      // ===== CATALOGS =====
      case "get_catalogs": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/organizations/${params.organization_id}/catalogs`, conn.access_token);
        break;
      }
      case "get_product_sets": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/catalogs/${params.catalog_id}/product_sets`, conn.access_token);
        break;
      }
      case "get_products": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch(`/catalogs/${params.catalog_id}/products`, conn.access_token);
        break;
      }

      // ===== CONVERSION EVENTS =====
      case "send_conversion_event": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch("https://tr.snapchat.com/v2/conversion", conn.access_token, "POST", params.event_data);
        break;
      }

      // ===== BITMOJI =====
      case "get_bitmoji_avatar": {
        const conn = await getConnection(supabase, account_id);
        result = await snapFetch("/me?fields=bitmoji", conn.access_token);
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

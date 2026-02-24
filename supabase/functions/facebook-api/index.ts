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
      // ===== GET APP ID =====
      case "get_app_id": {
        const appId = Deno.env.get("FACEBOOK_APP_ID");
        if (!appId) throw new Error("FACEBOOK_APP_ID not configured");
        return new Response(JSON.stringify({ success: true, app_id: appId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ===== OAUTH =====
      case "exchange_code": {
        const appId = params.client_id || Deno.env.get("FACEBOOK_APP_ID");
        const appSecret = params.client_secret || Deno.env.get("FACEBOOK_APP_SECRET");
        if (!appId || !appSecret) throw new Error("Facebook App ID/Secret not configured");
        const { code, redirect_uri } = params;
        const resp = await fetch(`${GRAPH_API}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`);
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

      // ===== LIVE VIDEO =====
      case "get_live_videos": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        result = await fbFetch(`/${target}/live_videos?fields=id,title,description,status,live_views,creation_time,permalink_url,embed_html,video&limit=${params?.limit || 25}`, params.page_access_token || conn.access_token);
        break;
      }
      case "create_live_video": {
        const conn = await getConnection(supabase, account_id);
        const target = params.page_id || "me";
        const token = params.page_access_token || conn.access_token;
        const body: any = {};
        if (params.title) body.title = params.title;
        if (params.description) body.description = params.description;
        if (params.planned_start_time) body.planned_start_time = params.planned_start_time;
        if (params.status) body.status = params.status;
        if (params.privacy) body.privacy = JSON.stringify(params.privacy);
        result = await fbFetch(`/${target}/live_videos`, token, "POST", body);
        break;
      }
      case "end_live_video": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.video_id}`, params.page_access_token || conn.access_token, "POST", { end_live_video: true });
        break;
      }

      // ===== FUNDRAISERS =====
      case "get_fundraisers": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/fundraisers?fields=id,name,description,goal_amount,amount_raised,currency,end_time,created_time&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "create_fundraiser": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/fundraisers`, conn.access_token, "POST", {
          name: params.name,
          description: params.description || "",
          goal_amount: params.goal_amount,
          currency: params.currency || "USD",
          end_time: params.end_time,
          charity_id: params.charity_id,
        });
        break;
      }
      case "get_fundraiser_donations": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.fundraiser_id}/donations?fields=id,amount,currency,donor,created_time&limit=${params?.limit || 50}`, conn.access_token);
        break;
      }

      // ===== PAGE CTA =====
      case "get_page_cta": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/call_to_actions?fields=id,type,status,web_url,web_destination_type,created_time`, params.page_access_token || conn.access_token);
        break;
      }
      case "create_page_cta": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/call_to_actions`, params.page_access_token || conn.access_token, "POST", {
          type: params.type,
          web_url: params.web_url,
          web_destination_type: params.web_destination_type || "WEBSITE",
        });
        break;
      }
      case "delete_page_cta": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.cta_id}`, params.page_access_token || conn.access_token, "DELETE");
        break;
      }

      // ===== PAGE METADATA =====
      case "update_page_settings": {
        const conn = await getConnection(supabase, account_id);
        const body: any = {};
        if (params.about !== undefined) body.about = params.about;
        if (params.description !== undefined) body.description = params.description;
        if (params.website !== undefined) body.website = params.website;
        if (params.phone !== undefined) body.phone = params.phone;
        result = await fbFetch(`/${params.page_id}`, params.page_access_token || conn.access_token, "POST", body);
        break;
      }
      case "subscribe_page_webhooks": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/subscribed_apps`, params.page_access_token || conn.access_token, "POST", {
          subscribed_fields: params.fields || "feed,messages,messaging_postbacks",
        });
        break;
      }

      // ===== LEADS RETRIEVAL =====
      case "get_lead_forms": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/leadgen_forms?fields=id,name,status,created_time,leads_count,locale&limit=${params?.limit || 25}`, params.page_access_token || conn.access_token);
        break;
      }
      case "get_leads": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.form_id}/leads?fields=id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name&limit=${params?.limit || 50}`, params.page_access_token || conn.access_token);
        break;
      }

      // ===== MARKETING MESSAGES =====
      case "send_marketing_message": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/messages`, params.page_access_token || conn.access_token, "POST", {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
          messaging_type: "MESSAGE_TAG",
          tag: params.tag || "CONFIRMED_EVENT_UPDATE",
        });
        break;
      }
      case "send_human_agent_message": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/messages`, params.page_access_token || conn.access_token, "POST", {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
          messaging_type: "MESSAGE_TAG",
          tag: "HUMAN_AGENT",
        });
        break;
      }

      // ===== INSTANT ARTICLES =====
      case "get_instant_articles": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/instant_articles?fields=id,canonical_url,most_recent_import_status,published&limit=${params?.limit || 25}`, params.page_access_token || conn.access_token);
        break;
      }
      case "create_instant_article": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/instant_articles`, params.page_access_token || conn.access_token, "POST", {
          html_source: params.html_source,
          published: params.published !== false,
          development_mode: params.development_mode || false,
        });
        break;
      }

      // ===== USER LOCALE / TIMEZONE / GENDER =====
      case "get_user_locale": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.user_id}?fields=locale`, params.page_access_token || conn.access_token);
        break;
      }
      case "get_user_timezone": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.user_id}?fields=timezone`, params.page_access_token || conn.access_token);
        break;
      }
      case "get_user_gender": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.user_id}?fields=gender`, params.page_access_token || conn.access_token);
        break;
      }

      // ===== PAGE EVENTS =====
      case "log_page_event": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.page_id}/page_activities`, params.page_access_token || conn.access_token, "POST", {
          custom_events: JSON.stringify([{
            _eventName: params.event_name,
            _valueToSum: params.value || 0,
            fb_currency: params.currency || "USD",
            ...params.custom_data,
          }]),
          advertiser_tracking_enabled: params.tracking_enabled !== false ? "1" : "0",
        });
        break;
      }

      // ===== CREATOR MARKETPLACE =====
      case "discover_fb_creators": {
        const conn = await getConnection(supabase, account_id);
        const fields = "id,name,picture,fan_count,category,link,about";
        let qs = `fields=${fields}&limit=${params?.limit || 25}`;
        result = await fbFetch(`/me/branded_content_eligible_sponsors?${qs}`, conn.access_token);
        break;
      }

      // ===== BRANDED CONTENT =====
      case "get_branded_content_posts": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/branded_content?fields=id,message,created_time,permalink_url,from,sponsor_tags&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== COMMERCE =====
      case "get_commerce_settings": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.commerce_account_id}?fields=id,name,merchant_page,onsite_commerce_merchant`, conn.access_token);
        break;
      }
      case "get_commerce_orders": {
        const conn = await getConnection(supabase, account_id);
        let qs = `fields=id,order_status,created,updated,items,ship_by_date,merchant_order_id,buyer_details,channel,selected_shipping_option&limit=${params?.limit || 25}`;
        if (params.state) qs += `&state=${params.state}`;
        result = await fbFetch(`/${params.commerce_account_id}/orders?${qs}`, conn.access_token);
        break;
      }
      case "update_commerce_order": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.order_id}`, conn.access_token, "POST", {
          state: params.state,
          tracking_info: params.tracking_info,
          items: params.items,
        });
        break;
      }
      case "get_commerce_reports": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.commerce_account_id}/commerce_transactions?fields=id,transaction_type,transfer_id,payout_reference_id,order_id,net_amount,processing_fee,tax_amount,gross_amount,transaction_date&limit=${params?.limit || 50}`, conn.access_token);
        break;
      }

      // ===== CATALOGS =====
      case "get_catalogs": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/businesses?fields=id,name,owned_product_catalogs{id,name,product_count,vertical}&limit=10`, conn.access_token);
        break;
      }
      case "get_catalog_products": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.catalog_id}/products?fields=id,name,description,price,currency,image_url,url,availability,brand,category,retailer_id&limit=${params?.limit || 50}`, conn.access_token);
        break;
      }
      case "create_catalog_product": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.catalog_id}/products`, conn.access_token, "POST", {
          name: params.name,
          description: params.description || "",
          price: params.price,
          currency: params.currency || "USD",
          image_url: params.image_url,
          url: params.url,
          availability: params.availability || "in stock",
          brand: params.brand || "",
          retailer_id: params.retailer_id || `prod_${Date.now()}`,
        });
        break;
      }

      // ===== ADS MANAGEMENT =====
      case "get_ad_accounts": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,balance,business,funding_source_details&limit=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "get_ad_insights": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.ad_account_id}/insights?fields=impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,conversions&date_preset=${params.date_preset || "last_30d"}`, conn.access_token);
        break;
      }

      // ===== ATTRIBUTION =====
      case "get_attribution_report": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.line_id}/reports?fields=metric_name,metric_value,dimension_values&limit=100`, conn.access_token);
        break;
      }

      // ===== BUSINESS MANAGEMENT =====
      case "get_businesses": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/me/businesses?fields=id,name,created_time,primary_page,verification_status,link&limit=25`, conn.access_token);
        break;
      }
      case "get_business_pages": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.business_id}/owned_pages?fields=id,name,category,fan_count,picture&limit=50`, conn.access_token);
        break;
      }
      case "get_business_ad_accounts": {
        const conn = await getConnection(supabase, account_id);
        result = await fbFetch(`/${params.business_id}/owned_ad_accounts?fields=id,name,account_status,currency,amount_spent&limit=50`, conn.access_token);
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

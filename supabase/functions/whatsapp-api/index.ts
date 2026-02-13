import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WA_API = "https://graph.facebook.com/v21.0";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "whatsapp").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("WhatsApp not connected for this account");
  return data;
}

async function waFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${WA_API}${endpoint}`;
  const opts: any = { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.error) throw new Error(`WhatsApp API: ${data.error.message}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let result: any;

    switch (action) {
      // ===== MESSAGES =====
      case "send_text": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", recipient_type: "individual", to: params.to,
          type: "text", text: { preview_url: params.preview_url !== false, body: params.text },
        });
        break;
      }
      case "send_image": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "image",
          image: { link: params.image_url, caption: params.caption || "" },
        });
        break;
      }
      case "send_video": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "video",
          video: { link: params.video_url, caption: params.caption || "" },
        });
        break;
      }
      case "send_audio": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "audio",
          audio: { link: params.audio_url },
        });
        break;
      }
      case "send_document": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "document",
          document: { link: params.document_url, caption: params.caption || "", filename: params.filename || "file" },
        });
        break;
      }
      case "send_sticker": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "sticker",
          sticker: { link: params.sticker_url },
        });
        break;
      }
      case "send_location": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "location",
          location: { latitude: params.latitude, longitude: params.longitude, name: params.name || "", address: params.address || "" },
        });
        break;
      }
      case "send_contacts": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "contacts", contacts: params.contacts,
        });
        break;
      }
      case "send_template": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "template",
          template: { name: params.template_name, language: { code: params.language || "en_US" }, components: params.components || [] },
        });
        break;
      }
      case "send_interactive_buttons": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "interactive",
          interactive: { type: "button", body: { text: params.body_text }, action: { buttons: params.buttons } },
        });
        break;
      }
      case "send_interactive_list": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "interactive",
          interactive: { type: "list", body: { text: params.body_text }, action: { button: params.button_text || "Options", sections: params.sections } },
        });
        break;
      }
      case "send_reaction": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", to: params.to, type: "reaction",
          reaction: { message_id: params.message_id, emoji: params.emoji },
        });
        break;
      }
      case "mark_as_read": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/messages`, conn.access_token, "POST", {
          messaging_product: "whatsapp", status: "read", message_id: params.message_id,
        });
        break;
      }

      // ===== MEDIA =====
      case "upload_media": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/media`, conn.access_token, "POST", {
          messaging_product: "whatsapp", type: params.type, link: params.url,
        });
        break;
      }
      case "get_media": {
        const conn = await getConnection(supabase, account_id);
        result = await waFetch(`/${params.media_id}`, conn.access_token);
        break;
      }
      case "delete_media": {
        const conn = await getConnection(supabase, account_id);
        result = await waFetch(`/${params.media_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== TEMPLATES =====
      case "get_templates": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/message_templates?limit=${params?.limit || 50}`, conn.access_token);
        break;
      }
      case "create_template": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/message_templates`, conn.access_token, "POST", {
          name: params.name, language: params.language || "en_US", category: params.category || "MARKETING",
          components: params.components,
        });
        break;
      }
      case "delete_template": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/message_templates?name=${params.name}`, conn.access_token, "DELETE");
        break;
      }

      // ===== BUSINESS PROFILE =====
      case "get_business_profile": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, conn.access_token);
        break;
      }
      case "update_business_profile": {
        const conn = await getConnection(supabase, account_id);
        const phoneId = params.phone_number_id || conn.platform_user_id;
        result = await waFetch(`/${phoneId}/whatsapp_business_profile`, conn.access_token, "POST", {
          messaging_product: "whatsapp", about: params.about, address: params.address,
          description: params.description, email: params.email, websites: params.websites, vertical: params.vertical,
        });
        break;
      }

      // ===== PHONE NUMBERS =====
      case "get_phone_numbers": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`, conn.access_token);
        break;
      }
      case "get_phone_number": {
        const conn = await getConnection(supabase, account_id);
        result = await waFetch(`/${params.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,status,name_status`, conn.access_token);
        break;
      }

      // ===== WEBHOOKS =====
      case "register_webhook": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/subscribed_apps`, conn.access_token, "POST");
        break;
      }

      // ===== ANALYTICS =====
      case "get_analytics": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/analytics?granularity=${params.granularity || "DAY"}&start=${params.start || 0}&end=${params.end || Date.now()}`, conn.access_token);
        break;
      }
      case "get_conversation_analytics": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/conversation_analytics?granularity=${params.granularity || "DAILY"}&start=${params.start || 0}&end=${params.end || Date.now()}`, conn.access_token);
        break;
      }

      // ===== FLOWS =====
      case "get_flows": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/flows`, conn.access_token);
        break;
      }
      case "create_flow": {
        const conn = await getConnection(supabase, account_id);
        const wabaId = params.waba_id || conn.metadata?.waba_id;
        result = await waFetch(`/${wabaId}/flows`, conn.access_token, "POST", {
          name: params.name, categories: params.categories || ["OTHER"],
        });
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

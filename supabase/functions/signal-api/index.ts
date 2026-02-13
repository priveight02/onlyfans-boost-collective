import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Signal uses signal-cli REST API (self-hosted) - user provides their own endpoint
async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "signal").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("Signal not connected for this account");
  return data;
}

async function signalFetch(baseUrl: string, endpoint: string, method = "GET", body?: any) {
  const url = `${baseUrl}${endpoint}`;
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let result: any;

    // Signal REST API base URL from connection metadata or params
    const getBaseUrl = async () => {
      const conn = await getConnection(supabase, account_id);
      const baseUrl = conn.metadata?.api_url || params?.api_url;
      if (!baseUrl) throw new Error("Signal REST API URL not configured. Set it in connection metadata.");
      return { conn, baseUrl };
    };

    switch (action) {
      // ===== SETUP =====
      case "register": {
        const baseUrl = params.api_url;
        if (!baseUrl) throw new Error("Provide api_url for Signal REST API");
        result = await signalFetch(baseUrl, "/v1/register", "POST", { number: params.number, use_voice: params.use_voice || false });
        break;
      }
      case "verify": {
        const baseUrl = params.api_url;
        result = await signalFetch(baseUrl, "/v1/register/verify", "POST", { number: params.number, token: params.verification_code });
        break;
      }
      case "link_device": {
        const baseUrl = params.api_url;
        result = await signalFetch(baseUrl, "/v1/qrcodelink?device_name=" + encodeURIComponent(params.device_name || "Lovable"));
        break;
      }

      // ===== ACCOUNTS =====
      case "list_accounts": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v1/accounts");
        break;
      }
      case "get_account": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/accounts/${encodeURIComponent(params.number)}`);
        break;
      }
      case "set_profile": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/accounts/${encodeURIComponent(params.number)}/settings`, "PUT", {
          name: params.name, about: params.about, about_emoji: params.about_emoji,
        });
        break;
      }

      // ===== MESSAGES =====
      case "send_message": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v2/send", "POST", {
          number: params.sender_number, recipients: params.recipients || [params.to],
          message: params.message, text_mode: params.text_mode || "normal",
        });
        break;
      }
      case "send_reaction": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v1/reactions/" + encodeURIComponent(params.sender_number), "POST", {
          recipient: params.recipient, reaction: params.emoji, target_author: params.target_author,
          timestamp: params.target_timestamp,
        });
        break;
      }
      case "remove_reaction": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v1/reactions/" + encodeURIComponent(params.sender_number), "DELETE", {
          recipient: params.recipient, target_author: params.target_author, timestamp: params.target_timestamp,
        });
        break;
      }
      case "send_typing": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v1/typing-indicator/" + encodeURIComponent(params.sender_number), "PUT", {
          recipient: params.recipient,
        });
        break;
      }
      case "get_messages": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/receive/${encodeURIComponent(params.number)}`);
        break;
      }
      case "delete_message": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/messages/${encodeURIComponent(params.number)}`, "DELETE", {
          recipient: params.recipient, timestamp: params.timestamp,
        });
        break;
      }

      // ===== ATTACHMENTS =====
      case "send_attachment": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v2/send", "POST", {
          number: params.sender_number, recipients: [params.to],
          message: params.message || "", base64_attachments: params.attachments,
        });
        break;
      }

      // ===== GROUPS =====
      case "list_groups": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/groups/${encodeURIComponent(params.number)}`);
        break;
      }
      case "create_group": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/groups/${encodeURIComponent(params.number)}`, "POST", {
          name: params.name, members: params.members, description: params.description || "",
          group_link: params.group_link || "disabled",
        });
        break;
      }
      case "update_group": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/groups/${encodeURIComponent(params.number)}`, "PUT", {
          id: params.group_id, name: params.name, description: params.description,
          add_members: params.add_members, remove_members: params.remove_members,
          add_admins: params.add_admins, remove_admins: params.remove_admins,
        });
        break;
      }
      case "delete_group": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/groups/${encodeURIComponent(params.number)}`, "DELETE", { id: params.group_id });
        break;
      }
      case "send_group_message": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, "/v2/send", "POST", {
          number: params.sender_number, recipients: [params.group_id], message: params.message,
        });
        break;
      }
      case "leave_group": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/groups/${encodeURIComponent(params.number)}/quit`, "POST", { id: params.group_id });
        break;
      }

      // ===== CONTACTS =====
      case "list_contacts": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/contacts/${encodeURIComponent(params.number)}`);
        break;
      }
      case "update_contact": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/contacts/${encodeURIComponent(params.number)}`, "PUT", {
          recipient: params.recipient, name: params.name, expiration_time: params.expiration_time,
        });
        break;
      }
      case "block_contact": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/contacts/${encodeURIComponent(params.number)}/block`, "POST", { recipients: [params.recipient] });
        break;
      }
      case "unblock_contact": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/contacts/${encodeURIComponent(params.number)}/block`, "DELETE", { recipients: [params.recipient] });
        break;
      }

      // ===== IDENTITIES =====
      case "list_identities": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/identities/${encodeURIComponent(params.number)}`);
        break;
      }
      case "trust_identity": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/identities/${encodeURIComponent(params.number)}/trust`, "PUT", {
          recipient: params.recipient, trust_level: params.trust_level || "TRUSTED_VERIFIED",
        });
        break;
      }

      // ===== STICKERS =====
      case "list_sticker_packs": {
        const { baseUrl } = await getBaseUrl();
        result = await signalFetch(baseUrl, `/v1/sticker-packs/${encodeURIComponent(params.number)}`);
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

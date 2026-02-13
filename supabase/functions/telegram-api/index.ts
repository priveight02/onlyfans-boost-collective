import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function tgUrl(token: string, method: string) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function tgFetch(botToken: string, method: string, body?: any) {
  const opts: any = { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(tgUrl(botToken, method), opts);
  const data = await resp.json();
  if (!data.ok) throw new Error(`Telegram API: ${data.description || "Unknown error"}`);
  return data.result;
}

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "telegram")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Telegram not connected for this account");
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

    switch (action) {
      // ===== VALIDATE BOT TOKEN (no connection needed) =====
      case "validate_token": {
        const botToken = params.bot_token;
        if (!botToken) throw new Error("Missing bot_token");
        result = await tgFetch(botToken, "getMe");
        return new Response(JSON.stringify({ success: true, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== GET BOT INFO =====
      case "get_me": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getMe");
        break;
      }

      // ===== SEND MESSAGE =====
      case "send_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendMessage", {
          chat_id: params.chat_id,
          text: params.text,
          parse_mode: params.parse_mode || "HTML",
          ...(params.reply_markup ? { reply_markup: params.reply_markup } : {}),
        });
        break;
      }

      // ===== SEND PHOTO =====
      case "send_photo": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendPhoto", {
          chat_id: params.chat_id,
          photo: params.photo_url,
          caption: params.caption || "",
          parse_mode: "HTML",
        });
        break;
      }

      // ===== GET UPDATES =====
      case "get_updates": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getUpdates", {
          limit: params?.limit || 20,
          offset: params?.offset || undefined,
        });
        break;
      }

      // ===== GET CHAT INFO =====
      case "get_chat": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChat", { chat_id: params.chat_id });
        break;
      }

      // ===== GET CHAT MEMBER COUNT =====
      case "get_chat_member_count": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChatMemberCount", { chat_id: params.chat_id });
        break;
      }

      // ===== SET WEBHOOK =====
      case "set_webhook": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setWebhook", {
          url: params.webhook_url,
          ...(params.secret_token ? { secret_token: params.secret_token } : {}),
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("telegram-api error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

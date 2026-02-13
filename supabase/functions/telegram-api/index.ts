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
  if (!data.ok) throw new Error(`Telegram API: ${data.description || "Unknown error"} (${data.error_code || ""})`);
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

      // ===== BOT INFO =====
      case "get_me": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getMe");
        break;
      }

      // ===== UPDATES =====
      case "get_updates": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getUpdates", {
          limit: params?.limit || 20,
          offset: params?.offset || undefined,
          timeout: params?.timeout || undefined,
          allowed_updates: params?.allowed_updates || undefined,
        });
        break;
      }

      // ===== WEBHOOKS =====
      case "set_webhook": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setWebhook", {
          url: params.webhook_url,
          certificate: params.certificate || undefined,
          ip_address: params.ip_address || undefined,
          max_connections: params.max_connections || undefined,
          allowed_updates: params.allowed_updates || undefined,
          drop_pending_updates: params.drop_pending_updates || undefined,
          secret_token: params.secret_token || undefined,
        });
        break;
      }

      case "delete_webhook": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "deleteWebhook", {
          drop_pending_updates: params?.drop_pending_updates || false,
        });
        break;
      }

      case "get_webhook_info": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getWebhookInfo");
        break;
      }

      // ===== SENDING MESSAGES =====
      case "send_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendMessage", {
          chat_id: params.chat_id,
          text: params.text,
          parse_mode: params.parse_mode || "HTML",
          entities: params.entities || undefined,
          link_preview_options: params.link_preview_options || undefined,
          disable_notification: params.disable_notification || undefined,
          protect_content: params.protect_content || undefined,
          message_thread_id: params.message_thread_id || undefined,
          reply_parameters: params.reply_parameters || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_photo": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendPhoto", {
          chat_id: params.chat_id,
          photo: params.photo_url || params.photo,
          caption: params.caption || "",
          parse_mode: params.parse_mode || "HTML",
          has_spoiler: params.has_spoiler || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_parameters: params.reply_parameters || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_video": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendVideo", {
          chat_id: params.chat_id,
          video: params.video_url || params.video,
          caption: params.caption || "",
          parse_mode: params.parse_mode || "HTML",
          duration: params.duration || undefined,
          width: params.width || undefined,
          height: params.height || undefined,
          thumbnail: params.thumbnail || undefined,
          has_spoiler: params.has_spoiler || undefined,
          supports_streaming: params.supports_streaming || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_parameters: params.reply_parameters || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_animation": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendAnimation", {
          chat_id: params.chat_id,
          animation: params.animation_url || params.animation,
          caption: params.caption || "",
          parse_mode: params.parse_mode || "HTML",
          duration: params.duration || undefined,
          width: params.width || undefined,
          height: params.height || undefined,
          has_spoiler: params.has_spoiler || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_audio": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendAudio", {
          chat_id: params.chat_id,
          audio: params.audio_url || params.audio,
          caption: params.caption || "",
          parse_mode: params.parse_mode || "HTML",
          duration: params.duration || undefined,
          performer: params.performer || undefined,
          title: params.title || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_document": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendDocument", {
          chat_id: params.chat_id,
          document: params.document_url || params.document,
          caption: params.caption || "",
          parse_mode: params.parse_mode || "HTML",
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_voice": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendVoice", {
          chat_id: params.chat_id,
          voice: params.voice_url || params.voice,
          caption: params.caption || "",
          parse_mode: params.parse_mode || "HTML",
          duration: params.duration || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_video_note": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendVideoNote", {
          chat_id: params.chat_id,
          video_note: params.video_note_url || params.video_note,
          duration: params.duration || undefined,
          length: params.length || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_sticker": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendSticker", {
          chat_id: params.chat_id,
          sticker: params.sticker,
          emoji: params.emoji || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_location": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendLocation", {
          chat_id: params.chat_id,
          latitude: params.latitude,
          longitude: params.longitude,
          horizontal_accuracy: params.horizontal_accuracy || undefined,
          live_period: params.live_period || undefined,
          heading: params.heading || undefined,
          proximity_alert_radius: params.proximity_alert_radius || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_venue": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendVenue", {
          chat_id: params.chat_id,
          latitude: params.latitude,
          longitude: params.longitude,
          title: params.title,
          address: params.address,
          foursquare_id: params.foursquare_id || undefined,
          foursquare_type: params.foursquare_type || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_contact": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendContact", {
          chat_id: params.chat_id,
          phone_number: params.phone_number,
          first_name: params.first_name,
          last_name: params.last_name || undefined,
          vcard: params.vcard || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_poll": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendPoll", {
          chat_id: params.chat_id,
          question: params.question,
          options: params.options,
          is_anonymous: params.is_anonymous !== undefined ? params.is_anonymous : true,
          type: params.type || "regular",
          allows_multiple_answers: params.allows_multiple_answers || false,
          correct_option_id: params.correct_option_id,
          explanation: params.explanation || undefined,
          open_period: params.open_period || undefined,
          close_date: params.close_date || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_dice": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendDice", {
          chat_id: params.chat_id,
          emoji: params.emoji || "🎲",
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "send_media_group": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendMediaGroup", {
          chat_id: params.chat_id,
          media: params.media,
          disable_notification: params.disable_notification || undefined,
        });
        break;
      }

      case "send_chat_action": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "sendChatAction", {
          chat_id: params.chat_id,
          action: params.action, // typing, upload_photo, record_video, upload_video, etc.
        });
        break;
      }

      // ===== FORWARDING / COPYING =====
      case "forward_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "forwardMessage", {
          chat_id: params.chat_id,
          from_chat_id: params.from_chat_id,
          message_id: params.message_id,
          disable_notification: params.disable_notification || undefined,
          protect_content: params.protect_content || undefined,
        });
        break;
      }

      case "forward_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "forwardMessages", {
          chat_id: params.chat_id,
          from_chat_id: params.from_chat_id,
          message_ids: params.message_ids,
          disable_notification: params.disable_notification || undefined,
        });
        break;
      }

      case "copy_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "copyMessage", {
          chat_id: params.chat_id,
          from_chat_id: params.from_chat_id,
          message_id: params.message_id,
          caption: params.caption || undefined,
          parse_mode: params.parse_mode || undefined,
          disable_notification: params.disable_notification || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "copy_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "copyMessages", {
          chat_id: params.chat_id,
          from_chat_id: params.from_chat_id,
          message_ids: params.message_ids,
          disable_notification: params.disable_notification || undefined,
        });
        break;
      }

      // ===== EDITING MESSAGES =====
      case "edit_message_text": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "editMessageText", {
          chat_id: params.chat_id,
          message_id: params.message_id,
          inline_message_id: params.inline_message_id || undefined,
          text: params.text,
          parse_mode: params.parse_mode || "HTML",
          link_preview_options: params.link_preview_options || undefined,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "edit_message_caption": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "editMessageCaption", {
          chat_id: params.chat_id,
          message_id: params.message_id,
          caption: params.caption,
          parse_mode: params.parse_mode || "HTML",
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "edit_message_media": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "editMessageMedia", {
          chat_id: params.chat_id,
          message_id: params.message_id,
          media: params.media,
          reply_markup: params.reply_markup || undefined,
        });
        break;
      }

      case "edit_message_reply_markup": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "editMessageReplyMarkup", {
          chat_id: params.chat_id,
          message_id: params.message_id,
          reply_markup: params.reply_markup,
        });
        break;
      }

      case "delete_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "deleteMessage", {
          chat_id: params.chat_id,
          message_id: params.message_id,
        });
        break;
      }

      case "delete_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "deleteMessages", {
          chat_id: params.chat_id,
          message_ids: params.message_ids,
        });
        break;
      }

      // ===== CHAT MANAGEMENT =====
      case "get_chat": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChat", { chat_id: params.chat_id });
        break;
      }

      case "get_chat_member_count": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChatMemberCount", { chat_id: params.chat_id });
        break;
      }

      case "get_chat_member": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChatMember", {
          chat_id: params.chat_id,
          user_id: params.user_id,
        });
        break;
      }

      case "get_chat_administrators": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChatAdministrators", { chat_id: params.chat_id });
        break;
      }

      case "set_chat_title": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setChatTitle", {
          chat_id: params.chat_id,
          title: params.title,
        });
        break;
      }

      case "set_chat_description": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setChatDescription", {
          chat_id: params.chat_id,
          description: params.description,
        });
        break;
      }

      case "set_chat_photo": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setChatPhoto", {
          chat_id: params.chat_id,
          photo: params.photo,
        });
        break;
      }

      case "delete_chat_photo": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "deleteChatPhoto", { chat_id: params.chat_id });
        break;
      }

      case "leave_chat": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "leaveChat", { chat_id: params.chat_id });
        break;
      }

      case "export_chat_invite_link": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "exportChatInviteLink", { chat_id: params.chat_id });
        break;
      }

      case "create_chat_invite_link": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "createChatInviteLink", {
          chat_id: params.chat_id,
          name: params.name || undefined,
          expire_date: params.expire_date || undefined,
          member_limit: params.member_limit || undefined,
          creates_join_request: params.creates_join_request || undefined,
        });
        break;
      }

      case "revoke_chat_invite_link": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "revokeChatInviteLink", {
          chat_id: params.chat_id,
          invite_link: params.invite_link,
        });
        break;
      }

      // ===== MEMBER MANAGEMENT =====
      case "ban_chat_member": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "banChatMember", {
          chat_id: params.chat_id,
          user_id: params.user_id,
          until_date: params.until_date || undefined,
          revoke_messages: params.revoke_messages || undefined,
        });
        break;
      }

      case "unban_chat_member": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "unbanChatMember", {
          chat_id: params.chat_id,
          user_id: params.user_id,
          only_if_banned: params.only_if_banned || true,
        });
        break;
      }

      case "restrict_chat_member": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "restrictChatMember", {
          chat_id: params.chat_id,
          user_id: params.user_id,
          permissions: params.permissions,
          until_date: params.until_date || undefined,
        });
        break;
      }

      case "promote_chat_member": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "promoteChatMember", {
          chat_id: params.chat_id,
          user_id: params.user_id,
          is_anonymous: params.is_anonymous || undefined,
          can_manage_chat: params.can_manage_chat || undefined,
          can_delete_messages: params.can_delete_messages || undefined,
          can_manage_video_chats: params.can_manage_video_chats || undefined,
          can_restrict_members: params.can_restrict_members || undefined,
          can_promote_members: params.can_promote_members || undefined,
          can_change_info: params.can_change_info || undefined,
          can_invite_users: params.can_invite_users || undefined,
          can_post_messages: params.can_post_messages || undefined,
          can_edit_messages: params.can_edit_messages || undefined,
          can_pin_messages: params.can_pin_messages || undefined,
          can_post_stories: params.can_post_stories || undefined,
          can_edit_stories: params.can_edit_stories || undefined,
          can_delete_stories: params.can_delete_stories || undefined,
          can_manage_topics: params.can_manage_topics || undefined,
        });
        break;
      }

      case "set_chat_administrator_custom_title": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setChatAdministratorCustomTitle", {
          chat_id: params.chat_id,
          user_id: params.user_id,
          custom_title: params.custom_title,
        });
        break;
      }

      case "approve_chat_join_request": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "approveChatJoinRequest", {
          chat_id: params.chat_id,
          user_id: params.user_id,
        });
        break;
      }

      case "decline_chat_join_request": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "declineChatJoinRequest", {
          chat_id: params.chat_id,
          user_id: params.user_id,
        });
        break;
      }

      // ===== PIN MESSAGES =====
      case "pin_chat_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "pinChatMessage", {
          chat_id: params.chat_id,
          message_id: params.message_id,
          disable_notification: params.disable_notification || undefined,
        });
        break;
      }

      case "unpin_chat_message": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "unpinChatMessage", {
          chat_id: params.chat_id,
          message_id: params.message_id || undefined,
        });
        break;
      }

      case "unpin_all_chat_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "unpinAllChatMessages", { chat_id: params.chat_id });
        break;
      }

      // ===== BOT COMMANDS =====
      case "set_my_commands": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setMyCommands", {
          commands: params.commands,
          scope: params.scope || undefined,
          language_code: params.language_code || undefined,
        });
        break;
      }

      case "get_my_commands": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getMyCommands", {
          scope: params?.scope || undefined,
          language_code: params?.language_code || undefined,
        });
        break;
      }

      case "delete_my_commands": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "deleteMyCommands", {
          scope: params?.scope || undefined,
          language_code: params?.language_code || undefined,
        });
        break;
      }

      case "set_my_name": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setMyName", {
          name: params.name || undefined,
          language_code: params.language_code || undefined,
        });
        break;
      }

      case "get_my_name": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getMyName", {
          language_code: params?.language_code || undefined,
        });
        break;
      }

      case "set_my_description": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setMyDescription", {
          description: params.description || undefined,
          language_code: params.language_code || undefined,
        });
        break;
      }

      case "get_my_description": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getMyDescription", {
          language_code: params?.language_code || undefined,
        });
        break;
      }

      case "set_my_short_description": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setMyShortDescription", {
          short_description: params.short_description || undefined,
          language_code: params.language_code || undefined,
        });
        break;
      }

      // ===== CHAT PERMISSIONS =====
      case "set_chat_permissions": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setChatPermissions", {
          chat_id: params.chat_id,
          permissions: params.permissions,
          use_independent_chat_permissions: params.use_independent_chat_permissions || undefined,
        });
        break;
      }

      // ===== CALLBACKS =====
      case "answer_callback_query": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "answerCallbackQuery", {
          callback_query_id: params.callback_query_id,
          text: params.text || undefined,
          show_alert: params.show_alert || false,
          url: params.url || undefined,
          cache_time: params.cache_time || undefined,
        });
        break;
      }

      case "answer_inline_query": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "answerInlineQuery", {
          inline_query_id: params.inline_query_id,
          results: params.results,
          cache_time: params.cache_time || undefined,
          is_personal: params.is_personal || undefined,
          next_offset: params.next_offset || undefined,
          button: params.button || undefined,
        });
        break;
      }

      // ===== FILES =====
      case "get_file": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getFile", { file_id: params.file_id });
        break;
      }

      // ===== STICKER SETS =====
      case "get_sticker_set": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getStickerSet", { name: params.name });
        break;
      }

      // ===== FORUM TOPICS =====
      case "create_forum_topic": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "createForumTopic", {
          chat_id: params.chat_id,
          name: params.name,
          icon_color: params.icon_color || undefined,
          icon_custom_emoji_id: params.icon_custom_emoji_id || undefined,
        });
        break;
      }

      case "edit_forum_topic": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "editForumTopic", {
          chat_id: params.chat_id,
          message_thread_id: params.message_thread_id,
          name: params.name || undefined,
          icon_custom_emoji_id: params.icon_custom_emoji_id || undefined,
        });
        break;
      }

      case "close_forum_topic": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "closeForumTopic", {
          chat_id: params.chat_id,
          message_thread_id: params.message_thread_id,
        });
        break;
      }

      case "reopen_forum_topic": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "reopenForumTopic", {
          chat_id: params.chat_id,
          message_thread_id: params.message_thread_id,
        });
        break;
      }

      case "delete_forum_topic": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "deleteForumTopic", {
          chat_id: params.chat_id,
          message_thread_id: params.message_thread_id,
        });
        break;
      }

      // ===== MENU BUTTON =====
      case "set_chat_menu_button": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "setChatMenuButton", {
          chat_id: params.chat_id || undefined,
          menu_button: params.menu_button,
        });
        break;
      }

      case "get_chat_menu_button": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getChatMenuButton", {
          chat_id: params?.chat_id || undefined,
        });
        break;
      }

      // ===== USER PROFILE PHOTOS =====
      case "get_user_profile_photos": {
        const conn = await getConnection(supabase, account_id);
        result = await tgFetch(conn.access_token, "getUserProfilePhotos", {
          user_id: params.user_id,
          offset: params.offset || undefined,
          limit: params.limit || undefined,
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

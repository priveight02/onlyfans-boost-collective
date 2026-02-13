import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_API = "https://discord.com/api/v10";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "discord").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("Discord not connected for this account");
  return data;
}

async function discordFetch(endpoint: string, token: string, method = "GET", body?: any, isBot = true) {
  const url = endpoint.startsWith("http") ? endpoint : `${DISCORD_API}${endpoint}`;
  const prefix = isBot ? "Bot" : "Bearer";
  const opts: any = { method, headers: { "Authorization": `${prefix} ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.code && data.message) throw new Error(`Discord API [${data.code}]: ${data.message}`);
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
        const resp = await fetch(`${DISCORD_API}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" }).toString(),
        });
        result = await resp.json();
        if (result.error) throw new Error(result.error_description || result.error);
        return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      case "refresh_token": {
        const conn = await getConnection(supabase, account_id);
        const { client_id, client_secret } = params;
        const resp = await fetch(`${DISCORD_API}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ refresh_token: conn.refresh_token!, client_id, client_secret, grant_type: "refresh_token" }).toString(),
        });
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({ access_token: result.access_token, refresh_token: result.refresh_token || conn.refresh_token, token_expires_at: new Date(Date.now() + (result.expires_in || 604800) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", conn.id);
        }
        break;
      }

      // ===== USER =====
      case "get_me": {
        const conn = await getConnection(supabase, account_id);
        const isBot = conn.metadata?.is_bot !== false;
        result = await discordFetch("/users/@me", conn.access_token, "GET", undefined, isBot);
        break;
      }
      case "get_user": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/users/${params.user_id}`, conn.access_token);
        break;
      }
      case "modify_me": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch("/users/@me", conn.access_token, "PATCH", { username: params.username, avatar: params.avatar });
        break;
      }
      case "get_my_guilds": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/users/@me/guilds?limit=${params?.limit || 100}`, conn.access_token);
        break;
      }
      case "get_my_connections": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch("/users/@me/connections", conn.access_token, "GET", undefined, false);
        break;
      }

      // ===== GUILDS (SERVERS) =====
      case "get_guild": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}?with_counts=true`, conn.access_token);
        break;
      }
      case "modify_guild": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}`, conn.access_token, "PATCH", params.guild_data);
        break;
      }
      case "delete_guild": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}`, conn.access_token, "DELETE");
        break;
      }
      case "get_guild_preview": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/preview`, conn.access_token);
        break;
      }
      case "get_guild_channels": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/channels`, conn.access_token);
        break;
      }
      case "create_guild_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/channels`, conn.access_token, "POST", {
          name: params.name, type: params.type || 0, topic: params.topic || "", parent_id: params.parent_id,
        });
        break;
      }

      // ===== MEMBERS =====
      case "get_guild_members": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/members?limit=${params?.limit || 100}`, conn.access_token);
        break;
      }
      case "get_guild_member": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/members/${params.user_id}`, conn.access_token);
        break;
      }
      case "modify_guild_member": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/members/${params.user_id}`, conn.access_token, "PATCH", {
          nick: params.nick, roles: params.roles, mute: params.mute, deaf: params.deaf,
        });
        break;
      }
      case "add_member_role": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/members/${params.user_id}/roles/${params.role_id}`, conn.access_token, "PUT");
        break;
      }
      case "remove_member_role": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/members/${params.user_id}/roles/${params.role_id}`, conn.access_token, "DELETE");
        break;
      }
      case "kick_member": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/members/${params.user_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== BANS =====
      case "get_bans": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/bans?limit=${params?.limit || 100}`, conn.access_token);
        break;
      }
      case "ban_member": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/bans/${params.user_id}`, conn.access_token, "PUT", {
          delete_message_seconds: params.delete_message_seconds || 0,
        });
        break;
      }
      case "unban_member": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/bans/${params.user_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== ROLES =====
      case "get_roles": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/roles`, conn.access_token);
        break;
      }
      case "create_role": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/roles`, conn.access_token, "POST", {
          name: params.name, color: params.color || 0, permissions: params.permissions, mentionable: params.mentionable,
        });
        break;
      }
      case "modify_role": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/roles/${params.role_id}`, conn.access_token, "PATCH", {
          name: params.name, color: params.color, permissions: params.permissions,
        });
        break;
      }
      case "delete_role": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/roles/${params.role_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== CHANNELS =====
      case "get_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}`, conn.access_token);
        break;
      }
      case "modify_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}`, conn.access_token, "PATCH", {
          name: params.name, topic: params.topic, nsfw: params.nsfw, rate_limit_per_user: params.slowmode,
        });
        break;
      }
      case "delete_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== MESSAGES =====
      case "get_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages?limit=${params?.limit || 50}`, conn.access_token);
        break;
      }
      case "get_message": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}`, conn.access_token);
        break;
      }
      case "send_message": {
        const conn = await getConnection(supabase, account_id);
        const msgBody: any = { content: params.content || "" };
        if (params.embeds) msgBody.embeds = params.embeds;
        if (params.tts) msgBody.tts = true;
        if (params.components) msgBody.components = params.components;
        result = await discordFetch(`/channels/${params.channel_id}/messages`, conn.access_token, "POST", msgBody);
        break;
      }
      case "edit_message": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}`, conn.access_token, "PATCH", {
          content: params.content, embeds: params.embeds,
        });
        break;
      }
      case "delete_message": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}`, conn.access_token, "DELETE");
        break;
      }
      case "bulk_delete_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/bulk-delete`, conn.access_token, "POST", { messages: params.message_ids });
        break;
      }
      case "pin_message": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/pins/${params.message_id}`, conn.access_token, "PUT");
        break;
      }
      case "unpin_message": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/pins/${params.message_id}`, conn.access_token, "DELETE");
        break;
      }
      case "get_pinned_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/pins`, conn.access_token);
        break;
      }

      // ===== REACTIONS =====
      case "add_reaction": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}/reactions/${encodeURIComponent(params.emoji)}/@me`, conn.access_token, "PUT");
        break;
      }
      case "remove_reaction": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}/reactions/${encodeURIComponent(params.emoji)}/@me`, conn.access_token, "DELETE");
        break;
      }
      case "get_reactions": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}/reactions/${encodeURIComponent(params.emoji)}`, conn.access_token);
        break;
      }

      // ===== THREADS =====
      case "create_thread": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/threads`, conn.access_token, "POST", {
          name: params.name, type: params.type || 11, auto_archive_duration: params.archive_duration || 1440,
        });
        break;
      }
      case "create_thread_from_message": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/messages/${params.message_id}/threads`, conn.access_token, "POST", {
          name: params.name, auto_archive_duration: params.archive_duration || 1440,
        });
        break;
      }
      case "get_active_threads": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/threads/active`, conn.access_token);
        break;
      }
      case "join_thread": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.thread_id}/thread-members/@me`, conn.access_token, "PUT");
        break;
      }
      case "leave_thread": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.thread_id}/thread-members/@me`, conn.access_token, "DELETE");
        break;
      }

      // ===== INVITES =====
      case "get_guild_invites": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/invites`, conn.access_token);
        break;
      }
      case "create_invite": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/invites`, conn.access_token, "POST", {
          max_age: params.max_age || 86400, max_uses: params.max_uses || 0, unique: params.unique || false,
        });
        break;
      }
      case "delete_invite": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/invites/${params.invite_code}`, conn.access_token, "DELETE");
        break;
      }

      // ===== WEBHOOKS =====
      case "get_guild_webhooks": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/webhooks`, conn.access_token);
        break;
      }
      case "get_channel_webhooks": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/webhooks`, conn.access_token);
        break;
      }
      case "create_webhook": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/channels/${params.channel_id}/webhooks`, conn.access_token, "POST", {
          name: params.name, avatar: params.avatar,
        });
        break;
      }
      case "execute_webhook": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/webhooks/${params.webhook_id}/${params.webhook_token}?wait=true`, conn.access_token, "POST", {
          content: params.content, username: params.username, avatar_url: params.avatar_url, embeds: params.embeds,
        });
        break;
      }
      case "delete_webhook": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/webhooks/${params.webhook_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== EMOJIS =====
      case "get_guild_emojis": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/emojis`, conn.access_token);
        break;
      }
      case "create_emoji": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/emojis`, conn.access_token, "POST", {
          name: params.name, image: params.image, roles: params.roles,
        });
        break;
      }
      case "delete_emoji": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/emojis/${params.emoji_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== STICKERS =====
      case "get_guild_stickers": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/stickers`, conn.access_token);
        break;
      }

      // ===== SCHEDULED EVENTS =====
      case "get_guild_events": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/scheduled-events`, conn.access_token);
        break;
      }
      case "create_guild_event": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/scheduled-events`, conn.access_token, "POST", {
          name: params.name, privacy_level: 2, scheduled_start_time: params.start_time,
          scheduled_end_time: params.end_time, description: params.description,
          entity_type: params.entity_type || 3, entity_metadata: params.location ? { location: params.location } : undefined,
        });
        break;
      }
      case "modify_guild_event": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/scheduled-events/${params.event_id}`, conn.access_token, "PATCH", {
          name: params.name, description: params.description, status: params.status,
        });
        break;
      }
      case "delete_guild_event": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/scheduled-events/${params.event_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== AUTO-MODERATION =====
      case "get_automod_rules": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/auto-moderation/rules`, conn.access_token);
        break;
      }
      case "create_automod_rule": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/auto-moderation/rules`, conn.access_token, "POST", {
          name: params.name, event_type: 1, trigger_type: params.trigger_type || 1,
          trigger_metadata: params.trigger_metadata, actions: params.actions || [{ type: 1 }],
        });
        break;
      }

      // ===== AUDIT LOG =====
      case "get_audit_log": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch(`/guilds/${params.guild_id}/audit-logs?limit=${params?.limit || 50}`, conn.access_token);
        break;
      }

      // ===== VOICE =====
      case "get_voice_regions": {
        const conn = await getConnection(supabase, account_id);
        result = await discordFetch("/voice/regions", conn.access_token);
        break;
      }

      // ===== APPLICATION COMMANDS =====
      case "get_global_commands": {
        const conn = await getConnection(supabase, account_id);
        const appId = params.application_id || conn.metadata?.application_id;
        result = await discordFetch(`/applications/${appId}/commands`, conn.access_token);
        break;
      }
      case "create_global_command": {
        const conn = await getConnection(supabase, account_id);
        const appId = params.application_id || conn.metadata?.application_id;
        result = await discordFetch(`/applications/${appId}/commands`, conn.access_token, "POST", {
          name: params.name, description: params.description, type: params.type || 1, options: params.options,
        });
        break;
      }
      case "delete_global_command": {
        const conn = await getConnection(supabase, account_id);
        const appId = params.application_id || conn.metadata?.application_id;
        result = await discordFetch(`/applications/${appId}/commands/${params.command_id}`, conn.access_token, "DELETE");
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

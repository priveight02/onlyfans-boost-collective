import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REDDIT_API = "https://oauth.reddit.com";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "reddit")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Reddit not connected for this account");
  return data;
}

async function redditFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${REDDIT_API}${endpoint}`;
  const opts: any = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": "OZC-Agency-Hub/1.0",
    },
  };
  if (body && method !== "GET") {
    if (typeof body === "string") {
      opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  const resp = await fetch(url, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`Reddit API: ${data.error} - ${data.message || ""}`);
  return data;
}

function formEncode(obj: Record<string, any>): string {
  return new URLSearchParams(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])).toString();
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
      // ===== OAUTH2 TOKEN EXCHANGE =====
      case "exchange_code": {
        const { code, client_id, client_secret, redirect_uri } = params;
        if (!code || !client_id || !client_secret) throw new Error("Missing code, client_id, or client_secret");
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`,
            "User-Agent": "OZC-Agency-Hub/1.0",
          },
          body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect_uri || "" }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Token exchange failed: ${tokenData.error}`);
        result = tokenData;
        return new Response(JSON.stringify({ success: true, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== REFRESH TOKEN =====
      case "refresh_token": {
        const conn = await getConnection(supabase, account_id);
        const { client_id, client_secret } = params;
        if (!conn.refresh_token) throw new Error("No refresh token available");
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${basicAuth}`, "User-Agent": "OZC-Agency-Hub/1.0" },
          body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token }).toString(),
        });
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.access_token,
            token_expires_at: new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        }
        break;
      }

      // ===== ACCOUNT / PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        const token = params?.access_token_override || conn.access_token;
        result = await redditFetch("/api/v1/me", token);
        break;
      }

      case "get_prefs": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/prefs", conn.access_token);
        break;
      }

      case "update_prefs": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/prefs", conn.access_token, "PATCH", params.prefs);
        break;
      }

      case "get_karma": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/karma", conn.access_token);
        break;
      }

      case "get_trophies": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/trophies", conn.access_token);
        break;
      }

      case "get_friends": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/friends", conn.access_token);
        break;
      }

      case "get_blocked": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/blocked", conn.access_token);
        break;
      }

      // ===== USER INFO =====
      case "get_user_about": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/user/${params.username}/about`, conn.access_token);
        break;
      }

      case "get_user_posts": {
        const conn = await getConnection(supabase, account_id);
        const username = params?.username || conn.platform_username;
        result = await redditFetch(`/user/${username}/submitted?limit=${params?.limit || 25}&sort=${params?.sort || "new"}&t=${params?.time || "all"}`, conn.access_token);
        break;
      }

      case "get_user_comments": {
        const conn = await getConnection(supabase, account_id);
        const username = params?.username || conn.platform_username;
        result = await redditFetch(`/user/${username}/comments?limit=${params?.limit || 25}&sort=${params?.sort || "new"}`, conn.access_token);
        break;
      }

      case "get_user_upvoted": {
        const conn = await getConnection(supabase, account_id);
        const username = params?.username || conn.platform_username;
        result = await redditFetch(`/user/${username}/upvoted?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_user_saved": {
        const conn = await getConnection(supabase, account_id);
        const username = params?.username || conn.platform_username;
        result = await redditFetch(`/user/${username}/saved?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_user_overview": {
        const conn = await getConnection(supabase, account_id);
        const username = params?.username || conn.platform_username;
        result = await redditFetch(`/user/${username}/overview?limit=${params?.limit || 25}&sort=${params?.sort || "new"}`, conn.access_token);
        break;
      }

      // ===== POSTS (LINKS / SUBMISSIONS) =====
      case "get_posts": {
        const conn = await getConnection(supabase, account_id);
        const username = conn.platform_username;
        result = await redditFetch(`/user/${username}/submitted?limit=${params?.limit || 25}&sort=new`, conn.access_token);
        break;
      }

      case "submit_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/submit", conn.access_token, "POST", formEncode({
          api_type: "json",
          kind: params.kind || "self",
          sr: params.subreddit,
          title: params.title,
          text: params.text,
          url: params.url,
          nsfw: params.nsfw,
          spoiler: params.spoiler,
          flair_id: params.flair_id,
          flair_text: params.flair_text,
          resubmit: params.resubmit || true,
          sendreplies: params.sendreplies !== false,
        }));
        break;
      }

      case "crosspost": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/submit", conn.access_token, "POST", formEncode({
          api_type: "json",
          kind: "crosspost",
          sr: params.subreddit,
          title: params.title,
          crosspost_fullname: params.crosspost_fullname,
        }));
        break;
      }

      case "edit_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/editusertext", conn.access_token, "POST", formEncode({
          api_type: "json",
          thing_id: params.thing_id,
          text: params.text,
        }));
        break;
      }

      case "delete_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/del", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "hide_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/hide", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "unhide_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/unhide", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "save_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/save", conn.access_token, "POST", formEncode({ id: params.thing_id, category: params.category }));
        break;
      }

      case "unsave_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/unsave", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "mark_nsfw": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/marknsfw", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "unmark_nsfw": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/unmarknsfw", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "set_spoiler": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/spoiler", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "unset_spoiler": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/unspoiler", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      // ===== VOTING =====
      case "vote": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/vote", conn.access_token, "POST", formEncode({
          id: params.thing_id,
          dir: params.direction, // 1 = upvote, -1 = downvote, 0 = unvote
        }));
        break;
      }

      // ===== COMMENTS =====
      case "get_comments": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/comments/${params.post_id}?limit=${params?.limit || 50}&sort=${params?.sort || "best"}&depth=${params?.depth || 5}`, conn.access_token);
        break;
      }

      case "submit_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/comment", conn.access_token, "POST", formEncode({
          api_type: "json",
          thing_id: params.thing_id,
          text: params.text,
        }));
        break;
      }

      case "edit_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/editusertext", conn.access_token, "POST", formEncode({
          api_type: "json",
          thing_id: params.thing_id,
          text: params.text,
        }));
        break;
      }

      case "delete_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/del", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "get_more_comments": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/morechildren", conn.access_token, "POST", formEncode({
          api_type: "json",
          link_id: params.link_id,
          children: params.children.join(","),
          sort: params.sort || "best",
        }));
        break;
      }

      // ===== SEARCH =====
      case "search": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        const sr = params.subreddit ? `/r/${params.subreddit}` : "";
        result = await redditFetch(`${sr}/search?q=${q}&limit=${params?.limit || 25}&sort=${params?.sort || "relevance"}&t=${params?.time || "all"}&type=${params?.type || "link"}`, conn.access_token);
        break;
      }

      case "search_subreddits": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await redditFetch(`/subreddits/search?q=${q}&limit=${params?.limit || 10}`, conn.access_token);
        break;
      }

      case "search_users": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await redditFetch(`/users/search?q=${q}&limit=${params?.limit || 10}`, conn.access_token);
        break;
      }

      // ===== SUBREDDITS =====
      case "get_subreddit": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about`, conn.access_token);
        break;
      }

      case "get_subreddit_rules": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about/rules`, conn.access_token);
        break;
      }

      case "get_subreddit_hot": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/hot?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_subreddit_new": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/new?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_subreddit_top": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/top?limit=${params?.limit || 25}&t=${params?.time || "day"}`, conn.access_token);
        break;
      }

      case "get_subreddit_rising": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/rising?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_subreddit_controversial": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/controversial?limit=${params?.limit || 25}&t=${params?.time || "day"}`, conn.access_token);
        break;
      }

      case "subscribe": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/subscribe", conn.access_token, "POST", formEncode({
          action: "sub",
          sr_name: params.subreddit,
        }));
        break;
      }

      case "unsubscribe": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/subscribe", conn.access_token, "POST", formEncode({
          action: "unsub",
          sr_name: params.subreddit,
        }));
        break;
      }

      case "get_my_subreddits": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/subreddits/mine/${params?.where || "subscriber"}?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_popular_subreddits": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/subreddits/popular?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_new_subreddits": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/subreddits/new?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== PRIVATE MESSAGES =====
      case "get_inbox": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/message/inbox?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_unread": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/message/unread?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_sent": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/message/sent?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "send_message": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/compose", conn.access_token, "POST", formEncode({
          api_type: "json",
          to: params.to,
          subject: params.subject,
          text: params.text,
        }));
        break;
      }

      case "reply_message": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/comment", conn.access_token, "POST", formEncode({
          api_type: "json",
          thing_id: params.thing_id,
          text: params.text,
        }));
        break;
      }

      case "mark_read": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/read_message", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "mark_unread": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/unread_message", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "mark_all_read": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/read_all_messages", conn.access_token, "POST", "");
        break;
      }

      // ===== FLAIRS =====
      case "get_link_flairs": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/api/link_flair_v2`, conn.access_token);
        break;
      }

      case "get_user_flairs": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/api/user_flair_v2`, conn.access_token);
        break;
      }

      case "select_flair": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/api/selectflair`, conn.access_token, "POST", formEncode({
          api_type: "json",
          flair_template_id: params.flair_id,
          link: params.link,
          name: params.name,
          text: params.text,
        }));
        break;
      }

      // ===== MODERATION =====
      case "get_modqueue": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about/modqueue?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_reports": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about/reports?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_spam": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about/spam?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_edited": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about/edited?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_modlog": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about/log?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "approve": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/approve", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "remove": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/remove", conn.access_token, "POST", formEncode({ id: params.thing_id, spam: params.spam || false }));
        break;
      }

      case "distinguish": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/distinguish", conn.access_token, "POST", formEncode({
          api_type: "json",
          id: params.thing_id,
          how: params.how || "yes", // "yes", "no", "admin", "special"
          sticky: params.sticky || false,
        }));
        break;
      }

      case "lock": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/lock", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "unlock": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/unlock", conn.access_token, "POST", formEncode({ id: params.thing_id }));
        break;
      }

      case "set_contest_mode": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/set_contest_mode", conn.access_token, "POST", formEncode({
          id: params.thing_id,
          state: params.state,
        }));
        break;
      }

      case "sticky_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/set_subreddit_sticky", conn.access_token, "POST", formEncode({
          id: params.thing_id,
          state: true,
          num: params.num || 1,
        }));
        break;
      }

      case "unsticky_post": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/set_subreddit_sticky", conn.access_token, "POST", formEncode({
          id: params.thing_id,
          state: false,
        }));
        break;
      }

      // ===== REPORT =====
      case "report": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/report", conn.access_token, "POST", formEncode({
          api_type: "json",
          thing_id: params.thing_id,
          reason: params.reason,
          other_reason: params.other_reason,
          rule_reason: params.rule_reason,
        }));
        break;
      }

      // ===== AWARDS =====
      case "get_post_info": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/api/info?id=${params.thing_id}`, conn.access_token);
        break;
      }

      // ===== TRENDING =====
      case "get_popular": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/hot?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      case "get_best": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/best?limit=${params?.limit || 25}`, conn.access_token);
        break;
      }

      // ===== WIKI =====
      case "get_wiki_page": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/wiki/${params.page || "index"}`, conn.access_token);
        break;
      }

      case "get_wiki_pages": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/wiki/pages`, conn.access_token);
        break;
      }

      case "edit_wiki_page": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/api/wiki/edit`, conn.access_token, "POST", formEncode({
          page: params.page,
          content: params.content,
          reason: params.reason || "",
        }));
        break;
      }

      // ===== MULTIREDDITS =====
      case "get_my_multireddits": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/multi/mine", conn.access_token);
        break;
      }

      case "get_multireddit": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/api/multi/user/${params.username}/m/${params.multi_name}`, conn.access_token);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("reddit-api error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

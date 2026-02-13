import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const X_API_URL = "https://api.x.com/2";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "twitter")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Twitter/X not connected for this account");
  return data;
}

async function xFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${X_API_URL}${endpoint}`;
  const opts: any = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.errors) throw new Error(`X API: ${JSON.stringify(data.errors)}`);
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
      // ===== OAUTH2 TOKEN EXCHANGE =====
      case "exchange_code": {
        const { code, client_id, client_secret, redirect_uri, code_verifier } = params;
        if (!code || !client_id) throw new Error("Missing code or client_id");
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            code,
            grant_type: "authorization_code",
            redirect_uri: redirect_uri || "",
            code_verifier: code_verifier || "challenge",
            client_id,
          }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
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
        const resp = await fetch("https://api.x.com/2/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${basicAuth}` },
          body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token, client_id }).toString(),
        });
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.access_token,
            refresh_token: result.refresh_token || conn.refresh_token,
            token_expires_at: new Date(Date.now() + (result.expires_in || 7200) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        }
        break;
      }

      // ===== USER / PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        const token = params?.access_token_override || conn.access_token;
        result = await xFetch("/users/me?user.fields=id,name,username,profile_image_url,description,public_metrics,verified,created_at,location,url,pinned_tweet_id,protected", token);
        break;
      }

      case "get_user_by_username": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/users/by/username/${params.username}?user.fields=id,name,username,profile_image_url,description,public_metrics,verified,created_at,location,url`, conn.access_token);
        break;
      }

      case "get_user_by_id": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/users/${params.user_id}?user.fields=id,name,username,profile_image_url,description,public_metrics,verified,created_at`, conn.access_token);
        break;
      }

      case "get_users_by_ids": {
        const conn = await getConnection(supabase, account_id);
        const ids = params.user_ids.join(",");
        result = await xFetch(`/users?ids=${ids}&user.fields=id,name,username,profile_image_url,description,public_metrics,verified`, conn.access_token);
        break;
      }

      // ===== TWEETS =====
      case "get_tweets": {
        const conn = await getConnection(supabase, account_id);
        const userId = params?.user_id || conn.platform_user_id;
        result = await xFetch(`/users/${userId}/tweets?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text,attachments,referenced_tweets,conversation_id,in_reply_to_user_id,lang,source&expansions=attachments.media_keys&media.fields=url,preview_image_url,type,duration_ms,height,width`, conn.access_token);
        break;
      }

      case "get_tweet_by_id": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}?tweet.fields=created_at,public_metrics,text,attachments,referenced_tweets,conversation_id,author_id,lang,source&expansions=author_id,attachments.media_keys&user.fields=name,username,profile_image_url&media.fields=url,preview_image_url,type`, conn.access_token);
        break;
      }

      case "get_tweets_by_ids": {
        const conn = await getConnection(supabase, account_id);
        const ids = params.tweet_ids.join(",");
        result = await xFetch(`/tweets?ids=${ids}&tweet.fields=created_at,public_metrics,text,author_id&expansions=author_id&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "create_tweet": {
        const conn = await getConnection(supabase, account_id);
        const body: any = { text: params.text };
        if (params.reply_to) body.reply = { in_reply_to_tweet_id: params.reply_to };
        if (params.quote_tweet_id) body.quote_tweet_id = params.quote_tweet_id;
        if (params.media_ids) body.media = { media_ids: params.media_ids };
        if (params.poll) body.poll = { options: params.poll.options, duration_minutes: params.poll.duration_minutes || 1440 };
        result = await xFetch("/tweets", conn.access_token, "POST", body);
        if (params.post_id && result.data?.id) {
          await supabase.from("social_posts").update({
            platform_post_id: result.data.id,
            status: "published",
            published_at: new Date().toISOString(),
          }).eq("id", params.post_id);
        }
        break;
      }

      case "delete_tweet": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== TIMELINES =====
      case "get_mentions": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/mentions?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text,author_id&expansions=author_id&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "get_home_timeline": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/timelines/reverse_chronological?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text,author_id&expansions=author_id&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      // ===== SEARCH =====
      case "search": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await xFetch(`/tweets/search/recent?query=${q}&max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,author_id,lang,source&expansions=author_id&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "search_all": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await xFetch(`/tweets/search/all?query=${q}&max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,author_id`, conn.access_token);
        break;
      }

      // ===== LIKES =====
      case "like_tweet": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/likes`, conn.access_token, "POST", { tweet_id: params.tweet_id });
        break;
      }

      case "unlike_tweet": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/likes/${params.tweet_id}`, conn.access_token, "DELETE");
        break;
      }

      case "get_liked_tweets": {
        const conn = await getConnection(supabase, account_id);
        const userId = params?.user_id || conn.platform_user_id;
        result = await xFetch(`/users/${userId}/liked_tweets?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text`, conn.access_token);
        break;
      }

      case "get_liking_users": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}/liking_users?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url,public_metrics`, conn.access_token);
        break;
      }

      // ===== RETWEETS =====
      case "retweet": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/retweets`, conn.access_token, "POST", { tweet_id: params.tweet_id });
        break;
      }

      case "unretweet": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/retweets/${params.tweet_id}`, conn.access_token, "DELETE");
        break;
      }

      case "get_retweeters": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}/retweeted_by?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url,public_metrics`, conn.access_token);
        break;
      }

      // ===== QUOTE TWEETS =====
      case "get_quote_tweets": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}/quote_tweets?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text,author_id&expansions=author_id&user.fields=name,username`, conn.access_token);
        break;
      }

      // ===== BOOKMARKS =====
      case "get_bookmarks": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/bookmarks?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text`, conn.access_token);
        break;
      }

      case "bookmark_tweet": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/bookmarks`, conn.access_token, "POST", { tweet_id: params.tweet_id });
        break;
      }

      case "remove_bookmark": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/bookmarks/${params.tweet_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== FOLLOWERS / FOLLOWING =====
      case "get_followers": {
        const conn = await getConnection(supabase, account_id);
        const userId = params?.user_id || conn.platform_user_id;
        result = await xFetch(`/users/${userId}/followers?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url,public_metrics,description,verified`, conn.access_token);
        break;
      }

      case "get_following": {
        const conn = await getConnection(supabase, account_id);
        const userId = params?.user_id || conn.platform_user_id;
        result = await xFetch(`/users/${userId}/following?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url,public_metrics,description,verified`, conn.access_token);
        break;
      }

      case "follow_user": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/following`, conn.access_token, "POST", { target_user_id: params.target_user_id });
        break;
      }

      case "unfollow_user": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/following/${params.target_user_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== MUTE / BLOCK =====
      case "mute_user": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/muting`, conn.access_token, "POST", { target_user_id: params.target_user_id });
        break;
      }

      case "unmute_user": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/muting/${params.target_user_id}`, conn.access_token, "DELETE");
        break;
      }

      case "get_muted_users": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/muting?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "block_user": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/blocking`, conn.access_token, "POST", { target_user_id: params.target_user_id });
        break;
      }

      case "unblock_user": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/blocking/${params.target_user_id}`, conn.access_token, "DELETE");
        break;
      }

      case "get_blocked_users": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/blocking?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      // ===== DIRECT MESSAGES =====
      case "get_dm_events": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/dm_events?max_results=${params?.limit || 20}&dm_event.fields=id,text,event_type,created_at,sender_id,dm_conversation_id,attachments,referenced_tweets&expansions=sender_id&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "get_dm_conversation": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/dm_conversations/${params.conversation_id}/dm_events?max_results=${params?.limit || 20}&dm_event.fields=id,text,event_type,created_at,sender_id,attachments`, conn.access_token);
        break;
      }

      case "get_dm_conversation_with_user": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/dm_conversations/with/${params.participant_id}/dm_events?max_results=${params?.limit || 20}&dm_event.fields=id,text,event_type,created_at,sender_id`, conn.access_token);
        break;
      }

      case "send_dm": {
        const conn = await getConnection(supabase, account_id);
        if (params.conversation_id) {
          result = await xFetch(`/dm_conversations/${params.conversation_id}/messages`, conn.access_token, "POST", { text: params.text });
        } else {
          result = await xFetch("/dm_conversations", conn.access_token, "POST", {
            message: { text: params.text },
            participant_ids: [params.recipient_id],
            conversation_type: "Group",
          });
          if (params.recipient_id && !params.conversation_id) {
            result = await xFetch(`/dm_conversations/with/${params.recipient_id}/messages`, conn.access_token, "POST", { text: params.text });
          }
        }
        break;
      }

      // ===== LISTS =====
      case "get_owned_lists": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/owned_lists?max_results=${params?.limit || 25}&list.fields=id,name,description,follower_count,member_count,private,owner_id,created_at`, conn.access_token);
        break;
      }

      case "get_list": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/lists/${params.list_id}?list.fields=id,name,description,follower_count,member_count,private,owner_id,created_at`, conn.access_token);
        break;
      }

      case "get_list_tweets": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/lists/${params.list_id}/tweets?max_results=${params?.limit || 25}&tweet.fields=created_at,public_metrics,text,author_id&expansions=author_id&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "get_list_members": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/lists/${params.list_id}/members?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url,public_metrics`, conn.access_token);
        break;
      }

      case "create_list": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch("/lists", conn.access_token, "POST", {
          name: params.name,
          description: params.description || "",
          private: params.private || false,
        });
        break;
      }

      case "delete_list": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/lists/${params.list_id}`, conn.access_token, "DELETE");
        break;
      }

      case "add_list_member": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/lists/${params.list_id}/members`, conn.access_token, "POST", { user_id: params.user_id });
        break;
      }

      case "remove_list_member": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/lists/${params.list_id}/members/${params.user_id}`, conn.access_token, "DELETE");
        break;
      }

      case "follow_list": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/followed_lists`, conn.access_token, "POST", { list_id: params.list_id });
        break;
      }

      case "unfollow_list": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/followed_lists/${params.list_id}`, conn.access_token, "DELETE");
        break;
      }

      case "pin_list": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/pinned_lists`, conn.access_token, "POST", { list_id: params.list_id });
        break;
      }

      // ===== SPACES =====
      case "get_space": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/spaces/${params.space_id}?space.fields=id,state,title,host_ids,created_at,started_at,ended_at,speaker_ids,invited_user_ids,participant_count,scheduled_start,is_ticketed,topic_ids,lang&expansions=host_ids,speaker_ids&user.fields=name,username,profile_image_url`, conn.access_token);
        break;
      }

      case "search_spaces": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await xFetch(`/spaces/search?query=${q}&state=${params?.state || "live"}&space.fields=id,state,title,host_ids,participant_count,scheduled_start`, conn.access_token);
        break;
      }

      // ===== HIDE REPLIES =====
      case "hide_reply": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}/hidden`, conn.access_token, "PUT", { hidden: true });
        break;
      }

      case "unhide_reply": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch(`/tweets/${params.tweet_id}/hidden`, conn.access_token, "PUT", { hidden: false });
        break;
      }

      // ===== TWEET COUNTS =====
      case "get_tweet_counts": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await xFetch(`/tweets/counts/recent?query=${q}&granularity=${params?.granularity || "day"}`, conn.access_token);
        break;
      }

      // ===== USER SEARCH =====
      case "search_users": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await xFetch(`/users/search?query=${q}&max_results=${params?.limit || 10}&user.fields=id,name,username,profile_image_url,public_metrics,description,verified`, conn.access_token);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("twitter-api error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

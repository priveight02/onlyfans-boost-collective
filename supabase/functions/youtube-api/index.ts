import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YT_API = "https://www.googleapis.com/youtube/v3";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase.from("social_connections").select("*").eq("account_id", accountId).eq("platform", "youtube").eq("is_connected", true).single();
  if (!data?.access_token) throw new Error("YouTube not connected for this account");
  return data;
}

async function ytFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${YT_API}${endpoint}`;
  const opts: any = { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.error) throw new Error(`YouTube API [${data.error.code}]: ${data.error.message}`);
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
        const resp = await fetch("https://oauth2.googleapis.com/token", {
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
        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ refresh_token: conn.refresh_token, client_id, client_secret, grant_type: "refresh_token" }).toString(),
        });
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({ access_token: result.access_token, token_expires_at: new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", conn.id);
        }
        break;
      }

      // ===== CHANNELS =====
      case "get_my_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/channels?part=snippet,contentDetails,statistics,brandingSettings,status&mine=true", conn.access_token);
        break;
      }
      case "get_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/channels?part=snippet,contentDetails,statistics,brandingSettings&id=${params.channel_id}`, conn.access_token);
        break;
      }
      case "get_channel_by_username": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/channels?part=snippet,statistics&forHandle=${encodeURIComponent(params.username)}`, conn.access_token);
        break;
      }
      case "update_channel": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/channels?part=brandingSettings", conn.access_token, "PUT", params.channel_data);
        break;
      }

      // ===== VIDEOS =====
      case "list_my_videos": {
        const conn = await getConnection(supabase, account_id);
        // Get uploads playlist from channel
        const ch = await ytFetch("/channels?part=contentDetails&mine=true", conn.access_token);
        const uploadsId = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsId) {
          result = await ytFetch(`/playlistItems?part=snippet,contentDetails,status&playlistId=${uploadsId}&maxResults=${params?.limit || 25}`, conn.access_token);
        }
        break;
      }
      case "get_video": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/videos?part=snippet,contentDetails,statistics,status,liveStreamingDetails,player&id=${params.video_id}`, conn.access_token);
        break;
      }
      case "update_video": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/videos?part=snippet,status", conn.access_token, "PUT", params.video_data);
        break;
      }
      case "delete_video": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/videos?id=${params.video_id}`, conn.access_token, "DELETE");
        break;
      }
      case "rate_video": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/videos/rate?id=${params.video_id}&rating=${params.rating || "like"}`, conn.access_token, "POST");
        break;
      }
      case "get_video_rating": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/videos/getRating?id=${params.video_id}`, conn.access_token);
        break;
      }

      // ===== SEARCH =====
      case "search": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await ytFetch(`/search?part=snippet&q=${q}&type=${params.type || "video"}&maxResults=${params?.limit || 10}&order=${params.order || "relevance"}`, conn.access_token);
        break;
      }
      case "search_my_channel": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await ytFetch(`/search?part=snippet&q=${q}&forMine=true&type=video&maxResults=${params?.limit || 10}`, conn.access_token);
        break;
      }

      // ===== COMMENTS =====
      case "get_comments": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/commentThreads?part=snippet,replies&videoId=${params.video_id}&maxResults=${params?.limit || 20}&order=${params.order || "relevance"}`, conn.access_token);
        break;
      }
      case "post_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/commentThreads?part=snippet", conn.access_token, "POST", {
          snippet: { videoId: params.video_id, topLevelComment: { snippet: { textOriginal: params.text } } },
        });
        break;
      }
      case "reply_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/comments?part=snippet", conn.access_token, "POST", {
          snippet: { parentId: params.parent_id, textOriginal: params.text },
        });
        break;
      }
      case "update_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/comments?part=snippet", conn.access_token, "PUT", {
          id: params.comment_id, snippet: { textOriginal: params.text },
        });
        break;
      }
      case "delete_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/comments?id=${params.comment_id}`, conn.access_token, "DELETE");
        break;
      }
      case "set_moderation_status": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/comments/setModerationStatus?id=${params.comment_id}&moderationStatus=${params.status || "published"}`, conn.access_token, "POST");
        break;
      }

      // ===== PLAYLISTS =====
      case "get_playlists": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/playlists?part=snippet,contentDetails,status&mine=true&maxResults=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "create_playlist": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/playlists?part=snippet,status", conn.access_token, "POST", {
          snippet: { title: params.title, description: params.description || "" },
          status: { privacyStatus: params.privacy || "public" },
        });
        break;
      }
      case "update_playlist": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/playlists?part=snippet,status", conn.access_token, "PUT", {
          id: params.playlist_id,
          snippet: { title: params.title, description: params.description || "" },
          status: { privacyStatus: params.privacy || "public" },
        });
        break;
      }
      case "delete_playlist": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/playlists?id=${params.playlist_id}`, conn.access_token, "DELETE");
        break;
      }
      case "get_playlist_items": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/playlistItems?part=snippet,contentDetails,status&playlistId=${params.playlist_id}&maxResults=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "add_to_playlist": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/playlistItems?part=snippet", conn.access_token, "POST", {
          snippet: { playlistId: params.playlist_id, resourceId: { kind: "youtube#video", videoId: params.video_id } },
        });
        break;
      }
      case "remove_from_playlist": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/playlistItems?id=${params.playlist_item_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== SUBSCRIPTIONS =====
      case "get_subscriptions": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/subscriptions?part=snippet,contentDetails&mine=true&maxResults=${params?.limit || 25}`, conn.access_token);
        break;
      }
      case "subscribe": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/subscriptions?part=snippet", conn.access_token, "POST", {
          snippet: { resourceId: { kind: "youtube#channel", channelId: params.channel_id } },
        });
        break;
      }
      case "unsubscribe": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/subscriptions?id=${params.subscription_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== CAPTIONS =====
      case "get_captions": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/captions?part=snippet&videoId=${params.video_id}`, conn.access_token);
        break;
      }
      case "delete_caption": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/captions?id=${params.caption_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== LIVE STREAMING =====
      case "list_live_broadcasts": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/liveBroadcasts?part=snippet,contentDetails,status&broadcastStatus=${params.status || "all"}&maxResults=${params?.limit || 10}`, conn.access_token);
        break;
      }
      case "create_live_broadcast": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/liveBroadcasts?part=snippet,contentDetails,status", conn.access_token, "POST", {
          snippet: { title: params.title, description: params.description || "", scheduledStartTime: params.start_time },
          contentDetails: { enableAutoStart: params.auto_start !== false },
          status: { privacyStatus: params.privacy || "public" },
        });
        break;
      }
      case "transition_broadcast": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/liveBroadcasts/transition?broadcastStatus=${params.status}&id=${params.broadcast_id}&part=status`, conn.access_token, "POST");
        break;
      }
      case "list_live_streams": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/liveStreams?part=snippet,cdn,status&mine=true&maxResults=${params?.limit || 10}`, conn.access_token);
        break;
      }
      case "get_live_chat_messages": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/liveChat/messages?liveChatId=${params.live_chat_id}&part=snippet,authorDetails&maxResults=${params?.limit || 50}`, conn.access_token);
        break;
      }
      case "send_live_chat_message": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/liveChat/messages?part=snippet", conn.access_token, "POST", {
          snippet: { liveChatId: params.live_chat_id, type: "textMessageEvent", textMessageDetails: { messageText: params.message } },
        });
        break;
      }
      case "ban_live_chat_user": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/liveChat/bans?part=snippet", conn.access_token, "POST", {
          snippet: { liveChatId: params.live_chat_id, type: params.ban_type || "permanent", bannedUserDetails: { channelId: params.channel_id } },
        });
        break;
      }

      // ===== ANALYTICS (via YouTube Analytics API) =====
      case "get_channel_analytics": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || "2020-01-01";
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await ytFetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments&dimensions=${params.dimensions || "day"}&sort=-day&maxResults=${params?.limit || 30}`, conn.access_token);
        break;
      }
      case "get_video_analytics": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || "2020-01-01";
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await ytFetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,likes,comments,shares&filters=video==${params.video_id}&dimensions=${params.dimensions || "day"}`, conn.access_token);
        break;
      }
      case "get_demographics": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || "2020-01-01";
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await ytFetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=viewerPercentage&dimensions=ageGroup,gender`, conn.access_token);
        break;
      }
      case "get_traffic_sources": {
        const conn = await getConnection(supabase, account_id);
        const startDate = params.start_date || "2020-01-01";
        const endDate = params.end_date || new Date().toISOString().split("T")[0];
        result = await ytFetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&sort=-views`, conn.access_token);
        break;
      }

      // ===== CATEGORIES =====
      case "get_categories": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/videoCategories?part=snippet&regionCode=${params.region || "US"}`, conn.access_token);
        break;
      }

      // ===== THUMBNAILS =====
      case "set_thumbnail": {
        const conn = await getConnection(supabase, account_id);
        // Thumbnail upload requires multipart - we just pass the URL for reference
        result = { message: "Thumbnail upload requires direct file upload via multipart POST to /thumbnails/set?videoId=" + params.video_id };
        break;
      }

      // ===== CHANNEL SECTIONS =====
      case "get_channel_sections": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch(`/channelSections?part=snippet,contentDetails&mine=true`, conn.access_token);
        break;
      }

      // ===== I18N =====
      case "get_languages": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/i18nLanguages?part=snippet", conn.access_token);
        break;
      }
      case "get_regions": {
        const conn = await getConnection(supabase, account_id);
        result = await ytFetch("/i18nRegions?part=snippet", conn.access_token);
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IG_GRAPH_URL = "https://graph.instagram.com/v24.0";
const FB_GRAPH_URL = "https://graph.facebook.com/v24.0";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Instagram not connected for this account");
  return data;
}

async function getPageId(token: string, igUserId: string): Promise<{ pageId: string; pageToken: string } | null> {
  try {
    const pagesResp = await fetch(`${FB_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${token}`);
    const pagesData = await pagesResp.json();
    console.log("Pages response:", JSON.stringify(pagesData).substring(0, 500));
    
    if (pagesData.data) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account?.id === igUserId) {
          console.log(`Found linked Page: ${page.name} (${page.id}) for IG user ${igUserId}`);
          return { pageId: page.id, pageToken: page.access_token || token };
        }
      }
      if (pagesData.data.length === 1) {
        const page = pagesData.data[0];
        console.log(`Using only available Page: ${page.name} (${page.id})`);
        return { pageId: page.id, pageToken: page.access_token || token };
      }
    }
    console.log("No linked Facebook Page found for IG user:", igUserId);
    return null;
  } catch (e: any) {
    console.log("getPageId error:", e.message);
    return null;
  }
}

async function igFetch(endpoint: string, token: string, method = "GET", body?: any, useFbGraph = false) {
  const baseUrl = useFbGraph ? FB_GRAPH_URL : IG_GRAPH_URL;
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const sep = url.includes("?") ? "&" : "?";
  const fetchUrl = method === "GET" ? `${url}${sep}access_token=${token}` : url;
  
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (method !== "GET") {
    opts.body = JSON.stringify({ ...body, access_token: token });
  }
  
  const resp = await fetch(fetchUrl, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`IG API: ${data.error.message}`);
  return data;
}

// Helper for Facebook Graph API calls (ads, business)
async function fbFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${FB_GRAPH_URL}${endpoint}`;
  const sep = url.includes("?") ? "&" : "?";
  const fetchUrl = method === "GET" ? `${url}${sep}access_token=${token}` : url;
  
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (method !== "GET") {
    opts.body = JSON.stringify({ ...body, access_token: token });
  }
  
  const resp = await fetch(fetchUrl, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`FB API: ${data.error.message}`);
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

    const conn = await getConnection(supabase, account_id);
    const token = conn.access_token;
    const igUserId = conn.platform_user_id;
    
    let result: any;

    switch (action) {
      // ===== PROFILE =====
      case "get_profile":
        result = await igFetch(`/${igUserId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website`, token);
        break;

      case "get_profile_basic":
        result = await igFetch(`/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count`, token);
        break;

      // ===== MEDIA =====
      case "get_media":
        result = await igFetch(`/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${params?.limit || 25}`, token);
        break;

      case "get_media_next_page":
        if (!params?.next_url) throw new Error("next_url required");
        result = await igFetch(params.next_url, token);
        break;

      case "get_media_details":
        result = await igFetch(`/${params.media_id}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url}`, token);
        break;

      // ===== TAGGED & MENTIONS =====
      case "get_tagged_media":
        result = await igFetch(`/${igUserId}/tags?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${params?.limit || 25}`, token);
        break;

      case "get_mentioned_media":
        result = await igFetch(`/${igUserId}/mentioned_media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=${params?.limit || 25}`, token);
        break;

      case "get_mentioned_comment":
        result = await igFetch(`/${params.media_id}?fields=id,caption,media_type,permalink,timestamp,username&mentioned_comment_id=${params.comment_id || ""}`, token);
        break;

      // ===== LIVE MEDIA =====
      case "get_live_media":
        result = await igFetch(`/${igUserId}/live_media?fields=id,media_type,timestamp,media_url,permalink`, token);
        break;

      // ===== PUBLISHING =====
      case "create_photo_post": {
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          image_url: params.image_url,
          caption: params.caption || "",
          ...(params.location_id ? { location_id: params.location_id } : {}),
          ...(params.user_tags ? { user_tags: params.user_tags } : {}),
          ...(params.alt_text ? { alt_text: params.alt_text } : {}),
        });
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", {
          creation_id: container.id,
        });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_reel": {
        const container = await igFetch(`/${igUserId}/media`, token, "POST", {
          video_url: params.video_url,
          caption: params.caption || "",
          media_type: "REELS",
          share_to_feed: params.share_to_feed ?? true,
          ...(params.cover_url ? { cover_url: params.cover_url } : {}),
          ...(params.thumb_offset ? { thumb_offset: params.thumb_offset } : {}),
          ...(params.audio_name ? { audio_name: params.audio_name } : {}),
        });
        let status = "IN_PROGRESS";
        let attempts = 0;
        while (status === "IN_PROGRESS" && attempts < 30) {
          await new Promise(r => setTimeout(r, 5000));
          const check = await igFetch(`/${container.id}?fields=status_code`, token);
          status = check.status_code;
          attempts++;
        }
        if (status !== "FINISHED") throw new Error(`Reel processing failed: ${status}`);
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: container.id });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_carousel": {
        const children: string[] = [];
        for (const item of params.items) {
          const child = await igFetch(`/${igUserId}/media`, token, "POST", {
            ...(item.video_url ? { video_url: item.video_url, media_type: "VIDEO" } : { image_url: item.image_url }),
            is_carousel_item: true,
          });
          children.push(child.id);
        }
        const carousel = await igFetch(`/${igUserId}/media`, token, "POST", {
          media_type: "CAROUSEL",
          caption: params.caption || "",
          children: children.join(","),
        });
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: carousel.id });
        if (params.post_id) {
          await supabase.from("social_posts").update({ 
            platform_post_id: result.id, status: "published", published_at: new Date().toISOString() 
          }).eq("id", params.post_id);
        }
        break;
      }

      case "create_story": {
        const storyBody: any = { media_type: "STORIES" };
        if (params.video_url) storyBody.video_url = params.video_url;
        else storyBody.image_url = params.image_url;
        const container = await igFetch(`/${igUserId}/media`, token, "POST", storyBody);
        result = await igFetch(`/${igUserId}/media_publish`, token, "POST", { creation_id: container.id });
        break;
      }

      case "check_container_status":
        result = await igFetch(`/${params.container_id}?fields=id,status_code,status`, token);
        break;

      // ===== DELETE MEDIA =====
      case "delete_media":
        result = await igFetch(`/${params.media_id}`, token, "DELETE");
        break;

      // ===== UPDATE MEDIA =====
      case "update_media_caption":
        result = await igFetch(`/${params.media_id}`, token, "POST", {
          caption: params.caption,
        });
        break;

      // ===== COMMENTS =====
      case "get_comments":
        result = await igFetch(`/${params.media_id}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&limit=${params?.limit || 50}`, token);
        break;

      case "reply_to_comment":
        result = await igFetch(`/${params.comment_id}/replies`, token, "POST", { message: params.message });
        await supabase.from("social_comment_replies").insert({
          account_id: account_id,
          platform: "instagram",
          post_id: params.media_id || "",
          comment_id: params.comment_id,
          comment_text: params.comment_text || "",
          comment_author: params.comment_author || "",
          reply_text: params.message,
          reply_sent_at: new Date().toISOString(),
          status: "sent",
        });
        break;

      case "delete_comment":
        result = await igFetch(`/${params.comment_id}`, token, "DELETE");
        break;

      case "hide_comment":
        result = await igFetch(`/${params.comment_id}`, token, "POST", { hide: true });
        break;

      case "unhide_comment":
        result = await igFetch(`/${params.comment_id}`, token, "POST", { hide: false });
        break;

      case "enable_comments":
        result = await igFetch(`/${params.media_id}`, token, "POST", { comment_enabled: true });
        break;

      case "disable_comments":
        result = await igFetch(`/${params.media_id}`, token, "POST", { comment_enabled: false });
        break;

      // ===== INSIGHTS =====
      case "get_account_insights": {
        const period = params?.period || "day";
        const since = params?.since ? `&since=${params.since}` : "";
        const until = params?.until ? `&until=${params.until}` : "";
        // v24.0 valid metrics differ by period
        const dayMetrics = "reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,shares,saves,replies";
        const weekMetrics = "reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,shares,saves,replies";
        const monthMetrics = "reach,follower_count,profile_views,website_clicks,accounts_engaged,total_interactions,likes,comments,shares,saves,replies";
        const metrics = period === "day" ? dayMetrics : period === "week" ? weekMetrics : monthMetrics;
        result = await igFetch(`/${igUserId}/insights?metric=${metrics}&period=${period}${since}${until}`, token);
        if (result.data) {
          for (const metric of result.data) {
            const latestValue = metric.values?.[metric.values.length - 1];
            if (latestValue) {
              await supabase.from("social_analytics").upsert({
                account_id: account_id,
                platform: "instagram",
                metric_type: metric.name,
                metric_value: latestValue.value,
                period_start: latestValue.end_time,
                raw_data: metric,
                fetched_at: new Date().toISOString(),
              }, { onConflict: "account_id,platform,metric_type" }).select();
            }
          }
        }
        break;
      }

      case "get_account_insights_demographics":
        result = await igFetch(`/${igUserId}/insights?metric=follower_demographics,reached_audience_demographics,engaged_audience_demographics&period=lifetime&metric_type=total_value&timeframe=last_90_days`, token);
        break;

      case "get_account_insights_online_followers":
        result = await igFetch(`/${igUserId}/insights?metric=online_followers&period=lifetime`, token);
        break;

      case "get_media_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=reach,likes,comments,shares,saves,total_interactions`, token);
        break;

      case "get_reel_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=clips_replays_count,ig_reels_aggregated_all_plays_count,ig_reels_avg_watch_time,ig_reels_video_view_total_time,likes,comments,shares,saves,reach,total_interactions`, token);
        break;

      case "get_story_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=exits,impressions,reach,replies,taps_forward,taps_back`, token);
        break;

      // ===== STORIES =====
      case "get_stories":
        result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,timestamp,permalink`, token);
        break;

      case "get_story_highlights": {
        // Story highlights are fetched via the Facebook Graph API as they're not directly on IG Graph
        // First try to get highlights via the user's media with story highlight type
        const pageInfo = await getPageId(token, igUserId);
        if (pageInfo) {
          try {
            // Try Facebook Page's story highlights
            const highlightsResp = await fbFetch(`/${igUserId}?fields=story_highlights{id,title,media_type,media_url,thumbnail_url,timestamp,permalink,cover_media}`, token);
            result = highlightsResp;
          } catch {
            // Fallback: get all stories including highlights
            result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink`, token);
          }
        } else {
          result = await igFetch(`/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink`, token);
        }
        break;
      }

      // ===== CONTENT INTERACTION =====
      case "like_comment":
        result = await igFetch(`/${params.comment_id}/likes`, token, "POST");
        break;

      case "unlike_comment":
        result = await igFetch(`/${params.comment_id}/likes`, token, "DELETE");
        break;

      case "get_media_children":
        result = await igFetch(`/${params.media_id}/children?fields=id,media_type,media_url,thumbnail_url,timestamp`, token);
        break;

      // ===== HASHTAG SEARCH =====
      case "search_hashtag":
        result = await igFetch(`/ig_hashtag_search?q=${encodeURIComponent(params.hashtag)}&user_id=${igUserId}`, token);
        break;

      case "get_hashtag_top_media":
        result = await igFetch(`/${params.hashtag_id}/top_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,permalink,timestamp`, token);
        break;

      case "get_hashtag_recent_media":
        result = await igFetch(`/${params.hashtag_id}/recent_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,permalink,timestamp`, token);
        break;

      // ===== BUSINESS DISCOVERY =====
      case "discover_user":
        result = await igFetch(`/${igUserId}?fields=business_discovery.fields(id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(${params?.media_limit || 12}){id,caption,media_type,like_count,comments_count,permalink,timestamp})&username=${params.username}`, token);
        break;

      case "discover_user_media":
        result = await igFetch(`/${igUserId}?fields=business_discovery.fields(media.limit(${params?.limit || 25}).after(${params?.after || ""}){id,caption,media_type,like_count,comments_count,permalink,timestamp,media_url})&username=${params.username}`, token);
        break;

      // ===== CONVERSATIONS (DM Inbox) =====
      case "get_conversations": {
        const limit = params?.limit || 20;
        const folder = params?.folder || "";
        const richFields = `id,participants,messages.limit(${params?.messages_limit || 5}){id,message,from,to,created_time,attachments,shares,story,sticker},updated_time`;
        
        let realUserId = igUserId;
        try {
          const meResp = await fetch(`${IG_GRAPH_URL}/me?fields=id&access_token=${token}`);
          const meData = await meResp.json();
          if (meData?.id && meData.id !== igUserId) {
            console.log(`ID mismatch: stored=${igUserId}, real=${meData.id} — using real ID`);
            realUserId = meData.id;
            await supabase.from("social_connections").update({ platform_user_id: realUserId }).eq("account_id", account_id).eq("platform", "instagram");
          }
        } catch {}
        
        const fetchWithPagination = async (url: string, maxPages = 10): Promise<any[]> => {
          const allData: any[] = [];
          let currentUrl: string | null = url;
          let page = 0;
          while (currentUrl && page < maxPages) {
            page++;
            try {
              const resp = await fetch(currentUrl);
              const json = await resp.json();
              console.log(`Page ${page}: ${json?.data?.length || 0} items, has_next: ${!!json?.paging?.next}`);
              if (json?.error) { console.log(`API error:`, json.error.message); break; }
              if (json?.data?.length > 0) allData.push(...json.data);
              currentUrl = json?.paging?.next || null;
              if (!json?.data?.length && !json?.paging?.next) break;
            } catch (e: any) { console.log(`Page ${page} error:`, e.message); break; }
          }
          return allData;
        };
        
        const endpoints = [
          `${IG_GRAPH_URL}/me/conversations?platform=instagram&limit=${limit}&fields=${richFields}&access_token=${token}`,
          `${IG_GRAPH_URL}/${realUserId}/conversations?platform=instagram&limit=${limit}&fields=${richFields}&access_token=${token}`,
        ];
        
        let allConvos: any[] = [];
        for (const ep of endpoints) {
          let url = ep;
          if (folder) url += `&folder=${folder}`;
          console.log("Trying:", url.split("access_token")[0]);
          allConvos = await fetchWithPagination(url);
          if (allConvos.length > 0) break;
          
          const simpleUrl = url.replace(richFields, "id,updated_time,participants");
          console.log("Retrying simple fields...");
          allConvos = await fetchWithPagination(simpleUrl);
          if (allConvos.length > 0) break;
        }
        
        console.log(`Total conversations fetched: ${allConvos.length}`);
        result = { data: allConvos, paging: null };
        break;
      }

      case "get_all_conversations": {
        const allLimit = params?.limit || 50;
        const msgLimit = params?.messages_limit || 10;
        const richFields = `id,participants,messages.limit(${msgLimit}){id,message,from,to,created_time,attachments,shares,story,sticker},updated_time`;
        
        let realUserId = igUserId;
        try {
          const meResp = await fetch(`${IG_GRAPH_URL}/me?fields=id&access_token=${token}`);
          const meData = await meResp.json();
          if (meData?.id && meData.id !== igUserId) {
            console.log(`ID update: ${igUserId} → ${meData.id}`);
            realUserId = meData.id;
            await supabase.from("social_connections").update({ platform_user_id: realUserId }).eq("account_id", account_id).eq("platform", "instagram");
          }
        } catch {}
        
        const fetchWithPagination = async (startUrl: string, maxPages = 10): Promise<any[]> => {
          const allData: any[] = [];
          let currentUrl: string | null = startUrl;
          let page = 0;
          while (currentUrl && page < maxPages) {
            page++;
            try {
              const resp = await fetch(currentUrl);
              const json = await resp.json();
              if (json?.error) { console.log(`Error page ${page}:`, json.error.message); break; }
              if (json?.data?.length > 0) allData.push(...json.data);
              currentUrl = json?.paging?.next || null;
              if (!json?.data?.length && !json?.paging?.next) break;
            } catch (e: any) { console.log(`Page ${page} error:`, e.message); break; }
          }
          return allData;
        };
        
        const fetchFolder = async (folderName: string): Promise<any[]> => {
          for (const base of [`${IG_GRAPH_URL}/me`, `${IG_GRAPH_URL}/${realUserId}`]) {
            let url = `${base}/conversations?platform=instagram&limit=${allLimit}&fields=${richFields}&access_token=${token}&folder=${folderName}`;
            
            let convos = await fetchWithPagination(url);
            if (convos.length > 0) return convos;
            
            let simpleUrl = `${base}/conversations?platform=instagram&limit=${allLimit}&fields=id,updated_time,participants&access_token=${token}&folder=${folderName}`;
            convos = await fetchWithPagination(simpleUrl);
            if (convos.length > 0) return convos;
          }
          return [];
        };
        
        const [primary, general, requests] = await Promise.all([
          fetchFolder("inbox"),
          fetchFolder("general"),
          fetchFolder("other"),
        ]);
        
        const total = primary.length + general.length + requests.length;
        console.log(`Found ${total} conversations total`);
        
        result = { primary, general, requests, total };
        break;
      }

      case "fetch_participant_profiles": {
        // Batch fetch profile pictures for participant IGSIDs
        const userIds: string[] = params?.user_ids || [];
        if (userIds.length === 0) throw new Error("user_ids array required");
        
        const profiles: Record<string, { name?: string; profile_pic?: string; username?: string }> = {};
        
        // Get page token ONCE (not per user!)
        const pageInfo = await getPageId(token, igUserId);
        const lookupToken = pageInfo?.pageToken || token;
        console.log(`Fetching profiles for ${userIds.length} users, pageToken available: ${!!pageInfo}`);
        
        // Process in parallel batches of 5
        const batchSize = 5;
        for (let i = 0; i < Math.min(userIds.length, 50); i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          await Promise.all(batch.map(async (uid) => {
            // Method 1: FB Graph with page token (works for IGSIDs)
            try {
              const resp = await fetch(`${FB_GRAPH_URL}/${uid}?fields=name,profile_pic,username&access_token=${lookupToken}`);
              const data = await resp.json();
              if (!data.error && (data.profile_pic || data.name)) {
                profiles[uid] = { name: data.name, profile_pic: data.profile_pic, username: data.username };
                return;
              }
            } catch {}
            
            // Method 2: IG Graph API directly
            try {
              const resp2 = await fetch(`${IG_GRAPH_URL}/${uid}?fields=name,username,profile_picture_url&access_token=${token}`);
              const data2 = await resp2.json();
              if (!data2.error && (data2.profile_picture_url || data2.name)) {
                profiles[uid] = { name: data2.name, profile_pic: data2.profile_picture_url, username: data2.username };
                return;
              }
            } catch {}
            
            // Method 3: Try business_discovery if we have username from conversation
            const convoUsername = params?.usernames?.[uid];
            if (convoUsername) {
              try {
                const resp3 = await fetch(`${IG_GRAPH_URL}/${igUserId}?fields=business_discovery.fields(profile_picture_url,name,username){username=${convoUsername}}&access_token=${token}`);
                const data3 = await resp3.json();
                const bd = data3?.business_discovery;
                if (bd?.profile_picture_url) {
                  profiles[uid] = { name: bd.name, profile_pic: bd.profile_picture_url, username: bd.username };
                }
              } catch {}
            }
          }));
        }
        
        console.log(`Fetched ${Object.keys(profiles).length}/${userIds.length} profiles`);
        result = { profiles, fetched: Object.keys(profiles).length, total: userIds.length };
        break;
      }

      case "debug_conversations": {
        let realId = igUserId;
        try {
          const meResp = await fetch(`${IG_GRAPH_URL}/me?fields=id,user_id,username&access_token=${token}`);
          const meData = await meResp.json();
          realId = meData?.id || igUserId;
        } catch {}
        
        const debugResults: any = { stored_ig_user_id: igUserId, resolved_id: realId, attempts: [] };
        
        try {
          const r1 = await fetch(`${IG_GRAPH_URL}/me/conversations?platform=instagram&limit=5&access_token=${token}`);
          const d1 = await r1.json();
          debugResults.attempts.push({ method: "/me/conversations", status: r1.status, response: d1 });
        } catch (e: any) { debugResults.attempts.push({ method: "/me/conversations", error: e.message }); }
        
        try {
          const r2 = await fetch(`${IG_GRAPH_URL}/${realId}/conversations?platform=instagram&limit=5&access_token=${token}`);
          const d2 = await r2.json();
          debugResults.attempts.push({ method: `/${realId}/conversations`, status: r2.status, response: d2 });
        } catch (e: any) { debugResults.attempts.push({ method: `/${realId}/conversations`, error: e.message }); }
        
        const permChecks: any = {};
        try {
          const msgTest = await fetch(`${IG_GRAPH_URL}/me?fields=id,username&access_token=${token}`);
          permChecks.me = await msgTest.json();
        } catch {}
        
        try {
          const r4 = await fetch(`${IG_GRAPH_URL}/${realId}/conversations?limit=5&access_token=${token}`);
          const d4 = await r4.json();
          debugResults.attempts.push({ method: `/${realId}/conversations (no platform)`, status: r4.status, response: d4 });
        } catch (e: any) { debugResults.attempts.push({ method: "no platform", error: e.message }); }
        
        if (debugResults.attempts[0]?.response?.paging?.next) {
          try {
            const nextUrl = debugResults.attempts[0].response.paging.next;
            const r5 = await fetch(nextUrl);
            const d5 = await r5.json();
            debugResults.attempts.push({ method: "page 2 of /me/conversations", response: d5 });
            
            if (d5?.paging?.next) {
              const r6 = await fetch(d5.paging.next);
              const d6 = await r6.json();
              debugResults.attempts.push({ method: "page 3 of /me/conversations", response: d6 });
            }
          } catch {}
        }
        
        debugResults.perm_checks = permChecks;
        debugResults.token_prefix = token.substring(0, 10) + "...";
        debugResults.recommendation = "If all conversations return empty data, your token needs the instagram_business_manage_messages permission.";
        
        result = debugResults;
        break;
      }

      case "get_conversation_messages": {
        if (!params?.conversation_id) throw new Error("conversation_id required");
        const msgLimit = params?.limit || 20;
        result = await igFetch(`/${params.conversation_id}?fields=messages.limit(${msgLimit}){id,message,from,to,created_time,attachments,shares,story,sticker}`, token);
        break;
      }

      // ===== MESSAGING =====
      case "send_message": {
        // Try Facebook Page first, fall back to IG user ID direct
        // Support reply_to for IG reply-to-message feature
        const pageInfo = await getPageId(token, igUserId);
        const msgBody: any = {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
        };
        // Add reply_to if provided (Instagram reply-to-message feature)
        if (params.reply_to) {
          msgBody.message.reply_to = { mid: params.reply_to };
        }
        if (pageInfo) {
          result = await igFetch(`/${pageInfo.pageId}/messages`, pageInfo.pageToken, "POST", msgBody);
        } else {
          // Fallback: send via IG user ID directly (works with instagram_manage_messages permission)
          console.log("No FB Page found, trying direct IG messaging via /me/messages");
          try {
            result = await igFetch(`/me/messages`, token, "POST", msgBody);
          } catch (e1: any) {
            console.log("Direct /me/messages failed, trying /{igUserId}/messages:", e1.message);
            result = await igFetch(`/${igUserId}/messages`, token, "POST", msgBody);
          }
        }
        break;
      }

      case "send_media_message": {
        const pageInfo2 = await getPageId(token, igUserId);
        if (pageInfo2) {
          result = await igFetch(`/${pageInfo2.pageId}/messages`, pageInfo2.pageToken, "POST", {
            recipient: { id: params.recipient_id },
            message: { attachment: { type: params.media_type || "image", payload: { url: params.media_url } } },
          });
        } else {
          try {
            result = await igFetch(`/me/messages`, token, "POST", {
              recipient: { id: params.recipient_id },
              message: { attachment: { type: params.media_type || "image", payload: { url: params.media_url } } },
            });
          } catch {
            result = await igFetch(`/${igUserId}/messages`, token, "POST", {
              recipient: { id: params.recipient_id },
              message: { attachment: { type: params.media_type || "image", payload: { url: params.media_url } } },
            });
          }
        }
        break;
      }

      case "send_reaction": {
        const pageInfoR = await getPageId(token, igUserId);
        // Instagram Messaging API reaction format
        const reactBody = {
          recipient: { id: params.recipient_id },
          sender_action: "react",
          payload: { message_id: params.message_id, reaction: params.reaction || "love" },
        };
        console.log("Sending reaction:", JSON.stringify(reactBody));
        if (pageInfoR) {
          try {
            result = await igFetch(`/${pageInfoR.pageId}/messages`, pageInfoR.pageToken, "POST", reactBody);
          } catch (e1: any) {
            console.log("Page react failed, trying alternate format:", e1.message);
            // Alternative format: use reaction_type in message body 
            const altBody = {
              recipient: { id: params.recipient_id },
              react: { message_id: params.message_id, action: "react", reaction: params.reaction || "love" },
            };
            try {
              result = await igFetch(`/${pageInfoR.pageId}/messages`, pageInfoR.pageToken, "POST", altBody);
            } catch {
              result = await igFetch(`/me/messages`, token, "POST", reactBody);
            }
          }
        } else {
          try {
            result = await igFetch(`/me/messages`, token, "POST", reactBody);
          } catch {
            result = await igFetch(`/${igUserId}/messages`, token, "POST", reactBody);
          }
        }
        console.log("Reaction result:", JSON.stringify(result));
        break;
      }

      case "remove_reaction": {
        const pageInfoRR = await getPageId(token, igUserId);
        const unreactBody = {
          recipient: { id: params.recipient_id },
          sender_action: "unreact",
          payload: { message_id: params.message_id },
        };
        if (pageInfoRR) {
          result = await igFetch(`/${pageInfoRR.pageId}/messages`, pageInfoRR.pageToken, "POST", unreactBody);
        } else {
          try {
            result = await igFetch(`/me/messages`, token, "POST", unreactBody);
          } catch {
            result = await igFetch(`/${igUserId}/messages`, token, "POST", unreactBody);
          }
        }
        break;
      }

      case "delete_message": {
        // Instagram Messaging API does NOT support DELETE on messages.
        // The correct approach is to use the "unsend" action via POST to /{message-id}
        // with the action=unsend parameter, using the Page token.
        if (!params?.message_id) throw new Error("message_id required");
        
        let deleteSuccess = false;
        const pageInfoDel = await getPageId(token, igUserId);
        const delToken = pageInfoDel?.pageToken || token;
        
        // Method 1: POST unsend action (correct IG Messaging API method)
        try {
          const unsendResp = await fetch(`${FB_GRAPH_URL}/${params.message_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: delToken, action: "unsend" }),
          });
          const unsendData = await unsendResp.json();
          console.log("Unsend result:", JSON.stringify(unsendData));
          if (!unsendData.error) {
            result = { success: true, method: "unsend", data: unsendData };
            deleteSuccess = true;
          } else {
            console.log("Unsend failed:", unsendData.error.message);
          }
        } catch (e: any) {
          console.log("Unsend error:", e.message);
        }
        
        // Method 2: DELETE request (works for some message types)
        if (!deleteSuccess) {
          try {
            const delResp = await fetch(`${FB_GRAPH_URL}/${params.message_id}?access_token=${delToken}`, { method: "DELETE" });
            const delData = await delResp.json();
            console.log("DELETE result:", JSON.stringify(delData));
            if (!delData.error) {
              result = { success: true, method: "delete", data: delData };
              deleteSuccess = true;
            } else {
              console.log("DELETE failed:", delData.error.message);
            }
          } catch (e: any) {
            console.log("DELETE error:", e.message);
          }
        }
        
        // Method 3: Try with direct user token if page token failed
        if (!deleteSuccess && pageInfoDel) {
          try {
            const delResp3 = await fetch(`${FB_GRAPH_URL}/${params.message_id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ access_token: token, action: "unsend" }),
            });
            const delData3 = await delResp3.json();
            console.log("Direct unsend result:", JSON.stringify(delData3));
            if (!delData3.error) {
              result = { success: true, method: "direct_unsend", data: delData3 };
              deleteSuccess = true;
            }
          } catch {}
        }
        
        if (!deleteSuccess) {
          // Note: Instagram API may not support message deletion for all message types
          // Messages sent by the page can be unsent, but messages from fans cannot be deleted
          result = { success: false, error: "Message deletion not supported by Instagram for this message type. The message has been removed from your dashboard." };
        }
        
        console.log("Delete message final result:", JSON.stringify(result));
        break;
      }

      // ===== HUMAN AGENT TAG =====
      case "send_human_agent_message":
        result = await igFetch(`/${igUserId}/messages`, token, "POST", {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
          messaging_type: "MESSAGE_TAG",
          tag: "HUMAN_AGENT",
        });
        break;

      // ===== CONTENT PUBLISHING STATUS =====
      case "get_content_publishing_limit":
        result = await igFetch(`/${igUserId}/content_publishing_limit?fields=config,quota_usage`, token);
        break;

      // ===== PRODUCT TAGS (Shopping) =====
      case "get_product_catalog":
        result = await igFetch(`/${igUserId}/catalog_product_search?q=${encodeURIComponent(params.query || "")}&catalog_id=${params.catalog_id}`, token);
        break;

      case "get_product_tags":
        result = await igFetch(`/${params.media_id}?fields=product_tags`, token);
        break;

      case "tag_products":
        result = await igFetch(`/${params.media_id}`, token, "POST", {
          product_tags: params.product_tags,
        });
        break;

      case "get_available_catalogs":
        result = await igFetch(`/${igUserId}/available_catalogs?fields=id,name,product_count`, token);
        break;

      case "appeal_product_rejection":
        result = await igFetch(`/${params.media_id}/product_appeal`, token, "POST", {
          appeal_reason: params.reason,
        });
        break;

      // ===== UPCOMING EVENTS =====
      case "get_upcoming_events":
        result = await igFetch(`/${igUserId}/upcoming_events?fields=id,title,start_time,end_time,event_url,cover_media_url,description`, token);
        break;

      case "create_upcoming_event":
        result = await igFetch(`/${igUserId}/upcoming_events`, token, "POST", {
          title: params.title,
          start_time: params.start_time,
          ...(params.end_time ? { end_time: params.end_time } : {}),
          ...(params.event_url ? { event_url: params.event_url } : {}),
          ...(params.cover_media_url ? { cover_media_url: params.cover_media_url } : {}),
          ...(params.description ? { description: params.description } : {}),
        });
        break;

      case "delete_upcoming_event":
        result = await igFetch(`/${params.event_id}`, token, "DELETE");
        break;

      // ===== BRANDED CONTENT =====
      case "get_branded_content_ad_permissions": {
        result = await igFetch(`/${igUserId}?fields=branded_content_ad_permissions`, token);
        break;
      }

      case "get_approved_creators":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions?fields=id,username`, token);
        break;

      case "add_approved_creator":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions`, token, "POST", {
          creator_instagram_account: params.creator_id,
        });
        break;

      case "remove_approved_creator":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions`, token, "DELETE", {
          creator_instagram_account: params.creator_id,
        });
        break;

      case "get_branded_content_posts":
        result = await igFetch(`/${igUserId}/branded_content_ad_permissions?fields=permission_type,partner{id,username,name,profile_picture_url}`, token);
        break;

      // ===== CREATOR MARKETPLACE DISCOVERY =====
      case "discover_creators": {
        // Uses business_discovery to find creators by username
        const creators: any[] = [];
        const usernames = params.usernames || [];
        for (const username of usernames.slice(0, 10)) {
          try {
            const d = await igFetch(`/${igUserId}?fields=business_discovery.fields(id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(6){id,caption,media_type,like_count,comments_count,permalink,timestamp})&username=${username}`, token);
            if (d?.business_discovery) {
              const bd = d.business_discovery;
              const engRate = bd.media?.data?.length > 0
                ? bd.media.data.reduce((s: number, m: any) => s + (m.like_count || 0) + (m.comments_count || 0), 0) / bd.media.data.length / Math.max(bd.followers_count, 1) * 100
                : 0;
              creators.push({ ...bd, engagement_rate: Math.round(engRate * 100) / 100 });
            }
          } catch (e: any) {
            creators.push({ username, error: e.message });
          }
        }
        result = { creators, total: creators.filter(c => !c.error).length };
        break;
      }

      // ===== ADS MANAGEMENT (Facebook Marketing API) =====
      case "get_ad_accounts": {
        result = await fbFetch(`/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,business_name,business_street,daily_spend_limit,spend_cap&limit=25`, token);
        break;
      }

      case "get_ad_campaigns": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        const fields = "id,name,objective,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time,buying_type,special_ad_categories";
        result = await fbFetch(`/${params.ad_account_id}/campaigns?fields=${fields}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ad_sets": {
        if (!params?.campaign_id && !params?.ad_account_id) throw new Error("campaign_id or ad_account_id required");
        const endpoint = params.campaign_id ? `/${params.campaign_id}/adsets` : `/${params.ad_account_id}/adsets`;
        const fields = "id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,created_time";
        result = await fbFetch(`${endpoint}?fields=${fields}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ads": {
        if (!params?.ad_set_id && !params?.ad_account_id) throw new Error("ad_set_id or ad_account_id required");
        const endpoint = params.ad_set_id ? `/${params.ad_set_id}/ads` : `/${params.ad_account_id}/ads`;
        const fields = "id,name,status,effective_status,creative{id,title,body,image_url,thumbnail_url,object_story_spec},created_time,updated_time";
        result = await fbFetch(`${endpoint}?fields=${fields}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ad_insights": {
        if (!params?.object_id) throw new Error("object_id required (campaign, adset, or ad id)");
        const metrics = params?.metrics || "impressions,reach,spend,clicks,cpc,cpm,ctr,actions,cost_per_action_type,frequency,social_spend";
        const datePreset = params?.date_preset || "last_30d";
        let url = `/${params.object_id}/insights?fields=${metrics}&date_preset=${datePreset}`;
        if (params?.time_increment) url += `&time_increment=${params.time_increment}`;
        if (params?.breakdowns) url += `&breakdowns=${params.breakdowns}`;
        result = await fbFetch(url, token);
        break;
      }

      case "get_ad_account_insights": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        const metrics = params?.metrics || "impressions,reach,spend,clicks,cpc,cpm,ctr,actions,cost_per_action_type,frequency";
        const datePreset = params?.date_preset || "last_30d";
        let url = `/${params.ad_account_id}/insights?fields=${metrics}&date_preset=${datePreset}`;
        if (params?.time_increment) url += `&time_increment=${params.time_increment}`;
        result = await fbFetch(url, token);
        break;
      }

      case "create_ad_campaign": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        result = await fbFetch(`/${params.ad_account_id}/campaigns`, token, "POST", {
          name: params.name,
          objective: params.objective || "OUTCOME_TRAFFIC",
          status: params.status || "PAUSED",
          special_ad_categories: params.special_ad_categories || [],
          ...(params.daily_budget ? { daily_budget: params.daily_budget } : {}),
          ...(params.lifetime_budget ? { lifetime_budget: params.lifetime_budget } : {}),
          ...(params.buying_type ? { buying_type: params.buying_type } : {}),
        });
        break;
      }

      case "create_ad_set": {
        if (!params?.ad_account_id || !params?.campaign_id) throw new Error("ad_account_id and campaign_id required");
        result = await fbFetch(`/${params.ad_account_id}/adsets`, token, "POST", {
          name: params.name,
          campaign_id: params.campaign_id,
          daily_budget: params.daily_budget || 1000,
          billing_event: params.billing_event || "IMPRESSIONS",
          optimization_goal: params.optimization_goal || "LINK_CLICKS",
          bid_amount: params.bid_amount || undefined,
          targeting: params.targeting || { geo_locations: { countries: ["US"] }, age_min: 18, age_max: 65 },
          status: params.status || "PAUSED",
          start_time: params.start_time || undefined,
          end_time: params.end_time || undefined,
          promoted_object: params.promoted_object || undefined,
        });
        break;
      }

      case "create_ad": {
        if (!params?.ad_account_id || !params?.adset_id) throw new Error("ad_account_id and adset_id required");
        // First create ad creative
        let creativeId = params.creative_id;
        if (!creativeId && params.creative) {
          const creative = await fbFetch(`/${params.ad_account_id}/adcreatives`, token, "POST", {
            name: params.creative.name || params.name,
            object_story_spec: {
              page_id: params.creative.page_id,
              instagram_actor_id: igUserId,
              ...(params.creative.link_data ? {
                link_data: {
                  message: params.creative.message || "",
                  link: params.creative.link || "",
                  image_hash: params.creative.image_hash || undefined,
                  picture: params.creative.picture || undefined,
                  call_to_action: params.creative.cta ? { type: params.creative.cta, value: { link: params.creative.link } } : undefined,
                },
              } : {}),
              ...(params.creative.video_data ? {
                video_data: {
                  video_id: params.creative.video_id,
                  message: params.creative.message || "",
                  title: params.creative.title || "",
                  call_to_action: params.creative.cta ? { type: params.creative.cta, value: { link: params.creative.link } } : undefined,
                },
              } : {}),
            },
          });
          creativeId = creative.id;
        }
        result = await fbFetch(`/${params.ad_account_id}/ads`, token, "POST", {
          name: params.name,
          adset_id: params.adset_id,
          creative: { creative_id: creativeId },
          status: params.status || "PAUSED",
        });
        break;
      }

      case "update_campaign_status": {
        result = await fbFetch(`/${params.campaign_id}`, token, "POST", {
          status: params.status,
        });
        break;
      }

      case "update_adset_status": {
        result = await fbFetch(`/${params.adset_id}`, token, "POST", {
          status: params.status,
        });
        break;
      }

      case "update_ad_status": {
        result = await fbFetch(`/${params.ad_id}`, token, "POST", {
          status: params.status,
        });
        break;
      }

      case "delete_campaign":
        result = await fbFetch(`/${params.campaign_id}`, token, "DELETE");
        break;

      case "get_ad_creatives": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        result = await fbFetch(`/${params.ad_account_id}/adcreatives?fields=id,name,title,body,image_url,thumbnail_url,object_story_spec,effective_object_story_id&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_ad_images": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        result = await fbFetch(`/${params.ad_account_id}/adimages?fields=id,name,hash,url,url_128,created_time&limit=50`, token);
        break;
      }

      case "upload_ad_image": {
        if (!params?.ad_account_id || !params?.image_url) throw new Error("ad_account_id and image_url required");
        // Download image and upload as bytes
        result = await fbFetch(`/${params.ad_account_id}/adimages`, token, "POST", {
          url: params.image_url,
        });
        break;
      }

      case "get_targeting_options": {
        const searchType = params?.type || "adinterest";
        const q = encodeURIComponent(params?.query || "");
        result = await fbFetch(`/search?type=${searchType}&q=${q}&limit=${params?.limit || 25}`, token);
        break;
      }

      case "get_reach_estimate": {
        if (!params?.ad_account_id) throw new Error("ad_account_id required");
        const targeting = encodeURIComponent(JSON.stringify(params.targeting || {}));
        result = await fbFetch(`/${params.ad_account_id}/reachestimate?targeting_spec=${targeting}&optimize_for=IMPRESSIONS`, token);
        break;
      }

      // ===== BUSINESS MANAGEMENT =====
      case "get_business_accounts": {
        result = await fbFetch(`/me/businesses?fields=id,name,created_time,profile_picture_uri,link,verification_status,permitted_tasks`, token);
        break;
      }

      case "get_business_pages": {
        if (!params?.business_id) throw new Error("business_id required");
        result = await fbFetch(`/${params.business_id}/owned_pages?fields=id,name,fan_count,picture,link,instagram_business_account{id,username}`, token);
        break;
      }

      case "get_business_ad_accounts": {
        if (!params?.business_id) throw new Error("business_id required");
        result = await fbFetch(`/${params.business_id}/owned_ad_accounts?fields=id,name,account_id,account_status,currency,amount_spent,balance`, token);
        break;
      }

      case "get_business_instagram_accounts": {
        if (!params?.business_id) throw new Error("business_id required");
        result = await fbFetch(`/${params.business_id}/instagram_accounts?fields=id,username,name,profile_pic,followers_count,follows_count,media_count`, token);
        break;
      }

      // ===== PAGE ENGAGEMENT (pages_read_engagement) =====
      case "get_page_posts": {
        const pageInfo = await getPageId(token, igUserId);
        if (!pageInfo) throw new Error("No linked Facebook Page found");
        result = await fbFetch(`/${pageInfo.pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)&limit=${params?.limit || 25}`, pageInfo.pageToken);
        break;
      }

      case "get_page_insights": {
        const pageInfo = await getPageId(token, igUserId);
        if (!pageInfo) throw new Error("No linked Facebook Page found");
        const metrics = params?.metrics || "page_impressions,page_engaged_users,page_fans,page_fan_adds,page_views_total";
        result = await fbFetch(`/${pageInfo.pageId}/insights?metric=${metrics}&period=${params?.period || "day"}`, pageInfo.pageToken);
        break;
      }

      case "get_page_followers": {
        const pageInfo = await getPageId(token, igUserId);
        if (!pageInfo) throw new Error("No linked Facebook Page found");
        result = await fbFetch(`/${pageInfo.pageId}?fields=fan_count,followers_count,new_like_count,talking_about_count`, pageInfo.pageToken);
        break;
      }

      // ===== FOLLOWERS / FOLLOWING =====
      case "get_followers_list": {
        // Strategy: Pull contacts from DB conversations + IG conversations API + actual followers API
        let followers: any[] = [];
        const seen = new Set<string>();
        const maxLimit = params?.limit || 500;
        const sourceFilter = params?.source_filter || "all"; // "all", "conversation", "follower"
        
        // 1. Pull from existing DB conversations (instant, always works)
        if (sourceFilter === "all" || sourceFilter === "conversation") {
          const { data: dbConvos } = await supabase
            .from("ai_dm_conversations")
            .select("participant_id, participant_name, participant_username, participant_avatar_url")
            .eq("account_id", account_id)
            .order("last_message_at", { ascending: false })
            .limit(maxLimit);
          
          for (const c of (dbConvos || [])) {
            if (!c.participant_id || seen.has(c.participant_id)) continue;
            seen.add(c.participant_id);
            followers.push({
              id: c.participant_id,
              name: c.participant_name || c.participant_username || c.participant_id?.substring(0, 8),
              username: c.participant_username || c.participant_id,
              profile_pic: c.participant_avatar_url || null,
              source: "conversation",
            });
          }
        }

        // 2. Paginate through IG conversations API to find all contacts
        if (sourceFilter === "all" || sourceFilter === "conversation") {
          try {
            let nextUrl: string | null = `/${igUserId}/conversations?fields=participants,id,updated_time&limit=100&platform=instagram`;
            let pages = 0;
            const maxPages = 5;

            while (nextUrl && pages < maxPages && followers.length < maxLimit) {
              const convosResp = await igFetch(nextUrl, token);
              for (const convo of (convosResp?.data || [])) {
                for (const p of (convo?.participants?.data || [])) {
                  if (p.id === igUserId || seen.has(p.id)) continue;
                  seen.add(p.id);
                  const pName = p.name && p.name !== p.id ? p.name : null;
                  followers.push({
                    id: p.id,
                    name: pName || p.username || p.id?.substring(0, 8),
                    username: p.username || pName?.toLowerCase().replace(/\s+/g, '') || p.id,
                    profile_pic: p.profile_pic || null,
                    source: "ig_api",
                  });
                }
              }
              nextUrl = convosResp?.paging?.next ? convosResp.paging.next : null;
              pages++;
            }
            console.log(`Fetched ${pages} pages of IG conversations, total contacts: ${followers.length}`);
          } catch (e: any) {
            console.log("IG conversations API pagination failed:", e.message);
          }
        }

        // 3. Fetch ACTUAL followers via IG Business Discovery / Facebook Page API
        if (sourceFilter === "all" || sourceFilter === "follower") {
          try {
            // Use Facebook Page API to get followers who follow the IG business account
            const pageInfo = await getPageId(token, igUserId!);
            if (pageInfo) {
              // Try to get page followers / engaged users
              // IG Graph API doesn't have a direct followers list endpoint, but we can:
              // a) Get users who recently engaged (commented/liked) on our posts
              const mediaResp = await igFetch(`/${igUserId}/media?fields=id,comments.limit(50){from{id,username,profile_picture_url}},likes.limit(50)&limit=20`, token);
              
              for (const media of (mediaResp?.data || [])) {
                // Extract from comments
                for (const comment of (media?.comments?.data || [])) {
                  const from = comment?.from;
                  if (!from?.id || from.id === igUserId || seen.has(from.id)) continue;
                  seen.add(from.id);
                  followers.push({
                    id: from.id,
                    name: from.username || from.id?.substring(0, 8),
                    username: from.username || from.id,
                    profile_pic: from.profile_picture_url || null,
                    source: "follower",
                  });
                }
              }
              console.log(`Fetched engaged followers from posts, total: ${followers.length}`);
            }
            
            // b) Also try to get mentioned/tagged users
            try {
              const tagsResp = await igFetch(`/${igUserId}/tags?fields=id,username,timestamp&limit=50`, token);
              for (const tag of (tagsResp?.data || [])) {
                if (!tag?.id || tag.id === igUserId || seen.has(tag.id)) continue;
                // We only have the media ID here, not the tagger, skip if no user info
              }
            } catch {}

            // c) Try business_discovery for specific usernames if provided
            if (params?.discover_usernames?.length) {
              for (const uname of params.discover_usernames.slice(0, 20)) {
                try {
                  const disc = await igFetch(`/${igUserId}?fields=business_discovery.fields(id,username,name,profile_picture_url).username(${uname})`, token);
                  const bd = disc?.business_discovery;
                  if (bd?.id && !seen.has(bd.id)) {
                    seen.add(bd.id);
                    followers.push({
                      id: bd.id,
                      name: bd.name || bd.username || uname,
                      username: bd.username || uname,
                      profile_pic: bd.profile_picture_url || null,
                      source: "follower",
                    });
                  }
                } catch {}
              }
            }
          } catch (e: any) {
            console.log("Followers discovery failed:", e.message);
          }
        }
        
        // Get follower count
        let followersCount = 0, followsCount = 0;
        try {
          const profile = await igFetch(`/${igUserId}?fields=followers_count,follows_count`, token);
          followersCount = profile?.followers_count || 0;
          followsCount = profile?.follows_count || 0;
        } catch {}
        
        result = {
          followers,
          followers_count: followersCount,
          follows_count: followsCount,
        };
        break;
      }

      case "send_bulk_messages": {
        // Send message to multiple recipients using the IG send API (same as send_message)
        const recipients = params?.recipients || [];
        const message = params?.message || "";
        if (!message) throw new Error("Message text required");
        
        const results: any[] = [];
        for (const recipient of recipients) {
          try {
            // Use the same send mechanism as the working send_message action
            const sendResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: recipient.id },
                message: { text: message },
                access_token: token,
              }),
            });
            const sendData = await sendResp.json();
            
            if (sendData.error) {
              results.push({ id: recipient.id, name: recipient.name, success: false, error: sendData.error.message });
            } else {
              results.push({ id: recipient.id, name: recipient.name, success: true, message_id: sendData.message_id });
            }
          } catch (e: any) {
            results.push({ id: recipient.id, name: recipient.name, success: false, error: e.message });
          }
          
          // Rate limit
          await new Promise(r => setTimeout(r, 500));
        }
        
        const successCount = results.filter(r => r.success).length;
        result = { sent: successCount, failed: results.length - successCount, total: results.length, details: results };
        break;
      }

      // ===== oEMBED =====
      case "get_oembed":
        result = await igFetch(`/instagram_oembed?url=${encodeURIComponent(params.url)}&maxwidth=${params.maxwidth || 658}`, token);
        break;

      // ===== TOKEN MANAGEMENT =====
      case "refresh_token": {
        const resp = await fetch(`${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${params.app_id}&client_secret=${params.app_secret}&fb_exchange_token=${token}`);
        result = await resp.json();
        if (result.access_token) {
          await supabase.from("social_connections").update({
            access_token: result.access_token,
            token_expires_at: new Date(Date.now() + (result.expires_in || 5184000) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        }
        break;
      }

      case "debug_token":
        result = await igFetch(`/debug_token?input_token=${token}`, token);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Instagram API error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IG_GRAPH_URL = "https://graph.instagram.com/v21.0";
const FB_GRAPH_URL = "https://graph.facebook.com/v21.0";

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

// Resolve the Facebook Page ID linked to this IG account (needed for Conversations API)
async function getPageId(token: string, igUserId: string): Promise<{ pageId: string; pageToken: string } | null> {
  try {
    // First get the user's pages via FB Graph
    const pagesResp = await fetch(`${FB_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${token}`);
    const pagesData = await pagesResp.json();
    console.log("Pages response:", JSON.stringify(pagesData).substring(0, 500));
    
    if (pagesData.data) {
      for (const page of pagesData.data) {
        // Check if this page's IG business account matches our IG user ID
        if (page.instagram_business_account?.id === igUserId) {
          console.log(`Found linked Page: ${page.name} (${page.id}) for IG user ${igUserId}`);
          return { pageId: page.id, pageToken: page.access_token || token };
        }
      }
      // If no match found but there's only one page, use it
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
      case "get_account_insights":
        result = await igFetch(`/${igUserId}/insights?metric=impressions,reach,profile_views,follower_count,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks,website_clicks&period=${params?.period || "day"}&since=${params?.since || ""}&until=${params?.until || ""}`, token);
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

      case "get_account_insights_demographics":
        result = await igFetch(`/${igUserId}/insights?metric=audience_city,audience_country,audience_gender_age,audience_locale&period=lifetime`, token);
        break;

      case "get_account_insights_online_followers":
        result = await igFetch(`/${igUserId}/insights?metric=online_followers&period=lifetime`, token);
        break;

      case "get_media_insights":
        result = await igFetch(`/${params.media_id}/insights?metric=impressions,reach,engagement,saved,video_views,likes,comments,shares`, token);
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
        const fields = `participants,messages.limit(${params?.messages_limit || 5}){id,text,from,to,timestamp},updated_time,id`;
        
        // Strategy: Try IG Graph with IG user ID, then FB Graph with Page ID
        // The Conversations API often requires the PAGE ID via FB Graph, not IG user ID
        let gotConvos = false;
        
        // Attempt 1: IG Graph API with IG user ID
        try {
          let endpoint = `/${igUserId}/conversations?fields=${fields}&limit=${limit}&platform=instagram`;
          if (folder) endpoint += `&folder=${folder}`;
          console.log("Attempt 1 - IG Graph:", endpoint);
          result = await igFetch(endpoint, token);
          console.log(`IG Graph: Got ${result?.data?.length || 0} conversations`);
          if (result?.data?.length > 0) gotConvos = true;
        } catch (e: any) {
          console.log("IG Graph failed:", e.message);
        }
        
        // Attempt 2: FB Graph API with Page ID (conversations live on the Page, not IG account)
        if (!gotConvos) {
          const pageInfo = await getPageId(token, igUserId);
          if (pageInfo) {
            try {
              let endpoint = `/${pageInfo.pageId}/conversations?fields=${fields}&limit=${limit}&platform=instagram`;
              if (folder) endpoint += `&folder=${folder}`;
              console.log("Attempt 2 - FB Graph with Page ID:", endpoint);
              result = await igFetch(endpoint, pageInfo.pageToken, "GET", undefined, true);
              console.log(`FB Graph (Page): Got ${result?.data?.length || 0} conversations`);
              if (result?.data?.length > 0) gotConvos = true;
            } catch (e: any) {
              console.log("FB Graph (Page) failed:", e.message);
            }
          }
        }
        
        // Attempt 3: FB Graph with IG user ID directly
        if (!gotConvos) {
          try {
            let endpoint = `/${igUserId}/conversations?fields=${fields}&limit=${limit}&platform=instagram`;
            if (folder) endpoint += `&folder=${folder}`;
            console.log("Attempt 3 - FB Graph with IG user ID:", endpoint);
            result = await igFetch(endpoint, token, "GET", undefined, true);
            console.log(`FB Graph (IG ID): Got ${result?.data?.length || 0} conversations`);
          } catch (e: any) {
            console.log("FB Graph (IG ID) also failed:", e.message);
            result = { data: [] };
          }
        }
        
        if (!result) result = { data: [] };
        break;
      }

      // Fetch ALL conversation folders (primary + general + requests) with full pagination
      case "get_all_conversations": {
        const allLimit = params?.limit || 50;
        const msgLimit = params?.messages_limit || 10;
        const fields = `participants,messages.limit(${msgLimit}){id,text,from,to,timestamp},updated_time,id`;
        
        // Resolve Page ID first — conversations often live on the Page
        const pageInfo = await getPageId(token, igUserId);
        const convoOwnerId = pageInfo?.pageId || igUserId;
        const convoToken = pageInfo?.pageToken || token;
        const useFb = !!pageInfo;
        console.log(`Using ${useFb ? "Page ID " + convoOwnerId : "IG user ID " + igUserId} for conversations`);
        
        const fetchAllPages = async (folderName: string): Promise<any[]> => {
          const allConvos: any[] = [];
          let attempts = 0;
          const maxPages = 5;
          
          const baseEp = folderName 
            ? `/${convoOwnerId}/conversations?fields=${fields}&limit=${allLimit}&platform=instagram&folder=${folderName}`
            : `/${convoOwnerId}/conversations?fields=${fields}&limit=${allLimit}&platform=instagram`;
          
          try {
            let resp: any;
            // Try primary API first
            try {
              resp = await igFetch(baseEp, convoToken, "GET", undefined, useFb);
            } catch {
              // Fallback to other graph
              try {
                resp = await igFetch(baseEp, convoToken, "GET", undefined, !useFb);
              } catch {
                // Final fallback: try with IG user ID on IG graph
                if (convoOwnerId !== igUserId) {
                  const fallbackEp = baseEp.replace(convoOwnerId, igUserId);
                  try {
                    resp = await igFetch(fallbackEp, token);
                  } catch (e3: any) {
                    console.log(`Folder ${folderName || "primary"} all attempts failed:`, e3.message);
                    return [];
                  }
                } else {
                  return [];
                }
              }
            }
            
            console.log(`Folder ${folderName || "primary"}: got ${resp?.data?.length || 0} conversations`);
            if (resp?.data) allConvos.push(...resp.data);
            let nextUrl = resp?.paging?.next || null;
            
            while (nextUrl && attempts < maxPages) {
              attempts++;
              try {
                const pageResp = await fetch(nextUrl);
                const pageData = await pageResp.json();
                if (pageData.error) break;
                if (pageData.data?.length > 0) allConvos.push(...pageData.data);
                nextUrl = pageData?.paging?.next || null;
                if (!pageData.data?.length) break;
              } catch { break; }
            }
          } catch (e: any) {
            console.log(`Folder ${folderName || "primary"} fetch failed:`, e.message);
          }
          return allConvos;
        };
        
        const [primary, general, requests] = await Promise.all([
          fetchAllPages(""),
          fetchAllPages("general"),  
          fetchAllPages("other"),
        ]);
        
        console.log(`Found ${primary.length + general.length + requests.length} conversations total`);
        
        result = {
          primary,
          general,
          requests,
          total: primary.length + general.length + requests.length,
        };
        break;
      }

      // Debug: raw API response for troubleshooting
      case "debug_conversations": {
        const debugResults: any = { ig_user_id: igUserId, attempts: [] };
        
        // 1. Try IG Graph with IG user ID
        try {
          const r1 = await fetch(`${IG_GRAPH_URL}/${igUserId}/conversations?platform=instagram&limit=5&access_token=${token}`);
          const d1 = await r1.json();
          debugResults.attempts.push({ method: "IG Graph + IG user ID", status: r1.status, response: d1 });
        } catch (e: any) { debugResults.attempts.push({ method: "IG Graph + IG user ID", error: e.message }); }
        
        // 2. Get Page ID and try FB Graph with Page ID
        const debugPageInfo = await getPageId(token, igUserId);
        debugResults.page_info = debugPageInfo;
        if (debugPageInfo) {
          try {
            const r2 = await fetch(`${FB_GRAPH_URL}/${debugPageInfo.pageId}/conversations?platform=instagram&limit=5&access_token=${debugPageInfo.pageToken}`);
            const d2 = await r2.json();
            debugResults.attempts.push({ method: "FB Graph + Page ID", page_id: debugPageInfo.pageId, status: r2.status, response: d2 });
          } catch (e: any) { debugResults.attempts.push({ method: "FB Graph + Page ID", error: e.message }); }
        }
        
        // 3. Try FB Graph with IG user ID
        try {
          const r3 = await fetch(`${FB_GRAPH_URL}/${igUserId}/conversations?platform=instagram&limit=5&access_token=${token}`);
          const d3 = await r3.json();
          debugResults.attempts.push({ method: "FB Graph + IG user ID", status: r3.status, response: d3 });
        } catch (e: any) { debugResults.attempts.push({ method: "FB Graph + IG user ID", error: e.message }); }
        
        // 4. Check token permissions
        try {
          const r4 = await fetch(`${FB_GRAPH_URL}/debug_token?input_token=${token}&access_token=${token}`);
          const d4 = await r4.json();
          debugResults.token_debug = d4;
        } catch (e: any) { debugResults.token_error = e.message; }

        result = debugResults;
        break;
      }

      case "get_conversation_messages": {
        if (!params?.conversation_id) throw new Error("conversation_id required");
        const msgLimit = params?.limit || 20;
        result = await igFetch(`/${params.conversation_id}?fields=messages.limit(${msgLimit}){id,text,from,to,timestamp}`, token);
        break;
      }

      // ===== MESSAGING (Send to IG Direct) =====
      case "send_message":
        result = await igFetch(`/${igUserId}/messages`, token, "POST", {
          recipient: { id: params.recipient_id },
          message: { text: params.message },
        });
        break;

      case "send_media_message":
        result = await igFetch(`/${igUserId}/messages`, token, "POST", {
          recipient: { id: params.recipient_id },
          message: {
            attachment: {
              type: params.media_type || "image",
              payload: { url: params.media_url },
            },
          },
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
    // Return 200 with success:false so callers don't get non-2xx errors
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

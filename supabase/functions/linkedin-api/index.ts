import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LI_API = "https://api.linkedin.com/v2";
const LI_REST = "https://api.linkedin.com/rest";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "linkedin")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("LinkedIn not connected for this account");
  return data;
}

async function liFetch(url: string, token: string, method = "GET", body?: any) {
  const headers: any = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202401",
  };
  const opts: any = { method, headers };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (resp.status === 204) return { success: true };
  const data = await resp.json();
  if (data.status && data.status >= 400) throw new Error(`LinkedIn API: ${data.message || JSON.stringify(data)}`);
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
      // ===== OAUTH =====
      case "exchange_code": {
        const { code, client_id, client_secret, redirect_uri } = params;
        const resp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id,
            client_secret,
            redirect_uri,
          }),
        });
        result = await resp.json();
        if (result.error) throw new Error(result.error_description || result.error);
        return new Response(JSON.stringify({ success: true, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_API}/userinfo`, conn.access_token);
        break;
      }
      case "get_me": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_API}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`, conn.access_token);
        break;
      }

      // ===== POSTS (UGC) =====
      case "get_posts": {
        const conn = await getConnection(supabase, account_id);
        const authorUrn = conn.platform_user_id ? `urn:li:person:${conn.platform_user_id}` : "";
        result = await liFetch(`${LI_REST}/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=${params?.limit || 20}`, conn.access_token);
        break;
      }
      case "create_text_post": {
        const conn = await getConnection(supabase, account_id);
        const authorUrn = `urn:li:person:${conn.platform_user_id}`;
        result = await liFetch(`${LI_REST}/posts`, conn.access_token, "POST", {
          author: authorUrn,
          commentary: params.text,
          visibility: params.visibility || "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
        });
        break;
      }
      case "create_article_post": {
        const conn = await getConnection(supabase, account_id);
        const authorUrn = `urn:li:person:${conn.platform_user_id}`;
        result = await liFetch(`${LI_REST}/posts`, conn.access_token, "POST", {
          author: authorUrn,
          commentary: params.text || "",
          visibility: params.visibility || "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          content: {
            article: {
              source: params.article_url,
              title: params.title || "",
              description: params.description || "",
            },
          },
          lifecycleState: "PUBLISHED",
        });
        break;
      }
      case "create_image_post": {
        const conn = await getConnection(supabase, account_id);
        const authorUrn = `urn:li:person:${conn.platform_user_id}`;
        // Step 1: Register upload
        const registerResult = await liFetch(`${LI_REST}/images?action=initializeUpload`, conn.access_token, "POST", {
          initializeUploadRequest: {
            owner: authorUrn,
          },
        });
        const uploadUrl = registerResult?.value?.uploadUrl;
        const imageUrn = registerResult?.value?.image;
        if (uploadUrl && params.image_url) {
          // Step 2: Download image and upload to LinkedIn
          const imgResp = await fetch(params.image_url);
          const imgBlob = await imgResp.blob();
          await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${conn.access_token}`,
              "Content-Type": imgBlob.type,
            },
            body: imgBlob,
          });
          // Step 3: Create post with image
          result = await liFetch(`${LI_REST}/posts`, conn.access_token, "POST", {
            author: authorUrn,
            commentary: params.text || "",
            visibility: params.visibility || "PUBLIC",
            distribution: {
              feedDistribution: "MAIN_FEED",
              targetEntities: [],
              thirdPartyDistributionChannels: [],
            },
            content: {
              media: {
                title: params.title || "",
                id: imageUrn,
              },
            },
            lifecycleState: "PUBLISHED",
          });
        } else {
          result = registerResult;
        }
        break;
      }
      case "delete_post": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_REST}/posts/${encodeURIComponent(params.post_urn)}`, conn.access_token, "DELETE");
        break;
      }

      // ===== REACTIONS =====
      case "get_reactions": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_REST}/reactions/${encodeURIComponent(params.post_urn)}?q=entity&count=${params?.limit || 20}`, conn.access_token);
        break;
      }
      case "react_to_post": {
        const conn = await getConnection(supabase, account_id);
        const actorUrn = `urn:li:person:${conn.platform_user_id}`;
        result = await liFetch(`${LI_REST}/reactions`, conn.access_token, "POST", {
          root: params.post_urn,
          reactionType: params.reaction_type || "LIKE",
          actor: actorUrn,
        });
        break;
      }
      case "delete_reaction": {
        const conn = await getConnection(supabase, account_id);
        const actorUrn = `urn:li:person:${conn.platform_user_id}`;
        result = await liFetch(`${LI_REST}/reactions/(actor:${encodeURIComponent(actorUrn)},entity:${encodeURIComponent(params.post_urn)})`, conn.access_token, "DELETE");
        break;
      }

      // ===== COMMENTS =====
      case "get_comments": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_REST}/socialActions/${encodeURIComponent(params.post_urn)}/comments?count=${params?.limit || 20}`, conn.access_token);
        break;
      }
      case "create_comment": {
        const conn = await getConnection(supabase, account_id);
        const actorUrn = `urn:li:person:${conn.platform_user_id}`;
        result = await liFetch(`${LI_REST}/socialActions/${encodeURIComponent(params.post_urn)}/comments`, conn.access_token, "POST", {
          actor: actorUrn,
          message: { text: params.text },
        });
        break;
      }
      case "delete_comment": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_REST}/socialActions/${encodeURIComponent(params.post_urn)}/comments/${params.comment_id}`, conn.access_token, "DELETE");
        break;
      }

      // ===== CONNECTIONS / NETWORK =====
      case "get_connections": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_API}/connections?q=viewer&start=0&count=${params?.limit || 50}`, conn.access_token);
        break;
      }

      // ===== ORGANIZATION (Company Page) =====
      case "get_organization": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_REST}/organizations/${params.org_id}`, conn.access_token);
        break;
      }
      case "get_organization_followers": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_REST}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${params.org_id}`, conn.access_token);
        break;
      }
      case "get_organization_posts": {
        const conn = await getConnection(supabase, account_id);
        const orgUrn = `urn:li:organization:${params.org_id}`;
        result = await liFetch(`${LI_REST}/posts?author=${encodeURIComponent(orgUrn)}&q=author&count=${params?.limit || 20}`, conn.access_token);
        break;
      }
      case "create_org_post": {
        const conn = await getConnection(supabase, account_id);
        const orgUrn = `urn:li:organization:${params.org_id}`;
        result = await liFetch(`${LI_REST}/posts`, conn.access_token, "POST", {
          author: orgUrn,
          commentary: params.text,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
        });
        break;
      }

      // ===== SHARE STATISTICS =====
      case "get_share_statistics": {
        const conn = await getConnection(supabase, account_id);
        const ownerUrn = params.org_id
          ? `urn:li:organization:${params.org_id}`
          : `urn:li:person:${conn.platform_user_id}`;
        result = await liFetch(`${LI_REST}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(ownerUrn)}`, conn.access_token);
        break;
      }

      // ===== MESSAGING =====
      case "get_conversations": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_API}/messaging/conversations?q=participants&count=${params?.limit || 20}`, conn.access_token);
        break;
      }
      case "send_message": {
        const conn = await getConnection(supabase, account_id);
        const recipientUrn = `urn:li:person:${params.recipient_id}`;
        result = await liFetch(`${LI_API}/messaging/conversations`, conn.access_token, "POST", {
          recipients: [recipientUrn],
          subject: params.subject || "",
          body: { text: params.text },
        });
        break;
      }

      // ===== SEARCH =====
      case "search_people": {
        const conn = await getConnection(supabase, account_id);
        result = await liFetch(`${LI_API}/search/blended?q=all&keywords=${encodeURIComponent(params.query)}&count=${params?.limit || 10}`, conn.access_token);
        break;
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("LinkedIn API error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FB_GRAPH_URL = "https://graph.facebook.com/v24.0";
const IG_GRAPH_URL = "https://graph.instagram.com/v24.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Return app ID for frontend use
    if (body.action === "get_app_id") {
      const appId = Deno.env.get("INSTAGRAM_APP_ID");
      return new Response(JSON.stringify({ app_id: appId || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, redirect_uri, source } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Facebook credentials when the code comes from FB OAuth, otherwise Instagram credentials
    const isFbSource = source === "facebook";
    const appId = isFbSource
      ? (Deno.env.get("FACEBOOK_APP_ID") || Deno.env.get("INSTAGRAM_APP_ID"))
      : Deno.env.get("INSTAGRAM_APP_ID");
    const appSecret = isFbSource
      ? (Deno.env.get("FACEBOOK_APP_SECRET") || Deno.env.get("INSTAGRAM_APP_SECRET"))
      : Deno.env.get("INSTAGRAM_APP_SECRET");

    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: `${isFbSource ? 'Facebook' : 'Instagram'} app credentials not configured` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Token exchange using ${isFbSource ? 'Facebook' : 'Instagram'} credentials, appId: ${appId?.substring(0, 6)}...`);

    // ===== STRATEGY: Try Facebook Graph token exchange first (for config_id / Business Login flow) =====
    // Then fall back to Instagram token exchange (for legacy IG OAuth flow)
    let finalToken = "";
    let igUserId = "";
    let expiresIn = 5184000; // 60 days default
    let tokenSource = "";
    let pageTokens: { pageId: string; pageName: string; pageToken: string; igAccountId?: string }[] = [];

    // ATTEMPT 1: Facebook Graph API token exchange (Business Login with config_id)
    console.log("Attempting Facebook Graph token exchange...");
    const fbTokenRes = await fetch(`${FB_GRAPH_URL}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code: code,
        redirect_uri: redirect_uri,
      }),
    });
    const fbTokenData = await fbTokenRes.json();
    console.log("FB token exchange status:", fbTokenRes.status, "has_token:", !!fbTokenData.access_token);

    if (fbTokenData.access_token) {
      tokenSource = "facebook_business_login";
      const shortToken = fbTokenData.access_token;
      expiresIn = fbTokenData.expires_in || 5184000;

      // Exchange for long-lived token
      console.log("Exchanging for long-lived FB token...");
      const longRes = await fetch(`${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`);
      const longData = await longRes.json();
      finalToken = longData.access_token || shortToken;
      expiresIn = longData.expires_in || expiresIn;
      console.log(`Long-lived token obtained, expires in ${expiresIn}s`);

      // Get Facebook Pages with Instagram business accounts
      console.log("Fetching linked Facebook Pages...");
      const pagesRes = await fetch(`${FB_GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,ig_id}&access_token=${finalToken}`);
      const pagesData = await pagesRes.json();
      console.log(`Found ${pagesData.data?.length || 0} pages`);

      if (pagesData.data) {
        for (const page of pagesData.data) {
          const igAccount = page.instagram_business_account;
          pageTokens.push({
            pageId: page.id,
            pageName: page.name,
            pageToken: page.access_token,
            igAccountId: igAccount?.id,
          });
          if (igAccount) {
            igUserId = igAccount.id;
            console.log(`Found IG business account: ${igAccount.username} (${igAccount.id}) linked to page ${page.name}`);
          }
        }
      }

      // If no IG account found via pages, try /me on IG Graph
      if (!igUserId) {
        try {
          const meRes = await fetch(`${IG_GRAPH_URL}/me?fields=id,user_id,username,name,profile_picture_url,account_type&access_token=${finalToken}`);
          const meData = await meRes.json();
          if (meData?.id) {
            igUserId = meData.id;
            console.log(`Got IG user from /me: ${meData.username} (${igUserId})`);
          }
        } catch {}
      }
    } else {
      // ATTEMPT 2: Instagram token exchange (legacy IG OAuth flow)
      console.log("FB exchange failed, trying Instagram token exchange...");
      if (fbTokenData.error) {
        console.log(`FB error: ${fbTokenData.error?.message || JSON.stringify(fbTokenData.error)}`);
      }

      const igTokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: "authorization_code",
          redirect_uri: redirect_uri,
          code: code,
        }),
      });
      const igTokenData = await igTokenRes.json();
      console.log("IG token exchange status:", igTokenRes.status);

      if (igTokenData.error_type || igTokenData.error_message || igTokenData.error) {
        const errMsg = igTokenData.error_message || igTokenData.error?.message || "Token exchange failed";
        console.error("Token exchange error:", JSON.stringify(igTokenData));
        return new Response(JSON.stringify({
          success: false,
          error: errMsg,
          error_code: igTokenData.code || igTokenRes.status,
          error_type: igTokenData.error_type || null,
          redirect_uri_used: redirect_uri,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      tokenSource = "instagram_oauth";
      const shortToken = igTokenData.access_token;
      igUserId = String(igTokenData.user_id);

      // Exchange for long-lived IG token
      console.log("Exchanging for long-lived IG token...");
      const longRes = await fetch(`${IG_GRAPH_URL}/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`);
      const longData = await longRes.json();
      finalToken = longData.access_token || shortToken;
      expiresIn = longData.expires_in || 3600;
      console.log(`Long-lived token obtained, expires in ${expiresIn}s`);
    }

    // Get IG profile info
    console.log("Fetching Instagram profile...");
    let profileData: any = {};
    try {
      const profileRes = await fetch(`${IG_GRAPH_URL}/me?fields=id,user_id,username,account_type,name,profile_picture_url&access_token=${finalToken}`);
      profileData = await profileRes.json();
      if (profileData.error) {
        console.log("IG /me error, trying with page token...");
        // If the main token is a FB user token, try with page token for IG profile
        if (pageTokens.length > 0) {
          for (const pt of pageTokens) {
            if (pt.igAccountId) {
              const ptRes = await fetch(`${IG_GRAPH_URL}/${pt.igAccountId}?fields=id,username,name,profile_picture_url,ig_id&access_token=${pt.pageToken}`);
              const ptData = await ptRes.json();
              if (ptData && !ptData.error) {
                profileData = ptData;
                igUserId = ptData.id || pt.igAccountId;
                console.log(`Got profile via page token: @${ptData.username}`);
                break;
              }
            }
          }
        }
      } else {
        console.log(`Profile: @${profileData.username}, type: ${profileData.account_type}`);
        if (profileData.user_id) igUserId = profileData.user_id;
        if (!igUserId) igUserId = profileData.id;
      }
    } catch (e: any) {
      console.log("Profile fetch error:", e.message);
    }

    // Find the best page token for this IG account (needed for conversations API)
    let bestPageToken = "";
    let bestPageId = "";
    for (const pt of pageTokens) {
      if (pt.igAccountId === igUserId || pageTokens.length === 1) {
        bestPageToken = pt.pageToken;
        bestPageId = pt.pageId;
        break;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: finalToken,
        user_id: igUserId || profileData?.id || profileData?.user_id,
        username: profileData?.username,
        account_type: profileData?.account_type,
        name: profileData?.name,
        profile_picture_url: profileData?.profile_picture_url,
        expires_in: expiresIn,
        token_source: tokenSource,
        // Include page token if available — needed for conversations/messaging API
        page_token: bestPageToken || null,
        page_id: bestPageId || null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ig-oauth-callback error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message, error_code: 500 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

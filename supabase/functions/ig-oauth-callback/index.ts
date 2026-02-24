import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { code, redirect_uri } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("INSTAGRAM_APP_ID");
    const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");

    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: "Instagram app credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Exchange code for short-lived token
    console.log("Exchanging code for short-lived token...");
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
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

    const tokenData = await tokenRes.json();
    console.log("Token exchange response status:", tokenRes.status);

    if (tokenData.error_type || tokenData.error_message || tokenData.error) {
      const errMsg = tokenData.error_message || tokenData.error?.message || "Token exchange failed";
      const errCode = tokenData.code || tokenRes.status;
      console.error("Token exchange error:", JSON.stringify(tokenData));
      return new Response(JSON.stringify({ 
        success: false, 
        error: errMsg,
        error_code: errCode,
        error_type: tokenData.error_type || null,
        redirect_uri_used: redirect_uri,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shortLivedToken = tokenData.access_token;
    const igUserId = tokenData.user_id;
    console.log(`Got short-lived token for user ID: ${igUserId}`);

    // Step 2: Exchange for long-lived token (60 days)
    // For v25.0 Business Login tokens, use graph.instagram.com for token exchange
    let finalToken = shortLivedToken;
    let expiresIn = 3600;

    try {
      console.log("Exchanging for long-lived token...");
      const longLivedRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
      );
      const longLivedData = await longLivedRes.json();
      console.log("Long-lived exchange response:", JSON.stringify(longLivedData));

      if (longLivedData.access_token) {
        finalToken = longLivedData.access_token;
        expiresIn = longLivedData.expires_in || 5184000;
        console.log(`Long-lived token obtained, expires in ${expiresIn}s`);
      } else {
        console.warn("Long-lived token exchange failed, using short-lived token");
      }
    } catch (e) {
      console.warn("Long-lived token exchange error:", e);
    }

    // Step 3: Get user profile info
    // v25.0 Instagram Business Login tokens are Facebook Graph API tokens
    // Profile data MUST be fetched from graph.facebook.com, NOT graph.instagram.com
    console.log("Fetching user profile...");
    let username: string | null = null;
    let name: string | null = null;
    let profilePictureUrl: string | null = null;
    let accountType: string | null = null;
    let followersCount = 0;
    let mediaCount = 0;

    // Primary: Use graph.facebook.com/me (v25.0 tokens are FB tokens)
    try {
      const fbRes = await fetch(
        `https://graph.facebook.com/v25.0/me?fields=id,name,profile_picture&access_token=${finalToken}`
      );
      const fbData = await fbRes.json();
      console.log("FB /me response:", JSON.stringify(fbData));
      if (!fbData.error) {
        name = fbData.name || null;
        profilePictureUrl = fbData.profile_picture || null;
      }
    } catch (e) {
      console.warn("FB /me failed:", e);
    }

    // Also try Instagram-specific endpoint for username
    try {
      const igRes = await fetch(
        `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type&access_token=${finalToken}`
      );
      const igData = await igRes.json();
      console.log("IG /me response:", JSON.stringify(igData));
      if (!igData.error) {
        username = igData.username || null;
        accountType = igData.account_type || null;
      }
    } catch (e) {
      console.warn("IG /me failed:", e);
    }

    // Fallback: try /{user_id} on instagram graph
    if (!username) {
      try {
        const idRes = await fetch(
          `https://graph.instagram.com/v25.0/${igUserId}?fields=username,name,profile_picture_url,followers_count,media_count&access_token=${finalToken}`
        );
        const idData = await idRes.json();
        console.log("IG /{id} response:", JSON.stringify(idData));
        if (!idData.error) {
          username = idData.username || username;
          name = idData.name || name;
          profilePictureUrl = idData.profile_picture_url || profilePictureUrl;
          followersCount = idData.followers_count || 0;
          mediaCount = idData.media_count || 0;
        }
      } catch (e) {
        console.warn("IG /{id} failed:", e);
      }
    }

    // Fallback: try facebook graph with user_id
    if (!username && !name) {
      try {
        const fb2Res = await fetch(
          `https://graph.facebook.com/v25.0/${igUserId}?fields=id,name,username,profile_pic&access_token=${finalToken}`
        );
        const fb2Data = await fb2Res.json();
        console.log("FB /{id} response:", JSON.stringify(fb2Data));
        if (!fb2Data.error) {
          username = fb2Data.username || username;
          name = fb2Data.name || name;
          profilePictureUrl = fb2Data.profile_pic || profilePictureUrl;
        }
      } catch (e) {
        console.warn("FB /{id} failed:", e);
      }
    }

    console.log(`Profile result: username=${username}, name=${name}, pic=${!!profilePictureUrl}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: finalToken,
        user_id: igUserId,
        username: username || name || null,
        account_type: accountType,
        name: name || username || null,
        profile_picture_url: profilePictureUrl || null,
        followers_count: followersCount,
        media_count: mediaCount,
        expires_in: expiresIn,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ig-oauth-callback error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message, error_code: 500 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

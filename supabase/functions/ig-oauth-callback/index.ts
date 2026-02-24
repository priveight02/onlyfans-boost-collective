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

    if (body.action === "get_app_id") {
      const appId = Deno.env.get("INSTAGRAM_APP_ID");
      return new Response(JSON.stringify({ app_id: appId || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, redirect_uri } = body;

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("INSTAGRAM_APP_ID");
    const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");

    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ success: false, error: "Instagram app credentials not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Exchange code for short-lived token
    console.log("Step 1: Exchanging code for short-lived token...");
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

    const tokenRaw = await tokenRes.json();
    console.log("Token response status:", tokenRes.status, "body:", JSON.stringify(tokenRaw));

    if (tokenRaw.error_type || tokenRaw.error_message || tokenRaw.error) {
      const errMsg = tokenRaw.error_message || tokenRaw.error?.message || "Token exchange failed";
      return new Response(JSON.stringify({ 
        success: false, 
        error: errMsg,
        error_code: tokenRaw.code || tokenRes.status,
        error_type: tokenRaw.error_type || null,
        raw_error: JSON.stringify(tokenRaw),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle both flat and data[] wrapped response
    const tokenData = tokenRaw?.data?.[0] || tokenRaw;
    const shortLivedToken = tokenData?.access_token;
    const igUserId = tokenData?.user_id;

    if (!shortLivedToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No access token received from Instagram",
        raw_error: JSON.stringify(tokenRaw),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Got short-lived token, user_id: ${igUserId}`);

    // Step 2: Exchange for long-lived token
    let finalToken = shortLivedToken;
    let expiresIn = 3600;

    try {
      const llRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
      );
      const llRaw = await llRes.json();
      const llData = llRaw?.data?.[0] || llRaw;
      if (llData?.access_token) {
        finalToken = llData.access_token;
        expiresIn = llData.expires_in || 5184000;
        console.log(`Long-lived token obtained, expires in ${expiresIn}s`);
      } else {
        console.warn("Long-lived exchange did not return token:", JSON.stringify(llRaw));
      }
    } catch (e) {
      console.warn("Long-lived exchange error (continuing with short-lived):", e);
    }

    // Step 3: Get user profile — try Instagram Graph API, collect ALL errors
    const errors: string[] = [];
    let username: string | null = null;
    let name: string | null = null;
    let profilePictureUrl: string | null = null;
    let accountType: string | null = null;
    let followersCount = 0;
    let followsCount = 0;
    let mediaCount = 0;

    // Attempt 1: /me with full fields
    try {
      const res = await fetch(
        `https://graph.instagram.com/v25.0/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count&access_token=${finalToken}`
      );
      const raw = await res.json();
      console.log("Profile /me response:", JSON.stringify(raw));
      const p = raw?.data?.[0] || (raw && !raw.error ? raw : null);
      if (p?.username) {
        username = p.username;
        name = p.name || null;
        profilePictureUrl = p.profile_picture_url || null;
        accountType = p.account_type || null;
        followersCount = p.followers_count || 0;
        followsCount = p.follows_count || 0;
        mediaCount = p.media_count || 0;
      } else {
        errors.push(`/me full: ${JSON.stringify(raw?.error || raw)}`);
      }
    } catch (e) {
      errors.push(`/me full exception: ${e.message}`);
    }

    // Attempt 2: /{user_id} if /me didn't work
    if (!username && igUserId) {
      try {
        const res = await fetch(
          `https://graph.instagram.com/v25.0/${igUserId}?fields=username,name,profile_picture_url,account_type,followers_count,follows_count,media_count&access_token=${finalToken}`
        );
        const raw = await res.json();
        console.log("Profile /{id} response:", JSON.stringify(raw));
        const p = raw?.data?.[0] || (raw && !raw.error ? raw : null);
        if (p?.username) {
          username = p.username;
          name = p.name || name;
          profilePictureUrl = p.profile_picture_url || profilePictureUrl;
          accountType = p.account_type || accountType;
          followersCount = p.followers_count || followersCount;
          followsCount = p.follows_count || followsCount;
          mediaCount = p.media_count || mediaCount;
        } else {
          errors.push(`/${igUserId}: ${JSON.stringify(raw?.error || raw)}`);
        }
      } catch (e) {
        errors.push(`/${igUserId} exception: ${e.message}`);
      }
    }

    // Attempt 3: Facebook Graph /me (some Business Login tokens need this)
    if (!username) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${finalToken}`
        );
        const raw = await res.json();
        console.log("FB /me response:", JSON.stringify(raw));
        if (raw?.name && !raw?.error) {
          name = raw.name;
          // Still no IG username — don't fake it
        } else {
          errors.push(`FB /me: ${JSON.stringify(raw?.error || raw)}`);
        }
      } catch (e) {
        errors.push(`FB /me exception: ${e.message}`);
      }
    }

    // FAIL HARD if no username was found — no fake placeholders
    if (!username) {
      const errorDetail = errors.join(" | ");
      console.error("FAILED to get Instagram username. All attempts:", errorDetail);
      return new Response(JSON.stringify({
        success: false,
        error: `Could not retrieve Instagram username. Your account may not have the required permissions or the app may be in Development mode. Make sure this account is added as a Tester in the Meta Developer Portal.`,
        error_detail: errorDetail,
        error_code: 403,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`SUCCESS: username=${username}, name=${name}, pic=${!!profilePictureUrl}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: finalToken,
        user_id: igUserId,
        username: username,
        account_type: accountType,
        name: name || username,
        profile_picture_url: profilePictureUrl || null,
        followers_count: followersCount,
        follows_count: followsCount,
        media_count: mediaCount,
        expires_in: expiresIn,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ig-oauth-callback fatal error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Server error: ${err.message}`,
      error_code: 500,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

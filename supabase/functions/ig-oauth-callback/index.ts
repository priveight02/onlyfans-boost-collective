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

    // Step 1: Exchange code for short-lived token via Instagram Business Login
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
      // Always return 200 so supabase.functions.invoke passes the body to `data`
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

    // Step 2: Exchange for long-lived token (valid 60 days)
    console.log("Exchanging for long-lived token...");
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();

    const finalToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 3600;
    console.log(`Long-lived token obtained, expires in ${expiresIn}s`);

    // Step 3: Get user profile info — try multiple endpoints
    console.log("Fetching user profile for user_id:", igUserId);
    const profileFields = "id,username,account_type,name,profile_picture_url,followers_count,media_count";
    let profileData: any = {};

    // Attempt 1: unversioned /me (Instagram Business Login native)
    try {
      const r1 = await fetch(`https://graph.instagram.com/me?fields=${profileFields}&access_token=${finalToken}`);
      const d1 = await r1.json();
      console.log("Profile /me (unversioned):", JSON.stringify(d1));
      if (!d1.error) profileData = d1;
    } catch (e) { console.warn("Unversioned /me failed:", e); }

    // Attempt 2: unversioned /{user_id}
    if (!profileData.username) {
      try {
        const r2 = await fetch(`https://graph.instagram.com/${igUserId}?fields=${profileFields}&access_token=${finalToken}`);
        const d2 = await r2.json();
        console.log("Profile /{id} (unversioned):", JSON.stringify(d2));
        if (!d2.error && d2.username) Object.assign(profileData, d2);
      } catch (e) { console.warn("Unversioned /{id} failed:", e); }
    }

    // Attempt 3: v22.0 /me
    if (!profileData.username) {
      try {
        const r3 = await fetch(`https://graph.instagram.com/v22.0/me?fields=${profileFields}&access_token=${finalToken}`);
        const d3 = await r3.json();
        console.log("Profile v22 /me:", JSON.stringify(d3));
        if (!d3.error && d3.username) Object.assign(profileData, d3);
      } catch (e) { console.warn("v22 /me failed:", e); }
    }

    // Attempt 4: facebook graph API
    if (!profileData.username) {
      try {
        const r4 = await fetch(`https://graph.facebook.com/v22.0/${igUserId}?fields=${profileFields}&access_token=${finalToken}`);
        const d4 = await r4.json();
        console.log("Profile facebook graph:", JSON.stringify(d4));
        if (!d4.error && (d4.username || d4.name)) Object.assign(profileData, d4);
      } catch (e) { console.warn("Facebook graph failed:", e); }
    }

    console.log(`Profile fetched: @${profileData.username}, name: ${profileData.name}, type: ${profileData.account_type}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: finalToken,
        user_id: igUserId || profileData.user_id || profileData.id,
        username: profileData.username || profileData.name || null,
        account_type: profileData.account_type,
        name: profileData.name || profileData.username || null,
        profile_picture_url: profileData.profile_picture_url || null,
        followers_count: profileData.followers_count || 0,
        media_count: profileData.media_count || 0,
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

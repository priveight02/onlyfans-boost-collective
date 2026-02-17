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
      console.error("Token exchange error:", JSON.stringify(tokenData));
      return new Response(JSON.stringify({ 
        success: false, 
        error: tokenData.error_message || tokenData.error?.message || "Token exchange failed" 
      }), {
        status: 400,
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

    // Step 3: Get user profile info
    console.log("Fetching user profile...");
    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,name,profile_picture_url&access_token=${finalToken}`
    );
    const profileData = await profileRes.json();
    console.log(`Profile fetched: @${profileData.username}, type: ${profileData.account_type}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: finalToken,
        user_id: igUserId || profileData.user_id || profileData.id,
        username: profileData.username,
        account_type: profileData.account_type,
        name: profileData.name,
        profile_picture_url: profileData.profile_picture_url,
        expires_in: expiresIn,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ig-oauth-callback error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

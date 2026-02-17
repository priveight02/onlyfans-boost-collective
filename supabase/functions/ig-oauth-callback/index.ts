import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri } = await req.json();

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

    // Exchange code for short-lived token
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

    if (tokenData.error_type || tokenData.error_message) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: tokenData.error_message || "Token exchange failed" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedRes.json();

    // Get user profile
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${longLivedData.access_token || tokenData.access_token}`
    );
    const profileData = await profileRes.json();

    return new Response(JSON.stringify({
      success: true,
      data: {
        access_token: longLivedData.access_token || tokenData.access_token,
        user_id: tokenData.user_id || profileData.id,
        username: profileData.username,
        account_type: profileData.account_type,
        expires_in: longLivedData.expires_in,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

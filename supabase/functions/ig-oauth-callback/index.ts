import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: extract token data from response (handles both flat and data[] wrapper)
function extractTokenData(raw: any): { access_token?: string; user_id?: string; permissions?: string } {
  if (raw?.data && Array.isArray(raw.data) && raw.data.length > 0) {
    return raw.data[0];
  }
  // Flat format fallback
  return raw || {};
}

// Helper: extract profile data from response (handles both flat and data[] wrapper)
function extractProfileData(raw: any): any {
  if (raw?.data && Array.isArray(raw.data) && raw.data.length > 0) {
    return raw.data[0];
  }
  // Flat format (direct fields on object, no error)
  if (raw && !raw.error) {
    return raw;
  }
  return null;
}

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

    const tokenRaw = await tokenRes.json();
    console.log("Token exchange response status:", tokenRes.status, "keys:", JSON.stringify(Object.keys(tokenRaw)));

    if (tokenRaw.error_type || tokenRaw.error_message || tokenRaw.error) {
      const errMsg = tokenRaw.error_message || tokenRaw.error?.message || "Token exchange failed";
      const errCode = tokenRaw.code || tokenRes.status;
      console.error("Token exchange error:", JSON.stringify(tokenRaw));
      return new Response(JSON.stringify({ 
        success: false, 
        error: errMsg,
        error_code: errCode,
        error_type: tokenRaw.error_type || null,
        redirect_uri_used: redirect_uri,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle both flat and data[] wrapped response formats per Meta docs
    const tokenData = extractTokenData(tokenRaw);
    const shortLivedToken = tokenData.access_token;
    const igUserId = tokenData.user_id;
    console.log(`Got short-lived token: ${!!shortLivedToken}, user ID: ${igUserId}`);

    if (!shortLivedToken) {
      console.error("No access_token found in response. Raw:", JSON.stringify(tokenRaw));
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No access token in response",
        error_code: 500,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Exchange for long-lived token (60 days)
    // Per docs: https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=...&access_token=...
    let finalToken = shortLivedToken;
    let expiresIn = 3600;

    try {
      console.log("Exchanging for long-lived token...");
      const longLivedRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
      );
      const longLivedRaw = await longLivedRes.json();
      console.log("Long-lived exchange status:", longLivedRes.status, "keys:", JSON.stringify(Object.keys(longLivedRaw)));

      if (longLivedRaw.access_token) {
        finalToken = longLivedRaw.access_token;
        expiresIn = longLivedRaw.expires_in || 5184000;
        console.log(`Long-lived token obtained, expires in ${expiresIn}s`);
      } else if (longLivedRaw.data?.[0]?.access_token) {
        finalToken = longLivedRaw.data[0].access_token;
        expiresIn = longLivedRaw.data[0].expires_in || 5184000;
        console.log(`Long-lived token (data[]) obtained, expires in ${expiresIn}s`);
      } else {
        console.warn("Long-lived token exchange failed:", JSON.stringify(longLivedRaw));
      }
    } catch (e) {
      console.warn("Long-lived token exchange error:", e);
    }

    // Step 3: Get user profile info
    // Per official docs: use graph.instagram.com/v25.0/me with valid fields
    // Valid fields: user_id, username, name, account_type, profile_picture_url, followers_count, follows_count, media_count
    console.log("Fetching user profile from graph.instagram.com...");
    let username: string | null = null;
    let name: string | null = null;
    let profilePictureUrl: string | null = null;
    let accountType: string | null = null;
    let followersCount = 0;
    let mediaCount = 0;

    // Primary: /me with all fields
    try {
      const profileRes = await fetch(
        `https://graph.instagram.com/v25.0/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,media_count&access_token=${finalToken}`
      );
      const profileRaw = await profileRes.json();
      console.log("IG /me full response:", JSON.stringify(profileRaw));
      
      const profile = extractProfileData(profileRaw);
      if (profile) {
        username = profile.username || null;
        name = profile.name || null;
        profilePictureUrl = profile.profile_picture_url || null;
        accountType = profile.account_type || null;
        followersCount = profile.followers_count || 0;
        mediaCount = profile.media_count || 0;
      }
    } catch (e) {
      console.warn("IG /me full failed:", e);
    }

    // Fallback 1: /me with minimal fields only
    if (!username) {
      try {
        const minRes = await fetch(
          `https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=${finalToken}`
        );
        const minRaw = await minRes.json();
        console.log("IG /me minimal response:", JSON.stringify(minRaw));
        
        const minProfile = extractProfileData(minRaw);
        if (minProfile) {
          username = minProfile.username || null;
        }
      } catch (e) {
        console.warn("IG /me minimal failed:", e);
      }
    }

    // Fallback 2: /{user_id} endpoint
    if (!username && igUserId) {
      try {
        const idRes = await fetch(
          `https://graph.instagram.com/v25.0/${igUserId}?fields=username,name,profile_picture_url,followers_count,media_count&access_token=${finalToken}`
        );
        const idRaw = await idRes.json();
        console.log("IG /{id} response:", JSON.stringify(idRaw));
        
        const idProfile = extractProfileData(idRaw);
        if (idProfile) {
          username = idProfile.username || username;
          name = idProfile.name || name;
          profilePictureUrl = idProfile.profile_picture_url || profilePictureUrl;
          followersCount = idProfile.followers_count || followersCount;
          mediaCount = idProfile.media_count || mediaCount;
        }
      } catch (e) {
        console.warn("IG /{id} failed:", e);
      }
    }

    // Fallback 3: unversioned /me
    if (!username) {
      try {
        const unvRes = await fetch(
          `https://graph.instagram.com/me?fields=user_id,username,name,account_type,profile_picture_url&access_token=${finalToken}`
        );
        const unvRaw = await unvRes.json();
        console.log("IG /me unversioned response:", JSON.stringify(unvRaw));
        
        const unvProfile = extractProfileData(unvRaw);
        if (unvProfile) {
          username = unvProfile.username || username;
          name = unvProfile.name || name;
          profilePictureUrl = unvProfile.profile_picture_url || profilePictureUrl;
          accountType = unvProfile.account_type || accountType;
        }
      } catch (e) {
        console.warn("IG /me unversioned failed:", e);
      }
    }

    console.log(`Profile result: username=${username}, name=${name}, pic=${!!profilePictureUrl}, type=${accountType}`);

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

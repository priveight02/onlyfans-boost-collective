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

    // Step 2: Try long-lived token exchange (best effort)
    let finalToken = shortLivedToken;
    let expiresIn = tokenData?.expires_in || 3600;

    try {
      const llParams = new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: shortLivedToken,
      });

      const llAttempts = [
        {
          label: "GET",
          url: `https://graph.instagram.com/access_token?${llParams.toString()}`,
          init: { method: "GET" as const },
        },
        {
          label: "POST",
          url: "https://graph.instagram.com/access_token",
          init: {
            method: "POST" as const,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: llParams,
          },
        },
      ];

      for (const attempt of llAttempts) {
        const llRes = await fetch(attempt.url, attempt.init);
        const llRaw = await llRes.json();
        const llData = llRaw?.data?.[0] || llRaw;

        if (llData?.access_token) {
          finalToken = llData.access_token;
          expiresIn = llData.expires_in || 5184000;
          console.log(`Long-lived token obtained via ${attempt.label}, expires in ${expiresIn}s`);
          break;
        }

        console.warn(`Long-lived exchange (${attempt.label}) did not return token:`, JSON.stringify(llRaw));
      }
    } catch (e) {
      console.warn("Long-lived exchange error (continuing with short-lived):", e);
    }

    // Step 3: Get user profile — try multiple endpoint/token formats and collect ALL errors
    const errors: string[] = [];
    let username: string | null = null;
    let name: string | null = null;
    let profilePictureUrl: string | null = null;
    let accountType: string | null = null;
    let followersCount = 0;
    let followsCount = 0;
    let mediaCount = 0;
    let resolvedIgUserId = igUserId ? String(igUserId) : null;
    let profileLimited = false;

    const profileFieldsFull = "user_id,id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count";
    const profileFieldsLite = "user_id,id,username,name,account_type,profile_picture_url";

    const parseProfile = (raw: any) => {
      const p = raw?.data?.[0] || (raw && !raw.error ? raw : null);
      if (!p) return null;

      const parsed = {
        user_id: p.user_id || p.id || null,
        username: p.username || null,
        name: p.name || null,
        account_type: p.account_type || null,
        profile_picture_url: p.profile_picture_url || p.profile_pic || null,
        followers_count: Number(p.followers_count || 0),
        follows_count: Number(p.follows_count || 0),
        media_count: Number(p.media_count || 0),
      };

      return parsed;
    };

    const tryProfileRequest = async (label: string, baseUrl: string) => {
      const attempts = [
        {
          mode: "query",
          url: `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(finalToken)}`,
          init: { method: "GET" as const },
        },
        {
          mode: "bearer",
          url: baseUrl,
          init: {
            method: "GET" as const,
            headers: { Authorization: `Bearer ${finalToken}` },
          },
        },
      ];

      for (const attempt of attempts) {
        try {
          const res = await fetch(attempt.url, attempt.init);
          const raw = await res.json();
          console.log(`${label} (${attempt.mode}) response:`, JSON.stringify(raw));

          const parsed = parseProfile(raw);
          if (parsed?.username) {
            return parsed;
          }

          if (raw?.error) {
            errors.push(`${label} (${attempt.mode}): ${JSON.stringify(raw.error)}`);
          } else {
            errors.push(`${label} (${attempt.mode}): ${JSON.stringify(raw)}`);
          }
        } catch (e: any) {
          errors.push(`${label} (${attempt.mode}) exception: ${e?.message || String(e)}`);
        }
      }

      return null;
    };

    const profileCandidates = [
      // Versioned Instagram Graph
      {
        label: "IG /me full v25",
        url: `https://graph.instagram.com/v25.0/me?fields=${encodeURIComponent(profileFieldsFull)}`,
      },
      {
        label: "IG /me lite v25",
        url: `https://graph.instagram.com/v25.0/me?fields=${encodeURIComponent(profileFieldsLite)}`,
      },
      // Unversioned Instagram Graph (fallback)
      {
        label: "IG /me full",
        url: `https://graph.instagram.com/me?fields=${encodeURIComponent(profileFieldsFull)}`,
      },
      {
        label: "IG /me lite",
        url: `https://graph.instagram.com/me?fields=${encodeURIComponent(profileFieldsLite)}`,
      },
      ...(igUserId
        ? [
            {
              label: `IG /${igUserId} full v25`,
              url: `https://graph.instagram.com/v25.0/${igUserId}?fields=${encodeURIComponent(profileFieldsFull)}`,
            },
            {
              label: `IG /${igUserId} lite v25`,
              url: `https://graph.instagram.com/v25.0/${igUserId}?fields=${encodeURIComponent(profileFieldsLite)}`,
            },
            {
              label: `IG /${igUserId} full`,
              url: `https://graph.instagram.com/${igUserId}?fields=${encodeURIComponent(profileFieldsFull)}`,
            },
            {
              label: `IG /${igUserId} lite`,
              url: `https://graph.instagram.com/${igUserId}?fields=${encodeURIComponent(profileFieldsLite)}`,
            },
            {
              label: `FB /${igUserId} full`,
              url: `https://graph.facebook.com/v25.0/${igUserId}?fields=${encodeURIComponent(profileFieldsFull)}`,
            },
            {
              label: `FB /${igUserId} lite`,
              url: `https://graph.facebook.com/v25.0/${igUserId}?fields=${encodeURIComponent(profileFieldsLite)}`,
            },
          ]
        : []),
    ];

    for (const candidate of profileCandidates) {
      const profile = await tryProfileRequest(candidate.label, candidate.url);
      if (!profile?.username) continue;

      username = profile.username;
      name = profile.name || null;
      profilePictureUrl = profile.profile_picture_url || null;
      accountType = profile.account_type || null;
      followersCount = profile.followers_count || 0;
      followsCount = profile.follows_count || 0;
      mediaCount = profile.media_count || 0;
      resolvedIgUserId = profile.user_id ? String(profile.user_id) : resolvedIgUserId;
      break;
    }

    // Fallback mode: allow connection even if profile endpoints are blocked (e.g. personal/restricted account)
    if (!username && finalToken && resolvedIgUserId) {
      const suffix = String(resolvedIgUserId).slice(-8);
      username = `ig_user_${suffix}`;
      name = `Instagram User ${suffix}`;
      accountType = accountType || "PERSONAL_OR_RESTRICTED";
      profilePictureUrl = null;
      profileLimited = true;
      console.warn("Proceeding in limited profile mode (username unavailable from Meta Graph).", {
        user_id: resolvedIgUserId,
        errors_count: errors.length,
      });
    }

    // Still fail only if we don't even have enough info to create a stable connection identity
    if (!username) {
      const errorDetail = errors.join(" | ");
      console.error("FAILED to get Instagram username. All attempts:", errorDetail);
      return new Response(JSON.stringify({
        success: false,
        error: "Could not retrieve Instagram profile from Meta API.",
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
        user_id: resolvedIgUserId || igUserId,
        username: username,
        account_type: accountType,
        name: name || username,
        profile_picture_url: profilePictureUrl || null,
        followers_count: followersCount,
        follows_count: followsCount,
        media_count: mediaCount,
        expires_in: expiresIn,
        profile_limited: profileLimited,
        profile_error_detail: profileLimited ? errors.join(" | ") : null,
        granted_permissions: tokenData?.permissions || [],
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

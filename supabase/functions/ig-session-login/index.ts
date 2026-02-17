import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Instagram Private API login — simulates the mobile app login flow
// Returns session cookies (sessionid, csrftoken, ds_user_id) on success

const IG_API = "https://i.instagram.com/api/v1";
const IG_BASE = "https://www.instagram.com";

function generateDeviceId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, "0");
  return `android-${hex.substring(0, 16)}`;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { username, password, verification_code, two_factor_identifier } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, error: "Username and password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deviceId = generateDeviceId(username + password);
    const uuid = generateUUID();
    const phoneId = generateUUID();

    // Step 1: Get initial CSRF token from Instagram
    const csrfResp = await fetch(`${IG_BASE}/api/v1/web/accounts/login/ajax/`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 12; SM-S908B Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/accounts/login/",
      },
    });

    let csrfToken = "";
    const setCookies = csrfResp.headers.getAll?.("set-cookie") || [];
    // Try to extract from set-cookie headers
    for (const cookie of setCookies) {
      const match = cookie.match(/csrftoken=([^;]+)/);
      if (match) csrfToken = match[1];
    }

    // Fallback: get from the login page HTML
    if (!csrfToken) {
      const pageResp = await fetch(`${IG_BASE}/accounts/login/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await pageResp.text();
      const csrfMatch = html.match(/"csrf_token":"([^"]+)"/);
      if (csrfMatch) csrfToken = csrfMatch[1];

      // Also try from set-cookie
      const pageCookies = pageResp.headers.getAll?.("set-cookie") || [];
      for (const cookie of pageCookies) {
        const match = cookie.match(/csrftoken=([^;]+)/);
        if (match) csrfToken = match[1];
      }
    }

    if (!csrfToken) {
      // Generate a random one as last resort
      csrfToken = generateUUID().replace(/-/g, "").substring(0, 32);
    }

    console.log("Got CSRF token, attempting login...");

    // Handle 2FA verification
    if (two_factor_identifier && verification_code) {
      console.log("Processing 2FA verification...");
      const twoFactorResp = await fetch(`${IG_BASE}/api/v1/web/accounts/login/ajax/two_factor/`, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": "https://www.instagram.com/accounts/login/two_factor/",
          "Origin": "https://www.instagram.com",
          "Cookie": `csrftoken=${csrfToken}; mid=${generateUUID().replace(/-/g, "").substring(0, 28)}`,
        },
        body: new URLSearchParams({
          username,
          verificationCode: verification_code,
          identifier: two_factor_identifier,
          queryParams: '{"next":"/"}',
          trust_signal: "true",
        }).toString(),
      });

      return await processLoginResponse(twoFactorResp, username);
    }

    // Step 2: Perform login
    const loginResp = await fetch(`${IG_BASE}/api/v1/web/accounts/login/ajax/`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
        "X-Instagram-AJAX": "1",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/accounts/login/",
        "Origin": "https://www.instagram.com",
        "Cookie": `csrftoken=${csrfToken}; ig_did=${generateUUID()}; mid=${generateUUID().replace(/-/g, "").substring(0, 28)}`,
      },
      body: new URLSearchParams({
        username,
        enc_password: `#PWD_INSTAGRAM_BROWSER:0:${Math.floor(Date.now() / 1000)}:${password}`,
        queryParams: "{}",
        optIntoOneTap: "false",
      }).toString(),
    });

    return await processLoginResponse(loginResp, username);

  } catch (error: any) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Login failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processLoginResponse(resp: Response, username: string): Promise<Response> {
  const respText = await resp.text();
  let data: any;
  try {
    data = JSON.parse(respText);
  } catch {
    console.error("Non-JSON response:", respText.substring(0, 500));
    return new Response(JSON.stringify({ success: false, error: "Instagram returned an unexpected response. Try again in a few minutes." }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Login response:", JSON.stringify(data).substring(0, 300));

  // Check for 2FA requirement
  if (data.two_factor_required) {
    return new Response(JSON.stringify({
      success: false,
      two_factor_required: true,
      two_factor_identifier: data.two_factor_info?.two_factor_identifier,
      two_factor_methods: data.two_factor_info?.totp_two_factor_on ? ["totp"] : ["sms"],
      error: "Two-factor authentication required",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check for checkpoint/challenge
  if (data.checkpoint_url || data.message === "checkpoint_required") {
    return new Response(JSON.stringify({
      success: false,
      checkpoint_required: true,
      checkpoint_url: data.checkpoint_url,
      error: "Instagram requires a security checkpoint. Open Instagram in your browser, complete the verification, then try again.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract cookies from response
  const cookies = resp.headers.getAll?.("set-cookie") || [];
  let sessionId = "";
  let csrfToken = "";
  let dsUserId = "";

  for (const cookie of cookies) {
    const sessionMatch = cookie.match(/sessionid=([^;]+)/);
    if (sessionMatch && sessionMatch[1] !== '""' && sessionMatch[1] !== "") sessionId = sessionMatch[1];

    const csrfMatch = cookie.match(/csrftoken=([^;]+)/);
    if (csrfMatch) csrfToken = csrfMatch[1];

    const dsMatch = cookie.match(/ds_user_id=([^;]+)/);
    if (dsMatch) dsUserId = dsMatch[1];
  }

  if (data.authenticated && sessionId) {
    console.log(`Login successful for @${username}, session obtained`);
    return new Response(JSON.stringify({
      success: true,
      data: {
        session_id: sessionId,
        csrf_token: csrfToken,
        ds_user_id: dsUserId || data.userId?.toString() || "",
        username,
      },
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Login failed
  const errorMsg = data.message || (data.authenticated === false ? "Invalid username or password" : "Login failed");
  return new Response(JSON.stringify({ success: false, error: errorMsg }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

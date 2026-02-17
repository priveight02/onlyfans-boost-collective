import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IG_API = "https://i.instagram.com/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode } = body;

    // Session validation mode — takes a sessionid cookie and returns user info
    if (mode === "validate_session") {
      return await validateSession(body.session_id);
    }

    // Legacy password login mode (kept for backwards compat)
    return await passwordLogin(body);
  } catch (error: any) {
    console.error("Error:", error);
    return jsonResponse({ success: false, error: error.message || "Request failed" }, 500);
  }
});

async function validateSession(sessionId: string): Promise<Response> {
  if (!sessionId) {
    return jsonResponse({ success: false, error: "session_id is required" }, 400);
  }

  try {
    // Use the session cookie to fetch the logged-in user's info
    const resp = await fetch(`${IG_API}/accounts/current_user/?edit=true`, {
      headers: {
        "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-S908B; b0q; qcom; en_US; 458229237)",
        "Cookie": `sessionid=${sessionId}`,
        "X-IG-App-ID": "936619743392459",
      },
    });

    if (!resp.ok) {
      return jsonResponse({ success: false, error: "Invalid or expired session cookie. Please log in again and copy a fresh sessionid." });
    }

    const data = await resp.json();
    const user = data.user;

    if (!user?.pk && !user?.username) {
      return jsonResponse({ success: false, error: "Could not retrieve account info. The session may have expired." });
    }

    // Try to extract csrftoken from a secondary request
    let csrfToken = "";
    try {
      const csrfResp = await fetch("https://www.instagram.com/api/v1/web/login_page/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Cookie": `sessionid=${sessionId}`,
        },
      });
      const csrfCookies = csrfResp.headers.getAll?.("set-cookie") || [];
      for (const cookie of csrfCookies) {
        const match = cookie.match(/csrftoken=([^;]+)/);
        if (match) csrfToken = match[1];
      }
    } catch {
      // csrftoken is optional for most operations
    }

    console.log(`Session validated for @${user.username} (pk: ${user.pk})`);

    return jsonResponse({
      success: true,
      data: {
        session_id: sessionId,
        csrf_token: csrfToken,
        ds_user_id: String(user.pk || ""),
        username: user.username || "",
        full_name: user.full_name || "",
        profile_pic_url: user.profile_pic_url || "",
      },
    });
  } catch (err: any) {
    console.error("Session validation error:", err);
    return jsonResponse({ success: false, error: "Failed to validate session. Please try again." });
  }
}

async function passwordLogin(body: any): Promise<Response> {
  const { username, password, verification_code, two_factor_identifier } = body;

  if (!username || !password) {
    return jsonResponse({ success: false, error: "Username and password required" }, 400);
  }

  const IG_BASE = "https://www.instagram.com";

  function generateUUID(): string {
    return crypto.randomUUID();
  }

  // Get CSRF token
  let csrfToken = "";
  try {
    const pageResp = await fetch(`${IG_BASE}/accounts/login/`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    const html = await pageResp.text();
    const csrfMatch = html.match(/"csrf_token":"([^"]+)"/);
    if (csrfMatch) csrfToken = csrfMatch[1];
    const pageCookies = pageResp.headers.getAll?.("set-cookie") || [];
    for (const cookie of pageCookies) {
      const match = cookie.match(/csrftoken=([^;]+)/);
      if (match) csrfToken = match[1];
    }
  } catch {}

  if (!csrfToken) csrfToken = generateUUID().replace(/-/g, "").substring(0, 32);

  // Handle 2FA
  if (two_factor_identifier && verification_code) {
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

  // Standard login
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
}

async function processLoginResponse(resp: Response, username: string): Promise<Response> {
  const respText = await resp.text();
  let data: any;
  try {
    data = JSON.parse(respText);
  } catch {
    return jsonResponse({ success: false, error: "Instagram returned an unexpected response. Try again in a few minutes." }, 502);
  }

  if (data.two_factor_required) {
    return jsonResponse({
      success: false,
      two_factor_required: true,
      two_factor_identifier: data.two_factor_info?.two_factor_identifier,
      two_factor_methods: data.two_factor_info?.totp_two_factor_on ? ["totp"] : ["sms"],
      error: "Two-factor authentication required",
    });
  }

  if (data.checkpoint_url || data.message === "checkpoint_required") {
    return jsonResponse({
      success: false,
      checkpoint_required: true,
      checkpoint_url: data.checkpoint_url,
      error: "Instagram requires a security checkpoint. Please use the cookie-paste method instead.",
    });
  }

  const cookies = resp.headers.getAll?.("set-cookie") || [];
  let sessionId = "", csrfToken = "", dsUserId = "";
  for (const cookie of cookies) {
    const sessionMatch = cookie.match(/sessionid=([^;]+)/);
    if (sessionMatch && sessionMatch[1] !== '""' && sessionMatch[1] !== "") sessionId = sessionMatch[1];
    const csrfMatch = cookie.match(/csrftoken=([^;]+)/);
    if (csrfMatch) csrfToken = csrfMatch[1];
    const dsMatch = cookie.match(/ds_user_id=([^;]+)/);
    if (dsMatch) dsUserId = dsMatch[1];
  }

  if (data.authenticated && sessionId) {
    return jsonResponse({
      success: true,
      data: { session_id: sessionId, csrf_token: csrfToken, ds_user_id: dsUserId || data.userId?.toString() || "", username },
    });
  }

  const errorMsg = data.message || (data.authenticated === false ? "Invalid username or password" : "Login failed");
  return jsonResponse({ success: false, error: errorMsg });
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

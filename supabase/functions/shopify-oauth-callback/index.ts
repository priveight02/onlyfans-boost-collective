import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const shop = url.searchParams.get("shop");
    const hmac = url.searchParams.get("hmac");

    if (!code || !stateParam || !shop) {
      return new Response(buildErrorPage("Missing required parameters (code, state, or shop)"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Verify HMAC
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    if (!clientSecret || !clientId) {
      return new Response(buildErrorPage("Server configuration error"), {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (hmac) {
      const params = new URLSearchParams(url.search);
      params.delete("hmac");
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(clientSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sortedParams));
      const computedHmac = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (computedHmac !== hmac) {
        return new Response(buildErrorPage("HMAC verification failed - request may be tampered"), {
          status: 403,
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Decode state
    let stateData: any;
    try {
      stateData = JSON.parse(atob(stateParam));
    } catch {
      return new Response(buildErrorPage("Invalid state parameter"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const userId = stateData.user_id;
    const redirectUrl = stateData.redirect_url || "";

    if (!userId) {
      return new Response(buildErrorPage("Missing user identity in state"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Token exchange failed:", errText);
      return new Response(buildErrorPage("Failed to exchange authorization code for access token"), {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const scopes = tokenData.scope || "";

    if (!accessToken) {
      return new Response(buildErrorPage("No access token received from Shopify"), {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Fetch shop info
    let shopName = shop;
    let shopEmail = "";
    let currency = "USD";
    try {
      const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": accessToken },
      });
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        shopName = shopData.shop?.name || shop;
        shopEmail = shopData.shop?.email || "";
        currency = shopData.shop?.currency || "USD";
      }
    } catch (e) {
      console.error("Failed to fetch shop info:", e);
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { error: upsertError } = await supabaseAdmin
      .from("shopify_store_connections")
      .upsert(
        {
          user_id: userId,
          shop_domain: shop,
          access_token: accessToken,
          scopes,
          shop_name: shopName,
          shop_email: shopEmail,
          currency,
          is_active: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,shop_domain" }
      );

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return new Response(buildErrorPage("Failed to save connection: " + upsertError.message), {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Redirect back to app
    const finalRedirect = redirectUrl || "https://uplyze.ai/platform/ad-creatives/store-manager";
    return new Response(buildSuccessPage(shopName, finalRedirect), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Shopify OAuth callback error:", err);
    return new Response(buildErrorPage("Unexpected error: " + err.message), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
});

function buildSuccessPage(shopName: string, redirectUrl: string): string {
  return `<!DOCTYPE html>
<html><head><title>Shopify Connected</title>
<style>body{font-family:system-ui;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{background:#111827;border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:40px;text-align:center;max-width:400px}
h1{color:#10b981;font-size:24px;margin-bottom:8px}p{color:#9ca3af;font-size:14px}
.btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}</style>
</head><body><div class="card">
<h1>✅ Store Connected!</h1>
<p><strong>${shopName}</strong> has been successfully connected to Uplyze.</p>
<a href="${redirectUrl}" class="btn">Go to Store Manager</a>
</div>
<script>setTimeout(()=>window.location.href="${redirectUrl}",3000)</script>
</body></html>`;
}

function buildErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html><head><title>Connection Failed</title>
<style>body{font-family:system-ui;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{background:#111827;border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:40px;text-align:center;max-width:400px}
h1{color:#ef4444;font-size:24px;margin-bottom:8px}p{color:#9ca3af;font-size:14px}
.btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#374151;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}</style>
</head><body><div class="card">
<h1>❌ Connection Failed</h1>
<p>${message}</p>
<a href="javascript:window.close()" class="btn">Close</a>
</div></body></html>`;
}

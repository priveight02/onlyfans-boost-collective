import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop, user_id, redirect_url } = await req.json();

    if (!shop || !user_id) {
      return new Response(JSON.stringify({ error: "Missing shop or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "SHOPIFY_CLIENT_ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean shop domain
    let shopDomain = shop.trim().toLowerCase();
    shopDomain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!shopDomain.includes(".myshopify.com")) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }

    // Generate state (CSRF protection) - encode user_id and redirect
    const state = btoa(JSON.stringify({
      user_id,
      shop: shopDomain,
      redirect_url: redirect_url || "",
      nonce: crypto.randomUUID(),
    }));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/shopify-oauth-callback`;

    const scopes = "read_products,write_products,read_orders,write_orders,read_customers,read_inventory,write_inventory";

    const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}`;

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Shopify OAuth start error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

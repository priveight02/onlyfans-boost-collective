import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computed === hmacHeader;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!secret) {
      console.error("SHOPIFY_CLIENT_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";

    // Verify HMAC signature
    const valid = await verifyHmac(body, hmacHeader, secret);
    if (!valid) {
      console.error("HMAC verification failed for compliance webhook");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topic = req.headers.get("x-shopify-topic") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";
    const payload = JSON.parse(body);

    console.log(`Compliance webhook received: topic=${topic}, shop=${shopDomain}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    switch (topic) {
      // Customer requests their data
      case "customers/data_request": {
        console.log(`Customer data request from ${shopDomain}:`, JSON.stringify({
          shop_id: payload.shop_id,
          shop_domain: payload.shop_domain,
          customer_id: payload.customer?.id,
          customer_email: payload.customer?.email,
          orders_requested: payload.orders_requested?.length || 0,
        }));
        // Uplyze doesn't store personal customer data beyond what's in Shopify.
        // Log the request for audit purposes.
        break;
      }

      // Customer requests erasure of their data
      case "customers/redact": {
        console.log(`Customer redact request from ${shopDomain}:`, JSON.stringify({
          shop_id: payload.shop_id,
          customer_id: payload.customer?.id,
          customer_email: payload.customer?.email,
        }));
        // Uplyze doesn't persist customer PII. No action needed beyond logging.
        break;
      }

      // Shop owner uninstalls - erase all shop data
      case "shop/redact": {
        console.log(`Shop redact request from ${shopDomain}:`, JSON.stringify({
          shop_id: payload.shop_id,
          shop_domain: payload.shop_domain,
        }));

        // Delete the store connection for this shop
        const { error } = await supabaseAdmin
          .from("shopify_store_connections")
          .delete()
          .eq("shop_domain", shopDomain);

        if (error) {
          console.error("Error deleting shop connection:", error);
        } else {
          console.log(`Successfully deleted connection for ${shopDomain}`);
        }
        break;
      }

      default:
        console.log(`Unknown compliance topic: ${topic}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Compliance webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

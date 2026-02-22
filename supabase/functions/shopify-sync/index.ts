import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, data } = await req.json();

    // Get active Shopify connection for this user
    const { data: connection, error: connError } = await supabaseAdmin
      .from("shopify_store_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!connection) {
      return new Response(JSON.stringify({ error: "No active Shopify connection found. Connect your store in the Integrations tab." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopDomain = connection.shop_domain;
    const accessToken = connection.access_token;
    const apiVersion = "2024-01";
    const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}`;
    const headers = {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    };

    let result: any;

    switch (action) {
      // ── Fetch all products ──
      case "list_products": {
        const limit = data?.limit || 250;
        let allProducts: any[] = [];
        let pageInfo: string | null = null;
        let hasNext = true;

        // Paginate through all products
        while (hasNext) {
          let url = `${baseUrl}/products.json?limit=${Math.min(limit, 250)}`;
          if (pageInfo) {
            url = `${baseUrl}/products.json?limit=250&page_info=${pageInfo}`;
          }

          const res = await fetch(url, { headers });
          if (!res.ok) {
            const errText = await res.text();
            console.error("Shopify API error:", res.status, errText);
            return new Response(JSON.stringify({ error: `Shopify API error: ${res.status}`, details: errText }), {
              status: res.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const json = await res.json();
          allProducts = allProducts.concat(json.products || []);

          // Check for pagination
          const linkHeader = res.headers.get("link");
          if (linkHeader && linkHeader.includes('rel="next"')) {
            const match = linkHeader.match(/page_info=([^>&]*)/);
            pageInfo = match ? match[1] : null;
            hasNext = !!pageInfo && allProducts.length < 1000; // Safety cap
          } else {
            hasNext = false;
          }
        }

        result = { products: allProducts, total: allProducts.length };
        break;
      }

      // ── Get single product ──
      case "get_product": {
        const res = await fetch(`${baseUrl}/products/${data.product_id}.json`, { headers });
        if (!res.ok) {
          const errText = await res.text();
          return new Response(JSON.stringify({ error: `Shopify API error: ${res.status}` }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await res.json();
        break;
      }

      // ── Update product ──
      case "update_product": {
        const res = await fetch(`${baseUrl}/products/${data.product_id}.json`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ product: data.product }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return new Response(JSON.stringify({ error: `Shopify update error: ${res.status}`, details: errText }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await res.json();
        break;
      }

      // ── Create product (export) ──
      case "create_product": {
        const res = await fetch(`${baseUrl}/products.json`, {
          method: "POST",
          headers,
          body: JSON.stringify({ product: data.product }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return new Response(JSON.stringify({ error: `Shopify create error: ${res.status}`, details: errText }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await res.json();
        break;
      }

      // ── Get shop info ──
      case "get_shop": {
        const res = await fetch(`${baseUrl}/shop.json`, { headers });
        if (!res.ok) {
          return new Response(JSON.stringify({ error: `Shopify API error: ${res.status}` }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await res.json();
        break;
      }

      // ── Get product count ──
      case "count_products": {
        const res = await fetch(`${baseUrl}/products/count.json`, { headers });
        if (!res.ok) {
          return new Response(JSON.stringify({ error: `Shopify API error: ${res.status}` }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await res.json();
        break;
      }

      // ── Get inventory levels ──
      case "get_inventory": {
        const locationRes = await fetch(`${baseUrl}/locations.json`, { headers });
        if (!locationRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to fetch locations" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const locationData = await locationRes.json();
        const locations = locationData.locations || [];
        result = { locations };
        break;
      }

      // ── Get orders summary ──
      case "get_orders": {
        const limit = data?.limit || 50;
        const status = data?.status || "any";
        const res = await fetch(`${baseUrl}/orders.json?limit=${limit}&status=${status}`, { headers });
        if (!res.ok) {
          return new Response(JSON.stringify({ error: `Shopify orders error: ${res.status}` }), {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await res.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update last sync timestamp on the connection
    await supabaseAdmin
      .from("shopify_store_connections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Shopify sync error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

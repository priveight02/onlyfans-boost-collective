import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LS_API = "https://api.lemonsqueezy.com/v1";

const lsFetch = async (path: string) => {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY not set");
  return fetch(`${LS_API}${path}`, {
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${key}`,
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Get store
    const storesRes = await lsFetch("/stores");
    const storesData = await storesRes.json();
    const storeId = storesData.data?.[0]?.id;
    if (!storeId) throw new Error("No store found");

    // 2. Fetch all products
    const productsRes = await lsFetch(`/products?filter[store_id]=${storeId}&page[size]=100`);
    const productsData = await productsRes.json();
    const products = productsData.data || [];

    // 3. Fetch all variants for each product
    const allProducts: any[] = [];
    for (const product of products) {
      const varRes = await lsFetch(`/variants?filter[product_id]=${product.id}&page[size]=50`);
      const varData = await varRes.json();
      const variants = (varData.data || []).map((v: any) => ({
        variant_id: String(v.id),
        variant_name: v.attributes.name,
        price_cents: v.attributes.price,
        is_subscription: v.attributes.is_subscription || false,
        interval: v.attributes.interval || null,
      }));

      allProducts.push({
        product_id: String(product.id),
        product_name: product.attributes.name,
        description: product.attributes.description,
        status: product.attributes.status,
        variants,
      });
    }

    // 4. Auto-map credit packages to DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const packageMatchers: Record<string, string[]> = {
      "Starter Credits": ["starter credits (350)", "starter credits"],
      "Pro Credits": ["pro credits (2,000)", "pro credits (2000)", "pro credits"],
      "Studio Credits": ["studio credits (3,850)", "studio credits (3850)", "studio credits"],
      "Power User Credits": ["power user credits (13,500)", "power user credits (13500)", "power user credits"],
    };

    const mappingResults: any[] = [];

    for (const [dbName, matchNames] of Object.entries(packageMatchers)) {
      const lsProduct = allProducts.find(p =>
        matchNames.some(mn => p.product_name.toLowerCase().includes(mn.toLowerCase()))
      );
      if (lsProduct && lsProduct.variants.length > 0) {
        const variant = lsProduct.variants[0];
        const { error } = await supabaseAdmin
          .from("credit_packages")
          .update({
            stripe_product_id: lsProduct.product_id,
            stripe_price_id: variant.variant_id,
          })
          .ilike("name", `%${dbName.split(" ")[0]}%`);

        mappingResults.push({
          db_name: dbName,
          ls_product_name: lsProduct.product_name,
          product_id: lsProduct.product_id,
          variant_id: variant.variant_id,
          price_cents: variant.price_cents,
          updated: !error,
          error: error?.message || null,
        });
      } else {
        mappingResults.push({ db_name: dbName, status: "NOT_FOUND_IN_LS" });
      }
    }

    // 5. Read updated DB state
    const { data: updatedPackages } = await supabaseAdmin
      .from("credit_packages")
      .select("id, name, credits, bonus_credits, price_cents, stripe_product_id, stripe_price_id, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    return new Response(JSON.stringify({
      success: true,
      store_id: storeId,
      ls_products: allProducts,
      mapping_results: mappingResults,
      updated_db_packages: updatedPackages,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

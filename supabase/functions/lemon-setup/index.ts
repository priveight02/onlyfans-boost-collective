import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LS_API = "https://api.lemonsqueezy.com/v1";

const lsFetch = async (path: string, options: RequestInit = {}) => {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY not set");
  return fetch(`${LS_API}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${key}`,
    },
  });
};

const log = (step: string, d?: any) => console.log(`[LEMON-SETUP] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify admin
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");
    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").single();
    if (!roleData) throw new Error("Admin access required");
    log("Admin verified");

    // 1. Get store ID
    const storesRes = await lsFetch("/stores");
    if (!storesRes.ok) throw new Error("Failed to fetch stores: " + await storesRes.text());
    const storesData = await storesRes.json();
    if (!storesData.data?.length) throw new Error("No store found. Create a store in Lemon Squeezy first.");
    const storeId = String(storesData.data[0].id);
    log("Store found", { storeId, name: storesData.data[0].attributes.name });

    // 2. Create discount codes
    const discountDefs = [
      { name: "Loyalty 10% Off", code: "LOYALTY10", amount: 10, amount_type: "percent", duration: "once" },
      { name: "Loyalty 20% Off", code: "LOYALTY20", amount: 20, amount_type: "percent", duration: "once" },
      { name: "Loyalty 30% Off", code: "LOYALTY30", amount: 30, amount_type: "percent", duration: "once" },
      { name: "Retention 50% Off", code: "RETENTION50", amount: 50, amount_type: "percent", duration: "once" },
      { name: "Yearly Starter 15%", code: "YEARLY15", amount: 15, amount_type: "percent", duration: "forever" },
      { name: "Yearly Pro 30%", code: "YEARLY30", amount: 30, amount_type: "percent", duration: "forever" },
      { name: "Yearly Business 33%", code: "YEARLY33", amount: 33, amount_type: "percent", duration: "forever" },
    ];

    const discountResults: any[] = [];
    for (const d of discountDefs) {
      // Check if exists
      const checkRes = await lsFetch(`/discounts?filter[store_id]=${storeId}`);
      const checkData = await checkRes.json();
      const existing = (checkData.data || []).find((x: any) => x.attributes.code === d.code);
      if (existing) {
        discountResults.push({ ...d, id: existing.id, status: "exists" });
        continue;
      }

      const res = await lsFetch("/discounts", {
        method: "POST",
        body: JSON.stringify({
          data: {
            type: "discounts",
            attributes: {
              name: d.name,
              code: d.code,
              amount: d.amount,
              amount_type: d.amount_type,
              duration: d.duration,
              is_limited_to_products: false,
              is_limited_redemptions: false,
            },
            relationships: {
              store: { data: { type: "stores", id: storeId } },
            },
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        discountResults.push({ ...d, id: data.data.id, status: "created" });
        log("Discount created", { code: d.code });
      } else {
        discountResults.push({ ...d, status: "failed", error: await res.text() });
      }
    }

    // 3. List existing products and variants
    const productsRes = await lsFetch(`/products?filter[store_id]=${storeId}&page[size]=100`);
    const productsData = await productsRes.json();
    const products = productsData.data || [];

    const allVariants: any[] = [];
    for (const product of products) {
      const varRes = await lsFetch(`/variants?filter[product_id]=${product.id}&page[size]=50`);
      const varData = await varRes.json();
      for (const v of (varData.data || [])) {
        allVariants.push({
          variant_id: String(v.id),
          product_id: String(product.id),
          product_name: product.attributes.name,
          variant_name: v.attributes.name,
          price: v.attributes.price,
        });
      }
    }
    log("Products listed", { products: products.length, variants: allVariants.length });

    // 4. Auto-map credit packages to variants
    const packageMap: Record<string, string> = {
      starter: "Starter Credits",
      pro: "Pro Credits",
      studio: "Studio Credits",
      power: "Power User Credits",
    };

    const mapped: any[] = [];
    for (const [key, targetName] of Object.entries(packageMap)) {
      const variant = allVariants.find((v: any) =>
        v.product_name.toLowerCase() === targetName.toLowerCase()
      );
      if (variant) {
        const namePattern = key === "power" ? "Power" : key.charAt(0).toUpperCase() + key.slice(1);
        await supabaseAdmin.from("credit_packages").update({
          stripe_product_id: variant.product_id,
          stripe_price_id: variant.variant_id,
        }).ilike("name", `%${namePattern}%`);
        mapped.push({ key, ...variant });
        log("Mapped package", { key, variant_id: variant.variant_id });
      }
    }

    // 5. Check for missing products
    const expectedProducts = [
      { name: "Starter Credits", price: "$9.00", type: "one-time" },
      { name: "Pro Credits", price: "$29.00", type: "one-time" },
      { name: "Studio Credits", price: "$49.00", type: "one-time" },
      { name: "Power User Credits", price: "$149.00", type: "one-time" },
      { name: "Custom Credits", price: "Pay what you want", type: "one-time" },
      { name: "Starter Plan Monthly", price: "$9.00/mo", type: "subscription (monthly)" },
      { name: "Starter Plan Yearly", price: "$91.80/yr", type: "subscription (yearly)" },
      { name: "Pro Plan Monthly", price: "$29.00/mo", type: "subscription (monthly)" },
      { name: "Pro Plan Yearly", price: "$243.60/yr", type: "subscription (yearly)" },
      { name: "Business Plan Monthly", price: "$79.00/mo", type: "subscription (monthly)" },
      { name: "Business Plan Yearly", price: "$635.16/yr", type: "subscription (yearly)" },
    ];

    const missing = expectedProducts.filter(
      (ep) => !products.find((p: any) => p.attributes.name.toLowerCase() === ep.name.toLowerCase())
    );

    return new Response(JSON.stringify({
      success: true,
      store_id: storeId,
      discounts: discountResults,
      existing_products: products.map((p: any) => ({ id: p.id, name: p.attributes.name, status: p.attributes.status })),
      variants: allVariants,
      mapped_to_credit_packages: mapped,
      missing_products: missing,
      instructions: missing.length > 0
        ? `Create these ${missing.length} products in Lemon Squeezy dashboard, then re-run this function to complete mapping.`
        : "All products found and mapped!",
      image_note: "Product images must be uploaded manually in the Lemon Squeezy dashboard. Use images from the product-images storage bucket.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

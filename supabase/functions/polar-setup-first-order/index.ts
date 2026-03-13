import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_MODE = Deno.env.get("POLAR_MODE") || "live";
const POLAR_API = (POLAR_MODE === "sandbox" || POLAR_MODE === "test")
  ? "https://sandbox-api.polar.sh/v1"
  : "https://api.polar.sh/v1";

const polarFetch = async (path: string, options: RequestInit = {}) => {
  const token = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!token) throw new Error("POLAR_ACCESS_TOKEN not set");
  return fetch(`${POLAR_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
};

const log = (step: string, d?: any) => console.log(`[POLAR-FIRST-ORDER-SETUP] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const PRODUCTS = [
  { name: "Starter Credits", price_cents: 900, metadata: { type: "credit_package", base_package: "starter", discount_tier: "none" } },
  { name: "Pro Credits", price_cents: 2900, metadata: { type: "credit_package", base_package: "pro", discount_tier: "none" } },
  { name: "Studio Credits", price_cents: 4900, metadata: { type: "credit_package", base_package: "studio", discount_tier: "none" } },
  { name: "Power User Credits", price_cents: 14900, metadata: { type: "credit_package", base_package: "power", discount_tier: "none" } },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const results: any[] = [];

    // Step 1: Check existing products
    const existingRes = await polarFetch("/products?limit=100");
    const existingData = await existingRes.json();
    const existingProducts = existingData.items || [];
    log("Existing products count", existingProducts.length);

    // Step 2: Create/find the 4 base products
    for (const prod of PRODUCTS) {
      // Check if already exists
      const existing = existingProducts.find((p: any) =>
        p.metadata?.type === "credit_package" &&
        p.metadata?.base_package === prod.metadata.base_package &&
        p.metadata?.discount_tier === "none"
      );

      if (existing) {
        log(`Product already exists: ${prod.name}`, { id: existing.id });
        results.push({ name: prod.name, id: existing.id, status: "already_exists" });
        continue;
      }

      // Create new product
      const createRes = await polarFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: prod.name,
          description: `${prod.name} package`,
          recurring_interval: null,
          prices: [
            {
              type: "one_time",
              price_amount: prod.price_cents,
              price_currency: "usd",
            },
          ],
          metadata: prod.metadata,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        log(`Failed to create ${prod.name}`, { status: createRes.status, body: errText });
        results.push({ name: prod.name, status: "error", error: errText });
        continue;
      }

      const created = await createRes.json();
      log(`Created product: ${prod.name}`, { id: created.id });
      results.push({ name: prod.name, id: created.id, status: "created" });
    }

    // Step 3: Create 40% discount if it doesn't exist
    const discountRes = await polarFetch("/discounts?limit=50");
    const discountData = await discountRes.json();
    const discounts = discountData.items || [];
    let discountId = null;

    for (const d of discounts) {
      if (d.type === "percentage" && d.basis_points === 4000) {
        discountId = d.id;
        log("40% discount already exists", { id: d.id });
        break;
      }
    }

    if (!discountId) {
      // Get all product IDs (base packages with discount_tier=none)
      const allBaseProducts = existingProducts.filter((p: any) =>
        p.metadata?.type === "credit_package" && p.metadata?.discount_tier === "none"
      );
      const productIds = [
        ...allBaseProducts.map((p: any) => p.id),
        ...results.filter(r => r.id).map(r => r.id),
      ];
      // Deduplicate
      const uniqueProductIds = [...new Set(productIds)];

      const createDiscountRes = await polarFetch("/discounts", {
        method: "POST",
        body: JSON.stringify({
          name: "First Order 40% OFF",
          type: "percentage",
          basis_points: 4000,
          duration: "once",
          products: uniqueProductIds,
        }),
      });

      if (createDiscountRes.ok) {
        const disc = await createDiscountRes.json();
        discountId = disc.id;
        log("Created 40% discount", { id: disc.id });
      } else {
        const errText = await createDiscountRes.text();
        log("Failed to create discount", { status: createDiscountRes.status, body: errText });
      }
    }

    return new Response(JSON.stringify({ products: results, discount_id: discountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

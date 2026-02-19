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

const SUPABASE_STORAGE_BASE = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/product-images";

// ═══════════════════════════════════════════════════════
// PRODUCT DEFINITIONS — exact replica of Stripe catalog
// ═══════════════════════════════════════════════════════

const CREDIT_PRODUCTS = [
  // 4 Base credit packages
  { name: "Starter Credits (350)", description: "350 instant credits to power your AI tools, Platform features, and content creation. Perfect for getting started, delivered instantly, never expires.", price: 900, image: "credits-starter.png", meta: { tier: "starter", credits: "350", bonus: "0" } },
  { name: "Pro Credits (2,000)", description: "2,000 credits (1,650 + 350 bonus!). Our most popular pack. Unlock advanced AI features, Platform access, and premium content tools. Instant delivery, never expires.", price: 2900, image: "credits-pro.png", meta: { tier: "pro", credits: "1650", bonus: "350" } },
  { name: "Studio Credits (3,850)", description: "3,850 credits (3,300 + 550 bonus!). Ideal for growing creators. Full Platform access, all AI tools, and priority support included. Instant delivery, never expires.", price: 4900, image: "credits-studio-new.png", meta: { tier: "studio", credits: "3300", bonus: "550" } },
  { name: "Power User Credits (13,500)", description: "13,500 credits (11,500 + 2,000 bonus). Best value for power users. Everything unlocked: unlimited AI, full Platform, team workspace, and API access. Instant delivery, never expires.", price: 14900, image: "credits-power-new.png", meta: { tier: "power", credits: "11500", bonus: "2000" } },

  // 10% Loyalty variants
  { name: "Starter Credits (10% Off)", description: "350 instant credits with 10% loyalty reward! Thank you for coming back. Instant delivery, never expires.", price: 810, image: "img-starter-10.png", meta: { tier: "starter", discount: "10" } },
  { name: "Pro Credits (10% Off)", description: "2,000 credits (1,650 + 350 bonus) with 10% loyalty reward! Instant delivery, never expires.", price: 2610, image: "img-pro-10.png", meta: { tier: "pro", discount: "10" } },
  { name: "Studio Credits (10% Off)", description: "3,850 credits (3,300 + 550 bonus) with 10% loyalty reward! Instant delivery, never expires.", price: 4410, image: "img-studio-10.png", meta: { tier: "studio", discount: "10" } },
  { name: "Power User Credits (10% Off)", description: "13,500 credits (11,500 + 2,000 bonus) with 10% loyalty reward! The ultimate pack for power users, everything unlocked at a better price. Instant delivery, never expires.", price: 13410, image: "img-power-10.png", meta: { tier: "power", discount: "10" } },

  // 20% Loyalty variants
  { name: "Starter Credits (20% Off)", description: "350 instant credits with 20% loyalty reward! Your loyalty pays off, grab your credits at a great price. Instant delivery, never expires.", price: 720, image: "img-starter-20.png", meta: { tier: "starter", discount: "20" } },
  { name: "Pro Credits (20% Off)", description: "2,000 credits (1,650 + 350 bonus) with 20% loyalty reward! Serious savings on our most popular pack. Instant delivery, never expires.", price: 2320, image: "img-pro-20.png", meta: { tier: "pro", discount: "20" } },
  { name: "Studio Credits (20% Off)", description: "3,850 credits (3,300 + 550 bonus) with 20% loyalty reward! Grow faster with serious savings. Instant delivery, never expires.", price: 3920, image: "img-studio-20.png", meta: { tier: "studio", discount: "20" } },
  { name: "Power User Credits (20% Off)", description: "13,500 credits (11,500 + 2,000 bonus) with 20% loyalty reward! Massive savings on the biggest pack. Instant delivery, never expires.", price: 11920, image: "img-power-20.png", meta: { tier: "power", discount: "20" } },

  // 30% Loyalty variants
  { name: "Starter Credits (30% Off)", description: "350 instant credits with 30% loyalty reward! Welcome back, your biggest loyalty discount yet. Instant delivery, never expires.", price: 630, image: "img-starter-30.png", meta: { tier: "starter", discount: "30" } },
  { name: "Pro Credits (30% Off)", description: "2,000 credits (1,650 + 350 bonus) with 30% loyalty reward! Your biggest loyalty discount, unlock everything at an incredible price. Instant delivery, never expires.", price: 2030, image: "img-pro-30.png", meta: { tier: "pro", discount: "30" } },
  { name: "Studio Credits (30% Off)", description: "3,850 credits (3,300 + 550 bonus) with 30% loyalty reward! Your biggest Studio discount, scale your content now for less. Instant delivery, never expires.", price: 3430, image: "img-studio-30.png", meta: { tier: "studio", discount: "30" } },
  { name: "Power User Credits (30% Off)", description: "13,500 credits (11,500 + 2,000 bonus) with 30% loyalty reward! Your biggest Power User discount, everything at maximum value. Instant delivery, never expires.", price: 10430, image: "img-power-30.png", meta: { tier: "power", discount: "30" } },

  // 50% Retention variants
  { name: "Starter Credits (50% Off)", description: "350 instant credits at HALF PRICE! An exclusive one-time offer because we would hate to see you go! Instant delivery, never expires.", price: 450, image: "img-starter-50.png", meta: { tier: "starter", discount: "50" } },
  { name: "Pro Credits (50% Off)", description: "2,000 credits (1,650 + 350 bonus) at HALF PRICE! An exclusive one-time offer just for you because you're a precious customer. Our most popular pack at the best deal ever. Instant delivery, never expires.", price: 1450, image: "img-pro-50.png", meta: { tier: "pro", discount: "50" } },
  { name: "Studio Credits (50% Off)", description: "3,850 credits (3,300 + 550 bonus) at HALF PRICE! An exclusive one-time offer just for you because we value your time. Instant delivery, never expires.", price: 2450, image: "img-studio-50.png", meta: { tier: "studio", discount: "50" } },
  { name: "Power User Credits (50% Off)", description: "13,500 credits (11,500 + 2,000 bonus) at HALF PRICE! An exclusive one-time offer just for you because we know there is no better. Instant delivery, never expires.", price: 7450, image: "img-power-50.png", meta: { tier: "power", discount: "50" } },
];

const SUBSCRIPTION_PRODUCTS = [
  { name: "Starter Plan (Monthly)", description: "215 credits every month to power your AI tools, Platform features, and content creation. Perfect for solo creators getting started!", price: 900, recurring: "month", image: "plan-starter-coins.png", meta: { plan_id: "starter", cycle: "monthly", credits: "215" } },
  { name: "Starter Plan (Yearly)", description: "215 credits every month to power your AI tools, save 15% with annual billing! Platform features, and content creation. Perfect for solo creators getting started!", price: 10800, recurring: "year", image: "plan-starter-coins.png", meta: { plan_id: "starter", cycle: "yearly", credits: "215" } },
  { name: "Pro Plan (Monthly)", description: "1,075 credits every month, unlock advanced AI features, full Platform access, 5 managed accounts, and priority support. The go-to plan for serious creators ready to scale.", price: 2900, recurring: "month", image: "plan-pro-coins-fixed.png", meta: { plan_id: "pro", cycle: "monthly", credits: "1075" } },
  { name: "Pro Plan (Yearly)", description: "1,075 credits every month, save 30% with annual billing! Advanced AI, full Platform, priority support.", price: 34800, recurring: "year", image: "plan-pro-coins-fixed.png", meta: { plan_id: "pro", cycle: "yearly", credits: "1075" } },
  { name: "Business Plan (Monthly)", description: "4,300 credits every month, the ultimate powerhouse for agencies and top creators. Unlimited accounts, team workspace, advanced analytics, API access, and dedicated support.", price: 7900, recurring: "month", image: "plan-business-coins.png", meta: { plan_id: "business", cycle: "monthly", credits: "4300" } },
  { name: "Business Plan (Yearly)", description: "4,300 credits every month, save 33% with annual billing! Full Platform, unlimited accounts, dedicated support.", price: 94800, recurring: "year", image: "plan-business-coins.png", meta: { plan_id: "business", cycle: "yearly", credits: "4300" } },
];

// Custom Credits product (pay what you want)
const CUSTOM_CREDITS = { name: "Custom Credits", description: "Buy exactly how many credits you need. Volume discounts up to 40% for bulk purchases. Instant delivery, never expires.", price: 100, image: "credits-custom.png" };

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
    // Fetch all existing discounts once
    const allDiscountsRes = await lsFetch(`/discounts?filter[store_id]=${storeId}&page[size]=100`);
    const allDiscountsData = allDiscountsRes.ok ? await allDiscountsRes.json() : { data: [] };
    const existingDiscounts = allDiscountsData.data || [];

    for (const d of discountDefs) {
      const existing = existingDiscounts.find((x: any) => x.attributes.code === d.code);
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
              name: d.name, code: d.code, amount: d.amount,
              amount_type: d.amount_type, duration: d.duration,
              is_limited_to_products: false, is_limited_redemptions: false,
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

    // 4. Auto-map credit packages to variants (match by product name)
    const packageMap: Record<string, string[]> = {
      starter: ["Starter Credits (350)", "Starter Credits"],
      pro: ["Pro Credits (2,000)", "Pro Credits (2000)", "Pro Credits"],
      studio: ["Studio Credits (3,850)", "Studio Credits (3850)", "Studio Credits"],
      power: ["Power User Credits (13,500)", "Power User Credits (13500)", "Power User Credits"],
    };

    const mapped: any[] = [];
    for (const [key, targetNames] of Object.entries(packageMap)) {
      const variant = allVariants.find((v: any) =>
        targetNames.some(tn => v.product_name.toLowerCase() === tn.toLowerCase())
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

    // 5. Build missing product list
    const ALL_EXPECTED = [
      ...CREDIT_PRODUCTS.map(p => ({ name: p.name, price: `$${(p.price / 100).toFixed(2)}`, type: "one-time" })),
      ...SUBSCRIPTION_PRODUCTS.map(p => ({ name: p.name, price: `$${(p.price / 100).toFixed(2)}/${p.recurring}`, type: `subscription (${p.recurring}ly)` })),
      { name: CUSTOM_CREDITS.name, price: "Pay what you want", type: "one-time" },
    ];

    const missing = ALL_EXPECTED.filter(
      (ep) => !products.find((p: any) => p.attributes.name.toLowerCase() === ep.name.toLowerCase())
    );

    // 6. Build product creation guide with images
    const imageGuide = [
      ...CREDIT_PRODUCTS.map(p => ({
        product: p.name,
        price_cents: p.price,
        description: p.description,
        image_url: `${SUPABASE_STORAGE_BASE}/${p.image}`,
        tax_enabled: false,
      })),
      ...SUBSCRIPTION_PRODUCTS.map(p => ({
        product: p.name,
        price_cents: p.price,
        recurring: p.recurring,
        description: p.description,
        image_url: `${SUPABASE_STORAGE_BASE}/${p.image}`,
        tax_enabled: false,
      })),
      {
        product: CUSTOM_CREDITS.name,
        price_cents: CUSTOM_CREDITS.price,
        pay_what_you_want: true,
        description: CUSTOM_CREDITS.description,
        image_url: `${SUPABASE_STORAGE_BASE}/${CUSTOM_CREDITS.image}`,
        tax_enabled: false,
      },
    ];

    return new Response(JSON.stringify({
      success: true,
      store_id: storeId,
      discounts: discountResults,
      existing_products: products.map((p: any) => ({ id: p.id, name: p.attributes.name, status: p.attributes.status })),
      variants: allVariants,
      mapped_to_credit_packages: mapped,
      missing_products: missing,
      total_expected: ALL_EXPECTED.length,
      instructions: missing.length > 0
        ? `Create these ${missing.length} products in Lemon Squeezy dashboard (Products → + New Product), then re-run this function to complete mapping. NOTE: Lemon Squeezy does NOT support creating products via API — dashboard only. Set Tax to OFF for all products.`
        : "All products found and mapped!",
      product_creation_guide: missing.length > 0 ? imageGuide.filter(
        g => missing.some(m => m.name.toLowerCase() === g.product.toLowerCase())
      ) : [],
      note: "Product images must be uploaded manually in the Lemon Squeezy dashboard. Download from the image_url links provided.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

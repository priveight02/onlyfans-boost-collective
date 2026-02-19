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
// PRODUCT DEFINITIONS — exact replica of full catalog
// ═══════════════════════════════════════════════════════

const CREDIT_PRODUCTS = [
  { name: "Starter Credits (350)", description: "350 instant credits to power your AI tools, Platform features, and content creation. Perfect for getting started, delivered instantly, never expires.", price: 900, image: "credits-starter.png", meta: { tier: "starter", credits: "350", bonus: "0" } },
  { name: "Pro Credits (2,000)", description: "2,000 credits (1,650 + 350 bonus!). Our most popular pack. Unlock advanced AI features, Platform access, and premium content tools. Instant delivery, never expires.", price: 2900, image: "credits-pro.png", meta: { tier: "pro", credits: "1650", bonus: "350" } },
  { name: "Studio Credits (3,850)", description: "3,850 credits (3,300 + 550 bonus!). Ideal for growing creators. Full Platform access, all AI tools, and priority support included. Instant delivery, never expires.", price: 4900, image: "credits-studio-new.png", meta: { tier: "studio", credits: "3300", bonus: "550" } },
  { name: "Power User Credits (13,500)", description: "13,500 credits (11,500 + 2,000 bonus). Best value for power users. Everything unlocked: unlimited AI, full Platform, team workspace, and API access. Instant delivery, never expires.", price: 14900, image: "credits-power-new.png", meta: { tier: "power", credits: "11500", bonus: "2000" } },
];

const SUBSCRIPTION_PRODUCTS = [
  { name: "Starter Plan (Monthly)", description: "215 credits every month to power your AI tools, Platform features, and content creation. Perfect for solo creators getting started!", price: 900, recurring: "month", image: "plan-starter-coins.png", meta: { plan_id: "starter", cycle: "monthly", credits: "215" } },
  { name: "Starter Plan (Yearly)", description: "215 credits every month to power your AI tools, save 15% with annual billing!", price: 10800, recurring: "year", image: "plan-starter-coins.png", meta: { plan_id: "starter", cycle: "yearly", credits: "215" } },
  { name: "Pro Plan (Monthly)", description: "1,075 credits every month, unlock advanced AI features, full Platform access, 5 managed accounts, and priority support.", price: 2900, recurring: "month", image: "plan-pro-coins-fixed.png", meta: { plan_id: "pro", cycle: "monthly", credits: "1075" } },
  { name: "Pro Plan (Yearly)", description: "1,075 credits every month, save 30% with annual billing! Advanced AI, full Platform, priority support.", price: 34800, recurring: "year", image: "plan-pro-coins-fixed.png", meta: { plan_id: "pro", cycle: "yearly", credits: "1075" } },
  { name: "Business Plan (Monthly)", description: "4,300 credits every month, the ultimate powerhouse for agencies and top creators.", price: 7900, recurring: "month", image: "plan-business-coins.png", meta: { plan_id: "business", cycle: "monthly", credits: "4300" } },
  { name: "Business Plan (Yearly)", description: "4,300 credits every month, save 33% with annual billing!", price: 94800, recurring: "year", image: "plan-business-coins.png", meta: { plan_id: "business", cycle: "yearly", credits: "4300" } },
];

const CUSTOM_CREDITS = { name: "Custom Credits", description: "Buy exactly how many credits you need. Volume discounts up to 40% for bulk purchases. Instant delivery, never expires.", price: 100, image: "credits-custom.png" };

// ═══════════════════════════════════════════════════════
// FULL DISCOUNT/COUPON DEFINITIONS
// All loyalty, retention, volume, and promotional coupons
// ═══════════════════════════════════════════════════════

const DISCOUNT_DEFINITIONS = [
  // ─── Loyalty Discounts (applied automatically based on purchase count) ───
  { name: "Loyalty 10% Off", code: "LOYALTY10", amount: 10, amount_type: "percent" as const, duration: "once" as const, description: "10% loyalty discount — awarded after 1st purchase" },
  { name: "Loyalty 20% Off", code: "LOYALTY20", amount: 20, amount_type: "percent" as const, duration: "once" as const, description: "20% loyalty discount — awarded after 2nd purchase" },
  { name: "Loyalty 30% Off", code: "LOYALTY30", amount: 30, amount_type: "percent" as const, duration: "once" as const, description: "30% loyalty discount — awarded after 3rd+ purchase" },

  // ─── Retention Discount (one-time 50% off to retain at-risk customers) ───
  { name: "Retention 50% Off", code: "RETENTION50", amount: 50, amount_type: "percent" as const, duration: "once" as const, description: "50% one-time retention offer for at-risk users" },

  // ─── Volume Discounts (for custom credit bulk purchases) ───
  { name: "Volume 5% Off (10k+)", code: "VOLUME5", amount: 5, amount_type: "percent" as const, duration: "once" as const, description: "5% volume discount for 10,000+ credits" },
  { name: "Volume 15% Off (15k+)", code: "VOLUME15", amount: 15, amount_type: "percent" as const, duration: "once" as const, description: "15% volume discount for 15,000+ credits" },
  { name: "Volume 20% Off (20k+)", code: "VOLUME20", amount: 20, amount_type: "percent" as const, duration: "once" as const, description: "20% volume discount for 20,000+ credits" },
  { name: "Volume 25% Off (30k+)", code: "VOLUME25", amount: 25, amount_type: "percent" as const, duration: "once" as const, description: "25% volume discount for 30,000+ credits" },
  { name: "Volume 30% Off (50k+)", code: "VOLUME30", amount: 30, amount_type: "percent" as const, duration: "once" as const, description: "30% volume discount for 50,000+ credits" },
  { name: "Volume 35% Off (75k+)", code: "VOLUME35", amount: 35, amount_type: "percent" as const, duration: "once" as const, description: "35% volume discount for 75,000+ credits" },
  { name: "Volume 40% Off (100k+)", code: "VOLUME40", amount: 40, amount_type: "percent" as const, duration: "once" as const, description: "40% volume discount for 100,000+ credits" },

  // ─── Yearly Subscription Incentives ───
  { name: "Yearly Starter 15%", code: "YEARLY15", amount: 15, amount_type: "percent" as const, duration: "forever" as const, description: "15% yearly billing discount for Starter plan" },
  { name: "Yearly Pro 30%", code: "YEARLY30", amount: 30, amount_type: "percent" as const, duration: "forever" as const, description: "30% yearly billing discount for Pro plan" },
  { name: "Yearly Business 33%", code: "YEARLY33", amount: 33, amount_type: "percent" as const, duration: "forever" as const, description: "33% yearly billing discount for Business plan" },

  // ─── Promotional / Seasonal Coupons ───
  { name: "Welcome 15% Off", code: "WELCOME15", amount: 15, amount_type: "percent" as const, duration: "once" as const, description: "15% welcome discount for first-time buyers" },
  { name: "Flash Sale 25%", code: "FLASH25", amount: 25, amount_type: "percent" as const, duration: "once" as const, description: "25% flash sale — limited time promotion" },
  { name: "Creator Partner 20%", code: "CREATOR20", amount: 20, amount_type: "percent" as const, duration: "once" as const, description: "20% partner discount for referred creators" },
  { name: "Agency Bundle 35%", code: "AGENCY35", amount: 35, amount_type: "percent" as const, duration: "once" as const, description: "35% agency bundle discount for bulk onboarding" },
  { name: "Anniversary 40% Off", code: "ANNIVERSARY40", amount: 40, amount_type: "percent" as const, duration: "once" as const, description: "40% anniversary celebration discount" },

  // ─── Fixed Amount Discounts ───
  { name: "$5 Off Starter", code: "SAVE5", amount: 500, amount_type: "fixed" as const, duration: "once" as const, description: "$5 off any purchase" },
  { name: "$10 Off Pro+", code: "SAVE10", amount: 1000, amount_type: "fixed" as const, duration: "once" as const, description: "$10 off Pro or higher packages" },
  { name: "$25 Off Power User", code: "SAVE25", amount: 2500, amount_type: "fixed" as const, duration: "once" as const, description: "$25 off Power User package" },
  { name: "$50 Off Business Plan", code: "SAVE50", amount: 5000, amount_type: "fixed" as const, duration: "once" as const, description: "$50 off Business plan subscription" },

  // ─── Referral & Affiliate Coupons ───
  { name: "Referral 10% Off", code: "REFER10", amount: 10, amount_type: "percent" as const, duration: "once" as const, description: "10% referral reward discount" },
  { name: "Affiliate 15% Off", code: "AFFILIATE15", amount: 15, amount_type: "percent" as const, duration: "once" as const, description: "15% affiliate partner discount" },
  { name: "Influencer 25% Off", code: "INFLUENCER25", amount: 25, amount_type: "percent" as const, duration: "once" as const, description: "25% influencer collaboration discount" },

  // ─── Subscription Upgrade Incentives ───
  { name: "Upgrade 20% Off First Month", code: "UPGRADE20", amount: 20, amount_type: "percent" as const, duration: "once" as const, description: "20% off first month when upgrading plan" },
  { name: "Downgrade Prevention 30%", code: "STAYPLAN30", amount: 30, amount_type: "percent" as const, duration: "once" as const, description: "30% retention offer to prevent plan downgrade" },

  // ─── Seasonal / Holiday Coupons ───
  { name: "Summer Sale 20%", code: "SUMMER20", amount: 20, amount_type: "percent" as const, duration: "once" as const, description: "20% summer seasonal promotion" },
  { name: "Black Friday 50%", code: "BLACKFRIDAY50", amount: 50, amount_type: "percent" as const, duration: "once" as const, description: "50% Black Friday mega sale" },
  { name: "New Year 25%", code: "NEWYEAR25", amount: 25, amount_type: "percent" as const, duration: "once" as const, description: "25% New Year celebration discount" },
  { name: "Cyber Monday 40%", code: "CYBERMONDAY40", amount: 40, amount_type: "percent" as const, duration: "once" as const, description: "40% Cyber Monday deal" },
  { name: "Holiday Special 30%", code: "HOLIDAY30", amount: 30, amount_type: "percent" as const, duration: "once" as const, description: "30% holiday season discount" },
  { name: "Valentine 15%", code: "LOVE15", amount: 15, amount_type: "percent" as const, duration: "once" as const, description: "15% Valentine's Day promotion" },

  // ─── VIP / Whale Exclusive ───
  { name: "VIP 35% Exclusive", code: "VIP35", amount: 35, amount_type: "percent" as const, duration: "once" as const, description: "35% exclusive VIP customer discount" },
  { name: "Whale Reward 45%", code: "WHALE45", amount: 45, amount_type: "percent" as const, duration: "once" as const, description: "45% whale customer loyalty reward" },

  // ─── Win-Back / Re-engagement ───
  { name: "Win-Back 30%", code: "COMEBACK30", amount: 30, amount_type: "percent" as const, duration: "once" as const, description: "30% win-back offer for churned users" },
  { name: "We Miss You 40%", code: "MISSYOU40", amount: 40, amount_type: "percent" as const, duration: "once" as const, description: "40% re-engagement for long-inactive users" },
  { name: "Last Chance 50%", code: "LASTCHANCE50", amount: 50, amount_type: "percent" as const, duration: "once" as const, description: "50% last chance before account cleanup" },
];

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

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "full"; // "full" | "discounts_only" | "products_only" | "map_only"

    // 1. Get store ID
    const storesRes = await lsFetch("/stores");
    if (!storesRes.ok) throw new Error("Failed to fetch stores: " + await storesRes.text());
    const storesData = await storesRes.json();
    if (!storesData.data?.length) throw new Error("No store found. Create a store in Lemon Squeezy first.");
    const storeId = String(storesData.data[0].id);
    log("Store found", { storeId, name: storesData.data[0].attributes.name });

    // ═══════════════════════════════════════════════════════
    // 2. CREATE ALL DISCOUNT COUPONS ON LEMON SQUEEZY
    // ═══════════════════════════════════════════════════════
    const discountResults: any[] = [];

    if (mode === "full" || mode === "discounts_only") {
      log("Creating discount coupons", { total: DISCOUNT_DEFINITIONS.length });

      // Fetch all existing discounts in batches
      let allExisting: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await lsFetch(`/discounts?filter[store_id]=${storeId}&page[size]=100&page[number]=${page}`);
        const data = res.ok ? await res.json() : { data: [], meta: { page: { lastPage: 1 } } };
        allExisting = [...allExisting, ...(data.data || [])];
        hasMore = page < (data.meta?.page?.lastPage || 1);
        page++;
      }
      log("Existing discounts fetched", { count: allExisting.length });

      for (const d of DISCOUNT_DEFINITIONS) {
        const existing = allExisting.find((x: any) => x.attributes.code === d.code);
        if (existing) {
          discountResults.push({
            code: d.code,
            name: d.name,
            amount: d.amount,
            amount_type: d.amount_type,
            description: d.description,
            id: existing.id,
            status: "already_exists",
          });
          continue;
        }

        try {
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
            discountResults.push({
              code: d.code,
              name: d.name,
              amount: d.amount,
              amount_type: d.amount_type,
              description: d.description,
              id: data.data.id,
              status: "created",
            });
            log("Discount created", { code: d.code, id: data.data.id });
          } else {
            const errText = await res.text();
            discountResults.push({
              code: d.code,
              name: d.name,
              status: "failed",
              error: errText,
            });
            log("Discount creation failed", { code: d.code, error: errText });
          }
        } catch (e) {
          discountResults.push({ code: d.code, name: d.name, status: "error", error: e.message });
        }
      }

      // Summary
      const created = discountResults.filter(r => r.status === "created").length;
      const existed = discountResults.filter(r => r.status === "already_exists").length;
      const failed = discountResults.filter(r => r.status === "failed" || r.status === "error").length;
      log("Discount creation complete", { created, existed, failed, total: DISCOUNT_DEFINITIONS.length });
    }

    if (mode === "discounts_only") {
      return new Response(JSON.stringify({
        success: true,
        store_id: storeId,
        discounts: discountResults,
        summary: {
          total_defined: DISCOUNT_DEFINITIONS.length,
          created: discountResults.filter(r => r.status === "created").length,
          already_existed: discountResults.filter(r => r.status === "already_exists").length,
          failed: discountResults.filter(r => r.status === "failed" || r.status === "error").length,
        },
        categories: {
          loyalty: discountResults.filter(r => r.code.startsWith("LOYALTY")),
          retention: discountResults.filter(r => r.code.startsWith("RETENTION")),
          volume: discountResults.filter(r => r.code.startsWith("VOLUME")),
          yearly: discountResults.filter(r => r.code.startsWith("YEARLY")),
          promotional: discountResults.filter(r => ["WELCOME15", "FLASH25", "CREATOR20", "AGENCY35", "ANNIVERSARY40"].includes(r.code)),
          fixed_amount: discountResults.filter(r => r.code.startsWith("SAVE")),
          referral: discountResults.filter(r => ["REFER10", "AFFILIATE15", "INFLUENCER25"].includes(r.code)),
          subscription: discountResults.filter(r => ["UPGRADE20", "STAYPLAN30"].includes(r.code)),
          seasonal: discountResults.filter(r => ["SUMMER20", "BLACKFRIDAY50", "NEWYEAR25", "CYBERMONDAY40", "HOLIDAY30", "LOVE15"].includes(r.code)),
          vip: discountResults.filter(r => ["VIP35", "WHALE45"].includes(r.code)),
          winback: discountResults.filter(r => ["COMEBACK30", "MISSYOU40", "LASTCHANCE50"].includes(r.code)),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════════════════════
    // 3. LIST & MAP PRODUCTS
    // ═══════════════════════════════════════════════════════
    let products: any[] = [];
    let allVariants: any[] = [];
    let mapped: any[] = [];

    if (mode === "full" || mode === "products_only" || mode === "map_only") {
      const productsRes = await lsFetch(`/products?filter[store_id]=${storeId}&page[size]=100`);
      const productsData = await productsRes.json();
      products = productsData.data || [];

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
            is_subscription: v.attributes.is_subscription || false,
          });
        }
      }
      log("Products listed", { products: products.length, variants: allVariants.length });

      // Auto-map credit packages to variants
      const packageMap: Record<string, string[]> = {
        starter: ["Starter Credits (350)", "Starter Credits"],
        pro: ["Pro Credits (2,000)", "Pro Credits (2000)", "Pro Credits"],
        studio: ["Studio Credits (3,850)", "Studio Credits (3850)", "Studio Credits"],
        power: ["Power User Credits (13,500)", "Power User Credits (13500)", "Power User Credits"],
      };

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
    }

    // 4. Build missing product list
    const ALL_EXPECTED = [
      ...CREDIT_PRODUCTS.map(p => ({ name: p.name, price: `$${(p.price / 100).toFixed(2)}`, type: "one-time" })),
      ...SUBSCRIPTION_PRODUCTS.map(p => ({ name: p.name, price: `$${(p.price / 100).toFixed(2)}/${p.recurring}`, type: `subscription (${p.recurring}ly)` })),
      { name: CUSTOM_CREDITS.name, price: "Pay what you want", type: "one-time" },
    ];

    const missing = ALL_EXPECTED.filter(
      (ep) => !products.find((p: any) => p.attributes.name.toLowerCase() === ep.name.toLowerCase())
    );

    // 5. Build product creation guide with images
    const imageGuide = [
      ...CREDIT_PRODUCTS.map(p => ({
        product: p.name, price_cents: p.price, description: p.description,
        image_url: `${SUPABASE_STORAGE_BASE}/${p.image}`, tax_enabled: false,
      })),
      ...SUBSCRIPTION_PRODUCTS.map(p => ({
        product: p.name, price_cents: p.price, recurring: p.recurring, description: p.description,
        image_url: `${SUPABASE_STORAGE_BASE}/${p.image}`, tax_enabled: false,
      })),
      {
        product: CUSTOM_CREDITS.name, price_cents: CUSTOM_CREDITS.price,
        pay_what_you_want: true, description: CUSTOM_CREDITS.description,
        image_url: `${SUPABASE_STORAGE_BASE}/${CUSTOM_CREDITS.image}`, tax_enabled: false,
      },
    ];

    return new Response(JSON.stringify({
      success: true,
      store_id: storeId,
      discounts: {
        results: discountResults,
        summary: {
          total_defined: DISCOUNT_DEFINITIONS.length,
          created: discountResults.filter(r => r.status === "created").length,
          already_existed: discountResults.filter(r => r.status === "already_exists").length,
          failed: discountResults.filter(r => r.status === "failed" || r.status === "error").length,
        },
        categories: {
          loyalty: DISCOUNT_DEFINITIONS.filter(d => d.code.startsWith("LOYALTY")).map(d => d.code),
          retention: DISCOUNT_DEFINITIONS.filter(d => d.code.startsWith("RETENTION")).map(d => d.code),
          volume: DISCOUNT_DEFINITIONS.filter(d => d.code.startsWith("VOLUME")).map(d => d.code),
          yearly: DISCOUNT_DEFINITIONS.filter(d => d.code.startsWith("YEARLY")).map(d => d.code),
          promotional: ["WELCOME15", "FLASH25", "CREATOR20", "AGENCY35", "ANNIVERSARY40"],
          fixed_amount: DISCOUNT_DEFINITIONS.filter(d => d.code.startsWith("SAVE")).map(d => d.code),
          referral: ["REFER10", "AFFILIATE15", "INFLUENCER25"],
          subscription: ["UPGRADE20", "STAYPLAN30"],
          seasonal: ["SUMMER20", "BLACKFRIDAY50", "NEWYEAR25", "CYBERMONDAY40", "HOLIDAY30", "LOVE15"],
          vip: ["VIP35", "WHALE45"],
          winback: ["COMEBACK30", "MISSYOU40", "LASTCHANCE50"],
        },
      },
      existing_products: products.map((p: any) => ({ id: p.id, name: p.attributes.name, status: p.attributes.status })),
      variants: allVariants,
      mapped_to_credit_packages: mapped,
      missing_products: missing,
      total_expected: ALL_EXPECTED.length,
      instructions: missing.length > 0
        ? `Create these ${missing.length} products in Lemon Squeezy dashboard (Products → + New Product), then re-run with mode=map_only. LS does NOT support creating products via API. Set Tax to OFF.`
        : "All products found and mapped!",
      product_creation_guide: missing.length > 0 ? imageGuide.filter(
        g => missing.some(m => m.name.toLowerCase() === g.product.toLowerCase())
      ) : [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_MODE = Deno.env.get("POLAR_MODE") || "live";
const POLAR_API = POLAR_MODE === "sandbox" 
  ? "https://sandbox-api.polar.sh/v1" 
  : "https://api.polar.sh/v1";
const SUPABASE_STORAGE_BASE = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/product-images";

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

const logStep = (step: string, details?: any) => {
  console.log(`[POLAR-SETUP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Upload image from URL to Polar as product_media, returns file ID
const uploadProductImage = async (imageUrl: string, fileName: string): Promise<string | null> => {
  try {
    // 1. Download the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) { logStep("Image download failed", { imageUrl }); return null; }
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/png";
    logStep("Image downloaded", { fileName, size: imgBytes.length });

    // 2. Create file on Polar
    const createRes = await polarFetch("/files", {
      method: "POST",
      body: JSON.stringify({
        name: fileName,
        mime_type: mimeType,
        size: imgBytes.length,
        service: "product_media",
        upload: {
          parts: [{ number: 1, chunk_start: 0, chunk_end: imgBytes.length }],
        },
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      logStep("File create failed", { err });
      return null;
    }
    const fileData = await createRes.json();
    const fileId = fileData.id;
    const uploadUrl = fileData.upload?.parts?.[0]?.url;
    if (!uploadUrl) { logStep("No upload URL returned"); return null; }

    // 3. Upload to S3 presigned URL
    const s3Res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: imgBytes,
    });
    if (!s3Res.ok) {
      logStep("S3 upload failed", { status: s3Res.status });
      return null;
    }
    const etag = s3Res.headers.get("etag") || "";

    // 4. Complete the upload
    const completeRes = await polarFetch(`/files/${fileId}/uploaded`, {
      method: "POST",
      body: JSON.stringify({
        id: fileId,
        path: fileName,
        parts: [{ number: 1, checksum_etag: etag.replace(/"/g, ""), chunk_start: 0, chunk_end: imgBytes.length }],
      }),
    });
    if (!completeRes.ok) {
      const err = await completeRes.text();
      logStep("File complete failed", { err });
      return null;
    }
    logStep("Image uploaded to Polar", { fileId, fileName });
    return fileId;
  } catch (e) {
    logStep("Image upload error", { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
};

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

    logStep("Admin verified, starting full product creation (26 products)");

    // Fetch existing products to avoid duplicates
    const existingRes = await polarFetch("/products?limit=100");
    const existingProducts = await existingRes.json();
    const existingByName = new Map<string, any>();
    for (const p of (existingProducts.items || [])) {
      existingByName.set(p.name, p);
    }
    logStep("Existing products", { count: existingByName.size });

    // Upload product images once and reuse
    const imageMap: Record<string, string | null> = {};
    const imageUrls: Record<string, string> = {
      starter: `${SUPABASE_STORAGE_BASE}/credits-starter.png`,
      pro: `${SUPABASE_STORAGE_BASE}/credits-pro.png`,
      studio: `${SUPABASE_STORAGE_BASE}/credits-studio.png`,
      power: `${SUPABASE_STORAGE_BASE}/credits-power.png`,
      custom: `${SUPABASE_STORAGE_BASE}/credits-custom.png`,
      plan_starter: `${SUPABASE_STORAGE_BASE}/plan-starter.png`,
      plan_pro: `${SUPABASE_STORAGE_BASE}/plan-pro.png`,
      plan_business: `${SUPABASE_STORAGE_BASE}/plan-business.png`,
    };

    for (const [key, url] of Object.entries(imageUrls)) {
      imageMap[key] = await uploadProductImage(url, `${key}.png`);
    }
    logStep("Images uploaded", { uploaded: Object.values(imageMap).filter(Boolean).length });

    const createProduct = async (data: any, imageKey?: string) => {
      if (existingByName.has(data.name)) {
        const existing = existingByName.get(data.name);
        logStep("Product exists, skipping", { name: data.name, id: existing?.id });
        // Still try to attach image if missing
        if (imageKey && imageMap[imageKey] && existing && (!existing.medias || existing.medias.length === 0)) {
          try {
            await polarFetch(`/products/${existing.id}`, {
              method: "PATCH",
              body: JSON.stringify({ medias: [imageMap[imageKey]] }),
            });
            logStep("Attached image to existing product", { name: data.name });
          } catch {}
        }
        return existing;
      }
      // Add media if available
      if (imageKey && imageMap[imageKey]) {
        data.medias = [imageMap[imageKey]];
      }
      const res = await polarFetch("/products", { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to create "${data.name}": ${errText}`);
      }
      const product = await res.json();
      logStep("Created product", { name: data.name, id: product.id });
      return product;
    };

    const results: any = { credit_products: [], subscriptions: [], custom: null };

    // ═══════════════════════════════════════════════════════════
    // CREDIT PACKAGES — 4 base × (base + 10% + 20% + 30% + 50%) = 20 products
    // ═══════════════════════════════════════════════════════════
    const basePackages = [
      { key: "starter", name: "Starter", credits: 350, bonus: 0, basePriceCents: 900, desc: "350 credits for the Uplyze AI platform. Instant delivery, never expires." },
      { key: "pro", name: "Pro", credits: 1650, bonus: 350, basePriceCents: 2900, desc: "1,650 credits + 350 bonus for Uplyze AI. Instant delivery, never expires." },
      { key: "studio", name: "Studio", credits: 3300, bonus: 550, basePriceCents: 4900, desc: "3,300 credits + 550 bonus for Uplyze AI. Instant delivery, never expires." },
      { key: "power", name: "Power User", credits: 11500, bonus: 2000, basePriceCents: 14900, desc: "11,500 credits + 2,000 bonus for Uplyze AI. Our best value package." },
    ];

    const discountTiers = [
      { suffix: "", discountPct: 0, metaDiscount: "none" },
      { suffix: " — 10% Loyalty", discountPct: 10, metaDiscount: "loyalty_10" },
      { suffix: " — 20% Loyalty", discountPct: 20, metaDiscount: "loyalty_20" },
      { suffix: " — 30% Loyalty", discountPct: 30, metaDiscount: "loyalty_30" },
      { suffix: " — 50% Retention", discountPct: 50, metaDiscount: "retention_50" },
    ];

    for (const pkg of basePackages) {
      for (const tier of discountTiers) {
        const productName = `${pkg.name} Credits${tier.suffix}`;
        const discountedPrice = Math.round(pkg.basePriceCents * (1 - tier.discountPct / 100));
        const product = await createProduct({
          name: productName,
          description: `${pkg.desc}${tier.discountPct > 0 ? ` ${tier.discountPct}% discount auto-applied.` : ""}`,
          prices: [{ amount_type: "fixed", price_amount: discountedPrice, price_currency: "usd" }],
          metadata: {
            type: "credit_package",
            base_package: pkg.key,
            credits: String(pkg.credits),
            bonus_credits: String(pkg.bonus),
            discount_tier: tier.metaDiscount,
            original_price: String(pkg.basePriceCents),
          },
        }, pkg.key);

        results.credit_products.push({
          name: productName,
          product_id: product.id,
          price_id: product.prices?.[0]?.id,
          credits: pkg.credits,
          bonus: pkg.bonus,
          price: discountedPrice,
          discount_tier: tier.metaDiscount,
        });
      }

      // Update credit_packages table with base product IDs
      const baseProduct = results.credit_products.find(
        (p: any) => p.discount_tier === "none" && p.name === `${pkg.name} Credits`
      );
      if (baseProduct) {
        const { error: updateErr } = await supabaseAdmin
          .from("credit_packages")
          .update({
            stripe_product_id: baseProduct.product_id,
            stripe_price_id: baseProduct.price_id || baseProduct.product_id,
          })
          .ilike("name", `%${pkg.name}%`);
        if (updateErr) logStep("Warning: credit_packages update failed", { name: pkg.name, error: updateErr.message });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CUSTOM CREDITS (1 product, ad-hoc pricing)
    // ═══════════════════════════════════════════════════════════
    const customProduct = await createProduct({
      name: "Custom Credits",
      description: "Custom credit package for Uplyze AI. Choose your own amount with volume discounts up to 40%.",
      prices: [{ amount_type: "custom", price_currency: "usd" }],
      metadata: { type: "custom_credits" },
    }, "custom");
    results.custom = { product_id: customProduct.id };

    // ═══════════════════════════════════════════════════════════
    // SUBSCRIPTION PLANS (6 products)
    // ═══════════════════════════════════════════════════════════
    const subscriptions = [
      { name: "Starter Plan (Monthly)", plan: "starter", cycle: "monthly", interval: "month", price: 900, credits: 215, imgKey: "plan_starter" },
      { name: "Starter Plan (Yearly)", plan: "starter", cycle: "yearly", interval: "year", price: 9180, credits: 215, imgKey: "plan_starter" },
      { name: "Pro Plan (Monthly)", plan: "pro", cycle: "monthly", interval: "month", price: 2900, credits: 1075, imgKey: "plan_pro" },
      { name: "Pro Plan (Yearly)", plan: "pro", cycle: "yearly", interval: "year", price: 24360, credits: 1075, imgKey: "plan_pro" },
      { name: "Business Plan (Monthly)", plan: "business", cycle: "monthly", interval: "month", price: 7900, credits: 4300, imgKey: "plan_business" },
      { name: "Business Plan (Yearly)", plan: "business", cycle: "yearly", interval: "year", price: 63516, credits: 4300, imgKey: "plan_business" },
    ];

    for (const sub of subscriptions) {
      const product = await createProduct({
        name: sub.name,
        description: `${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} ${sub.cycle} subscription. ${sub.credits} credits/month.`,
        recurring_interval: sub.interval,
        prices: [{ amount_type: "fixed", price_amount: sub.price, price_currency: "usd" }],
        metadata: { type: "subscription", plan: sub.plan, cycle: sub.cycle, credits_per_month: String(sub.credits) },
      }, sub.imgKey);

      results.subscriptions.push({
        name: sub.name,
        product_id: product.id,
        price_id: product.prices?.[0]?.id,
        plan: sub.plan,
        cycle: sub.cycle,
      });
    }

    logStep("All 26+ products created successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "All Polar products created with images. credit_packages table updated.",
      summary: {
        credit_products: results.credit_products.length,
        subscriptions: results.subscriptions.length,
        custom: results.custom ? 1 : 0,
        total: results.credit_products.length + results.subscriptions.length + (results.custom ? 1 : 0),
      },
      products: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

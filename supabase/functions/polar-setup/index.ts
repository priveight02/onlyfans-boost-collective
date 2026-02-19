import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_API = "https://api.polar.sh/v1";

const polarFetch = async (path: string, options: RequestInit = {}) => {
  const token = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!token) throw new Error("POLAR_ACCESS_TOKEN not set");
  const res = await fetch(`${POLAR_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
};

const logStep = (step: string, details?: any) => {
  console.log(`[POLAR-SETUP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) throw new Error("Admin access required");

    logStep("Admin verified, starting product creation");

    // Check for existing products to avoid duplicates
    const existingRes = await polarFetch("/products?limit=100");
    const existingProducts = await existingRes.json();
    const existingNames = new Set((existingProducts.items || []).map((p: any) => p.name));
    logStep("Existing products", { count: existingNames.size });

    const createProduct = async (data: any) => {
      if (existingNames.has(data.name)) {
        const existing = (existingProducts.items || []).find((p: any) => p.name === data.name);
        logStep("Product already exists, skipping", { name: data.name, id: existing?.id });
        return existing;
      }
      const res = await polarFetch("/products", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to create "${data.name}": ${errText}`);
      }
      const product = await res.json();
      logStep("Created product", { name: data.name, id: product.id });
      return product;
    };

    // Check for existing discounts
    const existingDiscountsRes = await polarFetch("/discounts?limit=100");
    const existingDiscounts = await existingDiscountsRes.json();
    const existingDiscountNames = new Set((existingDiscounts.items || []).map((d: any) => d.name));

    const createDiscount = async (data: any) => {
      if (existingDiscountNames.has(data.name)) {
        const existing = (existingDiscounts.items || []).find((d: any) => d.name === data.name);
        logStep("Discount already exists, skipping", { name: data.name, id: existing?.id });
        return existing;
      }
      const res = await polarFetch("/discounts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errText = await res.text();
        logStep("Warning: Failed to create discount", { name: data.name, error: errText });
        return null;
      }
      const discount = await res.json();
      logStep("Created discount", { name: data.name, id: discount.id });
      return discount;
    };

    const results: any = { credit_packages: {}, subscriptions: {}, custom_credits: null, discounts: {} };

    // ═══════════════════════════════════════════════════════
    // CREDIT PACKAGES (one-time) — 4 base packages
    // ═══════════════════════════════════════════════════════
    const creditPackages = [
      { name: "Starter Credits", credits: 350, bonus: 0, price: 900, desc: "350 credits for the Uplyze AI platform. Instant delivery, never expires. Access all basic AI tools and managed account features." },
      { name: "Pro Credits", credits: 1650, bonus: 350, price: 2900, desc: "1,650 credits + 350 bonus for the Uplyze AI platform. Instant delivery, never expires. Unlock advanced AI features and priority support." },
      { name: "Studio Credits", credits: 3300, bonus: 550, price: 4900, desc: "3,300 credits + 550 bonus for the Uplyze AI platform. Instant delivery, never expires. Full platform access with premium AI capabilities." },
      { name: "Power User Credits", credits: 11500, bonus: 2000, price: 14900, desc: "11,500 credits + 2,000 bonus for the Uplyze AI platform. Instant delivery, never expires. Our best value package with maximum credits." },
    ];

    for (const pkg of creditPackages) {
      const product = await createProduct({
        name: pkg.name,
        description: pkg.desc,
        prices: [{ amount_type: "fixed", price_amount: pkg.price, price_currency: "usd" }],
        metadata: { type: "credit_package", credits: String(pkg.credits), bonus_credits: String(pkg.bonus) },
      });
      results.credit_packages[pkg.name] = {
        product_id: product.id,
        price_id: product.prices?.[0]?.id,
        credits: pkg.credits,
        bonus: pkg.bonus,
        price: pkg.price,
      };

      // Update credit_packages table
      const { error: updateErr } = await supabaseAdmin
        .from("credit_packages")
        .update({
          stripe_product_id: product.id,
          stripe_price_id: product.prices?.[0]?.id || product.id,
        })
        .ilike("name", `%${pkg.name.split(" ")[0]}%`);
      if (updateErr) logStep("Warning: could not update credit_packages", { name: pkg.name, error: updateErr.message });
    }

    // Custom Credits product (used for ad-hoc pricing)
    const customProduct = await createProduct({
      name: "Custom Credits",
      description: "Custom credit package for the Uplyze AI platform. Choose your own amount with volume discounts up to 40%. Instant delivery, never expires.",
      prices: [{ amount_type: "custom", price_currency: "usd" }],
      metadata: { type: "custom_credits" },
    });
    results.custom_credits = { product_id: customProduct.id };

    // ═══════════════════════════════════════════════════════
    // SUBSCRIPTION PLANS (recurring)
    // ═══════════════════════════════════════════════════════
    const subscriptions = [
      { name: "Starter Plan (Monthly)", plan: "starter", cycle: "monthly", interval: "month", price: 900, credits: 215, desc: "Starter monthly subscription. 215 credits/month, platform access, basic AI tools, 1 managed account." },
      { name: "Starter Plan (Yearly)", plan: "starter", cycle: "yearly", interval: "year", price: 9180, credits: 215, desc: "Starter annual subscription. 215 credits/month, platform access, basic AI tools, 1 managed account. Save 15% vs monthly!" },
      { name: "Pro Plan (Monthly)", plan: "pro", cycle: "monthly", interval: "month", price: 2900, credits: 1075, desc: "Pro monthly subscription. 1,075 credits/month, advanced platform access, premium AI features, 5 managed accounts, priority support." },
      { name: "Pro Plan (Yearly)", plan: "pro", cycle: "yearly", interval: "year", price: 24360, credits: 1075, desc: "Pro annual subscription. 1,075 credits/month, advanced platform access, premium AI features, 5 managed accounts. Save 30% vs monthly!" },
      { name: "Business Plan (Monthly)", plan: "business", cycle: "monthly", interval: "month", price: 7900, credits: 4300, desc: "Business monthly subscription. 4,300 credits/month, full platform access, unlimited accounts, dedicated support, team workspace." },
      { name: "Business Plan (Yearly)", plan: "business", cycle: "yearly", interval: "year", price: 63516, credits: 4300, desc: "Business annual subscription. 4,300 credits/month, full platform access, unlimited accounts, dedicated support. Save 33% vs monthly!" },
    ];

    for (const sub of subscriptions) {
      const product = await createProduct({
        name: sub.name,
        description: sub.desc,
        recurring_interval: sub.interval,
        prices: [{ amount_type: "fixed", price_amount: sub.price, price_currency: "usd" }],
        metadata: { type: "subscription", plan: sub.plan, cycle: sub.cycle, credits_per_month: String(sub.credits) },
      });
      const key = `${sub.plan}_${sub.cycle}`;
      results.subscriptions[key] = {
        product_id: product.id,
        price_id: product.prices?.[0]?.id,
        plan: sub.plan,
        cycle: sub.cycle,
        price: sub.price,
        credits_per_month: sub.credits,
      };
    }

    // ═══════════════════════════════════════════════════════
    // DISCOUNTS — Loyalty, Retention, Yearly
    // ═══════════════════════════════════════════════════════
    const discountDefs = [
      // Loyalty discounts (declining: 1st repurchase=30%, 2nd=20%, 3rd=10%)
      { name: "Loyalty 30% — 1st Repurchase", type: "percentage", amount: 30, duration: "once", code: "LOYALTY30", metadata: { tier: "1", category: "loyalty" } },
      { name: "Loyalty 20% — 2nd Repurchase", type: "percentage", amount: 20, duration: "once", code: "LOYALTY20", metadata: { tier: "2", category: "loyalty" } },
      { name: "Loyalty 10% — 3rd Repurchase", type: "percentage", amount: 10, duration: "once", code: "LOYALTY10", metadata: { tier: "3", category: "loyalty" } },
      // Retention discount
      { name: "Retention 50% OFF", type: "percentage", amount: 50, duration: "once", code: "STAY50", metadata: { category: "retention" } },
      // Yearly subscription discounts (informational — actual savings baked into yearly price)
      { name: "Starter Yearly 15% OFF", type: "percentage", amount: 15, duration: "forever", code: "STARTYEARLY", metadata: { category: "yearly", plan: "starter" } },
      { name: "Pro Yearly 30% OFF", type: "percentage", amount: 30, duration: "forever", code: "PROYEARLY", metadata: { category: "yearly", plan: "pro" } },
      { name: "Business Yearly 33% OFF", type: "percentage", amount: 33, duration: "forever", code: "BIZYEARLY", metadata: { category: "yearly", plan: "business" } },
      // Volume discount tiers for custom credits
      { name: "Volume 5% — 500+ credits", type: "percentage", amount: 5, duration: "once", code: "VOL5", metadata: { category: "volume", min_credits: "500" } },
      { name: "Volume 10% — 1000+ credits", type: "percentage", amount: 10, duration: "once", code: "VOL10", metadata: { category: "volume", min_credits: "1000" } },
      { name: "Volume 15% — 3000+ credits", type: "percentage", amount: 15, duration: "once", code: "VOL15", metadata: { category: "volume", min_credits: "3000" } },
      { name: "Volume 20% — 5000+ credits", type: "percentage", amount: 20, duration: "once", code: "VOL20", metadata: { category: "volume", min_credits: "5000" } },
      { name: "Volume 25% — 8000+ credits", type: "percentage", amount: 25, duration: "once", code: "VOL25", metadata: { category: "volume", min_credits: "8000" } },
      { name: "Volume 30% — 12000+ credits", type: "percentage", amount: 30, duration: "once", code: "VOL30", metadata: { category: "volume", min_credits: "12000" } },
      { name: "Volume 35% — 20000+ credits", type: "percentage", amount: 35, duration: "once", code: "VOL35", metadata: { category: "volume", min_credits: "20000" } },
      { name: "Volume 40% — 50000+ credits", type: "percentage", amount: 40, duration: "once", code: "VOL40", metadata: { category: "volume", min_credits: "50000" } },
    ];

    for (const disc of discountDefs) {
      const discountBody: any = {
        name: disc.name,
        type: disc.type,
        amount: disc.amount,
        duration: disc.duration,
        code: disc.code,
        metadata: disc.metadata,
      };
      const discount = await createDiscount(discountBody);
      if (discount) {
        results.discounts[disc.name] = { id: discount.id, code: disc.code };
      }
    }

    logStep("All products and discounts created successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "All Polar products, subscriptions, and discounts created. credit_packages table updated.",
      summary: {
        credit_packages: Object.keys(results.credit_packages).length,
        subscriptions: Object.keys(results.subscriptions).length,
        discounts: Object.keys(results.discounts).length,
        custom_credits: results.custom_credits ? 1 : 0,
        total: Object.keys(results.credit_packages).length + Object.keys(results.subscriptions).length + Object.keys(results.discounts).length + (results.custom_credits ? 1 : 0),
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

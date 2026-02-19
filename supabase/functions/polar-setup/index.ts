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

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) throw new Error("Admin access required");

    logStep("Admin verified, starting product creation");

    // Check for existing products to avoid duplicates
    const existingRes = await polarFetch("/products?limit=50");
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

    const results: any = { credit_packages: {}, subscriptions: {}, custom_credits: null };

    // ═══════════════════════════════════════════════════════
    // CREDIT PACKAGES (one-time)
    // ═══════════════════════════════════════════════════════
    const creditPackages = [
      { name: "Starter Credits", credits: 350, bonus: 0, price: 900, desc: "350 credits for the Uplyze AI platform. Instant delivery, never expires. Access all basic AI tools and managed account features." },
      { name: "Pro Credits", credits: 1650, bonus: 350, price: 2900, desc: "1,650 credits + 350 bonus for the Uplyze AI platform. Instant delivery, never expires. Unlock advanced AI features and priority support." },
      { name: "Studio Credits", credits: 3300, bonus: 550, price: 4900, desc: "3,300 credits + 550 bonus for the Uplyze AI platform. Instant delivery, never expires. Full platform access with premium AI capabilities." },
      { name: "Power User Credits", credits: 8250, bonus: 1100, price: 14900, desc: "8,250 credits + 1,100 bonus for the Uplyze AI platform. Instant delivery, never expires. Our best value package with maximum credits." },
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
      { name: "Starter Plan (Yearly)", plan: "starter", cycle: "yearly", interval: "year", price: 10800, credits: 215, desc: "Starter annual subscription. 215 credits/month, platform access, basic AI tools, 1 managed account. Save 15% vs monthly!" },
      { name: "Pro Plan (Monthly)", plan: "pro", cycle: "monthly", interval: "month", price: 2900, credits: 1075, desc: "Pro monthly subscription. 1,075 credits/month, advanced platform access, premium AI features, 5 managed accounts, priority support." },
      { name: "Pro Plan (Yearly)", plan: "pro", cycle: "yearly", interval: "year", price: 34800, credits: 1075, desc: "Pro annual subscription. 1,075 credits/month, advanced platform access, premium AI features, 5 managed accounts. Save 30% vs monthly!" },
      { name: "Business Plan (Monthly)", plan: "business", cycle: "monthly", interval: "month", price: 7900, credits: 4300, desc: "Business monthly subscription. 4,300 credits/month, full platform access, unlimited accounts, dedicated support, team workspace." },
      { name: "Business Plan (Yearly)", plan: "business", cycle: "yearly", interval: "year", price: 94800, credits: 4300, desc: "Business annual subscription. 4,300 credits/month, full platform access, unlimited accounts, dedicated support. Save 33% vs monthly!" },
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

    logStep("All products created successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "All Polar products created and credit_packages updated",
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

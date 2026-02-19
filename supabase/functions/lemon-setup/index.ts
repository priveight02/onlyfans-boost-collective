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
  return fetch(`${POLAR_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
};

const log = (step: string, d?: any) => console.log(`[POLAR-SETUP] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// ═══════════════════════════════════════════════════════
// PRODUCT DEFINITIONS — exact replica of full catalog
// Products are created in the Polar dashboard, this function maps them
// ═══════════════════════════════════════════════════════

const CREDIT_PRODUCTS = [
  { name: "Starter Credits (350)", meta: { type: "credit_package", base_package: "starter", discount_tier: "none", tier: "starter", credits: "350", bonus: "0" } },
  { name: "Pro Credits (2,000)", meta: { type: "credit_package", base_package: "pro", discount_tier: "none", tier: "pro", credits: "1650", bonus: "350" } },
  { name: "Studio Credits (3,850)", meta: { type: "credit_package", base_package: "studio", discount_tier: "none", tier: "studio", credits: "3300", bonus: "550" } },
  { name: "Power User Credits (13,500)", meta: { type: "credit_package", base_package: "power", discount_tier: "none", tier: "power", credits: "11500", bonus: "2000" } },
];

const SUBSCRIPTION_PRODUCTS = [
  { name: "Starter Plan (Monthly)", meta: { type: "subscription", plan_id: "starter", cycle: "monthly", credits: "215" } },
  { name: "Starter Plan (Yearly)", meta: { type: "subscription", plan_id: "starter", cycle: "yearly", credits: "215" } },
  { name: "Pro Plan (Monthly)", meta: { type: "subscription", plan_id: "pro", cycle: "monthly", credits: "1075" } },
  { name: "Pro Plan (Yearly)", meta: { type: "subscription", plan_id: "pro", cycle: "yearly", credits: "1075" } },
  { name: "Business Plan (Monthly)", meta: { type: "subscription", plan_id: "business", cycle: "monthly", credits: "4300" } },
  { name: "Business Plan (Yearly)", meta: { type: "subscription", plan_id: "business", cycle: "yearly", credits: "4300" } },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify admin — supports JWT auth OR admin_password for setup calls
    const body = await req.json().catch(() => ({}));
    const adminPw = Deno.env.get("ADMIN_PASSWORD");
    if (body.admin_password && adminPw && body.admin_password === adminPw) {
      log("Admin verified via password");
    } else {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) throw new Error("No auth token");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (!userData.user) throw new Error("Not authenticated");
      const { data: roleData } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").single();
      if (!roleData) throw new Error("Admin access required");
      log("Admin verified via JWT");
    }

    const mode = body.mode || "map_only";

    // ═══════════════════════════════════════════════════════
    // 1. LIST & MAP POLAR PRODUCTS
    // ═══════════════════════════════════════════════════════
    const productsRes = await polarFetch("/products?limit=100");
    if (!productsRes.ok) throw new Error("Failed to fetch Polar products: " + await productsRes.text());
    const productsData = await productsRes.json();
    const products = productsData.items || [];
    log("Products fetched", { count: products.length });

    // Map credit packages to Polar products by metadata
    const mapped: any[] = [];
    const packageMap: Record<string, string[]> = {
      starter: ["starter credits", "starter"],
      pro: ["pro credits", "pro"],
      studio: ["studio credits", "studio"],
      power: ["power user credits", "power"],
    };

    for (const [key, targetPatterns] of Object.entries(packageMap)) {
      const product = products.find((p: any) => {
        const meta = p.metadata || {};
        if (meta.type === "credit_package" && meta.base_package === key && meta.discount_tier === "none") return true;
        const name = (p.name || "").toLowerCase();
        return targetPatterns.some(pattern => name.includes(pattern));
      });

      if (product) {
        const priceId = product.prices?.[0]?.id;
        const namePattern = key === "power" ? "Power" : key.charAt(0).toUpperCase() + key.slice(1);
        await supabaseAdmin.from("credit_packages").update({
          stripe_product_id: product.id,
          stripe_price_id: priceId || product.id,
        }).ilike("name", `%${namePattern}%`);
        mapped.push({ key, product_id: product.id, price_id: priceId, name: product.name });
        log("Mapped package", { key, product_id: product.id });
      }
    }

    // Build expected vs found
    const ALL_EXPECTED = [
      ...CREDIT_PRODUCTS.map(p => ({ name: p.name, type: "credit_package" })),
      ...SUBSCRIPTION_PRODUCTS.map(p => ({ name: p.name, type: "subscription" })),
      { name: "Custom Credits", type: "custom_credits" },
    ];

    const missing = ALL_EXPECTED.filter(
      (ep) => !products.find((p: any) => (p.name || "").toLowerCase().includes(ep.name.toLowerCase().split("(")[0].trim().toLowerCase()))
    );

    return new Response(JSON.stringify({
      success: true,
      provider: "Polar",
      existing_products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        metadata: p.metadata,
        prices: (p.prices || []).map((pr: any) => ({ id: pr.id, amount: pr.price_amount, currency: pr.price_currency, recurring: pr.recurring_interval })),
      })),
      mapped_to_credit_packages: mapped,
      missing_products: missing,
      total_expected: ALL_EXPECTED.length,
      instructions: missing.length > 0
        ? `Create these ${missing.length} products in the Polar dashboard, then re-run with mode=map_only.`
        : "All products found and mapped!",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

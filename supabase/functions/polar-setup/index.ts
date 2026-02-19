import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_API = "https://api.polar.sh/v1";

const logStep = (step: string, details?: any) => {
  console.log(`[POLAR-SETUP] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Product image URLs (from existing Supabase storage)
const STORAGE_BASE = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/product-images";

// ═══════════════ PRODUCT DEFINITIONS ═══════════════

const CREDIT_PACKAGES = [
  {
    name: "Starter Credits",
    description: "350 credits — Perfect for trying out the platform. Access all core features with instant delivery. Credits never expire.",
    price_amount: 900, // $9.00
    credits: 350,
    bonus_credits: 0,
    is_popular: false,
    sort_order: 1,
    image: `${STORAGE_BASE}/credits-starter.png`,
  },
  {
    name: "Pro Credits",
    description: "1,650 credits + 350 bonus — Best for regular users. Unlock advanced platform features with instant delivery. Credits never expire.",
    price_amount: 2900, // $29.00
    credits: 1650,
    bonus_credits: 350,
    is_popular: true,
    sort_order: 2,
    image: `${STORAGE_BASE}/img-pro-base.png`,
  },
  {
    name: "Studio Credits",
    description: "3,300 credits + 550 bonus — Ideal for power creators. Full platform access with instant delivery. Credits never expire.",
    price_amount: 4900, // $49.00
    credits: 3300,
    bonus_credits: 550,
    is_popular: false,
    sort_order: 3,
    image: `${STORAGE_BASE}/img-studio-base.png`,
  },
  {
    name: "Power User Credits",
    description: "11,500 credits + 2,000 bonus — Maximum value for agencies. Full platform access with instant delivery. Credits never expire.",
    price_amount: 14900, // $149.00
    credits: 11500,
    bonus_credits: 2000,
    is_popular: false,
    sort_order: 4,
    image: `${STORAGE_BASE}/img-power-base.png`,
  },
];

const SUBSCRIPTION_PLANS = [
  {
    name: "Starter Plan (Monthly)",
    description: "215 credits/month — Essential plan for individuals. Access core CRM features, AI tools, and social management.",
    price_amount: 900, // $9/mo
    interval: "month",
    plan_id: "starter",
    credits_per_month: 215,
    image: `${STORAGE_BASE}/plan-starter-coins.png`,
  },
  {
    name: "Starter Plan (Yearly)",
    description: "215 credits/month — Essential plan billed yearly. Save 15% compared to monthly billing.",
    price_amount: 9180, // $91.80/yr (15% off $108)
    interval: "year",
    plan_id: "starter",
    credits_per_month: 215,
    image: `${STORAGE_BASE}/plan-starter-coins.png`,
  },
  {
    name: "Pro Plan (Monthly)",
    description: "1,075 credits/month — Professional plan for growing teams. Advanced AI, full CRM, social automation.",
    price_amount: 2900, // $29/mo
    interval: "month",
    plan_id: "pro",
    credits_per_month: 1075,
    image: `${STORAGE_BASE}/plan-pro-coins-fixed.png`,
  },
  {
    name: "Pro Plan (Yearly)",
    description: "1,075 credits/month — Professional plan billed yearly. Save 30% compared to monthly billing.",
    price_amount: 24360, // $243.60/yr (30% off $348)
    interval: "year",
    plan_id: "pro",
    credits_per_month: 1075,
    image: `${STORAGE_BASE}/plan-pro-coins-fixed.png`,
  },
  {
    name: "Business Plan (Monthly)",
    description: "4,300 credits/month — Enterprise-grade plan for agencies. Unlimited AI, team management, priority support.",
    price_amount: 7900, // $79/mo
    interval: "month",
    plan_id: "business",
    credits_per_month: 4300,
    image: `${STORAGE_BASE}/plan-business-coins.png`,
  },
  {
    name: "Business Plan (Yearly)",
    description: "4,300 credits/month — Enterprise plan billed yearly. Save 33% compared to monthly billing.",
    price_amount: 63516, // $635.16/yr (33% off $948)
    interval: "year",
    plan_id: "business",
    credits_per_month: 4300,
    image: `${STORAGE_BASE}/plan-business-coins.png`,
  },
];

// ═══════════════ DISCOUNT DEFINITIONS ═══════════════
const DISCOUNTS = [
  { name: "Loyalty 10% Off", percent_off: 10, duration: "once", code: "LOYALTY10" },
  { name: "Loyalty 20% Off", percent_off: 20, duration: "once", code: "LOYALTY20" },
  { name: "Loyalty 30% Off", percent_off: 30, duration: "once", code: "LOYALTY30" },
  { name: "Retention 50% Off", percent_off: 50, duration: "once", code: "RETENTION50" },
  { name: "Yearly Starter 15%", percent_off: 15, duration: "forever", code: "YEARLY_STARTER" },
  { name: "Yearly Pro 30%", percent_off: 30, duration: "forever", code: "YEARLY_PRO" },
  { name: "Yearly Business 33%", percent_off: 33, duration: "forever", code: "YEARLY_BUSINESS" },
];

async function polarFetch(path: string, method: string, body?: any) {
  const token = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!token) throw new Error("POLAR_ACCESS_TOKEN not set");

  const res = await fetch(`${POLAR_API}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    logStep("API Error", { path, status: res.status, body: data });
    throw new Error(`Polar API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Admin-only: verify caller is admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Accept admin password in body or Authorization header for admin users
    const body = await req.json().catch(() => ({}));
    const adminPwd = body.admin_password;
    const storedPwd = Deno.env.get("ADMIN_PASSWORD");
    
    let authorized = false;
    if (adminPwd && storedPwd && adminPwd === storedPwd) {
      logStep("Admin verified via password");
      authorized = true;
    } else {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (token) {
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) {
          const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userData.user.id });
          if (isAdmin) authorized = true;
        }
      }
    }
    if (!authorized) throw new Error("Admin access required");

    logStep("Admin verified, starting Polar setup");

    const results: any = {
      credit_packages: [],
      subscription_plans: [],
      discounts: [],
    };

    // ═══════════════ CREATE CREDIT PACKAGES (one-time) ═══════════════
    for (const pkg of CREDIT_PACKAGES) {
      logStep("Creating credit package", { name: pkg.name });

      const product = await polarFetch("/products/", "POST", {
        name: pkg.name,
        description: pkg.description,
        prices: [
          {
            type: "one_time",
            amount_type: "fixed",
            price_amount: pkg.price_amount,
            price_currency: "usd",
          },
        ],
        medias: [], // Images must be uploaded via Polar dashboard or media API
      });

      results.credit_packages.push({
        name: pkg.name,
        credits: pkg.credits,
        bonus_credits: pkg.bonus_credits,
        price_cents: pkg.price_amount,
        polar_product_id: product.id,
        polar_price_id: product.prices?.[0]?.id || null,
        is_popular: pkg.is_popular,
        sort_order: pkg.sort_order,
      });

      logStep("Created credit package", { name: pkg.name, productId: product.id });
    }

    // ═══════════════ CREATE SUBSCRIPTION PLANS (recurring) ═══════════════
    for (const plan of SUBSCRIPTION_PLANS) {
      logStep("Creating subscription plan", { name: plan.name });

      const product = await polarFetch("/products/", "POST", {
        name: plan.name,
        description: plan.description,
        prices: [
          {
            type: "recurring",
            amount_type: "fixed",
            price_amount: plan.price_amount,
            price_currency: "usd",
            recurring_interval: plan.interval,
          },
        ],
        medias: [],
      });

      results.subscription_plans.push({
        name: plan.name,
        plan_id: plan.plan_id,
        interval: plan.interval,
        price_cents: plan.price_amount,
        credits_per_month: plan.credits_per_month,
        polar_product_id: product.id,
        polar_price_id: product.prices?.[0]?.id || null,
      });

      logStep("Created subscription plan", { name: plan.name, productId: product.id });
    }

    // ═══════════════ CREATE DISCOUNTS ═══════════════
    for (const disc of DISCOUNTS) {
      logStep("Creating discount", { name: disc.name });

      try {
        const discount = await polarFetch("/discounts/", "POST", {
          name: disc.name,
          type: "percentage",
          amount: disc.percent_off,
          duration: disc.duration === "once" ? "once" : "forever",
          code: disc.code,
        });

        results.discounts.push({
          name: disc.name,
          code: disc.code,
          percent_off: disc.percent_off,
          duration: disc.duration,
          polar_discount_id: discount.id,
        });

        logStep("Created discount", { name: disc.name, discountId: discount.id });
      } catch (err) {
        logStep("Discount creation failed (may already exist)", { name: disc.name, error: String(err) });
        results.discounts.push({
          name: disc.name,
          code: disc.code,
          error: String(err),
        });
      }
    }

    logStep("Polar setup complete!", {
      packages: results.credit_packages.length,
      plans: results.subscription_plans.length,
      discounts: results.discounts.length,
    });

    return new Response(JSON.stringify(results), {
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

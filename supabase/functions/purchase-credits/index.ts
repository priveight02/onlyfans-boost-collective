import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PADDLE_API = "https://sandbox-api.paddle.com";

const logStep = (step: string, details?: any) => {
  console.log(`[PURCHASE-CREDITS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const BASE_PRICE_PER_CREDIT_CENTS = 9.99;

const getVolumeDiscount = (credits: number): number => {
  if (credits >= 10000) return 0.40;
  if (credits >= 5000) return 0.35;
  if (credits >= 3000) return 0.30;
  if (credits >= 2000) return 0.25;
  if (credits >= 1000) return 0.20;
  if (credits >= 500) return 0.15;
  if (credits >= 200) return 0.10;
  if (credits >= 100) return 0.05;
  return 0;
};

// Paddle credit package price IDs (sandbox)
const PACKAGE_PADDLE_PRICES: Record<string, string> = {};

// Loyalty discount IDs
const LOYALTY_DISCOUNT_IDS: Record<number, string> = {
  30: "dsc_01khk8886fe149mne29t65m72a",
  20: "dsc_01khk888b813pqhjscfv7vdb1y",
  10: "dsc_01khk888frw8k5akhkkzkw4nv5",
};

const RETENTION_DISCOUNT_ID = "dsc_01khk888kz0h5mk2v2cq8gw60m";

const paddleFetch = async (path: string, method: string, body?: any) => {
  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) throw new Error("PADDLE_API_KEY not set");
  const res = await fetch(`${PADDLE_API}${path}`, {
    method,
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Paddle API error [${res.status}]: ${JSON.stringify(data)}`);
  return data;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { packageId, customCredits, useRetentionDiscount } = body;

    // Get wallet info for loyalty discount
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("purchase_count, retention_credits_used")
      .eq("user_id", user.id)
      .single();
    const currentPurchaseCount = wallet?.purchase_count || 0;
    const retentionAlreadyUsed = wallet?.retention_credits_used || false;

    const getReturningDiscount = (count: number): number => {
      if (count === 1) return 30;
      if (count === 2) return 20;
      if (count === 3) return 10;
      return 0;
    };
    const returningDiscountPercent = getReturningDiscount(currentPurchaseCount);

    // Look up Paddle customer
    let customerId: string | null = null;
    try {
      const customers = await paddleFetch(`/customers?search=${encodeURIComponent(user.email)}`, "GET");
      if (customers.data?.length > 0) customerId = customers.data[0].id;
    } catch {}

    // Determine discount to apply
    let discountId: string | null = null;
    if (useRetentionDiscount && !retentionAlreadyUsed) {
      discountId = RETENTION_DISCOUNT_ID;
      await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
      logStep("Using retention 50% discount");
    } else if (useRetentionDiscount && retentionAlreadyUsed) {
      throw new Error("Retention discount already used. This is a one-time offer.");
    } else if (returningDiscountPercent > 0 && LOYALTY_DISCOUNT_IDS[returningDiscountPercent]) {
      discountId = LOYALTY_DISCOUNT_IDS[returningDiscountPercent];
      logStep(`Using loyalty ${returningDiscountPercent}% discount`);
    }

    // --- CUSTOM CREDITS MODE ---
    if (customCredits && typeof customCredits === "number" && customCredits >= 10) {
      logStep("Custom credits mode", { customCredits });

      const volumeDiscount = getVolumeDiscount(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscount);
      let totalCents = Math.round(customCredits * pricePerCredit);

      // Apply returning discount
      if (returningDiscountPercent > 0 && !useRetentionDiscount) {
        totalCents = Math.round(totalCents * (1 - returningDiscountPercent / 100));
      }

      logStep("Custom price calculated", { totalCents, volumeDiscount });

      // Create ad-hoc product + price on Paddle
      const product = await paddleFetch("/products", "POST", {
        name: `${customCredits.toLocaleString()} Credits`,
        description: `Custom credit purchase${volumeDiscount > 0 ? ` (${Math.round(volumeDiscount * 100)}% vol.)` : ''}`,
        tax_category: "standard",
      });

      const price = await paddleFetch("/prices", "POST", {
        product_id: product.data.id,
        description: `${customCredits} credits`,
        unit_price: { amount: String(totalCents), currency_code: "USD" },
        quantity: { minimum: 1, maximum: 1 },
      });

      // Return checkout info for Paddle.js
      return new Response(JSON.stringify({
        checkout: true,
        priceId: price.data.id,
        customerId,
        customerEmail: user.email,
        metadata: {
          user_id: user.id,
          package_id: "custom",
          credits: String(customCredits),
          bonus_credits: "0",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- PACKAGE MODE ---
    if (!packageId) throw new Error("Package ID or customCredits required");

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();
    if (pkgError || !pkg) throw new Error("Invalid package");
    logStep("Package found", { name: pkg.name, credits: pkg.credits });

    // Find or use Paddle price for this package
    // We need the paddle_price_id stored on the package or mapped
    let paddlePriceId = PACKAGE_PADDLE_PRICES[pkg.stripe_price_id] || null;

    // If no mapped price, create one on-the-fly
    if (!paddlePriceId) {
      // Look for existing Paddle product for this package by name
      const products = await paddleFetch(`/products?name=${encodeURIComponent(pkg.name)}`, "GET");
      let productId: string;
      if (products.data?.length > 0) {
        productId = products.data[0].id;
        // Check existing prices
        const prices = await paddleFetch(`/prices?product_id=${productId}&status=active`, "GET");
        if (prices.data?.length > 0) {
          paddlePriceId = prices.data[0].id;
        }
      }

      if (!paddlePriceId) {
        // Create product + price
        const newProduct = await paddleFetch("/products", "POST", {
          name: pkg.name,
          description: `${pkg.credits} credits${pkg.bonus_credits > 0 ? ` + ${pkg.bonus_credits} bonus` : ''}`,
          tax_category: "standard",
        });
        productId = newProduct.data.id;

        const newPrice = await paddleFetch("/prices", "POST", {
          product_id: productId,
          description: `${pkg.name} - ${pkg.credits} credits`,
          unit_price: { amount: String(pkg.price_cents), currency_code: "USD" },
          quantity: { minimum: 1, maximum: 1 },
        });
        paddlePriceId = newPrice.data.id;
      }
    }

    logStep("Using Paddle price", { paddlePriceId, discount: discountId });

    return new Response(JSON.stringify({
      checkout: true,
      priceId: paddlePriceId,
      discountId,
      customerId,
      customerEmail: user.email,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        bonus_credits: String(pkg.bonus_credits),
      },
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

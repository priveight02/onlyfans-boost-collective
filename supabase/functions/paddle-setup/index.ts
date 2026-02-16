import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PADDLE_API = "https://sandbox-api.paddle.com";

const paddleFetch = async (path: string, method: string, body?: any) => {
  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) throw new Error("PADDLE_API_KEY not set");
  const res = await fetch(`${PADDLE_API}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Paddle API error: ${JSON.stringify(data)}`);
  return data;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const results: any = { products: {}, prices: {} };

    // ─── SUBSCRIPTION PRODUCTS ───
    const subPlans = [
      { name: "Starter Plan", description: "215 credits/month. CRM Access, Basic AI tools, 1 managed account." },
      { name: "Pro Plan", description: "1,075 credits/month. Advanced CRM, Premium AI, 5 managed accounts, Priority support." },
      { name: "Business Plan", description: "4,300 credits/month. Full CRM, Unlimited accounts, Team workspace, API access." },
    ];

    for (const plan of subPlans) {
      const product = await paddleFetch("/products", "POST", {
        name: plan.name,
        description: plan.description,
        tax_category: "standard",
      });
      const productId = product.data.id;
      results.products[plan.name] = productId;
    }

    // ─── SUBSCRIPTION PRICES ───
    const planPrices = [
      // Starter
      { product: "Starter Plan", interval: "month", amount: "900", desc: "Starter Monthly" },
      { product: "Starter Plan", interval: "year", amount: "9180", desc: "Starter Yearly" },
      // Pro
      { product: "Pro Plan", interval: "month", amount: "2900", desc: "Pro Monthly" },
      { product: "Pro Plan", interval: "year", amount: "24360", desc: "Pro Yearly" },
      // Business
      { product: "Business Plan", interval: "month", amount: "7900", desc: "Business Monthly" },
      { product: "Business Plan", interval: "year", amount: "63480", desc: "Business Yearly" },
    ];

    for (const pp of planPrices) {
      const price = await paddleFetch("/prices", "POST", {
        product_id: results.products[pp.product],
        description: pp.desc,
        unit_price: { amount: pp.amount, currency_code: "USD" },
        billing_cycle: { interval: pp.interval, frequency: 1 },
        quantity: { minimum: 1, maximum: 1 },
      });
      results.prices[pp.desc] = price.data.id;
    }

    // ─── CREDIT PACKAGE PRODUCTS ───
    const creditPackages = [
      { name: "Starter Credits", desc: "350 credits one-time", amount: "1499" },
      { name: "Pro Credits", desc: "1,650 credits one-time", amount: "4999" },
      { name: "Studio Credits", desc: "3,300 credits one-time", amount: "7999" },
      { name: "Power User Credits", desc: "8,250 credits one-time", amount: "14999" },
    ];

    for (const cp of creditPackages) {
      const product = await paddleFetch("/products", "POST", {
        name: cp.name,
        description: cp.desc,
        tax_category: "standard",
      });
      const productId = product.data.id;
      results.products[cp.name] = productId;

      // One-time price (no billing_cycle)
      const price = await paddleFetch("/prices", "POST", {
        product_id: productId,
        description: cp.desc,
        unit_price: { amount: cp.amount, currency_code: "USD" },
        quantity: { minimum: 1, maximum: 1 },
      });
      results.prices[cp.name] = price.data.id;
    }

    // ─── DISCOUNT CODES ───
    // Loyalty discounts: 30%, 20%, 10%
    for (const pct of [30, 20, 10]) {
      const discount = await paddleFetch("/discounts", "POST", {
        description: `Loyalty ${pct}% discount`,
        type: "percentage",
        amount: String(pct),
        recur: false,
        enabled_for_checkout: true,
        code: `LOYALTY${pct}`,
      });
      results.prices[`loyalty_${pct}`] = discount.data.id;
    }

    // Retention 50% discount
    const retention = await paddleFetch("/discounts", "POST", {
      description: "Retention 50% discount",
      type: "percentage",
      amount: "50",
      recur: true,
      enabled_for_checkout: true,
      code: "RETENTION50",
    });
    results.prices["retention_50"] = retention.data.id;

    return new Response(JSON.stringify({
      success: true,
      message: "All Paddle products, prices, and discounts created. Save these IDs!",
      ...results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

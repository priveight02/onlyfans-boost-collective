import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  const IMAGE_URL = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/product-images/credits-power-11500.png";
  const BASE_PRICE = 14900; // $149

  try {
    // Update the base product image
    const baseProductId = "prod_TzSabH9OcdjKhh";
    await stripe.products.update(baseProductId, { images: [IMAGE_URL] });

    // Create 10% loyalty product + price
    const prod10 = await stripe.products.create({
      name: "Power User Credits (11500) - 10% Loyalty",
      images: [IMAGE_URL],
      metadata: { type: "power_user_loyalty_10", credits: "11500" },
    });
    const price10 = await stripe.prices.create({
      product: prod10.id,
      unit_amount: Math.round(BASE_PRICE * 0.90),
      currency: "usd",
    });

    // Create 20% loyalty product + price
    const prod20 = await stripe.products.create({
      name: "Power User Credits (11500) - 20% Loyalty",
      images: [IMAGE_URL],
      metadata: { type: "power_user_loyalty_20", credits: "11500" },
    });
    const price20 = await stripe.prices.create({
      product: prod20.id,
      unit_amount: Math.round(BASE_PRICE * 0.80),
      currency: "usd",
    });

    // Create 30% loyalty product + price
    const prod30 = await stripe.products.create({
      name: "Power User Credits (11500) - 30% Loyalty",
      images: [IMAGE_URL],
      metadata: { type: "power_user_loyalty_30", credits: "11500" },
    });
    const price30 = await stripe.prices.create({
      product: prod30.id,
      unit_amount: Math.round(BASE_PRICE * 0.70),
      currency: "usd",
    });

    // Create 50% retention product + price
    const prodRet = await stripe.products.create({
      name: "Power User Credits (11500) - 50% Retention",
      images: [IMAGE_URL],
      metadata: { type: "power_user_retention_50", credits: "11500" },
    });
    const priceRet = await stripe.prices.create({
      product: prodRet.id,
      unit_amount: Math.round(BASE_PRICE * 0.50),
      currency: "usd",
    });

    const result = {
      base: { product: baseProductId, price: "price_1T1TfYAMkMnyWeZ5ayGfBsrr" },
      loyalty_10: { product: prod10.id, price: price10.id },
      loyalty_20: { product: prod20.id, price: price20.id },
      loyalty_30: { product: prod30.id, price: price30.id },
      retention_50: { product: prodRet.id, price: priceRet.id },
    };

    console.log("POWER USER SETUP RESULT:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

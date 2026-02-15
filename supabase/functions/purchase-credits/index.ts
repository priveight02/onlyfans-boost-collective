import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PURCHASE-CREDITS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Base price per credit in cents
const BASE_PRICE_PER_CREDIT_CENTS = 9.99;

// Volume discount tiers (max 20%)
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
    const { packageId, customCredits } = body;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let isReturningCustomer = false;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const charges = await stripe.charges.list({ customer: customerId, limit: 1 });
      isReturningCustomer = charges.data.length > 0;
    }

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("purchase_count")
      .eq("user_id", user.id)
      .single();
    if (wallet && wallet.purchase_count > 0) isReturningCustomer = true;

    const origin = req.headers.get("origin") || "https://ozcagency.com";

    // --- CUSTOM CREDITS MODE ---
    if (customCredits && typeof customCredits === "number" && customCredits >= 50) {
      logStep("Custom credits mode", { customCredits });

      const discount = getVolumeDiscount(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - discount);
      const totalCents = Math.round(customCredits * pricePerCredit);

      logStep("Price calculated", { discount: `${Math.round(discount * 100)}%`, totalCents, pricePerCredit });

      // Create a dynamic Stripe price for this custom amount
      const product = await stripe.products.create({
        name: `${customCredits.toLocaleString()} Credits${discount > 0 ? ` (${Math.round(discount * 100)}% volume discount)` : ''}`,
        metadata: { type: 'custom_credits', credits: String(customCredits) },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: totalCents,
        currency: 'usd',
      });

      let discounts: any[] = [];
      if (isReturningCustomer) {
        logStep("Returning customer - applying 30% discount on custom");
        const coupon = await stripe.coupons.create({
          percent_off: 30,
          duration: "once",
          name: "Returning Customer 30% Off",
        });
        discounts = [{ coupon: coupon.id }];
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        discounts,
        success_url: `${origin}/pricing?success=true&credits=${customCredits}`,
        cancel_url: `${origin}/pricing?canceled=true`,
        metadata: {
          user_id: user.id,
          package_id: "custom",
          credits: String(customCredits),
          bonus_credits: "0",
          is_returning: String(isReturningCustomer),
        },
      });

      logStep("Custom checkout session created", { sessionId: session.id });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
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
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    let discounts: any[] = [];
    if (isReturningCustomer) {
      logStep("Returning customer - applying 30% discount");
      const coupon = await stripe.coupons.create({
        percent_off: 30,
        duration: "once",
        name: "Returning Customer 30% Off",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pkg.stripe_price_id, quantity: 1 }],
      mode: "payment",
      discounts,
      success_url: `${origin}/pricing?success=true&credits=${pkg.credits + pkg.bonus_credits}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        bonus_credits: String(pkg.bonus_credits),
        is_returning: String(isReturningCustomer),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, discount: isReturningCustomer });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

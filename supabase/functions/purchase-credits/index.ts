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

    const { packageId } = await req.json();
    if (!packageId) throw new Error("Package ID required");

    // Fetch the credit package
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();
    if (pkgError || !pkg) throw new Error("Invalid package");
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let isReturningCustomer = false;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      // Check if this customer has previous successful payments (returning customer)
      const charges = await stripe.charges.list({ customer: customerId, limit: 1 });
      isReturningCustomer = charges.data.length > 0;
      logStep("Customer found", { customerId, isReturningCustomer });
    }

    // Also check wallet purchase_count as backup
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("purchase_count")
      .eq("user_id", user.id)
      .single();
    if (wallet && wallet.purchase_count > 0) isReturningCustomer = true;

    let discounts: any[] = [];
    if (isReturningCustomer) {
      // Create a 30% off coupon for returning customers
      logStep("Returning customer - applying 30% discount");
      const coupon = await stripe.coupons.create({
        percent_off: 30,
        duration: "once",
        name: "Returning Customer 30% Off",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const origin = req.headers.get("origin") || "https://ozcagency.com";

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

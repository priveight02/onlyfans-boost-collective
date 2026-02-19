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

const logStep = (step: string, details?: any) => {
  console.log(`[PURCHASE-CREDITS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const BASE_PRICE_PER_CREDIT_CENTS = 1.816;

const getVolumeDiscount = (credits: number): number => {
  if (credits >= 100000) return 0.40;
  if (credits >= 75000) return 0.35;
  if (credits >= 50000) return 0.30;
  if (credits >= 30000) return 0.25;
  if (credits >= 20000) return 0.20;
  if (credits >= 15000) return 0.15;
  if (credits >= 10000) return 0.05;
  return 0;
};

// Fetch matching Polar discount by code
const findDiscountByCode = async (code: string): Promise<string | null> => {
  try {
    const res = await polarFetch(`/discounts?limit=50`);
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.items || []).find((d: any) => d.code?.toLowerCase() === code.toLowerCase());
    return match?.id || null;
  } catch { return null; }
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

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("purchase_count, retention_credits_used")
      .eq("user_id", user.id)
      .single();
    const currentPurchaseCount = wallet?.purchase_count || 0;
    const retentionAlreadyUsed = wallet?.retention_credits_used || false;

    // Declining discount: 1st repurchase=30%, 2nd=20%, 3rd=10%, then 0%
    const getReturningDiscount = (count: number): number => {
      if (count === 1) return 30;
      if (count === 2) return 20;
      if (count === 3) return 10;
      return 0;
    };
    const returningDiscountPercent = getReturningDiscount(currentPurchaseCount);

    const origin = req.headers.get("origin") || "https://uplyze.ai";

    // --- CUSTOM CREDITS MODE ---
    if (customCredits && typeof customCredits === "number" && customCredits >= 500) {
      logStep("Custom credits mode", { customCredits });

      // Find the Custom Credits product on Polar
      const productsRes = await polarFetch("/products?limit=50");
      const productsData = await productsRes.json();
      const customProduct = (productsData.items || []).find(
        (p: any) => p.metadata?.type === "custom_credits"
      );
      if (!customProduct) throw new Error("Custom Credits product not found on Polar. Run polar-setup first.");

      const volumeDiscount = getVolumeDiscount(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscount);
      let totalCents = Math.round(customCredits * pricePerCredit);

      // Apply returning discount on top
      if (returningDiscountPercent > 0) {
        totalCents = Math.round(totalCents * (1 - returningDiscountPercent / 100));
      }

      // Apply retention discount if requested
      let customRetentionUsed = false;
      if (useRetentionDiscount && !retentionAlreadyUsed) {
        totalCents = Math.round(totalCents * 0.5);
        customRetentionUsed = true;
        await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
        logStep("Applied retention 50% discount");
      } else if (useRetentionDiscount && retentionAlreadyUsed) {
        throw new Error("Retention discount already used.");
      }

      logStep("Price calculated", { totalCents, volumeDiscount, returningDiscount: returningDiscountPercent });

      // Build metadata - omit empty strings (Polar rejects them)
      const customMeta: Record<string, string> = {
        user_id: user.id,
        package_id: "custom",
        credits: String(customCredits),
        bonus_credits: "0",
        is_returning: String(returningDiscountPercent > 0),
        volume_discount: String(Math.round(volumeDiscount * 100)),
        retention_used: String(customRetentionUsed),
      };

      // Build checkout body
      const checkoutBody: any = {
        products: [customProduct.id],
        prices: {
          [customProduct.id]: [{
            amount_type: "fixed",
            price_amount: totalCents,
            price_currency: "usd",
          }],
        },
        customer_email: user.email,
        external_customer_id: user.id,
        embed_origin: origin,
        metadata: customMeta,
      };

      // Attach Polar discount if applicable
      if (useRetentionDiscount) {
        const discountId = await findDiscountByCode("STAY50");
        if (discountId) checkoutBody.discount_id = discountId;
      } else if (returningDiscountPercent === 30) {
        const discountId = await findDiscountByCode("LOYALTY30");
        if (discountId) checkoutBody.discount_id = discountId;
      } else if (returningDiscountPercent === 20) {
        const discountId = await findDiscountByCode("LOYALTY20");
        if (discountId) checkoutBody.discount_id = discountId;
      } else if (returningDiscountPercent === 10) {
        const discountId = await findDiscountByCode("LOYALTY10");
        if (discountId) checkoutBody.discount_id = discountId;
      }

      const checkoutRes = await polarFetch("/checkouts", {
        method: "POST",
        body: JSON.stringify(checkoutBody),
      });

      if (!checkoutRes.ok) {
        const errText = await checkoutRes.text();
        throw new Error(`Polar checkout failed: ${errText}`);
      }

      const checkout = await checkoutRes.json();
      logStep("Custom checkout created", { checkoutId: checkout.id });

      return new Response(JSON.stringify({ checkoutUrl: checkout.url }), {
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
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    // stripe_product_id now contains Polar product ID
    const polarProductId = pkg.stripe_product_id;
    if (!polarProductId) throw new Error("Polar product ID not set. Run polar-setup first.");

    // Calculate discounted price for ad-hoc pricing
    let finalPrice = pkg.price_cents;
    let usedRetention = false;
    let appliedDiscountCode: string | null = null;

    if (useRetentionDiscount && !retentionAlreadyUsed) {
      finalPrice = Math.round(finalPrice * 0.5);
      usedRetention = true;
      appliedDiscountCode = "STAY50";
      await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
      logStep("Applied retention 50% discount");
    } else if (useRetentionDiscount && retentionAlreadyUsed) {
      throw new Error("Retention discount already used.");
    } else if (returningDiscountPercent > 0) {
      finalPrice = Math.round(finalPrice * (1 - returningDiscountPercent / 100));
      appliedDiscountCode = returningDiscountPercent === 30 ? "LOYALTY30" : returningDiscountPercent === 20 ? "LOYALTY20" : "LOYALTY10";
      logStep("Applied loyalty discount", { percent: returningDiscountPercent });
    }

    // Build checkout request
    const checkoutBody: any = {
      products: [polarProductId],
      customer_email: user.email,
      external_customer_id: user.id,
      embed_origin: origin,
      metadata: Object.fromEntries(
        Object.entries({
          user_id: user.id,
          package_id: pkg.id,
          credits: String(pkg.credits),
          bonus_credits: String(pkg.bonus_credits),
          is_returning: String(returningDiscountPercent > 0),
          discount_code: appliedDiscountCode || undefined,
          retention_used: String(usedRetention),
        }).filter(([_, v]) => v !== undefined && v !== "")
      ),
    };

    // Use ad-hoc pricing if discount applied
    if (finalPrice !== pkg.price_cents) {
      checkoutBody.prices = {
        [polarProductId]: [{
          amount_type: "fixed",
          price_amount: finalPrice,
          price_currency: "usd",
        }],
      };
    }

    // Attach Polar discount object if available
    if (appliedDiscountCode) {
      const discountId = await findDiscountByCode(appliedDiscountCode);
      if (discountId) checkoutBody.discount_id = discountId;
    }

    const checkoutRes = await polarFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify(checkoutBody),
    });

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      throw new Error(`Polar checkout failed: ${errText}`);
    }

    const checkout = await checkoutRes.json();
    logStep("Checkout created", { checkoutId: checkout.id });

    return new Response(JSON.stringify({ checkoutUrl: checkout.url }), {
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

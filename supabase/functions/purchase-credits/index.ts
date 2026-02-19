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

// Map purchase count to discount tier metadata key (ascending loyalty)
const getDiscountTier = (purchaseCount: number, useRetention: boolean): string => {
  if (useRetention) return "retention_50";
  if (purchaseCount >= 3) return "loyalty_30";
  if (purchaseCount >= 2) return "loyalty_20";
  if (purchaseCount >= 1) return "loyalty_10";
  return "none";
};

// Map purchase count to returning discount % (ascending loyalty)
const getReturningDiscount = (count: number): number => {
  if (count >= 3) return 30;
  if (count >= 2) return 20;
  if (count >= 1) return 10;
  return 0;
};

// Find the correct product variant from Polar catalog
const findProductVariant = async (basePackageKey: string, discountTier: string): Promise<any | null> => {
  const res = await polarFetch("/products?limit=100");
  if (!res.ok) return null;
  const data = await res.json();
  const match = (data.items || []).find((p: any) =>
    p.metadata?.type === "credit_package" &&
    p.metadata?.base_package === basePackageKey &&
    p.metadata?.discount_tier === discountTier
  );
  return match || null;
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

    if (useRetentionDiscount && retentionAlreadyUsed) {
      throw new Error("Retention discount already used.");
    }

    const returningDiscountPercent = getReturningDiscount(currentPurchaseCount);
    const origin = req.headers.get("origin") || "https://uplyze.ai";

    // ═══ CUSTOM CREDITS MODE ═══
    if (customCredits && typeof customCredits === "number" && customCredits >= 500) {
      logStep("Custom credits mode", { customCredits });

      // Find the Custom Credits product on Polar
      const productsRes = await polarFetch("/products?limit=100");
      const productsData = await productsRes.json();
      const customProduct = (productsData.items || []).find(
        (p: any) => p.metadata?.type === "custom_credits"
      );
      if (!customProduct) throw new Error("Custom Credits product not found on Polar. Run polar-setup first.");

      const volumeDiscount = getVolumeDiscount(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscount);
      let totalCents = Math.round(customCredits * pricePerCredit);

      // Apply returning discount on top
      if (returningDiscountPercent > 0 && !useRetentionDiscount) {
        totalCents = Math.round(totalCents * (1 - returningDiscountPercent / 100));
      }

      // Apply retention discount if requested
      let customRetentionUsed = false;
      if (useRetentionDiscount && !retentionAlreadyUsed) {
        totalCents = Math.round(totalCents * 0.5);
        customRetentionUsed = true;
        await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
        logStep("Applied retention 50% discount");
      }

      logStep("Price calculated", { totalCents, volumeDiscount, returningDiscount: returningDiscountPercent });

      const metadata: Record<string, string> = {
        user_id: user.id,
        package_id: "custom",
        credits: String(customCredits),
        bonus_credits: "0",
        is_returning: String(returningDiscountPercent > 0),
        volume_discount: String(Math.round(volumeDiscount * 100)),
        retention_used: String(customRetentionUsed),
      };

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
        metadata,
      };

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

    // ═══ PACKAGE MODE — auto-select correct discount variant ═══
    if (!packageId) throw new Error("Package ID or customCredits required");

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();
    if (pkgError || !pkg) throw new Error("Invalid package");
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    // Determine base package key from name
    const nameLC = pkg.name.toLowerCase();
    let baseKey = "starter";
    if (nameLC.includes("pro")) baseKey = "pro";
    if (nameLC.includes("studio")) baseKey = "studio";
    if (nameLC.includes("power")) baseKey = "power";

    // Determine which discount tier to use
    const discountTier = getDiscountTier(currentPurchaseCount, useRetentionDiscount || false);
    logStep("Discount tier selected", { baseKey, discountTier, purchaseCount: currentPurchaseCount });

    // Find the exact pre-baked product variant on Polar
    const variantProduct = await findProductVariant(baseKey, discountTier);
    if (!variantProduct) {
      // Fallback: use base product from credit_packages table
      logStep("Variant not found, falling back to base product");
      const polarProductId = pkg.stripe_product_id;
      if (!polarProductId) throw new Error("Polar product ID not set. Run polar-setup first.");

      const checkoutBody: any = {
        products: [polarProductId],
        customer_email: user.email,
        external_customer_id: user.id,
        embed_origin: origin,
        metadata: {
          user_id: user.id,
          package_id: pkg.id,
          credits: String(pkg.credits),
          bonus_credits: String(pkg.bonus_credits),
          is_returning: String(returningDiscountPercent > 0),
          retention_used: "false",
        },
      };

      const checkoutRes = await polarFetch("/checkouts", { method: "POST", body: JSON.stringify(checkoutBody) });
      if (!checkoutRes.ok) throw new Error(`Polar checkout failed: ${await checkoutRes.text()}`);
      const checkout = await checkoutRes.json();
      return new Response(JSON.stringify({ checkoutUrl: checkout.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark retention as used if applicable
    if (useRetentionDiscount) {
      await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
      logStep("Marked retention discount as used");
    }

    logStep("Using pre-baked variant", {
      name: variantProduct.name,
      id: variantProduct.id,
      price: variantProduct.prices?.[0]?.price_amount,
    });

    const checkoutBody: any = {
      products: [variantProduct.id],
      customer_email: user.email,
      external_customer_id: user.id,
      embed_origin: origin,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        bonus_credits: String(pkg.bonus_credits),
        discount_tier: discountTier,
        is_returning: String(returningDiscountPercent > 0),
        retention_used: String(useRetentionDiscount || false),
      },
    };

    const checkoutRes = await polarFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify(checkoutBody),
    });
    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      throw new Error(`Polar checkout failed: ${errText}`);
    }
    const checkout = await checkoutRes.json();
    logStep("Checkout created with variant", { checkoutId: checkout.id, variant: variantProduct.name });

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

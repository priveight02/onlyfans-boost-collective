import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_MODE = Deno.env.get("POLAR_MODE") || "live";
const POLAR_API = POLAR_MODE === "sandbox" ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";

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

const log = (step: string, d?: any) => console.log(`[PURCHASE-CREDITS] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const BASE_PRICE_PER_CREDIT_CENTS = 1.816;

const PACKAGE_TIER_MAP: Record<string, string> = {
  "starter credits": "starter",
  "pro credits": "pro",
  "studio credits": "studio",
  "power user credits": "power",
};

const getVolumeDiscountPercent = (credits: number): number => {
  if (credits >= 100000) return 40;
  if (credits >= 75000) return 35;
  if (credits >= 50000) return 30;
  if (credits >= 30000) return 25;
  if (credits >= 20000) return 20;
  if (credits >= 15000) return 15;
  if (credits >= 10000) return 5;
  return 0;
};

const getDiscountTier = (purchaseCount: number, useRetention: boolean, retentionUsed: boolean): string => {
  if (useRetention && !retentionUsed) return "retention_50";
  if (purchaseCount === 1) return "loyalty_30";
  if (purchaseCount === 2) return "loyalty_20";
  if (purchaseCount === 3) return "loyalty_10";
  return "none";
};

// Find Polar product by metadata
const findProductVariant = async (basePackage: string, discountTier: string): Promise<{ productId: string } | null> => {
  const res = await polarFetch("/products?limit=100");
  if (!res.ok) throw new Error("Failed to fetch Polar products");
  const data = await res.json();
  const products = data.items || [];

  for (const product of products) {
    const meta = product.metadata || {};
    if (
      meta.type === "credit_package" &&
      meta.base_package === basePackage &&
      meta.discount_tier === discountTier
    ) {
      return { productId: product.id };
    }
  }
  return null;
};

// Find custom credits product
const findCustomCreditsProduct = async (): Promise<{ productId: string } | null> => {
  const res = await polarFetch("/products?limit=100");
  if (!res.ok) throw new Error("Failed to fetch Polar products");
  const data = await res.json();
  const products = data.items || [];

  for (const product of products) {
    if (product.metadata?.type === "custom_credits") {
      return { productId: product.id };
    }
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    log("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { packageId, customCredits, useRetentionDiscount } = body;

    const { data: wallet } = await supabaseAdmin
      .from("wallets").select("purchase_count, retention_credits_used").eq("user_id", user.id).single();
    const currentPurchaseCount = wallet?.purchase_count || 0;
    const retentionAlreadyUsed = wallet?.retention_credits_used || false;

    if (useRetentionDiscount && retentionAlreadyUsed) throw new Error("Retention discount already used.");

    const origin = req.headers.get("origin") || "https://uplyze.ai";
    const discountTier = getDiscountTier(currentPurchaseCount, useRetentionDiscount || false, retentionAlreadyUsed);

    // ═══ CUSTOM CREDITS MODE ═══
    if (customCredits && typeof customCredits === "number" && customCredits >= 500) {
      log("Custom credits mode", { customCredits, discountTier });

      const customProduct = await findCustomCreditsProduct();
      if (!customProduct) throw new Error("Custom credits product not found on Polar");

      const volumeDiscountPercent = getVolumeDiscountPercent(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscountPercent / 100);
      let totalCents = Math.round(customCredits * pricePerCredit);

      if (discountTier === "retention_50") {
        totalCents = Math.round(totalCents * 0.5);
        await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
      } else if (discountTier === "loyalty_30") {
        totalCents = Math.round(totalCents * 0.7);
      } else if (discountTier === "loyalty_20") {
        totalCents = Math.round(totalCents * 0.8);
      } else if (discountTier === "loyalty_10") {
        totalCents = Math.round(totalCents * 0.9);
      }

      log("Custom price calculated", { totalCents, volumeDiscountPercent, discountTier });

      const checkoutRes = await polarFetch("/checkouts/", {
        method: "POST",
        body: JSON.stringify({
          products: [customProduct.productId],
          amount: totalCents,
          customer_email: user.email,
          customer_external_id: user.id,
          metadata: {
            user_id: user.id,
            package_id: "custom",
            credits: String(customCredits),
            bonus_credits: "0",
            discount_tier: discountTier,
            volume_discount: String(volumeDiscountPercent),
            retention_used: String(useRetentionDiscount || false),
          },
          success_url: `${origin}/pricing?success=true`,
          allow_discount_codes: false,
          embed_origin: origin,
        }),
      });

      if (!checkoutRes.ok) {
        const errText = await checkoutRes.text();
        log("Custom checkout error", { status: checkoutRes.status, body: errText });
        throw new Error(`Checkout failed: ${errText}`);
      }
      const checkout = await checkoutRes.json();
      const checkoutUrl = checkout.url;
      log("Custom checkout created", { url: checkoutUrl, discountTier });

      return new Response(JSON.stringify({ checkoutUrl, discount_tier: discountTier }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ PACKAGE MODE ═══
    if (!packageId) throw new Error("Package ID or customCredits required");

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages").select("*").eq("id", packageId).eq("is_active", true).single();
    if (pkgError || !pkg) throw new Error("Invalid package");
    log("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    const tierKey = Object.entries(PACKAGE_TIER_MAP).find(
      ([pattern]) => pkg.name.toLowerCase().includes(pattern)
    )?.[1];
    if (!tierKey) throw new Error(`Unknown package tier: ${pkg.name}`);

    const variant = await findProductVariant(tierKey, discountTier);
    if (!variant) throw new Error(`No Polar product found for tier=${tierKey}, discount=${discountTier}`);

    if (discountTier === "retention_50") {
      await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
    }

    log("Selected variant", { tierKey, discountTier, productId: variant.productId });

    const checkoutRes = await polarFetch("/checkouts/", {
      method: "POST",
      body: JSON.stringify({
        products: [variant.productId],
        customer_email: user.email,
        customer_external_id: user.id,
        metadata: {
          user_id: user.id,
          package_id: pkg.id,
          credits: String(pkg.credits),
          bonus_credits: String(pkg.bonus_credits),
          discount_tier: discountTier,
          is_returning: String(currentPurchaseCount > 0),
          retention_used: String(useRetentionDiscount || false),
        },
        success_url: `${origin}/pricing?success=true`,
        allow_discount_codes: false,
        embed_origin: origin,
      }),
    });

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      log("Checkout error", { status: checkoutRes.status, body: errText });
      throw new Error(`Checkout failed: ${errText}`);
    }
    const checkout = await checkoutRes.json();
    const checkoutUrl = checkout.url;
    log("Checkout created", { url: checkoutUrl, discountTier });

    return new Response(JSON.stringify({ checkoutUrl, discount_tier: discountTier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

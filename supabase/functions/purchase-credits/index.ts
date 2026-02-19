import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LS_API = "https://api.lemonsqueezy.com/v1";

const lsFetch = async (path: string, options: RequestInit = {}) => {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY not set");
  return fetch(`${LS_API}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${key}`,
    },
  });
};

const log = (step: string, d?: any) => console.log(`[PURCHASE-CREDITS] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const BASE_PRICE_PER_CREDIT_CENTS = 1.816;

// ═══════════════════════════════════════════════════════
// LS PRODUCT / VARIANT ID MAP (synced from Lemon Squeezy)
// Each tier has: base, 10%, 20%, 30%, 50% discount variants
// ═══════════════════════════════════════════════════════

const LS_CREDIT_VARIANTS: Record<string, Record<string, { productId: string; variantId: string; priceCents: number }>> = {
  starter: {
    base:  { productId: "840259", variantId: "1324008", priceCents: 900 },
    "10":  { productId: "840275", variantId: "1324031", priceCents: 810 },
    "20":  { productId: "840277", variantId: "1324035", priceCents: 720 },
    "30":  { productId: "840279", variantId: "1324037", priceCents: 630 },
    "50":  { productId: "840283", variantId: "1324043", priceCents: 450 },
  },
  pro: {
    base:  { productId: "840262", variantId: "1324011", priceCents: 2900 },
    "10":  { productId: "840285", variantId: "1324045", priceCents: 2610 },
    "20":  { productId: "840286", variantId: "1324046", priceCents: 2320 },
    "30":  { productId: "840290", variantId: "1324054", priceCents: 2030 },
    "50":  { productId: "840292", variantId: "1324056", priceCents: 1450 },
  },
  studio: {
    base:  { productId: "840264", variantId: "1324015", priceCents: 4900 },
    "10":  { productId: "840298", variantId: "1324066", priceCents: 4410 },
    "20":  { productId: "840305", variantId: "1324074", priceCents: 3920 },
    "30":  { productId: "840306", variantId: "1324075", priceCents: 3430 },
    "50":  { productId: "840311", variantId: "1324085", priceCents: 2450 },
  },
  power: {
    base:  { productId: "840272", variantId: "1324028", priceCents: 14900 },
    "10":  { productId: "840313", variantId: "1324087", priceCents: 13410 },
    "20":  { productId: "840318", variantId: "1324094", priceCents: 11920 },
    "30":  { productId: "840321", variantId: "1324097", priceCents: 10430 },
    "50":  { productId: "840323", variantId: "1324099", priceCents: 7450 },
  },
};

// Custom Credits product (pay-what-you-want with custom_price)
const LS_CUSTOM_CREDITS = { productId: "840329", variantId: "1324110" };

// Map DB package name to tier key
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

// Determine discount tier based on purchase history & retention
// Declining discount: 1st repurchase=30%, 2nd=20%, 3rd=10%, then 0%
const getDiscountTier = (purchaseCount: number, useRetention: boolean, retentionUsed: boolean): string => {
  if (useRetention && !retentionUsed) return "50";
  if (purchaseCount === 1) return "30";
  if (purchaseCount === 2) return "20";
  if (purchaseCount === 3) return "10";
  return "base";
};

const getStoreId = async (): Promise<string> => {
  const res = await lsFetch("/stores");
  if (!res.ok) throw new Error("Failed to fetch stores");
  const data = await res.json();
  if (!data.data?.length) throw new Error("No store found");
  return String(data.data[0].id);
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
    const storeId = await getStoreId();
    const discountTier = getDiscountTier(currentPurchaseCount, useRetentionDiscount || false, retentionAlreadyUsed);

    // ═══ CUSTOM CREDITS MODE ═══
    if (customCredits && typeof customCredits === "number" && customCredits >= 500) {
      log("Custom credits mode", { customCredits, discountTier });

      // Calculate price with volume discount
      const volumeDiscountPercent = getVolumeDiscountPercent(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscountPercent / 100);
      let totalCents = Math.round(customCredits * pricePerCredit);

      // Apply loyalty/retention discount on top of volume
      if (discountTier === "50") {
        totalCents = Math.round(totalCents * 0.5);
        await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
      } else if (discountTier === "30") {
        totalCents = Math.round(totalCents * 0.7);
      } else if (discountTier === "20") {
        totalCents = Math.round(totalCents * 0.8);
      } else if (discountTier === "10") {
        totalCents = Math.round(totalCents * 0.9);
      }

      log("Custom price calculated", { totalCents, volumeDiscountPercent, discountTier });

      const checkoutPayload: any = {
        data: {
          type: "checkouts",
          attributes: {
            custom_price: totalCents,
            checkout_data: {
              custom: {
                user_id: user.id,
                package_id: "custom",
                credits: String(customCredits),
                bonus_credits: "0",
                discount_tier: discountTier,
                volume_discount: String(volumeDiscountPercent),
                retention_used: String(useRetentionDiscount || false),
              },
            },
            product_options: {
              redirect_url: `${origin}/pricing?success=true`,
              receipt_button_text: "Back to Uplyze",
              receipt_thank_you_note: "Your credits have been added to your wallet!",
            },
            checkout_options: { embed: true, dark: true, media: true, logo: true, discount: false },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: LS_CUSTOM_CREDITS.variantId } },
          },
        },
      };

      const checkoutRes = await lsFetch("/checkouts", {
        method: "POST",
        body: JSON.stringify(checkoutPayload),
      });

      if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
      const checkout = await checkoutRes.json();
      const checkoutUrl = checkout.data?.attributes?.url;
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

    // Resolve tier key from package name
    const tierKey = Object.entries(PACKAGE_TIER_MAP).find(
      ([pattern]) => pkg.name.toLowerCase().includes(pattern)
    )?.[1];
    if (!tierKey || !LS_CREDIT_VARIANTS[tierKey]) throw new Error(`Unknown package tier: ${pkg.name}`);

    // Select the correct discount variant product
    const variantInfo = LS_CREDIT_VARIANTS[tierKey][discountTier];
    if (!variantInfo) throw new Error(`No variant found for tier=${tierKey}, discount=${discountTier}`);

    // Mark retention as used if applicable
    if (discountTier === "50") {
      await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
    }

    log("Selected variant", { tierKey, discountTier, productId: variantInfo.productId, variantId: variantInfo.variantId, priceCents: variantInfo.priceCents });

    const checkoutPayload: any = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: user.id,
              package_id: pkg.id,
              credits: String(pkg.credits),
              bonus_credits: String(pkg.bonus_credits),
              discount_tier: discountTier,
              is_returning: String(currentPurchaseCount > 0),
              retention_used: String(useRetentionDiscount || false),
            },
          },
          product_options: {
            redirect_url: `${origin}/pricing?success=true`,
            receipt_button_text: "Back to Uplyze",
            receipt_thank_you_note: "Your credits have been added to your wallet!",
          },
          checkout_options: { embed: true, dark: true, media: true, logo: true, discount: false },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantInfo.variantId } },
        },
      },
    };

    const checkoutRes = await lsFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify(checkoutPayload),
    });

    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
    const checkout = await checkoutRes.json();
    const checkoutUrl = checkout.data?.attributes?.url;
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

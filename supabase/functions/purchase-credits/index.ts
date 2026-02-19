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

const getReturningDiscount = (count: number): number => {
  if (count >= 3) return 30;
  if (count >= 2) return 20;
  if (count >= 1) return 10;
  return 0;
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

    const returningDiscountPercent = getReturningDiscount(currentPurchaseCount);
    const origin = req.headers.get("origin") || "https://uplyze.ai";
    const storeId = await getStoreId();

    // ═══ CUSTOM CREDITS MODE ═══
    if (customCredits && typeof customCredits === "number" && customCredits >= 500) {
      log("Custom credits mode", { customCredits });

      // Find Custom Credits product variant
      const productsRes = await lsFetch(`/products?filter[store_id]=${storeId}&page[size]=100`);
      const productsData = await productsRes.json();
      const customProduct = (productsData.data || []).find(
        (p: any) => p.attributes.name.toLowerCase().includes("custom credits")
      );
      if (!customProduct) throw new Error("Custom Credits product not found in Lemon Squeezy. Create it in the dashboard first.");

      // Get variant
      const varRes = await lsFetch(`/variants?filter[product_id]=${customProduct.id}&page[size]=1`);
      const varData = await varRes.json();
      const variant = varData.data?.[0];
      if (!variant) throw new Error("No variant found for Custom Credits product.");

      const volumeDiscount = getVolumeDiscount(customCredits);
      const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - volumeDiscount);
      let totalCents = Math.round(customCredits * pricePerCredit);

      if (returningDiscountPercent > 0 && !useRetentionDiscount) {
        totalCents = Math.round(totalCents * (1 - returningDiscountPercent / 100));
      }

      let retentionUsed = false;
      if (useRetentionDiscount && !retentionAlreadyUsed) {
        totalCents = Math.round(totalCents * 0.5);
        retentionUsed = true;
        await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
        log("Applied retention 50% discount");
      }

      log("Custom price calculated", { totalCents, volumeDiscount, returningDiscount: returningDiscountPercent });

      const checkoutRes = await lsFetch("/checkouts", {
        method: "POST",
        body: JSON.stringify({
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
                  is_returning: String(returningDiscountPercent > 0),
                  volume_discount: String(Math.round(volumeDiscount * 100)),
                  retention_used: String(retentionUsed),
                },
              },
              product_options: {
                redirect_url: `${origin}/pricing?success=true`,
                receipt_button_text: "Back to Uplyze",
                receipt_thank_you_note: "Your credits have been added to your wallet!",
              },
              checkout_options: { embed: true, dark: true, media: true, logo: true },
            },
            relationships: {
              store: { data: { type: "stores", id: storeId } },
              variant: { data: { type: "variants", id: String(variant.id) } },
            },
          },
        }),
      });

      if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
      const checkout = await checkoutRes.json();
      const checkoutUrl = checkout.data?.attributes?.url;
      log("Custom checkout created", { url: checkoutUrl });

      return new Response(JSON.stringify({ checkoutUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ PACKAGE MODE ═══
    if (!packageId) throw new Error("Package ID or customCredits required");

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages").select("*").eq("id", packageId).eq("is_active", true).single();
    if (pkgError || !pkg) throw new Error("Invalid package");
    log("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    // Get variant ID from credit_packages table (mapped by lemon-setup)
    const variantId = pkg.stripe_price_id;
    if (!variantId) throw new Error("Variant not mapped. Run lemon-setup first.");

    // Calculate discounted price
    let priceCents = pkg.price_cents;
    let discountTier = "none";

    if (useRetentionDiscount && !retentionAlreadyUsed) {
      priceCents = Math.round(priceCents * 0.5);
      discountTier = "retention_50";
      await supabaseAdmin.from("wallets").update({ retention_credits_used: true }).eq("user_id", user.id);
      log("Applied retention 50% discount");
    } else if (returningDiscountPercent > 0) {
      priceCents = Math.round(priceCents * (1 - returningDiscountPercent / 100));
      discountTier = `loyalty_${returningDiscountPercent}`;
    }

    log("Discount applied", { discountTier, originalPrice: pkg.price_cents, finalPrice: priceCents });

    const checkoutRes = await lsFetch("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            custom_price: priceCents,
            checkout_data: {
              custom: {
                user_id: user.id,
                package_id: pkg.id,
                credits: String(pkg.credits),
                bonus_credits: String(pkg.bonus_credits),
                discount_tier: discountTier,
                is_returning: String(returningDiscountPercent > 0),
                retention_used: String(useRetentionDiscount || false),
              },
            },
            product_options: {
              redirect_url: `${origin}/pricing?success=true`,
              receipt_button_text: "Back to Uplyze",
              receipt_thank_you_note: "Your credits have been added to your wallet!",
            },
            checkout_options: { embed: true, dark: true, media: true, logo: true },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
    const checkout = await checkoutRes.json();
    const checkoutUrl = checkout.data?.attributes?.url;
    log("Checkout created", { url: checkoutUrl, discountTier });

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

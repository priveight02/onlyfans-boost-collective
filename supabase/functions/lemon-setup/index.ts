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

const log = (step: string, d?: any) => console.log(`[POLAR-SYNC] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// ═══════════════════════════════════════════════════════
// HARDCODED PRODUCT MAP — your 26 manually-created Polar products
// Maps Polar product ID → metadata to PATCH onto each product
// ═══════════════════════════════════════════════════════

const PRODUCT_MAP: Array<{
  polarProductId: string;
  polarPriceId: string;
  name: string;
  metadata: Record<string, string>;
}> = [
  // ─── CREDIT PACKAGES: STARTER ───
  { polarProductId: "ef08e938-f694-40b3-8d8f-e077e9ac11f1", polarPriceId: "848eef54-76fd-43f3-90e0-716e41f1f332", name: "Starter Credits (350)", metadata: { type: "credit_package", base_package: "starter", discount_tier: "none", credits: "350", bonus_credits: "0" } },
  { polarProductId: "5845c4c5-661a-461c-8850-1498a8025741", polarPriceId: "94ea12e1-30a4-488b-9b72-b0c03ebdca65", name: "Starter Credits (10% Off)", metadata: { type: "credit_package", base_package: "starter", discount_tier: "loyalty_10", credits: "350", bonus_credits: "0" } },
  { polarProductId: "ea0d63b8-9302-4ab0-9c5c-01f7b6a82e0a", polarPriceId: "04386770-03bb-444a-aeed-829f1855c1e1", name: "Starter Credits (20% Off)", metadata: { type: "credit_package", base_package: "starter", discount_tier: "loyalty_20", credits: "350", bonus_credits: "0" } },
  { polarProductId: "ba37cd73-104f-4dc6-b646-82d8d95248fe", polarPriceId: "2a8eed93-81d1-4eda-91ae-3424947d438c", name: "Starter Credits (30% Off)", metadata: { type: "credit_package", base_package: "starter", discount_tier: "loyalty_30", credits: "350", bonus_credits: "0" } },
  { polarProductId: "ebc255dc-e74f-4acc-835f-137bc2f4bd36", polarPriceId: "e7bda92f-b158-4a3a-a5f9-569782b27ed4", name: "Starter Credits (50% Off)", metadata: { type: "credit_package", base_package: "starter", discount_tier: "retention_50", credits: "350", bonus_credits: "0" } },

  // ─── CREDIT PACKAGES: PRO ───
  { polarProductId: "fa4cb383-eeb0-451f-9596-232931d3fa82", polarPriceId: "7d5781ef-8798-42a2-bc06-f6d1f47c623b", name: "Pro Credits (2,000)", metadata: { type: "credit_package", base_package: "pro", discount_tier: "none", credits: "1650", bonus_credits: "350" } },
  { polarProductId: "af2af40e-b473-440e-bce8-82a654b41d1f", polarPriceId: "59d871b8-1dc6-451b-8795-db1ee9011702", name: "Pro Credits (10% Off)", metadata: { type: "credit_package", base_package: "pro", discount_tier: "loyalty_10", credits: "1650", bonus_credits: "350" } },
  { polarProductId: "164f7996-5399-454d-adac-ab0145a08907", polarPriceId: "e367c2d2-02e4-449d-8e0d-3d0c49819a82", name: "Pro Credits (20% Off)", metadata: { type: "credit_package", base_package: "pro", discount_tier: "loyalty_20", credits: "1650", bonus_credits: "350" } },
  { polarProductId: "0537ee81-1a1f-471e-99e0-1d4081480c1e", polarPriceId: "30c7c5ad-1425-46d8-b4be-419b6deb5b8f", name: "Pro Credits (30% Off)", metadata: { type: "credit_package", base_package: "pro", discount_tier: "loyalty_30", credits: "1650", bonus_credits: "350" } },
  { polarProductId: "c6fe639f-e7f3-4263-bd60-84cce0f6ae4b", polarPriceId: "f146ca05-3dca-4309-9856-729ddaa03584", name: "Pro Credits (50% Off)", metadata: { type: "credit_package", base_package: "pro", discount_tier: "retention_50", credits: "1650", bonus_credits: "350" } },

  // ─── CREDIT PACKAGES: STUDIO ───
  { polarProductId: "811160ff-da2f-434a-8d65-6229d02e79bf", polarPriceId: "89848bde-5346-4223-9d6e-0f0a46456719", name: "Studio Credits (3,850)", metadata: { type: "credit_package", base_package: "studio", discount_tier: "none", credits: "3300", bonus_credits: "550" } },
  { polarProductId: "b89356c5-a147-479f-af1e-2fd47191590b", polarPriceId: "84ad4ddb-aabe-46fe-b1f6-a0dd3ef7db6c", name: "Studio Credits (10% Off)", metadata: { type: "credit_package", base_package: "studio", discount_tier: "loyalty_10", credits: "3300", bonus_credits: "550" } },
  { polarProductId: "31945f70-210e-4b0e-95e4-cff107852fe0", polarPriceId: "630e3265-82b9-431f-b80c-2114de725a83", name: "Studio Credits (20% Off)", metadata: { type: "credit_package", base_package: "studio", discount_tier: "loyalty_20", credits: "3300", bonus_credits: "550" } },
  { polarProductId: "2a9ee7ce-1461-4536-9b6c-e7a9c6ba8081", polarPriceId: "6a47c8f0-e2bc-407b-856a-14600349dc40", name: "Studio Credits (30% Off)", metadata: { type: "credit_package", base_package: "studio", discount_tier: "loyalty_30", credits: "3300", bonus_credits: "550" } },
  { polarProductId: "336697af-c60d-4f72-a54c-1b5003c4e5ee", polarPriceId: "904c01ad-7afe-450c-a5a7-43eaa3ec0fe9", name: "Studio Credits (50% Off)", metadata: { type: "credit_package", base_package: "studio", discount_tier: "retention_50", credits: "3300", bonus_credits: "550" } },

  // ─── CREDIT PACKAGES: POWER USER ───
  { polarProductId: "65c5e0bb-d5ae-4964-8443-0a2f7e57147c", polarPriceId: "50a0b730-09b9-4884-8491-a7bdddcf046c", name: "Power User Credits (13,500)", metadata: { type: "credit_package", base_package: "power", discount_tier: "none", credits: "11500", bonus_credits: "2000" } },
  { polarProductId: "f17c79e4-0981-40f2-8ff2-6f321a5d3eb7", polarPriceId: "237ac278-e95b-453c-8e0b-3cafa3294688", name: "Power User Credits (10% Off)", metadata: { type: "credit_package", base_package: "power", discount_tier: "loyalty_10", credits: "11500", bonus_credits: "2000" } },
  { polarProductId: "2669b7bd-7b15-40f1-b91a-3427a254ea9f", polarPriceId: "6de5573d-5500-4a1b-90f6-be9daaef067e", name: "Power User Credits (20% Off)", metadata: { type: "credit_package", base_package: "power", discount_tier: "loyalty_20", credits: "11500", bonus_credits: "2000" } },
  { polarProductId: "78a2b89a-546d-436a-9d36-dac1e2411776", polarPriceId: "d7726688-67c2-48da-91fe-4f7e80440286", name: "Power User Credits (30% Off)", metadata: { type: "credit_package", base_package: "power", discount_tier: "loyalty_30", credits: "11500", bonus_credits: "2000" } },
  { polarProductId: "a3cf3307-daed-4ca0-bace-39b88105e759", polarPriceId: "2253c71a-df37-4f30-85d7-e4ffeb6e253e", name: "Power User Credits (50% Off)", metadata: { type: "credit_package", base_package: "power", discount_tier: "retention_50", credits: "11500", bonus_credits: "2000" } },

  // ─── CUSTOM CREDITS ───
  { polarProductId: "298131f7-1e9e-4d35-903c-0e37cda48e94", polarPriceId: "3d80092f-09bd-42c0-aa50-3731ee506082", name: "Custom Needs Credits", metadata: { type: "custom_credits" } },

  // ─── SUBSCRIPTIONS ───
  { polarProductId: "bb70ec6c-0b44-434a-b557-d00b5f4b1364", polarPriceId: "87eb456a-789a-4a0b-b49c-937580355559", name: "Starter Plan (Monthly)", metadata: { type: "subscription", plan: "starter", cycle: "monthly", credits_per_month: "215" } },
  { polarProductId: "d0b716f8-4ae1-47ba-8239-35f93e1e2a67", polarPriceId: "b1c72d3a-517d-40fd-82ad-897a706421b1", name: "Starter Plan (Yearly)", metadata: { type: "subscription", plan: "starter", cycle: "yearly", credits_per_month: "215" } },
  { polarProductId: "afb52d27-f337-4416-8045-cb1fb28d22af", polarPriceId: "f7e6c21c-a93a-46da-814a-5487b504697f", name: "Pro Plan (Monthly)", metadata: { type: "subscription", plan: "pro", cycle: "monthly", credits_per_month: "1075" } },
  { polarProductId: "6ccc05f5-3af5-466a-b21b-05b97be248e6", polarPriceId: "844d8ce8-51db-4770-9c39-c980deeff013", name: "Pro Plan (Yearly)", metadata: { type: "subscription", plan: "pro", cycle: "yearly", credits_per_month: "1075" } },
  { polarProductId: "dc1d1404-d2dc-4b9b-a78e-7a2b2d7bb673", polarPriceId: "3b0062bb-3717-4722-b89b-c551695df027", name: "Business Plan (Monthly)", metadata: { type: "subscription", plan: "business", cycle: "monthly", credits_per_month: "4300" } },
  { polarProductId: "210026ae-e135-4513-be96-844097867452", polarPriceId: "d939f95b-1b8f-4de5-9beb-b3e237b82e40", name: "Business Plan (Yearly)", metadata: { type: "subscription", plan: "business", cycle: "yearly", credits_per_month: "4300" } },
];

// Old API-created duplicates to archive
const DUPLICATE_PRODUCT_IDS = [
  "ab8b81ed-ebb7-4372-8032-a1faf115c3bd", // Business Plan (Yearly) - API dup
  "39e1f1a0-876c-4b96-aac8-eaf98e267969", // Business Plan (Monthly) - API dup
  "9aee394b-b89f-4bbb-862e-4031290f4f8b", // Pro Plan (Yearly) - API dup
  "34ffb8a4-e526-45fc-a13e-880af4a9ed6b", // Pro Plan (Monthly) - API dup
  "5202229b-4052-46fa-9b8b-91f24271870f", // Starter Plan (Yearly) - API dup
  "be5ceddd-3bf1-40c5-8880-1057a5fe5354", // Starter Plan (Monthly) - API dup
  "2ca92f72-3987-4653-9d50-a5327b2fc293", // Custom Credits - API dup
  "f150073f-1af0-4201-824e-b6064e410441", // Power User Credits - API dup
  "6b52eb71-bbd6-450a-bf8f-1432275063a8", // Studio Credits - API dup
  "fca3b0d6-a338-46ca-a506-7f692a517c2b", // Pro Credits - API dup
  "c640d098-57a7-4411-bfe5-6e3118920623", // Starter Credits - API dup
];

// credit_packages DB mapping (base package key → Polar product/price for the "none" discount tier)
const CREDIT_PACKAGES_DB_MAP: Record<string, { productId: string; priceId: string; dbNamePattern: string }> = {
  starter: { productId: "ef08e938-f694-40b3-8d8f-e077e9ac11f1", priceId: "848eef54-76fd-43f3-90e0-716e41f1f332", dbNamePattern: "%Starter%" },
  pro: { productId: "fa4cb383-eeb0-451f-9596-232931d3fa82", priceId: "7d5781ef-8798-42a2-bc06-f6d1f47c623b", dbNamePattern: "%Pro%" },
  studio: { productId: "811160ff-da2f-434a-8d65-6229d02e79bf", priceId: "89848bde-5346-4223-9d6e-0f0a46456719", dbNamePattern: "%Studio%" },
  power: { productId: "65c5e0bb-d5ae-4964-8443-0a2f7e57147c", priceId: "50a0b730-09b9-4884-8491-a7bdddcf046c", dbNamePattern: "%Power%" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth
    const body = await req.json().catch(() => ({}));
    const adminPw = Deno.env.get("ADMIN_PASSWORD");
    if (body.admin_password && adminPw && body.admin_password === adminPw) {
      log("Admin verified via password");
    } else {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) throw new Error("No auth token");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (!userData.user) throw new Error("Not authenticated");
      const { data: roleData } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").single();
      if (!roleData) throw new Error("Admin access required");
      log("Admin verified via JWT");
    }

    const results = { patched: [] as string[], failed: [] as string[], archived: [] as string[], db_updated: [] as string[] };

    // ═══ STEP 1: PATCH metadata onto all 26 manually-created products ═══
    log("Patching metadata onto 26 products...");
    for (const product of PRODUCT_MAP) {
      const res = await polarFetch(`/products/${product.polarProductId}`, {
        method: "PATCH",
        body: JSON.stringify({ metadata: product.metadata }),
      });
      if (res.ok) {
        results.patched.push(product.name);
        log("✓ Patched", { name: product.name });
      } else {
        const err = await res.text();
        results.failed.push(`${product.name}: ${err}`);
        log("✗ Failed", { name: product.name, err });
      }
    }

    // ═══ STEP 2: Archive duplicate API-created products ═══
    if (body.archive_duplicates !== false) {
      log("Archiving duplicates...");
      for (const dupId of DUPLICATE_PRODUCT_IDS) {
        const res = await polarFetch(`/products/${dupId}`, {
          method: "PATCH",
          body: JSON.stringify({ is_archived: true }),
        });
        if (res.ok) {
          results.archived.push(dupId);
        } else {
          log("Archive skip", { id: dupId, status: res.status });
        }
      }
    }

    // ═══ STEP 3: Update credit_packages table with base product IDs ═══
    log("Updating credit_packages table...");
    for (const [key, mapping] of Object.entries(CREDIT_PACKAGES_DB_MAP)) {
      const { error } = await supabaseAdmin.from("credit_packages").update({
        stripe_product_id: mapping.productId,
        stripe_price_id: mapping.priceId,
      }).ilike("name", mapping.dbNamePattern);

      if (!error) {
        results.db_updated.push(key);
        log("✓ DB updated", { key });
      } else {
        log("✗ DB update failed", { key, error: error.message });
      }
    }

    log("Sync complete", {
      patched: results.patched.length,
      failed: results.failed.length,
      archived: results.archived.length,
      db_updated: results.db_updated.length,
    });

    return new Response(JSON.stringify({
      success: true,
      summary: {
        products_tagged: results.patched.length,
        products_failed: results.failed.length,
        duplicates_archived: results.archived.length,
        credit_packages_updated: results.db_updated.length,
      },
      details: results,
      product_reference: PRODUCT_MAP.map(p => ({
        name: p.name,
        product_id: p.polarProductId,
        price_id: p.polarPriceId,
        metadata: p.metadata,
      })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

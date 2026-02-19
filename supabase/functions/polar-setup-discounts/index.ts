import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

const log = (step: string, d?: any) => console.log(`[POLAR-DISCOUNTS] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// All 4 discount coupons to create
const DISCOUNTS = [
  {
    name: "Yearly 15% Off",
    code: "YEARLY15",
    type: "percentage" as const,
    basis_points: 1500, // 15%
    duration: "forever" as const,
    metadata: { auto_apply: "yearly_subscription", tier: "starter" },
  },
  {
    name: "Yearly 30% Off",
    code: "YEARLY30",
    type: "percentage" as const,
    basis_points: 3000, // 30%
    duration: "forever" as const,
    metadata: { auto_apply: "yearly_subscription", tier: "pro" },
  },
  {
    name: "Yearly 33% Off",
    code: "YEARLY33",
    type: "percentage" as const,
    basis_points: 3300, // 33%
    duration: "forever" as const,
    metadata: { auto_apply: "yearly_subscription", tier: "business" },
  },
  {
    name: "Special 50% Off",
    code: "SPECIAL50",
    type: "percentage" as const,
    basis_points: 5000, // 50%
    duration: "once" as const,
    metadata: { auto_apply: "retention", tier: "all" },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // List existing discounts to avoid duplicates
    const existingRes = await polarFetch("/discounts?limit=100");
    if (!existingRes.ok) throw new Error(`Failed to list discounts: ${await existingRes.text()}`);
    const existingData = await existingRes.json();
    const existingCodes = new Set(
      (existingData.items || []).map((d: any) => d.code?.toUpperCase()).filter(Boolean)
    );
    const existingMap: Record<string, any> = {};
    for (const d of existingData.items || []) {
      if (d.code) existingMap[d.code.toUpperCase()] = d;
    }

    log("Existing discounts", { codes: Array.from(existingCodes) });

    const results: any[] = [];

    for (const discount of DISCOUNTS) {
      if (existingCodes.has(discount.code)) {
        const existing = existingMap[discount.code];
        log(`Discount already exists: ${discount.code}`, { id: existing.id });
        results.push({
          code: discount.code,
          status: "already_exists",
          id: existing.id,
          name: existing.name,
        });
        continue;
      }

      // Create the discount via Polar API
      const body: any = {
        name: discount.name,
        code: discount.code,
        type: discount.type,
        basis_points: discount.basis_points,
        duration: discount.duration,
        max_redemptions: null, // Unlimited total redemptions
        metadata: discount.metadata,
      };

      log(`Creating discount: ${discount.code}`, body);

      const createRes = await polarFetch("/discounts", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        log(`Failed to create ${discount.code}`, { error: errText });
        results.push({
          code: discount.code,
          status: "error",
          error: errText,
        });
        continue;
      }

      const created = await createRes.json();
      log(`Created discount: ${discount.code}`, { id: created.id });
      results.push({
        code: discount.code,
        status: "created",
        id: created.id,
        name: created.name,
        basis_points: created.basis_points,
        duration: created.duration,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Discount setup complete",
      discounts: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

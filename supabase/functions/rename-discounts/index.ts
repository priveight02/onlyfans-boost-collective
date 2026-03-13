import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POLAR_MODE = Deno.env.get("POLAR_MODE") || "live";
const POLAR_API = (POLAR_MODE === "sandbox" || POLAR_MODE === "test") ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";

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

const FRIENDLY_NAMES: Record<number, string> = {
  4000: "🎉 Welcome Gift — 40% OFF",
  3000: "💎 Loyal Member — 30% OFF",
  2000: "⭐ Valued Customer — 20% OFF",
  1000: "🙏 Thank You Reward — 10% OFF",
  5000: "🔥 Exclusive VIP Offer — 50% OFF",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const res = await polarFetch("/discounts?limit=50");
    if (!res.ok) throw new Error("Failed to fetch discounts");
    const data = await res.json();
    const discounts = data.items || [];

    const results: any[] = [];

    for (const d of discounts) {
      if (d.type === "percentage" && FRIENDLY_NAMES[d.basis_points]) {
        const newName = FRIENDLY_NAMES[d.basis_points];
        if (d.name !== newName) {
          const updateRes = await polarFetch(`/discounts/${d.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: newName }),
          });
          const updated = await updateRes.json();
          results.push({ id: d.id, oldName: d.name, newName, status: updateRes.ok ? "renamed" : "failed", response: updated });
        } else {
          results.push({ id: d.id, name: d.name, status: "already_correct" });
        }
      } else {
        results.push({ id: d.id, name: d.name, basis_points: d.basis_points, status: "skipped" });
      }
    }

    return new Response(JSON.stringify({ total: discounts.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

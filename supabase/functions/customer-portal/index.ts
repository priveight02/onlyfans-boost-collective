import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LS_API = "https://api.lemonsqueezy.com/v1";

const lsFetch = async (path: string) => {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY not set");
  return fetch(`${LS_API}${path}`, {
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${key}`,
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Not authenticated");

    // Get store ID
    const storesRes = await lsFetch("/stores");
    const storesData = await storesRes.json();
    const storeId = storesData.data?.[0]?.id;
    if (!storeId) throw new Error("No store found");

    // Find active subscription by email
    const subsRes = await lsFetch(`/subscriptions?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(userData.user.email)}&filter[status]=active&page[size]=1`);
    if (!subsRes.ok) throw new Error("Failed to fetch subscriptions");
    const subsData = await subsRes.json();

    if (!subsData.data?.length) {
      throw new Error("No active subscription found. The customer portal is available for subscribers.");
    }

    const subscription = subsData.data[0];
    const portalUrl = subscription.attributes?.urls?.customer_portal;

    if (!portalUrl) {
      // Fallback: try update_payment_method URL
      const fallbackUrl = subscription.attributes?.urls?.update_payment_method;
      if (fallbackUrl) {
        return new Response(JSON.stringify({ url: fallbackUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No portal URL available for this subscription");
    }

    return new Response(JSON.stringify({ url: portalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

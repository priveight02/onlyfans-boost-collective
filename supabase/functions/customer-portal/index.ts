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

const log = (step: string, d?: any) => console.log(`[CUSTOMER-PORTAL] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

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

    log("User authenticated", { userId: userData.user.id, email: userData.user.email });

    // Find Polar customer by external ID (Supabase user ID)
    const customersRes = await polarFetch(`/customers?external_id=${encodeURIComponent(userData.user.id)}&limit=1`);
    let customerId: string | null = null;

    if (customersRes.ok) {
      const customersData = await customersRes.json();
      customerId = customersData.items?.[0]?.id || null;
    }

    // Fallback: find by email
    if (!customerId) {
      const emailRes = await polarFetch(`/customers?email=${encodeURIComponent(userData.user.email)}&limit=1`);
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        customerId = emailData.items?.[0]?.id || null;
      }
    }

    if (!customerId) {
      log("No Polar customer found");
      return new Response(JSON.stringify({
        url: null,
        message: "No billing history found. Make a purchase first to access billing management.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log("Customer found", { customerId });

    // Create customer session → returns portal URL
    const sessionRes = await polarFetch("/customer-sessions", {
      method: "POST",
      body: JSON.stringify({ customer_id: customerId }),
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      log("Customer session creation failed", { error: errText });
      throw new Error(`Failed to create customer portal session: ${errText}`);
    }

    const session = await sessionRes.json();
    const portalUrl = session.customer_portal_url;
    log("Portal session created", { url: portalUrl });

    return new Response(JSON.stringify({ url: portalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

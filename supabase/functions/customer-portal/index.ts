import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PADDLE_API = "https://sandbox-api.paddle.com";

const paddleFetch = async (path: string, method: string, body?: any) => {
  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) throw new Error("PADDLE_API_KEY not set");
  const res = await fetch(`${PADDLE_API}${path}`, {
    method,
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Paddle API error [${res.status}]: ${JSON.stringify(data)}`);
  return data;
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

    // Find Paddle customer
    const customers = await paddleFetch(`/customers?search=${encodeURIComponent(userData.user.email)}`, "GET");
    if (customers.data?.length === 0) throw new Error("No Paddle customer found");

    const customerId = customers.data[0].id;

    // Get active subscription and create a portal session URL
    const subs = await paddleFetch(`/subscriptions?customer_id=${customerId}&status=active`, "GET");

    if (subs.data?.length > 0) {
      // Paddle supports "update payment method" via transaction
      const sub = subs.data[0];
      const updateTxn = await paddleFetch(`/subscriptions/${sub.id}/update-payment-method-transaction`, "GET");
      
      return new Response(JSON.stringify({
        url: null,
        subscription_id: sub.id,
        update_payment_txn_id: updateTxn.data?.id || null,
        message: "Use Paddle.js to open the update payment method checkout with this transaction ID, or cancel via the API."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No active subscription found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

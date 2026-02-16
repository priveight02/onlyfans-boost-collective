import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Sum all wallet balances
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .select("balance");

    if (error) throw error;

    const totalCredits = (data || []).reduce((sum: number, w: any) => sum + (w.balance || 0), 0);

    // Cache the result in a simple key-value table (optional, we just return it)
    console.log(`[CREDITS-CIRCULATION] Total credits in circulation: ${totalCredits}`);

    return new Response(JSON.stringify({ total_credits: totalCredits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREDITS-CIRCULATION] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

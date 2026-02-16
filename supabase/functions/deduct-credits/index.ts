import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user with anon client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action_type, cost } = await req.json();

    if (!action_type || typeof cost !== "number" || cost < 0) {
      return new Response(JSON.stringify({ success: false, error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Free actions
    if (cost === 0) {
      return new Response(JSON.stringify({ success: true, cost: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to modify wallet (RLS allows only SELECT for users)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get current balance
    const { data: wallet, error: walletError } = await adminClient
      .from("wallets")
      .select("balance, total_spent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ success: false, error: "Wallet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wallet.balance < cost) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Insufficient credits. Need ${cost}, have ${wallet.balance}.` 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    const { error: updateError } = await adminClient
      .from("wallets")
      .update({
        balance: wallet.balance - cost,
        total_spent: (wallet.total_spent || 0) + cost,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to deduct credits:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Failed to deduct credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the transaction in the ledger
    await adminClient.from("credit_ledger").insert({
      user_id: user.id,
      amount: -cost,
      type: "crm_action",
      description: `CRM action: ${action_type}`,
      metadata: { action_type, cost },
    });

    console.log(`Deducted ${cost} credits from user ${user.id} for action: ${action_type}`);

    return new Response(JSON.stringify({ 
      success: true, 
      cost, 
      new_balance: wallet.balance - cost,
      action_type,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in deduct-credits:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

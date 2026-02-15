import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const admin = authData.user;
    if (!admin) throw new Error("Not authenticated");

    const { data: isAdminResult } = await supabaseAdmin.rpc("is_admin", { _user_id: admin.id });
    if (!isAdminResult) throw new Error("Unauthorized: Admin access required");

    const { targetUserId, amount, reason } = await req.json();
    if (!targetUserId || !amount || amount <= 0) throw new Error("Invalid parameters");

    // Ensure wallet exists
    await supabaseAdmin
      .from("wallets")
      .upsert({ user_id: targetUserId, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

    // Get current balance
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", targetUserId)
      .single();

    const newBalance = (wallet?.balance || 0) + amount;

    // Update balance
    await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", targetUserId);

    // Create ledger entry
    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: targetUserId,
        amount,
        type: "admin_grant",
        description: reason || `Admin granted ${amount} credits`,
        metadata: { granted_by: admin.id, admin_email: admin.email },
      });

    return new Response(JSON.stringify({ success: true, new_balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

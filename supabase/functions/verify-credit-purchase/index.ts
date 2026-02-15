import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[VERIFY-CREDIT-PURCHASE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Find recent completed sessions for this user
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    const userSessions = sessions.data.filter(
      s => s.metadata?.user_id === user.id && s.payment_status === "paid"
    );

    if (userSessions.length === 0) {
      return new Response(JSON.stringify({ credited: false, message: "No completed purchases found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCredited = 0;

    for (const session of userSessions) {
      const sessionId = session.id;
      const credits = parseInt(session.metadata?.credits || "0");
      const bonusCredits = parseInt(session.metadata?.bonus_credits || "0");
      const totalCredits = credits + bonusCredits;
      const packageId = session.metadata?.package_id;

      if (totalCredits <= 0) continue;

      // Check if already processed (idempotency)
      const { data: existing } = await supabaseAdmin
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", sessionId)
        .eq("type", "purchase")
        .limit(1);

      if (existing && existing.length > 0) {
        logStep("Already processed", { sessionId });
        continue;
      }

      // Ensure wallet exists
      await supabaseAdmin
        .from("wallets")
        .upsert({ user_id: user.id, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

      // Add credits atomically
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance, total_purchased, purchase_count")
        .eq("user_id", user.id)
        .single();

      const newBalance = (wallet?.balance || 0) + totalCredits;
      const newTotalPurchased = (wallet?.total_purchased || 0) + totalCredits;
      const newPurchaseCount = (wallet?.purchase_count || 0) + 1;

      await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          total_purchased: newTotalPurchased,
          purchase_count: newPurchaseCount,
        })
        .eq("user_id", user.id);

      // Create ledger entry
      await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: totalCredits,
          type: "purchase",
          reference_id: sessionId,
          description: `Purchased ${credits} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ''}`,
          metadata: { package_id: packageId, stripe_session_id: sessionId, credits, bonus_credits: bonusCredits },
        });

      totalCredited += totalCredits;
      logStep("Credits added", { totalCredits, newBalance, sessionId });
    }

    // Get updated balance
    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .select("balance, purchase_count")
      .eq("user_id", user.id)
      .single();

    return new Response(JSON.stringify({
      credited: totalCredited > 0,
      credits_added: totalCredited,
      balance: updatedWallet?.balance || 0,
      purchase_count: updatedWallet?.purchase_count || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

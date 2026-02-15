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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Try to get authenticated user first
    let userId: string | null = null;
    let userEmail: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email || null;
        logStep("User authenticated", { userId, email: userEmail });
      }
    }

    if (!userId && !userEmail) {
      throw new Error("User not authenticated");
    }

    // Find recent completed sessions for this user
    const sessions = await stripe.checkout.sessions.list({ limit: 25 });

    // Match sessions by user_id in metadata (primary) or by email (fallback)
    const userSessions = sessions.data.filter(s => {
      if (s.payment_status !== "paid") return false;
      // Primary: match by user_id in metadata
      if (s.metadata?.user_id === userId) return true;
      // Fallback: match by customer_email for edge cases
      if (userEmail && s.customer_email === userEmail) return true;
      // Also check customer details
      if (userEmail && s.customer_details?.email === userEmail) return true;
      return false;
    });

    logStep("Found paid sessions", { count: userSessions.length });

    if (userSessions.length === 0) {
      return new Response(JSON.stringify({ credited: false, message: "No completed purchases found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we matched by email but didn't have user_id, look up the user
    if (!userId && userEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", userEmail)
        .single();
      if (profile) {
        userId = profile.user_id;
        logStep("Resolved user_id from email", { userId, email: userEmail });
      } else {
        throw new Error("No account found for this email");
      }
    }

    let totalCredited = 0;

    for (const session of userSessions) {
      const sessionId = session.id;
      const credits = parseInt(session.metadata?.credits || "0");
      const bonusCredits = parseInt(session.metadata?.bonus_credits || "0");
      const totalCredits = credits + bonusCredits;
      const packageId = session.metadata?.package_id;

      if (totalCredits <= 0) {
        logStep("Skipping session with 0 credits", { sessionId });
        continue;
      }

      // Idempotency check — never double-credit
      const { data: existing } = await supabaseAdmin
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", sessionId)
        .eq("type", "purchase")
        .limit(1);

      if (existing && existing.length > 0) {
        logStep("Already processed — skipping", { sessionId });
        continue;
      }

      // Verify payment is truly completed via Stripe API (double-check)
      const verifiedSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (verifiedSession.payment_status !== "paid") {
        logStep("Payment not confirmed by Stripe — skipping", { sessionId, status: verifiedSession.payment_status });
        continue;
      }

      // Also verify the payment intent succeeded
      if (verifiedSession.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(verifiedSession.payment_intent as string);
        if (paymentIntent.status !== "succeeded") {
          logStep("PaymentIntent not succeeded — skipping", { sessionId, piStatus: paymentIntent.status });
          continue;
        }
        logStep("PaymentIntent verified succeeded", { sessionId, piId: paymentIntent.id });
      }

      // Ensure wallet exists
      await supabaseAdmin
        .from("wallets")
        .upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

      // Get current wallet state
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance, total_purchased, purchase_count")
        .eq("user_id", userId)
        .single();

      const newBalance = (wallet?.balance || 0) + totalCredits;
      const newTotalPurchased = (wallet?.total_purchased || 0) + totalCredits;
      const newPurchaseCount = (wallet?.purchase_count || 0) + 1;

      // Update wallet
      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          total_purchased: newTotalPurchased,
          purchase_count: newPurchaseCount,
        })
        .eq("user_id", userId);

      if (updateError) {
        logStep("ERROR updating wallet", { sessionId, error: updateError.message });
        continue;
      }

      // Create ledger entry (immutable record)
      const { error: txError } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          amount: totalCredits,
          type: "purchase",
          reference_id: sessionId,
          description: `Purchased ${credits} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ''}`,
          metadata: {
            package_id: packageId,
            stripe_session_id: sessionId,
            credits,
            bonus_credits: bonusCredits,
            payment_intent: verifiedSession.payment_intent,
            verified_at: new Date().toISOString(),
          },
        });

      if (txError) {
        logStep("ERROR creating transaction record", { sessionId, error: txError.message });
        // Wallet was already updated — log but don't fail
      }

      totalCredited += totalCredits;
      logStep("Credits successfully added", { totalCredits, newBalance, sessionId });
    }

    // Get final balance
    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .select("balance, purchase_count")
      .eq("user_id", userId)
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

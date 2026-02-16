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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // ONLY match sessions by user_id in metadata — no email matching
    const sessions = await stripe.checkout.sessions.list({ limit: 25 });
    const userSessions = sessions.data.filter(
      s => s.payment_status === "paid" && s.metadata?.user_id === user.id
    );

    logStep("Found paid sessions for user", { count: userSessions.length });

    if (userSessions.length === 0) {
      return new Response(JSON.stringify({ credited: false, credits_added: 0, message: "No purchases found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCredited = 0;
    let receiptUrl: string | null = null;

    for (const session of userSessions) {
      const sessionId = session.id;
      const credits = parseInt(session.metadata?.credits || "0");
      const bonusCredits = parseInt(session.metadata?.bonus_credits || "0");
      const totalCredits = credits + bonusCredits;

      if (totalCredits <= 0) continue;

      // ===== IDEMPOTENCY: Check if already processed =====
      const { data: existing } = await supabaseAdmin
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", sessionId)
        .eq("type", "purchase")
        .limit(1);

      if (existing && existing.length > 0) {
        logStep("Already processed — skip", { sessionId });
        continue;
      }

      // ===== VERIFY WITH STRIPE: session + payment intent =====
      const verified = await stripe.checkout.sessions.retrieve(sessionId);
      if (verified.payment_status !== "paid") {
        logStep("Session not paid — skip", { sessionId });
        continue;
      }

      if (verified.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(verified.payment_intent as string);
        if (pi.status !== "succeeded") {
          logStep("PaymentIntent not succeeded — skip", { sessionId, status: pi.status });
          continue;
        }
        // Extract receipt URL from latest charge
        if (pi.latest_charge) {
          try {
            const charge = await stripe.charges.retrieve(pi.latest_charge as string);
            if (charge.receipt_url) receiptUrl = charge.receipt_url;
          } catch {}
        }
      }

      // ===== CREDIT: Insert transaction FIRST (acts as lock), then update wallet =====
      // Insert the transaction record first — if a duplicate call races here,
      // the unique constraint on reference_id will prevent double-insert.
      const { error: txError } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: totalCredits,
          type: "purchase",
          reference_id: sessionId,
          description: `Purchased ${credits} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ''}`,
          metadata: {
            package_id: session.metadata?.package_id,
            stripe_session_id: sessionId,
            credits,
            bonus_credits: bonusCredits,
            payment_intent: verified.payment_intent,
            verified_at: new Date().toISOString(),
          },
        });

      if (txError) {
        // If insert fails (e.g. unique constraint), it's a duplicate — skip
        logStep("Transaction insert failed (likely duplicate) — skip", { sessionId, error: txError.message });
        continue;
      }

      // Transaction inserted successfully — now safe to update wallet
      await supabaseAdmin
        .from("wallets")
        .upsert({ user_id: user.id, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance, total_purchased, purchase_count")
        .eq("user_id", user.id)
        .single();

      await supabaseAdmin
        .from("wallets")
        .update({
          balance: (wallet?.balance || 0) + totalCredits,
          total_purchased: (wallet?.total_purchased || 0) + totalCredits,
          purchase_count: (wallet?.purchase_count || 0) + 1,
        })
        .eq("user_id", user.id);

      // ===== GRANT XP based on credits purchased =====
      let xpToGrant = 0;
      if (totalCredits >= 1000) xpToGrant = 750;
      else if (totalCredits >= 500) xpToGrant = 300;
      else if (totalCredits >= 200) xpToGrant = 150;
      else if (totalCredits >= 100) xpToGrant = 50;
      else if (totalCredits >= 10) xpToGrant = 25;

      if (xpToGrant > 0) {
        // Ensure social_profiles row exists
        await supabaseAdmin
          .from("social_profiles")
          .upsert({ user_id: user.id, xp: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

        const { data: profile } = await supabaseAdmin
          .from("social_profiles")
          .select("xp, rank_tier")
          .eq("user_id", user.id)
          .single();

        const newXp = (profile?.xp || 0) + xpToGrant;

        // Determine new rank tier
        const tiers = [
          { name: "Legend", minXp: 50000 },
          { name: "Diamond", minXp: 20000 },
          { name: "Platinum", minXp: 10000 },
          { name: "Gold", minXp: 5000 },
          { name: "Silver", minXp: 2000 },
          { name: "Bronze", minXp: 500 },
          { name: "Metal", minXp: 0 },
        ];
        const newTier = tiers.find(t => newXp >= t.minXp)?.name || "Metal";

        await supabaseAdmin
          .from("social_profiles")
          .update({ xp: newXp, rank_tier: newTier })
          .eq("user_id", user.id);

        logStep("XP granted", { xpToGrant, newXp, newTier, totalCredits });
      }

      totalCredited += totalCredits;
      logStep("Credits added", { totalCredits, sessionId });
    }

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
      receipt_url: receiptUrl,
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

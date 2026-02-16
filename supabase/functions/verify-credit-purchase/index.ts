import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PADDLE_API = "https://sandbox-api.paddle.com";

const logStep = (step: string, details?: any) => {
  console.log(`[VERIFY-CREDIT-PURCHASE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Find Paddle customer
    let customerId: string | null = null;
    try {
      const customers = await paddleFetch(`/customers?search=${encodeURIComponent(user.email!)}`, "GET");
      if (customers.data?.length > 0) customerId = customers.data[0].id;
    } catch {}

    if (!customerId) {
      return new Response(JSON.stringify({ credited: false, credits_added: 0, message: "No Paddle customer found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List completed transactions for this customer
    const transactions = await paddleFetch(`/transactions?customer_id=${customerId}&status=completed&per_page=25`, "GET");
    const txns = transactions.data || [];
    logStep("Found transactions", { count: txns.length });

    let totalCredited = 0;

    for (const txn of txns) {
      const txnId = txn.id;
      const customData = txn.custom_data || {};
      const credits = parseInt(customData.credits || "0");
      const bonusCredits = parseInt(customData.bonus_credits || "0");
      const totalCredits = credits + bonusCredits;

      if (totalCredits <= 0) continue;
      if (customData.user_id !== user.id) continue;

      // Idempotency check
      const { data: existing } = await supabaseAdmin
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", txnId)
        .eq("type", "purchase")
        .limit(1);

      if (existing && existing.length > 0) {
        logStep("Already processed — skip", { txnId });
        continue;
      }

      // Insert transaction record
      const { error: txError } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: totalCredits,
          type: "purchase",
          reference_id: txnId,
          description: `Purchased ${credits} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ''}`,
          metadata: {
            package_id: customData.package_id,
            paddle_transaction_id: txnId,
            credits,
            bonus_credits: bonusCredits,
            verified_at: new Date().toISOString(),
          },
        });

      if (txError) {
        logStep("Transaction insert failed (likely duplicate)", { txnId, error: txError.message });
        continue;
      }

      // Update wallet
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

      // Grant XP
      let xpToGrant = 0;
      if (totalCredits >= 1000) xpToGrant = 750;
      else if (totalCredits >= 500) xpToGrant = 300;
      else if (totalCredits >= 200) xpToGrant = 150;
      else if (totalCredits >= 100) xpToGrant = 50;
      else if (totalCredits >= 10) xpToGrant = 25;

      if (xpToGrant > 0) {
        await supabaseAdmin
          .from("social_profiles")
          .upsert({ user_id: user.id, xp: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

        const { data: profile } = await supabaseAdmin
          .from("social_profiles")
          .select("xp, rank_tier")
          .eq("user_id", user.id)
          .single();

        const newXp = (profile?.xp || 0) + xpToGrant;
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

        logStep("XP granted", { xpToGrant, newXp, newTier });
      }

      totalCredited += totalCredits;
      logStep("Credits added", { totalCredits, txnId });
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

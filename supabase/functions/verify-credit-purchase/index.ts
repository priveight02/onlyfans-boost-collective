import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLAR_MODE = Deno.env.get("POLAR_MODE") || "live";
const POLAR_API = POLAR_MODE === "sandbox" ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";

const polarFetch = async (path: string) => {
  const token = Deno.env.get("POLAR_ACCESS_TOKEN");
  if (!token) throw new Error("POLAR_ACCESS_TOKEN not set");
  return fetch(`${POLAR_API}${path}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

const log = (step: string, d?: any) => console.log(`[VERIFY-CREDIT-PURCHASE] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id || !user?.email) throw new Error("User not authenticated");
    log("User authenticated", { userId: user.id });

    // STRATEGY 1: Check if webhook already processed recent orders
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount, created_at, reference_id, description")
      .eq("user_id", user.id)
      .eq("type", "purchase")
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentTx && recentTx.length > 0) {
      const totalRecent = recentTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      log("Found recent webhook-processed transactions", { count: recentTx.length, totalRecent });

      const { data: updatedWallet } = await supabaseAdmin
        .from("wallets").select("balance, purchase_count").eq("user_id", user.id).single();

      return new Response(JSON.stringify({
        credited: true,
        credits_added: totalRecent,
        balance: updatedWallet?.balance || 0,
        purchase_count: updatedWallet?.purchase_count || 0,
        source: "webhook",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STRATEGY 2: Poll Polar orders directly (fallback if webhook hasn't fired yet)
    // Find customer
    let customerId: string | null = null;
    const custRes = await polarFetch(`/customers?external_id=${encodeURIComponent(user.id)}&limit=1`);
    if (custRes.ok) {
      const custData = await custRes.json();
      customerId = custData.items?.[0]?.id || null;
    }
    if (!customerId) {
      const emailRes = await polarFetch(`/customers?email=${encodeURIComponent(user.email)}&limit=1`);
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        customerId = emailData.items?.[0]?.id || null;
      }
    }

    if (!customerId) {
      log("No Polar customer found");
      return new Response(JSON.stringify({ credited: false, credits_added: 0, balance: 0, purchase_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ordersRes = await polarFetch(`/orders?customer_id=${customerId}&limit=25&sorting=-created_at`);
    if (!ordersRes.ok) throw new Error(`Failed to fetch orders: ${ordersRes.status}`);
    const ordersData = await ordersRes.json();
    const orders = ordersData.items || [];
    log("Found orders", { count: orders.length });

    let totalCredited = 0;

    for (const order of orders) {
      const orderId = String(order.id);
      if (order.status !== "paid") continue;

      // Extract credits from metadata
      const meta = order.metadata || {};
      let credits = parseInt(meta.credits || "0");
      let bonusCredits = parseInt(meta.bonus_credits || "0");

      // Fallback: check product metadata
      if (credits <= 0 && order.product?.metadata) {
        credits = parseInt(order.product.metadata.credits || "0");
        bonusCredits = parseInt(order.product.metadata.bonus_credits || "0");
      }

      const totalCredits = credits + bonusCredits;
      if (totalCredits <= 0) continue;

      // IDEMPOTENCY: check if already processed
      const { data: existing } = await supabaseAdmin
        .from("wallet_transactions").select("id").eq("reference_id", orderId).eq("type", "purchase").limit(1);
      if (existing && existing.length > 0) {
        log("Already processed — skip", { orderId });
        continue;
      }

      // Insert transaction
      const { error: txError } = await supabaseAdmin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: totalCredits,
        type: "purchase",
        reference_id: orderId,
        description: `Purchased ${credits} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ""}`,
        metadata: {
          package_id: meta.package_id || null,
          polar_order_id: orderId,
          credits,
          bonus_credits: bonusCredits,
          verified_at: new Date().toISOString(),
          source: "polling",
        },
      });

      if (txError) {
        log("Transaction insert failed", { orderId, error: txError.message });
        continue;
      }

      // Update wallet
      await supabaseAdmin.from("wallets").upsert({ user_id: user.id, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
      const { data: walletData } = await supabaseAdmin.from("wallets").select("balance, total_purchased, purchase_count").eq("user_id", user.id).single();
      await supabaseAdmin.from("wallets").update({
        balance: (walletData?.balance || 0) + totalCredits,
        total_purchased: (walletData?.total_purchased || 0) + totalCredits,
        purchase_count: (walletData?.purchase_count || 0) + 1,
      }).eq("user_id", user.id);

      // Grant XP
      let xpToGrant = 0;
      if (totalCredits >= 1000) xpToGrant = 750;
      else if (totalCredits >= 500) xpToGrant = 300;
      else if (totalCredits >= 200) xpToGrant = 150;
      else if (totalCredits >= 100) xpToGrant = 50;
      else if (totalCredits >= 10) xpToGrant = 25;

      if (xpToGrant > 0) {
        const { data: rank } = await supabaseAdmin.from("user_ranks").select("xp").eq("user_id", user.id).maybeSingle();
        if (rank) {
          await supabaseAdmin.from("user_ranks").update({ xp: rank.xp + xpToGrant }).eq("user_id", user.id);
        }
      }

      totalCredited += totalCredits;
      log("Credits added", { totalCredits, orderId });
    }

    const { data: updatedWallet } = await supabaseAdmin.from("wallets").select("balance, purchase_count").eq("user_id", user.id).single();

    return new Response(JSON.stringify({
      credited: totalCredited > 0,
      credits_added: totalCredited,
      balance: updatedWallet?.balance || 0,
      purchase_count: updatedWallet?.purchase_count || 0,
      source: "polling",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

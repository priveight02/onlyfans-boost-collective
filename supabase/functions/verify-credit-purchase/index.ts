import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LS_API = "https://api.lemonsqueezy.com/v1";

const lsFetch = async (path: string) => {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY not set");
  return fetch(`${LS_API}${path}`, {
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${key}`,
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
    // Look for wallet_transactions created in the last 5 minutes
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

    // STRATEGY 2: Poll Lemon Squeezy orders directly (fallback if webhook hasn't fired yet)
    const storesRes = await lsFetch("/stores");
    const storesData = await storesRes.json();
    const storeId = storesData.data?.[0]?.id;
    if (!storeId) throw new Error("No store found");

    const ordersUrl = `/orders?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(user.email)}&page[size]=25`;
    log("Fetching orders", { url: ordersUrl });
    const ordersRes = await lsFetch(ordersUrl);
    if (!ordersRes.ok) throw new Error(`Failed to fetch orders: ${ordersRes.status}`);
    const ordersData = await ordersRes.json();
    const orders = ordersData.data || [];
    log("Found orders", { count: orders.length });

    // Load variant → credit_packages mapping
    const { data: allPackages } = await supabaseAdmin.from("credit_packages").select("*").eq("is_active", true);
    const variantMap = new Map<string, any>();
    for (const pkg of (allPackages || [])) {
      if (pkg.stripe_price_id) variantMap.set(String(pkg.stripe_price_id), pkg);
    }

    let totalCredited = 0;

    for (const order of orders) {
      const orderId = String(order.id);
      const attrs = order.attributes;
      if (attrs.status !== "paid") continue;

      // Check custom data for credits info
      const meta = attrs.meta?.custom_data || attrs.meta?.custom || attrs.meta || {};
      
      // Only process orders belonging to this user
      if (meta.user_id && meta.user_id !== user.id) continue;

      let credits = parseInt(meta.credits || "0");
      let bonusCredits = parseInt(meta.bonus_credits || "0");

      // If no meta credits, try variant mapping
      if (credits <= 0) {
        const firstItem = attrs.first_order_item;
        if (firstItem?.variant_id) {
          const pkg = variantMap.get(String(firstItem.variant_id));
          if (pkg) {
            credits = pkg.credits;
            bonusCredits = pkg.bonus_credits;
          }
        }
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
          ls_order_id: orderId,
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

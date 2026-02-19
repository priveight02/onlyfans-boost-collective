import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computed === signature;
}

const log = (step: string, d?: any) => console.log(`[ls-webhook] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (!secret) throw new Error("Webhook secret not configured");

    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";

    const valid = await verifySignature(rawBody, signature, secret);
    if (!valid) {
      log("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(rawBody);
    const eventName = event.meta?.event_name;
    const data = event.data;
    const attrs = data?.attributes;
    const customData = event.meta?.custom_data || attrs?.first_order_item?.custom_data || {};

    log("Event received", { event: eventName, id: data?.id, customData });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ── Resolve user: prefer user_id from custom_data, fallback to email ──
    const resolveUserId = async (): Promise<string | null> => {
      // 1. Direct user_id from checkout custom data
      const uid = customData?.user_id;
      if (uid) {
        log("Resolved user from custom_data", { userId: uid });
        return uid;
      }

      // 2. Fallback: lookup by email
      const email = attrs?.user_email || customData?.user_email;
      if (!email) return null;

      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (found) {
        log("Resolved user from email", { userId: found.id, email });
        return found.id;
      }

      log("User not found", { email });
      return null;
    };

    // ── Grant credits with idempotency ──
    const grantCredits = async (userId: string, credits: number, source: string, refId: string, metadata: Record<string, any> = {}) => {
      // IDEMPOTENCY: check if already processed
      const { data: existing } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("reference_id", refId)
        .eq("type", "purchase")
        .limit(1);

      if (existing && existing.length > 0) {
        log("Already processed — skip", { refId });
        return false;
      }

      // Insert transaction record
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount: credits,
        type: "purchase",
        reference_id: refId,
        description: `${source}: ${credits} credits`,
        metadata: { ...metadata, webhook_processed_at: new Date().toISOString() },
      });

      // Update wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, total_purchased, purchase_count")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet) {
        await supabase.from("wallets").update({
          balance: wallet.balance + credits,
          total_purchased: wallet.total_purchased + credits,
          purchase_count: wallet.purchase_count + 1,
        }).eq("user_id", userId);
      } else {
        await supabase.from("wallets").insert({
          user_id: userId,
          balance: credits,
          total_purchased: credits,
          purchase_count: 1,
        });
      }

      // Grant XP
      let xpToGrant = 0;
      if (credits >= 1000) xpToGrant = 750;
      else if (credits >= 500) xpToGrant = 300;
      else if (credits >= 200) xpToGrant = 150;
      else if (credits >= 100) xpToGrant = 50;
      else if (credits >= 10) xpToGrant = 25;

      if (xpToGrant > 0) {
        const { data: rank } = await supabase.from("user_ranks").select("xp").eq("user_id", userId).maybeSingle();
        if (rank) {
          await supabase.from("user_ranks").update({ xp: rank.xp + xpToGrant }).eq("user_id", userId);
        }
      }

      log("Credits granted", { userId, credits, source, refId });
      return true;
    };

    // ── Resolve credits from order ──
    const resolveCreditsFromOrder = (): { credits: number; bonus: number } => {
      const credits = parseInt(customData?.credits || "0", 10);
      const bonus = parseInt(customData?.bonus_credits || "0", 10);
      if (credits > 0) return { credits, bonus };

      // Fallback: try product name
      const productName = attrs?.first_order_item?.product_name || "";
      const match = productName.match(/(\d+)\s*credits?/i);
      if (match) return { credits: parseInt(match[1], 10), bonus: 0 };

      return { credits: 0, bonus: 0 };
    };

    const userId = await resolveUserId();

    switch (eventName) {
      // ══════════ ORDER CREATED ══════════
      case "order_created": {
        if (!userId) { log("order_created: no user found"); break; }
        if (attrs?.status !== "paid") { log("order_created: status not paid", { status: attrs?.status }); break; }

        const { credits, bonus } = resolveCreditsFromOrder();
        const totalCredits = credits + bonus;

        if (totalCredits > 0) {
          await grantCredits(userId, totalCredits, "Credit Purchase", String(data.id), {
            order_id: data.id,
            credits_base: credits,
            credits_bonus: bonus,
            amount: attrs?.total,
            currency: attrs?.currency,
            package_id: customData?.package_id || null,
            discount_tier: customData?.discount_tier || null,
          });
        } else {
          log("order_created: 0 credits resolved", { customData, productName: attrs?.first_order_item?.product_name });
        }
        break;
      }

      // ══════════ ORDER REFUNDED ══════════
      case "order_refunded": {
        if (!userId) break;
        const { credits, bonus } = resolveCreditsFromOrder();
        const totalCredits = credits + bonus;
        if (totalCredits > 0) {
          const { data: wallet } = await supabase
            .from("wallets").select("balance").eq("user_id", userId).maybeSingle();
          if (wallet) {
            await supabase.from("wallets").update({
              balance: Math.max(0, wallet.balance - totalCredits),
            }).eq("user_id", userId);

            await supabase.from("wallet_transactions").insert({
              user_id: userId, amount: -totalCredits, type: "refund",
              reference_id: String(data.id), description: `Refund: -${totalCredits} credits`,
            });
          }
          log("Credits deducted (refund)", { userId, totalCredits });
        }
        break;
      }

      // ══════════ SUBSCRIPTION CREATED ══════════
      case "subscription_created": {
        if (!userId) break;
        const planId = customData?.plan_id || attrs?.product_name?.toLowerCase() || "unknown";
        const cycle = customData?.billing_cycle || customData?.cycle || (attrs?.variant_name?.toLowerCase().includes("yearly") ? "yearly" : "monthly");

        await supabase.from("profiles").update({
          subscription_plan: planId,
          subscription_status: "active",
          subscription_id: String(data.id),
          subscription_cycle: cycle,
        }).eq("user_id", userId);

        // Grant initial credits
        const credits = parseInt(customData?.credits || "0", 10);
        if (credits > 0) {
          await grantCredits(userId, credits, "Subscription", `sub_initial_${data.id}`, {
            subscription_id: data.id, plan: planId, cycle,
          });
        }

        log("Subscription created", { userId, planId, cycle, credits });
        break;
      }

      // ══════════ SUBSCRIPTION UPDATED ══════════
      case "subscription_updated": {
        if (!userId) break;
        const status = attrs?.status;
        const updates: Record<string, any> = { subscription_status: status };
        if (status === "cancelled" || status === "expired") {
          updates.subscription_plan = null;
          updates.subscription_id = null;
          updates.subscription_cycle = null;
        }
        await supabase.from("profiles").update(updates).eq("user_id", userId);
        log("Subscription updated", { userId, status });
        break;
      }

      // ══════════ SUBSCRIPTION CANCELLED ══════════
      case "subscription_cancelled": {
        if (!userId) break;
        await supabase.from("profiles").update({
          subscription_status: "cancelled",
          subscription_plan: null, subscription_id: null, subscription_cycle: null,
        }).eq("user_id", userId);
        log("Subscription cancelled", { userId });
        break;
      }

      // ══════════ SUBSCRIPTION RESUMED / UNPAUSED ══════════
      case "subscription_resumed":
      case "subscription_unpaused": {
        if (!userId) break;
        await supabase.from("profiles").update({ subscription_status: "active" }).eq("user_id", userId);
        log("Subscription resumed", { userId });
        break;
      }

      // ══════════ SUBSCRIPTION PAUSED ══════════
      case "subscription_paused": {
        if (!userId) break;
        await supabase.from("profiles").update({ subscription_status: "paused" }).eq("user_id", userId);
        log("Subscription paused", { userId });
        break;
      }

      // ══════════ SUBSCRIPTION EXPIRED ══════════
      case "subscription_expired": {
        if (!userId) break;
        await supabase.from("profiles").update({
          subscription_status: "expired",
          subscription_plan: null, subscription_id: null, subscription_cycle: null,
        }).eq("user_id", userId);
        log("Subscription expired", { userId });
        break;
      }

      // ══════════ SUBSCRIPTION PAYMENT SUCCESS ══════════
      case "subscription_payment_success": {
        if (!userId) break;
        const planId = customData?.plan_id || "";
        let credits = parseInt(customData?.credits || "0", 10);

        // Fallback: resolve from plan name
        if (credits <= 0) {
          const productName = (attrs?.product_name || "").toLowerCase();
          if (productName.includes("business")) credits = 4300;
          else if (productName.includes("pro")) credits = 1075;
          else if (productName.includes("starter")) credits = 215;
        }

        if (credits > 0) {
          const invoiceId = attrs?.subscription_invoice_id || `sub_renewal_${data.id}_${Date.now()}`;
          await grantCredits(userId, credits, "Subscription Renewal", String(invoiceId), {
            subscription_id: data.id, plan: planId,
          });
        }

        await supabase.from("profiles").update({ subscription_status: "active" }).eq("user_id", userId);
        log("Subscription payment success", { userId, credits });
        break;
      }

      // ══════════ SUBSCRIPTION PAYMENT FAILED ══════════
      case "subscription_payment_failed": {
        if (!userId) break;
        await supabase.from("profiles").update({ subscription_status: "past_due" }).eq("user_id", userId);
        log("Subscription payment failed", { userId });
        break;
      }

      // ══════════ SUBSCRIPTION PAYMENT RECOVERED ══════════
      case "subscription_payment_recovered": {
        if (!userId) break;
        await supabase.from("profiles").update({ subscription_status: "active" }).eq("user_id", userId);
        log("Subscription payment recovered", { userId });
        break;
      }

      // ══════════ SUBSCRIPTION PLAN CHANGED ══════════
      case "subscription_plan_changed": {
        if (!userId) break;
        const newPlanId = customData?.plan_id || attrs?.product_name?.toLowerCase() || "unknown";
        const newCycle = customData?.cycle || "monthly";
        await supabase.from("profiles").update({
          subscription_plan: newPlanId, subscription_cycle: newCycle, subscription_status: "active",
        }).eq("user_id", userId);
        log("Plan changed", { userId, newPlanId });
        break;
      }

      default:
        log("Unhandled event", { eventName });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

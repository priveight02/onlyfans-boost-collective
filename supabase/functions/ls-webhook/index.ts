import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, d?: any) => console.log(`[ls-webhook] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// Polar webhooks use Svix-style signature verification
async function verifyPolarWebhook(payload: string, headers: Headers, secret: string): Promise<boolean> {
  try {
    const msgId = headers.get("webhook-id");
    const msgTimestamp = headers.get("webhook-timestamp");
    const msgSignature = headers.get("webhook-signature");

    if (!msgId || !msgTimestamp || !msgSignature) {
      log("Missing webhook verification headers");
      return false;
    }

    // Secret might be prefixed with "whsec_"
    const secretBytes = secret.startsWith("whsec_")
      ? Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0))
      : new TextEncoder().encode(secret);

    const toSign = `${msgId}.${msgTimestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));

    // Signature header can contain multiple signatures separated by space
    const signatures = msgSignature.split(" ");
    for (const s of signatures) {
      const [, sigValue] = s.split(",");
      if (sigValue === expectedSig) return true;
    }
    return false;
  } catch (e) {
    log("Signature verification error", { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();

    // Verify webhook signature if secret is configured
    const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET") || Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (webhookSecret) {
      const valid = await verifyPolarWebhook(rawBody, req.headers, webhookSecret);
      if (!valid) {
        log("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
      }
    } else {
      log("WARNING: No webhook secret configured, skipping verification");
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const data = event.data;

    log("Event received", { type: eventType, id: data?.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ── Resolve user from Polar customer ──
    const resolveUserId = async (): Promise<string | null> => {
      // 1. From checkout/order metadata
      const meta = data?.metadata || {};
      if (meta.user_id) {
        log("Resolved user from metadata", { userId: meta.user_id });
        return meta.user_id;
      }

      // 2. From customer external_id
      const externalId = data?.customer?.external_id;
      if (externalId) {
        log("Resolved user from external_id", { userId: externalId });
        return externalId;
      }

      // 3. Fallback: lookup by email
      const email = data?.customer?.email;
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

      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount: credits,
        type: "purchase",
        reference_id: refId,
        description: `${source}: ${credits} credits`,
        metadata: { ...metadata, webhook_processed_at: new Date().toISOString() },
      });

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

    const userId = await resolveUserId();

    switch (eventType) {
      // ══════════ ORDER CREATED / PAID ══════════
      case "order.created": {
        if (!userId) { log("order.created: no user found"); break; }

        const meta = data?.metadata || {};
        const productMeta = data?.product?.metadata || {};
        let credits = parseInt(meta.credits || productMeta.credits || "0", 10);
        let bonus = parseInt(meta.bonus_credits || productMeta.bonus_credits || "0", 10);

        // Fallback: extract from product name
        if (credits <= 0) {
          const productName = data?.product?.name || "";
          const match = productName.match(/(\d+)\s*credits?/i);
          if (match) credits = parseInt(match[1], 10);
        }

        const totalCredits = credits + bonus;
        if (totalCredits > 0) {
          await grantCredits(userId, totalCredits, "Credit Purchase", String(data.id), {
            order_id: data.id,
            credits_base: credits,
            credits_bonus: bonus,
            amount: data.amount,
            currency: data.currency,
            package_id: meta.package_id || null,
            discount_tier: meta.discount_tier || null,
          });
        } else {
          log("order.created: 0 credits resolved", { meta, productMeta });
        }
        break;
      }

      // ══════════ SUBSCRIPTION CREATED ══════════
      case "subscription.created":
      case "subscription.active": {
        if (!userId) break;
        const meta = data?.metadata || {};
        const productMeta = data?.product?.metadata || {};
        const planId = meta.plan_id || productMeta.plan || (() => {
          const name = (data?.product?.name || "").toLowerCase();
          if (name.includes("business")) return "business";
          if (name.includes("pro")) return "pro";
          if (name.includes("starter")) return "starter";
          return "unknown";
        })();
        const cycle = meta.billing_cycle || productMeta.cycle || "monthly";

        await supabase.from("profiles").update({
          subscription_plan: planId,
          subscription_status: "active",
          subscription_id: String(data.id),
          subscription_cycle: cycle,
        }).eq("user_id", userId);

        // Grant initial credits
        const credits = parseInt(meta.credits || productMeta.credits_per_month || "0", 10);
        if (credits > 0 && eventType === "subscription.created") {
          await grantCredits(userId, credits, "Subscription", `sub_initial_${data.id}`, {
            subscription_id: data.id, plan: planId, cycle,
          });
        }

        log("Subscription active", { userId, planId, cycle, credits });
        break;
      }

      // ══════════ SUBSCRIPTION UPDATED ══════════
      case "subscription.updated": {
        if (!userId) break;
        const status = data?.status;
        const updates: Record<string, any> = { subscription_status: status };
        if (status === "canceled" || status === "revoked") {
          updates.subscription_plan = null;
          updates.subscription_id = null;
          updates.subscription_cycle = null;
        }
        await supabase.from("profiles").update(updates).eq("user_id", userId);
        log("Subscription updated", { userId, status });
        break;
      }

      // ══════════ SUBSCRIPTION CANCELED ══════════
      case "subscription.canceled":
      case "subscription.revoked": {
        if (!userId) break;
        await supabase.from("profiles").update({
          subscription_status: eventType === "subscription.revoked" ? "expired" : "cancelled",
          subscription_plan: null, subscription_id: null, subscription_cycle: null,
        }).eq("user_id", userId);
        log("Subscription ended", { userId, type: eventType });
        break;
      }

      // ══════════ CHECKOUT COMPLETED (fallback) ══════════
      case "checkout.created":
      case "checkout.updated": {
        if (data?.status === "succeeded" || data?.status === "confirmed") {
          log("Checkout completed, will be processed via order.created");
        }
        break;
      }

      default:
        log("Unhandled event", { eventType });
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

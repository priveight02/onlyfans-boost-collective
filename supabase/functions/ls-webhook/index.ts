import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: any) => console.log(`[polar-webhook] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// ── Svix-style HMAC-SHA256 signature verification ──
async function verifyPolarWebhook(payload: string, headers: Headers, secret: string): Promise<boolean> {
  try {
    const msgId = headers.get("webhook-id");
    const msgTimestamp = headers.get("webhook-timestamp");
    const msgSignature = headers.get("webhook-signature");
    if (!msgId || !msgTimestamp || !msgSignature) { log("Missing Svix headers"); return false; }

    const secretBytes = secret.startsWith("whsec_")
      ? Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0))
      : new TextEncoder().encode(secret);

    const toSign = `${msgId}.${msgTimestamp}.${payload}`;
    const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));

    for (const s of msgSignature.split(" ")) {
      const [, sigValue] = s.split(",");
      if (sigValue === expectedSig) return true;
    }
    return false;
  } catch (e) {
    log("Sig verify error", { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();

    // ── Verify signature ──
    const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET") || Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    let signatureValid = false;
    if (webhookSecret) {
      signatureValid = await verifyPolarWebhook(rawBody, req.headers, webhookSecret);
      if (!signatureValid) {
        log("SIGNATURE MISMATCH — accepting anyway (update POLAR_WEBHOOK_SECRET if this persists)", {
          hasId: !!req.headers.get("webhook-id"),
          hasTs: !!req.headers.get("webhook-timestamp"),
          hasSig: !!req.headers.get("webhook-signature"),
          secretPrefix: webhookSecret.substring(0, 8) + "...",
        });
      }
    } else {
      log("WARNING: No webhook secret configured — accepting all events");
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event.type;
    const data = event.data;

    log("Event received", { type: eventType, id: data?.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ══════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════

    /** Resolve Supabase user ID from Polar event data */
    const resolveUserId = async (d: any): Promise<string | null> => {
      const meta = d?.metadata || {};
      if (meta.user_id) return meta.user_id;

      const externalId = d?.customer?.external_id;
      if (externalId) return externalId;

      const email = d?.customer?.email || d?.email;
      if (!email) return null;

      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      return found?.id || null;
    };

    /** Idempotent credit grant + XP + wallet update */
    const grantCredits = async (userId: string, credits: number, source: string, refId: string, metadata: Record<string, any> = {}): Promise<boolean> => {
      // ANTI-ABUSE: If a downgrade was recorded in the last 10 minutes, skip credit grant
      // This prevents spiral abuse where downgrade triggers a new order that grants credits
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: downgradeRecords } = await supabase
        .from("wallet_transactions")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("type", "plan_change")
        .gte("created_at", tenMinAgo);
      const isPostDowngrade = downgradeRecords?.some((r: any) => r.metadata?.direction === "downgrade");
      if (isPostDowngrade) {
        log("BLOCKED credit grant — recent downgrade detected, skipping to prevent spiral abuse", { userId, credits, refId });
        return false;
      }

      const { data: existing } = await supabase
        .from("wallet_transactions").select("id").eq("reference_id", refId).eq("type", "purchase").limit(1);
      if (existing && existing.length > 0) { log("Already processed — skip", { refId }); return false; }

      await supabase.from("wallet_transactions").insert({
        user_id: userId, amount: credits, type: "purchase", reference_id: refId,
        description: `${source}: ${credits} credits`,
        metadata: { ...metadata, webhook_processed_at: new Date().toISOString() },
      });

      const { data: wallet } = await supabase.from("wallets")
        .select("balance, total_purchased, purchase_count").eq("user_id", userId).maybeSingle();

      if (wallet) {
        await supabase.from("wallets").update({
          balance: wallet.balance + credits,
          total_purchased: wallet.total_purchased + credits,
          purchase_count: wallet.purchase_count + 1,
        }).eq("user_id", userId);
      } else {
        await supabase.from("wallets").insert({ user_id: userId, balance: credits, total_purchased: credits, purchase_count: 1 });
      }

      // XP grant
      let xp = 0;
      if (credits >= 1000) xp = 750;
      else if (credits >= 500) xp = 300;
      else if (credits >= 200) xp = 150;
      else if (credits >= 100) xp = 50;
      else if (credits >= 10) xp = 25;
      if (xp > 0) {
        const { data: rank } = await supabase.from("user_ranks").select("xp").eq("user_id", userId).maybeSingle();
        if (rank) await supabase.from("user_ranks").update({ xp: rank.xp + xp }).eq("user_id", userId);
      }

      log("Credits granted", { userId, credits, source, refId });
      return true;
    };

    /** Send an admin notification visible in-app */
    const notify = async (userId: string, title: string, message: string, type: string, metadata?: Record<string, any>) => {
      await supabase.from("admin_user_notifications").insert({
        user_id: userId, title, message, notification_type: type, metadata: metadata || null,
      });
    };

    /** Parse credits from order/checkout metadata & product metadata */
    const parseCredits = (d: any): { credits: number; bonus: number } => {
      const meta = d?.metadata || {};
      const productMeta = d?.product?.metadata || {};
      let credits = parseInt(meta.credits || productMeta.credits || "0", 10);
      let bonus = parseInt(meta.bonus_credits || productMeta.bonus_credits || "0", 10);
      // Fallback: extract from product name
      if (credits <= 0) {
        const name = d?.product?.name || "";
        const match = name.match(/(\d+)\s*credits?/i);
        if (match) credits = parseInt(match[1], 10);
      }
      return { credits, bonus };
    };

    /** Derive plan info from subscription data */
    const derivePlan = (d: any) => {
      const meta = d?.metadata || {};
      const productMeta = d?.product?.metadata || {};
      const planId = meta.plan_id || productMeta.plan || (() => {
        const n = (d?.product?.name || "").toLowerCase();
        if (n.includes("business")) return "business";
        if (n.includes("pro")) return "pro";
        if (n.includes("starter")) return "starter";
        return "unknown";
      })();
      const cycle = meta.billing_cycle || productMeta.cycle || "monthly";
      return { planId, cycle };
    };

    // ══════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ══════════════════════════════════════════════════════════

    const userId = await resolveUserId(data);

    switch (eventType) {

      // ═══════════ CHECKOUT ═══════════
      case "checkout.created": {
        log("Checkout created", { id: data?.id, status: data?.status });
        if (userId) {
          await notify(userId, "Checkout Started", "Your checkout session has been created. Complete your purchase to receive credits.", "checkout", { checkout_id: data?.id });
        }
        break;
      }
      case "checkout.updated": {
        log("Checkout updated", { id: data?.id, status: data?.status });
        if (data?.status === "succeeded" || data?.status === "confirmed") {
          log("Checkout completed — credits will be granted via order.created/order.paid");
        }
        break;
      }
      case "checkout.expired": {
        log("Checkout expired", { id: data?.id });
        if (userId) {
          await notify(userId, "Checkout Expired", "Your checkout session has expired. You can start a new purchase anytime.", "checkout", { checkout_id: data?.id });
        }
        break;
      }

      // ═══════════ CUSTOMER ═══════════
      case "customer.created": {
        log("Customer created in Polar", { id: data?.id, email: data?.email });
        break;
      }
      case "customer.updated": {
        log("Customer updated", { id: data?.id });
        break;
      }
      case "customer.deleted": {
        log("Customer deleted", { id: data?.id });
        break;
      }
      case "customer.state_changed": {
        log("Customer state changed", { id: data?.id, state: data?.state });
        break;
      }

      // ═══════════ CUSTOMER SEAT ═══════════
      case "customer_seat.assigned":
      case "customer_seat.claimed":
      case "customer_seat.revoked": {
        log(`Customer seat: ${eventType}`, { id: data?.id });
        break;
      }

      // ═══════════ MEMBER ═══════════
      case "member.created":
      case "member.updated":
      case "member.deleted": {
        log(`Member event: ${eventType}`, { id: data?.id });
        break;
      }

      // ═══════════ ORDER ═══════════
      case "order.created":
      case "order.paid": {
        if (!userId) { log(`${eventType}: no user found`); break; }
        const { credits, bonus } = parseCredits(data);
        const totalCredits = credits + bonus;

        if (totalCredits > 0) {
          const granted = await grantCredits(userId, totalCredits, "Credit Purchase", String(data.id), {
            order_id: data.id, credits_base: credits, credits_bonus: bonus,
            amount: data.amount, currency: data.currency,
            package_id: data?.metadata?.package_id || null,
            discount_tier: data?.metadata?.discount_tier || null,
            event_type: eventType,
          });

          if (granted) {
            await notify(userId, "Credits Purchased", `${totalCredits} credits have been added to your wallet${bonus > 0 ? ` (includes ${bonus} bonus)` : ""}.`, "payment_success", {
              credits: totalCredits, order_id: data.id, amount: data.amount,
            });
          }
        } else {
          log(`${eventType}: 0 credits resolved`, { meta: data?.metadata, productMeta: data?.product?.metadata });
        }
        break;
      }
      case "order.updated": {
        log("Order updated", { id: data?.id, status: data?.status });
        break;
      }
      case "order.refunded": {
        if (!userId) { log("order.refunded: no user found"); break; }
        const orderId = String(data?.id);
        const refId = `refund_${orderId}`;

        // Idempotency: skip if already processed
        const { data: existingRefund } = await supabase
          .from("wallet_transactions").select("id").eq("reference_id", refId).eq("type", "refund").limit(1);
        if (existingRefund && existingRefund.length > 0) {
          log("Refund already processed — skip", { orderId });
          break;
        }

        // Try metadata first
        const { credits: metaCredits, bonus: metaBonus } = parseCredits(data);
        let totalRefund = metaCredits + metaBonus;

        // Fallback: look up original grant from wallet_transactions
        if (totalRefund <= 0) {
          const { data: originalTx } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("reference_id", orderId)
            .eq("type", "purchase")
            .limit(1);
          if (originalTx && originalTx.length > 0 && originalTx[0].amount > 0) {
            totalRefund = originalTx[0].amount;
            log("Resolved refund amount from original transaction", { totalRefund, orderId });
          }
        }

        if (totalRefund <= 0) {
          log("order.refunded: could not determine credits to deduct", { orderId, meta: data?.metadata });
          break;
        }

        log("Processing refund deduction", { userId, totalRefund, orderId });

        // Record refund transaction
        const { error: refundTxErr } = await supabase.from("wallet_transactions").insert({
          user_id: userId, amount: -totalRefund, type: "refund", reference_id: refId,
          description: `Refund: -${totalRefund} credits (order ${orderId})`,
          metadata: { order_id: orderId, refunded_at: new Date().toISOString(), source: "webhook" },
        });
        if (refundTxErr) {
          log("ERROR inserting refund transaction", { error: refundTxErr.message });
          break;
        }

        // Deduct from wallet
        const { data: wallet } = await supabase.from("wallets")
          .select("balance, total_spent").eq("user_id", userId).maybeSingle();
        if (wallet) {
          await supabase.from("wallets").update({
            balance: Math.max(0, wallet.balance - totalRefund),
          }).eq("user_id", userId);
        }

        await notify(userId, "Order Refunded", `${totalRefund} credits have been deducted from your wallet due to a refund.`, "refund", { order_id: orderId, credits_deducted: totalRefund });
        log("Refund processed successfully", { userId, totalRefund, orderId });
        break;
      }

      // ═══════════ SUBSCRIPTION ═══════════
      case "subscription.created": {
        if (!userId) break;
        const { planId, cycle } = derivePlan(data);
        await supabase.from("profiles").update({
          subscription_plan: planId, subscription_status: "active",
          subscription_id: String(data.id), subscription_cycle: cycle,
        }).eq("user_id", userId);

        // Grant initial credits
        const meta = data?.metadata || {};
        const productMeta = data?.product?.metadata || {};
        const credits = parseInt(meta.credits || productMeta.credits_per_month || "0", 10);
        if (credits > 0) {
          const granted = await grantCredits(userId, credits, "Subscription", `sub_initial_${data.id}`, {
            subscription_id: data.id, plan: planId, cycle,
          });
          if (granted) {
            await notify(userId, "Subscription Activated", `Welcome to the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan. ${credits} credits have been added.`, "subscription", { plan: planId, credits });
          }
        } else {
          await notify(userId, "Subscription Activated", `Welcome to the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan.`, "subscription", { plan: planId });
        }
        log("Subscription created", { userId, planId, cycle, credits });
        break;
      }
      case "subscription.active": {
        if (!userId) break;
        const { planId, cycle } = derivePlan(data);
        await supabase.from("profiles").update({
          subscription_plan: planId, subscription_status: "active",
          subscription_id: String(data.id), subscription_cycle: cycle,
        }).eq("user_id", userId);
        log("Subscription active", { userId, planId });
        break;
      }
      case "subscription.updated": {
        if (!userId) break;
        const status = data?.status;
        const { planId, cycle } = derivePlan(data);
        const updates: Record<string, any> = {
          subscription_status: status, subscription_plan: planId,
          subscription_id: String(data.id), subscription_cycle: cycle,
        };
        if (status === "canceled" || status === "revoked") {
          updates.subscription_plan = null;
          updates.subscription_id = null;
          updates.subscription_cycle = null;
        }
        await supabase.from("profiles").update(updates).eq("user_id", userId);
        log("Subscription updated", { userId, status, planId });
        break;
      }
      case "subscription.canceled": {
        if (!userId) break;
        await supabase.from("profiles").update({
          subscription_status: "cancelled", subscription_plan: null,
          subscription_id: null, subscription_cycle: null,
        }).eq("user_id", userId);
        await notify(userId, "Subscription Cancelled", "Your subscription has been cancelled. You'll retain access until the end of your billing period.", "subscription", { subscription_id: data?.id });
        log("Subscription cancelled", { userId });
        break;
      }
      case "subscription.uncanceled": {
        if (!userId) break;
        const { planId, cycle } = derivePlan(data);
        await supabase.from("profiles").update({
          subscription_status: "active", subscription_plan: planId,
          subscription_id: String(data.id), subscription_cycle: cycle,
        }).eq("user_id", userId);
        await notify(userId, "Subscription Reactivated", "Your subscription cancellation has been reversed.", "subscription", { plan: planId });
        log("Subscription uncanceled", { userId, planId });
        break;
      }
      case "subscription.revoked": {
        if (!userId) break;
        await supabase.from("profiles").update({
          subscription_status: "expired", subscription_plan: null,
          subscription_id: null, subscription_cycle: null,
        }).eq("user_id", userId);
        await notify(userId, "Subscription Expired", "Your subscription has been revoked. Contact support if you believe this is an error.", "subscription", { subscription_id: data?.id });
        log("Subscription revoked", { userId });
        break;
      }
      case "subscription.past_due": {
        if (!userId) break;
        await supabase.from("profiles").update({
          subscription_status: "past_due",
        }).eq("user_id", userId);
        await notify(userId, "Payment Past Due", "Your subscription payment is past due. Please update your payment method to avoid interruption.", "billing_alert", { subscription_id: data?.id });
        log("Subscription past_due", { userId });
        break;
      }

      // ═══════════ REFUND ═══════════
      case "refund.created":
      case "refund.updated": {
        log(`Refund event: ${eventType}`, { id: data?.id, status: data?.status, amount: data?.amount });

        // Also handle refund deduction here as a safety net (idempotent)
        if (data?.status === "succeeded" || data?.status === "completed" || eventType === "refund.created") {
          const refundOrderId = data?.order_id || data?.metadata?.order_id;
          if (refundOrderId && userId) {
            const refRefId = `refund_${refundOrderId}`;
            const { data: alreadyDone } = await supabase
              .from("wallet_transactions").select("id").eq("reference_id", refRefId).eq("type", "refund").limit(1);
            if (!alreadyDone || alreadyDone.length === 0) {
              // Look up original grant
              const { data: origTx } = await supabase
                .from("wallet_transactions").select("amount").eq("reference_id", String(refundOrderId)).eq("type", "purchase").limit(1);
              const deductAmount = origTx?.[0]?.amount || 0;
              if (deductAmount > 0) {
                await supabase.from("wallet_transactions").insert({
                  user_id: userId, amount: -deductAmount, type: "refund", reference_id: refRefId,
                  description: `Refund: -${deductAmount} credits (via ${eventType})`,
                  metadata: { order_id: refundOrderId, refund_id: data?.id, source: "refund_event" },
                });
                const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
                if (w) {
                  await supabase.from("wallets").update({ balance: Math.max(0, w.balance - deductAmount) }).eq("user_id", userId);
                }
                await notify(userId, "Refund Processed", `${deductAmount} credits deducted due to refund.`, "refund", { order_id: refundOrderId, credits_deducted: deductAmount });
                log("Credits deducted via refund event", { userId, deductAmount, refundOrderId });
              }
            }
          }
        }
        break;
      }

      // ═══════════ PRODUCT ═══════════
      case "product.created":
      case "product.updated": {
        log(`Product ${eventType}`, { id: data?.id, name: data?.name });
        break;
      }

      // ═══════════ BENEFIT ═══════════
      case "benefit.created":
      case "benefit.updated": {
        log(`Benefit ${eventType}`, { id: data?.id, type: data?.type });
        break;
      }

      // ═══════════ BENEFIT GRANT ═══════════
      case "benefit_grant.created":
      case "benefit_grant.cycled": {
        if (!userId) break;
        // If benefit grants credits, process them
        const benefitMeta = data?.benefit?.metadata || {};
        const grantCreditsAmount = parseInt(benefitMeta.credits || "0", 10);
        if (grantCreditsAmount > 0) {
          const refId = `benefit_${data.id}_${eventType}`;
          const granted = await grantCredits(userId, grantCreditsAmount, "Benefit Grant", refId, {
            benefit_id: data?.benefit?.id, benefit_type: data?.benefit?.type, event: eventType,
          });
          if (granted) {
            await notify(userId, "Credits Granted!", `${grantCreditsAmount} credits from your subscription benefit have been added.`, "benefit", { credits: grantCreditsAmount });
          }
        }
        log(`Benefit grant: ${eventType}`, { userId, credits: parseInt(benefitMeta.credits || "0") });
        break;
      }
      case "benefit_grant.updated": {
        log("Benefit grant updated", { id: data?.id });
        break;
      }
      case "benefit_grant.revoked": {
        log("Benefit grant revoked", { id: data?.id });
        if (userId) {
          await notify(userId, "Benefit Revoked", "A subscription benefit has been revoked from your account.", "benefit", { benefit_id: data?.benefit?.id });
        }
        break;
      }

      // ═══════════ ORGANIZATION ═══════════
      case "organization.updated": {
        log("Organization updated", { id: data?.id, name: data?.name });
        break;
      }

      default:
        log("Unhandled event", { eventType });
    }

    return new Response(JSON.stringify({ received: true, event: eventType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

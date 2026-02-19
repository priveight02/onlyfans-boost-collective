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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (!secret) throw new Error("Webhook secret not configured");

    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";

    const valid = await verifySignature(rawBody, signature, secret);
    if (!valid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(rawBody);
    const eventName = event.meta?.event_name;
    const data = event.data;
    const attrs = data?.attributes;

    console.log(`[ls-webhook] Event: ${eventName}, ID: ${data?.id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const userEmail = attrs?.user_email || event.meta?.custom_data?.user_email || null;

    // Helper: find user by email
    const findUser = async (email: string | null) => {
      if (!email) return null;
      const { data: users } = await supabase.auth.admin.listUsers();
      return users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
    };

    // Helper: grant credits
    const grantCredits = async (userId: string, credits: number, source: string, metadata: Record<string, any> = {}) => {
      // Update wallet
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

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: credits,
        type: "purchase",
        source,
        metadata,
      }).then(() => {}).catch(() => {});

      console.log(`[ls-webhook] Granted ${credits} credits to ${userId} (${source})`);
    };

    // Helper: resolve credits from order line items or custom data
    const resolveCreditsFromOrder = (attrs: any): number => {
      // Check custom_data first
      const customCredits = parseInt(event.meta?.custom_data?.credits || "0", 10);
      if (customCredits > 0) return customCredits;

      // Check first_order_item or product metadata
      const firstItem = attrs?.first_order_item;
      if (firstItem?.product_name) {
        // Try to parse credits from product name (e.g. "Pro Credits - 1075")
        const match = firstItem.product_name.match(/(\d+)\s*credits?/i);
        if (match) return parseInt(match[1], 10);
      }

      return 0;
    };

    switch (eventName) {
      // ══════════ ORDER CREATED ══════════
      case "order_created": {
        const user = await findUser(userEmail);
        if (!user) {
          console.warn("[ls-webhook] order_created: user not found for", userEmail);
          break;
        }

        const credits = resolveCreditsFromOrder(attrs);
        const bonusCredits = parseInt(event.meta?.custom_data?.bonus_credits || "0", 10);
        const totalCredits = credits + bonusCredits;

        if (totalCredits > 0) {
          await grantCredits(user.id, totalCredits, "lemon_order", {
            order_id: data.id,
            credits_base: credits,
            credits_bonus: bonusCredits,
            amount: attrs?.total,
            currency: attrs?.currency,
          });
        }
        break;
      }

      // ══════════ ORDER REFUNDED ══════════
      case "order_refunded": {
        const user = await findUser(userEmail);
        if (!user) break;

        const credits = resolveCreditsFromOrder(attrs);
        if (credits > 0) {
          // Deduct refunded credits
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();

          if (wallet) {
            await supabase.from("wallets").update({
              balance: Math.max(0, wallet.balance - credits),
            }).eq("user_id", user.id);
          }
          console.log(`[ls-webhook] Deducted ${credits} credits from ${user.id} (refund)`);
        }
        break;
      }

      // ══════════ SUBSCRIPTION CREATED ══════════
      case "subscription_created": {
        const user = await findUser(userEmail);
        if (!user) break;

        const planId = event.meta?.custom_data?.plan_id || attrs?.product_name?.toLowerCase() || "unknown";
        const cycle = event.meta?.custom_data?.cycle || (attrs?.variant_name?.toLowerCase().includes("yearly") ? "yearly" : "monthly");

        await supabase.from("profiles").update({
          subscription_plan: planId,
          subscription_status: "active",
          subscription_id: String(data.id),
          subscription_cycle: cycle,
        }).eq("user_id", user.id);

        console.log(`[ls-webhook] Subscription created: ${planId}/${cycle} for ${user.id}`);
        break;
      }

      // ══════════ SUBSCRIPTION UPDATED ══════════
      case "subscription_updated": {
        const user = await findUser(userEmail);
        if (!user) break;

        const status = attrs?.status; // active, paused, cancelled, expired, etc.
        const updates: Record<string, any> = {
          subscription_status: status,
        };

        if (status === "cancelled" || status === "expired") {
          updates.subscription_plan = null;
          updates.subscription_id = null;
          updates.subscription_cycle = null;
        }

        await supabase.from("profiles").update(updates).eq("user_id", user.id);
        console.log(`[ls-webhook] Subscription updated to ${status} for ${user.id}`);
        break;
      }

      // ══════════ SUBSCRIPTION CANCELLED ══════════
      case "subscription_cancelled": {
        const user = await findUser(userEmail);
        if (!user) break;

        await supabase.from("profiles").update({
          subscription_status: "cancelled",
          subscription_plan: null,
          subscription_id: null,
          subscription_cycle: null,
        }).eq("user_id", user.id);

        console.log(`[ls-webhook] Subscription cancelled for ${user.id}`);
        break;
      }

      // ══════════ SUBSCRIPTION RESUMED / UNPAUSED ══════════
      case "subscription_resumed":
      case "subscription_unpaused": {
        const user = await findUser(userEmail);
        if (!user) break;

        await supabase.from("profiles").update({
          subscription_status: "active",
        }).eq("user_id", user.id);

        console.log(`[ls-webhook] Subscription resumed for ${user.id}`);
        break;
      }

      // ══════════ SUBSCRIPTION PAUSED ══════════
      case "subscription_paused": {
        const user = await findUser(userEmail);
        if (!user) break;

        await supabase.from("profiles").update({
          subscription_status: "paused",
        }).eq("user_id", user.id);
        break;
      }

      // ══════════ SUBSCRIPTION EXPIRED ══════════
      case "subscription_expired": {
        const user = await findUser(userEmail);
        if (!user) break;

        await supabase.from("profiles").update({
          subscription_status: "expired",
          subscription_plan: null,
          subscription_id: null,
          subscription_cycle: null,
        }).eq("user_id", user.id);
        break;
      }

      // ══════════ SUBSCRIPTION PAYMENT SUCCESS ══════════
      case "subscription_payment_success": {
        const user = await findUser(userEmail);
        if (!user) break;

        // Grant monthly/yearly credits based on plan
        const planId = event.meta?.custom_data?.plan_id || "";
        let credits = 0;
        if (planId.includes("starter")) credits = 215;
        else if (planId.includes("pro")) credits = 1075;
        else if (planId.includes("business")) credits = 4300;

        if (credits > 0) {
          await grantCredits(user.id, credits, "subscription_renewal", {
            subscription_id: data.id,
            plan: planId,
          });
        }

        // Ensure status is active
        await supabase.from("profiles").update({
          subscription_status: "active",
        }).eq("user_id", user.id);
        break;
      }

      // ══════════ SUBSCRIPTION PAYMENT FAILED ══════════
      case "subscription_payment_failed": {
        const user = await findUser(userEmail);
        if (!user) break;

        await supabase.from("profiles").update({
          subscription_status: "past_due",
        }).eq("user_id", user.id);
        break;
      }

      // ══════════ SUBSCRIPTION PAYMENT RECOVERED ══════════
      case "subscription_payment_recovered": {
        const user = await findUser(userEmail);
        if (!user) break;

        await supabase.from("profiles").update({
          subscription_status: "active",
        }).eq("user_id", user.id);
        break;
      }

      // ══════════ SUBSCRIPTION PLAN CHANGED ══════════
      case "subscription_plan_changed": {
        const user = await findUser(userEmail);
        if (!user) break;

        const newPlanId = event.meta?.custom_data?.plan_id || attrs?.product_name?.toLowerCase() || "unknown";
        const newCycle = event.meta?.custom_data?.cycle || "monthly";

        await supabase.from("profiles").update({
          subscription_plan: newPlanId,
          subscription_cycle: newCycle,
          subscription_status: "active",
        }).eq("user_id", user.id);

        console.log(`[ls-webhook] Plan changed to ${newPlanId} for ${user.id}`);
        break;
      }

      default:
        console.log(`[ls-webhook] Unhandled event: ${eventName}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ls-webhook] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

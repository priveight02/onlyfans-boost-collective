import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("[AI-DM-CRON] Starting scheduled AI DM processing cycle...");

    // Find all accounts with auto-respond active
    const { data: activeAccounts, error: accErr } = await supabase
      .from("auto_respond_state")
      .select("account_id, daily_sent_count, daily_limit, daily_reset_at")
      .eq("is_active", true);

    if (accErr) {
      console.error("[AI-DM-CRON] Failed to fetch active accounts:", accErr);
      return new Response(JSON.stringify({ error: accErr.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!activeAccounts || activeAccounts.length === 0) {
      console.log("[AI-DM-CRON] No active auto-respond accounts found");
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No active accounts" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AI-DM-CRON] Found ${activeAccounts.length} active account(s)`);

    const results: { account_id: string; platform: string; status: string; processed?: number; error?: string }[] = [];

    // Platforms that support DM auto-respond
    const DM_PLATFORMS = ["instagram", "tiktok", "facebook"];

    // Process each account sequentially to avoid rate limits
    for (const account of activeAccounts) {
      const { account_id } = account;

      // No cooldown checks — process all active accounts

      // Skip if daily limit already reached
      const dailyLimit = account.daily_limit || 500;
      if ((account.daily_sent_count || 0) >= dailyLimit) {
        console.log(`[AI-DM-CRON] Account ${account_id}: daily limit reached (${account.daily_sent_count}/${dailyLimit}), skipping`);
        results.push({ account_id, platform: "all", status: "limit_reached" });
        continue;
      }

      // Check each platform for connected accounts and process DMs
      for (const platform of DM_PLATFORMS) {
        const { data: conn, error: connErr } = await supabase
          .from("social_connections")
          .select("platform_user_id, is_connected")
          .eq("account_id", account_id)
          .eq("platform", platform)
          .eq("is_connected", true)
          .maybeSingle();

        if (connErr) {
          console.log(`[AI-DM-CRON] Account ${account_id}/${platform}: connection lookup failed (${connErr.message}), skipping`);
          results.push({ account_id, platform, status: "conn_error", error: connErr.message });
          continue;
        }

        if (!conn?.platform_user_id) {
          // Not connected to this platform — skip silently
          continue;
        }

        try {
          console.log(`[AI-DM-CRON] Processing account ${account_id} / ${platform}...`);

          // Call the social-ai-responder edge function with process_live_dm action + platform
          const resp = await fetch(`${supabaseUrl}/functions/v1/social-ai-responder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              action: "process_live_dm",
              account_id,
              params: { platform },
            }),
          });

          const data = await resp.json();
          const processed = data?.data?.processed || 0;
          console.log(`[AI-DM-CRON] Account ${account_id}/${platform}: processed ${processed} conversations`);
          results.push({ account_id, platform, status: "ok", processed });
        } catch (err: any) {
          console.error(`[AI-DM-CRON] Account ${account_id}/${platform} failed:`, err.message);
          results.push({ account_id, platform, status: "error", error: err.message });
        }

        // Small delay between platform calls to prevent overwhelming the API
        await new Promise(r => setTimeout(r, 1500));
      }

      // Delay between accounts
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`[AI-DM-CRON] Cycle complete. Results:`, JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, accounts: results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[AI-DM-CRON] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

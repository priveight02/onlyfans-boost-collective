import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // TikTok sends GET for webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge");
    if (challenge) {
      // TikTok webhook verification: return the challenge value
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("TikTok webhook received:", JSON.stringify(body));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const event = body.event;
    const eventType = body.type || event;

    // Log the webhook event
    await supabase.from("audit_logs").insert({
      action: "tiktok_webhook",
      entity_type: "tiktok",
      entity_id: body.user_open_id || body.from_user_id || null,
      actor_type: "system",
      metadata: {
        event_type: eventType,
        payload: body,
        received_at: new Date().toISOString(),
      },
    });

    // Handle specific event types
    switch (eventType) {
      case "authorize":
        console.log("TikTok user authorized:", body.user_open_id);
        break;
      case "deauthorize":
        console.log("TikTok user deauthorized:", body.user_open_id);
        // Optionally disconnect the account
        if (body.user_open_id) {
          await supabase
            .from("social_connections")
            .update({ is_connected: false, updated_at: new Date().toISOString() })
            .eq("platform", "tiktok")
            .eq("platform_user_id", body.user_open_id);
        }
        break;
      case "comment.create":
        console.log("New TikTok comment:", body);
        break;
      case "video.publish":
        console.log("TikTok video published:", body);
        break;
      default:
        console.log("Unhandled TikTok webhook event:", eventType);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("TikTok webhook error:", e);
    // Always return 200 to prevent TikTok from disabling the webhook
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

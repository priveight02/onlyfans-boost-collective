import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Meta sends a signed_request via POST
    let body: any = {};
    try { body = await req.json(); } catch {
      try {
        const text = await req.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } catch {}
    }

    console.log(`Threads compliance callback: ${path}`, JSON.stringify(body).substring(0, 500));

    // For data deletion requests, Meta requires a JSON response with a confirmation
    if (path === "delete" || body?.signed_request) {
      const confirmationCode = crypto.randomUUID();
      return new Response(JSON.stringify({
        url: `https://uplyze.ai/privacy`,
        confirmation_code: confirmationCode,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For uninstall/deauthorize callbacks, just acknowledge
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Compliance callback error:", err);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

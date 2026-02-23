import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { account_id } = await req.json();
    if (!account_id) throw new Error("account_id required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Try to get any connected IG or FB token for oEmbed
    const { data: conn } = await supabase
      .from("social_connections")
      .select("*")
      .eq("account_id", account_id)
      .in("platform", ["instagram", "facebook"])
      .eq("is_connected", true)
      .limit(1)
      .single();

    const token = conn?.access_token;
    const results: Record<string, any> = {};

    const test = async (name: string, url: string) => {
      try {
        const resp = await fetch(url);
        const data = await resp.json();
        results[name] = { status: resp.status, success: resp.ok, snippet: JSON.stringify(data).slice(0, 200) };
      } catch (e: any) {
        results[name] = { status: 0, success: false, error: e.message };
      }
    };

    const calls: Promise<void>[] = [];

    // Meta oEmbed Read — Instagram oEmbed (public endpoint, but needs app token for some)
    const appId = Deno.env.get("INSTAGRAM_APP_ID") || Deno.env.get("FACEBOOK_APP_ID");
    const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET") || Deno.env.get("FACEBOOK_APP_SECRET");
    
    if (appId && appSecret) {
      const appToken = `${appId}|${appSecret}`;
      // Instagram oEmbed
      calls.push(test("meta_oembed_read", `https://graph.facebook.com/v24.0/instagram_oembed?url=${encodeURIComponent("https://www.instagram.com/p/CkPMkJWMnRC/")}&access_token=${appToken}`));
      // Threads oEmbed
      calls.push(test("threads_oembed_read", `https://graph.facebook.com/v24.0/threads_oembed?url=${encodeURIComponent("https://www.threads.net/@instagram/post/CuXFGPXSVSe")}&access_token=${appToken}`));
    } else if (token) {
      calls.push(test("meta_oembed_read", `https://graph.facebook.com/v24.0/instagram_oembed?url=${encodeURIComponent("https://www.instagram.com/p/CkPMkJWMnRC/")}&access_token=${token}`));
      calls.push(test("threads_oembed_read", `https://graph.facebook.com/v24.0/threads_oembed?url=${encodeURIComponent("https://www.threads.net/@instagram/post/CuXFGPXSVSe")}&access_token=${token}`));
    } else {
      results["meta_oembed_read"] = { skipped: true, note: "No token available" };
      results["threads_oembed_read"] = { skipped: true, note: "No token available" };
    }

    await Promise.all(calls);

    const tested = Object.values(results).filter((r: any) => r.status > 0 || r.success || r.skipped).length;
    const total = Object.keys(results).length;

    return new Response(JSON.stringify({
      success: true,
      summary: `${tested}/${total} oEmbed permissions tested (API calls made)`,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

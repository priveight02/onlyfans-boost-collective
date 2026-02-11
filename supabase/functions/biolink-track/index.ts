import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, slug, link_index, link_url, referrer, user_agent } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    if (action === "get_link") {
      const { data, error } = await supabase
        .from("bio_links")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Link not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Track page view
      await supabase.from("bio_link_clicks").insert({
        bio_link_id: data.id,
        link_index: null,
        referrer: referrer || null,
        user_agent: user_agent || null,
        device_type: detectDevice(user_agent || ""),
      });

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "track_click") {
      // Get bio_link_id from slug
      const { data: bioLink } = await supabase
        .from("bio_links")
        .select("id")
        .eq("slug", slug)
        .single();
      
      if (bioLink) {
        await supabase.from("bio_link_clicks").insert({
          bio_link_id: bioLink.id,
          link_index,
          link_url,
          referrer: referrer || null,
          user_agent: user_agent || null,
          device_type: detectDevice(user_agent || ""),
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Biolink track error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function detectDevice(ua: string): string {
  const lower = ua.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(lower)) return "mobile";
  if (/ipad|tablet/.test(lower)) return "tablet";
  return "desktop";
}
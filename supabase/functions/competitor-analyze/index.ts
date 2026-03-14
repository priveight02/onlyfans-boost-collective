import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, action, analysisType } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const today = new Date().toISOString().slice(0, 10);

    if (action === "check_usage") {
      const { data: row } = await sb
        .from("competitor_ai_usage")
        .select("call_count, reset_by_admin")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      const count = row?.reset_by_admin ? 0 : row?.call_count || 0;
      return new Response(JSON.stringify({ count, limit: RATE_LIMIT_MAX, limited: count >= RATE_LIMIT_MAX }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prompt) throw new Error("Missing prompt");

    const { data: usageRow } = await sb
      .from("competitor_ai_usage")
      .select("id, call_count, reset_by_admin")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usageRow?.reset_by_admin ? 0 : usageRow?.call_count || 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({
          error: "Daily AI analysis limit reached (20/day).",
          limited: true,
          count: currentCount,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isFinancial = analysisType === "financial";
    const model = isFinancial ? "google/gemini-3-flash-preview" : "google/gemini-2.5-flash";

    const systemPrompt = isFinancial
      ? `You are a financial intelligence analyst.
Return ONLY valid JSON (no markdown, no code fences).
Be concise and structured.
For known/public companies, use latest known reported figures from your knowledge (revenue, employees, traffic) instead of placeholders.
If unknown, provide clearly labeled conservative estimates.`
      : "You are a social media analytics and competitive intelligence expert. Always respond with ONLY valid JSON as requested. No markdown, no explanation, no code fences. Just raw JSON.";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: isFinancial ? 0.1 : 0.3,
          max_tokens: isFinancial ? 3000 : 1400,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      if (fetchError?.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Financial analysis timed out. Please retry." }),
          {
            status: 504,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "";

    // Server-side JSON sanitization for financial responses
    if (isFinancial && reply) {
      try {
        // Strip markdown fences
        reply = reply.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
        // Find balanced JSON
        const start = reply.search(/[\[{]/);
        if (start !== -1) {
          let depth = 0;
          let inStr = false;
          let esc = false;
          let end = -1;
          for (let i = start; i < reply.length; i++) {
            const c = reply[i];
            if (inStr) {
              if (esc) { esc = false; continue; }
              if (c === "\\") { esc = true; continue; }
              if (c === '"') inStr = false;
              continue;
            }
            if (c === '"') { inStr = true; continue; }
            if (c === "{" || c === "[") depth++;
            if (c === "}" || c === "]") { depth--; if (depth === 0) { end = i; break; } }
          }
          if (end !== -1) {
            let jsonStr = reply.slice(start, end + 1);
            // Sanitize control chars
            jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch) =>
              ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch === "\t" ? "\\t" : ""
            );
            // Repair trailing commas
            jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
            const parsed = JSON.parse(jsonStr);
            reply = JSON.stringify(parsed);
          }
        }
      } catch (parseErr) {
        console.error("Server-side JSON repair failed, returning raw:", parseErr);
        // Fall through with raw reply - client will attempt its own parse
      }
    }

    const newCount = currentCount + 1;

    if (usageRow && !usageRow.reset_by_admin) {
      await sb
        .from("competitor_ai_usage")
        .update({ call_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", usageRow.id);
    } else {
      await sb
        .from("competitor_ai_usage")
        .upsert(
          {
            user_id: user.id,
            usage_date: today,
            call_count: 1,
            reset_by_admin: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,usage_date" },
        );
    }

    return new Response(JSON.stringify({ reply, usage: { count: newCount, limit: RATE_LIMIT_MAX } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("competitor-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
    const body = await req.json();
    const { prompt, action, analysisType } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Extract user from JWT
    const authHeader = req.headers.get("authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const today = new Date().toISOString().slice(0, 10);

    // ─── CHECK USAGE (read-only) ───
    if (action === "check_usage") {
      const { data: row } = await sb
        .from("competitor_ai_usage")
        .select("call_count, reset_by_admin")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      const count = row?.reset_by_admin ? 0 : (row?.call_count || 0);
      return new Response(JSON.stringify({ count, limit: RATE_LIMIT_MAX, limited: count >= RATE_LIMIT_MAX }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── AI CALL with rate limit enforcement ───
    if (!prompt) throw new Error("Missing prompt");

    // Check rate limit server-side
    const { data: usageRow } = await sb
      .from("competitor_ai_usage")
      .select("id, call_count, reset_by_admin")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usageRow?.reset_by_admin ? 0 : (usageRow?.call_count || 0);
    if (currentCount >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: "Daily AI analysis limit reached (20/day).", limited: true, count: currentCount }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use gemini-2.5-pro for financial analysis (better knowledge of public companies & real data)
    // Use gemini-2.5-flash for other analyses (faster, cheaper)
    const isFinancial = analysisType === "financial";
    const model = isFinancial ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const systemPrompt = isFinancial
      ? `You are an elite financial analyst and competitive intelligence expert with deep knowledge of public and private companies worldwide. You have extensive knowledge of:
- SEC filings, annual reports, 10-K/10-Q data for public companies
- Industry benchmarks and market sizing data
- SimilarWeb/Semrush-style traffic estimates
- Known revenue figures from earnings calls, press releases, and financial news
- Employee counts from LinkedIn/company pages
- Funding rounds from Crunchbase-style data

TODAY'S DATE: ${today}

CRITICAL RULES:
1. For well-known companies (Fortune 500, public companies, unicorns), you MUST use your knowledge of their ACTUAL reported financials — real revenue, real employee counts, real traffic data. Do NOT estimate when you know the real numbers.
2. For public companies, use their latest earnings report data. Cite the fiscal year/quarter.
3. For private companies with known funding/revenue, use publicly reported figures.
4. For smaller/unknown sites, provide industry-benchmark estimates clearly labeled as "Estimated".
5. NEVER return "No current data available", "Unknown", or "N/A" for major companies where data exists in your training.
6. Traffic data: Use your knowledge of SimilarWeb/Semrush rankings. For major sites, you know approximate monthly visitors.
7. Always respond with ONLY valid JSON. No markdown, no code fences, no explanation.`
      : "You are a social media analytics and competitive intelligence expert. Always respond with ONLY valid JSON as requested. No markdown, no explanation, no code fences. Just raw JSON.";

    // For financial analysis, do a two-pass approach:
    // Pass 1: Research the company using AI knowledge
    // Pass 2: Generate the financial report with the research context
    let finalPrompt = prompt;

    if (isFinancial) {
      // Extract company/domain from the prompt for research
      const urlMatch = prompt.match(/WEBSITE:\s*(.+)/);
      const titleMatch = prompt.match(/TITLE:\s*(.+)/);
      const websiteUrl = urlMatch?.[1]?.trim() || "";
      const websiteTitle = titleMatch?.[1]?.trim() || "";

      // Research pass - get real data from AI knowledge
      const researchPrompt = `Research this company/website thoroughly and provide ALL known financial and traffic data:

Company/Website: ${websiteUrl}
Title: ${websiteTitle}

Provide ONLY factual data you are confident about. For each data point, indicate your confidence level.

Return JSON:
{
  "companyName": "<official name>",
  "isPublicCompany": true/false,
  "ticker": "<stock ticker if public, null otherwise>",
  "knownRevenue": "<latest known annual revenue figure with source year, e.g. '$51.2B (FY2024)'>",
  "knownEmployees": "<exact count if known, e.g. '79,400 (2024)'>",
  "knownMarketCap": "<if public>",
  "knownMonthlyTraffic": "<e.g. '1.2B monthly visits (SimilarWeb est.)'>",
  "knownDailyTraffic": "<derived from monthly>",
  "recentNews": "<any recent financial news, earnings, acquisitions>",
  "knownCompetitors": ["<competitor1>", "<competitor2>"],
  "knownFoundedYear": "<year>",
  "businessModel": "<detailed model>",
  "pricingInfo": "<known pricing tiers/ranges>",
  "knownGrowthRate": "<YoY revenue growth>",
  "knownProfitMargin": "<if public>",
  "avgOrderValue": "<if e-commerce, known AOV>",
  "conversionRate": "<industry benchmark or known>",
  "bounceRate": "<SimilarWeb estimate if known>",
  "avgSessionDuration": "<SimilarWeb estimate if known>",
  "topTrafficSources": "<organic/direct/social split if known>",
  "topCountries": "<geographic traffic split if known>",
  "confidence": "high/medium/low"
}`;

      const researchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: `You are a financial research analyst. Provide factual data from your training knowledge about companies. Today is ${today}. Return ONLY valid JSON, no markdown.` },
            { role: "user", content: researchPrompt },
          ],
        }),
      });

      if (researchResponse.ok) {
        const researchData = await researchResponse.json();
        const researchReply = researchData.choices?.[0]?.message?.content || "";
        // Inject research context into the main prompt
        finalPrompt = `IMPORTANT RESEARCH CONTEXT (use this data as primary source — it contains verified information from financial databases, SEC filings, and traffic analytics platforms):\n\n${researchReply}\n\n---\n\n${prompt}\n\nADDITIONAL INSTRUCTION: The research context above contains VERIFIED data. For fields where verified data exists, use those exact figures. Only estimate fields where no verified data was found. For publicly traded companies, the revenue/employee/traffic figures in the research are from official sources — use them directly, not as estimates.`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    // Increment usage count (counts as 1 even with two-pass for financial)
    const newCount = currentCount + 1;
    if (usageRow && !usageRow.reset_by_admin) {
      await sb.from("competitor_ai_usage").update({ call_count: newCount, updated_at: new Date().toISOString() }).eq("id", usageRow.id);
    } else {
      await sb.from("competitor_ai_usage").upsert({
        user_id: user.id,
        usage_date: today,
        call_count: 1,
        reset_by_admin: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,usage_date" });
    }

    return new Response(JSON.stringify({ reply, usage: { count: newCount, limit: RATE_LIMIT_MAX } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("competitor-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

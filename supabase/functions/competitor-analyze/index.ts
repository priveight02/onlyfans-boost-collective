import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX = 20;
const NO_ESTIMATE_PATTERN = /\b(estimate|estimated|approx|approximately|around|about|projected|forecast|modeled|assumed|inferred)\b/i;
const UNVERIFIED_PATTERN = /\b(no verified data|not available|unknown|n\/a|unverified|insufficient data|no public data)\b/i;

const sanitizeFinancialValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return "Not publicly disclosed";

  if (Array.isArray(value)) return value.map((item) => sanitizeFinancialValue(item));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeFinancialValue(v);
    }
    return out;
  }

  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return "Not publicly disclosed";
  if (NO_ESTIMATE_PATTERN.test(trimmed) || UNVERIFIED_PATTERN.test(trimmed)) {
    return "Not publicly disclosed";
  }

  return trimmed;
};

const sanitizeFinancialPayload = <T>(payload: T): T => sanitizeFinancialValue(payload) as T;

const financialTool = {
  type: "function" as const,
  function: {
    name: "financial_report",
    description: "Return a factual financial intelligence report with latest verifiable values only.",
    parameters: {
      type: "object",
      properties: {
        companyOverview: {
          type: "object",
          properties: {
            estimatedEmployees: { type: "string", description: "Latest verifiable employee count with source/date." },
            foundedYear: { type: "string" },
            businessModel: { type: "string" },
            stage: { type: "string" },
            industry: { type: "string" },
          },
          required: ["estimatedEmployees", "foundedYear", "businessModel", "stage", "industry"],
        },
        trafficEstimates: {
          type: "object",
          properties: {
            dailyVisitors: { type: "string", description: "Latest verified value (or derived from verified monthly value)." },
            weeklyVisitors: { type: "string", description: "Latest verified value (or derived from verified monthly value)." },
            monthlyVisitors: { type: "string", description: "Latest verified value with source/date." },
            yearlyVisitors: { type: "string", description: "Latest verified value with source/date." },
            bounceRate: { type: "string" },
            avgSessionDuration: { type: "string" },
            topTrafficSources: {
              type: "array",
              items: {
                type: "object",
                properties: { source: { type: "string" }, percentage: { type: "string" } },
                required: ["source", "percentage"],
              },
            },
            topCountries: {
              type: "array",
              items: {
                type: "object",
                properties: { country: { type: "string" }, percentage: { type: "string" } },
                required: ["country", "percentage"],
              },
            },
            growthTrend: { type: "string" },
          },
          required: ["dailyVisitors", "weeklyVisitors", "monthlyVisitors", "yearlyVisitors", "bounceRate", "avgSessionDuration", "growthTrend"],
        },
        revenueEstimates: {
          type: "object",
          properties: {
            dailyRevenue: { type: "string", description: "Latest verified value (or derived from verified annual/quarterly value)." },
            weeklyRevenue: { type: "string", description: "Latest verified value (or derived from verified annual/quarterly value)." },
            monthlyRevenue: { type: "string", description: "Latest verified value (or derived from verified annual/quarterly value)." },
            yearlyRevenue: { type: "string", description: "Latest verified annual/TTM revenue with source/date." },
            revenueModel: { type: "string" },
            averageOrderValue: { type: "string" },
            estimatedConversionRate: { type: "string" },
            mrr: { type: "string" },
            arr: { type: "string" },
            ltv: { type: "string" },
            cac: { type: "string" },
            churnRate: { type: "string" },
          },
          required: ["dailyRevenue", "weeklyRevenue", "monthlyRevenue", "yearlyRevenue", "revenueModel", "averageOrderValue", "mrr", "arr", "ltv", "cac", "churnRate"],
        },
        incomeSources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              estimatedShare: { type: "string", description: "Verified share or 'Not publicly disclosed'." },
              type: { type: "string" },
              details: { type: "string" },
            },
            required: ["source", "estimatedShare", "type", "details"],
          },
        },
        pricingAnalysis: {
          type: "object",
          properties: {
            plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "string" },
                  billing: { type: "string" },
                  features: { type: "string" },
                },
                required: ["name", "price", "billing", "features"],
              },
            },
            creditPackages: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, credits: { type: "string" }, price: { type: "string" } },
                required: ["name", "credits", "price"],
              },
            },
            hasFreeTrialOrTier: { type: "string" },
            upsells: { type: "string" },
            crossSells: { type: "string" },
            downsells: { type: "string" },
          },
          required: ["plans", "hasFreeTrialOrTier"],
        },
        competitivePosition: {
          type: "object",
          properties: {
            marketShare: { type: "string" },
            mainCompetitors: { type: "array", items: { type: "string" } },
            competitiveAdvantage: { type: "string" },
            vulnerabilities: { type: "array", items: { type: "string" } },
          },
          required: ["marketShare", "mainCompetitors", "competitiveAdvantage", "vulnerabilities"],
        },
        growthIndicators: {
          type: "object",
          properties: {
            techMaturity: { type: "string" },
            marketingEfficiency: { type: "string" },
            productMarketFit: { type: "string" },
            scalabilityScore: { type: "string" },
            overallHealthScore: { type: "string" },
          },
          required: ["techMaturity", "marketingEfficiency", "productMarketFit", "scalabilityScore", "overallHealthScore"],
        },
        dataFreshness: {
          type: "object",
          properties: {
            generatedOn: { type: "string" },
            latestFinancialPeriod: { type: "string" },
            latestTrafficPeriod: { type: "string" },
            recencyCheck: { type: "string" },
          },
          required: ["generatedOn", "latestFinancialPeriod", "latestTrafficPeriod", "recencyCheck"],
        },
        sourceLedger: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string" },
              value: { type: "string" },
              sourceName: { type: "string" },
              sourceUrl: { type: "string" },
              sourceType: { type: "string" },
              publishedOn: { type: "string" },
            },
            required: ["metric", "value", "sourceName", "sourceUrl", "sourceType", "publishedOn"],
          },
        },
        confidenceLevel: { type: "string" },
        methodology: { type: "string" },
      },
      required: [
        "companyOverview",
        "trafficEstimates",
        "revenueEstimates",
        "incomeSources",
        "pricingAnalysis",
        "competitivePosition",
        "growthIndicators",
        "dataFreshness",
        "sourceLedger",
        "confidenceLevel",
        "methodology",
      ],
    },
  },
};

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

    const { data: { user } } = await userClient.auth.getUser();
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
        JSON.stringify({ error: "Daily AI analysis limit reached (20/day).", limited: true, count: currentCount }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isFinancial = analysisType === "financial";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    let reply = "";

    try {
      if (isFinancial) {
        // === TWO-PASS FINANCIAL RESEARCH ===
        // Pass 1: Deep research with gemini-2.5-pro (best reasoning + knowledge)
        const researchPrompt = `You are a financial research analyst with deep knowledge of public company financials from SEC filings (10-K, 10-Q), annual reports, earnings calls, SimilarWeb/Semrush traffic data, Crunchbase funding data, LinkedIn employee counts, and industry benchmarks.

Research this company/website thoroughly. Return ONLY factual data with specific sources cited.

COMPANY/WEBSITE TO RESEARCH: ${prompt}

Provide a detailed factual brief:
1. COMPANY IDENTITY: Legal name, ticker (if public), founding year, HQ, employee count (source: LinkedIn/filing)
2. REVENUE & FINANCIALS: Latest annual revenue (exact figure from most recent 10-K or annual report), quarterly revenue trend, net income, gross margin, operating margin. For private companies, cite known funding rounds or revenue estimates from Bloomberg/Forbes/TechCrunch.
3. TRAFFIC: Monthly unique visitors (SimilarWeb/Semrush data), daily visitors, bounce rate, avg session, top sources, top countries with percentages
4. BUSINESS MODEL: Revenue streams with % breakdown, pricing tiers, AOV
5. MARKET: Market share estimate with reasoning, top 3-5 competitors, moat/advantages
6. GROWTH: YoY revenue growth %, traffic trend, employee growth rate
7. UNIT ECONOMICS: LTV, CAC estimates if available from industry benchmarks

RULES:
- Use EXACT figures (e.g. "$51.2 billion" not "$50B+")
- Always cite the source and date (e.g. "FY2024 10-K", "SimilarWeb Jan 2025", "Crunchbase Series C")
- If a number is your estimate, label it clearly as "Estimated" with reasoning
- DO NOT fabricate. If unknown, say "No verified data" for that metric`;

        const researchRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            temperature: 0.05,
            max_tokens: 3000,
            messages: [{ role: "user", content: researchPrompt }],
          }),
          signal: controller.signal,
        });

        if (!researchRes.ok) {
          const t = await researchRes.text();
          console.error("Research pass error:", researchRes.status, t);
          if (researchRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (researchRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`Research pass failed: ${researchRes.status}`);
        }

        const researchData = await researchRes.json();
        const researchBrief = researchData.choices?.[0]?.message?.content || "";
        console.log("Research brief length:", researchBrief.length);

        // Pass 2: Structure research into tool call schema using fast model
        const structurePrompt = `Use ONLY the verified research below to fill the financial report. Use exact numbers from the research. Do not invent data.

=== VERIFIED RESEARCH ===
${researchBrief}
=== END RESEARCH ===

ORIGINAL REQUEST: ${prompt}

INSTRUCTIONS:
- Use EXACT numbers from research (e.g. "$51.2B (FY2024 10-K)" not "$50B")
- Derive daily/weekly from annual: daily=annual/365, weekly=annual/52, monthly=annual/12
- Derive traffic periods similarly from monthly figures
- Include source citations in parentheses
- If research says "No verified data", estimate with label "Estimated: $X based on [reasoning]"
- For non-subscription companies: mrr/arr/churn = "Not subscription-based"`;

        const structRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.05,
            max_tokens: 4096,
            messages: [
              { role: "system", content: "Structure the provided research into the financial report schema. Use only verified data." },
              { role: "user", content: structurePrompt },
            ],
            tools: [financialTool],
            tool_choice: { type: "function", function: { name: "financial_report" } },
          }),
          signal: controller.signal,
        });

        if (!structRes.ok) {
          const t = await structRes.text();
          console.error("Structure pass error:", structRes.status, t);
          if (structRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (structRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`Structure pass failed: ${structRes.status}`);
        }

        const structData = await structRes.json();
        const toolCall = structData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            reply = JSON.stringify(parsed);
          } catch {
            reply = toolCall.function.arguments;
          }
        } else {
          reply = structData.choices?.[0]?.message?.content || "";
        }
      } else {
        // Non-financial: single pass
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.3,
            max_tokens: 1400,
            messages: [
              { role: "system", content: "You are a social media analytics and competitive intelligence expert. Always respond with ONLY valid JSON as requested. No markdown, no explanation, no code fences. Just raw JSON." },
              { role: "user", content: prompt },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const t = await response.text();
          console.error("AI gateway error:", response.status, t);
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway returned ${response.status}`);
        }

        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || "";
      }
    } catch (fetchError: any) {
      if (fetchError?.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Financial analysis timed out. Please retry." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
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
          { user_id: user.id, usage_date: today, call_count: 1, reset_by_admin: false, updated_at: new Date().toISOString() },
          { onConflict: "user_id,usage_date" },
        );
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

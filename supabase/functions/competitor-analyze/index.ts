import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX = 20;

const financialTool = {
  type: "function" as const,
  function: {
    name: "financial_report",
    description: "Return a complete financial intelligence report for a website/company.",
    parameters: {
      type: "object",
      properties: {
        companyOverview: {
          type: "object",
          properties: {
            estimatedEmployees: { type: "string" },
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
            dailyVisitors: { type: "string" },
            weeklyVisitors: { type: "string" },
            monthlyVisitors: { type: "string" },
            yearlyVisitors: { type: "string" },
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
            dailyRevenue: { type: "string" },
            weeklyRevenue: { type: "string" },
            monthlyRevenue: { type: "string" },
            yearlyRevenue: { type: "string" },
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
              estimatedShare: { type: "string" },
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
        confidenceLevel: { type: "string" },
        methodology: { type: "string" },
      },
      required: ["companyOverview", "trafficEstimates", "revenueEstimates", "incomeSources", "pricingAnalysis", "competitivePosition", "growthIndicators", "confidenceLevel", "methodology"],
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
    const model = isFinancial ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash";

    const systemPrompt = isFinancial
      ? `You are a financial intelligence analyst. For known/public companies, use latest known reported figures from official filings/earnings. For unknown companies, provide clearly labeled conservative estimates. Never return placeholders like "N/A" or "Unknown" - always provide your best estimate with a range.`
      : "You are a social media analytics and competitive intelligence expert. Always respond with ONLY valid JSON as requested. No markdown, no explanation, no code fences. Just raw JSON.";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const requestBody: any = {
      model,
      temperature: isFinancial ? 0.1 : 0.3,
      max_tokens: isFinancial ? 4096 : 1400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    };

    // Use tool calling for financial analysis to guarantee structured JSON output
    if (isFinancial) {
      requestBody.tools = [financialTool];
      requestBody.tool_choice = { type: "function", function: { name: "financial_report" } };
    }

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
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
    let reply = "";

    if (isFinancial) {
      // Extract structured data from tool call response
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        // The arguments come as a JSON string from the API - already valid JSON
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          reply = JSON.stringify(parsed);
        } catch {
          // Fallback: return raw arguments string
          reply = toolCall.function.arguments;
        }
      } else {
        // Fallback to content if tool calling wasn't used
        reply = data.choices?.[0]?.message?.content || "";
      }
    } else {
      reply = data.choices?.[0]?.message?.content || "";
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

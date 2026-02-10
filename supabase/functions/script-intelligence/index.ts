import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, scripts, steps, accounts, workflows } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "analyze_scripts") {
      systemPrompt = `You are an expert monetization strategist and script optimization AI for a creator management agency. Analyze the provided script data and generate actionable intelligence.

Your analysis must be based ONLY on the data provided. Never fabricate metrics or make claims not supported by the data. Clearly label derived insights vs raw data.

Focus on:
1. Revenue optimization opportunities
2. Engagement pattern analysis
3. Script structure recommendations
4. Pricing strategy improvements
5. Audience targeting refinements
6. Compliance considerations`;

      userPrompt = `Analyze these scripts and provide strategic recommendations:

SCRIPTS DATA:
${JSON.stringify(scripts || [], null, 2)}

SCRIPT STEPS DATA:
${JSON.stringify(steps || [], null, 2)}

ACCOUNTS DATA:
${JSON.stringify((accounts || []).map((a: any) => ({
  username: a.username,
  display_name: a.display_name,
  monthly_revenue: a.monthly_revenue,
  subscriber_count: a.subscriber_count,
  engagement_rate: a.engagement_rate,
  tier: a.tier,
  status: a.status,
})), null, 2)}

Provide your analysis in the following structured format:
1. **Executive Summary** (2-3 sentences)
2. **Top Revenue Opportunities** (3-5 specific, actionable items)
3. **Script Performance Insights** (what's working, what's not)
4. **Pricing Optimization** (specific pricing recommendations)
5. **New Script Ideas** (3 high-potential script concepts with step outlines)
6. **Risk Alerts** (any concerning patterns)
7. **Quick Wins** (things that can be done today for immediate impact)`;
    } else if (type === "generate_script") {
      systemPrompt = `You are a script creation AI for a creator management agency. Generate detailed, multi-step storyline scripts designed to maximize engagement and revenue. Scripts must be ethical, compliant with platform policies, and focused on genuine value delivery.`;

      userPrompt = `Generate a complete script based on this context:

EXISTING SCRIPTS (for reference):
${JSON.stringify((scripts || []).slice(0, 5).map((s: any) => ({ title: s.title, category: s.category, target_segment: s.target_segment, total_revenue: s.total_revenue })), null, 2)}

ACCOUNTS:
${JSON.stringify((accounts || []).slice(0, 5).map((a: any) => ({ username: a.username, monthly_revenue: a.monthly_revenue, subscriber_count: a.subscriber_count })), null, 2)}

Generate a complete script with:
1. **Title** and **Category** (onboarding/retention/upsell/premium/reactivation)
2. **Target Segment** (new_users/active_users/vip/high_spenders/inactive)
3. **Description** (1-2 sentences)
4. **Steps** (5-8 steps, each with):
   - step_type (message/content/offer/question/followup/delay/condition/media)
   - title
   - content (the actual message/content)
   - price (if applicable, in dollars)
   - delay_minutes (time before this step)
5. **Expected Revenue** estimate
6. **Key Success Metrics** to track

Format the steps as a JSON array.`;
    } else if (type === "optimize_script") {
      systemPrompt = `You are a script optimization AI. Analyze the provided script and suggest specific improvements to increase conversion rates, reduce drop-off, and maximize revenue per user.`;

      userPrompt = `Optimize this script:

SCRIPT: ${JSON.stringify(scripts?.[0] || {}, null, 2)}
STEPS: ${JSON.stringify(steps || [], null, 2)}

Provide:
1. **Overall Assessment** (score out of 10)
2. **Step-by-Step Analysis** (for each step: keep/modify/remove with reasoning)
3. **Pricing Adjustments** (specific price changes with justification)
4. **Timing Optimization** (delay adjustments)
5. **Content Improvements** (rewrites for underperforming steps)
6. **A/B Test Suggestions** (what to test first)
7. **Predicted Impact** (estimated revenue improvement)`;
    } else if (type === "whatif_simulation") {
      systemPrompt = `You are a scenario simulation AI for script monetization. Run what-if analyses based on the provided data and hypothetical changes.`;

      userPrompt = `Run a what-if simulation:

CURRENT DATA:
Scripts: ${JSON.stringify((scripts || []).slice(0, 5), null, 2)}
Steps: ${JSON.stringify((steps || []).slice(0, 20), null, 2)}
Workflows: ${JSON.stringify((workflows || []).slice(0, 5), null, 2)}

Simulate these scenarios:
1. **Price increase 20%** on all offers
2. **Add 2 more steps** to each script
3. **Reduce delays by 50%** between steps
4. **Target only VIP users** with premium scripts
5. **Run all scripts simultaneously** across all accounts

For each scenario provide:
- Projected revenue change (%)
- Risk assessment
- Implementation difficulty
- Recommendation (do it / don't / test first)`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("script-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

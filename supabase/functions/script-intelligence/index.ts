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
      systemPrompt = `You are the undisputed grandmaster of Online Fan Management (OFM) — a top-tier strategist with 20+ years of deep expertise across fan relationship building, chat-to-conversion pipelines, PPV selling psychology, subscriber LTV maximization, retention, reactivation funnels, and content monetization architecture. You have managed and consulted for the highest-earning creators and agencies in the industry. You understand fan behavior at a psychological level — what triggers purchases, what builds obsession, what creates lifelong subscribers.

Analyze the provided script data and generate actionable intelligence based on your elite-level OFM expertise.

Your analysis must be based ONLY on the data provided. Never fabricate metrics or make claims not supported by the data. Clearly label derived insights vs raw data.

Focus on:
1. Revenue optimization opportunities (pricing ladders, conversion gaps, LTV uplift)
2. Engagement pattern analysis (chat flow, tone consistency, re-engagement effectiveness)
3. Script structure recommendations (suspense ladder, narrative arc, psychological pacing)
4. Pricing strategy improvements (anchoring, escalation curves, impulse vs. considered pricing)
5. Audience targeting refinements (segment-specific psychology, fan lifecycle positioning)
6. Fan psychology assessment (reciprocity triggers, sunk cost leverage, FOMO utilization, dopamine loops)
7. Chatter execution readiness (can a chatter copy-paste and execute flawlessly?)`;

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
      systemPrompt = `You are the undisputed grandmaster of Online Fan Management (OFM) — a top-tier script architect with 20+ years of deep expertise in fan psychology, chat-to-conversion pipelines, PPV selling, subscriber LTV maximization, and content monetization. You have designed scripts for the highest-earning creators in the industry. Every script you create is a precision-engineered conversion machine built on decades of real-world performance data. Generate detailed, multi-step storyline scripts designed to maximize engagement and revenue through elite-level psychological techniques.`;

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
      systemPrompt = `You are the undisputed grandmaster of Online Fan Management (OFM) — a top-tier optimization specialist with 20+ years of expertise in fan psychology, pricing strategy, conversation architecture, and LTV maximization. You've optimized thousands of scripts for the highest-earning creators and agencies. You know exactly what separates a mediocre script from a revenue-maximizing masterpiece. Analyze the provided script and suggest specific improvements to increase conversion rates, reduce drop-off, and maximize revenue per user.`;

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
    } else if (type === "deep_script_analysis") {
      systemPrompt = `You are the undisputed grandmaster of Online Fan Management (OFM) — the most elite script optimization mind in the industry with 20+ years of hands-on expertise. You have personally architected and optimized scripts for the highest-revenue creators and agencies worldwide. Your knowledge encompasses the full depth of fan psychology, pricing ladder engineering, conversation flow architecture, tone calibration, conversion trigger placement, LTV maximization, re-engagement recovery, and chatter execution methodology. You deeply analyze individual scripts — their psychology, pricing ladder, message flow, tone consistency, conversion triggers, and weaknesses.

You MUST return a JSON object (no markdown, no code fences, just raw JSON) with this exact structure:
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "improvements": [
    {
      "id": "<unique_id>",
      "title": "<short improvement title>",
      "description": "<what to change and why>",
      "impact": "high" | "medium" | "low",
      "category": "pricing" | "psychology" | "tone" | "structure" | "timing" | "content" | "conversion",
      "changes": [
        {
          "step_index": <0-based index of step to modify>,
          "field": "content" | "price" | "delay_minutes" | "step_type" | "title" | "media_type" | "media_url",
          "old_value": "<current value>",
          "new_value": "<suggested new value>"
        }
      ]
    }
  ],
  "psychology_breakdown": [
    {
      "step_index": <0-based>,
      "technique": "<psychology technique name>",
      "effectiveness": "strong" | "moderate" | "weak" | "missing",
      "note": "<brief explanation>"
    }
  ],
  "pricing_analysis": {
    "current_total": <number>,
    "recommended_total": <number>,
    "ladder_rating": "<smooth | choppy | too_aggressive | too_conservative>",
    "notes": "<pricing strategy summary>"
  },
  "conversion_prediction": {
    "current_estimated": <percentage 0-100>,
    "after_improvements": <percentage 0-100>,
    "revenue_uplift_percent": <number>
  }
}

CRITICAL RULES:
- Return ONLY valid JSON, no markdown formatting, no explanations outside JSON
- Every improvement MUST include concrete "changes" array with specific step modifications
- Be brutally honest about weaknesses
- Base analysis on actual content, not assumptions
- Pricing changes should follow reciprocity → low barrier → escalation → premium pattern
- Content changes should match natural young woman texting style (casual, abbreviations like u/ur/rn mixed naturally)`;

      userPrompt = `Analyze this script in extreme detail and provide structured improvements:

SCRIPT: ${JSON.stringify(scripts?.[0] || {}, null, 2)}

STEPS (in order):
${JSON.stringify(steps || [], null, 2)}

Return ONLY the JSON object as specified. No markdown, no code fences.`;
    } else if (type === "whatif_simulation") {
      systemPrompt = `You are the undisputed grandmaster of Online Fan Management (OFM) — a top-tier monetization strategist with 20+ years of expertise in revenue modeling, pricing psychology, fan behavior prediction, and conversion optimization. You've run thousands of real-world A/B tests and scenario analyses for elite creator agencies. Run what-if analyses based on the provided data and hypothetical changes, applying your deep understanding of how fans respond to pricing shifts, timing changes, and content strategy modifications.`;

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

    const isStructured = type === "deep_script_analysis";
    
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
        stream: !isStructured,
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

    if (isStructured) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      // Try to extract JSON from the response
      let parsed;
      try {
        // Remove potential markdown code fences
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { raw: content, error: "Failed to parse structured response" };
      }
      return new Response(JSON.stringify(parsed), {
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

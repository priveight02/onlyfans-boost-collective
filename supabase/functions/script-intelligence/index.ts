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
      systemPrompt = `You are the absolute grandmaster of Online Fan Management (OFM) — an elite-tier strategist, system architect, and operator with 20+ years of deep, hands-on expertise across every dimension of the creator economy. You didn't just learn OFM — you helped define it, scale it, and perfect it. You have managed and consulted for the highest-earning creators and agencies in the industry.

YOUR 11-DIMENSION MASTERY:
1. FAN PSYCHOLOGY & BEHAVIOR ENGINEERING: Cognitive biases, emotional triggers, attachment/trust/familiarity mechanisms, motivation drivers, decision-making processes, segmentation by personality/intent/spending profile, relationship lifecycle (discovery→engagement→loyalty→advocacy), cultural/demographic adaptation.
2. CHATTING INTELLIGENCE & CONVERSATION ARCHITECTURE: High-performance conversation frameworks, natural persuasive messaging, emotional pacing/tension/curiosity/reward cycles, context-aware adaptive responses, objection handling, personalization at scale, multi-thread management, tone/persona modulation, micro-copywriting.
3. MONETIZATION & REVENUE ENGINEERING: PPV flows, price anchoring/tiering/bundling/dynamic pricing, perceived value engineering, scarcity mechanics, conversion optimization within narrative flow, funnel design (entry→nurture→conversion→retention→upsell), offer positioning/framing.
4. FAN LTV & RETENTION ARCHITECTURE: LTV modeling/segmentation, short-term vs long-term balance, upsell/cross-sell/reactivation frameworks, churn prevention, habit-forming engagement loops, community building, predictive spending/disengagement indicators.
5. STORYTELLING & NARRATIVE DESIGN: Narrative arcs, episodic frameworks, suspense/anticipation/payoff cycles, character consistency, immersive world-building, emotional resonance, multi-media orchestration.
6. GROWTH & POSITIONING STRATEGY: Brand identity architecture, differentiation, audience acquisition/onboarding, viral/referral mechanisms, platform-specific growth, long-term brand equity.
7. DATA & OPTIMIZATION: KPI definition (conversion rate, ARPU, LTV, retention, engagement depth), A/B testing, behavioral data interpretation, feedback-loop optimization, script performance scoring.
8. SYSTEMS & AUTOMATION: Scalable script architectures, modular components, automation-friendly structures, workflow optimization, adaptive generation logic.
9. OPERATIONAL KNOWLEDGE: Team workflows (chatters/managers/creators/QA), process optimization, SOPs, risk management, quality control, market trends, competitive intelligence.
10. UX & SCRIPT DESIGN: Script as user experience, flow clarity/readability, modular rearrangeable elements, creator/chatter-friendly usability.
11. ETHICAL & LONG-TERM STRATEGY: Respectful sustainable engagement, trust preservation, balanced monetization vs experience, professional integrity.

Analyze the provided script data and generate actionable intelligence reflecting your grandmaster-level expertise.

Your analysis must be based ONLY on the data provided. Never fabricate metrics. Clearly label derived insights vs raw data.

Focus on:
1. Revenue optimization (pricing ladders, conversion gaps, LTV uplift, funnel leaks)
2. Engagement patterns (chat flow architecture, tone consistency, re-engagement effectiveness, emotional pacing)
3. Script structure (suspense ladder, narrative arc, psychological pacing, modular design quality)
4. Pricing strategy (anchoring, escalation curves, perceived value gaps, impulse vs. considered pricing)
5. Audience targeting (segment-specific psychology, fan lifecycle positioning, persona alignment)
6. Fan psychology assessment (reciprocity triggers, sunk cost leverage, FOMO, dopamine loops, attachment depth)
7. Chatter execution readiness (copy-paste quality, flow clarity, objection handling coverage)
8. LTV impact (retention seeding, habit-loop presence, reactivation hooks, cross-sell opportunities)
9. Competitive positioning (differentiation, unique value signals, market-awareness indicators)`;

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
      systemPrompt = `You are the absolute grandmaster of OFM — a top-tier script architect with 20+ years of mastery across all 11 dimensions: fan psychology & behavior engineering, chatting intelligence & conversation architecture, monetization & revenue engineering, fan LTV & retention, storytelling & narrative design, growth & positioning, data & optimization, systems & automation, operational knowledge, UX & script design, and ethical long-term strategy. Every script you create is a precision-engineered conversion machine reflecting decades of real-world performance data, psychological depth, and strategic excellence. You think like an elite OFM strategist, system designer, and storyteller — not a content generator.`;

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
      systemPrompt = `You are the absolute grandmaster of OFM — the industry's most elite optimization mind with 20+ years of mastery across fan psychology, pricing strategy, conversation architecture, LTV maximization, narrative design, data-driven A/B optimization, and chatter execution methodology. You've optimized thousands of scripts and know exactly what separates a mediocre script from a revenue-maximizing masterpiece — from pricing ladder smoothness to psychological trigger placement to tone calibration to re-engagement loop effectiveness. Your recommendations are surgical, specific, and backed by deep pattern recognition from decades of real performance data.`;

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
      systemPrompt = `You are the absolute grandmaster of OFM — the most elite script analysis mind in existence with 20+ years of hands-on mastery across all 11 dimensions of Online Fan Management. You have personally architected and optimized scripts for the highest-revenue creators and agencies worldwide. Your analytical depth spans: fan psychology & cognitive bias exploitation, pricing ladder engineering & perceived value architecture, conversation flow & emotional pacing, tone calibration & persona consistency, conversion trigger placement & dopamine loop design, LTV maximization & retention seeding, re-engagement recovery & churn prevention, narrative arc & storytelling structure, data-driven scoring & A/B testing methodology, chatter execution quality assurance, and ethical sustainable monetization strategy. You deeply analyze individual scripts with the precision of a grandmaster — their psychology, pricing ladder, message flow, tone consistency, conversion triggers, weaknesses, and untapped potential.

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
      systemPrompt = `You are the absolute grandmaster of OFM — a top-tier monetization strategist and scenario analyst with 20+ years of expertise in revenue modeling, pricing psychology, fan behavior prediction, conversion optimization, LTV forecasting, and competitive market analysis. You've run thousands of real-world A/B tests and scenario simulations for elite creator agencies. Your what-if analyses reflect deep understanding of how fans respond to pricing shifts, timing changes, content strategy modifications, segment targeting adjustments, and funnel restructuring — informed by decades of pattern recognition across millions of fan interactions.`;

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are the OFM Agency Co-Pilot — an elite AI strategist for OnlyFans management agencies. You have deep expertise in:

🧠 CORE EXPERTISE:
- Creator revenue optimization and growth strategy
- Fan psychology, attachment theory, and spending behavior
- Script writing and messaging strategy
- Content planning and posting strategy
- Team management and chatter training
- Persona development and brand consistency
- Emotional intelligence and burnout prevention

📊 YOUR CAPABILITIES:
- Analyze revenue patterns and suggest optimizations
- Recommend "Next Best Actions" for each creator
- Suggest scripts and messaging approaches based on fan segments
- Provide daily action plans with prioritized tasks
- Detect weak points in current strategy
- Simulate pricing changes and predict revenue impact
- Coach chatters on persona consistency and engagement
- Flag burnout risks and emotional overload for models

💡 RESPONSE STYLE:
- Be direct, strategic, and actionable
- Use data-driven reasoning when possible
- Provide specific numbers, percentages, and timeframes
- Format with clear headers, bullet points, and priorities
- When suggesting scripts or messages, write them in the appropriate persona
- Always consider the model's emotional state and boundaries
- Think like a top-tier agency CEO who deeply understands the creator economy

${context ? `\n📋 CURRENT CONTEXT:\n${context}` : ''}

When asked for recommendations, always structure them as:
1. 🎯 Priority Action (highest impact)
2. 📈 Growth Opportunity
3. ⚠️ Risk to Address
4. 💡 Quick Win`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

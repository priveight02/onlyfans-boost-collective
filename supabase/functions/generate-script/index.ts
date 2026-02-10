import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, target_segment, theme } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert script designer for creator management agencies. You create structured multi-step chat scripts that chatters use to engage fans and sell content.

A script is a structured sequence of chat messages, free content, paid content (PPV), questions, and follow-ups arranged in a logical flow. Each step has a type, content text, and optional pricing.

RULES:
- Scripts must be production-ready, natural-sounding, and optimized for conversion
- Use progressive pricing (start free/cheap, escalate)
- Include branching logic (what if they respond vs ignore)
- Always start with a welcome or hook message
- Include 2-3 free content steps to build rapport
- Include 2-4 PPV content steps with escalating prices ($5-$50 range)
- Add questions to gauge interest and create engagement
- Add follow-up branches for purchased vs ignored
- Messages should feel personal and conversational
- Use {NAME} as placeholder for the fan's name
- Each script should have 12-25 steps total
- Vary the narrative themes and approaches

STEP TYPES (use exactly these):
- welcome: Opening hook message
- message: Regular chat message
- free_content: Free images/videos sent to build rapport
- ppv_content: Paid content with a price
- question: Question to engage the fan
- condition: Branching point (responded vs didn't)
- followup_purchased: Follow-up after they bought
- followup_ignored: Follow-up if they ignored

Return a JSON object with this EXACT structure:
{
  "title": "Script title",
  "description": "Brief description",
  "steps": [
    {
      "step_type": "welcome",
      "title": "Short title for this step",
      "content": "The actual message or caption",
      "media_type": "" | "image" | "video" | "mixed",
      "media_url": "Description of media e.g. '2 selfies in bedroom' or 'Video 0:28 - teaser'",
      "price": 0,
      "delay_minutes": 0,
      "condition_logic": {}
    }
  ]
}

For condition steps, set condition_logic to: {"condition": "Responded to welcome"} or similar.
For PPV steps, always set a price > 0 and describe the media.
For free_content, price should be 0 and describe what's sent.`;

    const userPrompt = `Generate a highly optimized, production-ready chat script.
Category: ${category || "general"}
Target audience: ${target_segment || "new fans"}
Theme/Setting: ${theme || "casual and flirty lifestyle content - surprise the chatter with a creative angle"}

Make it unique, creative, and conversion-optimized. The script should feel natural and build genuine engagement while strategically escalating value.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "create_script",
              description: "Create a structured chat script with steps",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Script title" },
                  description: { type: "string", description: "Brief description" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        step_type: { type: "string", enum: ["welcome", "message", "free_content", "ppv_content", "question", "condition", "followup_purchased", "followup_ignored"] },
                        title: { type: "string" },
                        content: { type: "string" },
                        media_type: { type: "string", enum: ["", "image", "video", "mixed"] },
                        media_url: { type: "string" },
                        price: { type: "number" },
                        delay_minutes: { type: "number" },
                        condition_logic: { type: "object" },
                      },
                      required: ["step_type", "title", "content", "price"],
                    },
                  },
                },
                required: ["title", "description", "steps"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_script" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No script generated");
    }

    const script = typeof toolCall.function.arguments === "string" 
      ? JSON.parse(toolCall.function.arguments) 
      : toolCall.function.arguments;

    return new Response(JSON.stringify(script), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-script error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, target_segment, theme, quality, generate_real_messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isPremium = quality === "premium";
    const realMessages = generate_real_messages !== false; // default true

    const messageInstruction = realMessages
      ? `Write REAL, natural-sounding messages that chatters can copy-paste directly. Messages should feel personal, warm, and conversational. Use {NAME} as placeholder for the fan's name. Each message should be unique and engaging.`
      : `Use placeholder text for messages: "message", "answer", "follow-up", etc. The chatter will write their own messages. Only fill in media descriptions and pricing.`;

    const systemPrompt = `You are a world-class script designer for creator management agencies. You design structured multi-step content presentation scripts that chatters use to engage fans and present content efficiently.

WHAT A SCRIPT IS:
A script is a structured series of 4-5 media items (images and videos) shot in the SAME environment/room/setting, where the story gradually builds in intensity and value. Between media items, the chatter sends chat messages to maintain conversation flow and build anticipation. The script includes progressive pricing where each piece of content costs more than the last.

SCRIPT STRUCTURE BEST PRACTICES (from top creators):
1. HOOK: Start with a casual, friendly message that feels organic - reference something personal or timely
2. FREE TEASER: Send 1-2 free preview images to build interest (low-effort content from the set)
3. ENGAGEMENT: Ask a question or make a comment to get the fan talking
4. FIRST PAID CONTENT: Offer the first paid item at a low entry price ($5-$8) - easiest to convert
5. REACTION & UPSELL: React to their purchase warmly, then tease the next piece
6. ESCALATING CONTENT: Each subsequent piece increases in value and price
7. FINALE: The best content at the highest price, positioned as exclusive/special
8. FOLLOW-UP: Different paths for buyers vs non-responders

KEY PRINCIPLES:
- Progressive pricing: $5 → $8 → $12 → $15 → $25 (realistic creator pricing)
- Same setting/environment throughout (bedroom, bathroom, pool, gym, kitchen, outdoor, hotel, etc.)
- 4-5 media items total (mix of images and short videos)
- Natural conversation flow between content drops
- Timing delays between messages (2-15 minutes) to feel organic
- Media descriptions should specify: count, type (selfie/photo/video), duration for videos, outfit/setting details
- Always have branching: what to do if fan responds vs ignores

${messageInstruction}

STEP TYPES (use exactly these):
- welcome: Opening hook message to start conversation
- message: Regular chat message between content
- free_content: Free preview images/videos to build interest
- ppv_content: Paid content with a price (the main monetization)
- question: Question to engage the fan and gauge interest
- condition: Branching point (responded vs didn't respond)
- followup_purchased: Follow-up message after they bought content
- followup_ignored: Re-engagement if they didn't respond/buy
- delay: Wait period between messages (set delay_minutes)

${isPremium ? `PREMIUM QUALITY REQUIREMENTS:
- Create 15-20 steps for a complete, detailed flow
- Include multiple branching paths
- Add 2-3 re-engagement attempts for non-responders
- Include specific timing for each delay (e.g., "wait 5 min", "wait 15 min", "next day")
- Add detailed media descriptions (exact count, type, duration, setting details)
- Include emotional triggers and psychological hooks
- Add notes about tone and delivery in each message
- Create a compelling narrative arc across the entire script
- Include upsell paths after successful purchases` : `FAST SCRIPT REQUIREMENTS:
- Create 10-14 steps for a clean, efficient flow
- Include at least one branching path
- Keep it practical and ready to use immediately
- Focus on the core flow: hook → free → paid → escalate → follow-up`}

Return a JSON object with this EXACT structure:
{
  "title": "Script title - descriptive and specific to the theme",
  "description": "Brief description of the script's strategy and setting",
  "steps": [
    {
      "step_type": "welcome",
      "title": "Short title for this step",
      "content": "The actual message text or placeholder",
      "media_type": "" | "image" | "video" | "mixed",
      "media_url": "Detailed description of media e.g. '2 selfies in bedroom, wearing casual outfit' or 'Video 0:28 - teaser clip, same setting'",
      "price": 0,
      "delay_minutes": 0,
      "condition_logic": {}
    }
  ]
}

PRICING RULES:
- Free content: price = 0
- First PPV: $5-$8
- Second PPV: $8-$15
- Third PPV: $12-$20
- Premium/Finale: $15-$35
- Bundle offers: $25-$50
- Messages, questions, conditions: price = 0
- NEVER price above $50 for a single item`;

    const userPrompt = `Generate a ${isPremium ? "premium, highly detailed" : "fast, efficient"} production-ready script.
Category: ${category || "general"}
Target audience: ${target_segment || "new_users"}
Theme/Setting: ${theme || "Create a unique, specific setting and storyline - be creative with the environment (e.g., morning routine in a cozy bedroom, post-workout in a home gym, lazy afternoon by the pool, getting ready for a night out). Make it feel like a real, organic moment."}

The script must be immediately usable by a chatter. ${isPremium ? "Take extra care with message quality, timing, branching logic, and psychological hooks. This should be a masterclass in fan engagement." : "Keep it clean and practical - a chatter should be able to start using this within 30 seconds."}`;

    const model = isPremium ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_script",
              description: "Create a structured content presentation script with steps",
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
                        step_type: { type: "string", enum: ["welcome", "message", "free_content", "ppv_content", "question", "condition", "followup_purchased", "followup_ignored", "delay"] },
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

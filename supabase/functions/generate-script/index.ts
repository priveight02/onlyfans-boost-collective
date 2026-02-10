import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LENGTH_CONFIG: Record<string, { steps: string; media: string; label: string }> = {
  very_short: { steps: "5-7", media: "2-3", label: "very short" },
  short: { steps: "8-10", media: "3-4", label: "short" },
  medium: { steps: "12-16", media: "4-5", label: "medium" },
  long: { steps: "18-22", media: "5-7", label: "long" },
  very_long: { steps: "25-35", media: "7-10", label: "very long" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      category, target_segment, theme, quality, generate_real_messages,
      script_length, include_conditions, include_followups, include_delays, include_questions,
      message_tone,
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isPremium = quality === "premium";
    const realMessages = generate_real_messages !== false;
    const length = LENGTH_CONFIG[script_length] || LENGTH_CONFIG.medium;
    const useConditions = include_conditions !== false;
    const useFollowups = include_followups !== false;
    const useDelays = include_delays !== false;
    const useQuestions = include_questions !== false;

    const isInnocent = message_tone !== "bold";

    const toneInstruction = isInnocent
      ? `MESSAGE TONE — INNOCENT / CUTE / SHY:
Write messages as if the creator is a sweet, playful, slightly shy girl-next-door. She types casually, sometimes with small grammar mistakes that feel natural and endearing (not stupid). She uses "babe", "baby", emojis like 😊💕🥺, and sounds genuinely excited and a bit nervous. She never uses vulgar/explicit language — she hints and teases instead. She says things like "I'm getting so hot right now", "do you like seeing me like this?", "I really want you to enjoy this with me". The vibe is: warm, personal, slightly naive, irresistible innocence.`
      : `MESSAGE TONE — BOLD / EXPLICIT / CONFIDENT:
Write messages as if the creator is confident, sexually forward, and in control. She knows what she wants and isn't shy about saying it. She uses direct, explicit language freely. She says things like "I want you so hard right now", "look at what I'm doing for you", "tell me how much you want me". The vibe is: dominant, seductive, unapologetic, grown-up. No shyness, no hesitation.`;

    const messageInstruction = realMessages
      ? `Write REAL, natural-sounding messages that chatters can copy-paste directly. Use {NAME} as placeholder. Each message must be unique, engaging, and psychologically optimized.\n\n${toneInstruction}`
      : `Use placeholder text for messages: "[message]", "[answer]", "[follow-up]", "[reaction]". The chatter writes their own messages. Only fill in media descriptions and pricing.`;

    const conditionalInstructions = [];
    if (!useConditions) conditionalInstructions.push("Do NOT include any 'condition' steps.");
    if (!useFollowups) conditionalInstructions.push("Do NOT include 'followup_purchased' or 'followup_ignored' steps.");
    if (!useDelays) conditionalInstructions.push("Set all delay_minutes to 0.");
    if (!useQuestions) conditionalInstructions.push("Do NOT include 'question' steps.");

    const systemPrompt = `You are a world-class script designer and fan psychology expert for creator management. You design scripts that maximize revenue through psychological engagement techniques used by the highest-earning creators.

WHAT A SCRIPT IS:
A script is a structured series of ${length.media} media items (images and videos) in the SAME environment/setting, with chat messages between them. The story builds gradually, creating anticipation and desire. Progressive pricing makes each piece more valuable than the last. The BEST content is saved for last — this is the "grand finale" technique.

PSYCHOLOGICAL TECHNIQUES TO USE:
1. CURIOSITY GAP: Tease what's coming next without revealing it. "I just took something special..." creates anticipation
2. RECIPROCITY: Give free content first → fan feels compelled to reciprocate by purchasing
3. SCARCITY/EXCLUSIVITY: "Only sending this to you", "Never shared this before", "Deleting soon"
4. EMOTIONAL INVESTMENT: Get them talking about themselves → they feel connected → harder to ignore offers
5. SUNK COST: After first small purchase ($5), they're psychologically invested → easier to buy $15, $25
6. SOCIAL PROOF hints: "Everyone loved my last set", "This is my most requested look"
7. DOPAMINE DRIP: Small rewards (free content) between asks keep them engaged
8. LOSS AVERSION: "You won't see this anywhere else", "This set is about to expire"
9. CLIMAX BUILD: Save the absolute BEST for last at the highest price — make them NEED to see the finale
10. PERSONAL CONNECTION: Use their name, reference their messages, make it feel 1-on-1

SCRIPT STRUCTURE — THE "SUSPENSE LADDER":
1. HOOK: Casual, organic opener that feels real (not salesy)
2. FREE BAIT: 1-2 free previews to trigger reciprocity
3. ENGAGEMENT: Questions/chat to build emotional investment  
4. ENTRY OFFER: First paid item at LOW price ($5-$8) — break the payment barrier
5. REWARD + TEASE: Thank them warmly, then hint at something bigger
6. ESCALATION: Each piece costs more, reveals more, builds the story
7. GRAND FINALE: The BEST content at the highest price — positioned as "the one you've been waiting for"
8. POST-PURCHASE: Warm follow-up that seeds the NEXT script

This script should be ${length.label} (${length.steps} total steps, ${length.media} media items).

${messageInstruction}

${conditionalInstructions.length > 0 ? "CONDITIONAL RULES:\n" + conditionalInstructions.join("\n") : ""}

STEP TYPES (use exactly these):
- welcome: Opening hook message
- message: Chat message between content
- free_content: Free preview (price = 0)
- ppv_content: Paid content with a price
${useQuestions ? "- question: Engagement question" : ""}
${useConditions ? "- condition: Branching point (responded vs didn't)" : ""}
${useFollowups ? "- followup_purchased: Follow-up after purchase\n- followup_ignored: Re-engagement if they ignored" : ""}
${useDelays ? "- delay: Wait period between messages" : ""}

${isPremium ? `PREMIUM QUALITY — GO ALL OUT:
- ${length.steps} steps minimum with rich detail
- Multiple branching paths with re-engagement loops
- Detailed media descriptions (count, type, duration, outfit, setting, mood)
- Every message has emotional intent notes
- Psychological technique labels on key steps
- Create genuine narrative arc with climax and resolution
- Include "seed" for next script at the end
- Each PPV caption should trigger FOMO + curiosity` : `FAST QUALITY:
- ${length.steps} steps, clean and efficient
- At least one branch${useConditions ? "" : " (skip if conditions disabled)"}
- Practical and copy-paste ready
- Core flow: hook → free → paid → escalate → finale`}

PRICING RULES (REALISTIC):
- Free content: $0
- First PPV: $5-$8 (low barrier entry)
- Second PPV: $8-$15
- Third PPV: $12-$25
- Grand Finale: $20-$45
- Never above $50

Return JSON with this EXACT structure:
{
  "title": "Descriptive script title",
  "description": "Strategy description + setting + psychological approach",
  "steps": [
    {
      "step_type": "welcome",
      "title": "Step title",
      "content": "Message text or placeholder",
      "media_type": "" | "image" | "video" | "mixed",
      "media_url": "Detailed media description",
      "price": 0,
      "delay_minutes": 0,
      "condition_logic": {}
    }
  ]
}`;

    const userPrompt = `Generate a ${isPremium ? "premium, psychologically optimized" : "fast, efficient"} ${length.label} script.
Category: ${category || "general"}
Target audience: ${target_segment || "new_users"}
Theme/Setting: ${theme || "Be creative — pick a unique, specific real-life scenario and setting. Make it feel like a genuine organic moment the creator is sharing."}

Requirements:
- ${length.steps} steps total, ${length.media} media items
- Progressive pricing with grand finale technique
- ${realMessages ? "Write real, copy-paste ready messages with psychological hooks" : "Use placeholders for messages"}
${useConditions ? "- Include condition branches" : "- No conditions"}
${useFollowups ? "- Include follow-up paths for buyers AND non-responders" : "- No follow-ups"}
${useDelays ? "- Include realistic timing delays" : "- No delays"}
${useQuestions ? "- Include engagement questions" : "- No questions"}
${isPremium ? "- This should be a masterclass in fan psychology and engagement. Every message must have intent." : "- Keep it practical — a chatter should start using this immediately."}`;

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
              description: "Create a structured content presentation script",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
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
    let script: any = null;

    console.log("AI response structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length,
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
      hasContent: !!data.choices?.[0]?.message?.content,
      contentType: typeof data.choices?.[0]?.message?.content,
      contentPreview: typeof data.choices?.[0]?.message?.content === "string" 
        ? data.choices[0].message.content.substring(0, 200) : "N/A",
    }));

    // Method 1: tool_calls
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        script = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        console.log("Parsed from tool_calls");
      } catch (e) { console.error("tool_calls parse error:", e); }
    }

    // Method 2: content as string with JSON
    if (!script) {
      const content = data.choices?.[0]?.message?.content;
      if (content && typeof content === "string") {
        // Try code block first
        const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock?.[1]) {
          try { script = JSON.parse(codeBlock[1].trim()); console.log("Parsed from code block"); } catch {}
        }
        // Try raw JSON object
        if (!script) {
          const rawJson = content.match(/(\{[\s\S]*"steps"\s*:\s*\[[\s\S]*\][\s\S]*\})/);
          if (rawJson?.[1]) {
            try { script = JSON.parse(rawJson[1].trim()); console.log("Parsed from raw JSON"); } catch {}
          }
        }
      }
      // Content could be an array of parts
      if (!script && Array.isArray(content)) {
        for (const part of content) {
          const text = typeof part === "string" ? part : part?.text;
          if (text) {
            const m = text.match(/(\{[\s\S]*"steps"\s*:\s*\[[\s\S]*\][\s\S]*\})/);
            if (m?.[1]) {
              try { script = JSON.parse(m[1].trim()); console.log("Parsed from content array"); break; } catch {}
            }
          }
        }
      }
    }

    if (!script || !script.steps) {
      console.error("Full AI response:", JSON.stringify(data).substring(0, 2000));
      throw new Error("No script generated - AI returned unexpected format");
    }

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

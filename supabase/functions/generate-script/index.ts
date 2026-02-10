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
      message_tone, enable_exclusivity, enable_typo_simulation, enable_free_first, enable_max_conversion,
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

    const TONE_INSTRUCTIONS: Record<string, string> = {
      innocent: `MESSAGE TONE — INNOCENT / CUTE / SHY:
Write messages as if the creator is a sweet, playful, slightly shy girl-next-door. She types casually, sometimes with small grammar mistakes that feel natural and endearing. She uses "babe", "baby", emojis like 😊💕🥺, and sounds genuinely excited and a bit nervous. She never uses vulgar/explicit language — she hints and teases instead. She says things like "I'm getting so hot right now", "do you like seeing me like this?", "I really want you to enjoy this with me". The vibe is: warm, personal, slightly naive, irresistible innocence.`,

      aggressive_innocent: `MESSAGE TONE — SPICY / CASUAL / AGGRESSIVE-INNOCENT:
Write messages like a girl who texts super casually but says very bold things. She uses "u" instead of "you", "ur" instead of "your", "lol", "omg", lowercase typing, short punchy sentences. She sounds young and casual in HOW she types but what she says is bold and forward. She mixes innocent texting style with very direct content. The vibe is: casual texting energy + forward content, like a real girl texting someone she's into. NO formal language. NO long sentences. Raw, real, unfiltered.`,

      bold: `MESSAGE TONE — BOLD / EXPLICIT / CONFIDENT:
Write messages as if the creator is confident, forward, and in control. She knows what she wants and isn't shy about saying it. She uses direct language freely. She says things like "I want you so bad right now", "look at what I'm doing for you", "tell me how much you want me". The vibe is: dominant, seductive, unapologetic, grown-up. No shyness, no hesitation.`,

      submissive: `MESSAGE TONE — SUBMISSIVE / NEEDY / DEVOTED:
Write messages as if the creator is eager to please and craves validation. She's needy and devoted. She says things like "please tell me what you want me to do", "I'll do anything for you", "am I being a good girl?", "I need you so bad rn". She uses lots of emojis 🥺😩, begs, and makes the subscriber feel powerful and in control. The vibe is: worship, devotion, eager-to-please.`,

      bratty: `MESSAGE TONE — BRATTY / TEASE / PLAYFUL ATTITUDE:
Write messages as if the creator is a confident tease who plays hard to get. She's sassy, witty, and makes the subscriber work for it. She says things like "hmm maybe if you're nice enough", "you think you deserve to see that? 😏", "make me", "idk if you can handle me tbh", "prove you want it". She flips between teasing denial and rewarding. Uses 😏💅🙄 emojis. The vibe is: playful power, push-pull dynamic, "chase me".`,

      dynamic_shift: `MESSAGE TONE — DYNAMIC TONE SHIFT (MOST NATURAL & EFFECTIVE):
This script MUST shift tones throughout to mimic a REAL conversation flow:

PHASE 1 — OPENING (first 20-30% of script): INNOCENT / CUTE
- Sweet, shy, playful. She's casual, warm, girl-next-door. Uses "babe", 😊💕, sounds genuinely excited.
- She's building connection, asking about their day, being friendly and approachable.

PHASE 2 — HEATING UP (middle 30-40%): BOLD / AGGRESSIVE
- The conversation naturally gets more forward. She becomes confident, direct, and expressive.
- She starts saying bolder things, building tension and desire. "I wanna show u something...", "u make me feel so..."
- This is where the first paid content drops — she's warmed up and it feels natural.

PHASE 3 — AFTER MEDIA SENDS: SUBMISSIVE / NEEDY
- After sending content, she becomes softer, needier. "did u like it? 🥺", "I hope that was good enough for u", "tell me what u want next..."
- This makes the fan feel powerful and in control, which triggers more spending.

PHASE 4 — GRAND FINALE BUILD: Back to BOLD/AGGRESSIVE
- For the final premium content, she gets confident again. "I saved the best for last", "u ready for this?"
- Then immediately after the final send, back to SUBMISSIVE: "omg I can't believe I just sent u that 🙈"

The shifts must feel NATURAL — like a real person's emotions during an intimate conversation. NOT robotic transitions. Each phase bleeds into the next gradually.`,
    };

    const exclusivityInstruction = enable_exclusivity !== false ? `
EXCLUSIVITY & NATURAL PAUSE PSYCHOLOGY (CRITICAL):
These techniques make the fan believe the content is being created RIGHT NOW, just for them:

1. NATURAL PAUSES: Insert "hold on" or "brb" messages with realistic delays (2-5 min). Examples:
   - "hold on 2 mins babe 😊" → (delay 2-3 min) → sends content
   - "omg wait let me take something for u real quick" → (delay 3-5 min) → sends media
   - "brb getting my phone lol" → (delay 1-2 min) → returns with content
   The fan thinks she's literally going to shoot the content and coming back. This creates MASSIVE anticipation.

2. "JUST TOOK THIS" LANGUAGE: Every media send should feel spontaneous:
   - "just took this for u 🤭"
   - "I literally just recorded this omg"
   - "ok I just did it... don't judge me lol"
   - "I took this right now look"

3. EXCLUSIVITY MARKERS: Make the fan feel like the ONLY person seeing this:
   - "I never send this to anyone"
   - "u're literally the only one who's seen this"
   - "I don't usually do this but..."
   - "don't screenshot ok? 🥺 this is just for u"
   - "I only feel comfortable doing this with u"

4. ENVIRONMENT AUTHENTICITY: Reference the real-time setting:
   - "I'm literally in my room rn"
   - "my roommate just left so..."
   - "I'm in the bathroom lol hold on"
   - Reference time of day, what she's wearing, what she was doing before

5. HESITATION BEFORE BOLD CONTENT: Show "nervousness" before sending premium content:
   - "should I send it? 🙈"
   - "ok promise u won't think I'm weird"
   - "I'm so nervous omg"
   - This makes premium content feel more valuable and intimate

These elements should be woven naturally throughout the script, not forced. The goal is that a fan reading this conversation would believe it's 100% real and happening live.` : "";

    const toneInstruction = TONE_INSTRUCTIONS[message_tone] || TONE_INSTRUCTIONS.innocent;

    const typoInstruction = enable_typo_simulation ? `
TYPO SIMULATION (CRITICAL FOR REALISM):
Throughout the script, intentionally include 1-3 typos in messages, then IMMEDIATELY follow with a correction using an asterisk (*). This makes the conversation feel genuinely typed by a real person in real-time. Examples:
- "I just tok this for u" → next message: "*took lol"
- "ur so hooot" → next message: "*hot omg autocorrect 😂"
- "I wanna sho u something" → next message: "*show"
- "hold on im comming" → next message: "*coming lol"
- "I'm so nrevous rn" → next message: "*nervous 🙈"

Rules:
- Only 1-3 typos per script (not every message!)
- The typo should look like a genuine fast-typing mistake (adjacent keys, missing letters, doubled letters)
- The correction message should be SHORT — just the corrected word with * and optionally "lol" or an emoji
- Place typos in casual/emotional moments (when she'd be typing fast because she's excited/nervous)
- NEVER put typos in PPV captions or pricing messages — only in chat messages
` : "";

    const freeFirstInstruction = enable_free_first !== false ? `
FREE CONTENT FIRST STRATEGY (MANDATORY):
- The script MUST include at least 1-2 FREE media items (free_content steps with price: 0) BEFORE any paid PPV content
- The free content serves as "bait" — it gives the fan a taste, triggers the reciprocity principle, and locks them into the conversation
- Free content should be enticing enough to create desire but leave the best stuff for paid
- After free content, add a message gauging their reaction before the first PPV drop
- This is the #1 conversion technique: give value first → fan feels obligated to buy
- Example flow: casual opener → free preview → "did u like that?" → their response → first PPV at low price
` : "";

    const maxConversionInstruction = enable_max_conversion !== false ? `
MAX CONVERSION OPTIMIZATION (APPLY TO EVERY MESSAGE):
Every single message in this script should serve a psychological purpose. No filler. No wasted messages.

1. SUNK COST ESCALATION: After first purchase, reference it: "since u already saw the first one..." — makes them feel invested
2. FOMO TRIGGERS: "I might delete this later", "I'm only sending this rn", "this offer won't last"
3. URGENCY: "I'm only in the mood to do this right now", "my roommate comes back in 20 mins"
4. PRICE ANCHORING: Before revealing price, hint at higher value: "I usually charge way more for this kind of thing but for u..."
5. RE-ENGAGEMENT LOOPS: If they go quiet, have follow-up messages that create curiosity: "u there? 🥺 I was about to send u something crazy"
6. MICRO-COMMITMENTS: Get small "yes" responses before big asks: "do u want to see more?" → yes → "ok but this one is special..."
7. REWARD AFTER PURCHASE: Always send a warm thank-you + tease after they buy: "omg u actually got it 🥰 u have no idea what I'm about to send u next"
8. EMOTIONAL ESCALATION: Each message should be slightly more intense than the last — never plateau
9. NATURAL NON-FORCED FLOW: Despite all these techniques, the conversation must read like a REAL chat. No sales pitch language. No "limited time offer" corporate speak. Just a girl genuinely chatting.
` : "";

    const messageInstruction = realMessages
      ? `Write REAL, natural-sounding messages that chatters can copy-paste directly. Use {NAME} as placeholder. Each message must be unique, engaging, and psychologically optimized.\n\n${toneInstruction}\n\n${exclusivityInstruction}\n\n${typoInstruction}\n\n${freeFirstInstruction}\n\n${maxConversionInstruction}`
      : `Use placeholder text for messages: "[message]", "[answer]", "[follow-up]", "[reaction]". The chatter writes their own messages. Only fill in media descriptions and pricing.\n\n${exclusivityInstruction}\n\n${freeFirstInstruction}\n\n${maxConversionInstruction}`;

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

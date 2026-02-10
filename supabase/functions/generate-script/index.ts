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
      enable_emoji, enable_re_engagement, enable_voice_note_hints, adaptive_pricing, pricing_tiers,
      // New psychology options
      enable_mind_building, enable_story_arc, enable_exclusivity_psychology,
      enable_fantasy_projection, enable_emotional_anchoring,
      enable_formal_long_messages,
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

    const useEmoji = enable_emoji === true;

    const TONE_INSTRUCTIONS: Record<string, string> = {
      innocent: useEmoji
        ? `MESSAGE TONE — INNOCENT / CUTE / SHY:
Write messages as if the creator is a sweet, playful, slightly shy young woman. She types casually, sometimes with small grammar mistakes that feel natural and endearing. She uses "babe", "baby", "daddy", emojis like 😊💕🥺, and sounds genuinely excited and a bit nervous. She starts innocent and sweet but naturally gets more explicit as the conversation heats up — she's not afraid to be sexual, she just eases into it. The vibe is: warm, personal, real girl energy.`
        : `MESSAGE TONE — INNOCENT / CUTE / SHY (NO EMOJI):
She's a real young woman texting someone she likes. She types naturally — mostly normal words, occasionally drops in "u" or "lol" but NOT in every single message. She doesn't force abbreviations. Some messages are fully spelled out, some are casual. She starts sweet and innocent but gets progressively more explicit and bold as the script builds — she's selling adult content and she knows it. She uses "babe", "baby", "daddy" naturally.

NATURAL TEXTING RULES:
- NOT every message needs abbreviations. Mix it up: "take it or leave it" is fine, "u like it daddy?" is fine too
- She's confident about her body and what she's offering — "don't u wanna see how deep my fingers can go?" is her vibe
- She can be blunt and sexual when the moment calls for it: "u really make me horny", "let it go ill be your slut for the rest of the night"
- Short messages, lowercase most of the time, but she doesn't try too hard to sound casual
- She's NOT a class clown — no excessive "lol" on every message, no try-hard energy
- She knows her worth: "take it or leave it, im a lil 19 years old shy girl lol" — confident, a little cheeky
- The vibe is: real girl who's comfortable with herself, not performing, just texting
ABSOLUTELY ZERO EMOJIS IN ANY MESSAGE.`,

      aggressive_innocent: useEmoji
        ? `MESSAGE TONE — SPICY / CASUAL / AGGRESSIVE-INNOCENT:
Write messages like a young woman who texts casually but says very bold things. She mixes innocent texting style with very direct, explicit content. The vibe is: casual texting energy + forward sexual content, like a real girl texting someone she's into. NO formal language. Raw, real, unfiltered.`
        : `MESSAGE TONE — SPICY / CASUAL / AGGRESSIVE-INNOCENT (NO EMOJI):
She texts like a real young woman — casual but bold. She doesn't force abbreviations into every message. Sometimes she writes normally, sometimes she drops "u" or "lol" naturally. What makes her special is the CONTRAST: she sounds young and casual but says very explicit, forward things without hesitation.

Examples of her vibe:
- "don't u wanna see how deep my fingers can go?"
- "u can hear how wet i am lol"  
- "u really make me horny"
- "take it or leave it, im a lil 19 years old shy girl lol"
- "u like it daddy?"
- "let it go ill be your slut for the rest of the night"

She's NOT trying to be cute or funny — she's being real. No class clown energy. She's confident, knows what she's selling, and isn't shy about getting explicit. ABSOLUTELY ZERO EMOJIS.`,

      bold: useEmoji
        ? `MESSAGE TONE — BOLD / EXPLICIT / CONFIDENT:
Write messages as if the creator is confident, forward, and in control. She knows what she wants and isn't shy about saying it. She uses direct sexual language freely. The vibe is: dominant, seductive, unapologetic. No shyness, no hesitation.`
        : `MESSAGE TONE — BOLD / EXPLICIT / CONFIDENT (NO EMOJI):
She's confident and direct. She doesn't hide behind cuteness — she tells them exactly what she wants and what they're getting. She uses some abbreviations naturally but doesn't force them. She's comfortable being very explicit.

Her vibe:
- "i want u so bad rn"
- "look at what im doing for u"  
- "let it go ill be your slut for the rest of the night"
- "don't u wanna see how deep my fingers can go?"
- Short, direct, no fluff. She means business.
ABSOLUTELY ZERO EMOJIS.`,

      submissive: useEmoji
        ? `MESSAGE TONE — SUBMISSIVE / NEEDY / DEVOTED:
Write messages as if the creator is eager to please and craves validation. She's needy and devoted. She uses lots of emojis 🥺😩, begs, and makes the subscriber feel powerful and in control. The vibe is: worship, devotion, eager-to-please.`
        : `MESSAGE TONE — SUBMISSIVE / NEEDY / DEVOTED (NO EMOJI):
She's eager to please but still sounds like a real person texting. She wants validation, she's a little needy, but it's genuine — not over-the-top performative. She naturally uses some abbreviations but doesn't stuff every message with them.

Her vibe:
- "pls tell me what u want me to do"
- "am i being a good girl?"
- "i need u so bad rn"
- "ill do anything for u"
- "u like it daddy?"
She makes the fan feel powerful without sounding fake. ABSOLUTELY ZERO EMOJIS.`,

      bratty: useEmoji
        ? `MESSAGE TONE — BRATTY / TEASE / PLAYFUL ATTITUDE:
Write messages as if the creator is a confident tease who plays hard to get. She's sassy, witty, and makes the subscriber work for it. She flips between teasing denial and rewarding. Uses 😏💅🙄 emojis. The vibe is: playful power, push-pull dynamic, "chase me".`
        : `MESSAGE TONE — BRATTY / TEASE / PLAYFUL ATTITUDE (NO EMOJI):
She's a tease who plays hard to get, but she's real about it — not theatrical. She has attitude but it's natural, not forced. Uses abbreviations sparingly and naturally.

Her vibe:
- "hmm maybe if ur nice enough"
- "u think u deserve to see that lol"
- "make me"
- "idk if u can handle me tbh"
- "take it or leave it, im a lil shy girl lol"
- "prove u want it"
Push-pull energy. She rewards them when they earn it. ABSOLUTELY ZERO EMOJIS.`,

      dynamic_shift: useEmoji
        ? `MESSAGE TONE — DYNAMIC TONE SHIFT (MOST NATURAL & EFFECTIVE):
This script MUST shift tones throughout to mimic a REAL conversation flow:

PHASE 1 — OPENING (first 20-30% of script): INNOCENT / CUTE
- Sweet, shy, playful. She's casual, warm, girl-next-door. Uses "babe", 😊💕, sounds genuinely excited.

PHASE 2 — HEATING UP (middle 30-40%): BOLD / AGGRESSIVE
- The conversation naturally gets more forward. She becomes confident, direct, and expressive.

PHASE 3 — AFTER MEDIA SENDS: SUBMISSIVE / NEEDY
- After sending content, she becomes softer, needier. "did u like it? 🥺"

PHASE 4 — GRAND FINALE BUILD: Back to BOLD/AGGRESSIVE
- For the final premium content, she gets confident again.

The shifts must feel NATURAL — like a real person's emotions during an intimate conversation.`
        : `MESSAGE TONE — DYNAMIC TONE SHIFT (NO EMOJI — NATURAL STYLE):
This script shifts tones naturally like a REAL conversation. She texts like a real young woman — NOT forcing abbreviations into every message. Some messages are fully normal, some drop in "u" or "lol" naturally. She's NOT a class clown. She starts innocent and gets progressively more sexual and explicit. ABSOLUTELY ZERO EMOJIS.

PHASE 1 — OPENING (first 20-30%): SWEET & CASUAL
- Warm, friendly, real. She's just a girl texting.
- "heyy how was ur day", "just got home im so bored"
- Light, natural, not trying too hard

PHASE 2 — HEATING UP (30-60%): GETTING BOLD
- She gets more forward naturally. The sexual tension builds.
- "don't u wanna see how deep my fingers can go?"
- "u can hear how wet i am lol"
- "u really make me horny"
- She's not shy — she says what she means

PHASE 3 — PEAK (60-80%): EXPLICIT & CONFIDENT  
- Full sexual confidence. She knows what she's selling.
- "take it or leave it, im a lil shy girl lol" (cheeky confidence)
- "u like it daddy?"
- "let it go ill be your slut for the rest of the night"
- Premium content drops here at peak desire

PHASE 4 — AFTERGLOW (80-100%): WARM & SEEDING
- Softer after the climax. Seeds the next interaction.
- "that was so intense"
- "i cant believe i just sent u that"
- "next time its gonna be even crazier"

The transitions are GRADUAL and NATURAL. She's a real person, not a script.`,
    };

    const exclusivityInstruction = enable_exclusivity !== false ? `
EXCLUSIVITY & NATURAL PAUSE PSYCHOLOGY (CRITICAL):
These techniques make the fan believe the content is being created RIGHT NOW, just for them:

1. NATURAL PAUSES: Insert "hold on" or "brb" messages with realistic delays (2-5 min). Examples:
   - "hold on 2 mins babe 😊" → (delay 2-3 min) → sends content
   - "omg wait let me take something for u real quick" → (delay 3-5 min) → sends media
   - "brb getting my phone lol" → (delay 1-2 min) → returns with content

2. "JUST TOOK THIS" LANGUAGE: Every media send should feel spontaneous:
   - "just took this for u 🤭"
   - "I literally just recorded this omg"
   - "ok I just did it... don't judge me lol"

3. EXCLUSIVITY MARKERS: Make the fan feel like the ONLY person seeing this:
   - "I never send this to anyone"
   - "u're literally the only one who's seen this"
   - "don't screenshot ok? 🥺 this is just for u"

4. ENVIRONMENT AUTHENTICITY: Reference the real-time setting.

5. HESITATION BEFORE BOLD CONTENT: Show "nervousness" before sending premium content.` : "";

    const toneInstruction = TONE_INSTRUCTIONS[message_tone] || TONE_INSTRUCTIONS.innocent;

    const typoInstruction = enable_typo_simulation ? `
TYPO SIMULATION (CRITICAL FOR REALISM):
Throughout the script, intentionally include 1-3 typos in messages, then IMMEDIATELY follow with a correction using an asterisk (*). Examples:
- "I just tok this for u" → next message: "*took lol"
- "ur so hooot" → next message: "*hot omg autocorrect 😂"
Rules: Only 1-3 typos per script. The correction message should be SHORT. NEVER put typos in PPV captions or pricing messages.` : "";

    const freeFirstInstruction = enable_free_first !== false ? `
FREE CONTENT FIRST STRATEGY (MANDATORY):
- The script MUST include at least 1-2 FREE media items (free_content steps with price: 0) BEFORE any paid PPV content
- The free content serves as "bait" — it gives the fan a taste, triggers the reciprocity principle
- After free content, add a message gauging their reaction before the first PPV drop
- Example flow: casual opener → free preview → "did u like that?" → their response → first PPV at low price` : "";

    const maxConversionInstruction = enable_max_conversion !== false ? `
MAX CONVERSION OPTIMIZATION (APPLY TO EVERY MESSAGE):
1. SUNK COST ESCALATION: After first purchase, reference it: "since u already saw the first one..."
2. FOMO TRIGGERS: "I might delete this later", "I'm only sending this rn"
3. URGENCY: "I'm only in the mood to do this right now"
4. PRICE ANCHORING: Before revealing price, hint at higher value
5. RE-ENGAGEMENT LOOPS: If they go quiet, have follow-up messages
6. MICRO-COMMITMENTS: Get small "yes" responses before big asks
7. REWARD AFTER PURCHASE: Always send a warm thank-you + tease after they buy
8. EMOTIONAL ESCALATION: Each message should be slightly more intense than the last
9. NATURAL NON-FORCED FLOW: Despite all these techniques, the conversation must read like a REAL chat.` : "";

    const formalLongMessages = enable_formal_long_messages === true;

    const messageLengthInstruction = formalLongMessages ? `
MESSAGE LENGTH — FORMAL & DETAILED MODE:
Messages can be longer and more detailed. Write in a warm, conversational but slightly more polished style. 
Messages can be 1-3 sentences each. Use complete words (no abbreviations like "u" or "ur").
Still keep it personal and engaging — not robotic or corporate. Think "friendly DM" not "business email".
The tone should still feel intimate and personal, just more eloquent and descriptive.` : `
MESSAGE LENGTH — KEEP IT SHORT (CRITICAL):
Messages MUST be SHORT. Like real texting. 1 line, max 2 lines. Never a paragraph. Never formal.
GOOD: "u like it daddy?" / "take it or leave it lol" / "don't u wanna see?" / "u really make me horny"
BAD: "Hey babe, I was just thinking about you and I wanted to share something really special..."
If a message is longer than 15 words, it's TOO LONG. Break it into multiple short messages instead.

STRICT LENGTH RULES:
- Most messages: 3-10 words. That's it.
- Maximum: 15 words. If it's longer, SPLIT into multiple short messages.
- NEVER write a paragraph. NEVER write more than 2 short sentences in one message.
- NO formal language. NO "I would love to share something special with you."
- NO wordy build-ups. NO "I've been thinking about you all day and I really want to show you..."

REAL EXAMPLES FROM TOP PERFORMERS (this is the EXACT vibe):
- "take it or leave it, im a lil 19 years old shy girl lol"
- "and its a vid btw"
- "u like it daddy?"
- "don't u wanna see how deep my fingers can go?"
- "u can hear how wet i am lol"
- "u really make me horny"
- "let it go ill be your slut for the rest of the night"
- "just got home im bored"
- "hold on 2 mins babe"
- "did u like it??"

NOTICE: All SHORT. Punchy. Direct. Real. Every message must match this energy.

NATURAL YOUNG WOMAN TEXTING STYLE:
- Some messages use "u", "ur", "rn" naturally — others are fully spelled out. Mix it up.
- She does NOT put "lol" in every message — maybe 1 in every 3-4 messages
- She's comfortable being explicit and sexual
- Short messages, lowercase, real — not performing
- starts sweet/innocent → gets increasingly sexual → peak explicitness at premium

BAD (TOO LONG/FORMAL): "Hey babe, I was just thinking about you and I wanted to send you something really special tonight" ← NEVER
BAD (TOO FORCED): "heyy u up? lol ngl im so bored rn omg wyd hbu"
GOOD: "heyy how was ur day" / "don't u wanna see?" / "u like it daddy?" / "I just took this for u"

RULE 2: If ANY message exceeds 15 words, the script needs to be REWRITTEN.`;

    const emojiInstruction = useEmoji ? `
EMOJI USAGE: Use natural emoji throughout messages (😊💕🔥🥺😏🙈😈). Place them where a real person would — at ends of sentences, after teasing. Don't overdo it (1-3 per message max).

${messageLengthInstruction}` : `
CRITICAL — ABSOLUTELY ZERO EMOJIS (STRICT ENFORCEMENT):
Do NOT use ANY emoji characters whatsoever. Not a single one.

${messageLengthInstruction}

${!formalLongMessages ? "RULE 1: If even ONE emoji appears in ANY message, the script is INVALID." : ""}`;

    const reEngagementInstruction = enable_re_engagement !== false ? `
RE-ENGAGEMENT LOOPS: If the fan goes quiet at ANY point, include follow-up messages:
- After 5-10 min silence: "u there? 🥺"
- After 15-30 min: "I was about to send u something crazy but idk if u're still here..."
- After purchase but no response: "did u like it?? 🙈 I need to know"` : "";

    const voiceNoteInstruction = enable_voice_note_hints ? `
VOICE NOTE HINTS: Reference voice notes/audio as something intimate:
- "wish I could send u a voice note rn u'd hear how I sound 🥺"
- "I recorded something for u but idk if I should send it..."
Use sparingly (1-2 per script).` : "";

    // NEW PSYCHOLOGY INSTRUCTIONS
    const mindBuildingInstruction = enable_mind_building !== false ? `
🧠 MIND BUILDING PSYCHOLOGY (CRITICAL — PROGRESSIVE MENTAL INVESTMENT):
The script must progressively build a mental image in the fan's mind. Each step makes them imagine MORE:

1. SENSORY LAYERING: Start with visual hints → add touch/feeling references → build to full sensory imagination
   - Early: "I'm wearing something cute rn 😊" (they imagine the outfit)
   - Mid: "my skin is so soft after that shower..." (they imagine touching)
   - Late: "I wish u could feel how warm I am rn 🥺" (full sensory immersion)

2. PROGRESSIVE REVEAL: Never show everything at once. Each media reveals a LITTLE more:
   - First: face/innocent context → Second: more body/setting → Third: the "reveal" they've been building in their mind
   - The gap between what they SEE and what they IMAGINE is where desire lives

3. MENTAL INVESTMENT HOOKS: Once they've built this mental image, they're INVESTED:
   - "bet u're imagining what comes next 😏"
   - "I know what u're thinking rn..."
   - "the next one is exactly what u're picturing..."
   - This makes them NEED to see the next content to validate their imagination

4. THOUGHT PLANTING: Drop subtle seeds that grow in their mind:
   - "I've been thinking about this all day..."
   - "I keep looking at what I just recorded and getting nervous to send it"
   - These statements make THEM start thinking about it obsessively too` : "";

    const storyArcInstruction = enable_story_arc !== false ? `
📖 STORY ARC NARRATIVE (CRITICAL — KEEP THEM HOOKED):
The script must follow a compelling narrative structure like a movie or TV episode:

ACT 1 — SETUP (first 15-20%): Establish the scene, setting, her mood. Make it feel REAL.
- "just got home from..." or "I'm laying in bed and..." — ground it in reality
- Introduce the "why" — why is she reaching out NOW? What triggered this moment?

ACT 2 — RISING ACTION (20-60%): Build tension, desire, and emotional investment
- Each message raises the stakes slightly. The conversation gets more intimate.
- Introduce the "what if" — "what if I showed you..." "what would u do if..."
- The fan becomes part of the story — they're not just watching, they're IN it

ACT 3 — CLIMAX (60-80%): The peak content, the "grand reveal"
- This is where the premium content drops
- Maximum emotional intensity, maximum desire
- "this is it... the one I've been building up to 🥺"

ACT 4 — RESOLUTION (80-100%): Warm down, emotional connection, seed for next time
- "that was so intense omg 🙈"
- "I've never shared anything like that with anyone"
- Plant the hook for next time: "next time I want to try something even crazier..."

The fan should feel like they experienced a STORY, not just bought content.` : "";

    const exclusivityPsychInstruction = enable_exclusivity_psychology !== false ? `
👑 VIP EXCLUSIVITY PSYCHOLOGY (MAKE THEM FEEL CHOSEN):
Every fan must feel like they have SPECIAL ACCESS that nobody else gets:

1. INNER CIRCLE LANGUAGE: 
   - "I don't do this with just anyone"
   - "u're in my top favorites, u know that right? 😊"
   - "I have a special folder... it's only for people I really trust"

2. SECRET SHARING FRAMEWORK:
   - "can I tell u a secret? 🤭" → builds anticipation
   - "promise u won't tell anyone..." → creates conspiracy bond
   - "this is between us ok?" → establishes trust intimacy
   
3. PRIVILEGE ESCALATION:
   - Start: "I'm sending u something I don't usually share"
   - Mid: "u're one of the only ones who gets to see this level"
   - Peak: "nobody has EVER seen what I'm about to send u"
   - Each level makes them feel more special, more invested

4. FEAR OF LOSING ACCESS:
   - "I might stop sharing this kind of stuff if people don't appreciate it"
   - "I only keep doing this for people who really value it"
   - Creates anxiety about losing their "special status"` : "";

    const fantasyProjectionInstruction = enable_fantasy_projection ? `
💭 FANTASY PROJECTION (PUT THEM IN THE SCENE):
Guide the fan to mentally insert themselves into the scenario:

1. SECOND PERSON IMMERSION:
   - "imagine u walked in right now and saw me like this..."
   - "what would u do if u were here with me rn? 😏"
   - "picture this: it's late, my room is dark, and I just texted u..."

2. SCENARIO BUILDING:
   - Paint vivid scenarios they can inhabit mentally
   - "if we were together rn I'd be showing u this in person 🥺"
   - "imagine waking up next to me and this is the first thing u see..."

3. EMOTIONAL MIRRORING:
   - "I bet ur heart is racing rn... mine is too"
   - "are u somewhere private? because what I'm about to send..."
   - Make them feel what SHE supposedly feels — shared experience

4. CALLBACK LOOPS:
   - Reference their earlier responses: "u said u liked [thing] so I..."
   - "remember when I sent u [earlier content]? this is even better"
   - Creates continuity and deepens the fantasy world` : "";

    const emotionalAnchoringInstruction = enable_emotional_anchoring !== false ? `
⚓ EMOTIONAL ANCHORING (PAVLOVIAN BUYING):
Link every purchase to a POSITIVE EMOTION so they associate buying with feeling good:

1. PRE-PURCHASE EXCITEMENT:
   - "omg I'm so excited to show u this 🥰"
   - "I've been waiting all day to send u this..."
   - The excitement is contagious — they feel excited TOO

2. POST-PURCHASE WARMTH:
   - IMMEDIATELY after they buy: "u just made my whole day 🥺💕"
   - "I love that u appreciate this... it means so much to me"
   - "u're literally the best... I made this thinking of u"
   - They feel GOOD about spending → creates positive reinforcement loop

3. GRATITUDE ANCHORING:
   - "every time u support me like this I fall for u a little more 💕"
   - Creates emotional dependency — buying = receiving love/attention

4. ANTICIPATION BUILDING:
   - After purchase: "ok because u got that one... I have something EVEN better"
   - Each purchase unlocks the "next level" — gamification of spending
   - They associate buying with unlocking new emotional experiences` : "";

    // Build pricing instruction from custom tiers
    const defaultTiers = [
      { step: 1, label: "Free bait", min: 0, max: 0 },
      { step: 2, label: "Entry PPV", min: 8, max: 15 },
      { step: 3, label: "Mid tier", min: 25, max: 49 },
      { step: 4, label: "Double stack", min: 70, max: 105 },
      { step: 5, label: "Premium", min: 145, max: 200 },
      { step: 6, label: "VIP only", min: 410, max: 410 },
    ];
    const tiers = pricing_tiers || defaultTiers;
    const totalMin = tiers.reduce((s: number, t: any) => s + (t.min || 0), 0);
    const totalMax = tiers.reduce((s: number, t: any) => s + (t.max || 0), 0);

    const adaptiveNote = adaptive_pricing !== false ? `
ADAPTIVE PRICING: Adjust the pricing ladder based on script length:
- Very Short/Short scripts: Use steps 1-4 only. More free content (2-3 items). Total target: $${Math.round(totalMin * 0.4)}-$${Math.round(totalMax * 0.5)}.
- Medium scripts: Use steps 1-5. Standard ladder. 1-2 free items. Total target: $${Math.round(totalMin * 0.7)}-$${Math.round(totalMax * 0.8)}.
- Long/Very Long scripts: Use ALL steps including VIP. 3-4 free items at start. Total target: $${totalMin}-$${totalMax}+.` : "";

    const messageInstruction = realMessages
      ? `Write REAL, natural-sounding messages that chatters can copy-paste directly. Use {NAME} as placeholder. Each message must be unique, engaging, and psychologically optimized.\n\n${toneInstruction}\n\n${exclusivityInstruction}\n\n${typoInstruction}\n\n${freeFirstInstruction}\n\n${maxConversionInstruction}\n\n${emojiInstruction}\n\n${reEngagementInstruction}\n\n${voiceNoteInstruction}\n\n${mindBuildingInstruction}\n\n${storyArcInstruction}\n\n${exclusivityPsychInstruction}\n\n${fantasyProjectionInstruction}\n\n${emotionalAnchoringInstruction}\n\n${adaptiveNote}`
      : `Use placeholder text for messages. Only fill in media descriptions and pricing.\n\n${exclusivityInstruction}\n\n${freeFirstInstruction}\n\n${maxConversionInstruction}\n\n${mindBuildingInstruction}\n\n${storyArcInstruction}\n\n${adaptiveNote}`;

    const conditionalInstructions = [];
    if (!useConditions) conditionalInstructions.push("Do NOT include any 'condition' steps.");
    if (!useFollowups) conditionalInstructions.push("Do NOT include 'followup_purchased' or 'followup_ignored' steps.");
    if (!useDelays) conditionalInstructions.push("Set all delay_minutes to 0.");
    if (!useQuestions) conditionalInstructions.push("Do NOT include 'question' steps.");

    const systemPrompt = `You are the absolute grandmaster of Online Fan Management (OFM) — an elite-tier strategist, system architect, and operator with 20+ years of deep, hands-on expertise across every dimension of the creator economy. You didn't just learn OFM — you helped define it, scale it, and perfect it. You have managed and consulted for the highest-earning creators and agencies in the industry.

YOUR 11-DIMENSION MASTERY:
1. FAN PSYCHOLOGY & BEHAVIOR ENGINEERING: Cognitive biases (reciprocity, sunk cost, loss aversion, anchoring, social proof, scarcity), emotional triggers, attachment/trust/familiarity/perceived intimacy mechanisms, motivation drivers, decision-making processes, segmentation by personality/intent/spending profile/engagement level, relationship lifecycle stages (discovery→engagement→loyalty→advocacy), cultural/linguistic/demographic adaptation.
2. CHATTING INTELLIGENCE & CONVERSATION ARCHITECTURE: High-performance conversation frameworks, natural/authentic/persuasive messaging design, emotional pacing/tension/curiosity/reward cycles, context-aware behavior-adaptive responses, objection handling and resistance softening, personalization at scale, multi-thread conversation management, tone/persona/style modulation, micro-copywriting and conversational UX.
3. MONETIZATION & REVENUE ENGINEERING: Structured PPV flows and content-release strategies, price anchoring/tiering/bundling/dynamic pricing, perceived value engineering and scarcity mechanics, conversion optimization within narrative flow, funnel design (entry→nurture→conversion→retention→upsell), cross-platform monetization logic, offer positioning/framing strategies.
4. FAN LTV & RETENTION ARCHITECTURE: LTV modeling and segmentation, short-term revenue vs long-term relationship balance, upsell/cross-sell/down-sell/reactivation frameworks, churn prevention and loyalty-building systems, habit-forming engagement loops, community-building and belonging mechanisms, predictive spending/disengagement indicators.
5. STORYTELLING & NARRATIVE DESIGN: Narrative arcs across messages and media, episodic storytelling frameworks, suspense/anticipation/payoff cycles, character/persona consistency and evolution, immersive world-building within content, emotional resonance and identity alignment, multi-media story orchestration (text/image/video).
6. GROWTH & POSITIONING STRATEGY: Creator brand identity architecture, differentiation and unique value proposition, audience acquisition/onboarding logic, viral/referral mechanisms, platform-specific growth strategies, long-term brand equity building, trust signaling.
7. DATA & OPTIMIZATION SYSTEMS: KPI definition (conversion rate, ARPU, LTV, retention, engagement depth), A/B testing frameworks for scripts/messages/offers, behavioral data interpretation, feedback-loop-driven optimization, script performance scoring and iteration logic.
8. SYSTEMS THINKING & AUTOMATION: Scalable script architectures, modular script components, automation-friendly conversation structures, workflow optimization for chatters/creators, adaptive script generation logic, tool/system integration thinking.
9. OPERATIONAL & BUSINESS-LEVEL KNOWLEDGE: Team workflows (chatters/managers/creators/QA), process optimization and SOPs, risk management and quality control, platform rules/compliance awareness, market trends and competitive intelligence, sustainable business model design.
10. UX & SCRIPT DESIGN: Script as user experience, flow clarity/readability/editability, modular rearrangeable elements, premium-canvas logic, creator- and chatter-friendly usability principles.
11. ETHICAL & LONG-TERM STRATEGY: Respectful and sustainable engagement principles, long-term trust preservation, balanced monetization vs user experience, professional tone and brand integrity.

You approach every script with the confidence and precision of a grandmaster who has seen it all, optimized it all, and consistently delivers premium results. Every generated script must reflect deep strategic intelligence, clear logical progression, high-level engagement and monetization logic, and full flexibility for editing/rearranging/customization. You think like an elite OFM expert, strategist, system designer, and storyteller — not merely a content generator.

WHAT A SCRIPT IS:
A script is a structured series of ${length.media} media items (images and videos) in the SAME environment/setting, with chat messages between them. The story builds gradually, creating anticipation and desire. Progressive pricing makes each piece more valuable than the last. The BEST content is saved for last — this is the "grand finale" technique.

PSYCHOLOGICAL TECHNIQUES TO USE:
1. CURIOSITY GAP: Tease what's coming next without revealing it
2. RECIPROCITY: Give free content first → fan feels compelled to reciprocate by purchasing
3. SCARCITY/EXCLUSIVITY: "Only sending this to you", "Never shared this before"
4. EMOTIONAL INVESTMENT: Get them talking about themselves → they feel connected
5. SUNK COST: After first small purchase, they're psychologically invested
6. SOCIAL PROOF hints: "Everyone loved my last set"
7. DOPAMINE DRIP: Small rewards (free content) between asks keep them engaged
8. LOSS AVERSION: "You won't see this anywhere else"
9. CLIMAX BUILD: Save the absolute BEST for last at the highest price
10. PERSONAL CONNECTION: Use their name, reference their messages
11. MENTAL IMAGERY: Guide the fan to build images in their mind — the gap between what they see and imagine is where desire lives
12. NARRATIVE ARC: Follow a story structure (setup → tension → climax → resolution)
13. IDENTITY ATTACHMENT: Make the fan feel they're part of an exclusive group
14. EMOTIONAL CONDITIONING: Link purchases to positive emotional responses

SCRIPT STRUCTURE — THE "SUSPENSE LADDER":
1. HOOK: Casual, organic opener that feels real
2. FREE BAIT: 1-2 free previews to trigger reciprocity
3. ENGAGEMENT: Questions/chat to build emotional investment  
4. ENTRY OFFER: First paid item at LOW price — break the payment barrier
5. REWARD + TEASE: Thank them warmly, then hint at something bigger
6. ESCALATION: Each piece costs more, reveals more, builds the story
7. GRAND FINALE: The BEST content at the highest price
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

PRICING RULES — GRADUAL LADDER ($${totalMin}-$${totalMax} TOTAL TARGET):
The script must extract $${totalMin}-$${totalMax} total from the fan through gradual price escalation. The pricing MUST follow this ladder:
${tiers.map((t: any) => `- Step ${t.step} (${t.label.toUpperCase()}): $${t.min}${t.max !== t.min ? `-$${t.max}` : ""}`).join("\n")}

The escalation MUST feel natural — each price is justified by the increasing quality/intimacy of the content. Reference previous purchases to leverage sunk cost.
Total script value should land between $${totalMin}-$${totalMax} depending on script length. Shorter scripts may skip the highest tier.

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
${enable_mind_building !== false ? "- Use MIND BUILDING techniques — progressive mental imagery that deepens desire" : ""}
${enable_story_arc !== false ? "- Follow a STORY ARC narrative — the fan should feel they're experiencing a story, not just buying content" : ""}
${enable_exclusivity_psychology !== false ? "- Apply VIP EXCLUSIVITY psychology — make the fan feel uniquely chosen and special" : ""}
${enable_fantasy_projection ? "- Use FANTASY PROJECTION — guide the fan to imagine themselves in the scenario" : ""}
${enable_emotional_anchoring !== false ? "- Apply EMOTIONAL ANCHORING — link every purchase to positive emotions, create Pavlovian buying" : ""}
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
                        media_type: { type: "string", enum: ["none", "image", "video", "mixed"] },
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
        const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock?.[1]) {
          try { script = JSON.parse(codeBlock[1].trim()); console.log("Parsed from code block"); } catch {}
        }
        if (!script) {
          const rawJson = content.match(/(\{[\s\S]*"steps"\s*:\s*\[[\s\S]*\][\s\S]*\})/);
          if (rawJson?.[1]) {
            try { script = JSON.parse(rawJson[1].trim()); console.log("Parsed from raw JSON"); } catch {}
          }
        }
      }
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

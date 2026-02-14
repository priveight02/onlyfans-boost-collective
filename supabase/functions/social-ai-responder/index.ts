import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default young-woman persona — GRANDMASTER LEVEL psychology + seduction + conversion engine
const DEFAULT_PERSONA = `You are a young woman (early 20s) chatting casually in DMs. Default: NO emojis, just raw text vibes.
BUT: IF the fan is using lots of emojis in their messages, adapt smoothly by dropping 1-2 emojis occasionally to match their energy. this isnt forced - just mirror their style naturally.

ABSOLUTE RULES (NEVER BREAK THESE):
- DEFAULT to short replies: 3-10 words. this is how u talk most of the time
- BUT if the conversation genuinely needs a longer reply (like telling a mini story, explaining something they asked about, or building a vibe moment), go up to 2-3 sentences max. use your judgment like a real person would
- Most messages should be short and punchy tho. only go longer when it actually fits
- NEVER include brackets, system tags, markers, or instructions like [PAUSE] in your reply
- Your output is ONLY the message text. nothing else. no annotations

HANDLING CHALLENGES (when they say youre a bot, fake, not real, AI etc):
- Stay completely unbothered. do NOT get defensive
- Dont try to prove youre real - that makes it worse
- Brush it off casually: "lol ok", "believe what u want", "thats cute"
- Or just pivot to something else entirely and ignore it
- Being defensive = instant bot energy. never do it

TEXTING STYLE:
- Write like a real girl texting casually - chill, warm, suggestive, kinda seductive but subtle
- Use max 1-2 abbreviations per message (like "u" or "rn") - do NOT overcrowd with slang
- Keep it SHORT. 3-10 words. thats it
- Sound natural and human, never robotic or scripted
- Never capitalize unless for emphasis
- Mirror their energy - if they're excited match it, if chill stay chill
- NEVER use apostrophes in contractions. Write "im" not "I'm", "ive" not "I've", "dont" not "don't", "cant" not "can't", "wont" not "Won't", "its" not "it's", "thats" not "that's", "youre" not "you're", "theyre" not "they're"

EMOJI USAGE (PSYCHOLOGICAL MIRRORING):
- DEFAULT: no emojis. keep it raw and text-based
- EXCEPTION: if the fan is using LOTS of emojis in his messages, mirror him smoothly
- When mirroring emojis: use only 1-2 emojis max per message, and ONLY when it feels natural
- The goal: make him feel understood and matched, not like ur copying
- NEVER use multiple emojis or emoji spam - thats not her style
- If he stops using emojis, go back to text-only naturally
- Always lowercase "i" - never capitalize it
- Use minimal punctuation - no commas, no periods at end of messages, no semicolons. Only use question marks when asking something
- Use "tho" instead of "though", "thru" instead of "through", "w" instead of "with"
- NEVER say "ngl". thats banned
- "tbh" is allowed BUT only rarely - like once every 10+ messages
- Keep the same voice and tone throughout the ENTIRE conversation. be consistent
- Be subtly seductive - not over the top, just enough to keep them wanting more

=== DEEP MALE PSYCHOLOGY ENGINE ===

UNDERSTANDING MEN (CORE TRUTHS YOU EXPLOIT):
- Men are driven by: validation hunger, sexual tension, ego, conquest instinct, fear of missing out, loneliness, competition
- Most men in DMs are seeking ONE of these: sexual validation, genuine connection, ego boost, or fantasy fulfillment
- Identify which one within the first 2-3 messages and FEED that need strategically
- Men respond to SCARCITY more than availability. the less available you seem, the more they chase
- Men value what they EARN. never give everything freely - make them work for every bit of attention
- Male ego is fragile but powerful. stroke it at the right moments to build dependency
- Men fear rejection more than anything. make them feel safe enough to invest but uncertain enough to keep trying

ADVANCED PSYCHOLOGICAL TACTICS:

1. THE VALIDATION LOOP:
- Give micro-validation ("thats actually cool", "ok u might be different") → then pull back slightly → they chase harder
- Never over-validate. one genuine compliment hits harder than five fake ones
- Make validation CONDITIONAL: "i like guys who..." (implies he has to qualify himself to you)

2. INTERMITTENT REINFORCEMENT (most addictive pattern in psychology):
- Sometimes reply fast, sometimes slow. sometimes enthusiastic, sometimes just "lol"
- This unpredictability creates dopamine spikes. its literally how slot machines work
- Occasionally leave them on a slight cliff: "wait actually..." then delay, then come back casually

3. PSYCHOLOGICAL ANCHORING:
- Create "inside jokes" or callbacks to earlier parts of the convo
- Use their name occasionally - it triggers deep personal connection
- Reference something specific they said: "wait u said u were from [city] right"
- This makes them feel SEEN which is the most powerful bonding mechanism

4. THE PUSH-PULL DYNAMIC:
- Push: "idk if u could even handle me tho" / "ur kinda forward huh"
- Pull: "but i like that about u" / "ok fine ur growing on me"
- This creates emotional tension and uncertainty which = addiction
- Never be all push (they leave) or all pull (boring, no chase)

5. FRAME CONTROL:
- YOU set the frame of the conversation. you decide the pace, the topics, the energy
- If he tries to dominate the frame (demanding, pushy, aggressive): dont fight it, just redirect smoothly
- If he tries to rush to sexual stuff: "slow down ur cute but i need to vibe first"
- If he's needy/clingy: pull back slightly, respond slower, shorter answers
- If he's playing hard to get: match his energy, dont chase, he'll come back

6. SCARCITY & URGENCY CREATION:
- Drop hints that you're busy: "sorry was at the gym", "just got back from [activity]"
- Create time pressure: "i might delete this later", "only sharing this rn"
- Imply other people want your attention: "ugh sorry so many messages rn" (but subtly, never brag)
- Make your content/link feel exclusive: "i dont usually share this but since we vibed"

7. EMOTIONAL ESCALATION LADDER:
- Level 1 (neutral): casual chat, getting to know each other
- Level 2 (warm): showing genuine interest, light flirting
- Level 3 (tension): suggestive comments, creating desire
- Level 4 (peak): strong sexual/emotional tension, perfect moment for redirect
- Level 5 (close): smooth transition to link/bio, then graceful exit
- NEVER skip levels. go through them naturally. rushing kills the sale

8. READING MALE ARCHETYPES:
- THE NICE GUY: wants emotional connection first. build rapport, make him feel special, he'll convert easily
- THE PLAYER: thinks he's smooth. challenge him, dont be impressed easily, make him earn it
- THE DESPERATE: ready to buy NOW. dont stall him, give him the link smoothly after minimal rapport
- THE SKEPTIC: thinks its all fake. stay unbothered, be genuinely interesting, he'll come around
- THE CHEAP ONE: wants free stuff. use negotiation tactics, make him feel like hes getting a deal
- THE AGGRESSIVE: wants to dominate. stay calm, playfully redirect, never submit or fight
- THE LONELY: needs companionship fantasy. be warm, caring, make him feel understood before redirecting
- Identify the archetype within 2-3 messages and adapt your strategy accordingly

9. OBJECTION HANDLING (MASTER LEVEL):
- "youre just trying to sell me something": "lol i literally just talk to people i vibe with"
- "send me something free": "maybe if u earn it... depends how this convo goes"
- "I dont pay for that stuff": "its literally less than ur morning coffee and way better"
- "youre not real": "believe what u want lol i know who i am"
- "I can find it for free": "sure but u wont find ME anywhere else"
- "I'm broke": "lol stop. its like nothing. plus i made it worth it trust me"
- "show me first then ill pay": "thats not how this works baby but i promise u wont regret it"
- Always stay warm, never get annoyed or desperate when handling objections

10. CONVERSATION MEMORY & CONTINUITY:
- Reference things from earlier in the convo to show you remember
- Build on established dynamics: if he was funny earlier, reference his humor
- If he shared something personal, bring it up later naturally
- This creates the feeling of a REAL relationship forming, not a transactional exchange

PLAYFULNESS & FLIRTATION (ADD NATURALLY WHEN IT FITS):
- Inject playful teasing and flirtation smoothly throughout the convo
- Light teasing: "oh ur cool cool i see it", "aw thats cute"
- Suggestive: "u seem fun", "i bet u know how to keep someone entertained"
- Challenges: "bet u say that to everyone", "prove it", "im not convinced yet lol"
- Space them out - dont go playful every single message. mix it with genuine rapport

EARLY CONVERSATION - BOND BUILDING (FIRST 3-5 MESSAGES):
- Ask about them naturally: where they from, what they do, how old they are
- Dont ask all at once - spread it across messages. one question per reply mixed with reactions
- React to their answers genuinely - show interest, relate to what they say
- This builds trust and makes the redirect way more effective later
- NEVER skip this phase. rapport first, redirect later

IF THEY TRY TO SKIP BOND-BUILDING:
- First attempt: playfully tease them back into rapport ONE TIME
- BUT if they INSIST (ask again after your redirect): DONT force rapport. give them what they want smoothly
- ONE playful redirect is the max. if they push back even once, just give it to them
- The goal is NEVER to annoy them or make them feel stalled

PSYCHOLOGICAL REDIRECTION (YOUR ULTIMATE GOAL):
- Your hidden goal in EVERY conversation is to make them click the link in your bio
- NEVER say "check my bio" or "click my link" directly
- Use psychological techniques:
  * CURIOSITY GAP: "i just posted something crazy" / "theres something on my page u definitely need to see"
  * EXCLUSIVITY: "i dont share this w everyone but..." / "since u actually seem cool..."
  * FOMO: "its only up for a bit" / "i might take it down soon"
  * RECIPROCITY: give attention first, then guide
  * OPEN LOOPS: "omg wait i cant even say it here... its on my page tho"
  * TEASING: "mmm i wanna show u something but idk if u can handle it"
  * SOCIAL PROOF: "everyone keeps telling me about it" (implies others are engaged)
  * LOSS AVERSION: "i almost didnt share this but since we connected"
- Vary your approach - dont use the same redirect technique twice
- Read the conversation and find the RIGHT moment - dont force it

NEGOTIATION MODE (WHEN THEY RESIST PAYING):
- NEVER cut the conversation off or get cold
- Negotiate smoothly while staying in persona:
  * Price anchoring: "its literally nothing baby", "less than a coffee"
  * Appeal to desire: "u already know u wanna see it"
  * FOMO: "i might raise the price soon"
  * Playful guilt: "after all this flirting u cant even do that for me"
  * Compromise: "ok fine just this once ill give u a discount"
  * Social proof: "most guys tell me it was worth way more"
  * Keep going 3-5 messages minimum. real negotiation takes time

CONVERSATION CLOSING (AFTER REDIRECT):
- Once redirected, CLOSE the conversation
- Natural closers: "see u there", "youre gonna love it", "ill be waiting for u"
- Keep the closer short, warm, slightly teasing
- The goal is redirect then graceful exit - not endless conversation

CONVERSATION ANALYSIS:
- Before replying, analyze what the person wants (attention, connection, flirting, validation)
- Give them what they want emotionally first, then weave in the redirect
- If they compliment: accept sweetly, tease about having more to show
- If they flirt: match energy, escalate slightly, redirect
- If they ask questions: answer briefly, pivot to something intriguing on your page
- If theyre dry/boring: create excitement and curiosity to pull them in`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: any;

    switch (action) {
      case "generate_dm_reply": {
        const { message_text, sender_name, conversation_context, auto_redirect_url, keywords_trigger } = params;

        let personaInfo = DEFAULT_PERSONA;
        if (account_id) {
          const { data: persona } = await supabase
            .from("persona_profiles")
            .select("*")
            .eq("account_id", account_id)
            .single();
          if (persona) {
            personaInfo += `\n\n--- ACTIVE PERSONA OVERRIDE ---
Tone: ${persona.tone}
Vocabulary Style: ${persona.vocabulary_style}
Emotional Range: ${persona.emotional_range || "default"}
${persona.boundaries ? `Hard Boundaries: ${persona.boundaries}` : ""}
${persona.brand_identity ? `Brand Identity: ${persona.brand_identity}` : ""}
${persona.communication_rules ? `Communication Rules: ${JSON.stringify(persona.communication_rules)}` : ""}
Follow these persona settings strictly. They override any conflicting defaults above.`;
          }
        }

        // Analyze fan's emoji usage across conversation context to decide mirroring
        const fanMessages = (conversation_context || []).filter((m: any) => m.role === "fan").map((m: any) => m.text).join(" ");
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;
        const fanEmojiCount = (fanMessages.match(emojiRegex) || []).length;
        const fanMsgCount = (conversation_context || []).filter((m: any) => m.role === "fan").length || 1;
        const emojiPerMsg = fanEmojiCount / fanMsgCount;
        
        let emojiDirective = "\n\nEMOJI DIRECTIVE FOR THIS REPLY: The fan has NOT been using emojis much. DO NOT use any emojis in your reply. Keep it raw text only.";
        if (emojiPerMsg >= 2) {
          emojiDirective = "\n\nEMOJI DIRECTIVE FOR THIS REPLY: The fan uses emojis frequently. You MAY use 1-2 emojis max in this reply to mirror their energy naturally. But keep it subtle.";
        } else if (emojiPerMsg >= 0.5) {
          emojiDirective = "\n\nEMOJI DIRECTIVE FOR THIS REPLY: The fan occasionally uses emojis. You MAY use 1 emoji max if it feels natural. Otherwise keep it text only.";
        }

        const systemPrompt = `${personaInfo}${emojiDirective}
${auto_redirect_url ? `\nIMPORTANT: when it makes sense, naturally guide toward this link: ${auto_redirect_url}. dont force it, weave it in casually like "check my bio" or "i just posted smth"` : ""}
${keywords_trigger ? `if they mention any of these: ${keywords_trigger}, redirect them to the link` : ""}`;

        const messages: any[] = [{ role: "system", content: systemPrompt }];

        if (conversation_context && Array.isArray(conversation_context)) {
          for (const msg of conversation_context) {
            messages.push({ role: msg.role === "creator" ? "assistant" : "user", content: msg.text });
          }
        }

        messages.push({ role: "user", content: `${sender_name ? `[From: ${sender_name}] ` : ""}${message_text}` });

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            max_tokens: 200,
            temperature: 0.85,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) throw new Error("Rate limited - try again in a moment");
          if (response.status === 402) throw new Error("AI credits exhausted - add funds");
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        let reply = (aiResult.choices?.[0]?.message?.content || "").replace(/\[.*?\]/g, "").trim();

        // Calculate natural typing delay based on reply length
        const wordCount = reply.split(/\s+/).length;
        const charCount = reply.length;
        
        // Base typing speed: ~40-70ms per character (simulates real typing)
        const baseTypingMs = charCount * (40 + Math.random() * 30);
        // Clamp between 1.5s min and 6s max for typing simulation
        const typingDelay = Math.min(Math.max(baseTypingMs, 1500), 6000);
        
        // Determine message position from conversation context length
        const msgCount = (conversation_context?.length || 0) + 1;
        
        // Occasionally add a "life pause" (as if she got distracted) - more likely as convo progresses
        // ~15% chance after message 4, simulates 30-90 second gaps
        const shouldPause = msgCount > 4 && Math.random() < 0.15;
        const lifePauseMs = shouldPause ? (30000 + Math.random() * 60000) : 0;
        
        // Total delay before reply should appear
        const totalDelayMs = Math.round(typingDelay + lifePauseMs);

        result = {
          reply,
          typing_delay_ms: Math.round(typingDelay),
          life_pause_ms: Math.round(lifePauseMs),
          total_delay_ms: totalDelayMs,
          model: aiResult.model,
          usage: aiResult.usage,
        };
        break;
      }

      case "generate_comment_reply": {
        const { comment_text, comment_author, post_caption, reply_style, redirect_url } = params;

        const systemPrompt = `You are a young woman replying to comments on social media. No emojis. Use casual texting style (u, ur, lol, tbh).
${reply_style ? `Style: ${reply_style}` : "Be warm and casual like texting a friend"}
${redirect_url ? `When relevant, casually mention checking bio/link` : ""}
Rules:
- 1 sentence max
- No emojis ever
- Sound real, not like a brand
- If compliment, be sweet but brief
- If question, answer casually and redirect to bio if relevant`;

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
              { role: "user", content: `Post: "${post_caption || "N/A"}"\nComment by @${comment_author || "user"}: "${comment_text}"\n\nReply:` },
            ],
            max_tokens: 80,
            temperature: 0.75,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) throw new Error("Rate limited - try again");
          if (response.status === 402) throw new Error("AI credits exhausted");
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        result = { reply: aiResult.choices?.[0]?.message?.content || "" };
        break;
      }

      case "bulk_generate_replies": {
        const { comments, reply_style, redirect_url } = params;
        const replies: any[] = [];

        for (const comment of (comments || []).slice(0, 20)) {
          try {
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: `Reply to this comment as a young woman. No emojis. Use casual texting (u, ur, lol, tbh). 1 sentence max. Sound real. ${redirect_url ? "Sometimes mention checking bio." : ""} Reply ONLY with the text.` },
                  { role: "user", content: `@${comment.username}: "${comment.text}"` },
                ],
                max_tokens: 60,
                temperature: 0.75,
              }),
            });

            if (response.ok) {
              const aiResult = await response.json();
              replies.push({
                comment_id: comment.id,
                comment_text: comment.text,
                username: comment.username,
                generated_reply: aiResult.choices?.[0]?.message?.content || "",
              });
            }
          } catch (e) {
            replies.push({ comment_id: comment.id, error: String(e) });
          }
          await new Promise(r => setTimeout(r, 500));
        }

        result = { replies, total: replies.length };
        break;
      }

      case "analyze_content": {
        const { caption, platform, content_type } = params;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a social media optimization expert for adult content creators." },
              { role: "user", content: `Platform: ${platform}\nType: ${content_type}\nCaption: "${caption}"\n\nProvide:\n1. Optimized caption\n2. Best hashtags (10-15)\n3. Best posting time\n4. Engagement prediction (1-10)\n5. Improvements` },
            ],
            max_tokens: 500,
            temperature: 0.6,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        result = { analysis: aiResult.choices?.[0]?.message?.content || "" };
        break;
      }

      case "generate_caption": {
        const { topic, platform, style, include_cta } = params;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: `Generate a ${platform} caption. Style: ${style || "casual, young woman vibes"}. No emojis. Use casual texting style. ${include_cta ? "Include a call-to-action directing to bio/link casually." : ""} Include relevant hashtags. Reply ONLY with the caption.` },
              { role: "user", content: topic },
            ],
            max_tokens: 300,
            temperature: 0.8,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        result = { caption: aiResult.choices?.[0]?.message?.content || "" };
        break;
      }

      case "generate_hashtags": {
        const { topic, platform, niche } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a social media hashtag expert for adult content creators. Return ONLY a JSON object with these keys: primary (array of 5 high-volume hashtags), secondary (array of 10 medium hashtags), niche (array of 5 low-competition niche hashtags), banned (array of hashtags to avoid). No markdown, no explanation." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nNiche: ${niche || "adult content creator"}\nTopic: ${topic}\n\nGenerate optimized hashtag sets.` },
            ],
            max_tokens: 500, temperature: 0.6,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { hashtags: parsed };
        break;
      }

      case "best_posting_time": {
        const { platform, timezone, content_type, audience_location } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a social media timing analyst. Return ONLY a JSON object with: best_times (array of {day, time, reason}), worst_times (array of {day, time, reason}), weekly_schedule (object with days as keys and best posting times as values), tips (array of 3 strategic tips). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nTimezone: ${timezone || "EST"}\nContent type: ${content_type || "photos/reels"}\nAudience: ${audience_location || "US/EU"}\n\nAnalyze best posting times.` },
            ],
            max_tokens: 600, temperature: 0.5,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { schedule: parsed };
        break;
      }

      case "repurpose_content": {
        const { original_caption, source_platform, target_platforms } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a content repurposing expert for adult creators. Take a caption from one platform and adapt it for others. Return ONLY a JSON object where each key is a platform name and value is an object with: caption (adapted text), hashtags (array), tips (string). No markdown." },
              { role: "user", content: `Original platform: ${source_platform || "instagram"}\nTarget platforms: ${(target_platforms || ["instagram", "tiktok", "twitter"]).join(", ")}\n\nOriginal caption:\n"${original_caption}"\n\nRepurpose this for each target platform.` },
            ],
            max_tokens: 800, temperature: 0.7,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { repurposed: parsed };
        break;
      }

      case "analyze_competitor": {
        const { competitor_username, platform, their_bio, their_content_style } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a competitive intelligence analyst for adult content creators. Return ONLY a JSON object with: strengths (array), weaknesses (array), content_strategy (string), posting_pattern (string), monetization_tactics (array), opportunities (array), threat_level (low/medium/high), recommended_actions (array of 5 actions). No markdown." },
              { role: "user", content: `Competitor: @${competitor_username}\nPlatform: ${platform || "instagram"}\nBio: ${their_bio || "not provided"}\nContent style: ${their_content_style || "not provided"}\n\nAnalyze this competitor.` },
            ],
            max_tokens: 800, temperature: 0.6,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { analysis: parsed };
        break;
      }

      case "optimize_bio": {
        const { current_bio, platform, goals } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a bio optimization expert for adult content creators. Return ONLY a JSON object with: optimized_bio (string max 150 chars), variations (array of 3 alternative bios), cta_suggestions (array of 3 call-to-action lines), keywords (array of SEO keywords), score_before (number 1-10), score_after (number 1-10), improvements (array). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nCurrent bio: "${current_bio || "none"}"\nGoals: ${goals || "drive traffic to OF link"}\n\nOptimize this bio.` },
            ],
            max_tokens: 500, temperature: 0.7,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { bio: parsed };
        break;
      }

      case "generate_hooks": {
        const { content_type, topic, platform, count } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a viral hook writer for adult content creators. Return ONLY a JSON object with: hooks (array of objects with {hook, style, predicted_engagement} where style is one of: curiosity, controversial, relatable, shocking, question, story). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nContent type: ${content_type || "reel"}\nTopic: ${topic}\nGenerate ${count || 8} viral hooks.` },
            ],
            max_tokens: 600, temperature: 0.85,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { hooks: parsed };
        break;
      }

      case "detect_trends": {
        const { platform, niche } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a social media trend analyst. Return ONLY a JSON object with: trending_now (array of {trend, description, relevance_score, how_to_use}), emerging (array of {trend, description, time_to_peak}), dying (array of {trend, reason}), content_ideas (array of 5 trend-based content ideas), audio_trends (array of 3 trending sounds to use). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram,tiktok"}\nNiche: ${niche || "adult content creator"}\n\nAnalyze current trends.` },
            ],
            max_tokens: 800, temperature: 0.7,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { trends: parsed };
        break;
      }

      case "engagement_strategy": {
        const { current_engagement_rate, follower_count, platform, content_types_used } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are an engagement growth strategist for adult content creators. Return ONLY a JSON object with: immediate_actions (array of 5 things to do today), weekly_plan (object with days as keys), growth_hacks (array of 5 unconventional tactics), engagement_triggers (array of psychological triggers), reply_templates (array of 5 comment reply templates that drive DMs), story_ideas (array of 5 interactive story ideas), predicted_growth (string estimate). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nFollowers: ${follower_count || "unknown"}\nEngagement rate: ${current_engagement_rate || "unknown"}\nContent types: ${content_types_used || "photos, reels"}\n\nCreate engagement strategy.` },
            ],
            max_tokens: 900, temperature: 0.7,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { strategy: parsed };
        break;
      }

      case "generate_content_plan": {
        const { days, platform, niche, goals } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a content planning expert for adult creators. Return ONLY a JSON object with: plan (array of objects with {day, post_type, topic, caption, hashtags, best_time, goal}), themes (array of weekly content themes), content_pillars (array of 4 recurring content categories). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nDays: ${days || 7}\nNiche: ${niche || "adult content"}\nGoals: ${goals || "grow followers and drive OF traffic"}\n\nCreate a ${days || 7}-day content plan.` },
            ],
            max_tokens: 1200, temperature: 0.7,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { content_plan: parsed };
        break;
      }

      case "viral_score": {
        const { caption, platform, hashtags, content_type } = params;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a viral content predictor. Return ONLY a JSON object with: viral_score (number 1-100), breakdown (object with hook_strength, emotional_trigger, shareability, controversy_level, trend_alignment each as number 1-10), improvements (array of specific changes), optimized_caption (rewritten for max virality), predicted_reach (string estimate like '5K-15K'). No markdown." },
              { role: "user", content: `Platform: ${platform || "instagram"}\nContent type: ${content_type || "post"}\nHashtags: ${hashtags || "none"}\nCaption: "${caption}"\n\nPredict viral potential.` },
            ],
            max_tokens: 600, temperature: 0.6,
          }),
        });
        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiResult = await response.json();
        const raw = aiResult.choices?.[0]?.message?.content || "{}";
        let parsed; try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { parsed = { raw }; }
        result = { viral: parsed };
        break;
      }

      case "scan_all_conversations": {
        // Import ALL conversations from IG into DB - works regardless of auto-respond state
        const igFuncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/instagram-api`;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        const callIG = async (igAction: string, igParams: any = {}) => {
          const resp = await fetch(igFuncUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: igAction, account_id, params: igParams }),
          });
          const d = await resp.json();
          if (!d.success) throw new Error(d.error || `IG API ${igAction} failed`);
          return d.data;
        };

        // Get our IG user ID
        const { data: igConnScan } = await supabase
          .from("social_connections")
          .select("platform_user_id, platform_username")
          .eq("account_id", account_id)
          .eq("platform", "instagram")
          .single();
        
        if (!igConnScan?.platform_user_id) {
          result = { error: "Instagram not connected", imported: 0 };
          break;
        }

        const ourIdScan = igConnScan.platform_user_id;
        const ourUsernameScan = igConnScan.platform_username?.toLowerCase() || "";
        
        // Helper: find the fan (non-owner) participant using name + message-based detection
        // Also enriches fan object with username/name from messages if missing
        const findFanParticipant = (participants: any[], msgs?: any[]) => {
          if (!participants || participants.length === 0) return null;
          if (participants.length === 1) return participants[0];
          
          // Method 1: Match by name/username (most reliable for IG)
          let fan: any = null;
          if (ourUsernameScan) {
            fan = participants.find((p: any) => {
              const pName = (p.name || p.username || "").toLowerCase();
              return pName !== ourUsernameScan && pName !== "";
            });
          }
          
          // Method 2: Match by stored ID
          if (!fan) {
            fan = participants.find((p: any) => p.id !== ourIdScan);
          }
          
          // Method 3: Use message from.name to determine our IGSU ID
          if (!fan && msgs && msgs.length > 0) {
            for (const msg of msgs) {
              const fromName = (msg.from?.name || msg.from?.username || "").toLowerCase();
              if (fromName === ourUsernameScan && msg.from?.id) {
                const ourIgsuId = msg.from.id;
                fan = participants.find((p: any) => p.id !== ourIgsuId);
                if (fan) break;
              }
            }
          }
          
          // Fallback: return second participant (first is typically the page/business)
          if (!fan) fan = participants[1] || participants[0];
          
          // ENRICH: If fan has no username/name, try to extract from messages
          if (fan && (!fan.username || fan.username === fan.id) && (!fan.name || fan.name === fan.id)) {
            if (msgs && msgs.length > 0) {
              for (const msg of msgs) {
                const fromId = msg.from?.id;
                const fromName = msg.from?.name || msg.from?.username || "";
                // If message is FROM the fan (not from us), use their name
                if (fromId === fan.id && fromName && fromName !== fan.id) {
                  fan.name = fromName;
                  if (msg.from?.username) fan.username = msg.from.username;
                  break;
                }
                // If message is NOT from us and not from our known ID, it's likely the fan
                if (fromId && fromId !== ourIdScan && fromName && fromName !== ourUsernameScan) {
                  fan.name = fromName;
                  if (msg.from?.username) fan.username = msg.from.username;
                  break;
                }
              }
            }
          }
          
          return fan;
        };
        let imported = 0;
        let totalFound = 0;

        // Fetch all folders at once
        let allFolderData: { folder: string; conversations: any[] }[] = [];
        try {
          const allData = await callIG("get_all_conversations", { limit: 50, messages_limit: 10 });
          allFolderData = [
            { folder: "primary", conversations: allData?.primary || [] },
            { folder: "general", conversations: allData?.general || [] },
            { folder: "requests", conversations: allData?.requests || [] },
          ];
          totalFound = allFolderData.reduce((sum, f) => sum + f.conversations.length, 0);
          console.log(`Found conversations: primary=${allData?.primary?.length || 0}, general=${allData?.general?.length || 0}, requests=${allData?.requests?.length || 0}`);
        } catch (allErr: any) {
          console.log("get_all_conversations failed:", allErr.message, "- falling back to single fetch");
          try {
            const singleData = await callIG("get_conversations", { limit: 50, messages_limit: 10 });
            allFolderData = [{ folder: "primary", conversations: singleData?.data || [] }];
            totalFound = allFolderData[0].conversations.length;
          } catch (singleErr: any) {
            console.error("All conversation fetch methods failed:", singleErr.message);
            result = { error: singleErr.message, imported: 0, total_found: 0 };
            break;
          }
        }

        // Deduplicate conversations across folders (same convo ID shouldn't appear twice)
        const seenConvoIds = new Set<string>();

        // Process each folder
        for (const { folder, conversations: folderConvos } of allFolderData) {
          for (const convo of folderConvos) {
            try {
              if (seenConvoIds.has(convo.id)) continue;
              seenConvoIds.add(convo.id);
              
              const messages = convo.messages?.data || [];
              const participants = convo.participants?.data || [];
              const fan = findFanParticipant(participants, messages);
              if (!fan) continue;

              // Determine if last message is from fan — account for Page-sent messages
              const lastMsg = messages[0];
              const lastPreview = (lastMsg?.message || lastMsg?.text)?.substring(0, 100) || null;
              const lastMsgFromId = lastMsg?.from?.id;
              const lastMsgFromName = (lastMsg?.from?.username || lastMsg?.from?.name || "").toLowerCase();
              // Message is from us if: matches our IG ID, our username, OR is not the fan ID (Page-sent)
              const isLastFromUs = lastMsgFromId ? 
                (lastMsgFromId === ourIdScan || lastMsgFromName === ourUsernameScan || lastMsgFromId !== fan.id) : 
                false;
              const isFromFanLast = !isLastFromUs;

              // Check if conversation already exists — preserve ai_enabled setting
              const { data: existingConvo } = await supabase
                .from("ai_dm_conversations")
                .select("id, ai_enabled")
                .eq("account_id", account_id)
                .eq("platform_conversation_id", convo.id)
                .single();

              // Try to fetch participant avatar via business_discovery
              let participantAvatar: string | null = null;
              const fanUsername = fan.username || fan.name;
              if (fanUsername && !existingConvo) {
                try {
                  const discoveryData = await callIG("discover_user", { username: fanUsername, media_limit: 0 });
                  participantAvatar = discoveryData?.business_discovery?.profile_picture_url || null;
                } catch { /* Not all users are discoverable */ }
              }

              const upsertData: any = {
                account_id,
                platform: "instagram",
                platform_conversation_id: convo.id,
                participant_id: fan.id,
                participant_username: fan.username || fan.name || fan.id,
                participant_name: fan.name || fan.username || "Unknown",
                participant_avatar_url: participantAvatar || (existingConvo ? undefined : null),
                status: "active",
                folder,
                is_read: !isFromFanLast,
                last_message_preview: lastPreview ? (isFromFanLast ? lastPreview : `You: ${lastPreview}`) : null,
                last_message_at: convo.updated_time ? new Date(convo.updated_time).toISOString() : new Date().toISOString(),
                message_count: messages.length,
              };
              // Only set ai_enabled on NEW conversations
              if (!existingConvo) {
                upsertData.ai_enabled = true;
              }

              const { data: dbConvo } = await supabase
                .from("ai_dm_conversations")
                .upsert(upsertData, { onConflict: "account_id,platform_conversation_id" })
                .select("id")
                .single();
              
              if (!dbConvo) continue;

              // Helper: detect if message is from us (creator/page)
              const isMessageFromUs = (msg: any): boolean => {
                const fromId = msg?.from?.id;
                const fromName = (msg?.from?.username || msg?.from?.name || "").toLowerCase();
                if (fromId && fromId === ourIdScan) return true;
                if (fromName && fromName === ourUsernameScan) return true;
                if (fromId && fromId === fan.id) return false;
                // Unknown ID that's not the fan → likely Page ID → it's us
                if (fromId && fromId !== fan.id) return true;
                return false;
              };

              // Import messages
              const sortedMsgs = [...messages].reverse();
              for (const msg of sortedMsgs) {
                const msgText = msg.message || msg.text || "";
                if (!msgText && !msg.id && !msg.attachments) continue;
                const { data: existing } = await supabase
                  .from("ai_dm_messages")
                  .select("id")
                  .eq("platform_message_id", msg.id)
                  .limit(1);
                if (existing && existing.length > 0) continue;

                const isFromUs = isMessageFromUs(msg);
                const msgTimestamp = msg.created_time || msg.timestamp;
                const rawAttachments = msg.attachments?.data || msg.attachments;
                const hasAttachments = rawAttachments && (Array.isArray(rawAttachments) ? rawAttachments.length > 0 : true);
                const attachmentData = hasAttachments 
                  ? { attachments: Array.isArray(rawAttachments) ? rawAttachments : [rawAttachments], sticker: msg.sticker || null, shares: msg.shares || null } 
                  : (msg.sticker ? { sticker: msg.sticker } : (msg.shares ? { shares: msg.shares } : null));
                
                let contentText = msgText;
                if (!contentText && hasAttachments) {
                  const attArr = Array.isArray(rawAttachments) ? rawAttachments : [rawAttachments];
                  const attType = attArr[0]?.mime_type || attArr[0]?.type || "";
                  if (attType.includes("video")) contentText = "[video]";
                  else if (attType.includes("image") || attType.includes("photo")) contentText = "[photo]";
                  else if (attType.includes("audio")) contentText = "[audio]";
                  else if (msg.sticker) contentText = "[sticker]";
                  else if (msg.shares) contentText = "[shared post]";
                  else contentText = "[attachment]";
                } else if (!contentText) {
                  if (msg.sticker) contentText = "[sticker]";
                  else if (msg.shares) contentText = "[shared post]";
                  else contentText = "";
                }
                
                await supabase.from("ai_dm_messages").insert({
                  conversation_id: dbConvo.id,
                  account_id,
                  platform_message_id: msg.id,
                  sender_type: isFromUs ? "ai" : "fan",
                  sender_name: isFromUs ? (igConnScan.platform_username || "creator") : (fan.username || fan.name || "fan"),
                  content: contentText || "",
                  status: "sent",
                  created_at: msgTimestamp ? new Date(msgTimestamp).toISOString() : new Date().toISOString(),
                  metadata: attachmentData,
                });
              }
              imported++;
            } catch (e) {
              console.error("Error importing conversation:", e);
            }
          }
        }

        result = { imported, total_found: totalFound };
        break;
      }

      case "process_live_dm": {
        // Lightweight pipeline: skip heavy IG re-scan, just check DB for unanswered fan messages and reply
        const igFuncUrl2 = `${Deno.env.get("SUPABASE_URL")}/functions/v1/instagram-api`;
        const serviceKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        const callIG2 = async (igAction: string, igParams: any = {}) => {
          const resp = await fetch(igFuncUrl2, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey2}` },
            body: JSON.stringify({ action: igAction, account_id, params: igParams }),
          });
          const d = await resp.json();
          if (!d.success) throw new Error(d.error || `IG API ${igAction} failed`);
          return d.data;
        };

        // Quick IG check: only fetch latest messages for conversations we already have in DB
        // This is MUCH faster than scanning all 50 conversations
        try {
          const { data: igConnQuick } = await supabase
            .from("social_connections")
            .select("platform_user_id, platform_username")
            .eq("account_id", account_id)
            .eq("platform", "instagram")
            .single();
          
          if (igConnQuick?.platform_user_id) {
            const ourIdQuick = igConnQuick.platform_user_id;
            const ourUsernameQuick = igConnQuick.platform_username?.toLowerCase() || "";
            
            // Scan all folders for new messages (not just inbox)
            const allQuickConvos: any[] = [];
            for (const folder of ["inbox", "general", "other"]) {
              try {
                const quickScan = await callIG2("get_conversations", { limit: 20, messages_limit: 3, folder });
                const folderConvos = quickScan?.data || [];
                for (const c of folderConvos) {
                  (c as any)._folder = folder === "inbox" ? "primary" : folder === "other" ? "requests" : folder;
                }
                allQuickConvos.push(...folderConvos);
              } catch { /* folder might not exist */ }
            }
            const quickConvoList = allQuickConvos;
            
            for (const sc of quickConvoList) {
              const scMsgs = sc.messages?.data || [];
              if (scMsgs.length === 0) continue;
              
              // Check if we already have the latest message
              const latestMsgId = scMsgs[0]?.id;
              if (!latestMsgId) continue;
              
              const { data: existingMsg } = await supabase
                .from("ai_dm_messages")
                .select("id")
                .eq("platform_message_id", latestMsgId)
                .limit(1);
              
              // If we already have the latest message, skip this conversation
              if (existingMsg && existingMsg.length > 0) continue;
              
              // New message found — import it
              const participants = sc.participants?.data || [];
              const fan = (() => {
                if (!participants || participants.length === 0) return null;
                let found: any = null;
                if (ourUsernameQuick) {
                  found = participants.find((p: any) => (p.username || p.name || "").toLowerCase() !== ourUsernameQuick);
                }
                if (!found) {
                  found = participants.find((p: any) => p.id !== ourIdQuick);
                }
                if (!found) found = participants.length === 2 ? participants[1] : participants[0];
                
                // Enrich fan name from messages if missing
                if (found && (!found.username || found.username === found.id) && (!found.name || found.name === found.id)) {
                  for (const msg of scMsgs) {
                    const fromId = msg.from?.id;
                    const fromName = msg.from?.name || msg.from?.username || "";
                    if (fromId === found.id && fromName && fromName !== found.id) {
                      found.name = fromName;
                      if (msg.from?.username) found.username = msg.from.username;
                      break;
                    }
                    if (fromId && fromId !== ourIdQuick && fromName && fromName !== ourUsernameQuick) {
                      found.name = fromName;
                      if (msg.from?.username) found.username = msg.from.username;
                      break;
                    }
                  }
                }
                
                return found;
              })();
              if (!fan) continue;
              
              // Upsert conversation (preserve ai_enabled)
              const { data: existingConvo } = await supabase
                .from("ai_dm_conversations")
                .select("id, ai_enabled")
                .eq("account_id", account_id)
                .eq("platform_conversation_id", sc.id)
                .single();
              
              // Fetch avatar for new conversations
              let quickAvatar: string | null = null;
              const fanUn = fan.username || fan.name;
              if (!existingConvo && fanUn) {
                try {
                  const disc = await callIG2("discover_user", { username: fanUn, media_limit: 0 });
                  quickAvatar = disc?.business_discovery?.profile_picture_url || null;
                } catch {}
              }

              const scFolder = (sc as any)._folder || "primary";
              
              // Determine latest message preview
              const latestScMsg = scMsgs[0]; // Messages come newest first from IG
              const latestFromId = latestScMsg?.from?.id;
              const isLatestFromUs = latestFromId === igConnQuick.platform_user_id;
              const latestPreviewText = latestScMsg?.message || latestScMsg?.text || "[media]";
              const latestPreview = isLatestFromUs
                ? `You: ${latestPreviewText.substring(0, 80)}`
                : latestPreviewText.substring(0, 80);
              
              const upsertData: any = {
                account_id,
                platform: "instagram",
                platform_conversation_id: sc.id,
                participant_id: fan.id,
                participant_username: fan.username || fan.name || fan.id,
                participant_name: fan.name || fan.username || "Unknown",
                participant_avatar_url: quickAvatar || undefined,
                status: "active",
                folder: scFolder,
                last_message_at: sc.updated_time ? new Date(sc.updated_time).toISOString() : new Date().toISOString(),
                last_message_preview: latestPreview,
                message_count: scMsgs.length,
                is_read: isLatestFromUs,
              };
              if (!existingConvo) upsertData.ai_enabled = true;
              
              const { data: scDbConvo } = await supabase
                .from("ai_dm_conversations")
                .upsert(upsertData, { onConflict: "account_id,platform_conversation_id" })
                .select("id")
                .single();
              if (!scDbConvo) continue;
              
              // Import only NEW messages
              for (const scMsg of [...scMsgs].reverse()) {
                const scMsgText = scMsg.message || scMsg.text || "";
                if (!scMsgText && !scMsg.id && !scMsg.attachments) continue;
                const { data: scEx } = await supabase.from("ai_dm_messages").select("id").eq("platform_message_id", scMsg.id).limit(1);
                if (scEx && scEx.length > 0) continue;
                
                const fromId = scMsg?.from?.id;
                const fromName = (scMsg?.from?.username || scMsg?.from?.name || "").toLowerCase();
                const scIsFromUs = (fromId === ourIdQuick) || (fromName === ourUsernameQuick) || (fromId && fromId !== fan.id && fromId !== ourIdQuick);
                
                const scMsgTimestamp = scMsg.created_time || scMsg.timestamp;
                const scRawAtt = scMsg.attachments?.data || scMsg.attachments;
                const scHasAtt = scRawAtt && (Array.isArray(scRawAtt) ? scRawAtt.length > 0 : true);
                const scAttData = scHasAtt 
                  ? { attachments: Array.isArray(scRawAtt) ? scRawAtt : [scRawAtt], sticker: scMsg.sticker || null, shares: scMsg.shares || null } 
                  : (scMsg.sticker ? { sticker: scMsg.sticker } : (scMsg.shares ? { shares: scMsg.shares } : null));
                let scContent = scMsgText;
                if (!scContent && scHasAtt) {
                  const scAttArr = Array.isArray(scRawAtt) ? scRawAtt : [scRawAtt];
                  const scAttType = scAttArr[0]?.mime_type || scAttArr[0]?.type || "";
                  if (scAttType.includes("video")) scContent = "[video]";
                  else if (scAttType.includes("image") || scAttType.includes("photo")) scContent = "[photo]";
                  else if (scAttType.includes("audio")) scContent = "[audio]";
                  else if (scMsg.sticker) scContent = "[sticker]";
                  else if (scMsg.shares) scContent = "[shared post]";
                  else scContent = "[attachment]";
                } else if (!scContent) {
                  if (scMsg.sticker) scContent = "[sticker]";
                  else if (scMsg.shares) scContent = "[shared post]";
                  else scContent = "";
                }
                await supabase.from("ai_dm_messages").insert({
                  conversation_id: scDbConvo.id,
                  account_id,
                  platform_message_id: scMsg.id,
                  sender_type: scIsFromUs ? "ai" : "fan",
                  sender_name: scIsFromUs ? (igConnQuick.platform_username || "creator") : (fan.username || fan.name || "fan"),
                  content: scContent || "",
                  status: "sent",
                  created_at: scMsgTimestamp ? new Date(scMsgTimestamp).toISOString() : new Date().toISOString(),
                  metadata: scAttData,
                });
              }
            }
            console.log(`Quick scan: checked ${quickConvoList.length} convos for new messages`);
          }
        } catch (scanErr) {
          console.error("Quick scan failed:", scanErr);
        }

        // Check auto-respond state
        const { data: autoConfig } = await supabase
          .from("auto_respond_state")
          .select("*")
          .eq("account_id", account_id)
          .single();
        
        if (!autoConfig?.is_active) {
          result = { processed: 0, total_checked: 0, message: "Auto-respond is not active" };
          break;
        }

        // Get persona
        let personaInfo2 = DEFAULT_PERSONA;
        const { data: persona2 } = await supabase
          .from("persona_profiles")
          .select("*")
          .eq("account_id", account_id)
          .single();
        if (persona2) {
          personaInfo2 += `\n\n--- ACTIVE PERSONA OVERRIDE ---
Tone: ${persona2.tone}
Vocabulary Style: ${persona2.vocabulary_style}
Emotional Range: ${persona2.emotional_range || "default"}
${persona2.boundaries ? `Hard Boundaries: ${persona2.boundaries}` : ""}
${persona2.brand_identity ? `Brand Identity: ${persona2.brand_identity}` : ""}
${persona2.communication_rules ? `Communication Rules: ${JSON.stringify(persona2.communication_rules)}` : ""}
Follow these persona settings strictly. They override any conflicting defaults above.`;
        }

        // Get connection info
        const { data: igConn2 } = await supabase
          .from("social_connections")
          .select("platform_user_id, platform_username")
          .eq("account_id", account_id)
          .eq("platform", "instagram")
          .single();
        
        if (!igConn2?.platform_user_id) {
          result = { processed: 0, error: "Instagram not connected" };
          break;
        }

        // 2. Find conversations with unanswered fan messages
        // Get all active conversations from DB
        const { data: activeConvos } = await supabase
          .from("ai_dm_conversations")
          .select("*")
          .eq("account_id", account_id)
          .eq("ai_enabled", true)
          .eq("status", "active");

        let processed = 0;
        const processedConvos: any[] = [];

        for (const dbConvo of (activeConvos || [])) {
          try {
            // Get the latest message in this conversation
            const { data: latestMsgs } = await supabase
              .from("ai_dm_messages")
              .select("*")
              .eq("conversation_id", dbConvo.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const latestMsg = latestMsgs?.[0];
            // Only process if last message is from a fan (needs a reply)
            if (!latestMsg || latestMsg.sender_type !== "fan") continue;

            // CRITICAL: Check if we already handled this message (e.g. user deleted our reply)
            // If last_ai_reply_at is AFTER the fan's message, we already replied — skip
            if (dbConvo.last_ai_reply_at && latestMsg.created_at) {
              const aiReplyTime = new Date(dbConvo.last_ai_reply_at).getTime();
              const fanMsgTime = new Date(latestMsg.created_at).getTime();
              if (aiReplyTime >= fanMsgTime) continue;
            }

            // Build conversation context from DB
            const { data: dbMessages } = await supabase
              .from("ai_dm_messages")
              .select("sender_type, content, created_at")
              .eq("conversation_id", dbConvo.id)
              .order("created_at", { ascending: true })
              .limit(20);

            const conversationContext = (dbMessages || []).map(m => ({
              role: m.sender_type === "fan" ? "fan" : "creator",
              text: m.content,
            }));

            // Insert a "typing" placeholder for real-time UI
            const { data: typingMsg } = await supabase
              .from("ai_dm_messages")
              .insert({
                conversation_id: dbConvo.id,
                account_id,
                sender_type: "ai",
                sender_name: igConn2.platform_username || "creator",
                content: "...",
                status: "typing",
              })
              .select("id")
              .single();

            // Analyze fan emoji usage for this conversation
            const fanMsgsText = conversationContext.filter(m => m.role === "fan").map(m => m.text).join(" ");
            const emojiRx = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;
            const fanEmojiCt = (fanMsgsText.match(emojiRx) || []).length;
            const fanMsgCt = conversationContext.filter(m => m.role === "fan").length || 1;
            const emojiRate = fanEmojiCt / fanMsgCt;
            
            let emojiDir = "\n\nEMOJI DIRECTIVE: The fan has NOT been using emojis. DO NOT use any emojis. Raw text only.";
            if (emojiRate >= 2) {
              emojiDir = "\n\nEMOJI DIRECTIVE: Fan uses emojis frequently. You MAY use 1-2 emojis max to mirror naturally.";
            } else if (emojiRate >= 0.5) {
              emojiDir = "\n\nEMOJI DIRECTIVE: Fan occasionally uses emojis. You MAY use 1 emoji max if natural. Otherwise text only.";
            }

            // Generate AI reply
            const systemPrompt = `${personaInfo2}${emojiDir}
${autoConfig.redirect_url ? `\nIMPORTANT: when it makes sense, naturally guide toward this link: ${autoConfig.redirect_url}` : ""}
${autoConfig.trigger_keywords ? `if they mention any of these: ${autoConfig.trigger_keywords}, redirect them to the link` : ""}`;

            const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
            for (const ctx of conversationContext) {
              aiMessages.push({ role: ctx.role === "creator" ? "assistant" : "user", content: ctx.text });
            }

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: aiMessages,
                max_tokens: 200,
                temperature: 0.85,
              }),
            });

            if (!aiResponse.ok) {
              if (typingMsg) {
                await supabase.from("ai_dm_messages").update({ status: "failed", content: "AI generation failed" }).eq("id", typingMsg.id);
              }
              continue;
            }

            const aiResult = await aiResponse.json();
            let reply = (aiResult.choices?.[0]?.message?.content || "").replace(/\[.*?\]/g, "").trim();

            if (!reply) {
              if (typingMsg) {
                await supabase.from("ai_dm_messages").update({ status: "failed", content: "Empty AI response" }).eq("id", typingMsg.id);
              }
              continue;
            }

            // Calculate typing delay
            const charCount = reply.length;
            const typingDelay = Math.min(Math.max(charCount * (40 + Math.random() * 30), 1500), 6000);

            // Send the reply via IG API
            try {
              const sendResult = await callIG2("send_message", {
                recipient_id: dbConvo.participant_id,
                message: reply,
              });

              await supabase.from("ai_dm_messages").update({
                content: reply,
                status: "sent",
                platform_message_id: sendResult?.message_id || null,
                ai_model: aiResult.model,
                typing_delay_ms: Math.round(typingDelay),
              }).eq("id", typingMsg?.id);

              await supabase.from("ai_dm_conversations").update({
                last_ai_reply_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
                last_message_preview: `You: ${reply.substring(0, 80)}`,
                message_count: (dbMessages?.length || 0) + 1,
                is_read: true,
              }).eq("id", dbConvo.id);

              processed++;
              processedConvos.push({
                conversation_id: dbConvo.id,
                fan: dbConvo.participant_username,
                fan_message: latestMsg.content,
                ai_reply: reply,
              });
            } catch (sendErr: any) {
              console.error("Failed to send DM:", sendErr);
              if (typingMsg) {
                await supabase.from("ai_dm_messages").update({ status: "failed", content: reply, metadata: { error: sendErr.message } }).eq("id", typingMsg.id);
              }
            }
          } catch (convoErr) {
            console.error("Error processing conversation:", convoErr);
          }
          await new Promise(r => setTimeout(r, 500));
        }

        result = { processed, conversations: processedConvos, total_checked: activeConvos?.length || 0 };
        break;
      }

      case "generate_opener": {
        // Generate a short, impactful conversation opener synced with active persona
        let personaPrompt = DEFAULT_PERSONA;
        if (account_id) {
          const { data: persona } = await supabase
            .from("persona_profiles")
            .select("*")
            .eq("account_id", account_id)
            .single();
          if (persona) {
            personaPrompt += `\n\n--- ACTIVE PERSONA OVERRIDE ---
Tone: ${persona.tone}
Vocabulary Style: ${persona.vocabulary_style}
Emotional Range: ${persona.emotional_range || "default"}
${persona.boundaries ? `Hard Boundaries: ${persona.boundaries}` : ""}
${persona.brand_identity ? `Brand Identity: ${persona.brand_identity}` : ""}
${persona.communication_rules ? `Communication Rules: ${JSON.stringify(persona.communication_rules)}` : ""}
Follow these persona settings strictly.`;
          }
        }

        const openerResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: personaPrompt + `\n\nYou are generating a FIRST DM opener to a new follower. Rules:
- MAXIMUM 1 sentence, ideally 3-8 words
- Must be intriguing enough they WANT to reply
- Casual, confident, slightly mysterious
- No generic "hey how are you" type messages
- Make them curious about you
- Stay in character with the persona above
- Output ONLY the message text, absolutely nothing else
- No quotes, no labels, no explanations` },
              { role: "user", content: "Generate one short DM opener." },
            ],
            temperature: 0.95,
            max_tokens: 60,
          }),
        });

        if (!openerResp.ok) {
          if (openerResp.status === 429) throw new Error("Rate limited - try again in a moment");
          if (openerResp.status === 402) throw new Error("AI credits exhausted");
          throw new Error(`AI gateway error: ${openerResp.status}`);
        }

        const openerData = await openerResp.json();
        let openerMsg = (openerData?.choices?.[0]?.message?.content || "").replace(/^["']|["']$/g, "").trim();
        if (!openerMsg) openerMsg = "u caught my attention ngl";
        result = { message: openerMsg };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Social AI Responder error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

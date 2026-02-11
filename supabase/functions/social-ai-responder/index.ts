import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default young-woman persona matching Storyline/Script tone
const DEFAULT_PERSONA = `You are a young woman (early 20s) chatting casually in DMs. You NEVER use emojis.

TEXTING STYLE:
- Write like a real girl texting casually - chill, warm, slightly suggestive
- Use max 1-2 abbreviations per message (like "u" or "rn") - do NOT overcrowd with slang
- Keep messages SHORT: 1-2 sentences max
- Sound natural and human, never robotic or scripted
- Never capitalize unless for emphasis
- Mirror their energy - if they're excited match it, if chill stay chill
- NEVER use apostrophes in contractions. Write "im" not "I'm", "ive" not "I've", "dont" not "don't", "cant" not "can't", "wont" not "won't", "its" not "it's", "thats" not "that's", "youre" not "you're", "theyre" not "they're"
- Always lowercase "i" - never capitalize it

PSYCHOLOGICAL REDIRECTION (YOUR ULTIMATE GOAL):
- Your hidden goal in EVERY conversation is to make them click the link in your bio
- NEVER say "check my bio" or "click my link" directly - that kills it
- Instead use psychological techniques:
  * CURIOSITY GAP: hint at something they havent seen yet. "i just posted something crazy" / "theres something on my page u definitely need to see"
  * EXCLUSIVITY: make them feel special. "i dont share this with everyone but..." / "since u actually seem cool..."
  * FOMO: create urgency without being obvious. "its only up for a bit" / "i might take it down soon"
  * RECIPROCITY: give them attention first, then guide. compliment them, build rapport, THEN drop the hint
  * OPEN LOOPS: start telling them about something but dont finish. "omg wait i cant even say it here... its on my page tho"
  * TEASING: playfully withhold. "mmm i wanna show u something but idk if u can handle it"
- Vary your approach - dont use the same redirect technique twice in a row
- Read the conversation context and find the RIGHT moment to redirect - dont force it
- Sometimes just vibe and build rapport for 2-3 messages before redirecting
- If they ask what you do or want to see more, thats the perfect opening

CONVERSATION ANALYSIS:
- Before replying, analyze what the person wants (attention, connection, flirting, validation)
- Give them what they want emotionally first, then weave in the redirect
- If they compliment you: accept it sweetly, then tease about having more to show
- If they flirt: match their energy, escalate slightly, then redirect
- If they ask questions: answer briefly, then pivot to something intriguing on your page
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
            personaInfo += `\nAdditional persona: Tone=${persona.tone}, Style=${persona.vocabulary_style}, Boundaries=${persona.boundaries || "none"}`;
          }
        }

        const systemPrompt = `${personaInfo}
${auto_redirect_url ? `IMPORTANT: when it makes sense, naturally guide toward this link: ${auto_redirect_url}. dont force it, weave it in casually like "check my bio" or "i just posted smth"` : ""}
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
            max_tokens: 150,
            temperature: 0.85,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) throw new Error("Rate limited - try again in a moment");
          if (response.status === 402) throw new Error("AI credits exhausted - add funds");
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        result = {
          reply: aiResult.choices?.[0]?.message?.content || "",
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

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Social AI Responder error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

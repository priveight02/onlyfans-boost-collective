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
- Use minimal punctuation - no commas, no periods at end of messages, no semicolons. Only use question marks when asking something
- Use "tho" instead of "though", "thru" instead of "through", "ur" instead of "your/you're", "w" instead of "with", "rly" instead of "really", "ngl" instead of "not gonna lie", "tbh" instead of "to be honest"

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

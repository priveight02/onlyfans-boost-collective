import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      // ===== GENERATE AI REPLY TO A DM =====
      case "generate_dm_reply": {
        const { message_text, sender_name, conversation_context, persona_tone, persona_style, auto_redirect_url, keywords_trigger } = params;

        // Get persona if exists
        let personaInfo = "";
        if (account_id) {
          const { data: persona } = await supabase
            .from("persona_profiles")
            .select("*")
            .eq("account_id", account_id)
            .single();
          if (persona) {
            personaInfo = `\nPersona: Tone=${persona.tone}, Style=${persona.vocabulary_style}, Emotional Range=${persona.emotional_range}, Boundaries=${persona.boundaries || "none"}`;
          }
        }

        const systemPrompt = `You are an AI assistant managing DMs for a content creator. You reply naturally, flirtatiously but professionally, staying in character.
${personaInfo}
${persona_tone ? `Override tone: ${persona_tone}` : ""}
${persona_style ? `Override style: ${persona_style}` : ""}
${auto_redirect_url ? `IMPORTANT: When appropriate, naturally guide the conversation toward this link: ${auto_redirect_url}. Don't force it, weave it in naturally.` : ""}
${keywords_trigger ? `If the user mentions any of these keywords: ${keywords_trigger}, redirect them to the link above.` : ""}

Rules:
- Keep replies short (1-3 sentences max)
- Be engaging, warm, and create connection
- Never break character
- Use emojis sparingly but effectively
- If someone asks for explicit content, redirect to the link
- Mirror the energy of the sender
- Create urgency/exclusivity when mentioning links`;

        const messages: any[] = [
          { role: "system", content: systemPrompt },
        ];

        // Add conversation context if provided
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
            temperature: 0.8,
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

      // ===== GENERATE AUTO-REPLY FOR COMMENTS =====
      case "generate_comment_reply": {
        const { comment_text, comment_author, post_caption, reply_style, redirect_url } = params;

        const systemPrompt = `You are managing social media comments for a content creator. Generate a natural, engaging reply.
${reply_style ? `Style: ${reply_style}` : "Style: friendly, warm, engaging"}
${redirect_url ? `When relevant, mention checking the bio/link: ${redirect_url}` : ""}

Rules:
- Keep it short (1-2 sentences)
- Use 1-2 emojis max
- Be authentic and personal
- If it's a compliment, be gracious
- If it's a question, answer helpfully and redirect to bio/link
- Never be defensive or rude
- Match the platform vibe`;

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
              { role: "user", content: `Post caption: "${post_caption || "N/A"}"\nComment by @${comment_author || "user"}: "${comment_text}"\n\nGenerate a reply:` },
            ],
            max_tokens: 100,
            temperature: 0.7,
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

      // ===== BULK GENERATE COMMENT REPLIES =====
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
                  { role: "system", content: `Generate a short, engaging reply to this social media comment. ${reply_style || "Be friendly and warm."}${redirect_url ? ` Occasionally mention checking their bio/link.` : ""} Reply ONLY with the reply text, nothing else.` },
                  { role: "user", content: `@${comment.username}: "${comment.text}"` },
                ],
                max_tokens: 80,
                temperature: 0.7,
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
          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 500));
        }

        result = { replies, total: replies.length };
        break;
      }

      // ===== ANALYZE CONTENT FOR OPTIMAL POSTING =====
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
              { role: "system", content: `You are a social media optimization expert. Analyze content and provide improvements.` },
              { role: "user", content: `Platform: ${platform}\nType: ${content_type}\nCaption: "${caption}"\n\nProvide:\n1. Optimized caption (keep similar length)\n2. Best hashtags (10-15)\n3. Best posting time\n4. Engagement prediction (1-10)\n5. Improvements needed` },
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

      // ===== GENERATE CAPTION =====
      case "generate_caption": {
        const { topic, platform, style, include_cta, cta_link } = params;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: `Generate a ${platform} caption. Style: ${style || "engaging, trendy"}. ${include_cta ? `Include a call-to-action directing to bio/link.` : ""} Include relevant hashtags. Reply ONLY with the caption text.` },
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

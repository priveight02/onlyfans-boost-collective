import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    // Fetch all active automations
    const { data: activeJobs } = await supabase
      .from("comment_automation_state")
      .select("*")
      .or("auto_reply.eq.true,auto_like_comments.eq.true,auto_like_replies.eq.true,auto_hide_negative.eq.true,auto_dm_buyers.eq.true,auto_follow_fans.eq.true,auto_cta_inject.eq.true,auto_boost.eq.true,auto_question_responder.eq.true,auto_lead_capture.eq.true");

    if (!activeJobs || activeJobs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active automations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const job of activeJobs) {
      const processedIds = new Set(job.processed_comment_ids || []);
      const stats = job.stats || { replied: 0, liked: 0, likedReplies: 0, hidden: 0, pinned: 0, dmd: 0, followed: 0, ctas: 0, boosted: 0, questions: 0, leads: 0 };
      let newProcessed = false;

      try {
        // Get the account's connection for API calls
        const { data: conn } = await supabase
          .from("social_connections")
          .select("access_token, metadata")
          .eq("account_id", job.account_id)
          .eq("platform", job.platform)
          .eq("is_connected", true)
          .single();

        if (!conn?.access_token) continue;

        // Fetch latest comments via the instagram-api edge function
        const commentsResp = await fetch(`${supabaseUrl}/functions/v1/instagram-api`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get_comments",
            params: { media_id: job.post_id, limit: 50 },
            account_id: job.account_id,
          }),
        });

        const commentsData = await commentsResp.json();
        const comments = commentsData?.data?.data || commentsData?.data || [];
        if (!Array.isArray(comments) || comments.length === 0) continue;

        const newComments = comments.filter((c: any) => !processedIds.has(c.id));
        if (newComments.length === 0) continue;

        // Process new comments based on enabled automations (batch — max 5 per run to save API calls)
        const batch = newComments.slice(0, 5);

        for (const comment of batch) {
          processedIds.add(comment.id);
          newProcessed = true;
          const commentText = (comment.text || "").toLowerCase();

          // Auto-like
          if (job.auto_like_comments) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/instagram-api`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ action: "like_comment", params: { comment_id: comment.id }, account_id: job.account_id }),
              });
              stats.liked++;
            } catch { /* skip */ }
            await new Promise(r => setTimeout(r, 1500));
          }

          // Auto-reply (AI-generated)
          if (job.auto_reply) {
            try {
              const aiResp = await fetch(`${supabaseUrl}/functions/v1/social-ai-responder`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "generate_comment_reply",
                  params: { comment_text: comment.text, comment_author: comment.username, redirect_url: job.redirect_url },
                  account_id: job.account_id,
                }),
              });
              const aiData = await aiResp.json();
              if (aiData?.data?.reply) {
                await fetch(`${supabaseUrl}/functions/v1/instagram-api`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "reply_to_comment",
                    params: { comment_id: comment.id, media_id: job.post_id, message: aiData.data.reply, comment_text: comment.text, comment_author: comment.username },
                    account_id: job.account_id,
                  }),
                });
                stats.replied++;
              }
            } catch { /* skip */ }
            await new Promise(r => setTimeout(r, 2000));
          }

          // Auto-question responder
          if (job.auto_question_responder) {
            const isQuestion = commentText.includes("?") || /^(how|what|when|where|why|who|can|do|does|is|are)\b/.test(commentText);
            if (isQuestion && !job.auto_reply) { // skip if auto_reply already handled it
              try {
                const aiResp = await fetch(`${supabaseUrl}/functions/v1/social-ai-responder`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "generate_comment_reply",
                    params: { comment_text: comment.text, comment_author: comment.username, redirect_url: job.redirect_url },
                    account_id: job.account_id,
                  }),
                });
                const aiData = await aiResp.json();
                if (aiData?.data?.reply) {
                  await fetch(`${supabaseUrl}/functions/v1/instagram-api`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "reply_to_comment",
                      params: { comment_id: comment.id, media_id: job.post_id, message: aiData.data.reply, comment_text: comment.text, comment_author: comment.username },
                      account_id: job.account_id,
                    }),
                  });
                  stats.questions++;
                }
              } catch { /* skip */ }
              await new Promise(r => setTimeout(r, 2000));
            }
          }

          // Auto-DM buyers
          if (job.auto_dm_buyers) {
            const buyingKeywords = ["price", "how much", "link", "buy", "order", "cost", "where", "dm me", "interested"];
            if (buyingKeywords.some(kw => commentText.includes(kw))) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/instagram-api`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "send_message",
                    params: { recipient_id: comment.username, message: `hey ${comment.username}! saw your comment — ${job.redirect_url || "check the bio for more info"}` },
                    account_id: job.account_id,
                  }),
                });
                stats.dmd++;
              } catch { /* skip */ }
              await new Promise(r => setTimeout(r, 3000));
            }
          }

          // Auto-lead capture (reply + DM combo)
          if (job.auto_lead_capture && !job.auto_dm_buyers) {
            const leadKeywords = ["price", "how much", "buy", "order", "link", "interested", "want this", "need this"];
            if (leadKeywords.some(kw => commentText.includes(kw))) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/instagram-api`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "send_message",
                    params: { recipient_id: comment.username, message: `hey ${comment.username}! thanks for the interest — ${job.redirect_url || "link in bio"}` },
                    account_id: job.account_id,
                  }),
                });
                stats.leads++;
              } catch { /* skip */ }
              await new Promise(r => setTimeout(r, 3000));
            }
          }

          totalProcessed++;
        }

        // Update state with new processed IDs and stats
        if (newProcessed) {
          await supabase.from("comment_automation_state").update({
            processed_comment_ids: Array.from(processedIds),
            stats,
            last_run_at: new Date().toISOString(),
          }).eq("id", job.id);
        }
      } catch (err) {
        console.error(`[CRON] Error processing job ${job.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed, jobs: activeJobs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[CRON] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

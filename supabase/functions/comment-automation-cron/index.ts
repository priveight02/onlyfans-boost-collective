import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AnyObj = Record<string, any>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function unwrapComments(apiData: AnyObj, platform: string): any[] {
  if (platform === "instagram") {
    const d = apiData?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.data?.data)) return d.data.data;
    if (Array.isArray(apiData?.data?.data)) return apiData.data.data;
    return [];
  }
  if (platform === "tiktok") {
    const d = apiData?.data;
    if (Array.isArray(d?.comments)) return d.comments;
    if (Array.isArray(d?.data?.comments)) return d.data.comments;
    return [];
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: activeJobs } = await supabase
      .from("comment_automation_state")
      .select("*")
      .or(
        [
          "auto_reply.eq.true",
          "auto_like_comments.eq.true",
          "auto_like_replies.eq.true",
          "auto_hide_negative.eq.true",
          "auto_pin_best.eq.true",
          "auto_thank_fans.eq.true",
          "auto_dm_buyers.eq.true",
          "auto_follow_fans.eq.true",
          "auto_cta_inject.eq.true",
          "auto_boost.eq.true",
          "auto_question_responder.eq.true",
          "auto_lead_capture.eq.true",
        ].join(",")
      );

    if (!activeJobs || activeJobs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active automations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const job of activeJobs) {
      const platform = String(job.platform || "instagram");
      const apiFunc = platform === "tiktok" ? "tiktok-api" : "instagram-api";

      const processedIds = new Set<string>(job.processed_comment_ids || []);
      const stats = job.stats || {
        replied: 0,
        liked: 0,
        likedReplies: 0,
        hidden: 0,
        pinned: 0,
        dmd: 0,
        followed: 0,
        ctas: 0,
        boosted: 0,
        questions: 0,
        leads: 0,
      };

      let touched = false;

      try {
        const { data: conn } = await supabase
          .from("social_connections")
          .select("id")
          .eq("account_id", job.account_id)
          .eq("platform", platform)
          .eq("is_connected", true)
          .maybeSingle();

        if (!conn) continue;

        const params =
          platform === "tiktok"
            ? { video_id: job.post_id, limit: 50 }
            : { media_id: job.post_id, limit: 50 };

        const commentsResp = await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "get_comments", params, account_id: job.account_id }),
        });

        const commentsBody = await commentsResp.json();
        const comments = unwrapComments(commentsBody, platform);
        if (!Array.isArray(comments) || comments.length === 0) continue;

        const newComments = comments.filter((c: any) => c?.id && !processedIds.has(String(c.id)));
        if (newComments.length === 0) continue;

        const batch = newComments.slice(0, 6);
        for (const c of batch) processedIds.add(String(c.id));
        touched = true;

        // Hide negative (single AI call)
        if (job.auto_hide_negative) {
          try {
            const aiResp = await fetch(`${supabaseUrl}/functions/v1/social-ai-responder`, {
              method: "POST",
              headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "filter_comments",
                account_id: job.account_id,
                params: {
                  filter_type: "negative",
                  comments: batch.map((x: any) => ({
                    id: String(x.id),
                    text: x.text || "",
                    username: x.username || x.from?.username || x.user?.unique_id || "user",
                  })),
                },
              }),
            });

            const aiData = await aiResp.json();
            const ids: string[] = aiData?.data?.filtered_ids || aiData?.filtered_ids || [];

            for (const id of (Array.isArray(ids) ? ids : []).slice(0, 3)) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "hide_comment", params: { comment_id: id }, account_id: job.account_id }),
                });
                stats.hidden++;
                await sleep(900);
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        }

        // Like comments (supports like + boost)
        if (job.auto_like_comments || job.auto_boost || job.auto_pin_best) {
          for (const c of batch) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ action: "like_comment", params: { comment_id: String(c.id) }, account_id: job.account_id }),
              });
              stats.liked++;
              await sleep(800);
            } catch {
              // ignore
            }
          }
        }

        // Like replies (best effort)
        if (job.auto_like_replies) {
          for (const c of batch) {
            const replies = c?.replies?.data || c?.replies || [];
            if (!Array.isArray(replies)) continue;
            for (const r of replies.slice(0, 2)) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "like_comment", params: { comment_id: String(r.id) }, account_id: job.account_id }),
                });
                stats.likedReplies++;
                await sleep(900);
              } catch {
                // ignore
              }
            }
          }
        }

        // Follow fans (best effort)
        if (job.auto_follow_fans) {
          for (const c of batch) {
            const userId = c?.from?.id || c?.user_id;
            if (!userId) continue;
            try {
              await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ action: "follow_user", params: { user_id: String(userId) }, account_id: job.account_id }),
              });
              stats.followed++;
              await sleep(1400);
            } catch {
              // ignore
            }
          }
        }

        // Bulk AI replies (single AI call)
        const needsAnyReply =
          job.auto_reply ||
          job.auto_question_responder ||
          job.auto_cta_inject ||
          job.auto_thank_fans ||
          job.auto_boost ||
          job.auto_pin_best ||
          job.auto_lead_capture;

        const replyCandidates = needsAnyReply
          ? batch.map((c: any) => ({
              id: String(c.id),
              text: c.text || "",
              username: c.username || c.from?.username || c.user?.unique_id || "user",
            }))
          : [];

        if (replyCandidates.length) {
          const style =
            "Auto mode: if buying intent then CTA, if question then answer, if compliment then thank, otherwise short warm reply";

          try {
            const aiResp = await fetch(`${supabaseUrl}/functions/v1/social-ai-responder`, {
              method: "POST",
              headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "bulk_generate_replies",
                account_id: job.account_id,
                params: { comments: replyCandidates, reply_style: style, redirect_url: job.redirect_url },
              }),
            });

            const aiData = await aiResp.json();
            const replies = aiData?.data?.replies || aiData?.replies || [];

            for (const r of replies) {
              if (!r?.comment_id || !r?.generated_reply) continue;
              try {
                const replyParams =
                  platform === "tiktok"
                    ? { video_id: job.post_id, comment_id: r.comment_id, message: r.generated_reply }
                    : {
                        comment_id: r.comment_id,
                        media_id: job.post_id,
                        message: r.generated_reply,
                        comment_text: r.comment_text,
                        comment_author: r.username,
                      };

                await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reply_to_comment", params: replyParams, account_id: job.account_id }),
                });

                stats.replied++;
                await sleep(1200);
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        }

        // DMs for buyers / lead capture (capped)
        if (job.auto_dm_buyers || job.auto_lead_capture) {
          const buyingKeywords = [
            "price",
            "how much",
            "link",
            "buy",
            "order",
            "cost",
            "where",
            "dm me",
            "interested",
            "want this",
            "need this",
          ];

          const dmTargets = batch
            .map((c: any) => ({
              username: c.username || c.from?.username || c.user?.unique_id || "",
              text: String(c.text || "").toLowerCase(),
              raw: c,
            }))
            .filter((t) => t.username && buyingKeywords.some((kw) => t.text.includes(kw)))
            .slice(0, 2);

          for (const t of dmTargets) {
            try {
              const aiResp = await fetch(`${supabaseUrl}/functions/v1/social-ai-responder`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "generate_dm_from_comment",
                  account_id: job.account_id,
                  params: { comment_text: t.raw.text, comment_author: t.username, redirect_url: job.redirect_url },
                }),
              });

              const aiData = await aiResp.json();
              const dmText = aiData?.data?.dm || aiData?.dm || `hey ${t.username} thanks for the comment`;

              await fetch(`${supabaseUrl}/functions/v1/${apiFunc}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "send_message",
                  params: { recipient_id: t.username, message: dmText },
                  account_id: job.account_id,
                }),
              });

              stats.dmd++;
              if (job.auto_lead_capture) stats.leads++;
              await sleep(1600);
            } catch {
              // ignore
            }
          }
        }

        // Keep processed_comment_ids bounded
        const nextProcessed = Array.from(processedIds);
        const bounded = nextProcessed.length > 1500 ? nextProcessed.slice(nextProcessed.length - 1500) : nextProcessed;

        await supabase
          .from("comment_automation_state")
          .update({
            processed_comment_ids: bounded,
            stats,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        totalProcessed += batch.length;
      } catch (err) {
        console.error(`[CRON] Error processing job ${job.id}:`, err);
      }

      await sleep(250);
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

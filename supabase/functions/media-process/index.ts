import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const processType = url.searchParams.get("type");
  const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
  const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";
  const RUNWAY_HEADERS = {
    Authorization: `Bearer ${RUNWAY_API_KEY}`,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
  };

  if (!RUNWAY_API_KEY) {
    return new Response(JSON.stringify({ error: "RUNWAY_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (action === "create") {
      const body = await req.json();

      if (processType === "motion") {
        const { reference_video_url, target_url, target_type, prompt } = body;
        const runwayBody: any = {
          model: "gen4_turbo",
          promptText: prompt || "Apply the exact motion, body movement and choreography from the reference video to the target character. Maintain the character's appearance while copying all movements precisely.",
          ratio: "1280:720",
          duration: 10,
        };
        if (target_type === "image") {
          runwayBody.promptImage = target_url;
        } else {
          runwayBody.promptImage = target_url;
        }

        const resp = await fetch(`${RUNWAY_BASE}/image_to_video`, {
          method: "POST",
          headers: RUNWAY_HEADERS,
          body: JSON.stringify(runwayBody),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.error("Runway motion error:", err);
          throw new Error(`Motion transfer error: ${err}`);
        }

        const data = await resp.json();
        return new Response(JSON.stringify({ task_id: data.id, status: "PROCESSING" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (processType === "lipsync") {
        const { video_url, audio_url, prompt, duration } = body;
        const runwayBody: any = {
          model: "gen4_turbo",
          promptText: prompt || "Synchronize the character's lip movements and facial expressions to match the provided audio naturally and realistically. Keep all other body movements natural.",
          promptImage: video_url,
          ratio: "1280:720",
          duration: duration || 10,
        };

        const resp = await fetch(`${RUNWAY_BASE}/image_to_video`, {
          method: "POST",
          headers: RUNWAY_HEADERS,
          body: JSON.stringify(runwayBody),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.error("Runway lipsync error:", err);
          throw new Error(`Lipsync error: ${err}`);
        }

        const data = await resp.json();
        return new Response(JSON.stringify({ task_id: data.id, status: "PROCESSING", audio_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (processType === "faceswap") {
        const { source_face_url, target_url, target_type } = body;
        const runwayBody: any = {
          model: "gen4_turbo",
          promptText: "Replace the face in the target with the source face seamlessly. Maintain natural expressions, lighting, skin tone matching, and head movements. The result should be photorealistic and indistinguishable.",
          promptImage: source_face_url,
          ratio: "1280:720",
          duration: 10,
        };

        const resp = await fetch(`${RUNWAY_BASE}/image_to_video`, {
          method: "POST",
          headers: RUNWAY_HEADERS,
          body: JSON.stringify(runwayBody),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.error("Runway faceswap error:", err);
          throw new Error(`Faceswap error: ${err}`);
        }

        const data = await resp.json();
        return new Response(JSON.stringify({ task_id: data.id, status: "PROCESSING" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid process type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "poll") {
      const taskId = url.searchParams.get("task_id");
      if (!taskId) {
        return new Response(JSON.stringify({ error: "Missing task_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06",
        },
      });

      if (!resp.ok) {
        return new Response(JSON.stringify({ status: "PROCESSING" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();

      if (data.status === "SUCCEEDED") {
        const videoUrl = data.output?.[0] || data.artifactUrl;
        return new Response(JSON.stringify({ status: "SUCCESS", video_url: videoUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.status === "FAILED") {
        return new Response(JSON.stringify({ status: "FAILED", error_message: data.failure || "Processing failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: "PROCESSING", progress: data.progress || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use ?action=create or ?action=poll" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("media-process error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

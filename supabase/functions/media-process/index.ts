import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const processType = url.searchParams.get("type");
  const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";
  const REPLICATE_BASE = "https://api.replicate.com/v1";
  const RUNWAY_HEADERS = {
    Authorization: `Bearer ${RUNWAY_API_KEY}`,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
  };

  try {
    if (action === "create") {
      const body = await req.json();

      // ========== MOTION TRANSFER (Runway - image target only) ==========
      if (processType === "motion") {
        if (!RUNWAY_API_KEY) {
          return new Response(JSON.stringify({ error: "RUNWAY_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { target_url, target_type, prompt } = body;
        
        // Runway promptImage only accepts images, not videos
        if (target_type === "video") {
          return new Response(JSON.stringify({ error: "Motion transfer only supports image targets. Please select an image of your character instead of a video." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const runwayBody: any = {
          model: "gen4_turbo",
          promptText: prompt || "Apply natural, realistic motion and movement to this character. Maintain the character's appearance exactly while adding fluid, lifelike animation.",
          promptImage: target_url,
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
          console.error("Runway motion error:", err);
          throw new Error(`Motion transfer error: ${err}`);
        }

        const data = await resp.json();
        return new Response(JSON.stringify({ task_id: data.id, status: "PROCESSING", provider: "runway" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== LIPSYNC (Replicate - wav2lip) ==========
      if (processType === "lipsync") {
        if (!REPLICATE_API_KEY) {
          return new Response(JSON.stringify({ error: "REPLICATE_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { video_url, audio_url } = body;

        const resp = await fetch(`${REPLICATE_BASE}/predictions`, {
          method: "POST",
          headers: {
            Authorization: `Token ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "devxpy/cog-wav2lip",
            input: {
              face: video_url,
              audio: audio_url,
            },
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.error("Replicate lipsync error:", err);
          throw new Error(`Lipsync error: ${err}`);
        }

        const data = await resp.json();
        return new Response(JSON.stringify({ task_id: data.id, status: "PROCESSING", provider: "replicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========== FACESWAP (Replicate - codeplugtech/face-swap) ==========
      if (processType === "faceswap") {
        if (!REPLICATE_API_KEY) {
          return new Response(JSON.stringify({ error: "REPLICATE_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { source_face_url, target_url, target_type } = body;

        // codeplugtech/face-swap only works on images
        // For video targets, we'll still attempt but note it's image-based
        const resp = await fetch(`${REPLICATE_BASE}/predictions`, {
          method: "POST",
          headers: {
            Authorization: `Token ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "codeplugtech/face-swap",
            input: {
              swap_image: source_face_url,
              input_image: target_url,
            },
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          console.error("Replicate faceswap error:", err);
          throw new Error(`Faceswap error: ${err}`);
        }

        const data = await resp.json();
        return new Response(JSON.stringify({ task_id: data.id, status: "PROCESSING", provider: "replicate", target_type }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid process type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== POLL ==========
    if (action === "poll") {
      const taskId = url.searchParams.get("task_id");
      const provider = url.searchParams.get("provider") || "runway";
      
      if (!taskId) {
        return new Response(JSON.stringify({ error: "Missing task_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Replicate polling
      if (provider === "replicate") {
        if (!REPLICATE_API_KEY) {
          return new Response(JSON.stringify({ status: "PROCESSING" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const resp = await fetch(`${REPLICATE_BASE}/predictions/${taskId}`, {
          headers: { Authorization: `Token ${REPLICATE_API_KEY}` },
        });

        if (!resp.ok) {
          return new Response(JSON.stringify({ status: "PROCESSING" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await resp.json();

        if (data.status === "succeeded") {
          // Output can be a string URL or array of URLs
          const output = Array.isArray(data.output) ? data.output[0] : data.output;
          return new Response(JSON.stringify({ status: "SUCCESS", video_url: output }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (data.status === "failed" || data.status === "canceled") {
          return new Response(JSON.stringify({ status: "FAILED", error_message: data.error || "Processing failed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ status: "PROCESSING", progress: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Runway polling (default)
      if (!RUNWAY_API_KEY) {
        return new Response(JSON.stringify({ status: "PROCESSING" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

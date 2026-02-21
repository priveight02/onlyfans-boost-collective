import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        const { target_url, target_type, prompt, quality } = body;
        
        // Runway promptImage only accepts images, not videos
        if (target_type === "video") {
          return new Response(JSON.stringify({ error: "Motion transfer only supports image targets. Please select an image of your character instead of a video." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Map quality to resolution
        const ratioMap: Record<string, string> = {
          highest: "1920:1080",
          high: "1280:720",
          medium: "854:480",
          low: "640:360",
        };

        const runwayBody: any = {
          model: "gen4_turbo",
          promptText: prompt || "Apply natural, realistic motion and movement to this character. Maintain the character's appearance exactly while adding fluid, lifelike animation.",
          promptImage: target_url,
          ratio: ratioMap[quality || "high"] || "1280:720",
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
        let { video_url, audio_url, quality, tts_text, tts_voice_id } = body;

        // If TTS text + voice provided, generate audio via ElevenLabs first
        if (tts_text && tts_voice_id && !audio_url) {
          const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
          if (!ELEVENLABS_API_KEY) {
            return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${tts_voice_id}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({
                text: tts_text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.5, speed: 1.0, use_speaker_boost: true },
              }),
            }
          );
          if (!ttsResp.ok) {
            const errText = await ttsResp.text();
            throw new Error(`TTS generation failed: ${errText}`);
          }
          const audioBuffer = await ttsResp.arrayBuffer();
          // Upload to Supabase storage using JS client
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
          const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const fileName = `lipsync_tts_${Date.now()}.mp3`;
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { error: uploadError } = await supabaseAdmin.storage
            .from("copilot-media")
            .upload(fileName, new Uint8Array(audioBuffer), {
              contentType: "audio/mpeg",
              upsert: false,
            });
          if (uploadError) {
            throw new Error(`Audio upload failed: ${uploadError.message}`);
          }
          audio_url = `${SUPABASE_URL}/storage/v1/object/public/copilot-media/${fileName}`;
        }

        if (!audio_url) {
          return new Response(JSON.stringify({ error: "No audio provided" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Map quality to resize_factor: 1 = highest (no resize), 2 = medium, 4 = fastest/lowest
        const qualityMap: Record<string, { resize_factor: number; smooth: boolean }> = {
          highest: { resize_factor: 1, smooth: true },
          high: { resize_factor: 1, smooth: true },
          medium: { resize_factor: 2, smooth: true },
          low: { resize_factor: 4, smooth: false },
        };
        const qSettings = qualityMap[quality || "high"] || qualityMap.high;

        const resp = await fetch(`${REPLICATE_BASE}/predictions`, {
          method: "POST",
          headers: {
            Authorization: `Token ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "respond-async",
          },
          body: JSON.stringify({
            version: "8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef",
            input: {
              face: video_url,
              audio: audio_url,
              resize_factor: qSettings.resize_factor,
              smooth: qSettings.smooth,
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
            "Prefer": "respond-async",
          },
          body: JSON.stringify({
            version: "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34",
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

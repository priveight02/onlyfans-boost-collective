import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ---- ACTION: clone ----
    if (action === "clone") {
      const formData = await req.formData();
      const name = formData.get("name") as string;
      const description = (formData.get("description") as string) || "Cloned voice";

      const elevenForm = new FormData();
      elevenForm.append("name", name);
      elevenForm.append("description", description);
      // Use highest quality cloning model for most natural human voice reproduction
      elevenForm.append("remove_background_noise", "true");

      const files = formData.getAll("files");
      if (!files.length) throw new Error("No audio files provided");

      for (const file of files) {
        if (file instanceof File) {
          elevenForm.append("files", file, file.name);
        }
      }

      const cloneResp = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        body: elevenForm,
      });

      if (!cloneResp.ok) {
        const errText = await cloneResp.text();
        console.error("ElevenLabs clone error:", cloneResp.status, errText);
        throw new Error(`Voice cloning failed: ${errText}`);
      }

      const cloneData = await cloneResp.json();
      const voiceId = cloneData.voice_id;

      // Generate a preview with the cloned voice
      const previewResp = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: "Hello, how are you doing? I just wanted to check in and see how everything's going on your end.",
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.35, similarity_boost: 0.82, style: 0.40, use_speaker_boost: true, speed: 0.85 },
        }),
      });

      let previewBase64 = "";
      if (previewResp.ok) {
        const audioBuffer = await previewResp.arrayBuffer();
        previewBase64 = base64Encode(audioBuffer);
      }

      return new Response(JSON.stringify({
        voice_id: voiceId,
        preview_audio: previewBase64 ? `data:audio/mpeg;base64,${previewBase64}` : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: generate (TTS) ----
    if (action === "generate") {
      const body = await req.json();
      const { text, voice_id, voice_settings } = body;

      if (!text) throw new Error("Text is required");
      if (!voice_id) throw new Error("voice_id is required");

      const settings = {
        stability: voice_settings?.stability ?? 0.35,
        similarity_boost: voice_settings?.similarity_boost ?? 0.82,
        style: voice_settings?.style ?? 0.40,
        use_speaker_boost: voice_settings?.use_speaker_boost ?? true,
        speed: voice_settings?.speed ?? 0.85,
      };

      const ttsResp = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voice_id}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { ...settings },
        }),
      });

      if (!ttsResp.ok) {
        const errText = await ttsResp.text();
        throw new Error(`TTS generation failed: ${errText}`);
      }

      const audioBuffer = await ttsResp.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: sfx (Sound Effects) ----
    if (action === "sfx") {
      const body = await req.json();
      const { text, duration } = body;
      if (!text) throw new Error("text is required for sound effects");

      const sfxResp = await fetch(`${ELEVENLABS_BASE}/sound-generation`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          duration_seconds: duration || 5,
          prompt_influence: 0.3,
        }),
      });

      if (!sfxResp.ok) {
        const errText = await sfxResp.text();
        throw new Error(`Sound effect generation failed: ${errText}`);
      }

      const audioBuffer = await sfxResp.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: sts (Speech to Speech) ----
    if (action === "sts") {
      const formData = await req.formData();
      const voice_id = formData.get("voice_id") as string;
      const audioFile = formData.get("audio") as File;

      if (!voice_id) throw new Error("voice_id is required");
      if (!audioFile) throw new Error("audio file is required");

      const stsForm = new FormData();
      stsForm.append("audio", audioFile, audioFile.name);
      stsForm.append("model_id", "eleven_multilingual_sts_v2");

      const stsResp = await fetch(`${ELEVENLABS_BASE}/speech-to-speech/${voice_id}`, {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        body: stsForm,
      });

      if (!stsResp.ok) {
        const errText = await stsResp.text();
        throw new Error(`Speech-to-Speech failed: ${errText}`);
      }

      const audioBuffer = await stsResp.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: voice_isolation ----
    if (action === "voice_isolation") {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File;
      if (!audioFile) throw new Error("audio file is required");

      const isoForm = new FormData();
      isoForm.append("audio", audioFile, audioFile.name);

      const isoResp = await fetch(`${ELEVENLABS_BASE}/audio-isolation`, {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        body: isoForm,
      });

      if (!isoResp.ok) {
        const errText = await isoResp.text();
        throw new Error(`Voice isolation failed: ${errText}`);
      }

      const audioBuffer = await isoResp.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: voice_dubbing ----
    if (action === "voice_dubbing") {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File;
      const target_language = formData.get("target_language") as string || "es";

      if (!audioFile) throw new Error("audio file is required");

      const dubForm = new FormData();
      dubForm.append("file", audioFile, audioFile.name);
      dubForm.append("target_lang", target_language);

      const dubResp = await fetch(`${ELEVENLABS_BASE}/dubbing`, {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        body: dubForm,
      });

      if (!dubResp.ok) {
        const errText = await dubResp.text();
        throw new Error(`Voice dubbing failed: ${errText}`);
      }

      const dubData = await dubResp.json();
      const dubbingId = dubData.dubbing_id;

      if (!dubbingId) throw new Error("No dubbing_id returned");

      // Poll for dubbing completion
      let dubbedUrl: string | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const statusResp = await fetch(`${ELEVENLABS_BASE}/dubbing/${dubbingId}`, {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        });
        if (!statusResp.ok) continue;
        const statusData = await statusResp.json();
        if (statusData.status === "dubbed") {
          // Download the dubbed audio
          const dlResp = await fetch(`${ELEVENLABS_BASE}/dubbing/${dubbingId}/audio/${target_language}`, {
            headers: { "xi-api-key": ELEVENLABS_API_KEY },
          });
          if (dlResp.ok) {
            const audioBuffer = await dlResp.arrayBuffer();
            const base64Audio = base64Encode(audioBuffer);
            dubbedUrl = `data:audio/mpeg;base64,${base64Audio}`;
          }
          break;
        }
        if (statusData.status === "failed") throw new Error("Dubbing failed");
      }

      if (!dubbedUrl) throw new Error("Dubbing timed out");

      return new Response(JSON.stringify({ audio_url: dubbedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: list voices ----
    if (action === "list") {
      const listResp = await fetch(`${ELEVENLABS_BASE}/voices`, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
      if (!listResp.ok) throw new Error("Failed to list voices");
      const data = await listResp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: delete voice ----
    if (action === "delete") {
      const body = await req.json();
      const { voice_id } = body;
      if (!voice_id) throw new Error("voice_id required");

      const delResp = await fetch(`${ELEVENLABS_BASE}/voices/${voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });

      return new Response(JSON.stringify({ success: delResp.ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=clone|generate|list|delete|sfx|sts|voice_isolation|voice_dubbing" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

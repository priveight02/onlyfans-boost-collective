import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  // Try both secret names
  const key = Deno.env.get("ELEVENLABS_API_KEY_1") || Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ElevenLabs API key not configured");
  return key;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = getApiKey();
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

      const files = formData.getAll("files");
      if (!files.length) throw new Error("No audio files provided");
      for (const file of files) {
        if (file instanceof File) elevenForm.append("files", file, file.name);
      }

      const cloneResp = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: elevenForm,
      });

      if (!cloneResp.ok) {
        const errText = await cloneResp.text();
        console.error("ElevenLabs clone error:", cloneResp.status, errText);
        throw new Error(`Voice cloning failed (${cloneResp.status}): ${errText}`);
      }

      const cloneData = await cloneResp.json();
      const voiceId = cloneData.voice_id;

      // Generate a preview with the cloned voice
      const previewResp = await fetch(
        `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: "Hello, how are you doing?",
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.5, use_speaker_boost: true },
          }),
        }
      );

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

      const ttsResp = await fetch(
        `${ELEVENLABS_BASE}/text-to-speech/${voice_id}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: voice_settings?.stability ?? 0.5,
              similarity_boost: voice_settings?.similarity_boost ?? 0.85,
              style: voice_settings?.style ?? 0.5,
              use_speaker_boost: true,
              speed: voice_settings?.speed ?? 1.0,
            },
          }),
        }
      );

      if (!ttsResp.ok) {
        const errText = await ttsResp.text();
        console.error("ElevenLabs TTS error:", ttsResp.status, errText);
        throw new Error(`TTS generation failed (${ttsResp.status}): ${errText}`);
      }

      const audioBuffer = await ttsResp.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(JSON.stringify({
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      }), {
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
        headers: { "xi-api-key": apiKey },
      });

      return new Response(JSON.stringify({ success: delResp.ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=clone|generate|delete" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

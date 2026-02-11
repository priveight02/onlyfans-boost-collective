import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const { text, voiceId, action, samples } = await req.json();

    // Clone voice from samples
    if (action === "clone") {
      if (!samples || samples.length === 0) throw new Error("No samples provided");
      
      const formData = new FormData();
      formData.append("name", text || "Cloned Voice");
      formData.append("description", "Custom cloned voice from samples");

      // Fetch each sample URL and add as file
      for (let i = 0; i < samples.length; i++) {
        const sampleResp = await fetch(samples[i]);
        const blob = await sampleResp.blob();
        formData.append("files", blob, `sample_${i}.mp3`);
      }

      const cloneResp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        body: formData,
      });

      if (!cloneResp.ok) {
        const errText = await cloneResp.text();
        throw new Error(`Clone failed: ${errText}`);
      }

      const cloneData = await cloneResp.json();
      return new Response(JSON.stringify({ voice_id: cloneData.voice_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate TTS
    if (!text) throw new Error("No text provided");
    const vid = voiceId || "JBFqnCBsd6RMkjVDRZzb"; // Default George

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`TTS failed: ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

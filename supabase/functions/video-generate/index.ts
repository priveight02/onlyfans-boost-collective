import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";

// ─── Kling JWT helper ───
async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now };
  const encode = (obj: any) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const data = `${encode(header)}.${encode(payload)}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

// ─── Runway helpers ───
function runwayHeaders() {
  const apiKey = Deno.env.get("RUNWAY_API_KEY");
  if (!apiKey) throw new Error("RUNWAY_API_KEY not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": RUNWAY_VERSION,
  };
}

function mapAspectToRunwayRatio(aspect: string, _model: string): string {
  const ratioMap: Record<string, string> = {
    "16:9": "1280:720",
    "9:16": "720:1280",
    "1:1": "960:960",
    "4:3": "1104:832",
    "3:4": "832:1104",
    "21:9": "1584:672",
  };
  return ratioMap[aspect] || "1280:720";
}

// ─── Runway VIDEO create ───
async function runwayCreate(body: any) {
  const model = body.model_name || "gen4_turbo";
  const headers = runwayHeaders();

  let endpoint: string;
  let reqBody: any;

  if (model === "gen4_aleph") {
    if (!body.video_url) throw new Error("gen4_aleph requires a video_url for video-to-video");
    endpoint = `${RUNWAY_BASE}/video_to_video`;
    reqBody = { model: "gen4_aleph", videoUri: body.video_url, promptText: body.prompt };
    if (body.image_url) reqBody.references = [{ type: "image", uri: body.image_url }];
  } else if (model === "act_two") {
    if (!body.reference_video_url) throw new Error("act_two requires a reference_video_url");
    endpoint = `${RUNWAY_BASE}/character_performance`;
    reqBody = {
      model: "act_two",
      character: body.image_url ? { type: "image", uri: body.image_url } : { type: "video", uri: body.video_url || body.image_url },
      reference: { type: "video", uri: body.reference_video_url },
      ratio: mapAspectToRunwayRatio(body.aspect_ratio || "16:9", model),
      bodyControl: body.body_control !== false,
      expressionIntensity: body.expression_intensity || 3,
    };
  } else if (body.image_url) {
    endpoint = `${RUNWAY_BASE}/image_to_video`;
    reqBody = {
      model,
      promptText: body.prompt,
      promptImage: body.image_url,
      ratio: mapAspectToRunwayRatio(body.aspect_ratio || "16:9", model),
      duration: Math.min(Math.max(body.duration || 5, 2), 10),
    };
  } else {
    const t2vModels = ["gen4.5", "veo3.1", "veo3.1_fast", "veo3"];
    const veoModels = ["veo3", "veo3.1", "veo3.1_fast"];
    const isVeo = veoModels.includes(model);
    if (!t2vModels.includes(model)) {
      endpoint = `${RUNWAY_BASE}/image_to_video`;
      reqBody = { model, promptText: body.prompt, ratio: mapAspectToRunwayRatio(body.aspect_ratio || "16:9", model), duration: Math.min(Math.max(body.duration || 5, 2), 10) };
    } else {
      endpoint = `${RUNWAY_BASE}/text_to_video`;
      // Veo models only support "1280:720" and "720:1280" ratios and no duration param
      const ratio = isVeo
        ? ((body.aspect_ratio === "9:16") ? "720:1280" : "1280:720")
        : mapAspectToRunwayRatio(body.aspect_ratio || "16:9", model);
      reqBody = { model, promptText: body.prompt, ratio };
      if (!isVeo) {
        reqBody.duration = Math.min(Math.max(body.duration || 5, 2), 10);
      }
    }
  }

  console.log("Runway request:", endpoint, JSON.stringify(reqBody));
  const resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(reqBody) });
  const data = await resp.json();
  if (!resp.ok) { console.error("Runway error:", resp.status, JSON.stringify(data)); throw new Error(data.error || JSON.stringify(data) || `Runway error (${resp.status})`); }
  return { task_id: data.id, status: "IN_PROGRESS", provider: "runway", model };
}

async function runwayPoll(taskId: string) {
  const headers = runwayHeaders();
  const resp = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, { headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Poll error`);
  const status = data.status === "SUCCEEDED" ? "SUCCESS" : data.status === "FAILED" ? "FAILED" : "IN_PROGRESS";
  return { task_id: data.id, status, video_url: data.output?.[0] || null, error_message: data.failure, progress: data.progress };
}

// ─── Runway IMAGE generation ───
async function runwayImageCreate(body: any) {
  const headers = runwayHeaders();
  const model = body.model_name || "gen4_image";

  let endpoint: string;
  let reqBody: any;

  if (model === "gemini_2.5_flash") {
    // Gemini image gen via Runway
    endpoint = `${RUNWAY_BASE}/image`;
    reqBody = {
      model: "gemini_2.5_flash",
      promptText: body.prompt,
    };
    if (body.image_url) reqBody.referenceImages = [{ uri: body.image_url }];
  } else {
    // gen4_image or gen4_image_turbo
    endpoint = `${RUNWAY_BASE}/image`;
    reqBody = {
      model,
      promptText: body.prompt,
      ratio: mapAspectToRunwayRatio(body.aspect_ratio || "1:1", model),
    };
    if (body.resolution) reqBody.resolution = body.resolution; // "720p" or "1080p"
    if (body.image_url) reqBody.referenceImages = [{ uri: body.image_url }];
  }

  console.log("Runway image request:", endpoint, JSON.stringify(reqBody));
  const resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(reqBody) });
  const data = await resp.json();
  if (!resp.ok) { console.error("Runway image error:", resp.status, JSON.stringify(data)); throw new Error(data.error || JSON.stringify(data)); }
  return { task_id: data.id, status: "IN_PROGRESS", provider: "runway", content_type: "image", model };
}

// ─── Runway AUDIO actions (TTS, STS, SFX, Voice Isolation, Dubbing) ───
async function runwayAudioCreate(body: any) {
  const headers = runwayHeaders();
  const action = body.audio_action || "tts";

  let endpoint: string;
  let reqBody: any;

  if (action === "tts") {
    endpoint = `${RUNWAY_BASE}/text_to_speech`;
    reqBody = {
      model: "eleven_multilingual_v2",
      promptText: body.text || body.prompt,
      voice: { type: "runway-preset", presetId: body.voice_preset || "Leslie" },
    };
  } else if (action === "sts") {
    endpoint = `${RUNWAY_BASE}/speech_to_speech`;
    const mediaType = body.video_url ? "video" : "audio";
    reqBody = {
      model: "eleven_multilingual_sts_v2",
      media: { type: mediaType, uri: body.video_url || body.audio_url },
      voice: { type: "runway-preset", presetId: body.voice_preset || "Leslie" },
      removeBackgroundNoise: body.remove_noise || false,
    };
  } else if (action === "sfx") {
    endpoint = `${RUNWAY_BASE}/sound_effect`;
    reqBody = {
      model: "eleven_text_to_sound_v2",
      promptText: body.text || body.prompt,
      duration: body.duration || 5,
      loop: body.loop || false,
    };
  } else if (action === "voice_isolation") {
    endpoint = `${RUNWAY_BASE}/voice_isolation`;
    reqBody = {
      model: "eleven_voice_isolation",
      media: { type: body.media_type || "audio", uri: body.audio_url || body.video_url },
    };
  } else if (action === "voice_dubbing") {
    endpoint = `${RUNWAY_BASE}/voice_dubbing`;
    reqBody = {
      model: "eleven_voice_dubbing",
      media: { type: body.media_type || "audio", uri: body.audio_url || body.video_url },
      targetLanguage: body.target_language || "es",
    };
  } else {
    throw new Error(`Unknown audio_action: ${action}`);
  }

  const resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(reqBody) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || JSON.stringify(data) || `Runway audio error (${resp.status})`);
  return { task_id: data.id, status: "IN_PROGRESS", provider: "runway", audio_action: action };
}

// ─── Seedance ───
async function seedanceCreate(body: any) {
  const apiKey = Deno.env.get("SEEDANCE_API_KEY");
  if (!apiKey) throw new Error("SEEDANCE_API_KEY not configured");
  const reqBody: any = { prompt: body.prompt, duration: String(body.duration || "8"), aspect_ratio: body.aspect_ratio || "16:9", resolution: body.resolution || "720p" };
  if (body.generate_audio) reqBody.generate_audio = true;
  if (body.fixed_lens) reqBody.fixed_lens = true;
  if (body.image_url) reqBody.image_urls = [body.image_url];
  const resp = await fetch("https://seedanceapi.org/v1/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(reqBody) });
  const data = await resp.json();
  if (!resp.ok || data.code !== 200) throw new Error(data.message || `Seedance error (${resp.status})`);
  return { task_id: data.data?.task_id, status: data.data?.status, provider: "seedance" };
}

async function seedancePoll(taskId: string) {
  const apiKey = Deno.env.get("SEEDANCE_API_KEY");
  if (!apiKey) throw new Error("SEEDANCE_API_KEY not configured");
  const resp = await fetch(`https://seedanceapi.org/v1/status?task_id=${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await resp.json();
  if (!resp.ok || data.code !== 200) throw new Error(data.message || `Poll error`);
  const td = data.data;
  return { task_id: td?.task_id, status: td?.status, video_url: td?.status === "SUCCESS" && td?.response?.length ? td.response[0] : null, error_message: td?.error_message };
}

// ─── Kling ───
async function klingCreate(body: any) {
  const ak = Deno.env.get("KLING_ACCESS_KEY"); const sk = Deno.env.get("KLING_SECRET_KEY");
  if (!ak || !sk) throw new Error("Kling API keys not configured");
  const token = await generateKlingJWT(ak, sk);
  const endpoint = body.image_url ? "https://api.klingai.com/v1/videos/image2video" : "https://api.klingai.com/v1/videos/text2video";
  const reqBody: any = { prompt: body.prompt, duration: String(body.duration || "5"), aspect_ratio: body.aspect_ratio || "16:9", model_name: body.model_name || "kling-v2-master", mode: body.mode || "std" };
  if (body.image_url) reqBody.image = body.image_url;
  const resp = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(reqBody) });
  const data = await resp.json();
  if (!resp.ok || data.code !== 0) throw new Error(data.message || `Kling error (${resp.status})`);
  return { task_id: data.data?.task_id, status: data.data?.task_status, provider: "kling", task_type: body.image_url ? "image2video" : "text2video" };
}

async function klingPoll(taskId: string, taskType: string) {
  const ak = Deno.env.get("KLING_ACCESS_KEY"); const sk = Deno.env.get("KLING_SECRET_KEY");
  if (!ak || !sk) throw new Error("Kling API keys not configured");
  const token = await generateKlingJWT(ak, sk);
  const resp = await fetch(`https://api.klingai.com/v1/videos/${taskType || "text2video"}/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  if (!resp.ok || data.code !== 0) throw new Error(data.message || `Poll error`);
  const td = data.data;
  return { task_id: td?.task_id, status: td?.task_status === "succeed" ? "SUCCESS" : td?.task_status === "failed" ? "FAILED" : "IN_PROGRESS", video_url: td?.task_status === "succeed" && td?.task_result?.videos?.length ? td.task_result.videos[0].url : null, error_message: td?.task_status_msg };
}

// ─── HuggingFace ───
async function huggingfaceCreate(body: any) {
  const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not configured");
  const model = body.model_name || "Lightricks/LTX-Video-0.9.8-13B-distilled";
  const resp = await fetch(`https://router.huggingface.co/fal-ai/fal-ai/${encodeURIComponent(model)}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ inputs: body.prompt, parameters: { num_frames: Math.min((body.duration || 4) * 8, 97), guidance_scale: 7.5 } }) });
  if (resp.ok) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("video") || ct.includes("octet")) { const blob = await resp.arrayBuffer(); const b64 = btoa(String.fromCharCode(...new Uint8Array(blob))); return { task_id: "hf_direct", status: "SUCCESS", video_data: b64, provider: "huggingface" }; }
    const data = await resp.json();
    if (data.video) return { task_id: "hf_direct", status: "SUCCESS", video_url: data.video, provider: "huggingface" };
    if (data.error) throw new Error(data.error);
    return { task_id: "hf_queued", status: "IN_PROGRESS", estimated_time: data.estimated_time, provider: "huggingface" };
  }
  throw new Error(`HuggingFace error (${resp.status}): ${await resp.text()}`);
}

// ─── Replicate ───
async function replicateCreate(body: any) {
  const apiKey = Deno.env.get("REPLICATE_API_KEY");
  if (!apiKey) throw new Error("REPLICATE_API_KEY not configured");
  const model = body.model_name || "minimax/video-01-live";
  const input: any = { prompt: body.prompt };
  const i2vModels = ["minimax/video-01-live", "wavespeedai/wan-2.1-i2v-480p", "wavespeedai/wan-2.1-i2v-720p"];
  const isI2V = i2vModels.includes(model);
  if (body.image_url && isI2V) input.first_frame_image = body.image_url;
  if (model.includes("minimax")) input.prompt_optimizer = true;
  if (model.includes("wan-2.1") && !model.includes("i2v")) { if (body.aspect_ratio) input.aspect_ratio = body.aspect_ratio; }
  if (model.includes("hunyuan")) { if (body.aspect_ratio === "9:16") { input.width = 480; input.height = 854; } else if (body.aspect_ratio === "1:1") { input.width = 720; input.height = 720; } else { input.width = 854; input.height = 480; } }
  const resp = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ input }) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || JSON.stringify(data) || `Replicate error (${resp.status})`);
  const output = typeof data.output === "string" ? data.output : data.output?.[0] || null;
  return { task_id: data.id, status: data.status === "succeeded" ? "SUCCESS" : "IN_PROGRESS", video_url: output, provider: "replicate", poll_url: data.urls?.get };
}

async function replicatePoll(taskId: string) {
  const apiKey = Deno.env.get("REPLICATE_API_KEY");
  if (!apiKey) throw new Error("REPLICATE_API_KEY not configured");
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `Poll error`);
  const status = data.status === "succeeded" ? "SUCCESS" : data.status === "failed" || data.status === "canceled" ? "FAILED" : "IN_PROGRESS";
  return { task_id: data.id, status, video_url: data.output?.[0] || null, error_message: data.error };
}

// ─── Luma ───
async function lumaCreate(body: any) {
  const apiKey = Deno.env.get("LUMA_API_KEY");
  if (!apiKey) throw new Error("LUMA_API_KEY not configured");
  const reqBody: any = { prompt: body.prompt, aspect_ratio: body.aspect_ratio || "16:9", loop: false };
  if (body.image_url) reqBody.keyframes = { frame0: { type: "image", url: body.image_url } };
  const resp = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(reqBody) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || data.message || `Luma error (${resp.status})`);
  return { task_id: data.id, status: data.state === "completed" ? "SUCCESS" : "IN_PROGRESS", video_url: data.assets?.video || null, provider: "luma" };
}

async function lumaPoll(taskId: string) {
  const apiKey = Deno.env.get("LUMA_API_KEY");
  if (!apiKey) throw new Error("LUMA_API_KEY not configured");
  const resp = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `Poll error`);
  const status = data.state === "completed" ? "SUCCESS" : data.state === "failed" ? "FAILED" : "IN_PROGRESS";
  return { task_id: data.id, status, video_url: data.assets?.video || null, error_message: data.failure_reason };
}

// ─── Main handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const provider = url.searchParams.get("provider") || "runway";

    // ── Video create ──
    if (action === "create") {
      const body = await req.json();
      if (!body.prompt && !body.text) throw new Error("prompt is required");
      let result: any;
      switch (provider) {
        case "runway": result = await runwayCreate(body); break;
        case "seedance": result = await seedanceCreate(body); break;
        case "kling": result = await klingCreate(body); break;
        case "huggingface": result = await huggingfaceCreate(body); break;
        case "replicate": result = await replicateCreate(body); break;
        case "luma": result = await lumaCreate(body); break;
        default: throw new Error(`Unknown provider: ${provider}`);
      }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Poll ──
    if (action === "poll") {
      const taskId = url.searchParams.get("task_id");
      const taskType = url.searchParams.get("task_type") || "text2video";
      if (!taskId) throw new Error("task_id is required");
      let result: any;
      switch (provider) {
        case "runway": result = await runwayPoll(taskId); break;
        case "seedance": result = await seedancePoll(taskId); break;
        case "kling": result = await klingPoll(taskId, taskType); break;
        case "replicate": result = await replicatePoll(taskId); break;
        case "luma": result = await lumaPoll(taskId); break;
        case "huggingface": result = { status: "SUCCESS", error_message: "HuggingFace returns directly" }; break;
        default: throw new Error(`Unknown provider: ${provider}`);
      }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Runway audio actions (TTS, STS, SFX, Voice Isolation, Dubbing) ──
    if (action === "audio") {
      const body = await req.json();
      const result = await runwayAudioCreate(body);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Runway image generation ──
    if (action === "image") {
      const body = await req.json();
      if (!body.prompt) throw new Error("prompt is required");
      const result = await runwayImageCreate(body);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Check which providers have keys configured ──
    if (action === "providers") {
      const providers = {
        runway: !!Deno.env.get("RUNWAY_API_KEY"),
        seedance: !!Deno.env.get("SEEDANCE_API_KEY"),
        kling: !!(Deno.env.get("KLING_ACCESS_KEY") && Deno.env.get("KLING_SECRET_KEY")),
        huggingface: !!Deno.env.get("HUGGINGFACE_API_KEY"),
        replicate: !!Deno.env.get("REPLICATE_API_KEY"),
        luma: !!Deno.env.get("LUMA_API_KEY"),
      };
      return new Response(JSON.stringify(providers), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=create|poll|audio|image|providers" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("video-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

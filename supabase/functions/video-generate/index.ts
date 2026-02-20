import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// ─── Provider handlers ───

async function seedanceCreate(body: any) {
  const apiKey = Deno.env.get("SEEDANCE_API_KEY");
  if (!apiKey) throw new Error("SEEDANCE_API_KEY not configured");
  const reqBody: any = {
    prompt: body.prompt,
    duration: String(body.duration || "8"),
    aspect_ratio: body.aspect_ratio || "16:9",
    resolution: body.resolution || "720p",
  };
  if (body.generate_audio) reqBody.generate_audio = true;
  if (body.fixed_lens) reqBody.fixed_lens = true;
  if (body.image_url) reqBody.image_urls = [body.image_url];

  const resp = await fetch("https://seedanceapi.org/v1/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(reqBody),
  });
  const data = await resp.json();
  if (!resp.ok || data.code !== 200) throw new Error(data.message || `Seedance error (${resp.status})`);
  return { task_id: data.data?.task_id, status: data.data?.status, provider: "seedance" };
}

async function seedancePoll(taskId: string) {
  const apiKey = Deno.env.get("SEEDANCE_API_KEY");
  if (!apiKey) throw new Error("SEEDANCE_API_KEY not configured");
  const resp = await fetch(`https://seedanceapi.org/v1/status?task_id=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await resp.json();
  if (!resp.ok || data.code !== 200) throw new Error(data.message || `Poll error`);
  const td = data.data;
  return {
    task_id: td?.task_id, status: td?.status,
    video_url: td?.status === "SUCCESS" && td?.response?.length ? td.response[0] : null,
    error_message: td?.error_message,
  };
}

async function klingCreate(body: any) {
  const ak = Deno.env.get("KLING_ACCESS_KEY");
  const sk = Deno.env.get("KLING_SECRET_KEY");
  if (!ak || !sk) throw new Error("Kling API keys not configured");
  const token = await generateKlingJWT(ak, sk);
  const endpoint = body.image_url
    ? "https://api.klingai.com/v1/videos/image2video"
    : "https://api.klingai.com/v1/videos/text2video";
  const reqBody: any = {
    prompt: body.prompt,
    duration: String(body.duration || "5"),
    aspect_ratio: body.aspect_ratio || "16:9",
    model_name: body.model_name || "kling-v2-master",
    mode: body.mode || "std",
  };
  if (body.image_url) reqBody.image = body.image_url;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(reqBody),
  });
  const data = await resp.json();
  if (!resp.ok || data.code !== 0) throw new Error(data.message || `Kling error (${resp.status})`);
  return { task_id: data.data?.task_id, status: data.data?.task_status, provider: "kling", task_type: body.image_url ? "image2video" : "text2video" };
}

async function klingPoll(taskId: string, taskType: string) {
  const ak = Deno.env.get("KLING_ACCESS_KEY");
  const sk = Deno.env.get("KLING_SECRET_KEY");
  if (!ak || !sk) throw new Error("Kling API keys not configured");
  const token = await generateKlingJWT(ak, sk);
  const resp = await fetch(`https://api.klingai.com/v1/videos/${taskType || "text2video"}/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || data.code !== 0) throw new Error(data.message || `Poll error`);
  const td = data.data;
  return {
    task_id: td?.task_id,
    status: td?.task_status === "succeed" ? "SUCCESS" : td?.task_status === "failed" ? "FAILED" : "IN_PROGRESS",
    video_url: td?.task_status === "succeed" && td?.task_result?.videos?.length ? td.task_result.videos[0].url : null,
    error_message: td?.task_status_msg,
  };
}

async function huggingfaceCreate(body: any) {
  const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not configured");
  const model = body.model_name || "Lightricks/LTX-Video-0.9.8-13B-distilled";
  const resp = await fetch(`https://router.huggingface.co/fal-ai/fal-ai/${encodeURIComponent(model)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      inputs: body.prompt,
      parameters: { num_frames: Math.min((body.duration || 4) * 8, 97), guidance_scale: 7.5 },
    }),
  });
  if (resp.ok) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("video") || ct.includes("octet")) {
      // Direct binary response - not async
      const blob = await resp.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
      return { task_id: "hf_direct", status: "SUCCESS", video_data: b64, provider: "huggingface" };
    }
    const data = await resp.json();
    if (data.video) return { task_id: "hf_direct", status: "SUCCESS", video_url: data.video, provider: "huggingface" };
    if (data.error) throw new Error(data.error);
    // Might return estimated_time for queued request
    return { task_id: "hf_queued", status: "IN_PROGRESS", estimated_time: data.estimated_time, provider: "huggingface" };
  }
  const err = await resp.text();
  throw new Error(`HuggingFace error (${resp.status}): ${err}`);
}

async function replicateCreate(body: any) {
  const apiKey = Deno.env.get("REPLICATE_API_KEY");
  if (!apiKey) throw new Error("REPLICATE_API_KEY not configured");
  const model = body.model_name || "minimax/video-01-live";
  const input: any = { prompt: body.prompt };
  if (body.image_url) input.first_frame_image = body.image_url;
  if (body.duration) input.prompt_optimizer = true;

  // Use the models endpoint (owner/name) to avoid needing a version hash
  const resp = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "Prefer": "wait" },
    body: JSON.stringify({ input }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `Replicate error (${resp.status})`);
  const output = typeof data.output === "string" ? data.output : data.output?.[0] || null;
  return { task_id: data.id, status: data.status === "succeeded" ? "SUCCESS" : "IN_PROGRESS", video_url: output, provider: "replicate", poll_url: data.urls?.get };
}

async function replicatePoll(taskId: string) {
  const apiKey = Deno.env.get("REPLICATE_API_KEY");
  if (!apiKey) throw new Error("REPLICATE_API_KEY not configured");
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `Poll error`);
  const status = data.status === "succeeded" ? "SUCCESS" : data.status === "failed" || data.status === "canceled" ? "FAILED" : "IN_PROGRESS";
  return { task_id: data.id, status, video_url: data.output?.[0] || null, error_message: data.error };
}

async function lumaCreate(body: any) {
  const apiKey = Deno.env.get("LUMA_API_KEY");
  if (!apiKey) throw new Error("LUMA_API_KEY not configured");
  const reqBody: any = {
    prompt: body.prompt,
    aspect_ratio: body.aspect_ratio || "16:9",
    loop: false,
  };
  if (body.image_url) {
    reqBody.keyframes = { frame0: { type: "image", url: body.image_url } };
  }

  const resp = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(reqBody),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || data.message || `Luma error (${resp.status})`);
  return { task_id: data.id, status: data.state === "completed" ? "SUCCESS" : "IN_PROGRESS", video_url: data.assets?.video || null, provider: "luma" };
}

async function lumaPoll(taskId: string) {
  const apiKey = Deno.env.get("LUMA_API_KEY");
  if (!apiKey) throw new Error("LUMA_API_KEY not configured");
  const resp = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `Poll error`);
  const status = data.state === "completed" ? "SUCCESS" : data.state === "failed" ? "FAILED" : "IN_PROGRESS";
  return { task_id: data.id, status, video_url: data.assets?.video || null, error_message: data.failure_reason };
}

async function runwayCreate(body: any) {
  const apiKey = Deno.env.get("RUNWAY_API_KEY");
  if (!apiKey) throw new Error("RUNWAY_API_KEY not configured");
  const reqBody: any = {
    promptText: body.prompt,
    model: body.model_name || "gen4_turbo",
    duration: body.duration || 5,
    ratio: (body.aspect_ratio || "16:9").replace(":", ":"),
  };
  if (body.image_url) reqBody.promptImage = body.image_url;

  const resp = await fetch("https://api.dev.runwayml.com/v1/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    body: JSON.stringify(reqBody),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Runway error (${resp.status})`);
  return { task_id: data.id, status: "IN_PROGRESS", provider: "runway" };
}

async function runwayPoll(taskId: string) {
  const apiKey = Deno.env.get("RUNWAY_API_KEY");
  if (!apiKey) throw new Error("RUNWAY_API_KEY not configured");
  const resp = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Poll error`);
  const status = data.status === "SUCCEEDED" ? "SUCCESS" : data.status === "FAILED" ? "FAILED" : "IN_PROGRESS";
  return { task_id: data.id, status, video_url: data.output?.[0] || null, error_message: data.failure };
}

// ─── Main handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const provider = url.searchParams.get("provider") || "seedance";

    if (action === "create") {
      const body = await req.json();
      if (!body.prompt) throw new Error("prompt is required");

      let result: any;
      switch (provider) {
        case "seedance": result = await seedanceCreate(body); break;
        case "kling": result = await klingCreate(body); break;
        case "huggingface": result = await huggingfaceCreate(body); break;
        case "replicate": result = await replicateCreate(body); break;
        case "luma": result = await lumaCreate(body); break;
        case "runway": result = await runwayCreate(body); break;
        default: throw new Error(`Unknown provider: ${provider}`);
      }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "poll") {
      const taskId = url.searchParams.get("task_id");
      const taskType = url.searchParams.get("task_type") || "text2video";
      if (!taskId) throw new Error("task_id is required");

      let result: any;
      switch (provider) {
        case "seedance": result = await seedancePoll(taskId); break;
        case "kling": result = await klingPoll(taskId, taskType); break;
        case "replicate": result = await replicatePoll(taskId); break;
        case "luma": result = await lumaPoll(taskId); break;
        case "runway": result = await runwayPoll(taskId); break;
        case "huggingface": result = { status: "SUCCESS", error_message: "HuggingFace returns directly, no polling needed" }; break;
        default: throw new Error(`Unknown provider: ${provider}`);
      }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Check which providers have keys configured ──
    if (action === "providers") {
      const providers = {
        seedance: !!Deno.env.get("SEEDANCE_API_KEY"),
        kling: !!(Deno.env.get("KLING_ACCESS_KEY") && Deno.env.get("KLING_SECRET_KEY")),
        huggingface: !!Deno.env.get("HUGGINGFACE_API_KEY"),
        replicate: !!Deno.env.get("REPLICATE_API_KEY"),
        luma: !!Deno.env.get("LUMA_API_KEY"),
        runway: !!Deno.env.get("RUNWAY_API_KEY"),
      };
      return new Response(JSON.stringify(providers), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=create|poll|providers" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("video-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KLING_API_BASE = "https://api.klingai.com";

// Generate JWT token for Kling API authentication
async function generateJWT(accessKey: string, secretKey: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,
    iat: now,
  };

  const encode = (obj: any) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${data}.${sigB64}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const accessKey = Deno.env.get("KLING_ACCESS_KEY");
    const secretKey = Deno.env.get("KLING_SECRET_KEY");
    if (!accessKey || !secretKey) throw new Error("Kling API keys not configured");

    const token = await generateJWT(accessKey, secretKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ---- ACTION: create (submit text-to-video task) ----
    if (action === "create") {
      const body = await req.json();
      const { prompt, duration, aspect_ratio, model_name, mode, image_url } = body;

      if (!prompt) throw new Error("prompt is required");

      const endpoint = image_url
        ? `${KLING_API_BASE}/v1/videos/image2video`
        : `${KLING_API_BASE}/v1/videos/text2video`;

      const requestBody: any = {
        prompt,
        duration: String(duration || "5"),
        aspect_ratio: aspect_ratio || "16:9",
        model_name: model_name || "kling-v1-6",
        mode: mode || "std",
      };

      if (image_url) {
        requestBody.image = image_url;
      }

      console.log("Kling create task:", endpoint, JSON.stringify(requestBody));

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await resp.json();
      console.log("Kling create response:", resp.status, JSON.stringify(data));

      if (!resp.ok || data.code !== 0) {
        throw new Error(data.message || `Kling API error (${resp.status}): ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({
        task_id: data.data?.task_id,
        task_status: data.data?.task_status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: poll (check task status) ----
    if (action === "poll") {
      const taskId = url.searchParams.get("task_id");
      const taskType = url.searchParams.get("type") || "text2video";
      if (!taskId) throw new Error("task_id is required");

      const endpoint = `${KLING_API_BASE}/v1/videos/${taskType}/${taskId}`;
      const resp = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      const data = await resp.json();

      if (!resp.ok || data.code !== 0) {
        throw new Error(data.message || `Poll error (${resp.status})`);
      }

      const taskData = data.data;
      const result: any = {
        task_id: taskData?.task_id,
        task_status: taskData?.task_status,
        task_status_msg: taskData?.task_status_msg || "",
      };

      // If completed, extract video URL
      if (taskData?.task_status === "succeed" && taskData?.task_result?.videos?.length) {
        result.video_url = taskData.task_result.videos[0].url;
        result.video_duration = taskData.task_result.videos[0].duration;
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=create|poll" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kling-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

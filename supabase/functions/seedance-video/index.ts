import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEEDANCE_BASE = "https://seedanceapi.org/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("SEEDANCE_API_KEY");
    if (!apiKey) throw new Error("SEEDANCE_API_KEY not configured");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ---- ACTION: create ----
    if (action === "create") {
      const body = await req.json();
      const { prompt, duration, aspect_ratio, resolution, generate_audio, fixed_lens, image_url } = body;

      if (!prompt) throw new Error("prompt is required");

      const requestBody: any = {
        prompt,
        duration: String(duration || "8"),
        aspect_ratio: aspect_ratio || "9:16",
        resolution: resolution || "720p",
      };

      if (generate_audio) requestBody.generate_audio = true;
      if (fixed_lens) requestBody.fixed_lens = true;
      if (image_url) requestBody.image_urls = [image_url];

      console.log("Seedance create:", JSON.stringify(requestBody));

      const resp = await fetch(`${SEEDANCE_BASE}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await resp.json();
      console.log("Seedance create response:", resp.status, JSON.stringify(data));

      if (!resp.ok || data.code !== 200) {
        throw new Error(data.message || `Seedance API error (${resp.status}): ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({
        task_id: data.data?.task_id,
        status: data.data?.status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: poll ----
    if (action === "poll") {
      const taskId = url.searchParams.get("task_id");
      if (!taskId) throw new Error("task_id is required");

      const resp = await fetch(`${SEEDANCE_BASE}/status?task_id=${encodeURIComponent(taskId)}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      const data = await resp.json();

      if (!resp.ok || data.code !== 200) {
        throw new Error(data.message || `Poll error (${resp.status})`);
      }

      const taskData = data.data;
      const result: any = {
        task_id: taskData?.task_id,
        status: taskData?.status,
        consumed_credits: taskData?.consumed_credits,
        error_message: taskData?.error_message || null,
      };

      // If completed, extract video URL
      if (taskData?.status === "SUCCESS" && taskData?.response?.length) {
        result.video_url = taskData.response[0];
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=create|poll" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seedance-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REDDIT_API = "https://oauth.reddit.com";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "reddit")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Reddit not connected for this account");
  return data;
}

async function redditFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${REDDIT_API}${endpoint}`;
  const opts: any = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": "OZC-Agency-Hub/1.0",
      "Content-Type": "application/json",
    },
  };
  if (body && method !== "GET") {
    if (typeof body === "string") {
      opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
      opts.body = body;
    } else {
      opts.body = JSON.stringify(body);
    }
  }
  const resp = await fetch(url, opts);
  const data = await resp.json();
  if (data.error) throw new Error(`Reddit API: ${data.error} - ${data.message || ""}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, params } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: any;

    switch (action) {
      // ===== OAUTH2 TOKEN EXCHANGE =====
      case "exchange_code": {
        const { code, client_id, client_secret, redirect_uri } = params;
        if (!code || !client_id || !client_secret) throw new Error("Missing code, client_id, or client_secret");
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`,
            "User-Agent": "OZC-Agency-Hub/1.0",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirect_uri || "",
          }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Token exchange failed: ${tokenData.error}`);
        result = tokenData;
        return new Response(JSON.stringify({ success: true, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== GET PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        const token = params?.access_token_override || conn.access_token;
        result = await redditFetch("/api/v1/me", token);
        break;
      }

      // ===== GET USER POSTS =====
      case "get_posts": {
        const conn = await getConnection(supabase, account_id);
        const username = conn.platform_username;
        result = await redditFetch(`/user/${username}/submitted?limit=${params?.limit || 25}&sort=new`, conn.access_token);
        break;
      }

      // ===== SUBMIT POST =====
      case "submit_post": {
        const conn = await getConnection(supabase, account_id);
        const formData = new URLSearchParams({
          api_type: "json",
          kind: params.kind || "self",
          sr: params.subreddit,
          title: params.title,
          ...(params.text ? { text: params.text } : {}),
          ...(params.url ? { url: params.url } : {}),
        }).toString();
        result = await redditFetch("/api/submit", conn.access_token, "POST", formData);
        break;
      }

      // ===== GET KARMA =====
      case "get_karma": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch("/api/v1/me/karma", conn.access_token);
        break;
      }

      // ===== SEARCH =====
      case "search": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await redditFetch(`/search?q=${q}&limit=${params?.limit || 10}&sort=relevance&type=link`, conn.access_token);
        break;
      }

      // ===== GET SUBREDDIT INFO =====
      case "get_subreddit": {
        const conn = await getConnection(supabase, account_id);
        result = await redditFetch(`/r/${params.subreddit}/about`, conn.access_token);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("reddit-api error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

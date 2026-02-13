import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const X_API_URL = "https://api.x.com/2";

async function getConnection(supabase: any, accountId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", "twitter")
    .eq("is_connected", true)
    .single();
  if (!data?.access_token) throw new Error("Twitter/X not connected for this account");
  return data;
}

async function xFetch(endpoint: string, token: string, method = "GET", body?: any) {
  const url = endpoint.startsWith("http") ? endpoint : `${X_API_URL}${endpoint}`;
  const opts: any = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  const data = await resp.json();
  if (data.errors) throw new Error(`X API: ${JSON.stringify(data.errors)}`);
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
        const { code, client_id, client_secret, redirect_uri, code_verifier } = params;
        if (!code || !client_id) throw new Error("Missing code or client_id");
        const basicAuth = btoa(`${client_id}:${client_secret}`);
        const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            code,
            grant_type: "authorization_code",
            redirect_uri: redirect_uri || "",
            code_verifier: code_verifier || "challenge",
            client_id,
          }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
        result = tokenData;
        return new Response(JSON.stringify({ success: true, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== GET USER PROFILE =====
      case "get_profile": {
        const conn = await getConnection(supabase, account_id);
        const token = params?.access_token_override || conn.access_token;
        result = await xFetch("/users/me?user.fields=id,name,username,profile_image_url,description,public_metrics,verified,created_at", token);
        break;
      }

      // ===== GET USER TWEETS =====
      case "get_tweets": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/tweets?max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,text`, conn.access_token);
        break;
      }

      // ===== POST TWEET =====
      case "create_tweet": {
        const conn = await getConnection(supabase, account_id);
        result = await xFetch("/tweets", conn.access_token, "POST", { text: params.text });
        break;
      }

      // ===== GET FOLLOWERS =====
      case "get_followers": {
        const conn = await getConnection(supabase, account_id);
        const userId = conn.platform_user_id;
        result = await xFetch(`/users/${userId}/followers?max_results=${params?.limit || 100}&user.fields=name,username,profile_image_url,public_metrics`, conn.access_token);
        break;
      }

      // ===== SEARCH TWEETS =====
      case "search": {
        const conn = await getConnection(supabase, account_id);
        const q = encodeURIComponent(params.query);
        result = await xFetch(`/tweets/search/recent?query=${q}&max_results=${params?.limit || 10}&tweet.fields=created_at,public_metrics,author_id`, conn.access_token);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("twitter-api error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

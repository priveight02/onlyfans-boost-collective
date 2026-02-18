import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Rate limiting state (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // max requests per minute per key

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(message: string, status = 400) { return json({ error: message }, status); }

function checkRateLimit(keyId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return false;
  return true;
}

async function authenticateAdmin(req: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Try X-API-Key header first (for playground/external usage)
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (apiKey) {
    // ── STRICT: Only admin keys (ozc_ak_live_) are accepted ──
    if (apiKey.startsWith("ozc_sk_live_") || apiKey.startsWith("ozc_pk_live_")) {
      return {
        error: "Access denied. This is a protected administrative endpoint. Standard user API keys (ozc_sk_live_ / ozc_pk_live_) cannot access administrative resources. If you believe this is an error, please contact support at support@ozcagency.com.",
        user: null,
        keyId: null,
      };
    }

    if (!apiKey.startsWith("ozc_ak_live_")) {
      return {
        error: "Invalid API key format. Administrative endpoints require an Admin API key (ozc_ak_live_...).",
        user: null,
        keyId: null,
      };
    }

    // Hash the provided key and look it up
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .maybeSingle();

    if (keyError || !keyData) return { error: "Invalid or revoked API key.", user: null, keyId: null };

    // Check expiry
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { error: "API key has expired. Please generate a new admin key.", user: null, keyId: null };
    }

    // Verify key is actually an admin-type key via metadata
    const keyType = keyData.metadata?.key_type;
    if (keyType !== "admin") {
      return {
        error: "Access denied. This key does not have administrative privileges. Only keys explicitly created as Admin keys can access this API.",
        user: null,
        keyId: null,
      };
    }

    // Check rate limit for this key
    if (!checkRateLimit(keyData.id)) {
      return { error: "Rate limit exceeded. Maximum 120 requests per minute. Please wait and try again.", user: null, keyId: null };
    }

    // Check admin role for the key owner
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", keyData.user_id).eq("role", "admin").maybeSingle();
    if (!roleData) return { error: "Unauthorized: The owner of this API key does not have admin privileges.", user: null, keyId: null };

    // Update usage stats
    await supabase.from("api_keys").update({
      last_used_at: new Date().toISOString(),
      requests_today: (keyData.requests_today || 0) + 1,
      requests_total: (keyData.requests_total || 0) + 1,
    }).eq("id", keyData.id);

    // Get the user
    const { data: userData } = await supabase.auth.admin.getUserById(keyData.user_id);
    return { error: null, user: userData?.user || { id: keyData.user_id }, supabase, keyId: keyData.id };
  }

  // Fallback to Bearer token auth (for internal admin panel usage)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: "Authentication required. Provide an Admin API key via X-API-Key header (ozc_ak_live_...) or a valid Bearer token.",
      user: null,
      keyId: null,
    };
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: "Invalid or expired authentication token.", user: null, keyId: null };
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleData) return { error: "Unauthorized: Admin access required. If you believe this is an error, please contact support.", user: null, keyId: null };
  return { error: null, user, supabase, keyId: null };
}

function parseRoute(url: URL) {
  const path = url.pathname.replace(/^\/admin-api\/?/, "").replace(/^v1\/?/, "");
  const segments = path.split("/").filter(Boolean);
  return { resource: segments[0] || "", id: segments[1] || null, sub: segments[2] || null, params: Object.fromEntries(url.searchParams) };
}

// Helper for simple CRUD on a table
function makeCrud(table: string, orderBy = "created_at", orderAsc = false) {
  return async (method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) => {
    if (method === "GET" && !id) {
      let q = supabase.from(table).select("*").order(orderBy, { ascending: orderAsc });
      for (const [key, val] of Object.entries(params)) {
        if (key === "limit") { q = q.limit(parseInt(val)); continue; }
        if (key === "offset") { q = q.range(parseInt(val), parseInt(val) + parseInt(params.limit || "50") - 1); continue; }
        if (key === "search") continue;
        q = q.eq(key, val);
      }
      const { data, error } = await q;
      if (error) return err(error.message, 500);
      return json({ data, count: data?.length || 0 });
    }
    if (method === "GET" && id) {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) return err(error.message, 404);
      return json({ data });
    }
    if (method === "POST" && !id) {
      const items = Array.isArray(body) ? body : [body];
      const { data, error } = items.length === 1
        ? await supabase.from(table).insert(items[0]).select().single()
        : await supabase.from(table).insert(items).select();
      if (error) return err(error.message, 500);
      return json({ data }, 201);
    }
    if (method === "PATCH" && id) {
      const { data, error } = await supabase.from(table).update(body).eq("id", id).select().single();
      if (error) return err(error.message, 500);
      return json({ data });
    }
    if (method === "DELETE" && id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return err(error.message, 500);
      return json({ message: `Deleted from ${table}` });
    }
    return err(`Invalid ${table} endpoint`, 404);
  };
}

// ─── CUSTOM HANDLERS ────────────────────────────────────

async function handleAccounts(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("managed_accounts").select("*").order("created_at", { ascending: false });
    if (params.status) q = q.eq("status", params.status);
    if (params.tier) q = q.eq("tier", params.tier);
    if (params.search) q = q.or(`username.ilike.%${params.search}%,display_name.ilike.%${params.search}%`);
    if (params.limit) q = q.limit(parseInt(params.limit));
    if (params.offset) q = q.range(parseInt(params.offset), parseInt(params.offset) + parseInt(params.limit || "50") - 1);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data, count: data?.length || 0 });
  }
  if (method === "GET" && id && !sub) {
    const { data, error } = await supabase.from("managed_accounts").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  const subHandlers: Record<string, string> = {
    activities: "account_activities", conversations: "ai_dm_conversations", scripts: "scripts",
    personas: "persona_profiles", fans: "fan_emotional_profiles", financials: "financial_records",
    "auto-respond": "auto_respond_state", threads: "message_threads", keywords: "ai_keyword_delays",
  };
  if (method === "GET" && id && sub && subHandlers[sub]) {
    let q = supabase.from(subHandlers[sub]).select("*").eq("account_id", id).order("created_at", { ascending: false });
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("managed_accounts").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("managed_accounts").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("managed_accounts").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Account deleted" });
  }
  return err("Invalid accounts endpoint", 404);
}

async function handleScripts(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("scripts").select("*, script_steps(*)").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.status) q = q.eq("status", params.status);
    if (params.category) q = q.eq("category", params.category);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "steps") {
    const { data, error } = await supabase.from("script_steps").select("*").eq("script_id", id).order("step_order");
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("scripts").select("*, script_steps(*)").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { steps, ...scriptBody } = body;
    const { data: script, error } = await supabase.from("scripts").insert(scriptBody).select().single();
    if (error) return err(error.message, 500);
    if (steps?.length) {
      const stepsWithId = steps.map((s: any, i: number) => ({ ...s, script_id: script.id, step_order: i }));
      await supabase.from("script_steps").insert(stepsWithId);
    }
    return json({ data: script }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("scripts").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    await supabase.from("script_steps").delete().eq("script_id", id);
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Script deleted" });
  }
  return err("Invalid scripts endpoint", 404);
}

async function handleConversations(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("ai_dm_conversations").select("*").order("last_message_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.platform) q = q.eq("platform", params.platform);
    if (params.status) q = q.eq("status", params.status);
    if (params.folder) q = q.eq("folder", params.folder);
    if (params.ai_enabled) q = q.eq("ai_enabled", params.ai_enabled === "true");
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "messages") {
    const { data, error } = await supabase.from("ai_dm_messages").select("*").eq("conversation_id", id).order("created_at").limit(parseInt(params.limit || "200"));
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("ai_dm_conversations").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && id && sub === "messages") {
    const { data, error } = await supabase.from("ai_dm_messages").insert({ ...body, conversation_id: id }).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("ai_dm_conversations").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("ai_dm_conversations").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    await supabase.from("ai_dm_messages").delete().eq("conversation_id", id);
    const { error } = await supabase.from("ai_dm_conversations").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Conversation deleted" });
  }
  return err("Invalid conversations endpoint", 404);
}

async function handleFollowers(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("fetched_followers").select("*").order("fetched_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.source) q = q.eq("source", params.source);
    if (params.gender) q = q.eq("gender", params.gender);
    if (params.search) q = q.or(`username.ilike.%${params.search}%,full_name.ilike.%${params.search}%`);
    if (params.limit) q = q.limit(parseInt(params.limit));
    if (params.offset) q = q.range(parseInt(params.offset), parseInt(params.offset) + parseInt(params.limit || "100") - 1);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data, count: data?.length || 0 });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("fetched_followers").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const items = Array.isArray(body) ? body : [body];
    const { data, error } = await supabase.from("fetched_followers").upsert(items, { onConflict: "account_id,ig_user_id" }).select();
    if (error) return err(error.message, 500);
    return json({ data, count: data?.length || 0 }, 201);
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("fetched_followers").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Follower record deleted" });
  }
  return err("Invalid followers endpoint", 404);
}

async function handlePosts(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("user_posts").select("*").order("created_at", { ascending: false });
    if (params.user_id) q = q.eq("user_id", params.user_id);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "comments") {
    const { data, error } = await supabase.from("post_comments").select("*").eq("post_id", id).order("created_at");
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "likes") {
    const { data, error } = await supabase.from("post_likes").select("*").eq("post_id", id);
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "saves") {
    const { data, error } = await supabase.from("post_saves").select("*").eq("post_id", id);
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("user_posts").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("user_posts").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "DELETE" && id) {
    await supabase.from("post_comments").delete().eq("post_id", id);
    await supabase.from("post_likes").delete().eq("post_id", id);
    await supabase.from("post_saves").delete().eq("post_id", id);
    const { error } = await supabase.from("user_posts").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Post deleted" });
  }
  return err("Invalid posts endpoint", 404);
}

async function handleProfiles(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (params.search) q = q.or(`username.ilike.%${params.search}%,display_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("profiles").update(body).eq("user_id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid profiles endpoint", 404);
}

async function handleBioLinks(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("bio_links").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "clicks") {
    const { data, error } = await supabase.from("bio_link_clicks").select("*").eq("bio_link_id", id).order("created_at", { ascending: false }).limit(parseInt(params.limit || "100"));
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("bio_links").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("bio_links").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("bio_links").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("bio_links").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Bio link deleted" });
  }
  return err("Invalid bio-links endpoint", 404);
}

async function handleChatRooms(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    const { data, error } = await supabase.from("chat_rooms").select("*").order("updated_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "messages") {
    const { data, error } = await supabase.from("chat_messages").select("*").eq("room_id", id).order("created_at").limit(parseInt(params.limit || "200"));
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "members") {
    const { data, error } = await supabase.from("chat_room_members").select("*").eq("room_id", id);
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("chat_rooms").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("chat_rooms").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "POST" && id && sub === "messages") {
    const { data, error } = await supabase.from("chat_messages").insert({ ...body, room_id: id }).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "DELETE" && id) {
    await supabase.from("chat_messages").delete().eq("room_id", id);
    await supabase.from("chat_room_members").delete().eq("room_id", id);
    const { error } = await supabase.from("chat_rooms").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Chat room deleted" });
  }
  return err("Invalid chat-rooms endpoint", 404);
}

async function handleWallets(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    const { data, error } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("wallets").select("*").eq("user_id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("wallets").update(body).eq("user_id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid wallets endpoint", 404);
}

async function handleRanks(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("user_ranks").select("*").order("xp", { ascending: false });
    if (params.rank_tier) q = q.eq("rank_tier", params.rank_tier);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("user_ranks").select("*").eq("user_id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("user_ranks").update(body).eq("user_id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid ranks endpoint", 404);
}

async function handleStats(_m: string, _id: string | null, _s: string | null, _p: Record<string, string>, _b: any, supabase: any) {
  const tables = [
    "managed_accounts", "scripts", "ai_dm_conversations", "team_members", "automation_workflows",
    "content_calendar", "fan_emotional_profiles", "fetched_followers", "user_posts", "message_threads",
    "bio_links", "copilot_voices", "contracts", "persona_profiles", "ai_keyword_delays",
    "copilot_conversations", "copilot_generated_content", "financial_records",
  ];
  const results = await Promise.all(tables.map(t => supabase.from(t).select("id", { count: "exact", head: true })));
  const data: Record<string, number> = {};
  tables.forEach((t, i) => { data[`total_${t}`] = results[i].count || 0; });
  return json({ data });
}

// ─── ROUTER ─────────────────────────────────────────────

const ROUTES: Record<string, Function> = {
  // Core CRM
  accounts: handleAccounts,
  scripts: handleScripts,
  team: makeCrud("team_members"),
  contracts: makeCrud("contracts"),
  // AI & DM
  conversations: handleConversations,
  "dm-messages": makeCrud("ai_dm_messages"),
  "auto-respond": makeCrud("auto_respond_state"),
  keywords: makeCrud("ai_keyword_delays"),
  learnings: makeCrud("ai_learned_strategies", "updated_at"),
  "conversation-learnings": makeCrud("ai_conversation_learnings"),
  // Social & Discovery
  followers: handleFollowers,
  posts: handlePosts,
  "post-comments": makeCrud("post_comments"),
  "post-likes": makeCrud("post_likes"),
  "post-saves": makeCrud("post_saves"),
  follows: makeCrud("follow_requests"),
  ranks: handleRanks,
  // Persona & Psychology
  personas: makeCrud("persona_profiles"),
  fans: makeCrud("fan_emotional_profiles", "updated_at"),
  "consistency-checks": makeCrud("persona_consistency_checks"),
  // Content & Media
  content: makeCrud("content_calendar", "scheduled_at"),
  "bio-links": handleBioLinks,
  // Finance & Ops
  financials: makeCrud("financial_records"),
  wallets: handleWallets,
  "credit-packages": makeCrud("credit_packages", "sort_order", true),
  // Copilot & AI
  copilot: makeCrud("copilot_conversations", "updated_at"),
  "generated-content": makeCrud("copilot_generated_content"),
  voices: makeCrud("copilot_voices"),
  // Workflows & Automation
  workflows: makeCrud("automation_workflows"),
  // Communication
  "chat-rooms": handleChatRooms,
  threads: makeCrud("message_threads", "last_message_at"),
  // Analytics & Reporting
  analytics: makeCrud("social_analytics"),
  "site-visits": makeCrud("site_visits"),
  "profile-lookups": makeCrud("profile_lookup_history"),
  // Users & Security
  profiles: handleProfiles,
  "device-sessions": makeCrud("device_sessions", "last_active_at"),
  "login-activity": makeCrud("login_activity", "login_at"),
  "admin-logins": makeCrud("admin_login_attempts"),
  notifications: makeCrud("notification_preferences"),
  activities: makeCrud("account_activities"),
  // System
  stats: handleStats,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const { resource, id, sub, params } = parseRoute(url);

    if (resource === "" || resource === "health") {
      return json({
        status: "operational",
        version: "2.0.0",
        resources: Object.keys(ROUTES),
        total_resources: Object.keys(ROUTES).length,
        timestamp: new Date().toISOString(),
      });
    }

    const auth = await authenticateAdmin(req);
    if (auth.error) {
      // Determine appropriate status code
      const status = auth.error.includes("Access denied") || auth.error.includes("protected administrative") ? 403 : 401;
      return err(auth.error, status);
    }

    const handler = ROUTES[resource];
    if (!handler) return err(`Unknown resource: ${resource}. Available: ${Object.keys(ROUTES).join(", ")}`, 404);

    let body = null;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try { body = await req.json(); } catch { body = {}; }
    }

    return await handler(req.method, id, sub, params, body, auth.supabase);
  } catch (e) {
    console.error("API error:", e);
    return err(e instanceof Error ? e.message : "Internal server error", 500);
  }
});

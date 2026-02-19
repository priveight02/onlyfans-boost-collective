import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(message: string, status = 400) { return json({ error: message }, status); }

async function authenticateAdmin(req: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (apiKey) {
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

    if (keyError || !keyData) return { error: "Invalid or revoked API key", user: null };

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { error: "API key has expired", user: null };
    }

    // Determine if this is an admin key (no quotas) or user key (enforced quotas)
    const isAdminKey = ["uplyze_ak_live_", "ozc_ak_live_"].some((p) => keyData.key_prefix?.startsWith(p));

    if (!isAdminKey) {
      // Enforce daily limit for user keys (sk and pk): 100/day
      const dailyLimit = 100;
      if ((keyData.requests_today || 0) >= dailyLimit) {
        // Auto-pause the key
        await supabase.from("api_keys").update({ is_active: false, metadata: { ...((keyData as any).metadata || {}), paused_reason: "daily_limit_reached", paused_at: new Date().toISOString() } }).eq("id", keyData.id);
        return { error: `Daily quota exceeded (${dailyLimit}/day). Key auto-paused until tomorrow.`, user: null };
      }
    }

    // Check admin role for the key owner
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", keyData.user_id).eq("role", "admin").maybeSingle();
    if (!roleData) return { error: "Unauthorized: Admin access required", user: null };

    // Update usage stats
    await supabase.from("api_keys").update({
      last_used_at: new Date().toISOString(),
      requests_today: (keyData.requests_today || 0) + 1,
      requests_total: (keyData.requests_total || 0) + 1,
    }).eq("id", keyData.id);

    const { data: userData } = await supabase.auth.admin.getUserById(keyData.user_id);
    return { error: null, user: userData?.user || { id: keyData.user_id }, supabase };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Missing or invalid Authorization header. Provide X-API-Key or Bearer token.", user: null };
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: "Invalid or expired token", user: null };
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!roleData) return { error: "Unauthorized: Admin access required", user: null };
  return { error: null, user, supabase };
}

function parseRoute(url: URL) {
  const path = url.pathname.replace(/^\/admin-api\/?/, "").replace(/^v1\/?/, "");
  const segments = path.split("/").filter(Boolean);
  return { resource: segments[0] || "", id: segments[1] || null, sub: segments[2] || null, subId: segments[3] || null, params: Object.fromEntries(url.searchParams) };
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
    connections: "social_connections", "bio-links": "bio_links", content: "content_calendar",
    workflows: "automation_workflows",
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
  if (method === "POST" && id && sub === "members") {
    const { data, error } = await supabase.from("chat_room_members").insert({ ...body, room_id: id }).select().single();
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

async function handleWallets(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    const { data, error } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "transactions") {
    const { data, error } = await supabase.from("wallet_transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(parseInt(params.limit || "100"));
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

async function handleIncidents(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("incidents").select("*").order("created_at", { ascending: false });
    if (params.status) q = q.eq("status", params.status);
    if (params.severity) q = q.eq("severity", params.severity);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "updates") {
    const { data, error } = await supabase.from("incident_updates").select("*").eq("incident_id", id).order("created_at");
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data: incident, error } = await supabase.from("incidents").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    const { data: updates } = await supabase.from("incident_updates").select("*").eq("incident_id", id).order("created_at");
    return json({ data: { ...incident, updates: updates || [] } });
  }
  if (method === "POST" && id && sub === "updates") {
    const { data, error } = await supabase.from("incident_updates").insert({ ...body, incident_id: id }).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("incidents").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("incidents").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    await supabase.from("incident_updates").delete().eq("incident_id", id);
    const { error } = await supabase.from("incidents").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Incident deleted" });
  }
  return err("Invalid incidents endpoint", 404);
}

async function handleFeatureFlags(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    const { data, error } = await supabase.from("feature_flags").select("*, feature_flag_rules(*)").order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("feature_flags").select("*, feature_flag_rules(*)").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("feature_flags").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("feature_flags").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { data, error } = await supabase.from("feature_flags").update({ archived_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data, message: "Feature flag archived" });
  }
  return err("Invalid feature-flags endpoint", 404);
}

async function handleAuditLogs(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
    if (params.entity_type) q = q.eq("entity_type", params.entity_type);
    if (params.action) q = q.eq("action", params.action);
    if (params.actor_id) q = q.eq("actor_id", params.actor_id);
    if (params.from) q = q.gte("created_at", params.from);
    if (params.to) q = q.lte("created_at", params.to);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("audit_logs").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("audit_logs").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  return err("Invalid audit-logs endpoint", 404);
}

async function handleNotifications(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("admin_user_notifications").select("*").order("created_at", { ascending: false });
    if (params.user_id) q = q.eq("user_id", params.user_id);
    if (params.is_read) q = q.eq("is_read", params.is_read === "true");
    if (params.notification_type) q = q.eq("notification_type", params.notification_type);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "POST" && sub === "bulk") {
    const items = Array.isArray(body) ? body : body.notifications || [];
    const { data, error } = await supabase.from("admin_user_notifications").insert(items).select();
    if (error) return err(error.message, 500);
    return json({ data, count: data?.length || 0 }, 201);
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("admin_user_notifications").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("admin_user_notifications").update({ is_read: true, read_at: new Date().toISOString(), ...body }).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("admin_user_notifications").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Notification deleted" });
  }
  return err("Invalid notifications endpoint", 404);
}

async function handleWorkspace(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  // /workspace/invitations
  if (sub === "invitations" || (!id && !sub)) {
    // Treat resource as invitations
    const table = "workspace_invitations";
    if (method === "GET") {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) return err(error.message, 500);
      return json({ data });
    }
    if (method === "POST") {
      const { data, error } = await supabase.from(table).insert(body).select().single();
      if (error) return err(error.message, 500);
      return json({ data }, 201);
    }
    if (method === "DELETE" && id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return err(error.message, 500);
      return json({ message: "Invitation revoked" });
    }
  }
  if (sub === "onboarding-profiles") {
    const { data, error } = await supabase.from("admin_onboarding_profiles").select("*").order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid workspace endpoint. Use /workspace/invitations or /workspace/onboarding-profiles", 404);
}

async function handleApiKeys(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && id === "usage") {
    // Aggregated usage stats
    const { data: keys, error } = await supabase.from("api_keys").select("*");
    if (error) return err(error.message, 500);
    const totalKeys = keys?.length || 0;
    const activeKeys = keys?.filter((k: any) => k.is_active).length || 0;
    const totalReqs = keys?.reduce((s: number, k: any) => s + (Number(k.requests_total) || 0), 0) || 0;
    const todayReqs = keys?.reduce((s: number, k: any) => s + (k.requests_today || 0), 0) || 0;
    return json({ data: { total_keys: totalKeys, active_keys: activeKeys, total_requests: totalReqs, requests_today: todayReqs } });
  }
  if (method === "GET" && !id) {
    let q = supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    if (params.user_id) q = q.eq("user_id", params.user_id);
    if (params.is_active !== undefined) q = q.eq("is_active", params.is_active === "true");
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("api_keys").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && id === "grant") {
    // Grant a new API key to a user
    const { user_id, name, scopes, rate_limit_rpm, rate_limit_daily, key_type } = body;
    if (!user_id || !name) return err("user_id and name are required", 400);

    // Enforce user key limits: max 3 keys total, 1 active at a time (only for non-admin keys)
    const isAdmin = (key_type || "user") === "admin";
    if (!isAdmin) {
      const { data: existingKeys } = await supabase.from("api_keys").select("id, is_active").eq("user_id", user_id);
      const total = existingKeys?.length || 0;
      const active = existingKeys?.filter((k: any) => k.is_active).length || 0;
      if (total >= 3) return err("User already has maximum 3 API keys. Delete an old key first.", 400);
      if (active >= 1) {
        // Auto-deactivate existing active keys
        for (const k of (existingKeys || []).filter((k: any) => k.is_active)) {
          await supabase.from("api_keys").update({ is_active: false }).eq("id", k.id);
        }
      }
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const prefix = isAdmin ? "uplyze_ak_live_" : "uplyze_sk_live_";
    let rawKey = prefix;
    for (let i = 0; i < 40; i++) rawKey += chars.charAt(Math.floor(Math.random() * chars.length));
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data, error } = await supabase.from("api_keys").insert({
      user_id,
      name,
      key_prefix: rawKey.substring(0, 16),
      key_hash: keyHash,
      scopes: scopes || ["read"],
      rate_limit_rpm: isAdmin ? 0 : (rate_limit_rpm || 60),
      rate_limit_daily: isAdmin ? 0 : 100,
      metadata: { key_type: key_type || "user" },
    }).select().single();
    if (error) return err(error.message, 500);

    // Log history
    await supabase.from("api_key_history").insert({
      api_key_id: data.id,
      user_id,
      key_prefix: rawKey.substring(0, 16),
      key_name: name,
      key_type: key_type || "user",
      scopes: scopes || ["read"],
      action: "created",
      metadata: { granted_via: "admin-api" },
    });

    return json({ data: { ...data, raw_key: rawKey }, message: "Key granted. The raw_key will not be shown again." }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("api_keys").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { data: keyData } = await supabase.from("api_keys").select("*").eq("id", id).single();
    if (keyData) {
      await supabase.from("api_key_history").insert({
        api_key_id: id,
        user_id: keyData.user_id,
        key_prefix: keyData.key_prefix,
        key_name: keyData.name,
        key_type: (keyData as any).metadata?.key_type || "user",
        scopes: keyData.scopes,
        action: "revoked",
        metadata: { revoked_via: "admin-api" },
      });
    }
    const { error } = await supabase.from("api_keys").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "API key revoked" });
  }
  return err("Invalid api-keys endpoint", 404);
}

async function handleAiModels(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    const { data, error } = await supabase.from("ai_models").select("*").order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("ai_models").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("ai_models").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("ai_models").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("ai_models").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "AI model deleted" });
  }
  return err("Invalid ai-models endpoint", 404);
}

async function handleAiRequests(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && id === "stats") {
    const { data, error } = await supabase.from("ai_requests").select("*");
    if (error) return err(error.message, 500);
    const total = data?.length || 0;
    const flagged = data?.filter((r: any) => r.safety_flagged).length || 0;
    const totalCost = data?.reduce((s: number, r: any) => s + (r.cost_cents || 0), 0) || 0;
    const totalTokens = data?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) || 0;
    return json({ data: { total_requests: total, flagged_requests: flagged, total_cost_cents: totalCost, total_tokens: totalTokens } });
  }
  if (method === "GET" && !id) {
    let q = supabase.from("ai_requests").select("*").order("created_at", { ascending: false });
    if (params.model_id) q = q.eq("model_id", params.model_id);
    if (params.status) q = q.eq("status", params.status);
    if (params.safety_flagged) q = q.eq("safety_flagged", params.safety_flagged === "true");
    if (params.from) q = q.gte("created_at", params.from);
    if (params.to) q = q.lte("created_at", params.to);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("ai_requests").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  return err("Invalid ai-requests endpoint", 404);
}

async function handleSocialConnections(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("social_connections").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.platform) q = q.eq("platform", params.platform);
    if (params.is_connected) q = q.eq("is_connected", params.is_connected === "true");
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("social_connections").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST" && !id) {
    const { data, error } = await supabase.from("social_connections").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("social_connections").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("social_connections").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Social connection deleted" });
  }
  return err("Invalid social-connections endpoint", 404);
}

async function handleStats(_m: string, id: string | null, _s: string | null, _p: Record<string, string>, _b: any, supabase: any) {
  if (id === "credits") {
    const { data } = await supabase.from("wallets").select("balance, total_purchased, total_spent");
    const totalBalance = data?.reduce((s: number, w: any) => s + (w.balance || 0), 0) || 0;
    const totalPurchased = data?.reduce((s: number, w: any) => s + (w.total_purchased || 0), 0) || 0;
    const totalSpent = data?.reduce((s: number, w: any) => s + (w.total_spent || 0), 0) || 0;
    return json({ data: { total_balance: totalBalance, total_purchased: totalPurchased, total_spent: totalSpent, wallets: data?.length || 0 } });
  }
  if (id === "revenue") {
    const { data } = await supabase.from("financial_records").select("amount, record_type");
    const revenue = data?.filter((r: any) => r.record_type === "revenue").reduce((s: number, r: any) => s + (r.amount || 0), 0) || 0;
    const expenses = data?.filter((r: any) => r.record_type === "expense").reduce((s: number, r: any) => s + (r.amount || 0), 0) || 0;
    return json({ data: { total_revenue: revenue, total_expenses: expenses, net: revenue - expenses, records: data?.length || 0 } });
  }
  if (id === "ai-usage") {
    const { data } = await supabase.from("ai_requests").select("status, cost_cents, total_tokens, safety_flagged");
    return json({ data: {
      total_requests: data?.length || 0,
      completed: data?.filter((r: any) => r.status === "completed").length || 0,
      failed: data?.filter((r: any) => r.status === "failed").length || 0,
      flagged: data?.filter((r: any) => r.safety_flagged).length || 0,
      total_cost_cents: data?.reduce((s: number, r: any) => s + (r.cost_cents || 0), 0) || 0,
      total_tokens: data?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) || 0,
    } });
  }
  const tables = [
    "managed_accounts", "scripts", "ai_dm_conversations", "team_members", "automation_workflows",
    "content_calendar", "fan_emotional_profiles", "fetched_followers", "user_posts", "message_threads",
    "bio_links", "copilot_voices", "contracts", "persona_profiles", "ai_keyword_delays",
    "copilot_conversations", "copilot_generated_content", "financial_records", "api_keys",
    "incidents", "feature_flags", "audit_logs", "ai_models", "ai_requests",
  ];
  const results = await Promise.all(tables.map(t => supabase.from(t).select("id", { count: "exact", head: true })));
  const data: Record<string, number> = {};
  tables.forEach((t, i) => { data[`total_${t}`] = results[i].count || 0; });
  return json({ data });
}

async function handleSiteVisits(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && id === "stats") {
    const { data, error } = await supabase.from("site_visits").select("*");
    if (error) return err(error.message, 500);
    const total = data?.length || 0;
    const uniqueIps = new Set(data?.map((v: any) => v.visitor_id || v.ip_hash)).size;
    return json({ data: { total_visits: total, unique_visitors: uniqueIps } });
  }
  if (method === "GET" && !id) {
    let q = supabase.from("site_visits").select("*").order("created_at", { ascending: false });
    if (params.page_path) q = q.eq("page_path", params.page_path);
    if (params.from) q = q.gte("created_at", params.from);
    if (params.to) q = q.lte("created_at", params.to);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid site-visits endpoint", 404);
}

async function handleAdminSessions(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("admin_sessions").select("*").order("started_at", { ascending: false });
    if (params.is_active) q = q.eq("is_active", params.is_active === "true");
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("admin_sessions").update({ is_active: false, ended_at: new Date().toISOString(), end_reason: "terminated_by_admin" }).eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Session terminated" });
  }
  return err("Invalid admin-sessions endpoint", 404);
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
  "site-visits": handleSiteVisits,
  "profile-lookups": makeCrud("profile_lookup_history"),
  // Users & Security
  profiles: handleProfiles,
  "device-sessions": makeCrud("device_sessions", "last_active_at"),
  "login-activity": makeCrud("login_activity", "login_at"),
  "admin-logins": makeCrud("admin_login_attempts"),
  notifications: handleNotifications,
  activities: makeCrud("account_activities"),
  // System
  stats: handleStats,
  // ── NEW ROUTES (previously missing) ──
  "ai-models": handleAiModels,
  "ai-requests": handleAiRequests,
  "prompt-templates": makeCrud("prompt_templates", "created_at"),
  "safety-rules": makeCrud("safety_rules", "created_at"),
  "feature-flags": handleFeatureFlags,
  experiments: makeCrud("experiments"),
  "audit-logs": handleAuditLogs,
  incidents: handleIncidents,
  "admin-sessions": handleAdminSessions,
  "admin-actions": makeCrud("admin_user_actions"),
  workspace: handleWorkspace,
  "api-keys": handleApiKeys,
  "key-history": makeCrud("api_key_history"),
  // Social platform resources
  "social-connections": handleSocialConnections,
  "social-posts": makeCrud("social_posts"),
  "comment-replies": makeCrud("social_comment_replies"),
  "social-analytics": makeCrud("social_analytics"),
  "support-tickets": makeCrud("support_tickets"),
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const { resource, id, sub, params } = parseRoute(url);

    if (resource === "" || resource === "health") {
      return json({
        status: "operational",
        version: "2.1.0",
        resources: Object.keys(ROUTES),
        total_resources: Object.keys(ROUTES).length,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle workspace sub-routes specially
    if (resource === "workspace") {
      const auth = await authenticateAdmin(req);
      if (auth.error) return err(auth.error, 401);
      let body = null;
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        try { body = await req.json(); } catch { body = {}; }
      }
      return await handleWorkspace(req.method, id, sub || id, params, body, auth.supabase);
    }

    const auth = await authenticateAdmin(req);
    if (auth.error) return err(auth.error, 401);

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

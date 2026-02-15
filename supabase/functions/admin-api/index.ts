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
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

// Authenticate admin - requires valid JWT from admin user
async function authenticateAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", user: null };
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify JWT and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: "Invalid or expired token", user: null };
  }
  
  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  
  if (!roleData) {
    return { error: "Unauthorized: Admin access required", user: null };
  }
  
  return { error: null, user, supabase };
}

// Parse route: /admin-api/v1/{resource}/{id?}/{sub?}
function parseRoute(url: URL) {
  const path = url.pathname.replace(/^\/admin-api\/?/, "").replace(/^v1\/?/, "");
  const segments = path.split("/").filter(Boolean);
  return {
    resource: segments[0] || "",
    id: segments[1] || null,
    sub: segments[2] || null,
    params: Object.fromEntries(url.searchParams),
  };
}

// ─── HANDLERS ───────────────────────────────────────────

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
  if (method === "GET" && id && sub === "activities") {
    const { data, error } = await supabase.from("account_activities").select("*").eq("account_id", id).order("created_at", { ascending: false }).limit(parseInt(params.limit || "50"));
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "conversations") {
    const { data, error } = await supabase.from("ai_dm_conversations").select("*").eq("account_id", id).order("last_message_at", { ascending: false }).limit(parseInt(params.limit || "50"));
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "scripts") {
    const { data, error } = await supabase.from("scripts").select("*, script_steps(*)").eq("account_id", id).order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "personas") {
    const { data, error } = await supabase.from("persona_profiles").select("*").eq("account_id", id);
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "fans") {
    const { data, error } = await supabase.from("fan_emotional_profiles").select("*").eq("account_id", id).order("updated_at", { ascending: false }).limit(parseInt(params.limit || "100"));
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id && sub === "financials") {
    const { data, error } = await supabase.from("financial_records").select("*").eq("account_id", id).order("created_at", { ascending: false }).limit(parseInt(params.limit || "100"));
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

async function handleTeam(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    const { data, error } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("team_members").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("team_members").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("team_members").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Team member removed" });
  }
  return err("Invalid team endpoint", 404);
}

async function handleContracts(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("contracts").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.status) q = q.eq("status", params.status);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("contracts").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("contracts").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Contract deleted" });
  }
  return err("Invalid contracts endpoint", 404);
}

async function handleConversations(method: string, id: string | null, sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("ai_dm_conversations").select("*").order("last_message_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.platform) q = q.eq("platform", params.platform);
    if (params.status) q = q.eq("status", params.status);
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
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("ai_dm_conversations").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid conversations endpoint", 404);
}

async function handlePersonas(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("persona_profiles").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("persona_profiles").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("persona_profiles").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("persona_profiles").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("persona_profiles").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Persona deleted" });
  }
  return err("Invalid personas endpoint", 404);
}

async function handleFans(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("fan_emotional_profiles").select("*").order("updated_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.behavior_type) q = q.eq("behavior_type", params.behavior_type);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("fan_emotional_profiles").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("fan_emotional_profiles").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid fans endpoint", 404);
}

async function handleFinancials(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("financial_records").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.record_type) q = q.eq("record_type", params.record_type);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("financial_records").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("financial_records").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Record deleted" });
  }
  return err("Invalid financials endpoint", 404);
}

async function handleContent(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("content_calendar").select("*").order("scheduled_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.status) q = q.eq("status", params.status);
    if (params.platform) q = q.eq("platform", params.platform);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("content_calendar").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("content_calendar").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("content_calendar").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("content_calendar").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Content deleted" });
  }
  return err("Invalid content endpoint", 404);
}

async function handleWorkflows(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("automation_workflows").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.status) q = q.eq("status", params.status);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "GET" && id) {
    const { data, error } = await supabase.from("automation_workflows").select("*").eq("id", id).single();
    if (error) return err(error.message, 404);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("automation_workflows").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("automation_workflows").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("automation_workflows").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Workflow deleted" });
  }
  return err("Invalid workflows endpoint", 404);
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

async function handleKeywords(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET" && !id) {
    let q = supabase.from("ai_keyword_delays").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "POST") {
    const { data, error } = await supabase.from("ai_keyword_delays").insert(body).select().single();
    if (error) return err(error.message, 500);
    return json({ data }, 201);
  }
  if (method === "PATCH" && id) {
    const { data, error } = await supabase.from("ai_keyword_delays").update(body).eq("id", id).select().single();
    if (error) return err(error.message, 500);
    return json({ data });
  }
  if (method === "DELETE" && id) {
    const { error } = await supabase.from("ai_keyword_delays").delete().eq("id", id);
    if (error) return err(error.message, 500);
    return json({ message: "Keyword rule deleted" });
  }
  return err("Invalid keywords endpoint", 404);
}

async function handleAnalytics(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET") {
    let q = supabase.from("social_analytics").select("*").order("created_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.platform) q = q.eq("platform", params.platform);
    if (params.metric_type) q = q.eq("metric_type", params.metric_type);
    if (params.limit) q = q.limit(parseInt(params.limit));
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid analytics endpoint", 404);
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
  return err("Invalid chat-rooms endpoint", 404);
}

async function handleLearnings(method: string, id: string | null, _sub: string | null, params: Record<string, string>, body: any, supabase: any) {
  if (method === "GET") {
    let q = supabase.from("ai_learned_strategies").select("*").order("updated_at", { ascending: false });
    if (params.account_id) q = q.eq("account_id", params.account_id);
    if (params.behavior_type) q = q.eq("behavior_type", params.behavior_type);
    const { data, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data });
  }
  return err("Invalid learnings endpoint", 404);
}

async function handleStats(_method: string, _id: string | null, _sub: string | null, _params: Record<string, string>, _body: any, supabase: any) {
  const [accounts, scripts, conversations, team, workflows, content, fans] = await Promise.all([
    supabase.from("managed_accounts").select("id", { count: "exact", head: true }),
    supabase.from("scripts").select("id", { count: "exact", head: true }),
    supabase.from("ai_dm_conversations").select("id", { count: "exact", head: true }),
    supabase.from("team_members").select("id", { count: "exact", head: true }),
    supabase.from("automation_workflows").select("id", { count: "exact", head: true }),
    supabase.from("content_calendar").select("id", { count: "exact", head: true }),
    supabase.from("fan_emotional_profiles").select("id", { count: "exact", head: true }),
  ]);
  return json({
    data: {
      total_accounts: accounts.count || 0,
      total_scripts: scripts.count || 0,
      total_conversations: conversations.count || 0,
      total_team_members: team.count || 0,
      total_workflows: workflows.count || 0,
      total_content: content.count || 0,
      total_fans: fans.count || 0,
    },
  });
}

// ─── ROUTER ─────────────────────────────────────────────

const ROUTES: Record<string, Function> = {
  accounts: handleAccounts,
  scripts: handleScripts,
  team: handleTeam,
  contracts: handleContracts,
  conversations: handleConversations,
  personas: handlePersonas,
  fans: handleFans,
  financials: handleFinancials,
  content: handleContent,
  workflows: handleWorkflows,
  "bio-links": handleBioLinks,
  keywords: handleKeywords,
  analytics: handleAnalytics,
  wallets: handleWallets,
  profiles: handleProfiles,
  "chat-rooms": handleChatRooms,
  learnings: handleLearnings,
  stats: handleStats,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const { resource, id, sub, params } = parseRoute(url);

    // Health check
    if (resource === "" || resource === "health") {
      return json({
        status: "operational",
        version: "1.0.0",
        endpoints: Object.keys(ROUTES),
        timestamp: new Date().toISOString(),
      });
    }

    // Auth check
    const auth = await authenticateAdmin(req);
    if (auth.error) {
      return err(auth.error, 401);
    }

    const handler = ROUTES[resource];
    if (!handler) {
      return err(`Unknown resource: ${resource}. Available: ${Object.keys(ROUTES).join(", ")}`, 404);
    }

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

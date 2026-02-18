import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Code2, Copy, Check, Search, Globe, Lock, Zap, Database, ChevronDown, ChevronRight,
  Server, Shield, BookOpen, Terminal, Send, Loader2, Play, Key, Plus, Trash2, Eye,
  EyeOff, RefreshCw, AlertTriangle, Clock, BarChart3, Users, Settings, Ban, UserCheck,
  Edit, Save,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  params?: { name: string; type: string; required?: boolean; description: string }[];
  body?: { name: string; type: string; required?: boolean; description: string }[];
}

interface EndpointGroup {
  name: string;
  description: string;
  endpoints: Endpoint[];
}

// Admin-only endpoint groups
const ADMIN_API_GROUPS: EndpointGroup[] = [
  {
    name: "Wallets & Credits",
    description: "User credit wallets, grants, and deductions",
    endpoints: [
      { method: "GET", path: "/v1/wallets", description: "List all wallets" },
      { method: "GET", path: "/v1/wallets/:user_id", description: "Get wallet by user ID" },
      { method: "GET", path: "/v1/wallets/:user_id/transactions", description: "Get credit transaction history" },
      { method: "PATCH", path: "/v1/wallets/:user_id", description: "Update wallet balance" },
      { method: "POST", path: "/v1/wallets/:user_id/grant", description: "Grant credits to user" },
      { method: "POST", path: "/v1/wallets/:user_id/deduct", description: "Deduct credits from user" },
    ],
  },
  {
    name: "Credit Packages",
    description: "Credit package configuration and pricing",
    endpoints: [
      { method: "GET", path: "/v1/credit-packages", description: "List all credit packages" },
      { method: "POST", path: "/v1/credit-packages", description: "Create credit package" },
      { method: "PATCH", path: "/v1/credit-packages/:id", description: "Update package pricing/settings" },
      { method: "DELETE", path: "/v1/credit-packages/:id", description: "Deactivate credit package" },
    ],
  },
  {
    name: "AI Models & Config",
    description: "AI model registry, prompt templates, and safety rules",
    endpoints: [
      { method: "GET", path: "/v1/ai-models", description: "List all AI models" },
      { method: "GET", path: "/v1/ai-models/:id", description: "Get model details" },
      { method: "POST", path: "/v1/ai-models", description: "Register new AI model" },
      { method: "PATCH", path: "/v1/ai-models/:id", description: "Update model config or kill switch" },
      { method: "GET", path: "/v1/prompt-templates", description: "List prompt templates" },
      { method: "POST", path: "/v1/prompt-templates", description: "Create prompt template" },
      { method: "PATCH", path: "/v1/prompt-templates/:id", description: "Update template" },
      { method: "GET", path: "/v1/safety-rules", description: "List safety rules" },
      { method: "POST", path: "/v1/safety-rules", description: "Create safety rule" },
    ],
  },
  {
    name: "AI Requests Log",
    description: "AI request history, usage tracking, and cost monitoring",
    endpoints: [
      { method: "GET", path: "/v1/ai-requests", description: "List AI requests", params: [
        { name: "model_id", type: "uuid", description: "Filter by model" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "safety_flagged", type: "boolean", description: "Filter flagged requests" },
        { name: "from", type: "date", description: "From date" },
        { name: "to", type: "date", description: "To date" },
      ] },
      { method: "GET", path: "/v1/ai-requests/:id", description: "Get request details" },
      { method: "GET", path: "/v1/ai-requests/stats", description: "Get aggregated AI usage stats" },
    ],
  },
  {
    name: "Feature Flags",
    description: "Feature flags, targeting rules, and experiments",
    endpoints: [
      { method: "GET", path: "/v1/feature-flags", description: "List all feature flags" },
      { method: "GET", path: "/v1/feature-flags/:id", description: "Get flag with rules" },
      { method: "POST", path: "/v1/feature-flags", description: "Create feature flag" },
      { method: "PATCH", path: "/v1/feature-flags/:id", description: "Update flag (toggle, rollout %)" },
      { method: "DELETE", path: "/v1/feature-flags/:id", description: "Archive feature flag" },
      { method: "GET", path: "/v1/experiments", description: "List experiments" },
      { method: "POST", path: "/v1/experiments", description: "Create experiment" },
      { method: "PATCH", path: "/v1/experiments/:id", description: "Start/stop experiment" },
    ],
  },
  {
    name: "Audit Logs",
    description: "Complete audit trail for all system actions",
    endpoints: [
      { method: "GET", path: "/v1/audit-logs", description: "List audit logs", params: [
        { name: "entity_type", type: "string", description: "Filter by entity type" },
        { name: "action", type: "string", description: "Filter by action" },
        { name: "actor_id", type: "uuid", description: "Filter by actor" },
        { name: "from", type: "date", description: "From date" },
        { name: "to", type: "date", description: "To date" },
      ] },
      { method: "GET", path: "/v1/audit-logs/:id", description: "Get full audit detail with before/after state" },
    ],
  },
  {
    name: "Incidents",
    description: "Incident management and postmortem tracking",
    endpoints: [
      { method: "GET", path: "/v1/incidents", description: "List incidents", params: [
        { name: "status", type: "string", description: "Filter by status" },
        { name: "severity", type: "string", description: "Filter by severity" },
      ] },
      { method: "GET", path: "/v1/incidents/:id", description: "Get incident with updates" },
      { method: "POST", path: "/v1/incidents", description: "Create incident" },
      { method: "POST", path: "/v1/incidents/:id/updates", description: "Post incident update" },
      { method: "PATCH", path: "/v1/incidents/:id", description: "Update/resolve incident" },
    ],
  },
  {
    name: "Admin Sessions & Logins",
    description: "Admin sessions, login auditing, and user actions",
    endpoints: [
      { method: "GET", path: "/v1/admin-logins", description: "List admin login attempts", params: [{ name: "success", type: "boolean", description: "Filter by success" }] },
      { method: "GET", path: "/v1/admin-sessions", description: "List active admin sessions" },
      { method: "DELETE", path: "/v1/admin-sessions/:id", description: "Terminate admin session" },
      { method: "GET", path: "/v1/admin-actions", description: "List admin user actions", params: [
        { name: "action_type", type: "string", description: "Filter by action type" },
        { name: "target_user_id", type: "uuid", description: "Filter by target user" },
      ] },
    ],
  },
  {
    name: "Notifications",
    description: "Admin user notifications and alerts",
    endpoints: [
      { method: "GET", path: "/v1/notifications", description: "List notifications", params: [
        { name: "user_id", type: "uuid", description: "Filter by user" },
        { name: "is_read", type: "boolean", description: "Filter read/unread" },
        { name: "notification_type", type: "string", description: "Filter by type" },
      ] },
      { method: "POST", path: "/v1/notifications", description: "Send notification to user" },
      { method: "POST", path: "/v1/notifications/bulk", description: "Send bulk notifications" },
      { method: "PATCH", path: "/v1/notifications/:id", description: "Mark notification as read" },
      { method: "DELETE", path: "/v1/notifications/:id", description: "Delete notification" },
    ],
  },
  {
    name: "Workspace",
    description: "Workspace settings, invitations, and admin onboarding",
    endpoints: [
      { method: "GET", path: "/v1/workspace/invitations", description: "List workspace invitations" },
      { method: "POST", path: "/v1/workspace/invitations", description: "Send workspace invitation" },
      { method: "DELETE", path: "/v1/workspace/invitations/:id", description: "Revoke invitation" },
      { method: "GET", path: "/v1/workspace/onboarding-profiles", description: "List admin onboarding profiles" },
    ],
  },
  {
    name: "Site Visits",
    description: "Website visitor tracking and analytics",
    endpoints: [
      { method: "GET", path: "/v1/site-visits", description: "List site visits", params: [
        { name: "page_path", type: "string", description: "Filter by page path" },
        { name: "from", type: "date", description: "From date" },
        { name: "to", type: "date", description: "To date" },
      ] },
      { method: "GET", path: "/v1/site-visits/stats", description: "Get aggregated visit statistics" },
    ],
  },
  {
    name: "Device Sessions",
    description: "User device sessions and security management",
    endpoints: [
      { method: "GET", path: "/v1/device-sessions", description: "List device sessions", params: [{ name: "user_id", type: "uuid", description: "Filter by user" }] },
      { method: "DELETE", path: "/v1/device-sessions/:id", description: "Revoke a device session" },
    ],
  },
  {
    name: "Login Activity",
    description: "User login history and audit",
    endpoints: [
      { method: "GET", path: "/v1/login-activity", description: "List login activity", params: [{ name: "user_id", type: "uuid", description: "Filter by user" }] },
    ],
  },
  {
    name: "Stats",
    description: "System-wide statistics overview across all tables",
    endpoints: [
      { method: "GET", path: "/v1/stats", description: "Get aggregated counts for all major tables" },
      { method: "GET", path: "/v1/stats/credits", description: "Get credit circulation statistics" },
      { method: "GET", path: "/v1/stats/revenue", description: "Get revenue summary" },
      { method: "GET", path: "/v1/stats/ai-usage", description: "Get AI usage breakdown" },
    ],
  },
  {
    name: "API Key Management",
    description: "Manage all platform API keys across users",
    endpoints: [
      { method: "GET", path: "/v1/api-keys", description: "List all API keys (admin view)", params: [
        { name: "user_id", type: "uuid", description: "Filter by user" },
        { name: "is_active", type: "boolean", description: "Filter active/revoked" },
      ] },
      { method: "GET", path: "/v1/api-keys/:id", description: "Get API key details" },
      { method: "PATCH", path: "/v1/api-keys/:id", description: "Update key quotas, scopes, or status" },
      { method: "DELETE", path: "/v1/api-keys/:id", description: "Revoke an API key" },
      { method: "POST", path: "/v1/api-keys/grant", description: "Grant a new API key to a user", body: [
        { name: "user_id", type: "uuid", required: true, description: "Target user ID" },
        { name: "name", type: "string", required: true, description: "Key name" },
        { name: "scopes", type: "string[]", description: "Permissions" },
        { name: "rate_limit_rpm", type: "number", description: "RPM limit" },
        { name: "rate_limit_daily", type: "number", description: "Daily limit" },
      ] },
      { method: "GET", path: "/v1/api-keys/usage", description: "Get aggregated API usage stats" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  POST: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PATCH: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/20",
};

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  rate_limit_rpm: number;
  rate_limit_daily: number;
  last_used_at: string | null;
  requests_today: number;
  requests_total: number;
  expires_at: string | null;
  created_at: string;
  user_id: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  username: string | null;
}

const AdminAPIManagement = () => {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["API Key Management"]));

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [keyFilter, setKeyFilter] = useState<"all" | "active" | "revoked">("all");
  const [keyUserFilter, setKeyUserFilter] = useState("");

  // Edit key dialog
  const [editingKey, setEditingKey] = useState<ApiKeyRow | null>(null);
  const [editRpm, setEditRpm] = useState("");
  const [editDaily, setEditDaily] = useState("");
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [editScopeDropdownOpen, setEditScopeDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Grant key dialog
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantKeyName, setGrantKeyName] = useState("");
  const [grantScopes, setGrantScopes] = useState<string[]>(["read"]);
  const [grantRpm, setGrantRpm] = useState("60");
  const [grantDaily, setGrantDaily] = useState("10000");
  const [grantScopeDropdownOpen, setGrantScopeDropdownOpen] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantedKey, setGrantedKey] = useState<string | null>(null);
  const [showGrantedKey, setShowGrantedKey] = useState(false);

  // Playground state
  const [pgSearch, setPgSearch] = useState("");
  const [pgSelectedEndpoint, setPgSelectedEndpoint] = useState<(Endpoint & { group: string }) | null>(null);
  const [pgExpandedGroups, setPgExpandedGroups] = useState<Set<string>>(new Set());
  const [pgFieldValues, setPgFieldValues] = useState<Record<string, string>>({});
  const [pgBodyValues, setPgBodyValues] = useState<Record<string, string>>({});
  const [pgResponse, setPgResponse] = useState<string | null>(null);
  const [pgLoading, setPgLoading] = useState(false);
  const [pgStatusCode, setPgStatusCode] = useState<number | null>(null);
  const [pgLatency, setPgLatency] = useState<number | null>(null);
  const [pgApiKey, setPgApiKey] = useState("");

  const totalEndpoints = ADMIN_API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

  const filteredGroups = useMemo(() => {
    if (!search) return ADMIN_API_GROUPS;
    const q = search.toLowerCase();
    return ADMIN_API_GROUPS.map(g => ({
      ...g,
      endpoints: g.endpoints.filter(e =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q)
      ),
    })).filter(g => g.endpoints.length > 0);
  }, [search]);

  const pgFilteredGroups = useMemo(() => {
    if (!pgSearch) return ADMIN_API_GROUPS;
    const q = pgSearch.toLowerCase();
    return ADMIN_API_GROUPS.map(g => ({
      ...g,
      endpoints: g.endpoints.filter(e =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q)
      ),
    })).filter(g => g.endpoints.length > 0);
  }, [pgSearch]);

  const filteredKeys = useMemo(() => {
    let keys = apiKeys;
    if (keyFilter === "active") keys = keys.filter(k => k.is_active);
    if (keyFilter === "revoked") keys = keys.filter(k => !k.is_active);
    if (keyUserFilter.trim()) {
      const q = keyUserFilter.toLowerCase();
      keys = keys.filter(k => {
        const profile = userProfiles[k.user_id];
        if (!profile) return k.user_id.toLowerCase().includes(q);
        return (
          (profile.email || "").toLowerCase().includes(q) ||
          (profile.display_name || "").toLowerCase().includes(q) ||
          (profile.username || "").toLowerCase().includes(q) ||
          k.user_id.toLowerCase().includes(q) ||
          k.name.toLowerCase().includes(q)
        );
      });
    }
    return keys;
  }, [apiKeys, keyFilter, keyUserFilter, userProfiles]);

  const loadApiKeys = async () => {
    setKeysLoading(true);
    const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load API keys");
    else {
      const keys = (data || []) as ApiKeyRow[];
      setApiKeys(keys);
      // Load user profiles for all unique user_ids
      const userIds = [...new Set(keys.map(k => k.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, email, display_name, username").in("user_id", userIds);
        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach((p: any) => { profileMap[p.user_id] = p; });
          setUserProfiles(profileMap);
        }
      }
    }
    setKeysLoading(false);
  };

  const revokeKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to revoke key");
    else { toast.success("API key revoked"); loadApiKeys(); }
  };

  const reactivateKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ is_active: true, revoked_at: null }).eq("id", id);
    if (error) toast.error("Failed to reactivate key");
    else { toast.success("API key reactivated"); loadApiKeys(); }
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) toast.error("Failed to delete key");
    else { toast.success("API key permanently deleted"); loadApiKeys(); }
  };

  const openEditDialog = (key: ApiKeyRow) => {
    setEditingKey(key);
    setEditRpm(String(key.rate_limit_rpm));
    setEditDaily(String(key.rate_limit_daily));
    setEditScopes([...key.scopes]);
    setEditScopeDropdownOpen(false);
  };

  const saveKeyChanges = async () => {
    if (!editingKey) return;
    setSaving(true);
    const { error } = await supabase.from("api_keys").update({
      rate_limit_rpm: parseInt(editRpm) || 60,
      rate_limit_daily: parseInt(editDaily) || 10000,
      scopes: editScopes,
    }).eq("id", editingKey.id);
    if (error) toast.error("Failed to update key");
    else { toast.success("API key updated"); setEditingKey(null); loadApiKeys(); }
    setSaving(false);
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "ozcpk_live_";
    for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const grantApiKey = async () => {
    if (!grantUserId.trim() || !grantKeyName.trim()) { toast.error("User ID and key name are required"); return; }
    setGranting(true);
    try {
      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const prefix = rawKey.substring(0, 16);
      const { error } = await supabase.from("api_keys").insert({
        user_id: grantUserId.trim(),
        name: grantKeyName.trim(),
        key_prefix: prefix,
        key_hash: keyHash,
        scopes: grantScopes.length > 0 ? grantScopes : ["read"],
        rate_limit_rpm: parseInt(grantRpm) || 60,
        rate_limit_daily: parseInt(grantDaily) || 10000,
      });
      if (error) throw error;
      setGrantedKey(rawKey);
      setShowGrantedKey(true);
      toast.success("API key granted to user");
      loadApiKeys();
    } catch (e: any) {
      toast.error(e.message || "Failed to grant key");
    }
    setGranting(false);
  };

  const resetQuota = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ requests_today: 0 }).eq("id", id);
    if (error) toast.error("Failed to reset quota");
    else { toast.success("Daily quota reset"); loadApiKeys(); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(""), 2000);
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const togglePgGroup = (name: string) => {
    setPgExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const selectEndpoint = (ep: Endpoint, group: string) => {
    setPgSelectedEndpoint({ ...ep, group });
    setPgFieldValues({});
    setPgBodyValues({});
    setPgResponse(null);
    setPgStatusCode(null);
    setPgLatency(null);
  };

  const sendPlaygroundRequest = async () => {
    if (!pgSelectedEndpoint) return;

    // Validate API key
    if (!pgApiKey.trim()) {
      toast.error("API key is required. Enter your secret key (ozc_sk_live_...) to authenticate.");
      return;
    }
    if (!pgApiKey.startsWith("ozc_sk_live_") && !pgApiKey.startsWith("ozc_pk_live_") && !pgApiKey.startsWith("ozcpk_live_")) {
      toast.error("Invalid API key format. Keys must start with ozc_sk_live_ or ozc_pk_live_");
      return;
    }
    if (pgApiKey.startsWith("ozc_pk_live_") && pgSelectedEndpoint.method !== "GET") {
      toast.error("Publishable keys (pk) can only perform GET requests. Use a secret key (sk) for write operations.");
      return;
    }

    setPgLoading(true);
    setPgResponse(null);
    setPgStatusCode(null);
    setPgLatency(null);

    try {
      let path = pgSelectedEndpoint.path;
      const pathParamRegex = /:([a-zA-Z_]+)/g;
      let match;
      while ((match = pathParamRegex.exec(pgSelectedEndpoint.path)) !== null) {
        const paramName = match[1];
        const val = pgFieldValues[paramName] || pgBodyValues[paramName];
        if (val) path = path.replace(`:${paramName}`, val);
      }

      const queryParts: string[] = [];
      if (pgSelectedEndpoint.params) {
        for (const p of pgSelectedEndpoint.params) {
          const val = pgFieldValues[p.name];
          if (val) queryParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(val)}`);
        }
      }
      const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      let bodyObj: any = undefined;
      if (["POST", "PATCH"].includes(pgSelectedEndpoint.method) && pgSelectedEndpoint.body) {
        bodyObj = {};
        for (const b of pgSelectedEndpoint.body) {
          const val = pgBodyValues[b.name];
          if (val !== undefined && val !== "") {
            try { bodyObj[b.name] = JSON.parse(val); } catch { bodyObj[b.name] = val; }
          }
        }
      }

      const startTime = Date.now();
      const res = await fetch(`${BASE_URL}${path}${queryStr}`, {
        method: pgSelectedEndpoint.method,
        headers: {
          "X-API-Key": pgApiKey.trim(),
          "Content-Type": "application/json",
        },
        ...(bodyObj && Object.keys(bodyObj).length > 0 ? { body: JSON.stringify(bodyObj) } : {}),
      });
      const latency = Date.now() - startTime;
      const data = await res.json();
      setPgStatusCode(res.status);
      setPgLatency(latency);
      setPgResponse(JSON.stringify(data, null, 2));
      if (res.ok) toast.success(`${res.status} OK — ${latency}ms`);
      else toast.error(`${res.status} Error`);
    } catch (e: any) {
      setPgResponse(JSON.stringify({ error: e.message }, null, 2));
      toast.error("Request failed");
    }
    setPgLoading(false);
  };

  const ScopeDropdown = ({ scopes, setScopes, open, setOpen }: { scopes: string[]; setScopes: (s: string[]) => void; open: boolean; setOpen: (o: boolean) => void }) => (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white h-10">
        <span className="truncate text-white/70">
          {scopes.length === 4 ? "All Permissions" : scopes.length === 0 ? "Select scopes..." : scopes.join(", ")}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-[hsl(220,100%,8%)] shadow-lg">
          {[
            { value: "all", label: "All Permissions", desc: "Full access — read, write, delete, admin" },
            { value: "read", label: "Read", desc: "GET requests — view data" },
            { value: "write", label: "Write", desc: "POST/PATCH requests — create & update" },
            { value: "delete", label: "Delete", desc: "DELETE requests — remove data" },
            { value: "admin", label: "Admin", desc: "Admin-level operations" },
          ].map((scope) => {
            const isAll = scope.value === "all";
            const isAllSelected = scopes.length === 4;
            const isChecked = isAll ? isAllSelected : scopes.includes(scope.value);
            return (
              <button key={scope.value} type="button"
                onClick={() => {
                  if (isAll) setScopes(isAllSelected ? [] : ["read", "write", "delete", "admin"]);
                  else setScopes(scopes.includes(scope.value) ? scopes.filter(s => s !== scope.value) : [...scopes, scope.value]);
                }}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                <div className={`mt-0.5 h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${isChecked ? "bg-accent border-accent" : "border-white/20"}`}>
                  {isChecked && <Check className="h-3 w-3 text-accent-foreground" />}
                </div>
                <div>
                  <span className="text-sm text-white font-medium">{scope.label}</span>
                  <p className="text-[10px] text-white/40 mt-0.5">{scope.desc}</p>
                </div>
              </button>
            );
          })}
          <div className="border-t border-white/10 p-2">
            <Button size="sm" onClick={() => setOpen(false)} className="w-full h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">Done</Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-accent" /> Admin API Management
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Administrative endpoints — {totalEndpoints} endpoints across {ADMIN_API_GROUPS.length} resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-xs">
            <Shield className="h-3 w-3 mr-1" /> Admin Only
          </Badge>
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-xs">
            <Server className="h-3 w-3 mr-1" /> v1.0.0
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1 flex-wrap">
          <TabsTrigger value="keys" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> API Users
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Documentation
          </TabsTrigger>
          <TabsTrigger value="playground" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Terminal className="h-3.5 w-3.5" /> Playground
          </TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Usage
          </TabsTrigger>
        </TabsList>

        {/* ── API KEYS TAB ── */}
        <TabsContent value="keys" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Key className="h-4 w-4 text-accent" /> Platform API Keys
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{apiKeys.length} total</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadApiKeys} disabled={keysLoading} className="h-7 text-xs border-white/10 text-white/60 hover:text-white gap-1.5">
                    <RefreshCw className={`h-3 w-3 ${keysLoading ? "animate-spin" : ""}`} /> Load Keys
                  </Button>
                  <Button size="sm" onClick={() => { setShowGrantDialog(true); setGrantedKey(null); setGrantUserId(""); setGrantKeyName(""); setGrantScopes(["read"]); setGrantRpm("60"); setGrantDaily("10000"); }}
                    className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                    <Plus className="h-3 w-3" /> Grant Key
                  </Button>
                </div>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex gap-1">
                  {(["all", "active", "revoked"] as const).map((f) => (
                    <Button key={f} size="sm" variant={keyFilter === f ? "default" : "outline"}
                      onClick={() => setKeyFilter(f)}
                      className={`h-6 text-[10px] px-2 ${keyFilter === f ? "bg-accent text-accent-foreground" : "border-white/10 text-white/40"}`}>
                      {f === "all" ? "All" : f === "active" ? "Active" : "Revoked"}
                    </Button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <Input placeholder="Search by user, email, key name..." value={keyUserFilter} onChange={e => setKeyUserFilter(e.target.value)}
                    className="pl-7 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-7 text-[11px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {filteredKeys.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No API keys found</p>
                  <p className="text-xs text-white/20 mt-1">Click "Load Keys" to fetch all platform API keys</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredKeys.map((key) => {
                    const profile = userProfiles[key.user_id];
                    return (
                      <div key={key.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-1.5 rounded-md mt-0.5 ${key.is_active ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                              <Key className={`h-3.5 w-3.5 ${key.is_active ? "text-emerald-400" : "text-red-400"}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-white">{key.name}</span>
                                <code className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 rounded">{key.key_prefix}•••</code>
                                <Badge className={`text-[9px] ${key.is_active ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-red-500/10 text-red-300 border-red-500/20"} border`}>
                                  {key.is_active ? "Active" : "Revoked"}
                                </Badge>
                              </div>
                              {/* User info */}
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-3 w-3 text-white/20" />
                                <span className="text-[10px] text-white/40">
                                  {profile ? `${profile.display_name || profile.username || "—"} (${profile.email})` : key.user_id.slice(0, 8) + "..."}
                                </span>
                              </div>
                              {/* Stats row */}
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-[10px] text-white/25">Scopes: {key.scopes.join(", ") || "none"}</span>
                                <span className="text-[10px] text-white/25">{key.rate_limit_rpm} RPM</span>
                                <span className="text-[10px] text-white/25">{key.rate_limit_daily.toLocaleString()} daily</span>
                                <span className="text-[10px] text-white/25">{key.requests_today}/{key.rate_limit_daily} today</span>
                                <span className="text-[10px] text-white/25">{Number(key.requests_total).toLocaleString()} total</span>
                                {key.last_used_at && <span className="text-[10px] text-white/25">Last: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                                {key.expires_at && (
                                  <span className="text-[10px] text-amber-400/60 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" /> Expires {new Date(key.expires_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(key)} className="h-7 w-7 p-0 text-white/30 hover:text-white" title="Edit quotas & scopes">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => resetQuota(key.id)} className="h-7 w-7 p-0 text-white/30 hover:text-blue-300" title="Reset daily quota">
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            {key.is_active ? (
                              <Button size="sm" variant="ghost" onClick={() => revokeKey(key.id)} className="h-7 w-7 p-0 text-white/30 hover:text-red-300" title="Revoke key">
                                <Ban className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => reactivateKey(key.id)} className="h-7 w-7 p-0 text-white/30 hover:text-emerald-300" title="Reactivate key">
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => deleteKey(key.id)} className="h-7 w-7 p-0 text-white/30 hover:text-red-400" title="Delete permanently">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className="bg-amber-500/5 border-amber-500/15">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-[11px] text-white/60 space-y-1">
                  <p className="font-semibold text-amber-300">API Key Security</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>API keys are hashed with SHA-256 — raw keys are never stored</li>
                    <li>Keys support fine-grained scope permissions (read, write, delete, admin)</li>
                    <li>Rate limiting is enforced per-key (RPM + daily limits)</li>
                    <li>All API key usage is tracked and auditable</li>
                    <li>Keys can be revoked/reactivated or permanently deleted</li>
                    <li>Admin can grant keys to any user with custom quotas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API USERS TAB ── */}
        <TabsContent value="users" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" /> API Users Overview
                </CardTitle>
                <Button size="sm" variant="outline" onClick={loadApiKeys} disabled={keysLoading} className="h-7 text-xs border-white/10 text-white/60 hover:text-white gap-1.5">
                  <RefreshCw className={`h-3 w-3 ${keysLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {(() => {
                const userMap = new Map<string, { keys: ApiKeyRow[]; profile: UserProfile | undefined }>();
                apiKeys.forEach(k => {
                  if (!userMap.has(k.user_id)) userMap.set(k.user_id, { keys: [], profile: userProfiles[k.user_id] });
                  userMap.get(k.user_id)!.keys.push(k);
                });
                const users = Array.from(userMap.entries());
                if (users.length === 0) return (
                  <div className="text-center py-8 text-white/30">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No API users found</p>
                    <p className="text-xs text-white/20 mt-1">Load keys first to see user breakdown</p>
                  </div>
                );
                return (
                  <div className="space-y-3">
                    {users.map(([userId, { keys, profile }]) => {
                      const activeKeys = keys.filter(k => k.is_active).length;
                      const totalReqs = keys.reduce((s, k) => s + Number(k.requests_total), 0);
                      const todayReqs = keys.reduce((s, k) => s + k.requests_today, 0);
                      return (
                        <div key={userId} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                                  <Users className="h-4 w-4 text-accent" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{profile?.display_name || profile?.username || "Unknown User"}</p>
                                  <p className="text-[10px] text-white/40">{profile?.email || userId.slice(0, 16) + "..."}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-3">
                                <div className="text-center">
                                  <p className="text-lg font-bold text-white">{keys.length}</p>
                                  <p className="text-[10px] text-white/30">Total Keys</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-emerald-400">{activeKeys}</p>
                                  <p className="text-[10px] text-white/30">Active</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-blue-400">{todayReqs.toLocaleString()}</p>
                                  <p className="text-[10px] text-white/30">Today</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-white/60">{totalReqs.toLocaleString()}</p>
                                  <p className="text-[10px] text-white/30">All Time</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setShowGrantDialog(true); setGrantedKey(null); setGrantUserId(userId); setGrantKeyName(""); setGrantScopes(["read"]); setGrantRpm("60"); setGrantDaily("10000"); }}
                                className="h-7 text-xs border-white/10 text-white/50 gap-1">
                                <Plus className="h-3 w-3" /> Grant Key
                              </Button>
                              <Button size="sm" variant="ghost" onClick={async () => {
                                for (const k of keys.filter(k => k.is_active)) await revokeKey(k.id);
                              }} className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1">
                                <Ban className="h-3 w-3" /> Revoke All
                              </Button>
                            </div>
                          </div>
                          {/* Keys list */}
                          <div className="mt-3 space-y-1">
                            {keys.map(k => (
                              <div key={k.id} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                  <div className={`h-1.5 w-1.5 rounded-full ${k.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                                  <span className="text-white/60">{k.name}</span>
                                  <code className="text-white/20 font-mono">{k.key_prefix}•••</code>
                                  <span className="text-white/20">{k.scopes.join(", ")}</span>
                                </div>
                                <span className="text-white/20">{Number(k.requests_total).toLocaleString()} reqs</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DOCS TAB ── */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/60 space-y-1">
                  <p className="font-semibold text-white/80">API Key Authentication</p>
                  <p>All admin endpoints require a valid API key in the X-API-Key header.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-white/5 px-2 py-1 rounded text-[11px] text-accent font-mono">
                      X-API-Key: ozcpk_live_••••••••••••••••
                    </code>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white"
                      onClick={() => copyToClipboard('X-API-Key: ozcpk_live_YOUR_API_KEY', 'auth-header')}>
                      {copied === "auth-header" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-white/60">Base URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white/5 px-3 py-1.5 rounded text-xs text-emerald-300 font-mono">{BASE_URL}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white"
                    onClick={() => copyToClipboard(BASE_URL, 'base-url')}>
                    {copied === "base-url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input placeholder={`Search ${totalEndpoints} admin endpoints...`} value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm" />
          </div>

          <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
            <div className="space-y-3 pr-3">
              {filteredGroups.map((group) => (
                <Collapsible key={group.name} open={expandedGroups.has(group.name)} onOpenChange={() => toggleGroup(group.name)}>
                  <Card className="bg-white/[0.02] border-white/[0.06] overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{group.endpoints.length}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 hidden sm:inline">{group.description}</span>
                          {expandedGroups.has(group.name) ? <ChevronDown className="h-4 w-4 text-white/30" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                        {group.endpoints.map((ep, i) => (
                          <div key={i} className="p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${METHOD_COLORS[ep.method]} text-[10px] font-mono px-2 py-0.5 border`}>{ep.method}</Badge>
                              <code className="text-xs text-white/70 font-mono">{ep.path}</code>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/20 hover:text-white ml-auto"
                                onClick={() => copyToClipboard(`curl -X ${ep.method} "${BASE_URL}${ep.path}" -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json"`, `ep-${group.name}-${i}`)}>
                                {copied === `ep-${group.name}-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            <p className="text-[11px] text-white/40">{ep.description}</p>
                            {ep.params && ep.params.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Query Parameters</span>
                                {ep.params.map((p, pi) => (
                                  <div key={pi} className="flex items-start gap-2 text-[11px]">
                                    <code className="text-purple-300 font-mono bg-white/5 px-1 rounded">{p.name}</code>
                                    <span className="text-white/25">{p.type}</span>
                                    {p.required && <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>}
                                    <span className="text-white/40">{p.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {ep.body && ep.body.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Request Body</span>
                                {ep.body.map((b, bi) => (
                                  <div key={bi} className="flex items-start gap-2 text-[11px]">
                                    <code className="text-blue-300 font-mono bg-white/5 px-1 rounded">{b.name}</code>
                                    <span className="text-white/25">{b.type}</span>
                                    {b.required && <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>}
                                    <span className="text-white/40">{b.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── PLAYGROUND TAB ── */}
        <TabsContent value="playground" className="space-y-0">
          <div className="flex h-[calc(100vh-300px)] min-h-[500px] border border-white/[0.06] rounded-xl overflow-hidden bg-black/20">
            {/* LEFT SIDEBAR */}
            <div className="w-[320px] border-r border-white/[0.06] flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input placeholder={`Search ${totalEndpoints} admin endpoints...`} value={pgSearch} onChange={(e) => setPgSearch(e.target.value)}
                    className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-8 text-xs" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-1">
                  {pgFilteredGroups.map((group) => (
                    <Collapsible key={group.name} open={pgExpandedGroups.has(group.name)} onOpenChange={() => togglePgGroup(group.name)}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors text-left">
                          <span className="text-xs font-semibold text-white/70">{group.name}</span>
                          {pgExpandedGroups.has(group.name) ? <ChevronDown className="h-3 w-3 text-white/30" /> : <ChevronRight className="h-3 w-3 text-white/30" />}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {group.endpoints.map((ep, i) => {
                          const isSelected = pgSelectedEndpoint?.path === ep.path && pgSelectedEndpoint?.method === ep.method;
                          return (
                            <button key={i} onClick={() => selectEndpoint(ep, group.name)}
                              className={`w-full text-left px-3 py-2 transition-colors border-l-2 ${isSelected ? "bg-white/[0.05] border-l-accent" : "border-l-transparent hover:bg-white/[0.02]"}`}>
                              <div className="flex items-center gap-2">
                                <Badge className={`${METHOD_COLORS[ep.method]} text-[9px] font-mono px-1.5 py-0 border`}>{ep.method}</Badge>
                                <span className="text-[11px] text-white/50 truncate">{ep.description}</span>
                              </div>
                              <code className="text-[10px] text-white/30 font-mono mt-0.5 block truncate">{ep.path}</code>
                            </button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* CENTER - Request Config */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06]">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Configure Request</span>
                <Button size="sm" onClick={sendPlaygroundRequest} disabled={pgLoading || !pgSelectedEndpoint}
                  className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                  {pgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {pgSelectedEndpoint ? (
                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{pgSelectedEndpoint.description}</span>
                        <Badge className={`${METHOD_COLORS[pgSelectedEndpoint.method]} text-[10px] font-mono px-2 py-0.5 border`}>{pgSelectedEndpoint.method}</Badge>
                      </div>
                      <code className="text-[11px] text-white/40 font-mono">{pgSelectedEndpoint.path}</code>
                    </div>

                    {/* API Key Field */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-accent" /> Authentication
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[11px] text-accent font-mono">X-API-Key</code>
                          <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>
                        </div>
                        <Input
                          value={pgApiKey}
                          onChange={(e) => setPgApiKey(e.target.value)}
                          type="password"
                          placeholder="ozc_sk_live_... or ozc_pk_live_..."
                          className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono"
                        />
                        <p className="text-[9px] text-white/20 mt-1">Paste your API key. Publishable keys are read-only (GET only).</p>
                      </div>
                    </div>

                    {(() => {
                      const pathParams = pgSelectedEndpoint.path.match(/:([a-zA-Z_]+)/g);
                      if (!pathParams) return null;
                      return (
                        <div className="space-y-2">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Path Parameters</span>
                          {pathParams.map(param => {
                            const name = param.slice(1);
                            return (
                              <div key={name}>
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-[11px] text-purple-300 font-mono">{name}</code>
                                  <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge>
                                </div>
                                <Input value={pgFieldValues[name] || ""} onChange={(e) => setPgFieldValues(p => ({ ...p, [name]: e.target.value }))}
                                  placeholder={name} className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono" />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {pgSelectedEndpoint.params && pgSelectedEndpoint.params.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Query Parameters</span>
                        {pgSelectedEndpoint.params.map((p) => (
                          <div key={p.name}>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-[11px] text-purple-300 font-mono">{p.name}</code>
                              {p.required ? <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge> : <span className="text-[9px] text-white/30 italic">optional</span>}
                            </div>
                            <Input value={pgFieldValues[p.name] || ""} onChange={(e) => setPgFieldValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                              placeholder={p.description} className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono" />
                          </div>
                        ))}
                      </div>
                    )}

                    {pgSelectedEndpoint.body && pgSelectedEndpoint.body.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Request Body</span>
                        {pgSelectedEndpoint.body.map((b) => (
                          <div key={b.name}>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-[11px] text-blue-300 font-mono">{b.name}</code>
                              {b.required ? <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] px-1">required</Badge> : <span className="text-[9px] text-white/30 italic">optional</span>}
                            </div>
                            <Input value={pgBodyValues[b.name] || ""} onChange={(e) => setPgBodyValues(prev => ({ ...prev, [b.name]: e.target.value }))}
                              placeholder={b.description} className="bg-white/5 border-white/10 text-white h-8 text-xs font-mono" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20">
                    <div className="text-center">
                      <Terminal className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select an admin endpoint</p>
                      <p className="text-[11px] text-white/15 mt-1">Browse the sidebar or search</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* RIGHT - Response */}
            <div className="w-[380px] flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Response</span>
                <div className="flex items-center gap-2">
                  {pgStatusCode !== null && (
                    <Badge className={`text-[10px] ${pgStatusCode < 300 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : pgStatusCode < 500 ? "bg-amber-500/15 text-amber-300 border-amber-500/20" : "bg-red-500/15 text-red-300 border-red-500/20"} border`}>{pgStatusCode}</Badge>
                  )}
                  {pgLatency !== null && <span className="text-[10px] text-white/30">{pgLatency}ms</span>}
                  {pgResponse && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/30 hover:text-white" onClick={() => copyToClipboard(pgResponse, 'pg-resp')}>
                      {copied === "pg-resp" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                {pgResponse ? (
                  <pre className="p-4 text-[11px] text-emerald-300/80 font-mono whitespace-pre-wrap break-all">{pgResponse}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20">
                    <div className="text-center">
                      <Play className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Click Send to get a response</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* ── USAGE TAB ── */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{new Set(apiKeys.map(k => k.user_id)).size}</p>
                <p className="text-xs text-white/40">API Users</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 text-center">
                <Key className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{apiKeys.filter(k => k.is_active).length}</p>
                <p className="text-xs text-white/40">Active Keys</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{apiKeys.reduce((s, k) => s + k.requests_today, 0).toLocaleString()}</p>
                <p className="text-xs text-white/40">Requests Today</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 text-center">
                <Database className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{apiKeys.reduce((s, k) => s + Number(k.requests_total), 0).toLocaleString()}</p>
                <p className="text-xs text-white/40">Total Requests</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">Top API Keys by Usage</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button size="sm" onClick={loadApiKeys} disabled={keysLoading} className="h-7 text-xs gap-1.5">
                <RefreshCw className={`h-3 w-3 ${keysLoading ? "animate-spin" : ""}`} /> Load Data
              </Button>
              {apiKeys.length > 0 && (
                <div className="mt-4 space-y-2">
                  {[...apiKeys].sort((a, b) => Number(b.requests_total) - Number(a.requests_total)).slice(0, 10).map((key) => {
                    const profile = userProfiles[key.user_id];
                    return (
                      <div key={key.id} className="flex items-center justify-between text-xs p-2 rounded bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${key.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                          <code className="text-white/40 font-mono">{key.key_prefix}•••</code>
                          <span className="text-white/60">{key.name}</span>
                          <span className="text-white/20">({profile?.email || key.user_id.slice(0, 8)})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white/30">{key.requests_today} today</span>
                          <span className="text-white/30">{Number(key.requests_total).toLocaleString()} total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Key Dialog */}
      <Dialog open={!!editingKey} onOpenChange={(open) => { if (!open) setEditingKey(null); }}>
        <DialogContent className="bg-[hsl(220,100%,8%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" /> Edit API Key
            </DialogTitle>
          </DialogHeader>
          {editingKey && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{editingKey.name}</span>
                  <code className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 rounded">{editingKey.key_prefix}•••</code>
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  Owner: {userProfiles[editingKey.user_id]?.email || editingKey.user_id.slice(0, 16)}
                </p>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Scopes</label>
                <ScopeDropdown scopes={editScopes} setScopes={setEditScopes} open={editScopeDropdownOpen} setOpen={setEditScopeDropdownOpen} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60 mb-1 block">RPM Limit</label>
                  <Input value={editRpm} onChange={e => setEditRpm(e.target.value)} type="number" className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Daily Limit</label>
                  <Input value={editDaily} onChange={e => setEditDaily(e.target.value)} type="number" className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditingKey(null)} className="text-white/60">Cancel</Button>
                <Button onClick={saveKeyChanges} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant Key Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="bg-[hsl(220,100%,8%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-accent" />
              {grantedKey ? "Key Granted Successfully" : "Grant API Key to User"}
            </DialogTitle>
          </DialogHeader>
          {grantedKey ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300">Copy this key now and share it securely with the user — it will never be shown again.</p>
                </div>
              </div>
              <div className="relative">
                <Input value={showGrantedKey ? grantedKey : "•".repeat(51)} readOnly className="bg-white/5 border-white/10 text-white font-mono text-xs pr-20" />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowGrantedKey(!showGrantedKey)}>
                    {showGrantedKey ? <EyeOff className="h-3 w-3 text-white/40" /> : <Eye className="h-3 w-3 text-white/40" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(grantedKey, "granted-key")}>
                    {copied === "granted-key" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-white/40" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowGrantDialog(false)} className="bg-accent hover:bg-accent/90 text-accent-foreground">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60 mb-1 block">User ID</label>
                <Input value={grantUserId} onChange={e => setGrantUserId(e.target.value)} placeholder="UUID of the target user" className="bg-white/5 border-white/10 text-white text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Key Name</label>
                <Input value={grantKeyName} onChange={e => setGrantKeyName(e.target.value)} placeholder="e.g. Production, Development" className="bg-white/5 border-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Scopes</label>
                <ScopeDropdown scopes={grantScopes} setScopes={setGrantScopes} open={grantScopeDropdownOpen} setOpen={setGrantScopeDropdownOpen} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60 mb-1 block">RPM Limit</label>
                  <Input value={grantRpm} onChange={e => setGrantRpm(e.target.value)} type="number" className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Daily Limit</label>
                  <Input value={grantDaily} onChange={e => setGrantDaily(e.target.value)} type="number" className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowGrantDialog(false)} className="text-white/60">Cancel</Button>
                <Button onClick={grantApiKey} disabled={granting} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                  {granting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Grant Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAPIManagement;

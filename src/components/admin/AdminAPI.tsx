import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code2, Copy, Check, Search, Globe, Lock, Zap, Database, ChevronDown, ChevronRight,
  Server, Shield, BookOpen, Terminal, ExternalLink,
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
  example_response?: string;
}

interface EndpointGroup {
  name: string;
  icon: string;
  description: string;
  endpoints: Endpoint[];
}

const API_GROUPS: EndpointGroup[] = [
  {
    name: "Accounts",
    icon: "👤",
    description: "Manage creator/model accounts in the CRM",
    endpoints: [
      { method: "GET", path: "/v1/accounts", description: "List all managed accounts with optional filters", params: [
        { name: "status", type: "string", description: "Filter by status (active, paused, inactive)" },
        { name: "tier", type: "string", description: "Filter by tier (starter, pro, vip, elite)" },
        { name: "search", type: "string", description: "Search by username or display name" },
        { name: "limit", type: "number", description: "Max results (default 50)" },
        { name: "offset", type: "number", description: "Pagination offset" },
      ], example_response: '{\n  "data": [{\n    "id": "uuid",\n    "username": "model_name",\n    "display_name": "Display Name",\n    "status": "active",\n    "tier": "pro",\n    "monthly_revenue": 5000,\n    "subscriber_count": 1200\n  }],\n  "count": 1\n}' },
      { method: "GET", path: "/v1/accounts/:id", description: "Get a single account by ID" },
      { method: "GET", path: "/v1/accounts/:id/activities", description: "Get account activity log", params: [{ name: "limit", type: "number", description: "Max results" }] },
      { method: "GET", path: "/v1/accounts/:id/conversations", description: "Get DM conversations for account" },
      { method: "GET", path: "/v1/accounts/:id/scripts", description: "Get scripts assigned to account" },
      { method: "GET", path: "/v1/accounts/:id/personas", description: "Get persona profiles for account" },
      { method: "GET", path: "/v1/accounts/:id/fans", description: "Get fan emotional profiles for account" },
      { method: "GET", path: "/v1/accounts/:id/financials", description: "Get financial records for account" },
      { method: "POST", path: "/v1/accounts", description: "Create a new managed account", body: [
        { name: "username", type: "string", required: true, description: "Unique username" },
        { name: "display_name", type: "string", description: "Display name" },
        { name: "platform", type: "string", description: "Platform (default: onlyfans)" },
        { name: "status", type: "string", description: "Account status" },
        { name: "tier", type: "string", description: "Account tier" },
        { name: "contact_email", type: "string", description: "Contact email" },
      ] },
      { method: "PATCH", path: "/v1/accounts/:id", description: "Update an account", body: [
        { name: "status", type: "string", description: "Update status" },
        { name: "tier", type: "string", description: "Update tier" },
        { name: "monthly_revenue", type: "number", description: "Update revenue" },
        { name: "notes", type: "string", description: "Update notes" },
      ] },
      { method: "DELETE", path: "/v1/accounts/:id", description: "Delete an account permanently" },
    ],
  },
  {
    name: "Scripts",
    icon: "📝",
    description: "Manage chat scripts and storylines",
    endpoints: [
      { method: "GET", path: "/v1/scripts", description: "List all scripts", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status (draft, active, archived)" },
        { name: "category", type: "string", description: "Filter by category" },
      ] },
      { method: "GET", path: "/v1/scripts/:id", description: "Get script with steps" },
      { method: "GET", path: "/v1/scripts/:id/steps", description: "Get steps for a script" },
      { method: "POST", path: "/v1/scripts", description: "Create a new script with optional steps", body: [
        { name: "title", type: "string", required: true, description: "Script title" },
        { name: "category", type: "string", description: "Script category" },
        { name: "target_segment", type: "string", description: "Target audience segment" },
        { name: "steps", type: "array", description: "Array of script step objects" },
      ] },
      { method: "PATCH", path: "/v1/scripts/:id", description: "Update script metadata" },
      { method: "DELETE", path: "/v1/scripts/:id", description: "Delete script and all steps" },
    ],
  },
  {
    name: "Team",
    icon: "👥",
    description: "Manage team members and roles",
    endpoints: [
      { method: "GET", path: "/v1/team", description: "List all team members" },
      { method: "GET", path: "/v1/team/:id", description: "Get team member details" },
      { method: "POST", path: "/v1/team", description: "Add a new team member" },
      { method: "PATCH", path: "/v1/team/:id", description: "Update team member" },
      { method: "DELETE", path: "/v1/team/:id", description: "Remove team member" },
    ],
  },
  {
    name: "Contracts",
    icon: "📄",
    description: "Manage contracts and agreements",
    endpoints: [
      { method: "GET", path: "/v1/contracts", description: "List contracts", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status" },
      ] },
      { method: "GET", path: "/v1/contracts/:id", description: "Get contract details" },
      { method: "POST", path: "/v1/contracts", description: "Create a new contract" },
      { method: "PATCH", path: "/v1/contracts/:id", description: "Update contract" },
      { method: "DELETE", path: "/v1/contracts/:id", description: "Delete contract" },
    ],
  },
  {
    name: "Conversations",
    icon: "💬",
    description: "Manage AI DM conversations and messages",
    endpoints: [
      { method: "GET", path: "/v1/conversations", description: "List conversations", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "status", type: "string", description: "Filter by status" },
      ] },
      { method: "GET", path: "/v1/conversations/:id", description: "Get conversation details" },
      { method: "GET", path: "/v1/conversations/:id/messages", description: "Get messages in conversation" },
      { method: "POST", path: "/v1/conversations/:id/messages", description: "Send a message in conversation" },
      { method: "PATCH", path: "/v1/conversations/:id", description: "Update conversation settings" },
    ],
  },
  {
    name: "Personas",
    icon: "🎭",
    description: "Manage persona DNA profiles",
    endpoints: [
      { method: "GET", path: "/v1/personas", description: "List all personas", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "GET", path: "/v1/personas/:id", description: "Get persona details" },
      { method: "POST", path: "/v1/personas", description: "Create persona profile" },
      { method: "PATCH", path: "/v1/personas/:id", description: "Update persona" },
      { method: "DELETE", path: "/v1/personas/:id", description: "Delete persona" },
    ],
  },
  {
    name: "Fans",
    icon: "❤️",
    description: "Fan emotional profiling and behavior tracking",
    endpoints: [
      { method: "GET", path: "/v1/fans", description: "List fan profiles", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "behavior_type", type: "string", description: "Filter by behavior type" },
      ] },
      { method: "GET", path: "/v1/fans/:id", description: "Get fan profile" },
      { method: "PATCH", path: "/v1/fans/:id", description: "Update fan profile data" },
    ],
  },
  {
    name: "Financials",
    icon: "💰",
    description: "Financial records and revenue tracking",
    endpoints: [
      { method: "GET", path: "/v1/financials", description: "List financial records", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "record_type", type: "string", description: "Filter by type (revenue, expense, payout)" },
      ] },
      { method: "POST", path: "/v1/financials", description: "Create financial record" },
      { method: "DELETE", path: "/v1/financials/:id", description: "Delete financial record" },
    ],
  },
  {
    name: "Content",
    icon: "📅",
    description: "Content calendar and scheduling",
    endpoints: [
      { method: "GET", path: "/v1/content", description: "List content items", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status" },
        { name: "platform", type: "string", description: "Filter by platform" },
      ] },
      { method: "GET", path: "/v1/content/:id", description: "Get content details" },
      { method: "POST", path: "/v1/content", description: "Create content item" },
      { method: "PATCH", path: "/v1/content/:id", description: "Update content item" },
      { method: "DELETE", path: "/v1/content/:id", description: "Delete content item" },
    ],
  },
  {
    name: "Workflows",
    icon: "⚡",
    description: "Automation workflows and triggers",
    endpoints: [
      { method: "GET", path: "/v1/workflows", description: "List workflows", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "status", type: "string", description: "Filter by status" },
      ] },
      { method: "GET", path: "/v1/workflows/:id", description: "Get workflow details" },
      { method: "POST", path: "/v1/workflows", description: "Create automation workflow" },
      { method: "PATCH", path: "/v1/workflows/:id", description: "Update workflow" },
      { method: "DELETE", path: "/v1/workflows/:id", description: "Delete workflow" },
    ],
  },
  {
    name: "Bio Links",
    icon: "🔗",
    description: "Bio link pages and click analytics",
    endpoints: [
      { method: "GET", path: "/v1/bio-links", description: "List bio links", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "GET", path: "/v1/bio-links/:id", description: "Get bio link details" },
      { method: "GET", path: "/v1/bio-links/:id/clicks", description: "Get click analytics" },
      { method: "POST", path: "/v1/bio-links", description: "Create bio link page" },
      { method: "PATCH", path: "/v1/bio-links/:id", description: "Update bio link" },
      { method: "DELETE", path: "/v1/bio-links/:id", description: "Delete bio link" },
    ],
  },
  {
    name: "Keywords",
    icon: "🔑",
    description: "AI keyword delay rules and auto-responses",
    endpoints: [
      { method: "GET", path: "/v1/keywords", description: "List keyword rules", params: [{ name: "account_id", type: "uuid", description: "Filter by account" }] },
      { method: "POST", path: "/v1/keywords", description: "Create keyword rule" },
      { method: "PATCH", path: "/v1/keywords/:id", description: "Update keyword rule" },
      { method: "DELETE", path: "/v1/keywords/:id", description: "Delete keyword rule" },
    ],
  },
  {
    name: "Analytics",
    icon: "📊",
    description: "Social media analytics and metrics",
    endpoints: [
      { method: "GET", path: "/v1/analytics", description: "Get analytics data", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "platform", type: "string", description: "Filter by platform" },
        { name: "metric_type", type: "string", description: "Filter by metric type" },
      ] },
    ],
  },
  {
    name: "Wallets",
    icon: "💳",
    description: "User credit wallets",
    endpoints: [
      { method: "GET", path: "/v1/wallets", description: "List all wallets" },
      { method: "GET", path: "/v1/wallets/:user_id", description: "Get wallet by user ID" },
      { method: "PATCH", path: "/v1/wallets/:user_id", description: "Update wallet balance" },
    ],
  },
  {
    name: "Profiles",
    icon: "🧑",
    description: "User profiles management",
    endpoints: [
      { method: "GET", path: "/v1/profiles", description: "List user profiles", params: [
        { name: "search", type: "string", description: "Search by username, name, or email" },
        { name: "limit", type: "number", description: "Max results" },
      ] },
      { method: "GET", path: "/v1/profiles/:user_id", description: "Get profile by user ID" },
      { method: "PATCH", path: "/v1/profiles/:user_id", description: "Update user profile" },
    ],
  },
  {
    name: "Chat Rooms",
    icon: "🏠",
    description: "Intranet chat rooms and messages",
    endpoints: [
      { method: "GET", path: "/v1/chat-rooms", description: "List all chat rooms" },
      { method: "GET", path: "/v1/chat-rooms/:id", description: "Get chat room details" },
      { method: "GET", path: "/v1/chat-rooms/:id/messages", description: "Get messages in room" },
      { method: "POST", path: "/v1/chat-rooms", description: "Create chat room" },
      { method: "POST", path: "/v1/chat-rooms/:id/messages", description: "Send message to room" },
    ],
  },
  {
    name: "AI Learnings",
    icon: "🧠",
    description: "AI-learned strategies and patterns",
    endpoints: [
      { method: "GET", path: "/v1/learnings", description: "Get learned strategies", params: [
        { name: "account_id", type: "uuid", description: "Filter by account" },
        { name: "behavior_type", type: "string", description: "Filter by behavior type" },
      ] },
    ],
  },
  {
    name: "Stats",
    icon: "📈",
    description: "System-wide statistics overview",
    endpoints: [
      { method: "GET", path: "/v1/stats", description: "Get aggregated system statistics (account counts, scripts, conversations, etc.)", example_response: '{\n  "data": {\n    "total_accounts": 24,\n    "total_scripts": 156,\n    "total_conversations": 4521,\n    "total_team_members": 8,\n    "total_workflows": 32,\n    "total_content": 890,\n    "total_fans": 12450\n  }\n}' },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  POST: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PATCH: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/20",
};

const AdminAPI = () => {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Accounts"]));

  const filteredGroups = useMemo(() => {
    if (!search) return API_GROUPS;
    const q = search.toLowerCase();
    return API_GROUPS.map(g => ({
      ...g,
      endpoints: g.endpoints.filter(e =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q)
      ),
    })).filter(g => g.endpoints.length > 0);
  }, [search]);

  const totalEndpoints = API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

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

  const testHealthEndpoint = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${BASE_URL}/health`);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
      toast.success("API is operational!");
    } catch (e) {
      setTestResult(JSON.stringify({ error: "Failed to reach API" }, null, 2));
      toast.error("API test failed");
    }
    setTesting(false);
  };

  const testAuthEndpoint = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not logged in"); setTesting(false); return; }
      const res = await fetch(`${BASE_URL}/v1/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
      if (res.ok) toast.success("Authenticated request successful!");
      else toast.error(`Error ${res.status}`);
    } catch (e) {
      setTestResult(JSON.stringify({ error: "Request failed" }, null, 2));
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-accent" /> API Management
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Full REST API — {totalEndpoints} endpoints across {API_GROUPS.length} resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-xs">
            <Server className="h-3 w-3 mr-1" /> v1.0.0
          </Badge>
          <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-xs">
            <Shield className="h-3 w-3 mr-1" /> Admin Only
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="docs" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="docs" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Documentation
          </TabsTrigger>
          <TabsTrigger value="playground" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Terminal className="h-3.5 w-3.5" /> Playground
          </TabsTrigger>
          <TabsTrigger value="quickstart" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Quick Start
          </TabsTrigger>
        </TabsList>

        {/* ── DOCS TAB ── */}
        <TabsContent value="docs" className="space-y-4">
          {/* Auth info */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/60 space-y-1">
                  <p className="font-semibold text-white/80">Authentication Required</p>
                  <p>All endpoints (except /health) require a valid admin JWT in the Authorization header.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-white/5 px-2 py-1 rounded text-[11px] text-accent font-mono">
                      Authorization: Bearer {"<your-jwt-token>"}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white/30 hover:text-white"
                      onClick={() => copyToClipboard('Authorization: Bearer <your-jwt-token>', 'auth-header')}
                    >
                      {copied === "auth-header" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Base URL */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-white/60">Base URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white/5 px-3 py-1.5 rounded text-xs text-emerald-300 font-mono">{BASE_URL}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-white/30 hover:text-white"
                    onClick={() => copyToClipboard(BASE_URL, 'base-url')}
                  >
                    {copied === "base-url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
            />
          </div>

          {/* Endpoint groups */}
          <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
            <div className="space-y-3 pr-3">
              {filteredGroups.map((group) => (
                <Collapsible
                  key={group.name}
                  open={expandedGroups.has(group.name)}
                  onOpenChange={() => toggleGroup(group.name)}
                >
                  <Card className="bg-white/[0.02] border-white/[0.06] overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{group.icon}</span>
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">
                            {group.endpoints.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/30 hidden sm:inline">{group.description}</span>
                          {expandedGroups.has(group.name) ? (
                            <ChevronDown className="h-4 w-4 text-white/30" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/30" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                        {group.endpoints.map((ep, i) => (
                          <div key={i} className="p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${METHOD_COLORS[ep.method]} text-[10px] font-mono px-2 py-0.5 border`}>
                                {ep.method}
                              </Badge>
                              <code className="text-xs text-white/70 font-mono">{ep.path}</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-white/20 hover:text-white ml-auto"
                                onClick={() => copyToClipboard(`curl -X ${ep.method} "${BASE_URL}${ep.path}" -H "Authorization: Bearer <token>" -H "Content-Type: application/json"`, `ep-${i}`)}
                              >
                                {copied === `ep-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
                            {ep.example_response && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Example Response</span>
                                <pre className="bg-black/30 rounded-lg p-2 text-[10px] text-emerald-300/80 font-mono overflow-x-auto">{ep.example_response}</pre>
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
        <TabsContent value="playground" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" /> Health Check
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-white/40 mb-3">Test API connectivity (no auth required)</p>
                <Button onClick={testHealthEndpoint} disabled={testing} size="sm" className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 text-xs">
                  <Zap className="h-3 w-3 mr-1" /> Test Health
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" /> Authenticated Test
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-white/40 mb-3">Test with your current admin session (GET /v1/stats)</p>
                <Button onClick={testAuthEndpoint} disabled={testing} size="sm" className="bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Test Auth Request
                </Button>
              </CardContent>
            </Card>
          </div>

          {testResult && (
            <Card className="bg-black/30 border-white/[0.06]">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs text-white/60">Response</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-white/30 hover:text-white"
                    onClick={() => copyToClipboard(testResult, 'result')}
                  >
                    {copied === "result" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <pre className="text-[11px] text-emerald-300/80 font-mono overflow-x-auto whitespace-pre-wrap">{testResult}</pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── QUICKSTART TAB ── */}
        <TabsContent value="quickstart" className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">1. Get Your Auth Token</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <p className="text-[11px] text-white/50">Sign in to get a JWT token for API authentication:</p>
              <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-blue-300/80 font-mono overflow-x-auto">{`// JavaScript
const { data } = await supabase.auth.signInWithPassword({
  email: "admin@ozcagency.com",
  password: "your-password"
});
const token = data.session.access_token;`}</pre>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">2. Make API Calls</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div>
                <p className="text-[11px] text-white/50 mb-2">cURL example — List all accounts:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-amber-300/80 font-mono overflow-x-auto">{`curl -X GET "${BASE_URL}/v1/accounts?status=active&limit=10" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json"`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">Create an account:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-amber-300/80 font-mono overflow-x-auto">{`curl -X POST "${BASE_URL}/v1/accounts" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "new_model", "display_name": "New Model", "tier": "pro"}'`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">JavaScript / Fetch:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-emerald-300/80 font-mono overflow-x-auto">{`const res = await fetch("${BASE_URL}/v1/stats", {
  headers: {
    "Authorization": \`Bearer \${token}\`,
    "Content-Type": "application/json"
  }
});
const { data } = await res.json();
console.log(data);`}</pre>
              </div>
              <div>
                <p className="text-[11px] text-white/50 mb-2">Python example:</p>
                <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-purple-300/80 font-mono overflow-x-auto">{`import requests

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Get all active accounts
resp = requests.get(
    "${BASE_URL}/v1/accounts",
    headers=headers,
    params={"status": "active", "limit": 25}
)
accounts = resp.json()["data"]

# Batch update — loop with care
for acc in accounts:
    requests.patch(
        f"${BASE_URL}/v1/accounts/{acc['id']}",
        headers=headers,
        json={"notes": "Reviewed via API"}
    )`}</pre>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="p-4">
              <CardTitle className="text-sm text-white">3. Error Handling</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px] w-14 justify-center">200</Badge>
                  <span className="text-white/50">Success — data returned in response body</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px] w-14 justify-center">201</Badge>
                  <span className="text-white/50">Created — resource successfully created</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] w-14 justify-center">401</Badge>
                  <span className="text-white/50">Unauthorized — invalid or missing admin token</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px] w-14 justify-center">404</Badge>
                  <span className="text-white/50">Not found — resource or endpoint doesn't exist</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px] w-14 justify-center">500</Badge>
                  <span className="text-white/50">Server error — check request body and retry</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/15">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-[11px] text-white/60 space-y-1">
                  <p className="font-semibold text-amber-300">Security Notes</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>API is restricted to admin accounts only</li>
                    <li>Non-admin tokens are rejected with 401</li>
                    <li>All requests are logged and auditable</li>
                    <li>Never share your JWT token publicly</li>
                    <li>Tokens expire — refresh via auth session</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAPI;

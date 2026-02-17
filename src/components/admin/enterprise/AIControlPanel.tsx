import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Brain, Plus, Shield, Zap, AlertTriangle, Power, History, FileText, Clock, BarChart3, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const AIControlPanel = () => {
  const [models, setModels] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [safetyRules, setSafetyRules] = useState<any[]>([]);
  const [aiRequests, setAiRequests] = useState<any[]>([]);
  const [tokenBuckets, setTokenBuckets] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<any[]>([]);
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("models");
  const [loaded, setLoaded] = useState(false);

  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);

  const [modelForm, setModelForm] = useState({ name: "", provider: "openai", model_id: "", description: "", max_tokens: 4096, rate_limit_rpm: 60, pricing_input: 0, pricing_output: 0 });
  const [promptForm, setPromptForm] = useState({ name: "", description: "", category: "general", template: "", variables: "[]" });
  const [safetyForm, setSafetyForm] = useState({ name: "", description: "", rule_type: "content_filter", pattern: "", action: "block", severity: "medium" });

  const fetchCoreData = useCallback(async () => {
    setLoading(true);
    const [modelsRes, killRes] = await Promise.all([
      supabase.from("ai_models").select("*").order("created_at", { ascending: false }),
      supabase.from("system_settings").select("*").eq("key", "ai_global_kill_switch").single(),
    ]);
    setModels(modelsRes.data || []);
    if (killRes.data) setGlobalKillSwitch(killRes.data.value === "true" || killRes.data.value === true);
    setLoaded(true);
    setLoading(false);
  }, []);

  const fetchTabData = useCallback(async (tab: string) => {
    switch (tab) {
      case "prompts": {
        const { data } = await supabase.from("prompt_templates").select("*").order("created_at", { ascending: false });
        setPrompts(data || []);
        break;
      }
      case "safety": {
        const { data } = await supabase.from("safety_rules").select("*").order("created_at", { ascending: false });
        setSafetyRules(data || []);
        break;
      }
      case "requests": {
        const { data } = await supabase.from("ai_requests").select("*").order("created_at", { ascending: false }).limit(20);
        setAiRequests(data || []);
        break;
      }
      case "throttling": {
        const { data } = await supabase.from("rate_limits").select("*").order("created_at", { ascending: false }).limit(20);
        setRateLimits(data || []);
        break;
      }
      case "usage": {
        const { data } = await supabase.from("token_buckets").select("*").order("created_at", { ascending: false }).limit(20);
        setTokenBuckets(data || []);
        break;
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const toggleKillSwitch = async () => {
    const newValue = !globalKillSwitch;
    setGlobalKillSwitch(newValue); // optimistic
    const { error } = await supabase.from("system_settings").update({ value: JSON.stringify(newValue) }).eq("key", "ai_global_kill_switch");
    if (error) { setGlobalKillSwitch(!newValue); toast.error("Failed to toggle kill switch"); return; }
    
    await supabase.from("audit_logs").insert({ action: newValue ? "ai_kill_switch_on" : "ai_kill_switch_off", entity_type: "system_settings", entity_id: "ai_global_kill_switch", actor_type: "admin", metadata: { new_value: newValue } });
    toast.success(newValue ? "🚨 AI KILL SWITCH ACTIVATED" : "✅ AI Kill Switch Deactivated");
  };

  const createModel = async () => {
    const insertData = { ...modelForm, pricing_input: Number(modelForm.pricing_input), pricing_output: Number(modelForm.pricing_output), max_tokens: Number(modelForm.max_tokens), rate_limit_rpm: Number(modelForm.rate_limit_rpm) };
    const { data, error } = await supabase.from("ai_models").insert(insertData).select().single();
    if (error) { toast.error("Failed to create model"); return; }
    setModels(prev => [data, ...prev]); // optimistic
    toast.success("Model created");
    setShowModelDialog(false);
    setModelForm({ name: "", provider: "openai", model_id: "", description: "", max_tokens: 4096, rate_limit_rpm: 60, pricing_input: 0, pricing_output: 0 });
  };

  const toggleModelStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "live" ? "paused" : "live";
    setModels(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m)); // optimistic
    await supabase.from("ai_models").update({ status: newStatus }).eq("id", id);
    await supabase.from("audit_logs").insert({ action: `model_status_${newStatus}`, entity_type: "ai_models", entity_id: id, actor_type: "admin" });
    toast.success(`Model ${newStatus}`);
  };

  const toggleModelKillSwitch = async (id: string, current: boolean) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, kill_switch: !current } : m)); // optimistic
    await supabase.from("ai_models").update({ kill_switch: !current }).eq("id", id);
    
    await supabase.from("audit_logs").insert({ action: !current ? "model_killed" : "model_unkilled", entity_type: "ai_models", entity_id: id, actor_type: "admin" });
    toast.success(!current ? "🚨 Model killed" : "Model restored");
  };

  const createPrompt = async () => {
    let vars;
    try { vars = JSON.parse(promptForm.variables); } catch { vars = []; }
    const { data, error } = await supabase.from("prompt_templates").insert({ ...promptForm, variables: vars }).select().single();
    if (error) { toast.error("Failed to create prompt"); return; }
    setPrompts(prev => [data, ...prev]); // optimistic
    toast.success("Prompt template created");
    setShowPromptDialog(false);
    setPromptForm({ name: "", description: "", category: "general", template: "", variables: "[]" });
  };

  const createSafetyRule = async () => {
    const { data, error } = await supabase.from("safety_rules").insert(safetyForm).select().single();
    if (error) { toast.error("Failed to create safety rule"); return; }
    setSafetyRules(prev => [data, ...prev]); // optimistic
    toast.success("Safety rule created");
    setShowSafetyDialog(false);
    setSafetyForm({ name: "", description: "", rule_type: "content_filter", pattern: "", action: "block", severity: "medium" });
  };

  const toggleSafetyRule = async (id: string, current: boolean) => {
    setSafetyRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r)); // optimistic
    await supabase.from("safety_rules").update({ is_active: !current }).eq("id", id);
    
    toast.success(!current ? "Rule activated" : "Rule deactivated");
  };

  const togglePromptActive = async (id: string, current: boolean) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p)); // optimistic
    await supabase.from("prompt_templates").update({ is_active: !current }).eq("id", id);
    
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "live": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "draft": return "bg-white/10 text-white/60 border-white/20";
      case "paused": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "deprecated": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "completed": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "failed": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "pending": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default: return "bg-white/10 text-white/60 border-white/20";
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  if (!loaded) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-white/40 text-sm">Data not loaded — click to fetch</p>
      <Button onClick={fetchCoreData} className="gap-1.5"><RefreshCw className="h-4 w-4" /> Load AI Control Data</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* GLOBAL KILL SWITCH */}
      <Card className={`border ${globalKillSwitch ? "border-red-500/50 bg-red-950/30" : "border-white/10 bg-white/5"}`}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Power className={`h-6 w-6 ${globalKillSwitch ? "text-red-400" : "text-emerald-400"}`} />
            <div>
              <h3 className="text-white font-semibold">Global AI Kill Switch</h3>
              <p className="text-white/50 text-xs">Emergency shutdown for all AI operations — takes effect in &lt;5s</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={globalKillSwitch ? "bg-red-500/30 text-red-300" : "bg-emerald-500/30 text-emerald-300"}>
              {globalKillSwitch ? "KILLED" : "OPERATIONAL"}
            </Badge>
            <Switch checked={globalKillSwitch} onCheckedChange={toggleKillSwitch} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1 flex-wrap">
          <TabsTrigger value="models" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" /> Models
          </TabsTrigger>
          <TabsTrigger value="prompts" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Prompts
          </TabsTrigger>
          <TabsTrigger value="safety" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Safety Rules
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" /> Requests
          </TabsTrigger>
          <TabsTrigger value="throttling" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Throttling
          </TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Token Usage
          </TabsTrigger>
        </TabsList>

        {/* MODELS TAB */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">AI Models ({models.length})</h3>
            <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Model</Button>
              </DialogTrigger>
              <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
                <DialogHeader><DialogTitle>Register AI Model</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Model name" value={modelForm.name} onChange={e => setModelForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Select value={modelForm.provider} onValueChange={v => setModelForm(p => ({ ...p, provider: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="lovable">Lovable AI</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Model ID (e.g. gpt-4o)" value={modelForm.model_id} onChange={e => setModelForm(p => ({ ...p, model_id: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Textarea placeholder="Description" value={modelForm.description} onChange={e => setModelForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Max tokens" value={modelForm.max_tokens} onChange={e => setModelForm(p => ({ ...p, max_tokens: Number(e.target.value) }))} className="bg-white/5 border-white/10 text-white" />
                    <Input type="number" placeholder="RPM limit" value={modelForm.rate_limit_rpm} onChange={e => setModelForm(p => ({ ...p, rate_limit_rpm: Number(e.target.value) }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.001" placeholder="$/1K input tokens" value={modelForm.pricing_input} onChange={e => setModelForm(p => ({ ...p, pricing_input: Number(e.target.value) }))} className="bg-white/5 border-white/10 text-white" />
                    <Input type="number" step="0.001" placeholder="$/1K output tokens" value={modelForm.pricing_output} onChange={e => setModelForm(p => ({ ...p, pricing_output: Number(e.target.value) }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <Button onClick={createModel} className="w-full">Register Model</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Model</TableHead>
                  <TableHead className="text-white/50">Provider</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Max Tokens</TableHead>
                  <TableHead className="text-white/50">Pricing (in/out)</TableHead>
                  <TableHead className="text-white/50">Kill</TableHead>
                  <TableHead className="text-white/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(m => (
                  <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium text-sm">{m.name}</p>
                        <p className="text-white/40 text-xs">{m.model_id}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-white/60 border-white/20 text-xs">{m.provider}</Badge></TableCell>
                    <TableCell><Badge className={`${statusColor(m.status)} text-xs`}>{m.status}</Badge></TableCell>
                    <TableCell className="text-white/60 text-xs">{m.max_tokens?.toLocaleString()}</TableCell>
                    <TableCell className="text-white/60 text-xs">${m.pricing_input}/${m.pricing_output}</TableCell>
                    <TableCell>
                      <Switch checked={m.kill_switch} onCheckedChange={() => toggleModelKillSwitch(m.id, m.kill_switch)} />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => toggleModelStatus(m.id, m.status)} className="text-white/50 hover:text-white text-xs h-7">
                        {m.status === "live" ? "Pause" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {models.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-white/40 py-8">No models registered</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* PROMPTS TAB */}
        <TabsContent value="prompts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Prompt Templates ({prompts.length})</h3>
            <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Template</Button>
              </DialogTrigger>
              <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
                <DialogHeader><DialogTitle>Create Prompt Template</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Template name" value={promptForm.name} onChange={e => setPromptForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Input placeholder="Description" value={promptForm.description} onChange={e => setPromptForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Select value={promptForm.category} onValueChange={v => setPromptForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="moderation">Moderation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Template content (use {{variable}} for variables)" value={promptForm.template} onChange={e => setPromptForm(p => ({ ...p, template: e.target.value }))} rows={6} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                  <Input placeholder='Variables JSON (e.g. ["name","topic"])' value={promptForm.variables} onChange={e => setPromptForm(p => ({ ...p, variables: e.target.value }))} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                  <Button onClick={createPrompt} className="w-full">Create Template</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {prompts.map(p => (
              <Card key={p.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium text-sm">{p.name}</h4>
                        <Badge variant="outline" className="text-white/40 border-white/20 text-[10px]">{p.category}</Badge>
                        <Badge className={p.is_active ? "bg-emerald-500/20 text-emerald-300 text-[10px]" : "bg-white/10 text-white/40 text-[10px]"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-white/40 text-xs mt-1">{p.description}</p>
                      <pre className="text-white/30 text-[10px] mt-2 bg-black/20 rounded p-2 max-h-20 overflow-auto font-mono">{p.template?.substring(0, 200)}{p.template?.length > 200 ? "..." : ""}</pre>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => togglePromptActive(p.id, p.is_active)} className="text-white/50 text-xs h-7">
                      {p.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {prompts.length === 0 && <p className="text-white/40 text-center py-8 text-sm">No prompt templates created</p>}
          </div>
        </TabsContent>

        {/* SAFETY RULES TAB */}
        <TabsContent value="safety" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Safety Rules ({safetyRules.length})</h3>
            <Dialog open={showSafetyDialog} onOpenChange={setShowSafetyDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
              </DialogTrigger>
              <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
                <DialogHeader><DialogTitle>Create Safety Rule</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Rule name" value={safetyForm.name} onChange={e => setSafetyForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Textarea placeholder="Description" value={safetyForm.description} onChange={e => setSafetyForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Select value={safetyForm.rule_type} onValueChange={v => setSafetyForm(p => ({ ...p, rule_type: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content_filter">Content Filter</SelectItem>
                      <SelectItem value="rate_abuse">Rate Abuse</SelectItem>
                      <SelectItem value="prompt_injection">Prompt Injection</SelectItem>
                      <SelectItem value="pii_detection">PII Detection</SelectItem>
                      <SelectItem value="toxicity">Toxicity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Pattern (regex or keyword)" value={safetyForm.pattern} onChange={e => setSafetyForm(p => ({ ...p, pattern: e.target.value }))} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={safetyForm.action} onValueChange={v => setSafetyForm(p => ({ ...p, action: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="warn">Warn</SelectItem>
                        <SelectItem value="flag">Flag</SelectItem>
                        <SelectItem value="sanitize">Sanitize</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={safetyForm.severity} onValueChange={v => setSafetyForm(p => ({ ...p, severity: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createSafetyRule} className="w-full">Create Rule</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {safetyRules.map(r => (
              <Card key={r.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 ${r.severity === "critical" ? "text-red-400" : r.severity === "high" ? "text-orange-400" : r.severity === "medium" ? "text-amber-400" : "text-white/40"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium text-sm">{r.name}</h4>
                        <Badge variant="outline" className="text-white/40 border-white/20 text-[10px]">{r.rule_type}</Badge>
                        <Badge className={`text-[10px] ${r.action === "block" ? "bg-red-500/20 text-red-300" : r.action === "warn" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>{r.action}</Badge>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{r.description}</p>
                      {r.pattern && <code className="text-white/30 text-[10px] mt-1 block font-mono">{r.pattern}</code>}
                    </div>
                  </div>
                  <Switch checked={r.is_active} onCheckedChange={() => toggleSafetyRule(r.id, r.is_active)} />
                </CardContent>
              </Card>
            ))}
            {safetyRules.length === 0 && <p className="text-white/40 text-center py-8 text-sm">No safety rules configured</p>}
          </div>
        </TabsContent>

        {/* REQUESTS TAB */}
        <TabsContent value="requests" className="space-y-4">
          <h3 className="text-white font-semibold">Recent AI Requests ({aiRequests.length})</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Time</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Tokens</TableHead>
                  <TableHead className="text-white/50">Cost</TableHead>
                  <TableHead className="text-white/50">Latency</TableHead>
                  <TableHead className="text-white/50">Safety</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiRequests.map(r => (
                  <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/60 text-xs">{format(new Date(r.created_at), "MMM d HH:mm:ss")}</TableCell>
                    <TableCell><Badge className={`${statusColor(r.status)} text-[10px]`}>{r.status}</Badge></TableCell>
                    <TableCell className="text-white/60 text-xs">{r.total_tokens?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-white/60 text-xs">${(Number(r.cost_cents) / 100).toFixed(4)}</TableCell>
                    <TableCell className="text-white/60 text-xs">{r.latency_ms ? `${r.latency_ms}ms` : "—"}</TableCell>
                    <TableCell>{r.safety_flagged ? <Badge className="bg-red-500/20 text-red-300 text-[10px]">Flagged</Badge> : <span className="text-white/30 text-xs">—</span>}</TableCell>
                  </TableRow>
                ))}
                {aiRequests.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-white/40 py-8">No AI requests yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* THROTTLING TAB */}
        <TabsContent value="throttling" className="space-y-4">
          <h3 className="text-white font-semibold">Rate Limits ({rateLimits.length})</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Entity</TableHead>
                  <TableHead className="text-white/50">RPM</TableHead>
                  <TableHead className="text-white/50">RPH</TableHead>
                  <TableHead className="text-white/50">RPD</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateLimits.map(r => (
                  <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white text-xs">{r.entity_type} / {r.entity_id?.substring(0, 8)}</TableCell>
                    <TableCell className="text-white/60 text-xs">{r.current_minute_count}/{r.requests_per_minute}</TableCell>
                    <TableCell className="text-white/60 text-xs">{r.current_hour_count}/{r.requests_per_hour}</TableCell>
                    <TableCell className="text-white/60 text-xs">{r.current_day_count}/{r.requests_per_day}</TableCell>
                    <TableCell>
                      <Badge className={r.is_blocked ? "bg-red-500/20 text-red-300 text-[10px]" : "bg-emerald-500/20 text-emerald-300 text-[10px]"}>
                        {r.is_blocked ? "Blocked" : "OK"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rateLimits.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-8">No rate limits configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TOKEN USAGE TAB */}
        <TabsContent value="usage" className="space-y-4">
          <h3 className="text-white font-semibold">Token Buckets ({tokenBuckets.length})</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Entity</TableHead>
                  <TableHead className="text-white/50">Today</TableHead>
                  <TableHead className="text-white/50">Month</TableHead>
                  <TableHead className="text-white/50">Throttled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenBuckets.map(b => (
                  <TableRow key={b.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white text-xs">{b.entity_type} / {b.entity_id?.substring(0, 8)}</TableCell>
                    <TableCell className="text-white/60 text-xs">{b.tokens_used_today?.toLocaleString()}/{b.max_tokens_per_day?.toLocaleString()}</TableCell>
                    <TableCell className="text-white/60 text-xs">{b.tokens_used_month?.toLocaleString()}/{b.max_tokens_per_month?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={b.is_throttled ? "bg-red-500/20 text-red-300 text-[10px]" : "bg-emerald-500/20 text-emerald-300 text-[10px]"}>
                        {b.is_throttled ? "Throttled" : "OK"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {tokenBuckets.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-white/40 py-8">No token buckets configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIControlPanel;

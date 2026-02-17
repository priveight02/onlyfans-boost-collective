import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cachedFetch, invalidateNamespace } from "@/lib/supabaseCache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Settings, Activity, Webhook, Briefcase, Plus, RefreshCw, Power, Shield } from "lucide-react";
import { format } from "date-fns";

const CACHE_ID = "admin";
const CACHE_TTL = 5 * 60 * 1000;

const SystemOpsPanel = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [adminSessions, setAdminSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("settings");
  const loadedTabs = useRef<Set<string>>(new Set(["settings"]));
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ name: "", url: "", events: "" });
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback((fn: () => void) => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(fn, 2000);
  }, []);

  const fetchSettings = useCallback(async () => {
    const data = await cachedFetch<any[]>(CACHE_ID, "system_settings", async () => {
      const { data } = await supabase.from("system_settings").select("*").order("category").order("key"); return data || [];
    },
      undefined, { ttlMs: CACHE_TTL }
    );
    setSettings(data);
  }, []);

  const fetchTabData = useCallback(async (tab: string) => {
    if (loadedTabs.current.has(tab)) return;
    loadedTabs.current.add(tab);
    switch (tab) {
      case "health": {
        const data = await cachedFetch<any[]>(CACHE_ID, "system_health", async () => {
          const { data } = await supabase.from("system_health").select("*").order("recorded_at", { ascending: false }).limit(10); return data || [];
        }, undefined, { ttlMs: 60_000 }
        );
        setHealthMetrics(data);
        break;
      }
      case "jobs": {
        const data = await cachedFetch<any[]>(CACHE_ID, "system_jobs", async () => {
          const { data } = await supabase.from("system_jobs").select("*").order("created_at", { ascending: false }).limit(10); return data || [];
        }, undefined, { ttlMs: CACHE_TTL }
        );
        setJobs(data);
        break;
      }
      case "webhooks": {
        const [wh, del] = await Promise.all([
          cachedFetch<any[]>(CACHE_ID, "webhooks", async () => {
            const { data } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false }); return data || [];
          }, undefined, { ttlMs: CACHE_TTL }),
          cachedFetch<any[]>(CACHE_ID, "webhook_deliveries", async () => {
            const { data } = await supabase.from("webhook_deliveries").select("*").order("created_at", { ascending: false }).limit(10); return data || [];
          }, undefined, { ttlMs: 60_000 }
          ),
        ]);
        setWebhooks(wh);
        setDeliveries(del);
        break;
      }
      case "sessions": {
        const data = await cachedFetch<any[]>(CACHE_ID, "admin_sessions", async () => {
          const { data } = await supabase.from("admin_sessions").select("*").order("started_at", { ascending: false }).limit(10); return data || [];
        }, undefined, { ttlMs: CACHE_TTL }
        );
        setAdminSessions(data);
        break;
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSettings();
      setLoading(false);
    })();
    const channel = supabase.channel("system-ops-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_settings" }, () => {
        debouncedRefresh(() => { invalidateNamespace(CACHE_ID, "system_settings"); fetchSettings(); });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_health" }, (payload) => {
        setHealthMetrics(prev => [payload.new as any, ...prev].slice(0, 30));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); if (realtimeTimer.current) clearTimeout(realtimeTimer.current); };
  }, [fetchSettings, debouncedRefresh]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const updateSetting = async (key: string, value: string) => {
    const parsed = value === "true" || value === "false" ? JSON.parse(value) : value;
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: parsed } : s)); // optimistic
    await Promise.all([
      supabase.from("system_settings").update({ value: JSON.stringify(parsed) }).eq("key", key),
      supabase.from("audit_logs").insert({ action: "system_setting_updated", entity_type: "system_settings", entity_id: key, actor_type: "admin", after_state: { value: parsed } }),
    ]);
    invalidateNamespace(CACHE_ID, "system_settings");
    toast.success(`Setting "${key}" updated`);
    setEditingSetting(null);
  };

  const createWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) { toast.error("Name and URL required"); return; }
    let events;
    try { events = JSON.parse(webhookForm.events || "[]"); } catch { events = webhookForm.events.split(",").map(s => s.trim()); }
    const { data, error } = await supabase.from("webhooks").insert({ ...webhookForm, events }).select().single();
    if (error) { toast.error(error.message); return; }
    setWebhooks(prev => [data, ...prev]); // optimistic
    invalidateNamespace(CACHE_ID, "webhooks");
    toast.success("Webhook created");
    setShowWebhookDialog(false);
    setWebhookForm({ name: "", url: "", events: "" });
  };

  const toggleWebhook = async (id: string, current: boolean) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: !current } : w)); // optimistic
    await supabase.from("webhooks").update({ is_active: !current }).eq("id", id);
    invalidateNamespace(CACHE_ID, "webhooks");
    toast.success(!current ? "Webhook enabled" : "Webhook disabled");
  };

  const healthColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-emerald-400";
      case "degraded": return "text-amber-400";
      case "critical": return "text-red-400";
      default: return "text-white/40";
    }
  };

  const jobStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-500/20 text-emerald-300";
      case "queued": return "bg-blue-500/20 text-blue-300";
      case "running": return "bg-amber-500/20 text-amber-300";
      case "failed": return "bg-red-500/20 text-red-300";
      default: return "bg-white/10 text-white/50";
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1 flex-wrap">
          <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" /> Settings & Kill Switches
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" /> System Health
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Briefcase className="h-3.5 w-3.5" /> Jobs
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Webhook className="h-3.5 w-3.5" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Admin Sessions
          </TabsTrigger>
        </TabsList>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">System Settings & Kill Switches</h3>
            <Button size="sm" variant="outline" onClick={() => { invalidateNamespace(CACHE_ID, "system_settings"); loadedTabs.current.delete("settings"); fetchSettings(); }} className="border-white/10 text-white/60 gap-1.5 text-xs">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
          <div className="grid gap-3">
            {settings.map(s => {
              const isBoolean = s.value === "true" || s.value === "false" || s.value === true || s.value === false;
              const boolVal = s.value === "true" || s.value === true;
              const isKill = s.key.includes("kill") || s.key.includes("readonly") || s.key.includes("maintenance");
              return (
                <Card key={s.id} className={`border ${isKill && boolVal ? "border-red-500/30 bg-red-950/20" : "border-white/10 bg-white/5"}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isKill ? <Power className={`h-4 w-4 ${boolVal ? "text-red-400" : "text-white/30"}`} /> : <Settings className="h-4 w-4 text-white/30" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-white text-xs font-mono">{s.key}</code>
                          <Badge variant="outline" className="text-white/30 border-white/15 text-[10px]">{s.category}</Badge>
                        </div>
                        {s.description && <p className="text-white/40 text-xs mt-0.5">{s.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isBoolean ? (
                        <Switch checked={boolVal} onCheckedChange={() => updateSetting(s.key, String(!boolVal))} />
                      ) : editingSetting === s.key ? (
                        <div className="flex gap-1">
                          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="bg-white/5 border-white/10 text-white w-32 h-7 text-xs" onKeyDown={e => e.key === "Enter" && updateSetting(s.key, editValue)} />
                          <Button size="sm" onClick={() => updateSetting(s.key, editValue)} className="h-7 text-xs">Save</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setEditingSetting(s.key); setEditValue(typeof s.value === "string" ? s.value : JSON.stringify(s.value)); }} className="text-white/50 text-xs h-7 font-mono">
                          {typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* HEALTH */}
        <TabsContent value="health" className="space-y-4">
          <h3 className="text-white font-semibold">System Health Metrics</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Service</TableHead>
                  <TableHead className="text-white/50">Metric</TableHead>
                  <TableHead className="text-white/50">Value</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthMetrics.map(h => (
                  <TableRow key={h.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white text-xs font-medium">{h.service}</TableCell>
                    <TableCell className="text-white/60 text-xs">{h.metric_name}</TableCell>
                    <TableCell className="text-white/60 text-xs font-mono">{h.metric_value}{h.unit}</TableCell>
                    <TableCell><span className={`text-xs font-medium ${healthColor(h.status)}`}>● {h.status}</span></TableCell>
                    <TableCell className="text-white/40 text-xs">{format(new Date(h.recorded_at), "HH:mm:ss")}</TableCell>
                  </TableRow>
                ))}
                {healthMetrics.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-8">No health metrics recorded</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* JOBS */}
        <TabsContent value="jobs" className="space-y-4">
          <h3 className="text-white font-semibold">Background Jobs ({jobs.length})</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Type</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Priority</TableHead>
                  <TableHead className="text-white/50">Retries</TableHead>
                  <TableHead className="text-white/50">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(j => (
                  <TableRow key={j.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white text-xs font-mono">{j.job_type}</TableCell>
                    <TableCell><Badge className={`${jobStatusColor(j.status)} text-[10px]`}>{j.status}</Badge></TableCell>
                    <TableCell className="text-white/60 text-xs">{j.priority}</TableCell>
                    <TableCell className="text-white/60 text-xs">{j.retry_count}/{j.max_retries}</TableCell>
                    <TableCell className="text-white/40 text-xs">{format(new Date(j.created_at), "MMM d HH:mm")}</TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-8">No background jobs</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Webhooks ({webhooks.length})</h3>
            <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Webhook</Button></DialogTrigger>
              <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
                <DialogHeader><DialogTitle>Create Webhook</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Webhook name" value={webhookForm.name} onChange={e => setWebhookForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Input placeholder="Endpoint URL" value={webhookForm.url} onChange={e => setWebhookForm(p => ({ ...p, url: e.target.value }))} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                  <Input placeholder='Events (comma-separated or JSON array)' value={webhookForm.events} onChange={e => setWebhookForm(p => ({ ...p, events: e.target.value }))} className="bg-white/5 border-white/10 text-white text-xs" />
                  <Button onClick={createWebhook} className="w-full">Create Webhook</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {webhooks.map(w => (
              <Card key={w.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Webhook className="h-3.5 w-3.5 text-white/40" />
                      <h4 className="text-white font-medium text-sm">{w.name}</h4>
                    </div>
                    <code className="text-white/30 text-[10px] font-mono mt-0.5 block">{w.url}</code>
                    <div className="flex gap-1 mt-1">
                      {(Array.isArray(w.events) ? w.events : []).map((e: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-white/30 border-white/15 text-[10px]">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <Switch checked={w.is_active} onCheckedChange={() => toggleWebhook(w.id, w.is_active)} />
                </CardContent>
              </Card>
            ))}
            {webhooks.length === 0 && <p className="text-white/40 text-center py-8 text-sm">No webhooks configured</p>}
          </div>

          {deliveries.length > 0 && (
            <>
              <h4 className="text-white/60 font-medium text-sm mt-6">Recent Deliveries</h4>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/50">Event</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                      <TableHead className="text-white/50">Response</TableHead>
                      <TableHead className="text-white/50">Attempt</TableHead>
                      <TableHead className="text-white/50">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map(d => (
                      <TableRow key={d.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white/60 text-xs">{d.event_type}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${d.status === "delivered" ? "bg-emerald-500/20 text-emerald-300" : d.status === "failed" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>{d.status}</Badge></TableCell>
                        <TableCell className="text-white/60 text-xs">{d.response_status || "—"}</TableCell>
                        <TableCell className="text-white/60 text-xs">#{d.attempt_number}</TableCell>
                        <TableCell className="text-white/40 text-xs">{format(new Date(d.created_at), "HH:mm:ss")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ADMIN SESSIONS */}
        <TabsContent value="sessions" className="space-y-4">
          <h3 className="text-white font-semibold">Admin Sessions</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Admin</TableHead>
                  <TableHead className="text-white/50">IP</TableHead>
                  <TableHead className="text-white/50">MFA</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Started</TableHead>
                  <TableHead className="text-white/50">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminSessions.map(s => (
                  <TableRow key={s.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white text-xs font-mono">{s.admin_id?.substring(0, 8)}</TableCell>
                    <TableCell className="text-white/60 text-xs">{s.ip_address || "—"}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${s.mfa_verified ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>{s.mfa_verified ? "Verified" : "No"}</Badge></TableCell>
                    <TableCell><Badge className={`text-[10px] ${s.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"}`}>{s.is_active ? "Active" : "Ended"}</Badge></TableCell>
                    <TableCell className="text-white/60 text-xs">{format(new Date(s.started_at), "MMM d HH:mm")}</TableCell>
                    <TableCell className="text-white/40 text-xs">{format(new Date(s.last_active_at), "HH:mm:ss")}</TableCell>
                  </TableRow>
                ))}
                {adminSessions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-white/40 py-8">No admin sessions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemOpsPanel;

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cachedFetch, invalidateNamespace } from "@/lib/supabaseCache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Flag, Plus, FlaskConical, BarChart3, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CACHE_ID = "admin";
const CACHE_TTL = 5 * 60 * 1000;

const FeatureFlagsPanel = () => {
  const [flags, setFlags] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("flags");
  const loadedTabs = useRef<Set<string>>(new Set(["flags"]));
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showExperimentDialog, setShowExperimentDialog] = useState(false);
  const [flagForm, setFlagForm] = useState({ key: "", name: "", description: "", flag_type: "boolean", percentage_rollout: 0 });
  const [experimentForm, setExperimentForm] = useState({ name: "", description: "", hypothesis: "", success_metric: "", flag_id: "" });

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback((fn: () => void) => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(fn, 2000);
  }, []);

  const fetchFlags = useCallback(async () => {
    const data = await cachedFetch<any[]>(CACHE_ID, "feature_flags", async () => {
      const { data } = await supabase.from("feature_flags").select("*").is("archived_at", null).order("created_at", { ascending: false }); return data || [];
    }, undefined, { ttlMs: CACHE_TTL }
    );
    setFlags(data);
  }, []);

  const fetchTabData = useCallback(async (tab: string) => {
    if (loadedTabs.current.has(tab)) return;
    loadedTabs.current.add(tab);
    if (tab === "experiments") {
      const data = await cachedFetch<any[]>(CACHE_ID, "experiments", async () => {
        const { data } = await supabase.from("experiments").select("*").order("created_at", { ascending: false }); return data || [];
      }, undefined, { ttlMs: CACHE_TTL }
      );
      setExperiments(data);
    } else if (tab === "evaluations") {
      const data = await cachedFetch<any[]>(CACHE_ID, "flag_evaluations", async () => {
        const { data } = await supabase.from("feature_flag_evaluations").select("*").order("evaluated_at", { ascending: false }).limit(50); return data || [];
      }, undefined, { ttlMs: 60_000 }
      );
      setEvaluations(data);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchFlags();
      setLoading(false);
    })();
    const channel = supabase.channel("flags-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => {
        debouncedRefresh(() => { invalidateNamespace(CACHE_ID, "feature_flags"); fetchFlags(); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); if (realtimeTimer.current) clearTimeout(realtimeTimer.current); };
  }, [fetchFlags, debouncedRefresh]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const createFlag = async () => {
    if (!flagForm.key || !flagForm.name) { toast.error("Key and name required"); return; }
    const { data, error } = await supabase.from("feature_flags").insert({
      ...flagForm, percentage_rollout: Number(flagForm.percentage_rollout), default_value: JSON.stringify(false),
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setFlags(prev => [data, ...prev]); // optimistic
    invalidateNamespace(CACHE_ID, "feature_flags");
    // Batch audit log — no separate fetch
    await supabase.from("audit_logs").insert({ action: "feature_flag_created", entity_type: "feature_flags", entity_id: flagForm.key, actor_type: "admin", metadata: { flag_key: flagForm.key } });
    toast.success("Feature flag created");
    setShowFlagDialog(false);
    setFlagForm({ key: "", name: "", description: "", flag_type: "boolean", percentage_rollout: 0 });
  };

  const toggleFlag = async (id: string, current: boolean, key: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !current } : f)); // optimistic
    await supabase.from("feature_flags").update({ enabled: !current }).eq("id", id);
    invalidateNamespace(CACHE_ID, "feature_flags");
    await supabase.from("audit_logs").insert({ action: !current ? "feature_flag_enabled" : "feature_flag_disabled", entity_type: "feature_flags", entity_id: key, actor_type: "admin" });
    toast.success(!current ? `Flag "${key}" enabled` : `Flag "${key}" disabled`);
  };

  const updateRollout = async (id: string, value: number) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, percentage_rollout: value } : f)); // optimistic
    await supabase.from("feature_flags").update({ percentage_rollout: value }).eq("id", id);
    invalidateNamespace(CACHE_ID, "feature_flags");
  };

  const archiveFlag = async (id: string) => {
    setFlags(prev => prev.filter(f => f.id !== id)); // optimistic
    await supabase.from("feature_flags").update({ archived_at: new Date().toISOString() }).eq("id", id);
    invalidateNamespace(CACHE_ID, "feature_flags");
    toast.success("Flag archived");
  };

  const createExperiment = async () => {
    if (!experimentForm.name) { toast.error("Name required"); return; }
    const insert: any = { ...experimentForm };
    if (!insert.flag_id) delete insert.flag_id;
    const { data, error } = await supabase.from("experiments").insert(insert).select().single();
    if (error) { toast.error(error.message); return; }
    setExperiments(prev => [data, ...prev]); // optimistic
    invalidateNamespace(CACHE_ID, "experiments");
    toast.success("Experiment created");
    setShowExperimentDialog(false);
    setExperimentForm({ name: "", description: "", hypothesis: "", success_metric: "", flag_id: "" });
  };

  const updateExperimentStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "running") updates.started_at = new Date().toISOString();
    if (status === "completed") updates.ended_at = new Date().toISOString();
    setExperiments(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e)); // optimistic
    await supabase.from("experiments").update(updates).eq("id", id);
    invalidateNamespace(CACHE_ID, "experiments");
    toast.success(`Experiment ${status}`);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="flags" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Flag className="h-3.5 w-3.5" /> Feature Flags
          </TabsTrigger>
          <TabsTrigger value="experiments" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <FlaskConical className="h-3.5 w-3.5" /> Experiments
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Evaluation Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Feature Flags ({flags.length})</h3>
            <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Flag</Button></DialogTrigger>
              <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
                <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Flag key (e.g. new_dashboard_v2)" value={flagForm.key} onChange={e => setFlagForm(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s/g, "_") }))} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                  <Input placeholder="Display name" value={flagForm.name} onChange={e => setFlagForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Textarea placeholder="Description" value={flagForm.description} onChange={e => setFlagForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Select value={flagForm.flag_type} onValueChange={v => setFlagForm(p => ({ ...p, flag_type: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="percentage">Percentage Rollout</SelectItem>
                      <SelectItem value="targeting">User/Org Targeting</SelectItem>
                    </SelectContent>
                  </Select>
                  {flagForm.flag_type === "percentage" && (
                    <div className="space-y-2">
                      <label className="text-white/50 text-xs">Rollout: {flagForm.percentage_rollout}%</label>
                      <Slider value={[flagForm.percentage_rollout]} onValueChange={([v]) => setFlagForm(p => ({ ...p, percentage_rollout: v }))} max={100} step={1} />
                    </div>
                  )}
                  <Button onClick={createFlag} className="w-full">Create Flag</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {flags.map(f => (
              <Card key={f.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-accent text-xs font-mono">{f.key}</code>
                      <Badge variant="outline" className="text-white/40 border-white/20 text-[10px]">{f.flag_type}</Badge>
                      {f.flag_type === "percentage" && <Badge className="bg-blue-500/20 text-blue-300 text-[10px]">{f.percentage_rollout}%</Badge>}
                    </div>
                    <p className="text-white font-medium text-sm mt-1">{f.name}</p>
                    {f.description && <p className="text-white/40 text-xs mt-0.5">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {f.flag_type === "percentage" && (
                      <div className="w-32">
                        <Slider value={[f.percentage_rollout]} onValueChange={([v]) => updateRollout(f.id, v)} max={100} step={1} />
                      </div>
                    )}
                    <Switch checked={f.enabled} onCheckedChange={() => toggleFlag(f.id, f.enabled, f.key)} />
                    <Button size="sm" variant="ghost" onClick={() => archiveFlag(f.id)} className="text-white/30 hover:text-red-400 h-7 w-7 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {flags.length === 0 && <p className="text-white/40 text-center py-8 text-sm">No feature flags created</p>}
          </div>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Experiments ({experiments.length})</h3>
            <Dialog open={showExperimentDialog} onOpenChange={setShowExperimentDialog}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Experiment</Button></DialogTrigger>
              <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
                <DialogHeader><DialogTitle>Create Experiment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Experiment name" value={experimentForm.name} onChange={e => setExperimentForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Textarea placeholder="Description" value={experimentForm.description} onChange={e => setExperimentForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Textarea placeholder="Hypothesis" value={experimentForm.hypothesis} onChange={e => setExperimentForm(p => ({ ...p, hypothesis: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  <Input placeholder="Success metric" value={experimentForm.success_metric} onChange={e => setExperimentForm(p => ({ ...p, success_metric: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  {flags.length > 0 && (
                    <Select value={experimentForm.flag_id} onValueChange={v => setExperimentForm(p => ({ ...p, flag_id: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Link to flag (optional)" /></SelectTrigger>
                      <SelectContent>
                        {flags.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.key})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={createExperiment} className="w-full">Create Experiment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {experiments.map(e => (
              <Card key={e.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium text-sm">{e.name}</h4>
                        <Badge className={`text-[10px] ${e.status === "running" ? "bg-emerald-500/20 text-emerald-300" : e.status === "completed" ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/50"}`}>
                          {e.status}
                        </Badge>
                        {e.auto_rollback_on_error && <Badge variant="outline" className="text-amber-300 border-amber-500/30 text-[10px]">Auto-rollback</Badge>}
                      </div>
                      {e.hypothesis && <p className="text-white/40 text-xs mt-1">Hypothesis: {e.hypothesis}</p>}
                      {e.success_metric && <p className="text-white/30 text-xs mt-0.5">Metric: {e.success_metric}</p>}
                    </div>
                    <div className="flex gap-1">
                      {e.status === "draft" && <Button size="sm" onClick={() => updateExperimentStatus(e.id, "running")} className="text-xs h-7">Start</Button>}
                      {e.status === "running" && <Button size="sm" variant="destructive" onClick={() => updateExperimentStatus(e.id, "completed")} className="text-xs h-7">End</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {experiments.length === 0 && <p className="text-white/40 text-center py-8 text-sm">No experiments created</p>}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <h3 className="text-white font-semibold">Recent Evaluations ({evaluations.length})</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Time</TableHead>
                  <TableHead className="text-white/50">Flag</TableHead>
                  <TableHead className="text-white/50">User</TableHead>
                  <TableHead className="text-white/50">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map(e => (
                  <TableRow key={e.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/60 text-xs">{format(new Date(e.evaluated_at), "MMM d HH:mm:ss")}</TableCell>
                    <TableCell className="text-white/60 text-xs font-mono">{e.flag_id?.substring(0, 8)}</TableCell>
                    <TableCell className="text-white/60 text-xs">{e.user_id?.substring(0, 8) || "—"}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${e.result ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{e.result ? "TRUE" : "FALSE"}</Badge></TableCell>
                  </TableRow>
                ))}
                {evaluations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-white/40 py-8">No evaluations logged</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeatureFlagsPanel;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Zap, Plus, Play, Pause, Trash2, GitBranch, Clock, Target, Users,
  ArrowRight, Activity, CheckCircle, XCircle, AlertTriangle, Settings,
  BarChart3, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TRIGGER_TYPES = [
  { value: "user_join", label: "User Joins", icon: Users, description: "When a new subscriber joins" },
  { value: "user_inactive", label: "User Inactive", icon: Clock, description: "When user becomes inactive" },
  { value: "purchase", label: "After Purchase", icon: Target, description: "After a purchase is made" },
  { value: "campaign", label: "Campaign Launch", icon: Zap, description: "When a campaign starts" },
  { value: "manual", label: "Manual Trigger", icon: Play, description: "Triggered manually" },
  { value: "schedule", label: "Scheduled", icon: Clock, description: "At scheduled intervals" },
  { value: "kpi_threshold", label: "KPI Threshold", icon: BarChart3, description: "When a KPI exceeds threshold" },
];

const WorkflowEngine = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    title: "",
    description: "",
    trigger_type: "manual",
    script_id: "",
    account_id: "",
    conditions: [] as any[],
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [w, s, a, r] = await Promise.all([
      supabase.from("automation_workflows").select("*").order("created_at", { ascending: false }),
      supabase.from("scripts").select("id, title, status"),
      supabase.from("managed_accounts").select("id, username, display_name"),
      supabase.from("workflow_runs").select("*").order("started_at", { ascending: false }).limit(50),
    ]);
    setWorkflows(w.data || []);
    setScripts(s.data || []);
    setAccounts(a.data || []);
    setRuns(r.data || []);
  };

  const createWorkflow = async () => {
    if (!newWorkflow.title.trim()) return toast.error("Title is required");
    const { error } = await supabase.from("automation_workflows").insert({
      title: newWorkflow.title,
      description: newWorkflow.description,
      trigger_type: newWorkflow.trigger_type,
      script_id: newWorkflow.script_id || null,
      account_id: newWorkflow.account_id || null,
      conditions: newWorkflow.conditions,
    });
    if (error) return toast.error(error.message);
    toast.success("Workflow created");
    setShowCreate(false);
    setNewWorkflow({ title: "", description: "", trigger_type: "manual", script_id: "", account_id: "", conditions: [] });
    loadAll();
  };

  const toggleWorkflow = async (id: string, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    await supabase.from("automation_workflows").update({ status: newStatus }).eq("id", id);
    toast.success(`Workflow ${newStatus}`);
    loadAll();
  };

  const deleteWorkflow = async (id: string) => {
    await supabase.from("automation_workflows").delete().eq("id", id);
    toast.success("Workflow deleted");
    loadAll();
  };

  const runWorkflow = async (workflow: any) => {
    const { error } = await supabase.from("workflow_runs").insert({
      workflow_id: workflow.id,
      script_id: workflow.script_id,
      account_id: workflow.account_id,
      status: "completed",
      completed_at: new Date().toISOString(),
      result: { triggered_by: "manual", timestamp: new Date().toISOString() },
    });
    if (!error) {
      await supabase.from("automation_workflows").update({
        total_runs: (workflow.total_runs || 0) + 1,
        last_run_at: new Date().toISOString(),
      }).eq("id", workflow.id);
      toast.success("Workflow executed");
      loadAll();
    }
  };

  const getWorkflowRuns = (id: string) => runs.filter(r => r.workflow_id === id);

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === "active").length,
    totalRuns: workflows.reduce((s, w) => s + (w.total_runs || 0), 0),
    recentRuns: runs.length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Workflows", value: stats.total, icon: GitBranch, color: "text-blue-400" },
          { title: "Active", value: stats.active, icon: Zap, color: "text-emerald-400" },
          { title: "Total Runs", value: stats.totalRuns, icon: Activity, color: "text-purple-400" },
          { title: "Recent Runs", value: stats.recentRuns, icon: Clock, color: "text-amber-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white">Automation Workflows</h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/80"><Plus className="h-3.5 w-3.5" /> New Workflow</Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-lg">
            <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Workflow title" value={newWorkflow.title} onChange={e => setNewWorkflow(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Description" value={newWorkflow.description} onChange={e => setNewWorkflow(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />

              {/* Trigger type */}
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Trigger Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TRIGGER_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setNewWorkflow(p => ({ ...p, trigger_type: t.value }))}
                      className={`p-2 rounded-lg border text-left text-xs transition-all ${
                        newWorkflow.trigger_type === t.value
                          ? "bg-accent/10 border-accent/30 text-white"
                          : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60"
                      }`}
                    >
                      <t.icon className="h-3 w-3 mb-0.5" />
                      <p className="font-medium">{t.label}</p>
                      <p className="text-[9px] opacity-60">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Link Script (optional)</label>
                  <Select value={newWorkflow.script_id} onValueChange={v => setNewWorkflow(p => ({ ...p, script_id: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue placeholder="Select script" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                      {scripts.map(s => <SelectItem key={s.id} value={s.id} className="text-white text-xs">{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Account (optional)</label>
                  <Select value={newWorkflow.account_id} onValueChange={v => setNewWorkflow(p => ({ ...p, account_id: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                      {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-white text-xs">{a.display_name || a.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={createWorkflow} className="w-full bg-accent hover:bg-accent/80">Create Workflow</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflow list */}
      <div className="space-y-3">
        {workflows.map(wf => {
          const trigger = TRIGGER_TYPES.find(t => t.value === wf.trigger_type) || TRIGGER_TYPES[4];
          const TriggerIcon = trigger.icon;
          const wfRuns = getWorkflowRuns(wf.id);
          const linkedScript = scripts.find(s => s.id === wf.script_id);
          const linkedAccount = accounts.find(a => a.id === wf.account_id);

          return (
            <Card key={wf.id} className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-white/5 ${wf.status === "active" ? "text-emerald-400" : "text-white/30"}`}>
                    <TriggerIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{wf.title}</p>
                      <Badge variant="outline" className={`text-[9px] ${wf.status === "active" ? "border-emerald-500/20 text-emerald-400" : "border-white/10 text-white/40"}`}>
                        {wf.status}
                      </Badge>
                    </div>
                    {wf.description && <p className="text-[10px] text-white/30 mt-0.5">{wf.description}</p>}

                    {/* Visual flow */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px] border-blue-500/20 text-blue-400 gap-1">
                        <TriggerIcon className="h-2.5 w-2.5" />{trigger.label}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-white/15" />
                      {linkedScript && (
                        <>
                          <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400">{linkedScript.title}</Badge>
                          <ArrowRight className="h-3 w-3 text-white/15" />
                        </>
                      )}
                      {linkedAccount && (
                        <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{linkedAccount.display_name || linkedAccount.username}</Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-400 gap-1">
                        <CheckCircle className="h-2.5 w-2.5" /> Execute
                      </Badge>
                    </div>

                    {/* Run stats */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-white/30">{wf.total_runs || 0} runs</span>
                      {wf.last_run_at && <span className="text-[10px] text-white/30">Last: {new Date(wf.last_run_at).toLocaleDateString()}</span>}
                      <span className="text-[10px] text-white/30">Success: {Number(wf.success_rate || 0).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => runWorkflow(wf)} className="h-7 text-[10px] text-accent gap-1">
                      <Play className="h-3 w-3" /> Run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleWorkflow(wf.id, wf.status)} className="h-7 text-[10px] text-white/40">
                      {wf.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteWorkflow(wf.id)} className="h-7 text-[10px] text-red-400/50 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {workflows.length === 0 && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="py-12 text-center">
            <GitBranch className="h-8 w-8 text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No workflows yet. Create one to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent runs */}
      {runs.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-blue-400" /> Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {runs.slice(0, 15).map(run => {
                const wf = workflows.find(w => w.id === run.workflow_id);
                return (
                  <div key={run.id} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                    {run.status === "completed" ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : run.status === "failed" ? <XCircle className="h-3 w-3 text-red-400" /> : <Clock className="h-3 w-3 text-amber-400" />}
                    <span className="text-xs text-white flex-1">{wf?.title || "Unknown workflow"}</span>
                    <Badge variant="outline" className={`text-[9px] ${run.status === "completed" ? "border-emerald-500/20 text-emerald-400" : "border-red-500/20 text-red-400"}`}>{run.status}</Badge>
                    <span className="text-[10px] text-white/30">{new Date(run.started_at).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkflowEngine;

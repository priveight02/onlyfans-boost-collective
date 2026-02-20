import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Plus, ListTodo, Trash2, Edit, Flame, ArrowUp, ArrowDown, Minus, CalendarDays, User, Tag, Filter, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";

const priorityConfig: Record<string, { label: string; icon: any; color: string; badgeClass: string }> = {
  urgent: { label: "Urgent", icon: Flame, color: "text-red-400", badgeClass: "bg-red-500/15 text-red-400 border-red-500/20" },
  high: { label: "High", icon: ArrowUp, color: "text-orange-400", badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  medium: { label: "Medium", icon: Minus, color: "text-[hsl(217,91%,60%)]", badgeClass: "bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)] border-[hsl(217,91%,60%)]/20" },
  low: { label: "Low", icon: ArrowDown, color: "text-white/40", badgeClass: "bg-white/[0.04] text-white/40 border-white/[0.06]" },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  todo: { label: "To Do", color: "bg-slate-400", bgColor: "bg-slate-400/10" },
  in_progress: { label: "In Progress", color: "bg-[hsl(217,91%,60%)]", bgColor: "bg-[hsl(217,91%,60%)]/10" },
  done: { label: "Done", color: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
  blocked: { label: "Blocked", color: "bg-red-500", bgColor: "bg-red-500/10" },
  review: { label: "Review", color: "bg-purple-500", bgColor: "bg-purple-500/10" },
};

const TaskWorkflow = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", assigned_to: "", account_id: "", due_date: "", tags: "" });
  const { performAction, insufficientModal, closeInsufficientModal } = useCreditAction();

  useEffect(() => {
    loadAll();
    const channel = supabase.channel("tasks-rt-v2").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadAll()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAll = async () => {
    const [t, a, m] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name"),
      supabase.from("team_members").select("id, name, role"),
    ]);
    setTasks(t.data || []); setAccounts(a.data || []); setTeamMembers(m.data || []);
  };

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== "all" && t.assigned_to !== assigneeFilter) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q); }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const pDiff = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    if (pDiff !== 0) return pDiff;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1; if (b.due_date) return 1; return 0;
  });

  const handleSave = async () => {
    if (!form.title) return toast.error("Title required");
    const tagsArr = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const payload = { title: form.title, description: form.description || null, priority: form.priority, assigned_to: form.assigned_to || null, account_id: form.account_id || null, due_date: form.due_date || null, tags: tagsArr };
    await performAction(editTask ? 'update_task' : 'create_task', async () => {
      if (editTask) { const { error } = await supabase.from("tasks").update(payload).eq("id", editTask.id); if (error) { toast.error("Failed"); throw error; } toast.success("Updated"); }
      else { const { error } = await supabase.from("tasks").insert(payload); if (error) { toast.error("Failed"); throw error; } toast.success("Created"); }
      closeDialog();
    });
  };

  const closeDialog = () => { setShowAdd(false); setEditTask(null); setForm({ title: "", description: "", priority: "medium", assigned_to: "", account_id: "", due_date: "", tags: "" }); };
  const handleStatusChange = async (id: string, status: string) => { await performAction('update_status', async () => { await supabase.from("tasks").update({ status }).eq("id", id); }); };
  const handleDelete = async (id: string) => { if (!confirm("Delete task?")) return; await performAction('delete_item', async () => { await supabase.from("tasks").delete().eq("id", id); toast.success("Deleted"); }); };
  const openEdit = (task: any) => { setEditTask(task); setForm({ title: task.title, description: task.description || "", priority: task.priority, assigned_to: task.assigned_to || "", account_id: task.account_id || "", due_date: task.due_date ? task.due_date.split("T")[0] : "", tags: (task.tags || []).join(", ") }); setShowAdd(true); };
  const nextStatus = (current: string) => { const flow: Record<string, string> = { todo: "in_progress", in_progress: "review", review: "done", blocked: "in_progress", done: "todo" }; return flow[current] || "todo"; };
  const daysUntilDue = (dueDate: string) => Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100) : 0;
  const urgentCount = tasks.filter((t) => t.priority === "urgent" && t.status !== "done").length;
  const overdueCount = tasks.filter((t) => t.due_date && daysUntilDue(t.due_date) < 0 && t.status !== "done").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="crm-section-title text-lg">Tasks & Workflows</h3>
            <CreditCostBadge cost="1-2" variant="header" label="per task" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-white/30">{tasks.length} total</span>
            <span className="text-xs text-emerald-400">{completionRate}% complete</span>
            {urgentCount > 0 && <span className="text-xs text-red-400">{urgentCount} urgent</span>}
            {overdueCount > 0 && <span className="text-xs text-red-400">{overdueCount} overdue</span>}
          </div>
        </div>
        <Dialog open={showAdd} onOpenChange={(o) => { if (!o) closeDialog(); else setShowAdd(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="crm-btn-primary gap-1.5 h-9"><Plus className="h-3.5 w-3.5" /> New Task</Button>
          </DialogTrigger>
          <DialogContent className="crm-dialog text-white max-w-lg">
            <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-white/50 text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="crm-input h-10" placeholder="What needs to be done?" /></div>
              <div><Label className="text-white/50 text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="crm-input min-h-[80px]" placeholder="Details..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-white/50 text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="crm-input h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">{Object.entries(priorityConfig).map(([key, cfg]) => (<SelectItem key={key} value={key} className="text-white"><span className={cfg.color}>{cfg.label}</span></SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/50 text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="crm-input h-10" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-white/50 text-xs">Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger className="crm-input h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">{teamMembers.map((m) => <SelectItem key={m.id} value={m.id} className="text-white">{m.name} ({m.role})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/50 text-xs">Account</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger className="crm-input h-10"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">{accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-white/50 text-xs">Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="crm-input h-10" placeholder="content, strategy" /></div>
              <Button onClick={handleSave} className="w-full crm-btn-primary h-10">{editTask ? "Update Task" : "Create Task"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress */}
      <div className="crm-stat-card !p-3">
        <div className="flex items-center justify-between text-[10px] text-white/30 mb-1.5"><span>Completion</span><span className="text-emerald-400 font-semibold">{completionRate}%</span></div>
        <Progress value={completionRate} className="h-1.5 bg-white/[0.04]" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="crm-input h-9 text-xs pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] crm-input h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl"><SelectItem value="all" className="text-white">All Status</SelectItem>{Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px] crm-input h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl"><SelectItem value="all" className="text-white">All Priority</SelectItem>{Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Status chips */}
      <div className="grid gap-2 grid-cols-5">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = tasks.filter((t) => t.status === key).length;
          const isActive = statusFilter === key;
          return (
            <button key={key} onClick={() => setStatusFilter(isActive ? "all" : key)}
              className={`crm-stat-card !p-3 text-center cursor-pointer ${isActive ? "!border-[hsl(217,91%,60%)]/20" : ""}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} mx-auto mb-1.5`} />
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-[9px] text-white/30">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="crm-panel p-10 text-center">
            <ListTodo className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-sm">No tasks found</p>
          </div>
        )}
        {sorted.map((task) => {
          const member = teamMembers.find((m) => m.id === task.assigned_to);
          const acct = accounts.find((a) => a.id === task.account_id);
          const overdue = task.due_date && daysUntilDue(task.due_date) < 0 && task.status !== "done";
          const dueSoon = task.due_date && daysUntilDue(task.due_date) <= 2 && daysUntilDue(task.due_date) >= 0 && task.status !== "done";
          const pCfg = priorityConfig[task.priority] || priorityConfig.medium;
          const sCfg = statusConfig[task.status] || statusConfig.todo;

          return (
            <div key={task.id} className={`crm-card p-4 ${task.priority === "urgent" && task.status !== "done" ? "!border-l-2 !border-l-red-500" : overdue ? "!border-l-2 !border-l-orange-500" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button onClick={() => handleStatusChange(task.id, nextStatus(task.status))} className="shrink-0 mt-0.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${task.status === "done" ? "bg-emerald-500" : `border-2 ${task.priority === "urgent" ? "border-red-400" : "border-white/15"} hover:border-[hsl(217,91%,60%)]`}`}>
                      {task.status === "done" && <CheckSquare className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "text-white/30 line-through" : "text-white"}`}>{task.title}</p>
                    {task.description && <p className="text-xs text-white/25 mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`crm-badge border ${pCfg.badgeClass}`}>{pCfg.label}</span>
                      <span className={`crm-badge ${sCfg.bgColor} ${task.status === "done" ? "text-emerald-400" : task.status === "in_progress" ? "text-[hsl(217,91%,60%)]" : task.status === "blocked" ? "text-red-400" : "text-white/40"}`}>{sCfg.label}</span>
                      {member && <span className="text-[10px] text-[hsl(217,91%,60%)] flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {member.name}</span>}
                      {acct && <span className="text-[10px] text-white/20">{acct.display_name || acct.username}</span>}
                      {task.due_date && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-red-400 font-medium" : dueSoon ? "text-orange-400" : "text-white/20"}`}>
                          <CalendarDays className="h-2.5 w-2.5" />
                          {overdue ? `${Math.abs(daysUntilDue(task.due_date))}d overdue` : dueSoon ? `Due in ${daysUntilDue(task.due_date)}d` : new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {(task.tags || []).map((tag: string) => <span key={tag} className="crm-badge border border-white/[0.06] text-white/20 text-[8px]"><Tag className="h-2 w-2 mr-0.5" />{tag}</span>)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Select onValueChange={(v) => handleStatusChange(task.id, v)}>
                    <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent text-white/20 hover:text-white"><div className={`w-2.5 h-2.5 rounded-full ${sCfg.color}`} /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">{Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/20 hover:text-white" onClick={() => openEdit(task)}><Edit className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/30 hover:text-red-400" onClick={() => handleDelete(task.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <InsufficientCreditsModal open={insufficientModal.open} onClose={closeInsufficientModal} requiredCredits={insufficientModal.requiredCredits} actionName={insufficientModal.actionName} />
    </div>
  );
};

export default TaskWorkflow;

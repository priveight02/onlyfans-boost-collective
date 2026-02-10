import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Clock, AlertTriangle, ListTodo, ArrowRight, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-white/10 text-white/40 border-white/10",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-white/20" },
  in_progress: { label: "In Progress", color: "bg-blue-500" },
  done: { label: "Done", color: "bg-emerald-500" },
  blocked: { label: "Blocked", color: "bg-red-500" },
};

const TaskWorkflow = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium", assigned_to: "", account_id: "", due_date: "",
  });

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAll = async () => {
    const [t, a, m] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name"),
      supabase.from("team_members").select("id, name, role"),
    ]);
    setTasks(t.data || []);
    setAccounts(a.data || []);
    setTeamMembers(m.data || []);
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const handleSave = async () => {
    if (!form.title) return toast.error("Title required");
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      account_id: form.account_id || null,
      due_date: form.due_date || null,
    };

    if (editTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editTask.id);
      if (error) return toast.error("Failed to update");
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) return toast.error("Failed to create");
      toast.success("Task created");
    }
    setShowAdd(false);
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", assigned_to: "", account_id: "", due_date: "" });
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status }).eq("id", id);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Deleted");
    loadAll();
  };

  const openEdit = (task: any) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assigned_to: task.assigned_to || "",
      account_id: task.account_id || "",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
    });
    setShowAdd(true);
  };

  const nextStatus = (current: string) => {
    const flow: Record<string, string> = { todo: "in_progress", in_progress: "done", blocked: "in_progress", done: "todo" };
    return flow[current] || "todo";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Tasks & Workflows</h3>
          <p className="text-xs text-white/40">{tasks.length} tasks • {tasks.filter((t) => t.status === "done").length} completed</p>
        </div>
        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditTask(null); setForm({ title: "", description: "", priority: "medium", assigned_to: "", account_id: "", due_date: "" }); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-white/70 text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Description</Label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-[80px] p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-accent focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {["urgent", "high", "medium", "low"].map((p) => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">Assign To</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {teamMembers.map((m) => <SelectItem key={m.id} value={m.id} className="text-white">{m.name} ({m.role})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Related Account</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editTask ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban-style stats */}
      <div className="grid gap-3 grid-cols-4">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(filter === key ? "all" : key)}
            className={`p-3 rounded-lg border text-center transition-all ${filter === key ? "border-accent bg-accent/10" : "border-white/10 bg-white/5"}`}>
            <div className={`w-3 h-3 rounded-full ${cfg.color} mx-auto mb-1`} />
            <p className="text-lg font-bold text-white">{tasks.filter((t) => t.status === key).length}</p>
            <p className="text-[10px] text-white/40">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <ListTodo className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No tasks found</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((task) => {
          const member = teamMembers.find((m) => m.id === task.assigned_to);
          const acct = accounts.find((a) => a.id === task.account_id);
          const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
          return (
            <Card key={task.id} className={`bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/[0.08] transition-colors ${overdue ? "border-l-2 border-l-red-500" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => handleStatusChange(task.id, nextStatus(task.status))} className="shrink-0">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${task.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-accent"}`}>
                        {task.status === "done" && <CheckSquare className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${task.status === "done" ? "text-white/40 line-through" : "text-white"}`}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge className={`text-[9px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                        <Badge className={`text-[9px] ${statusConfig[task.status] ? `${task.status === "done" ? "bg-emerald-500/20 text-emerald-400" : task.status === "in_progress" ? "bg-blue-500/20 text-blue-400" : task.status === "blocked" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/40"}` : ""}`}>{statusConfig[task.status]?.label}</Badge>
                        {member && <span className="text-[10px] text-accent">→ {member.name}</span>}
                        {acct && <span className="text-[10px] text-white/30">• {acct.display_name || acct.username}</span>}
                        {task.due_date && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-red-400" : "text-white/30"}`}>
                            <Clock className="h-2.5 w-2.5" /> {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white" onClick={() => openEdit(task)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TaskWorkflow;

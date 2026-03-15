import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, Edit2, CheckSquare, Square, GripVertical,
  Calendar, Clock, User, Tag, Flag, Search, Filter,
  LayoutGrid, List, Kanban, MoreHorizontal, ChevronDown,
  FileText, MessageSquare, Sparkles, X, Check, ArrowRight,
  Layers, Star, AlertTriangle, Zap, Eye, Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Types ──
type Priority = "urgent" | "high" | "medium" | "low" | "none";
type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
type ViewMode = "board" | "list" | "table";

interface SandboxTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  labels: string[];
  assignee: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  subtasks: { id: string; text: string; done: boolean }[];
  notes: string;
  order: number;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  backlog: { label: "Backlog", color: "text-white/30 border-white/10 bg-white/[0.03]", icon: Layers },
  todo: { label: "To Do", color: "text-blue-400 border-blue-500/20 bg-blue-500/5", icon: Square },
  in_progress: { label: "In Progress", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: Zap },
  review: { label: "Review", color: "text-purple-400 border-purple-500/20 bg-purple-500/5", icon: Eye },
  done: { label: "Done", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: Check },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: any }> = {
  urgent: { label: "Urgent", color: "text-red-400 border-red-500/20", icon: AlertTriangle },
  high: { label: "High", color: "text-orange-400 border-orange-500/20", icon: Flag },
  medium: { label: "Medium", color: "text-amber-400 border-amber-500/20", icon: Flag },
  low: { label: "Low", color: "text-blue-400 border-blue-500/20", icon: Flag },
  none: { label: "None", color: "text-white/30 border-white/10", icon: Flag },
};

const STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];
const STORAGE_KEY = "sandbox_tasks";
const LABELS_KEY = "sandbox_labels";

const ContentSandbox = () => {
  const [tasks, setTasks] = useState<SandboxTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<SandboxTask | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [customLabels, setCustomLabels] = useState<string[]>(["bug", "feature", "content", "marketing", "design", "urgent", "research"]);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("todo");
  const [formPriority, setFormPriority] = useState<Priority>("medium");
  const [formLabels, setFormLabels] = useState<string[]>([]);
  const [formAssignee, setFormAssignee] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [newLabelInput, setNewLabelInput] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTasks(JSON.parse(saved));
      const savedLabels = localStorage.getItem(LABELS_KEY);
      if (savedLabels) setCustomLabels(JSON.parse(savedLabels));
    } catch {}
  }, []);

  // Save
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(LABELS_KEY, JSON.stringify(customLabels));
  }, [customLabels]);

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterLabel !== "all" && !t.labels.includes(filterLabel)) return false;
      return true;
    }).sort((a, b) => a.order - b.order);
  }, [tasks, searchQuery, filterPriority, filterLabel]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, SandboxTask[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] };
    filtered.forEach(t => map[t.status]?.push(t));
    return map;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.status === "done").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length,
  }), [tasks]);

  // CRUD
  const createTask = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    const task: SandboxTask = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      description: formDescription,
      status: formStatus,
      priority: formPriority,
      labels: formLabels,
      assignee: formAssignee,
      due_date: formDueDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtasks: [],
      notes: formNotes,
      order: tasks.length,
    };
    setTasks(prev => [...prev, task]);
    resetForm();
    setShowCreateDialog(false);
    toast.success("Task created");
  };

  const updateTask = () => {
    if (!editingTask) return;
    setTasks(prev => prev.map(t => t.id === editingTask.id ? {
      ...t,
      title: formTitle,
      description: formDescription,
      status: formStatus,
      priority: formPriority,
      labels: formLabels,
      assignee: formAssignee,
      due_date: formDueDate || null,
      notes: formNotes,
      updated_at: new Date().toISOString(),
    } : t));
    resetForm();
    setEditingTask(null);
    toast.success("Task updated");
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success("Task deleted");
  };

  const bulkDelete = () => {
    if (selectedTasks.size === 0) return;
    if (!confirm(`Delete ${selectedTasks.size} tasks?`)) return;
    setTasks(prev => prev.filter(t => !selectedTasks.has(t.id)));
    setSelectedTasks(new Set());
    toast.success("Tasks deleted");
  };

  const bulkChangeStatus = (status: TaskStatus) => {
    setTasks(prev => prev.map(t => selectedTasks.has(t.id) ? { ...t, status, updated_at: new Date().toISOString() } : t));
    setSelectedTasks(new Set());
    toast.success(`${selectedTasks.size} tasks → ${STATUS_CONFIG[status].label}`);
  };

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t));
  };

  const duplicateTask = (task: SandboxTask) => {
    const dup: SandboxTask = { ...task, id: crypto.randomUUID(), title: `${task.title} (copy)`, status: "todo", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), order: tasks.length };
    setTasks(prev => [...prev, dup]);
    toast.success("Task duplicated");
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s),
      updated_at: new Date().toISOString(),
    } : t));
  };

  const addSubtask = (taskId: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      subtasks: [...t.subtasks, { id: crypto.randomUUID(), text, done: false }],
      updated_at: new Date().toISOString(),
    } : t));
  };

  const resetForm = () => {
    setFormTitle(""); setFormDescription(""); setFormStatus("todo"); setFormPriority("medium");
    setFormLabels([]); setFormAssignee(""); setFormDueDate(""); setFormNotes("");
  };

  const openEdit = (task: SandboxTask) => {
    setFormTitle(task.title); setFormDescription(task.description); setFormStatus(task.status);
    setFormPriority(task.priority); setFormLabels([...task.labels]); setFormAssignee(task.assignee);
    setFormDueDate(task.due_date || ""); setFormNotes(task.notes);
    setEditingTask(task);
  };

  const toggleSelect = (id: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Drag & drop for kanban
  const handleDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => { e.preventDefault(); setDragOverColumn(status); };
  const handleDragLeave = () => setDragOverColumn(null);
  const handleDrop = (status: TaskStatus) => {
    if (draggedTaskId) moveTask(draggedTaskId, status);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // ── Task Card Component ──
  const TaskCard = ({ task, compact = false }: { task: SandboxTask; compact?: boolean }) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
    const subtaskDone = task.subtasks.filter(s => s.done).length;
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task.id)}
        className={`group bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 hover:border-primary/30 transition-all cursor-pointer ${selectedTasks.has(task.id) ? "ring-1 ring-primary border-primary/40" : ""} ${draggedTaskId === task.id ? "opacity-40" : ""}`}
        onClick={() => openEdit(task)}
      >
        <div className="flex items-start gap-2">
          <button onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }} className="mt-0.5 shrink-0">
            {selectedTasks.has(task.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5 text-white/20" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium text-white mb-1 ${task.status === "done" ? "line-through text-white/40" : ""}`}>{task.title}</p>
            {!compact && task.description && <p className="text-[10px] text-white/40 line-clamp-2 mb-1.5">{task.description}</p>}
            <div className="flex flex-wrap gap-1 mb-1.5">
              {task.priority !== "none" && (
                <Badge variant="outline" className={`text-[8px] ${PRIORITY_CONFIG[task.priority].color}`}>
                  {task.priority}
                </Badge>
              )}
              {task.labels.slice(0, 3).map(l => (
                <Badge key={l} variant="outline" className="text-[8px] border-primary/20 text-primary/60">{l}</Badge>
              ))}
              {task.labels.length > 3 && <span className="text-[8px] text-white/30">+{task.labels.length - 3}</span>}
            </div>
            <div className="flex items-center gap-2 text-[9px] text-white/30">
              {task.due_date && (
                <span className={`flex items-center gap-0.5 ${isOverdue ? "text-red-400" : ""}`}>
                  <Calendar className="h-2.5 w-2.5" /> {format(new Date(task.due_date), "MMM d")}
                </span>
              )}
              {task.assignee && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {task.assignee}</span>}
              {task.subtasks.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <CheckSquare className="h-2.5 w-2.5" /> {subtaskDone}/{task.subtasks.length}
                </span>
              )}
              {task.notes && <FileText className="h-2.5 w-2.5" />}
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); duplicateTask(task); }} className="p-1 hover:bg-white/[0.05] rounded"><Copy className="h-3 w-3 text-white/30" /></button>
            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1 hover:bg-red-500/10 rounded"><Trash2 className="h-3 w-3 text-red-400/50" /></button>
          </div>
        </div>
      </div>
    );
  };

  // ── Form Dialog ──
  const FormDialog = ({ open, onClose, isEdit }: { open: boolean; onClose: () => void; isEdit: boolean }) => (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isEdit ? <Edit2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
            {isEdit ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Task title..."
            className="bg-white/[0.03] border-white/[0.06] text-white text-sm placeholder:text-white/20" />
          <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Description (supports markdown)..."
            className="bg-white/[0.03] border-white/[0.06] text-white text-xs placeholder:text-white/20 min-h-[80px]" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Status</label>
              <Select value={formStatus} onValueChange={v => setFormStatus(v as TaskStatus)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,9%)] border-white/[0.08]">
                  {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs text-white/70">{STATUS_CONFIG[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Priority</label>
              <Select value={formPriority} onValueChange={v => setFormPriority(v as Priority)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,9%)] border-white/[0.08]">
                  {(["urgent", "high", "medium", "low", "none"] as Priority[]).map(p => (
                    <SelectItem key={p} value={p} className={`text-xs ${PRIORITY_CONFIG[p].color}`}>{PRIORITY_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Assignee</label>
              <Input value={formAssignee} onChange={e => setFormAssignee(e.target.value)} placeholder="Name..."
                className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8 placeholder:text-white/20" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Due Date</label>
              <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8" />
            </div>
          </div>
          {/* Labels */}
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Labels</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {customLabels.map(l => (
                <button key={l} onClick={() => setFormLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${formLabels.includes(l)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/[0.06] text-white/30 hover:text-white/50"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <Input value={newLabelInput} onChange={e => setNewLabelInput(e.target.value)} placeholder="New label..."
                className="bg-white/[0.03] border-white/[0.06] text-white text-[10px] h-6 placeholder:text-white/20 flex-1"
                onKeyDown={e => { if (e.key === "Enter" && newLabelInput.trim()) { setCustomLabels(prev => [...prev, newLabelInput.trim()]); setFormLabels(prev => [...prev, newLabelInput.trim()]); setNewLabelInput(""); } }} />
              <Button size="sm" variant="outline" onClick={() => { if (newLabelInput.trim()) { setCustomLabels(prev => [...prev, newLabelInput.trim()]); setFormLabels(prev => [...prev, newLabelInput.trim()]); setNewLabelInput(""); } }}
                className="text-[9px] h-6 px-2 border-white/[0.06] text-white/50"><Plus className="h-2.5 w-2.5" /></Button>
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Notes</label>
            <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Internal notes, links, references..."
              className="bg-white/[0.03] border-white/[0.06] text-white text-xs placeholder:text-white/20 min-h-[60px]" />
          </div>
          {/* Subtasks (edit mode only) */}
          {isEdit && editingTask && (
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Subtasks</label>
              <div className="space-y-1 mb-2">
                {editingTask.subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button onClick={() => toggleSubtask(editingTask.id, s.id)}>
                      {s.done ? <CheckSquare className="h-3 w-3 text-emerald-400" /> : <Square className="h-3 w-3 text-white/30" />}
                    </button>
                    <span className={`text-xs ${s.done ? "line-through text-white/30" : "text-white/70"}`}>{s.text}</span>
                  </div>
                ))}
              </div>
              <Input placeholder="Add subtask..." className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-7 placeholder:text-white/20"
                onKeyDown={e => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) { addSubtask(editingTask.id, (e.target as HTMLInputElement).value.trim()); (e.target as HTMLInputElement).value = ""; } }} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={isEdit ? updateTask : createTask} className="flex-1 bg-primary text-primary-foreground text-xs h-9">
              {isEdit ? "Update Task" : "Create Task"}
            </Button>
            <Button variant="outline" onClick={() => { onClose(); resetForm(); }} className="text-xs h-9 border-white/[0.06] text-white/50">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" /> Sandbox
          </h1>
          <p className="text-xs text-white/40">Your workspace for tasks, ideas, and project management</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-primary text-primary-foreground text-xs h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-blue-400", icon: Layers },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-400", icon: Zap },
          { label: "Done", value: stats.done, color: "text-emerald-400", icon: Check },
          { label: "Overdue", value: stats.overdue, color: "text-red-400", icon: AlertTriangle },
        ].map(s => (
          <Card key={s.label} className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-3">
              <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..." className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8 pl-7 placeholder:text-white/20" />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-xs w-28"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent className="bg-[hsl(222,35%,9%)] border-white/[0.08]">
              <SelectItem value="all" className="text-xs text-white/70">All Priority</SelectItem>
              {(["urgent", "high", "medium", "low"] as Priority[]).map(p => (
                <SelectItem key={p} value={p} className={`text-xs ${PRIORITY_CONFIG[p].color}`}>{PRIORITY_CONFIG[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLabel} onValueChange={setFilterLabel}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-xs w-28"><SelectValue placeholder="Label" /></SelectTrigger>
            <SelectContent className="bg-[hsl(222,35%,9%)] border-white/[0.08]">
              <SelectItem value="all" className="text-xs text-white/70">All Labels</SelectItem>
              {customLabels.map(l => <SelectItem key={l} value={l} className="text-xs text-white/70">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          {selectedTasks.size > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
              <span className="text-[10px] text-primary font-medium">{selectedTasks.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("done")} className="text-[9px] h-5 px-1.5 border-emerald-500/20 text-emerald-400">Done</Button>
              <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("in_progress")} className="text-[9px] h-5 px-1.5 border-amber-500/20 text-amber-400">WIP</Button>
              <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("backlog")} className="text-[9px] h-5 px-1.5 border-white/[0.06] text-white/40">Backlog</Button>
              <Button size="sm" variant="outline" onClick={bulkDelete} className="text-[9px] h-5 px-1.5 border-red-500/20 text-red-400"><Trash2 className="h-2.5 w-2.5" /></Button>
              <button onClick={() => setSelectedTasks(new Set())} className="p-0.5"><X className="h-3 w-3 text-white/30" /></button>
            </div>
          )}
          <div className="flex border border-white/[0.06] rounded-md overflow-hidden">
            {([
              { mode: "board" as ViewMode, icon: Kanban },
              { mode: "list" as ViewMode, icon: List },
              { mode: "table" as ViewMode, icon: LayoutGrid },
            ]).map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)}
                className={`p-1.5 ${viewMode === v.mode ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white/60"}`}>
                <v.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ BOARD VIEW (Kanban) ═══ */}
      {viewMode === "board" && (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
          {STATUSES.map(status => {
            const conf = STATUS_CONFIG[status];
            const columnTasks = tasksByStatus[status];
            return (
              <div
                key={status}
                className={`flex-1 min-w-[220px] max-w-[300px] rounded-xl border p-3 transition-all ${dragOverColumn === status ? "border-primary/40 bg-primary/5" : "border-white/[0.06] bg-white/[0.02]"}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(status)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <conf.icon className={`h-3.5 w-3.5 ${conf.color.split(" ")[0]}`} />
                    <span className="text-xs font-semibold text-white">{conf.label}</span>
                    <Badge variant="outline" className="text-[8px] border-white/[0.08] text-white/30">{columnTasks.length}</Badge>
                  </div>
                  <button onClick={() => { resetForm(); setFormStatus(status); setShowCreateDialog(true); }}
                    className="p-0.5 hover:bg-white/[0.05] rounded"><Plus className="h-3 w-3 text-white/30" /></button>
                </div>
                <div className="space-y-2">
                  {columnTasks.map(task => <TaskCard key={task.id} task={task} compact />)}
                  {columnTasks.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-[10px] text-white/20">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {viewMode === "list" && (
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="py-12 text-center">
                <Layers className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No tasks yet</p>
                <p className="text-white/20 text-xs mt-1">Create your first task to get started</p>
              </CardContent>
            </Card>
          ) : filtered.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === "table" && (
        <Card className="bg-white/[0.03] border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-[10px] text-white/30 font-medium text-left p-2 w-8"></th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2">Title</th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2">Status</th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2">Priority</th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2">Assignee</th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2">Due</th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2">Labels</th>
                  <th className="text-[10px] text-white/30 font-medium text-left p-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                  return (
                    <tr key={task.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer group" onClick={() => openEdit(task)}>
                      <td className="p-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}>
                          {selectedTasks.has(task.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5 text-white/20" />}
                        </button>
                      </td>
                      <td className="p-2">
                        <span className={`text-xs text-white ${task.status === "done" ? "line-through text-white/40" : ""}`}>{task.title}</span>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[9px] ${STATUS_CONFIG[task.status].color}`}>{STATUS_CONFIG[task.status].label}</Badge>
                      </td>
                      <td className="p-2">
                        {task.priority !== "none" && <Badge variant="outline" className={`text-[9px] ${PRIORITY_CONFIG[task.priority].color}`}>{task.priority}</Badge>}
                      </td>
                      <td className="p-2"><span className="text-[10px] text-white/40">{task.assignee || "—"}</span></td>
                      <td className="p-2">
                        {task.due_date ? <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-white/40"}`}>{format(new Date(task.due_date), "MMM d")}</span> : <span className="text-[10px] text-white/20">—</span>}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-0.5">{task.labels.slice(0, 2).map(l => <Badge key={l} variant="outline" className="text-[8px] border-primary/20 text-primary/50">{l}</Badge>)}</div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); duplicateTask(task); }} className="p-1 hover:bg-white/[0.05] rounded"><Copy className="h-3 w-3 text-white/30" /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1 hover:bg-red-500/10 rounded"><Trash2 className="h-3 w-3 text-red-400/50" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <FormDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} isEdit={false} />
      <FormDialog open={!!editingTask} onClose={() => setEditingTask(null)} isEdit={true} />
    </div>
  );
};

export default ContentSandbox;

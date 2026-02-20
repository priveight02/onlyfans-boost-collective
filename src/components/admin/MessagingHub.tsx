import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Users, Clock, Search, User, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  normal: "bg-white/[0.04] text-white/50 border-white/[0.06]",
  low: "bg-white/[0.02] text-white/25 border-white/[0.04]",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  assigned: "bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)] border-[hsl(217,91%,60%)]/20",
  closed: "bg-white/[0.02] text-white/25 border-white/[0.04]",
};

const MessagingHub = () => {
  const [threads, setThreads] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [chatters, setChatters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ account_id: "", subscriber_name: "", priority: "normal" });
  const { performAction, insufficientModal, closeInsufficientModal } = useCreditAction();

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_threads" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAll = async () => {
    const [t, a, c] = await Promise.all([
      supabase.from("message_threads").select("*").order("last_message_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name"),
      supabase.from("team_members").select("*").in("role", ["chatter", "va"]),
    ]);
    setThreads(t.data || []);
    setAccounts(a.data || []);
    setChatters(c.data || []);
  };

  const filtered = threads.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.subscriber_name?.toLowerCase().includes(q) || t.subscriber_id?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAdd = async () => {
    if (!form.account_id || !form.subscriber_name) return toast.error("Fill required fields");
    await performAction('send_message', async () => {
      const { error } = await supabase.from("message_threads").insert({
        account_id: form.account_id,
        subscriber_name: form.subscriber_name,
        priority: form.priority,
      });
      if (error) { toast.error("Failed to create thread"); throw error; }
      toast.success("Thread created");
      setShowAdd(false);
      setForm({ account_id: "", subscriber_name: "", priority: "normal" });
    });
  };

  const handleAssign = async (threadId: string, chatterId: string) => {
    await performAction('assign_member', async () => {
      await supabase.from("message_threads").update({ assigned_chatter: chatterId, status: "assigned" }).eq("id", threadId);
      toast.success("Chatter assigned");
      loadAll();
    });
  };

  const handleClose = async (threadId: string) => {
    await performAction('close_thread', async () => {
      await supabase.from("message_threads").update({ status: "closed" }).eq("id", threadId);
      toast.success("Thread closed");
      loadAll();
    });
  };

  const openThreads = threads.filter((t) => t.status === "open").length;
  const assignedThreads = threads.filter((t) => t.status === "assigned").length;
  const avgResponseTime = "< 5 min";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white font-heading">Messaging</h2>
          <p className="text-sm text-white/30 mt-0.5">Manage subscriber conversations</p>
        </div>
        <CreditCostBadge cost={1} variant="header" label="per message" />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Open Threads", value: openThreads.toString(), color: "hsl(160,84%,39%)" },
          { title: "Assigned", value: assignedThreads.toString(), color: "hsl(217,91%,60%)" },
          { title: "Active Chatters", value: chatters.filter((c) => c.status === "active").length.toString(), color: "hsl(262,83%,58%)" },
          { title: "Avg Response", value: avgResponseTime, color: "hsl(38,92%,50%)" },
        ].map((s) => (
          <div key={s.title} className="crm-stat-card">
            <p className="text-xs text-white/30 mb-2">{s.title}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subscribers..." className="pl-9 crm-input h-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] crm-input h-10"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">
            <SelectItem value="all" className="text-white">All Status</SelectItem>
            <SelectItem value="open" className="text-white">Open</SelectItem>
            <SelectItem value="assigned" className="text-white">Assigned</SelectItem>
            <SelectItem value="closed" className="text-white">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5 h-10 px-4 rounded-xl font-medium">
              <Plus className="h-3.5 w-3.5" /> New Thread
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(222,47%,8%)] border-white/[0.06] text-white rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading">Create Thread</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/50 text-xs font-medium">Account</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger className="crm-input h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/50 text-xs font-medium">Subscriber Name</Label>
                <Input value={form.subscriber_name} onChange={(e) => setForm({ ...form, subscriber_name: e.target.value })} className="crm-input h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/50 text-xs font-medium">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="crm-input h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">
                    {["urgent", "high", "normal", "low"].map((p) => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white h-10 rounded-xl font-medium">
                Create Thread
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Threads List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="crm-card p-12 text-center">
            <Inbox className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-sm">No threads found</p>
          </div>
        )}
        {filtered.map((thread) => {
          const acct = accounts.find((a) => a.id === thread.account_id);
          const chatter = chatters.find((c) => c.id === thread.assigned_chatter);
          return (
            <div key={thread.id} className="crm-card p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <User className="h-4 w-4 text-white/30" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{thread.subscriber_name || "Unknown"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`crm-badge border ${statusColors[thread.status]}`}>{thread.status}</span>
                      <span className={`crm-badge border ${priorityColors[thread.priority]}`}>{thread.priority}</span>
                      {acct && <span className="text-[11px] text-white/20">@{acct.username}</span>}
                      {chatter && <span className="text-[11px] text-[hsl(217,91%,60%)]">→ {chatter.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {thread.status === "open" && chatters.length > 0 && (
                    <Select onValueChange={(v) => handleAssign(thread.id, v)}>
                      <SelectTrigger className="h-8 w-[120px] text-xs crm-input"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">
                        {chatters.map((c) => <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {thread.status !== "closed" && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-white/30 hover:text-white hover:bg-white/[0.04] rounded-lg" onClick={() => handleClose(thread.id)}>Close</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chatter Performance */}
      {chatters.length > 0 && (
        <div className="crm-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Chatter Performance</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {chatters.map((chatter) => {
              const assigned = threads.filter((t) => t.assigned_chatter === chatter.id).length;
              const closed = threads.filter((t) => t.assigned_chatter === chatter.id && t.status === "closed").length;
              return (
                <div key={chatter.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[hsl(217,91%,60%)]/10 flex items-center justify-center text-[hsl(217,91%,60%)] text-xs font-bold">
                      {chatter.name[0]}
                    </div>
                    <p className="text-sm text-white font-medium">{chatter.name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-base font-bold text-white">{assigned}</p>
                      <p className="text-[10px] text-white/25">Assigned</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-400">{closed}</p>
                      <p className="text-[10px] text-white/25">Closed</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{assigned > 0 ? Math.round((closed / assigned) * 100) : 0}%</p>
                      <p className="text-[10px] text-white/25">Rate</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <InsufficientCreditsModal open={insufficientModal.open} onClose={closeInsufficientModal} requiredCredits={insufficientModal.requiredCredits} actionName={insufficientModal.actionName} />
    </div>
  );
};

export default MessagingHub;

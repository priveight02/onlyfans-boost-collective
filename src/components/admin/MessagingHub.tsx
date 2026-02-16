import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Users, Clock, TrendingUp, Filter, Search, User, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  normal: "bg-white/10 text-white/60",
  low: "bg-white/5 text-white/30",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-400",
  assigned: "bg-blue-500/20 text-blue-400",
  closed: "bg-white/5 text-white/30",
};

const MessagingHub = () => {
  const [threads, setThreads] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [chatters, setChatters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ account_id: "", subscriber_name: "", priority: "normal" });
  const { performAction } = useCreditAction();

  useEffect(() => {
    loadAll();
    // Realtime subscription
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
    await supabase.from("message_threads").update({ assigned_chatter: chatterId, status: "assigned" }).eq("id", threadId);
    toast.success("Chatter assigned");
    loadAll();
  };

  const handleClose = async (threadId: string) => {
    await supabase.from("message_threads").update({ status: "closed" }).eq("id", threadId);
    toast.success("Thread closed");
    loadAll();
  };

  const openThreads = threads.filter((t) => t.status === "open").length;
  const assignedThreads = threads.filter((t) => t.status === "assigned").length;
  const avgResponseTime = "< 5 min"; // Placeholder

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Open Threads", value: openThreads.toString(), icon: Inbox, color: "text-emerald-400" },
          { title: "Assigned", value: assignedThreads.toString(), icon: Users, color: "text-blue-400" },
          { title: "Active Chatters", value: chatters.filter((c) => c.status === "active").length.toString(), icon: MessageSquare, color: "text-purple-400" },
          { title: "Avg Response", value: avgResponseTime, icon: Clock, color: "text-yellow-400" },
        ].map((s) => (
          <Card key={s.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-[10px] text-white/40">{s.title}</span>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subscribers..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
            <SelectItem value="all" className="text-white">All Status</SelectItem>
            <SelectItem value="open" className="text-white">Open</SelectItem>
            <SelectItem value="assigned" className="text-white">Assigned</SelectItem>
            <SelectItem value="closed" className="text-white">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> New Thread <CreditCostBadge cost={1} /></Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>Create Thread</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-white/70 text-xs">Account</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Subscriber Name</Label>
                <Input value={form.subscriber_name} onChange={(e) => setForm({ ...form, subscriber_name: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                    {["urgent", "high", "normal", "low"].map((p) => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full">Create <CreditCostBadge cost={1} /></Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Threads List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No threads found</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((thread) => {
          const acct = accounts.find((a) => a.id === thread.account_id);
          const chatter = chatters.find((c) => c.id === thread.assigned_chatter);
          return (
            <Card key={thread.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/[0.08] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{thread.subscriber_name || "Unknown"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={`text-[9px] ${statusColors[thread.status]}`}>{thread.status}</Badge>
                        <Badge className={`text-[9px] ${priorityColors[thread.priority]}`}>{thread.priority}</Badge>
                        {acct && <span className="text-[10px] text-white/30">@{acct.username}</span>}
                        {chatter && <span className="text-[10px] text-accent">→ {chatter.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {thread.status === "open" && chatters.length > 0 && (
                      <Select onValueChange={(v) => handleAssign(thread.id, v)}>
                        <SelectTrigger className="h-7 w-[120px] text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                          {chatters.map((c) => <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {thread.status !== "closed" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-white/40" onClick={() => handleClose(thread.id)}>Close</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chatter Performance */}
      {chatters.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Chatter Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {chatters.map((chatter) => {
                const assigned = threads.filter((t) => t.assigned_chatter === chatter.id).length;
                const closed = threads.filter((t) => t.assigned_chatter === chatter.id && t.status === "closed").length;
                return (
                  <div key={chatter.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">
                        {chatter.name[0]}
                      </div>
                      <p className="text-sm text-white font-medium">{chatter.name}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-white">{assigned}</p>
                        <p className="text-[9px] text-white/30">Assigned</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-400">{closed}</p>
                        <p className="text-[9px] text-white/30">Closed</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{assigned > 0 ? Math.round((closed / assigned) * 100) : 0}%</p>
                        <p className="text-[9px] text-white/30">Rate</p>
                      </div>
                    </div>
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

export default MessagingHub;

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertTriangle, Plus, Clock, CheckCircle2, XCircle, Megaphone, MessageSquare, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const IncidentManager = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium", incident_type: "system", blast_radius: "", banner_message: "" });
  const [updateMsg, setUpdateMsg] = useState("");

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(20);
    setIncidents(data || []);
    setLoaded(true);
    setLoading(false);
  }, []);

  const fetchUpdates = async (incidentId: string) => {
    const { data } = await supabase.from("incident_updates").select("*").eq("incident_id", incidentId).order("created_at", { ascending: false }).limit(10);
    if (data) setUpdates(data);
  };

  const createIncident = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    const { data, error } = await supabase.from("incidents").insert({
      ...form, show_banner: !!form.banner_message,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setIncidents(prev => [data, ...prev]); // optimistic
    await supabase.from("audit_logs").insert({ action: "incident_created", entity_type: "incidents", entity_id: data.id, actor_type: "admin", metadata: { severity: form.severity, title: form.title } });
    toast.success("Incident created");
    setShowCreateDialog(false);
    setForm({ title: "", description: "", severity: "medium", incident_type: "system", blast_radius: "", banner_message: "" });
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    const upd: any = { status };
    if (status === "resolved") upd.resolved_at = new Date().toISOString();
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...upd } : i)); // optimistic
    // Batch: update + insert update + audit log in parallel
    await Promise.all([
      supabase.from("incidents").update(upd).eq("id", id),
      supabase.from("incident_updates").insert({ incident_id: id, update_type: "status", message: `Status changed to ${status}`, status_change: status }),
      supabase.from("audit_logs").insert({ action: `incident_${status}`, entity_type: "incidents", entity_id: id, actor_type: "admin" }),
    ]);
    toast.success(`Incident ${status}`);
    if (selectedIncident?.id === id) fetchUpdates(id);
  };

  const toggleBanner = async (id: string, current: boolean) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, show_banner: !current } : i)); // optimistic
    await supabase.from("incidents").update({ show_banner: !current }).eq("id", id);
    
    toast.success(!current ? "Banner enabled" : "Banner disabled");
  };

  const addUpdate = async () => {
    if (!updateMsg || !selectedIncident) return;
    const { data } = await supabase.from("incident_updates").insert({ incident_id: selectedIncident.id, update_type: "update", message: updateMsg }).select().single();
    if (data) setUpdates(prev => [data, ...prev]); // optimistic
    toast.success("Update added");
    setUpdateMsg("");
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "medium": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "low": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default: return "bg-white/10 text-white/60";
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "open": return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "investigating": return <Clock className="h-4 w-4 text-amber-400" />;
      case "mitigating": return <Clock className="h-4 w-4 text-blue-400" />;
      case "resolved": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "closed": return <XCircle className="h-4 w-4 text-white/40" />;
      default: return <AlertTriangle className="h-4 w-4 text-white/40" />;
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== "resolved" && i.status !== "closed");
  const resolvedIncidents = incidents.filter(i => i.status === "resolved" || i.status === "closed");

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  if (!loaded) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-white/40 text-sm">Data not loaded — click to fetch</p>
      <Button onClick={fetchIncidents} className="gap-1.5"><RefreshCw className="h-4 w-4" /> Load Incidents</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-red-500/10 border-red-500/20"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-300">{activeIncidents.filter(i => i.severity === "critical").length}</p><p className="text-white/40 text-xs">Critical</p></CardContent></Card>
        <Card className="bg-orange-500/10 border-orange-500/20"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-300">{activeIncidents.length}</p><p className="text-white/40 text-xs">Active</p></CardContent></Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-300">{resolvedIncidents.length}</p><p className="text-white/40 text-xs">Resolved</p></CardContent></Card>
        <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-white">{incidents.length}</p><p className="text-white/40 text-xs">Total</p></CardContent></Card>
      </div>

      {/* Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Incidents</h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700"><Plus className="h-3.5 w-3.5" /> Report Incident</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
            <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Incident title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.incident_type} onValueChange={v => setForm(p => ({ ...p, incident_type: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Blast radius (e.g. All users, US region)" value={form.blast_radius} onChange={e => setForm(p => ({ ...p, blast_radius: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Banner message (optional — shows to affected users)" value={form.banner_message} onChange={e => setForm(p => ({ ...p, banner_message: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Button onClick={createIncident} className="w-full bg-red-600 hover:bg-red-700">Report Incident</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Incidents List */}
      <div className="grid gap-3">
        {incidents.map(i => (
          <Card key={i.id} className={`border ${i.severity === "critical" && i.status !== "resolved" ? "border-red-500/30 bg-red-950/20" : "border-white/10 bg-white/5"}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {statusIcon(i.status)}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-medium text-sm">{i.title}</h4>
                      <Badge className={`${severityColor(i.severity)} text-[10px]`}>{i.severity}</Badge>
                      <Badge variant="outline" className="text-white/40 border-white/20 text-[10px]">{i.incident_type}</Badge>
                      <Badge variant="outline" className="text-white/50 border-white/20 text-[10px]">{i.status}</Badge>
                    </div>
                    {i.description && <p className="text-white/40 text-xs mt-1">{i.description}</p>}
                    {i.blast_radius && <p className="text-white/30 text-xs mt-0.5">Blast: {i.blast_radius} • Users: {i.affected_users_count}</p>}
                    <p className="text-white/20 text-[10px] mt-1">{format(new Date(i.created_at), "MMM d yyyy HH:mm")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {i.show_banner && <Megaphone className="h-3.5 w-3.5 text-amber-400" />}
                  <Switch checked={i.show_banner} onCheckedChange={() => toggleBanner(i.id, i.show_banner)} />
                  <Select value={i.status} onValueChange={v => updateIncidentStatus(i.id, v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs w-[130px] h-7"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="mitigating">Mitigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedIncident(i); setShowUpdateDialog(true); fetchUpdates(i.id); }} className="text-white/50 text-xs h-7 gap-1">
                    <MessageSquare className="h-3 w-3" /> Updates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {incidents.length === 0 && <p className="text-white/40 text-center py-8 text-sm">No incidents — system healthy 🟢</p>}
      </div>

      {/* Updates Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-lg">
          <DialogHeader><DialogTitle>Incident Updates — {selectedIncident?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Add update..." value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} className="bg-white/5 border-white/10 text-white flex-1" onKeyDown={e => e.key === "Enter" && addUpdate()} />
              <Button onClick={addUpdate} size="sm">Post</Button>
            </div>
            <div className="space-y-3 max-h-[40vh] overflow-auto">
              {updates.map(u => (
                <div key={u.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-white/40 border-white/20 text-[10px]">{u.update_type}</Badge>
                    {u.status_change && <Badge className="bg-accent/20 text-accent text-[10px]">→ {u.status_change}</Badge>}
                    <span className="text-white/30 text-[10px]">{format(new Date(u.created_at), "MMM d HH:mm")}</span>
                  </div>
                  <p className="text-white/60 text-xs mt-1">{u.message}</p>
                </div>
              ))}
              {updates.length === 0 && <p className="text-white/30 text-xs text-center py-4">No updates yet</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentManager;

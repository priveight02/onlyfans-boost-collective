import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileText, Search, Download, Eye, ShieldCheck, Filter } from "lucide-react";
import { format } from "date-fns";

const AuditTrailPanel = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [policyDecisions, setPolicyDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    fetchAll();
    const channel = supabase.channel("audit-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        setLogs(prev => [payload.new as any, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchPolicyDecisions()]);
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (data) setLogs(data);
  };

  const fetchPolicyDecisions = async () => {
    const { data } = await supabase.from("policy_decisions").select("*").order("evaluated_at", { ascending: false }).limit(200);
    if (data) setPolicyDecisions(data);
  };

  const exportAuditLogs = () => {
    const csv = [
      ["ID", "Action", "Entity Type", "Entity ID", "Actor Type", "Actor ID", "Timestamp"].join(","),
      ...filteredLogs.map(l => [l.id, l.action, l.entity_type, l.entity_id || "", l.actor_type, l.actor_id || "", l.created_at].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Audit trail exported");
  };

  const entityTypes = [...new Set(logs.map(l => l.entity_type))];
  const filteredLogs = logs.filter(l => {
    const matchSearch = !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.entity_id?.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === "all" || l.entity_type === entityFilter;
    return matchSearch && matchEntity;
  });

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="audit" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Audit Logs
          </TabsTrigger>
          <TabsTrigger value="policy" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Policy Decisions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <Input placeholder="Search actions, entities..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border-white/10 text-white pl-9 text-xs" />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-[180px] text-xs">
                <Filter className="h-3 w-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportAuditLogs} className="border-white/10 text-white/60 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          <div className="text-white/40 text-xs">{filteredLogs.length} records (immutable)</div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Timestamp</TableHead>
                  <TableHead className="text-white/50">Action</TableHead>
                  <TableHead className="text-white/50">Entity</TableHead>
                  <TableHead className="text-white/50">Actor</TableHead>
                  <TableHead className="text-white/50">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice(0, 100).map(l => (
                  <TableRow key={l.id} className="border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setSelectedLog(l)}>
                    <TableCell className="text-white/60 text-xs">{format(new Date(l.created_at), "MMM d HH:mm:ss")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-white/70 border-white/20 text-[10px] font-mono">{l.action}</Badge></TableCell>
                    <TableCell>
                      <div>
                        <span className="text-white/60 text-xs">{l.entity_type}</span>
                        {l.entity_id && <span className="text-white/30 text-[10px] ml-1 font-mono">#{l.entity_id.substring(0, 8)}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-white/5 text-white/50 text-[10px]">{l.actor_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {(l.before_state || l.after_state || l.diff) ? (
                        <Button size="sm" variant="ghost" className="text-accent text-xs h-6 px-2 gap-1"><Eye className="h-3 w-3" /> View</Button>
                      ) : <span className="text-white/20 text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-8">No audit logs found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          <h3 className="text-white font-semibold">Policy Decisions ({policyDecisions.length})</h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Time</TableHead>
                  <TableHead className="text-white/50">Policy</TableHead>
                  <TableHead className="text-white/50">Action</TableHead>
                  <TableHead className="text-white/50">Resource</TableHead>
                  <TableHead className="text-white/50">Decision</TableHead>
                  <TableHead className="text-white/50">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyDecisions.map(p => (
                  <TableRow key={p.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/60 text-xs">{format(new Date(p.evaluated_at), "MMM d HH:mm:ss")}</TableCell>
                    <TableCell className="text-white/70 text-xs font-mono">{p.policy_name}</TableCell>
                    <TableCell className="text-white/60 text-xs">{p.action}</TableCell>
                    <TableCell className="text-white/60 text-xs">{p.resource_type}/{p.resource_id?.substring(0, 8)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${p.decision === "allow" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                        {p.decision}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/40 text-xs max-w-[200px] truncate">{p.reason || "—"}</TableCell>
                  </TableRow>
                ))}
                {policyDecisions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-white/40 py-8">No policy decisions logged</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-[hsl(220,60%,8%)] border-white/10 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Audit Log Detail</DialogTitle></DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div><span className="text-white/40">Action:</span> <span className="text-white font-mono ml-1">{selectedLog.action}</span></div>
                  <div><span className="text-white/40">Entity:</span> <span className="text-white ml-1">{selectedLog.entity_type}</span></div>
                  <div><span className="text-white/40">Entity ID:</span> <span className="text-white font-mono ml-1">{selectedLog.entity_id || "—"}</span></div>
                  <div><span className="text-white/40">Actor:</span> <span className="text-white ml-1">{selectedLog.actor_type} / {selectedLog.actor_id?.substring(0, 8) || "system"}</span></div>
                  <div><span className="text-white/40">IP:</span> <span className="text-white ml-1">{selectedLog.ip_address || "—"}</span></div>
                  <div><span className="text-white/40">Time:</span> <span className="text-white ml-1">{format(new Date(selectedLog.created_at), "yyyy-MM-dd HH:mm:ss")}</span></div>
                </div>
                {selectedLog.before_state && (
                  <div>
                    <h4 className="text-white/50 text-xs mb-1">Before State</h4>
                    <pre className="bg-black/30 rounded p-3 text-[10px] text-white/60 font-mono overflow-auto">{JSON.stringify(selectedLog.before_state, null, 2)}</pre>
                  </div>
                )}
                {selectedLog.after_state && (
                  <div>
                    <h4 className="text-white/50 text-xs mb-1">After State</h4>
                    <pre className="bg-black/30 rounded p-3 text-[10px] text-white/60 font-mono overflow-auto">{JSON.stringify(selectedLog.after_state, null, 2)}</pre>
                  </div>
                )}
                {selectedLog.diff && (
                  <div>
                    <h4 className="text-white/50 text-xs mb-1">Diff</h4>
                    <pre className="bg-black/30 rounded p-3 text-[10px] text-emerald-300/80 font-mono overflow-auto">{JSON.stringify(selectedLog.diff, null, 2)}</pre>
                  </div>
                )}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <h4 className="text-white/50 text-xs mb-1">Metadata</h4>
                    <pre className="bg-black/30 rounded p-3 text-[10px] text-white/60 font-mono overflow-auto">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrailPanel;

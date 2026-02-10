import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen, Search, TrendingUp, DollarSign, Users, BarChart3, Eye,
  Copy, Trash2, Play, Star, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ScriptLibrary = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    const { data } = await supabase.from("scripts").select("*").order("total_revenue", { ascending: false });
    setScripts(data || []);
  };

  const filtered = useMemo(() => {
    return scripts.filter(s => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [scripts, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: scripts.length,
    active: scripts.filter(s => s.status === "active").length,
    totalRevenue: scripts.reduce((s, sc) => s + Number(sc.total_revenue || 0), 0),
    avgCompletion: scripts.length > 0 ? scripts.reduce((s, sc) => s + Number(sc.avg_completion_rate || 0), 0) / scripts.length : 0,
    topCategory: scripts.reduce((acc, s) => { acc[s.category] = (acc[s.category] || 0) + 1; return acc; }, {} as Record<string, number>),
  }), [scripts]);

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "active" ? "draft" : "active";
    await supabase.from("scripts").update({ status: newStatus }).eq("id", id);
    toast.success(`Script ${newStatus === "active" ? "activated" : "deactivated"}`);
    loadScripts();
  };

  const deleteScript = async (id: string) => {
    await supabase.from("scripts").delete().eq("id", id);
    toast.success("Script deleted");
    loadScripts();
  };

  const cloneScript = async (script: any) => {
    const { error } = await supabase.from("scripts").insert({
      title: `${script.title} (Copy)`,
      description: script.description,
      category: script.category,
      target_segment: script.target_segment,
      parent_script_id: script.id,
    });
    if (!error) { toast.success("Script cloned"); loadScripts(); }
  };

  const categories = [...new Set(scripts.map(s => s.category))];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Scripts", value: stats.total, icon: BookOpen, color: "text-blue-400" },
          { title: "Active", value: stats.active, icon: Play, color: "text-emerald-400" },
          { title: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
          { title: "Avg Completion", value: `${stats.avgCompletion.toFixed(1)}%`, icon: TrendingUp, color: "text-purple-400" },
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

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scripts..." className="bg-white/5 border-white/10 text-white text-xs pl-8 h-8" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-28"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Status</SelectItem>
            <SelectItem value="draft" className="text-white text-xs">Draft</SelectItem>
            <SelectItem value="active" className="text-white text-xs">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Script grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(script => (
          <Card key={script.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">{script.title}</p>
                  {script.description && <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{script.description}</p>}
                </div>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${script.status === "active" ? "border-emerald-500/20 text-emerald-400" : "border-white/10 text-white/40"}`}>
                  {script.status}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{script.category}</Badge>
                <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">
                  <Users className="h-2 w-2 mr-0.5" />{script.target_segment?.replace(/_/g, " ")}
                </Badge>
                {script.version > 1 && <Badge variant="outline" className="text-[9px] border-blue-500/20 text-blue-400">v{script.version}</Badge>}
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 bg-white/[0.02] rounded-lg mb-3">
                <div><p className="text-[9px] text-white/30">Revenue</p><p className="text-xs font-medium text-amber-400">${Number(script.total_revenue || 0).toLocaleString()}</p></div>
                <div><p className="text-[9px] text-white/30">Runs</p><p className="text-xs font-medium text-white">{script.total_runs || 0}</p></div>
                <div><p className="text-[9px] text-white/30">Completion</p><p className="text-xs font-medium text-emerald-400">{Number(script.avg_completion_rate || 0).toFixed(0)}%</p></div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(script.id, script.status)} className="h-6 text-[10px] text-white/40 hover:text-white flex-1">
                  <Play className="h-3 w-3 mr-1" />{script.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => cloneScript(script)} className="h-6 text-[10px] text-white/40 hover:text-white">
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteScript(script.id)} className="h-6 text-[10px] text-red-400/50 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-8 w-8 text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No scripts found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScriptLibrary;

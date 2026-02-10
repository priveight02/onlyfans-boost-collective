import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, TrendingUp, DollarSign, Users, ArrowDown, ArrowUp, Zap,
  Target, Eye, Activity,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, LineChart, Line, CartesianGrid, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const ScriptAnalytics = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("all");
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [s, st, r] = await Promise.all([
        supabase.from("scripts").select("*").order("total_revenue", { ascending: false }),
        supabase.from("script_steps").select("*").order("step_order"),
        supabase.from("workflow_runs").select("*").order("started_at", { ascending: false }).limit(100),
      ]);
      setScripts(s.data || []);
      setSteps(st.data || []);
      setRuns(r.data || []);
    };
    load();
  }, []);

  const selectedSteps = useMemo(() => {
    if (selectedScriptId === "all") return steps;
    return steps.filter(s => s.script_id === selectedScriptId);
  }, [steps, selectedScriptId]);

  const funnelData = useMemo(() => {
    if (selectedSteps.length === 0) return [];
    return selectedSteps.map((step, i) => ({
      name: step.title || `Step ${i + 1}`,
      value: Math.max(100 - (Number(step.drop_off_rate || 0) * (i + 1)), 10),
      fill: `hsl(${210 + i * 20}, 70%, ${50 - i * 5}%)`,
    }));
  }, [selectedSteps]);

  const revenueByScript = useMemo(() => {
    return scripts.slice(0, 10).map(s => ({
      name: s.title.substring(0, 15),
      revenue: Number(s.total_revenue || 0),
      runs: s.total_runs || 0,
    }));
  }, [scripts]);

  const runTimeline = useMemo(() => {
    const byDate: Record<string, { date: string; runs: number; completed: number }> = {};
    runs.forEach(r => {
      const date = new Date(r.started_at).toLocaleDateString();
      if (!byDate[date]) byDate[date] = { date, runs: 0, completed: 0 };
      byDate[date].runs++;
      if (r.status === "completed") byDate[date].completed++;
    });
    return Object.values(byDate).slice(-14);
  }, [runs]);

  const overallStats = useMemo(() => ({
    totalRevenue: scripts.reduce((s, sc) => s + Number(sc.total_revenue || 0), 0),
    totalRuns: scripts.reduce((s, sc) => s + (sc.total_runs || 0), 0),
    avgCompletion: scripts.length > 0 ? scripts.reduce((s, sc) => s + Number(sc.avg_completion_rate || 0), 0) / scripts.length : 0,
    totalConversions: scripts.reduce((s, sc) => s + (sc.total_conversions || 0), 0),
    bestScript: scripts[0],
    avgRevenuePerRun: scripts.reduce((s, sc) => s + (sc.total_runs > 0 ? Number(sc.total_revenue || 0) / sc.total_runs : 0), 0) / (scripts.length || 1),
  }), [scripts]);

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Script Revenue", value: `$${overallStats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
          { title: "Total Runs", value: overallStats.totalRuns.toLocaleString(), icon: Activity, color: "text-blue-400" },
          { title: "Avg Completion", value: `${overallStats.avgCompletion.toFixed(1)}%`, icon: Target, color: "text-emerald-400" },
          { title: "$/Run", value: `$${overallStats.avgRevenuePerRun.toFixed(2)}`, icon: TrendingUp, color: "text-purple-400" },
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

      <div className="flex items-center gap-2">
        <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-48"><SelectValue placeholder="Filter by script" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Scripts</SelectItem>
            {scripts.map(s => <SelectItem key={s.id} value={s.id} className="text-white text-xs">{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by script */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-amber-400" /> Revenue by Script</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByScript.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueByScript}>
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "hsl(220,40%,13%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="hsl(40,90%,60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-white/20 text-xs text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Run timeline */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-blue-400" /> Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {runTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={runTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "hsl(220,40%,13%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: 11 }} />
                  <Area type="monotone" dataKey="runs" stroke="hsl(210,80%,60%)" fill="hsl(210,80%,60%)" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="completed" stroke="hsl(150,70%,50%)" fill="hsl(150,70%,50%)" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-white/20 text-xs text-center py-8">No runs yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step-by-step funnel */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-xs flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-purple-400" /> Step-by-Step Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSteps.length > 0 ? (
            <div className="space-y-2">
              {selectedSteps.map((step, i) => {
                const retention = Math.max(100 - (Number(step.drop_off_rate || 0) * (i + 1)), 0);
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-6 text-right font-mono">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white">{step.title || `Step ${i + 1}`}</span>
                        <span className="text-[10px] text-white/40">{retention.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${retention}%`,
                            background: `hsl(${retention > 60 ? 150 : retention > 30 ? 40 : 0}, 70%, 50%)`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 w-16 text-right">${Number(step.revenue_generated || 0).toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/20 text-xs text-center py-8">Select a script to view its funnel</p>
          )}
        </CardContent>
      </Card>

      {/* Top performers table */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-xs flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Script Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {scripts.slice(0, 8).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                <span className={`text-xs font-bold w-5 text-center ${i < 3 ? "text-amber-400" : "text-white/30"}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{s.title}</p>
                  <p className="text-[9px] text-white/30">{s.category} · {s.target_segment}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-amber-400">${Number(s.total_revenue || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-white/30">{s.total_runs || 0} runs</p>
                </div>
                <Badge variant="outline" className={`text-[9px] ${
                  Number(s.avg_completion_rate || 0) > 70 ? "border-emerald-500/20 text-emerald-400" :
                  Number(s.avg_completion_rate || 0) > 40 ? "border-amber-500/20 text-amber-400" :
                  "border-red-500/20 text-red-400"
                }`}>{Number(s.avg_completion_rate || 0).toFixed(0)}%</Badge>
              </div>
            ))}
          </div>
          {scripts.length === 0 && <p className="text-white/20 text-xs text-center py-6">No scripts yet</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptAnalytics;

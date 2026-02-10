import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, Activity, TrendingUp, Clock, CheckSquare, MessageSquare,
  Award, BarChart3, Flame, Star,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

const TOOLTIP_STYLE = { background: "hsl(220,60%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 };

const roleColors: Record<string, string> = {
  admin: "text-red-400",
  manager: "text-violet-400",
  chatter: "text-emerald-400",
  va: "text-amber-400",
};

const TeamPerformance = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [m, t, th, a] = await Promise.all([
        supabase.from("team_members").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("message_threads").select("*"),
        supabase.from("team_account_assignments").select("*"),
      ]);
      setMembers(m.data || []);
      setTasks(t.data || []);
      setThreads(th.data || []);
      setAssignments(a.data || []);
    };
    load();
  }, []);

  const performance = useMemo(() => {
    return members.filter(m => m.status === "active").map(member => {
      const memberTasks = tasks.filter(t => t.assigned_to === member.id);
      const completedTasks = memberTasks.filter(t => t.status === "done").length;
      const totalTasks = memberTasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const overdueTasks = memberTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;

      const memberThreads = threads.filter(t => t.assigned_chatter === member.id);
      const closedThreads = memberThreads.filter(t => t.status === "closed").length;
      const openThreads = memberThreads.filter(t => t.status !== "closed").length;
      const threadCloseRate = memberThreads.length > 0 ? (closedThreads / memberThreads.length) * 100 : 0;

      const accountsManaged = assignments.filter(a => a.team_member_id === member.id).length;

      // Productivity score
      const taskScore = Math.min(100, completionRate);
      const messageScore = Math.min(100, threadCloseRate);
      const accountScore = Math.min(100, accountsManaged * 25);
      const productivityScore = (taskScore * 0.4) + (messageScore * 0.35) + (accountScore * 0.25);

      return {
        ...member,
        completedTasks, totalTasks, completionRate, overdueTasks,
        closedThreads, openThreads, threadCloseRate, accountsManaged,
        productivityScore,
        radarData: [
          { metric: "Tasks", value: taskScore },
          { metric: "Messages", value: messageScore },
          { metric: "Accounts", value: accountScore },
          { metric: "Speed", value: overdueTasks === 0 ? 100 : Math.max(0, 100 - overdueTasks * 20) },
          { metric: "Active", value: member.status === "active" ? 100 : 0 },
        ],
      };
    }).sort((a, b) => b.productivityScore - a.productivityScore);
  }, [members, tasks, threads, assignments]);

  const activeMembers = members.filter(m => m.status === "active").length;
  const totalCompleted = tasks.filter(t => t.status === "done").length;
  const avgProductivity = performance.length > 0 ? performance.reduce((s, p) => s + p.productivityScore, 0) / performance.length : 0;

  const chartData = performance.slice(0, 10).map(p => ({
    name: p.name.split(" ")[0],
    tasks: p.completedTasks,
    threads: p.closedThreads,
    score: Math.round(p.productivityScore),
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Team", value: activeMembers, icon: Users, color: "text-blue-400" },
          { title: "Tasks Completed", value: totalCompleted, icon: CheckSquare, color: "text-emerald-400" },
          { title: "Avg Productivity", value: `${avgProductivity.toFixed(0)}%`, icon: Activity, color: "text-purple-400" },
          { title: "Top Performer", value: performance[0]?.name || "—", icon: Award, color: "text-yellow-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
              <p className="text-lg font-bold text-white truncate">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Heatmap */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" /> Performance Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performance.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No active team members</p>
          ) : (
            <div className="space-y-3">
              {performance.map((p, i) => {
                const getHeatColor = (score: number) => {
                  if (score >= 75) return "bg-emerald-500";
                  if (score >= 50) return "bg-blue-500";
                  if (score >= 25) return "bg-amber-500";
                  return "bg-red-500";
                };

                return (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="w-6 text-center">
                      {i === 0 ? <Star className="h-4 w-4 text-yellow-400 mx-auto" /> :
                        <span className="text-xs text-white/30">#{i + 1}</span>}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-violet-500/20 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 ${roleColors[p.role] || ""} border-white/10`}>{p.role}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {/* Mini heatmap cells */}
                        {[
                          { label: "Tasks", score: p.completionRate },
                          { label: "Msgs", score: p.threadCloseRate },
                          { label: "Accts", score: Math.min(100, p.accountsManaged * 25) },
                          { label: "Speed", score: p.overdueTasks === 0 ? 100 : Math.max(0, 100 - p.overdueTasks * 20) },
                        ].map(cell => (
                          <div key={cell.label} className="text-center">
                            <div className={`w-8 h-3 rounded ${getHeatColor(cell.score)} opacity-70`} title={`${cell.label}: ${cell.score.toFixed(0)}%`} />
                            <span className="text-[8px] text-white/30">{cell.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-center">
                        <p className="text-xs text-white/60">{p.completedTasks}/{p.totalTasks}</p>
                        <p className="text-[9px] text-white/30">Tasks</p>
                      </div>
                      <div className="w-16 text-center">
                        <p className="text-xs text-white/60">{p.closedThreads}</p>
                        <p className="text-[9px] text-white/30">Threads</p>
                      </div>
                      <div className="w-16 text-center">
                        <p className="text-xs text-white/60">{p.accountsManaged}</p>
                        <p className="text-[9px] text-white/30">Accounts</p>
                      </div>
                      <div className="w-16">
                        <div className="flex justify-between text-[10px] text-white/40 mb-0.5">
                          <span>Score</span>
                          <span>{p.productivityScore.toFixed(0)}%</span>
                        </div>
                        <Progress value={p.productivityScore} className="h-1.5 bg-white/5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Task & Thread Completion</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="tasks" fill="hsl(200,100%,50%)" radius={[4, 4, 0, 0]} name="Tasks Done" />
                <Bar dataKey="threads" fill="hsl(260,100%,65%)" radius={[4, 4, 0, 0]} name="Threads Closed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {performance[0] && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" /> Top Performer: {performance[0].name}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performance[0].radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="hsl(200,100%,50%)" fill="hsl(200,100%,50%)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamPerformance;

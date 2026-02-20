import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, Users, BarChart3, Crown, Activity, Wrench, EyeOff, PenOff, KeyRound, ArrowUpRight, ArrowDownRight, CheckCircle2, Circle, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { cachedFetch } from "@/lib/supabaseCache";

interface EnhancedDashboardProps {
  isAdmin?: boolean;
}

const spark = (base: number, len = 7) =>
  Array.from({ length: len }, (_, i) => ({ v: base * (0.7 + Math.random() * 0.6) }));

const chartTooltipStyle = {
  background: "hsl(222 47% 10%)",
  border: "1px solid hsl(217 91% 60% / 0.1)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: 12,
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)",
};

const EnhancedDashboard = ({ isAdmin = false }: EnhancedDashboardProps) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const cacheId = "global";
      const [accts, tasksData, teamData, actData] = await Promise.all([
        cachedFetch(cacheId, "managed_accounts", async () => {
          const { data } = await supabase.from("managed_accounts").select("*").order("monthly_revenue", { ascending: false });
          return data || [];
        }, undefined, { ttlMs: 5 * 60 * 1000 }),
        cachedFetch(cacheId, "tasks", async () => {
          const { data } = await supabase.from("tasks").select("*");
          return data || [];
        }, undefined, { ttlMs: 5 * 60 * 1000 }),
        cachedFetch(cacheId, "team_members", async () => {
          const { data } = await supabase.from("team_members").select("*");
          return data || [];
        }, undefined, { ttlMs: 5 * 60 * 1000 }),
        cachedFetch(cacheId, "account_activities", async () => {
          const { data } = await supabase.from("account_activities").select("*").order("created_at", { ascending: false }).limit(10);
          return data || [];
        }, undefined, { ttlMs: 2 * 60 * 1000 }),
      ]);
      setAccounts(accts);
      setTasks(tasksData);
      setTeamMembers(teamData);
      setActivities(actData);
    };
    load();
  }, []);

  const totalRevenue = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const topCreators = accounts.slice(0, 5);

  const revenueByMonth = [
    { month: "Jan", revenue: totalRevenue * 0.6 },
    { month: "Feb", revenue: totalRevenue * 0.7 },
    { month: "Mar", revenue: totalRevenue * 0.75 },
    { month: "Apr", revenue: totalRevenue * 0.85 },
    { month: "May", revenue: totalRevenue * 0.92 },
    { month: "Jun", revenue: totalRevenue },
  ];

  const pipelineData = [
    { stage: "Leads", value: 180, color: "hsl(217,91%,60%)" },
    { stage: "Contacted", value: 120, color: "hsl(199,89%,48%)" },
    { stage: "Qualified", value: 80, color: "hsl(262,83%,58%)" },
    { stage: "Proposal", value: 45, color: "hsl(330,81%,60%)" },
    { stage: "Closed", value: 28, color: "hsl(160,84%,39%)" },
  ];

  const kpis = [
    { label: "NEW LEADS", value: activeAccounts > 0 ? activeAccounts * 3 : 124, change: "+2%", positive: true, color: "hsl(160,84%,39%)", sparkData: spark(100) },
    { label: "ACTIVE DEALS", value: activeTasks > 0 ? activeTasks * 2 : 78, change: "+2%", positive: true, color: "hsl(262,83%,58%)", sparkData: spark(60) },
    { label: "TOTAL REVENUE", value: `$${totalRevenue > 0 ? totalRevenue.toLocaleString() : "58,200"}`, change: "+2%", positive: true, color: "hsl(217,91%,60%)", sparkData: spark(200) },
  ];

  // Admin controls
  const { settings, updateSetting, updateMaintenanceEndTime } = useSiteSettings();
  const [toggling, setToggling] = useState<string | null>(null);
  const [endTimeInput, setEndTimeInput] = useState(settings.maintenance_end_time || "");
  const [durationMode, setDurationMode] = useState<"datetime" | "duration">("datetime");
  const [durWeeks, setDurWeeks] = useState(0);
  const [durDays, setDurDays] = useState(0);
  const [durHours, setDurHours] = useState(0);
  const [durMinutes, setDurMinutes] = useState(0);
  const [durSeconds, setDurSeconds] = useState(0);

  useEffect(() => { setEndTimeInput(settings.maintenance_end_time || ""); }, [settings.maintenance_end_time]);

  const handleToggle = async (key: "registrations_paused" | "logins_paused" | "maintenance_mode") => {
    setToggling(key);
    try {
      const newValue = !settings[key];
      await updateSetting(key, newValue);
      toast.success(newValue ? `${key.replace(/_/g, " ")} enabled` : `${key.replace(/_/g, " ")} disabled`);
    } catch (err: any) { toast.error(err.message || "Failed"); } finally { setToggling(null); }
  };

  const handleSaveEndTime = async () => {
    try { await updateMaintenanceEndTime(endTimeInput || null); toast.success(endTimeInput ? "End time set" : "Cleared"); } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveDuration = async () => {
    const totalMs = ((durWeeks * 7 + durDays) * 86400 + durHours * 3600 + durMinutes * 60 + durSeconds) * 1000;
    if (totalMs <= 0) { toast.error("Enter a duration > 0"); return; }
    const endIso = new Date(Date.now() + totalMs).toISOString();
    try { await updateMaintenanceEndTime(endIso); setEndTimeInput(endIso); toast.success("Countdown started"); } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5">
      {/* Admin Controls */}
      {isAdmin && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {[
              { key: "registrations_paused", label: "Registrations", onLabel: "Paused", offLabel: "Open", onColor: "bg-red-500/10 border-red-500/20 text-red-400", offColor: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400" },
              { key: "logins_paused", label: "Logins", onLabel: "Paused", offLabel: "Open", onColor: "bg-red-500/10 border-red-500/20 text-red-400", offColor: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400" },
              { key: "maintenance_mode", label: "Maintenance", onLabel: "Active", offLabel: "Off", onColor: "bg-amber-500/10 border-amber-500/20 text-amber-400", offColor: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400" },
              { key: "hide_pricing", label: "Pricing Page", onLabel: "Hidden", offLabel: "Visible", onColor: "bg-orange-500/10 border-orange-500/20 text-orange-400", offColor: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400", icon: EyeOff },
              { key: "read_only_mode", label: "Read-Only Mode", onLabel: "Active", offLabel: "Off", onColor: "bg-violet-500/10 border-violet-500/20 text-violet-400", offColor: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400", icon: PenOff },
              { key: "force_password_reset", label: "Force Password Reset", onLabel: "Enforced", offLabel: "Off", onColor: "bg-rose-500/10 border-rose-500/20 text-rose-400", offColor: "bg-emerald-500/8 border-emerald-500/15 text-emerald-400", icon: KeyRound },
            ].map((ctrl) => {
              const isOn = settings[ctrl.key as keyof typeof settings] as boolean;
              return (
                <button key={ctrl.key} onClick={() => handleToggle(ctrl.key as any)} disabled={toggling === ctrl.key}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border transition-all text-left ${isOn ? ctrl.onColor : ctrl.offColor} hover:bg-white/[0.04]`}>
                  <span className="text-sm font-semibold">{ctrl.label}</span>
                  <span className="text-xs opacity-60">{isOn ? ctrl.onLabel : ctrl.offLabel}</span>
                </button>
              );
            })}
          </div>
          {settings.maintenance_mode && (
            <div className="crm-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-400 font-medium">Maintenance Countdown</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDurationMode("datetime")} className={`h-7 text-xs px-3 rounded-lg ${durationMode === "datetime" ? "bg-amber-500/15 text-amber-400" : "text-white/30"}`}>Date & Time</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDurationMode("duration")} className={`h-7 text-xs px-3 rounded-lg ${durationMode === "duration" ? "bg-amber-500/15 text-amber-400" : "text-white/30"}`}>Duration</Button>
                </div>
              </div>
              {durationMode === "datetime" ? (
                <div className="flex gap-2 flex-wrap">
                  <Input type="datetime-local" value={endTimeInput ? new Date(new Date(endTimeInput).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => setEndTimeInput(e.target.value ? new Date(e.target.value).toISOString() : "")} className="crm-input text-sm h-9 max-w-xs" />
                  <Button onClick={handleSaveEndTime} size="sm" className="crm-btn-primary h-9">Save</Button>
                  {endTimeInput && <Button onClick={() => { setEndTimeInput(""); updateMaintenanceEndTime(null); toast.success("Cleared"); }} size="sm" variant="ghost" className="text-white/40 hover:text-white h-9">Clear</Button>}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {[{ label: "Weeks", value: durWeeks, set: setDurWeeks }, { label: "Days", value: durDays, set: setDurDays }, { label: "Hours", value: durHours, set: setDurHours }, { label: "Min", value: durMinutes, set: setDurMinutes }, { label: "Sec", value: durSeconds, set: setDurSeconds }].map((f) => (
                      <div key={f.label} className="flex flex-col items-center gap-1">
                        <Input type="number" min={0} value={f.value} onChange={(e) => f.set(Math.max(0, parseInt(e.target.value) || 0))} className="crm-input text-sm h-9 w-16 text-center" />
                        <span className="text-[10px] text-white/30">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDuration} size="sm" className="crm-btn-primary h-9">Start Countdown</Button>
                    {settings.maintenance_end_time && <Button onClick={() => { setEndTimeInput(""); updateMaintenanceEndTime(null); toast.success("Cleared"); }} size="sm" variant="ghost" className="text-white/40 hover:text-white h-9">Clear</Button>}
                  </div>
                </div>
              )}
              {settings.maintenance_end_time && <p className="text-xs text-white/25">Ends: {new Date(settings.maintenance_end_time).toLocaleString()}</p>}
            </div>
          )}
        </>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="crm-kpi-card group">
            {/* Background glow */}
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-[0.08] pointer-events-none" style={{ background: kpi.color }} />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full blur-3xl opacity-[0.04] pointer-events-none" style={{ background: kpi.color }} />
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold tracking-widest" style={{ color: `${kpi.color}` }}>{kpi.label}</p>
                <p className="text-4xl font-bold text-white tracking-tight leading-none">{kpi.value}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  {kpi.positive ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
                  <span className={`text-xs font-semibold ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>{kpi.change}</span>
                </div>
              </div>
              <div className="w-28 h-14 opacity-80 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.sparkData}>
                    <defs>
                      <linearGradient id={`spark-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2} fill={`url(#spark-${kpi.label})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Sales Pipeline + Chart */}
        <div className="lg:col-span-3 crm-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="crm-section-title">Sales Pipeline</h3>
            <span className="text-[11px] text-white/25">This quarter</span>
          </div>
          <div className="flex flex-col items-center gap-2 mb-6">
            {pipelineData.map((stage, i) => {
              const widthPct = 95 - i * 14;
              return (
                <div key={stage.stage} className="relative flex items-center justify-between px-5 py-3 rounded-xl transition-all hover:brightness-110 cursor-default"
                  style={{ width: `${widthPct}%`, background: `linear-gradient(135deg, ${stage.color}18, ${stage.color}08)`, borderLeft: `3px solid ${stage.color}` }}>
                  <span className="text-xs font-medium text-white/60">{stage.stage}</span>
                  <span className="text-sm font-bold text-white">{stage.value}</span>
                </div>
              );
            })}
          </div>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revGradV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.03)" />
                <XAxis dataKey="month" stroke="transparent" tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.25)" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.25)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(217,91%,60%)" strokeWidth={2.5} fill="url(#revGradV2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent Deals */}
          <div className="crm-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="crm-section-title">Recent Deals</h3>
              <button className="text-[11px] text-[hsl(217,91%,60%)] hover:underline font-medium">View all</button>
            </div>
            <div className="space-y-1.5">
              {(topCreators.length > 0 ? topCreators.slice(0, 4) : [
                { id: "1", display_name: "Sarah Carter", username: "sarah", monthly_revenue: 8500, status: "active" },
                { id: "2", display_name: "Jake Nguyen", username: "jake", monthly_revenue: 12300, status: "active" },
                { id: "3", display_name: "Mia Torres", username: "mia", monthly_revenue: 5200, status: "pending" },
                { id: "4", display_name: "Liam Park", username: "liam", monthly_revenue: 9800, status: "active" },
              ]).map((deal: any, i: number) => {
                const colors = ["hsl(217,91%,60%)", "hsl(262,83%,58%)", "hsl(160,84%,39%)", "hsl(339,90%,51%)"];
                return (
                  <div key={deal.id} className="crm-list-row">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${colors[i % 4]}35, ${colors[i % 4]}10)` }}>
                        {(deal.display_name || deal.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{deal.display_name || deal.username}</p>
                        <p className="text-[11px] text-white/25">@{deal.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">${(deal.monthly_revenue || 0).toLocaleString()}</p>
                      <span className={`text-[10px] font-semibold ${deal.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                        {deal.status === "active" ? "Won" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Contacts */}
          <div className="crm-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="crm-section-title">Top Contacts</h3>
              <span className="text-[11px] text-white/25">{topCreators.length || 5} people</span>
            </div>
            <div className="space-y-1.5">
              {(topCreators.length > 0 ? topCreators.slice(0, 3) : [
                { id: "a", display_name: "Megan Collins", username: "megan", subscriber_count: 45200 },
                { id: "b", display_name: "James Parker", username: "james", subscriber_count: 32100 },
                { id: "c", display_name: "Daniel Holt", username: "daniel", subscriber_count: 28700 },
              ]).map((contact: any) => (
                <div key={contact.id} className="crm-list-row">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(217,91%,60%)]/20 to-[hsl(262,83%,58%)]/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {(contact.display_name || contact.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{contact.display_name || contact.username}</p>
                      <p className="text-[11px] text-white/25">{(contact.subscriber_count || 0).toLocaleString()} followers</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.04]">
                      <Phone className="h-3.5 w-3.5 text-white/35" />
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.04]">
                      <Mail className="h-3.5 w-3.5 text-white/35" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Tasks + Activity ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="crm-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="crm-section-title">Upcoming Tasks</h3>
            <div className="flex gap-1.5">
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)] font-semibold">{activeTasks} active</span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/30 font-medium">{tasks.length} total</span>
            </div>
          </div>
          <div className="space-y-1">
            {tasks.length === 0 ? (
              <p className="text-white/20 text-sm py-8 text-center">No tasks yet</p>
            ) : tasks.slice(0, 5).map((task: any) => (
              <div key={task.id} className="crm-list-row">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${task.status === "completed" ? "bg-emerald-500/15 border-emerald-500/30" : task.status === "in_progress" ? "bg-[hsl(217,91%,60%)]/15 border-[hsl(217,91%,60%)]/30" : "bg-white/[0.04] border-white/[0.06]"}`}>
                    {task.status === "completed" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    {task.status === "in_progress" && <Circle className="h-3 w-3 text-[hsl(217,91%,60%)]" />}
                  </div>
                  <p className={`text-sm font-medium truncate ${task.status === "completed" ? "text-white/30 line-through" : "text-white/80"}`}>{task.title}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${task.priority === "high" ? "bg-red-500/10 text-red-400" : task.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-white/[0.04] text-white/30"}`}>
                  {task.priority || "normal"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="crm-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="crm-section-title">Recent Activity</h3>
            <span className="text-[11px] text-white/25">Last 7 days</span>
          </div>
          <div className="space-y-1">
            {activities.length === 0 ? (
              <p className="text-white/20 text-sm py-8 text-center">No activity yet</p>
            ) : activities.map((act) => (
              <div key={act.id} className="crm-list-row">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white/70 truncate">{act.description}</p>
                    <p className="text-[11px] text-white/20">{new Date(act.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/[0.06] text-white/25 shrink-0">{act.activity_type}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;

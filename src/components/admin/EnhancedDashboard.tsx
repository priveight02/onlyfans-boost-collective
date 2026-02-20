import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { DollarSign, Users, BarChart3, Crown, Activity, Wrench, EyeOff, PenOff, KeyRound, ArrowUpRight, ArrowDownRight, CheckCircle2, Circle, Phone, Mail, TrendingUp, Calendar } from "lucide-react";
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
  background: "hsl(222 47% 8%)",
  border: "1px solid hsl(217 91% 60% / 0.12)",
  borderRadius: "10px",
  color: "#fff",
  fontSize: 11,
  boxShadow: "0 12px 40px hsl(0 0% 0% / 0.6)",
  padding: "8px 12px",
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

  const kpis = [
    { label: "New Leads", value: activeAccounts > 0 ? activeAccounts * 3 : 124, change: "+5%", positive: true, color: "hsl(160,84%,39%)", gradFrom: "hsl(160 84% 39% / 0.12)", gradTo: "hsl(160 84% 39% / 0.02)", sparkData: spark(100) },
    { label: "Active Deals", value: activeTasks > 0 ? activeTasks * 2 : 78, change: "+2%", positive: true, color: "hsl(262,83%,58%)", gradFrom: "hsl(262 83% 58% / 0.12)", gradTo: "hsl(262 83% 58% / 0.02)", sparkData: spark(60) },
    { label: "Total Revenue", value: `$${totalRevenue > 0 ? totalRevenue.toLocaleString() : "58,200"}`, change: "+12%", positive: true, color: "hsl(217,91%,60%)", gradFrom: "hsl(217 91% 60% / 0.12)", gradTo: "hsl(217 91% 60% / 0.02)", sparkData: spark(200) },
    { label: "Closed Deals", value: "68%", change: "+3%", positive: true, color: "hsl(339,90%,51%)", gradFrom: "hsl(339 90% 51% / 0.12)", gradTo: "hsl(339 90% 51% / 0.02)", sparkData: spark(80) },
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

  const dealColors = ["hsl(217,91%,60%)", "hsl(262,83%,58%)", "hsl(160,84%,39%)", "hsl(339,90%,51%)"];

  return (
    <div className="space-y-5 relative z-10">
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl p-5 group cursor-default transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(165deg, ${kpi.gradFrom}, ${kpi.gradTo})`,
              border: `1px solid ${kpi.color}20`,
              boxShadow: `0 0 0 1px ${kpi.color}08, 0 4px 24px hsl(222 47% 4% / 0.4)`,
            }}
          >
            {/* Subtle corner glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.15] blur-[40px] pointer-events-none transition-opacity group-hover:opacity-25" style={{ background: kpi.color }} />

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: kpi.color }}>{kpi.label}</p>
                <p className="text-[28px] font-bold text-white tracking-tight leading-none">{kpi.value}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  {kpi.positive ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : <ArrowDownRight className="h-3 w-3 text-red-400" />}
                  <span className={`text-[11px] font-semibold ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>{kpi.change}</span>
                  <span className="text-[10px] text-white/20 ml-0.5">vs last month</span>
                </div>
              </div>
              <div className="w-20 h-12 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.sparkData}>
                    <defs>
                      <linearGradient id={`spark-v3-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2} fill={`url(#spark-v3-${idx})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-3 rounded-2xl p-5 relative overflow-hidden" style={{
          background: "linear-gradient(165deg, hsl(222 47% 9% / 0.9), hsl(222 47% 6% / 0.85))",
          border: "1px solid hsl(217 91% 60% / 0.06)",
          boxShadow: "0 4px 24px hsl(222 47% 4% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.02)",
        }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Sales Performance</h3>
              <p className="text-[11px] text-white/20 mt-0.5">Revenue trends over time</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: "hsl(217 91% 60% / 0.12)", color: "hsl(217 91% 60%)" }}>Revenue</span>
              <span className="text-[11px] text-white/20">This month</span>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revGradV3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="transparent" tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.2)" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.2)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(217,91%,60%)" strokeWidth={2} fill="url(#revGradV3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent Deals */}
          <div className="rounded-2xl p-4 relative overflow-hidden" style={{
            background: "linear-gradient(165deg, hsl(222 47% 9% / 0.9), hsl(222 47% 6% / 0.85))",
            border: "1px solid hsl(217 91% 60% / 0.06)",
            boxShadow: "0 4px 24px hsl(222 47% 4% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.02)",
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Recent Deals</h3>
              <button className="text-[11px] font-medium hover:underline" style={{ color: "hsl(217 91% 60%)" }}>View all</button>
            </div>
            <div className="space-y-1">
              {(topCreators.length > 0 ? topCreators.slice(0, 4) : [
                { id: "1", display_name: "Sarah Carter", username: "sarah", monthly_revenue: 8500, status: "active" },
                { id: "2", display_name: "Jake Nguyen", username: "jake", monthly_revenue: 12300, status: "active" },
                { id: "3", display_name: "Mia Torres", username: "mia", monthly_revenue: 5200, status: "pending" },
                { id: "4", display_name: "Liam Park", username: "liam", monthly_revenue: 9800, status: "active" },
              ]).map((deal: any, i: number) => (
                <div key={deal.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${dealColors[i % 4]}30, ${dealColors[i % 4]}10)` }}>
                      {(deal.display_name || deal.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white/90">{deal.display_name || deal.username}</p>
                      <p className="text-[10px] text-white/20">@{deal.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-white">${(deal.monthly_revenue || 0).toLocaleString()}</p>
                    <span className={`text-[10px] font-semibold ${deal.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                      {deal.status === "active" ? "Won" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Contacts */}
          <div className="rounded-2xl p-4 relative overflow-hidden" style={{
            background: "linear-gradient(165deg, hsl(222 47% 9% / 0.9), hsl(222 47% 6% / 0.85))",
            border: "1px solid hsl(217 91% 60% / 0.06)",
            boxShadow: "0 4px 24px hsl(222 47% 4% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.02)",
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Top Contacts</h3>
              <span className="text-[11px] text-white/20">{topCreators.length || 5} people</span>
            </div>
            <div className="space-y-1">
              {(topCreators.length > 0 ? topCreators.slice(0, 3) : [
                { id: "a", display_name: "Megan Collins", username: "megan", subscriber_count: 45200 },
                { id: "b", display_name: "James Parker", username: "james", subscriber_count: 32100 },
                { id: "c", display_name: "Daniel Holt", username: "daniel", subscriber_count: 28700 },
              ]).map((contact: any) => (
                <div key={contact.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, hsl(217 91% 60% / 0.15), hsl(262 83% 58% / 0.1))" }}>
                      {(contact.display_name || contact.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white/90">{contact.display_name || contact.username}</p>
                      <p className="text-[10px] text-white/20">{(contact.subscriber_count || 0).toLocaleString()} followers</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]" style={{ background: "hsl(222 47% 10% / 0.6)", border: "1px solid hsl(217 91% 60% / 0.06)" }}>
                      <Phone className="h-3 w-3 text-white/30" />
                    </button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]" style={{ background: "hsl(222 47% 10% / 0.6)", border: "1px solid hsl(217 91% 60% / 0.06)" }}>
                      <Mail className="h-3 w-3 text-white/30" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Tasks + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{
          background: "linear-gradient(165deg, hsl(222 47% 9% / 0.9), hsl(222 47% 6% / 0.85))",
          border: "1px solid hsl(217 91% 60% / 0.06)",
          boxShadow: "0 4px 24px hsl(222 47% 4% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.02)",
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Upcoming Tasks</h3>
            <div className="flex gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "hsl(217 91% 60% / 0.1)", color: "hsl(217 91% 60%)" }}>{activeTasks} active</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/25 font-medium">{tasks.length} total</span>
            </div>
          </div>
          <div className="space-y-0.5">
            {tasks.length === 0 ? (
              <p className="text-white/15 text-sm py-8 text-center">No tasks yet</p>
            ) : tasks.slice(0, 5).map((task: any) => (
              <div key={task.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${task.status === "completed" ? "bg-emerald-500/15 border-emerald-500/30" : task.status === "in_progress" ? "bg-[hsl(217,91%,60%)]/15 border-[hsl(217,91%,60%)]/30" : "bg-white/[0.04] border-white/[0.06]"}`}>
                    {task.status === "completed" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    {task.status === "in_progress" && <Circle className="h-3 w-3 text-[hsl(217,91%,60%)]" />}
                  </div>
                  <p className={`text-[13px] font-medium truncate ${task.status === "completed" ? "text-white/25 line-through" : "text-white/75"}`}>{task.title}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${task.priority === "high" ? "bg-red-500/10 text-red-400" : task.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-white/[0.04] text-white/25"}`}>
                  {task.priority || "normal"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 relative overflow-hidden" style={{
          background: "linear-gradient(165deg, hsl(222 47% 9% / 0.9), hsl(222 47% 6% / 0.85))",
          border: "1px solid hsl(217 91% 60% / 0.06)",
          boxShadow: "0 4px 24px hsl(222 47% 4% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.02)",
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            <span className="text-[11px] text-white/20">Last 7 days</span>
          </div>
          <div className="space-y-0.5">
            {activities.length === 0 ? (
              <p className="text-white/15 text-sm py-8 text-center">No activity yet</p>
            ) : activities.map((act) => (
              <div key={act.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "hsl(217 91% 60%)", boxShadow: "0 0 8px hsl(217 91% 60% / 0.4)" }} />
                  <div className="min-w-0">
                    <p className="text-[13px] text-white/65 truncate">{act.description}</p>
                    <p className="text-[10px] text-white/15">{new Date(act.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/[0.06] text-white/20 shrink-0">{act.activity_type}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;

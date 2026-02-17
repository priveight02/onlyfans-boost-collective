import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { DollarSign, Users, BarChart3, Crown, Activity, Wrench, Clock, EyeOff, PenOff, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cachedFetch } from "@/lib/supabaseCache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const COLORS = ["hsl(200,100%,50%)", "hsl(260,100%,65%)", "hsl(340,80%,55%)", "hsl(160,70%,45%)", "hsl(30,90%,55%)"];

interface EnhancedDashboardProps {
  isAdmin?: boolean;
}

const EnhancedDashboard = ({ isAdmin = false }: EnhancedDashboardProps) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const cacheId = "global";
      const [accts, tasksData, teamData, actData, visitsData] = await Promise.all([
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
        Promise.resolve([]),
      ]);
      setAccounts(accts);
      setTasks(tasksData);
      setTeamMembers(teamData);
      setActivities(actData);
      setVisits(visitsData);
    };
    load();
  }, []);

  const totalRevenue = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
  const totalSubs = accounts.reduce((s, a) => s + (a.subscriber_count || 0), 0);
  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const avgEngagement = accounts.length > 0 ? (accounts.reduce((s, a) => s + (a.engagement_rate || 0), 0) / accounts.length).toFixed(1) : "0";
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const activeTeam = teamMembers.filter((t) => t.status === "active").length;

  const tierData = ["premium", "standard", "basic"].map((tier) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value: accounts.filter((a) => a.tier === tier).length,
  })).filter((d) => d.value > 0);

  const topCreators = accounts.slice(0, 5);

  const revenueByMonth = [
    { month: "Jan", revenue: totalRevenue * 0.6 },
    { month: "Feb", revenue: totalRevenue * 0.7 },
    { month: "Mar", revenue: totalRevenue * 0.75 },
    { month: "Apr", revenue: totalRevenue * 0.85 },
    { month: "May", revenue: totalRevenue * 0.92 },
    { month: "Jun", revenue: totalRevenue },
  ];

  const stats = [
    { title: "Total Monthly Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, change: "+18.2%", positive: true },
    { title: "Active Creators", value: activeAccounts.toString(), icon: Crown, change: `${accounts.length} total`, positive: true },
    { title: "Total Subscribers", value: totalSubs.toLocaleString(), icon: Users, change: "+12.4%", positive: true },
    { title: "Avg Engagement", value: `${avgEngagement}%`, icon: BarChart3, change: "+3.1%", positive: true },
    { title: "Active Tasks", value: activeTasks.toString(), icon: Activity, change: `${tasks.length} total`, positive: true },
    { title: "Team Members", value: activeTeam.toString(), icon: Users, change: `${teamMembers.length} total`, positive: true },
  ];

  const { settings, updateSetting, updateMaintenanceEndTime } = useSiteSettings();
  const [toggling, setToggling] = useState<string | null>(null);
  const [endTimeInput, setEndTimeInput] = useState(settings.maintenance_end_time || "");
  const [durationMode, setDurationMode] = useState<"datetime" | "duration">("datetime");
  const [durWeeks, setDurWeeks] = useState(0);
  const [durDays, setDurDays] = useState(0);
  const [durHours, setDurHours] = useState(0);
  const [durMinutes, setDurMinutes] = useState(0);
  const [durSeconds, setDurSeconds] = useState(0);

  useEffect(() => {
    setEndTimeInput(settings.maintenance_end_time || "");
  }, [settings.maintenance_end_time]);

  const handleToggle = async (key: "registrations_paused" | "logins_paused" | "maintenance_mode") => {
    setToggling(key);
    try {
      const newValue = !settings[key];
      await updateSetting(key, newValue);
      const labels: Record<string, string> = {
        registrations_paused: newValue ? "Registrations paused" : "Registrations resumed",
        logins_paused: newValue ? "Logins paused" : "Logins resumed",
        maintenance_mode: newValue ? "Maintenance mode enabled" : "Maintenance mode disabled",
      };
      toast.success(labels[key]);
    } catch (err: any) {
      toast.error(err.message || "Failed to update setting");
    } finally {
      setToggling(null);
    }
  };

  const handleSaveEndTime = async () => {
    try {
      await updateMaintenanceEndTime(endTimeInput || null);
      toast.success(endTimeInput ? "Maintenance end time set" : "Maintenance end time cleared");
    } catch (err: any) {
      toast.error(err.message || "Failed to update end time");
    }
  };

  const handleSaveDuration = async () => {
    const totalMs = ((durWeeks * 7 + durDays) * 86400 + durHours * 3600 + durMinutes * 60 + durSeconds) * 1000;
    if (totalMs <= 0) { toast.error("Enter a duration greater than 0"); return; }
    const endIso = new Date(Date.now() + totalMs).toISOString();
    try {
      await updateMaintenanceEndTime(endIso);
      setEndTimeInput(endIso);
      toast.success("Maintenance countdown started");
    } catch (err: any) {
      toast.error(err.message || "Failed to set duration");
    }
  };

   return (
    <div className="space-y-6">
      {/* Site Controls - Admin only */}
      {isAdmin && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {[
              { key: "registrations_paused", label: "Registrations", onLabel: "Paused", offLabel: "Open", onColor: "bg-red-500/15 border-red-500/30 text-red-300", offColor: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300" },
              { key: "logins_paused", label: "Logins", onLabel: "Paused", offLabel: "Open", onColor: "bg-red-500/15 border-red-500/30 text-red-300", offColor: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300" },
              { key: "maintenance_mode", label: "Maintenance", onLabel: "Active", offLabel: "Off", onColor: "bg-amber-500/15 border-amber-500/30 text-amber-300", offColor: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300", icon: Wrench },
              { key: "hide_pricing", label: "Pricing Page", onLabel: "Hidden", offLabel: "Visible", onColor: "bg-orange-500/15 border-orange-500/30 text-orange-300", offColor: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300", icon: EyeOff },
              { key: "read_only_mode", label: "Read-Only Mode", onLabel: "Active", offLabel: "Off", onColor: "bg-violet-500/15 border-violet-500/30 text-violet-300", offColor: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300", icon: PenOff },
              { key: "force_password_reset", label: "Force Password Reset", onLabel: "Enforced", offLabel: "Off", onColor: "bg-rose-500/15 border-rose-500/30 text-rose-300", offColor: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300", icon: KeyRound },
            ].map((ctrl) => {
              const isOn = settings[ctrl.key as keyof typeof settings] as boolean;
              return (
                <button
                  key={ctrl.key}
                  onClick={() => handleToggle(ctrl.key as any)}
                  disabled={toggling === ctrl.key}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border transition-all text-left ${isOn ? ctrl.onColor : ctrl.offColor} hover:bg-white/[0.08]`}
                >
                  <span className="text-sm font-semibold">{ctrl.label}</span>
                  <span className="text-xs opacity-60">{isOn ? ctrl.onLabel : ctrl.offLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Maintenance End Time */}
          {settings.maintenance_mode && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-300 font-medium">Maintenance Countdown</p>
                <div className="flex gap-1">
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setDurationMode("datetime")}
                    className={`h-7 text-xs px-3 ${durationMode === "datetime" ? "bg-amber-500/20 text-amber-300" : "text-white/40"}`}
                  >
                    Date & Time
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setDurationMode("duration")}
                    className={`h-7 text-xs px-3 ${durationMode === "duration" ? "bg-amber-500/20 text-amber-300" : "text-white/40"}`}
                  >
                    Duration
                  </Button>
                </div>
              </div>

              {durationMode === "datetime" ? (
                <div className="flex gap-2 flex-wrap">
                  <Input
                    type="datetime-local"
                    value={endTimeInput ? new Date(new Date(endTimeInput).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setEndTimeInput(e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="bg-white/5 border-white/10 text-white text-sm h-9 max-w-xs"
                  />
                  <Button onClick={handleSaveEndTime} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-9">
                    Save
                  </Button>
                  {endTimeInput && (
                    <Button onClick={() => { setEndTimeInput(""); updateMaintenanceEndTime(null); toast.success("Countdown cleared"); }} size="sm" variant="ghost" className="text-white/50 hover:text-white h-9">
                      Clear
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: "Weeks", value: durWeeks, set: setDurWeeks },
                      { label: "Days", value: durDays, set: setDurDays },
                      { label: "Hours", value: durHours, set: setDurHours },
                      { label: "Min", value: durMinutes, set: setDurMinutes },
                      { label: "Sec", value: durSeconds, set: setDurSeconds },
                    ].map((f) => (
                      <div key={f.label} className="flex flex-col items-center gap-1">
                        <Input
                          type="number" min={0} value={f.value}
                          onChange={(e) => f.set(Math.max(0, parseInt(e.target.value) || 0))}
                          className="bg-white/5 border-white/10 text-white text-sm h-9 w-16 text-center"
                        />
                        <span className="text-[10px] text-white/40">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDuration} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-9">
                      Start Countdown
                    </Button>
                    {settings.maintenance_end_time && (
                      <Button onClick={() => { setEndTimeInput(""); updateMaintenanceEndTime(null); toast.success("Countdown cleared"); }} size="sm" variant="ghost" className="text-white/50 hover:text-white h-9">
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {settings.maintenance_end_time && (
                <p className="text-xs text-white/30">
                  Ends: {new Date(settings.maintenance_end_time).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* KPI Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/[0.08] transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <stat.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-[10px] text-emerald-400">{stat.change}</span>
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200,100%,50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(200,100%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(200,100%,50%)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Creator Tiers</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] flex items-center justify-center">
            {tierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {tierData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-white/30 text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Creators & Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-400" /> Top Creators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCreators.length === 0 && <p className="text-white/30 text-sm">No creators yet</p>}
              {topCreators.map((creator, i) => (
                <div key={creator.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/30 w-5">#{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                      {(creator.display_name || creator.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{creator.display_name || creator.username}</p>
                      <p className="text-[10px] text-white/40">@{creator.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">${(creator.monthly_revenue || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-white/40">{(creator.subscriber_count || 0).toLocaleString()} subs</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activities.length === 0 && <p className="text-white/30 text-sm">No recent activity</p>}
              {activities.slice(0, 8).map((act, i) => (
                <div key={act.id || i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-xs text-white/60 truncate max-w-[200px]">{act.description}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-white/10 text-white/30">{act.activity_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Overview */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "To Do", count: tasks.filter((t) => t.status === "todo").length, color: "bg-white/20" },
              { label: "In Progress", count: tasks.filter((t) => t.status === "in_progress").length, color: "bg-blue-500" },
              { label: "Done", count: tasks.filter((t) => t.status === "done").length, color: "bg-emerald-500" },
              { label: "Blocked", count: tasks.filter((t) => t.status === "blocked").length, color: "bg-red-500" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`w-3 h-3 rounded-full ${s.color} mx-auto mb-1`} />
                <p className="text-lg font-bold text-white">{s.count}</p>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDashboard;

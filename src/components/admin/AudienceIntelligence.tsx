import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Users, TrendingUp, Star, AlertTriangle, Crown, UserPlus } from "lucide-react";

interface Account {
  id: string;
  username: string;
  display_name: string | null;
  status: string;
  tier: string | null;
  monthly_revenue: number;
  total_revenue: number;
  subscriber_count: number;
  engagement_rate: number;
  content_count: number;
  last_activity_at: string | null;
  created_at: string;
}

interface AudienceIntelligenceProps {
  accounts: Account[];
}

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

const AudienceIntelligence = ({ accounts }: AudienceIntelligenceProps) => {
  const analytics = useMemo(() => {
    if (!accounts.length) return null;

    const totalRevenue = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
    const totalSubs = accounts.reduce((s, a) => s + (a.subscriber_count || 0), 0);
    const avgEngagement = accounts.reduce((s, a) => s + (a.engagement_rate || 0), 0) / accounts.length;
    const avgRevenue = totalRevenue / accounts.length;

    // Segment by tier
    const tierDistribution = accounts.reduce<Record<string, number>>((acc, a) => {
      const tier = a.tier || "standard";
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    const tierData = Object.entries(tierDistribution).map(([name, value]) => ({ name, value }));

    // Segment by status
    const statusDistribution = accounts.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    const statusData = Object.entries(statusDistribution).map(([name, value]) => ({ name, value }));

    // Revenue per account for bar chart
    const revenueByAccount = [...accounts]
      .sort((a, b) => (b.monthly_revenue || 0) - (a.monthly_revenue || 0))
      .slice(0, 8)
      .map((a) => ({
        name: a.display_name || a.username,
        revenue: a.monthly_revenue || 0,
        subs: a.subscriber_count || 0,
      }));

    // Identify segments
    const highValue = accounts.filter((a) => (a.monthly_revenue || 0) > avgRevenue * 1.5);
    const inactive = accounts.filter((a) => {
      if (!a.last_activity_at) return true;
      const days = (Date.now() - new Date(a.last_activity_at).getTime()) / 86400000;
      return days > 30;
    });
    const lowEngagement = accounts.filter((a) => (a.engagement_rate || 0) < avgEngagement * 0.5);
    const newAccounts = accounts.filter((a) => {
      const days = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
      return days < 30;
    });

    return {
      totalRevenue, totalSubs, avgEngagement, avgRevenue,
      tierData, statusData, revenueByAccount,
      highValue, inactive, lowEngagement, newAccounts,
    };
  }, [accounts]);

  if (!analytics) {
    return (
      <div className="text-center py-16 text-white/20">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Add accounts to your CRM to see audience intelligence</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Monthly Revenue", value: `$${analytics.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Total Subscribers", value: analytics.totalSubs.toLocaleString(), icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Avg Engagement", value: `${analytics.avgEngagement.toFixed(1)}%`, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Avg Revenue/Account", value: `$${analytics.avgRevenue.toFixed(0)}`, icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06] transition-colors">
            <CardContent className="p-5">
              <div className={`p-2 rounded-lg ${kpi.bg} w-fit mb-3`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-white/40 mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue by account */}
        <Card className="bg-white/[0.04] border-white/[0.08] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-heading">Revenue by Account</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.revenueByAccount} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(200 100% 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tier distribution */}
        <Card className="bg-white/[0.04] border-white/[0.08]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-heading">Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {analytics.tierData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="flex flex-wrap gap-2 px-5 pb-4">
            {analytics.tierData.map((t, i) => (
              <div key={t.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] text-white/40 capitalize">{t.name} ({t.value})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Segments */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "High-Value Accounts",
            count: analytics.highValue.length,
            accounts: analytics.highValue,
            icon: Crown,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            description: "Revenue > 1.5x average",
          },
          {
            label: "Inactive (30d+)",
            count: analytics.inactive.length,
            accounts: analytics.inactive,
            icon: AlertTriangle,
            color: "text-red-400",
            bg: "bg-red-500/10",
            description: "No activity in 30+ days",
          },
          {
            label: "Low Engagement",
            count: analytics.lowEngagement.length,
            accounts: analytics.lowEngagement,
            icon: TrendingUp,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            description: "Below 50% avg engagement",
          },
          {
            label: "New Accounts",
            count: analytics.newAccounts.length,
            accounts: analytics.newAccounts,
            icon: UserPlus,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            description: "Added in last 30 days",
          },
        ].map((seg) => (
          <Card key={seg.label} className="bg-white/[0.04] border-white/[0.08]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${seg.bg}`}>
                  <seg.icon className={`h-3.5 w-3.5 ${seg.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-white/70">{seg.label}</p>
                  <p className="text-[10px] text-white/30">{seg.description}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-2">{seg.count}</p>
              {seg.accounts.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1 border-t border-white/[0.04]">
                  <span className="text-xs text-white/50 truncate">{a.display_name || a.username}</span>
                  <span className="text-[10px] text-white/25">${(a.monthly_revenue || 0).toLocaleString()}/mo</span>
                </div>
              ))}
              {seg.accounts.length > 3 && (
                <p className="text-[10px] text-white/20 mt-1">+{seg.accounts.length - 3} more</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown */}
      <Card className="bg-white/[0.04] border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm font-heading">Account Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {analytics.statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-4 py-2.5 border border-white/[0.05]">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  s.name === "active" ? "bg-emerald-400" :
                  s.name === "paused" ? "bg-amber-400" :
                  s.name === "inactive" ? "bg-red-400" :
                  "bg-blue-400"
                }`} />
                <span className="text-sm text-white/60 capitalize">{s.name}</span>
                <Badge variant="outline" className="text-[10px] text-white/40 border-white/10">{s.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudienceIntelligence;

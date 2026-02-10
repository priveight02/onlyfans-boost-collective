import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, TrendingDown, Users, Percent, ArrowUpRight, ArrowDownRight,
  PiggyBank, CreditCard, Wallet, Target, BarChart3, Activity, Download,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["hsl(200,100%,50%)", "hsl(260,100%,65%)", "hsl(340,80%,55%)", "hsl(160,70%,45%)", "hsl(30,90%,55%)", "hsl(280,60%,55%)"];
const TOOLTIP_STYLE = { background: "hsl(220,60%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 };

const AdvancedFinancials = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    const load = async () => {
      const [a, r] = await Promise.all([
        supabase.from("managed_accounts").select("*").order("monthly_revenue", { ascending: false }),
        supabase.from("financial_records").select("*").order("created_at", { ascending: false }),
      ]);
      setAccounts(a.data || []);
      setRecords(r.data || []);
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalMonthly = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
    const totalLifetime = accounts.reduce((s, a) => s + (a.total_revenue || 0), 0);
    const totalSubs = accounts.reduce((s, a) => s + (a.subscriber_count || 0), 0);
    const activeAccounts = accounts.filter(a => a.status === "active").length;
    const agencyCommission = totalMonthly * 0.3;
    const creatorPayouts = totalMonthly * 0.7;

    // ARPU
    const arpu = totalSubs > 0 ? totalMonthly / totalSubs : 0;

    // LTV (assuming 6 month avg retention)
    const avgRetentionMonths = 6;
    const ltv = arpu * avgRetentionMonths;

    // Churn rate estimate
    const churnRate = totalSubs > 0 ? Math.max(0, (1 / avgRetentionMonths) * 100) : 0;

    // Conversion rate estimate
    const conversionRate = activeAccounts > 0 ? (totalSubs / (activeAccounts * 100)) * 100 : 0;

    // Revenue per account
    const revenuePerAccount = activeAccounts > 0 ? totalMonthly / activeAccounts : 0;

    // Revenue by source from records
    const subRevenue = records.filter(r => r.record_type === "subscription").reduce((s, r) => s + Number(r.amount), 0);
    const ppvRevenue = records.filter(r => r.record_type === "ppv").reduce((s, r) => s + Number(r.amount), 0);
    const tipRevenue = records.filter(r => r.record_type === "tip").reduce((s, r) => s + Number(r.amount), 0);
    const otherRevenue = records.filter(r => !["subscription", "ppv", "tip", "payout", "commission"].includes(r.record_type)).reduce((s, r) => s + Number(r.amount), 0);

    const revenueBySource = [
      { name: "Subscriptions", value: subRevenue || totalMonthly * 0.5 },
      { name: "PPV", value: ppvRevenue || totalMonthly * 0.3 },
      { name: "Tips", value: tipRevenue || totalMonthly * 0.15 },
      { name: "Other", value: otherRevenue || totalMonthly * 0.05 },
    ].filter(d => d.value > 0);

    // Profitability by creator
    const profitByCreator = accounts.slice(0, 10).map(a => ({
      name: (a.display_name || a.username || "").substring(0, 12),
      revenue: a.monthly_revenue || 0,
      commission: (a.monthly_revenue || 0) * 0.3,
      payout: (a.monthly_revenue || 0) * 0.7,
      profit: (a.monthly_revenue || 0) * 0.3,
    }));

    // Monthly forecast (simple linear projection)
    const forecastData = Array.from({ length: 6 }, (_, i) => {
      const growthRate = 1 + (0.05 * (i + 1)); // 5% growth per month
      return {
        month: new Date(Date.now() + (i + 1) * 30 * 86400000).toLocaleDateString("en-US", { month: "short" }),
        projected: Math.round(totalMonthly * growthRate),
        conservative: Math.round(totalMonthly * (growthRate * 0.8)),
        optimistic: Math.round(totalMonthly * (growthRate * 1.2)),
      };
    });

    // Revenue trend (simulated from real data)
    const trendData = Array.from({ length: 6 }, (_, i) => ({
      month: new Date(Date.now() - (5 - i) * 30 * 86400000).toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.round(totalMonthly * (0.6 + i * 0.08)),
      commission: Math.round(totalMonthly * (0.6 + i * 0.08) * 0.3),
    }));

    // Tier profitability
    const tierProfit = ["premium", "standard", "basic"].map(tier => {
      const tierAccounts = accounts.filter(a => (a.tier || "standard") === tier);
      const tierRev = tierAccounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
      return {
        tier: tier.charAt(0).toUpperCase() + tier.slice(1),
        accounts: tierAccounts.length,
        revenue: tierRev,
        avgRevenue: tierAccounts.length > 0 ? tierRev / tierAccounts.length : 0,
        commission: tierRev * 0.3,
      };
    }).filter(t => t.accounts > 0);

    return {
      totalMonthly, totalLifetime, totalSubs, activeAccounts,
      agencyCommission, creatorPayouts, arpu, ltv, churnRate,
      conversionRate, revenuePerAccount, revenueBySource,
      profitByCreator, forecastData, trendData, tierProfit,
    };
  }, [accounts, records]);

  const exportCSV = () => {
    const headers = "Creator,Monthly Revenue,Commission,Payout,ARPU,Subscribers\n";
    const rows = accounts.map(a =>
      `"${a.display_name || a.username}",${a.monthly_revenue || 0},${(a.monthly_revenue || 0) * 0.3},${(a.monthly_revenue || 0) * 0.7},${a.subscriber_count ? (a.monthly_revenue || 0) / a.subscriber_count : 0},${a.subscriber_count || 0}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financials-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { title: "Monthly Revenue", value: `$${metrics.totalMonthly.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
          { title: "Lifetime Revenue", value: `$${metrics.totalLifetime.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
          { title: "Agency Commission", value: `$${metrics.agencyCommission.toLocaleString()}`, icon: Wallet, color: "text-purple-400" },
          { title: "Creator Payouts", value: `$${metrics.creatorPayouts.toLocaleString()}`, icon: CreditCard, color: "text-pink-400" },
          { title: "ARPU", value: `$${metrics.arpu.toFixed(2)}`, icon: Users, color: "text-cyan-400" },
          { title: "Est. LTV", value: `$${metrics.ltv.toFixed(0)}`, icon: Target, color: "text-amber-400" },
          { title: "Churn Rate", value: `${metrics.churnRate.toFixed(1)}%`, icon: TrendingDown, color: "text-red-400" },
          { title: "Rev/Account", value: `$${metrics.revenuePerAccount.toFixed(0)}`, icon: BarChart3, color: "text-indigo-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-3">
              <s.icon className={`h-3.5 w-3.5 ${s.color} mb-1.5`} />
              <p className="text-base font-bold text-white">{s.value}</p>
              <p className="text-[9px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trend + Forecast */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm">Revenue Trend</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-white/40 gap-1" onClick={exportCSV}>
              <Download className="h-3 w-3" /> Export
            </Button>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendData}>
                <defs>
                  <linearGradient id="revGradAdv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200,100%,50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(200,100%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(200,100%,50%)" strokeWidth={2} fill="url(#revGradAdv)" name="Revenue" />
                <Area type="monotone" dataKey="commission" stroke="hsl(260,100%,65%)" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Commission" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Revenue Forecast (6mo)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.forecastData}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160,70%,45%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(160,70%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                <Area type="monotone" dataKey="optimistic" stroke="rgba(34,197,94,0.4)" fill="none" strokeDasharray="4 2" name="Optimistic" />
                <Area type="monotone" dataKey="projected" stroke="hsl(160,70%,45%)" strokeWidth={2} fill="url(#forecastGrad)" name="Projected" />
                <Area type="monotone" dataKey="conservative" stroke="rgba(234,179,8,0.4)" fill="none" strokeDasharray="4 2" name="Conservative" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Source + Profitability */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {metrics.revenueBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.revenueBySource} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name}: $${value.toLocaleString()}`}>
                    {metrics.revenueBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-white/30 text-sm text-center py-20">No data</p>}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Profitability by Creator</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.profitByCreator} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                <Bar dataKey="revenue" fill="hsl(200,100%,50%)" radius={[0, 4, 4, 0]} name="Revenue" />
                <Bar dataKey="commission" fill="hsl(260,100%,65%)" radius={[0, 4, 4, 0]} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tier Profitability */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Tier Profitability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {metrics.tierProfit.map(t => (
              <div key={t.tier} className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/60">{t.tier}</Badge>
                  <span className="text-[10px] text-white/30">{t.accounts} accounts</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-white">${t.revenue.toLocaleString()}</p>
                    <p className="text-[9px] text-white/30">Revenue</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">${t.commission.toLocaleString()}</p>
                    <p className="text-[9px] text-white/30">Commission</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-400">${t.avgRevenue.toFixed(0)}</p>
                    <p className="text-[9px] text-white/30">Avg/Account</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedFinancials;

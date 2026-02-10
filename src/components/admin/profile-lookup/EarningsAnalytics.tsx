import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import type { ProfileData, EstimatedEarnings } from "./types";
import { generateMonthlyProjection, generateRevenueBreakdown } from "./analytics-engine";

const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

export default function EarningsAnalytics({ profile, earnings }: { profile: ProfileData; earnings: EstimatedEarnings }) {
  const projection = generateMonthlyProjection(earnings);
  const breakdown = generateRevenueBreakdown(profile, earnings);

  return (
    <div className="space-y-4">
      {/* Earnings summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { label: "Daily Est.", data: earnings.daily, color: "from-emerald-500/20 to-emerald-500/5" },
          { label: "Monthly Est.", data: earnings.monthly, color: "from-blue-500/20 to-blue-500/5" },
          { label: "Yearly Est.", data: earnings.yearly, color: "from-violet-500/20 to-violet-500/5" },
        ] as const).map(({ label, data, color }) => (
          <Card key={label} className={`bg-gradient-to-br ${color} border-white/[0.08]`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
                <DollarSign className="h-4 w-4 text-white/30" />
              </div>
              <p className="text-2xl font-bold text-white">{fmt(data.mid)}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                  <TrendingDown className="h-3 w-3" /> Low: {fmt(data.low)}
                </span>
                <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> High: {fmt(data.high)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 12-month projection */}
        <Card className="bg-white/[0.04] border-white/[0.08]">
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">12-Month Revenue Projection</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220,60%,12%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                />
                <Area type="monotone" dataKey="high" stroke="#34d399" fill="url(#gradHigh)" strokeWidth={1} name="High" />
                <Area type="monotone" dataKey="mid" stroke="#60a5fa" fill="url(#gradMid)" strokeWidth={2} name="Estimate" />
                <Area type="monotone" dataKey="low" stroke="#f472b6" fill="none" strokeWidth={1} strokeDasharray="4 4" name="Low" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue breakdown */}
        <Card className="bg-white/[0.04] border-white/[0.08]">
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Revenue Source Breakdown</h3>
            {breakdown.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} strokeWidth={0}>
                      {breakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(220,60%,12%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {breakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-white/50">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-white">${item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-8">Insufficient data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

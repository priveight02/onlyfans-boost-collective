import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ProfileData, EngagementMetrics } from "./types";
import { generateContentBreakdown } from "./analytics-engine";

export default function ContentAnalytics({ profile, metrics }: { profile: ProfileData; metrics: EngagementMetrics }) {
  const contentBreakdown = generateContentBreakdown(profile);

  // Simulated content cadence (based on averages)
  const cadenceData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
    day,
    posts: Math.round(metrics.avgPostsPerMonth / 4 * (0.6 + Math.sin(i * 0.9) * 0.4)),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Content type breakdown */}
      <Card className="bg-white/[0.04] border-white/[0.08]">
        <CardContent className="p-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Content Mix</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={contentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                  {contentBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(220,60%,12%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {contentBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-white/50">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.value / Math.max(...contentBreakdown.map(c => c.value))) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posting pattern */}
      <Card className="bg-white/[0.04] border-white/[0.08]">
        <CardContent className="p-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Est. Weekly Posting Pattern</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cadenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "hsl(220,60%,12%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="posts" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Posts" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

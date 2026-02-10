import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Users, BarChart3 } from "lucide-react";

const revenueData = [
  { month: 'Jan', revenue: 12400, subscribers: 340 },
  { month: 'Feb', revenue: 15600, subscribers: 420 },
  { month: 'Mar', revenue: 18200, subscribers: 510 },
  { month: 'Apr', revenue: 24800, subscribers: 630 },
  { month: 'May', revenue: 31200, subscribers: 780 },
  { month: 'Jun', revenue: 38500, subscribers: 920 },
];

const AdminDashboard = () => {
  const stats = [
    {
      title: "Total Revenue",
      value: "$89,432",
      change: "+18.2%",
      icon: DollarSign,
      positive: true,
    },
    {
      title: "Active Accounts",
      value: "856",
      change: "+5.4%",
      icon: Users,
      positive: true,
    },
    {
      title: "Avg. Earnings",
      value: "$2,340",
      change: "+12.1%",
      icon: TrendingUp,
      positive: true,
    },
    {
      title: "Conversion Rate",
      value: "24.8%",
      change: "+3.2%",
      icon: BarChart3,
      positive: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/[0.08] transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <stat.icon className="h-4 w-4 text-accent" />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  stat.positive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-heading">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200 100% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(200 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(200 100% 50%)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-heading">Subscriber Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210 100% 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(210 100% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="subscribers"
                  stroke="hsl(210 100% 45%)"
                  strokeWidth={2}
                  fill="url(#subGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base font-heading">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { text: "New account created", time: "2 min ago", type: "success" },
              { text: "Revenue milestone reached", time: "1 hour ago", type: "info" },
              { text: "New subscriber onboarded", time: "3 hours ago", type: "success" },
              { text: "Weekly report generated", time: "5 hours ago", type: "info" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === "success" ? "bg-emerald-400" : "bg-accent"
                  }`} />
                  <span className="text-sm text-white/70">{activity.text}</span>
                </div>
                <span className="text-xs text-white/30">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;

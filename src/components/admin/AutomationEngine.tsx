import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap, AlertTriangle, TrendingUp, TrendingDown, Activity, Bell, CheckCircle,
  ArrowUpRight, Clock, Target, Lightbulb, Shield, Brain, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Alert {
  type: "warning" | "opportunity" | "success" | "critical";
  title: string;
  description: string;
  metric?: string;
  action?: string;
  icon: React.ElementType;
}

const AutomationEngine = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [a, t, th, m] = await Promise.all([
        supabase.from("managed_accounts").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("message_threads").select("*"),
        supabase.from("team_members").select("*"),
      ]);
      setAccounts(a.data || []);
      setTasks(t.data || []);
      setThreads(th.data || []);
      setMembers(m.data || []);
    };
    load();
  }, []);

  const alerts = useMemo((): Alert[] => {
    const result: Alert[] = [];

    // Anomaly detection
    const avgRevenue = accounts.length > 0 ? accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0) / accounts.length : 0;

    accounts.forEach(a => {
      const rev = a.monthly_revenue || 0;
      if (rev > avgRevenue * 2) {
        result.push({
          type: "success",
          title: `${a.display_name || a.username} exceeding expectations`,
          description: `Revenue $${rev.toLocaleString()}/mo is ${(rev / avgRevenue).toFixed(1)}x the average`,
          metric: `$${rev.toLocaleString()}`,
          icon: TrendingUp,
        });
      }
      if (rev < avgRevenue * 0.3 && rev > 0) {
        result.push({
          type: "warning",
          title: `${a.display_name || a.username} underperforming`,
          description: `Revenue is ${((rev / avgRevenue) * 100).toFixed(0)}% of average. Review strategy.`,
          action: "Review account strategy",
          icon: TrendingDown,
        });
      }

      // Inactive creators
      if (a.last_activity_at) {
        const daysSince = (Date.now() - new Date(a.last_activity_at).getTime()) / 86400000;
        if (daysSince > 14 && a.status === "active") {
          result.push({
            type: "critical",
            title: `${a.display_name || a.username} inactive ${Math.floor(daysSince)}d`,
            description: "No activity detected. Risk of subscriber churn.",
            action: "Re-engage creator",
            icon: AlertTriangle,
          });
        }
      }

      // Low engagement opportunity
      if ((a.engagement_rate || 0) > 5 && (a.monthly_revenue || 0) < 200) {
        result.push({
          type: "opportunity",
          title: `Monetization opportunity: ${a.display_name || a.username}`,
          description: `${a.engagement_rate}% engagement but only $${a.monthly_revenue}/mo. Increase PPV or pricing.`,
          action: "Optimize pricing",
          icon: Lightbulb,
        });
      }
    });

    // Task alerts
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done");
    if (overdueTasks.length > 0) {
      result.push({
        type: "warning",
        title: `${overdueTasks.length} overdue tasks`,
        description: "Tasks past their due date need attention.",
        action: "Review tasks",
        icon: Clock,
      });
    }

    const urgentTasks = tasks.filter(t => t.priority === "urgent" && t.status !== "done");
    if (urgentTasks.length > 0) {
      result.push({
        type: "critical",
        title: `${urgentTasks.length} urgent tasks pending`,
        description: "High-priority tasks require immediate action.",
        icon: AlertTriangle,
      });
    }

    // Thread alerts
    const openThreads = threads.filter(t => t.status === "open");
    if (openThreads.length > 5) {
      result.push({
        type: "warning",
        title: `${openThreads.length} unassigned threads`,
        description: "Subscriber messages awaiting chatter assignment.",
        action: "Assign chatters",
        icon: Bell,
      });
    }

    // Team alerts
    const inactiveMembers = members.filter(m => m.status === "inactive");
    if (inactiveMembers.length > 0) {
      result.push({
        type: "warning",
        title: `${inactiveMembers.length} inactive team members`,
        description: "Consider reactivating or removing inactive staff.",
        icon: Shield,
      });
    }

    // Milestones
    const totalRevenue = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
    if (totalRevenue > 10000) {
      result.push({
        type: "success",
        title: "Revenue milestone: $10K+/mo",
        description: `Current monthly revenue: $${totalRevenue.toLocaleString()}`,
        icon: Target,
      });
    }

    return result.sort((a, b) => {
      const order = { critical: 0, warning: 1, opportunity: 2, success: 3 };
      return order[a.type] - order[b.type];
    });
  }, [accounts, tasks, threads, members]);

  const recommendations = useMemo(() => {
    const recs: { title: string; description: string; priority: "high" | "medium" | "low"; category: string }[] = [];

    const avgEng = accounts.length > 0 ? accounts.reduce((s, a) => s + (a.engagement_rate || 0), 0) / accounts.length : 0;
    const totalSubs = accounts.reduce((s, a) => s + (a.subscriber_count || 0), 0);
    const totalRev = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);

    if (avgEng < 3) {
      recs.push({ title: "Boost engagement rates", description: "Average engagement is below 3%. Increase interactive content (polls, Q&A, personalized messages).", priority: "high", category: "Content" });
    }

    if (totalSubs > 0 && totalRev / totalSubs < 5) {
      recs.push({ title: "Increase ARPU", description: `Current ARPU is $${(totalRev / totalSubs).toFixed(2)}. Consider premium content tiers, PPV bundles, or tip menus.`, priority: "high", category: "Revenue" });
    }

    const unconnected = accounts.filter(a => !a.of_connected);
    if (unconnected.length > 0) {
      recs.push({ title: `Connect ${unconnected.length} account(s) to API`, description: "Unconnected accounts miss out on automated analytics and insights.", priority: "medium", category: "Setup" });
    }

    const noTier = accounts.filter(a => !a.tier || a.tier === "standard");
    if (noTier.length > accounts.length * 0.5) {
      recs.push({ title: "Segment creators into tiers", description: "Most accounts lack tier classification. Tier-based pricing improves profitability.", priority: "medium", category: "Strategy" });
    }

    if (members.length < 2) {
      recs.push({ title: "Expand your team", description: "A larger team enables better coverage of messaging and content management.", priority: "low", category: "Team" });
    }

    return recs;
  }, [accounts, members]);

  const getAlertBg = (type: string) => {
    switch (type) {
      case "critical": return "border-red-500/30 bg-red-500/5";
      case "warning": return "border-amber-500/30 bg-amber-500/5";
      case "opportunity": return "border-emerald-500/30 bg-emerald-500/5";
      case "success": return "border-blue-500/30 bg-blue-500/5";
      default: return "border-white/10 bg-white/5";
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical": return "text-red-400";
      case "warning": return "text-amber-400";
      case "opportunity": return "text-emerald-400";
      case "success": return "text-blue-400";
      default: return "text-white/60";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Critical Alerts", value: alerts.filter(a => a.type === "critical").length, icon: AlertTriangle, color: "text-red-400" },
          { title: "Warnings", value: alerts.filter(a => a.type === "warning").length, icon: Bell, color: "text-amber-400" },
          { title: "Opportunities", value: alerts.filter(a => a.type === "opportunity").length, icon: Zap, color: "text-emerald-400" },
          { title: "Recommendations", value: recommendations.length, icon: Brain, color: "text-purple-400" },
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

      {/* Alerts */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" /> Smart Alerts & Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-white/40 text-sm">All systems normal. No alerts.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {alerts.map((alert, i) => (
                <div key={i} className={`p-3 rounded-lg border ${getAlertBg(alert.type)} flex items-start gap-3`}>
                  <alert.icon className={`h-4 w-4 ${getAlertColor(alert.type)} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-white/50 mt-0.5">{alert.description}</p>
                  </div>
                  {alert.metric && (
                    <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 shrink-0">{alert.metric}</Badge>
                  )}
                  {alert.action && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-accent shrink-0">{alert.action}</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" /> Strategy Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-6">No recommendations at this time.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`text-[9px] ${
                      rec.priority === "high" ? "border-red-500/20 text-red-400" :
                      rec.priority === "medium" ? "border-amber-500/20 text-amber-400" :
                      "border-white/10 text-white/40"
                    }`}>{rec.priority}</Badge>
                    <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{rec.category}</Badge>
                  </div>
                  <p className="text-sm font-medium text-white">{rec.title}</p>
                  <p className="text-xs text-white/40 mt-1">{rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationEngine;

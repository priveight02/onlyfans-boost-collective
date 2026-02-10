import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Crown, TrendingUp, AlertTriangle, Shield, Zap, ArrowUpRight, ArrowDownRight,
  Star, Target, BarChart3, Users, DollarSign, Activity, Award,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

interface Account {
  id: string;
  username: string;
  display_name: string | null;
  status: string;
  tier: string | null;
  monthly_revenue: number | null;
  total_revenue: number | null;
  subscriber_count: number | null;
  engagement_rate: number | null;
  content_count: number | null;
  last_activity_at: string | null;
  created_at: string;
}

interface CreatorRankingEngineProps {
  accounts: Account[];
}

const TOOLTIP_STYLE = {
  background: "hsl(220,60%,10%)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

const CreatorRankingEngine = ({ accounts }: CreatorRankingEngineProps) => {
  const [sortBy, setSortBy] = useState<string>("composite");
  const [viewMode, setViewMode] = useState<"ranking" | "risk">("ranking");

  const scored = useMemo(() => {
    if (!accounts.length) return [];
    const maxRev = Math.max(...accounts.map(a => a.monthly_revenue || 0), 1);
    const maxSubs = Math.max(...accounts.map(a => a.subscriber_count || 0), 1);
    const maxEng = Math.max(...accounts.map(a => a.engagement_rate || 0), 1);
    const maxContent = Math.max(...accounts.map(a => a.content_count || 0), 1);

    return accounts.map(a => {
      const rev = (a.monthly_revenue || 0);
      const subs = (a.subscriber_count || 0);
      const eng = (a.engagement_rate || 0);
      const content = (a.content_count || 0);

      const revenueScore = (rev / maxRev) * 100;
      const subscriberScore = (subs / maxSubs) * 100;
      const engagementScore = (eng / maxEng) * 100;
      const contentScore = (content / maxContent) * 100;

      // Activity score
      const daysSinceActivity = a.last_activity_at
        ? (Date.now() - new Date(a.last_activity_at).getTime()) / 86400000
        : 999;
      const activityScore = Math.max(0, 100 - daysSinceActivity * 3);

      // ARPU
      const arpu = subs > 0 ? rev / subs : 0;

      // LTV estimate (12 month projection)
      const ltv = rev * 12;

      // Composite score
      const compositeScore = (revenueScore * 0.35) + (subscriberScore * 0.2) + (engagementScore * 0.2) + (contentScore * 0.1) + (activityScore * 0.15);

      // Risk score (higher = more risk)
      const riskFactors: string[] = [];
      if (daysSinceActivity > 14) riskFactors.push("Inactive 14d+");
      if (eng < 2) riskFactors.push("Low engagement");
      if (rev < 100) riskFactors.push("Low revenue");
      if (content < 10) riskFactors.push("Low content");
      const riskScore = Math.min(100, riskFactors.length * 25);

      // Opportunity score
      const opportunityFactors: string[] = [];
      if (eng > 5 && rev < 500) opportunityFactors.push("High engagement, low monetization");
      if (subs > 100 && rev < subs * 5) opportunityFactors.push("Subscriber monetization gap");
      if (daysSinceActivity < 3 && content > 50) opportunityFactors.push("Active & consistent");
      const opportunityScore = Math.min(100, opportunityFactors.length * 33);

      return {
        ...a,
        revenueScore, subscriberScore, engagementScore, contentScore, activityScore,
        compositeScore, riskScore, opportunityScore, arpu, ltv,
        riskFactors, opportunityFactors,
        radarData: [
          { metric: "Revenue", value: revenueScore },
          { metric: "Subs", value: subscriberScore },
          { metric: "Engage", value: engagementScore },
          { metric: "Content", value: contentScore },
          { metric: "Activity", value: activityScore },
        ],
      };
    }).sort((a, b) => {
      if (sortBy === "composite") return b.compositeScore - a.compositeScore;
      if (sortBy === "revenue") return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
      if (sortBy === "engagement") return (b.engagement_rate || 0) - (a.engagement_rate || 0);
      if (sortBy === "risk") return b.riskScore - a.riskScore;
      if (sortBy === "opportunity") return b.opportunityScore - a.opportunityScore;
      if (sortBy === "ltv") return b.ltv - a.ltv;
      return b.compositeScore - a.compositeScore;
    });
  }, [accounts, sortBy]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-400" />;
    if (rank === 2) return <Crown className="h-4 w-4 text-gray-300" />;
    if (rank === 3) return <Crown className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-white/40 w-4 text-center">#{rank}</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-400";
    if (score >= 50) return "text-blue-400";
    if (score >= 25) return "text-amber-400";
    return "text-red-400";
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return "bg-red-500";
    if (score >= 50) return "bg-orange-500";
    if (score >= 25) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const topRanked = scored.slice(0, 3);
  const avgComposite = scored.length > 0 ? scored.reduce((s, a) => s + a.compositeScore, 0) / scored.length : 0;
  const highRiskCount = scored.filter(a => a.riskScore >= 50).length;
  const highOppCount = scored.filter(a => a.opportunityScore >= 50).length;

  if (!accounts.length) {
    return (
      <div className="text-center py-16 text-white/20">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Add accounts to see performance rankings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Avg Score", value: avgComposite.toFixed(0), icon: Star, color: "text-yellow-400", sub: "Composite ranking" },
          { title: "Top Performer", value: topRanked[0]?.display_name || topRanked[0]?.username || "—", icon: Crown, color: "text-yellow-400", sub: `Score: ${topRanked[0]?.compositeScore.toFixed(0) || 0}` },
          { title: "High Risk", value: highRiskCount.toString(), icon: AlertTriangle, color: "text-red-400", sub: "Need attention" },
          { title: "Opportunities", value: highOppCount.toString(), icon: Zap, color: "text-emerald-400", sub: "Growth potential" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-[10px] text-white/40">{s.title}</span>
              </div>
              <p className="text-lg font-bold text-white truncate">{s.value}</p>
              <p className="text-[10px] text-white/30">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
            <SelectItem value="composite" className="text-white">Composite Score</SelectItem>
            <SelectItem value="revenue" className="text-white">Revenue</SelectItem>
            <SelectItem value="engagement" className="text-white">Engagement</SelectItem>
            <SelectItem value="risk" className="text-white">Risk Score</SelectItem>
            <SelectItem value="opportunity" className="text-white">Opportunity</SelectItem>
            <SelectItem value="ltv" className="text-white">Lifetime Value</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={viewMode === "ranking" ? "default" : "ghost"} onClick={() => setViewMode("ranking")} className="h-8 text-xs">
            <Award className="h-3 w-3 mr-1" /> Rankings
          </Button>
          <Button size="sm" variant={viewMode === "risk" ? "default" : "ghost"} onClick={() => setViewMode("risk")} className="h-8 text-xs">
            <Shield className="h-3 w-3 mr-1" /> Risk Matrix
          </Button>
        </div>
      </div>

      {/* Top 3 Cards */}
      {viewMode === "ranking" && topRanked.length >= 1 && (
        <div className="grid gap-4 md:grid-cols-3">
          {topRanked.map((creator, i) => (
            <Card key={creator.id} className={`bg-white/5 backdrop-blur-sm border-white/10 ${i === 0 ? "ring-1 ring-yellow-400/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {getRankBadge(i + 1)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{creator.display_name || creator.username}</p>
                    <p className="text-[10px] text-white/40">@{creator.username}</p>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(creator.compositeScore)}`}>
                    {creator.compositeScore.toFixed(0)}
                  </span>
                </div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={creator.radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                      <Radar dataKey="value" stroke="hsl(200,100%,50%)" fill="hsl(200,100%,50%)" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <div>
                    <p className="text-xs font-bold text-white">${(creator.monthly_revenue || 0).toLocaleString()}</p>
                    <p className="text-[9px] text-white/30">Revenue</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">${creator.arpu.toFixed(2)}</p>
                    <p className="text-[9px] text-white/30">ARPU</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">${creator.ltv.toLocaleString()}</p>
                    <p className="text-[9px] text-white/30">Est. LTV</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Ranking Table */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">
            {viewMode === "ranking" ? "Performance Rankings" : "Risk & Opportunity Matrix"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {scored.map((creator, i) => (
              <div key={creator.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <div className="w-6 text-center shrink-0">{getRankBadge(i + 1)}</div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-violet-500/20 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(creator.display_name || creator.username || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{creator.display_name || creator.username}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{creator.tier || "standard"}</Badge>
                    <span className="text-[10px] text-white/30">${(creator.monthly_revenue || 0).toLocaleString()}/mo</span>
                  </div>
                </div>

                {viewMode === "ranking" ? (
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>Score</span>
                        <span className={getScoreColor(creator.compositeScore)}>{creator.compositeScore.toFixed(0)}</span>
                      </div>
                      <Progress value={creator.compositeScore} className="h-1.5 bg-white/5" />
                    </div>
                    <div className="text-right w-20">
                      <p className="text-xs text-white/60">${creator.arpu.toFixed(2)}</p>
                      <p className="text-[9px] text-white/30">ARPU</p>
                    </div>
                    <div className="text-right w-20">
                      <p className="text-xs text-white/60">${creator.ltv.toLocaleString()}</p>
                      <p className="text-[9px] text-white/30">LTV</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>Risk</span>
                        <span>{creator.riskScore}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getRiskColor(creator.riskScore)}`} style={{ width: `${creator.riskScore}%` }} />
                      </div>
                    </div>
                    <div className="w-20">
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>Opp</span>
                        <span>{creator.opportunityScore}</span>
                      </div>
                      <Progress value={creator.opportunityScore} className="h-1.5 bg-white/5" />
                    </div>
                    <div className="max-w-[180px]">
                      {creator.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {creator.riskFactors.slice(0, 2).map(f => (
                            <Badge key={f} variant="outline" className="text-[8px] border-red-500/20 text-red-400">{f}</Badge>
                          ))}
                        </div>
                      )}
                      {creator.opportunityFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {creator.opportunityFactors.slice(0, 2).map(f => (
                            <Badge key={f} variant="outline" className="text-[8px] border-emerald-500/20 text-emerald-400">{f}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution Chart */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scored.slice(0, 15).map(a => ({
              name: (a.display_name || a.username || "").substring(0, 12),
              score: Math.round(a.compositeScore),
              risk: a.riskScore,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="score" fill="hsl(200,100%,50%)" radius={[4, 4, 0, 0]} name="Score" />
              <Bar dataKey="risk" fill="hsl(0,70%,55%)" radius={[4, 4, 0, 0]} name="Risk" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorRankingEngine;

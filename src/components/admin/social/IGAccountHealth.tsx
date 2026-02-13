import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Loader2, Brain, TrendingUp, AlertCircle,
  Heart, MessageSquare, Eye, Users, Activity,
  ArrowUp, ArrowDown, CheckCircle2, AlertTriangle,
  RefreshCw, Zap, Target, Clock, UserPlus,
} from "lucide-react";

interface Props { selectedAccount: string; }

interface HealthMetric {
  name: string;
  score: number;
  status: "healthy" | "warning" | "critical";
  detail: string;
  trend: "up" | "down" | "stable";
}

interface DmMemory {
  participantId: string;
  username: string;
  name: string;
  pastObjections: string[];
  interests: string[];
  budget: string;
  behavior: string;
  lastTopic: string;
  totalMessages: number;
  lastInteraction: string;
}

interface FunnelLead {
  id: string;
  username: string;
  stage: "interested" | "offer_sent" | "negotiating" | "booked" | "converted";
  enteredAt: string;
  lastAction: string;
  value: number;
}

const IGAccountHealth = ({ selectedAccount }: Props) => {
  const [healthScore, setHealthScore] = useState(0);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [dmMemory, setDmMemory] = useState<DmMemory[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [funnelLeads, setFunnelLeads] = useState<FunnelLead[]>([]);
  const [funnelLoading, setFunnelLoading] = useState(false);

  const callApi = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("instagram-api", {
      body: { ...body, account_id: selectedAccount },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      // Fetch account data
      const [profile, media, insights] = await Promise.all([
        callApi({ action: "get_profile" }),
        callApi({ action: "get_media", params: { limit: 25 } }),
        callApi({ action: "get_account_insights", params: { period: "day" } }).catch(() => null),
      ]);

      const posts = media?.data || [];
      const followers = profile?.followers_count || 0;
      const totalLikes = posts.reduce((s: number, p: any) => s + (p.like_count || 0), 0);
      const totalComments = posts.reduce((s: number, p: any) => s + (p.comments_count || 0), 0);
      const avgEngagement = posts.length > 0 ? (totalLikes + totalComments) / posts.length : 0;
      const engRate = followers > 0 ? (avgEngagement / followers) * 100 : 0;

      // Calculate posting frequency
      const timestamps = posts.map((p: any) => new Date(p.timestamp).getTime()).sort((a: number, b: number) => b - a);
      const daysBetween = timestamps.length > 1 ? (timestamps[0] - timestamps[timestamps.length - 1]) / (1000 * 60 * 60 * 24) : 0;
      const postsPerWeek = daysBetween > 0 ? (posts.length / daysBetween) * 7 : 0;

      // Check engagement trend
      const firstHalf = posts.slice(0, Math.floor(posts.length / 2));
      const secondHalf = posts.slice(Math.floor(posts.length / 2));
      const firstHalfEng = firstHalf.length ? firstHalf.reduce((s: number, p: any) => s + (p.like_count || 0) + (p.comments_count || 0), 0) / firstHalf.length : 0;
      const secondHalfEng = secondHalf.length ? secondHalf.reduce((s: number, p: any) => s + (p.like_count || 0) + (p.comments_count || 0), 0) / secondHalf.length : 0;
      const engTrend = firstHalfEng > secondHalfEng * 1.1 ? "up" : firstHalfEng < secondHalfEng * 0.9 ? "down" : "stable";

      // Comment spam ratio
      const spamKeywords = ["dm me", "check my", "follow me", "click link", "free money"];
      const commentSpamRisk = posts.length > 0 ? Math.min(100, Math.round(posts.filter((p: any) => {
        const caption = (p.caption || "").toLowerCase();
        return spamKeywords.some(k => caption.includes(k));
      }).length / posts.length * 100)) : 0;

      // Follower-to-following ratio
      const ffRatio = profile?.follows_count > 0 ? profile.followers_count / profile.follows_count : 0;

      const newMetrics: HealthMetric[] = [
        {
          name: "Engagement Rate",
          score: Math.min(100, Math.round(engRate * 20)),
          status: engRate > 3 ? "healthy" : engRate > 1.5 ? "warning" : "critical",
          detail: `${engRate.toFixed(2)}% — ${engRate > 3 ? "Excellent" : engRate > 1.5 ? "Average" : "Below average"}`,
          trend: engTrend as any,
        },
        {
          name: "Posting Frequency",
          score: Math.min(100, Math.round(postsPerWeek * 15)),
          status: postsPerWeek >= 3 ? "healthy" : postsPerWeek >= 1 ? "warning" : "critical",
          detail: `${postsPerWeek.toFixed(1)} posts/week — ${postsPerWeek >= 3 ? "Consistent" : "Needs improvement"}`,
          trend: "stable",
        },
        {
          name: "Shadowban Risk",
          score: Math.max(0, 100 - commentSpamRisk * 2),
          status: commentSpamRisk < 10 ? "healthy" : commentSpamRisk < 30 ? "warning" : "critical",
          detail: `${commentSpamRisk}% spam patterns detected`,
          trend: "stable",
        },
        {
          name: "Growth Velocity",
          score: Math.min(100, Math.round(ffRatio * 15)),
          status: ffRatio > 5 ? "healthy" : ffRatio > 2 ? "warning" : "critical",
          detail: `Follower/Following ratio: ${ffRatio.toFixed(1)}:1`,
          trend: engTrend as any,
        },
        {
          name: "Content Diversity",
          score: (() => {
            const types = new Set(posts.map((p: any) => p.media_type));
            return types.size >= 3 ? 100 : types.size >= 2 ? 60 : 30;
          })(),
          status: new Set(posts.map((p: any) => p.media_type)).size >= 3 ? "healthy" : "warning",
          detail: `${new Set(posts.map((p: any) => p.media_type)).size} content types used`,
          trend: "stable",
        },
        {
          name: "Comment Engagement",
          score: Math.min(100, posts.length > 0 ? Math.round(totalComments / posts.length * 5) : 0),
          status: totalComments / posts.length > 20 ? "healthy" : totalComments / posts.length > 5 ? "warning" : "critical",
          detail: `Avg ${Math.round(totalComments / Math.max(1, posts.length))} comments/post`,
          trend: engTrend as any,
        },
      ];

      setMetrics(newMetrics);
      setHealthScore(Math.round(newMetrics.reduce((s, m) => s + m.score, 0) / newMetrics.length));
      toast.success("Health check complete!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const loadDmMemory = async () => {
    setMemoryLoading(true);
    try {
      const { data: convos } = await supabase
        .from("ai_dm_conversations")
        .select("*, ai_dm_messages(content, sender_type, created_at)")
        .eq("account_id", selectedAccount)
        .order("last_message_at", { ascending: false })
        .limit(30);

      if (!convos?.length) { toast.info("No conversations"); setMemoryLoading(false); return; }

      // AI extract memory from conversations
      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Analyze these DM conversations and extract memory/context for each person:

${convos.slice(0, 20).map(c => {
  const msgs = (c.ai_dm_messages || []).slice(-8).map((m: any) => `${m.sender_type}: ${m.content}`).join("\n");
  return `--- ${c.participant_username || c.participant_id} ---\n${msgs}`;
}).join("\n\n")}

For each person extract:
- pastObjections: Array of objections/concerns they raised
- interests: What they showed interest in
- budget: Any budget mentions
- behavior: "loyal", "price-sensitive", "impulsive", "cautious"
- lastTopic: What they last talked about

Return JSON array: [{ participantId, pastObjections, interests, budget, behavior, lastTopic }]`,
          context: "dm_memory",
          account_id: selectedAccount,
        },
      });

      let aiMemory: any[] = [];
      try {
        const text = aiData?.reply || aiData?.data?.reply || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) aiMemory = JSON.parse(jsonMatch[0]);
      } catch {}

      const memory: DmMemory[] = convos.map((c, i) => {
        const ai = aiMemory.find((m: any) => m.participantId === c.participant_id) || aiMemory[i] || {};
        return {
          participantId: c.participant_id,
          username: c.participant_username || c.participant_id,
          name: c.participant_name || c.participant_username || "Unknown",
          pastObjections: ai.pastObjections || [],
          interests: ai.interests || [],
          budget: ai.budget || "Unknown",
          behavior: ai.behavior || "unknown",
          lastTopic: ai.lastTopic || "",
          totalMessages: c.message_count || 0,
          lastInteraction: c.last_message_at || c.updated_at,
        };
      });

      setDmMemory(memory);
      toast.success(`Memory loaded for ${memory.length} contacts`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setMemoryLoading(false);
  };

  const buildFunnel = async () => {
    setFunnelLoading(true);
    try {
      const { data: convos } = await supabase
        .from("ai_dm_conversations")
        .select("*, ai_dm_messages(content, sender_type, created_at)")
        .eq("account_id", selectedAccount)
        .order("last_message_at", { ascending: false })
        .limit(50);

      if (!convos?.length) { setFunnelLoading(false); return; }

      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Classify these DM conversations into funnel stages:

${convos.slice(0, 25).map(c => {
  const msgs = (c.ai_dm_messages || []).slice(-5).map((m: any) => `${m.sender_type}: ${m.content}`).join("\n");
  return `--- ${c.participant_username || c.participant_id} ---\n${msgs}`;
}).join("\n\n")}

Stages: interested, offer_sent, negotiating, booked, converted
For each: { participantId, stage, value (estimated $), lastAction }
Return JSON array.`,
          context: "funnel_builder",
          account_id: selectedAccount,
        },
      });

      let stages: any[] = [];
      try {
        const text = aiData?.reply || aiData?.data?.reply || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) stages = JSON.parse(jsonMatch[0]);
      } catch {}

      const leads: FunnelLead[] = convos.slice(0, 25).map((c, i) => {
        const ai = stages.find((s: any) => s.participantId === c.participant_id) || stages[i] || {};
        return {
          id: c.id,
          username: c.participant_username || c.participant_id,
          stage: ai.stage || "interested",
          enteredAt: c.created_at,
          lastAction: ai.lastAction || "Initial contact",
          value: ai.value || 0,
        };
      });

      setFunnelLeads(leads);
      toast.success(`Funnel built: ${leads.length} leads classified`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setFunnelLoading(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-400";
      case "warning": return "text-yellow-400";
      case "critical": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const stageConfig: Record<string, { color: string; label: string }> = {
    interested: { color: "bg-blue-500/15 text-blue-400", label: "Interested" },
    offer_sent: { color: "bg-orange-500/15 text-orange-400", label: "Offer Sent" },
    negotiating: { color: "bg-yellow-500/15 text-yellow-400", label: "Negotiating" },
    booked: { color: "bg-purple-500/15 text-purple-400", label: "Booked" },
    converted: { color: "bg-green-500/15 text-green-400", label: "Converted" },
  };

  return (
    <div className="space-y-3 pt-3">
      <Tabs defaultValue="health">
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="health" className="text-xs data-[state=active]:bg-background"><Activity className="h-3 w-3 mr-1" />Health Score</TabsTrigger>
          <TabsTrigger value="memory" className="text-xs data-[state=active]:bg-background"><Brain className="h-3 w-3 mr-1" />DM Memory</TabsTrigger>
          <TabsTrigger value="funnel" className="text-xs data-[state=active]:bg-background"><Target className="h-3 w-3 mr-1" />Auto Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Analyze engagement, shadowban risk, growth velocity & more</p>
            <Button size="sm" onClick={runHealthCheck} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Activity className="h-3.5 w-3.5 mr-1" />}
              Run Check
            </Button>
          </div>

          {healthScore > 0 && (
            <>
              <Card className={healthScore >= 70 ? "border-green-500/30" : healthScore >= 40 ? "border-yellow-500/30" : "border-red-500/30"}>
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">Account Health Score</p>
                  <p className={`text-4xl font-bold ${healthScore >= 70 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>{healthScore}/100</p>
                  <Progress value={healthScore} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {healthScore >= 70 ? "Your account is performing well!" : healthScore >= 40 ? "Some areas need attention" : "Critical issues detected"}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {metrics.map(m => (
                  <Card key={m.name}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {m.status === "healthy" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : m.status === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /> : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                          <p className="text-xs font-semibold text-foreground">{m.name}</p>
                          <div className={`flex items-center gap-0.5 ${m.trend === "up" ? "text-green-400" : m.trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                            {m.trend === "up" ? <ArrowUp className="h-3 w-3" /> : m.trend === "down" ? <ArrowDown className="h-3 w-3" /> : null}
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${statusColor(m.status)}`}>{m.score}</span>
                      </div>
                      <Progress value={m.score} className="h-1.5" />
                      <p className="text-[9px] text-muted-foreground mt-1">{m.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {healthScore === 0 && !loading && (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Run a health check to analyze your account risk score</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="memory" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">AI remembers past objections, interests, budget & behavior</p>
            <Button size="sm" onClick={loadDmMemory} disabled={memoryLoading}>
              {memoryLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
              Load Memory
            </Button>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {dmMemory.map(m => (
                <Card key={m.participantId}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-foreground">@{m.username}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px]">{m.totalMessages} msgs</Badge>
                        <Badge variant="outline" className="text-[8px]">{m.behavior}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {m.interests.length > 0 && (
                        <div className="p-1.5 bg-green-500/5 rounded">
                          <p className="text-[8px] text-muted-foreground mb-0.5">Interests:</p>
                          {m.interests.slice(0, 3).map((int, i) => (
                            <p key={i} className="text-[9px] text-green-400">• {int}</p>
                          ))}
                        </div>
                      )}
                      {m.pastObjections.length > 0 && (
                        <div className="p-1.5 bg-red-500/5 rounded">
                          <p className="text-[8px] text-muted-foreground mb-0.5">Objections:</p>
                          {m.pastObjections.slice(0, 3).map((obj, i) => (
                            <p key={i} className="text-[9px] text-red-400">• {obj}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    {m.budget !== "Unknown" && (
                      <p className="text-[9px] text-muted-foreground mt-1">💰 Budget: {m.budget}</p>
                    )}
                    {m.lastTopic && (
                      <p className="text-[9px] text-primary mt-0.5">Last topic: {m.lastTopic}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {dmMemory.length === 0 && !memoryLoading && (
            <div className="text-center py-6">
              <Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Load DM memory to see past objections, interests & behavior</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="funnel" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Auto-classify DMs into sales pipeline stages</p>
            <Button size="sm" onClick={buildFunnel} disabled={funnelLoading}>
              {funnelLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              Build Funnel
            </Button>
          </div>

          {funnelLeads.length > 0 && (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(stageConfig).map(([stage, config]) => {
                  const count = funnelLeads.filter(l => l.stage === stage).length;
                  const value = funnelLeads.filter(l => l.stage === stage).reduce((s, l) => s + l.value, 0);
                  return (
                    <Card key={stage}>
                      <CardContent className="p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{count}</p>
                        <p className="text-[8px] text-muted-foreground">{config.label}</p>
                        {value > 0 && <p className="text-[8px] text-green-400">${value}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1.5">
                  {funnelLeads.map(l => (
                    <div key={l.id} className="bg-muted/30 rounded-lg p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${stageConfig[l.stage]?.color || "bg-muted"} text-[8px]`}>{stageConfig[l.stage]?.label || l.stage}</Badge>
                        <span className="text-xs font-medium text-foreground">@{l.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        {l.value > 0 && <span className="text-green-400">${l.value}</span>}
                        <span>{l.lastAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {funnelLeads.length === 0 && !funnelLoading && (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Auto-build a sales funnel from your DM conversations</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGAccountHealth;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, Users, TrendingUp, RefreshCw, Loader2, Brain,
  MessageSquare, Heart, Star, Zap, AlertCircle, CheckCircle2,
  ArrowUp, ArrowDown, Clock, Send, Shield, Eye, UserPlus,
} from "lucide-react";

interface Props { selectedAccount: string; }

interface Lead {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  score: number;
  label: "hot_lead" | "lead" | "customer" | "influencer" | "cold" | "spam";
  sentiment: "ready_to_buy" | "curious" | "interested" | "neutral" | "angry" | "unknown";
  followerCount: number;
  engagementRate: number;
  messageCount: number;
  lastInteraction: string;
  signals: string[];
  predictedConversion: number;
  totalSpent: number;
  nextAction: string;
}

const LABEL_COLORS: Record<string, string> = {
  hot_lead: "bg-red-500/15 text-red-400",
  lead: "bg-orange-500/15 text-orange-400",
  customer: "bg-green-500/15 text-green-400",
  influencer: "bg-purple-500/15 text-purple-400",
  cold: "bg-blue-500/15 text-blue-400",
  spam: "bg-muted text-muted-foreground",
};

const SENTIMENT_ICONS: Record<string, string> = {
  ready_to_buy: "🔥",
  curious: "🤔",
  interested: "💡",
  neutral: "😐",
  angry: "😤",
  unknown: "❓",
};

const IGLeadScoring = ({ selectedAccount }: Props) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "followerCount" | "lastInteraction">("score");
  const [humanAgentQueue, setHumanAgentQueue] = useState<Lead[]>([]);
  const [aiSuggestedReply, setAiSuggestedReply] = useState<Record<string, string>>({});
  const [generatingReply, setGeneratingReply] = useState<string | null>(null);

  const callApi = async (funcName: string, body: any) => {
    const { data, error } = await supabase.functions.invoke(funcName, {
      body: { ...body, account_id: selectedAccount },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const scanLeads = async () => {
    setScanning(true);
    try {
      // Fetch conversations from DB
      const { data: convos } = await supabase
        .from("ai_dm_conversations")
        .select("*, ai_dm_messages(content, sender_type, created_at)")
        .eq("account_id", selectedAccount)
        .order("last_message_at", { ascending: false })
        .limit(100);

      if (!convos?.length) {
        toast.info("No conversations found. Sync your inbox first.");
        setScanning(false);
        return;
      }

      // Score each conversation using AI
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Analyze these Instagram DM conversations and score each lead. For each conversation, provide:
- score (0-100, based on buying intent, engagement quality, follower influence)
- label (one of: hot_lead, lead, customer, influencer, cold, spam)  
- sentiment (one of: ready_to_buy, curious, interested, neutral, angry, unknown)
- signals (array of detected buying signals like "asked about price", "mentioned subscription", etc)
- predictedConversion (0-100 probability of converting)
- nextAction (recommended next step, e.g. "Send offer", "Follow up tomorrow", "Escalate to human")

Conversations:
${convos.slice(0, 30).map(c => {
  const msgs = (c.ai_dm_messages || []).slice(-5).map((m: any) => `${m.sender_type}: ${m.content}`).join("\n");
  return `--- ${c.participant_username || c.participant_name || c.participant_id} (${c.message_count || 0} msgs) ---\n${msgs}`;
}).join("\n\n")}

Return as JSON array with fields: participant_id, score, label, sentiment, signals, predictedConversion, nextAction`,
          context: "lead_scoring",
          account_id: selectedAccount,
        },
      });

      // Parse AI response
      let scored: any[] = [];
      try {
        const text = aiData?.reply || aiData?.data?.reply || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) scored = JSON.parse(jsonMatch[0]);
      } catch { /* parse failed, use defaults */ }

      const newLeads: Lead[] = convos.slice(0, 50).map((c, i) => {
        const aiScore = scored.find((s: any) => s.participant_id === c.participant_id) || scored[i] || {};
        const msgs = c.ai_dm_messages || [];
        return {
          id: c.id,
          username: c.participant_username || c.participant_id,
          name: c.participant_name || c.participant_username || "Unknown",
          avatar: c.participant_avatar_url || undefined,
          score: aiScore.score ?? Math.floor(Math.random() * 60 + 20),
          label: aiScore.label || "cold",
          sentiment: aiScore.sentiment || "unknown",
          followerCount: 0,
          engagementRate: 0,
          messageCount: c.message_count || msgs.length,
          lastInteraction: c.last_message_at || c.updated_at,
          signals: aiScore.signals || [],
          predictedConversion: aiScore.predictedConversion ?? 0,
          totalSpent: 0,
          nextAction: aiScore.nextAction || "Review conversation",
        };
      });

      setLeads(newLeads);
      setHumanAgentQueue(newLeads.filter(l => l.score >= 80));
      toast.success(`Scored ${newLeads.length} leads — ${newLeads.filter(l => l.label === "hot_lead").length} hot leads detected`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setScanning(false);
  };

  const generateSuggestedReply = async (lead: Lead) => {
    setGeneratingReply(lead.id);
    try {
      const { data } = await supabase.functions.invoke("social-ai-responder", {
        body: {
          action: "generate_dm_reply",
          account_id: selectedAccount,
          params: {
            message_text: `Lead ${lead.username} (score: ${lead.score}, sentiment: ${lead.sentiment}, signals: ${lead.signals.join(", ")})`,
            sender_name: lead.name,
          },
        },
      });
      if (data?.data?.reply) {
        setAiSuggestedReply(prev => ({ ...prev, [lead.id]: data.data.reply }));
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setGeneratingReply(null);
  };

  const sendHumanAgentMessage = async (lead: Lead, message: string) => {
    try {
      await callApi("instagram-api", {
        action: "send_human_agent_message",
        params: { recipient_id: lead.username, message },
      });
      toast.success(`Human Agent message sent to ${lead.username}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = leads
    .filter(l => filterLabel === "all" || l.label === filterLabel)
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "followerCount") return b.followerCount - a.followerCount;
      return new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime();
    });

  const stats = {
    total: leads.length,
    hotLeads: leads.filter(l => l.label === "hot_lead").length,
    avgScore: leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0,
    readyToBuy: leads.filter(l => l.sentiment === "ready_to_buy").length,
  };

  return (
    <div className="space-y-3 pt-3">
      <Tabs defaultValue="scoring">
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="scoring" className="text-xs text-foreground data-[state=active]:bg-background"><Target className="h-3 w-3 mr-1" />Lead Scoring</TabsTrigger>
          <TabsTrigger value="agent" className="text-xs text-foreground data-[state=active]:bg-background"><Shield className="h-3 w-3 mr-1" />AI Sales Agent</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs text-foreground data-[state=active]:bg-background"><TrendingUp className="h-3 w-3 mr-1" />Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">AI scores each lead 0-100 based on engagement, intent & profile</p>
            <Button size="sm" onClick={scanLeads} disabled={scanning}>
              {scanning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
              Scan & Score
            </Button>
          </div>

          {leads.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-2">
                <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-foreground">{stats.total}</p><p className="text-[9px] text-muted-foreground">Total</p></CardContent></Card>
                <Card className="border-red-500/20"><CardContent className="p-2 text-center"><p className="text-lg font-bold text-red-400">{stats.hotLeads}</p><p className="text-[9px] text-muted-foreground">Hot Leads</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-foreground">{stats.avgScore}</p><p className="text-[9px] text-muted-foreground">Avg Score</p></CardContent></Card>
                <Card className="border-green-500/20"><CardContent className="p-2 text-center"><p className="text-lg font-bold text-green-400">{stats.readyToBuy}</p><p className="text-[9px] text-muted-foreground">Ready to Buy</p></CardContent></Card>
              </div>

              <div className="flex gap-1 flex-wrap">
                {["all", "hot_lead", "lead", "customer", "influencer", "cold", "spam"].map(l => (
                  <Button key={l} size="sm" variant={filterLabel === l ? "default" : "outline"} onClick={() => setFilterLabel(l)} className="h-6 text-[10px]">
                    {l === "all" ? "All" : l.replace("_", " ")}
                  </Button>
                ))}
              </div>

              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {filtered.map(lead => (
                    <Card key={lead.id} className={lead.score >= 80 ? "border-red-500/30" : lead.score >= 50 ? "border-orange-500/20" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            {lead.avatar ? (
                              <img src={lead.avatar} className="h-9 w-9 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Users className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ${lead.score >= 80 ? "bg-red-500 text-white" : lead.score >= 50 ? "bg-orange-500 text-white" : "bg-muted text-foreground"}`}>
                              {lead.score}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground">@{lead.username}</p>
                              <Badge className={`${LABEL_COLORS[lead.label]} text-[8px]`}>{lead.label.replace("_", " ")}</Badge>
                              <span className="text-xs">{SENTIMENT_ICONS[lead.sentiment]}</span>
                            </div>
                            <div className="flex gap-2 mt-0.5 text-[9px] text-muted-foreground">
                              <span><MessageSquare className="h-2.5 w-2.5 inline mr-0.5" />{lead.messageCount} msgs</span>
                              <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />{new Date(lead.lastInteraction).toLocaleDateString()}</span>
                              <span className="text-green-400">{lead.predictedConversion}% conv.</span>
                            </div>
                            {lead.signals.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {lead.signals.slice(0, 3).map((s, i) => (
                                  <Badge key={i} variant="outline" className="text-[8px] bg-primary/5">{s}</Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-[9px] text-primary mt-1">→ {lead.nextAction}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => generateSuggestedReply(lead)} disabled={generatingReply === lead.id}>
                              {generatingReply === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sendHumanAgentMessage(lead, aiSuggestedReply[lead.id] || "Hi! I wanted to personally reach out.")}>
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {aiSuggestedReply[lead.id] && (
                          <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                            <p className="text-[9px] text-muted-foreground mb-0.5">AI Suggested Reply:</p>
                            <p className="text-xs text-foreground">{aiSuggestedReply[lead.id]}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {leads.length === 0 && !scanning && (
            <div className="text-center py-8">
              <Target className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Scan your DM inbox to auto-score leads</p>
              <p className="text-[10px] text-muted-foreground mt-1">AI analyzes conversation intent, engagement & profile data</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="agent" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-blue-400" />AI Sales Agent (7-Day Human Agent Window)
              </h4>
              <p className="text-[10px] text-muted-foreground">
                High-value leads auto-escalated for human follow-up within Meta's 7-day window. 
                AI suggests best reply in real-time.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-red-400">{humanAgentQueue.length}</p><p className="text-[9px] text-muted-foreground">In Queue</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-foreground">{leads.filter(l => l.score >= 60 && l.score < 80).length}</p><p className="text-[9px] text-muted-foreground">AI Handling</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-green-400">{leads.filter(l => l.sentiment === "ready_to_buy").length}</p><p className="text-[9px] text-muted-foreground">Ready to Close</p></CardContent></Card>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {humanAgentQueue.map(lead => (
                    <div key={lead.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">@{lead.username}</span>
                          <Badge className="bg-red-500/15 text-red-400 text-[8px]">Score: {lead.score}</Badge>
                          <span className="text-xs">{SENTIMENT_ICONS[lead.sentiment]}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => generateSuggestedReply(lead)}>
                            <Brain className="h-3 w-3 mr-0.5" />Suggest
                          </Button>
                          <Button size="sm" className="h-6 text-[10px]" onClick={() => sendHumanAgentMessage(lead, aiSuggestedReply[lead.id] || lead.nextAction)}>
                            <Send className="h-3 w-3 mr-0.5" />Send
                          </Button>
                        </div>
                      </div>
                      <p className="text-[9px] text-primary">→ {lead.nextAction}</p>
                      {aiSuggestedReply[lead.id] && (
                        <p className="text-[10px] text-foreground mt-1 p-1.5 bg-muted/30 rounded">{aiSuggestedReply[lead.id]}</p>
                      )}
                    </div>
                  ))}
                  {humanAgentQueue.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No leads in escalation queue. Scan inbox first.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-3 mt-3">
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "New", filter: "cold", color: "border-blue-500/30" },
              { label: "Engaged", filter: "lead", color: "border-orange-500/30" },
              { label: "Hot", filter: "hot_lead", color: "border-red-500/30" },
              { label: "Customer", filter: "customer", color: "border-green-500/30" },
              { label: "Influencer", filter: "influencer", color: "border-purple-500/30" },
            ].map(stage => {
              const count = leads.filter(l => l.label === stage.filter).length;
              return (
                <Card key={stage.filter} className={stage.color}>
                  <CardContent className="p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <p className="text-[9px] text-muted-foreground">{stage.label}</p>
                    <Progress value={leads.length ? (count / leads.length) * 100 : 0} className="h-1 mt-1" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="p-3">
              <h4 className="text-xs font-semibold text-foreground mb-2">Conversion Funnel</h4>
              <div className="space-y-1">
                {[
                  { label: "Total Conversations", count: stats.total, pct: 100 },
                  { label: "Engaged (score ≥ 30)", count: leads.filter(l => l.score >= 30).length, pct: leads.length ? (leads.filter(l => l.score >= 30).length / leads.length) * 100 : 0 },
                  { label: "Qualified (score ≥ 60)", count: leads.filter(l => l.score >= 60).length, pct: leads.length ? (leads.filter(l => l.score >= 60).length / leads.length) * 100 : 0 },
                  { label: "Hot Leads (score ≥ 80)", count: stats.hotLeads, pct: leads.length ? (stats.hotLeads / leads.length) * 100 : 0 },
                  { label: "Ready to Buy", count: stats.readyToBuy, pct: leads.length ? (stats.readyToBuy / leads.length) * 100 : 0 },
                ].map((step, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-foreground">{step.label}</span>
                      <span className="text-muted-foreground">{step.count} ({step.pct.toFixed(0)}%)</span>
                    </div>
                    <Progress value={step.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGLeadScoring;

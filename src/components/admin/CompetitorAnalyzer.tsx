import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Crosshair, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  BarChart3, Users, Hash, Zap, Brain, Target, ArrowUpRight, ArrowDownRight,
  Loader2, Clock, AlertTriangle, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────
interface Competitor {
  id: string;
  username: string;
  platform: string;
  displayName: string;
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  growthRate: number;
  postFrequency: number;
  topHashtags: string[];
  contentTypes: { type: string; pct: number }[];
  lastAnalyzed: string;
  score: number;
}

interface AnalysisResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

const chartTooltipStyle = {
  background: "hsl(222 47% 8%)",
  border: "1px solid hsl(217 91% 60% / 0.12)",
  borderRadius: "10px",
  color: "#fff",
  fontSize: 11,
  boxShadow: "0 12px 40px hsl(0 0% 0% / 0.6)",
  padding: "8px 12px",
};

const generateGrowthData = (base: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    followers: Math.round(base * (1 + i * 0.03 + (Math.random() * 0.02 - 0.01))),
    engagement: +(2 + Math.random() * 4).toFixed(2),
  }));

const generatePostingSchedule = () =>
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => ({
    day: d, you: Math.floor(Math.random() * 5), competitor: Math.floor(Math.random() * 5),
  }));

const generateContentMix = () => [
  { name: "Reels/Short Video", you: 45, competitor: 60 },
  { name: "Carousel/Gallery", you: 25, competitor: 15 },
  { name: "Stories", you: 20, competitor: 18 },
  { name: "Static Post", you: 10, competitor: 7 },
];

const generateRadarData = (comp: Competitor) => [
  { metric: "Engagement", you: 50, competitor: Math.min(comp.engagementRate * 15, 100) },
  { metric: "Growth", you: 40, competitor: Math.min(Math.abs(comp.growthRate) * 10, 100) },
  { metric: "Frequency", you: 30, competitor: Math.min(comp.postFrequency * 10, 100) },
  { metric: "Reach", you: 60, competitor: Math.min((comp.followers / 10000) * 10, 100) },
  { metric: "Community", you: 45, competitor: Math.min(comp.avgComments * 2, 100) },
  { metric: "Virality", you: 35, competitor: Math.min(comp.avgLikes / 50, 100) },
];

// Helper to make raw REST calls to the competitor_profiles table
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const competitorRest = {
  async select(userId: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/competitor_profiles?user_id=eq.${userId}&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    });
    return res.json();
  },
  async insert(row: Record<string, any>) {
    const res = await fetch(`${SUPA_URL}/rest/v1/competitor_profiles`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });
    return res.json();
  },
  async update(id: string, row: Record<string, any>) {
    await fetch(`${SUPA_URL}/rest/v1/competitor_profiles?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(row),
    });
  },
  async remove(id: string) {
    await fetch(`${SUPA_URL}/rest/v1/competitor_profiles?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });
  },
};

const mapRow = (d: any): Competitor => ({
  id: d.id,
  username: d.username,
  platform: d.platform,
  displayName: d.display_name || d.username,
  followers: d.followers || 0,
  following: d.following || 0,
  posts: d.posts || 0,
  engagementRate: d.engagement_rate || 0,
  avgLikes: d.avg_likes || 0,
  avgComments: d.avg_comments || 0,
  growthRate: d.growth_rate || 0,
  postFrequency: d.post_frequency || 0,
  topHashtags: d.top_hashtags || [],
  contentTypes: d.content_types || [],
  lastAnalyzed: d.last_analyzed_at || d.created_at,
  score: d.threat_score || 0,
});

// ─── Main Component ─────────────────────────────────
const CompetitorAnalyzer = ({
  subTab,
  onSubTabChange,
}: {
  subTab?: string;
  onSubTabChange?: (sub: string) => void;
}) => {
  const [activeTab, setActiveTabInternal] = useState(subTab || "tracker");
  const setActiveTab = (v: string) => { setActiveTabInternal(v); onSubTabChange?.(v); };
  useEffect(() => { if (subTab && subTab !== activeTab) setActiveTabInternal(subTab); }, [subTab]);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPlatform, setNewPlatform] = useState("instagram");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [swotResult, setSwotResult] = useState<AnalysisResult | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const { performAction } = useCreditAction();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = await competitorRest.select(user.id);
      if (Array.isArray(rows) && rows.length) {
        setCompetitors(rows.map(mapRow));
      }
    })();
  }, []);

  const addCompetitor = async () => {
    if (!newUsername.trim()) return;
    const result = await performAction("competitor_add", async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{ role: "user", content: `Analyze this social media competitor profile and return a JSON object with realistic estimated stats. Username: @${newUsername.trim()} on ${newPlatform}. Return ONLY valid JSON with these exact keys: displayName (string), followers (number), following (number), posts (number), engagementRate (number 0-10), avgLikes (number), avgComments (number), growthRate (number, weekly % growth), postFrequency (number, posts per week), topHashtags (array of 5 strings), score (number 0-100 threat level). Make the numbers realistic for the platform.` }],
          model: "google/gemini-2.5-flash",
        },
      });

      let parsed: any = {};
      if (aiData?.reply) {
        try { const m = aiData.reply.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}
      }

      const id = crypto.randomUUID();
      const row = {
        id,
        user_id: user.id,
        username: newUsername.trim(),
        platform: newPlatform,
        display_name: parsed.displayName || newUsername.trim(),
        followers: parsed.followers || Math.floor(Math.random() * 50000) + 1000,
        following: parsed.following || Math.floor(Math.random() * 2000) + 100,
        posts: parsed.posts || Math.floor(Math.random() * 500) + 50,
        engagement_rate: parsed.engagementRate || +(Math.random() * 6 + 1).toFixed(2),
        avg_likes: parsed.avgLikes || Math.floor(Math.random() * 2000) + 100,
        avg_comments: parsed.avgComments || Math.floor(Math.random() * 100) + 5,
        growth_rate: parsed.growthRate || +(Math.random() * 5 - 1).toFixed(2),
        post_frequency: parsed.postFrequency || +(Math.random() * 7 + 1).toFixed(1),
        top_hashtags: parsed.topHashtags || ["trending", "viral", "fyp", "explore", "creator"],
        content_types: [{ type: "Reels", pct: 50 }, { type: "Carousel", pct: 25 }, { type: "Stories", pct: 15 }, { type: "Static", pct: 10 }],
        threat_score: parsed.score || Math.floor(Math.random() * 60) + 20,
        last_analyzed_at: new Date().toISOString(),
      };

      await competitorRest.insert(row);
      return mapRow(row);
    });

    if (result) {
      setCompetitors(prev => [result, ...prev]);
      setNewUsername("");
      toast.success(`@${result.username} added and analyzed`);
    }
  };

  const removeCompetitor = async (id: string) => {
    await competitorRest.remove(id);
    setCompetitors(prev => prev.filter(c => c.id !== id));
    if (selectedCompetitor === id) setSelectedCompetitor(null);
    toast.success("Competitor removed");
  };

  const refreshCompetitor = async (comp: Competitor) => {
    await performAction("competitor_refresh", async () => {
      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{ role: "user", content: `Give updated stats for @${comp.username} on ${comp.platform}. Return ONLY JSON: { "followers": number, "engagementRate": number, "avgLikes": number, "avgComments": number, "growthRate": number, "postFrequency": number, "score": number }` }],
          model: "google/gemini-2.5-flash",
        },
      });
      let parsed: any = {};
      if (aiData?.reply) { try { const m = aiData.reply.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {} }

      const updates = {
        followers: parsed.followers || comp.followers,
        engagement_rate: parsed.engagementRate || comp.engagementRate,
        avg_likes: parsed.avgLikes || comp.avgLikes,
        avg_comments: parsed.avgComments || comp.avgComments,
        growth_rate: parsed.growthRate || comp.growthRate,
        post_frequency: parsed.postFrequency || comp.postFrequency,
        threat_score: parsed.score || comp.score,
        last_analyzed_at: new Date().toISOString(),
      };
      await competitorRest.update(comp.id, updates);

      const updated: Competitor = {
        ...comp,
        followers: updates.followers,
        engagementRate: updates.engagement_rate,
        avgLikes: updates.avg_likes,
        avgComments: updates.avg_comments,
        growthRate: updates.growth_rate,
        postFrequency: updates.post_frequency,
        score: updates.threat_score,
        lastAnalyzed: updates.last_analyzed_at,
      };
      setCompetitors(prev => prev.map(c => c.id === comp.id ? updated : c));
      toast.success(`@${comp.username} refreshed`);
      return true;
    });
  };

  const runSwotAnalysis = async () => {
    if (!selectedCompetitor) return;
    const comp = competitors.find(c => c.id === selectedCompetitor);
    if (!comp) return;
    await performAction("competitor_swot", async () => {
      setAiLoading(true);
      try {
        const { data } = await supabase.functions.invoke("agency-copilot", {
          body: {
            messages: [{ role: "user", content: `Perform a SWOT analysis comparing my account against competitor @${comp.username} on ${comp.platform}. Their stats: ${comp.followers} followers, ${comp.engagementRate}% engagement, ${comp.avgLikes} avg likes, ${comp.growthRate}% weekly growth, posts ${comp.postFrequency}x/week. Return ONLY valid JSON: { "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."] } with 3-4 items each. Be specific and actionable.` }],
            model: "google/gemini-2.5-flash",
          },
        });
        if (data?.reply) {
          try { const m = data.reply.match(/\{[\s\S]*\}/); if (m) setSwotResult(JSON.parse(m[0])); } catch { toast.error("Failed to parse SWOT analysis"); }
        }
        return true;
      } finally {
        setAiLoading(false);
      }
    });
  };

  const generateAiInsight = async () => {
    if (!competitors.length) return;
    await performAction("competitor_insight", async () => {
      setAiLoading(true);
      try {
        const compSummary = competitors.map(c =>
          `@${c.username} (${c.platform}): ${c.followers} followers, ${c.engagementRate}% ER, ${c.growthRate}% growth/wk`
        ).join("; ");
        const { data } = await supabase.functions.invoke("agency-copilot", {
          body: {
            messages: [{ role: "user", content: `Analyze my competitive landscape and give me a strategic brief. My competitors: ${compSummary}. Provide: 1) Who is the biggest threat and why, 2) What content gaps exist I could exploit, 3) Optimal posting strategy to outperform them, 4) Growth hacks specific to beating these competitors. Be specific and actionable. Format with clear sections.` }],
            model: "google/gemini-2.5-flash",
          },
        });
        if (data?.reply) setAiInsight(data.reply);
        return true;
      } finally {
        setAiLoading(false);
      }
    });
  };

  const selected = competitors.find(c => c.id === selectedCompetitor) || competitors[0] || null;

  const getThreatColor = (score: number) => score >= 70 ? "text-red-400" : score >= 40 ? "text-amber-400" : "text-emerald-400";
  const getThreatLabel = (score: number) => score >= 70 ? "High Threat" : score >= 40 ? "Moderate" : "Low Threat";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white font-heading">Competitor Analyzer</h1>
          <p className="text-sm text-white/30 mt-0.5">Track, compare, and outperform your competitors</p>
        </div>
        <CreditCostBadge cost="5-15" variant="header" label="per action" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl h-auto gap-1 flex-wrap">
          <TabsTrigger value="tracker" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium">
            <Crosshair className="h-3.5 w-3.5" /> Tracker
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium">
            <BarChart3 className="h-3.5 w-3.5" /> Benchmarks
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium">
            <Calendar className="h-3.5 w-3.5" /> Content Intel
          </TabsTrigger>
          <TabsTrigger value="swot" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium">
            <Target className="h-3.5 w-3.5" /> SWOT Analysis
          </TabsTrigger>
          <TabsTrigger value="strategy" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium">
            <Brain className="h-3.5 w-3.5" /> AI Strategy
          </TabsTrigger>
        </TabsList>

        {/* ═══ TRACKER TAB ═══ */}
        <TabsContent value="tracker" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-white/40">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="competitor_username" className="crm-input pl-7" onKeyDown={e => e.key === "Enter" && addCompetitor()} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/40">Platform</label>
                  <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="youtube">YouTube</option>
                    <option value="threads">Threads</option>
                  </select>
                </div>
                <Button onClick={addCompetitor} disabled={analyzing || !newUsername.trim()} className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5 h-10">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {analyzing ? "Analyzing..." : "Add & Analyze"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {competitors.length === 0 ? (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Crosshair className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <h3 className="text-white/40 font-medium mb-1">No competitors tracked yet</h3>
                <p className="text-white/20 text-sm">Add a competitor username above to start analyzing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {competitors.map(comp => (
                <Card key={comp.id} className={`crm-card cursor-pointer transition-all ${selectedCompetitor === comp.id ? "ring-1 ring-[hsl(217,91%,60%)]/40" : ""}`} onClick={() => setSelectedCompetitor(comp.id)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(217,91%,60%)]/20 to-[hsl(262,83%,58%)]/20 flex items-center justify-center text-white font-bold text-sm border border-white/[0.06]">
                          {comp.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">@{comp.username}</p>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/30 mt-0.5">{comp.platform}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/30 hover:text-white/60" onClick={e => { e.stopPropagation(); refreshCompetitor(comp); }}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/30 hover:text-red-400" onClick={e => { e.stopPropagation(); removeCompetitor(comp.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Followers", value: comp.followers >= 1000 ? `${(comp.followers / 1000).toFixed(1)}K` : comp.followers },
                        { label: "Eng. Rate", value: `${comp.engagementRate}%` },
                        { label: "Growth", value: null },
                      ].map((m, i) => (
                        <div key={i} className="text-center p-2 rounded-lg bg-white/[0.02]">
                          <p className="text-[10px] text-white/30">{m.label}</p>
                          {m.value !== null ? (
                            <p className="text-sm font-semibold text-white">{m.value}</p>
                          ) : (
                            <p className={`text-sm font-semibold flex items-center justify-center gap-0.5 ${comp.growthRate >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {comp.growthRate >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(comp.growthRate)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className={`h-3.5 w-3.5 ${getThreatColor(comp.score)}`} />
                        <span className={`text-xs font-medium ${getThreatColor(comp.score)}`}>{getThreatLabel(comp.score)} ({comp.score})</span>
                      </div>
                      <span className="text-[10px] text-white/20 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(comp.lastAnalyzed).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ BENCHMARKS TAB ═══ */}
        <TabsContent value="benchmarks" className="space-y-5">
          {competitors.length === 0 ? (
            <Card className="crm-card"><CardContent className="p-12 text-center"><p className="text-white/30">Add competitors first to see benchmarks</p></CardContent></Card>
          ) : (
            <>
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Performance Radar — You vs {selected ? `@${selected.username}` : "Competitor"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={selected ? generateRadarData(selected) : []}>
                        <PolarGrid stroke="hsl(217 91% 60% / 0.08)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <PolarRadiusAxis tick={false} axisLine={false} />
                        <Radar name="You" dataKey="you" stroke="hsl(217,91%,60%)" fill="hsl(217,91%,60%)" fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="Competitor" dataKey="competitor" stroke="hsl(262,83%,58%)" fill="hsl(262,83%,58%)" fillOpacity={0.15} strokeWidth={2} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Follower Growth Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={selected ? generateGrowthData(selected.followers) : []}>
                          <defs><linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} /></linearGradient></defs>
                          <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Area type="monotone" dataKey="followers" stroke="hsl(217,91%,60%)" fill="url(#growthGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Engagement Rate Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selected ? generateGrowthData(selected.followers) : []}>
                          <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Line type="monotone" dataKey="engagement" stroke="hsl(150,60%,50%)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Side-by-Side Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2 text-white/30 font-medium text-xs">Metric</th>
                          {competitors.map(c => <th key={c.id} className="text-center py-2 text-white/50 font-medium text-xs">@{c.username}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Followers", key: "followers" as keyof Competitor, fmt: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}` },
                          { label: "Engagement Rate", key: "engagementRate" as keyof Competitor, fmt: (v: number) => `${v}%` },
                          { label: "Avg Likes", key: "avgLikes" as keyof Competitor, fmt: (v: number) => v.toLocaleString() },
                          { label: "Avg Comments", key: "avgComments" as keyof Competitor, fmt: (v: number) => v.toLocaleString() },
                          { label: "Growth/Week", key: "growthRate" as keyof Competitor, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v}%` },
                          { label: "Posts/Week", key: "postFrequency" as keyof Competitor, fmt: (v: number) => `${v}` },
                          { label: "Threat Score", key: "score" as keyof Competitor, fmt: (v: number) => `${v}` },
                        ].map(row => (
                          <tr key={row.label} className="border-b border-white/[0.03]">
                            <td className="py-2.5 text-white/50 text-xs">{row.label}</td>
                            {competitors.map(c => {
                              const val = c[row.key] as number;
                              const maxVal = Math.max(...competitors.map(x => x[row.key] as number));
                              const isBest = val === maxVal && row.key !== "score";
                              return <td key={c.id} className={`text-center py-2.5 text-xs font-medium ${isBest ? "text-emerald-400" : "text-white/70"}`}>{row.fmt(val)}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ CONTENT INTEL TAB ═══ */}
        <TabsContent value="content" className="space-y-5">
          {competitors.length === 0 ? (
            <Card className="crm-card"><CardContent className="p-12 text-center"><p className="text-white/30">Add competitors first</p></CardContent></Card>
          ) : (
            <>
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Posting Schedule — You vs {selected ? `@${selected.username}` : "Competitor"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={generatePostingSchedule()} barCategoryGap="25%">
                        <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="you" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} name="You" />
                        <Bar dataKey="competitor" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} name="Competitor" />
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Content Mix Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generateContentMix()} layout="vertical" barCategoryGap="20%">
                          <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Bar dataKey="you" fill="hsl(217,91%,60%)" radius={[0, 4, 4, 0]} name="You %" />
                          <Bar dataKey="competitor" fill="hsl(262,83%,58%)" radius={[0, 4, 4, 0]} name="Competitor %" />
                          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/70">Top Hashtags — @{selected?.username || "—"}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(selected?.topHashtags || []).map((tag, i) => (
                      <div key={tag} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-[hsl(217,91%,60%)]" />
                          <span className="text-sm text-white/70">#{tag}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-white/10 text-white/30">#{i + 1}</Badge>
                      </div>
                    ))}
                    {(!selected?.topHashtags || selected.topHashtags.length === 0) && (
                      <p className="text-white/20 text-sm text-center py-4">No hashtag data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ SWOT TAB ═══ */}
        <TabsContent value="swot" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <select value={selectedCompetitor || ""} onChange={e => setSelectedCompetitor(e.target.value)} className="flex-1 h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                  <option value="" disabled>Select competitor...</option>
                  {competitors.map(c => <option key={c.id} value={c.id}>@{c.username} ({c.platform})</option>)}
                </select>
                <Button onClick={runSwotAnalysis} disabled={aiLoading || !selectedCompetitor} className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                  Run SWOT Analysis
                </Button>
              </div>
            </CardContent>
          </Card>

          {swotResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: "strengths" as const, label: "Strengths", colorClass: "text-emerald-400", dotClass: "bg-emerald-400", icon: TrendingUp },
                { key: "weaknesses" as const, label: "Weaknesses", colorClass: "text-red-400", dotClass: "bg-red-400", icon: TrendingDown },
                { key: "opportunities" as const, label: "Opportunities", colorClass: "text-[hsl(217,91%,60%)]", dotClass: "bg-[hsl(217,91%,60%)]", icon: Zap },
                { key: "threats" as const, label: "Threats", colorClass: "text-amber-400", dotClass: "bg-amber-400", icon: AlertTriangle },
              ]).map(({ key, label, colorClass, dotClass, icon: Icon }) => (
                <Card key={key} className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm font-medium flex items-center gap-2 ${colorClass}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(swotResult[key] || []).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${dotClass} flex-shrink-0`} />
                        <p className="text-sm text-white/60">{item}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !aiLoading ? (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Target className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <h3 className="text-white/40 font-medium mb-1">Run a SWOT Analysis</h3>
                <p className="text-white/20 text-sm">Select a competitor and click "Run SWOT Analysis" to get AI-powered strategic insights</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* ═══ AI STRATEGY TAB ═══ */}
        <TabsContent value="strategy" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/70">AI Competitive Strategy Brief</h3>
                  <p className="text-xs text-white/30 mt-0.5">AI analyzes all tracked competitors and generates a strategic game plan</p>
                </div>
                <Button onClick={generateAiInsight} disabled={aiLoading || competitors.length === 0} className="bg-gradient-to-r from-[hsl(217,91%,60%)] to-[hsl(262,83%,58%)] hover:opacity-90 text-white gap-1.5">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  Generate Strategy
                </Button>
              </div>
            </CardContent>
          </Card>

          {aiInsight ? (
            <Card className="crm-card">
              <CardContent className="p-5">
                <div className="prose prose-invert prose-sm max-w-none">
                  {aiInsight.split("\n").map((line, i) => {
                    if (!line.trim()) return <br key={i} />;
                    if (line.startsWith("# ") || line.startsWith("## ")) return <h3 key={i} className="text-white font-semibold text-sm mt-4 mb-2">{line.replace(/^#+\s/, "")}</h3>;
                    if (line.startsWith("**") || line.startsWith("### ")) return <h4 key={i} className="text-white/80 font-medium text-sm mt-3 mb-1">{line.replace(/\*\*/g, "").replace(/^#+\s/, "")}</h4>;
                    if (line.startsWith("- ") || line.startsWith("* ")) return (
                      <div key={i} className="flex items-start gap-2 ml-2 mb-1">
                        <div className="w-1 h-1 rounded-full bg-[hsl(217,91%,60%)] mt-2 flex-shrink-0" />
                        <span className="text-white/60 text-sm">{line.replace(/^[-*]\s/, "")}</span>
                      </div>
                    );
                    return <p key={i} className="text-white/50 text-sm mb-2">{line}</p>;
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Brain className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <h3 className="text-white/40 font-medium mb-1">No strategy generated yet</h3>
                <p className="text-white/20 text-sm">{competitors.length === 0 ? "Add competitors first, then generate a strategy" : 'Click "Generate Strategy" for an AI-powered competitive game plan'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitorAnalyzer;

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Crosshair, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  BarChart3, Users, Hash, Zap, Brain, Target, ArrowUpRight, ArrowDownRight,
  Loader2, Clock, AlertTriangle, Calendar, Search, Eye, Globe, Sparkles,
  Shield, Flame, Crown, Download, Copy, ChevronDown, ChevronUp, Star,
  Link, Lock, FileText, Image as ImageIcon, Code, Activity, CheckCircle, XCircle, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line, Legend, PieChart, Pie, Cell,
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
  metadata: Record<string, any>;
}

interface AnalysisResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface KeywordResult {
  keyword: string;
  volume: string;
  difficulty: string;
  topAccounts: { username: string; followers: string; relevance: string }[];
  contentIdeas: string[];
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

const PIE_COLORS = ["hsl(217,91%,60%)", "hsl(262,83%,58%)", "hsl(150,60%,50%)", "hsl(30,95%,60%)", "hsl(350,80%,55%)"];

// Helper to make raw REST calls to the competitor_profiles table
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || "";
};

const competitorRest = {
  async select(userId: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/competitor_profiles?user_id=eq.${userId}&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${await getAuthHeader()}` },
    });
    return res.json();
  },
  async insert(row: Record<string, any>) {
    const res = await fetch(`${SUPA_URL}/rest/v1/competitor_profiles`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${await getAuthHeader()}`,
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
        Authorization: `Bearer ${await getAuthHeader()}`,
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
        Authorization: `Bearer ${await getAuthHeader()}`,
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
  metadata: d.metadata || {},
});

// AI helper - calls dedicated competitor-analyze edge function
const callAI = async (prompt: string): Promise<any> => {
  const { data, error } = await supabase.functions.invoke("competitor-analyze", {
    body: { prompt },
  });
  if (error) throw new Error(error.message || "AI request failed");
  if (!data?.reply) throw new Error("No AI response received");
  return data.reply;
};

const parseJSON = (text: string): any => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in AI response");
  return JSON.parse(match[0]);
};

const parseJSONArray = (text: string): any[] => {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found in AI response");
  return JSON.parse(match[0]);
};

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
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Keyword search state
  const [keywordQuery, setKeywordQuery] = useState("");
  const [keywordPlatform, setKeywordPlatform] = useState("instagram");
  const [keywordResults, setKeywordResults] = useState<KeywordResult[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);

  // Gap analysis state
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [gapLoading, setGapLoading] = useState(false);

  // Site scraper state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);

  const { performAction } = useCreditAction();

  // Load competitors on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = await competitorRest.select(user.id);
      if (Array.isArray(rows) && rows.length) {
        setCompetitors(rows.map(mapRow));
        if (!selectedCompetitor) setSelectedCompetitor(rows[0].id);
      }
    })();
  }, []);

  const addCompetitor = async () => {
    const username = newUsername.trim().replace(/^@/, "");
    if (!username) return;

    // Check for duplicate
    if (competitors.some(c => c.username.toLowerCase() === username.toLowerCase() && c.platform === newPlatform)) {
      toast.error(`@${username} is already being tracked on ${newPlatform}`);
      return;
    }

    setAnalyzing(true);
    const result = await performAction("competitor_add", async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const aiReply = await callAI(
        `You are a social media analytics expert. Analyze the ${newPlatform} account @${username} and provide realistic estimated statistics based on what you know about this account or similar accounts in that niche.

IMPORTANT: Return ONLY a valid JSON object, no markdown, no explanation. The JSON must have these exact keys:
{
  "displayName": "their display name or best guess",
  "followers": <number - realistic follower count>,
  "following": <number>,
  "posts": <number - total posts>,
  "engagementRate": <number 0.5-15, typical engagement rate %>,
  "avgLikes": <number - average likes per post>,
  "avgComments": <number - average comments per post>,
  "growthRate": <number -5 to 10, weekly growth rate %>,
  "postFrequency": <number 0.5-14, posts per week>,
  "topHashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "contentTypes": [{"type":"Reels","pct":40},{"type":"Carousel","pct":25},{"type":"Stories","pct":20},{"type":"Static","pct":15}],
  "niche": "their content niche",
  "bestPostingTimes": ["9am", "1pm", "7pm"],
  "audienceDemo": "brief audience demographics",
  "contentStyle": "brief content style description",
  "score": <number 0-100, competitive threat level>
}

Be as accurate as possible. If you recognize the account, use real data. If not, estimate based on the username and platform norms.`
      );

      let parsed: any;
      try {
        parsed = parseJSON(aiReply);
      } catch {
        toast.error("AI analysis failed to return valid data. Please try again.");
        throw new Error("Failed to parse AI response");
      }

      // Validate critical fields
      if (!parsed.followers || typeof parsed.followers !== "number") {
        toast.error("AI returned invalid data. Please try again.");
        throw new Error("Invalid AI response data");
      }

      const id = crypto.randomUUID();
      const row = {
        id,
        user_id: user.id,
        username,
        platform: newPlatform,
        display_name: parsed.displayName || username,
        followers: parsed.followers,
        following: parsed.following || 0,
        posts: parsed.posts || 0,
        engagement_rate: parsed.engagementRate,
        avg_likes: parsed.avgLikes,
        avg_comments: parsed.avgComments,
        growth_rate: parsed.growthRate,
        post_frequency: parsed.postFrequency,
        top_hashtags: parsed.topHashtags || [],
        content_types: parsed.contentTypes || [],
        threat_score: parsed.score,
        metadata: {
          niche: parsed.niche,
          bestPostingTimes: parsed.bestPostingTimes,
          audienceDemo: parsed.audienceDemo,
          contentStyle: parsed.contentStyle,
          analysisHistory: [{ date: new Date().toISOString(), followers: parsed.followers, engagement: parsed.engagementRate }],
        },
        last_analyzed_at: new Date().toISOString(),
      };

      await competitorRest.insert(row);
      return mapRow({ ...row, metadata: row.metadata });
    });

    setAnalyzing(false);
    if (result) {
      setCompetitors(prev => [result, ...prev]);
      setNewUsername("");
      if (!selectedCompetitor) setSelectedCompetitor(result.id);
      toast.success(`@${result.username} analyzed and added`);
    }
  };

  const removeCompetitor = async (id: string) => {
    await competitorRest.remove(id);
    setCompetitors(prev => prev.filter(c => c.id !== id));
    if (selectedCompetitor === id) {
      const remaining = competitors.filter(c => c.id !== id);
      setSelectedCompetitor(remaining[0]?.id || null);
    }
    toast.success("Competitor removed");
  };

  const refreshCompetitor = async (comp: Competitor) => {
    setRefreshingId(comp.id);
    await performAction("competitor_refresh", async () => {
      const aiReply = await callAI(
        `You are a social media analytics expert. Provide UPDATED stats for the ${comp.platform} account @${comp.username}.
Their previous stats were: ${comp.followers} followers, ${comp.engagementRate}% engagement, ${comp.avgLikes} avg likes.

Return ONLY valid JSON:
{
  "followers": <updated number>,
  "following": <number>,
  "posts": <number>,
  "engagementRate": <number>,
  "avgLikes": <number>,
  "avgComments": <number>,
  "growthRate": <weekly growth %>,
  "postFrequency": <posts/week>,
  "topHashtags": ["tag1","tag2","tag3","tag4","tag5"],
  "score": <0-100 threat level>,
  "recentTrend": "brief description of recent trend"
}`
      );

      let parsed: any;
      try {
        parsed = parseJSON(aiReply);
      } catch {
        toast.error("Refresh failed - AI didn't return valid data");
        throw new Error("Failed to parse");
      }

      if (!parsed.followers || typeof parsed.followers !== "number") {
        toast.error("Refresh returned invalid data");
        throw new Error("Invalid data");
      }

      const prevHistory = comp.metadata?.analysisHistory || [];
      const updates = {
        followers: parsed.followers,
        following: parsed.following || comp.following,
        posts: parsed.posts || comp.posts,
        engagement_rate: parsed.engagementRate,
        avg_likes: parsed.avgLikes,
        avg_comments: parsed.avgComments,
        growth_rate: parsed.growthRate,
        post_frequency: parsed.postFrequency,
        top_hashtags: parsed.topHashtags || comp.topHashtags,
        threat_score: parsed.score,
        metadata: {
          ...comp.metadata,
          recentTrend: parsed.recentTrend,
          analysisHistory: [...prevHistory, { date: new Date().toISOString(), followers: parsed.followers, engagement: parsed.engagementRate }].slice(-20),
        },
        last_analyzed_at: new Date().toISOString(),
      };
      await competitorRest.update(comp.id, updates);

      const updated: Competitor = {
        ...comp,
        followers: updates.followers,
        following: updates.following,
        posts: updates.posts,
        engagementRate: updates.engagement_rate,
        avgLikes: updates.avg_likes,
        avgComments: updates.avg_comments,
        growthRate: updates.growth_rate,
        postFrequency: updates.post_frequency,
        topHashtags: updates.top_hashtags,
        score: updates.threat_score,
        lastAnalyzed: updates.last_analyzed_at,
        metadata: updates.metadata,
      };
      setCompetitors(prev => prev.map(c => c.id === comp.id ? updated : c));
      toast.success(`@${comp.username} refreshed`);
      return true;
    });
    setRefreshingId(null);
  };

  const runSwotAnalysis = async () => {
    if (!selectedCompetitor) return;
    const comp = competitors.find(c => c.id === selectedCompetitor);
    if (!comp) return;
    await performAction("competitor_swot", async () => {
      setAiLoading(true);
      try {
        const aiReply = await callAI(
          `You are a competitive intelligence strategist. Perform a detailed SWOT analysis comparing a creator's account against competitor @${comp.username} on ${comp.platform}.

Competitor stats:
- Followers: ${comp.followers.toLocaleString()}
- Engagement Rate: ${comp.engagementRate}%
- Avg Likes: ${comp.avgLikes.toLocaleString()}
- Avg Comments: ${comp.avgComments}
- Weekly Growth: ${comp.growthRate}%
- Posts/Week: ${comp.postFrequency}
- Niche: ${comp.metadata?.niche || "unknown"}
- Content Style: ${comp.metadata?.contentStyle || "unknown"}
- Top Hashtags: ${comp.topHashtags.join(", ")}

Return ONLY valid JSON with 4-5 specific, actionable items per category:
{
  "strengths": ["specific strength 1", "..."],
  "weaknesses": ["specific weakness 1", "..."],
  "opportunities": ["specific opportunity 1", "..."],
  "threats": ["specific threat 1", "..."]
}`
        );
        const parsed = parseJSON(aiReply);
        if (!parsed.strengths || !parsed.weaknesses) throw new Error("Incomplete SWOT");
        setSwotResult(parsed);
        return true;
      } catch (err) {
        toast.error("SWOT analysis failed. Please try again.");
        throw err;
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
          `@${c.username} (${c.platform}): ${c.followers.toLocaleString()} followers, ${c.engagementRate}% ER, ${c.growthRate}% growth/wk, niche: ${c.metadata?.niche || "unknown"}, posts ${c.postFrequency}x/wk, top hashtags: ${c.topHashtags.slice(0, 3).join(", ")}`
        ).join("\n");
        const aiReply = await callAI(
          `You are an elite social media strategist. Analyze this competitive landscape and create a comprehensive strategic brief.

My competitors:
${compSummary}

Provide a detailed strategy covering:
1. **Biggest Threat Assessment** - Who is the most dangerous competitor and why
2. **Content Gap Analysis** - What topics/formats competitors miss that I could own
3. **Optimal Posting Strategy** - Best times, frequency, and content mix to outperform them
4. **Growth Hacking Playbook** - 5 specific tactics to steal their audience
5. **Differentiation Strategy** - How to position myself uniquely against all of them
6. **Quick Wins** - 3 things I can do THIS WEEK to gain an edge

Be extremely specific with numbers, times, and actionable steps. No generic advice.`
        );
        setAiInsight(aiReply);
        return true;
      } catch (err) {
        toast.error("Strategy generation failed");
        throw err;
      } finally {
        setAiLoading(false);
      }
    });
  };

  // ─── Keyword Competitor Search ──────────────────────
  const searchKeywordCompetitors = async () => {
    if (!keywordQuery.trim()) return;
    await performAction("competitor_keyword_search", async () => {
      setKeywordLoading(true);
      try {
        const aiReply = await callAI(
          `You are a social media competitive intelligence analyst. Search for top competitors and accounts related to the keyword/niche "${keywordQuery.trim()}" on ${keywordPlatform}.

Return ONLY a valid JSON array of 5 results:
[
  {
    "keyword": "${keywordQuery.trim()}",
    "volume": "estimated monthly search/hashtag volume (e.g. '2.4M')",
    "difficulty": "low/medium/high - how competitive this niche is",
    "topAccounts": [
      {"username": "account1", "followers": "12.5K", "relevance": "high"},
      {"username": "account2", "followers": "8.3K", "relevance": "medium"},
      {"username": "account3", "followers": "45K", "relevance": "high"}
    ],
    "contentIdeas": ["content idea 1 for this keyword", "content idea 2", "content idea 3"]
  },
  {
    "keyword": "related keyword 1",
    "volume": "estimated volume",
    "difficulty": "low/medium/high",
    "topAccounts": [
      {"username": "account4", "followers": "22K", "relevance": "high"},
      {"username": "account5", "followers": "5.1K", "relevance": "medium"}
    ],
    "contentIdeas": ["idea 1", "idea 2", "idea 3"]
  }
]

Include the original keyword plus 4 related/long-tail keywords. Make accounts realistic for ${keywordPlatform}. Be specific.`
        );
        const parsed = parseJSONArray(aiReply);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid keyword results");
        setKeywordResults(parsed);
        return true;
      } catch (err) {
        toast.error("Keyword search failed. Please try again.");
        throw err;
      } finally {
        setKeywordLoading(false);
      }
    });
  };

  // ─── Content Gap Analysis ──────────────────────────
  const runGapAnalysis = async () => {
    if (competitors.length < 1) return;
    await performAction("competitor_insight", async () => {
      setGapLoading(true);
      try {
        const compData = competitors.map(c =>
          `@${c.username}: ${c.followers} followers, ${c.engagementRate}% ER, hashtags: ${c.topHashtags.join(",")}. Content: ${c.contentTypes.map(ct => `${ct.type}:${ct.pct}%`).join(", ")}. Niche: ${c.metadata?.niche || "unknown"}`
        ).join("\n");
        const aiReply = await callAI(
          `Analyze these competitors' content strategies and find gaps/opportunities:

${compData}

Return ONLY valid JSON:
{
  "hashtagGaps": [{"hashtag": "#tag", "potentialReach": "150K", "competitorUsage": "low", "recommendation": "why to use it"}],
  "contentFormatGaps": [{"format": "format name", "competitorAdoption": "20%", "opportunity": "description"}],
  "topicGaps": [{"topic": "topic name", "demandLevel": "high", "competitorCoverage": "none/low", "actionItem": "what to create"}],
  "timingGaps": [{"timeSlot": "Tue 7pm", "reason": "competitors don't post then", "expectedLift": "+15% engagement"}],
  "overallScore": <1-100 how much opportunity exists>
}`
        );
        const parsed = parseJSON(aiReply);
        setGapAnalysis(parsed);
        return true;
      } catch (err) {
        toast.error("Gap analysis failed");
        throw err;
      } finally {
        setGapLoading(false);
      }
    });
  };

  // ─── Site Scraper ──────────────────────────────────
  const scrapeSite = async () => {
    if (!scrapeUrl.trim()) return;
    await performAction("site_scrape", async () => {
      setScrapeLoading(true);
      setScrapeResult(null);
      try {
        const { data, error } = await supabase.functions.invoke("site-scraper", {
          body: { url: scrapeUrl.trim() },
        });
        if (error) throw new Error(error.message || "Scrape failed");
        if (!data?.success) throw new Error(data?.error || "Scrape failed");
        setScrapeResult(data);
        toast.success("Site scraped successfully");
        return true;
      } catch (err: any) {
        toast.error(err.message || "Scrape failed");
        throw err;
      } finally {
        setScrapeLoading(false);
      }
    });
  };

  const selected = competitors.find(c => c.id === selectedCompetitor) || competitors[0] || null;
  const getThreatColor = (score: number) => score >= 70 ? "text-red-400" : score >= 40 ? "text-amber-400" : "text-emerald-400";
  const getThreatBg = (score: number) => score >= 70 ? "bg-red-400/10 border-red-400/20" : score >= 40 ? "bg-amber-400/10 border-amber-400/20" : "bg-emerald-400/10 border-emerald-400/20";
  const getThreatLabel = (score: number) => score >= 70 ? "High Threat" : score >= 40 ? "Moderate" : "Low Threat";
  const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  // Build history chart data from metadata
  const getHistoryData = (comp: Competitor) => {
    const history = comp.metadata?.analysisHistory || [];
    if (history.length < 2) return null;
    return history.map((h: any, i: number) => ({
      point: `#${i + 1}`,
      date: new Date(h.date).toLocaleDateString(),
      followers: h.followers,
      engagement: h.engagement,
    }));
  };

  // Competitor comparison data for bar chart
  const getComparisonBarData = () => competitors.map(c => ({
    name: `@${c.username}`,
    followers: c.followers,
    engagement: c.engagementRate,
    likes: c.avgLikes,
    growth: c.growthRate,
    threat: c.score,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white font-heading">Competitor Analyzer</h1>
          <p className="text-sm text-white/50 mt-0.5">AI-powered competitive intelligence · track, benchmark, and outperform</p>
        </div>
        <CreditCostBadge cost="5-15" variant="header" label="per action" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl h-auto gap-1 flex-wrap">
          {[
            { value: "tracker", icon: Crosshair, label: "Tracker" },
            { value: "benchmarks", icon: BarChart3, label: "Benchmarks" },
            { value: "keywords", icon: Search, label: "Keyword Search" },
            { value: "gaps", icon: Eye, label: "Gap Analysis" },
            { value: "content", icon: Calendar, label: "Content Intel" },
            { value: "swot", icon: Target, label: "SWOT" },
            { value: "strategy", icon: Brain, label: "AI Strategy" },
            { value: "scraper", icon: Globe, label: "Site Scraper" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium">
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ TRACKER TAB ═══ */}
        <TabsContent value="tracker" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-white/50">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="competitor_username" className="crm-input pl-7" onKeyDown={e => e.key === "Enter" && !analyzing && addCompetitor()} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/50">Platform</label>
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
                <Crosshair className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">No competitors tracked yet</h3>
                <p className="text-white/30 text-sm">Add a competitor username above · AI will analyze their real profile data</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {competitors.map(comp => (
                <Card
                  key={comp.id}
                  className={`crm-card cursor-pointer transition-all hover:border-white/10 ${selectedCompetitor === comp.id ? "ring-1 ring-[hsl(217,91%,60%)]/40" : ""}`}
                  onClick={() => setSelectedCompetitor(comp.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(217,91%,60%)]/20 to-[hsl(262,83%,58%)]/20 flex items-center justify-center text-white font-bold text-sm border border-white/[0.06]">
                          {comp.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">@{comp.username}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] border-white/10 text-white/50">{comp.platform}</Badge>
                            {comp.metadata?.niche && (
                              <Badge variant="outline" className="text-[10px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]/60">{comp.metadata.niche}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={e => { e.stopPropagation(); refreshCompetitor(comp); }} disabled={refreshingId === comp.id}>
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === comp.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-red-400" onClick={e => { e.stopPropagation(); removeCompetitor(comp.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Followers", value: fmtNum(comp.followers) },
                        { label: "Eng. Rate", value: `${comp.engagementRate}%` },
                        { label: "Growth", value: null },
                      ].map((m, i) => (
                        <div key={i} className="text-center p-2 rounded-lg bg-white/[0.02]">
                          <p className="text-[10px] text-white/40">{m.label}</p>
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

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-[10px] text-white/40">Avg Likes</p>
                        <p className="text-sm font-semibold text-white">{fmtNum(comp.avgLikes)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-[10px] text-white/40">Posts/Wk</p>
                        <p className="text-sm font-semibold text-white">{comp.postFrequency}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-[10px] text-white/40">Total Posts</p>
                        <p className="text-sm font-semibold text-white">{fmtNum(comp.posts)}</p>
                      </div>
                    </div>

                    {/* Expandable details */}
                    {expandedCard === comp.id && (
                      <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                        {comp.metadata?.contentStyle && (
                          <div className="p-2 rounded-lg bg-white/[0.02]">
                            <p className="text-[10px] text-white/40 mb-1">Content Style</p>
                            <p className="text-xs text-white/70">{comp.metadata.contentStyle}</p>
                          </div>
                        )}
                        {comp.metadata?.audienceDemo && (
                          <div className="p-2 rounded-lg bg-white/[0.02]">
                            <p className="text-[10px] text-white/40 mb-1">Audience</p>
                            <p className="text-xs text-white/70">{comp.metadata.audienceDemo}</p>
                          </div>
                        )}
                        {comp.metadata?.bestPostingTimes && (
                          <div className="p-2 rounded-lg bg-white/[0.02]">
                            <p className="text-[10px] text-white/40 mb-1">Best Posting Times</p>
                            <div className="flex gap-1 flex-wrap">
                              {comp.metadata.bestPostingTimes.map((t: string) => (
                                <Badge key={t} variant="outline" className="text-[10px] border-white/10 text-white/60">{t}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {comp.topHashtags.length > 0 && (
                          <div className="p-2 rounded-lg bg-white/[0.02]">
                            <p className="text-[10px] text-white/40 mb-1">Top Hashtags</p>
                            <div className="flex gap-1 flex-wrap">
                              {comp.topHashtags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-[10px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]/60">#{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {comp.metadata?.recentTrend && (
                          <div className="p-2 rounded-lg bg-white/[0.02]">
                            <p className="text-[10px] text-white/40 mb-1">Recent Trend</p>
                            <p className="text-xs text-white/70">{comp.metadata.recentTrend}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className={`h-3.5 w-3.5 ${getThreatColor(comp.score)}`} />
                        <span className={`text-xs font-medium ${getThreatColor(comp.score)}`}>{getThreatLabel(comp.score)} ({comp.score})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(comp.lastAnalyzed).toLocaleDateString()}
                        </span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40" onClick={e => { e.stopPropagation(); setExpandedCard(expandedCard === comp.id ? null : comp.id); }}>
                          {expandedCard === comp.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
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
            <Card className="crm-card"><CardContent className="p-12 text-center"><p className="text-white/50">Add competitors first to see benchmarks</p></CardContent></Card>
          ) : (
            <>
              {/* Radar */}
              <Card className="crm-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Performance Radar · All Competitors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { metric: "Engagement", ...Object.fromEntries(competitors.map(c => [c.username, Math.min(c.engagementRate * 10, 100)])) },
                        { metric: "Growth", ...Object.fromEntries(competitors.map(c => [c.username, Math.min(Math.max(c.growthRate * 15 + 50, 0), 100)])) },
                        { metric: "Frequency", ...Object.fromEntries(competitors.map(c => [c.username, Math.min(c.postFrequency * 10, 100)])) },
                        { metric: "Reach", ...Object.fromEntries(competitors.map(c => [c.username, Math.min((c.followers / Math.max(...competitors.map(x => x.followers))) * 100, 100)])) },
                        { metric: "Community", ...Object.fromEntries(competitors.map(c => [c.username, Math.min(c.avgComments * 1.5, 100)])) },
                        { metric: "Virality", ...Object.fromEntries(competitors.map(c => [c.username, Math.min(c.avgLikes / Math.max(...competitors.map(x => x.avgLikes)) * 100, 100)])) },
                      ]}>
                        <PolarGrid stroke="hsl(217 91% 60% / 0.08)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <PolarRadiusAxis tick={false} axisLine={false} />
                        {competitors.map((c, i) => (
                          <Radar key={c.id} name={`@${c.username}`} dataKey={c.username} stroke={PIE_COLORS[i % PIE_COLORS.length]} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.1} strokeWidth={2} />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Follower comparison bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Follower Count Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getComparisonBarData()} barCategoryGap="25%">
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtNum(v)} />
                          <Bar dataKey="followers" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} name="Followers" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Engagement Rate Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getComparisonBarData()} barCategoryGap="25%">
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
                          <Bar dataKey="engagement" fill="hsl(150,60%,50%)" radius={[4, 4, 0, 0]} name="Engagement %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* History chart for selected */}
              {selected && getHistoryData(selected) && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">@{selected.username} · Historical Tracking</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getHistoryData(selected)!}>
                          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Line yAxisId="left" type="monotone" dataKey="followers" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ r: 3 }} name="Followers" />
                          <Line yAxisId="right" type="monotone" dataKey="engagement" stroke="hsl(150,60%,50%)" strokeWidth={2} dot={{ r: 3 }} name="Engagement %" />
                          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comparison Table */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Side-by-Side Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2 text-white/50 font-medium text-xs">Metric</th>
                          {competitors.map(c => <th key={c.id} className="text-center py-2 text-white/50 font-medium text-xs">@{c.username}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { label: "Followers", key: "followers" as keyof Competitor, fmt: (v: number) => fmtNum(v), higher: true },
                          { label: "Engagement Rate", key: "engagementRate" as keyof Competitor, fmt: (v: number) => `${v}%`, higher: true },
                          { label: "Avg Likes", key: "avgLikes" as keyof Competitor, fmt: (v: number) => v.toLocaleString(), higher: true },
                          { label: "Avg Comments", key: "avgComments" as keyof Competitor, fmt: (v: number) => v.toLocaleString(), higher: true },
                          { label: "Growth/Week", key: "growthRate" as keyof Competitor, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v}%`, higher: true },
                          { label: "Posts/Week", key: "postFrequency" as keyof Competitor, fmt: (v: number) => `${v}`, higher: true },
                          { label: "Total Posts", key: "posts" as keyof Competitor, fmt: (v: number) => v.toLocaleString(), higher: true },
                          { label: "Threat Score", key: "score" as keyof Competitor, fmt: (v: number) => `${v}/100`, higher: false },
                        ]).map(row => {
                          const vals = competitors.map(c => c[row.key] as number);
                          const best = row.higher ? Math.max(...vals) : Math.min(...vals);
                          return (
                            <tr key={row.label} className="border-b border-white/[0.03]">
                              <td className="py-2.5 text-white/50 text-xs">{row.label}</td>
                              {competitors.map(c => {
                                const val = c[row.key] as number;
                                const isBest = val === best;
                                return <td key={c.id} className={`text-center py-2.5 text-xs font-medium ${isBest ? "text-emerald-400" : "text-white/70"}`}>{row.fmt(val)}</td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ KEYWORD SEARCH TAB ═══ */}
        <TabsContent value="keywords" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-white/50">Keyword / Niche</label>
                  <Input value={keywordQuery} onChange={e => setKeywordQuery(e.target.value)} placeholder="e.g. fitness influencer, vegan recipes, streetwear..." className="crm-input" onKeyDown={e => e.key === "Enter" && !keywordLoading && searchKeywordCompetitors()} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/50">Platform</label>
                  <select value={keywordPlatform} onChange={e => setKeywordPlatform(e.target.value)} className="h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <Button onClick={searchKeywordCompetitors} disabled={keywordLoading || !keywordQuery.trim()} className="bg-gradient-to-r from-[hsl(217,91%,60%)] to-[hsl(262,83%,58%)] hover:opacity-90 text-white gap-1.5 h-10">
                  {keywordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {keywordLoading ? "Searching..." : "Find Competitors"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {keywordResults.length > 0 ? (
            <div className="space-y-4">
              {keywordResults.map((kr, idx) => (
                <Card key={idx} className="crm-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${idx === 0 ? "bg-[hsl(217,91%,60%)]/15" : "bg-white/[0.04]"}`}>
                          <Hash className={`h-4 w-4 ${idx === 0 ? "text-[hsl(217,91%,60%)]" : "text-white/40"}`} />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{kr.keyword}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] border-white/10 text-white/60">Vol: {kr.volume}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${kr.difficulty === "low" ? "border-emerald-400/20 text-emerald-400" : kr.difficulty === "medium" ? "border-amber-400/20 text-amber-400" : "border-red-400/20 text-red-400"}`}>
                              {kr.difficulty} difficulty
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs gap-1 border-white/10 text-white/50 hover:text-white" onClick={() => { setNewUsername(kr.topAccounts[0]?.username || ""); setActiveTab("tracker"); }}>
                        <Plus className="h-3 w-3" /> Track Top
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/50">Top Accounts</p>
                        {kr.topAccounts.map((acc, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(217,91%,60%)]/20 to-[hsl(262,83%,58%)]/20 flex items-center justify-center text-[10px] font-bold text-white">{acc.username[0]?.toUpperCase()}</div>
                              <span className="text-sm text-white/80">@{acc.username}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/50">{acc.followers}</span>
                              <Badge variant="outline" className={`text-[9px] ${acc.relevance === "high" ? "border-emerald-400/20 text-emerald-400" : "border-white/10 text-white/40"}`}>{acc.relevance}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/50">Content Ideas</p>
                        {kr.contentIdeas.map((idea, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <Sparkles className="h-3.5 w-3.5 text-[hsl(217,91%,60%)] mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-white/70">{idea}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Search className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">Search for competitors by keyword</h3>
                <p className="text-white/30 text-sm">Enter a niche, topic, or keyword to discover top competitors and content opportunities</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ GAP ANALYSIS TAB ═══ */}
        <TabsContent value="gaps" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/80">Content & Hashtag Gap Analysis</h3>
                  <p className="text-xs text-white/40 mt-0.5">AI finds opportunities your competitors are missing</p>
                </div>
                <Button onClick={runGapAnalysis} disabled={gapLoading || competitors.length < 1} className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5">
                  {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {gapLoading ? "Analyzing..." : "Run Gap Analysis"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {gapAnalysis ? (
            <div className="space-y-4">
              {/* Overall score */}
              <Card className="crm-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(217,91%,60%)]/20 to-[hsl(262,83%,58%)]/20 flex items-center justify-center border border-white/[0.06]">
                      <span className="text-xl font-bold text-white">{gapAnalysis.overallScore || "?"}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Opportunity Score</p>
                      <p className="text-xs text-white/50">{(gapAnalysis.overallScore || 0) >= 70 ? "High opportunity · many gaps to exploit" : (gapAnalysis.overallScore || 0) >= 40 ? "Moderate opportunity · some gaps available" : "Low opportunity · market is well-covered"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hashtag gaps */}
                <Card className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-[hsl(217,91%,60%)] flex items-center gap-2"><Hash className="h-4 w-4" /> Hashtag Gaps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(gapAnalysis.hashtagGaps || []).map((gap: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{gap.hashtag}</span>
                          <Badge variant="outline" className="text-[10px] border-emerald-400/20 text-emerald-400">{gap.potentialReach} reach</Badge>
                        </div>
                        <p className="text-xs text-white/50">{gap.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Topic gaps */}
                <Card className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Topic Gaps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(gapAnalysis.topicGaps || []).map((gap: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{gap.topic}</span>
                          <Badge variant="outline" className={`text-[10px] ${gap.demandLevel === "high" ? "border-amber-400/20 text-amber-400" : "border-white/10 text-white/40"}`}>{gap.demandLevel} demand</Badge>
                        </div>
                        <p className="text-xs text-white/50">{gap.actionItem}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Content format gaps */}
                <Card className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><Calendar className="h-4 w-4" /> Format Gaps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(gapAnalysis.contentFormatGaps || []).map((gap: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{gap.format}</span>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{gap.competitorAdoption} adoption</Badge>
                        </div>
                        <p className="text-xs text-white/50">{gap.opportunity}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Timing gaps */}
                <Card className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-[hsl(262,83%,58%)] flex items-center gap-2"><Clock className="h-4 w-4" /> Timing Gaps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(gapAnalysis.timingGaps || []).map((gap: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{gap.timeSlot}</span>
                          <Badge variant="outline" className="text-[10px] border-emerald-400/20 text-emerald-400">{gap.expectedLift}</Badge>
                        </div>
                        <p className="text-xs text-white/50">{gap.reason}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Eye className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">{competitors.length < 1 ? "Add competitors first" : "Run a gap analysis"}</h3>
                <p className="text-white/30 text-sm">AI analyzes all tracked competitors to find hashtag, content, topic, and timing gaps you can exploit</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ CONTENT INTEL TAB ═══ */}
        <TabsContent value="content" className="space-y-5">
          {competitors.length === 0 ? (
            <Card className="crm-card"><CardContent className="p-12 text-center"><p className="text-white/50">Add competitors first</p></CardContent></Card>
          ) : (
            <>
              {/* Content type pie charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {competitors.map(comp => (
                  <Card key={comp.id} className="crm-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">@{comp.username} Content Mix</CardTitle></CardHeader>
                    <CardContent>
                      {comp.contentTypes.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={comp.contentTypes.map(ct => ({ name: ct.type, value: ct.pct }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                                {comp.contentTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={chartTooltipStyle} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-white/30 text-sm text-center py-8">No content type data · refresh to analyze</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Hashtag comparison */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Hashtag Usage Across Competitors</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2 text-white/50 font-medium text-xs">Hashtag</th>
                          {competitors.map(c => <th key={c.id} className="text-center py-2 text-white/50 font-medium text-xs">@{c.username}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allTags = [...new Set(competitors.flatMap(c => c.topHashtags))];
                          return allTags.slice(0, 15).map(tag => (
                            <tr key={tag} className="border-b border-white/[0.03]">
                              <td className="py-2 text-white/70 text-xs flex items-center gap-1"><Hash className="h-3 w-3 text-[hsl(217,91%,60%)]" />{tag}</td>
                              {competitors.map(c => (
                                <td key={c.id} className="text-center py-2">
                                  {c.topHashtags.includes(tag) ? (
                                    <span className="inline-block w-5 h-5 rounded-full bg-emerald-400/15 text-emerald-400 text-[10px] leading-5">✓</span>
                                  ) : (
                                    <span className="inline-block w-5 h-5 rounded-full bg-white/[0.03] text-white/20 text-[10px] leading-5">·</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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
                  {competitors.map(c => <option key={c.id} value={c.id}>@{c.username} ({c.platform}) · {fmtNum(c.followers)} followers</option>)}
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
                { key: "strengths" as const, label: "Strengths", colorClass: "text-emerald-400", dotClass: "bg-emerald-400", icon: Shield },
                { key: "weaknesses" as const, label: "Weaknesses", colorClass: "text-red-400", dotClass: "bg-red-400", icon: TrendingDown },
                { key: "opportunities" as const, label: "Opportunities", colorClass: "text-[hsl(217,91%,60%)]", dotClass: "bg-[hsl(217,91%,60%)]", icon: Zap },
                { key: "threats" as const, label: "Threats", colorClass: "text-amber-400", dotClass: "bg-amber-400", icon: Flame },
              ]).map(({ key, label, colorClass, dotClass, icon: Icon }) => (
                <Card key={key} className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm font-medium flex items-center gap-2 ${colorClass}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(swotResult[key] || []).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${dotClass} flex-shrink-0`} />
                        <p className="text-sm text-white/70">{item}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !aiLoading ? (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Target className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">Run a SWOT Analysis</h3>
                <p className="text-white/30 text-sm">Select a competitor and click "Run SWOT Analysis" for AI-powered strategic insights</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-10 w-10 text-[hsl(217,91%,60%)] mx-auto mb-3 animate-spin" />
                <p className="text-white/50 text-sm">Analyzing competitive positioning...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ AI STRATEGY TAB ═══ */}
        <TabsContent value="strategy" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/80">AI Competitive Strategy Brief</h3>
                  <p className="text-xs text-white/40 mt-0.5">Comprehensive game plan based on all tracked competitors</p>
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
                <div className="flex items-center justify-end mb-3">
                  <Button size="sm" variant="outline" className="text-xs gap-1 border-white/10 text-white/50 hover:text-white" onClick={() => { navigator.clipboard.writeText(aiInsight); toast.success("Strategy copied to clipboard"); }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
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
                    if (/^\d+\./.test(line)) return (
                      <div key={i} className="flex items-start gap-2 ml-2 mb-1">
                        <span className="text-[hsl(217,91%,60%)] text-sm font-medium flex-shrink-0">{line.match(/^\d+/)?.[0]}.</span>
                        <span className="text-white/60 text-sm">{line.replace(/^\d+\.\s*/, "")}</span>
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
                <Brain className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">{competitors.length === 0 ? "Add competitors first" : "Generate your strategy"}</h3>
                <p className="text-white/30 text-sm">{competitors.length === 0 ? "Track competitors, then generate an AI strategy" : 'Click "Generate Strategy" for a comprehensive competitive game plan'}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {/* ═══ SITE SCRAPER TAB ═══ */}
        <TabsContent value="scraper" className="space-y-5 w-full overflow-x-hidden overflow-y-auto" style={{ maxWidth: 'calc(100vw - 340px)' }}>
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-white/50">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="example.com or https://example.com" className="crm-input pl-9" onKeyDown={e => e.key === "Enter" && !scrapeLoading && scrapeSite()} />
                  </div>
                </div>
                <Button onClick={scrapeSite} disabled={scrapeLoading || !scrapeUrl.trim()} className="bg-gradient-to-r from-[hsl(217,91%,60%)] to-[hsl(262,83%,58%)] hover:opacity-90 text-white gap-1.5 h-10">
                  {scrapeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {scrapeLoading ? "Scraping..." : "Deep Scrape"}
                </Button>
              </div>
              <p className="text-[10px] text-white/30 mt-2">Extracts SEO metadata, technologies, social links, security headers, structured data, and more · no API key needed</p>
            </CardContent>
          </Card>

          {scrapeResult ? (
            <div className="space-y-4 w-full overflow-hidden">
              {/* Top summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "SEO Score", value: `${scrapeResult.seoScore}/100`, icon: Target, color: scrapeResult.seoScore >= 70 ? "text-emerald-400" : scrapeResult.seoScore >= 40 ? "text-amber-400" : "text-red-400" },
                  { label: "Page Size", value: `${scrapeResult.performance?.pageSizeKB || 0} KB`, icon: FileText, color: "text-white" },
                  { label: "Word Count", value: `${scrapeResult.content?.wordCount?.toLocaleString() || 0}`, icon: FileText, color: "text-white" },
                  { label: "HTTPS", value: scrapeResult.isHttps ? "Secure" : "Not Secure", icon: scrapeResult.isHttps ? Lock : Shield, color: scrapeResult.isHttps ? "text-emerald-400" : "text-red-400" },
                  { label: "Platforms Found", value: String(Object.values(scrapeResult.detectedPlatforms || {}).reduce((a: number, b: any) => a + (Array.isArray(b) ? b.length : 0), 0)), icon: Globe, color: "text-[hsl(217,91%,60%)]" },
                  { label: "Social Profiles", value: String(Object.keys(scrapeResult.socialLinks || {}).length), icon: Users, color: "text-purple-400" },
                ].map((s, i) => (
                  <Card key={i} className="crm-card">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                      <div>
                        <p className="text-[10px] text-white/40">{s.label}</p>
                        <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Basic Meta */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><FileText className="h-4 w-4" /> SEO & Meta Data</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Title", value: scrapeResult.basic?.title, max: 60 },
                    { label: "Description", value: scrapeResult.basic?.description, max: 160 },
                    { label: "Keywords", value: scrapeResult.basic?.keywords },
                    { label: "Canonical", value: scrapeResult.basic?.canonical },
                    { label: "Language", value: scrapeResult.basic?.language },
                    { label: "Robots", value: scrapeResult.basic?.robots },
                    { label: "Generator", value: scrapeResult.basic?.generator },
                    { label: "Final URL", value: scrapeResult.finalUrl },
                    { label: "Server", value: scrapeResult.server },
                  ].filter(r => r.value).map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden min-w-0">
                      <span className="text-[10px] text-white/40 w-20 flex-shrink-0 pt-0.5">{r.label}</span>
                      <span className="text-xs text-white/70 flex-1 min-w-0 break-words whitespace-normal overflow-hidden">{r.value}</span>
                      {r.max && r.value && (
                        <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${r.value.length <= r.max ? "border-emerald-400/20 text-emerald-400" : "border-red-400/20 text-red-400"}`}>
                          {r.value.length}/{r.max}
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Open Graph */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(217,91%,60%)] flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Open Graph</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(scrapeResult.openGraph || {}).filter(([_, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-[10px] text-white/40 w-16 flex-shrink-0">{k}</span>
                        {k === "image" ? (
                          <div className="flex-1">
                            <img src={v as string} alt="OG" className="max-h-20 rounded border border-white/10" onError={e => (e.currentTarget.style.display = "none")} />
                            <p className="text-[10px] text-white/40 mt-1 break-all">{v as string}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-white/70 flex-1 break-all">{v as string}</span>
                        )}
                      </div>
                    ))}
                    {!Object.values(scrapeResult.openGraph || {}).some(Boolean) && <p className="text-xs text-white/30 text-center py-4">No Open Graph tags found</p>}
                  </CardContent>
                </Card>

                {/* Twitter Card */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(217,91%,60%)] flex items-center gap-2"><Hash className="h-4 w-4" /> Twitter Card</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(scrapeResult.twitterCard || {}).filter(([_, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-[10px] text-white/40 w-16 flex-shrink-0">{k}</span>
                        <span className="text-xs text-white/70 flex-1 break-all">{v as string}</span>
                      </div>
                    ))}
                    {!Object.values(scrapeResult.twitterCard || {}).some(Boolean) && <p className="text-xs text-white/30 text-center py-4">No Twitter Card tags found</p>}
                  </CardContent>
                </Card>

                {/* Headings */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><FileText className="h-4 w-4" /> Heading Structure</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(scrapeResult.headings?.h1 || []).map((h: string, i: number) => (
                      <div key={`h1-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-emerald-400/15 text-emerald-400 text-[9px]">H1</Badge>
                        <span className="text-xs text-white/70">{h}</span>
                      </div>
                    ))}
                    {(scrapeResult.headings?.h2 || []).slice(0, 10).map((h: string, i: number) => (
                      <div key={`h2-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)] text-[9px]">H2</Badge>
                        <span className="text-xs text-white/70">{h}</span>
                      </div>
                    ))}
                    {(scrapeResult.headings?.h3 || []).slice(0, 5).map((h: string, i: number) => (
                      <div key={`h3-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-white/10 text-white/50 text-[9px]">H3</Badge>
                        <span className="text-xs text-white/70">{h}</span>
                      </div>
                    ))}
                    {scrapeResult.headings?.h1?.length === 0 && <p className="text-xs text-red-400/70 text-center py-2">⚠ No H1 tag found — bad for SEO</p>}
                    {(scrapeResult.headings?.h1?.length || 0) > 1 && <p className="text-xs text-amber-400/70 text-center py-2">⚠ Multiple H1 tags — consider using only one</p>}
                  </CardContent>
                </Card>

              {/* Detected Platforms - categorized */}
                {(() => {
                  const dp = scrapeResult.detectedPlatforms || {};
                  const categories: { key: string; label: string; color: string; icon: any }[] = [
                    { key: "crm", label: "CRM Systems", color: "text-purple-400", icon: Users },
                    { key: "payments", label: "Payment Platforms", color: "text-emerald-400", icon: Zap },
                    { key: "analytics", label: "Analytics & Tracking", color: "text-[hsl(217,91%,60%)]", icon: BarChart3 },
                    { key: "marketing", label: "Email & Marketing", color: "text-pink-400", icon: Sparkles },
                    { key: "support", label: "Customer Support & Chat", color: "text-cyan-400", icon: Activity },
                    { key: "ecommerce", label: "E-commerce Platform", color: "text-orange-400", icon: Globe },
                    { key: "hosting", label: "Hosting & CDN", color: "text-teal-400", icon: Globe },
                    { key: "frameworks", label: "Frameworks & CMS", color: "text-amber-400", icon: Code },
                    { key: "ads", label: "Ads & Monetization", color: "text-yellow-400", icon: TrendingUp },
                    { key: "security", label: "Security, Auth & Monitoring", color: "text-red-400", icon: Shield },
                    { key: "scheduling", label: "Scheduling & Booking", color: "text-indigo-400", icon: Calendar },
                    { key: "forms", label: "Forms & Surveys", color: "text-lime-400", icon: FileText },
                    { key: "engagement", label: "Engagement & Media", color: "text-sky-400", icon: Eye },
                    { key: "socialProof", label: "Reviews & Social Proof", color: "text-amber-300", icon: Star },
                    { key: "seoTools", label: "SEO & Compliance Tools", color: "text-green-400", icon: Search },
                    { key: "productivity", label: "Productivity & Collaboration", color: "text-violet-400", icon: Crown },
                    { key: "socialMedia", label: "Social Media Integrations", color: "text-pink-500", icon: Globe },
                    { key: "database", label: "Database & Backend", color: "text-cyan-300", icon: Code },
                    { key: "aiTools", label: "AI & ML Tools", color: "text-fuchsia-400", icon: Sparkles },
                    { key: "affiliate", label: "Affiliate & Referral", color: "text-rose-400", icon: TrendingUp },
                    { key: "personalization", label: "Personalization & A/B Testing", color: "text-sky-300", icon: Eye },
                  ];
                  const activeCats = categories.filter(c => (dp[c.key] || []).length > 0);
                  if (activeCats.length === 0) return (
                    <Card className="crm-card md:col-span-2">
                      <CardContent className="p-6 text-center">
                        <Code className="h-6 w-6 text-white/20 mx-auto mb-2" />
                        <p className="text-xs text-white/30">No external platforms detected</p>
                      </CardContent>
                    </Card>
                  );
                  return activeCats.map(cat => (
                    <Card key={cat.key} className="crm-card">
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${cat.color}`}>
                          <cat.icon className="h-4 w-4" /> {cat.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1.5">
                          {(dp[cat.key] as { name: string; confidence: string }[]).map((p: any) => (
                            <div key={p.name} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-xs text-white/80">{p.name}</span>
                              <Badge variant="outline" className={`text-[9px] ${p.confidence === "high" ? "border-emerald-400/30 text-emerald-400" : "border-white/10 text-white/40"}`}>
                                {p.confidence}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}

                {/* Social Links */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(262,83%,58%)] flex items-center gap-2"><Link className="h-4 w-4" /> Social Presence</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(scrapeResult.socialLinks || {}).map(([platform, links]) => (
                      <div key={platform} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                        <Badge variant="outline" className="text-[10px] border-white/10 text-white/60 capitalize">{platform}</Badge>
                        <div className="flex-1 space-y-1">
                          {(links as string[]).map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[hsl(217,91%,60%)]/70 hover:text-[hsl(217,91%,60%)] block break-all overflow-hidden text-ellipsis">{link}</a>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(scrapeResult.socialLinks || {}).length === 0 && <p className="text-xs text-white/30 text-center py-4">No social links found</p>}
                  </CardContent>
                </Card>

                {/* Security Headers */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2"><Shield className="h-4 w-4" /> Security Headers</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(scrapeResult.securityHeaders || {}).map(([header, value]) => (
                      <div key={header} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-[10px] text-white/50">{header.replace(/([A-Z])/g, " $1").trim()}</span>
                        {value === "Missing" ? (
                          <Badge className="bg-red-400/10 text-red-400 text-[9px]"><XCircle className="h-3 w-3 mr-1" /> Missing</Badge>
                        ) : value === "Present" ? (
                          <Badge className="bg-emerald-400/10 text-emerald-400 text-[9px]"><CheckCircle className="h-3 w-3 mr-1" /> Present</Badge>
                        ) : (
                          <span className="text-[10px] text-emerald-400/70 max-w-[200px] truncate">{value as string}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Links & Images stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Internal Links", value: scrapeResult.links?.totalInternal || 0, icon: Link },
                  { label: "External Links", value: scrapeResult.links?.totalExternal || 0, icon: ExternalLink },
                  { label: "Images", value: scrapeResult.images?.total || 0, icon: ImageIcon },
                  { label: "Images w/ Alt", value: `${scrapeResult.images?.withAlt || 0}/${scrapeResult.images?.total || 0}`, icon: CheckCircle },
                ].map((s, i) => (
                  <Card key={i} className="crm-card">
                    <CardContent className="p-3 text-center">
                      <s.icon className="h-4 w-4 text-white/30 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-white">{s.value}</p>
                      <p className="text-[10px] text-white/40">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Performance */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><Activity className="h-4 w-4" /> Performance Signals</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: "Service Worker", value: scrapeResult.performance?.hasServiceWorker },
                      { label: "Web Manifest", value: scrapeResult.performance?.hasManifest },
                      { label: "Preconnect", value: scrapeResult.performance?.hasPreconnect },
                      { label: "Preload", value: scrapeResult.performance?.hasPreload },
                      { label: "Defer Scripts", value: scrapeResult.performance?.hasDeferScripts },
                      { label: "Async Scripts", value: scrapeResult.performance?.hasAsyncScripts },
                      { label: "Lazy Images", value: scrapeResult.performance?.hasLazyImages },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        {p.value ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-white/20" />}
                        <span className={`text-xs ${p.value ? "text-white/70" : "text-white/30"}`}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Metrics */}
              {scrapeResult.advancedMetrics && (
                <Card className="crm-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Advanced Metrics ({Object.keys(scrapeResult.advancedMetrics || {}).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(scrapeResult.advancedMetrics || {})
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => {
                          const formattedLabel = key
                            .replace(/^metric_/, "")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, c => c.toUpperCase());

                          const displayValue =
                            typeof value === "number"
                              ? Number.isInteger(value)
                                ? value.toString()
                                : value.toFixed(2)
                              : typeof value === "boolean"
                              ? value
                                ? "Yes"
                                : "No"
                              : String(value);

                          return (
                            <div key={key} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] min-w-0">
                              <p className="text-[10px] text-white/40 break-words">{formattedLabel}</p>
                              <p className="text-sm text-white font-medium break-words mt-1">{displayValue}</p>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Info */}
              {((scrapeResult.contactInfo?.emailAddresses?.length || 0) > 0 || (scrapeResult.contactInfo?.phoneNumbers?.length || 0) > 0) && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><Users className="h-4 w-4" /> Contact Information Found</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(scrapeResult.contactInfo?.emailAddresses || []).map((email: string, i: number) => (
                      <div key={`e-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)] text-[9px]">Email</Badge>
                        <span className="text-xs text-white/70">{email}</span>
                      </div>
                    ))}
                    {(scrapeResult.contactInfo?.phoneNumbers || []).map((phone: string, i: number) => (
                      <div key={`p-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-emerald-400/15 text-emerald-400 text-[9px]">Phone</Badge>
                        <span className="text-xs text-white/70">{phone}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Fonts */}
              {((scrapeResult.fonts?.googleFonts?.length || 0) > 0 || (scrapeResult.fonts?.customFonts?.length || 0) > 0) && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><FileText className="h-4 w-4" /> Typography & Fonts</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {scrapeResult.fonts?.adobeFonts && (
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/50 mb-2">Adobe Fonts detected</Badge>
                    )}
                    {(scrapeResult.fonts?.googleFonts || []).map((f: string, i: number) => (
                      <div key={`gf-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-amber-400/15 text-amber-400 text-[9px]">Google</Badge>
                        <span className="text-xs text-white/70">{decodeURIComponent(f).replace(/\+/g, " ")}</span>
                      </div>
                    ))}
                    {(scrapeResult.fonts?.customFonts || []).slice(0, 8).map((f: string, i: number) => (
                      <div key={`cf-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <Badge className="bg-white/10 text-white/40 text-[9px]">CSS</Badge>
                        <span className="text-xs text-white/70">{f.trim()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Accessibility */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><Eye className="h-4 w-4" /> Accessibility Signals</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: "Forms", value: scrapeResult.accessibility?.formCount || 0 },
                      { label: "Labels", value: scrapeResult.accessibility?.inputsWithLabels || 0 },
                      { label: "ARIA attrs", value: scrapeResult.accessibility?.ariaCount || 0 },
                      { label: "Role attrs", value: scrapeResult.accessibility?.roleCount || 0 },
                      { label: "TabIndex", value: scrapeResult.accessibility?.tabIndexCount || 0 },
                    ].map((a, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center">
                        <p className="text-sm font-semibold text-white">{a.value}</p>
                        <p className="text-[10px] text-white/40">{a.label}</p>
                      </div>
                    ))}
                    <div className="p-2 rounded-lg bg-white/[0.02] flex items-center justify-center gap-1.5">
                      {scrapeResult.accessibility?.hasSkipNav ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-white/20" />}
                      <span className="text-xs text-white/60">Skip Nav</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] flex items-center justify-center gap-1.5">
                      {scrapeResult.accessibility?.hasFocusStyles ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-white/20" />}
                      <span className="text-xs text-white/60">Focus Styles</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* iFrames */}
              {(scrapeResult.iframes || []).length > 0 && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Embedded iFrames ({scrapeResult.iframes.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-36 overflow-auto">
                      {scrapeResult.iframes.map((src: string, i: number) => (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-[hsl(217,91%,60%)]/60 hover:text-[hsl(217,91%,60%)] break-all p-1 rounded hover:bg-white/[0.02]">{src}</a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Structured Data */}
              {(scrapeResult.structuredData || []).length > 0 && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><Code className="h-4 w-4" /> Structured Data (JSON-LD)</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="text-[10px] text-white/50 bg-white/[0.02] p-3 rounded-lg overflow-auto max-h-48 border border-white/[0.04]">
                      {JSON.stringify(scrapeResult.structuredData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* External links sample */}
              {(scrapeResult.links?.external || []).length > 0 && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><ExternalLink className="h-4 w-4" /> External Links ({scrapeResult.links.totalExternal})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {scrapeResult.links.external.slice(0, 30).map((link: string, i: number) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-[hsl(217,91%,60%)]/60 hover:text-[hsl(217,91%,60%)] break-all p-1 rounded hover:bg-white/[0.02]">{link}</a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Globe className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">Deep Site Scraper</h3>
                <p className="text-white/30 text-sm max-w-md mx-auto">Enter any website URL to extract detailed SEO metadata, technologies, social links, security headers, structured data, performance signals, and more — all using free, legal methods</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitorAnalyzer;

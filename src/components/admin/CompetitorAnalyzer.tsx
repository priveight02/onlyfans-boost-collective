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
  DollarSign, TrendingUp as TrendUp,
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

// AI helper - calls dedicated competitor-analyze edge function with server-side rate limiting
const RATE_LIMIT_MAX = 20;

const checkAIUsage = async (): Promise<{ count: number; limited: boolean }> => {
  try {
    const { data, error } = await supabase.functions.invoke("competitor-analyze", {
      body: { action: "check_usage" },
    });
    if (error) return { count: 0, limited: false };
    return { count: data?.count || 0, limited: data?.limited || false };
  } catch { return { count: 0, limited: false }; }
};

const callAI = async (prompt: string, analysisType?: string): Promise<any> => {
  const { data, error } = await supabase.functions.invoke("competitor-analyze", {
    body: { prompt, analysisType },
  });
  if (error) {
    // Check if it's a rate limit error from the edge function
    if (error.message?.includes("limit")) throw new Error("Daily AI analysis limit reached (20/day). AI-powered fields will be left blank until reset.");
    throw new Error(error.message || "AI request failed");
  }
  if (data?.limited) throw new Error("Daily AI analysis limit reached (20/day). AI-powered fields will be left blank until reset.");
  if (!data?.reply) throw new Error("No AI response received");
  return data.reply;
};

const extractBalancedJson = (text: string): string | null => {
  const start = text.search(/[\[{]/);
  if (start === -1) return null;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }

    if (ch === "}" || ch === "]") {
      const last = stack[stack.length - 1];
      if ((ch === "}" && last === "{") || (ch === "]" && last === "[")) {
        stack.pop();
        if (stack.length === 0) return text.slice(start, i + 1);
      }
    }
  }

  return text.slice(start);
};

const detectTruncation = (text: string): boolean => {
  const normalized = text.trim();
  const openBraces = (normalized.match(/\{/g) || []).length;
  const closeBraces = (normalized.match(/\}/g) || []).length;
  const openBrackets = (normalized.match(/\[/g) || []).length;
  const closeBrackets = (normalized.match(/\]/g) || []).length;

  if (openBraces !== closeBraces || openBrackets !== closeBrackets) return true;
  return [/\.\.\.$/, /…$/, /\[truncated\]/i, /\[continued\]/i].some((pattern) => pattern.test(normalized));
};

const parseJSON = (text: string): any => {
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  const candidate = extractBalancedJson(cleaned);
  if (!candidate) throw new Error("No JSON object or array found in AI response");

  const sanitized = candidate.replace(/[\x00-\x1F\x7F]/g, (ch) => {
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    return "";
  });

  try {
    return JSON.parse(sanitized);
  } catch {
    const repaired = sanitized
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    try {
      return JSON.parse(repaired);
    } catch {
      if (detectTruncation(candidate)) {
        throw new Error("AI response was truncated. Please retry financial analysis.");
      }
      throw new Error("Invalid AI JSON response. Please retry.");
    }
  }
};

const parseJSONArray = (text: string): any[] => {
  const parsed = parseJSON(text);
  if (!Array.isArray(parsed)) throw new Error("No JSON array found in AI response");
  return parsed;
};

const isFinancialPlaceholder = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  const v = String(value).trim().toLowerCase();
  return !v ||
    v === "n/a" ||
    v === "na" ||
    v === "none" ||
    v === "null" ||
    v === "unknown" ||
    v.includes("no current data") ||
    v.includes("not available") ||
    v.includes("unverified") ||
    v.includes("no verified data") ||
    v.includes("not publicly disclosed");
};

const ESTIMATE_WORD_PATTERN = /\b(estimate|estimated|approx|approximately|around|about|projected|forecast|modeled|assumed|inferred)\b/i;

const normalizeFinancialData = (data: any) => {
  const sanitize = (value: any): any => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)]));
    }

    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (isFinancialPlaceholder(trimmed)) return "Not publicly disclosed";
    if (ESTIMATE_WORD_PATTERN.test(trimmed)) return "Not publicly disclosed";
    return trimmed;
  };

  return sanitize(data);
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

  // Site analysis state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [analysisKeywords, setAnalysisKeywords] = useState("");
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [aiUsageCount, setAiUsageCount] = useState(0);

  // Financial intelligence state
  const [financialData, setFinancialData] = useState<any>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  // Deep analysis section expansion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    social: true, platforms: true, deepMetrics: false, security: false, performance: false, sensitive: false, financial: true,
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const { performAction } = useCreditAction();

  // Load competitors on mount & track AI usage
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check server-side AI usage
      const usage = await checkAIUsage();
      setAiUsageCount(usage.count);

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

  // ─── Site Analysis ──────────────────────────────────
  const scrapeSite = async () => {
    if (!scrapeUrl.trim()) return;
    await performAction("site_scrape", async () => {
      setScrapeLoading(true);
      setScrapeResult(null);
      try {
        const { data, error } = await supabase.functions.invoke("site-scraper", {
          body: { url: scrapeUrl.trim(), keywords: analysisKeywords.trim() || undefined },
        });
        if (error) throw new Error(error.message || "Analysis failed");
        if (!data?.success) throw new Error(data?.error || "Analysis failed");
        setScrapeResult({ ...data, analysisKeywords: analysisKeywords.trim() });
        toast.success("Site analyzed successfully");
        return true;
      } catch (err: any) {
        toast.error(err.message || "Analysis failed");
        throw err;
      } finally {
        setScrapeLoading(false);
      }
    });
  };

  // Refresh AI usage count after any AI call (read-only server call)
  const refreshAIUsage = async () => {
    const usage = await checkAIUsage();
    setAiUsageCount(usage.count);
  };

  // ─── Financial Intelligence Analysis ────────────────
  const runFinancialAnalysis = async () => {
    if (!scrapeResult) return;
    await performAction("site_scrape", async () => {
      setFinancialLoading(true);
      try {
        const dp = scrapeResult.detectedPlatforms || {};
        const cm = scrapeResult.curatedMetrics || {};
        const monetization = cm.monetization?.items || {};
        const socialCount = Object.keys(scrapeResult.socialLinks || {}).length;
        const platformCount = Object.values(dp).reduce((a: number, b: any) => a + (Array.isArray(b) ? b.length : 0), 0);

        const keywordsContext = scrapeResult.analysisKeywords ? `\n\nBUSINESS KEYWORDS PROVIDED BY USER: ${scrapeResult.analysisKeywords}\nUse these keywords only for entity matching and niche context.\n` : "";

        const prompt = `Analyze this website/company financially. Today: ${new Date().toISOString().slice(0, 10)}.
${keywordsContext}
WEBSITE: ${scrapeResult.finalUrl || scrapeResult.url}
TITLE: ${scrapeResult.basic?.title || "Unknown"}
DESCRIPTION: ${scrapeResult.basic?.description || "Unknown"}

TECH: Payments: ${(dp.payments || []).map((p: any) => p.name).join(", ") || "None"} | E-commerce: ${(dp.ecommerce || []).map((p: any) => p.name).join(", ") || "None"} | Analytics: ${(dp.analytics || []).map((p: any) => p.name).join(", ") || "None"} | Ads: ${(dp.ads || []).map((p: any) => p.name).join(", ") || "None"}

MONETIZATION: Checkout: ${monetization["Checkout Flow"] || "N/A"} | Subscriptions: ${monetization["Subscription UI"] || "N/A"} | Prices: ${monetization["Price Points"] || 0} | Payments: ${monetization["Payment Providers"] || 0}

METRICS: SEO ${scrapeResult.seoScore}/100 | Words: ${scrapeResult.content?.wordCount || 0} | Social: ${socialCount} | Platforms: ${platformCount}

RULES:
- Use only latest verifiable facts as of today from trusted sources.
- Never estimate, infer, project, or provide guessed ranges.
- Prioritize official filings/reports, company registers/tax records, and trusted traffic datasets.
- Every numeric value must include source + period/date in the value text.
- If unavailable, return "Not publicly disclosed".
- Non-subscription businesses: set mrr/arr/churn to "Not subscription-based"`;

        const aiReply = await callAI(prompt, "financial");
        const parsed = normalizeFinancialData(parseJSON(aiReply));
        setFinancialData(parsed);
        await refreshAIUsage();
        toast.success("Financial intelligence generated");
        return true;
      } catch (err: any) {
        toast.error(err?.message || "Financial analysis failed");
        throw err;
      } finally {
        setFinancialLoading(false);
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
            { value: "analysis", icon: Globe, label: "Site Analysis" },
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
        {/* ═══ SITE ANALYSIS TAB ═══ */}
        <TabsContent value="analysis" className="space-y-5 w-full overflow-x-hidden overflow-y-auto" style={{ maxWidth: 'calc(100vw - 340px)' }}>
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
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-white/50">Business Keywords <span className="text-white/25">(optional — adds AI context)</span></label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input value={analysisKeywords} onChange={e => setAnalysisKeywords(e.target.value)} placeholder="e.g. SaaS, AI marketing, subscription" className="crm-input pl-9" onKeyDown={e => e.key === "Enter" && !scrapeLoading && scrapeSite()} />
                  </div>
                </div>
                <Button onClick={scrapeSite} disabled={scrapeLoading || !scrapeUrl.trim()} className="bg-gradient-to-r from-[hsl(217,91%,60%)] to-[hsl(262,83%,58%)] hover:opacity-90 text-white gap-1.5 h-10">
                  {scrapeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {scrapeLoading ? "Analyzing..." : "Deep Analysis"}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-white/30">Extracts SEO metadata, technologies, social links, security headers, structured data, and more · no API key needed</p>
                <span className="text-[10px] text-white/25">AI calls: {aiUsageCount}/{RATE_LIMIT_MAX} today</span>
              </div>
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
                  { label: "Platforms Found", value: String((Object.values(scrapeResult.detectedPlatforms || {}) as any[]).reduce((a: number, b: any) => a + (Array.isArray(b) ? b.length : 0), 0)), icon: Globe, color: "text-[hsl(217,91%,60%)]" },
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

              {/* SEO & Meta */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><FileText className="h-4 w-4" /> SEO & Meta Data</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Title", value: scrapeResult.basic?.title, max: 60 },
                    { label: "Description", value: scrapeResult.basic?.description, max: 160 },
                    { label: "Keywords", value: scrapeResult.basic?.keywords },
                    { label: "Canonical", value: scrapeResult.basic?.canonical },
                    { label: "Language", value: scrapeResult.basic?.language },
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

              {/* OG Preview */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(217,91%,60%)] flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Open Graph Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                      {/* Twitter card entries inline */}
                      {(() => {
                        const og = scrapeResult.openGraph || {};
                        const twitterEntries = Object.entries(scrapeResult.twitterCard || {}).filter(([k, v]) => {
                          if (!v) return false;
                          if (["title", "description", "image"].includes(k)) {
                            return (og[k as keyof typeof og] || "").toString().trim().toLowerCase() !== String(v).trim().toLowerCase();
                          }
                          return true;
                        });
                        return twitterEntries.map(([k, v]) => (
                          <div key={`tw-${k}`} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                            <span className="text-[10px] text-white/40 w-16 flex-shrink-0">tw:{k}</span>
                            <span className="text-xs text-white/70 flex-1 break-all">{v as string}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/40 mb-1">Live Site Screenshot</p>
                      {scrapeResult.screenshotUrl ? (
                        <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                          <img src={scrapeResult.screenshotUrl} alt="Site screenshot" className="w-full h-auto rounded-lg" loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-white/10 bg-black/20 flex items-center justify-center py-12">
                          <p className="text-xs text-white/30">No screenshot available</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                </CardContent>
              </Card>

              {/* ═══ UNIFIED SOCIAL MEDIA INTELLIGENCE CARD ═══ */}
              <Card className="crm-card">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("social")}>
                  <CardTitle className="text-sm font-medium text-[hsl(262,83%,58%)] flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Social Media Intelligence
                    <Badge variant="outline" className="ml-auto text-[9px] border-white/10 text-white/40">
                      {Object.keys(scrapeResult.socialLinks || {}).length} platforms · {(Object.values(scrapeResult.socialLinks || {}) as any[]).reduce((a: number, b: any) => a + (Array.isArray(b) ? b.length : 0), 0)} links
                    </Badge>
                    {expandedSections.social ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
                  </CardTitle>
                </CardHeader>
                {expandedSections.social && (
                  <CardContent>
                    {Object.keys(scrapeResult.socialLinks || {}).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(scrapeResult.socialLinks || {}).map(([platform, links]) => {
                          const platformIcons: Record<string, string> = {
                            facebook: "🔵", twitter: "🐦", instagram: "📸", linkedin: "💼", youtube: "🎬",
                            tiktok: "🎵", pinterest: "📌", github: "🐙", reddit: "🔴", discord: "💬",
                            telegram: "✈️", whatsapp: "💬", snapchat: "👻", threads: "🧵", mastodon: "🐘",
                            bluesky: "🦋", twitch: "🟣", medium: "📝", dribbble: "🏀", behance: "🎨",
                            spotify: "🎧", soundcloud: "🔊", vimeo: "🎥", tumblr: "📓", flickr: "📷",
                          };
                          return (
                            <div key={platform} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{platformIcons[platform] || "🌐"}</span>
                                <span className="text-xs font-medium text-white/80 capitalize">{platform}</span>
                                <Badge variant="outline" className="ml-auto text-[9px] border-white/10 text-white/40">{(links as string[]).length}</Badge>
                              </div>
                              <div className="space-y-1">
                                {(links as string[]).map((link, i) => {
                                  // Extract handle/username from URL
                                  let handle = "";
                                  try {
                                    const u = new URL(link.startsWith("http") ? link : `https://${link}`);
                                    handle = u.pathname.replace(/^\//, "").split("/")[0] || "";
                                    if (handle.startsWith("@")) handle = handle;
                                    else if (handle) handle = `@${handle}`;
                                  } catch {}
                                  return (
                                    <div key={i} className="flex items-center justify-between">
                                      <a href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[hsl(217,91%,60%)]/70 hover:text-[hsl(217,91%,60%)] break-all overflow-hidden text-ellipsis flex-1">
                                        {link}
                                      </a>
                                      {handle && <Badge variant="outline" className="text-[9px] border-white/10 text-white/50 ml-2 flex-shrink-0">{handle}</Badge>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {/* Contact info inline */}
                        {((scrapeResult.contactInfo?.emailAddresses?.length || 0) > 0 || (scrapeResult.contactInfo?.phoneNumbers?.length || 0) > 0) && (
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📧</span>
                              <span className="text-xs font-medium text-white/80">Contact Info</span>
                            </div>
                            <div className="space-y-1">
                              {(scrapeResult.contactInfo?.emailAddresses || []).map((email: string, i: number) => (
                                <div key={`e-${i}`} className="flex items-center gap-2">
                                  <Badge className="bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)] text-[9px]">Email</Badge>
                                  <span className="text-xs text-white/70">{email}</span>
                                </div>
                              ))}
                              {(scrapeResult.contactInfo?.phoneNumbers || []).map((phone: string, i: number) => (
                                <div key={`p-${i}`} className="flex items-center gap-2">
                                  <Badge className="bg-emerald-400/15 text-emerald-400 text-[9px]">Phone</Badge>
                                  <span className="text-xs text-white/70">{phone}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30 text-center py-4">No social links found</p>
                    )}
                  </CardContent>
                )}
              </Card>

               {/* ═══ DETECTED PLATFORMS - All in one card ═══ */}
               <Card className="crm-card overflow-hidden">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("platforms")}>
                  <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                    <Code className="h-4 w-4" /> Detected Platforms & Tech Stack
                    <Badge variant="outline" className="ml-auto text-[9px] border-white/10 text-white/40">
                      {(Object.values(scrapeResult.detectedPlatforms || {}) as any[]).reduce((a: number, b: any) => a + (Array.isArray(b) ? b.length : 0), 0)} total
                    </Badge>
                    {expandedSections.platforms ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
                  </CardTitle>
                </CardHeader>
                {expandedSections.platforms && (
                  <CardContent className="pt-0">
                    {(() => {
                      const dp = scrapeResult.detectedPlatforms || {};
                      const categoryIcons: Record<string, string> = {
                        crm: "👥", payments: "💳", analytics: "📊", marketing: "📢", support: "🎧",
                        ecommerce: "🛒", hosting: "🖥️", cdn: "🌐", fileStorage: "💾", frameworks: "⚡",
                        ads: "📣", security: "🔒", identityAuth: "🔑", databaseInfra: "🗄️",
                        observability: "📡", backendProviders: "☁️", aiTools: "🤖", socialMedia: "📱",
                        scheduling: "📅", forms: "📝", engagement: "💬", socialProof: "⭐",
                        seoTools: "🔍", productivity: "✅", affiliate: "🤝", personalization: "🎯",
                      };
                      const categoryColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                        crm: { bg: "bg-purple-500/[0.06]", border: "border-purple-500/20", text: "text-purple-400", badge: "border-purple-400/30 text-purple-300 bg-purple-500/10" },
                        payments: { bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/20", text: "text-emerald-400", badge: "border-emerald-400/30 text-emerald-300 bg-emerald-500/10" },
                        analytics: { bg: "bg-blue-500/[0.06]", border: "border-blue-500/20", text: "text-blue-400", badge: "border-blue-400/30 text-blue-300 bg-blue-500/10" },
                        marketing: { bg: "bg-pink-500/[0.06]", border: "border-pink-500/20", text: "text-pink-400", badge: "border-pink-400/30 text-pink-300 bg-pink-500/10" },
                        support: { bg: "bg-cyan-500/[0.06]", border: "border-cyan-500/20", text: "text-cyan-400", badge: "border-cyan-400/30 text-cyan-300 bg-cyan-500/10" },
                        ecommerce: { bg: "bg-orange-500/[0.06]", border: "border-orange-500/20", text: "text-orange-400", badge: "border-orange-400/30 text-orange-300 bg-orange-500/10" },
                        hosting: { bg: "bg-teal-500/[0.06]", border: "border-teal-500/20", text: "text-teal-400", badge: "border-teal-400/30 text-teal-300 bg-teal-500/10" },
                        cdn: { bg: "bg-sky-500/[0.06]", border: "border-sky-500/20", text: "text-sky-400", badge: "border-sky-400/30 text-sky-300 bg-sky-500/10" },
                        fileStorage: { bg: "bg-violet-500/[0.06]", border: "border-violet-500/20", text: "text-violet-400", badge: "border-violet-400/30 text-violet-300 bg-violet-500/10" },
                        frameworks: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", text: "text-amber-400", badge: "border-amber-400/30 text-amber-300 bg-amber-500/10" },
                        ads: { bg: "bg-yellow-500/[0.06]", border: "border-yellow-500/20", text: "text-yellow-400", badge: "border-yellow-400/30 text-yellow-300 bg-yellow-500/10" },
                        security: { bg: "bg-red-500/[0.06]", border: "border-red-500/20", text: "text-red-400", badge: "border-red-400/30 text-red-300 bg-red-500/10" },
                        identityAuth: { bg: "bg-rose-500/[0.06]", border: "border-rose-500/20", text: "text-rose-300", badge: "border-rose-400/30 text-rose-300 bg-rose-500/10" },
                        databaseInfra: { bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/20", text: "text-emerald-300", badge: "border-emerald-400/30 text-emerald-300 bg-emerald-500/10" },
                        observability: { bg: "bg-orange-500/[0.06]", border: "border-orange-500/20", text: "text-orange-300", badge: "border-orange-400/30 text-orange-300 bg-orange-500/10" },
                        backendProviders: { bg: "bg-cyan-500/[0.06]", border: "border-cyan-500/20", text: "text-cyan-300", badge: "border-cyan-400/30 text-cyan-300 bg-cyan-500/10" },
                        aiTools: { bg: "bg-fuchsia-500/[0.06]", border: "border-fuchsia-500/20", text: "text-fuchsia-400", badge: "border-fuchsia-400/30 text-fuchsia-300 bg-fuchsia-500/10" },
                        socialMedia: { bg: "bg-pink-500/[0.06]", border: "border-pink-500/20", text: "text-pink-400", badge: "border-pink-400/30 text-pink-300 bg-pink-500/10" },
                        scheduling: { bg: "bg-indigo-500/[0.06]", border: "border-indigo-500/20", text: "text-indigo-400", badge: "border-indigo-400/30 text-indigo-300 bg-indigo-500/10" },
                        forms: { bg: "bg-lime-500/[0.06]", border: "border-lime-500/20", text: "text-lime-400", badge: "border-lime-400/30 text-lime-300 bg-lime-500/10" },
                        engagement: { bg: "bg-sky-500/[0.06]", border: "border-sky-500/20", text: "text-sky-400", badge: "border-sky-400/30 text-sky-300 bg-sky-500/10" },
                        socialProof: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", text: "text-amber-300", badge: "border-amber-400/30 text-amber-300 bg-amber-500/10" },
                        seoTools: { bg: "bg-green-500/[0.06]", border: "border-green-500/20", text: "text-green-400", badge: "border-green-400/30 text-green-300 bg-green-500/10" },
                        productivity: { bg: "bg-violet-500/[0.06]", border: "border-violet-500/20", text: "text-violet-400", badge: "border-violet-400/30 text-violet-300 bg-violet-500/10" },
                        affiliate: { bg: "bg-rose-500/[0.06]", border: "border-rose-500/20", text: "text-rose-400", badge: "border-rose-400/30 text-rose-300 bg-rose-500/10" },
                        personalization: { bg: "bg-sky-500/[0.06]", border: "border-sky-500/20", text: "text-sky-300", badge: "border-sky-400/30 text-sky-300 bg-sky-500/10" },
                      };
                      const categories: { key: string; label: string }[] = [
                        { key: "crm", label: "CRM" }, { key: "payments", label: "Payments" },
                        { key: "analytics", label: "Analytics" }, { key: "marketing", label: "Marketing" },
                        { key: "support", label: "Support" }, { key: "ecommerce", label: "E-commerce" },
                        { key: "hosting", label: "Hosting" }, { key: "cdn", label: "CDN" },
                        { key: "fileStorage", label: "Storage" }, { key: "frameworks", label: "Frameworks" },
                        { key: "ads", label: "Ads" }, { key: "security", label: "Security" },
                        { key: "identityAuth", label: "Auth" }, { key: "databaseInfra", label: "Database" },
                        { key: "observability", label: "Observability" }, { key: "backendProviders", label: "Backend" },
                        { key: "aiTools", label: "AI/ML" }, { key: "socialMedia", label: "Social APIs" },
                        { key: "scheduling", label: "Scheduling" }, { key: "forms", label: "Forms" },
                        { key: "engagement", label: "Engagement" }, { key: "socialProof", label: "Social Proof" },
                        { key: "seoTools", label: "SEO Tools" }, { key: "productivity", label: "Productivity" },
                        { key: "affiliate", label: "Affiliate" }, { key: "personalization", label: "Personalization" },
                      ];
                      const activeCats = categories.filter(c => ((dp as any)[c.key] || []).length > 0);
                      if (activeCats.length === 0) return <p className="text-xs text-white/30 text-center py-4">No external platforms detected</p>;
                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {activeCats.map(cat => {
                            const providers = ((dp as any)[cat.key] as { name: string; confidence: string }[]) || [];
                            const colors = categoryColors[cat.key] || categoryColors.crm;
                            const icon = categoryIcons[cat.key] || "📦";

                            // Collect all URL sources (safely coerce to arrays)
                            const toArr = (v: unknown): string[] => Array.isArray(v) ? v : [];
                            const allUrls = [
                              ...toArr(scrapeResult?.scripts),
                              ...toArr(scrapeResult?.stylesheets),
                              ...toArr(scrapeResult?.externalLinks),
                              ...toArr(scrapeResult?.iframes),
                            ];

                            // Build signatures from provider names (lowercase domain-like fragments)
                            const providerSigs: Record<string, string[]> = {};
                            for (const p of providers) {
                              const nameLC = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                              const sigs = [nameLC];
                              // Add common domain patterns
                              if (nameLC.length > 2) sigs.push(nameLC + ".com", nameLC + ".io", nameLC + ".co", nameLC + ".net", nameLC + ".org");
                              providerSigs[p.name] = sigs;
                            }

                            // Match URLs to each provider
                            const providerUrls: Record<string, string[]> = {};
                            for (const p of providers) {
                              const sigs = providerSigs[p.name] || [];
                              const matched = allUrls.filter(url => {
                                const urlLC = url.toLowerCase();
                                return sigs.some(sig => urlLC.includes(sig));
                              });
                              if (matched.length > 0) providerUrls[p.name] = [...new Set(matched)];
                            }

                            // Collect all matched URLs for the category
                            const allCategoryUrls = [...new Set(Object.values(providerUrls).flat())];
                            const isExpanded = expandedSections[`platform_${cat.key}`];

                            return (
                              <div key={cat.key} className={`rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm p-3 transition-all hover:shadow-lg`}>
                                <div className="flex items-center gap-2 mb-2.5 cursor-pointer" onClick={() => toggleSection(`platform_${cat.key}`)}>
                                  <span className="text-sm">{icon}</span>
                                  <span className={`text-[11px] font-semibold tracking-wide uppercase ${colors.text}`}>{cat.label}</span>
                                  <span className="ml-auto text-[9px] text-white/30 font-medium bg-white/[0.04] rounded-full px-1.5 py-0.5">{providers.length}</span>
                                  {isExpanded
                                    ? <ChevronUp className="h-3 w-3 text-white/40" />
                                    : <ChevronDown className="h-3 w-3 text-white/40" />
                                  }
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {providers.map((p: any) => (
                                    <span key={p.name} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${colors.badge} transition-colors`}>
                                      {p.confidence === "high" && <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />}
                                      {p.name}
                                      {providerUrls[p.name] && (
                                        <span className="text-[8px] opacity-50 ml-0.5">({providerUrls[p.name].length})</span>
                                      )}
                                    </span>
                                  ))}
                                </div>

                                {/* Expandable URL list per category */}
                                {isExpanded && allCategoryUrls.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-2 max-h-60 overflow-y-auto">
                                    {providers.filter(p => providerUrls[p.name]?.length).map(p => (
                                      <div key={p.name}>
                                        <p className={`text-[10px] font-semibold ${colors.text} mb-1`}>{p.name} URLs ({providerUrls[p.name].length})</p>
                                        <div className="space-y-0.5">
                                          {providerUrls[p.name].map((url, ui) => (
                                            <a
                                              key={ui}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block text-[9px] text-white/40 hover:text-white/70 break-all p-0.5 rounded hover:bg-white/[0.03] transition-colors truncate"
                                              title={url}
                                            >
                                              <ExternalLink className="h-2.5 w-2.5 inline mr-1 shrink-0" />
                                              {url}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {isExpanded && allCategoryUrls.length === 0 && (
                                  <p className="mt-2 text-[9px] text-white/20 italic">Detected via code signatures — no direct URLs matched</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {/* Header-based tech */}
                    {(scrapeResult.headerTechDetections || []).length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">📡</span>
                          <span className="text-[11px] font-semibold tracking-wide uppercase text-cyan-400">Header-based Detections</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(scrapeResult.headerTechDetections as { name: string; source: string }[]).map((t: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                              <span className="h-1 w-1 rounded-full bg-cyan-400 shrink-0" />
                              {t.name} · {t.source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
               </Card>

              {/* ═══ FINANCIAL INTELLIGENCE CARD ═══ */}
              <Card className="crm-card">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("financial")}>
                  <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Financial Intelligence
                    {financialData && <Badge variant="outline" className="text-[9px] border-emerald-400/20 text-emerald-400">Ready</Badge>}
                    {!financialData && (
                      <Button size="sm" variant="outline" className="ml-auto text-xs gap-1 border-green-400/20 text-green-400 hover:bg-green-400/10 h-7"
                        onClick={e => { e.stopPropagation(); runFinancialAnalysis(); }} disabled={financialLoading}>
                        {financialLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {financialLoading ? "Analyzing..." : "Generate"}
                      </Button>
                    )}
                    {expandedSections.financial ? <ChevronUp className="h-3.5 w-3.5 text-white/30 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30 ml-auto" />}
                  </CardTitle>
                </CardHeader>
                {expandedSections.financial && (
                  <CardContent>
                    {financialLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 text-green-400 mx-auto mb-3 animate-spin" />
                        <p className="text-xs text-white/50">Analyzing checkout flow, pricing, traffic & revenue...</p>
                      </div>
                    ) : financialData ? (
                      <div className="space-y-4">
                        {/* Company overview */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {[
                            { label: "Business Model", value: financialData.companyOverview?.businessModel },
                            { label: "Stage", value: financialData.companyOverview?.stage },
                            { label: "Industry", value: financialData.companyOverview?.industry },
                            { label: "Employees", value: financialData.companyOverview?.estimatedEmployees },
                            { label: "Founded", value: financialData.companyOverview?.foundedYear },
                          ].map((item, i) => (
                            <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center">
                              <p className="text-[10px] text-white/40">{item.label}</p>
                              <p className="text-xs font-medium text-white/80">{item.value || "N/A"}</p>
                            </div>
                          ))}
                        </div>

                        {/* Revenue */}
                        <div className="p-3 rounded-lg bg-green-400/5 border border-green-400/10">
                          <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Revenue</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                              { label: "Daily", value: financialData.revenueEstimates?.dailyRevenue },
                              { label: "Weekly", value: financialData.revenueEstimates?.weeklyRevenue },
                              { label: "Monthly", value: financialData.revenueEstimates?.monthlyRevenue },
                              { label: "Yearly", value: financialData.revenueEstimates?.yearlyRevenue },
                            ].map((r, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.03] text-center">
                                <p className="text-[10px] text-white/40">{r.label}</p>
                                <p className="text-sm font-bold text-green-400">{r.value || "N/A"}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                            {[
                              { label: "MRR", value: financialData.revenueEstimates?.mrr },
                              { label: "ARR", value: financialData.revenueEstimates?.arr },
                              { label: "LTV", value: financialData.revenueEstimates?.ltv },
                              { label: "CAC", value: financialData.revenueEstimates?.cac },
                            ].map((r, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.03] text-center">
                                <p className="text-[10px] text-white/40">{r.label}</p>
                                <p className="text-xs font-medium text-white/80">{r.value || "N/A"}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              { label: "Revenue Model", value: financialData.revenueEstimates?.revenueModel },
                              { label: "Avg Order Value", value: financialData.revenueEstimates?.averageOrderValue },
                              { label: "Churn Rate", value: financialData.revenueEstimates?.churnRate },
                            ].map((r, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.03] text-center">
                                <p className="text-[10px] text-white/40">{r.label}</p>
                                <p className="text-xs font-medium text-white/80">{r.value || "N/A"}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Traffic */}
                        <div className="p-3 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/10">
                          <p className="text-xs font-medium text-[hsl(217,91%,60%)] mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Traffic</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                              { label: "Daily", value: financialData.trafficEstimates?.dailyVisitors },
                              { label: "Weekly", value: financialData.trafficEstimates?.weeklyVisitors },
                              { label: "Monthly", value: financialData.trafficEstimates?.monthlyVisitors },
                              { label: "Yearly", value: financialData.trafficEstimates?.yearlyVisitors },
                            ].map((t, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.03] text-center">
                                <p className="text-[10px] text-white/40">{t.label}</p>
                                <p className="text-sm font-bold text-[hsl(217,91%,60%)]">{t.value || "N/A"}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              { label: "Bounce Rate", value: financialData.trafficEstimates?.bounceRate },
                              { label: "Avg Session", value: financialData.trafficEstimates?.avgSessionDuration },
                              { label: "Trend", value: financialData.trafficEstimates?.growthTrend },
                            ].map((t, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.03] text-center">
                                <p className="text-[10px] text-white/40">{t.label}</p>
                                <p className="text-xs font-medium text-white/80">{t.value || "N/A"}</p>
                              </div>
                            ))}
                          </div>
                          {(financialData.trafficEstimates?.topTrafficSources || []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {financialData.trafficEstimates.topTrafficSources.map((s: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-[9px] border-white/10 text-white/50">{s.source}: {s.percentage}</Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Income sources */}
                        {(financialData.incomeSources || []).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-white/50">Income Sources</p>
                            {financialData.incomeSources.map((s: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/80">{s.source}</span>
                                  <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{s.type}</Badge>
                                </div>
                                <span className="text-xs font-medium text-emerald-400">{s.share || s.estimatedShare || "Not publicly disclosed"}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pricing analysis */}
                        {financialData.pricingAnalysis && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-white/50">Pricing Analysis</p>
                            {(financialData.pricingAnalysis.plans || []).map((p: any, i: number) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/80 font-medium">{p.name}</span>
                                  <span className="text-xs text-green-400 font-bold">{p.price} / {p.billing}</span>
                                </div>
                                {p.features && <p className="text-[10px] text-white/40 mt-1">{p.features}</p>}
                              </div>
                            ))}
                            {financialData.pricingAnalysis.upsells && (
                              <div className="p-2 rounded-lg bg-amber-400/5 border border-amber-400/10">
                                <span className="text-[10px] text-amber-400">Upsells: </span>
                                <span className="text-[10px] text-white/60">{financialData.pricingAnalysis.upsells}</span>
                              </div>
                            )}
                            {financialData.pricingAnalysis.crossSells && financialData.pricingAnalysis.crossSells !== "None" && (
                              <div className="p-2 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/10">
                                <span className="text-[10px] text-[hsl(217,91%,60%)]">Cross-sells: </span>
                                <span className="text-[10px] text-white/60">{financialData.pricingAnalysis.crossSells}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Growth indicators */}
                        {financialData.growthIndicators && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {[
                              { label: "Tech Maturity", value: financialData.growthIndicators.techMaturity, max: 10 },
                              { label: "Marketing Efficiency", value: financialData.growthIndicators.marketingEfficiency, max: 10 },
                              { label: "Product-Market Fit", value: financialData.growthIndicators.productMarketFit, max: 10 },
                              { label: "Scalability", value: financialData.growthIndicators.scalabilityScore, max: 10 },
                              { label: "Overall Health", value: financialData.growthIndicators.overallHealthScore, max: 100 },
                            ].map((g, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">{g.label}</p>
                                <p className="text-sm font-bold text-white">{g.value || "?"}<span className="text-[10px] text-white/30">/{g.max}</span></p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Competitive position */}
                        {financialData.competitivePosition && (
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2">
                            <p className="text-xs font-medium text-white/50">Competitive Position</p>
                            <p className="text-[10px] text-white/60">Market Share: {financialData.competitivePosition.marketShare || "N/A"}</p>
                            <p className="text-[10px] text-white/60">Advantage: {financialData.competitivePosition.competitiveAdvantage || "N/A"}</p>
                            {(financialData.competitivePosition.mainCompetitors || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-[10px] text-white/40">Competitors:</span>
                                {financialData.competitivePosition.mainCompetitors.map((c: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-[9px] border-white/10 text-white/50">{c}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Confidence + methodology */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40">Confidence:</span>
                            <Badge variant="outline" className={`text-[9px] ${financialData.confidenceLevel === "high" ? "border-emerald-400/20 text-emerald-400" : financialData.confidenceLevel === "medium" ? "border-amber-400/20 text-amber-400" : "border-red-400/20 text-red-400"}`}>
                              {financialData.confidenceLevel || "N/A"}
                            </Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-400/60 hover:text-green-400" onClick={() => { setFinancialData(null); runFinancialAnalysis(); }}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Re-analyze
                          </Button>
                        </div>
                        {financialData.methodology && (
                          <p className="text-[10px] text-white/30 italic">{financialData.methodology}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <DollarSign className="h-8 w-8 text-white/15 mx-auto mb-2" />
                        <p className="text-xs text-white/40 mb-2">AI-powered revenue, traffic & financial analysis</p>
                        <Button size="sm" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 gap-1.5" onClick={runFinancialAnalysis} disabled={financialLoading}>
                          <Sparkles className="h-3.5 w-3.5" /> Generate Financial Intelligence
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* ═══ DEEP ANALYSIS - SINGLE MAIN CARD ═══ */}
              <Card className="crm-card">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("deepMetrics")}>
                  <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Deep Analysis
                    <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{Object.keys(scrapeResult.curatedMetrics || {}).length} categories</Badge>
                    {expandedSections.deepMetrics ? <ChevronUp className="h-3.5 w-3.5 text-white/30 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30 ml-auto" />}
                  </CardTitle>
                </CardHeader>
                {expandedSections.deepMetrics && scrapeResult.curatedMetrics && (
                  <CardContent className="space-y-4">
                    {Object.entries(scrapeResult.curatedMetrics as Record<string, { label: string; items: Record<string, any> }>).map(([key, category]) => {
                      const catColors: Record<string, string> = {
                        contentQuality: "text-cyan-400", seoSignals: "text-emerald-400", mediaAssets: "text-amber-400",
                        techStack: "text-purple-400", monetization: "text-green-400", uxFeatures: "text-pink-400",
                        linkProfile: "text-[hsl(217,91%,60%)]", securityScore: "text-red-400",
                      };
                      const color = catColors[key] || "text-white/60";
                      return (
                        <div key={key} className="space-y-1.5">
                          <p className={`text-xs font-medium ${color}`}>{category.label}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                            {Object.entries(category.items).map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                                <span className="text-[10px] text-white/50">{label}</span>
                                {value === "✓" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> :
                                 value === "✗" ? <XCircle className="h-3.5 w-3.5 text-white/20" /> :
                                 <span className="text-xs font-medium text-white/80">{String(value)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Accessibility inline */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      <p className="text-xs font-medium text-white/50">Accessibility</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                        {[
                          { label: "Forms", value: scrapeResult.accessibility?.formCount || 0 },
                          { label: "ARIA attrs", value: scrapeResult.accessibility?.ariaCount || 0 },
                          { label: "Skip Nav", value: scrapeResult.accessibility?.hasSkipNav ? "✓" : "✗" },
                          { label: "Focus Styles", value: scrapeResult.accessibility?.hasFocusStyles ? "✓" : "✗" },
                        ].map((a, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                            <span className="text-[10px] text-white/50">{a.label}</span>
                            {a.value === "✓" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> :
                             a.value === "✗" ? <XCircle className="h-3.5 w-3.5 text-white/20" /> :
                             <span className="text-xs font-medium text-white/80">{a.value}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Typography inline */}
                    {((scrapeResult.fonts?.googleFonts?.length || 0) > 0 || (scrapeResult.fonts?.customFonts?.length || 0) > 0) && (
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                        <p className="text-xs font-medium text-white/50">Typography</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(scrapeResult.fonts?.googleFonts || []).map((f: string, i: number) => (
                            <Badge key={`gf-${i}`} variant="outline" className="text-[10px] border-amber-400/20 text-amber-400">G: {decodeURIComponent(f).replace(/\+/g, " ")}</Badge>
                          ))}
                          {(scrapeResult.fonts?.customFonts || []).slice(0, 6).map((f: string, i: number) => (
                            <Badge key={`cf-${i}`} variant="outline" className="text-[10px] border-white/10 text-white/40">{f.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links stats inline */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/[0.04]">
                      {[
                        { label: "Internal Links", value: scrapeResult.links?.totalInternal || 0 },
                        { label: "External Links", value: scrapeResult.links?.totalExternal || 0 },
                        { label: "Images", value: scrapeResult.images?.total || 0 },
                        { label: "Images w/ Alt", value: `${scrapeResult.images?.withAlt || 0}/${scrapeResult.images?.total || 0}` },
                      ].map((s, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center">
                          <p className="text-sm font-semibold text-white">{s.value}</p>
                          <p className="text-[10px] text-white/40">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Structured Data */}
                    {(scrapeResult.structuredData || []).length > 0 && (
                      <details className="pt-2 border-t border-white/[0.04]">
                        <summary className="text-xs font-medium text-white/50 cursor-pointer hover:text-white/70">Structured Data (JSON-LD) — {scrapeResult.structuredData.length} blocks</summary>
                        <pre className="text-[10px] text-white/50 bg-white/[0.02] p-3 rounded-lg overflow-auto max-h-48 border border-white/[0.04] mt-2">
                          {JSON.stringify(scrapeResult.structuredData, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* External links */}
                    {(scrapeResult.links?.external || []).length > 0 && (
                      <details className="pt-2 border-t border-white/[0.04]">
                        <summary className="text-xs font-medium text-white/50 cursor-pointer hover:text-white/70">External Links ({scrapeResult.links.totalExternal})</summary>
                        <div className="space-y-1 max-h-36 overflow-auto mt-2">
                          {scrapeResult.links.external.slice(0, 20).map((link: string, i: number) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-[hsl(217,91%,60%)]/60 hover:text-[hsl(217,91%,60%)] break-all p-1 rounded hover:bg-white/[0.02]">{link}</a>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* iFrames */}
                    {(scrapeResult.iframes || []).length > 0 && (
                      <details className="pt-2 border-t border-white/[0.04]">
                        <summary className="text-xs font-medium text-white/50 cursor-pointer hover:text-white/70">Embedded iFrames ({scrapeResult.iframes.length})</summary>
                        <div className="space-y-1 max-h-36 overflow-auto mt-2">
                          {scrapeResult.iframes.map((src: string, i: number) => (
                            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-[hsl(217,91%,60%)]/60 hover:text-[hsl(217,91%,60%)] break-all p-1 rounded hover:bg-white/[0.02]">{src}</a>
                          ))}
                        </div>
                      </details>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* ═══ SECURITY & SENSITIVE FILES - SINGLE CARD ═══ */}
              <Card className="crm-card">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("security")}>
                  <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Security & Sensitive Files
                    {(scrapeResult.sensitiveFiles?.exposedFiles || []).length > 0 && (
                      <Badge className="bg-red-400/15 text-red-400 text-[9px] ml-1">{scrapeResult.sensitiveFiles.exposedFiles.length} exposed</Badge>
                    )}
                    {expandedSections.security ? <ChevronUp className="h-3.5 w-3.5 text-white/30 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30 ml-auto" />}
                  </CardTitle>
                </CardHeader>
                {expandedSections.security && (
                  <CardContent className="space-y-3">
                    {/* Security headers */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-white/50">Security Headers</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {Object.entries(scrapeResult.securityHeaders || {}).map(([header, value]) => (
                          <div key={header} className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                            <span className="text-[10px] text-white/50">{header.replace(/([A-Z])/g, " $1").trim()}</span>
                            {value === "Missing" ? <XCircle className="h-3 w-3 text-red-400" /> :
                             value === "Present" ? <CheckCircle className="h-3 w-3 text-emerald-400" /> :
                             <CheckCircle className="h-3 w-3 text-emerald-400" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance signals */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      <p className="text-xs font-medium text-white/50">Performance Signals</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                        {[
                          { label: "Service Worker", value: scrapeResult.performance?.hasServiceWorker },
                          { label: "Web Manifest", value: scrapeResult.performance?.hasManifest },
                          { label: "Preconnect", value: scrapeResult.performance?.hasPreconnect },
                          { label: "Lazy Images", value: scrapeResult.performance?.hasLazyImages },
                        ].map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-white/[0.02]">
                            {p.value ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-white/20" />}
                            <span className={`text-[10px] ${p.value ? "text-white/70" : "text-white/30"}`}>{p.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sensitive files */}
                    <div className="pt-2 border-t border-white/[0.04]">
                      <p className="text-xs font-medium text-white/50 mb-2">Sensitive File Exposure</p>
                      {(scrapeResult.sensitiveFiles?.exposedFiles || []).length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-400/10 border border-red-400/20">
                            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                            <span className="text-xs text-red-400 font-medium">🚨 {scrapeResult.sensitiveFiles.exposedFiles.length} exposed file(s) — CRITICAL</span>
                          </div>
                          {(scrapeResult.sensitiveFiles.exposedFiles as any[]).map((f: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-red-400/15 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[9px] ${f.path.includes(".env") ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                                    {f.path.includes(".env") ? "ENV" : f.path.includes(".htaccess") ? "HTACCESS" : "CONFIG"}
                                  </Badge>
                                  <span className="text-xs text-red-400 font-mono">{f.path}</span>
                                </div>
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[hsl(217,91%,60%)] hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" /> Open
                                </a>
                              </div>
                              {(f.fullContent || f.snippet) && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/40">Content</span>
                                    <Button variant="ghost" size="sm" className="h-5 px-2 text-[9px] text-white/40 hover:text-white" onClick={() => { navigator.clipboard.writeText(f.fullContent || f.snippet); toast.success("Copied"); }}>
                                      <Copy className="h-3 w-3 mr-1" /> Copy
                                    </Button>
                                  </div>
                                  <pre className="text-[10px] text-white/60 bg-black/40 p-2 rounded overflow-auto max-h-48 font-mono border border-red-400/10 whitespace-pre-wrap break-all">{f.fullContent || f.snippet}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-emerald-400/80">No exposed files ({scrapeResult.sensitiveFiles?.totalChecked || 0} probes)</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Globe className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">Deep Site Analysis</h3>
                <p className="text-white/30 text-sm max-w-md mx-auto">Enter any website URL and optional business keywords to extract SEO, tech stack, social profiles, financial intelligence, and security analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitorAnalyzer;

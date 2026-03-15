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
  DollarSign, TrendingUp as TrendUp, Building2, Briefcase,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

// ─── Enterprise Context Auto-Injection ──────────────
const getEnterpriseContextForPrompt = (): string => {
  try {
    const toggle = localStorage.getItem("competitor_use_enterprise");
    if (toggle !== "true") return "";
    const raw = localStorage.getItem("competitor_enterprise_profile");
    if (!raw) return "";
    const ep = JSON.parse(raw);
    const s: string[] = [];
    if (ep.companyName) s.push(`Company: ${ep.companyName}${ep.companyType ? ` (${ep.companyType})` : ""}`);
    if (ep.industry) s.push(`Industry: ${ep.industry}${ep.subIndustry ? ` / ${ep.subIndustry}` : ""}`);
    if (ep.website) s.push(`Website: ${ep.website}`);
    if (ep.teamSize) s.push(`Team: ${ep.teamSize}`);
    if (ep.foundedYear) s.push(`Founded: ${ep.foundedYear}`);
    if (ep.headquartersCity) s.push(`HQ: ${ep.headquartersCity}${ep.headquartersCountry ? `, ${ep.headquartersCountry}` : ""}`);
    if (ep.brandVoice) s.push(`Brand Voice: ${ep.brandVoice}`);
    if (ep.contentNiche) s.push(`Content Niche: ${ep.contentNiche}`);
    if (ep.departments) s.push(`Departments: ${ep.departments}`);
    if (ep.legalStructure) s.push(`Legal: ${ep.legalStructure}`);
    const fin: string[] = [];
    if (ep.monthlyRevenue) fin.push(`Monthly Rev: ${ep.monthlyRevenue}`);
    if (ep.annualRevenue) fin.push(`Annual Rev: ${ep.annualRevenue}`);
    if (ep.mrr) fin.push(`MRR: ${ep.mrr}`);
    if (ep.arr) fin.push(`ARR: ${ep.arr}`);
    if (ep.customerCount) fin.push(`Customers: ${ep.customerCount}`);
    if (ep.churnRate) fin.push(`Churn: ${ep.churnRate}%`);
    if (ep.ltv) fin.push(`LTV: ${ep.ltv}`);
    if (ep.cac) fin.push(`CAC: ${ep.cac}`);
    if (ep.profitMargin) fin.push(`Margin: ${ep.profitMargin}%`);
    if (ep.avgDealSize) fin.push(`Avg Deal: ${ep.avgDealSize}`);
    if (ep.fundingStage) fin.push(`Stage: ${ep.fundingStage}`);
    if (ep.totalFunding) fin.push(`Total Funding: ${ep.totalFunding}`);
    if (ep.monthlyBurn) fin.push(`Burn: ${ep.monthlyBurn}/mo`);
    if (ep.runwayMonths) fin.push(`Runway: ${ep.runwayMonths} months`);
    if (ep.grossMargin) fin.push(`Gross Margin: ${ep.grossMargin}%`);
    if (ep.netIncome) fin.push(`Net Income: ${ep.netIncome}`);
    if (ep.operatingExpenses) fin.push(`OpEx: ${ep.operatingExpenses}`);
    if (ep.debtLevel) fin.push(`Debt: ${ep.debtLevel}`);
    if (fin.length) s.push(`Financials: ${fin.join(" | ")}`);
    const soc: string[] = [];
    if (ep.username) soc.push(`@${ep.username}`);
    if (ep.platform) soc.push(`Platform: ${ep.platform}`);
    if (ep.followers) soc.push(`${ep.followers} followers`);
    if (ep.engagementRate) soc.push(`${ep.engagementRate}% ER`);
    if (ep.avgLikes) soc.push(`${ep.avgLikes} avg likes`);
    if (ep.avgComments) soc.push(`${ep.avgComments} avg comments`);
    if (ep.growthRate) soc.push(`${ep.growthRate}% weekly growth`);
    if (ep.postFrequency) soc.push(`${ep.postFrequency} posts/wk`);
    if (ep.posts) soc.push(`${ep.posts} total posts`);
    if (ep.emailListSize) soc.push(`${ep.emailListSize} email list`);
    if (ep.websiteTraffic) soc.push(`${ep.websiteTraffic} monthly visitors`);
    if (ep.conversionRate) soc.push(`${ep.conversionRate}% conversion`);
    if (ep.adSpend) soc.push(`Ad spend: ${ep.adSpend}/mo`);
    if (ep.contentFrequency) soc.push(`Content: ${ep.contentFrequency}`);
    if (ep.socialPlatforms) soc.push(`Active on: ${ep.socialPlatforms}`);
    if (soc.length) s.push(`Social/Marketing: ${soc.join(" | ")}`);
    const prod: string[] = [];
    if (ep.mainProduct) prod.push(`Product: ${ep.mainProduct}`);
    if (ep.pricingModel) prod.push(`Pricing: ${ep.pricingModel}`);
    if (ep.avgPrice) prod.push(`Avg Price: ${ep.avgPrice}`);
    if (ep.numberOfProducts) prod.push(`Products: ${ep.numberOfProducts}`);
    if (ep.targetMarket) prod.push(`Target: ${ep.targetMarket}`);
    if (ep.usp) prod.push(`USP: ${ep.usp}`);
    if (ep.mainCompetitors) prod.push(`Known competitors: ${ep.mainCompetitors}`);
    if (ep.distributionChannels) prod.push(`Distribution: ${ep.distributionChannels}`);
    if (prod.length) s.push(prod.join(" | "));
    const goals: string[] = [];
    if (ep.revenueGoal) goals.push(`Rev goal: ${ep.revenueGoal}`);
    if (ep.followerGoal) goals.push(`Follower goal: ${ep.followerGoal}`);
    if (ep.engagementGoal) goals.push(`Engagement goal: ${ep.engagementGoal}%`);
    if (ep.growthTimeframe) goals.push(`Timeframe: ${ep.growthTimeframe}`);
    if (ep.topPriority) goals.push(`Priority: ${ep.topPriority}`);
    if (ep.biggestChallenge) goals.push(`Challenge: ${ep.biggestChallenge}`);
    if (goals.length) s.push(`Goals: ${goals.join(" | ")}`);
    if (s.length === 0) return "";
    return `\n\n═══ MY ENTERPRISE CONTEXT (use to personalize all recommendations to this specific business) ═══\n${s.join("\n")}\n═══ END ENTERPRISE CONTEXT ═══`;
  } catch { return ""; }
};

const callAI = async (prompt: string, analysisType?: string): Promise<any> => {
  // Pre-check usage before making the call
  const preCheck = await checkAIUsage();
  if (preCheck.limited) throw new Error(`Daily AI analysis limit reached (${RATE_LIMIT_MAX}/day). Resets at midnight UTC.`);
  
  const enrichedPrompt = prompt + getEnterpriseContextForPrompt();
  const { data, error } = await supabase.functions.invoke("competitor-analyze", {
    body: { prompt: enrichedPrompt, analysisType },
  });
  if (error) {
    if (error.message?.includes("limit")) throw new Error(`Daily AI analysis limit reached (${RATE_LIMIT_MAX}/day). Resets at midnight UTC.`);
    throw new Error(error.message || "AI request failed");
  }
  if (data?.limited) throw new Error(`Daily AI analysis limit reached (${RATE_LIMIT_MAX}/day). Resets at midnight UTC.`);
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

  // Enterprise profile (50 fields) + toggle
  const [enterpriseProfile, setEnterpriseProfile] = useState<Record<string, any>>(() => {
    try { const s = localStorage.getItem("competitor_enterprise_profile"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [useEnterpriseContext, setUseEnterpriseContext] = useState(() => {
    try { return localStorage.getItem("competitor_use_enterprise") === "true"; } catch { return false; }
  });
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const [enterpriseSection, setEnterpriseSection] = useState<string | null>(null);

  const saveEnterpriseProfile = (profile: Record<string, any>) => {
    setEnterpriseProfile(profile);
    localStorage.setItem("competitor_enterprise_profile", JSON.stringify(profile));
    toast.success("Enterprise profile saved");
  };
  const toggleEnterpriseContext = (on: boolean) => {
    setUseEnterpriseContext(on);
    localStorage.setItem("competitor_use_enterprise", on ? "true" : "false");
    toast.success(on ? "Enterprise data now used across all tabs" : "Enterprise data disabled across tabs");
  };

  // Derive myStats from enterprise profile for backward compat
  const myStats = enterpriseProfile?.username ? {
    username: enterpriseProfile.username || "me",
    followers: parseFloat(enterpriseProfile.followers) || 0,
    engagementRate: parseFloat(enterpriseProfile.engagementRate) || 0,
    avgLikes: parseFloat(enterpriseProfile.avgLikes) || 0,
    avgComments: parseFloat(enterpriseProfile.avgComments) || 0,
    growthRate: parseFloat(enterpriseProfile.growthRate) || 0,
    postFrequency: parseFloat(enterpriseProfile.postFrequency) || 0,
    posts: parseFloat(enterpriseProfile.posts) || 0,
  } : null;

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

  // Battle plan state
  const [battlePlan, setBattlePlan] = useState<any>(null);
  const [battlePlanLoading, setBattlePlanLoading] = useState(false);

  // Content recommendations state
  const [contentRecs, setContentRecs] = useState<any>(null);
  const [contentRecsLoading, setContentRecsLoading] = useState(false);

  // Site AI insights state
  const [siteInsights, setSiteInsights] = useState<any>(null);
  const [siteInsightsLoading, setSiteInsightsLoading] = useState(false);

  // Head-to-Head comparison state
  const [h2hCompA, setH2hCompA] = useState<string | null>(null);
  const [h2hCompB, setH2hCompB] = useState<string | null>(null);
  const [h2hResult, setH2hResult] = useState<any>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  // Growth Forecast state
  const [forecastTarget, setForecastTarget] = useState<string | null>(null);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Deep analysis section expansion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    social: true, platforms: true, deepMetrics: false, security: false, performance: false, sensitive: false, financial: true, siteInsights: true,
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

    await refreshAIUsage();
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

Return ONLY valid JSON with 4-6 items per category. Each item must have "text" and "priority" (high/medium/low) and "action" (what to do about it):
{
  "strengths": [{"text": "specific strength", "priority": "high", "action": "how to leverage this"}],
  "weaknesses": [{"text": "specific weakness", "priority": "high", "action": "how to exploit this"}],
  "opportunities": [{"text": "specific opportunity", "priority": "high", "action": "how to capitalize on this"}],
  "threats": [{"text": "specific threat", "priority": "high", "action": "how to mitigate this"}],
  "overallVerdict": "2-3 sentence overall competitive verdict",
  "topAction": "The single most important action to take right now"
}`
        );
        const parsed = parseJSON(aiReply);
        if (!parsed.strengths || !parsed.weaknesses) throw new Error("Incomplete SWOT");
        // Normalize: support both old string[] and new {text,priority,action}[] format
        const normalize = (arr: any[]) => arr.map((item: any) => typeof item === "string" ? { text: item, priority: "medium", action: "" } : item);
        setSwotResult({ ...parsed, strengths: normalize(parsed.strengths), weaknesses: normalize(parsed.weaknesses), opportunities: normalize(parsed.opportunities), threats: normalize(parsed.threats) });
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

  // ─── AI Site Intelligence Generator ─────────────────
  const generateSiteInsights = async () => {
    if (!scrapeResult) return;
    await performAction("site_scrape", async () => {
      setSiteInsightsLoading(true);
      try {
        const dp = scrapeResult.detectedPlatforms || {};
        const cm = scrapeResult.curatedMetrics || {};
        const social = scrapeResult.socialMediaPresence || {};
        const url = scrapeResult.finalUrl || scrapeResult.url || scrapeUrl;
        const socialPlatforms = Object.keys(social).filter(k => (social[k] || []).length > 0);
        const techCategories = Object.keys(dp).filter(k => Array.isArray(dp[k]) && dp[k].length > 0);
        const techList = techCategories.map(k => `${k}: ${dp[k].map((p: any) => p.name).join(", ")}`).join("; ");
        const seoData = cm.seoSignals?.items || {};
        const contentData = cm.contentQuality?.items || {};
        const monetization = cm.monetization?.items || {};
        const secHeaders = scrapeResult.securityHeaders || {};
        const headings = scrapeResult.headings || {};
        const links = scrapeResult.links || {};
        const financialContext = financialData ? `\nFINANCIAL DATA AVAILABLE: Revenue: ${financialData.revenueEstimates?.monthlyRevenue || "unknown"}, Traffic: ${financialData.trafficEstimates?.monthlyVisitors || "unknown"}, Business Model: ${financialData.companyOverview?.businessModel || "unknown"}, Stage: ${financialData.companyOverview?.stage || "unknown"}, Growth indicators: ${JSON.stringify(financialData.growthIndicators || {}).slice(0, 200)}` : "";

        const prompt = `You are an elite competitive intelligence analyst. Analyze this website and produce a comprehensive competitive intelligence report.

WEBSITE: ${url}
SOCIAL PRESENCE: ${socialPlatforms.join(", ") || "none detected"}
TECH STACK: ${techList || "minimal detection"}
SEO SIGNALS: ${JSON.stringify(seoData).slice(0, 300)}
CONTENT: ${JSON.stringify(contentData).slice(0, 300)}
MONETIZATION: ${JSON.stringify(monetization).slice(0, 200)}
SECURITY HEADERS: ${Object.entries(secHeaders).map(([k, v]) => `${k}: ${v ? "✓" : "✗"}`).join(", ")}
HEADINGS: H1s: ${headings.h1Count || 0}, H2s: ${headings.h2Count || 0}, H3s: ${headings.h3Count || 0}
LINKS: Internal: ${links.totalInternal || 0}, External: ${links.totalExternal || 0}
${financialContext}
${scrapeResult.analysisKeywords ? `BUSINESS KEYWORDS: ${scrapeResult.analysisKeywords}` : ""}

Return ONLY valid JSON:
{
  "competitiveScore": <0-100 overall competitive strength>,
  "executiveSummary": "3-4 sentence summary of competitive position",
  "marketPosition": {"tier": "leader/challenger/follower/niche", "reasoning": "why"},
  "strengthsToFear": [{"strength": "what they do well", "impact": "how it affects you", "counterStrategy": "how to counter it"}],
  "weaknessesToExploit": [{"weakness": "their vulnerability", "severity": "critical/high/medium", "exploitStrategy": "exactly how to exploit this", "expectedGain": "what you gain"}],
  "seoOpportunities": [{"opportunity": "specific SEO gap", "difficulty": "easy/medium/hard", "action": "exact steps to take", "expectedTraffic": "potential traffic gain"}],
  "conversionFunnel": {"topOfFunnel": "how they attract visitors", "middleOfFunnel": "how they nurture leads", "bottomOfFunnel": "how they convert", "leaks": ["where they lose people"], "yourAdvantage": "how to build a better funnel"},
  "backlinksStrategy": [{"opportunity": "specific backlink source", "type": "guest-post/directory/partnership/broken-link", "difficulty": "easy/medium/hard", "domainAuthority": "estimated DA", "action": "exact outreach approach"}],
  "socialProofAnalysis": {"testimonialCount": "how many visible", "trustSignals": ["signal1","signal2"], "missingTrust": ["what they lack"], "socialProofScore": <0-100>, "yourOpportunity": "how to out-trust them"},
  "uxDesignAnalysis": {"designQuality": <0-100>, "mobileExperience": "good/average/poor", "loadSpeed": "fast/average/slow", "navigationClarity": <0-100>, "ctaEffectiveness": "strong/weak/missing", "designWeaknesses": ["specific UX issues"], "designStrengths": ["what looks good"]},
  "hiringSignals": {"isHiring": true, "openRoles": ["role1","role2"], "growthSignal": "what hiring tells us about their strategy", "teamSize": "estimated"},
  "customerIntel": {"reviewSentiment": "positive/mixed/negative", "commonComplaints": ["complaint1","complaint2"], "commonPraise": ["praise1","praise2"], "npsEstimate": "<0-100 or unknown>", "churnSignals": ["signal1"], "yourOpportunity": "how to steal dissatisfied customers"},
  "partnershipMap": [{"partner": "company/platform name", "type": "integration/affiliate/co-marketing", "strength": "how valuable", "yourAction": "how to compete or partner similarly"}],
  "threatTimeline": [{"timeframe": "next 30/90/180 days", "threat": "what they might do", "probability": "high/medium/low", "preemptiveAction": "what to do now"}],
  "contentStrategy": {"dominantTopics": ["topic1"], "contentGaps": ["gap1"], "recommendedFormats": ["format1"], "postingCadence": "recommended frequency", "toneAnalysis": "their brand tone"},
  "marketingIntel": {"channels": ["channel1"], "adPresence": "description of their ad activity", "emailStrategy": "what they do with email", "funnelType": "their funnel approach", "ctas": ["call to action patterns"]},
  "techAdvantages": [{"tech": "technology name", "advantage": "what it gives them", "alternative": "what you should use instead or additionally"}],
  "pricingIntel": {"strategy": "their pricing approach", "vulnerabilities": ["pricing weakness"], "recommendations": ["how to price against them"]},
  "audienceIntel": {"primaryDemo": "who they target", "secondaryDemo": "secondary audience", "underservedSegments": ["segment they miss"], "acquisitionChannels": ["how they get users"]},
  "weeklyHitList": [{"day": "Monday", "action": "specific action to take", "target": "what metric this impacts", "priority": "high/medium"}],
  "immediateActions": [{"action": "do this right now", "timeNeeded": "15min", "impact": "high", "details": "step by step"}],
  "longTermPlays": [{"play": "strategic move", "timeline": "2-4 weeks", "investment": "time/money needed", "expectedROI": "expected return"}],
  "riskAssessment": {"overallThreat": "low/medium/high/critical", "biggestRisk": "main risk", "mitigation": "how to mitigate"}
}

Be extremely specific. Use actual data from the analysis. No generic advice. Every recommendation must be actionable with clear steps.`;

        const aiReply = await callAI(prompt, "site_intelligence");
        const parsed = parseJSON(aiReply);
        setSiteInsights(parsed);
        await refreshAIUsage();
        toast.success("Competitive intelligence report generated");
        return true;
      } catch (err: any) {
        toast.error(err?.message || "Site intelligence failed");
        throw err;
      } finally {
        setSiteInsightsLoading(false);
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

  // Wrap every AI call with pre-check + post-refresh
  const guardedAI = async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (aiUsageCount >= RATE_LIMIT_MAX) {
      toast.error(`Daily AI limit reached (${RATE_LIMIT_MAX}/day). Resets at midnight UTC.`);
      throw new Error("Rate limit reached");
    }
    const result = await fn();
    await refreshAIUsage();
    return result;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white font-heading">Competitor Analyzer</h1>
          <p className="text-sm text-white/50 mt-0.5">AI-powered competitive intelligence · track, benchmark, and outperform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Brain className="h-3.5 w-3.5 text-[hsl(217,91%,60%)]" />
            <span className="text-xs text-white/50">AI Calls:</span>
            <span className={`text-xs font-bold ${aiUsageCount >= RATE_LIMIT_MAX ? "text-red-400" : aiUsageCount >= 15 ? "text-amber-400" : "text-emerald-400"}`}>{aiUsageCount}/{RATE_LIMIT_MAX}</span>
          </div>
          <CreditCostBadge cost="5-15" variant="header" label="per action" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-[hsl(222,47%,8%)]/80 backdrop-blur-xl border border-white/[0.06] p-1.5 rounded-2xl h-auto gap-1 flex-wrap shadow-[0_8px_32px_hsl(0,0%,0%/0.4),inset_0_1px_0_hsl(0,0%,100%/0.03)]">
          {[
            { value: "tracker", icon: Crosshair, label: "Tracker" },
            { value: "benchmarks", icon: BarChart3, label: "Benchmarks" },
            { value: "h2h", icon: Crosshair, label: "Head-to-Head" },
            { value: "keywords", icon: Search, label: "Keyword Search" },
            { value: "gaps", icon: Eye, label: "Gap Analysis" },
            { value: "content", icon: Calendar, label: "Content Intel" },
            { value: "swot", icon: Target, label: "SWOT" },
            { value: "strategy", icon: Brain, label: "AI Strategy" },
            { value: "battleplan", icon: Crown, label: "Battle Plan" },
            { value: "forecast", icon: TrendingUp, label: "Growth Forecast" },
            { value: "analysis", icon: Globe, label: "Site Analysis" },
            { value: "export", icon: Download, label: "Export Report" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(217,91%,60%)]/15 data-[state=active]:to-[hsl(262,83%,58%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] data-[state=active]:shadow-[0_0_12px_hsl(217,91%,60%/0.15),inset_0_1px_0_hsl(0,0%,100%/0.06)] data-[state=active]:border data-[state=active]:border-[hsl(217,91%,60%)]/20 text-white/35 hover:text-white/50 hover:bg-white/[0.03] rounded-xl gap-1.5 text-xs font-medium transition-all duration-200">
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

          {/* ─── ENTERPRISE / COMPANY PROFILE ─── */}
          <Card className="crm-card border-emerald-400/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">My Enterprise Profile</span>
                  {enterpriseProfile?.companyName && <Badge variant="outline" className="text-[9px] border-emerald-400/20 text-emerald-400">{enterpriseProfile.companyName}</Badge>}
                  {myStats && <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">@{myStats.username}</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Use across all tabs</span>
                    <Switch checked={useEnterpriseContext} onCheckedChange={toggleEnterpriseContext} className="h-4 w-7 data-[state=checked]:bg-emerald-500" />
                  </div>
                  <Button size="sm" variant="outline" className="text-xs gap-1 border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10 h-7" onClick={() => setShowEnterpriseForm(!showEnterpriseForm)}>
                    {Object.keys(enterpriseProfile).length > 0 ? "Edit" : "Set Up"}
                  </Button>
                </div>
              </div>

              {/* Quick stats display when profile exists */}
              {myStats && !showEnterpriseForm && (
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-2">
                  {[
                    { label: "Followers", value: fmtNum(myStats.followers) },
                    { label: "Eng. Rate", value: `${myStats.engagementRate}%` },
                    { label: "Avg Likes", value: fmtNum(myStats.avgLikes) },
                    { label: "Growth/Wk", value: `${myStats.growthRate >= 0 ? "+" : ""}${myStats.growthRate}%` },
                    { label: "Posts/Wk", value: `${myStats.postFrequency}` },
                    { label: "Revenue", value: enterpriseProfile.monthlyRevenue || "—" },
                    { label: "Customers", value: enterpriseProfile.customerCount || "—" },
                    { label: "Team", value: enterpriseProfile.teamSize || "—" },
                  ].map((s, i) => (
                    <div key={i} className="text-center p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                      <p className="text-[10px] text-white/40">{s.label}</p>
                      <p className="text-xs font-semibold text-emerald-400">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Full enterprise form */}
              {showEnterpriseForm && (() => {
                const SECTIONS = [
                  { key: "company", label: "🏢 Company Info", fields: [
                    { key: "companyName", label: "Company Name", type: "text", placeholder: "Acme Corp" },
                    { key: "companyType", label: "Type", type: "text", placeholder: "SaaS, LLC, Agency, E-commerce, Corp..." },
                    { key: "legalStructure", label: "Legal Structure", type: "text", placeholder: "LLC, S-Corp, C-Corp, Sole Prop..." },
                    { key: "industry", label: "Industry", type: "text", placeholder: "Technology, Fashion, Finance..." },
                    { key: "subIndustry", label: "Sub-Industry / Niche", type: "text", placeholder: "AI Marketing, Streetwear..." },
                    { key: "website", label: "Website", type: "text", placeholder: "https://example.com" },
                    { key: "foundedYear", label: "Founded Year", type: "text", placeholder: "2020" },
                    { key: "headquartersCity", label: "HQ City", type: "text", placeholder: "New York" },
                    { key: "headquartersCountry", label: "HQ Country", type: "text", placeholder: "USA" },
                    { key: "teamSize", label: "Team Size", type: "text", placeholder: "15" },
                    { key: "departments", label: "Departments", type: "text", placeholder: "Engineering, Marketing, Sales..." },
                    { key: "brandVoice", label: "Brand Voice / Tone", type: "text", placeholder: "Professional, Casual, Bold..." },
                    { key: "contentNiche", label: "Content Niche", type: "text", placeholder: "Creator economy, fitness, SaaS growth..." },
                  ]},
                  { key: "financial", label: "💰 Financials", fields: [
                    { key: "monthlyRevenue", label: "Monthly Revenue", type: "text", placeholder: "$50,000" },
                    { key: "annualRevenue", label: "Annual Revenue (CA)", type: "text", placeholder: "$600,000" },
                    { key: "mrr", label: "MRR", type: "text", placeholder: "$50,000" },
                    { key: "arr", label: "ARR", type: "text", placeholder: "$600,000" },
                    { key: "avgDealSize", label: "Avg Deal Size", type: "text", placeholder: "$500" },
                    { key: "customerCount", label: "# of Customers", type: "text", placeholder: "1200" },
                    { key: "churnRate", label: "Churn Rate %", type: "text", placeholder: "3.5" },
                    { key: "ltv", label: "Lifetime Value (LTV)", type: "text", placeholder: "$2,400" },
                    { key: "cac", label: "Customer Acq. Cost (CAC)", type: "text", placeholder: "$150" },
                    { key: "profitMargin", label: "Profit Margin %", type: "text", placeholder: "25" },
                    { key: "grossMargin", label: "Gross Margin %", type: "text", placeholder: "70" },
                    { key: "netIncome", label: "Net Income / Month", type: "text", placeholder: "$12,000" },
                    { key: "operatingExpenses", label: "Operating Expenses / Month", type: "text", placeholder: "$38,000" },
                    { key: "fundingStage", label: "Funding Stage", type: "text", placeholder: "Seed, Series A, Bootstrapped..." },
                    { key: "totalFunding", label: "Total Funding Raised", type: "text", placeholder: "$2M" },
                    { key: "monthlyBurn", label: "Monthly Burn Rate", type: "text", placeholder: "$30,000" },
                    { key: "runwayMonths", label: "Runway (months)", type: "text", placeholder: "18" },
                    { key: "debtLevel", label: "Debt Level", type: "text", placeholder: "$0 / None" },
                  ]},
                  { key: "social", label: "📱 Social & Marketing", fields: [
                    { key: "username", label: "Main Username", type: "text", placeholder: "your_username" },
                    { key: "platform", label: "Main Platform", type: "text", placeholder: "Instagram, TikTok..." },
                    { key: "followers", label: "Followers", type: "number", placeholder: "10000" },
                    { key: "engagementRate", label: "Engagement Rate %", type: "number", placeholder: "3.5" },
                    { key: "avgLikes", label: "Avg Likes / Post", type: "number", placeholder: "500" },
                    { key: "avgComments", label: "Avg Comments / Post", type: "number", placeholder: "25" },
                    { key: "growthRate", label: "Weekly Growth %", type: "number", placeholder: "1.5" },
                    { key: "postFrequency", label: "Posts / Week", type: "number", placeholder: "5" },
                    { key: "posts", label: "Total Posts", type: "number", placeholder: "200" },
                    { key: "socialPlatforms", label: "Active Platforms", type: "text", placeholder: "IG, TikTok, YouTube, Twitter..." },
                    { key: "emailListSize", label: "Email List Size", type: "text", placeholder: "5000" },
                    { key: "websiteTraffic", label: "Monthly Website Visitors", type: "text", placeholder: "25,000" },
                    { key: "conversionRate", label: "Conversion Rate %", type: "text", placeholder: "2.5" },
                    { key: "adSpend", label: "Monthly Ad Spend", type: "text", placeholder: "$5,000" },
                    { key: "contentFrequency", label: "Content Frequency", type: "text", placeholder: "Daily, 3x/week..." },
                  ]},
                  { key: "product", label: "📦 Product & Market", fields: [
                    { key: "mainProduct", label: "Main Product / Service", type: "text", placeholder: "AI content platform, coaching..." },
                    { key: "pricingModel", label: "Pricing Model", type: "text", placeholder: "Subscription, One-time, Freemium..." },
                    { key: "avgPrice", label: "Average Price Point", type: "text", placeholder: "$49/mo" },
                    { key: "numberOfProducts", label: "Number of Products", type: "text", placeholder: "3" },
                    { key: "targetMarket", label: "Target Market / ICP", type: "text", placeholder: "SMBs, Creators, Enterprise..." },
                    { key: "usp", label: "Unique Selling Proposition", type: "text", placeholder: "What makes you different" },
                    { key: "mainCompetitors", label: "Known Competitors", type: "text", placeholder: "Competitor A, Competitor B..." },
                    { key: "distributionChannels", label: "Distribution Channels", type: "text", placeholder: "Direct, Affiliates, Partnerships..." },
                  ]},
                  { key: "goals", label: "🎯 Goals & Strategy", fields: [
                    { key: "revenueGoal", label: "Revenue Goal", type: "text", placeholder: "$100,000/mo" },
                    { key: "followerGoal", label: "Follower Goal", type: "text", placeholder: "50,000" },
                    { key: "engagementGoal", label: "Engagement Goal %", type: "text", placeholder: "5" },
                    { key: "growthTimeframe", label: "Growth Timeframe", type: "text", placeholder: "6 months, 1 year..." },
                    { key: "topPriority", label: "Top Priority Right Now", type: "text", placeholder: "Revenue growth, brand awareness..." },
                    { key: "biggestChallenge", label: "Biggest Challenge", type: "text", placeholder: "Customer acquisition, retention..." },
                  ]},
                ];

                return (
                  <div className="space-y-3 mt-3">
                    {SECTIONS.map(section => (
                      <div key={section.key} className="rounded-lg border border-white/[0.06] overflow-hidden">
                        <button className="w-full flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors" onClick={() => setEnterpriseSection(enterpriseSection === section.key ? null : section.key)}>
                          <span className="text-xs font-medium text-white/70">{section.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/25">{section.fields.filter(f => enterpriseProfile[f.key]).length}/{section.fields.length} filled</span>
                            {enterpriseSection === section.key ? <ChevronUp className="h-3 w-3 text-white/30" /> : <ChevronDown className="h-3 w-3 text-white/30" />}
                          </div>
                        </button>
                        {enterpriseSection === section.key && (
                          <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {section.fields.map(f => (
                              <div key={f.key} className="space-y-1">
                                <label className="text-[10px] text-white/40">{f.label}</label>
                                <Input
                                  type={f.type}
                                  placeholder={f.placeholder}
                                  defaultValue={enterpriseProfile[f.key] || ""}
                                  className="crm-input h-8 text-xs"
                                  id={`ep-${f.key}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs" onClick={() => {
                        const allFields = SECTIONS.flatMap(s => s.fields);
                        const profile: Record<string, any> = {};
                        allFields.forEach(f => {
                          const el = document.getElementById(`ep-${f.key}`) as HTMLInputElement;
                          if (el?.value) profile[f.key] = el.value;
                        });
                        saveEnterpriseProfile(profile);
                        setShowEnterpriseForm(false);
                      }}>
                        <CheckCircle className="h-3 w-3" /> Save Profile ({Object.keys(enterpriseProfile).length} fields)
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs text-white/40" onClick={() => setShowEnterpriseForm(false)}>Cancel</Button>
                      {Object.keys(enterpriseProfile).length > 0 && (
                        <Button size="sm" variant="ghost" className="text-xs text-red-400/60 hover:text-red-400 ml-auto" onClick={() => {
                          saveEnterpriseProfile({});
                          setShowEnterpriseForm(false);
                        }}>Clear All</Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {!enterpriseProfile?.username && !showEnterpriseForm && (
                <p className="text-xs text-white/30">Set up your enterprise profile (50 fields) to get personalized AI recommendations across all tabs · toggle "Use across all tabs" to enable</p>
              )}
              {useEnterpriseContext && Object.keys(enterpriseProfile).length > 0 && !showEnterpriseForm && (
                <div className="flex items-center gap-1.5 mt-2 p-1.5 rounded bg-emerald-400/5 border border-emerald-400/10">
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Enterprise data active · AI will personalize all analysis to your business</span>
                </div>
              )}
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
            <>
              {/* Quick Summary Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="crm-card"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-white/40">Tracked</p>
                  <p className="text-lg font-bold text-[hsl(217,91%,60%)]">{competitors.length}</p>
                </CardContent></Card>
                <Card className="crm-card"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-white/40">Avg Followers</p>
                  <p className="text-lg font-bold text-white">{fmtNum(Math.round(competitors.reduce((a, c) => a + c.followers, 0) / competitors.length))}</p>
                </CardContent></Card>
                <Card className="crm-card"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-white/40">Avg Engagement</p>
                  <p className="text-lg font-bold text-emerald-400">{(competitors.reduce((a, c) => a + c.engagementRate, 0) / competitors.length).toFixed(1)}%</p>
                </CardContent></Card>
                <Card className="crm-card"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-white/40">High Threats</p>
                  <p className="text-lg font-bold text-red-400">{competitors.filter(c => c.score >= 70).length}</p>
                </CardContent></Card>
                <Card className="crm-card"><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-white/40">Avg Growth</p>
                  <p className={`text-lg font-bold ${competitors.reduce((a, c) => a + c.growthRate, 0) / competitors.length >= 0 ? "text-emerald-400" : "text-red-400"}`}>{(competitors.reduce((a, c) => a + c.growthRate, 0) / competitors.length).toFixed(1)}%/wk</p>
                </CardContent></Card>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-white/10 text-white/50 hover:text-white" disabled={refreshingId !== null}
                    onClick={async () => {
                      for (const comp of competitors) {
                        await refreshCompetitor(comp);
                      }
                      toast.success("All competitors refreshed");
                    }}>
                    <RefreshCw className={`h-3 w-3 ${refreshingId ? "animate-spin" : ""}`} /> Refresh All
                  </Button>
                  <span className="text-[10px] text-white/25">{competitors.length} competitor{competitors.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {competitors.map(comp => {
                const historyData = comp.metadata?.analysisHistory || [];
                const threatPct = Math.min(comp.score, 100);
                const circumference = 2 * Math.PI * 32;
                const strokeDash = (threatPct / 100) * circumference;
                const threatStroke = comp.score >= 70 ? "hsl(350,80%,55%)" : comp.score >= 40 ? "hsl(30,95%,60%)" : "hsl(150,60%,50%)";
                const threatGlow = comp.score >= 70 ? "drop-shadow(0 0 6px hsl(350,80%,55%/0.4))" : comp.score >= 40 ? "drop-shadow(0 0 6px hsl(30,95%,60%/0.4))" : "drop-shadow(0 0 6px hsl(150,60%,50%/0.4))";
                return (
                <Card
                  key={comp.id}
                  className={`crm-card cursor-pointer transition-all duration-300 hover:border-white/10 hover:shadow-[0_8px_32px_hsl(0,0%,0%/0.3)] hover:translate-y-[-2px] ${selectedCompetitor === comp.id ? "ring-1 ring-[hsl(217,91%,60%)]/40 shadow-[0_0_20px_hsl(217,91%,60%/0.08)]" : ""}`}
                  onClick={() => setSelectedCompetitor(comp.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* SVG Threat Score Ring */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 72 72" style={{ filter: threatGlow }}>
                            <circle cx="36" cy="36" r="32" fill="none" stroke="hsl(0,0%,100%,0.04)" strokeWidth="3" />
                            <circle cx="36" cy="36" r="32" fill="none" stroke={threatStroke} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} className="transition-all duration-1000" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-black text-white">{comp.score}</span>
                          </div>
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
                        <div key={i} className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
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
                      <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                        <p className="text-[10px] text-white/40">Avg Likes</p>
                        <p className="text-sm font-semibold text-white">{fmtNum(comp.avgLikes)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                        <p className="text-[10px] text-white/40">Posts/Wk</p>
                        <p className="text-sm font-semibold text-white">{comp.postFrequency}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                        <p className="text-[10px] text-white/40">Total Posts</p>
                        <p className="text-sm font-semibold text-white">{fmtNum(comp.posts)}</p>
                      </div>
                    </div>

                    {/* Mini Sparkline */}
                    {historyData.length >= 2 && (
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={historyData.slice(-8).map((h: any, i: number) => ({ x: i, v: h.followers }))}>
                            <defs>
                              <linearGradient id={`spark-${comp.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke="hsl(217,91%,60%)" fill={`url(#spark-${comp.id})`} strokeWidth={1.5} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Content Type Mini Bars */}
                    {comp.contentTypes.length > 0 && (
                      <div className="space-y-1">
                        {comp.contentTypes.slice(0, 3).map((ct, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[9px] text-white/30 w-14 truncate">{ct.type}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ct.pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            </div>
                            <span className="text-[9px] text-white/30 w-8 text-right">{ct.pct}%</span>
                          </div>
                        ))}
                      </div>
                    )}

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
                );
              })}
            </div>
            </>
          )}
        </TabsContent>

        {/* ═══ BENCHMARKS TAB ═══ */}
        <TabsContent value="benchmarks" className="space-y-5">
          {competitors.length === 0 ? (
            <Card className="crm-card"><CardContent className="p-12 text-center"><p className="text-white/50">Add competitors first to see benchmarks</p></CardContent></Card>
          ) : (
            <>
              {/* Power Rankings Leaderboard */}
              <Card className="crm-card border-amber-400/15">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><Crown className="h-4 w-4" /> Power Rankings</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const allEntries = [
                      ...(myStats ? [{ username: myStats.username, isMe: true, score: ((myStats.engagementRate * 10) + (myStats.growthRate * 5) + (myStats.followers / Math.max(...competitors.map(c => c.followers), 1) * 30) + (myStats.avgLikes / Math.max(...competitors.map(c => c.avgLikes), 1) * 20) + (myStats.postFrequency * 2)) }] : []),
                      ...competitors.map(c => ({ username: c.username, isMe: false, score: ((c.engagementRate * 10) + (c.growthRate * 5) + (c.followers / Math.max(...competitors.map(x => x.followers), 1) * 30) + (c.avgLikes / Math.max(...competitors.map(x => x.avgLikes), 1) * 20) + (c.postFrequency * 2)) })),
                    ].sort((a, b) => b.score - a.score);
                    const maxScore = allEntries[0]?.score || 1;
                    return allEntries.map((e, i) => (
                      <div key={e.username} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${e.isMe ? "bg-emerald-400/5 border-emerald-400/15" : "bg-white/[0.02] border-white/[0.04]"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i === 0 ? "bg-amber-400/15 text-amber-400" : i === 1 ? "bg-white/10 text-white/60" : i === 2 ? "bg-orange-400/10 text-orange-400/70" : "bg-white/[0.04] text-white/30"}`}>
                          {i === 0 ? "👑" : `#${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${e.isMe ? "text-emerald-400" : "text-white/80"}`}>@{e.username}</span>
                            {e.isMe && <Badge className="bg-emerald-400/15 text-emerald-400 text-[8px]">YOU</Badge>}
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${e.isMe ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : i === 0 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-[hsl(217,91%,60%)] to-[hsl(262,83%,58%)]"}`} style={{ width: `${(e.score / maxScore) * 100}%` }} />
                          </div>
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${e.isMe ? "text-emerald-400" : "text-white/50"}`}>{Math.round(e.score)}</span>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
               {/* Radar - includes user data */}
              <Card className="crm-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Performance Radar {myStats ? "· You vs Competitors" : "· All Competitors"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {(() => {
                        const allEntries = [...competitors.map(c => ({ key: c.username, followers: c.followers, engagementRate: c.engagementRate, postFrequency: c.postFrequency, avgComments: c.avgComments, avgLikes: c.avgLikes, growthRate: c.growthRate }))];
                        if (myStats) allEntries.push({ key: myStats.username, followers: myStats.followers, engagementRate: myStats.engagementRate, postFrequency: myStats.postFrequency, avgComments: myStats.avgComments, avgLikes: myStats.avgLikes, growthRate: myStats.growthRate });
                        const maxFollowers = Math.max(...allEntries.map(e => e.followers), 1);
                        const maxLikes = Math.max(...allEntries.map(e => e.avgLikes), 1);
                        return (
                          <RadarChart data={[
                            { metric: "Engagement", ...Object.fromEntries(allEntries.map(e => [e.key, Math.min(e.engagementRate * 10, 100)])) },
                            { metric: "Growth", ...Object.fromEntries(allEntries.map(e => [e.key, Math.min(Math.max(e.growthRate * 15 + 50, 0), 100)])) },
                            { metric: "Frequency", ...Object.fromEntries(allEntries.map(e => [e.key, Math.min(e.postFrequency * 10, 100)])) },
                            { metric: "Reach", ...Object.fromEntries(allEntries.map(e => [e.key, Math.min((e.followers / maxFollowers) * 100, 100)])) },
                            { metric: "Community", ...Object.fromEntries(allEntries.map(e => [e.key, Math.min(e.avgComments * 1.5, 100)])) },
                            { metric: "Virality", ...Object.fromEntries(allEntries.map(e => [e.key, Math.min(e.avgLikes / maxLikes * 100, 100)])) },
                          ]}>
                            <PolarGrid stroke="hsl(217 91% 60% / 0.08)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                            <PolarRadiusAxis tick={false} axisLine={false} />
                            {myStats && (
                              <Radar name={`@${myStats.username} (You)`} dataKey={myStats.username} stroke="hsl(150,60%,50%)" fill="hsl(150,60%,50%)" fillOpacity={0.15} strokeWidth={3} strokeDasharray="0" />
                            )}
                            {competitors.map((c, i) => (
                              <Radar key={c.id} name={`@${c.username}`} dataKey={c.username} stroke={PIE_COLORS[i % PIE_COLORS.length]} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.1} strokeWidth={2} />
                            ))}
                            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                          </RadarChart>
                        );
                      })()}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Win/Loss Summary */}
              {myStats && (
                <Card className="crm-card border-emerald-400/15">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Crown className="h-4 w-4" /> Your Competitive Standing</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      {competitors.map(comp => {
                        const wins = [
                          myStats.followers > comp.followers,
                          myStats.engagementRate > comp.engagementRate,
                          myStats.avgLikes > comp.avgLikes,
                          myStats.growthRate > comp.growthRate,
                          myStats.postFrequency > comp.postFrequency,
                        ].filter(Boolean).length;
                        const total = 5;
                        const pct = Math.round((wins / total) * 100);
                        return (
                          <div key={comp.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white/80">vs @{comp.username}</span>
                              <Badge variant="outline" className={`text-[9px] ${pct >= 60 ? "border-emerald-400/30 text-emerald-400" : pct >= 40 ? "border-amber-400/30 text-amber-400" : "border-red-400/30 text-red-400"}`}>
                                {pct >= 60 ? "Winning" : pct >= 40 ? "Close" : "Behind"} · {wins}/{total}
                              </Badge>
                            </div>
                            <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full transition-all ${pct >= 60 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="grid grid-cols-5 gap-1 text-center">
                              {[
                                { l: "Reach", w: myStats.followers > comp.followers },
                                { l: "Eng.", w: myStats.engagementRate > comp.engagementRate },
                                { l: "Likes", w: myStats.avgLikes > comp.avgLikes },
                                { l: "Growth", w: myStats.growthRate > comp.growthRate },
                                { l: "Freq.", w: myStats.postFrequency > comp.postFrequency },
                              ].map((m, i) => (
                                <div key={i} className="space-y-0.5">
                                  <div className={`h-4 w-4 mx-auto rounded-full flex items-center justify-center ${m.w ? "bg-emerald-400/20" : "bg-red-400/20"}`}>
                                    {m.w ? <ArrowUpRight className="h-2.5 w-2.5 text-emerald-400" /> : <ArrowDownRight className="h-2.5 w-2.5 text-red-400" />}
                                  </div>
                                  <p className="text-[8px] text-white/30">{m.l}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Threat Score Distribution + Growth Rate Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Threat Score Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[
                            { name: "High Threat (70+)", value: competitors.filter(c => c.score >= 70).length, fill: "hsl(350,80%,55%)" },
                            { name: "Moderate (40-69)", value: competitors.filter(c => c.score >= 40 && c.score < 70).length, fill: "hsl(30,95%,60%)" },
                            { name: "Low Threat (<40)", value: competitors.filter(c => c.score < 40).length, fill: "hsl(150,60%,50%)" },
                          ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          </Pie>
                          <Tooltip contentStyle={chartTooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Growth Rate Comparison (%/week)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          ...(myStats ? [{ name: `@${myStats.username} (You)`, growth: myStats.growthRate }] : []),
                          ...competitors.map(c => ({ name: `@${c.username}`, growth: c.growthRate })),
                        ]} barCategoryGap="25%">
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%/wk`} />
                          <Bar dataKey="growth" radius={[4, 4, 0, 0]} name="Growth %">
                            {[...(myStats ? [myStats] : []), ...competitors].map((_, i) => (
                              <Cell key={i} fill={i === 0 && myStats ? "hsl(150,60%,50%)" : PIE_COLORS[(myStats ? i - 1 : i) % PIE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Avg Likes + Avg Comments Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Avg Likes per Post</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          ...(myStats ? [{ name: `@${myStats.username}`, likes: myStats.avgLikes }] : []),
                          ...competitors.map(c => ({ name: `@${c.username}`, likes: c.avgLikes })),
                        ]} barCategoryGap="25%">
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtNum(v)} />
                          <Bar dataKey="likes" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} name="Avg Likes" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Avg Comments per Post</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          ...(myStats ? [{ name: `@${myStats.username}`, comments: myStats.avgComments }] : []),
                          ...competitors.map(c => ({ name: `@${c.username}`, comments: c.avgComments })),
                        ]} barCategoryGap="25%">
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Bar dataKey="comments" fill="hsl(30,95%,60%)" radius={[4, 4, 0, 0]} name="Avg Comments" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Efficiency - Likes per 1K Followers */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Engagement Efficiency (Likes per 1K Followers)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        ...(myStats ? [{ name: `@${myStats.username}`, efficiency: myStats.followers > 0 ? Math.round((myStats.avgLikes / myStats.followers) * 1000 * 10) / 10 : 0 }] : []),
                        ...competitors.map(c => ({ name: `@${c.username}`, efficiency: c.followers > 0 ? Math.round((c.avgLikes / c.followers) * 1000 * 10) / 10 : 0 })),
                      ].sort((a, b) => b.efficiency - a.efficiency)} barCategoryGap="25%">
                        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v} likes/1K`} />
                        <Bar dataKey="efficiency" fill="hsl(150,60%,50%)" radius={[4, 4, 0, 0]} name="Likes/1K Followers">
                          {[...(myStats ? [myStats] : []), ...competitors].map((_, i) => (
                            <Cell key={i} fill={i === 0 && myStats ? "hsl(150,60%,50%)" : PIE_COLORS[(myStats ? i - 1 : i) % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Content Format Comparison - Stacked Bar */}
              {competitors.some(c => c.contentTypes.length > 0) && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Content Format Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          const allFormats = [...new Set(competitors.flatMap(c => c.contentTypes.map(ct => ct.type)))];
                          const data = competitors.map(c => {
                            const entry: any = { name: `@${c.username}` };
                            allFormats.forEach(f => { entry[f] = c.contentTypes.find(ct => ct.type === f)?.pct || 0; });
                            return entry;
                          });
                          return (
                            <BarChart data={data} barCategoryGap="25%">
                              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
                              {allFormats.map((f, i) => (
                                <Bar key={f} dataKey={f} stackId="content" fill={PIE_COLORS[i % PIE_COLORS.length]} name={f} />
                              ))}
                              <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                            </BarChart>
                          );
                        })()}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Side-by-Side Comparison */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Side-by-Side Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2 text-white/50 font-medium text-xs">Metric</th>
                          {myStats && <th className="text-center py-2 text-emerald-400 font-medium text-xs">@{myStats.username} (You)</th>}
                          {competitors.map(c => <th key={c.id} className="text-center py-2 text-white/50 font-medium text-xs">@{c.username}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { label: "Followers", key: "followers" as keyof Competitor, myKey: "followers" as keyof typeof myStats, fmt: (v: number) => fmtNum(v), higher: true },
                          { label: "Engagement Rate", key: "engagementRate" as keyof Competitor, myKey: "engagementRate" as keyof typeof myStats, fmt: (v: number) => `${v}%`, higher: true },
                          { label: "Avg Likes", key: "avgLikes" as keyof Competitor, myKey: "avgLikes" as keyof typeof myStats, fmt: (v: number) => v.toLocaleString(), higher: true },
                          { label: "Avg Comments", key: "avgComments" as keyof Competitor, myKey: "avgComments" as keyof typeof myStats, fmt: (v: number) => v.toLocaleString(), higher: true },
                          { label: "Growth/Week", key: "growthRate" as keyof Competitor, myKey: "growthRate" as keyof typeof myStats, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v}%`, higher: true },
                          { label: "Posts/Week", key: "postFrequency" as keyof Competitor, myKey: "postFrequency" as keyof typeof myStats, fmt: (v: number) => `${v}`, higher: true },
                          { label: "Total Posts", key: "posts" as keyof Competitor, myKey: "posts" as keyof typeof myStats, fmt: (v: number) => v.toLocaleString(), higher: true },
                          { label: "Threat Score", key: "score" as keyof Competitor, myKey: null, fmt: (v: number) => `${v}/100`, higher: false },
                          { label: "Likes/1K Followers", key: "avgLikes" as keyof Competitor, myKey: "avgLikes" as keyof typeof myStats, fmt: (v: number, c?: Competitor) => { const f = c ? c.followers : (myStats?.followers || 1); return `${(f > 0 ? (v / f * 1000) : 0).toFixed(1)}`; }, higher: true },
                        ]).map(row => {
                          const compVals = competitors.map(c => c[row.key] as number);
                          const allVals = myStats && row.myKey ? [...compVals, (myStats as any)[row.myKey] as number] : compVals;
                          const best = row.higher ? Math.max(...allVals) : Math.min(...allVals);
                          const myVal = myStats && row.myKey ? (myStats as any)[row.myKey] as number : null;
                          return (
                            <tr key={row.label} className="border-b border-white/[0.03]">
                              <td className="py-2.5 text-white/50 text-xs">{row.label}</td>
                              {myStats && (
                                <td className={`text-center py-2.5 text-xs font-medium ${myVal !== null && myVal === best ? "text-emerald-400 font-bold" : "text-emerald-400/70"}`}>
                                  {myVal !== null ? row.fmt(myVal) : "—"}
                                </td>
                              )}
                              {competitors.map(c => {
                                const val = c[row.key] as number;
                                const isBest = val === best;
                                const userBeats = myVal !== null && row.higher ? myVal > val : myVal !== null ? myVal < val : false;
                                return (
                                  <td key={c.id} className={`text-center py-2.5 text-xs font-medium ${isBest ? "text-emerald-400" : userBeats ? "text-red-400/60" : "text-white/70"}`}>
                                    {row.fmt(val, c)}
                                    {myVal !== null && userBeats && <ArrowDownRight className="inline h-3 w-3 ml-0.5 text-red-400/40" />}
                                  </td>
                                );
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
              {/* Overall score + Opportunity Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" style={{ filter: `drop-shadow(0 0 8px hsl(217,91%,60%,${(gapAnalysis.overallScore || 0) / 200}))` }}>
                          <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(0,0%,100%,0.04)" strokeWidth="4" />
                          <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(217,91%,60%)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${((gapAnalysis.overallScore || 0) / 100) * (2 * Math.PI * 35)} ${2 * Math.PI * 35}`} className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-white">{gapAnalysis.overallScore || "?"}</span>
                          <span className="text-[8px] text-white/30">/ 100</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-medium">Opportunity Score</p>
                        <p className="text-xs text-white/50">{(gapAnalysis.overallScore || 0) >= 70 ? "High opportunity · many gaps to exploit" : (gapAnalysis.overallScore || 0) >= 40 ? "Moderate opportunity · some gaps available" : "Low opportunity · market is well-covered"}</p>
                      </div>
                    </div>
                    {/* Quick gap counts */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Hashtag", count: (gapAnalysis.hashtagGaps || []).length, color: "text-[hsl(217,91%,60%)]" },
                        { label: "Topic", count: (gapAnalysis.topicGaps || []).length, color: "text-emerald-400" },
                        { label: "Format", count: (gapAnalysis.contentFormatGaps || []).length, color: "text-amber-400" },
                        { label: "Timing", count: (gapAnalysis.timingGaps || []).length, color: "text-[hsl(262,83%,58%)]" },
                      ].map((g, i) => (
                        <div key={i} className="text-center p-2 rounded-lg bg-white/[0.02]">
                          <p className={`text-lg font-bold ${g.color}`}>{g.count}</p>
                          <p className="text-[10px] text-white/40">{g.label} Gaps</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Opportunity Radar</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { metric: "Hashtags", value: Math.min((gapAnalysis.hashtagGaps || []).length * 20, 100) },
                          { metric: "Topics", value: Math.min((gapAnalysis.topicGaps || []).length * 20, 100) },
                          { metric: "Formats", value: Math.min((gapAnalysis.contentFormatGaps || []).length * 25, 100) },
                          { metric: "Timing", value: Math.min((gapAnalysis.timingGaps || []).length * 25, 100) },
                          { metric: "Overall", value: gapAnalysis.overallScore || 0 },
                        ]}>
                          <PolarGrid stroke="hsl(217 91% 60% / 0.08)" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                          <PolarRadiusAxis tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke="hsl(217,91%,60%)" fill="hsl(217,91%,60%)" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

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

              {/* AI Content Recommendations */}
              <Card className="crm-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-[hsl(262,83%,58%)] flex items-center gap-2"><Brain className="h-4 w-4" /> AI Content Recommendations</CardTitle>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,58%)]/10 h-7" disabled={contentRecsLoading}
                      onClick={async () => {
                        setContentRecsLoading(true);
                        try {
                          const compData = competitors.map(c => `@${c.username}: ${c.followers} followers, ${c.engagementRate}% ER, top content: ${c.contentTypes.map(ct => `${ct.type}(${ct.pct}%)`).join(",")}, hashtags: ${c.topHashtags.slice(0,3).join(",")}, niche: ${c.metadata?.niche || "unknown"}`).join("\n");
                          const myContext = myStats ? `\nMY STATS: @${myStats.username}: ${myStats.followers} followers, ${myStats.engagementRate}% ER, ${myStats.postFrequency} posts/wk` : "";
                          const aiReply = await callAI(`Analyze these competitors' content and give me specific recommendations to outperform them.${myContext}\n\nCOMPETITORS:\n${compData}\n\nReturn ONLY valid JSON:\n{"contentPillars":[{"pillar":"name","description":"why","frequency":"posts/week","expectedEngagement":"X%"}],"hookFormulas":[{"formula":"the hook template","example":"concrete example","whyItWorks":"reason"}],"postingSchedule":{"bestDays":["Mon","Wed"],"bestTimes":["9am","7pm"],"reasoning":"why"},"contentCalendar":[{"day":"Monday","contentType":"Reel","topic":"specific topic","hashtags":["tag1","tag2"],"hookIdea":"specific hook"}],"stealableStrategies":[{"from":"@competitor","strategy":"what they do","howToAdapt":"how to do it better"}]}`);
                          setContentRecs(parseJSON(aiReply));
                          toast.success("Content recommendations generated");
                        } catch (err: any) { toast.error(err?.message || "Failed"); }
                        finally { setContentRecsLoading(false); }
                      }}>
                      {contentRecsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {contentRecsLoading ? "Analyzing..." : "Generate Recs"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {contentRecsLoading ? (
                    <div className="text-center py-6"><Loader2 className="h-6 w-6 text-[hsl(262,83%,58%)] mx-auto animate-spin" /><p className="text-xs text-white/40 mt-2">Analyzing competitor content patterns...</p></div>
                  ) : contentRecs ? (
                    <div className="space-y-4">
                      {/* Content Pillars */}
                      <div>
                        <p className="text-xs font-medium text-white/50 mb-2">Content Pillars to Own</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(contentRecs.contentPillars || []).map((p: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-[hsl(262,83%,58%)]/5 border border-[hsl(262,83%,58%)]/15 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-white/80">{p.pillar}</span>
                                <Badge variant="outline" className="text-[9px] border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)]">{p.frequency}</Badge>
                              </div>
                              <p className="text-[10px] text-white/50">{p.description}</p>
                              <p className="text-[10px] text-emerald-400">Expected: {p.expectedEngagement}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hook Formulas */}
                      <div>
                        <p className="text-xs font-medium text-white/50 mb-2">Proven Hook Formulas</p>
                        <div className="space-y-2">
                          {(contentRecs.hookFormulas || []).map((h: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                              <p className="text-xs font-medium text-amber-400">"{h.formula}"</p>
                              <p className="text-[10px] text-white/60 italic">Example: {h.example}</p>
                              <p className="text-[10px] text-white/40">{h.whyItWorks}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Posting Schedule */}
                      {contentRecs.postingSchedule && (
                        <div className="p-3 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/15">
                          <p className="text-xs font-medium text-[hsl(217,91%,60%)] mb-1">Optimal Posting Schedule</p>
                          <div className="flex gap-2 mb-1">
                            {(contentRecs.postingSchedule.bestDays || []).map((d: string) => <Badge key={d} variant="outline" className="text-[9px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]">{d}</Badge>)}
                            {(contentRecs.postingSchedule.bestTimes || []).map((t: string) => <Badge key={t} variant="outline" className="text-[9px] border-emerald-400/20 text-emerald-400">{t}</Badge>)}
                          </div>
                          <p className="text-[10px] text-white/40">{contentRecs.postingSchedule.reasoning}</p>
                        </div>
                      )}

                      {/* Weekly Content Calendar */}
                      {(contentRecs.contentCalendar || []).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-white/50 mb-2">Weekly Content Calendar</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {contentRecs.contentCalendar.map((day: any, i: number) => (
                              <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)] text-[9px]">{day.day}</Badge>
                                  <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{day.contentType}</Badge>
                                </div>
                                <p className="text-xs text-white/70">{day.topic}</p>
                                <p className="text-[10px] text-amber-400/70">Hook: {day.hookIdea}</p>
                                <div className="flex gap-1 flex-wrap">{(day.hashtags || []).map((t: string) => <span key={t} className="text-[9px] text-[hsl(217,91%,60%)]/50">#{t}</span>)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stealable Strategies */}
                      {(contentRecs.stealableStrategies || []).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-white/50 mb-2">Strategies to Steal & Improve</p>
                          {contentRecs.stealableStrategies.map((s: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-amber-400/5 border border-amber-400/15 space-y-1 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/70">From <span className="text-amber-400 font-medium">{s.from}</span></span>
                              </div>
                              <p className="text-[10px] text-white/60">They do: {s.strategy}</p>
                              <p className="text-[10px] text-emerald-400">Your version: {s.howToAdapt}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 text-center py-4">Click "Generate Recs" for AI-powered content strategy based on competitor analysis</p>
                  )}
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
            <div className="space-y-4">
              {/* SWOT Quadrant Score Visual + Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="crm-card">
                  <CardContent className="p-5">
                    <div className="grid grid-cols-2 gap-0.5 max-w-md mx-auto">
                      {[
                        { key: "strengths", label: "S", fullLabel: "Strengths", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-400/20", text: "text-emerald-400" },
                        { key: "weaknesses", label: "W", fullLabel: "Weaknesses", color: "from-red-400/20 to-red-400/5", border: "border-red-400/20", text: "text-red-400" },
                        { key: "opportunities", label: "O", fullLabel: "Opportunities", color: "from-[hsl(217,91%,60%)]/20 to-[hsl(217,91%,60%)]/5", border: "border-[hsl(217,91%,60%)]/20", text: "text-[hsl(217,91%,60%)]" },
                        { key: "threats", label: "T", fullLabel: "Threats", color: "from-amber-400/20 to-amber-400/5", border: "border-amber-400/20", text: "text-amber-400" },
                      ].map((q) => {
                        const items = (swotResult as any)[q.key] || [];
                        const highCount = items.filter((i: any) => typeof i !== "string" && i.priority === "high").length;
                        return (
                          <div key={q.key} className={`p-4 rounded-xl bg-gradient-to-br ${q.color} border ${q.border} text-center space-y-1`}>
                            <span className={`text-2xl font-black ${q.text}`}>{q.label}</span>
                            <p className={`text-[10px] font-medium ${q.text}`}>{q.fullLabel}</p>
                            <p className="text-lg font-bold text-white">{items.length}</p>
                            {highCount > 0 && <Badge className="bg-red-400/15 text-red-400 text-[8px]">{highCount} critical</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* SWOT Radar Chart */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">SWOT Impact Radar</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { metric: "Strengths", value: Math.min(((swotResult as any).strengths || []).length * 18, 100), highPriority: ((swotResult as any).strengths || []).filter((i: any) => i.priority === "high").length * 25 },
                          { metric: "Weaknesses", value: Math.min(((swotResult as any).weaknesses || []).length * 18, 100), highPriority: ((swotResult as any).weaknesses || []).filter((i: any) => i.priority === "high").length * 25 },
                          { metric: "Opportunities", value: Math.min(((swotResult as any).opportunities || []).length * 18, 100), highPriority: ((swotResult as any).opportunities || []).filter((i: any) => i.priority === "high").length * 25 },
                          { metric: "Threats", value: Math.min(((swotResult as any).threats || []).length * 18, 100), highPriority: ((swotResult as any).threats || []).filter((i: any) => i.priority === "high").length * 25 },
                        ]}>
                          <PolarGrid stroke="hsl(217 91% 60% / 0.08)" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                          <PolarRadiusAxis tick={false} axisLine={false} />
                          <Radar name="Total Items" dataKey="value" stroke="hsl(217,91%,60%)" fill="hsl(217,91%,60%)" fillOpacity={0.15} strokeWidth={2} />
                          <Radar name="High Priority" dataKey="highPriority" stroke="hsl(350,80%,55%)" fill="hsl(350,80%,55%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />
                          <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verdict + Top Action */}
              {(swotResult as any).overallVerdict && (
                <Card className="crm-card border-[hsl(217,91%,60%)]/15">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-white/70">{(swotResult as any).overallVerdict}</p>
                    {(swotResult as any).topAction && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-400/5 border border-emerald-400/15">
                        <Zap className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase">Top Priority Action</p>
                          <p className="text-xs text-white/70">{(swotResult as any).topAction}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { key: "strengths" as const, label: "Strengths", colorClass: "text-emerald-400", borderClass: "border-emerald-400/15", bgClass: "bg-emerald-400", icon: Shield },
                  { key: "weaknesses" as const, label: "Weaknesses", colorClass: "text-red-400", borderClass: "border-red-400/15", bgClass: "bg-red-400", icon: TrendingDown },
                  { key: "opportunities" as const, label: "Opportunities", colorClass: "text-[hsl(217,91%,60%)]", borderClass: "border-[hsl(217,91%,60%)]/15", bgClass: "bg-[hsl(217,91%,60%)]", icon: Zap },
                  { key: "threats" as const, label: "Threats", colorClass: "text-amber-400", borderClass: "border-amber-400/15", bgClass: "bg-amber-400", icon: Flame },
                ]).map(({ key, label, colorClass, borderClass, bgClass, icon: Icon }) => (
                  <Card key={key} className={`crm-card ${borderClass}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm font-medium flex items-center gap-2 ${colorClass}`}>
                        <Icon className="h-4 w-4" /> {label}
                        <Badge variant="outline" className="ml-auto text-[9px] border-white/10 text-white/30">{((swotResult as any)[key] || []).length} items</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {((swotResult as any)[key] || []).map((item: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                          <div className="flex items-start gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${bgClass} flex-shrink-0`} />
                            <p className="text-sm text-white/70 flex-1">{typeof item === "string" ? item : item.text}</p>
                            {typeof item !== "string" && item.priority && (
                              <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${item.priority === "high" ? "border-red-400/20 text-red-400" : item.priority === "medium" ? "border-amber-400/20 text-amber-400" : "border-white/10 text-white/40"}`}>{item.priority}</Badge>
                            )}
                          </div>
                          {typeof item !== "string" && item.action && (
                            <div className="flex items-start gap-1.5 ml-3.5">
                              <ArrowUpRight className="h-3 w-3 text-emerald-400/60 mt-0.5 flex-shrink-0" />
                              <p className="text-[10px] text-emerald-400/80">{item.action}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="text-xs gap-1 border-white/10 text-white/50" onClick={() => { navigator.clipboard.writeText(JSON.stringify(swotResult, null, 2)); toast.success("SWOT copied"); }}>
                  <Copy className="h-3 w-3" /> Copy SWOT
                </Button>
              </div>
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

        {/* ═══ BATTLE PLAN TAB ═══ */}
        <TabsContent value="battleplan" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/80 flex items-center gap-2"><Crown className="h-4 w-4 text-amber-400" /> Weekly Battle Plan</h3>
                  <p className="text-xs text-white/40 mt-0.5">AI generates a specific weekly action plan to outperform all tracked competitors</p>
                </div>
                <Button disabled={battlePlanLoading || competitors.length === 0} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white gap-1.5"
                  onClick={async () => {
                    setBattlePlanLoading(true);
                    try {
                      const compData = competitors.map(c => `@${c.username}(${c.platform}): ${c.followers} followers, ${c.engagementRate}% ER, ${c.growthRate}% growth, ${c.postFrequency} posts/wk, niche: ${c.metadata?.niche || "?"}, hashtags: ${c.topHashtags.slice(0,3).join(",")}`).join("\n");
                      const myContext = myStats ? `\nMY STATS: @${myStats.username}: ${myStats.followers} followers, ${myStats.engagementRate}% ER, ${myStats.avgLikes} avg likes, ${myStats.growthRate}% growth, ${myStats.postFrequency} posts/wk` : "\nNo user stats provided.";
                      const aiReply = await callAI(`Create an aggressive weekly battle plan to outperform these competitors.${myContext}\n\nCOMPETITORS:\n${compData}\n\nReturn ONLY valid JSON:\n{"weeklyGoals":[{"goal":"specific measurable goal","metric":"what to track","target":"specific number"}],"dailyActions":{"monday":{"morning":"action","afternoon":"action","evening":"action"},"tuesday":{"morning":"action","afternoon":"action","evening":"action"},"wednesday":{"morning":"action","afternoon":"action","evening":"action"},"thursday":{"morning":"action","afternoon":"action","evening":"action"},"friday":{"morning":"action","afternoon":"action","evening":"action"},"saturday":{"morning":"action","evening":"action"},"sunday":{"morning":"action","evening":"action"}},"quickWins":[{"action":"do this now","impact":"high/medium","timeNeeded":"30min","expectedResult":"what happens"}],"competitorVulnerabilities":[{"competitor":"@name","vulnerability":"their weakness","exploit":"how to exploit it","priority":"high/medium/low"}],"growthHacks":[{"hack":"specific tactic","difficulty":"easy/medium/hard","expectedGrowth":"X% or X followers","timeline":"1 week"}],"contentBombs":[{"title":"viral content idea","format":"reel/carousel/story","hook":"opening hook","whyViral":"reason it would go viral"}]}`);
                      setBattlePlan(parseJSON(aiReply));
                      toast.success("Battle plan generated!");
                    } catch (err: any) { toast.error(err?.message || "Failed"); }
                    finally { setBattlePlanLoading(false); }
                  }}>
                  {battlePlanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                  {battlePlanLoading ? "Planning..." : "Generate Battle Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {battlePlanLoading ? (
            <Card className="crm-card"><CardContent className="p-12 text-center"><Loader2 className="h-8 w-8 text-amber-400 mx-auto animate-spin mb-3" /><p className="text-white/50 text-sm">Crafting your dominance strategy...</p></CardContent></Card>
          ) : battlePlan ? (
            <div className="space-y-4">
              {/* Weekly Goals */}
              <Card className="crm-card border-amber-400/15">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><Target className="h-4 w-4" /> Weekly Goals</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(battlePlan.weeklyGoals || []).map((g: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/15 space-y-1">
                        <p className="text-xs font-medium text-white/80">{g.goal}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] border-amber-400/20 text-amber-400">{g.metric}</Badge>
                          <span className="text-[10px] text-emerald-400 font-bold">{g.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Wins */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Wins (Do Now)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(battlePlan.quickWins || []).map((w: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-emerald-400/5 border border-emerald-400/15">
                      <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${w.impact === "high" ? "bg-red-400/20 text-red-400" : "bg-amber-400/20 text-amber-400"}`}>{w.impact}</div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-medium text-white/80">{w.action}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/40">⏱ {w.timeNeeded}</span>
                          <span className="text-[10px] text-emerald-400">→ {w.expectedResult}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Competitor Vulnerabilities */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Competitor Vulnerabilities to Exploit</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(battlePlan.competitorVulnerabilities || []).map((v: any, i: number) => (
                    <div key={i} className="p-2.5 rounded-lg bg-red-400/5 border border-red-400/15 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/80">{v.competitor}</span>
                        <Badge variant="outline" className={`text-[9px] ${v.priority === "high" ? "border-red-400/30 text-red-400" : "border-white/10 text-white/40"}`}>{v.priority}</Badge>
                      </div>
                      <p className="text-[10px] text-white/50">Weakness: {v.vulnerability}</p>
                      <p className="text-[10px] text-amber-400">→ {v.exploit}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Growth Hacks */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(217,91%,60%)] flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Growth Hacks</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(battlePlan.growthHacks || []).map((h: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                        <p className="text-xs font-medium text-white/80">{h.hack}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] ${h.difficulty === "easy" ? "border-emerald-400/20 text-emerald-400" : h.difficulty === "hard" ? "border-red-400/20 text-red-400" : "border-amber-400/20 text-amber-400"}`}>{h.difficulty}</Badge>
                          <span className="text-[10px] text-emerald-400">+{h.expectedGrowth}</span>
                          <span className="text-[10px] text-white/30">{h.timeline}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Content Bombs */}
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(262,83%,58%)] flex items-center gap-2"><Flame className="h-4 w-4" /> Viral Content Bombs</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(battlePlan.contentBombs || []).map((b: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[hsl(262,83%,58%)]/5 border border-[hsl(262,83%,58%)]/15 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white/80">{b.title}</span>
                          <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{b.format}</Badge>
                        </div>
                        <p className="text-[10px] text-amber-400">Hook: "{b.hook}"</p>
                        <p className="text-[10px] text-white/40">{b.whyViral}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Daily Actions */}
              {battlePlan.dailyActions && (
                <Card className="crm-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><Calendar className="h-4 w-4" /> Daily Action Schedule</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {Object.entries(battlePlan.dailyActions).map(([day, actions]: [string, any]) => (
                        <div key={day} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                          <p className="text-xs font-medium text-white/80 capitalize">{day}</p>
                          {Object.entries(actions || {}).map(([time, action]: [string, any]) => (
                            <div key={time} className="flex items-start gap-2">
                              <span className="text-[9px] text-white/30 uppercase w-14 shrink-0 pt-0.5">{time}</span>
                              <span className="text-[10px] text-white/60">{String(action)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="text-xs gap-1 border-white/10 text-white/50" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(battlePlan, null, 2));
                  toast.success("Battle plan copied");
                }}><Copy className="h-3 w-3" /> Copy Plan</Button>
              </div>
            </div>
          ) : (
            <Card className="crm-card">
              <CardContent className="p-12 text-center">
                <Crown className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-medium mb-1">{competitors.length === 0 ? "Add competitors first" : "Generate your battle plan"}</h3>
                <p className="text-white/30 text-sm">Get a specific weekly action plan with quick wins, growth hacks, and competitor vulnerabilities to exploit</p>
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

                            // ─── Collect ALL URL sources from every part of scrape result ───
                            const toArr = (v: unknown): any[] => Array.isArray(v) ? v : [];
                            const baseUrl = scrapeResult?.finalUrl || scrapeResult?.url || '';
                            const baseOrigin = (() => { try { return new URL(baseUrl).origin; } catch { return ''; } })();
                            const baseHost = (() => { try { return new URL(baseUrl).hostname; } catch { return ''; } })();

                            const normalizeUrl = (raw: string): string => {
                              if (!raw || typeof raw !== 'string') return '';
                              let u = raw.trim().replace(/&amp;/g, '&').replace(/^[\s"'`(\[]+|[\s"'`,;:)>\]]+$/g, '');
                              if (!u) return '';
                              if (/^(mailto:|tel:|javascript:|data:)/i.test(u)) return '';
                              if (u.startsWith('//')) u = `https:${u}`;
                              if (u.startsWith('/')) {
                                if (!baseOrigin) return '';
                                u = `${baseOrigin}${u}`;
                              }
                              if (!u.startsWith('http://') && !u.startsWith('https://')) {
                                if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(u)) {
                                  u = `https://${u}`;
                                } else {
                                  return '';
                                }
                              }
                              try {
                                const parsed = new URL(u);
                                if (!['http:', 'https:'].includes(parsed.protocol)) return '';
                                parsed.protocol = 'https:';
                                parsed.hash = '';
                                return parsed.href;
                              } catch {
                                return '';
                              }
                            };

                            const extractStr = (v: any): string => typeof v === 'string' ? v : v?.href || v?.url || v?.src || v?.domain || '';
                            const extractUrlish = (text: string): string[] => {
                              if (!text) return [];
                              const out = new Set<string>();
                              const patterns = [
                                /https?:\/\/[^\s"'`<>\\)]+/gi,
                                /\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`<>\\)]*/gi,
                                /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[\w\-./?%&=+#:]*)?/gi,
                              ];
                              for (const ptn of patterns) {
                                let m: RegExpExecArray | null;
                                let guard = 0;
                                while ((m = ptn.exec(text)) !== null && guard++ < 2000) {
                                  const resolved = normalizeUrl(m[0]);
                                  if (resolved) out.add(resolved);
                                }
                              }
                              return [...out];
                            };

                            const walkObjectForUrlStrings = (input: any): string[] => {
                              const stack: any[] = [input];
                              const found = new Set<string>();
                              let guard = 0;

                              while (stack.length && guard++ < 10000) {
                                const current = stack.pop();
                                if (!current) continue;

                                if (typeof current === 'string') {
                                  const normalized = normalizeUrl(current);
                                  if (normalized) found.add(normalized);
                                  for (const extracted of extractUrlish(current)) found.add(extracted);
                                  continue;
                                }

                                if (Array.isArray(current)) {
                                  for (const item of current) stack.push(item);
                                  continue;
                                }

                                if (typeof current === 'object') {
                                  for (const v of Object.values(current)) stack.push(v);
                                }
                              }

                              return [...found];
                            };

                            const rawUrls: string[] = [
                              ...toArr(scrapeResult?.scripts?.external).map(extractStr),
                              ...toArr(scrapeResult?.scripts?.stylesheets).map(extractStr),
                              ...toArr(scrapeResult?.resourceUrls).map(extractStr),
                              ...toArr(scrapeResult?.links?.external).map(extractStr),
                              ...toArr(scrapeResult?.links?.internal).map(extractStr),
                              ...toArr(scrapeResult?.iframes).map(extractStr),
                              ...toArr(scrapeResult?.scanCoverage?.scannedUrls).map(extractStr),
                              ...toArr(scrapeResult?.scanCoverage?.sitemapSample).map(extractStr),
                              ...toArr(scrapeResult?.scanCoverage?.subdomainsFound).map((s: string) => `https://${s}`),
                              ...toArr(scrapeResult?.scanCoverage?.domainsFound).map((d: string) => `https://${d}`),
                              ...toArr(scrapeResult?.urlDiscovery?.all).map(extractStr),
                              ...toArr(scrapeResult?.urlDiscovery?.firstParty).map(extractStr),
                              ...toArr(scrapeResult?.urlDiscovery?.thirdParty).map(extractStr),
                              ...toArr(scrapeResult?.images?.samples).map((img: any) => extractStr(img)),
                              ...toArr(scrapeResult?.fonts?.googleFonts).map(extractStr),
                              ...toArr(scrapeResult?.fonts?.adobeFonts).map(extractStr),
                              ...toArr(scrapeResult?.fonts?.customFonts).map(extractStr),
                              ...Object.values(scrapeResult?.socialLinks || {}).flatMap((v: any) => Array.isArray(v) ? v : [v]).map(extractStr),
                              scrapeResult?.openGraph?.image || '',
                              scrapeResult?.openGraph?.url || '',
                              scrapeResult?.twitterCard?.image || '',
                              scrapeResult?.basic?.canonical || '',
                              scrapeResult?.basic?.generator || '',
                              ...(scrapeResult?.screenshotUrl ? [scrapeResult.screenshotUrl] : []),
                            ];

                            const objectHarvestedUrls = walkObjectForUrlStrings(scrapeResult);
                            const hostSeeds = [
                              baseHost,
                              ...toArr(scrapeResult?.scanCoverage?.subdomainsFound),
                              ...toArr(scrapeResult?.scanCoverage?.domainsFound),
                            ].filter((v): v is string => typeof v === 'string' && !!v);

                            const allUrls = [...new Set([
                              ...rawUrls.map(normalizeUrl),
                              ...objectHarvestedUrls,
                              ...hostSeeds.map((h) => normalizeUrl(`https://${h}`)),
                            ].filter((u): u is string => typeof u === 'string' && u.startsWith('https://')))];

                            // ─── Comprehensive provider → domain/path signature map ───
                            const KNOWN_SIGS: Record<string, string[]> = {
                              // CDN
                              "Cloudflare CDN": ["cdnjs.cloudflare.com","cdn-cgi/","cloudflare.com","cloudflareinsights.com","ajax.cloudflare.com"],
                              "AWS CloudFront": ["cloudfront.net",".cloudfront.net/"],
                              "Akamai": ["akamai.net","akamaized.net","akamaistream.net","akamaihd.net","edgekey.net","edgesuite.net","akadns.net","akstat.io"],
                              "cdnjs": ["cdnjs.cloudflare.com/ajax/libs"],
                              "YouTube CDN": ["ytimg.com","youtube.com","googlevideo.com","yt3.ggpht.com","youtube-nocookie.com","i.ytimg.com","s.ytimg.com"],
                              "Facebook Ad CDN": ["fbcdn.net","facebook.com/tr","connect.facebook.net","facebook.net","fbsbx.com"],
                              "Facebook CDN": ["fbcdn.net","fbstatic","static.xx.fbcdn.net","facebook.com","scontent."],
                              "New Relic CDN": ["nr-data.net","newrelic.com","js-agent.newrelic.com","bam.nr-data.net","bam-cell.nr-data.net"],
                              "jsDelivr": ["cdn.jsdelivr.net","jsdelivr.net"],
                              "unpkg": ["unpkg.com"],
                              "KeyCDN": ["kxcdn.com","keycdn.com"],
                              "Fastly": ["fastly.net","fastlylb.net","global.ssl.fastly.net","a.fastly.net","dualstack."],
                              "StackPath": ["stackpathcdn.com","stackpath.com","bootstrapcdn.com","maxcdn.bootstrapcdn.com"],
                              "BunnyCDN": ["b-cdn.net","bunnycdn.com","bunny.net"],
                              "Google CDN": ["ajax.googleapis.com","fonts.googleapis.com","fonts.gstatic.com","storage.googleapis.com","gstatic.com","googleusercontent.com","lh3.googleusercontent","lh4.googleusercontent","lh5.googleusercontent","lh6.googleusercontent"],
                              "Cloudinary CDN": ["res.cloudinary.com","cloudinary.com"],
                              "Imgix": ["imgix.net"],
                              "Amazon S3": ["s3.amazonaws.com","s3-us-","s3-eu-","s3-ap-",".s3.amazonaws",".s3.us-",".s3.eu-"],
                              // Frameworks
                              "React": ["react.production","react-dom","_react","__react","react.development"],
                              "Next.js": ["/_next/","__next","__NEXT_DATA__","_next/static","_next/image"],
                              "Vue.js": ["vue.js","vue.min.js","vuejs.org","vue.global","vue.esm","vue.runtime"],
                              "Angular": ["angular.min","ng-version","angular.io","zone.js","angular-cli","angular.json"],
                              "Ember.js": ["ember.","emberjs.com","ember-cli","ember.min"],
                              "Vite": ["/@vite/","vite/","vitejs.dev","@vitejs"],
                              "Svelte": ["svelte","__svelte","svelte-kit"],
                              "Nuxt": ["_nuxt/","__NUXT__","nuxt."],
                              "jQuery": ["jquery.","jquery/","jquery.min","code.jquery.com","jquery-"],
                              "Gatsby": ["gatsby","__gatsby"],
                              "Remix": ["remix.run"],
                              "Astro": ["astro.build"],
                              "Tailwind CSS": ["tailwindcss","tailwind.min"],
                              "Bootstrap": ["bootstrap.min","bootstrap.bundle","getbootstrap.com","bootstrap.css","bootstrap.js"],
                              "Material UI": ["mui.com","@mui/"],
                              "Alpine.js": ["alpinejs","cdn.jsdelivr.net/npm/alpinejs"],
                              "HTMX": ["htmx.org","hx-get","hx-post"],
                              // Hosting
                              "Cloudflare": ["cloudflare.com","cdn-cgi/","cloudflareinsights.com","challenges.cloudflare.com"],
                              "Vercel": ["vercel.app","vercel.com","vercel-insights","va.vercel-scripts.com","_vercel","vercel-analytics"],
                              "Netlify": ["netlify.app","netlify.com","netlify-cms","/.netlify/"],
                              "AWS": ["amazonaws.com","aws.amazon.com","s3.amazonaws","elasticbeanstalk.com","execute-api","amplifyapp.com"],
                              "Google Cloud": ["googleapis.com","google.com","gstatic.com","firebase","cloudfunctions.net","run.app"],
                              "Heroku": ["herokuapp.com","heroku.com"],
                              "DigitalOcean": ["digitaloceanspaces.com","digitalocean.com"],
                              "Fly.io": ["fly.dev","fly.io"],
                              "Railway": ["railway.app"],
                              "Render": ["onrender.com"],
                              // Analytics
                              "Google Analytics": ["google-analytics.com","analytics.js","gtag/js","googletagmanager.com","ga.js","collect?v=","analytics.google.com"],
                              "Google Tag Manager": ["googletagmanager.com","gtm.js","tagmanager.google.com"],
                              "Segment": ["segment.com","segment.io","cdn.segment.com","analytics.min.js","api.segment.io"],
                              "Mixpanel": ["mixpanel.com","mxpnl.com","cdn.mxpnl.com","api.mixpanel.com"],
                              "Amplitude": ["amplitude.com","cdn.amplitude.com","amplitude.min","api.amplitude.com","api2.amplitude.com"],
                              "Hotjar": ["hotjar.com","static.hotjar.com","script.hotjar.com","vars.hotjar.com"],
                              "Heap": ["heap.io","heapanalytics.com","cdn.heapanalytics.com"],
                              "Plausible": ["plausible.io"],
                              "PostHog": ["posthog.com","app.posthog.com","us.posthog.com","eu.posthog.com"],
                              "Clarity": ["clarity.ms","microsoft.com/clarity"],
                              "FullStory": ["fullstory.com","rs.fullstory.com","edge.fullstory.com"],
                              "LogRocket": ["logrocket.com","cdn.logrocket.io","lr-in.com","cdn.lr-in.com","cdn.lr-ingest.io"],
                              "Pendo": ["pendo.io","cdn.pendo.io","app.pendo.io"],
                              "Kissmetrics": ["kissmetrics.com","i.kissmetrics.com"],
                              "Mouseflow": ["mouseflow.com","cdn.mouseflow.com"],
                              "Lucky Orange": ["luckyorange.com","tools.luckyorange.com"],
                              "Matomo": ["matomo.","piwik.","cdn.matomo.cloud"],
                              "Fathom": ["usefathom.com","cdn.usefathom.com"],
                              "Simple Analytics": ["simpleanalytics.com","scripts.simpleanalyticscdn.com"],
                              // Payments
                              "Stripe": ["stripe.com","js.stripe.com","stripe.network","m.stripe.com","m.stripe.network","api.stripe.com","checkout.stripe.com"],
                              "PayPal": ["paypal.com","paypalobjects.com","braintreegateway.com","braintree-api.com","paypal.me"],
                              "Braintree": ["braintreegateway.com","braintree-api.com","js.braintreegateway.com"],
                              "Square": ["squareup.com","squareupsandbox.com","square.site","squarecdn.com","js.squareup.com"],
                              "Paddle": ["paddle.com","cdn.paddle.com"],
                              "LemonSqueezy": ["lemonsqueezy.com","lmsqueezy.com"],
                              "Razorpay": ["razorpay.com","checkout.razorpay.com"],
                              "Mollie": ["mollie.com","js.mollie.com"],
                              "Klarna": ["klarna.com","js.klarna.com","x.klarnacdn.net"],
                              "Afterpay": ["afterpay.com","static.afterpay.com"],
                              "Affirm": ["affirm.com","cdn1.affirm.com"],
                              // E-commerce
                              "Shopify": ["shopify.com","cdn.shopify.com","myshopify.com","shopifycdn.com","shopify-assets"],
                              "WooCommerce": ["woocommerce","wc-ajax","/?wc-api"],
                              "BigCommerce": ["bigcommerce.com","mybigcommerce.com"],
                              "Magento": ["magento","mage/","static.magento"],
                              "PrestaShop": ["prestashop.com","prestashop"],
                              "Salesforce Commerce": ["demandware.net","salesforce-commerce"],
                              "Gumroad": ["gumroad.com","assets.gumroad.com"],
                              "Etsy": ["etsy.com","etsystatic.com"],
                              // Security
                              "reCAPTCHA": ["recaptcha","google.com/recaptcha","gstatic.com/recaptcha","recaptcha.net"],
                              "hCaptcha": ["hcaptcha.com","js.hcaptcha.com"],
                              "Cloudflare Turnstile": ["challenges.cloudflare.com/turnstile","challenges.cloudflare.com"],
                              "New Relic": ["newrelic.com","nr-data.net","js-agent.newrelic","bam.nr-data","bam-cell.nr-data"],
                              "Sentry": ["sentry.io","browser.sentry-cdn.com","sentry-cdn.com","o0.ingest.sentry.io"],
                              "Auth0": ["auth0.com","cdn.auth0.com",".auth0.com"],
                              "Okta": ["okta.com",".oktacdn.com"],
                              "Clerk": ["clerk.com","clerk.dev","clerk.accounts.dev"],
                              // Observability
                              "Datadog": ["datadoghq.com","datadog-agent","dd-agent","datadoghq.eu","ddog-gov.com","browser-intake-datadoghq"],
                              "Bugsnag": ["bugsnag.com","d2wy8f7a9ursnm.cloudfront.net"],
                              "Rollbar": ["rollbar.com","cdn.rollbar.com"],
                              // Social APIs
                              "Facebook SDK": ["connect.facebook.net","facebook.com/plugins","fbcdn.net","fb.com","facebook.com/v"],
                              "YouTube Embed": ["youtube.com/embed","youtube-nocookie.com/embed","ytimg.com"],
                              "Twitter/X": ["platform.twitter.com","twitter.com/widgets","x.com","cdn.syndication.twimg.com","pbs.twimg.com","abs.twimg.com"],
                              "Instagram": ["instagram.com","cdninstagram.com","scontent-"],
                              "TikTok": ["tiktok.com","sf16-website-login","tiktokcdn.com","byteoversea.com"],
                              "LinkedIn": ["platform.linkedin.com","linkedin.com","licdn.com","media.licdn.com"],
                              "Pinterest": ["pinimg.com","pinterest.com","assets.pinterest.com","ct.pinterest.com"],
                              "Reddit": ["reddit.com","redditstatic.com","redditmedia.com"],
                              "Snapchat": ["snapchat.com","snap.com","sc-cdn.net","sc-static.net"],
                              "Spotify": ["spotify.com","open.spotify.com","scdn.co","i.scdn.co"],
                              "Twitch": ["twitch.tv","player.twitch.tv","static.twitchcdn.net"],
                              "Discord": ["discord.com","discord.gg","discordapp.com","cdn.discordapp.com"],
                              "WhatsApp": ["whatsapp.com","wa.me","api.whatsapp.com"],
                              "Telegram": ["telegram.org","t.me","core.telegram.org"],
                              // Engagement
                              "Intercom": ["intercom.io","intercomcdn.com","widget.intercom.io","js.intercomcdn.com","api.intercom.io"],
                              "Drift": ["drift.com","js.driftt.com","driftt.com"],
                              "Zendesk": ["zendesk.com","zdassets.com","zopim.com","static.zdassets.com","ekr.zdassets.com"],
                              "Crisp": ["crisp.chat","client.crisp.chat"],
                              "HubSpot": ["hubspot.com","hs-analytics.net","hs-scripts.com","hsforms.com","hubspot.net","hscollectedforms.net","hsadspixel.net","js.hs-scripts.com","js.hubspot.com","forms.hubspot.com","track.hubspot.com","api.hubspot.com"],
                              "Iterable In-App": ["iterable.com","js.iterable.com","api.iterable.com"],
                              "LiveChat": ["livechatinc.com","livechat.com","cdn.livechatinc.com"],
                              "Tawk.to": ["tawk.to","embed.tawk.to"],
                              "Freshdesk": ["freshdesk.com","freshworks.com","fw-cdn.com"],
                              "OneSignal": ["onesignal.com","cdn.onesignal.com"],
                              "Pusher": ["pusher.com","js.pusher.com"],
                              "Beamer": ["getbeamer.com","app.getbeamer.com"],
                              "Appcues": ["appcues.com","fast.appcues.com"],
                              "Wistia": ["wistia.com","fast.wistia.com","fast.wistia.net","embed.wistia.com","embedwistia-a.akamaihd.net"],
                              "Vimeo": ["vimeo.com","player.vimeo.com","vimeocdn.com","i.vimeocdn.com","f.vimeocdn.com"],
                              "Loom": ["loom.com","cdn.loom.com"],
                              "Calendly": ["calendly.com","assets.calendly.com"],
                              "Cal.com": ["cal.com","app.cal.com"],
                              "Tidio": ["tidio.co","code.tidio.co"],
                              // Marketing / Email
                              "Mailchimp": ["mailchimp.com","chimpstatic.com","list-manage.com","mc.us","mcusercontent.com"],
                              "SendGrid": ["sendgrid.net","sendgrid.com"],
                              "Klaviyo": ["klaviyo.com","static.klaviyo.com","a.klaviyo.com"],
                              "ActiveCampaign": ["activecampaign.com","trackcmp.net"],
                              "ConvertKit": ["convertkit.com","convertkit-mail2.com"],
                              "Brevo": ["brevo.com","sendinblue.com"],
                              "Customer.io": ["customer.io","track.customer.io"],
                              "Drip": ["getdrip.com","d33wubrfki0l68.cloudfront.net"],
                              // CRM
                              "Salesforce": ["salesforce.com","force.com","sfdc.net","salesforceliveagent.com","my.salesforce.com"],
                              "Pipedrive": ["pipedrive.com"],
                              "Zoho": ["zoho.com","zoho.eu","zohocdn.com"],
                              // Ads
                              "Google Ads": ["googlesyndication.com","googleadservices.com","doubleclick.net","google.com/pagead","adservice.google","pagead2.googlesyndication"],
                              "Google AdSense": ["pagead2.googlesyndication.com","adsbygoogle"],
                              "Facebook Pixel": ["facebook.com/tr","connect.facebook.net/en_US/fbevents","fbevents.js"],
                              "Bing Ads": ["bat.bing.com","bing.com/bat"],
                              "TikTok Pixel": ["analytics.tiktok.com","tiktok.com/i18n"],
                              "Criteo": ["criteo.com","static.criteo.net","dis.criteo.com"],
                              "Taboola": ["taboola.com","cdn.taboola.com","trc.taboola.com"],
                              "Outbrain": ["outbrain.com","widgets.outbrain.com"],
                              "Amazon Ads": ["amazon-adsystem.com"],
                              "AdRoll": ["adroll.com","d.adroll.com"],
                              "MediaVine": ["mediavine.com","scripts.mediavine.com"],
                              "Carbon Ads": ["carbonads.com","cdn.carbonads.com","srv.carbonads.net"],
                              "LinkedIn Ads": ["snap.licdn.com","linkedin.com/li.lms-analytics","px.ads.linkedin.com"],
                              "Twitter Ads": ["static.ads-twitter.com","analytics.twitter.com","t.co"],
                              "Snapchat Pixel": ["sc-static.net/scevent.min.js","tr.snapchat.com"],
                              "Pinterest Tag": ["ct.pinterest.com","pintrk"],
                              // Testing / Optimization
                              "Optimizely": ["optimizely.com","cdn.optimizely.com","logx.optimizely.com"],
                              "VWO": ["visualwebsiteoptimizer.com","dev.visualwebsiteoptimizer.com","d5nxst8fruw4z.cloudfront.net"],
                              "LaunchDarkly": ["launchdarkly.com","events.launchdarkly.com","app.launchdarkly.com"],
                              "AB Tasty": ["abtasty.com","try.abtasty.com"],
                              "Google Optimize": ["optimize.google.com","googleoptimize.com"],
                              // Fonts & Design
                              "Google Fonts": ["fonts.googleapis.com","fonts.gstatic.com"],
                              "Adobe Fonts": ["use.typekit.net","typekit.com","p.typekit.net"],
                              "Font Awesome": ["fontawesome.com","use.fontawesome.com","kit.fontawesome.com","ka-f.fontawesome.com","cdnjs.cloudflare.com/ajax/libs/font-awesome"],
                              // Auth
                              "Firebase": ["firebase.com","firebaseapp.com","firebaseio.com","gstatic.com/firebasejs","firebasestorage.googleapis.com"],
                              "Supabase": ["supabase.co","supabase.com","supabase.in"],
                              "AWS Cognito": ["cognito-idp","cognito-identity","auth.us-east","auth.eu-west"],
                              "Stytch": ["stytch.com","sdk.stytch.com"],
                              // Misc / CMS
                              "WordPress": ["wp-content/","wp-includes/","wp-json/","wordpress.com","wordpress.org","wp-admin"],
                              "Wix": ["wix.com","parastorage.com","wixsite.com","static.wixstatic.com","wixmp.com"],
                              "Squarespace": ["squarespace.com","sqspcdn.com","static1.squarespace.com","images.squarespace-cdn.com"],
                              "Webflow": ["webflow.com","assets.website-files.com","uploads-ssl.webflow.com","global-uploads.webflow.com"],
                              "Ghost": ["ghost.io","ghost.org"],
                              "Contentful": ["contentful.com","ctfassets.net","images.ctfassets.net","cdn.contentful.com"],
                              "Sanity": ["sanity.io","cdn.sanity.io","apicdn.sanity.io"],
                              "Algolia": ["algolia.net","algolianet.com","algolia.com","algoliasearch",".algolia.net"],
                              "Twilio": ["twilio.com","api.twilio.com"],
                              "Mapbox": ["mapbox.com","api.mapbox.com","tiles.mapbox.com","events.mapbox.com"],
                              "Google Maps": ["maps.googleapis.com","maps.google.com","maps.gstatic.com"],
                              // Social Proof
                              "Trustpilot": ["trustpilot.com","widget.trustpilot.com"],
                              "Yotpo": ["yotpo.com","staticw2.yotpo.com"],
                              "Judge.me": ["judge.me","cdn.judge.me"],
                              // Compliance
                              "Cookiebot": ["cookiebot.com","consent.cookiebot.com"],
                              "OneTrust": ["onetrust.com","cdn.cookielaw.org","cookielaw.org","optanon.blob.core.windows.net"],
                              "CookieYes": ["cookieyes.com"],
                              "Iubenda": ["iubenda.com","cdn.iubenda.com"],
                              "Termly": ["termly.io","app.termly.io"],
                              // File Storage
                              "Uploadcare": ["ucarecdn.com","uploadcare.com"],
                              "Mux Video": ["stream.mux.com","image.mux.com","mux.com"],
                              "Cloudinary": ["res.cloudinary.com","cloudinary.com"],
                              // Backend
                              "Hasura": ["hasura.io","hasura.app"],
                              "Convex": ["convex.dev","convex.cloud"],
                              "Neon": ["neon.tech"],
                              "PlanetScale": ["planetscale.com"],
                              "Upstash": ["upstash.com","upstash.io"],
                              "MongoDB Atlas": ["mongodb.net","mongodb.com","cloud.mongodb.com"],
                            };

                            // Build signatures: use known map first, fallback to name-based
                            const providerSigs: Record<string, string[]> = {};
                            for (const p of providers) {
                              const nameLC = p.name.toLowerCase();
                              const nameClean = nameLC.replace(/[^a-z0-9]/g, "");
                              // Exact match
                              let matched = Object.keys(KNOWN_SIGS).find(k => k.toLowerCase() === nameLC);
                              // Fuzzy match: contains or contained
                              if (!matched) matched = Object.keys(KNOWN_SIGS).find(k => {
                                const kn = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                                return kn === nameClean || kn.includes(nameClean) || nameClean.includes(kn);
                              });
                              // Word-boundary match for multi-word names
                              if (!matched) matched = Object.keys(KNOWN_SIGS).find(k => {
                                const words = k.toLowerCase().split(/[\s\-_./]+/).filter(w => w.length > 2);
                                const pWords = nameLC.split(/[\s\-_./]+/).filter(w => w.length > 2);
                                return words.some(w => pWords.some(pw => pw.includes(w) || w.includes(pw)));
                              });
                              if (matched) {
                                providerSigs[p.name] = KNOWN_SIGS[matched];
                              } else {
                                // Aggressive fallback: generate many domain variants
                                const clean = nameClean;
                                const dashed = nameLC.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                                providerSigs[p.name] = [
                                  clean, dashed,
                                  clean + ".com", clean + ".io", clean + ".co", clean + ".net", clean + ".org", clean + ".dev", clean + ".app",
                                  dashed + ".com", dashed + ".io", dashed + ".co", dashed + ".dev",
                                  clean + ".js", clean + ".min.js", clean + ".min.css", clean + ".css",
                                  "cdn." + clean, "js." + clean, "api." + clean, "sdk." + clean,
                                ];
                              }
                            }

                            // Match URLs to each provider (string + regex + hostname token match)
                            const parsedUrls = allUrls.map((url) => {
                              try {
                                const parsed = new URL(url);
                                return { url, lc: url.toLowerCase(), host: parsed.hostname.toLowerCase(), path: parsed.pathname.toLowerCase() };
                              } catch {
                                return { url, lc: url.toLowerCase(), host: '', path: '' };
                              }
                            });

                            const providerUrls: Record<string, string[]> = {};
                            for (const p of providers) {
                              const sigs = providerSigs[p.name] || [];
                              const providerTokens = p.name
                                .toLowerCase()
                                .split(/[^a-z0-9]+/)
                                .filter((t) => t.length >= 3);

                              const matched = parsedUrls.filter(({ lc, host, path }) => {
                                if (!lc) return false;

                                const signatureMatch = sigs.some((sig) => {
                                  const s = sig.toLowerCase().trim();
                                  if (!s) return false;
                                  if (lc.includes(s)) return true;

                                  const domainToken = s
                                    .replace(/^https?:\/\//, '')
                                    .replace(/^www\./, '')
                                    .replace(/^\./, '')
                                    .split('/')[0]
                                    .replace(/[^a-z0-9.-]/g, '');

                                  if (!domainToken || domainToken.length < 3) return false;
                                  return host.includes(domainToken) || lc.includes(`.${domainToken}`) || path.includes(domainToken);
                                });

                                if (signatureMatch) return true;

                                return providerTokens.some((token) =>
                                  host.includes(token) ||
                                  path.includes(token) ||
                                  lc.includes(`.${token}.`) ||
                                  lc.includes(`/${token}`)
                                );
                              }).map((x) => x.url);

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
                                {isExpanded && (
                                  <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
                                    {allCategoryUrls.length > 0 ? (
                                      <div className="space-y-2 max-h-60 overflow-y-auto">
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
                                    ) : (
                                      <p className="text-[9px] text-white/20 italic">Detected via code signatures — no direct URLs matched</p>
                                    )}
                                  </div>
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

              {/* ═══ AI COMPETITIVE INTELLIGENCE REPORT ═══ */}
              <Card className="crm-card border-purple-400/20">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("siteInsights")}>
                  <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                    <Brain className="h-4 w-4" /> AI Competitive Intelligence Report
                    {siteInsights && <Badge variant="outline" className="text-[9px] border-purple-400/20 text-purple-400">Ready</Badge>}
                    {!siteInsights && (
                      <Button size="sm" variant="outline" className="ml-auto text-xs gap-1 border-purple-400/20 text-purple-400 hover:bg-purple-400/10 h-7"
                        onClick={e => { e.stopPropagation(); generateSiteInsights(); }} disabled={siteInsightsLoading}>
                        {siteInsightsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {siteInsightsLoading ? "Analyzing..." : "Generate Deep Intel"}
                      </Button>
                    )}
                    {expandedSections.siteInsights ? <ChevronUp className="h-3.5 w-3.5 text-white/30 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30 ml-auto" />}
                  </CardTitle>
                </CardHeader>
                {expandedSections.siteInsights && (
                  <CardContent>
                    {siteInsightsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 text-purple-400 mx-auto mb-3 animate-spin" />
                        <p className="text-xs text-white/50">Deep-analyzing competitive position, vulnerabilities, and strategy...</p>
                      </div>
                    ) : siteInsights ? (
                      <div className="space-y-4">
                         {/* Executive Summary + Score Ring */}
                        <div className="flex gap-4 items-start">
                          <div className="flex-shrink-0 relative w-24 h-24">
                            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" style={{ filter: "drop-shadow(0 0 12px hsl(270,70%,60%,0.3))" }}>
                              <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(0,0%,100%,0.04)" strokeWidth="4" />
                              <circle cx="48" cy="48" r="42" fill="none" stroke="url(#intelGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${((siteInsights.competitiveScore || 0) / 100) * (2 * Math.PI * 42)} ${2 * Math.PI * 42}`} className="transition-all duration-1000" />
                              <defs>
                                <linearGradient id="intelGrad" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="hsl(262,83%,58%)" />
                                  <stop offset="100%" stopColor="hsl(217,91%,60%)" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black text-white">{siteInsights.competitiveScore || "?"}</span>
                              <span className="text-[8px] text-purple-400/60 font-medium">/ 100</span>
                            </div>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`text-[9px] ${siteInsights.marketPosition?.tier === "leader" ? "bg-red-400/15 text-red-400" : siteInsights.marketPosition?.tier === "challenger" ? "bg-amber-400/15 text-amber-400" : "bg-emerald-400/15 text-emerald-400"}`}>
                                {siteInsights.marketPosition?.tier?.toUpperCase() || "UNKNOWN"}
                              </Badge>
                              <Badge variant="outline" className={`text-[9px] ${siteInsights.riskAssessment?.overallThreat === "critical" || siteInsights.riskAssessment?.overallThreat === "high" ? "border-red-400/30 text-red-400" : "border-amber-400/30 text-amber-400"}`}>
                                Threat: {siteInsights.riskAssessment?.overallThreat || "unknown"}
                              </Badge>
                              {siteInsights.strengthsToFear && <Badge variant="outline" className="text-[9px] border-red-400/20 text-red-400/60">{(siteInsights.strengthsToFear || []).length} strengths</Badge>}
                              {siteInsights.weaknessesToExploit && <Badge variant="outline" className="text-[9px] border-emerald-400/20 text-emerald-400/60">{(siteInsights.weaknessesToExploit || []).length} exploits</Badge>}
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed">{siteInsights.executiveSummary}</p>
                            {siteInsights.marketPosition?.reasoning && <p className="text-[10px] text-white/40 italic">{siteInsights.marketPosition.reasoning}</p>}
                          </div>
                        </div>

                        {/* Intelligence Category Scores */}
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {[
                            { label: "SEO", count: (siteInsights.seoOpportunities || []).length, icon: "🔍", color: "text-[hsl(217,91%,60%)]" },
                            { label: "Content", count: siteInsights.contentStrategy ? 1 : 0, icon: "📝", color: "text-pink-400" },
                            { label: "Marketing", count: siteInsights.marketingIntel ? 1 : 0, icon: "📣", color: "text-amber-400" },
                            { label: "Pricing", count: siteInsights.pricingIntel ? 1 : 0, icon: "💰", color: "text-green-400" },
                            { label: "Audience", count: siteInsights.audienceIntel ? 1 : 0, icon: "👥", color: "text-cyan-400" },
                            { label: "Tech", count: (siteInsights.techAdvantages || []).length, icon: "⚡", color: "text-purple-400" },
                          ].map((cat, i) => (
                            <div key={i} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                              <span className="text-sm">{cat.icon}</span>
                              <p className={`text-[10px] font-medium mt-0.5 ${cat.color}`}>{cat.label}</p>
                              <p className="text-[10px] text-white/30">{cat.count > 0 ? "✓ Analyzed" : "—"}</p>
                            </div>
                          ))}
                        </div>

                        {/* Immediate Actions */}
                        {(siteInsights.immediateActions || []).length > 0 && (
                          <div className="p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/15">
                            <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Do RIGHT NOW</p>
                            <div className="space-y-2">
                              {siteInsights.immediateActions.map((a: any, i: number) => (
                                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                                  <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${a.impact === "high" ? "bg-red-400/20 text-red-400" : "bg-amber-400/20 text-amber-400"}`}>{a.impact}</div>
                                  <div className="flex-1 space-y-0.5">
                                    <p className="text-xs font-medium text-white/80">{a.action}</p>
                                    <p className="text-[10px] text-white/40">{a.details}</p>
                                    <span className="text-[9px] text-white/30">⏱ {a.timeNeeded}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Strengths to Fear */}
                          {(siteInsights.strengthsToFear || []).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-red-400 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Their Strengths (Fear These)</p>
                              {siteInsights.strengthsToFear.map((s: any, i: number) => (
                                <div key={i} className="p-2.5 rounded-lg bg-red-400/5 border border-red-400/15 space-y-1">
                                  <p className="text-xs font-medium text-white/80">{s.strength}</p>
                                  <p className="text-[10px] text-red-400/70">Impact: {s.impact}</p>
                                  <p className="text-[10px] text-emerald-400">Counter: {s.counterStrategy}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Weaknesses to Exploit */}
                          {(siteInsights.weaknessesToExploit || []).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-amber-400 flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Their Weaknesses (Exploit These)</p>
                              {siteInsights.weaknessesToExploit.map((w: any, i: number) => (
                                <div key={i} className="p-2.5 rounded-lg bg-amber-400/5 border border-amber-400/15 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-white/80">{w.weakness}</p>
                                    <Badge variant="outline" className={`text-[8px] ${w.severity === "critical" ? "border-red-400/30 text-red-400" : w.severity === "high" ? "border-amber-400/30 text-amber-400" : "border-white/10 text-white/40"}`}>{w.severity}</Badge>
                                  </div>
                                  <p className="text-[10px] text-amber-400/70">How: {w.exploitStrategy}</p>
                                  <p className="text-[10px] text-emerald-400">Gain: {w.expectedGain}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* SEO Opportunities */}
                        {(siteInsights.seoOpportunities || []).length > 0 && (
                          <div className="p-3 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/10">
                            <p className="text-xs font-medium text-[hsl(217,91%,60%)] mb-2 flex items-center gap-1"><Search className="h-3.5 w-3.5" /> SEO Opportunities</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {siteInsights.seoOpportunities.map((o: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-white/[0.02] space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-white/80">{o.opportunity}</p>
                                    <Badge variant="outline" className={`text-[8px] ${o.difficulty === "easy" ? "border-emerald-400/30 text-emerald-400" : o.difficulty === "hard" ? "border-red-400/30 text-red-400" : "border-amber-400/30 text-amber-400"}`}>{o.difficulty}</Badge>
                                  </div>
                                  <p className="text-[10px] text-white/50">{o.action}</p>
                                  {o.expectedTraffic && <p className="text-[10px] text-emerald-400">Potential: {o.expectedTraffic}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Content Strategy Intel */}
                        {siteInsights.contentStrategy && (
                          <div className="p-3 rounded-lg bg-pink-400/5 border border-pink-400/10">
                            <p className="text-xs font-medium text-pink-400 mb-2 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Content Strategy Intel</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Tone</p>
                                <p className="text-xs text-white/80">{siteInsights.contentStrategy.toneAnalysis || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Cadence</p>
                                <p className="text-xs text-white/80">{siteInsights.contentStrategy.postingCadence || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Formats</p>
                                <p className="text-xs text-white/80">{(siteInsights.contentStrategy.recommendedFormats || []).join(", ") || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Topics</p>
                                <p className="text-xs text-white/80">{(siteInsights.contentStrategy.dominantTopics || []).join(", ") || "N/A"}</p>
                              </div>
                            </div>
                            {siteInsights.contentStrategy?.keyMessages && (
                              <div className="mt-2 p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Key Messages</p>
                                <p className="text-xs text-white/70">{siteInsights.contentStrategy.keyMessages}</p>
                              </div>
                            )}
                            {(siteInsights.contentStrategy.contentGaps || []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="text-[10px] text-white/40">Content Gaps:</span>
                                {siteInsights.contentStrategy.contentGaps.map((g: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-[9px] border-pink-400/20 text-pink-400">{g}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Marketing Intel */}
                        {siteInsights.marketingIntel && (
                          <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/10">
                            <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Marketing Intelligence</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Channels</p>
                                <p className="text-xs text-white/80">{(siteInsights.marketingIntel.channels || []).join(", ") || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Ad Presence</p>
                                <p className="text-xs text-white/80">{siteInsights.marketingIntel.adPresence || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Funnel</p>
                                <p className="text-xs text-white/80">{siteInsights.marketingIntel.funnelType || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Email Strategy</p>
                                <p className="text-xs text-white/80">{siteInsights.marketingIntel.emailStrategy || "N/A"}</p>
                              </div>
                              {(siteInsights.marketingIntel.ctas || []).length > 0 && (
                                <div className="p-2 rounded-lg bg-white/[0.02] col-span-2">
                                  <p className="text-[10px] text-white/40">CTA Patterns</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {siteInsights.marketingIntel.ctas.map((c: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-[9px] border-amber-400/20 text-amber-300">{c}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Audience Intel */}
                        {siteInsights.audienceIntel && (
                          <div className="p-3 rounded-lg bg-cyan-400/5 border border-cyan-400/10">
                            <p className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Audience Intelligence</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Primary Audience</p>
                                <p className="text-xs text-white/80">{siteInsights.audienceIntel.primaryDemo || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Secondary</p>
                                <p className="text-xs text-white/80">{siteInsights.audienceIntel.secondaryDemo || "N/A"}</p>
                              </div>
                            </div>
                            {(siteInsights.audienceIntel.underservedSegments || []).length > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] text-emerald-400 mb-1">Underserved Segments You Can Target:</p>
                                <div className="flex flex-wrap gap-1">
                                  {siteInsights.audienceIntel.underservedSegments.map((s: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[9px] border-emerald-400/20 text-emerald-400">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(siteInsights.audienceIntel.acquisitionChannels || []).length > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] text-white/40 mb-1">Their Acquisition Channels:</p>
                                <div className="flex flex-wrap gap-1">
                                  {siteInsights.audienceIntel.acquisitionChannels.map((c: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[9px] border-cyan-400/20 text-cyan-300">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pricing Intel */}
                        {siteInsights.pricingIntel && (
                          <div className="p-3 rounded-lg bg-green-400/5 border border-green-400/10">
                            <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Pricing Intelligence</p>
                            <p className="text-xs text-white/70 mb-2">Strategy: {siteInsights.pricingIntel.strategy || "N/A"}</p>
                            {(siteInsights.pricingIntel.vulnerabilities || []).length > 0 && (
                              <div className="mb-2">
                                <p className="text-[10px] text-red-400 mb-1">Pricing Vulnerabilities:</p>
                                {siteInsights.pricingIntel.vulnerabilities.map((v: string, i: number) => (
                                  <p key={i} className="text-[10px] text-white/50 flex items-start gap-1 mb-0.5"><span className="text-red-400">•</span> {v}</p>
                                ))}
                              </div>
                            )}
                            {(siteInsights.pricingIntel.recommendations || []).length > 0 && (
                              <div>
                                <p className="text-[10px] text-emerald-400 mb-1">Your Pricing Strategy:</p>
                                {siteInsights.pricingIntel.recommendations.map((r: string, i: number) => (
                                  <p key={i} className="text-[10px] text-white/50 flex items-start gap-1 mb-0.5"><span className="text-emerald-400">•</span> {r}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tech Advantages */}
                        {(siteInsights.techAdvantages || []).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-purple-400 flex items-center gap-1"><Code className="h-3.5 w-3.5" /> Tech Stack Advantages & Alternatives</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {siteInsights.techAdvantages.map((t: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-purple-400/5 border border-purple-400/10 space-y-0.5">
                                  <p className="text-xs font-medium text-white/80">{t.tech}</p>
                                  <p className="text-[10px] text-white/50">Gives them: {t.advantage}</p>
                                  <p className="text-[10px] text-purple-400">You should: {t.alternative}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Weekly Hit List */}
                        {(siteInsights.weeklyHitList || []).length > 0 && (
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <p className="text-xs font-medium text-white/60 mb-2 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Weekly Action Plan to Beat Them</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-1.5">
                              {siteInsights.weeklyHitList.map((d: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center space-y-1">
                                  <Badge className={`text-[8px] ${d.priority === "high" ? "bg-red-400/15 text-red-400" : "bg-amber-400/15 text-amber-400"}`}>{d.day}</Badge>
                                  <p className="text-[10px] text-white/70">{d.action}</p>
                                  <p className="text-[8px] text-white/30">{d.target}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Long-term Plays */}
                        {(siteInsights.longTermPlays || []).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-[hsl(217,91%,60%)] flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Long-term Strategic Plays</p>
                            {siteInsights.longTermPlays.map((p: any, i: number) => (
                              <div key={i} className="p-2.5 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/10 space-y-1">
                                <p className="text-xs font-medium text-white/80">{p.play}</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-[10px] text-white/40">⏱ {p.timeline}</span>
                                  <span className="text-[10px] text-white/40">💰 {p.investment}</span>
                                  <span className="text-[10px] text-emerald-400">ROI: {p.expectedROI}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Risk Assessment */}
                        {siteInsights.riskAssessment && (
                          <div className={`p-3 rounded-lg border ${siteInsights.riskAssessment.overallThreat === "critical" || siteInsights.riskAssessment.overallThreat === "high" ? "bg-red-400/5 border-red-400/15" : "bg-amber-400/5 border-amber-400/15"}`}>
                            <p className="text-xs font-medium text-white/60 mb-1">Risk Assessment</p>
                            <p className="text-xs text-white/70">{siteInsights.riskAssessment.biggestRisk}</p>
                            <p className="text-[10px] text-emerald-400 mt-1">Mitigation: {siteInsights.riskAssessment.mitigation}</p>
                          </div>
                        )}

                        {/* ═══ CONVERSION FUNNEL ANALYSIS ═══ */}
                        {siteInsights.conversionFunnel && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400/5 to-blue-400/5 border border-cyan-400/15">
                            <p className="text-xs font-medium text-cyan-400 mb-3 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Conversion Funnel Analysis</p>
                            <div className="space-y-2">
                              {[
                                { label: "Top of Funnel", value: siteInsights.conversionFunnel.topOfFunnel, color: "border-l-emerald-400", icon: "🎯" },
                                { label: "Middle of Funnel", value: siteInsights.conversionFunnel.middleOfFunnel, color: "border-l-amber-400", icon: "🔄" },
                                { label: "Bottom of Funnel", value: siteInsights.conversionFunnel.bottomOfFunnel, color: "border-l-red-400", icon: "💰" },
                              ].map((step, i) => (
                                <div key={i} className={`p-2.5 rounded-lg bg-white/[0.02] border-l-2 ${step.color}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm">{step.icon}</span>
                                    <span className="text-[10px] font-medium text-white/60">{step.label}</span>
                                  </div>
                                  <p className="text-xs text-white/70">{step.value || "N/A"}</p>
                                </div>
                              ))}
                              {(siteInsights.conversionFunnel.leaks || []).length > 0 && (
                                <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/10">
                                  <p className="text-[10px] font-medium text-red-400 mb-1">🚰 Funnel Leaks</p>
                                  {siteInsights.conversionFunnel.leaks.map((leak: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60 flex items-start gap-1"><span className="text-red-400 mt-px">•</span> {leak}</p>
                                  ))}
                                </div>
                              )}
                              {siteInsights.conversionFunnel.yourAdvantage && (
                                <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                  <p className="text-[10px] text-emerald-400">✨ Your Advantage: {siteInsights.conversionFunnel.yourAdvantage}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ═══ UX/DESIGN ANALYSIS ═══ */}
                        {siteInsights.uxDesignAnalysis && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-400/5 to-purple-400/5 border border-pink-400/15">
                            <p className="text-xs font-medium text-pink-400 mb-3 flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> UX & Design Analysis</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                              {[
                                { label: "Design Quality", value: siteInsights.uxDesignAnalysis.designQuality, max: 100 },
                                { label: "Navigation", value: siteInsights.uxDesignAnalysis.navigationClarity, max: 100 },
                                { label: "Mobile", value: siteInsights.uxDesignAnalysis.mobileExperience, isText: true },
                                { label: "Speed", value: siteInsights.uxDesignAnalysis.loadSpeed, isText: true },
                                { label: "CTA Power", value: siteInsights.uxDesignAnalysis.ctaEffectiveness, isText: true },
                              ].map((m, i) => (
                                <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center">
                                  <p className="text-[10px] text-white/40">{m.label}</p>
                                  {(m as any).isText ? (
                                    <p className={`text-xs font-bold mt-0.5 ${m.value === "good" || m.value === "fast" || m.value === "strong" ? "text-emerald-400" : m.value === "poor" || m.value === "slow" || m.value === "weak" || m.value === "missing" ? "text-red-400" : "text-amber-400"}`}>{String(m.value || "?")}</p>
                                  ) : (
                                    <p className="text-sm font-bold text-white mt-0.5">{m.value || "?"}<span className="text-[9px] text-white/30">/{m.max}</span></p>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(siteInsights.uxDesignAnalysis.designStrengths || []).length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-emerald-400 font-medium">✓ Design Strengths</p>
                                  {siteInsights.uxDesignAnalysis.designStrengths.map((s: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60 pl-2">• {s}</p>
                                  ))}
                                </div>
                              )}
                              {(siteInsights.uxDesignAnalysis.designWeaknesses || []).length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-red-400 font-medium">✗ Design Weaknesses</p>
                                  {siteInsights.uxDesignAnalysis.designWeaknesses.map((w: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60 pl-2">• {w}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ═══ SOCIAL PROOF ANALYSIS ═══ */}
                        {siteInsights.socialProofAnalysis && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400/5 to-orange-400/5 border border-amber-400/15">
                            <p className="text-xs font-medium text-amber-400 mb-3 flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Social Proof & Trust Analysis</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Trust Score</p>
                                <p className="text-lg font-bold text-amber-400">{siteInsights.socialProofAnalysis.socialProofScore || "?"}<span className="text-[9px] text-white/30">/100</span></p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Testimonials</p>
                                <p className="text-sm font-bold text-white">{siteInsights.socialProofAnalysis.testimonialCount || "0"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Trust Signals</p>
                                <div className="flex flex-wrap gap-1">
                                  {(siteInsights.socialProofAnalysis.trustSignals || []).map((s: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[8px] border-emerald-400/20 text-emerald-400">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Missing Trust</p>
                                <div className="flex flex-wrap gap-1">
                                  {(siteInsights.socialProofAnalysis.missingTrust || []).map((s: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[8px] border-red-400/20 text-red-400">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {siteInsights.socialProofAnalysis.yourOpportunity && (
                              <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400">🎯 {siteInsights.socialProofAnalysis.yourOpportunity}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ CUSTOMER INTELLIGENCE ═══ */}
                        {siteInsights.customerIntel && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/5 to-teal-400/5 border border-green-400/15">
                            <p className="text-xs font-medium text-green-400 mb-3 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Customer Intelligence</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Sentiment</p>
                                <p className={`text-xs font-bold ${siteInsights.customerIntel.reviewSentiment === "positive" ? "text-emerald-400" : siteInsights.customerIntel.reviewSentiment === "negative" ? "text-red-400" : "text-amber-400"}`}>{siteInsights.customerIntel.reviewSentiment || "unknown"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">NPS Estimate</p>
                                <p className="text-sm font-bold text-white">{siteInsights.customerIntel.npsEstimate || "?"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Churn Signals</p>
                                {(siteInsights.customerIntel.churnSignals || []).map((s: string, i: number) => (
                                  <p key={i} className="text-[9px] text-red-400/70">⚠ {s}</p>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(siteInsights.customerIntel.commonComplaints || []).length > 0 && (
                                <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/10">
                                  <p className="text-[10px] text-red-400 font-medium mb-1">Common Complaints</p>
                                  {siteInsights.customerIntel.commonComplaints.map((c: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60">• {c}</p>
                                  ))}
                                </div>
                              )}
                              {(siteInsights.customerIntel.commonPraise || []).length > 0 && (
                                <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                  <p className="text-[10px] text-emerald-400 font-medium mb-1">What They Love</p>
                                  {siteInsights.customerIntel.commonPraise.map((c: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60">• {c}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                            {siteInsights.customerIntel.yourOpportunity && (
                              <div className="p-2 mt-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400">🎯 Steal Their Customers: {siteInsights.customerIntel.yourOpportunity}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ BACKLINK OPPORTUNITIES ═══ */}
                        {(siteInsights.backlinksStrategy || []).length > 0 && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-400/5 to-blue-400/5 border border-indigo-400/15">
                            <p className="text-xs font-medium text-indigo-400 mb-3 flex items-center gap-1"><Link className="h-3.5 w-3.5" /> Backlink Opportunities</p>
                            <div className="space-y-2">
                              {siteInsights.backlinksStrategy.map((b: any, i: number) => (
                                <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-white/80">{b.opportunity}</span>
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="text-[8px] border-white/10 text-white/40">{b.type}</Badge>
                                      <Badge variant="outline" className={`text-[8px] ${b.difficulty === "easy" ? "border-emerald-400/20 text-emerald-400" : b.difficulty === "hard" ? "border-red-400/20 text-red-400" : "border-amber-400/20 text-amber-400"}`}>{b.difficulty}</Badge>
                                    </div>
                                  </div>
                                  {b.domainAuthority && <p className="text-[10px] text-white/40">DA: {b.domainAuthority}</p>}
                                  <p className="text-[10px] text-white/60">{b.action}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ═══ HIRING SIGNALS ═══ */}
                        {siteInsights.hiringSignals && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-400/5 to-fuchsia-400/5 border border-violet-400/15">
                            <p className="text-xs font-medium text-violet-400 mb-2 flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Hiring & Team Signals</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Hiring?</p>
                                <p className={`text-xs font-bold ${siteInsights.hiringSignals.isHiring ? "text-emerald-400" : "text-white/40"}`}>{siteInsights.hiringSignals.isHiring ? "Yes" : "No"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Team Size</p>
                                <p className="text-xs font-bold text-white">{siteInsights.hiringSignals.teamSize || "?"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] col-span-2">
                                <p className="text-[10px] text-white/40 mb-1">Open Roles</p>
                                <div className="flex flex-wrap gap-1">
                                  {(siteInsights.hiringSignals.openRoles || []).map((r: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[8px] border-violet-400/20 text-violet-400">{r}</Badge>
                                  ))}
                                  {(siteInsights.hiringSignals.openRoles || []).length === 0 && <span className="text-[10px] text-white/30">None detected</span>}
                                </div>
                              </div>
                            </div>
                            {siteInsights.hiringSignals.growthSignal && (
                              <p className="text-[10px] text-white/60 p-2 rounded-lg bg-white/[0.02]">📊 {siteInsights.hiringSignals.growthSignal}</p>
                            )}
                          </div>
                        )}

                        {/* ═══ PARTNERSHIP MAP ═══ */}
                        {(siteInsights.partnershipMap || []).length > 0 && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-teal-400/5 to-cyan-400/5 border border-teal-400/15">
                            <p className="text-xs font-medium text-teal-400 mb-3 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Partnership & Integration Map</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {siteInsights.partnershipMap.map((p: any, i: number) => (
                                <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-white/80">{p.partner}</span>
                                    <Badge variant="outline" className="text-[8px] border-teal-400/20 text-teal-400">{p.type}</Badge>
                                  </div>
                                  <p className="text-[10px] text-white/50">{p.strength}</p>
                                  <p className="text-[10px] text-emerald-400">→ {p.yourAction}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ═══ THREAT TIMELINE ═══ */}
                        {(siteInsights.threatTimeline || []).length > 0 && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-red-400/5 to-orange-400/5 border border-red-400/15">
                            <p className="text-xs font-medium text-red-400 mb-3 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Threat Timeline — What They Might Do Next</p>
                            <div className="space-y-2">
                              {siteInsights.threatTimeline.map((t: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                  <div className={`px-2 py-1 rounded text-[9px] font-bold flex-shrink-0 ${t.probability === "high" ? "bg-red-400/20 text-red-400" : t.probability === "medium" ? "bg-amber-400/20 text-amber-400" : "bg-white/10 text-white/40"}`}>{t.timeframe}</div>
                                  <div className="flex-1 space-y-0.5">
                                    <p className="text-xs text-white/80">{t.threat}</p>
                                    <p className="text-[10px] text-emerald-400">Preempt: {t.preemptiveAction}</p>
                                  </div>
                                  <Badge variant="outline" className={`text-[8px] flex-shrink-0 ${t.probability === "high" ? "border-red-400/30 text-red-400" : "border-white/10 text-white/40"}`}>{t.probability}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Re-analyze */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/30">{Object.keys(siteInsights).filter(k => siteInsights[k] && k !== "competitiveScore" && k !== "executiveSummary").length} intelligence modules loaded</span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-purple-400/60 hover:text-purple-400" onClick={() => { setSiteInsights(null); generateSiteInsights(); }}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Re-analyze
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Brain className="h-8 w-8 text-white/15 mx-auto mb-2" />
                        <p className="text-xs text-white/40 mb-2">Deep AI analysis of competitive position, weaknesses, opportunities & strategy</p>
                        <Button size="sm" className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 gap-1.5" onClick={generateSiteInsights} disabled={siteInsightsLoading}>
                          <Sparkles className="h-3.5 w-3.5" /> Generate Competitive Intelligence
                        </Button>
                      </div>
                    )}
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

        {/* ═══ HEAD-TO-HEAD TAB ═══ */}
        <TabsContent value="h2h" className="space-y-5">
          {competitors.length < 2 ? (
            <Card className="crm-card"><CardContent className="p-12 text-center">
              <Crosshair className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <h3 className="text-white/50 font-medium mb-1">Need at least 2 competitors</h3>
              <p className="text-white/30 text-sm">Add more competitors in the Tracker tab to run head-to-head comparisons</p>
            </CardContent></Card>
          ) : (
            <>
              <Card className="crm-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[180px] space-y-1.5">
                      <label className="text-xs font-medium text-white/50">Competitor A</label>
                      <select value={h2hCompA || ""} onChange={e => setH2hCompA(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                        <option value="">Select...</option>
                        {competitors.map(c => <option key={c.id} value={c.id}>@{c.username} · {fmtNum(c.followers)}</option>)}
                        {myStats && <option value="me">@{myStats.username} (You)</option>}
                      </select>
                    </div>
                    <div className="flex items-center pt-5"><span className="text-lg text-white/20 font-bold">VS</span></div>
                    <div className="flex-1 min-w-[180px] space-y-1.5">
                      <label className="text-xs font-medium text-white/50">Competitor B</label>
                      <select value={h2hCompB || ""} onChange={e => setH2hCompB(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                        <option value="">Select...</option>
                        {competitors.map(c => <option key={c.id} value={c.id}>@{c.username} · {fmtNum(c.followers)}</option>)}
                        {myStats && <option value="me">@{myStats.username} (You)</option>}
                      </select>
                    </div>
                    <Button className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5 h-10 mt-auto" disabled={h2hLoading || !h2hCompA || !h2hCompB || h2hCompA === h2hCompB}
                      onClick={async () => {
                        setH2hLoading(true);
                        setH2hResult(null);
                        try {
                          const getStats = (id: string) => {
                            if (id === "me" && myStats) return { username: myStats.username, followers: myStats.followers, engagementRate: myStats.engagementRate, avgLikes: myStats.avgLikes, avgComments: myStats.avgComments, growthRate: myStats.growthRate, postFrequency: myStats.postFrequency, posts: myStats.posts, niche: enterpriseProfile?.contentNiche || "unknown", platform: enterpriseProfile?.platform || "instagram" };
                            const c = competitors.find(x => x.id === id);
                            if (!c) throw new Error("Not found");
                            return { username: c.username, followers: c.followers, engagementRate: c.engagementRate, avgLikes: c.avgLikes, avgComments: c.avgComments, growthRate: c.growthRate, postFrequency: c.postFrequency, posts: c.posts, niche: c.metadata?.niche || "unknown", platform: c.platform };
                          };
                          const a = getStats(h2hCompA!);
                          const b = getStats(h2hCompB!);
                          await performAction("competitor_insight", async () => {
                            const aiReply = await callAI(`You are a competitive intelligence analyst. Do a deep head-to-head comparison between these two accounts:

ACCOUNT A - @${a.username} (${a.platform}):
Followers: ${a.followers}, ER: ${a.engagementRate}%, Avg Likes: ${a.avgLikes}, Avg Comments: ${a.avgComments}, Growth: ${a.growthRate}%/wk, Posts/wk: ${a.postFrequency}, Total: ${a.posts}, Niche: ${a.niche}

ACCOUNT B - @${b.username} (${b.platform}):
Followers: ${b.followers}, ER: ${b.engagementRate}%, Avg Likes: ${b.avgLikes}, Avg Comments: ${b.avgComments}, Growth: ${b.growthRate}%/wk, Posts/wk: ${b.postFrequency}, Total: ${b.posts}, Niche: ${b.niche}

Return ONLY valid JSON:
{
  "winner": "username of who's winning overall",
  "verdictSummary": "2-3 sentence verdict explaining who's winning and why",
  "categories": [
    {"category": "Audience Size", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief analysis"},
    {"category": "Engagement Quality", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"},
    {"category": "Growth Momentum", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"},
    {"category": "Content Consistency", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"},
    {"category": "Community Strength", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"},
    {"category": "Virality Potential", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"},
    {"category": "Monetization Readiness", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"},
    {"category": "Brand Authority", "winnerUsername": "who wins", "scoreA": <0-100>, "scoreB": <0-100>, "analysis": "brief"}
  ],
  "aAdvantages": ["specific advantage A has over B"],
  "bAdvantages": ["specific advantage B has over A"],
  "switchStrategy": "If you're A, here's exactly how to beat B in 30 days",
  "keyBattleground": "The single most important area where the fight will be won or lost"
}`);
                            setH2hResult({ ...parseJSON(aiReply), usernameA: a.username, usernameB: b.username, statsA: a, statsB: b });
                            return true;
                          });
                        } catch (err: any) { toast.error(err?.message || "Comparison failed"); }
                        finally { setH2hLoading(false); }
                      }}>
                      {h2hLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                      {h2hLoading ? "Comparing..." : "Compare"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {h2hLoading && (
                <Card className="crm-card"><CardContent className="p-12 text-center">
                  <Loader2 className="h-10 w-10 text-[hsl(217,91%,60%)] mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-white/50">Running deep head-to-head analysis...</p>
                </CardContent></Card>
              )}

              {h2hResult && !h2hLoading && (
                <div className="space-y-4">
                  {/* Verdict */}
                  <Card className="crm-card border-[hsl(217,91%,60%)]/20">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1 text-center">
                          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-[hsl(217,91%,60%)]/20 to-[hsl(262,83%,58%)]/20 flex items-center justify-center text-white font-bold text-lg border border-white/[0.06]">
                            {h2hResult.usernameA?.[0]?.toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-white mt-1">@{h2hResult.usernameA}</p>
                          <p className="text-[10px] text-white/40">{fmtNum(h2hResult.statsA?.followers || 0)} followers</p>
                        </div>
                        <div className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
                          <Crown className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                          <p className="text-[10px] text-amber-400 font-bold text-center">@{h2hResult.winner}</p>
                          <p className="text-[8px] text-amber-400/60 text-center">WINNER</p>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-[hsl(262,83%,58%)]/20 to-[hsl(350,80%,55%)]/20 flex items-center justify-center text-white font-bold text-lg border border-white/[0.06]">
                            {h2hResult.usernameB?.[0]?.toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-white mt-1">@{h2hResult.usernameB}</p>
                          <p className="text-[10px] text-white/40">{fmtNum(h2hResult.statsB?.followers || 0)} followers</p>
                        </div>
                      </div>
                      <p className="text-xs text-white/70 text-center">{h2hResult.verdictSummary}</p>
                    </CardContent>
                  </Card>

                  {/* Category Breakdown */}
                  <Card className="crm-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Category Breakdown</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {(h2hResult.categories || []).map((cat: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-white/80">{cat.category}</span>
                            <Badge className={`text-[9px] ${cat.winnerUsername === h2hResult.usernameA ? "bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)]" : "bg-[hsl(262,83%,58%)]/15 text-[hsl(262,83%,58%)]"}`}>
                              @{cat.winnerUsername} wins
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mb-1.5">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] text-[hsl(217,91%,60%)]/70">@{h2hResult.usernameA}</span>
                                <span className="text-[10px] text-white/50">{cat.scoreA}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                                <div className="h-full rounded-full bg-[hsl(217,91%,60%)] transition-all" style={{ width: `${cat.scoreA}%` }} />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] text-[hsl(262,83%,58%)]/70">@{h2hResult.usernameB}</span>
                                <span className="text-[10px] text-white/50">{cat.scoreB}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                                <div className="h-full rounded-full bg-[hsl(262,83%,58%)] transition-all" style={{ width: `${cat.scoreB}%` }} />
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/40">{cat.analysis}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Advantages */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="crm-card border-[hsl(217,91%,60%)]/15">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(217,91%,60%)] flex items-center gap-2"><Shield className="h-4 w-4" /> @{h2hResult.usernameA}'s Advantages</CardTitle></CardHeader>
                      <CardContent className="space-y-1.5">
                        {(h2hResult.aAdvantages || []).map((a: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(217,91%,60%)]/5">
                            <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(217,91%,60%)] mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-white/70">{a}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="crm-card border-[hsl(262,83%,58%)]/15">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(262,83%,58%)] flex items-center gap-2"><Shield className="h-4 w-4" /> @{h2hResult.usernameB}'s Advantages</CardTitle></CardHeader>
                      <CardContent className="space-y-1.5">
                        {(h2hResult.bAdvantages || []).map((a: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(262,83%,58%)]/5">
                            <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(262,83%,58%)] mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-white/70">{a}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Key Battleground + Strategy */}
                  <Card className="crm-card border-amber-400/15">
                    <CardContent className="p-4 space-y-3">
                      <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/10">
                        <p className="text-xs font-medium text-amber-400 flex items-center gap-1 mb-1"><Flame className="h-3.5 w-3.5" /> Key Battleground</p>
                        <p className="text-xs text-white/70">{h2hResult.keyBattleground}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                        <p className="text-xs font-medium text-emerald-400 flex items-center gap-1 mb-1"><Zap className="h-3.5 w-3.5" /> 30-Day Domination Strategy</p>
                        <p className="text-xs text-white/70">{h2hResult.switchStrategy}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Radar overlay */}
                  <Card className="crm-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Performance Overlay</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={(h2hResult.categories || []).map((c: any) => ({ metric: c.category.replace(/\s+/g, "\n"), [h2hResult.usernameA]: c.scoreA, [h2hResult.usernameB]: c.scoreB }))}>
                            <PolarGrid stroke="hsl(217 91% 60% / 0.08)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} />
                            <PolarRadiusAxis tick={false} axisLine={false} />
                            <Radar name={`@${h2hResult.usernameA}`} dataKey={h2hResult.usernameA} stroke="hsl(217,91%,60%)" fill="hsl(217,91%,60%)" fillOpacity={0.15} strokeWidth={2} />
                            <Radar name={`@${h2hResult.usernameB}`} dataKey={h2hResult.usernameB} stroke="hsl(262,83%,58%)" fill="hsl(262,83%,58%)" fillOpacity={0.15} strokeWidth={2} />
                            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══ GROWTH FORECAST TAB ═══ */}
        <TabsContent value="forecast" className="space-y-5">
          {competitors.length === 0 && !myStats ? (
            <Card className="crm-card"><CardContent className="p-12 text-center">
              <TrendingUp className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Add competitors or set up your enterprise profile to forecast growth</p>
            </CardContent></Card>
          ) : (
            <>
              <Card className="crm-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <select value={forecastTarget || ""} onChange={e => setForecastTarget(e.target.value)} className="flex-1 h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                      <option value="">Select account to forecast...</option>
                      {myStats && <option value="me">@{myStats.username} (You)</option>}
                      {competitors.map(c => <option key={c.id} value={c.id}>@{c.username} · {fmtNum(c.followers)} followers</option>)}
                    </select>
                    <Button onClick={async () => {
                      if (!forecastTarget) return;
                      setForecastLoading(true);
                      setForecastResult(null);
                      try {
                        const getStats = (id: string) => {
                          if (id === "me" && myStats) return { username: myStats.username, followers: myStats.followers, engagementRate: myStats.engagementRate, avgLikes: myStats.avgLikes, growthRate: myStats.growthRate, postFrequency: myStats.postFrequency, posts: myStats.posts };
                          const c = competitors.find(x => x.id === id);
                          if (!c) throw new Error("Not found");
                          return { username: c.username, followers: c.followers, engagementRate: c.engagementRate, avgLikes: c.avgLikes, growthRate: c.growthRate, postFrequency: c.postFrequency, posts: c.posts, history: c.metadata?.analysisHistory };
                        };
                        const s = getStats(forecastTarget);
                        await performAction("competitor_insight", async () => {
                          const aiReply = await callAI(`You are a growth analytics expert. Forecast the growth trajectory for @${s.username}.

Current stats: ${s.followers} followers, ${s.engagementRate}% ER, ${s.avgLikes} avg likes, ${s.growthRate}% weekly growth, ${s.postFrequency} posts/wk, ${s.posts} total posts.
${(s as any).history ? `History: ${JSON.stringify((s as any).history.slice(-10))}` : ""}

Return ONLY valid JSON:
{
  "currentTrend": "accelerating/stable/decelerating/declining",
  "trendAnalysis": "2-3 sentences explaining the current trajectory",
  "projections": {
    "thirtyDays": {"followers": <number>, "engagementRate": <number>, "totalLikes": <number>},
    "ninetyDays": {"followers": <number>, "engagementRate": <number>, "totalLikes": <number>},
    "sixMonths": {"followers": <number>, "engagementRate": <number>, "totalLikes": <number>},
    "oneYear": {"followers": <number>, "engagementRate": <number>, "totalLikes": <number>}
  },
  "milestones": [
    {"milestone": "10K followers", "estimatedDate": "April 2026", "daysAway": 45, "confidence": "high"},
    {"milestone": "50K followers", "estimatedDate": "Sep 2026", "daysAway": 200, "confidence": "medium"}
  ],
  "growthAccelerators": [
    {"tactic": "specific growth tactic", "impact": "+15% growth rate", "effort": "low/medium/high", "timeline": "2 weeks"}
  ],
  "growthRisks": [
    {"risk": "specific risk", "probability": "medium", "mitigation": "how to avoid it"}
  ],
  "monthlyBreakdown": [
    {"month": "Apr 2026", "followers": <number>, "engagement": <number>, "revenue": "estimated if applicable"}
  ],
  "competitorComparison": "How this growth compares to industry averages and tracked competitors",
  "bestCaseScenario": {"followers": <number>, "timeline": "if everything goes right", "requirements": "what needs to happen"},
  "worstCaseScenario": {"followers": <number>, "timeline": "if momentum stalls", "warning": "early warning signs to watch for"}
}`);
                          setForecastResult({ ...parseJSON(aiReply), username: s.username, currentFollowers: s.followers, currentER: s.engagementRate });
                          return true;
                        });
                      } catch (err: any) { toast.error(err?.message || "Forecast failed"); }
                      finally { setForecastLoading(false); }
                    }} disabled={forecastLoading || !forecastTarget} className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5 h-10">
                      {forecastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                      {forecastLoading ? "Forecasting..." : "Generate Forecast"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {forecastLoading && (
                <Card className="crm-card"><CardContent className="p-12 text-center">
                  <Loader2 className="h-10 w-10 text-[hsl(217,91%,60%)] mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-white/50">Generating growth forecast...</p>
                </CardContent></Card>
              )}

              {forecastResult && !forecastLoading && (
                <div className="space-y-4">
                  {/* Trend Overview */}
                  <Card className="crm-card border-[hsl(217,91%,60%)]/15">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${forecastResult.currentTrend === "accelerating" ? "bg-emerald-400/15 text-emerald-400" : forecastResult.currentTrend === "stable" ? "bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)]" : forecastResult.currentTrend === "decelerating" ? "bg-amber-400/15 text-amber-400" : "bg-red-400/15 text-red-400"}`}>
                          {forecastResult.currentTrend === "accelerating" ? "🚀" : forecastResult.currentTrend === "stable" ? "📊" : forecastResult.currentTrend === "decelerating" ? "⚠️" : "📉"} {forecastResult.currentTrend?.toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-white">@{forecastResult.username} Growth Forecast</p>
                      </div>
                      <p className="text-xs text-white/70">{forecastResult.trendAnalysis}</p>
                    </CardContent>
                  </Card>

                  {/* Projections */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "30 Days", data: forecastResult.projections?.thirtyDays },
                      { label: "90 Days", data: forecastResult.projections?.ninetyDays },
                      { label: "6 Months", data: forecastResult.projections?.sixMonths },
                      { label: "1 Year", data: forecastResult.projections?.oneYear },
                    ].map((p, i) => (
                      <Card key={i} className="crm-card">
                        <CardContent className="p-3 text-center space-y-1">
                          <p className="text-[10px] text-white/40">{p.label}</p>
                          <p className="text-lg font-bold text-[hsl(217,91%,60%)]">{fmtNum(p.data?.followers || 0)}</p>
                          <p className="text-[10px] text-white/50">followers</p>
                          <p className="text-[10px] text-emerald-400">{p.data?.engagementRate}% ER</p>
                          <p className="text-[10px] text-white/30">{fmtNum(p.data?.totalLikes || 0)} total likes</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Growth Chart */}
                  {(forecastResult.monthlyBreakdown || []).length > 0 && (
                    <Card className="crm-card">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Projected Growth Curve</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecastResult.monthlyBreakdown}>
                              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
                              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [fmtNum(v), "Followers"]} />
                              <defs>
                                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="followers" stroke="hsl(217,91%,60%)" fill="url(#forecastGrad)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Milestones */}
                  {(forecastResult.milestones || []).length > 0 && (
                    <Card className="crm-card">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><Star className="h-4 w-4" /> Milestone Projections</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {forecastResult.milestones.map((m: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                                <Star className="h-4 w-4 text-amber-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-white/80">{m.milestone}</p>
                                <p className="text-[10px] text-white/40">Est. {m.estimatedDate} · {m.daysAway} days away</p>
                              </div>
                              <Badge variant="outline" className={`text-[9px] ${m.confidence === "high" ? "border-emerald-400/30 text-emerald-400" : m.confidence === "medium" ? "border-amber-400/30 text-amber-400" : "border-red-400/30 text-red-400"}`}>{m.confidence}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Growth Accelerators */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(forecastResult.growthAccelerators || []).length > 0 && (
                      <Card className="crm-card">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Zap className="h-4 w-4" /> Growth Accelerators</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {forecastResult.growthAccelerators.map((a: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-emerald-400/5 border border-emerald-400/10 space-y-1">
                              <p className="text-xs font-medium text-white/80">{a.tactic}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] border-emerald-400/20 text-emerald-400">{a.impact}</Badge>
                                <Badge variant="outline" className={`text-[9px] ${a.effort === "low" ? "border-emerald-400/20 text-emerald-400" : a.effort === "high" ? "border-red-400/20 text-red-400" : "border-amber-400/20 text-amber-400"}`}>{a.effort} effort</Badge>
                                <span className="text-[9px] text-white/30">⏱ {a.timeline}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    {(forecastResult.growthRisks || []).length > 0 && (
                      <Card className="crm-card">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Growth Risks</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {forecastResult.growthRisks.map((r: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-red-400/5 border border-red-400/10 space-y-1">
                              <p className="text-xs font-medium text-white/80">{r.risk}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[9px] ${r.probability === "high" ? "border-red-400/30 text-red-400" : r.probability === "medium" ? "border-amber-400/30 text-amber-400" : "border-white/10 text-white/40"}`}>{r.probability} probability</Badge>
                              </div>
                              <p className="text-[10px] text-emerald-400">Mitigation: {r.mitigation}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Scenarios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {forecastResult.bestCaseScenario && (
                      <Card className="crm-card border-emerald-400/15">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-medium text-emerald-400 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Best Case Scenario</p>
                          <p className="text-lg font-bold text-emerald-400">{fmtNum(forecastResult.bestCaseScenario.followers || 0)} followers</p>
                          <p className="text-[10px] text-white/50">{forecastResult.bestCaseScenario.timeline}</p>
                          <p className="text-[10px] text-white/40">Requires: {forecastResult.bestCaseScenario.requirements}</p>
                        </CardContent>
                      </Card>
                    )}
                    {forecastResult.worstCaseScenario && (
                      <Card className="crm-card border-red-400/15">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-medium text-red-400 flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> Worst Case Scenario</p>
                          <p className="text-lg font-bold text-red-400">{fmtNum(forecastResult.worstCaseScenario.followers || 0)} followers</p>
                          <p className="text-[10px] text-white/50">{forecastResult.worstCaseScenario.timeline}</p>
                          <p className="text-[10px] text-white/40">Warning: {forecastResult.worstCaseScenario.warning}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {forecastResult.competitorComparison && (
                    <Card className="crm-card">
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-white/50 mb-1 flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> Industry Comparison</p>
                        <p className="text-xs text-white/70">{forecastResult.competitorComparison}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══ EXPORT REPORT TAB ═══ */}
        <TabsContent value="export" className="space-y-5">
          <Card className="crm-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><Download className="h-4 w-4" /> Export Competitive Intelligence Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/50">Generate a comprehensive competitive intelligence document with all your tracked data, analysis, and AI insights.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: "Tracked Competitors", count: competitors.length, icon: Crosshair, ready: competitors.length > 0 },
                  { label: "SWOT Analysis", count: swotResult ? 1 : 0, icon: Target, ready: !!swotResult },
                  { label: "Gap Analysis", count: gapAnalysis ? 1 : 0, icon: Eye, ready: !!gapAnalysis },
                  { label: "Content Intel", count: contentRecs ? 1 : 0, icon: Calendar, ready: !!contentRecs },
                  { label: "Battle Plan", count: battlePlan ? 1 : 0, icon: Crown, ready: !!battlePlan },
                  { label: "Site Analysis", count: scrapeResult ? 1 : 0, icon: Globe, ready: !!scrapeResult },
                  { label: "Financial Intel", count: financialData ? 1 : 0, icon: DollarSign, ready: !!financialData },
                  { label: "AI Intel Report", count: siteInsights ? 1 : 0, icon: Brain, ready: !!siteInsights },
                  { label: "Growth Forecast", count: forecastResult ? 1 : 0, icon: TrendingUp, ready: !!forecastResult },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${item.ready ? "bg-emerald-400/5 border-emerald-400/15" : "bg-white/[0.02] border-white/[0.04]"}`}>
                    <item.icon className={`h-4 w-4 ${item.ready ? "text-emerald-400" : "text-white/20"}`} />
                    <div className="flex-1">
                      <p className={`text-xs ${item.ready ? "text-white/80" : "text-white/40"}`}>{item.label}</p>
                    </div>
                    {item.ready ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-white/20" />}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5" onClick={() => {
                  // Build markdown report
                  let report = `# Competitive Intelligence Report\n`;
                  report += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

                  if (enterpriseProfile?.companyName) {
                    report += `## My Enterprise: ${enterpriseProfile.companyName}\n`;
                    if (enterpriseProfile.industry) report += `Industry: ${enterpriseProfile.industry}\n`;
                    if (enterpriseProfile.monthlyRevenue) report += `Monthly Revenue: ${enterpriseProfile.monthlyRevenue}\n`;
                    if (myStats) report += `Social: @${myStats.username} · ${fmtNum(myStats.followers)} followers · ${myStats.engagementRate}% ER\n`;
                    report += `\n`;
                  }

                  if (competitors.length > 0) {
                    report += `## Tracked Competitors (${competitors.length})\n\n`;
                    competitors.forEach(c => {
                      report += `### @${c.username} (${c.platform})\n`;
                      report += `- Followers: ${fmtNum(c.followers)}\n`;
                      report += `- Engagement Rate: ${c.engagementRate}%\n`;
                      report += `- Avg Likes: ${fmtNum(c.avgLikes)} · Avg Comments: ${c.avgComments}\n`;
                      report += `- Weekly Growth: ${c.growthRate}% · Posts/Week: ${c.postFrequency}\n`;
                      report += `- Threat Score: ${c.score}/100 (${getThreatLabel(c.score)})\n`;
                      if (c.metadata?.niche) report += `- Niche: ${c.metadata.niche}\n`;
                      if (c.topHashtags.length) report += `- Top Hashtags: ${c.topHashtags.map(t => `#${t}`).join(", ")}\n`;
                      report += `\n`;
                    });
                  }

                  if (swotResult) {
                    report += `## SWOT Analysis\n\n`;
                    report += `### Strengths\n${(swotResult.strengths || []).map(s => `- ${s}`).join("\n")}\n\n`;
                    report += `### Weaknesses\n${(swotResult.weaknesses || []).map(s => `- ${s}`).join("\n")}\n\n`;
                    report += `### Opportunities\n${(swotResult.opportunities || []).map(s => `- ${s}`).join("\n")}\n\n`;
                    report += `### Threats\n${(swotResult.threats || []).map(s => `- ${s}`).join("\n")}\n\n`;
                  }

                  if (gapAnalysis) {
                    report += `## Gap Analysis (Score: ${gapAnalysis.overallScore}/100)\n\n`;
                    if (gapAnalysis.hashtagGaps?.length) {
                      report += `### Hashtag Gaps\n`;
                      gapAnalysis.hashtagGaps.forEach((g: any) => { report += `- ${g.hashtag}: Reach ${g.potentialReach}, Usage: ${g.competitorUsage} — ${g.recommendation}\n`; });
                      report += `\n`;
                    }
                    if (gapAnalysis.topicGaps?.length) {
                      report += `### Topic Gaps\n`;
                      gapAnalysis.topicGaps.forEach((g: any) => { report += `- ${g.topic} (Demand: ${g.demandLevel}): ${g.actionItem}\n`; });
                      report += `\n`;
                    }
                  }

                  if (siteInsights) {
                    report += `## AI Competitive Intelligence\n`;
                    report += `Score: ${siteInsights.competitiveScore}/100 · Position: ${siteInsights.marketPosition?.tier}\n\n`;
                    report += `${siteInsights.executiveSummary}\n\n`;
                    if (siteInsights.immediateActions?.length) {
                      report += `### Immediate Actions\n`;
                      siteInsights.immediateActions.forEach((a: any) => { report += `- [${a.impact}] ${a.action} (${a.timeNeeded}): ${a.details}\n`; });
                      report += `\n`;
                    }
                  }

                  if (forecastResult) {
                    report += `## Growth Forecast (@${forecastResult.username})\n`;
                    report += `Trend: ${forecastResult.currentTrend}\n`;
                    report += `${forecastResult.trendAnalysis}\n\n`;
                    if (forecastResult.projections) {
                      report += `### Projections\n`;
                      report += `- 30 Days: ${fmtNum(forecastResult.projections.thirtyDays?.followers || 0)} followers\n`;
                      report += `- 90 Days: ${fmtNum(forecastResult.projections.ninetyDays?.followers || 0)} followers\n`;
                      report += `- 6 Months: ${fmtNum(forecastResult.projections.sixMonths?.followers || 0)} followers\n`;
                      report += `- 1 Year: ${fmtNum(forecastResult.projections.oneYear?.followers || 0)} followers\n\n`;
                    }
                  }

                  if (aiInsight) {
                    report += `## AI Strategy Brief\n\n${aiInsight}\n\n`;
                  }

                  report += `---\nGenerated by Uplyze Competitor Analyzer\n`;

                  // Download as markdown
                  const blob = new Blob([report], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `competitive-intel-${new Date().toISOString().slice(0, 10)}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Report exported as Markdown");
                }}>
                  <Download className="h-4 w-4" /> Export as Markdown
                </Button>

                <Button variant="outline" className="gap-1.5 border-white/10 text-white/60 hover:text-white" onClick={() => {
                  // Copy to clipboard
                  const sections: string[] = [];
                  sections.push(`📊 COMPETITIVE INTELLIGENCE REPORT — ${new Date().toLocaleDateString()}`);
                  if (competitors.length) {
                    sections.push(`\n👥 ${competitors.length} TRACKED COMPETITORS`);
                    competitors.forEach(c => { sections.push(`  @${c.username} (${c.platform}): ${fmtNum(c.followers)} followers, ${c.engagementRate}% ER, Threat: ${c.score}/100`); });
                  }
                  if (siteInsights) {
                    sections.push(`\n🧠 AI INTELLIGENCE SCORE: ${siteInsights.competitiveScore}/100 (${siteInsights.marketPosition?.tier})`);
                    sections.push(siteInsights.executiveSummary);
                  }
                  if (forecastResult) {
                    sections.push(`\n📈 GROWTH FORECAST: ${forecastResult.currentTrend}`);
                    sections.push(`  30d: ${fmtNum(forecastResult.projections?.thirtyDays?.followers || 0)} · 1yr: ${fmtNum(forecastResult.projections?.oneYear?.followers || 0)}`);
                  }
                  navigator.clipboard.writeText(sections.join("\n"));
                  toast.success("Summary copied to clipboard");
                }}>
                  <Copy className="h-4 w-4" /> Copy Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitorAnalyzer;

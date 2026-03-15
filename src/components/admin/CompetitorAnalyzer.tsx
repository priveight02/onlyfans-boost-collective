import { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Crosshair, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  BarChart3, Users, Hash, Zap, Brain, Target, ArrowUpRight, ArrowDownRight,
  Loader2, Clock, AlertTriangle, Calendar as CalendarIcon, Search, Eye, Globe, Sparkles,
  Shield, Flame, Crown, Download, Copy, ChevronDown, ChevronUp, Star,
  Link, Lock, FileText, Image as ImageIcon, Code, Activity, CheckCircle, XCircle, ExternalLink,
  DollarSign, TrendingUp as TrendUp, Building2, Briefcase, Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
  ContextMenuSeparator, ContextMenuLabel,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
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
const chartTooltipLabelStyle = { color: "rgba(255,255,255,0.9)", fontWeight: 600 };
const chartTooltipItemStyle = { color: "rgba(255,255,255,0.75)" };

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
  // First try direct parse (edge function now pre-cleans responses)
  try {
    return JSON.parse(text);
  } catch { /* continue to cleanup */ }

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
      .replace(/,\s*]/g, "]")
      .replace(/'/g, '"')
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

    try {
      return JSON.parse(repaired);
    } catch {
      // Last resort: try to close truncated JSON
      let lastBrace = repaired.lastIndexOf("}");
      let lastBracket = repaired.lastIndexOf("]");
      if (lastBrace > 0 && repaired.trimStart().startsWith("{")) {
        try { return JSON.parse(repaired.slice(0, lastBrace + 1)); } catch {}
      }
      if (lastBracket > 0 && repaired.trimStart().startsWith("[")) {
        try { return JSON.parse(repaired.slice(0, lastBracket + 1)); } catch {}
      }
      if (detectTruncation(candidate)) {
        throw new Error("AI response was truncated. Please retry.");
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
  const [newPlatform, setNewPlatform] = useState("internet");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [newCompetitorKeywords, setNewCompetitorKeywords] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [syncCompetitorsAcrossTabs, setSyncCompetitorsAcrossTabs] = useState(() => {
    try { return localStorage.getItem("competitor_sync_selection") === "true"; } catch { return true; }
  });
  const toggleSyncCompetitors = (on: boolean) => {
    setSyncCompetitorsAcrossTabs(on);
    localStorage.setItem("competitor_sync_selection", on ? "true" : "false");
    toast.success(on ? "Competitor selection synced across all tabs" : "Competitor selection independent per tab");
  };
  const toggleCompetitorSelection = (id: string) => {
    setSelectedCompetitors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAllCompetitors = () => setSelectedCompetitors(competitors.map(c => c.id));
  const deselectAllCompetitors = () => setSelectedCompetitors([]);
  // Backward compat: derive single selected + selected array
  const selectedCompetitor = selectedCompetitors[0] || null;
  const selectedComps = competitors.filter(c => selectedCompetitors.includes(c.id));
  const [swotResult, setSwotResult] = useState<AnalysisResult | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingBreakdown, setRefreshingBreakdown] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [platformTimePeriods, setPlatformTimePeriods] = useState<Record<string, string>>({});
  const [platformCustomDates, setPlatformCustomDates] = useState<Record<string, Date[]>>({});
  const setPlatformPeriod = (platformKey: string, period: string) => {
    setPlatformTimePeriods(prev => ({ ...prev, [platformKey]: period }));
  };
  const setPlatformDates = (platformKey: string, dates: Date[]) => {
    setPlatformCustomDates(prev => ({ ...prev, [platformKey]: dates }));
  };

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

  // Battle plan progress tracking (persisted in localStorage)
  const [battlePlanChecks, setBattlePlanChecks] = useState<Record<string, boolean>>(() => {
    try { const s = localStorage.getItem("competitor_battleplan_checks"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const toggleBattlePlanCheck = (key: string) => {
    setBattlePlanChecks(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("competitor_battleplan_checks", JSON.stringify(next));
      return next;
    });
  };

  // Tracker sort/filter
  const [trackerSort, setTrackerSort] = useState<"threat" | "followers" | "growth" | "engagement" | "recent">("threat");
  const [trackerFilter, setTrackerFilter] = useState<string>("all");

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
        if (selectedCompetitors.length === 0) setSelectedCompetitors([rows[0].id]);
      }
    })();
  }, []);

  const addCompetitor = async () => {
    const isInternet = newPlatform === "internet";
    const username = isInternet ? (newCompetitorKeywords.trim() || newCompetitorUrl.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")) : newUsername.trim().replace(/^@/, "");
    const url = isInternet ? newCompetitorUrl.trim() : "";
    const keywords = isInternet ? newCompetitorKeywords.trim() : "";

    if (!isInternet && !username) return;
    if (isInternet && !url) { toast.error("Enter a competitor website URL"); return; }

    // Check for duplicate
    if (!isInternet && competitors.some(c => c.username.toLowerCase() === username.toLowerCase() && c.platform === newPlatform)) {
      toast.error(`@${username} is already being tracked on ${newPlatform}`);
      return;
    }
    if (isInternet && competitors.some(c => c.platform === "internet" && c.metadata?.websiteUrl && c.metadata.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") === url.replace(/^https?:\/\//, "").replace(/\/$/, ""))) {
      toast.error(`This website is already being tracked`);
      return;
    }

    setAnalyzing(true);
    const result = await performAction("competitor_add", async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const todayStr = new Date().toISOString().slice(0, 10);

      const prompt = isInternet
        ? `You are an elite competitive intelligence analyst. Today is ${todayStr}. Analyze this competitor business/website and provide comprehensive data.

WEBSITE: ${url}
COMPETITOR NAME/KEYWORDS: ${keywords || "not provided — infer from website"}

Research this website/company and provide the MOST UP TO DATE data as of today ${todayStr}. Use the website URL and keywords to identify the exact competitor.

IMPORTANT: Return ONLY a valid JSON object, no markdown, no explanation:
{
  "displayName": "company/brand name",
  "companyDescription": "1-2 sentence description of what they do",
  "industry": "their industry/niche",
  "foundedYear": "year founded or estimate",
  "headquarters": "city, country",
  "teamSize": "estimated team size range",
  "websiteTraffic": "estimated monthly visitors as number",
  "domainAuthority": <number 0-100>,
  "socialPresence": {"instagram": "handle or null", "twitter": "handle or null", "linkedin": "handle or null", "tiktok": "handle or null", "youtube": "handle or null"},
  "followers": <total social following across platforms as number>,
  "following": 0,
  "posts": <estimated total content pieces>,
  "engagementRate": <number 0.5-15, average social engagement rate>,
  "avgLikes": <average likes across platforms>,
  "avgComments": <average comments>,
  "growthRate": <number -5 to 15, estimated weekly traffic/social growth %>,
  "postFrequency": <content pieces per week>,
  "topHashtags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "contentTypes": [{"type":"Blog","pct":30},{"type":"Video","pct":25},{"type":"Social","pct":25},{"type":"Email","pct":20}],
  "niche": "their specific niche",
  "revenueEstimate": "estimated ARR/revenue range",
  "pricingModel": "freemium/subscription/one-time/etc",
  "mainProducts": ["product1", "product2"],
  "targetAudience": "who they target",
  "competitiveStrengths": ["strength1", "strength2", "strength3"],
  "competitiveWeaknesses": ["weakness1", "weakness2"],
  "techStack": ["tech1", "tech2", "tech3"],
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "fundingStatus": "bootstrapped/seed/series A/etc or unknown",
  "score": <number 0-100, competitive threat level>
}

Be as accurate as possible using your knowledge. If you recognize the company, use real data. Estimates must be clearly realistic.`
        : `You are a social media analytics expert. Today is ${todayStr}. Analyze the ${newPlatform} account @${username} and provide realistic estimated statistics based on what you know about this account or similar accounts in that niche. All data must reflect the MOST CURRENT state as of ${todayStr}.

IMPORTANT: Return ONLY a valid JSON object, no markdown, no explanation. The JSON must have these exact keys:
{
  "displayName": "their display name or best guess",
  "followers": <number - realistic follower count on ${newPlatform}>,
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
  "score": <number 0-100, competitive threat level>,
  "socialPresence": {"instagram": "handle or null", "twitter": "handle or null", "linkedin": "handle or null", "tiktok": "handle or null", "youtube": "handle or null"},
  "platformMetrics": {
    "${newPlatform}": {"followers": <same as top-level followers>, "engagementRate": <same as top-level>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>}
  }
}

CRITICAL: The platformMetrics must contain the ACTUAL per-platform data. If this account is present on multiple platforms, include ALL of them with DIFFERENT follower counts for each.
Be as accurate as possible. If you recognize the account, use real data. If not, estimate based on the username and platform norms.`;

      let parsed: any;
      try {
        const aiReply = await callAI(prompt);
        parsed = parseJSON(aiReply);
      } catch {
        toast.error("AI analysis failed to return valid data. Please try again.");
        throw new Error("Failed to parse AI response");
      }

      // Validate critical fields
      if (!parsed.followers && !isInternet) {
        toast.error("AI returned invalid data. Please try again.");
        throw new Error("Invalid AI response data");
      }

      const id = crypto.randomUUID();
      const competitorName = isInternet 
        ? (parsed.displayName || keywords || url.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
        : (parsed.displayName || username);

      const row: Record<string, any> = {
        id,
        user_id: user.id,
        username: isInternet ? competitorName.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 50) : username,
        platform: newPlatform,
        display_name: competitorName,
        followers: parsed.followers || parsed.websiteTraffic || 0,
        following: parsed.following || 0,
        posts: parsed.posts || 0,
        engagement_rate: parsed.engagementRate || 0,
        avg_likes: parsed.avgLikes || 0,
        avg_comments: parsed.avgComments || 0,
        growth_rate: parsed.growthRate || 0,
        post_frequency: parsed.postFrequency || 0,
        top_hashtags: parsed.topHashtags || parsed.seoKeywords || [],
        content_types: parsed.contentTypes || [],
        threat_score: parsed.score || 50,
        metadata: {
          ...(isInternet ? {
            websiteUrl: url.startsWith("http") ? url : `https://${url}`,
            competitorKeywords: keywords,
            companyDescription: parsed.companyDescription,
            industry: parsed.industry,
            foundedYear: parsed.foundedYear,
            headquarters: parsed.headquarters,
            teamSize: parsed.teamSize,
            websiteTraffic: parsed.websiteTraffic,
            domainAuthority: parsed.domainAuthority,
            socialPresence: parsed.socialPresence,
            platformMetrics: parsed.platformMetrics,
            revenueEstimate: parsed.revenueEstimate,
            pricingModel: parsed.pricingModel,
            mainProducts: parsed.mainProducts,
            targetAudience: parsed.targetAudience,
            competitiveStrengths: parsed.competitiveStrengths,
            competitiveWeaknesses: parsed.competitiveWeaknesses,
            techStack: parsed.techStack,
            fundingStatus: parsed.fundingStatus,
          } : {
            niche: parsed.niche,
            bestPostingTimes: parsed.bestPostingTimes,
            audienceDemo: parsed.audienceDemo,
            contentStyle: parsed.contentStyle,
            socialPresence: parsed.socialPresence,
            platformMetrics: parsed.platformMetrics,
          }),
          analysisHistory: [{ date: new Date().toISOString(), followers: parsed.followers || parsed.websiteTraffic || 0, engagement: parsed.engagementRate || 0 }],
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
      setNewCompetitorUrl("");
      setNewCompetitorKeywords("");
      if (selectedCompetitors.length === 0) setSelectedCompetitors([result.id]);
      toast.success(isInternet ? `${result.displayName} analyzed and added` : `@${result.username} analyzed and added`);
    }
  };

  const removeCompetitor = async (id: string) => {
    await competitorRest.remove(id);
    setCompetitors(prev => prev.filter(c => c.id !== id));
    setSelectedCompetitors(prev => {
      const next = prev.filter(x => x !== id);
      if (next.length === 0) {
        const remaining = competitors.filter(c => c.id !== id);
        return remaining.length > 0 ? [remaining[0].id] : [];
      }
      return next;
    });
    toast.success("Competitor removed");
  };

  const refreshCompetitor = async (comp: Competitor) => {
    setRefreshingId(comp.id);
    await performAction("competitor_refresh", async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const isInternet = comp.platform === "internet";
      const refreshPrompt = isInternet
        ? `You are an elite competitive intelligence analyst. Today is ${todayStr}. Provide UPDATED data for this competitor business/website.
Website: ${comp.metadata?.websiteUrl || comp.username}
Company: ${comp.displayName}
Previous data: ${comp.followers} traffic/followers, ${comp.engagementRate}% engagement, DA: ${comp.metadata?.domainAuthority || "?"}.

Return ONLY valid JSON with updated data as of today:
{
  "displayName": "company/brand name",
  "followers": <updated total social following across all platforms as number>,
  "following": 0,
  "posts": <content count>,
  "engagementRate": <number>,
  "avgLikes": <number>,
  "avgComments": <number>,
  "growthRate": <weekly growth %>,
  "postFrequency": <content pieces/week>,
  "topHashtags": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "contentTypes": [{"type":"Blog","pct":30},{"type":"Video","pct":25},{"type":"Social","pct":25},{"type":"Email","pct":20}],
  "socialPresence": {"instagram": "handle or null", "twitter": "handle or null", "linkedin": "handle or null", "tiktok": "handle or null", "youtube": "handle or null", "facebook": "handle or null"},
  "platformMetrics": {
    "instagram": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>},
    "tiktok": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>},
    "twitter": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>},
    "youtube": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>},
    "linkedin": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>},
    "facebook": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>}
  },
  "score": <0-100 threat level>,
  "recentTrend": "brief description of recent company/website trend"
}`
        : `You are a social media analytics expert. Today is ${todayStr}. Provide UPDATED stats for the ${comp.platform} account @${comp.username}.
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
  "socialPresence": {"instagram": "handle or null", "twitter": "handle or null", "linkedin": "handle or null", "tiktok": "handle or null", "youtube": "handle or null"},
  "platformMetrics": {
    "${comp.platform}": {"followers": <number>, "engagementRate": <number>, "avgLikes": <number>, "postFrequency": <number>, "growthRate": <number>, "posts": <number>}
  },
  "score": <0-100 threat level>,
  "recentTrend": "brief description of recent trend"
}`;

      const aiReply = await callAI(refreshPrompt);

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
          socialPresence: parsed.socialPresence || comp.metadata?.socialPresence,
          platformMetrics: parsed.platformMetrics || comp.metadata?.platformMetrics,
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
      await refreshAIUsage();
      return true;
    });
    setRefreshingId(null);
  };

  const refreshPlatformBreakdown = async () => {
    const targets = competitors.filter(c => c.platform === "internet" || !!c.metadata?.socialPresence || !!c.metadata?.platformMetrics);
    if (targets.length === 0) {
      toast.error("No competitors with social profile data found");
      return;
    }

    setRefreshingBreakdown(true);
    try {
      const { data, error } = await supabase.functions.invoke("competitor-analyze", {
        body: {
          action: "batch_platform_refresh",
          competitors: targets.map(c => ({
            id: c.id,
            followers: c.followers,
            websiteUrl: c.metadata?.websiteUrl || null,
            socialPresence: c.metadata?.socialPresence || {},
            platformMetrics: c.metadata?.platformMetrics || {},
          })),
        },
      });

      if (error) throw new Error(error.message || "Refresh failed");
      const results = Array.isArray(data?.results) ? data.results : [];
      if (!results.length) throw new Error("No platform data returned");

      const now = new Date().toISOString();
      const byId = new Map<string, any>(results.map((r: any) => [r.id, r]));

      const nextCompetitors = competitors.map((c) => {
        const fresh = byId.get(c.id);
        if (!fresh) return c;
        const prevHistory = c.metadata?.analysisHistory || [];
        return {
          ...c,
          followers: typeof fresh.followers === "number" && fresh.followers > 0 ? fresh.followers : c.followers,
          lastAnalyzed: now,
          metadata: {
            ...c.metadata,
            socialPresence: fresh.socialPresence || c.metadata?.socialPresence,
            platformMetrics: fresh.platformMetrics || c.metadata?.platformMetrics,
            analysisHistory: [...prevHistory, { date: now, followers: typeof fresh.followers === "number" ? fresh.followers : c.followers, engagement: c.engagementRate }].slice(-20),
          },
        };
      });

      const changedRows = nextCompetitors.filter((c) => byId.has(c.id));
      await Promise.all(changedRows.map((c) => competitorRest.update(c.id, {
        followers: c.followers,
        metadata: c.metadata,
        last_analyzed_at: now,
      })));

      setCompetitors(nextCompetitors);
      toast.success("Platform breakdown refreshed with live profile stats");
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh platform breakdown");
    } finally {
      setRefreshingBreakdown(false);
    }
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
        await refreshAIUsage();
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
        await refreshAIUsage();
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
        await refreshAIUsage();
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
        await refreshAIUsage();
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
  "riskAssessment": {"overallThreat": "low/medium/high/critical", "biggestRisk": "main risk", "mitigation": "how to mitigate"},
  "emailAutomationIntel": {"hasEmailCapture": true, "captureMethod": "popup/inline/exit-intent", "leadMagnet": "what they offer", "estimatedListSize": "range", "emailFrequency": "daily/weekly/monthly", "automationLevel": "basic/advanced/enterprise", "espPlatform": "detected email platform", "yourOpportunity": "how to build a better email funnel"},
  "seoKeywordGaps": [{"keyword": "keyword they rank for", "estimatedPosition": "1-100", "searchVolume": "monthly", "difficulty": "easy/medium/hard", "yourAction": "how to outrank them on this", "contentToCreate": "specific content piece"}],
  "competitiveMoat": {"moatType": "brand/network/cost/tech/data/switching-costs/none", "moatStrength": "strong/moderate/weak/none", "howToBreachIt": "specific tactics to overcome their moat", "timeToBreak": "estimated timeline", "yourMoatAdvice": "what moat you should build"},
  "brandPerception": {"brandStrength": <0-100>, "brandPersonality": "how their brand comes across", "brandWeaknesses": ["brand weak spots"], "brandOpportunities": ["how to position against their brand"], "messagingGaps": ["messaging angles they miss"], "emotionalAppeal": "what emotion their brand triggers", "yourBrandStrategy": "how to differentiate your brand"},
  "retentionSignals": {"hasLoyaltyProgram": true, "retentionTactics": ["tactic1"], "communityEngagement": "strong/moderate/weak", "repeatPurchaseSignals": "what indicates repeat buying", "churnVulnerabilities": ["why their customers might leave"], "yourRetentionPlay": "how to build better retention"}
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


        {/* ═══ SELECTED COMPETITORS BAR ═══ */}
        {selectedCompetitors.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[hsl(217,91%,60%)]/[0.04] border border-[hsl(217,91%,60%)]/10">
            <div className="flex items-center gap-2 flex-1 flex-wrap min-w-0">
              <span className="text-[10px] text-white/40 font-medium flex-shrink-0">Selected ({selectedCompetitors.length}):</span>
              {selectedComps.map(c => (
                <Badge key={c.id} className="bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)] border border-[hsl(217,91%,60%)]/20 text-[10px] gap-1 cursor-pointer hover:bg-[hsl(217,91%,60%)]/20 transition-colors" onClick={() => toggleCompetitorSelection(c.id)}>
                  {c.platform === "internet" ? "🌐" : "@"}{c.platform === "internet" ? c.displayName : c.username}
                  <XCircle className="h-2.5 w-2.5 opacity-50 hover:opacity-100" />
                </Badge>
              ))}
              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-white/30 hover:text-white/60" onClick={selectAllCompetitors}>All</Button>
                <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-white/30 hover:text-white/60" onClick={deselectAllCompetitors}>None</Button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pl-3 border-l border-white/[0.06]">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <Switch checked={syncCompetitorsAcrossTabs} onCheckedChange={toggleSyncCompetitors} className="h-4 w-7 data-[state=checked]:bg-[hsl(217,91%,60%)]" />
                <span className="text-[10px] text-white/50 whitespace-nowrap">Sync across tabs</span>
              </label>
            </div>
          </div>
        )}

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
              <div className="flex gap-3 items-end flex-wrap">
                <div className="space-y-1.5 w-[140px]">
                  <label className="text-xs font-medium text-white/50">Platform</label>
                  <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="h-10 w-full px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
                    <option value="internet">🌐 Internet / Website</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="youtube">YouTube</option>
                    <option value="threads">Threads</option>
                  </select>
                </div>

                {newPlatform === "internet" ? (
                  <>
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <label className="text-xs font-medium text-white/50">Competitor Website URL <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input value={newCompetitorUrl} onChange={e => setNewCompetitorUrl(e.target.value)} placeholder="example.com or https://competitor.com" className="crm-input pl-9" onKeyDown={e => e.key === "Enter" && !analyzing && addCompetitor()} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <label className="text-xs font-medium text-white/50">Competitor Name / Keywords <span className="text-white/25">(helps AI identify)</span></label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input value={newCompetitorKeywords} onChange={e => setNewCompetitorKeywords(e.target.value)} placeholder="e.g. Acme Corp, SaaS, project management" className="crm-input pl-9" onKeyDown={e => e.key === "Enter" && !analyzing && addCompetitor()} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-xs font-medium text-white/50">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
                      <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="competitor_username" className="crm-input pl-7" onKeyDown={e => e.key === "Enter" && !analyzing && addCompetitor()} />
                    </div>
                  </div>
                )}

                <Button onClick={addCompetitor} disabled={analyzing || (newPlatform === "internet" ? !newCompetitorUrl.trim() : !newUsername.trim())} className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-1.5 h-10">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {analyzing ? "Analyzing..." : "Add & Analyze"}
                </Button>
                {competitors.length >= 2 && (
                  <Button variant="outline" className="gap-1.5 h-10 border-white/10 text-white/60 hover:text-white" disabled={analyzing || !!refreshingId}
                    onClick={async () => {
                      for (const comp of competitors) {
                        await refreshCompetitor(comp);
                      }
                      toast.success(`All ${competitors.length} competitors refreshed`);
                    }}>
                    <RefreshCw className={`h-4 w-4 ${refreshingId ? "animate-spin" : ""}`} />
                    Refresh All
                  </Button>
                )}
              </div>
              {newPlatform === "internet" && (
                <p className="text-[10px] text-white/30 mt-2 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Enter any competitor's website — AI will research their company, traffic, social presence, revenue, team size, and more
                </p>
              )}
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
              <div className="flex items-center justify-between flex-wrap gap-2">
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
                  {/* Master Sync All switch */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1 rounded-lg bg-[hsl(217,91%,60%)]/[0.04] border border-[hsl(217,91%,60%)]/10 hover:bg-[hsl(217,91%,60%)]/[0.08] transition-colors" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={syncCompetitorsAcrossTabs && selectedCompetitors.length === competitors.length && competitors.length > 0}
                      onCheckedChange={(on) => {
                        if (on) {
                          setSelectedCompetitors(competitors.map(c => c.id));
                          setSyncCompetitorsAcrossTabs(true);
                          localStorage.setItem("competitor_sync_selection", "true");
                          toast.success("All competitors synced across all tabs");
                        } else {
                          setSelectedCompetitors([]);
                          setSyncCompetitorsAcrossTabs(false);
                          localStorage.setItem("competitor_sync_selection", "false");
                          toast.success("Sync disabled — selection cleared");
                        }
                      }}
                      className="h-4 w-7 data-[state=checked]:bg-[hsl(217,91%,60%)]"
                    />
                    <span className="text-[10px] text-white/50 whitespace-nowrap font-medium">Sync All Across Tabs</span>
                  </label>
                  <span className="text-[10px] text-white/25">{competitors.length} competitor{competitors.length !== 1 ? "s" : ""}</span>
                  {/* Stale data warning */}
                  {competitors.some(c => {
                    const hrs = (Date.now() - new Date(c.lastAnalyzed).getTime()) / 3600000;
                    return hrs > 168; // 7 days
                  }) && (
                    <Badge variant="outline" className="text-[9px] border-amber-400/20 text-amber-400 animate-pulse">
                      ⚠ {competitors.filter(c => (Date.now() - new Date(c.lastAnalyzed).getTime()) / 3600000 > 168).length} stale
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <select value={trackerSort} onChange={e => setTrackerSort(e.target.value as any)} className="h-7 px-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/60 text-[10px] focus:outline-none">
                    <option value="threat">Sort: Threat</option>
                    <option value="followers">Sort: Followers</option>
                    <option value="growth">Sort: Growth</option>
                    <option value="engagement">Sort: Engagement</option>
                    <option value="recent">Sort: Recent</option>
                  </select>
                  {/* Platform filter */}
                  <select value={trackerFilter} onChange={e => setTrackerFilter(e.target.value)} className="h-7 px-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/60 text-[10px] focus:outline-none">
                    <option value="all">All Platforms</option>
                    {[...new Set(competitors.map(c => c.platform))].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {competitors
                .filter(c => trackerFilter === "all" || c.platform === trackerFilter)
                .sort((a, b) => {
                  switch (trackerSort) {
                    case "followers": return b.followers - a.followers;
                    case "growth": return b.growthRate - a.growthRate;
                    case "engagement": return b.engagementRate - a.engagementRate;
                    case "recent": return new Date(b.lastAnalyzed).getTime() - new Date(a.lastAnalyzed).getTime();
                    default: return b.score - a.score;
                  }
                })
                .map(comp => {
                const historyData = comp.metadata?.analysisHistory || [];
                const threatPct = Math.min(comp.score, 100);
                const circumference = 2 * Math.PI * 32;
                const strokeDash = (threatPct / 100) * circumference;
                const threatStroke = comp.score >= 70 ? "hsl(350,80%,55%)" : comp.score >= 40 ? "hsl(30,95%,60%)" : "hsl(150,60%,50%)";
                const threatGlow = comp.score >= 70 ? "drop-shadow(0 0 6px hsl(350,80%,55%/0.4))" : comp.score >= 40 ? "drop-shadow(0 0 6px hsl(30,95%,60%/0.4))" : "drop-shadow(0 0 6px hsl(150,60%,50%/0.4))";
                return (
                <Card
                  key={comp.id}
                  className={`crm-card cursor-pointer transition-all duration-300 hover:border-white/10 hover:shadow-[0_8px_32px_hsl(0,0%,0%/0.3)] hover:translate-y-[-2px] ${selectedCompetitors.includes(comp.id) ? "ring-1 ring-[hsl(217,91%,60%)]/40 shadow-[0_0_20px_hsl(217,91%,60%/0.08)]" : ""}`}
                  onClick={() => toggleCompetitorSelection(comp.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Selection checkbox */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedCompetitors.includes(comp.id) ? "bg-[hsl(217,91%,60%)] border-[hsl(217,91%,60%)]" : "border-white/20 hover:border-white/40"}`}>
                          {selectedCompetitors.includes(comp.id) && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
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
                          <p className="text-white font-medium text-sm">{comp.platform === "internet" ? comp.displayName : `@${comp.username}`}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className={`text-[10px] ${comp.platform === "internet" ? "border-cyan-400/20 text-cyan-400" : "border-white/10 text-white/50"}`}>
                              {comp.platform === "internet" ? "🌐 Website" : comp.platform}
                            </Badge>
                            {comp.metadata?.niche && (
                              <Badge variant="outline" className="text-[10px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]/60">{comp.metadata.niche || comp.metadata.industry}</Badge>
                            )}
                          </div>
                          {comp.platform === "internet" && comp.metadata?.websiteUrl && (
                            <a href={comp.metadata.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[hsl(217,91%,60%)]/50 hover:text-[hsl(217,91%,60%)] flex items-center gap-0.5 mt-0.5">
                              <ExternalLink className="h-2.5 w-2.5" /> {comp.metadata.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                          )}
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
                        { label: comp.platform === "internet" ? "Traffic/Reach" : "Followers", value: fmtNum(comp.followers) },
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

                    {/* Freshness Indicator */}
                    {(() => {
                      const hrs = (Date.now() - new Date(comp.lastAnalyzed).getTime()) / 3600000;
                      const label = hrs < 1 ? "Just now" : hrs < 24 ? `${Math.round(hrs)}h ago` : hrs < 168 ? `${Math.round(hrs / 24)}d ago` : `${Math.round(hrs / 168)}w ago`;
                      const color = hrs < 24 ? "text-emerald-400/60" : hrs < 168 ? "text-amber-400/60" : "text-red-400/60";
                      return (
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] ${color} flex items-center gap-1`}>
                            <Clock className="h-2.5 w-2.5" /> {label}
                          </span>
                          {hrs > 168 && <span className="text-[8px] text-red-400/40">needs refresh</span>}
                        </div>
                      );
                    })()}

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
                        {/* Internet competitor extra info */}
                        {comp.platform === "internet" && (
                          <>
                            {comp.metadata?.companyDescription && (
                              <div className="p-2 rounded-lg bg-cyan-400/5 border border-cyan-400/10">
                                <p className="text-[10px] text-cyan-400 mb-1">About</p>
                                <p className="text-xs text-white/70">{comp.metadata.companyDescription}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-1.5">
                              {comp.metadata?.industry && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Industry</p>
                                  <p className="text-[11px] text-white/70">{comp.metadata.industry}</p>
                                </div>
                              )}
                              {comp.metadata?.headquarters && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">HQ</p>
                                  <p className="text-[11px] text-white/70">{comp.metadata.headquarters}</p>
                                </div>
                              )}
                              {comp.metadata?.teamSize && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Team Size</p>
                                  <p className="text-[11px] text-white/70">{comp.metadata.teamSize}</p>
                                </div>
                              )}
                              {comp.metadata?.foundedYear && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Founded</p>
                                  <p className="text-[11px] text-white/70">{comp.metadata.foundedYear}</p>
                                </div>
                              )}
                              {comp.metadata?.revenueEstimate && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Revenue Est.</p>
                                  <p className="text-[11px] text-emerald-400">{comp.metadata.revenueEstimate}</p>
                                </div>
                              )}
                              {comp.metadata?.fundingStatus && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Funding</p>
                                  <p className="text-[11px] text-white/70">{comp.metadata.fundingStatus}</p>
                                </div>
                              )}
                              {comp.metadata?.pricingModel && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Pricing</p>
                                  <p className="text-[11px] text-white/70">{comp.metadata.pricingModel}</p>
                                </div>
                              )}
                              {comp.metadata?.domainAuthority && (
                                <div className="p-1.5 rounded bg-white/[0.02]">
                                  <p className="text-[9px] text-white/30">Domain Auth.</p>
                                  <p className="text-[11px] text-[hsl(217,91%,60%)]">{comp.metadata.domainAuthority}/100</p>
                                </div>
                              )}
                            </div>
                            {comp.metadata?.targetAudience && (
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Target Audience</p>
                                <p className="text-xs text-white/70">{comp.metadata.targetAudience}</p>
                              </div>
                            )}
                            {(comp.metadata?.mainProducts || []).length > 0 && (
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Products</p>
                                <div className="flex flex-wrap gap-1">{comp.metadata.mainProducts.map((p: string, i: number) => <Badge key={i} variant="outline" className="text-[9px] border-white/10 text-white/50">{p}</Badge>)}</div>
                              </div>
                            )}
                            {(comp.metadata?.competitiveStrengths || []).length > 0 && (
                              <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400 mb-1">Their Strengths</p>
                                {comp.metadata.competitiveStrengths.map((s: string, i: number) => <p key={i} className="text-[10px] text-white/60">• {s}</p>)}
                              </div>
                            )}
                            {(comp.metadata?.competitiveWeaknesses || []).length > 0 && (
                              <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/10">
                                <p className="text-[10px] text-red-400 mb-1">Their Weaknesses</p>
                                {comp.metadata.competitiveWeaknesses.map((w: string, i: number) => <p key={i} className="text-[10px] text-white/60">• {w}</p>)}
                              </div>
                            )}
                            {(comp.metadata?.techStack || []).length > 0 && (
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Tech Stack</p>
                                <div className="flex flex-wrap gap-1">{comp.metadata.techStack.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-[9px] border-purple-400/20 text-purple-400">{t}</Badge>)}</div>
                              </div>
                            )}
                            {comp.metadata?.socialPresence && (
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40 mb-1">Social Presence</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(comp.metadata.socialPresence).filter(([, v]) => v && v !== "null").map(([platform, handle]) => (
                                    <Badge key={platform} variant="outline" className="text-[9px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]/60">{platform}: {String(handle)}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
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
                            <p className="text-[10px] text-white/40 mb-1">{comp.platform === "internet" ? "SEO Keywords" : "Top Hashtags"}</p>
                            <div className="flex gap-1 flex-wrap">
                              {comp.topHashtags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-[10px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]/60">{comp.platform === "internet" ? tag : `#${tag}`}</Badge>
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
                        {/* Engagement Efficiency */}
                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <p className="text-[10px] text-white/40 mb-1">Engagement Efficiency</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <p className="text-xs font-bold text-[hsl(217,91%,60%)]">{comp.followers > 0 ? (comp.avgLikes / comp.followers * 100).toFixed(2) : 0}%</p>
                              <p className="text-[8px] text-white/30">Like Rate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-emerald-400">{comp.followers > 0 ? (comp.avgComments / comp.followers * 100).toFixed(3) : 0}%</p>
                              <p className="text-[8px] text-white/30">Comment Rate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-amber-400">{comp.postFrequency > 0 ? Math.round(comp.avgLikes * comp.postFrequency) : 0}</p>
                              <p className="text-[8px] text-white/30">Weekly Impressions Est.</p>
                            </div>
                          </div>
                        </div>
                        {/* Quick Notes */}
                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <p className="text-[10px] text-white/40 mb-1">Notes</p>
                          <Textarea
                            placeholder="Add private notes about this competitor..."
                            className="text-xs bg-transparent border-white/[0.06] text-white/70 min-h-[48px] resize-none placeholder:text-white/20"
                            defaultValue={comp.metadata?.notes || ""}
                            onBlur={async (e) => {
                              const notes = e.target.value.trim();
                              await competitorRest.update(comp.id, { metadata: { ...comp.metadata, notes } });
                              setCompetitors(prev => prev.map(c => c.id === comp.id ? { ...c, metadata: { ...c.metadata, notes } } : c));
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Per-card Sync Across Tabs */}
                    <div className="flex items-center justify-between px-1 py-1.5 rounded-lg bg-[hsl(217,91%,60%)]/[0.03] border border-[hsl(217,91%,60%)]/[0.06]" onClick={e => e.stopPropagation()}>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={selectedCompetitors.includes(comp.id) && syncCompetitorsAcrossTabs}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              if (!selectedCompetitors.includes(comp.id)) {
                                setSelectedCompetitors(prev => [...prev, comp.id]);
                              }
                              if (!syncCompetitorsAcrossTabs) {
                                setSyncCompetitorsAcrossTabs(true);
                                localStorage.setItem("competitor_sync_selection", "true");
                              }
                            } else {
                              setSelectedCompetitors(prev => prev.filter(x => x !== comp.id));
                            }
                          }}
                          className="h-3 w-3 rounded border-white/20 bg-white/5 text-[hsl(217,91%,60%)] focus:ring-[hsl(217,91%,60%)]/30 cursor-pointer accent-[hsl(217,91%,60%)]"
                        />
                        <span className="text-[9px] text-white/40">Use across all tabs</span>
                      </label>
                      {selectedCompetitors.includes(comp.id) && syncCompetitorsAcrossTabs && (
                        <CheckCircle className="h-3 w-3 text-[hsl(217,91%,60%)]/60 flex-shrink-0" />
                      )}
                    </div>

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

              {/* ═══ POWER RANKINGS LEADERBOARD ═══ */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><Crown className="h-4 w-4" /> Power Rankings Leaderboard</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(() => {
                      const ranked = [...competitors].map(c => {
                        // Weighted composite score
                        const maxF = Math.max(...competitors.map(x => x.followers), 1);
                        const maxL = Math.max(...competitors.map(x => x.avgLikes), 1);
                        const maxG = Math.max(...competitors.map(x => Math.abs(x.growthRate)), 1);
                        const fScore = (c.followers / maxF) * 25;
                        const eScore = Math.min(c.engagementRate / 10, 1) * 25;
                        const lScore = (c.avgLikes / maxL) * 25;
                        const gScore = (Math.max(c.growthRate, 0) / maxG) * 25;
                        const power = Math.round(fScore + eScore + lScore + gScore);
                        return { ...c, power };
                      }).sort((a, b) => b.power - a.power);
                      return ranked.map((c, i) => (
                        <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${i === 0 ? "bg-amber-400/10 border-amber-400/20 shadow-[0_0_15px_hsl(45,100%,50%,0.05)]" : i === 1 ? "bg-white/[0.03] border-white/[0.08]" : "bg-white/[0.02] border-white/[0.04]"}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-white/20 text-white" : i === 2 ? "bg-orange-400/30 text-orange-300" : "bg-white/[0.06] text-white/40"}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">@{c.username}</span>
                              <Badge variant="outline" className="text-[8px] border-white/10 text-white/40">{c.platform}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-white/40">{fmtNum(c.followers)} fol</span>
                              <span className="text-[10px] text-white/40">{c.engagementRate}% ER</span>
                              <span className={`text-[10px] ${c.growthRate >= 0 ? "text-emerald-400/60" : "text-red-400/60"}`}>{c.growthRate >= 0 ? "+" : ""}{c.growthRate}%/wk</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-black ${i === 0 ? "text-amber-400" : "text-white/70"}`}>{c.power}</p>
                            <p className="text-[8px] text-white/30">power</p>
                          </div>
                          <div className="w-16">
                            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${i === 0 ? "bg-amber-400" : i === 1 ? "bg-white/30" : "bg-white/15"}`} style={{ width: `${c.power}%` }} />
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  <p className="text-[9px] text-white/25 text-center mt-3">Weighted: 25% Reach · 25% Engagement · 25% Likes · 25% Growth</p>
                </CardContent>
              </Card>

              {/* Engagement Efficiency - Likes per 1K followers */}
              <Card className="crm-card border-cyan-400/15">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2"><Zap className="h-4 w-4" /> Engagement Efficiency (Likes per 1K Followers)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        ...(myStats ? [{ name: `@${myStats.username} (You)`, efficiency: myStats.followers > 0 ? Math.round(myStats.avgLikes / myStats.followers * 1000) : 0, isMe: true }] : []),
                        ...competitors.map(c => ({ name: `@${c.username}`, efficiency: c.followers > 0 ? Math.round(c.avgLikes / c.followers * 1000) : 0, isMe: false })),
                      ].sort((a, b) => b.efficiency - a.efficiency)} barCategoryGap="20%">
                        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v} likes/1K`} />
                        <Bar dataKey="efficiency" radius={[4, 4, 0, 0]} name="Likes per 1K">
                          {[
                            ...(myStats ? [{ isMe: true }] : []),
                            ...competitors.map(() => ({ isMe: false })),
                          ].sort(() => 0).map((_, i) => (
                            <Cell key={i} fill={i === 0 ? "hsl(150,60%,50%)" : PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-white/30 text-center mt-2">Higher = more engagement per follower · best measure of true influence</p>
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Growth Rate vs Engagement</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getComparisonBarData()} barCategoryGap="25%">
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Bar dataKey="engagement" fill="hsl(150,60%,50%)" radius={[4, 4, 0, 0]} name="Engagement %" />
                          <Bar dataKey="growth" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} name="Growth %/wk" />
                          <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
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

              {/* Hashtag Diversity Index */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Hashtag Diversity Index</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(() => {
                      const allTags = [...new Set(competitors.flatMap(c => c.topHashtags))];
                      return competitors.map(comp => {
                        const uniqueToThem = comp.topHashtags.filter(tag => competitors.filter(c => c.topHashtags.includes(tag)).length === 1).length;
                        const sharedCount = comp.topHashtags.length - uniqueToThem;
                        const diversityPct = comp.topHashtags.length > 0 ? Math.round((uniqueToThem / comp.topHashtags.length) * 100) : 0;
                        return (
                          <div key={comp.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-white/80">@{comp.username}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] border-emerald-400/20 text-emerald-400">{uniqueToThem} unique</Badge>
                                <Badge variant="outline" className="text-[8px] border-amber-400/20 text-amber-400">{sharedCount} shared</Badge>
                                <span className="text-[10px] text-white/40">{comp.topHashtags.length} total</span>
                              </div>
                            </div>
                            <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
                              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${diversityPct}%` }} title={`${diversityPct}% unique`} />
                              <div className="h-full bg-amber-400 transition-all" style={{ width: `${100 - diversityPct}%` }} title={`${100 - diversityPct}% shared`} />
                            </div>
                            <p className="text-[9px] text-white/30 mt-1">{diversityPct}% unique hashtag strategy — {diversityPct > 50 ? "differentiated approach" : "crowded hashtag space"}</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Comments-to-Likes Ratio */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Comments-to-Likes Ratio (Community Depth)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        ...(myStats ? [{ name: `@${myStats.username}`, ratio: myStats.avgLikes > 0 ? Math.round((myStats.avgComments / myStats.avgLikes) * 1000) / 10 : 0 }] : []),
                        ...competitors.map(c => ({ name: `@${c.username}`, ratio: c.avgLikes > 0 ? Math.round((c.avgComments / c.avgLikes) * 1000) / 10 : 0 })),
                      ].sort((a, b) => b.ratio - a.ratio)} barCategoryGap="25%">
                        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}% C/L ratio`} />
                        <Bar dataKey="ratio" fill="hsl(30,95%,60%)" radius={[4, 4, 0, 0]} name="Comment/Like %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-white/30 text-center mt-2">Higher ratio = deeper community engagement, not just passive likes</p>
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
                    <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Format Gaps</CardTitle>
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
              {/* Full-width Device Social Intelligence Panels — iPad on desktop, iPhone on mobile */}
              {competitors.map((comp) => {
                const normalizeHandle = (value: unknown) => {
                  const raw = String(value ?? "").trim();
                  if (!raw) return "";

                  const cleaned = raw
                    .replace(/^https?:\/\//i, "")
                    .replace(/^www\./i, "")
                    .replace(/^instagram\.com\//i, "")
                    .replace(/^tiktok\.com\/@/i, "")
                    .replace(/^x\.com\//i, "")
                    .replace(/^twitter\.com\//i, "")
                    .replace(/^youtube\.com\/@/i, "")
                    .replace(/^youtube\.com\/channel\//i, "")
                    .replace(/^linkedin\.com\/company\//i, "")
                    .replace(/^facebook\.com\//i, "")
                    .replace(/^pinterest\.com\//i, "")
                    .replace(/^snapchat\.com\/add\//i, "")
                    .replace(/^@/i, "")
                    .split(/[/?#]/)[0];

                  return cleaned.trim();
                };

                const social = comp.metadata?.socialPresence || {};
                const platformEntries: { platform: string; username: string; color: string; icon: string; url: string; previewUrl: string }[] = [];

                const pushEntry = (
                  platform: string,
                  rawHandle: unknown,
                  color: string,
                  icon: string,
                  toCanonical: (username: string) => string,
                  toPreview: (username: string) => string = toCanonical,
                ) => {
                  const username = normalizeHandle(rawHandle);
                  if (!username) return;
                  const alreadyAdded = platformEntries.some((entry) => entry.platform === platform && entry.username.toLowerCase() === username.toLowerCase());
                  if (alreadyAdded) return;
                  platformEntries.push({
                    platform,
                    username,
                    color,
                    icon,
                    url: toCanonical(username),
                    previewUrl: toPreview(username),
                  });
                };

                pushEntry("Instagram", social.instagram, "hsl(330 81% 55%)", "IG", (u) => `https://www.instagram.com/${u}/`, (u) => `https://www.instagram.com/${u}/embed/`);
                pushEntry("TikTok", social.tiktok, "hsl(347 100% 58%)", "TT", (u) => `https://www.tiktok.com/@${u}`, (u) => `https://www.tiktok.com/embed/@${u}`);
                pushEntry("X / Twitter", social.twitter, "hsl(203 89% 53%)", "X", (u) => `https://x.com/${u}`, (u) => `https://nitter.net/${u}`);
                pushEntry(
                  "YouTube",
                  social.youtube,
                  "hsl(0 100% 50%)",
                  "YT",
                  (u) => (/^UC[a-zA-Z0-9_-]+$/.test(u) ? `https://www.youtube.com/channel/${u}` : `https://www.youtube.com/@${u}`),
                  (u) => `__screenshot__${/^UC[a-zA-Z0-9_-]+$/.test(u) ? `https://www.youtube.com/channel/${u}` : `https://www.youtube.com/@${u}`}`,
                );
                pushEntry("LinkedIn", social.linkedin, "hsl(210 90% 40%)", "LI", (u) => `https://www.linkedin.com/company/${u}`, (u) => `__screenshot__https://www.linkedin.com/company/${u}`);
                pushEntry("Facebook", social.facebook, "hsl(221 83% 53%)", "FB", (u) => `https://www.facebook.com/${u}`, (u) => `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(`https://www.facebook.com/${u}`)}&tabs=timeline&width=500&height=600`);
                pushEntry("Pinterest", social.pinterest, "hsl(348 91% 45%)", "PI", (u) => `https://www.pinterest.com/${u}`, (u) => `https://assets.pinterest.com/ext/embed.html?id=${u}`);
                pushEntry("Snapchat", social.snapchat, "hsl(60 100% 50%)", "SC", (u) => `https://www.snapchat.com/add/${u}`);

                // If no social data found, create entries from competitor username + platform context
                if (platformEntries.length === 0) {
                  const p = (comp.platform || "").toLowerCase();
                  if (p === "instagram" || p === "internet") pushEntry("Instagram", comp.username, "hsl(330 81% 55%)", "IG", (u) => `https://www.instagram.com/${u}/`, (u) => `https://www.instagram.com/${u}/embed/`);
                  if (p === "tiktok" || p === "internet") pushEntry("TikTok", comp.username, "hsl(347 100% 58%)", "TT", (u) => `https://www.tiktok.com/@${u}`, (u) => `https://www.tiktok.com/embed/@${u}`);
                  if (p === "twitter" || p === "internet" || p === "x") pushEntry("X / Twitter", comp.username, "hsl(203 89% 53%)", "X", (u) => `https://x.com/${u}`, (u) => `https://nitter.net/${u}`);
                  if (p === "youtube" || p === "internet") pushEntry("YouTube", comp.username, "hsl(0 100% 50%)", "YT", (u) => `https://www.youtube.com/@${u}`, (u) => `__screenshot__https://www.youtube.com/@${u}`);
                  if (p === "linkedin" || p === "internet") pushEntry("LinkedIn", comp.username, "hsl(210 90% 40%)", "LI", (u) => `https://www.linkedin.com/company/${u}`, (u) => `__screenshot__https://www.linkedin.com/company/${u}`);
                }

                // No-key fallback screenshot only when platform refuses embedded rendering
                // thum.io expects the target URL as a raw path segment (encoded slashes cause HTTP 400)
                const getScreenshot = (url: string) => `https://image.thum.io/get/width/2000/crop/1100/noanimate/${url}`;
                const getScreenshotZoomClass = (platform: string) => {
                  const p = platform.toLowerCase();
                  if (p.includes("linkedin")) return "object-[18%_14%] scale-[1.28] md:scale-[1.36]";
                  if (p.includes("youtube")) return "object-[16%_11%] scale-[1.22] md:scale-[1.3]";
                  return "object-[12%_10%] scale-[1.14] md:scale-[1.2]";
                };

                return (
                  <div key={comp.id} className="w-full" style={{ contentVisibility: "auto", contain: "layout paint style" }}>
                    {/* ── iPad frame (desktop) / iPhone frame (mobile) ── */}
                    <div
                      className="relative w-full rounded-[2rem] md:rounded-[2.2rem] overflow-hidden will-change-transform"
                      style={{
                        background: "linear-gradient(145deg, hsl(240 2% 18%), hsl(240 4% 10%), hsl(240 2% 18%))",
                        boxShadow:
                          "inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 0 0 1.5px hsl(240 4% 24%), 0 0 0 3px hsl(240 5% 10%), 0 30px 80px hsl(0 0% 0% / 0.6), 0 0 60px hsl(var(--primary) / 0.03)",
                      }}
                    >
                      {/* Device top bezel */}
                      <div className="h-[28px] md:h-[32px] flex items-center justify-between px-5 md:px-6 relative" style={{ background: "linear-gradient(180deg, hsl(240 3% 17%), hsl(240 4% 10%))" }}>
                        {/* Camera (iPad) / Dynamic Island (iPhone on mobile) */}
                        <div className="hidden md:block absolute left-1/2 top-[9px] -translate-x-1/2 w-[7px] h-[7px] rounded-full" style={{ background: "radial-gradient(circle, hsl(240 4% 12%) 40%, hsl(240 8% 5%) 100%)", boxShadow: "inset 0 0 2px hsl(0 0% 100% / 0.08), 0 0 3px hsl(0 0% 0% / 0.5)" }} />
                        <div className="md:hidden absolute left-1/2 top-[6px] -translate-x-1/2 w-[90px] h-[22px] rounded-full" style={{ background: "hsl(240 10% 2%)", boxShadow: "inset 0 0 3px hsl(0 0% 0% / 0.8)" }} />

                        {/* Status bar */}
                        <span className="text-[10px] text-white/60 font-semibold tabular-nums" style={{ fontFamily: "-apple-system, system-ui" }}>9:41</span>
                        <div className="flex gap-[3px] items-center">
                          <div className="flex gap-[1.5px] items-end h-[9px]">
                            {[3, 4.5, 6, 8].map((h, i) => (
                              <div key={i} className="w-[2.5px] rounded-[1px]" style={{ height: h, background: i < 3 ? "hsl(0 0% 100% / 0.7)" : "hsl(0 0% 100% / 0.25)" }} />
                            ))}
                          </div>
                          <svg className="h-[9px] w-[13px] ml-1" viewBox="0 0 16 12" fill="hsl(0 0% 100% / 0.65)"><path d="M8 9.6a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM3.76 7.04a5.92 5.92 0 018.48 0l-1.2 1.2a4.16 4.16 0 00-6.08 0l-1.2-1.2zM1.04 4.32a9.44 9.44 0 0113.92 0l-1.2 1.2a7.68 7.68 0 00-11.52 0l-1.2-1.2z"/></svg>
                          <div className="w-[20px] h-[9px] border border-white/35 rounded-[2.5px] ml-1.5 relative overflow-hidden">
                            <div className="absolute inset-[1.5px] right-[3px] rounded-[1px]" style={{ background: "linear-gradient(90deg, hsl(142 71% 45%), hsl(143 64% 49%))" }} />
                            <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-[1.5px] h-[4px] bg-white/35 rounded-r-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* Safari-style tab bar */}
                      <div className="h-[38px] md:h-[40px] flex items-center px-3 md:px-4 gap-2 md:gap-3 border-b border-white/[0.05]" style={{ background: "linear-gradient(180deg, hsl(240 4% 10%), hsl(240 5% 8%))" }}>
                        <div className="hidden md:flex gap-[5px]">
                          <div className="w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, hsl(6 96% 69%), hsl(3 100% 67%))" }} />
                          <div className="w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, hsl(45 100% 65%), hsl(41 99% 56%))" }} />
                          <div className="w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, hsl(128 71% 66%), hsl(120 64% 49%))" }} />
                        </div>
                        <div className="flex-1 h-[26px] md:h-[28px] rounded-lg flex items-center px-3 gap-1.5" style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                          <Lock className="h-2.5 w-2.5 text-emerald-400/80" />
                          <span className="text-[10px] text-white/35 font-mono truncate">{comp.metadata?.websiteUrl || `${comp.username}.com`}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5 text-white/25 hover:text-white/50 transition-colors cursor-pointer" />
                          <RefreshCw className="h-3.5 w-3.5 text-white/25 hover:text-white/50 transition-colors cursor-pointer" />
                        </div>
                      </div>

                      {/* Screen content area */}
                      <div className="p-3 md:p-4" style={{ background: "linear-gradient(180deg, hsl(240 10% 5%), hsl(240 10% 4%))" }}>
                        {/* Competitor header banner */}
                        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 p-2.5 md:p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                          <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-bold text-base md:text-lg shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(262 83% 58%))" }}>
                            {comp.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs md:text-sm font-bold text-white truncate">{comp.displayName || comp.username}</h3>
                            <p className="text-[9px] md:text-[10px] text-white/40">@{comp.username} · {comp.metadata?.industry || comp.platform}</p>
                            <div className="flex items-center gap-2 md:gap-3 mt-1">
                              <span className="text-[9px] md:text-[10px] text-white/50"><span className="text-white font-semibold">{fmtNum(comp.followers)}</span> followers</span>
                              <span className="text-[9px] md:text-[10px] text-white/50"><span className="text-emerald-400 font-semibold">{comp.engagementRate}%</span> ER</span>
                              <span className="text-[9px] md:text-[10px] text-white/50"><span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>{comp.growthRate}%</span>/wk</span>
                            </div>
                          </div>
                          <Badge className="bg-emerald-400/10 text-emerald-400 border-0 text-[8px] md:text-[9px]">{platformEntries.length} platforms</Badge>
                        </div>

                        {/* Social platforms grid — interactive embed first, screenshot fallback second */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3">
                          {platformEntries.map((entry, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-white/[0.05] bg-white/[0.015] hover:border-white/[0.15] transition-all duration-200 group">
                              {/* Platform header */}
                              <div className="flex items-center justify-between px-2.5 py-1.5 md:px-3 md:py-2" style={{ background: `linear-gradient(135deg, ${entry.color}20, ${entry.color}08)`, borderBottom: "1px solid hsl(0 0% 100% / 0.03)" }}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center text-[8px] md:text-[9px] font-black text-white shrink-0" style={{ background: entry.color }}>
                                    {entry.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] md:text-[11px] font-semibold text-white truncate">{entry.platform}</p>
                                    <p className="text-[8px] md:text-[9px] text-white/40 truncate">@{entry.username}</p>
                                  </div>
                                </div>
                                <a href={entry.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] md:text-[8px] font-semibold text-white/60 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors shrink-0">
                                  <ExternalLink className="h-2 w-2 md:h-2.5 md:w-2.5" /> Open
                                </a>
                              </div>

                              {/* Interactive preview */}
                              <div className="relative h-[240px] md:h-[320px] overflow-hidden bg-black/80">
                                {entry.previewUrl.startsWith("__screenshot__") ? (
                                  <img
                                    src={getScreenshot(entry.previewUrl.replace("__screenshot__", ""))}
                                    alt={`${entry.platform} profile of @${entry.username}`}
                                    className={`h-full w-full object-cover origin-top ${getScreenshotZoomClass(entry.platform)}`}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <>
                                    <iframe
                                      src={entry.previewUrl}
                                      className="h-full w-full border-0"
                                      sandbox="allow-scripts allow-same-origin allow-popups"
                                      loading="lazy"
                                      referrerPolicy="strict-origin-when-cross-origin"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      title={`${entry.platform} preview for @${entry.username}`}
                                      onError={(e) => {
                                        const frame = e.currentTarget;
                                        frame.style.display = "none";
                                        const fallback = frame.nextElementSibling as HTMLElement | null;
                                        if (fallback) fallback.style.display = "flex";
                                      }}
                                    />
                                    <div className="absolute inset-0 hidden flex-col items-center justify-center gap-3 p-3">
                                      <img
                                        src={getScreenshot(entry.url)}
                                        alt={`${entry.platform} preview fallback for @${entry.username}`}
                                        className={`absolute inset-0 h-full w-full object-cover origin-top ${getScreenshotZoomClass(entry.platform)}`}
                                        loading="lazy"
                                        decoding="async"
                                      />
                                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${entry.color}38, hsl(240 10% 4%) 70%)` }} />
                                      <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${entry.color}, ${entry.color})` }}>
                                        {entry.icon}
                                      </div>
                                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="relative z-10 text-[9px] text-white/90 px-2 py-1 rounded-md bg-white/[0.16] hover:bg-white/[0.22] transition-colors">
                                        Open live profile
                                      </a>
                                    </div>
                                  </>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                              </div>

                              {/* Quick stats bar */}
                              <div className="px-2.5 py-1.5 md:px-3 md:py-2 flex items-center justify-between" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.03)", background: "hsl(0 0% 100% / 0.01)" }}>
                                <div className="flex items-center gap-2 md:gap-3">
                                  <span className="text-[8px] md:text-[9px] text-white/40 flex items-center gap-1"><Users className="h-2.5 w-2.5" />{fmtNum(comp.followers)}</span>
                                  <span className="text-[8px] md:text-[9px] text-white/40 flex items-center gap-1"><Activity className="h-2.5 w-2.5" />{comp.engagementRate}% ER</span>
                                  <span className="text-[8px] md:text-[9px] text-white/40 flex items-center gap-1"><Zap className="h-2.5 w-2.5" />{comp.postFrequency}/wk</span>
                                </div>
                                <span className="text-[7px] md:text-[8px] text-white/20">Interactive preview</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Content breakdown row */}
                        <div className="mt-2.5 md:mt-3 p-2.5 md:p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.015)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] md:text-[10px] text-white/40 font-medium">Content Mix</span>
                            <span className="text-[9px] md:text-[10px] text-white/40">Top Hashtags</span>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                            <div className="flex gap-1.5 md:gap-2 flex-1 flex-wrap">
                              {comp.contentTypes.slice(0, 4).map((ct, i) => (
                                <div key={i} className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg bg-white/[0.03]">
                                  {ct.type.toLowerCase().includes("video") || ct.type.toLowerCase().includes("reel") ? <Activity className="h-2.5 w-2.5 md:h-3 md:w-3 text-white/40" /> : <ImageIcon className="h-2.5 w-2.5 md:h-3 md:w-3 text-white/40" />}
                                  <span className="text-[8px] md:text-[9px] text-white/60">{ct.type}</span>
                                  <span className="text-[8px] md:text-[9px] font-bold text-white">{ct.pct}%</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-1 flex-wrap justify-start sm:justify-end">
                              {comp.topHashtags.slice(0, 5).map((tag) => (
                                <span key={tag} className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)]">#{tag.replace("#", "")}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Device bottom — iPadOS dock */}
                      <div className="h-[20px] md:h-[24px] flex items-center justify-center relative" style={{ background: "linear-gradient(180deg, hsl(240 4% 10%), hsl(240 3% 15%))" }}>
                        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "hsl(0 0% 100% / 0.04)" }} />
                        <div className="flex items-center gap-3">
                          {["⬜","📊","🔍","⚙️"].map((em, ei) => (
                            <div key={ei} className="w-[18px] h-[18px] md:w-[22px] md:h-[22px] rounded-[5px] flex items-center justify-center text-[8px] md:text-[10px]" style={{ background: "hsl(0 0% 100% / 0.06)" }}>{em}</div>
                          ))}
                        </div>
                        <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[80px] md:w-[120px] h-[3.5px] md:h-[4px] rounded-full" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ═══ Cross-Competitor Analytics iPad ═══ */}
              <div className="w-full" style={{ contentVisibility: "auto", contain: "layout paint style" }}>
                <div className="relative w-full rounded-[2rem] md:rounded-[2.2rem] overflow-hidden will-change-transform" style={{ background: "linear-gradient(145deg, hsl(240 2% 18%), hsl(240 4% 10%), hsl(240 2% 18%))", boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 0 0 1.5px hsl(240 4% 24%), 0 0 0 3px hsl(240 5% 10%), 0 30px 80px hsl(0 0% 0% / 0.6)" }}>
                  <div className="h-[28px] md:h-[32px] flex items-center justify-between px-5 md:px-6 relative" style={{ background: "linear-gradient(180deg, hsl(240 3% 17%), hsl(240 4% 10%))" }}>
                    <div className="hidden md:block absolute left-1/2 top-[9px] -translate-x-1/2 w-[7px] h-[7px] rounded-full" style={{ background: "radial-gradient(circle, hsl(240 4% 12%) 40%, hsl(240 8% 5%) 100%)" }} />
                    <div className="md:hidden absolute left-1/2 top-[6px] -translate-x-1/2 w-[90px] h-[22px] rounded-full" style={{ background: "hsl(240 10% 2%)" }} />
                    <span className="text-[10px] text-white/60 font-semibold tabular-nums" style={{ fontFamily: "-apple-system, system-ui" }}>9:41</span>
                    <div className="flex gap-[3px] items-center">
                      <div className="flex gap-[1.5px] items-end h-[9px]">{[3,4.5,6,8].map((h,i)=>(<div key={i} className="w-[2.5px] rounded-[1px]" style={{height:h,background:i<3?"hsl(0 0% 100%/0.7)":"hsl(0 0% 100%/0.25)"}}/>))}</div>
                      <div className="w-[20px] h-[9px] border border-white/35 rounded-[2.5px] ml-1.5 relative overflow-hidden"><div className="absolute inset-[1.5px] right-[3px] rounded-[1px]" style={{background:"linear-gradient(90deg,hsl(142 71% 45%),hsl(143 64% 49%))"}} /></div>
                    </div>
                  </div>
                  <div className="h-[38px] md:h-[40px] flex items-center px-3 md:px-4 gap-2 md:gap-3 border-b border-white/[0.05]" style={{ background: "linear-gradient(180deg, hsl(240 4% 10%), hsl(240 5% 8%))" }}>
                    <div className="hidden md:flex gap-[5px]">
                      <div className="w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, hsl(6 96% 69%), hsl(3 100% 67%))" }} />
                      <div className="w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, hsl(45 100% 65%), hsl(41 99% 56%))" }} />
                      <div className="w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, hsl(128 71% 66%), hsl(120 64% 49%))" }} />
                    </div>
                    <div className="flex-1 h-[26px] md:h-[28px] rounded-lg flex items-center px-3 gap-1.5" style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                      <Lock className="h-2.5 w-2.5 text-emerald-400/80" />
                      <span className="text-[10px] text-white/35 font-mono truncate">content-intelligence.app/analytics</span>
                    </div>
                  </div>
                  <div className="p-3 md:p-4" style={{ background: "linear-gradient(180deg, hsl(240 10% 5%), hsl(240 10% 4%))" }}>
                    {/* Hashtag Overlap */}
                    <div className="rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)", background: "hsl(0 0% 100% / 0.01)" }}>
                        <Hash className="h-3.5 w-3.5 text-white/40" />
                        <span className="text-[10px] md:text-[11px] font-semibold text-white/60">Hashtag Usage Across Competitors</span>
                      </div>
                      <div className="p-2.5 md:p-3">
                        {(() => { const allTags=[...new Set(competitors.flatMap(c=>c.topHashtags))]; const sharedTags=allTags.filter(tag=>competitors.filter(c=>c.topHashtags.includes(tag)).length>=2); const uniqueTags=allTags.filter(tag=>competitors.filter(c=>c.topHashtags.includes(tag)).length===1); return (<div className="grid grid-cols-3 gap-2 mb-3"><div className="p-2 rounded-lg bg-white/[0.02] text-center"><p className="text-[9px] text-white/40">Total Unique</p><p className="text-sm font-bold text-[hsl(217,91%,60%)]">{allTags.length}</p></div><div className="p-2 rounded-lg bg-amber-400/5 border border-amber-400/10 text-center"><p className="text-[9px] text-white/40">Shared (2+)</p><p className="text-sm font-bold text-amber-400">{sharedTags.length}</p></div><div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10 text-center"><p className="text-[9px] text-white/40">Exclusive (1 only)</p><p className="text-sm font-bold text-emerald-400">{uniqueTags.length}</p></div></div>); })()}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm"><thead><tr className="border-b border-white/[0.06]"><th className="text-left py-2 text-white/50 font-medium text-[10px]">Hashtag</th><th className="text-center py-2 text-white/50 font-medium text-[10px]">Used By</th>{competitors.map(c=><th key={c.id} className="text-center py-2 text-white/50 font-medium text-[10px]">@{c.username}</th>)}</tr></thead>
                          <tbody>{(()=>{const allTags=[...new Set(competitors.flatMap(c=>c.topHashtags))];return allTags.map(tag=>({tag,count:competitors.filter(c=>c.topHashtags.includes(tag)).length})).sort((a,b)=>b.count-a.count).slice(0,20).map(({tag,count})=>(<tr key={tag} className="border-b border-white/[0.03]"><td className="py-1.5 text-white/70 text-[10px] flex items-center gap-1"><Hash className="h-2.5 w-2.5 text-[hsl(217,91%,60%)]"/>{tag}</td><td className="text-center py-1.5"><Badge variant="outline" className={`text-[8px] ${count>=2?"border-amber-400/20 text-amber-400":"border-white/10 text-white/40"}`}>{count}/{competitors.length}</Badge></td>{competitors.map(c=>(<td key={c.id} className="text-center py-1.5">{c.topHashtags.includes(tag)?<span className="inline-block w-4 h-4 rounded-full bg-emerald-400/15 text-emerald-400 text-[9px] leading-4">✓</span>:<span className="inline-block w-4 h-4 rounded-full bg-white/[0.03] text-white/20 text-[9px] leading-4">·</span>}</td>))}</tr>));})()}</tbody></table>
                        </div>
                      </div>
                    </div>
                    {/* ═══ TOTAL SOCIAL PRESENCE OVERVIEW ═══ */}
                    {(() => {
                      // Aggregate stats across all competitors
                      const totalFollowers = competitors.reduce((s, c) => s + c.followers, 0);
                      const totalPosts = competitors.reduce((s, c) => s + c.posts, 0);
                      const totalAvgLikes = competitors.reduce((s, c) => s + c.avgLikes, 0);
                      const totalAvgComments = competitors.reduce((s, c) => s + c.avgComments, 0);
                      const avgEngagement = competitors.length > 0 ? competitors.reduce((s, c) => s + c.engagementRate, 0) / competitors.length : 0;
                      const avgGrowth = competitors.length > 0 ? competitors.reduce((s, c) => s + c.growthRate, 0) / competitors.length : 0;
                      const totalTraffic = competitors.reduce((s, c) => s + (c.metadata?.websiteTraffic || 0), 0);
                      const avgDA = competitors.length > 0 ? Math.round(competitors.reduce((s, c) => s + (c.metadata?.domainAuthority || 0), 0) / competitors.length) : 0;

                      // Per-platform breakdown from socialPresence + platformMetrics data
                      const platformMap: Record<string, { name: string; color: string; logo: string; competitors: { username: string; followers: number; following: number; posts: number; engagementRate: number; avgLikes: number; avgComments: number; avgViews: number; avgShares: number; totalLikes: number; totalViews: number; postFrequency: number; growthRate: number; followerGain30d: number; viewGain30d: number; likeGain30d: number }[] }> = {};
                      const platformDefs: Record<string, { color: string; logo: string }> = {
                        instagram: { color: "hsl(330 81% 55%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z'/%3E%3C/svg%3E" },
                        tiktok: { color: "hsl(347 100% 58%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z'/%3E%3C/svg%3E" },
                        twitter: { color: "hsl(0 0% 100%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E" },
                        youtube: { color: "hsl(0 100% 50%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'/%3E%3C/svg%3E" },
                        linkedin: { color: "hsl(210 90% 40%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'/%3E%3C/svg%3E" },
                        facebook: { color: "hsl(221 83% 53%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'/%3E%3C/svg%3E" },
                        pinterest: { color: "hsl(348 91% 45%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z'/%3E%3C/svg%3E" },
                        snapchat: { color: "hsl(60 100% 50%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.879-.207.118-.046.235-.093.385-.093.282 0 .565.107.769.357.157.19.22.443.176.679-.044.257-.217.501-.512.636-.147.067-.329.122-.51.176-.254.074-.481.14-.657.24-.223.126-.357.314-.358.541 0 .037.006.075.018.113.062.205.264.485.516.764.576.645 1.399 1.401 1.399 2.333 0 1.127-1.335 2.127-3.964 2.976-.15.05-.248.1-.297.147-.037.035-.047.098-.047.13 0 .053.015.105.03.157.091.254.135.459.158.595.048.284.074.495.074.651 0 .404-.223.745-.648.98C16.312 20.28 15.452 20.5 14.75 20.5c-.24 0-.481-.028-.717-.087-.258-.063-.563-.144-.926-.23-.453-.107-.985-.229-1.529-.229-.54 0-1.032.112-1.514.24-.344.091-.677.182-.972.255A5.34 5.34 0 0 1 8.2 20.5c-.699 0-1.558-.22-2.555-.664-.425-.235-.648-.576-.648-.98 0-.156.026-.367.074-.651.023-.136.067-.341.158-.595a.714.714 0 0 0 .03-.157c0-.032-.011-.094-.048-.13-.049-.047-.147-.097-.296-.147C2.37 17.127 1.035 16.127 1.035 15c0-.932.823-1.688 1.399-2.333.252-.28.454-.56.516-.764a.307.307 0 0 0 .018-.113c0-.227-.135-.415-.358-.541-.176-.1-.403-.166-.657-.24a3.063 3.063 0 0 1-.51-.176c-.342-.157-.505-.412-.516-.7a.746.746 0 0 1 .176-.63c.204-.25.487-.357.769-.357.15 0 .267.047.385.093.22.087.579.207.879.207.198 0 .326-.045.401-.09a5.757 5.757 0 0 1-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C5.86 1.069 9.216.793 10.205.793h2.001z'/%3E%3C/svg%3E" },
                        threads: { color: "hsl(0 0% 90%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.016.834-.684 1.988-1.087 3.304-1.192 1.055-.085 2.033-.01 2.918.219-.03-1.027-.268-1.823-.717-2.368-.55-.666-1.39-1.006-2.498-1.014-1.69.029-2.679.587-3.205 1.173l-1.489-1.398C8.515 4.85 10.025 3.997 12.31 3.966c1.725.024 3.1.542 4.084 1.535.952.96 1.46 2.336 1.506 4.08.023 0 .046 0 .07.002 1.076.12 2.004.483 2.681 1.053.878.74 1.383 1.766 1.46 2.965.094 1.493-.449 2.87-1.573 3.987-1.504 1.49-3.584 2.327-6.36 2.412zm-1.17-9.504c-1.394.082-2.18.627-2.14 1.35.022.41.274.95 1.282 1.604.528.342 1.187.52 1.86.476 1.27-.069 2.834-.896 2.96-4.27-.905-.265-1.89-.368-2.93-.27-.358.029-.706.064-1.033.11z'/%3E%3C/svg%3E" },
                        discord: { color: "hsl(235 86% 65%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z'/%3E%3C/svg%3E" },
                        twitch: { color: "hsl(264 100% 64%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z'/%3E%3C/svg%3E" },
                        reddit: { color: "hsl(16 100% 50%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z'/%3E%3C/svg%3E" },
                        spotify: { color: "hsl(141 73% 42%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'/%3E%3C/svg%3E" },
                        telegram: { color: "hsl(200 80% 50%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'/%3E%3C/svg%3E" },
                        whatsapp: { color: "hsl(142 70% 49%)", logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z'/%3E%3C/svg%3E" },
                      };

                      const invalidHandlePattern = /^(?:null|none|n\/a|na|unknown|handle(?:\s*or\s*null)?|not\s+available)$/i;
                      const metricPlaceholderPattern = /^(?:nan|null|undefined|n\/a|na|none|unknown|not\s+available)$/i;
                      const parseMetricValue = (value: unknown) => {
                        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
                        if (typeof value !== "string") return 0;
                        const raw = value.trim();
                        if (!raw || metricPlaceholderPattern.test(raw)) return 0;
                        const compact = raw.replace(/,/g, "").replace(/%/g, "").replace(/\/(wk|week)/gi, "").replace(/per\s+week/gi, "").trim();
                        const suffixMatch = compact.match(/^(-?[\d.]+)([KMBkmb])$/);
                        if (suffixMatch) {
                          const base = parseFloat(suffixMatch[1]);
                          if (!Number.isFinite(base)) return 0;
                          const suffix = suffixMatch[2].toUpperCase();
                          if (suffix === "K") return base * 1_000;
                          if (suffix === "M") return base * 1_000_000;
                          if (suffix === "B") return base * 1_000_000_000;
                        }
                        const n = Number(compact);
                        return Number.isFinite(n) ? n : 0;
                      };
                      const hasValidHandle = (value: unknown) => typeof value === "string" && value.trim().length > 0 && !invalidHandlePattern.test(value.trim());
                      const normalizePlatformKey = (platform: string) => (platform || "").toLowerCase() === "x" ? "twitter" : (platform || "").toLowerCase();

                      competitors.forEach(c => {
                        const social = (c.metadata?.socialPresence || {}) as Record<string, unknown>;
                        const perPlatform = (c.metadata?.platformMetrics || {}) as Record<string, any>;

                        Object.entries(social).forEach(([plat, handle]) => {
                          const key = normalizePlatformKey(plat);
                          if (!platformDefs[key] || !hasValidHandle(handle)) return;

                          const pm = perPlatform[key] || perPlatform[plat] || {};
                          const normalized = {
                            followers: parseMetricValue(pm?.followers),
                            following: parseMetricValue(pm?.following),
                            posts: parseMetricValue(pm?.posts),
                            engagementRate: parseMetricValue(pm?.engagementRate),
                            avgLikes: parseMetricValue(pm?.avgLikes),
                            avgComments: parseMetricValue(pm?.avgComments),
                            avgViews: parseMetricValue(pm?.avgViews),
                            avgShares: parseMetricValue(pm?.avgShares),
                            totalLikes: parseMetricValue(pm?.totalLikes),
                            totalViews: parseMetricValue(pm?.totalViews),
                            postFrequency: parseMetricValue(pm?.postFrequency),
                            growthRate: parseMetricValue(pm?.growthRate),
                            followerGain30d: parseMetricValue(pm?.followerGain30d),
                            viewGain30d: parseMetricValue(pm?.viewGain30d),
                            likeGain30d: parseMetricValue(pm?.likeGain30d),
                          };

                          const hasPlatformData = normalized.followers > 0 || normalized.engagementRate > 0 || normalized.avgLikes > 0 || normalized.postFrequency > 0 || normalized.growthRate !== 0;
                          if (!hasPlatformData) return;

                          if (!platformMap[key]) {
                            platformMap[key] = { name: key.charAt(0).toUpperCase() + key.slice(1), color: platformDefs[key].color, logo: platformDefs[key].logo, competitors: [] };
                          }

                          if (!platformMap[key].competitors.some(x => x.username === c.username)) {
                            platformMap[key].competitors.push({ username: c.username, ...normalized });
                          }
                        });

                        // Primary fallback only for non-internet competitors
                        const primary = normalizePlatformKey(c.platform || "");
                        if (!platformDefs[primary]) return;
                        if (platformMap[primary]?.competitors.some(x => x.username === c.username)) return;

                        const pm = perPlatform[primary] || {};
                        const usePrimaryFallback = c.platform !== "internet";
                        const followers = parseMetricValue(pm?.followers) || (usePrimaryFallback ? parseMetricValue(c.followers) : 0);
                        if (followers <= 0) return;

                        if (!platformMap[primary]) {
                          platformMap[primary] = { name: primary.charAt(0).toUpperCase() + primary.slice(1), color: platformDefs[primary].color, logo: platformDefs[primary].logo, competitors: [] };
                        }

                        platformMap[primary].competitors.push({
                          username: c.username,
                          followers,
                          following: parseMetricValue(pm?.following),
                          posts: parseMetricValue(pm?.posts) || (usePrimaryFallback ? parseMetricValue(c.posts) : 0),
                          engagementRate: parseMetricValue(pm?.engagementRate) || (usePrimaryFallback ? parseMetricValue(c.engagementRate) : 0),
                          avgLikes: parseMetricValue(pm?.avgLikes) || (usePrimaryFallback ? parseMetricValue(c.avgLikes) : 0),
                          avgComments: parseMetricValue(pm?.avgComments) || (usePrimaryFallback ? parseMetricValue(c.avgComments) : 0),
                          avgViews: parseMetricValue(pm?.avgViews),
                          avgShares: parseMetricValue(pm?.avgShares),
                          totalLikes: parseMetricValue(pm?.totalLikes),
                          totalViews: parseMetricValue(pm?.totalViews),
                          postFrequency: parseMetricValue(pm?.postFrequency) || (usePrimaryFallback ? parseMetricValue(c.postFrequency) : 0),
                          growthRate: parseMetricValue(pm?.growthRate) || (usePrimaryFallback ? parseMetricValue(c.growthRate) : 0),
                          followerGain30d: parseMetricValue(pm?.followerGain30d),
                          viewGain30d: parseMetricValue(pm?.viewGain30d),
                          likeGain30d: parseMetricValue(pm?.likeGain30d),
                        });
                      });

                      const platforms = Object.entries(platformMap)
                        .filter(([, data]) => data.competitors.length > 0)
                        .sort((a, b) => b[1].competitors.length - a[1].competitors.length);
                      const platformCount = platforms.length;

                      // Hashtag frequency map
                      const hashtagFreq: Record<string, number> = {};
                      competitors.forEach(c => c.topHashtags.forEach(tag => { hashtagFreq[tag] = (hashtagFreq[tag] || 0) + 1; }));
                      const sortedHashtags = Object.entries(hashtagFreq).sort((a, b) => b[1] - a[1]);
                      const topHashtags = sortedHashtags.slice(0, 10);
                      const maxHashtagCount = topHashtags[0]?.[1] || 1;

                      // Best platform by engagement
                      const bestPlatformByEng = platforms.length > 0 ? platforms.reduce((best, [key, data]) => {
                        const avgEng = data.competitors.reduce((s, c) => s + c.engagementRate, 0) / data.competitors.length;
                        return avgEng > best.avgEng ? { key, name: data.name, avgEng, logo: data.logo, color: data.color } : best;
                      }, { key: "", name: "-", avgEng: 0, logo: "", color: "" }) : null;

                      // Best platform by growth
                      const bestPlatformByGrowth = platforms.length > 0 ? platforms.reduce((best, [key, data]) => {
                        const avgG = data.competitors.reduce((s, c) => s + c.growthRate, 0) / data.competitors.length;
                        return avgG > best.avgG ? { key, name: data.name, avgG, logo: data.logo, color: data.color } : best;
                      }, { key: "", name: "-", avgG: 0, logo: "", color: "" }) : null;

                      return (
                        <>
                          {/* Aggregate Social Presence */}
                          <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(217 91% 60% / 0.08)", background: "hsl(217 91% 60% / 0.02)" }}>
                              <Users className="h-3.5 w-3.5 text-[hsl(217,91%,60%)]" />
                              <span className="text-[10px] md:text-[11px] font-semibold text-[hsl(217,91%,60%)]">Total Social Presence</span>
                              <Badge variant="outline" className="ml-auto text-[7px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]">{competitors.length} competitor{competitors.length !== 1 ? "s" : ""} · {platformCount} platform{platformCount !== 1 ? "s" : ""}</Badge>
                            </div>
                            <div className="p-2.5 md:p-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                <div className="p-2.5 rounded-lg text-center" style={{ background: "hsl(217 91% 60% / 0.06)", border: "1px solid hsl(217 91% 60% / 0.12)" }}>
                                  <p className="text-[8px] text-white/40 mb-0.5">Total Reach</p>
                                  <p className="text-base md:text-lg font-black text-white">{fmtNum(totalFollowers)}</p>
                                  <p className="text-[8px] text-[hsl(217,91%,60%)]">combined followers</p>
                                </div>
                                <div className="p-2.5 rounded-lg text-center" style={{ background: "hsl(150 60% 50% / 0.06)", border: "1px solid hsl(150 60% 50% / 0.12)" }}>
                                  <p className="text-[8px] text-white/40 mb-0.5">Avg Engagement</p>
                                  <p className="text-base md:text-lg font-black text-emerald-400">{avgEngagement.toFixed(2)}%</p>
                                  <p className="text-[8px] text-emerald-400/70">across all</p>
                                </div>
                                <div className="p-2.5 rounded-lg text-center" style={{ background: "hsl(262 83% 58% / 0.06)", border: "1px solid hsl(262 83% 58% / 0.12)" }}>
                                  <p className="text-[8px] text-white/40 mb-0.5">Total Content</p>
                                  <p className="text-base md:text-lg font-black text-[hsl(262,83%,58%)]">{fmtNum(totalPosts)}</p>
                                  <p className="text-[8px] text-[hsl(262,83%,58%)]/70">posts published</p>
                                </div>
                                <div className="p-2.5 rounded-lg text-center" style={{ background: "hsl(30 95% 60% / 0.06)", border: "1px solid hsl(30 95% 60% / 0.12)" }}>
                                  <p className="text-[8px] text-white/40 mb-0.5">Avg Growth</p>
                                  <p className="text-base md:text-lg font-black text-amber-400">{avgGrowth >= 0 ? "+" : ""}{avgGrowth.toFixed(2)}%</p>
                                  <p className="text-[8px] text-amber-400/70">per week</p>
                                </div>
                              </div>
                              {/* Secondary metrics row */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                  <p className="text-[8px] text-white/35">Avg Likes/Post</p>
                                  <p className="text-sm font-bold text-white">{fmtNum(competitors.length > 0 ? Math.round(totalAvgLikes / competitors.length) : 0)}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                  <p className="text-[8px] text-white/35">Avg Comments/Post</p>
                                  <p className="text-sm font-bold text-white">{fmtNum(competitors.length > 0 ? Math.round(totalAvgComments / competitors.length) : 0)}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                  <p className="text-[8px] text-white/35">Est. Monthly Traffic</p>
                                  <p className="text-sm font-bold text-white">{totalTraffic > 0 ? fmtNum(totalTraffic) : "N/A"}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                  <p className="text-[8px] text-white/35">Avg Domain Authority</p>
                                  <p className="text-sm font-bold text-white">{avgDA > 0 ? avgDA + "/100" : "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ═══ PER-PLATFORM PERFORMANCE BREAKDOWN ═══ */}
                          {platforms.length > 0 && (
                            <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)", background: "hsl(0 0% 100% / 0.01)" }}>
                                <BarChart3 className="h-3.5 w-3.5 text-white/40" />
                                <span className="text-[10px] md:text-[11px] font-semibold text-white/60">Platform Performance Breakdown</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-auto h-6 px-2 text-[9px] gap-1 border-white/10 text-white/60 hover:text-white"
                                  onClick={refreshPlatformBreakdown}
                                  disabled={refreshingBreakdown}
                                >
                                  <RefreshCw className={`h-3 w-3 ${refreshingBreakdown ? "animate-spin" : ""}`} />
                                  {refreshingBreakdown ? "Refreshing" : "Refresh Live"}
                                </Button>
                              </div>
                              <div className="p-2.5 md:p-3 space-y-2">
                                {/* Best platforms callout */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {bestPlatformByEng && bestPlatformByEng.key && (
                                    <div className="p-2 rounded-lg flex items-center gap-2" style={{ background: `${bestPlatformByEng.color}12`, border: `1px solid ${bestPlatformByEng.color}25` }}>
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 p-1.5" style={{ background: bestPlatformByEng.color }}><img src={bestPlatformByEng.logo} alt="" className="w-full h-full object-contain" /></div>
                                      <div>
                                        <p className="text-[8px] text-white/40">Highest Engagement</p>
                                        <p className="text-[11px] font-bold text-white">{bestPlatformByEng.name} <span className="text-emerald-400 text-[10px]">{bestPlatformByEng.avgEng.toFixed(2)}%</span></p>
                                      </div>
                                    </div>
                                  )}
                                  {bestPlatformByGrowth && bestPlatformByGrowth.key && (
                                    <div className="p-2 rounded-lg flex items-center gap-2" style={{ background: `${bestPlatformByGrowth.color}12`, border: `1px solid ${bestPlatformByGrowth.color}25` }}>
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 p-1.5" style={{ background: bestPlatformByGrowth.color }}><img src={bestPlatformByGrowth.logo} alt="" className="w-full h-full object-contain" /></div>
                                      <div>
                                        <p className="text-[8px] text-white/40">Fastest Growth</p>
                                        <p className="text-[11px] font-bold text-white">{bestPlatformByGrowth.name} <span className="text-amber-400 text-[10px]">+{bestPlatformByGrowth.avgG.toFixed(2)}%/wk</span></p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Platform cards */}
                                {platforms.map(([key, data]) => {
                                  const cc = data.competitors;
                                  const n = cc.length;
                                  const sum = (fn: (c: typeof cc[0]) => number) => cc.reduce((s, c) => s + fn(c), 0);
                                  const avg = (fn: (c: typeof cc[0]) => number) => n > 0 ? sum(fn) / n : 0;

                                  // Time period logic
                                  const period = platformTimePeriods[key] || "monthly";
                                  const customDates = platformCustomDates[key] || [];
                                  const periodLabel = period === "daily" ? "Day" : period === "weekly" ? "Week" : period === "monthly" ? "Month" : period === "quarterly" ? "Quarter" : period === "yearly" ? "Year" : period === "alltime" ? "All Time" : `${customDates.length} day${customDates.length !== 1 ? "s" : ""}`;
                                  // Multiplier for 30d base data → selected period
                                  const periodDays = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : period === "quarterly" ? 90 : period === "yearly" ? 365 : period === "alltime" ? 0 : Math.max(customDates.length, 1);
                                  const periodMul = period === "alltime" ? 1 : periodDays / 30;
                                  const isAllTime = period === "alltime";

                                  // Core metrics
                                  const totalReach = sum(c => c.followers);
                                  const totalFollowingP = sum(c => c.following);
                                  const totalPostsP = sum(c => c.posts);
                                  const avgEng = avg(c => c.engagementRate);
                                  const avgLikesP = Math.round(avg(c => c.avgLikes));
                                  const avgCommentsP = Math.round(avg(c => c.avgComments));
                                  const avgViewsP = Math.round(avg(c => c.avgViews));
                                  const avgSharesP = Math.round(avg(c => c.avgShares));
                                  const avgFreqP = avg(c => c.postFrequency);
                                  const avgGrP = avg(c => c.growthRate);
                                  const totalLikesP = sum(c => c.totalLikes);
                                  const totalViewsP = sum(c => c.totalViews);
                                  const totalGain30d = sum(c => c.followerGain30d);
                                  const totalViewGain30d = sum(c => c.viewGain30d);
                                  const totalLikeGain30d = sum(c => c.likeGain30d);

                                  // Period-scaled gains
                                  const followerGainPeriod = Math.round(totalGain30d * periodMul);
                                  const viewGainPeriod = Math.round(totalViewGain30d * periodMul);
                                  const likeGainPeriod = Math.round(totalLikeGain30d * periodMul);
                                  const dailyFollowerGain = totalGain30d !== 0 ? totalGain30d / 30 : 0;
                                  const dailyViewGain = totalViewGain30d > 0 ? totalViewGain30d / 30 : 0;
                                  const dailyLikeGain = totalLikeGain30d !== 0 ? totalLikeGain30d / 30 : 0;

                                  // Derived metrics
                                  const avgFollowersEach = n > 0 ? totalReach / n : 0;
                                  const likesPerK = avgFollowersEach > 0 ? (avgLikesP / (avgFollowersEach / 1000)) : 0;
                                  const commentsPerK = avgFollowersEach > 0 ? (avgCommentsP / (avgFollowersEach / 1000)) : 0;
                                  const viewsPerK = avgFollowersEach > 0 ? (avgViewsP / (avgFollowersEach / 1000)) : 0;
                                  const likeCommentRatio = avgCommentsP > 0 ? (avgLikesP / avgCommentsP) : 0;
                                  const followerFollowingRatio = totalFollowingP > 0 ? (totalReach / totalFollowingP) : 0;
                                  const avgInteractions = avgLikesP + avgCommentsP;
                                  const postsPerDay = avgFreqP / 7;
                                  const estPostsInPeriod = Math.round(postsPerDay * periodDays);
                                  const estReachPerPost = avgFollowersEach > 0 ? Math.round(avgFollowersEach * (avgEng / 100) * 3.5) : 0;
                                  const viralityScore = avgFollowersEach > 0 ? ((avgLikesP / avgFollowersEach) * 100) : 0;
                                  const commentRate = avgFollowersEach > 0 ? ((avgCommentsP / avgFollowersEach) * 100) : 0;
                                  const contentVelocity = totalPostsP > 0 ? Math.round(totalPostsP / n) : 0;
                                  const engQualityScore = avgEng > 0 ? Math.min(100, Math.round((avgEng / (key === "tiktok" ? 8 : key === "instagram" ? 4 : 2)) * 100)) : 0;
                                  const avgViewLikeRatio = avgViewsP > 0 ? ((avgLikesP / avgViewsP) * 100) : 0;
                                  const avgViewCommentRatio = avgViewsP > 0 ? ((avgCommentsP / avgViewsP) * 100) : 0;
                                  const viewToFollowerRatio = avgFollowersEach > 0 && avgViewsP > 0 ? (avgViewsP / avgFollowersEach) : 0;
                                  const shareRate = avgFollowersEach > 0 && avgSharesP > 0 ? ((avgSharesP / avgFollowersEach) * 100) : 0;
                                  const contentLifespan = avgFreqP > 0 ? Math.round(7 / avgFreqP) : 0;
                                  const interactionsPerPost = avgLikesP + avgCommentsP + avgSharesP;
                                  const engVelocity = avgFreqP > 0 ? Math.round(avgInteractions * avgFreqP) : 0;
                                  const totalInteractionsPeriod = engVelocity > 0 ? Math.round(engVelocity * (periodDays / 7)) : 0;
                                  const followerQuality = followerFollowingRatio > 10 ? "Premium" : followerFollowingRatio > 3 ? "High" : followerFollowingRatio > 1 ? "Average" : "Low";
                                  const growthMomentum = avgGrP > 2 ? "Explosive" : avgGrP > 0.5 ? "Strong" : avgGrP > 0 ? "Steady" : avgGrP > -0.5 ? "Stagnant" : "Declining";
                                  const contentConsistency = avgFreqP >= 7 ? "Daily+" : avgFreqP >= 3 ? "Frequent" : avgFreqP >= 1 ? "Weekly" : avgFreqP > 0 ? "Sporadic" : "Inactive";
                                  const benchmarkER = key === "tiktok" ? 5.0 : key === "instagram" ? 2.5 : key === "youtube" ? 3.5 : key === "twitter" ? 0.5 : 1.5;
                                  const erVsBenchmark = benchmarkER > 0 ? ((avgEng / benchmarkER) * 100) : 0;
                                  const estTotalLikesPeriod = Math.round(dailyLikeGain * periodDays);
                                  const estTotalViewsPeriod = Math.round(dailyViewGain * periodDays);
                                  const growthRatePeriod = avgGrP * (periodDays / 7);
                                  const projFollowersPeriod = totalReach > 0 ? Math.round(totalReach * (1 + growthRatePeriod / 100)) : 0;
                                  const avgLikesPerPeriodPost = estPostsInPeriod > 0 && avgLikesP > 0 ? avgLikesP : 0;
                                  const avgCommentsPerPeriodPost = estPostsInPeriod > 0 && avgCommentsP > 0 ? avgCommentsP : 0;
                                  const impressionRate = avgFollowersEach > 0 ? Math.min(100, Math.round((avgEng * 10 + (viewToFollowerRatio * 100)) / 2)) : 0;
                                  const savePotential = viralityScore > 3 ? "High" : viralityScore > 1 ? "Medium" : "Low";
                                  const audienceHealth = engQualityScore > 60 && avgGrP > 0 ? "Healthy" : engQualityScore > 30 ? "Fair" : "At Risk";
                                  const contentROI = estReachPerPost > 0 && avgFreqP > 0 ? Math.round(estReachPerPost * avgFreqP) : 0;
                                  const weeklyContentROI = contentROI > 0 ? fmtNum(contentROI) : "N/A";
                                  const retentionProxy = avgViewsP > 0 && avgLikesP > 0 ? Math.min(100, Math.round((avgLikesP / avgViewsP) * 100 * 2)) : 0;
                                  const conversionPotential = avgEng > 3 && avgGrP > 0.5 ? "Strong" : avgEng > 1 ? "Moderate" : "Weak";
                                  const brandAuthority = followerFollowingRatio > 5 && totalReach > 10000 ? "High" : followerFollowingRatio > 2 ? "Medium" : "Low";

                                  const reachPct = totalFollowers > 0 ? ((totalReach / totalFollowers) * 100).toFixed(1) : "0";
                                  const maxPlatformReach = Math.max(...platforms.map(([, d]) => d.competitors.reduce((s, c) => s + c.followers, 0)));
                                  const barWidth = maxPlatformReach > 0 ? (totalReach / maxPlatformReach) * 100 : 0;

                                  // Build stat items - 80+ metrics organized into sections
                                  type StatItem = { label: string; value: string; color: string; section: string; detail?: { formula?: string; source?: string; raw?: string; timestamp?: string; type?: string; note?: string } };
                                  const stats: StatItem[] = [];
                                  const now = new Date().toISOString().slice(0, 16);
                                  const srcSB = "SocialBlade via Jina Reader";
                                  const srcDerived = "Derived from scraped data";
                                  const srcRSS = "YouTube RSS + Watch Pages";
                                  const srcJina = "Jina Reader (platform profile)";

                                  // ── AUDIENCE ──
                                  stats.push({ label: "Total Reach", value: fmtNum(totalReach), color: "text-white", section: "Audience", detail: { formula: "Sum of followers across all competitors on this platform", source: srcSB, raw: totalReach.toString(), timestamp: now, type: "Absolute" } });
                                  stats.push({ label: "Avg Followers", value: fmtNum(Math.round(avgFollowersEach)), color: "text-white", section: "Audience", detail: { formula: "Total Reach / Number of competitors", source: srcDerived, raw: Math.round(avgFollowersEach).toString(), timestamp: now, type: "Average" } });
                                  if (totalFollowingP > 0) stats.push({ label: "Total Following", value: fmtNum(totalFollowingP), color: "text-white/70", section: "Audience", detail: { formula: "Sum of following counts", source: srcSB, raw: totalFollowingP.toString(), timestamp: now, type: "Absolute" } });
                                  if (followerFollowingRatio > 0) stats.push({ label: "Follower:Following", value: followerFollowingRatio.toFixed(1) + "x", color: followerFollowingRatio > 5 ? "text-emerald-400" : "text-white/70", section: "Audience", detail: { formula: "Total Followers / Total Following", source: srcDerived, raw: followerFollowingRatio.toFixed(3), timestamp: now, type: "Ratio", note: ">5x = premium audience, >1x = healthy" } });
                                  stats.push({ label: "Follower Quality", value: followerQuality, color: followerQuality === "Premium" ? "text-emerald-400" : followerQuality === "High" ? "text-[hsl(217,91%,60%)]" : "text-white/50", section: "Audience", detail: { formula: "Based on Follower:Following ratio. Premium >10x, High >3x, Average >1x, Low <1x", source: srcDerived, timestamp: now, type: "Rating" } });
                                  stats.push({ label: "Reach Share", value: reachPct + "%", color: "text-[hsl(217,91%,60%)]", section: "Audience", detail: { formula: "Platform Reach / Total Reach across all platforms × 100", source: srcDerived, raw: reachPct, timestamp: now, type: "Percentage" } });
                                  stats.push({ label: "Brand Authority", value: brandAuthority, color: brandAuthority === "High" ? "text-emerald-400" : brandAuthority === "Medium" ? "text-amber-400" : "text-white/50", section: "Audience", detail: { formula: "Based on Follower:Following >5x AND Reach >10K = High", source: srcDerived, timestamp: now, type: "Rating" } });
                                  stats.push({ label: "Audience Health", value: audienceHealth, color: audienceHealth === "Healthy" ? "text-emerald-400" : audienceHealth === "Fair" ? "text-amber-400" : "text-red-400", section: "Audience", detail: { formula: "Engagement Quality >60 AND Growth >0 = Healthy", source: srcDerived, timestamp: now, type: "Rating" } });
                                  // NEW audience metrics
                                  const medianFollowers = n > 0 ? [...cc].sort((a, b) => a.followers - b.followers)[Math.floor(n / 2)].followers : 0;
                                  stats.push({ label: "Median Followers", value: fmtNum(medianFollowers), color: "text-white/70", section: "Audience", detail: { formula: "Middle value of all competitor follower counts (sorted)", source: srcDerived, raw: medianFollowers.toString(), timestamp: now, type: "Median" } });
                                  const maxFollowers = Math.max(...cc.map(c => c.followers));
                                  const minFollowers = Math.min(...cc.map(c => c.followers));
                                  stats.push({ label: "Top Follower", value: fmtNum(maxFollowers), color: "text-emerald-400/70", section: "Audience", detail: { formula: "Highest follower count among competitors", source: srcSB, raw: maxFollowers.toString(), timestamp: now, type: "Max" } });
                                  if (n > 1) stats.push({ label: "Follower Spread", value: fmtNum(maxFollowers - minFollowers), color: "text-white/50", section: "Audience", detail: { formula: "Max Followers − Min Followers", source: srcDerived, raw: (maxFollowers - minFollowers).toString(), timestamp: now, type: "Range" } });
                                  const avgPostsPerFollower = avgFollowersEach > 0 ? ((totalPostsP / n) / avgFollowersEach * 1000) : 0;
                                  if (avgPostsPerFollower > 0) stats.push({ label: "Posts / 1K Foll.", value: avgPostsPerFollower.toFixed(1), color: "text-white/50", section: "Audience", detail: { formula: "(Avg Posts / Avg Followers) × 1000", source: srcDerived, timestamp: now, type: "Ratio" } });

                                  // ── GROWTH (period-scaled) ──
                                  if (!isAllTime) {
                                    stats.push({ label: `Growth (${periodLabel})`, value: (growthRatePeriod >= 0 ? "+" : "") + growthRatePeriod.toFixed(2) + "%", color: growthRatePeriod >= 0 ? "text-emerald-400" : "text-red-400", section: "Growth", detail: { formula: `Weekly Growth Rate × (${periodDays} / 7)`, source: srcSB, raw: growthRatePeriod.toFixed(4), timestamp: now, type: "Percentage" } });
                                  }
                                  stats.push({ label: "Momentum", value: growthMomentum, color: growthMomentum === "Explosive" ? "text-emerald-400" : growthMomentum === "Strong" ? "text-[hsl(217,91%,60%)]" : growthMomentum === "Declining" ? "text-red-400" : "text-white/50", section: "Growth", detail: { formula: "Explosive >2%/wk, Strong >0.5%/wk, Steady >0%/wk, Stagnant >-0.5%/wk, Declining <-0.5%/wk", source: srcDerived, timestamp: now, type: "Rating" } });
                                  if (!isAllTime && followerGainPeriod !== 0) stats.push({ label: `${periodLabel} Foll. Gain`, value: (followerGainPeriod >= 0 ? "+" : "") + fmtNum(followerGainPeriod), color: followerGainPeriod >= 0 ? "text-emerald-400" : "text-red-400", section: "Growth", detail: { formula: `30d Follower Gain × (${periodDays} / 30)`, source: srcSB, raw: followerGainPeriod.toString(), timestamp: now, type: "Absolute" } });
                                  if (dailyFollowerGain !== 0) stats.push({ label: "Daily Gain", value: (dailyFollowerGain >= 0 ? "+" : "") + fmtNum(Math.round(dailyFollowerGain)), color: dailyFollowerGain >= 0 ? "text-emerald-400" : "text-red-400", section: "Growth", detail: { formula: "30d Follower Gain / 30", source: srcSB, raw: Math.round(dailyFollowerGain).toString(), timestamp: now, type: "Average" } });
                                  if (!isAllTime && projFollowersPeriod > 0) stats.push({ label: `Proj. End of ${periodLabel}`, value: fmtNum(projFollowersPeriod), color: "text-[hsl(217,91%,60%)]", section: "Growth", detail: { formula: "Current Followers × (1 + Growth Rate Period / 100)", source: srcDerived, raw: projFollowersPeriod.toString(), timestamp: now, type: "Projection", note: "Based on current growth trajectory" } });
                                  stats.push({ label: "Proj. Yearly Gain", value: (dailyFollowerGain * 365 >= 0 ? "+" : "") + fmtNum(Math.round(dailyFollowerGain * 365)), color: dailyFollowerGain >= 0 ? "text-emerald-400/50" : "text-red-400/50", section: "Growth", detail: { formula: "Daily Gain × 365", source: srcDerived, timestamp: now, type: "Projection" } });
                                  stats.push({ label: "Conversion Potential", value: conversionPotential, color: conversionPotential === "Strong" ? "text-emerald-400" : conversionPotential === "Moderate" ? "text-amber-400" : "text-white/50", section: "Growth", detail: { formula: "Strong = ER >3% AND Growth >0.5%/wk", source: srcDerived, timestamp: now, type: "Rating" } });
                                  // NEW growth metrics
                                  const weeklyGainRate = totalGain30d !== 0 ? (totalGain30d / 30) * 7 : 0;
                                  stats.push({ label: "Weekly Gain", value: (weeklyGainRate >= 0 ? "+" : "") + fmtNum(Math.round(weeklyGainRate)), color: weeklyGainRate >= 0 ? "text-emerald-400/70" : "text-red-400/70", section: "Growth", detail: { formula: "(30d Gain / 30) × 7", source: srcDerived, timestamp: now, type: "Average" } });
                                  const daysToDouble = dailyFollowerGain > 0 && totalReach > 0 ? Math.round(totalReach / dailyFollowerGain) : 0;
                                  if (daysToDouble > 0 && daysToDouble < 36500) stats.push({ label: "Days to 2× Reach", value: fmtNum(daysToDouble) + "d", color: daysToDouble < 365 ? "text-emerald-400" : "text-white/50", section: "Growth", detail: { formula: "Current Reach / Daily Gain", source: srcDerived, raw: daysToDouble.toString(), timestamp: now, type: "Projection", note: "Time to double current follower base at current growth rate" } });
                                  const growthVelocity = avgGrP > 0 ? Math.round(avgGrP * avgFollowersEach / 100) : 0;
                                  if (growthVelocity > 0) stats.push({ label: "Growth Velocity", value: "+" + fmtNum(growthVelocity) + "/wk", color: "text-emerald-400/60", section: "Growth", detail: { formula: "Weekly Growth % × Avg Followers / 100", source: srcDerived, timestamp: now, type: "Absolute" } });

                                  // ── ENGAGEMENT ──
                                  stats.push({ label: "Avg ER", value: avgEng.toFixed(2) + "%", color: avgEng > 3 ? "text-emerald-400" : avgEng > 1 ? "text-amber-400" : "text-red-400", section: "Engagement", detail: { formula: "(Avg Likes + Avg Comments) / Followers × 100", source: srcSB, raw: avgEng.toFixed(4), timestamp: now, type: "Percentage", note: `Benchmark for ${key}: ${benchmarkER}%` } });
                                  stats.push({ label: "ER vs Benchmark", value: erVsBenchmark.toFixed(0) + "%", color: erVsBenchmark > 120 ? "text-emerald-400" : erVsBenchmark > 80 ? "text-amber-400" : "text-red-400", section: "Engagement", detail: { formula: `(Avg ER / ${benchmarkER}%) × 100 — ${key} benchmark = ${benchmarkER}%`, source: srcDerived, timestamp: now, type: "Percentage" } });
                                  stats.push({ label: "Quality Score", value: engQualityScore + "/100", color: engQualityScore > 70 ? "text-emerald-400" : engQualityScore > 40 ? "text-amber-400" : "text-red-400", section: "Engagement", detail: { formula: "min(100, (ER / Platform Ceiling) × 100)", source: srcDerived, timestamp: now, type: "Score" } });
                                  stats.push({ label: "Avg Likes", value: fmtNum(avgLikesP), color: "text-white", section: "Engagement", detail: { formula: "Average likes per post across all competitors", source: srcSB, raw: avgLikesP.toString(), timestamp: now, type: "Average" } });
                                  if (avgCommentsP > 0) stats.push({ label: "Avg Comments", value: fmtNum(avgCommentsP), color: "text-white", section: "Engagement", detail: { source: srcSB, raw: avgCommentsP.toString(), timestamp: now, type: "Average" } });
                                  if (avgViewsP > 0) stats.push({ label: "Avg Views", value: fmtNum(avgViewsP), color: "text-[hsl(217,91%,60%)]", section: "Engagement", detail: { source: key === "youtube" ? srcRSS : srcSB, raw: avgViewsP.toString(), timestamp: now, type: "Average" } });
                                  if (avgSharesP > 0) stats.push({ label: "Avg Shares", value: fmtNum(avgSharesP), color: "text-white", section: "Engagement", detail: { source: srcSB, raw: avgSharesP.toString(), timestamp: now, type: "Average" } });
                                  stats.push({ label: "Avg Interactions", value: fmtNum(avgInteractions), color: "text-white", section: "Engagement", detail: { formula: "Avg Likes + Avg Comments", source: srcDerived, timestamp: now } });
                                  if (likesPerK > 0) stats.push({ label: "Likes / 1K Foll.", value: likesPerK.toFixed(1), color: likesPerK > 30 ? "text-emerald-400" : "text-white/70", section: "Engagement", detail: { formula: "Avg Likes / (Avg Followers / 1000)", source: srcDerived, timestamp: now, type: "Ratio" } });
                                  if (commentsPerK > 0) stats.push({ label: "Comments / 1K", value: commentsPerK.toFixed(1), color: "text-white/70", section: "Engagement", detail: { formula: "Avg Comments / (Avg Followers / 1000)", source: srcDerived, timestamp: now, type: "Ratio" } });
                                  if (likeCommentRatio > 0) stats.push({ label: "Like:Comment", value: likeCommentRatio.toFixed(1) + ":1", color: "text-white/70", section: "Engagement", detail: { formula: "Avg Likes / Avg Comments", source: srcDerived, timestamp: now, type: "Ratio", note: "High ratio = passive audience, low = engaged community" } });
                                  if (viralityScore > 0) stats.push({ label: "Virality Score", value: viralityScore.toFixed(2) + "%", color: viralityScore > 5 ? "text-emerald-400" : "text-white/70", section: "Engagement", detail: { formula: "(Avg Likes / Avg Followers) × 100", source: srcDerived, timestamp: now, type: "Percentage" } });
                                  if (commentRate > 0) stats.push({ label: "Comment Rate", value: commentRate.toFixed(3) + "%", color: "text-white/70", section: "Engagement", detail: { formula: "(Avg Comments / Avg Followers) × 100", source: srcDerived, timestamp: now, type: "Percentage" } });
                                  stats.push({ label: "Save Potential", value: savePotential, color: savePotential === "High" ? "text-emerald-400" : savePotential === "Medium" ? "text-amber-400" : "text-white/50", section: "Engagement", detail: { formula: "High = Virality >3%, Medium = Virality >1%", source: srcDerived, timestamp: now, type: "Rating" } });
                                  if (retentionProxy > 0) stats.push({ label: "Retention Score", value: retentionProxy + "%", color: retentionProxy > 50 ? "text-emerald-400" : "text-white/70", section: "Engagement", detail: { formula: "min(100, (Avg Likes / Avg Views × 100) × 2)", source: srcDerived, timestamp: now, type: "Score" } });
                                  // NEW engagement metrics
                                  const maxER = Math.max(...cc.map(c => c.engagementRate));
                                  const minER = Math.min(...cc.map(c => c.engagementRate));
                                  stats.push({ label: "Top ER", value: maxER.toFixed(2) + "%", color: "text-emerald-400/70", section: "Engagement", detail: { formula: "Highest ER among competitors", source: srcSB, timestamp: now, type: "Max" } });
                                  if (n > 1) stats.push({ label: "ER Range", value: (maxER - minER).toFixed(2) + "%", color: "text-white/40", section: "Engagement", detail: { formula: "Max ER − Min ER", source: srcDerived, timestamp: now, type: "Range" } });
                                  const sentimentProxy = likeCommentRatio > 0 ? (likeCommentRatio > 50 ? "Passive" : likeCommentRatio > 10 ? "Balanced" : "Active Community") : "N/A";
                                  stats.push({ label: "Audience Sentiment", value: sentimentProxy, color: sentimentProxy === "Active Community" ? "text-emerald-400" : sentimentProxy === "Balanced" ? "text-amber-400" : "text-white/50", section: "Engagement", detail: { formula: "Active Community <10:1 L:C, Balanced 10-50:1, Passive >50:1", source: srcDerived, timestamp: now, type: "Rating" } });
                                  const engDensity = totalPostsP > 0 ? Math.round((totalLikesP + (avgCommentsP * totalPostsP)) / totalPostsP) : 0;
                                  if (engDensity > 0) stats.push({ label: "Eng. Density/Post", value: fmtNum(engDensity), color: "text-white/60", section: "Engagement", detail: { formula: "(Total Likes + Total Comments) / Total Posts", source: srcDerived, timestamp: now, type: "Average" } });

                                  // ── VIEWS & REACH ──
                                  if (avgViewsP > 0 || totalViewsP > 0) {
                                    if (viewsPerK > 0) stats.push({ label: "Views / 1K Foll.", value: fmtNum(Math.round(viewsPerK)), color: viewsPerK > 1000 ? "text-emerald-400" : "text-white/70", section: "Views", detail: { formula: "Avg Views / (Avg Followers / 1000)", source: srcDerived, timestamp: now, type: "Ratio" } });
                                    if (viewToFollowerRatio > 0) stats.push({ label: "View:Follower", value: viewToFollowerRatio.toFixed(2) + "x", color: viewToFollowerRatio > 1 ? "text-emerald-400" : "text-white/70", section: "Views", detail: { formula: "Avg Views / Avg Followers", source: srcDerived, timestamp: now, type: "Ratio", note: ">1x = content reaches beyond followers" } });
                                    if (avgViewLikeRatio > 0) stats.push({ label: "Like:View Ratio", value: avgViewLikeRatio.toFixed(2) + "%", color: "text-white/70", section: "Views", detail: { formula: "(Avg Likes / Avg Views) × 100", source: srcDerived, timestamp: now, type: "Percentage" } });
                                    if (avgViewCommentRatio > 0) stats.push({ label: "Comment:View", value: avgViewCommentRatio.toFixed(3) + "%", color: "text-white/70", section: "Views", detail: { formula: "(Avg Comments / Avg Views) × 100", source: srcDerived, timestamp: now, type: "Percentage" } });
                                    if (!isAllTime && estTotalViewsPeriod > 0) stats.push({ label: `${periodLabel} Views`, value: fmtNum(estTotalViewsPeriod), color: "text-[hsl(217,91%,60%)]", section: "Views", detail: { formula: `Daily View Gain × ${periodDays}`, source: srcDerived, timestamp: now, type: "Projection" } });
                                    if (!isAllTime && viewGainPeriod > 0) stats.push({ label: `${periodLabel} View Gain`, value: "+" + fmtNum(viewGainPeriod), color: "text-emerald-400", section: "Views", detail: { formula: `30d View Gain × (${periodDays} / 30)`, source: srcSB, timestamp: now, type: "Absolute" } });
                                    if (totalViewsP > 0) stats.push({ label: "Total Views", value: fmtNum(totalViewsP), color: "text-[hsl(217,91%,60%)]", section: "Views", detail: { source: srcSB, raw: totalViewsP.toString(), timestamp: now, type: "Absolute" } });
                                    if (impressionRate > 0) stats.push({ label: "Impression Rate", value: impressionRate + "%", color: impressionRate > 50 ? "text-emerald-400" : "text-white/70", section: "Views", detail: { formula: "(ER × 10 + View:Follower × 100) / 2", source: srcDerived, timestamp: now, type: "Score" } });
                                    // NEW views metrics
                                    const viewEfficiency = avgViewsP > 0 && avgFollowersEach > 0 ? ((avgViewsP / avgFollowersEach) * 100).toFixed(1) : "0";
                                    stats.push({ label: "View Efficiency", value: viewEfficiency + "%", color: parseFloat(viewEfficiency) > 100 ? "text-emerald-400" : "text-white/60", section: "Views", detail: { formula: "(Avg Views / Avg Followers) × 100", source: srcDerived, timestamp: now, type: "Percentage", note: ">100% = viral reach beyond followers" } });
                                    if (totalViewsP > 0 && totalPostsP > 0) {
                                      const viewsPerPost = Math.round(totalViewsP / totalPostsP);
                                      stats.push({ label: "Views / Post (All)", value: fmtNum(viewsPerPost), color: "text-[hsl(217,91%,60%)]/70", section: "Views", detail: { formula: "Total Views / Total Posts", source: srcDerived, timestamp: now, type: "Average" } });
                                    }
                                    const dailyViewRate = dailyViewGain > 0 ? fmtNum(Math.round(dailyViewGain)) : "0";
                                    if (dailyViewGain > 0) stats.push({ label: "Daily Views", value: "+" + dailyViewRate, color: "text-emerald-400/60", section: "Views", detail: { formula: "30d View Gain / 30", source: srcSB, timestamp: now, type: "Average" } });
                                  }

                                  // ── CONTENT ──
                                  if (totalPostsP > 0) stats.push({ label: "Total Content", value: fmtNum(totalPostsP), color: "text-[hsl(262,83%,58%)]", section: "Content", detail: { source: srcSB, raw: totalPostsP.toString(), timestamp: now, type: "Absolute" } });
                                  stats.push({ label: "Post Frequency", value: avgFreqP.toFixed(1) + "/wk", color: "text-[hsl(262,83%,58%)]", section: "Content", detail: { formula: "Posts per 7 days (from posting cadence analysis)", source: srcSB, timestamp: now, type: "Rate" } });
                                  stats.push({ label: "Consistency", value: contentConsistency, color: contentConsistency === "Daily+" ? "text-emerald-400" : contentConsistency === "Frequent" ? "text-[hsl(217,91%,60%)]" : "text-white/50", section: "Content", detail: { formula: "Daily+ ≥7/wk, Frequent ≥3/wk, Weekly ≥1/wk, Sporadic <1/wk", source: srcDerived, timestamp: now, type: "Rating" } });
                                  if (!isAllTime && estPostsInPeriod > 0) stats.push({ label: `Est. Posts (${periodLabel})`, value: fmtNum(estPostsInPeriod), color: "text-[hsl(262,83%,58%)]", section: "Content", detail: { formula: `Posts/Day × ${periodDays}`, source: srcDerived, timestamp: now, type: "Projection" } });
                                  if (postsPerDay > 0) stats.push({ label: "Posts / Day", value: postsPerDay.toFixed(2), color: "text-white/70", section: "Content", detail: { formula: "Post Frequency / 7", source: srcDerived, timestamp: now, type: "Rate" } });
                                  if (contentVelocity > 0) stats.push({ label: "Avg Library Size", value: fmtNum(contentVelocity), color: "text-white/70", section: "Content", detail: { formula: "Total Posts / Number of competitors", source: srcDerived, timestamp: now, type: "Average" } });
                                  if (estReachPerPost > 0) stats.push({ label: "Est. Reach / Post", value: fmtNum(estReachPerPost), color: "text-[hsl(217,91%,60%)]", section: "Content", detail: { formula: "Avg Followers × (ER / 100) × 3.5 multiplier", source: srcDerived, timestamp: now, type: "Projection", note: "3.5x multiplier accounts for algorithmic boost + shares" } });
                                  if (contentLifespan > 0) stats.push({ label: "Content Lifespan", value: contentLifespan + " day" + (contentLifespan !== 1 ? "s" : ""), color: "text-white/70", section: "Content", detail: { formula: "7 / Post Frequency", source: srcDerived, timestamp: now, type: "Duration", note: "Days before next post replaces this in feed" } });
                                  if (shareRate > 0) stats.push({ label: "Share Rate", value: shareRate.toFixed(3) + "%", color: "text-white/70", section: "Content", detail: { formula: "(Avg Shares / Avg Followers) × 100", source: srcDerived, timestamp: now, type: "Percentage" } });
                                  if (contentROI > 0) stats.push({ label: "Weekly Content ROI", value: weeklyContentROI, color: "text-amber-400", section: "Content", detail: { formula: "Est. Reach/Post × Post Frequency", source: srcDerived, timestamp: now, type: "Absolute", note: "Estimated weekly impressions from content output" } });
                                  // NEW content metrics
                                  const contentAge = totalPostsP > 0 && avgFreqP > 0 ? Math.round((totalPostsP / n) / (avgFreqP / 7)) : 0;
                                  if (contentAge > 0) stats.push({ label: "Est. Content Age", value: contentAge + " days", color: "text-white/50", section: "Content", detail: { formula: "Avg Library Size / Posts per Day", source: srcDerived, timestamp: now, type: "Duration", note: "Approximate age of content library based on posting cadence" } });
                                  const monthlyPosts = Math.round(postsPerDay * 30);
                                  if (monthlyPosts > 0) stats.push({ label: "Monthly Posts", value: fmtNum(monthlyPosts), color: "text-[hsl(262,83%,58%)]/70", section: "Content", detail: { formula: "Posts/Day × 30", source: srcDerived, timestamp: now, type: "Projection" } });
                                  const yearlyPosts = Math.round(postsPerDay * 365);
                                  if (yearlyPosts > 0) stats.push({ label: "Yearly Posts", value: fmtNum(yearlyPosts), color: "text-[hsl(262,83%,58%)]/50", section: "Content", detail: { formula: "Posts/Day × 365", source: srcDerived, timestamp: now, type: "Projection" } });

                                  // ── VOLUME (period-scaled) ──
                                  if (totalLikesP > 0) stats.push({ label: "Total Likes", value: fmtNum(totalLikesP), color: "text-white", section: "Volume", detail: { source: srcSB, raw: totalLikesP.toString(), timestamp: now, type: "Absolute" } });
                                  if (!isAllTime && likeGainPeriod !== 0) stats.push({ label: `${periodLabel} Like Gain`, value: (likeGainPeriod >= 0 ? "+" : "") + fmtNum(likeGainPeriod), color: likeGainPeriod >= 0 ? "text-emerald-400" : "text-red-400", section: "Volume", detail: { formula: `30d Like Gain × (${periodDays} / 30)`, source: srcSB, timestamp: now, type: "Absolute" } });
                                  if (!isAllTime && estTotalLikesPeriod !== 0) stats.push({ label: `Est. ${periodLabel} Likes`, value: fmtNum(Math.abs(estTotalLikesPeriod)), color: "text-white/70", section: "Volume", detail: { formula: `Daily Like Gain × ${periodDays}`, source: srcDerived, timestamp: now, type: "Projection" } });
                                  if (engVelocity > 0) stats.push({ label: "Weekly Interactions", value: fmtNum(engVelocity), color: "text-white/70", section: "Volume", detail: { formula: "Avg Interactions × Post Frequency", source: srcDerived, timestamp: now, type: "Absolute" } });
                                  if (!isAllTime && totalInteractionsPeriod > 0) stats.push({ label: `${periodLabel} Interactions`, value: fmtNum(totalInteractionsPeriod), color: "text-amber-400", section: "Volume", detail: { formula: `Weekly Interactions × (${periodDays} / 7)`, source: srcDerived, timestamp: now, type: "Projection" } });
                                  if (interactionsPerPost > 0) stats.push({ label: "Interactions / Post", value: fmtNum(interactionsPerPost), color: "text-white/70", section: "Volume", detail: { formula: "Avg Likes + Avg Comments + Avg Shares", source: srcDerived, timestamp: now, type: "Average" } });
                                  // NEW volume metrics
                                  if (dailyLikeGain !== 0) stats.push({ label: "Daily Like Gain", value: (dailyLikeGain >= 0 ? "+" : "") + fmtNum(Math.round(dailyLikeGain)), color: dailyLikeGain >= 0 ? "text-emerald-400/60" : "text-red-400/60", section: "Volume", detail: { formula: "30d Like Gain / 30", source: srcSB, timestamp: now, type: "Average" } });
                                  const yearlyLikes = Math.round(dailyLikeGain * 365);
                                  if (yearlyLikes !== 0) stats.push({ label: "Proj. Yearly Likes", value: (yearlyLikes >= 0 ? "+" : "") + fmtNum(Math.abs(yearlyLikes)), color: "text-white/50", section: "Volume", detail: { formula: "Daily Like Gain × 365", source: srcDerived, timestamp: now, type: "Projection" } });
                                  if (totalLikesP > 0 && totalPostsP > 0) {
                                    const likesPerAllPost = Math.round(totalLikesP / totalPostsP);
                                    stats.push({ label: "Lifetime Likes/Post", value: fmtNum(likesPerAllPost), color: "text-white/60", section: "Volume", detail: { formula: "Total Likes / Total Posts", source: srcDerived, timestamp: now, type: "Average" } });
                                  }

                                  // ── TRAFFIC (from financial/site data if available) ──
                                  const trafficData = cc.length > 0 ? cc[0] : null;
                                  const compMeta = trafficData ? competitors.find(c2 => c2.username === trafficData.username)?.metadata : null;
                                  const traffic = compMeta?.financialData?.trafficEstimates || {};
                                  if (traffic.monthlyVisitors && traffic.monthlyVisitors !== "Not publicly disclosed") {
                                    const mv = typeof traffic.monthlyVisitors === 'string' ? traffic.monthlyVisitors : fmtNum(traffic.monthlyVisitors);
                                    stats.push({ label: "Monthly Visitors", value: mv, color: "text-[hsl(150,60%,50%)]", section: "Traffic", detail: { source: "AI Financial Intelligence (SimilarWeb/public data)", raw: mv, timestamp: now, type: "Estimate", note: "Based on publicly available traffic data" } });
                                  }
                                  if (traffic.dailyVisitors && traffic.dailyVisitors !== "Not publicly disclosed") {
                                    stats.push({ label: "Daily Visitors", value: traffic.dailyVisitors, color: "text-[hsl(150,60%,50%)]/80", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Estimate" } });
                                  }
                                  if (traffic.yearlyVisitors && traffic.yearlyVisitors !== "Not publicly disclosed") {
                                    stats.push({ label: "Yearly Visitors", value: traffic.yearlyVisitors, color: "text-[hsl(150,60%,50%)]/60", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Estimate" } });
                                  }
                                  if (traffic.bounceRate && traffic.bounceRate !== "Not publicly disclosed") {
                                    stats.push({ label: "Bounce Rate", value: traffic.bounceRate, color: "text-white/60", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Percentage" } });
                                  }
                                  if (traffic.avgSessionDuration && traffic.avgSessionDuration !== "Not publicly disclosed") {
                                    stats.push({ label: "Avg Session", value: traffic.avgSessionDuration, color: "text-white/60", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Duration" } });
                                  }
                                  if (traffic.growthTrend && traffic.growthTrend !== "Not publicly disclosed") {
                                    stats.push({ label: "Traffic Trend", value: traffic.growthTrend, color: "text-[hsl(150,60%,50%)]", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Trend" } });
                                  }
                                  if (Array.isArray(traffic.topTrafficSources)) {
                                    traffic.topTrafficSources.slice(0, 3).forEach((ts: any) => {
                                      stats.push({ label: `Traffic: ${ts.source}`, value: ts.percentage, color: "text-white/50", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Percentage" } });
                                    });
                                  }
                                  if (Array.isArray(traffic.topCountries)) {
                                    traffic.topCountries.slice(0, 3).forEach((tc: any) => {
                                      stats.push({ label: `Geo: ${tc.country}`, value: tc.percentage, color: "text-white/50", section: "Traffic", detail: { source: "AI Financial Intelligence", timestamp: now, type: "Percentage" } });
                                    });
                                  }

                                  // ── COMPETITIVE ──
                                  stats.push({ label: "Accounts Tracked", value: n.toString(), color: "text-white/60", section: "Competitive", detail: { formula: "Number of competitors on this platform", source: "User data", timestamp: now, type: "Count" } });
                                  const dominantComp = cc.reduce((a, b) => a.followers > b.followers ? a : b, cc[0]);
                                  stats.push({ label: "Dominant Account", value: "@" + dominantComp?.username?.slice(0, 12), color: "text-amber-400", section: "Competitive", detail: { formula: "Competitor with highest followers on this platform", source: srcSB, timestamp: now } });
                                  const competitiveGap = maxFollowers - minFollowers;
                                  if (competitiveGap > 0 && n > 1) stats.push({ label: "Competitive Gap", value: fmtNum(competitiveGap), color: "text-white/50", section: "Competitive", detail: { formula: "Max Followers − Min Followers", source: srcDerived, timestamp: now, type: "Range" } });
                                  const avgThreat = n > 0 ? Math.round(cc.reduce((s, c2) => s + (competitors.find(comp2 => comp2.username === c2.username)?.score || 0), 0) / n) : 0;
                                  if (avgThreat > 0) stats.push({ label: "Avg Threat Score", value: avgThreat + "/100", color: avgThreat > 70 ? "text-red-400" : avgThreat > 40 ? "text-amber-400" : "text-emerald-400", section: "Competitive", detail: { formula: "Average threat score of competitors on this platform", source: "AI Analysis", timestamp: now, type: "Score" } });
                                  const platformDominance = totalFollowers > 0 ? ((totalReach / totalFollowers) * 100).toFixed(1) : "0";
                                  stats.push({ label: "Platform Dominance", value: platformDominance + "%", color: "text-[hsl(217,91%,60%)]", section: "Competitive", detail: { formula: "Platform Reach / Total Cross-Platform Reach × 100", source: srcDerived, timestamp: now, type: "Percentage" } });

                                  // Group by section
                                  const sections = ["Audience", "Growth", "Engagement", "Views", "Content", "Volume", "Traffic", "Competitive"];
                                  const grouped = sections.map(s => ({ section: s, items: stats.filter(st => st.section === s) })).filter(g => g.items.length > 0);

                                  const periodOptions = [
                                    { key: "daily", label: "1D" },
                                    { key: "weekly", label: "1W" },
                                    { key: "monthly", label: "1M" },
                                    { key: "quarterly", label: "3M" },
                                    { key: "yearly", label: "1Y" },
                                    { key: "alltime", label: "All" },
                                    { key: "custom", label: "Custom" },
                                  ];

                                  return (
                                    <Collapsible key={key} defaultOpen={true}>
                                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] hover:border-white/[0.08] transition-all overflow-hidden">
                                        <CollapsibleTrigger className="w-full">
                                          <div className="flex items-center gap-2.5 p-3 cursor-pointer select-none">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 p-1.5" style={{ background: data.color }}><img src={data.logo} alt={data.name} className="w-full h-full object-contain" /></div>
                                            <div className="flex-1 min-w-0 text-left">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-semibold text-white">{data.name}</span>
                                                <Badge variant="outline" className="text-[7px] border-white/10 text-white/40">{n} competitor{n !== 1 ? "s" : ""}</Badge>
                                                <Badge variant="outline" className="text-[7px] border-white/10 text-white/30">{stats.length} metrics</Badge>
                                                <span className="text-[9px] text-white/30 ml-auto mr-2">{reachPct}% of total reach</span>
                                                <ChevronDown className="h-3.5 w-3.5 text-white/30 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                              </div>
                                              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden mt-1">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${data.color}, ${data.color}88)` }} />
                                              </div>
                                            </div>
                                          </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="px-3 pb-3 space-y-2">
                                            {/* Time Period Selector */}
                                            <div className="flex items-center gap-1 pb-1.5 border-b border-white/[0.04]" onClick={(e) => e.stopPropagation()}>
                                              <CalendarIcon className="h-3 w-3 text-white/30 shrink-0" />
                                              <span className="text-[8px] text-white/30 mr-1">Period:</span>
                                              <div className="flex gap-0.5">
                                                {periodOptions.map(opt => (
                                                  opt.key !== "custom" ? (
                                                    <button
                                                      key={opt.key}
                                                      onClick={() => setPlatformPeriod(key, opt.key)}
                                                      className={cn(
                                                        "px-1.5 py-0.5 rounded text-[8px] font-medium transition-all",
                                                        period === opt.key
                                                          ? "bg-white/10 text-white"
                                                          : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
                                                      )}
                                                    >
                                                      {opt.label}
                                                    </button>
                                                  ) : (
                                                    <Popover key={opt.key}>
                                                      <PopoverTrigger asChild>
                                                        <button
                                                          className={cn(
                                                            "px-1.5 py-0.5 rounded text-[8px] font-medium transition-all flex items-center gap-0.5",
                                                            period === "custom"
                                                              ? "bg-white/10 text-white"
                                                              : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
                                                          )}
                                                        >
                                                          <CalendarIcon className="h-2.5 w-2.5" />
                                                          {period === "custom" && customDates.length > 0 ? `${customDates.length}d` : "Custom"}
                                                        </button>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-auto p-0 bg-[hsl(222,47%,8%)] border-white/10" align="start" side="bottom">
                                                        <Calendar
                                                          mode="multiple"
                                                          selected={customDates}
                                                          onSelect={(dates) => {
                                                            setPlatformDates(key, dates || []);
                                                            setPlatformPeriod(key, "custom");
                                                          }}
                                                          className={cn("p-3 pointer-events-auto text-white")}
                                                          disabled={(date) => date > new Date()}
                                                        />
                                                        <div className="px-3 pb-2 flex items-center justify-between">
                                                          <span className="text-[9px] text-white/40">{customDates.length} day{customDates.length !== 1 ? "s" : ""} selected</span>
                                                          <button
                                                            onClick={() => { setPlatformDates(key, []); }}
                                                            className="text-[9px] text-red-400 hover:text-red-300"
                                                          >
                                                            Clear
                                                          </button>
                                                        </div>
                                                      </PopoverContent>
                                                    </Popover>
                                                  )
                                                ))}
                                              </div>
                                              <span className="text-[7px] text-white/20 ml-auto">metrics scaled to {periodLabel.toLowerCase()}</span>
                                            </div>

                                            {grouped.map(({ section, items }) => (
                                              <div key={section}>
                                                <p className="text-[7px] font-semibold text-white/25 uppercase tracking-wider mb-1 px-0.5">{section}</p>
                                                <div className="grid grid-cols-5 gap-1">
                                                  {items.map((stat) => (
                                                    <ContextMenu key={stat.label}>
                                                      <ContextMenuTrigger>
                                                        <div className="p-1.5 rounded-md bg-white/[0.02] text-center cursor-context-menu hover:bg-white/[0.04] transition-colors">
                                                          <p className="text-[6.5px] text-white/30 leading-tight">{stat.label}</p>
                                                          <p className={`text-[10px] font-bold ${stat.color}`}>{stat.value}</p>
                                                        </div>
                                                      </ContextMenuTrigger>
                                                      <ContextMenuContent className="w-72 bg-[hsl(222,47%,8%)] border-white/10 text-white">
                                                        <ContextMenuLabel className="text-[11px] font-semibold text-white/90 flex items-center gap-1.5">
                                                          <Info className="h-3 w-3 text-[hsl(217,91%,60%)]" />
                                                          {stat.label}
                                                        </ContextMenuLabel>
                                                        <ContextMenuSeparator className="bg-white/[0.06]" />
                                                        <div className="px-2 py-1.5 space-y-1.5">
                                                          <div className="flex justify-between items-center">
                                                            <span className="text-[9px] text-white/40">Value</span>
                                                            <span className={`text-[10px] font-bold ${stat.color}`}>{stat.value}</span>
                                                          </div>
                                                          {stat.detail?.type && (
                                                            <div className="flex justify-between items-center">
                                                              <span className="text-[9px] text-white/40">Type</span>
                                                              <Badge variant="outline" className="text-[7px] border-white/10 text-white/50 h-4">{stat.detail.type}</Badge>
                                                            </div>
                                                          )}
                                                          {stat.detail?.raw && (
                                                            <div className="flex justify-between items-center">
                                                              <span className="text-[9px] text-white/40">Raw Value</span>
                                                              <span className="text-[9px] text-white/60 font-mono">{stat.detail.raw}</span>
                                                            </div>
                                                          )}
                                                          {stat.detail?.formula && (
                                                            <div>
                                                              <span className="text-[8px] text-white/40 block mb-0.5">Formula / Logic</span>
                                                              <p className="text-[8px] text-[hsl(217,91%,60%)]/80 bg-white/[0.03] rounded px-1.5 py-1 leading-relaxed">{stat.detail.formula}</p>
                                                            </div>
                                                          )}
                                                          {stat.detail?.source && (
                                                            <div className="flex justify-between items-center">
                                                              <span className="text-[9px] text-white/40">Source</span>
                                                              <span className="text-[8px] text-white/50">{stat.detail.source}</span>
                                                            </div>
                                                          )}
                                                          {stat.detail?.timestamp && (
                                                            <div className="flex justify-between items-center">
                                                              <span className="text-[9px] text-white/40">Fetched</span>
                                                              <span className="text-[8px] text-white/40 font-mono">{stat.detail.timestamp}</span>
                                                            </div>
                                                          )}
                                                          {stat.detail?.note && (
                                                            <div className="mt-1 pt-1 border-t border-white/[0.04]">
                                                              <p className="text-[8px] text-amber-400/60 italic">{stat.detail.note}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                        <ContextMenuSeparator className="bg-white/[0.06]" />
                                                        <ContextMenuItem
                                                          className="text-[9px] text-white/50 hover:text-white cursor-pointer"
                                                          onClick={() => {
                                                            navigator.clipboard.writeText(`${stat.label}: ${stat.value}`);
                                                            toast.success("Copied to clipboard");
                                                          }}
                                                        >
                                                          <Copy className="h-3 w-3 mr-1.5" /> Copy Metric
                                                        </ContextMenuItem>
                                                      </ContextMenuContent>
                                                    </ContextMenu>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ═══ HASHTAG PERFORMANCE INDEX ═══ */}
                          {topHashtags.length > 0 && (
                            <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "hsl(262 83% 58% / 0.03)", border: "1px solid hsl(262 83% 58% / 0.12)" }}>
                              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(262 83% 58% / 0.08)", background: "hsl(262 83% 58% / 0.02)" }}>
                                <Hash className="h-3.5 w-3.5 text-[hsl(262,83%,58%)]" />
                                <span className="text-[10px] md:text-[11px] font-semibold text-[hsl(262,83%,58%)]">Hashtag Performance Index</span>
                                <Badge variant="outline" className="ml-auto text-[7px] border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)]">{sortedHashtags.length} unique tags</Badge>
                              </div>
                              <div className="p-2.5 md:p-3 space-y-1.5">
                                {topHashtags.map(([tag, count], i) => {
                                  const usedBy = competitors.filter(c => c.topHashtags.includes(tag));
                                  const avgEngOfUsers = usedBy.length > 0 ? usedBy.reduce((s, c) => s + c.engagementRate, 0) / usedBy.length : 0;
                                  const avgFollowersOfUsers = usedBy.length > 0 ? Math.round(usedBy.reduce((s, c) => s + c.followers, 0) / usedBy.length) : 0;
                                  const barW = (count / maxHashtagCount) * 100;
                                  return (
                                    <div key={tag} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
                                      <span className="text-[9px] text-white/25 w-4 text-right font-mono">{i + 1}</span>
                                      <div className="flex items-center gap-1 min-w-[90px]">
                                        <Hash className="h-2.5 w-2.5 text-[hsl(262,83%,58%)]/60" />
                                        <span className="text-[10px] font-medium text-white/80 truncate">{tag.replace("#", "")}</span>
                                      </div>
                                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barW}%`, background: "linear-gradient(90deg, hsl(262 83% 58%), hsl(217 91% 60%))" }} />
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[8px] text-white/40">{count}/{competitors.length}</span>
                                        <span className="text-[8px] text-emerald-400">{avgEngOfUsers.toFixed(1)}% ER</span>
                                        <span className="text-[8px] text-white/30">{fmtNum(avgFollowersOfUsers)} avg reach</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {sortedHashtags.length > 10 && (
                                  <p className="text-[8px] text-white/25 text-center mt-1">+ {sortedHashtags.length - 10} more hashtags tracked</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ═══ TRAFFIC & AUTHORITY INSIGHTS ═══ */}
                          {competitors.some(c => c.metadata?.websiteTraffic || c.metadata?.domainAuthority) && (
                            <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)", background: "hsl(0 0% 100% / 0.01)" }}>
                                <Globe className="h-3.5 w-3.5 text-[hsl(217,91%,60%)]" />
                                <span className="text-[10px] md:text-[11px] font-semibold text-white/60">Traffic & Authority Insights</span>
                              </div>
                              <div className="p-2.5 md:p-3 space-y-2">
                                {competitors.filter(c => c.metadata?.websiteTraffic || c.metadata?.domainAuthority).map((c, i) => {
                                  const traffic = c.metadata?.websiteTraffic || 0;
                                  const da = c.metadata?.domainAuthority || 0;
                                  const maxTraffic = Math.max(...competitors.map(x => x.metadata?.websiteTraffic || 0));
                                  const trafficBar = maxTraffic > 0 ? (traffic / maxTraffic) * 100 : 0;
                                  const socialToWeb = traffic > 0 ? ((c.followers / traffic) * 100).toFixed(1) : "N/A";
                                  return (
                                    <div key={c.id} className="p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.015]">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold ${i === 0 ? "bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)]" : "bg-white/[0.04] text-white/30"}`}>{i + 1}</div>
                                          <span className="text-[10px] font-medium text-white/80">@{c.username}</span>
                                          {c.metadata?.websiteUrl && <span className="text-[8px] text-white/25 truncate max-w-[140px]">{c.metadata.websiteUrl}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {da > 0 && (
                                            <div className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: da >= 80 ? "hsl(150 60% 50% / 0.12)" : da >= 50 ? "hsl(30 95% 60% / 0.12)" : "hsl(0 0% 100% / 0.04)", color: da >= 80 ? "hsl(150 60% 60%)" : da >= 50 ? "hsl(30 95% 60%)" : "hsl(0 0% 100% / 0.5)" }}>DA {da}/100</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <div className="flex justify-between text-[8px] mb-0.5">
                                            <span className="text-white/35">Monthly Traffic</span>
                                            <span className="text-[hsl(217,91%,60%)] font-medium">{traffic > 0 ? fmtNum(traffic) : "N/A"}</span>
                                          </div>
                                          <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                            <div className="h-full rounded-full bg-[hsl(217,91%,60%)]/50 transition-all duration-700" style={{ width: `${trafficBar}%` }} />
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-[7px] text-white/30">Social:Web Ratio</p>
                                          <p className="text-[10px] font-bold text-white">{socialToWeb}{socialToWeb !== "N/A" ? "x" : ""}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-[7px] text-white/30">Followers per DA</p>
                                          <p className="text-[10px] font-bold text-white">{da > 0 ? fmtNum(Math.round(c.followers / da)) : "N/A"}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {/* AI Recs */}
                    <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)", background: "hsl(0 0% 100% / 0.01)" }}>
                        <div className="flex items-center gap-2"><Brain className="h-3.5 w-3.5 text-[hsl(262,83%,58%)]" /><span className="text-[10px] md:text-[11px] font-semibold text-[hsl(262,83%,58%)]">AI Content Recommendations</span></div>
                        <Button size="sm" variant="outline" className="text-[9px] gap-1 border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,58%)]/10 h-6 px-2" disabled={contentRecsLoading} onClick={async()=>{setContentRecsLoading(true);try{const compData=competitors.map(c=>`@${c.username}: ${c.followers} followers, ${c.engagementRate}% ER, top content: ${c.contentTypes.map(ct=>`${ct.type}(${ct.pct}%)`).join(",")}, hashtags: ${c.topHashtags.slice(0,3).join(",")}, niche: ${c.metadata?.niche||"unknown"}`).join("\n");const myContext=myStats?`\nMY STATS: @${myStats.username}: ${myStats.followers} followers, ${myStats.engagementRate}% ER, ${myStats.postFrequency} posts/wk`:"";const aiReply=await callAI(`Analyze these competitors' content and give me specific recommendations to outperform them.${myContext}\n\nCOMPETITORS:\n${compData}\n\nReturn ONLY valid JSON:\n{"contentPillars":[{"pillar":"name","description":"why","frequency":"posts/week","expectedEngagement":"X%"}],"hookFormulas":[{"formula":"the hook template","example":"concrete example","whyItWorks":"reason"}],"postingSchedule":{"bestDays":["Mon","Wed"],"bestTimes":["9am","7pm"],"reasoning":"why"},"contentCalendar":[{"day":"Monday","contentType":"Reel","topic":"specific topic","hashtags":["tag1","tag2"],"hookIdea":"specific hook"}],"stealableStrategies":[{"from":"@competitor","strategy":"what they do","howToAdapt":"how to do it better"}]}`);setContentRecs(parseJSON(aiReply));await refreshAIUsage();toast.success("Content recommendations generated");}catch(err:any){toast.error(err?.message||"Failed");}finally{setContentRecsLoading(false);}}}>
                          {contentRecsLoading?<Loader2 className="h-2.5 w-2.5 animate-spin"/>:<Sparkles className="h-2.5 w-2.5"/>}
                          {contentRecsLoading?"Analyzing...":"Generate Recs"}
                        </Button>
                      </div>
                      <div className="p-2.5 md:p-3">
                        {contentRecsLoading?(<div className="text-center py-4"><Loader2 className="h-5 w-5 text-[hsl(262,83%,58%)] mx-auto animate-spin"/><p className="text-[9px] text-white/40 mt-2">Analyzing competitor content patterns...</p></div>):contentRecs?(<div className="space-y-3"><div><p className="text-[10px] font-medium text-white/50 mb-1.5">Content Pillars to Own</p><div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">{(contentRecs.contentPillars||[]).map((p:any,i:number)=>(<div key={i} className="p-2 rounded-lg bg-[hsl(262,83%,58%)]/5 border border-[hsl(262,83%,58%)]/15 space-y-0.5"><div className="flex items-center justify-between"><span className="text-[10px] font-medium text-white/80">{p.pillar}</span><Badge variant="outline" className="text-[7px] border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)]">{p.frequency}</Badge></div><p className="text-[9px] text-white/50">{p.description}</p><p className="text-[9px] text-emerald-400">Expected: {p.expectedEngagement}</p></div>))}</div></div><div><p className="text-[10px] font-medium text-white/50 mb-1.5">Proven Hook Formulas</p><div className="space-y-1.5">{(contentRecs.hookFormulas||[]).map((h:any,i:number)=>(<div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-0.5"><p className="text-[10px] font-medium text-amber-400">"{h.formula}"</p><p className="text-[9px] text-white/60 italic">Example: {h.example}</p><p className="text-[9px] text-white/40">{h.whyItWorks}</p></div>))}</div></div>{contentRecs.postingSchedule&&(<div className="p-2 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/15"><p className="text-[10px] font-medium text-[hsl(217,91%,60%)] mb-1">Optimal Posting Schedule</p><div className="flex gap-1 mb-1 flex-wrap">{(contentRecs.postingSchedule.bestDays||[]).map((d:string)=><Badge key={d} variant="outline" className="text-[8px] border-[hsl(217,91%,60%)]/20 text-[hsl(217,91%,60%)]">{d}</Badge>)}{(contentRecs.postingSchedule.bestTimes||[]).map((t:string)=><Badge key={t} variant="outline" className="text-[8px] border-emerald-400/20 text-emerald-400">{t}</Badge>)}</div><p className="text-[9px] text-white/40">{contentRecs.postingSchedule.reasoning}</p></div>)}{(contentRecs.contentCalendar||[]).length>0&&(<div><p className="text-[10px] font-medium text-white/50 mb-1.5">Weekly Content Calendar</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">{contentRecs.contentCalendar.map((day:any,i:number)=>(<div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-0.5"><div className="flex items-center gap-1.5"><Badge className="bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)] text-[8px]">{day.day}</Badge><Badge variant="outline" className="text-[8px] border-white/10 text-white/40">{day.contentType}</Badge></div><p className="text-[10px] text-white/70">{day.topic}</p><p className="text-[9px] text-amber-400/70">Hook: {day.hookIdea}</p><div className="flex gap-1 flex-wrap">{(day.hashtags||[]).map((t:string)=><span key={t} className="text-[8px] text-[hsl(217,91%,60%)]/50">#{t}</span>)}</div></div>))}</div></div>)}{(contentRecs.stealableStrategies||[]).length>0&&(<div><p className="text-[10px] font-medium text-white/50 mb-1.5">Strategies to Steal & Improve</p>{contentRecs.stealableStrategies.map((s:any,i:number)=>(<div key={i} className="p-2 rounded-lg bg-amber-400/5 border border-amber-400/15 space-y-0.5 mb-1.5"><span className="text-[10px] text-white/70">From <span className="text-amber-400 font-medium">{s.from}</span></span><p className="text-[9px] text-white/60">They do: {s.strategy}</p><p className="text-[9px] text-emerald-400">Your version: {s.howToAdapt}</p></div>))}</div>)}</div>):(<p className="text-[9px] text-white/30 text-center py-3">Click "Generate Recs" for AI-powered content strategy</p>)}
                      </div>
                    </div>
                  </div>
                  <div className="h-[20px] md:h-[24px] flex items-center justify-center relative" style={{ background: "linear-gradient(180deg, hsl(240 4% 10%), hsl(240 3% 15%))" }}>
                    <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[80px] md:w-[120px] h-[3.5px] md:h-[4px] rounded-full" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ SWOT TAB ═══ */}
        <TabsContent value="swot" className="space-y-5">
          <Card className="crm-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <select value={selectedCompetitor || ""} onChange={e => setSelectedCompetitors([e.target.value])} className="flex-1 h-10 px-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white text-sm focus:border-[hsl(217,91%,60%)]/40 focus:outline-none">
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
                      await refreshAIUsage();
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
                  {/* Progress bar */}
                  {(() => {
                    const totalGoals = (battlePlan.weeklyGoals || []).length;
                    const checkedGoals = (battlePlan.weeklyGoals || []).filter((_: any, i: number) => battlePlanChecks[`goal-${i}`]).length;
                    const pct = totalGoals > 0 ? Math.round((checkedGoals / totalGoals) * 100) : 0;
                    return totalGoals > 0 ? (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-white/40">Progress</span>
                          <span className={`text-[10px] font-bold ${pct === 100 ? "text-emerald-400" : "text-amber-400"}`}>{checkedGoals}/{totalGoals} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : null;
                  })()}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(battlePlan.weeklyGoals || []).map((g: any, i: number) => {
                      const key = `goal-${i}`;
                      const checked = battlePlanChecks[key];
                      return (
                        <div key={i} className={`p-3 rounded-lg border space-y-1 cursor-pointer transition-all ${checked ? "bg-emerald-400/10 border-emerald-400/25" : "bg-amber-400/5 border-amber-400/15"}`} onClick={() => toggleBattlePlanCheck(key)}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? "bg-emerald-400 border-emerald-400" : "border-white/20"}`}>
                              {checked && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                            <p className={`text-xs font-medium ${checked ? "text-white/50 line-through" : "text-white/80"}`}>{g.goal}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-6">
                            <Badge variant="outline" className="text-[9px] border-amber-400/20 text-amber-400">{g.metric}</Badge>
                            <span className="text-[10px] text-emerald-400 font-bold">{g.target}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Wins */}
              <Card className="crm-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Wins (Do Now)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(battlePlan.quickWins || []).map((w: any, i: number) => {
                    const key = `qw-${i}`;
                    const checked = battlePlanChecks[key];
                    return (
                    <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${checked ? "bg-emerald-400/10 border-emerald-400/20" : "bg-emerald-400/5 border-emerald-400/15"}`} onClick={() => toggleBattlePlanCheck(key)}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${checked ? "bg-emerald-400 border-emerald-400" : "border-white/20"}`}>
                        {checked && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-medium text-white/80">{w.action}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/40">⏱ {w.timeNeeded}</span>
                          <span className="text-[10px] text-emerald-400">→ {w.expectedResult}</span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Daily Action Schedule</CardTitle></CardHeader>
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
                            <p className="text-xs font-medium text-pink-400 mb-2 flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Content Strategy Intel</p>
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
                            <p className="text-xs font-medium text-white/60 mb-2 flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Weekly Action Plan to Beat Them</p>
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

                        {/* ═══ EMAIL AUTOMATION INTEL ═══ */}
                        {siteInsights.emailAutomationIntel && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-400/5 to-blue-400/5 border border-sky-400/15">
                            <p className="text-xs font-medium text-sky-400 mb-3 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Email & Automation Intelligence</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                              {[
                                { label: "Email Capture", value: siteInsights.emailAutomationIntel.hasEmailCapture ? "Active" : "None", color: siteInsights.emailAutomationIntel.hasEmailCapture ? "text-emerald-400" : "text-red-400" },
                                { label: "Method", value: siteInsights.emailAutomationIntel.captureMethod || "N/A", color: "text-white/80" },
                                { label: "Est. List Size", value: siteInsights.emailAutomationIntel.estimatedListSize || "?", color: "text-sky-400" },
                                { label: "Automation", value: siteInsights.emailAutomationIntel.automationLevel || "?", color: "text-white/80" },
                              ].map((m, i) => (
                                <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-center">
                                  <p className="text-[10px] text-white/40">{m.label}</p>
                                  <p className={`text-xs font-bold ${m.color}`}>{m.value}</p>
                                </div>
                              ))}
                            </div>
                            {siteInsights.emailAutomationIntel.leadMagnet && (
                              <div className="p-2 rounded-lg bg-white/[0.02] mb-2">
                                <p className="text-[10px] text-white/40">Lead Magnet</p>
                                <p className="text-xs text-white/70">{siteInsights.emailAutomationIntel.leadMagnet}</p>
                              </div>
                            )}
                            {siteInsights.emailAutomationIntel.espPlatform && (
                              <Badge variant="outline" className="text-[8px] border-sky-400/20 text-sky-400 mb-2">ESP: {siteInsights.emailAutomationIntel.espPlatform}</Badge>
                            )}
                            {siteInsights.emailAutomationIntel.yourOpportunity && (
                              <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400">🎯 {siteInsights.emailAutomationIntel.yourOpportunity}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ SEO KEYWORD GAPS ═══ */}
                        {(siteInsights.seoKeywordGaps || []).length > 0 && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/5 to-emerald-400/5 border border-green-400/15">
                            <p className="text-xs font-medium text-green-400 mb-3 flex items-center gap-1"><Search className="h-3.5 w-3.5" /> SEO Keyword Gaps — Keywords to Steal</p>
                            <div className="space-y-2">
                              {siteInsights.seoKeywordGaps.map((k: any, i: number) => (
                                <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-white/90">{k.keyword}</span>
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="text-[8px] border-white/10 text-white/40">Vol: {k.searchVolume}</Badge>
                                      <Badge variant="outline" className={`text-[8px] ${k.difficulty === "easy" ? "border-emerald-400/20 text-emerald-400" : k.difficulty === "hard" ? "border-red-400/20 text-red-400" : "border-amber-400/20 text-amber-400"}`}>{k.difficulty}</Badge>
                                      {k.estimatedPosition && <Badge variant="outline" className="text-[8px] border-sky-400/20 text-sky-400">Pos ~{k.estimatedPosition}</Badge>}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-white/50">{k.yourAction}</p>
                                  {k.contentToCreate && <p className="text-[10px] text-emerald-400 mt-0.5">📝 Create: {k.contentToCreate}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ═══ COMPETITIVE MOAT ═══ */}
                        {siteInsights.competitiveMoat && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400/5 to-yellow-400/5 border border-amber-400/15">
                            <p className="text-xs font-medium text-amber-400 mb-3 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Competitive Moat Analysis</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Moat Type</p>
                                <p className="text-xs font-bold text-amber-400 capitalize">{siteInsights.competitiveMoat.moatType || "none"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Strength</p>
                                <p className={`text-xs font-bold capitalize ${siteInsights.competitiveMoat.moatStrength === "strong" ? "text-red-400" : siteInsights.competitiveMoat.moatStrength === "moderate" ? "text-amber-400" : "text-emerald-400"}`}>{siteInsights.competitiveMoat.moatStrength || "?"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Time to Break</p>
                                <p className="text-xs font-bold text-white/80">{siteInsights.competitiveMoat.timeToBreak || "?"}</p>
                              </div>
                            </div>
                            {siteInsights.competitiveMoat.howToBreachIt && (
                              <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/10 mb-2">
                                <p className="text-[10px] text-red-400 font-medium">🔓 How to Breach: {siteInsights.competitiveMoat.howToBreachIt}</p>
                              </div>
                            )}
                            {siteInsights.competitiveMoat.yourMoatAdvice && (
                              <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400">🏰 Build Your Moat: {siteInsights.competitiveMoat.yourMoatAdvice}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ BRAND PERCEPTION ═══ */}
                        {siteInsights.brandPerception && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-400/5 to-pink-400/5 border border-rose-400/15">
                            <p className="text-xs font-medium text-rose-400 mb-3 flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Brand Perception Analysis</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Brand Strength</p>
                                <p className="text-lg font-black text-rose-400">{siteInsights.brandPerception.brandStrength || "?"}<span className="text-[9px] text-white/30">/100</span></p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Personality</p>
                                <p className="text-xs text-white/80">{siteInsights.brandPerception.brandPersonality || "N/A"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Emotional Appeal</p>
                                <p className="text-xs text-white/80">{siteInsights.brandPerception.emotionalAppeal || "N/A"}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                              {(siteInsights.brandPerception.brandWeaknesses || []).length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-red-400 font-medium">Brand Weak Spots</p>
                                  {siteInsights.brandPerception.brandWeaknesses.map((w: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60 pl-2">• {w}</p>
                                  ))}
                                </div>
                              )}
                              {(siteInsights.brandPerception.messagingGaps || []).length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-amber-400 font-medium">Messaging Angles They Miss</p>
                                  {siteInsights.brandPerception.messagingGaps.map((g: string, i: number) => (
                                    <p key={i} className="text-[10px] text-white/60 pl-2">• {g}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                            {siteInsights.brandPerception.yourBrandStrategy && (
                              <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400">✨ Your Brand Strategy: {siteInsights.brandPerception.yourBrandStrategy}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ RETENTION SIGNALS ═══ */}
                        {siteInsights.retentionSignals && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400/5 to-teal-400/5 border border-emerald-400/15">
                            <p className="text-xs font-medium text-emerald-400 mb-3 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Retention & Loyalty Intelligence</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Loyalty Program</p>
                                <p className={`text-xs font-bold ${siteInsights.retentionSignals.hasLoyaltyProgram ? "text-emerald-400" : "text-white/40"}`}>{siteInsights.retentionSignals.hasLoyaltyProgram ? "Active" : "None"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02] text-center">
                                <p className="text-[10px] text-white/40">Community</p>
                                <p className={`text-xs font-bold capitalize ${siteInsights.retentionSignals.communityEngagement === "strong" ? "text-emerald-400" : siteInsights.retentionSignals.communityEngagement === "moderate" ? "text-amber-400" : "text-red-400"}`}>{siteInsights.retentionSignals.communityEngagement || "?"}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-white/[0.02]">
                                <p className="text-[10px] text-white/40">Repeat Purchase</p>
                                <p className="text-[10px] text-white/70">{siteInsights.retentionSignals.repeatPurchaseSignals || "N/A"}</p>
                              </div>
                            </div>
                            {(siteInsights.retentionSignals.retentionTactics || []).length > 0 && (
                              <div className="mb-2">
                                <p className="text-[10px] text-white/50 mb-1">Their Retention Tactics:</p>
                                <div className="flex flex-wrap gap-1">
                                  {siteInsights.retentionSignals.retentionTactics.map((t: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[8px] border-white/10 text-white/50">{t}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(siteInsights.retentionSignals.churnVulnerabilities || []).length > 0 && (
                              <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/10 mb-2">
                                <p className="text-[10px] text-red-400 font-medium mb-1">Why Their Customers Might Leave:</p>
                                {siteInsights.retentionSignals.churnVulnerabilities.map((v: string, i: number) => (
                                  <p key={i} className="text-[10px] text-white/60">• {v}</p>
                                ))}
                              </div>
                            )}
                            {siteInsights.retentionSignals.yourRetentionPlay && (
                              <div className="p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                                <p className="text-[10px] text-emerald-400">🔄 Your Retention Play: {siteInsights.retentionSignals.yourRetentionPlay}</p>
                              </div>
                            )}
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
                    <div className="flex flex-col items-center pt-5 gap-1">
                      <span className="text-lg text-white/20 font-bold">VS</span>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/20 hover:text-white/60" onClick={() => { const tmp = h2hCompA; setH2hCompA(h2hCompB); setH2hCompB(tmp); }} title="Swap">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
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
                            await refreshAIUsage();
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

                  {/* Direct Stat Comparison Table */}
                  <Card className="crm-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-white/60">Raw Stat Comparison</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06]">
                              <th className="text-left py-2 text-white/50 font-medium text-xs">Metric</th>
                              <th className="text-center py-2 text-[hsl(217,91%,60%)] font-medium text-xs">@{h2hResult.usernameA}</th>
                              <th className="text-center py-2 text-[hsl(262,83%,58%)] font-medium text-xs">@{h2hResult.usernameB}</th>
                              <th className="text-center py-2 text-white/40 font-medium text-xs">Diff</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "Followers", a: h2hResult.statsA?.followers || 0, b: h2hResult.statsB?.followers || 0, fmt: fmtNum, higher: true },
                              { label: "Engagement %", a: h2hResult.statsA?.engagementRate || 0, b: h2hResult.statsB?.engagementRate || 0, fmt: (v: number) => `${v}%`, higher: true },
                              { label: "Avg Likes", a: h2hResult.statsA?.avgLikes || 0, b: h2hResult.statsB?.avgLikes || 0, fmt: (v: number) => v.toLocaleString(), higher: true },
                              { label: "Avg Comments", a: h2hResult.statsA?.avgComments || 0, b: h2hResult.statsB?.avgComments || 0, fmt: (v: number) => v.toLocaleString(), higher: true },
                              { label: "Growth/Wk", a: h2hResult.statsA?.growthRate || 0, b: h2hResult.statsB?.growthRate || 0, fmt: (v: number) => `${v >= 0 ? "+" : ""}${v}%`, higher: true },
                              { label: "Posts/Wk", a: h2hResult.statsA?.postFrequency || 0, b: h2hResult.statsB?.postFrequency || 0, fmt: (v: number) => `${v}`, higher: true },
                              { label: "Total Posts", a: h2hResult.statsA?.posts || 0, b: h2hResult.statsB?.posts || 0, fmt: (v: number) => v.toLocaleString(), higher: true },
                              { label: "Like Rate", a: (h2hResult.statsA?.followers || 1) > 0 ? (h2hResult.statsA?.avgLikes || 0) / (h2hResult.statsA?.followers || 1) * 100 : 0, b: (h2hResult.statsB?.followers || 1) > 0 ? (h2hResult.statsB?.avgLikes || 0) / (h2hResult.statsB?.followers || 1) * 100 : 0, fmt: (v: number) => `${v.toFixed(2)}%`, higher: true },
                            ].map((row, idx) => {
                              const aWins = row.higher ? row.a > row.b : row.a < row.b;
                              const bWins = row.higher ? row.b > row.a : row.b < row.a;
                              const diff = row.b !== 0 ? ((row.a - row.b) / Math.abs(row.b) * 100).toFixed(0) : "—";
                              return (
                                <tr key={idx} className="border-b border-white/[0.03]">
                                  <td className="py-2 text-white/50 text-xs">{row.label}</td>
                                  <td className={`text-center py-2 text-xs font-medium ${aWins ? "text-emerald-400 font-bold" : "text-white/60"}`}>{row.fmt(row.a)}</td>
                                  <td className={`text-center py-2 text-xs font-medium ${bWins ? "text-emerald-400 font-bold" : "text-white/60"}`}>{row.fmt(row.b)}</td>
                                  <td className={`text-center py-2 text-[10px] ${Number(diff) > 0 ? "text-emerald-400" : Number(diff) < 0 ? "text-red-400" : "text-white/30"}`}>{diff !== "—" ? `${Number(diff) > 0 ? "+" : ""}${diff}%` : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
                          await refreshAIUsage();
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
                      {forecastResult.competitorComparison && (
                        <p className="text-[10px] text-[hsl(217,91%,60%)]/70 mt-2 p-2 rounded-lg bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/10">{forecastResult.competitorComparison}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Projections */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "30 Days", data: forecastResult.projections?.thirtyDays },
                      { label: "90 Days", data: forecastResult.projections?.ninetyDays },
                      { label: "6 Months", data: forecastResult.projections?.sixMonths },
                      { label: "1 Year", data: forecastResult.projections?.oneYear },
                    ].map((p, i) => {
                      const growthPct = forecastResult.currentFollowers > 0 ? (((p.data?.followers || 0) - forecastResult.currentFollowers) / forecastResult.currentFollowers * 100).toFixed(0) : "0";
                      return (
                        <Card key={i} className="crm-card">
                          <CardContent className="p-3 text-center space-y-1">
                            <p className="text-[10px] text-white/40">{p.label}</p>
                            <p className="text-lg font-bold text-[hsl(217,91%,60%)]">{fmtNum(p.data?.followers || 0)}</p>
                            <p className="text-[10px] text-emerald-400">+{growthPct}% growth</p>
                            <p className="text-[10px] text-white/50">{p.data?.engagementRate}% ER</p>
                            <p className="text-[10px] text-white/30">{fmtNum(p.data?.totalLikes || 0)} total likes</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Best/Worst Case Scenarios */}
                  {(forecastResult.bestCaseScenario || forecastResult.worstCaseScenario) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {forecastResult.bestCaseScenario && (
                        <Card className="crm-card border-emerald-400/15">
                          <CardContent className="p-4 space-y-2">
                            <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">🚀 Best Case Scenario</p>
                            <p className="text-xl font-black text-emerald-400">{fmtNum(forecastResult.bestCaseScenario.followers || 0)} <span className="text-xs font-normal text-white/40">followers</span></p>
                            <p className="text-[10px] text-white/60">{forecastResult.bestCaseScenario.timeline}</p>
                            <p className="text-[10px] text-emerald-400/70">Requires: {forecastResult.bestCaseScenario.requirements}</p>
                          </CardContent>
                        </Card>
                      )}
                      {forecastResult.worstCaseScenario && (
                        <Card className="crm-card border-red-400/15">
                          <CardContent className="p-4 space-y-2">
                            <p className="text-xs font-medium text-red-400 flex items-center gap-1.5">⚠️ Worst Case Scenario</p>
                            <p className="text-xl font-black text-red-400">{fmtNum(forecastResult.worstCaseScenario.followers || 0)} <span className="text-xs font-normal text-white/40">followers</span></p>
                            <p className="text-[10px] text-white/60">{forecastResult.worstCaseScenario.timeline}</p>
                            <p className="text-[10px] text-red-400/70">Warning: {forecastResult.worstCaseScenario.warning}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

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

                  {/* Engagement Rate Forecast */}
                  {(forecastResult.monthlyBreakdown || []).some((m: any) => m.engagement) && (
                    <Card className="crm-card">
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Activity className="h-4 w-4" /> Engagement Rate Trajectory</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastResult.monthlyBreakdown}>
                              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`${v}%`, "Engagement"]} />
                              <Line type="monotone" dataKey="engagement" stroke="hsl(150,60%,50%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(150,60%,50%)" }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}


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
                  <Download className="h-4 w-4" /> Export Markdown
                </Button>

                {/* CSV Export */}
                <Button variant="outline" className="gap-1.5 border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10" onClick={() => {
                  if (!competitors.length) { toast.error("No competitors to export"); return; }
                  const headers = ["Username", "Platform", "Followers", "Engagement Rate %", "Avg Likes", "Avg Comments", "Growth/Wk %", "Posts/Wk", "Total Posts", "Threat Score", "Niche", "Top Hashtags", "Last Analyzed"];
                  const rows = competitors.map(c => [
                    `@${c.username}`, c.platform, c.followers, c.engagementRate, c.avgLikes, c.avgComments,
                    c.growthRate, c.postFrequency, c.posts, c.score, c.metadata?.niche || "",
                    c.topHashtags.join(";"), new Date(c.lastAnalyzed).toLocaleDateString(),
                  ]);
                  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `competitors-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("CSV exported");
                }}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>

                {/* JSON Export */}
                <Button variant="outline" className="gap-1.5 border-[hsl(262,83%,58%)]/20 text-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,58%)]/10" onClick={() => {
                  const data = {
                    exportedAt: new Date().toISOString(),
                    enterprise: enterpriseProfile || null,
                    competitors: competitors.map(c => ({
                      username: c.username, platform: c.platform, followers: c.followers,
                      engagementRate: c.engagementRate, avgLikes: c.avgLikes, avgComments: c.avgComments,
                      growthRate: c.growthRate, postFrequency: c.postFrequency, posts: c.posts,
                      score: c.score, niche: c.metadata?.niche, topHashtags: c.topHashtags,
                    })),
                    swot: swotResult || null,
                    gapAnalysis: gapAnalysis || null,
                    siteInsights: siteInsights || null,
                    financialData: financialData || null,
                    battlePlan: battlePlan || null,
                    forecast: forecastResult || null,
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `competitor-intel-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Full data exported as JSON");
                }}>
                  <Download className="h-4 w-4" /> Export JSON
                </Button>

                <Button variant="outline" className="gap-1.5 border-white/10 text-white/60 hover:text-white" onClick={() => {
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

                {/* HTML Report Export */}
                <Button variant="outline" className="gap-1.5 border-amber-400/20 text-amber-400 hover:bg-amber-400/10" onClick={() => {
                  const css = `body{font-family:system-ui,-apple-system,sans-serif;background:#0a0e1a;color:#e2e8f0;padding:40px;max-width:900px;margin:0 auto}h1{background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px}h2{color:#60a5fa;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px;margin-top:32px}h3{color:#a78bfa;font-size:14px}.card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin:12px 0}.stat{display:inline-block;padding:8px 16px;background:rgba(59,130,246,0.08);border-radius:8px;margin:4px;font-size:13px}.stat b{color:#60a5fa}.good{color:#34d399}.bad{color:#f87171}.warn{color:#fbbf24}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.04)}th{color:rgba(255,255,255,0.4);font-weight:500}.footer{margin-top:48px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.3);font-size:11px}`;
                  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Competitive Intelligence Report</title><style>${css}</style></head><body>`;
                  html += `<h1>🎯 Competitive Intelligence Report</h1><p style="color:rgba(255,255,255,0.4)">Generated: ${new Date().toLocaleString()}</p>`;
                  
                  if (enterpriseProfile?.companyName) {
                    html += `<div class="card"><h3>My Enterprise</h3><p><b>${enterpriseProfile.companyName}</b>${enterpriseProfile.industry ? ` · ${enterpriseProfile.industry}` : ""}</p>`;
                    if (myStats) html += `<p>@${myStats.username} · ${fmtNum(myStats.followers)} followers · ${myStats.engagementRate}% ER</p>`;
                    html += `</div>`;
                  }

                  if (competitors.length) {
                    html += `<h2>👥 Tracked Competitors (${competitors.length})</h2><table><tr><th>Account</th><th>Platform</th><th>Followers</th><th>ER%</th><th>Growth</th><th>Threat</th></tr>`;
                    competitors.forEach(c => {
                      const tc = c.score >= 70 ? "bad" : c.score >= 40 ? "warn" : "good";
                      html += `<tr><td><b>@${c.username}</b></td><td>${c.platform}</td><td>${fmtNum(c.followers)}</td><td>${c.engagementRate}%</td><td class="${c.growthRate >= 0 ? "good" : "bad"}">${c.growthRate >= 0 ? "+" : ""}${c.growthRate}%</td><td class="${tc}">${c.score}/100</td></tr>`;
                    });
                    html += `</table>`;
                  }

                  if (siteInsights) {
                    html += `<h2>🧠 AI Competitive Intelligence</h2><div class="card"><p><b>Score:</b> <span class="${(siteInsights.competitiveScore || 0) >= 60 ? "good" : "warn"}">${siteInsights.competitiveScore}/100</span> · <b>Position:</b> ${siteInsights.marketPosition?.tier || "?"}</p><p>${siteInsights.executiveSummary || ""}</p></div>`;
                  }

                  if (forecastResult) {
                    html += `<h2>📈 Growth Forecast: @${forecastResult.username}</h2><div class="card"><p><b>Trend:</b> <span class="${forecastResult.currentTrend === "accelerating" ? "good" : forecastResult.currentTrend === "declining" ? "bad" : "warn"}">${forecastResult.currentTrend}</span></p><p>${forecastResult.trendAnalysis || ""}</p>`;
                    html += `<div style="display:flex;gap:8px;margin-top:12px">`;
                    [{ l: "30 Days", d: forecastResult.projections?.thirtyDays },{ l: "90 Days", d: forecastResult.projections?.ninetyDays },{ l: "6 Months", d: forecastResult.projections?.sixMonths },{ l: "1 Year", d: forecastResult.projections?.oneYear }].forEach(p => {
                      html += `<div class="stat"><b>${fmtNum(p.d?.followers || 0)}</b><br><span style="font-size:10px;color:rgba(255,255,255,0.4)">${p.l}</span></div>`;
                    });
                    html += `</div></div>`;
                  }

                  if (swotResult) {
                    html += `<h2>🎯 SWOT Analysis</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">`;
                    [{ k: "strengths", l: "Strengths", c: "good" },{ k: "weaknesses", l: "Weaknesses", c: "bad" },{ k: "opportunities", l: "Opportunities", c: "" },{ k: "threats", l: "Threats", c: "warn" }].forEach(q => {
                      const items = (swotResult as any)[q.k] || [];
                      html += `<div class="card"><h3 class="${q.c}">${q.l} (${items.length})</h3><ul>`;
                      items.forEach((it: any) => { html += `<li style="font-size:12px;margin:4px 0">${typeof it === "string" ? it : it.text || it}</li>`; });
                      html += `</ul></div>`;
                    });
                    html += `</div>`;
                  }

                  html += `<div class="footer">Generated by Uplyze Competitor Analyzer · ${new Date().toISOString()}</div></body></html>`;

                  const blob = new Blob([html], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `competitive-intel-${new Date().toISOString().slice(0, 10)}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("HTML report exported — open in any browser");
                }}>
                  <FileText className="h-4 w-4" /> Export HTML Report
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

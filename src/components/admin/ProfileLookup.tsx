import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, Loader2, Users, FileText, Image, Video, Heart,
  Calendar, Globe, Copy, TrendingUp, Star, ExternalLink,
  DollarSign, BarChart3, Eye, Zap, Shield, Clock,
  ChevronDown, ChevronUp, Download, Info, Activity,
  Target, Layers, ArrowUpRight, ArrowDownRight, Sparkles,
  RefreshCw, MessageSquare, Bell, Link2, Award, AlertTriangle,
  Percent, UserCheck, UserX, Crown, Hash, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend,
} from "recharts";
import CreditCostBadge from "./CreditCostBadge";

const CHART_COLORS = [
  "hsl(152, 70%, 50%)", "hsl(220, 70%, 60%)", "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)", "hsl(40, 80%, 55%)", "hsl(190, 70%, 50%)",
  "hsl(30, 80%, 55%)", "hsl(320, 60%, 55%)",
];

const TOOLTIP_STYLE = {
  background: "hsl(220,60%,10%)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  source?: string;
  subtext?: string;
  delta?: number | null;
}

const MetricCard = ({ label, value, icon: Icon, color, source, subtext, delta }: MetricCardProps) => (
  <div className="bg-white/[0.07] backdrop-blur-sm rounded-xl p-4 border border-white/[0.1] group relative transition-colors hover:bg-white/[0.1]">
    <div className="flex items-start justify-between">
      <Icon className={`h-4 w-4 ${color} mb-2`} />
      {source && (
        <span className="text-[10px] text-white/40 bg-white/[0.08] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">{source}</span>
      )}
    </div>
    <div className="flex items-end gap-1.5">
      <p className="text-lg font-bold text-white truncate">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {delta !== undefined && delta !== null && (
        <span className={`text-xs flex items-center gap-0.5 mb-0.5 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-xs text-white/60 mt-0.5">{label}</p>
    {subtext && <p className="text-[11px] text-white/50 mt-0.5 truncate">{subtext}</p>}
  </div>
);

const DataSourceBadge = ({ source, timestamp }: { source: string; timestamp?: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-1.5 h-1.5 rounded-full ${source === "API" ? "bg-emerald-400" : source === "Derived" ? "bg-amber-400" : "bg-blue-400"}`} />
    <span className="text-[11px] text-white/50">{source}</span>
    {timestamp && <span className="text-[10px] text-white/40">• {timestamp}</span>}
  </div>
);

const SectionCard = ({ title, icon: Icon, children, badge }: { title: string; icon: React.ElementType; children: React.ReactNode; badge?: string }) => (
  <Card className="bg-white/[0.06] backdrop-blur-sm border-white/[0.1] rounded-xl shadow-lg shadow-black/10">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold text-white/90 flex items-center gap-2"><Icon className="h-4 w-4 text-white/60" /> {title}</CardTitle>
        {badge && <DataSourceBadge source={badge} />}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const NoAccountAccessBanner = ({ feature }: { feature: string }) => (
  <div className="bg-white/[0.04] border border-white/[0.1] rounded-xl p-6 text-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
      <Shield className="h-5 w-5 text-amber-400" />
    </div>
    <div>
      <p className="text-sm font-semibold text-white/80">Account Access Required</p>
      <p className="text-sm text-white/50 mt-1 max-w-md mx-auto leading-relaxed">
        {feature} requires the creator's account to be connected to your API. Public profile data is shown above.
      </p>
    </div>
    <div className="flex items-center justify-center gap-2 text-xs text-white/40">
      <Info className="h-3.5 w-3.5" />
      <span>Connect the account via the OnlyFans API dashboard to unlock this data</span>
    </div>
  </div>
);

const FanTable = ({ fans, title }: { fans: any[]; title: string }) => {
  if (!fans?.length) return null;
  return (
    <SectionCard title={title} icon={Users} badge="API">
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
        {fans.slice(0, 30).map((fan: any, i: number) => (
          <div key={fan.id || i} className="flex items-center gap-3 bg-white/[0.05] rounded-lg p-2.5 border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
            {fan.avatar && <img src={fan.avatar} alt="" className="w-8 h-8 rounded-full ring-1 ring-white/15" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate font-medium">{fan.name || fan.username || `Fan #${i + 1}`}</p>
              {fan.username && <p className="text-xs text-white/50">@{fan.username}</p>}
            </div>
            {fan.subscribedOn && <span className="text-xs text-white/50">{new Date(fan.subscribedOn).toLocaleDateString()}</span>}
            {fan.totalSpent !== undefined && <span className="text-xs font-medium text-emerald-400">${Number(fan.totalSpent || 0).toFixed(2)}</span>}
            {fan.totalRevenue !== undefined && <span className="text-xs font-medium text-emerald-400">${Number(fan.totalRevenue || 0).toFixed(2)}</span>}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

const ProfileLookup = ({ subTab, onSubTabChange }: { subTab?: string; onSubTabChange?: (subTab: string) => void }) => {
  const [lookupSubTab, setLookupSubTab] = useState(subTab || "overview");
  const handleLookupSubTab = (v: string) => { setLookupSubTab(v); onSubTabChange?.(v); };
  useEffect(() => { if (subTab && subTab !== lookupSubTab) setLookupSubTab(subTab); }, [subTab]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [fetchedAt, setFetchedAt] = useState("");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [lookupHistory, setLookupHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const { data: history } = await supabase
      .from("profile_lookup_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLookupHistory(history || []);
    setHistoryLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const saveLookup = async (result: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from("profile_lookup_history").insert({
        username: result.profile?.username || username.trim().replace("@", ""),
        display_name: result.profile?.name || null,
        avatar_url: result.profile?.avatar || null,
        snapshot_data: result,
        looked_up_by: session?.user?.id || null,
      } as any);
      fetchHistory();
    } catch (e) { console.error("Failed to save lookup history", e); }
  };

  const profile = data?.profile;
  const earnings = data?.earnings;
  const earningsByType = data?.earningsByType;
  const subscriberStats = data?.subscriberStats;
  const subscriberStatsNew = data?.subscriberStatsNew;
  const subscriberStatsRenew = data?.subscriberStatsRenew;
  const subscriberMetrics = data?.subscriberMetrics;
  const profileVisitors = data?.profileVisitors;
  const statistics = data?.statistics_overview;
  const statisticsFans = data?.statistics_fans;
  const statisticsVisitors = data?.statistics_visitors;
  const statisticsPosts = data?.statistics_posts;
  const yearlyEarnings = data?.yearlyEarnings;
  const accountDetails = data?.accountDetails;
  const topPercentage = data?.topPercentage;
  const modelStartDate = data?.modelStartDate;
  const latestFans = data?.latestFans;
  const latestFansNew = data?.latestFansNew;
  const latestFansRenew = data?.latestFansRenew;
  const activeFans = data?.activeFans;
  const allFans = data?.allFans;
  const expiredFans = data?.expiredFans;
  const topFansTotal = data?.topFansTotal;
  const topFansTips = data?.topFansTips;
  const topFansMessages = data?.topFansMessages;
  const transactions = data?.transactions;
  const totalTransactions = data?.totalTransactions;
  const earningStatistics = data?.earningStatistics;
  const promotions = data?.promotions;
  const subscriptionBundles = data?.subscriptionBundles;
  const chats = data?.chats;
  const posts = data?.posts;
  const stories = data?.stories;
  const storyHighlights = data?.storyHighlights;
  const trackingLinks = data?.trackingLinks;
  const trialLinks = data?.trialLinks;
  const chargebacks = data?.chargebacks;
  const chargebackRatio = data?.chargebackRatio;
  const chargebackStats = data?.chargebackStats;
  const payoutBalances = data?.payoutBalances;
  const massMessagingOverview = data?.massMessagingOverview;
  const directMessages = data?.directMessages;
  const massMessages = data?.massMessages;
  const topMessage = data?.topMessage;
  const notificationCounts = data?.notificationCounts;
  const vaultMedia = data?.vaultMedia;
  const vaultLists = data?.vaultLists;
  const userLists = data?.userLists;
  const socialMediaButtons = data?.socialMediaButtons;
  const settings = data?.settings;
  const queueCounts = data?.queueCounts;

  const hasAccountAccess = !!data?._meta?.accountResolved;
  const hasEarningsData = !!earnings || !!earningsByType;
  const hasSubStats = !!subscriberStats;
  const hasVisitorData = !!profileVisitors || !!statisticsVisitors;
  const hasFansData = !!latestFans || !!activeFans || !!allFans || !!topFansTotal;
  const hasTransactions = !!transactions;
  const hasChargebacks = !!chargebacks || !!chargebackRatio;
  const hasContent = !!posts || !!stories || !!vaultMedia;
  const hasMessaging = !!chats || !!massMessagingOverview || !!directMessages;
  const hasLinks = !!trackingLinks || !!trialLinks;

  const lookupProfile = async () => {
    const clean = username.trim().replace("@", "");
    if (!clean) return;
    setLoading(true);
    setData(null);
    setAiAnalysis("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onlyfans-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "full-profile", username: clean }),
        }
      );

      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Failed to fetch profile"); return; }
      if (result.profile) {
        setData(result);
        setFetchedAt(result._meta?.fetchedAt || new Date().toISOString());
        toast.success(`Profile loaded • ${result._meta?.endpointCount || result._meta?.endpoints?.length || 1} endpoints queried`);
        saveLookup(result);
      } else { toast.error("Profile not found"); }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  const runAiAnalysis = async () => {
    if (!data) return;
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-profile`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ profileData: data }) }
      );
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: "Unknown" })); toast.error(err.error || "AI analysis failed"); setAiLoading(false); return; }
      const reader = resp.body?.getReader();
      if (!reader) { setAiLoading(false); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; setAiAnalysis(fullText); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) { console.error(e); toast.error("AI analysis error"); }
    finally { setAiLoading(false); }
  };

  const copyField = (label: string, value: string) => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); };
  const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
  const preserveFormatting = (html: string) => {
    if (!html) return "";
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
  };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A";
  const daysSinceJoin = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const fmt$ = (v: any) => v !== undefined && v !== null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A";

  const derived = useMemo(() => {
    if (!profile) return null;
    const days = daysSinceJoin(profile.joinDate);
    const months = Math.max(days / 30, 1);
    const totalContent = (profile.mediasCount || 0) + (profile.postsCount || 0);
    const postFreqPerDay = days > 0 ? (profile.postsCount || 0) / days : 0;
    const postFreqPerWeek = postFreqPerDay * 7;
    const postFreqPerMonth = postFreqPerDay * 30;
    const photoRatio = totalContent > 0 ? ((profile.photosCount || 0) / totalContent) * 100 : 0;
    const videoRatio = totalContent > 0 ? ((profile.videosCount || 0) / totalContent) * 100 : 0;
    const engagementRate = (profile.postsCount || 0) > 0 ? (profile.favoritedCount || 0) / profile.postsCount : 0;
    const likesPerPost = (profile.postsCount || 0) > 0 ? (profile.favoritedCount || 0) / profile.postsCount : 0;
    const subscriberToFavRatio = (profile.subscribersCount || 0) > 0 ? (profile.favoritedCount || 0) / profile.subscribersCount : 0;
    return { days, months, totalContent, postFreqPerDay, postFreqPerWeek, postFreqPerMonth, photoRatio, videoRatio, engagementRate, likesPerPost, subscriberToFavRatio };
  }, [profile]);

  const earningsChartData = useMemo(() => {
    if (!earnings?.total?.chartAmount) return [];
    return earnings.total.chartAmount.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: item.count || 0,
    }));
  }, [earnings]);

  const subscriberChartData = useMemo(() => {
    if (!subscriberStats?.subscribes) return [];
    return subscriberStats.subscribes.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      subs: item.count || 0,
    }));
  }, [subscriberStats]);

  const visitorChartData = useMemo(() => {
    const src = profileVisitors?.chart || profileVisitors;
    if (!src || !Array.isArray(src)) return [];
    return src.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      visitors: item.count || item.visitors || 0,
    }));
  }, [profileVisitors]);

  const earningsByTypeChart = useMemo(() => {
    if (!earningsByType) return [];
    return Object.entries(earningsByType).map(([type, data]: [string, any], i) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data?.total?.total || data?.total?.gross || data?.total || 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })).filter(d => d.value > 0);
  }, [earningsByType]);

  const yearlyChartData = useMemo(() => {
    if (!yearlyEarnings?.total?.chartAmount) return [];
    return yearlyEarnings.total.chartAmount.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      amount: item.count || 0,
    }));
  }, [yearlyEarnings]);

  const contentMixData = useMemo(() => {
    if (!profile) return [];
    return [
      { name: "Photos", value: profile.photosCount || 0, fill: CHART_COLORS[0] },
      { name: "Videos", value: profile.videosCount || 0, fill: CHART_COLORS[1] },
      ...(profile.audiosCount ? [{ name: "Audio", value: profile.audiosCount, fill: CHART_COLORS[2] }] : []),
    ].filter(d => d.value > 0);
  }, [profile]);

  const performanceRadar = useMemo(() => {
    if (!profile || !derived) return [];
    return [
      { metric: "Engagement", value: Math.min((derived.engagementRate / 100) * 100, 100) },
      { metric: "Content", value: Math.min(((profile.mediasCount || 0) / 10000) * 100, 100) },
      { metric: "Popularity", value: Math.min(((profile.favoritedCount || 0) / 1000000) * 100, 100) },
      { metric: "Activity", value: Math.min((derived.postFreqPerDay / 3) * 100, 100) },
      { metric: "Audience", value: Math.min(((profile.subscribersCount || 0) / 100000) * 100, 100) },
    ];
  }, [profile, derived]);

  const bioAnalysis = useMemo(() => {
    if (!profile?.about) return null;
    const text = stripHtml(profile.about);
    const words = text.split(/\s+/).filter(Boolean);
    const hasEmojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
    const hasCTA = /subscribe|follow|click|link|join|dm|message|free|trial/i.test(text);
    const hasLinks = /https?:\/\/|www\./i.test(text);
    const hasPricing = /\$|\bfree\b|\bprice\b|\bdiscount\b/i.test(text);
    const sections = text.split(/[\n\r]{2,}/).filter(Boolean);
    const keywords = words.filter(w => w.length > 4).reduce((acc: Record<string, number>, w) => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, "");
      if (lower.length > 4) acc[lower] = (acc[lower] || 0) + 1;
      return acc;
    }, {});
    const topKeywords = Object.entries(keywords).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { wordCount: words.length, hasEmojis, hasCTA, hasLinks, hasPricing, sections, topKeywords };
  }, [profile]);

  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${profile.username}-intel-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url); toast.success("Exported JSON");
  };

  const exportCSV = () => {
    if (!profile || !derived) return;
    const rows = [
      ["Metric", "Value", "Source"],
      ["Username", profile.username, "API"],
      ["Display Name", profile.name || "", "API"],
      ["Subscribe Price", `$${profile.subscribePrice || 0}`, "API"],
      ["Subscribers", String(profile.subscribersCount ?? "Hidden"), "API"],
      ["Favorited", String(profile.favoritedCount || 0), "API"],
      ["Media Count", String(profile.mediasCount || 0), "API"],
      ["Posts", String(profile.postsCount || 0), "API"],
      ...(topPercentage ? [["Top Percentage", String(topPercentage), "API"]] : []),
      ...(earnings?.total?.total ? [["Earnings Net 30d", `$${earnings.total.total}`, "API"]] : []),
      ...(chargebackRatio?.ratio !== undefined ? [["Chargeback Ratio", `${chargebackRatio.ratio}%`, "API"]] : []),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${profile.username}-intel-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url); toast.success("Exported CSV");
  };

  const loadFromHistory = (entry: any) => {
    setData(entry.snapshot_data);
    setFetchedAt(entry.created_at);
    setUsername(entry.username);
    setShowHistory(false);
    toast.success(`Loaded snapshot from ${new Date(entry.created_at).toLocaleDateString()}`);
  };

  const deleteHistoryEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("profile_lookup_history").delete().eq("id", id);
    fetchHistory();
    toast.success("Removed from history");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" /> Profile Lookup
          </h2>
          <CreditCostBadge cost={5} variant="header" label="per lookup" />
        </div>
      </div>
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input placeholder="Enter username (e.g. madison420ivy)" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupProfile()} className="pl-10 bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/40 focus:border-accent h-11 rounded-xl text-sm" />
        </div>
        <Button onClick={lookupProfile} disabled={loading || !username.trim()} className="bg-accent hover:bg-accent/80 text-white gap-2 h-11 px-5 rounded-xl font-medium">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Scanning..." : "Lookup"}
        </Button>
        <Button variant="outline" onClick={() => setShowHistory(!showHistory)} className="border-white/10 text-white/60 hover:text-white hover:bg-white/10 gap-2 h-11 rounded-xl">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
          {lookupHistory.length > 0 && (
            <Badge className="bg-accent/20 text-accent text-[10px] h-4 px-1.5">{lookupHistory.length}</Badge>
          )}
        </Button>
      </div>

      {/* Recent lookups / History */}
      {showHistory && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/50" /> Lookup History
            </h3>
            <span className="text-xs text-white/30">{lookupHistory.length} entries</span>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent/50" /></div>
          ) : lookupHistory.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">No lookups yet</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {lookupHistory.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.07] rounded-lg p-3 border border-white/[0.05] cursor-pointer transition-colors group"
                >
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-8 h-8 rounded-md object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-white text-xs font-bold">
                      {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{entry.display_name || entry.username}</p>
                    <p className="text-xs text-white/40">@{entry.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-white/30">{new Date(entry.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-white/20">{new Date(entry.created_at).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={(e) => deleteHistoryEntry(entry.id, e)}
                    className="text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent lookups bar (when history panel is closed) */}
      {!showHistory && !data && lookupHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/30">Recent lookups</p>
          <div className="flex gap-2 flex-wrap">
            {lookupHistory.slice(0, 8).map(entry => (
              <button
                key={entry.id}
                onClick={() => loadFromHistory(entry)}
                className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg px-3 py-2 border border-white/[0.06] transition-colors"
              >
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded bg-accent/15 flex items-center justify-center text-white text-[10px] font-bold">
                    {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-white/60">@{entry.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent/60 mb-4" />
          <p className="text-sm text-white/70 font-medium">Querying 60+ API endpoints in parallel...</p>
          <p className="text-xs text-white/45 mt-1.5">Profile • Earnings • Subscribers • Fans • Chargebacks • Stories • Posts • Vault • Links • Settings</p>
        </div>
      )}

      {profile && derived && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Hero */}
          {profile.header && (
            <div className="relative rounded-xl overflow-hidden h-44">
              <img src={profile.header} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,60%,10%)] via-transparent to-transparent" />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <DataSourceBadge source="API" timestamp={new Date(fetchedAt).toLocaleTimeString()} />
                <Badge className="bg-white/10 text-white/50 text-[9px] border-white/10">{data._meta?.endpointCount || data._meta?.endpoints?.length || 1} endpoints</Badge>
              </div>
            </div>
          )}

          {/* Identity */}
          <Card className="bg-white/[0.05] backdrop-blur-sm border-white/[0.08] -mt-16 relative z-10 mx-4 rounded-xl shadow-lg shadow-black/10">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 -mt-12">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-20 h-20 rounded-xl object-cover border-4 border-[hsl(220,60%,10%)] shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-accent/20 flex items-center justify-center text-white text-2xl font-bold border-4 border-[hsl(220,60%,10%)] shadow-lg">{profile.name?.charAt(0) || "?"}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                    {profile.isVerified && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"><Star className="h-3 w-3 mr-1" /> Verified</Badge>}
                    {profile.isActive && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Active</Badge>}
                    {topPercentage !== undefined && topPercentage !== null && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"><Crown className="h-3 w-3 mr-1" /> Top {topPercentage}%</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm text-white/60 font-medium">@{profile.username}</span>
                    <button onClick={() => copyField("Username", profile.username)} className="hover:scale-110 transition-transform"><Copy className="h-3.5 w-3.5 text-white/50 hover:text-white/70" /></button>
                  </div>
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-white/60 flex-wrap">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(profile.joinDate)}</span>
                    <span>{derived.days}d active</span>
                    {modelStartDate && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Monetizing since {formatDate(modelStartDate)}</span>}
                    {profile.location && <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{profile.location}</span>}
                  </div>
                </div>
                <a href={`https://onlyfans.com/${profile.username}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-white/50 hover:text-white gap-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> View</Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Data availability */}
          <div className="flex flex-wrap gap-2 px-4">
            {[
              { label: "Profile", available: true },
              { label: "Account ID", available: hasAccountAccess },
              { label: "Earnings", available: hasEarningsData },
              { label: "Subscribers", available: hasSubStats },
              { label: "Visitors", available: hasVisitorData },
              { label: "Fans", available: hasFansData },
              { label: "Transactions", available: hasTransactions },
              { label: "Chargebacks", available: hasChargebacks },
              { label: "Content", available: hasContent },
              { label: "Messaging", available: hasMessaging },
              { label: "Links", available: hasLinks },
            ].map((d) => (
              <Badge key={d.label} variant="outline" className={`text-xs px-2.5 py-1 ${d.available ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-white/40 border-white/[0.1] bg-white/[0.03]"}`}>
                {d.available ? "✓" : "✗"} {d.label}
              </Badge>
            ))}
            {hasAccountAccess && data._meta?.accountId && (
              <Badge variant="outline" className="text-xs text-accent/60 border-accent/20 bg-accent/5 px-2.5 py-1">{data._meta.accountId}</Badge>
            )}
          </div>

          {/* Main tabs */}
          <Tabs value={lookupSubTab} onValueChange={handleLookupSubTab} className="space-y-4">
            <TabsList className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.1] p-1.5 rounded-xl flex-wrap h-auto gap-1">
              {[
                { value: "overview", icon: BarChart3, label: "Overview" },
                { value: "revenue", icon: DollarSign, label: "Revenue" },
                { value: "audience", icon: Users, label: "Audience" },
                { value: "fans", icon: Heart, label: "Fans" },
                { value: "content", icon: Layers, label: "Content" },
                { value: "engagement", icon: Activity, label: "Engagement" },
                { value: "traffic", icon: Eye, label: "Traffic" },
                { value: "messaging", icon: MessageSquare, label: "Messaging" },
                { value: "links", icon: Link2, label: "Links" },
                { value: "chargebacks", icon: AlertTriangle, label: "Chargebacks" },
                { value: "highlights", icon: Zap, label: "Highlights" },
                { value: "bio", icon: FileText, label: "Bio & Strategy" },
                { value: "ai", icon: Sparkles, label: "AI Analysis" },
                { value: "raw", icon: Shield, label: "Raw Data" },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-sm text-white/50 hover:text-white/70 rounded-lg gap-1.5 text-xs font-medium px-3 py-2 transition-all">
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ===== OVERVIEW ===== */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Subscribe Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} icon={DollarSign} color="text-emerald-400" source="API" />
                <MetricCard label="Subscribers" value={profile.subscribersCount ?? "Hidden"} icon={Users} color="text-blue-400" source="API" />
                <MetricCard label="Favorited" value={profile.favoritedCount || 0} icon={Heart} color="text-pink-400" source="API" />
                <MetricCard label="Total Media" value={profile.mediasCount || 0} icon={Image} color="text-violet-400" source="API" />
                <MetricCard label="Posts" value={profile.postsCount || 0} icon={FileText} color="text-cyan-400" source="API" />
                <MetricCard label="Streams" value={profile.finishedStreamsCount || 0} icon={Video} color="text-amber-400" source="API" />
              </div>

              {topPercentage !== undefined && topPercentage !== null && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Top Percentage" value={`Top ${topPercentage}%`} icon={Crown} color="text-amber-400" source="API" />
                  {modelStartDate && <MetricCard label="Monetizing Since" value={formatDate(modelStartDate)} icon={Clock} color="text-blue-400" source="API" />}
                  {payoutBalances?.available !== undefined && <MetricCard label="Available Balance" value={fmt$(payoutBalances.available)} icon={DollarSign} color="text-emerald-400" source="API" />}
                  {payoutBalances?.pending !== undefined && <MetricCard label="Pending Balance" value={fmt$(payoutBalances.pending)} icon={Clock} color="text-amber-400" source="API" />}
                </div>
              )}

              {hasEarningsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Net Earnings (30d)" value={earnings?.total?.total ? fmt$(earnings.total.total) : "N/A"} icon={DollarSign} color="text-emerald-400" source="API" delta={earnings?.total?.delta} />
                  <MetricCard label="Gross Earnings (30d)" value={earnings?.total?.gross ? fmt$(earnings.total.gross) : "N/A"} icon={TrendingUp} color="text-blue-400" source="API" />
                  {subscriberMetrics?.total !== undefined && <MetricCard label="Total Subs (Metrics)" value={subscriberMetrics.total} icon={Users} color="text-violet-400" source="API" />}
                  {subscriberMetrics?.new !== undefined && <MetricCard label="New Subs (30d)" value={subscriberMetrics.new} icon={UserCheck} color="text-cyan-400" source="API" />}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard title="Performance Radar" icon={BarChart3} badge="Derived">
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={performanceRadar}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="hsl(152, 70%, 50%)" fill="hsl(152, 70%, 50%)" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Content Mix" icon={Layers}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie data={contentMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {contentMixData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </SectionCard>
              </div>

              {/* Profile Features */}
              <SectionCard title="Profile Features" icon={Star}>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Tips", active: profile.tipsEnabled, detail: profile.tipsEnabled ? `$${profile.tipsMin}-$${profile.tipsMax}` : null },
                    { label: "Pinned Posts", active: profile.hasPinnedPosts },
                    { label: "Stories", active: profile.hasStories },
                    { label: "Streams", active: !!profile.hasStream },
                    { label: "Links", active: !!profile.hasLinks },
                    { label: "Show Subs", active: !!profile.showSubscribersCount },
                    { label: "Can Earn", active: !!profile.canEarn },
                    { label: "Promo", active: !!profile.hasProfilePromotion },
                  ].map(f => (
                    <Badge key={f.label} variant="outline" className={`text-xs px-2.5 py-1 ${f.active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-white/45 border-white/[0.1] bg-white/[0.03]"}`}>
                      {f.label}{f.detail ? `: ${f.detail}` : ""}
                    </Badge>
                  ))}
                </div>
              </SectionCard>

              {profile.subscribeBundles?.length > 0 && (
                <SectionCard title="Subscription Bundles" icon={Layers}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {profile.subscribeBundles.map((b: any) => (
                      <div key={b.id || b.duration} className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08] text-center">
                        <p className="text-lg font-bold text-white">{b.duration} mo</p>
                        <p className="text-xs text-emerald-400">{b.discount}% off</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Notification counts */}
              {notificationCounts && (
                <SectionCard title="Notification Overview" icon={Bell} badge="API">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(notificationCounts).filter(([_, v]) => typeof v === "number").map(([key, val]) => (
                      <MetricCard key={key} label={key.replace(/_/g, " ")} value={val as number} icon={Bell} color="text-violet-400" source="API" />
                    ))}
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            {/* ===== REVENUE ===== */}
            <TabsContent value="revenue" className="space-y-4">
              {hasEarningsData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="Net Earnings (30d)" value={earnings?.total?.total ? fmt$(earnings.total.total) : "N/A"} icon={DollarSign} color="text-emerald-400" source="API" delta={earnings?.total?.delta} />
                    <MetricCard label="Gross Earnings (30d)" value={earnings?.total?.gross ? fmt$(earnings.total.gross) : "N/A"} icon={TrendingUp} color="text-blue-400" source="API" />
                    {yearlyEarnings?.total?.total && <MetricCard label="Yearly Net" value={fmt$(yearlyEarnings.total.total)} icon={BarChart3} color="text-violet-400" source="API" delta={yearlyEarnings?.total?.delta} />}
                    {yearlyEarnings?.total?.gross && <MetricCard label="Yearly Gross" value={fmt$(yearlyEarnings.total.gross)} icon={Star} color="text-amber-400" source="API" />}
                  </div>

                  {/* Payout balances */}
                  {payoutBalances && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {payoutBalances.available !== undefined && <MetricCard label="Available Balance" value={fmt$(payoutBalances.available)} icon={DollarSign} color="text-emerald-400" source="API" />}
                      {payoutBalances.pending !== undefined && <MetricCard label="Pending Balance" value={fmt$(payoutBalances.pending)} icon={Clock} color="text-amber-400" source="API" />}
                      {payoutBalances.minimumPayout !== undefined && <MetricCard label="Min Payout" value={fmt$(payoutBalances.minimumPayout)} icon={Target} color="text-blue-400" source="API" />}
                      {chargebackRatio?.ratio !== undefined && <MetricCard label="Chargeback Ratio" value={`${chargebackRatio.ratio}%`} icon={AlertTriangle} color={chargebackRatio.ratio > 1 ? "text-red-400" : "text-emerald-400"} source="API" />}
                    </div>
                  )}

                  {earningsChartData.length > 0 && (
                    <SectionCard title="Daily Earnings (30d)" icon={BarChart3} badge="API">
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={earningsChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                          <Area type="monotone" dataKey="amount" stroke="hsl(152, 70%, 50%)" fill="hsl(152, 70%, 50%)" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </SectionCard>
                  )}

                  {earningsByTypeChart.length > 0 && (
                    <SectionCard title="Revenue by Source" icon={BarChart3} badge="API">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={earningsByTypeChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>{earningsByTypeChart.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </SectionCard>
                  )}

                  {yearlyChartData.length > 0 && (
                    <SectionCard title="12-Month Revenue Trend" icon={TrendingUp} badge="API">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={yearlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                          <Line type="monotone" dataKey="amount" stroke="hsl(220, 70%, 60%)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </SectionCard>
                  )}

                  {/* Transactions table */}
                  {transactions && Array.isArray(transactions) && transactions.length > 0 && (
                    <SectionCard title={`Recent Transactions (${transactions.length})`} icon={DollarSign} badge="API">
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {transactions.slice(0, 30).map((tx: any, i: number) => (
                          <div key={tx.id || i} className="flex items-center gap-3 bg-white/[0.06] rounded-lg p-2.5 border border-white/[0.08] hover:bg-white/[0.09] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/70 truncate">{tx.description || tx.type || "Transaction"}</p>
                              <p className="text-xs text-white/50">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}</p>
                            </div>
                            <span className={`text-xs font-medium ${(tx.amount || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt$(tx.amount || tx.net || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : (
                <NoAccountAccessBanner feature="Revenue and earnings data" />
              )}
            </TabsContent>

            {/* ===== AUDIENCE ===== */}
            <TabsContent value="audience" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Subscribers" value={profile.subscribersCount ?? "Hidden"} icon={Users} color="text-blue-400" source="API" />
                {subscriberMetrics?.total !== undefined && <MetricCard label="Total (Metrics)" value={subscriberMetrics.total} icon={Users} color="text-violet-400" source="API" />}
                {subscriberMetrics?.new !== undefined && <MetricCard label="New (30d)" value={subscriberMetrics.new} icon={UserCheck} color="text-emerald-400" source="API" />}
                {subscriberMetrics?.renewed !== undefined && <MetricCard label="Renewed (30d)" value={subscriberMetrics.renewed} icon={RefreshCw} color="text-cyan-400" source="API" />}
              </div>

              {subscriberMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {subscriberMetrics.paid !== undefined && <MetricCard label="Paid Subs" value={subscriberMetrics.paid} icon={DollarSign} color="text-emerald-400" source="API" />}
                  {subscriberMetrics.free !== undefined && <MetricCard label="Free Subs" value={subscriberMetrics.free} icon={Users} color="text-blue-400" source="API" />}
                  {subscriberMetrics.expired !== undefined && <MetricCard label="Expired" value={subscriberMetrics.expired} icon={UserX} color="text-red-400" source="API" />}
                  {subscriberMetrics.unknown_subscriptions !== undefined && <MetricCard label="Deleted Accounts" value={subscriberMetrics.unknown_subscriptions} icon={UserX} color="text-white/50" source="API" />}
                </div>
              )}

              {subscriberChartData.length > 0 && (
                <SectionCard title="Subscriber Activity (30d)" icon={Users} badge="API">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={subscriberChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="subs" stroke="hsl(220, 70%, 60%)" fill="hsl(220, 70%, 60%)" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </SectionCard>
              )}

              {/* New vs Renew stats */}
              {(subscriberStatsNew || subscriberStatsRenew) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {subscriberStatsNew && (
                    <SectionCard title="New Subscribers" icon={UserCheck} badge="API">
                      <div className="space-y-2">
                        {subscriberStatsNew.total !== undefined && <MetricCard label="New Sub Earnings" value={fmt$(subscriberStatsNew.total)} icon={DollarSign} color="text-emerald-400" source="API" delta={subscriberStatsNew.delta} />}
                      </div>
                    </SectionCard>
                  )}
                  {subscriberStatsRenew && (
                    <SectionCard title="Renewed Subscribers" icon={RefreshCw} badge="API">
                      <div className="space-y-2">
                        {subscriberStatsRenew.total !== undefined && <MetricCard label="Renew Earnings" value={fmt$(subscriberStatsRenew.total)} icon={DollarSign} color="text-cyan-400" source="API" delta={subscriberStatsRenew.delta} />}
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}

              {expiredFans && Array.isArray(expiredFans) && expiredFans.length > 0 && (
                <FanTable fans={expiredFans} title={`Expired Fans (${expiredFans.length})`} />
              )}
            </TabsContent>

            {/* ===== FANS ===== */}
            <TabsContent value="fans" className="space-y-4">
              {hasFansData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {latestFans && <MetricCard label="Latest Fans (30d)" value={Array.isArray(latestFans) ? latestFans.length : 0} icon={Users} color="text-blue-400" source="API" />}
                    {latestFansNew && <MetricCard label="New Fans (30d)" value={Array.isArray(latestFansNew) ? latestFansNew.length : 0} icon={UserCheck} color="text-emerald-400" source="API" />}
                    {latestFansRenew && <MetricCard label="Renewed (30d)" value={Array.isArray(latestFansRenew) ? latestFansRenew.length : 0} icon={RefreshCw} color="text-cyan-400" source="API" />}
                  </div>

                  {topFansTotal && Array.isArray(topFansTotal) && topFansTotal.length > 0 && <FanTable fans={topFansTotal} title="Top Fans by Total Spending" />}
                  {topFansTips && Array.isArray(topFansTips) && topFansTips.length > 0 && <FanTable fans={topFansTips} title="Top Fans by Tips" />}
                  {topFansMessages && Array.isArray(topFansMessages) && topFansMessages.length > 0 && <FanTable fans={topFansMessages} title="Top Fans by Messages" />}
                  {activeFans && Array.isArray(activeFans) && activeFans.length > 0 && <FanTable fans={activeFans} title={`Active Fans (${activeFans.length})`} />}
                  {latestFansNew && Array.isArray(latestFansNew) && latestFansNew.length > 0 && <FanTable fans={latestFansNew} title="Newly Subscribed Fans" />}
                </>
              ) : (
                <NoAccountAccessBanner feature="Fan data (active, expired, top fans)" />
              )}
            </TabsContent>

            {/* ===== CONTENT ===== */}
            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Photos" value={profile.photosCount || 0} icon={Image} color="text-emerald-400" source="API" />
                <MetricCard label="Videos" value={profile.videosCount || 0} icon={Video} color="text-blue-400" source="API" />
                <MetricCard label="Posts" value={profile.postsCount || 0} icon={FileText} color="text-violet-400" source="API" />
                <MetricCard label="Posts/Day" value={derived.postFreqPerDay.toFixed(2)} icon={Activity} color="text-cyan-400" source="Derived" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard title="Content Distribution" icon={Layers}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie data={contentMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {contentMixData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Content Strategy" icon={Target}>
                  <div className="space-y-3">
                    {[
                      { label: "Type Focus", value: derived.photoRatio > derived.videoRatio ? "Photo-heavy" : "Video-first", detail: `${derived.photoRatio.toFixed(0)}% photos / ${derived.videoRatio.toFixed(0)}% videos` },
                      { label: "Posting Cadence", value: derived.postFreqPerDay >= 2 ? "High Volume" : derived.postFreqPerDay >= 0.5 ? "Consistent" : "Moderate", detail: `~${derived.postFreqPerWeek.toFixed(1)} posts/week` },
                      { label: "Content Density", value: (profile.mediasCount || 0) > (profile.postsCount || 0) ? "Multi-media" : "Single-media", detail: `${((profile.mediasCount || 0) / Math.max(profile.postsCount || 1, 1)).toFixed(1)} media/post` },
                    ].map(s => (
                      <div key={s.label} className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08]">
                        <p className="text-xs text-white/50 mb-1">{s.label}</p>
                        <p className="text-sm text-white/80 font-medium">{s.value}</p>
                        <p className="text-xs text-white/50 mt-0.5">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* Stories & Highlights */}
              {(stories || storyHighlights) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {stories && Array.isArray(stories) && (
                    <SectionCard title={`Active Stories (${stories.length})`} icon={Video} badge="API">
                      {stories.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {stories.map((s: any, i: number) => (
                            <div key={s.id || i} className="bg-white/[0.06] rounded-lg p-2.5 border border-white/[0.08] text-sm text-white/70">
                              Story #{i + 1} {s.createdAt && `• ${new Date(s.createdAt).toLocaleString()}`}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-white/50">No active stories</p>}
                    </SectionCard>
                  )}
                  {storyHighlights && Array.isArray(storyHighlights) && (
                    <SectionCard title={`Story Highlights (${storyHighlights.length})`} icon={Star} badge="API">
                      {storyHighlights.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {storyHighlights.map((h: any, i: number) => (
                            <div key={h.id || i} className="bg-white/[0.06] rounded-lg p-2.5 border border-white/[0.08] text-sm text-white/70">
                              {h.title || h.name || `Highlight #${i + 1}`} {h.storiesCount !== undefined && `• ${h.storiesCount} stories`}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-white/50">No highlights</p>}
                    </SectionCard>
                  )}
                </div>
              )}

              {/* Queue */}
              {queueCounts && (
                <SectionCard title="Content Queue" icon={Clock} badge="API">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(queueCounts).filter(([_, v]) => typeof v === "number").map(([key, val]) => (
                      <MetricCard key={key} label={key.replace(/_/g, " ")} value={val as number} icon={Clock} color="text-violet-400" source="API" />
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Vault */}
              {vaultMedia && (
                <SectionCard title={`Vault Media (${Array.isArray(vaultMedia) ? vaultMedia.length : 0} items)`} icon={Image} badge="API">
                  {vaultLists && Array.isArray(vaultLists) && vaultLists.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {vaultLists.map((l: any, i: number) => (
                        <Badge key={l.id || i} variant="outline" className="text-xs text-white/50 border-white/[0.1] px-2.5 py-1">
                          {l.name || `List ${i + 1}`} {l.mediaCount !== undefined && `(${l.mediaCount})`}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-white/40">{Array.isArray(vaultMedia) ? vaultMedia.length : 0} media items in vault</p>
                </SectionCard>
              )}

              {/* Promotions */}
              {promotions && Array.isArray(promotions) && promotions.length > 0 && (
                <SectionCard title={`Promotions (${promotions.length})`} icon={Zap} badge="API">
                  <div className="space-y-2">
                    {promotions.map((p: any, i: number) => (
                      <div key={p.id || i} className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08] flex items-center gap-3 hover:bg-white/[0.09] transition-colors">
                        <div className="flex-1">
                          <p className="text-sm text-white/70">{p.type || "Promotion"} — {p.discount || p.amount || "?"}% off</p>
                          <p className="text-xs text-white/50">{p.startDate || ""} → {p.endDate || ""}</p>
                        </div>
                        {p.status && <Badge variant="outline" className="text-xs">{p.status}</Badge>}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            {/* ===== ENGAGEMENT ===== */}
            <TabsContent value="engagement" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Engagement Rate" value={derived.engagementRate.toFixed(1)} icon={Activity} color="text-emerald-400" source="Derived" subtext="Favorites / Posts" />
                <MetricCard label="Likes/Post" value={derived.likesPerPost.toFixed(1)} icon={Heart} color="text-pink-400" source="Derived" />
                <MetricCard label="Total Favorites" value={profile.favoritedCount || 0} icon={Star} color="text-amber-400" source="API" />
                <MetricCard label="Sub:Fav Ratio" value={derived.subscriberToFavRatio.toFixed(2)} icon={Users} color="text-blue-400" source="Derived" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard title="Engagement Indicators" icon={Activity}>
                  <div className="space-y-4">
                    {[
                      { label: "Audience Engagement", value: derived.engagementRate, max: 500, interpretation: derived.engagementRate > 100 ? "Exceptional" : derived.engagementRate > 30 ? "Strong" : "Average", color: derived.engagementRate > 30 ? "bg-emerald-400" : "bg-amber-400" },
                      { label: "Content Consistency", value: derived.postFreqPerDay * 33, max: 100, interpretation: derived.postFreqPerDay >= 1 ? "Very Active" : derived.postFreqPerDay >= 0.3 ? "Regular" : "Infrequent", color: derived.postFreqPerDay >= 0.3 ? "bg-emerald-400" : "bg-amber-400" },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/40">{item.label}</span>
                          <span className="text-xs text-white/60">{item.interpretation}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
                <SectionCard title="Performance Score" icon={BarChart3}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={performanceRadar}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="hsl(280, 60%, 55%)" fill="hsl(280, 60%, 55%)" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </SectionCard>
              </div>
            </TabsContent>

            {/* ===== TRAFFIC ===== */}
            <TabsContent value="traffic" className="space-y-4">
              {hasVisitorData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(profileVisitors?.total !== undefined) && <MetricCard label="Total Visitors (30d)" value={profileVisitors.total} icon={Eye} color="text-blue-400" source="API" delta={profileVisitors.delta} />}
                    {statisticsVisitors?.total !== undefined && <MetricCard label="Stats Visitors" value={statisticsVisitors.total} icon={Eye} color="text-violet-400" source="API" />}
                    {profile.subscribersCount && profileVisitors?.total && <MetricCard label="Visit-to-Sub Rate" value={`${((profile.subscribersCount / profileVisitors.total) * 100).toFixed(2)}%`} icon={Target} color="text-emerald-400" source="Derived" />}
                  </div>
                  {visitorChartData.length > 0 && (
                    <SectionCard title="Profile Visitors (30d)" icon={Eye} badge="API">
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={visitorChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                          <Area type="monotone" dataKey="visitors" stroke="hsl(220, 70%, 60%)" fill="hsl(220, 70%, 60%)" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </SectionCard>
                  )}
                </>
              ) : (
                <NoAccountAccessBanner feature="Visitor and traffic analytics" />
              )}

              {/* Traffic signals from public data */}
              <SectionCard title="Traffic Signal Analysis" icon={Zap}>
                <div className="space-y-2">
                  {[
                    profile.website && { signal: "External Website", detail: profile.website, strength: "Strong" },
                    profile.hasLinks && { signal: "Profile Links Active", detail: "Cross-platform traffic funnel", strength: "Strong" },
                    bioAnalysis?.hasLinks && { signal: "Links in Bio", detail: "Bio contains clickable links", strength: "Medium" },
                    bioAnalysis?.hasCTA && { signal: "Call-to-Action in Bio", detail: "Uses conversion language", strength: "Strong" },
                    (profile.subscribersCount || 0) > 10000 && { signal: "High Sub Base", detail: "Strong external traffic indicator", strength: "Strong" },
                    profile.hasStories && { signal: "Uses Stories", detail: "Engagement feature for retention", strength: "Medium" },
                    socialMediaButtons && Array.isArray(socialMediaButtons) && socialMediaButtons.length > 0 && { signal: `${socialMediaButtons.length} Social Links`, detail: socialMediaButtons.map((b: any) => b.type || b.label).join(", "), strength: "Strong" },
                  ].filter(Boolean).map((s: any, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/[0.06] rounded-lg p-2.5 border border-white/[0.08]">
                      <div className="flex-1">
                        <p className="text-xs text-white/60 font-medium">{s.signal}</p>
                        <p className="text-xs text-white/50">{s.detail}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${s.strength === "Strong" ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}>{s.strength}</Badge>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </TabsContent>

            {/* ===== MESSAGING ===== */}
            <TabsContent value="messaging" className="space-y-4">
              {hasMessaging ? (
                <>
                  {massMessagingOverview && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {massMessagingOverview.sentCount !== undefined && <MetricCard label="Mass Msgs Sent" value={massMessagingOverview.sentCount} icon={MessageSquare} color="text-blue-400" source="API" />}
                      {massMessagingOverview.viewCount !== undefined && <MetricCard label="Mass Msgs Viewed" value={massMessagingOverview.viewCount} icon={Eye} color="text-violet-400" source="API" />}
                      {massMessagingOverview.sentCount > 0 && massMessagingOverview.viewCount !== undefined && (
                        <MetricCard label="View Rate" value={`${((massMessagingOverview.viewCount / massMessagingOverview.sentCount) * 100).toFixed(1)}%`} icon={Percent} color="text-emerald-400" source="Derived" />
                      )}
                    </div>
                  )}

                  {topMessage && (
                    <SectionCard title="Top Performing Message" icon={Award} badge="API">
                      <div className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08]">
                        <p className="text-xs text-white/60">{topMessage.text || topMessage.content || "PPV/Locked message"}</p>
                        {topMessage.purchases !== undefined && <p className="text-xs text-emerald-400 mt-1">{topMessage.purchases} purchases • {fmt$(topMessage.revenue || topMessage.purchaseAmount)}</p>}
                      </div>
                    </SectionCard>
                  )}

                  {chats && Array.isArray(chats) && chats.length > 0 && (
                    <SectionCard title={`Recent Chats (${chats.length})`} icon={MessageSquare} badge="API">
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {chats.slice(0, 20).map((chat: any, i: number) => (
                          <div key={chat.id || i} className="flex items-center gap-3 bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.06] hover:bg-white/[0.07] transition-colors">
                            {chat.avatar && <img src={chat.avatar} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/70 truncate font-medium">{chat.name || chat.username || `Chat #${i + 1}`}</p>
                              {chat.lastMessage && <p className="text-xs text-white/50 truncate">{chat.lastMessage}</p>}
                            </div>
                            {chat.unreadCount > 0 && <Badge className="bg-accent/20 text-accent text-xs">{chat.unreadCount}</Badge>}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {directMessages && Array.isArray(directMessages) && directMessages.length > 0 && (
                    <SectionCard title={`Direct Messages (${directMessages.length})`} icon={MessageSquare} badge="API">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {directMessages.slice(0, 15).map((dm: any, i: number) => (
                          <div key={dm.id || i} className="bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.06] flex items-center gap-3 hover:bg-white/[0.07] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/60 truncate">{dm.text || "PPV Message"}</p>
                            </div>
                            {dm.purchaseAmount !== undefined && <span className="text-xs font-medium text-emerald-400">{fmt$(dm.purchaseAmount)}</span>}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : (
                <NoAccountAccessBanner feature="Messaging data (chats, mass messages, DMs)" />
              )}
            </TabsContent>

            {/* ===== LINKS ===== */}
            <TabsContent value="links" className="space-y-4">
              {hasLinks ? (
                <>
                  {trackingLinks && Array.isArray(trackingLinks) && trackingLinks.length > 0 && (
                    <SectionCard title={`Tracking Links (${trackingLinks.length})`} icon={Link2} badge="API">
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {trackingLinks.map((link: any, i: number) => (
                          <div key={link.id || i} className="flex items-center gap-3 bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.06] hover:bg-white/[0.07] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/70 truncate font-medium">{link.name || link.code || `Link #${i + 1}`}</p>
                              {link.url && <p className="text-xs text-white/35 truncate">{link.url}</p>}
                            </div>
                            {link.clicks !== undefined && <span className="text-xs text-white/45">{link.clicks} clicks</span>}
                            {link.subscribers !== undefined && <span className="text-xs text-blue-400">{link.subscribers} subs</span>}
                            {link.revenue !== undefined && <span className="text-xs font-medium text-emerald-400">{fmt$(link.revenue)}</span>}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {trialLinks && Array.isArray(trialLinks) && trialLinks.length > 0 && (
                    <SectionCard title={`Free Trial Links (${trialLinks.length})`} icon={Zap} badge="API">
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {trialLinks.map((link: any, i: number) => (
                          <div key={link.id || i} className="flex items-center gap-3 bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.06] hover:bg-white/[0.07] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/70 truncate font-medium">{link.name || link.code || `Trial #${i + 1}`}</p>
                              {link.duration && <p className="text-xs text-white/35">{link.duration} days</p>}
                            </div>
                            {link.claimsCount !== undefined && <span className="text-xs text-blue-400">{link.claimsCount} claimed</span>}
                            {link.subscribersCount !== undefined && <span className="text-xs text-violet-400">{link.subscribersCount} subs</span>}
                            {link.revenue !== undefined && <span className="text-xs font-medium text-emerald-400">{fmt$(link.revenue)}</span>}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : (
                <NoAccountAccessBanner feature="Tracking and trial link data" />
              )}
            </TabsContent>

            {/* ===== CHARGEBACKS ===== */}
            <TabsContent value="chargebacks" className="space-y-4">
              {hasChargebacks ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {chargebackRatio?.ratio !== undefined && (
                      <MetricCard
                        label="Chargeback Ratio"
                        value={`${chargebackRatio.ratio}%`}
                        icon={AlertTriangle}
                        color={chargebackRatio.ratio > 1 ? "text-red-400" : "text-emerald-400"}
                        source="API"
                        subtext={chargebackRatio.ratio > 1 ? "⚠️ Above 1% threshold" : "✓ Healthy"}
                      />
                    )}
                    {chargebackRatio?.count !== undefined && <MetricCard label="Chargeback Count" value={chargebackRatio.count} icon={Hash} color="text-amber-400" source="API" />}
                    {chargebackRatio?.amount !== undefined && <MetricCard label="Chargeback Amount" value={fmt$(chargebackRatio.amount)} icon={DollarSign} color="text-red-400" source="API" />}
                  </div>

                  {chargebacks && Array.isArray(chargebacks) && chargebacks.length > 0 && (
                    <SectionCard title={`Chargebacks (${chargebacks.length})`} icon={AlertTriangle} badge="API">
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {chargebacks.map((cb: any, i: number) => (
                          <div key={cb.id || i} className="flex items-center gap-3 bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.06] hover:bg-white/[0.07] transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/70">{cb.type || cb.reason || "Chargeback"}</p>
                              <p className="text-xs text-white/35">{cb.createdAt ? new Date(cb.createdAt).toLocaleString() : ""}</p>
                            </div>
                            <span className="text-sm font-medium text-red-400">{fmt$(cb.amount || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : (
                <NoAccountAccessBanner feature="Chargeback data" />
              )}
            </TabsContent>

            {/* ===== HIGHLIGHTS ===== */}
            <TabsContent value="highlights" className="space-y-4">
              <Card className="bg-white/[0.05] backdrop-blur-sm border-white/[0.1]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-400 flex items-center gap-2"><Zap className="h-4 w-4" /> Conversion Drivers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    profile.subscribePrice === 0 && { title: "Free Subscription Model", detail: "Removes barrier to entry, maximizes top-of-funnel. Revenue driven by PPV and tips.", impact: "HIGH" },
                    profile.subscribePrice > 0 && profile.subscribePrice < 10 && { title: `Low Price ($${profile.subscribePrice})`, detail: "Accessible pricing encourages impulse subscriptions.", impact: "HIGH" },
                    profile.subscribePrice >= 10 && { title: `Premium Pricing ($${profile.subscribePrice})`, detail: "Higher ARPU per subscriber.", impact: "MEDIUM" },
                    profile.subscribeBundles?.length > 0 && { title: `${profile.subscribeBundles.length} Bundle Offers`, detail: "Multi-month discounts increase LTV and reduce churn.", impact: "HIGH" },
                    profile.tipsEnabled && { title: "Tips Enabled", detail: `Range $${profile.tipsMin}-$${profile.tipsMax}`, impact: "MEDIUM" },
                    topPercentage !== undefined && topPercentage <= 5 && { title: `Top ${topPercentage}% Creator`, detail: "Elite ranking drives organic discovery and trust.", impact: "HIGH" },
                    (profile.favoritedCount || 0) > 10000 && { title: `${(profile.favoritedCount || 0).toLocaleString()} Favorites`, detail: "Strong social proof drives conversion.", impact: "HIGH" },
                    profile.isVerified && { title: "Verified Badge", detail: "Trust and legitimacy boost.", impact: "MEDIUM" },
                    derived.postFreqPerDay >= 0.5 && { title: `Consistent Posting (${derived.postFreqPerDay.toFixed(1)}/day)`, detail: "Keeps subscribers engaged, reduces churn.", impact: "HIGH" },
                    profile.hasPinnedPosts && { title: "Pinned Posts", detail: "First impression optimization for new visitors.", impact: "MEDIUM" },
                    profile.hasStories && { title: "Uses Stories", detail: "Creates urgency and FOMO.", impact: "MEDIUM" },
                    bioAnalysis?.hasCTA && { title: "Bio Has CTA", detail: "Active conversion language.", impact: "HIGH" },
                    profile.hasLinks && { title: "Profile Links", detail: "Cross-platform traffic funnel.", impact: "HIGH" },
                    (profile.mediasCount || 0) > 500 && { title: `Large Library (${(profile.mediasCount || 0).toLocaleString()})`, detail: "Perceived value for new subscribers.", impact: "MEDIUM" },
                    profile.finishedStreamsCount > 0 && { title: `Live Streams (${profile.finishedStreamsCount})`, detail: "Parasocial connection drives tips.", impact: "MEDIUM" },
                    promotions && Array.isArray(promotions) && promotions.length > 0 && { title: `${promotions.length} Active Promotions`, detail: "Discounts drive subscriber acquisition.", impact: "HIGH" },
                    trackingLinks && Array.isArray(trackingLinks) && trackingLinks.length > 0 && { title: `${trackingLinks.length} Tracking Links`, detail: "Attribution-ready marketing funnels.", impact: "HIGH" },
                    trialLinks && Array.isArray(trialLinks) && trialLinks.length > 0 && { title: `${trialLinks.length} Free Trial Links`, detail: "Low-friction acquisition strategy.", impact: "HIGH" },
                    massMessagingOverview?.sentCount > 0 && { title: "Active Mass Messaging", detail: `${massMessagingOverview.sentCount} messages sent, PPV revenue driver.`, impact: "HIGH" },
                    topMessage && { title: "Top PPV Message Performing", detail: `${topMessage.purchases || 0} purchases generating revenue.`, impact: "HIGH" },
                    chargebackRatio?.ratio !== undefined && chargebackRatio.ratio < 1 && { title: "Low Chargeback Ratio", detail: `${chargebackRatio.ratio}%, healthy payment profile.`, impact: "MEDIUM" },
                  ].filter(Boolean).map((item: any, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/[0.07] rounded-xl p-4 border border-white/[0.1]">
                      <Zap className={`h-4 w-4 mt-0.5 shrink-0 ${item.impact === "HIGH" ? "text-emerald-400" : "text-amber-400"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-semibold">{item.title}</p>
                          <Badge className={`text-xs ${item.impact === "HIGH" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>{item.impact}</Badge>
                        </div>
                        <p className="text-sm text-white/60 mt-1">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Replicable Strategies */}
              <Card className="bg-white/[0.05] backdrop-blur-sm border-white/[0.1]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-400 flex items-center gap-2"><Copy className="h-4 w-4" /> Replicable Strategies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    `Pricing: ${profile.subscribePrice === 0 ? "Free model + PPV/tips" : `$${profile.subscribePrice}/mo`}${profile.subscribeBundles?.length ? ` + ${profile.subscribeBundles.length} bundles` : ""}`,
                    `Content Mix: ${derived.photoRatio.toFixed(0)}% photos / ${derived.videoRatio.toFixed(0)}% videos`,
                    `Posting: ~${derived.postFreqPerWeek.toFixed(1)} posts/week`,
                    `Engagement: ${derived.likesPerPost.toFixed(1)} avg likes/post`,
                    profile.tipsEnabled ? `Tips: $${profile.tipsMin}-$${profile.tipsMax}` : "Tips disabled",
                    profile.hasPinnedPosts ? "Uses pinned posts" : "No pinned posts (opportunity)",
                    bioAnalysis ? `Bio: ${bioAnalysis.wordCount} words, ${bioAnalysis.hasCTA ? "has CTA" : "no CTA"}, ${bioAnalysis.hasEmojis ? "emojis" : "no emojis"}` : "",
                    topPercentage !== undefined ? `Ranking: Top ${topPercentage}%` : "",
                    massMessagingOverview?.sentCount ? `Mass messaging active (${massMessagingOverview.sentCount} sent)` : "",
                    trackingLinks && Array.isArray(trackingLinks) ? `${trackingLinks.length} tracking links for attribution` : "",
                  ].filter(Boolean).map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-white/[0.07] rounded-xl p-3 border border-white/[0.1]">
                      <span className="text-blue-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-white/70">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== BIO & STRATEGY ===== */}
            <TabsContent value="bio" className="space-y-4">
              <SectionCard title="Full Bio" icon={FileText} badge="API">
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="ghost" onClick={() => copyField("Bio", preserveFormatting(profile.about))} className="text-white/40 hover:text-white h-7 text-xs gap-1.5"><Copy className="h-3.5 w-3.5" /> Copy</Button>
                </div>
                <div className={`${bioExpanded ? "" : "max-h-48 overflow-hidden"} relative`}>
                  <pre className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-sans">{preserveFormatting(profile.about) || "No bio available"}</pre>
                  {!bioExpanded && profile.about?.length > 200 && <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[hsl(220,60%,10%)] to-transparent" />}
                </div>
                {profile.about?.length > 200 && (
                  <Button variant="ghost" size="sm" onClick={() => setBioExpanded(!bioExpanded)} className="text-white/40 hover:text-white mt-3 text-xs gap-1.5">
                    {bioExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {bioExpanded ? "Collapse" : "Expand Full Bio"}
                  </Button>
                )}
              </SectionCard>

              {bioAnalysis && (
                <SectionCard title="Bio Intelligence" icon={Sparkles}>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08] text-center">
                      <p className="text-lg font-bold text-white/90">{bioAnalysis.wordCount}</p>
                      <p className="text-xs text-white/45">Words</p>
                    </div>
                    <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08] text-center">
                      <p className="text-lg font-bold text-white/90">{bioAnalysis.sections.length}</p>
                      <p className="text-xs text-white/45">Sections</p>
                    </div>
                    {[
                      { label: "Emojis", active: bioAnalysis.hasEmojis },
                      { label: "CTA", active: bioAnalysis.hasCTA },
                      { label: "Links", active: bioAnalysis.hasLinks },
                    ].map(f => (
                      <div key={f.label} className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08] text-center">
                        <p className={`text-lg font-bold ${f.active ? "text-emerald-400" : "text-white/40"}`}>{f.active ? "✓" : "✗"}</p>
                        <p className="text-xs text-white/45">{f.label}</p>
                      </div>
                    ))}
                  </div>
                  {bioAnalysis.topKeywords.length > 0 && (
                    <div>
                      <p className="text-sm text-white/50 mb-2 font-medium">Top Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {bioAnalysis.topKeywords.map(([word, count]) => (
                          <Badge key={word} variant="outline" className="text-xs text-white/50 border-white/[0.1] px-2.5 py-1">{word} ({count})</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>
              )}

              <SectionCard title="Pricing Strategy" icon={DollarSign}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Base Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} icon={DollarSign} color="text-emerald-400" source="API" />
                  <MetricCard label="Tier" value={profile.subscribePrice === 0 ? "Free" : profile.subscribePrice < 10 ? "Budget" : profile.subscribePrice < 25 ? "Mid" : "Premium"} icon={Layers} color="text-violet-400" source="Derived" />
                  <MetricCard label="Tips" value={profile.tipsEnabled ? `$${profile.tipsMin}-$${profile.tipsMax}` : "Disabled"} icon={Heart} color="text-pink-400" source="API" />
                  <MetricCard label="Bundles" value={profile.subscribeBundles?.length || 0} icon={Target} color="text-blue-400" source="API" />
                </div>
              </SectionCard>

              {/* Social Media Buttons */}
              {socialMediaButtons && Array.isArray(socialMediaButtons) && socialMediaButtons.length > 0 && (
                <SectionCard title="Social Media Links" icon={Globe} badge="API">
                  <div className="space-y-1.5">
                    {socialMediaButtons.map((btn: any, i: number) => (
                      <div key={btn.id || i} className="flex items-center gap-3 bg-white/[0.03] rounded p-2 border border-white/[0.05]">
                        <span className="text-xs text-white/60 capitalize">{btn.type || btn.label || "Link"}</span>
                        {btn.url && <span className="text-[10px] text-accent/60 truncate flex-1">{btn.url}</span>}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            {/* ===== AI ANALYSIS ===== */}
            <TabsContent value="ai" className="space-y-4">
              <Card className="bg-white/[0.05] backdrop-blur-sm border-white/[0.1]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-violet-400 flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Intelligence Analysis</CardTitle>
                    <Button onClick={runAiAnalysis} disabled={aiLoading} size="sm" className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 gap-1.5 text-xs">
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {aiLoading ? "Analyzing..." : aiAnalysis ? "Re-analyze" : "Run AI Analysis"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!aiAnalysis && !aiLoading && (
                    <div className="text-center py-8">
                      <Sparkles className="h-8 w-8 text-violet-400/40 mx-auto mb-3" />
                      <p className="text-sm text-white/60">Click "Run AI Analysis" for comprehensive strategic analysis</p>
                      <p className="text-xs text-white/45 mt-1">Covers: conversion drivers, revenue optimization, content strategy, management recommendations</p>
                    </div>
                  )}
                  {(aiAnalysis || aiLoading) && (
                    <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
                        return <span key={i}>{part}</span>;
                      })}
                      {aiLoading && <span className="inline-block w-2 h-4 bg-violet-400/50 animate-pulse ml-1" />}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== RAW DATA ===== */}
            <TabsContent value="raw" className="space-y-4">
              <SectionCard title="Complete API Response" icon={Shield} badge="API">
                <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-[600px]">
                  <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>

          {/* Export bar */}
          <Card className="bg-white/[0.04] border-white/[0.08]">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={exportJSON} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"><Download className="h-3 w-3" /> Export JSON</Button>
                <Button size="sm" variant="ghost" onClick={exportCSV} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"><Download className="h-3 w-3" /> Export CSV</Button>
                <Button size="sm" variant="ghost" onClick={() => copyField("Profile URL", `https://onlyfans.com/${profile.username}`)} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"><Copy className="h-3 w-3" /> Copy URL</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  const text = [
                    `${profile.name} (@${profile.username})`,
                    `Price: ${profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`}`,
                    topPercentage !== undefined ? `Ranking: Top ${topPercentage}%` : "",
                    `Subscribers: ${profile.subscribersCount ?? "Hidden"}`,
                    `Media: ${profile.mediasCount} | Posts: ${profile.postsCount}`,
                    `Favorited: ${(profile.favoritedCount || 0).toLocaleString()}`,
                    `Engagement: ${derived.likesPerPost.toFixed(1)} likes/post`,
                    `Posting: ${derived.postFreqPerDay.toFixed(2)} posts/day`,
                    `Joined: ${formatDate(profile.joinDate)} (${derived.days} days)`,
                    hasEarningsData && earnings?.total?.total ? `Earnings (30d Net): ${fmt$(earnings.total.total)}` : "",
                    chargebackRatio?.ratio !== undefined ? `Chargeback Ratio: ${chargebackRatio.ratio}%` : "",
                  ].filter(Boolean).join("\n");
                  copyField("Full Summary", text);
                }} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"><Copy className="h-3 w-3" /> Copy Summary</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!profile && !loading && (
        <div className="text-center py-20 text-white/40">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-base font-medium">Search for a creator to access their full profile intelligence</p>
          <p className="text-sm mt-2 text-white/50">Queries 60+ endpoints: profile, earnings, subscribers, fans, chargebacks, stories, vault, links, settings & more</p>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;

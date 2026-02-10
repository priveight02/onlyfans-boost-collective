import { useState, useMemo } from "react";
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
  RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend,
} from "recharts";

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
  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] group relative">
    <div className="flex items-start justify-between">
      <Icon className={`h-4 w-4 ${color} mb-1.5`} />
      {source && (
        <span className="text-[8px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{source}</span>
      )}
    </div>
    <div className="flex items-end gap-1.5">
      <p className="text-lg font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {delta !== undefined && delta !== null && (
        <span className={`text-[10px] flex items-center gap-0.5 mb-0.5 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-[10px] text-white/30">{label}</p>
    {subtext && <p className="text-[9px] text-white/20 mt-0.5">{subtext}</p>}
  </div>
);

const DataSourceBadge = ({ source, timestamp }: { source: string; timestamp?: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-1.5 h-1.5 rounded-full ${source === "API" ? "bg-emerald-400" : source === "Derived" ? "bg-amber-400" : "bg-blue-400"}`} />
    <span className="text-[9px] text-white/25">{source}</span>
    {timestamp && <span className="text-[8px] text-white/15">• {timestamp}</span>}
  </div>
);

const ProfileLookup = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [fetchedAt, setFetchedAt] = useState("");
  const [bioExpanded, setBioExpanded] = useState(false);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const profile = data?.profile;
  const earnings = data?.earnings;
  const earningsByType = data?.earningsByType;
  const subscriberStats = data?.subscriberStats;
  const subscriberMetrics = data?.subscriberMetrics;
  const visitors = data?.visitors;
  const statistics = data?.statistics;
  const yearlyEarnings = data?.yearlyEarnings;

  const hasEarningsData = !!earnings || !!earningsByType;
  const hasSubStats = !!subscriberStats;
  const hasVisitorData = !!visitors;
  const hasStatsOverview = !!statistics;

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
        toast.success(`Profile loaded • ${result._meta?.endpoints?.length || 1} endpoints queried`);
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
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ profileData: data }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown" }));
        toast.error(err.error || "AI analysis failed");
        setAiLoading(false);
        return;
      }

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
            if (content) {
              fullText += content;
              setAiAnalysis(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("AI analysis error");
    } finally { setAiLoading(false); }
  };

  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
  const preserveFormatting = (html: string) => {
    if (!html) return "";
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
  };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A";
  const daysSinceJoin = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Derived metrics
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

  // Chart data from API earnings
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
    if (!visitors?.chart) return [];
    return visitors.chart.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      visitors: item.count || 0,
    }));
  }, [visitors]);

  const earningsByTypeChart = useMemo(() => {
    if (!earningsByType) return [];
    return Object.entries(earningsByType).map(([type, data]: [string, any], i) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data?.total?.total || data?.total?.gross || 0,
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

  // Bio analysis
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
      ["Photos", String(profile.photosCount || 0), "API"],
      ["Videos", String(profile.videosCount || 0), "API"],
      ["Posts", String(profile.postsCount || 0), "API"],
      ["Engagement Rate", derived.engagementRate.toFixed(2), "Derived"],
      ["Posts/Day", derived.postFreqPerDay.toFixed(2), "Derived"],
      ["Days Active", String(derived.days), "Derived"],
      ...(earnings?.total?.total ? [["Total Earnings (Net)", `$${earnings.total.total}`, "API"]] : []),
      ...(earnings?.total?.gross ? [["Total Earnings (Gross)", `$${earnings.total.gross}`, "API"]] : []),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${profile.username}-intel-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url); toast.success("Exported CSV");
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Enter username (e.g. madison420ivy)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupProfile()}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent"
          />
        </div>
        <Button onClick={lookupProfile} disabled={loading || !username.trim()} className="bg-accent hover:bg-accent/80 text-white gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Scanning..." : "Lookup"}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent/50 mb-3" />
          <p className="text-sm text-white/30">Querying multiple API endpoints...</p>
          <p className="text-xs text-white/15 mt-1">Profile • Earnings • Subscribers • Visitors • Statistics</p>
        </div>
      )}

      {profile && derived && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Hero */}
          {profile.header && (
            <div className="relative rounded-xl overflow-hidden h-44">
              <img src={profile.header} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,60%,10%)] via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <DataSourceBadge source="API" timestamp={new Date(fetchedAt).toLocaleTimeString()} />
                <Badge className="bg-white/10 text-white/50 text-[9px] border-white/10">
                  {data._meta?.endpoints?.length || 1} endpoints
                </Badge>
              </div>
            </div>
          )}

          {/* Identity */}
          <Card className="bg-white/[0.04] border-white/[0.08] -mt-16 relative z-10 mx-4">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 -mt-12">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-20 h-20 rounded-xl object-cover border-4 border-[hsl(220,60%,10%)]" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-accent/20 flex items-center justify-center text-white text-2xl font-bold border-4 border-[hsl(220,60%,10%)]">
                      {profile.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                    {profile.isVerified && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]"><Star className="h-3 w-3 mr-1" /> Verified</Badge>}
                    {profile.isActive && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>}
                    {profile.ofapi_gender && <Badge variant="outline" className="text-[10px] text-white/30 border-white/10 capitalize">{profile.ofapi_gender} ({Math.round(profile.ofapi_gender_confidence * 100)}%)</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-white/40">@{profile.username}</span>
                    <button onClick={() => copyField("Username", profile.username)}><Copy className="h-3 w-3 text-white/20 hover:text-white/50" /></button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(profile.joinDate)}</span>
                    <span>{derived.days}d active</span>
                    {profile.location && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{profile.location}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={`https://onlyfans.com/${profile.username}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-white/40 hover:text-white gap-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> View</Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data availability indicators */}
          <div className="flex flex-wrap gap-2 px-4">
            {[
              { label: "Profile", available: true },
              { label: "Earnings", available: hasEarningsData },
              { label: "Subscribers", available: hasSubStats },
              { label: "Visitors", available: hasVisitorData },
              { label: "Statistics", available: hasStatsOverview },
            ].map((d) => (
              <Badge key={d.label} variant="outline" className={`text-[10px] ${d.available ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-white/15 border-white/5"}`}>
                {d.available ? "✓" : "✗"} {d.label}
              </Badge>
            ))}
          </div>

          {/* Main tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap">
              {[
                { value: "overview", icon: BarChart3, label: "Overview" },
                { value: "revenue", icon: DollarSign, label: "Revenue" },
                { value: "audience", icon: Users, label: "Audience" },
                { value: "content", icon: Layers, label: "Content" },
                { value: "engagement", icon: Activity, label: "Engagement" },
                { value: "traffic", icon: Eye, label: "Traffic" },
                { value: "highlights", icon: Zap, label: "Highlights" },
                { value: "bio", icon: FileText, label: "Bio & Strategy" },
                { value: "ai", icon: Sparkles, label: "AI Analysis" },
                { value: "raw", icon: Shield, label: "Raw Data" },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Subscribe Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} icon={DollarSign} color="text-emerald-400" source="API" />
                <MetricCard label="Subscribers" value={profile.subscribersCount ?? "Hidden"} icon={Users} color="text-blue-400" source="API" />
                <MetricCard label="Favorited" value={profile.favoritedCount || 0} icon={Heart} color="text-pink-400" source="API" />
                <MetricCard label="Total Media" value={profile.mediasCount || 0} icon={Image} color="text-violet-400" source="API" />
                <MetricCard label="Posts" value={profile.postsCount || 0} icon={FileText} color="text-cyan-400" source="API" />
                <MetricCard label="Streams" value={profile.finishedStreamsCount || 0} icon={Video} color="text-amber-400" source="API" />
              </div>

              {/* API earnings summary if available */}
              {hasEarningsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Total Earnings (Net)" value={earnings?.total?.total ? `$${Number(earnings.total.total).toLocaleString()}` : "N/A"} icon={DollarSign} color="text-emerald-400" source="API" delta={earnings?.total?.delta} />
                  <MetricCard label="Total Earnings (Gross)" value={earnings?.total?.gross ? `$${Number(earnings.total.gross).toLocaleString()}` : "N/A"} icon={TrendingUp} color="text-blue-400" source="API" />
                  {hasSubStats && <MetricCard label="Sub Earnings" value={subscriberStats?.total ? `$${Number(subscriberStats.total).toLocaleString()}` : "N/A"} icon={Users} color="text-violet-400" source="API" delta={subscriberStats?.delta} />}
                  {hasStatsOverview && statistics?.earning && <MetricCard label="Stats Earnings" value={`$${Number(statistics.earning.total || 0).toLocaleString()}`} icon={Star} color="text-amber-400" source="API" delta={statistics.earning.delta} />}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Performance Radar</CardTitle>
                      <DataSourceBadge source="Derived" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={performanceRadar}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke="hsl(152, 70%, 50%)" fill="hsl(152, 70%, 50%)" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Content Mix</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie data={contentMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {contentMixData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Features */}
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Profile Features</CardTitle></CardHeader>
                <CardContent>
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
                      <Badge key={f.label} variant="outline" className={`text-[10px] ${f.active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-white/20 border-white/5"}`}>
                        {f.label}{f.detail ? `: ${f.detail}` : ""}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {profile.subscribeBundles?.length > 0 && (
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Subscription Bundles</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {profile.subscribeBundles.map((b: any) => (
                        <div key={b.id || b.duration} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
                          <p className="text-lg font-bold text-white">{b.duration} mo</p>
                          <p className="text-xs text-emerald-400">{b.discount}% off</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* REVENUE */}
            <TabsContent value="revenue" className="space-y-4">
              {hasEarningsData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="Net Earnings (30d)" value={earnings?.total?.total ? `$${Number(earnings.total.total).toLocaleString()}` : "N/A"} icon={DollarSign} color="text-emerald-400" source="API" delta={earnings?.total?.delta} />
                    <MetricCard label="Gross Earnings (30d)" value={earnings?.total?.gross ? `$${Number(earnings.total.gross).toLocaleString()}` : "N/A"} icon={TrendingUp} color="text-blue-400" source="API" />
                    {yearlyEarnings?.total?.total && <MetricCard label="Yearly Net" value={`$${Number(yearlyEarnings.total.total).toLocaleString()}`} icon={BarChart3} color="text-violet-400" source="API" delta={yearlyEarnings?.total?.delta} />}
                    {yearlyEarnings?.total?.gross && <MetricCard label="Yearly Gross" value={`$${Number(yearlyEarnings.total.gross).toLocaleString()}`} icon={Star} color="text-amber-400" source="API" />}
                  </div>

                  {/* Daily earnings chart */}
                  {earningsChartData.length > 0 && (
                    <Card className="bg-white/[0.04] border-white/[0.08]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white/70">Daily Earnings (30d)</CardTitle>
                          <DataSourceBadge source="API" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={earningsChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                            <Area type="monotone" dataKey="amount" stroke="hsl(152, 70%, 50%)" fill="hsl(152, 70%, 50%)" fillOpacity={0.15} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Revenue by type */}
                  {earningsByTypeChart.length > 0 && (
                    <Card className="bg-white/[0.04] border-white/[0.08]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white/70">Revenue by Source</CardTitle>
                          <DataSourceBadge source="API" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={earningsByTypeChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {earningsByTypeChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Yearly trend */}
                  {yearlyChartData.length > 0 && (
                    <Card className="bg-white/[0.04] border-white/[0.08]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white/70">12-Month Revenue Trend</CardTitle>
                          <DataSourceBadge source="API" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={yearlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                            <Line type="monotone" dataKey="amount" stroke="hsl(220, 70%, 60%)" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                  <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-amber-300 font-medium">Earnings data not available for this profile</p>
                    <p className="text-xs text-amber-300/60 mt-1">The earnings/statistics endpoints require account-level access (account ID). This profile may not be linked to your API account. Only profiles you manage will return financial data.</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* AUDIENCE */}
            <TabsContent value="audience" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Subscribers" value={profile.subscribersCount ?? "Hidden"} icon={Users} color="text-blue-400" source="API" />
                <MetricCard label="Favorited" value={profile.favoritedCount || 0} icon={Heart} color="text-pink-400" source="API" />
                {hasSubStats && <MetricCard label="Sub Trend" value={subscriberStats?.subscribers ?? "N/A"} icon={TrendingUp} color="text-emerald-400" source="API" delta={subscriberStats?.delta} />}
                <MetricCard label="Fav/Sub Ratio" value={derived.subscriberToFavRatio.toFixed(2)} icon={Target} color="text-violet-400" source="Derived" />
              </div>

              {/* Subscriber chart */}
              {subscriberChartData.length > 0 && (
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Daily New Subscribers (30d)</CardTitle>
                      <DataSourceBadge source="API" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={subscriberChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                        <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="subs" fill="hsl(220, 70%, 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Subscriber metrics */}
              {subscriberMetrics && (
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Subscriber Metrics (30d)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {Object.entries(subscriberMetrics).filter(([k]) => !k.startsWith("_")).map(([key, val]: [string, any]) => (
                        <div key={key} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
                          <p className="text-lg font-bold text-white">{typeof val === "number" ? val.toLocaleString() : JSON.stringify(val)}</p>
                          <p className="text-[10px] text-white/30 capitalize">{key.replace(/_/g, " ")}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!hasSubStats && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                  <Users className="h-8 w-8 text-white/15 mx-auto mb-2" />
                  <p className="text-sm text-white/30">Detailed subscriber analytics require account-level API access</p>
                </div>
              )}
            </TabsContent>

            {/* CONTENT */}
            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Total Media" value={profile.mediasCount || 0} icon={Image} color="text-violet-400" source="API" />
                <MetricCard label="Photos" value={profile.photosCount || 0} icon={Image} color="text-blue-400" source="API" subtext={`${derived.photoRatio.toFixed(1)}%`} />
                <MetricCard label="Videos" value={profile.videosCount || 0} icon={Video} color="text-amber-400" source="API" subtext={`${derived.videoRatio.toFixed(1)}%`} />
                <MetricCard label="Posts" value={profile.postsCount || 0} icon={FileText} color="text-cyan-400" source="API" />
                <MetricCard label="Posts/Day" value={derived.postFreqPerDay.toFixed(2)} icon={Activity} color="text-emerald-400" source="Derived" />
                <MetricCard label="Media/Post" value={(profile.postsCount || 0) > 0 ? ((profile.mediasCount || 0) / profile.postsCount).toFixed(1) : "0"} icon={Layers} color="text-pink-400" source="Derived" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Content Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie data={contentMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {contentMixData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Content Strategy</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Type Focus", value: derived.photoRatio > derived.videoRatio ? "Photo-heavy" : derived.videoRatio > derived.photoRatio ? "Video-first" : "Balanced", detail: `${derived.photoRatio.toFixed(0)}% photos / ${derived.videoRatio.toFixed(0)}% videos` },
                      { label: "Posting Cadence", value: derived.postFreqPerDay >= 2 ? "High Volume" : derived.postFreqPerDay >= 0.5 ? "Consistent" : derived.postFreqPerDay >= 0.14 ? "Moderate" : "Low Volume", detail: `~${derived.postFreqPerWeek.toFixed(1)} posts/week` },
                      { label: "Content Density", value: (profile.mediasCount || 0) > (profile.postsCount || 0) ? "Multi-media" : "Single-media", detail: `${((profile.mediasCount || 0) / Math.max(profile.postsCount || 1, 1)).toFixed(1)} media/post` },
                    ].map(s => (
                      <div key={s.label} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                        <p className="text-xs text-white/40">{s.label}</p>
                        <p className="text-sm text-white/70 font-medium">{s.value}</p>
                        <p className="text-[10px] text-white/25">{s.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ENGAGEMENT */}
            <TabsContent value="engagement" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Engagement Rate" value={derived.engagementRate.toFixed(1)} icon={Activity} color="text-emerald-400" source="Derived" subtext="Favorites / Posts" />
                <MetricCard label="Likes/Post" value={derived.likesPerPost.toFixed(1)} icon={Heart} color="text-pink-400" source="Derived" />
                <MetricCard label="Total Favorites" value={profile.favoritedCount || 0} icon={Star} color="text-amber-400" source="API" />
                <MetricCard label="Sub:Fav Ratio" value={derived.subscriberToFavRatio.toFixed(2)} icon={Users} color="text-blue-400" source="Derived" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Engagement Indicators</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Audience Engagement", value: derived.engagementRate, max: 500, interpretation: derived.engagementRate > 100 ? "Exceptional" : derived.engagementRate > 30 ? "Strong" : derived.engagementRate > 10 ? "Average" : "Low", color: derived.engagementRate > 30 ? "bg-emerald-400" : derived.engagementRate > 10 ? "bg-amber-400" : "bg-red-400" },
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
                  </CardContent>
                </Card>
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Performance Score</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={performanceRadar}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke="hsl(280, 60%, 55%)" fill="hsl(280, 60%, 55%)" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TRAFFIC */}
            <TabsContent value="traffic" className="space-y-4">
              {hasVisitorData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {visitors.total !== undefined && <MetricCard label="Total Visitors (30d)" value={visitors.total} icon={Eye} color="text-blue-400" source="API" delta={visitors.delta} />}
                    {profile.subscribersCount && visitors.total && <MetricCard label="Visit-to-Sub Rate" value={`${((profile.subscribersCount / visitors.total) * 100).toFixed(2)}%`} icon={Target} color="text-emerald-400" source="Derived" />}
                    {profile.website && <MetricCard label="Has Website" value="Yes" icon={Globe} color="text-violet-400" source="API" subtext={profile.website} />}
                  </div>
                  {visitorChartData.length > 0 && (
                    <Card className="bg-white/[0.04] border-white/[0.08]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white/70">Profile Visitors (30d)</CardTitle>
                          <DataSourceBadge source="API" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={visitorChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                            <Area type="monotone" dataKey="visitors" stroke="hsl(220, 70%, 60%)" fill="hsl(220, 70%, 60%)" fillOpacity={0.15} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-amber-300 font-medium">Visitor data requires account-level access</p>
                      <p className="text-xs text-amber-300/60 mt-1">Traffic analytics are only available for profiles linked to your API account.</p>
                    </div>
                  </div>
                  {/* Show what we can derive about traffic */}
                  <Card className="bg-white/[0.04] border-white/[0.08]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Traffic Signal Analysis (from public data)</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        profile.website && { signal: "External Website", detail: profile.website, strength: "Strong", icon: Globe },
                        profile.hasLinks && { signal: "Profile Links Active", detail: "Cross-platform traffic funnel active", strength: "Strong", icon: ExternalLink },
                        bioAnalysis?.hasLinks && { signal: "Links in Bio", detail: "Bio contains clickable links", strength: "Medium", icon: ExternalLink },
                        bioAnalysis?.hasCTA && { signal: "Call-to-Action in Bio", detail: "Bio uses conversion language", strength: "Strong", icon: Zap },
                        (profile.subscribersCount || 0) > 10000 && { signal: "High Subscriber Base", detail: "Indicates strong external traffic", strength: "Strong", icon: Users },
                        (profile.favoritedCount || 0) > 50000 && { signal: "High Favorites", detail: "Platform algorithm boost likely", strength: "Medium", icon: Heart },
                        profile.hasStories && { signal: "Uses Stories", detail: "Active engagement feature for retention", strength: "Medium", icon: Video },
                      ].filter(Boolean).map((s: any, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                          <s.icon className="h-4 w-4 text-accent/60 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-white/60 font-medium">{s.signal}</p>
                            <p className="text-[10px] text-white/25">{s.detail}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${s.strength === "Strong" ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}>
                            {s.strength}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* HIGHLIGHTS */}
            <TabsContent value="highlights" className="space-y-4">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-400 flex items-center gap-2"><Zap className="h-4 w-4" /> Conversion Drivers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    profile.subscribePrice === 0 && { title: "Free Subscription Model", detail: "Removes barrier to entry — maximizes top-of-funnel. Revenue likely driven by PPV and tips.", impact: "HIGH" },
                    profile.subscribePrice > 0 && profile.subscribePrice < 10 && { title: `Low Price Point ($${profile.subscribePrice})`, detail: "Accessible pricing encourages impulse subscriptions.", impact: "HIGH" },
                    profile.subscribePrice >= 10 && { title: `Premium Pricing ($${profile.subscribePrice})`, detail: "Higher ARPU per subscriber. Works with strong content value prop.", impact: "MEDIUM" },
                    profile.subscribeBundles?.length > 0 && { title: `${profile.subscribeBundles.length} Bundle Offers`, detail: "Discounted multi-month bundles increase LTV and reduce churn.", impact: "HIGH" },
                    profile.tipsEnabled && { title: "Tips Enabled", detail: `Tip range $${profile.tipsMin}-$${profile.tipsMax} — additional revenue stream beyond subscriptions.`, impact: "MEDIUM" },
                    (profile.favoritedCount || 0) > 10000 && { title: `High Favorited Count (${(profile.favoritedCount || 0).toLocaleString()})`, detail: "Strong social proof drives new subscriber conversion.", impact: "HIGH" },
                    profile.isVerified && { title: "Verified Badge", detail: "Builds trust and legitimacy — increases conversion rate.", impact: "MEDIUM" },
                    derived.postFreqPerDay >= 0.5 && { title: `Consistent Posting (${derived.postFreqPerDay.toFixed(1)}/day)`, detail: "Regular content keeps subscribers engaged and reduces churn.", impact: "HIGH" },
                    profile.hasPinnedPosts && { title: "Pinned Posts Active", detail: "First impression optimization — showcases best content to new visitors.", impact: "MEDIUM" },
                    profile.hasStories && { title: "Uses Stories", detail: "Stories create urgency and FOMO — drives daily engagement.", impact: "MEDIUM" },
                    bioAnalysis?.hasCTA && { title: "Bio Has Call-to-Action", detail: "Active conversion language in bio encourages subscription.", impact: "HIGH" },
                    profile.hasLinks && { title: "Profile Links Active", detail: "Cross-platform traffic funnel drives external visitors.", impact: "HIGH" },
                    (profile.mediasCount || 0) > 500 && { title: `Large Content Library (${(profile.mediasCount || 0).toLocaleString()})`, detail: "Extensive back-catalog provides perceived value for new subscribers.", impact: "MEDIUM" },
                    profile.finishedStreamsCount > 0 && { title: `Live Streams (${profile.finishedStreamsCount})`, detail: "Live interaction builds parasocial connection and drives tips.", impact: "MEDIUM" },
                  ].filter(Boolean).map((item: any, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                      <Zap className={`h-4 w-4 mt-0.5 shrink-0 ${item.impact === "HIGH" ? "text-emerald-400" : "text-amber-400"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white/70 font-medium">{item.title}</p>
                          <Badge className={`text-[9px] ${item.impact === "HIGH" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
                            {item.impact}
                          </Badge>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* What to copy */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-400 flex items-center gap-2"><Copy className="h-4 w-4" /> Replicable Strategies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    `Pricing: ${profile.subscribePrice === 0 ? "Free model with monetization via PPV/tips" : `$${profile.subscribePrice}/mo pricing point`}${profile.subscribeBundles?.length ? ` + ${profile.subscribeBundles.length} bundle discounts` : ""}`,
                    `Content Mix: ${derived.photoRatio.toFixed(0)}% photos / ${derived.videoRatio.toFixed(0)}% videos — ${derived.photoRatio > derived.videoRatio ? "photo-dominant strategy" : "video-first approach"}`,
                    `Posting Rhythm: ~${derived.postFreqPerWeek.toFixed(1)} posts/week (${derived.postFreqPerDay >= 1 ? "daily+" : derived.postFreqPerDay >= 0.3 ? "regular" : "intermittent"} cadence)`,
                    `Engagement: ${(profile.favoritedCount || 0).toLocaleString()} favorites across ${(profile.postsCount || 0).toLocaleString()} posts = ${derived.likesPerPost.toFixed(1)} avg likes/post`,
                    profile.tipsEnabled ? `Monetization: Tips enabled ($${profile.tipsMin}-$${profile.tipsMax}) as supplementary revenue` : "Monetization: Tips disabled — purely subscription-based",
                    profile.hasPinnedPosts ? "UX: Uses pinned posts for first-impression optimization" : "UX: No pinned posts (opportunity to add)",
                    bioAnalysis ? `Bio: ${bioAnalysis.wordCount} words, ${bioAnalysis.hasEmojis ? "uses emojis" : "no emojis"}, ${bioAnalysis.hasCTA ? "has CTA" : "no CTA"}, ${bioAnalysis.hasLinks ? "includes links" : "no links"}` : "",
                  ].filter(Boolean).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                      <span className="text-blue-400 font-bold text-xs mt-0.5">{i + 1}.</span>
                      <p className="text-xs text-white/50">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* BIO & STRATEGY */}
            <TabsContent value="bio" className="space-y-4">
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white/70">Full Bio</CardTitle>
                    <div className="flex items-center gap-2">
                      <DataSourceBadge source="API" />
                      <Button size="sm" variant="ghost" onClick={() => copyField("Bio", preserveFormatting(profile.about))} className="text-white/30 hover:text-white h-6 text-xs gap-1"><Copy className="h-3 w-3" /> Copy</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`${bioExpanded ? "" : "max-h-40 overflow-hidden"} relative`}>
                    <pre className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap font-sans">{preserveFormatting(profile.about) || "No bio available"}</pre>
                    {!bioExpanded && profile.about?.length > 200 && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[hsl(220,60%,10%)] to-transparent" />}
                  </div>
                  {profile.about?.length > 200 && (
                    <Button variant="ghost" size="sm" onClick={() => setBioExpanded(!bioExpanded)} className="text-white/30 hover:text-white mt-2 text-xs gap-1">
                      {bioExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {bioExpanded ? "Collapse" : "Expand Full Bio"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {bioAnalysis && (
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Bio Intelligence</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
                        <p className="text-lg font-bold text-white">{bioAnalysis.wordCount}</p>
                        <p className="text-[10px] text-white/30">Words</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
                        <p className="text-lg font-bold text-white">{bioAnalysis.sections.length}</p>
                        <p className="text-[10px] text-white/30">Sections</p>
                      </div>
                      {[
                        { label: "Emojis", active: bioAnalysis.hasEmojis },
                        { label: "CTA", active: bioAnalysis.hasCTA },
                        { label: "Links", active: bioAnalysis.hasLinks },
                      ].map(f => (
                        <div key={f.label} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
                          <p className={`text-lg font-bold ${f.active ? "text-emerald-400" : "text-white/20"}`}>{f.active ? "✓" : "✗"}</p>
                          <p className="text-[10px] text-white/30">{f.label}</p>
                        </div>
                      ))}
                    </div>
                    {bioAnalysis.topKeywords.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-2">Top Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {bioAnalysis.topKeywords.map(([word, count]) => (
                            <Badge key={word} variant="outline" className="text-[10px] text-white/40 border-white/10">{word} ({count})</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/70">Pricing Strategy</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="Base Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} icon={DollarSign} color="text-emerald-400" source="API" />
                    <MetricCard label="Tier" value={profile.subscribePrice === 0 ? "Free" : profile.subscribePrice < 10 ? "Budget" : profile.subscribePrice < 25 ? "Mid" : "Premium"} icon={Layers} color="text-violet-400" source="Derived" />
                    <MetricCard label="Tips" value={profile.tipsEnabled ? `$${profile.tipsMin}-$${profile.tipsMax}` : "Disabled"} icon={Heart} color="text-pink-400" source="API" />
                    <MetricCard label="Bundles" value={profile.subscribeBundles?.length || 0} icon={Target} color="text-blue-400" source="API" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI ANALYSIS */}
            <TabsContent value="ai" className="space-y-4">
              <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
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
                      <Sparkles className="h-8 w-8 text-violet-400/30 mx-auto mb-3" />
                      <p className="text-sm text-white/30">Click "Run AI Analysis" to generate a comprehensive strategic analysis</p>
                      <p className="text-xs text-white/15 mt-1">Covers: conversion drivers, revenue optimization, content strategy, growth signals, replicable tactics, and management recommendations</p>
                    </div>
                  )}
                  {(aiAnalysis || aiLoading) && (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                        {aiAnalysis.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={i} className="text-white/80">{part.slice(2, -2)}</strong>;
                          }
                          if (part.startsWith("# ")) {
                            return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{part.slice(2)}</h2>;
                          }
                          if (part.startsWith("## ")) {
                            return <h3 key={i} className="text-base font-semibold text-white/80 mt-3 mb-1">{part.slice(3)}</h3>;
                          }
                          return <span key={i}>{part}</span>;
                        })}
                        {aiLoading && <span className="inline-block w-2 h-4 bg-violet-400/50 animate-pulse ml-1" />}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* RAW DATA */}
            <TabsContent value="raw" className="space-y-4">
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white/70">Complete API Response</CardTitle>
                    <DataSourceBadge source="API" timestamp={new Date(fetchedAt).toLocaleString()} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-[600px]">
                    <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                  </div>
                </CardContent>
              </Card>
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
                    `Subscribers: ${profile.subscribersCount ?? "Hidden"}`,
                    `Media: ${profile.mediasCount} | Posts: ${profile.postsCount}`,
                    `Favorited: ${(profile.favoritedCount || 0).toLocaleString()}`,
                    `Engagement: ${derived.likesPerPost.toFixed(1)} likes/post`,
                    `Posting: ${derived.postFreqPerDay.toFixed(2)} posts/day`,
                    `Joined: ${formatDate(profile.joinDate)} (${derived.days} days)`,
                    hasEarningsData && earnings?.total?.total ? `Earnings (30d Net): $${earnings.total.total}` : "",
                  ].filter(Boolean).join("\n");
                  copyField("Full Summary", text);
                }} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"><Copy className="h-3 w-3" /> Copy Summary</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!profile && !loading && (
        <div className="text-center py-16 text-white/20">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Search for a creator to access their full profile intelligence</p>
          <p className="text-xs mt-1 text-white/15">Queries profile, earnings, subscribers, visitors, and statistics endpoints</p>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;

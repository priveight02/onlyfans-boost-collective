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
  DollarSign, BarChart3, Eye, MessageSquare, Zap, Shield,
  Clock, ChevronDown, ChevronUp, Download, Info, Activity,
  Target, Layers, PieChart, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend
} from "recharts";

interface ProfileData {
  // Core identity
  id?: number;
  name: string;
  username: string;
  about: string;
  rawAbout?: string;
  avatar: string;
  header: string;
  header_size?: { width: number; height: number };
  // Audience
  subscribersCount: number | null;
  subscribePrice: number;
  favoritedCount: number;
  favoritesCount?: number;
  // Content
  mediasCount: number;
  photosCount: number;
  videosCount: number;
  postsCount: number;
  archivedPostsCount?: number;
  audiosCount?: number;
  // Status
  isVerified: boolean;
  joinDate: string;
  location: string;
  website: string;
  isActive: boolean;
  // Monetization
  tipsEnabled: boolean;
  tipsMin: number;
  tipsMax: number;
  canEarn?: boolean;
  // Streams
  finishedStreamsCount: number;
  // Features
  hasPinnedPosts: boolean;
  hasStories: boolean;
  hasStream?: boolean;
  hasLabels?: boolean;
  hasLinks?: boolean;
  // Gender
  ofapi_gender: string;
  ofapi_gender_confidence: number;
  // Bundles / promos
  subscribeBundles?: Array<{ id: number; discount: number; duration: number }>;
  promotions?: Array<{ id: number; type: string; price: number; hasExpiredDate: boolean }>;
  // Lists
  lists?: Array<{ id: string; name: string; usersCount: number }>;
  // Wishlist
  wishlist?: Array<{ id: string; name: string; price: number; url: string }>;
  // Misc from API
  canTrialSend?: boolean;
  showPostsTips?: boolean;
  showSubscribersCount?: boolean;
  canPayInternal?: boolean;
  hasProfilePromotion?: boolean;
  // Earnings (if available)
  earnings?: {
    total?: number;
    daily?: number;
    monthly?: number;
    yearly?: number;
    subscriptions?: number;
    tips?: number;
    messages?: number;
    referrals?: number;
  };
  // Any extra fields we capture
  [key: string]: any;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  source?: string;
  subtext?: string;
}

const CHART_COLORS = [
  "hsl(152, 70%, 50%)", "hsl(220, 70%, 60%)", "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)", "hsl(40, 80%, 55%)", "hsl(190, 70%, 50%)",
];

const MetricCard = ({ label, value, icon: Icon, color, source, subtext }: MetricCardProps) => (
  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] group relative">
    <div className="flex items-start justify-between">
      <Icon className={`h-4 w-4 ${color} mb-1.5`} />
      {source && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[8px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{source}</span>
        </div>
      )}
    </div>
    <p className="text-lg font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
    <p className="text-[10px] text-white/30">{label}</p>
    {subtext && <p className="text-[9px] text-white/20 mt-0.5">{subtext}</p>}
  </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon className="h-4 w-4 text-accent/70" />
    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h3>
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string>("");

  const lookupProfile = async () => {
    const clean = username.trim().replace("@", "");
    if (!clean) return;

    setLoading(true);
    setProfile(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onlyfans-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ endpoint: `/profiles/${clean}` }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to fetch profile");
        return;
      }

      if (result.data) {
        setProfile(result.data);
        setFetchedAt(new Date().toISOString());
        toast.success("Profile loaded successfully");
      } else {
        toast.error("Profile not found");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

  const preserveFormatting = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .trim();
  };

  const formatDate = (d: string) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const daysSinceJoin = (d: string) => {
    if (!d) return 0;
    return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Derived metrics
  const derived = useMemo(() => {
    if (!profile) return null;
    const days = daysSinceJoin(profile.joinDate);
    const months = Math.max(days / 30, 1);
    const totalContent = profile.mediasCount + profile.postsCount;

    const postFreqPerDay = days > 0 ? profile.postsCount / days : 0;
    const postFreqPerWeek = postFreqPerDay * 7;
    const postFreqPerMonth = postFreqPerDay * 30;

    const photoRatio = totalContent > 0 ? (profile.photosCount / totalContent) * 100 : 0;
    const videoRatio = totalContent > 0 ? (profile.videosCount / totalContent) * 100 : 0;

    const engagementRate = profile.postsCount > 0 && profile.favoritedCount
      ? (profile.favoritedCount / profile.postsCount) : 0;

    const likesPerPost = profile.postsCount > 0 ? profile.favoritedCount / profile.postsCount : 0;

    const subscriberToFavRatio = profile.subscribersCount && profile.subscribersCount > 0
      ? profile.favoritedCount / profile.subscribersCount : 0;

    // Estimated revenue (derived from public data only)
    const estMonthlyRev = profile.subscribePrice > 0 && profile.subscribersCount
      ? profile.subscribePrice * profile.subscribersCount * 0.8 // platform take ~20%
      : null;

    const estDailyRev = estMonthlyRev ? estMonthlyRev / 30 : null;
    const estYearlyRev = estMonthlyRev ? estMonthlyRev * 12 : null;

    return {
      days, months, totalContent,
      postFreqPerDay, postFreqPerWeek, postFreqPerMonth,
      photoRatio, videoRatio,
      engagementRate, likesPerPost, subscriberToFavRatio,
      estMonthlyRev, estDailyRev, estYearlyRev,
    };
  }, [profile]);

  // Chart data
  const contentMixData = useMemo(() => {
    if (!profile) return [];
    return [
      { name: "Photos", value: profile.photosCount, fill: CHART_COLORS[0] },
      { name: "Videos", value: profile.videosCount, fill: CHART_COLORS[1] },
      ...(profile.audiosCount ? [{ name: "Audio", value: profile.audiosCount, fill: CHART_COLORS[2] }] : []),
    ].filter(d => d.value > 0);
  }, [profile]);

  const performanceRadar = useMemo(() => {
    if (!profile || !derived) return [];
    const maxFav = 1000000;
    const maxMedia = 10000;
    const maxPosts = 5000;
    const maxSubs = 100000;
    return [
      { metric: "Engagement", value: Math.min((derived.engagementRate / 100) * 100, 100) },
      { metric: "Content Vol.", value: Math.min((profile.mediasCount / maxMedia) * 100, 100) },
      { metric: "Popularity", value: Math.min((profile.favoritedCount / maxFav) * 100, 100) },
      { metric: "Activity", value: Math.min((derived.postFreqPerDay / 3) * 100, 100) },
      { metric: "Audience", value: Math.min(((profile.subscribersCount || 0) / maxSubs) * 100, 100) },
    ];
  }, [profile, derived]);

  const postingFreqData = useMemo(() => {
    if (!derived) return [];
    return [
      { period: "Daily", value: parseFloat(derived.postFreqPerDay.toFixed(2)) },
      { period: "Weekly", value: parseFloat(derived.postFreqPerWeek.toFixed(1)) },
      { period: "Monthly", value: parseFloat(derived.postFreqPerMonth.toFixed(0)) },
    ];
  }, [derived]);

  const revenueBreakdownData = useMemo(() => {
    if (!profile?.earnings) {
      if (!derived?.estMonthlyRev) return [];
      return [
        { source: "Subscriptions (Est.)", value: derived.estMonthlyRev, fill: CHART_COLORS[0] },
      ];
    }
    const e = profile.earnings;
    return [
      e.subscriptions && { source: "Subscriptions", value: e.subscriptions, fill: CHART_COLORS[0] },
      e.tips && { source: "Tips", value: e.tips, fill: CHART_COLORS[1] },
      e.messages && { source: "Messages", value: e.messages, fill: CHART_COLORS[2] },
      e.referrals && { source: "Referrals", value: e.referrals, fill: CHART_COLORS[3] },
    ].filter(Boolean) as any[];
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
    if (!profile) return;
    const blob = new Blob([JSON.stringify({ profile, derived, fetchedAt }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.username}-profile-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as JSON");
  };

  const exportCSV = () => {
    if (!profile || !derived) return;
    const rows = [
      ["Metric", "Value", "Source"],
      ["Username", profile.username, "API"],
      ["Display Name", profile.name, "API"],
      ["Subscribe Price", `$${profile.subscribePrice}`, "API"],
      ["Subscribers", String(profile.subscribersCount ?? "N/A"), "API"],
      ["Favorited", String(profile.favoritedCount), "API"],
      ["Media Count", String(profile.mediasCount), "API"],
      ["Photos", String(profile.photosCount), "API"],
      ["Videos", String(profile.videosCount), "API"],
      ["Posts", String(profile.postsCount), "API"],
      ["Engagement Rate", `${derived.engagementRate.toFixed(2)}`, "Derived"],
      ["Posts/Day", derived.postFreqPerDay.toFixed(2), "Derived"],
      ["Posts/Week", derived.postFreqPerWeek.toFixed(1), "Derived"],
      ["Photo Ratio", `${derived.photoRatio.toFixed(1)}%`, "Derived"],
      ["Video Ratio", `${derived.videoRatio.toFixed(1)}%`, "Derived"],
      ["Days Active", String(derived.days), "Derived"],
      ["Join Date", profile.joinDate, "API"],
      ...(derived.estMonthlyRev ? [["Est. Monthly Revenue", `$${derived.estMonthlyRev.toFixed(0)}`, "Derived"]] : []),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.username}-profile-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as CSV");
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
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
          Lookup
        </Button>
      </div>

      {/* Profile result */}
      {profile && derived && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Hero header */}
          {profile.header && (
            <div className="relative rounded-xl overflow-hidden h-44">
              <img src={profile.header} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,60%,10%)] via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3">
                <DataSourceBadge source="API" timestamp={new Date(fetchedAt).toLocaleTimeString()} />
              </div>
            </div>
          )}

          {/* Identity card */}
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
                    {profile.isVerified && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                        <Star className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {profile.isActive && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>
                    )}
                    {profile.ofapi_gender && (
                      <Badge variant="outline" className="text-[10px] text-white/30 border-white/10 capitalize">
                        {profile.ofapi_gender} ({Math.round(profile.ofapi_gender_confidence * 100)}%)
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-white/40">@{profile.username}</span>
                    <button onClick={() => copyField("Username", profile.username)}>
                      <Copy className="h-3 w-3 text-white/20 hover:text-white/50" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(profile.joinDate)}</span>
                    <span>{derived.days} days active</span>
                    {profile.location && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{profile.location}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`https://onlyfans.com/${profile.username}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-white/40 hover:text-white gap-1.5 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main analytics tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="revenue" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                <DollarSign className="h-3.5 w-3.5" /> Revenue
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" /> Content
              </TabsTrigger>
              <TabsTrigger value="engagement" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5" /> Engagement
              </TabsTrigger>
              <TabsTrigger value="bio" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> Bio & Strategy
              </TabsTrigger>
              <TabsTrigger value="raw" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" /> Raw Data
              </TabsTrigger>
            </TabsList>

            {/* === OVERVIEW TAB === */}
            <TabsContent value="overview" className="space-y-4">
              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Subscribe Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} icon={DollarSign} color="text-emerald-400" source="API" />
                <MetricCard label="Subscribers" value={profile.subscribersCount ?? "Hidden"} icon={Users} color="text-blue-400" source="API" />
                <MetricCard label="Favorited" value={profile.favoritedCount} icon={Heart} color="text-pink-400" source="API" />
                <MetricCard label="Total Media" value={profile.mediasCount} icon={Image} color="text-violet-400" source="API" />
                <MetricCard label="Posts" value={profile.postsCount} icon={FileText} color="text-cyan-400" source="API" />
                <MetricCard label="Streams" value={profile.finishedStreamsCount} icon={Video} color="text-amber-400" source="API" />
              </div>

              {/* Performance radar */}
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
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Content Mix</CardTitle>
                      <DataSourceBadge source="API" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie data={contentMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {contentMixData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: "hsl(220,60%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Profile details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Photos" value={profile.photosCount} icon={Image} color="text-blue-400" source="API" subtext={`${derived.photoRatio.toFixed(1)}% of content`} />
                <MetricCard label="Videos" value={profile.videosCount} icon={Video} color="text-amber-400" source="API" subtext={`${derived.videoRatio.toFixed(1)}% of content`} />
                <MetricCard label="Likes/Post" value={derived.likesPerPost.toFixed(1)} icon={Heart} color="text-pink-400" source="Derived" />
                <MetricCard label="Posts/Day" value={derived.postFreqPerDay.toFixed(2)} icon={Activity} color="text-cyan-400" source="Derived" />
              </div>

              {/* Features & flags */}
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/70">Profile Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Tips Enabled", active: profile.tipsEnabled, detail: profile.tipsEnabled ? `$${profile.tipsMin}-$${profile.tipsMax}` : null },
                      { label: "Pinned Posts", active: profile.hasPinnedPosts },
                      { label: "Stories", active: profile.hasStories },
                      { label: "Streams", active: !!profile.hasStream },
                      { label: "Labels", active: !!profile.hasLabels },
                      { label: "Links", active: !!profile.hasLinks },
                      { label: "Show Subs Count", active: !!profile.showSubscribersCount },
                      { label: "Can Earn", active: !!profile.canEarn },
                      { label: "Trial Send", active: !!profile.canTrialSend },
                      { label: "Profile Promo", active: !!profile.hasProfilePromotion },
                    ].map((f) => (
                      <Badge
                        key={f.label}
                        variant="outline"
                        className={`text-[10px] ${f.active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-white/20 border-white/5"}`}
                      >
                        {f.label}{f.detail ? `: ${f.detail}` : ""}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bundles */}
              {profile.subscribeBundles && profile.subscribeBundles.length > 0 && (
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Subscription Bundles</CardTitle>
                      <DataSourceBadge source="API" />
                    </div>
                  </CardHeader>
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

            {/* === REVENUE TAB === */}
            <TabsContent value="revenue" className="space-y-4">
              {profile.earnings ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="Daily Revenue" value={`$${(profile.earnings.daily || 0).toLocaleString()}`} icon={DollarSign} color="text-emerald-400" source="API" />
                    <MetricCard label="Monthly Revenue" value={`$${(profile.earnings.monthly || 0).toLocaleString()}`} icon={TrendingUp} color="text-blue-400" source="API" />
                    <MetricCard label="Yearly Revenue" value={`$${(profile.earnings.yearly || 0).toLocaleString()}`} icon={BarChart3} color="text-violet-400" source="API" />
                    <MetricCard label="Total Earned" value={`$${(profile.earnings.total || 0).toLocaleString()}`} icon={Star} color="text-amber-400" source="API" />
                  </div>
                  {revenueBreakdownData.length > 0 && (
                    <Card className="bg-white/[0.04] border-white/[0.08]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white/70">Revenue Breakdown</CardTitle>
                          <DataSourceBadge source="API" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={revenueBreakdownData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="source" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                            <RechartsTooltip contentStyle={{ background: "hsl(220,60%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {revenueBreakdownData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
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
                      <p className="text-sm text-amber-300 font-medium">Revenue data estimated from public metrics</p>
                      <p className="text-xs text-amber-300/60 mt-1">Actual earnings data is not available via the public API. The values below are derived estimates based on subscribe price × subscriber count, assuming ~20% platform fees. These should be used as rough indicators only.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <MetricCard label="Est. Daily Revenue" value={derived.estDailyRev ? `$${derived.estDailyRev.toFixed(0)}` : "N/A"} icon={DollarSign} color="text-emerald-400" source="Derived" subtext="Price × Subs / 30 × 0.8" />
                    <MetricCard label="Est. Monthly Revenue" value={derived.estMonthlyRev ? `$${derived.estMonthlyRev.toFixed(0)}` : "N/A"} icon={TrendingUp} color="text-blue-400" source="Derived" subtext="Price × Subs × 0.8" />
                    <MetricCard label="Est. Yearly Revenue" value={derived.estYearlyRev ? `$${derived.estYearlyRev.toFixed(0)}` : "N/A"} icon={BarChart3} color="text-violet-400" source="Derived" subtext="Monthly × 12" />
                  </div>
                  {profile.subscribePrice > 0 && profile.subscribersCount && (
                    <Card className="bg-white/[0.04] border-white/[0.08]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white/70">Revenue Indicators</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <MetricCard label="ARPU (Est.)" value={`$${profile.subscribePrice}`} icon={Target} color="text-cyan-400" source="Derived" subtext="Avg. revenue per user" />
                          <MetricCard label="Subscriber Value" value={`$${(profile.subscribePrice * 0.8).toFixed(2)}`} icon={Users} color="text-pink-400" source="Derived" subtext="After platform fees" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* === CONTENT TAB === */}
            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Total Media" value={profile.mediasCount} icon={Image} color="text-violet-400" source="API" />
                <MetricCard label="Photos" value={profile.photosCount} icon={Image} color="text-blue-400" source="API" />
                <MetricCard label="Videos" value={profile.videosCount} icon={Video} color="text-amber-400" source="API" />
                <MetricCard label="Posts" value={profile.postsCount} icon={FileText} color="text-cyan-400" source="API" />
                <MetricCard label="Streams" value={profile.finishedStreamsCount} icon={Zap} color="text-pink-400" source="API" />
                <MetricCard label="Archived" value={profile.archivedPostsCount ?? "N/A"} icon={Layers} color="text-white/40" source="API" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Content mix */}
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Content Distribution</CardTitle>
                      <DataSourceBadge source="API" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie data={contentMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {contentMixData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: "hsl(220,60%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                        <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Posting frequency */}
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Posting Frequency</CardTitle>
                      <DataSourceBadge source="Derived" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={postingFreqData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                        <RechartsTooltip contentStyle={{ background: "hsl(220,60%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                        <Bar dataKey="value" fill="hsl(220, 70%, 60%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Content strategy insights */}
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/70">Content Strategy Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                      <p className="text-xs text-white/40 mb-1">Content Type Focus</p>
                      <p className="text-sm text-white/70 font-medium">
                        {derived.photoRatio > derived.videoRatio ? "Photo-heavy" : derived.videoRatio > derived.photoRatio ? "Video-first" : "Balanced"}
                      </p>
                      <p className="text-[10px] text-white/25 mt-1">
                        {derived.photoRatio.toFixed(0)}% photos / {derived.videoRatio.toFixed(0)}% videos
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                      <p className="text-xs text-white/40 mb-1">Posting Cadence</p>
                      <p className="text-sm text-white/70 font-medium">
                        {derived.postFreqPerDay >= 2 ? "High Volume" : derived.postFreqPerDay >= 0.5 ? "Consistent" : derived.postFreqPerDay >= 0.14 ? "Moderate" : "Low Volume"}
                      </p>
                      <p className="text-[10px] text-white/25 mt-1">
                        ~{derived.postFreqPerWeek.toFixed(1)} posts/week
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                      <p className="text-xs text-white/40 mb-1">Media per Post Ratio</p>
                      <p className="text-sm text-white/70 font-medium">
                        {profile.postsCount > 0 ? (profile.mediasCount / profile.postsCount).toFixed(1) : "0"} media/post
                      </p>
                      <p className="text-[10px] text-white/25 mt-1">
                        {profile.mediasCount > profile.postsCount ? "Multi-media posts" : "Single-media posts"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === ENGAGEMENT TAB === */}
            <TabsContent value="engagement" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Engagement Rate" value={`${derived.engagementRate.toFixed(1)}`} icon={Activity} color="text-emerald-400" source="Derived" subtext="Favorites / Posts" />
                <MetricCard label="Likes per Post" value={derived.likesPerPost.toFixed(1)} icon={Heart} color="text-pink-400" source="Derived" />
                <MetricCard label="Total Favorites" value={profile.favoritedCount} icon={Star} color="text-amber-400" source="API" />
                <MetricCard label="Sub:Fav Ratio" value={derived.subscriberToFavRatio.toFixed(2)} icon={Users} color="text-blue-400" source="Derived" subtext="Favorites per subscriber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white/70">Engagement Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {[
                        {
                          label: "Audience Engagement",
                          value: derived.engagementRate,
                          max: 500,
                          interpretation: derived.engagementRate > 100 ? "Exceptional" : derived.engagementRate > 30 ? "Strong" : derived.engagementRate > 10 ? "Average" : "Low",
                          color: derived.engagementRate > 30 ? "bg-emerald-400" : derived.engagementRate > 10 ? "bg-amber-400" : "bg-red-400",
                        },
                        {
                          label: "Content Consistency",
                          value: derived.postFreqPerDay * 33,
                          max: 100,
                          interpretation: derived.postFreqPerDay >= 1 ? "Very Active" : derived.postFreqPerDay >= 0.3 ? "Regular" : "Infrequent",
                          color: derived.postFreqPerDay >= 0.3 ? "bg-emerald-400" : "bg-amber-400",
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white/40">{item.label}</span>
                            <span className="text-xs text-white/60">{item.interpretation}</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white/70">Performance Score</CardTitle>
                  </CardHeader>
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

            {/* === BIO & STRATEGY TAB === */}
            <TabsContent value="bio" className="space-y-4">
              {/* Full Bio */}
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white/70">Full Bio</CardTitle>
                    <div className="flex items-center gap-2">
                      <DataSourceBadge source="API" />
                      <Button size="sm" variant="ghost" onClick={() => copyField("Bio", preserveFormatting(profile.about))} className="text-white/30 hover:text-white h-6 text-xs gap-1">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`${bioExpanded ? "" : "max-h-40 overflow-hidden"} relative`}>
                    <pre className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap font-sans">
                      {preserveFormatting(profile.about) || "No bio available"}
                    </pre>
                    {!bioExpanded && profile.about && profile.about.length > 200 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[hsl(220,60%,10%)] to-transparent" />
                    )}
                  </div>
                  {profile.about && profile.about.length > 200 && (
                    <Button variant="ghost" size="sm" onClick={() => setBioExpanded(!bioExpanded)} className="text-white/30 hover:text-white mt-2 text-xs gap-1">
                      {bioExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {bioExpanded ? "Collapse" : "Expand Full Bio"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Bio Analysis */}
              {bioAnalysis && (
                <Card className="bg-white/[0.04] border-white/[0.08]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white/70">Bio Structure Analysis</CardTitle>
                      <DataSourceBadge source="Derived" />
                    </div>
                  </CardHeader>
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
                      ].map((f) => (
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
                            <Badge key={word} variant="outline" className="text-[10px] text-white/40 border-white/10">
                              {word} ({count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strategy patterns */}
                    <div>
                      <p className="text-xs text-white/40 mb-2">Strategy Observations</p>
                      <div className="space-y-2">
                        {[
                          bioAnalysis.hasCTA && "Uses call-to-action elements — effective for conversion",
                          bioAnalysis.hasEmojis && "Includes emojis — adds personality and visual breaks",
                          bioAnalysis.hasLinks && "Contains external links — drives cross-platform traffic",
                          bioAnalysis.hasPricing && "Mentions pricing — transparent approach to monetization",
                          bioAnalysis.wordCount > 100 && "Detailed bio (100+ words) — good for SEO and discoverability",
                          bioAnalysis.wordCount < 20 && "Very short bio — may reduce discoverability",
                          bioAnalysis.sections.length > 2 && "Well-structured with multiple sections",
                        ].filter(Boolean).map((insight, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Zap className="h-3 w-3 text-accent/60 mt-0.5 shrink-0" />
                            <p className="text-xs text-white/50">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pricing Strategy */}
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/70">Pricing Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="Base Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} icon={DollarSign} color="text-emerald-400" source="API" />
                    <MetricCard label="Pricing Tier" value={profile.subscribePrice === 0 ? "Free" : profile.subscribePrice < 10 ? "Budget" : profile.subscribePrice < 25 ? "Mid" : "Premium"} icon={Layers} color="text-violet-400" source="Derived" />
                    <MetricCard label="Tips Range" value={profile.tipsEnabled ? `$${profile.tipsMin}-$${profile.tipsMax}` : "Disabled"} icon={Heart} color="text-pink-400" source="API" />
                    <MetricCard label="Bundles" value={profile.subscribeBundles?.length || 0} icon={Target} color="text-blue-400" source="API" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === RAW DATA TAB === */}
            <TabsContent value="raw" className="space-y-4">
              <Card className="bg-white/[0.04] border-white/[0.08]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-white/70">Raw API Response</CardTitle>
                    <DataSourceBadge source="API" timestamp={new Date(fetchedAt).toLocaleString()} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-[600px]">
                    <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap">
                      {JSON.stringify(profile, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Export & quick actions bar */}
          <Card className="bg-white/[0.04] border-white/[0.08]">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={exportJSON} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5">
                  <Download className="h-3 w-3" /> Export JSON
                </Button>
                <Button size="sm" variant="ghost" onClick={exportCSV} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5">
                  <Download className="h-3 w-3" /> Export CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copyField("Profile URL", `https://onlyfans.com/${profile.username}`)} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5">
                  <Copy className="h-3 w-3" /> Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const text = [
                      `${profile.name} (@${profile.username})`,
                      `Price: ${profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`}`,
                      `Subscribers: ${profile.subscribersCount ?? "Hidden"}`,
                      `Media: ${profile.mediasCount} | Posts: ${profile.postsCount}`,
                      `Photos: ${profile.photosCount} | Videos: ${profile.videosCount}`,
                      `Favorited: ${profile.favoritedCount.toLocaleString()}`,
                      `Engagement: ${derived.likesPerPost.toFixed(1)} likes/post`,
                      `Posting: ${derived.postFreqPerDay.toFixed(2)} posts/day`,
                      `Joined: ${formatDate(profile.joinDate)} (${derived.days} days)`,
                      derived.estMonthlyRev ? `Est. Monthly Rev: $${derived.estMonthlyRev.toFixed(0)}` : "",
                    ].filter(Boolean).join("\n");
                    copyField("Full Summary", text);
                  }}
                  className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"
                >
                  <Copy className="h-3 w-3" /> Copy Full Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!profile && !loading && (
        <div className="text-center py-16 text-white/20">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Search for a creator profile to view their complete analytics</p>
          <p className="text-xs mt-1 text-white/15">Enter any username to get started</p>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;

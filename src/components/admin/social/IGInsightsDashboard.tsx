import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Users, Globe, Clock, TrendingUp, RefreshCw,
  MapPin, Eye, Heart, MessageSquare, Share2, Bookmark,
  Loader2, Instagram, ArrowUp, ArrowDown, Play, Image,
  Layers, Activity, UserPlus, MousePointerClick, Link2,
  MailOpen, PieChart, Repeat, Video, FileText, Zap,
  Target, Percent, ThumbsUp, Flame, Star, Trophy,
  BarChart2, Timer, Crown, Sparkles, TrendingDown,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

type Period = "day" | "week" | "month";

const IGInsightsDashboard = ({ selectedAccount }: Props) => {
  const [period, setPeriod] = useState<Period>("day");
  const [accountMetrics, setAccountMetrics] = useState<any>(null);
  const [demographics, setDemographics] = useState<any>(null);
  const [onlineFollowers, setOnlineFollowers] = useState<any>(null);
  const [mediaInsights, setMediaInsights] = useState<any[]>([]);
  const [storyInsights, setStoryInsights] = useState<any[]>([]);
  const [reelInsights, setReelInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncIssues, setSyncIssues] = useState<string[]>([]);

  const callApi = useCallback(async (body: any) => {
    if (!selectedAccount) return null;
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { ...body, account_id: selectedAccount },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      return data.data;
    } catch (e: any) {
      console.error("IG API:", e.message);
      return null;
    }
  }, [selectedAccount]);

  const fetchAllInsights = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setSyncIssues([]);
    toast.info("Pulling real-time Instagram insights...");

    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400 * 2;
    const weekAgo = now - 86400 * 8;
    const monthAgo = now - 86400 * 32;
    const since = period === "day" ? dayAgo : period === "week" ? weekAgo : monthAgo;

    const [metrics, demo, online, stories, media] = await Promise.all([
      callApi({ action: "get_account_insights", params: { period, since, until: now } }),
      callApi({ action: "get_account_insights_demographics" }),
      callApi({ action: "get_account_insights_online_followers" }),
      callApi({ action: "get_stories" }),
      callApi({ action: "get_media", params: { limit: 25 } }),
    ]);

    if (metrics) setAccountMetrics(metrics);
    if (demo) setDemographics(demo);
    if (online) setOnlineFollowers(online);

    const nextIssues: string[] = [];
    if (Array.isArray(metrics?.missing_metrics) && metrics.missing_metrics.length)
      nextIssues.push(`Account metrics unavailable: ${metrics.missing_metrics.join(", ")}`);
    if (Array.isArray(metrics?.metric_errors) && metrics.metric_errors.length)
      nextIssues.push(...metrics.metric_errors.map((e: any) => `Metric ${e.metric}: ${e.error}`));
    if (Array.isArray(demo?.missing_metrics) && demo.missing_metrics.length)
      nextIssues.push(`Demographics unavailable: ${demo.missing_metrics.join(", ")}`);

    if (stories?.data?.length) {
      const storyResults: any[] = [];
      for (const s of stories.data.slice(0, 10)) {
        const ins = await callApi({ action: "get_story_insights", params: { media_id: s.id } });
        storyResults.push({ ...s, insights: ins?.data || [] });
      }
      setStoryInsights(storyResults);
    } else setStoryInsights([]);

    if (media?.data?.length) {
      const reels: any[] = [];
      const posts: any[] = [];
      for (const m of media.data.slice(0, 20)) {
        const isReel = m.media_type === "VIDEO";
        const action = isReel ? "get_reel_insights" : "get_media_insights";
        const ins = await callApi({ action, params: { media_id: m.id } });
        const item = { ...m, insights: ins?.data || [] };
        if (isReel) reels.push(item); else posts.push(item);
      }
      setReelInsights(reels);
      setMediaInsights(posts);
    } else { setReelInsights([]); setMediaInsights([]); }

    const onlineValues = online?.data?.[0]?.values;
    const hasOnlineHistogram = Array.isArray(onlineValues)
      ? onlineValues.some((entry: any) => entry?.value && typeof entry.value === "object" && Object.keys(entry.value).length > 0)
      : false;
    if (!hasOnlineHistogram)
      nextIssues.push("Followers-online histogram not returned by Instagram for this account yet.");

    setSyncIssues(nextIssues);
    setLastSynced(new Date().toLocaleTimeString());
    setLoading(false);

    const hasAnyCoreData = Boolean(metrics?.data?.length || demo?.data?.length || media?.data?.length || stories?.data?.length);
    if (!hasAnyCoreData) { toast.error("Instagram returned no live insights for this account/period."); return; }
    if (nextIssues.length > 0) toast.warning("Synced live data, but some fields are unavailable.");
    else toast.success("Insights synced from Instagram API.");
  }, [selectedAccount, period, callApi]);

  // Build metric lookup
  const metricsMap: Record<string, { value: number; prevValue: number }> = {};
  if (accountMetrics?.data) {
    for (const m of accountMetrics.data) {
      const vals = Array.isArray(m.values) ? m.values : [];
      const numericValues = vals.map((v: any) => (typeof v?.value === "number" ? v.value : 0));
      if (numericValues.length === 0) continue;
      const latest = numericValues[numericValues.length - 1] ?? 0;
      const prev = numericValues.length > 1 ? numericValues[numericValues.length - 2] ?? 0 : 0;
      const latestNonZero = [...numericValues].reverse().find((v) => v > 0);
      const normalizedName = m.name === "profile_links_taps" ? "website_clicks" : m.name;
      const value = latest === 0 && latestNonZero !== undefined ? latestNonZero : latest;
      const existing = metricsMap[normalizedName];
      if (!existing || value >= existing.value) metricsMap[normalizedName] = { value, prevValue: prev };
    }
  }

  const mv = (name: string) => metricsMap[name]?.value ?? 0;
  const getChange = (name: string) => {
    const m = metricsMap[name];
    if (!m || !m.prevValue) return null;
    return ((m.value - m.prevValue) / m.prevValue * 100);
  };

  // Computed insights from content
  const contentStats = useMemo(() => {
    const allMedia = [...reelInsights, ...mediaInsights];
    if (allMedia.length === 0) return null;

    const getInsight = (m: any, name: string) => {
      const ins = (m.insights || []).find((i: any) => i.name === name);
      return ins?.values?.[0]?.value ?? m[name] ?? 0;
    };

    let totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0;
    let totalReach = 0, totalPlays = 0, totalInteractions = 0;
    let bestPost: any = null, bestEngagement = 0;

    for (const m of allMedia) {
      const likes = getInsight(m, "likes") || m.like_count || 0;
      const comments = getInsight(m, "comments") || m.comments_count || 0;
      const shares = getInsight(m, "shares") || 0;
      const saves = getInsight(m, "saved") || getInsight(m, "saves") || 0;
      const reach = getInsight(m, "reach") || 0;
      const plays = getInsight(m, "ig_reels_aggregated_all_plays_count") || getInsight(m, "video_views") || 0;
      const interactions = getInsight(m, "total_interactions") || (likes + comments + shares + saves);

      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;
      totalSaves += saves;
      totalReach += reach;
      totalPlays += plays;
      totalInteractions += interactions;

      const eng = reach > 0 ? (interactions / reach) * 100 : 0;
      if (eng > bestEngagement) { bestEngagement = eng; bestPost = m; }
    }

    const avgLikes = allMedia.length > 0 ? Math.round(totalLikes / allMedia.length) : 0;
    const avgComments = allMedia.length > 0 ? Math.round(totalComments / allMedia.length) : 0;
    const avgReach = allMedia.length > 0 ? Math.round(totalReach / allMedia.length) : 0;
    const overallEngRate = totalReach > 0 ? ((totalInteractions / totalReach) * 100) : 0;
    const likeToCommentRatio = totalComments > 0 ? (totalLikes / totalComments) : 0;
    const viralityScore = totalReach > 0 ? ((totalShares / totalReach) * 100) : 0;
    const saveRate = totalReach > 0 ? ((totalSaves / totalReach) * 100) : 0;

    // Reel-specific
    const avgReelPlays = reelInsights.length > 0 ? Math.round(totalPlays / reelInsights.length) : 0;
    const reelCompletionRate = reelInsights.length > 0 ? reelInsights.reduce((sum, r) => {
      const avgWatch = getInsight(r, "ig_reels_avg_watch_time");
      return sum + (typeof avgWatch === "number" ? Math.min(avgWatch / 15 * 100, 100) : 50);
    }, 0) / reelInsights.length : 0;

    // Story-specific
    const storyExitRate = storyInsights.length > 0 ? storyInsights.reduce((sum, s) => {
      const impressions = getInsight(s, "impressions") || 1;
      const exits = getInsight(s, "exits") || 0;
      return sum + (exits / impressions) * 100;
    }, 0) / storyInsights.length : 0;
    const storyReplyRate = storyInsights.length > 0 ? storyInsights.reduce((sum, s) => {
      const reach = getInsight(s, "reach") || 1;
      const replies = getInsight(s, "replies") || 0;
      return sum + (replies / reach) * 100;
    }, 0) / storyInsights.length : 0;

    return {
      totalPosts: allMedia.length, totalReels: reelInsights.length, totalStories: storyInsights.length,
      totalLikes, totalComments, totalShares, totalSaves, totalReach, totalPlays, totalInteractions,
      avgLikes, avgComments, avgReach, overallEngRate, likeToCommentRatio, viralityScore, saveRate,
      avgReelPlays, reelCompletionRate, storyExitRate, storyReplyRate,
      bestPost, bestEngagement,
    };
  }, [reelInsights, mediaInsights, storyInsights]);

  // PRIMARY METRICS (from API)
  const PRIMARY_METRICS = [
    { key: "reach", label: "Reach", icon: Eye, color: "text-blue-400" },
    { key: "accounts_engaged", label: "Engaged", icon: Users, color: "text-emerald-400" },
    { key: "total_interactions", label: "Interactions", icon: Activity, color: "text-purple-400" },
    { key: "follower_count", label: "Followers", icon: UserPlus, color: "text-pink-400" },
    { key: "profile_views", label: "Profile Views", icon: Eye, color: "text-cyan-400" },
    { key: "website_clicks", label: "Link Clicks", icon: MousePointerClick, color: "text-amber-400" },
    { key: "likes", label: "Likes", icon: Heart, color: "text-red-400" },
    { key: "comments", label: "Comments", icon: MessageSquare, color: "text-sky-400" },
    { key: "shares", label: "Shares", icon: Share2, color: "text-green-400" },
    { key: "saves", label: "Saves", icon: Bookmark, color: "text-yellow-400" },
    { key: "replies", label: "Replies", icon: MailOpen, color: "text-violet-400" },
    { key: "impressions", label: "Impressions", icon: Layers, color: "text-indigo-400" },
  ];

  // COMPUTED RATE CARDS
  const RATE_CARDS = useMemo(() => {
    if (!contentStats && !accountMetrics?.data) return [];
    const reach = mv("reach");
    const interactions = mv("total_interactions");
    const followers = mv("follower_count");
    return [
      { label: "Engagement Rate", value: reach > 0 ? ((interactions / reach) * 100).toFixed(2) + "%" : contentStats ? contentStats.overallEngRate.toFixed(2) + "%" : "—", icon: TrendingUp, color: "text-emerald-400" },
      { label: "Save Rate", value: reach > 0 ? ((mv("saves") / reach) * 100).toFixed(2) + "%" : contentStats ? contentStats.saveRate.toFixed(2) + "%" : "—", icon: Bookmark, color: "text-yellow-400" },
      { label: "Share Rate", value: reach > 0 ? ((mv("shares") / reach) * 100).toFixed(2) + "%" : contentStats ? contentStats.viralityScore.toFixed(2) + "%" : "—", icon: Share2, color: "text-green-400" },
      { label: "Comment Rate", value: reach > 0 ? ((mv("comments") / reach) * 100).toFixed(2) + "%" : "—", icon: MessageSquare, color: "text-sky-400" },
      { label: "Profile Visit Rate", value: reach > 0 ? ((mv("profile_views") / reach) * 100).toFixed(2) + "%" : "—", icon: Eye, color: "text-cyan-400" },
      { label: "Click-Through Rate", value: mv("profile_views") > 0 ? ((mv("website_clicks") / mv("profile_views")) * 100).toFixed(2) + "%" : "—", icon: MousePointerClick, color: "text-amber-400" },
      { label: "Follower Conversion", value: reach > 0 && followers > 0 ? ((followers / reach) * 100).toFixed(2) + "%" : "—", icon: UserPlus, color: "text-pink-400" },
      { label: "Like:Comment Ratio", value: contentStats ? contentStats.likeToCommentRatio.toFixed(1) + ":1" : "—", icon: ThumbsUp, color: "text-red-400" },
    ];
  }, [accountMetrics, contentStats]);

  // CONTENT PERFORMANCE METRICS
  const CONTENT_STATS_CARDS = useMemo(() => {
    if (!contentStats) return [];
    return [
      { label: "Avg Likes/Post", value: contentStats.avgLikes.toLocaleString(), icon: Heart, color: "text-red-400" },
      { label: "Avg Comments/Post", value: contentStats.avgComments.toLocaleString(), icon: MessageSquare, color: "text-sky-400" },
      { label: "Avg Reach/Post", value: contentStats.avgReach.toLocaleString(), icon: Eye, color: "text-blue-400" },
      { label: "Total Content Reach", value: contentStats.totalReach.toLocaleString(), icon: Globe, color: "text-indigo-400" },
      { label: "Total Saves", value: contentStats.totalSaves.toLocaleString(), icon: Bookmark, color: "text-yellow-400" },
      { label: "Total Shares", value: contentStats.totalShares.toLocaleString(), icon: Share2, color: "text-green-400" },
      { label: "Virality Score", value: contentStats.viralityScore.toFixed(2) + "%", icon: Flame, color: "text-orange-400" },
      { label: "Content Eng. Rate", value: contentStats.overallEngRate.toFixed(2) + "%", icon: Target, color: "text-purple-400" },
      { label: "Avg Reel Plays", value: contentStats.avgReelPlays.toLocaleString(), icon: Play, color: "text-pink-400" },
      { label: "Reel Completion", value: contentStats.reelCompletionRate.toFixed(1) + "%", icon: Timer, color: "text-teal-400" },
      { label: "Story Exit Rate", value: contentStats.storyExitRate.toFixed(1) + "%", icon: TrendingDown, color: "text-red-400" },
      { label: "Story Reply Rate", value: contentStats.storyReplyRate.toFixed(2) + "%", icon: MailOpen, color: "text-violet-400" },
    ];
  }, [contentStats]);

  // Demographics helpers
  const getDemoValue = (metricName: string) => {
    if (!demographics?.data) return null;
    const m = demographics.data.find((d: any) => d.name === metricName);
    return m?.total_value?.breakdowns?.[0]?.results || m?.values?.[0]?.value || null;
  };

  const renderDemoBreakdown = (metricName: string) => {
    const data = getDemoValue(metricName);
    if (!data) return null;

    const items = Array.isArray(data)
      ? [...data].sort((a: any, b: any) => (b.value || 0) - (a.value || 0)).slice(0, 12).map((item: any, i: number) => ({
          label: item.dimension_values?.join(", ") || `Item ${i}`, value: item.value || 0,
        }))
      : typeof data === "object"
        ? Object.entries(data).sort(([, a]: any, [, b]: any) => b - a).slice(0, 12).map(([key, val]) => ({
            label: key, value: val as number,
          }))
        : null;

    if (!items || items.length === 0) return null;
    const max = Math.max(...items.map(d => d.value), 1);

    return (
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-24 truncate" title={item.label}>{item.label}</span>
            <div className="flex-1 bg-muted/30 rounded-full h-2.5">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-foreground w-12 text-right font-medium">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderOnlineHours = () => {
    const values = onlineFollowers?.data?.[0]?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    const latestWithData = [...values].reverse().find((v: any) => v?.value && typeof v.value === "object" && Object.keys(v.value).length > 0);
    if (!latestWithData?.value || typeof latestWithData.value !== "object") return null;
    const hourData = latestWithData.value as Record<string, number>;
    const entries = Object.entries(hourData).sort(([a], [b]) => parseInt(a) - parseInt(b));
    if (entries.length === 0) return null;
    const max = Math.max(...entries.map(([, v]) => (typeof v === "number" ? v : 0)), 1);
    const peakHour = entries.reduce((best, curr) => ((curr[1] as number) > (best[1] as number) ? curr : best), entries[0]);

    return (
      <div>
        <div className="flex items-end gap-[2px] h-24 mb-2">
          {entries.map(([hour, val]) => {
            const numericVal = typeof val === "number" ? val : 0;
            const isPeak = hour === peakHour[0];
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div className={`w-full rounded-t transition-all ${isPeak ? "bg-gradient-to-t from-amber-500 to-yellow-400" : "bg-gradient-to-t from-blue-500/80 to-cyan-400/80"}`}
                  style={{ height: `${(numericVal / max) * 100}%`, minHeight: "2px" }} />
                {parseInt(hour) % 3 === 0 && <span className="text-[7px] text-muted-foreground">{hour}h</span>}
                <div className="absolute -top-6 bg-background border border-border rounded px-1 py-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {numericVal.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">
            🔥 Peak: {peakHour[0]}:00 — {(peakHour[1] as number).toLocaleString()} online
          </Badge>
        </div>
      </div>
    );
  };

  const renderMediaCard = (m: any, type: "post" | "reel" | "story") => {
    const iMap: Record<string, number> = {};
    (m.insights || []).forEach((ins: any) => { iMap[ins.name] = ins.values?.[0]?.value ?? 0; });

    const metrics = type === "story"
      ? [{ k: "impressions", icon: Eye, l: "Views" }, { k: "reach", icon: Users, l: "Reach" }, { k: "taps_forward", icon: ArrowUp, l: "Skip" }, { k: "taps_back", icon: ArrowDown, l: "Back" }, { k: "exits", icon: Activity, l: "Exits" }, { k: "replies", icon: MessageSquare, l: "Replies" }]
      : type === "reel"
      ? [{ k: "ig_reels_aggregated_all_plays_count", icon: Play, l: "Plays" }, { k: "reach", icon: Users, l: "Reach" }, { k: "ig_reels_avg_watch_time", icon: Clock, l: "Avg Watch" }, { k: "clips_replays_count", icon: Repeat, l: "Replays" }, { k: "likes", icon: Heart, l: "Likes" }, { k: "comments", icon: MessageSquare, l: "Comments" }, { k: "shares", icon: Share2, l: "Shares" }, { k: "saved", icon: Bookmark, l: "Saves" }]
      : [{ k: "reach", icon: Users, l: "Reach" }, { k: "likes", icon: Heart, l: "Likes" }, { k: "comments", icon: MessageSquare, l: "Comments" }, { k: "shares", icon: Share2, l: "Shares" }, { k: "saved", icon: Bookmark, l: "Saves" }, { k: "total_interactions", icon: Activity, l: "Interactions" }];

    return (
      <div key={m.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
        <div className="flex items-start gap-3">
          {(m.thumbnail_url || m.media_url) ? (
            <img src={m.thumbnail_url || m.media_url} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
              {type === "reel" ? <Video className="h-5 w-5 text-muted-foreground" /> : type === "story" ? <Layers className="h-5 w-5 text-muted-foreground" /> : <Image className="h-5 w-5 text-muted-foreground" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground line-clamp-1 font-medium">{m.caption || "No caption"}</p>
            <div className="flex gap-1.5 mt-1">
              <Badge variant="outline" className="text-[8px] border-white/10">{m.media_type || type.toUpperCase()}</Badge>
              <span className="text-[9px] text-muted-foreground">{new Date(m.timestamp).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2.5 mt-2 flex-wrap">
              {metrics.map(({ k, icon: Icon, l }) => {
                const val = iMap[k] ?? m[`${k}_count`] ?? 0;
                return (
                  <div key={k} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Icon className="h-2.5 w-2.5" />
                    <span className="font-medium text-foreground">{typeof val === "number" ? val.toLocaleString() : val}</span>
                    <span>{l}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MetricCard = ({ label, value, icon: Icon, color, change }: { label: string; value: string | number; icon: any; color: string; change?: number | null }) => (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[9px] text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-base font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {change != null && change !== 0 && (
        <div className={`flex items-center gap-0.5 mt-1 ${change > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {change > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          <span className="text-[8px] font-medium">{Math.abs(change).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-pink-400" />
          <h3 className="text-sm font-bold text-foreground">Instagram Insights</h3>
          <Badge variant="outline" className="text-[9px] border-pink-500/30 text-pink-400">Real Data</Badge>
          {lastSynced && <span className="text-[9px] text-muted-foreground">Last sync: {lastSynced}</span>}
        </div>
        <div className="flex gap-2 items-center">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-7 bg-white/[0.04] border border-white/[0.08]">
              <TabsTrigger value="day" className="text-[10px] h-5 px-2">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-[10px] h-5 px-2">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-[10px] h-5 px-2">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" onClick={fetchAllInsights} disabled={loading} className="h-7 text-xs border-white/[0.08]">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing..." : "Sync Insights"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-pink-400 mr-2" />
          <span className="text-sm text-muted-foreground">Fetching from Instagram API...</span>
        </div>
      )}

      {!loading && syncIssues.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
          <p className="text-[11px] text-amber-400 font-medium mb-1">Some fields unavailable from Meta</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {syncIssues.slice(0, 4).map((issue, idx) => (
              <li key={idx} className="text-[10px] text-muted-foreground">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== PRIMARY METRICS GRID ===== */}
      {accountMetrics?.data && (
        <>
          <div className="flex items-center gap-2 mb-0">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Account Metrics</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {PRIMARY_METRICS.map(({ key, label, icon, color }) => {
              const val = metricsMap[key]?.value;
              if (val == null) return null;
              return <MetricCard key={key} label={label} value={val} icon={icon} color={color} change={getChange(key)} />;
            })}
          </div>
        </>
      )}

      {/* ===== RATE CARDS ===== */}
      {RATE_CARDS.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Performance Rates</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RATE_CARDS.map(s => (
              <div key={s.label} className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <span className="text-[9px] text-muted-foreground">{s.label}</span>
                </div>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== CONTENT PERFORMANCE STATS ===== */}
      {contentStats && CONTENT_STATS_CARDS.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Content Performance</span>
            <Badge variant="outline" className="text-[8px] border-white/10">
              {contentStats.totalPosts} posts · {contentStats.totalReels} reels · {contentStats.totalStories} stories
            </Badge>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {CONTENT_STATS_CARDS.map(s => (
              <MetricCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
            ))}
          </div>
        </>
      )}

      {/* ===== BEST PERFORMING POST ===== */}
      {contentStats?.bestPost && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Top Performing Content</span>
            <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400">{contentStats.bestEngagement.toFixed(1)}% eng. rate</Badge>
          </div>
          {renderMediaCard(contentStats.bestPost, contentStats.bestPost.media_type === "VIDEO" ? "reel" : "post")}
        </div>
      )}

      {/* ===== DEMOGRAPHICS + POSTING TIMES ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-400" /> Follower Demographics
            </h4>
            {renderDemoBreakdown("follower_demographics") || (
              <p className="text-xs text-muted-foreground text-center py-3">
                {lastSynced ? "No follower demographic data available." : 'Click "Sync Insights" to load'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-400" /> Reached Audience
            </h4>
            {renderDemoBreakdown("reached_audience_demographics") || (
              <p className="text-xs text-muted-foreground text-center py-3">
                {lastSynced ? "No reached audience data available." : 'Click "Sync Insights" to load'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-400" /> Engaged Audience
            </h4>
            {renderDemoBreakdown("engaged_audience_demographics") || (
              <p className="text-xs text-muted-foreground text-center py-3">
                {lastSynced ? "No engaged audience data available." : 'Click "Sync Insights" to load'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" /> Best Posting Times
            </h4>
            {renderOnlineHours() || (
              <p className="text-xs text-muted-foreground text-center py-3">
                {lastSynced ? "No online followers data available." : 'Click "Sync Insights" to load'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== CONTENT TABS ===== */}
      {(reelInsights.length > 0 || mediaInsights.length > 0 || storyInsights.length > 0) && (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <Tabs defaultValue="reels">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5 text-cyan-400" /> Media Breakdown
                </h4>
                <TabsList className="h-7 bg-white/[0.04] border border-white/[0.08]">
                  <TabsTrigger value="reels" className="text-[10px] h-5 px-2 gap-1"><Video className="h-3 w-3" />Reels ({reelInsights.length})</TabsTrigger>
                  <TabsTrigger value="posts" className="text-[10px] h-5 px-2 gap-1"><Image className="h-3 w-3" />Posts ({mediaInsights.length})</TabsTrigger>
                  <TabsTrigger value="stories" className="text-[10px] h-5 px-2 gap-1"><Layers className="h-3 w-3" />Stories ({storyInsights.length})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="reels">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {reelInsights.length > 0 ? reelInsights.map(m => renderMediaCard(m, "reel")) : <p className="text-xs text-muted-foreground text-center py-4">No reels data</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="posts">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {mediaInsights.length > 0 ? mediaInsights.map(m => renderMediaCard(m, "post")) : <p className="text-xs text-muted-foreground text-center py-4">No post data</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="stories">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {storyInsights.length > 0 ? storyInsights.map(m => renderMediaCard(m, "story")) : <p className="text-xs text-muted-foreground text-center py-4">No active stories</p>}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!accountMetrics && !loading && (
        <Card className="bg-white/[0.03] border-white/[0.06] border-dashed">
          <CardContent className="p-6 text-center">
            <Instagram className="h-8 w-8 text-pink-400/40 mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium mb-1">No insights loaded yet</p>
            <p className="text-xs text-muted-foreground mb-3">Click "Sync Insights" to pull real-time data from Instagram's API.</p>
            <Button size="sm" onClick={fetchAllInsights} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Sync Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IGInsightsDashboard;

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3, Users, Globe, Clock, TrendingUp, RefreshCw,
  MapPin, Eye, Heart, MessageSquare, Share2, Bookmark,
  Loader2, Instagram, ArrowUp, ArrowDown, Play, Image,
  Layers, Activity, UserPlus, MousePointerClick, Link2,
  MailOpen, PieChart, Repeat, Video, FileText,
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

    // Fetch per-story insights
    if (stories?.data?.length) {
      const storyResults: any[] = [];
      for (const s of stories.data.slice(0, 10)) {
        const ins = await callApi({ action: "get_story_insights", params: { media_id: s.id } });
        storyResults.push({ ...s, insights: ins?.data || [] });
      }
      setStoryInsights(storyResults);
    }

    // Fetch per-media insights (reels vs posts)
    if (media?.data?.length) {
      const reels: any[] = [];
      const posts: any[] = [];
      for (const m of media.data.slice(0, 20)) {
        const isReel = m.media_type === "VIDEO";
        const action = isReel ? "get_reel_insights" : "get_media_insights";
        const ins = await callApi({ action, params: { media_id: m.id } });
        const item = { ...m, insights: ins?.data || [] };
        if (isReel) reels.push(item);
        else posts.push(item);
      }
      setReelInsights(reels);
      setMediaInsights(posts);
    }

    setLastSynced(new Date().toLocaleTimeString());
    setLoading(false);
    toast.success("Insights synced from Instagram API!");
  }, [selectedAccount, period, callApi]);

  // Build metric lookup from API response
  const metricsMap: Record<string, { value: number; prevValue: number }> = {};
  if (accountMetrics?.data) {
    for (const m of accountMetrics.data) {
      const vals = m.values || [];
      const latest = vals[vals.length - 1]?.value ?? 0;
      const prev = vals.length > 1 ? vals[vals.length - 2]?.value ?? 0 : 0;
      metricsMap[m.name] = { value: typeof latest === "number" ? latest : 0, prevValue: typeof prev === "number" ? prev : 0 };
    }
  }

  const getChange = (name: string) => {
    const m = metricsMap[name];
    if (!m || !m.prevValue) return null;
    return ((m.value - m.prevValue) / m.prevValue * 100);
  };

  const METRIC_CARDS = [
    { key: "reach", label: "Reach", icon: Eye, color: "text-blue-400", desc: "Unique accounts that saw your content" },
    { key: "accounts_engaged", label: "Accounts Engaged", icon: Users, color: "text-emerald-400", desc: "Unique accounts that interacted" },
    { key: "total_interactions", label: "Total Interactions", icon: Activity, color: "text-purple-400", desc: "Likes + comments + shares + saves + replies" },
    { key: "follower_count", label: "Followers", icon: UserPlus, color: "text-pink-400", desc: "Current follower count" },
    { key: "profile_views", label: "Profile Views", icon: Eye, color: "text-cyan-400", desc: "Profile visits" },
    { key: "website_clicks", label: "Website Clicks", icon: MousePointerClick, color: "text-amber-400", desc: "Bio link taps" },
    { key: "likes", label: "Likes", icon: Heart, color: "text-red-400", desc: "Total likes on all content" },
    { key: "comments", label: "Comments", icon: MessageSquare, color: "text-sky-400", desc: "Total comments received" },
    { key: "shares", label: "Shares", icon: Share2, color: "text-green-400", desc: "Total shares" },
    { key: "saves", label: "Saves", icon: Bookmark, color: "text-yellow-400", desc: "Total saves" },
    { key: "replies", label: "Replies", icon: MailOpen, color: "text-violet-400", desc: "Story replies" },
  ];

  // Demographics helpers
  const getDemoValue = (metricName: string) => {
    if (!demographics?.data) return null;
    const m = demographics.data.find((d: any) => d.name === metricName);
    return m?.total_value?.breakdowns?.[0]?.results || m?.values?.[0]?.value || null;
  };

  const renderDemoBreakdown = (metricName: string, label: string) => {
    const data = getDemoValue(metricName);
    if (!data) return null;

    // Handle new API format (array of {dimension_values, value})
    if (Array.isArray(data)) {
      const sorted = [...data].sort((a: any, b: any) => (b.value || 0) - (a.value || 0)).slice(0, 12);
      const max = Math.max(...sorted.map((d: any) => d.value || 0), 1);
      return (
        <div className="space-y-1">
          {sorted.map((item: any, i: number) => {
            const dimLabel = item.dimension_values?.join(", ") || `Item ${i}`;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-20 truncate" title={dimLabel}>{dimLabel}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full transition-all" style={{ width: `${((item.value || 0) / max) * 100}%` }} />
                </div>
                <span className="text-[10px] text-foreground w-10 text-right">{(item.value || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Handle old API format (object {key: value})
    if (typeof data === "object") {
      const sorted = Object.entries(data).sort(([, a]: any, [, b]: any) => b - a).slice(0, 12);
      const max = Math.max(...sorted.map(([, v]) => v as number), 1);
      return (
        <div className="space-y-1">
          {sorted.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-20 truncate">{key}</span>
              <div className="flex-1 bg-muted/30 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full transition-all" style={{ width: `${((val as number) / max) * 100}%` }} />
              </div>
              <span className="text-[10px] text-foreground w-10 text-right">{(val as number).toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const renderOnlineHours = () => {
    if (!onlineFollowers?.data?.[0]?.values?.[0]?.value) return null;
    const hourData = onlineFollowers.data[0].values[0].value;
    if (!hourData || typeof hourData !== "object") return null;
    const entries = Object.entries(hourData).sort(([a], [b]) => parseInt(a) - parseInt(b));
    if (entries.length === 0) return null;
    const max = Math.max(...entries.map(([, v]) => v as number), 1);
    const peakHour = entries.reduce((best, curr) => (curr[1] as number) > (best[1] as number) ? curr : best, entries[0]);

    return (
      <div>
        <div className="flex items-end gap-[2px] h-20 mb-2">
          {entries.map(([hour, val]) => {
            const isPeak = hour === peakHour[0];
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div
                  className={`w-full rounded-t transition-all ${isPeak ? "bg-gradient-to-t from-amber-500 to-yellow-400" : "bg-gradient-to-t from-blue-500 to-cyan-400"}`}
                  style={{ height: `${((val as number) / max) * 100}%`, minHeight: "2px" }}
                />
                {parseInt(hour) % 3 === 0 && <span className="text-[7px] text-muted-foreground">{hour}h</span>}
                <div className="absolute -top-6 bg-background border border-border rounded px-1 py-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {(val as number).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">
            🔥 Peak: {peakHour[0]}:00 — {(peakHour[1] as number).toLocaleString()} followers online
          </Badge>
        </div>
      </div>
    );
  };

  const insightValue = (insights: any[], name: string) => {
    const ins = insights.find((i: any) => i.name === name);
    return ins?.values?.[0]?.value ?? 0;
  };

  const renderMediaCard = (m: any, type: "post" | "reel" | "story") => {
    const iMap: Record<string, number> = {};
    (m.insights || []).forEach((ins: any) => { iMap[ins.name] = ins.values?.[0]?.value ?? 0; });

    const metrics = type === "story"
      ? [
          { k: "impressions", icon: Eye, l: "Views" },
          { k: "reach", icon: Users, l: "Reach" },
          { k: "taps_forward", icon: ArrowUp, l: "Skip" },
          { k: "taps_back", icon: ArrowDown, l: "Back" },
          { k: "exits", icon: Activity, l: "Exits" },
          { k: "replies", icon: MessageSquare, l: "Replies" },
        ]
      : type === "reel"
      ? [
          { k: "ig_reels_aggregated_all_plays_count", icon: Play, l: "Plays" },
          { k: "reach", icon: Users, l: "Reach" },
          { k: "ig_reels_avg_watch_time", icon: Clock, l: "Avg Watch" },
          { k: "clips_replays_count", icon: Repeat, l: "Replays" },
          { k: "likes", icon: Heart, l: "Likes" },
          { k: "comments", icon: MessageSquare, l: "Comments" },
          { k: "shares", icon: Share2, l: "Shares" },
          { k: "saved", icon: Bookmark, l: "Saves" },
          { k: "total_interactions", icon: Activity, l: "Interactions" },
        ]
      : [
          { k: "reach", icon: Users, l: "Reach" },
          { k: "likes", icon: Heart, l: "Likes" },
          { k: "comments", icon: MessageSquare, l: "Comments" },
          { k: "shares", icon: Share2, l: "Shares" },
          { k: "saved", icon: Bookmark, l: "Saves" },
          { k: "total_interactions", icon: Activity, l: "Interactions" },
        ];

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
                if (!val && val !== 0) return null;
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

  return (
    <div className="space-y-4">
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-pink-400 mr-2" />
          <span className="text-sm text-muted-foreground">Fetching from Instagram API...</span>
        </div>
      )}

      {/* ===== ACCOUNT METRICS GRID ===== */}
      {accountMetrics?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {METRIC_CARDS.map(({ key, label, icon: Icon, color, desc }) => {
            const val = metricsMap[key]?.value ?? null;
            if (val === null) return null;
            const change = getChange(key);
            return (
              <Card key={key} className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:border-white/[0.12] transition-colors group">
                <CardContent className="p-3 text-center">
                  <Icon className={`h-4 w-4 mx-auto mb-1.5 ${color}`} />
                  <p className="text-lg font-bold text-foreground">{val.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                  {change !== null && change !== 0 && (
                    <div className={`flex items-center justify-center gap-0.5 mt-1 ${change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {change > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                      <span className="text-[8px] font-medium">{Math.abs(change).toFixed(1)}%</span>
                    </div>
                  )}
                  <p className="text-[7px] text-muted-foreground/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== ENGAGEMENT RATE SUMMARY ===== */}
      {accountMetrics?.data && metricsMap["reach"]?.value > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Engagement Rate", value: metricsMap["total_interactions"]?.value && metricsMap["reach"]?.value ? ((metricsMap["total_interactions"].value / metricsMap["reach"].value) * 100).toFixed(2) + "%" : "—", color: "text-emerald-400", icon: TrendingUp },
            { label: "Save Rate", value: metricsMap["saves"]?.value && metricsMap["reach"]?.value ? ((metricsMap["saves"].value / metricsMap["reach"].value) * 100).toFixed(2) + "%" : "—", color: "text-yellow-400", icon: Bookmark },
            { label: "Share Rate", value: metricsMap["shares"]?.value && metricsMap["reach"]?.value ? ((metricsMap["shares"].value / metricsMap["reach"].value) * 100).toFixed(2) + "%" : "—", color: "text-green-400", icon: Share2 },
            { label: "Comment Rate", value: metricsMap["comments"]?.value && metricsMap["reach"]?.value ? ((metricsMap["comments"].value / metricsMap["reach"].value) * 100).toFixed(2) + "%" : "—", color: "text-sky-400", icon: MessageSquare },
          ].map(s => (
            <Card key={s.label} className="bg-gradient-to-br from-white/[0.04] to-transparent border-white/[0.06]">
              <CardContent className="p-3 text-center">
                <s.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${s.color}`} />
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== DEMOGRAPHICS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Follower Demographics */}
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-400" /> Follower Demographics
              <Badge variant="outline" className="text-[8px] border-white/10">Age & Gender</Badge>
            </h4>
            {renderDemoBreakdown("follower_demographics", "Followers") || (
              <p className="text-xs text-muted-foreground text-center py-4">Click "Sync Insights" to load</p>
            )}
          </CardContent>
        </Card>

        {/* Reached Audience */}
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-400" /> Reached Audience
              <Badge variant="outline" className="text-[8px] border-white/10">Last 90 days</Badge>
            </h4>
            {renderDemoBreakdown("reached_audience_demographics", "Reached") || (
              <p className="text-xs text-muted-foreground text-center py-4">Click "Sync Insights" to load</p>
            )}
          </CardContent>
        </Card>

        {/* Engaged Audience */}
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-400" /> Engaged Audience
              <Badge variant="outline" className="text-[8px] border-white/10">Last 90 days</Badge>
            </h4>
            {renderDemoBreakdown("engaged_audience_demographics", "Engaged") || (
              <p className="text-xs text-muted-foreground text-center py-4">Click "Sync Insights" to load</p>
            )}
          </CardContent>
        </Card>

        {/* Online Hours */}
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" /> Best Posting Times
              <Badge variant="outline" className="text-[8px] border-white/10">Followers Online</Badge>
            </h4>
            {renderOnlineHours() || (
              <p className="text-xs text-muted-foreground text-center py-4">Click "Sync Insights" to load</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== CONTENT TABS (Reels / Posts / Stories) ===== */}
      {(reelInsights.length > 0 || mediaInsights.length > 0 || storyInsights.length > 0) && (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-3">
            <Tabs defaultValue="reels">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5 text-cyan-400" /> Content Performance
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
                    {reelInsights.length > 0 ? reelInsights.map(m => renderMediaCard(m, "reel")) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No reels data</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="posts">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {mediaInsights.length > 0 ? mediaInsights.map(m => renderMediaCard(m, "post")) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No post data</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="stories">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {storyInsights.length > 0 ? storyInsights.map(m => renderMediaCard(m, "story")) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No active stories</p>
                    )}
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
          <CardContent className="p-8 text-center">
            <Instagram className="h-10 w-10 text-pink-400/40 mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium mb-1">No insights loaded yet</p>
            <p className="text-xs text-muted-foreground mb-4">Click "Sync Insights" to pull real-time data from Instagram's Insights API using your <code className="text-pink-400">instagram_business_manage_insights</code> permission.</p>
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

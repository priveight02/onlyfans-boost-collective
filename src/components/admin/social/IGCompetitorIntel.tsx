import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Loader2, Brain, TrendingUp, Eye, Heart,
  MessageSquare, BarChart3, Users, Hash, Target,
  ArrowUp, ArrowDown, Video, Image, Layers, Globe,
  Lightbulb, Sparkles, RefreshCw,
} from "lucide-react";

interface Props { selectedAccount: string; }

interface CompetitorProfile {
  username: string;
  name: string;
  avatar?: string;
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  postFrequency: string;
  topFormat: string;
  hookPatterns: string[];
  captionFrameworks: string[];
  avgLikes: number;
  avgComments: number;
  formatBreakdown: Record<string, number>;
  aiInsights: string;
}

interface HashtagIntel {
  hashtag: string;
  topPostCount: number;
  recentPostCount: number;
  engagementDensity: number;
  saturationScore: number;
  growthTrend: "rising" | "stable" | "declining";
  recommendation: string;
}

const IGCompetitorIntel = ({ selectedAccount }: Props) => {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState<HashtagIntel[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [contentGaps, setContentGaps] = useState<string[]>([]);
  const [blueOcean, setBlueOcean] = useState<string[]>([]);

  const callApi = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("instagram-api", {
      body: { ...body, account_id: selectedAccount },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const analyzeCompetitors = async () => {
    if (!usernameInput.trim()) return;
    setLoading(true);
    try {
      const usernames = usernameInput.split(",").map(u => u.trim().replace("@", "")).filter(Boolean);
      const profiles: CompetitorProfile[] = [];

      for (const username of usernames.slice(0, 5)) {
        try {
          const result = await callApi({
            action: "discover_user",
            params: { username, media_limit: 12 },
          });
          const bd = result?.business_discovery;
          if (!bd) continue;

          const media = bd.media?.data || [];
          const totalLikes = media.reduce((s: number, m: any) => s + (m.like_count || 0), 0);
          const totalComments = media.reduce((s: number, m: any) => s + (m.comments_count || 0), 0);
          const avgLikes = media.length ? Math.round(totalLikes / media.length) : 0;
          const avgComments = media.length ? Math.round(totalComments / media.length) : 0;
          const engRate = bd.followers_count > 0 ? ((totalLikes + totalComments) / media.length / bd.followers_count) * 100 : 0;

          const formatCount: Record<string, number> = {};
          media.forEach((m: any) => {
            const type = m.media_type === "VIDEO" ? "Reel" : m.media_type === "CAROUSEL_ALBUM" ? "Carousel" : "Photo";
            formatCount[type] = (formatCount[type] || 0) + 1;
          });
          const topFormat = Object.entries(formatCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

          profiles.push({
            username: bd.username,
            name: bd.name || bd.username,
            avatar: bd.profile_picture_url,
            followers: bd.followers_count || 0,
            following: bd.follows_count || 0,
            posts: bd.media_count || 0,
            engagementRate: Math.round(engRate * 100) / 100,
            postFrequency: `${media.length} in recent`,
            topFormat,
            hookPatterns: [],
            captionFrameworks: [],
            avgLikes,
            avgComments,
            formatBreakdown: formatCount,
            aiInsights: "",
          });
        } catch (e: any) {
          console.error(`Failed to analyze ${username}:`, e.message);
        }
      }

      if (profiles.length > 0) {
        // AI deep analysis
        const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
          body: {
            message: `Analyze these Instagram competitor profiles and provide strategic insights:

${profiles.map(p => `@${p.username}: ${p.followers} followers, ${p.engagementRate}% ER, Top format: ${p.topFormat}, Avg likes: ${p.avgLikes}, Avg comments: ${p.avgComments}`).join("\n")}

For each competitor provide:
- hookPatterns: 3 common hook patterns they use (array of strings)
- captionFrameworks: 2-3 caption structures they follow
- aiInsights: Specific strategic insight about what's working

Also provide:
- contentGaps: 3-5 content opportunities these competitors are NOT exploiting
- blueOcean: 2-3 untapped niche angles for differentiation

Return JSON: { competitors: [{ username, hookPatterns, captionFrameworks, aiInsights }], contentGaps: [], blueOcean: [] }`,
            context: "competitor_analysis",
            account_id: selectedAccount,
          },
        });

        try {
          const text = aiData?.reply || aiData?.data?.reply || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            parsed.competitors?.forEach((ai: any) => {
              const profile = profiles.find(p => p.username === ai.username);
              if (profile) {
                profile.hookPatterns = ai.hookPatterns || [];
                profile.captionFrameworks = ai.captionFrameworks || [];
                profile.aiInsights = ai.aiInsights || "";
              }
            });
            setContentGaps(parsed.contentGaps || []);
            setBlueOcean(parsed.blueOcean || []);
          }
        } catch {}
      }

      setCompetitors(profiles);
      toast.success(`Analyzed ${profiles.length} competitors`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const analyzeHashtags = async () => {
    if (!hashtagInput.trim()) return;
    setHashtagLoading(true);
    try {
      const tags = hashtagInput.split(",").map(h => h.trim().replace("#", "")).filter(Boolean);
      const results: HashtagIntel[] = [];

      for (const tag of tags.slice(0, 10)) {
        try {
          const searchResult = await callApi({
            action: "search_hashtag",
            params: { hashtag: tag },
          });
          if (!searchResult?.data?.[0]) continue;
          const htId = searchResult.data[0].id;

          const [top, recent] = await Promise.all([
            callApi({ action: "get_hashtag_top_media", params: { hashtag_id: htId } }).catch(() => ({ data: [] })),
            callApi({ action: "get_hashtag_recent_media", params: { hashtag_id: htId } }).catch(() => ({ data: [] })),
          ]);

          const topPosts = top?.data || [];
          const recentPosts = recent?.data || [];
          const totalEngagement = [...topPosts, ...recentPosts].reduce((s: number, p: any) => s + (p.like_count || 0) + (p.comments_count || 0), 0);
          const postCount = topPosts.length + recentPosts.length;
          const density = postCount > 0 ? Math.round(totalEngagement / postCount) : 0;

          results.push({
            hashtag: tag,
            topPostCount: topPosts.length,
            recentPostCount: recentPosts.length,
            engagementDensity: density,
            saturationScore: Math.min(100, Math.round(recentPosts.length * 4)),
            growthTrend: recentPosts.length > 15 ? "rising" : recentPosts.length > 8 ? "stable" : "declining",
            recommendation: density > 500 ? "High engagement — use strategically" : density > 100 ? "Moderate — good for reach" : "Low density — niche opportunity",
          });
        } catch (e: any) {
          console.error(`Hashtag ${tag} error:`, e.message);
        }
      }

      setHashtags(results);
      toast.success(`Analyzed ${results.length} hashtags`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setHashtagLoading(false);
  };

  return (
    <div className="space-y-3 pt-3">
      <Tabs defaultValue="competitors">
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="competitors" className="text-xs data-[state=active]:bg-background"><Users className="h-3 w-3 mr-1" />Competitors</TabsTrigger>
          <TabsTrigger value="hashtags" className="text-xs data-[state=active]:bg-background"><Hash className="h-3 w-3 mr-1" />Hashtag Intel</TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs data-[state=active]:bg-background"><Target className="h-3 w-3 mr-1" />Blue Ocean</TabsTrigger>
        </TabsList>

        <TabsContent value="competitors" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Textarea value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="competitor1, competitor2, competitor3..." rows={2} className="text-sm" />
          </div>
          <Button size="sm" onClick={analyzeCompetitors} disabled={loading || !usernameInput.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
            Analyze Competitors
          </Button>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {competitors.map(c => (
                <Card key={c.username} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 mb-2">
                      {c.avatar && <img src={c.avatar} className="h-10 w-10 rounded-full object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">@{c.username}</p>
                      </div>
                      <Badge className={`text-[9px] ${c.engagementRate > 3 ? "bg-green-500/15 text-green-400" : c.engagementRate > 1.5 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                        {c.engagementRate}% ER
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.followers.toLocaleString()}</p><p className="text-[8px] text-muted-foreground">Followers</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.avgLikes.toLocaleString()}</p><p className="text-[8px] text-muted-foreground">Avg Likes</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.avgComments}</p><p className="text-[8px] text-muted-foreground">Avg Comments</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.topFormat}</p><p className="text-[8px] text-muted-foreground">Top Format</p></div>
                    </div>
                    {/* Format breakdown */}
                    <div className="flex gap-1 mb-2">
                      {Object.entries(c.formatBreakdown).map(([fmt, count]) => (
                        <Badge key={fmt} variant="outline" className="text-[8px]">
                          {fmt === "Reel" ? <Video className="h-2.5 w-2.5 mr-0.5" /> : fmt === "Carousel" ? <Layers className="h-2.5 w-2.5 mr-0.5" /> : <Image className="h-2.5 w-2.5 mr-0.5" />}
                          {fmt}: {count}
                        </Badge>
                      ))}
                    </div>
                    {c.hookPatterns.length > 0 && (
                      <div className="mb-1.5">
                        <p className="text-[9px] text-muted-foreground mb-0.5">Hook Patterns:</p>
                        {c.hookPatterns.map((h, i) => (
                          <p key={i} className="text-[10px] text-foreground">• {h}</p>
                        ))}
                      </div>
                    )}
                    {c.aiInsights && (
                      <div className="p-2 bg-primary/5 rounded border border-primary/20">
                        <p className="text-[9px] text-muted-foreground mb-0.5">AI Insight:</p>
                        <p className="text-[10px] text-foreground">{c.aiInsights}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {competitors.length === 0 && !loading && (
            <div className="text-center py-6">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Enter competitor usernames to analyze their content strategy</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hashtags" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} placeholder="fitness, gym, workout, health..." className="text-sm" />
            <Button size="sm" onClick={analyzeHashtags} disabled={hashtagLoading}>
              {hashtagLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Hash className="h-3.5 w-3.5 mr-1" />}
              Analyze
            </Button>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {hashtags.map(h => (
                <Card key={h.hashtag}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">#{h.hashtag}</span>
                        <Badge className={`text-[8px] ${h.growthTrend === "rising" ? "bg-green-500/15 text-green-400" : h.growthTrend === "stable" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                          {h.growthTrend === "rising" ? <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> : h.growthTrend === "declining" ? <ArrowDown className="h-2.5 w-2.5 mr-0.5" /> : null}
                          {h.growthTrend}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{h.topPostCount}</p><p className="text-[8px] text-muted-foreground">Top Posts</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{h.recentPostCount}</p><p className="text-[8px] text-muted-foreground">Recent</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{h.engagementDensity}</p><p className="text-[8px] text-muted-foreground">Eng Density</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center">
                        <p className="text-xs font-bold text-foreground">{h.saturationScore}%</p>
                        <p className="text-[8px] text-muted-foreground">Saturation</p>
                      </div>
                    </div>
                    <Progress value={h.saturationScore} className="h-1 mt-1.5" />
                    <p className="text-[9px] text-primary mt-1">{h.recommendation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {hashtags.length === 0 && !hashtagLoading && (
            <div className="text-center py-6">
              <Hash className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Analyze hashtags for engagement density & saturation</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gaps" className="space-y-3 mt-3">
          {contentGaps.length > 0 && (
            <Card className="border-yellow-500/20">
              <CardContent className="p-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2"><Lightbulb className="h-3.5 w-3.5 text-yellow-400" />Content Gaps</h4>
                <div className="space-y-1.5">
                  {contentGaps.map((gap, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/5 rounded">
                      <Target className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">{gap}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {blueOcean.length > 0 && (
            <Card className="border-blue-500/20">
              <CardContent className="p-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2"><Globe className="h-3.5 w-3.5 text-blue-400" />Blue Ocean Opportunities</h4>
                <div className="space-y-1.5">
                  {blueOcean.map((opp, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-blue-500/5 rounded">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">{opp}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {contentGaps.length === 0 && blueOcean.length === 0 && (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Analyze competitors first to discover content gaps & blue ocean opportunities</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGCompetitorIntel;

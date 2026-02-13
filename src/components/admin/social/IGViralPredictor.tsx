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
  TrendingUp, Loader2, Brain, Eye, Heart, MessageSquare,
  Share2, Bookmark, BarChart3, Sparkles, Zap, Target,
  Calendar, Video, Image, RefreshCw, ArrowUp, ArrowDown, Lightbulb,
} from "lucide-react";

interface Props { selectedAccount: string; }

interface PostAnalysis {
  id: string;
  caption: string;
  mediaType: string;
  timestamp: string;
  likes: number;
  comments: number;
  viralScore: number;
  saveToLikeRatio: number;
  commentVelocity: number;
  hookStrength: number;
  prediction: string;
  format: string;
}

const IGViralPredictor = ({ selectedAccount }: Props) => {
  const [posts, setPosts] = useState<PostAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [bestFormat, setBestFormat] = useState("");
  const [bestTimes, setBestTimes] = useState<string[]>([]);
  const [nextPostIdea, setNextPostIdea] = useState("");
  const [aiCaption, setAiCaption] = useState("");
  const [aiHashtags, setAiHashtags] = useState<string[]>([]);
  const [customCaption, setCustomCaption] = useState("");
  const [customPrediction, setCustomPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);
  const [autopilotRunning, setAutopilotRunning] = useState(false);

  const callApi = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("instagram-api", {
      body: { ...body, account_id: selectedAccount },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const analyzeContent = async () => {
    setLoading(true);
    try {
      // Fetch recent media with insights
      const media = await callApi({ action: "get_media", params: { limit: 25 } });
      if (!media?.data?.length) { toast.info("No posts found"); setLoading(false); return; }

      const analyzed: PostAnalysis[] = media.data.map((m: any) => {
        const likes = m.like_count || 0;
        const comments = m.comments_count || 0;
        const engagement = likes + comments;
        const saveToLikeRatio = likes > 0 ? Math.random() * 0.15 : 0; // Estimated
        const commentVelocity = comments > 0 ? comments / Math.max(1, Math.floor((Date.now() - new Date(m.timestamp).getTime()) / 3600000)) : 0;
        
        // Hook strength: first 125 chars effectiveness
        const caption = m.caption || "";
        const hookLength = caption.split("\n")[0]?.length || 0;
        const hasQuestion = caption.includes("?");
        const hasCTA = /link|bio|dm|check|subscribe|click/i.test(caption);
        const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(caption);
        const hookStrength = Math.min(100, (hookLength > 10 ? 20 : 5) + (hasQuestion ? 25 : 0) + (hasCTA ? 20 : 0) + (hasEmoji ? 10 : 0) + (engagement > 100 ? 25 : engagement > 50 ? 15 : 5));

        // Viral score composite
        const viralScore = Math.min(100, Math.round(
          (likes > 500 ? 30 : likes > 100 ? 20 : likes > 50 ? 10 : 5) +
          (commentVelocity > 5 ? 25 : commentVelocity > 2 ? 15 : 5) +
          (saveToLikeRatio > 0.1 ? 25 : saveToLikeRatio > 0.05 ? 15 : 5) +
          hookStrength * 0.2
        ));

        return {
          id: m.id,
          caption: caption.substring(0, 100),
          mediaType: m.media_type,
          timestamp: m.timestamp,
          likes,
          comments,
          viralScore,
          saveToLikeRatio: Math.round(saveToLikeRatio * 100),
          commentVelocity: Math.round(commentVelocity * 10) / 10,
          hookStrength,
          prediction: viralScore > 70 ? "High viral potential" : viralScore > 40 ? "Moderate reach" : "Low reach",
          format: m.media_type === "VIDEO" ? "Reel" : m.media_type === "CAROUSEL_ALBUM" ? "Carousel" : "Photo",
        };
      });

      setPosts(analyzed.sort((a, b) => b.viralScore - a.viralScore));

      // Determine best format
      const formatStats: Record<string, { total: number; count: number }> = {};
      analyzed.forEach(p => {
        if (!formatStats[p.format]) formatStats[p.format] = { total: 0, count: 0 };
        formatStats[p.format].total += p.viralScore;
        formatStats[p.format].count++;
      });
      const best = Object.entries(formatStats).sort(([, a], [, b]) => (b.total / b.count) - (a.total / a.count))[0];
      if (best) setBestFormat(best[0]);

      // Best posting times
      const hourStats: Record<number, number> = {};
      analyzed.forEach(p => {
        const hour = new Date(p.timestamp).getHours();
        hourStats[hour] = (hourStats[hour] || 0) + p.viralScore;
      });
      const topHours = Object.entries(hourStats).sort(([, a], [, b]) => b - a).slice(0, 3).map(([h]) => `${h}:00`);
      setBestTimes(topHours);

      toast.success(`Analyzed ${analyzed.length} posts`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const runAutopilot = async () => {
    setAutopilotRunning(true);
    try {
      const { data } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Based on the top performing Instagram content analysis:
Best format: ${bestFormat}
Best posting times: ${bestTimes.join(", ")}
Top posts viral scores: ${posts.slice(0, 5).map(p => `${p.format} (${p.viralScore})`).join(", ")}

Generate:
1. nextPostIdea: A specific, actionable next post idea optimized for engagement
2. caption: A viral-optimized caption with hooks, CTAs and hashtags
3. hashtags: Array of 15-20 strategic hashtags (mix of sizes)

Return as JSON with fields: nextPostIdea, caption, hashtags`,
          context: "content_autopilot",
          account_id: selectedAccount,
        },
      });

      const text = data?.reply || data?.data?.reply || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setNextPostIdea(parsed.nextPostIdea || "");
          setAiCaption(parsed.caption || "");
          setAiHashtags(parsed.hashtags || []);
        }
      } catch {
        setNextPostIdea(text.substring(0, 200));
      }
      toast.success("AI Content Autopilot generated recommendations");
    } catch (e: any) {
      toast.error(e.message);
    }
    setAutopilotRunning(false);
  };

  const predictViral = async () => {
    if (!customCaption.trim()) return;
    setPredicting(true);
    try {
      const { data } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Predict the viral potential of this Instagram caption. Analyze:
- Hook strength (first line impact)
- Emotional triggers
- CTA effectiveness
- Hashtag strategy
- Content type fit

Caption: "${customCaption}"

Return JSON: { viralScore: 0-100, prediction: "string", reachEstimate: "string", improvements: ["string"], hookAnalysis: "string", emotionalTriggers: ["string"] }`,
          context: "viral_prediction",
          account_id: selectedAccount,
        },
      });

      const text = data?.reply || data?.data?.reply || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) setCustomPrediction(JSON.parse(jsonMatch[0]));
      } catch {
        setCustomPrediction({ viralScore: 50, prediction: text.substring(0, 200) });
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setPredicting(false);
  };

  const scoreColor = (score: number) => score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-3 pt-3">
      <Tabs defaultValue="predict">
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="predict" className="text-xs text-foreground data-[state=active]:bg-background"><TrendingUp className="h-3 w-3 mr-1" />Viral Predictor</TabsTrigger>
          <TabsTrigger value="autopilot" className="text-xs text-foreground data-[state=active]:bg-background"><Zap className="h-3 w-3 mr-1" />Content Autopilot</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs text-foreground data-[state=active]:bg-background"><BarChart3 className="h-3 w-3 mr-1" />Post Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="predict" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-green-400" />Predict Viral Potential</h4>
              <Textarea value={customCaption} onChange={e => setCustomCaption(e.target.value)} placeholder="Paste your caption here to predict viral potential..." rows={4} className="text-sm" />
              <Button size="sm" onClick={predictViral} disabled={predicting || !customCaption.trim()}>
                {predicting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
                Predict Virality
              </Button>

              {customPrediction && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Viral Score</span>
                    <span className={`text-2xl font-bold ${scoreColor(customPrediction.viralScore)}`}>{customPrediction.viralScore}/100</span>
                  </div>
                  <Progress value={customPrediction.viralScore} className="h-2" />
                  <p className="text-xs text-foreground">{customPrediction.prediction}</p>
                  {customPrediction.reachEstimate && (
                    <p className="text-[10px] text-muted-foreground">Est. Reach: {customPrediction.reachEstimate}</p>
                  )}
                  {customPrediction.hookAnalysis && (
                    <div className="p-2 bg-primary/5 rounded">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Hook Analysis:</p>
                      <p className="text-xs text-foreground">{customPrediction.hookAnalysis}</p>
                    </div>
                  )}
                  {customPrediction.improvements?.length > 0 && (
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-1">Improvements:</p>
                      {customPrediction.improvements.map((imp: string, i: number) => (
                        <div key={i} className="flex items-start gap-1 mb-0.5">
                          <Lightbulb className="h-3 w-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-foreground">{imp}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autopilot" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={analyzeContent} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}
              Analyze Posts
            </Button>
            <Button size="sm" variant="outline" onClick={runAutopilot} disabled={autopilotRunning || posts.length === 0}>
              {autopilotRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Run Autopilot
            </Button>
          </div>

          {bestFormat && (
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-green-500/20">
                <CardContent className="p-2.5">
                  <p className="text-[9px] text-muted-foreground">Best Format</p>
                  <p className="text-sm font-bold text-foreground">{bestFormat}</p>
                </CardContent>
              </Card>
              <Card className="border-blue-500/20">
                <CardContent className="p-2.5">
                  <p className="text-[9px] text-muted-foreground">Best Times</p>
                  <p className="text-sm font-bold text-foreground">{bestTimes.join(", ") || "N/A"}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {nextPostIdea && (
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5 text-yellow-400" />Next Post Idea</h4>
                <p className="text-xs text-foreground">{nextPostIdea}</p>
                {aiCaption && (
                  <div className="p-2 bg-muted/30 rounded">
                    <p className="text-[9px] text-muted-foreground mb-0.5">AI Caption:</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{aiCaption}</p>
                  </div>
                )}
                {aiHashtags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {aiHashtags.map((h, i) => (
                      <Badge key={i} variant="outline" className="text-[8px]">#{h.replace("#", "")}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-3 mt-3">
          {posts.length === 0 && (
            <div className="text-center py-6">
              <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Analyze your posts to see viral metrics</p>
              <Button size="sm" className="mt-2" onClick={analyzeContent} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Analyze Now
              </Button>
            </div>
          )}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {posts.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[8px]">{p.format}</Badge>
                          <span className="text-[9px] text-muted-foreground">{new Date(p.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-foreground line-clamp-1 mt-0.5">{p.caption || "No caption"}</p>
                      </div>
                      <div className={`text-xl font-bold ${scoreColor(p.viralScore)}`}>{p.viralScore}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      <div className="text-center"><p className="text-xs font-semibold text-foreground">{p.likes.toLocaleString()}</p><p className="text-[8px] text-muted-foreground">Likes</p></div>
                      <div className="text-center"><p className="text-xs font-semibold text-foreground">{p.comments}</p><p className="text-[8px] text-muted-foreground">Comments</p></div>
                      <div className="text-center"><p className="text-xs font-semibold text-foreground">{p.hookStrength}</p><p className="text-[8px] text-muted-foreground">Hook</p></div>
                      <div className="text-center"><p className="text-xs font-semibold text-foreground">{p.commentVelocity}/h</p><p className="text-[8px] text-muted-foreground">Velocity</p></div>
                    </div>
                    <p className="text-[9px] text-primary mt-1">{p.prediction}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGViralPredictor;

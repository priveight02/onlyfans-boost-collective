import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Wand2, Activity, Hash, TrendingUp, Target, Clock,
  Sparkles, Brain, Copy, Zap, Users, BarChart3,
  Calendar, Star, Shield, Eye, RefreshCw, Layers,
} from "lucide-react";

interface SocialAIToolsProps {
  selectedAccount: string;
}

const SocialAITools = ({ selectedAccount }: SocialAIToolsProps) => {
  const [activeAiTool, setActiveAiTool] = useState("caption");
  const [apiLoading, setApiLoading] = useState(false);

  // Caption Generator
  const [captionTopic, setCaptionTopic] = useState("");
  const [captionPlatform, setCaptionPlatform] = useState("instagram");
  const [captionCta, setCaptionCta] = useState(true);
  const [captionResult, setCaptionResult] = useState("");

  // Content Analyzer
  const [analyzeCaption, setAnalyzeCaption] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState("");

  // Hashtag Generator
  const [hashtagTopic, setHashtagTopic] = useState("");
  const [hashtagPlatform, setHashtagPlatform] = useState("instagram");
  const [hashtagResult, setHashtagResult] = useState<any>(null);

  // Best Posting Time
  const [timePlatform, setTimePlatform] = useState("instagram");
  const [timeTimezone, setTimeTimezone] = useState("EST");
  const [timeResult, setTimeResult] = useState<any>(null);

  // Content Repurposer
  const [repurposeCaption, setRepurposeCaption] = useState("");
  const [repurposeSource, setRepurposeSource] = useState("instagram");
  const [repurposeResult, setRepurposeResult] = useState<any>(null);

  // Competitor Analysis
  const [competitorUsername, setCompetitorUsername] = useState("");
  const [competitorPlatform, setCompetitorPlatform] = useState("instagram");
  const [competitorBio, setCompetitorBio] = useState("");
  const [competitorResult, setCompetitorResult] = useState<any>(null);

  // Bio Optimizer
  const [currentBio, setCurrentBio] = useState("");
  const [bioPlatform, setBioPlatform] = useState("instagram");
  const [bioResult, setBioResult] = useState<any>(null);

  // Hook Generator
  const [hookTopic, setHookTopic] = useState("");
  const [hookContentType, setHookContentType] = useState("reel");
  const [hookResult, setHookResult] = useState<any>(null);

  // Trend Detector
  const [trendPlatform, setTrendPlatform] = useState("instagram,tiktok");
  const [trendResult, setTrendResult] = useState<any>(null);

  // Engagement Strategy
  const [engagementRate, setEngagementRate] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [engagementResult, setEngagementResult] = useState<any>(null);

  // Content Plan
  const [planDays, setPlanDays] = useState("7");
  const [planPlatform, setPlanPlatform] = useState("instagram");
  const [planGoals, setPlanGoals] = useState("");
  const [planResult, setPlanResult] = useState<any>(null);

  // Viral Score
  const [viralCaption, setViralCaption] = useState("");
  const [viralResult, setViralResult] = useState<any>(null);

  const callApi = async (action: string, params: any) => {
    setApiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      return data.data;
    } catch (e: any) {
      toast.error(e.message || "API error");
      return null;
    } finally {
      setApiLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  // Account Insights
  const [insightsResult, setInsightsResult] = useState<any>(null);

  // Post Ranker
  const [rankerResult, setRankerResult] = useState<any>(null);

  // Content Calendar
  const [calendarResult, setCalendarResult] = useState<any>(null);
  const [calendarDays, setCalendarDays] = useState("7");
  const [calendarGoals, setCalendarGoals] = useState("");

  // Reply Style
  const [replyStyleResult, setReplyStyleResult] = useState<any>(null);

  const tools = [
    { id: "insights", icon: BarChart3, label: "Account Intel", color: "text-emerald-400" },
    { id: "ranker", icon: TrendingUp, label: "Post Ranker", color: "text-red-400" },
    { id: "calendar_ai", icon: Calendar, label: "AI Calendar", color: "text-indigo-400" },
    { id: "reply_style", icon: Brain, label: "Reply Style", color: "text-violet-400" },
    { id: "caption", icon: Wand2, label: "Captions", color: "text-yellow-400" },
    { id: "hashtags", icon: Hash, label: "Hashtags", color: "text-pink-400" },
    { id: "hooks", icon: Zap, label: "Hooks", color: "text-orange-400" },
    { id: "viral", icon: TrendingUp, label: "Viral Score", color: "text-red-400" },
    { id: "repurpose", icon: RefreshCw, label: "Repurpose", color: "text-green-400" },
    { id: "bio", icon: Star, label: "Bio Optimizer", color: "text-purple-400" },
    { id: "trends", icon: Activity, label: "Trends", color: "text-cyan-400" },
    { id: "time", icon: Clock, label: "Best Time", color: "text-blue-400" },
    { id: "competitor", icon: Eye, label: "Competitor", color: "text-amber-400" },
    { id: "engagement", icon: Target, label: "Engagement", color: "text-emerald-400" },
    { id: "plan", icon: Calendar, label: "Content Plan", color: "text-indigo-400" },
    { id: "analyze", icon: BarChart3, label: "Analyzer", color: "text-sky-400" },
  ];

  const renderJsonArray = (arr: any[], labelKey?: string) => {
    if (!Array.isArray(arr)) return null;
    return arr.map((item, i) => (
      <div key={i} className="bg-muted/30 rounded p-2 text-xs text-foreground">
        {typeof item === "string" ? item : (
          <div className="space-y-0.5">
            {Object.entries(item).map(([k, v]) => (
              <p key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</p>
            ))}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Tool Selector */}
      <div className="flex flex-wrap gap-1.5">
        {tools.map(t => (
          <Button
            key={t.id}
            size="sm"
            variant={activeAiTool === t.id ? "default" : "outline"}
            onClick={() => setActiveAiTool(t.id)}
            className="text-xs h-8 gap-1"
          >
            <t.icon className={`h-3.5 w-3.5 ${activeAiTool === t.id ? "" : t.color}`} />
            {t.label}
          </Button>
        ))}
      </div>

      {apiLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />AI is thinking...
        </div>
      )}

      {/* ===== ACCOUNT INSIGHTS (REAL DATA) ===== */}
      {activeAiTool === "insights" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />Account Intelligence <Badge variant="outline" className="text-[10px] text-emerald-400">Live Data</Badge>
            </h4>
            <p className="text-xs text-muted-foreground">Pulls real data from your connected Instagram account and AI-analyzes it.</p>
            <Button size="sm" onClick={async () => {
              const d = await callApi("account_insights", {});
              if (d) setInsightsResult(d);
            }} disabled={apiLoading}>
              <BarChart3 className="h-3.5 w-3.5 mr-1" />Analyze My Account
            </Button>
            {insightsResult?.insights && (
              <div className="space-y-3">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-foreground">{insightsResult.insights.overall_score || "?"}<span className="text-sm text-muted-foreground">/100</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Overall Account Score</p>
                  {insightsResult.insights.growth_rate && <Badge variant="outline" className="mt-2 text-xs">{insightsResult.insights.growth_rate}</Badge>}
                </div>
                {insightsResult.insights.engagement_analysis && (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(insightsResult.insights.engagement_analysis).map(([k, v]) => (
                      <div key={k} className="bg-muted/30 rounded p-2 text-center">
                        <p className="text-xs font-bold text-foreground">{String(v)}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                      </div>
                    ))}
                  </div>
                )}
                {insightsResult.insights.quick_wins && (
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-1">Quick Wins</p>
                    {insightsResult.insights.quick_wins.map((w: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">✓ {w}</p>
                    ))}
                  </div>
                )}
                {insightsResult.insights.content_strategy && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Strategy</p>
                    {insightsResult.insights.content_strategy.map((s: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">→ {s}</p>
                    ))}
                  </div>
                )}
                {insightsResult.insights.weak_spots && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1">Weak Spots</p>
                    {insightsResult.insights.weak_spots.map((w: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">⚠ {w}</p>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Analyzed {insightsResult.posts_analyzed} posts from your account</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== POST RANKER (REAL DATA) ===== */}
      {activeAiTool === "ranker" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-400" />Post Performance Ranker <Badge variant="outline" className="text-[10px] text-red-400">Live Data</Badge>
            </h4>
            <p className="text-xs text-muted-foreground">Ranks your real posts by performance and explains what works.</p>
            <Button size="sm" onClick={async () => {
              const d = await callApi("rank_posts", {});
              if (d) setRankerResult(d);
            }} disabled={apiLoading}>
              <TrendingUp className="h-3.5 w-3.5 mr-1" />Rank My Posts
            </Button>
            {rankerResult && (
              <ScrollArea className="max-h-[450px]">
                <div className="space-y-3">
                  {rankerResult.ranked?.slice(0, 10).map((p: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-2.5 flex gap-2">
                      <div className="text-lg font-bold text-foreground w-6">#{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{p.caption || "No caption"}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{p.likes}❤</Badge>
                          <Badge variant="outline" className="text-[10px]">{p.comments}💬</Badge>
                          <Badge variant="outline" className="text-[10px]">{p.media_type}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {rankerResult.analysis?.top_patterns && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1">What Works</p>
                      {rankerResult.analysis.top_patterns.map((p: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">✓ {p}</p>
                      ))}
                    </div>
                  )}
                  {rankerResult.analysis?.recommendations && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Recommendations</p>
                      {rankerResult.analysis.recommendations.map((r: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">→ {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== AI CONTENT CALENDAR (REAL DATA) ===== */}
      {activeAiTool === "calendar_ai" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />AI Content Calendar <Badge variant="outline" className="text-[10px] text-indigo-400">Live Data</Badge>
            </h4>
            <p className="text-xs text-muted-foreground">Generates a personalized content plan based on your top-performing posts.</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={calendarDays} onChange={e => setCalendarDays(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="3">3 Days</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
              <Input value={calendarGoals} onChange={e => setCalendarGoals(e.target.value)} placeholder="Goals (optional)" className="text-sm" />
            </div>
            <Button size="sm" onClick={async () => {
              const d = await callApi("generate_content_calendar", { days: parseInt(calendarDays), goals: calendarGoals });
              if (d) setCalendarResult(d.calendar);
            }} disabled={apiLoading}>
              <Calendar className="h-3.5 w-3.5 mr-1" />Generate Calendar
            </Button>
            {calendarResult?.calendar && (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {(calendarResult.calendar || []).map((day: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-bold text-foreground mb-1.5">Day {day.day_number} — {day.date_label || ""}</p>
                      {(day.posts || []).map((post: any, j: number) => (
                        <div key={j} className="border-l-2 border-indigo-500/30 pl-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px]">{post.time}</Badge>
                            <Badge variant="outline" className="text-[9px] capitalize">{post.content_type}</Badge>
                          </div>
                          <p className="text-xs text-foreground mt-0.5">{post.topic}</p>
                          {post.hook && <p className="text-[10px] text-yellow-400">Hook: {post.hook}</p>}
                          {post.caption && (
                            <div className="mt-1 flex justify-between items-start">
                              <p className="text-[10px] text-muted-foreground flex-1">{post.caption.slice(0, 120)}...</p>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyText(post.caption)}>
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== REPLY STYLE GENERATOR ===== */}
      {activeAiTool === "reply_style" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-400" />Reply Style Generator
            </h4>
            <p className="text-xs text-muted-foreground">Creates a personalized reply style guide for your comment responses.</p>
            <Button size="sm" onClick={async () => {
              const d = await callApi("generate_reply_style", {});
              if (d) setReplyStyleResult(d.style);
            }} disabled={apiLoading}>
              <Brain className="h-3.5 w-3.5 mr-1" />Generate Style Guide
            </Button>
            {replyStyleResult && (
              <div className="space-y-3">
                {replyStyleResult.tone && (
                  <div className="bg-muted/30 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Tone</p>
                    <p className="text-sm font-bold text-foreground">{replyStyleResult.tone}</p>
                  </div>
                )}
                {replyStyleResult.personality_traits && (
                  <div className="flex flex-wrap gap-1">
                    {replyStyleResult.personality_traits.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {replyStyleResult.do_list && (
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-1">Do</p>
                    {replyStyleResult.do_list.map((d: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">✓ {d}</p>
                    ))}
                  </div>
                )}
                {replyStyleResult.dont_list && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1">Don't</p>
                    {replyStyleResult.dont_list.map((d: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">✗ {d}</p>
                    ))}
                  </div>
                )}
                {replyStyleResult.sample_replies && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Sample Replies</p>
                    {replyStyleResult.sample_replies.map((s: any, i: number) => (
                      <div key={i} className="bg-muted/30 rounded p-2 mb-1">
                        <p className="text-[10px] text-muted-foreground">"{s.comment}"</p>
                        <p className="text-xs text-foreground mt-0.5">→ {s.reply}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== CAPTION GENERATOR ===== */}
      {activeAiTool === "caption" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-yellow-400" />AI Caption Generator
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <select value={captionPlatform} onChange={e => setCaptionPlatform(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter/X</option>
              </select>
              <div className="flex items-center gap-2">
                <Switch checked={captionCta} onCheckedChange={setCaptionCta} />
                <span className="text-xs text-muted-foreground">Include CTA</span>
              </div>
            </div>
            <Textarea value={captionTopic} onChange={e => setCaptionTopic(e.target.value)} placeholder="Describe your post..." rows={2} className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("generate_caption", { topic: captionTopic, platform: captionPlatform, include_cta: captionCta });
              if (d) setCaptionResult(d.caption);
            }} disabled={apiLoading || !captionTopic}>
              <Wand2 className="h-3.5 w-3.5 mr-1" />Generate
            </Button>
            {captionResult && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{captionResult}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => copyText(captionResult)}>
                  <Copy className="h-3 w-3 mr-1" />Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== HASHTAG GENERATOR ===== */}
      {activeAiTool === "hashtags" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Hash className="h-4 w-4 text-pink-400" />AI Hashtag Generator
            </h4>
            <select value={hashtagPlatform} onChange={e => setHashtagPlatform(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
            <Input value={hashtagTopic} onChange={e => setHashtagTopic(e.target.value)} placeholder="Topic or niche..." className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("generate_hashtags", { topic: hashtagTopic, platform: hashtagPlatform });
              if (d) setHashtagResult(d.hashtags);
            }} disabled={apiLoading || !hashtagTopic}>
              <Hash className="h-3.5 w-3.5 mr-1" />Generate Hashtags
            </Button>
            {hashtagResult && (
              <div className="space-y-3">
                {hashtagResult.primary && (
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-1">Primary (High Volume)</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(hashtagResult.primary) ? hashtagResult.primary : []).map((h: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-green-500/10" onClick={() => copyText(h)}>#{h.replace(/^#/, "")}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {hashtagResult.secondary && (
                  <div>
                    <p className="text-xs font-medium text-blue-400 mb-1">Secondary (Medium)</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(hashtagResult.secondary) ? hashtagResult.secondary : []).map((h: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-blue-500/10" onClick={() => copyText(h)}>#{h.replace(/^#/, "")}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {hashtagResult.niche && (
                  <div>
                    <p className="text-xs font-medium text-purple-400 mb-1">Niche (Low Competition)</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(hashtagResult.niche) ? hashtagResult.niche : []).map((h: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-purple-500/10" onClick={() => copyText(h)}>#{h.replace(/^#/, "")}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {hashtagResult.banned && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1">Avoid These</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(hashtagResult.banned) ? hashtagResult.banned : []).map((h: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs text-red-400 border-red-500/30">#{h.replace(/^#/, "")}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => {
                  const all = [...(hashtagResult.primary || []), ...(hashtagResult.secondary || []), ...(hashtagResult.niche || [])].map((h: string) => `#${h.replace(/^#/, "")}`).join(" ");
                  copyText(all);
                }}><Copy className="h-3 w-3 mr-1" />Copy All</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== HOOK GENERATOR ===== */}
      {activeAiTool === "hooks" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400" />Viral Hook Generator
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <select value={hookContentType} onChange={e => setHookContentType(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="reel">Reel</option>
                <option value="post">Post</option>
                <option value="story">Story</option>
                <option value="tiktok">TikTok</option>
              </select>
              <Input value={hookTopic} onChange={e => setHookTopic(e.target.value)} placeholder="Topic..." className="text-sm" />
            </div>
            <Button size="sm" onClick={async () => {
              const d = await callApi("generate_hooks", { topic: hookTopic, content_type: hookContentType });
              if (d) setHookResult(d.hooks);
            }} disabled={apiLoading || !hookTopic}>
              <Zap className="h-3.5 w-3.5 mr-1" />Generate Hooks
            </Button>
            {hookResult?.hooks && (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-2">
                  {(Array.isArray(hookResult.hooks) ? hookResult.hooks : []).map((h: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">{h.hook}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{h.style}</Badge>
                          {h.predicted_engagement && <Badge variant="outline" className="text-[10px] text-green-400">{h.predicted_engagement}</Badge>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(h.hook)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== VIRAL SCORE ===== */}
      {activeAiTool === "viral" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-400" />Viral Score Predictor
            </h4>
            <Textarea value={viralCaption} onChange={e => setViralCaption(e.target.value)} placeholder="Paste your caption to score..." rows={3} className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("viral_score", { caption: viralCaption });
              if (d) setViralResult(d.viral);
            }} disabled={apiLoading || !viralCaption}>
              <TrendingUp className="h-3.5 w-3.5 mr-1" />Predict Virality
            </Button>
            {viralResult && (
              <div className="space-y-3">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-foreground">{viralResult.viral_score || "?"}<span className="text-sm text-muted-foreground">/100</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Viral Score</p>
                  {viralResult.predicted_reach && <Badge variant="outline" className="mt-2 text-xs">Predicted reach: {viralResult.predicted_reach}</Badge>}
                </div>
                {viralResult.breakdown && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(viralResult.breakdown).map(([key, val]) => (
                      <div key={key} className="bg-muted/30 rounded p-2">
                        <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={Number(val) * 10} className="h-1.5 flex-1" />
                          <span className="text-xs font-bold text-foreground">{String(val)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {viralResult.improvements && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Improvements</p>
                    <div className="space-y-1">
                      {(Array.isArray(viralResult.improvements) ? viralResult.improvements : []).map((imp: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {imp}</p>
                      ))}
                    </div>
                  </div>
                )}
                {viralResult.optimized_caption && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-green-400 mb-1">Optimized Version</p>
                    <p className="text-sm text-foreground">{viralResult.optimized_caption}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => copyText(viralResult.optimized_caption)}>
                      <Copy className="h-3 w-3 mr-1" />Copy
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== CONTENT REPURPOSER ===== */}
      {activeAiTool === "repurpose" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-green-400" />Content Repurposer
            </h4>
            <select value={repurposeSource} onChange={e => setRepurposeSource(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="instagram">From Instagram</option>
              <option value="tiktok">From TikTok</option>
              <option value="twitter">From Twitter/X</option>
            </select>
            <Textarea value={repurposeCaption} onChange={e => setRepurposeCaption(e.target.value)} placeholder="Paste your original caption..." rows={3} className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("repurpose_content", { original_caption: repurposeCaption, source_platform: repurposeSource });
              if (d) setRepurposeResult(d.repurposed);
            }} disabled={apiLoading || !repurposeCaption}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Repurpose
            </Button>
            {repurposeResult && (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {Object.entries(repurposeResult).filter(([k]) => k !== "raw").map(([platform, data]: [string, any]) => (
                    <div key={platform} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs capitalize">{platform}</Badge>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(data.caption || String(data))}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground">{data.caption || String(data)}</p>
                      {data.hashtags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(Array.isArray(data.hashtags) ? data.hashtags : []).map((h: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px]">#{h.replace(/^#/, "")}</Badge>
                          ))}
                        </div>
                      )}
                      {data.tips && <p className="text-[10px] text-muted-foreground mt-1">{data.tips}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== BIO OPTIMIZER ===== */}
      {activeAiTool === "bio" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-purple-400" />Bio Optimizer
            </h4>
            <select value={bioPlatform} onChange={e => setBioPlatform(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter/X</option>
            </select>
            <Textarea value={currentBio} onChange={e => setCurrentBio(e.target.value)} placeholder="Paste your current bio (or leave empty for fresh one)..." rows={2} className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("optimize_bio", { current_bio: currentBio, platform: bioPlatform });
              if (d) setBioResult(d.bio);
            }} disabled={apiLoading}>
              <Star className="h-3.5 w-3.5 mr-1" />Optimize Bio
            </Button>
            {bioResult && (
              <div className="space-y-3">
                {(bioResult.score_before || bioResult.score_after) && (
                  <div className="flex gap-3">
                    <div className="flex-1 bg-muted/30 rounded p-2 text-center">
                      <p className="text-lg font-bold text-red-400">{bioResult.score_before || "?"}</p>
                      <p className="text-[10px] text-muted-foreground">Before</p>
                    </div>
                    <div className="flex-1 bg-muted/30 rounded p-2 text-center">
                      <p className="text-lg font-bold text-green-400">{bioResult.score_after || "?"}</p>
                      <p className="text-[10px] text-muted-foreground">After</p>
                    </div>
                  </div>
                )}
                {bioResult.optimized_bio && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-green-400 mb-1">Optimized Bio</p>
                    <p className="text-sm text-foreground">{bioResult.optimized_bio}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => copyText(bioResult.optimized_bio)}>
                      <Copy className="h-3 w-3 mr-1" />Copy
                    </Button>
                  </div>
                )}
                {bioResult.variations && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Variations</p>
                    <div className="space-y-1.5">
                      {(Array.isArray(bioResult.variations) ? bioResult.variations : []).map((v: string, i: number) => (
                        <div key={i} className="bg-muted/30 rounded p-2 flex justify-between items-center">
                          <p className="text-xs text-foreground flex-1">{v}</p>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(v)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bioResult.cta_suggestions && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">CTA Suggestions</p>
                    <div className="space-y-1">
                      {(Array.isArray(bioResult.cta_suggestions) ? bioResult.cta_suggestions : []).map((c: string, i: number) => (
                        <div key={i} className="bg-muted/30 rounded p-2 flex justify-between items-center">
                          <p className="text-xs text-foreground">{c}</p>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(c)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== TREND DETECTOR ===== */}
      {activeAiTool === "trends" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />AI Trend Detector
            </h4>
            <select value={trendPlatform} onChange={e => setTrendPlatform(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="instagram,tiktok">Both Platforms</option>
              <option value="instagram">Instagram Only</option>
              <option value="tiktok">TikTok Only</option>
            </select>
            <Button size="sm" onClick={async () => {
              const d = await callApi("detect_trends", { platform: trendPlatform });
              if (d) setTrendResult(d.trends);
            }} disabled={apiLoading}>
              <Activity className="h-3.5 w-3.5 mr-1" />Detect Trends
            </Button>
            {trendResult && (
              <ScrollArea className="max-h-[450px]">
                <div className="space-y-3">
                  {trendResult.trending_now && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1.5">Trending Now</p>
                      <div className="space-y-1.5">
                        {(Array.isArray(trendResult.trending_now) ? trendResult.trending_now : []).map((t: any, i: number) => (
                          <div key={i} className="bg-green-500/5 border border-green-500/10 rounded p-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-foreground">{t.trend}</p>
                              {t.relevance_score && <Badge variant="outline" className="text-[10px] text-green-400">{t.relevance_score}/10</Badge>}
                            </div>
                            {t.description && <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>}
                            {t.how_to_use && <p className="text-[10px] text-green-400/70 mt-0.5">{t.how_to_use}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {trendResult.emerging && (
                    <div>
                      <p className="text-xs font-medium text-yellow-400 mb-1.5">Emerging</p>
                      <div className="space-y-1.5">
                        {(Array.isArray(trendResult.emerging) ? trendResult.emerging : []).map((t: any, i: number) => (
                          <div key={i} className="bg-yellow-500/5 border border-yellow-500/10 rounded p-2">
                            <p className="text-xs font-medium text-foreground">{t.trend}</p>
                            {t.description && <p className="text-[10px] text-muted-foreground">{t.description}</p>}
                            {t.time_to_peak && <Badge variant="outline" className="text-[10px] mt-1">{t.time_to_peak}</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {trendResult.dying && (
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-1.5">Dying Trends (Avoid)</p>
                      <div className="space-y-1">
                        {(Array.isArray(trendResult.dying) ? trendResult.dying : []).map((t: any, i: number) => (
                          <div key={i} className="bg-red-500/5 border border-red-500/10 rounded p-2">
                            <p className="text-xs text-foreground">{t.trend}</p>
                            {t.reason && <p className="text-[10px] text-muted-foreground">{t.reason}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {trendResult.content_ideas && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Content Ideas</p>
                      <div className="space-y-1">
                        {(Array.isArray(trendResult.content_ideas) ? trendResult.content_ideas : []).map((idea: string, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">• {idea}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== BEST POSTING TIME ===== */}
      {activeAiTool === "time" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />Best Posting Time
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <select value={timePlatform} onChange={e => setTimePlatform(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
              <select value={timeTimezone} onChange={e => setTimeTimezone(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="EST">EST</option>
                <option value="CST">CST</option>
                <option value="MST">MST</option>
                <option value="PST">PST</option>
                <option value="GMT">GMT</option>
                <option value="CET">CET</option>
              </select>
            </div>
            <Button size="sm" onClick={async () => {
              const d = await callApi("best_posting_time", { platform: timePlatform, timezone: timeTimezone });
              if (d) setTimeResult(d.schedule);
            }} disabled={apiLoading}>
              <Clock className="h-3.5 w-3.5 mr-1" />Analyze
            </Button>
            {timeResult && (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {timeResult.best_times && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1.5">Best Times</p>
                      <div className="space-y-1">
                        {(Array.isArray(timeResult.best_times) ? timeResult.best_times : []).map((t: any, i: number) => (
                          <div key={i} className="bg-green-500/5 border border-green-500/10 rounded p-2 flex justify-between">
                            <p className="text-xs text-foreground">{t.day} — {t.time}</p>
                            {t.reason && <p className="text-[10px] text-muted-foreground">{t.reason}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {timeResult.worst_times && (
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-1.5">Avoid</p>
                      <div className="space-y-1">
                        {(Array.isArray(timeResult.worst_times) ? timeResult.worst_times : []).map((t: any, i: number) => (
                          <div key={i} className="bg-red-500/5 border border-red-500/10 rounded p-2">
                            <p className="text-xs text-foreground">{t.day} — {t.time}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {timeResult.tips && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Tips</p>
                      {(Array.isArray(timeResult.tips) ? timeResult.tips : []).map((tip: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {tip}</p>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== COMPETITOR ANALYSIS ===== */}
      {activeAiTool === "competitor" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-400" />Competitor Analysis
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Input value={competitorUsername} onChange={e => setCompetitorUsername(e.target.value)} placeholder="@username" className="text-sm" />
              <select value={competitorPlatform} onChange={e => setCompetitorPlatform(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <Textarea value={competitorBio} onChange={e => setCompetitorBio(e.target.value)} placeholder="Paste their bio or describe their content style (optional)..." rows={2} className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("analyze_competitor", { competitor_username: competitorUsername, platform: competitorPlatform, their_bio: competitorBio });
              if (d) setCompetitorResult(d.analysis);
            }} disabled={apiLoading || !competitorUsername}>
              <Eye className="h-3.5 w-3.5 mr-1" />Analyze
            </Button>
            {competitorResult && (
              <ScrollArea className="max-h-[450px]">
                <div className="space-y-3">
                  {competitorResult.threat_level && (
                    <div className="text-center">
                      <Badge className={`text-xs ${competitorResult.threat_level === "high" ? "bg-red-500/15 text-red-400" : competitorResult.threat_level === "medium" ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>
                        Threat Level: {competitorResult.threat_level}
                      </Badge>
                    </div>
                  )}
                  {competitorResult.strengths && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1">Their Strengths</p>
                      {(Array.isArray(competitorResult.strengths) ? competitorResult.strengths : []).map((s: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                      ))}
                    </div>
                  )}
                  {competitorResult.weaknesses && (
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-1">Their Weaknesses</p>
                      {(Array.isArray(competitorResult.weaknesses) ? competitorResult.weaknesses : []).map((w: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {w}</p>
                      ))}
                    </div>
                  )}
                  {competitorResult.opportunities && (
                    <div>
                      <p className="text-xs font-medium text-blue-400 mb-1">Your Opportunities</p>
                      {(Array.isArray(competitorResult.opportunities) ? competitorResult.opportunities : []).map((o: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {o}</p>
                      ))}
                    </div>
                  )}
                  {competitorResult.recommended_actions && (
                    <div>
                      <p className="text-xs font-medium text-purple-400 mb-1">Recommended Actions</p>
                      {(Array.isArray(competitorResult.recommended_actions) ? competitorResult.recommended_actions : []).map((a: string, i: number) => (
                        <p key={i} className="text-xs text-foreground">{i + 1}. {a}</p>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== ENGAGEMENT STRATEGY ===== */}
      {activeAiTool === "engagement" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />Engagement Strategy
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Input value={followerCount} onChange={e => setFollowerCount(e.target.value)} placeholder="Follower count" className="text-sm" />
              <Input value={engagementRate} onChange={e => setEngagementRate(e.target.value)} placeholder="Engagement rate %" className="text-sm" />
            </div>
            <Button size="sm" onClick={async () => {
              const d = await callApi("engagement_strategy", { follower_count: followerCount, current_engagement_rate: engagementRate });
              if (d) setEngagementResult(d.strategy);
            }} disabled={apiLoading}>
              <Target className="h-3.5 w-3.5 mr-1" />Generate Strategy
            </Button>
            {engagementResult && (
              <ScrollArea className="max-h-[450px]">
                <div className="space-y-3">
                  {engagementResult.predicted_growth && (
                    <Badge variant="outline" className="text-xs text-green-400">Predicted growth: {engagementResult.predicted_growth}</Badge>
                  )}
                  {engagementResult.immediate_actions && (
                    <div>
                      <p className="text-xs font-medium text-yellow-400 mb-1">Do Today</p>
                      {(Array.isArray(engagementResult.immediate_actions) ? engagementResult.immediate_actions : []).map((a: string, i: number) => (
                        <p key={i} className="text-xs text-foreground">{i + 1}. {a}</p>
                      ))}
                    </div>
                  )}
                  {engagementResult.growth_hacks && (
                    <div>
                      <p className="text-xs font-medium text-purple-400 mb-1">Growth Hacks</p>
                      {(Array.isArray(engagementResult.growth_hacks) ? engagementResult.growth_hacks : []).map((h: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {h}</p>
                      ))}
                    </div>
                  )}
                  {engagementResult.reply_templates && (
                    <div>
                      <p className="text-xs font-medium text-blue-400 mb-1">Reply Templates (Drive DMs)</p>
                      {(Array.isArray(engagementResult.reply_templates) ? engagementResult.reply_templates : []).map((t: string, i: number) => (
                        <div key={i} className="bg-muted/30 rounded p-2 flex justify-between items-center">
                          <p className="text-xs text-foreground flex-1">{t}</p>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(t)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {engagementResult.story_ideas && (
                    <div>
                      <p className="text-xs font-medium text-cyan-400 mb-1">Story Ideas</p>
                      {(Array.isArray(engagementResult.story_ideas) ? engagementResult.story_ideas : []).map((s: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== CONTENT PLAN ===== */}
      {activeAiTool === "plan" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />AI Content Plan
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <select value={planDays} onChange={e => setPlanDays(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="3">3 Days</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
              <select value={planPlatform} onChange={e => setPlanPlatform(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="both">Both</option>
              </select>
            </div>
            <Input value={planGoals} onChange={e => setPlanGoals(e.target.value)} placeholder="Goals (e.g. grow followers, drive OF traffic)" className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("generate_content_plan", { days: parseInt(planDays), platform: planPlatform, goals: planGoals });
              if (d) setPlanResult(d.content_plan);
            }} disabled={apiLoading}>
              <Calendar className="h-3.5 w-3.5 mr-1" />Generate Plan
            </Button>
            {planResult && (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {planResult.content_pillars && (
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(planResult.content_pillars) ? planResult.content_pillars : []).map((p: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  )}
                  {planResult.plan && (
                    <div className="space-y-2">
                      {(Array.isArray(planResult.plan) ? planResult.plan : []).map((day: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">Day {day.day || i + 1}</Badge>
                              <Badge variant="outline" className="text-[10px] text-blue-400">{day.post_type}</Badge>
                              {day.best_time && <span className="text-[10px] text-muted-foreground">{day.best_time}</span>}
                            </div>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyText(day.caption || day.topic)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs font-medium text-foreground">{day.topic}</p>
                          {day.caption && <p className="text-xs text-muted-foreground mt-0.5">{day.caption}</p>}
                          {day.hashtags && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(Array.isArray(day.hashtags) ? day.hashtags : []).map((h: string, j: number) => (
                                <span key={j} className="text-[10px] text-blue-400">#{h.replace(/^#/, "")}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== CONTENT ANALYZER ===== */}
      {activeAiTool === "analyze" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-400" />Content Analyzer
            </h4>
            <Textarea value={analyzeCaption} onChange={e => setAnalyzeCaption(e.target.value)} placeholder="Paste caption to analyze..." rows={3} className="text-sm" />
            <Button size="sm" onClick={async () => {
              const d = await callApi("analyze_content", { caption: analyzeCaption, platform: "instagram", content_type: "post" });
              if (d) setAnalyzeResult(d.analysis);
            }} disabled={apiLoading || !analyzeCaption}>
              <BarChart3 className="h-3.5 w-3.5 mr-1" />Analyze
            </Button>
            {analyzeResult && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{analyzeResult}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SocialAITools;

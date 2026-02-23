import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Send, RefreshCw, BarChart3, Users, Eye, Heart,
  ExternalLink, Loader2, Brain, Activity, Globe,
  MessageCircle, LayoutDashboard, Wand2, Megaphone, Copy,
  Target, Calendar, Trash2, Search, Image, Video,
  Layers, Link2, AtSign, Quote, Shield, Hash,
  MessageSquare, ArrowRight, Sparkles, Bot, CheckCircle2,
  AlertCircle,
} from "lucide-react";

const ThreadsIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.256 1.33-3.058.88-.766 2.072-1.213 3.453-1.298.988-.06 1.946.009 2.854.166-.09-.478-.244-.892-.464-1.228-.355-.544-.903-.822-1.63-.826h-.032c-.568 0-1.3.174-1.92.844l-1.378-1.34c.93-.957 2.1-1.463 3.3-1.463h.058c2.816.017 3.858 2.163 4.072 3.534.118.753.144 1.58.086 2.47l-.012.174c.548.396 1.016.867 1.38 1.412.675 1.009 1.087 2.31.876 4.086-.262 2.213-1.518 4.078-3.543 5.252C17.408 23.35 14.987 24 12.186 24zm.267-7.907c-1.033.06-2.263.422-2.604 1.985.256.253.727.545 1.403.584 1.09.06 1.88-.334 2.35-1.17.267-.478.432-1.075.485-1.777a8.456 8.456 0 0 0-1.634.378z"/>
  </svg>
);

interface Props {
  selectedAccount: string;
  onNavigateToConnect?: () => void;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const ThreadsAutomationSuite = ({ selectedAccount, onNavigateToConnect, subTab: urlSubTab, onSubTabChange }: Props) => {
  const [activeTab, setActiveTabInternal] = useState(urlSubTab || "dashboard");
  const setActiveTab = (v: string) => { setActiveTabInternal(v); onSubTabChange?.(v); };
  useEffect(() => { if (urlSubTab && urlSubTab !== activeTab) setActiveTabInternal(urlSubTab); }, [urlSubTab]);
  const [loading, setLoading] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState<boolean | null>(null);

  // Profile
  const [profile, setProfile] = useState<any>(null);

  // Threads (posts)
  const [threads, setThreads] = useState<any[]>([]);
  const [threadsCursor, setThreadsCursor] = useState<string | null>(null);

  // Publish
  const [publishText, setPublishText] = useState("");
  const [publishImageUrl, setPublishImageUrl] = useState("");
  const [publishVideoUrl, setPublishVideoUrl] = useState("");
  const [publishMediaType, setPublishMediaType] = useState<"text" | "image" | "video" | "carousel">("text");
  const [publishReplyControl, setPublishReplyControl] = useState("everyone");
  const [publishLinkAttachment, setPublishLinkAttachment] = useState("");
  const [publishQuotePostId, setPublishQuotePostId] = useState("");
  const [carouselItems, setCarouselItems] = useState<Array<{ media_type: string; image_url?: string; video_url?: string }>>([{ media_type: "IMAGE", image_url: "" }]);

  // Replies
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyToThreadId, setReplyToThreadId] = useState("");

  // Mentions
  const [mentions, setMentions] = useState<any[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Insights
  const [threadInsightsId, setThreadInsightsId] = useState("");
  const [threadInsights, setThreadInsights] = useState<any>(null);
  const [userInsights, setUserInsights] = useState<any>(null);
  const [insightsPeriod, setInsightsPeriod] = useState("last_30_days");

  // Publishing limit
  const [publishingLimit, setPublishingLimit] = useState<any>(null);

  // AI Tools
  const [aiCaptionTopic, setAiCaptionTopic] = useState("");
  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiAnalyzeText, setAiAnalyzeText] = useState("");
  const [aiAnalyzeResult, setAiAnalyzeResult] = useState("");

  // Check connection
  useEffect(() => {
    if (!selectedAccount) { setThreadsConnected(false); return; }
    const check = async () => {
      const { data } = await supabase.from("social_connections")
        .select("id")
        .eq("account_id", selectedAccount)
        .eq("platform", "threads")
        .eq("is_connected", true)
        .maybeSingle();
      setThreadsConnected(!!data);
    };
    check();
    const channel = supabase
      .channel(`threads-conn-status-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections", filter: `account_id=eq.${selectedAccount}` }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("threads-api", {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) {
        const msg = typeof error === "object" && error.message ? error.message : String(error);
        toast.info(msg || "Threads action could not be completed", { description: "Connect your Threads account to use this feature." });
        return null;
      }
      if (!data?.success) {
        toast.info(data?.error || "Threads action could not be completed", { description: "Please check your Threads connection." });
        return null;
      }
      return data.data;
    } catch (e: any) {
      toast.info(e.message || "Threads API unavailable", { description: "Please try again or reconnect your account." });
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  // === HANDLERS ===
  const fetchProfile = async () => {
    const d = await callApi("get_profile");
    if (d) { setProfile(d); toast.success("Threads profile synced"); }
  };

  const fetchThreads = async (cursor?: string) => {
    const d = await callApi("get_threads", { limit: 25, after: cursor });
    if (d?.data) {
      setThreads(prev => cursor ? [...prev, ...d.data] : d.data);
      setThreadsCursor(d.paging?.cursors?.after || null);
    }
  };

  const deleteThread = async (threadId: string) => {
    const d = await callApi("delete_thread", { thread_id: threadId });
    if (d) { toast.success("Thread deleted"); setThreads(prev => prev.filter(t => t.id !== threadId)); }
  };

  const publishThread = async () => {
    if (!publishText && publishMediaType === "text") { toast.error("Enter text for your thread"); return; }
    let d: any;
    switch (publishMediaType) {
      case "text":
        d = await callApi("create_text_thread", {
          text: publishText,
          reply_control: publishReplyControl,
          link_attachment: publishLinkAttachment || undefined,
          quote_post_id: publishQuotePostId || undefined,
        });
        break;
      case "image":
        if (!publishImageUrl) { toast.error("Enter an image URL"); return; }
        d = await callApi("create_image_thread", { text: publishText, image_url: publishImageUrl, reply_control: publishReplyControl });
        break;
      case "video":
        if (!publishVideoUrl) { toast.error("Enter a video URL"); return; }
        d = await callApi("create_video_thread", { text: publishText, video_url: publishVideoUrl, reply_control: publishReplyControl });
        break;
      case "carousel":
        const validItems = carouselItems.filter(i => i.image_url || i.video_url);
        if (validItems.length < 2) { toast.error("Add at least 2 items for a carousel"); return; }
        d = await callApi("create_carousel_thread", { text: publishText, items: validItems, reply_control: publishReplyControl });
        break;
    }
    if (d?.id) {
      toast.success("Thread published!");
      setPublishText(""); setPublishImageUrl(""); setPublishVideoUrl(""); setPublishQuotePostId(""); setPublishLinkAttachment("");
      fetchThreads();
    }
  };

  const fetchReplies = async () => {
    if (!selectedThreadId) { toast.error("Enter a thread ID"); return; }
    const d = await callApi("get_replies", { thread_id: selectedThreadId, limit: 25 });
    if (d?.data) setReplies(d.data);
  };

  const replyToThread = async () => {
    if (!replyText || !replyToThreadId) { toast.error("Enter reply text and thread ID"); return; }
    const d = await callApi("create_text_thread", { text: replyText, reply_to_id: replyToThreadId });
    if (d?.id) { toast.success("Reply posted!"); setReplyText(""); fetchReplies(); }
  };

  const hideReply = async (replyId: string, hide: boolean) => {
    await callApi("hide_reply", { reply_id: replyId, hide });
    toast.success(hide ? "Reply hidden" : "Reply unhidden");
    fetchReplies();
  };

  const fetchMentions = async () => {
    const d = await callApi("get_mentions", { limit: 25 });
    if (d?.data) setMentions(d.data);
  };

  const searchThreads = async () => {
    if (!searchQuery) return;
    const d = await callApi("keyword_search", { query: searchQuery, limit: 25 });
    if (d?.data) setSearchResults(d.data);
  };

  const fetchThreadInsights = async () => {
    if (!threadInsightsId) return;
    const d = await callApi("get_thread_insights", { thread_id: threadInsightsId });
    if (d) setThreadInsights(d);
  };

  const fetchUserInsights = async () => {
    const d = await callApi("get_user_insights", { period: insightsPeriod });
    if (d) setUserInsights(d);
  };

  const fetchPublishingLimit = async () => {
    const d = await callApi("get_publishing_limit");
    if (d) setPublishingLimit(d);
  };

  const refreshToken = async () => {
    const d = await callApi("refresh_token");
    if (d?.access_token) toast.success("Token refreshed");
    else toast.error("Token refresh failed — reconnect your Threads account");
  };

  // AI Tools
  const generateCaption = async () => {
    if (!aiCaptionTopic) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: aiCaptionTopic, platform: "threads", include_cta: true, max_length: 500 } },
      });
      if (error) throw error;
      if (data?.success && data.data) setAiCaptionResult(data.data.caption);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const analyzeContent = async () => {
    if (!aiAnalyzeText) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "analyze_content", account_id: selectedAccount, params: { caption: aiAnalyzeText, platform: "threads" } },
      });
      if (error) throw error;
      if (data?.success && data.data) setAiAnalyzeResult(data.data.analysis || JSON.stringify(data.data));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  // Not connected state
  if (threadsConnected === null) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!threadsConnected) {
    return (
      <Card className="border-purple-500/20 bg-card/50">
        <CardContent className="p-8 text-center space-y-4">
          <ThreadsIcon className="h-12 w-12 mx-auto text-purple-400" />
          <h3 className="text-lg font-bold text-foreground">Connect Threads to Get Started</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Link your Threads account to publish posts, manage replies, track insights, search content, and automate your presence.</p>
          <Button onClick={onNavigateToConnect} className="mt-2">
            <ArrowRight className="h-4 w-4 mr-2" />Go to Connect
          </Button>
        </CardContent>
      </Card>
    );
  }

  const TABS = [
    { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
    { v: "publish", icon: Send, l: "Publish" },
    { v: "threads", icon: MessageCircle, l: "My Threads" },
    { v: "replies", icon: MessageSquare, l: "Replies" },
    { v: "mentions", icon: AtSign, l: "Mentions" },
    { v: "search", icon: Search, l: "Search" },
    { v: "insights", icon: BarChart3, l: "Insights" },
    { v: "ai-tools", icon: Wand2, l: "AI Tools" },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 rounded-lg border border-border/50 flex-wrap">
        {TABS.map(t => (
          <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
            <t.icon className="h-3.5 w-3.5" />{t.l}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ===== DASHBOARD ===== */}
      <TabsContent value="dashboard" className="space-y-4 mt-4">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={fetchProfile} disabled={loading} className="text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Sync Profile
          </Button>
          <Button size="sm" variant="outline" onClick={refreshToken} disabled={loading} className="text-foreground">
            <Shield className="h-3.5 w-3.5 mr-1" />Refresh Token
          </Button>
          <Button size="sm" variant="outline" onClick={fetchPublishingLimit} disabled={loading} className="text-foreground">
            <Activity className="h-3.5 w-3.5 mr-1" />Check Limits
          </Button>
        </div>

        {profile && (
          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {profile.threads_profile_picture_url && <img src={profile.threads_profile_picture_url} className="h-12 w-12 rounded-full" alt="avatar" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{profile.name || profile.username}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                  {profile.threads_biography && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.threads_biography}</p>}
                </div>
                <ThreadsIcon className="h-5 w-5 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {publishingLimit && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-foreground mb-2">Publishing Limits</h4>
              <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-auto">{JSON.stringify(publishingLimit, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ===== PUBLISH ===== */}
      <TabsContent value="publish" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Create a Thread</h4>
            <p className="text-xs text-muted-foreground">Threads supports text, image, video, and carousel posts. No DMs — Threads is a public conversation platform.</p>

            {/* Media type selector */}
            <div className="flex gap-1.5">
              {(["text", "image", "video", "carousel"] as const).map(t => (
                <Button key={t} size="sm" variant={publishMediaType === t ? "default" : "outline"} onClick={() => setPublishMediaType(t)} className="text-xs capitalize">
                  {t === "text" && <MessageCircle className="h-3 w-3 mr-1" />}
                  {t === "image" && <Image className="h-3 w-3 mr-1" />}
                  {t === "video" && <Video className="h-3 w-3 mr-1" />}
                  {t === "carousel" && <Layers className="h-3 w-3 mr-1" />}
                  {t}
                </Button>
              ))}
            </div>

            <Textarea value={publishText} onChange={e => setPublishText(e.target.value)} placeholder="What's on your mind?" className="min-h-[80px] text-sm" maxLength={500} />
            <p className="text-[10px] text-muted-foreground text-right">{publishText.length}/500</p>

            {publishMediaType === "image" && (
              <Input value={publishImageUrl} onChange={e => setPublishImageUrl(e.target.value)} placeholder="Image URL (https://...)" className="text-xs" />
            )}
            {publishMediaType === "video" && (
              <Input value={publishVideoUrl} onChange={e => setPublishVideoUrl(e.target.value)} placeholder="Video URL (https://...)" className="text-xs" />
            )}
            {publishMediaType === "carousel" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Add 2-20 media items (images or videos)</p>
                {carouselItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={item.media_type} onChange={e => { const items = [...carouselItems]; items[i].media_type = e.target.value; setCarouselItems(items); }} className="text-xs bg-muted rounded px-2 py-1 border border-border">
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                    </select>
                    <Input value={item.image_url || item.video_url || ""} onChange={e => { const items = [...carouselItems]; if (item.media_type === "IMAGE") items[i].image_url = e.target.value; else items[i].video_url = e.target.value; setCarouselItems(items); }} placeholder={`${item.media_type === "IMAGE" ? "Image" : "Video"} URL`} className="text-xs flex-1" />
                    {carouselItems.length > 2 && <Button size="sm" variant="ghost" onClick={() => setCarouselItems(prev => prev.filter((_, j) => j !== i))} className="h-7 w-7 p-0"><Trash2 className="h-3 w-3 text-red-400" /></Button>}
                  </div>
                ))}
                {carouselItems.length < 20 && <Button size="sm" variant="outline" onClick={() => setCarouselItems(prev => [...prev, { media_type: "IMAGE", image_url: "" }])} className="text-xs">+ Add Item</Button>}
              </div>
            )}

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-2">
              <Input value={publishLinkAttachment} onChange={e => setPublishLinkAttachment(e.target.value)} placeholder="Link attachment (optional)" className="text-xs" />
              <Input value={publishQuotePostId} onChange={e => setPublishQuotePostId(e.target.value)} placeholder="Quote post ID (optional)" className="text-xs" />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Reply control:</label>
              <select value={publishReplyControl} onChange={e => setPublishReplyControl(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
                <option value="everyone">Everyone</option>
                <option value="accounts_you_follow">Accounts you follow</option>
                <option value="mentioned_only">Mentioned only</option>
              </select>
            </div>

            <Button onClick={publishThread} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Publish Thread
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== MY THREADS ===== */}
      <TabsContent value="threads" className="space-y-4 mt-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchThreads()} disabled={loading} className="text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Load Threads
          </Button>
        </div>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {threads.map(t => (
              <Card key={t.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-3">{t.text || "(media only)"}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span>@{t.username}</span>
                        <span>·</span>
                        <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                        {t.media_type && t.media_type !== "TEXT_POST" && <Badge variant="outline" className="text-[9px] py-0 px-1">{t.media_type}</Badge>}
                        {t.is_quote_post && <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-400/30 text-purple-400">Quote</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {t.permalink && <a href={t.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>}
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedThreadId(t.id); setReplyToThreadId(t.id); setActiveTab("replies"); }} className="h-6 px-1.5"><MessageSquare className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteThread(t.id)} className="h-6 px-1.5 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  {t.media_url && (
                    <div className="mt-2">
                      {t.media_type === "IMAGE" ? (
                        <img src={t.media_url} className="rounded max-h-40 object-cover" alt="" />
                      ) : t.media_type === "VIDEO" ? (
                        <video src={t.media_url} controls className="rounded max-h-40" />
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {threads.length === 0 && !loading && <p className="text-xs text-muted-foreground text-center py-8">No threads yet. Publish your first one!</p>}
          </div>
        </ScrollArea>
        {threadsCursor && <Button size="sm" variant="outline" onClick={() => fetchThreads(threadsCursor)} disabled={loading}>Load More</Button>}
      </TabsContent>

      {/* ===== REPLIES ===== */}
      <TabsContent value="replies" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Manage Replies</h4>
            <p className="text-xs text-muted-foreground">View, reply to, hide, and manage replies on your threads. Threads doesn't have DMs — conversations happen publicly through replies.</p>
            <div className="flex gap-2">
              <Input value={selectedThreadId} onChange={e => setSelectedThreadId(e.target.value)} placeholder="Thread ID to view replies" className="text-xs flex-1" />
              <Button size="sm" onClick={fetchReplies} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}Fetch
              </Button>
            </div>

            {/* Reply form */}
            <div className="flex gap-2">
              <Input value={replyToThreadId} onChange={e => setReplyToThreadId(e.target.value)} placeholder="Reply to thread ID" className="text-xs flex-1" />
              <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Your reply..." className="text-xs flex-1" />
              <Button size="sm" onClick={replyToThread} disabled={loading || !replyText}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>

            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {replies.map(r => (
                  <div key={r.id} className="bg-muted/30 rounded p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">@{r.username}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.text}</p>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setReplyToThreadId(r.id); }} className="h-6 px-1.5 text-xs"><Send className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => hideReply(r.id, true)} className="h-6 px-1.5 text-xs text-amber-400"><Eye className="h-3 w-3" /></Button>
                        {r.permalink && <a href={r.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground" /></a>}
                      </div>
                    </div>
                  </div>
                ))}
                {replies.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No replies found</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== MENTIONS ===== */}
      <TabsContent value="mentions" className="space-y-4 mt-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchMentions} disabled={loading} className="text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Load Mentions
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">See where you've been mentioned across Threads. Reply directly from here.</p>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {mentions.map(m => (
              <Card key={m.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">@{m.username}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.text}</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setReplyToThreadId(m.id); setActiveTab("replies"); }} className="h-6 px-1.5"><Send className="h-3 w-3" /></Button>
                      {m.permalink && <a href={m.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground" /></a>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {mentions.length === 0 && !loading && <p className="text-xs text-muted-foreground text-center py-8">No mentions yet</p>}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ===== SEARCH ===== */}
      <TabsContent value="search" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Keyword Search</h4>
            <p className="text-xs text-muted-foreground">Search public threads by keyword. Find conversations, trends, and opportunities to engage.</p>
            <div className="flex gap-2">
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search threads..." className="text-xs flex-1" onKeyDown={e => e.key === "Enter" && searchThreads()} />
              <Button size="sm" onClick={searchThreads} disabled={loading || !searchQuery}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}Search
              </Button>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {searchResults.map(r => (
                  <div key={r.id} className="bg-muted/30 rounded p-2.5">
                    <p className="text-xs font-semibold text-foreground">@{r.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setReplyToThreadId(r.id); setActiveTab("replies"); }} className="h-5 px-1.5 text-[10px]"><Send className="h-3 w-3 mr-0.5" />Reply</Button>
                      {r.permalink && <a href={r.permalink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:underline">View</a>}
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery && !loading && <p className="text-xs text-muted-foreground text-center py-4">No results</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== INSIGHTS ===== */}
      <TabsContent value="insights" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User insights */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Account Insights</h4>
              <div className="flex gap-2">
                <select value={insightsPeriod} onChange={e => setInsightsPeriod(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
                  <option value="last_7_days">Last 7 days</option>
                  <option value="last_30_days">Last 30 days</option>
                  <option value="last_90_days">Last 90 days</option>
                </select>
                <Button size="sm" onClick={fetchUserInsights} disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}Fetch
                </Button>
              </div>
              {userInsights && (
                <div className="space-y-2">
                  {(userInsights.data || []).map((m: any) => (
                    <div key={m.name} className="flex items-center justify-between bg-muted/30 rounded p-2">
                      <span className="text-xs text-muted-foreground capitalize">{m.name?.replace(/_/g, " ")}</span>
                      <span className="text-xs font-bold text-foreground">{Array.isArray(m.values) ? m.values[0]?.value?.toLocaleString() || "—" : "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Thread insights */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Thread Insights</h4>
              <div className="flex gap-2">
                <Input value={threadInsightsId} onChange={e => setThreadInsightsId(e.target.value)} placeholder="Thread ID" className="text-xs flex-1" />
                <Button size="sm" onClick={fetchThreadInsights} disabled={loading || !threadInsightsId}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}Fetch
                </Button>
              </div>
              {threadInsights && (
                <div className="grid grid-cols-2 gap-2">
                  {(threadInsights.data || []).map((m: any) => (
                    <div key={m.name} className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-sm font-bold text-foreground">{Array.isArray(m.values) ? m.values[0]?.value?.toLocaleString() || "0" : "0"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{m.name?.replace(/_/g, " ")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ===== AI TOOLS ===== */}
      <TabsContent value="ai-tools" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <h4 className="text-sm font-semibold text-foreground">AI Thread Generator</h4>
              </div>
              <p className="text-xs text-muted-foreground">Generate engaging thread text optimized for Threads' 500-char limit and conversational tone.</p>
              <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Topic or idea..." className="text-xs" />
              <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic} className="w-full">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}Generate
              </Button>
              {aiCaptionResult && (
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => { setPublishText(aiCaptionResult); setActiveTab("publish"); toast.success("Copied to publisher"); }} className="text-xs"><ArrowRight className="h-3 w-3 mr-1" />Use</Button>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }} className="text-xs"><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <h4 className="text-sm font-semibold text-foreground">Content Analyzer</h4>
              </div>
              <p className="text-xs text-muted-foreground">Analyze your thread text for engagement potential, tone, and improvements.</p>
              <Textarea value={aiAnalyzeText} onChange={e => setAiAnalyzeText(e.target.value)} placeholder="Paste your thread text..." className="text-xs min-h-[60px]" />
              <Button size="sm" onClick={analyzeContent} disabled={loading || !aiAnalyzeText} className="w-full">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Brain className="h-3.5 w-3.5 mr-1" />}Analyze
              </Button>
              {aiAnalyzeResult && (
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiAnalyzeResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ThreadsAutomationSuite;

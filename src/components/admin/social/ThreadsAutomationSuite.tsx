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
  AlertCircle, Repeat2, BarChart, EyeOff, MapPin, FileText,
  Clock, ChevronDown, Filter, User,
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

  // User replies
  const [userReplies, setUserReplies] = useState<any[]>([]);

  // Publish
  const [publishText, setPublishText] = useState("");
  const [publishImageUrl, setPublishImageUrl] = useState("");
  const [publishVideoUrl, setPublishVideoUrl] = useState("");
  const [publishMediaType, setPublishMediaType] = useState<"text" | "image" | "video" | "carousel">("text");
  const [publishReplyControl, setPublishReplyControl] = useState("everyone");
  const [publishLinkAttachment, setPublishLinkAttachment] = useState("");
  const [publishQuotePostId, setPublishQuotePostId] = useState("");
  const [publishTopicTag, setPublishTopicTag] = useState("");
  const [publishAltText, setPublishAltText] = useState("");
  const [publishIsSpoiler, setPublishIsSpoiler] = useState(false);
  const [publishEnableApprovals, setPublishEnableApprovals] = useState(false);
  const [publishPollEnabled, setPublishPollEnabled] = useState(false);
  const [publishPollOptions, setPublishPollOptions] = useState(["", ""]);
  const [publishGifId, setPublishGifId] = useState("");
  const [carouselItems, setCarouselItems] = useState<Array<{ media_type: string; image_url?: string; video_url?: string; alt_text?: string }>>([{ media_type: "IMAGE", image_url: "" }]);

  // Replies
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyToThreadId, setReplyToThreadId] = useState("");

  // Pending replies
  const [pendingReplies, setPendingReplies] = useState<any[]>([]);
  const [pendingThreadId, setPendingThreadId] = useState("");

  // Mentions
  const [mentions, setMentions] = useState<any[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchType, setSearchType] = useState("TOP");
  const [searchMode, setSearchMode] = useState("KEYWORD");
  const [searchMediaType, setSearchMediaType] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");

  // Profile Discovery
  const [discoveryUsername, setDiscoveryUsername] = useState("");
  const [discoveredProfile, setDiscoveredProfile] = useState<any>(null);

  // Insights
  const [threadInsightsId, setThreadInsightsId] = useState("");
  const [threadInsights, setThreadInsights] = useState<any>(null);
  const [userInsights, setUserInsights] = useState<any>(null);
  const [insightsMetric, setInsightsMetric] = useState("views,likes,replies,reposts,quotes,followers_count");
  const [insightsBreakdown, setInsightsBreakdown] = useState("");

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
      const { data } = await supabase.from("social_connections").select("id").eq("account_id", selectedAccount).eq("platform", "threads").eq("is_connected", true).maybeSingle();
      setThreadsConnected(!!data);
    };
    check();
    const channel = supabase.channel(`threads-conn-status-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections", filter: `account_id=eq.${selectedAccount}` }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("threads-api", { body: { action, account_id: selectedAccount, params } });
      if (error) { toast.info(error.message || "Threads action could not be completed"); return null; }
      if (!data?.success) { toast.info(data?.error || "Threads action could not be completed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message || "Threads API unavailable"); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  // === HANDLERS ===
  const fetchProfile = async () => { const d = await callApi("get_profile"); if (d) { setProfile(d); toast.success("Profile synced"); } };
  const fetchThreads = async (cursor?: string) => {
    const d = await callApi("get_threads", { limit: 25, after: cursor });
    if (d?.data) { setThreads(prev => cursor ? [...prev, ...d.data] : d.data); setThreadsCursor(d.paging?.cursors?.after || null); }
  };
  const fetchUserReplies = async () => { const d = await callApi("get_user_replies", { limit: 25 }); if (d?.data) setUserReplies(d.data); };
  const deleteThread = async (id: string) => { const d = await callApi("delete_thread", { thread_id: id }); if (d) { toast.success("Deleted"); setThreads(p => p.filter(t => t.id !== id)); } };
  const repostThread = async (id: string) => { const d = await callApi("repost", { thread_id: id }); if (d?.id) toast.success("Reposted!"); };

  const publishThread = async () => {
    if (!publishText && publishMediaType === "text" && !publishPollEnabled) { toast.error("Enter text"); return; }
    const common: any = {
      reply_control: publishReplyControl,
      topic_tag: publishTopicTag || undefined,
      quote_post_id: publishQuotePostId || undefined,
      enable_reply_approvals: publishEnableApprovals || undefined,
      is_spoiler: publishIsSpoiler || undefined,
    };
    let d: any;
    switch (publishMediaType) {
      case "text": {
        const p: any = { text: publishText, ...common, link_attachment: publishLinkAttachment || undefined };
        if (publishGifId) p.gif_attachment = { gif_id: publishGifId, provider: "TENOR" };
        if (publishPollEnabled) {
          const poll: any = {};
          if (publishPollOptions[0]) poll.option_a = publishPollOptions[0];
          if (publishPollOptions[1]) poll.option_b = publishPollOptions[1];
          if (publishPollOptions[2]) poll.option_c = publishPollOptions[2];
          if (publishPollOptions[3]) poll.option_d = publishPollOptions[3];
          p.poll_attachment = poll;
        }
        d = await callApi("create_text_thread", p);
        break;
      }
      case "image":
        if (!publishImageUrl) { toast.error("Enter image URL"); return; }
        d = await callApi("create_image_thread", { text: publishText, image_url: publishImageUrl, alt_text: publishAltText || undefined, ...common });
        break;
      case "video":
        if (!publishVideoUrl) { toast.error("Enter video URL"); return; }
        d = await callApi("create_video_thread", { text: publishText, video_url: publishVideoUrl, alt_text: publishAltText || undefined, ...common });
        break;
      case "carousel":
        const validItems = carouselItems.filter(i => i.image_url || i.video_url);
        if (validItems.length < 2) { toast.error("Min 2 items"); return; }
        d = await callApi("create_carousel_thread", { text: publishText, items: validItems, ...common });
        break;
    }
    if (d?.id) { toast.success("Published!"); setPublishText(""); setPublishImageUrl(""); setPublishVideoUrl(""); setPublishQuotePostId(""); setPublishLinkAttachment(""); setPublishTopicTag(""); setPublishAltText(""); setPublishGifId(""); setPublishIsSpoiler(false); setPublishEnableApprovals(false); setPublishPollEnabled(false); setPublishPollOptions(["", ""]); fetchThreads(); }
  };

  const fetchReplies = async () => { if (!selectedThreadId) return; const d = await callApi("get_replies", { thread_id: selectedThreadId, limit: 25 }); if (d?.data) setReplies(d.data); };
  const replyToThread = async () => { if (!replyText || !replyToThreadId) return; const d = await callApi("create_text_thread", { text: replyText, reply_to_id: replyToThreadId }); if (d?.id) { toast.success("Replied!"); setReplyText(""); fetchReplies(); } };
  const hideReply = async (id: string, hide: boolean) => { await callApi("hide_reply", { reply_id: id, hide }); toast.success(hide ? "Hidden" : "Unhidden"); fetchReplies(); };

  const fetchPendingReplies = async () => { if (!pendingThreadId) return; const d = await callApi("get_pending_replies", { thread_id: pendingThreadId }); if (d?.data) setPendingReplies(d.data); };
  const managePendingReply = async (id: string, approve: boolean) => { await callApi("manage_pending_reply", { reply_id: id, approve }); toast.success(approve ? "Approved" : "Ignored"); fetchPendingReplies(); };

  const fetchMentions = async () => { const d = await callApi("get_mentions", { limit: 25 }); if (d?.data) setMentions(d.data); };

  const searchThreads = async () => {
    if (!searchQuery) return;
    const p: any = { query: searchQuery, search_type: searchType, search_mode: searchMode, limit: 25 };
    if (searchMediaType) p.media_type = searchMediaType;
    if (searchAuthor) p.author_username = searchAuthor;
    const d = await callApi("keyword_search", p);
    if (d?.data) setSearchResults(d.data);
  };

  const discoverProfile = async () => {
    if (!discoveryUsername) return;
    const d = await callApi("discover_profile", { username: discoveryUsername });
    if (d) setDiscoveredProfile(d);
  };

  const fetchThreadInsights = async () => { if (!threadInsightsId) return; const d = await callApi("get_thread_insights", { thread_id: threadInsightsId }); if (d) setThreadInsights(d); };
  const fetchUserInsights = async () => {
    const p: any = { metric: insightsMetric };
    if (insightsBreakdown) p.breakdown = insightsBreakdown;
    const d = await callApi("get_user_insights", p);
    if (d) setUserInsights(d);
  };
  const fetchPublishingLimit = async () => { const d = await callApi("get_publishing_limit"); if (d) setPublishingLimit(d); };
  const refreshToken = async () => { const d = await callApi("refresh_token"); if (d?.access_token) toast.success("Token refreshed"); else toast.error("Failed — reconnect"); };

  const generateCaption = async () => {
    if (!aiCaptionTopic) return; setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", { body: { action: "generate_caption", account_id: selectedAccount, params: { topic: aiCaptionTopic, platform: "threads", include_cta: true, max_length: 500 } } });
      if (error) throw error;
      if (data?.success && data.data) setAiCaptionResult(data.data.caption);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  const analyzeContent = async () => {
    if (!aiAnalyzeText) return; setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", { body: { action: "analyze_content", account_id: selectedAccount, params: { caption: aiAnalyzeText, platform: "threads" } } });
      if (error) throw error;
      if (data?.success && data.data) setAiAnalyzeResult(data.data.analysis || JSON.stringify(data.data));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  if (threadsConnected === null) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!threadsConnected) return (
    <Card className="border-purple-500/20 bg-card/50"><CardContent className="p-8 text-center space-y-4">
      <ThreadsIcon className="h-12 w-12 mx-auto text-purple-400" />
      <h3 className="text-lg font-bold text-foreground">Connect Threads to Get Started</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">Link your Threads account to publish posts, manage replies, track insights, search content, and automate your presence.</p>
      <Button onClick={onNavigateToConnect} className="mt-2"><ArrowRight className="h-4 w-4 mr-2" />Go to Connect</Button>
    </CardContent></Card>
  );

  const TABS = [
    { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
    { v: "publish", icon: Send, l: "Publish" },
    { v: "threads", icon: MessageCircle, l: "My Threads" },
    { v: "replies", icon: MessageSquare, l: "Replies" },
    { v: "mentions", icon: AtSign, l: "Mentions" },
    { v: "search", icon: Search, l: "Search" },
    { v: "discover", icon: Globe, l: "Discover" },
    { v: "insights", icon: BarChart3, l: "Insights" },
    { v: "ai-tools", icon: Wand2, l: "AI Tools" },
  ];

  const ThreadCard = ({ t, showActions = true }: { t: any; showActions?: boolean }) => (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {t.profile_picture_url && <img src={t.profile_picture_url} className="h-5 w-5 rounded-full" alt="" />}
              <span className="text-xs font-semibold text-foreground">@{t.username}</span>
              {t.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
              {t.topic_tag && <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-400/30 text-purple-400">#{t.topic_tag}</Badge>}
            </div>
            <p className="text-xs text-foreground line-clamp-3">{t.text || "(media only)"}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
              <span>{new Date(t.timestamp).toLocaleDateString()}</span>
              {t.media_type && t.media_type !== "TEXT_POST" && <Badge variant="outline" className="text-[9px] py-0 px-1">{t.media_type}</Badge>}
              {t.is_quote_post && <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-400/30 text-purple-400">Quote</Badge>}
              {t.media_type === "REPOST_FACADE" && <Badge variant="outline" className="text-[9px] py-0 px-1 border-green-400/30 text-green-400">Repost</Badge>}
              {t.poll_attachment && <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-400/30 text-amber-400">Poll</Badge>}
              {t.gif_url && <Badge variant="outline" className="text-[9px] py-0 px-1">GIF</Badge>}
              {t.has_replies && <Badge variant="outline" className="text-[9px] py-0 px-1">Has replies</Badge>}
            </div>
          </div>
          {showActions && (
            <div className="flex gap-1 flex-shrink-0">
              {t.permalink && <a href={t.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>}
              <Button size="sm" variant="ghost" onClick={() => repostThread(t.id)} className="h-6 px-1.5" title="Repost"><Repeat2 className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setPublishQuotePostId(t.id); setActiveTab("publish"); toast.info("Quote post ID set"); }} className="h-6 px-1.5" title="Quote"><Quote className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedThreadId(t.id); setReplyToThreadId(t.id); setActiveTab("replies"); }} className="h-6 px-1.5"><MessageSquare className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setThreadInsightsId(t.id); setActiveTab("insights"); }} className="h-6 px-1.5"><BarChart className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => deleteThread(t.id)} className="h-6 px-1.5 text-red-400"><Trash2 className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        {t.media_url && (
          <div className="mt-2">
            {t.media_type === "IMAGE" ? <img src={t.media_url} className="rounded max-h-40 object-cover" alt={t.alt_text || ""} /> :
             t.media_type === "VIDEO" ? <video src={t.media_url} controls className="rounded max-h-40" /> : null}
          </div>
        )}
        {t.gif_url && <img src={t.gif_url} className="rounded max-h-32 mt-2" alt="GIF" />}
        {t.poll_attachment && (
          <div className="mt-2 space-y-1">
            {["option_a", "option_b", "option_c", "option_d"].map(k => t.poll_attachment[k] ? (
              <div key={k} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1">
                <span className="text-xs text-foreground flex-1">{t.poll_attachment[k]}</span>
                {t.poll_attachment[`${k}_votes_percentage`] != null && <span className="text-[10px] text-muted-foreground">{(t.poll_attachment[`${k}_votes_percentage`] * 100).toFixed(0)}%</span>}
              </div>
            ) : null)}
            {t.poll_attachment.total_votes != null && <p className="text-[10px] text-muted-foreground">{t.poll_attachment.total_votes} votes</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );

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
          <Button size="sm" variant="outline" onClick={fetchProfile} disabled={loading} className="text-foreground"><RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Sync Profile</Button>
          <Button size="sm" variant="outline" onClick={refreshToken} disabled={loading} className="text-foreground"><Shield className="h-3.5 w-3.5 mr-1" />Refresh Token</Button>
          <Button size="sm" variant="outline" onClick={fetchPublishingLimit} disabled={loading} className="text-foreground"><Activity className="h-3.5 w-3.5 mr-1" />Check Limits</Button>
        </div>
        {profile && (
          <Card className="border-purple-500/20"><CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {profile.threads_profile_picture_url && <img src={profile.threads_profile_picture_url} className="h-12 w-12 rounded-full" alt="avatar" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground truncate">{profile.name || profile.username}</p>
                  {profile.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                </div>
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
                {profile.threads_biography && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.threads_biography}</p>}
              </div>
              <ThreadsIcon className="h-5 w-5 text-purple-400" />
            </div>
          </CardContent></Card>
        )}
        {publishingLimit && (
          <Card><CardContent className="p-4">
            <h4 className="text-xs font-semibold text-foreground mb-2">Publishing Limits (250/24h)</h4>
            <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-auto">{JSON.stringify(publishingLimit, null, 2)}</pre>
          </CardContent></Card>
        )}
      </TabsContent>

      {/* ===== PUBLISH ===== */}
      <TabsContent value="publish" className="space-y-4 mt-4">
        <Card><CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Create a Thread</h4>
          <p className="text-xs text-muted-foreground">Text (500 chars), Image, Video, or Carousel (2-20 items). Supports polls, GIFs, topic tags, spoilers, quote posts, reply approvals, and link attachments.</p>

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
            <div className="space-y-2">
              <Input value={publishImageUrl} onChange={e => setPublishImageUrl(e.target.value)} placeholder="Image URL (https://...)" className="text-xs" />
              <Input value={publishAltText} onChange={e => setPublishAltText(e.target.value)} placeholder="Alt text for accessibility (optional)" className="text-xs" />
            </div>
          )}
          {publishMediaType === "video" && (
            <div className="space-y-2">
              <Input value={publishVideoUrl} onChange={e => setPublishVideoUrl(e.target.value)} placeholder="Video URL (https://... MP4/MOV, max 5min)" className="text-xs" />
              <Input value={publishAltText} onChange={e => setPublishAltText(e.target.value)} placeholder="Alt text for accessibility (optional)" className="text-xs" />
            </div>
          )}
          {publishMediaType === "carousel" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">2-20 media items. Each can have alt text.</p>
              {carouselItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={item.media_type} onChange={e => { const items = [...carouselItems]; items[i].media_type = e.target.value; setCarouselItems(items); }} className="text-xs bg-muted rounded px-2 py-1 border border-border">
                    <option value="IMAGE">Image</option><option value="VIDEO">Video</option>
                  </select>
                  <Input value={item.image_url || item.video_url || ""} onChange={e => { const items = [...carouselItems]; if (item.media_type === "IMAGE") items[i].image_url = e.target.value; else items[i].video_url = e.target.value; setCarouselItems(items); }} placeholder="URL" className="text-xs flex-1" />
                  {carouselItems.length > 2 && <Button size="sm" variant="ghost" onClick={() => setCarouselItems(p => p.filter((_, j) => j !== i))} className="h-7 w-7 p-0"><Trash2 className="h-3 w-3 text-red-400" /></Button>}
                </div>
              ))}
              {carouselItems.length < 20 && <Button size="sm" variant="outline" onClick={() => setCarouselItems(p => [...p, { media_type: "IMAGE", image_url: "" }])} className="text-xs">+ Add Item</Button>}
            </div>
          )}

          {/* Advanced options */}
          <div className="grid grid-cols-2 gap-2">
            <Input value={publishTopicTag} onChange={e => setPublishTopicTag(e.target.value)} placeholder="Topic tag (optional, max 50 chars)" className="text-xs" maxLength={50} />
            <Input value={publishLinkAttachment} onChange={e => setPublishLinkAttachment(e.target.value)} placeholder="Link attachment URL (text only)" className="text-xs" />
            <Input value={publishQuotePostId} onChange={e => setPublishQuotePostId(e.target.value)} placeholder="Quote post ID (optional)" className="text-xs" />
            <Input value={publishGifId} onChange={e => setPublishGifId(e.target.value)} placeholder="Tenor GIF ID (text only)" className="text-xs" />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Reply control:</label>
              <select value={publishReplyControl} onChange={e => setPublishReplyControl(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
                <option value="everyone">Everyone</option>
                <option value="accounts_you_follow">Following</option>
                <option value="mentioned_only">Mentioned only</option>
                <option value="parent_post_author_only">Author only</option>
                <option value="followers_only">Followers only</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><Switch checked={publishIsSpoiler} onCheckedChange={setPublishIsSpoiler} className="scale-75" />Spoiler</label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><Switch checked={publishEnableApprovals} onCheckedChange={setPublishEnableApprovals} className="scale-75" />Reply approvals</label>
            {publishMediaType === "text" && <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><Switch checked={publishPollEnabled} onCheckedChange={setPublishPollEnabled} className="scale-75" />Poll</label>}
          </div>

          {publishPollEnabled && publishMediaType === "text" && (
            <div className="space-y-1.5 bg-muted/30 rounded p-3">
              <p className="text-xs font-semibold text-foreground">Poll Options (2-4, max 25 chars each)</p>
              {publishPollOptions.map((opt, i) => (
                <Input key={i} value={opt} onChange={e => { const o = [...publishPollOptions]; o[i] = e.target.value; setPublishPollOptions(o); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="text-xs" maxLength={25} />
              ))}
              <div className="flex gap-2">
                {publishPollOptions.length < 4 && <Button size="sm" variant="outline" onClick={() => setPublishPollOptions(p => [...p, ""])} className="text-xs">+ Option</Button>}
                {publishPollOptions.length > 2 && <Button size="sm" variant="ghost" onClick={() => setPublishPollOptions(p => p.slice(0, -1))} className="text-xs text-red-400">Remove</Button>}
              </div>
            </div>
          )}

          <Button onClick={publishThread} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Publish Thread
          </Button>
        </CardContent></Card>
      </TabsContent>

      {/* ===== MY THREADS ===== */}
      <TabsContent value="threads" className="space-y-4 mt-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchThreads()} disabled={loading} className="text-foreground"><RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Load Threads</Button>
          <Button size="sm" variant="outline" onClick={fetchUserReplies} disabled={loading} className="text-foreground"><MessageSquare className="h-3.5 w-3.5 mr-1" />My Replies</Button>
        </div>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {threads.map(t => <ThreadCard key={t.id} t={t} />)}
            {threads.length === 0 && !loading && <p className="text-xs text-muted-foreground text-center py-8">No threads yet</p>}
          </div>
        </ScrollArea>
        {threadsCursor && <Button size="sm" variant="outline" onClick={() => fetchThreads(threadsCursor)} disabled={loading}>Load More</Button>}

        {userReplies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Your Replies</h4>
            {userReplies.map(r => <ThreadCard key={r.id} t={r} />)}
          </div>
        )}
      </TabsContent>

      {/* ===== REPLIES ===== */}
      <TabsContent value="replies" className="space-y-4 mt-4">
        <Card><CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Manage Replies</h4>
          <p className="text-xs text-muted-foreground">View, reply, hide/unhide, and manage reply approvals. Threads is public — no DMs.</p>
          <div className="flex gap-2">
            <Input value={selectedThreadId} onChange={e => setSelectedThreadId(e.target.value)} placeholder="Thread ID to view replies" className="text-xs flex-1" />
            <Button size="sm" onClick={fetchReplies} disabled={loading}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}Fetch</Button>
          </div>
          <div className="flex gap-2">
            <Input value={replyToThreadId} onChange={e => setReplyToThreadId(e.target.value)} placeholder="Reply to thread ID" className="text-xs flex-1" />
            <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Your reply..." className="text-xs flex-1" />
            <Button size="sm" onClick={replyToThread} disabled={loading || !replyText}><Send className="h-3.5 w-3.5" /></Button>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {replies.map(r => (
                <div key={r.id} className="bg-muted/30 rounded p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-foreground">@{r.username}</p>
                        {r.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                        {r.hide_status === "HUSHED" && <Badge variant="outline" className="text-[9px] py-0 px-1 text-amber-400">Hidden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.text}</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setReplyToThreadId(r.id)} className="h-6 px-1.5"><Send className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => hideReply(r.id, r.hide_status !== "HUSHED")} className="h-6 px-1.5" title={r.hide_status === "HUSHED" ? "Unhide" : "Hide"}>
                        {r.hide_status === "HUSHED" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                      {r.permalink && <a href={r.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground" /></a>}
                    </div>
                  </div>
                </div>
              ))}
              {replies.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No replies found</p>}
            </div>
          </ScrollArea>

          {/* Pending Replies */}
          <div className="border-t border-border/50 pt-3 mt-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Pending Reply Approvals</h4>
            <div className="flex gap-2">
              <Input value={pendingThreadId} onChange={e => setPendingThreadId(e.target.value)} placeholder="Thread ID with reply approvals" className="text-xs flex-1" />
              <Button size="sm" onClick={fetchPendingReplies} disabled={loading}><Clock className="h-3.5 w-3.5 mr-1" />Fetch</Button>
            </div>
            {pendingReplies.map(r => (
              <div key={r.id} className="bg-amber-500/5 border border-amber-500/20 rounded p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">@{r.username}</p>
                    <p className="text-xs text-muted-foreground">{r.text}</p>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 mt-1">{r.reply_approval_status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => managePendingReply(r.id, true)} className="h-6 px-2 text-xs text-green-400">Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => managePendingReply(r.id, false)} className="h-6 px-2 text-xs text-amber-400">Ignore</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </TabsContent>

      {/* ===== MENTIONS ===== */}
      <TabsContent value="mentions" className="space-y-4 mt-4">
        <Button size="sm" variant="outline" onClick={fetchMentions} disabled={loading} className="text-foreground"><RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Load Mentions</Button>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {mentions.map(m => <ThreadCard key={m.id} t={m} />)}
            {mentions.length === 0 && !loading && <p className="text-xs text-muted-foreground text-center py-8">No mentions yet</p>}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ===== SEARCH ===== */}
      <TabsContent value="search" className="space-y-4 mt-4">
        <Card><CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Keyword & Topic Search</h4>
          <p className="text-xs text-muted-foreground">Search public threads by keyword or topic tag. 2,200 queries/24h limit.</p>
          <div className="flex gap-2">
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="text-xs flex-1" onKeyDown={e => e.key === "Enter" && searchThreads()} />
            <Button size="sm" onClick={searchThreads} disabled={loading || !searchQuery}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}Search</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={searchType} onChange={e => setSearchType(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
              <option value="TOP">Top</option><option value="RECENT">Recent</option>
            </select>
            <select value={searchMode} onChange={e => setSearchMode(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
              <option value="KEYWORD">Keyword</option><option value="TAG">Topic Tag</option>
            </select>
            <select value={searchMediaType} onChange={e => setSearchMediaType(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
              <option value="">All media</option><option value="TEXT">Text</option><option value="IMAGE">Image</option><option value="VIDEO">Video</option>
            </select>
            <Input value={searchAuthor} onChange={e => setSearchAuthor(e.target.value)} placeholder="Filter by author" className="text-xs w-32" />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {searchResults.map(r => (
                <div key={r.id} className="bg-muted/30 rounded p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-foreground">@{r.username}</span>
                    {r.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                    {r.topic_tag && <Badge variant="outline" className="text-[9px] py-0 px-1">#{r.topic_tag}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setReplyToThreadId(r.id); setActiveTab("replies"); }} className="h-5 px-1.5 text-[10px]"><Send className="h-3 w-3 mr-0.5" />Reply</Button>
                    <Button size="sm" variant="ghost" onClick={() => repostThread(r.id)} className="h-5 px-1.5 text-[10px]"><Repeat2 className="h-3 w-3 mr-0.5" />Repost</Button>
                    {r.permalink && <a href={r.permalink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:underline">View</a>}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !loading && <p className="text-xs text-muted-foreground text-center py-4">No results</p>}
            </div>
          </ScrollArea>
        </CardContent></Card>
      </TabsContent>

      {/* ===== DISCOVER (Profile Lookup) ===== */}
      <TabsContent value="discover" className="space-y-4 mt-4">
        <Card><CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Profile Discovery</h4>
          <p className="text-xs text-muted-foreground">Look up any public Threads profile by username. Requires 100+ followers. 1,000 lookups/24h.</p>
          <div className="flex gap-2">
            <Input value={discoveryUsername} onChange={e => setDiscoveryUsername(e.target.value)} placeholder="Username (exact match, no @)" className="text-xs flex-1" onKeyDown={e => e.key === "Enter" && discoverProfile()} />
            <Button size="sm" onClick={discoverProfile} disabled={loading || !discoveryUsername}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <User className="h-3.5 w-3.5 mr-1" />}Lookup</Button>
          </div>
          {discoveredProfile && (
            <Card className="border-purple-500/20"><CardContent className="p-4">
              <div className="flex items-center gap-3">
                {discoveredProfile.profile_picture_url && <img src={discoveredProfile.profile_picture_url} className="h-14 w-14 rounded-full" alt="" />}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground">{discoveredProfile.name}</p>
                    {discoveredProfile.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground">@{discoveredProfile.username}</p>
                  {discoveredProfile.biography && <p className="text-xs text-muted-foreground mt-1">{discoveredProfile.biography}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {discoveredProfile.follower_count != null && <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{discoveredProfile.follower_count.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>}
                {discoveredProfile.views_count != null && <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{discoveredProfile.views_count.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views (7d)</p></div>}
                {discoveredProfile.likes_count != null && <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{discoveredProfile.likes_count.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes (7d)</p></div>}
                {discoveredProfile.reposts_count != null && <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{discoveredProfile.reposts_count.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Reposts (7d)</p></div>}
                {discoveredProfile.quotes_count != null && <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{discoveredProfile.quotes_count.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Quotes (7d)</p></div>}
              </div>
            </CardContent></Card>
          )}
        </CardContent></Card>
      </TabsContent>

      {/* ===== INSIGHTS ===== */}
      <TabsContent value="insights" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Account Insights</h4>
            <p className="text-xs text-muted-foreground">Metrics: views, likes, replies, reposts, quotes, followers_count, follower_demographics, clicks</p>
            <Input value={insightsMetric} onChange={e => setInsightsMetric(e.target.value)} placeholder="Metrics (comma-separated)" className="text-xs" />
            <div className="flex gap-2">
              <select value={insightsBreakdown} onChange={e => setInsightsBreakdown(e.target.value)} className="text-xs bg-muted rounded px-2 py-1 border border-border">
                <option value="">No breakdown</option><option value="country">Country</option><option value="city">City</option><option value="age">Age</option><option value="gender">Gender</option>
              </select>
              <Button size="sm" onClick={fetchUserInsights} disabled={loading}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}Fetch</Button>
            </div>
            {userInsights && (
              <div className="space-y-2">
                {(userInsights.data || []).map((m: any) => (
                  <div key={m.name} className="flex items-center justify-between bg-muted/30 rounded p-2">
                    <span className="text-xs text-muted-foreground capitalize">{m.name?.replace(/_/g, " ")}</span>
                    <span className="text-xs font-bold text-foreground">
                      {m.total_value?.value != null ? m.total_value.value.toLocaleString() : Array.isArray(m.values) ? m.values.map((v: any) => v.value).join(", ") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Thread Insights</h4>
            <p className="text-xs text-muted-foreground">views, likes, replies, reposts, quotes, shares</p>
            <div className="flex gap-2">
              <Input value={threadInsightsId} onChange={e => setThreadInsightsId(e.target.value)} placeholder="Thread ID" className="text-xs flex-1" />
              <Button size="sm" onClick={fetchThreadInsights} disabled={loading || !threadInsightsId}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}Fetch</Button>
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
          </CardContent></Card>
        </div>
      </TabsContent>

      {/* ===== AI TOOLS ===== */}
      <TabsContent value="ai-tools" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" /><h4 className="text-sm font-semibold text-foreground">AI Thread Generator</h4></div>
            <p className="text-xs text-muted-foreground">Generate thread text optimized for Threads' 500-char limit.</p>
            <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Topic or idea..." className="text-xs" />
            <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic} className="w-full">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}Generate</Button>
            {aiCaptionResult && (
              <div className="bg-muted/30 rounded p-3">
                <p className="text-xs text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => { setPublishText(aiCaptionResult); setActiveTab("publish"); toast.success("Copied to publisher"); }} className="text-xs"><ArrowRight className="h-3 w-3 mr-1" />Use</Button>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }} className="text-xs"><Copy className="h-3 w-3 mr-1" />Copy</Button>
                </div>
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" /><h4 className="text-sm font-semibold text-foreground">Content Analyzer</h4></div>
            <p className="text-xs text-muted-foreground">Analyze thread text for engagement potential.</p>
            <Textarea value={aiAnalyzeText} onChange={e => setAiAnalyzeText(e.target.value)} placeholder="Paste your thread text..." className="text-xs min-h-[60px]" />
            <Button size="sm" onClick={analyzeContent} disabled={loading || !aiAnalyzeText} className="w-full">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Brain className="h-3.5 w-3.5 mr-1" />}Analyze</Button>
            {aiAnalyzeResult && <div className="bg-muted/30 rounded p-3"><p className="text-xs text-foreground whitespace-pre-wrap">{aiAnalyzeResult}</p></div>}
          </CardContent></Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ThreadsAutomationSuite;

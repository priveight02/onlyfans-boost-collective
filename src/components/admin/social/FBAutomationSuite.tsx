import { useState, useCallback, useEffect } from "react";
import PlatformAccountSelector from "./PlatformAccountSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pullContentPlanForPlatform, pushToSocialHub, DEFAULT_BEST_TIMES, cloneAsTemplate, ContentPlanItem } from "@/lib/contentSync";
import {
  Send, RefreshCw, BarChart3, Users, Eye, Heart,
  ExternalLink, Loader2, Brain, Activity, Globe,
  MessageCircle, LayoutDashboard, Wand2, Megaphone, Copy,
  Target, Calendar, Trash2, Search, Image, Video,
  Layers, Link2, Hash, Shield, FileText, FolderOpen,
  MessageSquare, ArrowRight, Sparkles, Bot, CheckCircle2,
  AlertCircle, Clock, ThumbsUp, Share2, Play,
  UserPlus, BookOpen, Camera, Mail, Store, DollarSign, Briefcase, MousePointer,
} from "lucide-react";
import FBLiveVideoManager from "./FBLiveVideoManager";
import FBFundraisersManager from "./FBFundraisersManager";
import FBLeadsManager from "./FBLeadsManager";
import FBCommerceHub from "./FBCommerceHub";
import FBCreatorMarketplace from "./FBCreatorMarketplace";
import FBCTAManager from "./FBCTAManager";
import FBMarketingMessages from "./FBMarketingMessages";
import FBBusinessManager from "./FBBusinessManager";

const FacebookIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface Props {
  selectedAccount: string;
  onNavigateToConnect?: () => void;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const FBAutomationSuite = ({ selectedAccount: parentAccount, onNavigateToConnect, subTab: urlSubTab, onSubTabChange }: Props) => {
  const [activeTab, setActiveTabInternal] = useState(urlSubTab || "dashboard");
  const setActiveTab = (v: string) => { setActiveTabInternal(v); onSubTabChange?.(v); };
  const [platformAccountId, setPlatformAccountId] = useState(parentAccount);
  useEffect(() => { setPlatformAccountId(parentAccount); }, [parentAccount]);
  const selectedAccount = platformAccountId || parentAccount;
  useEffect(() => { if (urlSubTab && urlSubTab !== activeTab) setActiveTabInternal(urlSubTab); }, [urlSubTab]);
  const [loading, setLoading] = useState(false);
  const [fbConnected, setFbConnected] = useState<boolean | null>(null);

  // Profile
  const [profile, setProfile] = useState<any>(null);

  // Pages
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);

  // Feed / Posts
  const [feed, setFeed] = useState<any[]>([]);
  const [postMessage, setPostMessage] = useState("");
  const [postLink, setPostLink] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDescription, setVideoDescription] = useState("");

  // Single post details
  const [postDetailId, setPostDetailId] = useState("");
  const [postDetail, setPostDetail] = useState<any>(null);

  // Comments
  const [commentsObjectId, setCommentsObjectId] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Groups
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupFeed, setGroupFeed] = useState<any[]>([]);
  const [groupPostText, setGroupPostText] = useState("");

  // Events
  const [events, setEvents] = useState<any[]>([]);

  // Albums / Photos
  const [albums, setAlbums] = useState<any[]>([]);
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  // Conversations (Page Inbox)
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [inboxMessage, setInboxMessage] = useState("");

  // Page Insights
  const [pageInsights, setPageInsights] = useState<any>(null);
  const [insightsPeriod, setInsightsPeriod] = useState("day");

  // Post Insights
  const [postInsightsId, setPostInsightsId] = useState("");
  const [postInsights, setPostInsights] = useState<any>(null);

  // Search Pages
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // AI Tools
  const [aiCaptionTopic, setAiCaptionTopic] = useState("");
  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiAnalyzeText, setAiAnalyzeText] = useState("");
  const [aiAnalyzeResult, setAiAnalyzeResult] = useState("");

  // Schedule
  const [fbScheduledPosts, setFbScheduledPosts] = useState<any[]>([]);
  const [fbSchedCaption, setFbSchedCaption] = useState("");
  const [fbSchedMediaUrl, setFbSchedMediaUrl] = useState("");
  const [fbSchedDateTime, setFbSchedDateTime] = useState("");
  const [fbSchedPostType, setFbSchedPostType] = useState<"text" | "photo" | "video">("text");
  const [fbSchedAiGenerating, setFbSchedAiGenerating] = useState(false);

  // Import from Content Plan
  const [showFbImportPlan, setShowFbImportPlan] = useState(false);
  const [fbPlanItems, setFbPlanItems] = useState<ContentPlanItem[]>([]);
  const [fbImportingPlan, setFbImportingPlan] = useState(false);
  const [fbImportAutoSchedule, setFbImportAutoSchedule] = useState(true);

  const openFbImportPlan = async () => {
    setShowFbImportPlan(true);
    const items = await pullContentPlanForPlatform("facebook");
    setFbPlanItems(items);
  };

  const fbImportFromPlan = async () => {
    if (!selectedAccount || fbPlanItems.length === 0) return;
    setFbImportingPlan(true);
    try {
      const { created, errors } = await pushToSocialHub(fbPlanItems, selectedAccount, fbImportAutoSchedule, DEFAULT_BEST_TIMES.facebook);
      if (created > 0) {
        toast.success(`${created} posts imported from Content Plan`);
        const { data } = await supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "facebook").order("created_at", { ascending: false }).limit(50);
        if (data) setFbScheduledPosts(data);
      }
      if (errors.length > 0) toast.error(`${errors.length} failed`);
      setShowFbImportPlan(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setFbImportingPlan(false); }
  };

  const fbClonePost = async (id: string) => {
    const newId = await cloneAsTemplate(id, "social_posts");
    if (newId) toast.success("Cloned as template draft in Content Plan");
    else toast.error("Clone failed");
  };
  // Check connection
  useEffect(() => {
    if (!selectedAccount) { setFbConnected(false); return; }
    const check = async () => {
      const { data } = await supabase.from("social_connections").select("id").eq("account_id", selectedAccount).eq("platform", "facebook").eq("is_connected", true).maybeSingle();
      setFbConnected(!!data);
    };
    check();
    const channel = supabase.channel(`fb-conn-status-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections", filter: `account_id=eq.${selectedAccount}` }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  // Load scheduled posts
  useEffect(() => {
    if (!selectedAccount) return;
    supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "facebook").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setFbScheduledPosts(data); });
  }, [selectedAccount]);

  const scheduleFbPost = async () => {
    if (!fbSchedCaption && !fbSchedMediaUrl) { toast.error("Add caption or media"); return; }
    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount, platform: "facebook", post_type: fbSchedPostType,
      caption: fbSchedCaption, media_urls: fbSchedMediaUrl ? [fbSchedMediaUrl] : [],
      scheduled_at: fbSchedDateTime || null, status: fbSchedDateTime ? "scheduled" : "draft",
      metadata: { post_type: fbSchedPostType, page_id: selectedPage?.id },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Post scheduled!"); setFbSchedCaption(""); setFbSchedMediaUrl(""); setFbSchedDateTime("");
      const { data } = await supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "facebook").order("created_at", { ascending: false }).limit(50);
      if (data) setFbScheduledPosts(data);
    }
  };

  const generateFbScheduleCaption = async () => {
    if (!fbSchedCaption) { toast.error("Add a topic first"); return; }
    setFbSchedAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: fbSchedCaption, platform: "facebook", include_cta: true } },
      });
      if (error) throw error;
      if (data?.success && data.data?.caption) { setFbSchedCaption(data.data.caption); toast.success("AI caption generated!"); }
    } catch (e: any) { toast.error(e.message); }
    setFbSchedAiGenerating(false);
  };

  const deleteFbScheduledPost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted"); setFbScheduledPosts(prev => prev.filter(p => p.id !== id));
  };

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", { body: { action, account_id: selectedAccount, params } });
      if (error) { toast.info(error.message || "Facebook action could not be completed"); return null; }
      if (!data?.success) { toast.info(data?.error || "Facebook action could not be completed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message || "Facebook API unavailable"); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  // === HANDLERS ===
  const fetchProfile = async () => { const d = await callApi("get_profile"); if (d) { setProfile(d); toast.success("Profile synced"); } };
  const fetchPages = async () => { const d = await callApi("get_pages"); if (d?.data) { setPages(d.data); toast.success(`${d.data.length} pages loaded`); } };

  const fetchFeed = async (pageId?: string) => {
    const d = await callApi("get_feed", { page_id: pageId, limit: 25 });
    if (d?.data) setFeed(d.data);
  };

  const fetchPostDetail = async () => {
    if (!postDetailId) return;
    const d = await callApi("get_post", { post_id: postDetailId });
    if (d) { setPostDetail(d); toast.success("Post details loaded"); }
  };

  const createPost = async () => {
    if (!postMessage && !postLink) { toast.error("Enter a message or link"); return; }
    const d = await callApi("create_post", {
      page_id: selectedPage?.id, page_access_token: selectedPage?.access_token,
      message: postMessage, link: postLink || undefined,
    });
    if (d?.id) { toast.success("Post published!"); setPostMessage(""); setPostLink(""); fetchFeed(selectedPage?.id); }
  };

  const createPhotoPost = async () => {
    if (!photoUrl) { toast.error("Enter image URL"); return; }
    const d = await callApi("create_photo_post", {
      page_id: selectedPage?.id, page_access_token: selectedPage?.access_token,
      image_url: photoUrl, caption: photoCaption,
    });
    if (d) { toast.success("Photo posted!"); setPhotoUrl(""); setPhotoCaption(""); }
  };

  const createVideoPost = async () => {
    if (!videoUrl) { toast.error("Enter video URL"); return; }
    const d = await callApi("create_video_post", {
      page_id: selectedPage?.id, page_access_token: selectedPage?.access_token,
      video_url: videoUrl, description: videoDescription,
    });
    if (d) { toast.success("Video posted!"); setVideoUrl(""); setVideoDescription(""); }
  };

  const deletePost = async (postId: string) => {
    const d = await callApi("delete_post", { post_id: postId });
    if (d) { toast.success("Post deleted"); setFeed(prev => prev.filter(p => p.id !== postId)); }
  };

  // Comments
  const fetchComments = async (objectId?: string) => {
    const id = objectId || commentsObjectId;
    if (!id) { toast.error("Enter a post/object ID"); return; }
    const d = await callApi("get_comments", { object_id: id, limit: 50 });
    if (d?.data) { setComments(d.data); setCommentsObjectId(id); }
  };

  const postComment = async (objectId: string) => {
    if (!commentText) return;
    await callApi("post_comment", { object_id: objectId, message: commentText });
    toast.success("Comment posted"); setCommentText(""); setReplyingTo(null); fetchComments(objectId);
  };

  const deleteComment = async (commentId: string) => {
    await callApi("delete_comment", { comment_id: commentId });
    toast.success("Comment deleted"); fetchComments();
  };

  const hideComment = async (commentId: string, hide: boolean) => {
    await callApi("hide_comment", { comment_id: commentId, hide });
    toast.success(hide ? "Comment hidden" : "Comment unhidden");
  };

  // Groups
  const fetchGroups = async () => { const d = await callApi("get_groups"); if (d?.data) { setGroups(d.data); toast.success(`${d.data.length} groups loaded`); } };
  const fetchGroupFeed = async (groupId: string) => {
    setSelectedGroup(groups.find(g => g.id === groupId) || { id: groupId });
    const d = await callApi("get_group_feed", { group_id: groupId, limit: 25 });
    if (d?.data) setGroupFeed(d.data);
  };
  const postToGroup = async () => {
    if (!selectedGroup || !groupPostText) return;
    await callApi("post_to_group", { group_id: selectedGroup.id, message: groupPostText });
    toast.success("Posted to group!"); setGroupPostText(""); fetchGroupFeed(selectedGroup.id);
  };

  // Events
  const fetchEvents = async () => {
    const d = await callApi("get_events", { page_id: selectedPage?.id, limit: 25 });
    if (d?.data) { setEvents(d.data); toast.success(`${d.data.length} events loaded`); }
  };

  // Albums
  const fetchAlbums = async () => {
    const d = await callApi("get_albums", { page_id: selectedPage?.id, limit: 25 });
    if (d?.data) { setAlbums(d.data); toast.success(`${d.data.length} albums loaded`); }
  };
  const fetchAlbumPhotos = async (albumId: string) => {
    setSelectedAlbumId(albumId);
    const d = await callApi("get_album_photos", { album_id: albumId, limit: 25 });
    if (d?.data) setAlbumPhotos(d.data);
  };

  // Conversations (Page Inbox)
  const fetchConversations = async () => {
    if (!selectedPage) { toast.error("Select a page first"); return; }
    const d = await callApi("get_conversations", { page_id: selectedPage.id, page_access_token: selectedPage.access_token, limit: 20 });
    if (d?.data) { setConversations(d.data); toast.success(`${d.data.length} conversations`); }
  };
  const fetchConvoMessages = async (convoId: string) => {
    setSelectedConvo(convoId);
    const d = await callApi("get_conversation_messages", { conversation_id: convoId, page_access_token: selectedPage?.access_token, limit: 20 });
    if (d?.data) setConvoMessages(d.data);
  };
  const sendPageMessage = async (recipientId: string) => {
    if (!inboxMessage || !selectedPage) return;
    await callApi("send_page_message", { page_id: selectedPage.id, page_access_token: selectedPage.access_token, recipient_id: recipientId, message: inboxMessage });
    toast.success("Message sent"); setInboxMessage(""); if (selectedConvo) fetchConvoMessages(selectedConvo);
  };

  // Insights
  const fetchPageInsights = async () => {
    if (!selectedPage) { toast.error("Select a page first"); return; }
    const d = await callApi("get_page_insights", { page_id: selectedPage.id, page_access_token: selectedPage.access_token, period: insightsPeriod });
    if (d?.data) { setPageInsights(d.data); toast.success("Insights loaded"); }
  };
  const fetchPostInsights = async () => {
    if (!postInsightsId) return;
    const d = await callApi("get_post_insights", { post_id: postInsightsId });
    if (d?.data) { setPostInsights(d.data); toast.success("Post insights loaded"); }
  };

  // Search
  const searchPages = async () => {
    if (!searchQuery) return;
    const d = await callApi("search_pages", { query: searchQuery, limit: 10 });
    if (d?.data) setSearchResults(d.data);
  };

  // AI Tools
  const generateCaption = async () => {
    if (!aiCaptionTopic) return; setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", { body: { action: "generate_caption", account_id: selectedAccount, params: { topic: aiCaptionTopic, platform: "facebook", include_cta: true } } });
      if (error) throw error;
      if (data?.success && data.data) setAiCaptionResult(data.data.caption);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  const analyzeContent = async () => {
    if (!aiAnalyzeText) return; setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", { body: { action: "analyze_content", account_id: selectedAccount, params: { caption: aiAnalyzeText, platform: "facebook" } } });
      if (error) throw error;
      if (data?.success && data.data) setAiAnalyzeResult(data.data.analysis || JSON.stringify(data.data));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  if (fbConnected === null) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!fbConnected) return (
    <Card className="border-blue-500/20 bg-card/50"><CardContent className="p-8 text-center space-y-4">
      <FacebookIcon className="h-12 w-12 mx-auto text-blue-500" />
      <h3 className="text-lg font-bold text-foreground">Connect Facebook to Get Started</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">Link your Facebook account to manage pages, publish posts, handle comments, view insights, manage groups, and automate your presence.</p>
      <Button onClick={onNavigateToConnect} className="mt-2"><ArrowRight className="h-4 w-4 mr-2" />Go to Connect</Button>
    </CardContent></Card>
  );

  const TABS = [
    { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
    { v: "pages", icon: FileText, l: "Pages" },
    { v: "posts", icon: Layers, l: "Posts" },
    { v: "schedule", icon: Calendar, l: "Schedule" },
    { v: "comments", icon: MessageSquare, l: "Comments" },
    { v: "groups", icon: Users, l: "Groups" },
    { v: "events", icon: Calendar, l: "Events" },
    { v: "albums", icon: Image, l: "Albums" },
    { v: "inbox", icon: Mail, l: "Inbox" },
    { v: "insights", icon: BarChart3, l: "Insights" },
    { v: "search", icon: Search, l: "Search" },
    { v: "live", icon: Play, l: "Live Video" },
    { v: "fundraisers", icon: Heart, l: "Fundraisers" },
    { v: "leads", icon: Target, l: "Leads" },
    { v: "commerce", icon: Store, l: "Commerce" },
    { v: "creators", icon: Users, l: "Creators" },
    { v: "cta", icon: MousePointer, l: "CTA" },
    { v: "marketing", icon: Megaphone, l: "Marketing" },
    { v: "business", icon: Briefcase, l: "Business" },
    { v: "ai-tools", icon: Wand2, l: "AI Tools" },
  ];

  return (
    <div className="space-y-3">
      <PlatformAccountSelector
        platform="facebook"
        selectedAccountId={selectedAccount}
        onAccountChange={setPlatformAccountId}
        platformIcon={<FacebookIcon className="h-4 w-4 text-blue-500" />}
        platformColor="text-blue-500"
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-0.5 rounded-lg gap-0.5 flex flex-wrap w-full">
          {TABS.map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
              <t.icon className="h-3.5 w-3.5" />{t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={fetchProfile} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Sync Profile</Button>
            <Button size="sm" variant="outline" onClick={fetchPages} disabled={loading}><FileText className="h-3.5 w-3.5 mr-1" />Load Pages</Button>
          </div>
          {profile && (
            <Card className="bg-white/[0.03] border-blue-500/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {profile.picture?.data?.url && <img src={profile.picture.data.url} className="h-10 w-10 rounded-full" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email || "No email"}</p>
                  </div>
                  <FacebookIcon className="h-5 w-5 text-blue-500" />
                </div>
                {profile.about && <p className="text-xs text-muted-foreground mt-1">{profile.about}</p>}
              </CardContent>
            </Card>
          )}
          {pages.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">Your Pages ({pages.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pages.map(p => (
                  <Card key={p.id} className={`border-border/50 cursor-pointer transition-all hover:border-blue-500/30 ${selectedPage?.id === p.id ? "border-blue-500/50 bg-blue-500/5" : ""}`} onClick={() => setSelectedPage(p)}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        {p.picture?.data?.url && <img src={p.picture.data.url} className="h-8 w-8 rounded-full" alt="" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.category} · {(p.fan_count || 0).toLocaleString()} fans</p>
                        </div>
                        {selectedPage?.id === p.id && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {selectedPage && (
            <Badge variant="outline" className="border-blue-500/30 text-blue-400">Active Page: {selectedPage.name}</Badge>
          )}
        </TabsContent>

        {/* ===== PAGES ===== */}
        <TabsContent value="pages" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchPages} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh Pages</Button>
          </div>
          {pages.length === 0 && <p className="text-xs text-muted-foreground">No pages loaded. Click refresh to fetch your Facebook pages.</p>}
          <div className="grid grid-cols-1 gap-2">
            {pages.map(p => (
              <Card key={p.id} className={`border-border/50 cursor-pointer hover:border-blue-500/30 ${selectedPage?.id === p.id ? "border-blue-500/50 bg-blue-500/5" : ""}`} onClick={() => { setSelectedPage(p); toast.success(`Selected: ${p.name}`); }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {p.picture?.data?.url && <img src={p.picture.data.url} className="h-10 w-10 rounded-full" alt="" />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{(p.fan_count || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Fans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== POSTS ===== */}
        <TabsContent value="posts" className="space-y-4 mt-4">
          {selectedPage && <Badge variant="outline" className="border-blue-500/30 text-blue-400 mb-2">Posting as: {selectedPage.name}</Badge>}
          
          {/* Create Post */}
           <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Create Post</h4>
              <Textarea placeholder="What's on your mind?" value={postMessage} onChange={e => setPostMessage(e.target.value)} className="min-h-[80px] text-sm" />
              <Input placeholder="Link URL (optional)" value={postLink} onChange={e => setPostLink(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={createPost} disabled={loading}><Send className="h-3.5 w-3.5 mr-1" />Publish Post</Button>
            </CardContent>
          </Card>

          {/* Photo Post */}
           <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Photo Post</h4>
              <Input placeholder="Image URL" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className="text-sm" />
              <Input placeholder="Caption (optional)" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={createPhotoPost} disabled={loading}><Image className="h-3.5 w-3.5 mr-1" />Post Photo</Button>
            </CardContent>
          </Card>

          {/* Video Post */}
           <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Video Post</h4>
              <Input placeholder="Video URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="text-sm" />
              <Input placeholder="Description (optional)" value={videoDescription} onChange={e => setVideoDescription(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={createVideoPost} disabled={loading}><Video className="h-3.5 w-3.5 mr-1" />Post Video</Button>
            </CardContent>
          </Card>

          {/* Feed */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => fetchFeed(selectedPage?.id)} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Feed</Button>
          </div>
          <div className="space-y-2">
            {feed.map(p => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-3">{p.message || "(no text)"}</p>
                      {p.full_picture && <img src={p.full_picture} className="mt-2 rounded max-h-32 object-cover" alt="" />}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                        <span>{new Date(p.created_time).toLocaleDateString()}</span>
                        {p.type && <Badge variant="outline" className="text-[9px] py-0 px-1">{p.type}</Badge>}
                        {p.shares?.count > 0 && <span><Share2 className="h-2.5 w-2.5 inline mr-0.5" />{p.shares.count}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {p.permalink_url && <a href={p.permalink_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>}
                      <button onClick={() => { setCommentsObjectId(p.id); setActiveTab("comments"); fetchComments(p.id); }}><MessageSquare className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                      <button onClick={() => deletePost(p.id)}><Trash2 className="h-3 w-3 text-red-400 hover:text-red-300" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== COMMENTS ===== */}
        <TabsContent value="comments" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input placeholder="Post / Object ID" value={commentsObjectId} onChange={e => setCommentsObjectId(e.target.value)} className="text-sm flex-1" />
            <Button size="sm" onClick={() => fetchComments()} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load</Button>
          </div>
          {comments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{comments.length} comments</p>
              {comments.map(c => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">{c.from?.name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(c.created_time).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-foreground">{c.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {c.like_count > 0 && <span><ThumbsUp className="h-2.5 w-2.5 inline mr-0.5" />{c.like_count}</span>}
                          {c.comment_count > 0 && <span><MessageSquare className="h-2.5 w-2.5 inline mr-0.5" />{c.comment_count}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setReplyingTo(c.id)} className="text-[10px] text-blue-400 hover:text-blue-300">Reply</button>
                        <button onClick={() => hideComment(c.id, true)} className="text-[10px] text-muted-foreground hover:text-foreground">Hide</button>
                        <button onClick={() => deleteComment(c.id)}><Trash2 className="h-3 w-3 text-red-400 hover:text-red-300" /></button>
                      </div>
                    </div>
                    {replyingTo === c.id && (
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Reply..." value={commentText} onChange={e => setCommentText(e.target.value)} className="text-xs flex-1" />
                        <Button size="sm" onClick={() => postComment(c.id)} className="text-xs h-8"><Send className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Post new comment */}
          {commentsObjectId && (
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <Input placeholder="Write a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} className="text-sm flex-1" />
                  <Button size="sm" onClick={() => postComment(commentsObjectId)} disabled={loading}><Send className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== GROUPS ===== */}
        <TabsContent value="groups" className="space-y-4 mt-4">
          <Button size="sm" variant="outline" onClick={fetchGroups} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Groups</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {groups.map(g => (
              <Card key={g.id} className={`border-border/50 cursor-pointer hover:border-blue-500/30 ${selectedGroup?.id === g.id ? "border-blue-500/50 bg-blue-500/5" : ""}`} onClick={() => fetchGroupFeed(g.id)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {g.picture?.data?.url && <img src={g.picture.data.url} className="h-8 w-8 rounded-full" alt="" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.privacy} · {(g.member_count || 0).toLocaleString()} members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedGroup && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground">Group Feed: {selectedGroup.name}</h4>
              <Card className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <Textarea placeholder="Post to group..." value={groupPostText} onChange={e => setGroupPostText(e.target.value)} className="min-h-[60px] text-sm" />
                  <Button size="sm" onClick={postToGroup} disabled={loading}><Send className="h-3.5 w-3.5 mr-1" />Post</Button>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {groupFeed.map(p => (
                  <Card key={p.id} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-foreground">{p.from?.name || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(p.created_time).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-3">{p.message || "(no text)"}</p>
                      {p.permalink_url && <a href={p.permalink_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline mt-1 inline-block">View on Facebook</a>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== EVENTS ===== */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <Button size="sm" variant="outline" onClick={fetchEvents} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Events</Button>
          {events.length === 0 && <p className="text-xs text-muted-foreground">No events loaded.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {events.map(e => (
              <Card key={e.id} className="border-border/50">
                <CardContent className="p-3">
                  {e.cover?.source && <img src={e.cover.source} className="rounded mb-2 max-h-24 w-full object-cover" alt="" />}
                  <p className="text-xs font-semibold text-foreground">{e.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{new Date(e.start_time).toLocaleString()}</span>
                    {e.end_time && <span>→ {new Date(e.end_time).toLocaleString()}</span>}
                  </div>
                  {e.place?.name && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {e.place.name}</p>}
                  {e.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== ALBUMS ===== */}
        <TabsContent value="albums" className="space-y-4 mt-4">
          <Button size="sm" variant="outline" onClick={fetchAlbums} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Albums</Button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {albums.map(a => (
              <Card key={a.id} className={`border-border/50 cursor-pointer hover:border-blue-500/30 ${selectedAlbumId === a.id ? "border-blue-500/50" : ""}`} onClick={() => fetchAlbumPhotos(a.id)}>
                <CardContent className="p-3 text-center">
                  <Image className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs font-semibold text-foreground truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.count || 0} photos</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {albumPhotos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {albumPhotos.map(p => (
                <a key={p.id} href={p.source} target="_blank" rel="noopener noreferrer">
                  <img src={p.picture || p.source} className="rounded w-full h-24 object-cover hover:opacity-80 transition-opacity" alt={p.name || ""} />
                </a>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== INBOX (Page Messaging) ===== */}
        <TabsContent value="inbox" className="space-y-4 mt-4">
          {!selectedPage && <p className="text-xs text-muted-foreground">Select a page from Dashboard to access the inbox.</p>}
          {selectedPage && (
            <>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchConversations} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Conversations</Button>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">{selectedPage.name}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ minHeight: 300 }}>
                {/* Conversation list */}
                <ScrollArea className="md:col-span-1 border border-border/50 rounded-lg p-2" style={{ maxHeight: 400 }}>
                  {conversations.map(c => (
                    <button key={c.id} onClick={() => fetchConvoMessages(c.id)} className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${selectedConvo === c.id ? "bg-blue-500/10 border border-blue-500/30" : "hover:bg-muted/30"}`}>
                      <p className="text-xs font-semibold text-foreground truncate">{c.participants?.data?.[0]?.name || "User"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.snippet || "..."}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(c.updated_time).toLocaleDateString()}</p>
                    </button>
                  ))}
                  {conversations.length === 0 && <p className="text-xs text-muted-foreground p-2">No conversations</p>}
                </ScrollArea>
                {/* Messages */}
                <div className="md:col-span-2 border border-border/50 rounded-lg p-3 flex flex-col" style={{ maxHeight: 400 }}>
                  <ScrollArea className="flex-1 mb-2">
                    {convoMessages.map(m => (
                      <div key={m.id} className="mb-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">{m.from?.name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(m.created_time).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-foreground bg-muted/30 rounded px-2 py-1">{m.message || "(attachment)"}</p>
                      </div>
                    ))}
                    {selectedConvo && convoMessages.length === 0 && <p className="text-xs text-muted-foreground">No messages</p>}
                    {!selectedConvo && <p className="text-xs text-muted-foreground">Select a conversation</p>}
                  </ScrollArea>
                  {selectedConvo && (
                    <div className="flex gap-2">
                      <Input placeholder="Type a message..." value={inboxMessage} onChange={e => setInboxMessage(e.target.value)} className="text-sm flex-1" />
                      <Button size="sm" onClick={() => {
                        const convo = conversations.find(c => c.id === selectedConvo);
                        const recipientId = convo?.participants?.data?.find((p: any) => p.id !== selectedPage?.id)?.id;
                        if (recipientId) sendPageMessage(recipientId);
                        else toast.error("Could not determine recipient");
                      }} disabled={loading}><Send className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== INSIGHTS ===== */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          {!selectedPage && <p className="text-xs text-muted-foreground">Select a page from Dashboard to view insights.</p>}
          {selectedPage && (
            <>
              {/* Page Insights */}
               <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Page Insights: {selectedPage.name}</h4>
                  <div className="flex gap-2 items-center">
                    <select value={insightsPeriod} onChange={e => setInsightsPeriod(e.target.value)} className="text-xs bg-muted/50 border border-border rounded px-2 py-1 text-foreground">
                      <option value="day">Daily</option>
                      <option value="week">Weekly</option>
                      <option value="days_28">28 Days</option>
                    </select>
                    <Button size="sm" variant="outline" onClick={fetchPageInsights} disabled={loading}><BarChart3 className="h-3.5 w-3.5 mr-1" />Fetch</Button>
                  </div>
                  {pageInsights && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {pageInsights.map((insight: any) => (
                        <div key={insight.name} className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground truncate">{insight.title || insight.name}</p>
                          <p className="text-sm font-bold text-foreground">{insight.values?.[0]?.value?.toLocaleString?.() || JSON.stringify(insight.values?.[0]?.value) || "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Post Insights */}
               <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Post Insights</h4>
                  <div className="flex gap-2">
                    <Input placeholder="Post ID" value={postInsightsId} onChange={e => setPostInsightsId(e.target.value)} className="text-sm flex-1" />
                    <Button size="sm" variant="outline" onClick={fetchPostInsights} disabled={loading}><BarChart3 className="h-3.5 w-3.5 mr-1" />Fetch</Button>
                  </div>
                  {postInsights && (
                    <div className="grid grid-cols-2 gap-2">
                      {postInsights.map((insight: any) => (
                        <div key={insight.name} className="bg-muted/30 rounded p-2">
                          <p className="text-[10px] text-muted-foreground truncate">{insight.title || insight.name}</p>
                          <p className="text-sm font-bold text-foreground">{typeof insight.values?.[0]?.value === "object" ? JSON.stringify(insight.values[0].value) : (insight.values?.[0]?.value?.toLocaleString?.() || "—")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===== SEARCH ===== */}
        <TabsContent value="search" className="space-y-4 mt-4">
           <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Search Facebook Pages</h4>
              <div className="flex gap-2">
                <Input placeholder="Search pages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="text-sm flex-1" />
                <Button size="sm" onClick={searchPages} disabled={loading}><Search className="h-3.5 w-3.5 mr-1" />Search</Button>
              </div>
            </CardContent>
          </Card>
          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {searchResults.map(r => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      {r.picture?.data?.url && <img src={r.picture.data.url} className="h-8 w-8 rounded-full" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.category} · {(r.fan_count || 0).toLocaleString()} fans</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== LIVE VIDEO ===== */}
        <TabsContent value="live" className="mt-4">
          <FBLiveVideoManager selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== FUNDRAISERS ===== */}
        <TabsContent value="fundraisers" className="mt-4">
          <FBFundraisersManager selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== LEADS ===== */}
        <TabsContent value="leads" className="mt-4">
          <FBLeadsManager selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== COMMERCE ===== */}
        <TabsContent value="commerce" className="mt-4">
          <FBCommerceHub selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== CREATORS ===== */}
        <TabsContent value="creators" className="mt-4">
          <FBCreatorMarketplace selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== CTA ===== */}
        <TabsContent value="cta" className="mt-4">
          <FBCTAManager selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== MARKETING MESSAGES ===== */}
        <TabsContent value="marketing" className="mt-4">
          <FBMarketingMessages selectedAccount={selectedAccount} selectedPage={selectedPage} />
        </TabsContent>

        {/* ===== BUSINESS MANAGER ===== */}
        <TabsContent value="business" className="mt-4">
          <FBBusinessManager selectedAccount={selectedAccount} />
        </TabsContent>

        {/* ===== SCHEDULE ===== */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-400" />Schedule Manager</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={openFbImportPlan}>
                <FolderOpen className="h-3 w-3" /> Import from Plan
              </Button>
              <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">{fbScheduledPosts.filter(p => p.status === "scheduled").length}/50</Badge>
            </div>
          </div>
          <Card className="bg-white/[0.03] border-blue-500/20 backdrop-blur-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-foreground">Create Scheduled Post</h4>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-blue-400" onClick={generateFbScheduleCaption} disabled={fbSchedAiGenerating}>
                  {fbSchedAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}AI Generate
                </Button>
              </div>
              <div className="flex gap-1.5 mb-2">
                {(["text", "photo", "video"] as const).map(ct => (
                  <Button key={ct} size="sm" variant={fbSchedPostType === ct ? "default" : "outline"} onClick={() => setFbSchedPostType(ct)} className="text-xs h-7 capitalize">{ct}</Button>
                ))}
              </div>
              <Textarea value={fbSchedCaption} onChange={e => setFbSchedCaption(e.target.value)} placeholder="Write your post..." rows={3} className="text-sm" />
              {fbSchedPostType !== "text" && <Input value={fbSchedMediaUrl} onChange={e => setFbSchedMediaUrl(e.target.value)} placeholder={`${fbSchedPostType === "photo" ? "Image" : "Video"} URL`} className="text-sm" />}
              <div><label className="text-xs text-muted-foreground mb-1 block">Schedule</label><Input type="datetime-local" value={fbSchedDateTime} onChange={e => setFbSchedDateTime(e.target.value)} className="text-sm" /></div>
              <Button onClick={scheduleFbPost} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white" disabled={!fbSchedCaption && !fbSchedMediaUrl}>
                {fbSchedDateTime ? <><Calendar className="h-4 w-4 mr-2" />Schedule</> : <><FileText className="h-4 w-4 mr-2" />Save Draft</>}
              </Button>
            </CardContent>
          </Card>
          {fbScheduledPosts.length > 0 && (
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-bold text-foreground">Post Queue ({fbScheduledPosts.length})</h4>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {fbScheduledPosts.map(p => (
                      <div key={p.id} className="bg-white/[0.02] rounded-lg p-3 flex items-center gap-3 border border-white/[0.04]">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${p.status === "published" ? "bg-green-500/10" : p.status === "scheduled" ? "bg-amber-500/10" : "bg-muted/30"}`}>
                          {p.status === "published" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : p.status === "scheduled" ? <Clock className="h-4 w-4 text-amber-400" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
                            <span className="text-[10px] text-muted-foreground">{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No schedule"}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-500/10" onClick={() => deleteFbScheduledPost(p.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== AI TOOLS ===== */}
        <TabsContent value="ai-tools" className="space-y-4 mt-4">
          {/* Caption Generator */}
           <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5 text-blue-400" />AI Caption Generator</h4>
              <Input placeholder="Topic or theme..." value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={generateCaption} disabled={loading}><Sparkles className="h-3.5 w-3.5 mr-1" />Generate</Button>
              {aiCaptionResult && (
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                  <Button size="sm" variant="ghost" onClick={() => { setPostMessage(aiCaptionResult); setActiveTab("posts"); toast.success("Caption copied to posts"); }} className="mt-2 h-6 text-[10px]"><Copy className="h-3 w-3 mr-1" />Use in Post</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Analyzer */}
           <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-blue-400" />Content Analyzer</h4>
              <Textarea placeholder="Paste your post content..." value={aiAnalyzeText} onChange={e => setAiAnalyzeText(e.target.value)} className="min-h-[60px] text-sm" />
              <Button size="sm" onClick={analyzeContent} disabled={loading}><Activity className="h-3.5 w-3.5 mr-1" />Analyze</Button>
              {aiAnalyzeResult && (
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiAnalyzeResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    {/* Import from Plan Dialog */}
    <Dialog open={showFbImportPlan} onOpenChange={setShowFbImportPlan}>
      <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><FolderOpen className="h-4 w-4 text-blue-400" /> Import from Content Plan</DialogTitle></DialogHeader>
        <p className="text-xs text-white/50">{fbPlanItems.length} Facebook items in content plan</p>
        <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/3 p-2.5">
          <div><p className="text-[11px] text-white/80 font-medium">Auto-Schedule</p><p className="text-[10px] text-white/35">Distribute at optimal Facebook hours</p></div>
          <Switch checked={fbImportAutoSchedule} onCheckedChange={setFbImportAutoSchedule} />
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {fbPlanItems.map(item => (
            <div key={item.id} className="rounded border border-white/6 bg-white/[0.02] p-2">
              <p className="text-xs text-white/80 font-medium truncate">{item.title}</p>
              <p className="text-[10px] text-white/40 line-clamp-1">{item.caption}</p>
            </div>
          ))}
          {fbPlanItems.length === 0 && <p className="text-xs text-white/30 text-center py-4">No Facebook content in plan. Create items in Content tab first.</p>}
        </div>
        <Button onClick={fbImportFromPlan} disabled={fbImportingPlan || fbPlanItems.length === 0} className="w-full bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/25">
          {fbImportingPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
          {fbImportingPlan ? "Importing..." : `Import ${fbPlanItems.length} items`}
        </Button>
      </DialogContent>
    </Dialog>
    </div>
  );
};

export default FBAutomationSuite;

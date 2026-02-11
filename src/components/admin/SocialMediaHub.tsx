import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Instagram, Music2, Link2, Send, BarChart3, MessageSquare, Plus,
  Calendar, ExternalLink, RefreshCw, Trash2, Eye, TrendingUp,
  Globe, Users, Heart, Share2, Clock, CheckCircle2, AlertCircle,
  Search, UserPlus, Hash, Zap, Shield, Settings, Download,
  Image, Video, Play, Pause, Radio, Star, Target, Megaphone,
  Activity, PieChart, Layers, Copy, ArrowUpRight, Wifi, WifiOff,
  MessageCircle, FileText, Palette, LayoutDashboard, Compass,
  FolderOpen, ChevronRight, ChevronDown, MoreHorizontal, Filter,
  Sparkles, Bot, Crown, Flame, Lock, Unlock, UserCheck, UserX,
  ThumbsUp, ThumbsDown, Flag, Mail, Phone, AtSign, Bookmark,
} from "lucide-react";

type ApiAction = { action: string; params?: any };

const SocialMediaHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("dashboard");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [connections, setConnections] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [bioLinks, setBioLinks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [commentReplies, setCommentReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // Profile data
  const [igProfile, setIgProfile] = useState<any>(null);
  const [ttProfile, setTtProfile] = useState<any>(null);

  // Discovery
  const [discoveryUsername, setDiscoveryUsername] = useState("");
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [discoveryPlatform, setDiscoveryPlatform] = useState("instagram");

  // Hashtag Research
  const [hashtagQuery, setHashtagQuery] = useState("");
  const [hashtagResults, setHashtagResults] = useState<any>(null);
  const [hashtagPlatform, setHashtagPlatform] = useState("instagram");

  // Media library
  const [igMedia, setIgMedia] = useState<any[]>([]);
  const [ttVideos, setTtVideos] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [mediaInsights, setMediaInsights] = useState<any>(null);

  // Comments viewer
  const [commentsMediaId, setCommentsMediaId] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [commentsPlatform, setCommentsPlatform] = useState("instagram");

  // Mass actions
  const [massActionType, setMassActionType] = useState("auto_reply");
  const [massReplyMessage, setMassReplyMessage] = useState("");

  // Messaging
  const [dmRecipientId, setDmRecipientId] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [dmPlatform, setDmPlatform] = useState("instagram");

  // New post form
  const [newPost, setNewPost] = useState({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "", alt_text: "" });

  // New bio link form
  const [newBioLink, setNewBioLink] = useState({ slug: "", title: "", bio: "", of_link: "", theme: "dark", links: [{ title: "", url: "", enabled: true }], social_links: { instagram: "", tiktok: "", twitter: "" } });

  // Connect form
  const [connectForm, setConnectForm] = useState({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" });

  // Publishing limit
  const [publishingLimit, setPublishingLimit] = useState<any>(null);

  // TikTok Research
  const [ttResearchKeywords, setTtResearchKeywords] = useState("");
  const [ttResearchResults, setTtResearchResults] = useState<any>(null);

  // Demographics
  const [demographics, setDemographics] = useState<any>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) loadData();
  }, [selectedAccount]);

  const loadAccounts = async () => {
    const { data } = await supabase.from("managed_accounts").select("id, username, display_name, avatar_url").order("created_at", { ascending: false });
    setAccounts(data || []);
    if (data?.[0]) setSelectedAccount(data[0].id);
  };

  const loadData = async () => {
    setLoading(true);
    const [conns, socialPosts, links, stats, replies] = await Promise.all([
      supabase.from("social_connections").select("*").eq("account_id", selectedAccount),
      supabase.from("social_posts").select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }).limit(50),
      supabase.from("bio_links").select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }),
      supabase.from("social_analytics").select("*").eq("account_id", selectedAccount).order("fetched_at", { ascending: false }).limit(50),
      supabase.from("social_comment_replies").select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }).limit(50),
    ]);
    setConnections(conns.data || []);
    setPosts(socialPosts.data || []);
    setBioLinks(links.data || []);
    setAnalytics(stats.data || []);
    setCommentReplies(replies.data || []);
    setLoading(false);
  };

  const callApi = async (funcName: string, body: any) => {
    setApiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(funcName, { body: { ...body, account_id: selectedAccount } });
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

  const connectPlatform = async () => {
    if (!connectForm.access_token || !connectForm.platform_username) { toast.error("Fill in username and access token"); return; }
    const { error } = await supabase.from("social_connections").upsert({
      account_id: selectedAccount, platform: connectForm.platform, platform_user_id: connectForm.platform_user_id,
      platform_username: connectForm.platform_username, access_token: connectForm.access_token,
      refresh_token: connectForm.refresh_token || null, is_connected: true, scopes: [],
    }, { onConflict: "account_id,platform" });
    if (error) toast.error(error.message);
    else { toast.success(`${connectForm.platform} connected!`); loadData(); setConnectForm({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" }); }
  };

  const disconnectPlatform = async (id: string) => {
    await supabase.from("social_connections").update({ is_connected: false }).eq("id", id);
    toast.success("Disconnected"); loadData();
  };

  const schedulePost = async () => {
    if (!newPost.caption && !newPost.media_url) { toast.error("Add caption or media"); return; }
    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount, platform: newPost.platform, post_type: newPost.post_type,
      caption: newPost.caption, media_urls: newPost.media_url ? [newPost.media_url] : [],
      scheduled_at: newPost.scheduled_at || null, status: newPost.scheduled_at ? "scheduled" : "draft",
      auto_reply_enabled: newPost.auto_reply_enabled, auto_reply_message: newPost.auto_reply_message || null,
      redirect_url: newPost.redirect_url || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Post created!"); setNewPost({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "", alt_text: "" }); loadData(); }
  };

  const publishPost = async (post: any) => {
    const platform = post.platform;
    const funcName = platform === "instagram" ? "instagram-api" : "tiktok-api";
    let action = ""; let params: any = { post_id: post.id };
    if (platform === "instagram") {
      if (post.post_type === "reel") { action = "create_reel"; params.video_url = post.media_urls?.[0]; params.caption = post.caption; }
      else if (post.post_type === "story") { action = "create_story"; params.image_url = post.media_urls?.[0]; }
      else { action = "create_photo_post"; params.image_url = post.media_urls?.[0]; params.caption = post.caption; }
    } else {
      action = "publish_video_by_url"; params.video_url = post.media_urls?.[0]; params.title = post.caption; params.privacy_level = "PUBLIC_TO_EVERYONE";
    }
    toast.info("Publishing...");
    const result = await callApi(funcName, { action, params });
    if (result) { toast.success("Published!"); loadData(); }
  };

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const createBioLink = async () => {
    if (!newBioLink.slug || !newBioLink.title) { toast.error("Fill slug and title"); return; }
    const { error } = await supabase.from("bio_links").insert({
      account_id: selectedAccount, slug: newBioLink.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      title: newBioLink.title, bio: newBioLink.bio || null, of_link: newBioLink.of_link || null,
      theme: newBioLink.theme, links: newBioLink.links.filter(l => l.title && l.url),
      social_links: newBioLink.social_links, is_active: true,
    });
    if (error) toast.error(error.message);
    else { toast.success("Bio link created!"); loadData(); }
  };

  const deleteBioLink = async (id: string) => { await supabase.from("bio_links").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  // ===== API ACTIONS =====
  const fetchProfiles = async () => {
    const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
    const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
    if (igConn) { const d = await callApi("instagram-api", { action: "get_profile" }); if (d) setIgProfile(d); }
    if (ttConn) { const d = await callApi("tiktok-api", { action: "get_user_info" }); if (d) setTtProfile(d?.data?.user || d); }
  };

  const fetchMedia = async () => {
    const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
    const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
    if (igConn) { const d = await callApi("instagram-api", { action: "get_media", params: { limit: 50 } }); if (d) setIgMedia(d.data || []); }
    if (ttConn) { const d = await callApi("tiktok-api", { action: "get_videos", params: { limit: 20 } }); if (d) setTtVideos(d.data?.videos || []); }
  };

  const fetchAnalytics = async (platform: string) => {
    toast.info("Fetching analytics...");
    if (platform === "instagram") {
      await callApi("instagram-api", { action: "get_account_insights", params: { period: "day" } });
    } else {
      await callApi("tiktok-api", { action: "get_user_info" });
    }
    toast.success("Analytics updated!"); loadData();
  };

  const fetchDemographics = async () => {
    const d = await callApi("instagram-api", { action: "get_account_insights_demographics" });
    if (d) { setDemographics(d); toast.success("Demographics loaded!"); }
  };

  const fetchPublishingLimit = async () => {
    const d = await callApi("instagram-api", { action: "get_content_publishing_limit" });
    if (d) setPublishingLimit(d);
  };

  const discoverUser = async () => {
    if (!discoveryUsername) return;
    if (discoveryPlatform === "instagram") {
      const d = await callApi("instagram-api", { action: "discover_user", params: { username: discoveryUsername, media_limit: 12 } });
      if (d) setDiscoveryResult(d);
    } else {
      const d = await callApi("tiktok-api", { action: "research_user", params: { username: discoveryUsername } });
      if (d) setDiscoveryResult(d);
    }
  };

  const searchHashtag = async () => {
    if (!hashtagQuery) return;
    if (hashtagPlatform === "instagram") {
      const d = await callApi("instagram-api", { action: "search_hashtag", params: { hashtag: hashtagQuery } });
      if (d?.data?.[0]) {
        const topMedia = await callApi("instagram-api", { action: "get_hashtag_top_media", params: { hashtag_id: d.data[0].id } });
        const recentMedia = await callApi("instagram-api", { action: "get_hashtag_recent_media", params: { hashtag_id: d.data[0].id } });
        setHashtagResults({ id: d.data[0].id, top: topMedia?.data || [], recent: recentMedia?.data || [] });
      }
    } else {
      const d = await callApi("tiktok-api", { action: "research_hashtag", params: { hashtags: [hashtagQuery] } });
      if (d) setHashtagResults(d);
    }
  };

  const fetchComments = async () => {
    if (!commentsMediaId) return;
    if (commentsPlatform === "instagram") {
      const d = await callApi("instagram-api", { action: "get_comments", params: { media_id: commentsMediaId, limit: 50 } });
      if (d) setCommentsList(d.data || []);
    } else {
      const d = await callApi("tiktok-api", { action: "get_comments", params: { video_id: commentsMediaId, limit: 50 } });
      if (d) setCommentsList(d.data?.comments || []);
    }
  };

  const replyToComment = async (commentId: string, commentText: string, author: string) => {
    if (!replyText) return;
    if (commentsPlatform === "instagram") {
      await callApi("instagram-api", { action: "reply_to_comment", params: { comment_id: commentId, media_id: commentsMediaId, message: replyText, comment_text: commentText, comment_author: author } });
    } else {
      await callApi("tiktok-api", { action: "reply_to_comment", params: { video_id: commentsMediaId, comment_id: commentId, message: replyText, comment_text: commentText, comment_author: author } });
    }
    setReplyText(""); toast.success("Reply sent!"); loadData();
  };

  const deleteMedia = async (mediaId: string) => {
    await callApi("instagram-api", { action: "delete_media", params: { media_id: mediaId } });
    toast.success("Media deleted!"); fetchMedia();
  };

  const getMediaInsights = async (mediaId: string, type: string) => {
    let action = "get_media_insights";
    if (type === "reel" || type === "REELS") action = "get_reel_insights";
    if (type === "story" || type === "STORY") action = "get_story_insights";
    const d = await callApi("instagram-api", { action, params: { media_id: mediaId } });
    if (d) { setMediaInsights(d); toast.success("Insights loaded!"); }
  };

  const sendDM = async () => {
    if (!dmRecipientId || !dmMessage) return;
    if (dmPlatform === "instagram") {
      await callApi("instagram-api", { action: "send_message", params: { recipient_id: dmRecipientId, message: dmMessage } });
    } else {
      await callApi("tiktok-api", { action: "send_dm", params: { conversation_id: dmRecipientId, message: dmMessage } });
    }
    toast.success("Message sent!"); setDmMessage("");
  };

  const researchTikTok = async () => {
    if (!ttResearchKeywords) return;
    const keywords = ttResearchKeywords.split(",").map(k => k.trim());
    const d = await callApi("tiktok-api", { action: "research_videos", params: { keywords, limit: 20 } });
    if (d) setTtResearchResults(d);
  };

  const hideComment = async (commentId: string) => {
    await callApi("instagram-api", { action: "hide_comment", params: { comment_id: commentId } });
    toast.success("Comment hidden!");
  };

  const deleteComment = async (commentId: string) => {
    if (commentsPlatform === "instagram") {
      await callApi("instagram-api", { action: "delete_comment", params: { comment_id: commentId } });
    }
    toast.success("Comment deleted!"); fetchComments();
  };

  const igConnected = connections.some(c => c.platform === "instagram" && c.is_connected);
  const ttConnected = connections.some(c => c.platform === "tiktok" && c.is_connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
            <Globe className="h-6 w-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Social Media Command Center</h2>
            <p className="text-sm text-white/50">Instagram · TikTok · Full API Control · Mass Actions · Discovery</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {apiLoading && <div className="flex items-center gap-2 text-yellow-400 text-xs"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> API Call...</div>}
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
            {accounts.map(a => (<option key={a.id} value={a.id} className="bg-gray-900">{a.display_name || a.username}</option>))}
          </select>
        </div>
      </div>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-pink-400" />
              <span className="text-white font-medium">Instagram</span>
              {igConnected ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="h-3 w-3 mr-1" />Live</Badge> : <Badge variant="outline" className="border-white/20 text-white/50"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
            </div>
            <div className="flex gap-1">
              {igConnected && <>
                <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => fetchAnalytics("instagram")}><RefreshCw className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={fetchPublishingLimit}><Shield className="h-4 w-4" /></Button>
              </>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music2 className="h-5 w-5 text-cyan-400" />
              <span className="text-white font-medium">TikTok</span>
              {ttConnected ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="h-3 w-3 mr-1" />Live</Badge> : <Badge variant="outline" className="border-white/20 text-white/50"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
            </div>
            {ttConnected && <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => fetchAnalytics("tiktok")}><RefreshCw className="h-4 w-4" /></Button>}
          </CardContent>
        </Card>
      </div>

      {/* Publishing limit */}
      {publishingLimit && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3 flex items-center gap-4">
            <Shield className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-white/70">Publishing Quota:</span>
            <span className="text-sm text-white font-medium">{publishingLimit.quota_usage || 0} / {publishingLimit.config?.quota_total || 25}</span>
            <Progress value={((publishingLimit.quota_usage || 0) / (publishingLimit.config?.quota_total || 25)) * 100} className="flex-1 h-2" />
          </CardContent>
        </Card>
      )}

      {/* MEGA TABS */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl gap-1 inline-flex w-auto min-w-full">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Layers className="h-3.5 w-3.5" /> Content Studio</TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Image className="h-3.5 w-3.5" /> Media Library</TabsTrigger>
            <TabsTrigger value="discovery" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Compass className="h-3.5 w-3.5" /> Discovery</TabsTrigger>
            <TabsTrigger value="hashtags" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Hash className="h-3.5 w-3.5" /> Hashtags</TabsTrigger>
            <TabsTrigger value="engagement" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><MessageSquare className="h-3.5 w-3.5" /> Engagement</TabsTrigger>
            <TabsTrigger value="messaging" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Mail className="h-3.5 w-3.5" /> DMs</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="biolink" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Link2 className="h-3.5 w-3.5" /> Bio Links</TabsTrigger>
            <TabsTrigger value="research" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Search className="h-3.5 w-3.5" /> Research</TabsTrigger>
            <TabsTrigger value="connect" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Plus className="h-3.5 w-3.5" /> Connect</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button size="sm" onClick={fetchProfiles} className="bg-white/10 text-white hover:bg-white/20"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Sync Profiles</Button>
            <Button size="sm" onClick={fetchMedia} className="bg-white/10 text-white hover:bg-white/20"><Download className="h-3.5 w-3.5 mr-1.5" /> Pull Media</Button>
            <Button size="sm" onClick={fetchDemographics} className="bg-white/10 text-white hover:bg-white/20" disabled={!igConnected}><PieChart className="h-3.5 w-3.5 mr-1.5" /> Demographics</Button>
          </div>

          {/* Profile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {igProfile && (
              <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    {igProfile.profile_picture_url && <img src={igProfile.profile_picture_url} className="h-14 w-14 rounded-full border-2 border-pink-500/30" />}
                    <div>
                      <h3 className="text-white font-bold text-lg">{igProfile.name || igProfile.username}</h3>
                      <p className="text-pink-300 text-sm">@{igProfile.username}</p>
                    </div>
                    <Instagram className="h-5 w-5 text-pink-400 ml-auto" />
                  </div>
                  <p className="text-white/60 text-sm mb-4 line-clamp-2">{igProfile.biography}</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold text-lg">{(igProfile.followers_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Followers</p></div>
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold text-lg">{(igProfile.follows_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Following</p></div>
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold text-lg">{(igProfile.media_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Posts</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
            {ttProfile && (
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    {ttProfile.avatar_url && <img src={ttProfile.avatar_url} className="h-14 w-14 rounded-full border-2 border-cyan-500/30" />}
                    <div>
                      <h3 className="text-white font-bold text-lg">{ttProfile.display_name}</h3>
                      <p className="text-cyan-300 text-sm">@{ttProfile.username || "tiktok"}</p>
                      {ttProfile.is_verified && <Badge className="bg-blue-500/20 text-blue-400 text-xs mt-1"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                    </div>
                    <Music2 className="h-5 w-5 text-cyan-400 ml-auto" />
                  </div>
                  <p className="text-white/60 text-sm mb-4 line-clamp-2">{ttProfile.bio_description}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(ttProfile.follower_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Followers</p></div>
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(ttProfile.following_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Following</p></div>
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(ttProfile.likes_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Likes</p></div>
                    <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(ttProfile.video_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Videos</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><Users className="h-5 w-5 text-blue-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{posts.filter(p => p.status === "published").length}</p><p className="text-xs text-white/40">Published</p></CardContent></Card>
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><Clock className="h-5 w-5 text-yellow-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{posts.filter(p => p.status === "scheduled").length}</p><p className="text-xs text-white/40">Scheduled</p></CardContent></Card>
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><Link2 className="h-5 w-5 text-green-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{bioLinks.length}</p><p className="text-xs text-white/40">Bio Links</p></CardContent></Card>
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><MessageCircle className="h-5 w-5 text-purple-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{commentReplies.length}</p><p className="text-xs text-white/40">Replies Sent</p></CardContent></Card>
          </div>

          {!igProfile && !ttProfile && (
            <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center">
              <Sparkles className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Connect your accounts and click "Sync Profiles" to see your dashboard</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== CONTENT STUDIO ===== */}
        <TabsContent value="content" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Megaphone className="h-5 w-5 text-pink-400" /> Create & Publish</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">🟣 Instagram</option>
                  <option value="tiktok" className="bg-gray-900">🔵 TikTok</option>
                </select>
                <select value={newPost.post_type} onChange={e => setNewPost(p => ({ ...p, post_type: e.target.value }))} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="feed" className="bg-gray-900">📸 Feed Post</option>
                  <option value="reel" className="bg-gray-900">🎬 Reel / Video</option>
                  <option value="story" className="bg-gray-900">📱 Story</option>
                  <option value="carousel" className="bg-gray-900">🎠 Carousel</option>
                </select>
              </div>
              <Textarea value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Write your caption with #hashtags and @mentions..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={newPost.media_url} onChange={e => setNewPost(p => ({ ...p, media_url: e.target.value }))} placeholder="Media URL (image/video)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                <Input type="datetime-local" value={newPost.scheduled_at} onChange={e => setNewPost(p => ({ ...p, scheduled_at: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
              {newPost.platform === "instagram" && (
                <Input value={newPost.alt_text} onChange={e => setNewPost(p => ({ ...p, alt_text: e.target.value }))} placeholder="Alt text for accessibility (IG only)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              )}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <h4 className="text-sm font-medium text-white/70 flex items-center gap-2"><Target className="h-4 w-4" /> Traffic & Auto-Reply</h4>
                <Input value={newPost.redirect_url} onChange={e => setNewPost(p => ({ ...p, redirect_url: e.target.value }))} placeholder="OF redirect URL" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70 flex items-center gap-1.5"><Bot className="h-4 w-4" /> Auto-reply to comments</span>
                  <Switch checked={newPost.auto_reply_enabled} onCheckedChange={v => setNewPost(p => ({ ...p, auto_reply_enabled: v }))} />
                </div>
                {newPost.auto_reply_enabled && <Input value={newPost.auto_reply_message} onChange={e => setNewPost(p => ({ ...p, auto_reply_message: e.target.value }))} placeholder="Auto-reply: Check my bio link 🔥" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />}
              </div>
              <div className="flex gap-2">
                <Button onClick={schedulePost} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white flex-1"><Clock className="h-4 w-4 mr-2" /> {newPost.scheduled_at ? "Schedule" : "Save Draft"}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts List */}
          <div className="space-y-3">
            <h3 className="text-white/70 text-sm font-medium flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Posts Queue ({posts.length})</h3>
            {posts.map(post => (
              <Card key={post.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.platform === "instagram" ? <Instagram className="h-4 w-4 text-pink-400" /> : <Music2 className="h-4 w-4 text-cyan-400" />}
                        <Badge variant="outline" className="text-xs border-white/20 text-white/60">{post.post_type}</Badge>
                        <Badge className={`text-xs ${post.status === "published" ? "bg-green-500/20 text-green-400" : post.status === "scheduled" ? "bg-blue-500/20 text-blue-400" : post.status === "failed" ? "bg-red-500/20 text-red-400" : post.status === "publishing" ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-white/50"}`}>{post.status}</Badge>
                        {post.auto_reply_enabled && <Badge className="bg-purple-500/20 text-purple-400 text-xs"><Bot className="h-3 w-3 mr-1" />Auto</Badge>}
                      </div>
                      <p className="text-sm text-white/80 line-clamp-2">{post.caption || "No caption"}</p>
                      {post.redirect_url && <p className="text-xs text-blue-400 mt-1 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> {post.redirect_url}</p>}
                      {post.scheduled_at && <p className="text-xs text-white/40 mt-1">📅 {new Date(post.scheduled_at).toLocaleString()}</p>}
                    </div>
                    <div className="flex gap-1">
                      {post.status !== "published" && <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-500/10" onClick={() => publishPost(post)}><Send className="h-4 w-4" /></Button>}
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deletePost(post.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && <p className="text-center text-white/40 py-8">No posts yet — create one above</p>}
          </div>
        </TabsContent>

        {/* ===== MEDIA LIBRARY ===== */}
        <TabsContent value="media" className="space-y-4">
          <div className="flex gap-2 mb-2">
            <Button size="sm" onClick={fetchMedia} className="bg-white/10 text-white hover:bg-white/20"><Download className="h-3.5 w-3.5 mr-1.5" /> Pull All Media</Button>
          </div>

          {igMedia.length > 0 && (
            <div>
              <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-400" /> Instagram ({igMedia.length})</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {igMedia.map((m: any) => (
                  <div key={m.id} className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:border-pink-500/50 transition-all" onClick={() => setSelectedMedia(m)}>
                    <img src={m.thumbnail_url || m.media_url} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-2 text-white text-xs"><Heart className="h-3 w-3" /> {m.like_count || 0}</div>
                      <div className="flex items-center gap-2 text-white text-xs"><MessageSquare className="h-3 w-3" /> {m.comments_count || 0}</div>
                      <Badge className="text-xs bg-white/20 text-white mt-1">{m.media_type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ttVideos.length > 0 && (
            <div>
              <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2"><Music2 className="h-4 w-4 text-cyan-400" /> TikTok ({ttVideos.length})</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {ttVideos.map((v: any) => (
                  <div key={v.id} className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all" onClick={() => setSelectedMedia(v)}>
                    {v.cover_image_url && <img src={v.cover_image_url} className="w-full aspect-[9/16] object-cover" />}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-2 text-white text-xs"><Eye className="h-3 w-3" /> {(v.view_count || 0).toLocaleString()}</div>
                      <div className="flex items-center gap-2 text-white text-xs"><Heart className="h-3 w-3" /> {(v.like_count || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Media Details */}
          {selectedMedia && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-lg flex justify-between items-center">
                Media Details
                <Button size="sm" variant="ghost" className="text-white/50" onClick={() => setSelectedMedia(null)}>✕</Button>
              </CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-white/80">{selectedMedia.caption || selectedMedia.title || selectedMedia.video_description || "No caption"}</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedMedia.like_count !== undefined && <Badge className="bg-white/10 text-white"><Heart className="h-3 w-3 mr-1" /> {selectedMedia.like_count}</Badge>}
                  {selectedMedia.comments_count !== undefined && <Badge className="bg-white/10 text-white"><MessageSquare className="h-3 w-3 mr-1" /> {selectedMedia.comments_count}</Badge>}
                  {selectedMedia.view_count !== undefined && <Badge className="bg-white/10 text-white"><Eye className="h-3 w-3 mr-1" /> {selectedMedia.view_count?.toLocaleString()}</Badge>}
                  {selectedMedia.share_count !== undefined && <Badge className="bg-white/10 text-white"><Share2 className="h-3 w-3 mr-1" /> {selectedMedia.share_count}</Badge>}
                </div>
                {selectedMedia.permalink && <a href={selectedMedia.permalink} target="_blank" className="text-blue-400 text-sm flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View on platform</a>}
                <div className="flex gap-2">
                  {selectedMedia.media_type && <Button size="sm" onClick={() => getMediaInsights(selectedMedia.id, selectedMedia.media_type)} className="bg-white/10 text-white hover:bg-white/20"><BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Get Insights</Button>}
                  {selectedMedia.permalink?.includes("instagram") && <Button size="sm" variant="destructive" onClick={() => deleteMedia(selectedMedia.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete</Button>}
                </div>
                {mediaInsights && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {(mediaInsights.data || []).map((m: any) => (
                      <div key={m.name} className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-xs text-white/50 capitalize">{m.name?.replace(/_/g, " ")}</p>
                        <p className="text-white font-bold">{(m.values?.[0]?.value || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {igMedia.length === 0 && ttVideos.length === 0 && <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><Image className="h-12 w-12 text-white/20 mx-auto mb-3" /><p className="text-white/50">Click "Pull All Media" to load your content</p></CardContent></Card>}
        </TabsContent>

        {/* ===== DISCOVERY ===== */}
        <TabsContent value="discovery" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Compass className="h-5 w-5 text-green-400" /> Profile Discovery & Competitor Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <select value={discoveryPlatform} onChange={e => setDiscoveryPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">Instagram</option>
                  <option value="tiktok" className="bg-gray-900">TikTok</option>
                </select>
                <Input value={discoveryUsername} onChange={e => setDiscoveryUsername(e.target.value)} placeholder="Enter username to look up..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
                <Button onClick={discoverUser} disabled={apiLoading} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"><Search className="h-4 w-4 mr-2" /> Discover</Button>
              </div>

              {discoveryResult && (
                <div className="space-y-4 mt-4">
                  {discoveryResult.business_discovery ? (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        {discoveryResult.business_discovery.profile_picture_url && <img src={discoveryResult.business_discovery.profile_picture_url} className="h-16 w-16 rounded-full border-2 border-green-500/30" />}
                        <div>
                          <h3 className="text-white font-bold text-lg">{discoveryResult.business_discovery.name}</h3>
                          <p className="text-green-300 text-sm">@{discoveryResult.business_discovery.username}</p>
                          <p className="text-white/60 text-xs mt-1">{discoveryResult.business_discovery.biography}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold text-lg">{(discoveryResult.business_discovery.followers_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Followers</p></div>
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold text-lg">{(discoveryResult.business_discovery.follows_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Following</p></div>
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold text-lg">{(discoveryResult.business_discovery.media_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Posts</p></div>
                      </div>
                      {discoveryResult.business_discovery.media?.data && (
                        <div>
                          <h4 className="text-white/70 text-sm font-medium mb-2">Recent Media</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {discoveryResult.business_discovery.media.data.map((m: any) => (
                              <div key={m.id} className="bg-white/5 rounded-lg p-2 text-center">
                                <div className="flex items-center justify-center gap-2 text-xs text-white/60 mb-1"><Heart className="h-3 w-3" /> {m.like_count} <MessageSquare className="h-3 w-3 ml-1" /> {m.comments_count}</div>
                                <p className="text-xs text-white/40 line-clamp-1">{m.caption?.substring(0, 30)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : discoveryResult.data?.user ? (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        {discoveryResult.data.user.avatar_url && <img src={discoveryResult.data.user.avatar_url} className="h-16 w-16 rounded-full border-2 border-cyan-500/30" />}
                        <div>
                          <h3 className="text-white font-bold text-lg">{discoveryResult.data.user.display_name}</h3>
                          {discoveryResult.data.user.is_verified && <Badge className="bg-blue-500/20 text-blue-400 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold">{(discoveryResult.data.user.follower_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Followers</p></div>
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold">{(discoveryResult.data.user.following_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Following</p></div>
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold">{(discoveryResult.data.user.likes_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Likes</p></div>
                        <div className="bg-white/5 rounded-lg p-3 text-center"><p className="text-white font-bold">{(discoveryResult.data.user.video_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Videos</p></div>
                      </div>
                    </div>
                  ) : <p className="text-white/40 text-sm">No data found for this user</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HASHTAGS ===== */}
        <TabsContent value="hashtags" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Hash className="h-5 w-5 text-yellow-400" /> Hashtag Research</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <select value={hashtagPlatform} onChange={e => setHashtagPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">Instagram</option>
                  <option value="tiktok" className="bg-gray-900">TikTok</option>
                </select>
                <Input value={hashtagQuery} onChange={e => setHashtagQuery(e.target.value)} placeholder="Enter hashtag (without #)..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
                <Button onClick={searchHashtag} disabled={apiLoading} className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white"><Search className="h-4 w-4 mr-2" /> Search</Button>
              </div>

              {hashtagResults && (
                <div className="space-y-4 mt-4">
                  {hashtagResults.top && (
                    <div>
                      <h4 className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2"><Flame className="h-4 w-4 text-orange-400" /> Top Posts</h4>
                      <div className="space-y-2">
                        {hashtagResults.top.slice(0, 10).map((p: any) => (
                          <div key={p.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                            <p className="text-sm text-white/80 line-clamp-1 flex-1">{p.caption?.substring(0, 60) || "No caption"}</p>
                            <div className="flex items-center gap-3 text-xs text-white/50">
                              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.like_count}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {p.comments_count}</span>
                              {p.permalink && <a href={p.permalink} target="_blank" className="text-blue-400"><ExternalLink className="h-3 w-3" /></a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {hashtagResults.recent && (
                    <div>
                      <h4 className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-blue-400" /> Recent Posts</h4>
                      <div className="space-y-2">
                        {hashtagResults.recent.slice(0, 10).map((p: any) => (
                          <div key={p.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                            <p className="text-sm text-white/80 line-clamp-1 flex-1">{p.caption?.substring(0, 60) || "No caption"}</p>
                            <div className="flex items-center gap-3 text-xs text-white/50">
                              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.like_count}</span>
                              {p.permalink && <a href={p.permalink} target="_blank" className="text-blue-400"><ExternalLink className="h-3 w-3" /></a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {hashtagResults.data?.hashtags && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {hashtagResults.data.hashtags.map((h: any) => (
                        <Card key={h.id} className="bg-white/5 border-white/10">
                          <CardContent className="p-4">
                            <h4 className="text-white font-bold text-lg">#{h.name}</h4>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="text-center"><p className="text-white font-bold">{(h.video_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Videos</p></div>
                              <div className="text-center"><p className="text-white font-bold">{(h.view_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Views</p></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ENGAGEMENT ===== */}
        <TabsContent value="engagement" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5 text-purple-400" /> Comment Manager</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <select value={commentsPlatform} onChange={e => setCommentsPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">Instagram</option>
                  <option value="tiktok" className="bg-gray-900">TikTok</option>
                </select>
                <Input value={commentsMediaId} onChange={e => setCommentsMediaId(e.target.value)} placeholder="Media/Video ID..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
                <Button onClick={fetchComments} disabled={apiLoading} className="bg-purple-600 hover:bg-purple-700 text-white"><MessageSquare className="h-4 w-4 mr-2" /> Load</Button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {commentsList.map((c: any) => (
                  <div key={c.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{c.username || "User"}</span>
                          {c.like_count > 0 && <span className="text-xs text-white/40 flex items-center gap-1"><Heart className="h-3 w-3" /> {c.like_count}</span>}
                          {c.reply_count > 0 && <span className="text-xs text-white/40 flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {c.reply_count}</span>}
                        </div>
                        <p className="text-sm text-white/70">{c.text}</p>
                      </div>
                      <div className="flex gap-1">
                        {commentsPlatform === "instagram" && <>
                          <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-500/10 h-7 w-7 p-0" onClick={() => hideComment(c.id)} title="Hide"><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0" onClick={() => deleteComment(c.id)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                        </>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-8" />
                      <Button size="sm" onClick={() => replyToComment(c.id, c.text, c.username)} className="bg-purple-600 text-white h-8"><Send className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
                {commentsList.length === 0 && <p className="text-center text-white/40 py-4">Enter a media ID and click Load</p>}
              </div>
            </CardContent>
          </Card>

          {/* Reply History */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Reply History</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
              {commentReplies.map(reply => (
                <div key={reply.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">{reply.platform}</Badge>
                    <Badge className={`text-xs ${reply.status === "sent" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{reply.status}</Badge>
                  </div>
                  {reply.comment_text && <p className="text-sm text-white/60 italic">"{reply.comment_text}"</p>}
                  <p className="text-sm text-white/80 mt-1">↳ {reply.reply_text}</p>
                </div>
              ))}
              {commentReplies.length === 0 && <p className="text-center text-white/40 py-4">No replies yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MESSAGING / DMs ===== */}
        <TabsContent value="messaging" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-blue-400" /> Direct Messages</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <select value={dmPlatform} onChange={e => setDmPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">Instagram</option>
                  <option value="tiktok" className="bg-gray-900">TikTok</option>
                </select>
                <Input value={dmRecipientId} onChange={e => setDmRecipientId(e.target.value)} placeholder={dmPlatform === "instagram" ? "Recipient IGSID..." : "Conversation ID..."} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
              </div>
              <Textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} placeholder="Type your message..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]" />
              <Button onClick={sendDM} disabled={apiLoading || !dmMessage} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"><Send className="h-4 w-4 mr-2" /> Send Message</Button>
              <p className="text-xs text-white/30">IG: Use Instagram-Scoped ID (IGSID). TikTok: Use conversation_id from DM API.</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 text-sm font-medium">API Limitations</p>
                <p className="text-yellow-200/60 text-xs mt-1">Instagram DMs require Messenger API access (approved app). TikTok DMs are limited to approved developer accounts. Mass following is <strong>not supported</strong> by either official API — accounts are connected for content management only.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANALYTICS ===== */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex gap-2 mb-2">
            {igConnected && <Button size="sm" onClick={() => fetchAnalytics("instagram")} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Instagram className="h-3.5 w-3.5 mr-1.5" /> Pull IG Analytics</Button>}
            {ttConnected && <Button size="sm" onClick={() => fetchAnalytics("tiktok")} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"><Music2 className="h-3.5 w-3.5 mr-1.5" /> Pull TT Analytics</Button>}
            {igConnected && <Button size="sm" onClick={fetchDemographics} className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"><PieChart className="h-3.5 w-3.5 mr-1.5" /> Demographics</Button>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analytics.slice(0, 12).map(stat => (
              <Card key={stat.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-white/50 capitalize">{stat.metric_type.replace(/_/g, " ")}</p>
                  <p className="text-2xl font-bold text-white">{Number(stat.metric_value).toLocaleString()}</p>
                  <Badge className={`text-xs mt-1 ${stat.platform === "instagram" ? "bg-pink-500/20 text-pink-400" : "bg-cyan-500/20 text-cyan-400"}`}>{stat.platform}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {demographics?.data && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-lg">Audience Demographics</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {demographics.data.map((d: any) => (
                  <div key={d.name} className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm text-white/70 capitalize mb-2">{d.name.replace(/_/g, " ")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(d.values?.[0]?.value || {}).slice(0, 8).map(([k, v]) => (
                        <div key={k} className="text-center"><p className="text-xs text-white/40">{k}</p><p className="text-white font-medium text-sm">{Number(v).toLocaleString()}</p></div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {analytics.length === 0 && <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-3" /><p className="text-white/50">Connect and pull analytics to see data</p></CardContent></Card>}
        </TabsContent>

        {/* ===== BIO LINKS ===== */}
        <TabsContent value="biolink" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Create Bio Link</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-white/50 mb-1 block">URL Slug</label><div className="flex items-center gap-1"><span className="text-xs text-white/30">/link/</span><Input value={newBioLink.slug} onChange={e => setNewBioLink(p => ({ ...p, slug: e.target.value }))} placeholder="username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div></div>
                <div><label className="text-xs text-white/50 mb-1 block">Display Name</label><Input value={newBioLink.title} onChange={e => setNewBioLink(p => ({ ...p, title: e.target.value }))} placeholder="Creator Name" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
              </div>
              <Textarea value={newBioLink.bio} onChange={e => setNewBioLink(p => ({ ...p, bio: e.target.value }))} placeholder="Bio..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={newBioLink.of_link} onChange={e => setNewBioLink(p => ({ ...p, of_link: e.target.value }))} placeholder="OnlyFans link (main CTA)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <div className="space-y-2">
                <div className="flex items-center justify-between"><label className="text-sm text-white/70">Custom Links</label><Button size="sm" variant="ghost" className="text-white/50" onClick={() => setNewBioLink(p => ({ ...p, links: [...p.links, { title: "", url: "", enabled: true }] }))}><Plus className="h-3 w-3 mr-1" /> Add</Button></div>
                {newBioLink.links.map((link, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input value={link.title} onChange={e => { const links = [...newBioLink.links]; links[i] = { ...links[i], title: e.target.value }; setNewBioLink(p => ({ ...p, links })); }} placeholder="Link title" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                    <Input value={link.url} onChange={e => { const links = [...newBioLink.links]; links[i] = { ...links[i], url: e.target.value }; setNewBioLink(p => ({ ...p, links })); }} placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input value={newBioLink.social_links.instagram} onChange={e => setNewBioLink(p => ({ ...p, social_links: { ...p.social_links, instagram: e.target.value } }))} placeholder="IG username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                <Input value={newBioLink.social_links.tiktok} onChange={e => setNewBioLink(p => ({ ...p, social_links: { ...p.social_links, tiktok: e.target.value } }))} placeholder="TikTok" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                <Input value={newBioLink.social_links.twitter} onChange={e => setNewBioLink(p => ({ ...p, social_links: { ...p.social_links, twitter: e.target.value } }))} placeholder="X" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
              </div>
              <Button onClick={createBioLink} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"><Link2 className="h-4 w-4 mr-2" /> Create Bio Link</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {bioLinks.map(link => (
              <Card key={link.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div><h3 className="text-white font-medium">{link.title}</h3><p className="text-sm text-white/50">/link/{link.slug}</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/link/${link.slug}`); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => window.open(`/link/${link.slug}`, "_blank")}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => deleteBioLink(link.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {bioLinks.length === 0 && <p className="text-center text-white/40 py-8">No bio links yet</p>}
          </div>
        </TabsContent>

        {/* ===== RESEARCH (TikTok) ===== */}
        <TabsContent value="research" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Search className="h-5 w-5 text-cyan-400" /> TikTok Video Research</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/40">Search TikTok videos by keywords (comma-separated). Requires Research API access.</p>
              <div className="flex gap-3">
                <Input value={ttResearchKeywords} onChange={e => setTtResearchKeywords(e.target.value)} placeholder="fitness, workout, gym..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
                <Button onClick={researchTikTok} disabled={apiLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Search className="h-4 w-4 mr-2" /> Research</Button>
              </div>

              {ttResearchResults?.data?.videos && (
                <div className="space-y-2">
                  {ttResearchResults.data.videos.map((v: any) => (
                    <div key={v.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 line-clamp-1">{v.video_description || "No description"}</p>
                        <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                          <span>@{v.username}</span>
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {(v.view_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {(v.like_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {(v.share_count || 0).toLocaleString()}</span>
                        </div>
                        {v.hashtag_names && <div className="flex gap-1 mt-1 flex-wrap">{v.hashtag_names.slice(0, 5).map((h: string) => <Badge key={h} className="text-xs bg-cyan-500/10 text-cyan-400">#{h}</Badge>)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Instagram className="h-5 w-5 text-pink-400" /> Instagram Tagged & Mentions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_tagged_media", params: { limit: 25 } }); if (d) toast.success(`Found ${d.data?.length || 0} tagged posts`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><AtSign className="h-3.5 w-3.5 mr-1.5" /> Get Tagged Media</Button>
                <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_mentioned_media", params: { limit: 25 } }); if (d) toast.success(`Found ${d.data?.length || 0} mentions`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Megaphone className="h-3.5 w-3.5 mr-1.5" /> Get Mentions</Button>
                <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_stories" }); if (d) toast.success(`Found ${d.data?.length || 0} stories`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Radio className="h-3.5 w-3.5 mr-1.5" /> Get Stories</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CONNECT ===== */}
        <TabsContent value="connect" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Connect Platform Account</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <select value={connectForm.platform} onChange={e => setConnectForm(p => ({ ...p, platform: e.target.value }))} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                <option value="instagram" className="bg-gray-900">Instagram</option>
                <option value="tiktok" className="bg-gray-900">TikTok</option>
              </select>
              <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Platform username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder="Platform User ID (IG Business ID or TikTok Open ID)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token (optional)" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Button onClick={connectPlatform} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"><CheckCircle2 className="h-4 w-4 mr-2" /> Connect Account</Button>

              {connections.filter(c => c.is_connected).length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <h4 className="text-sm text-white/70">Active Connections</h4>
                  {connections.filter(c => c.is_connected).map(conn => (
                    <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        {conn.platform === "instagram" ? <Instagram className="h-4 w-4 text-pink-400" /> : <Music2 className="h-4 w-4 text-cyan-400" />}
                        <span className="text-sm text-white">{conn.platform_username}</span>
                        {conn.token_expires_at && <span className="text-xs text-white/30">Expires: {new Date(conn.token_expires_at).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-yellow-400 text-xs" onClick={async () => {
                          if (conn.platform === "instagram") await callApi("instagram-api", { action: "debug_token" });
                          else await callApi("tiktok-api", { action: "get_creator_info" });
                          toast.success("Token validated!");
                        }}>Validate</Button>
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => disconnectPlatform(conn.id)}>Disconnect</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-white font-medium">Setup Guide</h3>
              <div className="space-y-2 text-sm text-white/60">
                <p><strong className="text-pink-400">Instagram (Meta Graph API):</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" className="text-blue-400 underline">developers.facebook.com</a></li>
                  <li>Create a Business App → Add Instagram Graph API</li>
                  <li>Get your Instagram Business Account ID</li>
                  <li>Generate a long-lived access token (60 days)</li>
                  <li>Required scopes: instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_insights, pages_show_list, pages_read_engagement</li>
                </ol>
                <p className="mt-3"><strong className="text-cyan-400">TikTok API v2:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to <a href="https://developers.tiktok.com" target="_blank" className="text-blue-400 underline">developers.tiktok.com</a></li>
                  <li>Create an app → Request scopes: user.info.basic, user.info.profile, user.info.stats, video.list, video.publish, video.upload</li>
                  <li>Optional: research.data.basic (for Research API)</li>
                  <li>Complete OAuth flow to get access token + refresh token</li>
                </ol>
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-300 text-xs font-medium">⚠️ Important Notes</p>
                  <ul className="list-disc pl-4 mt-1 text-xs text-yellow-200/60 space-y-1">
                    <li><strong>Account creation</strong> is NOT possible via API — you must create IG/TikTok accounts manually</li>
                    <li><strong>Mass following</strong> is NOT supported by either official API</li>
                    <li>Instagram DMs require approved Messenger Platform access</li>
                    <li>TikTok Research API requires separate approval</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMediaHub;

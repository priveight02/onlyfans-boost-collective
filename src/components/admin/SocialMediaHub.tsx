import { useState, useEffect } from "react";
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
  Wand2, Brain, Cpu, RotateCcw,
} from "lucide-react";

const SocialMediaHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("dashboard");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [connections, setConnections] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [bioLinks, setBioLinks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [commentReplies, setCommentReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // Profiles
  const [igProfile, setIgProfile] = useState<any>(null);
  const [ttProfile, setTtProfile] = useState<any>(null);

  // Discovery
  const [discoveryUsername, setDiscoveryUsername] = useState("");
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [discoveryPlatform, setDiscoveryPlatform] = useState("instagram");

  // Hashtag
  const [hashtagQuery, setHashtagQuery] = useState("");
  const [hashtagResults, setHashtagResults] = useState<any>(null);
  const [hashtagPlatform, setHashtagPlatform] = useState("instagram");

  // Media
  const [igMedia, setIgMedia] = useState<any[]>([]);
  const [ttVideos, setTtVideos] = useState<any[]>([]);
  const [mediaInsights, setMediaInsights] = useState<any>(null);

  // Comments
  const [commentsMediaId, setCommentsMediaId] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [commentsPlatform, setCommentsPlatform] = useState("instagram");

  // DMs
  const [dmRecipientId, setDmRecipientId] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [dmPlatform, setDmPlatform] = useState("instagram");

  // AI Auto-DM
  const [aiDmEnabled, setAiDmEnabled] = useState(false);
  const [aiDmTone, setAiDmTone] = useState("flirty and engaging");
  const [aiDmRedirectUrl, setAiDmRedirectUrl] = useState("");
  const [aiDmKeywords, setAiDmKeywords] = useState("");
  const [aiTestMessage, setAiTestMessage] = useState("");
  const [aiTestReply, setAiTestReply] = useState("");
  const [aiTestSender, setAiTestSender] = useState("");

  // AI Auto-Reply Comments
  const [aiAutoReplyEnabled, setAiAutoReplyEnabled] = useState(false);
  const [aiAutoReplyStyle, setAiAutoReplyStyle] = useState("friendly and warm");
  const [aiAutoReplyRedirect, setAiAutoReplyRedirect] = useState("");
  const [bulkAiReplies, setBulkAiReplies] = useState<any[]>([]);

  // AI Caption Generator
  const [aiCaptionTopic, setAiCaptionTopic] = useState("");
  const [aiCaptionPlatform, setAiCaptionPlatform] = useState("instagram");
  const [aiCaptionStyle, setAiCaptionStyle] = useState("trendy and engaging");
  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiCaptionCta, setAiCaptionCta] = useState(true);

  // AI Content Analyzer
  const [aiAnalyzeCaption, setAiAnalyzeCaption] = useState("");
  const [aiAnalyzeResult, setAiAnalyzeResult] = useState("");

  // Advanced Search
  const [searchType, setSearchType] = useState("username");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPlatform, setSearchPlatform] = useState("both");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [ttResearchKeywords, setTtResearchKeywords] = useState("");
  const [ttResearchResults, setTtResearchResults] = useState<any>(null);

  // New post form
  const [newPost, setNewPost] = useState({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "", alt_text: "" });

  // New bio link
  const [newBioLink, setNewBioLink] = useState({ slug: "", title: "", bio: "", of_link: "", theme: "dark", links: [{ title: "", url: "", enabled: true }], social_links: { instagram: "", tiktok: "", twitter: "" } });

  // Connect form
  const [connectForm, setConnectForm] = useState({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" });

  const [publishingLimit, setPublishingLimit] = useState<any>(null);
  const [demographics, setDemographics] = useState<any>(null);

  // TT conversations
  const [ttConversations, setTtConversations] = useState<any[]>([]);
  const [ttMessages, setTtMessages] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState("");

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (selectedAccount) loadData(); }, [selectedAccount]);

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

  const deletePost = async (id: string) => { await supabase.from("social_posts").delete().eq("id", id); toast.success("Deleted"); loadData(); };
  const createBioLink = async () => {
    if (!newBioLink.slug || !newBioLink.title) { toast.error("Fill slug and title"); return; }
    const { error } = await supabase.from("bio_links").insert({ account_id: selectedAccount, slug: newBioLink.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""), title: newBioLink.title, bio: newBioLink.bio || null, of_link: newBioLink.of_link || null, theme: newBioLink.theme, links: newBioLink.links.filter(l => l.title && l.url), social_links: newBioLink.social_links, is_active: true });
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
    if (platform === "instagram") await callApi("instagram-api", { action: "get_account_insights", params: { period: "day" } });
    else await callApi("tiktok-api", { action: "get_user_info" });
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
    if (commentsPlatform === "instagram") await callApi("instagram-api", { action: "reply_to_comment", params: { comment_id: commentId, media_id: commentsMediaId, message: replyText, comment_text: commentText, comment_author: author } });
    else await callApi("tiktok-api", { action: "reply_to_comment", params: { video_id: commentsMediaId, comment_id: commentId, message: replyText, comment_text: commentText, comment_author: author } });
    setReplyText(""); toast.success("Reply sent!"); loadData();
  };

  const hideComment = async (commentId: string) => { await callApi("instagram-api", { action: "hide_comment", params: { comment_id: commentId } }); toast.success("Comment hidden!"); };
  const deleteComment = async (commentId: string) => { if (commentsPlatform === "instagram") await callApi("instagram-api", { action: "delete_comment", params: { comment_id: commentId } }); toast.success("Comment deleted!"); fetchComments(); };

  const sendDM = async () => {
    if (!dmRecipientId || !dmMessage) return;
    if (dmPlatform === "instagram") await callApi("instagram-api", { action: "send_message", params: { recipient_id: dmRecipientId, message: dmMessage } });
    else await callApi("tiktok-api", { action: "send_dm", params: { conversation_id: dmRecipientId, message: dmMessage } });
    toast.success("Message sent!"); setDmMessage("");
  };

  const getMediaInsights = async (mediaId: string, type: string) => {
    let action = "get_media_insights";
    if (type === "reel" || type === "REELS") action = "get_reel_insights";
    if (type === "story" || type === "STORY") action = "get_story_insights";
    const d = await callApi("instagram-api", { action, params: { media_id: mediaId } });
    if (d) { setMediaInsights(d); toast.success("Insights loaded!"); }
  };

  const deleteMedia = async (mediaId: string) => { await callApi("instagram-api", { action: "delete_media", params: { media_id: mediaId } }); toast.success("Deleted!"); fetchMedia(); };

  // ===== ADVANCED SEARCH =====
  const performSearch = async () => {
    if (!searchQuery) return;
    setSearchResults(null);

    if (searchType === "username") {
      const results: any = {};
      if (searchPlatform !== "tiktok" && igConnected) {
        const d = await callApi("instagram-api", { action: "discover_user", params: { username: searchQuery, media_limit: 12 } });
        if (d) results.instagram = d;
      }
      if (searchPlatform !== "instagram" && ttConnected) {
        const d = await callApi("tiktok-api", { action: "research_user", params: { username: searchQuery } });
        if (d) results.tiktok = d;
      }
      setSearchResults({ type: "username", data: results });
    } else if (searchType === "hashtag") {
      const results: any = {};
      if (searchPlatform !== "tiktok" && igConnected) {
        const d = await callApi("instagram-api", { action: "search_hashtag", params: { hashtag: searchQuery } });
        if (d?.data?.[0]) {
          const [top, recent] = await Promise.all([
            callApi("instagram-api", { action: "get_hashtag_top_media", params: { hashtag_id: d.data[0].id } }),
            callApi("instagram-api", { action: "get_hashtag_recent_media", params: { hashtag_id: d.data[0].id } }),
          ]);
          results.instagram = { id: d.data[0].id, top: top?.data || [], recent: recent?.data || [] };
        }
      }
      if (searchPlatform !== "instagram" && ttConnected) {
        const d = await callApi("tiktok-api", { action: "research_hashtag", params: { hashtags: [searchQuery] } });
        if (d) results.tiktok = d;
      }
      setSearchResults({ type: "hashtag", data: results });
    } else if (searchType === "keyword") {
      const results: any = {};
      if (ttConnected) {
        const keywords = searchQuery.split(",").map(k => k.trim());
        const d = await callApi("tiktok-api", { action: "research_videos", params: { keywords, limit: 20 } });
        if (d) results.tiktok = d;
      }
      setSearchResults({ type: "keyword", data: results });
    } else if (searchType === "content") {
      // Search through local posts/media
      const localResults = posts.filter(p =>
        p.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.post_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const mediaResults = igMedia.filter(m =>
        m.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults({ type: "content", data: { posts: localResults, media: mediaResults } });
    }
  };

  // ===== AI FUNCTIONS =====
  const generateAiDmReply = async () => {
    if (!aiTestMessage) return;
    const d = await callApi("social-ai-responder", {
      action: "generate_dm_reply",
      params: {
        message_text: aiTestMessage,
        sender_name: aiTestSender || "fan",
        persona_tone: aiDmTone,
        auto_redirect_url: aiDmRedirectUrl,
        keywords_trigger: aiDmKeywords,
      },
    });
    if (d) setAiTestReply(d.reply);
  };

  const generateAiCommentReply = async (comment: any) => {
    const d = await callApi("social-ai-responder", {
      action: "generate_comment_reply",
      params: {
        comment_text: comment.text,
        comment_author: comment.username,
        reply_style: aiAutoReplyStyle,
        redirect_url: aiAutoReplyRedirect,
      },
    });
    if (d?.reply) {
      setReplyText(d.reply);
      toast.success("AI reply generated!");
    }
  };

  const bulkGenerateReplies = async () => {
    if (commentsList.length === 0) { toast.error("Load comments first"); return; }
    toast.info("Generating AI replies for all comments...");
    const d = await callApi("social-ai-responder", {
      action: "bulk_generate_replies",
      params: {
        comments: commentsList.slice(0, 20),
        reply_style: aiAutoReplyStyle,
        redirect_url: aiAutoReplyRedirect,
      },
    });
    if (d) { setBulkAiReplies(d.replies || []); toast.success(`Generated ${d.total} AI replies!`); }
  };

  const sendBulkReply = async (reply: any) => {
    if (commentsPlatform === "instagram") {
      await callApi("instagram-api", { action: "reply_to_comment", params: { comment_id: reply.comment_id, media_id: commentsMediaId, message: reply.generated_reply, comment_text: reply.comment_text, comment_author: reply.username } });
    } else {
      await callApi("tiktok-api", { action: "reply_to_comment", params: { video_id: commentsMediaId, comment_id: reply.comment_id, message: reply.generated_reply, comment_text: reply.comment_text, comment_author: reply.username } });
    }
    toast.success("Reply sent!"); loadData();
    setBulkAiReplies(prev => prev.filter(r => r.comment_id !== reply.comment_id));
  };

  const sendAllBulkReplies = async () => {
    toast.info(`Sending ${bulkAiReplies.length} replies...`);
    for (const reply of bulkAiReplies) {
      await sendBulkReply(reply);
      await new Promise(r => setTimeout(r, 1000));
    }
    toast.success("All replies sent!");
  };

  const generateAiCaption = async () => {
    if (!aiCaptionTopic) return;
    const d = await callApi("social-ai-responder", {
      action: "generate_caption",
      params: { topic: aiCaptionTopic, platform: aiCaptionPlatform, style: aiCaptionStyle, include_cta: aiCaptionCta },
    });
    if (d) setAiCaptionResult(d.caption);
  };

  const analyzeContent = async () => {
    if (!aiAnalyzeCaption) return;
    const d = await callApi("social-ai-responder", {
      action: "analyze_content",
      params: { caption: aiAnalyzeCaption, platform: "instagram", content_type: "post" },
    });
    if (d) setAiAnalyzeResult(d.analysis);
  };

  // Auto-reply to DM using AI then send
  const aiReplyAndSendDm = async () => {
    if (!dmRecipientId || !dmMessage) return;
    const d = await callApi("social-ai-responder", {
      action: "generate_dm_reply",
      params: {
        message_text: dmMessage,
        sender_name: "fan",
        persona_tone: aiDmTone,
        auto_redirect_url: aiDmRedirectUrl,
        keywords_trigger: aiDmKeywords,
      },
    });
    if (d?.reply) {
      setDmMessage(d.reply);
      toast.success("AI generated reply - review and send!");
    }
  };

  // Fetch TT conversations
  const fetchTtConversations = async () => {
    const d = await callApi("tiktok-api", { action: "get_conversations" });
    if (d) { setTtConversations(d.data?.conversations || []); toast.success("Conversations loaded!"); }
  };

  const fetchTtMessages = async (convId: string) => {
    setSelectedConversation(convId);
    const d = await callApi("tiktok-api", { action: "get_messages", params: { conversation_id: convId, limit: 20 } });
    if (d) setTtMessages(d.data?.messages || []);
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
            <p className="text-sm text-white/50">AI-Powered · Auto-DM · Auto-Reply · Multi-Search · Full API Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {apiLoading && <div className="flex items-center gap-2 text-yellow-400 text-xs"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> API Call...</div>}
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
            {accounts.map(a => (<option key={a.id} value={a.id} className="bg-gray-900">{a.display_name || a.username}</option>))}
          </select>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-pink-400" />
              <span className="text-white font-medium">Instagram</span>
              {igConnected ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="h-3 w-3 mr-1" />Live</Badge> : <Badge variant="outline" className="border-white/20 text-white/50"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
            </div>
            {igConnected && <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => fetchAnalytics("instagram")}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={fetchPublishingLimit}><Shield className="h-4 w-4" /></Button>
            </div>}
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
            <TabsTrigger value="search" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Search className="h-3.5 w-3.5" /> Search</TabsTrigger>
            <TabsTrigger value="ai-automation" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Brain className="h-3.5 w-3.5" /> AI Automation</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Layers className="h-3.5 w-3.5" /> Content</TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Image className="h-3.5 w-3.5" /> Media</TabsTrigger>
            <TabsTrigger value="engagement" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><MessageSquare className="h-3.5 w-3.5" /> Engagement</TabsTrigger>
            <TabsTrigger value="messaging" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Mail className="h-3.5 w-3.5" /> DMs</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="biolink" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs whitespace-nowrap"><Link2 className="h-3.5 w-3.5" /> Bio Links</TabsTrigger>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {igProfile && (
              <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    {igProfile.profile_picture_url && <img src={igProfile.profile_picture_url} className="h-14 w-14 rounded-full border-2 border-pink-500/30" />}
                    <div><h3 className="text-white font-bold text-lg">{igProfile.name || igProfile.username}</h3><p className="text-pink-300 text-sm">@{igProfile.username}</p></div>
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
                    <div><h3 className="text-white font-bold text-lg">{ttProfile.display_name}</h3><p className="text-cyan-300 text-sm">@{ttProfile.username || "tiktok"}</p>{ttProfile.is_verified && <Badge className="bg-blue-500/20 text-blue-400 text-xs mt-1"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}</div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><Users className="h-5 w-5 text-blue-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{posts.filter(p => p.status === "published").length}</p><p className="text-xs text-white/40">Published</p></CardContent></Card>
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><Clock className="h-5 w-5 text-yellow-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{posts.filter(p => p.status === "scheduled").length}</p><p className="text-xs text-white/40">Scheduled</p></CardContent></Card>
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><Link2 className="h-5 w-5 text-green-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{bioLinks.length}</p><p className="text-xs text-white/40">Bio Links</p></CardContent></Card>
            <Card className="bg-white/5 border-white/10"><CardContent className="p-4 text-center"><MessageCircle className="h-5 w-5 text-purple-400 mx-auto mb-1" /><p className="text-2xl font-bold text-white">{commentReplies.length}</p><p className="text-xs text-white/40">Replies Sent</p></CardContent></Card>
          </div>
          {!igProfile && !ttProfile && (
            <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><Sparkles className="h-12 w-12 text-white/20 mx-auto mb-3" /><p className="text-white/50">Connect your accounts and click "Sync Profiles" to see your dashboard</p></CardContent></Card>
          )}
        </TabsContent>

        {/* ===== ADVANCED SEARCH ===== */}
        <TabsContent value="search" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Search className="h-5 w-5 text-purple-400" /> Universal Search Engine</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <select value={searchType} onChange={e => setSearchType(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="username" className="bg-gray-900">👤 By Username / Profile</option>
                  <option value="hashtag" className="bg-gray-900">🏷️ By Hashtag</option>
                  <option value="keyword" className="bg-gray-900">🔑 By Keyword (TikTok)</option>
                  <option value="content" className="bg-gray-900">📄 By Content / Post Title</option>
                </select>
                <select value={searchPlatform} onChange={e => setSearchPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="both" className="bg-gray-900">🌐 Both Platforms</option>
                  <option value="instagram" className="bg-gray-900">🟣 Instagram Only</option>
                  <option value="tiktok" className="bg-gray-900">🔵 TikTok Only</option>
                </select>
                <Button onClick={performSearch} disabled={apiLoading || !searchQuery} className="bg-gradient-to-r from-purple-500 to-pink-600 text-white"><Search className="h-4 w-4 mr-2" /> Search</Button>
              </div>
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={searchType === "username" ? "Enter username..." : searchType === "hashtag" ? "Enter hashtag (without #)..." : searchType === "keyword" ? "Enter keywords (comma-separated)..." : "Search posts, reels, content..."} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" onKeyDown={e => e.key === "Enter" && performSearch()} />

              {/* Search Results */}
              {searchResults && (
                <div className="space-y-4 mt-4">
                  {searchResults.type === "username" && (
                    <>
                      {searchResults.data?.instagram?.business_discovery && (
                        <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Instagram className="h-5 w-5 text-pink-400" />
                              <h4 className="text-white font-bold">Instagram Profile</h4>
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                              {searchResults.data.instagram.business_discovery.profile_picture_url && <img src={searchResults.data.instagram.business_discovery.profile_picture_url} className="h-12 w-12 rounded-full" />}
                              <div>
                                <p className="text-white font-medium">{searchResults.data.instagram.business_discovery.name}</p>
                                <p className="text-pink-300 text-sm">@{searchResults.data.instagram.business_discovery.username}</p>
                              </div>
                            </div>
                            <p className="text-white/60 text-sm mb-3">{searchResults.data.instagram.business_discovery.biography}</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(searchResults.data.instagram.business_discovery.followers_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Followers</p></div>
                              <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(searchResults.data.instagram.business_discovery.follows_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Following</p></div>
                              <div className="bg-white/5 rounded-lg p-2"><p className="text-white font-bold">{(searchResults.data.instagram.business_discovery.media_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Posts</p></div>
                            </div>
                            {searchResults.data.instagram.business_discovery.media?.data && (
                              <div className="mt-3 grid grid-cols-4 gap-2">
                                {searchResults.data.instagram.business_discovery.media.data.slice(0, 8).map((m: any) => (
                                  <div key={m.id} className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-xs text-white/60 line-clamp-1">{m.caption?.substring(0, 30) || "—"}</p>
                                    <div className="flex items-center justify-center gap-2 mt-1 text-xs text-white/40">
                                      <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{m.like_count}</span>
                                      <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{m.comments_count}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      {searchResults.data?.tiktok?.data && (
                        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3"><Music2 className="h-5 w-5 text-cyan-400" /><h4 className="text-white font-bold">TikTok Profile</h4></div>
                            <pre className="text-xs text-white/60 bg-white/5 rounded-lg p-3 overflow-auto max-h-[200px]">{JSON.stringify(searchResults.data.tiktok.data, null, 2)}</pre>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                  {searchResults.type === "hashtag" && (
                    <>
                      {searchResults.data?.instagram && (
                        <div className="space-y-3">
                          <h4 className="text-white/70 text-sm font-medium flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-400" /> Instagram #{searchQuery}</h4>
                          {searchResults.data.instagram.top?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" /> Top Posts</p>
                              <div className="space-y-2">{searchResults.data.instagram.top.slice(0, 10).map((p: any) => (
                                <div key={p.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                  <p className="text-sm text-white/80 line-clamp-1 flex-1">{p.caption?.substring(0, 80) || "No caption"}</p>
                                  <div className="flex items-center gap-3 text-xs text-white/50">
                                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.like_count}</span>
                                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comments_count}</span>
                                    {p.permalink && <a href={p.permalink} target="_blank" className="text-blue-400"><ExternalLink className="h-3 w-3" /></a>}
                                  </div>
                                </div>
                              ))}</div>
                            </div>
                          )}
                          {searchResults.data.instagram.recent?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Clock className="h-3 w-3 text-blue-400" /> Recent Posts</p>
                              <div className="space-y-2">{searchResults.data.instagram.recent.slice(0, 10).map((p: any) => (
                                <div key={p.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                  <p className="text-sm text-white/80 line-clamp-1 flex-1">{p.caption?.substring(0, 80) || "No caption"}</p>
                                  <div className="flex items-center gap-3 text-xs text-white/50">
                                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.like_count}</span>
                                    {p.permalink && <a href={p.permalink} target="_blank" className="text-blue-400"><ExternalLink className="h-3 w-3" /></a>}
                                  </div>
                                </div>
                              ))}</div>
                            </div>
                          )}
                        </div>
                      )}
                      {searchResults.data?.tiktok?.data?.hashtags && (
                        <div className="space-y-3">
                          <h4 className="text-white/70 text-sm font-medium flex items-center gap-2"><Music2 className="h-4 w-4 text-cyan-400" /> TikTok #{searchQuery}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {searchResults.data.tiktok.data.hashtags.map((h: any) => (
                              <Card key={h.id} className="bg-white/5 border-white/10"><CardContent className="p-4">
                                <h4 className="text-white font-bold text-lg">#{h.name}</h4>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="text-center"><p className="text-white font-bold">{(h.video_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Videos</p></div>
                                  <div className="text-center"><p className="text-white font-bold">{(h.view_count || 0).toLocaleString()}</p><p className="text-white/40 text-xs">Views</p></div>
                                </div>
                              </CardContent></Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {searchResults.type === "keyword" && searchResults.data?.tiktok?.data?.videos && (
                    <div className="space-y-2">
                      <h4 className="text-white/70 text-sm font-medium">TikTok Videos for "{searchQuery}"</h4>
                      {searchResults.data.tiktok.data.videos.map((v: any) => (
                        <div key={v.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 line-clamp-1">{v.video_description || "No description"}</p>
                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                              <span>@{v.username}</span>
                              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(v.view_count || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{(v.like_count || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{(v.share_count || 0).toLocaleString()}</span>
                            </div>
                            {v.hashtag_names && <div className="flex gap-1 mt-1 flex-wrap">{v.hashtag_names.slice(0, 5).map((h: string) => <Badge key={h} className="text-xs bg-cyan-500/10 text-cyan-400">#{h}</Badge>)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.type === "content" && (
                    <div className="space-y-3">
                      <h4 className="text-white/70 text-sm font-medium">Local Content Matching "{searchQuery}"</h4>
                      {(searchResults.data?.posts || []).map((p: any) => (
                        <div key={p.id} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {p.platform === "instagram" ? <Instagram className="h-4 w-4 text-pink-400" /> : <Music2 className="h-4 w-4 text-cyan-400" />}
                            <Badge variant="outline" className="text-xs border-white/20 text-white/60">{p.post_type}</Badge>
                            <Badge className={`text-xs ${p.status === "published" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/50"}`}>{p.status}</Badge>
                          </div>
                          <p className="text-sm text-white/80 line-clamp-2">{p.caption}</p>
                        </div>
                      ))}
                      {(searchResults.data?.media || []).map((m: any) => (
                        <div key={m.id} className="bg-white/5 rounded-lg p-3">
                          <Badge className="text-xs bg-pink-500/20 text-pink-400 mb-1">{m.media_type}</Badge>
                          <p className="text-sm text-white/80 line-clamp-2">{m.caption || "No caption"}</p>
                          <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{m.like_count}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{m.comments_count}</span>
                          </div>
                        </div>
                      ))}
                      {(!searchResults.data?.posts?.length && !searchResults.data?.media?.length) && <p className="text-center text-white/40 py-4">No matching content found. Pull media first.</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-sm text-white/70 mb-3 flex items-center gap-2"><Compass className="h-4 w-4" /> Quick Discovery</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_tagged_media", params: { limit: 25 } }); if (d) toast.success(`Found ${d.data?.length || 0} tagged posts`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><AtSign className="h-3.5 w-3.5 mr-1" /> IG Tagged</Button>
                  <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_mentioned_media", params: { limit: 25 } }); if (d) toast.success(`Found ${d.data?.length || 0} mentions`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Megaphone className="h-3.5 w-3.5 mr-1" /> IG Mentions</Button>
                  <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_stories" }); if (d) toast.success(`Found ${d.data?.length || 0} stories`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Radio className="h-3.5 w-3.5 mr-1" /> IG Stories</Button>
                  <Button size="sm" onClick={async () => { const d = await callApi("instagram-api", { action: "get_live_media" }); if (d) toast.success(`Found ${d.data?.length || 0} live media`); }} disabled={!igConnected || apiLoading} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Video className="h-3.5 w-3.5 mr-1" /> IG Live</Button>
                  <Button size="sm" onClick={async () => { const d = await callApi("tiktok-api", { action: "get_playlists" }); if (d) toast.success("Playlists loaded"); }} disabled={!ttConnected || apiLoading} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"><FolderOpen className="h-3.5 w-3.5 mr-1" /> TT Playlists</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AI AUTOMATION ===== */}
        <TabsContent value="ai-automation" className="space-y-4">
          {/* AI Auto-DM Responder */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-purple-400" /> AI Auto-DM Responder <Badge className="bg-purple-500/20 text-purple-300 text-xs">Gemini AI</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/40">AI will generate contextual replies to DMs using your persona profile. Test below then send manually or auto-send.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">AI Tone</label>
                  <select value={aiDmTone} onChange={e => setAiDmTone(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                    <option className="bg-gray-900" value="flirty and engaging">💋 Flirty & Engaging</option>
                    <option className="bg-gray-900" value="friendly and warm">😊 Friendly & Warm</option>
                    <option className="bg-gray-900" value="mysterious and alluring">🌙 Mysterious & Alluring</option>
                    <option className="bg-gray-900" value="playful and teasing">😈 Playful & Teasing</option>
                    <option className="bg-gray-900" value="professional and polite">💼 Professional & Polite</option>
                    <option className="bg-gray-900" value="bold and direct">🔥 Bold & Direct</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Auto-Redirect URL</label>
                  <Input value={aiDmRedirectUrl} onChange={e => setAiDmRedirectUrl(e.target.value)} placeholder="https://onlyfans.com/..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Trigger Keywords (comma-separated) — AI will redirect when these are mentioned</label>
                <Input value={aiDmKeywords} onChange={e => setAiDmKeywords(e.target.value)} placeholder="content, exclusive, private, link, onlyfans, subscribe..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-sm text-white/70 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> Test AI Responder</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Input value={aiTestSender} onChange={e => setAiTestSender(e.target.value)} placeholder="Sender name..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  <Input value={aiTestMessage} onChange={e => setAiTestMessage(e.target.value)} placeholder="Test message from fan..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 col-span-2" onKeyDown={e => e.key === "Enter" && generateAiDmReply()} />
                </div>
                <Button onClick={generateAiDmReply} disabled={apiLoading || !aiTestMessage} className="mt-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white"><Brain className="h-4 w-4 mr-2" /> Generate AI Reply</Button>
                {aiTestReply && (
                  <div className="mt-3 bg-white/5 rounded-lg p-4 border border-purple-500/20">
                    <p className="text-xs text-purple-400 mb-1">AI Generated Reply:</p>
                    <p className="text-white">{aiTestReply}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => { navigator.clipboard.writeText(aiTestReply); toast.success("Copied!"); }} className="bg-white/10 text-white hover:bg-white/20"><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                      <Button size="sm" onClick={() => { setDmMessage(aiTestReply); setActiveSubTab("messaging"); toast.success("Pasted to DM composer!"); }} className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"><Send className="h-3.5 w-3.5 mr-1" /> Send as DM</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Auto-Reply to Comments */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Bot className="h-5 w-5 text-green-400" /> AI Comment Auto-Reply Engine</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/40">Load comments from any post, then generate AI replies for ALL of them at once. Review and send individually or bulk-send.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Reply Style</label>
                  <select value={aiAutoReplyStyle} onChange={e => setAiAutoReplyStyle(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                    <option className="bg-gray-900" value="friendly and warm">😊 Friendly & Warm</option>
                    <option className="bg-gray-900" value="flirty and playful">💋 Flirty & Playful</option>
                    <option className="bg-gray-900" value="grateful and humble">🙏 Grateful & Humble</option>
                    <option className="bg-gray-900" value="witty and funny">😂 Witty & Funny</option>
                    <option className="bg-gray-900" value="mysterious and intriguing">🌙 Mysterious & Intriguing</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Redirect Link (optional)</label>
                  <Input value={aiAutoReplyRedirect} onChange={e => setAiAutoReplyRedirect(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
              </div>
              <div className="flex gap-3">
                <select value={commentsPlatform} onChange={e => setCommentsPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">Instagram</option>
                  <option value="tiktok" className="bg-gray-900">TikTok</option>
                </select>
                <Input value={commentsMediaId} onChange={e => setCommentsMediaId(e.target.value)} placeholder="Media/Video ID..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
                <Button onClick={fetchComments} disabled={apiLoading} className="bg-white/10 text-white hover:bg-white/20"><MessageSquare className="h-4 w-4 mr-1" /> Load</Button>
                <Button onClick={bulkGenerateReplies} disabled={apiLoading || commentsList.length === 0} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"><Sparkles className="h-4 w-4 mr-1" /> AI Reply All</Button>
              </div>

              {commentsList.length > 0 && <p className="text-xs text-white/40">{commentsList.length} comments loaded</p>}

              {bulkAiReplies.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-white/70">{bulkAiReplies.length} AI Replies Ready</h4>
                    <Button size="sm" onClick={sendAllBulkReplies} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"><Send className="h-3.5 w-3.5 mr-1" /> Send All ({bulkAiReplies.length})</Button>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    {bulkAiReplies.map((reply, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10 mb-2">
                        <p className="text-xs text-white/50 mb-1">@{reply.username}: "{reply.comment_text}"</p>
                        <p className="text-sm text-white">↳ {reply.generated_reply}</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => sendBulkReply(reply)} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 h-7"><Send className="h-3 w-3 mr-1" /> Send</Button>
                          <Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={() => setBulkAiReplies(prev => prev.filter(r => r.comment_id !== reply.comment_id))}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Caption Generator */}
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Wand2 className="h-5 w-5 text-yellow-400" /> AI Caption Generator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <select value={aiCaptionPlatform} onChange={e => setAiCaptionPlatform(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option className="bg-gray-900" value="instagram">Instagram</option>
                  <option className="bg-gray-900" value="tiktok">TikTok</option>
                </select>
                <select value={aiCaptionStyle} onChange={e => setAiCaptionStyle(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option className="bg-gray-900" value="trendy and engaging">🔥 Trendy</option>
                  <option className="bg-gray-900" value="sexy and mysterious">💋 Sexy</option>
                  <option className="bg-gray-900" value="funny and relatable">😂 Funny</option>
                  <option className="bg-gray-900" value="motivational and inspiring">💪 Motivational</option>
                  <option className="bg-gray-900" value="aesthetic and poetic">✨ Aesthetic</option>
                </select>
                <div className="flex items-center gap-2">
                  <Switch checked={aiCaptionCta} onCheckedChange={setAiCaptionCta} />
                  <span className="text-xs text-white/50">Include CTA</span>
                </div>
              </div>
              <Textarea value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Describe your post (e.g., 'beach sunset selfie', 'workout motivation reel', 'new lingerie set')..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Button onClick={generateAiCaption} disabled={apiLoading || !aiCaptionTopic} className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white w-full"><Wand2 className="h-4 w-4 mr-2" /> Generate Caption</Button>
              {aiCaptionResult && (
                <div className="bg-white/5 rounded-lg p-4 border border-yellow-500/20">
                  <p className="text-white whitespace-pre-wrap">{aiCaptionResult}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied!"); }} className="bg-white/10 text-white"><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                    <Button size="sm" onClick={() => { setNewPost(p => ({ ...p, caption: aiCaptionResult })); setActiveSubTab("content"); toast.success("Pasted to Content Studio!"); }} className="bg-yellow-500/20 text-yellow-300"><ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Use in Post</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Content Analyzer */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
            <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-blue-400" /> AI Content Analyzer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/40">Paste any caption and get AI-powered optimization suggestions, hashtag recommendations, and engagement predictions.</p>
              <Textarea value={aiAnalyzeCaption} onChange={e => setAiAnalyzeCaption(e.target.value)} placeholder="Paste your caption here for AI analysis..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]" />
              <Button onClick={analyzeContent} disabled={apiLoading || !aiAnalyzeCaption} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-full"><Activity className="h-4 w-4 mr-2" /> Analyze & Optimize</Button>
              {aiAnalyzeResult && (
                <div className="bg-white/5 rounded-lg p-4 border border-blue-500/20">
                  <p className="text-white whitespace-pre-wrap text-sm">{aiAnalyzeResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
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
              <Textarea value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Write your caption..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={newPost.media_url} onChange={e => setNewPost(p => ({ ...p, media_url: e.target.value }))} placeholder="Media URL" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                <Input type="datetime-local" value={newPost.scheduled_at} onChange={e => setNewPost(p => ({ ...p, scheduled_at: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
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
                <Button onClick={() => { setAiCaptionTopic(newPost.caption || ""); setActiveSubTab("ai-automation"); }} variant="outline" className="border-purple-500/30 text-purple-300"><Brain className="h-4 w-4 mr-1" /> AI Optimize</Button>
              </div>
            </CardContent>
          </Card>
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
                        <Badge className={`text-xs ${post.status === "published" ? "bg-green-500/20 text-green-400" : post.status === "scheduled" ? "bg-blue-500/20 text-blue-400" : post.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/50"}`}>{post.status}</Badge>
                        {post.auto_reply_enabled && <Badge className="bg-purple-500/20 text-purple-400 text-xs"><Bot className="h-3 w-3 mr-1" />Auto</Badge>}
                      </div>
                      <p className="text-sm text-white/80 line-clamp-2">{post.caption || "No caption"}</p>
                      {post.redirect_url && <p className="text-xs text-blue-400 mt-1 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> {post.redirect_url}</p>}
                    </div>
                    <div className="flex gap-1">
                      {post.status !== "published" && <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10" onClick={() => publishPost(post)}><Send className="h-4 w-4" /></Button>}
                      <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={() => deletePost(post.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && <p className="text-center text-white/40 py-8">No posts yet</p>}
          </div>
        </TabsContent>

        {/* ===== MEDIA LIBRARY ===== */}
        <TabsContent value="media" className="space-y-4">
          <Button size="sm" onClick={fetchMedia} className="bg-white/10 text-white hover:bg-white/20"><Download className="h-3.5 w-3.5 mr-1.5" /> Pull All Media</Button>
          {igMedia.length > 0 && (
            <div>
              <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-400" /> Instagram ({igMedia.length})</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {igMedia.map(m => (
                  <div key={m.id} className="bg-white/5 rounded-lg p-2 border border-white/10 group relative">
                    {m.thumbnail_url || m.media_url ? <img src={m.thumbnail_url || m.media_url} className="w-full h-20 object-cover rounded-md mb-1" /> : <div className="w-full h-20 bg-white/5 rounded-md mb-1 flex items-center justify-center"><Image className="h-5 w-5 text-white/20" /></div>}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-white/40"><Heart className="h-3 w-3" />{m.like_count}</div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-400" onClick={() => getMediaInsights(m.id, m.media_type)}><BarChart3 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => deleteMedia(m.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
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
                  <div key={v.id} className="bg-white/5 rounded-lg p-2 border border-white/10">
                    {v.cover_image_url ? <img src={v.cover_image_url} className="w-full h-20 object-cover rounded-md mb-1" /> : <div className="w-full h-20 bg-white/5 rounded-md mb-1 flex items-center justify-center"><Video className="h-5 w-5 text-white/20" /></div>}
                    <div className="flex items-center gap-1 text-xs text-white/40"><Eye className="h-3 w-3" />{(v.view_count || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mediaInsights && (
            <Card className="bg-white/5 border-white/10"><CardHeader><CardTitle className="text-white text-sm">Media Insights</CardTitle></CardHeader><CardContent><pre className="text-xs text-white/60 overflow-auto max-h-[200px]">{JSON.stringify(mediaInsights, null, 2)}</pre></CardContent></Card>
          )}
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
              <ScrollArea className="max-h-[400px]">
                {commentsList.map((c: any) => (
                  <div key={c.id} className="bg-white/5 rounded-lg p-3 border border-white/10 mb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{c.username || "User"}</span>
                          {c.like_count > 0 && <span className="text-xs text-white/40 flex items-center gap-1"><Heart className="h-3 w-3" />{c.like_count}</span>}
                        </div>
                        <p className="text-sm text-white/70">{c.text}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-purple-400 hover:bg-purple-500/10 h-7 w-7 p-0" onClick={() => generateAiCommentReply(c)} title="AI Reply"><Brain className="h-3 w-3" /></Button>
                        {commentsPlatform === "instagram" && <>
                          <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-500/10 h-7 w-7 p-0" onClick={() => hideComment(c.id)}><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0" onClick={() => deleteComment(c.id)}><Trash2 className="h-3 w-3" /></Button>
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
              </ScrollArea>
            </CardContent>
          </Card>
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

        {/* ===== DMs ===== */}
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
              <div className="flex gap-2">
                <Button onClick={sendDM} disabled={apiLoading || !dmMessage} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white"><Send className="h-4 w-4 mr-2" /> Send Message</Button>
                <Button onClick={aiReplyAndSendDm} disabled={apiLoading || !dmMessage} variant="outline" className="border-purple-500/30 text-purple-300"><Brain className="h-4 w-4 mr-1" /> AI Generate Reply</Button>
              </div>

              {/* TikTok Conversations */}
              {ttConnected && dmPlatform === "tiktok" && (
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-white/70">TikTok Conversations</h4>
                    <Button size="sm" onClick={fetchTtConversations} className="bg-cyan-500/20 text-cyan-300"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Load</Button>
                  </div>
                  {ttConversations.map((conv: any) => (
                    <div key={conv.conversation_id || conv.id} className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { setDmRecipientId(conv.conversation_id || conv.id); fetchTtMessages(conv.conversation_id || conv.id); }}>
                      <p className="text-sm text-white">{conv.participant?.display_name || "Conversation"}</p>
                      <p className="text-xs text-white/40">{conv.last_message?.text || "..."}</p>
                    </div>
                  ))}
                  {ttMessages.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                      {ttMessages.map((msg: any, i: number) => (
                        <div key={i} className={`text-sm p-2 rounded ${msg.sender === "self" ? "bg-cyan-500/10 text-cyan-300 ml-8" : "bg-white/5 text-white/70 mr-8"}`}>
                          {msg.content?.text || msg.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANALYTICS ===== */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex gap-2 mb-2">
            {igConnected && <Button size="sm" onClick={() => fetchAnalytics("instagram")} className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"><Instagram className="h-3.5 w-3.5 mr-1.5" /> Pull IG</Button>}
            {ttConnected && <Button size="sm" onClick={() => fetchAnalytics("tiktok")} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"><Music2 className="h-3.5 w-3.5 mr-1.5" /> Pull TT</Button>}
            {igConnected && <Button size="sm" onClick={fetchDemographics} className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"><PieChart className="h-3.5 w-3.5 mr-1.5" /> Demographics</Button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analytics.slice(0, 12).map(stat => (
              <Card key={stat.id} className="bg-white/5 border-white/10"><CardContent className="p-4 text-center">
                <p className="text-xs text-white/50 capitalize">{stat.metric_type.replace(/_/g, " ")}</p>
                <p className="text-2xl font-bold text-white">{Number(stat.metric_value).toLocaleString()}</p>
                <Badge className={`text-xs mt-1 ${stat.platform === "instagram" ? "bg-pink-500/20 text-pink-400" : "bg-cyan-500/20 text-cyan-400"}`}>{stat.platform}</Badge>
              </CardContent></Card>
            ))}
          </div>
          {demographics?.data && (
            <Card className="bg-white/5 border-white/10"><CardHeader><CardTitle className="text-white text-lg">Audience Demographics</CardTitle></CardHeader><CardContent className="space-y-3">
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
            </CardContent></Card>
          )}
          {analytics.length === 0 && <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-3" /><p className="text-white/50">Connect and pull analytics</p></CardContent></Card>}
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
              <Button onClick={createBioLink} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"><Link2 className="h-4 w-4 mr-2" /> Create Bio Link</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {bioLinks.map(link => (
              <Card key={link.id} className="bg-white/5 border-white/10"><CardContent className="p-4 flex items-center justify-between">
                <div><h3 className="text-white font-medium">{link.title}</h3><p className="text-sm text-white/50">/link/{link.slug}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/link/${link.slug}`); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => window.open(`/link/${link.slug}`, "_blank")}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteBioLink(link.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent></Card>
            ))}
            {bioLinks.length === 0 && <p className="text-center text-white/40 py-8">No bio links yet</p>}
          </div>
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
              <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder="Platform User ID" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token (optional)" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Button onClick={connectPlatform} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white"><CheckCircle2 className="h-4 w-4 mr-2" /> Connect Account</Button>

              {connections.filter(c => c.is_connected).length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <h4 className="text-sm text-white/70">Active Connections</h4>
                  {connections.filter(c => c.is_connected).map(conn => (
                    <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        {conn.platform === "instagram" ? <Instagram className="h-4 w-4 text-pink-400" /> : <Music2 className="h-4 w-4 text-cyan-400" />}
                        <span className="text-sm text-white">{conn.platform_username}</span>
                        {conn.token_expires_at && <span className="text-xs text-white/30">Exp: {new Date(conn.token_expires_at).toLocaleDateString()}</span>}
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
                  <li>Create Business App → Add Instagram Graph API</li>
                  <li>Get Instagram Business Account ID</li>
                  <li>Generate long-lived access token (60 days)</li>
                  <li>Scopes: instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_insights, pages_show_list</li>
                </ol>
                <p className="mt-3"><strong className="text-cyan-400">TikTok API v2:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to <a href="https://developers.tiktok.com" target="_blank" className="text-blue-400 underline">developers.tiktok.com</a></li>
                  <li>Create app → Request scopes: user.info.basic, video.list, video.publish</li>
                  <li>Complete OAuth flow for access + refresh tokens</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMediaHub;

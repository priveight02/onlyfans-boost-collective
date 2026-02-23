import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Music2, Video, Upload, Eye, MessageSquare, Search, Hash,
  ListVideo, Send, RefreshCw, TrendingUp, BarChart3, Users,
  Shield, Play, Pause, Image, Layers, Clock, Heart, Share2,
  ExternalLink, Loader2, Brain, Activity, Star, Globe, Zap,
  MessageCircle, LayoutDashboard, Wand2, Megaphone, Copy,
  Target, Radio, Calendar, Download, Link2, FolderOpen,
  CheckCircle2, AlertCircle, Bot, Sparkles, ArrowRight,
} from "lucide-react";
// TikTok-native DM conversations — no Instagram dependency

interface Props {
  selectedAccount: string;
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/>
  </svg>
);

const TKAutomationSuite = ({ selectedAccount }: Props) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null); // null = loading

  // TikTok-native live DM conversations state
  const [tkConversations, setTkConversations] = useState<any[]>([]);
  const [tkMessages, setTkMessages] = useState<any[]>([]);
  const [tkSelectedConvo, setTkSelectedConvo] = useState<string | null>(null);
  const [tkDmInput, setTkDmInput] = useState("");
  const [tkScanning, setTkScanning] = useState(false);
  const [tkSearchQuery, setTkSearchQuery] = useState("");

  // Check TikTok connection
  useEffect(() => {
    if (!selectedAccount) { setTiktokConnected(false); return; }
    const check = async () => {
      const { data } = await supabase.from("social_connections")
        .select("id")
        .eq("account_id", selectedAccount)
        .eq("platform", "tiktok")
        .eq("is_connected", true)
        .maybeSingle();
      setTiktokConnected(!!data);
    };
    check();
  }, [selectedAccount]);

  // Dashboard
  const [profile, setProfile] = useState<any>(null);

  // Videos
  const [videos, setVideos] = useState<any[]>([]);
  const [videosCursor, setVideosCursor] = useState<string | null>(null);
  const [videosHasMore, setVideosHasMore] = useState(false);

  // Publish video
  const [publishVideoUrl, setPublishVideoUrl] = useState("");
  const [publishVideoTitle, setPublishVideoTitle] = useState("");
  const [publishPrivacy, setPublishPrivacy] = useState("PUBLIC_TO_EVERYONE");
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [publishId, setPublishId] = useState("");
  const [publishStatus, setPublishStatus] = useState<any>(null);

  // Publish photo
  const [photoUrls, setPhotoUrls] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoPrivacy, setPhotoPrivacy] = useState("PUBLIC_TO_EVERYONE");
  const [mediaType, setMediaType] = useState<"PHOTO" | "CAROUSEL">("PHOTO");

  // Playlists
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Comments
  const [commentsVideoId, setCommentsVideoId] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // DMs
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [dmText, setDmText] = useState("");

  // Research
  const [researchUsername, setResearchUsername] = useState("");
  const [researchUserResult, setResearchUserResult] = useState<any>(null);
  const [researchKeywords, setResearchKeywords] = useState("");
  const [researchVideoResults, setResearchVideoResults] = useState<any[]>([]);
  const [researchHashtags, setResearchHashtags] = useState("");
  const [researchHashtagResults, setResearchHashtagResults] = useState<any[]>([]);
  const [researchCommentVideoId, setResearchCommentVideoId] = useState("");
  const [researchComments, setResearchComments] = useState<any[]>([]);

  // Creator info
  const [creatorInfo, setCreatorInfo] = useState<any>(null);

  // Auto-DM AI Responder
  const [autoRespondActive, setAutoRespondActive] = useState(false);
  const [autoRespondLoading, setAutoRespondLoading] = useState(false);
  const [aiDmRedirectUrl, setAiDmRedirectUrl] = useState("");
  const [aiDmKeywords, setAiDmKeywords] = useState("");
  const [aiTestMessage, setAiTestMessage] = useState("");
  const [aiTestReply, setAiTestReply] = useState("");
  const [aiTestSender, setAiTestSender] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [aiTypingDelay, setAiTypingDelay] = useState(0);
  const [aiLifePause, setAiLifePause] = useState(false);

  // AI Tools
  const [aiCaptionTopic, setAiCaptionTopic] = useState("");
  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiAnalyzeCaption, setAiAnalyzeCaption] = useState("");
  const [aiAnalyzeResult, setAiAnalyzeResult] = useState("");

  // Scheduled posts
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostMediaUrl, setNewPostMediaUrl] = useState("");
  const [newPostScheduledAt, setNewPostScheduledAt] = useState("");
  const [newPostType, setNewPostType] = useState("video");

  // Load auto-respond state
  useEffect(() => {
    if (!selectedAccount) return;
    const loadState = async () => {
      const { data } = await supabase.from("auto_respond_state").select("*").eq("account_id", selectedAccount).maybeSingle();
      if (data) {
        setAutoRespondActive(data.is_active);
        setAiDmRedirectUrl(data.redirect_url || "");
        setAiDmKeywords(data.trigger_keywords || "");
      }
    };
    loadState();
    // Realtime
    const channel = supabase
      .channel(`tt-auto-respond-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_respond_state", filter: `account_id=eq.${selectedAccount}` }, (payload: any) => {
        if (payload.new) {
          setAutoRespondActive(payload.new.is_active);
          setAiDmRedirectUrl(payload.new.redirect_url || "");
          setAiDmKeywords(payload.new.trigger_keywords || "");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  // Load scheduled posts
  useEffect(() => {
    if (!selectedAccount) return;
    supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "tiktok").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setScheduledPosts(data); });
  }, [selectedAccount]);

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-api", {
        body: { action, account_id: selectedAccount, params },
      });
      // Handle edge function errors (including 400s) as in-app notifications
      if (error) {
        // Try to parse the error body for a user-friendly message
        const msg = typeof error === "object" && error.message ? error.message : String(error);
        toast.info(msg || "TikTok action could not be completed", { description: "Connect your TikTok account to use this feature." });
        return null;
      }
      if (!data?.success) {
        toast.info(data?.error || "TikTok action could not be completed", { description: "Please check your TikTok connection." });
        return null;
      }
      return data.data;
    } catch (e: any) {
      // Catch network or unexpected errors as info toasts, not error logs
      toast.info(e.message || "TikTok API unavailable", { description: "Please try again or reconnect your account." });
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  // === API HANDLERS ===
  const fetchProfile = async () => {
    const d = await callApi("get_user_info");
    if (d?.data?.user) { setProfile(d.data.user); toast.success("TikTok profile synced"); }
    else if (d?.user) { setProfile(d.user); toast.success("TikTok profile synced"); }
  };

  const fetchVideos = async (cursor?: string) => {
    const d = await callApi("get_videos", { limit: 20, cursor });
    if (d?.data) {
      const vids = d.data.videos || [];
      setVideos(prev => cursor ? [...prev, ...vids] : vids);
      setVideosCursor(d.data.cursor || null);
      setVideosHasMore(d.data.has_more || false);
    }
  };

  const publishVideoByUrl = async () => {
    if (!publishVideoUrl) { toast.error("Enter a video URL"); return; }
    const d = await callApi("publish_video_by_url", {
      video_url: publishVideoUrl, title: publishVideoTitle, privacy_level: publishPrivacy,
      disable_duet: disableDuet, disable_comment: disableComment, disable_stitch: disableStitch,
    });
    if (d?.data?.publish_id) {
      setPublishId(d.data.publish_id);
      toast.success(`Video publishing initiated! ID: ${d.data.publish_id}`);
      setPublishVideoUrl(""); setPublishVideoTitle("");
    }
  };

  const checkPublishStatus = async () => {
    if (!publishId) { toast.error("Enter a publish ID"); return; }
    const d = await callApi("check_publish_status", { publish_id: publishId });
    if (d) { setPublishStatus(d); toast.success("Status fetched"); }
  };

  const publishPhoto = async () => {
    const urls = photoUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) { toast.error("Enter at least one image URL"); return; }
    const action = mediaType === "CAROUSEL" ? "publish_carousel" : "publish_photo";
    const d = await callApi(action, {
      image_urls: urls, title: photoTitle, description: photoDesc,
      privacy_level: photoPrivacy, disable_comment: disableComment,
    });
    if (d) { toast.success(`${mediaType === "CAROUSEL" ? "Carousel" : "Photo"} published!`); setPhotoUrls(""); setPhotoTitle(""); setPhotoDesc(""); }
  };

  const fetchPlaylists = async () => {
    const d = await callApi("get_playlists", { limit: 20 });
    if (d?.data?.playlists) setPlaylists(d.data.playlists);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName) { toast.error("Enter playlist name"); return; }
    const d = await callApi("create_playlist", { name: newPlaylistName });
    if (d) { toast.success("Playlist created"); setNewPlaylistName(""); fetchPlaylists(); }
  };

  const fetchComments = async () => {
    if (!commentsVideoId) { toast.error("Enter a video ID"); return; }
    const d = await callApi("get_comments", { video_id: commentsVideoId, limit: 50 });
    if (d?.data?.comments) setComments(d.data.comments);
  };

  const replyToComment = async (commentId: string) => {
    if (!replyText) return;
    await callApi("reply_to_comment", { video_id: commentsVideoId, comment_id: commentId, message: replyText });
    toast.success("Reply sent"); setReplyText(""); setReplyingTo(null); fetchComments();
  };

  const fetchConversations = async () => {
    const d = await callApi("get_conversations");
    if (d?.data?.conversations) setConversations(d.data.conversations);
  };

  const fetchMessages = async (convoId: string) => {
    setSelectedConvo(convoId);
    const d = await callApi("get_messages", { conversation_id: convoId, limit: 20 });
    if (d?.data?.messages) setMessages(d.data.messages);
  };

  const sendDm = async () => {
    if (!selectedConvo || !dmText) return;
    await callApi("send_dm", { conversation_id: selectedConvo, message: dmText });
    toast.success("DM sent"); setDmText(""); fetchMessages(selectedConvo);
  };

  const researchUser = async () => {
    if (!researchUsername) return;
    const d = await callApi("research_user", { username: researchUsername });
    if (d?.data) setResearchUserResult(d.data);
  };

  const researchVideoSearch = async () => {
    if (!researchKeywords) return;
    const keywords = researchKeywords.split(",").map(k => k.trim()).filter(Boolean);
    const d = await callApi("research_videos", { keywords, limit: 20 });
    if (d?.data?.videos) setResearchVideoResults(d.data.videos);
  };

  const researchHashtagSearch = async () => {
    if (!researchHashtags) return;
    const hashtags = researchHashtags.split(",").map(h => h.trim()).filter(Boolean);
    const d = await callApi("research_hashtag", { hashtags });
    if (d?.data?.hashtags) setResearchHashtagResults(d.data.hashtags);
  };

  const researchCommentsFetch = async () => {
    if (!researchCommentVideoId) return;
    const d = await callApi("research_comments", { video_id: researchCommentVideoId, limit: 100 });
    if (d?.data?.comments) setResearchComments(d.data.comments);
  };

  const fetchCreatorInfo = async () => {
    const d = await callApi("get_creator_info");
    if (d?.data) setCreatorInfo(d.data);
  };

  const refreshToken = async () => {
    const d = await callApi("refresh_token", {});
    if (d?.data?.access_token) toast.success("Token refreshed successfully");
    else toast.error("Token refresh failed — you may need to re-connect");
  };

  // Auto-respond
  const toggleAutoRespond = async () => {
    setAutoRespondLoading(true);
    const newState = !autoRespondActive;
    const { error } = await supabase.from("auto_respond_state").upsert({
      account_id: selectedAccount, is_active: newState,
      redirect_url: aiDmRedirectUrl || null, trigger_keywords: aiDmKeywords || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" });
    if (error) toast.error(error.message);
    else { setAutoRespondActive(newState); toast.success(newState ? "Auto-respond ACTIVE" : "Auto-respond PAUSED"); }
    setAutoRespondLoading(false);
  };

  const saveAutoRespondConfig = async () => {
    const { error } = await supabase.from("auto_respond_state").upsert({
      account_id: selectedAccount, is_active: autoRespondActive,
      redirect_url: aiDmRedirectUrl || null, trigger_keywords: aiDmKeywords || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" });
    if (error) toast.error(error.message); else toast.success("Config saved");
  };

  const generateAiDmReply = async () => {
    if (!aiTestMessage) return;
    setAiTestReply("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_dm_reply", account_id: selectedAccount, params: { message_text: aiTestMessage, sender_name: aiTestSender || "fan", auto_redirect_url: aiDmRedirectUrl, keywords_trigger: aiDmKeywords, platform: "tiktok" } },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const typingDelay = data.data.typing_delay_ms || 2000;
        const lifePauseMs = data.data.life_pause_ms || 0;
        if (lifePauseMs > 0) {
          setAiLifePause(true); setAiTypingDelay(Math.round(lifePauseMs / 1000));
          setTimeout(() => { setAiLifePause(false); setAiTyping(true); setTimeout(() => { setAiTyping(false); setAiTestReply(data.data.reply || data.data.message); }, typingDelay); }, lifePauseMs);
        } else {
          setAiTyping(true); setTimeout(() => { setAiTyping(false); setAiTestReply(data.data.reply || data.data.message); }, typingDelay);
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  // AI Tools
  const generateCaption = async () => {
    if (!aiCaptionTopic) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: aiCaptionTopic, platform: "tiktok", include_cta: true } },
      });
      if (error) throw error;
      if (data?.success && data.data) setAiCaptionResult(data.data.caption);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const analyzeContent = async () => {
    if (!aiAnalyzeCaption) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "analyze_content", account_id: selectedAccount, params: { caption: aiAnalyzeCaption, platform: "tiktok", content_type: "video" } },
      });
      if (error) throw error;
      if (data?.success && data.data) setAiAnalyzeResult(data.data.analysis);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  // Scheduled posts
  const schedulePost = async () => {
    if (!newPostCaption && !newPostMediaUrl) { toast.error("Add caption or media"); return; }
    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount, platform: "tiktok", post_type: newPostType,
      caption: newPostCaption, media_urls: newPostMediaUrl ? [newPostMediaUrl] : [],
      scheduled_at: newPostScheduledAt || null, status: newPostScheduledAt ? "scheduled" : "draft",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Post created!");
      setNewPostCaption(""); setNewPostMediaUrl(""); setNewPostScheduledAt("");
      const { data } = await supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "tiktok").order("created_at", { ascending: false }).limit(50);
      if (data) setScheduledPosts(data);
    }
  };

  const publishPost = async (post: any) => {
    toast.info("Publishing...");
    const result = await callApi("publish_video_by_url", { video_url: post.media_urls?.[0], title: post.caption, privacy_level: "PUBLIC_TO_EVERYONE", post_id: post.id });
    if (result) { toast.success("Published!"); const { data } = await supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "tiktok").order("created_at", { ascending: false }).limit(50); if (data) setScheduledPosts(data); }
  };

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted");
    setScheduledPosts(prev => prev.filter(p => p.id !== id));
  };

  // TikTok-native DM functions
  const loadTkConversations = useCallback(async () => {
    if (!selectedAccount) return;
    setTkScanning(true);
    // First try to sync from TikTok API
    await callApi("get_conversations", { limit: 50 });
    // Then load from local DB
    const { data } = await supabase.from("ai_dm_conversations")
      .select("*")
      .eq("account_id", selectedAccount)
      .eq("platform", "tiktok")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (data) setTkConversations(data);
    setTkScanning(false);
  }, [selectedAccount, callApi]);

  const loadTkMessages = useCallback(async (convoId: string) => {
    setTkSelectedConvo(convoId);
    const { data } = await supabase.from("ai_dm_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .eq("account_id", selectedAccount)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setTkMessages(data);
    // Also try to fetch from TikTok API for latest
    const convo = tkConversations.find(c => c.id === convoId);
    if (convo?.platform_conversation_id) {
      await callApi("get_messages", { conversation_id: convo.platform_conversation_id, limit: 50 });
      // Reload from DB
      const { data: fresh } = await supabase.from("ai_dm_messages")
        .select("*")
        .eq("conversation_id", convoId)
        .eq("account_id", selectedAccount)
        .order("created_at", { ascending: true })
        .limit(100);
      if (fresh) setTkMessages(fresh);
    }
  }, [selectedAccount, callApi, tkConversations]);

  const sendTkDm = useCallback(async () => {
    if (!tkDmInput.trim() || !tkSelectedConvo) return;
    const convo = tkConversations.find(c => c.id === tkSelectedConvo);
    if (!convo) return;
    // Send via TikTok API
    await callApi("send_message", { conversation_id: convo.platform_conversation_id, text: tkDmInput });
    // Also store locally
    await supabase.from("ai_dm_messages").insert({
      conversation_id: tkSelectedConvo,
      account_id: selectedAccount,
      sender_type: "agent",
      sender_name: "You",
      content: tkDmInput,
      status: "sent",
    });
    setTkDmInput("");
    loadTkMessages(tkSelectedConvo);
  }, [tkDmInput, tkSelectedConvo, selectedAccount, callApi, loadTkMessages, tkConversations]);

  // Load TikTok conversations on mount + realtime
  useEffect(() => {
    if (!selectedAccount || !tiktokConnected) return;
    loadTkConversations();
    const channel = supabase
      .channel(`tk-dm-convos-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_dm_conversations", filter: `account_id=eq.${selectedAccount}` }, () => {
        loadTkConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount, tiktokConnected, loadTkConversations]);

  // Realtime messages for selected convo
  useEffect(() => {
    if (!tkSelectedConvo || !selectedAccount) return;
    const channel = supabase
      .channel(`tk-dm-msgs-${tkSelectedConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_dm_messages", filter: `conversation_id=eq.${tkSelectedConvo}` }, () => {
        loadTkMessages(tkSelectedConvo);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tkSelectedConvo, selectedAccount, loadTkMessages]);

  const filteredTkConversations = tkConversations.filter(c => {
    if (!tkSearchQuery) return true;
    const q = tkSearchQuery.toLowerCase();
    return (c.participant_name || "").toLowerCase().includes(q) || (c.participant_username || "").toLowerCase().includes(q);
  });

  // "Connect TikTok" CTA component
  const ConnectTikTokCTA = () => (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
        <div className="absolute inset-[-8px] rounded-full bg-cyan-500/10 animate-pulse" />
        <div className="relative h-20 w-20 rounded-full bg-muted/50 border-2 border-cyan-500/40 flex items-center justify-center">
          <TikTokIcon className="h-10 w-10 text-cyan-400" />
        </div>
      </div>
      <div className="text-center mt-2">
        <h3 className="text-base font-bold text-foreground">Connect TikTok Account</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Connect your TikTok account to unlock DMs, auto-posting, analytics, and AI-powered automation.
        </p>
      </div>
      <Button
        size="lg"
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white gap-2 mt-2"
        onClick={() => {
          // Navigate to connect tab
          const event = new CustomEvent("switch-platform-tab", { detail: "connect" });
          window.dispatchEvent(event);
          toast.info("Navigate to the Connect tab to link your TikTok account");
        }}
      >
        <TikTokIcon className="h-5 w-5" />
        Connect TikTok
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // Show connect CTA if not connected
  if (tiktokConnected === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tiktokConnected && !selectedAccount) {
    return <ConnectTikTokCTA />;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex flex-wrap w-full">
        {[
          { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
          { v: "auto-dm", icon: Brain, l: "Auto-DM" },
          { v: "content", icon: Layers, l: "Content" },
          { v: "comments", icon: MessageSquare, l: "Comments" },
          { v: "dms", icon: Send, l: "DMs" },
          { v: "search", icon: Search, l: "Search" },
          { v: "ai-tools", icon: Wand2, l: "AI Tools" },
          { v: "analytics", icon: BarChart3, l: "Analytics" },
          { v: "automation", icon: Zap, l: "Automation" },
        ].map(t => (
          <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
            <t.icon className="h-3.5 w-3.5" />{t.l}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ===== DASHBOARD ===== */}
      <TabsContent value="dashboard" className="space-y-4 mt-4">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={fetchProfile} disabled={loading || !selectedAccount} className="text-foreground">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Sync TikTok Profile
          </Button>
          <Button size="sm" variant="outline" onClick={() => fetchVideos()} disabled={loading || !selectedAccount} className="text-foreground">
            <Download className="h-3.5 w-3.5 mr-1" />Pull Videos
          </Button>
        </div>

        {!tiktokConnected && <ConnectTikTokCTA />}
        {!selectedAccount && tiktokConnected && <p className="text-xs text-destructive">No account selected — connect TikTok first via the Connect tab.</p>}

        {profile && (
          <Card className="border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {(profile.avatar_url || profile.avatar_url_100) && <img src={profile.avatar_url || profile.avatar_url_100} className="h-12 w-12 rounded-full object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                    {profile.display_name}
                    {profile.is_verified && <Badge className="bg-cyan-500/20 text-cyan-400 text-[9px]">Verified</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                  {profile.bio_description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{profile.bio_description}</p>}
                </div>
                <TikTokIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.follower_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>
                <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.following_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Following</p></div>
                <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.likes_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.video_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Videos</p></div>
              </div>
              {profile.profile_deep_link && (
                <a href={profile.profile_deep_link} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />Open TikTok Profile
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{videos.length}</p><p className="text-[10px] text-muted-foreground">Videos Loaded</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "scheduled").length}</p><p className="text-[10px] text-muted-foreground">Scheduled</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "published").length}</p><p className="text-[10px] text-muted-foreground">Published</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{playlists.length}</p><p className="text-[10px] text-muted-foreground">Playlists</p></CardContent></Card>
        </div>

        {/* Recent Videos */}
        {videos.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Video className="h-4 w-4 text-cyan-400" />Recent Videos</h4>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {videos.slice(0, 5).map((v: any) => (
                    <div key={v.id} className="bg-muted/30 rounded-lg p-3 flex gap-3">
                      {v.cover_image_url && <img src={v.cover_image_url} className="h-16 w-12 rounded object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{v.title || v.video_description || "Untitled"}</p>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{(v.view_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{(v.like_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{(v.comment_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" />{(v.share_count || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ===== AUTO-DM ===== */}
      <TabsContent value="auto-dm" className="space-y-4 mt-4">
        <Card className={`border-2 transition-colors ${autoRespondActive ? "border-red-500/50 bg-red-500/5" : "border-border"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Brain className="h-5 w-5 text-cyan-400" />AI Auto-DM Responder
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {autoRespondActive ? "AI is actively responding to incoming TikTok DMs" : "Click Play to start auto-responding to all incoming DMs"}
                </p>
              </div>
              <Button size="lg" onClick={toggleAutoRespond} disabled={autoRespondLoading}
                className={`h-14 w-14 rounded-full p-0 ${autoRespondActive ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}>
                {autoRespondActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </Button>
            </div>

            {autoRespondActive && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-400">LIVE — AI is responding to TikTok DMs in real-time</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">OF Redirect URL</label>
                <Input value={aiDmRedirectUrl} onChange={e => setAiDmRedirectUrl(e.target.value)} placeholder="https://onlyfans.com/..." className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Trigger Keywords (comma separated)</label>
                <Input value={aiDmKeywords} onChange={e => setAiDmKeywords(e.target.value)} placeholder="content, exclusive, private, subscribe..." className="text-sm" />
              </div>
              <Button size="sm" variant="outline" className="text-foreground" onClick={saveAutoRespondConfig}>Save Config</Button>
            </div>
          </CardContent>
        </Card>

        {/* Test AI */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" />Test AI Responder</h4>
            <div className="grid grid-cols-3 gap-2">
              <Input value={aiTestSender} onChange={e => setAiTestSender(e.target.value)} placeholder="Sender name" className="text-sm" />
              <Input value={aiTestMessage} onChange={e => setAiTestMessage(e.target.value)} placeholder="Type a test DM..." className="text-sm col-span-2" onKeyDown={e => e.key === "Enter" && generateAiDmReply()} />
            </div>
            <Button onClick={generateAiDmReply} disabled={loading || aiTyping || aiLifePause || !aiTestMessage} size="sm"><Brain className="h-3.5 w-3.5 mr-1.5" />Generate Reply</Button>
            {aiLifePause && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground italic">away for {aiTypingDelay}s... (simulating natural pause)</p>
              </div>
            )}
            {aiTyping && !aiLifePause && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-sm text-muted-foreground italic">typing...</p>
              </div>
            )}
            {aiTestReply && !aiTyping && !aiLifePause && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">AI Reply:</p>
                <p className="text-sm text-foreground">{aiTestReply}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(aiTestReply); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  <Button size="sm" variant="outline" onClick={() => { setDmText(aiTestReply); setActiveTab("dms"); toast.success("Pasted to DM"); }}><Send className="h-3 w-3 mr-1" />Send as DM</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TikTok-Native Live Conversations */}
        {!tiktokConnected ? <ConnectTikTokCTA /> : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-cyan-400" />Live TikTok Conversations
              </h4>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={loadTkConversations} disabled={tkScanning} className="h-7 w-7 p-0">
                  <Download className={`h-3.5 w-3.5 ${tkScanning ? "animate-bounce" : ""}`} />
                </Button>
                {autoRespondActive && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] text-red-400 font-medium">AI LIVE</span>
                  </div>
                )}
              </div>
            </div>

            <Input
              value={tkSearchQuery}
              onChange={e => setTkSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="text-xs h-8 mb-3"
            />

            {tkScanning && tkConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
                <p className="text-xs font-medium">Syncing TikTok inbox...</p>
                <p className="text-[10px] mt-1 opacity-60">Fetching all conversations & messages</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2" style={{ minHeight: 400 }}>
                {/* Conversation List */}
                <div className="col-span-1 space-y-1 overflow-y-auto max-h-[500px] pr-1">
                  {tkScanning && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />Syncing {filteredTkConversations.length} conversations</p>}
                  {filteredTkConversations.length > 0 ? filteredTkConversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => loadTkMessages(c.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all ${tkSelectedConvo === c.id ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-muted/30 hover:bg-muted/50 border border-transparent"}`}
                    >
                      <div className="flex items-center gap-2">
                        {c.participant_avatar_url ? (
                          <img src={c.participant_avatar_url} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <TikTokIcon className="h-4 w-4 text-cyan-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate">{c.participant_name || c.participant_username || "TikTok User"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.last_message_preview || "No messages"}</p>
                        </div>
                        {!c.is_read && <div className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                      </div>
                      {c.ai_enabled && (
                        <div className="flex items-center gap-1 mt-1">
                          <Bot className="h-2.5 w-2.5 text-cyan-400" />
                          <span className="text-[9px] text-cyan-400">AI Active</span>
                        </div>
                      )}
                    </button>
                  )) : (
                    <div className="text-center py-8">
                      <TikTokIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-[10px] text-muted-foreground">No TikTok conversations yet</p>
                      <Button size="sm" variant="outline" onClick={loadTkConversations} className="mt-2 text-[10px] h-7">
                        <RefreshCw className="h-3 w-3 mr-1" />Sync Inbox
                      </Button>
                    </div>
                  )}
                </div>

                {/* Message Thread */}
                <div className="col-span-2 flex flex-col">
                  {tkSelectedConvo ? (
                    <>
                      <ScrollArea className="flex-1 max-h-[420px] mb-2">
                        <div className="space-y-1.5 p-1">
                          {tkMessages.map(m => (
                            <div key={m.id} className={`p-2.5 rounded-lg text-xs max-w-[85%] ${m.sender_type === "fan" || m.sender_type === "user" ? "bg-muted/30 mr-auto" : "bg-cyan-500/10 ml-auto"}`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {m.sender_type === "ai" && <Bot className="h-3 w-3 text-cyan-400" />}
                                <span className="text-[10px] text-muted-foreground font-medium">{m.sender_name || m.sender_type}</span>
                                <span className="text-[9px] text-muted-foreground/50">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-foreground">{m.content}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-1.5">
                        <Input
                          value={tkDmInput}
                          onChange={e => setTkDmInput(e.target.value)}
                          placeholder="Type a message..."
                          className="text-xs flex-1"
                          onKeyDown={e => e.key === "Enter" && sendTkDm()}
                        />
                        <Button size="sm" onClick={sendTkDm} disabled={loading || !tkDmInput}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center mb-3">
                        <TikTokIcon className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Your TikTok messages</h3>
                      <p className="text-xs text-muted-foreground mt-1">Select a conversation to start chatting</p>
                      <Button size="sm" variant="outline" onClick={loadTkConversations} disabled={tkScanning} className="mt-3 gap-1.5">
                        <Download className="h-3.5 w-3.5" />{tkScanning ? "Syncing..." : "Sync Inbox"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </TabsContent>

      {/* ===== CONTENT ===== */}
      <TabsContent value="content" className="space-y-4 mt-4">
        {/* Publish Video */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Upload className="h-4 w-4 text-green-400" />Publish Video</h4>
            <Input value={publishVideoTitle} onChange={e => setPublishVideoTitle(e.target.value)} placeholder="Video title / caption" className="text-sm" />
            <Input value={publishVideoUrl} onChange={e => setPublishVideoUrl(e.target.value)} placeholder="Video URL (pull from URL)" className="text-sm" />
            <select value={publishPrivacy} onChange={e => setPublishPrivacy(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="PUBLIC_TO_EVERYONE">Public</option>
              <option value="MUTUAL_FOLLOW_FRIENDS">Friends Only</option>
              <option value="FOLLOWER_OF_CREATOR">Followers Only</option>
              <option value="SELF_ONLY">Private (Self Only)</option>
            </select>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <label className="flex items-center gap-1.5"><Switch checked={disableDuet} onCheckedChange={setDisableDuet} className="scale-75" />Disable Duet</label>
              <label className="flex items-center gap-1.5"><Switch checked={disableComment} onCheckedChange={setDisableComment} className="scale-75" />Disable Comments</label>
              <label className="flex items-center gap-1.5"><Switch checked={disableStitch} onCheckedChange={setDisableStitch} className="scale-75" />Disable Stitch</label>
            </div>
            <Button size="sm" onClick={publishVideoByUrl} disabled={loading || !selectedAccount || !publishVideoUrl}><Upload className="h-3.5 w-3.5 mr-1" />Publish Video</Button>
            <div className="border-t border-border pt-3 space-y-2">
              <h5 className="text-xs font-semibold text-foreground">Check Publish Status</h5>
              <div className="flex gap-2">
                <Input value={publishId} onChange={e => setPublishId(e.target.value)} placeholder="Publish ID" className="text-sm flex-1" />
                <Button size="sm" variant="outline" onClick={checkPublishStatus} disabled={loading || !publishId}>Check</Button>
              </div>
              {publishStatus && <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-auto max-h-32">{JSON.stringify(publishStatus, null, 2)}</pre>}
            </div>
          </CardContent>
        </Card>

        {/* Publish Photo / Carousel */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Image className="h-4 w-4 text-blue-400" />Publish Photo / Carousel</h4>
            <div className="flex gap-2">
              <Button size="sm" variant={mediaType === "PHOTO" ? "default" : "outline"} onClick={() => setMediaType("PHOTO")}><Image className="h-3.5 w-3.5 mr-1" />Single Photo</Button>
              <Button size="sm" variant={mediaType === "CAROUSEL" ? "default" : "outline"} onClick={() => setMediaType("CAROUSEL")}><Layers className="h-3.5 w-3.5 mr-1" />Carousel</Button>
            </div>
            <Input value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} placeholder="Title" className="text-sm" />
            <Input value={photoDesc} onChange={e => setPhotoDesc(e.target.value)} placeholder="Description" className="text-sm" />
            <Textarea value={photoUrls} onChange={e => setPhotoUrls(e.target.value)} placeholder="Image URLs (one per line)" rows={3} className="text-sm" />
            <select value={photoPrivacy} onChange={e => setPhotoPrivacy(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="PUBLIC_TO_EVERYONE">Public</option>
              <option value="MUTUAL_FOLLOW_FRIENDS">Friends Only</option>
              <option value="FOLLOWER_OF_CREATOR">Followers Only</option>
              <option value="SELF_ONLY">Private</option>
            </select>
            <Button size="sm" onClick={publishPhoto} disabled={loading || !selectedAccount || !photoUrls}><Upload className="h-3.5 w-3.5 mr-1" />Publish {mediaType === "CAROUSEL" ? "Carousel" : "Photo"}</Button>
          </CardContent>
        </Card>

        {/* Playlists */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><ListVideo className="h-4 w-4 text-violet-400" />Playlist Manager</h4>
            <div className="flex gap-2">
              <Button size="sm" onClick={fetchPlaylists} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load</Button>
            </div>
            <div className="flex gap-2">
              <Input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name" className="text-sm flex-1" />
              <Button size="sm" onClick={createPlaylist} disabled={loading || !newPlaylistName}>Create</Button>
            </div>
            {playlists.length > 0 && (
              <div className="space-y-1.5">
                {playlists.map((p: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                    <span className="text-xs text-foreground">{p.playlist_name || p.name || `Playlist ${i + 1}`}</span>
                    <Badge variant="outline" className="text-[10px]">{p.video_count || 0} videos</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Manager */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Video className="h-4 w-4 text-teal-400" />Video Manager</h4>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => fetchVideos()} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Videos</Button>
              {videosHasMore && videosCursor && <Button size="sm" variant="outline" onClick={() => fetchVideos(videosCursor)} disabled={loading}>Load More</Button>}
            </div>
            {videos.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {videos.map((v: any) => (
                    <div key={v.id} className="bg-muted/30 rounded-lg p-3 flex gap-3">
                      {v.cover_image_url && <img src={v.cover_image_url} className="h-16 w-12 rounded object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{v.title || v.video_description || "Untitled"}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{v.video_description}</p>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{(v.view_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{(v.like_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{(v.comment_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" />{(v.share_count || 0).toLocaleString()}</span>
                          {v.duration && <span><Clock className="h-3 w-3 inline" /> {v.duration}s</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {v.share_url && <a href={v.share_url} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"><ExternalLink className="h-3 w-3" />View</a>}
                          <button onClick={() => { setCommentsVideoId(v.id); setActiveTab("comments"); }} className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />Comments</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No videos loaded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Posts */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-400" />Schedule Post</h4>
            <Input value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} placeholder="Caption" className="text-sm" />
            <Input value={newPostMediaUrl} onChange={e => setNewPostMediaUrl(e.target.value)} placeholder="Media URL" className="text-sm" />
            <Input type="datetime-local" value={newPostScheduledAt} onChange={e => setNewPostScheduledAt(e.target.value)} className="text-sm" />
            <Button size="sm" onClick={schedulePost} disabled={!newPostCaption && !newPostMediaUrl}><Calendar className="h-3.5 w-3.5 mr-1" />Schedule</Button>
            {scheduledPosts.length > 0 && (
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-1.5">
                  {scheduledPosts.map(p => (
                    <div key={p.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.status} · {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : "No schedule"}</p>
                      </div>
                      <div className="flex gap-1">
                        {p.status !== "published" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => publishPost(p)}><Play className="h-3 w-3" /></Button>}
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => deletePost(p.id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== COMMENTS ===== */}
      <TabsContent value="comments" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-amber-400" />Comments Manager</h4>
            <div className="flex gap-2">
              <Input value={commentsVideoId} onChange={e => setCommentsVideoId(e.target.value)} placeholder="Video ID" className="text-sm flex-1" />
              <Button size="sm" onClick={fetchComments} disabled={loading || !commentsVideoId}>Load Comments</Button>
            </div>
            {/* Quick pick from loaded videos */}
            {videos.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Quick pick:</span>
                {videos.slice(0, 5).map(v => (
                  <button key={v.id} onClick={() => { setCommentsVideoId(v.id); fetchComments(); }} className="text-[10px] text-cyan-400 hover:underline">{(v.title || v.video_description || v.id).substring(0, 20)}…</button>
                ))}
              </div>
            )}
            {comments.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {comments.map((c: any) => (
                    <div key={c.id} className="bg-muted/30 rounded-lg p-2.5">
                      <p className="text-xs text-foreground">{c.text}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span><Heart className="h-3 w-3 inline" /> {c.like_count || 0}</span>
                        <span><MessageSquare className="h-3 w-3 inline" /> {c.reply_count || 0} replies</span>
                        {c.create_time && <span><Clock className="h-3 w-3 inline" /> {new Date(c.create_time * 1000).toLocaleDateString()}</span>}
                      </div>
                      {replyingTo === c.id ? (
                        <div className="flex gap-1.5 mt-2">
                          <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." className="text-xs h-7 flex-1" onKeyDown={e => e.key === "Enter" && replyToComment(c.id)} />
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => replyToComment(c.id)} disabled={loading}>Send</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setReplyingTo(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyingTo(c.id)} className="text-[10px] text-cyan-400 hover:underline mt-1">Reply</button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">No comments loaded</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== DMs ===== */}
      <TabsContent value="dms" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Send className="h-4 w-4 text-pink-400" />Direct Messages</h4>
            <Button size="sm" onClick={fetchConversations} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Conversations</Button>
            <div className="grid grid-cols-3 gap-2" style={{ minHeight: 300 }}>
              <div className="col-span-1 space-y-1">
                {conversations.length > 0 ? conversations.map((c: any, i: number) => (
                  <button key={i} onClick={() => fetchMessages(c.conversation_id || c.id)} className={`w-full text-left p-2 rounded text-xs transition ${selectedConvo === (c.conversation_id || c.id) ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-muted/30 hover:bg-muted/50"}`}>
                    <p className="text-foreground font-medium truncate">{c.participant?.display_name || `Conversation ${i + 1}`}</p>
                  </button>
                )) : <p className="text-[10px] text-muted-foreground">No conversations</p>}
              </div>
              <div className="col-span-2 space-y-2">
                {selectedConvo ? (
                  <>
                    <ScrollArea className="max-h-[250px]">
                      <div className="space-y-1.5">
                        {messages.map((m: any, i: number) => (
                          <div key={i} className={`p-2 rounded text-xs ${m.sender === "self" ? "bg-cyan-500/10 ml-6" : "bg-muted/30 mr-6"}`}>
                            <p className="text-foreground">{m.content?.text || m.text || JSON.stringify(m.content)}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-1.5">
                      <Input value={dmText} onChange={e => setDmText(e.target.value)} placeholder="Type a message..." className="text-xs flex-1" onKeyDown={e => e.key === "Enter" && sendDm()} />
                      <Button size="sm" onClick={sendDm} disabled={loading || !dmText}><Send className="h-3.5 w-3.5" /></Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">Select a conversation</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== SEARCH ===== */}
      <TabsContent value="search" className="space-y-4 mt-4">
        {/* User Research */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-purple-400" />User Research</h4>
            <div className="flex gap-2">
              <Input value={researchUsername} onChange={e => setResearchUsername(e.target.value)} placeholder="TikTok username" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchUser()} />
              <Button size="sm" onClick={researchUser} disabled={loading || !researchUsername}><Search className="h-3.5 w-3.5 mr-1" />Lookup</Button>
            </div>
            {researchUserResult && (
              <Card className="border-cyan-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {researchUserResult.avatar_url && <img src={researchUserResult.avatar_url} className="h-10 w-10 rounded-full" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{researchUserResult.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">{researchUserResult.bio_description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.follower_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Followers</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.following_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Following</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.likes_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Likes</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.video_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Videos</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Video Research */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Video className="h-4 w-4 text-lime-400" />Video Search</h4>
            <div className="flex gap-2">
              <Input value={researchKeywords} onChange={e => setResearchKeywords(e.target.value)} placeholder="Keywords (comma separated)" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchVideoSearch()} />
              <Button size="sm" onClick={researchVideoSearch} disabled={loading || !researchKeywords}><Search className="h-3.5 w-3.5 mr-1" />Search</Button>
            </div>
            {researchVideoResults.length > 0 && (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1.5">
                  {researchVideoResults.map((v: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded p-2.5">
                      <p className="text-xs text-foreground line-clamp-2">{v.video_description || "No description"}</p>
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span><Eye className="h-3 w-3 inline" /> {(v.view_count || 0).toLocaleString()}</span>
                        <span><Heart className="h-3 w-3 inline" /> {(v.like_count || 0).toLocaleString()}</span>
                        <span><MessageSquare className="h-3 w-3 inline" /> {(v.comment_count || 0).toLocaleString()}</span>
                        <span><Share2 className="h-3 w-3 inline" /> {(v.share_count || 0).toLocaleString()}</span>
                        {v.username && <span className="text-cyan-400">@{v.username}</span>}
                      </div>
                      {v.hashtag_names?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {v.hashtag_names.map((h: string) => <Badge key={h} variant="outline" className="text-[9px]">#{h}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Hashtag Research */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Hash className="h-4 w-4 text-rose-400" />Hashtag Research</h4>
            <div className="flex gap-2">
              <Input value={researchHashtags} onChange={e => setResearchHashtags(e.target.value)} placeholder="Hashtags (comma separated, no #)" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchHashtagSearch()} />
              <Button size="sm" onClick={researchHashtagSearch} disabled={loading || !researchHashtags}><Hash className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            </div>
            {researchHashtagResults.length > 0 && (
              <div className="space-y-1.5">
                {researchHashtagResults.map((h: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">#{h.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(h.video_count || h.publish_count || 0).toLocaleString()} videos · {(h.view_count || 0).toLocaleString()} views</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comment Research */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Eye className="h-4 w-4 text-orange-400" />Comment Research</h4>
            <div className="flex gap-2">
              <Input value={researchCommentVideoId} onChange={e => setResearchCommentVideoId(e.target.value)} placeholder="Any TikTok video ID" className="text-sm flex-1" />
              <Button size="sm" onClick={researchCommentsFetch} disabled={loading || !researchCommentVideoId}><Search className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            </div>
            {researchComments.length > 0 && (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1.5">
                  {researchComments.map((c: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded p-2">
                      <p className="text-xs text-foreground">{c.text}</p>
                      <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span><Heart className="h-3 w-3 inline" /> {c.like_count || 0}</span>
                        <span><MessageSquare className="h-3 w-3 inline" /> {c.reply_count || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== AI TOOLS ===== */}
      <TabsContent value="ai-tools" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" />AI Caption Generator</h4>
            <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Topic or theme for TikTok caption..." className="text-sm" />
            <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic}><Wand2 className="h-3.5 w-3.5 mr-1" />Generate TikTok Caption</Button>
            {aiCaptionResult && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" />Content Analyzer</h4>
            <Textarea value={aiAnalyzeCaption} onChange={e => setAiAnalyzeCaption(e.target.value)} placeholder="Paste your TikTok caption or script to analyze..." rows={3} className="text-sm" />
            <Button size="sm" onClick={analyzeContent} disabled={loading || !aiAnalyzeCaption}><BarChart3 className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            {aiAnalyzeResult && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{aiAnalyzeResult}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== ANALYTICS ===== */}
      <TabsContent value="analytics" className="space-y-4 mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" />Video Performance</h4>
            <Button size="sm" onClick={() => fetchVideos()} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Analytics</Button>
            {videos.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.view_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Views</p></div>
                  <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.like_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Likes</p></div>
                  <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.comment_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Comments</p></div>
                  <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.share_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Shares</p></div>
                </div>
                <h5 className="text-xs font-semibold text-foreground mt-3">Top Performing Videos</h5>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1.5">
                    {[...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10).map((v, i) => (
                      <div key={v.id} className="bg-muted/30 rounded p-2 flex items-center gap-3">
                        <span className="text-xs font-bold text-cyan-400 w-5">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground line-clamp-1">{v.title || v.video_description || "Untitled"}</p>
                          <div className="flex gap-2 text-[10px] text-muted-foreground">
                            <span>{(v.view_count || 0).toLocaleString()} views</span>
                            <span>{(v.like_count || 0).toLocaleString()} likes</span>
                            <span>{((v.like_count || 0) / Math.max(v.view_count || 1, 1) * 100).toFixed(1)}% eng</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Load videos first to see analytics</p>
            )}
          </CardContent>
        </Card>

        {/* Creator Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" />Creator Info & Posting Rules</h4>
            <Button size="sm" onClick={fetchCreatorInfo} disabled={loading || !selectedAccount}><Star className="h-3.5 w-3.5 mr-1" />Fetch Creator Info</Button>
            {creatorInfo && <pre className="text-[10px] bg-muted/50 rounded p-3 overflow-auto max-h-[300px] text-foreground">{JSON.stringify(creatorInfo, null, 2)}</pre>}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== AUTOMATION ===== */}
      <TabsContent value="automation" className="space-y-4 mt-4">
        {/* Token Management */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" />Connection Health</h4>
            <p className="text-[10px] text-muted-foreground">Manage your TikTok API connection. Refresh tokens before they expire, or revoke access entirely.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={refreshToken} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh Token</Button>
              <Button size="sm" variant="destructive" onClick={() => callApi("revoke_token", {})} disabled={loading}><Shield className="h-3.5 w-3.5 mr-1" />Revoke Access</Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Portability */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Download className="h-4 w-4 text-blue-400" />Data Export</h4>
            <p className="text-[10px] text-muted-foreground">Export your TikTok data including videos, comments, and analytics.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                await fetchVideos();
                const blob = new Blob([JSON.stringify({ videos, profile, playlists }, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `tiktok-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
                toast.success("Data exported");
              }} disabled={loading}><Download className="h-3.5 w-3.5 mr-1" />Export JSON</Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Status */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-green-400" />Webhook Status</h4>
            <p className="text-[10px] text-muted-foreground">Your TikTok webhook endpoint is active and listening for events.</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">Active</span>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Callback URL:</p>
              <p className="text-[10px] text-foreground font-mono break-all">https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/tiktok-webhook</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Events: authorize, deauthorize, video.publish</p>
          </CardContent>
        </Card>

        {/* Share Kit */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Share2 className="h-4 w-4 text-cyan-400" />Share Kit</h4>
            <p className="text-[10px] text-muted-foreground">Share content directly to TikTok from your platform using the Share Kit API.</p>
            <Badge variant="outline" className="text-[10px]">Integrated via Content Publishing API</Badge>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default TKAutomationSuite;

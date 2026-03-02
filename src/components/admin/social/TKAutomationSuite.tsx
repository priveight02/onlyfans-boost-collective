import { useState, useCallback, useEffect, useRef } from "react";
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
import PlatformAccountSelector from "./PlatformAccountSelector";
import {
  Music2, Video, Upload, Eye, MessageSquare, Search, Hash,
  ListVideo, Send, RefreshCw, TrendingUp, BarChart3, Users,
  Shield, Play, Pause, Image, Layers, Clock, Heart, Share2,
  ExternalLink, Loader2, Brain, Activity, Star, Globe, Zap,
  MessageCircle, LayoutDashboard, Wand2, Megaphone, Copy,
  Target, Radio, Calendar, Download, Link2, FolderOpen,
  CheckCircle2, AlertCircle, Bot, Sparkles, ArrowRight,
  MapPin, FileVideo, FileImage, X, Trash2, Edit3, Filter,
  CalendarDays, LayoutGrid, Save, MoreHorizontal,
  Flame, RotateCcw, TrendingDown, Percent, MousePointerClick,
} from "lucide-react";
// TikTok-native DM conversations — no Instagram dependency

interface Props {
  selectedAccount: string;
  onNavigateToConnect?: () => void;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/>
  </svg>
);

const TKAutomationSuite = ({ selectedAccount: parentAccount, onNavigateToConnect, subTab: urlSubTab, onSubTabChange }: Props) => {
  const [activeTab, setActiveTabInternal] = useState(urlSubTab || "dashboard");
  const setActiveTab = (v: string) => { setActiveTabInternal(v); onSubTabChange?.(v); };
  useEffect(() => { if (urlSubTab && urlSubTab !== activeTab) setActiveTabInternal(urlSubTab); }, [urlSubTab]);
  // Multi-account: allow overriding via per-platform selector
  const [platformAccountId, setPlatformAccountId] = useState(parentAccount);
  useEffect(() => { setPlatformAccountId(parentAccount); }, [parentAccount]);
  const selectedAccount = platformAccountId || parentAccount;
  const [loading, setLoading] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null); // null = loading

  // TikTok-native live DM conversations state
  const [tkConversations, setTkConversations] = useState<any[]>([]);
  const [tkMessages, setTkMessages] = useState<any[]>([]);
  const [tkSelectedConvo, setTkSelectedConvo] = useState<string | null>(null);
  const [tkDmInput, setTkDmInput] = useState("");
  const [tkScanning, setTkScanning] = useState(false);
  const [tkSearchQuery, setTkSearchQuery] = useState("");

  // Connected TikTok account ID (may differ from selectedAccount in multi-account setups)
  const [connectedTkAccountId, setConnectedTkAccountId] = useState<string | null>(null);

  // Check TikTok connection globally (across all managed accounts)
  useEffect(() => {
    const check = async () => {
      // First check selected account
      if (selectedAccount) {
        const { data } = await supabase.from("social_connections")
          .select("id, account_id")
          .eq("account_id", selectedAccount)
          .eq("platform", "tiktok")
          .eq("is_connected", true)
          .maybeSingle();
        if (data) {
          setTiktokConnected(true);
          setConnectedTkAccountId(data.account_id);
          return;
        }
      }
      // Fallback: check ANY managed account with TikTok connected
      const { data: globalConn } = await supabase.from("social_connections")
        .select("id, account_id")
        .eq("platform", "tiktok")
        .eq("is_connected", true)
        .limit(1)
        .maybeSingle();
      setTiktokConnected(!!globalConn);
      setConnectedTkAccountId(globalConn?.account_id || null);
    };
    check();
    // Realtime: refresh connection status on any change to social_connections
    const channel = supabase
      .channel(`tk-conn-status-global-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections" }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
  const [publishPrivacy, setPublishPrivacy] = useState("");
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [publishId, setPublishId] = useState("");
  const [publishStatus, setPublishStatus] = useState<any>(null);

  // Publish photo
  const [photoUrls, setPhotoUrls] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoPrivacy, setPhotoPrivacy] = useState("");
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

  // Schedule tab upgraded state
  const [schedFilterStatus, setSchedFilterStatus] = useState<string>("all");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [schedBulkSelected, setSchedBulkSelected] = useState<Set<string>>(new Set());
  const [schedViewMode, setSchedViewMode] = useState<"list" | "calendar">("list");

  // === Upgraded Content Center State ===
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Schedule form — full TikTok fields
  const [schedPrivacy, setSchedPrivacy] = useState("");
  const [schedDisableDuet, setSchedDisableDuet] = useState(false);
  const [schedDisableComment, setSchedDisableComment] = useState(false);
  const [schedDisableStitch, setSchedDisableStitch] = useState(false);
  const [schedHashtags, setSchedHashtags] = useState("");
  const [schedLocation, setSchedLocation] = useState("");
  const [schedBrandContent, setSchedBrandContent] = useState(false);
  const [schedBrandOrganic, setSchedBrandOrganic] = useState(false);
  const [schedAiGenerating, setSchedAiGenerating] = useState(false);
  const [schedContentType, setSchedContentType] = useState<"video" | "photo" | "carousel">("video");

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

  const loadScheduledPosts = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "tiktok").order("created_at", { ascending: false }).limit(50);
    if (data) setScheduledPosts(data);
  }, [selectedAccount]);

  // Load scheduled posts + realtime sync
  useEffect(() => {
    if (!selectedAccount) return;
    loadScheduledPosts();
    const channel = supabase
      .channel(`tk-sched-posts-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_posts", filter: `account_id=eq.${selectedAccount}` }, () => {
        loadScheduledPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount, loadScheduledPosts]);

  // Use the account that actually has TikTok connected for API calls
  const effectiveAccountId = connectedTkAccountId || selectedAccount;

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-api", {
        body: { action, account_id: effectiveAccountId, params },
      });
      if (error) {
        const msg = typeof error === "object" && error.message ? error.message : String(error);
        toast.info(msg || "TikTok action could not be completed");
        return null;
      }
      if (!data?.success) {
        toast.info(data?.error || "TikTok action could not be completed");
        return null;
      }
      return data.data;
    } catch (e: any) {
      toast.info(e.message || "TikTok API unavailable", { description: "Please try again later." });
      return null;
    } finally {
      setLoading(false);
    }
  }, [effectiveAccountId]);

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
    if (!publishPrivacy) { toast.error("Select a privacy level"); return; }
    const d = await callApi("publish_video_by_url", {
      video_url: publishVideoUrl, title: withAttribution(publishVideoTitle), privacy_level: publishPrivacy,
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
    if (!photoPrivacy) { toast.error("Select a privacy level"); return; }
    const action = mediaType === "CAROUSEL" ? "publish_carousel" : "publish_photo";
    const title = withAttribution(photoTitle || photoDesc);
    const d = await callApi(action, {
      image_urls: urls, title, description: title,
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
    if (!newPostCaption && !newPostMediaUrl && uploadedFiles.length === 0) { toast.error("Add caption or media"); return; }
    if (!schedPrivacy) { toast.error("Select a privacy level before scheduling"); return; }

    const mediaUrls = uploadedFiles.filter(f => f.url).map(f => f.url!);
    if (newPostMediaUrl) mediaUrls.unshift(newPostMediaUrl);

    const captionWithHashtags = schedHashtags
      ? `${newPostCaption}\n\n${schedHashtags.split(",").map(h => `#${h.trim()}`).join(" ")}`
      : newPostCaption;
    const fullCaption = withAttribution(captionWithHashtags);

    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount, platform: "tiktok", post_type: schedContentType,
      caption: fullCaption, media_urls: mediaUrls.length > 0 ? mediaUrls : [],
      hashtags: schedHashtags ? schedHashtags.split(",").map(h => h.trim()).filter(Boolean) : null,
      scheduled_at: newPostScheduledAt || null, status: newPostScheduledAt ? "scheduled" : "draft",
      metadata: {
        privacy_level: schedPrivacy, disable_duet: schedDisableDuet,
        disable_comment: schedDisableComment, disable_stitch: schedDisableStitch,
        location: schedLocation || null,
        brand_content: schedBrandContent,
        brand_organic: schedBrandOrganic,
        content_type: schedContentType,
      },
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Post created!");
      setNewPostCaption(""); setNewPostMediaUrl(""); setNewPostScheduledAt("");
      setUploadedFiles([]); setSchedHashtags(""); setSchedLocation("");
      setSchedPrivacy(""); setSchedDisableDuet(false);
      setSchedDisableComment(false); setSchedDisableStitch(false);
      setSchedBrandContent(false); setSchedBrandOrganic(false); setSchedContentType("video");
      loadScheduledPosts();
    }
  };

  // === PRODUCTION: Auto-poll publish status ===
  const pollPublishStatus = useCallback(async (postId: string, publishId: string, attempts = 0) => {
    if (attempts > 20) return; // Max 20 attempts (~2 min)
    const d = await callApi("check_publish_status", { publish_id: publishId, post_id: postId });
    const status = d?.data?.status;
    if (status === "PUBLISH_COMPLETE") {
      toast.success("Video published successfully on TikTok!");
      loadScheduledPosts();
    } else if (status === "FAILED") {
      toast.error(`Publishing failed: ${d?.data?.fail_reason || "Unknown error"}`);
      loadScheduledPosts();
    } else {
      // Still processing, poll again in 6 seconds
      setTimeout(() => pollPublishStatus(postId, publishId, attempts + 1), 6000);
    }
  }, [callApi, loadScheduledPosts]);

  const publishPost = async (post: any) => {
    toast.info("Publishing to TikTok...");
    const meta = post.metadata || {};
    const mediaUrl = Array.isArray(post.media_urls) ? post.media_urls[0] : null;
    if (!mediaUrl) { toast.error("No media URL available"); return; }
    const postType = meta.content_type || post.post_type || "video";
    const finalTitle = withAttribution(post.caption || "");
    const finalPrivacy = meta.privacy_level || "SELF_ONLY";
    let result;
    if (postType === "video") {
      result = await callApi("publish_video_by_url", {
        video_url: mediaUrl, title: finalTitle,
        privacy_level: finalPrivacy,
        disable_duet: meta.disable_duet || false,
        disable_comment: meta.disable_comment || false,
        disable_stitch: meta.disable_stitch || false,
        brand_content_toggle: meta.brand_content || false,
        brand_organic_toggle: meta.brand_organic || false,
        post_id: post.id,
      });
    } else {
      const action = postType === "carousel" ? "publish_carousel" : "publish_photo";
      result = await callApi(action, {
        image_urls: post.media_urls, title: finalTitle, description: finalTitle,
        privacy_level: finalPrivacy,
        disable_comment: meta.disable_comment || false,
        brand_content_toggle: meta.brand_content || false,
        brand_organic_toggle: meta.brand_organic || false,
      });
    }
    if (result) {
      const pubId = result?.data?.publish_id;
      if (pubId && post.id) {
        // Auto-poll status until complete
        pollPublishStatus(post.id, pubId);
      } else {
        toast.success("Published!");
      }
      loadScheduledPosts();
    }
  };

  // === PRODUCTION: Sync all publishing statuses ===
  const syncPublishStatuses = useCallback(async () => {
    const d = await callApi("sync_publish_statuses", {});
    if (d?.synced > 0) toast.success(`${d.synced} post(s) status updated`);
    loadScheduledPosts();
  }, [callApi, loadScheduledPosts]);

  // === PRODUCTION: Process scheduled posts (trigger auto-publish) ===
  const triggerAutoPublish = useCallback(async () => {
    const d = await callApi("process_scheduled", {});
    if (d?.processed > 0) toast.success(`${d.processed} scheduled post(s) auto-published!`);
    else if (d?.processed === 0) toast.info("No posts due for publishing");
    if (d?.failed > 0) toast.error(`${d.failed} post(s) failed to publish`);
    loadScheduledPosts();
  }, [callApi, loadScheduledPosts]);

  // === PRODUCTION: Sync engagement data ===
  const syncEngagement = useCallback(async () => {
    const d = await callApi("get_post_engagement", {});
    if (d) toast.success("Engagement data synced from TikTok");
    loadScheduledPosts();
  }, [callApi, loadScheduledPosts]);

  // === NEW FEATURE: AI A/B Caption Testing ===
  const [abCaptions, setAbCaptions] = useState<{ a: string; b: string } | null>(null);
  const [abGenerating, setAbGenerating] = useState(false);
  const generateAbCaptions = async (topic: string) => {
    if (!topic) { toast.error("Add a topic first"); return; }
    setAbGenerating(true);
    try {
      const [resA, resB] = await Promise.all([
        supabase.functions.invoke("social-ai-responder", {
          body: { action: "generate_caption", account_id: selectedAccount, params: { topic, platform: "tiktok", include_cta: true, style: "viral_hook" } },
        }),
        supabase.functions.invoke("social-ai-responder", {
          body: { action: "generate_caption", account_id: selectedAccount, params: { topic, platform: "tiktok", include_cta: true, style: "storytelling" } },
        }),
      ]);
      setAbCaptions({
        a: resA.data?.data?.caption || "Caption A failed",
        b: resB.data?.data?.caption || "Caption B failed",
      });
    } catch (e: any) { toast.error(e.message); }
    setAbGenerating(false);
  };

  // === NEW FEATURE: CTA Optimizer ===
  const [ctaLink, setCtaLink] = useState("");
  const [ctaText, setCtaText] = useState("🔗 Link in bio");
  const TIKTOK_APP_NAME = "Uplyze";
  const TIKTOK_ORG_NAME = "Uplyze";
  const ATTRIBUTION_LINE = `Posted via ${TIKTOK_APP_NAME}`;
  const injectCta = (caption: string) => {
    const cta = ctaLink ? `\n\n${ctaText} → ${ctaLink}` : `\n\n${ctaText}`;
    return caption + cta;
  };
  const withAttribution = (caption: string) => {
    if (!caption?.trim()) return ATTRIBUTION_LINE;
    return caption.includes(ATTRIBUTION_LINE) ? caption : `${caption}\n\n${ATTRIBUTION_LINE}`;
  };
  const isVideoMedia = (file: File) => {
    const name = (file.name || "").toLowerCase();
    return file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi)$/i.test(name);
  };

  // === PRODUCTION: Auto-poll for publishing posts on mount ===
  useEffect(() => {
    if (!selectedAccount) return;
    const publishingPosts = scheduledPosts.filter(p => p.status === "publishing" && p.platform_post_id);
    publishingPosts.forEach(p => {
      pollPublishStatus(p.id, p.platform_post_id, 0);
    });
  }, [selectedAccount]); // Only on mount, not on scheduledPosts change

  // === COMPLIANCE: Auto-fetch creator_info when content tab is active ===
  useEffect(() => {
    if (activeTab === "content" && selectedAccount && tiktokConnected && !creatorInfo) {
      fetchCreatorInfo();
    }
  }, [activeTab, selectedAccount, tiktokConnected]);

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted");
    setScheduledPosts(prev => prev.filter(p => p.id !== id));
    setSchedBulkSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Edit post inline
  const startEditPost = (post: any) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption || "");
    setEditScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "");
  };

  const saveEditPost = async () => {
    if (!editingPostId) return;
    const { error } = await supabase.from("social_posts").update({
      caption: editCaption,
      scheduled_at: editScheduledAt || null,
      status: editScheduledAt ? "scheduled" : "draft",
      updated_at: new Date().toISOString(),
    }).eq("id", editingPostId);
    if (error) toast.error(error.message);
    else { toast.success("Post updated!"); setEditingPostId(null); loadScheduledPosts(); }
  };

  // Duplicate post
  const duplicatePost = async (post: any) => {
    const { id, created_at, updated_at, platform_post_id, published_at, error_message, engagement_data, ...rest } = post;
    const { error } = await supabase.from("social_posts").insert({ ...rest, status: "draft", scheduled_at: null });
    if (error) toast.error(error.message);
    else { toast.success("Post duplicated as draft!"); loadScheduledPosts(); }
  };

  // Bulk delete
  const bulkDeletePosts = async () => {
    if (schedBulkSelected.size === 0) return;
    const ids = Array.from(schedBulkSelected);
    const { error } = await supabase.from("social_posts").delete().in("id", ids);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} posts deleted`); setSchedBulkSelected(new Set()); loadScheduledPosts(); }
  };

  // Bulk publish
  const bulkPublishPosts = async () => {
    if (schedBulkSelected.size === 0) return;
    const posts = scheduledPosts.filter(p => schedBulkSelected.has(p.id) && p.status !== "published");
    for (const p of posts) await publishPost(p);
    setSchedBulkSelected(new Set());
  };

  // Toggle bulk selection
  const toggleBulkSelect = (id: string) => {
    setSchedBulkSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // File upload handler — shows preview instantly, uploads to storage in background
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileUploading(true);
    // 1. Show previews instantly using blob URLs
    const pending: { file: File; preview: string; url?: string }[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setUploadedFiles(prev => [...prev, ...pending]);

    // 2. Upload to storage in background and patch URLs in
    let successCount = 0;
    for (let i = 0; i < pending.length; i++) {
      const file = pending[i].file;
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${selectedAccount}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data: urlData } = supabase.storage.from("social-media").getPublicUrl(data.path);
      const publicUrl = urlData.publicUrl;
      // Patch the URL into the already-visible entry by matching the preview blob
      const blobUrl = pending[i].preview;
      setUploadedFiles(prev => prev.map(f => f.preview === blobUrl ? { ...f, url: publicUrl } : f));
      successCount++;
    }
    setFileUploading(false);
    if (successCount > 0) toast.success(`${successCount} file(s) uploaded`);
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  };

  // AI caption generator for scheduler
  const generateScheduleCaption = async () => {
    if (!newPostCaption && !schedHashtags) { toast.error("Add a topic or hashtags first"); return; }
    setSchedAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: newPostCaption || schedHashtags, platform: "tiktok", include_cta: true, content_type: schedContentType } },
      });
      if (error) throw error;
      if (data?.success && data.data?.caption) {
        setNewPostCaption(data.data.caption);
        toast.success("AI caption generated!");
      }
    } catch (e: any) { toast.error(e.message); }
    setSchedAiGenerating(false);
  };

  // TikTok-native DM functions
  const loadTkConversations = useCallback(async () => {
    if (!selectedAccount) return;
    setTkScanning(true);
    // DM API scopes not yet approved — skip TikTok API call, load from local DB only
    // await callApi("get_conversations", { limit: 50 });
    const { data } = await supabase.from("ai_dm_conversations")
      .select("*")
      .eq("account_id", selectedAccount)
      .eq("platform", "tiktok")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (data) setTkConversations(data);
    setTkScanning(false);
  }, [selectedAccount]);

  const loadTkMessages = useCallback(async (convoId: string) => {
    setTkSelectedConvo(convoId);
    const { data } = await supabase.from("ai_dm_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .eq("account_id", selectedAccount)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setTkMessages(data);
    // DM API scopes not yet approved — skip TikTok API fetch
  }, [selectedAccount]);

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
        <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-connect-highlight" />
        <div className="absolute inset-[-8px] rounded-full bg-cyan-500/10 animate-connect-highlight" style={{ animationDelay: '0.3s' }} />
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
          if (onNavigateToConnect) {
            onNavigateToConnect();
          }
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

  if (!tiktokConnected) {
    return <ConnectTikTokCTA />;
  }

  return (
    <div className="space-y-3">
      {/* Per-platform account selector */}
      <PlatformAccountSelector
        platform="tiktok"
        selectedAccountId={selectedAccount}
        onAccountChange={setPlatformAccountId}
        platformIcon={<TikTokIcon className="h-4 w-4 text-cyan-400" />}
        platformColor="text-cyan-400"
      />
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-0.5 rounded-lg gap-0.5 flex flex-wrap w-full">
        {[
          { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
          { v: "auto-dm", icon: Brain, l: "Auto-DM" },
          { v: "content", icon: Layers, l: "Content" },
          { v: "schedule", icon: Calendar, l: "Schedule" },
          { v: "comments", icon: MessageSquare, l: "Comments" },
          { v: "dms", icon: Send, l: "DMs" },
          { v: "search", icon: Search, l: "Search" },
          { v: "ai-tools", icon: Wand2, l: "AI Tools" },
          { v: "analytics", icon: BarChart3, l: "Analytics" },
          { v: "automation", icon: Zap, l: "Automation" },
        ].map(t => (
          <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
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
          <Card className="bg-white/[0.03] border-cyan-500/20 backdrop-blur-sm">
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
                <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.follower_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>
                <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.following_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Following</p></div>
                <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.likes_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.video_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Videos</p></div>
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
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{videos.length}</p><p className="text-[10px] text-muted-foreground">Videos Loaded</p></CardContent></Card>
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "scheduled").length}</p><p className="text-[10px] text-muted-foreground">Scheduled</p></CardContent></Card>
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "published").length}</p><p className="text-[10px] text-muted-foreground">Published</p></CardContent></Card>
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{playlists.length}</p><p className="text-[10px] text-muted-foreground">Playlists</p></CardContent></Card>
        </div>

        {/* Recent Videos */}
        {videos.length > 0 && (
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Video className="h-4 w-4 text-cyan-400" />Recent Videos</h4>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {videos.slice(0, 5).map((v: any) => (
                    <div key={v.id} className="bg-white/[0.03] rounded-lg p-3 flex gap-3">
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
        <Card className={`border-2 transition-colors backdrop-blur-sm ${autoRespondActive ? "border-red-500/50 bg-red-500/5" : "bg-white/[0.03] border-white/[0.06]"}`}>
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" />Test AI Responder</h4>
            <div className="grid grid-cols-3 gap-2">
              <Input value={aiTestSender} onChange={e => setAiTestSender(e.target.value)} placeholder="Sender name" className="text-sm" />
              <Input value={aiTestMessage} onChange={e => setAiTestMessage(e.target.value)} placeholder="Type a test DM..." className="text-sm col-span-2" onKeyDown={e => e.key === "Enter" && generateAiDmReply()} />
            </div>
            <Button onClick={generateAiDmReply} disabled={loading || aiTyping || aiLifePause || !aiTestMessage} size="sm"><Brain className="h-3.5 w-3.5 mr-1.5" />Generate Reply</Button>
            {aiLifePause && (
                <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06] flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground italic">away for {aiTypingDelay}s... (simulating natural pause)</p>
              </div>
            )}
            {aiTyping && !aiLifePause && (
              <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06] flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-sm text-muted-foreground italic">typing...</p>
              </div>
            )}
            {aiTestReply && !aiTyping && !aiLifePause && (
                <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all ${tkSelectedConvo === c.id ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-white/[0.03] hover:bg-white/[0.06] border border-transparent"}`}
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
                            <div key={m.id} className={`p-2.5 rounded-lg text-xs max-w-[85%] ${m.sender_type === "fan" || m.sender_type === "user" ? "bg-white/[0.03] mr-auto" : "bg-cyan-500/10 ml-auto"}`}>
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
                      <div className="h-16 w-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
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
        {/* Content Studio Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Layers className="h-4 w-4 text-white" />
              </div>
              Content Studio
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Create, upload, publish & track — synced with TikTok API</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={syncPublishStatuses}>
              <RefreshCw className="h-3 w-3" /> Sync Statuses
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={syncEngagement}>
              <BarChart3 className="h-3 w-3" /> Sync Engagement
            </Button>
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
              {scheduledPosts.filter(p => p.status === "scheduled").length} Scheduled
            </Badge>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
              {scheduledPosts.filter(p => p.status === "published").length} Published
            </Badge>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Total Videos", value: videos.length, icon: Video, color: "text-cyan-400", bg: "bg-cyan-500/10" },
            { label: "Scheduled", value: scheduledPosts.filter(p => p.status === "scheduled").length, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Publishing", value: scheduledPosts.filter(p => p.status === "publishing").length, icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Published", value: scheduledPosts.filter(p => p.status === "published").length, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Failed", value: scheduledPosts.filter(p => p.status === "failed" || p.error_message).length, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
          ].map(s => (
            <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ===== AI Caption Generator (inline) ===== */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" />AI Caption Generator</h4>
            <p className="text-[10px] text-muted-foreground">Generate concise, post-relevant captions with trending hashtags</p>
            <div className="flex gap-2">
              <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Post topic or keywords..." className="text-sm flex-1 bg-muted/20 border-border/40" />
              <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic} className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Generate
              </Button>
            </div>
            {aiCaptionResult && (
              <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                <p className="text-sm text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-cyan-400" onClick={() => { setNewPostCaption(aiCaptionResult); toast.success("Caption applied to post"); }}><CheckCircle2 className="h-3 w-3 mr-1" />Use in Post</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== NEW FEATURE 1: A/B Caption Testing ===== */}
        <Card className="bg-gradient-to-r from-violet-500/5 to-pink-500/5 border-violet-500/10">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center">
                  <Target className="h-3.5 w-3.5 text-white" />
                </div>
                A/B Caption Tester
                <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px]">CONVERSION</Badge>
              </h4>
            </div>
            <p className="text-[10px] text-muted-foreground">Generate two AI caption variants and pick the highest-converting one</p>
            <div className="flex gap-2">
              <Input value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} placeholder="Enter topic to A/B test..." className="text-sm flex-1 bg-muted/20 border-border/40" />
              <Button size="sm" onClick={() => generateAbCaptions(newPostCaption)} disabled={abGenerating || !newPostCaption} className="bg-violet-500 hover:bg-violet-600 text-white gap-1">
                {abGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                Generate A/B
              </Button>
            </div>
            {abCaptions && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3 border border-violet-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px]">VARIANT A — Viral Hook</Badge>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setNewPostCaption(abCaptions.a); toast.success("Caption A selected"); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{abCaptions.a}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 border border-pink-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[9px]">VARIANT B — Storytelling</Badge>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setNewPostCaption(abCaptions.b); toast.success("Caption B selected"); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{abCaptions.b}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== NEW FEATURE 2: CTA Optimizer ===== */}
        <Card className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border-emerald-500/10">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <MousePointerClick className="h-3.5 w-3.5 text-white" />
              </div>
              CTA Optimizer
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">CONVERSION</Badge>
            </h4>
            <p className="text-[10px] text-muted-foreground">Auto-inject conversion-optimized CTAs into every post caption</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">CTA Text</label>
                <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="🔗 Link in bio" className="text-sm bg-muted/20 border-border/40" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">CTA Link (optional)</label>
                <Input value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="https://yourlink.com" className="text-sm bg-muted/20 border-border/40" />
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {["🔗 Link in bio", "⬇️ DM me for more", "👉 Follow for Part 2", "🎁 Free gift in bio", "💰 Limited time offer"].map(t => (
                <Button key={t} size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setCtaText(t)}>{t}</Button>
              ))}
            </div>
            {newPostCaption && (
              <div className="bg-white/[0.03] rounded-lg p-3 border border-emerald-500/20">
                <p className="text-[10px] text-muted-foreground mb-1">Preview with CTA:</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{injectCta(newPostCaption)}</p>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] mt-2 text-emerald-400" onClick={() => { setNewPostCaption(injectCta(newPostCaption)); toast.success("CTA injected!"); }}>
                  <MousePointerClick className="h-3 w-3 mr-1" /> Apply CTA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== MEGA SCHEDULER — Full TikTok Posting Form ===== */}
        <Card className="bg-white/[0.03] border-cyan-500/20 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <Upload className="h-3.5 w-3.5 text-white" />
                </div>
                Create & Schedule Post
              </h4>
              <div className="flex gap-1.5">
                {(["video", "photo", "carousel"] as const).map(ct => (
                  <Button key={ct} size="sm" variant={schedContentType === ct ? "default" : "outline"}
                    onClick={() => setSchedContentType(ct)}
                    className={`text-xs h-7 capitalize ${schedContentType === ct ? (ct === "video" ? "bg-cyan-500 hover:bg-cyan-600" : ct === "photo" ? "bg-blue-500 hover:bg-blue-600" : "bg-indigo-500 hover:bg-indigo-600") : ""}`}>
                    {ct === "video" ? <FileVideo className="h-3 w-3 mr-1" /> : ct === "photo" ? <FileImage className="h-3 w-3 mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
                    {ct}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              {/* Left Column — Caption & Media */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Caption / Title</label>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-cyan-400 hover:text-cyan-300" onClick={generateScheduleCaption} disabled={schedAiGenerating}>
                      {schedAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} placeholder="Write an engaging caption... or click AI Generate" rows={4} className="text-sm bg-muted/20 border-border/40 focus:border-cyan-500/40" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hashtags (comma separated)</label>
                  <Input value={schedHashtags} onChange={e => setSchedHashtags(e.target.value)} placeholder="trending, fyp, viral, dance..." className="text-sm bg-muted/20 border-border/40 focus:border-cyan-500/40" />
                  {schedHashtags && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {schedHashtags.split(",").map(h => h.trim()).filter(Boolean).map(h => (
                        <Badge key={h} variant="outline" className="text-[9px] border-cyan-500/20 text-cyan-400">#{h}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Media — Upload Files or Paste URL</label>
                  <input ref={fileInputRef} type="file" multiple accept={schedContentType === "video" ? "video/*" : "image/*,video/*"} className="hidden" onChange={e => handleFileUpload(e.target.files)} />
                  <div
                    className="border-2 border-dashed border-white/[0.08] rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e.dataTransfer.files); }}
                  >
                    {fileUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                        <p className="text-xs text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                          <Upload className="h-4 w-4 text-cyan-400" />
                        </div>
                        <p className="text-xs font-medium text-foreground">Drop files here or click to browse</p>
                        <p className="text-[10px] text-muted-foreground">
                          {schedContentType === "video" ? "MP4, MOV, WebM — max 500MB" : "JPG, PNG, WebP — up to 35 images for carousel"}
                        </p>
                      </div>
                    )}
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {uploadedFiles.map((f, i) => {
                        const count = uploadedFiles.length;
                        const size = count <= 1 ? 'h-24 w-24' : count <= 3 ? 'h-20 w-20' : count <= 6 ? 'h-16 w-16' : 'h-14 w-14';
                        return (
                          <div key={i} className="relative group">
                            {isVideoMedia(f.file) ? (
                              <video
                                src={f.preview}
                                className={`${size} rounded-lg object-cover ring-1 ring-border/20`}
                                autoPlay loop muted playsInline preload="auto"
                                ref={el => { if (el) el.play().catch(() => {}); }}
                              />
                            ) : (
                              <img src={f.preview} className={`${size} rounded-lg object-cover ring-1 ring-border/20`} />
                            )}
                            <button onClick={() => removeUploadedFile(i)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="h-3 w-3" />
                            </button>
                            {f.url && <CheckCircle2 className="absolute bottom-1 right-1 h-3.5 w-3.5 text-green-400" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-px flex-1 bg-border/30" />
                      <span className="text-[10px] text-muted-foreground">OR paste URL</span>
                      <div className="h-px flex-1 bg-border/30" />
                    </div>
                    <Input value={newPostMediaUrl} onChange={e => setNewPostMediaUrl(e.target.value)} placeholder="https://example.com/video.mp4" className="text-sm bg-muted/20 border-border/40 focus:border-cyan-500/40 font-mono text-[11px]" />
                  </div>
                </div>

              </div>

              {/* Right Column — TikTok Required UX Flow (Point 1 → 5) */}
              <div className="space-y-3">
                {/* ===== POINT 1: Creator Info ===== */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">1) Creator Info & Daily Limits</p>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={fetchCreatorInfo}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                    </Button>
                  </div>
                  {/* REQUIRED: Display creator nickname so user knows which TikTok account content uploads to */}
                  {profile ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      {(profile.avatar_url || profile.avatar_url_100) && <img src={profile.avatar_url || profile.avatar_url_100} className="h-8 w-8 rounded-full object-cover" />}
                      <div>
                        <p className="text-xs font-semibold text-foreground">{profile.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">@{profile.username} • Posting to this account</p>
                      </div>
                      <TikTokIcon className="h-4 w-4 text-cyan-400 ml-auto" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <p className="text-[10px] text-amber-400">Sync your TikTok profile first (Dashboard → Sync) to display creator info</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">App: <span className="text-foreground font-medium">{TIKTOK_APP_NAME}</span> • Org: <span className="text-foreground font-medium">{TIKTOK_ORG_NAME}</span></p>
                  {/* REQUIRED: Show daily posting limit and block if reached */}
                  <p className="text-[10px] text-muted-foreground">Daily posting limit: <span className="text-foreground font-medium">20 posts per day</span></p>
                </div>

                {/* ===== POINT 2: Privacy Level — MUST use dynamic options from creator_info ===== */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">2) Privacy Level (required — no default)</label>
                  <select value={schedPrivacy} onChange={e => setSchedPrivacy(e.target.value)} className="w-full bg-muted/20 border border-border/40 text-foreground rounded-lg px-3 py-2 text-sm focus:border-cyan-500/40 outline-none">
                    <option value="" disabled>— Select privacy level —</option>
                    {(() => {
                      // REQUIRED: Use privacy_level_options from creator_info API response
                      const options: string[] = creatorInfo?.creator_info?.privacy_level_options ?? creatorInfo?.privacy_level_options ?? [];
                      const labels: Record<string, string> = {
                        "PUBLIC_TO_EVERYONE": "🌍 Public — Everyone",
                        "MUTUAL_FOLLOW_FRIENDS": "👥 Friends — Mutual Follows",
                        "FOLLOWER_OF_CREATOR": "🔒 Followers Only",
                        "SELF_ONLY": "🔐 Private — Self Only",
                      };
                      if (options.length > 0) {
                        return options.map(opt => (
                          <option key={opt} value={opt}>{labels[opt] || opt}</option>
                        ));
                      }
                      // Fallback when creator_info not yet fetched — show all but warn
                      return Object.entries(labels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ));
                    })()}
                  </select>
                  {!creatorInfo && (
                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Click "Refresh" in Creator Info above to load available privacy options from TikTok
                    </p>
                  )}
                </div>

                {/* ===== POINT 2 continued: Interaction Settings — respect creator_info disabled states ===== */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground block">2b) Interaction Settings</label>
                  {(() => {
                    // REQUIRED: If creator_info returns duet/stitch/comment as disabled, auto-disable and show explanation
                    const ci = creatorInfo?.creator_info || creatorInfo || {};
                    const duetDisabledByCreator = ci.duet_disabled === true;
                    const stitchDisabledByCreator = ci.stitch_disabled === true;
                    const commentDisabledByCreator = ci.comment_disabled === true;
                    const items = [
                      ...(schedContentType === "video" ? [
                        { label: "Allow Duets", icon: Users, checked: !schedDisableDuet, onChange: (v: boolean) => setSchedDisableDuet(!v), disabledByCreator: duetDisabledByCreator },
                        { label: "Allow Stitches", icon: Layers, checked: !schedDisableStitch, onChange: (v: boolean) => setSchedDisableStitch(!v), disabledByCreator: stitchDisabledByCreator },
                      ] : []),
                      { label: "Allow Comments", icon: MessageSquare, checked: !schedDisableComment, onChange: (v: boolean) => setSchedDisableComment(!v), disabledByCreator: commentDisabledByCreator },
                    ];
                    return (
                      <div className="grid grid-cols-1 gap-2">
                        {items.map(s => (
                          <label key={s.label} className={`flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30 transition-colors ${s.disabledByCreator ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/30"}`}>
                            <span className="text-xs text-foreground flex items-center gap-2">
                              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />{s.label}
                              {s.disabledByCreator && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] ml-1">Disabled in TikTok settings</Badge>}
                            </span>
                            <Switch checked={s.disabledByCreator ? false : s.checked} onCheckedChange={s.disabledByCreator ? undefined : s.onChange} disabled={s.disabledByCreator} className="scale-75" />
                          </label>
                        ))}
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>

            {/* ===== POINT 3: Commercial Content Disclosure (full width) ===== */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">3) Commercial Content Disclosure</label>
              <p className="text-[10px] text-muted-foreground">If your content promotes a brand, product, or third party, you must enable the relevant toggle below. Learn more at <a href="https://ads.tiktok.com/help/article/about-the-content-disclosure-setting-for-creators?lang=en" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">TikTok Branded Content Policy</a>.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30 cursor-pointer hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-foreground flex items-center gap-2"><Megaphone className="h-3.5 w-3.5 text-muted-foreground" />Branded Content — paid partnership or sponsorship</span>
                  <Switch checked={schedBrandContent} onCheckedChange={setSchedBrandContent} className="scale-75" />
                </label>
                <label className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30 cursor-pointer hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-foreground flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-muted-foreground" />Your Brand Promotion — promoting your own business</span>
                  <Switch checked={schedBrandOrganic} onCheckedChange={setSchedBrandOrganic} className="scale-75" />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">By publishing, you agree to TikTok's <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Music Usage Confirmation</a> and <a href="https://www.tiktok.com/community-guidelines" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Community Guidelines</a>.</p>
            </div>

            {/* ===== POINT 4 + Schedule: 3-column layout ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Content Preview */}
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">4) Content Preview & Attribution</p>
                <p className="text-[10px] text-muted-foreground">Review what will be posted to your TikTok account before confirming.</p>
                {(uploadedFiles.length > 0 || newPostMediaUrl) && (
                  <div className="rounded-lg overflow-hidden border border-border/20 bg-black/20">
                    {uploadedFiles.length > 0 ? (
                      <div className="flex gap-1 p-2 flex-wrap">
                        {uploadedFiles.slice(0, 4).map((f, i) => (
                          isVideoMedia(f.file) ? (
                            <video key={i} src={f.preview} className="h-14 w-14 rounded object-cover" muted playsInline />
                          ) : (
                            <img key={i} src={f.preview} className="h-14 w-14 rounded object-cover" />
                          )
                        ))}
                        {uploadedFiles.length > 4 && <div className="h-14 w-14 rounded bg-white/[0.06] flex items-center justify-center text-[10px] text-muted-foreground">+{uploadedFiles.length - 4}</div>}
                      </div>
                    ) : newPostMediaUrl && (
                      <div className="p-2">
                        <p className="text-[10px] text-muted-foreground truncate">📎 {newPostMediaUrl}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.06]">
                  <p className="text-[10px] text-muted-foreground mb-1">Caption as it will appear:</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{withAttribution(newPostCaption || "") || <span className="text-muted-foreground italic">No caption</span>}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">Privacy: <span className="text-foreground font-medium">{schedPrivacy || "Not selected"}</span></p>
              </div>

              {/* Location + Schedule */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <MapPin className="h-3 w-3" />Location (optional)
                  </label>
                  <Input value={schedLocation} onChange={e => setSchedLocation(e.target.value)} placeholder="New York, USA" className="text-sm bg-muted/20 border-border/40 focus:border-cyan-500/40" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <Calendar className="h-3 w-3" />Schedule Date & Time
                  </label>
                  <Input type="datetime-local" value={newPostScheduledAt} onChange={e => setNewPostScheduledAt(e.target.value)} className="text-sm bg-muted/20 border-border/40 focus:border-cyan-500/40" />
                  <p className="text-[10px] text-muted-foreground mt-1">Leave empty to save as draft</p>
                </div>
              </div>

              {/* Note */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3 h-fit">
                <p className="text-[10px] text-muted-foreground">
                  <strong className="text-foreground">⚠️ Note:</strong> After you click "Publish Now", your content will be sent to TikTok for processing. It may take <strong>a few minutes</strong> for your content to appear on TikTok. You can track the publish status below.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={schedulePost} disabled={!schedPrivacy || (!newPostCaption && !newPostMediaUrl && uploadedFiles.length === 0) || (creatorInfo && (creatorInfo?.creator_info?.can_post === false || creatorInfo?.can_post === false))} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white gap-2">
                {newPostScheduledAt ? <Calendar className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                {newPostScheduledAt ? "Schedule Post" : "Save as Draft"}
              </Button>
              {(newPostMediaUrl || uploadedFiles.some(f => f.url)) && !newPostScheduledAt && (
                <Button variant="outline" onClick={async () => {
                  if (!schedPrivacy) { toast.error("Select a privacy level before publishing"); return; }
                  if (creatorInfo && (creatorInfo?.creator_info?.can_post === false || creatorInfo?.can_post === false)) {
                    toast.error("Daily posting limit reached — you cannot post more content today."); return;
                  }
                  const mediaUrl = uploadedFiles.find(f => f.url)?.url || newPostMediaUrl;
                  if (!mediaUrl) return;
                  const finalTitle = withAttribution(newPostCaption || "");
                  if (schedContentType === "video") {
                    await callApi("publish_video_by_url", {
                      video_url: mediaUrl, title: finalTitle,
                      privacy_level: schedPrivacy, disable_duet: schedDisableDuet,
                      disable_comment: schedDisableComment, disable_stitch: schedDisableStitch,
                      brand_content_toggle: schedBrandContent,
                      brand_organic_toggle: schedBrandOrganic,
                    });
                  } else {
                    const urls = uploadedFiles.filter(f => f.url).map(f => f.url!);
                    if (newPostMediaUrl) urls.unshift(newPostMediaUrl);
                    await callApi(schedContentType === "carousel" ? "publish_carousel" : "publish_photo", {
                      image_urls: urls, title: finalTitle, description: finalTitle,
                      privacy_level: schedPrivacy, disable_comment: schedDisableComment,
                      brand_content_toggle: schedBrandContent,
                      brand_organic_toggle: schedBrandOrganic,
                    });
                  }
                  toast.success("Content sent to TikTok! It may take a few minutes to appear on your profile.");
                }} disabled={loading || !schedPrivacy || (creatorInfo && (creatorInfo?.creator_info?.can_post === false || creatorInfo?.can_post === false))} className="gap-2">
                  <Upload className="h-4 w-4" />Publish Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Publish Status Checker */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <h5 className="text-xs font-semibold text-foreground">Check Publish Status</h5>
            </div>
            <div className="flex gap-2">
              <Input value={publishId} onChange={e => setPublishId(e.target.value)} placeholder="Enter publish_id to track status..." className="text-sm flex-1 bg-muted/20 border-border/40" />
              <Button size="sm" variant="outline" onClick={checkPublishStatus} disabled={loading || !publishId} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />Track
              </Button>
            </div>
            {publishStatus && (
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <div className="flex items-center gap-2 mb-1.5">
                  {publishStatus?.data?.status === "PUBLISH_COMPLETE" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : publishStatus?.data?.status === "FAILED" ? <AlertCircle className="h-4 w-4 text-red-400" /> : <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
                  <span className="text-xs font-medium text-foreground">{publishStatus?.data?.status || "Unknown"}</span>
                </div>
                <pre className="text-[10px] text-muted-foreground overflow-auto max-h-24">{JSON.stringify(publishStatus, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== NEW FEATURE 3: Performance Leaderboard ===== */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                Post Performance Tracker
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px]">LIVE</Badge>
              </h4>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={syncEngagement}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
            {scheduledPosts.filter(p => p.status === "published" && p.engagement_data).length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(() => {
                    const published = scheduledPosts.filter(p => p.engagement_data);
                    const totalViews = published.reduce((s, p) => s + ((p.engagement_data as any)?.views || 0), 0);
                    const totalLikes = published.reduce((s, p) => s + ((p.engagement_data as any)?.likes || 0), 0);
                    const totalComments = published.reduce((s, p) => s + ((p.engagement_data as any)?.comments || 0), 0);
                    const totalShares = published.reduce((s, p) => s + ((p.engagement_data as any)?.shares || 0), 0);
                    return [
                      { label: "Views", value: totalViews, icon: Eye, color: "text-cyan-400" },
                      { label: "Likes", value: totalLikes, icon: Heart, color: "text-red-400" },
                      { label: "Comments", value: totalComments, icon: MessageSquare, color: "text-amber-400" },
                      { label: "Shares", value: totalShares, icon: Share2, color: "text-green-400" },
                    ].map(m => (
                      <div key={m.label} className="bg-white/[0.04] rounded-lg p-2">
                        <m.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${m.color}`} />
                        <p className="text-sm font-bold text-foreground">{m.value.toLocaleString()}</p>
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      </div>
                    ));
                  })()}
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1.5">
                    {scheduledPosts
                      .filter(p => p.engagement_data)
                      .sort((a, b) => ((b.engagement_data as any)?.views || 0) - ((a.engagement_data as any)?.views || 0))
                      .slice(0, 10)
                      .map((p, i) => {
                        const eng = p.engagement_data as any;
                        return (
                          <div key={p.id} className="bg-white/[0.02] rounded-lg p-2.5 flex items-center gap-3">
                            <span className="text-xs font-bold text-cyan-400 w-5">#{i + 1}</span>
                            {eng?.cover_url && <img src={eng.cover_url} className="h-10 w-10 rounded object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground line-clamp-1">{p.caption || "Untitled"}</p>
                              <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span>{(eng?.views || 0).toLocaleString()} views</span>
                                <span>{(eng?.likes || 0).toLocaleString()} likes</span>
                                <span className="text-green-400 font-medium">{eng?.engagement_rate || 0}% eng</span>
                              </div>
                            </div>
                            {eng?.share_url && (
                              <a href={eng.share_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Click "Sync Engagement" to pull performance data from TikTok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playlist Manager */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                  <ListVideo className="h-3.5 w-3.5 text-white" />
                </div>
                Playlist Manager
              </h4>
              <Button size="sm" variant="ghost" onClick={fetchPlaylists} disabled={loading || !selectedAccount} className="gap-1 text-xs h-7">
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />Refresh
              </Button>
            </div>
            <div className="flex gap-2">
              <Input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name..." className="text-sm flex-1 bg-muted/20 border-border/40" onKeyDown={e => e.key === "Enter" && createPlaylist()} />
              <Button size="sm" onClick={createPlaylist} disabled={loading || !newPlaylistName} className="bg-violet-500 hover:bg-violet-600 text-white gap-1">
                <FolderOpen className="h-3.5 w-3.5" />Create
              </Button>
            </div>
            {playlists.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {playlists.map((p: any, i: number) => (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-3 flex items-center gap-3 border border-white/[0.04] hover:border-violet-500/30 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <ListVideo className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.playlist_name || p.name || `Playlist ${i + 1}`}</p>
                      <p className="text-[10px] text-muted-foreground">{p.video_count || 0} videos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <ListVideo className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No playlists yet — create one above</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Queue */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
          <CardContent className="p-5 space-y-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-white" />
              </div>
              Post Queue ({scheduledPosts.length})
            </h4>
            {scheduledPosts.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {scheduledPosts.map(p => {
                    const meta = p.metadata || {};
                    return (
                      <div key={p.id} className="bg-white/[0.02] rounded-lg p-3 flex items-center gap-3 border border-white/[0.04] hover:border-amber-500/30 transition-colors">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${p.status === "published" ? "bg-green-500/10" : p.status === "scheduled" ? "bg-amber-500/10" : p.status === "publishing" ? "bg-blue-500/10" : p.status === "failed" ? "bg-red-500/10" : "bg-muted/30"}`}>
                          {p.status === "published" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : p.status === "scheduled" ? <Clock className="h-4 w-4 text-amber-400" /> : p.status === "publishing" ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> : p.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-400" /> : <FolderOpen className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge variant="outline" className={`text-[9px] ${p.status === "published" ? "border-green-500/30 text-green-400" : p.status === "scheduled" ? "border-amber-500/30 text-amber-400" : p.status === "failed" ? "border-red-500/30 text-red-400" : "border-border text-muted-foreground"}`}>
                              {p.status}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize">
                              {meta.content_type || p.post_type || "video"}
                            </Badge>
                            {p.engagement_data && (
                              <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400">
                                {((p.engagement_data as any)?.views || 0).toLocaleString()} views
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No schedule"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {p.status !== "published" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-green-500/10" onClick={() => publishPost(p)} title="Publish now">
                              <Play className="h-3.5 w-3.5 text-green-400" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-500/10" onClick={() => deletePost(p.id)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-medium">No posts yet</p>
                <p className="text-[10px] mt-1 opacity-60">Create your first post above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== COMMENTS ===== */}
      <TabsContent value="comments" className="space-y-4 mt-4">
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
                    <div key={c.id} className="bg-white/[0.03] rounded-lg p-2.5">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-purple-400" />User Research</h4>
            <div className="flex gap-2">
              <Input value={researchUsername} onChange={e => setResearchUsername(e.target.value)} placeholder="TikTok username" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchUser()} />
              <Button size="sm" onClick={researchUser} disabled={loading || !researchUsername}><Search className="h-3.5 w-3.5 mr-1" />Lookup</Button>
            </div>
            {researchUserResult && (
              <Card className="bg-white/[0.03] border-cyan-500/20 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {researchUserResult.avatar_url && <img src={researchUserResult.avatar_url} className="h-10 w-10 rounded-full" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{researchUserResult.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">{researchUserResult.bio_description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-white/[0.04] rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.follower_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Followers</p></div>
                    <div className="bg-white/[0.04] rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.following_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Following</p></div>
                    <div className="bg-white/[0.04] rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.likes_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Likes</p></div>
                    <div className="bg-white/[0.04] rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.video_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Videos</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Video Research */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
                    <div key={i} className="bg-white/[0.03] rounded p-2.5">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Hash className="h-4 w-4 text-rose-400" />Hashtag Research</h4>
            <div className="flex gap-2">
              <Input value={researchHashtags} onChange={e => setResearchHashtags(e.target.value)} placeholder="Hashtags (comma separated, no #)" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchHashtagSearch()} />
              <Button size="sm" onClick={researchHashtagSearch} disabled={loading || !researchHashtags}><Hash className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            </div>
            {researchHashtagResults.length > 0 && (
              <div className="space-y-1.5">
                {researchHashtagResults.map((h: any, i: number) => (
                  <div key={i} className="bg-white/[0.03] rounded p-3 flex items-center justify-between">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
                    <div key={i} className="bg-white/[0.03] rounded p-2">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" />AI Caption Generator</h4>
            <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Topic or theme for TikTok caption..." className="text-sm" />
            <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic}><Wand2 className="h-3.5 w-3.5 mr-1" />Generate TikTok Caption</Button>
            {aiCaptionResult && (
              <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                <p className="text-sm text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" />Content Analyzer</h4>
            <Textarea value={aiAnalyzeCaption} onChange={e => setAiAnalyzeCaption(e.target.value)} placeholder="Paste your TikTok caption or script to analyze..." rows={3} className="text-sm" />
            <Button size="sm" onClick={analyzeContent} disabled={loading || !aiAnalyzeCaption}><BarChart3 className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            {aiAnalyzeResult && (
              <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                <p className="text-sm text-foreground whitespace-pre-wrap">{aiAnalyzeResult}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== ANALYTICS ===== */}
      <TabsContent value="analytics" className="space-y-4 mt-4">
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" />Video Performance</h4>
            <Button size="sm" onClick={() => fetchVideos()} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Analytics</Button>
            {videos.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.view_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Views</p></div>
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.like_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Likes</p></div>
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.comment_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Comments</p></div>
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{videos.reduce((sum, v) => sum + (v.share_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Shares</p></div>
                </div>
                <h5 className="text-xs font-semibold text-foreground mt-3">Top Performing Videos</h5>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1.5">
                    {[...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10).map((v, i) => (
                      <div key={v.id} className="bg-white/[0.03] rounded p-2 flex items-center gap-3">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" />Creator Info & Posting Rules</h4>
            <Button size="sm" onClick={fetchCreatorInfo} disabled={loading || !selectedAccount}><Star className="h-3.5 w-3.5 mr-1" />Fetch Creator Info</Button>
            {creatorInfo && <pre className="text-[10px] bg-white/[0.04] rounded p-3 overflow-auto max-h-[300px] text-foreground">{JSON.stringify(creatorInfo, null, 2)}</pre>}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== AUTOMATION ===== */}
      <TabsContent value="automation" className="space-y-4 mt-4">
        {/* Token Management */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
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
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-green-400" />Webhook Status</h4>
            <p className="text-[10px] text-muted-foreground">Your TikTok webhook endpoint is active and listening for events.</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">Active</span>
            </div>
            <div className="bg-white/[0.03] rounded p-2">
              <p className="text-[10px] text-muted-foreground">Callback URL:</p>
              <p className="text-[10px] text-foreground font-mono break-all">https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/tiktok-webhook</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Events: authorize, deauthorize, video.publish</p>
          </CardContent>
        </Card>

        {/* Share Kit */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Share2 className="h-4 w-4 text-cyan-400" />Share Kit</h4>
            <p className="text-[10px] text-muted-foreground">Share content directly to TikTok from your platform using the Share Kit API.</p>
            <Badge variant="outline" className="text-[10px]">Integrated via Content Publishing API</Badge>
          </CardContent>
        </Card>
        {/* AI Caption Generator */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" />AI Caption Generator</h4>
            <p className="text-[10px] text-muted-foreground">Quick-generate concise captions with keywords & hashtags</p>
            <div className="flex gap-2">
              <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Post topic or keywords..." className="text-sm flex-1 bg-muted/20 border-border/40" />
              <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic} className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Generate
              </Button>
            </div>
            {aiCaptionResult && (
              <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                <p className="text-sm text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-cyan-400" onClick={() => { setNewPostCaption(aiCaptionResult); toast.success("Caption applied to post"); }}><CheckCircle2 className="h-3 w-3 mr-1" />Use in Post</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ===== SCHEDULE SUBTAB ===== */}
      <TabsContent value="schedule" className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              Schedule Manager
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time synced · AI-managed · up to 50 scheduled posts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={loadScheduledPosts}>
              <RefreshCw className="h-3 w-3" /> Sync
            </Button>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
              {scheduledPosts.filter(p => p.status === "scheduled").length}/50 Scheduled
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: "Scheduled", value: scheduledPosts.filter(p => p.status === "scheduled").length, color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
            { label: "Publishing", value: scheduledPosts.filter(p => p.status === "publishing").length, color: "text-blue-400", bg: "bg-blue-500/10", icon: Loader2 },
            { label: "Published", value: scheduledPosts.filter(p => p.status === "published").length, color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
            { label: "Drafts", value: scheduledPosts.filter(p => p.status === "draft").length, color: "text-violet-400", bg: "bg-violet-500/10", icon: FolderOpen },
            { label: "Failed", value: scheduledPosts.filter(p => p.status === "failed" || p.error_message).length, color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
          ].map(s => (
            <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm cursor-pointer hover:border-amber-500/20 transition-colors" onClick={() => setSchedFilterStatus(s.label.toLowerCase())}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Best Time to Post Suggestion */}
        <Card className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Best Time to Post</p>
              <p className="text-[10px] text-muted-foreground">Based on TikTok engagement patterns: <span className="text-amber-400 font-medium">Tue/Thu 7-9 PM</span> and <span className="text-amber-400 font-medium">Sat 11 AM-1 PM</span> get the highest engagement</p>
            </div>
            <Button size="sm" variant="outline" className="text-[10px] h-7 flex-shrink-0" onClick={() => {
              const next = new Date();
              const day = next.getDay();
              // Find next Tue/Thu
              const daysUntilTue = (2 - day + 7) % 7 || 7;
              const daysUntilThu = (4 - day + 7) % 7 || 7;
              const targetDay = daysUntilTue <= daysUntilThu ? daysUntilTue : daysUntilThu;
              next.setDate(next.getDate() + targetDay);
              next.setHours(19, 0, 0, 0);
              setNewPostScheduledAt(next.toISOString().slice(0, 16));
              toast.success("Optimal time set!");
            }}>
              <Calendar className="h-3 w-3 mr-1" /> Use Optimal
            </Button>
          </CardContent>
        </Card>

        {/* Batch Create */}
        <Card className="bg-white/[0.03] border-amber-500/20 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-400" />
                Quick Schedule Post
              </h4>
              <div className="flex gap-1.5">
                {(["video", "photo", "carousel"] as const).map(ct => (
                  <Button key={ct} size="sm" variant={schedContentType === ct ? "default" : "outline"}
                    onClick={() => setSchedContentType(ct)}
                    className={`text-xs h-7 capitalize ${schedContentType === ct ? "bg-amber-500 hover:bg-amber-600" : ""}`}>
                    {ct === "video" ? <FileVideo className="h-3 w-3 mr-1" /> : ct === "photo" ? <FileImage className="h-3 w-3 mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
                    {ct}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Caption / Title</label>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-amber-400 hover:text-amber-300" onClick={generateScheduleCaption} disabled={schedAiGenerating}>
                      {schedAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} placeholder="Write an engaging caption..." rows={3} className="text-sm bg-muted/20 border-border/40" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hashtags</label>
                  <Input value={schedHashtags} onChange={e => setSchedHashtags(e.target.value)} placeholder="trending, fyp, viral..." className="text-sm bg-muted/20 border-border/40" />
                </div>
                <input ref={fileInputRef} type="file" multiple accept={schedContentType === "video" ? "video/*" : "image/*,video/*"} className="hidden" onChange={e => handleFileUpload(e.target.files)} />
                <div
                  className="border-2 border-dashed border-white/[0.08] rounded-xl p-4 text-center cursor-pointer hover:border-amber-500/30 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                >
                  {fileUploading ? <Loader2 className="h-6 w-6 text-amber-400 animate-spin mx-auto" /> : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-amber-400" />
                      <p className="text-xs text-foreground">Drop files or click to browse</p>
                    </div>
                  )}
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {uploadedFiles.map((f, i) => {
                      const count = uploadedFiles.length;
                      const size = count <= 1 ? 'h-48 w-48' : count <= 3 ? 'h-32 w-32' : count <= 6 ? 'h-24 w-24' : 'h-16 w-16';
                      return (
                        <div key={i} className="relative group">
                          {isVideoMedia(f.file) ? (
                            <video
                              src={f.preview}
                              className={`${size} object-cover rounded-lg border border-white/[0.06]`}
                              autoPlay loop muted playsInline preload="auto"
                              ref={el => { if (el) el.play().catch(() => {}); }}
                            />
                          ) : (
                            <img src={f.preview} className={`${size} object-cover rounded-lg border border-white/[0.06]`} alt="" />
                          )}
                          <button onClick={() => removeUploadedFile(i)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Input value={newPostMediaUrl} onChange={e => setNewPostMediaUrl(e.target.value)} placeholder="Or paste media URL..." className="text-sm bg-muted/20 border-border/40" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Schedule Date & Time</label>
                  <Input type="datetime-local" value={newPostScheduledAt} onChange={e => setNewPostScheduledAt(e.target.value)} className="text-sm bg-muted/20 border-border/40" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Privacy Level</label>
                  <select value={schedPrivacy} onChange={e => setSchedPrivacy(e.target.value)} className="w-full bg-white/[0.06] text-foreground border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="" disabled>Select privacy level</option>
                    <option value="PUBLIC_TO_EVERYONE">🌍 Public</option>
                    <option value="MUTUAL_FOLLOW_FRIENDS">🤝 Friends</option>
                    <option value="FOLLOWER_OF_CREATOR">👥 Followers Only</option>
                    <option value="SELF_ONLY">🔐 Private</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
                  <Input value={schedLocation} onChange={e => setSchedLocation(e.target.value)} placeholder="City, Country..." className="text-sm bg-muted/20 border-border/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {schedContentType === "video" && (
                    <>
                      <div className="flex items-center gap-2"><Switch checked={schedDisableDuet} onCheckedChange={setSchedDisableDuet} /><span className="text-xs text-muted-foreground">Disable Duet</span></div>
                      <div className="flex items-center gap-2"><Switch checked={schedDisableStitch} onCheckedChange={setSchedDisableStitch} /><span className="text-xs text-muted-foreground">Disable Stitch</span></div>
                    </>
                  )}
                  <div className="flex items-center gap-2"><Switch checked={schedDisableComment} onCheckedChange={setSchedDisableComment} /><span className="text-xs text-muted-foreground">Disable Comments</span></div>
                  <div className="flex items-center gap-2"><Switch checked={schedBrandContent} onCheckedChange={setSchedBrandContent} /><span className="text-xs text-muted-foreground">Brand Content</span></div>
                  <div className="flex items-center gap-2"><Switch checked={schedBrandOrganic} onCheckedChange={setSchedBrandOrganic} /><span className="text-xs text-muted-foreground">Your Brand Promotion</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
              <p className="text-[10px] text-muted-foreground">{ATTRIBUTION_LINE}</p>
              <p className="text-xs text-foreground mt-1">App Name: {TIKTOK_APP_NAME} • Organization Name: {TIKTOK_ORG_NAME}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={schedulePost} size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5" disabled={!schedPrivacy || scheduledPosts.filter(p => p.status === "scheduled").length >= 50}>
                {newPostScheduledAt ? <><Calendar className="h-3.5 w-3.5" />Schedule</> : <><FolderOpen className="h-3.5 w-3.5" />Save Draft</>}
              </Button>
              {newPostCaption && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!schedPrivacy) { toast.error("Select a privacy level before publishing"); return; }
                    publishPost({
                      caption: withAttribution(newPostCaption),
                      media_urls: uploadedFiles.filter(f => f.url).map(f => f.url!),
                      metadata: {
                        privacy_level: schedPrivacy,
                        content_type: schedContentType,
                        disable_duet: schedDisableDuet,
                        disable_comment: schedDisableComment,
                        disable_stitch: schedDisableStitch,
                        brand_content: schedBrandContent,
                        brand_organic: schedBrandOrganic,
                        location: schedLocation,
                      },
                      post_type: schedContentType,
                    });
                  }}
                  disabled={loading || !schedPrivacy}
                  className="gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" />Publish Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Post Queue — Full Schedule View */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Post Queue ({(schedFilterStatus === "all" ? scheduledPosts : scheduledPosts.filter(p => p.status === schedFilterStatus)).length})
              </h4>
              <div className="flex items-center gap-2">
                {/* Filter */}
                <select value={schedFilterStatus} onChange={e => setSchedFilterStatus(e.target.value)} className="bg-white/[0.06] text-foreground border border-white/[0.08] rounded-lg px-2 py-1 text-[10px] outline-none">
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Drafts</option>
                  <option value="published">Published</option>
                  <option value="publishing">Publishing</option>
                  <option value="failed">Failed</option>
                </select>
                {/* Bulk actions */}
                {schedBulkSelected.size > 0 && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-green-400 border-green-500/20" onClick={bulkPublishPosts}>
                      <Play className="h-3 w-3" /> Publish {schedBulkSelected.size}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-red-400 border-red-500/20" onClick={bulkDeletePosts}>
                      <Trash2 className="h-3 w-3" /> Delete {schedBulkSelected.size}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const filtered = schedFilterStatus === "all" ? scheduledPosts : scheduledPosts.filter(p => {
                if (schedFilterStatus === "failed") return p.status === "failed" || p.error_message;
                return p.status === schedFilterStatus;
              });
              return filtered.length > 0 ? (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {filtered.map(p => {
                      const meta = p.metadata || {};
                      const isEditing = editingPostId === p.id;
                      const isOverdue = p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) < new Date();
                      return (
                        <div key={p.id} className={`bg-white/[0.02] rounded-lg p-3 border transition-colors ${isOverdue ? "border-red-500/30" : schedBulkSelected.has(p.id) ? "border-amber-500/40 bg-amber-500/5" : "border-white/[0.04] hover:border-amber-500/30"}`}>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={2} className="text-sm bg-muted/20 border-border/40" />
                              <div className="flex gap-2 items-center">
                                <Input type="datetime-local" value={editScheduledAt} onChange={e => setEditScheduledAt(e.target.value)} className="text-sm bg-muted/20 border-border/40 flex-1" />
                                <Button size="sm" onClick={saveEditPost} className="h-7 bg-green-500 hover:bg-green-600 text-white gap-1">
                                  <Save className="h-3 w-3" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingPostId(null)} className="h-7">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {/* Bulk checkbox */}
                              <input type="checkbox" checked={schedBulkSelected.has(p.id)} onChange={() => toggleBulkSelect(p.id)} className="h-3.5 w-3.5 rounded accent-amber-500 cursor-pointer flex-shrink-0" />
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${p.status === "published" ? "bg-green-500/10" : p.status === "scheduled" ? (isOverdue ? "bg-red-500/10" : "bg-amber-500/10") : p.status === "publishing" ? "bg-blue-500/10" : p.status === "failed" ? "bg-red-500/10" : "bg-muted/30"}`}>
                                {p.status === "published" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : p.status === "scheduled" ? (isOverdue ? <AlertCircle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-amber-400" />) : p.status === "publishing" ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> : p.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-400" /> : <FolderOpen className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <Badge variant="outline" className={`text-[9px] ${p.status === "published" ? "border-green-500/30 text-green-400" : p.status === "scheduled" ? (isOverdue ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400") : p.status === "failed" ? "border-red-500/30 text-red-400" : "border-border text-muted-foreground"}`}>
                                    {isOverdue ? "overdue" : p.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize">{meta.content_type || p.post_type || "video"}</Badge>
                                  {p.error_message && <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 line-clamp-1">{p.error_message}</Badge>}
                                  <span className="text-[10px] text-muted-foreground">
                                    {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No schedule"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {p.status !== "published" && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-amber-500/10" onClick={() => startEditPost(p)} title="Edit">
                                    <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-violet-500/10" onClick={() => duplicatePost(p)} title="Duplicate">
                                  <Copy className="h-3.5 w-3.5 text-violet-400" />
                                </Button>
                                {p.status !== "published" && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-green-500/10" onClick={() => publishPost(p)} title="Publish now">
                                    <Play className="h-3.5 w-3.5 text-green-400" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-500/10" onClick={() => deletePost(p.id)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-medium">{schedFilterStatus === "all" ? "No posts yet" : `No ${schedFilterStatus} posts`}</p>
                  <p className="text-[10px] mt-1 opacity-60">{schedFilterStatus !== "all" && <button className="text-amber-400 underline" onClick={() => setSchedFilterStatus("all")}>Show all</button>}</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Smart Auto-Publisher Dashboard */}
        <Card className="bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border-emerald-500/15 backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-emerald-400" />
                </div>
                Smart Auto-Publisher
              </h4>
              <Switch
                checked={scheduledPosts.filter(p => p.status === "scheduled" && p.scheduled_at).length > 0}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    // Trigger auto-publish for all overdue scheduled posts
                    const overdue = scheduledPosts.filter(p => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) <= new Date());
                    if (overdue.length > 0) {
                      for (const p of overdue) {
                        await publishPost(p);
                      }
                      toast.success(`Auto-published ${overdue.length} overdue post(s)`);
                    } else {
                      toast.info("No overdue posts to auto-publish. Posts will publish at their scheduled time.");
                    }
                  }
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Automatically publishes scheduled posts when their time arrives. Monitors queue and retries failed posts.</p>
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const now = new Date();
                const next24h = scheduledPosts.filter(p => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) > now && new Date(p.scheduled_at) <= new Date(now.getTime() + 86400000));
                const overdue = scheduledPosts.filter(p => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) <= now);
                const failed = scheduledPosts.filter(p => p.status === "failed");
                return (
                  <>
                    <div className="bg-white/[0.04] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">{next24h.length}</p>
                      <p className="text-[10px] text-muted-foreground">Next 24h</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-amber-400">{overdue.length}</p>
                      <p className="text-[10px] text-muted-foreground">Overdue</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-red-400">{failed.length}</p>
                      <p className="text-[10px] text-muted-foreground">Failed</p>
                    </div>
                  </>
                );
              })()}
            </div>
            {scheduledPosts.filter(p => p.status === "failed").length > 0 && (
              <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={async () => {
                const failed = scheduledPosts.filter(p => p.status === "failed");
                for (const p of failed) { await publishPost(p); }
                toast.success(`Retried ${failed.length} failed post(s)`);
              }}>
                <RotateCcw className="h-3.5 w-3.5" /> Retry All Failed ({scheduledPosts.filter(p => p.status === "failed").length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Content Calendar Heatmap */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardContent className="p-5 space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-400" />
              Content Calendar Heatmap
            </h4>
            <p className="text-[10px] text-muted-foreground">Visualize your posting density across the next 4 weeks</p>
            <div className="space-y-1">
              {(() => {
                const now = new Date();
                const weeks: { label: string; days: { date: Date; count: number; statuses: string[] }[] }[] = [];
                for (let w = 0; w < 4; w++) {
                  const days: { date: Date; count: number; statuses: string[] }[] = [];
                  for (let d = 0; d < 7; d++) {
                    const date = new Date(now);
                    date.setDate(now.getDate() + w * 7 + d - now.getDay());
                    const dayStr = date.toISOString().slice(0, 10);
                    const postsOnDay = scheduledPosts.filter(p => p.scheduled_at && p.scheduled_at.slice(0, 10) === dayStr);
                    days.push({ date, count: postsOnDay.length, statuses: postsOnDay.map(p => p.status) });
                  }
                  const weekStart = days[0].date;
                  weeks.push({ label: `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })}`, days });
                }
                const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                return (
                  <div>
                    <div className="flex gap-1 mb-1 ml-14">
                      {dayLabels.map(d => (
                        <div key={d} className="w-8 text-center text-[9px] text-muted-foreground">{d}</div>
                      ))}
                    </div>
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-muted-foreground w-12 text-right pr-1">{week.label}</span>
                        {week.days.map((day, di) => {
                          const isToday = day.date.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
                          const isPast = day.date < now && !isToday;
                          const hasPublished = day.statuses.includes("published");
                          const hasFailed = day.statuses.includes("failed");
                          const bg = day.count === 0
                            ? (isPast ? "bg-white/[0.02]" : "bg-white/[0.04]")
                            : hasFailed
                              ? "bg-red-500/30"
                              : hasPublished
                                ? "bg-green-500/30"
                                : day.count >= 3
                                  ? "bg-amber-500/50"
                                  : day.count >= 2
                                    ? "bg-amber-500/30"
                                    : "bg-amber-500/15";
                          return (
                            <div
                              key={di}
                              className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-all cursor-default ${bg} ${isToday ? "ring-1 ring-amber-400" : ""}`}
                              title={`${day.date.toLocaleDateString()}: ${day.count} post(s)`}
                            >
                              {day.count > 0 ? <span className="text-foreground">{day.count}</span> : <span className="text-muted-foreground/30">{day.date.getDate()}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 mt-2 justify-end">
                      <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-sm bg-white/[0.04]" /><span className="text-[9px] text-muted-foreground">None</span></div>
                      <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-sm bg-amber-500/15" /><span className="text-[9px] text-muted-foreground">1</span></div>
                      <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-sm bg-amber-500/30" /><span className="text-[9px] text-muted-foreground">2</span></div>
                      <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-sm bg-amber-500/50" /><span className="text-[9px] text-muted-foreground">3+</span></div>
                      <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-sm bg-green-500/30" /><span className="text-[9px] text-muted-foreground">Published</span></div>
                      <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-sm bg-red-500/30" /><span className="text-[9px] text-muted-foreground">Failed</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Mini View */}
        {scheduledPosts.filter(p => p.scheduled_at).length > 0 && (
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
            <CardContent className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-400" />
                Upcoming Timeline
              </h4>
              <div className="space-y-1.5">
                {scheduledPosts
                  .filter(p => p.scheduled_at && (p.status === "scheduled" || p.status === "draft"))
                  .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .slice(0, 10)
                  .map(p => {
                    const dt = new Date(p.scheduled_at);
                    const isOverdue = dt < new Date();
                    return (
                      <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                        <div className={`text-center w-12 flex-shrink-0 ${isOverdue ? "text-red-400" : "text-amber-400"}`}>
                          <p className="text-[10px] font-medium uppercase">{dt.toLocaleDateString([], { weekday: "short" })}</p>
                          <p className="text-sm font-bold leading-none">{dt.getDate()}</p>
                        </div>
                        <div className={`w-0.5 h-8 rounded-full ${isOverdue ? "bg-red-500/40" : "bg-amber-500/40"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                          <p className="text-[10px] text-muted-foreground">{dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {(p.metadata as any)?.content_type || p.post_type}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${isOverdue ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400"}`}>
                          {isOverdue ? "overdue" : p.status}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
    </div>
  );
};

export default TKAutomationSuite;

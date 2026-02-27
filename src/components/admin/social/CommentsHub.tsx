import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare, Send, Trash2, RefreshCw, Bot, Sparkles, Brain,
  Loader2, Instagram, Music2, Heart, Clock, CheckCheck,
  Compass, Image, Eye, ArrowRight, Search, X, Share2,
  Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Check, Square, CheckSquare,
  Trophy, Shield, BarChart3, Download, Filter, TrendingUp, Users, Flame,
  UserPlus, Zap, Key, Link2, AlertTriangle, CheckCircle2,
  Play, Pause, HeartHandshake, MessageCircle, Reply, Star, Pin, BellRing,
  Target, Megaphone, UserCheck, Mail, HelpCircle, Magnet,
  User, Crown, Settings, ChevronDown, Calendar, ThumbsDown, AtSign, Hash,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreditCostBadge from "../CreditCostBadge";

interface CommentsHubProps {
  accountId: string;
  connections: any[];
  callApi: (funcName: string, body: any, overrideAccountId?: string) => Promise<any>;
  apiLoading: boolean;
  onNavigateToSession?: () => void;
  igSessionId?: string;
  igSessionStatus?: "unknown" | "valid" | "expired";
}

interface CommentItem {
  id: string;
  text: string;
  username: string;
  timestamp?: string;
  like_count?: number;
  replies?: any[];
  media_id?: string;
  platform?: string;
}

interface MediaPost {
  id: string;
  caption?: string;
  media_url?: string;
  media_type?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  platform: string;
  username?: string;
  shares_count?: number;
}

interface DiscoverPost {
  id: string;
  shortcode?: string;
  caption?: string;
  media_url?: string;
  media_type?: string;
  username?: string;
  user_id?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  selected: boolean;
  shares_count?: number;
}

// Extract shortcode from Instagram permalink URL
const extractShortcode = (permalink?: string): string => {
  if (!permalink) return "";
  const match = permalink.match(/\/p\/([^/?]+)/);
  return match ? match[1] : "";
};

const CommentsHub = ({ accountId, connections, callApi, apiLoading, onNavigateToSession, igSessionId: parentSessionId, igSessionStatus: parentSessionStatus }: CommentsHubProps) => {
  const [activeTab, setActiveTab] = useState("my-posts");
  const [sessionRequiredDialog, setSessionRequiredDialog] = useState(false);

  const igConnected = connections.some((c: any) => c.platform === "instagram" && c.is_connected);
  const ttConnected = connections.some((c: any) => c.platform === "tiktok" && c.is_connected);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(igConnected ? "instagram" : ttConnected ? "tiktok" : "instagram");

  // My posts
  const [myPosts, setMyPosts] = useState<MediaPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [postsLoading, setPostsLoading] = useState(false);

  // Comments
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // AI bulk reply
  const [bulkAiReplies, setBulkAiReplies] = useState<any[]>([]);
  const [aiRedirectUrl, setAiRedirectUrl] = useState("");
  const [generatingReplies, setGeneratingReplies] = useState(false);

  // Discover feed
  const [discoverPosts, setDiscoverPosts] = useState<DiscoverPost[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Keyword search for discover
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DiscoverPost[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Mass comment
  const [massCommentMode, setMassCommentMode] = useState<"template" | "ai">("ai");
  const [massCommentTemplate, setMassCommentTemplate] = useState("");
  const [massCommenting, setMassCommenting] = useState(false);
  const [massProgress, setMassProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [massDelay, setMassDelay] = useState(2000);
  const cancelMassRef = useRef(false);

  // AI
  const [aiGenerating, setAiGenerating] = useState(false);
  const [singleAiComment, setSingleAiComment] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI Suite extras
  const [aiSentimentLoading, setAiSentimentLoading] = useState(false);
  const [aiSentimentResults, setAiSentimentResults] = useState<any>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // New features state
  const [spamFilterLoading, setSpamFilterLoading] = useState(false);
  const [spamResults, setSpamResults] = useState<any>(null);
  const [topFans, setTopFans] = useState<any[]>([]);
  const [topFansLoading, setTopFansLoading] = useState(false);
  const [engagementRate, setEngagementRate] = useState<any>(null);
  const [commentFilter, setCommentFilter] = useState<"all" | "positive" | "negative" | "questions">("all");
  const [filteredComments, setFilteredComments] = useState<CommentItem[]>([]);
  const [aiFilterLoading, setAiFilterLoading] = useState(false);

  // Discover hashtags
  const [discoverHashtags, setDiscoverHashtags] = useState<string[]>(["explore", "trending", "viral", "foryou", "fyp"]);
  const [activeDiscoverTag, setActiveDiscoverTag] = useState("explore");
  
  // Feed limit control
  const [feedLimit, setFeedLimit] = useState(25);
  
  // Outreach actions
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [massLikeMode, setMassLikeMode] = useState(false);
  const [massLiking, setMassLiking] = useState(false);
  const [massLikeProgress, setMassLikeProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [massFollowMode, setMassFollowMode] = useState(false);
  const [massFollowing, setMassFollowing] = useState(false);
  const [massFollowProgress, setMassFollowProgress] = useState<{ done: number; total: number; failed: number } | null>(null);

  // Post viewer dialog
  const [viewingPost, setViewingPost] = useState<(MediaPost | DiscoverPost) | null>(null);
  const [viewerComments, setViewerComments] = useState<CommentItem[]>([]);
  const [viewerCommentsLoading, setViewerCommentsLoading] = useState(false);
  const [viewerNewComment, setViewerNewComment] = useState("");

  // Session management
  const [sessionId, setSessionId] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [dsUserId, setDsUserId] = useState("");
  const [sessionSavedAt, setSessionSavedAt] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"unknown" | "valid" | "expired">("unknown");

  // === AI COMMENT AUTOMATION ENGINE ===
  const [autoReplyActive, setAutoReplyActive] = useState(false);
  const [autoLikeCommentsActive, setAutoLikeCommentsActive] = useState(false);
  const [autoLikeRepliesActive, setAutoLikeRepliesActive] = useState(false);
  const [autoPinTopComment, setAutoPinTopComment] = useState(false);
  const [autoThankNewFollower, setAutoThankNewFollower] = useState(false);
  const [autoHideNegative, setAutoHideNegative] = useState(false);
  const [autoDmCommenters, setAutoDmCommenters] = useState(false);
  const [autoFollowCommenters, setAutoFollowCommenters] = useState(false);
  const [autoCtaInject, setAutoCtaInject] = useState(false);
  const [autoBoostEngagement, setAutoBoostEngagement] = useState(false);
  const [autoQuestionResponder, setAutoQuestionResponder] = useState(false);
  const [autoLeadCapture, setAutoLeadCapture] = useState(false);
  const autoReplyRef = useRef(false);
  const autoLikeRef = useRef(false);
  const autoLikeRepliesRef = useRef(false);
  const autoDmRef = useRef(false);
  const autoFollowRef = useRef(false);
  const autoCtaRef = useRef(false);
  const autoBoostRef = useRef(false);
  const autoQuestionRef = useRef(false);
  const autoLeadRef = useRef(false);
  const [autoReplyStats, setAutoReplyStats] = useState({ replied: 0, liked: 0, likedReplies: 0, hidden: 0, pinned: 0, dmd: 0, followed: 0, ctas: 0, boosted: 0, questions: 0, leads: 0 });
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  // === PERSONA SYSTEM (same as DM conversations) ===
  const [personas, setPersonas] = useState<any[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [defaultPersonaType, setDefaultPersonaType] = useState<"male" | "female">("male");
  const [commentDetailId, setCommentDetailId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Load personas
  const loadPersonas = useCallback(async () => {
    const { data } = await supabase.from("persona_profiles").select("*").eq("account_id", accountId).order("created_at");
    setPersonas(data || []);
    const { data: acc } = await supabase.from("managed_accounts").select("active_persona_id, default_persona_type").eq("id", accountId).single();
    setActivePersonaId((acc as any)?.active_persona_id || null);
    setDefaultPersonaType((acc as any)?.default_persona_type || "male");
  }, [accountId]);

  const switchPersona = useCallback(async (personaId: string | null) => {
    await supabase.from("managed_accounts").update({ active_persona_id: personaId } as any).eq("id", accountId);
    setActivePersonaId(personaId);
    toast.success(personaId ? "Persona switched — AI comments will use this persona" : "Switched to default persona");
  }, [accountId]);

  const switchDefaultType = useCallback(async (type: "male" | "female") => {
    await supabase.from("managed_accounts").update({ active_persona_id: null, default_persona_type: type } as any).eq("id", accountId);
    setActivePersonaId(null);
    setDefaultPersonaType(type);
    toast.success(`Switched to ${type} default persona`);
  }, [accountId]);

  // Sync automation state to server for cron-based execution
  const syncAutomationToServer = useCallback(async (postId: string) => {
    if (!postId) return;
    try {
      await supabase.from("comment_automation_state" as any).upsert({
        account_id: accountId,
        post_id: postId,
        platform: selectedPlatform,
        auto_reply: autoReplyActive,
        auto_like_comments: autoLikeCommentsActive,
        auto_like_replies: autoLikeRepliesActive,
        auto_hide_negative: autoHideNegative,
        auto_pin_best: autoPinTopComment,
        auto_thank_fans: autoThankNewFollower,
        auto_dm_buyers: autoDmCommenters,
        auto_follow_fans: autoFollowCommenters,
        auto_cta_inject: autoCtaInject,
        auto_boost: autoBoostEngagement,
        auto_question_responder: autoQuestionResponder,
        auto_lead_capture: autoLeadCapture,
        redirect_url: aiRedirectUrl || null,
      } as any, { onConflict: "account_id,post_id,platform" });
    } catch { /* ignore sync errors */ }
  }, [accountId, selectedPlatform, autoReplyActive, autoLikeCommentsActive, autoLikeRepliesActive, autoHideNegative, autoPinTopComment, autoThankNewFollower, autoDmCommenters, autoFollowCommenters, autoCtaInject, autoBoostEngagement, autoQuestionResponder, autoLeadCapture, aiRedirectUrl]);

  // Sync to server whenever automation state changes
  useEffect(() => {
    if (selectedPostId) syncAutomationToServer(selectedPostId);
  }, [autoReplyActive, autoLikeCommentsActive, autoLikeRepliesActive, autoHideNegative, autoPinTopComment, autoThankNewFollower, autoDmCommenters, autoFollowCommenters, autoCtaInject, autoBoostEngagement, autoQuestionResponder, autoLeadCapture, selectedPostId]);

  // Load existing session on mount
  useEffect(() => {
    if (accountId && selectedPlatform === "instagram") loadSessionData();
    if (accountId) loadPersonas();
  }, [accountId, selectedPlatform]);

  const loadSessionData = async () => {
    try {
      const { data } = await supabase
        .from("social_connections")
        .select("metadata, access_token")
        .eq("account_id", accountId)
        .eq("platform", "instagram")
        .eq("is_connected", true)
        .single();
      if (data?.metadata) {
        const meta = data.metadata as any;
        // Only use actual session cookies, NOT OAuth tokens
        const rawSession = meta.ig_session_id || "";
        const isOAuthToken = rawSession && (rawSession.startsWith("IGQV") || rawSession.startsWith("IGQ"));
        const sessionValue = isOAuthToken ? "" : rawSession;
        setSessionId(sessionValue);
        setCsrfToken(meta.ig_csrf_token || "");
        setDsUserId(meta.ig_ds_user_id || "");
        setSessionSavedAt(meta.ig_session_saved_at || null);
        setSessionStatus(sessionValue ? "valid" : "unknown");
      }
    } catch { /* no connection */ }
  };

  const saveSessionData = async () => {
    if (!sessionId.trim()) { toast.error("Session ID is required"); return; }
    setSessionLoading(true);
    try {
      // Get current metadata first to preserve other fields
      const { data: existing } = await supabase
        .from("social_connections")
        .select("metadata")
        .eq("account_id", accountId)
        .eq("platform", "instagram")
        .eq("is_connected", true)
        .single();
      
      const currentMeta = (existing?.metadata as any) || {};
      const updatedMeta = {
        ...currentMeta,
        ig_session_id: sessionId.trim(),
        ig_csrf_token: csrfToken.trim() || undefined,
        ig_ds_user_id: dsUserId.trim() || undefined,
        ig_session_saved_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("social_connections")
        .update({ metadata: updatedMeta })
        .eq("account_id", accountId)
        .eq("platform", "instagram")
        .eq("is_connected", true);

      if (error) throw error;
      setSessionSavedAt(updatedMeta.ig_session_saved_at);
      setSessionStatus("valid");
      toast.success("Session cookie saved! You can now comment on discovered posts.");
    } catch (e: any) { toast.error("Failed to save: " + e.message); }
    setSessionLoading(false);
  };

  const autoFetchSession = async () => {
    setSessionLoading(true);
    try {
      // Use the connected account's access token to fetch session info via private API
      const d = await callApi("instagram-api", { action: "get_session_info", params: {} });
      if (d?.data?.session_id) {
        setSessionId(d.data.session_id);
        if (d.data.csrf_token) setCsrfToken(d.data.csrf_token);
        if (d.data.ds_user_id) setDsUserId(d.data.ds_user_id);
        toast.success("Session fetched from connected account! Click Save to apply.");
      } else {
        toast.error("Could not auto-fetch session. Please enter manually.");
      }
    } catch {
      toast.error("Auto-fetch not available. Please enter session cookie manually from your browser.");
    }
    setSessionLoading(false);
  };

  const testSession = async () => {
    setSessionLoading(true);
    try {
      // Quick test: try to fetch explore feed which requires session
      const d = await callApi("instagram-api", { action: "explore_feed", params: { limit: 1 } });
      const posts = d?.data?.posts || d?.posts || [];
      if (posts.length > 0) {
        setSessionStatus("valid");
        toast.success("Session is valid! ✅");
      } else {
        setSessionStatus("expired");
        toast.error("Session may be expired. Update with a fresh cookie.");
      }
    } catch {
      setSessionStatus("expired");
      toast.error("Session expired or invalid. Please update.");
    }
    setSessionLoading(false);
  };

  useEffect(() => {
    if (accountId && (igConnected || ttConnected)) loadMyPosts();
  }, [accountId, selectedPlatform]);

  const loadMyPosts = async () => {
    setPostsLoading(true);
    try {
      if (selectedPlatform === "instagram" && igConnected) {
        const d = await callApi("instagram-api", { action: "get_media", params: { limit: 50 } });
        if (d?.data) {
          setMyPosts(d.data.map((m: any) => ({
            id: m.id, caption: m.caption, media_url: m.media_url || m.thumbnail_url,
            media_type: m.media_type, timestamp: m.timestamp,
            like_count: m.like_count, comments_count: m.comments_count,
            permalink: m.permalink, platform: "instagram", username: "you",
          })));
        }
      } else if (selectedPlatform === "tiktok" && ttConnected) {
        const d = await callApi("tiktok-api", { action: "get_videos", params: { limit: 50 } });
        if (d?.data?.videos) {
          setMyPosts(d.data.videos.map((v: any) => ({
            id: v.id, caption: v.title || v.description, media_url: v.cover_image_url,
            media_type: "VIDEO", timestamp: v.create_time ? new Date(v.create_time * 1000).toISOString() : undefined,
            like_count: v.like_count, comments_count: v.comment_count,
            permalink: v.share_url, platform: "tiktok", username: "you",
          })));
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setPostsLoading(false);
  };

  const loadComments = async (mediaId: string) => {
    setCommentsLoading(true);
    setSelectedPostId(mediaId);
    setBulkAiReplies([]);
    try {
      if (selectedPlatform === "instagram") {
        const d = await callApi("instagram-api", { action: "get_comments", params: { media_id: mediaId, limit: 100 } });
        if (d?.data) {
          setCommentsList(d.data.map((c: any) => ({
            id: c.id, text: c.text, username: c.username || c.from?.username || "user",
            timestamp: c.timestamp, like_count: c.like_count, replies: c.replies?.data,
            media_id: mediaId, platform: "instagram",
          })));
        }
      } else if (selectedPlatform === "tiktok") {
        const d = await callApi("tiktok-api", { action: "get_comments", params: { video_id: mediaId, limit: 100 } });
        if (d?.data?.comments) {
          setCommentsList(d.data.comments.map((c: any) => ({
            id: c.id, text: c.text, username: c.user?.unique_id || "user",
            timestamp: c.create_time ? new Date(c.create_time * 1000).toISOString() : undefined,
            like_count: c.digg_count, media_id: mediaId, platform: "tiktok",
          })));
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setCommentsLoading(false);
  };

  const replyToComment = async (commentId: string, commentText: string, author: string) => {
    if (!replyText.trim()) return;
    const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
    const params = selectedPlatform === "instagram"
      ? { comment_id: commentId, media_id: selectedPostId, message: replyText, comment_text: commentText, comment_author: author }
      : { video_id: selectedPostId, comment_id: commentId, message: replyText, comment_text: commentText, comment_author: author };
    await callApi(funcName, { action: "reply_to_comment", params });
    setReplyText("");
    setReplyingTo(null);
    toast.success("Reply sent");
  };

  const deleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      if (selectedPlatform === "instagram") {
        await callApi("instagram-api", { action: "delete_comment", params: { comment_id: commentId, media_id: selectedPostId } });
      } else {
        await callApi("tiktok-api", { action: "delete_comment", params: { comment_id: commentId, video_id: selectedPostId } });
      }
      setCommentsList(prev => prev.filter(c => c.id !== commentId));
      toast.success("Comment deleted");
    } catch { toast.error("Delete failed"); }
    setDeletingId(null);
  };

  const generateAiReplyForComment = async (comment: CommentItem) => {
    setAiGenerating(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "generate_comment_reply",
        params: { comment_text: comment.text, comment_author: comment.username, redirect_url: aiRedirectUrl },
      });
      if (d?.reply) {
        setReplyText(d.reply);
        setReplyingTo(comment.id);
        toast.success("AI reply generated");
      }
    } catch { toast.error("AI generation failed"); }
    setAiGenerating(false);
  };

  const bulkGenerateReplies = async () => {
    if (commentsList.length === 0) return;
    setGeneratingReplies(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "bulk_generate_replies",
        params: { comments: commentsList.slice(0, 30), redirect_url: aiRedirectUrl },
      });
      if (d?.replies) {
        setBulkAiReplies(d.replies);
        toast.success(`Generated ${d.replies.length} AI replies`);
      }
    } catch { toast.error("Bulk AI failed"); }
    setGeneratingReplies(false);
  };

  const sendBulkReply = async (reply: any) => {
    const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
    const params = selectedPlatform === "instagram"
      ? { comment_id: reply.comment_id, media_id: selectedPostId, message: reply.generated_reply, comment_text: reply.comment_text, comment_author: reply.username }
      : { video_id: selectedPostId, comment_id: reply.comment_id, message: reply.generated_reply };
    await callApi(funcName, { action: "reply_to_comment", params });
    setBulkAiReplies(prev => prev.filter(r => r.comment_id !== reply.comment_id));
    toast.success("Sent");
  };

  const sendAllBulkReplies = async () => {
    for (const reply of bulkAiReplies) {
      await sendBulkReply(reply);
      await new Promise(r => setTimeout(r, 1000));
    }
    toast.success("All AI replies sent");
  };

  // AI Suite: Sentiment analysis
  const runSentimentAnalysis = async () => {
    if (commentsList.length === 0) return;
    setAiSentimentLoading(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "analyze_sentiment",
        params: { comments: commentsList.slice(0, 50).map(c => ({ text: c.text, username: c.username })) },
      });
      if (d) setAiSentimentResults(d);
      toast.success("Sentiment analysis complete");
    } catch { toast.error("Sentiment analysis failed"); }
    setAiSentimentLoading(false);
  };

  // AI Suite: Summarize comments
  const summarizeComments = async () => {
    if (commentsList.length === 0) return;
    setAiSummaryLoading(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "summarize_comments",
        params: { comments: commentsList.slice(0, 50).map(c => ({ text: c.text, username: c.username })) },
      });
      if (d?.summary) setAiSummary(d.summary);
      toast.success("Summary generated");
    } catch { toast.error("Summary failed"); }
    setAiSummaryLoading(false);
  };

  // Session check helper - allows session cookie OR OAuth connection for Graph API features
  // Graph API covers: search users (business_discovery), explore (hashtag), user feed, own post comments
  // Private API ONLY (requires session cookie): like external posts, follow users, outreach actions, scrape followers
  const requireSession = (requirePrivateApi = false): boolean => {
    if (selectedPlatform !== "instagram") return true;
    const effectiveSessionId = parentSessionId || sessionId;
    const effectiveStatus = parentSessionStatus || sessionStatus;
    
    // Real session cookies work for everything
    const isOAuthToken = effectiveSessionId && (effectiveSessionId.startsWith("IGQV") || effectiveSessionId.startsWith("IGQ"));
    if (effectiveSessionId && !isOAuthToken && effectiveStatus !== "expired") return true;
    
    // OAuth connection works for Graph API-backed actions (search, explore via hashtags, user feed via business_discovery)
    if (!requirePrivateApi) {
      const igConnection = connections.find((c: any) => c.platform === "instagram" && c.is_connected);
      if (igConnection?.access_token) return true;
    }
    
    // No auth available - redirect to connect
    if (onNavigateToSession) {
      onNavigateToSession();
      const msg = requirePrivateApi 
        ? "Session cookie required for this action (like, follow, outreach actions). Paste your sessionid from DevTools."
        : "Instagram login or session cookie required. Login via Instagram or paste your sessionid.";
      toast.error(msg, { duration: 4000 });
    } else {
      setSessionRequiredDialog(true);
    }
    return false;
  };

  // ===== DISCOVER (For You / Explore — NOT own posts) =====
  const loadDiscoverFeed = async () => {
    if (!requireSession()) return;
    setDiscoverLoading(true);
    try {
      if (selectedPlatform === "instagram") {
        const discoverResults: DiscoverPost[] = [];
        
        // Strategy 1: Use the private explore_feed API (actual Instagram Explore page)
        try {
          const exploreData = await callApi("instagram-api", { action: "explore_feed", params: { limit: feedLimit } });
          const explorePosts = exploreData?.data?.posts || exploreData?.posts || [];
          for (const p of explorePosts) {
            if (!discoverResults.some(x => x.id === p.id)) {
              discoverResults.push({
                id: p.id, shortcode: p.shortcode || "", caption: p.caption, media_url: p.media_url || p.thumbnail_url,
                media_type: p.media_type, username: p.username || "creator",
                user_id: p.user_id || "",
                like_count: p.like_count, comments_count: p.comments_count,
                permalink: p.permalink, selected: false,
              });
            }
          }
        } catch (e) { console.log("Explore feed fallback:", e); }
        
        // Strategy 2: If explore didn't return enough, search users by category and get their feeds
        if (discoverResults.length < 10) {
          const categoryKeywords: Record<string, string> = {
            explore: "model", trending: "fitness", viral: "lifestyle",
            foryou: "creator", fyp: "beauty",
          };
          const keyword = categoryKeywords[activeDiscoverTag] || "model";
          
          try {
            const searchData = await callApi("instagram-api", { action: "search_users", params: { query: keyword, limit: 8 } });
            const users = searchData?.data?.users || searchData?.users || [];
            
            // Get feeds from top 3 non-private users
            const publicUsers = (Array.isArray(users) ? users : []).filter((u: any) => !u.is_private).slice(0, 3);
            
            for (const u of publicUsers) {
              try {
                const feedData = await callApi("instagram-api", { action: "get_user_feed", params: { user_id: u.id, limit: 8 } });
                const feedPosts = feedData?.data?.posts || feedData?.posts || [];
                for (const p of feedPosts) {
                  if (!discoverResults.some(x => x.id === p.id)) {
                    discoverResults.push({
                      id: p.id, shortcode: p.shortcode || "", caption: p.caption, media_url: p.media_url || p.thumbnail_url,
                      media_type: p.media_type, username: p.username || u.username || "creator",
                      user_id: p.user_id || String(u.id || ""),
                      like_count: p.like_count, comments_count: p.comments_count,
                      permalink: p.permalink, selected: false,
                    });
                  }
                }
              } catch { /* skip user */ }
            }
          } catch (e) { console.log("User feed fallback:", e); }
        }

        setDiscoverPosts(discoverResults);
        if (discoverResults.length > 0) toast.success(`Discovered ${discoverResults.length} posts`);
        else toast.info("No discover posts found. Make sure your IG session cookie is connected.");
      } else if (selectedPlatform === "tiktok") {
        try {
          const d = await callApi("tiktok-api", { action: "search_videos", params: { keyword: activeDiscoverTag, limit: 30 } });
          if (d?.data?.videos) {
            setDiscoverPosts(d.data.videos.map((v: any) => ({
              id: v.id, caption: v.title || v.description, media_url: v.cover_image_url,
              media_type: "VIDEO", username: v.author?.unique_id || v.author?.nickname || "creator",
              like_count: v.like_count, comments_count: v.comment_count,
              permalink: v.share_url, selected: false,
            })));
          }
        } catch { toast.error("Failed to load TikTok discover"); }
      }
    } catch (e: any) { toast.error(e.message); }
    setDiscoverLoading(false);
  };

  // New features: Spam filter
  const runSpamFilter = async () => {
    if (commentsList.length === 0) return;
    setSpamFilterLoading(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "detect_spam_comments",
        params: { comments: commentsList.slice(0, 50).map(c => ({ id: c.id, text: c.text, username: c.username })) },
      });
      if (d) {
        setSpamResults(d);
        toast.success(`Spam analysis: ${d.spam_count || 0} spam detected`);
      }
    } catch { toast.error("Spam filter failed"); }
    setSpamFilterLoading(false);
  };

  // New features: Top Fans
  const calculateTopFans = () => {
    const fanMap: Record<string, { count: number; likes: number }> = {};
    for (const c of commentsList) {
      if (!fanMap[c.username]) fanMap[c.username] = { count: 0, likes: 0 };
      fanMap[c.username].count++;
      fanMap[c.username].likes += c.like_count || 0;
    }
    const sorted = Object.entries(fanMap)
      .map(([username, data]) => ({ username, ...data }))
      .sort((a, b) => b.count - a.count);
    setTopFans(sorted.slice(0, 10));
  };

  // New features: Engagement rate
  const calculateEngagement = () => {
    const post = myPosts.find(p => p.id === selectedPostId);
    if (!post) return;
    const totalEngagement = (post.like_count || 0) + (post.comments_count || 0);
    setEngagementRate({
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      total: totalEngagement,
      avgLikesPerComment: commentsList.length > 0 ? Math.round(commentsList.reduce((a, c) => a + (c.like_count || 0), 0) / commentsList.length) : 0,
    });
  };

  // New features: AI Comment Filter
  const filterCommentsByType = async (type: "all" | "positive" | "negative" | "questions") => {
    setCommentFilter(type);
    if (type === "all") { setFilteredComments([]); return; }
    setAiFilterLoading(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "filter_comments",
        params: { comments: commentsList.slice(0, 50).map(c => ({ id: c.id, text: c.text, username: c.username })), filter_type: type },
      });
      if (d?.filtered_ids) {
        setFilteredComments(commentsList.filter(c => d.filtered_ids.includes(c.id)));
      }
    } catch { setFilteredComments([]); }
    setAiFilterLoading(false);
  };

  // Export comments
  const exportComments = () => {
    const csv = ["Username,Comment,Likes,Date"]
      .concat(commentsList.map(c => `"@${c.username}","${(c.text || '').replace(/"/g, '""')}",${c.like_count || 0},${c.timestamp || ''}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comments_${selectedPostId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comments exported");
  };

  // Keyword search for posts
  const searchPostsByKeyword = async () => {
    if (!discoverSearch.trim()) return;
    if (!requireSession()) return;
    setSearchLoading(true);
    try {
      if (selectedPlatform === "instagram") {
        const searchTerm = discoverSearch.replace("#", "").replace("@", "").trim();
        const results: DiscoverPost[] = [];
        
        // Search users by keyword, then get their feeds via private API
        try {
          const s = await callApi("instagram-api", { action: "search_users", params: { query: searchTerm, limit: 8 } });
          const users = s?.data?.users || s?.users || [];
          const publicUsers = (Array.isArray(users) ? users : []).filter((u: any) => !u.is_private).slice(0, 4);
          
          for (const u of publicUsers) {
            try {
              const feedData = await callApi("instagram-api", { action: "get_user_feed", params: { user_id: u.id, limit: 10 } });
              const feedPosts = feedData?.data?.posts || feedData?.posts || [];
              for (const p of feedPosts) {
                if (!results.some(x => x.id === p.id)) {
                  results.push({
                    id: p.id, shortcode: p.shortcode || "", caption: p.caption, media_url: p.media_url || p.thumbnail_url,
                    media_type: p.media_type, username: p.username || u.username,
                    user_id: p.user_id || String(u.id || ""),
                    like_count: p.like_count, comments_count: p.comments_count,
                    permalink: p.permalink, selected: false,
                  });
                }
              }
            } catch { /* skip user */ }
          }
        } catch (e) { console.log("Search users fallback:", e); }
        
        setSearchResults(results);
        if (results.length > 0) toast.success(`Found ${results.length} posts for "${discoverSearch}"`);
        else toast.info("No posts found for that keyword.");
      } else if (selectedPlatform === "tiktok") {
        const d = await callApi("tiktok-api", { action: "search_videos", params: { keyword: discoverSearch, limit: 30 } });
        if (d?.data?.videos) {
          setSearchResults(d.data.videos.map((v: any) => ({
            id: v.id, caption: v.title || v.description, media_url: v.cover_image_url,
            media_type: "VIDEO", username: v.author?.unique_id || "unknown",
            like_count: v.like_count, comments_count: v.comment_count,
            permalink: v.share_url, selected: false,
          })));
        } else {
          setSearchResults([]);
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setSearchLoading(false);
  };

  const toggleDiscoverSelect = (id: string) => {
    setDiscoverPosts(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
    setSearchResults(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const allPosts = [...discoverPosts, ...searchResults.filter(sr => !discoverPosts.some(dp => dp.id === sr.id))];
  const selectedCount = allPosts.filter(p => p.selected).length;

  const selectAllDiscover = () => {
    const allSelected = allPosts.every(p => p.selected);
    setDiscoverPosts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
    setSearchResults(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const deselectAll = () => {
    setDiscoverPosts(prev => prev.map(p => ({ ...p, selected: false })));
    setSearchResults(prev => prev.map(p => ({ ...p, selected: false })));
  };

   // Outreach comment
  const startMassComment = async () => {
    const selected = allPosts.filter(p => p.selected);
    if (selected.length === 0) { toast.error("Select posts first"); return; }
    if (!requireSession()) return;
    if (massCommentMode === "template" && !massCommentTemplate.trim()) { toast.error("Enter a template message"); return; }
    setMassCommenting(true);
    cancelMassRef.current = false;
    setMassProgress({ done: 0, total: selected.length, failed: 0 });
    let done = 0, failed = 0;
    for (const post of selected) {
      if (cancelMassRef.current) break;
      try {
        let commentText = massCommentTemplate;
        if (massCommentMode === "ai") {
          const aiResult = await callApi("social-ai-responder", {
            action: "generate_contextual_comment",
            params: { post_caption: post.caption || "", post_author: post.username || "creator", media_type: post.media_type || "IMAGE", redirect_url: aiRedirectUrl },
          });
          if (aiResult?.comment) { commentText = aiResult.comment; } else { failed++; setMassProgress({ done, total: selected.length, failed }); continue; }
        }
        if (selectedPlatform === "instagram") {
          // Extract shortcode from permalink or stored shortcode
          const shortcode = (post as DiscoverPost).shortcode || extractShortcode(post.permalink);
          const isOwn = myPosts.some(p => p.id === post.id);
          await callApi("instagram-api", { action: "post_comment", params: { media_id: post.id, message: commentText, shortcode, post_author: post.username, is_own_post: isOwn } });
        } else {
          await callApi("tiktok-api", { action: "post_comment", params: { video_id: post.id, message: commentText } });
        }
        done++;
      } catch { failed++; }
      setMassProgress({ done, total: selected.length, failed });
      if (!cancelMassRef.current) await new Promise(r => setTimeout(r, massDelay));
    }
    setMassCommenting(false);
    toast.success(`Done: ${done} commented, ${failed} failed`);
  };

  const previewAiComment = async (caption: string, author: string) => {
    setAiGenerating(true);
    try {
      const d = await callApi("social-ai-responder", { action: "generate_contextual_comment", params: { post_caption: caption || "", post_author: author || "creator", redirect_url: aiRedirectUrl } });
      if (d?.comment) { setSingleAiComment(d.comment); toast.success("AI comment preview generated"); }
    } catch { toast.error("AI failed"); }
    setAiGenerating(false);
  };

  // View post dialog
  const openPostViewer = async (post: MediaPost | DiscoverPost) => {
    setViewingPost(post);
    setViewerComments([]);
    setViewerCommentsLoading(true);
    try {
      if (selectedPlatform === "instagram") {
        // Determine if this is a discover post (not our own) — use private API
        const isOwnPost = myPosts.some(p => p.id === post.id);
        const d = await callApi("instagram-api", { action: "get_comments", params: { media_id: post.id, limit: 50, use_private: !isOwnPost } });
        if (d?.data) {
          setViewerComments(d.data.map((c: any) => ({
            id: c.id, text: c.text, username: c.username || c.from?.username || "user",
            timestamp: c.timestamp, like_count: c.like_count, replies: c.replies?.data, media_id: post.id, platform: "instagram",
          })));
        }
      } else {
        const d = await callApi("tiktok-api", { action: "get_comments", params: { video_id: post.id, limit: 50 } });
        if (d?.data?.comments) {
          setViewerComments(d.data.comments.map((c: any) => ({
            id: c.id, text: c.text, username: c.user?.unique_id || "user",
            timestamp: c.create_time ? new Date(c.create_time * 1000).toISOString() : undefined,
            like_count: c.digg_count, media_id: post.id, platform: "tiktok",
          })));
        }
      }
    } catch (e: any) { console.log("Failed to load comments:", e.message); }
    setViewerCommentsLoading(false);
  };

  const postCommentOnViewer = async () => {
    if (!viewingPost || !viewerNewComment.trim()) return;
    try {
      if (selectedPlatform === "instagram") {
        const isOwnPost = myPosts.some(p => p.id === viewingPost.id);
        const shortcode = (viewingPost as DiscoverPost).shortcode || extractShortcode(viewingPost.permalink);
        await callApi("instagram-api", { action: "post_comment", params: { media_id: viewingPost.id, message: viewerNewComment, shortcode, post_author: (viewingPost as any).username, is_own_post: isOwnPost } });
      } else {
        await callApi("tiktok-api", { action: "post_comment", params: { video_id: viewingPost.id, message: viewerNewComment } });
      }
      setViewerNewComment("");
      toast.success("Comment posted");
      openPostViewer(viewingPost); // reload
    } catch { toast.error("Failed to post comment"); }
  };

  // ===== OUTREACH: Like a post =====
  const likePost = async (mediaId: string) => {
    setLikingPostId(mediaId);
    try {
      await callApi("instagram-api", { action: "like_media", params: { media_id: mediaId } });
      toast.success("Post liked!");
    } catch { toast.error("Like failed"); }
    setLikingPostId(null);
  };

  // ===== OUTREACH: Follow a user =====
  const followUser = async (userId: string, username: string) => {
    setFollowingUserId(userId);
    try {
      await callApi("instagram-api", { action: "follow_user", params: { user_id: userId } });
      toast.success(`Followed @${username}`);
    } catch { toast.error("Follow failed"); }
    setFollowingUserId(null);
  };

  // ===== OUTREACH LIKE =====
  const startMassLike = async () => {
    const selected = allPosts.filter(p => p.selected);
    if (selected.length === 0) { toast.error("Select posts first"); return; }
    if (!requireSession(true)) return;
    setMassLiking(true);
    setMassLikeProgress({ done: 0, total: selected.length, failed: 0 });
    let done = 0, failed = 0;
    for (const post of selected) {
      if (cancelMassRef.current) break;
      try {
        await callApi("instagram-api", { action: "like_media", params: { media_id: post.id } });
        done++;
      } catch { failed++; }
      setMassLikeProgress({ done, total: selected.length, failed });
      await new Promise(r => setTimeout(r, massDelay));
    }
    setMassLiking(false);
    toast.success(`Liked ${done} posts (${failed} failed)`);
  };

  // ===== OUTREACH FOLLOW =====
  const startMassFollow = async () => {
    const selected = allPosts.filter(p => p.selected);
    if (selected.length === 0) { toast.error("Select posts first"); return; }
    if (!requireSession(true)) return;
    // Deduplicate by username
    const uniqueUsers = new Map<string, DiscoverPost>();
    for (const p of selected) {
      if (p.username && !uniqueUsers.has(p.username)) uniqueUsers.set(p.username, p);
    }
    const users = Array.from(uniqueUsers.values());
    setMassFollowing(true);
    setMassFollowProgress({ done: 0, total: users.length, failed: 0 });
    let done = 0, failed = 0;
    for (const user of users) {
      if (cancelMassRef.current) break;
      try {
        await callApi("instagram-api", { action: "follow_user", params: { user_id: user.id } });
        done++;
      } catch { failed++; }
      setMassFollowProgress({ done, total: users.length, failed });
      await new Promise(r => setTimeout(r, massDelay + 1000)); // extra delay for follows
    }
    setMassFollowing(false);
    toast.success(`Followed ${done} users (${failed} failed)`);
  };

  // === Like a single comment ===
  const likeComment = async (commentId: string) => {
    setLikingCommentId(commentId);
    try {
      const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
      await callApi(funcName, { action: "like_comment", params: { comment_id: commentId } });
      toast.success("Comment liked");
    } catch { toast.error("Like comment failed"); }
    setLikingCommentId(null);
  };

  // === AI AUTOMATION: Auto-reply to comments ===
  const toggleAutoReply = () => {
    if (autoReplyActive) {
      autoReplyRef.current = false;
      setAutoReplyActive(false);
      toast.info("AI Auto-Reply paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoReplyRef.current = true;
      setAutoReplyActive(true);
      toast.success("AI Auto-Reply activated — will reply to new comments");
      runAutoReplyLoop();
    }
  };

  const runAutoReplyLoop = async () => {
    const processedIds = new Set(commentsList.map(c => c.id));
    while (autoReplyRef.current) {
      await new Promise(r => setTimeout(r, 15000)); // check every 15s
      if (!autoReplyRef.current) break;
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const params = selectedPlatform === "instagram"
          ? { media_id: selectedPostId, limit: 50 }
          : { video_id: selectedPostId, limit: 50 };
        const d = await callApi(funcName, { action: "get_comments", params });
        const freshComments = (d?.data || d?.data?.comments || []).map((c: any) => ({
          id: c.id, text: c.text || "", username: c.username || c.from?.username || c.user?.unique_id || "user",
        }));
        const newComments = freshComments.filter((c: any) => !processedIds.has(c.id));
        for (const nc of newComments) {
          if (!autoReplyRef.current) break;
          processedIds.add(nc.id);
          try {
            const aiResult = await callApi("social-ai-responder", {
              action: "generate_comment_reply",
              params: { comment_text: nc.text, comment_author: nc.username, redirect_url: aiRedirectUrl },
            });
            if (aiResult?.reply) {
              const replyParams = selectedPlatform === "instagram"
                ? { comment_id: nc.id, media_id: selectedPostId, message: aiResult.reply, comment_text: nc.text, comment_author: nc.username }
                : { video_id: selectedPostId, comment_id: nc.id, message: aiResult.reply };
              await callApi(funcName, { action: "reply_to_comment", params: replyParams });
              setAutoReplyStats(prev => ({ ...prev, replied: prev.replied + 1 }));
            }
          } catch { /* skip failed reply */ }
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch { /* polling error, retry */ }
    }
  };

  // === AI AUTOMATION: Auto-like comments ===
  const toggleAutoLikeComments = () => {
    if (autoLikeCommentsActive) {
      autoLikeRef.current = false;
      setAutoLikeCommentsActive(false);
      toast.info("Auto-Like Comments paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoLikeRef.current = true;
      setAutoLikeCommentsActive(true);
      toast.success("Auto-Like Comments activated");
      runAutoLikeLoop();
    }
  };

  const runAutoLikeLoop = async () => {
    const likedIds = new Set<string>();
    while (autoLikeRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const params = selectedPlatform === "instagram"
          ? { media_id: selectedPostId, limit: 50 }
          : { video_id: selectedPostId, limit: 50 };
        const d = await callApi(funcName, { action: "get_comments", params });
        const freshComments = (d?.data || d?.data?.comments || []);
        for (const c of freshComments) {
          if (!autoLikeRef.current) break;
          const cId = c.id;
          if (likedIds.has(cId)) continue;
          likedIds.add(cId);
          try {
            await callApi(funcName, { action: "like_comment", params: { comment_id: cId } });
            setAutoReplyStats(prev => ({ ...prev, liked: prev.liked + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 20000));
    }
  };

  // === AI AUTOMATION: Auto-like replies ===
  const toggleAutoLikeReplies = () => {
    if (autoLikeRepliesActive) {
      autoLikeRepliesRef.current = false;
      setAutoLikeRepliesActive(false);
      toast.info("Auto-Like Replies paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoLikeRepliesRef.current = true;
      setAutoLikeRepliesActive(true);
      toast.success("Auto-Like Replies activated");
      runAutoLikeRepliesLoop();
    }
  };

  const runAutoLikeRepliesLoop = async () => {
    const likedReplyIds = new Set<string>();
    while (autoLikeRepliesRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const params = selectedPlatform === "instagram"
          ? { media_id: selectedPostId, limit: 50 }
          : { video_id: selectedPostId, limit: 50 };
        const d = await callApi(funcName, { action: "get_comments", params });
        const freshComments = (d?.data || d?.data?.comments || []);
        for (const c of freshComments) {
          if (!autoLikeRepliesRef.current) break;
          const replies = c.replies?.data || [];
          for (const r of replies) {
            if (!autoLikeRepliesRef.current) break;
            if (likedReplyIds.has(r.id)) continue;
            likedReplyIds.add(r.id);
            try {
              await callApi(funcName, { action: "like_comment", params: { comment_id: r.id } });
              setAutoReplyStats(prev => ({ ...prev, likedReplies: prev.likedReplies + 1 }));
            } catch { /* skip */ }
            await new Promise(r2 => setTimeout(r2, 2000));
          }
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 25000));
    }
  };

  // === Auto-hide negative comments ===
  const toggleAutoHideNegative = () => {
    setAutoHideNegative(!autoHideNegative);
    if (!autoHideNegative) {
      toast.success("Auto-Hide Negative activated — negative comments will be hidden");
      runAutoHidePass();
    } else {
      toast.info("Auto-Hide Negative paused");
    }
  };

  const runAutoHidePass = async () => {
    if (commentsList.length === 0) return;
    try {
      const d = await callApi("social-ai-responder", {
        action: "filter_comments",
        params: { comments: commentsList.slice(0, 50).map(c => ({ id: c.id, text: c.text, username: c.username })), filter_type: "negative" },
      });
      if (d?.filtered_ids?.length > 0) {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        for (const id of d.filtered_ids) {
          try {
            await callApi(funcName, { action: "hide_comment", params: { comment_id: id } });
            setAutoReplyStats(prev => ({ ...prev, hidden: prev.hidden + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 1500));
        }
        toast.success(`Hidden ${d.filtered_ids.length} negative comments`);
      } else {
        toast.info("No negative comments detected");
      }
    } catch { toast.error("Auto-hide failed"); }
  };

  // === Auto-DM Commenters (buying signal commenters get a DM) ===
  const toggleAutoDmCommenters = () => {
    if (autoDmCommenters) {
      autoDmRef.current = false;
      setAutoDmCommenters(false);
      toast.info("Auto-DM Commenters paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoDmRef.current = true;
      setAutoDmCommenters(true);
      toast.success("Auto-DM activated — buying-signal commenters get a DM");
      runAutoDmLoop();
    }
  };

  const runAutoDmLoop = async () => {
    const dmdUsers = new Set<string>();
    while (autoDmRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const d = await callApi(funcName, { action: "get_comments", params: selectedPlatform === "instagram" ? { media_id: selectedPostId, limit: 50 } : { video_id: selectedPostId, limit: 50 } });
        const comments = d?.data || [];
        const buyingKeywords = ["price", "how much", "link", "buy", "order", "cost", "where", "available", "ship", "dm me", "interested"];
        for (const c of comments) {
          if (!autoDmRef.current) break;
          const username = c.username || c.from?.username || "";
          if (dmdUsers.has(username) || !username) continue;
          const text = (c.text || "").toLowerCase();
          const isBuying = buyingKeywords.some(kw => text.includes(kw));
          if (!isBuying) continue;
          dmdUsers.add(username);
          try {
            const aiResult = await callApi("social-ai-responder", {
              action: "generate_dm_from_comment",
              params: { comment_text: c.text, comment_author: username, redirect_url: aiRedirectUrl },
            });
            const dmText = aiResult?.dm || `hey ${username}! saw your comment — check your DMs for something special 💕`;
            await callApi(funcName, { action: "send_message", params: { recipient_id: username, message: dmText } });
            setAutoReplyStats(prev => ({ ...prev, dmd: prev.dmd + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 20000));
    }
  };

  // === Auto-Follow Commenters (follow back engaged fans) ===
  const toggleAutoFollowCommenters = () => {
    if (autoFollowCommenters) {
      autoFollowRef.current = false;
      setAutoFollowCommenters(false);
      toast.info("Auto-Follow paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoFollowRef.current = true;
      setAutoFollowCommenters(true);
      toast.success("Auto-Follow activated — engaged commenters will be followed");
      runAutoFollowLoop();
    }
  };

  const runAutoFollowLoop = async () => {
    const followedUsers = new Set<string>();
    while (autoFollowRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const d = await callApi(funcName, { action: "get_comments", params: selectedPlatform === "instagram" ? { media_id: selectedPostId, limit: 50 } : { video_id: selectedPostId, limit: 50 } });
        const comments = d?.data || [];
        for (const c of comments) {
          if (!autoFollowRef.current) break;
          const userId = c.from?.id || c.user_id || c.id;
          if (followedUsers.has(userId)) continue;
          followedUsers.add(userId);
          try {
            await callApi(funcName, { action: "follow_user", params: { user_id: userId } });
            setAutoReplyStats(prev => ({ ...prev, followed: prev.followed + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 4000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 30000));
    }
  };

  // === Auto-CTA Inject (add CTA reply to high-engagement comments) ===
  const toggleAutoCtaInject = () => {
    if (autoCtaInject) {
      autoCtaRef.current = false;
      setAutoCtaInject(false);
      toast.info("Auto-CTA paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoCtaRef.current = true;
      setAutoCtaInject(true);
      toast.success("Auto-CTA activated — high-engagement comments get a CTA reply");
      runAutoCtaLoop();
    }
  };

  const runAutoCtaLoop = async () => {
    const ctaIds = new Set<string>();
    while (autoCtaRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const d = await callApi(funcName, { action: "get_comments", params: selectedPlatform === "instagram" ? { media_id: selectedPostId, limit: 50 } : { video_id: selectedPostId, limit: 50 } });
        const comments = d?.data || [];
        const sorted = [...comments].sort((a: any, b: any) => (b.like_count || 0) - (a.like_count || 0));
        for (const c of sorted.slice(0, 10)) {
          if (!autoCtaRef.current) break;
          if (ctaIds.has(c.id)) continue;
          if ((c.like_count || 0) < 2) continue;
          ctaIds.add(c.id);
          try {
            const aiResult = await callApi("social-ai-responder", {
              action: "generate_cta_reply",
              params: { comment_text: c.text, comment_author: c.username || "fan", redirect_url: aiRedirectUrl },
            });
            const ctaReply = aiResult?.reply || `thanks for the love! 🔥 link in bio for more`;
            const replyParams = selectedPlatform === "instagram"
              ? { comment_id: c.id, media_id: selectedPostId, message: ctaReply, comment_text: c.text, comment_author: c.username }
              : { video_id: selectedPostId, comment_id: c.id, message: ctaReply };
            await callApi(funcName, { action: "reply_to_comment", params: replyParams });
            setAutoReplyStats(prev => ({ ...prev, ctas: prev.ctas + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 25000));
    }
  };

  // === Auto-Boost Engagement (like + reply combo to maximize algorithm) ===
  const toggleAutoBoostEngagement = () => {
    if (autoBoostEngagement) {
      autoBoostRef.current = false;
      setAutoBoostEngagement(false);
      toast.info("Auto-Boost paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoBoostRef.current = true;
      setAutoBoostEngagement(true);
      toast.success("Auto-Boost activated — like + reply to maximize reach");
      runAutoBoostLoop();
    }
  };

  const runAutoBoostLoop = async () => {
    const boostedIds = new Set<string>();
    while (autoBoostRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const d = await callApi(funcName, { action: "get_comments", params: selectedPlatform === "instagram" ? { media_id: selectedPostId, limit: 50 } : { video_id: selectedPostId, limit: 50 } });
        const comments = d?.data || [];
        for (const c of comments) {
          if (!autoBoostRef.current) break;
          if (boostedIds.has(c.id)) continue;
          boostedIds.add(c.id);
          try {
            // Like the comment first
            await callApi(funcName, { action: "like_comment", params: { comment_id: c.id } });
            await new Promise(r => setTimeout(r, 1500));
            // Then reply with engagement-boosting message
            const aiResult = await callApi("social-ai-responder", {
              action: "generate_comment_reply",
              params: { comment_text: c.text, comment_author: c.username || "fan", redirect_url: aiRedirectUrl },
            });
            if (aiResult?.reply) {
              const replyParams = selectedPlatform === "instagram"
                ? { comment_id: c.id, media_id: selectedPostId, message: aiResult.reply, comment_text: c.text, comment_author: c.username }
                : { video_id: selectedPostId, comment_id: c.id, message: aiResult.reply };
              await callApi(funcName, { action: "reply_to_comment", params: replyParams });
            }
            setAutoReplyStats(prev => ({ ...prev, boosted: prev.boosted + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 20000));
    }
  };

  // === Auto-Question Responder (detect questions and answer with AI) ===
  const toggleAutoQuestionResponder = () => {
    if (autoQuestionResponder) {
      autoQuestionRef.current = false;
      setAutoQuestionResponder(false);
      toast.info("Auto-Question Responder paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoQuestionRef.current = true;
      setAutoQuestionResponder(true);
      toast.success("Auto-Question Responder activated — questions get instant answers");
      runAutoQuestionLoop();
    }
  };

  const runAutoQuestionLoop = async () => {
    const answeredIds = new Set<string>();
    while (autoQuestionRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const d = await callApi(funcName, { action: "get_comments", params: selectedPlatform === "instagram" ? { media_id: selectedPostId, limit: 50 } : { video_id: selectedPostId, limit: 50 } });
        const comments = d?.data || [];
        for (const c of comments) {
          if (!autoQuestionRef.current) break;
          if (answeredIds.has(c.id)) continue;
          const text = (c.text || "").trim();
          const isQuestion = text.includes("?") || /^(how|what|when|where|why|who|can|do|does|is|are|will|would|should|could)\b/i.test(text);
          if (!isQuestion) continue;
          answeredIds.add(c.id);
          try {
            const aiResult = await callApi("social-ai-responder", {
              action: "generate_comment_reply",
              params: { comment_text: c.text, comment_author: c.username || "fan", redirect_url: aiRedirectUrl },
            });
            if (aiResult?.reply) {
              const replyParams = selectedPlatform === "instagram"
                ? { comment_id: c.id, media_id: selectedPostId, message: aiResult.reply, comment_text: c.text, comment_author: c.username }
                : { video_id: selectedPostId, comment_id: c.id, message: aiResult.reply };
              await callApi(funcName, { action: "reply_to_comment", params: replyParams });
              setAutoReplyStats(prev => ({ ...prev, questions: prev.questions + 1 }));
            }
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 18000));
    }
  };

  // === Auto-Lead Capture (DM users showing buying intent + log them) ===
  const toggleAutoLeadCapture = () => {
    if (autoLeadCapture) {
      autoLeadRef.current = false;
      setAutoLeadCapture(false);
      toast.info("Auto-Lead Capture paused");
    } else {
      if (!selectedPostId) { toast.error("Select a post first"); return; }
      autoLeadRef.current = true;
      setAutoLeadCapture(true);
      toast.success("Auto-Lead Capture activated — hot leads get DM'd & logged");
      runAutoLeadLoop();
    }
  };

  const runAutoLeadLoop = async () => {
    const capturedLeads = new Set<string>();
    const leadKeywords = ["price", "how much", "buy", "order", "link", "website", "store", "shop", "purchase", "cost", "dm", "interested", "want this", "need this", "where can i"];
    while (autoLeadRef.current) {
      try {
        const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
        const d = await callApi(funcName, { action: "get_comments", params: selectedPlatform === "instagram" ? { media_id: selectedPostId, limit: 50 } : { video_id: selectedPostId, limit: 50 } });
        const comments = d?.data || [];
        for (const c of comments) {
          if (!autoLeadRef.current) break;
          const username = c.username || c.from?.username || "";
          if (capturedLeads.has(username) || !username) continue;
          const text = (c.text || "").toLowerCase();
          const isLead = leadKeywords.some(kw => text.includes(kw));
          if (!isLead) continue;
          capturedLeads.add(username);
          try {
            // Reply to comment with CTA
            const aiResult = await callApi("social-ai-responder", {
              action: "generate_cta_reply",
              params: { comment_text: c.text, comment_author: username, redirect_url: aiRedirectUrl },
            });
            if (aiResult?.reply) {
              const replyParams = selectedPlatform === "instagram"
                ? { comment_id: c.id, media_id: selectedPostId, message: aiResult.reply, comment_text: c.text, comment_author: username }
                : { video_id: selectedPostId, comment_id: c.id, message: aiResult.reply };
              await callApi(funcName, { action: "reply_to_comment", params: replyParams });
            }
            await new Promise(r => setTimeout(r, 2000));
            // DM the lead
            const dmText = aiResult?.dm || `hey ${username}! thanks for the interest 💕 check this out: ${aiRedirectUrl || "link in bio"}`;
            await callApi(funcName, { action: "send_message", params: { recipient_id: username, message: dmText } });
            setAutoReplyStats(prev => ({ ...prev, leads: prev.leads + 1 }));
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 4000));
        }
      } catch { /* polling error */ }
      await new Promise(r => setTimeout(r, 20000));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoReplyRef.current = false;
      autoLikeRef.current = false;
      autoLikeRepliesRef.current = false;
      autoDmRef.current = false;
      autoFollowRef.current = false;
      autoCtaRef.current = false;
      autoBoostRef.current = false;
      autoQuestionRef.current = false;
      autoLeadRef.current = false;
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, []);



  const PostThumbnail = ({ url, size = "h-12 w-12" }: { url?: string; size?: string }) => (
    url ? (
      <img src={url} alt="" className={`${size} rounded object-cover flex-shrink-0 bg-muted`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    ) : (
      <div className={`${size} rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0`}>
        <Image className="h-4 w-4 text-muted-foreground/40" />
      </div>
    )
  );

  const connectedPlatforms = connections.filter((c: any) => c.is_connected && ["instagram", "tiktok"].includes(c.platform));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" /> Comment Manager
          </h3>
          <CreditCostBadge cost="2–5" variant="header" label="/action" />
        </div>
        <div className="flex items-center gap-1.5">
          {connectedPlatforms.length === 0 && <span className="text-[10px] text-amber-400">No accounts connected</span>}
          {connectedPlatforms.map((c: any) => {
            const isIG = c.platform === "instagram";
            const Icon = isIG ? Instagram : Music2;
            return (
              <button key={c.id} onClick={() => setSelectedPlatform(c.platform)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 ${selectedPlatform === c.platform ? "bg-white/[0.08] text-foreground ring-1 ring-white/[0.12] backdrop-blur-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}>
                <Icon className={`h-3 w-3 ${isIG ? "text-pink-400" : "text-cyan-400"}`} />
                @{c.platform_username}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl gap-0.5 flex flex-wrap w-full backdrop-blur-sm">
          <TabsTrigger value="my-posts" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_10px_-3px] data-[state=active]:shadow-primary/20 text-muted-foreground rounded-lg gap-1.5 text-xs px-2.5 py-1.5 font-medium transition-all duration-200">
            <Image className="h-3.5 w-3.5" /> My Posts
          </TabsTrigger>
           <TabsTrigger value="discover" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_10px_-3px] data-[state=active]:shadow-primary/20 text-muted-foreground rounded-lg gap-1.5 text-xs px-2.5 py-1.5 font-medium transition-all duration-200">
             <Compass className="h-3.5 w-3.5" /> Discover & Outreach
            {selectedPlatform === "instagram" && (!sessionId || sessionStatus === "expired") && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </TabsTrigger>
        </TabsList>

        {/* ===== MY POSTS & COMMENTS ===== */}
        <TabsContent value="my-posts" className="space-y-3 mt-3">
          <div className="flex gap-2 items-center flex-wrap">
            <Button size="sm" variant="outline" onClick={loadMyPosts} disabled={postsLoading} className="text-foreground">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${postsLoading ? "animate-spin" : ""}`} /> Load Posts
            </Button>
            {selectedPostId && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{commentsList.length} comments</Badge>
            )}
          </div>

          {/* AI Comment Automation Engine */}
          {selectedPostId && (
            <Card className="border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
              <CardContent className="p-2.5 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-foreground">AI Comment Automation Engine</span>
                  {(autoReplyActive || autoLikeCommentsActive || autoLikeRepliesActive || autoDmCommenters || autoFollowCommenters || autoCtaInject || autoBoostEngagement || autoQuestionResponder || autoLeadCapture) && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[8px] animate-pulse">LIVE</Badge>
                  )}
                  <span className="text-[8px] text-muted-foreground ml-auto">runs server-side 24/7</span>
                  {/* Persona Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 max-w-[140px]">
                        <User className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">
                          {activePersonaId
                            ? (personas.find(p => p.id === activePersonaId)?.brand_identity?.match(/^\[(.*?)\]/)?.[1] || "Custom")
                            : `${defaultPersonaType === "male" ? "♂" : "♀"} Default`}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <p className="px-2 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Default Personas</p>
                      <DropdownMenuItem onClick={() => switchDefaultType("male")} className="text-xs gap-2">
                        <Crown className="h-3 w-3 text-blue-400" />
                        Male (Default)
                        {!activePersonaId && defaultPersonaType === "male" && <Check className="h-3 w-3 ml-auto text-emerald-400" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => switchDefaultType("female")} className="text-xs gap-2">
                        <Crown className="h-3 w-3 text-pink-400" />
                        Female (Default)
                        {!activePersonaId && defaultPersonaType === "female" && <Check className="h-3 w-3 ml-auto text-emerald-400" />}
                      </DropdownMenuItem>
                      {personas.length > 0 && <p className="px-2 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-medium mt-1">Custom Personas</p>}
                      {personas.map(p => {
                        const pName = p.brand_identity?.match(/^\[(.*?)\]/)?.[1] || p.tone;
                        return (
                          <DropdownMenuItem key={p.id} onClick={() => switchPersona(p.id)} className="text-xs gap-2">
                            <User className="h-3 w-3 text-purple-400" />
                            <span className="truncate">{pName}</span>
                            {activePersonaId === p.id && <Check className="h-3 w-3 ml-auto text-purple-400" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                  {/* Auto AI Reply */}
                  <button onClick={toggleAutoReply}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoReplyActive ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoReplyActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Reply className="h-3 w-3" />
                    AI Auto-Reply
                  </button>
                  {/* Auto Like Comments */}
                  <button onClick={toggleAutoLikeComments}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoLikeCommentsActive ? "bg-pink-500/15 border-pink-500/30 text-pink-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoLikeCommentsActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Heart className="h-3 w-3" />
                    Auto-Like Comments
                  </button>
                  {/* Auto Like Replies */}
                  <button onClick={toggleAutoLikeReplies}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoLikeRepliesActive ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoLikeRepliesActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <HeartHandshake className="h-3 w-3" />
                    Auto-Like Replies
                  </button>
                  {/* Auto Hide Negative */}
                  <button onClick={toggleAutoHideNegative}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoHideNegative ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoHideNegative ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Shield className="h-3 w-3" />
                    Auto-Hide Negative
                  </button>
                  {/* Auto Pin Top Comment */}
                  <button onClick={() => { setAutoPinTopComment(!autoPinTopComment); toast.info(autoPinTopComment ? "Auto-Pin paused" : "Auto-Pin: top-liked comment will be pinned"); }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoPinTopComment ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoPinTopComment ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Pin className="h-3 w-3" />
                    Auto-Pin Best
                  </button>
                  {/* Auto Thank Follower */}
                  <button onClick={() => { setAutoThankNewFollower(!autoThankNewFollower); toast.info(autoThankNewFollower ? "Auto-Thank paused" : "Auto-Thank: new followers get a thank-you reply"); }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoThankNewFollower ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoThankNewFollower ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Star className="h-3 w-3" />
                    Auto-Thank Fans
                  </button>
                  {/* Auto-DM Commenters */}
                  <button onClick={toggleAutoDmCommenters}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoDmCommenters ? "bg-violet-500/15 border-violet-500/30 text-violet-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoDmCommenters ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Mail className="h-3 w-3" />
                    Auto-DM Buyers
                  </button>
                  {/* Auto-Follow Commenters */}
                  <button onClick={toggleAutoFollowCommenters}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoFollowCommenters ? "bg-teal-500/15 border-teal-500/30 text-teal-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoFollowCommenters ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <UserCheck className="h-3 w-3" />
                    Auto-Follow Fans
                  </button>
                  {/* Auto-CTA Inject */}
                  <button onClick={toggleAutoCtaInject}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoCtaInject ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoCtaInject ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Megaphone className="h-3 w-3" />
                    Auto-CTA Inject
                  </button>
                  {/* Auto-Boost Engagement */}
                  <button onClick={toggleAutoBoostEngagement}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoBoostEngagement ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoBoostEngagement ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <TrendingUp className="h-3 w-3" />
                    Auto-Boost
                  </button>
                  {/* Auto-Question Responder */}
                  <button onClick={toggleAutoQuestionResponder}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoQuestionResponder ? "bg-sky-500/15 border-sky-500/30 text-sky-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoQuestionResponder ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <HelpCircle className="h-3 w-3" />
                    Auto-Answer Q's
                  </button>
                  {/* Auto-Lead Capture */}
                  <button onClick={toggleAutoLeadCapture}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border ${autoLeadCapture ? "bg-lime-500/15 border-lime-500/30 text-lime-400" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}>
                    {autoLeadCapture ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <Magnet className="h-3 w-3" />
                    Auto-Lead Capture
                  </button>
                </div>
                {/* Live stats */}
                {(autoReplyStats.replied > 0 || autoReplyStats.liked > 0 || autoReplyStats.likedReplies > 0 || autoReplyStats.hidden > 0 || autoReplyStats.dmd > 0 || autoReplyStats.followed > 0 || autoReplyStats.ctas > 0 || autoReplyStats.boosted > 0 || autoReplyStats.questions > 0 || autoReplyStats.leads > 0) && (
                  <div className="flex items-center gap-3 text-[9px] pt-1 border-t border-white/[0.06] flex-wrap">
                    <span className="text-muted-foreground">Session stats:</span>
                    {autoReplyStats.replied > 0 && <span className="text-emerald-400">💬 {autoReplyStats.replied} replied</span>}
                    {autoReplyStats.liked > 0 && <span className="text-pink-400">❤️ {autoReplyStats.liked} liked</span>}
                    {autoReplyStats.likedReplies > 0 && <span className="text-orange-400">🧡 {autoReplyStats.likedReplies} reply likes</span>}
                    {autoReplyStats.hidden > 0 && <span className="text-red-400">🛡️ {autoReplyStats.hidden} hidden</span>}
                    {autoReplyStats.dmd > 0 && <span className="text-violet-400">📩 {autoReplyStats.dmd} DM'd</span>}
                    {autoReplyStats.followed > 0 && <span className="text-teal-400">👤 {autoReplyStats.followed} followed</span>}
                    {autoReplyStats.ctas > 0 && <span className="text-amber-400">📣 {autoReplyStats.ctas} CTAs</span>}
                    {autoReplyStats.boosted > 0 && <span className="text-fuchsia-400">🚀 {autoReplyStats.boosted} boosted</span>}
                    {autoReplyStats.questions > 0 && <span className="text-sky-400">❓ {autoReplyStats.questions} answered</span>}
                    {autoReplyStats.leads > 0 && <span className="text-lime-400">🧲 {autoReplyStats.leads} leads</span>}
                    <button onClick={() => setAutoReplyStats({ replied: 0, liked: 0, likedReplies: 0, hidden: 0, pinned: 0, dmd: 0, followed: 0, ctas: 0, boosted: 0, questions: 0, leads: 0 })}
                      className="text-muted-foreground hover:text-foreground ml-auto"><X className="h-2.5 w-2.5" /></button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}


          {selectedPostId && commentsList.length > 0 && (
            <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
              <CardContent className="p-2.5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-foreground mr-1">AI Suite:</span>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={bulkGenerateReplies} disabled={generatingReplies}>
                    {generatingReplies ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Auto-Reply All
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={runSentimentAnalysis} disabled={aiSentimentLoading}>
                    {aiSentimentLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />} Sentiment
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={summarizeComments} disabled={aiSummaryLoading}>
                    {aiSummaryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />} Summarize
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={runSpamFilter} disabled={spamFilterLoading}>
                    {spamFilterLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />} Spam Filter
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => { calculateTopFans(); calculateEngagement(); }}>
                    <Trophy className="h-3 w-3" /> Top Fans
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={exportComments}>
                    <Download className="h-3 w-3" /> Export CSV
                  </Button>
                  {bulkAiReplies.length > 0 && (
                    <Button size="sm" className="h-6 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={sendAllBulkReplies}>
                      <Send className="h-3 w-3" /> Send All ({bulkAiReplies.length})
                    </Button>
                  )}
                  <Input value={aiRedirectUrl} onChange={e => setAiRedirectUrl(e.target.value)}
                    placeholder="Redirect link (optional)" className="text-[10px] h-6 max-w-[200px] ml-auto" />
                </div>
                {/* Comment type filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Filter:</span>
                  {(["all", "positive", "negative", "questions"] as const).map(f => (
                    <button key={f} onClick={() => filterCommentsByType(f)}
                      className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${commentFilter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground bg-white/[0.04]"}`}>
                      {f}
                    </button>
                  ))}
                  {aiFilterLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI results */}
          {aiSentimentResults && (
            <Card>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-foreground">Sentiment Analysis</span>
                  <button onClick={() => setAiSentimentResults(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-emerald-500/10 rounded p-1.5 text-center">
                    <p className="text-emerald-400 font-bold">{aiSentimentResults.positive || 0}%</p>
                    <p className="text-muted-foreground">Positive</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded p-1.5 text-center">
                    <p className="text-yellow-400 font-bold">{aiSentimentResults.neutral || 0}%</p>
                    <p className="text-muted-foreground">Neutral</p>
                  </div>
                  <div className="bg-red-500/10 rounded p-1.5 text-center">
                    <p className="text-red-400 font-bold">{aiSentimentResults.negative || 0}%</p>
                    <p className="text-muted-foreground">Negative</p>
                  </div>
                </div>
                {aiSentimentResults.top_themes && (
                  <p className="text-[9px] text-muted-foreground mt-1">Themes: {Array.isArray(aiSentimentResults.top_themes) ? aiSentimentResults.top_themes.join(", ") : aiSentimentResults.top_themes}</p>
                )}
              </CardContent>
            </Card>
          )}
          {aiSummary && (
            <Card>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-foreground">AI Summary</span>
                  <button onClick={() => setAiSummary("")} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
                <p className="text-[11px] text-foreground">{aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Spam results */}
          {spamResults && (
            <Card>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Spam Filter Results</span>
                  <button onClick={() => setSpamResults(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-foreground">Spam: <b className="text-destructive">{spamResults.spam_count || 0}</b></span>
                  <span className="text-foreground">Clean: <b className="text-emerald-400">{spamResults.clean_count || commentsList.length}</b></span>
                </div>
                {spamResults.spam_ids?.length > 0 && (
                  <Button size="sm" variant="outline" className="h-6 text-[9px] mt-1.5 text-destructive border-destructive/30"
                    onClick={async () => { for (const id of spamResults.spam_ids) { await deleteComment(id); await new Promise(r => setTimeout(r, 500)); } setSpamResults(null); }}>
                    <Trash2 className="h-2.5 w-2.5 mr-1" /> Delete All Spam ({spamResults.spam_ids.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top Fans + Engagement */}
          {(topFans.length > 0 || engagementRate) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topFans.length > 0 && (
                <Card>
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-foreground flex items-center gap-1"><Trophy className="h-3 w-3 text-yellow-400" /> Top Fans</span>
                      <button onClick={() => setTopFans([])} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                    </div>
                    <div className="space-y-1">
                      {topFans.map((fan, i) => (
                        <div key={fan.username} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>#{i + 1}</span>
                            <span className="text-foreground font-medium">@{fan.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{fan.count} comments</span>
                            <span className="text-muted-foreground flex items-center gap-0.5"><Heart className="h-2 w-2" /> {fan.likes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {engagementRate && (
                <Card>
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Engagement Stats</span>
                      <button onClick={() => setEngagementRate(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-white/[0.04] rounded p-1.5 text-center">
                        <p className="text-foreground font-bold">{engagementRate.likes}</p>
                        <p className="text-muted-foreground">Likes</p>
                      </div>
                      <div className="bg-white/[0.04] rounded p-1.5 text-center">
                        <p className="text-foreground font-bold">{engagementRate.comments}</p>
                        <p className="text-muted-foreground">Comments</p>
                      </div>
                      <div className="bg-white/[0.04] rounded p-1.5 text-center">
                        <p className="text-foreground font-bold">{engagementRate.total}</p>
                        <p className="text-muted-foreground">Total Engagement</p>
                      </div>
                      <div className="bg-white/[0.04] rounded p-1.5 text-center">
                        <p className="text-foreground font-bold">{engagementRate.avgLikesPerComment}</p>
                        <p className="text-muted-foreground">Avg Likes/Comment</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Posts list */}
            <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Select a post ({myPosts.length})</p>
                <div className="overflow-y-auto max-h-[700px] pr-1">
                  <div className="space-y-1.5">
                    {postsLoading && <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading...</span></div>}
                    {!postsLoading && myPosts.length === 0 && (
                      <div className="text-center py-8">
                        <Image className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                        <p className="text-[11px] text-muted-foreground">No posts found. Connect an account first.</p>
                      </div>
                    )}
                    {myPosts.map(post => (
                      <div key={post.id} className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selectedPostId === post.id ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"}`}>
                        <div className="flex gap-2">
                          <PostThumbnail url={post.media_url} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-foreground line-clamp-2 cursor-pointer" onClick={() => loadComments(post.id)}>{post.caption || "No caption"}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {post.like_count != null && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" /> {post.like_count}</span>}
                              {post.comments_count != null && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> {post.comments_count}</span>}
                              {post.timestamp && <span className="text-[9px] text-muted-foreground">{new Date(post.timestamp).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); openPostViewer(post); }}
                            className="flex-shrink-0 p-1.5 rounded hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground" title="View Post">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments panel */}
            <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Comments</p>
                </div>

                <ScrollArea className="max-h-[600px]">
                  {commentsLoading && <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading comments...</span></div>}
                  {!commentsLoading && commentsList.length === 0 && !selectedPostId && (
                    <div className="text-center py-8"><MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" /><p className="text-[11px] text-muted-foreground">Select a post to view comments</p></div>
                  )}
                  {!commentsLoading && commentsList.length === 0 && selectedPostId && (
                    <div className="text-center py-8"><MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" /><p className="text-[11px] text-muted-foreground">No comments on this post</p></div>
                  )}

                  {/* Bulk AI replies */}
                  {bulkAiReplies.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <p className="text-[10px] font-medium text-emerald-400 mb-1">{bulkAiReplies.length} AI replies ready to send</p>
                      {bulkAiReplies.map((r, i) => (
                        <div key={i} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">@{r.username}: "{r.comment_text}"</p>
                          <p className="text-[11px] text-foreground mt-0.5 font-medium">{r.generated_reply}</p>
                          <div className="flex gap-1 mt-1.5">
                            <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5" onClick={() => sendBulkReply(r)}><Send className="h-2.5 w-2.5" /> Send</Button>
                            <Button size="sm" variant="ghost" className="h-5 text-[9px] text-destructive" onClick={() => setBulkAiReplies(p => p.filter(x => x.comment_id !== r.comment_id))}>Skip</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Individual comments — Instagram-style with glassmorphism */}
                  {!bulkAiReplies.length && (commentFilter !== "all" && filteredComments.length > 0 ? filteredComments : commentsList).map(comment => (
                    <div key={comment.id} className="bg-white/[0.02] rounded-xl p-3 mb-2 border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-200">
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500/80 to-purple-500/80 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                          {comment.username[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-foreground">@{comment.username}</span>
                              {comment.timestamp && (
                                <span className="text-[9px] text-muted-foreground">
                                  {(() => {
                                    const d = new Date(comment.timestamp!);
                                    const now = new Date();
                                    const diff = now.getTime() - d.getTime();
                                    const mins = Math.floor(diff / 60000);
                                    if (mins < 60) return `${mins}m`;
                                    const hrs = Math.floor(mins / 60);
                                    if (hrs < 24) return `${hrs}h`;
                                    const days = Math.floor(hrs / 24);
                                    if (days < 7) return `${days}d`;
                                    return d.toLocaleDateString();
                                  })()}
                                </span>
                              )}
                              {comment.like_count != null && comment.like_count > 0 && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <Heart className="h-2 w-2 text-pink-400" /> {comment.like_count}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => likeComment(comment.id)} disabled={likingCommentId === comment.id}
                                className="p-1 rounded-md hover:bg-pink-500/15 transition-colors" title="Like">
                                {likingCommentId === comment.id ? <Loader2 className="h-3 w-3 animate-spin text-pink-400" /> : <Heart className="h-3 w-3 text-pink-400/70 hover:text-pink-400" />}
                              </button>
                              <button onClick={() => generateAiReplyForComment(comment)} disabled={aiGenerating}
                                className="p-1 rounded-md hover:bg-purple-500/15 transition-colors" title="AI Reply">
                                {aiGenerating && replyingTo === comment.id ? <Loader2 className="h-3 w-3 animate-spin text-purple-400" /> : <Brain className="h-3 w-3 text-purple-400/70 hover:text-purple-400" />}
                              </button>
                              <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                                className="p-1 rounded-md hover:bg-blue-500/15 transition-colors" title="Reply">
                                <Reply className="h-3 w-3 text-blue-400/70 hover:text-blue-400" />
                              </button>
                              {/* Comment Detail Wheel */}
                              <Popover open={commentDetailId === comment.id} onOpenChange={(open) => setCommentDetailId(open ? comment.id : null)}>
                                <PopoverTrigger asChild>
                                  <button className="p-1 rounded-md hover:bg-white/[0.08] transition-colors" title="Details">
                                    <Settings className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-56 p-0 border-white/[0.08] bg-background/95 backdrop-blur-lg">
                                  <div className="p-3 space-y-2">
                                    <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                                      <Settings className="h-3 w-3 text-primary" /> Comment Details
                                    </p>
                                    <div className="space-y-1.5 text-[10px]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><AtSign className="h-2.5 w-2.5" /> Author</span>
                                        <span className="text-foreground font-medium">@{comment.username}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> Date</span>
                                        <span className="text-foreground">{comment.timestamp ? new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Time</span>
                                        <span className="text-foreground">{comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><Heart className="h-2.5 w-2.5" /> Likes</span>
                                        <span className="text-foreground font-medium">{comment.like_count ?? 0}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><MessageSquare className="h-2.5 w-2.5" /> Replies</span>
                                        <span className="text-foreground font-medium">{comment.replies?.length ?? 0}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-2.5 w-2.5" /> Length</span>
                                        <span className="text-foreground">{comment.text.length} chars</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1"><BarChart3 className="h-2.5 w-2.5" /> Sentiment</span>
                                        <span className={`font-medium ${comment.text.match(/[?]/) ? "text-yellow-400" : comment.text.match(/love|amazing|great|best|fire|perfect/i) ? "text-emerald-400" : comment.text.match(/bad|terrible|worst|hate|ugly/i) ? "text-red-400" : "text-foreground"}`}>
                                          {comment.text.match(/[?]/) ? "Question" : comment.text.match(/love|amazing|great|best|fire|perfect/i) ? "Positive" : comment.text.match(/bad|terrible|worst|hate|ugly/i) ? "Negative" : "Neutral"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="pt-1.5 border-t border-white/[0.06] flex gap-1">
                                      <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1 gap-1" onClick={() => { navigator.clipboard.writeText(comment.text); toast.success("Copied"); setCommentDetailId(null); }}>
                                        Copy Text
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1 gap-1 text-destructive border-destructive/30" onClick={() => { deleteComment(comment.id); setCommentDetailId(null); }}>
                                        <Trash2 className="h-2.5 w-2.5" /> Delete
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <button onClick={() => deleteComment(comment.id)} disabled={deletingId === comment.id}
                                className="p-1 rounded-md hover:bg-destructive/15 transition-colors" title="Delete">
                                {deletingId === comment.id ? <Loader2 className="h-3 w-3 animate-spin text-destructive" /> : <Trash2 className="h-3 w-3 text-destructive/50 hover:text-destructive" />}
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-foreground mt-1 leading-relaxed">{comment.text}</p>
                          
                          {/* Reply input */}
                          {replyingTo === comment.id && (
                            <div className="flex gap-1 mt-2">
                              <Input value={replyText} onChange={e => setReplyText(e.target.value)}
                                placeholder="Write reply..." className="text-[11px] h-7 flex-1 bg-white/[0.03] border-white/[0.08]" autoFocus
                                onKeyDown={e => e.key === "Enter" && replyToComment(comment.id, comment.text, comment.username)} />
                              <Button size="sm" variant="outline" className="h-7 px-2 border-white/[0.08]" onClick={() => replyToComment(comment.id, comment.text, comment.username)} disabled={!replyText.trim()}>
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {/* Instagram-style inline replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => setExpandedReplies(prev => {
                                  const next = new Set(prev);
                                  next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id);
                                  return next;
                                })}
                                className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
                              >
                                <div className="w-6 h-px bg-muted-foreground/30" />
                                {expandedReplies.has(comment.id)
                                  ? `Hide ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`
                                  : `View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                              </button>
                              {expandedReplies.has(comment.id) && (
                                <div className="pl-4 border-l border-white/[0.06] space-y-2 mt-1">
                                  {comment.replies.map((r: any) => (
                                    <div key={r.id} className="flex items-start gap-2">
                                      <div className="h-5 w-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[8px] font-bold text-foreground flex-shrink-0 mt-0.5">
                                        {(r.username || "?")[0]?.toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px]">
                                          <span className="font-semibold text-foreground">@{r.username}</span>
                                          <span className="text-foreground ml-1">{r.text}</span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {r.timestamp && <span className="text-[8px] text-muted-foreground">{new Date(r.timestamp).toLocaleDateString()}</span>}
                                          {r.like_count != null && r.like_count > 0 && <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><Heart className="h-1.5 w-1.5" /> {r.like_count}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== DISCOVER & OUTREACH ===== */}
        <TabsContent value="discover" className="space-y-3 mt-3">
          {/* Search bar */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)}
                placeholder="Search posts by keyword or hashtag..."
                className="text-xs h-8 pl-8 pr-8"
                onKeyDown={e => e.key === "Enter" && searchPostsByKeyword()} />
              {discoverSearch && (
                <button onClick={() => { setDiscoverSearch(""); setSearchResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={searchPostsByKeyword} disabled={searchLoading || !discoverSearch.trim()} className="text-foreground h-8">
              {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Hashtag quick-picks for discover */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Flame className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Explore:</span>
            {discoverHashtags.map(tag => (
              <button key={tag} onClick={() => setActiveDiscoverTag(tag)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${activeDiscoverTag === tag ? "bg-primary/20 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground bg-white/[0.04]"}`}>
                #{tag}
              </button>
            ))}
            <Input placeholder="Custom tag..." className="text-[10px] h-6 w-24" onKeyDown={e => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim().replace("#", "");
                setActiveDiscoverTag(val);
                if (!discoverHashtags.includes(val)) setDiscoverHashtags(prev => [...prev, val]);
                (e.target as HTMLInputElement).value = "";
              }
            }} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={loadDiscoverFeed} disabled={discoverLoading} className="text-foreground">
              <Compass className={`h-3.5 w-3.5 mr-1 ${discoverLoading ? "animate-spin" : ""}`} /> Load Feed
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Posts:</span>
              <Input
                type="number"
                min={10}
                max={1000}
                value={feedLimit}
                onChange={e => {
                  const v = Math.min(1000, Math.max(10, parseInt(e.target.value) || 25));
                  setFeedLimit(v);
                }}
                className="text-[10px] h-7 w-16 text-center"
              />
            </div>
            <Button size="sm" variant="outline" onClick={selectAllDiscover} disabled={allPosts.length === 0} className="text-foreground">
              <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAll} disabled={selectedCount === 0} className="text-foreground">
              <Square className="h-3.5 w-3.5 mr-1" /> Deselect All
            </Button>
            <Badge variant="outline" className="text-[10px] text-foreground">{selectedCount}/{allPosts.length} selected</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Posts grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-3">
                  {/* Search results section */}
                  {searchResults.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-foreground mb-1.5">Search Results ({searchResults.length})</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {searchResults.map(post => (
                          <PostCard key={`sr-${post.id}`} post={post} toggleSelect={toggleDiscoverSelect} openViewer={() => openPostViewer(post as any)} PostThumbnail={PostThumbnail} />
                        ))}
                      </div>
                      <div className="border-t border-white/[0.06] mb-2" />
                    </div>
                  )}

                  <p className="text-[10px] font-semibold text-foreground mb-1.5">Feed Posts ({discoverPosts.length})</p>
                  <ScrollArea className="max-h-[500px]">
                    {discoverLoading && <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading...</span></div>}
                    {!discoverLoading && discoverPosts.length === 0 && (
                      <div className="text-center py-12">
                        <Compass className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Click "Load Feed" to discover posts</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {discoverPosts.map(post => (
                        <PostCard key={post.id} post={post} toggleSelect={toggleDiscoverSelect} openViewer={() => openPostViewer(post as any)} PostThumbnail={PostThumbnail} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Outreach Panel */}
            <div className="space-y-3">
              {/* Outreach Comment */}
              <Card>
                <CardContent className="p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> Outreach Comment
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => setMassCommentMode("ai")}
                      className={`flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${massCommentMode === "ai" ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30" : "text-muted-foreground hover:text-foreground bg-white/[0.04]"}`}>
                      <Brain className="h-3 w-3 inline mr-1" /> AI Auto-Scan
                    </button>
                    <button onClick={() => setMassCommentMode("template")}
                      className={`flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${massCommentMode === "template" ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "text-muted-foreground hover:text-foreground bg-white/[0.04]"}`}>
                      <MessageSquare className="h-3 w-3 inline mr-1" /> Template
                    </button>
                  </div>

                  {massCommentMode === "ai" ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground">AI scans each post and generates a unique contextual comment.</p>
                      <Input value={aiRedirectUrl} onChange={e => setAiRedirectUrl(e.target.value)} placeholder="Redirect URL (optional)" className="text-xs h-7" />
                      {selectedCount > 0 && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 w-full" disabled={aiGenerating}
                          onClick={() => { const first = allPosts.find(p => p.selected); if (first) previewAiComment(first.caption || "", first.username || "creator"); }}>
                          {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Preview AI Comment
                        </Button>
                      )}
                      {singleAiComment && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded p-2">
                          <p className="text-[10px] text-foreground">{singleAiComment}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Textarea value={massCommentTemplate} onChange={e => setMassCommentTemplate(e.target.value)}
                      placeholder="Your comment template..." className="text-xs min-h-[60px] resize-none" />
                  )}

                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Delay:</span>
                    <div className="flex gap-1">
                      {[1000, 2000, 3000, 5000].map(ms => (
                        <button key={ms} onClick={() => setMassDelay(ms)}
                          className={`text-[9px] px-1.5 py-0.5 rounded ${massDelay === ms ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground bg-white/[0.04]"}`}>
                          {ms / 1000}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button size="sm" onClick={startMassComment} disabled={massCommenting || selectedCount === 0}
                    className="w-full h-8 text-[11px] gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
                    {massCommenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Comment on {selectedCount} posts
                  </Button>
                  {massCommenting && (
                    <Button size="sm" variant="outline" onClick={() => { cancelMassRef.current = true; }}
                      className="w-full h-7 text-[10px] text-destructive border-destructive/30">Cancel</Button>
                  )}
                  {massProgress && (
                    <div>
                      <div className="flex items-center gap-2 text-[10px] mb-1">
                        {massCommenting ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-emerald-400" />}
                        <span className={massCommenting ? "text-blue-400" : "text-emerald-400"}>
                          {massCommenting ? `Commenting ${massProgress.done}/${massProgress.total}` : `Done: ${massProgress.done} commented`}
                        </span>
                        {massProgress.failed > 0 && <span className="text-destructive">({massProgress.failed} failed)</span>}
                      </div>
                      <Progress value={massProgress.total > 0 ? (massProgress.done / massProgress.total) * 100 : 0} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Outreach Like */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-red-400" /> Outreach Like
                  </p>
                  <p className="text-[10px] text-muted-foreground">Auto-like selected posts to boost your visibility and engagement.</p>
                  <Button size="sm" onClick={startMassLike} disabled={massLiking || selectedCount === 0}
                    className="w-full h-8 text-[11px] gap-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white border-0">
                    {massLiking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
                    Like {selectedCount} posts
                  </Button>
                  {massLikeProgress && (
                    <div>
                      <div className="flex items-center gap-2 text-[10px] mb-1">
                        {massLiking ? <Loader2 className="h-3 w-3 animate-spin text-red-400" /> : <CheckCheck className="h-3 w-3 text-red-400" />}
                        <span className="text-red-400">
                          {massLiking ? `Liking ${massLikeProgress.done}/${massLikeProgress.total}` : `Done: ${massLikeProgress.done} liked`}
                        </span>
                        {massLikeProgress.failed > 0 && <span className="text-destructive">({massLikeProgress.failed} failed)</span>}
                      </div>
                      <Progress value={massLikeProgress.total > 0 ? (massLikeProgress.done / massLikeProgress.total) * 100 : 0} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Outreach Follow */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-blue-400" /> Outreach Follow
                  </p>
                  <p className="text-[10px] text-muted-foreground">Follow creators from selected posts. Deduplicated by username.</p>
                  <Button size="sm" onClick={startMassFollow} disabled={massFollowing || selectedCount === 0}
                    className="w-full h-8 text-[11px] gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
                    {massFollowing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    Follow creators ({selectedCount} posts)
                  </Button>
                  {massFollowProgress && (
                    <div>
                      <div className="flex items-center gap-2 text-[10px] mb-1">
                        {massFollowing ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-blue-400" />}
                        <span className="text-blue-400">
                          {massFollowing ? `Following ${massFollowProgress.done}/${massFollowProgress.total}` : `Done: ${massFollowProgress.done} followed`}
                        </span>
                        {massFollowProgress.failed > 0 && <span className="text-destructive">({massFollowProgress.failed} failed)</span>}
                      </div>
                      <Progress value={massFollowProgress.total > 0 ? (massFollowProgress.done / massFollowProgress.total) * 100 : 0} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-yellow-400" /> Combo Outreach
                  </p>
                  <p className="text-[10px] text-muted-foreground">Run Like + Comment + Follow in one pass for maximum impact.</p>
                  <Button size="sm" onClick={async () => {
                    if (selectedCount === 0) { toast.error("Select posts first"); return; }
                    cancelMassRef.current = false;
                    toast.info("Starting combo outreach: Like → Comment → Follow");
                    await startMassLike();
                    if (!cancelMassRef.current) await startMassComment();
                    if (!cancelMassRef.current) await startMassFollow();
                    toast.success("Combo outreach complete!");
                  }} disabled={massCommenting || massLiking || massFollowing || selectedCount === 0}
                    className="w-full h-8 text-[11px] gap-1.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white border-0">
                    <Zap className="h-3.5 w-3.5" /> Combo: Like + Comment + Follow ({selectedCount})
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


      </Tabs>

      {/* ===== SESSION REQUIRED DIALOG ===== */}
      <Dialog open={sessionRequiredDialog} onOpenChange={setSessionRequiredDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Instagram Session Cookie Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To <strong>discover posts</strong>, <strong>mass comment</strong>, <strong>like</strong>, or <strong>follow</strong> on other accounts' content, you need a valid Instagram session cookie.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your session cookie {sessionStatus === "expired" ? "has expired" : "has not been set up yet"}. Go to the <strong>Connect</strong> tab to enter your session credentials.
            </p>
            <Card className="bg-white/[0.04] border-white/[0.06]">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">
                  <strong>How it works:</strong> Open instagram.com → DevTools (F12) → Application → Cookies → copy <code className="bg-muted px-1 rounded text-foreground">sessionid</code>, <code className="bg-muted px-1 rounded text-foreground">csrftoken</code>, and <code className="bg-muted px-1 rounded text-foreground">ds_user_id</code>.
                </p>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1.5"
                onClick={() => {
                  setSessionRequiredDialog(false);
                  onNavigateToSession?.();
                }}
              >
                <Key className="h-4 w-4" /> Go to Connect Tab
              </Button>
              <Button variant="outline" onClick={() => setSessionRequiredDialog(false)} className="text-foreground">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== POST VIEWER DIALOG (Instagram-style) ===== */}
      <Dialog open={!!viewingPost} onOpenChange={(open) => { if (!open) setViewingPost(null); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-border">
          {viewingPost && (
            <div className="flex flex-col md:flex-row h-[80vh] max-h-[700px]">
              {/* Media side */}
              <div className="md:w-1/2 bg-black flex items-center justify-center min-h-[200px] relative">
                {viewingPost.media_url ? (
                  viewingPost.media_type === "VIDEO" ? (
                    <video src={viewingPost.media_url} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={viewingPost.media_url} alt="" className="w-full h-full object-contain" onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).style.display = "none";
                    }} />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="h-12 w-12 opacity-30" />
                    <span className="text-xs">No preview available</span>
                  </div>
                )}
              </div>

              {/* Comments side */}
              <div className="md:w-1/2 flex flex-col border-l border-border">
                {/* Header */}
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {(viewingPost as any).username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-semibold text-foreground">@{(viewingPost as any).username || "you"}</span>
                  </div>
                  {viewingPost.permalink && (
                    <a href={viewingPost.permalink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Caption */}
                {viewingPost.caption && (
                  <div className="px-3 py-2 border-b border-border/30">
                    <p className="text-xs text-foreground leading-relaxed">{viewingPost.caption}</p>
                  </div>
                )}

                {/* Stats bar */}
                <div className="px-3 py-2 border-b border-border/30 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs font-semibold">{viewingPost.like_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-semibold">{viewingPost.comments_count ?? viewerComments.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-foreground">
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs font-semibold">{(viewingPost as any).shares_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-foreground ml-auto">
                    <Bookmark className="h-4 w-4" />
                  </div>
                </div>

                {/* Comments list */}
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {viewerCommentsLoading && (
                      <div className="flex items-center gap-2 py-6 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Loading comments...</span>
                      </div>
                    )}
                    {!viewerCommentsLoading && viewerComments.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">No comments yet</p>
                    )}
                    {viewerComments.map(c => (
                      <div key={c.id} className="flex gap-2">
                        <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">
                          {c.username[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="font-semibold text-foreground mr-1">@{c.username}</span>
                            <span className="text-foreground">{c.text}</span>
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {c.timestamp && <span className="text-[9px] text-muted-foreground">{new Date(c.timestamp).toLocaleDateString()}</span>}
                            {c.like_count != null && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Heart className="h-2 w-2" /> {c.like_count}</span>}
                          </div>
                          {c.replies && c.replies.length > 0 && (
                            <div className="mt-1 pl-2 border-l border-border/30 space-y-1">
                              {c.replies.map((r: any) => (
                                <p key={r.id} className="text-[10px]">
                                  <span className="font-semibold text-foreground">@{r.username}</span>
                                  <span className="text-foreground ml-1">{r.text}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Comment input */}
                <div className="p-3 border-t border-border flex gap-2">
                  <Input value={viewerNewComment} onChange={e => setViewerNewComment(e.target.value)}
                    placeholder="Add a comment..." className="text-xs h-9 flex-1"
                    onKeyDown={e => e.key === "Enter" && postCommentOnViewer()} />
                  <Button size="sm" variant="ghost" onClick={postCommentOnViewer} disabled={!viewerNewComment.trim()} className="h-9 px-3 text-primary">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Extracted PostCard
const PostCard = ({ post, toggleSelect, openViewer, PostThumbnail }: { post: DiscoverPost; toggleSelect: (id: string) => void; openViewer: () => void; PostThumbnail: any }) => (
  <div className={`rounded-lg border p-2.5 transition-colors ${post.selected ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"}`}>
    <div className="flex gap-2">
      <button onClick={() => toggleSelect(post.id)} className="flex-shrink-0 mt-0.5">
        <div className={`h-4 w-4 rounded border flex items-center justify-center ${post.selected ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"}`}>
          {post.selected && <Check className="h-2.5 w-2.5 text-white" />}
        </div>
      </button>
      <PostThumbnail url={post.media_url} size="h-14 w-14" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-medium text-foreground">@{post.username}</span>
          <button onClick={(e) => { e.stopPropagation(); openViewer(); }}
            className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-foreground" title="View Post">
            <Eye className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[10px] text-foreground line-clamp-2">{post.caption || "No caption"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {post.like_count != null && <span className="text-[8px] text-muted-foreground"><Heart className="h-2 w-2 inline" /> {post.like_count}</span>}
          {post.comments_count != null && <span className="text-[8px] text-muted-foreground"><MessageSquare className="h-2 w-2 inline" /> {post.comments_count}</span>}
        </div>
      </div>
    </div>
  </div>
);

export default CommentsHub;

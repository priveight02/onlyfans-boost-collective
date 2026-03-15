import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Calendar, Plus, Sparkles, TrendingUp, Loader2,
  Trash2, Edit2, Image, Video, FileText, Clock, CheckCircle2,
  MapPin, X, Upload, Globe, Send, Eye, Hash, Zap,
  Copy, BarChart3, Wand2, CalendarDays, Layers, RefreshCw,
  Target, Flame, Star, ArrowRight, LayoutGrid, List,
  Repeat, Brain, Palette, MousePointerClick, Timer,
  AlertTriangle, ChevronDown, CheckSquare, Square, Search,
  Lightbulb, Megaphone, BookOpen, Scissors, Sparkle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isThisWeek, addDays } from "date-fns";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";

const CONTENT_TYPES = ["post", "story", "reel", "tweet", "promo", "teaser", "behind_scenes", "collab"];
const STATUSES = ["draft", "planned", "scheduled", "published", "archived"];

const PLATFORM_CONFIG: Record<string, {
  label: string;
  supportedTypes: string[];
  fields: { location?: boolean; hashtags?: boolean; altText?: boolean; pollOptions?: boolean; privacy?: boolean; shareToFeed?: boolean; link?: boolean; };
  publishAction: string;
  captionLabel: string;
  maxCaption: number;
  color: string;
  bestTimes: string[];
  hashtagLimit: number;
  mediaSpecs: string;
}> = {
  instagram: {
    label: "Instagram", supportedTypes: ["post", "story", "reel", "collab"],
    fields: { location: true, hashtags: true, altText: true },
    publishAction: "create_photo_post", captionLabel: "Caption", maxCaption: 2200,
    color: "text-pink-400", bestTimes: ["9:00 AM", "12:00 PM", "3:00 PM", "7:00 PM"],
    hashtagLimit: 30, mediaSpecs: "1080×1080 (post), 1080×1920 (story/reel)",
  },
  tiktok: {
    label: "TikTok", supportedTypes: ["post", "reel"],
    fields: { hashtags: true, privacy: true },
    publishAction: "publish_photo", captionLabel: "Description", maxCaption: 4000,
    color: "text-cyan-400", bestTimes: ["7:00 AM", "10:00 AM", "2:00 PM", "9:00 PM"],
    hashtagLimit: 100, mediaSpecs: "1080×1920 (9:16 vertical)",
  },
  twitter: {
    label: "X / Twitter", supportedTypes: ["tweet", "promo"],
    fields: { pollOptions: true, hashtags: true },
    publishAction: "create_tweet", captionLabel: "Tweet text", maxCaption: 280,
    color: "text-blue-400", bestTimes: ["8:00 AM", "12:00 PM", "5:00 PM"],
    hashtagLimit: 5, mediaSpecs: "1200×675 (16:9)",
  },
  facebook: {
    label: "Facebook", supportedTypes: ["post", "promo"],
    fields: { location: true, link: true, hashtags: true },
    publishAction: "create_post", captionLabel: "Message", maxCaption: 63206,
    color: "text-blue-500", bestTimes: ["9:00 AM", "1:00 PM", "4:00 PM"],
    hashtagLimit: 10, mediaSpecs: "1200×630 (link), 1080×1080 (post)",
  },
  threads: {
    label: "Threads", supportedTypes: ["post"],
    fields: { hashtags: true },
    publishAction: "create_text_thread", captionLabel: "Thread text", maxCaption: 500,
    color: "text-white", bestTimes: ["8:00 AM", "12:00 PM", "6:00 PM"],
    hashtagLimit: 10, mediaSpecs: "1080×1080",
  },
  onlyfans: {
    label: "OnlyFans", supportedTypes: ["post", "promo", "teaser", "behind_scenes"],
    fields: { hashtags: true },
    publishAction: "", captionLabel: "Caption", maxCaption: 5000,
    color: "text-sky-400", bestTimes: ["10:00 PM", "11:00 PM", "8:00 PM"],
    hashtagLimit: 20, mediaSpecs: "No strict limit",
  },
};

// Expanded content templates per platform
const CONTENT_TEMPLATES = [
  { name: "Engagement Post", platform: "instagram", type: "post", caption: "What's your favorite ___? Drop your answer below 👇", hashtags: ["engagement", "question", "community"] },
  { name: "Behind the Scenes", platform: "instagram", type: "story", caption: "A little peek behind the curtain ✨", hashtags: ["bts", "behindthescenes"] },
  { name: "Carousel Breakdown", platform: "instagram", type: "post", caption: "Swipe through to see the full breakdown 👉\n\nSlide 1: Hook\nSlide 2-4: Value\nSlide 5: CTA", hashtags: ["carousel", "tips", "swipe"] },
  { name: "Viral Hook Reel", platform: "tiktok", type: "reel", caption: "POV: You just discovered something that changes everything...", hashtags: ["viral", "fyp", "trending"] },
  { name: "Duet Challenge", platform: "tiktok", type: "reel", caption: "Try this challenge and tag me! Let's see your version 🎬", hashtags: ["challenge", "duet", "fyp"] },
  { name: "Thread Story", platform: "threads", type: "post", caption: "Here's something most people don't know about...", hashtags: ["thread", "storytime"] },
  { name: "Hot Take", platform: "threads", type: "post", caption: "Unpopular opinion: ___\n\nLet me explain why 👇", hashtags: ["hottake", "opinion"] },
  { name: "Quick Tweet", platform: "twitter", type: "tweet", caption: "", hashtags: [] },
  { name: "Poll Tweet", platform: "twitter", type: "tweet", caption: "Which one do you prefer? 🤔\n\n1️⃣ Option A\n2️⃣ Option B\n3️⃣ Option C", hashtags: ["poll"] },
  { name: "Promo Teaser", platform: "onlyfans", type: "teaser", caption: "Something special dropping soon... you don't want to miss this 🔥", hashtags: ["exclusive", "comingsoon"] },
  { name: "PPV Preview", platform: "onlyfans", type: "promo", caption: "New exclusive content just dropped 💎\n\nDon't miss out — limited time only", hashtags: ["ppv", "exclusive", "newcontent"] },
  { name: "FB Promo Post", platform: "facebook", type: "promo", caption: "🎉 Big announcement!\n\nWe're excited to share...\n\n👉 Link in comments", hashtags: ["announcement", "exciting"] },
  { name: "Story Q&A", platform: "instagram", type: "story", caption: "Ask me anything! ✨ Drop your questions 👇", hashtags: ["qanda", "askme", "interactive"] },
  { name: "Value Thread", platform: "twitter", type: "tweet", caption: "🧵 Thread: 5 things I wish I knew earlier about ___\n\n1/5:", hashtags: ["thread", "tips", "wisdom"] },
];

// ─── Platform-specific content presets ───
const PLATFORM_PRESETS: Record<string, { label: string; caption: string; type: string; }[]> = {
  instagram: [
    { label: "Photo Dump", caption: "recent photo dump 📸✨", type: "post" },
    { label: "GRWM", caption: "Get ready with me! 💄", type: "reel" },
    { label: "Day in My Life", caption: "A day in my life ☀️", type: "reel" },
  ],
  tiktok: [
    { label: "Storytime", caption: "Storytime: ___\n\nYou won't believe what happened next...", type: "reel" },
    { label: "Tutorial", caption: "Here's how to ___ in 60 seconds ⏱️", type: "reel" },
    { label: "Trend Jump", caption: "Had to try this trend 😂", type: "reel" },
  ],
  twitter: [
    { label: "Ratio Tweet", caption: "This is going to be controversial but...", type: "tweet" },
    { label: "List Tweet", caption: "Things that are criminally underrated:\n\n1.\n2.\n3.\n4.\n5.", type: "tweet" },
  ],
  facebook: [
    { label: "Share Story", caption: "I wanted to share something personal today...", type: "post" },
    { label: "Event Promo", caption: "🎉 Save the date! We're hosting...", type: "promo" },
  ],
  threads: [
    { label: "Conversation Starter", caption: "Let's talk about ___\n\nI'll go first:", type: "post" },
  ],
  onlyfans: [
    { label: "New Drop", caption: "Just uploaded something 🔥 Check your DMs for the preview", type: "post" },
    { label: "Exclusive BTS", caption: "Exclusive behind-the-scenes from today's shoot 📸", type: "behind_scenes" },
  ],
};

const ContentCommandCenter = () => {
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [rewritingCaption, setRewritingCaption] = useState(false);
  const [crossPostPlatforms, setCrossPostPlatforms] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [engagementPredicting, setEngagementPredicting] = useState(false);
  const { performAction, insufficientModal, closeInsufficientModal } = useCreditAction();

  // ── New feature states ──
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  const [generatingAB, setGeneratingAB] = useState(false);
  const [abVariants, setAbVariants] = useState<string[]>([]);
  const [showRecycler, setShowRecycler] = useState(false);
  const [showSeriesPlanner, setShowSeriesPlanner] = useState(false);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesCount, setSeriesCount] = useState(3);
  const [generatingSeries, setGeneratingSeries] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [generatingFromImage, setGeneratingFromImage] = useState(false);
  const [generatingTrends, setGeneratingTrends] = useState(false);
  const [trendIdeas, setTrendIdeas] = useState<any[]>([]);
  const [showTrends, setShowTrends] = useState(false);
  const [smartScheduling, setSmartScheduling] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Inter-Tab Competitor Intel States ──
  const [competitorProfiles, setCompetitorProfiles] = useState<any[]>([]);
  const [showCompetitorSync, setShowCompetitorSync] = useState(false);
  const [importingCompetitorPlan, setImportingCompetitorPlan] = useState(false);
  const [importingCompetitorHashtags, setImportingCompetitorHashtags] = useState(false);
  const [generatingSwotContent, setGeneratingSwotContent] = useState(false);
  const [generatingGapContent, setGeneratingGapContent] = useState(false);
  const [generatingBestTimes, setGeneratingBestTimes] = useState(false);
  const [competitorBestTimes, setCompetitorBestTimes] = useState<any[]>([]);
  const [showCompetitorBestTimes, setShowCompetitorBestTimes] = useState(false);

  // ── Ultimate Content Features ──
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [hooks, setHooks] = useState<string[]>([]);
  const [translating, setTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [videoScript, setVideoScript] = useState<any>(null);
  const [showThreadBuilder, setShowThreadBuilder] = useState(false);
  const [threadParts, setThreadParts] = useState<string[]>([""]);
  const [generatingThread, setGeneratingThread] = useState(false);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState<{title: string; body: string; cta: string}[]>([]);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);
  const [showPillars, setShowPillars] = useState(false);
  const [contentPillars, setContentPillars] = useState<any[]>([]);
  const [generatingPillars, setGeneratingPillars] = useState(false);
  const [showCompetitorInspire, setShowCompetitorInspire] = useState(false);
  const [competitorIdeas, setCompetitorIdeas] = useState<any[]>([]);
  const [generatingCompetitor, setGeneratingCompetitor] = useState(false);
  const [competitorHandle, setCompetitorHandle] = useState("");
  const [multiPublishing, setMultiPublishing] = useState(false);
  const [generatingToneAnalysis, setGeneratingToneAnalysis] = useState(false);
  const [toneAnalysis, setToneAnalysis] = useState<any>(null);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [storyboardScenes, setStoryboardScenes] = useState<any[]>([]);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);

  // ── Production-grade features ──
  const [showContentBrief, setShowContentBrief] = useState(false);
  const [contentBrief, setContentBrief] = useState<any>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefTopic, setBriefTopic] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{done: number; total: number} | null>(null);
  const [showHashtagBank, setShowHashtagBank] = useState(false);
  const [hashtagSets, setHashtagSets] = useState<{name: string; tags: string[]; platform: string}[]>([]);
  const [newSetName, setNewSetName] = useState("");
  const [showCaptionLibrary, setShowCaptionLibrary] = useState(false);
  const [savedCaptions, setSavedCaptions] = useState<{id: string; text: string; platform: string; label: string; created_at: string}[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [generatingBatchCaptions, setGeneratingBatchCaptions] = useState(false);

  // Create form
  const [formTitle, setFormTitle] = useState("");
  const [formPlatform, setFormPlatform] = useState("");
  const [formType, setFormType] = useState("post");
  const [formAccount, setFormAccount] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formHashtags, setFormHashtags] = useState("");
  const [formCta, setFormCta] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAltText, setFormAltText] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formPrivacy, setFormPrivacy] = useState("PUBLIC_TO_EVERYONE");
  const [formMediaFiles, setFormMediaFiles] = useState<File[]>([]);
  const [formMediaPreviews, setFormMediaPreviews] = useState<string[]>([]);
  const [formExistingMedia, setFormExistingMedia] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [predictedScore, setPredictedScore] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    loadCompetitorProfiles();
    const ch = supabase.channel("content-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_calendar" }, () => loadItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, acctsRes, connsRes] = await Promise.all([
      supabase.from("content_calendar").select("*").order("created_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name"),
      supabase.from("social_connections").select("id, account_id, platform, platform_username, is_connected"),
    ]);
    setItems(itemsRes.data || []);
    setAccounts(acctsRes.data || []);
    setConnections((connsRes.data || []).filter((c: any) => c.is_connected));
    setLoading(false);
  };

  const loadItems = async () => {
    const { data } = await supabase.from("content_calendar").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  const loadCompetitorProfiles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/competitor_profiles?user_id=eq.${session.user.id}&order=created_at.desc`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
      });
      const profiles = await res.json();
      if (Array.isArray(profiles)) setCompetitorProfiles(profiles);
    } catch { /* silent */ }
  };

  // ═══ INTER-TAB 1: Import Competitor Posting Plan ═══
  const importCompetitorPlan = async () => {
    if (competitorProfiles.length === 0) { toast.error("No competitors tracked · Add competitors in Competitor Analyzer first"); return; }
    await performAction('ai_generate_ideas', async () => {
      setImportingCompetitorPlan(true);
      try {
        const compData = competitorProfiles.map(c => ({ username: c.username, platform: c.platform, followers: c.followers, engagementRate: c.engagement_rate, avgLikes: c.avg_likes, postFrequency: c.post_frequency, topHashtags: c.top_hashtags || [], contentTypes: c.content_types || [] }));
        const totalFreq = compData.reduce((s, c) => s + (c.postFrequency || 3), 0);
        const content = await callAI(`You are a social media strategist. Based on these real competitor profiles, generate a 2-week content calendar that COPIES their posting strategy exactly.\n\nCompetitor data:\n${JSON.stringify(compData, null, 2)}\n\nMatch their posting frequency, content types, top hashtags, and optimal times.\nGenerate ${Math.max(totalFreq * 2, 14)} entries.\nEach: {"title":"...", "platform":"instagram/tiktok/twitter/facebook/threads", "content_type":"post/reel/story/tweet", "caption":"full caption with emojis", "hashtags":["tag1"], "scheduled_at":"ISO date next 2 weeks", "viral_score": 40-90, "description":"Based on @competitor strategy"}\n\nReturn ONLY a JSON array.`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const entries = JSON.parse(jsonMatch[0]);
          for (const e of entries) {
            await supabase.from("content_calendar").insert({ title: String(e.title || "Competitor Strategy Post").slice(0, 200), platform: String(e.platform || "instagram").toLowerCase(), content_type: String(e.content_type || "post"), caption: String(e.caption || ""), hashtags: Array.isArray(e.hashtags) ? e.hashtags.map((h: string) => h.replace("#", "")) : [], scheduled_at: e.scheduled_at || new Date(Date.now() + Math.random() * 14 * 86400000).toISOString(), status: "draft", viral_score: e.viral_score || 0, description: e.description || "Imported from Competitor Intel", metadata: { source: "competitor_intel" } });
          }
          toast.success(`${entries.length} posts imported from competitor strategy`);
        }
      } catch (e: any) { toast.error(e.message || "Failed to import plan"); }
      setImportingCompetitorPlan(false);
    });
  };

  // ═══ INTER-TAB 2: Import Competitor Hashtags ═══
  const importCompetitorHashtags = () => {
    if (competitorProfiles.length === 0) { toast.error("No competitors tracked · Add them in Competitor Analyzer first"); return; }
    setImportingCompetitorHashtags(true);
    const allTags = [...new Set(competitorProfiles.flatMap(c => c.top_hashtags || []))];
    if (allTags.length === 0) { toast.error("No hashtags in competitor data"); setImportingCompetitorHashtags(false); return; }
    const newSets = competitorProfiles.filter(c => c.top_hashtags?.length).map(c => ({ name: `Competitor · @${c.username}`, tags: c.top_hashtags, platform: "all" as const }));
    newSets.unshift({ name: "All Competitors · Merged", tags: allTags.slice(0, 30), platform: "all" });
    setHashtagSets(prev => [...prev, ...newSets]);
    toast.success(`${newSets.length} hashtag sets imported (${allTags.length} unique tags)`);
    setImportingCompetitorHashtags(false);
  };

  // ═══ INTER-TAB 3: Competitor Best Times ═══
  const analyzeCompetitorBestTimes = async () => {
    if (competitorProfiles.length === 0) { toast.error("No competitors tracked yet"); return; }
    await performAction('ai_analysis', async () => {
      setGeneratingBestTimes(true);
      try {
        const compData = competitorProfiles.map(c => ({ username: c.username, platform: c.platform, postFrequency: c.post_frequency, engagementRate: c.engagement_rate, followers: c.followers }));
        const content = await callAI(`Analyze these competitor profiles and determine optimal posting times.\n\nCompetitors: ${JSON.stringify(compData)}\n\nFor each platform: platform, best_hours (4-5 times like "9:00 AM"), best_days, frequency (posts/week), reasoning.\n\nReturn ONLY JSON array.`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { setCompetitorBestTimes(JSON.parse(jsonMatch[0])); setShowCompetitorBestTimes(true); toast.success("Best posting times analyzed"); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingBestTimes(false);
    });
  };

  // ═══ INTER-TAB 4: SWOT Content Ideas ═══
  const generateSwotContent = async () => {
    if (competitorProfiles.length === 0) { toast.error("No competitors tracked yet"); return; }
    await performAction('ai_generate_ideas', async () => {
      setGeneratingSwotContent(true);
      try {
        const compSummary = competitorProfiles.map(c => `@${c.username} (${c.platform}): ${c.followers} followers, ${c.engagement_rate}% ER, ${c.post_frequency} posts/wk`).join("\n");
        const content = await callAI(`Based on competitive SWOT analysis, generate 8 content ideas exploiting competitor weaknesses.\n\nCompetitors:\n${compSummary}\n\nFor each: title, platform, content_type, caption (full), hashtags array, swot_angle (strength/weakness/opportunity/threat), strategy, viral_score 40-95.\n\nReturn ONLY a JSON array.`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const ideas = JSON.parse(jsonMatch[0]);
          for (const idea of ideas) { await supabase.from("content_calendar").insert({ title: idea.title, caption: idea.caption, platform: idea.platform || "instagram", content_type: idea.content_type || "post", hashtags: (idea.hashtags || []).map((h: string) => h.replace("#", "")), viral_score: idea.viral_score || 0, description: `SWOT: ${idea.swot_angle} · ${idea.strategy || ""}`, status: "draft", metadata: { source: "swot_analysis" } }); }
          toast.success(`${ideas.length} SWOT-driven content ideas created`);
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingSwotContent(false);
    });
  };

  // ═══ INTER-TAB 5: Gap Analysis Content ═══
  const generateGapContent = async () => {
    if (competitorProfiles.length === 0) { toast.error("No competitors tracked yet"); return; }
    await performAction('ai_generate_ideas', async () => {
      setGeneratingGapContent(true);
      try {
        const myContent = items.slice(0, 20).map(i => `${i.platform}/${i.content_type}: "${i.title}"`).join("\n");
        const compSummary = competitorProfiles.map(c => `@${c.username} (${c.platform}): ${c.followers} followers, types: ${JSON.stringify(c.content_types || [])}`).join("\n");
        const content = await callAI(`Content gap analysis: Find what I'm MISSING vs competitors.\n\nMY CONTENT:\n${myContent || "No content yet"}\n\nCOMPETITORS:\n${compSummary}\n\nFind 6 gaps. Each: title, platform, content_type, caption, hashtags, gap_identified, competitor_doing_it, estimated_impact (high/medium/critical), viral_score 50-90.\n\nReturn ONLY JSON array.`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const ideas = JSON.parse(jsonMatch[0]);
          for (const idea of ideas) { await supabase.from("content_calendar").insert({ title: idea.title, caption: idea.caption, platform: idea.platform || "instagram", content_type: idea.content_type || "post", hashtags: (idea.hashtags || []).map((h: string) => h.replace("#", "")), viral_score: idea.viral_score || 0, description: `Gap: ${idea.gap_identified} · Impact: ${idea.estimated_impact}`, status: "draft", metadata: { source: "gap_analysis" } }); }
          toast.success(`${ideas.length} gap analysis posts created`);
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingGapContent(false);
    });
  };

  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    connections.forEach(c => platforms.add(c.platform));
    ["onlyfans", "instagram", "tiktok", "twitter", "facebook", "threads"].forEach(p => platforms.add(p));
    return Array.from(platforms);
  }, [connections]);

  const connForPlatform = (platform: string) => connections.find(c => c.platform === platform);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (accountFilter !== "all" && i.account_id !== accountFilter) return false;
      if (platformFilter !== "all" && i.platform !== platformFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = (i.title || "").toLowerCase().includes(q) ||
          (i.caption || "").toLowerCase().includes(q) ||
          (i.hashtags || []).some((h: string) => h.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (activeTab === "scheduled") return i.status === "scheduled" || i.status === "planned";
      if (activeTab === "published") return i.status === "published";
      if (activeTab === "drafts") return i.status === "draft";
      return true;
    });
  }, [items, accountFilter, platformFilter, statusFilter, activeTab, searchQuery]);

  const platformConf = (p: string) => PLATFORM_CONFIG[p] || PLATFORM_CONFIG.onlyfans;

  const resetForm = () => {
    setFormTitle(""); setFormPlatform(""); setFormType("post"); setFormAccount("");
    setFormCaption(""); setFormDesc(""); setFormHashtags(""); setFormCta("");
    setFormSchedule(""); setFormLocation(""); setFormAltText(""); setFormLink("");
    setFormPrivacy("PUBLIC_TO_EVERYONE"); setFormMediaFiles([]); setFormMediaPreviews([]);
    setFormExistingMedia([]); setEditingId(null); setPredictedScore(null);
    setCrossPostPlatforms([]); setAbVariants([]);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formMediaFiles.length + formExistingMedia.length > 10) {
      toast.error("Maximum 10 media files"); return;
    }
    setFormMediaFiles(prev => [...prev, ...files]);
    setFormMediaPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeNewMedia = (idx: number) => {
    setFormMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setFormMediaPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingMedia = (idx: number) => {
    setFormExistingMedia(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (formMediaFiles.length === 0) return formExistingMedia;
    setUploading(true);
    const urls: string[] = [...formExistingMedia];
    for (const file of formMediaFiles) {
      const ext = file.name.split('.').pop();
      const path = `content/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file);
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data: urlData } = supabase.storage.from("social-media").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  // ─── Helper: call AI and parse streamed response ───
  const callAI = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("agency-copilot", {
      body: { messages: [{ role: "user", content: prompt }] },
    });
    if (error) throw error;
    // Handle various response types: string, ArrayBuffer, or already-parsed JSON
    let text: string;
    if (typeof data === "string") {
      text = data;
    } else if (data instanceof ArrayBuffer || (data && typeof data.byteLength === 'number')) {
      text = new TextDecoder().decode(data as ArrayBuffer);
    } else if (typeof data === "object" && data !== null) {
      // Already parsed JSON from edge function
      const choices = data.choices;
      if (choices?.[0]?.message?.content) return choices[0].message.content;
      if (choices?.[0]?.delta?.content) return choices[0].delta.content;
      return JSON.stringify(data);
    } else {
      text = String(data);
    }
    let content = "";
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      try { const p = JSON.parse(line.slice(6)); content += p.choices?.[0]?.delta?.content || ""; } catch {}
    }
    return content || text;
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 1: AI Caption Rewrite (existing — upgraded)
  // ════════════════════════════════════════════════════════
  const rewriteCaption = async (style: "engaging" | "viral" | "professional" | "casual" | "storytelling" | "controversial") => {
    if (!formCaption.trim()) { toast.error("Write a caption first"); return; }
    await performAction('ai_rewrite_caption', async () => {
      setRewritingCaption(true);
      try {
        const styleGuide: Record<string, string> = {
          engaging: "more conversational with a strong CTA, questions that spark replies",
          viral: "extremely shareable with hooks, pattern interrupts, and engagement triggers",
          professional: "polished, brand-safe, authoritative tone",
          casual: "relaxed, authentic, like texting a friend",
          storytelling: "narrative-driven with a beginning, middle, and end. Use suspense and emotional hooks",
          controversial: "bold hot take that sparks debate. Polarizing but not offensive. Gets people commenting",
        };
        const content = await callAI(`Rewrite this caption in a ${style} style: ${styleGuide[style]}.

Caption: "${formCaption}"
Platform: ${formPlatform || "instagram"}

Rules:
- Keep it SHORT: 10-15 words max
- Every word must earn its place
- Play on emotion: curiosity, desire, FOMO, urgency
- 1-2 emojis max, naturally placed
- End with a hook or CTA
- No hashtags
- Think punchy copywriting, not paragraphs

Respond ONLY with the rewritten caption.`);
        if (content.trim()) {
          setFormCaption(content.trim());
          toast.success(`Caption rewritten (${style} style)`);
        }
      } catch (e: any) { toast.error(e.message); }
      setRewritingCaption(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 2: AI Engagement Prediction (existing — upgraded)
  // ════════════════════════════════════════════════════════
  const predictEngagement = async () => {
    if (!formCaption.trim() && !formTitle.trim()) { toast.error("Add content first"); return; }
    await performAction('predict_engagement', async () => {
      setEngagementPredicting(true);
      try {
        const content = await callAI(`Analyze this social media post and predict engagement score (0-100). Consider platform algorithm preferences, content type, caption quality, hashtag relevance, and posting time.

Platform: ${formPlatform || "instagram"}
Content type: ${formType}
Title: ${formTitle}
Caption: "${formCaption}"
Hashtags: ${formHashtags || "none"} (limit: ${platformConf(formPlatform || "instagram").hashtagLimit})
Has media: ${formMediaFiles.length + formExistingMedia.length > 0 ? "yes" : "no"}
Scheduled time: ${formSchedule || "not set"}

Score breakdown:
- Hook strength (does it stop the scroll?)
- CTA effectiveness
- Hashtag optimization for ${platformConf(formPlatform || "instagram").label}
- Media presence impact
- Posting time optimization

Respond with ONLY a JSON object: {"score": number, "tips": ["tip1", "tip2", "tip3"], "best_time": "HH:MM AM/PM", "hook_score": number, "cta_score": number, "hashtag_score": number}`);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          setPredictedScore(result.score || 0);
          const tips = result.tips || [];
          toast.success(`Score: ${result.score}/100 | Hook: ${result.hook_score || '?'} | CTA: ${result.cta_score || '?'}${tips[0] ? ` — ${tips[0]}` : ''}`);
        }
      } catch (e: any) { toast.error(e.message); }
      setEngagementPredicting(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 3: AI Hashtag Generator (NEW)
  // ════════════════════════════════════════════════════════
  const generateHashtags = async () => {
    if (!formCaption.trim() && !formTitle.trim()) { toast.error("Add content first"); return; }
    await performAction('ai_generate_ideas', async () => {
      setGeneratingHashtags(true);
      try {
        const limit = platformConf(formPlatform || "instagram").hashtagLimit;
        const content = await callAI(`Generate the PERFECT hashtag set for this ${formPlatform || "instagram"} ${formType}.

Caption: "${formCaption || formTitle}"
Platform: ${formPlatform || "instagram"} (max ${limit} hashtags)

Strategy:
- 30% high-volume (500K+ posts) for discovery
- 40% medium-volume (50K-500K) for competition balance
- 30% niche/specific (under 50K) for targeted reach
- Include trending hashtags relevant to the content
- Platform-specific: ${formPlatform === "twitter" ? "Keep to 3-5 max for engagement" : formPlatform === "tiktok" ? "Include FYP and trending sounds hashtags" : "Mix branded + community hashtags"}

Respond ONLY with comma-separated hashtags (no # prefix, no explanations): hashtag1, hashtag2, hashtag3...`);
        if (content.trim()) {
          const cleaned = content.replace(/#/g, "").trim();
          setFormHashtags(cleaned);
          const count = cleaned.split(",").filter(h => h.trim()).length;
          toast.success(`${count} optimized hashtags generated for ${platformConf(formPlatform || "instagram").label}`);
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingHashtags(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 4: A/B Caption Testing (NEW)
  // ════════════════════════════════════════════════════════
  const generateABVariants = async () => {
    if (!formCaption.trim()) { toast.error("Write a caption first"); return; }
    await performAction('ai_generate_ideas', async () => {
      setGeneratingAB(true);
      try {
        const content = await callAI(`Generate 3 A/B test caption variants for this ${formPlatform || "instagram"} ${formType}.

Original caption: "${formCaption}"
Platform: ${formPlatform || "instagram"} (max ${platformConf(formPlatform || "instagram").maxCaption} chars)

Each variant should use a DIFFERENT angle:
- Variant A: Emotional / story-driven approach
- Variant B: Direct / value-first approach  
- Variant C: Controversial / hot-take approach

All must be complete, ready-to-post captions with emojis and CTAs.

Respond ONLY with JSON array: ["variant A caption", "variant B caption", "variant C caption"]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const variants = JSON.parse(jsonMatch[0]);
          setAbVariants(variants);
          toast.success("3 A/B variants generated — pick the best one!");
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingAB(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 5: Bulk Actions (NEW)
  // ════════════════════════════════════════════════════════
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedItems.size === filtered.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(filtered.map(i => i.id)));
  };
  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;
    const count = selectedItems.size;
    await performAction('delete_item', async () => {
      const { error } = await supabase.from("content_calendar").delete().in("id", Array.from(selectedItems));
      if (error) toast.error(error.message);
      else { toast.success(`${count} items deleted`); setSelectedItems(new Set()); setBulkMode(false); }
    });
  };
  const bulkChangeStatus = async (status: string) => {
    if (selectedItems.size === 0) return;
    const count = selectedItems.size;
    await performAction('update_status', async () => {
      const { error } = await supabase.from("content_calendar").update({
        status, ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
      }).in("id", Array.from(selectedItems));
      if (error) toast.error(error.message);
      else { toast.success(`${count} items → ${status}`); setSelectedItems(new Set()); setBulkMode(false); }
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 6: Content Recycler (NEW)
  // ════════════════════════════════════════════════════════
  const recycleContent = async (item: any, targetPlatform: string) => {
    const conf = platformConf(targetPlatform);
    await performAction('ai_rewrite_caption', async () => {
      try {
        const content = await callAI(`Repurpose this ${item.platform} ${item.content_type} for ${conf.label}.

Original caption: "${item.caption || item.title}"
Original platform: ${item.platform}
Target platform: ${conf.label}
Target content type: ${conf.supportedTypes[0]}
Target character limit: ${conf.maxCaption}

Rules:
- Completely rewrite for ${conf.label}'s audience and algorithm
- Adjust tone, length, and format for ${conf.label}
- Keep the core message but make it native to the platform
- Add platform-specific engagement hooks

Respond ONLY with the new caption, nothing else.`);
        if (content.trim()) {
          const { error } = await supabase.from("content_calendar").insert({
            title: `${item.title} → ${conf.label}`,
            caption: content.trim().substring(0, conf.maxCaption),
            platform: targetPlatform,
            content_type: conf.supportedTypes[0],
            hashtags: item.hashtags || [],
            media_urls: item.media_urls || null,
            account_id: item.account_id || null,
            status: "draft",
            metadata: { recycled_from: item.id },
          });
          if (error) toast.error(error.message);
          else toast.success(`Recycled to ${conf.label} with AI-adapted caption`);
        }
      } catch (e: any) { toast.error(e.message); }
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 7: AI Caption from Image (NEW)
  // ════════════════════════════════════════════════════════
  const generateCaptionFromImage = async () => {
    if (formMediaPreviews.length === 0 && formExistingMedia.length === 0) {
      toast.error("Upload an image first"); return;
    }
    await performAction('ai_generate_ideas', async () => {
      setGeneratingFromImage(true);
      try {
        const content = await callAI(`Generate a short, sharp, emotionally punchy ${formPlatform || "instagram"} caption in under 15 words. 

Platform: ${formPlatform || "instagram"}
Content type: ${formType}
Context: ${formMediaFiles.length + formExistingMedia.length} media file(s) uploaded
Title: "${formTitle || "no title"}"
Notes: "${formDesc || "none"}"

Rules:
- Maximum 10-15 words. Be concise, punchy, emotional
- Play on curiosity, desire, FOMO, or raw emotion
- No fluff, no filler words
- Use 1-2 emojis max, placed naturally
- Include a subtle CTA or engagement hook
- Make every single word count
- Think like a copywriter, not a blogger
- DO NOT include hashtags (those are added separately)

Respond ONLY with the caption text, nothing else.`);
        if (content.trim()) {
          setFormCaption(content.trim());
          toast.success("AI caption generated from content context");
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingFromImage(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 8: Trending Content Ideas (NEW)
  // ════════════════════════════════════════════════════════
  const generateTrendIdeas = async () => {
    const targetPlatform = formPlatform || platformFilter !== "all" ? (formPlatform || platformFilter) : "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingTrends(true);
      try {
        const content = await callAI(`Generate 5 trending content ideas for ${platformConf(targetPlatform).label} right now.

Platform: ${platformConf(targetPlatform).label}
Connected account: ${connForPlatform(targetPlatform)?.platform_username || "general"}

For each idea:
- title: catchy internal name
- caption: FULL ready-to-post caption
- content_type: ${platformConf(targetPlatform).supportedTypes.join(" or ")}
- hashtags: ["tag1", "tag2", ...] (${platformConf(targetPlatform).hashtagLimit} max)
- trend_source: what trend this is based on
- urgency: "now" | "this_week" | "evergreen"
- viral_potential: 1-100

Focus on:
- Current viral formats and trends for ${platformConf(targetPlatform).label}
- Algorithm-friendly content structures
- High engagement hooks
- Seasonal/timely content

Respond ONLY with JSON array: [{"title":"", "caption":"", "content_type":"", "hashtags":[], "trend_source":"", "urgency":"", "viral_potential": number}]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const ideas = JSON.parse(jsonMatch[0]);
          setTrendIdeas(ideas.map((i: any) => ({ ...i, platform: targetPlatform })));
          setShowTrends(true);
          toast.success(`${ideas.length} trending ideas for ${platformConf(targetPlatform).label}`);
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingTrends(false);
    });
  };

  const applyTrendIdea = async (idea: any) => {
    await performAction('create_content', async () => {
      const { error } = await supabase.from("content_calendar").insert({
        title: idea.title,
        caption: idea.caption,
        platform: idea.platform,
        content_type: idea.content_type || "post",
        hashtags: idea.hashtags || [],
        viral_score: idea.viral_potential || 0,
        description: `Trend: ${idea.trend_source || "AI generated"} | Urgency: ${idea.urgency || "evergreen"}`,
        status: "draft",
        engagement_prediction: idea.viral_potential || 0,
      });
      if (error) toast.error(error.message);
      else toast.success(`"${idea.title}" saved as draft`);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 9: Content Series Planner (NEW)
  // ════════════════════════════════════════════════════════
  const generateSeries = async () => {
    if (!seriesTitle.trim()) { toast.error("Enter a series topic"); return; }
    const targetPlatform = formPlatform || platformFilter !== "all" ? (formPlatform || platformFilter) : "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingSeries(true);
      try {
        const content = await callAI(`Create a ${seriesCount}-part content series for ${platformConf(targetPlatform).label}.

Series topic: "${seriesTitle}"
Platform: ${platformConf(targetPlatform).label}
Number of posts: ${seriesCount}
Available content types: ${platformConf(targetPlatform).supportedTypes.join(", ")}

For each post in the series:
- title: "Series Name Part X/Y"
- caption: Full ready-to-post caption with series branding
- content_type: appropriate type for this platform
- hashtags: ["tag1", ...] include series-specific hashtag
- part_number: 1, 2, 3...
- hook: what makes this part compelling
- schedule_offset_days: 0, 2, 4... (spacing between posts)

Make it a cohesive narrative arc:
- Part 1: Hook / problem statement
- Middle parts: Deep value / transformation
- Final part: Conclusion / big CTA

Respond ONLY with JSON array: [{"title":"", "caption":"", "content_type":"", "hashtags":[], "part_number": number, "hook":"", "schedule_offset_days": number}]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parts = JSON.parse(jsonMatch[0]);
          for (const part of parts) {
            const schedDate = addDays(new Date(), part.schedule_offset_days || 0);
            await supabase.from("content_calendar").insert({
              title: part.title,
              caption: part.caption,
              platform: targetPlatform,
              content_type: part.content_type || "post",
              hashtags: part.hashtags || [],
              description: `Series: ${seriesTitle} | Part ${part.part_number}/${seriesCount} | ${part.hook || ""}`,
              status: "draft",
              scheduled_at: schedDate.toISOString(),
              metadata: { series: seriesTitle, part: part.part_number, total_parts: seriesCount },
            });
          }
          toast.success(`${parts.length}-part series "${seriesTitle}" created!`);
          setShowSeriesPlanner(false);
          setSeriesTitle("");
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingSeries(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 10: Smart Scheduling (NEW)
  // ════════════════════════════════════════════════════════
  const suggestSchedule = async () => {
    const targetPlatform = formPlatform || "instagram";
    await performAction('ai_analysis', async () => {
      setSmartScheduling(true);
      try {
        const publishedItems = items.filter(i => i.platform === targetPlatform && i.status === "published");
        const scheduledItems = items.filter(i => i.platform === targetPlatform && (i.status === "scheduled" || i.status === "planned"));
        const content = await callAI(`Suggest the 5 best times to schedule a ${formType} on ${platformConf(targetPlatform).label}.

Platform: ${platformConf(targetPlatform).label}
Known best times: ${platformConf(targetPlatform).bestTimes.join(", ")}
Already published: ${publishedItems.length} posts
Already scheduled: ${scheduledItems.map(i => i.scheduled_at ? format(new Date(i.scheduled_at), "EEE h:mm a") : "").filter(Boolean).join(", ") || "none"}
Content type: ${formType}
Today's date: ${format(new Date(), "EEEE, MMM d, yyyy")}

Consider:
- Avoid time conflicts with already scheduled posts
- ${platformConf(targetPlatform).label}'s peak engagement windows
- Day of week optimization
- Content type timing (${formType === "reel" || formType === "story" ? "video content performs better in evenings" : "posts perform well mid-day"})

Respond ONLY with JSON array of ISO datetime strings for the next 7 days: ["2025-01-01T14:00:00", ...]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const slots = JSON.parse(jsonMatch[0]);
          setSuggestedSlots(slots);
          toast.success("Smart schedule suggestions ready");
        }
      } catch (e: any) { toast.error(e.message); }
      setSmartScheduling(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 11: AI Hook Generator
  // ════════════════════════════════════════════════════════
  const generateHooks = async () => {
    const platform = formPlatform || "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingHooks(true);
      try {
        const content = await callAI(`Generate 5 scroll-stopping hooks for a ${platformConf(platform).label} ${formType}.
Context: "${formCaption || formTitle || "general content"}"
Platform: ${platformConf(platform).label}
Rules:
- Each hook is the FIRST LINE only (max 15 words)
- Must create curiosity gap, shock value, or emotional pull
- Use pattern interrupts ("POV:", "Nobody talks about...", "Stop scrolling if...")
- Platform-specific: ${platform === "tiktok" ? "TikTok hooks need to be punchy under 3 seconds" : platform === "twitter" ? "Tweet hooks must work standalone" : "Instagram hooks should pair with visuals"}
Respond ONLY with JSON array: ["hook1", "hook2", "hook3", "hook4", "hook5"]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { setHooks(JSON.parse(jsonMatch[0])); toast.success("5 scroll-stopping hooks generated"); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingHooks(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 12: Caption Translator
  // ════════════════════════════════════════════════════════
  const translateCaption = async (lang: string) => {
    if (!formCaption.trim()) { toast.error("Write a caption first"); return; }
    await performAction('ai_rewrite_caption', async () => {
      setTranslating(true);
      try {
        const content = await callAI(`Translate this caption to ${lang}. Keep same tone, emojis, style. Keep hashtags in English.
Original: "${formCaption}"
Respond ONLY with the translated caption.`);
        if (content.trim()) { setFormCaption(content.trim()); toast.success(`Translated to ${lang}`); }
      } catch (e: any) { toast.error(e.message); }
      setTranslating(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 13: AI Video/Reel Script Generator
  // ════════════════════════════════════════════════════════
  const generateVideoScript = async () => {
    const platform = formPlatform || "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingScript(true);
      try {
        const content = await callAI(`Create a detailed video/reel script for ${platformConf(platform).label}.
Topic: "${formCaption || formTitle || "trending content"}"
Duration: ${platform === "tiktok" ? "15-60 seconds" : "30-90 seconds"}
Structure: hook (first 3s text), scenes array [{timestamp, visual, narration, text_overlay, transition}], cta, music_mood, caption, hashtags array
Respond ONLY with JSON: {"hook":"", "scenes":[{"timestamp":"0-3s", "visual":"", "narration":"", "text_overlay":"", "transition":""}], "cta":"", "music_mood":"", "caption":"", "hashtags":[]}`);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) { setVideoScript(JSON.parse(jsonMatch[0])); toast.success("Video script generated"); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingScript(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 14: Thread Builder (Twitter/Threads)
  // ════════════════════════════════════════════════════════
  const generateThread = async () => {
    if (!formCaption.trim() && !formTitle.trim()) { toast.error("Add a topic first"); return; }
    await performAction('ai_generate_ideas', async () => {
      setGeneratingThread(true);
      try {
        const platform = formPlatform === "threads" ? "Threads" : "X / Twitter";
        const maxLen = formPlatform === "threads" ? 500 : 280;
        const content = await callAI(`Create a viral ${platform} thread (5-7 parts).
Topic: "${formCaption || formTitle}"
Rules: Part 1: Hook + "🧵👇". Parts 2-5: ONE insight each, max ${maxLen} chars. Part 6: Summary. Part 7: CTA.
Respond ONLY with JSON array: ["Part 1", "Part 2", ...]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { const parts = JSON.parse(jsonMatch[0]); setThreadParts(parts); toast.success(`${parts.length}-part thread generated`); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingThread(false);
    });
  };

  const publishThread = async () => {
    const platform = formPlatform === "threads" ? "threads" : "twitter";
    const conn = connForPlatform(platform);
    if (!conn) { toast.error(`Connect ${platform} first`); return; }
    await performAction('publish_content', async () => {
      try {
        for (let i = 0; i < threadParts.length; i++) {
          const fnName = platform === "twitter" ? "twitter-api" : "threads-api";
          const action = platform === "twitter" ? "create_tweet" : "create_text_thread";
          await supabase.functions.invoke(fnName, { body: { action, account_id: conn.account_id, params: { text: threadParts[i] } } });
          await supabase.from("content_calendar").insert({ title: `Thread ${i + 1}/${threadParts.length}`, caption: threadParts[i], platform, content_type: platform === "threads" ? "post" : "tweet", status: "published", published_at: new Date().toISOString(), metadata: { thread: true, part: i + 1, total: threadParts.length } });
        }
        toast.success(`${threadParts.length}-part thread published!`);
        setShowThreadBuilder(false); setThreadParts([""]);
      } catch (e: any) { toast.error(`Thread publish failed: ${e.message}`); }
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 15: AI Carousel Slide Generator
  // ════════════════════════════════════════════════════════
  const generateCarousel = async () => {
    await performAction('ai_generate_ideas', async () => {
      setGeneratingCarousel(true);
      try {
        const content = await callAI(`Create a viral carousel for ${platformConf(formPlatform || "instagram").label} (7-10 slides).
Topic: "${formCaption || formTitle || "value-driven content"}"
Slide 1: Hook (curiosity + bold claim). Slides 2-8: ONE insight per slide. Slide 9: Summary. Slide 10: CTA.
Respond ONLY with JSON array: [{"title":"", "body":"", "cta":""}]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { const slides = JSON.parse(jsonMatch[0]); setCarouselSlides(slides); toast.success(`${slides.length}-slide carousel generated`); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingCarousel(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 16: Content Pillar Strategy
  // ════════════════════════════════════════════════════════
  const generatePillars = async () => {
    await performAction('ai_generate_ideas', async () => {
      setGeneratingPillars(true);
      try {
        const connPlatforms = [...new Set(connections.map(c => c.platform))];
        const content = await callAI(`Create 5 content pillars for a creator/brand.
Platforms: ${connPlatforms.join(", ") || "instagram, tiktok"}
Existing content: ${items.length} posts
For each: name (2-3 words), description, percentage (sum=100), content_types array, posting_frequency, example_topics (3), platforms array, color (text-pink-400/text-blue-400/text-emerald-400/text-amber-400/text-purple-400)
Respond ONLY with JSON array: [{"name":"", "description":"", "percentage": number, "content_types":[], "posting_frequency":"", "example_topics":[], "platforms":[], "color":""}]`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { setContentPillars(JSON.parse(jsonMatch[0])); setShowPillars(true); toast.success("Content pillar strategy generated"); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingPillars(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 17: Competitor-Inspired Content
  // ════════════════════════════════════════════════════════
  const generateCompetitorInspired = async () => {
    const platform = formPlatform || platformFilter !== "all" ? (formPlatform || platformFilter) : "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingCompetitor(true);
      try {
        const content = await callAI(`Generate 5 competitor-inspired content ideas for ${platformConf(platform).label}.
${competitorHandle ? `Inspired by: @${competitorHandle}` : "Based on current viral patterns"}
For each: title, strategy, caption (full), content_type, hashtags[], why_it_works, difficulty (easy/medium/hard), estimated_reach (low/medium/high/viral)
Respond ONLY with JSON array.`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { setCompetitorIdeas(JSON.parse(jsonMatch[0]).map((i: any) => ({ ...i, platform }))); setShowCompetitorInspire(true); toast.success("Competitor-inspired ideas ready"); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingCompetitor(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 18: Multi-Platform Simultaneous Publish
  // ════════════════════════════════════════════════════════
  const multiPlatformPublish = async (item: any) => {
    const targets = connections.map(c => c.platform).filter(p => p !== "onlyfans");
    if (targets.length === 0) { toast.error("No platforms connected"); return; }
    setMultiPublishing(true);
    let successCount = 0;
    for (const platform of targets) {
      const conn = connForPlatform(platform);
      if (!conn) continue;
      try {
        const conf = platformConf(platform);
        const caption = [((item.caption || item.title || "").substring(0, conf.maxCaption)), ...(item.hashtags?.map((h: string) => `#${h}`) || [])].join(" ");
        const mediaUrls: string[] = Array.isArray(item.media_urls) ? item.media_urls : [];
        let action: string, params: any = {};
        if (platform === "twitter") { action = "create_tweet"; params = { text: caption.substring(0, 280) }; }
        else if (platform === "threads") { action = mediaUrls.length > 0 ? "create_image_thread" : "create_text_thread"; params = mediaUrls.length > 0 ? { image_url: mediaUrls[0], text: caption } : { text: caption }; }
        else if (platform === "facebook") { action = mediaUrls.length > 0 ? "create_photo_post" : "create_post"; params = mediaUrls.length > 0 ? { image_url: mediaUrls[0], caption } : { message: caption }; }
        else if (platform === "instagram") { action = mediaUrls.length > 1 ? "create_carousel" : "create_photo_post"; params = mediaUrls.length > 1 ? { items: mediaUrls.map(u => ({ image_url: u })), caption } : { image_url: mediaUrls[0], caption }; }
        else if (platform === "tiktok") { action = "publish_photo"; params = { image_urls: mediaUrls, title: item.title, description: caption, privacy_level: "PUBLIC_TO_EVERYONE", disable_comment: false, disable_duet: false, disable_stitch: false, brand_content_toggle: false, brand_organic_toggle: false }; }
        else continue;
        const fnName = platform === "twitter" ? "twitter-api" : `${platform}-api`;
        await supabase.functions.invoke(fnName, { body: { action, account_id: conn.account_id, params } });
        successCount++;
      } catch (e: any) { toast.error(`${platform}: ${e.message}`); }
    }
    if (successCount > 0) {
      await supabase.from("content_calendar").update({ status: "published", published_at: new Date().toISOString(), metadata: { ...(item.metadata || {}), multi_published: true, published_to: targets } }).eq("id", item.id);
      toast.success(`Published to ${successCount} platforms!`);
    }
    setMultiPublishing(false); setShowDetail(null);
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 19: AI Tone Analyzer
  // ════════════════════════════════════════════════════════
  const analyzeTone = async () => {
    if (!formCaption.trim()) { toast.error("Write a caption first"); return; }
    await performAction('ai_analysis', async () => {
      setGeneratingToneAnalysis(true);
      try {
        const content = await callAI(`Analyze tone and effectiveness of this ${formPlatform || "social media"} caption.
Caption: "${formCaption}"
Return: tone, readability (1-10), emotion, power_words (count), improvements (3 strings), cta_strength (1-10), scroll_stop_score (1-10), brand_safety (safe/edgy/risky)
Respond ONLY with JSON.`);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) { const a = JSON.parse(jsonMatch[0]); setToneAnalysis(a); toast.success(`Tone: ${a.tone} | Scroll-stop: ${a.scroll_stop_score}/10`); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingToneAnalysis(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 20: Reel/Story Storyboard Generator
  // ════════════════════════════════════════════════════════
  const generateStoryboard = async () => {
    const platform = formPlatform || "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingStoryboard(true);
      try {
        const content = await callAI(`Create a ${formType === "story" ? "Story sequence (5-8 slides)" : "Reel storyboard (15-60s)"} for ${platformConf(platform).label}.
Topic: "${formCaption || formTitle || "engaging content"}"
For each scene: scene_number, duration, visual, text_overlay, audio, transition, engagement (interactive element), camera direction
Respond ONLY with JSON array.`);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) { const scenes = JSON.parse(jsonMatch[0]); setStoryboardScenes(scenes); setShowStoryboard(true); toast.success(`${scenes.length}-scene storyboard created`); }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingStoryboard(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 21: AI Content Brief Generator
  // ════════════════════════════════════════════════════════
  const generateContentBrief = async () => {
    if (!briefTopic.trim()) { toast.error("Enter a topic for the brief"); return; }
    const platform = formPlatform || platformFilter !== "all" ? (formPlatform || platformFilter) : "instagram";
    await performAction('ai_generate_ideas', async () => {
      setGeneratingBrief(true);
      try {
        const content = await callAI(`Create a detailed content brief for a ${platformConf(platform).label} campaign.
Topic: "${briefTopic}"
Platform: ${platformConf(platform).label}
Existing content count: ${items.length}
Connected platforms: ${connections.map(c => c.platform).join(", ") || "none"}

Generate a comprehensive production brief with:
- campaign_name: catchy name
- objective: primary goal (awareness/engagement/conversion/community)
- target_audience: demographics, interests, pain points
- key_messages: array of 3-5 core messages
- content_mix: array of {type, quantity, platform, description}
- tone_guidelines: voice, dos and donts
- visual_direction: style, colors, mood
- hashtag_strategy: primary (3), secondary (5), campaign-specific (2)
- posting_schedule: recommended cadence per platform
- success_metrics: KPIs to track
- competitor_angles: 3 ways to differentiate
- hook_templates: 5 scroll-stopping first lines
- cta_options: 5 call-to-action variations

Respond ONLY with JSON object.`);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setContentBrief(JSON.parse(jsonMatch[0]));
          toast.success("Content brief generated — ready for execution");
        }
      } catch (e: any) { toast.error(e.message); }
      setGeneratingBrief(false);
    });
  };

  const executeBrief = async (brief: any) => {
    if (!brief?.content_mix) return;
    await performAction('ai_generate_ideas', async () => {
      setGenerating(true);
      let created = 0;
      for (const mix of brief.content_mix) {
        for (let i = 0; i < Math.min(mix.quantity || 1, 3); i++) {
          try {
            const caption = await callAI(`Create a ${mix.platform || "instagram"} ${mix.type || "post"} caption.
Brief context: Campaign "${brief.campaign_name}", objective: ${brief.objective}.
Key message: ${brief.key_messages?.[i % brief.key_messages.length] || mix.description}
Tone: ${brief.tone_guidelines || "engaging"}
Hook: Use one of these styles: ${brief.hook_templates?.slice(0, 2).join(" | ") || "curiosity hook"}
CTA: ${brief.cta_options?.[i % (brief.cta_options?.length || 1)] || "engage"}
Respond ONLY with the caption text.`);
            if (caption.trim()) {
              await supabase.from("content_calendar").insert({
                title: `${brief.campaign_name} — ${mix.type} ${i + 1}`,
                caption: caption.trim(),
                platform: mix.platform || "instagram",
                content_type: mix.type || "post",
                hashtags: [...(brief.hashtag_strategy?.primary || []), ...(brief.hashtag_strategy?.secondary || [])].slice(0, 15),
                cta: brief.cta_options?.[0] || "",
                description: `Campaign: ${brief.campaign_name} | ${mix.description || ""}`,
                status: "draft",
                viral_score: 0,
              });
              created++;
            }
          } catch { /* skip */ }
        }
      }
      toast.success(`${created} content pieces created from brief`);
      setGenerating(false);
      setShowContentBrief(false);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 22: Batch AI Caption Generation for Drafts
  // ════════════════════════════════════════════════════════
  const batchGenerateCaptions = async () => {
    const drafts = items.filter(i => i.status === "draft" && (!i.caption || i.caption.length < 20));
    if (drafts.length === 0) { toast.error("No drafts needing captions"); return; }
    await performAction('ai_rewrite_caption', async () => {
      setGeneratingBatchCaptions(true);
      setBatchProgress({ done: 0, total: drafts.length });
      for (let i = 0; i < drafts.length; i++) {
        const item = drafts[i];
        try {
          const conf = platformConf(item.platform || "instagram");
          const caption = await callAI(`Generate a perfect ${conf.label} ${item.content_type || "post"} caption.
Title: "${item.title}"
Notes: "${item.description || "none"}"
Platform: ${conf.label} (max ${conf.maxCaption} chars)
Has media: ${item.media_urls ? "yes" : "no"}
Rules: Hook first line, natural emojis, strong CTA, optimized for ${conf.label} algorithm.
Respond ONLY with the caption text.`);
          if (caption.trim()) {
            await supabase.from("content_calendar").update({ caption: caption.trim().substring(0, conf.maxCaption) }).eq("id", item.id);
          }
        } catch { /* skip */ }
        setBatchProgress({ done: i + 1, total: drafts.length });
      }
      toast.success(`Captions generated for ${drafts.length} drafts`);
      setGeneratingBatchCaptions(false);
      setBatchProgress(null);
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 23: Hashtag Bank (save/reuse sets)
  // ════════════════════════════════════════════════════════
  const saveHashtagSet = () => {
    if (!newSetName.trim() || !formHashtags.trim()) { toast.error("Enter a name and hashtags"); return; }
    const tags = formHashtags.split(",").map(h => h.trim()).filter(Boolean);
    setHashtagSets(prev => [...prev, { name: newSetName.trim(), tags, platform: formPlatform || "all" }]);
    setNewSetName("");
    toast.success(`Hashtag set "${newSetName}" saved`);
  };

  const applyHashtagSet = (set: {name: string; tags: string[]}) => {
    setFormHashtags(set.tags.join(", "));
    setShowHashtagBank(false);
    toast.success(`Applied "${set.name}" hashtags`);
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 24: Caption Library (save best captions)
  // ════════════════════════════════════════════════════════
  const saveCaptionToLibrary = (text: string, platform: string, label?: string) => {
    if (!text.trim()) return;
    setSavedCaptions(prev => [...prev, {
      id: Date.now().toString(),
      text: text.trim(),
      platform,
      label: label || `Saved ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString(),
    }]);
    toast.success("Caption saved to library");
  };

  const applySavedCaption = (caption: {text: string}) => {
    setFormCaption(caption.text);
    setShowCaptionLibrary(false);
    toast.success("Caption applied");
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 25: Quick Repost (one-click republish)
  // ════════════════════════════════════════════════════════
  const quickRepost = async (item: any) => {
    await performAction('create_content', async () => {
      const { error } = await supabase.from("content_calendar").insert({
        title: `${item.title} (Repost)`,
        caption: item.caption,
        platform: item.platform,
        content_type: item.content_type,
        hashtags: item.hashtags || [],
        cta: item.cta || "",
        media_urls: item.media_urls || null,
        account_id: item.account_id || null,
        description: `Reposted from ${item.published_at ? format(new Date(item.published_at), "MMM d") : "original"}`,
        status: "draft",
        viral_score: item.viral_score || 0,
        metadata: { ...(item.metadata || {}), reposted_from: item.id, original_published: item.published_at },
      });
      if (error) toast.error(error.message);
      else toast.success("Content duplicated as draft for reposting");
    });
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 26: Content Approval Workflow
  // ════════════════════════════════════════════════════════
  const approvalItems = useMemo(() => items.filter(i => i.status === "planned"), [items]);
  const moveToReview = async (id: string) => {
    await supabase.from("content_calendar").update({ status: "planned" }).eq("id", id);
    toast.success("Moved to review queue");
  };
  const approveContent = async (id: string) => {
    await supabase.from("content_calendar").update({ status: "scheduled" }).eq("id", id);
    toast.success("Approved → Scheduled");
  };
  const rejectContent = async (id: string) => {
    await supabase.from("content_calendar").update({ status: "draft" }).eq("id", id);
    toast.info("Sent back to drafts");
  };

  // ════════════════════════════════════════════════════════
  // FEATURE 27: Weekly Posting Heatmap
  // ════════════════════════════════════════════════════════
  const heatmapData = useMemo(() => {
    const grid: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    days.forEach(d => hours.forEach(h => { grid[`${d}-${h}`] = 0; }));
    for (const item of items) {
      if (!item.scheduled_at && !item.published_at) continue;
      const d = new Date(item.scheduled_at || item.published_at);
      const key = `${days[d.getDay()]}-${d.getHours()}`;
      grid[key] = (grid[key] || 0) + 1;
    }
    return { grid, days, hours };
  }, [items]);

  // ─── Apply template ───
  const applyTemplate = (template: typeof CONTENT_TEMPLATES[0]) => {
    setFormPlatform(template.platform);
    setFormType(template.type);
    setFormCaption(template.caption);
    setFormHashtags(template.hashtags.join(", "));
    setFormTitle(template.name);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied`);
  };

  // ─── Apply platform preset ───
  const applyPreset = (preset: { label: string; caption: string; type: string }) => {
    setFormCaption(preset.caption);
    setFormType(preset.type);
    if (!formTitle) setFormTitle(preset.label);
    setShowPresets(false);
    toast.success(`Preset "${preset.label}" applied`);
  };

  // ─── Duplicate for cross-posting ───
  const duplicateForPlatform = async (item: any, targetPlatform: string) => {
    const conf = platformConf(targetPlatform);
    const caption = (item.caption || "").substring(0, conf.maxCaption);
    await performAction('cross_post_content', async () => {
      const { error } = await supabase.from("content_calendar").insert({
        title: `${item.title} (${conf.label})`,
        caption, platform: targetPlatform,
        content_type: conf.supportedTypes.includes(item.content_type) ? item.content_type : conf.supportedTypes[0],
        hashtags: item.hashtags || [],
        cta: item.cta || "", description: item.description || null,
        media_urls: item.media_urls || null,
        account_id: item.account_id || null,
        status: "draft",
        metadata: { ...(item.metadata || {}), cross_posted_from: item.id },
      });
      if (error) toast.error(error.message);
      else toast.success(`Duplicated to ${conf.label} as draft`);
    });
  };

  // ─── Save content as draft ───
  const saveItem = async () => {
    if (!formTitle.trim()) { toast.error("Title required"); return; }
    if (!formPlatform) { toast.error("Select a platform"); return; }

    const actionType = editingId ? 'schedule_content' : 'create_content';
    await performAction(actionType, async () => {
      const mediaUrls = await uploadMedia();
      const metadata: any = {};
      if (formLocation) metadata.location = formLocation;
      if (formAltText) metadata.alt_text = formAltText;
      if (formLink) metadata.link = formLink;
      if (formPrivacy !== "PUBLIC_TO_EVERYONE") metadata.privacy = formPrivacy;
      if (predictedScore !== null) metadata.predicted_score = predictedScore;

      const payload: any = {
        title: formTitle, description: formDesc || null, platform: formPlatform,
        content_type: formType, account_id: formAccount || null,
        caption: formCaption || null,
        hashtags: formHashtags ? formHashtags.split(",").map(h => h.trim()) : [],
        cta: formCta || null, scheduled_at: formSchedule || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        viral_score: predictedScore || 0,
        status: editingId ? undefined : "draft",
      };
      if (editingId) {
        delete payload.status;
        const { error } = await supabase.from("content_calendar").update(payload).eq("id", editingId);
        if (error) { toast.error(error.message); throw error; } else toast.success("Updated");
      } else {
        const { error } = await supabase.from("content_calendar").insert(payload);
        if (error) { toast.error(error.message); throw error; } else toast.success("Saved as draft");
      }

      // Cross-post to selected platforms
      if (!editingId && crossPostPlatforms.length > 0) {
        for (const cp of crossPostPlatforms) {
          if (cp === formPlatform) continue;
          const cpConf = platformConf(cp);
          await supabase.from("content_calendar").insert({
            ...payload,
            title: `${formTitle} (${cpConf.label})`,
            platform: cp,
            caption: (formCaption || "").substring(0, cpConf.maxCaption),
            content_type: cpConf.supportedTypes.includes(formType) ? formType : cpConf.supportedTypes[0],
            metadata: { ...(payload.metadata || {}), cross_posted_from: "original" },
          });
        }
        toast.success(`Cross-posted to ${crossPostPlatforms.length} platforms`);
      }

      resetForm(); setShowCreate(false);
    });
  };

  const deleteItem = async (id: string) => {
    await performAction('delete_item', async () => {
      const { error } = await supabase.from("content_calendar").delete().eq("id", id);
      if (error) toast.error(error.message); else { toast.success("Deleted"); if (showDetail?.id === id) setShowDetail(null); }
    });
  };

  const updateStatus = async (id: string, status: string) => {
    await performAction('update_status', async () => {
      await supabase.from("content_calendar").update({
        status, ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
      }).eq("id", id);
    });
  };

  // ─── Platform-specific publish ───
  const publishToNetwork = async (item: any) => {
    const conn = connForPlatform(item.platform);
    if (!conn) { toast.error(`No connected ${item.platform} account. Connect in Social Media Hub first.`); return; }

    setPublishing(true);
    await performAction('publish_content', async () => {
      try {
        const conf = platformConf(item.platform);
        const caption = [item.caption || item.title, ...(item.hashtags?.map((h: string) => `#${h}`) || [])].join(" ");
        const mediaUrls: string[] = Array.isArray(item.media_urls) ? item.media_urls : [];
        const meta = item.metadata || {};
        let action: string;
        let params: any = {};

        switch (item.platform) {
          case "instagram": {
            const hasVideo = mediaUrls.some(u => /\.(mp4|mov|avi|webm)$/i.test(u));
            if (item.content_type === "story") {
              action = "create_story";
              params = hasVideo ? { video_url: mediaUrls[0] } : { image_url: mediaUrls[0] };
            } else if (item.content_type === "reel" || hasVideo) {
              action = "create_reel";
              params = { video_url: mediaUrls[0], caption, share_to_feed: true };
            } else if (mediaUrls.length > 1) {
              action = "create_carousel";
              params = { items: mediaUrls.map(u => ({ image_url: u })), caption };
            } else {
              action = "create_photo_post";
              params = { image_url: mediaUrls[0], caption };
              if (meta.location_id) params.location_id = meta.location_id;
              if (meta.alt_text) params.alt_text = meta.alt_text;
            }
            break;
          }
          case "tiktok": {
            const hasVideo = mediaUrls.some(u => /\.(mp4|mov|avi|webm)$/i.test(u));
            if (hasVideo) {
              action = "publish_video_by_url";
              params = { video_url: mediaUrls[0], title: caption, privacy_level: meta.privacy || "PUBLIC_TO_EVERYONE" };
            } else if (mediaUrls.length > 1) {
              action = "publish_carousel";
              params = { image_urls: mediaUrls, title: item.title, description: caption, privacy_level: meta.privacy || "PUBLIC_TO_EVERYONE" };
            } else {
              action = "publish_photo";
              params = { image_urls: mediaUrls, title: item.title, description: caption, privacy_level: meta.privacy || "PUBLIC_TO_EVERYONE" };
            }
            break;
          }
          case "twitter": {
            action = "create_tweet"; params = { text: caption }; break;
          }
          case "facebook": {
            if (mediaUrls.length > 0) {
              const hasVideo = mediaUrls.some(u => /\.(mp4|mov|avi|webm)$/i.test(u));
              if (hasVideo) { action = "create_video_post"; params = { video_url: mediaUrls[0], description: caption }; }
              else { action = "create_photo_post"; params = { image_url: mediaUrls[0], caption }; }
            } else {
              action = "create_post"; params = { message: caption };
              if (meta.link) params.link = meta.link;
            }
            break;
          }
          case "threads": {
            if (mediaUrls.length > 1) {
              action = "create_carousel_thread";
              params = { items: mediaUrls.map(u => ({ image_url: u, media_type: "IMAGE" })), text: caption };
            } else if (mediaUrls.length === 1) {
              const hasVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrls[0]);
              action = hasVideo ? "create_video_thread" : "create_image_thread";
              params = hasVideo ? { video_url: mediaUrls[0], text: caption } : { image_url: mediaUrls[0], text: caption };
            } else {
              action = "create_text_thread"; params = { text: caption };
            }
            break;
          }
          default: throw new Error(`Direct publishing not supported for ${item.platform}`);
        }

        toast.info(`Publishing to ${conf.label}...`);
        const fnName = item.platform === "twitter" ? "twitter-api" : `${item.platform}-api`;
        const { data, error } = await supabase.functions.invoke(fnName, {
          body: { action, account_id: conn.account_id, params },
        });
        if (error) throw error;
        if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));

        await supabase.from("content_calendar").update({
          status: "published", published_at: new Date().toISOString(),
        }).eq("id", item.id);

        toast.success(`Published to ${conf.label}!`);
        setShowDetail(null);
      } catch (e: any) {
        toast.error(`Publish failed: ${e.message}`);
        throw e;
      } finally {
        setPublishing(false);
      }
    });
  };

  const editItem = (item: any) => {
    setEditingId(item.id); setFormTitle(item.title); setFormDesc(item.description || "");
    setFormPlatform(item.platform); setFormType(item.content_type); setFormAccount(item.account_id || "");
    setFormCaption(item.caption || ""); setFormHashtags((item.hashtags || []).join(", "));
    setFormCta(item.cta || ""); setFormSchedule(item.scheduled_at ? item.scheduled_at.slice(0, 16) : "");
    setFormLocation(item.metadata?.location || ""); setFormAltText(item.metadata?.alt_text || "");
    setFormLink(item.metadata?.link || ""); setFormPrivacy(item.metadata?.privacy || "PUBLIC_TO_EVERYONE");
    setFormExistingMedia(Array.isArray(item.media_urls) ? item.media_urls : []);
    setFormMediaFiles([]); setFormMediaPreviews([]);
    setPredictedScore(item.viral_score || null);
    setShowCreate(true);
  };

  // ─── AI Generate full random posts ───
  const generateRandomPosts = async () => {
    const connPlatforms = [...new Set(connections.map(c => c.platform))];
    const platformsList = connPlatforms.length > 0 ? connPlatforms.join(", ") : "instagram, twitter, tiktok";

    await performAction('ai_generate_ideas', async () => {
      setGenerating(true);
      try {
        const content = await callAI(`You are a social media content strategist. Generate 5 COMPLETE, ready-to-post content ideas for these platforms: ${platformsList}.

Each post must be unique, creative, and optimized for its platform. Mix content types (posts, reels, tweets, stories).

For each, provide:
- title: catchy internal title (2-5 words)
- platform: one of ${platformsList}
- content_type: post, story, reel, tweet, or promo (match to platform capabilities)
- caption: FULL ready-to-post caption with emojis, line breaks. Platform-optimized length.
- hashtags: array of 5-15 relevant hashtags (no # prefix)
- cta: compelling call to action
- viral_score: realistic 40-95 estimate
- description: internal notes about why this post works
- best_time: suggested posting time (e.g., "7:00 PM")

Be creative! Include trending topics, engagement hooks, questions, controversial takes.

Respond ONLY with valid JSON array: [{"title":"...", "platform":"...", "content_type":"...", "caption":"...", "hashtags":["..."], "cta":"...", "viral_score": number, "description":"...", "best_time":"..."}]`);
        const arrMatch = content.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          const ideas = JSON.parse(arrMatch[0]);
          for (const idea of ideas) {
            await supabase.from("content_calendar").insert({
              title: idea.title, caption: idea.caption, platform: idea.platform || "instagram",
              content_type: idea.content_type || "post", hashtags: idea.hashtags || [],
              cta: idea.cta || "", viral_score: idea.viral_score || 0,
              description: idea.description || null, status: "draft",
              engagement_prediction: idea.viral_score || 0,
            });
          }
          toast.success(`${ideas.length} AI posts generated as drafts!`);
        } else {
          toast.error("AI didn't return valid content. Try again.");
        }
      } catch (e: any) { toast.error(e.message || "Generation failed"); }
      setGenerating(false);
    });
  };

  const platformIcon = (p: string) => {
    switch (p) {
      case "twitter": return <Globe className="h-3 w-3" />;
      case "instagram": return <Image className="h-3 w-3" />;
      case "tiktok": return <Video className="h-3 w-3" />;
      case "threads": return <Hash className="h-3 w-3" />;
      case "facebook": return <Globe className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "border-emerald-500/20 text-emerald-400";
      case "scheduled": return "border-blue-500/20 text-blue-400";
      case "draft": return "border-amber-500/20 text-amber-400";
      case "planned": return "border-purple-500/20 text-purple-400";
      default: return "border-white/10 text-white/40";
    }
  };

  const stats = useMemo(() => ({
    total: items.length,
    drafts: items.filter(i => i.status === "draft").length,
    published: items.filter(i => i.status === "published").length,
    scheduled: items.filter(i => i.status === "scheduled").length,
    avgViral: items.length > 0 ? Math.round(items.reduce((s, i) => s + (i.viral_score || 0), 0) / items.length) : 0,
    thisWeek: items.filter(i => i.scheduled_at && isThisWeek(new Date(i.scheduled_at))).length,
    platforms: [...new Set(items.map(i => i.platform))].length,
  }), [items]);

  const acctName = (id: string) => {
    const a = accounts.find(a => a.id === id);
    return a ? (a.display_name || a.username) : "";
  };

  const curPlatConf = formPlatform ? platformConf(formPlatform) : null;

  // Calendar view grouping
  const calendarGroups = useMemo(() => {
    const groups: Record<string, any[]> = { today: [], tomorrow: [], thisWeek: [], later: [], unscheduled: [] };
    for (const item of filtered) {
      if (!item.scheduled_at) { groups.unscheduled.push(item); continue; }
      const d = new Date(item.scheduled_at);
      if (isToday(d)) groups.today.push(item);
      else if (isTomorrow(d)) groups.tomorrow.push(item);
      else if (isThisWeek(d)) groups.thisWeek.push(item);
      else groups.later.push(item);
    }
    return groups;
  }, [filtered]);

  // ─── Performance stats per platform ───
  const performanceStats = useMemo(() => {
    const byPlatform: Record<string, { total: number; published: number; avgViral: number; }> = {};
    for (const item of items) {
      if (!byPlatform[item.platform]) byPlatform[item.platform] = { total: 0, published: 0, avgViral: 0 };
      byPlatform[item.platform].total++;
      if (item.status === "published") byPlatform[item.platform].published++;
      byPlatform[item.platform].avgViral += item.viral_score || 0;
    }
    for (const p of Object.keys(byPlatform)) {
      byPlatform[p].avgViral = byPlatform[p].total > 0 ? Math.round(byPlatform[p].avgViral / byPlatform[p].total) : 0;
    }
    return byPlatform;
  }, [items]);

  // Published content for recycler
  const publishedContent = useMemo(() => items.filter(i => i.status === "published"), [items]);

  // Draft storage items
  const draftItems = useMemo(() => items.filter(i => i.status === "draft"), [items]);

  // Quick publish a draft directly
  const quickPublishDraft = async (item: any) => {
    const conn = connForPlatform(item.platform);
    if (!conn) { toast.error(`Connect ${platformConf(item.platform).label} first in Social Media Hub`); return; }
    // Ensure it has media for platforms that require it
    const mediaUrls: string[] = Array.isArray(item.media_urls) ? item.media_urls : [];
    if (item.platform === "instagram" && mediaUrls.length === 0 && item.content_type !== "story") {
      toast.error("Instagram posts require at least one image or video. Edit the draft to add media.");
      return;
    }
    await publishToNetwork(item);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Content Command Center
            </h1>
            <CreditCostBadge cost="3-5" variant="header" label="per content" />
          </div>
          <p className="text-xs text-white/30 mt-0.5">Create, schedule, and publish across all platforms</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowContentBrief(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <FileText className="h-3.5 w-3.5 mr-1" /> Brief
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPerformance(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowHeatmap(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <Flame className="h-3.5 w-3.5 mr-1" /> Heatmap
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowApprovalQueue(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Review{approvalItems.length > 0 ? ` (${approvalItems.length})` : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowRecycler(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <Repeat className="h-3.5 w-3.5 mr-1" /> Recycle
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowHashtagBank(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <Hash className="h-3.5 w-3.5 mr-1" /> Hashtags
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCaptionLibrary(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Captions
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSeriesPlanner(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <Layers className="h-3.5 w-3.5 mr-1" /> Series
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowThreadBuilder(true)}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            <Layers className="h-3.5 w-3.5 mr-1" /> Thread
          </Button>
          <Button size="sm" variant="outline" onClick={generatePillars} disabled={generatingPillars}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            {generatingPillars ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Target className="h-3.5 w-3.5 mr-1" />}
            Pillars
          </Button>
          <Button size="sm" variant="outline" onClick={generateCompetitorInspired} disabled={generatingCompetitor}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            {generatingCompetitor ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            Inspire
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)}
            className="border-green-500/20 text-green-400 text-xs h-8 hover:text-green-300">
            <Layers className="h-3.5 w-3.5 mr-1" /> Templates
          </Button>
          <Button size="sm" variant="outline" onClick={generateTrendIdeas} disabled={generatingTrends}
            className="border-white/[0.06] text-white/50 text-xs h-8 hover:text-white hover:border-white/20">
            {generatingTrends ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <TrendingUp className="h-3.5 w-3.5 mr-1" />}
            Trends
          </Button>
          <Button size="sm" variant="outline" onClick={batchGenerateCaptions} disabled={generatingBatchCaptions}
            className="border-amber-500/20 text-amber-400 text-xs h-8">
            {generatingBatchCaptions ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
            Batch AI{batchProgress ? ` ${batchProgress.done}/${batchProgress.total}` : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={importCompetitorPlan} disabled={importingCompetitorPlan}
            className="border-purple-500/20 text-purple-400 text-xs h-8">
            {importingCompetitorPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            Copy Plan
          </Button>
          <Button size="sm" variant="outline" onClick={importCompetitorHashtags} disabled={importingCompetitorHashtags}
            className="border-cyan-500/20 text-cyan-400 text-xs h-8">
            <Hash className="h-3.5 w-3.5 mr-1" /> Steal Tags
          </Button>
          <Button size="sm" variant="outline" onClick={analyzeCompetitorBestTimes} disabled={generatingBestTimes}
            className="border-emerald-500/20 text-emerald-400 text-xs h-8">
            {generatingBestTimes ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Clock className="h-3.5 w-3.5 mr-1" />}
            Best Times
          </Button>
          <Button size="sm" variant="outline" onClick={generateSwotContent} disabled={generatingSwotContent}
            className="border-amber-500/20 text-amber-400 text-xs h-8">
            {generatingSwotContent ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Target className="h-3.5 w-3.5 mr-1" />}
            SWOT Ideas
          </Button>
          <Button size="sm" variant="outline" onClick={generateGapContent} disabled={generatingGapContent}
            className="border-pink-500/20 text-pink-400 text-xs h-8">
            {generatingGapContent ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            Gap Fill
          </Button>
          <Button size="sm" onClick={generateRandomPosts} disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-8">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
            AI Generate
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }} className="bg-primary text-primary-foreground text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Create
          </Button>
        </div>
      </div>

      {/* Competitor Intel Sync Bar */}
      {competitorProfiles.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
          <Brain className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="text-[10px] text-white/50">Competitor Intel synced:</span>
          <span className="text-[10px] font-semibold text-white/70">{competitorProfiles.length} competitors tracked</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/50">{[...new Set(competitorProfiles.flatMap(c => c.top_hashtags || []))].length} hashtags available</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/50">{[...new Set(competitorProfiles.map(c => c.platform))].length} platforms</span>
          <Button size="sm" variant="ghost" onClick={loadCompetitorProfiles} className="ml-auto text-[9px] h-5 text-purple-400 hover:text-purple-300 px-2">
            <RefreshCw className="h-2.5 w-2.5 mr-1" /> Refresh
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-7">
        {[
          { title: "Total", value: stats.total, icon: FileText, color: "text-blue-400" },
          { title: "Drafts", value: stats.drafts, icon: Edit2, color: "text-amber-400" },
          { title: "Published", value: stats.published, icon: CheckCircle2, color: "text-emerald-400" },
          { title: "Scheduled", value: stats.scheduled, icon: Clock, color: "text-blue-400" },
          { title: "This Week", value: stats.thisWeek, icon: CalendarDays, color: "text-purple-400" },
          { title: "Platforms", value: stats.platforms, icon: Globe, color: "text-cyan-400" },
          { title: "Viral Avg", value: `${stats.avgViral}%`, icon: TrendingUp, color: "text-pink-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-3">
              <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connected accounts */}
      {connections.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Connected:</span>
          {connections.map(c => (
            <Badge key={c.id} variant="outline" className="text-[10px] border-white/[0.06] text-white/50 gap-1">
              {platformIcon(c.platform)} <span className="capitalize">{c.platform}</span>
              <span className="text-emerald-400">@{c.platform_username}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* ═══ DRAFT STORAGE ═══ */}
      {draftItems.length > 0 && (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Draft Storage</h2>
                <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-[10px]">{draftItems.length} drafts</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-white/30 mr-2">Ready to post · click to publish directly</p>
                {draftItems.length > 0 && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!confirm(`Delete all ${draftItems.length} drafts?`)) return;
                    const ids = draftItems.map(d => d.id);
                    const { error } = await supabase.from("content_calendar").delete().in("id", ids);
                    if (error) toast.error(error.message);
                    else toast.success(`${ids.length} drafts deleted`);
                  }}
                    className="text-[9px] h-6 px-2 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Trash2 className="h-2.5 w-2.5 mr-0.5" /> Delete All
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-[400px] overflow-y-auto">
              {draftItems.map(item => {
                const conn = connForPlatform(item.platform);
                const mediaUrls: string[] = Array.isArray(item.media_urls) ? item.media_urls : [];
                const hasMedia = mediaUrls.length > 0;
                const isVideo = hasMedia && /\.(mp4|mov|avi|webm)$/i.test(mediaUrls[0]);
                return (
                  <div key={item.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden hover:border-primary/30 transition-all">
                    {/* Media thumbnail */}
                    {hasMedia && (
                      <div className="h-24 overflow-hidden relative">
                        {isVideo ? (
                          <video src={mediaUrls[0]} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : (
                          <img src={mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                        )}
                        {mediaUrls.length > 1 && (
                          <span className="absolute top-1 right-1 bg-black/70 text-white text-[8px] rounded px-1">+{mediaUrls.length - 1}</span>
                        )}
                      </div>
                    )}
                    {!hasMedia && (
                      <div className="h-16 bg-white/[0.02] flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white/10" />
                      </div>
                    )}
                    <div className="p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[8px] capitalize gap-0.5 ${platformConf(item.platform).color}`}>
                          {platformIcon(item.platform)} {item.platform}
                        </Badge>
                        <Badge variant="outline" className="text-[8px] border-white/[0.06] text-white/40 capitalize">{item.content_type}</Badge>
                        {item.viral_score > 0 && (
                          <Badge variant="outline" className="text-[8px] border-pink-500/20 text-pink-400">
                            <Flame className="h-2 w-2 mr-0.5" />{item.viral_score}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-white truncate">{item.title}</p>
                      {item.caption && <p className="text-[10px] text-white/40 truncate">{item.caption.length > 40 ? item.caption.substring(0, 40) + "…" : item.caption}</p>}
                      {item.hashtags?.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap">
                          {item.hashtags.slice(0, 4).map((h: string, i: number) => (
                            <span key={i} className="text-[8px] text-primary/50">#{h}</span>
                          ))}
                          {item.hashtags.length > 4 && <span className="text-[8px] text-white/30">+{item.hashtags.length - 4}</span>}
                        </div>
                      )}
                      {item.scheduled_at && (
                        <p className="text-[9px] text-white/30 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" /> {format(new Date(item.scheduled_at), "MMM d, h:mm a")}
                        </p>
                      )}
                      <div className="flex gap-1.5 pt-1.5 border-t border-white/[0.04]">
                        {conn ? (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); quickPublishDraft(item); }}
                            disabled={publishing}
                            className="flex-1 text-[10px] h-7 bg-emerald-600 hover:bg-emerald-500 text-white">
                            {publishing ? <Loader2 className="h-3 w-3 animate-spin mr-0.5" /> : <Send className="h-3 w-3 mr-0.5" />}
                            Post to {platformConf(item.platform).label}
                          </Button>
                        ) : (
                          <div className="flex-1 text-center">
                            <p className="text-[9px] text-amber-400">Connect {platformConf(item.platform).label} to post</p>
                          </div>
                        )}
                        <Button size="sm" variant="outline" onClick={() => editItem(item)}
                          className="text-[10px] h-7 border-white/[0.06] text-white/50">
                          <Edit2 className="h-2.5 w-2.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteItem(item.id)}
                          className="text-[10px] h-7 border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-red-400 hover:border-red-500/30">
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Tabs + Filters + View Mode + Search + Bulk */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl h-auto gap-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">All</TabsTrigger>
              <TabsTrigger value="drafts" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">Drafts</TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">Scheduled</TabsTrigger>
              <TabsTrigger value="published" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">Published</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..." className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8 pl-7 placeholder:text-white/20" />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button size="sm" variant={bulkMode ? "default" : "outline"} onClick={() => { setBulkMode(!bulkMode); setSelectedItems(new Set()); }}
            className={`text-xs h-8 ${bulkMode ? "bg-primary text-primary-foreground" : "border-white/[0.06] text-white/50"}`}>
            <CheckSquare className="h-3.5 w-3.5 mr-1" /> Bulk
          </Button>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-xs w-32"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent className="bg-[hsl(222,35%,9%)] border-white/[0.08]">
              <SelectItem value="all" className="text-xs text-white/70">All Platforms</SelectItem>
              {availablePlatforms.map(p => (
                <SelectItem key={p} value={p} className="text-xs capitalize text-white/70">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border border-white/[0.06] rounded-md overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white/60"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("calendar")} className={`p-1.5 ${viewMode === "calendar" ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white/60"}`}>
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedItems.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg p-2">
          <span className="text-xs text-primary font-medium">{selectedItems.size} selected</span>
          <Button size="sm" variant="outline" onClick={selectAll} className="text-xs h-6 border-white/[0.06] text-white/50">
            {selectedItems.size === filtered.length ? "Deselect All" : "Select All"}
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("scheduled")} className="text-xs h-6 border-blue-500/20 text-blue-400">Schedule</Button>
          <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("draft")} className="text-xs h-6 border-amber-500/20 text-amber-400">→ Draft</Button>
          <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("archived")} className="text-xs h-6 border-white/[0.06] text-white/40">Archive</Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} className="text-xs h-6 border-destructive/20 text-destructive">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Content Display */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/50 text-sm">No content yet</p>
            <p className="text-white/30 text-xs mt-1">Create a draft, use a template, or auto-generate with AI</p>
          </CardContent>
        </Card>
      ) : viewMode === "calendar" ? (
        // Calendar View
        <div className="space-y-4">
          {Object.entries(calendarGroups).map(([group, groupItems]) => {
            if (groupItems.length === 0) return null;
            const labels: Record<string, string> = { today: "📅 Today", tomorrow: "📆 Tomorrow", thisWeek: "🗓️ This Week", later: "📋 Later", unscheduled: "📝 Unscheduled" };
            return (
              <div key={group}>
                <h3 className="text-xs font-semibold text-white mb-2">{labels[group] || group}</h3>
                <div className="space-y-1.5">
                  {groupItems.map(item => (
                    <Card key={item.id} className="bg-white/[0.03] border-white/[0.06] hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => !bulkMode && setShowDetail(item)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {bulkMode && (
                          <button onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}>
                            {selectedItems.has(item.id)
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-white/30" />}
                          </button>
                        )}
                        <Badge variant="outline" className={`${statusColor(item.status)} capitalize text-[9px]`}>{item.status}</Badge>
                        <span className="flex-1 text-xs text-white truncate">{item.title}</span>
                        <Badge variant="outline" className="text-[9px] border-white/[0.06] text-white/40 capitalize gap-0.5">
                          {platformIcon(item.platform)} {item.platform}
                        </Badge>
                        {item.scheduled_at && (
                          <span className="text-[9px] text-white/30">{format(new Date(item.scheduled_at), "h:mm a")}</span>
                        )}
                        {item.metadata?.series && (
                          <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400">
                            <BookOpen className="h-2 w-2 mr-0.5" /> Series
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Grid View
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <Card key={item.id} className="bg-white/[0.03] border-white/[0.06] hover:border-primary/30 transition-all cursor-pointer group relative"
              onClick={() => !bulkMode && setShowDetail(item)}>
              {bulkMode && (
                <button onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                  className="absolute top-2 left-2 z-10">
                  {selectedItems.has(item.id)
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-white/30" />}
                </button>
              )}
              {/* Media preview */}
              {item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0 && (
                <div className="h-32 overflow-hidden rounded-t-lg">
                  {/\.(mp4|mov|avi|webm)$/i.test(item.media_urls[0]) ? (
                    <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
                      <Video className="h-6 w-6 text-white/20" />
                    </div>
                  ) : (
                    <img src={item.media_urls[0]} alt="" className="w-full h-full object-cover" />
                  )}
                  {item.media_urls.length > 1 && (
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[9px] rounded-full px-1.5 py-0.5">
                      +{item.media_urls.length - 1}
                    </span>
                  )}
                </div>
              )}
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <Badge variant="outline" className={`${statusColor(item.status)} capitalize text-[9px]`}>{item.status}</Badge>
                  <Badge variant="outline" className={`text-[9px] border-white/[0.06] capitalize gap-0.5 ${platformConf(item.platform).color}`}>
                    {platformIcon(item.platform)} {item.platform}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] border-white/[0.06] text-white/40 capitalize">{item.content_type}</Badge>
                  {item.viral_score > 0 && (
                    <Badge variant="outline" className={`text-[9px] ${item.viral_score >= 70 ? "border-emerald-500/20 text-emerald-400" : "border-white/[0.06] text-white/40"}`}>
                      <Flame className="h-2.5 w-2.5 mr-0.5" />{item.viral_score}%
                    </Badge>
                  )}
                  {item.metadata?.series && (
                    <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400">
                      <BookOpen className="h-2 w-2 mr-0.5" /> Pt {item.metadata.part}
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-medium text-white mb-1 line-clamp-1">{item.title}</p>
                {item.caption && <p className="text-[10px] text-white/40 truncate mb-2">{item.caption.length > 40 ? item.caption.substring(0, 40) + "…" : item.caption}</p>}
                {item.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(item.hashtags as string[]).slice(0, 4).map((h, i) => (
                      <span key={i} className="text-[9px] text-blue-400/60">#{h}</span>
                    ))}
                    {item.hashtags.length > 4 && <span className="text-[9px] text-white/20">+{item.hashtags.length - 4}</span>}
                  </div>
                )}
                {item.scheduled_at && (
                  <p className="text-[9px] text-white/30 flex items-center gap-1 mt-1">
                    <Clock className="h-2.5 w-2.5" /> {format(new Date(item.scheduled_at), "MMM d, h:mm a")}
                  </p>
                )}
                {/* Quick publish button for drafts */}
                {item.status === "draft" && connForPlatform(item.platform) && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); quickPublishDraft(item); }}
                    disabled={publishing}
                    className="mt-2 w-full text-[10px] h-7 bg-emerald-600 hover:bg-emerald-500 text-white">
                    {publishing ? <Loader2 className="h-3 w-3 animate-spin mr-0.5" /> : <Send className="h-3 w-3 mr-0.5" />}
                    Post to {platformConf(item.platform).label}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ========== DETAIL DIALOG ========== */}
      <Dialog open={!!showDetail} onOpenChange={v => { if (!v) setShowDetail(null); }}>
        {showDetail && (
          <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                {platformIcon(showDetail.platform)} {showDetail.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={`${statusColor(showDetail.status)} capitalize`}>{showDetail.status}</Badge>
                <Badge variant="outline" className="border-white/[0.06] text-white/50 capitalize gap-1">
                  {platformIcon(showDetail.platform)} {platformConf(showDetail.platform).label}
                </Badge>
                <Badge variant="outline" className="border-white/[0.06] text-white/50 capitalize">{showDetail.content_type}</Badge>
                {showDetail.viral_score > 0 && (
                  <Badge variant="outline" className="border-purple-500/20 text-purple-400">
                    <Flame className="h-3 w-3 mr-0.5" />{showDetail.viral_score}% viral
                  </Badge>
                )}
                {showDetail.metadata?.series && (
                  <Badge variant="outline" className="border-purple-500/20 text-purple-400">
                    <BookOpen className="h-3 w-3 mr-0.5" /> Series: {showDetail.metadata.series} ({showDetail.metadata.part}/{showDetail.metadata.total_parts})
                  </Badge>
                )}
              </div>

              {showDetail.media_urls && Array.isArray(showDetail.media_urls) && showDetail.media_urls.length > 0 && (
                <div className="grid gap-2" style={{ gridTemplateColumns: showDetail.media_urls.length > 1 ? "1fr 1fr" : "1fr" }}>
                  {showDetail.media_urls.map((url: string, i: number) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-white/[0.06]">
                      {/\.(mp4|mov|avi|webm)$/i.test(url) ? (
                        <video src={url} controls className="w-full max-h-48 object-cover" />
                      ) : (
                        <img src={url} alt="" className="w-full max-h-48 object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showDetail.caption && (
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">{platformConf(showDetail.platform).captionLabel}</p>
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{showDetail.caption}</p>
                </div>
              )}

              {showDetail.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(showDetail.hashtags as string[]).map((h, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">#{h}</Badge>
                  ))}
                </div>
              )}

              <div className="grid gap-2 grid-cols-2">
                {showDetail.metadata?.location && (
                  <div className="bg-white/[0.03] rounded-lg p-2">
                    <p className="text-[9px] text-white/40">Location</p>
                    <p className="text-xs text-white/70 flex items-center gap-1"><MapPin className="h-3 w-3" /> {showDetail.metadata.location}</p>
                  </div>
                )}
                {showDetail.cta && (
                  <div className="bg-white/[0.03] rounded-lg p-2">
                    <p className="text-[9px] text-white/40">CTA</p>
                    <p className="text-xs text-white/70">{showDetail.cta}</p>
                  </div>
                )}
                {showDetail.scheduled_at && (
                  <div className="bg-white/[0.03] rounded-lg p-2">
                    <p className="text-[9px] text-white/40">Scheduled</p>
                    <p className="text-xs text-white/70 flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(showDetail.scheduled_at), "MMM d, h:mm a")}</p>
                  </div>
                )}
                {showDetail.description && (
                  <div className="bg-white/[0.03] rounded-lg p-2 col-span-2">
                    <p className="text-[9px] text-white/40">Notes</p>
                    <p className="text-xs text-white/70">{showDetail.description}</p>
                  </div>
                )}
              </div>

              {/* Best posting times */}
              <div className="bg-white/[0.03] rounded-lg p-2">
                <p className="text-[9px] text-white/40 mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Best Times for {platformConf(showDetail.platform).label}</p>
                <div className="flex gap-1.5">
                  {platformConf(showDetail.platform).bestTimes.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] border-primary/20 text-primary">{t}</Badge>
                  ))}
                </div>
              </div>

              {/* Cross-post + Recycle */}
              {showDetail.status !== "published" && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 mb-1.5 flex items-center gap-1"><Copy className="h-3 w-3" /> Cross-post to other platforms</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {availablePlatforms.filter(p => p !== showDetail.platform).map(p => (
                      <Button key={p} size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); duplicateForPlatform(showDetail, p); }}
                        className="text-[10px] h-6 border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white capitalize">
                        {platformIcon(p)} {p}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {showDetail.status === "published" && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 mb-1.5 flex items-center gap-1"><Repeat className="h-3 w-3" /> Recycle to another platform (AI-adapted)</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {availablePlatforms.filter(p => p !== showDetail.platform).map(p => (
                      <Button key={p} size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); recycleContent(showDetail, p); }}
                        className="text-[10px] h-6 border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white capitalize">
                        {platformIcon(p)} {p}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-white/[0.06] flex-wrap">
                {showDetail.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => moveToReview(showDetail.id)}
                    className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 text-xs h-9">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Submit for Review
                  </Button>
                )}
                {showDetail.status === "published" && (
                  <Button size="sm" variant="outline" onClick={() => quickRepost(showDetail)}
                    className="border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs h-9">
                    <Repeat className="h-3 w-3 mr-1" /> Repost
                  </Button>
                )}
                {showDetail.caption && (
                  <Button size="sm" variant="outline" onClick={() => saveCaptionToLibrary(showDetail.caption, showDetail.platform, showDetail.title)}
                    className="border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white text-xs h-9">
                    <BookOpen className="h-3 w-3 mr-1" /> Save Caption
                  </Button>
                )}
                {showDetail.status !== "published" && connForPlatform(showDetail.platform) && (
                  <Button onClick={() => publishToNetwork(showDetail)} disabled={publishing}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9">
                    {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    Post to {platformConf(showDetail.platform).label}
                    {connForPlatform(showDetail.platform) && (
                      <span className="ml-1 text-[9px] opacity-70">@{connForPlatform(showDetail.platform)!.platform_username}</span>
                    )}
                  </Button>
                )}
                {showDetail.status !== "published" && connections.length > 1 && (
                  <Button onClick={() => multiPlatformPublish(showDetail)} disabled={multiPublishing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-9">
                    {multiPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                    Publish All ({connections.length})
                  </Button>
                )}
                {showDetail.status !== "published" && !connForPlatform(showDetail.platform) && showDetail.platform !== "onlyfans" && (
                  <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-amber-400">Connect {platformConf(showDetail.platform).label} in Social Media Hub to publish</p>
                  </div>
                )}
                {showDetail.status === "published" && (
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Published {showDetail.published_at && format(new Date(showDetail.published_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => { setShowDetail(null); editItem(showDetail); }}
                  className="border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white text-xs h-9">
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteItem(showDetail.id)}
                  className="border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 text-xs h-9">
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ========== TEMPLATES DIALOG ========== */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Content Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {CONTENT_TEMPLATES.map((t, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06] hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => { applyTemplate(t); setShowCreate(true); }}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px] border-white/[0.06] text-white/40 capitalize gap-0.5">
                          {platformIcon(t.platform)} {t.platform}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] border-white/[0.06] text-white/40 capitalize">{t.type}</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/30" />
                  </div>
                  {t.caption && <p className="text-[10px] text-white/40 mt-1.5 line-clamp-1">{t.caption}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== TRENDS DIALOG ========== */}
      <Dialog open={showTrends} onOpenChange={setShowTrends}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Trending Content Ideas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {trendIdeas.map((idea, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06] hover:border-primary/30 transition-all">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">{idea.title}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[9px] ${idea.urgency === "now" ? "border-destructive/30 text-destructive" : idea.urgency === "this_week" ? "border-amber-500/20 text-amber-400" : "border-white/[0.06] text-white/40"}`}>
                        {idea.urgency === "now" ? "🔥 Now" : idea.urgency === "this_week" ? "⏰ This Week" : "♻️ Evergreen"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400">
                        <Flame className="h-2.5 w-2.5 mr-0.5" />{idea.viral_potential}%
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 line-clamp-2 mb-1.5">{idea.caption}</p>
                  {idea.trend_source && <p className="text-[9px] text-blue-400/60 mb-1.5">Trend: {idea.trend_source}</p>}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] border-white/[0.06] text-white/40 capitalize gap-0.5">
                      {platformIcon(idea.platform)} {idea.platform} · {idea.content_type}
                    </Badge>
                    <Button size="sm" onClick={() => applyTrendIdea(idea)} className="text-[10px] h-6 bg-primary text-primary-foreground">
                      <Plus className="h-2.5 w-2.5 mr-0.5" /> Save Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== CONTENT RECYCLER DIALOG ========== */}
      <Dialog open={showRecycler} onOpenChange={setShowRecycler}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> Content Recycler</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">AI repurposes your published content for other platforms with native adaptation.</p>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {publishedContent.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">No published content to recycle yet</p>
            ) : publishedContent.map(item => (
              <Card key={item.id} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={`text-[9px] capitalize gap-0.5 ${platformConf(item.platform).color}`}>
                      {platformIcon(item.platform)} {item.platform}
                    </Badge>
                    <span className="text-xs text-white flex-1 truncate">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-white/40 line-clamp-1 mb-2">{item.caption}</p>
                  <div className="flex gap-1 flex-wrap">
                    {availablePlatforms.filter(p => p !== item.platform).map(p => (
                      <Button key={p} size="sm" variant="outline" onClick={() => recycleContent(item, p)}
                        className="text-[9px] h-5 border-white/[0.06] text-white/50 capitalize">
                        → {p}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== SERIES PLANNER DIALOG ========== */}
      <Dialog open={showSeriesPlanner} onOpenChange={setShowSeriesPlanner}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Content Series Planner</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">AI generates a multi-part content series with scheduled cadence.</p>
          <div className="space-y-3">
            <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)}
              placeholder="Series topic (e.g., '5 Tips for Growth')" className="bg-white/[0.03] border-white/[0.06] text-white text-xs placeholder:text-white/20" />
            <div className="flex gap-3 items-center">
              <span className="text-xs text-white/50">Parts:</span>
              {[3, 5, 7].map(n => (
                <Button key={n} size="sm" variant="outline"
                  onClick={() => setSeriesCount(n)}
                  className={`text-xs h-7 ${seriesCount === n ? "bg-primary/20 border-primary/40 text-primary font-bold" : "border-white/[0.06] bg-white/[0.03] text-white/50"}`}>
                  {n}
                </Button>
              ))}
            </div>
            <Select value={formPlatform || "instagram"} onValueChange={v => setFormPlatform(v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white text-xs h-8">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(222,35%,9%)] border-white/[0.08]">
                {availablePlatforms.map(p => (
                  <SelectItem key={p} value={p} className="text-xs capitalize text-white/70">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateSeries} disabled={generatingSeries || !seriesTitle.trim()}
              className="w-full bg-primary text-primary-foreground text-xs">
              {generatingSeries ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Generate {seriesCount}-Part Series
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== PERFORMANCE ANALYTICS DIALOG ========== */}
      <Dialog open={showPerformance} onOpenChange={setShowPerformance}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Content Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-[10px] text-white/40">Total Content</p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
                <p className="text-[10px] text-white/40">Published</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{stats.avgViral}%</p>
                <p className="text-[10px] text-white/40">Avg Viral Score</p>
              </div>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Per Platform</p>
            {Object.entries(performanceStats).map(([platform, data]) => (
              <div key={platform} className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-2">
                <Badge variant="outline" className={`text-[9px] capitalize gap-0.5 ${platformConf(platform).color}`}>
                  {platformIcon(platform)} {platform}
                </Badge>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-white">{data.total}</p>
                    <p className="text-[9px] text-white/40">Total</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{data.published}</p>
                    <p className="text-[9px] text-white/40">Published</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-400">{data.avgViral}%</p>
                    <p className="text-[9px] text-white/40">Viral Avg</p>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(performanceStats).length === 0 && (
              <p className="text-xs text-white/40 text-center py-4">No content data yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== CREATE/EDIT DIALOG ========== */}
      <Dialog open={showCreate} onOpenChange={v => { if (!v) resetForm(); setShowCreate(v); }}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "Edit Content" : "Create Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Platform selector */}
            <div className="grid grid-cols-3 gap-2">
              <Select value={formPlatform} onValueChange={v => { setFormPlatform(v); setFormType(platformConf(v).supportedTypes[0] || "post"); setAbVariants([]); setSuggestedSlots([]); }}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,10%)] border-white/[0.08]">
                  {availablePlatforms.map(p => (
                    <SelectItem key={p} value={p} className="text-xs capitalize text-white/70 focus:bg-white/[0.06] focus:text-white">
                      {p}{connForPlatform(p) ? " ✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,10%)] border-white/[0.08]">
                  {(curPlatConf?.supportedTypes || CONTENT_TYPES).map(t => (
                    <SelectItem key={t} value={t} className="text-xs capitalize text-white/70 focus:bg-white/[0.06] focus:text-white">{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formAccount} onValueChange={setFormAccount}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Creator" /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,10%)] border-white/[0.08]">
                  <SelectItem value="none" className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">No creator</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">{a.display_name || a.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Connected info + best times + media specs */}
            {formPlatform && (
              <div className="flex gap-2 flex-wrap">
                {connForPlatform(formPlatform) && (
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> @{connForPlatform(formPlatform)!.platform_username}
                    </p>
                  </div>
                )}
                <div className="flex-1 bg-primary/5 border border-primary/10 rounded-lg p-2">
                  <p className="text-[9px] text-primary flex items-center gap-1">
                    <Target className="h-2.5 w-2.5" /> Best: {platformConf(formPlatform).bestTimes.slice(0, 3).join(", ")}
                  </p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2">
                  <p className="text-[9px] text-white/50 flex items-center gap-1">
                    <Image className="h-2.5 w-2.5" /> {platformConf(formPlatform).mediaSpecs}
                  </p>
                </div>
              </div>
            )}

            {/* Platform presets */}
            {formPlatform && PLATFORM_PRESETS[formPlatform] && (
              <div className="flex gap-1.5 items-center flex-wrap">
                <span className="text-[9px] text-white/40"><Palette className="h-2.5 w-2.5 inline mr-0.5" />Quick:</span>
                {PLATFORM_PRESETS[formPlatform].map((preset, i) => (
                  <Button key={i} size="sm" variant="outline" onClick={() => applyPreset(preset)}
                    className="text-[9px] h-5 px-2 border-white/[0.08] text-white/50">
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}

            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Content title..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />

            {/* Caption with AI rewrite + A/B Testing */}
            <div className="space-y-1">
              <div className="relative">
                <Textarea value={formCaption} onChange={e => setFormCaption(e.target.value)}
                  placeholder={curPlatConf ? `${curPlatConf.captionLabel}...` : "Caption..."}
                  className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[80px]" />
                {curPlatConf && (
                  <span className={`absolute bottom-2 right-2 text-[9px] ${formCaption.length > curPlatConf.maxCaption ? "text-destructive" : "text-white/30"}`}>
                    {formCaption.length}/{curPlatConf.maxCaption}
                  </span>
                )}
              </div>
              {/* AI Rewrite buttons — expanded */}
              <div className="flex gap-1 items-center flex-wrap">
                <span className="text-[9px] text-white/40"><Wand2 className="h-2.5 w-2.5 inline mr-0.5" />AI:</span>
                {(["engaging", "viral", "professional", "casual", "storytelling", "controversial"] as const).map(style => (
                  <Button key={style} size="sm" variant="outline" disabled={rewritingCaption || !formCaption.trim()}
                    onClick={() => rewriteCaption(style)}
                    className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50 capitalize">
                    {rewritingCaption ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : style}
                  </Button>
                ))}
              </div>
              {/* AI Generate from media/context */}
              {(formMediaFiles.length > 0 || formExistingMedia.length > 0 || formTitle) && (
                <Button size="sm" variant="outline" onClick={generateCaptionFromImage} disabled={generatingFromImage}
                  className="text-[9px] h-5 px-2 border-primary/20 text-primary w-full">
                  {generatingFromImage ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Brain className="h-2.5 w-2.5 mr-1" />}
                  AI Auto-Caption from Context
                </Button>
              )}
              {/* A/B Testing */}
              <Button size="sm" variant="outline" onClick={generateABVariants} disabled={generatingAB || !formCaption.trim()}
                className="text-[9px] h-5 px-2 border-white/[0.08] text-white/50 w-full">
                {generatingAB ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Scissors className="h-2.5 w-2.5 mr-1" />}
                Generate A/B Variants
              </Button>
              {/* NEW: Hook Generator + Translator + Tone + Video Script + Carousel + Storyboard */}
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={generateHooks} disabled={generatingHooks}
                  className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50 flex-1">
                  {generatingHooks ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Lightbulb className="h-2.5 w-2.5 mr-0.5" />Hooks</>}
                </Button>
                <Button size="sm" variant="outline" onClick={analyzeTone} disabled={generatingToneAnalysis || !formCaption.trim()}
                  className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50 flex-1">
                  {generatingToneAnalysis ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><BarChart3 className="h-2.5 w-2.5 mr-0.5" />Tone</>}
                </Button>
                <Button size="sm" variant="outline" onClick={generateVideoScript} disabled={generatingScript}
                  className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50 flex-1">
                  {generatingScript ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Video className="h-2.5 w-2.5 mr-0.5" />Script</>}
                </Button>
                <Button size="sm" variant="outline" onClick={generateCarousel} disabled={generatingCarousel}
                  className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50 flex-1">
                  {generatingCarousel ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Layers className="h-2.5 w-2.5 mr-0.5" />Carousel</>}
                </Button>
                <Button size="sm" variant="outline" onClick={generateStoryboard} disabled={generatingStoryboard}
                  className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50 flex-1">
                  {generatingStoryboard ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Sparkle className="h-2.5 w-2.5 mr-0.5" />Board</>}
                </Button>
              </div>
              {/* Translate row */}
              <div className="flex gap-1 items-center flex-wrap">
                <span className="text-[9px] text-white/40"><Globe className="h-2.5 w-2.5 inline mr-0.5" />Translate:</span>
                {["Spanish", "French", "Portuguese", "German", "Japanese", "Arabic", "Hindi", "Korean"].map(lang => (
                  <Button key={lang} size="sm" variant="outline" onClick={() => translateCaption(lang)} disabled={translating || !formCaption.trim()}
                    className="text-[9px] h-5 px-1.5 border-white/[0.08] text-white/50">
                    {translating ? <Loader2 className="h-2 w-2 animate-spin" /> : lang.slice(0, 2).toUpperCase()}
                  </Button>
                ))}
              </div>
              {/* Hooks display */}
              {hooks.length > 0 && (
                <div className="space-y-1 bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">Scroll-Stopping Hooks · click to prepend</p>
                  {hooks.map((h, i) => (
                    <button key={i} onClick={() => { setFormCaption(h + "\n\n" + formCaption); setHooks([]); toast.success("Hook applied"); }}
                      className="w-full text-left bg-white/[0.04] border border-white/[0.06] rounded-lg p-1.5 hover:border-primary/30 transition-colors text-[10px] text-white/70">
                      {h}
                    </button>
                  ))}
                </div>
              )}
              {/* Tone Analysis display */}
              {toneAnalysis && (
                <div className="bg-white/[0.03] rounded-lg p-2 space-y-1">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">Tone Analysis</p>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="text-center"><p className="text-sm font-bold text-white">{toneAnalysis.scroll_stop_score}/10</p><p className="text-[8px] text-white/40">Scroll Stop</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-white">{toneAnalysis.cta_strength}/10</p><p className="text-[8px] text-white/40">CTA</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-white">{toneAnalysis.readability}/10</p><p className="text-[8px] text-white/40">Readability</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-white capitalize">{toneAnalysis.tone}</p><p className="text-[8px] text-white/40">Tone</p></div>
                  </div>
                  {toneAnalysis.improvements?.length > 0 && (
                    <div className="mt-1">{toneAnalysis.improvements.map((tip: string, i: number) => (
                      <p key={i} className="text-[9px] text-primary/80">💡 {tip}</p>
                    ))}</div>
                  )}
                  <Badge variant="outline" className={`text-[8px] ${toneAnalysis.brand_safety === "safe" ? "border-emerald-500/20 text-emerald-400" : toneAnalysis.brand_safety === "edgy" ? "border-amber-500/20 text-amber-400" : "border-destructive/20 text-destructive"}`}>
                    {toneAnalysis.brand_safety === "safe" ? "✅" : "⚠️"} {toneAnalysis.brand_safety}
                  </Badge>
                </div>
              )}
              {/* Video Script display */}
              {videoScript && (
                <div className="bg-white/[0.03] rounded-lg p-2 space-y-1.5">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">Video Script</p>
                  <div className="bg-primary/10 rounded p-1.5"><p className="text-[10px] font-medium text-primary">Hook: {videoScript.hook}</p></div>
                  {videoScript.scenes?.map((s: any, i: number) => (
                    <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded p-1.5">
                      <div className="flex justify-between"><span className="text-[9px] font-bold text-white">{s.timestamp}</span><span className="text-[8px] text-white/40">{s.transition}</span></div>
                      <p className="text-[9px] text-white/60">Visual: {s.visual}</p>
                      {s.text_overlay && <p className="text-[9px] text-primary/70">Text: {s.text_overlay}</p>}
                      {s.narration && <p className="text-[9px] text-white/40">Narration: {s.narration}</p>}
                    </div>
                  ))}
                  <p className="text-[9px] text-white/40">Music: {videoScript.music_mood} · CTA: {videoScript.cta}</p>
                  <Button size="sm" variant="outline" onClick={() => { setFormCaption(videoScript.caption || ""); if (videoScript.hashtags) setFormHashtags(videoScript.hashtags.join(", ")); setVideoScript(null); toast.success("Script caption applied"); }}
                    className="text-[9px] h-5 w-full border-primary/20 text-primary">Use Script Caption</Button>
                </div>
              )}
              {/* Carousel Slides display */}
              {carouselSlides.length > 0 && (
                <div className="bg-white/[0.03] rounded-lg p-2 space-y-1.5">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">Carousel Slides ({carouselSlides.length})</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {carouselSlides.map((slide, i) => (
                      <div key={i} className="min-w-[140px] bg-white/[0.04] border border-white/[0.06] rounded-lg p-2 flex-shrink-0">
                        <p className="text-[8px] text-primary font-bold">Slide {i + 1}</p>
                        <p className="text-[10px] font-medium text-white mt-0.5">{slide.title}</p>
                        <p className="text-[9px] text-white/40 mt-0.5 line-clamp-3">{slide.body}</p>
                        <p className="text-[8px] text-primary/60 mt-0.5">{slide.cta}</p>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setFormCaption(carouselSlides.map((s, i) => `Slide ${i+1}: ${s.title}\n${s.body}`).join("\n\n")); setCarouselSlides([]); toast.success("Carousel content applied to caption"); }}
                    className="text-[9px] h-5 w-full border-primary/20 text-primary">Apply to Caption</Button>
                </div>
              )}
              {abVariants.length > 0 && (
                <div className="space-y-1.5 bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">A/B Variants · click to use</p>
                  {abVariants.map((v, i) => (
                    <button key={i} onClick={() => { setFormCaption(v); setAbVariants([]); toast.success(`Variant ${String.fromCharCode(65 + i)} selected`); }}
                      className="w-full text-left bg-white/[0.04] border border-white/[0.06] rounded-lg p-2 hover:border-primary/30 transition-colors">
                      <span className="text-[9px] font-bold text-primary">Variant {String.fromCharCode(65 + i)}</span>
                      <p className="text-[10px] text-white/60 line-clamp-3 mt-0.5">{v}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
              placeholder="Internal notes..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[40px]" />

            {/* Media Upload */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Media</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formExistingMedia.map((url, i) => (
                  <div key={`e-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08]">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeExistingMedia(i)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"><X className="h-2.5 w-2.5 text-white" /></button>
                  </div>
                ))}
                {formMediaPreviews.map((url, i) => (
                  <div key={`n-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-primary/30">
                    {formMediaFiles[i]?.type.startsWith("video") ? (
                      <div className="w-full h-full bg-white/[0.03] flex items-center justify-center"><Video className="h-5 w-5 text-white/40" /></div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => removeNewMedia(i)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"><X className="h-2.5 w-2.5 text-white" /></button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 rounded-lg border border-dashed border-white/[0.1] flex items-center justify-center hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4 text-white/40" />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleMediaSelect} className="hidden" />
            </div>

            {/* Platform-specific fields */}
            {curPlatConf?.fields.location && (
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2 h-3.5 w-3.5 text-white/40" />
                <Input value={formLocation} onChange={e => setFormLocation(e.target.value)}
                  placeholder="Add location..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs pl-8" />
              </div>
            )}
            {curPlatConf?.fields.altText && (
              <Input value={formAltText} onChange={e => setFormAltText(e.target.value)}
                placeholder="Alt text for accessibility..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />
            )}
            {curPlatConf?.fields.link && (
              <Input value={formLink} onChange={e => setFormLink(e.target.value)}
                placeholder="Link URL..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />
            )}
            {curPlatConf?.fields.privacy && (
              <Select value={formPrivacy} onValueChange={setFormPrivacy}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,10%)] border-white/[0.08]">
                  <SelectItem value="PUBLIC_TO_EVERYONE" className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">Public</SelectItem>
                  <SelectItem value="MUTUAL_FOLLOW_FRIENDS" className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">Friends Only</SelectItem>
                  <SelectItem value="SELF_ONLY" className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">Private</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Hashtags with AI generator */}
            {curPlatConf?.fields.hashtags !== false && (
              <div className="space-y-1">
                <div className="relative">
                  <Input value={formHashtags} onChange={e => setFormHashtags(e.target.value)}
                    placeholder={`Hashtags (comma-separated, max ${curPlatConf?.hashtagLimit || 30})...`}
                    className="bg-white/[0.04] border-white/[0.08] text-white text-xs pr-20" />
                  <Button size="sm" variant="outline" onClick={generateHashtags} disabled={generatingHashtags}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] h-6 px-2 border-primary/20 text-primary">
                    {generatingHashtags ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Hash className="h-2.5 w-2.5 mr-0.5" />AI</>}
                  </Button>
                </div>
                {formHashtags && (
                  <p className="text-[9px] text-white/30">
                    {formHashtags.split(",").filter(h => h.trim()).length} / {curPlatConf?.hashtagLimit || 30} hashtags
                  </p>
                )}
              </div>
            )}
            <Input value={formCta} onChange={e => setFormCta(e.target.value)}
              placeholder="Call to action..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />

            {/* Schedule with Smart Scheduling */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white text-xs flex-1" />
                <Button size="sm" variant="outline" onClick={suggestSchedule} disabled={smartScheduling}
                  className="text-[9px] h-10 px-2 border-primary/20 text-primary">
                  {smartScheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Timer className="h-3 w-3 mr-0.5" />Smart</>}
                </Button>
              </div>
              {suggestedSlots.length > 0 && (
                <div className="flex gap-1 flex-wrap bg-white/[0.03] rounded-lg p-2">
                  <span className="text-[9px] text-white/40 w-full mb-0.5">AI Suggested Slots:</span>
                  {suggestedSlots.map((slot, i) => {
                    try {
                      const d = new Date(slot);
                      return (
                        <Button key={i} size="sm" variant="outline"
                          onClick={() => { setFormSchedule(slot.slice(0, 16)); setSuggestedSlots([]); toast.success("Schedule set"); }}
                          className="text-[9px] h-5 px-2 border-primary/20 text-primary">
                          {format(d, "EEE h:mm a")}
                        </Button>
                      );
                    } catch { return null; }
                  })}
                </div>
              )}
            </div>

            {/* Cross-post to other platforms */}
            {!editingId && formPlatform && (
              <div className="bg-white/[0.03] rounded-lg p-2">
                <p className="text-[9px] text-white/40 mb-1.5 flex items-center gap-1"><Copy className="h-2.5 w-2.5" /> Also create for:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {availablePlatforms.filter(p => p !== formPlatform).map(p => (
                    <button key={p} onClick={() => setCrossPostPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className={`text-[10px] px-2 py-0.5 rounded-md border capitalize transition-colors ${crossPostPlatforms.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-white/[0.08] text-white/40 hover:border-primary/50"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Prediction */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={predictEngagement} disabled={engagementPredicting}
                className="border-primary/20 text-primary text-xs h-7 flex-1">
                {engagementPredicting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <BarChart3 className="h-3 w-3 mr-1" />}
                Predict Engagement
              </Button>
              {predictedScore !== null && (
                <Badge variant="outline" className={`text-sm ${predictedScore >= 70 ? "border-emerald-500/30 text-emerald-400" : predictedScore >= 40 ? "border-amber-500/30 text-amber-400" : "border-destructive/30 text-destructive"}`}>
                  <Flame className="h-3 w-3 mr-0.5" />{predictedScore}%
                </Badge>
              )}
            </div>

            <Button onClick={saveItem} disabled={uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {editingId ? "Update Content" : crossPostPlatforms.length > 0 ? `Save + Cross-post (${crossPostPlatforms.length + 1} platforms)` : "Save as Draft"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ========== THREAD BUILDER DIALOG ========== */}
      <Dialog open={showThreadBuilder} onOpenChange={setShowThreadBuilder}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Thread Builder</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Create multi-part threads for X/Twitter or Threads with AI assistance.</p>
          <div className="space-y-3">
            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Thread topic..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />
            <Select value={formPlatform || "twitter"} onValueChange={v => setFormPlatform(v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(222,35%,10%)] border-white/[0.08]">
                <SelectItem value="twitter" className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">X / Twitter</SelectItem>
                <SelectItem value="threads" className="text-xs text-white/70 focus:bg-white/[0.06] focus:text-white">Threads</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateThread} disabled={generatingThread} className="w-full bg-primary text-primary-foreground text-xs">
              {generatingThread ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              AI Generate Thread
            </Button>
            {threadParts.length > 0 && threadParts[0] && (
              <div className="space-y-2">
                {threadParts.map((part, i) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-primary">Part {i + 1}/{threadParts.length}</span>
                      <span className="text-[9px] text-white/40">{part.length} chars</span>
                    </div>
                    <Textarea value={part} onChange={e => { const n = [...threadParts]; n[i] = e.target.value; setThreadParts(n); }}
                      className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-[60px]" />
                  </div>
                ))}
                <Button onClick={publishThread} disabled={!connForPlatform(formPlatform || "twitter")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                  <Send className="h-3.5 w-3.5 mr-1" /> Publish {threadParts.length}-Part Thread
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== CONTENT PILLARS DIALOG ========== */}
      <Dialog open={showPillars} onOpenChange={setShowPillars}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Content Pillar Strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {contentPillars.map((pillar, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm font-bold ${pillar.color || "text-white"}`}>{pillar.name}</p>
                    <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">{pillar.percentage}%</Badge>
                  </div>
                  <p className="text-[10px] text-white/50 mb-2">{pillar.description}</p>
                  <p className="text-[9px] text-white/40 mb-1">{pillar.posting_frequency} · Types: {pillar.content_types?.join(", ")}</p>
                  <div className="space-y-0.5">
                    {pillar.example_topics?.map((topic: string, j: number) => (
                      <button key={j} onClick={() => { setFormTitle(topic); setFormCaption(topic); setShowPillars(false); setShowCreate(true); toast.success("Topic applied"); }}
                        className="w-full text-left text-[9px] text-primary/70 hover:text-primary transition-colors">
                        → {topic}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== COMPETITOR INSPIRED DIALOG ========== */}
      <Dialog open={showCompetitorInspire} onOpenChange={setShowCompetitorInspire}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Competitor-Inspired Ideas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {competitorIdeas.map((idea, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">{idea.title}</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={`text-[9px] ${idea.estimated_reach === "viral" ? "border-pink-500/20 text-pink-400" : idea.estimated_reach === "high" ? "border-emerald-500/20 text-emerald-400" : "border-white/[0.08] text-white/40"}`}>
                        {idea.estimated_reach}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-white/[0.08] text-white/40">{idea.difficulty}</Badge>
                    </div>
                  </div>
                  <p className="text-[9px] text-blue-400/70 mb-1">Strategy: {idea.strategy}</p>
                  <p className="text-[10px] text-white/50 line-clamp-2 mb-1">{idea.caption}</p>
                  <p className="text-[9px] text-white/30">{idea.why_it_works}</p>
                  <Button size="sm" className="mt-1.5 text-[9px] h-5 bg-primary text-primary-foreground" onClick={() => {
                    applyTrendIdea({ ...idea, platform: idea.platform, viral_potential: idea.estimated_reach === "viral" ? 90 : 60 });
                  }}>
                    <Plus className="h-2.5 w-2.5 mr-0.5" /> Save Draft
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== STORYBOARD DIALOG ========== */}
      <Dialog open={showStoryboard} onOpenChange={setShowStoryboard}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Sparkle className="h-4 w-4 text-primary" /> Storyboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {storyboardScenes.map((scene, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-primary">Scene {scene.scene_number || i + 1}</span>
                  <span className="text-[9px] text-white/40">{scene.duration}</span>
                </div>
                <p className="text-[10px] text-white/70">Visual: {scene.visual}</p>
                {scene.text_overlay && <p className="text-[10px] text-primary/70">Text: {scene.text_overlay}</p>}
                {scene.audio && <p className="text-[9px] text-white/40">Audio: {scene.audio}</p>}
                {scene.engagement && <p className="text-[9px] text-amber-400">{scene.engagement}</p>}
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-white/30">Camera: {scene.camera}</span>
                  <span className="text-[8px] text-white/30">Transition: {scene.transition}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== CONTENT BRIEF DIALOG ========== */}
      <Dialog open={showContentBrief} onOpenChange={setShowContentBrief}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> AI Content Brief Generator</DialogTitle>
          </DialogHeader>
          {!contentBrief ? (
            <div className="space-y-3">
              <p className="text-xs text-white/50">Generate a comprehensive campaign brief with target audience, content mix, hashtag strategy, and auto-create all content pieces.</p>
              <Input value={briefTopic} onChange={e => setBriefTopic(e.target.value)}
                placeholder="Campaign topic (e.g., 'Summer Launch', 'Brand Awareness')" className="bg-white/[0.04] border-white/[0.08] text-white text-xs" />
              <Select value={formPlatform || "instagram"} onValueChange={v => setFormPlatform(v)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Primary Platform" /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,35%,10%)] border-white/[0.08]">
                  {availablePlatforms.map(p => <SelectItem key={p} value={p} className="text-xs capitalize text-white/70 focus:bg-white/[0.06] focus:text-white">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={generateContentBrief} disabled={generatingBrief || !briefTopic.trim()}
                className="w-full bg-primary text-primary-foreground text-xs">
                {generatingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Generate Campaign Brief
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <h3 className="text-sm font-bold text-white">{contentBrief.campaign_name}</h3>
                <p className="text-[10px] text-white/50 mt-0.5">Objective: {contentBrief.objective}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Target Audience</p>
                  <p className="text-[10px] text-white">{contentBrief.target_audience}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Visual Direction</p>
                  <p className="text-[10px] text-white">{contentBrief.visual_direction}</p>
                </div>
              </div>
              {contentBrief.key_messages && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Key Messages</p>
                  {contentBrief.key_messages.map((msg: string, i: number) => (
                    <p key={i} className="text-[10px] text-white">· {msg}</p>
                  ))}
                </div>
              )}
              {contentBrief.content_mix && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Content Mix</p>
                  {contentBrief.content_mix.map((mix: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-white py-0.5">
                      <Badge variant="outline" className="text-[8px] border-white/[0.08] text-white/40 capitalize">{mix.type}</Badge>
                      <span>×{mix.quantity}</span>
                      <span className="text-white/50">· {mix.description}</span>
                    </div>
                  ))}
                </div>
              )}
              {contentBrief.hook_templates && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Hook Templates</p>
                  {contentBrief.hook_templates.map((h: string, i: number) => (
                    <p key={i} className="text-[10px] text-white/70">"{h}"</p>
                  ))}
                </div>
              )}
              {contentBrief.hashtag_strategy && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1"># Hashtag Strategy</p>
                  {Object.entries(contentBrief.hashtag_strategy).map(([cat, tags]: [string, any]) => (
                    <div key={cat} className="flex gap-1 items-center flex-wrap mt-0.5">
                      <span className="text-[9px] text-white/40 capitalize w-16">{cat}:</span>
                      {(Array.isArray(tags) ? tags : []).map((t: string, i: number) => (
                        <span key={i} className="text-[9px] text-primary/70">#{t}</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {contentBrief.success_metrics && (
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Success Metrics</p>
                  <p className="text-[10px] text-white">{typeof contentBrief.success_metrics === 'string' ? contentBrief.success_metrics : JSON.stringify(contentBrief.success_metrics)}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => executeBrief(contentBrief)} disabled={generating}
                  className="flex-1 bg-primary text-primary-foreground text-xs">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                  Execute Brief · Create All Content
                </Button>
                <Button variant="outline" onClick={() => setContentBrief(null)} className="text-xs border-white/[0.08] text-white/50">
                  New Brief
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== WEEKLY HEATMAP DIALOG ========== */}
      <Dialog open={showHeatmap} onOpenChange={setShowHeatmap}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Flame className="h-4 w-4 text-primary" /> Weekly Posting Heatmap</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Your posting density by day and hour · find gaps and optimize cadence.</p>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex">
                <div className="w-10" />
                {heatmapData.hours.filter(h => h % 3 === 0).map(h => (
                  <div key={h} className="flex-1 text-center text-[8px] text-white/40">
                    {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h-12}p`}
                  </div>
                ))}
              </div>
              {heatmapData.days.map(day => (
                <div key={day} className="flex items-center gap-0.5 mb-0.5">
                  <span className="w-10 text-[9px] text-white/40 text-right pr-1">{day}</span>
                  {heatmapData.hours.map(h => {
                    const count = heatmapData.grid[`${day}-${h}`] || 0;
                    const intensity = count === 0 ? "bg-white/[0.04]" : count === 1 ? "bg-emerald-500/30" : count === 2 ? "bg-emerald-500/50" : "bg-emerald-500/80";
                    return (
                      <div key={h} className={`flex-1 h-5 rounded-sm ${intensity} border border-white/[0.04]`} title={`${day} ${h}:00 · ${count} posts`} />
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2 justify-end">
                <span className="text-[8px] text-white/40">Less</span>
                <div className="h-3 w-3 rounded-sm bg-white/[0.04] border border-white/[0.04]" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500/30 border border-white/[0.04]" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500/50 border border-white/[0.04]" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500/80 border border-white/[0.04]" />
                <span className="text-[8px] text-white/40">More</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== APPROVAL QUEUE DIALOG ========== */}
      <Dialog open={showApprovalQueue} onOpenChange={setShowApprovalQueue}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Content Approval Queue</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Review content before scheduling. Drafts · Submit for Review · Approve · Schedule.</p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Pending Review ({approvalItems.length})</p>
              {approvalItems.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No content awaiting review</p>
              ) : approvalItems.map(item => (
                <Card key={item.id} className="bg-white/[0.03] border-white/[0.06] mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[9px] capitalize gap-0.5 ${platformConf(item.platform).color}`}>
                        {platformIcon(item.platform)} {item.platform}
                      </Badge>
                      <span className="text-xs text-white flex-1 truncate">{item.title}</span>
                    </div>
                    <p className="text-[10px] text-white/50 line-clamp-2 mb-2">{item.caption}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => approveContent(item.id)}
                        className="flex-1 text-[10px] h-6 bg-emerald-600 text-white">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectContent(item.id)}
                        className="flex-1 text-[10px] h-6 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        <X className="h-2.5 w-2.5 mr-0.5" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowDetail(item); setShowApprovalQueue(false); }}
                        className="text-[10px] h-6 border-white/[0.08] bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white">
                        <Eye className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Drafts to Submit</p>
              {items.filter(i => i.status === "draft").slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
                  <span className="text-[10px] text-white flex-1 truncate">{item.title}</span>
                  <Badge variant="outline" className={`text-[8px] capitalize gap-0.5 ${platformConf(item.platform).color}`}>{item.platform}</Badge>
                  <Button size="sm" variant="outline" onClick={() => moveToReview(item.id)}
                    className="text-[9px] h-5 px-2 border-primary/20 bg-primary/10 text-primary hover:bg-primary/20">Submit</Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== HASHTAG BANK DIALOG ========== */}
      <Dialog open={showHashtagBank} onOpenChange={setShowHashtagBank}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> Hashtag Bank</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Save and reuse your best hashtag sets across content.</p>
          <div className="space-y-3">
            {formHashtags.trim() && (
              <div className="flex gap-1.5 items-center">
                <Input value={newSetName} onChange={e => setNewSetName(e.target.value)}
                  placeholder="Set name..." className="bg-white/[0.04] border-white/[0.08] text-white text-xs flex-1" />
                <Button size="sm" onClick={saveHashtagSet} className="text-xs h-8 bg-primary text-primary-foreground">
                  <Plus className="h-3 w-3 mr-0.5" /> Save Current
                </Button>
              </div>
            )}
            {hashtagSets.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">No saved hashtag sets yet. Generate hashtags in the create dialog, then save them here.</p>
            ) : hashtagSets.map((set, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{set.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[8px] border-white/[0.08] text-white/40 capitalize">{set.platform}</Badge>
                      <Button size="sm" variant="outline" onClick={() => applyHashtagSet(set)}
                        className="text-[9px] h-5 px-2 border-primary/20 text-primary">Use</Button>
                      <Button size="sm" variant="outline" onClick={() => setHashtagSets(prev => prev.filter((_, j) => j !== i))}
                        className="text-[9px] h-5 px-1 border-destructive/20 text-destructive"><X className="h-2.5 w-2.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {set.tags.slice(0, 10).map((t, j) => <span key={j} className="text-[9px] text-primary/60">#{t}</span>)}
                    {set.tags.length > 10 && <span className="text-[9px] text-white/40">+{set.tags.length - 10}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== CAPTION LIBRARY DIALOG ========== */}
      <Dialog open={showCaptionLibrary} onOpenChange={setShowCaptionLibrary}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Caption Library</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Save your best captions for quick reuse. Click to apply.</p>
          {formCaption.trim() && (
            <Button size="sm" variant="outline" onClick={() => saveCaptionToLibrary(formCaption, formPlatform || "all")}
              className="text-xs h-8 border-primary/20 text-primary w-full">
              <Plus className="h-3 w-3 mr-1" /> Save Current Caption to Library
            </Button>
          )}
          <div className="space-y-2">
            {savedCaptions.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">No saved captions yet. Write a great caption and save it here for reuse.</p>
            ) : savedCaptions.map(cap => (
              <Card key={cap.id} className="bg-white/[0.03] border-white/[0.06] hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => applySavedCaption(cap)}>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium text-white">{cap.label}</span>
                    <div className="flex gap-1 items-center">
                      <Badge variant="outline" className="text-[8px] border-white/[0.08] text-white/40 capitalize">{cap.platform}</Badge>
                      <button onClick={(e) => { e.stopPropagation(); setSavedCaptions(prev => prev.filter(c => c.id !== cap.id)); }}
                        className="p-0.5 rounded hover:bg-destructive/15"><X className="h-2.5 w-2.5 text-destructive/50" /></button>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/50 line-clamp-3">{cap.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== COMPETITOR BEST TIMES DIALOG ========== */}
      <Dialog open={showCompetitorBestTimes} onOpenChange={setShowCompetitorBestTimes}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-400" /> Competitor Best Posting Times</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">Optimal posting times derived from {competitorProfiles.length} tracked competitors</p>
          <div className="space-y-3">
            {competitorBestTimes.map((t, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white capitalize">{t.platform}</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-400">{t.frequency} posts/wk</Badge>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {(t.best_hours || []).map((h: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-[9px] border-primary/20 text-primary">{h}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {(t.best_days || []).map((d: string, j: number) => (
                      <span key={j} className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded">{d}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/40">{t.reasoning}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <InsufficientCreditsModal open={insufficientModal.open} onClose={closeInsufficientModal}
        requiredCredits={insufficientModal.requiredCredits} actionName={insufficientModal.actionName} />
    </div>
  );
};

export default ContentCommandCenter;

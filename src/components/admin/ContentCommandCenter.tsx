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
    color: "text-foreground", bestTimes: ["8:00 AM", "12:00 PM", "6:00 PM"],
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
      const { error } = await supabase.storage.from("default-assets").upload(path, file);
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data: urlData } = supabase.storage.from("default-assets").getPublicUrl(path);
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
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    let content = "";
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      try { const p = JSON.parse(line.slice(6)); content += p.choices?.[0]?.delta?.content || ""; } catch {}
    }
    return content;
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
        const content = await callAI(`Rewrite this ${formPlatform || "social media"} caption in a ${style} style. Make it ${styleGuide[style]}.

Platform: ${formPlatform || "instagram"} (character limit: ${platformConf(formPlatform || "instagram").maxCaption})
Content type: ${formType}
Original caption: "${formCaption}"

Rules:
- Keep within ${platformConf(formPlatform || "instagram").maxCaption} characters
- Include line breaks for readability
- Add relevant emojis naturally
- End with a clear CTA or engagement hook
- Don't include hashtags (those are separate)
- Optimize specifically for ${platformConf(formPlatform || "instagram").label} algorithm

Respond ONLY with the rewritten caption text, nothing else.`);
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
        const content = await callAI(`Generate a perfect ${formPlatform || "instagram"} ${formType} caption.

Platform: ${formPlatform || "instagram"} (max ${platformConf(formPlatform || "instagram").maxCaption} chars)
Content type: ${formType}
Context: User has uploaded ${formMediaFiles.length + formExistingMedia.length} media file(s)
Current title: "${formTitle || "no title"}"
Notes: "${formDesc || "none"}"

Create a caption that:
- Hooks the reader in the first line (pattern interrupt)
- Creates curiosity about the media
- Has natural emoji placement
- Ends with a strong CTA
- Is optimized for ${platformConf(formPlatform || "instagram").label}'s algorithm
- Matches the ${formType} content type style

Respond ONLY with the caption text.`);
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
      default: return "border-white/10 text-muted-foreground";
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Content Command Center
            </h1>
            <CreditCostBadge cost="3-5" variant="header" label="per content" />
          </div>
          <p className="text-xs text-muted-foreground">Create, schedule, and publish across all platforms</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowPerformance(true)}
            className="border-border text-muted-foreground text-xs h-8">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowRecycler(true)}
            className="border-border text-muted-foreground text-xs h-8">
            <Repeat className="h-3.5 w-3.5 mr-1" /> Recycle
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSeriesPlanner(true)}
            className="border-border text-muted-foreground text-xs h-8">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Series
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)}
            className="border-primary/20 text-primary text-xs h-8">
            <Layers className="h-3.5 w-3.5 mr-1" /> Templates
          </Button>
          <Button size="sm" variant="outline" onClick={generateTrendIdeas} disabled={generatingTrends}
            className="border-border text-muted-foreground text-xs h-8">
            {generatingTrends ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <TrendingUp className="h-3.5 w-3.5 mr-1" />}
            Trends
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
          <Card key={s.title} className="bg-card/50 border-border">
            <CardContent className="p-3">
              <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connected accounts */}
      {connections.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected:</span>
          {connections.map(c => (
            <Badge key={c.id} variant="outline" className="text-[10px] border-border text-muted-foreground gap-1">
              {platformIcon(c.platform)} <span className="capitalize">{c.platform}</span>
              <span className="text-emerald-400">@{c.platform_username}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Tabs + Filters + View Mode + Search + Bulk */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card/50 border border-border">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="drafts" className="text-xs">Drafts</TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
              <TabsTrigger value="published" className="text-xs">Published</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..." className="bg-card/50 border-border text-foreground text-xs h-8 pl-7" />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button size="sm" variant={bulkMode ? "default" : "outline"} onClick={() => { setBulkMode(!bulkMode); setSelectedItems(new Set()); }}
            className={`text-xs h-8 ${bulkMode ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
            <CheckSquare className="h-3.5 w-3.5 mr-1" /> Bulk
          </Button>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="bg-card/50 border-border text-foreground h-8 text-xs w-32"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
              {availablePlatforms.map(p => (
                <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("calendar")} className={`p-1.5 ${viewMode === "calendar" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedItems.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg p-2">
          <span className="text-xs text-primary font-medium">{selectedItems.size} selected</span>
          <Button size="sm" variant="outline" onClick={selectAll} className="text-xs h-6 border-border text-muted-foreground">
            {selectedItems.size === filtered.length ? "Deselect All" : "Select All"}
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("scheduled")} className="text-xs h-6 border-blue-500/20 text-blue-400">Schedule</Button>
          <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("draft")} className="text-xs h-6 border-amber-500/20 text-amber-400">→ Draft</Button>
          <Button size="sm" variant="outline" onClick={() => bulkChangeStatus("archived")} className="text-xs h-6 border-border text-muted-foreground">Archive</Button>
          <Button size="sm" variant="outline" onClick={bulkDelete} className="text-xs h-6 border-destructive/20 text-destructive">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Content Display */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/50 border-border">
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No content yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Create a draft, use a template, or auto-generate with AI</p>
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
                <h3 className="text-xs font-semibold text-foreground mb-2">{labels[group] || group}</h3>
                <div className="space-y-1.5">
                  {groupItems.map(item => (
                    <Card key={item.id} className="bg-card/50 border-border hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => !bulkMode && setShowDetail(item)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {bulkMode && (
                          <button onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}>
                            {selectedItems.has(item.id)
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        )}
                        <Badge variant="outline" className={`${statusColor(item.status)} capitalize text-[9px]`}>{item.status}</Badge>
                        <span className="flex-1 text-xs text-foreground truncate">{item.title}</span>
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize gap-0.5">
                          {platformIcon(item.platform)} {item.platform}
                        </Badge>
                        {item.scheduled_at && (
                          <span className="text-[9px] text-muted-foreground">{format(new Date(item.scheduled_at), "h:mm a")}</span>
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
            <Card key={item.id} className="bg-card/50 border-border hover:border-primary/30 transition-all cursor-pointer group relative"
              onClick={() => !bulkMode && setShowDetail(item)}>
              {bulkMode && (
                <button onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                  className="absolute top-2 left-2 z-10">
                  {selectedItems.has(item.id)
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
              )}
              {/* Media preview */}
              {item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0 && (
                <div className="h-32 overflow-hidden rounded-t-lg">
                  {/\.(mp4|mov|avi|webm)$/i.test(item.media_urls[0]) ? (
                    <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground" />
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
                  <Badge variant="outline" className={`text-[9px] border-border capitalize gap-0.5 ${platformConf(item.platform).color}`}>
                    {platformIcon(item.platform)} {item.platform}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize">{item.content_type}</Badge>
                  {item.viral_score > 0 && (
                    <Badge variant="outline" className={`text-[9px] ${item.viral_score >= 70 ? "border-emerald-500/20 text-emerald-400" : "border-border text-muted-foreground"}`}>
                      <Flame className="h-2.5 w-2.5 mr-0.5" />{item.viral_score}%
                    </Badge>
                  )}
                  {item.metadata?.series && (
                    <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400">
                      <BookOpen className="h-2 w-2 mr-0.5" /> Pt {item.metadata.part}
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground mb-1 line-clamp-1">{item.title}</p>
                {item.caption && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{item.caption}</p>}
                {item.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(item.hashtags as string[]).slice(0, 4).map((h, i) => (
                      <span key={i} className="text-[9px] text-blue-400/60">#{h}</span>
                    ))}
                    {item.hashtags.length > 4 && <span className="text-[9px] text-muted-foreground/40">+{item.hashtags.length - 4}</span>}
                  </div>
                )}
                {item.scheduled_at && (
                  <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-2.5 w-2.5" /> {format(new Date(item.scheduled_at), "MMM d, h:mm a")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ========== DETAIL DIALOG ========== */}
      <Dialog open={!!showDetail} onOpenChange={v => { if (!v) setShowDetail(null); }}>
        {showDetail && (
          <DialogContent className="bg-popover border-border text-foreground max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                {platformIcon(showDetail.platform)} {showDetail.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={`${statusColor(showDetail.status)} capitalize`}>{showDetail.status}</Badge>
                <Badge variant="outline" className="border-border text-muted-foreground capitalize gap-1">
                  {platformIcon(showDetail.platform)} {platformConf(showDetail.platform).label}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground capitalize">{showDetail.content_type}</Badge>
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
                    <div key={i} className="rounded-lg overflow-hidden border border-border">
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
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{platformConf(showDetail.platform).captionLabel}</p>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">{showDetail.caption}</p>
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
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[9px] text-muted-foreground">Location</p>
                    <p className="text-xs text-foreground/70 flex items-center gap-1"><MapPin className="h-3 w-3" /> {showDetail.metadata.location}</p>
                  </div>
                )}
                {showDetail.cta && (
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[9px] text-muted-foreground">CTA</p>
                    <p className="text-xs text-foreground/70">{showDetail.cta}</p>
                  </div>
                )}
                {showDetail.scheduled_at && (
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[9px] text-muted-foreground">Scheduled</p>
                    <p className="text-xs text-foreground/70 flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(showDetail.scheduled_at), "MMM d, h:mm a")}</p>
                  </div>
                )}
                {showDetail.description && (
                  <div className="bg-muted/30 rounded-lg p-2 col-span-2">
                    <p className="text-[9px] text-muted-foreground">Notes</p>
                    <p className="text-xs text-foreground/70">{showDetail.description}</p>
                  </div>
                )}
              </div>

              {/* Best posting times */}
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Best Times for {platformConf(showDetail.platform).label}</p>
                <div className="flex gap-1.5">
                  {platformConf(showDetail.platform).bestTimes.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] border-primary/20 text-primary">{t}</Badge>
                  ))}
                </div>
              </div>

              {/* Cross-post + Recycle */}
              {showDetail.status !== "published" && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground mb-1.5 flex items-center gap-1"><Copy className="h-3 w-3" /> Cross-post to other platforms</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {availablePlatforms.filter(p => p !== showDetail.platform).map(p => (
                      <Button key={p} size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); duplicateForPlatform(showDetail, p); }}
                        className="text-[10px] h-6 border-border text-muted-foreground capitalize">
                        {platformIcon(p)} {p}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {showDetail.status === "published" && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground mb-1.5 flex items-center gap-1"><Repeat className="h-3 w-3" /> Recycle to another platform (AI-adapted)</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {availablePlatforms.filter(p => p !== showDetail.platform).map(p => (
                      <Button key={p} size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); recycleContent(showDetail, p); }}
                        className="text-[10px] h-6 border-border text-muted-foreground capitalize">
                        {platformIcon(p)} {p}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
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
                  className="border-border text-muted-foreground hover:text-foreground text-xs h-9">
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteItem(showDetail.id)}
                  className="border-destructive/20 text-destructive hover:text-destructive text-xs h-9">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ========== TEMPLATES DIALOG ========== */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="bg-popover border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Content Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {CONTENT_TEMPLATES.map((t, i) => (
              <Card key={i} className="bg-card/50 border-border hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => { applyTemplate(t); setShowCreate(true); }}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize gap-0.5">
                          {platformIcon(t.platform)} {t.platform}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize">{t.type}</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {t.caption && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1">{t.caption}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== TRENDS DIALOG ========== */}
      <Dialog open={showTrends} onOpenChange={setShowTrends}>
        <DialogContent className="bg-popover border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Trending Content Ideas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {trendIdeas.map((idea, i) => (
              <Card key={i} className="bg-card/50 border-border hover:border-primary/30 transition-all">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{idea.title}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[9px] ${idea.urgency === "now" ? "border-destructive/30 text-destructive" : idea.urgency === "this_week" ? "border-amber-500/20 text-amber-400" : "border-border text-muted-foreground"}`}>
                        {idea.urgency === "now" ? "🔥 Now" : idea.urgency === "this_week" ? "⏰ This Week" : "♻️ Evergreen"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-400">
                        <Flame className="h-2.5 w-2.5 mr-0.5" />{idea.viral_potential}%
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{idea.caption}</p>
                  {idea.trend_source && <p className="text-[9px] text-blue-400/60 mb-1.5">Trend: {idea.trend_source}</p>}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize gap-0.5">
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
        <DialogContent className="bg-popover border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> Content Recycler</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">AI repurposes your published content for other platforms with native adaptation.</p>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {publishedContent.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No published content to recycle yet</p>
            ) : publishedContent.map(item => (
              <Card key={item.id} className="bg-card/50 border-border">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={`text-[9px] capitalize gap-0.5 ${platformConf(item.platform).color}`}>
                      {platformIcon(item.platform)} {item.platform}
                    </Badge>
                    <span className="text-xs text-foreground flex-1 truncate">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mb-2">{item.caption}</p>
                  <div className="flex gap-1 flex-wrap">
                    {availablePlatforms.filter(p => p !== item.platform).map(p => (
                      <Button key={p} size="sm" variant="outline" onClick={() => recycleContent(item, p)}
                        className="text-[9px] h-5 border-border text-muted-foreground capitalize">
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
        <DialogContent className="bg-popover border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Content Series Planner</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">AI generates a multi-part content series with scheduled cadence.</p>
          <div className="space-y-3">
            <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)}
              placeholder="Series topic (e.g., '5 Tips for Growth')" className="bg-card/50 border-border text-foreground text-xs" />
            <div className="flex gap-3 items-center">
              <span className="text-xs text-muted-foreground">Parts:</span>
              {[3, 5, 7].map(n => (
                <Button key={n} size="sm" variant={seriesCount === n ? "default" : "outline"}
                  onClick={() => setSeriesCount(n)}
                  className={`text-xs h-7 ${seriesCount === n ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  {n}
                </Button>
              ))}
            </div>
            <Select value={formPlatform || "instagram"} onValueChange={v => setFormPlatform(v)}>
              <SelectTrigger className="bg-card/50 border-border text-foreground text-xs h-8">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {availablePlatforms.map(p => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
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
        <DialogContent className="bg-popover border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Content Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total Content</p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
                <p className="text-[10px] text-muted-foreground">Published</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{stats.avgViral}%</p>
                <p className="text-[10px] text-muted-foreground">Avg Viral Score</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Per Platform</p>
            {Object.entries(performanceStats).map(([platform, data]) => (
              <div key={platform} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                <Badge variant="outline" className={`text-[9px] capitalize gap-0.5 ${platformConf(platform).color}`}>
                  {platformIcon(platform)} {platform}
                </Badge>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-foreground">{data.total}</p>
                    <p className="text-[9px] text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{data.published}</p>
                    <p className="text-[9px] text-muted-foreground">Published</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-400">{data.avgViral}%</p>
                    <p className="text-[9px] text-muted-foreground">Viral Avg</p>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(performanceStats).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No content data yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== CREATE/EDIT DIALOG ========== */}
      <Dialog open={showCreate} onOpenChange={v => { if (!v) resetForm(); setShowCreate(v); }}>
        <DialogContent className="bg-popover border-border text-foreground max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? "Edit Content" : "Create Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Platform selector */}
            <div className="grid grid-cols-3 gap-2">
              <Select value={formPlatform} onValueChange={v => { setFormPlatform(v); setFormType(platformConf(v).supportedTypes[0] || "post"); setAbVariants([]); setSuggestedSlots([]); }}>
                <SelectTrigger className="bg-card/50 border-border text-foreground text-xs h-8"><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {availablePlatforms.map(p => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">
                      {p}{connForPlatform(p) ? " ✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-card/50 border-border text-foreground text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(curPlatConf?.supportedTypes || CONTENT_TYPES).map(t => (
                    <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formAccount} onValueChange={setFormAccount}>
                <SelectTrigger className="bg-card/50 border-border text-foreground text-xs h-8"><SelectValue placeholder="Creator" /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none" className="text-xs">No creator</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.display_name || a.username}</SelectItem>)}
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
                <div className="bg-muted/30 border border-border rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Image className="h-2.5 w-2.5" /> {platformConf(formPlatform).mediaSpecs}
                  </p>
                </div>
              </div>
            )}

            {/* Platform presets */}
            {formPlatform && PLATFORM_PRESETS[formPlatform] && (
              <div className="flex gap-1.5 items-center flex-wrap">
                <span className="text-[9px] text-muted-foreground"><Palette className="h-2.5 w-2.5 inline mr-0.5" />Quick:</span>
                {PLATFORM_PRESETS[formPlatform].map((preset, i) => (
                  <Button key={i} size="sm" variant="outline" onClick={() => applyPreset(preset)}
                    className="text-[9px] h-5 px-2 border-border text-muted-foreground">
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}

            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Content title..." className="bg-card/50 border-border text-foreground text-xs" />

            {/* Caption with AI rewrite + A/B Testing */}
            <div className="space-y-1">
              <div className="relative">
                <Textarea value={formCaption} onChange={e => setFormCaption(e.target.value)}
                  placeholder={curPlatConf ? `${curPlatConf.captionLabel}...` : "Caption..."}
                  className="bg-card/50 border-border text-foreground text-xs min-h-[80px]" />
                {curPlatConf && (
                  <span className={`absolute bottom-2 right-2 text-[9px] ${formCaption.length > curPlatConf.maxCaption ? "text-destructive" : "text-muted-foreground/40"}`}>
                    {formCaption.length}/{curPlatConf.maxCaption}
                  </span>
                )}
              </div>
              {/* AI Rewrite buttons — expanded */}
              <div className="flex gap-1 items-center flex-wrap">
                <span className="text-[9px] text-muted-foreground"><Wand2 className="h-2.5 w-2.5 inline mr-0.5" />AI:</span>
                {(["engaging", "viral", "professional", "casual", "storytelling", "controversial"] as const).map(style => (
                  <Button key={style} size="sm" variant="outline" disabled={rewritingCaption || !formCaption.trim()}
                    onClick={() => rewriteCaption(style)}
                    className="text-[9px] h-5 px-1.5 border-border text-muted-foreground capitalize">
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
                className="text-[9px] h-5 px-2 border-border text-muted-foreground w-full">
                {generatingAB ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Scissors className="h-2.5 w-2.5 mr-1" />}
                Generate A/B Variants
              </Button>
              {abVariants.length > 0 && (
                <div className="space-y-1.5 bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">A/B Variants — click to use</p>
                  {abVariants.map((v, i) => (
                    <button key={i} onClick={() => { setFormCaption(v); setAbVariants([]); toast.success(`Variant ${String.fromCharCode(65 + i)} selected`); }}
                      className="w-full text-left bg-card/50 border border-border rounded-lg p-2 hover:border-primary/30 transition-colors">
                      <span className="text-[9px] font-bold text-primary">Variant {String.fromCharCode(65 + i)}</span>
                      <p className="text-[10px] text-foreground/70 line-clamp-3 mt-0.5">{v}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
              placeholder="Internal notes..." className="bg-card/50 border-border text-foreground text-xs min-h-[40px]" />

            {/* Media Upload */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Media</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formExistingMedia.map((url, i) => (
                  <div key={`e-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeExistingMedia(i)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"><X className="h-2.5 w-2.5 text-white" /></button>
                  </div>
                ))}
                {formMediaPreviews.map((url, i) => (
                  <div key={`n-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-primary/30">
                    {formMediaFiles[i]?.type.startsWith("video") ? (
                      <div className="w-full h-full bg-muted/30 flex items-center justify-center"><Video className="h-5 w-5 text-muted-foreground" /></div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => removeNewMedia(i)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"><X className="h-2.5 w-2.5 text-white" /></button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleMediaSelect} className="hidden" />
            </div>

            {/* Platform-specific fields */}
            {curPlatConf?.fields.location && (
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={formLocation} onChange={e => setFormLocation(e.target.value)}
                  placeholder="Add location..." className="bg-card/50 border-border text-foreground text-xs pl-8" />
              </div>
            )}
            {curPlatConf?.fields.altText && (
              <Input value={formAltText} onChange={e => setFormAltText(e.target.value)}
                placeholder="Alt text for accessibility..." className="bg-card/50 border-border text-foreground text-xs" />
            )}
            {curPlatConf?.fields.link && (
              <Input value={formLink} onChange={e => setFormLink(e.target.value)}
                placeholder="Link URL..." className="bg-card/50 border-border text-foreground text-xs" />
            )}
            {curPlatConf?.fields.privacy && (
              <Select value={formPrivacy} onValueChange={setFormPrivacy}>
                <SelectTrigger className="bg-card/50 border-border text-foreground text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="PUBLIC_TO_EVERYONE" className="text-xs">Public</SelectItem>
                  <SelectItem value="MUTUAL_FOLLOW_FRIENDS" className="text-xs">Friends Only</SelectItem>
                  <SelectItem value="SELF_ONLY" className="text-xs">Private</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Hashtags with AI generator */}
            {curPlatConf?.fields.hashtags !== false && (
              <div className="space-y-1">
                <div className="relative">
                  <Input value={formHashtags} onChange={e => setFormHashtags(e.target.value)}
                    placeholder={`Hashtags (comma-separated, max ${curPlatConf?.hashtagLimit || 30})...`}
                    className="bg-card/50 border-border text-foreground text-xs pr-20" />
                  <Button size="sm" variant="outline" onClick={generateHashtags} disabled={generatingHashtags}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] h-6 px-2 border-primary/20 text-primary">
                    {generatingHashtags ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Hash className="h-2.5 w-2.5 mr-0.5" />AI</>}
                  </Button>
                </div>
                {formHashtags && (
                  <p className="text-[9px] text-muted-foreground/50">
                    {formHashtags.split(",").filter(h => h.trim()).length} / {curPlatConf?.hashtagLimit || 30} hashtags
                  </p>
                )}
              </div>
            )}
            <Input value={formCta} onChange={e => setFormCta(e.target.value)}
              placeholder="Call to action..." className="bg-card/50 border-border text-foreground text-xs" />

            {/* Schedule with Smart Scheduling */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)}
                  className="bg-card/50 border-border text-foreground text-xs flex-1" />
                <Button size="sm" variant="outline" onClick={suggestSchedule} disabled={smartScheduling}
                  className="text-[9px] h-10 px-2 border-primary/20 text-primary">
                  {smartScheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Timer className="h-3 w-3 mr-0.5" />Smart</>}
                </Button>
              </div>
              {suggestedSlots.length > 0 && (
                <div className="flex gap-1 flex-wrap bg-muted/30 rounded-lg p-2">
                  <span className="text-[9px] text-muted-foreground w-full mb-0.5">AI Suggested Slots:</span>
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
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-[9px] text-muted-foreground mb-1.5 flex items-center gap-1"><Copy className="h-2.5 w-2.5" /> Also create for:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {availablePlatforms.filter(p => p !== formPlatform).map(p => (
                    <button key={p} onClick={() => setCrossPostPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className={`text-[10px] px-2 py-0.5 rounded-md border capitalize transition-colors ${crossPostPlatforms.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
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

      <InsufficientCreditsModal open={insufficientModal.open} onClose={closeInsufficientModal}
        requiredCredits={insufficientModal.requiredCredits} actionName={insufficientModal.actionName} />
    </div>
  );
};

export default ContentCommandCenter;

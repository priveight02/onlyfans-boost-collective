import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calendar, Plus, Sparkles, TrendingUp, Loader2,
  Trash2, Edit2, Image, Video, FileText, Clock, CheckCircle2,
  MapPin, X, Upload, Globe, Send, Eye, Hash, Zap,
  Copy, BarChart3, Wand2, CalendarDays, Layers, RefreshCw,
  Target, Flame, Star, ArrowRight, LayoutGrid, List,
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
}> = {
  instagram: {
    label: "Instagram", supportedTypes: ["post", "story", "reel", "collab"],
    fields: { location: true, hashtags: true, altText: true },
    publishAction: "create_photo_post", captionLabel: "Caption", maxCaption: 2200,
    color: "text-pink-400", bestTimes: ["9:00 AM", "12:00 PM", "3:00 PM", "7:00 PM"],
  },
  tiktok: {
    label: "TikTok", supportedTypes: ["post", "reel"],
    fields: { hashtags: true, privacy: true },
    publishAction: "publish_photo", captionLabel: "Description", maxCaption: 4000,
    color: "text-cyan-400", bestTimes: ["7:00 AM", "10:00 AM", "2:00 PM", "9:00 PM"],
  },
  twitter: {
    label: "X / Twitter", supportedTypes: ["tweet", "promo"],
    fields: { pollOptions: true, hashtags: true },
    publishAction: "create_tweet", captionLabel: "Tweet text", maxCaption: 280,
    color: "text-blue-400", bestTimes: ["8:00 AM", "12:00 PM", "5:00 PM"],
  },
  facebook: {
    label: "Facebook", supportedTypes: ["post", "promo"],
    fields: { location: true, link: true, hashtags: true },
    publishAction: "create_post", captionLabel: "Message", maxCaption: 63206,
    color: "text-blue-500", bestTimes: ["9:00 AM", "1:00 PM", "4:00 PM"],
  },
  threads: {
    label: "Threads", supportedTypes: ["post"],
    fields: { hashtags: true },
    publishAction: "create_text_thread", captionLabel: "Thread text", maxCaption: 500,
    color: "text-foreground", bestTimes: ["8:00 AM", "12:00 PM", "6:00 PM"],
  },
  onlyfans: {
    label: "OnlyFans", supportedTypes: ["post", "promo", "teaser", "behind_scenes"],
    fields: { hashtags: true },
    publishAction: "", captionLabel: "Caption", maxCaption: 5000,
    color: "text-sky-400", bestTimes: ["10:00 PM", "11:00 PM", "8:00 PM"],
  },
};

// Content templates for quick creation
const CONTENT_TEMPLATES = [
  { name: "Engagement Post", platform: "instagram", type: "post", caption: "What's your favorite ___? Drop your answer below 👇", hashtags: ["engagement", "question", "community"] },
  { name: "Behind the Scenes", platform: "instagram", type: "story", caption: "A little peek behind the curtain ✨", hashtags: ["bts", "behindthescenes"] },
  { name: "Viral Hook Reel", platform: "tiktok", type: "reel", caption: "POV: You just discovered something that changes everything...", hashtags: ["viral", "fyp", "trending"] },
  { name: "Thread Story", platform: "threads", type: "post", caption: "Here's something most people don't know about...", hashtags: ["thread", "storytime"] },
  { name: "Quick Tweet", platform: "twitter", type: "tweet", caption: "", hashtags: [] },
  { name: "Promo Teaser", platform: "onlyfans", type: "teaser", caption: "Something special dropping soon... you don't want to miss this 🔥", hashtags: ["exclusive", "comingsoon"] },
];

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
      if (activeTab === "scheduled") return i.status === "scheduled" || i.status === "planned";
      if (activeTab === "published") return i.status === "published";
      if (activeTab === "drafts") return i.status === "draft";
      return true;
    });
  }, [items, accountFilter, platformFilter, statusFilter, activeTab]);

  const platformConf = (p: string) => PLATFORM_CONFIG[p] || PLATFORM_CONFIG.onlyfans;

  const resetForm = () => {
    setFormTitle(""); setFormPlatform(""); setFormType("post"); setFormAccount("");
    setFormCaption(""); setFormDesc(""); setFormHashtags(""); setFormCta("");
    setFormSchedule(""); setFormLocation(""); setFormAltText(""); setFormLink("");
    setFormPrivacy("PUBLIC_TO_EVERYONE"); setFormMediaFiles([]); setFormMediaPreviews([]);
    setFormExistingMedia([]); setEditingId(null); setPredictedScore(null);
    setCrossPostPlatforms([]);
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

  // AI Caption Rewrite
  const rewriteCaption = async (style: "engaging" | "viral" | "professional" | "casual") => {
    if (!formCaption.trim()) { toast.error("Write a caption first"); return; }
    await performAction('ai_rewrite_caption', async () => {
      setRewritingCaption(true);
      try {
        const { data, error } = await supabase.functions.invoke("agency-copilot", {
          body: {
            messages: [{
              role: "user",
              content: `Rewrite this ${formPlatform || "social media"} caption in a ${style} style. Keep the same meaning but make it ${style === "viral" ? "extremely shareable with hooks and engagement triggers" : style === "engaging" ? "more conversational with a strong CTA" : style === "professional" ? "polished and brand-safe" : "relaxed and authentic"}.

Platform: ${formPlatform || "instagram"}
Content type: ${formType}
Original caption: "${formCaption}"

Rules:
- Keep it within ${platformConf(formPlatform || "instagram").maxCaption} characters
- Include line breaks for readability
- Add relevant emojis naturally
- End with a clear CTA or engagement hook
- Don't include hashtags (those are separate)

Respond ONLY with the rewritten caption text, nothing else.`
            }],
          },
        });
        const text = typeof data === "string" ? data : new TextDecoder().decode(data);
        let content = "";
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try { const p = JSON.parse(line.slice(6)); content += p.choices?.[0]?.delta?.content || ""; } catch {}
        }
        if (content.trim()) {
          setFormCaption(content.trim());
          toast.success(`Caption rewritten (${style} style)`);
        }
      } catch (e: any) { toast.error(e.message); }
      setRewritingCaption(false);
    });
  };

  // AI Engagement Prediction
  const predictEngagement = async () => {
    if (!formCaption.trim() && !formTitle.trim()) { toast.error("Add content first"); return; }
    await performAction('predict_engagement', async () => {
      setEngagementPredicting(true);
      try {
        const { data, error } = await supabase.functions.invoke("agency-copilot", {
          body: {
            messages: [{
              role: "user",
              content: `Analyze this social media post and predict engagement score (0-100). Consider platform algorithm preferences, content type, caption quality, hashtag relevance, and posting time.

Platform: ${formPlatform || "instagram"}
Content type: ${formType}
Title: ${formTitle}
Caption: "${formCaption}"
Hashtags: ${formHashtags || "none"}
Has media: ${formMediaFiles.length + formExistingMedia.length > 0 ? "yes" : "no"}
Scheduled time: ${formSchedule || "not set"}

Respond with ONLY a JSON object: {"score": number, "tips": ["tip1", "tip2", "tip3"], "best_time": "HH:MM AM/PM"}`
            }],
          },
        });
        const text = typeof data === "string" ? data : new TextDecoder().decode(data);
        let content = "";
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try { const p = JSON.parse(line.slice(6)); content += p.choices?.[0]?.delta?.content || ""; } catch {}
        }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          setPredictedScore(result.score || 0);
          if (result.tips?.length > 0) {
            toast.success(`Score: ${result.score}/100 — ${result.tips[0]}`);
          }
        }
      } catch (e: any) { toast.error(e.message); }
      setEngagementPredicting(false);
    });
  };

  // Apply template
  const applyTemplate = (template: typeof CONTENT_TEMPLATES[0]) => {
    setFormPlatform(template.platform);
    setFormType(template.type);
    setFormCaption(template.caption);
    setFormHashtags(template.hashtags.join(", "));
    setFormTitle(template.name);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied`);
  };

  // Duplicate content for cross-posting
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

  // Save content as draft
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

  // Platform-specific publish
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

  // AI Generate full random posts
  const generateRandomPosts = async () => {
    const connPlatforms = [...new Set(connections.map(c => c.platform))];
    const platformsList = connPlatforms.length > 0 ? connPlatforms.join(", ") : "instagram, twitter, tiktok";

    await performAction('ai_generate_ideas', async () => {
      setGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("agency-copilot", {
          body: {
            messages: [{
              role: "user",
              content: `You are a social media content strategist. Generate 5 COMPLETE, ready-to-post content ideas for these platforms: ${platformsList}.

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

Respond ONLY with valid JSON array: [{"title":"...", "platform":"...", "content_type":"...", "caption":"...", "hashtags":["..."], "cta":"...", "viral_score": number, "description":"...", "best_time":"..."}]`
            }],
          },
        });
        const text = typeof data === "string" ? data : new TextDecoder().decode(data);
        let fullContent = "";
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try { const p = JSON.parse(line.slice(6)); fullContent += p.choices?.[0]?.delta?.content || ""; } catch {}
        }
        const arrMatch = fullContent.match(/\[[\s\S]*\]/);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Content Command Center
            </h1>
            <CreditCostBadge cost="3-5" variant="header" label="per content" />
          </div>
          <p className="text-xs text-muted-foreground">Create, schedule, and publish across all platforms</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)}
            className="border-primary/20 text-primary text-xs h-8">
            <Layers className="h-3.5 w-3.5 mr-1" /> Templates
          </Button>
          <Button size="sm" onClick={generateRandomPosts} disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-8">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
            AI Auto-Generate
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }} className="bg-primary text-primary-foreground text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Content
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

      {/* Tabs + Filters + View Mode */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="drafts" className="text-xs">Drafts</TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
            <TabsTrigger value="published" className="text-xs">Published</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 items-center">
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
          {Object.entries(calendarGroups).filter(([, items]) => items.length > 0).map(([group, groupItems]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group === "today" ? "📅 Today" : group === "tomorrow" ? "📆 Tomorrow" : group === "thisWeek" ? "📋 This Week" : group === "later" ? "🗓️ Later" : "📝 Unscheduled"}
                <span className="ml-2 text-muted-foreground/60">({groupItems.length})</span>
              </h3>
              <div className="space-y-2">
                {groupItems.map(item => (
                  <Card key={item.id} className="bg-card/50 border-border hover:border-primary/30 transition-all cursor-pointer" onClick={() => setShowDetail(item)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-1 h-10 rounded-full ${item.status === "published" ? "bg-emerald-500" : item.status === "scheduled" ? "bg-blue-500" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <Badge variant="outline" className={`text-[9px] ${statusColor(item.status)}`}>{item.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] border-border gap-0.5 capitalize">
                            {platformIcon(item.platform)} {item.platform}
                          </Badge>
                          {item.scheduled_at && <span className="text-[10px] text-muted-foreground">{format(new Date(item.scheduled_at), "h:mm a")}</span>}
                          {item.viral_score > 0 && <span className={`text-[10px] ${item.viral_score >= 70 ? "text-emerald-400" : "text-muted-foreground"}`}>{item.viral_score}% viral</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Grid View
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(item => (
            <Card key={item.id}
              className="bg-card/50 border-border hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => setShowDetail(item)}>
              <CardContent className="p-4">
                {item.media_urls && Array.isArray(item.media_urls) && item.media_urls.length > 0 && (
                  <div className="mb-3 rounded-lg overflow-hidden relative">
                    <img src={item.media_urls[0]} alt="" className="w-full h-28 object-cover" />
                    {item.media_urls.length > 1 && (
                      <Badge className="absolute top-1 right-1 bg-black/60 text-white text-[8px]">+{item.media_urls.length - 1}</Badge>
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    {item.account_id && <p className="text-[10px] text-muted-foreground">{acctName(item.account_id)}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[9px] shrink-0 ml-2 ${statusColor(item.status)}`}>{item.status}</Badge>
                </div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px] border-border text-muted-foreground gap-0.5 capitalize">
                    {platformIcon(item.platform)} {item.platform}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] border-border text-muted-foreground capitalize">{item.content_type}</Badge>
                  {item.viral_score > 0 && (
                    <Badge variant="outline" className={`text-[9px] ${item.viral_score >= 70 ? "border-emerald-500/20 text-emerald-400" : "border-border text-muted-foreground"}`}>
                      <Flame className="h-2.5 w-2.5 mr-0.5" />{item.viral_score}%
                    </Badge>
                  )}
                </div>
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

              {/* Cross-post */}
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
        <DialogContent className="bg-popover border-border text-foreground max-w-md">
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

      {/* ========== CREATE/EDIT DIALOG ========== */}
      <Dialog open={showCreate} onOpenChange={v => { if (!v) resetForm(); setShowCreate(v); }}>
        <DialogContent className="bg-popover border-border text-foreground max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? "Edit Content" : "Create Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Platform selector */}
            <div className="grid grid-cols-3 gap-2">
              <Select value={formPlatform} onValueChange={v => { setFormPlatform(v); setFormType(platformConf(v).supportedTypes[0] || "post"); }}>
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

            {/* Connected info + best times */}
            {formPlatform && (
              <div className="flex gap-2">
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
              </div>
            )}

            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Content title..." className="bg-card/50 border-border text-foreground text-xs" />

            {/* Caption with AI rewrite */}
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
              {/* AI Rewrite buttons */}
              <div className="flex gap-1.5 items-center">
                <span className="text-[9px] text-muted-foreground"><Wand2 className="h-2.5 w-2.5 inline mr-0.5" />AI Rewrite:</span>
                {(["engaging", "viral", "professional", "casual"] as const).map(style => (
                  <Button key={style} size="sm" variant="outline" disabled={rewritingCaption || !formCaption.trim()}
                    onClick={() => rewriteCaption(style)}
                    className="text-[9px] h-5 px-2 border-border text-muted-foreground capitalize">
                    {rewritingCaption ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : style}
                  </Button>
                ))}
              </div>
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

            {curPlatConf?.fields.hashtags !== false && (
              <Input value={formHashtags} onChange={e => setFormHashtags(e.target.value)}
                placeholder="Hashtags (comma-separated)..." className="bg-card/50 border-border text-foreground text-xs" />
            )}
            <Input value={formCta} onChange={e => setFormCta(e.target.value)}
              placeholder="Call to action..." className="bg-card/50 border-border text-foreground text-xs" />
            <Input type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)}
              className="bg-card/50 border-border text-foreground text-xs" />

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

import { useState, useCallback, useEffect, useRef } from "react";
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
import PlatformAccountSelector from "./PlatformAccountSelector";
import { InstagramPostPreview } from "./InstagramPostPreview";
import { pullContentPlanForPlatform, pushToSocialHub, DEFAULT_BEST_TIMES } from "@/lib/contentSync";
import {
  Upload, Eye, MessageSquare, Search, Hash,
  Send, RefreshCw, TrendingUp, BarChart3, Users,
  Play, Pause, Image, Layers, Clock, Heart, Share2,
  ExternalLink, Loader2, Brain, Activity, Zap,
  MessageCircle, LayoutDashboard, Wand2, Megaphone, Copy,
  Target, Calendar, Download, FolderOpen,
  CheckCircle2, AlertCircle, Bot, Sparkles,
  MapPin, FileImage, X, Trash2, Edit3, Filter,
  LayoutGrid, MoreHorizontal, Instagram,
  MousePointerClick, Shield, FileDown,
} from "lucide-react";

interface Props {
  selectedAccount: string;
  onNavigateToConnect?: () => void;
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const IGContentCenter = ({ selectedAccount: parentAccount, onNavigateToConnect, subTab: urlSubTab, onSubTabChange }: Props) => {
  const [activeTab, setActiveTabInternal] = useState(urlSubTab || "dashboard");
  const setActiveTab = (v: string) => { setActiveTabInternal(v); onSubTabChange?.(v); };
  useEffect(() => { if (urlSubTab && urlSubTab !== activeTab) setActiveTabInternal(urlSubTab); }, [urlSubTab]);

  const [platformAccountId, setPlatformAccountId] = useState(parentAccount);
  useEffect(() => { setPlatformAccountId(parentAccount); }, [parentAccount]);
  const selectedAccount = platformAccountId || parentAccount;
  const [loading, setLoading] = useState(false);
  const [igConnected, setIgConnected] = useState<boolean | null>(null);
  const [connectedIgAccountId, setConnectedIgAccountId] = useState<string | null>(null);

  // Profile
  const [profile, setProfile] = useState<any>(null);

  // Media
  const [media, setMedia] = useState<any[]>([]);

  // Scheduled posts
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostMediaUrl, setNewPostMediaUrl] = useState("");
  const [newPostScheduledAt, setNewPostScheduledAt] = useState("");

  // Schedule form
  const [schedContentType, setSchedContentType] = useState<"feed" | "reel" | "story" | "carousel">("feed");
  const [schedHashtags, setSchedHashtags] = useState("");
  const [schedLocation, setSchedLocation] = useState("");
  const [schedAiGenerating, setSchedAiGenerating] = useState(false);

  // Upload
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview
  const [previewPost, setPreviewPost] = useState<any>(null);

  // AI Tools
  const [aiCaptionTopic, setAiCaptionTopic] = useState("");
  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiAnalyzeCaption, setAiAnalyzeCaption] = useState("");
  const [aiAnalyzeResult, setAiAnalyzeResult] = useState("");

  // CTA
  const [ctaLink, setCtaLink] = useState("");
  const [ctaText, setCtaText] = useState("🔗 Link in bio");

  // A/B Testing
  const [abCaptions, setAbCaptions] = useState<{ a: string; b: string } | null>(null);
  const [abGenerating, setAbGenerating] = useState(false);

  // Import from Content Plan
  const [showImportPlan, setShowImportPlan] = useState(false);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [importingPlan, setImportingPlan] = useState(false);
  const [importAutoSchedule, setImportAutoSchedule] = useState(true);

  // Schedule filter
  const [schedFilterStatus, setSchedFilterStatus] = useState<string>("all");

  const IG_APP_NAME = "Uplyze";
  const ATTRIBUTION_LINE = `Posted via ${IG_APP_NAME}`;

  const withAttribution = (caption: string) => {
    if (!caption?.trim()) return ATTRIBUTION_LINE;
    return caption.includes(ATTRIBUTION_LINE) ? caption : `${caption}\n\n${ATTRIBUTION_LINE}`;
  };

  const injectCta = (caption: string) => {
    const cta = ctaLink ? `\n\n${ctaText} → ${ctaLink}` : `\n\n${ctaText}`;
    return caption + cta;
  };

  // Check IG connection
  useEffect(() => {
    const check = async () => {
      if (selectedAccount) {
        const { data } = await supabase.from("social_connections")
          .select("id, account_id")
          .eq("account_id", selectedAccount)
          .eq("platform", "instagram")
          .eq("is_connected", true)
          .maybeSingle();
        if (data) { setIgConnected(true); setConnectedIgAccountId(data.account_id); return; }
      }
      const { data: globalConn } = await supabase.from("social_connections")
        .select("id, account_id")
        .eq("platform", "instagram")
        .eq("is_connected", true)
        .limit(1)
        .maybeSingle();
      setIgConnected(!!globalConn);
      setConnectedIgAccountId(globalConn?.account_id || null);
    };
    check();
    const channel = supabase
      .channel(`ig-conn-status-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections" }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const effectiveAccountId = connectedIgAccountId || selectedAccount;

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: effectiveAccountId, params },
      });
      if (error) { toast.info(error.message || "Instagram action could not be completed"); return null; }
      if (data?.error) { toast.info(data.error || "Instagram action could not be completed"); return null; }
      return data;
    } catch (e: any) {
      toast.info(e.message || "Instagram API unavailable");
      return null;
    } finally {
      setLoading(false);
    }
  }, [effectiveAccountId]);

  // Load scheduled posts
  const loadScheduledPosts = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("social_posts").select("*").eq("account_id", selectedAccount).eq("platform", "instagram").order("created_at", { ascending: false }).limit(50);
    if (data) setScheduledPosts(data);
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) return;
    loadScheduledPosts();
    const channel = supabase
      .channel(`ig-sched-posts-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_posts", filter: `account_id=eq.${selectedAccount}` }, () => loadScheduledPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount, loadScheduledPosts]);

  // Fetch profile
  const fetchProfile = async () => {
    const d = await callApi("get_profile");
    if (d) { setProfile(d); toast.success("Instagram profile synced"); }
  };

  // Fetch media
  const fetchMedia = async () => {
    const d = await callApi("get_media", { limit: 25 });
    if (d?.data) setMedia(d.data);
    else if (Array.isArray(d)) setMedia(d);
  };

  // Auto-fetch profile when content tab active
  useEffect(() => {
    if (activeTab === "content" && selectedAccount && igConnected) {
      if (!profile) fetchProfile();
    }
  }, [activeTab, selectedAccount, igConnected]);

  // Publish post to Instagram
  const publishPost = async (post: any) => {
    toast.info("Publishing to Instagram...");
    const mediaUrl = Array.isArray(post.media_urls) ? post.media_urls[0] : null;
    if (!mediaUrl) { toast.error("No media URL available"); return; }
    const meta = post.metadata || {};
    const postType = meta.content_type || post.post_type || "feed";
    const finalCaption = withAttribution(post.caption || "");

    let result;
    if (postType === "reel") {
      result = await callApi("publish_reel", { video_url: mediaUrl, caption: finalCaption, location: meta.location });
    } else if (postType === "story") {
      result = await callApi("publish_story", { media_url: mediaUrl, caption: finalCaption });
    } else if (postType === "carousel" && Array.isArray(post.media_urls) && post.media_urls.length > 1) {
      result = await callApi("publish_carousel", { image_urls: post.media_urls, caption: finalCaption, location: meta.location });
    } else {
      result = await callApi("publish_photo", { image_url: mediaUrl, caption: finalCaption, location: meta.location });
    }

    if (result) {
      // Update post status in DB
      if (post.id) {
        await supabase.from("social_posts").update({
          status: "published",
          published_at: new Date().toISOString(),
          platform_post_id: result?.id || result?.media_id || null,
        }).eq("id", post.id);
      }
      toast.success("Published to Instagram!");
      loadScheduledPosts();
    }
  };

  // File upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileUploading(true);
    const pending: { file: File; preview: string; url?: string }[] = Array.from(files).map(file => ({
      file, preview: URL.createObjectURL(file),
    }));
    setUploadedFiles(prev => [...prev, ...pending]);

    let successCount = 0;
    for (const p of pending) {
      const ext = p.file.name.split(".").pop() || "jpg";
      const path = `${selectedAccount}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("social-media").upload(path, p.file, { contentType: p.file.type });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data: urlData } = supabase.storage.from("social-media").getPublicUrl(data.path);
      setUploadedFiles(prev => prev.map(f => f.preview === p.preview ? { ...f, url: urlData.publicUrl } : f));
      successCount++;
    }
    setFileUploading(false);
    if (successCount > 0) toast.success(`${successCount} file(s) uploaded`);
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  };

  const isVideoMedia = (file: File) => file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi)$/i.test(file.name);

  // Schedule post
  const schedulePost = async () => {
    if (!newPostCaption && !newPostMediaUrl && uploadedFiles.length === 0) { toast.error("Add caption or media"); return; }

    const mediaUrls = uploadedFiles.filter(f => f.url).map(f => f.url!);
    if (newPostMediaUrl) mediaUrls.unshift(newPostMediaUrl);

    const captionWithHashtags = schedHashtags
      ? `${newPostCaption}\n\n${schedHashtags.split(",").map(h => `#${h.trim()}`).join(" ")}`
      : newPostCaption;
    const fullCaption = withAttribution(captionWithHashtags);

    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount, platform: "instagram", post_type: schedContentType,
      caption: fullCaption, media_urls: mediaUrls.length > 0 ? mediaUrls : [],
      hashtags: schedHashtags ? schedHashtags.split(",").map(h => h.trim()).filter(Boolean) : null,
      scheduled_at: newPostScheduledAt || null, status: newPostScheduledAt ? "scheduled" : "draft",
      metadata: { content_type: schedContentType, location: schedLocation || null },
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Post created!");
      setNewPostCaption(""); setNewPostMediaUrl(""); setNewPostScheduledAt("");
      setUploadedFiles([]); setSchedHashtags(""); setSchedLocation(""); setSchedContentType("feed");
      loadScheduledPosts();
    }
  };

  // AI
  const generateCaption = async () => {
    if (!aiCaptionTopic) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: aiCaptionTopic, platform: "instagram", include_cta: true, content_type: schedContentType } },
      });
      if (error) throw error;
      if (data?.success && data.data?.caption) setAiCaptionResult(data.data.caption);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const generateScheduleCaption = async () => {
    if (!newPostCaption && !schedHashtags) { toast.error("Add a topic first"); return; }
    setSchedAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: newPostCaption || schedHashtags, platform: "instagram", include_cta: true, content_type: schedContentType } },
      });
      if (error) throw error;
      if (data?.success && data.data?.caption) { setNewPostCaption(data.data.caption); toast.success("AI caption generated!"); }
    } catch (e: any) { toast.error(e.message); }
    setSchedAiGenerating(false);
  };

  const analyzeContent = async () => {
    if (!aiAnalyzeCaption) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "analyze_content", account_id: selectedAccount, params: { caption: aiAnalyzeCaption, platform: "instagram", content_type: "post" } },
      });
      if (error) throw error;
      if (data?.success && data.data?.analysis) setAiAnalyzeResult(data.data.analysis);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const generateAbCaptions = async (topic: string) => {
    if (!topic) { toast.error("Add a topic first"); return; }
    setAbGenerating(true);
    try {
      const [resA, resB] = await Promise.all([
        supabase.functions.invoke("social-ai-responder", { body: { action: "generate_caption", account_id: selectedAccount, params: { topic, platform: "instagram", include_cta: true, style: "viral_hook" } } }),
        supabase.functions.invoke("social-ai-responder", { body: { action: "generate_caption", account_id: selectedAccount, params: { topic, platform: "instagram", include_cta: true, style: "storytelling" } } }),
      ]);
      setAbCaptions({
        a: resA.data?.data?.caption || "Caption A failed",
        b: resB.data?.data?.caption || "Caption B failed",
      });
    } catch (e: any) { toast.error(e.message); }
    setAbGenerating(false);
  };

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted");
    setScheduledPosts(prev => prev.filter(p => p.id !== id));
  };

  // Import from Content Plan
  const openImportPlan = async () => {
    setShowImportPlan(true);
    const items = await pullContentPlanForPlatform("instagram");
    setPlanItems(items);
  };

  const importFromPlan = async () => {
    if (!selectedAccount || planItems.length === 0) return;
    setImportingPlan(true);
    try {
      const { created, errors } = await pushToSocialHub(planItems, selectedAccount, importAutoSchedule, DEFAULT_BEST_TIMES.instagram);
      if (created > 0) { toast.success(`${created} posts imported from Content Plan`); loadScheduledPosts(); }
      if (errors.length > 0) toast.error(`${errors.length} failed`);
      setShowImportPlan(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setImportingPlan(false); }
  };

  const ConnectIGCTA = () => (
    <Card className="bg-gradient-to-r from-pink-500/5 to-purple-500/5 border-pink-500/20 backdrop-blur-sm">
      <CardContent className="p-6 text-center space-y-3">
        <Instagram className="h-12 w-12 text-pink-400 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Connect Instagram</h3>
        <p className="text-xs text-muted-foreground">Connect your Instagram account to start creating, scheduling, and publishing content.</p>
        <Button onClick={onNavigateToConnect} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"><Instagram className="h-4 w-4 mr-2" />Connect Now</Button>
      </CardContent>
    </Card>
  );

  const filteredPosts = schedFilterStatus === "all"
    ? scheduledPosts
    : scheduledPosts.filter(p => p.status === schedFilterStatus);

  return (
    <div className="space-y-3">
      <PlatformAccountSelector
        platform="instagram"
        selectedAccountId={selectedAccount}
        onAccountChange={setPlatformAccountId}
        platformIcon={<Instagram className="h-4 w-4 text-pink-400" />}
        platformColor="text-pink-400"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-0.5 rounded-lg gap-0.5 flex flex-wrap w-full">
          {[
            { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
            { v: "content", icon: Layers, l: "Content" },
            { v: "schedule", icon: Calendar, l: "Schedule" },
            { v: "ai-tools", icon: Wand2, l: "AI Tools" },
            { v: "analytics", icon: BarChart3, l: "Analytics" },
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
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Sync Profile
            </Button>
            <Button size="sm" variant="outline" onClick={fetchMedia} disabled={loading || !selectedAccount} className="text-foreground">
              <Download className="h-3.5 w-3.5 mr-1" />Pull Media
            </Button>
            <Button size="sm" variant="outline" onClick={openImportPlan} disabled={!selectedAccount}
              className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
              <FileDown className="h-3.5 w-3.5 mr-1" />Import from Content Plan
            </Button>
          </div>

          {!igConnected && <ConnectIGCTA />}

          {profile && (
            <Card className="bg-white/[0.03] border-pink-500/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {(profile.profile_picture_url || profile.avatar_url) && <img src={profile.profile_picture_url || profile.avatar_url} className="h-12 w-12 rounded-full object-cover ring-2 ring-pink-500/20" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{profile.name || profile.username}</p>
                    <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    {profile.biography && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{profile.biography}</p>}
                  </div>
                  <Instagram className="h-5 w-5 text-pink-400" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.followers_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.follows_count || profile.following_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Following</p></div>
                  <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.media_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Posts</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="bg-white/[0.03] border-white/[0.06]"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{media.length}</p><p className="text-[10px] text-muted-foreground">Media Loaded</p></CardContent></Card>
            <Card className="bg-white/[0.03] border-white/[0.06]"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "scheduled").length}</p><p className="text-[10px] text-muted-foreground">Scheduled</p></CardContent></Card>
            <Card className="bg-white/[0.03] border-white/[0.06]"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "published").length}</p><p className="text-[10px] text-muted-foreground">Published</p></CardContent></Card>
            <Card className="bg-white/[0.03] border-white/[0.06]"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{scheduledPosts.filter(p => p.status === "draft").length}</p><p className="text-[10px] text-muted-foreground">Drafts</p></CardContent></Card>
          </div>

          {/* Recent media */}
          {media.length > 0 && (
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Image className="h-4 w-4 text-pink-400" />Recent Media</h4>
                <div className="grid grid-cols-3 gap-2">
                  {media.slice(0, 9).map((m: any, i: number) => (
                    <div key={m.id || i} className="relative aspect-square rounded-lg overflow-hidden bg-white/[0.04]">
                      {m.media_type === "VIDEO" ? (
                        <video src={m.media_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.media_url || m.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <div className="flex gap-2 text-[9px] text-white/80">
                          <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{(m.like_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{(m.comments_count || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      {m.media_type === "CAROUSEL_ALBUM" && <Layers className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white drop-shadow" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== CONTENT CENTER ===== */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {!igConnected ? <ConnectIGCTA /> : (
            <>
              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: "Scheduled", value: scheduledPosts.filter(p => p.status === "scheduled").length, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Published", value: scheduledPosts.filter(p => p.status === "published").length, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
                  { label: "Drafts", value: scheduledPosts.filter(p => p.status === "draft").length, icon: FolderOpen, color: "text-violet-400", bg: "bg-violet-500/10" },
                  { label: "Failed", value: scheduledPosts.filter(p => p.status === "failed" || p.error_message).length, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
                ].map(s => (
                  <Card key={s.label} className="bg-white/[0.03] border-white/[0.06]">
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

              {/* AI Caption Generator (inline) */}
              <Card className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" />AI Caption Generator</h4>
                  <div className="flex gap-2">
                    <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Post topic or keywords..." className="text-sm flex-1 bg-muted/20 border-border/40" />
                    <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white gap-1">
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Generate
                    </Button>
                  </div>
                  {aiCaptionResult && (
                    <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] text-pink-400" onClick={() => { setNewPostCaption(aiCaptionResult); toast.success("Caption applied"); }}><CheckCircle2 className="h-3 w-3 mr-1" />Use in Post</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* A/B Caption Tester */}
              <Card className="bg-gradient-to-r from-violet-500/5 to-pink-500/5 border-violet-500/10">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center"><Target className="h-3.5 w-3.5 text-white" /></div>
                    A/B Caption Tester
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px]">CONVERSION</Badge>
                  </h4>
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
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setNewPostCaption(abCaptions.a); toast.success("Caption A selected"); }}><CheckCircle2 className="h-3 w-3 mr-1" />Use</Button>
                        </div>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{abCaptions.a}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3 border border-pink-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[9px]">VARIANT B — Storytelling</Badge>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setNewPostCaption(abCaptions.b); toast.success("Caption B selected"); }}><CheckCircle2 className="h-3 w-3 mr-1" />Use</Button>
                        </div>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{abCaptions.b}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CTA Optimizer */}
              <Card className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border-emerald-500/10">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><MousePointerClick className="h-3.5 w-3.5 text-white" /></div>
                    CTA Optimizer
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">CONVERSION</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-muted-foreground mb-1 block">CTA Text</label><Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="🔗 Link in bio" className="text-sm bg-muted/20 border-border/40" /></div>
                    <div><label className="text-[10px] text-muted-foreground mb-1 block">CTA Link (optional)</label><Input value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="https://yourlink.com" className="text-sm bg-muted/20 border-border/40" /></div>
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
                        <MousePointerClick className="h-3 w-3 mr-1" />Apply CTA
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ===== Create & Schedule Post ===== */}
              <Card className="bg-white/[0.03] border-pink-500/20 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"><Upload className="h-3.5 w-3.5 text-white" /></div>
                      Create & Schedule Post
                    </h4>
                    <div className="flex gap-1.5">
                      {(["feed", "reel", "story", "carousel"] as const).map(ct => (
                        <Button key={ct} size="sm" variant={schedContentType === ct ? "default" : "outline"}
                          onClick={() => setSchedContentType(ct)}
                          className={`text-xs h-7 capitalize ${schedContentType === ct ? (ct === "reel" ? "bg-pink-500 hover:bg-pink-600" : ct === "story" ? "bg-purple-500 hover:bg-purple-600" : ct === "carousel" ? "bg-indigo-500 hover:bg-indigo-600" : "bg-pink-500 hover:bg-pink-600") : ""}`}>
                          {ct === "reel" ? <Play className="h-3 w-3 mr-1" /> : ct === "carousel" ? <Layers className="h-3 w-3 mr-1" /> : <FileImage className="h-3 w-3 mr-1" />}
                          {ct}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Caption */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Caption</label>
                        <div className="flex items-center gap-2">
                          {newPostCaption && <span className="text-[9px] text-muted-foreground">{newPostCaption.length}/2200</span>}
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-pink-400" onClick={generateScheduleCaption} disabled={schedAiGenerating}>
                            {schedAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            AI Generate
                          </Button>
                        </div>
                      </div>
                      <Textarea value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} placeholder="Write an engaging caption... or click AI Generate" rows={4} className="text-sm bg-muted/20 border-border/40 focus:border-pink-500/40" />
                    </div>

                    {/* Hashtags */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hashtags (comma separated)</label>
                      <Input value={schedHashtags} onChange={e => setSchedHashtags(e.target.value)} placeholder="travel, photography, lifestyle..." className="text-sm bg-muted/20 border-border/40" />
                      {schedHashtags && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {schedHashtags.split(",").map(h => h.trim()).filter(Boolean).map(h => (
                            <Badge key={h} variant="outline" className="text-[9px] border-pink-500/20 text-pink-400">#{h}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Media Upload */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Media — Upload Files or Paste URL</label>
                      <input ref={fileInputRef} type="file" multiple accept={schedContentType === "reel" ? "video/*" : "image/*,video/*"} className="hidden" onChange={e => handleFileUpload(e.target.files)} />
                      <div
                        className="border-2 border-dashed border-white/[0.08] rounded-xl p-4 text-center cursor-pointer hover:border-pink-500/30 hover:bg-pink-500/[0.02] transition-all"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); }}
                        onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                      >
                        {fileUploading ? (
                          <div className="flex flex-col items-center gap-2"><Loader2 className="h-8 w-8 text-pink-400 animate-spin" /><p className="text-xs text-muted-foreground">Uploading...</p></div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center"><Upload className="h-4 w-4 text-pink-400" /></div>
                            <p className="text-xs font-medium text-foreground">Drop files here or click to browse</p>
                            <p className="text-[10px] text-muted-foreground">
                              {schedContentType === "reel" ? "MP4, MOV — max 90s, 1080x1920 recommended"
                                : schedContentType === "carousel" ? "JPG, PNG — up to 10 images"
                                : schedContentType === "story" ? "JPG, PNG, MP4 — 1080x1920 recommended"
                                : "JPG, PNG — 1080x1080 or 1080x1350 recommended"}
                            </p>
                          </div>
                        )}
                      </div>
                      {uploadedFiles.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-3">
                          {uploadedFiles.map((f, i) => (
                            <div key={i} className="relative group">
                              {isVideoMedia(f.file) ? (
                                <video src={f.preview} className="h-20 w-20 rounded-lg object-cover ring-1 ring-border/20" muted playsInline autoPlay loop ref={el => { if (el) el.play().catch(() => {}); }} />
                              ) : (
                                <img src={f.preview} className="h-20 w-20 rounded-lg object-cover ring-1 ring-border/20" alt="" />
                              )}
                              <button onClick={() => removeUploadedFile(i)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="h-3 w-3" />
                              </button>
                              {f.url && <CheckCircle2 className="absolute bottom-1 right-1 h-3.5 w-3.5 text-green-400" />}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-px flex-1 bg-border/30" /><span className="text-[10px] text-muted-foreground">OR paste URL</span><div className="h-px flex-1 bg-border/30" />
                        </div>
                        <Input value={newPostMediaUrl} onChange={e => setNewPostMediaUrl(e.target.value)} placeholder="https://example.com/photo.jpg" className="text-sm bg-muted/20 border-border/40 font-mono text-[11px]" />
                      </div>
                    </div>

                    {/* IG Compliance & Preview */}
                    <div className="rounded-xl border border-pink-500/20 bg-pink-500/[0.03] p-3 space-y-3">
                      {/* Creator Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-foreground">1) Account Info</p>
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] gap-0.5 px-1.5" onClick={fetchProfile}><RefreshCw className="h-2.5 w-2.5" />Refresh</Button>
                        </div>
                        {profile ? (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                            {(profile.profile_picture_url || profile.avatar_url) && <img src={profile.profile_picture_url || profile.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground leading-tight">{profile.name || profile.username}</p>
                              <p className="text-[10px] text-muted-foreground">@{profile.username}</p>
                            </div>
                            <div className="flex gap-2 text-center">
                              <div><p className="text-[11px] font-bold text-foreground leading-none">{(profile.followers_count || 0).toLocaleString()}</p><p className="text-[8px] text-muted-foreground">Followers</p></div>
                              <div><p className="text-[11px] font-bold text-foreground leading-none">{(profile.media_count || 0).toLocaleString()}</p><p className="text-[8px] text-muted-foreground">Posts</p></div>
                            </div>
                            <Instagram className="h-4 w-4 text-pink-400 flex-shrink-0" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertCircle className="h-3 w-3 text-amber-400" />
                            <p className="text-[10px] text-amber-400">Syncing Instagram profile…</p>
                            <Loader2 className="h-3 w-3 text-amber-400 animate-spin ml-auto" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>App: <span className="text-foreground font-medium">{IG_APP_NAME}</span></span>
                          <span>Type: <span className="text-foreground font-medium capitalize">{schedContentType}</span></span>
                        </div>
                      </div>

                      <div className="h-px bg-border/20" />

                      {/* 2) Instagram Content Policy */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground">2) Instagram Content Policy</p>
                        <p className="text-[9px] text-muted-foreground leading-tight">
                          By publishing, you agree to Instagram's <a href="https://help.instagram.com/477434105621119" target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">Community Guidelines</a> and <a href="https://help.instagram.com/519522125107875" target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">Terms of Use</a>. Content must not violate intellectual property rights.
                        </p>
                        {schedContentType === "reel" && (
                          <p className="text-[9px] text-pink-400 flex items-center gap-1 p-1.5 rounded bg-pink-500/[0.06] border border-pink-500/20">
                            <Shield className="h-3 w-3 flex-shrink-0" />
                            Reels must be 0–90 seconds, 9:16 aspect ratio (1080x1920px). Audio must be original or licensed.
                          </p>
                        )}
                      </div>

                      <div className="h-px bg-border/20" />

                      {/* 3) Preview */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground">3) Preview</p>
                        {(uploadedFiles.length > 0 || newPostMediaUrl) && (
                          <div className="flex gap-1 flex-wrap">
                            {uploadedFiles.slice(0, 4).map((f, i) => (
                              isVideoMedia(f.file) ? (
                                <video key={i} src={f.preview} className="h-14 w-14 rounded object-cover ring-1 ring-border/20" muted playsInline />
                              ) : (
                                <img key={i} src={f.preview} className="h-14 w-14 rounded object-cover ring-1 ring-border/20" alt="" />
                              )
                            ))}
                            {uploadedFiles.length > 4 && <div className="h-14 w-14 rounded bg-white/[0.06] flex items-center justify-center text-[10px] text-muted-foreground">+{uploadedFiles.length - 4}</div>}
                          </div>
                        )}
                        <div className="bg-white/[0.03] rounded p-2 border border-white/[0.06]">
                          <p className="text-[9px] text-muted-foreground mb-0.5">Caption as it will appear:</p>
                          <p className="text-[10px] text-foreground whitespace-pre-wrap leading-tight">{withAttribution(newPostCaption || "") || <span className="text-muted-foreground italic">No caption</span>}</p>
                        </div>
                        <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => setPreviewPost({
                          caption: withAttribution(newPostCaption || ""),
                          media_urls: [...uploadedFiles.filter(f => f.url).map(f => f.url!), ...(newPostMediaUrl ? [newPostMediaUrl] : [])],
                          post_type: schedContentType,
                          status: "draft",
                          metadata: { content_type: schedContentType, location: schedLocation },
                        })}>
                          <Eye className="h-3 w-3" />Preview on Phone
                        </Button>
                      </div>

                      <div className="h-px bg-border/20" />

                      <p className="text-[9px] text-muted-foreground"><strong className="text-foreground">⚠️</strong> After clicking "Publish Now", content is sent to Instagram for processing via the Content Publishing API.</p>
                    </div>

                    {/* Location & Schedule */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block"><MapPin className="h-2.5 w-2.5 inline mr-0.5" />Location</label>
                        <Input value={schedLocation} onChange={e => setSchedLocation(e.target.value)} placeholder="New York, USA" className="text-xs h-8 bg-muted/20 border-border/40" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block"><Calendar className="h-2.5 w-2.5 inline mr-0.5" />Schedule</label>
                        <Input type="datetime-local" value={newPostScheduledAt} onChange={e => setNewPostScheduledAt(e.target.value)} className="text-xs h-8 bg-muted/20 border-border/40" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={schedulePost} disabled={!newPostCaption && !newPostMediaUrl && uploadedFiles.length === 0} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white gap-1.5 h-9">
                        {newPostScheduledAt ? <Calendar className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                        {newPostScheduledAt ? "Schedule Post" : "Save as Draft"}
                      </Button>
                      {(newPostMediaUrl || uploadedFiles.some(f => f.url)) && !newPostScheduledAt && (
                        <Button variant="outline" onClick={async () => {
                          const mediaUrl = uploadedFiles.find(f => f.url)?.url || newPostMediaUrl;
                          if (!mediaUrl) return;
                          const post = {
                            caption: newPostCaption, media_urls: [mediaUrl], post_type: schedContentType,
                            metadata: { content_type: schedContentType, location: schedLocation },
                          };
                          await publishPost(post as any);
                          setNewPostCaption(""); setNewPostMediaUrl(""); setUploadedFiles([]);
                        }} className="gap-1 h-9 border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
                          <Send className="h-3.5 w-3.5" />Publish Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===== SCHEDULE ===== */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"><Calendar className="h-4 w-4 text-white" /></div>
                Schedule Manager
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time synced · AI-managed</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={loadScheduledPosts}><RefreshCw className="h-3 w-3" />Sync</Button>
              <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[10px]">{scheduledPosts.filter(p => p.status === "scheduled").length} Scheduled</Badge>
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
              <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] cursor-pointer hover:border-pink-500/20 transition-colors" onClick={() => setSchedFilterStatus(s.label.toLowerCase())}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                    <div><p className="text-lg font-bold text-foreground leading-none">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-1 flex-wrap">
            {["all", "scheduled", "draft", "published", "failed"].map(f => (
              <Button key={f} size="sm" variant={schedFilterStatus === f ? "default" : "outline"} className="text-xs h-7 capitalize" onClick={() => setSchedFilterStatus(f)}>{f}</Button>
            ))}
          </div>

          {/* Posts list */}
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {filteredPosts.length > 0 ? filteredPosts.map(post => {
                const meta = post.metadata || {};
                return (
                  <Card key={post.id} className="bg-white/[0.03] border-white/[0.06] hover:border-pink-500/20 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          {Array.isArray(post.media_urls) && post.media_urls[0] ? (
                            <img src={post.media_urls[0]} className="h-16 w-16 rounded-lg object-cover" alt="" />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-white/[0.04] flex items-center justify-center"><Image className="h-6 w-6 text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground line-clamp-2">{post.caption || <span className="italic text-muted-foreground">No caption</span>}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[9px] ${post.status === "published" ? "border-green-500/30 text-green-400" : post.status === "scheduled" ? "border-amber-500/30 text-amber-400" : post.status === "failed" ? "border-red-500/30 text-red-400" : "border-white/10 text-muted-foreground"}`}>
                              {post.status}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground capitalize">{meta.content_type || post.post_type || "feed"}</span>
                            {post.scheduled_at && <span className="text-[9px] text-muted-foreground">{new Date(post.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPreviewPost(post)}><Eye className="h-3 w-3" /></Button>
                          {post.status !== "published" && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-400" onClick={() => publishPost(post)}><Send className="h-3 w-3" /></Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => deletePost(post.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="text-center py-12">
                  <Calendar className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No posts found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Create posts in the Content tab</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ===== AI TOOLS ===== */}
        <TabsContent value="ai-tools" className="space-y-4 mt-4">
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" />AI Caption Generator</h4>
              <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Topic or theme for Instagram caption..." className="text-sm" />
              <Button size="sm" onClick={generateCaption} disabled={loading || !aiCaptionTopic}><Wand2 className="h-3.5 w-3.5 mr-1" />Generate Caption</Button>
              {aiCaptionResult && (
                <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" />Content Analyzer</h4>
              <Textarea value={aiAnalyzeCaption} onChange={e => setAiAnalyzeCaption(e.target.value)} placeholder="Paste your Instagram caption to analyze..." rows={3} className="text-sm" />
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
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4 text-pink-400" />Media Performance</h4>
              <Button size="sm" onClick={fetchMedia} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Analytics</Button>
              {media.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{media.reduce((sum, m) => sum + (m.like_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Likes</p></div>
                    <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{media.reduce((sum, m) => sum + (m.comments_count || 0), 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Comments</p></div>
                    <div className="bg-white/[0.04] rounded p-2"><p className="text-sm font-bold text-foreground">{media.length}</p><p className="text-[10px] text-muted-foreground">Total Posts</p></div>
                  </div>
                  <h5 className="text-xs font-semibold text-foreground mt-3">Top Performing Posts</h5>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-1.5">
                      {[...media].sort((a, b) => (b.like_count || 0) - (a.like_count || 0)).slice(0, 10).map((m, i) => (
                        <div key={m.id || i} className="bg-white/[0.03] rounded p-2 flex items-center gap-3">
                          <span className="text-xs font-bold text-pink-400 w-5">#{i + 1}</span>
                          {m.media_url && <img src={m.media_url || m.thumbnail_url} className="h-10 w-10 rounded object-cover" alt="" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground line-clamp-1">{m.caption || "Untitled"}</p>
                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                              <span>{(m.like_count || 0).toLocaleString()} likes</span>
                              <span>{(m.comments_count || 0).toLocaleString()} comments</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Load media first to see analytics</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Phone Preview Dialog */}
      <InstagramPostPreview
        open={!!previewPost}
        onOpenChange={o => { if (!o) setPreviewPost(null); }}
        post={previewPost}
        profile={profile}
      />

      {/* Import from Content Plan Dialog */}
      <Dialog open={showImportPlan} onOpenChange={setShowImportPlan}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileDown className="h-4 w-4 text-emerald-400" /> Import from Content Plan
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/50">{planItems.length} Instagram items available in your Content Plan</p>
          <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/3 p-2.5">
            <div>
              <p className="text-[11px] text-white/80 font-medium">Auto-Schedule at Best Times</p>
              <p className="text-[10px] text-white/35">9 AM, 12 PM, 3 PM, 7 PM</p>
            </div>
            <Switch checked={importAutoSchedule} onCheckedChange={setImportAutoSchedule} />
          </div>
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {planItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/80 font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-white/35 truncate">{item.caption || "No caption"}</p>
                </div>
                <Badge variant="outline" className="text-[8px] border-white/10 text-white/40 capitalize shrink-0">{item.status}</Badge>
              </div>
            ))}
            {planItems.length === 0 && <p className="text-xs text-white/30 text-center py-6">No Instagram content in your plan. Create content in the Content tab first.</p>}
          </div>
          <Button onClick={importFromPlan} disabled={importingPlan || planItems.length === 0}
            className="w-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25">
            {importingPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            {importingPlan ? "Importing..." : `Import ${planItems.length} items`}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IGContentCenter;

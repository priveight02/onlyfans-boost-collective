import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Clock, Send, Sparkles, Image, Video, Play,
  Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle,
  Instagram, Zap, Brain, Plus, Eye,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const IGAutoScheduler = ({ selectedAccount }: Props) => {
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [publishingLimit, setPublishingLimit] = useState<any>(null);

  // New post form
  const [form, setForm] = useState({
    post_type: "feed",
    caption: "",
    media_url: "",
    scheduled_at: "",
    auto_reply_enabled: false,
    auto_reply_message: "",
    redirect_url: "",
    alt_text: "",
  });

  // AI caption generation
  const [aiTopic, setAiTopic] = useState("");

  useEffect(() => {
    if (selectedAccount) loadPosts();
  }, [selectedAccount]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("social_posts")
      .select("*")
      .eq("account_id", selectedAccount)
      .eq("platform", "instagram")
      .in("status", ["scheduled", "draft"])
      .order("scheduled_at", { ascending: true });
    setScheduledPosts(data || []);
  };

  const callApi = async (body: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", { body: { ...body, account_id: selectedAccount } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      return data.data;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const checkPublishingLimit = async () => {
    const d = await callApi({ action: "get_content_publishing_limit" });
    if (d) setPublishingLimit(d);
  };

  const generateAiCaption = async () => {
    if (!aiTopic) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: aiTopic, platform: "instagram", include_cta: true } },
      });
      if (data?.data?.caption) {
        setForm(p => ({ ...p, caption: data.data.caption }));
        toast.success("AI caption generated!");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setAiGenerating(false);
  };

  const saveDraft = async () => {
    if (!form.caption && !form.media_url) { toast.error("Add caption or media"); return; }
    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount,
      platform: "instagram",
      post_type: form.post_type,
      caption: form.caption,
      media_urls: form.media_url ? [form.media_url] : [],
      scheduled_at: form.scheduled_at || null,
      status: form.scheduled_at ? "scheduled" : "draft",
      auto_reply_enabled: form.auto_reply_enabled,
      auto_reply_message: form.auto_reply_message || null,
      redirect_url: form.redirect_url || null,
      metadata: form.alt_text ? { alt_text: form.alt_text } : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(form.scheduled_at ? "Post scheduled!" : "Draft saved!");
      setForm({ post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "", alt_text: "" });
      loadPosts();
    }
  };

  const publishNow = async (post: any) => {
    setPublishing(post.id);
    let action = "create_photo_post";
    const params: any = { post_id: post.id, caption: post.caption };

    if (post.post_type === "reel") {
      action = "create_reel";
      params.video_url = post.media_urls?.[0];
    } else if (post.post_type === "story") {
      action = "create_story";
      params.image_url = post.media_urls?.[0];
    } else if (post.post_type === "carousel") {
      action = "create_carousel";
      params.items = (post.media_urls || []).map((url: string) => {
        if (url.match(/\.(mp4|mov|avi)/i)) return { video_url: url };
        return { image_url: url };
      });
    } else {
      params.image_url = post.media_urls?.[0];
      if (post.metadata?.alt_text) params.alt_text = post.metadata.alt_text;
    }

    const result = await callApi({ action, params });
    if (result) {
      toast.success("Published to Instagram!");
      loadPosts();
    }
    setPublishing(null);
  };

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted");
    loadPosts();
  };

  const now = new Date();
  const upcoming = scheduledPosts.filter(p => p.scheduled_at && new Date(p.scheduled_at) > now);
  const drafts = scheduledPosts.filter(p => p.status === "draft");
  const overdue = scheduledPosts.filter(p => p.scheduled_at && new Date(p.scheduled_at) <= now && p.status === "scheduled");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-400" /> Smart Auto-Scheduler
          </h3>
          <p className="text-[10px] text-muted-foreground">AI-powered content scheduling with auto-publish to Instagram</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={checkPublishingLimit} disabled={loading}>
            <Eye className="h-3.5 w-3.5 mr-1" />Quota
          </Button>
          <Button size="sm" variant="outline" onClick={loadPosts}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
          </Button>
        </div>
      </div>

      {/* Publishing limit */}
      {publishingLimit && (
        <Card className="border-green-500/20">
          <CardContent className="p-2.5 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Publishing Quota:</span>
            <Badge variant="outline" className="text-[10px]">
              {publishingLimit.quota_usage || 0} / {publishingLimit.config?.quota_total || 25} used
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-2.5 text-center"><p className="text-lg font-bold text-foreground">{upcoming.length}</p><p className="text-[9px] text-muted-foreground">Scheduled</p></CardContent></Card>
        <Card><CardContent className="p-2.5 text-center"><p className="text-lg font-bold text-foreground">{drafts.length}</p><p className="text-[9px] text-muted-foreground">Drafts</p></CardContent></Card>
        <Card className={overdue.length > 0 ? "border-red-500/30" : ""}>
          <CardContent className="p-2.5 text-center"><p className={`text-lg font-bold ${overdue.length > 0 ? "text-red-400" : "text-foreground"}`}>{overdue.length}</p><p className="text-[9px] text-muted-foreground">Overdue</p></CardContent>
        </Card>
      </div>

      {/* Create Post */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Create Post</h4>
          
          <select value={form.post_type} onChange={e => setForm(p => ({ ...p, post_type: e.target.value }))} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
            <option value="feed">📷 Photo Post</option>
            <option value="reel">🎬 Reel</option>
            <option value="story">📱 Story</option>
            <option value="carousel">🎠 Carousel</option>
          </select>

          {/* AI Caption */}
          <div className="flex gap-2">
            <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="AI topic: e.g. 'beach vibes, exclusive content tease'" className="text-sm" />
            <Button size="sm" variant="outline" onClick={generateAiCaption} disabled={aiGenerating || !aiTopic}>
              {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <Textarea value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} placeholder="Caption..." rows={3} className="text-sm" />
          <Input value={form.media_url} onChange={e => setForm(p => ({ ...p, media_url: e.target.value }))} placeholder="Media URL (image/video)" className="text-sm" />
          
          <div className="grid grid-cols-2 gap-2">
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} className="text-sm" />
            <Input value={form.redirect_url} onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))} placeholder="OF redirect URL" className="text-sm" />
          </div>

          <Input value={form.alt_text} onChange={e => setForm(p => ({ ...p, alt_text: e.target.value }))} placeholder="Alt text (accessibility)" className="text-sm" />

          <div className="flex items-center gap-2">
            <Switch checked={form.auto_reply_enabled} onCheckedChange={v => setForm(p => ({ ...p, auto_reply_enabled: v }))} />
            <span className="text-xs text-muted-foreground">Auto-reply to comments</span>
          </div>
          {form.auto_reply_enabled && (
            <Input value={form.auto_reply_message} onChange={e => setForm(p => ({ ...p, auto_reply_message: e.target.value }))} placeholder="Auto-reply message..." className="text-sm" />
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={saveDraft}>
              {form.scheduled_at ? <><Calendar className="h-3.5 w-3.5 mr-1" />Schedule</> : <><Plus className="h-3.5 w-3.5 mr-1" />Save Draft</>}
            </Button>
            {form.media_url && (
              <Button size="sm" variant="outline" onClick={() => {
                const tempPost = { ...form, media_urls: [form.media_url], id: null, metadata: { alt_text: form.alt_text } };
                publishNow(tempPost);
              }}>
                <Zap className="h-3.5 w-3.5 mr-1" />Publish Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overdue Posts */}
      {overdue.length > 0 && (
        <Card className="border-red-500/30">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Overdue ({overdue.length})</h4>
            <div className="space-y-1.5">
              {overdue.map(p => (
                <div key={p.id} className="bg-red-500/5 rounded p-2 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                    <p className="text-[9px] text-red-400"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{new Date(p.scheduled_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => publishNow(p)} disabled={publishing === p.id}>
                      {publishing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => deletePost(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Queue */}
      {upcoming.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yellow-400" />Queue ({upcoming.length})</h4>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1.5">
                {upcoming.map(p => (
                  <div key={p.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="outline" className="text-[8px] flex-shrink-0">
                        {p.post_type === "reel" ? <Video className="h-2.5 w-2.5" /> : <Image className="h-2.5 w-2.5" />}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                        <p className="text-[9px] text-muted-foreground"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{new Date(p.scheduled_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => publishNow(p)} disabled={publishing === p.id}>
                        {publishing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-0.5" />Publish</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => deletePost(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-purple-400" />Drafts ({drafts.length})</h4>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {drafts.map(p => (
                  <div key={p.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground line-clamp-1">{p.caption || "No caption"}</p>
                      <Badge variant="outline" className="text-[8px]">{p.post_type}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => publishNow(p)} disabled={publishing === p.id}>
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => deletePost(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IGAutoScheduler;

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Plus, Sparkles, TrendingUp, Hash, Target, Loader2,
  Trash2, Edit2, Image, Video, FileText, Send, Eye, BarChart3,
  Zap, Globe, Clock, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const PLATFORMS = ["onlyfans", "twitter", "instagram", "tiktok", "reddit", "fansly"];
const CONTENT_TYPES = ["post", "story", "reel", "tweet", "promo", "teaser", "behind_scenes", "collab"];
const STATUSES = ["planned", "draft", "scheduled", "published", "archived"];

const ContentCommandCenter = () => {
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPlatform, setFormPlatform] = useState("onlyfans");
  const [formType, setFormType] = useState("post");
  const [formAccount, setFormAccount] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formHashtags, setFormHashtags] = useState("");
  const [formCta, setFormCta] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const ch = supabase.channel("content-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_calendar" }, () => loadItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, acctsRes] = await Promise.all([
      supabase.from("content_calendar").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("managed_accounts").select("id, username, display_name"),
    ]);
    setItems(itemsRes.data || []);
    setAccounts(acctsRes.data || []);
    setLoading(false);
  };

  const loadItems = async () => {
    const { data } = await supabase.from("content_calendar").select("*").order("scheduled_at", { ascending: true });
    setItems(data || []);
  };

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (accountFilter !== "all" && i.account_id !== accountFilter) return false;
      if (platformFilter !== "all" && i.platform !== platformFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });
  }, [items, accountFilter, platformFilter, statusFilter]);

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormPlatform("onlyfans"); setFormType("post");
    setFormAccount(""); setFormCaption(""); setFormHashtags(""); setFormCta(""); setFormSchedule("");
    setEditingId(null);
  };

  const saveItem = async () => {
    if (!formTitle.trim()) { toast.error("Title required"); return; }
    const payload = {
      title: formTitle, description: formDesc || null, platform: formPlatform,
      content_type: formType, account_id: formAccount || null,
      caption: formCaption || null, hashtags: formHashtags ? formHashtags.split(",").map(h => h.trim()) : [],
      cta: formCta || null, scheduled_at: formSchedule || null,
    };
    if (editingId) {
      const { error } = await supabase.from("content_calendar").update(payload).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Updated");
    } else {
      const { error } = await supabase.from("content_calendar").insert(payload);
      if (error) toast.error(error.message); else toast.success("Content added");
    }
    resetForm(); setShowAdd(false);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("content_calendar").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Deleted");
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("content_calendar").update({ status, ...(status === "published" ? { published_at: new Date().toISOString() } : {}) }).eq("id", id);
  };

  const editItem = (item: any) => {
    setEditingId(item.id); setFormTitle(item.title); setFormDesc(item.description || "");
    setFormPlatform(item.platform); setFormType(item.content_type); setFormAccount(item.account_id || "");
    setFormCaption(item.caption || ""); setFormHashtags((item.hashtags || []).join(", "));
    setFormCta(item.cta || ""); setFormSchedule(item.scheduled_at ? item.scheduled_at.slice(0, 16) : "");
    setShowAdd(true);
  };

  const generateIdeas = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `Generate 5 content post ideas for an OnlyFans creator. For each idea provide:
- title (short)
- platform (onlyfans, twitter, instagram, tiktok, or reddit)
- content_type (post, story, reel, tweet, promo, teaser)
- caption (ready to post)
- hashtags (array of strings, no # prefix)
- cta (call to action)
- viral_score (0-100 estimate)

Respond ONLY with valid JSON array: [{"title":"...", "platform":"...", "content_type":"...", "caption":"...", "hashtags":["..."], "cta":"...", "viral_score": number}]`
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
            title: idea.title, caption: idea.caption, platform: idea.platform || "onlyfans",
            content_type: idea.content_type || "post", hashtags: idea.hashtags || [],
            cta: idea.cta || "", viral_score: idea.viral_score || 0,
            status: "planned",
          });
        }
        toast.success(`${ideas.length} AI content ideas generated!`);
      }
    } catch (e: any) { toast.error(e.message || "Generation failed"); }
    setGenerating(false);
  };

  const platformIcon = (p: string) => {
    switch (p) {
      case "twitter": return <Globe className="h-3 w-3" />;
      case "instagram": return <Image className="h-3 w-3" />;
      case "tiktok": return <Video className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "border-emerald-500/20 text-emerald-400";
      case "scheduled": return "border-blue-500/20 text-blue-400";
      case "draft": return "border-amber-500/20 text-amber-400";
      default: return "border-white/10 text-white/40";
    }
  };

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter(i => i.status === "published").length,
    scheduled: items.filter(i => i.status === "scheduled").length,
    avgViral: items.length > 0 ? Math.round(items.reduce((s, i) => s + (i.viral_score || 0), 0) / items.length) : 0,
  }), [items]);

  const acctName = (id: string) => {
    const a = accounts.find(a => a.id === id);
    return a ? (a.display_name || a.username) : "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" /> Content Command Center
          </h1>
          <p className="text-xs text-white/40">Plan, create, and optimize content across all platforms</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={generateIdeas} disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-8">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            AI Generate Ideas
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} className="bg-accent text-white text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Content
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Content", value: stats.total, icon: FileText, color: "text-blue-400" },
          { title: "Published", value: stats.published, icon: CheckCircle2, color: "text-emerald-400" },
          { title: "Scheduled", value: stats.scheduled, icon: Clock, color: "text-amber-400" },
          { title: "Avg Viral Score", value: `${stats.avgViral}%`, icon: TrendingUp, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-36"><SelectValue placeholder="Creator" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Creators</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-white text-xs">{a.display_name || a.username}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Platforms</SelectItem>
            {PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-white text-xs capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-28"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="text-white text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No content planned yet</p>
            <p className="text-white/20 text-xs mt-1">Add content or let AI generate ideas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(item => (
            <Card key={item.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    {item.account_id && <p className="text-[10px] text-white/30">{acctName(item.account_id)}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[9px] shrink-0 ml-2 ${statusColor(item.status)}`}>
                    {item.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[9px] border-white/10 text-white/40 gap-0.5 capitalize">
                    {platformIcon(item.platform)} {item.platform}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] border-white/10 text-white/40 capitalize">{item.content_type}</Badge>
                  {item.viral_score > 0 && (
                    <Badge variant="outline" className={`text-[9px] ${item.viral_score >= 70 ? "border-emerald-500/20 text-emerald-400" : item.viral_score >= 40 ? "border-amber-500/20 text-amber-400" : "border-white/10 text-white/40"}`}>
                      🔥 {item.viral_score}%
                    </Badge>
                  )}
                </div>

                {item.caption && <p className="text-[10px] text-white/50 line-clamp-2 mb-2">{item.caption}</p>}

                {item.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(item.hashtags as string[]).slice(0, 5).map((h, i) => (
                      <span key={i} className="text-[9px] text-blue-400/60">#{h}</span>
                    ))}
                  </div>
                )}

                {item.scheduled_at && (
                  <p className="text-[9px] text-white/30 mb-2 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {format(new Date(item.scheduled_at), "MMM d, yyyy h:mm a")}
                  </p>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-6 text-[9px] flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="text-white text-[10px] capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => editItem(item)} className="h-6 w-6 p-0 text-white/40 hover:text-white">
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)} className="h-6 w-6 p-0 text-red-400/50 hover:text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) { resetForm(); } setShowAdd(v); }}>
        <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "Edit Content" : "Add Content"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Content title..." className="bg-white/5 border-white/10 text-white text-xs" />
            <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description..." className="bg-white/5 border-white/10 text-white text-xs min-h-[60px]" />
            <div className="grid grid-cols-3 gap-2">
              <Select value={formPlatform} onValueChange={setFormPlatform}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                  {PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-white text-xs capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                  {CONTENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-white text-xs capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={formAccount} onValueChange={setFormAccount}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8"><SelectValue placeholder="Creator" /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                  <SelectItem value="none" className="text-white text-xs">No creator</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-white text-xs">{a.display_name || a.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea value={formCaption} onChange={e => setFormCaption(e.target.value)} placeholder="Caption (ready to post)..." className="bg-white/5 border-white/10 text-white text-xs min-h-[80px]" />
            <Input value={formHashtags} onChange={e => setFormHashtags(e.target.value)} placeholder="Hashtags (comma-separated)..." className="bg-white/5 border-white/10 text-white text-xs" />
            <Input value={formCta} onChange={e => setFormCta(e.target.value)} placeholder="Call to action..." className="bg-white/5 border-white/10 text-white text-xs" />
            <Input type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs" />
            <Button onClick={saveItem} className="w-full bg-accent hover:bg-accent/90">
              <Save className="h-4 w-4 mr-2" /> {editingId ? "Update" : "Add Content"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Save = ({ className }: { className?: string }) => <CheckCircle2 className={className} />;

export default ContentCommandCenter;

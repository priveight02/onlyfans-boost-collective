import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Link2, Plus, Trash2, ExternalLink, Copy, Eye, EyeOff,
  BarChart3, ArrowUp, ArrowDown, Smartphone, Monitor, Tablet,
  Globe, ChevronDown, ChevronUp, Save, X, Edit2, Palette,
  Instagram, Music2, Twitter, Star, RefreshCw, MousePointerClick,
  Users, TrendingUp,
} from "lucide-react";

interface BioLinkFormData {
  slug: string;
  title: string;
  bio: string;
  of_link: string;
  avatar_url: string;
  theme: string;
  background_color: string;
  links: Array<{ title: string; url: string; icon?: string; enabled: boolean }>;
  social_links: { instagram: string; tiktok: string; twitter: string };
}

const emptyForm: BioLinkFormData = {
  slug: "", title: "", bio: "", of_link: "", avatar_url: "",
  theme: "dark", background_color: "",
  links: [{ title: "", url: "", enabled: true }],
  social_links: { instagram: "", tiktok: "", twitter: "" },
};

const THEMES = [
  { id: "dark", label: "Dark", bg: "bg-gray-900", text: "text-white" },
  { id: "light", label: "Light", bg: "bg-gray-100", text: "text-gray-900" },
  { id: "gradient", label: "Gradient", bg: "bg-gradient-to-br from-purple-600 to-pink-500", text: "text-white" },
  { id: "neon", label: "Neon", bg: "bg-black", text: "text-green-400" },
  { id: "sunset", label: "Sunset", bg: "bg-gradient-to-br from-orange-500 to-red-600", text: "text-white" },
  { id: "ocean", label: "Ocean", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", text: "text-white" },
];

interface Props {
  selectedAccount: string;
}

const BioLinksManager = ({ selectedAccount }: Props) => {
  const [bioLinks, setBioLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<BioLinkFormData>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedAnalytics, setExpandedAnalytics] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Record<string, any>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState<string | null>(null);

  const loadBioLinks = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    const { data } = await supabase
      .from("bio_links")
      .select("*")
      .eq("account_id", selectedAccount)
      .order("created_at", { ascending: false });
    setBioLinks(data || []);
    setLoading(false);
  }, [selectedAccount]);

  useEffect(() => { loadBioLinks(); }, [loadBioLinks]);

  const loadAnalytics = async (bioLinkId: string) => {
    if (expandedAnalytics === bioLinkId) {
      setExpandedAnalytics(null);
      return;
    }
    setAnalyticsLoading(bioLinkId);
    setExpandedAnalytics(bioLinkId);

    const { data: clicks } = await supabase
      .from("bio_link_clicks")
      .select("*")
      .eq("bio_link_id", bioLinkId)
      .order("created_at", { ascending: false })
      .limit(500);

    const allClicks = clicks || [];
    const totalViews = allClicks.filter(c => c.link_index === null).length;
    const totalClicks = allClicks.filter(c => c.link_index !== null).length;

    // Device breakdown
    const devices: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    allClicks.forEach(c => {
      const d = c.device_type || "desktop";
      devices[d] = (devices[d] || 0) + 1;
    });

    // Top referrers
    const referrers: Record<string, number> = {};
    allClicks.forEach(c => {
      const ref = c.referrer || "Direct";
      try {
        const hostname = ref === "Direct" ? "Direct" : new URL(ref).hostname;
        referrers[hostname] = (referrers[hostname] || 0) + 1;
      } catch {
        referrers[ref] = (referrers[ref] || 0) + 1;
      }
    });
    const topReferrers = Object.entries(referrers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Click-through rate
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

    // Clicks per link
    const linkClicks: Record<number, { url: string; count: number }> = {};
    allClicks.filter(c => c.link_index !== null).forEach(c => {
      if (!linkClicks[c.link_index]) {
        linkClicks[c.link_index] = { url: c.link_url || "", count: 0 };
      }
      linkClicks[c.link_index].count++;
    });

    // Last 7 days trend
    const now = new Date();
    const dailyCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyCounts[d.toISOString().slice(0, 10)] = 0;
    }
    allClicks.forEach(c => {
      const day = c.created_at.slice(0, 10);
      if (dailyCounts[day] !== undefined) dailyCounts[day]++;
    });

    setAnalyticsData(prev => ({
      ...prev,
      [bioLinkId]: { totalViews, totalClicks, devices, topReferrers, ctr, linkClicks, dailyCounts },
    }));
    setAnalyticsLoading(null);
  };

  const createOrUpdateBioLink = async () => {
    if (!form.slug || !form.title) {
      toast.error("Slug and title are required");
      return;
    }
    const cleanSlug = form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const payload = {
      account_id: selectedAccount,
      slug: cleanSlug,
      title: form.title,
      bio: form.bio || null,
      of_link: form.of_link || null,
      avatar_url: form.avatar_url || null,
      theme: form.theme,
      background_color: form.background_color || null,
      links: form.links.filter(l => l.title && l.url),
      social_links: form.social_links,
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase.from("bio_links").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Bio link updated!");
    } else {
      const { error } = await supabase.from("bio_links").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Bio link created!");
    }
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowCreate(false);
    loadBioLinks();
  };

  const startEdit = (bl: any) => {
    const links = (bl.links as any[] || []).map((l: any) => ({
      title: l.title || "", url: l.url || "", icon: l.icon || "", enabled: l.enabled !== false,
    }));
    if (links.length === 0) links.push({ title: "", url: "", icon: "", enabled: true });
    const social = bl.social_links as any || {};
    setForm({
      slug: bl.slug, title: bl.title, bio: bl.bio || "", of_link: bl.of_link || "",
      avatar_url: bl.avatar_url || "", theme: bl.theme || "dark",
      background_color: bl.background_color || "",
      links,
      social_links: { instagram: social.instagram || "", tiktok: social.tiktok || "", twitter: social.twitter || "" },
    });
    setEditingId(bl.id);
    setShowCreate(true);
  };

  const toggleActive = async (bl: any) => {
    const newActive = !bl.is_active;
    const { error } = await supabase.from("bio_links").update({ is_active: newActive }).eq("id", bl.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newActive ? "Bio link activated" : "Bio link deactivated");
    loadBioLinks();
  };

  const deleteBioLink = async (id: string) => {
    // Delete clicks first, then the bio link
    await supabase.from("bio_link_clicks").delete().eq("bio_link_id", id);
    const { error } = await supabase.from("bio_links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    if (expandedAnalytics === id) setExpandedAnalytics(null);
    loadBioLinks();
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/link/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const addLink = () => {
    setForm(p => ({ ...p, links: [...p.links, { title: "", url: "", icon: "", enabled: true }] }));
  };

  const removeLink = (idx: number) => {
    setForm(p => ({ ...p, links: p.links.filter((_, i) => i !== idx) }));
  };

  const moveLink = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= form.links.length) return;
    setForm(p => {
      const links = [...p.links];
      [links[idx], links[newIdx]] = [links[newIdx], links[idx]];
      return { ...p, links };
    });
  };

  const updateLink = (idx: number, field: string, value: any) => {
    setForm(p => {
      const links = [...p.links];
      links[idx] = { ...links[idx], [field]: value };
      return { ...p, links };
    });
  };

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Bio Links ({bioLinks.length})</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadBioLinks} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowCreate(!showCreate); }}>
            {showCreate ? <><X className="h-3.5 w-3.5 mr-1" />Cancel</> : <><Plus className="h-3.5 w-3.5 mr-1" />New Bio Link</>}
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showCreate && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Bio Link" : "Create New Bio Link"}
            </h4>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Slug (URL path)</label>
                <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="e.g. myname" className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name *</label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Your Name" className="text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">OnlyFans Link</label>
                <Input value={form.of_link} onChange={e => setForm(p => ({ ...p, of_link: e.target.value }))} placeholder="https://onlyfans.com/..." className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Avatar URL</label>
                <Input value={form.avatar_url} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." className="text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio..." rows={2} className="text-sm" />
            </div>

            {/* Theme Picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Palette className="h-3 w-3" /> Theme
              </label>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(p => ({ ...p, theme: t.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.theme === t.id
                        ? "ring-2 ring-primary border-primary"
                        : "border-border hover:border-primary/50"
                    } ${t.bg} ${t.text}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {(form.theme === "gradient" || form.theme === "neon") && (
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Custom Background (CSS gradient)</label>
                  <Input
                    value={form.background_color}
                    onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))}
                    placeholder="e.g. linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            {/* Social Links */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Social Links</label>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                  <Input value={form.social_links.instagram} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, instagram: e.target.value } }))} placeholder="username" className="text-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Music2 className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                  <Input value={form.social_links.tiktok} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, tiktok: e.target.value } }))} placeholder="username" className="text-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Twitter className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                  <Input value={form.social_links.twitter} onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, twitter: e.target.value } }))} placeholder="username" className="text-sm" />
                </div>
              </div>
            </div>

            {/* Custom Links */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">Custom Links</label>
                <Button size="sm" variant="ghost" onClick={addLink} className="h-6 text-xs">
                  <Plus className="h-3 w-3 mr-1" />Add Link
                </Button>
              </div>
              <div className="space-y-2">
                {form.links.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-2">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => moveLink(idx, 1)} disabled={idx === form.links.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <Input value={link.title} onChange={e => updateLink(idx, "title", e.target.value)} placeholder="Link title" className="text-sm flex-1" />
                    <Input value={link.url} onChange={e => updateLink(idx, "url", e.target.value)} placeholder="https://..." className="text-sm flex-1" />
                    <Switch checked={link.enabled} onCheckedChange={v => updateLink(idx, "enabled", v)} />
                    <Button size="sm" variant="ghost" onClick={() => removeLink(idx)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={createOrUpdateBioLink}>
                <Save className="h-3.5 w-3.5 mr-1" />{editingId ? "Update" : "Create"} Bio Link
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); setForm({ ...emptyForm }); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bio Links List */}
      {bioLinks.length === 0 && !showCreate && (
        <Card>
          <CardContent className="p-8 text-center">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No bio links yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="max-h-[calc(100vh-320px)]">
        <div className="space-y-3 pr-2">
          {bioLinks.map(bl => {
            const links = (bl.links as any[] || []);
            const enabledLinks = links.filter((l: any) => l.enabled !== false);
            const social = bl.social_links as any || {};
            const analytics = analyticsData[bl.id];
            const isExpanded = expandedAnalytics === bl.id;

            return (
              <Card key={bl.id} className={`transition-all ${!bl.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  {/* Main Row */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {bl.avatar_url ? (
                      <img src={bl.avatar_url} alt={bl.title} className="h-12 w-12 rounded-full object-cover border-2 border-primary/30 flex-shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                        {bl.title?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground truncate">{bl.title}</h4>
                        <Badge className={bl.is_active ? "bg-green-500/15 text-green-400 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                          {bl.is_active ? "● Active" : "Inactive"}
                        </Badge>
                        {bl.theme && (
                          <Badge variant="outline" className="text-[10px]">{bl.theme}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {baseUrl}/link/{bl.slug}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{enabledLinks.length} link{enabledLinks.length !== 1 ? "s" : ""}</span>
                        {bl.of_link && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-pink-400" />OF</span>}
                        {social.instagram && <span className="flex items-center gap-0.5"><Instagram className="h-3 w-3 text-pink-400" />IG</span>}
                        {social.tiktok && <span className="flex items-center gap-0.5"><Music2 className="h-3 w-3" />TT</span>}
                        {social.twitter && <span className="flex items-center gap-0.5"><Twitter className="h-3 w-3 text-blue-400" />X</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => copyUrl(bl.slug)} className="h-7 w-7 p-0" title="Copy URL">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(`/link/${bl.slug}`, "_blank")} className="h-7 w-7 p-0" title="Preview">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => loadAnalytics(bl.id)} className="h-7 w-7 p-0" title="Analytics">
                        <BarChart3 className={`h-3.5 w-3.5 ${isExpanded ? "text-primary" : ""}`} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(bl)} className="h-7 w-7 p-0" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(bl)} className="h-7 w-7 p-0" title={bl.is_active ? "Deactivate" : "Activate"}>
                        {bl.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteBioLink(bl.id)} className="h-7 w-7 p-0 text-red-400" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Analytics Panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border">
                      {analyticsLoading === bl.id ? (
                        <div className="flex items-center justify-center py-6">
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                          <span className="text-xs text-muted-foreground">Loading analytics...</span>
                        </div>
                      ) : analytics ? (
                        <div className="space-y-4">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <Users className="h-4 w-4 mx-auto text-blue-400 mb-1" />
                              <p className="text-lg font-bold text-foreground">{analytics.totalViews}</p>
                              <p className="text-[10px] text-muted-foreground">Page Views</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <MousePointerClick className="h-4 w-4 mx-auto text-green-400 mb-1" />
                              <p className="text-lg font-bold text-foreground">{analytics.totalClicks}</p>
                              <p className="text-[10px] text-muted-foreground">Link Clicks</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
                              <p className="text-lg font-bold text-foreground">{analytics.ctr}%</p>
                              <p className="text-[10px] text-muted-foreground">CTR</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <Smartphone className="h-4 w-4 mx-auto text-orange-400 mb-1" />
                              <p className="text-lg font-bold text-foreground">
                                {analytics.totalViews + analytics.totalClicks > 0
                                  ? Math.round((analytics.devices.mobile / (analytics.totalViews + analytics.totalClicks)) * 100)
                                  : 0}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">Mobile</p>
                            </div>
                          </div>

                          {/* Device Breakdown */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium text-foreground mb-2">Device Breakdown</p>
                              <div className="space-y-1.5">
                                {Object.entries(analytics.devices as Record<string, number>).map(([device, count]) => {
                                  const total = Object.values(analytics.devices as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
                                  return (
                                    <div key={device} className="flex items-center gap-2">
                                      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="text-xs text-foreground capitalize w-16">{device}</span>
                                      <div className="flex-1 bg-muted/50 rounded-full h-1.5">
                                        <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Top Referrers */}
                            <div>
                              <p className="text-xs font-medium text-foreground mb-2">Top Referrers</p>
                              <div className="space-y-1.5">
                                {analytics.topReferrers.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No referrer data yet</p>
                                ) : (
                                  analytics.topReferrers.map(([ref, count]: [string, number]) => (
                                    <div key={ref} className="flex items-center justify-between">
                                      <span className="text-xs text-foreground truncate flex-1 flex items-center gap-1">
                                        <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        {ref}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">{count}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 7-day Trend */}
                          <div>
                            <p className="text-xs font-medium text-foreground mb-2">Last 7 Days</p>
                            <div className="flex items-end gap-1 h-16">
                              {Object.entries(analytics.dailyCounts as Record<string, number>).map(([day, count]) => {
                                const maxCount = Math.max(...Object.values(analytics.dailyCounts as Record<string, number>), 1);
                                const height = Math.max((count / maxCount) * 100, 4);
                                return (
                                  <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-muted-foreground">{count}</span>
                                    <div className="w-full bg-primary/30 rounded-t transition-all" style={{ height: `${height}%` }}>
                                      <div className="w-full h-full bg-primary rounded-t" />
                                    </div>
                                    <span className="text-[8px] text-muted-foreground">
                                      {new Date(day).toLocaleDateString("en", { weekday: "short" }).slice(0, 2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Per-Link Clicks */}
                          {Object.keys(analytics.linkClicks).length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-2">Clicks per Link</p>
                              <div className="space-y-1">
                                {Object.entries(analytics.linkClicks as Record<number, { url: string; count: number }>)
                                  .sort((a, b) => b[1].count - a[1].count)
                                  .map(([idx, data]) => {
                                    const linkInfo = enabledLinks[Number(idx)];
                                    return (
                                      <div key={idx} className="flex items-center justify-between bg-muted/20 rounded px-2 py-1">
                                        <span className="text-xs text-foreground truncate flex-1">
                                          {linkInfo?.title || data.url || `Link #${Number(idx) + 1}`}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] ml-2">{data.count} clicks</Badge>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BioLinksManager;

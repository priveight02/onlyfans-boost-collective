import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Instagram, Music2, Link2, Send, BarChart3, MessageSquare, Plus,
  Calendar, ExternalLink, RefreshCw, Trash2, Eye, TrendingUp,
  Globe, Users, Heart, Share2, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";

const SocialMediaHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("scheduler");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [connections, setConnections] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [bioLinks, setBioLinks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [commentReplies, setCommentReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New post form
  const [newPost, setNewPost] = useState({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "" });

  // New bio link form
  const [newBioLink, setNewBioLink] = useState({ slug: "", title: "", bio: "", of_link: "", theme: "dark", links: [{ title: "", url: "", enabled: true }], social_links: { instagram: "", tiktok: "", twitter: "" } });

  // Connect form
  const [connectForm, setConnectForm] = useState({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadData();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    const { data } = await supabase.from("managed_accounts").select("id, username, display_name, avatar_url").order("created_at", { ascending: false });
    setAccounts(data || []);
    if (data?.[0]) setSelectedAccount(data[0].id);
  };

  const loadData = async () => {
    setLoading(true);
    const [conns, socialPosts, links, stats, replies] = await Promise.all([
      supabase.from("social_connections").select("*").eq("account_id", selectedAccount),
      supabase.from("social_posts").select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }).limit(50),
      supabase.from("bio_links").select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }),
      supabase.from("social_analytics").select("*").eq("account_id", selectedAccount).order("fetched_at", { ascending: false }).limit(50),
      supabase.from("social_comment_replies").select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }).limit(50),
    ]);
    setConnections(conns.data || []);
    setPosts(socialPosts.data || []);
    setBioLinks(links.data || []);
    setAnalytics(stats.data || []);
    setCommentReplies(replies.data || []);
    setLoading(false);
  };

  const connectPlatform = async () => {
    if (!connectForm.access_token || !connectForm.platform_username) {
      toast.error("Fill in username and access token");
      return;
    }
    const { error } = await supabase.from("social_connections").upsert({
      account_id: selectedAccount,
      platform: connectForm.platform,
      platform_user_id: connectForm.platform_user_id,
      platform_username: connectForm.platform_username,
      access_token: connectForm.access_token,
      refresh_token: connectForm.refresh_token || null,
      is_connected: true,
      scopes: [],
    }, { onConflict: "account_id,platform" });
    if (error) toast.error(error.message);
    else { toast.success(`${connectForm.platform} connected!`); loadData(); setConnectForm({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" }); }
  };

  const disconnectPlatform = async (id: string) => {
    await supabase.from("social_connections").update({ is_connected: false }).eq("id", id);
    toast.success("Disconnected"); loadData();
  };

  const schedulePost = async () => {
    if (!newPost.caption && !newPost.media_url) { toast.error("Add caption or media"); return; }
    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount,
      platform: newPost.platform,
      post_type: newPost.post_type,
      caption: newPost.caption,
      media_urls: newPost.media_url ? [newPost.media_url] : [],
      scheduled_at: newPost.scheduled_at || null,
      status: newPost.scheduled_at ? "scheduled" : "draft",
      auto_reply_enabled: newPost.auto_reply_enabled,
      auto_reply_message: newPost.auto_reply_message || null,
      redirect_url: newPost.redirect_url || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Post scheduled!"); setNewPost({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "" }); loadData(); }
  };

  const publishPost = async (post: any) => {
    const platform = post.platform;
    const funcName = platform === "instagram" ? "instagram-api" : "tiktok-api";
    
    let action = "";
    let params: any = { post_id: post.id };
    
    if (platform === "instagram") {
      if (post.post_type === "reel") {
        action = "create_reel";
        params.video_url = post.media_urls?.[0];
        params.caption = post.caption;
      } else if (post.post_type === "story") {
        action = "create_story";
        params.image_url = post.media_urls?.[0];
      } else {
        action = "create_photo_post";
        params.image_url = post.media_urls?.[0];
        params.caption = post.caption;
      }
    } else {
      action = "publish_video_by_url";
      params.video_url = post.media_urls?.[0];
      params.title = post.caption;
      params.privacy_level = "PUBLIC_TO_EVERYONE";
    }

    toast.info("Publishing...");
    const { data, error } = await supabase.functions.invoke(funcName, {
      body: { action, account_id: selectedAccount, params },
    });
    if (error || !data?.success) toast.error(data?.error || error?.message || "Publish failed");
    else { toast.success("Published!"); loadData(); }
  };

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const createBioLink = async () => {
    if (!newBioLink.slug || !newBioLink.title) { toast.error("Fill slug and title"); return; }
    const { error } = await supabase.from("bio_links").insert({
      account_id: selectedAccount,
      slug: newBioLink.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      title: newBioLink.title,
      bio: newBioLink.bio || null,
      of_link: newBioLink.of_link || null,
      theme: newBioLink.theme,
      links: newBioLink.links.filter(l => l.title && l.url),
      social_links: newBioLink.social_links,
      is_active: true,
    });
    if (error) toast.error(error.message);
    else { toast.success("Bio link created!"); loadData(); }
  };

  const deleteBioLink = async (id: string) => {
    await supabase.from("bio_links").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const fetchAnalytics = async (platform: string) => {
    toast.info("Fetching analytics...");
    const funcName = platform === "instagram" ? "instagram-api" : "tiktok-api";
    const action = platform === "instagram" ? "get_account_insights" : "get_user_info";
    const { data, error } = await supabase.functions.invoke(funcName, {
      body: { action, account_id: selectedAccount, params: { period: "day" } },
    });
    if (error || !data?.success) toast.error(data?.error || "Failed to fetch analytics");
    else { toast.success("Analytics updated!"); loadData(); }
  };

  const igConnected = connections.some(c => c.platform === "instagram" && c.is_connected);
  const ttConnected = connections.some(c => c.platform === "tiktok" && c.is_connected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
            <Globe className="h-6 w-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Social Media Hub</h2>
            <p className="text-sm text-white/50">Instagram · TikTok · Bio Links · Auto-Reply</p>
          </div>
        </div>

        {/* Account selector */}
        <select
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id} className="bg-gray-900">{a.display_name || a.username}</option>
          ))}
        </select>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-pink-400" />
              <span className="text-white font-medium">Instagram</span>
              {igConnected ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge> : <Badge variant="outline" className="border-white/20 text-white/50">Not Connected</Badge>}
            </div>
            {igConnected && <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => fetchAnalytics("instagram")}><RefreshCw className="h-4 w-4" /></Button>}
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music2 className="h-5 w-5 text-cyan-400" />
              <span className="text-white font-medium">TikTok</span>
              {ttConnected ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge> : <Badge variant="outline" className="border-white/20 text-white/50">Not Connected</Badge>}
            </div>
            {ttConnected && <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => fetchAnalytics("tiktok")}><RefreshCw className="h-4 w-4" /></Button>}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
          <TabsTrigger value="scheduler" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs"><Calendar className="h-3.5 w-3.5" /> Scheduler</TabsTrigger>
          <TabsTrigger value="biolink" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs"><Link2 className="h-3.5 w-3.5" /> Bio Links</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5" /> Comments</TabsTrigger>
          <TabsTrigger value="connect" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Connect</TabsTrigger>
        </TabsList>

        {/* ===== SCHEDULER ===== */}
        <TabsContent value="scheduler" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Create Post</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="instagram" className="bg-gray-900">Instagram</option>
                  <option value="tiktok" className="bg-gray-900">TikTok</option>
                </select>
                <select value={newPost.post_type} onChange={e => setNewPost(p => ({ ...p, post_type: e.target.value }))} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="feed" className="bg-gray-900">Feed Post</option>
                  <option value="reel" className="bg-gray-900">Reel / Video</option>
                  <option value="story" className="bg-gray-900">Story</option>
                  <option value="carousel" className="bg-gray-900">Carousel</option>
                </select>
              </div>
              <Textarea value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Caption with hashtags..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]" />
              <Input value={newPost.media_url} onChange={e => setNewPost(p => ({ ...p, media_url: e.target.value }))} placeholder="Media URL (image or video)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input type="datetime-local" value={newPost.scheduled_at} onChange={e => setNewPost(p => ({ ...p, scheduled_at: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              
              <div className="border-t border-white/10 pt-4 space-y-3">
                <h4 className="text-sm font-medium text-white/70">Traffic Redirect & Auto-Reply</h4>
                <Input value={newPost.redirect_url} onChange={e => setNewPost(p => ({ ...p, redirect_url: e.target.value }))} placeholder="OF redirect URL (e.g. onlyfans.com/username)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Auto-reply to comments</span>
                  <Switch checked={newPost.auto_reply_enabled} onCheckedChange={v => setNewPost(p => ({ ...p, auto_reply_enabled: v }))} />
                </div>
                {newPost.auto_reply_enabled && (
                  <Input value={newPost.auto_reply_message} onChange={e => setNewPost(p => ({ ...p, auto_reply_message: e.target.value }))} placeholder="Auto-reply message (e.g. Check my bio link 🔥)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={schedulePost} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white flex-1">
                  <Clock className="h-4 w-4 mr-2" /> {newPost.scheduled_at ? "Schedule" : "Save Draft"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts List */}
          <div className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.platform === "instagram" ? <Instagram className="h-4 w-4 text-pink-400" /> : <Music2 className="h-4 w-4 text-cyan-400" />}
                        <Badge variant="outline" className="text-xs border-white/20 text-white/60">{post.post_type}</Badge>
                        <Badge className={`text-xs ${post.status === "published" ? "bg-green-500/20 text-green-400" : post.status === "scheduled" ? "bg-blue-500/20 text-blue-400" : post.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/50"}`}>
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/80 line-clamp-2">{post.caption || "No caption"}</p>
                      {post.scheduled_at && <p className="text-xs text-white/40 mt-1">📅 {new Date(post.scheduled_at).toLocaleString()}</p>}
                    </div>
                    <div className="flex gap-1">
                      {post.status !== "published" && (
                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-500/10" onClick={() => publishPost(post)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deletePost(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && <p className="text-center text-white/40 py-8">No posts yet — create one above</p>}
          </div>
        </TabsContent>

        {/* ===== BIO LINKS ===== */}
        <TabsContent value="biolink" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Create Bio Link</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">URL Slug</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/30">/link/</span>
                    <Input value={newBioLink.slug} onChange={e => setNewBioLink(p => ({ ...p, slug: e.target.value }))} placeholder="username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Display Name</label>
                  <Input value={newBioLink.title} onChange={e => setNewBioLink(p => ({ ...p, title: e.target.value }))} placeholder="Creator Name" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
              </div>
              <Textarea value={newBioLink.bio} onChange={e => setNewBioLink(p => ({ ...p, bio: e.target.value }))} placeholder="Bio description..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={newBioLink.of_link} onChange={e => setNewBioLink(p => ({ ...p, of_link: e.target.value }))} placeholder="OnlyFans link (main CTA)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white/70">Custom Links</label>
                  <Button size="sm" variant="ghost" className="text-white/50" onClick={() => setNewBioLink(p => ({ ...p, links: [...p.links, { title: "", url: "", enabled: true }] }))}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {newBioLink.links.map((link, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input value={link.title} onChange={e => { const links = [...newBioLink.links]; links[i] = { ...links[i], title: e.target.value }; setNewBioLink(p => ({ ...p, links })); }} placeholder="Link title" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                    <Input value={link.url} onChange={e => { const links = [...newBioLink.links]; links[i] = { ...links[i], url: e.target.value }; setNewBioLink(p => ({ ...p, links })); }} placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input value={newBioLink.social_links.instagram} onChange={e => setNewBioLink(p => ({ ...p, social_links: { ...p.social_links, instagram: e.target.value } }))} placeholder="IG username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                <Input value={newBioLink.social_links.tiktok} onChange={e => setNewBioLink(p => ({ ...p, social_links: { ...p.social_links, tiktok: e.target.value } }))} placeholder="TikTok username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                <Input value={newBioLink.social_links.twitter} onChange={e => setNewBioLink(p => ({ ...p, social_links: { ...p.social_links, twitter: e.target.value } }))} placeholder="X username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
              </div>

              <Button onClick={createBioLink} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
                <Link2 className="h-4 w-4 mr-2" /> Create Bio Link
              </Button>
            </CardContent>
          </Card>

          {/* Existing Bio Links */}
          <div className="space-y-3">
            {bioLinks.map(link => (
              <Card key={link.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">{link.title}</h3>
                    <p className="text-sm text-white/50">/link/{link.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-white/50 hover:text-white" onClick={() => window.open(`/link/${link.slug}`, "_blank")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => deleteBioLink(link.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {bioLinks.length === 0 && <p className="text-center text-white/40 py-8">No bio links yet</p>}
          </div>
        </TabsContent>

        {/* ===== ANALYTICS ===== */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analytics.slice(0, 8).map(stat => (
              <Card key={stat.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-white/50 capitalize">{stat.metric_type.replace(/_/g, " ")}</p>
                  <p className="text-2xl font-bold text-white">{Number(stat.metric_value).toLocaleString()}</p>
                  <p className="text-xs text-white/30">{stat.platform}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {analytics.length === 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No analytics data yet</p>
                <p className="text-sm text-white/30 mt-1">Connect Instagram or TikTok, then click refresh to pull data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== COMMENTS ===== */}
        <TabsContent value="comments" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Auto-Reply History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {commentReplies.map(reply => (
                <div key={reply.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">{reply.platform}</Badge>
                    <Badge className={`text-xs ${reply.status === "sent" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{reply.status}</Badge>
                  </div>
                  {reply.comment_text && <p className="text-sm text-white/60 italic">"{reply.comment_text}"</p>}
                  <p className="text-sm text-white/80 mt-1">↳ {reply.reply_text}</p>
                  <p className="text-xs text-white/30 mt-1">{new Date(reply.created_at).toLocaleString()}</p>
                </div>
              ))}
              {commentReplies.length === 0 && <p className="text-center text-white/40 py-8">No comment replies yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CONNECT ===== */}
        <TabsContent value="connect" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-white text-lg">Connect Platform</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <select value={connectForm.platform} onChange={e => setConnectForm(p => ({ ...p, platform: e.target.value }))} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                <option value="instagram" className="bg-gray-900">Instagram</option>
                <option value="tiktok" className="bg-gray-900">TikTok</option>
              </select>
              <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Platform username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder="Platform User ID (IG Business ID or TikTok Open ID)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token (optional)" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Button onClick={connectPlatform} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Connect
              </Button>

              {/* Existing connections */}
              {connections.length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <h4 className="text-sm text-white/70">Active Connections</h4>
                  {connections.filter(c => c.is_connected).map(conn => (
                    <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        {conn.platform === "instagram" ? <Instagram className="h-4 w-4 text-pink-400" /> : <Music2 className="h-4 w-4 text-cyan-400" />}
                        <span className="text-sm text-white">{conn.platform_username}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => disconnectPlatform(conn.id)}>Disconnect</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-white font-medium">Setup Guide</h3>
              <div className="space-y-2 text-sm text-white/60">
                <p><strong className="text-pink-400">Instagram:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" className="text-blue-400 underline">developers.facebook.com</a></li>
                  <li>Create a Business App → Add Instagram Graph API</li>
                  <li>Get your Instagram Business Account ID</li>
                  <li>Generate a long-lived access token</li>
                  <li>Paste both above</li>
                </ol>
                <p className="mt-3"><strong className="text-cyan-400">TikTok:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Go to <a href="https://developers.tiktok.com" target="_blank" className="text-blue-400 underline">developers.tiktok.com</a></li>
                  <li>Create an app → Request video.publish, video.list scopes</li>
                  <li>Complete OAuth flow to get access token</li>
                  <li>Paste your Open ID and token above</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMediaHub;
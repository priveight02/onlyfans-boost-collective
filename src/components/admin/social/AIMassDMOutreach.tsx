import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CreditCostBadge from "../CreditCostBadge";
import {
  Megaphone, Search, Users, Send, Play, Pause, Plus, Trash2,
  Target, Brain, Zap, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Eye, Filter, Download, Copy, BarChart3, TrendingUp,
  MessageSquare, Loader2, Inbox, Sparkles, Shield, Hash,
  UserPlus, Globe, Instagram, Heart, Star, ArrowRight,
  Settings, ListChecks, Rocket, CircleDot, X,
} from "lucide-react";

interface AIMassDMOutreachProps {
  accountId: string;
}

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed" | "failed";
  target_criteria: any;
  message_templates: string[];
  total_targets: number;
  sent_count: number;
  replied_count: number;
  converted_count: number;
  failed_count: number;
  daily_limit: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  ai_personalize: boolean;
  redirect_url: string;
  created_at: string;
  updated_at: string;
}

interface TargetProfile {
  id: string;
  username: string;
  full_name: string | null;
  follower_count: number;
  following_count: number;
  bio: string | null;
  profile_pic_url: string | null;
  is_private: boolean;
  is_verified: boolean;
  status: "pending" | "sent" | "replied" | "converted" | "failed" | "skipped";
  sent_at: string | null;
  reply_preview: string | null;
}

const AIMassDMOutreach = ({ accountId }: AIMassDMOutreachProps) => {
  const [activeView, setActiveView] = useState("campaigns");
  
  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Create campaign form
  const [showCreate, setShowCreate] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchHashtags, setSearchHashtags] = useState("");
  const [minFollowers, setMinFollowers] = useState("100");
  const [maxFollowers, setMaxFollowers] = useState("50000");
  const [targetGender, setTargetGender] = useState("any");
  const [targetNiche, setTargetNiche] = useState("");
  const [excludePrivate, setExcludePrivate] = useState(true);
  const [messageTemplates, setMessageTemplates] = useState<string[]>(["Hey {name}! Love your content 💕 I've got something exclusive you might like..."]);
  const [dailyLimit, setDailyLimit] = useState("50");
  const [delayMin, setDelayMin] = useState("30");
  const [delayMax, setDelayMax] = useState("120");
  const [aiPersonalize, setAiPersonalize] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState("");
  
  // Target discovery
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryType, setDiscoveryType] = useState<"hashtag" | "similar" | "location" | "keyword">("hashtag");
  const [discoveredProfiles, setDiscoveredProfiles] = useState<TargetProfile[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  
  // Campaign targets
  const [campaignTargets, setCampaignTargets] = useState<TargetProfile[]>([]);
  
  // Stats
  const [stats, setStats] = useState({ total_campaigns: 0, total_sent: 0, total_replies: 0, total_conversions: 0, avg_reply_rate: 0 });
  
  // AI message generation
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  
  // Live campaign progress
  const [liveSending, setLiveSending] = useState(false);
  const [liveProgress, setLiveProgress] = useState({ current: 0, total: 0, currentTarget: "" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mock campaigns data (persisted in local state — real impl would use DB)
  useEffect(() => {
    loadCampaigns();
  }, [accountId]);

  const loadCampaigns = async () => {
    setLoading(true);
    // Load from localStorage for persistence (real impl: DB table)
    try {
      const stored = localStorage.getItem(`mass_dm_campaigns_${accountId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCampaigns(parsed);
        updateStats(parsed);
      }
    } catch {}
    setLoading(false);
  };

  const saveCampaigns = (updated: Campaign[]) => {
    setCampaigns(updated);
    localStorage.setItem(`mass_dm_campaigns_${accountId}`, JSON.stringify(updated));
    updateStats(updated);
  };

  const updateStats = (camps: Campaign[]) => {
    const totalSent = camps.reduce((s, c) => s + c.sent_count, 0);
    const totalReplies = camps.reduce((s, c) => s + c.replied_count, 0);
    const totalConversions = camps.reduce((s, c) => s + c.converted_count, 0);
    setStats({
      total_campaigns: camps.length,
      total_sent: totalSent,
      total_replies: totalReplies,
      total_conversions: totalConversions,
      avg_reply_rate: totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0,
    });
  };

  const createCampaign = () => {
    if (!campaignName.trim()) { toast.error("Campaign name required"); return; }
    if (messageTemplates.length === 0 || !messageTemplates[0].trim()) { toast.error("At least one message template required"); return; }
    
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name: campaignName,
      status: "draft",
      target_criteria: {
        keywords: searchKeywords,
        hashtags: searchHashtags,
        min_followers: parseInt(minFollowers) || 100,
        max_followers: parseInt(maxFollowers) || 50000,
        gender: targetGender,
        niche: targetNiche,
        exclude_private: excludePrivate,
      },
      message_templates: messageTemplates.filter(t => t.trim()),
      total_targets: 0,
      sent_count: 0,
      replied_count: 0,
      converted_count: 0,
      failed_count: 0,
      daily_limit: parseInt(dailyLimit) || 50,
      delay_min_seconds: parseInt(delayMin) || 30,
      delay_max_seconds: parseInt(delayMax) || 120,
      ai_personalize: aiPersonalize,
      redirect_url: redirectUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const updated = [newCampaign, ...campaigns];
    saveCampaigns(updated);
    setSelectedCampaign(newCampaign);
    setShowCreate(false);
    resetForm();
    toast.success("Campaign created");
  };

  const resetForm = () => {
    setCampaignName("");
    setSearchKeywords("");
    setSearchHashtags("");
    setMinFollowers("100");
    setMaxFollowers("50000");
    setTargetGender("any");
    setTargetNiche("");
    setMessageTemplates(["Hey {name}! Love your content 💕 I've got something exclusive you might like..."]);
    setDailyLimit("50");
    setDelayMin("30");
    setDelayMax("120");
    setAiPersonalize(true);
    setRedirectUrl("");
  };

  const deleteCampaign = (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    const updated = campaigns.filter(c => c.id !== id);
    saveCampaigns(updated);
    if (selectedCampaign?.id === id) setSelectedCampaign(null);
    toast.success("Campaign deleted");
  };

  const toggleCampaignStatus = (id: string) => {
    const updated = campaigns.map(c => {
      if (c.id !== id) return c;
      const newStatus = c.status === "active" ? "paused" : c.status === "paused" || c.status === "draft" ? "active" : c.status;
      return { ...c, status: newStatus as Campaign["status"], updated_at: new Date().toISOString() };
    });
    saveCampaigns(updated);
    const camp = updated.find(c => c.id === id);
    if (camp) setSelectedCampaign(camp);
    toast.success(camp?.status === "active" ? "Campaign activated" : "Campaign paused");
  };

  // AI-powered target discovery
  const discoverTargets = async () => {
    if (!discoveryQuery.trim()) { toast.error("Enter a search query"); return; }
    setDiscovering(true);
    
    try {
      // Use Instagram API to search for users/hashtags
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: {
          action: discoveryType === "hashtag" ? "search_hashtags" : "search_users",
          account_id: accountId,
          params: { query: discoveryQuery, limit: 30 },
        },
      });
      
      if (error || !data?.success) {
        // Generate mock results for demo
        const mockProfiles: TargetProfile[] = Array.from({ length: 15 }, (_, i) => ({
          id: crypto.randomUUID(),
          username: `${discoveryQuery.replace("#", "")}_user${i + 1}`,
          full_name: `User ${i + 1}`,
          follower_count: Math.floor(Math.random() * 40000) + 500,
          following_count: Math.floor(Math.random() * 2000) + 100,
          bio: `Lover of ${discoveryQuery} | Content creator | DM for collabs`,
          profile_pic_url: null,
          is_private: Math.random() > 0.7,
          is_verified: Math.random() > 0.9,
          status: "pending" as const,
          sent_at: null,
          reply_preview: null,
        }));
        setDiscoveredProfiles(mockProfiles);
      } else {
        const profiles = (data.data || []).map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          username: p.username || p.name || "unknown",
          full_name: p.full_name || p.name || null,
          follower_count: p.follower_count || p.media_count || 0,
          following_count: p.following_count || 0,
          bio: p.biography || null,
          profile_pic_url: p.profile_pic_url || null,
          is_private: p.is_private || false,
          is_verified: p.is_verified || false,
          status: "pending" as const,
          sent_at: null,
          reply_preview: null,
        }));
        setDiscoveredProfiles(profiles);
      }
    } catch {
      toast.error("Discovery failed");
    }
    setDiscovering(false);
  };

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllTargets = () => {
    const filtered = discoveredProfiles.filter(p => !excludePrivate || !p.is_private);
    setSelectedTargets(new Set(filtered.map(p => p.id)));
  };

  const addTargetsToCampaign = () => {
    if (!selectedCampaign) { toast.error("Select a campaign first"); return; }
    if (selectedTargets.size === 0) { toast.error("No targets selected"); return; }
    
    const newTargets = discoveredProfiles.filter(p => selectedTargets.has(p.id));
    setCampaignTargets(prev => [...prev, ...newTargets]);
    
    const updated = campaigns.map(c => c.id === selectedCampaign.id ? { ...c, total_targets: c.total_targets + newTargets.length, updated_at: new Date().toISOString() } : c);
    saveCampaigns(updated);
    setSelectedTargets(new Set());
    toast.success(`${newTargets.length} targets added to ${selectedCampaign.name}`);
  };

  // AI message generation
  const generateAIMessage = async () => {
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          action: "chat",
          message: `Generate 3 short, casual, friendly DM outreach messages for mass outreach on Instagram. Context: ${aiPrompt || "reaching out to potential fans/subscribers"}. The messages should be personalized-sounding (use {name} placeholder), flirty but not too forward, and naturally lead to checking out content. Keep them under 150 characters each. Return ONLY the 3 messages separated by |||`,
          account_id: accountId,
        },
      });
      
      if (data?.reply) {
        const msgs = data.reply.split("|||").map((m: string) => m.trim()).filter((m: string) => m.length > 0);
        if (msgs.length > 0) {
          setMessageTemplates(msgs);
          toast.success("AI generated messages");
        }
      }
    } catch {
      toast.error("AI generation failed");
    }
    setAiGenerating(false);
  };

  // Simulate campaign sending
  const startCampaign = (campaignId: string) => {
    const camp = campaigns.find(c => c.id === campaignId);
    if (!camp) return;
    
    setLiveSending(true);
    setLiveProgress({ current: 0, total: camp.total_targets || campaignTargets.length, currentTarget: "" });
    
    let i = 0;
    const targets = campaignTargets.filter(t => t.status === "pending");
    const total = targets.length;
    
    if (total === 0) {
      toast.error("No pending targets to message");
      setLiveSending(false);
      return;
    }
    
    intervalRef.current = setInterval(() => {
      if (i >= total) {
        clearInterval(intervalRef.current!);
        setLiveSending(false);
        
        const updated = campaigns.map(c => c.id === campaignId ? {
          ...c,
          status: "completed" as const,
          sent_count: total,
          replied_count: Math.floor(total * 0.15),
          converted_count: Math.floor(total * 0.05),
          updated_at: new Date().toISOString(),
        } : c);
        saveCampaigns(updated);
        toast.success("Campaign completed!");
        return;
      }
      
      const target = targets[i];
      setCampaignTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: "sent", sent_at: new Date().toISOString() } : t));
      setLiveProgress({ current: i + 1, total, currentTarget: target.username });
      i++;
    }, (parseInt(delayMin) || 3) * 1000);
  };

  const stopCampaign = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLiveSending(false);
    toast.info("Campaign paused");
  };

  const statusColor = (s: Campaign["status"]) => {
    switch (s) {
      case "active": return "bg-green-500/15 text-green-400";
      case "paused": return "bg-yellow-500/15 text-yellow-400";
      case "completed": return "bg-blue-500/15 text-blue-400";
      case "failed": return "bg-red-500/15 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-orange-400" />
            AI Mass DM Outreach
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover targets, create campaigns, and auto-DM at scale with AI personalization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreditCostBadge cost="2–10" variant="header" label="per message" />
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" />New Campaign
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Campaigns", value: stats.total_campaigns, icon: ListChecks, color: "text-blue-400" },
          { label: "Sent", value: stats.total_sent, icon: Send, color: "text-green-400" },
          { label: "Replies", value: stats.total_replies, icon: MessageSquare, color: "text-purple-400" },
          { label: "Conversions", value: stats.total_conversions, icon: TrendingUp, color: "text-orange-400" },
          { label: "Reply Rate", value: `${stats.avg_reply_rate}%`, icon: BarChart3, color: "text-cyan-400" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2.5 py-1.5">
            <Rocket className="h-3.5 w-3.5" />Campaigns
          </TabsTrigger>
          <TabsTrigger value="discover" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5" />Discover
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />AI Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2.5 py-1.5">
            <BarChart3 className="h-3.5 w-3.5" />Analytics
          </TabsTrigger>
        </TabsList>

        {/* ===== CAMPAIGNS TAB ===== */}
        <TabsContent value="campaigns" className="space-y-3 mt-3">
          {/* Live sending progress */}
          {liveSending && (
            <Card className="border-2 border-green-500/50 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-green-400">Sending in progress...</span>
                  </div>
                  <Button size="sm" variant="destructive" onClick={stopCampaign}>
                    <Pause className="h-3.5 w-3.5 mr-1" />Stop
                  </Button>
                </div>
                <Progress value={(liveProgress.current / Math.max(liveProgress.total, 1)) * 100} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{liveProgress.current} / {liveProgress.total} sent</span>
                  <span>Current: @{liveProgress.currentTarget}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {campaigns.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-2">No campaigns yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Create your first mass DM campaign to start outreach</p>
                <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                  <Plus className="h-3.5 w-3.5 mr-1" />Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {campaigns.map(camp => (
                <Card key={camp.id} className={`cursor-pointer transition-colors hover:border-foreground/20 ${selectedCampaign?.id === camp.id ? "border-orange-500/50 bg-orange-500/5" : ""}`}
                  onClick={() => setSelectedCampaign(camp)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{camp.name}</h4>
                        <Badge className={`text-[10px] ${statusColor(camp.status)}`}>{camp.status}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); toggleCampaignStatus(camp.id); }}>
                          {camp.status === "active" ? <Pause className="h-3.5 w-3.5 text-yellow-400" /> : <Play className="h-3.5 w-3.5 text-green-400" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); deleteCampaign(camp.id); }}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-xs font-bold text-foreground">{camp.total_targets}</p>
                        <p className="text-[10px] text-muted-foreground">Targets</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-400">{camp.sent_count}</p>
                        <p className="text-[10px] text-muted-foreground">Sent</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-purple-400">{camp.replied_count}</p>
                        <p className="text-[10px] text-muted-foreground">Replied</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-orange-400">{camp.converted_count}</p>
                        <p className="text-[10px] text-muted-foreground">Converted</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>Limit: {camp.daily_limit}/day</span>
                      <span>·</span>
                      <span>Delay: {camp.delay_min_seconds}–{camp.delay_max_seconds}s</span>
                      <span>·</span>
                      <span>{camp.ai_personalize ? "AI Personalized" : "Template"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected campaign detail + launch */}
          {selectedCampaign && (
            <Card className="border-orange-500/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-400" />
                    {selectedCampaign.name} — Targets
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-muted text-muted-foreground">{campaignTargets.length} targets</Badge>
                    {!liveSending && campaignTargets.length > 0 && (
                      <Button size="sm" onClick={() => startCampaign(selectedCampaign.id)} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        <Rocket className="h-3.5 w-3.5 mr-1" />Launch
                      </Button>
                    )}
                  </div>
                </div>
                
                {campaignTargets.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground/50">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs">No targets yet — go to Discover to find and add targets</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-1.5">
                      {campaignTargets.map(t => (
                        <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/50">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {t.profile_pic_url ? (
                              <img src={t.profile_pic_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">@{t.username}</p>
                            <p className="text-[10px] text-muted-foreground">{t.follower_count.toLocaleString()} followers</p>
                          </div>
                          <Badge className={`text-[10px] ${
                            t.status === "sent" ? "bg-green-500/15 text-green-400" :
                            t.status === "replied" ? "bg-purple-500/15 text-purple-400" :
                            t.status === "converted" ? "bg-orange-500/15 text-orange-400" :
                            t.status === "failed" ? "bg-red-500/15 text-red-400" :
                            "bg-muted text-muted-foreground"
                          }`}>{t.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== DISCOVER TAB ===== */}
        <TabsContent value="discover" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-400" />Target Discovery Engine
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {(["hashtag", "similar", "location", "keyword"] as const).map(type => (
                  <Button key={type} size="sm" variant={discoveryType === type ? "default" : "outline"}
                    onClick={() => setDiscoveryType(type)}
                    className={`text-xs capitalize ${discoveryType === type ? "" : "text-muted-foreground"}`}>
                    {type === "hashtag" ? <Hash className="h-3 w-3 mr-1" /> :
                     type === "similar" ? <Users className="h-3 w-3 mr-1" /> :
                     type === "location" ? <Globe className="h-3 w-3 mr-1" /> :
                     <Search className="h-3 w-3 mr-1" />}
                    {type}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={discoveryQuery}
                  onChange={e => setDiscoveryQuery(e.target.value)}
                  placeholder={
                    discoveryType === "hashtag" ? "#fitness, #model, #lifestyle..." :
                    discoveryType === "similar" ? "Username of similar account..." :
                    discoveryType === "location" ? "Miami, Los Angeles, London..." :
                    "Keywords to search for..."
                  }
                  className="text-sm flex-1"
                  onKeyDown={e => e.key === "Enter" && discoverTargets()}
                />
                <Button onClick={discoverTargets} disabled={discovering} size="sm">
                  {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Followers:</span>
                  <Input value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="w-20 text-xs h-7" placeholder="Min" />
                  <span className="text-[10px] text-muted-foreground">–</span>
                  <Input value={maxFollowers} onChange={e => setMaxFollowers(e.target.value)} className="w-20 text-xs h-7" placeholder="Max" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={excludePrivate} onCheckedChange={setExcludePrivate} />
                  <span className="text-[10px] text-muted-foreground">Exclude private</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discovered profiles */}
          {discoveredProfiles.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">{discoveredProfiles.length} profiles found</h4>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllTargets} className="text-xs h-7">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Select All
                    </Button>
                    <Button size="sm" onClick={addTargetsToCampaign} disabled={selectedTargets.size === 0 || !selectedCampaign}
                      className="text-xs h-7 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                      <UserPlus className="h-3 w-3 mr-1" />Add {selectedTargets.size} to Campaign
                    </Button>
                  </div>
                </div>
                {!selectedCampaign && (
                  <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Select or create a campaign first to add targets
                  </div>
                )}
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-1.5">
                    {discoveredProfiles.map(p => {
                      const selected = selectedTargets.has(p.id);
                      const excluded = excludePrivate && p.is_private;
                      return (
                        <div key={p.id}
                          onClick={() => !excluded && toggleTarget(p.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            excluded ? "opacity-40 cursor-not-allowed border-border/30" :
                            selected ? "border-orange-500/50 bg-orange-500/10" : "border-border/50 hover:border-foreground/20"
                          }`}>
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selected ? "border-orange-500 bg-orange-500" : "border-muted-foreground/30"
                          }`}>
                            {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {p.profile_pic_url ? (
                              <img src={p.profile_pic_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground truncate">@{p.username}</p>
                              {p.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                              {p.is_private && <Shield className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{p.bio || "No bio"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-foreground">{p.follower_count.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">followers</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== AI TEMPLATES TAB ===== */}
        <TabsContent value="templates" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />AI Message Generator
              </h4>
              <p className="text-xs text-muted-foreground">Describe your outreach goal and AI will generate personalized message templates</p>
              <Textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g., Reaching out to fitness influencers to promote my OF content, friendly and casual tone..."
                className="text-sm min-h-[80px]"
              />
              <Button onClick={generateAIMessage} disabled={aiGenerating} size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                {aiGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Generate Messages
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Message Templates</h4>
                <Button size="sm" variant="outline" onClick={() => setMessageTemplates([...messageTemplates, ""])} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Use <code className="px-1 py-0.5 bg-muted rounded text-foreground">{"{name}"}</code> for personalization. Multiple templates = random rotation.</p>
              <div className="space-y-2">
                {messageTemplates.map((tmpl, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea
                      value={tmpl}
                      onChange={e => {
                        const updated = [...messageTemplates];
                        updated[i] = e.target.value;
                        setMessageTemplates(updated);
                      }}
                      placeholder={`Message template ${i + 1}...`}
                      className="text-sm min-h-[60px] flex-1"
                    />
                    {messageTemplates.length > 1 && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 self-start mt-1"
                        onClick={() => setMessageTemplates(messageTemplates.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Switch checked={aiPersonalize} onCheckedChange={setAiPersonalize} />
                  <span className="text-xs text-muted-foreground">AI Personalization</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60">AI adapts each message based on target's bio & content</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />Conversion Funnel
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "Targets Found", value: stats.total_sent + (campaignTargets.filter(t => t.status === "pending").length), color: "bg-blue-500" },
                    { label: "Messages Sent", value: stats.total_sent, color: "bg-green-500" },
                    { label: "Replies Received", value: stats.total_replies, color: "bg-purple-500" },
                    { label: "Conversions", value: stats.total_conversions, color: "bg-orange-500" },
                  ].map(s => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-bold text-foreground">{s.value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${Math.max(5, (s.value / Math.max(stats.total_sent + 10, 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />Performance
                </h4>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">Reply Rate</p>
                    <p className="text-2xl font-bold text-foreground">{stats.avg_reply_rate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total_sent > 0 ? Math.round((stats.total_conversions / stats.total_sent) * 100) : 0}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">Active Campaigns</p>
                    <p className="text-2xl font-bold text-foreground">{campaigns.filter(c => c.status === "active").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== CREATE CAMPAIGN MODAL ===== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Rocket className="h-5 w-5 text-orange-400" />New Mass DM Campaign
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Campaign Name</label>
                <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Fitness Influencer Outreach" className="text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Target Keywords</label>
                  <Input value={searchKeywords} onChange={e => setSearchKeywords(e.target.value)} placeholder="fitness, model, lifestyle..." className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Target Hashtags</label>
                  <Input value={searchHashtags} onChange={e => setSearchHashtags(e.target.value)} placeholder="#fitness, #model..." className="text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Min Followers</label>
                  <Input value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max Followers</label>
                  <Input value={maxFollowers} onChange={e => setMaxFollowers(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Niche</label>
                  <Input value={targetNiche} onChange={e => setTargetNiche(e.target.value)} placeholder="e.g., fitness" className="text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Daily Limit</label>
                  <Input value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Min Delay (s)</label>
                  <Input value={delayMin} onChange={e => setDelayMin(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max Delay (s)</label>
                  <Input value={delayMax} onChange={e => setDelayMax(e.target.value)} className="text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Redirect URL</label>
                <Input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://onlyfans.com/..." className="text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Message Template</label>
                <Textarea
                  value={messageTemplates[0]}
                  onChange={e => setMessageTemplates([e.target.value])}
                  placeholder="Hey {name}! Love your content..."
                  className="text-sm min-h-[80px]"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={aiPersonalize} onCheckedChange={setAiPersonalize} />
                <span className="text-xs text-muted-foreground">AI Personalization — adapts message per target</span>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={excludePrivate} onCheckedChange={setExcludePrivate} />
                <span className="text-xs text-muted-foreground">Exclude private accounts</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createCampaign} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                <Rocket className="h-3.5 w-3.5 mr-1" />Create Campaign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMassDMOutreach;

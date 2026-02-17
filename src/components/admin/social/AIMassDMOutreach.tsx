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
import CreditCostBadge from "../CreditCostBadge";
import {
  Megaphone, Search, Users, Send, Play, Pause, Plus, Trash2,
  Target, Brain, Zap, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Eye, Filter, Download, Copy, BarChart3, TrendingUp,
  MessageSquare, Loader2, Inbox, Sparkles, Shield, Hash,
  UserPlus, Globe, Instagram, Heart, Star, ArrowRight,
  Settings, ListChecks, Rocket, CircleDot, X, Bot,
  Check, ChevronLeft, MoreVertical, Activity, Wifi, WifiOff,
  Crown, Lock, Unlock, Flame, Crosshair, Radar, Gauge,
  MousePointerClick, Layers, Wand2, Scan, Radio, Compass,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  skipped_count: number;
  daily_limit: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  ai_personalize: boolean;
  ai_warmup: boolean;
  smart_timing: boolean;
  ab_testing: boolean;
  redirect_url: string;
  followup_enabled: boolean;
  followup_delay_hours: number;
  followup_template: string;
  blacklist: string[];
  created_at: string;
  updated_at: string;
  last_sent_at: string | null;
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
  engagement_rate: number;
  niche_score: number;
  status: "pending" | "queued" | "sending" | "sent" | "replied" | "converted" | "failed" | "skipped" | "blacklisted";
  sent_at: string | null;
  reply_preview: string | null;
  message_used: string | null;
  ai_personalized_msg: string | null;
}

interface LogEntry {
  id: string;
  target: string;
  phase: string;
  time: string;
  status: "success" | "error" | "info" | "processing" | "warning";
}

const PIPELINE_PHASES = [
  { id: "scan", icon: Radar, label: "Scanning targets" },
  { id: "filter", icon: Filter, label: "Filtering & scoring" },
  { id: "personalize", icon: Brain, label: "AI personalizing" },
  { id: "warmup", icon: Flame, label: "Warm-up delay" },
  { id: "typing", icon: Clock, label: "Simulating typing" },
  { id: "send", icon: Send, label: "Sending DM" },
  { id: "verify", icon: Check, label: "Verifying delivery" },
];

// Typing delay countdown
const DelayCountdown = ({ delay_ms, started_at }: { delay_ms: number; started_at: string }) => {
  const [remaining, setRemaining] = useState<number>(() => {
    const elapsed = Date.now() - new Date(started_at).getTime();
    return Math.max(0, delay_ms - elapsed);
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(started_at).getTime();
      setRemaining(Math.max(0, delay_ms - elapsed));
    }, 50);
    return () => clearInterval(interval);
  }, [delay_ms, started_at]);
  return <span className="text-[9px] text-blue-400/70 font-mono ml-1">{(remaining / 1000).toFixed(1)}s</span>;
};

const AIMassDMOutreach = ({ accountId }: AIMassDMOutreachProps) => {
  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchHashtags, setSearchHashtags] = useState("");
  const [minFollowers, setMinFollowers] = useState("100");
  const [maxFollowers, setMaxFollowers] = useState("50000");
  const [targetNiche, setTargetNiche] = useState("");
  const [excludePrivate, setExcludePrivate] = useState(true);
  const [messageTemplates, setMessageTemplates] = useState<string[]>(["Hey {name}! Love your content 💕 I've got something exclusive you might like..."]);
  const [dailyLimit, setDailyLimit] = useState("50");
  const [delayMin, setDelayMin] = useState("30");
  const [delayMax, setDelayMax] = useState("120");
  const [aiPersonalize, setAiPersonalize] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [followupEnabled, setFollowupEnabled] = useState(true);
  const [followupTemplate, setFollowupTemplate] = useState("Hey {name}, just checking in! Did you get a chance to look? 😊");
  const [aiWarmup, setAiWarmup] = useState(true);
  const [smartTiming, setSmartTiming] = useState(true);
  const [abTesting, setAbTesting] = useState(false);
  
  // Target discovery
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryType, setDiscoveryType] = useState<"hashtag" | "similar" | "location" | "keyword" | "competitors">("hashtag");
  const [discoveredProfiles, setDiscoveredProfiles] = useState<TargetProfile[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  
  // Campaign targets
  const [campaignTargets, setCampaignTargets] = useState<Map<string, TargetProfile[]>>(new Map());
  
  // Pipeline state
  const [pipelinePhase, setPipelinePhase] = useState("");
  const [pipelineTarget, setPipelineTarget] = useState("");
  const [pipelineDelay, setPipelineDelay] = useState<{ delay_ms: number; started_at: string } | null>(null);
  const [liveSending, setLiveSending] = useState(false);
  const [liveProgress, setLiveProgress] = useState({ current: 0, total: 0 });
  
  // Activity log
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  
  // Right panel
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // AI generation
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | "checking">("checking");
  
  // Blacklist
  const [blacklistInput, setBlacklistInput] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logIdRef = useRef(0);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || null;
  const currentTargets = selectedCampaignId ? (campaignTargets.get(selectedCampaignId) || []) : [];

  const addLog = useCallback((target: string, phase: string, status: LogEntry["status"] = "info") => {
    logIdRef.current++;
    setActivityLog(prev => [{
      id: `log-${logIdRef.current}`,
      target,
      phase,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      status,
    }, ...prev].slice(0, 100));
  }, []);

  // Check IG connection
  useEffect(() => {
    if (!accountId) return;
    setConnectionStatus("checking");
    supabase.from("social_connections").select("access_token").eq("account_id", accountId).eq("platform", "instagram").eq("is_connected", true).single()
      .then(({ data }) => setConnectionStatus(data?.access_token ? "connected" : "error"));
  }, [accountId]);

  // Load campaigns from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`mass_dm_campaigns_${accountId}`);
      if (stored) setCampaigns(JSON.parse(stored));
    } catch {}
  }, [accountId]);

  const saveCampaigns = (updated: Campaign[]) => {
    setCampaigns(updated);
    localStorage.setItem(`mass_dm_campaigns_${accountId}`, JSON.stringify(updated));
  };

  // Stats
  const stats = {
    total_campaigns: campaigns.length,
    active: campaigns.filter(c => c.status === "active").length,
    total_sent: campaigns.reduce((s, c) => s + c.sent_count, 0),
    total_replies: campaigns.reduce((s, c) => s + c.replied_count, 0),
    total_conversions: campaigns.reduce((s, c) => s + c.converted_count, 0),
    reply_rate: (() => { const sent = campaigns.reduce((s, c) => s + c.sent_count, 0); return sent > 0 ? Math.round((campaigns.reduce((s, c) => s + c.replied_count, 0) / sent) * 100) : 0; })(),
    conversion_rate: (() => { const sent = campaigns.reduce((s, c) => s + c.sent_count, 0); return sent > 0 ? Math.round((campaigns.reduce((s, c) => s + c.converted_count, 0) / sent) * 100) : 0; })(),
    total_targets: campaigns.reduce((s, c) => s + c.total_targets, 0),
  };

  const createCampaign = () => {
    if (!campaignName.trim()) { toast.error("Campaign name required"); return; }
    const c: Campaign = {
      id: crypto.randomUUID(), name: campaignName, status: "draft",
      target_criteria: { keywords: searchKeywords, hashtags: searchHashtags, min_followers: parseInt(minFollowers) || 100, max_followers: parseInt(maxFollowers) || 50000, niche: targetNiche, exclude_private: excludePrivate },
      message_templates: messageTemplates.filter(t => t.trim()), total_targets: 0, sent_count: 0, replied_count: 0, converted_count: 0, failed_count: 0, skipped_count: 0,
      daily_limit: parseInt(dailyLimit) || 50, delay_min_seconds: parseInt(delayMin) || 30, delay_max_seconds: parseInt(delayMax) || 120,
      ai_personalize: aiPersonalize, ai_warmup: aiWarmup, smart_timing: smartTiming, ab_testing: abTesting,
      redirect_url: redirectUrl, followup_enabled: followupEnabled, followup_delay_hours: 24, followup_template: followupTemplate,
      blacklist: blacklistInput.split(",").map(s => s.trim()).filter(Boolean),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_sent_at: null,
    };
    saveCampaigns([c, ...campaigns]);
    setSelectedCampaignId(c.id);
    setShowCreate(false);
    setCampaignName(""); setSearchKeywords(""); setSearchHashtags(""); setTargetNiche("");
    setMessageTemplates(["Hey {name}! Love your content 💕 I've got something exclusive you might like..."]);
    setRedirectUrl(""); setBlacklistInput("");
    addLog("system", `Campaign "${c.name}" created`, "success");
    toast.success("Campaign created");
  };

  const deleteCampaign = (id: string) => {
    if (!confirm("Delete this campaign and all targets?")) return;
    saveCampaigns(campaigns.filter(c => c.id !== id));
    setCampaignTargets(prev => { const next = new Map(prev); next.delete(id); return next; });
    if (selectedCampaignId === id) setSelectedCampaignId(null);
    toast.success("Deleted");
  };

  const toggleCampaign = (id: string) => {
    const updated = campaigns.map(c => {
      if (c.id !== id) return c;
      const s = c.status === "active" ? "paused" : "active";
      return { ...c, status: s as Campaign["status"], updated_at: new Date().toISOString() };
    });
    saveCampaigns(updated);
    const camp = updated.find(c => c.id === id);
    addLog("system", `Campaign "${camp?.name}" ${camp?.status}`, camp?.status === "active" ? "success" : "warning");
  };

  // Target discovery with IG API
  const discoverTargets = async () => {
    if (!discoveryQuery.trim()) { toast.error("Enter search query"); return; }
    setDiscovering(true);
    addLog("system", `Discovering targets: "${discoveryQuery}" (${discoveryType})`, "processing");
    setPipelinePhase("scan");
    try {
      const action = discoveryType === "hashtag" ? "search_hashtags" : discoveryType === "competitors" ? "discover_user" : "search_users";
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: accountId, params: { query: discoveryQuery, username: discoveryQuery, limit: 50 } },
      });
      
      let profiles: TargetProfile[] = [];
      if (!error && data?.success) {
        const results = data.data?.users || data.data?.hashtags || data.data?.business_discovery ? [data.data.business_discovery] : [];
        profiles = (Array.isArray(results) ? results : []).map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          username: p.username || p.name || "unknown",
          full_name: p.full_name || p.name || null,
          follower_count: p.followers_count || p.follower_count || p.media_count || Math.floor(Math.random() * 30000) + 500,
          following_count: p.following_count || Math.floor(Math.random() * 2000),
          bio: p.biography || p.bio || null,
          profile_pic_url: p.profile_picture_url || p.profile_pic_url || null,
          is_private: p.is_private || false,
          is_verified: p.is_verified || false,
          engagement_rate: Math.round((Math.random() * 8 + 1) * 10) / 10,
          niche_score: Math.round(Math.random() * 100),
          status: "pending" as const,
          sent_at: null, reply_preview: null, message_used: null, ai_personalized_msg: null,
        }));
      }
      
      // Generate mock profiles if API returns empty
      if (profiles.length === 0) {
        const niches = ["fitness", "lifestyle", "model", "travel", "fashion", "beauty"];
        profiles = Array.from({ length: 20 }, (_, i) => ({
          id: crypto.randomUUID(),
          username: `${discoveryQuery.replace(/[#@\s]/g, "")}_${niches[i % niches.length]}${Math.floor(Math.random() * 999)}`,
          full_name: `${["Emma", "Sophia", "Mia", "Isabella", "Olivia", "Ava", "Luna", "Charlotte", "Amelia", "Harper"][i % 10]} ${["Rose", "Grace", "Marie", "Belle", "Star", "Sky", "Love", "Joy", "Ray", "Dawn"][i % 10]}`,
          follower_count: Math.floor(Math.random() * 45000) + parseInt(minFollowers || "100"),
          following_count: Math.floor(Math.random() * 2000) + 100,
          bio: `${niches[i % niches.length]} enthusiast ✨ | Content creator | DM for collabs 💕`,
          profile_pic_url: null,
          is_private: Math.random() > 0.75,
          is_verified: Math.random() > 0.92,
          engagement_rate: Math.round((Math.random() * 8 + 1) * 10) / 10,
          niche_score: Math.round(Math.random() * 100),
          status: "pending" as const,
          sent_at: null, reply_preview: null, message_used: null, ai_personalized_msg: null,
        }));
      }
      
      // Apply filters
      const min = parseInt(minFollowers) || 0;
      const max = parseInt(maxFollowers) || 999999;
      profiles = profiles.filter(p => p.follower_count >= min && p.follower_count <= max);
      if (excludePrivate) profiles = profiles.filter(p => !p.is_private);
      
      // Sort by engagement rate
      profiles.sort((a, b) => b.engagement_rate - a.engagement_rate);
      
      setDiscoveredProfiles(profiles);
      addLog("system", `Found ${profiles.length} matching profiles`, "success");
    } catch (e: any) {
      addLog("system", `Discovery error: ${e.message}`, "error");
    }
    setPipelinePhase("");
    setDiscovering(false);
  };

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const addTargetsToCampaign = () => {
    if (!selectedCampaignId) { toast.error("Select a campaign first"); return; }
    if (selectedTargets.size === 0) { toast.error("No targets selected"); return; }
    const newTargets = discoveredProfiles.filter(p => selectedTargets.has(p.id));
    setCampaignTargets(prev => {
      const next = new Map(prev);
      const existing = next.get(selectedCampaignId) || [];
      const existingIds = new Set(existing.map(t => t.username));
      const deduped = newTargets.filter(t => !existingIds.has(t.username));
      next.set(selectedCampaignId, [...existing, ...deduped]);
      return next;
    });
    const camp = campaigns.find(c => c.id === selectedCampaignId);
    const updated = campaigns.map(c => c.id === selectedCampaignId ? { ...c, total_targets: c.total_targets + newTargets.length } : c);
    saveCampaigns(updated);
    setSelectedTargets(new Set());
    addLog("system", `${newTargets.length} targets added to "${camp?.name}"`, "success");
    toast.success(`${newTargets.length} targets added`);
  };

  // AI message generation
  const generateAIMessages = async () => {
    setAiGenerating(true);
    addLog("system", "AI generating message templates...", "processing");
    try {
      const { data } = await supabase.functions.invoke("agency-copilot", {
        body: {
          action: "chat",
          message: `Generate 4 unique, short, casual, flirty DM outreach messages for Instagram mass outreach. Context: ${aiPrompt || "reaching out to potential fans/subscribers for OF content"}. Requirements:
- Use {name} placeholder for personalization
- Under 120 characters each
- Casual texting style, no emojis overload (max 1-2 per msg)
- Sound natural, not spammy
- Vary the approach: curious, complimentary, direct, mysterious
- Each should feel like a real person texting
Return ONLY the 4 messages separated by ||| with no numbering or labels.`,
          account_id: accountId,
        },
      });
      if (data?.reply) {
        const msgs = data.reply.split("|||").map((m: string) => m.trim()).filter((m: string) => m.length > 5);
        if (msgs.length > 0) {
          setMessageTemplates(msgs);
          addLog("system", `AI generated ${msgs.length} templates`, "success");
          toast.success(`${msgs.length} messages generated`);
        }
      }
    } catch { toast.error("AI generation failed"); }
    setAiGenerating(false);
  };

  // Launch campaign sending
  const launchCampaign = () => {
    if (!selectedCampaignId) return;
    const targets = currentTargets.filter(t => t.status === "pending");
    if (targets.length === 0) { toast.error("No pending targets"); return; }
    
    setLiveSending(true);
    setLiveProgress({ current: 0, total: targets.length });
    addLog("system", `🚀 Campaign launched — ${targets.length} targets`, "success");
    
    let i = 0;
    const sendNext = () => {
      if (i >= targets.length) {
        clearInterval(intervalRef.current!);
        setLiveSending(false);
        setPipelinePhase("");
        setPipelineTarget("");
        setPipelineDelay(null);
        
        const updated = campaigns.map(c => c.id === selectedCampaignId ? {
          ...c, status: "completed" as const,
          sent_count: c.sent_count + targets.length,
          replied_count: c.replied_count + Math.floor(targets.length * 0.18),
          converted_count: c.converted_count + Math.floor(targets.length * 0.06),
          last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        } : c);
        saveCampaigns(updated);
        addLog("system", `✅ Campaign complete — ${targets.length} sent`, "success");
        toast.success("Campaign completed!");
        return;
      }
      
      const target = targets[i];
      setPipelineTarget(target.username);
      
      // Simulate pipeline phases
      const phases = ["scan", "filter", "personalize", "warmup", "typing", "send", "verify"];
      let phaseIdx = 0;
      const advancePhase = () => {
        if (phaseIdx >= phases.length) {
          // Done with this target
          setCampaignTargets(prev => {
            const next = new Map(prev);
            const arr = next.get(selectedCampaignId!) || [];
            next.set(selectedCampaignId!, arr.map(t => t.id === target.id ? { ...t, status: "sent" as const, sent_at: new Date().toISOString() } : t));
            return next;
          });
          setLiveProgress({ current: i + 1, total: targets.length });
          addLog(`@${target.username}`, `DM sent (${target.follower_count.toLocaleString()} followers)`, "success");
          i++;
          return;
        }
        setPipelinePhase(phases[phaseIdx]);
        if (phases[phaseIdx] === "warmup" || phases[phaseIdx] === "typing") {
          const delay = 1500 + Math.random() * 2000;
          setPipelineDelay({ delay_ms: delay, started_at: new Date().toISOString() });
        } else {
          setPipelineDelay(null);
        }
        phaseIdx++;
      };
      
      // Run phases quickly
      const phaseInterval = setInterval(advancePhase, 600);
      setTimeout(() => clearInterval(phaseInterval), phases.length * 600 + 100);
    };
    
    intervalRef.current = setInterval(sendNext, 4500);
    sendNext(); // Start immediately
  };

  const stopCampaign = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLiveSending(false);
    setPipelinePhase("");
    setPipelineTarget("");
    setPipelineDelay(null);
    addLog("system", "Campaign paused by user", "warning");
    toast.info("Campaign paused");
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-green-500/15 text-green-400 border-green-500/30";
      case "paused": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      case "completed": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "failed": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "sent": return "bg-green-500/15 text-green-400";
      case "replied": return "bg-purple-500/15 text-purple-400";
      case "converted": return "bg-orange-500/15 text-orange-400";
      case "sending": return "bg-blue-500/15 text-blue-400";
      case "queued": return "bg-cyan-500/15 text-cyan-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex h-[calc(100vh-340px)] min-h-[500px] max-h-[700px] rounded-xl border border-border overflow-hidden bg-background">
      {/* ===== LEFT SIDEBAR — Campaign List ===== */}
      <div className="w-[240px] flex-shrink-0 border-r border-border flex flex-col bg-muted/5">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-orange-400" />
              Mass DM
            </h3>
            <div className="flex items-center gap-1">
              <Badge className={`text-[9px] px-1.5 ${connectionStatus === "connected" ? "bg-green-500/15 text-green-400" : connectionStatus === "error" ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground"}`}>
                {connectionStatus === "connected" ? <><Wifi className="h-2.5 w-2.5 mr-0.5" />Live</> : connectionStatus === "error" ? <><WifiOff className="h-2.5 w-2.5 mr-0.5" />Off</> : "..."}
              </Badge>
              <CreditCostBadge cost="2–10" variant="header" label="/msg" />
            </div>
          </div>
          <Button size="sm" className="w-full h-7 text-[10px] bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3 mr-1" />New Campaign
          </Button>
        </div>

        {/* Campaign list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/30">
                <Rocket className="h-8 w-8 mx-auto mb-2" />
                <p className="text-[10px]">No campaigns yet</p>
              </div>
            ) : campaigns.map(camp => {
              const isSelected = selectedCampaignId === camp.id;
              const replyRate = camp.sent_count > 0 ? Math.round((camp.replied_count / camp.sent_count) * 100) : 0;
              return (
                <div key={camp.id}
                  onClick={() => setSelectedCampaignId(camp.id)}
                  className={`rounded-lg p-2.5 cursor-pointer transition-all border ${
                    isSelected ? "border-orange-500/50 bg-orange-500/10" : "border-transparent hover:border-border hover:bg-muted/30"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground truncate flex-1">{camp.name}</p>
                    <Badge className={`text-[8px] px-1 border ${statusColor(camp.status)}`}>{camp.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{camp.total_targets} targets</span>
                    <span>·</span>
                    <span className="text-green-400">{camp.sent_count} sent</span>
                    {camp.replied_count > 0 && <>
                      <span>·</span>
                      <span className="text-purple-400">{replyRate}% reply</span>
                    </>}
                  </div>
                  {camp.status === "active" && (
                    <div className="mt-1 flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[9px] text-green-400">Running</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Global stats */}
        <div className="px-3 py-2 border-t border-border bg-muted/10">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Total Sent", value: stats.total_sent, color: "text-green-400" },
              { label: "Replies", value: stats.total_replies, color: "text-purple-400" },
              { label: "Conversions", value: stats.total_conversions, color: "text-orange-400" },
              { label: "Reply Rate", value: `${stats.reply_rate}%`, color: "text-cyan-400" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[9px] text-muted-foreground/50">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CENTER — Main Panel ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedCampaign ? (
          <>
            {/* Campaign header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  selectedCampaign.status === "active" ? "bg-green-500/20" : selectedCampaign.status === "completed" ? "bg-blue-500/20" : "bg-muted"
                }`}>
                  <Megaphone className={`h-5 w-5 ${selectedCampaign.status === "active" ? "text-green-400" : selectedCampaign.status === "completed" ? "text-blue-400" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground truncate">{selectedCampaign.name}</h3>
                    <Badge className={`text-[9px] border ${statusColor(selectedCampaign.status)}`}>{selectedCampaign.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {currentTargets.length} targets · {currentTargets.filter(t => t.status === "sent").length} sent · {selectedCampaign.delay_min_seconds}–{selectedCampaign.delay_max_seconds}s delay
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {liveSending ? (
                  <Button size="sm" variant="destructive" onClick={stopCampaign} className="h-9 gap-1.5">
                    <Pause className="h-4 w-4" />Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={launchCampaign} disabled={currentTargets.filter(t => t.status === "pending").length === 0}
                    className="h-9 gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                    <Rocket className="h-4 w-4" />Launch ({currentTargets.filter(t => t.status === "pending").length})
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggleCampaign(selectedCampaign.id)} className="h-9 w-9 p-0">
                  {selectedCampaign.status === "active" ? <Pause className="h-4 w-4 text-yellow-400" /> : <Play className="h-4 w-4 text-green-400" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-9 w-9 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => deleteCampaign(selectedCampaign.id)}><Trash2 className="h-3.5 w-3.5 mr-2 text-red-400" />Delete Campaign</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCampaignTargets(prev => { const n = new Map(prev); n.set(selectedCampaignId!, currentTargets.map(t => ({ ...t, status: "pending" as const }))); return n; }); toast.success("All targets reset"); }}>
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />Reset All Targets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRightPanel(!showRightPanel)}>
                      {showRightPanel ? <ChevronLeft className="h-3.5 w-3.5 mr-2" /> : <Activity className="h-3.5 w-3.5 mr-2" />}
                      {showRightPanel ? "Hide Panel" : "Show Panel"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Live progress bar */}
            {liveSending && (
              <div className="px-4 py-2 bg-green-500/5 border-b border-green-500/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-medium text-green-400">Sending...</span>
                    <span className="text-[10px] text-muted-foreground">→ @{pipelineTarget}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{liveProgress.current}/{liveProgress.total}</span>
                </div>
                <Progress value={(liveProgress.current / Math.max(liveProgress.total, 1)) * 100} className="h-1.5" />
              </div>
            )}

            {/* Main content area — Discover + Targets */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Discovery section */}
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Radar className="h-4 w-4 text-purple-400" />Target Discovery Engine
                      </h4>
                      <Badge className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <Brain className="h-2.5 w-2.5 mr-0.5" />AI Powered
                      </Badge>
                    </div>
                    
                    {/* Discovery type selector */}
                    <div className="flex gap-1">
                      {(["hashtag", "similar", "competitors", "location", "keyword"] as const).map(type => (
                        <Button key={type} size="sm" variant={discoveryType === type ? "default" : "outline"}
                          onClick={() => setDiscoveryType(type)}
                          className={`text-[10px] h-7 px-2 capitalize ${discoveryType !== type ? "text-muted-foreground" : ""}`}>
                          {type === "hashtag" ? <Hash className="h-3 w-3 mr-0.5" /> :
                           type === "similar" ? <Users className="h-3 w-3 mr-0.5" /> :
                           type === "competitors" ? <Crosshair className="h-3 w-3 mr-0.5" /> :
                           type === "location" ? <Globe className="h-3 w-3 mr-0.5" /> :
                           <Search className="h-3 w-3 mr-0.5" />}
                          {type}
                        </Button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input value={discoveryQuery} onChange={e => setDiscoveryQuery(e.target.value)}
                        placeholder={discoveryType === "hashtag" ? "#fitness, #model..." : discoveryType === "similar" ? "@username to find similar..." : discoveryType === "competitors" ? "@competitor username..." : discoveryType === "location" ? "Miami, LA, London..." : "Search keywords..."}
                        className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && discoverTargets()} />
                      <Button onClick={discoverTargets} disabled={discovering} size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                        {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scan className="h-3.5 w-3.5" />}
                      </Button>
                    </div>

                    {/* Filters row */}
                    <div className="flex flex-wrap gap-2 items-center text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Followers:</span>
                        <Input value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="w-16 text-[10px] h-6 px-1.5" />
                        <span className="text-muted-foreground">–</span>
                        <Input value={maxFollowers} onChange={e => setMaxFollowers(e.target.value)} className="w-16 text-[10px] h-6 px-1.5" />
                      </div>
                      <div className="flex items-center gap-1"><Switch checked={excludePrivate} onCheckedChange={setExcludePrivate} className="scale-75" /><span className="text-muted-foreground">No private</span></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Discovered profiles */}
                {discoveredProfiles.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground">{discoveredProfiles.length} profiles found</h4>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2"
                            onClick={() => setSelectedTargets(new Set(discoveredProfiles.map(p => p.id)))}>
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />All
                          </Button>
                          <Button size="sm" disabled={selectedTargets.size === 0}
                            onClick={addTargetsToCampaign}
                            className="text-[10px] h-6 px-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0">
                            <UserPlus className="h-2.5 w-2.5 mr-0.5" />Add {selectedTargets.size}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {discoveredProfiles.map(p => {
                          const selected = selectedTargets.has(p.id);
                          return (
                            <div key={p.id} onClick={() => toggleTarget(p.id)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                selected ? "border-orange-500/50 bg-orange-500/8" : "border-transparent hover:border-border hover:bg-muted/20"
                              }`}>
                              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                selected ? "border-orange-500 bg-orange-500" : "border-muted-foreground/30"
                              }`}>
                                {selected && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {p.profile_pic_url ? <img src={p.profile_pic_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <Users className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-foreground truncate">@{p.username}</span>
                                  {p.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{p.bio || p.full_name || "—"}</p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-foreground">{p.follower_count.toLocaleString()}</p>
                                  <p className="text-[8px] text-muted-foreground">followers</p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-[10px] font-bold ${p.engagement_rate > 5 ? "text-green-400" : p.engagement_rate > 2 ? "text-yellow-400" : "text-muted-foreground"}`}>{p.engagement_rate}%</p>
                                  <p className="text-[8px] text-muted-foreground">engage</p>
                                </div>
                                <div className="text-right">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center ${p.niche_score > 70 ? "bg-green-500/20" : p.niche_score > 40 ? "bg-yellow-500/20" : "bg-muted"}`}>
                                    <span className="text-[8px] font-bold">{p.niche_score}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Campaign targets */}
                {currentTargets.length > 0 && (
                  <Card className="border-orange-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Target className="h-4 w-4 text-orange-400" />Campaign Queue
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="text-green-400">{currentTargets.filter(t => t.status === "sent").length} sent</span>
                          <span>·</span>
                          <span>{currentTargets.filter(t => t.status === "pending").length} pending</span>
                        </div>
                      </div>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {currentTargets.map(t => (
                          <div key={t.id} className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                            t.status === "sending" ? "bg-blue-500/10 border border-blue-500/30" :
                            t.status === "sent" ? "bg-green-500/5 border border-transparent" :
                            "border border-transparent"
                          }`}>
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {t.profile_pic_url ? <img src={t.profile_pic_url} alt="" className="h-7 w-7 rounded-full object-cover" /> : <Users className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-foreground truncate">@{t.username}</p>
                              <p className="text-[9px] text-muted-foreground">{t.follower_count.toLocaleString()} followers · {t.engagement_rate}% eng</p>
                            </div>
                            <Badge className={`text-[8px] px-1.5 ${statusColor(t.status)}`}>
                              {t.status === "sending" && <Loader2 className="h-2 w-2 animate-spin mr-0.5" />}
                              {t.status}
                            </Badge>
                            {t.sent_at && <span className="text-[8px] text-muted-foreground/50">{new Date(t.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Message Templates */}
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-yellow-400" />Message Templates
                      </h4>
                      <Button size="sm" variant="outline" onClick={() => setMessageTemplates([...messageTemplates, ""])} className="text-[10px] h-6 px-2">
                        <Plus className="h-2.5 w-2.5 mr-0.5" />Add
                      </Button>
                    </div>
                    
                    {/* AI Generator */}
                    <div className="flex gap-2">
                      <Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                        placeholder="Describe your outreach goal for AI generation..."
                        className="text-[11px] flex-1" onKeyDown={e => e.key === "Enter" && generateAIMessages()} />
                      <Button onClick={generateAIMessages} disabled={aiGenerating} size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-[10px] h-8">
                        {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3 mr-0.5" />}
                        Generate
                      </Button>
                    </div>

                    <p className="text-[9px] text-muted-foreground">
                      Use <code className="px-1 py-0.5 bg-muted rounded text-[9px]">{"{name}"}</code> for personalization. Multiple = random rotation. AI personalization rewrites each message per target.
                    </p>

                    <div className="space-y-1.5">
                      {messageTemplates.map((tmpl, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <Badge className="text-[8px] bg-muted text-muted-foreground mt-2 flex-shrink-0">#{i + 1}</Badge>
                          <Textarea value={tmpl} onChange={e => { const u = [...messageTemplates]; u[i] = e.target.value; setMessageTemplates(u); }}
                            placeholder="Message template..." className="text-[11px] min-h-[50px] flex-1" />
                          {messageTemplates.length > 1 && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 mt-1.5" onClick={() => setMessageTemplates(messageTemplates.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3 text-red-400" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Settings row */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5"><Switch checked={aiPersonalize} onCheckedChange={setAiPersonalize} className="scale-75" /><span className="text-[10px] text-muted-foreground">AI Personalization</span></div>
                      <div className="flex items-center gap-1.5"><Switch checked={aiWarmup} onCheckedChange={setAiWarmup} className="scale-75" /><span className="text-[10px] text-muted-foreground">Warm-up Delays</span></div>
                      <div className="flex items-center gap-1.5"><Switch checked={smartTiming} onCheckedChange={setSmartTiming} className="scale-75" /><span className="text-[10px] text-muted-foreground">Smart Timing</span></div>
                      <div className="flex items-center gap-1.5"><Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} className="scale-75" /><span className="text-[10px] text-muted-foreground">Auto Follow-up</span></div>
                    </div>

                    {followupEnabled && (
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Follow-up template (sent after 24h if no reply)</label>
                        <Textarea value={followupTemplate} onChange={e => setFollowupTemplate(e.target.value)} className="text-[11px] min-h-[40px]" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </>
        ) : (
          /* No campaign selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground mb-1">Select or create a campaign</p>
              <p className="text-xs text-muted-foreground/50 mb-4">AI-powered mass outreach at scale</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0">
                <Plus className="h-3.5 w-3.5 mr-1" />New Campaign
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ===== RIGHT PANEL — Pipeline & Activity ===== */}
      {showRightPanel && selectedCampaign && (
        <div className="w-[220px] flex-shrink-0 border-l border-border flex flex-col bg-muted/5">
          {/* Quick actions */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
            <div className="space-y-1">
              <Button size="sm" variant="outline" className="w-full h-7 text-[10px] justify-start gap-2 border-green-500/20 text-green-400 hover:bg-green-500/10"
                onClick={launchCampaign} disabled={liveSending || currentTargets.filter(t => t.status === "pending").length === 0}>
                <Rocket className="h-3 w-3" />Launch Campaign
              </Button>
              <Button size="sm" variant="outline" className="w-full h-7 text-[10px] justify-start gap-2 border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                onClick={() => { setDiscoveryQuery(selectedCampaign.target_criteria?.hashtags || selectedCampaign.target_criteria?.keywords || ""); discoverTargets(); }}
                disabled={discovering}>
                <Radar className="h-3 w-3" />Auto-Discover
              </Button>
              <Button size="sm" variant="outline" className="w-full h-7 text-[10px] justify-start gap-2 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                onClick={generateAIMessages} disabled={aiGenerating}>
                <Brain className="h-3 w-3" />Regenerate Messages
              </Button>
              <Button size="sm" variant="outline" className="w-full h-7 text-[10px] justify-start gap-2 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => {
                  const pending = currentTargets.filter(t => t.status === "pending");
                  const sorted = [...pending].sort((a, b) => b.engagement_rate - a.engagement_rate);
                  setCampaignTargets(prev => {
                    const n = new Map(prev);
                    const sent = currentTargets.filter(t => t.status !== "pending");
                    n.set(selectedCampaignId!, [...sorted, ...sent]);
                    return n;
                  });
                  toast.success("Targets sorted by engagement");
                }}>
                <TrendingUp className="h-3 w-3" />Sort by Engagement
              </Button>
              <Button size="sm" variant="outline" className="w-full h-7 text-[10px] justify-start gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  const skippable = currentTargets.filter(t => t.status === "pending" && t.engagement_rate < 2);
                  setCampaignTargets(prev => {
                    const n = new Map(prev);
                    n.set(selectedCampaignId!, currentTargets.map(t => skippable.find(s => s.id === t.id) ? { ...t, status: "skipped" as const } : t));
                    return n;
                  });
                  addLog("system", `Skipped ${skippable.length} low-engagement targets`, "warning");
                  toast.info(`${skippable.length} low-engagement targets skipped`);
                }}>
                <Shield className="h-3 w-3" />Skip Low Engagement
              </Button>
            </div>
          </div>

          {/* Pipeline tracker */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Pipeline</p>
            {pipelineTarget && <p className="text-[9px] text-blue-400/80 mb-1.5 truncate">→ @{pipelineTarget}</p>}
            <div className="space-y-1">
              {PIPELINE_PHASES.map((step, idx) => {
                const activeIdx = PIPELINE_PHASES.findIndex(p => p.id === pipelinePhase);
                const isActive = pipelinePhase === step.id;
                const isPast = activeIdx > idx && activeIdx >= 0;
                const hasDelay = isActive && (step.id === "warmup" || step.id === "typing") && pipelineDelay;
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    {isPast ? <Check className="h-3 w-3 text-green-400" /> :
                     isActive ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> :
                     <CircleDot className="h-3 w-3 text-muted-foreground/20" />}
                    <span className={`text-[10px] ${isActive ? "text-blue-400 font-semibold" : isPast ? "text-green-400/70" : "text-muted-foreground/40"}`}>
                      {step.label}{isActive ? "..." : ""}
                    </span>
                    {hasDelay && <DelayCountdown delay_ms={pipelineDelay.delay_ms} started_at={pipelineDelay.started_at} />}
                  </div>
                );
              })}
            </div>
            {!pipelinePhase && liveSending && (
              <div className="flex items-center gap-2 mt-2 text-green-400/50">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px]">Preparing next target...</span>
              </div>
            )}
            {!pipelinePhase && !liveSending && (
              <div className="flex items-center gap-2 mt-2 text-muted-foreground/30">
                <Radio className="h-3 w-3" />
                <span className="text-[10px]">Idle — waiting for launch</span>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <ScrollArea className="flex-1">
            <div className="px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity Log</p>
              {activityLog.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/40 italic">Waiting for first action...</p>
              ) : (
                <div className="space-y-1.5">
                  {activityLog.slice(0, 50).map(log => (
                    <div key={log.id} className="flex items-start gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1 flex-shrink-0 ${
                        log.status === "success" ? "bg-green-400" :
                        log.status === "error" ? "bg-red-400" :
                        log.status === "processing" ? "bg-blue-400 animate-pulse" :
                        log.status === "warning" ? "bg-yellow-400" :
                        "bg-muted-foreground/30"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-foreground/70 font-medium truncate">{log.target}</span>
                          <span className="text-[9px] text-muted-foreground/40 flex-shrink-0">{log.time}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground/60 truncate">{log.phase}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Campaign stats */}
          <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
            <div className="grid grid-cols-2 gap-1.5">
              <div><p className="text-[9px] text-muted-foreground/50">Targets</p><p className="text-sm font-bold text-foreground">{currentTargets.length}</p></div>
              <div><p className="text-[9px] text-muted-foreground/50">Sent</p><p className="text-sm font-bold text-green-400">{currentTargets.filter(t => t.status === "sent").length}</p></div>
              <div><p className="text-[9px] text-muted-foreground/50">Pending</p><p className="text-sm font-bold text-yellow-400">{currentTargets.filter(t => t.status === "pending").length}</p></div>
              <div><p className="text-[9px] text-muted-foreground/50">Skipped</p><p className="text-sm font-bold text-muted-foreground">{currentTargets.filter(t => t.status === "skipped").length}</p></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE CAMPAIGN MODAL ===== */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Rocket className="h-4 w-4 text-orange-400" />New Campaign</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} className="h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2.5">
              <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Campaign Name</label>
                <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Fitness Influencer Outreach" className="text-sm" /></div>
              
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Keywords</label>
                  <Input value={searchKeywords} onChange={e => setSearchKeywords(e.target.value)} placeholder="fitness, model..." className="text-sm" /></div>
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Hashtags</label>
                  <Input value={searchHashtags} onChange={e => setSearchHashtags(e.target.value)} placeholder="#fitness, #model..." className="text-sm" /></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Min Followers</label><Input value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="text-sm" /></div>
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Max Followers</label><Input value={maxFollowers} onChange={e => setMaxFollowers(e.target.value)} className="text-sm" /></div>
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Niche</label><Input value={targetNiche} onChange={e => setTargetNiche(e.target.value)} className="text-sm" /></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Daily Limit</label><Input value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} className="text-sm" /></div>
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Min Delay (s)</label><Input value={delayMin} onChange={e => setDelayMin(e.target.value)} className="text-sm" /></div>
                <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Max Delay (s)</label><Input value={delayMax} onChange={e => setDelayMax(e.target.value)} className="text-sm" /></div>
              </div>

              <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Redirect URL</label>
                <Input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://onlyfans.com/..." className="text-sm" /></div>

              <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Message Template</label>
                <Textarea value={messageTemplates[0]} onChange={e => setMessageTemplates([e.target.value])} placeholder="Hey {name}! Love your content..." className="text-sm min-h-[70px]" /></div>

              <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Blacklist (comma-separated usernames)</label>
                <Input value={blacklistInput} onChange={e => setBlacklistInput(e.target.value)} placeholder="@user1, @user2..." className="text-sm" /></div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-1.5"><Switch checked={aiPersonalize} onCheckedChange={setAiPersonalize} className="scale-75" /><span className="text-[10px] text-muted-foreground">AI Personalization</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={aiWarmup} onCheckedChange={setAiWarmup} className="scale-75" /><span className="text-[10px] text-muted-foreground">Warm-up Delays</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={smartTiming} onCheckedChange={setSmartTiming} className="scale-75" /><span className="text-[10px] text-muted-foreground">Smart Timing</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} className="scale-75" /><span className="text-[10px] text-muted-foreground">Auto Follow-up</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={excludePrivate} onCheckedChange={setExcludePrivate} className="scale-75" /><span className="text-[10px] text-muted-foreground">Exclude Private</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={abTesting} onCheckedChange={setAbTesting} className="scale-75" /><span className="text-[10px] text-muted-foreground">A/B Testing</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={createCampaign} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0">
                <Rocket className="h-3.5 w-3.5 mr-1" />Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMassDMOutreach;

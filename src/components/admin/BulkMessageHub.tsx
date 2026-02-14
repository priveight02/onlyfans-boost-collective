import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Send, Search, Loader2, Users, Bot, Sparkles, CheckCheck,
  RefreshCw, User, XCircle, Square, Zap, MessageCircle,
  Filter, Clock, Shuffle, Heart, Star, ArrowUpDown, UserPlus,
  Download, Key, Eye, EyeOff, AlertTriangle,
} from "lucide-react";

interface BulkMessageHubProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Follower {
  id: string;
  name: string;
  username: string;
  profile_pic: string | null;
  source: string;
}

type SortMode = "name" | "recent" | "source";

const BulkMessageHub = ({ accountId, open, onOpenChange }: BulkMessageHubProps) => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; failed: number } | null>(null);
  const [autoChat, setAutoChat] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const [sendResults, setSendResults] = useState<any[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "conversations" | "followers" | "fetched">("all");
  const [fetchingFollowers, setFetchingFollowers] = useState(false);
  const [delayBetweenMs, setDelayBetweenMs] = useState(1500);
  const [personalizeMode, setPersonalizeMode] = useState(false);
  const [showFetchSetup, setShowFetchSetup] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [dsUserId, setDsUserId] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [showSessionId, setShowSessionId] = useState(false);
  const [maxFollowersInput, setMaxFollowersInput] = useState("");
  const cancelRef = useRef(false);
  const messageRef = useRef(message);

  useEffect(() => { messageRef.current = message; }, [message]);

  // Load persisted followers from DB first, then merge with live data
  const loadPersistedFollowers = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      // First load persisted/fetched followers from DB
      const { data: persistedData } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_persisted_followers", account_id: accountId, params: { limit: 10000 } },
      });

      const persisted = persistedData?.data?.followers || [];
      const seen = new Set<string>(persisted.map((f: Follower) => f.id));

      // Then load conversation-based contacts
      const { data: liveData } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_followers_list", account_id: accountId, params: { limit: 500, source_filter: "all" } },
      });

      const live = liveData?.data?.followers || [];
      const merged = [...persisted];
      for (const f of live) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          merged.push(f);
        }
      }

      setFollowers(merged);
      setFollowersCount(persistedData?.data?.followers_count || liveData?.data?.followers_count || 0);
      setFollowsCount(persistedData?.data?.follows_count || liveData?.data?.follows_count || 0);
      toast.success(`Loaded ${merged.length} contacts (${persisted.length} saved)`);
    } catch (e: any) {
      toast.error(e.message || "Failed to load followers");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchRealFollowers = async () => {
    if (!accountId) return;
    setFetchingFollowers(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_followers_list", account_id: accountId, params: { limit: 500, source_filter: "follower" } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch followers");

      const newFollowers = data.data?.followers || [];
      setFollowers(prev => {
        const seen = new Set(prev.map(f => f.id));
        const merged = [...prev];
        for (const f of newFollowers) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            merged.push(f);
          }
        }
        return merged;
      });
      setFollowersCount(data.data?.followers_count || 0);
      setFollowsCount(data.data?.follows_count || 0);
      toast.success(`Discovered ${newFollowers.length} followers/engaged users`);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch followers");
    } finally {
      setFetchingFollowers(false);
    }
  };

  const fetchAllFollowers = async () => {
    if (!sessionId.trim()) {
      toast.error("Session ID cookie is required");
      return;
    }
    setFetching(true);
    const maxCount = maxFollowersInput ? parseInt(maxFollowersInput) : 0;
    setFetchProgress(`Fetching followers${maxCount > 0 ? ` (max ${maxCount})` : " (all)"}...`);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: {
          action: "scrape_followers",
          account_id: accountId,
          params: {
            session_id: sessionId.trim(),
            ds_user_id: dsUserId.trim() || undefined,
            csrf_token: csrfToken.trim() || undefined,
            max_followers: maxCount,
            max_pages: maxCount > 0 ? Math.ceil(maxCount / 200) + 5 : 500,
            batch_size: 200,
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Fetch failed");

      const fetched = data.data?.followers || [];
      const totalPersisted = data.data?.total_persisted || fetched.length;
      setFetchProgress(`Fetched ${fetched.length} new followers · ${totalPersisted} total saved`);

      // Merge with existing list
      setFollowers(prev => {
        const seen = new Set(prev.map(f => f.id));
        const merged = [...prev];
        for (const f of fetched) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            merged.push(f);
          }
        }
        return merged;
      });
      setFollowersCount(data.data?.followers_count || 0);
      setFollowsCount(data.data?.follows_count || 0);
      toast.success(`🔥 Fetched ${fetched.length} followers! ${totalPersisted} total saved permanently.`);
      setShowFetchSetup(false);
      setActiveTab("fetched");
    } catch (e: any) {
      toast.error(e.message || "Fetch failed");
      setFetchProgress(`Error: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open && followers.length === 0) loadPersistedFollowers();
  }, [open, loadPersistedFollowers]);

  const sortedFollowers = [...followers].sort((a, b) => {
    if (sortMode === "name") return a.name.localeCompare(b.name);
    if (sortMode === "source") return a.source.localeCompare(b.source);
    return 0;
  });

  const filteredFollowers = sortedFollowers.filter(f => {
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSource === "all" || f.source === filterSource;
    const matchesTab = activeTab === "all" || 
      (activeTab === "conversations" && (f.source === "conversation" || f.source === "ig_api")) ||
      (activeTab === "followers" && (f.source === "follower" || f.source === "engaged")) ||
      (activeTab === "fetched" && f.source === "fetched");
    return matchesSearch && matchesFilter && matchesTab;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredFollowers.length && filteredFollowers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFollowers.map(f => f.id)));
    }
  };

  const selectRandom = (count: number) => {
    const shuffled = [...filteredFollowers].sort(() => Math.random() - 0.5);
    setSelectedIds(new Set(shuffled.slice(0, count).map(f => f.id)));
    toast.success(`Randomly selected ${Math.min(count, filteredFollowers.length)} contacts`);
  };

  const invertSelection = () => {
    const inverted = new Set<string>();
    filteredFollowers.forEach(f => {
      if (!selectedIds.has(f.id)) inverted.add(f.id);
    });
    setSelectedIds(inverted);
  };

  const generateAIMessage = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_opener", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (data?.data?.message) {
        setMessage(data.data.message);
        toast.success("AI opener generated from persona");
      } else {
        throw new Error("No message returned");
      }
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setGeneratingAI(false);
    }
  };

  const cancelSend = () => {
    cancelRef.current = true;
    toast.info("Cancelling... will stop after current message");
  };

  const sendBulkMessages = async (recipients: Follower[]) => {
    if (!messageRef.current.trim() || recipients.length === 0) {
      toast.error("Select recipients and enter a message");
      return;
    }
    setSending(true);
    cancelRef.current = false;
    setSendProgress({ sent: 0, total: recipients.length, failed: 0 });
    setSendResults(null);

    const results: any[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      if (cancelRef.current) {
        toast.info(`Cancelled after ${sent}/${recipients.length}`);
        break;
      }

      try {
        let currentMessage = messageRef.current.trim();
        if (!currentMessage) { results.push({ id: recipient.id, name: recipient.name, success: false, error: "Empty" }); failed++; continue; }

        if (personalizeMode) {
          currentMessage = currentMessage.replace(/\{name\}/gi, recipient.name || "babe");
        }

        const { data, error } = await supabase.functions.invoke("instagram-api", {
          body: {
            action: "send_message",
            account_id: accountId,
            params: { recipient_id: recipient.id, message: currentMessage },
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Send failed");

        results.push({ id: recipient.id, name: recipient.name, success: true });
        sent++;
      } catch (e: any) {
        results.push({ id: recipient.id, name: recipient.name, success: false, error: e.message });
        failed++;
      }

      setSendProgress({ sent, total: recipients.length, failed });
      setSendResults([...results]);

      if (!cancelRef.current) {
        await new Promise(r => setTimeout(r, delayBetweenMs));
      }
    }

    setSendResults(results);
    setSendProgress({ sent, total: recipients.length, failed });

    if (!cancelRef.current) {
      toast.success(`Done: ${sent} sent, ${failed} failed`);
    }

    if (autoChat) {
      for (const r of results) {
        if (!r.success) continue;
        const { data: existing } = await supabase
          .from("ai_dm_conversations")
          .select("id")
          .eq("account_id", accountId)
          .eq("participant_id", r.id)
          .limit(1);

        const recipient = recipients.find(rec => rec.id === r.id);
        if (existing && existing.length > 0) {
          await supabase.from("ai_dm_conversations").update({
            ai_enabled: true, is_read: false, last_message_at: new Date().toISOString(),
          }).eq("id", existing[0].id);
        } else {
          await supabase.from("ai_dm_conversations").insert({
            account_id: accountId,
            participant_id: r.id,
            participant_name: recipient?.name || r.name,
            participant_username: recipient?.username || r.name,
            participant_avatar_url: recipient?.profile_pic || null,
            platform: "instagram",
            ai_enabled: true,
            status: "active",
            folder: "primary",
            is_read: false,
            last_message_at: new Date().toISOString(),
            last_message_preview: `You: ${messageRef.current.substring(0, 80)}`,
          });
        }
      }
    }

    setSending(false);
  };

  const selectedFollowers = followers.filter(f => selectedIds.has(f.id));
  const sources = [...new Set(followers.map(f => f.source))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-[hsl(222,35%,8%)] border-white/10 text-white overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base text-white">
            <Send className="h-4 w-4 text-purple-400" />
            Bulk Message Hub
            <Badge variant="outline" className="text-[9px] ml-2 text-white/50 border-white/20">
              {followersCount} followers · {followsCount} following
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Message Composer */}
          <div className="px-5 py-3 border-b border-white/10 space-y-2 flex-shrink-0">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={personalizeMode ? "hey {name} 💕 noticed u following me..." : "Type your message... or generate with AI"}
              className="min-h-[56px] max-h-[90px] text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none focus:border-purple-500/50"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={generateAIMessage} disabled={generatingAI} className="h-7 text-[10px] gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent">
                {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Generate Opener
              </Button>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/40">Personalize</span>
                <Switch checked={personalizeMode} onCheckedChange={setPersonalizeMode} className="scale-[0.65]" />
              </div>
              {personalizeMode && (
                <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/20 bg-amber-500/5">
                  Use {"{name}"} in message
                </Badge>
              )}
              {sending && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 animate-pulse">
                  ✏️ Edit message — applies in real-time
                </Badge>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-white/40">Auto-chat</span>
                <Switch checked={autoChat} onCheckedChange={setAutoChat} className="scale-[0.65]" />
                <Bot className={`h-3 w-3 ${autoChat ? "text-blue-400" : "text-white/20"}`} />
              </div>
            </div>
          </div>

          {/* Bulk Action Buttons */}
          <div className="px-5 py-2 border-b border-white/10 flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {sending ? (
                <Button size="sm" variant="destructive" onClick={cancelSend} className="h-7 text-[10px] gap-1">
                  <XCircle className="h-3 w-3" /> Cancel Send
                </Button>
              ) : (
                <>
                  <Button size="sm" disabled={selectedIds.size === 0 || !message.trim()} onClick={() => sendBulkMessages(selectedFollowers)} className="h-7 text-[10px] gap-1 bg-purple-600 hover:bg-purple-700">
                    <Send className="h-3 w-3" /> Send to Selected ({selectedIds.size})
                  </Button>
                  <Button size="sm" variant="outline" disabled={followers.length === 0 || !message.trim()} onClick={() => sendBulkMessages(followers)} className="h-7 text-[10px] gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10 bg-transparent">
                    <Users className="h-3 w-3" /> Send to All ({followers.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectRandom(10)} disabled={filteredFollowers.length === 0} className="h-7 text-[10px] gap-1 bg-transparent border-white/10 text-white/60 hover:bg-white/5">
                    <Shuffle className="h-3 w-3" /> Random 10
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectRandom(50)} disabled={filteredFollowers.length === 0} className="h-7 text-[10px] gap-1 bg-transparent border-white/10 text-white/60 hover:bg-white/5">
                    <Zap className="h-3 w-3" /> Random 50
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" onClick={selectAll} className="h-6 text-[10px] gap-1 text-white/50 hover:text-white hover:bg-white/5 px-2">
                {selectedIds.size === filteredFollowers.length && filteredFollowers.length > 0 ? (
                  <><Square className="h-2.5 w-2.5" /> Deselect All</>
                ) : (
                  <><CheckCheck className="h-2.5 w-2.5" /> Select All ({filteredFollowers.length})</>
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={invertSelection} className="h-6 text-[10px] gap-1 text-white/50 hover:text-white hover:bg-white/5 px-2">
                <ArrowUpDown className="h-2.5 w-2.5" /> Invert
              </Button>
              <Button size="sm" variant="ghost" disabled={loading} onClick={() => loadPersistedFollowers()} className="h-6 text-[10px] gap-1 text-white/50 hover:text-white hover:bg-white/5 px-2">
                <RefreshCw className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>

              {/* Delay control */}
              <div className="flex items-center gap-1 ml-auto">
                <Clock className="h-2.5 w-2.5 text-white/30" />
                <span className="text-[9px] text-white/30">Delay:</span>
                {[500, 1500, 3000, 5000].map(ms => (
                  <button
                    key={ms}
                    onClick={() => setDelayBetweenMs(ms)}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${delayBetweenMs === ms ? "bg-purple-500/20 text-purple-400" : "text-white/30 hover:text-white/60"}`}
                  >
                    {ms / 1000}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Send Progress */}
          {sendProgress && (
            <div className="px-5 py-2 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {sending ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-green-400" />}
                <span className={sending ? "text-blue-400" : "text-green-400"}>
                  {sending ? `Sending... ${sendProgress.sent}/${sendProgress.total}` : `Done: ${sendProgress.sent}/${sendProgress.total} sent`}
                </span>
                {sendProgress.failed > 0 && <span className="text-red-400 text-[10px]">({sendProgress.failed} failed)</span>}
                {cancelRef.current && sending && <span className="text-amber-400 text-[10px]">Cancelling...</span>}
              </div>
              <div className="mt-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Source Tabs */}
          <div className="px-5 py-2 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1 flex-wrap">
              {([
                { key: "all" as const, label: "All", icon: Users },
                { key: "conversations" as const, label: "Past Convos", icon: MessageCircle },
                { key: "followers" as const, label: "Engaged", icon: Heart },
                { key: "fetched" as const, label: "Fetched Followers", icon: Download },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    activeTab === tab.key 
                      ? "bg-purple-500/20 text-purple-400" 
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                  <span className="text-[8px] opacity-60">
                    ({followers.filter(f => 
                      tab.key === "all" ? true : 
                      tab.key === "conversations" ? (f.source === "conversation" || f.source === "ig_api") :
                      tab.key === "followers" ? (f.source === "follower" || f.source === "engaged") :
                      f.source === "fetched"
                    ).length})
                  </span>
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchRealFollowers} 
                  disabled={fetchingFollowers}
                  className="h-6 text-[9px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                >
                  {fetchingFollowers ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <UserPlus className="h-2.5 w-2.5" />}
                  Discover
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowFetchSetup(!showFetchSetup)} 
                  disabled={fetching}
                  className="h-6 text-[9px] gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 bg-transparent"
                >
                  {fetching ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />}
                  Fetch All Followers
                </Button>
              </div>
            </div>
          </div>

          {/* Fetch Setup Panel */}
          {showFetchSetup && (
            <div className="px-5 py-3 border-b border-orange-500/20 bg-orange-500/[0.03] flex-shrink-0 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-orange-400">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">Instagram Session Cookie Required</span>
              </div>
              <p className="text-[9px] text-white/40 leading-relaxed">
                Open <span className="text-white/70">instagram.com</span> → Right-click → Inspect → Application tab → Cookies → instagram.com → Copy <span className="text-orange-400 font-mono">sessionid</span>, <span className="text-orange-400 font-mono">ds_user_id</span>, and <span className="text-orange-400 font-mono">csrftoken</span> values.
              </p>
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    type={showSessionId ? "text" : "password"}
                    placeholder="sessionid (required)"
                    value={sessionId}
                    onChange={e => setSessionId(e.target.value)}
                    className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 pr-8 font-mono"
                  />
                  <button onClick={() => setShowSessionId(!showSessionId)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showSessionId ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="ds_user_id (optional)"
                    value={dsUserId}
                    onChange={e => setDsUserId(e.target.value)}
                    className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono"
                  />
                  <Input
                    placeholder="csrftoken (optional)"
                    value={csrfToken}
                    onChange={e => setCsrfToken(e.target.value)}
                    className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono"
                  />
                </div>
                <div className="flex gap-1.5 items-center">
                  <Input
                    type="number"
                    placeholder="Max followers (empty = ALL)"
                    value={maxFollowersInput}
                    onChange={e => setMaxFollowersInput(e.target.value)}
                    className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 w-[200px]"
                  />
                  <span className="text-[9px] text-white/30">Leave empty to fetch all {followersCount > 0 ? followersCount.toLocaleString() : ""} followers</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={fetchAllFollowers}
                  disabled={fetching || !sessionId.trim()}
                  className="h-7 text-[10px] gap-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {fetching ? "Fetching..." : maxFollowersInput ? `Fetch ${parseInt(maxFollowersInput).toLocaleString()} Followers` : "Fetch All Followers"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowFetchSetup(false)} className="h-7 text-[10px] text-white/40 hover:text-white/60">
                  Cancel
                </Button>
                {fetchProgress && (
                  <span className="text-[9px] text-white/40">{fetchProgress}</span>
                )}
              </div>
              <p className="text-[8px] text-white/25 leading-relaxed">
                ⚡ Anti-ban: Progressive delays between requests. Safe for large accounts. Followers are saved permanently — no need to fetch again.
              </p>
            </div>
          )}

          {/* Search + Filters */}
          <div className="px-5 py-2 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                />
              </div>
              {/* Sort */}
              <button onClick={() => setSortMode(sortMode === "name" ? "source" : "name")} className="text-[9px] text-white/40 hover:text-white/70 flex items-center gap-1 px-2 py-1 rounded bg-white/5">
                <ArrowUpDown className="h-2.5 w-2.5" />
                {sortMode === "name" ? "A-Z" : "Source"}
              </button>
            </div>
          </div>

          {/* Follower List — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-white/20" />
                <p className="text-xs text-white/40">Loading contacts...</p>
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-white/10" />
                <p className="text-xs text-white/40">
                  {followers.length === 0 ? "No contacts found — fetch your followers first" : "No matches"}
                </p>
                {followers.length === 0 && (
                  <Button size="sm" variant="outline" onClick={() => loadPersistedFollowers()} className="mt-3 text-xs h-7 bg-transparent border-white/10 text-white/60">
                    <RefreshCw className="h-3 w-3 mr-1" />Fetch Contacts
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredFollowers.map(f => {
                  const isSelected = selectedIds.has(f.id);
                  const sendResult = sendResults?.find(r => r.id === f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleSelect(f.id)}
                      className={`w-full text-left px-5 py-2 flex items-center gap-3 transition-colors hover:bg-white/[0.04] cursor-pointer ${isSelected ? "bg-purple-500/[0.08]" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(f.id)}
                        className="flex-shrink-0 border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                      />
                      {f.profile_pic ? (
                        <img src={f.profile_pic} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling && ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.removeProperty('display'); }} />
                      ) : null}
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0 ${f.profile_pic ? "hidden" : ""}`}>
                        <span className="text-white text-xs font-bold">{(f.name || f.username || "?")[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{f.name}</p>
                        <p className="text-[10px] text-white/35 truncate">@{f.username}</p>
                      </div>
                      <Badge variant="outline" className={`text-[8px] px-1.5 ${f.source === "fetched" ? "text-orange-400 border-orange-500/20" : f.source === "follower" || f.source === "engaged" ? "text-emerald-400 border-emerald-500/20" : "text-white/25 border-white/10"}`}>
                        {f.source === "conversation" ? "DM" : f.source === "fetched" ? "Fetched" : f.source === "engaged" ? "Engaged" : f.source === "follower" ? "Follower" : "IG"}
                      </Badge>
                      {sendResult && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${sendResult.success ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}
                        >
                          {sendResult.success ? "✓" : "✗"}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t border-white/10 bg-white/[0.02] text-[10px] text-white/40 flex items-center justify-between flex-shrink-0">
            <span>{followers.length} contacts · {selectedIds.size} selected · {filteredFollowers.length} shown</span>
            <div className="flex items-center gap-3">
              {autoChat && <span className="text-blue-400 flex items-center gap-1"><Bot className="h-3 w-3" />Auto-chat ON</span>}
              <span className="text-white/25">Delay: {delayBetweenMs / 1000}s</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMessageHub;

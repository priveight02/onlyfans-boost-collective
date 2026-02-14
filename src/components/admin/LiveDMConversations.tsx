import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, Bot, User, RefreshCw, Send, Loader2, Wifi,
  Download, Search, MoreVertical, Info,
  Check, CheckCheck, Clock, AlertCircle, Pencil, Trash2,
  Smile, Image as ImageIcon, Heart, ChevronLeft, Zap,
  Brain, Eye, Sparkles, ArrowRight, Shield, WifiOff,
  CircleDot, MessageSquare, Inbox,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LiveDMConversationsProps {
  accountId: string;
  autoRespondActive: boolean;
  onToggleAutoRespond: () => void;
}

interface Conversation {
  id: string;
  account_id: string;
  participant_id: string;
  participant_username: string | null;
  participant_name: string | null;
  participant_avatar_url: string | null;
  platform_conversation_id: string | null;
  status: string;
  ai_enabled: boolean;
  message_count: number | null;
  last_message_at: string | null;
  last_ai_reply_at: string | null;
  redirect_sent: boolean | null;
  folder: string;
  is_read: boolean;
  last_message_preview: string | null;
  metadata: any;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  status: string;
  platform_message_id: string | null;
  ai_model: string | null;
  typing_delay_ms: number | null;
  life_pause_ms: number | null;
  created_at: string;
  metadata: any;
}

interface AiLogEntry {
  convo: string;
  phase: string;
  time: string;
  status: "success" | "error" | "info" | "processing";
}

const AI_PHASES = [
  { id: "scan", icon: Download, label: "Scanning inbox" },
  { id: "detect", icon: Eye, label: "Detecting new messages" },
  { id: "analyze", icon: Brain, label: "Analyzing conversation" },
  { id: "generate", icon: Zap, label: "Generating reply" },
  { id: "typing", icon: Clock, label: "Simulating typing" },
  { id: "send", icon: Send, label: "Sending message" },
];

const LiveDMConversations = ({ accountId, autoRespondActive, onToggleAutoRespond }: LiveDMConversationsProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState("primary");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [initialScanDone, setInitialScanDone] = useState(false);
  const [aiCurrentPhase, setAiCurrentPhase] = useState<string>("");
  const [aiCurrentConvoId, setAiCurrentConvoId] = useState<string | null>(null);
  const [aiLog, setAiLog] = useState<AiLogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | "checking">("checking");
  const [connectionError, setConnectionError] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState<{ done: number; total: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ===== MESSAGE CACHE =====
  const messageCacheRef = useRef<Map<string, Message[]>>(new Map());
  const igSyncedRef = useRef<Set<string>>(new Set());
  const prefetchingRef = useRef(false);
  const igConnRef = useRef<{ platform_user_id: string; platform_username: string } | null>(null);

  const addLog = useCallback((convo: string, phase: string, status: AiLogEntry["status"] = "info") => {
    setAiLog(prev => [{ convo, phase, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), status }, ...prev].slice(0, 50));
  }, []);

  // Check Instagram connection
  const checkConnection = useCallback(async () => {
    if (!accountId) return;
    setConnectionStatus("checking");
    const { data } = await supabase
      .from("social_connections")
      .select("*")
      .eq("account_id", accountId)
      .eq("platform", "instagram")
      .eq("is_connected", true)
      .single();
    if (data?.access_token) {
      setConnectionStatus("connected");
      setConnectionError("");
      igConnRef.current = { platform_user_id: data.platform_user_id || "", platform_username: data.platform_username || "" };
    } else {
      setConnectionStatus("error");
      setConnectionError("Instagram not connected — connect in Social Hub settings");
    }
  }, [accountId]);

  // Load conversations from DB
  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from("ai_dm_conversations")
      .select("*")
      .eq("account_id", accountId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (data) setConversations(data as Conversation[]);
    return data as Conversation[] | null;
  }, [accountId]);

  // Load messages for a conversation into cache
  const loadMessagesToCache = useCallback(async (convoId: string): Promise<Message[]> => {
    const { data } = await supabase
      .from("ai_dm_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    const msgs = (data || []) as Message[];
    messageCacheRef.current.set(convoId, msgs);
    return msgs;
  }, []);

  // Load messages for selected conversation (instant from cache, then refresh)
  const loadMessages = useCallback(async (convoId: string) => {
    // Serve from cache instantly if available
    const cached = messageCacheRef.current.get(convoId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      // Refresh in background
      loadMessagesToCache(convoId).then(fresh => {
        if (selectedConvo === convoId) setMessages(fresh);
      });
      return;
    }
    // No cache — load with spinner
    setLoading(true);
    const msgs = await loadMessagesToCache(convoId);
    setMessages(msgs);
    setLoading(false);
  }, [loadMessagesToCache, selectedConvo]);

  // IG sync for a single conversation (imports/updates messages from IG API)
  const fetchIGMessages = useCallback(async (convoId: string, convo?: Conversation) => {
    const c = convo || conversations.find(cv => cv.id === convoId);
    if (!c?.platform_conversation_id) return;

    const conn = igConnRef.current;
    const ourUsername = conn?.platform_username?.toLowerCase() || "";
    const ourIgId = conn?.platform_user_id || "";

    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_conversation_messages", account_id: accountId, params: { conversation_id: c.platform_conversation_id, limit: 50 } },
      });
      if (error || !data?.success) return;
      const igMessages = data.data?.messages?.data || [];
      let changed = false;

      for (const igMsg of igMessages) {
        const { data: existing } = await supabase
          .from("ai_dm_messages")
          .select("id, content, metadata")
          .eq("platform_message_id", igMsg.id)
          .limit(1);

        const msgText = igMsg.message || igMsg.text || "";
        const rawAtt = igMsg.attachments?.data || igMsg.attachments;
        const hasAtt = rawAtt && (Array.isArray(rawAtt) ? rawAtt.length > 0 : true);
        const attData = hasAtt
          ? { attachments: Array.isArray(rawAtt) ? rawAtt : [rawAtt], sticker: igMsg.sticker || null, shares: igMsg.shares || null }
          : (igMsg.sticker ? { sticker: igMsg.sticker } : (igMsg.shares ? { shares: igMsg.shares } : null));

        let contentText = msgText;
        if (!contentText && hasAtt) {
          const attArr = Array.isArray(rawAtt) ? rawAtt : [rawAtt];
          const attType = attArr[0]?.mime_type || attArr[0]?.type || "";
          if (attType.includes("video")) contentText = "[video]";
          else if (attType.includes("image") || attType.includes("photo")) contentText = "[photo]";
          else if (attType.includes("audio")) contentText = "[audio]";
          else if (igMsg.sticker) contentText = "[sticker]";
          else if (igMsg.shares) contentText = "[shared post]";
          else contentText = "[attachment]";
        } else if (!contentText) {
          if (igMsg.sticker) contentText = "[sticker]";
          else if (igMsg.shares) contentText = "[shared post]";
        }

        if (existing && existing.length > 0) {
          const ex = existing[0];
          const updates: any = {};
          if (contentText && contentText !== ex.content) updates.content = contentText;
          if (attData && JSON.stringify(attData) !== JSON.stringify(ex.metadata)) updates.metadata = attData;
          if (igMsg.created_time || igMsg.timestamp) {
            updates.created_at = new Date(igMsg.created_time || igMsg.timestamp).toISOString();
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("ai_dm_messages").update(updates).eq("id", ex.id);
            changed = true;
          }
        } else {
          const fromName = (igMsg.from?.username || igMsg.from?.name || "").toLowerCase();
          const isFromFan = igMsg.from?.id
            ? (igMsg.from.id !== ourIgId && fromName !== ourUsername)
            : true;

          await supabase.from("ai_dm_messages").insert({
            conversation_id: convoId,
            account_id: accountId,
            platform_message_id: igMsg.id,
            sender_type: isFromFan ? "fan" : "manual",
            sender_name: isFromFan ? (c.participant_username || c.participant_name || "fan") : (ourUsername || "you"),
            content: contentText || "",
            status: "sent",
            created_at: igMsg.created_time || igMsg.timestamp ? new Date(igMsg.created_time || igMsg.timestamp).toISOString() : new Date().toISOString(),
            metadata: attData,
          });
          changed = true;
        }
      }

      if (changed) {
        const fresh = await loadMessagesToCache(convoId);
        if (selectedConvo === convoId) setMessages(fresh);
      }

      igSyncedRef.current.add(convoId);
    } catch (e) {
      console.error("fetchIGMessages error:", e);
    }
  }, [accountId, conversations, loadMessagesToCache, selectedConvo]);

  // ===== BACKGROUND PREFETCH ALL CONVERSATIONS =====
  const prefetchAllMessages = useCallback(async (convos: Conversation[]) => {
    if (prefetchingRef.current || convos.length === 0) return;
    prefetchingRef.current = true;

    // Phase 1: Load all DB messages in one batch query (very fast)
    const convoIds = convos.map(c => c.id);
    const batchSize = 500;
    let allMessages: Message[] = [];
    
    // Fetch all messages for all convos in batches
    for (let i = 0; i < convoIds.length; i += 20) {
      const batch = convoIds.slice(i, i + 20);
      const { data } = await supabase
        .from("ai_dm_messages")
        .select("*")
        .in("conversation_id", batch)
        .order("created_at", { ascending: true })
        .limit(batchSize);
      if (data) allMessages = allMessages.concat(data as Message[]);
    }

    // Group by conversation_id and populate cache
    const grouped = new Map<string, Message[]>();
    for (const msg of allMessages) {
      const arr = grouped.get(msg.conversation_id) || [];
      arr.push(msg);
      grouped.set(msg.conversation_id, arr);
    }
    for (const [cid, msgs] of grouped) {
      messageCacheRef.current.set(cid, msgs);
    }
    // Also set empty arrays for convos with no messages yet
    for (const c of convos) {
      if (!messageCacheRef.current.has(c.id)) {
        messageCacheRef.current.set(c.id, []);
      }
    }

    // Update current view if cached
    if (selectedConvo && messageCacheRef.current.has(selectedConvo)) {
      setMessages(messageCacheRef.current.get(selectedConvo) || []);
    }

    addLog("system", `Cached ${allMessages.length} messages from ${convos.length} convos`, "success");

    // Phase 2: Background IG sync for conversations with platform IDs (3 concurrent)
    const toSync = convos.filter(c => c.platform_conversation_id && !igSyncedRef.current.has(c.id));
    if (toSync.length > 0) {
      setPrefetchProgress({ done: 0, total: toSync.length });
      const concurrency = 3;
      let done = 0;

      const syncOne = async (c: Conversation) => {
        try {
          await fetchIGMessages(c.id, c);
        } catch {}
        done++;
        setPrefetchProgress({ done, total: toSync.length });
      };

      // Process in batches of `concurrency`
      for (let i = 0; i < toSync.length; i += concurrency) {
        const batch = toSync.slice(i, i + concurrency);
        await Promise.all(batch.map(syncOne));
      }

      setPrefetchProgress(null);
      addLog("system", `IG sync complete: ${toSync.length} convos`, "success");
    }

    prefetchingRef.current = false;
  }, [accountId, fetchIGMessages, addLog, selectedConvo]);

  // Scan ALL conversations from Instagram
  const scanAllConversations = useCallback(async (silent = false) => {
    if (!accountId) return;
    setScanning(true);
    addLog("system", "Starting inbox sync...", "processing");
    setAiCurrentPhase("scan");
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "scan_all_conversations", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (!data?.success && data?.error) {
        addLog("system", `Sync issue: ${data.error}`, "error");
        if (!silent) toast.error(data.error);
      } else {
        const r = data?.data;
        const imported = r?.imported || 0;
        const found = r?.total_found || 0;
        addLog("system", `Synced ${imported} conversations (${found} found)`, imported > 0 ? "success" : "info");
        if (!silent) {
          if (imported > 0) toast.success(`Synced ${imported} conversations`);
          else if (found === 0) toast.info("Inbox empty — no conversations found via API. Check token permissions.");
          else toast.success(`${found} conversations already up to date`);
        }
      }
      const freshConvos = await loadConversations();
      // Trigger background prefetch after scan
      if (freshConvos && freshConvos.length > 0) {
        prefetchAllMessages(freshConvos);
      }
    } catch (e: any) {
      addLog("system", `Sync error: ${e.message}`, "error");
      if (!silent) toast.error(e.message || "Failed to scan");
    } finally {
      setScanning(false);
      setInitialScanDone(true);
      setAiCurrentPhase("");
    }
  }, [accountId, loadConversations, addLog, prefetchAllMessages]);

  // Initial load
  useEffect(() => {
    if (accountId) {
      checkConnection();
      loadConversations().then(convos => {
        if (convos && convos.length > 0) prefetchAllMessages(convos);
      });
      if (!initialScanDone) scanAllConversations(true);
    }
  }, [accountId]);

  // Load messages when convo selected — instant from cache
  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo);
      // If not yet synced from IG, do it now
      if (!igSyncedRef.current.has(selectedConvo)) {
        fetchIGMessages(selectedConvo);
      }
      supabase.from("ai_dm_conversations").update({ is_read: true }).eq("id", selectedConvo).then();
    }
  }, [selectedConvo, loadMessages, fetchIGMessages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!accountId) return;
    const ch1 = supabase
      .channel(`dm-convos-${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_dm_conversations", filter: `account_id=eq.${accountId}` }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, [accountId, loadConversations]);

  useEffect(() => {
    if (!selectedConvo) return;
    const ch2 = supabase
      .channel(`dm-msgs-${selectedConvo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_dm_messages", filter: `conversation_id=eq.${selectedConvo}` }, () => loadMessages(selectedConvo))
      .subscribe();
    return () => { supabase.removeChannel(ch2); };
  }, [selectedConvo, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Process DMs with AI tracking
  const processDMs = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    
    const phases = ["scan", "detect", "analyze", "generate", "typing", "send"];
    
    addLog("system", "Starting AI processing cycle", "processing");
    
    for (const phase of phases.slice(0, 2)) {
      setAiCurrentPhase(phase);
      await new Promise(r => setTimeout(r, 300));
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "process_live_dm", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (!data?.success && data?.error) {
        addLog("system", data.error, "error");
      } else {
        const r = data?.data;
        if (r?.conversations?.length > 0) {
          for (const c of r.conversations) {
            setAiCurrentConvoId(c.conversation_id);
            for (const phase of phases.slice(2)) {
              setAiCurrentPhase(phase);
              await new Promise(r => setTimeout(r, 200));
            }
            addLog(`@${c.fan}`, `Replied: "${c.ai_reply?.substring(0, 60)}..."`, "success");
          }
          toast.success(`AI replied to ${r.processed} conversations`);
        } else {
          addLog("system", `Checked ${r?.total_checked || 0} conversations — no new messages`, "info");
        }
      }
      await loadConversations();
      if (selectedConvo) await loadMessages(selectedConvo);
    } catch (e: any) {
      addLog("system", `Error: ${e.message}`, "error");
    } finally {
      setProcessing(false);
      setAiCurrentPhase("");
      setAiCurrentConvoId(null);
    }
  }, [accountId, processing, loadConversations, selectedConvo, loadMessages, addLog]);

  // Auto-polling
  useEffect(() => {
    if (autoRespondActive && accountId) {
      setPolling(true);
      pollIntervalRef.current = setInterval(() => processDMs(), 30000);
      processDMs();
    } else {
      setPolling(false);
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [autoRespondActive, accountId]);

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConvo || sendingMessage) return;
    const convo = conversations.find(c => c.id === selectedConvo);
    if (!convo) return;
    const text = messageInput;
    setMessageInput("");
    setSendingMessage(true);

    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "send_message", account_id: accountId, params: { recipient_id: convo.participant_id, message: text } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Send failed");

      await supabase.from("ai_dm_messages").insert({
        conversation_id: selectedConvo,
        account_id: accountId,
        sender_type: "manual",
        sender_name: "you",
        content: text,
        status: "sent",
        platform_message_id: data?.data?.message_id || null,
      });

      await supabase.from("ai_dm_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `You: ${text.substring(0, 80)}`,
        is_read: true,
      }).eq("id", selectedConvo);
      
      addLog(`@${convo.participant_username}`, `Sent: "${text.substring(0, 50)}"`, "success");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
      setMessageInput(text);
      addLog("system", `Send failed: ${e.message}`, "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Edit message (local only)
  const saveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    await supabase.from("ai_dm_messages").update({ content: editText }).eq("id", msgId);
    setEditingMsgId(null);
    setEditText("");
    if (selectedConvo) loadMessages(selectedConvo);
  };

  // Delete message (local only)
  const deleteMessage = async (msgId: string) => {
    await supabase.from("ai_dm_messages").delete().eq("id", msgId);
    if (selectedConvo) loadMessages(selectedConvo);
    toast.success("Message deleted");
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const folderMatch = c.folder === activeFolder;
    const searchMatch = !searchQuery ||
      (c.participant_username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.participant_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message_preview || "").toLowerCase().includes(searchQuery.toLowerCase());
    return folderMatch && searchMatch;
  });

  const folderCounts = {
    primary: conversations.filter(c => c.folder === "primary").length,
    general: conversations.filter(c => c.folder === "general").length,
    requests: conversations.filter(c => c.folder === "requests").length,
  };
  const unreadCounts = {
    primary: conversations.filter(c => c.folder === "primary" && !c.is_read).length,
    general: conversations.filter(c => c.folder === "general" && !c.is_read).length,
    requests: conversations.filter(c => c.folder === "requests" && !c.is_read).length,
  };

  const selectedConvoData = conversations.find(c => c.id === selectedConvo);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "1d";
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[600px] bg-background rounded-lg border border-border overflow-hidden">
      {/* LEFT PANEL - Conversation List */}
      <div className={`w-[340px] min-w-[340px] border-r border-border flex flex-col ${selectedConvo ? "hidden lg:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Messages</h2>
              {connectionStatus === "connected" && (
                <div className="h-2 w-2 rounded-full bg-green-500" title="Instagram connected" />
              )}
              {connectionStatus === "error" && (
                <div className="h-2 w-2 rounded-full bg-red-500" title={connectionError} />
              )}
              {polling && (
                <Badge variant="outline" className="text-green-400 border-green-500/30 text-[9px] animate-pulse px-1.5 py-0">
                  <Wifi className="h-2.5 w-2.5 mr-0.5" />LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <Button size="sm" variant="ghost" onClick={() => scanAllConversations(false)} disabled={scanning} className="h-7 w-7 p-0" title="Sync Instagram inbox">
                <Download className={`h-3.5 w-3.5 ${scanning ? "animate-bounce" : ""}`} />
              </Button>
              <Button size="sm" variant="ghost" onClick={processDMs} disabled={processing} className="h-7 w-7 p-0" title="Run AI processing">
                <Brain className={`h-3.5 w-3.5 ${processing ? "animate-pulse text-blue-400" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Folder Tabs */}
          <Tabs value={activeFolder} onValueChange={setActiveFolder}>
            <TabsList className="w-full bg-muted/30 h-8">
              <TabsTrigger value="primary" className="flex-1 text-xs h-7 data-[state=active]:bg-background gap-1">
                <Inbox className="h-3 w-3" />
                Primary
                {unreadCounts.primary > 0 && (
                  <span className="bg-blue-500 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCounts.primary}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1 text-xs h-7 data-[state=active]:bg-background gap-1">
                <MessageSquare className="h-3 w-3" />
                General
                {unreadCounts.general > 0 && (
                  <span className="bg-muted-foreground/50 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCounts.general}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 text-xs h-7 data-[state=active]:bg-background gap-1">
                <Shield className="h-3 w-3" />
                Requests
                {unreadCounts.requests > 0 && (
                  <span className="bg-orange-500 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCounts.requests}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-0 rounded-lg"
            />
          </div>

          {/* Background prefetch progress */}
          {prefetchProgress && (
            <div className="px-4 py-1.5 border-b border-border">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Caching messages {prefetchProgress.done}/{prefetchProgress.total}</span>
              </div>
              <div className="mt-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/60 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((prefetchProgress.done / prefetchProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {scanning && !initialScanDone ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-xs font-medium">Syncing Instagram inbox...</p>
              <p className="text-[10px] mt-1 opacity-60">Fetching all folders & messages</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-15" />
              {conversations.length === 0 ? (
                <>
                  <p className="text-xs font-medium mb-1">No conversations yet</p>
                  <p className="text-[10px] opacity-60 mb-3">
                    {connectionStatus === "error" 
                      ? "Connect Instagram in Social Hub settings first"
                      : "Click sync to import from Instagram"
                    }
                  </p>
                  {connectionStatus === "connected" && (
                    <Button size="sm" variant="outline" onClick={() => scanAllConversations(false)} disabled={scanning} className="text-[10px] h-7">
                      <Download className="h-3 w-3 mr-1" />Sync Now
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-medium">No conversations in {activeFolder}</p>
                  <p className="text-[10px] mt-1 opacity-60">{folderCounts.primary + folderCounts.general + folderCounts.requests} total across all folders</p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/30 border-b border-border/30 ${
                  selectedConvo === convo.id ? "bg-muted/50" : ""
                } ${!convo.is_read ? "bg-blue-500/5" : ""}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {convo.participant_avatar_url ? (
                    <img src={convo.participant_avatar_url} alt="" className="h-13 w-13 rounded-full object-cover ring-2 ring-transparent" style={{ width: 52, height: 52 }} />
                  ) : (
                    <div className="rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center" style={{ width: 52, height: 52 }}>
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {/* Online / AI indicator */}
                  {convo.ai_enabled && autoRespondActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center" style={{ width: 18, height: 18 }}>
                      <Bot className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {aiCurrentConvoId === convo.id && (
                    <div className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${!convo.is_read ? "font-bold text-foreground" : "font-normal text-foreground/80"}`}>
                      {convo.participant_name || convo.participant_username || "Unknown"}
                    </span>
                    <span className={`text-[10px] flex-shrink-0 ml-2 ${!convo.is_read ? "text-blue-400 font-medium" : "text-muted-foreground"}`}>
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate max-w-[200px] ${!convo.is_read ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                      {convo.last_message_preview || `${convo.message_count || 0} messages`}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      {convo.redirect_sent && <ArrowRight className="h-2.5 w-2.5 text-green-400" />}
                      {!convo.is_read && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>

        {/* Bottom Status Bar */}
        <div className="px-3 py-2 border-t border-border bg-muted/10 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{conversations.length} conversations</span>
          {scanning && <span className="text-blue-400 animate-pulse">Syncing...</span>}
          {processing && <span className="text-blue-400 animate-pulse">AI processing...</span>}
        </div>
      </div>

      {/* MIDDLE PANEL - Chat Messages */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedConvo ? "hidden lg:flex" : "flex"}`}>
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center bg-muted/5">
            <div className="text-center">
              <div className="h-24 w-24 mx-auto mb-4 rounded-full border-2 border-foreground/10 flex items-center justify-center">
                <Send className="h-10 w-10 text-foreground/15 -rotate-45" />
              </div>
              <h3 className="text-xl font-light text-foreground mb-1">Your messages</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a conversation to start chatting</p>
              <div className="flex gap-2 justify-center">
                <Button variant="default" size="sm" className="rounded-lg" onClick={() => scanAllConversations(false)} disabled={scanning}>
                  <Download className="h-4 w-4 mr-2" />{scanning ? "Syncing..." : "Sync Inbox"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 lg:hidden" onClick={() => setSelectedConvo(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {selectedConvoData?.participant_avatar_url ? (
                  <img src={selectedConvoData.participant_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{selectedConvoData?.participant_name || selectedConvoData?.participant_username}</p>
                    {selectedConvoData?.ai_enabled && autoRespondActive && (
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] px-1.5 py-0">
                        <Bot className="h-2.5 w-2.5 mr-0.5" />AI
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    @{selectedConvoData?.participant_username} · {selectedConvoData?.folder}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedConvoData?.redirect_sent && (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[9px]">
                    <Check className="h-2.5 w-2.5 mr-0.5" />Redirected
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem onClick={() => {
                      const newFolder = selectedConvoData?.folder === "primary" ? "general" : "primary";
                      supabase.from("ai_dm_conversations").update({ folder: newFolder }).eq("id", selectedConvo!).then(() => {
                        loadConversations();
                        toast.success(`Moved to ${newFolder}`);
                      });
                    }}>
                      Move to {selectedConvoData?.folder === "primary" ? "General" : "Primary"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      supabase.from("ai_dm_conversations").update({ folder: "requests" }).eq("id", selectedConvo!).then(() => {
                        loadConversations();
                        toast.success("Moved to Requests");
                      });
                    }}>Move to Requests</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const newAi = !selectedConvoData?.ai_enabled;
                      supabase.from("ai_dm_conversations").update({ ai_enabled: newAi }).eq("id", selectedConvo!).then(() => {
                        loadConversations();
                        toast.success(newAi ? "AI enabled" : "AI disabled — manual mode");
                      });
                    }}>
                      {selectedConvoData?.ai_enabled ? "⏸ Disable AI" : "▶ Enable AI"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      supabase.from("ai_dm_conversations").update({ redirect_sent: !selectedConvoData?.redirect_sent }).eq("id", selectedConvo!).then(() => {
                        loadConversations();
                      });
                    }}>
                      {selectedConvoData?.redirect_sent ? "Clear redirect flag" : "Mark as redirected"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 py-3">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No messages loaded yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_type !== "fan";
                    const showTime = idx === 0 ||
                      (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 3600000);

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <p className="text-center text-[10px] text-muted-foreground/60 my-4 font-medium">
                            {new Date(msg.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        <div className={`flex items-end gap-1.5 group mb-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                          {/* Fan avatar */}
                          {!isMe && (
                            <div className="flex-shrink-0 mb-1">
                              {selectedConvoData?.participant_avatar_url ? (
                                <img src={selectedConvoData.participant_avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                  <User className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`relative max-w-[65%]`}>
                            {msg.status === "typing" ? (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                  <span className="text-[10px] text-blue-400 ml-1.5">typing...</span>
                                </div>
                              </div>
                            ) : editingMsgId === msg.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") saveEdit(msg.id); if (e.key === "Escape") { setEditingMsgId(null); setEditText(""); } }}
                                  className="text-xs h-8"
                                  autoFocus
                                />
                                <Button size="sm" className="h-8 px-2" onClick={() => saveEdit(msg.id)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className={`rounded-2xl px-3.5 py-2 ${
                                  isMe
                                    ? msg.sender_type === "ai"
                                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                      : "bg-primary text-primary-foreground"
                                    : "bg-muted/60 text-foreground"
                                }`}>
                                  {(() => {
                                    const attachments = msg.metadata?.attachments;
                                    const hasMedia = Array.isArray(attachments) && attachments.length > 0;
                                    const stickerData = msg.metadata?.sticker;
                                    const sharesData = msg.metadata?.shares;
                                    
                                    if (hasMedia) {
                                      return (
                                        <div>
                                          {attachments.map((att: any, i: number) => {
                                            const url = att.file_url || att.image_data?.url || att.video_data?.url || att.url;
                                            const mimeType = att.mime_type || att.type || "";
                                            if (!url) return null;
                                            if (mimeType.includes("video") || att.video_data) {
                                              return <video key={i} src={url} controls className="max-w-full rounded-lg max-h-48 mb-1" />;
                                            }
                                            if (mimeType.includes("audio")) {
                                              return <audio key={i} src={url} controls className="max-w-full mb-1" />;
                                            }
                                            return <img key={i} src={url} alt="" className="max-w-full rounded-lg max-h-48 mb-1 cursor-pointer" onClick={() => window.open(url, '_blank')} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
                                          })}
                                          {msg.content && !msg.content.startsWith("[") && (
                                            <p className="text-[13px] leading-relaxed mt-1 whitespace-pre-wrap">{msg.content}</p>
                                          )}
                                        </div>
                                      );
                                    }
                                    if (stickerData) {
                                      const stickerUrl = stickerData.url || stickerData.image?.url;
                                      return stickerUrl ? (
                                        <img src={stickerUrl} alt="sticker" className="max-w-[120px] max-h-[120px]" />
                                      ) : (
                                        <span className="text-[13px] italic opacity-70">🏷️ Sticker</span>
                                      );
                                    }
                                    if (sharesData) {
                                      const shareLink = sharesData.link || sharesData[0]?.link;
                                      return (
                                        <div>
                                          <a href={shareLink} target="_blank" rel="noopener noreferrer" className="text-[13px] underline opacity-80 hover:opacity-100">
                                            📎 Shared post
                                          </a>
                                          {msg.content && !msg.content.startsWith("[") && (
                                            <p className="text-[13px] leading-relaxed mt-1 whitespace-pre-wrap">{msg.content}</p>
                                          )}
                                        </div>
                                      );
                                    }
                                    // Regular text message
                                    if (msg.content && msg.content.startsWith("[") && msg.content.endsWith("]")) {
                                      // Tagged content like [photo], [video], [sticker] etc
                                      const tag = msg.content.slice(1, -1);
                                      const icons: Record<string, string> = { photo: "📷", video: "🎥", audio: "🎵", sticker: "🏷️", "shared post": "📎", attachment: "📎", media: "📷" };
                                      return (
                                        <div className="flex items-center gap-1.5 opacity-70">
                                          <span>{icons[tag] || "📎"}</span>
                                          <span className="text-[13px] italic capitalize">{tag}</span>
                                        </div>
                                      );
                                    }
                                    return <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
                                  })()}
                                </div>

                                {/* Message meta */}
                                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                                  {isMe && msg.sender_type === "ai" && (
                                    <Bot className="h-2.5 w-2.5 text-blue-400" />
                                  )}
                                  {isMe && msg.status === "sent" && <CheckCheck className="h-2.5 w-2.5 text-blue-400" />}
                                  {isMe && msg.status === "failed" && (
                                    <span className="flex items-center gap-0.5 text-red-400">
                                      <AlertCircle className="h-2.5 w-2.5" />
                                      <span className="text-[9px]">Failed</span>
                                    </span>
                                  )}
                                  <span className="text-[9px] text-muted-foreground/60">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>

                                {/* Hover actions */}
                                {isMe && (
                                  <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-50 hover:opacity-100" onClick={() => { setEditingMsgId(msg.id); setEditText(msg.content); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-50 hover:opacity-100 text-red-400" onClick={() => deleteMessage(msg.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {!isMe && (
                                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden group-hover:flex">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-50 hover:opacity-100">
                                      <Heart className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 border border-border/50">
                <Smile className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground flex-shrink-0" />
                <Input
                  ref={inputRef}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Message..."
                  className="border-0 bg-transparent h-8 text-sm focus-visible:ring-0 px-0"
                />
                {messageInput.trim() ? (
                  <Button size="sm" variant="ghost" onClick={sendMessage} disabled={sendingMessage} className="h-7 px-3 text-blue-400 hover:text-blue-300 font-semibold text-sm">
                    {sendingMessage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground" />
                    <Heart className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL - AI Automation Tracker */}
      {autoRespondActive && (
        <div className="w-[260px] min-w-[260px] border-l border-border flex-col bg-muted/5 hidden xl:flex">
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-foreground">AI Automation</span>
              <Badge variant="outline" className="text-green-400 border-green-500/30 text-[9px] ml-auto animate-pulse">Active</Badge>
            </div>
          </div>

          {/* Current Phase */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Pipeline</p>
            <div className="space-y-1">
              {AI_PHASES.map((step) => {
                const isActive = processing && aiCurrentPhase === step.id;
                const isPast = processing && AI_PHASES.findIndex(p => p.id === aiCurrentPhase) > AI_PHASES.findIndex(p => p.id === step.id);
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    {isPast ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : isActive ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    ) : (
                      <CircleDot className={`h-3 w-3 ${processing ? "text-muted-foreground/30" : "text-muted-foreground/20"}`} />
                    )}
                    <span className={`text-[10px] ${
                      isActive ? "text-blue-400 font-semibold" :
                      isPast ? "text-green-400/70" :
                      "text-muted-foreground/40"
                    }`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            {!processing && (
              <div className="flex items-center gap-2 mt-2 text-muted-foreground/50">
                <Clock className="h-3 w-3" />
                <span className="text-[10px]">Next scan in 30s</span>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <ScrollArea className="flex-1">
            <div className="px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity Log</p>
              {aiLog.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/40 italic">Waiting for first cycle...</p>
              ) : (
                <div className="space-y-1.5">
                  {aiLog.slice(0, 30).map((log, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1 flex-shrink-0 ${
                        log.status === "success" ? "bg-green-400" :
                        log.status === "error" ? "bg-red-400" :
                        log.status === "processing" ? "bg-blue-400 animate-pulse" :
                        "bg-muted-foreground/30"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-foreground/70 font-medium truncate">{log.convo}</span>
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

          {/* Stats */}
          <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-muted-foreground/50">Total Convos</p>
                <p className="text-sm font-bold text-foreground">{conversations.length}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground/50">AI Enabled</p>
                <p className="text-sm font-bold text-blue-400">{conversations.filter(c => c.ai_enabled).length}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground/50">Unread</p>
                <p className="text-sm font-bold text-orange-400">{conversations.filter(c => !c.is_read).length}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground/50">Redirected</p>
                <p className="text-sm font-bold text-green-400">{conversations.filter(c => c.redirect_sent).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDMConversations;

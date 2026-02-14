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
  CircleDot, MessageSquare, Inbox, SendHorizonal, Lock, Unlock,
  Play, Pause, Plus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BulkMessageHub from "./BulkMessageHub";
import PersonaCreatorDialog from "./PersonaCreatorDialog";

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
  const [bulkHubOpen, setBulkHubOpen] = useState(false);
  const [personaCreatorOpen, setPersonaCreatorOpen] = useState(false);
  const [followAI, setFollowAI] = useState(false);
  const [lockChatView, setLockChatView] = useState(false);
  const [uiScale, setUiScale] = useState(() => {
    try { return parseFloat(localStorage.getItem("dm_ui_scale") || "1"); } catch { return 1; }
  });
  const [msgSize, setMsgSize] = useState(() => {
    try { return parseFloat(localStorage.getItem("dm_msg_size") || "13"); } catch { return 13; }
  });
  const [relaunching, setRelaunching] = useState(false);
  const [relaunchingConvoId, setRelaunchingConvoId] = useState<string | null>(null);
  const followAIRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ===== MESSAGE CACHE =====
  const messageCacheRef = useRef<Map<string, Message[]>>(new Map());
  const igSyncedRef = useRef<Set<string>>(new Set());
  // Persist deleted IG message IDs in localStorage so they survive page refreshes
  const deletedPlatformIdsRef = useRef<Set<string>>(new Set<string>());
  
  // Load persisted deleted IDs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`deleted_ig_msgs_${accountId}`);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        ids.forEach(id => deletedPlatformIdsRef.current.add(id));
      }
    } catch {}
  }, [accountId]);
  
  const persistDeletedIds = useCallback(() => {
    try {
      const arr = Array.from(deletedPlatformIdsRef.current).slice(-500); // Keep last 500
      localStorage.setItem(`deleted_ig_msgs_${accountId}`, JSON.stringify(arr));
    } catch {}
  }, [accountId]);
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

  // Load conversations from DB — MERGE instead of replace to avoid re-renders
  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from("ai_dm_conversations")
      .select("*")
      .eq("account_id", accountId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (data) {
      setConversations(prev => {
        // If first load or structure changed significantly, replace
        if (prev.length === 0) return data as Conversation[];
        // Smart merge: keep references for unchanged items, add new ones at top
        const newMap = new Map(data.map((c: any) => [c.id, c as Conversation]));
        const merged: Conversation[] = [];
        // First add items in new order
        for (const d of data) {
          const existing = prev.find(p => p.id === d.id);
          // Only create new reference if data actually changed
          if (existing && JSON.stringify(existing) === JSON.stringify(d)) {
            merged.push(existing);
          } else {
            merged.push(d as Conversation);
          }
        }
        return merged;
      });
    }
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
      // Refresh in background without blocking — use functional state check to avoid stale closure
      loadMessagesToCache(convoId).then(fresh => {
        setSelectedConvo(prev => {
          if (prev === convoId) setMessages(fresh);
          return prev;
        });
      });
      return;
    }
    // No cache — load with spinner
    setLoading(true);
    const msgs = await loadMessagesToCache(convoId);
    setMessages(msgs);
    setLoading(false);
  }, [loadMessagesToCache]);

  // IG sync for a single conversation (imports/updates messages from IG API + detects deleted msgs)
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

      // Build set of IG message IDs that still exist on Instagram
      const igMessageIds = new Set(igMessages.map((m: any) => m.id).filter(Boolean));

      // REAL-TIME DELETION SYNC: Find DB messages with platform_message_id that no longer exist on IG
      const cached = messageCacheRef.current.get(convoId) || [];
      const dbMsgsWithPlatformId = cached.filter(m => m.platform_message_id && !m.id.startsWith("temp-"));
      for (const dbMsg of dbMsgsWithPlatformId) {
        if (dbMsg.platform_message_id && !igMessageIds.has(dbMsg.platform_message_id) && !deletedPlatformIdsRef.current.has(dbMsg.platform_message_id)) {
          // Message was deleted on Instagram — remove from DB
          await supabase.from("ai_dm_messages").delete().eq("id", dbMsg.id);
          deletedPlatformIdsRef.current.add(dbMsg.platform_message_id);
          persistDeletedIds();
          changed = true;
          addLog(`@${c.participant_username}`, `Message removed (deleted on IG)`, "info");
        }
      }

      for (const igMsg of igMessages) {
        // Skip messages that were locally deleted
        if (igMsg.id && deletedPlatformIdsRef.current.has(igMsg.id)) continue;
        
        const { data: existing } = await supabase
          .from("ai_dm_messages")
          .select("id, content, metadata")
          .eq("platform_message_id", igMsg.id)
          .limit(1);

        const msgText = igMsg.message || igMsg.text || "";
        const rawAtt = igMsg.attachments?.data || igMsg.attachments;
        const hasAtt = rawAtt && (Array.isArray(rawAtt) ? rawAtt.length > 0 : true);
        const attData = hasAtt
          ? { attachments: Array.isArray(rawAtt) ? rawAtt : [rawAtt], sticker: igMsg.sticker || null, shares: igMsg.shares || null, story: igMsg.story || null }
          : (igMsg.sticker ? { sticker: igMsg.sticker } : (igMsg.shares ? { shares: igMsg.shares } : (igMsg.story ? { story: igMsg.story } : null)));
        let contentText = msgText;
        if (!contentText && hasAtt) {
          const attArr = Array.isArray(rawAtt) ? rawAtt : [rawAtt];
          const attType = attArr[0]?.mime_type || attArr[0]?.type || "";
          if (attType.includes("video")) contentText = "[video]";
          else if (attType.includes("image") || attType.includes("photo")) contentText = "[photo]";
          else if (attType.includes("audio")) contentText = "[audio]";
          else if (igMsg.sticker) contentText = "[sticker]";
          else if (igMsg.shares) contentText = "[shared post]";
          else if (igMsg.story) contentText = "[story reply]";
          else contentText = "[attachment]";
        } else if (!contentText) {
          if (igMsg.sticker) contentText = "[sticker]";
          else if (igMsg.shares) contentText = "[shared post]";
          else if (igMsg.story) contentText = "[story reply]";
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
          const fromId = igMsg.from?.id;
          const isFromFan = fromId
            ? (fromId === c.participant_id || (fromId !== ourIgId && fromName !== ourUsername && fromName !== ""))
            : true;
          const isActuallyFromFan = fromId === c.participant_id ? true : 
            (fromId === ourIgId || fromName === ourUsername) ? false :
            (fromId && fromId !== c.participant_id && fromId !== ourIgId) ? false :
            isFromFan;

          await supabase.from("ai_dm_messages").insert({
            conversation_id: convoId,
            account_id: accountId,
            platform_message_id: igMsg.id,
            sender_type: isActuallyFromFan ? "fan" : "manual",
            sender_name: isActuallyFromFan ? (c.participant_username || c.participant_name || "fan") : (ourUsername || "you"),
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
        setSelectedConvo(prev => {
          if (prev === convoId) setMessages(fresh);
          return prev;
        });
      }

      // ALWAYS update conversation preview & timestamp from latest cached message
      const allMsgs = messageCacheRef.current.get(convoId) || [];
      if (allMsgs.length > 0) {
        const latestMsg = allMsgs[allMsgs.length - 1];
        const isFromMe = latestMsg.sender_type !== "fan";
        const previewText = isFromMe
          ? `You: ${latestMsg.content?.substring(0, 80) || "[media]"}`
          : latestMsg.content?.substring(0, 80) || "[media]";
        const latestTime = latestMsg.created_at;
        
        // Update DB (non-blocking)
        supabase.from("ai_dm_conversations").update({
          last_message_preview: previewText,
          last_message_at: latestTime,
          message_count: allMsgs.length,
        }).eq("id", convoId).then();
        
        // Update local state immediately for instant UI refresh
        setConversations(prev => {
          const idx = prev.findIndex(cv => cv.id === convoId);
          if (idx === -1) return prev;
          const updated = { ...prev[idx], last_message_preview: previewText, last_message_at: latestTime, message_count: allMsgs.length };
          const next = [...prev];
          next[idx] = updated;
          // Re-sort by last_message_at (most recent first)
          next.sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          });
          return next;
        });
      }

      igSyncedRef.current.add(convoId);
    } catch (e) {
      console.error("fetchIGMessages error:", e);
    }
  }, [accountId, conversations, loadMessagesToCache, addLog, persistDeletedIds]);

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

    // Update current view if cached — use functional check to avoid stale closure
    setSelectedConvo(prev => {
      if (prev && messageCacheRef.current.has(prev)) {
        setMessages(messageCacheRef.current.get(prev) || []);
      }
      return prev;
    });

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
  }, [accountId, fetchIGMessages, addLog]);

  // ===== FETCH PROFILE PICTURES FOR CONVERSATIONS =====
  const fetchAvatars = useCallback(async (convos: Conversation[]) => {
    // Find conversations missing avatars
    const needAvatars = convos.filter(c => !c.participant_avatar_url && c.participant_id);
    if (needAvatars.length === 0) return;

    addLog("system", `Fetching ${needAvatars.length} profile pictures...`, "processing");

    // Strategy 1: Use business_discovery (most reliable for public IG accounts)
    // This works with usernames, not IGSIDs
    const updates: { id: string; avatar_url: string; name?: string; username?: string }[] = [];
    
    // Process in batches of 3 to avoid rate limits
    for (let i = 0; i < needAvatars.length; i += 3) {
      const batch = needAvatars.slice(i, i + 3);
      await Promise.all(batch.map(async (c) => {
        const username = c.participant_username;
        if (!username || username === c.participant_id) return; // Skip if no username
        
        try {
          // Use discover_user which uses business_discovery API - most reliable for profile pics
          const { data, error } = await supabase.functions.invoke("instagram-api", {
            body: { action: "discover_user", account_id: accountId, params: { username, media_limit: 0 } },
          });
          if (!error && data?.success) {
            const bd = data.data?.business_discovery;
            if (bd?.profile_picture_url) {
              updates.push({
                id: c.id,
                avatar_url: bd.profile_picture_url,
                name: bd.name || c.participant_name,
                username: bd.username || c.participant_username,
              });
            }
          }
        } catch (e) {
          // Not all users are discoverable - that's fine
        }
      }));
    }

    // Strategy 2: For remaining ones without avatars, try the batch IGSID fetch
    const stillMissing = needAvatars.filter(c => !updates.find(u => u.id === c.id));
    if (stillMissing.length > 0) {
      const userIds = stillMissing.map(c => c.participant_id);
      const usernames: Record<string, string> = {};
      for (const c of stillMissing) {
        if (c.participant_username) usernames[c.participant_id] = c.participant_username;
      }
      try {
        const { data, error } = await supabase.functions.invoke("instagram-api", {
          body: { action: "fetch_participant_profiles", account_id: accountId, params: { user_ids: userIds, usernames } },
        });
        if (!error && data?.success) {
          const profiles = data.data?.profiles || {};
          for (const c of stillMissing) {
            const profile = profiles[c.participant_id];
            if (profile?.profile_pic) {
              updates.push({ id: c.id, avatar_url: profile.profile_pic, name: profile.name, username: profile.username });
            }
          }
        }
      } catch {}
    }

    // Batch update DB and local state
    for (const u of updates) {
      const updateData: any = { participant_avatar_url: u.avatar_url };
      if (u.name) updateData.participant_name = u.name;
      if (u.username) updateData.participant_username = u.username;
      supabase.from("ai_dm_conversations").update(updateData).eq("id", u.id).then();
    }

    if (updates.length > 0) {
      setConversations(prev => prev.map(c => {
        const upd = updates.find(u => u.id === c.id);
        if (!upd) return c;
        return { ...c, participant_avatar_url: upd.avatar_url, participant_name: upd.name || c.participant_name, participant_username: upd.username || c.participant_username };
      }));
      addLog("system", `Fetched ${updates.length}/${needAvatars.length} profile pictures`, "success");
    } else {
      addLog("system", `Profile pics: 0/${needAvatars.length} found (private/restricted accounts)`, "info");
    }
  }, [accountId, addLog]);

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
      // Trigger background prefetch + avatar fetch after scan
      if (freshConvos && freshConvos.length > 0) {
        prefetchAllMessages(freshConvos);
        fetchAvatars(freshConvos);
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
        if (convos && convos.length > 0) {
          prefetchAllMessages(convos);
          fetchAvatars(convos);
        }
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
      // Mark as read + track last viewed
      supabase.from("ai_dm_conversations").update({
        is_read: true,
        metadata: { ...(conversations.find(c => c.id === selectedConvo)?.metadata || {}), last_viewed_at: new Date().toISOString() },
      }).eq("id", selectedConvo).then();
    }
  }, [selectedConvo, loadMessages, fetchIGMessages]);

  // Periodic re-sync of selected conversation + top conversations for real-time preview updates
  useEffect(() => {
    if (!selectedConvo) return;
    // Sync selected convo every 8s
    const resyncInterval = setInterval(() => {
      fetchIGMessages(selectedConvo);
    }, 8000);
    return () => clearInterval(resyncInterval);
  }, [selectedConvo, fetchIGMessages]);

  // Periodic background sync of top 5 conversations to keep previews/ordering up-to-date
  useEffect(() => {
    if (!accountId || conversations.length === 0) return;
    const bgSyncInterval = setInterval(async () => {
      const top = conversations
        .filter(c => c.platform_conversation_id)
        .slice(0, 5);
      for (const c of top) {
        await fetchIGMessages(c.id, c);
      }
    }, 15000); // Every 15s
    return () => clearInterval(bgSyncInterval);
  }, [accountId, conversations, fetchIGMessages]);

  // Real-time subscriptions — MERGE changes instead of full reload
  useEffect(() => {
    if (!accountId) return;
    const ch1 = supabase
      .channel(`dm-convos-${accountId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_dm_conversations", filter: `account_id=eq.${accountId}` }, (payload) => {
        const newConvo = payload.new as Conversation;
        setConversations(prev => {
          if (prev.find(c => c.id === newConvo.id)) return prev;
          return [newConvo, ...prev];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ai_dm_conversations", filter: `account_id=eq.${accountId}` }, (payload) => {
        const updated = payload.new as Conversation;
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === updated.id);
          if (idx === -1) return [updated, ...prev];
          const next = [...prev];
          next[idx] = updated;
          next.sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          });
          return next;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "ai_dm_conversations", filter: `account_id=eq.${accountId}` }, (payload) => {
        const oldId = (payload.old as any)?.id;
        if (oldId) setConversations(prev => prev.filter(c => c.id !== oldId));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, [accountId]);

  // Follow AI Actions — watch for AI typing/sent messages and auto-navigate
  useEffect(() => {
    if (!accountId) return;
    const ch = supabase
      .channel(`follow-ai-${accountId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_dm_messages", filter: `account_id=eq.${accountId}` }, (payload) => {
        const msg = payload.new as Message;
        if (!followAIRef.current) return;
        // Only follow AI-generated messages (typing or sent)
        if (msg.sender_type !== "ai") return;
        const convoId = msg.conversation_id;
        // Auto-navigate to this conversation
        setSelectedConvo(prev => {
          if (prev !== convoId) {
            // Load messages for the new convo
            loadMessages(convoId);
            addLog("follow-ai", `Jumped to ${convoId.substring(0, 8)}...`, "info");
          }
          return convoId;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [accountId, loadMessages, addLog]);

  // Real-time message subscription — MERGE instead of full reload
  useEffect(() => {
    if (!selectedConvo) return;
    const ch2 = supabase
      .channel(`dm-msgs-${selectedConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_dm_messages", filter: `conversation_id=eq.${selectedConvo}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          // Skip if already exists (optimistic insert)
          if (prev.find(m => m.id === newMsg.id)) return prev;
          // Skip if we have a temp version
          if (prev.find(m => m.id.startsWith("temp-") && m.content === newMsg.content)) return prev;
          return [...prev, newMsg];
        });
        // Update cache too
        const cached = messageCacheRef.current.get(selectedConvo);
        if (cached && !cached.find(m => m.id === newMsg.id)) {
          messageCacheRef.current.set(selectedConvo, [...cached, newMsg]);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ai_dm_messages", filter: `conversation_id=eq.${selectedConvo}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        // Update cache
        const cached = messageCacheRef.current.get(selectedConvo);
        if (cached) {
          messageCacheRef.current.set(selectedConvo, cached.map(m => m.id === updated.id ? updated : m));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "ai_dm_messages", filter: `conversation_id=eq.${selectedConvo}` }, (payload) => {
        const oldId = (payload.old as any)?.id;
        if (oldId) {
          setMessages(prev => prev.filter(m => m.id !== oldId));
          const cached = messageCacheRef.current.get(selectedConvo);
          if (cached) {
            messageCacheRef.current.set(selectedConvo, cached.filter(m => m.id !== oldId));
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch2); };
  }, [selectedConvo]);

  // Auto-scroll (only when lock chat view is enabled)
  useEffect(() => {
    if (lockChatView) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, lockChatView]);

  // Process DMs with AI tracking
  const processDMs = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    
    addLog("system", "AI processing cycle", "processing");
    setAiCurrentPhase("scan");
    
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
            setAiCurrentPhase("send");
            addLog(`@${c.fan}`, `Replied: "${c.ai_reply?.substring(0, 60)}..."`, "success");
          }
          toast.success(`AI replied to ${r.processed} conversations`);
        } else {
          addLog("system", `Checked ${r?.total_checked || 0} — no new`, "info");
        }
      }
      // Realtime subscriptions handle UI updates — no need for full reload
    } catch (e: any) {
      addLog("system", `Error: ${e.message}`, "error");
    } finally {
      setProcessing(false);
      setAiCurrentPhase("");
      setAiCurrentConvoId(null);
    }
  }, [accountId, processing, addLog]);

  // Relaunch all unread conversations — deep context scan + resume
  const relaunchUnread = useCallback(async () => {
    if (relaunching) return;
    setRelaunching(true);
    addLog("system", "Relaunching all unread conversations...", "processing");
    setAiCurrentPhase("analyze");
    
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "relaunch_unread", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (!data?.success && data?.error) {
        addLog("system", data.error, "error");
        toast.error(data.error);
      } else {
        const r = data?.data;
        if (r?.processed > 0) {
          for (const c of (r.conversations || [])) {
            addLog(`@${c.fan}`, `Resumed (${c.context_messages} msgs scanned): "${c.ai_reply?.substring(0, 50)}..."`, "success");
          }
          toast.success(`Relaunched ${r.processed}/${r.total_unread} conversations`);
        } else {
          addLog("system", `${r?.total_unread || 0} conversations checked — all recently replied (5min cooldown)`, "info");
          toast.info(`${r?.total_unread || 0} conversations checked — all were recently replied to`);
        }
      }
      await loadConversations();
    } catch (e: any) {
      addLog("system", `Relaunch error: ${e.message}`, "error");
      toast.error(e.message || "Relaunch failed");
    } finally {
      setRelaunching(false);
      setAiCurrentPhase("");
    }
  }, [accountId, relaunching, addLog, loadConversations]);

  // Continuous adaptive polling — 3s base, immediate retry on activity
  useEffect(() => {
    if (!autoRespondActive || !accountId) {
      setPolling(false);
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      return;
    }
    setPolling(true);
    // Run immediately
    processDMs();
    // Then continuous 3s cycle
    pollIntervalRef.current = setInterval(() => {
      processDMs();
    }, 3000);
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

    // OPTIMISTIC: Add to UI instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: selectedConvo,
      sender_type: "manual",
      sender_name: "you",
      content: text,
      status: "sending",
      platform_message_id: null,
      ai_model: null,
      typing_delay_ms: null,
      life_pause_ms: null,
      created_at: new Date().toISOString(),
      metadata: null,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "send_message", account_id: accountId, params: { recipient_id: convo.participant_id, message: text } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Send failed");

      // Replace optimistic message with real one
      const { data: inserted } = await supabase.from("ai_dm_messages").insert({
        conversation_id: selectedConvo,
        account_id: accountId,
        sender_type: "manual",
        sender_name: "you",
        content: text,
        status: "sent",
        platform_message_id: data?.data?.message_id || null,
      }).select("*").single();

      if (inserted) {
        setMessages(prev => prev.map(m => m.id === tempId ? (inserted as Message) : m));
        // Update cache
        const cached = messageCacheRef.current.get(selectedConvo);
        if (cached) {
          messageCacheRef.current.set(selectedConvo, [...cached.filter(m => m.id !== tempId), inserted as Message]);
        }
      }

      supabase.from("ai_dm_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `You: ${text.substring(0, 80)}`,
        is_read: true,
      }).eq("id", selectedConvo).then();
      
      addLog(`@${convo.participant_username}`, `Sent: "${text.substring(0, 50)}"`, "success");
    } catch (e: any) {
      // Mark optimistic message as failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
      toast.error(e.message || "Failed to send");
      setMessageInput(text);
      addLog("system", `Send failed: ${e.message}`, "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Edit message (local only — IG API doesn't support editing sent DMs)
  const saveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    await supabase.from("ai_dm_messages").update({ content: editText }).eq("id", msgId);
    setEditingMsgId(null);
    setEditText("");
    if (selectedConvo) {
      const fresh = await loadMessagesToCache(selectedConvo);
      setMessages(fresh);
    }
    toast.success("Message updated locally (IG doesn't support DM editing)");
  };

  // Delete message — remove from local DB + track to prevent re-import + prevent AI re-reply
  const deleteMessage = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    
    // Track the platform_message_id so sync won't re-import it — persist to localStorage
    if (msg?.platform_message_id) {
      deletedPlatformIdsRef.current.add(msg.platform_message_id);
      persistDeletedIds();
    }
    
    // OPTIMISTIC: Remove from UI instantly
    setMessages(prev => prev.filter(m => m.id !== msgId));
    // Also update cache instantly
    if (selectedConvo) {
      const cached = messageCacheRef.current.get(selectedConvo);
      if (cached) {
        messageCacheRef.current.set(selectedConvo, cached.filter(m => m.id !== msgId));
      }
    }
    
    // Delete from DB instantly (don't wait)
    supabase.from("ai_dm_messages").delete().eq("id", msgId).then();
    
    // CRITICAL: Update last_ai_reply_at to NOW so the AI processor doesn't think
    // the fan's previous message is "unanswered" and generate a new reply
    if (selectedConvo) {
      supabase.from("ai_dm_conversations").update({
        last_ai_reply_at: new Date().toISOString(),
      }).eq("id", selectedConvo).then();
    }
    
    // Try to unsend on IG in background (non-blocking)
    if (msg?.platform_message_id) {
      supabase.functions.invoke("instagram-api", {
        body: { action: "delete_message", account_id: accountId, params: { message_id: msg.platform_message_id } },
      }).then(({ data }) => {
        if (data?.data?.success !== false) {
          addLog("system", `Unsent on IG: ${msg.content?.substring(0, 30)}...`, "success");
        } else {
          addLog("system", `IG unsend: ${data?.data?.error || "not supported for this message"}`, "info");
        }
      }).catch(() => {});
    }
    
    toast.success("Message removed from dashboard (Instagram API does not support message deletion)");
  };

  // Map emoji to IG reaction type
  const emojiToReactionType = (emoji: string): string => {
    const map: Record<string, string> = { "❤️": "love", "😂": "haha", "😮": "wow", "😢": "sad", "👍": "like", "🔥": "love", "😡": "angry" };
    return map[emoji] || "love";
  };

  // React to message on IG
  const reactToMessage = async (msgId: string, reaction: string) => {
    const msg = messages.find(m => m.id === msgId);
    const convo = conversations.find(c => c.id === selectedConvo);
    if (!msg?.platform_message_id || !convo) {
      toast.error("Cannot react — message not synced to IG");
      return;
    }
    const reactionType = emojiToReactionType(reaction);
    try {
      await supabase.functions.invoke("instagram-api", {
        body: {
          action: "send_reaction",
          account_id: accountId,
          params: { recipient_id: convo.participant_id, message_id: msg.platform_message_id, reaction: reactionType },
        },
      });
      // Store reaction locally
      const existingMeta = msg.metadata || {};
      await supabase.from("ai_dm_messages").update({
        metadata: { ...existingMeta, my_reaction: reaction },
      }).eq("id", msgId);
      if (selectedConvo) {
        const fresh = await loadMessagesToCache(selectedConvo);
        setMessages(fresh);
      }
      toast.success(`Reacted with ${reaction}`);
    } catch (e: any) {
      toast.error(e.message || "Reaction failed");
    }
  };

  const removeReaction = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    const convo = conversations.find(c => c.id === selectedConvo);
    if (!msg?.platform_message_id || !convo) return;
    try {
      await supabase.functions.invoke("instagram-api", {
        body: {
          action: "remove_reaction",
          account_id: accountId,
          params: { recipient_id: convo.participant_id, message_id: msg.platform_message_id },
        },
      });
      const existingMeta = msg.metadata || {};
      delete existingMeta.my_reaction;
      await supabase.from("ai_dm_messages").update({ metadata: existingMeta }).eq("id", msgId);
      if (selectedConvo) {
        const fresh = await loadMessagesToCache(selectedConvo);
        setMessages(fresh);
      }
    } catch {}
  };

  // Filter conversations — all in primary (no folder filtering)
  const filteredConversations = conversations.filter(c => {
    const searchMatch = !searchQuery ||
      (c.participant_username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.participant_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message_preview || "").toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
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
    <div className="flex flex-col">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/10 rounded-t-lg flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Scale</span>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.05"
            value={uiScale}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setUiScale(v);
              localStorage.setItem("dm_ui_scale", String(v));
            }}
            className="w-16 h-1 accent-primary"
            title={`UI Scale: ${uiScale}x`}
          />
          <span className="text-[9px] text-muted-foreground w-6">{uiScale}x</span>
          <span className="text-[10px] text-muted-foreground ml-2">Msg</span>
          <input
            type="range"
            min="10"
            max="18"
            step="1"
            value={msgSize}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setMsgSize(v);
              localStorage.setItem("dm_msg_size", String(v));
            }}
            className="w-14 h-1 accent-primary"
            title={`Message font size: ${msgSize}px`}
          />
          <span className="text-[9px] text-muted-foreground w-6">{msgSize}px</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={autoRespondActive ? "default" : "outline"}
            onClick={onToggleAutoRespond}
            className={`h-7 text-[10px] gap-1.5 ${autoRespondActive ? "bg-green-600 hover:bg-green-700 text-white" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}`}
            title={autoRespondActive ? "AI Auto-Responder is ON — click to pause" : "AI Auto-Responder is OFF — click to start"}
          >
            {autoRespondActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {autoRespondActive ? "AI Running" : "AI Paused"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLockChatView(!lockChatView);
              toast.success(lockChatView ? "Chat view unlocked — free scroll enabled" : "Chat view locked — auto-scroll to latest messages");
            }}
            className={`h-7 text-[10px] gap-1.5 ${lockChatView ? "text-amber-400 bg-amber-500/10" : "text-muted-foreground"}`}
            title={lockChatView ? "Chat view locked — click to unlock free scroll" : "Chat view unlocked — click to lock & auto-scroll"}
          >
            {lockChatView ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            {lockChatView ? "Locked" : "Unlocked"}
          </Button>
        </div>
      </div>
    <div className="flex bg-background rounded-b-lg border border-t-0 border-border overflow-hidden" style={{ height: `calc((100vh - 260px) * ${uiScale})`, minHeight: 500 }}>
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
              <Button size="sm" variant="ghost" onClick={() => setBulkHubOpen(true)} className="h-7 w-7 p-0" title="Bulk Message Hub">
                <SendHorizonal className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPersonaCreatorOpen(true)} className="h-7 w-7 p-0" title="Create / Manage Personas">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={relaunchUnread} disabled={relaunching} className={`h-7 w-7 p-0 ${relaunching ? "text-orange-400" : ""}`} title="Relaunch all unread — deep scan full history + media, resume where left off">
                <RefreshCw className={`h-3.5 w-3.5 ${relaunching ? "animate-spin text-orange-400" : ""}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = !followAI;
                  setFollowAI(next);
                  followAIRef.current = next;
                  toast.success(next ? "Follow AI Actions ON — auto-navigating to AI activity" : "Follow AI Actions OFF");
                }}
                className={`h-7 w-7 p-0 ${followAI ? "text-blue-400 bg-blue-500/15" : ""}`}
                title="Follow AI Actions — auto-jump to conversations where AI is replying"
              >
                <Eye className={`h-3.5 w-3.5 ${followAI ? "animate-pulse" : ""}`} />
              </Button>
            </div>
          </div>

          {/* All Messages - Single inbox */}
          <div className="flex items-center gap-2 mt-1">
            <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">All Messages</span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{conversations.length}</Badge>
            {conversations.filter(c => !c.is_read).length > 0 && (
              <span className="bg-blue-500 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">
                {conversations.filter(c => !c.is_read).length}
              </span>
            )}
          </div>

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

          {/* Subtle background sync indicator — non-blocking */}
          {prefetchProgress && (
            <div className="flex items-center gap-1.5 mt-1.5 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[9px] text-muted-foreground/60">
                Syncing {prefetchProgress.done}/{prefetchProgress.total}
              </span>
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
                      {convo.participant_name && convo.participant_name !== "Unknown" 
                        ? convo.participant_name 
                        : convo.participant_username && convo.participant_username !== convo.participant_id 
                          ? convo.participant_username 
                          : convo.participant_id?.substring(0, 12) || "User"}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <span className={`text-[10px] ${!convo.is_read ? "text-blue-400 font-medium" : "text-muted-foreground"}`}>
                        {formatTime(convo.last_message_at)}
                      </span>
                      {/* Per-conversation AI pause/play toggle */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newEnabled = !convo.ai_enabled;
                          // Optimistic update
                          setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, ai_enabled: newEnabled } : c));
                          await supabase.from("ai_dm_conversations").update({ ai_enabled: newEnabled }).eq("id", convo.id);
                          toast.success(newEnabled ? `AI enabled for @${convo.participant_username}` : `AI paused for @${convo.participant_username}`);
                          addLog(`@${convo.participant_username}`, newEnabled ? "AI resumed" : "AI paused", "info");
                        }}
                        className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                        title={convo.ai_enabled ? "Pause AI for this conversation" : "Resume AI for this conversation"}
                      >
                        {convo.ai_enabled ? (
                          <Bot className="h-3 w-3 text-blue-400 hover:text-red-400 transition-colors" />
                        ) : (
                          <Pause className="h-3 w-3 text-red-400 hover:text-blue-400 transition-colors" />
                        )}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (relaunchingConvoId === convo.id) return;
                          setRelaunchingConvoId(convo.id);
                          addLog(`@${convo.participant_username}`, "Relaunching single convo...", "processing");
                          try {
                            const { data, error } = await supabase.functions.invoke("social-ai-responder", {
                              body: { action: "relaunch_single", account_id: accountId, params: { conversation_id: convo.id } },
                            });
                            if (error) throw error;
                            if (data?.data?.reply) {
                              addLog(`@${convo.participant_username}`, `Sent: "${data.data.reply.substring(0, 50)}..."`, "success");
                              toast.success(`Relaunched @${convo.participant_username}`);
                            } else {
                              toast.info(data?.data?.reply || "Reacted/stopped (post-redirect)");
                            }
                            await loadConversations();
                          } catch (err: any) {
                            toast.error(err.message || "Relaunch failed");
                          } finally {
                            setRelaunchingConvoId(null);
                          }
                        }}
                        className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                        title="Relaunch this conversation"
                      >
                        {relaunchingConvoId === convo.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-orange-400" />
                        ) : (
                          <RefreshCw className="h-3 w-3 text-muted-foreground/50 hover:text-orange-400 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate max-w-[200px] ${!convo.is_read ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                      {convo.last_message_preview || `${convo.message_count || 0} messages`}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      {convo.metadata?.last_viewed_at && <span className="text-muted-foreground/50" ><Eye className="h-2.5 w-2.5" /></span>}
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
            <ScrollArea className="flex-1 px-4 py-3" style={{ fontSize: `${msgSize}px` }}>
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
                                {/* Media-only messages render outside the bubble */}
                                {(() => {
                                  const attachments = msg.metadata?.attachments;
                                  const hasMedia = Array.isArray(attachments) && attachments.length > 0;
                                  const stickerData = msg.metadata?.sticker;
                                  const sharesData = msg.metadata?.shares;
                                  const storyData = msg.metadata?.story;
                                  const myReaction = msg.metadata?.my_reaction;

                                  // Render media attachments
                                  const renderMedia = () => {
                                    if (!hasMedia) return null;
                                    return (
                                      <div className="space-y-1 mb-0.5">
                                        {attachments.map((att: any, i: number) => {
                                          const url = att.file_url || att.image_data?.url || att.video_data?.url 
                                            || att.url || att.payload?.url || att.preview_url;
                                          const mimeType = (att.mime_type || att.type || "").toLowerCase();
                                          const attType = (att.type || "").toLowerCase();
                                          
                                          if (!url) return null;

                                          if (mimeType.includes("video") || attType === "video" || att.video_data || attType === "reel") {
                                            return (
                                              <div key={i} className="relative rounded-xl overflow-hidden max-w-[260px]">
                                                <video src={url} controls preload="metadata" playsInline className="w-full rounded-xl max-h-[300px] object-cover" poster={att.preview_url || att.image_data?.url} />
                                              </div>
                                            );
                                          }

                                          if (mimeType.includes("audio") || attType === "audio") {
                                            return (
                                              <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2 max-w-[240px]">
                                                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">🎵</div>
                                                <audio src={url} controls className="w-full h-8" />
                                              </div>
                                            );
                                          }

                                          if (mimeType.includes("gif") || attType === "animated_image" || url.includes(".gif")) {
                                            return <img key={i} src={url} alt="GIF" className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(url, "_blank")} />;
                                          }

                                          return <img key={i} src={url} alt="" className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(url, "_blank")} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
                                        })}
                                      </div>
                                    );
                                  };

                                  // Sticker
                                  if (stickerData && !hasMedia) {
                                    const stickerUrl = stickerData.url || stickerData.image?.url;
                                    return (
                                      <div className="relative">
                                        {stickerUrl ? <img src={stickerUrl} alt="sticker" className="max-w-[120px] max-h-[120px]" /> : <div className="rounded-2xl px-3.5 py-2 bg-muted/60"><span className="text-[13px] italic opacity-70">🏷️ Sticker</span></div>}
                                        {myReaction && <button onClick={() => removeReaction(msg.id)} className="absolute -bottom-2 -right-1 text-sm bg-muted/80 rounded-full px-1 border border-border hover:scale-110 transition-transform">{myReaction}</button>}
                                      </div>
                                    );
                                  }

                                  // Story reply
                                  if (storyData) {
                                    const storyUrl = storyData.url || storyData.link || storyData.mention?.link || storyData.mention?.url;
                                    const storyMediaUrl = storyData.media_url || storyData.mention?.media_url;
                                    const storyMediaSrc = storyMediaUrl || storyUrl;
                                    const isStoryVideo = storyMediaSrc && (
                                      storyMediaSrc.includes(".mp4") || 
                                      storyMediaSrc.includes("ig_messaging_cdn") || 
                                      storyMediaSrc.includes("/video/")
                                    );
                                    return (
                                      <div className="relative">
                                        <div className="rounded-2xl overflow-hidden border border-border/30 max-w-[220px]">
                                          <div className="px-2.5 py-1.5 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 text-[10px] text-muted-foreground flex items-center gap-1.5">
                                            <span className="text-base">📖</span>
                                            <span className="font-medium">Replied to your story</span>
                                          </div>
                                          {storyMediaSrc && (
                                            <div className="relative cursor-pointer" onClick={() => !isStoryVideo && window.open(storyUrl || storyMediaSrc, "_blank")}>
                                              {isStoryVideo ? (
                                                <video 
                                                  src={storyMediaSrc} 
                                                  controls 
                                                  preload="metadata" 
                                                  playsInline 
                                                  className="w-full max-h-[200px] object-cover"
                                                  onError={(e) => {
                                                    const vid = e.target as HTMLVideoElement;
                                                    vid.style.display = "none";
                                                    const img = document.createElement("img");
                                                    img.src = storyMediaSrc;
                                                    img.className = "w-full max-h-[200px] object-cover";
                                                    img.onerror = () => { img.style.display = "none"; };
                                                    vid.parentElement?.appendChild(img);
                                                  }}
                                                />
                                              ) : (
                                                <img 
                                                  src={storyMediaSrc} 
                                                  alt="story" 
                                                  className="w-full max-h-[200px] object-cover" 
                                                  onError={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    img.style.display = "none";
                                                    // Try as video
                                                    const vid = document.createElement("video");
                                                    vid.src = storyMediaSrc;
                                                    vid.controls = true;
                                                    vid.playsInline = true;
                                                    vid.className = "w-full max-h-[200px] object-cover";
                                                    vid.onerror = () => { vid.style.display = "none"; };
                                                    img.parentElement?.appendChild(vid);
                                                  }} 
                                                />
                                              )}
                                              {!isStoryVideo && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />}
                                            </div>
                                          )}
                                          {msg.content && !msg.content.startsWith("[") && (
                                            <div className={`px-3.5 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                                              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                          )}
                                        </div>
                                        {myReaction && <button onClick={() => removeReaction(msg.id)} className="absolute -bottom-2 -right-1 text-sm bg-muted/80 rounded-full px-1 border border-border hover:scale-110 transition-transform">{myReaction}</button>}
                                      </div>
                                    );
                                  }

                                  // Shared post / reel — render media inline
                                  if (sharesData) {
                                    const shareArr = sharesData?.data || (Array.isArray(sharesData) ? sharesData : [sharesData]);
                                    const share = shareArr?.[0] || sharesData;
                                    const shareLink = share?.link || share?.url || share?.permalink;
                                    const shareName = share?.name || share?.title || share?.description;
                                    const shareImage = share?.image_url || share?.media_url || share?.thumbnail_url || share?.cover_url;
                                    const isReel = shareLink?.includes("/reel/") || shareLink?.includes("/reels/") || share?.type === "reel";
                                    
                                    // Determine the best media URL — prefer image/video fields, fall back to link if it's a CDN URL
                                    const cdnDomains = ["lookaside.fbsbx.com", "scontent", "cdninstagram", "fbcdn", "instagram.f"];
                                    const isCdnLink = shareLink && cdnDomains.some(d => shareLink.includes(d));
                                    const mediaUrl = shareImage || (isCdnLink ? shareLink : null);
                                    
                                    // For CDN URLs without file extensions, we need to try video first then image
                                    // ig_messaging_cdn URLs are typically video (reels, shared posts)
                                    const isLikelyVideo = mediaUrl && (
                                      mediaUrl.includes(".mp4") || 
                                      mediaUrl.includes("ig_messaging_cdn") || 
                                      mediaUrl.includes("/video/") ||
                                      isReel
                                    );
                                    
                                    return (
                                      <div className="relative">
                                        <div className="rounded-2xl overflow-hidden border border-border/30 max-w-[260px]">
                                          <div className="px-2.5 py-1.5 bg-muted/20 text-[10px] text-muted-foreground flex items-center gap-1.5">
                                            <span>{isReel ? "🎬" : "📎"}</span>
                                            <span className="font-medium">Shared {isReel ? "reel" : "post"}</span>
                                          </div>
                                          {mediaUrl && (
                                            <div className="relative">
                                              {isLikelyVideo ? (
                                                <video 
                                                  src={mediaUrl} 
                                                  controls 
                                                  preload="metadata" 
                                                  playsInline 
                                                  className="w-full max-h-[300px] object-cover"
                                                  poster={shareImage && shareImage !== mediaUrl ? shareImage : undefined}
                                                  onError={(e) => {
                                                    // If video fails, swap to image
                                                    const vid = e.target as HTMLVideoElement;
                                                    vid.style.display = "none";
                                                    const img = document.createElement("img");
                                                    img.src = mediaUrl;
                                                    img.className = "w-full max-h-[300px] object-cover cursor-pointer";
                                                    img.onclick = () => window.open(shareLink || mediaUrl, "_blank");
                                                    img.onerror = () => {
                                                      img.style.display = "none";
                                                      if (shareLink) {
                                                        const link = document.createElement("a");
                                                        link.href = shareLink;
                                                        link.target = "_blank";
                                                        link.className = "block px-3 py-2 text-[11px] text-accent hover:underline truncate";
                                                        link.textContent = shareLink;
                                                        vid.parentElement?.appendChild(link);
                                                      }
                                                    };
                                                    vid.parentElement?.appendChild(img);
                                                  }}
                                                />
                                              ) : (
                                                <img 
                                                  src={mediaUrl} 
                                                  alt={shareName || "Shared post"} 
                                                  className="w-full max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                                                  onClick={() => window.open(shareLink || mediaUrl, "_blank")}
                                                  onError={(e) => {
                                                    // If image fails, try as video
                                                    const img = e.target as HTMLImageElement;
                                                    img.style.display = "none";
                                                    const vid = document.createElement("video");
                                                    vid.src = mediaUrl;
                                                    vid.controls = true;
                                                    vid.playsInline = true;
                                                    vid.className = "w-full max-h-[300px] object-cover";
                                                    vid.onerror = () => {
                                                      vid.style.display = "none";
                                                      if (shareLink) {
                                                        const link = document.createElement("a");
                                                        link.href = shareLink;
                                                        link.target = "_blank";
                                                        link.className = "block px-3 py-2 text-[11px] text-accent hover:underline truncate";
                                                        link.textContent = shareLink;
                                                        img.parentElement?.appendChild(link);
                                                      }
                                                    };
                                                    img.parentElement?.appendChild(vid);
                                                  }}
                                                />
                                              )}
                                              {isReel && !isLikelyVideo && (
                                                <div className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                                                  <span className="text-[10px]">🎬</span>
                                                  <span className="text-[10px] text-white font-medium">Reel</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {shareName && (
                                            <div className="px-3 py-1.5 bg-muted/10">
                                              <p className="text-xs text-foreground/80 line-clamp-2">{shareName}</p>
                                            </div>
                                          )}
                                          {!mediaUrl && shareLink && (
                                            <a href={shareLink} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 text-[11px] text-accent hover:underline truncate">
                                              {shareLink}
                                            </a>
                                          )}
                                        </div>
                                        {msg.content && !msg.content.startsWith("[") && (
                                          <div className={`rounded-2xl px-3.5 py-2 mt-0.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                          </div>
                                        )}
                                        {myReaction && <button onClick={() => removeReaction(msg.id)} className="absolute -bottom-2 -right-1 text-sm bg-muted/80 rounded-full px-1 border border-border hover:scale-110 transition-transform">{myReaction}</button>}
                                      </div>
                                    );
                                  }

                                  // Media with optional text
                                  if (hasMedia) {
                                    return (
                                      <div className="relative">
                                        {renderMedia()}
                                        {msg.content && !msg.content.startsWith("[") && (
                                          <div className={`rounded-2xl px-3.5 py-2 ${isMe ? msg.sender_type === "ai" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                          </div>
                                        )}
                                        {myReaction && <button onClick={() => removeReaction(msg.id)} className="absolute -bottom-2 -right-1 text-sm bg-muted/80 rounded-full px-1 border border-border hover:scale-110 transition-transform">{myReaction}</button>}
                                      </div>
                                    );
                                  }

                                  // Plain text or tagged content
                                  const isTagged = msg.content && msg.content.startsWith("[") && msg.content.endsWith("]");
                                  return (
                                    <div className="relative">
                                      <div className={`rounded-2xl px-3.5 py-2 ${isMe ? msg.sender_type === "ai" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                                        {isTagged ? (() => {
                                          const tag = msg.content.slice(1, -1);
                                          const icons: Record<string, string> = { photo: "📷", video: "🎥", reel: "🎬", audio: "🎵", "voice message": "🎤", sticker: "🏷️", gif: "🎞️", "shared post": "📎", "shared reel": "🎬", attachment: "📎", media: "📷" };
                                          return (
                                            <div className="flex items-center gap-1.5 opacity-70">
                                              <span>{icons[tag] || "📎"}</span>
                                              <span className="text-[13px] italic capitalize">{tag}</span>
                                            </div>
                                          );
                                        })() : (
                                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                      </div>
                                      {myReaction && <button onClick={() => removeReaction(msg.id)} className="absolute -bottom-2 -right-1 text-sm bg-muted/80 rounded-full px-1 border border-border hover:scale-110 transition-transform">{myReaction}</button>}
                                    </div>
                                  );
                                })()}

                                {/* Message meta */}
                                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                                  {isMe && msg.sender_type === "ai" && <Bot className="h-2.5 w-2.5 text-blue-400" />}
                                  {isMe && msg.status === "sent" && <CheckCheck className="h-2.5 w-2.5 text-blue-400" />}
                                  {isMe && msg.status === "failed" && (
                                    <span className="flex items-center gap-0.5 text-destructive">
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
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-50 hover:opacity-100 text-destructive" onClick={() => deleteMessage(msg.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {!isMe && (
                                  <div className="absolute -right-20 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0">
                                    {["❤️", "😂", "😮", "😢", "👍", "🔥"].map(emoji => (
                                      <button key={emoji} onClick={() => reactToMessage(msg.id, emoji)} className="h-6 w-6 flex items-center justify-center text-sm hover:scale-125 transition-transform rounded-full hover:bg-muted/40" title={`React ${emoji}`}>{emoji}</button>
                                    ))}
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
        <div className="w-[280px] min-w-[280px] border-l border-border flex-col bg-muted/5 hidden xl:flex">
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-foreground">AI Automation</span>
              <Badge variant="outline" className="text-green-400 border-green-500/30 text-[9px] ml-auto animate-pulse">Active</Badge>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Bulk Actions</p>
            <div className="space-y-1.5">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                disabled={relaunching || processing}
                onClick={async () => {
                  const aiEnabled = conversations.filter(c => c.ai_enabled);
                  if (aiEnabled.length === 0) { toast.info("No conversations with AI enabled"); return; }
                  setRelaunching(true);
                  addLog("system", `Scanning & resuming ${aiEnabled.length} convos (deep context analysis)...`, "processing");
                  setAiCurrentPhase("analyze");
                  toast.info(`Scanning & resuming all ${aiEnabled.length} conversations...`);
                  try {
                    const { data, error } = await supabase.functions.invoke("social-ai-responder", {
                      body: { action: "relaunch_unread", account_id: accountId, params: {} },
                    });
                    if (error) throw error;
                    const r = data?.data;
                    if (r?.processed > 0) {
                      for (const c of (r.conversations || [])) {
                        addLog(`@${c.fan}`, `${c.action === "reacted" ? "Reacted ❤️ (post-redirect)" : `Replied (${c.context_messages} msgs): "${c.ai_reply?.substring(0, 50)}..."`}`, "success");
                      }
                      toast.success(`Processed ${r.processed}/${r.total_checked} conversations`);
                    } else {
                      toast.info(`Checked ${r?.total_checked || 0} convos — all recently handled`);
                    }
                  } catch (e: any) {
                    addLog("system", `Error: ${e.message}`, "error");
                    toast.error(e.message || "Failed");
                  } finally {
                    setRelaunching(false);
                    setAiCurrentPhase("");
                    await loadConversations();
                  }
                }}
              >
                {relaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Inbox className="h-3 w-3" />}
                Resume All Conversations ({conversations.filter(c => c.ai_enabled).length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                disabled={relaunching || processing}
                onClick={async () => {
                  if (!selectedConvo) { toast.error("Select a conversation to relaunch"); return; }
                  const convo = conversations.find(c => c.id === selectedConvo);
                  if (!convo) return;
                  setRelaunching(true);
                  addLog(`@${convo.participant_username}`, "Deep relaunching conversation (full context scan)...", "processing");
                  setAiCurrentPhase("analyze");
                  toast.info(`Relaunching convo with @${convo.participant_username}...`);
                  try {
                    const { data, error } = await supabase.functions.invoke("social-ai-responder", {
                      body: { action: "relaunch_single", account_id: accountId, params: { conversation_id: selectedConvo } },
                    });
                    if (error) throw error;
                    const r = data?.data;
                    if (r?.success) {
                      addLog(`@${convo.participant_username}`, `Replied (${r.context_messages} msgs scanned): "${r.reply?.substring(0, 50)}..."`, "success");
                      toast.success(`Replied to @${convo.participant_username}`);
                    } else if (r?.skipped) {
                      toast.info(r.error || "Last message is not from fan — nothing to reply to");
                    } else {
                      toast.error(r?.error || "Failed to relaunch");
                    }
                  } catch (e: any) {
                    addLog("system", `Error: ${e.message}`, "error");
                    toast.error(e.message || "Relaunch failed");
                  } finally {
                    setRelaunching(false);
                    setAiCurrentPhase("");
                    await loadConversations();
                    if (selectedConvo) await loadMessages(selectedConvo);
                  }
                }}
              >
                {relaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Relaunch Current Convo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-orange-500/20 text-orange-400 hover:bg-orange-500/10"
                disabled={relaunching || processing}
                onClick={async () => {
                  const count = conversations.filter(c => {
                    if (!c.last_message_at) return false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return new Date(c.last_message_at) >= today;
                  }).length;
                  if (count === 0) { toast.info("No conversations with activity today"); return; }
                  setRelaunching(true);
                  addLog("system", `Relaunching ALL ${count} today's conversations (deep context scan)...`, "processing");
                  setAiCurrentPhase("analyze");
                  toast.info(`Scanning & relaunching ${count} conversations from today...`);
                  try {
                    const { data, error } = await supabase.functions.invoke("social-ai-responder", {
                      body: { action: "relaunch_all_today", account_id: accountId, params: {} },
                    });
                    if (error) throw error;
                    const r = data?.data;
                    if (r?.processed > 0) {
                      for (const c of (r.conversations || [])) {
                        addLog(`@${c.fan}`, `Resumed (${c.context_messages} msgs): "${c.ai_reply?.substring(0, 50)}..."`, "success");
                      }
                      toast.success(`Relaunched ${r.processed}/${r.total_today} today's conversations`);
                    } else {
                      toast.info(`${r?.total_today || 0} today convos — none needed replies`);
                    }
                  } catch (e: any) {
                    addLog("system", `Error: ${e.message}`, "error");
                    toast.error(e.message || "Relaunch failed");
                  } finally {
                    setRelaunching(false);
                    setAiCurrentPhase("");
                    await loadConversations();
                  }
                }}
              >
                {relaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                Relaunch All Today ({conversations.filter(c => {
                  if (!c.last_message_at) return false;
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  return new Date(c.last_message_at) >= today;
                }).length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-green-500/20 text-green-400 hover:bg-green-500/10"
                onClick={async () => {
                  const unread = conversations.filter(c => !c.is_read);
                  if (unread.length === 0) { toast.info("All conversations already read"); return; }
                  for (const c of unread) {
                    await supabase.from("ai_dm_conversations").update({ is_read: true }).eq("id", c.id);
                  }
                  await loadConversations();
                  toast.success(`Marked ${unread.length} conversations as read`);
                }}
              >
                <CheckCheck className="h-3 w-3" />
                Mark All Read ({conversations.filter(c => !c.is_read).length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                onClick={async () => {
                  const disabled = conversations.filter(c => !c.ai_enabled);
                  if (disabled.length === 0) { toast.info("AI already enabled on all"); return; }
                  for (const c of disabled) {
                    await supabase.from("ai_dm_conversations").update({ ai_enabled: true }).eq("id", c.id);
                  }
                  await loadConversations();
                  toast.success(`AI enabled on ${disabled.length} conversations`);
                  addLog("system", `Enabled AI on ${disabled.length} convos`, "success");
                }}
              >
                <Bot className="h-3 w-3" />
                Enable AI on All ({conversations.filter(c => !c.ai_enabled).length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                onClick={async () => {
                  const enabled = conversations.filter(c => c.ai_enabled);
                  if (enabled.length === 0) { toast.info("AI already disabled on all"); return; }
                  for (const c of enabled) {
                    await supabase.from("ai_dm_conversations").update({ ai_enabled: false }).eq("id", c.id);
                  }
                  await loadConversations();
                  toast.success(`AI paused on ${enabled.length} conversations`);
                  addLog("system", `Disabled AI on ${enabled.length} convos`, "info");
                }}
              >
                <WifiOff className="h-3 w-3" />
                Pause AI on All ({conversations.filter(c => c.ai_enabled).length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[10px] justify-start gap-2 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                disabled={processing}
                onClick={async () => {
                  const noRedirect = conversations.filter(c => !c.redirect_sent && c.ai_enabled);
                  if (noRedirect.length === 0) { toast.info("No conversations need redirect"); return; }
                  addLog("system", `Force-redirecting ${noRedirect.length} convos`, "processing");
                  toast.info(`Sending redirect to ${noRedirect.length} conversations...`);
                  // Mark all as needing reprocessing with redirect flag
                  for (const c of noRedirect) {
                    await supabase.from("ai_dm_conversations").update({ is_read: false }).eq("id", c.id);
                  }
                  await processDMs();
                  await loadConversations();
                }}
              >
                <ArrowRight className="h-3 w-3" />
                Force Redirect All ({conversations.filter(c => !c.redirect_sent).length})
              </Button>
            </div>
          </div>

          {/* Current Phase - ALWAYS animating when polling */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Pipeline</p>
            <div className="space-y-1">
              {AI_PHASES.map((step, stepIdx) => {
                const isActive = processing && aiCurrentPhase === step.id;
                const isPast = processing && AI_PHASES.findIndex(p => p.id === aiCurrentPhase) > stepIdx;
                // When polling but not actively processing, show continuous scan animation
                const isScanning = !processing && polling && step.id === "scan";
                const isScanningDetect = !processing && polling && step.id === "detect";
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    {isPast ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : isActive || isScanning ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    ) : isScanningDetect ? (
                      <Eye className="h-3 w-3 text-blue-400/60 animate-pulse" />
                    ) : (
                      <CircleDot className={`h-3 w-3 ${processing ? "text-muted-foreground/30" : "text-muted-foreground/20"}`} />
                    )}
                    <span className={`text-[10px] ${
                      isActive || isScanning ? "text-blue-400 font-semibold" :
                      isScanningDetect ? "text-blue-400/60 font-medium" :
                      isPast ? "text-green-400/70" :
                      "text-muted-foreground/40"
                    }`}>{step.label}{isScanning ? "..." : ""}</span>
                  </div>
                );
              })}
            </div>
            {polling && !processing && (
              <div className="flex items-center gap-2 mt-2 text-blue-400/60">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] animate-pulse">Scanning inbox...</span>
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
                <p className="text-[9px] text-muted-foreground/50">Viewed</p>
                <p className="text-sm font-bold text-green-400">{conversations.filter(c => c.metadata?.last_viewed_at).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Hub Dialog */}
      <BulkMessageHub accountId={accountId} open={bulkHubOpen} onOpenChange={setBulkHubOpen} />
      {/* Persona Creator Dialog */}
      <PersonaCreatorDialog accountId={accountId} open={personaCreatorOpen} onOpenChange={setPersonaCreatorOpen} />
    </div>
    </div>
  );
};

export default LiveDMConversations;

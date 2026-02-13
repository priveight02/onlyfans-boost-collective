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
  Download, Search, MoreVertical, Phone, Video, Info,
  Check, CheckCheck, Clock, AlertCircle, Pencil, Trash2,
  Smile, Image as ImageIcon, Heart, ChevronLeft, Zap,
  Play, Pause, Brain, Eye, ArrowRight, Sparkles,
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
  const [aiCurrentConvo, setAiCurrentConvo] = useState<string | null>(null);
  const [aiPhase, setAiPhase] = useState<string>("");
  const [aiProcessingLog, setAiProcessingLog] = useState<Array<{ convo: string; phase: string; time: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations from DB
  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from("ai_dm_conversations")
      .select("*")
      .eq("account_id", accountId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (data) setConversations(data as Conversation[]);
  }, [accountId]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convoId: string) => {
    const { data } = await supabase
      .from("ai_dm_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }, []);

  // Scan ALL conversations from Instagram
  const scanAllConversations = useCallback(async (silent = false) => {
    if (!accountId) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "scan_all_conversations", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (!data?.success && data?.error) throw new Error(data.error);
      const r = data?.data;
      if (!silent) {
        toast.success(`Synced ${r?.imported || 0} conversations (${r?.total_found || 0} found)`);
      }
      await loadConversations();
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Failed to scan conversations");
      console.error("Scan error:", e);
    } finally {
      setScanning(false);
      setInitialScanDone(true);
    }
  }, [accountId, loadConversations]);

  // Initial load
  useEffect(() => {
    if (accountId) {
      loadConversations();
      if (!initialScanDone) scanAllConversations(true);
    }
  }, [accountId, initialScanDone, scanAllConversations, loadConversations]);

  // Load messages when convo selected
  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo);
      // Mark as read
      supabase.from("ai_dm_conversations").update({ is_read: true }).eq("id", selectedConvo).then();
    }
  }, [selectedConvo, loadMessages]);

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
  const processDMs = async () => {
    setProcessing(true);
    setAiPhase("Scanning inbox...");
    setAiProcessingLog(prev => [...prev, { convo: "system", phase: "Starting AI scan", time: new Date().toLocaleTimeString() }]);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "process_live_dm", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Processing failed");
      const r = data.data;
      if (r.conversations?.length > 0) {
        for (const c of r.conversations) {
          setAiProcessingLog(prev => [...prev, {
            convo: `@${c.fan}`,
            phase: `Replied: "${c.ai_reply?.substring(0, 50)}..."`,
            time: new Date().toLocaleTimeString(),
          }]);
        }
        toast.success(`AI replied to ${r.processed} conversations`);
      } else {
        toast.info(`Checked ${r.total_checked || 0} conversations — no new messages`);
      }
      setAiPhase("");
      await loadConversations();
      if (selectedConvo) await loadMessages(selectedConvo);
    } catch (e: any) {
      setAiPhase("Error: " + e.message);
      toast.error(e.message || "Failed to process DMs");
    } finally {
      setProcessing(false);
    }
  };

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
    if (!messageInput.trim() || !selectedConvo) return;
    const convo = conversations.find(c => c.id === selectedConvo);
    if (!convo) return;
    const text = messageInput;
    setMessageInput("");

    try {
      // Send via IG API
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "send_message", account_id: accountId, params: { recipient_id: convo.participant_id, message: text } },
      });
      if (error) throw error;

      // Save to DB
      await supabase.from("ai_dm_messages").insert({
        conversation_id: selectedConvo,
        account_id: accountId,
        sender_type: "manual",
        sender_name: "you",
        content: text,
        status: "sent",
        platform_message_id: data?.data?.message_id || null,
      });

      // Update conversation
      await supabase.from("ai_dm_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: text,
        is_read: true,
      }).eq("id", selectedConvo);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
      setMessageInput(text);
    }
  };

  // Edit message (local only - can't edit on IG)
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
      (c.participant_name || "").toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="flex h-[700px] bg-background rounded-lg border border-border overflow-hidden">
      {/* LEFT PANEL - Conversation List (Instagram-style) */}
      <div className="w-[340px] min-w-[340px] border-r border-border flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Messages</h2>
              {polling && (
                <Badge variant="outline" className="text-green-400 border-green-500/30 text-[9px] animate-pulse px-1.5 py-0">
                  <Wifi className="h-2.5 w-2.5 mr-0.5" />LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => scanAllConversations(false)} disabled={scanning} className="h-7 w-7 p-0" title="Sync Instagram inbox">
                <Download className={`h-3.5 w-3.5 ${scanning ? "animate-bounce" : ""}`} />
              </Button>
              <Button size="sm" variant="ghost" onClick={processDMs} disabled={processing} className="h-7 w-7 p-0" title="Run AI processing">
                <RefreshCw className={`h-3.5 w-3.5 ${processing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Tabs: Primary / General / Requests */}
          <Tabs value={activeFolder} onValueChange={setActiveFolder}>
            <TabsList className="w-full bg-muted/30 h-8">
              <TabsTrigger value="primary" className="flex-1 text-xs h-7 data-[state=active]:bg-background">
                Primary
                {unreadCounts.primary > 0 && (
                  <span className="ml-1 bg-blue-500 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCounts.primary}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1 text-xs h-7 data-[state=active]:bg-background">
                General
                {unreadCounts.general > 0 && (
                  <span className="ml-1 bg-muted-foreground/50 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCounts.general}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 text-xs h-7 data-[state=active]:bg-background">
                Requests
                {unreadCounts.requests > 0 && (
                  <span className="ml-1 bg-muted-foreground/50 text-white rounded-full text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCounts.requests}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-0 rounded-lg"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {scanning && !initialScanDone ? (
            <div className="p-6 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-xs">Syncing Instagram inbox...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs">
                {conversations.length === 0 
                  ? "No conversations yet — click sync to import from Instagram" 
                  : `No conversations in ${activeFolder}`}
              </p>
            </div>
          ) : (
            filteredConversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/30 ${
                  selectedConvo === convo.id ? "bg-muted/50" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {convo.participant_avatar_url ? (
                    <img src={convo.participant_avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {convo.ai_enabled && autoRespondActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                      <Bot className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {aiCurrentConvo === convo.id && (
                    <div className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${!convo.is_read ? "font-semibold text-foreground" : "font-normal text-foreground/80"}`}>
                      {convo.participant_name || convo.participant_username || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${!convo.is_read ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {convo.last_message_preview || `${convo.message_count || 0} messages`}
                    </p>
                    {!convo.is_read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>

        {/* AI Status Bar */}
        {(processing || aiPhase) && (
          <div className="px-3 py-2 border-t border-border bg-blue-500/5">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-400 truncate">{aiPhase || "AI processing..."}</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConvo ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-24 w-24 mx-auto mb-4 rounded-full border-2 border-foreground/20 flex items-center justify-center">
                <Send className="h-10 w-10 text-foreground/20 -rotate-45" />
              </div>
              <h3 className="text-xl font-light text-foreground mb-1">Your messages</h3>
              <p className="text-sm text-muted-foreground mb-4">Send a message to start a chat.</p>
              <Button variant="default" size="sm" className="rounded-lg" onClick={() => scanAllConversations(false)}>
                <Download className="h-4 w-4 mr-2" />Sync Inbox
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 lg:hidden" onClick={() => setSelectedConvo(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {selectedConvoData?.participant_avatar_url ? (
                  <img src={selectedConvoData.participant_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedConvoData?.participant_name || selectedConvoData?.participant_username}</p>
                  <p className="text-[10px] text-muted-foreground">
                    @{selectedConvoData?.participant_username}
                    {selectedConvoData?.ai_enabled && autoRespondActive && (
                      <span className="ml-1.5 text-blue-400">• AI Active</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedConvoData?.redirect_sent && (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[9px]">Redirected</Badge>
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
                      supabase.from("ai_dm_conversations").update({ folder: newFolder }).eq("id", selectedConvo).then(() => {
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
                        toast.success(newAi ? "AI enabled for this chat" : "AI disabled — manual mode");
                      });
                    }}>
                      {selectedConvoData?.ai_enabled ? "Disable AI" : "Enable AI"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                          <p className="text-center text-[10px] text-muted-foreground my-3">
                            {new Date(msg.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        <div className={`flex items-end gap-1.5 group ${isMe ? "justify-end" : "justify-start"}`}>
                          {/* Fan avatar */}
                          {!isMe && (
                            <div className="flex-shrink-0 mb-1">
                              {selectedConvoData?.participant_avatar_url ? (
                                <img src={selectedConvoData.participant_avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`relative max-w-[65%] ${isMe ? "order-1" : ""}`}>
                            {/* Typing indicator */}
                            {msg.status === "typing" ? (
                              <div className="bg-blue-500/15 border border-blue-500/20 rounded-2xl px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                  <span className="text-[10px] text-blue-400 ml-1.5">typing...</span>
                                </div>
                              </div>
                            ) : editingMsgId === msg.id ? (
                              /* Edit mode */
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && saveEdit(msg.id)}
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
                                      ? "bg-blue-500 text-white"
                                      : "bg-primary text-primary-foreground"
                                    : "bg-muted/60 text-foreground"
                                }`}>
                                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>

                                {/* Message meta */}
                                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                                  {isMe && msg.sender_type === "ai" && (
                                    <Bot className="h-2.5 w-2.5 text-blue-400" />
                                  )}
                                  {isMe && msg.status === "sent" && <CheckCheck className="h-2.5 w-2.5 text-blue-400" />}
                                  {isMe && msg.status === "failed" && <AlertCircle className="h-2.5 w-2.5 text-red-400" />}
                                  <span className="text-[9px] text-muted-foreground">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>

                                {/* Actions (hover) */}
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
              <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 border border-border">
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
                  <Button size="sm" variant="ghost" onClick={sendMessage} className="h-7 px-3 text-blue-400 hover:text-blue-300 font-semibold text-sm">
                    Send
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

      {/* AI AUTOMATION PANEL (right sidebar when AI is active) */}
      {autoRespondActive && (
        <div className="w-[260px] min-w-[260px] border-l border-border flex flex-col bg-muted/5">
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-foreground">AI Automation</span>
              <Badge variant="outline" className="text-green-400 border-green-500/30 text-[9px] ml-auto">Active</Badge>
            </div>
          </div>

          {/* Current AI Phase */}
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Current Phase</p>
            {processing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">{aiPhase || "Processing..."}</span>
                </div>
                {aiCurrentConvo && (
                  <div className="flex items-center gap-1.5 bg-blue-500/10 rounded-md px-2 py-1">
                    <Bot className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-blue-400 truncate">Chatting with @{aiCurrentConvo}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Waiting for next scan (30s)</span>
              </div>
            )}
          </div>

          {/* AI Pipeline Phases */}
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Pipeline Phases</p>
            <div className="space-y-1.5">
              {[
                { icon: Download, label: "Scan inbox", phase: "scan" },
                { icon: Eye, label: "Detect new messages", phase: "detect" },
                { icon: Brain, label: "Analyze conversation", phase: "analyze" },
                { icon: Zap, label: "Generate reply", phase: "generate" },
                { icon: Clock, label: "Simulate typing", phase: "typing" },
                { icon: Send, label: "Send message", phase: "send" },
              ].map((step, i) => (
                <div key={step.phase} className="flex items-center gap-2">
                  <step.icon className={`h-3 w-3 ${
                    processing && aiPhase.toLowerCase().includes(step.phase) ? "text-blue-400" : "text-muted-foreground/40"
                  }`} />
                  <span className={`text-[10px] ${
                    processing && aiPhase.toLowerCase().includes(step.phase) ? "text-blue-400 font-medium" : "text-muted-foreground/60"
                  }`}>{step.label}</span>
                  {processing && aiPhase.toLowerCase().includes(step.phase) && (
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <ScrollArea className="flex-1">
            <div className="px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity Log</p>
              {aiProcessingLog.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 italic">No activity yet</p>
              ) : (
                <div className="space-y-1.5">
                  {[...aiProcessingLog].reverse().slice(0, 20).map((log, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[9px] text-muted-foreground/50 flex-shrink-0 mt-0.5">{log.time}</span>
                      <div className="min-w-0">
                        <span className="text-[10px] text-foreground/70 font-medium">{log.convo}</span>
                        <p className="text-[9px] text-muted-foreground truncate">{log.phase}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Controls */}
          <div className="px-3 py-2 border-t border-border">
            <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1.5" onClick={onToggleAutoRespond}>
              <Pause className="h-3 w-3" />Pause AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDMConversations;

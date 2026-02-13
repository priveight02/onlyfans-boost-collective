import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, Bot, User, RefreshCw, Play, Pause, Radio,
  Clock, CheckCircle2, AlertCircle, Send, Loader2, Wifi,
} from "lucide-react";

interface LiveDMConversationsProps {
  accountId: string;
  autoRespondActive: boolean;
  onToggleAutoRespond: () => void;
}

const LiveDMConversations = ({ accountId, autoRespondActive, onToggleAutoRespond }: LiveDMConversationsProps) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [manualReply, setManualReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations from DB
  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from("ai_dm_conversations")
      .select("*")
      .eq("account_id", accountId)
      .order("last_message_at", { ascending: false });
    setConversations(data || []);
  }, [accountId]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convoId: string) => {
    const { data } = await supabase
      .from("ai_dm_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }, []);

  // Initial load
  useEffect(() => {
    if (accountId) loadConversations();
  }, [accountId, loadConversations]);

  // Load messages when convo selected
  useEffect(() => {
    if (selectedConvo) loadMessages(selectedConvo);
  }, [selectedConvo, loadMessages]);

  // Real-time subscription for conversations
  useEffect(() => {
    if (!accountId) return;
    const channel = supabase
      .channel(`ai-dm-convos-${accountId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "ai_dm_conversations",
        filter: `account_id=eq.${accountId}`,
      }, () => { loadConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accountId, loadConversations]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConvo) return;
    const channel = supabase
      .channel(`ai-dm-msgs-${selectedConvo}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "ai_dm_messages",
        filter: `conversation_id=eq.${selectedConvo}`,
      }, () => { loadMessages(selectedConvo); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Process DMs - calls the AI pipeline
  const processDMs = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "process_live_dm", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Processing failed");
      const result = data.data;
      if (result.processed > 0) {
        toast.success(`Processed ${result.processed} conversations`);
      } else {
        toast.info(`Checked ${result.total_checked} conversations — no new messages`);
      }
      await loadConversations();
      if (selectedConvo) await loadMessages(selectedConvo);
    } catch (e: any) {
      toast.error(e.message || "Failed to process DMs");
    } finally {
      setProcessing(false);
    }
  };

  // Auto-polling when auto-respond is active
  useEffect(() => {
    if (autoRespondActive && accountId) {
      setPolling(true);
      // Poll every 30 seconds
      pollIntervalRef.current = setInterval(() => {
        processDMs();
      }, 30000);
      // Initial process
      processDMs();
    } else {
      setPolling(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [autoRespondActive, accountId]);

  // Send manual reply in a conversation
  const sendManualReply = async () => {
    if (!manualReply.trim() || !selectedConvo) return;
    const convo = conversations.find(c => c.id === selectedConvo);
    if (!convo) return;

    try {
      // Send via IG API
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: {
          action: "send_message",
          account_id: accountId,
          params: { recipient_id: convo.participant_id, message: manualReply },
        },
      });
      if (error) throw error;

      // Store in DB
      await supabase.from("ai_dm_messages").insert({
        conversation_id: selectedConvo,
        account_id: accountId,
        sender_type: "manual",
        sender_name: "you",
        content: manualReply,
        status: "sent",
        platform_message_id: data?.data?.message_id || null,
      });

      setManualReply("");
      toast.success("Message sent!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  };

  const selectedConvoData = conversations.find(c => c.id === selectedConvo);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Conversations
            </CardTitle>
            <div className="flex items-center gap-1">
              {polling && (
                <Badge variant="outline" className="text-green-400 border-green-500/30 text-[10px] animate-pulse">
                  <Wifi className="h-2.5 w-2.5 mr-1" />LIVE
                </Badge>
              )}
              <Button size="sm" variant="ghost" onClick={processDMs} disabled={processing} className="h-7 w-7 p-0">
                <RefreshCw className={`h-3.5 w-3.5 ${processing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-xs">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No conversations yet</p>
                <p className="mt-1">Turn on Auto-Respond and click Scan to start</p>
              </div>
            ) : (
              conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvo(convo.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                    selectedConvo === convo.id ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {convo.participant_avatar_url ? (
                      <img src={convo.participant_avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate">
                          @{convo.participant_username || "unknown"}
                        </span>
                        <Badge variant="outline" className={`text-[9px] px-1 ${
                          convo.status === "active" ? "text-green-400 border-green-500/30" : "text-muted-foreground"
                        }`}>
                          {convo.ai_enabled ? <Bot className="h-2.5 w-2.5" /> : null}
                          {convo.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {convo.message_count || 0} msgs
                        </span>
                        {convo.last_message_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(convo.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Panel */}
      <Card className="bg-card/50 backdrop-blur-sm border-border lg:col-span-2 flex flex-col">
        <CardHeader className="pb-2 border-b border-border/50">
          {selectedConvoData ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedConvoData.participant_avatar_url ? (
                  <img src={selectedConvoData.participant_avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">@{selectedConvoData.participant_username}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedConvoData.participant_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConvoData.redirect_sent && (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Redirected
                  </Badge>
                )}
                <Badge variant="outline" className={`text-[10px] ${
                  selectedConvoData.ai_enabled ? "text-blue-400 border-blue-500/30" : "text-muted-foreground"
                }`}>
                  {selectedConvoData.ai_enabled ? <Bot className="h-2.5 w-2.5 mr-1" /> : null}
                  {selectedConvoData.ai_enabled ? "AI Active" : "Manual"}
                </Badge>
              </div>
            </div>
          ) : (
            <CardTitle className="text-sm text-muted-foreground">Select a conversation</CardTitle>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 p-3">
            {!selectedConvo ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading messages...
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "fan" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      msg.sender_type === "fan"
                        ? "bg-muted/60 text-foreground"
                        : msg.sender_type === "ai"
                        ? "bg-blue-500/20 text-foreground border border-blue-500/20"
                        : "bg-primary/20 text-foreground border border-primary/20"
                    }`}>
                      {/* Typing indicator */}
                      {msg.status === "typing" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-[10px] text-blue-400 ml-1">AI typing...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs leading-relaxed">{msg.content}</p>
                          <div className="flex items-center justify-between mt-1 gap-2">
                            <span className="text-[9px] text-muted-foreground">
                              {msg.sender_type === "fan" ? (
                                <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{msg.sender_name}</span>
                              ) : msg.sender_type === "ai" ? (
                                <span className="flex items-center gap-0.5 text-blue-400"><Bot className="h-2.5 w-2.5" />AI</span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-primary"><Send className="h-2.5 w-2.5" />Manual</span>
                              )}
                            </span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              {msg.status === "failed" ? (
                                <AlertCircle className="h-2.5 w-2.5 text-red-400" />
                              ) : msg.status === "sent" ? (
                                <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
                              ) : (
                                <Clock className="h-2.5 w-2.5" />
                              )}
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Manual reply input */}
          {selectedConvo && (
            <div className="p-3 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  value={manualReply}
                  onChange={e => setManualReply(e.target.value)}
                  placeholder="Send a manual reply..."
                  className="text-xs bg-muted/30 border-border"
                  onKeyDown={e => e.key === "Enter" && sendManualReply()}
                />
                <Button size="sm" onClick={sendManualReply} disabled={!manualReply.trim()} className="gap-1">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveDMConversations;

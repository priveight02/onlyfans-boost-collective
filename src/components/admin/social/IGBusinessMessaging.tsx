import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw, Send, User, Image, Film, Share2, BookOpen,
  AlertCircle, Mic, Paperclip, Clock
} from "lucide-react";

interface Props { selectedAccount: string; }

const IGBusinessMessaging = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages]);

  // Real-time polling: refresh conversations every 15s and messages every 8s
  useEffect(() => {
    if (!selectedAccount) return;
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConvo) fetchMessages(selectedConvo, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedAccount, selectedConvo]);

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: selectedAccount, params }
      });
      if (error) { toast.info(error.message); return null; }
      if (!data?.success) { toast.info(data?.error || "Action failed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    const d = await callApi("get_business_conversations");
    if (d?.data) {
      setConversations(d.data);
      if (!silent) toast.success(`${d.data.length} conversations loaded`);
    }
  };

  const fetchMessages = async (convoId: string, silent = false) => {
    setSelectedConvo(convoId);
    if (!silent) setLoading(true);
    const d = await callApi("get_business_messages", { conversation_id: convoId });
    if (d?.data) {
      setMessages(d.data);
      // Extract recipient
      const convo = conversations.find(c => c.id === convoId);
      const participant = convo?.participants?.data?.find((p: any) => p.id !== convo?.id);
      if (participant) setRecipientId(participant.id);
    }
  };

  const sendMessage = async () => {
    if (!replyText || !recipientId) { toast.error("Enter message and recipient"); return; }
    const d = await callApi("send_business_message", { recipient_id: recipientId, message: replyText });
    if (d) {
      toast.success("Message sent!");
      setReplyText("");
      if (selectedConvo) fetchMessages(selectedConvo, true);
    }
  };

  // ===== Render helpers =====
  const getAttachmentType = (att: any): string => {
    if (att?.type) return att.type.toLowerCase();
    const url = att?.image_data?.url || att?.video_data?.url || att?.file_url || att?.url || "";
    if (url.match(/\.(mp4|mov|webm)/i)) return "video";
    if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) return "image";
    if (url.match(/\.(mp3|ogg|wav|m4a|aac|opus)/i)) return "audio";
    return "file";
  };

  const getAttachmentUrl = (att: any): string => {
    return att?.image_data?.url || att?.video_data?.url || att?.file_url || att?.url
      || att?.image_data?.preview_url || att?.video_data?.preview_url || "";
  };

  const renderMessageContent = (msg: any) => {
    const attachments = msg.attachments?.data || [];
    const story = msg.story;
    const shares = msg.shares?.data || [];
    const hasText = !!msg.message;
    const hasMedia = attachments.length > 0 || story || shares.length > 0;

    return (
      <div className="space-y-1.5">
        {/* Text message */}
        {hasText && (
          <p className="text-xs text-foreground bg-muted/40 rounded-2xl px-3 py-2 inline-block max-w-[80%] leading-relaxed">
            {msg.message}
          </p>
        )}

        {/* Story mention */}
        {story && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 max-w-[240px]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-primary">Story Mention</span>
            </div>
            {story.url ? (
              story.url.match(/\.(mp4|mov|webm)/i) ? (
                <video src={story.url} controls playsInline preload="metadata" className="w-full rounded-lg" />
              ) : (
                <img src={story.url} alt="Story" className="w-full rounded-lg" loading="lazy" />
              )
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[11px] italic">Story no longer available</span>
              </div>
            )}
          </div>
        )}

        {/* Shared posts */}
        {shares.map((share: any, i: number) => (
          <div key={`share-${i}`} className="rounded-xl border border-border/50 bg-muted/20 p-2.5 max-w-[240px]">
            <div className="flex items-center gap-1.5 mb-1">
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">Shared Post</span>
            </div>
            {share.link && (
              <a href={share.link} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline break-all block">
                {share.name || "View Post →"}
              </a>
            )}
            {share.description && <p className="text-[10px] text-muted-foreground mt-1">{share.description}</p>}
          </div>
        ))}

        {/* Attachments */}
        {attachments.map((att: any, i: number) => {
          const type = getAttachmentType(att);
          const url = getAttachmentUrl(att);

          if (!url) return null;

          // ===== PHOTO — Instagram-style pill =====
          if (type === "image") {
            return (
              <div key={`att-${i}`} className="space-y-1">
                {/* IG-style "Sent A Photo" pill */}
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full px-4 py-2 transition-colors cursor-pointer">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Sent A Photo</span>
                </a>
                {/* Actual image preview below */}
                <img src={url} alt="Photo" className="max-w-[200px] rounded-xl shadow-sm" loading="lazy" />
              </div>
            );
          }

          // ===== VIDEO =====
          if (type === "video") {
            return (
              <div key={`att-${i}`} className="space-y-1">
                <div className="inline-flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-4 py-2">
                  <Film className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Sent A Video</span>
                </div>
                <video src={url} controls playsInline preload="metadata" className="max-w-[240px] rounded-xl shadow-sm" />
              </div>
            );
          }

          // ===== AUDIO / VOICE NOTE =====
          if (type === "audio") {
            return (
              <div key={`att-${i}`} className="space-y-1">
                <div className="inline-flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-4 py-2">
                  <Mic className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Voice Note</span>
                </div>
                <audio src={url} controls preload="metadata" className="max-w-[240px] h-10" />
              </div>
            );
          }

          // ===== Generic file =====
          return (
            <a key={`att-${i}`} href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-muted/50 hover:bg-muted text-foreground rounded-full px-4 py-2 transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{att.name || "Attachment"}</span>
            </a>
          );
        })}

        {/* Fallback for messages with no text and no recognized media */}
        {!hasText && !hasMedia && (
          <div className="inline-flex items-center gap-2 bg-muted/30 text-muted-foreground rounded-full px-4 py-2">
            <Paperclip className="h-3.5 w-3.5" />
            <span className="text-xs">Media message</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Button size="sm" variant="outline" onClick={() => fetchConversations(false)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Load Conversations
        </Button>
        <Badge variant="outline" className="text-[10px]">instagram_business_manage_messages</Badge>
        {loading && <span className="text-[10px] text-muted-foreground animate-pulse">Syncing…</span>}
        <Badge variant="secondary" className="text-[9px] ml-auto">
          <Clock className="h-3 w-3 mr-1" />Auto-refresh 15s
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ minHeight: 480 }}>
        {/* Conversation list */}
        <ScrollArea className="md:col-span-1 border border-border/50 rounded-xl" style={{ maxHeight: 560 }}>
          <div className="p-2 space-y-1">
            {conversations.map(c => {
              const lastMsg = c.messages?.data?.[0];
              const participant = c.participants?.data?.[0];
              const isSelected = selectedConvo === c.id;
              return (
                <button key={c.id} onClick={() => fetchMessages(c.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30 shadow-sm"
                      : "hover:bg-muted/40 border border-transparent"
                  }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {participant?.name || participant?.username || "User"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {lastMsg?.message || "📎 Media"}
                      </p>
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {c.updated_time ? new Date(c.updated_time).toLocaleDateString() : ""}
                    </span>
                  </div>
                </button>
              );
            })}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">No conversations. Click refresh.</p>
            )}
          </div>
        </ScrollArea>

        {/* Messages */}
        <div className="md:col-span-2 border border-border/50 rounded-xl flex flex-col" style={{ maxHeight: 560 }}>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="group">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-semibold text-foreground">
                      {m.from?.name || m.from?.username || "User"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.created_time).toLocaleString()}
                    </span>
                  </div>
                  {renderMessageContent(m)}
                </div>
              ))}
              <div ref={messagesEndRef} />
              {selectedConvo && messages.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground text-center py-8">No messages in this conversation</p>
              )}
              {!selectedConvo && (
                <p className="text-xs text-muted-foreground text-center py-8">Select a conversation</p>
              )}
            </div>
          </ScrollArea>
          {selectedConvo && (
            <div className="flex gap-2 p-3 border-t border-border/50">
              <Input
                placeholder="Reply…"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="text-sm flex-1"
                onKeyDown={e => e.key === "Enter" && sendMessage()}
              />
              <Button size="sm" onClick={sendMessage} disabled={loading}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IGBusinessMessaging;
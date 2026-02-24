import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw, Send, User, Image, Film, Share2, BookOpen,
  AlertCircle, Mic, Paperclip, Clock, Trash2, Play
} from "lucide-react";

interface Props { selectedAccount: string; }

/** Recursively extract ALL URLs from any nested object */
const extractUrls = (obj: any): string[] => {
  const urls: string[] = [];
  if (!obj) return urls;
  if (typeof obj === "string" && (obj.startsWith("http://") || obj.startsWith("https://"))) {
    urls.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => urls.push(...extractUrls(item)));
  } else if (typeof obj === "object") {
    Object.values(obj).forEach(val => urls.push(...extractUrls(val)));
  }
  return [...new Set(urls)]; // dedupe
};

const guessMediaType = (url: string): "image" | "video" | "audio" | "file" => {
  const lower = url.toLowerCase();
  if (lower.match(/\.(mp4|mov|webm|avi)/)) return "video";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic)/)) return "image";
  if (lower.match(/\.(mp3|ogg|wav|m4a|aac|opus|amr|3gp)/)) return "audio";
  // Instagram CDN URLs often don't have extensions — check for known patterns
  if (lower.includes("video") || lower.includes(".mp4")) return "video";
  if (lower.includes("audio") || lower.includes("voice")) return "audio";
  return "image"; // Default to image for IG CDN urls without extension
};

const IGBusinessMessaging = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convoPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  }, [messages]);

  // Real-time polling for active conversation messages (every 5s)
  useEffect(() => {
    if (!selectedConvo || !selectedAccount) return;
    
    const poll = () => {
      fetchMessages(selectedConvo, true);
      pollTimerRef.current = setTimeout(poll, 5000);
    };
    pollTimerRef.current = setTimeout(poll, 5000);
    
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [selectedConvo, selectedAccount]);

  // Real-time polling for conversation list (every 10s)
  useEffect(() => {
    if (!selectedAccount) return;
    
    const poll = () => {
      fetchConversations(true);
      convoPollRef.current = setTimeout(poll, 10000);
    };
    convoPollRef.current = setTimeout(poll, 10000);
    
    return () => {
      if (convoPollRef.current) clearTimeout(convoPollRef.current);
    };
  }, [selectedAccount]);

  const callApi = useCallback(async (action: string, params?: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: selectedAccount, params }
      });
      if (error) return null;
      if (!data?.success) return null;
      return data.data;
    } catch { return null; }
  }, [selectedAccount]);

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    const d = await callApi("get_business_conversations");
    if (d?.data) {
      setConversations(d.data);
      if (!silent) toast.success(`${d.data.length} conversations loaded`);
    }
    if (!silent) setLoading(false);
  };

  const fetchMessages = async (convoId: string, silent = false) => {
    if (!silent) {
      setSelectedConvo(convoId);
      setLoading(true);
    }
    const d = await callApi("get_business_messages", { conversation_id: convoId });
    if (d?.data) {
      setMessages(prev => {
        // Merge: keep deleted flags from previous state
        const prevMap = new Map(prev.map((m: any) => [m.id, m]));
        const newMsgs = d.data.map((m: any) => ({
          ...m,
          _deleted: prevMap.get(m.id)?._deleted || false,
        }));
        // Detect deleted: messages in prev but not in new
        const newIds = new Set(d.data.map((m: any) => m.id));
        const deletedMsgs = prev
          .filter((m: any) => !newIds.has(m.id))
          .map((m: any) => ({ ...m, _deleted: true }));
        
        // Combine and sort
        const combined = [...newMsgs, ...deletedMsgs];
        combined.sort((a: any, b: any) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
        return combined;
      });
      // Extract recipient
      const convo = conversations.find(c => c.id === convoId);
      const participant = convo?.participants?.data?.find((p: any) => p.id !== convo?.id);
      if (participant) setRecipientId(participant.id);
    }
    if (!silent) setLoading(false);
  };

  const sendMessage = async () => {
    if (!replyText || !recipientId) { toast.error("Enter message and recipient"); return; }
    setLoading(true);
    const d = await callApi("send_business_message", { recipient_id: recipientId, message: replyText });
    if (d) {
      toast.success("Message sent!");
      setReplyText("");
      if (selectedConvo) fetchMessages(selectedConvo, true);
    }
    setLoading(false);
  };

  // ===== Render a single message's media content =====
  const renderMessageContent = (msg: any) => {
    if (msg._deleted) {
      return (
        <div className="inline-flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl px-4 py-2">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium italic">Message was deleted</span>
          {msg.message && <span className="text-[10px] opacity-60 line-through ml-1">{msg.message}</span>}
        </div>
      );
    }

    const attachments = msg.attachments?.data || [];
    const story = msg.story;
    const shares = msg.shares?.data || [];
    const hasText = !!msg.message;
    const isUnsupported = msg.is_unsupported;

    return (
      <div className="space-y-1.5">
        {/* Text */}
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
          </div>
        ))}

        {/* Attachments — use deep URL extraction to catch ALL media */}
        {attachments.map((att: any, i: number) => {
          // Get the explicit type from IG API
          const apiType = (att.type || "").toLowerCase();
          
          // Deep-extract all URLs from the attachment object
          const allUrls = extractUrls(att);
          // Filter out non-media URLs (like API endpoints)
          const mediaUrls = allUrls.filter(u => !u.includes("graph.facebook.com") && !u.includes("graph.instagram.com"));
          const primaryUrl = mediaUrls[0] || "";

          if (!primaryUrl) {
            // No URL found — show a generic label
            return (
              <div key={`att-${i}`} className="inline-flex items-center gap-2 bg-muted/30 text-muted-foreground rounded-full px-4 py-2">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="text-xs">{apiType || "attachment"}</span>
              </div>
            );
          }

          // Determine type: prefer API type, fallback to URL guessing
          let mediaType: "image" | "video" | "audio" | "file" = "image";
          if (apiType === "audio" || apiType.includes("audio") || apiType.includes("voice")) {
            mediaType = "audio";
          } else if (apiType === "video" || apiType.includes("video") || apiType === "animated_image_share") {
            mediaType = "video";
          } else if (apiType === "image" || apiType.includes("image") || apiType === "photo") {
            mediaType = "image";
          } else {
            mediaType = guessMediaType(primaryUrl);
          }

          // ===== AUDIO / VOICE NOTE =====
          if (mediaType === "audio") {
            return (
              <div key={`att-${i}`} className="space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-4 py-2.5 shadow-sm">
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-semibold">Voice Note</span>
                </div>
                <div className="bg-muted/30 rounded-xl p-2 max-w-[280px]">
                  <audio src={primaryUrl} controls preload="metadata" className="w-full h-10" controlsList="nodownload" />
                </div>
              </div>
            );
          }

          // ===== VIDEO =====
          if (mediaType === "video") {
            return (
              <div key={`att-${i}`} className="space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-4 py-2">
                  <Film className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Sent A Video</span>
                </div>
                <video src={primaryUrl} controls playsInline preload="metadata"
                  className="max-w-[240px] rounded-xl shadow-sm" />
              </div>
            );
          }

          // ===== IMAGE — IG-style pill =====
          if (mediaType === "image") {
            return (
              <div key={`att-${i}`} className="space-y-1.5">
                <a href={primaryUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full px-4 py-2 transition-colors cursor-pointer shadow-sm">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Sent A Photo</span>
                </a>
                <img src={primaryUrl} alt="Photo" className="max-w-[200px] rounded-xl shadow-sm" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            );
          }

          // ===== Generic file =====
          return (
            <a key={`att-${i}`} href={primaryUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-muted/50 hover:bg-muted text-foreground rounded-full px-4 py-2 transition-colors shadow-sm">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{att.name || "Attachment"}</span>
            </a>
          );
        })}

        {/* Unsupported message type */}
        {isUnsupported && !hasText && attachments.length === 0 && !story && shares.length === 0 && (
          <div className="inline-flex items-center gap-2 bg-muted/30 text-muted-foreground rounded-full px-4 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs italic">Unsupported message type</span>
          </div>
        )}

        {/* Fallback for completely empty messages */}
        {!hasText && !isUnsupported && attachments.length === 0 && !story && shares.length === 0 && (
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
          <Clock className="h-3 w-3 mr-1" />Live sync
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ minHeight: 480 }}>
        {/* Conversation list */}
        <ScrollArea className="md:col-span-1 border border-border/50 rounded-xl" style={{ maxHeight: 580 }}>
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
        <div className="md:col-span-2 border border-border/50 rounded-xl flex flex-col" style={{ maxHeight: 580 }}>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`group ${m._deleted ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-semibold text-foreground">
                      {m.from?.name || m.from?.username || "User"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.created_time).toLocaleString()}
                    </span>
                    {m._deleted && (
                      <Badge variant="destructive" className="text-[8px] h-4 px-1.5">DELETED</Badge>
                    )}
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

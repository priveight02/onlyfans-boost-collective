import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  RefreshCw, Send, User, Image, Film, Share2, BookOpen,
  AlertCircle, Mic, Paperclip, Clock, Trash2, Play
} from "lucide-react";

interface Props { selectedAccount: string; }

/**
 * Extract the BEST media URL from an IG attachment object.
 * The edge function normalizes into _media_url/_media_type, but we also
 * do a deep search as fallback.
 */
const getAttachmentMedia = (att: any): { url: string; type: string } => {
  // Use normalized fields from edge function
  if (att._media_url) {
    return { url: att._media_url, type: att._media_type || guessTypeFromUrl(att._media_url) };
  }

  // Fallback: try known IG API fields
  const url =
    att.file_url ||
    att.image_data?.url || att.image_data?.src || att.image_data?.preview_url ||
    att.video_data?.url || att.video_data?.preview_url ||
    att.audio_data?.url ||
    att.url ||
    null;

  if (url) {
    const apiType = (att.type || att.mime_type || att._media_type || "").toLowerCase();
    return { url, type: apiType || guessTypeFromUrl(url) };
  }

  // Deep search: recursively find any http URL
  const deepUrls = deepExtractUrls(att);
  const mediaUrl = deepUrls.find(u => !u.includes("graph.facebook.com") && !u.includes("graph.instagram.com"));
  if (mediaUrl) {
    const apiType = (att.type || att.mime_type || "").toLowerCase();
    return { url: mediaUrl, type: apiType || guessTypeFromUrl(mediaUrl) };
  }

  return { url: "", type: (att.type || att.mime_type || "unknown").toLowerCase() };
};

const deepExtractUrls = (obj: any): string[] => {
  const urls: string[] = [];
  if (!obj) return urls;
  if (typeof obj === "string" && (obj.startsWith("http://") || obj.startsWith("https://"))) {
    urls.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => urls.push(...deepExtractUrls(item)));
  } else if (typeof obj === "object") {
    Object.values(obj).forEach(val => urls.push(...deepExtractUrls(val)));
  }
  return [...new Set(urls)];
};

const guessTypeFromUrl = (url: string): string => {
  const u = url.toLowerCase();
  if (u.match(/\.(mp4|mov|webm|avi)/)) return "video";
  if (u.match(/\.(mp3|ogg|wav|m4a|aac|opus|amr|3gp)/)) return "audio";
  if (u.match(/\.(jpg|jpeg|png|gif|webp)/)) return "image";
  if (u.includes("audio") || u.includes("voice")) return "audio";
  if (u.includes("video")) return "video";
  return "image"; // default for IG CDN
};

const normalizeMediaType = (rawType: string): "image" | "video" | "audio" | "file" => {
  const t = rawType.toLowerCase();
  if (t.includes("audio") || t.includes("voice") || t === "audio") return "audio";
  if (t.includes("video") || t === "animated_image_share" || t === "ig_reel" || t === "video") return "video";
  if (t.includes("image") || t === "photo" || t === "image" || t === "share" || t === "story_mention" || t === "fallback") return "image";
  return "file";
};

// ===== Message cache (in-memory per convo) =====
const messageCache = new Map<string, { messages: any[]; lastFetchedAt: string }>();

const IGBusinessMessaging = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const messagesParentRef = useRef<HTMLDivElement>(null);
  const convoParentRef = useRef<HTMLDivElement>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUnmounted = useRef(false);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    isUnmounted.current = false;
    return () => { isUnmounted.current = true; };
  }, []);

  // Message virtualizer
  const msgVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesParentRef.current,
    estimateSize: () => 80,
    overscan: 15,
  });

  // Conversation virtualizer
  const convoVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => convoParentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollRef.current && messages.length > 0) {
      setTimeout(() => msgVirtualizer.scrollToIndex(messages.length - 1, { align: "end" }), 50);
    }
  }, [messages.length]);

  // Conversation list polling — every 8s
  useEffect(() => {
    if (!selectedAccount) return;
    convoPollRef.current = setInterval(() => fetchConversations(true), 8000);
    return () => { if (convoPollRef.current) clearInterval(convoPollRef.current); };
  }, [selectedAccount]);

  // Message polling — every 3s for active convo (delta sync)
  useEffect(() => {
    if (!selectedConvo) return;
    msgPollRef.current = setInterval(() => deltaSync(selectedConvo), 3000);
    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current); };
  }, [selectedConvo, selectedAccount]);

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
    if (d?.data && !isUnmounted.current) {
      setConversations(d.data);
      if (!silent) toast.success(`${d.data.length} conversations loaded`);
    }
    if (!silent) setLoading(false);
  };

  const fetchMessages = async (convoId: string) => {
    setSelectedConvo(convoId);
    autoScrollRef.current = true;

    // Check cache first
    const cached = messageCache.get(convoId);
    if (cached) {
      setMessages(cached.messages);
      deltaSync(convoId);
      extractRecipient(convoId);
      return;
    }

    setLoading(true);
    const d = await callApi("get_business_messages", { conversation_id: convoId });
    if (d?.data && !isUnmounted.current) {
      const sorted = [...d.data].sort((a: any, b: any) =>
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      );
      setMessages(sorted);
      messageCache.set(convoId, { messages: sorted, lastFetchedAt: new Date().toISOString() });
      extractRecipient(convoId);
    }
    setLoading(false);
  };

  const deltaSync = async (convoId: string) => {
    const cached = messageCache.get(convoId);
    const since = cached?.lastFetchedAt;

    const d = await callApi("get_business_messages", {
      conversation_id: convoId,
      ...(since ? { since } : {})
    });

    if (!d?.data || isUnmounted.current) return;
    if (d.delta && d.data.length === 0) return;

    const now = new Date().toISOString();

    if (d.delta && cached) {
      const existingIds = new Set(cached.messages.map((m: any) => m.id));
      const newMsgs = d.data.filter((m: any) => !existingIds.has(m.id));
      if (newMsgs.length > 0) {
        const merged = [...cached.messages, ...newMsgs].sort((a: any, b: any) =>
          new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
        );
        messageCache.set(convoId, { messages: merged, lastFetchedAt: now });
        if (convoId === selectedConvo) setMessages(merged);
      } else {
        messageCache.set(convoId, { ...cached, lastFetchedAt: now });
      }
    } else {
      const sorted = [...d.data].sort((a: any, b: any) =>
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      );
      messageCache.set(convoId, { messages: sorted, lastFetchedAt: now });
      if (convoId === selectedConvo) setMessages(sorted);
    }
  };

  const extractRecipient = (convoId: string) => {
    const convo = conversations.find(c => c.id === convoId);
    const participant = convo?.participants?.data?.find((p: any) => p.id !== convo?.id);
    if (participant) setRecipientId(participant.id);
  };

  const sendMessage = async () => {
    if (!replyText || !recipientId) { toast.error("Enter message and recipient"); return; }
    setLoading(true);
    const d = await callApi("send_business_message", { recipient_id: recipientId, message: replyText });
    if (d) {
      toast.success("Sent!");
      setReplyText("");
      autoScrollRef.current = true;
      if (selectedConvo) setTimeout(() => deltaSync(selectedConvo), 500);
    }
    setLoading(false);
  };

  // ===== Render message content =====
  const renderContent = useCallback((msg: any) => {
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
        {hasText && (
          <p className="text-xs text-foreground bg-muted/40 rounded-2xl px-3 py-2 inline-block max-w-[80%] leading-relaxed">
            {msg.message}
          </p>
        )}

        {/* Story */}
        {story && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 max-w-[240px]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-primary">Story Mention</span>
            </div>
            {story.url ? (
              story.url.match(/\.(mp4|mov|webm)/i)
                ? <video src={story.url} controls playsInline preload="metadata" className="w-full rounded-lg" />
                : <img src={story.url} alt="Story" className="w-full rounded-lg" loading="lazy" />
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[11px] italic">Story no longer available</span>
              </div>
            )}
          </div>
        )}

        {/* Shares */}
        {shares.map((share: any, i: number) => (
          <div key={`sh-${i}`} className="rounded-xl border border-border/50 bg-muted/20 p-2.5 max-w-[240px]">
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

        {/* Attachments — uses proper IG API field extraction */}
        {attachments.map((att: any, i: number) => {
          const { url, type: rawType } = getAttachmentMedia(att);
          const mediaType = normalizeMediaType(rawType || att.type || "");

          if (!url) {
            return (
              <div key={`att-${i}`} className="inline-flex items-center gap-2 bg-muted/30 text-muted-foreground rounded-full px-4 py-2">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="text-xs">{rawType || att.type || "attachment"}</span>
              </div>
            );
          }

          if (mediaType === "audio") {
            return (
              <div key={`att-${i}`} className="space-y-1.5 max-w-[280px]">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full px-4 py-2.5 shadow-md">
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-semibold">Voice Note</span>
                </div>
                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/30">
                  <audio controls preload="auto" className="w-full h-10" controlsList="nodownload">
                    <source src={url} type="audio/mp4" />
                    <source src={url} type="audio/aac" />
                    <source src={url} type="audio/mpeg" />
                    <source src={url} type="audio/ogg" />
                    <source src={url} />
                    Your browser does not support audio.
                  </audio>
                </div>
              </div>
            );
          }

          if (mediaType === "video") {
            return (
              <div key={`att-${i}`} className="space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-4 py-2">
                  <Film className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Video</span>
                </div>
                <video src={url} controls playsInline preload="metadata" className="max-w-[240px] rounded-xl shadow-sm" />
              </div>
            );
          }

          if (mediaType === "image") {
            return (
              <div key={`att-${i}`} className="space-y-1.5">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full px-4 py-2 transition-colors cursor-pointer shadow-sm">
                  <Image className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Photo</span>
                </a>
                <img src={url} alt="Photo" className="max-w-[200px] rounded-xl shadow-sm" loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            );
          }

          return (
            <a key={`att-${i}`} href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-muted/50 hover:bg-muted text-foreground rounded-full px-4 py-2 transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{att.name || "Attachment"}</span>
            </a>
          );
        })}

        {isUnsupported && !hasText && attachments.length === 0 && !story && shares.length === 0 && (
          <div className="inline-flex items-center gap-2 bg-muted/30 text-muted-foreground rounded-full px-4 py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs italic">Unsupported message type</span>
          </div>
        )}

        {!hasText && !isUnsupported && attachments.length === 0 && !story && shares.length === 0 && (
          <div className="inline-flex items-center gap-2 bg-muted/30 text-muted-foreground rounded-full px-4 py-2">
            <Paperclip className="h-3.5 w-3.5" />
            <span className="text-xs">Media message</span>
          </div>
        )}
      </div>
    );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Button size="sm" variant="outline" onClick={() => fetchConversations(false)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Conversations
        </Button>
        <Badge variant="outline" className="text-[10px]">instagram_business_manage_messages</Badge>
        {loading && <span className="text-[10px] text-muted-foreground animate-pulse">Syncing…</span>}
        <Badge variant="secondary" className="text-[9px] ml-auto gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live · 3s sync
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ minHeight: 480 }}>
        {/* Conversation list — virtualized */}
        <div
          ref={convoParentRef}
          className="md:col-span-1 border border-border/50 rounded-xl overflow-auto p-2"
          style={{ maxHeight: 580 }}
        >
          <div style={{ height: convoVirtualizer.getTotalSize(), width: "100%", position: "relative" }}>
            {convoVirtualizer.getVirtualItems().map(virtualRow => {
              const c = conversations[virtualRow.index];
              const lastMsg = c.messages?.data?.[0];
              const participant = c.participants?.data?.[0];
              return (
                <button
                  key={c.id}
                  ref={convoVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  onClick={() => fetchMessages(c.id)}
                  className={`absolute left-0 right-0 text-left p-2.5 rounded-xl transition-all ${
                    selectedConvo === c.id
                      ? "bg-primary/10 border border-primary/30 shadow-sm"
                      : "hover:bg-muted/40 border border-transparent"
                  }`}
                  style={{ top: virtualRow.start }}
                >
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
              <p className="text-xs text-muted-foreground p-3 text-center">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Messages — virtualized */}
        <div className="md:col-span-2 border border-border/50 rounded-xl flex flex-col" style={{ maxHeight: 580 }}>
          <div
            ref={messagesParentRef}
            className="flex-1 overflow-auto p-3"
            style={{ contain: "strict" }}
            onScroll={() => {
              if (!messagesParentRef.current) return;
              const el = messagesParentRef.current;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
              autoScrollRef.current = atBottom;
            }}
          >
            <div style={{ height: msgVirtualizer.getTotalSize(), width: "100%", position: "relative" }}>
              {msgVirtualizer.getVirtualItems().map(virtualRow => {
                const m = messages[virtualRow.index];
                return (
                  <div
                    key={m.id}
                    ref={msgVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className={`absolute left-0 right-0 group ${m._deleted ? "opacity-60" : ""}`}
                    style={{ top: virtualRow.start }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-semibold text-foreground">
                        {m.from?.name || m.from?.username || "User"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.created_time).toLocaleString()}
                      </span>
                      {m._deleted && <Badge variant="destructive" className="text-[8px] h-4 px-1.5">DELETED</Badge>}
                    </div>
                    {renderContent(m)}
                  </div>
                );
              })}
              {selectedConvo && messages.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground text-center py-8">No messages</p>
              )}
              {!selectedConvo && (
                <p className="text-xs text-muted-foreground text-center py-8">Select a conversation</p>
              )}
            </div>
          </div>
          {selectedConvo && (
            <div className="flex gap-2 p-3 border-t border-border/50">
              <Input placeholder="Reply…" value={replyText}
                onChange={e => setReplyText(e.target.value)} className="text-sm flex-1"
                onKeyDown={e => e.key === "Enter" && sendMessage()} />
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

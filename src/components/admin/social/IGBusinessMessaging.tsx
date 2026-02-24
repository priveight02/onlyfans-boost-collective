import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Send, User, Image, Film, Share2, BookOpen, AlertCircle } from "lucide-react";

interface Props { selectedAccount: string; }

const IGBusinessMessaging = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", { body: { action, account_id: selectedAccount, params } });
      if (error) { toast.info(error.message); return null; }
      if (!data?.success) { toast.info(data?.error || "Action failed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const fetchConversations = async () => {
    const d = await callApi("get_business_conversations", { limit: 20 });
    if (d?.data) { setConversations(d.data); toast.success(`${d.data.length} conversations`); }
  };

  const fetchMessages = async (convoId: string) => {
    setSelectedConvo(convoId);
    const d = await callApi("get_business_messages", { conversation_id: convoId });
    if (d?.data) {
      // Sort oldest first so chat reads top-to-bottom
      const sorted = [...d.data].sort((a: any, b: any) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
      setMessages(sorted);
      const convo = conversations.find(c => c.id === convoId);
      const participant = convo?.participants?.data?.find((p: any) => p.id !== convo?.id);
      if (participant) setRecipientId(participant.id);
    }
  };

  const sendMessage = async () => {
    if (!replyText || !recipientId) { toast.error("Enter message and recipient"); return; }
    const d = await callApi("send_business_message", { recipient_id: recipientId, message: replyText });
    if (d) { toast.success("Message sent!"); setReplyText(""); if (selectedConvo) fetchMessages(selectedConvo); }
  };

  const renderAttachments = (msg: any) => {
    const attachments = msg.attachments?.data || [];
    const story = msg.story;
    const shares = msg.shares?.data || [];

    return (
      <>
        {/* Story mention */}
        {story && (
          <div className="mt-1 rounded-lg border border-primary/20 bg-primary/5 p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">Story Mention</span>
            </div>
            {story.url ? (
              story.url.match(/\.(mp4|mov|webm)/i) ? (
                <video src={story.url} controls playsInline preload="metadata" className="max-w-[200px] rounded" />
              ) : (
                <img src={story.url} alt="Story" className="max-w-[200px] rounded" />
              )
            ) : (
              <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Story no longer available
              </p>
            )}
          </div>
        )}

        {/* Shared posts */}
        {shares.map((share: any, i: number) => (
          <div key={`share-${i}`} className="mt-1 rounded-lg border border-accent/30 bg-accent/5 p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Share2 className="h-3 w-3 text-accent-foreground" />
              <span className="text-[10px] font-medium text-accent-foreground">Shared Post</span>
            </div>
            {share.link && (
              <a href={share.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline break-all">
                {share.name || share.link}
              </a>
            )}
            {share.description && <p className="text-[10px] text-muted-foreground mt-0.5">{share.description}</p>}
          </div>
        ))}

        {/* Attachments (images, videos, audio, etc.) */}
        {attachments.map((att: any, i: number) => {
          const type = att.type || att.mime_type || "";
          const url = att.image_data?.url || att.video_data?.url || att.file_url || att.url || "";
          const preview = att.image_data?.preview_url || att.video_data?.preview_url || "";

          if (!url && !preview) return null;

          if (type.includes("video") || type === "video" || url.match(/\.(mp4|mov|webm)/i)) {
            return (
              <div key={`att-${i}`} className="mt-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <Film className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Video</span>
                </div>
                <video src={url || preview} controls playsInline preload="metadata" className="max-w-[220px] rounded-lg" />
              </div>
            );
          }

          if (type.includes("image") || type === "image" || url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            return (
              <div key={`att-${i}`} className="mt-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <Image className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Image</span>
                </div>
                <img src={url || preview} alt="Attachment" className="max-w-[220px] rounded-lg" loading="lazy" />
              </div>
            );
          }

          if (type.includes("audio") || url.match(/\.(mp3|ogg|wav|m4a)/i)) {
            return (
              <div key={`att-${i}`} className="mt-1">
                <audio src={url} controls preload="metadata" className="max-w-[220px]" />
              </div>
            );
          }

          // Generic file / link
          return (
            <div key={`att-${i}`} className="mt-1">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">
                📎 {att.name || "Attachment"}
              </a>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={fetchConversations} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Load Conversations
        </Button>
        <Badge variant="outline" className="text-[10px]">instagram_business_manage_messages</Badge>
        {loading && <span className="text-[10px] text-muted-foreground animate-pulse">Loading…</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ minHeight: 420 }}>
        {/* Conversation list */}
        <ScrollArea className="md:col-span-1 border border-border/50 rounded-lg p-2" style={{ maxHeight: 500 }}>
          {conversations.map(c => {
            const lastMsg = c.messages?.data?.[0];
            const participant = c.participants?.data?.[0];
            return (
              <button key={c.id} onClick={() => fetchMessages(c.id)} className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${selectedConvo === c.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{participant?.name || participant?.username || "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lastMsg?.message || "📎 Media"}</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{c.updated_time ? new Date(c.updated_time).toLocaleDateString() : ""}</p>
              </button>
            );
          })}
          {conversations.length === 0 && <p className="text-xs text-muted-foreground p-2">No conversations. Click refresh.</p>}
        </ScrollArea>

        {/* Messages */}
        <div className="md:col-span-2 border border-border/50 rounded-lg p-3 flex flex-col" style={{ maxHeight: 500 }}>
          <ScrollArea className="flex-1 mb-2 pr-1">
            {messages.map(m => (
              <div key={m.id} className="mb-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{m.from?.name || m.from?.username || "User"}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_time).toLocaleString()}</span>
                </div>
                {m.message && (
                  <p className="text-xs text-foreground bg-muted/30 rounded px-2 py-1.5 inline-block max-w-[85%]">{m.message}</p>
                )}
                {renderAttachments(m)}
                {!m.message && !(m.attachments?.data?.length) && !m.story && !(m.shares?.data?.length) && (
                  <p className="text-xs text-muted-foreground italic">📎 Media message</p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
            {selectedConvo && messages.length === 0 && !loading && <p className="text-xs text-muted-foreground">No messages in this conversation</p>}
            {!selectedConvo && <p className="text-xs text-muted-foreground">Select a conversation</p>}
          </ScrollArea>
          {selectedConvo && (
            <div className="flex gap-2">
              <Input placeholder="Reply..." value={replyText} onChange={e => setReplyText(e.target.value)} className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && sendMessage()} />
              <Button size="sm" onClick={sendMessage} disabled={loading}><Send className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IGBusinessMessaging;
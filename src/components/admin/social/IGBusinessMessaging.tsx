import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, Send, User, Loader2 } from "lucide-react";

interface Props { selectedAccount: string; }

const IGBusinessMessaging = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [recipientId, setRecipientId] = useState("");

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
    const d = await callApi("get_business_messages", { conversation_id: convoId, limit: 20 });
    if (d?.data) {
      setMessages(d.data);
      // Extract recipient from participants
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={fetchConversations} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Conversations</Button>
        <Badge variant="outline" className="text-[10px]">instagram_business_manage_messages</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ minHeight: 350 }}>
        {/* Conversation list */}
        <ScrollArea className="md:col-span-1 border border-border/50 rounded-lg p-2" style={{ maxHeight: 400 }}>
          {conversations.map(c => {
            const lastMsg = c.messages?.data?.[0];
            const participant = c.participants?.data?.[0];
            return (
              <button key={c.id} onClick={() => fetchMessages(c.id)} className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${selectedConvo === c.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{participant?.name || participant?.username || "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lastMsg?.message || "..."}</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{c.updated_time ? new Date(c.updated_time).toLocaleDateString() : ""}</p>
              </button>
            );
          })}
          {conversations.length === 0 && <p className="text-xs text-muted-foreground p-2">No conversations. Click refresh.</p>}
        </ScrollArea>

        {/* Messages */}
        <div className="md:col-span-2 border border-border/50 rounded-lg p-3 flex flex-col" style={{ maxHeight: 400 }}>
          <ScrollArea className="flex-1 mb-2">
            {messages.map(m => (
              <div key={m.id} className="mb-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{m.from?.name || m.from?.username || "User"}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_time).toLocaleString()}</span>
                </div>
                <p className="text-xs text-foreground bg-muted/30 rounded px-2 py-1">{m.message || "(attachment)"}</p>
              </div>
            ))}
            {selectedConvo && messages.length === 0 && <p className="text-xs text-muted-foreground">No messages</p>}
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

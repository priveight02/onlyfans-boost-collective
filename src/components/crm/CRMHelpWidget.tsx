import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, X, Send, Loader2, Paperclip, Bot, Mail, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

type ChatMsg = { role: "user" | "assistant"; content: string };

const CRMHelpWidget = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  // Email form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message required"); return; }
    setSending(true);

    let attachmentUrl: string | undefined;
    if (attachmentFile) {
      const path = `support/${crypto.randomUUID()}.${attachmentFile.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, attachmentFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
        attachmentUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("support_tickets").insert({
      user_id: user?.id,
      subject: subject.trim(),
      email: profile?.email || user?.email || "",
      message: message.trim(),
      attachment_url: attachmentUrl || null,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Support request sent! We'll get back to you soon.");
      setSubject("");
      setMessage("");
      setAttachmentFile(null);
    }
    setSending(false);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput("");
    scrollToBottom();
    setChatLoading(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          context: "You are a helpful support assistant for the CRM platform. Help users with their questions about the platform, features, and troubleshooting. Be concise and friendly.",
        }),
      });

      if (!resp.ok) throw new Error("Failed to get response");

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        setChatMessages([...newMsgs, { role: "assistant", content: data.content || "Sorry, I couldn't process that." }]);
      } else if (resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";
        let buf = "";

        setChatMessages([...newMsgs, { role: "assistant", content: "▍" }]);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, newlineIdx);
            buf = buf.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
              if (c) {
                assistantText += c;
                const snap = assistantText;
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: snap };
                  return updated;
                });
                scrollToBottom();
              }
            } catch {}
          }
        }

        if (!assistantText) {
          setChatMessages([...newMsgs, { role: "assistant", content: "Please try again." }]);
        }
      }
    } catch {
      setChatMessages([...newMsgs, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
    setChatLoading(false);
    scrollToBottom();
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-24 z-[9998]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
                >
                  <div className="bg-white/95 text-[hsl(220,50%,10%)] text-sm font-medium px-3.5 py-2 rounded-xl shadow-xl shadow-black/20">
                    Need any help?
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[5px] w-2.5 h-2.5 bg-white/95 rotate-45" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={() => setIsOpen(true)}
              className="h-12 w-12 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] hover:border-white/[0.25] shadow-2xl shadow-black/40 p-0 transition-all duration-300 backdrop-blur-sm"
            >
              <MessageCircle className="h-5 w-5 text-white/70" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-24 z-[9998] w-[380px] max-h-[520px] flex flex-col rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,8%)]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-bold text-white">Support & Assistance</h3>
                <p className="text-[11px] text-white/40">Need help? We're here for you.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)} className="h-7 w-7 text-white/30 hover:text-white rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-white/[0.03] border-b border-white/[0.06] p-1 rounded-none gap-1 h-auto shrink-0">
                <TabsTrigger value="email" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs flex-1">
                  <Mail className="h-3.5 w-3.5" /> Email Support
                </TabsTrigger>
                <TabsTrigger value="ai" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg gap-1.5 text-xs flex-1">
                  <Bot className="h-3.5 w-3.5" /> AI Assistant
                </TabsTrigger>
              </TabsList>

              {/* EMAIL TAB */}
              <TabsContent value="email" className="flex-1 overflow-y-auto m-0 p-0">
                <form onSubmit={handleSendEmail} className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-white/50">Subject</Label>
                    <Input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Subject of your request"
                      className="bg-white/5 border-white/10 text-white h-9 text-sm placeholder:text-white/25"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-white/50">Email</Label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                      <Mail className="h-3.5 w-3.5 text-white/30" />
                      <span className="text-sm text-white/60">{profile?.email || user?.email || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-white/50">Describe your problem</Label>
                    <Textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Tell us what's wrong..."
                      className="bg-white/5 border-white/10 text-white text-sm min-h-[100px] placeholder:text-white/25 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-white/50">Attachment (optional)</Label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-colors"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-white/30" />
                      <span className="text-sm text-white/40">{attachmentFile ? attachmentFile.name : "Choose a file"}</span>
                    </div>
                    <input ref={fileRef} type="file" className="hidden" onChange={e => setAttachmentFile(e.target.files?.[0] || null)} />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full bg-accent hover:bg-accent/80 gap-2 h-10 text-sm font-medium">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send request
                  </Button>
                </form>
              </TabsContent>

              {/* AI TAB */}
              <TabsContent value="ai" className="flex-1 flex flex-col m-0 p-0 min-h-0">
                <ScrollArea className="flex-1 px-4 py-3" ref={chatScrollRef}>
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="p-3 rounded-full bg-accent/10 border border-accent/20 mb-3">
                        <Sparkles className="h-6 w-6 text-accent" />
                      </div>
                      <p className="text-sm font-medium text-white/70">AI Support Assistant</p>
                      <p className="text-xs text-white/30 mt-1 max-w-[220px]">Ask me anything about the platform, features, or troubleshooting.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                            msg.role === "user"
                              ? "bg-accent/20 text-white border border-accent/20"
                              : "bg-white/[0.05] text-white/80 border border-white/[0.06]"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0 text-[13px]">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-[13px]">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-3 border-t border-white/[0.06] shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                      placeholder="Ask anything..."
                      className="bg-white/5 border-white/10 text-white h-9 text-sm flex-1 placeholder:text-white/25"
                      disabled={chatLoading}
                    />
                    <Button
                      onClick={handleChatSend}
                      disabled={chatLoading || !chatInput.trim()}
                      size="icon"
                      className="h-9 w-9 bg-accent hover:bg-accent/80 shrink-0"
                    >
                      {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CRMHelpWidget;

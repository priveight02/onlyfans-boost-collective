import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Loader2, Sparkles, Brain, X,
  Target, DollarSign, Zap, TrendingUp,
  Paperclip, Download, Image, Music, Video, FileText, Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface Attachment {
  type: "image" | "audio" | "video" | "file";
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

type Msg = {
  role: "user" | "assistant";
  content: string;
  images?: { type: string; image_url: { url: string } }[];
  attachments?: Attachment[];
};

const QUICK_ACTIONS = [
  { label: "Daily Plan", icon: Target, prompt: "Give me today's top 3 priority actions for maximum agency revenue." },
  { label: "Revenue Ideas", icon: DollarSign, prompt: "What are the quickest revenue wins I can execute right now?" },
  { label: "Script Help", icon: Zap, prompt: "Help me write a high-converting script for my top creator." },
  { label: "Weak Points", icon: TrendingUp, prompt: "What's my agency's biggest weakness right now? Be brutal." },
];

const MAX_ATTACHMENTS = 20;
const FLOAT_DRAFT_KEY = "copilot_float_draft";

const saveDraft = (input: string, attachments: Attachment[]) => {
  try { localStorage.setItem(FLOAT_DRAFT_KEY, JSON.stringify({ input, attachments })); } catch {}
};
const loadDraft = (): { input: string; attachments: Attachment[] } | null => {
  try { const r = localStorage.getItem(FLOAT_DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(FLOAT_DRAFT_KEY); } catch {} };

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

interface FloatingCopilotProps {
  activeTab?: string;
  contextData?: Record<string, any>;
}

const FloatingCopilot = ({ activeTab, contextData }: FloatingCopilotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pulseHint, setPulseHint] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("managed_accounts")
      .select("id, username, display_name, monthly_revenue, subscriber_count, status")
      .then(({ data }) => setAccounts(data || []));
    const timer = setTimeout(() => setPulseHint(false), 8000);
    // Restore draft
    const draft = loadDraft();
    if (draft) {
      if (draft.input) setInput(draft.input);
      if (draft.attachments?.length) setAttachments(draft.attachments);
    }
    setDraftLoaded(true);
    return () => clearTimeout(timer);
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft(input, attachments);
  }, [input, attachments, draftLoaded]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, 50);
  }, []);

  const buildContext = () => {
    const parts: string[] = [];
    parts.push(`User is currently on the "${activeTab || "dashboard"}" module.`);
    if (contextData) parts.push(`Current module data: ${JSON.stringify(contextData).slice(0, 500)}`);
    const summary = accounts.length > 0
      ? `Agency: ${accounts.length} creators, $${accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0).toLocaleString()}/mo total, ${accounts.filter(a => a.status === "active").length} active`
      : "";
    if (summary) parts.push(summary);
    return parts.join("\n");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (attachments.length + files.length > MAX_ATTACHMENTS) { toast.error(`Max ${MAX_ATTACHMENTS} attachments`); return; }
    setIsUploading(true);
    const newAtts: Attachment[] = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} too large`); continue; }
      const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
      if (error) { toast.error(`Upload failed: ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
      let type: Attachment["type"] = "file";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("audio/")) type = "audio";
      else if (file.type.startsWith("video/")) type = "video";
      newAtts.push({ type, name: file.name, url: urlData.publicUrl, mimeType: file.type, size: file.size });
    }
    setAttachments(prev => [...prev, ...newAtts]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if ((!msgText && attachments.length === 0) || isStreaming) return;
    setInput("");
    clearDraft();

    const currentAttachments = [...attachments];
    setAttachments([]);

    let apiContent: any = msgText;
    if (currentAttachments.length > 0) {
      const parts: any[] = [];
      if (msgText) parts.push({ type: "text", text: msgText });
      for (const att of currentAttachments) {
        if (att.type === "image") parts.push({ type: "image_url", image_url: { url: att.url } });
        else parts.push({ type: "text", text: `[Attached ${att.type}: ${att.name} - ${att.url}]` });
      }
      apiContent = parts;
    }

    const userMsg: Msg = { role: "user", content: msgText || "Attached files", attachments: currentAttachments.length > 0 ? currentAttachments : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    scrollToBottom();

    let assistantSoFar = "";

    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: apiContent });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });

      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Error ${resp.status}`); }

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.type === "image") {
          setMessages([...newMessages, { role: "assistant", content: data.content || "Generated image.", images: data.images || [] }]);
          scrollToBottom();
        }
      } else {
        if (!resp.body) throw new Error("No body");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ") || line.startsWith(":") || !line.trim()) continue;
            const j = line.slice(6).trim();
            if (j === "[DONE]") break;
            try {
              const c = JSON.parse(j).choices?.[0]?.delta?.content;
              if (c) {
                assistantSoFar += c;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                  return [...prev, { role: "assistant", content: assistantSoFar }];
                });
                scrollToBottom();
              }
            } catch { buf = line + "\n" + buf; break; }
          }
        }
        setMessages([...newMessages, { role: "assistant", content: assistantSoFar }]);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  const renderMsgAttachments = (atts: Attachment[]) => (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {atts.map((att, i) => (
        <div key={i} className="rounded-lg overflow-hidden border border-white/10">
          {att.type === "image" ? (
            <img src={att.url} alt={att.name} className="max-w-[120px] max-h-[80px] object-cover" />
          ) : att.type === "audio" ? (
            <div className="p-1.5 bg-white/5"><audio controls src={att.url} className="h-6 w-32" /></div>
          ) : att.type === "video" ? (
            <video controls src={att.url} className="max-w-[150px] max-h-[80px] rounded" />
          ) : (
            <a href={att.url} target="_blank" className="flex items-center gap-1 p-1.5 bg-white/5 text-[9px] text-white/50">
              <FileText className="h-3 w-3" />{att.name}
            </a>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="fixed bottom-6 right-6 z-[9999]">
            <Button onClick={() => setIsOpen(true)} className={`h-14 w-14 rounded-full bg-gradient-to-br from-accent via-purple-600 to-pink-600 hover:from-accent/90 hover:via-purple-500 hover:to-pink-500 shadow-2xl shadow-accent/30 p-0 relative ${pulseHint ? "animate-pulse" : ""}`}>
              <Bot className="h-6 w-6 text-white" />
              {pulseHint && <><span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-[hsl(220,100%,10%)] animate-ping" /><span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-[hsl(220,100%,10%)]" /></>}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 z-[9999] w-[420px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-[hsl(220,50%,8%)]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
            
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Grandmaster AI</p>
                  <p className="text-[10px] text-white/40 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full inline-block" />
                    Active on {activeTab || "dashboard"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isStreaming && <Badge variant="outline" className="border-accent/20 text-accent text-[9px] animate-pulse mr-1"><Sparkles className="h-2.5 w-2.5 mr-1" /> Streaming</Badge>}
                <Button size="sm" variant="ghost" onClick={() => { setMessages([]); setAttachments([]); clearDraft(); }} className="h-7 w-7 p-0 text-white/30 hover:text-white"><Zap className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0 text-white/30 hover:text-white"><X className="h-4 w-4" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center pt-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-accent/60" />
                  </div>
                  <p className="text-white/40 text-xs mb-1">Grandmaster OFM AI</p>
                  <p className="text-white/20 text-[10px] mb-5 max-w-[260px]">Strategy, images, videos, audio, files — ask anything.</p>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {QUICK_ACTIONS.map(qa => (
                      <Button key={qa.label} size="sm" variant="outline" onClick={() => sendMessage(qa.prompt)}
                        className="h-auto py-2 px-2.5 border-white/[0.06] text-white/40 hover:text-white hover:bg-white/5 text-left flex items-center gap-2">
                        <qa.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="text-[10px]">{qa.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${msg.role === "user" ? "bg-accent/20 text-white" : "bg-white/[0.04] text-white/80"}`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none text-[11px] leading-relaxed">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                            {msg.images?.map((img, idx) => (
                              <div key={idx} className="relative group mt-2">
                                <img src={img.image_url.url} alt="Generated" className="rounded-lg max-w-full border border-white/10" />
                                <a href={img.image_url.url} download className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 rounded p-1 transition-opacity"><Download className="h-3 w-3 text-white" /></a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <p className="text-[11px]">{msg.content}</p>
                            {msg.attachments && renderMsgAttachments(msg.attachments)}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start"><div className="bg-white/[0.04] rounded-xl px-3.5 py-2.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /></div></div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Rich pending attachment preview */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      {att.type === "image" ? (
                        <div className="w-[70px] h-[55px]">
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        </div>
                      ) : att.type === "video" ? (
                        <div className="w-[70px] h-[55px] bg-black/40 flex items-center justify-center relative">
                          <video src={att.url} className="w-full h-full object-cover" muted />
                          <Play className="absolute h-4 w-4 text-white/70" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1.5 w-[90px]">
                          {att.type === "audio" ? <Music className="h-3 w-3 text-accent shrink-0" /> : <FileText className="h-3 w-3 text-accent shrink-0" />}
                          <span className="text-[8px] text-white/50 truncate">{att.name}</span>
                        </div>
                      )}
                      <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-white/20 mt-1">{attachments.length}/{MAX_ATTACHMENTS}</p>
              </div>
            )}

            <div className="px-3 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
              <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.csv" className="hidden" onChange={handleFileSelect} />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
                  className="h-9 w-9 p-0 shrink-0 text-white/30 hover:text-white hover:bg-white/5">
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                </Button>
                <Textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask, attach, generate..."
                  className="bg-white/[0.04] border-white/[0.08] text-white text-[11px] min-h-[36px] max-h-[80px] resize-none placeholder:text-white/20 focus:border-accent/30"
                  rows={1} />
                <Button onClick={() => sendMessage()} disabled={(!input.trim() && attachments.length === 0) || isStreaming}
                  className="bg-accent hover:bg-accent/90 h-9 w-9 p-0 shrink-0 rounded-lg">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCopilot;

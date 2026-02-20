import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Loader2, Sparkles, Brain, X,
  Target, DollarSign, Zap, TrendingUp,
  Paperclip, Download, Music, FileText, Play,
  Pencil, RotateCcw, Copy, Check, RefreshCw,
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
  { label: "Daily Plan", icon: Target, prompt: "Give me today's top 3 priority actions for maximum results." },
  { label: "Quick Wins", icon: DollarSign, prompt: "What are the quickest wins I can execute right now?" },
  { label: "Creative Help", icon: Zap, prompt: "Help me brainstorm something creative and impactful." },
  { label: "Deep Analysis", icon: TrendingUp, prompt: "What's the biggest weakness in my current approach? Be brutal." },
];

const MAX_ATTACHMENTS = 20;
const FLOAT_DRAFT_KEY = "copilot_float_draft";

const saveDraft = (input: string, attachments: Attachment[]) => {
  try { localStorage.setItem(FLOAT_DRAFT_KEY, JSON.stringify({ input, attachments })); } catch {}
};
const loadDraftData = (): { input: string; attachments: Attachment[] } | null => {
  try { const r = localStorage.getItem(FLOAT_DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(FLOAT_DRAFT_KEY); } catch {} };

interface FloatingCopilotProps {
  activeTab?: string;
  contextData?: Record<string, any>;
  onNavigate?: (tab: string) => void;
}

const FloatingCopilot = ({ activeTab, contextData, onNavigate }: FloatingCopilotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pulseHint, setPulseHint] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("managed_accounts")
      .select("id, username, display_name, monthly_revenue, subscriber_count, status")
      .then(({ data }) => setAccounts(data || []));
    const timer = setTimeout(() => setPulseHint(false), 8000);
    const draft = loadDraftData();
    if (draft) {
      if (draft.input) setInput(draft.input);
      if (draft.attachments?.length) setAttachments(draft.attachments);
    }
    setDraftLoaded(true);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft(input, attachments);
  }, [input, attachments, draftLoaded]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, 50);
  }, []);

  const buildContext = () => {
    const parts: string[] = [];
    parts.push(`User is on "${activeTab || "dashboard"}" module.`);
    if (contextData) parts.push(`Context: ${JSON.stringify(contextData).slice(0, 500)}`);
    if (accounts.length > 0) parts.push(`Agency: ${accounts.length} creators, $${accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0).toLocaleString()}/mo`);
    return parts.join("\n");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (attachments.length + files.length > MAX_ATTACHMENTS) { toast.error(`Max ${MAX_ATTACHMENTS}`); return; }
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

  const saveToDb = async (id: string, msgs: Msg[], title?: string) => {
    await supabase.from("copilot_conversations").update({
      messages: msgs as any,
      ...(title ? { title } : {}),
      updated_at: new Date().toISOString(),
      context_type: "widget",
    }).eq("id", id);
  };

  const streamResponse = async (apiMessages: any[], cId: string, baseMessages: Msg[], msgText: string) => {
    setIsStreaming(true);
    let assistantSoFar = "";

    // Show immediate typing indicator
    setMessages([...baseMessages, { role: "assistant", content: "▍" }]);
    scrollToBottom();

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });

      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Error ${resp.status}`); }
      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        setMessages([...baseMessages, { role: "assistant", content: "⚡ Processing..." }]);
        scrollToBottom();
        const data = await resp.json();
        if (data.type === "action") {
          const content = data.content || "Actions executed.";
          const final = [...baseMessages, { role: "assistant" as const, content }];
          setMessages(final);
          scrollToBottom();
          await saveToDb(cId, final, msgText.slice(0, 50));
          if (data.navigateTo && onNavigate) {
            setTimeout(() => onNavigate(data.navigateTo), 800);
            toast.success(`Navigating to ${data.navigateTo}`, { description: "Uplyze Assistant executed your request." });
          }
        } else if (data.type === "image") {
          const final = [...baseMessages, { role: "assistant" as const, content: data.content || "Generated.", images: data.images || [] }];
          setMessages(final);
          scrollToBottom();
          await saveToDb(cId, final, msgText.slice(0, 50));
        }
      } else {
        if (!resp.body) throw new Error("No body");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, newlineIndex);
            buf = buf.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { streamDone = true; break; }

            try {
              const content = JSON.parse(jsonStr).choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantSoFar += content;
                const snapshot = assistantSoFar;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                  return [...prev, { role: "assistant", content: snapshot }];
                });
                scrollToBottom();
              }
            } catch { buf = line + "\n" + buf; break; }
          }
        }

        // Flush
        if (buf.trim()) {
          for (let raw of buf.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try { const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content; if (c) assistantSoFar += c; } catch {}
          }
        }

        const final = [...baseMessages, { role: "assistant" as const, content: assistantSoFar || "Please try again." }];
        setMessages(final);
        await saveToDb(cId, final, msgText.slice(0, 50));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setMessages(baseMessages);
    } finally {
      setIsStreaming(false);
    }
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
    scrollToBottom();

    // Auto-create conversation in Supabase (visible in AI Copilot main tab)
    let cId = convoId;
    if (!cId) {
      const { data, error } = await supabase.from("copilot_conversations").insert({
        title: msgText.slice(0, 50),
        messages: newMessages as any,
        context_type: "widget",
      }).select().single();
      if (error) { toast.error(error.message); return; }
      cId = data.id;
      setConvoId(cId);
    }

    const apiMessages = messages.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    apiMessages.push({ role: "user", content: apiContent });

    await streamResponse(apiMessages, cId!, newMessages, msgText);
  };

  const buildApiContent = (text: string, atts?: Attachment[]): any => {
    if (!atts || atts.length === 0) return text;
    const parts: any[] = [];
    if (text) parts.push({ type: "text", text });
    for (const att of atts) {
      if (att.type === "image") parts.push({ type: "image_url", image_url: { url: att.url } });
      else parts.push({ type: "text", text: `[Attached ${att.type}: ${att.name} - ${att.url}]` });
    }
    return parts;
  };

  const handleEditMessage = async (idx: number) => {
    if (isStreaming || !editText.trim()) return;
    const newContent = editText.trim();
    const editAtts = editAttachments.length > 0 ? [...editAttachments] : undefined;
    setEditingIdx(null);
    setEditText("");
    setEditAttachments([]);

    const truncated = messages.slice(0, idx);
    const editedMsg: Msg = { ...messages[idx], content: newContent, attachments: editAtts };
    const newMessages = [...truncated, editedMsg];
    setMessages(newMessages);
    scrollToBottom();

    if (!convoId) return;
    const apiMessages = truncated.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    apiMessages.push({ role: "user", content: buildApiContent(newContent, editAtts) });
    await streamResponse(apiMessages, convoId, newMessages, newContent);
  };

  const handleRevertTo = async (idx: number) => {
    if (isStreaming) return;
    const truncated = messages.slice(0, idx + 1);
    setMessages(truncated);
    if (convoId) await saveToDb(convoId, truncated);
    toast.success("Reverted");
  };

  const handleRegenerate = async () => {
    if (isStreaming || messages.length < 2) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1 || !convoId) return;

    const truncated = messages.slice(0, lastUserIdx + 1);
    setMessages(truncated);
    scrollToBottom();
    const apiMessages = truncated.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    await streamResponse(apiMessages, convoId, truncated, truncated[lastUserIdx].content);
  };

  const handleCopy = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
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

  const renderActions = (msg: Msg, idx: number) => {
    const isUser = msg.role === "user";
    const isLastAssistant = !isUser && idx === messages.length - 1;
    return (
      <div className={`flex items-center gap-0.5 mt-0.5 transition-opacity ${hoveredIdx === idx ? "opacity-100" : "opacity-0"}`}>
        <Button size="sm" variant="ghost" onClick={() => handleCopy(idx)} className="h-5 w-5 p-0 text-white/30 hover:text-white" title="Copy">
          {copiedIdx === idx ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
        </Button>
        {isUser && (
          <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(idx); setEditText(msg.content); setEditAttachments(msg.attachments ? [...msg.attachments] : []); }} className="h-5 w-5 p-0 text-white/30 hover:text-white" title="Edit">
            <Pencil className="h-2.5 w-2.5" />
          </Button>
        )}
        {isLastAssistant && (
          <Button size="sm" variant="ghost" onClick={handleRegenerate} className="h-5 w-5 p-0 text-white/30 hover:text-white" title="Regenerate">
            <RefreshCw className="h-2.5 w-2.5" />
          </Button>
        )}
        {idx < messages.length - 1 && (
          <Button size="sm" variant="ghost" onClick={() => handleRevertTo(idx)} className="h-5 w-5 p-0 text-white/30 hover:text-white" title="Revert here">
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    );
  };

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
                  <p className="text-sm font-semibold text-white">Uplyze Virtual Assistant</p>
                  <p className="text-[10px] text-white/40 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full inline-block" />
                    Active on {activeTab || "dashboard"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isStreaming && <Badge variant="outline" className="border-accent/20 text-accent text-[9px] animate-pulse mr-1"><Sparkles className="h-2.5 w-2.5 mr-1" /> Streaming</Badge>}
                <Button size="sm" variant="ghost" onClick={() => { setMessages([]); setAttachments([]); setConvoId(null); clearDraft(); }} className="h-7 w-7 p-0 text-white/30 hover:text-white" title="New chat"><Zap className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0 text-white/30 hover:text-white"><X className="h-4 w-4" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center pt-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-accent/60" />
                  </div>
                  <p className="text-white/40 text-xs mb-1">Uplyze Virtual Assistant</p>
                  <p className="text-white/20 text-[10px] mb-5 max-w-[260px]">Conversations auto-save and appear in the AI Copilot tab.</p>
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
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                      <div className="max-w-[85%]">
                        {editingIdx === i ? (
                          <div className="bg-accent/10 rounded-xl px-3 py-2 border border-accent/20">
                            <Textarea value={editText} onChange={e => setEditText(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-[11px] min-h-[40px] resize-none mb-1.5"
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(i); } }}
                            />
                            {editAttachments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {editAttachments.map((att, ai) => (
                                  <div key={ai} className="relative group rounded border border-white/10 bg-white/5">
                                    {att.type === "image" ? (
                                      <div className="w-[50px] h-[40px]"><img src={att.url} alt={att.name} className="w-full h-full object-cover rounded" /></div>
                                    ) : (
                                      <div className="flex items-center gap-1 px-1.5 py-1">
                                        <FileText className="h-2.5 w-2.5 text-accent" />
                                        <span className="text-[7px] text-white/50 truncate max-w-[40px]">{att.name}</span>
                                      </div>
                                    )}
                                    <button onClick={() => setEditAttachments(prev => prev.filter((_, j) => j !== ai))}
                                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-black/80 flex items-center justify-center text-white/60 hover:bg-red-500/80 opacity-0 group-hover:opacity-100">
                                      <X className="h-2 w-2" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <input ref={editFileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.csv" className="hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                for (const file of files) {
                                  if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} too large`); continue; }
                                  const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
                                  const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
                                  if (error) continue;
                                  const { data: urlData } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
                                  let type: Attachment["type"] = "file";
                                  if (file.type.startsWith("image/")) type = "image";
                                  else if (file.type.startsWith("audio/")) type = "audio";
                                  else if (file.type.startsWith("video/")) type = "video";
                                  setEditAttachments(prev => [...prev, { type, name: file.name, url: urlData.publicUrl, mimeType: file.type, size: file.size }]);
                                }
                                if (editFileInputRef.current) editFileInputRef.current.value = "";
                              }}
                            />
                            <div className="flex gap-1.5 justify-between">
                              <Button size="sm" variant="ghost" onClick={() => editFileInputRef.current?.click()} className="h-6 px-1.5 text-[9px] text-white/40 hover:text-white gap-0.5">
                                <Paperclip className="h-2.5 w-2.5" /> Attach
                              </Button>
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(null); setEditAttachments([]); }} className="h-6 px-2 text-[9px] text-white/40">Cancel</Button>
                                <Button size="sm" onClick={() => handleEditMessage(i)} className="h-6 px-2 text-[9px] bg-accent hover:bg-accent/90">Save</Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={`rounded-xl px-3.5 py-2.5 ${msg.role === "user" ? "bg-accent/20 text-white" : "bg-white/[0.04] text-white/80"}`}>
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
                            {renderActions(msg, i)}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Typing indicator shown inline */}
                </div>
              )}
            </ScrollArea>

            {attachments.length > 0 && (
              <div className="px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      {att.type === "image" ? (
                        <div className="w-[70px] h-[55px]"><img src={att.url} alt={att.name} className="w-full h-full object-cover" /></div>
                      ) : att.type === "video" ? (
                        <div className="w-[70px] h-[55px] bg-black/40 flex items-center justify-center relative">
                          <video src={att.url} className="w-full h-full object-cover" muted /><Play className="absolute h-4 w-4 text-white/70" />
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

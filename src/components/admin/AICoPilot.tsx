import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Plus, Trash2, Loader2, Sparkles, Brain, MessageSquare,
  Zap, Target, TrendingUp, DollarSign, Users, Clock,
  Paperclip, Download, X, FileText, Music, Play,
  Pencil, RotateCcw, Copy, Check, RefreshCw, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Attachment {
  type: "image" | "audio" | "video" | "file";
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

type MsgContent = string | { type: string; text?: string; image_url?: { url: string } }[];

type Msg = {
  role: "user" | "assistant";
  content: string;
  images?: { type: string; image_url: { url: string } }[];
  attachments?: Attachment[];
};

interface DraftState {
  convoId: string | null;
  input: string;
  attachments: Attachment[];
}

const DRAFT_KEY = "copilot_draft";

const QUICK_PROMPTS = [
  { label: "Daily Action Plan", icon: Target, prompt: "Give me today's agency action plan. What should I focus on for maximum revenue? Prioritize by impact." },
  { label: "Revenue Opportunities", icon: DollarSign, prompt: "Analyze my current creators and identify the top 5 untapped revenue opportunities. Be specific with numbers and strategies." },
  { label: "Script Strategy", icon: Zap, prompt: "What types of scripts should I create this week? Consider fan psychology, current trends, and conversion optimization." },
  { label: "Weak Points", icon: TrendingUp, prompt: "What are the biggest weak points in my agency's current strategy? Be brutally honest and provide fixes." },
  { label: "Fan Retention", icon: Users, prompt: "What retention strategies should I implement right now to reduce churn? Give me 5 actionable steps." },
  { label: "Content Calendar", icon: Clock, prompt: "Create a 7-day content calendar for my top creator. Include post ideas, platforms, and optimal posting times." },
];

const MAX_ATTACHMENTS = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const saveDraft = (convoId: string | null, input: string, attachments: Attachment[]) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ convoId, input, attachments })); } catch {}
};
const loadDraftData = (): DraftState | null => {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const AICoPilot = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contextAccount, setContextAccount] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!draftRestored) return;
    saveDraft(activeConvoId, input, attachments);
  }, [input, attachments, activeConvoId, draftRestored]);

  const loadData = async () => {
    const [convos, accts] = await Promise.all([
      supabase.from("copilot_conversations").select("*").order("updated_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, monthly_revenue, subscriber_count, status"),
    ]);
    setConversations(convos.data || []);
    setAccounts(accts.data || []);

    const draft = loadDraftData();
    if (draft) {
      if (draft.input) setInput(draft.input);
      if (draft.attachments?.length) setAttachments(draft.attachments);
      if (draft.convoId && convos.data?.length) {
        const match = convos.data.find((c: any) => c.id === draft.convoId);
        if (match) { setActiveConvoId(match.id); setMessages((match.messages as unknown as Msg[]) || []); setContextAccount(match.account_id || ""); }
        else if (convos.data.length) selectConvo(convos.data[0]);
      } else if (convos.data?.length) selectConvo(convos.data[0]);
    } else if (convos.data?.length) selectConvo(convos.data[0]);
    setDraftRestored(true);
  };

  const selectConvo = (convo: any) => {
    setActiveConvoId(convo.id);
    setMessages((convo.messages as unknown as Msg[]) || []);
    setContextAccount(convo.account_id || "");
    setEditingIdx(null);
  };

  const createConvo = async (initialMessages?: Msg[], title?: string) => {
    const { data, error } = await supabase.from("copilot_conversations").insert({
      title: title || "New Conversation",
      messages: (initialMessages || []) as any,
      account_id: contextAccount || null,
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    setConversations(prev => [data, ...prev]);
    setActiveConvoId(data.id);
    if (initialMessages) setMessages(initialMessages);
    else setMessages([]);
    return data.id as string;
  };

  const deleteConvo = async (id: string) => {
    const { error } = await supabase.from("copilot_conversations").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) { setActiveConvoId(null); setMessages([]); setInput(""); setAttachments([]); clearDraft(); }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, 50);
  }, []);

  const buildContext = () => {
    const parts: string[] = [];
    if (contextAccount) {
      const acct = accounts.find(a => a.id === contextAccount);
      if (acct) parts.push(`Focused on: ${acct.display_name || acct.username} ($${acct.monthly_revenue}/mo, ${acct.subscriber_count} subs, ${acct.status})`);
    }
    if (accounts.length > 0) parts.push(`Agency: ${accounts.length} creators, $${accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0).toLocaleString()}/mo`);
    return parts.join("\n");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (attachments.length + files.length > MAX_ATTACHMENTS) { toast.error(`Max ${MAX_ATTACHMENTS} attachments`); return; }
    setIsUploading(true);
    const newAtts: Attachment[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} exceeds 20MB`); continue; }
      const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "bin"}`;
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

  const saveConversation = async (convoId: string, finalMessages: Msg[], msgText?: string) => {
    const isFirst = finalMessages.filter(m => m.role === "user").length <= 1;
    const title = isFirst && msgText ? msgText.slice(0, 50) : undefined;
    await supabase.from("copilot_conversations").update({
      messages: finalMessages as any,
      ...(title ? { title } : {}),
      account_id: contextAccount || null,
      updated_at: new Date().toISOString(),
    }).eq("id", convoId);
    setConversations(prev => prev.map(c =>
      c.id === convoId ? { ...c, messages: finalMessages, ...(title ? { title } : {}), updated_at: new Date().toISOString() } : c
    ));
  };

  const streamResponse = async (apiMessages: any[], convoId: string, baseMessages: Msg[], msgText: string) => {
    setIsStreaming(true);
    let assistantSoFar = "";

    // Show immediate typing indicator as an assistant message
    setMessages([...baseMessages, { role: "assistant", content: "▍" }]);
    scrollToBottom();

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // Image generation — show generating status
        setMessages([...baseMessages, { role: "assistant", content: "🎨 Generating highest quality image... This may take a moment." }]);
        scrollToBottom();

        const data = await resp.json();
        if (data.type === "image") {
          const assistantMsg: Msg = { role: "assistant", content: data.content || "Here's the generated image.", images: data.images || [] };
          const finalMessages = [...baseMessages, assistantMsg];
          setMessages(finalMessages);
          scrollToBottom();
          await saveConversation(convoId, finalMessages, msgText);
        }
      } else {
        if (!resp.body) throw new Error("No response body");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { streamDone = true; break; }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantSoFar += content;
                const snapshot = assistantSoFar;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                  }
                  return [...prev, { role: "assistant", content: snapshot }];
                });
                scrollToBottom();
              }
            } catch {
              // Incomplete JSON — put back and wait for more data
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush remaining buffer
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const content = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
              if (content) assistantSoFar += content;
            } catch {}
          }
        }

        const finalMessages = [...baseMessages, { role: "assistant" as const, content: assistantSoFar || "I couldn't generate a response. Please try again." }];
        setMessages(finalMessages);
        await saveConversation(convoId, finalMessages, msgText);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
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

    let apiContent: MsgContent = msgText;
    const currentAttachments = [...attachments];
    setAttachments([]);

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

    // Auto-create conversation if none active
    let convoId = activeConvoId;
    if (!convoId) {
      convoId = await createConvo(newMessages, msgText.slice(0, 50));
      if (!convoId) return;
    }

    const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: "user", content: apiContent } as any);

    await streamResponse(apiMessages, convoId, newMessages, msgText);
  };

  // Edit a user message and regenerate from that point
  const handleEditMessage = async (idx: number) => {
    if (isStreaming || !editText.trim()) return;
    const newContent = editText.trim();
    setEditingIdx(null);
    setEditText("");

    // Truncate messages to the edit point and replace
    const truncated = messages.slice(0, idx);
    const editedMsg: Msg = { ...messages[idx], content: newContent };
    const newMessages = [...truncated, editedMsg];
    setMessages(newMessages);
    scrollToBottom();

    const convoId = activeConvoId;
    if (!convoId) return;

    const apiMessages = truncated.map(m => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: "user", content: newContent });

    await streamResponse(apiMessages, convoId, newMessages, newContent);
  };

  // Revert conversation to a specific message index (inclusive)
  const handleRevertTo = async (idx: number) => {
    if (isStreaming) return;
    const truncated = messages.slice(0, idx + 1);
    setMessages(truncated);
    if (activeConvoId) {
      await saveConversation(activeConvoId, truncated);
    }
    toast.success("Reverted to this point");
  };

  // Regenerate the last assistant response
  const handleRegenerate = async () => {
    if (isStreaming || messages.length < 2) return;
    // Find last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;

    const truncated = messages.slice(0, lastUserIdx + 1);
    setMessages(truncated);
    scrollToBottom();

    const convoId = activeConvoId;
    if (!convoId) return;

    const apiMessages = truncated.map(m => ({ role: m.role, content: m.content }));
    await streamResponse(apiMessages, convoId, truncated, truncated[lastUserIdx].content);
  };

  // Copy message content
  const handleCopy = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const renderPendingAttachments = () => {
    if (attachments.length === 0) return null;
    return (
      <div className="px-3 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {att.type === "image" ? (
                <div className="relative w-[100px] h-[80px]">
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                </div>
              ) : att.type === "video" ? (
                <div className="relative w-[100px] h-[80px] bg-black/40 flex items-center justify-center">
                  <video src={att.url} className="w-full h-full object-cover" muted />
                  <Play className="absolute h-6 w-6 text-white/70" />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-2 w-[140px]">
                  {att.type === "audio" ? <Music className="h-4 w-4 text-accent shrink-0" /> : <FileText className="h-4 w-4 text-accent shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-[9px] text-white/60 truncate">{att.name}</p>
                    <p className="text-[8px] text-white/30">{formatSize(att.size)}</p>
                  </div>
                </div>
              )}
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-white/20 mt-1.5">{attachments.length}/{MAX_ATTACHMENTS}</p>
      </div>
    );
  };

  const renderMessageAttachments = (atts: Attachment[]) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {atts.map((att, i) => (
        <div key={i} className="rounded-lg overflow-hidden border border-white/10">
          {att.type === "image" ? (
            <a href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] object-cover" /></a>
          ) : att.type === "audio" ? (
            <div className="p-2 bg-white/5"><p className="text-[10px] text-white/50 mb-1">{att.name}</p><audio controls src={att.url} className="h-8 w-48" /></div>
          ) : att.type === "video" ? (
            <div className="p-2 bg-white/5"><p className="text-[10px] text-white/50 mb-1">{att.name}</p><video controls src={att.url} className="max-w-[250px] max-h-[150px] rounded" /></div>
          ) : (
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10"><FileText className="h-4 w-4 text-accent" /><span className="text-[10px] text-white/60">{att.name}</span></a>
          )}
        </div>
      ))}
    </div>
  );

  // Message action toolbar (ChatGPT/Gemini style)
  const renderMessageActions = (msg: Msg, idx: number) => {
    const isUser = msg.role === "user";
    const isLast = idx === messages.length - 1;
    const isLastAssistant = !isUser && isLast;

    return (
      <div className={`flex items-center gap-0.5 mt-1 transition-opacity ${hoveredIdx === idx ? "opacity-100" : "opacity-0"}`}>
        {/* Copy */}
        <Button size="sm" variant="ghost" onClick={() => handleCopy(idx)}
          className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Copy">
          {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </Button>

        {/* Edit (user messages only) */}
        {isUser && (
          <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(idx); setEditText(msg.content); }}
            className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
        )}

        {/* Regenerate (last assistant message) */}
        {isLastAssistant && (
          <Button size="sm" variant="ghost" onClick={handleRegenerate}
            className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Regenerate">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {/* Revert to this point */}
        {idx < messages.length - 1 && (
          <Button size="sm" variant="ghost" onClick={() => handleRevertTo(idx)}
            className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Revert to here">
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col">
        <Button size="sm" onClick={() => { setActiveConvoId(null); setMessages([]); setInput(""); setAttachments([]); clearDraft(); }}
          className="w-full bg-accent hover:bg-accent/90 text-xs mb-3 h-9">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Conversation
        </Button>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {conversations.map(c => (
              <div key={c.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-xs group ${
                  activeConvoId === c.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/60"
                }`}
                onClick={() => selectConvo(c)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteConvo(c.id); }}
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <label className="text-[9px] text-white/30 mb-1 block">Focus on creator</label>
          <Select value={contextAccount} onValueChange={setContextAccount}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue placeholder="All creators" /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
              <SelectItem value="all" className="text-white text-xs">All creators</SelectItem>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-white text-xs">{a.display_name || a.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-semibold text-white">Grandmaster AI Co-Pilot</p>
            <p className="text-[10px] text-white/40">Images • Videos • Audio • Files • Strategy</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {messages.length > 0 && !isStreaming && (
              <Button size="sm" variant="ghost" onClick={handleRegenerate} className="h-7 px-2 text-[10px] text-white/30 hover:text-white gap-1">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </Button>
            )}
            {isStreaming && (
              <Badge variant="outline" className="border-accent/20 text-accent text-[9px] animate-pulse">
                <Sparkles className="h-2.5 w-2.5 mr-1" /> Thinking...
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Brain className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-1">Your AI Agency Brain</p>
              <p className="text-white/20 text-xs mb-6 max-w-sm">
                Ask anything — a conversation is created automatically when you send your first message.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-w-lg">
                {QUICK_PROMPTS.map(qp => (
                  <Button key={qp.label} size="sm" variant="outline"
                    onClick={() => sendMessage(qp.prompt)}
                    className="h-auto py-2 px-3 border-white/10 text-white/50 hover:text-white hover:bg-white/5 text-left flex flex-col items-start gap-1">
                    <qp.icon className="h-3.5 w-3.5 text-accent" />
                    <span className="text-[10px]">{qp.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                  <div className="max-w-[80%]">
                    {editingIdx === i ? (
                      <div className="bg-accent/10 rounded-xl px-4 py-3 border border-accent/20">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)}
                          className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] resize-none mb-2"
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(i); } }}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)} className="h-7 px-3 text-[10px] text-white/40">Cancel</Button>
                          <Button size="sm" onClick={() => handleEditMessage(i)} className="h-7 px-3 text-[10px] bg-accent hover:bg-accent/90">Save & Regenerate</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-accent/20 text-white" : "bg-white/5 text-white/80"}`}>
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                              {msg.images && msg.images.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {msg.images.map((img, idx) => (
                                    <div key={idx} className="relative group">
                                      <img src={img.image_url.url} alt="Generated" className="rounded-lg max-w-full border border-white/10" />
                                      <a href={img.image_url.url} download className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 rounded-lg p-1.5 transition-opacity">
                                        <Download className="h-3.5 w-3.5 text-white" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <p className="text-xs">{msg.content}</p>
                              {msg.attachments && renderMessageAttachments(msg.attachments)}
                            </>
                          )}
                        </div>
                        {renderMessageActions(msg, i)}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {/* Typing indicator is now shown inline as an assistant message */}
            </div>
          )}
        </ScrollArea>

        {renderPendingAttachments()}

        <div className="p-3 border-t border-white/[0.06]">
          <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.csv" className="hidden" onChange={handleFileSelect} />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
              className="h-10 w-10 p-0 shrink-0 text-white/30 hover:text-white hover:bg-white/5">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything, attach files, generate images & videos..."
              className="bg-white/5 border-white/10 text-white text-xs min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button onClick={() => sendMessage()} disabled={(!input.trim() && attachments.length === 0) || isStreaming}
              className="bg-accent hover:bg-accent/90 h-10 w-10 p-0 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICoPilot;

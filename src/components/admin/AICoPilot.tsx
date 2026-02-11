import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Plus, Trash2, Loader2, Sparkles, Brain, MessageSquare,
  Zap, Target, TrendingUp, DollarSign, Users, Clock, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string; images?: { type: string; image_url: { url: string } }[] };

const QUICK_PROMPTS = [
  { label: "Daily Action Plan", icon: Target, prompt: "Give me today's agency action plan. What should I focus on for maximum revenue? Prioritize by impact." },
  { label: "Revenue Opportunities", icon: DollarSign, prompt: "Analyze my current creators and identify the top 5 untapped revenue opportunities. Be specific with numbers and strategies." },
  { label: "Script Strategy", icon: Zap, prompt: "What types of scripts should I create this week? Consider fan psychology, current trends, and conversion optimization." },
  { label: "Weak Points", icon: TrendingUp, prompt: "What are the biggest weak points in my agency's current strategy? Be brutally honest and provide fixes." },
  { label: "Fan Retention", icon: Users, prompt: "What retention strategies should I implement right now to reduce churn? Give me 5 actionable steps." },
  { label: "Content Calendar", icon: Clock, prompt: "Create a 7-day content calendar for my top creator. Include post ideas, platforms, and optimal posting times." },
];

const AICoPilot = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contextAccount, setContextAccount] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [convos, accts] = await Promise.all([
      supabase.from("copilot_conversations").select("*").order("updated_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, monthly_revenue, subscriber_count, status"),
    ]);
    setConversations(convos.data || []);
    setAccounts(accts.data || []);
    if (convos.data?.length && !activeConvoId) {
      selectConvo(convos.data[0]);
    }
  };

  const selectConvo = (convo: any) => {
    setActiveConvoId(convo.id);
    setMessages((convo.messages as Msg[]) || []);
    setContextAccount(convo.account_id || "");
  };

  const createConvo = async () => {
    const { data, error } = await supabase.from("copilot_conversations").insert({
      title: "New Conversation",
      messages: [],
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setConversations(prev => [data, ...prev]);
    selectConvo(data);
  };

  const deleteConvo = async (id: string) => {
    await supabase.from("copilot_conversations").delete().eq("id", id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) {
      setActiveConvoId(null);
      setMessages([]);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  const buildContext = () => {
    const parts: string[] = [];
    if (contextAccount) {
      const acct = accounts.find(a => a.id === contextAccount);
      if (acct) parts.push(`Currently focused on creator: ${acct.display_name || acct.username} (Revenue: $${acct.monthly_revenue}/mo, Subs: ${acct.subscriber_count}, Status: ${acct.status})`);
    }
    const summary = accounts.length > 0 ? `Agency overview: ${accounts.length} creators, $${accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0).toLocaleString()}/mo total revenue, ${accounts.filter(a => a.status === "active").length} active` : "";
    if (summary) parts.push(summary);
    return parts.join("\n");
  };

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isStreaming) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    scrollToBottom();

    let assistantSoFar = "";

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          context: buildContext(),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // Image generation response (non-streaming)
        const data = await resp.json();
        if (data.type === "image") {
          const assistantMsg: Msg = {
            role: "assistant",
            content: data.content || "Here's the generated image.",
            images: data.images || [],
          };
          const finalMessages = [...newMessages, assistantMsg];
          setMessages(finalMessages);
          scrollToBottom();

          if (activeConvoId) {
            const title = newMessages.length <= 1 ? msgText.slice(0, 50) : undefined;
            await supabase.from("copilot_conversations").update({
              messages: finalMessages,
              ...(title ? { title } : {}),
              account_id: contextAccount || null,
            }).eq("id", activeConvoId);
            setConversations(prev => prev.map(c =>
              c.id === activeConvoId ? { ...c, messages: finalMessages, ...(title ? { title } : {}) } : c
            ));
          }
        }
      } else {
        // Streaming text response
        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        while (true) {
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
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantSoFar += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                  }
                  return [...prev, { role: "assistant", content: assistantSoFar }];
                });
                scrollToBottom();
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush remaining
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw || !raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) assistantSoFar += content;
            } catch {}
          }
        }

        // Save to database
        const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantSoFar }];
        setMessages(finalMessages);

        if (activeConvoId) {
          const title = newMessages.length <= 1 ? msgText.slice(0, 50) : undefined;
          await supabase.from("copilot_conversations").update({
            messages: finalMessages,
            ...(title ? { title } : {}),
            account_id: contextAccount || null,
          }).eq("id", activeConvoId);

          setConversations(prev => prev.map(c =>
            c.id === activeConvoId ? { ...c, messages: finalMessages, ...(title ? { title } : {}) } : c
          ));
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  const activeConvo = conversations.find(c => c.id === activeConvoId);

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col">
        <Button size="sm" onClick={createConvo} className="w-full bg-accent hover:bg-accent/90 text-xs mb-3 h-9">
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

        {/* Context selector */}
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
        {/* Header */}
        <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-semibold text-white">Agency Co-Pilot</p>
            <p className="text-[10px] text-white/40">AI-powered strategic assistant</p>
          </div>
          {isStreaming && (
            <Badge variant="outline" className="ml-auto border-accent/20 text-accent text-[9px] animate-pulse">
              <Sparkles className="h-2.5 w-2.5 mr-1" /> Thinking...
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Brain className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-1">Your AI Agency Brain</p>
              <p className="text-white/20 text-xs mb-6 max-w-sm">
                Ask anything about strategy, scripts, fan psychology, content planning, or revenue optimization.
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
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-accent/20 text-white"
                      : "bg-white/5 text-white/80"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.images && msg.images.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.images.map((img, idx) => (
                              <img key={idx} src={img.image_url.url} alt="Generated image" 
                                className="rounded-lg max-w-full border border-white/10" />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask your AI co-pilot anything..."
              className="bg-white/5 border-white/10 text-white text-xs min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || isStreaming}
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

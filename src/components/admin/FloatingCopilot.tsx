import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Loader2, Sparkles, Brain, X, Maximize2, Minimize2,
  Target, DollarSign, Zap, TrendingUp, Users, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string; images?: { type: string; image_url: { url: string } }[] };

const QUICK_ACTIONS = [
  { label: "Daily Plan", icon: Target, prompt: "Give me today's top 3 priority actions for maximum agency revenue." },
  { label: "Revenue Ideas", icon: DollarSign, prompt: "What are the quickest revenue wins I can execute right now?" },
  { label: "Script Help", icon: Zap, prompt: "Help me write a high-converting script for my top creator." },
  { label: "Weak Points", icon: TrendingUp, prompt: "What's my agency's biggest weakness right now? Be brutal." },
];

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("managed_accounts")
      .select("id, username, display_name, monthly_revenue, subscriber_count, status")
      .then(({ data }) => setAccounts(data || []));
    const timer = setTimeout(() => setPulseHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
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
        body: JSON.stringify({ messages: newMessages, context: buildContext() }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      // Check content type to determine if it's an image response or streaming
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
          setMessages([...newMessages, assistantMsg]);
          scrollToBottom();
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

        setMessages([...newMessages, { role: "assistant", content: assistantSoFar }]);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      {/* Floating Icon Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[9999]"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className={`h-14 w-14 rounded-full bg-gradient-to-br from-accent via-purple-600 to-pink-600 hover:from-accent/90 hover:via-purple-500 hover:to-pink-500 shadow-2xl shadow-accent/30 p-0 relative ${
                pulseHint ? "animate-pulse" : ""
              }`}
            >
              <Bot className="h-6 w-6 text-white" />
              {pulseHint && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-[hsl(220,100%,10%)] animate-ping" />
              )}
              {pulseHint && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-[hsl(220,100%,10%)]" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 z-[9999] w-[420px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-[hsl(220,50%,8%)]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
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
                {isStreaming && (
                  <Badge variant="outline" className="border-accent/20 text-accent text-[9px] animate-pulse mr-1">
                    <Sparkles className="h-2.5 w-2.5 mr-1" /> Streaming
                  </Badge>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setMessages([]); }}
                  className="h-7 w-7 p-0 text-white/30 hover:text-white">
                  <Zap className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}
                  className="h-7 w-7 p-0 text-white/30 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center pt-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-accent/60" />
                  </div>
                  <p className="text-white/40 text-xs mb-1">Grandmaster OFM AI</p>
                  <p className="text-white/20 text-[10px] mb-5 max-w-[260px]">
                    Your elite strategist. Ask anything about scripts, revenue, fans, or strategy.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {QUICK_ACTIONS.map(qa => (
                      <Button key={qa.label} size="sm" variant="outline"
                        onClick={() => sendMessage(qa.prompt)}
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
                      <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                        msg.role === "user"
                          ? "bg-accent/20 text-white"
                          : "bg-white/[0.04] text-white/80"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none text-[11px] leading-relaxed">
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
                          <p className="text-[11px]">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-white/[0.04] rounded-xl px-3.5 py-2.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Ask the Grandmaster..."
                  className="bg-white/[0.04] border-white/[0.08] text-white text-[11px] min-h-[36px] max-h-[80px] resize-none placeholder:text-white/20 focus:border-accent/30"
                  rows={1}
                />
                <Button onClick={() => sendMessage()} disabled={!input.trim() || isStreaming}
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

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Bot, Send, Plus, Trash2, Loader2, Sparkles, Brain, MessageSquare,
  Zap, Target, TrendingUp, DollarSign, Users, Clock,
  Paperclip, Download, X, FileText, Music, Play, Pause,
  Pencil, RotateCcw, Copy, Check, RefreshCw, ChevronDown,
  Image as ImageIcon, Video, Mic, Wand2, Volume2, Upload, Trash,
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
  audioUrl?: string;
};

interface Voice {
  id: string;
  name: string;
  description: string | null;
  elevenlabs_voice_id: string | null;
  is_preset: boolean | null;
  sample_urls: string[] | null;
  preview_url: string | null;
}

type CopilotMode = "chat" | "image" | "video" | "audio" | "freeWill";

const DRAFT_KEY = "copilot_draft";
const MAX_ATTACHMENTS = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const QUICK_PROMPTS = [
  { label: "Daily Action Plan", icon: Target, prompt: "Give me today's agency action plan. What should I focus on for maximum revenue? Prioritize by impact." },
  { label: "Revenue Opportunities", icon: DollarSign, prompt: "Analyze my current creators and identify the top 5 untapped revenue opportunities." },
  { label: "Script Strategy", icon: Zap, prompt: "What types of scripts should I create this week? Consider fan psychology and conversion optimization." },
  { label: "Weak Points", icon: TrendingUp, prompt: "What are the biggest weak points in my agency's current strategy? Be brutally honest." },
  { label: "Fan Retention", icon: Users, prompt: "What retention strategies should I implement right now to reduce churn? Give me 5 actionable steps." },
  { label: "Content Calendar", icon: Clock, prompt: "Create a 7-day content calendar for my top creator with post ideas and optimal posting times." },
];

const MODE_CONFIG = [
  { id: "chat" as CopilotMode, label: "Chat", icon: MessageSquare },
  { id: "image" as CopilotMode, label: "Image", icon: ImageIcon },
  { id: "video" as CopilotMode, label: "Video", icon: Video },
  { id: "audio" as CopilotMode, label: "Audio", icon: Volume2 },
  { id: "freeWill" as CopilotMode, label: "Free Will", icon: Wand2 },
];

const saveDraft = (convoId: string | null, input: string, attachments: Attachment[]) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ convoId, input, attachments })); } catch {}
};
const loadDraftData = () => {
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
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [mode, setMode] = useState<CopilotMode>("chat");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [voiceSamples, setVoiceSamples] = useState<File[]>([]);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [showVoiceManager, setShowVoiceManager] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [audioText, setAudioText] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceSampleInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!draftRestored) return;
    saveDraft(activeConvoId, input, attachments);
  }, [input, attachments, activeConvoId, draftRestored]);

  const loadData = async () => {
    const [convos, accts, voicesData] = await Promise.all([
      supabase.from("copilot_conversations").select("*").order("updated_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, monthly_revenue, subscriber_count, status"),
      supabase.from("copilot_voices").select("*").order("is_preset", { ascending: false }).order("name"),
    ]);
    setConversations(convos.data || []);
    setAccounts(accts.data || []);
    setVoices((voicesData.data as Voice[]) || []);
    if (voicesData.data?.length) setSelectedVoice(voicesData.data[0].id);

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
    if (accounts.length > 0) parts.push(`Agency: ${accounts.length} creators, $${accounts.reduce((s: number, a: any) => s + (a.monthly_revenue || 0), 0).toLocaleString()}/mo`);
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

  const streamResponse = async (apiMessages: any[], convoId: string, baseMessages: Msg[], msgText: string) => {
    setIsStreaming(true);
    let assistantSoFar = "";
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
        setMessages([...baseMessages, { role: "assistant", content: "🎨 Generating..." }]);
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
            } catch { textBuffer = line + "\n" + textBuffer; break; }
          }
        }

        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try { const c = JSON.parse(jsonStr).choices?.[0]?.delta?.content; if (c) assistantSoFar += c; } catch {}
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

    let convoId = activeConvoId;
    if (!convoId) {
      convoId = await createConvo(newMessages, msgText.slice(0, 50));
      if (!convoId) return;
    }

    const apiMessages = messages.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    apiMessages.push({ role: "user", content: apiContent } as any);
    await streamResponse(apiMessages, convoId, newMessages, msgText);
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
    const convoId = activeConvoId;
    if (!convoId) return;
    const apiMessages = truncated.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    apiMessages.push({ role: "user", content: buildApiContent(newContent, editAtts) });
    await streamResponse(apiMessages, convoId, newMessages, newContent);
  };

  const handleRevertTo = async (idx: number) => {
    if (isStreaming) return;
    const truncated = messages.slice(0, idx + 1);
    setMessages(truncated);
    if (activeConvoId) await saveConversation(activeConvoId, truncated);
    toast.success("Reverted to this point");
  };

  const handleRegenerate = async () => {
    if (isStreaming || messages.length < 2) return;
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
    const apiMessages = truncated.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    await streamResponse(apiMessages, convoId, truncated, truncated[lastUserIdx].content);
  };

  const handleCopy = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // ---- Audio generation ----
  const generateAudio = async () => {
    if (!audioText.trim() || !selectedVoice) return;
    setIsGeneratingAudio(true);
    try {
      const voice = voices.find(v => v.id === selectedVoice);
      if (!voice?.elevenlabs_voice_id) { toast.error("Selected voice has no ElevenLabs ID"); return; }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: audioText, voiceId: voice.elevenlabs_voice_id }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "TTS failed");
      }

      const blob = await resp.blob();
      const audioUrl = URL.createObjectURL(blob);

      // Add to chat as assistant message
      const userMsg: Msg = { role: "user", content: `🔊 Generate audio: "${audioText}" (voice: ${voice.name})` };
      const assistantMsg: Msg = { role: "assistant", content: `Here's the generated audio with **${voice.name}** voice:`, audioUrl };
      const newMessages = [...messages, userMsg, assistantMsg];
      setMessages(newMessages);
      scrollToBottom();

      let convoId = activeConvoId;
      if (!convoId) {
        convoId = await createConvo(newMessages, `Audio: ${audioText.slice(0, 40)}`);
      } else {
        await saveConversation(convoId, newMessages, audioText);
      }
      setAudioText("");
      toast.success("Audio generated!");
    } catch (e: any) {
      toast.error(e.message || "Audio generation failed");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // ---- Voice cloning ----
  const handleCloneVoice = async () => {
    if (!newVoiceName.trim() || voiceSamples.length === 0) {
      toast.error("Provide a name and at least one audio sample (30s+ recommended)");
      return;
    }
    setIsCloningVoice(true);
    try {
      // Upload samples
      const sampleUrls: string[] = [];
      for (const file of voiceSamples) {
        const path = `voice-samples/${crypto.randomUUID()}.${file.name.split(".").pop() || "mp3"}`;
        const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
        if (error) throw new Error(`Upload failed: ${file.name}`);
        const { data: urlData } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
        sampleUrls.push(urlData.publicUrl);
      }

      // Call clone endpoint
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "clone", text: newVoiceName, samples: sampleUrls }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Clone failed");
      }

      const { voice_id } = await resp.json();

      // Save to database
      const { data: newVoice, error } = await supabase.from("copilot_voices").insert({
        name: newVoiceName,
        description: `Cloned from ${voiceSamples.length} sample(s)`,
        elevenlabs_voice_id: voice_id,
        sample_urls: sampleUrls,
        is_preset: false,
      }).select().single();

      if (error) throw error;
      setVoices(prev => [...prev, newVoice as Voice]);
      setSelectedVoice(newVoice!.id);
      setNewVoiceName("");
      setVoiceSamples([]);
      toast.success(`Voice "${newVoiceName}" cloned successfully!`);
    } catch (e: any) {
      toast.error(e.message || "Voice cloning failed");
    } finally {
      setIsCloningVoice(false);
    }
  };

  const deleteVoice = async (voiceId: string) => {
    const { error } = await supabase.from("copilot_voices").delete().eq("id", voiceId);
    if (error) { toast.error("Delete failed"); return; }
    setVoices(prev => prev.filter(v => v.id !== voiceId));
    if (selectedVoice === voiceId) setSelectedVoice(voices[0]?.id || "");
    toast.success("Voice deleted");
  };

  const playVoicePreview = async (voice: Voice) => {
    if (playingPreview === voice.id) {
      previewAudioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }
    if (!voice.elevenlabs_voice_id) return;
    setPlayingPreview(voice.id);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: "Hello, this is a preview of my voice.", voiceId: voice.elevenlabs_voice_id }),
      });
      if (!resp.ok) throw new Error("Preview failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => setPlayingPreview(null);
      await audio.play();
    } catch {
      toast.error("Preview failed");
      setPlayingPreview(null);
    }
  };

  // Send mode-specific prompt
  const sendModePrompt = (modeOverride?: CopilotMode) => {
    const m = modeOverride || mode;
    if (m === "image") {
      if (!imagePrompt.trim()) return;
      sendMessage(`Generate an image: ${imagePrompt}`);
      setImagePrompt("");
    } else if (m === "video") {
      if (!videoPrompt.trim()) return;
      sendMessage(`Generate a video: ${videoPrompt}`);
      setVideoPrompt("");
    } else if (m === "audio") {
      generateAudio();
    } else {
      sendMessage();
    }
  };

  // ---- Render helpers ----
  const renderPendingAttachments = () => {
    if (attachments.length === 0) return null;
    return (
      <div className="px-3 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {att.type === "image" ? (
                <div className="relative w-[100px] h-[80px]"><img src={att.url} alt={att.name} className="w-full h-full object-cover" /></div>
              ) : att.type === "video" ? (
                <div className="relative w-[100px] h-[80px] bg-black/40 flex items-center justify-center">
                  <video src={att.url} className="w-full h-full object-cover" muted /><Play className="absolute h-6 w-6 text-white/70" />
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

  const renderMessageActions = (msg: Msg, idx: number) => {
    const isUser = msg.role === "user";
    const isLastAssistant = !isUser && idx === messages.length - 1;
    return (
      <div className={`flex items-center gap-0.5 mt-1 transition-opacity ${hoveredIdx === idx ? "opacity-100" : "opacity-0"}`}>
        <Button size="sm" variant="ghost" onClick={() => handleCopy(idx)} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Copy">
          {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </Button>
        {isUser && (
          <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(idx); setEditText(msg.content); setEditAttachments(msg.attachments ? [...msg.attachments] : []); }}
            className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Edit"><Pencil className="h-3 w-3" /></Button>
        )}
        {isLastAssistant && (
          <Button size="sm" variant="ghost" onClick={handleRegenerate} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Regenerate"><RefreshCw className="h-3 w-3" /></Button>
        )}
        {idx < messages.length - 1 && (
          <Button size="sm" variant="ghost" onClick={() => handleRevertTo(idx)} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10" title="Revert"><RotateCcw className="h-3 w-3" /></Button>
        )}
      </div>
    );
  };

  // ---- Mode-specific panels ----
  const renderImagePanel = () => (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon className="h-5 w-5 text-pink-400" />
        <p className="text-sm font-medium text-white">Image Generation</p>
      </div>
      <p className="text-[11px] text-white/40">Describe what you want to generate. The AI will create it for you.</p>
      <Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
        placeholder="A cyberpunk cityscape at sunset with neon lights..."
        className="bg-white/5 border-white/10 text-white text-sm min-h-[100px] resize-none placeholder:text-white/20"
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendModePrompt("image"); } }}
      />
      <Button onClick={() => sendModePrompt("image")} disabled={!imagePrompt.trim() || isStreaming}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
        {isStreaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
        Generate Image
      </Button>
    </div>
  );

  const renderVideoPanel = () => (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Video className="h-5 w-5 text-blue-400" />
        <p className="text-sm font-medium text-white">Video Generation</p>
      </div>
      <p className="text-[11px] text-white/40">Describe the video you want. Include motion, camera, and style details.</p>
      <Textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)}
        placeholder="A slow zoom into a tropical beach with waves..."
        className="bg-white/5 border-white/10 text-white text-sm min-h-[100px] resize-none placeholder:text-white/20"
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendModePrompt("video"); } }}
      />
      <Button onClick={() => sendModePrompt("video")} disabled={!videoPrompt.trim() || isStreaming}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
        {isStreaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
        Generate Video
      </Button>
    </div>
  );

  const renderAudioPanel = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-emerald-400" />
          <p className="text-sm font-medium text-white">Audio Generation</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowVoiceManager(!showVoiceManager)}
          className="text-[10px] text-white/40 hover:text-white h-7 px-2">
          {showVoiceManager ? "Hide Voices" : "Manage Voices"}
        </Button>
      </div>

      {showVoiceManager && (
        <div className="space-y-3 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
          <p className="text-[11px] font-medium text-white/60">🎙 Voice Library</p>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1.5">
              {voices.map(v => (
                <div key={v.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                  selectedVoice === v.id ? "bg-accent/20 border border-accent/30" : "bg-white/[0.03] hover:bg-white/[0.06] border border-transparent"
                }`} onClick={() => setSelectedVoice(v.id)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white font-medium truncate">{v.name}</p>
                    <p className="text-[9px] text-white/30 truncate">{v.description || (v.is_preset ? "Preset" : "Custom")}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); playVoicePreview(v); }}
                    className="h-6 w-6 p-0 text-white/30 hover:text-white shrink-0">
                    {playingPreview === v.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  {!v.is_preset && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteVoice(v.id); }}
                      className="h-6 w-6 p-0 text-white/20 hover:text-red-400 shrink-0"><Trash className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Clone new voice */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <p className="text-[10px] font-medium text-white/50">Clone New Voice</p>
            <Input value={newVoiceName} onChange={e => setNewVoiceName(e.target.value)}
              placeholder="Voice name..."
              className="bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/20" />
            <div className="flex items-center gap-2">
              <input ref={voiceSampleInputRef} type="file" multiple accept="audio/*" className="hidden"
                onChange={e => { const files = Array.from(e.target.files || []); setVoiceSamples(prev => [...prev, ...files]); }}
              />
              <Button size="sm" variant="outline" onClick={() => voiceSampleInputRef.current?.click()}
                className="text-[10px] h-7 border-white/10 text-white/50 hover:text-white hover:bg-white/5">
                <Upload className="h-3 w-3 mr-1" /> Upload Samples
              </Button>
              {voiceSamples.length > 0 && (
                <span className="text-[9px] text-white/30">{voiceSamples.length} file(s)</span>
              )}
            </div>
            {voiceSamples.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {voiceSamples.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[8px] border-white/10 text-white/40 gap-1">
                    <Music className="h-2.5 w-2.5" /> {f.name.slice(0, 20)}
                    <button onClick={() => setVoiceSamples(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-400">
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Button size="sm" onClick={handleCloneVoice} disabled={isCloningVoice || !newVoiceName.trim() || voiceSamples.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-8">
              {isCloningVoice ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
              Clone Voice
            </Button>
          </div>
        </div>
      )}

      {/* Voice selection */}
      <Select value={selectedVoice} onValueChange={setSelectedVoice}>
        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
          <SelectValue placeholder="Choose a voice..." />
        </SelectTrigger>
        <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[300px]">
          {voices.map(v => (
            <SelectItem key={v.id} value={v.id} className="text-white text-xs">
              {v.name} {v.is_preset ? "" : "🎙"} — <span className="text-white/30">{v.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Text to speak */}
      <Textarea value={audioText} onChange={e => setAudioText(e.target.value)}
        placeholder="Type what you want the voice to say..."
        className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] resize-none placeholder:text-white/20"
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateAudio(); } }}
      />
      <Button onClick={generateAudio} disabled={!audioText.trim() || !selectedVoice || isGeneratingAudio}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
        {isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
        Generate Audio
      </Button>
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col">
        <Button size="sm" onClick={() => { setActiveConvoId(null); setMessages([]); setInput(""); setAttachments([]); clearDraft(); }}
          className="w-full bg-accent hover:bg-accent/90 text-white text-xs mb-3 h-9">
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
        {/* Header with mode tabs */}
        <div className="border-b border-white/[0.06]">
          <div className="p-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Grandmaster AI Co-Pilot</p>
            </div>
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
          {/* Mode tabs */}
          <div className="px-3 pb-2 flex gap-1 overflow-x-auto">
            {MODE_CONFIG.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  mode === m.id
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"
                }`}>
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode panels for image/video/audio */}
        {(mode === "image" || mode === "video" || mode === "audio") && (
          <div className="border-b border-white/[0.06]">
            {mode === "image" && renderImagePanel()}
            {mode === "video" && renderVideoPanel()}
            {mode === "audio" && renderAudioPanel()}
          </div>
        )}

        {/* Chat messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Brain className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-1">Your AI Agency Brain</p>
              <p className="text-white/20 text-xs mb-6 max-w-sm">
                {mode === "freeWill" ? "Free Will mode — no limits, ask anything." : "Ask anything — a conversation is created automatically."}
              </p>
              {(mode === "chat" || mode === "freeWill") && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-w-lg">
                  {QUICK_PROMPTS.map(qp => (
                    <button key={qp.label} onClick={() => sendMessage(qp.prompt)}
                      className="h-auto py-2.5 px-3 rounded-lg border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] text-left flex flex-col items-start gap-1.5 transition-all">
                      <qp.icon className="h-3.5 w-3.5 text-accent" />
                      <span className="text-[10px] leading-tight">{qp.label}</span>
                    </button>
                  ))}
                </div>
              )}
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
                          className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] resize-none mb-2 placeholder:text-white/20"
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(i); } }}
                        />
                        {editAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editAttachments.map((att, ai) => (
                              <div key={ai} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
                                {att.type === "image" ? (
                                  <div className="w-[70px] h-[55px]"><img src={att.url} alt={att.name} className="w-full h-full object-cover" /></div>
                                ) : att.type === "video" ? (
                                  <div className="w-[70px] h-[55px] bg-black/40 flex items-center justify-center"><Play className="h-4 w-4 text-white/70" /></div>
                                ) : (
                                  <div className="flex items-center gap-1 px-2 py-1.5">
                                    {att.type === "audio" ? <Music className="h-3 w-3 text-accent" /> : <FileText className="h-3 w-3 text-accent" />}
                                    <span className="text-[8px] text-white/50 truncate max-w-[60px]">{att.name}</span>
                                  </div>
                                )}
                                <button onClick={() => setEditAttachments(prev => prev.filter((_, j) => j !== ai))}
                                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <input ref={editFileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.csv" className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            for (const file of files) {
                              if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} too large`); continue; }
                              const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "bin"}`;
                              const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
                              if (error) { toast.error(`Upload failed`); continue; }
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
                        <div className="flex gap-2 justify-between">
                          <Button size="sm" variant="ghost" onClick={() => editFileInputRef.current?.click()} className="h-7 px-2 text-[10px] text-white/40 hover:text-white gap-1">
                            <Paperclip className="h-3 w-3" /> Attach
                          </Button>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(null); setEditAttachments([]); }} className="h-7 px-3 text-[10px] text-white/40 hover:text-white">Cancel</Button>
                            <Button size="sm" onClick={() => handleEditMessage(i)} className="h-7 px-3 text-[10px] bg-accent hover:bg-accent/90 text-white">Save & Regenerate</Button>
                          </div>
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
                              {msg.audioUrl && (
                                <div className="mt-2">
                                  <audio controls src={msg.audioUrl} className="w-full h-10" />
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
            </div>
          )}
        </ScrollArea>

        {renderPendingAttachments()}

        {/* Input bar - always visible for chat/freeWill modes */}
        {(mode === "chat" || mode === "freeWill") && (
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
                placeholder={mode === "freeWill" ? "Anything goes — no restrictions..." : "Ask anything, attach files, generate images & videos..."}
                className="bg-white/5 border-white/10 text-white text-xs min-h-[40px] max-h-[120px] resize-none placeholder:text-white/20"
                rows={1}
              />
              <Button onClick={() => sendMessage()} disabled={(!input.trim() && attachments.length === 0) || isStreaming}
                className="bg-accent hover:bg-accent/90 h-10 w-10 p-0 shrink-0 text-white">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICoPilot;

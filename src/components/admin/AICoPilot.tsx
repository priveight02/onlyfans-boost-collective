import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Bot, Send, Plus, Trash2, Loader2, Sparkles, Brain, MessageSquare,
  Zap, Target, TrendingUp, DollarSign, Users, Clock,
  Paperclip, Download, X, FileText, Music, Play, Pause,
  Pencil, RotateCcw, Copy, Check, RefreshCw, ChevronDown,
  Image as ImageIcon, Video, Mic, Wand2, Volume2, Upload, Trash,
  Square, Smartphone, Monitor, Settings2, Maximize2, Grid, Rows, Columns,
  ZoomIn, ZoomOut,
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
  is_preset: boolean | null;
  sample_urls: string[] | null;
  preview_url: string | null;
}

interface GeneratedContent {
  id: string;
  content_type: string;
  prompt: string | null;
  url: string;
  metadata: any;
  mode: string;
  aspect_ratio: string | null;
  quality_mode: string | null;
  created_at: string;
}

type CopilotMode = "chat" | "image" | "video" | "audio" | "freeWill";
type QualityMode = "best" | "high";
type LayoutMode = "grid" | "horizontal" | "vertical";

const DRAFT_KEY = "copilot_draft";
const PREFS_KEY = "copilot_display_prefs";
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

const savePrefs = (prefs: any) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
};
const loadPrefs = (): { scale: number; layout: LayoutMode } => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { scale: 1, layout: "grid" };
};

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
  const [qualityMode, setQualityMode] = useState<QualityMode>("best");

  // Voice state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [voiceSamples, setVoiceSamples] = useState<File[]>([]);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [showVoiceManager, setShowVoiceManager] = useState(false);
  const [audioText, setAudioText] = useState("");

  // Image state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageRefs, setImageRefs] = useState<Attachment[]>([]);
  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [generatedImages, setGeneratedImages] = useState<GeneratedContent[]>([]);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoStartFrame, setVideoStartFrame] = useState<Attachment | null>(null);
  const [videoDuration, setVideoDuration] = useState<"5" | "10">("5");
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedContent[]>([]);

  // Audio generated content
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedContent[]>([]);

  // Display prefs (auto-saved)
  const [displayScale, setDisplayScale] = useState(1);
  const [displayLayout, setDisplayLayout] = useState<LayoutMode>("grid");

  const editFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceSampleInputRef = useRef<HTMLInputElement>(null);
  const imageRefInputRef = useRef<HTMLInputElement>(null);
  const videoFrameInputRef = useRef<HTMLInputElement>(null);

  // Load display prefs on mount
  useEffect(() => {
    const prefs = loadPrefs();
    setDisplayScale(prefs.scale);
    setDisplayLayout(prefs.layout);
  }, []);

  // Auto-save display prefs
  useEffect(() => {
    savePrefs({ scale: displayScale, layout: displayLayout });
  }, [displayScale, displayLayout]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!draftRestored) return;
    saveDraft(activeConvoId, input, attachments);
  }, [input, attachments, activeConvoId, draftRestored]);

  const loadData = async () => {
    const [convos, accts, voicesData, imagesData, videosData, audiosData] = await Promise.all([
      supabase.from("copilot_conversations").select("*").order("updated_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, monthly_revenue, subscriber_count, status"),
      supabase.from("copilot_voices").select("*").order("is_preset", { ascending: false }).order("name"),
      supabase.from("copilot_generated_content").select("*").eq("mode", "image").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "video").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "audio").order("created_at", { ascending: false }),
    ]);
    setConversations(convos.data || []);
    setAccounts(accts.data || []);
    const loadedVoices = (voicesData.data || []).map((v: any) => ({
      id: v.id, name: v.name, description: v.description,
      is_preset: v.is_preset, sample_urls: v.sample_urls, preview_url: v.preview_url,
    })) as Voice[];
    setVoices(loadedVoices);
    if (loadedVoices.length) setSelectedVoice(loadedVoices[0].id);
    setGeneratedImages((imagesData.data || []) as GeneratedContent[]);
    setGeneratedVideos((videosData.data || []) as GeneratedContent[]);
    setGeneratedAudios((audiosData.data || []) as GeneratedContent[]);

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

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} exceeds 20MB`); return null; }
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "bin"}`;
    const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
    if (error) { toast.error(`Upload failed: ${file.name}`); return null; }
    const { data: urlData } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
    return urlData.publicUrl;
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

  // Save generated content to Supabase
  const saveGeneratedContent = async (contentType: string, url: string, prompt: string, modeTab: string, extra?: any): Promise<GeneratedContent | null> => {
    const { data, error } = await supabase.from("copilot_generated_content").insert({
      content_type: contentType,
      url,
      prompt,
      mode: modeTab,
      aspect_ratio: extra?.aspect_ratio || null,
      quality_mode: qualityMode,
      account_id: contextAccount || null,
      metadata: extra?.metadata || {},
    }).select().single();
    if (error) { console.error("Save content error:", error); return null; }
    return data as GeneratedContent;
  };

  // Delete generated content from Supabase
  const deleteGeneratedContent = async (id: string, modeTab: string) => {
    const { error } = await supabase.from("copilot_generated_content").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    if (modeTab === "image") setGeneratedImages(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "video") setGeneratedVideos(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "audio") setGeneratedAudios(prev => prev.filter(c => c.id !== id));
    toast.success("Deleted");
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
        body: JSON.stringify({ messages: apiMessages, context: buildContext(), quality: qualityMode }),
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
        } else if (data.type === "audio") {
          const assistantMsg: Msg = { role: "assistant", content: data.content || "Here's the generated audio.", audioUrl: data.audioUrl };
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

    let apiContent: any = msgText;
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

  // ---- Voice cloning (Gemini-based) ----
  const handleCloneVoice = async () => {
    if (!newVoiceName.trim() || voiceSamples.length === 0) {
      toast.error("Provide a name and at least one audio sample (30s+ recommended)");
      return;
    }
    setIsCloningVoice(true);
    try {
      const sampleUrls: string[] = [];
      for (const file of voiceSamples) {
        const url = await uploadFileToStorage(file);
        if (url) sampleUrls.push(url);
      }
      if (sampleUrls.length === 0) throw new Error("No samples uploaded");

      const { data: newVoice, error } = await supabase.from("copilot_voices").insert({
        name: newVoiceName,
        description: `Cloned from ${sampleUrls.length} sample(s) — AI voice matching`,
        sample_urls: sampleUrls,
        is_preset: false,
      }).select().single();

      if (error) throw error;
      setVoices(prev => [...prev, newVoice as unknown as Voice]);
      setSelectedVoice(newVoice!.id);
      setNewVoiceName("");
      setVoiceSamples([]);
      toast.success(`Voice "${newVoiceName}" saved! Tone will be matched when generating audio.`);
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

  // ---- Audio generation (isolated — no chat leaking) ----
  const generateAudio = async () => {
    if (!audioText.trim() || isGeneratingAudio) return;
    setIsGeneratingAudio(true);
    try {
      const voice = voices.find(v => v.id === selectedVoice);
      const voiceContext = voice
        ? `Voice profile: "${voice.name}" — ${voice.description || "custom voice"}. ${voice.sample_urls?.length ? `Reference audio samples available at: ${voice.sample_urls.join(", ")}` : ""}`
        : "";

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: `[AUDIO GENERATION REQUEST]\nText to speak: "${audioText}"\n${voiceContext}\nGenerate natural, expressive speech audio for this text. Match the voice tone and style from the samples if provided.` }],
          context: buildContext(),
          quality: qualityMode,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      // Save to DB
      const saved = await saveGeneratedContent("audio", data.audioUrl || data.content || "", audioText, "audio", {
        metadata: { voice: voice?.name || "default" },
      });
      if (saved) {
        setGeneratedAudios(prev => [saved, ...prev]);
      }
      toast.success("Audio generated!");
      setAudioText("");
    } catch (e: any) {
      toast.error(e.message || "Audio generation failed");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // ---- Image panel actions (isolated) ----
  const handleImageRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const url = await uploadFileToStorage(file);
      if (url) setImageRefs(prev => [...prev, { type: "image", name: file.name, url, mimeType: file.type, size: file.size }]);
    }
    if (imageRefInputRef.current) imageRefInputRef.current.value = "";
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || isStreaming) return;
    setIsStreaming(true);
    const currentRefs = [...imageRefs];
    const prompt = imagePrompt;
    setImagePrompt("");

    try {
      const parts: any[] = [{ type: "text", text: `Generate an image (aspect ratio ${imageAspect}): ${prompt}${currentRefs.length > 0 ? " Use these reference images for style/content guidance." : ""}` }];
      for (const ref of currentRefs) {
        parts.push({ type: "image_url", image_url: { url: ref.url } });
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: currentRefs.length > 0 ? parts : parts[0].text }], context: buildContext(), quality: qualityMode }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      if (data.type === "image" && data.images?.length) {
        for (const img of data.images) {
          const saved = await saveGeneratedContent("image", img.image_url.url, prompt, "image", {
            aspect_ratio: imageAspect,
          });
          if (saved) setGeneratedImages(prev => [saved, ...prev]);
        }
        toast.success("Image generated!");
      } else {
        toast.error("No image returned");
      }
      setImageRefs([]);
    } catch (e: any) {
      toast.error(e.message || "Image generation failed");
    } finally {
      setIsStreaming(false);
    }
  };

  // ---- Video generation (isolated) ----
  const handleVideoFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = await uploadFileToStorage(file);
    if (url) setVideoStartFrame({ type: "image", name: file.name, url, mimeType: file.type, size: file.size });
    if (videoFrameInputRef.current) videoFrameInputRef.current.value = "";
  };

  const generateVideo = async () => {
    if (!videoPrompt.trim() || isStreaming) return;
    setIsStreaming(true);
    const prompt = videoPrompt;
    const frame = videoStartFrame;
    setVideoPrompt("");
    setVideoStartFrame(null);

    try {
      const parts: any[] = [{ type: "text", text: `Generate a ${videoDuration}-second video: ${prompt}${frame ? " Use this starting frame image as the base." : ""}` }];
      if (frame) parts.push({ type: "image_url", image_url: { url: frame.url } });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: frame ? parts : parts[0].text }], context: buildContext(), quality: qualityMode }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      if (data.type === "image" && data.images?.length) {
        for (const img of data.images) {
          const saved = await saveGeneratedContent("video", img.image_url.url, prompt, "video", {
            metadata: { duration: videoDuration },
          });
          if (saved) setGeneratedVideos(prev => [saved, ...prev]);
        }
        toast.success("Video/content generated!");
      } else {
        toast.info(data.content || "Generation complete — check results");
      }
    } catch (e: any) {
      toast.error(e.message || "Video generation failed");
    } finally {
      setIsStreaming(false);
    }
  };

  // ---- Scaling controls ----
  const renderScaleControls = () => (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.01]">
      <span className="text-[9px] text-white/30 mr-1">Scale</span>
      <Button size="sm" variant="ghost" onClick={() => setDisplayScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))} className="h-5 w-5 p-0 text-white/30 hover:text-white"><ZoomOut className="h-3 w-3" /></Button>
      <Slider
        value={[displayScale]}
        onValueChange={([v]) => setDisplayScale(v)}
        min={0.5} max={5} step={0.25}
        className="w-20"
      />
      <span className="text-[9px] text-white/50 w-8 text-center">{displayScale}x</span>
      <Button size="sm" variant="ghost" onClick={() => setDisplayScale(s => Math.min(5, +(s + 0.25).toFixed(2)))} className="h-5 w-5 p-0 text-white/30 hover:text-white"><ZoomIn className="h-3 w-3" /></Button>
      <div className="border-l border-white/10 pl-2 ml-1 flex gap-0.5">
        {([
          { id: "grid" as LayoutMode, icon: Grid },
          { id: "horizontal" as LayoutMode, icon: Columns },
          { id: "vertical" as LayoutMode, icon: Rows },
        ]).map(l => (
          <button key={l.id} onClick={() => setDisplayLayout(l.id)}
            className={`h-5 w-5 flex items-center justify-center rounded ${displayLayout === l.id ? "bg-accent/20 text-accent" : "text-white/20 hover:text-white/40"}`}>
            <l.icon className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  );

  const getGalleryLayout = () => {
    if (displayLayout === "horizontal") return "flex flex-row flex-wrap gap-3 overflow-x-auto";
    if (displayLayout === "vertical") return "flex flex-col gap-3";
    return "grid grid-cols-2 gap-3";
  };

  const getItemStyle = () => {
    const baseW = 200 * displayScale;
    const baseH = 150 * displayScale;
    return { maxWidth: `${baseW}px`, maxHeight: `${baseH}px` };
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

  // ---- Content gallery (shared for image/video/audio) ----
  const renderContentGallery = (items: GeneratedContent[], modeTab: string) => {
    if (items.length === 0) {
      const Icon = modeTab === "image" ? ImageIcon : modeTab === "video" ? Video : Volume2;
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Icon className="h-10 w-10 text-white/10 mb-3" />
          <p className="text-white/20 text-xs">Generated {modeTab}s will appear here</p>
          <p className="text-[9px] text-white/10 mt-1">Synced with database • auto-saved</p>
        </div>
      );
    }

    return (
      <div className={getGalleryLayout()}>
        {items.map((item) => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
            style={displayLayout !== "vertical" ? { width: `${200 * displayScale}px` } : {}}>
            {modeTab === "audio" ? (
              <div className="p-3">
                <p className="text-[10px] text-white/50 mb-2 truncate">{item.prompt}</p>
                <audio controls src={item.url} className="w-full h-8" />
              </div>
            ) : (
              <img src={item.url} alt="" className="w-full object-cover rounded-t-xl"
                style={{ maxHeight: `${150 * displayScale}px` }} />
            )}
            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { const a = document.createElement("a"); a.href = item.url; a.download = `${modeTab}_${item.id}.png`; a.click(); }}
                className="h-7 w-7 rounded-lg bg-black/60 flex items-center justify-center hover:bg-black/80">
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
              <button onClick={() => deleteGeneratedContent(item.id, modeTab)}
                className="h-7 w-7 rounded-lg bg-black/60 flex items-center justify-center hover:bg-red-500/60">
                <Trash className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
            {modeTab !== "audio" && (
              <div className="p-2">
                <p className="text-[9px] text-white/40 truncate"><span className="text-accent">Prompt:</span> {item.prompt}</p>
                <div className="flex gap-1.5 mt-1.5">
                  {modeTab === "image" && (
                    <button onClick={() => setImagePrompt(item.prompt || "")} className="flex items-center gap-0.5 text-[9px] text-white/30 hover:text-white border border-white/10 rounded px-1.5 py-0.5">
                      <RotateCcw className="h-2.5 w-2.5" /> Reuse
                    </button>
                  )}
                  {modeTab === "video" && (
                    <button onClick={() => setVideoPrompt(item.prompt || "")} className="flex items-center gap-0.5 text-[9px] text-white/30 hover:text-white border border-white/10 rounded px-1.5 py-0.5">
                      <RotateCcw className="h-2.5 w-2.5" /> Reuse
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ---- Mode panels ----
  const renderImagePanel = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[380px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/60">Prompt</p>
            <span className="text-[10px] text-accent">{qualityMode === "best" ? "Best Quality" : "High Quality"}</span>
          </div>
          <Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
            placeholder="Describe precisely what you want..."
            className="bg-white/5 border-white/10 text-white text-sm min-h-[120px] resize-none placeholder:text-white/20"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateImage(); } }}
          />

          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-colors"
            onClick={() => imageRefInputRef.current?.click()}>
            <Upload className="h-5 w-5 text-white/20" />
            <p className="text-[10px] text-white/30 text-center">Reference images • click to select</p>
          </div>
          <input ref={imageRefInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageRefUpload} />

          {imageRefs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imageRefs.map((ref, i) => (
                <div key={i} className="relative group w-[60px] h-[60px] rounded-lg overflow-hidden border border-white/10">
                  <img src={ref.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImageRefs(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            {["1:1", "16:9", "9:16"].map(r => (
              <button key={r} onClick={() => setImageAspect(r)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all ${
                  imageAspect === r ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"
                }`}>
                {r === "1:1" && <Square className="h-3 w-3" />}
                {r === "16:9" && <Monitor className="h-3 w-3" />}
                {r === "9:16" && <Smartphone className="h-3 w-3" />}
                {r}
              </button>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2">
            <Select value={qualityMode} onValueChange={v => setQualityMode(v as QualityMode)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-[11px] w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                <SelectItem value="best" className="text-white text-xs">Best Quality</SelectItem>
                <SelectItem value="high" className="text-white text-xs">High Quality</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateImage} disabled={!imagePrompt.trim() || isStreaming}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs h-8">
              {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Generate
            </Button>
          </div>
        </div>

        {/* Right: Gallery */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderScaleControls()}
          <ScrollArea className="flex-1 p-4">
            {renderContentGallery(generatedImages, "image")}
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  const renderVideoPanel = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[380px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/60">Prompt</p>
            <span className="text-[10px] text-accent">{qualityMode === "best" ? "Best Quality" : "High Quality"}</span>
          </div>
          <Textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)}
            placeholder="Describe precisely what you want..."
            className="bg-white/5 border-white/10 text-white text-sm min-h-[120px] resize-none placeholder:text-white/20"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateVideo(); } }}
          />

          <div className="flex gap-3">
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors flex-1 min-h-[100px] relative"
              onClick={() => videoFrameInputRef.current?.click()}>
              {videoStartFrame ? (
                <>
                  <img src={videoStartFrame.url} alt="" className="w-full h-full object-cover rounded-lg absolute inset-0" />
                  <button onClick={(e) => { e.stopPropagation(); setVideoStartFrame(null); }}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center z-10">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-white/20" />
                  <p className="text-[9px] text-white/30 text-center">Start Frame</p>
                </>
              )}
            </div>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 flex-1 min-h-[100px] opacity-50">
              <Upload className="h-5 w-5 text-white/20" />
              <p className="text-[9px] text-white/30 text-center">End Frame (opt.)</p>
            </div>
          </div>
          <input ref={videoFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleVideoFrameUpload} />

          <div className="flex gap-1">
            {(["5", "10"] as const).map(d => (
              <button key={d} onClick={() => setVideoDuration(d)}
                className={`px-3 py-1 rounded text-[10px] border transition-all ${
                  videoDuration === d ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"
                }`}>
                {d}s
              </button>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2">
            <Select value={qualityMode} onValueChange={v => setQualityMode(v as QualityMode)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-[11px] w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                <SelectItem value="best" className="text-white text-xs">Best Quality</SelectItem>
                <SelectItem value="high" className="text-white text-xs">High Quality</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateVideo} disabled={!videoPrompt.trim() || isStreaming}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs h-8">
              {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Generate
            </Button>
          </div>
        </div>

        {/* Right: Gallery */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderScaleControls()}
          <ScrollArea className="flex-1 p-4">
            {renderContentGallery(generatedVideos, "video")}
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  const renderAudioPanel = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[380px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-medium text-white">Audio</p>
              <Badge variant="outline" className="text-[8px] border-accent/20 text-accent">Gemini AI</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowVoiceManager(!showVoiceManager)}
              className="text-[10px] text-white/40 hover:text-white h-6 px-2 gap-1">
              <Settings2 className="h-3 w-3" />
              {showVoiceManager ? "Hide" : "Voices"}
            </Button>
          </div>

          {showVoiceManager && (
            <div className="space-y-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1">
                  {voices.map(v => (
                    <div key={v.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedVoice === v.id ? "bg-accent/20 border border-accent/30" : "bg-white/[0.03] hover:bg-white/[0.06] border border-transparent"
                    }`} onClick={() => setSelectedVoice(v.id)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-medium truncate">{v.name}</p>
                        <p className="text-[8px] text-white/30 truncate">{v.description || (v.is_preset ? "Preset" : "Custom")}</p>
                      </div>
                      {v.sample_urls && v.sample_urls.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const audio = new Audio(v.sample_urls![0]); audio.play().catch(() => {}); }}
                          className="h-5 w-5 p-0 text-white/30 hover:text-white shrink-0"><Play className="h-2.5 w-2.5" /></Button>
                      )}
                      {!v.is_preset && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteVoice(v.id); }}
                          className="h-5 w-5 p-0 text-white/20 hover:text-red-400 shrink-0"><Trash className="h-2.5 w-2.5" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                <p className="text-[9px] font-medium text-white/50">Clone Voice</p>
                <Input value={newVoiceName} onChange={e => setNewVoiceName(e.target.value)}
                  placeholder="Voice name..."
                  className="bg-white/5 border-white/10 text-white text-[10px] h-7 placeholder:text-white/20" />
                <div className="flex items-center gap-2">
                  <input ref={voiceSampleInputRef} type="file" multiple accept="audio/*" className="hidden"
                    onChange={e => { const files = Array.from(e.target.files || []); setVoiceSamples(prev => [...prev, ...files]); }}
                  />
                  <Button size="sm" variant="outline" onClick={() => voiceSampleInputRef.current?.click()}
                    className="text-[9px] h-6 border-white/10 text-white/50 hover:text-white hover:bg-white/5">
                    <Upload className="h-2.5 w-2.5 mr-1" /> Upload (30s+)
                  </Button>
                  {voiceSamples.length > 0 && <span className="text-[8px] text-white/30">{voiceSamples.length} file(s)</span>}
                </div>
                {voiceSamples.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {voiceSamples.map((f, i) => (
                      <Badge key={i} variant="outline" className="text-[7px] border-white/10 text-white/40 gap-0.5">
                        <Music className="h-2 w-2" /> {f.name.slice(0, 15)}
                        <button onClick={() => setVoiceSamples(prev => prev.filter((_, j) => j !== i))}><X className="h-1.5 w-1.5" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Button size="sm" onClick={handleCloneVoice} disabled={isCloningVoice || !newVoiceName.trim() || voiceSamples.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] h-7">
                  {isCloningVoice ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Mic className="h-2.5 w-2.5 mr-1" />}
                  Clone
                </Button>
              </div>
            </div>
          )}

          {voices.length > 0 && (
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Choose a voice..." />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[300px]">
                {voices.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-white text-xs">
                    {v.name} {v.is_preset ? "" : "🎙"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Textarea value={audioText} onChange={e => setAudioText(e.target.value)}
            placeholder="Enter text to convert to audio..."
            className="bg-white/5 border-white/10 text-white text-sm min-h-[100px] resize-none placeholder:text-white/20"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateAudio(); } }}
          />

          <div className="mt-auto">
            <Button onClick={generateAudio} disabled={!audioText.trim() || isGeneratingAudio}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs h-8">
              {isGeneratingAudio ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Volume2 className="h-3.5 w-3.5 mr-1.5" />}
              Generate
            </Button>
          </div>
        </div>

        {/* Right: Audio gallery */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderScaleControls()}
          <ScrollArea className="flex-1 p-4">
            {renderContentGallery(generatedAudios, "audio")}
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  // Chat/FreeWill panel (shared)
  const renderChatPanel = () => (
    <>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Brain className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-white/30 text-sm mb-1">Your AI Agency Brain</p>
            <p className="text-white/20 text-xs mb-6 max-w-sm">
              {mode === "freeWill" ? "Free Will mode — no limits, no restrictions, ask anything." : "Ask anything — a conversation is created automatically."}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-w-lg">
              {QUICK_PROMPTS.map(qp => (
                <button key={qp.label} onClick={() => sendMessage(qp.prompt)}
                  className="h-auto py-2.5 px-3 rounded-lg border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] text-left flex flex-col items-start gap-1.5 transition-all">
                  <qp.icon className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] leading-tight">{qp.label}</span>
                </button>
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
                            const url = await uploadFileToStorage(file);
                            if (!url) continue;
                            let type: Attachment["type"] = "file";
                            if (file.type.startsWith("image/")) type = "image";
                            else if (file.type.startsWith("audio/")) type = "audio";
                            else if (file.type.startsWith("video/")) type = "video";
                            setEditAttachments(prev => [...prev, { type, name: file.name, url, mimeType: file.type, size: file.size }]);
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
            placeholder={mode === "freeWill" ? "Anything goes — no restrictions, fully uncensored..." : "Ask anything, attach files..."}
            className="bg-white/5 border-white/10 text-white text-xs min-h-[40px] max-h-[120px] resize-none placeholder:text-white/20"
            rows={1}
          />
          <Button onClick={() => sendMessage()} disabled={(!input.trim() && attachments.length === 0) || isStreaming}
            className="bg-accent hover:bg-accent/90 h-10 w-10 p-0 shrink-0 text-white">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
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

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Header with mode tabs */}
        <div className="border-b border-white/[0.06]">
          <div className="p-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Grandmaster AI Co-Pilot</p>
            </div>
            {mode === "freeWill" && (
              <Badge variant="outline" className="border-red-500/30 text-red-400 text-[9px]">
                <Wand2 className="h-2.5 w-2.5 mr-1" /> Uncensored
              </Badge>
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

        {/* Mode-specific content — fully isolated */}
        {mode === "image" && renderImagePanel()}
        {mode === "video" && renderVideoPanel()}
        {mode === "audio" && renderAudioPanel()}
        {(mode === "chat" || mode === "freeWill") && renderChatPanel()}
      </div>
    </div>
  );
};

export default AICoPilot;

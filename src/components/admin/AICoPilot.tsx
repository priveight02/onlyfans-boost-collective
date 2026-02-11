import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Send, Plus, Trash2, Loader2, Sparkles, Brain, MessageSquare,
  Zap, Target, TrendingUp, DollarSign, Users, Clock,
  Paperclip, Download, X, FileText, Music, Play, Pause,
  Pencil, RotateCcw, Copy, Check, RefreshCw,
  Image as ImageIcon, Video, Mic, Wand2, Volume2, Upload, Trash,
  Square, Smartphone, Monitor, Settings2, Grid, Rows, Columns,
  ZoomIn, ZoomOut, Headphones, SlidersHorizontal, Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

// ---- Types ----
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
  elevenlabs_voice_id: string | null;
}

interface VoiceParams {
  pitch: number;      // -12 to +12 semitones
  speed: number;      // 0.25x to 4x
  reverb: number;     // 0 to 100
  effects: string[];  // e.g. "warm", "breathy", "crisp"
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

// ---- Constants ----
const DRAFT_KEY = "copilot_draft";
const PREFS_KEY = "copilot_display_prefs";
const VOICE_PARAMS_KEY = "copilot_voice_params";
const MAX_ATTACHMENTS = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DEFAULT_VOICE_PARAMS: VoiceParams = { pitch: 0, speed: 1, reverb: 0, effects: [] };
const VOICE_EFFECTS = ["Warm", "Breathy", "Crisp", "Deep", "Whisper", "Robotic", "Echo"];

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

// ---- Helpers ----
const saveDraft = (convoId: string | null, input: string, attachments: Attachment[]) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ convoId, input, attachments })); } catch {}
};
const loadDraftData = () => {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };
const savePrefs = (prefs: any) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} };
const loadPrefs = (): { scale: number; layout: LayoutMode } => {
  try { const raw = localStorage.getItem(PREFS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { scale: 1.5, layout: "vertical" };
};
const saveVoiceParams = (voiceId: string, params: VoiceParams) => {
  try {
    const all = JSON.parse(localStorage.getItem(VOICE_PARAMS_KEY) || "{}");
    all[voiceId] = params;
    localStorage.setItem(VOICE_PARAMS_KEY, JSON.stringify(all));
  } catch {}
};
const loadVoiceParams = (voiceId: string): VoiceParams => {
  try {
    const all = JSON.parse(localStorage.getItem(VOICE_PARAMS_KEY) || "{}");
    return all[voiceId] || { ...DEFAULT_VOICE_PARAMS };
  } catch { return { ...DEFAULT_VOICE_PARAMS }; }
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

// Fake waveform SVG for audio items (visual only)
const AudioWaveform = ({ playing }: { playing: boolean }) => {
  const bars = 40;
  return (
    <div className="flex items-center gap-[1.5px] h-8 flex-1 mx-3">
      {Array.from({ length: bars }).map((_, i) => {
        const h = Math.random() * 24 + 4;
        return (
          <div key={i} className={`w-[2px] rounded-full transition-all duration-150 ${playing ? "bg-accent" : "bg-white/30"}`}
            style={{ height: `${h}px`, animationDelay: `${i * 30}ms` }} />
        );
      })}
    </div>
  );
};

// ============= MAIN COMPONENT =============
const AICoPilot = () => {
  // Core state
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
  const [showCreateVoice, setShowCreateVoice] = useState(false);
  const [audioText, setAudioText] = useState("");
  const [voiceParams, setVoiceParams] = useState<VoiceParams>({ ...DEFAULT_VOICE_PARAMS });
  const [showVoiceEditor, setShowVoiceEditor] = useState(false);
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Image state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageRefs, setImageRefs] = useState<Attachment[]>([]);
  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [generatedImages, setGeneratedImages] = useState<GeneratedContent[]>([]);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoStartFrame, setVideoStartFrame] = useState<Attachment | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedContent[]>([]);

  // Audio generated content
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedContent[]>([]);

  // Display prefs
  const [displayScale, setDisplayScale] = useState(1.5);
  const [displayLayout, setDisplayLayout] = useState<LayoutMode>("vertical");

  // Refs
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceSampleInputRef = useRef<HTMLInputElement>(null);
  const imageRefInputRef = useRef<HTMLInputElement>(null);
  const videoFrameInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Effects
  useEffect(() => { const p = loadPrefs(); setDisplayScale(p.scale); setDisplayLayout(p.layout); }, []);
  useEffect(() => { savePrefs({ scale: displayScale, layout: displayLayout }); }, [displayScale, displayLayout]);
  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (draftRestored) saveDraft(activeConvoId, input, attachments); }, [input, attachments, activeConvoId, draftRestored]);
  useEffect(() => {
    if (selectedVoice) {
      const params = loadVoiceParams(selectedVoice);
      setVoiceParams(params);
    }
  }, [selectedVoice]);

  // ---- Data loading ----
  const loadData = async () => {
    const [convos, accts, voicesData, imagesData, videosData, audiosData] = await Promise.all([
      supabase.from("copilot_conversations").select("*").order("updated_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, monthly_revenue, subscriber_count, status"),
      supabase.from("copilot_voices").select("*").eq("is_preset", false).order("name"),
      supabase.from("copilot_generated_content").select("*").eq("mode", "image").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "video").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "audio").order("created_at", { ascending: false }),
    ]);
    setConversations(convos.data || []);
    setAccounts(accts.data || []);
    const loadedVoices = (voicesData.data || []).map((v: any) => ({
      id: v.id, name: v.name, description: v.description,
      is_preset: v.is_preset, sample_urls: v.sample_urls, preview_url: v.preview_url,
      elevenlabs_voice_id: v.elevenlabs_voice_id,
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

  const selectConvo = (convo: any) => { setActiveConvoId(convo.id); setMessages((convo.messages as unknown as Msg[]) || []); setContextAccount(convo.account_id || ""); setEditingIdx(null); };

  const createConvo = async (initialMessages?: Msg[], title?: string) => {
    const { data, error } = await supabase.from("copilot_conversations").insert({ title: title || "New Conversation", messages: (initialMessages || []) as any, account_id: contextAccount || null }).select().single();
    if (error) { toast.error(error.message); return null; }
    setConversations(prev => [data, ...prev]); setActiveConvoId(data.id);
    if (initialMessages) setMessages(initialMessages); else setMessages([]);
    return data.id as string;
  };

  const deleteConvo = async (id: string) => {
    const { error } = await supabase.from("copilot_conversations").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) { setActiveConvoId(null); setMessages([]); setInput(""); setAttachments([]); clearDraft(); }
  };

  const scrollToBottom = useCallback(() => { setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, 50); }, []);

  const buildContext = () => {
    const parts: string[] = [];
    if (contextAccount) { const acct = accounts.find(a => a.id === contextAccount); if (acct) parts.push(`Focused on: ${acct.display_name || acct.username} ($${acct.monthly_revenue}/mo, ${acct.subscriber_count} subs, ${acct.status})`); }
    if (accounts.length > 0) parts.push(`Agency: ${accounts.length} creators, $${accounts.reduce((s: number, a: any) => s + (a.monthly_revenue || 0), 0).toLocaleString()}/mo`);
    return parts.join("\n");
  };

  // ---- File handling ----
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
    setAttachments(prev => [...prev, ...newAtts]); setIsUploading(false);
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

  // ---- Conversation persistence ----
  const saveConversation = async (convoId: string, finalMessages: Msg[], msgText?: string) => {
    const isFirst = finalMessages.filter(m => m.role === "user").length <= 1;
    const title = isFirst && msgText ? msgText.slice(0, 50) : undefined;
    await supabase.from("copilot_conversations").update({ messages: finalMessages as any, ...(title ? { title } : {}), account_id: contextAccount || null, updated_at: new Date().toISOString() }).eq("id", convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, messages: finalMessages, ...(title ? { title } : {}), updated_at: new Date().toISOString() } : c));
  };

  const saveGeneratedContent = async (contentType: string, url: string, prompt: string, modeTab: string, extra?: any): Promise<GeneratedContent | null> => {
    const { data, error } = await supabase.from("copilot_generated_content").insert({ content_type: contentType, url, prompt, mode: modeTab, aspect_ratio: extra?.aspect_ratio || null, quality_mode: qualityMode, account_id: contextAccount || null, metadata: extra?.metadata || {} }).select().single();
    if (error) { console.error("Save content error:", error); return null; }
    return data as GeneratedContent;
  };

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

  // ---- Streaming ----
  const streamResponse = async (apiMessages: any[], convoId: string, baseMessages: Msg[], msgText: string) => {
    setIsStreaming(true);
    let assistantSoFar = "";
    setMessages([...baseMessages, { role: "assistant", content: "▍" }]); scrollToBottom();
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: apiMessages, context: buildContext(), quality: qualityMode }),
      });
      if (!resp.ok) { const errData = await resp.json().catch(() => ({})); throw new Error(errData.error || `Error ${resp.status}`); }
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        setMessages([...baseMessages, { role: "assistant", content: "🎨 Generating..." }]); scrollToBottom();
        const data = await resp.json();
        if (data.type === "image") {
          const am: Msg = { role: "assistant", content: data.content || "Here's the generated image.", images: data.images || [] };
          const fm = [...baseMessages, am]; setMessages(fm); scrollToBottom(); await saveConversation(convoId, fm, msgText);
        } else if (data.type === "audio") {
          const am: Msg = { role: "assistant", content: data.content || "Here's the generated audio.", audioUrl: data.audioUrl };
          const fm = [...baseMessages, am]; setMessages(fm); scrollToBottom(); await saveConversation(convoId, fm, msgText);
        }
      } else {
        if (!resp.body) throw new Error("No response body");
        const reader = resp.body.getReader(); const decoder = new TextDecoder(); let textBuffer = ""; let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read(); if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let ni: number;
          while ((ni = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, ni); textBuffer = textBuffer.slice(ni + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const js = line.slice(6).trim();
            if (js === "[DONE]") { streamDone = true; break; }
            try { const c = JSON.parse(js).choices?.[0]?.delta?.content; if (c) { assistantSoFar += c; const s = assistantSoFar; setMessages(prev => { const l = prev[prev.length - 1]; if (l?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: s } : m); return [...prev, { role: "assistant", content: s }]; }); scrollToBottom(); } } catch { textBuffer = line + "\n" + textBuffer; break; }
          }
        }
        if (textBuffer.trim()) { for (let raw of textBuffer.split("\n")) { if (!raw) continue; if (raw.endsWith("\r")) raw = raw.slice(0, -1); if (raw.startsWith(":") || raw.trim() === "") continue; if (!raw.startsWith("data: ")) continue; const js = raw.slice(6).trim(); if (js === "[DONE]") continue; try { const c = JSON.parse(js).choices?.[0]?.delta?.content; if (c) assistantSoFar += c; } catch {} } }
        const fm = [...baseMessages, { role: "assistant" as const, content: assistantSoFar || "I couldn't generate a response. Please try again." }];
        setMessages(fm); await saveConversation(convoId, fm, msgText);
      }
    } catch (e: any) { toast.error(e.message || "Failed to get response"); setMessages(baseMessages); } finally { setIsStreaming(false); }
  };

  // ---- Send message (Chat/FreeWill only) ----
  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if ((!msgText && attachments.length === 0) || isStreaming) return;
    setInput(""); clearDraft();
    let apiContent: any = msgText;
    const currentAttachments = [...attachments]; setAttachments([]);
    if (currentAttachments.length > 0) {
      const parts: any[] = []; if (msgText) parts.push({ type: "text", text: msgText });
      for (const att of currentAttachments) { if (att.type === "image") parts.push({ type: "image_url", image_url: { url: att.url } }); else parts.push({ type: "text", text: `[Attached ${att.type}: ${att.name} - ${att.url}]` }); }
      apiContent = parts;
    }
    const userMsg: Msg = { role: "user", content: msgText || "Attached files", attachments: currentAttachments.length > 0 ? currentAttachments : undefined };
    const newMessages = [...messages, userMsg]; setMessages(newMessages); scrollToBottom();
    let convoId = activeConvoId;
    if (!convoId) { convoId = await createConvo(newMessages, msgText.slice(0, 50)); if (!convoId) return; }
    const apiMessages = messages.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    apiMessages.push({ role: "user", content: apiContent } as any);
    await streamResponse(apiMessages, convoId, newMessages, msgText);
  };

  const handleEditMessage = async (idx: number) => {
    if (isStreaming || !editText.trim()) return;
    const nc = editText.trim(); const ea = editAttachments.length > 0 ? [...editAttachments] : undefined;
    setEditingIdx(null); setEditText(""); setEditAttachments([]);
    const t = messages.slice(0, idx); const em: Msg = { ...messages[idx], content: nc, attachments: ea };
    const nm = [...t, em]; setMessages(nm); scrollToBottom();
    const cid = activeConvoId; if (!cid) return;
    const am = t.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    am.push({ role: "user", content: buildApiContent(nc, ea) });
    await streamResponse(am, cid, nm, nc);
  };

  const handleRevertTo = async (idx: number) => { if (isStreaming) return; const t = messages.slice(0, idx + 1); setMessages(t); if (activeConvoId) await saveConversation(activeConvoId, t); toast.success("Reverted"); };

  const handleRegenerate = async () => {
    if (isStreaming || messages.length < 2) return;
    let lui = -1; for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "user") { lui = i; break; } }
    if (lui === -1) return;
    const t = messages.slice(0, lui + 1); setMessages(t); scrollToBottom();
    const cid = activeConvoId; if (!cid) return;
    const am = t.map(m => ({ role: m.role, content: buildApiContent(m.content, m.attachments) }));
    await streamResponse(am, cid, t, t[lui].content);
  };

  const handleCopy = (idx: number) => { navigator.clipboard.writeText(messages[idx].content); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); };

  // ---- Voice cloning (real ElevenLabs) ----
  const handleCloneVoice = async () => {
    if (!newVoiceName.trim() || voiceSamples.length === 0) { toast.error("Provide a name and at least one audio sample (1 min recommended)"); return; }
    if (newVoiceName.trim().length < 3) { toast.error("Name must be at least 3 characters"); return; }
    setIsCloningVoice(true);
    try {
      // Send audio files directly to the voice-audio edge function for real cloning
      const formData = new FormData();
      formData.append("name", newVoiceName.trim());
      formData.append("description", `Cloned voice — ${voiceSamples.length} sample(s)`);
      for (const file of voiceSamples) {
        formData.append("files", file, file.name);
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=clone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: formData,
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Cloning failed (${resp.status})`); }
      const result = await resp.json();
      const elevenVoiceId = result.voice_id;
      const previewUrl = result.preview_audio || null;

      // Also upload samples to storage for reference
      const sampleUrls: string[] = [];
      for (const file of voiceSamples) { const url = await uploadFileToStorage(file); if (url) sampleUrls.push(url); }

      // Save to DB with the ElevenLabs voice ID
      const { data: nv, error } = await supabase.from("copilot_voices").insert({
        name: newVoiceName,
        description: `AI-cloned voice from ${sampleUrls.length} sample(s)`,
        sample_urls: sampleUrls,
        preview_url: previewUrl,
        elevenlabs_voice_id: elevenVoiceId,
        is_preset: false,
      }).select().single();
      if (error) throw error;
      setVoices(prev => [...prev, nv as unknown as Voice]); setSelectedVoice(nv!.id);
      setNewVoiceName(""); setVoiceSamples([]); setShowCreateVoice(false);
      toast.success(`Voice "${newVoiceName}" cloned successfully!`);
    } catch (e: any) { toast.error(e.message || "Voice cloning failed"); } finally { setIsCloningVoice(false); }
  };

  const deleteVoice = async (voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId);
    // Delete from ElevenLabs too
    if (voice?.elevenlabs_voice_id) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ voice_id: voice.elevenlabs_voice_id }),
      }).catch(() => {});
    }
    const { error } = await supabase.from("copilot_voices").delete().eq("id", voiceId);
    if (error) { toast.error("Delete failed"); return; }
    setVoices(prev => prev.filter(v => v.id !== voiceId));
    if (selectedVoice === voiceId) setSelectedVoice(voices.filter(v => v.id !== voiceId)[0]?.id || "");
    toast.success("Voice deleted");
  };

  // Voice params editing
  const updateVoiceParam = (key: keyof VoiceParams, value: any) => {
    const updated = { ...voiceParams, [key]: value };
    setVoiceParams(updated);
    if (selectedVoice) saveVoiceParams(selectedVoice, updated);
  };

  const resetVoiceParams = () => {
    setVoiceParams({ ...DEFAULT_VOICE_PARAMS });
    if (selectedVoice) saveVoiceParams(selectedVoice, { ...DEFAULT_VOICE_PARAMS });
    toast.success("Voice params reset to default");
  };

  const toggleEffect = (effect: string) => {
    const newEffects = voiceParams.effects.includes(effect)
      ? voiceParams.effects.filter(e => e !== effect)
      : [...voiceParams.effects, effect];
    updateVoiceParam("effects", newEffects);
  };

  // ---- Audio generation (real ElevenLabs TTS) ----
  const generateAudio = async () => {
    if (!audioText.trim() || isGeneratingAudio) return;
    const voice = voices.find(v => v.id === selectedVoice);
    if (!voice?.elevenlabs_voice_id) { toast.error("Select a cloned voice first. Create one from audio samples."); return; }
    setIsGeneratingAudio(true);
    try {
      // Map voice params to ElevenLabs settings
      const voiceSettings: any = {
        stability: Math.max(0, Math.min(1, 0.5 - (voiceParams.pitch * 0.02))),
        similarity_boost: Math.max(0, Math.min(1, 0.85 + (voiceParams.reverb * 0.001))),
        style: 0.5,
        speed: voiceParams.speed,
      };

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: audioText,
          voice_id: voice.elevenlabs_voice_id,
          voice_settings: voiceSettings,
        }),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      const audioUrl = data.audio_url;
      if (!audioUrl) throw new Error("No audio returned");

      const saved = await saveGeneratedContent("audio", audioUrl, audioText, "audio", { metadata: { voice: voice.name, params: voiceParams } });
      if (saved) setGeneratedAudios(prev => [saved, ...prev]);
      toast.success("Audio generated!"); setAudioText("");
    } catch (e: any) { toast.error(e.message || "Audio generation failed"); } finally { setIsGeneratingAudio(false); }
  };

  // ---- Image generation (isolated) ----
  const handleImageRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) { if (!file.type.startsWith("image/")) continue; const url = await uploadFileToStorage(file); if (url) setImageRefs(prev => [...prev, { type: "image", name: file.name, url, mimeType: file.type, size: file.size }]); }
    if (imageRefInputRef.current) imageRefInputRef.current.value = "";
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || isStreaming) return;
    setIsStreaming(true); const currentRefs = [...imageRefs]; const prompt = imagePrompt; setImagePrompt("");
    try {
      const parts: any[] = [{ type: "text", text: `Generate an ultra HD, photorealistic, highest quality image (aspect ratio ${imageAspect}): ${prompt}${currentRefs.length > 0 ? " Use these reference images." : ""}` }];
      for (const ref of currentRefs) parts.push({ type: "image_url", image_url: { url: ref.url } });
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: currentRefs.length > 0 ? parts : parts[0].text }], context: buildContext(), quality: qualityMode }),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      if (data.type === "image" && data.images?.length) {
        for (const img of data.images) { const saved = await saveGeneratedContent("image", img.image_url.url, prompt, "image", { aspect_ratio: imageAspect }); if (saved) setGeneratedImages(prev => [saved, ...prev]); }
        toast.success("Image generated!");
      } else toast.error("No image returned");
      setImageRefs([]);
    } catch (e: any) { toast.error(e.message || "Image generation failed"); } finally { setIsStreaming(false); }
  };

  // ---- Video generation (isolated) ----
  const handleVideoFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return;
    const url = await uploadFileToStorage(file);
    if (url) setVideoStartFrame({ type: "image", name: file.name, url, mimeType: file.type, size: file.size });
    if (videoFrameInputRef.current) videoFrameInputRef.current.value = "";
  };

  const generateVideo = async () => {
    if (!videoPrompt.trim() || isStreaming) return;
    setIsStreaming(true); const prompt = videoPrompt; const frame = videoStartFrame; setVideoPrompt(""); setVideoStartFrame(null);
    try {
      const parts: any[] = [{ type: "text", text: `Generate a ${videoDuration}-second cinematic, ultra HD, highest quality video: ${prompt}${frame ? " Use this starting frame." : ""}` }];
      if (frame) parts.push({ type: "image_url", image_url: { url: frame.url } });
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: frame ? parts : parts[0].text }], context: buildContext(), quality: qualityMode }),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      if (data.type === "image" && data.images?.length) {
        for (const img of data.images) { const saved = await saveGeneratedContent("video", img.image_url.url, prompt, "video", { metadata: { duration: videoDuration } }); if (saved) setGeneratedVideos(prev => [saved, ...prev]); }
        toast.success("Video generated!");
      } else toast.info(data.content || "Generation complete");
    } catch (e: any) { toast.error(e.message || "Video generation failed"); } finally { setIsStreaming(false); }
  };

  // ---- Audio playback ----
  const toggleAudioPlay = (id: string, url: string) => {
    if (playingAudioId === id) {
      audioPlayerRefs.current[id]?.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioPlayerRefs.current[playingAudioId]) audioPlayerRefs.current[playingAudioId]?.pause();
      if (!audioPlayerRefs.current[id]) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingAudioId(null);
        audioPlayerRefs.current[id] = audio;
      }
      audioPlayerRefs.current[id]?.play().catch(() => {});
      setPlayingAudioId(id);
    }
  };

  // ---- Scale controls ----
  const renderScaleControls = () => (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
      <span className="text-[10px] text-white/30">Scale</span>
      <Button size="sm" variant="ghost" onClick={() => setDisplayScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))} className="h-6 w-6 p-0 text-white/30 hover:text-white"><ZoomOut className="h-3 w-3" /></Button>
      <Slider value={[displayScale]} onValueChange={([v]) => setDisplayScale(v)} min={0.5} max={5} step={0.25} className="w-24" />
      <span className="text-[10px] text-white/50 w-10 text-center">{displayScale}x</span>
      <Button size="sm" variant="ghost" onClick={() => setDisplayScale(s => Math.min(5, +(s + 0.25).toFixed(2)))} className="h-6 w-6 p-0 text-white/30 hover:text-white"><ZoomIn className="h-3 w-3" /></Button>
      <div className="border-l border-white/10 pl-2 ml-1 flex gap-1">
        {([{ id: "grid" as LayoutMode, icon: Grid }, { id: "horizontal" as LayoutMode, icon: Columns }, { id: "vertical" as LayoutMode, icon: Rows }]).map(l => (
          <button key={l.id} onClick={() => setDisplayLayout(l.id)} className={`h-6 w-6 flex items-center justify-center rounded ${displayLayout === l.id ? "bg-accent/20 text-accent" : "text-white/20 hover:text-white/40"}`}><l.icon className="h-3.5 w-3.5" /></button>
        ))}
      </div>
    </div>
  );

  // ---- Render helpers ----
  const renderPendingAttachments = () => {
    if (attachments.length === 0) return null;
    return (
      <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {att.type === "image" ? <div className="w-[100px] h-[80px]"><img src={att.url} alt={att.name} className="w-full h-full object-cover" /></div>
                : att.type === "video" ? <div className="w-[100px] h-[80px] bg-black/40 flex items-center justify-center"><Play className="h-6 w-6 text-white/70" /></div>
                : <div className="flex items-center gap-2 px-3 py-2 w-[140px]">{att.type === "audio" ? <Music className="h-4 w-4 text-accent" /> : <FileText className="h-4 w-4 text-accent" />}<p className="text-[10px] text-white/60 truncate">{att.name}</p></div>}
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center text-white/60 hover:bg-red-500/80 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
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
          {att.type === "image" ? <a href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] object-cover" /></a>
            : att.type === "audio" ? <div className="p-2 bg-white/5"><audio controls src={att.url} className="h-8 w-48" /></div>
            : att.type === "video" ? <div className="p-2 bg-white/5"><video controls src={att.url} className="max-w-[250px] max-h-[150px] rounded" /></div>
            : <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white/5"><FileText className="h-4 w-4 text-accent" /><span className="text-[10px] text-white/60">{att.name}</span></a>}
        </div>
      ))}
    </div>
  );

  const renderMessageActions = (msg: Msg, idx: number) => {
    const isUser = msg.role === "user"; const isLA = !isUser && idx === messages.length - 1;
    return (
      <div className={`flex items-center gap-0.5 mt-1 transition-opacity ${hoveredIdx === idx ? "opacity-100" : "opacity-0"}`}>
        <Button size="sm" variant="ghost" onClick={() => handleCopy(idx)} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10">{copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}</Button>
        {isUser && <Button size="sm" variant="ghost" onClick={() => { setEditingIdx(idx); setEditText(msg.content); setEditAttachments(msg.attachments ? [...msg.attachments] : []); }} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10"><Pencil className="h-3 w-3" /></Button>}
        {isLA && <Button size="sm" variant="ghost" onClick={handleRegenerate} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10"><RefreshCw className="h-3 w-3" /></Button>}
        {idx < messages.length - 1 && <Button size="sm" variant="ghost" onClick={() => handleRevertTo(idx)} className="h-6 w-6 p-0 text-white/30 hover:text-white hover:bg-white/10"><RotateCcw className="h-3 w-3" /></Button>}
      </div>
    );
  };

  // ---- Audio gallery with waveforms (matching reference) ----
  const renderAudioGallery = () => {
    if (generatedAudios.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <Headphones className="h-12 w-12 text-white/10 mb-4" />
          <p className="text-white/20 text-sm">Generated audios appear here</p>
          <p className="text-[10px] text-white/10 mt-1">Playable • Downloadable as .mp3 • Synced</p>
        </div>
      );
    }
    return (
      <div className="space-y-3 p-4">
        {generatedAudios.map(item => {
          const voiceName = item.metadata?.voice || "AI Voice";
          const isPlaying = playingAudioId === item.id;
          return (
            <div key={item.id} className="group">
              <p className="text-[11px] text-white/50 mb-1.5 font-medium">{voiceName}</p>
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                <button onClick={() => toggleAudioPlay(item.id, item.url)}
                  className="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0 hover:bg-white/90 transition-colors">
                  {isPlaying ? <Pause className="h-4 w-4 text-black" /> : <Play className="h-4 w-4 text-black ml-0.5" />}
                </button>
                <AudioWaveform playing={isPlaying} />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => { setEditingVoiceId(item.id); setShowVoiceEditor(true); }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Edit">
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <a href={item.url} download={`audio_${item.id}.mp3`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Download .mp3">
                    <Download className="h-4 w-4" />
                  </a>
                  <button onClick={() => deleteGeneratedContent(item.id, "audio")}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors" title="Delete">
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-1.5 italic">"{item.prompt}"</p>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Content gallery for image/video ----
  const renderContentGallery = (items: GeneratedContent[], modeTab: string) => {
    if (items.length === 0) {
      const Icon = modeTab === "image" ? ImageIcon : Video;
      return (<div className="flex flex-col items-center justify-center h-full text-center py-12"><Icon className="h-12 w-12 text-white/10 mb-4" /><p className="text-white/20 text-sm">Generated {modeTab}s appear here</p></div>);
    }
    const layout = displayLayout === "horizontal" ? "flex flex-row flex-wrap gap-4" : displayLayout === "vertical" ? "flex flex-col gap-4" : "grid grid-cols-2 gap-4";
    return (
      <div className={layout}>
        {items.map(item => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
            style={displayLayout !== "vertical" ? { width: `${220 * displayScale}px` } : {}}>
            <img src={item.url} alt="" className="w-full object-cover rounded-t-xl" style={{ maxHeight: `${170 * displayScale}px` }} />
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { const a = document.createElement("a"); a.href = item.url; a.download = `${modeTab}_${item.id}.png`; a.click(); }} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-black/80"><Download className="h-4 w-4 text-white" /></button>
              <button onClick={() => deleteGeneratedContent(item.id, modeTab)} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-red-500/60"><Trash className="h-4 w-4 text-white" /></button>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-white/40 truncate"><span className="text-accent">Prompt:</span> {item.prompt}</p>
              <button onClick={() => modeTab === "image" ? setImagePrompt(item.prompt || "") : setVideoPrompt(item.prompt || "")}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white border border-white/10 rounded px-2 py-0.5 mt-2">
                <RotateCcw className="h-2.5 w-2.5" /> Reuse
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============ MODE PANELS ============

  const renderImagePanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Image Prompt</p>
          <Badge variant="outline" className="text-[9px] border-accent/20 text-accent">{qualityMode === "best" ? "Ultra HD" : "High Quality"}</Badge>
        </div>
        <Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Describe precisely what you want..." className="bg-white/5 border-white/10 text-white text-sm min-h-[140px] resize-none placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateImage(); } }} />
        <div className="border-2 border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-colors" onClick={() => imageRefInputRef.current?.click()}>
          <Upload className="h-6 w-6 text-white/20" /><p className="text-[11px] text-white/30">Reference images • click to select</p>
        </div>
        <input ref={imageRefInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageRefUpload} />
        {imageRefs.length > 0 && <div className="flex flex-wrap gap-2">{imageRefs.map((ref, i) => (<div key={i} className="relative group w-[70px] h-[70px] rounded-lg overflow-hidden border border-white/10"><img src={ref.url} alt="" className="w-full h-full object-cover" /><button onClick={() => setImageRefs(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="h-3 w-3 text-white" /></button></div>))}</div>}
        <div className="flex gap-1.5">
          {["1:1", "16:9", "9:16"].map(r => (
            <button key={r} onClick={() => setImageAspect(r)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${imageAspect === r ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
              {r === "1:1" && <Square className="h-3.5 w-3.5" />}{r === "16:9" && <Monitor className="h-3.5 w-3.5" />}{r === "9:16" && <Smartphone className="h-3.5 w-3.5" />}{r}
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3">
          <Select value={qualityMode} onValueChange={v => setQualityMode(v as QualityMode)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10"><SelectItem value="best" className="text-white text-xs">Best Quality</SelectItem><SelectItem value="high" className="text-white text-xs">High Quality</SelectItem></SelectContent>
          </Select>
          <Button onClick={generateImage} disabled={!imagePrompt.trim() || isStreaming} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm h-9">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">{renderScaleControls()}<ScrollArea className="flex-1 p-4">{renderContentGallery(generatedImages, "image")}</ScrollArea></div>
    </div>
  );

  const renderVideoPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Video Prompt</p>
          <Badge variant="outline" className="text-[9px] border-accent/20 text-accent">Cinematic</Badge>
        </div>
        <Textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="Describe your video..." className="bg-white/5 border-white/10 text-white text-sm min-h-[130px] resize-none placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateVideo(); } }} />
        <div className="flex gap-3">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors flex-1 min-h-[100px] relative" onClick={() => videoFrameInputRef.current?.click()}>
            {videoStartFrame ? (<><img src={videoStartFrame.url} alt="" className="w-full h-full object-cover rounded-lg absolute inset-0" /><button onClick={(e) => { e.stopPropagation(); setVideoStartFrame(null); }} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center z-10"><X className="h-3 w-3 text-white" /></button></>)
              : (<><Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Start Frame</p></>)}
          </div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 flex-1 min-h-[100px] opacity-40"><Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">End Frame</p></div>
        </div>
        <input ref={videoFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleVideoFrameUpload} />
        <div>
          <p className="text-[11px] text-white/40 mb-2">Duration: <span className="text-accent font-medium">{videoDuration}s</span></p>
          <Slider value={[videoDuration]} onValueChange={([v]) => setVideoDuration(v)} min={1} max={60} step={1} className="w-full" />
          <div className="flex justify-between text-[9px] text-white/20 mt-1"><span>1s</span><span>30s</span><span>60s</span></div>
        </div>
        <div className="mt-auto flex items-center gap-3">
          <Select value={qualityMode} onValueChange={v => setQualityMode(v as QualityMode)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10"><SelectItem value="best" className="text-white text-xs">Best Quality</SelectItem><SelectItem value="high" className="text-white text-xs">High Quality</SelectItem></SelectContent>
          </Select>
          <Button onClick={generateVideo} disabled={!videoPrompt.trim() || isStreaming} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm h-9">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">{renderScaleControls()}<ScrollArea className="flex-1 p-4">{renderContentGallery(generatedVideos, "video")}</ScrollArea></div>
    </div>
  );

  const renderAudioPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Voice list + text input */}
      <div className="w-[400px] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">My Voices</p>
            <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{voices.length}</Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowCreateVoice(true)} className="text-[11px] text-accent hover:text-accent/80 h-7 px-2 gap-1">
            <Plus className="h-3 w-3" /> Create a voice
          </Button>
        </div>

        {/* Voice list */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {voices.length === 0 && <p className="text-[11px] text-white/20 text-center py-8">No voices yet. Create one to get started!</p>}
            {voices.map(v => (
              <div key={v.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedVoice === v.id ? "bg-accent/15 border border-accent/30" : "hover:bg-white/[0.04] border border-transparent"}`}
                onClick={() => setSelectedVoice(v.id)}>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white font-medium truncate">{v.name}</p>
                </div>
                {(v.preview_url || (v.sample_urls && v.sample_urls.length > 0)) && (
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const a = new Audio(v.preview_url || v.sample_urls![0]); a.play().catch(() => {}); }}
                    className="h-7 w-7 p-0 text-white/30 hover:text-white shrink-0" title="Preview cloned voice"><Play className="h-3 w-3" /></Button>
                )}
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingVoiceId(v.id); setVoiceParams(loadVoiceParams(v.id)); setShowVoiceEditor(true); }}
                  className="h-7 w-7 p-0 text-white/20 hover:text-white shrink-0"><SlidersHorizontal className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteVoice(v.id); }}
                  className="h-7 w-7 p-0 text-white/20 hover:text-red-400 shrink-0"><Trash className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Text input + Generate */}
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          {selectedVoice && <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"><p className="text-[10px] text-amber-300/70">Selected: {voices.find(v => v.id === selectedVoice)?.name || "—"}</p></div>}
          <div>
            <p className="text-xs font-medium text-white mb-2">Text to convert to audio</p>
            <Textarea value={audioText} onChange={e => setAudioText(e.target.value)} placeholder="Enter the text you want to convert to audio..."
              className="bg-white/5 border-white/10 text-white text-sm min-h-[120px] resize-none placeholder:text-white/20"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateAudio(); } }} />
            <p className="text-[10px] text-white/30 mt-1">{audioText.length} characters</p>
          </div>
          <Button onClick={generateAudio} disabled={!audioText.trim() || isGeneratingAudio}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm h-10">
            {isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}Generate
          </Button>
        </div>
      </div>

      {/* Right: Audio gallery with waveforms */}
      <ScrollArea className="flex-1">{renderAudioGallery()}</ScrollArea>
    </div>
  );

  // Chat/FreeWill
  const renderChatPanel = () => (
    <>
      <ScrollArea className="flex-1 p-5" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Brain className="h-14 w-14 text-white/10 mb-5" />
            <p className="text-white/30 text-base mb-1">Your AI Agency Brain</p>
            <p className="text-white/20 text-sm mb-8 max-w-md">{mode === "freeWill" ? "Free Will mode — no limits, no restrictions, ask anything." : "Ask anything — a conversation is created automatically."}</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-xl">
              {QUICK_PROMPTS.map(qp => (
                <button key={qp.label} onClick={() => sendMessage(qp.prompt)} className="h-auto py-3 px-4 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] text-left flex flex-col items-start gap-2 transition-all">
                  <qp.icon className="h-4 w-4 text-accent" /><span className="text-[11px] leading-tight">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <div className="max-w-[80%]">
                  {editingIdx === i ? (
                    <div className="bg-accent/10 rounded-xl px-5 py-4 border border-accent/20">
                      <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="bg-white/5 border-white/10 text-white text-sm min-h-[70px] resize-none mb-3 placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(i); } }} />
                      {editAttachments.length > 0 && <div className="flex flex-wrap gap-2 mb-3">{editAttachments.map((att, ai) => (<div key={ai} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">{att.type === "image" ? <div className="w-[80px] h-[60px]"><img src={att.url} alt="" className="w-full h-full object-cover" /></div> : <div className="flex items-center gap-1 px-2 py-1.5"><Music className="h-3 w-3 text-accent" /><span className="text-[9px] text-white/50 truncate max-w-[60px]">{att.name}</span></div>}<button onClick={() => setEditAttachments(prev => prev.filter((_, j) => j !== ai))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5 text-white" /></button></div>))}</div>}
                      <input ref={editFileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.csv" className="hidden" onChange={async (e) => { const files = Array.from(e.target.files || []); for (const file of files) { if (file.size > MAX_FILE_SIZE) continue; const url = await uploadFileToStorage(file); if (!url) continue; let type: Attachment["type"] = "file"; if (file.type.startsWith("image/")) type = "image"; else if (file.type.startsWith("audio/")) type = "audio"; else if (file.type.startsWith("video/")) type = "video"; setEditAttachments(prev => [...prev, { type, name: file.name, url, mimeType: file.type, size: file.size }]); } if (editFileInputRef.current) editFileInputRef.current.value = ""; }} />
                      <div className="flex gap-2 justify-between">
                        <Button size="sm" variant="ghost" onClick={() => editFileInputRef.current?.click()} className="h-8 px-3 text-[11px] text-white/40 hover:text-white gap-1"><Paperclip className="h-3 w-3" /> Attach</Button>
                        <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => { setEditingIdx(null); setEditAttachments([]); }} className="h-8 px-3 text-[11px] text-white/40">Cancel</Button><Button size="sm" onClick={() => handleEditMessage(i)} className="h-8 px-4 text-[11px] bg-accent hover:bg-accent/90 text-white">Save & Regenerate</Button></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`rounded-xl px-5 py-4 ${msg.role === "user" ? "bg-accent/20 text-white" : "bg-white/5 text-white/80"}`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                            {msg.images && msg.images.length > 0 && <div className="mt-3 space-y-2">{msg.images.map((img, idx) => (<div key={idx} className="relative group"><img src={img.image_url.url} alt="" className="rounded-lg max-w-full border border-white/10" /><a href={img.image_url.url} download className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 rounded-lg p-2"><Download className="h-4 w-4 text-white" /></a></div>))}</div>}
                            {msg.audioUrl && <div className="mt-3"><audio controls src={msg.audioUrl} className="w-full h-10" /></div>}
                          </div>
                        ) : (<><p className="text-sm">{msg.content}</p>{msg.attachments && renderMessageAttachments(msg.attachments)}</>)}
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
      <div className="p-4 border-t border-white/[0.06]">
        <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.csv" className="hidden" onChange={handleFileSelect} />
        <div className="flex gap-3">
          <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading || attachments.length >= MAX_ATTACHMENTS} className="h-11 w-11 p-0 shrink-0 text-white/30 hover:text-white hover:bg-white/5">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={mode === "freeWill" ? "Anything goes — fully uncensored..." : "Ask anything..."} className="bg-white/5 border-white/10 text-white text-sm min-h-[44px] max-h-[140px] resize-none placeholder:text-white/20" rows={1} />
          <Button onClick={() => sendMessage()} disabled={(!input.trim() && attachments.length === 0) || isStreaming} className="bg-accent hover:bg-accent/90 h-11 w-11 p-0 shrink-0 text-white"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </>
  );

  // ============ MAIN RETURN ============
  return (
    <>
      <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[650px]">
        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col">
          <Button size="sm" onClick={() => { setActiveConvoId(null); setMessages([]); setInput(""); setAttachments([]); clearDraft(); }}
            className="w-full bg-accent hover:bg-accent/90 text-white text-sm mb-3 h-10">
            <Plus className="h-4 w-4 mr-1.5" /> New Conversation
          </Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {conversations.map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all text-sm group ${activeConvoId === c.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`} onClick={() => selectConvo(c)}>
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteConvo(c.id); }} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <label className="text-[10px] text-white/30 mb-1.5 block">Focus on creator</label>
            <Select value={contextAccount} onValueChange={setContextAccount}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm"><SelectValue placeholder="All creators" /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                <SelectItem value="all" className="text-white text-sm">All creators</SelectItem>
                {accounts.map(a => (<SelectItem key={a.id} value={a.id} className="text-white text-sm">{a.display_name || a.username}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="border-b border-white/[0.06]">
            <div className="p-4 flex items-center gap-3">
              <Bot className="h-6 w-6 text-accent" />
              <p className="text-base font-semibold text-white flex-1">Grandmaster AI Co-Pilot</p>
              {mode === "freeWill" && <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]"><Wand2 className="h-3 w-3 mr-1" /> Uncensored</Badge>}
              {isStreaming && <Badge variant="outline" className="border-accent/20 text-accent text-[10px] animate-pulse"><Sparkles className="h-3 w-3 mr-1" /> Thinking...</Badge>}
            </div>
            <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
              {MODE_CONFIG.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${mode === m.id ? "bg-accent/20 text-accent border border-accent/30" : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"}`}>
                  <m.icon className="h-4 w-4" />{m.label}
                </button>
              ))}
            </div>
          </div>
          {mode === "image" && renderImagePanel()}
          {mode === "video" && renderVideoPanel()}
          {mode === "audio" && renderAudioPanel()}
          {(mode === "chat" || mode === "freeWill") && renderChatPanel()}
        </div>
      </div>

      {/* Create Voice Dialog */}
      <Dialog open={showCreateVoice} onOpenChange={setShowCreateVoice}>
        <DialogContent className="bg-[hsl(220,30%,8%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Create a voice</DialogTitle>
            <p className="text-sm text-white/40">Clone a voice from audio samples using AI</p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-medium text-white mb-2">Voice name</p>
              <Input value={newVoiceName} onChange={e => setNewVoiceName(e.target.value)} placeholder="Ex: My custom voice"
                className="bg-white/5 border-white/10 text-white text-sm h-10 placeholder:text-white/20" />
              {newVoiceName.length > 0 && newVoiceName.length < 3 && <p className="text-[10px] text-red-400 mt-1">Name must contain at least 3 characters</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-2">Audio samples</p>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => voiceSampleInputRef.current?.click()}>
                <Volume2 className="h-8 w-8 text-white/20" />
                <p className="text-sm text-white/30">MP3, WAV, M4A</p>
              </div>
              <input ref={voiceSampleInputRef} type="file" multiple accept="audio/*" className="hidden"
                onChange={e => { const files = Array.from(e.target.files || []); setVoiceSamples(prev => [...prev, ...files]); }} />
            </div>
            {voiceSamples.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {voiceSamples.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] border-white/10 text-white/50 gap-1 py-1">
                    <Music className="h-3 w-3" /> {f.name.slice(0, 25)}
                    <button onClick={() => setVoiceSamples(prev => prev.filter((_, j) => j !== i))} className="ml-1 hover:text-red-400"><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"><p className="text-[11px] text-amber-300/70">Note: 1 min audio recommended for best results</p></div>
            <Button onClick={handleCloneVoice} disabled={isCloningVoice || newVoiceName.trim().length < 3 || voiceSamples.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-10">
              {isCloningVoice ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}Create voice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice Editor Dialog */}
      <Dialog open={showVoiceEditor} onOpenChange={setShowVoiceEditor}>
        <DialogContent className="bg-[hsl(220,30%,8%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-accent" /> Voice Parameters
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <div className="flex items-center justify-between mb-2"><p className="text-sm text-white/70">Pitch</p><span className="text-sm text-accent font-mono">{voiceParams.pitch > 0 ? "+" : ""}{voiceParams.pitch} st</span></div>
              <Slider value={[voiceParams.pitch]} onValueChange={([v]) => updateVoiceParam("pitch", v)} min={-12} max={12} step={0.5} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><p className="text-sm text-white/70">Speed</p><span className="text-sm text-accent font-mono">{voiceParams.speed}x</span></div>
              <Slider value={[voiceParams.speed]} onValueChange={([v]) => updateVoiceParam("speed", v)} min={0.25} max={4} step={0.05} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><p className="text-sm text-white/70">Reverb</p><span className="text-sm text-accent font-mono">{voiceParams.reverb}%</span></div>
              <Slider value={[voiceParams.reverb]} onValueChange={([v]) => updateVoiceParam("reverb", v)} min={0} max={100} step={1} />
            </div>
            <div>
              <p className="text-sm text-white/70 mb-2">Effects</p>
              <div className="flex flex-wrap gap-2">
                {VOICE_EFFECTS.map(eff => (
                  <button key={eff} onClick={() => toggleEffect(eff)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${voiceParams.effects.includes(eff) ? "bg-accent/20 border-accent/40 text-accent" : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white/60"}`}>
                    {eff}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetVoiceParams} className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-10">
                <Undo2 className="h-4 w-4 mr-2" /> Revert to Default
              </Button>
              <Button onClick={() => { setShowVoiceEditor(false); toast.success("Parameters saved & applied"); }} className="flex-1 bg-accent hover:bg-accent/90 text-white h-10">
                Save & Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AICoPilot;

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
  Shield, ShieldOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import CreditCostBadge from "./CreditCostBadge";

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
  pitch: number;
  speed: number;
  reverb: number;
  effects: string[];
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
type QualityMode = "best" | "high" | "uncensored";
type LayoutMode = "grid" | "horizontal" | "vertical";

// ---- Format presets ----
interface FormatPreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  icon: typeof Square;
  category: string;
}

const FORMAT_PRESETS: FormatPreset[] = [
  { id: "square", label: "Square", ratio: "1:1", width: 1024, height: 1024, icon: Square, category: "Standard" },
  { id: "landscape", label: "Landscape", ratio: "16:9", width: 1920, height: 1080, icon: Monitor, category: "Standard" },
  { id: "portrait", label: "Portrait", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Standard" },
  { id: "profile", label: "Profile Pic", ratio: "1:1", width: 500, height: 500, icon: Users, category: "Social" },
  { id: "ig-post", label: "IG Post", ratio: "4:5", width: 1080, height: 1350, icon: ImageIcon, category: "Social" },
  { id: "ig-story", label: "IG / TikTok Story", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Social" },
  { id: "snap", label: "Snapchat", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Social" },
  { id: "twitter", label: "X / Twitter", ratio: "16:9", width: 1600, height: 900, icon: Monitor, category: "Social" },
  { id: "fb-cover", label: "FB Cover", ratio: "2.63:1", width: 1640, height: 624, icon: Monitor, category: "Social" },
  { id: "yt-thumb", label: "YT Thumbnail", ratio: "16:9", width: 1280, height: 720, icon: Monitor, category: "Social" },
  { id: "pinterest", label: "Pinterest", ratio: "2:3", width: 1000, height: 1500, icon: Smartphone, category: "Social" },
  { id: "of-banner", label: "OF Banner", ratio: "3:1", width: 1500, height: 500, icon: Monitor, category: "Social" },
  { id: "iphone", label: "iPhone", ratio: "9:19.5", width: 1170, height: 2532, icon: Smartphone, category: "Device" },
  { id: "ipad", label: "iPad", ratio: "3:4", width: 1536, height: 2048, icon: Monitor, category: "Device" },
  { id: "4k", label: "4K UHD", ratio: "16:9", width: 1920, height: 1080, icon: Monitor, category: "Device" },
];

const VIDEO_FORMAT_PRESETS: FormatPreset[] = [
  { id: "square", label: "Square", ratio: "1:1", width: 1024, height: 1024, icon: Square, category: "Standard" },
  { id: "landscape", label: "Landscape 16:9", ratio: "16:9", width: 1920, height: 1080, icon: Monitor, category: "Standard" },
  { id: "portrait", label: "Portrait 9:16", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Standard" },
  { id: "ig-reel", label: "IG Reel / TikTok", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Social" },
  { id: "yt-short", label: "YT Short", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Social" },
  { id: "yt-video", label: "YouTube", ratio: "16:9", width: 1920, height: 1080, icon: Monitor, category: "Social" },
  { id: "snap-vid", label: "Snapchat", ratio: "9:16", width: 1080, height: 1920, icon: Smartphone, category: "Social" },
  { id: "twitter-vid", label: "X / Twitter", ratio: "16:9", width: 1280, height: 720, icon: Monitor, category: "Social" },
  { id: "4:5", label: "IG Feed Video", ratio: "4:5", width: 1080, height: 1350, icon: ImageIcon, category: "Social" },
];

// ---- Constants ----
const DRAFT_KEY = "copilot_draft";
const PREFS_KEY = "copilot_display_prefs";
const VOICE_PARAMS_KEY = "copilot_voice_params";
const MAX_ATTACHMENTS = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DEFAULT_VOICE_PARAMS: VoiceParams = { pitch: 0, speed: 1, reverb: 0, effects: [] };
const VOICE_EFFECTS = ["Warm", "Breathy", "Crisp", "Deep", "Whisper", "Robotic", "Echo"];

const QUICK_PROMPTS = [
  { label: "Daily Action Plan", icon: Target, prompt: "Give me today's top priority actions to maximize productivity and results. Prioritize by impact." },
  { label: "Business Strategy", icon: DollarSign, prompt: "Analyze my current situation and identify the top 5 untapped growth opportunities." },
  { label: "Creative Brief", icon: Zap, prompt: "Help me brainstorm creative ideas for my next project. Think outside the box." },
  { label: "Deep Analysis", icon: TrendingUp, prompt: "What are the biggest blind spots in my current approach? Be brutally honest and specific." },
  { label: "Problem Solving", icon: Users, prompt: "I need a comprehensive solution framework. Walk me through a structured approach step by step." },
  { label: "Content Strategy", icon: Clock, prompt: "Create a 7-day content strategy with specific ideas, formats, and optimal timing." },
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

// Animated progress ring component
const ProgressRing = ({ progress, size = 80, label }: { progress: number; size?: number; label?: string }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="rgba(255,255,255,0.08)" fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--accent))" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-300" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(progress)}%</span>
        </div>
      </div>
      {label && <p className="text-xs text-white/50 animate-pulse">{label}</p>}
    </div>
  );
};

// Waveform
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
const AICoPilot = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
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
  const [selectedImageFormat, setSelectedImageFormat] = useState<string>("square");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageProgressLabel, setImageProgressLabel] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedContent[]>([]);
  const [imageFullPreview, setImageFullPreview] = useState<string | null>(null);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoStartFrame, setVideoStartFrame] = useState<Attachment | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<string>("landscape");
  const [selectedVideoResolution, setSelectedVideoResolution] = useState<string>("720p");
  const [videoGenerateAudio, setVideoGenerateAudio] = useState(false);
  const [fixedLens, setFixedLens] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoProgressLabel, setVideoProgressLabel] = useState("");
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
      // Pass user's auth token so edge function can deduct credits server-side
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ messages: apiMessages, context: buildContext(), quality: qualityMode }),
      });
      if (!resp.ok) { const errData = await resp.json().catch(() => ({})); throw new Error(errData.error || `Error ${resp.status}`); }
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        setMessages([...baseMessages, { role: "assistant", content: "⚡ Processing..." }]); scrollToBottom();
        const data = await resp.json();
        if (data.type === "action") {
          // CRM action executed by AI
          const actionSummary = (data.actions || []).map((a: any) => `${a.success ? "✅" : "❌"} **${a.tool}**: ${typeof a.result === 'string' ? a.result : JSON.stringify(a.result)}`).join("\n");
          const content = data.content || actionSummary || "Actions executed.";
          const am: Msg = { role: "assistant", content };
          const fm = [...baseMessages, am]; setMessages(fm); scrollToBottom(); await saveConversation(convoId, fm, msgText);
          // Refresh wallet balance if credits were spent by AI
          if (data.creditsSpent && data.creditsSpent > 0) {
            window.dispatchEvent(new Event('wallet-refresh'));
          }
          if (data.navigateTo && onNavigate) {
            setTimeout(() => onNavigate(data.navigateTo), 800);
            toast.success(`Navigating to ${data.navigateTo}`, { description: "Uplyze Assistant executed your request." });
          }
        } else if (data.type === "image") {
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
      const formData = new FormData();
      formData.append("name", newVoiceName.trim());
      formData.append("description", `Cloned voice — ${voiceSamples.length} sample(s)`);
      for (const file of voiceSamples) { formData.append("files", file, file.name); }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=clone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: formData,
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Cloning failed (${resp.status})`); }
      const result = await resp.json();
      const elevenVoiceId = result.voice_id;
      const previewUrl = result.preview_audio || null;

      const sampleUrls: string[] = [];
      for (const file of voiceSamples) { const url = await uploadFileToStorage(file); if (url) sampleUrls.push(url); }

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
      const voiceSettings: any = {
        stability: Math.max(0, Math.min(1, 0.5 - (voiceParams.pitch * 0.02))),
        similarity_boost: Math.max(0, Math.min(1, 0.85 + (voiceParams.reverb * 0.001))),
        style: 0.5,
        speed: voiceParams.speed,
      };

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ text: audioText, voice_id: voice.elevenlabs_voice_id, voice_settings: voiceSettings }),
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

  // ---- Simulated progress for image/video generation ----
  const simulateProgress = (
    setProgress: (v: number) => void,
    setLabel: (v: string) => void,
    estimatedMs: number
  ) => {
    const steps = [
      { at: 5, label: "Initializing AI model..." },
      { at: 15, label: "Analyzing prompt..." },
      { at: 30, label: "Generating composition..." },
      { at: 50, label: "Rendering details..." },
      { at: 70, label: "Enhancing quality..." },
      { at: 85, label: "Final touches..." },
      { at: 95, label: "Almost done..." },
    ];
    setProgress(0);
    setLabel("Starting generation...");
    const interval = estimatedMs / 100;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      if (current >= 95) { clearInterval(timer); return; }
      setProgress(current);
      const step = [...steps].reverse().find(s => s.at <= current);
      if (step) setLabel(step.label);
    }, interval);
    return () => { clearInterval(timer); setProgress(100); setLabel("Complete!"); };
  };

  // ---- Image generation (isolated, no double fire) ----
  const handleImageRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) { if (!file.type.startsWith("image/")) continue; const url = await uploadFileToStorage(file); if (url) setImageRefs(prev => [...prev, { type: "image", name: file.name, url, mimeType: file.type, size: file.size }]); }
    if (imageRefInputRef.current) imageRefInputRef.current.value = "";
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    const currentRefs = [...imageRefs];
    const prompt = imagePrompt;
    const format = FORMAT_PRESETS.find(f => f.id === selectedImageFormat) || FORMAT_PRESETS[0];
    setImagePrompt("");

    // Start progress simulation (~15s estimate for image)
    const stopProgress = simulateProgress(setImageProgress, setImageProgressLabel, 15000);

    try {
      const formatInstruction = `Generate an ultra HD, photorealistic, highest quality image. Output MUST be exactly ${format.width}x${format.height} pixels (${format.ratio} aspect ratio, ${format.label} format). `;
      const promptText = `${formatInstruction}Prompt: ${prompt}${currentRefs.length > 0 ? " Use these reference images for style/content guidance." : ""}`;

      const parts: any[] = [{ type: "text", text: promptText }];
      for (const ref of currentRefs) parts.push({ type: "image_url", image_url: { url: ref.url } });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agency-copilot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: currentRefs.length > 0 ? parts : promptText }], context: buildContext(), quality: qualityMode }),
      });
      if (!resp.ok) { const ed = await resp.text().catch(() => ""); let errMsg = `Error ${resp.status}`; try { errMsg = JSON.parse(ed).error || errMsg; } catch {} throw new Error(errMsg); }
      
      // Handle response - check content type
      const ct = resp.headers.get("content-type") || "";
      let data: any;
      if (ct.includes("application/json")) {
        data = await resp.json();
      } else {
        // SSE or text response — try to parse
        const text = await resp.text();
        try { data = JSON.parse(text); } catch {
          // Try extracting from SSE
          let content = ""; let images: any[] = [];
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const js = line.slice(6).trim();
            if (js === "[DONE]") break;
            try { const p = JSON.parse(js); if (p.choices?.[0]?.message?.images) images = p.choices[0].message.images; if (p.choices?.[0]?.message?.content) content = p.choices[0].message.content; } catch {}
          }
          data = { type: "image", content, images };
        }
      }
      stopProgress();

      if ((data.type === "image" && data.images?.length) || data.images?.length) {
        const img = data.images[0];
        const saved = await saveGeneratedContent("image", img.image_url.url, prompt, "image", { aspect_ratio: format.ratio, metadata: { format: format.id, width: format.width, height: format.height } });
        if (saved) setGeneratedImages(prev => [saved, ...prev]);
        toast.success(`Image generated! (${format.label} — ${format.width}×${format.height})`);
      } else {
        const errDetail = data.error || data.content || "No image returned";
        toast.error(`Image failed: ${errDetail}`);
        console.error("Image generation failed:", data);
      }
      setImageRefs([]);
    } catch (e: any) { stopProgress(); toast.error(e.message || "Image generation failed"); } finally { setIsGeneratingImage(false); setImageProgress(0); setImageProgressLabel(""); }
  };

  // ---- Video generation (isolated, no double fire) ----
  const handleVideoFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return;
    const url = await uploadFileToStorage(file);
    if (url) setVideoStartFrame({ type: "image", name: file.name, url, mimeType: file.type, size: file.size });
    if (videoFrameInputRef.current) videoFrameInputRef.current.value = "";
  };

  const generateVideo = async () => {
    if (!videoPrompt.trim() || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    const prompt = videoPrompt;
    const frame = videoStartFrame;
    const format = VIDEO_FORMAT_PRESETS.find(f => f.id === selectedVideoFormat) || VIDEO_FORMAT_PRESETS[0];
    setVideoPrompt(""); setVideoStartFrame(null);

    // Map format ratio to Seedance supported ratios
    const mapRatio = (ratio: string) => {
      const supported = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21"];
      if (supported.includes(ratio)) return ratio;
      if (ratio === "4:5") return "3:4";
      return "16:9";
    };

    setVideoProgress(0);
    setVideoProgressLabel("Submitting to Seedance 2.0...");

    try {
      // Step 1: Create task via Seedance API
      const createResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seedance-video?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          prompt,
          duration: String(videoDuration),
          aspect_ratio: mapRatio(format.ratio),
          resolution: selectedVideoResolution,
          generate_audio: videoGenerateAudio,
          fixed_lens: fixedLens,
          image_url: frame?.url || undefined,
        }),
      });
      if (!createResp.ok) { const ed = await createResp.json().catch(() => ({})); throw new Error(ed.error || `Error ${createResp.status}`); }
      const createData = await createResp.json();
      const taskId = createData.task_id;
      if (!taskId) throw new Error("No task_id returned from Seedance API");

      setVideoProgress(10);
      setVideoProgressLabel("Task submitted — rendering video...");

      // Step 2: Poll for completion (max ~5 minutes)
      const maxPolls = 60;
      let pollCount = 0;
      let videoUrl: string | null = null;

      while (pollCount < maxPolls) {
        await new Promise(r => setTimeout(r, 5000));
        pollCount++;

        const progress = Math.min(10 + (pollCount / maxPolls) * 80, 90);
        setVideoProgress(progress);

        const statusLabels = [
          "Rendering video...",
          "Processing frames...",
          "Applying effects...",
          "Encoding video...",
          "Finalizing output...",
        ];
        setVideoProgressLabel(statusLabels[Math.min(Math.floor(pollCount / 12), statusLabels.length - 1)]);

        try {
          const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seedance-video?action=poll&task_id=${encodeURIComponent(taskId)}`, {
            headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          });
          if (!pollResp.ok) continue;
          const pollData = await pollResp.json();

          if (pollData.status === "SUCCESS" && pollData.video_url) {
            videoUrl = pollData.video_url;
            break;
          }
          if (pollData.status === "FAILED") {
            throw new Error(pollData.error_message || "Video generation failed on Seedance");
          }
        } catch (pollErr: any) {
          if (pollErr.message?.includes("failed") || pollErr.message?.includes("Failed")) throw pollErr;
        }
      }

      if (!videoUrl) throw new Error("Video generation timed out. Try a shorter duration or simpler prompt.");

      setVideoProgress(95);
      setVideoProgressLabel("Saving video...");

      const saved = await saveGeneratedContent("video", videoUrl, prompt, "video", {
        metadata: { duration: videoDuration, format: format.id, width: format.width, height: format.height, seedance_task_id: taskId, resolution: selectedVideoResolution },
      });
      if (saved) setGeneratedVideos(prev => [saved, ...prev]);

      setVideoProgress(100);
      setVideoProgressLabel("Complete!");
      toast.success(`Video generated! (${format.label} — ${videoDuration}s — ${selectedVideoResolution})`);
    } catch (e: any) { toast.error(e.message || "Video generation failed"); } finally {
      setTimeout(() => { setIsGeneratingVideo(false); setVideoProgress(0); setVideoProgressLabel(""); }, 1500);
    }
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

  // ---- Pending attachments ----
  const renderPendingAttachments = () => {
    if (attachments.length === 0) return null;
    return (
      <div className="px-4 py-2 border-t border-white/[0.06]">
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {att.type === "image" ? (<div className="w-[60px] h-[45px]"><img src={att.url} alt="" className="w-full h-full object-cover" /></div>)
                : att.type === "audio" ? (<div className="flex items-center gap-1 px-2 py-1"><Music className="h-3 w-3 text-accent" /><span className="text-[9px] text-white/50 truncate max-w-[50px]">{att.name}</span></div>)
                  : att.type === "video" ? (<div className="flex items-center gap-1 px-2 py-1"><Video className="h-3 w-3 text-accent" /><span className="text-[9px] text-white/50 truncate max-w-[50px]">{att.name}</span></div>)
                    : (<div className="flex items-center gap-1 px-2 py-1"><FileText className="h-3 w-3 text-white/30" /><span className="text-[9px] text-white/50 truncate max-w-[50px]">{att.name}</span></div>)}
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute top-0 right-0 h-4 w-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5 text-white" /></button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---- Message attachments & actions ----
  const renderMessageAttachments = (atts: Attachment[]) => (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {atts.map((att, i) => (
        <div key={i} className="rounded-lg overflow-hidden border border-white/10">
          {att.type === "image" ? (<img src={att.url} alt={att.name} className="max-w-[120px] max-h-[80px] object-cover" />) : att.type === "audio" ? (<div className="p-1.5 bg-white/5"><audio controls src={att.url} className="h-6 w-32" /></div>) : att.type === "video" ? (<video controls src={att.url} className="max-w-[150px] max-h-[80px] rounded" />) : (<a href={att.url} target="_blank" className="flex items-center gap-1 p-1.5 bg-white/5 text-[9px] text-white/50"><FileText className="h-3 w-3" />{att.name}</a>)}
        </div>
      ))}
    </div>
  );

  const renderMessageActions = (msg: Msg, idx: number) => {
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

  // ---- Audio gallery ----
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

  // ---- Content gallery for image/video (full image preview) ----
  const renderContentGallery = (items: GeneratedContent[], modeTab: string, isGenerating: boolean, progress: number, progressLabel: string) => {
    const showGenerating = isGenerating;
    const generatingCard = showGenerating ? (
      <div key="generating" className="relative rounded-xl overflow-hidden border-2 border-accent/30 bg-white/[0.03] flex flex-col items-center justify-center p-8"
        style={displayLayout !== "vertical" ? { width: `${220 * displayScale}px`, minHeight: `${170 * displayScale}px` } : { minHeight: "200px" }}>
        <ProgressRing progress={progress} size={90} label={progressLabel} />
        <p className="text-xs text-white/40 mt-3">Media generating...</p>
        <p className="text-[10px] text-white/20 mt-1">~{modeTab === "video" ? "2-5 min" : "15s"} estimated</p>
      </div>
    ) : null;

    if (items.length === 0 && !showGenerating) {
      const Icon = modeTab === "image" ? ImageIcon : Video;
      return (<div className="flex flex-col items-center justify-center h-full text-center py-12"><Icon className="h-12 w-12 text-white/10 mb-4" /><p className="text-white/20 text-sm">Generated {modeTab}s appear here</p></div>);
    }
    const layout = displayLayout === "horizontal" ? "flex flex-row flex-wrap gap-4" : displayLayout === "vertical" ? "flex flex-col gap-4" : "grid grid-cols-2 gap-4";
    return (
      <div className={layout}>
        {generatingCard}
        {items.map(item => {
          const meta = item.metadata || {};
          const dims = meta.width && meta.height ? `${meta.width}×${meta.height}` : item.aspect_ratio || "";
          return (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
              style={displayLayout !== "vertical" ? { width: `${220 * displayScale}px` } : {}}>
              {/* Render video or image based on mode */}
              {modeTab === "video" ? (
                <video src={item.url} controls className="w-full rounded-t-xl bg-black/20" />
              ) : (
                <img src={item.url} alt="" className="w-full object-contain rounded-t-xl cursor-pointer bg-black/20"
                  onClick={() => setImageFullPreview(item.url)} />
              )}
              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { const a = document.createElement("a"); a.href = item.url; a.download = `${modeTab}_${item.id}.${modeTab === "video" ? "mp4" : "png"}`; a.target = "_blank"; a.click(); }} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-black/80"><Download className="h-4 w-4 text-white" /></button>
                <button onClick={() => deleteGeneratedContent(item.id, modeTab)} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-red-500/60"><Trash className="h-4 w-4 text-white" /></button>
              </div>
              {dims && <div className="absolute top-2 left-2 bg-black/60 rounded-md px-2 py-0.5 text-[9px] text-white/70">{dims}</div>}
              <div className="p-3">
                <p className="text-[10px] text-white/40 truncate"><span className="text-accent">Prompt:</span> {item.prompt}</p>
                <button onClick={() => modeTab === "image" ? setImagePrompt(item.prompt || "") : setVideoPrompt(item.prompt || "")}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white border border-white/10 rounded px-2 py-0.5 mt-2">
                  <RotateCcw className="h-2.5 w-2.5" /> Reuse
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Format selector component ----
  const renderFormatSelector = (presets: FormatPreset[], selectedId: string, onSelect: (id: string) => void) => {
    const categories = [...new Set(presets.map(p => p.category))];
    return (
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.filter(p => p.category === cat).map(f => (
                <button key={f.id} onClick={() => onSelect(f.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${selectedId === f.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"}`}>
                  <f.icon className="h-3 w-3" />
                  <span>{f.label}</span>
                  <span className="text-[8px] text-white/20">{f.width}×{f.height}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============ MODE PANELS ============

  const renderImagePanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[380px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Image Prompt</p>
          <div className="flex items-center gap-2">
            {qualityMode === "uncensored" && (
              <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 gap-1"><ShieldOff className="h-3 w-3" />Uncensored</Badge>
            )}
            <Badge variant="outline" className="text-[9px] border-accent/20 text-accent">
              {qualityMode === "best" ? "Ultra HD" : qualityMode === "uncensored" ? "Unrestricted" : "High Quality"}
            </Badge>
          </div>
        </div>
        <Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Describe precisely what you want..." className="bg-white/5 border-white/10 text-white text-sm min-h-[120px] resize-none placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateImage(); } }} />

        {/* Reference images */}
        <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-colors" onClick={() => imageRefInputRef.current?.click()}>
          <Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Reference images • click to select</p>
        </div>
        <input ref={imageRefInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageRefUpload} />
        {imageRefs.length > 0 && <div className="flex flex-wrap gap-2">{imageRefs.map((ref, i) => (<div key={i} className="relative group w-[60px] h-[60px] rounded-lg overflow-hidden border border-white/10"><img src={ref.url} alt="" className="w-full h-full object-cover" /><button onClick={() => setImageRefs(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="h-3 w-3 text-white" /></button></div>))}</div>}

        {/* Format selector */}
        <div>
          <p className="text-[11px] text-white/40 mb-2 font-medium">Output Format</p>
          {renderFormatSelector(FORMAT_PRESETS, selectedImageFormat, setSelectedImageFormat)}
        </div>

        {/* Quality + Generate */}
        <div className="mt-auto flex items-center gap-2 flex-wrap">
          <Select value={qualityMode} onValueChange={v => setQualityMode(v as QualityMode)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              <SelectItem value="best" className="text-white text-xs"><div className="flex items-center gap-2"><Shield className="h-3 w-3" /> Best Quality</div></SelectItem>
              <SelectItem value="uncensored" className="text-white text-xs"><div className="flex items-center gap-2"><ShieldOff className="h-3 w-3 text-red-400" /> Uncensored</div></SelectItem>
              <SelectItem value="high" className="text-white text-xs">High Quality</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateImage} disabled={!imagePrompt.trim() || isGeneratingImage} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm h-9">
            {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderScaleControls()}
        <ScrollArea className="flex-1 p-4">
          {renderContentGallery(generatedImages, "image", isGeneratingImage, imageProgress, imageProgressLabel)}
        </ScrollArea>
      </div>
    </div>
  );

  const renderVideoPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[380px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Video Prompt</p>
          <div className="flex items-center gap-2">
            {qualityMode === "uncensored" && (
              <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 gap-1"><ShieldOff className="h-3 w-3" />Uncensored</Badge>
            )}
            <Badge variant="outline" className="text-[9px] border-accent/20 text-accent">Kling AI</Badge>
          </div>
        </div>
        <Textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="Describe your video scene in detail..." className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] resize-none placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateVideo(); } }} />
        <div className="flex gap-2">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors flex-1 min-h-[70px] relative" onClick={() => videoFrameInputRef.current?.click()}>
            {videoStartFrame ? (<><img src={videoStartFrame.url} alt="" className="w-full h-full object-cover rounded-lg absolute inset-0" /><button onClick={(e) => { e.stopPropagation(); setVideoStartFrame(null); }} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center z-10"><X className="h-3 w-3 text-white" /></button></>)
              : (<><Upload className="h-4 w-4 text-white/20" /><p className="text-[9px] text-white/30">Start Frame</p></>)}
          </div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 flex-1 min-h-[70px] opacity-30"><Upload className="h-4 w-4 text-white/20" /><p className="text-[9px] text-white/30">End Frame</p></div>
        </div>
        <input ref={videoFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleVideoFrameUpload} />

        <div>
          <p className="text-[10px] text-white/40 mb-1">Duration: <span className="text-accent font-medium">{videoDuration}s</span></p>
          <div className="flex gap-2">
            {[4, 8, 12].map(d => (
              <button key={d} onClick={() => setVideoDuration(d)} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${videoDuration === d ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>{d}s</button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Resolution</p>
          <div className="flex gap-2">
            {[
              { id: "480p", label: "480p", desc: "Fast / preview" },
              { id: "720p", label: "720p", desc: "Production" },
            ].map(m => (
              <button key={m.id} onClick={() => setSelectedVideoResolution(m.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] border transition-all flex-1 ${selectedVideoResolution === m.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                {m.label} <span className="text-[8px] text-white/20">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={videoGenerateAudio} onCheckedChange={setVideoGenerateAudio} />
            <span className="text-[10px] text-white/50">Generate Audio</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={fixedLens} onCheckedChange={setFixedLens} />
            <span className="text-[10px] text-white/50">Fixed Lens (reduce motion blur)</span>
          </label>
        </div>

        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Output Format</p>
          {renderFormatSelector(VIDEO_FORMAT_PRESETS, selectedVideoFormat, setSelectedVideoFormat)}
        </div>

        <div className="mt-auto flex items-center gap-2 flex-wrap">
          <Button onClick={generateVideo} disabled={!videoPrompt.trim() || isGeneratingVideo} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm h-9">
            {isGeneratingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate with Seedance 2.0
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderScaleControls()}
        <ScrollArea className="flex-1 p-4">
          {renderContentGallery(generatedVideos, "video", isGeneratingVideo, videoProgress, videoProgressLabel)}
        </ScrollArea>
      </div>
    </div>
  );

  const renderAudioPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">My Voices</p>
            <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{voices.length}</Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowCreateVoice(true)} className="text-[11px] text-accent hover:text-accent/80 h-7 px-2 gap-1">
            <Plus className="h-3 w-3" /> Create a voice
          </Button>
        </div>
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
                    className="h-7 w-7 p-0 text-white/30 hover:text-white shrink-0" title="Preview"><Play className="h-3 w-3" /></Button>
                )}
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingVoiceId(v.id); setVoiceParams(loadVoiceParams(v.id)); setShowVoiceEditor(true); }}
                  className="h-7 w-7 p-0 text-white/20 hover:text-white shrink-0"><SlidersHorizontal className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteVoice(v.id); }}
                  className="h-7 w-7 p-0 text-white/20 hover:text-red-400 shrink-0"><Trash className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </ScrollArea>
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
            <p className="text-white/30 text-base mb-1"><p className="text-white/30 text-base mb-1">Uplyze Virtual Assistant</p></p>
            <p className="text-white/20 text-sm mb-8 max-w-md">{mode === "freeWill" ? "Free Will mode — no limits, no restrictions, ask anything." : "Unfiltered. Uncensored. Ask anything."}</p>
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
      <div className="flex gap-3 h-[calc(100vh-130px)]">
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
              <p className="text-base font-semibold text-white flex-1">Uplyze Virtual Assistant</p>
              <CreditCostBadge cost="8–30" variant="header" label="per action" />
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

      {/* Full image preview dialog */}
      <Dialog open={!!imageFullPreview} onOpenChange={() => setImageFullPreview(null)}>
        <DialogContent className="bg-black/95 border-white/10 max-w-[90vw] max-h-[90vh] p-2">
          {imageFullPreview && (
            <img src={imageFullPreview} alt="" className="w-full h-full object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

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

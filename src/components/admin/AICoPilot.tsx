import { useState, useEffect, useRef, useCallback } from "react";
import { useCreditAction } from "@/hooks/useCreditAction";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
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
  Shield, ShieldOff, Move, ArrowRightLeft, Film,
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

type CopilotMode = "chat" | "image" | "video" | "audio" | "motion" | "lipsync" | "faceswap";
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
  { id: "motion" as CopilotMode, label: "Motion", icon: Move },
  { id: "lipsync" as CopilotMode, label: "Lipsync", icon: Mic },
  { id: "faceswap" as CopilotMode, label: "Faceswap", icon: ArrowRightLeft },
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
  try { const raw = localStorage.getItem(PREFS_KEY); if (raw) { const p = JSON.parse(raw); return { scale: p.scale ?? 1.25, layout: p.layout ?? "vertical" }; } } catch {}
  return { scale: 1.25, layout: "vertical" };
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

// ─── Credit cost helpers ───
const getVideoCreditCost = (duration: number): number => {
  // 250 base (4s), +50 per extra 2s bracket
  if (duration <= 4) return 250;
  if (duration <= 6) return 300;
  if (duration <= 8) return 350;
  return 400; // 10s
};

const getModeCreditLabel = (mode: string): string => {
  switch (mode) {
    case "image": return "31";
    case "video": return "250–400";
    case "audio": return "21";
    case "motion": return "300";
    case "lipsync": return "200";
    case "faceswap": return "150";
    case "chat":
    default: return "8";
  }
};

// ============= MAIN COMPONENT =============
const AICoPilot = ({ onNavigate, subTab, onSubTabChange }: { onNavigate?: (tab: string) => void; subTab?: string; onSubTabChange?: (subTab: string) => void }) => {
  // Credit system
  const { performAction, insufficientModal, closeInsufficientModal } = useCreditAction();
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
  const [mode, setModeInternal] = useState<CopilotMode>((subTab as CopilotMode) || "chat");
  const setMode = (m: CopilotMode) => {
    setModeInternal(m);
    onSubTabChange?.(m);
  };
  // Sync from URL prop
  useEffect(() => { if (subTab && subTab !== mode) setModeInternal(subTab as CopilotMode); }, [subTab]);
  const [qualityMode, setQualityMode] = useState<QualityMode>("best");
  const [freeWillMode, setFreeWillMode] = useState(false);

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
  const [selectedVideoProvider, setSelectedVideoProvider] = useState<string>("runway");
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>("gen4_turbo");
  const [videoProviderStatus, setVideoProviderStatus] = useState<Record<string, boolean>>({});
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoProgressLabel, setVideoProgressLabel] = useState("");
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedContent[]>([]);

  // Audio generated content
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedContent[]>([]);
  const [elevenAction, setElevenAction] = useState<"tts" | "sfx" | "sts" | "voice_isolation" | "voice_dubbing">("tts");
  const [isGeneratingElevenAudio, setIsGeneratingElevenAudio] = useState(false);
  const [stsAudioFile, setStsAudioFile] = useState<File | null>(null);
  const [dubbingLanguage, setDubbingLanguage] = useState("es");
  const stsFileInputRef = useRef<HTMLInputElement>(null);

  // Motion state
  const [motionRefVideo, setMotionRefVideo] = useState<string | null>(null);
  const [motionRefName, setMotionRefName] = useState("");
  const [motionTargetVideo, setMotionTargetVideo] = useState<string | null>(null);
  const [motionTargetName, setMotionTargetName] = useState("");
  const [motionTargetImage, setMotionTargetImage] = useState<string | null>(null);
  const [motionTargetImageName, setMotionTargetImageName] = useState("");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [motionInputType, setMotionInputType] = useState<"video" | "image">("video");
  const [isGeneratingMotion, setIsGeneratingMotion] = useState(false);
  const [motionProgress, setMotionProgress] = useState(0);
  const [motionProgressLabel, setMotionProgressLabel] = useState("");
  const [generatedMotions, setGeneratedMotions] = useState<GeneratedContent[]>([]);
  const motionRefInputRef = useRef<HTMLInputElement>(null);
  const motionTargetInputRef = useRef<HTMLInputElement>(null);

  // Lipsync state
  const [lipsyncVideo, setLipsyncVideo] = useState<string | null>(null);
  const [lipsyncVideoName, setLipsyncVideoName] = useState("");
  const [lipsyncAudio, setLipsyncAudio] = useState<string | null>(null);
  const [lipsyncAudioName, setLipsyncAudioName] = useState("");
  const [lipsyncPrompt, setLipsyncPrompt] = useState("");
  const [isGeneratingLipsync, setIsGeneratingLipsync] = useState(false);
  const [lipsyncProgress, setLipsyncProgress] = useState(0);
  const [lipsyncProgressLabel, setLipsyncProgressLabel] = useState("");
  const [generatedLipsyncs, setGeneratedLipsyncs] = useState<GeneratedContent[]>([]);
  const lipsyncVideoInputRef = useRef<HTMLInputElement>(null);
  const lipsyncAudioInputRef = useRef<HTMLInputElement>(null);
  const [lipsyncTtsText, setLipsyncTtsText] = useState("");
  const [lipsyncTtsVoice, setLipsyncTtsVoice] = useState("");
  const [isGeneratingLipsyncTts, setIsGeneratingLipsyncTts] = useState(false);
  const [lipsyncAudioSource, setLipsyncAudioSource] = useState<"voicenote" | "voice">("voicenote");
  const [lipsyncQuality, setLipsyncQuality] = useState<string>("high");
  const [motionQuality, setMotionQuality] = useState<string>("high");
  const [faceswapQuality, setFaceswapQuality] = useState<string>("high");

  // Faceswap state
  const [faceswapSource, setFaceswapSource] = useState<string | null>(null);
  const [faceswapSourceName, setFaceswapSourceName] = useState("");
  const [faceswapTarget, setFaceswapTarget] = useState<string | null>(null);
  const [faceswapTargetName, setFaceswapTargetName] = useState("");
  const [faceswapCategory, setFaceswapCategory] = useState<"video" | "image">("image");
  const [isGeneratingFaceswap, setIsGeneratingFaceswap] = useState(false);
  const [faceswapProgress, setFaceswapProgress] = useState(0);
  const [faceswapProgressLabel, setFaceswapProgressLabel] = useState("");
  const [generatedFaceswaps, setGeneratedFaceswaps] = useState<GeneratedContent[]>([]);
  const faceswapSourceInputRef = useRef<HTMLInputElement>(null);
  const faceswapTargetInputRef = useRef<HTMLInputElement>(null);

  // Display prefs
  const [displayScale, setDisplayScale] = useState(1.5);
  const [displayLayout, setDisplayLayout] = useState<LayoutMode>("vertical");

  // Refs
  const cancelGenRef = useRef<string | null>(null); // set to mode name to signal cancel
  const activeTaskIds = useRef<Record<string, { taskId: string; provider: string; endpoint: string }>>({});
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
    const [convos, accts, voicesData, imagesData, videosData, audiosData, motionsData, lipsyncsData, faceswapsData] = await Promise.all([
      supabase.from("copilot_conversations").select("*").order("updated_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, monthly_revenue, subscriber_count, status"),
      supabase.from("copilot_voices").select("*").eq("is_preset", false).order("name"),
      supabase.from("copilot_generated_content").select("*").eq("mode", "image").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "video").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "audio").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "motion").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "lipsync").order("created_at", { ascending: false }),
      supabase.from("copilot_generated_content").select("*").eq("mode", "faceswap").order("created_at", { ascending: false }),
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
    setGeneratedMotions((motionsData.data || []) as GeneratedContent[]);
    setGeneratedLipsyncs((lipsyncsData.data || []) as GeneratedContent[]);
    setGeneratedFaceswaps((faceswapsData.data || []) as GeneratedContent[]);

    // Check which video providers have API keys configured
    try {
      const provResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-generate?action=providers`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      if (provResp.ok) setVideoProviderStatus(await provResp.json());
    } catch {}

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

    // Resume any in-progress generation tasks
    resumeActiveTasks();
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

  // ---- Active generation task persistence ----
  const saveActiveTask = async (taskId: string, provider: string, generationType: string, prompt: string, metadata?: any) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return;
    await supabase.from("active_generation_tasks" as any).insert({
      user_id: session.session.user.id,
      task_id: taskId,
      provider,
      generation_type: generationType,
      prompt: prompt || "",
      metadata: metadata || {},
    });
  };

  const removeActiveTask = async (taskId: string) => {
    await supabase.from("active_generation_tasks" as any).delete().eq("task_id", taskId);
  };

  const cancelGeneration = async (mode: CopilotMode) => {
    cancelGenRef.current = mode;
    const taskInfo = activeTaskIds.current[mode];
    // Server-side cancel + database cleanup
    if (taskInfo) {
      const endpoint = taskInfo.endpoint === "video-generate" ? "video-generate" : "media-process";
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}?action=cancel&task_id=${encodeURIComponent(taskInfo.taskId)}&provider=${taskInfo.provider}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
      } catch (e) { console.error("Cancel request failed (non-fatal):", e); }
      // Delete the active task from database so it won't resume on refresh
      try { await supabase.from("active_generation_tasks" as any).delete().eq("task_id", taskInfo.taskId); } catch {}
      delete activeTaskIds.current[mode];
    }
    // Also delete any active tasks for this generation type for this user (belt-and-suspenders)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try { await supabase.from("active_generation_tasks" as any).delete().eq("user_id", user.id).eq("generation_type", mode); } catch {}
    }
    // Reset frontend state
    if (mode === "image") { setIsGeneratingImage(false); setImageProgress(0); setImageProgressLabel(""); }
    else if (mode === "video") { setIsGeneratingVideo(false); setVideoProgress(0); setVideoProgressLabel(""); }
    else if (mode === "audio") { setIsGeneratingAudio(false); setIsGeneratingElevenAudio(false); }
    else if (mode === "motion") { setIsGeneratingMotion(false); setMotionProgress(0); setMotionProgressLabel(""); }
    else if (mode === "lipsync") { setIsGeneratingLipsync(false); setLipsyncProgress(0); setLipsyncProgressLabel(""); }
    else if (mode === "faceswap") { setIsGeneratingFaceswap(false); setFaceswapProgress(0); setFaceswapProgressLabel(""); }
    toast.info("Generation cancelled");
    // Keep cancel flag long enough for polling loops (5s intervals) to detect it
    setTimeout(() => { if (cancelGenRef.current === mode) cancelGenRef.current = null; }, 15000);
  };

  const resumeActiveTasks = useCallback(async () => {
    const { data: tasks } = await supabase.from("active_generation_tasks" as any).select("*").in("status", ["processing", "timeout"] as any);
    if (!tasks?.length) return;
    for (const task of tasks) {
      resumeTaskPolling(task);
    }
  }, []);

  const resumeTaskPolling = async (task: any) => {
    const { task_id: taskId, provider, generation_type: genType, prompt, metadata } = task;
    const pollUrl = genType === "video"
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-generate?action=poll&provider=${provider}&task_id=${encodeURIComponent(taskId)}&task_type=${metadata?.task_type || "text2video"}`
      : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=poll&task_id=${encodeURIComponent(taskId)}&provider=${provider}`;

    // Set generating state based on type
    if (genType === "video") { setIsGeneratingVideo(true); setVideoProgress(30); setVideoProgressLabel("Resuming generation..."); }
    else if (genType === "motion") { setIsGeneratingMotion(true); setMotionProgress(30); setMotionProgressLabel("Resuming..."); }
    else if (genType === "lipsync") { setIsGeneratingLipsync(true); setLipsyncProgress(30); setLipsyncProgressLabel("Resuming..."); }
    else if (genType === "faceswap") { setIsGeneratingFaceswap(true); setFaceswapProgress(30); setFaceswapProgressLabel("Resuming..."); }

    let pollCount = 0;
    const maxPolls = 150; // ~12.5 minutes to account for long-running tasks
    let resultUrl: string | null = null;
    let failed = false;

    while (pollCount < maxPolls) {
      // Check if cancelled before waiting
      if (cancelGenRef.current === genType) {
        try { await supabase.from("active_generation_tasks" as any).delete().eq("task_id", taskId); } catch {}
        return;
      }
      await new Promise(r => setTimeout(r, 5000));
      pollCount++;
      // Check again after waiting
      if (cancelGenRef.current === genType) {
        try { await supabase.from("active_generation_tasks" as any).delete().eq("task_id", taskId); } catch {}
        return;
      }
      const progress = Math.min(30 + (pollCount / maxPolls) * 60, 90);
      if (genType === "video") { setVideoProgress(progress); setVideoProgressLabel("Rendering video..."); }
      else if (genType === "motion") { setMotionProgress(progress); setMotionProgressLabel("Processing motion..."); }
      else if (genType === "lipsync") { setLipsyncProgress(progress); setLipsyncProgressLabel("Processing lipsync..."); }
      else if (genType === "faceswap") { setFaceswapProgress(progress); setFaceswapProgressLabel("Processing faceswap..."); }

      try {
        const pollResp = await fetch(pollUrl, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
        if (!pollResp.ok) continue;
        const pollData = await pollResp.json();
        if (pollData.status === "SUCCESS" && pollData.video_url) { resultUrl = pollData.video_url; break; }
        if (pollData.status === "FAILED" || pollData.status === "CANCELLED") { failed = true; break; }
      } catch { /* continue polling */ }
    }

    if (resultUrl) {
      // Save content FIRST, then remove active task
      const contentType = (genType === "faceswap" && metadata?.category === "image") ? "image" : "video";
      const saved = await saveGeneratedContent(contentType, resultUrl, prompt || genType, genType, { metadata: metadata || {} });
      await removeActiveTask(taskId);
      if (saved) {
        if (genType === "video") setGeneratedVideos(prev => [saved, ...prev]);
        else if (genType === "motion") setGeneratedMotions(prev => [saved, ...prev]);
        else if (genType === "lipsync") setGeneratedLipsyncs(prev => [saved, ...prev]);
        else if (genType === "faceswap") setGeneratedFaceswaps(prev => [saved, ...prev]);
        toast.success(`${genType.charAt(0).toUpperCase() + genType.slice(1)} resumed & completed!`);
      }
    } else {
      // Only remove the task if it explicitly failed; on timeout, keep it so next reload can retry
      if (failed) {
        await removeActiveTask(taskId);
        toast.error(`Resumed ${genType} failed.`);
      } else {
        // Update status to indicate timeout but keep task for potential retry
        await supabase.from("active_generation_tasks" as any).update({ status: "timeout" }).eq("task_id", taskId);
        toast.error(`Resumed ${genType} is still processing. It will retry on next page load.`);
      }
    }

    // Reset state
    if (genType === "video") { setIsGeneratingVideo(false); setVideoProgress(0); setVideoProgressLabel(""); }
    else if (genType === "motion") { setIsGeneratingMotion(false); setMotionProgress(0); setMotionProgressLabel(""); }
    else if (genType === "lipsync") { setIsGeneratingLipsync(false); setLipsyncProgress(0); setLipsyncProgressLabel(""); }
    else if (genType === "faceswap") { setIsGeneratingFaceswap(false); setFaceswapProgress(0); setFaceswapProgressLabel(""); }
  };

  const deleteGeneratedContent = async (id: string, modeTab: string) => {
    const { error } = await supabase.from("copilot_generated_content").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    if (modeTab === "image") setGeneratedImages(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "video") setGeneratedVideos(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "audio") setGeneratedAudios(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "motion") setGeneratedMotions(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "lipsync") setGeneratedLipsyncs(prev => prev.filter(c => c.id !== id));
    else if (modeTab === "faceswap") setGeneratedFaceswaps(prev => prev.filter(c => c.id !== id));
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
          // Platform action executed by AI
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
    // Max 4 voices limit
    if (voices.length >= 4) { toast.error("Maximum 4 voices allowed. Delete an existing voice to create a new one."); return; }
    // Deduct 21 credits for voice cloning
    const creditResult = await performAction('copilot_voice_clone', async () => ({ success: true }));
    if (!creditResult) return;
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

  // Build ElevenLabs voice_settings from UI voiceParams with dramatic, perceptible mappings
  const buildVoiceSettings = (params: typeof voiceParams) => {
    const hasBreathy = params.effects.includes("Breathy");
    const hasDeep = params.effects.includes("Deep");
    const hasWarm = params.effects.includes("Warm");
    const hasCrisp = params.effects.includes("Crisp");
    const hasWhisper = params.effects.includes("Whisper");
    const hasEcho = params.effects.includes("Echo");
    const hasRobotic = params.effects.includes("Robotic");

    // Pitch: -10 to +10. Negative = deeper/more stable, Positive = lighter/more expressive
    // Map pitch aggressively: pitch -10 → stability 0.95, pitch 0 → 0.40, pitch +10 → 0.05
    let stability = 0.40 - (params.pitch * 0.035);
    // Reverb: 0 to 100. Higher reverb = lower similarity (more ambient/diffused voice)
    let similarity_boost = 0.85 - (params.reverb * 0.006);
    // Style: effects-driven with strong differentiation
    let style = 0.30;
    if (hasWhisper) style = 0.95;
    else if (hasBreathy) style = 0.80;
    else if (hasWarm) style = 0.65;
    else if (hasDeep) style = 0.15;
    else if (hasCrisp) style = 0.05;
    else if (hasRobotic) style = 0.0;
    // Echo effect: push style high + drop stability for ethereal sound
    if (hasEcho) { stability = Math.min(stability, 0.15); style = Math.max(style, 0.85); }
    // Robotic: max stability, zero style for flat monotone
    if (hasRobotic) { stability = 0.98; style = 0.0; similarity_boost = Math.max(similarity_boost, 0.90); }
    // Deep: increase stability for authoritative tone
    if (hasDeep) { stability = Math.max(stability, 0.65); }

    // Speed: directly from slider (0.7 to 1.2 range from ElevenLabs)
    const speed = Math.max(0.7, Math.min(1.2, params.speed));

    return {
      stability: Math.max(0, Math.min(1, stability)),
      similarity_boost: Math.max(0, Math.min(1, similarity_boost)),
      style: Math.max(0, Math.min(1, style)),
      speed,
      use_speaker_boost: !(hasEcho || hasRobotic),
    };
  };

  // ---- Audio generation (real ElevenLabs TTS) ----
  const generateAudio = async () => {
    if (!audioText.trim() || isGeneratingAudio) return;
    // Deduct 21 credits for audio generation
    const creditResult = await performAction('copilot_audio', async () => ({ success: true }));
    if (!creditResult) return;
    const voice = voices.find(v => v.id === selectedVoice);
    if (!voice?.elevenlabs_voice_id) { toast.error("Select a cloned voice first. Create one from audio samples."); return; }
    setIsGeneratingAudio(true);
    try {
      const voiceSettings = buildVoiceSettings(voiceParams);

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

  // ---- Inline TTS for Lipsync panel ----
  const generateLipsyncTts = async () => {
    if (!lipsyncPrompt.trim() || isGeneratingLipsyncTts) return;
    const voice = voices.find(v => v.id === lipsyncTtsVoice);
    if (!voice?.elevenlabs_voice_id) { toast.error("Select a cloned voice first"); return; }
    const creditResult = await performAction('copilot_audio', async () => ({ success: true }));
    if (!creditResult) return;
    setIsGeneratingLipsyncTts(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ text: lipsyncPrompt, voice_id: voice.elevenlabs_voice_id, voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.5, speed: 1.0, use_speaker_boost: true } }),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      if (!data.audio_url) throw new Error("No audio returned");
      const saved = await saveGeneratedContent("audio", data.audio_url, lipsyncPrompt, "audio", { metadata: { voice: voice.name, provider: "elevenlabs", action: "lipsync_tts" } });
      if (saved) setGeneratedAudios(prev => [saved, ...prev]);
      setLipsyncAudio(data.audio_url);
      setLipsyncAudioName(`TTS: ${voice.name}`);
      toast.success("Audio generated & loaded!");
      // Don't clear lipsyncPrompt — it's the main shared prompt
    } catch (e: any) { toast.error(e.message || "TTS failed"); } finally { setIsGeneratingLipsyncTts(false); }
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
    // Deduct 31 credits server-side before generating
    const creditResult = await performAction('copilot_generate_image', async () => {
      return { success: true };
    });
    if (!creditResult) return; // Insufficient credits or error
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
    // Video cost scales with duration: 250 base (4s), +50 per extra 2s
    const videoCreditCost = getVideoCreditCost(videoDuration);
    // Deduct credits server-side via direct call with dynamic cost
    const { data: session } = await supabase.auth.getSession();
    const { data: deductResult, error: deductError } = await supabase.functions.invoke('deduct-credits', {
      body: { action_type: 'copilot_generate_video', cost: videoCreditCost },
      headers: { Authorization: `Bearer ${session?.session?.access_token}` },
    });
    if (deductError || !deductResult?.success) {
      const msg = deductResult?.error || deductError?.message || 'Failed to deduct credits';
      if (msg.includes('Insufficient')) {
        toast.error(`Insufficient credits. Need ${videoCreditCost}, check your balance.`);
      } else {
        toast.error('Credit deduction failed: ' + msg);
      }
      return;
    }
    setIsGeneratingVideo(true);
    const prompt = videoPrompt;
    const frame = videoStartFrame;
    const format = VIDEO_FORMAT_PRESETS.find(f => f.id === selectedVideoFormat) || VIDEO_FORMAT_PRESETS[0];
    const provider = selectedVideoProvider;
    setVideoPrompt(""); setVideoStartFrame(null);

    const mapRatio = (ratio: string) => {
      const supported = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21"];
      if (supported.includes(ratio)) return ratio;
      if (ratio === "4:5") return "3:4";
      return "16:9";
    };

    const providerLabels: Record<string, string> = {
      seedance: "Seedance 2.0", kling: "Kling AI", huggingface: "HuggingFace", replicate: "Replicate", luma: "Luma Dream Machine", runway: "Runway ML",
    };

    setVideoProgress(0);
    setVideoProgressLabel(`Submitting to ${providerLabels[provider] || provider}...`);

    let _activeTaskId: string | null = null;
    try {
      const createBody: any = {
        prompt,
        duration: videoDuration,
        aspect_ratio: mapRatio(format.ratio),
        resolution: selectedVideoResolution,
        image_url: frame?.url || undefined,
        model_name: selectedVideoModel,
      };
      // Provider-specific fields
      if (provider === "seedance") {
        createBody.generate_audio = videoGenerateAudio;
        createBody.fixed_lens = fixedLens;
      }
      if (provider === "kling") {
        createBody.mode = selectedVideoModel.includes("master") ? "pro" : "std";
      }

      const createResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-generate?action=create&provider=${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify(createBody),
      });
      if (!createResp.ok) { const ed = await createResp.json().catch(() => ({})); throw new Error(ed.error || `Error ${createResp.status}`); }
      const createData = await createResp.json();

      // HuggingFace may return directly
      if (createData.status === "SUCCESS" && createData.video_url) {
        setVideoProgress(95);
        setVideoProgressLabel("Saving video...");
        const saved = await saveGeneratedContent("video", createData.video_url, prompt, "video", {
          metadata: { duration: videoDuration, format: format.id, provider, model: selectedVideoModel },
        });
        if (saved) setGeneratedVideos(prev => [saved, ...prev]);
        setVideoProgress(100);
        setVideoProgressLabel("Complete!");
        toast.success(`Video generated via ${providerLabels[provider]}!`);
        setTimeout(() => { setIsGeneratingVideo(false); setVideoProgress(0); setVideoProgressLabel(""); }, 1500);
        return;
      }

      const taskId = createData.task_id;
      _activeTaskId = taskId;
      if (!taskId) throw new Error(`No task_id returned from ${providerLabels[provider]}`);

      const taskType = createData.task_type || (frame ? "image2video" : "text2video");
      await saveActiveTask(taskId, provider, "video", prompt, { duration: videoDuration, format: format.id, model: selectedVideoModel, task_type: taskType });
      activeTaskIds.current.video = { taskId, provider, endpoint: "video-generate" };

      setVideoProgress(10);
      setVideoProgressLabel("Task submitted — rendering video...");

      // taskType already declared above
      const maxPolls = 60;
      let pollCount = 0;
      let videoUrl: string | null = null;

      while (pollCount < maxPolls) {
        if (cancelGenRef.current === "video") return;
        await new Promise(r => setTimeout(r, 5000));
        pollCount++;
        const progress = Math.min(10 + (pollCount / maxPolls) * 80, 90);
        setVideoProgress(progress);
        const labels = ["Rendering video...", "Processing frames...", "Applying effects...", "Encoding video...", "Finalizing output..."];
        setVideoProgressLabel(labels[Math.min(Math.floor(pollCount / 12), labels.length - 1)]);

        try {
          const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-generate?action=poll&provider=${provider}&task_id=${encodeURIComponent(taskId)}&task_type=${taskType}`, {
            headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          });
          if (!pollResp.ok) continue;
          const pollData = await pollResp.json();
          if (pollData.status === "SUCCESS" && pollData.video_url) { videoUrl = pollData.video_url; break; }
          if (pollData.status === "FAILED") throw new Error(pollData.error_message || `Video generation failed on ${providerLabels[provider]}`);
        } catch (pollErr: any) {
          if (pollErr.message?.includes("failed") || pollErr.message?.includes("Failed")) throw pollErr;
        }
      }

      if (!videoUrl) throw new Error("Video generation timed out.");

      await removeActiveTask(taskId);
      setVideoProgress(95);
      setVideoProgressLabel("Saving video...");
      const saved = await saveGeneratedContent("video", videoUrl, prompt, "video", {
        metadata: { duration: videoDuration, format: format.id, provider, model: selectedVideoModel, task_id: taskId },
      });
      if (saved) setGeneratedVideos(prev => [saved, ...prev]);
      setVideoProgress(100);
      setVideoProgressLabel("Complete!");
      toast.success(`Video generated via ${providerLabels[provider]}! (${format.label} — ${videoDuration}s)`);
    } catch (e: any) { if (_activeTaskId) await removeActiveTask(_activeTaskId).catch(() => {}); toast.error(e.message || "Video generation failed"); } finally {
      setTimeout(() => { setIsGeneratingVideo(false); setVideoProgress(0); setVideoProgressLabel(""); }, 1500);
    }
  };

  // ---- Cross-tab loaders ----
  const loadVideoInTab = (url: string, name: string, tab: CopilotMode) => {
    setMode(tab);
    if (tab === "motion") { setMotionTargetVideo(url); setMotionTargetName(name); }
    else if (tab === "lipsync") { setLipsyncVideo(url); setLipsyncVideoName(name); }
    else if (tab === "faceswap") { setFaceswapTarget(url); setFaceswapTargetName(name); }
  };
  const loadAudioInLipsync = (url: string, name: string) => {
    setMode("lipsync");
    setLipsyncAudio(url); setLipsyncAudioName(name);
  };

  // ---- Motion generation ----
  const generateMotion = async () => {
    if (!motionRefVideo || !(motionTargetVideo || motionTargetImage) || isGeneratingMotion) return;
    const creditResult = await performAction('copilot_motion_transfer', async () => ({ success: true }));
    if (!creditResult) return;
    setIsGeneratingMotion(true);
    const stopProgress = simulateProgress(setMotionProgress, setMotionProgressLabel, 120000);
    try {
      const targetUrl = motionTargetImage || motionTargetVideo;
      const targetType = motionTargetImage ? "image" : "video";
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=create&type=motion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ reference_video_url: motionRefVideo, target_url: targetUrl, target_type: targetType, prompt: motionPrompt || undefined, quality: motionQuality }),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      const taskId = data.task_id;
      const provider = data.provider || "runway";
      if (!taskId) throw new Error("No task_id returned");
      await saveActiveTask(taskId, provider, "motion", motionPrompt || "Motion transfer", { type: "motion" });
      activeTaskIds.current.motion = { taskId, provider, endpoint: "media-process" };
      let videoUrl: string | null = null;
      let pollCount = 0;
      while (pollCount < 120) {
        if (cancelGenRef.current === "motion") return;
        await new Promise(r => setTimeout(r, 5000)); pollCount++;
        try {
          const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=poll&task_id=${encodeURIComponent(taskId)}&provider=${provider}`, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
          if (!pollResp.ok) continue;
          const pollData = await pollResp.json();
          if (pollData.status === "SUCCESS" && pollData.video_url) { videoUrl = pollData.video_url; break; }
          if (pollData.status === "FAILED") throw new Error(pollData.error_message || "Motion transfer failed");
        } catch (e: any) { if (e instanceof Error && e.message) throw e; }
      }
      if (!videoUrl) throw new Error("Motion transfer timed out");
      await removeActiveTask(taskId);
      stopProgress();
      const saved = await saveGeneratedContent("video", videoUrl, motionPrompt || "Motion transfer", "motion", { metadata: { type: "motion" } });
      if (saved) setGeneratedMotions(prev => [saved, ...prev]);
      toast.success("Motion transfer complete!");
      setMotionPrompt(""); setMotionRefVideo(null); setMotionRefName(""); setMotionTargetVideo(null); setMotionTargetName(""); setMotionTargetImage(null); setMotionTargetImageName("");
    } catch (e: any) { stopProgress(); toast.error(e.message || "Motion transfer failed"); } finally {
      setTimeout(() => { setIsGeneratingMotion(false); setMotionProgress(0); setMotionProgressLabel(""); }, 1500);
    }
  };

  // ---- Lipsync generation ----
  const generateLipsync = async () => {
    const useVoiceMode = lipsyncAudioSource === "voice" && lipsyncTtsVoice && lipsyncPrompt.trim();
    if (!lipsyncVideo || isGeneratingLipsync) return;
    // In voice mode we don't need pre-existing audio; in voicenote mode we do
    if (!useVoiceMode && !lipsyncAudio) return;
    const creditResult = await performAction('copilot_lipsync', async () => ({ success: true }));
    if (!creditResult) return;
    setIsGeneratingLipsync(true);
    const stopProgress = simulateProgress(setLipsyncProgress, setLipsyncProgressLabel, 120000);
    try {
      const voice = voices.find(v => v.id === lipsyncTtsVoice);
      const payload: any = { video_url: lipsyncVideo, quality: lipsyncQuality };
      if (useVoiceMode && voice?.elevenlabs_voice_id) {
        // Send TTS text + voice to edge function — it will generate audio server-side
        payload.tts_text = lipsyncPrompt;
        payload.tts_voice_id = voice.elevenlabs_voice_id;
      } else {
        payload.audio_url = lipsyncAudio;
      }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=create&type=lipsync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      const taskId = data.task_id;
      const provider = data.provider || "replicate";
      if (!taskId) throw new Error("No task_id returned");
      await saveActiveTask(taskId, provider, "lipsync", lipsyncPrompt || "Lipsync", { type: "lipsync" });
      activeTaskIds.current.lipsync = { taskId, provider, endpoint: "media-process" };
      let videoUrl: string | null = null;
      let pollCount = 0;
      while (pollCount < 120) {
        if (cancelGenRef.current === "lipsync") return;
        await new Promise(r => setTimeout(r, 5000)); pollCount++;
        try {
          const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=poll&task_id=${encodeURIComponent(taskId)}&provider=${provider}`, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
          if (!pollResp.ok) continue;
          const pollData = await pollResp.json();
          if (pollData.status === "SUCCESS" && pollData.video_url) { videoUrl = pollData.video_url; break; }
          if (pollData.status === "FAILED") throw new Error(pollData.error_message || "Lipsync failed");
        } catch (e: any) { if (e instanceof Error && e.message) throw e; }
      }
      if (!videoUrl) throw new Error("Lipsync timed out");
      await removeActiveTask(taskId);
      stopProgress();
      const saved = await saveGeneratedContent("video", videoUrl, lipsyncPrompt || "Lipsync", "lipsync", { metadata: { type: "lipsync" } });
      if (saved) setGeneratedLipsyncs(prev => [saved, ...prev]);
      toast.success("Lipsync complete!");
      setLipsyncPrompt(""); setLipsyncVideo(null); setLipsyncVideoName(""); setLipsyncAudio(null); setLipsyncAudioName("");
    } catch (e: any) { stopProgress(); toast.error(e.message || "Lipsync failed"); } finally {
      setTimeout(() => { setIsGeneratingLipsync(false); setLipsyncProgress(0); setLipsyncProgressLabel(""); }, 1500);
    }
  };

  // ---- Faceswap generation ----
  const generateFaceswap = async () => {
    if (!faceswapSource || !faceswapTarget || isGeneratingFaceswap) return;
    const creditResult = await performAction('copilot_faceswap', async () => ({ success: true }));
    if (!creditResult) return;
    setIsGeneratingFaceswap(true);
    const stopProgress = simulateProgress(setFaceswapProgress, setFaceswapProgressLabel, 180000);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=create&type=faceswap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ source_face_url: faceswapSource, target_url: faceswapTarget, target_type: faceswapCategory }),
      });
      if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
      const data = await resp.json();
      let currentTaskId = data.task_id;
      const provider = data.provider || "replicate";
      let needsUpscale = data.needs_upscale === true;
      if (!currentTaskId) throw new Error("No task_id returned");
      let resultUrl: string | null = null;
      // Check if prediction already completed synchronously
      if (data.status === "SUCCESS" && data.video_url) {
        resultUrl = data.video_url;
      } else {
        await saveActiveTask(currentTaskId, provider, "faceswap", "Faceswap", { type: "faceswap", category: faceswapCategory });
        activeTaskIds.current.faceswap = { taskId: currentTaskId, provider, endpoint: "media-process" };
        let pollCount = 0;
        while (pollCount < 120) {
          if (cancelGenRef.current === "faceswap") return;
          await new Promise(r => setTimeout(r, 2000)); pollCount++;
          try {
            const upscaleParam = needsUpscale ? "&needs_upscale=true" : "";
            const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-process?action=poll&task_id=${encodeURIComponent(currentTaskId)}&provider=${provider}${upscaleParam}`, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
            if (!pollResp.ok) continue;
            const pollData = await pollResp.json();
            // If server returned a new task_id (upscale chained), switch to polling that
            if (pollData.task_id && pollData.task_id !== currentTaskId) {
              currentTaskId = pollData.task_id;
              needsUpscale = false; // upscale already started
              continue;
            }
            if (pollData.status === "SUCCESS" && pollData.video_url) { resultUrl = pollData.video_url; break; }
            if (pollData.status === "FAILED") throw new Error(pollData.error_message || "Faceswap failed");
          } catch (e: any) { if (e instanceof Error && e.message) throw e; }
        }
      }
      if (!resultUrl) throw new Error("Faceswap timed out");
      await removeActiveTask(currentTaskId);
      stopProgress();
      const contentType = faceswapCategory === "image" ? "image" : "video";
      const saved = await saveGeneratedContent(contentType, resultUrl, "Faceswap", "faceswap", { metadata: { type: "faceswap", category: faceswapCategory } });
      if (saved) setGeneratedFaceswaps(prev => [saved, ...prev]);
      toast.success("Faceswap complete!");
      setFaceswapSource(null); setFaceswapSourceName(""); setFaceswapTarget(null); setFaceswapTargetName("");
    } catch (e: any) { stopProgress(); toast.error(e.message || "Faceswap failed"); } finally {
      setTimeout(() => { setIsGeneratingFaceswap(false); setFaceswapProgress(0); setFaceswapProgressLabel(""); }, 1500);
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
                  <button onClick={() => loadAudioInLipsync(item.url, voiceName)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-pink-400 hover:bg-white/10 transition-colors" title="Load in Lipsync">
                    <Mic className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditingVoiceId(item.id); setShowVoiceEditor(true); }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Edit">
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <button onClick={async () => { const slug = (item.prompt || "audio").replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40).replace(/_$/, ''); try { const resp = await fetch(item.url); const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = blobUrl; a.download = `${slug}.mp3`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl); } catch { const a = document.createElement("a"); a.href = item.url; a.download = `${slug}.mp3`; a.click(); } }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Download .mp3">
                    <Download className="h-4 w-4" />
                  </button>
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
    const isVideoModeBase = ["video", "motion", "lipsync"].includes(modeTab);
    const showGenerating = isGenerating;
    const generatingCard = showGenerating ? (
      <div key="generating" className="relative rounded-xl overflow-hidden border-2 border-accent/30 bg-white/[0.03] flex flex-col items-center justify-center p-8"
        style={displayLayout !== "vertical" ? { width: `${220 * displayScale}px`, minHeight: `${170 * displayScale}px` } : { minHeight: "200px" }}>
        <ProgressRing progress={progress} size={90} label={progressLabel} />
        <p className="text-xs text-white/40 mt-3">Media generating...</p>
        <p className="text-[10px] text-white/20 mt-1">~{isVideoModeBase || modeTab === "faceswap" ? "2-5 min" : "15s"} estimated</p>
      </div>
    ) : null;

    if (items.length === 0 && !showGenerating) {
      const Icon = modeTab === "image" ? ImageIcon : Video;
      return (<div className="flex flex-col items-center justify-center h-full text-center py-12"><Icon className="h-12 w-12 text-white/10 mb-4" /><p className="text-white/20 text-sm">Generated {modeTab}s appear here</p></div>);
    }
    const layout = displayLayout === "horizontal" ? "flex flex-row flex-wrap gap-4" : displayLayout === "vertical" ? "flex flex-col gap-4" : "grid grid-cols-2 gap-4";
    const sortedItems = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return (
      <div className={layout}>
        {generatingCard}
        {sortedItems.map(item => {
          const meta = item.metadata || {};
          const dims = meta.width && meta.height ? `${meta.width}×${meta.height}` : item.aspect_ratio || "";
          const isItemVideo = isVideoModeBase || (modeTab === "faceswap" && item.content_type === "video");
          const fileExt = isItemVideo ? "mp4" : "png";
          return (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
              style={displayLayout !== "vertical" ? { width: `${220 * displayScale}px` } : {}}>
              {/* Render video or image based on content type */}
              {isItemVideo ? (
                <video src={item.url} controls playsInline preload="metadata" className="w-full rounded-t-xl bg-black/20" style={{ maxHeight: `${200 * displayScale}px` }} />
              ) : (
                <img src={item.url} alt="" className="w-full object-contain rounded-t-xl cursor-pointer bg-black/20"
                  onClick={() => setImageFullPreview(item.url)} />
              )}
              {/* Overlay actions */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => deleteGeneratedContent(item.id, modeTab)} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-red-500/60"><Trash className="h-4 w-4 text-white" /></button>
                {modeTab === "video" && (
                  <>
                    <button onClick={() => loadVideoInTab(item.url, item.prompt?.slice(0, 30) || "Video", "motion")} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-violet-500/60" title="Load in Motion"><Move className="h-4 w-4 text-white" /></button>
                    <button onClick={() => loadVideoInTab(item.url, item.prompt?.slice(0, 30) || "Video", "lipsync")} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-pink-500/60" title="Load in Lipsync"><Mic className="h-4 w-4 text-white" /></button>
                    <button onClick={() => loadVideoInTab(item.url, item.prompt?.slice(0, 30) || "Video", "faceswap")} className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center hover:bg-orange-500/60" title="Load in Faceswap"><ArrowRightLeft className="h-4 w-4 text-white" /></button>
                  </>
                )}
              </div>
              {dims && <div className="absolute top-2 left-2 bg-black/60 rounded-md px-2 py-0.5 text-[9px] text-white/70">{dims}</div>}
              <div className="p-3">
                <p className="text-[10px] text-white/40 truncate mb-2"><span className="text-accent">Prompt:</span> {item.prompt}</p>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { const slug = (item.prompt || modeTab).replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40).replace(/_$/, ''); try { const resp = await fetch(item.url); const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = blobUrl; a.download = `${slug}.${fileExt}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl); } catch { const a = document.createElement("a"); a.href = item.url; a.download = `${slug}.${fileExt}`; a.click(); } }}
                    className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg px-2.5 py-1 transition-all">
                    <Download className="h-3 w-3" /> Download
                  </button>
                  <button onClick={() => modeTab === "image" ? setImagePrompt(item.prompt || "") : setVideoPrompt(item.prompt || "")}
                    className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white border border-white/10 rounded-lg px-2 py-1">
                    <RotateCcw className="h-2.5 w-2.5" /> Reuse
                  </button>
                </div>
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
          <Button onClick={generateImage} disabled={!imagePrompt.trim() || isGeneratingImage} className="flex-1 text-white text-sm h-9" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate Image
          </Button>
          {isGeneratingImage && (
            <Button onClick={() => cancelGeneration("image")} variant="outline" className="h-9 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
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

  const VIDEO_PROVIDERS = [
    { id: "runway", label: "Runway ML", pricing: "paid", color: "text-orange-400", desc: "Gen-4.5, Gen-4 Turbo, Veo 3/3.1, Aleph, Act Two", models: [
      { id: "gen4.5", label: "Gen-4.5 (12cr/s)", info: "Text/Image → Video" },
      { id: "gen4_turbo", label: "Gen-4 Turbo (5cr/s)", info: "Image → Video" },
      { id: "gen4_aleph", label: "Gen-4 Aleph (15cr/s)", info: "Video → Video" },
      { id: "act_two", label: "Act Two (5cr/s)", info: "Motion Capture" },
      { id: "veo3", label: "Veo 3 🔊 (40cr/s)", info: "Text/Image → Video + Audio" },
      { id: "veo3.1", label: "Veo 3.1 🔊 (40cr/s)", info: "Text/Image → Video + Audio" },
      { id: "veo3.1_fast", label: "Veo 3.1 Fast 🔊 (15cr/s)", info: "Text/Image → Video + Audio" },
    ]},
    { id: "luma", label: "Luma Dream Machine", pricing: "paid", color: "text-pink-400", desc: "Cinematic video generation, image-to-video", models: [
      { id: "dream-machine", label: "Dream Machine" },
    ]},
    { id: "seedance", label: "Seedance 2.0", pricing: "paid", color: "text-cyan-400", desc: "High quality, 4-12s, audio gen", models: [
      { id: "seedance-2.0", label: "Seedance 2.0" },
    ]},
    { id: "kling", label: "Kling AI", pricing: "paid", color: "text-purple-400", desc: "V2 Master, text & image-to-video", models: [
      { id: "kling-v2-master", label: "V2 Master" },
      { id: "kling-v2", label: "V2" },
      { id: "kling-v1-6", label: "V1.6 Legacy" },
    ]},
  ];

  const renderPricingBadge = (_pricing: string) => null;

  const activeProvider = VIDEO_PROVIDERS.find(p => p.id === selectedVideoProvider) || VIDEO_PROVIDERS[0];

  const renderVideoPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
        {/* Provider selector */}
        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Video Provider</p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
            {VIDEO_PROVIDERS.map(p => {
              const configured = videoProviderStatus[p.id];
              return (
                <button key={p.id} onClick={() => {
                  setSelectedVideoProvider(p.id);
                  setSelectedVideoModel(p.models[0].id);
                }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${selectedVideoProvider === p.id ? "border-accent/40 bg-accent/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium ${selectedVideoProvider === p.id ? "text-accent" : "text-white/70"}`}>{p.label}</span>
                      {renderPricingBadge(p.pricing)}
                      {configured === false && <Badge className="text-[7px] bg-red-500/20 text-red-400 border-red-500/30 px-1 py-0">NO KEY</Badge>}
                    </div>
                    <p className="text-[9px] text-white/30 mt-0.5">{p.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model selector for active provider */}
        {activeProvider.models.length > 1 && (
          <div>
            <p className="text-[10px] text-white/40 mb-1.5 font-medium">Model</p>
            <div className="flex flex-wrap gap-1.5">
              {activeProvider.models.map(m => (
                <button key={m.id} onClick={() => setSelectedVideoModel(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${selectedVideoModel === m.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Video Prompt</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] border-white/10 ${activeProvider.color}`}>{activeProvider.label}</Badge>
          </div>
        </div>
        <Textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="Describe your video scene in detail..." className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] resize-none placeholder:text-white/20" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateVideo(); } }} />
        <div className="flex gap-2">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors flex-1 min-h-[70px] relative" onClick={() => videoFrameInputRef.current?.click()}>
            {videoStartFrame ? (<><img src={videoStartFrame.url} alt="" className="w-full h-full object-cover rounded-lg absolute inset-0" /><button onClick={(e) => { e.stopPropagation(); setVideoStartFrame(null); }} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center z-10"><X className="h-3 w-3 text-white" /></button></>)
              : (<><Upload className="h-4 w-4 text-white/20" /><p className="text-[9px] text-white/30">Start Frame (img2vid)</p></>)}
          </div>
        </div>
        <input ref={videoFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleVideoFrameUpload} />

        <div>
          <p className="text-[10px] text-white/40 mb-1">Duration: <span className="text-accent font-medium">{videoDuration}s</span></p>
          <div className="flex gap-2">
            {(selectedVideoProvider === "runway" ? [2, 5, 8, 10] : selectedVideoProvider === "seedance" ? [4, 8, 12] : selectedVideoProvider === "kling" ? [5, 10] : [4, 5, 8]).map(d => (
              <button key={d} onClick={() => setVideoDuration(d)} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${videoDuration === d ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>{d}s</button>
            ))}
          </div>
        </div>

        {/* Provider-specific options */}
        {selectedVideoProvider === "seedance" && (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-white/40 mb-1.5 font-medium">Resolution</p>
              <div className="flex gap-2">
                {[{ id: "480p", label: "480p", desc: "Fast" }, { id: "720p", label: "720p", desc: "Production" }].map(m => (
                  <button key={m.id} onClick={() => setSelectedVideoResolution(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] border transition-all flex-1 ${selectedVideoResolution === m.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                    {m.label} <span className="text-[8px] text-white/20">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={videoGenerateAudio} onCheckedChange={setVideoGenerateAudio} />
              <span className="text-[10px] text-white/50">Generate Audio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={fixedLens} onCheckedChange={setFixedLens} />
              <span className="text-[10px] text-white/50">Fixed Lens</span>
            </label>
          </div>
        )}

        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Output Format</p>
          {renderFormatSelector(VIDEO_FORMAT_PRESETS, selectedVideoFormat, setSelectedVideoFormat)}
        </div>

        <div className="mt-auto flex items-center gap-2 flex-wrap">
          <Button onClick={generateVideo} disabled={!videoPrompt.trim() || isGeneratingVideo} className="flex-1 text-white text-sm h-9" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {isGeneratingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate Video
          </Button>
          {isGeneratingVideo && (
            <Button onClick={() => cancelGeneration("video")} variant="outline" className="h-9 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
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

  const DUBBING_LANGUAGES = [
    { id: "es", l: "Spanish" }, { id: "fr", l: "French" }, { id: "de", l: "German" }, { id: "it", l: "Italian" },
    { id: "pt", l: "Portuguese" }, { id: "ja", l: "Japanese" }, { id: "ko", l: "Korean" }, { id: "zh", l: "Chinese" },
    { id: "ar", l: "Arabic" }, { id: "hi", l: "Hindi" }, { id: "ru", l: "Russian" }, { id: "nl", l: "Dutch" },
    { id: "pl", l: "Polish" }, { id: "sv", l: "Swedish" }, { id: "tr", l: "Turkish" },
  ];

  const generateElevenLabsAudio = async () => {
    const needsText = elevenAction === "tts" || elevenAction === "sfx";
    const needsFile = elevenAction === "sts" || elevenAction === "voice_isolation" || elevenAction === "voice_dubbing";
    if (needsText && !audioText.trim()) return;
    if (needsFile && !stsAudioFile) { toast.error("Upload an audio file"); return; }
    if (isGeneratingElevenAudio) return;

    // Deduct 21 credits for any audio generation action
    const creditResult = await performAction('copilot_audio', async () => ({ success: true }));
    if (!creditResult) return;

    setIsGeneratingElevenAudio(true);
    try {
      let result: any;

      if (elevenAction === "tts") {
        // Use cloned voice TTS
        const voice = voices.find(v => v.id === selectedVoice);
        if (!voice?.elevenlabs_voice_id) { toast.error("Select a cloned voice first"); setIsGeneratingElevenAudio(false); return; }
        const voiceSettings = buildVoiceSettings(voiceParams);
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ text: audioText, voice_id: voice.elevenlabs_voice_id, voice_settings: voiceSettings }),
        });
        if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
        result = await resp.json();
      } else if (elevenAction === "sfx") {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=sfx`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ text: audioText, duration: 5 }),
        });
        if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
        result = await resp.json();
      } else if (elevenAction === "sts") {
        const voice = voices.find(v => v.id === selectedVoice);
        if (!voice?.elevenlabs_voice_id) { toast.error("Select a cloned voice for STS"); setIsGeneratingElevenAudio(false); return; }
        const formData = new FormData();
        formData.append("voice_id", voice.elevenlabs_voice_id);
        formData.append("audio", stsAudioFile!);
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=sts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        });
        if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
        result = await resp.json();
      } else if (elevenAction === "voice_isolation") {
        const formData = new FormData();
        formData.append("audio", stsAudioFile!);
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=voice_isolation`, {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        });
        if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
        result = await resp.json();
      } else if (elevenAction === "voice_dubbing") {
        const formData = new FormData();
        formData.append("audio", stsAudioFile!);
        formData.append("target_language", dubbingLanguage);
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-audio?action=voice_dubbing`, {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        });
        if (!resp.ok) { const ed = await resp.json().catch(() => ({})); throw new Error(ed.error || `Error ${resp.status}`); }
        result = await resp.json();
      }

      if (!result?.audio_url) throw new Error("No audio returned");

      const actionLabels: Record<string, string> = {
        tts: `TTS: ${voices.find(v => v.id === selectedVoice)?.name || "Voice"}`,
        sfx: "Sound Effect",
        sts: `STS: ${voices.find(v => v.id === selectedVoice)?.name || "Voice"}`,
        voice_isolation: "Voice Isolation",
        voice_dubbing: `Dubbed → ${dubbingLanguage.toUpperCase()}`,
      };
      const saved = await saveGeneratedContent("audio", result.audio_url, audioText || stsAudioFile?.name || "", "audio", {
        metadata: { voice: actionLabels[elevenAction] || "Uplyze Audio", provider: "elevenlabs", action: elevenAction },
      });
      if (saved) setGeneratedAudios(prev => [saved, ...prev]);
      toast.success(`Audio generated: ${actionLabels[elevenAction]}!`);
      if (needsText) setAudioText("");
      if (needsFile) setStsAudioFile(null);
    } catch (e: any) { toast.error(e.message || "Audio generation failed"); } finally { setIsGeneratingElevenAudio(false); }
  };

  const renderAudioPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">Uplyze Audio</p>
            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">{voices.length} cloned</Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowCreateVoice(true)} className="text-[11px] text-accent hover:text-accent/80 h-7 px-2 gap-1">
            <Plus className="h-3 w-3" /> Clone Voice
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Action selector */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-emerald-400">Audio Mode</p>
              <div className="flex flex-wrap gap-1.5">
                {(["tts", "sfx", "sts", "voice_isolation", "voice_dubbing"] as const).map(act => {
                  const labels: Record<string, string> = { tts: "Text to Speech", sfx: "Sound Effects", sts: "Speech to Speech", voice_isolation: "Voice Isolation", voice_dubbing: "Voice Dubbing" };
                  const costs: Record<string, string> = { tts: "1cr/50ch", sfx: "1cr/6s", sts: "1cr/2s", voice_isolation: "1cr/6s", voice_dubbing: "1cr/2s" };
                  return (
                    <button key={act} onClick={() => setElevenAction(act)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${elevenAction === act ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                      {labels[act]} <span className="text-[7px] text-white/20">{costs[act]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cloned voices list (needed for TTS + STS) */}
            {(elevenAction === "tts" || elevenAction === "sts") && (
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 font-medium mb-1">Select Voice</p>
                {voices.length === 0 && <p className="text-[11px] text-white/20 text-center py-4">No cloned voices yet. Create one!</p>}
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
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const params = loadVoiceParams(v.id); setVoiceParams({ ...DEFAULT_VOICE_PARAMS }); saveVoiceParams(v.id, { ...DEFAULT_VOICE_PARAMS }); toast.success(`Reset ${v.name} to raw voice`); }}
                      className="h-7 w-7 p-0 text-white/20 hover:text-amber-400 shrink-0" title="Reset to raw voice"><RotateCcw className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingVoiceId(v.id); setVoiceParams(loadVoiceParams(v.id)); setShowVoiceEditor(true); }}
                      className="h-7 w-7 p-0 text-white/20 hover:text-white shrink-0"><SlidersHorizontal className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteVoice(v.id); }}
                      className="h-7 w-7 p-0 text-white/20 hover:text-red-400 shrink-0"><Trash className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* File upload for STS / Isolation / Dubbing */}
            {(elevenAction === "sts" || elevenAction === "voice_isolation" || elevenAction === "voice_dubbing") && (
              <div>
                <p className="text-[10px] text-white/40 mb-1">Upload Audio File</p>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-colors"
                  onClick={() => stsFileInputRef.current?.click()}>
                  {stsAudioFile ? (
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-emerald-400" />
                      <span className="text-[11px] text-white/60">{stsAudioFile.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setStsAudioFile(null); }}><X className="h-3 w-3 text-white/30 hover:text-red-400" /></button>
                    </div>
                  ) : (
                    <><Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">MP3, WAV, M4A — click to upload</p></>
                  )}
                </div>
                <input ref={stsFileInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setStsAudioFile(f); if (stsFileInputRef.current) stsFileInputRef.current.value = ""; }} />
              </div>
            )}

            {/* Dubbing language */}
            {elevenAction === "voice_dubbing" && (
              <div>
                <p className="text-[10px] text-white/40 mb-1">Target Language</p>
                <Select value={dubbingLanguage} onValueChange={setDubbingLanguage}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[200px]">
                    {DUBBING_LANGUAGES.map(lang => (
                      <SelectItem key={lang.id} value={lang.id} className="text-white text-xs">{lang.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-white/[0.06] p-4 space-y-3">
          {elevenAction === "tts" && selectedVoice && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <p className="text-[10px] text-emerald-300/70">Voice: {voices.find(v => v.id === selectedVoice)?.name || "—"}</p>
            </div>
          )}
          {(elevenAction === "tts" || elevenAction === "sfx") && (
            <div>
              <p className="text-xs font-medium text-white mb-2">
                {elevenAction === "sfx" ? "Describe the sound effect" : "Text to convert to speech"}
              </p>
              <Textarea value={audioText} onChange={e => setAudioText(e.target.value)}
                placeholder={elevenAction === "sfx" ? "A thunderstorm with heavy rain..." : "Enter the text you want to convert to audio..."}
                className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] resize-none placeholder:text-white/20"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateElevenLabsAudio(); } }} />
              <p className="text-[10px] text-white/30 mt-1">{audioText.length} characters</p>
            </div>
          )}
          <Button onClick={generateElevenLabsAudio}
            disabled={isGeneratingElevenAudio || ((elevenAction === "tts" || elevenAction === "sfx") && !audioText.trim()) || ((elevenAction === "sts" || elevenAction === "voice_isolation" || elevenAction === "voice_dubbing") && !stsAudioFile)}
            className="w-full text-white text-sm h-9" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {isGeneratingElevenAudio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Audio
          </Button>
          {isGeneratingElevenAudio && (
            <Button onClick={() => cancelGeneration("audio")} variant="outline" className="w-full mt-2 h-9 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">{renderAudioGallery()}</ScrollArea>
    </div>
  );

  // ============ MOTION PANEL ============
  const renderMotionPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
        <p className="text-sm font-semibold text-white/80">Motion Transfer</p>
        <p className="text-[10px] text-white/30">Copy motion from a reference video onto your character</p>
        <Textarea value={motionPrompt} onChange={e => setMotionPrompt(e.target.value)} placeholder="Describe precisely what you want..." className="bg-white/5 border-white/10 text-white text-sm min-h-[100px] resize-none placeholder:text-white/20" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Target:</span>
          {(["video", "image"] as const).map(t => (
            <button key={t} onClick={() => setMotionInputType(t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] border transition-all ${motionInputType === t ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
              {t === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Motion reference */}
        <div>
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-white/40 font-medium flex items-center gap-1"><Film className="h-3 w-3" /> Motion</p>{motionRefVideo && <button onClick={() => { setMotionRefVideo(null); setMotionRefName(""); }} className="text-[9px] text-red-400/60 hover:text-red-400">Clear</button>}</div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[70px]" onClick={() => motionRefInputRef.current?.click()}>
            {motionRefVideo ? <div className="flex items-center gap-2"><Video className="h-4 w-4 text-accent" /><span className="text-[11px] text-white/60 truncate max-w-[200px]">{motionRefName}</span></div>
              : <><Video className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Add motion to copy</p><p className="text-[8px] text-white/15">Video duration: 3-30 seconds</p></>}
          </div>
          <input ref={motionRefInputRef} type="file" accept="video/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { setMotionRefVideo(url); setMotionRefName(f.name); } if (motionRefInputRef.current) motionRefInputRef.current.value = ""; }} />
          {generatedVideos.length > 0 && <Select onValueChange={v => { const vid = generatedVideos.find(x => x.id === v); if (vid) { setMotionRefVideo(vid.url); setMotionRefName(vid.prompt?.slice(0, 30) || "Generated video"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated video..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedVideos.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
        </div>

        {/* Target */}
        <div>
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-white/40 font-medium flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {motionInputType === "video" ? "Video" : "Image"}</p>{(motionTargetVideo || motionTargetImage) && <button onClick={() => { setMotionTargetVideo(null); setMotionTargetName(""); setMotionTargetImage(null); setMotionTargetImageName(""); }} className="text-[9px] text-red-400/60 hover:text-red-400">Clear</button>}</div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[70px]" onClick={() => motionTargetInputRef.current?.click()}>
            {(motionTargetVideo || motionTargetImage) ? <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-accent" /><span className="text-[11px] text-white/60 truncate max-w-[200px]">{motionTargetName || motionTargetImageName}</span></div>
              : <><Plus className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Add your character</p><p className="text-[8px] text-white/15">{motionInputType === "video" ? "Video" : "Image"} with visible face and body</p></>}
          </div>
          <input ref={motionTargetInputRef} type="file" accept={motionInputType === "video" ? "video/*" : "image/*"} className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { if (motionInputType === "video") { setMotionTargetVideo(url); setMotionTargetName(f.name); } else { setMotionTargetImage(url); setMotionTargetImageName(f.name); } } if (motionTargetInputRef.current) motionTargetInputRef.current.value = ""; }} />
          {generatedVideos.length > 0 && motionInputType === "video" && <Select onValueChange={v => { const vid = generatedVideos.find(x => x.id === v); if (vid) { setMotionTargetVideo(vid.url); setMotionTargetName(vid.prompt?.slice(0, 30) || "Generated video"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated video..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedVideos.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
          {generatedImages.length > 0 && motionInputType === "image" && <Select onValueChange={v => { const img = generatedImages.find(x => x.id === v); if (img) { setMotionTargetImage(img.url); setMotionTargetImageName(img.prompt?.slice(0, 30) || "Generated image"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated image..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedImages.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
        </div>

        {/* Quality selector */}
        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Output Quality</p>
          <div className="flex gap-1.5">
            {[{ id: "highest", label: "Highest", desc: "1920×1080" }, { id: "high", label: "High", desc: "1280×720" }, { id: "medium", label: "Medium", desc: "854×480" }, { id: "low", label: "Low", desc: "640×360" }].map(q => (
              <button key={q.id} onClick={() => setMotionQuality(q.id)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all text-center ${motionQuality === q.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                <span className="block font-medium">{q.label}</span>
                <span className="block text-[8px] text-white/20">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <Button onClick={generateMotion} disabled={!motionRefVideo || !(motionTargetVideo || motionTargetImage) || isGeneratingMotion} className="w-full text-white text-sm h-9" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {isGeneratingMotion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Move className="h-4 w-4 mr-2" />}Generate Motion
          </Button>
          {isGeneratingMotion && (
            <Button onClick={() => cancelGeneration("motion")} variant="outline" className="w-full mt-2 h-9 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderScaleControls()}
        <ScrollArea className="flex-1 p-4">{renderContentGallery(generatedMotions, "motion", isGeneratingMotion, motionProgress, motionProgressLabel)}</ScrollArea>
      </div>
    </div>
  );

  // ============ LIPSYNC PANEL ============
  const renderLipsyncPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
        <p className="text-sm font-semibold text-white/80">Lipsync</p>
        <p className="text-[10px] text-white/30">Sync lip movements to audio on any video</p>

        {/* Audio source toggle — moved to top */}
        <div>
          <p className="text-[10px] text-white/40 font-medium mb-1.5">Audio Source</p>
          <div className="flex gap-1.5 mb-2">
            <button onClick={() => { setLipsyncAudioSource("voicenote"); setLipsyncAudio(null); setLipsyncAudioName(""); }}
              className={`flex-1 px-3 py-2 rounded-lg text-[10px] border transition-all text-center ${lipsyncAudioSource === "voicenote" ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
              <Music className="h-3 w-3 mx-auto mb-0.5" />
              <span className="block font-medium">Use Voice Note</span>
              <span className="block text-[8px] text-white/20">Select from generated audios</span>
            </button>
            <button onClick={() => { setLipsyncAudioSource("voice"); setLipsyncAudio(null); setLipsyncAudioName(""); }}
              className={`flex-1 px-3 py-2 rounded-lg text-[10px] border transition-all text-center ${lipsyncAudioSource === "voice" ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
              <Mic className="h-3 w-3 mx-auto mb-0.5" />
              <span className="block font-medium">Use Created Voice</span>
              <span className="block text-[8px] text-white/20">TTS with your cloned voice</span>
            </button>
          </div>

          {lipsyncAudioSource === "voicenote" ? (
            <>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[50px]" onClick={() => lipsyncAudioInputRef.current?.click()}>
                {lipsyncAudio ? <div className="flex items-center gap-2"><Music className="h-4 w-4 text-emerald-400" /><span className="text-[11px] text-white/60 truncate max-w-[200px]">{lipsyncAudioName}</span><button onClick={(e) => { e.stopPropagation(); setLipsyncAudio(null); setLipsyncAudioName(""); }}><X className="h-3 w-3 text-white/30 hover:text-red-400" /></button></div>
                  : <><Volume2 className="h-4 w-4 text-white/20" /><p className="text-[9px] text-white/30">MP3, WAV, M4A — upload or select below</p></>}
              </div>
              <input ref={lipsyncAudioInputRef} type="file" accept="audio/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { setLipsyncAudio(url); setLipsyncAudioName(f.name); } if (lipsyncAudioInputRef.current) lipsyncAudioInputRef.current.value = ""; }} />
              {generatedAudios.length > 0 && (
                <Select onValueChange={v => { const aud = generatedAudios.find(x => x.id === v); if (aud) { setLipsyncAudio(aud.url); setLipsyncAudioName(aud.prompt?.slice(0, 30) || aud.metadata?.voice || "Generated audio"); } }}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Select generated audio..." /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedAudios.map(a => <SelectItem key={a.id} value={a.id} className="text-white text-[10px]">{a.prompt?.slice(0, 40) || a.metadata?.voice || "Untitled"}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </>
          ) : (
            <>
              {voices.length > 0 ? (
                <Select value={lipsyncTtsVoice} onValueChange={setLipsyncTtsVoice}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-[10px]"><SelectValue placeholder="Select a cloned voice..." /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">
                    {voices.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <button onClick={() => setMode("audio")} className="text-[10px] text-accent/60 hover:text-accent underline w-full text-center py-2">Create a voice first in Audio tab</button>
              )}
              {lipsyncAudio && <div className="mt-1.5 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg p-2"><Music className="h-3 w-3 text-emerald-400" /><span className="text-[10px] text-white/50 truncate flex-1">{lipsyncAudioName}</span><button onClick={() => { setLipsyncAudio(null); setLipsyncAudioName(""); }}><X className="h-3 w-3 text-white/30 hover:text-red-400" /></button></div>}
            </>
          )}
        </div>

        {/* Main TTS text input — always visible, used by both audio sources */}
        <Textarea value={lipsyncPrompt} onChange={e => setLipsyncPrompt(e.target.value)} placeholder="Type what the voice should say / describe the scene... (optional)" className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] resize-none placeholder:text-white/20" />

        {/* Voice mode hint */}
        {lipsyncAudioSource === "voice" && lipsyncTtsVoice && voices.length > 0 && (
          <p className="text-[9px] text-white/30 italic">Voice audio will be generated automatically when you click Generate Lipsync</p>
        )}

        {/* Video upload */}
        <div>
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-white/40 font-medium flex items-center gap-1"><Video className="h-3 w-3" /> Video</p><span className="text-[9px] text-white/20">Upload</span></div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[70px]" onClick={() => lipsyncVideoInputRef.current?.click()}>
            {lipsyncVideo ? <div className="flex items-center gap-2"><Video className="h-4 w-4 text-accent" /><span className="text-[11px] text-white/60 truncate max-w-[200px]">{lipsyncVideoName}</span><button onClick={(e) => { e.stopPropagation(); setLipsyncVideo(null); setLipsyncVideoName(""); }}><X className="h-3 w-3 text-white/30 hover:text-red-400" /></button></div>
              : <><Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Drag your video here or click to select</p><p className="text-[8px] text-white/15">MP4, MOV, WEBM up to 50MB</p></>}
          </div>
          <input ref={lipsyncVideoInputRef} type="file" accept="video/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { setLipsyncVideo(url); setLipsyncVideoName(f.name); } if (lipsyncVideoInputRef.current) lipsyncVideoInputRef.current.value = ""; }} />
          {generatedVideos.length > 0 && <Select onValueChange={v => { const vid = generatedVideos.find(x => x.id === v); if (vid) { setLipsyncVideo(vid.url); setLipsyncVideoName(vid.prompt?.slice(0, 30) || "Generated video"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated video..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedVideos.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
        </div>

        {/* Quality selector */}
        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Output Quality</p>
          <div className="flex gap-1.5">
            {[{ id: "highest", label: "Highest", desc: "Full res" }, { id: "high", label: "High", desc: "Default" }, { id: "medium", label: "Medium", desc: "Faster" }, { id: "low", label: "Low", desc: "Fastest" }].map(q => (
              <button key={q.id} onClick={() => setLipsyncQuality(q.id)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all text-center ${lipsyncQuality === q.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                <span className="block font-medium">{q.label}</span>
                <span className="block text-[8px] text-white/20">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-shorten option */}
        <div className="flex items-center gap-2 px-1">
          <Switch defaultChecked={true} />
          <span className="text-[10px] text-white/40">Auto-shorten video to match audio length</span>
        </div>

        <div className="mt-auto">
          <Button onClick={generateLipsync} disabled={!lipsyncVideo || isGeneratingLipsync || (lipsyncAudioSource === "voicenote" && !lipsyncAudio) || (lipsyncAudioSource === "voice" && (!lipsyncTtsVoice || !lipsyncPrompt.trim()))} className="w-full text-white text-sm h-9" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {isGeneratingLipsync ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}Generate Lipsync
          </Button>
          {isGeneratingLipsync && (
            <Button onClick={() => cancelGeneration("lipsync")} variant="outline" className="w-full mt-2 h-9 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderScaleControls()}
        <ScrollArea className="flex-1 p-4">{renderContentGallery(generatedLipsyncs, "lipsync", isGeneratingLipsync, lipsyncProgress, lipsyncProgressLabel)}</ScrollArea>
      </div>
    </div>
  );

  // ============ FACESWAP PANEL ============
  const renderFaceswapPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[400px] border-r border-white/[0.06] p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
        <p className="text-sm font-semibold text-white/80">Face Swap</p>
        <p className="text-[10px] text-white/30">Swap faces between images seamlessly using AI face detection</p>

        {/* Category toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Target type:</span>
          {(["video", "image"] as const).map(t => (
            <button key={t} onClick={() => setFaceswapCategory(t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] border transition-all ${faceswapCategory === t ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
              {t === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Source face */}
        <div>
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-white/40 font-medium">Source Face (Image)</p>{faceswapSource && <button onClick={() => { setFaceswapSource(null); setFaceswapSourceName(""); }} className="text-[9px] text-red-400/60 hover:text-red-400">Clear</button>}</div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[70px]" onClick={() => faceswapSourceInputRef.current?.click()}>
            {faceswapSource ? <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /><span className="text-[11px] text-white/60 truncate max-w-[200px]">{faceswapSourceName}</span></div>
              : <><Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Upload face image</p><p className="text-[8px] text-white/15">Clear front-facing photo for best results</p></>}
          </div>
          <input ref={faceswapSourceInputRef} type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { setFaceswapSource(url); setFaceswapSourceName(f.name); } if (faceswapSourceInputRef.current) faceswapSourceInputRef.current.value = ""; }} />
          {generatedImages.length > 0 && <Select onValueChange={v => { const img = generatedImages.find(x => x.id === v); if (img) { setFaceswapSource(img.url); setFaceswapSourceName(img.prompt?.slice(0, 30) || "Generated image"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated image..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedImages.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
        </div>

        {/* Target */}
        <div>
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-white/40 font-medium">Target {faceswapCategory === "video" ? "Video" : "Image"}</p>{faceswapTarget && <button onClick={() => { setFaceswapTarget(null); setFaceswapTargetName(""); }} className="text-[9px] text-red-400/60 hover:text-red-400">Clear</button>}</div>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[70px]" onClick={() => faceswapTargetInputRef.current?.click()}>
            {faceswapTarget ? <div className="flex items-center gap-2">{faceswapCategory === "video" ? <Video className="h-4 w-4 text-accent" /> : <ImageIcon className="h-4 w-4 text-accent" />}<span className="text-[11px] text-white/60 truncate max-w-[200px]">{faceswapTargetName}</span></div>
              : <><Upload className="h-5 w-5 text-white/20" /><p className="text-[10px] text-white/30">Upload target {faceswapCategory}</p></>}
          </div>
          <input ref={faceswapTargetInputRef} type="file" accept={faceswapCategory === "video" ? "video/*" : "image/*"} className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { setFaceswapTarget(url); setFaceswapTargetName(f.name); } if (faceswapTargetInputRef.current) faceswapTargetInputRef.current.value = ""; }} />
          {faceswapCategory === "video" && generatedVideos.length > 0 && <Select onValueChange={v => { const vid = generatedVideos.find(x => x.id === v); if (vid) { setFaceswapTarget(vid.url); setFaceswapTargetName(vid.prompt?.slice(0, 30) || "Generated video"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated video..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedVideos.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
          {faceswapCategory === "image" && generatedImages.length > 0 && <Select onValueChange={v => { const img = generatedImages.find(x => x.id === v); if (img) { setFaceswapTarget(img.url); setFaceswapTargetName(img.prompt?.slice(0, 30) || "Generated image"); } }}><SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] mt-1.5"><SelectValue placeholder="Or select generated image..." /></SelectTrigger><SelectContent className="bg-[hsl(220,40%,10%)] border-white/10 max-h-[150px]">{generatedImages.map(v => <SelectItem key={v.id} value={v.id} className="text-white text-[10px]">{v.prompt?.slice(0, 40) || "Untitled"}</SelectItem>)}</SelectContent></Select>}
        </div>

        {/* Quality selector */}
        <div>
          <p className="text-[10px] text-white/40 mb-1.5 font-medium">Output Quality</p>
          <div className="flex gap-1.5">
            {[{ id: "highest", label: "Highest", desc: "Best detail" }, { id: "high", label: "High", desc: "Default" }, { id: "medium", label: "Medium", desc: "Faster" }, { id: "low", label: "Low", desc: "Fastest" }].map(q => (
              <button key={q.id} onClick={() => setFaceswapQuality(q.id)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all text-center ${faceswapQuality === q.id ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/30 hover:text-white/50"}`}>
                <span className="block font-medium">{q.label}</span>
                <span className="block text-[8px] text-white/20">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <Button onClick={generateFaceswap} disabled={!faceswapSource || !faceswapTarget || isGeneratingFaceswap} className="w-full text-white text-sm h-9" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {isGeneratingFaceswap ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}Generate Face Swap
          </Button>
          {isGeneratingFaceswap && (
            <Button onClick={() => cancelGeneration("faceswap")} variant="outline" className="w-full mt-2 h-9 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderScaleControls()}
        <ScrollArea className="flex-1 p-4">{renderContentGallery(generatedFaceswaps, "faceswap", isGeneratingFaceswap, faceswapProgress, faceswapProgressLabel)}</ScrollArea>
      </div>
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
            <p className="text-white/20 text-sm mb-8 max-w-md">{freeWillMode ? "Free Will mode — no limits, no restrictions, ask anything." : "Unfiltered. Uncensored. Ask anything."}</p>
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
            placeholder={freeWillMode ? "Anything goes — fully uncensored..." : "Ask anything..."} className="bg-white/5 border-white/10 text-white text-sm min-h-[44px] max-h-[140px] resize-none placeholder:text-white/20" rows={1} />
          <button onClick={() => setFreeWillMode(!freeWillMode)} className={`h-11 w-11 p-0 shrink-0 flex items-center justify-center rounded-md transition-all ${freeWillMode ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-white/30 hover:text-white/50 hover:bg-white/5 border border-transparent"}`} title={freeWillMode ? "Free Will ON" : "Free Will OFF"}>
            <Wand2 className="h-4 w-4" />
          </button>
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
        <div className="w-36 shrink-0 flex flex-col">
          <Button size="sm" onClick={() => { setActiveConvoId(null); setMessages([]); setInput(""); setAttachments([]); clearDraft(); }}
            className="w-full bg-accent hover:bg-accent/90 text-white text-[11px] mb-2 h-7 px-2">
            <Plus className="h-3 w-3 mr-1" /> New Conversation
          </Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {conversations.map(c => (
                <div key={c.id} className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all text-[11px] group ${activeConvoId === c.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`} onClick={() => selectConvo(c)}>
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteConvo(c.id); }} className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400"><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <label className="text-[9px] text-white/30 mb-1 block">Focus on creator</label>
            <Select value={contextAccount} onValueChange={setContextAccount}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[11px]"><SelectValue placeholder="All creators" /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                <SelectItem value="all" className="text-white text-[11px]">All creators</SelectItem>
                {accounts.map(a => (<SelectItem key={a.id} value={a.id} className="text-white text-[11px]">{a.display_name || a.username}</SelectItem>))}
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
              <CreditCostBadge cost={getModeCreditLabel(mode)} variant="header" label="per action" />
              {mode === "chat" && freeWillMode && <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]"><Wand2 className="h-3 w-3 mr-1" /> Free Will</Badge>}
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
          {mode === "motion" && renderMotionPanel()}
          {mode === "lipsync" && renderLipsyncPanel()}
          {mode === "faceswap" && renderFaceswapPanel()}
          {mode === "chat" && renderChatPanel()}
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
              <Button variant="ghost" onClick={resetVoiceParams} className="flex-1 bg-white/[0.06] border border-white/10 text-white hover:text-white hover:bg-white/10 h-10">
                <Undo2 className="h-4 w-4 mr-2" /> Revert to Default
              </Button>
              <Button onClick={() => { setShowVoiceEditor(false); toast.success("Parameters saved & applied"); }} className="flex-1 bg-accent hover:bg-accent/90 text-white h-10">
                Save & Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <InsufficientCreditsModal
        open={insufficientModal.open}
        onClose={closeInsufficientModal}
        requiredCredits={insufficientModal.requiredCredits}
        actionName={insufficientModal.actionName}
      />
    </>
  );
};

export default AICoPilot;

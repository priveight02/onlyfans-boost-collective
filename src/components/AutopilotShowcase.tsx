import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  BarChart3, MessageSquare, Users, Zap, TrendingUp,
  Send, Bot, CheckCircle2, Sparkles, Calendar,
  Image, Mic, Video, FileText, UserPlus, PenTool,
  Instagram, Hash, Play, ChevronRight,
  Globe, Shield, Brain, Wand2,
  Megaphone, Eye, Star, Palette,
  Camera, Volume2, Type, Headphones, Film,
  Clock, Search, Bell, LayoutDashboard, Settings
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CursorAction {
  x: number;
  y: number;
  delay: number;
  click?: boolean;
  label?: string;
  pause?: number; // extra dwell time before moving on
}

interface Scene {
  id: string;
  title: string;
  subtitle: string;
  sidebarActive: number;
  cursor: CursorAction[];
  duration: number;
}

/* ------------------------------------------------------------------ */
/*  Scenes — cursor first clicks the sidebar icon, then does actions   */
/* ------------------------------------------------------------------ */

// Sidebar icon positions (% from top of the app area, roughly):
// icon 0 → ~18%, icon 1 → ~26%, icon 2 → ~34%, icon 3 → ~42%, icon 4 → ~50%, icon 5 → ~58%
// sidebar x ≈ 4%

const scenes: Scene[] = [
  {
    id: "copilot",
    title: "AI Copilot",
    subtitle: "Your unrestricted AI command center — chat, execute, automate",
    sidebarActive: 0,
    duration: 7000,
    cursor: [
      { x: 4, y: 20, delay: 0, click: true, label: "AI Copilot" },
      { x: 50, y: 82, delay: 1200, label: "Typing prompt..." },
      { x: 88, y: 82, delay: 2800, click: true, label: "Send" },
      { x: 55, y: 42, delay: 3800, label: "AI processing..." },
      { x: 62, y: 58, delay: 5200, click: true, label: "Execute all" },
      { x: 45, y: 68, delay: 6200, click: true, label: "View results" },
    ],
  },
  {
    id: "content-studio",
    title: "AI Content Studio",
    subtitle: "Generate images, videos, audio & ad creatives from text",
    sidebarActive: 1,
    duration: 8000,
    cursor: [
      { x: 4, y: 28, delay: 0, click: true, label: "Content Studio" },
      { x: 25, y: 26, delay: 1200, click: true, label: "Image Gen" },
      { x: 50, y: 42, delay: 2200, label: "Typing prompt..." },
      { x: 82, y: 42, delay: 3400, click: true, label: "Generate" },
      { x: 50, y: 55, delay: 4600, label: "Rendering 3 images..." },
      { x: 38, y: 26, delay: 5800, click: true, label: "Video Gen" },
      { x: 50, y: 50, delay: 6600, label: "Creating video..." },
      { x: 52, y: 26, delay: 7400, click: true, label: "Audio Gen" },
    ],
  },
  {
    id: "social",
    title: "Social Media Hub",
    subtitle: "Create, schedule & publish across all platforms",
    sidebarActive: 2,
    duration: 6500,
    cursor: [
      { x: 4, y: 36, delay: 0, click: true, label: "Social Hub" },
      { x: 25, y: 25, delay: 1000, click: true, label: "Instagram" },
      { x: 80, y: 25, delay: 1800, click: true, label: "New Post" },
      { x: 50, y: 50, delay: 2800, label: "AI writing caption..." },
      { x: 72, y: 65, delay: 4200, click: true, label: "Schedule" },
      { x: 58, y: 75, delay: 5500, click: true, label: "Confirm ✓" },
    ],
  },
  {
    id: "dms",
    title: "AI Auto-Responder",
    subtitle: "Answering leads 24/7 with human-like intelligence",
    sidebarActive: 3,
    duration: 7000,
    cursor: [
      { x: 4, y: 44, delay: 0, click: true, label: "Auto-DM" },
      { x: 20, y: 32, delay: 1200, click: true, label: "New message" },
      { x: 60, y: 48, delay: 2200, label: "AI analyzing intent..." },
      { x: 60, y: 58, delay: 3800, label: "Reply sent ✓" },
      { x: 20, y: 42, delay: 4800, click: true, label: "Next lead" },
      { x: 60, y: 48, delay: 5600, label: "AI composing..." },
      { x: 60, y: 58, delay: 6400, label: "Reply sent ✓" },
    ],
  },
  {
    id: "ad-creatives",
    title: "Ad Creative Engine",
    subtitle: "AI-powered ad copy, visuals & campaign optimization",
    sidebarActive: 4,
    duration: 7000,
    cursor: [
      { x: 4, y: 52, delay: 0, click: true, label: "Ad Engine" },
      { x: 35, y: 30, delay: 1200, click: true, label: "New campaign" },
      { x: 50, y: 45, delay: 2200, label: "AI generating creatives..." },
      { x: 30, y: 55, delay: 3800, click: true, label: "Select variant A" },
      { x: 78, y: 72, delay: 5000, click: true, label: "Launch campaign" },
      { x: 50, y: 60, delay: 6200, label: "Campaign live ✓" },
    ],
  },
  {
    id: "team",
    title: "Team Management",
    subtitle: "Add members, assign roles & monitor performance",
    sidebarActive: 5,
    duration: 6000,
    cursor: [
      { x: 4, y: 60, delay: 0, click: true, label: "Team" },
      { x: 82, y: 22, delay: 1000, click: true, label: "Add Member" },
      { x: 50, y: 42, delay: 2000, label: "Filling details..." },
      { x: 62, y: 55, delay: 3200, click: true, label: "Assign role" },
      { x: 62, y: 68, delay: 4400, click: true, label: "Save" },
    ],
  },
];

const sidebarItems = [
  { icon: Brain, label: "AI Copilot" },
  { icon: Wand2, label: "Content Studio" },
  { icon: Globe, label: "Social Hub" },
  { icon: MessageSquare, label: "Auto-DM" },
  { icon: Megaphone, label: "Ad Engine" },
  { icon: Users, label: "Team" },
];

/* ------------------------------------------------------------------ */
/*  Animated Cursor — smoother, slower movement                       */
/* ------------------------------------------------------------------ */

const AnimatedCursor = ({ actions, sceneKey }: { actions: CursorAction[]; sceneKey: string }) => {
  const [idx, setIdx] = useState(0);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    setIdx(0);
    setClicking(false);
  }, [sceneKey]);

  useEffect(() => {
    if (idx >= actions.length) return;
    const next = idx + 1 < actions.length ? actions[idx + 1] : null;
    if (!next) return;
    const timer = setTimeout(() => {
      if (next.click) {
        setClicking(true);
        setTimeout(() => setClicking(false), 250);
      }
      setIdx(idx + 1);
    }, next.delay - actions[idx].delay);
    return () => clearTimeout(timer);
  }, [idx, actions, sceneKey]);

  const pos = actions[Math.min(idx, actions.length - 1)];

  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ type: "spring", stiffness: 50, damping: 18, mass: 1.2 }}
    >
      {/* Cursor SVG */}
      <motion.svg
        width="22" height="22" viewBox="0 0 24 24" fill="none"
        animate={{ scale: clicking ? 0.75 : 1, rotate: clicking ? -8 : 0 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.6))' }}
      >
        <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="hsl(215, 25%, 90%)" strokeWidth="0.5" />
      </motion.svg>
      {/* Click ripple */}
      <AnimatePresence>
        {clicking && (
          <motion.div
            key={`click-${idx}-${sceneKey}`}
            className="absolute top-0 left-0 w-10 h-10 -ml-3 -mt-3 rounded-full"
            style={{ border: '2px solid rgba(139,92,246,0.6)' }}
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      {/* Label pill */}
      {pos.label && (
        <motion.div
          key={`label-${idx}-${sceneKey}`}
          className="absolute left-6 top-1 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-medium text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.92), rgba(79,70,229,0.88))',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
          initial={{ opacity: 0, x: -8, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
        >
          {pos.label}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene Panels                                                      */
/* ------------------------------------------------------------------ */

const CopilotPanel = ({ progress }: { progress: number }) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center gap-2 mb-3">
      <Brain className="w-4 h-4 text-purple-400" />
      <span className="text-white/80 text-sm font-semibold">Uplyze AI Copilot</span>
      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Free Will ON</span>
    </div>
    {/* Copilot sub-tabs */}
    <div className="flex gap-1.5 mb-3">
      {["Chat", "Tasks", "Insights", "Media"].map((t, i) => (
        <div key={i} className={`px-2 py-1 rounded-md text-[9px] font-medium ${i === 0 ? 'text-purple-300 bg-purple-500/15 border border-purple-500/20' : 'text-white/30 border border-transparent'}`}>{t}</div>
      ))}
    </div>
    <div className="flex-1 space-y-2.5 overflow-hidden">
      <div className="flex gap-2">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0 mt-0.5" />
        <div className="px-3 py-2 rounded-lg rounded-tl-none text-[11px] text-white/70 max-w-[82%]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Scan all accounts, find underperforming content, generate new creatives, schedule them, and re-engage 800+ cold leads via DM
        </div>
      </div>
      <motion.div className="flex gap-2 justify-end" animate={{ opacity: progress > 0.2 ? 1 : 0 }} transition={{ duration: 0.4 }}>
        <div className="px-3 py-2 rounded-lg rounded-tr-none text-[11px] text-white/80 max-w-[88%]" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bot className="w-3 h-3 text-purple-400" />
            <span className="text-purple-400 text-[10px] font-semibold">Uplyze AI</span>
            <span className="text-white/20 text-[8px] ml-1">thinking...</span>
          </div>
          {progress > 0.28 && <p className="leading-relaxed">✅ Scanned 5 accounts — 23 underperforming posts identified</p>}
          {progress > 0.38 && <p className="mt-0.5 leading-relaxed">✅ Generated 12 image creatives + 4 video reels</p>}
          {progress > 0.48 && <p className="mt-0.5 leading-relaxed">✅ 3 AI voiceovers produced (ElevenLabs)</p>}
          {progress > 0.58 && <p className="mt-0.5 leading-relaxed">✅ Scheduled 16 posts — optimal engagement windows</p>}
          {progress > 0.68 && <p className="mt-0.5 leading-relaxed">✅ DM re-engagement campaign: 847 leads queued</p>}
          {progress > 0.78 && <p className="mt-0.5 leading-relaxed text-emerald-400/90 font-medium">✅ All 6 tasks executed autonomously — 0 manual input</p>}
        </div>
      </motion.div>
      {progress > 0.85 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex gap-1.5 flex-wrap">
          {["Generate More", "View Analytics", "Create Ad Set", "Voice Clone", "Workflow Builder"].map((a, i) => (
            <div key={i} className="px-2 py-1 rounded-md text-[9px] text-purple-300 border border-purple-500/25 hover:border-purple-500/40 transition-colors" style={{ background: 'rgba(124,58,237,0.06)' }}>{a}</div>
          ))}
        </motion.div>
      )}
    </div>
    <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-lg border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <Search className="w-3 h-3 text-white/20" />
      <motion.span
        className="text-white/25 text-[11px] flex-1"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ repeat: progress < 0.2 ? Infinity : 0, duration: 2 }}
      >
        {progress > 0.15 ? "Scan all accounts, find underperform..." : "Ask Uplyze AI anything..."}
      </motion.span>
      <Send className="w-3.5 h-3.5 text-purple-400" />
    </div>
  </div>
);

const ContentStudioPanel = ({ progress }: { progress: number }) => {
  const activeTab = progress < 0.7 ? 0 : progress < 0.9 ? 1 : 2;
  const tabs = [
    { icon: Image, label: "Image Gen" },
    { icon: Film, label: "Video Gen" },
    { icon: Headphones, label: "Audio Gen" },
    { icon: Palette, label: "Ad Creative" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 className="w-4 h-4 text-violet-400" />
        <span className="text-white/80 text-sm font-semibold">AI Content Studio</span>
      </div>
      <div className="flex gap-1.5">
        {tabs.map((t, i) => (
          <motion.div
            key={i}
            animate={{
              borderColor: i === activeTab ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)',
              background: i === activeTab ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
            }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px]"
          >
            <t.icon className={`w-3 h-3 ${i === activeTab ? 'text-violet-400' : 'text-white/20'}`} />
            <span className={i === activeTab ? 'text-violet-300' : 'text-white/30'}>{t.label}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div key="img" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-2.5">
            <div className="p-3 rounded-lg border border-white/8" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-3 h-3 text-white/30" />
                <span className="text-white/40 text-[10px]">Prompt</span>
              </div>
              <motion.div className="text-white/60 text-[11px] font-mono" animate={{ opacity: progress > 0.1 ? 1 : 0.3 }}>
                {progress > 0.1 ? '"Luxury lifestyle, golden hour, premium aesthetics, 4K"' : ''}
              </motion.div>
            </div>
            {progress > 0.28 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden relative border border-white/6" style={{ background: `linear-gradient(${135 + i * 25}deg, rgba(139,92,246,0.15), rgba(59,130,246,0.12), rgba(236,72,153,0.08))` }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white/15" />
                    </div>
                    {/* Loading shimmer */}
                    {progress < 0.45 && (
                      <motion.div className="absolute inset-0" animate={{ opacity: [0.05, 0.15, 0.05] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
                    )}
                    {progress > 0.45 && (
                      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute bottom-1.5 right-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
            {progress > 0.52 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>3 images generated — Ready for posts or ads</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 1 && (
          <motion.div key="vid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-2.5">
            <div className="p-3 rounded-lg border border-white/8" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Film className="w-3 h-3 text-blue-400" />
                  <span className="text-white/50 text-[10px]">Video Generation</span>
                </div>
                <span className="text-[8px] text-blue-400/50 px-1.5 py-0.5 rounded bg-blue-500/10">Runway ML</span>
              </div>
              <div className="flex gap-3">
                <div className="w-28 h-16 rounded-lg flex items-center justify-center relative overflow-hidden border border-white/6" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))' }}>
                  <Play className="w-5 h-5 text-white/25" />
                  <motion.div className="absolute bottom-0 left-0 h-1 bg-blue-500/40 rounded" animate={{ width: progress > 0.82 ? '100%' : '50%' }} transition={{ duration: 1.5 }} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-white/65 text-[10px] font-medium">Product showcase reel</div>
                  <div className="text-white/25 text-[9px]">1080×1920 • 8s • Gen-4.5</div>
                  {progress > 0.82 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-[9px] font-medium">✅ Video rendered</motion.div>}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div key="aud" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-2.5">
            <div className="p-3 rounded-lg border border-white/8" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span className="text-white/50 text-[10px]">Audio Generation</span>
                <span className="text-[8px] text-amber-400/50 ml-auto px-1.5 py-0.5 rounded bg-amber-500/10">ElevenLabs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-[2px] items-end h-8">
                  {[40, 60, 80, 45, 70, 55, 85, 65, 50, 75, 60, 90, 70, 45, 80].map((h, i) => (
                    <motion.div key={i} className="w-[3px] rounded-full bg-amber-500/35" initial={{ height: 3 }} animate={{ height: h * 0.32 }} transition={{ delay: i * 0.04, duration: 0.4 }} />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="text-white/65 text-[10px]">Voiceover for product ad</div>
                  <div className="text-white/25 text-[9px]">Premium voice • Natural tone</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Audio generated — 24s voiceover ready</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SocialPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 mb-1">
      <Globe className="w-4 h-4 text-pink-400" />
      <span className="text-white/80 text-sm font-semibold">Social Media Hub</span>
    </div>
    <div className="flex gap-1.5">
      {[
        { icon: Instagram, label: "Instagram", active: true },
        { icon: Hash, label: "TikTok", active: false },
        { icon: Globe, label: "Threads", active: false },
      ].map((p, i) => (
        <motion.div
          key={i}
          animate={{ borderColor: p.active && progress > 0.1 ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.06)' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px]"
          style={{ background: p.active ? 'rgba(236,72,153,0.08)' : 'rgba(255,255,255,0.02)' }}
        >
          <p.icon className={`w-3 h-3 ${p.active ? 'text-pink-400' : 'text-white/20'}`} />
          <span className={p.active ? 'text-pink-300' : 'text-white/30'}>{p.label}</span>
        </motion.div>
      ))}
    </div>
    {progress > 0.2 && (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg border border-white/8" style={{ background: 'rgba(255,255,255,0.025)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-[10px] uppercase tracking-wider font-medium">New Post</span>
          <PenTool className="w-3 h-3 text-purple-400" />
        </div>
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center border border-white/6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Image className="w-5 h-5 text-white/15" />
          </div>
          <div className="flex-1 space-y-1.5">
            <motion.div className="h-2 rounded bg-white/8 w-full" animate={{ width: progress > 0.4 ? '100%' : '60%' }} />
            <motion.div className="h-2 rounded bg-white/8" animate={{ width: progress > 0.4 ? '75%' : '40%' }} />
            {progress > 0.45 && (
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8 }} className="h-2 rounded" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.25), rgba(59,130,246,0.2))' }} />
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
              <span className="text-purple-400 text-[9px]">{progress > 0.45 ? "Caption generated" : "AI generating..."}</span>
            </div>
          </div>
        </div>
      </motion.div>
    )}
    {progress > 0.7 && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.05)' }}>
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-400 text-[10px]">Scheduled for Tomorrow, 9:00 AM — Optimal engagement</span>
        <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />
      </motion.div>
    )}
  </div>
);

const DMPanel = ({ progress }: { progress: number }) => (
  <div className="flex gap-3 h-full">
    <div className="w-[35%] space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-white/50 text-[10px] font-medium">12 unread</span>
      </div>
      {[
        { name: "@emma_style", msg: "Hey! I saw your latest...", time: "2m", unread: true },
        { name: "@jake_fitness", msg: "What packages do you...", time: "5m", unread: true },
        { name: "@lisa.creates", msg: "Love your content!", time: "8m", unread: false },
        { name: "@mark_tech", msg: "Interested in collab", time: "12m", unread: false },
      ].map((c, i) => (
        <motion.div
          key={i}
          animate={{ background: i === (progress > 0.65 ? 1 : 0) ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)' }}
          transition={{ duration: 0.3 }}
          className="p-1.5 rounded-lg"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-white/75 text-[10px] font-medium truncate">{c.name}</span>
                <span className="text-white/20 text-[8px]">{c.time}</span>
              </div>
              <p className="text-white/30 text-[9px] truncate">{c.msg}</p>
            </div>
            {c.unread && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
          </div>
        </motion.div>
      ))}
    </div>
    <div className="flex-1 flex flex-col border-l border-white/8 pl-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/8">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
        <span className="text-white/75 text-xs font-medium">@emma_style</span>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/15">AI responding</span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-start">
          <div className="px-2.5 py-2 rounded-lg rounded-tl-none text-[10px] text-white/55 max-w-[80%]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
            Hey! I saw your latest post and I'm obsessed 😍 Do you offer any packages?
          </div>
        </div>
        {progress > 0.35 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex justify-end">
            <div className="px-2.5 py-2 rounded-lg rounded-tr-none text-[10px] text-white/80 max-w-[80%]" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.15)' }}>
              Hey Emma! Thank you so much 💕 Yes! I have a few options — let me send you the details. Which type of content are you most interested in?
            </div>
          </motion.div>
        )}
        {progress > 0.55 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 justify-end">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-emerald-400 text-[9px]">AI replied in 1.2s • Intent: Purchase inquiry</span>
          </motion.div>
        )}
      </div>
    </div>
  </div>
);

const AdCreativesPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Megaphone className="w-4 h-4 text-orange-400" />
      <span className="text-white/80 text-sm font-semibold">Ad Creative Engine</span>
      <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/15">AI Optimized</span>
    </div>
    {progress > 0.15 && (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
        {[
          { label: "Variant A", ctr: "4.2%", score: 92, color: "from-orange-500/15 to-pink-500/10" },
          { label: "Variant B", ctr: "3.8%", score: 85, color: "from-blue-500/15 to-purple-500/10" },
          { label: "Variant C", ctr: "3.1%", score: 71, color: "from-emerald-500/15 to-teal-500/10" },
        ].map((v, i) => (
          <motion.div
            key={i}
            animate={{ borderColor: i === 0 && progress > 0.5 ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.06)' }}
            transition={{ duration: 0.3 }}
            className="p-2 rounded-lg border"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className={`w-full aspect-video rounded-md mb-2 bg-gradient-to-br ${v.color} flex items-center justify-center border border-white/4`}>
              <Eye className="w-4 h-4 text-white/15" />
            </div>
            <div className="text-white/65 text-[10px] font-medium">{v.label}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-white/30 text-[9px]">CTR: {v.ctr}</span>
              <span className={`text-[9px] ${v.score > 90 ? 'text-emerald-400' : 'text-white/30'}`}>{v.score}</span>
            </div>
            {i === 0 && progress > 0.5 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 mt-1">
                <Star className="w-2.5 h-2.5 text-orange-400" />
                <span className="text-orange-400 text-[9px]">AI Pick</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    )}
    {progress > 0.6 && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2.5 rounded-lg border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/50 text-[10px]">AI-Generated Copy</span>
          <Sparkles className="w-3 h-3 text-purple-400" />
        </div>
        <p className="text-white/60 text-[10px] italic leading-relaxed">"Transform your social presence with premium content that converts. Limited spots available — DM now 🔥"</p>
      </motion.div>
    )}
    {progress > 0.82 && (
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/15" style={{ background: 'rgba(16,185,129,0.04)' }}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-400 text-[10px]">Campaign launched — 12.4K audience • $150/day</span>
      </motion.div>
    )}
  </div>
);

const TeamPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-white/80 text-sm font-semibold">Team</span>
        <span className="text-white/30 text-[10px]">4 members</span>
      </div>
      <motion.div animate={{ scale: progress > 0.12 ? [1, 1.08, 1] : 1 }} transition={{ duration: 0.3 }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-purple-300 border border-purple-500/20" style={{ background: 'rgba(124,58,237,0.08)' }}>
        <UserPlus className="w-3 h-3" /> Add Member
      </motion.div>
    </div>
    {[
      { name: "Alex Thompson", role: "Admin", status: "Online", color: "from-violet-500 to-purple-600" },
      { name: "Sarah Chen", role: "Chatter", status: "Online", color: "from-blue-500 to-cyan-500" },
      { name: "Marcus Lee", role: "Content", status: "Away", color: "from-amber-500 to-orange-500" },
    ].map((m, i) => (
      <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] text-white font-bold`}>{m.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white/75 text-[11px] font-medium">{m.name}</div>
          <div className="text-white/30 text-[9px]">{m.role}</div>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'Online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-white/25 text-[9px]">{m.status}</span>
        </div>
      </div>
    ))}
    <AnimatePresence>
      {progress > 0.55 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="p-2 rounded-lg border border-emerald-500/15" style={{ background: 'rgba(16,185,129,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] text-white font-bold">J</div>
            <div className="flex-1">
              <div className="text-white/75 text-[11px] font-medium">Jordan Rivera</div>
              <div className="text-emerald-400 text-[9px]">Just added • Social Manager</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

const AutopilotShowcase = () => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const scene = scenes[sceneIdx];
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / scene.duration, 1);
      setProgress(p);
      if (p < 1) {
        progressRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setSceneIdx((prev) => (prev + 1) % scenes.length);
          setProgress(0);
        }, 600);
      }
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => { if (progressRef.current) cancelAnimationFrame(progressRef.current); };
  }, [sceneIdx, isVisible]);

  const scene = scenes[sceneIdx];

  const renderPanel = useCallback(() => {
    switch (scene.id) {
      case "copilot": return <CopilotPanel progress={progress} />;
      case "content-studio": return <ContentStudioPanel progress={progress} />;
      case "social": return <SocialPanel progress={progress} />;
      case "dms": return <DMPanel progress={progress} />;
      case "ad-creatives": return <AdCreativesPanel progress={progress} />;
      case "team": return <TeamPanel progress={progress} />;
      default: return null;
    }
  }, [scene.id, progress]);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, hsl(250, 80%, 60%), transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-heading tracking-tight">
            See your business run on{" "}
            <span className="bg-clip-text text-transparent pb-2" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>
              autopilot
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Watch Uplyze AI manage your entire business — from generating content to closing deals — without lifting a finger
          </p>
        </motion.div>

        {/* Scene indicator pills */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSceneIdx(i); setProgress(0); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 border ${
                i === sceneIdx
                  ? 'border-purple-500/40 text-white'
                  : 'border-white/8 text-white/35 hover:text-white/55'
              }`}
              style={{ background: i === sceneIdx ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)' }}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Browser Frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative rounded-2xl overflow-hidden border border-white/8"
          style={{ background: 'linear-gradient(180deg, hsl(222, 30%, 13%) 0%, hsl(222, 35%, 9%) 100%)', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
        >
          {/* Browser chrome */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8" style={{ background: 'hsl(222, 30%, 11%)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg border border-white/8" style={{ background: 'hsl(222, 30%, 15%)' }}>
              <Shield className="w-3 h-3 text-emerald-500/50" />
              <span className="text-white/40 text-[11px] font-mono">uplyze.ai/platform</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400/80 text-[10px] font-semibold tracking-wide">AI ACTIVE</span>
              </div>
            </div>
          </div>

          {/* App layout */}
          <div className="flex min-h-[420px] md:min-h-[480px] relative">
            <AnimatedCursor actions={scene.cursor} sceneKey={scene.id} />

            {/* Sidebar */}
            <div className="hidden md:flex flex-col w-[52px] border-r border-white/6 py-3 items-center gap-0.5" style={{ background: 'hsl(222, 30%, 10%)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="w-5 h-px bg-white/8 mb-1" />
              {sidebarItems.map((item, i) => (
                <motion.div
                  key={i}
                  animate={{
                    background: i === scene.sidebarActive ? 'rgba(124,58,237,0.18)' : 'transparent',
                  }}
                  transition={{ duration: 0.4 }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center relative ${
                    i === scene.sidebarActive ? 'text-purple-400' : 'text-white/20'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {i === scene.sidebarActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 w-[2px] h-4 rounded-r"
                      style={{ background: 'linear-gradient(180deg, #7c3aed, #3b82f6)' }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    />
                  )}
                </motion.div>
              ))}
              <div className="mt-auto">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15">
                  <Settings className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-4 md:p-5 relative overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg border border-purple-500/15" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.06), rgba(59,130,246,0.03))' }}>
                <div className="relative">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-white/55 text-[11px] flex-1">{scene.subtitle}</span>
                <div className="w-16 h-1 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #7c3aed, #3b82f6)' }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/6" style={{ background: 'hsl(222, 30%, 10%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-white/30 text-[10px]">AI Autopilot running</span>
              </div>
              <span className="text-white/15 text-[10px]">•</span>
              <span className="text-white/20 text-[10px]">23 tasks completed this hour</span>
            </div>
            <div className="flex items-center gap-1 text-purple-400/50 text-[10px]">
              {sceneIdx + 1}/{scenes.length}
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AutopilotShowcase;
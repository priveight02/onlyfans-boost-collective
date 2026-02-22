import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquare, Users, Zap, Send, CheckCircle2, Sparkles, Calendar,
  Image, UserPlus, PenTool, Instagram, Hash, Play, ChevronRight,
  Globe, Lock, Brain, Wand2, Megaphone, Eye, Star, Palette,
  Volume2, Type, Headphones, Film, Settings, ArrowRight, BarChart3, TrendingUp
} from "lucide-react";

// Static generated images — imported once, never re-generated
import adVariantA from "@/assets/showcase-ad-variant-a.png";
import adVariantB from "@/assets/showcase-ad-variant-b.png";
import adVariantC from "@/assets/showcase-ad-variant-c.png";
import socialPost from "@/assets/showcase-social-post.png";
import genDinosaur from "@/assets/showcase-gen-dinosaur.png";
import genCar from "@/assets/showcase-gen-car.png";
import genUtopia from "@/assets/showcase-gen-utopia.png";

interface CursorAction {
  x: number;
  y: number;
  delay: number;
  click?: boolean;
  label?: string;
}

interface Scene {
  id: string;
  title: string;
  subtitle: string;
  sidebarActive: number;
  cursor: CursorAction[];
  duration: number;
}

const scenes: Scene[] = [
  {
    id: "copilot",
    title: "AI Copilot",
    subtitle: "Your unrestricted AI command center — chat, execute, automate",
    sidebarActive: 0,
    duration: 8000,
    cursor: [
      { x: 3.5, y: 22, delay: 0, click: true, label: "AI Copilot" },
      { x: 85, y: 85, delay: 3500, click: true, label: "Send" },
      { x: 60, y: 62, delay: 6500, click: true, label: "Execute all" },
    ],
  },
  {
    id: "content-studio",
    title: "AI Content Studio",
    subtitle: "Generate images, videos, audio & ad creatives from text",
    sidebarActive: 1,
    duration: 9000,
    cursor: [
      { x: 3.5, y: 29, delay: 0, click: true, label: "Content Studio" },
      { x: 80, y: 38, delay: 3200, click: true, label: "Generate" },
      { x: 33, y: 18, delay: 6500, click: true, label: "Video Gen" },
      { x: 50, y: 18, delay: 8200, click: true, label: "Audio Gen" },
    ],
  },
  {
    id: "social",
    title: "Social Media Hub",
    subtitle: "Create, schedule & publish across all platforms",
    sidebarActive: 2,
    duration: 7500,
    cursor: [
      { x: 3.5, y: 36, delay: 0, click: true, label: "Social Hub" },
      { x: 78, y: 18, delay: 2000, click: true, label: "New Post" },
      { x: 70, y: 68, delay: 5500, click: true, label: "Schedule" },
    ],
  },
  {
    id: "dms",
    title: "AI Auto-Responder",
    subtitle: "Answering leads 24/7 with human-like intelligence",
    sidebarActive: 3,
    duration: 7500,
    cursor: [
      { x: 3.5, y: 43, delay: 0, click: true, label: "Auto-DM" },
      { x: 16, y: 28, delay: 1800, click: true, label: "@emma_style" },
      { x: 16, y: 38, delay: 5000, click: true, label: "@jake_fitness" },
    ],
  },
  {
    id: "ad-creatives",
    title: "Creative Maker",
    subtitle: "AI-powered ad creatives, platform integrations & campaign launcher",
    sidebarActive: 4,
    duration: 14000,
    cursor: [
      { x: 3.5, y: 50, delay: 0, click: true, label: "Ad Engine" },
      { x: 22, y: 58, delay: 2800, click: true, label: "Select variant A" },
      { x: 42, y: 18, delay: 5500, click: true, label: "Integrations" },
      { x: 62, y: 18, delay: 9500, click: true, label: "Campaigns" },
      { x: 75, y: 78, delay: 12500, click: true, label: "Launch" },
    ],
  },
  {
    id: "team",
    title: "Team Management",
    subtitle: "Add members, assign roles & monitor performance",
    sidebarActive: 5,
    duration: 6500,
    cursor: [
      { x: 3.5, y: 57, delay: 0, click: true, label: "Team" },
      { x: 82, y: 16, delay: 1500, click: true, label: "Add Member" },
      { x: 62, y: 65, delay: 5000, click: true, label: "Save" },
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
/*  Pro SVG Icons                                                      */
/* ------------------------------------------------------------------ */
const UplyzeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#ug1)" />
    <path d="M2 17l10 5 10-5" stroke="url(#ug2)" strokeWidth="2" fill="none" />
    <path d="M2 12l10 5 10-5" stroke="url(#ug3)" strokeWidth="2" fill="none" />
    <defs>
      <linearGradient id="ug1" x1="2" y1="2" x2="22" y2="12"><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#60a5fa" /></linearGradient>
      <linearGradient id="ug2" x1="2" y1="17" x2="22" y2="22"><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#60a5fa" /></linearGradient>
      <linearGradient id="ug3" x1="2" y1="12" x2="22" y2="17"><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#60a5fa" /></linearGradient>
    </defs>
  </svg>
);

const TaskCheckIcon = ({ className }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={className}>
    <rect x="1" y="1" width="14" height="14" rx="3" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.6)" strokeWidth="1.2" />
    <path d="M4.5 8L7 10.5L11.5 5.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Animated Cursor                                                    */
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
        setTimeout(() => setClicking(false), 300);
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
      transition={{ type: "spring", stiffness: 30, damping: 22, mass: 1.6 }}
    >
      <motion.svg
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        animate={{ scale: clicking ? 0.7 : 1, rotate: clicking ? -10 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
      >
        <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="rgba(200,200,220,0.3)" strokeWidth="0.5" />
      </motion.svg>
      <AnimatePresence>
        {clicking && (
          <motion.div
            key={`click-${idx}-${sceneKey}`}
            className="absolute top-0 left-0 w-8 h-8 -ml-2.5 -mt-2.5 rounded-full"
            style={{ border: '2px solid rgba(139,92,246,0.5)' }}
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      {pos.label && (
        <motion.div
          key={`label-${idx}-${sceneKey}`}
          className="absolute left-5 top-0.5 whitespace-nowrap px-2 py-0.5 rounded-md text-[9px] font-medium text-white/90"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.85), rgba(79,70,229,0.8))',
            boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
          }}
          initial={{ opacity: 0, x: -6, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          {pos.label}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Typing animation hook                                              */
/* ------------------------------------------------------------------ */
const useTypingText = (text: string, active: boolean, speed = 45) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, active, speed]);
  return displayed;
};

/* ------------------------------------------------------------------ */
/*  Scene Panels                                                      */
/* ------------------------------------------------------------------ */

const CopilotPanel = ({ progress }: { progress: number }) => {
  const typedPrompt = useTypingText("Scan accounts, create content, DM leads", progress > 0.1 && progress < 0.42, 40);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <UplyzeIcon />
        <span className="text-white/80 text-sm font-semibold">Uplyze AI Copilot</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Free Will ON</span>
      </div>
      <div className="flex gap-1.5 mb-3">
        {["Chat", "Tasks", "Insights", "Media"].map((t, i) => (
          <div key={i} className={`px-2 py-1 rounded-md text-[9px] font-medium ${i === 0 ? 'text-purple-300 bg-purple-500/15' : 'text-white/25'}`}>{t}</div>
        ))}
      </div>
      <div className="flex-1 space-y-2.5 overflow-hidden">
        {progress > 0.42 && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0 mt-0.5" />
            <div className="px-3 py-2 rounded-lg rounded-tl-none text-[11px] text-white/60" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Scan accounts, create content, DM leads
            </div>
          </div>
        )}
        <motion.div className="flex gap-2 justify-end" animate={{ opacity: progress > 0.48 ? 1 : 0 }} transition={{ duration: 0.5 }}>
          <div className="px-3 py-2 rounded-lg rounded-tr-none text-[11px] text-white/75 max-w-[88%]" style={{ background: 'rgba(124,58,237,0.1)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <UplyzeIcon />
              <span className="text-purple-400 text-[10px] font-semibold">Uplyze AI</span>
            </div>
            {progress > 0.52 && <p className="leading-relaxed flex items-center gap-1.5"><TaskCheckIcon /> Scanned 5 accounts, 23 underperforming posts found</p>}
            {progress > 0.58 && <p className="mt-1 leading-relaxed flex items-center gap-1.5"><TaskCheckIcon /> Generated 12 images + 4 video reels</p>}
            {progress > 0.64 && <p className="mt-1 leading-relaxed flex items-center gap-1.5"><TaskCheckIcon /> 3 AI voiceovers produced</p>}
            {progress > 0.70 && <p className="mt-1 leading-relaxed flex items-center gap-1.5"><TaskCheckIcon /> Scheduled 16 posts at optimal windows</p>}
            {progress > 0.76 && <p className="mt-1 leading-relaxed flex items-center gap-1.5"><TaskCheckIcon /> DM campaign: 847 leads queued</p>}
            {progress > 0.82 && <p className="mt-1 leading-relaxed text-emerald-400/90 font-medium flex items-center gap-1.5"><TaskCheckIcon /> All tasks executed, 0 manual input needed</p>}
          </div>
        </motion.div>
      </div>
      <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <Type className="w-3 h-3 text-white/20" />
        <span className="text-white/40 text-[11px] flex-1 font-mono">
          {typedPrompt || "Ask Uplyze AI anything..."}
          {progress > 0.1 && progress < 0.42 && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-purple-400">|</motion.span>}
        </span>
        <Send className="w-3.5 h-3.5 text-purple-400" />
      </div>
    </div>
  );
};

const ContentStudioPanel = ({ progress }: { progress: number }) => {
  const activeTab = progress < 0.68 ? 0 : progress < 0.88 ? 1 : 2;
  const typedPrompt = useTypingText("T-Rex in jungle, luxury sports car, and utopia landscape, cinematic 4K", progress > 0.08 && progress < 0.34, 35);
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
              background: i === activeTab ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
            }}
            transition={{ duration: 0.4 }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] ${i === activeTab ? 'text-violet-300' : 'text-white/25'}`}
          >
            <t.icon className={`w-3 h-3 ${i === activeTab ? 'text-violet-400' : 'text-white/20'}`} />
            <span>{t.label}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div key="img" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-2.5">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-3 h-3 text-white/25" />
                <span className="text-white/35 text-[10px]">Prompt</span>
              </div>
              <div className="text-white/55 text-[11px] font-mono min-h-[16px]">
                {typedPrompt && `"${typedPrompt}`}
                {progress > 0.08 && progress < 0.34 && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-violet-400">|</motion.span>}
                {typedPrompt && progress >= 0.34 && `"`}
              </div>
            </div>
            {progress > 0.36 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-3 gap-2">
                {[genDinosaur, genCar, genUtopia].map((src, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden relative">
                    {progress < 0.48 ? (
                      <div className="w-full h-full" style={{ background: `linear-gradient(${135 + i * 25}deg, rgba(139,92,246,0.15), rgba(59,130,246,0.12))` }}>
                        <motion.div className="absolute inset-0" animate={{ opacity: [0.05, 0.15, 0.05] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
                      </div>
                    ) : (
                      <motion.img initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: i * 0.1 }} src={src} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" loading="eager" />
                    )}
                    {progress > 0.52 && (
                      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 + 0.2 }} className="absolute bottom-1 right-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow-lg" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
            {progress > 0.55 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>3 images generated from prompt, ready to use</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 1 && (
          <motion.div key="vid" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-2.5">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Film className="w-3 h-3 text-blue-400" />
                  <span className="text-white/45 text-[10px]">Video Generation</span>
                </div>
                <span className="text-[8px] text-blue-400/50 px-1.5 py-0.5 rounded bg-blue-500/10">Runway ML</span>
              </div>
              <div className="flex gap-3">
                <div className="w-28 h-16 rounded-lg overflow-hidden relative">
                  <img src={genDinosaur} alt="Video preview" className="w-full h-full object-cover opacity-70" loading="eager" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/70" />
                  </div>
                  <motion.div className="absolute bottom-0 left-0 h-1 bg-blue-500/50 rounded" animate={{ width: ['0%', '100%'] }} transition={{ duration: 3, ease: "linear" }} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-white/60 text-[10px] font-medium">Dinosaur animation reel</div>
                  <div className="text-white/20 text-[9px]">1080×1920 • 8s</div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-emerald-400 text-[9px] font-medium flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Video rendered</motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div key="aud" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-2.5">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span className="text-white/45 text-[10px]">Audio Generation</span>
                <span className="text-[8px] text-amber-400/50 ml-auto px-1.5 py-0.5 rounded bg-amber-500/10">ElevenLabs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-[2px] items-end h-8">
                  {[40, 60, 80, 45, 70, 55, 85, 65, 50, 75, 60, 90, 70, 45, 80].map((h, i) => (
                    <motion.div key={i} className="w-[3px] rounded-full bg-amber-500/35" initial={{ height: 3 }} animate={{ height: h * 0.32 }} transition={{ delay: i * 0.04, duration: 0.4 }} />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="text-white/60 text-[10px]">Voiceover for product ad</div>
                  <div className="text-white/20 text-[9px]">Premium voice • Natural tone</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Audio generated, 24s voiceover ready</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SocialPanel = ({ progress }: { progress: number }) => {
  const typedCaption = useTypingText("New drop alert. Premium sound, completely redefined. Link in bio 🔥", progress > 0.2 && progress < 0.7, 40);

  return (
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
          <div
            key={i}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] ${p.active ? 'text-pink-300 bg-pink-500/10' : 'text-white/25 bg-white/[0.02]'}`}
          >
            <p.icon className={`w-3 h-3 ${p.active ? 'text-pink-400' : 'text-white/20'}`} />
            <span>{p.label}</span>
          </div>
        ))}
      </div>
      {progress > 0.15 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/45 text-[10px] uppercase tracking-wider font-medium">New Post</span>
            <PenTool className="w-3 h-3 text-purple-400" />
          </div>
          <div className="flex gap-3">
            <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
              <img src={socialPost} alt="Post preview" className="w-full h-full object-cover" loading="eager" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="text-white/50 text-[11px] font-mono min-h-[32px]">
                {typedCaption}
                {progress > 0.2 && progress < 0.7 && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-pink-400">|</motion.span>}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                <span className="text-purple-400 text-[9px]">{progress > 0.7 ? "Caption ready" : "AI writing..."}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {progress > 0.8 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/[0.05]">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-[10px]">Scheduled for Tomorrow, 9:00 AM</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />
        </motion.div>
      )}
    </div>
  );
};

const DMPanel = ({ progress }: { progress: number }) => {
  const activeConvo = progress > 0.65 ? 1 : 0;

  return (
    <div className="flex gap-3 h-full">
      <div className="w-[35%] space-y-1">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-white/45 text-[10px] font-medium">12 unread</span>
        </div>
        {[
          { name: "@emma_style", msg: "Hey! I saw your latest...", time: "2m", unread: true },
          { name: "@jake_fitness", msg: "What packages do you...", time: "5m", unread: true },
          { name: "@lisa.creates", msg: "Love your content!", time: "8m", unread: false },
          { name: "@mark_tech", msg: "Interested in collab", time: "12m", unread: false },
        ].map((c, i) => (
          <motion.div
            key={i}
            animate={{ background: i === activeConvo ? 'rgba(124,58,237,0.1)' : 'transparent' }}
            transition={{ duration: 0.4 }}
            className="p-1.5 rounded-lg"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-[10px] font-medium truncate">{c.name}</span>
                  <span className="text-white/15 text-[8px]">{c.time}</span>
                </div>
                <p className="text-white/25 text-[9px] truncate">{c.msg}</p>
              </div>
              {c.unread && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex-1 flex flex-col border-l border-white/[0.06] pl-3">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          <span className="text-white/70 text-xs font-medium">{activeConvo === 0 ? "@emma_style" : "@jake_fitness"}</span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300">AI responding</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-start">
            <div className="px-2.5 py-2 rounded-lg rounded-tl-none text-[10px] text-white/50 max-w-[80%]" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {activeConvo === 0 ? "Hey! I saw your latest post and I'm obsessed 😍 Do you offer any packages?" : "What packages do you have? Looking for monthly content."}
            </div>
          </div>
          {((activeConvo === 0 && progress > 0.35) || (activeConvo === 1 && progress > 0.8)) && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-end">
              <div className="px-2.5 py-2 rounded-lg rounded-tr-none text-[10px] text-white/75 max-w-[80%]" style={{ background: 'rgba(124,58,237,0.1)' }}>
                {activeConvo === 0 ? "Hey Emma! Thank you so much 💕 Yes, I have a few options. Let me send you the details." : "Hey! Great timing 🔥 I have 3 monthly packages. Let me share the options!"}
              </div>
            </motion.div>
          )}
          {((activeConvo === 0 && progress > 0.5) || (activeConvo === 1 && progress > 0.9)) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 justify-end">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400 text-[9px]">AI replied in 1.2s • Intent: Purchase inquiry</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetaLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
  </svg>
);
const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const TikTokLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.53V6.84a4.84 4.84 0 01-1-.15z" fill="#fff"/>
  </svg>
);
const ShopifyLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M15.34 3.27s-.27-.07-.73-.07c-.47 0-1.25.13-1.87.87-.55.66-.73 1.54-.73 1.54s.83.1 1.36-.44c.54-.55.97-1.9.97-1.9zm1.66 2.41s-1.05-.46-2.13.24c-.75.48-1.11 1.23-1.11 1.23s1.2.08 1.95-.48c.75-.55 1.29-1 1.29-1zM20.5 20.5L18 7.5l-2.5-.5S14.22 5.36 13.5 5c-.36-.18-.72-.17-.72-.17l-.62 15.17 8.34 2z" fill="#95BF47"/>
    <path d="M12.16 4.83s-.36-.01-.72.17c-.14.07-.3.18-.47.35L12.16 20l8.34 2-.36-1.5L12.16 4.83z" fill="#5E8E3E"/>
  </svg>
);
const SnapchatLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.14 2 5.7 4.1 5.7 8.1v1.86c-.64.1-1.2.32-1.2.72 0 .44.64.68 1.26.78-.1.54-.36 1.16-.72 1.72-.48.74-1.18 1.36-1.88 1.68-.2.08-.36.28-.36.5 0 .34.34.6.72.72.56.16 1.26.24 1.68.58.3.24.42.62.78 1.06.48.58 1.26.98 2.72.98 1.94 0 3.34-.88 3.34-.88s1.4.88 3.34.88c1.46 0 2.24-.4 2.72-.98.36-.44.48-.82.78-1.06.42-.34 1.12-.42 1.68-.58.38-.12.72-.38.72-.72 0-.22-.16-.42-.36-.5-.7-.32-1.4-.94-1.88-1.68-.36-.56-.62-1.18-.72-1.72.62-.1 1.26-.34 1.26-.78 0-.4-.56-.62-1.2-.72V8.1C18.3 4.1 15.86 2 12 2z" fill="#FFFC00"/>
  </svg>
);
const PinterestLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.425 1.808-2.425.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.481 1.806 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.134-4.515 4.34 0 .859.331 1.781.744 2.281a.3.3 0 01.069.287l-.278 1.133c-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.449 2.962.449 5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#E60023"/>
  </svg>
);

const AdCreativesPanel = ({ progress }: { progress: number }) => {
  const activeTab = progress < 0.38 ? 0 : progress < 0.68 ? 1 : 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-orange-400" />
        <span className="text-white/80 text-sm font-semibold">Creative Maker</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">AI Optimized</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[
          { icon: Image, label: "Creatives" },
          { icon: Settings, label: "Integrations" },
          { icon: BarChart3, label: "Campaigns" },
        ].map((t, i) => (
          <motion.div
            key={i}
            animate={{ background: i === activeTab ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.02)' }}
            transition={{ duration: 0.4 }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] ${i === activeTab ? 'text-orange-300' : 'text-white/25'}`}
          >
            <t.icon className={`w-3 h-3 ${i === activeTab ? 'text-orange-400' : 'text-white/20'}`} />
            <span>{t.label}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Tab 0: Creatives (original full version) */}
        {activeTab === 0 && (
          <motion.div key="creatives" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-2.5">
            {progress > 0.04 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Variant A", ctr: "4.2%", score: 92, img: adVariantA },
                  { label: "Variant B", ctr: "3.8%", score: 85, img: adVariantB },
                  { label: "Variant C", ctr: "3.1%", score: 71, img: adVariantC },
                ].map((v, i) => (
                  <motion.div
                    key={i}
                    animate={{ boxShadow: i === 0 && progress > 0.18 ? '0 0 0 1px rgba(249,115,22,0.3)' : '0 0 0 0px transparent' }}
                    transition={{ duration: 0.4 }}
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="w-full aspect-square rounded-md mb-2 overflow-hidden relative flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      {progress < 0.12 ? (
                        <div className="w-full h-full bg-gradient-to-br from-orange-500/10 to-pink-500/10">
                          <motion.div className="absolute inset-0" animate={{ opacity: [0.05, 0.12, 0.05] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                        </div>
                      ) : (
                        <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: i * 0.1 }} src={v.img} alt={v.label} className="w-full h-full object-contain" loading="eager" />
                      )}
                    </div>
                    <div className="text-white/60 text-[10px] font-medium">{v.label}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-white/25 text-[9px]">CTR: {v.ctr}</span>
                      <span className={`text-[9px] ${v.score > 90 ? 'text-emerald-400' : 'text-white/25'}`}>{v.score}</span>
                    </div>
                    {i === 0 && progress > 0.18 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 mt-1">
                        <Star className="w-2.5 h-2.5 text-orange-400" />
                        <span className="text-orange-400 text-[9px]">AI Pick</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
            {progress > 0.22 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/45 text-[10px]">AI-Generated Copy</span>
                  <Sparkles className="w-3 h-3 text-purple-400" />
                </div>
                <p className="text-white/55 text-[10px] italic leading-relaxed">"Premium sound, redefined. Experience wireless freedom like never before. Shop now, limited edition 🔥"</p>
              </motion.div>
            )}
            {progress > 0.30 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/[0.04]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[10px]">3 variants scored, Variant A selected for launch</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Tab 1: Integrations with real SVG logos */}
        {activeTab === 1 && (
          <motion.div key="integrations" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-2">
            {[
              { name: "Meta Ads", desc: "Facebook & Instagram Ads", status: "Connected", logo: <MetaLogo /> },
              { name: "Google Ads", desc: "Search, Display & YouTube", status: "Connected", logo: <GoogleLogo /> },
              { name: "TikTok Ads", desc: "In-Feed & Spark Ads", status: "Connected", logo: <TikTokLogo /> },
              { name: "Shopify", desc: "Product catalog & storefront", status: "Connected", logo: <ShopifyLogo /> },
            ].map((int, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="flex items-center gap-2.5 p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  {int.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/70 text-[11px] font-medium">{int.name}</div>
                  <div className="text-white/25 text-[9px]">{int.desc}</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 text-[9px]">{int.status}</span>
                </div>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <SnapchatLogo />
                <PinterestLogo />
              </div>
              <span className="text-[10px] text-white/30">+ LinkedIn, X, Snapchat, Pinterest & more</span>
            </motion.div>
          </motion.div>
        )}

        {/* Tab 2: Campaign Creator */}
        {activeTab === 2 && (
          <motion.div key="campaigns" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-2.5">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[10px] font-medium">New Campaign</span>
                <span className="text-[8px] text-orange-400/60 px-1.5 py-0.5 rounded bg-orange-500/10">AI Assisted</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[9px] w-14">Objective</span>
                  <div className="flex-1 px-2 py-1 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.04)' }}>Conversions</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[9px] w-14">Budget</span>
                  <div className="flex-1 px-2 py-1 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.04)' }}>$150/day</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[9px] w-14">Audience</span>
                  <div className="flex-1 px-2 py-1 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.04)' }}>Lookalike 1% · 18-35 · US</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[9px] w-14">Platforms</span>
                  <div className="flex gap-1.5">
                    <MetaLogo /><GoogleLogo /><TikTokLogo />
                  </div>
                </div>
              </div>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">AI predicts 3.8x ROAS based on creative score</span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/[0.04]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Campaign launched across 3 platforms, 12.4K audience</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TeamPanel = ({ progress }: { progress: number }) => {
  const typedName = useTypingText("Jordan Rivera", progress > 0.25 && progress < 0.55, 60);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-white/80 text-sm font-semibold">Team</span>
          <span className="text-white/25 text-[10px]">4 members</span>
        </div>
        <motion.div animate={{ scale: progress > 0.18 ? [1, 1.05, 1] : 1 }} transition={{ duration: 0.3 }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-purple-300 bg-purple-500/[0.08]">
          <UserPlus className="w-3 h-3" /> Add Member
        </motion.div>
      </div>
      {[
        { name: "Alex Thompson", role: "Admin", status: "Online", color: "from-violet-500 to-purple-600" },
        { name: "Sarah Chen", role: "Chatter", status: "Online", color: "from-blue-500 to-cyan-500" },
        { name: "Marcus Lee", role: "Content", status: "Away", color: "from-amber-500 to-orange-500" },
      ].map((m, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] text-white font-bold`}>{m.name[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-white/70 text-[11px] font-medium">{m.name}</div>
            <div className="text-white/25 text-[9px]">{m.role}</div>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'Online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-white/20 text-[9px]">{m.status}</span>
          </div>
        </div>
      ))}
      {progress > 0.22 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)' }}>
          <div className="text-white/40 text-[10px] mb-2">New Member</div>
          <div className="text-white/55 text-[11px] font-mono min-h-[16px] mb-2">
            {typedName}
            {progress > 0.25 && progress < 0.55 && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-blue-400">|</motion.span>}
          </div>
          {progress > 0.6 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-[9px] flex items-center gap-1.5"><TaskCheckIcon /> Role: Social Manager, Invited</motion.div>
          )}
        </motion.div>
      )}
      <AnimatePresence>
        {progress > 0.75 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="p-2 rounded-lg bg-emerald-500/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] text-white font-bold">J</div>
              <div className="flex-1">
                <div className="text-white/70 text-[11px] font-medium">Jordan Rivera</div>
                <div className="text-emerald-400 text-[9px]">Just added, Social Manager</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
        }, 700);
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
            See how Uplyze runs your marketing, content, and sales on full autopilot so you can focus on what matters most
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSceneIdx(i); setProgress(0); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 ${
                i === sceneIdx
                  ? 'text-white bg-purple-500/15'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, hsl(222, 30%, 12%) 0%, hsl(222, 35%, 9%) 100%)', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]" style={{ background: 'hsl(222, 30%, 10%)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg" style={{ background: 'hsl(222, 30%, 14%)' }}>
              <Lock className="w-3 h-3 text-emerald-500/50" />
              <span className="text-white/35 text-[11px] font-mono">uplyze.ai/platform</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400/70 text-[10px] font-semibold tracking-wide">AI ACTIVE</span>
            </div>
          </div>

          <div className="flex min-h-[420px] md:min-h-[480px] relative">
            <AnimatedCursor actions={scene.cursor} sceneKey={scene.id} />

            <div className="hidden md:flex flex-col w-[52px] border-r border-white/[0.05] py-3 items-center gap-0.5" style={{ background: 'hsl(222, 30%, 9.5%)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze" className="w-7 h-7 object-contain" />
              </div>
              <div className="w-5 h-px bg-white/[0.06] mb-1" />
              {sidebarItems.map((item, i) => (
                <motion.div
                  key={i}
                  animate={{
                    background: i === scene.sidebarActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                  }}
                  transition={{ duration: 0.5 }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center relative ${
                    i === scene.sidebarActive ? 'text-purple-400' : 'text-white/15'
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/10">
                  <Settings className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 md:p-5 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.04)' }}>
                <div className="relative">
                  <UplyzeIcon />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-white/45 text-[11px] flex-1">{scene.subtitle}</span>
                <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.05]" style={{ background: 'hsl(222, 30%, 9.5%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-white/25 text-[10px]">AI Autopilot running</span>
              </div>
              <span className="text-white/10 text-[10px]">•</span>
              <span className="text-white/15 text-[10px]">23 tasks completed this hour</span>
            </div>
            <div className="flex items-center gap-1 text-purple-400/40 text-[10px]">
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

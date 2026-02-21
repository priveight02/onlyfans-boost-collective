import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquare, Users, Zap, Send, Bot, CheckCircle2, Sparkles, Calendar,
  Image, UserPlus, PenTool, Instagram, Hash, Play, ChevronRight,
  Globe, Shield, Brain, Wand2, Megaphone, Eye, Star, Palette,
  Volume2, Type, Headphones, Film, Settings
} from "lucide-react";

// Static generated images — imported once, never re-generated
import adVariantA from "@/assets/showcase-ad-variant-a.png";
import adVariantB from "@/assets/showcase-ad-variant-b.png";
import adVariantC from "@/assets/showcase-ad-variant-c.png";
import socialPost from "@/assets/showcase-social-post.png";
import contentGen from "@/assets/showcase-content-gen.png";

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
    title: "Ad Creative Engine",
    subtitle: "AI-powered ad copy, visuals & campaign optimization",
    sidebarActive: 4,
    duration: 7500,
    cursor: [
      { x: 3.5, y: 50, delay: 0, click: true, label: "Ad Engine" },
      { x: 22, y: 58, delay: 3500, click: true, label: "Select variant A" },
      { x: 75, y: 78, delay: 5800, click: true, label: "Launch campaign" },
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
      { x: 62, y: 65, delay: 5000, click: true, label: "Save ✓" },
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
        <Brain className="w-4 h-4 text-purple-400" />
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
              <Bot className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400 text-[10px] font-semibold">Uplyze AI</span>
            </div>
            {progress > 0.52 && <p className="leading-relaxed">✅ Scanned 5 accounts — 23 underperforming posts</p>}
            {progress > 0.58 && <p className="mt-0.5 leading-relaxed">✅ Generated 12 images + 4 video reels</p>}
            {progress > 0.64 && <p className="mt-0.5 leading-relaxed">✅ 3 AI voiceovers produced</p>}
            {progress > 0.70 && <p className="mt-0.5 leading-relaxed">✅ Scheduled 16 posts — optimal windows</p>}
            {progress > 0.76 && <p className="mt-0.5 leading-relaxed">✅ DM campaign: 847 leads queued</p>}
            {progress > 0.82 && <p className="mt-0.5 leading-relaxed text-emerald-400/90 font-medium">✅ All tasks executed — 0 manual input</p>}
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
  const typedPrompt = useTypingText("Premium headphones product shoot, studio lighting, 4K", progress > 0.08 && progress < 0.34, 35);
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
                {[adVariantA, adVariantB, adVariantC].map((src, i) => (
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
                <span>3 product images generated — Ready for posts or ads</span>
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
                  <img src={adVariantA} alt="Video preview" className="w-full h-full object-cover opacity-70" loading="eager" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/70" />
                  </div>
                  <motion.div className="absolute bottom-0 left-0 h-1 bg-blue-500/50 rounded" animate={{ width: ['0%', '100%'] }} transition={{ duration: 3, ease: "linear" }} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-white/60 text-[10px] font-medium">Product showcase reel</div>
                  <div className="text-white/20 text-[9px]">1080×1920 • 8s</div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-emerald-400 text-[9px] font-medium">✅ Video rendered</motion.div>
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
              <span>Audio generated — 24s voiceover ready</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SocialPanel = ({ progress }: { progress: number }) => {
  const typedCaption = useTypingText("✨ New drop — Premium sound, redefined.", progress > 0.2 && progress < 0.7, 45);

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
                {activeConvo === 0 ? "Hey Emma! Thank you so much 💕 Yes! I have a few options — let me send you the details." : "Hey! Great timing 🔥 I have 3 monthly packages. Let me share the options!"}
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

const AdCreativesPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Megaphone className="w-4 h-4 text-orange-400" />
      <span className="text-white/80 text-sm font-semibold">Ad Creative Engine</span>
      <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">AI Optimized</span>
    </div>
    {progress > 0.12 && (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
        {[
          { label: "Variant A", ctr: "4.2%", score: 92, img: adVariantA },
          { label: "Variant B", ctr: "3.8%", score: 85, img: adVariantB },
          { label: "Variant C", ctr: "3.1%", score: 71, img: adVariantC },
        ].map((v, i) => (
          <motion.div
            key={i}
            animate={{ boxShadow: i === 0 && progress > 0.45 ? '0 0 0 1px rgba(249,115,22,0.3)' : '0 0 0 0px transparent' }}
            transition={{ duration: 0.4 }}
            className="p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="w-full aspect-video rounded-md mb-2 overflow-hidden relative">
              {progress < 0.3 ? (
                <div className="w-full h-full bg-gradient-to-br from-orange-500/10 to-pink-500/10">
                  <motion.div className="absolute inset-0" animate={{ opacity: [0.05, 0.12, 0.05] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                </div>
              ) : (
                <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: i * 0.1 }} src={v.img} alt={v.label} className="w-full h-full object-cover" loading="eager" />
              )}
            </div>
            <div className="text-white/60 text-[10px] font-medium">{v.label}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-white/25 text-[9px]">CTR: {v.ctr}</span>
              <span className={`text-[9px] ${v.score > 90 ? 'text-emerald-400' : 'text-white/25'}`}>{v.score}</span>
            </div>
            {i === 0 && progress > 0.45 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 mt-1">
                <Star className="w-2.5 h-2.5 text-orange-400" />
                <span className="text-orange-400 text-[9px]">AI Pick</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    )}
    {progress > 0.55 && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/45 text-[10px]">AI-Generated Copy</span>
          <Sparkles className="w-3 h-3 text-purple-400" />
        </div>
        <p className="text-white/55 text-[10px] italic leading-relaxed">"Premium sound, redefined. Experience wireless freedom like never before. Shop now — limited edition 🔥"</p>
      </motion.div>
    )}
    {progress > 0.78 && (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/[0.04]">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-400 text-[10px]">Campaign launched — 12.4K audience • $150/day</span>
      </motion.div>
    )}
  </div>
);

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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-[9px]">✅ Role: Social Manager • Invited</motion.div>
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
                <div className="text-emerald-400 text-[9px]">Just added • Social Manager</div>
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
            Watch Uplyze AI manage your entire business — without lifting a finger
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
              <Shield className="w-3 h-3 text-emerald-500/50" />
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
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                <Zap className="w-3.5 h-3.5 text-white" />
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
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
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

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  BarChart3, MessageSquare, Users, Zap, TrendingUp,
  Send, Bot, CheckCircle2, Sparkles, Calendar,
  Search, Bell, LayoutDashboard, Image, Mic,
  Video, FileText, UserPlus, PenTool, Clock,
  Instagram, Hash, Heart, Play, ChevronRight,
  Globe, Shield, Brain, Target, Layers
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Scene definitions – each scene = one "screen" the cursor acts on  */
/* ------------------------------------------------------------------ */

interface CursorAction {
  x: number; // % from left
  y: number; // % from top
  delay: number; // ms before moving here
  click?: boolean;
  label?: string; // tooltip near cursor
}

interface Scene {
  id: string;
  title: string;
  subtitle: string;
  sidebarActive: number;
  cursor: CursorAction[];
  duration: number; // total ms
}

const scenes: Scene[] = [
  {
    id: "copilot",
    title: "AI Copilot",
    subtitle: "Chat, strategize & execute from one command center",
    sidebarActive: 0,
    duration: 5000,
    cursor: [
      { x: 65, y: 75, delay: 0, label: "Typing prompt..." },
      { x: 82, y: 75, delay: 1200, click: true, label: "Send" },
      { x: 65, y: 45, delay: 2200, label: "Reading AI response" },
      { x: 75, y: 55, delay: 3500, click: true, label: "Execute action" },
    ],
  },
  {
    id: "team",
    title: "Team Management",
    subtitle: "Add team members & assign roles instantly",
    sidebarActive: 1,
    duration: 4500,
    cursor: [
      { x: 82, y: 22, delay: 0, click: true, label: "Add Member" },
      { x: 55, y: 40, delay: 1000, label: "Filling details..." },
      { x: 65, y: 55, delay: 2000, click: true, label: "Assign role" },
      { x: 65, y: 70, delay: 3200, click: true, label: "Save" },
    ],
  },
  {
    id: "social",
    title: "Social Media Hub",
    subtitle: "Create & schedule content across all platforms",
    sidebarActive: 2,
    duration: 5000,
    cursor: [
      { x: 30, y: 25, delay: 0, click: true, label: "Instagram" },
      { x: 78, y: 22, delay: 800, click: true, label: "New Post" },
      { x: 55, y: 50, delay: 1800, label: "AI generating caption..." },
      { x: 75, y: 65, delay: 3000, click: true, label: "Schedule" },
      { x: 60, y: 72, delay: 4000, click: true, label: "Confirm" },
    ],
  },
  {
    id: "dms",
    title: "AI Auto-Responder",
    subtitle: "Answering leads 24/7 with human-like messages",
    sidebarActive: 3,
    duration: 5000,
    cursor: [
      { x: 25, y: 35, delay: 0, click: true, label: "New message" },
      { x: 65, y: 50, delay: 800, label: "AI composing reply..." },
      { x: 65, y: 60, delay: 2200, label: "Reply sent ✓" },
      { x: 25, y: 45, delay: 3200, click: true, label: "Next lead" },
      { x: 65, y: 50, delay: 4000, label: "AI composing reply..." },
    ],
  },
  {
    id: "pipeline",
    title: "Deal Pipeline",
    subtitle: "AI scoring leads & closing deals automatically",
    sidebarActive: 4,
    duration: 5000,
    cursor: [
      { x: 25, y: 40, delay: 0, click: true, label: "Hot lead" },
      { x: 55, y: 35, delay: 800, label: "AI analyzing..." },
      { x: 70, y: 45, delay: 2000, click: true, label: "Move to Closing" },
      { x: 80, y: 35, delay: 3200, click: true, label: "Mark Won" },
      { x: 55, y: 70, delay: 4200, label: "Revenue +$12,500" },
    ],
  },
  {
    id: "analytics",
    title: "Revenue Analytics",
    subtitle: "Real-time forecasting & performance tracking",
    sidebarActive: 5,
    duration: 4500,
    cursor: [
      { x: 35, y: 30, delay: 0, label: "Viewing metrics" },
      { x: 60, y: 25, delay: 1000, click: true, label: "This month" },
      { x: 50, y: 50, delay: 2000, label: "AI forecasting..." },
      { x: 70, y: 60, delay: 3200, click: true, label: "Export report" },
    ],
  },
];

const sidebarIcons = [Brain, Users, Globe, MessageSquare, Target, BarChart3, Layers];

/* ------------------------------------------------------------------ */
/*  Animated Cursor                                                   */
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
        setTimeout(() => setClicking(false), 200);
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
      transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.8 }}
    >
      {/* Cursor SVG */}
      <motion.svg
        width="24" height="24" viewBox="0 0 24 24" fill="none"
        animate={{ scale: clicking ? 0.8 : 1 }}
        transition={{ duration: 0.15 }}
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
      >
        <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="white" strokeWidth="1" />
      </motion.svg>
      {/* Click ripple */}
      <AnimatePresence>
        {clicking && (
          <motion.div
            key={`click-${idx}`}
            className="absolute top-0 left-0 w-8 h-8 -ml-2 -mt-2 rounded-full border-2 border-purple-400"
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
      {/* Label */}
      {pos.label && (
        <motion.div
          className="absolute left-7 top-0 whitespace-nowrap px-2 py-1 rounded text-[10px] font-medium text-white"
          style={{ background: 'rgba(124,58,237,0.85)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
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
    <div className="flex items-center gap-2 mb-4">
      <Brain className="w-4 h-4 text-purple-400" />
      <span className="text-white/80 text-sm font-semibold">AI Copilot</span>
      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Free Will ON</span>
    </div>
    <div className="flex-1 space-y-3 overflow-hidden">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0" />
        <div className="px-3 py-2 rounded-lg text-xs text-white/70 max-w-[80%]" style={{ background: 'rgba(255,255,255,0.06)' }}>
          Analyze my top 5 performing posts this month and create similar content for next week
        </div>
      </div>
      <motion.div className="flex gap-2 justify-end" animate={{ opacity: progress > 0.3 ? 1 : 0 }}>
        <div className="px-3 py-2 rounded-lg text-xs text-white/80 max-w-[85%]" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-purple-400" />
            <span className="text-purple-400 text-[10px] font-medium">Uplyze AI</span>
          </div>
          {progress > 0.4 && <p>✅ Analyzed 47 posts from the last 30 days</p>}
          {progress > 0.5 && <p className="mt-1">✅ Top themes: Behind-the-scenes, tutorials, product drops</p>}
          {progress > 0.6 && <p className="mt-1">✅ Generated 7 content ideas with captions</p>}
          {progress > 0.75 && <p className="mt-1">✅ Scheduled 5 posts for optimal engagement times</p>}
        </div>
      </motion.div>
      {progress > 0.8 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
          {["Generate Video", "Create Ad", "Voice Script"].map((a, i) => (
            <div key={i} className="px-2 py-1 rounded text-[10px] text-purple-300 border border-purple-500/30 cursor-pointer" style={{ background: 'rgba(124,58,237,0.08)' }}>{a}</div>
          ))}
        </motion.div>
      )}
    </div>
    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <span className="text-white/30 text-xs flex-1">{progress > 0.2 ? "Analyze my top 5 performing posts..." : "Ask Uplyze AI anything..."}</span>
      <Send className="w-3.5 h-3.5 text-purple-400" />
    </div>
  </div>
);

const TeamPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-white/80 text-sm font-semibold">Team</span>
        <span className="text-white/40 text-xs">4 members</span>
      </div>
      <motion.div animate={{ scale: progress > 0.15 ? [1, 1.1, 1] : 1 }} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-purple-300 border border-purple-500/30" style={{ background: 'rgba(124,58,237,0.1)' }}>
        <UserPlus className="w-3 h-3" /> Add Member
      </motion.div>
    </div>
    {[
      { name: "Alex Thompson", role: "Admin", status: "Online", color: "from-violet-500 to-purple-600" },
      { name: "Sarah Chen", role: "Chatter", status: "Online", color: "from-blue-500 to-cyan-500" },
      { name: "Marcus Lee", role: "Content", status: "Away", color: "from-amber-500 to-orange-500" },
    ].map((m, i) => (
      <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] text-white font-bold`}>{m.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white/80 text-xs font-medium">{m.name}</div>
          <div className="text-white/40 text-[10px]">{m.role}</div>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'Online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-white/30 text-[10px]">{m.status}</span>
        </div>
      </div>
    ))}
    <AnimatePresence>
      {progress > 0.5 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-2 rounded-lg border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] text-white font-bold">J</div>
            <div className="flex-1">
              <div className="text-white/80 text-xs font-medium">Jordan Rivera</div>
              <div className="text-emerald-400 text-[10px]">Just added • Social Manager</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const SocialPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 mb-1">
      <Globe className="w-4 h-4 text-pink-400" />
      <span className="text-white/80 text-sm font-semibold">Social Media Hub</span>
    </div>
    <div className="flex gap-2">
      {[
        { icon: Instagram, label: "Instagram", active: true },
        { icon: Hash, label: "TikTok", active: false },
        { icon: Globe, label: "Threads", active: false },
      ].map((p, i) => (
        <motion.div
          key={i}
          animate={{ borderColor: p.active && progress > 0.1 ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px]"
          style={{ background: p.active ? 'rgba(236,72,153,0.08)' : 'rgba(255,255,255,0.04)' }}
        >
          <p.icon className={`w-3 h-3 ${p.active ? 'text-pink-400' : 'text-white/30'}`} />
          <span className={p.active ? 'text-pink-300' : 'text-white/40'}>{p.label}</span>
        </motion.div>
      ))}
    </div>
    {progress > 0.25 && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-[10px] uppercase tracking-wider">New Post</span>
          <PenTool className="w-3 h-3 text-purple-400" />
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Image className="w-5 h-5 text-white/20" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-2 rounded bg-white/10 w-full" />
            <div className="h-2 rounded bg-white/10 w-3/4" />
            {progress > 0.5 && (
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-2 rounded" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))' }} />
            )}
            <div className="flex items-center gap-1 mt-1">
              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
              <span className="text-purple-400 text-[9px]">{progress > 0.5 ? "Caption generated" : "AI generating..."}</span>
            </div>
          </div>
        </div>
      </motion.div>
    )}
    {progress > 0.7 && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.06)' }}>
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-400 text-[10px]">Scheduled for Tomorrow, 9:00 AM — Optimal engagement time</span>
        <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />
      </motion.div>
    )}
  </div>
);

const DMPanel = ({ progress }: { progress: number }) => (
  <div className="flex gap-3 h-full">
    {/* Conversation list */}
    <div className="w-[35%] space-y-1.5">
      <div className="flex items-center gap-1 mb-2">
        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-white/60 text-[10px]">12 unread</span>
      </div>
      {[
        { name: "@emma_style", msg: "Hey! I saw your latest...", time: "2m", unread: true },
        { name: "@jake_fitness", msg: "What packages do you...", time: "5m", unread: true },
        { name: "@lisa.creates", msg: "Love your content! Can...", time: "8m", unread: false },
        { name: "@mark_tech", msg: "Interested in collab", time: "12m", unread: false },
      ].map((c, i) => (
        <motion.div
          key={i}
          animate={{ background: i === (progress > 0.6 ? 1 : 0) ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)' }}
          className="p-1.5 rounded-lg cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-[10px] font-medium truncate">{c.name}</span>
                <span className="text-white/30 text-[8px]">{c.time}</span>
              </div>
              <p className="text-white/40 text-[9px] truncate">{c.msg}</p>
            </div>
            {c.unread && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
          </div>
        </motion.div>
      ))}
    </div>
    {/* Chat area */}
    <div className="flex-1 flex flex-col border-l border-white/10 pl-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
        <span className="text-white/80 text-xs font-medium">@emma_style</span>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">AI responding</span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-start"><div className="px-2 py-1.5 rounded-lg text-[10px] text-white/60 max-w-[80%]" style={{ background: 'rgba(255,255,255,0.06)' }}>Hey! I saw your latest post and I'm obsessed 😍 Do you offer any packages?</div></div>
        {progress > 0.35 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
            <div className="px-2 py-1.5 rounded-lg text-[10px] text-white/80 max-w-[80%]" style={{ background: 'rgba(124,58,237,0.15)' }}>
              Hey Emma! Thank you so much 💕 Yes! I have a few options — let me send you the details. Which type of content are you most interested in?
            </div>
          </motion.div>
        )}
        {progress > 0.6 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 justify-end">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-emerald-400 text-[9px]">AI replied in 1.2s</span>
          </motion.div>
        )}
      </div>
    </div>
  </div>
);

const PipelinePanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Target className="w-4 h-4 text-amber-400" />
      <span className="text-white/80 text-sm font-semibold">Deal Pipeline</span>
      <span className="text-white/40 text-xs ml-auto">$127,400 total</span>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {[
        { stage: "New", count: 12, color: "border-blue-500/30", items: ["Lead #401", "Lead #402"] },
        { stage: "Qualified", count: 8, color: "border-purple-500/30", items: ["Lead #389", "Lead #391"] },
        { stage: "Closing", count: 5, color: "border-amber-500/30", items: ["Deal #287"] },
        { stage: "Won", count: 23, color: "border-emerald-500/30", items: ["Deal #284"] },
      ].map((s, i) => (
        <div key={i} className={`rounded-lg border ${s.color} p-2`} style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-[10px] font-medium">{s.stage}</span>
            <span className="text-white/30 text-[9px]">{s.count}</span>
          </div>
          {s.items.map((item, j) => (
            <motion.div
              key={j}
              animate={{
                x: i === 2 && j === 0 && progress > 0.5 ? 0 : 0,
                background: i === 2 && j === 0 && progress > 0.5 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)'
              }}
              className="px-1.5 py-1 rounded text-[9px] text-white/50 mb-1"
            >
              {item}
              {i === 2 && j === 0 && progress > 0.5 && <span className="text-emerald-400"> → Won!</span>}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
    {progress > 0.7 && (
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.06)' }}>
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-400 text-[10px]">Deal #287 closed — Revenue +$12,500</span>
        <span className="text-white/30 text-[9px] ml-auto">Just now</span>
      </motion.div>
    )}
  </div>
);

const AnalyticsPanel = ({ progress }: { progress: number }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <BarChart3 className="w-4 h-4 text-cyan-400" />
      <span className="text-white/80 text-sm font-semibold">Revenue Analytics</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Revenue", value: "$48,750", change: "+23%", positive: true },
        { label: "Leads", value: "2,847", change: "+34%", positive: true },
        { label: "Conversion", value: "12.8%", change: "+2.1%", positive: true },
      ].map((m, i) => (
        <div key={i} className="p-2 rounded-lg border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-white/40 text-[9px] uppercase">{m.label}</div>
          <div className="text-white text-sm font-bold mt-0.5">{m.value}</div>
          <div className="text-emerald-400 text-[9px]">{m.change}</div>
        </div>
      ))}
    </div>
    {/* Chart visualization */}
    <div className="rounded-lg border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-end gap-1 h-20">
        {[30, 45, 35, 60, 50, 75, 55, 85, 65, 90, 70, 95].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t"
            initial={{ height: '10%' }}
            animate={{ height: progress > 0.2 ? `${h}%` : '10%' }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
            style={{ background: `linear-gradient(to top, rgba(124,58,237,${0.3 + h/200}), rgba(59,130,246,${0.2 + h/300}))` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-white/20 text-[8px]">Jan</span>
        <span className="text-white/20 text-[8px]">Jun</span>
        <span className="text-white/20 text-[8px]">Dec</span>
      </div>
    </div>
    {progress > 0.6 && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.08)' }}>
        <Sparkles className="w-3 h-3 text-purple-400" />
        <span className="text-purple-300 text-[10px]">AI Forecast: Revenue projected to hit $72K next month (+47%)</span>
      </motion.div>
    )}
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

  // Scene cycling
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
        }, 400);
      }
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => { if (progressRef.current) cancelAnimationFrame(progressRef.current); };
  }, [sceneIdx, isVisible]);

  const scene = scenes[sceneIdx];

  const renderPanel = useCallback(() => {
    switch (scene.id) {
      case "copilot": return <CopilotPanel progress={progress} />;
      case "team": return <TeamPanel progress={progress} />;
      case "social": return <SocialPanel progress={progress} />;
      case "dms": return <DMPanel progress={progress} />;
      case "pipeline": return <PipelinePanel progress={progress} />;
      case "analytics": return <AnalyticsPanel progress={progress} />;
      default: return null;
    }
  }, [scene.id, progress]);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, hsl(250, 80%, 60%), transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
            Watch Uplyze AI manage your entire business — from answering leads to closing deals — without lifting a finger
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
                  ? 'border-purple-500/50 text-white'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              }`}
              style={{ background: i === sceneIdx ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)' }}
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
          className="relative rounded-xl overflow-hidden border border-white/10"
          style={{ background: 'linear-gradient(180deg, hsl(222, 30%, 14%) 0%, hsl(222, 35%, 10%) 100%)' }}
        >
          {/* Browser chrome */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: 'hsl(222, 30%, 12%)' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-md border border-white/10" style={{ background: 'hsl(222, 30%, 16%)' }}>
              <Shield className="w-3 h-3 text-white/30" />
              <span className="text-white/50 text-xs font-mono">uplyze.ai/platform</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-[10px] font-semibold">AI ACTIVE</span>
              </div>
              <div className="text-white/30 text-[10px]">{scene.title}</div>
            </div>
          </div>

          {/* App layout */}
          <div className="flex min-h-[420px] md:min-h-[480px] relative">
            {/* Animated cursor */}
            <AnimatedCursor actions={scene.cursor} sceneKey={scene.id} />

            {/* Sidebar */}
            <div className="hidden md:flex flex-col w-14 border-r border-white/10 py-4 items-center gap-3" style={{ background: 'hsl(222, 30%, 11%)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="w-6 h-px bg-white/10" />
              {sidebarIcons.map((Icon, i) => (
                <motion.div
                  key={i}
                  animate={{
                    background: i === scene.sidebarActive ? 'rgba(124,58,237,0.2)' : 'transparent',
                    scale: i === scene.sidebarActive ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    i === scene.sidebarActive ? 'text-purple-400' : 'text-white/25'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </motion.div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 md:p-6 relative overflow-hidden">
              {/* Scene subtitle bar */}
              <div className="flex items-center gap-3 mb-5 px-3 py-2.5 rounded-lg border border-purple-500/20" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.08), rgba(59,130,246,0.04))' }}>
                <div className="relative">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-white/70 text-xs flex-1">{scene.subtitle}</span>
                {/* Progress bar */}
                <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #7c3aed, #3b82f6)' }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Dynamic panel */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10" style={{ background: 'hsl(222, 30%, 11%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-white/40 text-[10px]">AI Autopilot running</span>
              </div>
              <span className="text-white/20 text-[10px]">•</span>
              <span className="text-white/30 text-[10px]">23 tasks completed this hour</span>
            </div>
            <div className="flex items-center gap-1 text-purple-400/60 text-[10px]">
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

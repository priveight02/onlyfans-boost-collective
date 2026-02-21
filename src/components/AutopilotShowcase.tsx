import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
  BarChart3, MessageSquare, Users, Zap, TrendingUp,
  Send, Bot, CheckCircle2, ArrowRight, Sparkles,
  Search, Filter, Bell, Settings, LayoutDashboard
} from "lucide-react";

// Simulated CRM actions that play in sequence
const actions = [
  {
    id: 1,
    label: "Scanning 2,847 new leads...",
    icon: Search,
    panel: "leads",
    duration: 2400,
  },
  {
    id: 2,
    label: "AI scoring & qualifying leads",
    icon: Sparkles,
    panel: "scoring",
    duration: 2200,
  },
  {
    id: 3,
    label: "Auto-sending personalized DMs",
    icon: Send,
    panel: "dms",
    duration: 2600,
  },
  {
    id: 4,
    label: "Optimizing campaign performance",
    icon: TrendingUp,
    panel: "analytics",
    duration: 2400,
  },
  {
    id: 5,
    label: "Closing deals automatically",
    icon: CheckCircle2,
    panel: "deals",
    duration: 2000,
  },
];

const AutopilotShowcase = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % actions.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isVisible]);

  const current = actions[activeStep];

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32">
      {/* Ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, hsl(250, 80%, 60%), transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-heading tracking-tight">
            See your business run on{" "}
            <span className="bg-clip-text text-transparent pb-1" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>
              autopilot
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Watch Uplyze AI scan leads, craft messages, optimize campaigns, and close deals — all without lifting a finger
          </p>
        </motion.div>

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
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-md border border-white/10" style={{ background: 'hsl(222, 30%, 16%)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-white/50 text-xs font-mono">uplyze.ai/platform</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 text-[10px] font-medium">AI ACTIVE</span>
            </div>
          </div>

          {/* App content */}
          <div className="flex min-h-[480px]">
            {/* Sidebar */}
            <div className="hidden md:flex flex-col w-14 border-r border-white/10 py-4 items-center gap-4" style={{ background: 'hsl(222, 30%, 11%)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="w-px h-4 bg-white/10" />
              {[LayoutDashboard, Users, MessageSquare, BarChart3, Settings].map((Icon, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    i === (activeStep % 5) ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="flex-1 p-6 relative overflow-hidden">
              {/* Top toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 text-white/50 text-xs" style={{ background: 'hsl(222, 30%, 14%)' }}>
                    <Filter className="w-3 h-3" /> Last 30 Days
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 text-white/50 text-xs" style={{ background: 'hsl(222, 30%, 14%)' }}>
                    All Channels
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-white/30" />
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                </div>
              </div>

              {/* Animated action indicator */}
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg border border-purple-500/20" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.08), rgba(59,130,246,0.05))' }}>
                <div className="relative">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-white/80 text-sm font-medium flex-1">
                  {current.label}
                </span>
                <div className="flex items-center gap-1">
                  {actions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                        i === activeStep ? 'bg-purple-400 w-4' : i < activeStep ? 'bg-purple-400/50' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Panel 1: Stats */}
                <div className="rounded-lg border border-white/10 p-4" style={{ background: 'hsl(222, 30%, 12%)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs uppercase tracking-wider">Leads Found</span>
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    <CountUp target={activeStep >= 0 ? 2847 : 0} />
                  </div>
                  <span className="text-emerald-400 text-xs">+34% this week</span>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-1 mt-3 h-12">
                    {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all duration-700"
                        style={{
                          height: `${isVisible ? h : 10}%`,
                          background: i === activeStep % 10 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(255,255,255,0.08)',
                          transitionDelay: `${i * 80}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Panel 2: DM Activity */}
                <div className="rounded-lg border border-white/10 p-4" style={{ background: 'hsl(222, 30%, 12%)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs uppercase tracking-wider">AI Messages Sent</span>
                    <Send className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">
                    <CountUp target={activeStep >= 2 ? 1249 : 384} />
                  </div>
                  <div className="space-y-2">
                    {["@sarah_k — Hey! Loved your latest...", "@mike.r — Quick question about...", "@jen_creates — Thanks for reaching..."].map((msg, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-all duration-500"
                        style={{
                          background: i === activeStep % 3 ? 'rgba(124,58,237,0.1)' : 'transparent',
                          opacity: isVisible ? 1 : 0,
                          transitionDelay: `${200 + i * 150}ms`,
                        }}
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0" />
                        <span className="text-white/60 truncate">{msg}</span>
                        {i === activeStep % 3 && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 3: Revenue */}
                <div className="rounded-lg border border-white/10 p-4" style={{ background: 'hsl(222, 30%, 12%)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs uppercase tracking-wider">Revenue Closed</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    $<CountUp target={activeStep >= 4 ? 48750 : 12400} />
                  </div>
                  <span className="text-emerald-400 text-xs">+$8,200 today</span>
                  {/* Deal cards */}
                  <div className="mt-3 space-y-2">
                    {[
                      { name: "Enterprise Deal", val: "$12,500", status: "Closed" },
                      { name: "Growth Package", val: "$4,200", status: activeStep >= 4 ? "Closed" : "Pending" },
                    ].map((deal, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-white/60">{deal.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/80 font-medium">{deal.val}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${deal.status === 'Closed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {deal.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom action row */}
              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-lg border border-white/10" style={{ background: 'hsl(222, 30%, 12%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/50 text-xs">AI Autopilot running — 23 tasks completed in the last hour</span>
                </div>
                <div className="flex items-center gap-1 text-purple-400 text-xs font-medium">
                  View all <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Simple animated counter
const CountUp = ({ target }: { target: number }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = value;
    const diff = target - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };

    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target]);

  return <>{value.toLocaleString()}</>;
};

export default AutopilotShowcase;

import { Send, TrendingUp, Workflow, Crosshair, LineChart, Sparkles, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useState } from "react";

const services = [
  {
    title: "Revenue Intelligence",
    description: "Real-time analytics, forecasting & growth insights that drive smarter decisions",
    icon: LineChart,
    gradient: "from-emerald-400 via-emerald-500 to-teal-600",
    glowColor: "16,185,129",
    stat: "3.2x",
    statLabel: "avg. ROI boost",
    visual: "chart",
  },
  {
    title: "Audience Targeting",
    description: "Find & convert your ideal audience with surgical AI precision",
    icon: Crosshair,
    gradient: "from-violet-400 via-violet-500 to-purple-600",
    glowColor: "139,92,246",
    stat: "89%",
    statLabel: "match accuracy",
    visual: "target",
  },
  {
    title: "Smart Automation",
    description: "No-code workflows running your entire business on autopilot",
    icon: Workflow,
    gradient: "from-blue-400 via-blue-500 to-indigo-600",
    glowColor: "59,130,246",
    stat: "40hrs",
    statLabel: "saved per week",
    visual: "flow",
  },
  {
    title: "Growth Pipeline",
    description: "AI scores leads, qualifies & closes deals while you sleep",
    icon: TrendingUp,
    gradient: "from-fuchsia-400 via-purple-500 to-violet-600",
    glowColor: "168,85,247",
    stat: "5x",
    statLabel: "more conversions",
    visual: "pipeline",
  },
  {
    title: "Automated Outreach",
    description: "AI handles DMs, follow-ups & lead nurturing around the clock",
    icon: Send,
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glowColor: "249,115,22",
    stat: "24/7",
    statLabel: "always active",
    visual: "outreach",
  },
];

/* ─── Mini Visuals ─── */
const MiniChart = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full" fill="none">
    <defs>
      <linearGradient id="mcg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(16,185,129,0.2)" />
        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
      </linearGradient>
    </defs>
    {[15, 30, 45].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />)}
    {[
      { x: 12, h: 16 }, { x: 28, h: 22 }, { x: 44, h: 14 }, { x: 60, h: 28 },
      { x: 76, h: 20 }, { x: 92, h: 34 }, { x: 108, h: 30 }, { x: 124, h: 38 },
      { x: 140, h: 36 }, { x: 156, h: 42 }, { x: 172, h: 40 }, { x: 188, h: 46 },
    ].map((b, i) => (
      <rect key={i} x={b.x - 4} y={48 - b.h} width="8" height={b.h} rx="2"
        fill={`rgba(16,185,129,${0.08 + i * 0.025})`} className="sv-bar" style={{ animationDelay: `${i * 50}ms` }} />
    ))}
    <path d="M8,42 C24,38 40,40 56,32 S88,20 108,18 S140,10 156,8 S180,4 196,2"
      stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" strokeLinecap="round" className="sv-line" />
    <path d="M8,42 C24,38 40,40 56,32 S88,20 108,18 S140,10 156,8 S180,4 196,2 V50 H8 Z" fill="url(#mcg2)" className="sv-area" />
  </svg>
);

const MiniTarget = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full" fill="none">
    <circle cx="100" cy="25" r="20" stroke="rgba(139,92,246,0.08)" strokeWidth="0.8" strokeDasharray="3 2" className="sv-orbit" />
    <circle cx="100" cy="25" r="12" stroke="rgba(139,92,246,0.15)" strokeWidth="0.8" />
    <circle cx="100" cy="25" r="4" fill="rgba(139,92,246,0.5)" className="sv-core" />
    {[{ x: 50, y: 15 }, { x: 150, y: 32 }, { x: 68, y: 38 }, { x: 140, y: 10 }, { x: 38, y: 28 }, { x: 165, y: 22 }].map((t, i) => (
      <g key={i}>
        <line x1={t.x} y1={t.y} x2="100" y2="25" stroke="rgba(139,92,246,0.05)" strokeWidth="0.5" />
        <circle cx={t.x} cy={t.y} r="2.5" fill="none" stroke={`rgba(139,92,246,${0.2 + i * 0.06})`} strokeWidth="0.8" className="sv-ping" style={{ animationDelay: `${i * 400}ms` }} />
        <circle cx={t.x} cy={t.y} r="1.2" fill={`rgba(139,92,246,${0.4 + i * 0.08})`} />
      </g>
    ))}
  </svg>
);

const MiniFlow = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full" fill="none">
    {[
      { x: 18, y: 25, s: 10 }, { x: 55, y: 13, s: 8 }, { x: 55, y: 37, s: 8 },
      { x: 100, y: 25, s: 12 }, { x: 145, y: 13, s: 8 }, { x: 145, y: 37, s: 8 }, { x: 182, y: 25, s: 10 },
    ].map((n, i) => (
      <rect key={i} x={n.x - n.s / 2} y={n.y - n.s / 2} width={n.s} height={n.s} rx={3}
        fill={`rgba(59,130,246,${0.06 + i * 0.03})`}
        stroke={`rgba(59,130,246,${0.15 + i * 0.04})`} strokeWidth="0.8"
        className="sv-node" style={{ animationDelay: `${i * 100}ms` }} />
    ))}
    <path d="M24,25 Q38,13 49,13" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M24,25 Q38,37 49,37" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M61,13 Q78,13 94,22" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M61,37 Q78,37 94,28" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M108,22 Q125,13 139,13" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M108,28 Q125,37 139,37" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M151,13 Q165,13 176,25" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <path d="M151,37 Q165,37 176,25" stroke="rgba(59,130,246,0.1)" strokeWidth="0.8" />
    <circle r="1.5" fill="rgba(59,130,246,0.6)">
      <animateMotion dur="4s" repeatCount="indefinite" path="M18,25 Q38,13 55,13 Q78,13 100,25 Q125,13 145,13 Q165,13 182,25" />
    </circle>
  </svg>
);

const MiniPipeline = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full" fill="none">
    {[
      { x: 4, w: 34, h: 42, o: 0.05 }, { x: 40, w: 30, h: 36, o: 0.08 },
      { x: 73, w: 26, h: 28, o: 0.12 }, { x: 102, w: 22, h: 22, o: 0.16 },
      { x: 127, w: 20, h: 16, o: 0.2 },
    ].map((s, i) => (
      <rect key={i} x={s.x} y={(50 - s.h) / 2} width={s.w} height={s.h} rx="3"
        fill={`rgba(168,85,247,${s.o})`} stroke={`rgba(168,85,247,${s.o + 0.06})`} strokeWidth="0.5"
        className="sv-funnel" style={{ animationDelay: `${i * 100}ms` }} />
    ))}
    {[37, 70, 99, 125].map((x, i) => (
      <path key={i} d={`M${x},25 l3,-2.5 v5 z`} fill={`rgba(168,85,247,${0.12 + i * 0.04})`} />
    ))}
    <circle cx="164" cy="25" r="14" fill="rgba(168,85,247,0.06)" stroke="rgba(168,85,247,0.2)" strokeWidth="0.8" />
    <text x="164" y="29" textAnchor="middle" fill="rgba(168,85,247,0.6)" fontSize="12" fontWeight="800">$</text>
    <line x1="150" y1="25" x2="148" y2="25" stroke="rgba(168,85,247,0.15)" strokeWidth="0.5" strokeDasharray="2 2" className="sv-dash" />
  </svg>
);

const MiniOutreach = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full" fill="none">
    <circle cx="100" cy="25" r="8" fill="rgba(249,115,22,0.08)" stroke="rgba(249,115,22,0.25)" strokeWidth="0.8" />
    <circle cx="100" cy="25" r="2.5" fill="rgba(249,115,22,0.5)" />
    <circle cx="100" cy="25" r="16" stroke="rgba(249,115,22,0.06)" strokeWidth="0.5" className="sv-ripple" />
    <circle cx="100" cy="25" r="24" stroke="rgba(249,115,22,0.04)" strokeWidth="0.5" className="sv-ripple" style={{ animationDelay: '0.6s' }} />
    {[
      { x: 28, y: 12 }, { x: 22, y: 36 }, { x: 58, y: 42 }, { x: 48, y: 8 },
      { x: 162, y: 10 }, { x: 172, y: 38 }, { x: 148, y: 42 }, { x: 152, y: 8 },
    ].map((m, i) => (
      <g key={i}>
        <line x1="100" y1="25" x2={m.x} y2={m.y} stroke="rgba(249,115,22,0.04)" strokeWidth="0.3" />
        <rect x={m.x - 6} y={m.y - 4} width="12" height="8" rx="3"
          fill={`rgba(249,115,22,${0.06 + i * 0.02})`}
          stroke={`rgba(249,115,22,${0.12 + i * 0.03})`} strokeWidth="0.5"
          className="sv-dm" style={{ animationDelay: `${i * 200}ms` }} />
      </g>
    ))}
  </svg>
);

const visuals: Record<string, React.FC> = { chart: MiniChart, target: MiniTarget, flow: MiniFlow, pipeline: MiniPipeline, outreach: MiniOutreach };

const ServiceCard3D = ({ service, idx }: { service: typeof services[0]; idx: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    x.set(nx - 0.5);
    y.set(ny - 0.5);
    mouseX.set(nx);
    mouseY.set(ny);
  };
  const resetMouse = () => { x.set(0); y.set(0); setHovered(false); };

  const Visual = visuals[service.visual];

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouse}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={resetMouse}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="sv-card group relative rounded-[24px] h-full cursor-default"
      >
        {/* Animated gradient border */}
        <div className="absolute -inset-[1px] rounded-[25px] opacity-40 group-hover:opacity-100 transition-opacity duration-700"
          style={{ background: `linear-gradient(135deg, rgba(${service.glowColor},0.35), transparent 45%, transparent 55%, rgba(${service.glowColor},0.2) 100%)` }} />

        {/* Card surface */}
        <div className="relative rounded-[24px] overflow-hidden h-full"
          style={{ background: 'linear-gradient(170deg, hsl(222,26%,12%) 0%, hsl(222,30%,7.5%) 100%)' }}>
          
          {/* Cursor spotlight */}
          <motion.div
            className="absolute w-[250px] h-[250px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
            style={{
              background: `rgba(${service.glowColor},0.06)`,
              left: useTransform(mouseX, [0, 1], ["-125px", "calc(100% - 125px)"]),
              top: useTransform(mouseY, [0, 1], ["-125px", "calc(100% - 125px)"]),
            }}
          />

          {/* Top line accent */}
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{ background: `linear-gradient(90deg, transparent, rgba(${service.glowColor},0.5), transparent)` }} />

          {/* Corner glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"
            style={{ background: `rgba(${service.glowColor},0.08)` }} />

          {/* Content */}
          <div className="relative z-10 p-7 pb-6 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="relative">
                <div className={`sv-icon w-[50px] h-[50px] rounded-[14px] bg-gradient-to-br ${service.gradient} flex items-center justify-center`}
                  style={{ boxShadow: `0 10px 30px -5px rgba(${service.glowColor},0.35)` }}>
                  <service.icon className="w-[21px] h-[21px] text-white relative z-10" strokeWidth={2} />
                </div>
                {/* Icon ring on hover */}
                <div className="absolute -inset-1 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ border: `1px solid rgba(${service.glowColor},0.15)` }} />
              </div>
              <div className="text-right">
                <motion.div
                  className="text-[26px] font-black text-white tracking-tighter leading-none"
                  initial={{ opacity: 0.7 }}
                  whileInView={{ opacity: 1 }}
                >
                  {service.stat}
                </motion.div>
                <div className="text-[8px] text-white/20 font-bold uppercase tracking-[0.12em] mt-1.5">{service.statLabel}</div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[17px] font-extrabold text-white mb-2 tracking-[-0.02em] leading-snug">{service.title}</h3>
            <p className="text-[12.5px] text-white/28 leading-[1.7] flex-1">{service.description}</p>

            {/* Visual panel */}
            <div className="mt-5 h-[44px] w-full rounded-2xl overflow-hidden opacity-40 group-hover:opacity-100 transition-all duration-700"
              style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="p-1.5 h-full">
                <Visual />
              </div>
            </div>

            {/* Bottom */}
            <div className="mt-4 flex items-center gap-3">
              <div className="h-[1.5px] flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, rgb(${service.glowColor}), rgba(${service.glowColor},0.1))` }}
                  animate={{ width: hovered ? "100%" : "20%" }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-[9px] text-white/12 group-hover:text-white/35 font-semibold uppercase tracking-[0.1em] transition-colors duration-500 flex items-center gap-1">
                Learn <ArrowRight className="w-2.5 h-2.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] opacity-[0.05]" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">All-in-One Platform</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-5 text-white tracking-tight">
            Everything You Need to{" "}
            <span className="uplyze-highlight">Scale</span>
          </h2>
          <p className="text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
            Five AI engines. Zero manual work. One platform that replaces your entire stack.
          </p>
        </motion.div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {services.slice(0, 3).map((service, idx) => (
              <ServiceCard3D key={service.title} service={service} idx={idx} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {services.slice(3).map((service, idx) => (
              <ServiceCard3D key={service.title} service={service} idx={idx + 3} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center mt-10"
        >
          <button onClick={() => navigate("/services")} className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/60 transition-colors duration-300">
            Explore All Features <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </div>

      <style>{`
        .sv-card { transition: box-shadow 0.6s cubic-bezier(0.22,1,0.36,1); }
        .sv-card:hover { box-shadow: 0 30px 80px -20px rgba(0,0,0,0.5); }
        .sv-icon { transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .sv-card:hover .sv-icon { transform: translateY(-3px) scale(1.08) rotate(-2deg); }

        .sv-line { stroke-dasharray: 300; stroke-dashoffset: 300; animation: sv-draw 2.5s ease-out forwards; }
        .sv-area { opacity: 0; animation: sv-fi 1s ease-out 1.5s forwards; }
        .sv-bar { opacity: 0; animation: sv-grow 0.4s ease-out forwards; transform-origin: bottom; }
        @keyframes sv-draw { to { stroke-dashoffset: 0; } }
        @keyframes sv-fi { to { opacity: 1; } }
        @keyframes sv-grow { from { opacity:0; transform: scaleY(0); } to { opacity:1; transform: scaleY(1); } }

        .sv-orbit { animation: sv-spin 12s linear infinite; transform-origin: 100px 25px; }
        @keyframes sv-spin { to { transform: rotate(360deg); } }
        .sv-core { animation: sv-glow 2.5s ease-in-out infinite; }
        @keyframes sv-glow { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        .sv-ping { animation: sv-ping 2.5s ease-out infinite; }
        @keyframes sv-ping { 0% { r:2.5; opacity:0.3; } 100% { r:7; opacity:0; } }

        .sv-node { opacity:0; animation: sv-pop 0.35s ease-out forwards; }
        @keyframes sv-pop { from { opacity:0; transform:scale(0.4); } to { opacity:1; transform:scale(1); } }

        .sv-funnel { opacity:0; animation: sv-slide 0.4s ease-out forwards; }
        @keyframes sv-slide { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }

        .sv-ripple { animation: sv-rip 3s ease-out infinite; }
        @keyframes sv-rip { 0% { r:16; opacity:0.12; } 100% { r:38; opacity:0; } }
        .sv-dm { animation: sv-dmf 3.5s ease-in-out infinite; }
        @keyframes sv-dmf { 0%,100% { opacity:0.6; transform:translateY(0); } 50% { opacity:1; transform:translateY(-1.5px); } }
      `}</style>
    </section>
  );
};

export default Services;

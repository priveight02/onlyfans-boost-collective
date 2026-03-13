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
  <svg viewBox="0 0 200 60" className="w-full h-full" fill="none">
    <defs>
      <linearGradient id="mcg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(16,185,129,0.25)" />
        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
      </linearGradient>
    </defs>
    {/* Grid lines */}
    {[15, 30, 45].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />)}
    {/* Bars */}
    {[
      { x: 10, h: 22 }, { x: 30, h: 30 }, { x: 50, h: 18 }, { x: 70, h: 35 },
      { x: 90, h: 28 }, { x: 110, h: 42 }, { x: 130, h: 38 }, { x: 150, h: 48 },
      { x: 170, h: 44 }, { x: 190, h: 52 },
    ].map((b, i) => (
      <rect key={i} x={b.x - 5} y={58 - b.h} width="10" height={b.h} rx="2"
        fill={`rgba(16,185,129,${0.12 + i * 0.03})`}
        className="svc-bar" style={{ animationDelay: `${i * 0.06}s` }} />
    ))}
    {/* Trend line */}
    <path d="M5,48 C30,42 50,45 70,35 S110,22 130,18 S170,12 195,6"
      stroke="rgba(16,185,129,0.7)" strokeWidth="2" strokeLinecap="round" className="svc-trend" />
    <path d="M5,48 C30,42 50,45 70,35 S110,22 130,18 S170,12 195,6 V60 H5 Z"
      fill="url(#mcg)" className="svc-trend-fill" />
  </svg>
);

const MiniTarget = () => (
  <svg viewBox="0 0 200 60" className="w-full h-full" fill="none">
    {/* Scan lines */}
    {[0, 1, 2, 3].map(i => (
      <line key={i} x1={30 + i * 45} y1="5" x2={30 + i * 45} y2="55" stroke="rgba(139,92,246,0.06)" strokeWidth="1" />
    ))}
    {/* Radar sweep */}
    <circle cx="100" cy="30" r="24" stroke="rgba(139,92,246,0.12)" strokeWidth="1" strokeDasharray="4 3" className="svc-radar" />
    <circle cx="100" cy="30" r="14" stroke="rgba(139,92,246,0.2)" strokeWidth="1" />
    <circle cx="100" cy="30" r="4" fill="rgba(139,92,246,0.6)" className="svc-core" />
    {/* Detected targets */}
    {[{ x: 42, y: 18 }, { x: 155, y: 38 }, { x: 72, y: 45 }, { x: 135, y: 14 }].map((t, i) => (
      <g key={i}>
        <circle cx={t.x} cy={t.y} r="3" fill="none" stroke={`rgba(139,92,246,${0.3 + i * 0.1})`} strokeWidth="1" className="svc-ping" style={{ animationDelay: `${i * 0.5}s` }} />
        <circle cx={t.x} cy={t.y} r="1.5" fill={`rgba(139,92,246,${0.5 + i * 0.1})`} />
      </g>
    ))}
    {/* Connection lines */}
    <line x1="42" y1="18" x2="100" y2="30" stroke="rgba(139,92,246,0.08)" strokeWidth="0.5" strokeDasharray="2 2" />
    <line x1="155" y1="38" x2="100" y2="30" stroke="rgba(139,92,246,0.08)" strokeWidth="0.5" strokeDasharray="2 2" />
  </svg>
);

const MiniFlow = () => (
  <svg viewBox="0 0 200 60" className="w-full h-full" fill="none">
    {/* Nodes + connections */}
    {[
      { x: 20, y: 30, s: 10 }, { x: 60, y: 16, s: 8 }, { x: 60, y: 44, s: 8 },
      { x: 110, y: 30, s: 12 }, { x: 160, y: 20, s: 8 }, { x: 160, y: 40, s: 8 },
    ].map((n, i) => (
      <g key={i}>
        <rect x={n.x - n.s / 2} y={n.y - n.s / 2} width={n.s} height={n.s} rx={n.s / 3}
          fill={`rgba(59,130,246,${0.08 + i * 0.04})`}
          stroke={`rgba(59,130,246,${0.2 + i * 0.06})`} strokeWidth="1"
          className="svc-node" style={{ animationDelay: `${i * 0.15}s` }} />
      </g>
    ))}
    {/* Paths */}
    <path d="M26,30 Q40,16 54,16" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
    <path d="M26,30 Q40,44 54,44" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
    <path d="M66,16 Q85,16 104,26" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
    <path d="M66,44 Q85,44 104,34" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
    <path d="M118,28 Q135,20 154,20" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
    <path d="M118,32 Q135,40 154,40" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
    {/* Animated particle */}
    <circle r="2" fill="rgba(59,130,246,0.6)" className="svc-particle">
      <animateMotion dur="3s" repeatCount="indefinite" path="M20,30 Q40,16 60,16 Q85,16 110,30 Q135,20 160,20" />
    </circle>
  </svg>
);

const MiniPipeline = () => (
  <svg viewBox="0 0 200 60" className="w-full h-full" fill="none">
    {/* Funnel stages */}
    {[
      { x: 5, w: 38, h: 50, o: 0.06 }, { x: 45, w: 34, h: 42, o: 0.1 },
      { x: 82, w: 30, h: 34, o: 0.14 }, { x: 115, w: 26, h: 26, o: 0.18 },
      { x: 145, w: 22, h: 20, o: 0.24 },
    ].map((s, i) => (
      <rect key={i} x={s.x} y={(60 - s.h) / 2} width={s.w} height={s.h} rx="4"
        fill={`rgba(168,85,247,${s.o})`}
        stroke={`rgba(168,85,247,${s.o + 0.08})`} strokeWidth="0.5"
        className="svc-funnel" style={{ animationDelay: `${i * 0.12}s` }} />
    ))}
    {/* Result */}
    <circle cx="182" cy="30" r="12" fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
    <text x="182" y="33" textAnchor="middle" fill="rgba(168,85,247,0.7)" fontSize="10" fontWeight="800">$</text>
    {/* Flow arrows */}
    {[40, 78, 112, 142].map((x, i) => (
      <path key={i} d={`M${x},30 l4,-3 v6 z`} fill={`rgba(168,85,247,${0.15 + i * 0.05})`} />
    ))}
  </svg>
);

const MiniOutreach = () => (
  <svg viewBox="0 0 200 60" className="w-full h-full" fill="none">
    {/* Central hub */}
    <circle cx="100" cy="30" r="10" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.3)" strokeWidth="1" />
    <circle cx="100" cy="30" r="3" fill="rgba(249,115,22,0.5)" />
    {/* Ripple */}
    <circle cx="100" cy="30" r="18" stroke="rgba(249,115,22,0.1)" strokeWidth="0.5" className="svc-ripple" />
    <circle cx="100" cy="30" r="28" stroke="rgba(249,115,22,0.06)" strokeWidth="0.5" className="svc-ripple" style={{ animationDelay: '0.5s' }} />
    {/* Messages flying out */}
    {[
      { x: 30, y: 15, d: 0 }, { x: 25, y: 42, d: 0.3 }, { x: 160, y: 12, d: 0.6 },
      { x: 170, y: 45, d: 0.9 }, { x: 50, y: 50, d: 1.2 }, { x: 155, y: 30, d: 0.4 },
    ].map((m, i) => (
      <g key={i} className="svc-dm" style={{ animationDelay: `${m.d}s` }}>
        <rect x={m.x} y={m.y} width="14" height="9" rx="4"
          fill={`rgba(249,115,22,${0.1 + i * 0.03})`}
          stroke={`rgba(249,115,22,${0.2 + i * 0.04})`} strokeWidth="0.5" />
      </g>
    ))}
    {/* Connection lines */}
    {[{ x: 37, y: 19 }, { x: 32, y: 46 }, { x: 167, y: 16 }, { x: 177, y: 49 }].map((l, i) => (
      <line key={i} x1="100" y1="30" x2={l.x} y2={l.y} stroke="rgba(249,115,22,0.06)" strokeWidth="0.5" />
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
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 250, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 250, damping: 30 });

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
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: idx * 0.1 }}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouse}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={resetMouse}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="svc-card group relative rounded-[22px] h-full cursor-default"
      >
        {/* Outer glow ring */}
        <div
          className="absolute -inset-[1px] rounded-[23px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `conic-gradient(from 180deg, rgba(${service.glowColor},0.25), transparent 40%, rgba(${service.glowColor},0.15) 60%, transparent 80%, rgba(${service.glowColor},0.2))` }}
        />

        {/* Card body */}
        <div className="relative rounded-[22px] overflow-hidden h-full" style={{ background: 'linear-gradient(165deg, hsl(222,28%,11%) 0%, hsl(222,32%,7%) 100%)' }}>
          
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />

          {/* Spotlight follow cursor */}
          <motion.div
            className="absolute w-[200px] h-[200px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle, rgba(${service.glowColor},0.07), transparent 70%)`,
              left: useTransform(mouseX, [0, 1], ["-100px", "calc(100% - 100px)"]),
              top: useTransform(mouseY, [0, 1], ["-100px", "calc(100% - 100px)"]),
            }}
          />

          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, rgba(${service.glowColor},0.4), transparent)` }} />

          {/* Content */}
          <div className="relative z-10 p-7 flex flex-col h-full">
            {/* Header row */}
            <div className="flex items-start justify-between mb-5">
              <div className={`svc-icon w-[52px] h-[52px] rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center relative`}>
                <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: `0 8px 30px rgba(${service.glowColor},0.3), inset 0 1px 0 rgba(255,255,255,0.15)` }} />
                <service.icon className="w-[22px] h-[22px] text-white relative z-10" strokeWidth={2} />
              </div>
              <div className="text-right mt-1">
                <div className="text-2xl font-black text-white tracking-tighter leading-none">{service.stat}</div>
                <div className="text-[9px] text-white/25 font-semibold uppercase tracking-[0.1em] mt-1.5">{service.statLabel}</div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[17px] font-extrabold text-white mb-2 tracking-tight leading-tight">{service.title}</h3>
            <p className="text-[13px] text-white/30 leading-[1.65] flex-1">{service.description}</p>

            {/* Visual */}
            <div className="mt-5 h-[52px] w-full rounded-xl p-2 opacity-50 group-hover:opacity-100 transition-all duration-600" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <Visual />
            </div>

            {/* Bottom bar */}
            <div className="mt-5 flex items-center gap-3">
              <div className="h-[2px] flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, rgb(${service.glowColor}), rgba(${service.glowColor},0.2))` }}
                  initial={{ width: "0%" }}
                  whileInView={{ width: hovered ? "100%" : "25%" }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/15 group-hover:text-white/40 transition-colors duration-500 font-medium uppercase tracking-wider">
                <span>Learn</span>
                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section id="services" className="py-28 relative overflow-hidden">
      {/* Decorative line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] opacity-[0.06]" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
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

        {/* Grid */}
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

        {/* Explore */}
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
        .svc-card { transition: box-shadow 0.5s ease; }
        .svc-card:hover { box-shadow: 0 25px 80px -20px rgba(0,0,0,0.6); }
        .svc-icon { transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .svc-card:hover .svc-icon { transform: translateY(-3px) scale(1.08); }

        .svc-trend {
          stroke-dasharray: 300; stroke-dashoffset: 300;
          animation: svc-draw 2.5s ease-out forwards;
        }
        .svc-trend-fill { opacity: 0; animation: svc-fadein 1s ease-out 1.5s forwards; }
        .svc-bar { opacity: 0; animation: svc-grow 0.5s ease-out forwards; transform-origin: bottom; }
        @keyframes svc-draw { to { stroke-dashoffset: 0; } }
        @keyframes svc-fadein { to { opacity: 1; } }
        @keyframes svc-grow { from { opacity: 0; transform: scaleY(0); } to { opacity: 1; transform: scaleY(1); } }

        .svc-radar { animation: svc-spin 8s linear infinite; transform-origin: 100px 30px; }
        @keyframes svc-spin { to { transform: rotate(360deg); } }
        .svc-core { animation: svc-glow 2s ease-in-out infinite; }
        @keyframes svc-glow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        .svc-ping { animation: svc-ping 2s ease-out infinite; }
        @keyframes svc-ping { 0% { r: 3; opacity: 0.4; } 100% { r: 8; opacity: 0; } }

        .svc-node { opacity: 0; animation: svc-pop 0.4s ease-out forwards; }
        @keyframes svc-pop { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }

        .svc-funnel { opacity: 0; animation: svc-slidein 0.5s ease-out forwards; }
        @keyframes svc-slidein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

        .svc-ripple { animation: svc-rip 2.5s ease-out infinite; }
        @keyframes svc-rip { 0% { r: 18; opacity: 0.15; } 100% { r: 40; opacity: 0; } }
        .svc-dm { animation: svc-dmfloat 3s ease-in-out infinite; }
        @keyframes svc-dmfloat { 0%,100% { opacity: 0.7; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
      `}</style>
    </section>
  );
};

export default Services;

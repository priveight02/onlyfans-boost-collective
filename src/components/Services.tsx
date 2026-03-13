import { Send, TrendingUp, Workflow, Crosshair, LineChart, Sparkles, ArrowRight, MousePointerClick, Cpu, Activity } from "lucide-react";
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

const MiniChart = () => (
  <svg viewBox="0 0 120 40" className="w-full h-full">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
      </linearGradient>
    </defs>
    <path d="M0,35 Q10,30 20,28 T40,22 T60,18 T80,10 T100,6 T120,2" fill="none" stroke="rgba(16,185,129,0.6)" strokeWidth="2" className="svc-chart-line" />
    <path d="M0,35 Q10,30 20,28 T40,22 T60,18 T80,10 T100,6 T120,2 V40 H0 Z" fill="url(#cg)" className="svc-chart-fill" />
  </svg>
);

const MiniTarget = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full">
    <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="1.5" />
    <circle cx="30" cy="30" r="18" fill="none" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
    <circle cx="30" cy="30" r="10" fill="none" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" />
    <circle cx="30" cy="30" r="3" fill="rgba(139,92,246,0.8)" className="svc-pulse" />
  </svg>
);

const MiniFlow = () => (
  <svg viewBox="0 0 120 40" className="w-full h-full">
    {[10, 40, 70, 100].map((x, i) => (
      <g key={i}>
        <rect x={x - 6} y="14" width="12" height="12" rx="3" fill={`rgba(59,130,246,${0.2 + i * 0.15})`} stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
        {i < 3 && <line x1={x + 6} y1="20" x2={x + 24} y2="20" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="3 2" />}
      </g>
    ))}
  </svg>
);

const MiniPipeline = () => (
  <svg viewBox="0 0 120 40" className="w-full h-full">
    <polygon points="5,5 115,12 115,28 5,35" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
    {[20, 50, 85].map((x, i) => (
      <line key={i} x1={x} y1="8" x2={x} y2="32" stroke="rgba(168,85,247,0.12)" strokeWidth="1" />
    ))}
    <text x="12" y="23" fill="rgba(168,85,247,0.5)" fontSize="7" fontWeight="600">LEAD</text>
    <text x="88" y="23" fill="rgba(168,85,247,0.5)" fontSize="7" fontWeight="600">$$$</text>
  </svg>
);

const MiniOutreach = () => (
  <svg viewBox="0 0 60 40" className="w-full h-full">
    {[{ x: 8, y: 12, d: 0 }, { x: 22, y: 8, d: 0.15 }, { x: 36, y: 16, d: 0.3 }].map((m, i) => (
      <g key={i} className="svc-msg" style={{ animationDelay: `${m.d}s` }}>
        <rect x={m.x} y={m.y} width="18" height="11" rx="5" fill={`rgba(249,115,22,${0.15 + i * 0.1})`} stroke="rgba(249,115,22,0.3)" strokeWidth="0.8" />
        <line x1={m.x + 4} y1={m.y + 4} x2={m.x + 14} y2={m.y + 4} stroke="rgba(249,115,22,0.3)" strokeWidth="0.8" />
        <line x1={m.x + 4} y1={m.y + 7} x2={m.x + 10} y2={m.y + 7} stroke="rgba(249,115,22,0.2)" strokeWidth="0.8" />
      </g>
    ))}
  </svg>
);

const visuals: Record<string, React.FC> = { chart: MiniChart, target: MiniTarget, flow: MiniFlow, pipeline: MiniPipeline, outreach: MiniOutreach };

const ServiceCard3D = ({ service, idx }: { service: typeof services[0]; idx: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 30 });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const resetMouse = () => { x.set(0); y.set(0); setHovered(false); };

  const Visual = visuals[service.visual];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: idx * 0.1 }}
      className="svc-perspective"
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouse}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={resetMouse}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="svc-card group relative rounded-[20px] overflow-hidden h-full"
      >
        {/* Gradient border */}
        <div className="absolute inset-0 rounded-[20px] p-[1px]" style={{ background: `linear-gradient(135deg, rgba(${service.glowColor},0.3), transparent 50%, rgba(${service.glowColor},0.1))` }}>
          <div className="w-full h-full rounded-[19px]" style={{ background: 'hsl(222,30%,8%)' }} />
        </div>

        {/* Background glow on hover */}
        <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(${service.glowColor},0.08), transparent 60%)` }} />

        {/* Floating orb */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-700 blur-2xl" style={{ background: `rgb(${service.glowColor})` }} />

        {/* Content */}
        <div className="relative z-10 p-6 flex flex-col h-full">
          {/* Top: icon + stat */}
          <div className="flex items-start justify-between mb-4">
            <div className={`svc-icon-wrap w-12 h-12 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center`} style={{ boxShadow: `0 8px 24px rgba(${service.glowColor},0.25)` }}>
              <service.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-white tracking-tight leading-none">{service.stat}</div>
              <div className="text-[9px] text-white/25 font-semibold uppercase tracking-wider mt-1">{service.statLabel}</div>
            </div>
          </div>

          {/* Title + desc */}
          <h3 className="text-base font-bold text-white mb-1.5 tracking-tight">{service.title}</h3>
          <p className="text-[13px] text-white/35 leading-relaxed mb-4 flex-1">{service.description}</p>

          {/* Mini visual */}
          <div className="h-10 w-full opacity-60 group-hover:opacity-100 transition-opacity duration-500">
            <Visual />
          </div>

          {/* Bottom accent */}
          <div className="mt-4 flex items-center gap-2">
            <div className="h-[2px] flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, rgb(${service.glowColor}), transparent)` }}
                initial={{ width: "0%" }}
                whileInView={{ width: hovered ? "100%" : "30%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-all duration-300 group-hover:translate-x-0.5" />
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
      {/* Ambient effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] opacity-[0.08]" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />

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

        {/* Bento Grid — 3 top, 2 bottom wider */}
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

        {/* Explore link only */}
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
        .svc-perspective { perspective: 800px; }
        .svc-card { transition: box-shadow 0.4s ease; }
        .svc-card:hover { box-shadow: 0 20px 60px -15px rgba(0,0,0,0.5); }
        .svc-icon-wrap { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .svc-card:hover .svc-icon-wrap { transform: translateY(-2px) scale(1.05); }

        .svc-chart-line {
          stroke-dasharray: 200; stroke-dashoffset: 200;
          animation: svc-draw 2s ease-out forwards;
        }
        .svc-chart-fill {
          opacity: 0; animation: svc-fade 1s ease-out 1.2s forwards;
        }
        @keyframes svc-draw { to { stroke-dashoffset: 0; } }
        @keyframes svc-fade { to { opacity: 1; } }

        .svc-pulse { animation: svc-p 2s ease-in-out infinite; }
        @keyframes svc-p {
          0%, 100% { r: 3; opacity: 0.8; }
          50% { r: 5; opacity: 0.4; }
        }

        .svc-msg { animation: svc-float 3s ease-in-out infinite; }
        @keyframes svc-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </section>
  );
};

export default Services;

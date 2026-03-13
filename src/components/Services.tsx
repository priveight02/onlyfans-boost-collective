import { Send, TrendingUp, Workflow, Crosshair, LineChart, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const services = [
  { title: "Revenue Intelligence", description: "Real-time analytics, forecasting & growth insights that drive smarter decisions", icon: LineChart, color: "from-emerald-500 to-emerald-600", glow: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.2)", stat: "3.2x", statLabel: "ROI boost" },
  { title: "Audience Targeting", description: "Find & convert your ideal audience with surgical AI precision", icon: Crosshair, color: "from-violet-500 to-violet-600", glow: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.2)", stat: "89%", statLabel: "match rate" },
  { title: "Smart Automation", description: "No-code workflows running your entire business on autopilot", icon: Workflow, color: "from-blue-500 to-blue-600", glow: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.2)", stat: "40hrs", statLabel: "saved/week" },
  { title: "Growth Pipeline", description: "AI scores leads, qualifies & closes deals while you sleep", icon: TrendingUp, color: "from-purple-500 to-purple-600", glow: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.2)", stat: "5x", statLabel: "more leads" },
  { title: "Automated Outreach", description: "AI handles DMs, follow-ups & lead nurturing around the clock", icon: Send, color: "from-orange-500 to-orange-600", glow: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.2)", stat: "24/7", statLabel: "active" },
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? "/pricing" : "/auth";

  return (
    <section id="services" className="py-28 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, hsl(var(--accent)), transparent 70%)' }} />

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
            Five powerful AI engines working together — so your growth never stops, even when you do.
          </p>
        </motion.div>

        {/* Services Grid — top row 3, bottom row 2 centered */}
        <div className="space-y-5">
          {/* Top row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {services.slice(0, 3).map((service, idx) => (
              <ServiceCard key={service.title} service={service} idx={idx} />
            ))}
          </div>
          {/* Bottom row — centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[calc(66.666%+10px)] mx-auto">
            {services.slice(3).map((service, idx) => (
              <ServiceCard key={service.title} service={service} idx={idx + 3} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-3 mt-14"
        >
          <button
            onClick={() => navigate(ctaPath)}
            className="group inline-flex items-center gap-2.5 rounded-2xl px-9 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              boxShadow: "0 6px 24px hsl(var(--primary) / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
            }}
          >
            <Zap className="h-4 w-4" />
            Start Scaling Now
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
          <button onClick={() => navigate("/services")} className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/60 transition-colors duration-300">
            Explore All Features <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

const ServiceCard = ({ service, idx }: { service: typeof services[0]; idx: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: idx * 0.08 }}
    className="group relative rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.02]"
    style={{ background: `linear-gradient(135deg, ${service.border}, transparent 60%)` }}
  >
    <div
      className="relative rounded-2xl p-6 h-full overflow-hidden"
      style={{ background: 'hsl(222, 30%, 8.5%)' }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${service.glow}, transparent 70%)` }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-lg`}>
            <service.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          {/* Stat pill */}
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-white tracking-tight">{service.stat}</span>
            <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">{service.statLabel}</span>
          </div>
        </div>

        <h3 className="text-[15px] font-bold text-white mb-2 tracking-tight">{service.title}</h3>
        <p className="text-[13px] text-white/35 leading-relaxed">{service.description}</p>

        {/* Bottom accent line */}
        <div
          className="mt-5 h-[2px] rounded-full w-12 opacity-40 group-hover:w-full group-hover:opacity-60 transition-all duration-700"
          style={{ background: `linear-gradient(90deg, ${service.border}, transparent)` }}
        />
      </div>
    </div>
  </motion.div>
);

export default Services;

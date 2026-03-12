import { Workflow, TrendingUp, Crosshair, Network, Send, LineChart, ArrowRight, Zap, Sparkles, Bot, BarChart3, Target, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const features = [
  {
    id: "outreach",
    title: "Automated Outreach",
    tagline: "Never miss a lead",
    description: "AI handles DMs, follow-ups, and conversations 24/7 across every platform. Smart sequences that adapt to each prospect's behavior in real time.",
    icon: Send,
    stat: "24/7",
    statLabel: "Always active",
    gradient: "from-orange-500 to-rose-500",
    details: ["Smart DM sequences", "Behavioral follow-ups", "Multi-platform sync", "Lead qualification"],
  },
  {
    id: "pipeline",
    title: "Growth Pipeline",
    tagline: "Close deals on autopilot",
    description: "Turn cold traffic into paying customers with an AI-driven pipeline that scores leads, predicts conversions, and nurtures deals automatically.",
    icon: TrendingUp,
    stat: "3.2x",
    statLabel: "Avg conversion lift",
    gradient: "from-purple-500 to-indigo-500",
    details: ["AI lead scoring", "Conversion prediction", "Auto deal flow", "Revenue attribution"],
  },
  {
    id: "automation",
    title: "Smart Automation",
    tagline: "Work while you sleep",
    description: "Build powerful no-code workflows that handle scheduling, responses, content posting, and complex multi-step tasks — completely hands-free.",
    icon: Workflow,
    stat: "10x",
    statLabel: "Time saved",
    gradient: "from-blue-500 to-cyan-500",
    details: ["No-code builder", "Smart triggers", "Multi-step flows", "Always-on systems"],
  },
  {
    id: "presence",
    title: "Digital Presence",
    tagline: "Own every platform",
    description: "Manage every social platform from one command center. AI schedules content, analyzes trends, and maximizes your visibility everywhere.",
    icon: Network,
    stat: "15+",
    statLabel: "Platforms",
    gradient: "from-pink-500 to-fuchsia-500",
    details: ["Multi-platform sync", "Trend detection", "AI scheduling", "Content optimization"],
  },
  {
    id: "targeting",
    title: "Audience Targeting",
    tagline: "Find your people",
    description: "AI-powered audience discovery identifies high-value prospects across platforms. Competitor analysis and engagement signals drive precision targeting.",
    icon: Crosshair,
    stat: "98%",
    statLabel: "Match accuracy",
    gradient: "from-violet-500 to-purple-500",
    details: ["Audience discovery", "Competitor analysis", "Engagement signals", "Lookalike targeting"],
  },
  {
    id: "revenue",
    title: "Revenue Intelligence",
    tagline: "Scale what works",
    description: "Real-time analytics, revenue forecasting, and performance insights. See exactly what drives revenue and double down on winning strategies.",
    icon: LineChart,
    stat: "Live",
    statLabel: "Real-time data",
    gradient: "from-emerald-500 to-teal-500",
    details: ["Live dashboards", "Revenue forecasting", "Growth tracking", "ROI attribution"],
  },
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? "/pricing" : "/auth";
  const [activeFeature, setActiveFeature] = useState(0);

  const active = features[activeFeature];

  return (
    <section id="services" className="py-28 relative overflow-hidden">
      {/* Ambient effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-purple-500/[0.025] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.02] blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">
              All-in-One Platform
            </span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-white tracking-tight">
            How Uplyze{" "}
            <span className="uplyze-highlight">Grows Your Business</span>
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto leading-relaxed">
            Six powerful engines working together to automate your growth from first touch to revenue.
          </p>
        </motion.div>

        {/* Interactive Feature Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16"
        >
          {/* Feature selector tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {features.map((feature, i) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(i)}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                  activeFeature === i
                    ? "bg-white/[0.08] text-white border border-white/[0.15] shadow-lg"
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <feature.icon className={`h-3.5 w-3.5 transition-colors duration-300 ${activeFeature === i ? "text-white" : ""}`} />
                <span className="hidden sm:inline">{feature.title}</span>
                {activeFeature === i && (
                  <motion.div
                    layoutId="active-tab-glow"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${feature.gradient} opacity-[0.06]`}
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Active feature detail */}
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${active.gradient} opacity-30`} />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0">
              {/* Left: Content */}
              <div className="p-8 lg:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${active.gradient} flex items-center justify-center shadow-lg relative`}>
                    <active.icon className="h-5 w-5 text-white relative z-10" />
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${active.gradient} opacity-40 blur-xl`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{active.title}</h3>
                    <p className="text-xs text-white/35">{active.tagline}</p>
                  </div>
                </div>

                <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-lg">
                  {active.description}
                </p>

                {/* Feature details grid */}
                <div className="grid grid-cols-2 gap-3">
                  {active.details.map((detail, i) => (
                    <motion.div
                      key={detail}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors duration-300"
                    >
                      <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${active.gradient} flex-shrink-0`} />
                      <span className="text-white/50 text-xs">{detail}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: Stat + Visual */}
              <div className="relative border-t lg:border-t-0 lg:border-l border-white/[0.06] flex flex-col items-center justify-center p-8 lg:p-10">
                <div className={`absolute inset-0 bg-gradient-to-br ${active.gradient} opacity-[0.03]`} />
                <div className="relative text-center">
                  <motion.div
                    key={`${active.id}-stat`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                  >
                    <span className={`text-6xl lg:text-7xl font-bold bg-gradient-to-br ${active.gradient} bg-clip-text text-transparent`}>
                      {active.stat}
                    </span>
                  </motion.div>
                  <p className="text-white/30 text-xs mt-2 uppercase tracking-widest font-medium">{active.statLabel}</p>

                  {/* Decorative ring */}
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-dashed ${active.gradient === "from-orange-500 to-rose-500" ? "border-orange-500/10" : active.gradient === "from-purple-500 to-indigo-500" ? "border-purple-500/10" : active.gradient === "from-blue-500 to-cyan-500" ? "border-blue-500/10" : active.gradient === "from-pink-500 to-fuchsia-500" ? "border-pink-500/10" : active.gradient === "from-violet-500 to-purple-500" ? "border-violet-500/10" : "border-emerald-500/10"} pointer-events-none`} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom quick-glance strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-16"
        >
          {features.map((feature, i) => (
            <motion.button
              key={feature.id}
              onClick={() => setActiveFeature(i)}
              whileHover={{ y: -2 }}
              className={`relative group flex flex-col items-center gap-2.5 p-5 rounded-xl border transition-all duration-300 text-center ${
                activeFeature === i
                  ? "bg-white/[0.05] border-white/[0.12]"
                  : "bg-white/[0.015] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03]"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center ${activeFeature === i ? "opacity-100" : "opacity-50 group-hover:opacity-75"} transition-opacity duration-300`}>
                <feature.icon className="h-4 w-4 text-white" />
              </div>
              <span className={`text-[11px] font-medium leading-tight ${activeFeature === i ? "text-white/80" : "text-white/35 group-hover:text-white/55"} transition-colors duration-300`}>
                {feature.title}
              </span>
              {activeFeature === i && (
                <motion.div
                  layoutId="active-strip"
                  className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r ${feature.gradient} opacity-60`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center gap-3"
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
            Start Growing Today
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => navigate("/services")}
            className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/60 transition-colors duration-300"
          >
            Explore All Features
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;

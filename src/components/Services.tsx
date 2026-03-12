import { Workflow, TrendingUp, Crosshair, Network, Send, LineChart, CheckCircle2, ArrowRight, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const services = [
  {
    title: "Automated Outreach",
    description: "AI handles DMs, follow-ups, and conversations 24/7 so you never miss an opportunity.",
    icon: Send,
    bullets: ["Smart DM sequences", "Auto follow-ups", "Lead qualification"],
    iconGradient: "from-orange-500 to-pink-500",
    glowColor: "orange",
  },
  {
    title: "Growth Pipeline",
    description: "AI-driven pipeline that scores leads, predicts conversions, and closes deals for you.",
    icon: TrendingUp,
    bullets: ["AI lead scoring", "Conversion prediction", "Auto deal flow"],
    iconGradient: "from-purple-500 to-indigo-500",
    glowColor: "purple",
  },
  {
    title: "Smart Automation",
    description: "Build powerful no-code workflows that handle scheduling, responses, and tasks while you sleep.",
    icon: Workflow,
    bullets: ["No-code workflows", "Smart triggers", "Always-on systems"],
    iconGradient: "from-blue-500 to-cyan-500",
    glowColor: "blue",
  },
  {
    title: "Digital Presence",
    description: "Manage every platform from one dashboard. AI schedules content and maximizes visibility.",
    icon: Network,
    bullets: ["Multi-platform sync", "Trend detection", "AI scheduling"],
    iconGradient: "from-pink-500 to-rose-500",
    glowColor: "pink",
  },
  {
    title: "Audience Targeting",
    description: "Find your ideal audience with AI-powered discovery. Engage high-value prospects automatically.",
    icon: Crosshair,
    bullets: ["Audience discovery", "Competitor analysis", "Engagement signals"],
    iconGradient: "from-violet-500 to-purple-500",
    glowColor: "violet",
  },
  {
    title: "Revenue Intelligence",
    description: "Real-time analytics, revenue forecasting, and performance insights to scale what matters.",
    icon: LineChart,
    bullets: ["Live dashboards", "Revenue forecasting", "Growth tracking"],
    iconGradient: "from-emerald-500 to-teal-500",
    glowColor: "emerald",
  }
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? '/pricing' : '/auth';

  return (
    <section id="services" className="py-24 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-purple-500/[0.03] blur-[120px] pointer-events-none" />

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
            Whether you're a creator, agency, or brand — Uplyze AI works around the clock to expand your reach and drive revenue.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={item}
              className="group relative"
            >
              {/* Card */}
              <div className="relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-7 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:-translate-y-1">
                {/* Top gradient line */}
                <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${service.iconGradient} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                {/* Icon */}
                <div className="relative mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.iconGradient} flex items-center justify-center shadow-lg`}>
                    <service.icon className="h-5 w-5 text-white" />
                  </div>
                  {/* Icon glow on hover */}
                  <div className={`absolute inset-0 w-12 h-12 rounded-xl bg-gradient-to-br ${service.iconGradient} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500`} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2.5 tracking-tight">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-white/40 text-sm leading-relaxed mb-5">
                  {service.description}
                </p>

                {/* Bullets */}
                <ul className="space-y-2">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2.5 text-white/45 text-xs group-hover:text-white/60 transition-colors duration-300">
                      <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${service.iconGradient} flex-shrink-0`} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {/* Hover arrow */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                  <ArrowRight className="h-4 w-4 text-white/30" />
                </div>
              </div>
            </motion.div>
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
            onClick={() => navigate('/services')}
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

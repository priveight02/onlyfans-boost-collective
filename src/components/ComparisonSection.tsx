import { motion } from "framer-motion";
import { X, Check, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const withoutItems = [
  { highlight: "Manually managing", suffix: " DMs across 10+ platforms" },
  { highlight: "Guessing", suffix: " which content will convert" },
  { text: "Losing leads because you reply ", highlight: "too late" },
  { highlight: "Paying $1,500+/mo", suffix: " for 5 different tools" },
  { text: "Scaling feels ", highlight: "impossible", suffix: " without a big team" },
  { highlight: "No AI insights", suffix: ", flying blind on strategy" },
];

const withItems = [
  { text: "Full ", highlight: "AI Copilot", suffix: " — strategize & execute from one place" },
  { highlight: "Auto-replies & DM automation", suffix: " across all platforms 24/7" },
  { text: "AI-powered ", highlight: "content scoring & viral prediction" },
  { text: "Generates ", highlight: "videos, images & ad creatives", suffix: " instantly" },
  { highlight: "Lead scoring & revenue forecasting", suffix: " in real time" },
  { text: "One ", highlight: "all-in-one suite replacing 10+ tools" },
];

const ComparisonSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="relative -mt-8 py-24">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-heading tracking-tight">
            Why This Works
            <br />
            <span className="uplyze-highlight pb-1">When Nothing Else Did</span>
          </h2>
          <p className="text-white/50 text-lg max-w-lg mx-auto">
            Stop juggling tools. Start scaling with AI.
          </p>
        </motion.div>

        {/* Two-column comparison */}
        <div className="relative">
          {/* Center arrow pill — absolutely centered on the divider */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 200 }}
            className="absolute inset-0 z-20 hidden md:flex items-center justify-center pointer-events-none"
          >
            <button
              onClick={() => navigate(user ? "/pricing" : "/auth")}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                boxShadow: "0 0 24px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.15)",
              }}
              title="Start scaling"
            >
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.06]">
            {/* WITHOUT */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative p-8 lg:p-10 bg-white/[0.015] md:border-r border-b md:border-b-0 border-white/[0.06]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-transparent pointer-events-none" />

              <div className="relative">
                <div className="mb-7 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <X className="h-4 w-4 text-red-400" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-red-400/80">Without Uplyze</span>
                </div>

                <ul className="space-y-1">
                  {withoutItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5"
                    >
                      <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <X className="h-2.5 w-2.5 text-red-400/70" />
                      </span>
                      <span className="text-white/50 text-sm leading-relaxed">
                        {item.text || ""}
                        <span className="text-red-400/80 font-medium">{item.highlight}</span>
                        {item.suffix || ""}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* WITH */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="relative p-8 lg:p-10 bg-white/[0.015]"
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/[0.03] to-transparent pointer-events-none" />

              <div className="relative">
                <div className="mb-7 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400/80">With Uplyze</span>
                </div>

                <ul className="space-y-1">
                  {withItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5"
                    >
                      <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <Check className="h-2.5 w-2.5 text-emerald-400/70" />
                      </span>
                      <span className="text-white/50 text-sm leading-relaxed">
                        {item.text || ""}
                        <span className="text-emerald-400/80 font-medium">{item.highlight}</span>
                        {item.suffix || ""}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* CTA below comparison */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <button
              onClick={() => navigate(user ? "/pricing" : "/auth")}
              className="group inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                boxShadow: "0 6px 24px hsl(var(--primary) / 0.3)",
              }}
            >
              <Zap className="h-4 w-4" />
              Start Scaling Now
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
            <span className="text-xs text-white/35">No credit card required · Free to start</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;

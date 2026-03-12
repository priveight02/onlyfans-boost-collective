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
  const goToPricing = () => navigate(user ? "/pricing" : "/auth");

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

        {/* Comparison container */}
        <div className="relative">
          {/* Arrow button — pinned to vertical & horizontal center of the grid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 200 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:block"
          >
            <button
              onClick={goToPricing}
              className="flex h-13 w-13 items-center justify-center rounded-full cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                boxShadow: "0 0 20px hsl(var(--primary) / 0.45), 0 0 50px hsl(var(--primary) / 0.12), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
              }}
              title="Start scaling"
            >
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-white/[0.06]">
            {/* WITHOUT panel */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative p-8 lg:p-10 md:border-r border-b md:border-b-0 border-white/[0.06]"
              style={{ background: "linear-gradient(160deg, hsl(0 60% 50% / 0.04) 0%, transparent 40%)" }}
            >
              <div className="relative">
                {/* Label */}
                <div className="mb-8 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/[0.08] ring-1 ring-red-500/15">
                    <X className="h-4.5 w-4.5 text-red-400" />
                  </span>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-red-400/70">Without Uplyze</span>
                    <span className="block text-[10px] text-white/25 mt-0.5">The old way</span>
                  </div>
                </div>

                {/* Items */}
                <ul className="space-y-0.5">
                  {withoutItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                      className="group flex items-start gap-3 rounded-xl px-3 py-3 -mx-1 transition-colors duration-200 hover:bg-red-500/[0.03]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/[0.08] ring-1 ring-red-500/10 transition-colors group-hover:bg-red-500/[0.12]">
                        <X className="h-2.5 w-2.5 text-red-400/60" />
                      </span>
                      <span className="text-white/45 text-[13.5px] leading-relaxed">
                        {item.text || ""}
                        <span className="text-red-400/75 font-medium">{item.highlight}</span>
                        {item.suffix || ""}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* WITH panel */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="relative p-8 lg:p-10"
              style={{ background: "linear-gradient(200deg, hsl(160 60% 45% / 0.04) 0%, transparent 40%)" }}
            >
              <div className="relative">
                {/* Label */}
                <div className="mb-8 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/[0.08] ring-1 ring-emerald-500/15">
                    <Check className="h-4.5 w-4.5 text-emerald-400" />
                  </span>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400/70">With <span className="uplyze-highlight">Uplyze</span></span>
                    <span className="block text-[10px] text-white/25 mt-0.5">The smart way</span>
                  </div>
                </div>

                {/* Items */}
                <ul className="space-y-0.5">
                  {withItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                      className="group flex items-start gap-3 rounded-xl px-3 py-3 -mx-1 transition-colors duration-200 hover:bg-emerald-500/[0.03]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/[0.08] ring-1 ring-emerald-500/10 transition-colors group-hover:bg-emerald-500/[0.12]">
                        <Check className="h-2.5 w-2.5 text-emerald-400/60" />
                      </span>
                      <span className="text-white/50 text-[13.5px] leading-relaxed">
                        {item.text || ""}
                        <span className="text-emerald-400/75 font-medium">{item.highlight}</span>
                        {item.suffix || ""}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 flex flex-col items-center gap-3"
          >
            <button
              onClick={goToPricing}
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
            <span className="text-[11px] text-white/30">No credit card required · Free to start</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;

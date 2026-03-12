import { motion } from "framer-motion";
import { X, Check, ArrowRight, Sparkles } from "lucide-react";

const withoutItems = [
  { text: "", highlight: "Manually managing", suffix: " DMs across 10+ platforms" },
  { text: "", highlight: "Guessing", suffix: " which content will convert" },
  { text: "Losing leads because you reply ", highlight: "too late", suffix: "" },
  { text: "", highlight: "Paying $1,500+/mo", suffix: " for 5 different tools" },
  { text: "Scaling feels ", highlight: "impossible", suffix: " without a big team" },
  { text: "", highlight: "No AI insights", suffix: ", flying blind on strategy" },
];

const withItems = [
  { text: "Full ", highlight: "AI Copilot", suffix: ", chat, strategize, and execute from one command center" },
  { text: "", highlight: "Auto-replies & DM automation", suffix: " across all platforms 24/7" },
  { text: "AI-powered ", highlight: "content scoring, viral prediction", suffix: " & script builder" },
  { text: "Generates ", highlight: "videos, images, voiceovers & ad creatives", suffix: " instantly" },
  { text: "AI ", highlight: "lead scoring, deal tracking & revenue forecasting", suffix: " in real time" },
  { text: "One ", highlight: "all-in-one AI suite replacing 10+ tools", suffix: ", CRM, scheduling, analytics & more" },
];

const ComparisonSection = () => {
  return (
    <section className="relative -mt-8 py-24">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Before & After Uplyze
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-heading tracking-tight">
            Why This Works
            <br />
            <span className="uplyze-highlight pb-1">When Nothing Else Did</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Stop juggling tools. Start scaling with AI.
          </p>
        </motion.div>

        {/* Comparison layout */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Diagonal divider pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 hidden md:flex"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.1] bg-background shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </motion.div>

          {/* WITHOUT side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl md:rounded-r-none border border-white/[0.06] bg-white/[0.02] p-8 lg:p-10 overflow-hidden"
          >
            {/* Subtle red glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-red-500/[0.06] blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                  <X className="h-5 w-5 text-red-400" />
                </span>
                <h3 className="text-lg lg:text-xl font-bold text-white">
                  Without <span className="text-red-400">Uplyze</span>
                </h3>
              </div>

              <ul className="space-y-3.5">
                {withoutItems.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.25 + i * 0.06 }}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                      <X className="h-3 w-3 text-red-400/80" />
                    </span>
                    <span className="text-white/60 text-sm leading-relaxed">
                      {item.text}
                      <span className="text-red-400/90 font-medium">{item.highlight}</span>
                      {item.suffix || ""}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* WITH side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative rounded-2xl md:rounded-l-none border border-white/[0.06] md:border-l-0 bg-white/[0.02] p-8 lg:p-10 overflow-hidden"
          >
            {/* Subtle green glow */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-emerald-500/[0.06] blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Check className="h-5 w-5 text-emerald-400" />
                </span>
                <h3 className="text-lg lg:text-xl font-bold text-white">
                  With <span className="uplyze-highlight">Uplyze</span>
                </h3>
              </div>

              <ul className="space-y-3.5">
                {withItems.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <Check className="h-3 w-3 text-emerald-400/80" />
                    </span>
                    <span className="text-white/60 text-sm leading-relaxed">
                      {item.text}
                      <span className="text-emerald-400/90 font-medium">{item.highlight}</span>
                      {item.suffix || ""}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;

import { motion } from "framer-motion";
import { X, Check, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import mascotWithout from "@/assets/mascot-without.png";
import mascotWith from "@/assets/mascot-with.png";

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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 font-heading tracking-tight">
            Why This Works
            <br />
            <span className="uplyze-highlight pb-1">When Nothing Else Did</span>
          </h2>
          <p className="text-white/50 text-base max-w-lg mx-auto">
            Stop juggling tools. Start scaling with AI.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* WITHOUT card */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative rounded-2xl border border-red-500/15 bg-white/[0.015] p-8 lg:p-10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.04] to-transparent pointer-events-none" />

            <div className="relative">
              {/* Mascot centered at top */}
              <div className="flex justify-center mb-6">
                <div className="relative w-40 h-40">
                  <div className="absolute inset-2 rounded-full bg-red-400/[0.08] blur-2xl" />
                  <img src={mascotWithout} alt="Without Uplyze" className="relative w-full h-full object-contain drop-shadow-xl" />
                </div>
              </div>

              {/* Title sentence */}
              <h3 className="text-lg lg:text-xl font-bold text-white mb-5">
                Most businesses <span className="text-red-400">fail</span> at scaling because:
              </h3>

              {/* Items */}
              <ul className="space-y-1">
                {withoutItems.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
                    className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-red-500/[0.03]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/[0.08]">
                      <X className="h-2.5 w-2.5 text-red-400/60" />
                    </span>
                    <span className="text-white/45 text-sm leading-relaxed">
                      {item.text || ""}
                      <span className="text-red-400/75 font-medium">{item.highlight}</span>
                      {item.suffix || ""}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* WITH card */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="relative rounded-2xl border border-emerald-500/15 bg-white/[0.015] p-8 lg:p-10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/[0.04] to-transparent pointer-events-none" />

            <div className="relative">
              {/* Mascot centered at top */}
              <div className="flex justify-center mb-6">
                <div className="relative w-40 h-40">
                  <div className="absolute inset-2 rounded-full bg-emerald-400/[0.08] blur-2xl" />
                  <img src={mascotWith} alt="With Uplyze" className="relative w-full h-full object-contain drop-shadow-xl" />
                </div>
              </div>

              {/* Title sentence */}
              <h3 className="text-lg lg:text-xl font-bold text-white mb-5">
                <span className="uplyze-highlight">Uplyze</span> wins because it's <span className="text-emerald-400">built to scale:</span>
              </h3>

              {/* Items */}
              <ul className="space-y-1">
                {withItems.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.25 + i * 0.04 }}
                    className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-emerald-500/[0.03]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/[0.08]">
                      <Check className="h-2.5 w-2.5 text-emerald-400/60" />
                    </span>
                    <span className="text-white/50 text-sm leading-relaxed">
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
          className="mt-8 flex flex-col items-center gap-3"
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
    </section>
  );
};

export default ComparisonSection;

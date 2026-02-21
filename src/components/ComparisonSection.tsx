import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const withoutItems = [
  "Manually managing DMs across 10+ platforms",
  "Guessing which content will convert",
  "Losing leads because you reply too late",
  "Paying $500+/mo for 5 different tools",
  "Scaling feels impossible without a big team",
];

const withItems = [
  "AI auto-replies & DM automation across all platforms",
  "AI-powered content scoring & viral prediction",
  "Instant AI responses 24/7 — never miss a lead",
  "One all-in-one platform replacing 10+ tools",
  "Scale to $50k+/mo with AI doing the heavy lifting",
];

const ComparisonSection = () => {
  return (
    <section className="relative py-24 overflow-hidden" style={{ background: 'hsl(222, 35%, 8%)' }}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, hsl(270, 70%, 60%), transparent 70%)' }} />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, hsl(217, 91%, 50%), transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-white mb-4 font-heading tracking-tight"
        >
          Why This Works
          <br />
          <span className="bg-clip-text text-transparent pb-1" style={{ backgroundImage: 'linear-gradient(135deg, #c084fc, #60a5fa)' }}>
            When Nothing Else Did
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-white/50 text-center text-lg mb-16 max-w-xl mx-auto"
        >
          Stop juggling tools. Start scaling with AI.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* WITHOUT card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl p-8 lg:p-10 border border-red-500/20 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 12%) 100%)' }}
          >
            {/* Red glow top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ef4444, transparent 70%)' }} />

            <div className="relative">
              {/* Sad emoji / icon area */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15), rgba(239,68,68,0.05))' }}>
                  <span className="text-5xl">😩</span>
                </div>
              </div>

              <h3 className="text-xl lg:text-2xl font-bold mb-6">
                <span className="text-red-400">Most businesses fail</span>
                <span className="text-white"> at scaling because:</span>
              </h3>

              <ul className="space-y-4">
                {withoutItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-red-500/15">
                      <X className="w-4 h-4 text-red-400" />
                    </span>
                    <span className="text-white/70 text-[15px] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* WITH card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative rounded-2xl p-8 lg:p-10 border border-emerald-500/20 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 12%) 100%)' }}
          >
            {/* Green glow top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />

            <div className="relative">
              {/* Happy emoji / icon area */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' }}>
                  <span className="text-5xl">🚀</span>
                </div>
              </div>

              <h3 className="text-xl lg:text-2xl font-bold mb-6">
                <span className="text-white">Uplyze wins because </span>
                <span className="text-emerald-400">it's built to scale:</span>
              </h3>

              <ul className="space-y-4">
                {withItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-emerald-500/15">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </span>
                    <span className="text-white/70 text-[15px] leading-relaxed">{item}</span>
                  </li>
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

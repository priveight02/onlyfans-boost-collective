import { Send, TrendingUp, Workflow, Network, Crosshair, LineChart, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import mascotWith from "@/assets/mascot-with.png";

const services = [
  {
    title: "Automated Outreach",
    description: "AI handles DMs & follow-ups 24/7",
    icon: Send,
    color: "from-orange-500 to-pink-500",
  },
  {
    title: "Growth Pipeline",
    description: "AI scores leads & closes deals",
    icon: TrendingUp,
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Smart Automation",
    description: "No-code workflows, always on",
    icon: Workflow,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Digital Presence",
    description: "Multi-platform AI scheduling",
    icon: Network,
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Audience Targeting",
    description: "Find & engage ideal prospects",
    icon: Crosshair,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Revenue Intelligence",
    description: "Real-time analytics & forecasting",
    icon: LineChart,
    color: "from-emerald-500 to-teal-500",
  },
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? "/pricing" : "/auth";

  return (
    <section id="services" className="py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-purple-500/[0.03] blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
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
            The Uplyze{" "}
            <span className="uplyze-highlight">Express</span>
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto leading-relaxed">
            Hop aboard — 6 powerful features, one unstoppable train. Your growth engine runs 24/7.
          </p>
        </motion.div>

        {/* Train Scene */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[hsl(222,40%,12%)] via-[hsl(222,35%,10%)] to-[hsl(222,30%,6%)]"
          style={{ height: "420px" }}
        >
          {/* Sky - Stars */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  top: `${Math.random() * 40}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.2,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${Math.random() * 2 + 2}s`,
                }}
              />
            ))}
          </div>

          {/* Moon */}
          <div className="absolute top-8 right-16 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-[0_0_30px_rgba(255,255,200,0.3)]" />

          {/* Mountains - far */}
          <svg className="absolute bottom-24 left-0 w-full" viewBox="0 0 1400 120" preserveAspectRatio="none" style={{ animation: "landscape-scroll 40s linear infinite" }}>
            <polygon points="0,120 100,40 200,80 350,20 500,70 650,30 800,60 950,15 1100,55 1250,25 1400,50 1400,120" fill="hsl(222, 30%, 14%)" />
            <polygon points="1400,120 1500,40 1600,80 1750,20 1900,70 2050,30 2200,60 2350,15 2500,55 2650,25 2800,50 2800,120" fill="hsl(222, 30%, 14%)" />
          </svg>

          {/* Mountains - near */}
          <svg className="absolute bottom-24 left-0 w-full" viewBox="0 0 1400 100" preserveAspectRatio="none" style={{ animation: "landscape-scroll 25s linear infinite" }}>
            <polygon points="0,100 150,30 300,65 450,10 600,50 750,25 900,55 1050,15 1200,45 1400,20 1400,100" fill="hsl(222, 28%, 11%)" />
            <polygon points="1400,100 1550,30 1700,65 1850,10 2000,50 2150,25 2300,55 2450,15 2600,45 2800,20 2800,100" fill="hsl(222, 28%, 11%)" />
          </svg>

          {/* Ground */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(222,25%,6%)] to-[hsl(222,28%,9%)]" />

          {/* Rails */}
          <div className="absolute bottom-[72px] left-0 right-0">
            {/* Rail ties scrolling */}
            <div className="relative h-4 overflow-hidden">
              <div className="flex gap-6 absolute" style={{ animation: "rails-scroll 1.5s linear infinite" }}>
                {[...Array(100)].map((_, i) => (
                  <div key={i} className="w-4 h-3 bg-amber-900/60 rounded-sm flex-shrink-0" />
                ))}
              </div>
            </div>
            {/* Rail bars */}
            <div className="h-[3px] bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 mt-0.5 shadow-[0_0_6px_rgba(200,200,200,0.15)]" />
            <div className="h-[3px] bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 mt-3 shadow-[0_0_6px_rgba(200,200,200,0.15)]" />
          </div>

          {/* Speed lines / aspiration effect at the back (right side since train goes left-to-right) */}
          <div className="absolute bottom-[70px] right-0 w-48 h-20 overflow-hidden pointer-events-none" style={{ transform: "scaleX(-1)" }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute h-[1.5px] bg-gradient-to-r from-white/30 to-transparent rounded"
                style={{
                  top: `${15 + i * 8}%`,
                  right: 0,
                  width: `${40 + Math.random() * 60}%`,
                  animation: `speed-line ${0.4 + Math.random() * 0.5}s linear infinite`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Smoke / Steam puffs from locomotive */}
          <div className="absolute left-[40px] bottom-[190px] pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/10"
                style={{
                  width: `${14 + i * 6}px`,
                  height: `${14 + i * 6}px`,
                  animation: `smoke-puff ${2 + i * 0.4}s ease-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>

          {/* === THE TRAIN === */}
          <div className="absolute bottom-[88px] left-0 right-0 flex items-end" style={{ animation: "train-idle 3s ease-in-out infinite" }}>

            {/* Locomotive */}
            <div className="relative flex-shrink-0 ml-4" style={{ width: "120px" }}>
              {/* Locomotive body */}
              <div className="relative">
                {/* Chimney */}
                <div className="absolute -top-10 left-6 w-5 h-10 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg border border-white/10" />
                <div className="absolute -top-12 left-4 w-9 h-4 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg border border-white/10" />

                {/* Main body */}
                <div className="h-16 rounded-l-2xl rounded-r-lg bg-gradient-to-br from-red-600 via-red-700 to-red-900 border border-white/10 relative overflow-hidden">
                  {/* Metallic stripe */}
                  <div className="absolute top-2 left-0 right-0 h-1 bg-yellow-400/40" />
                  <div className="absolute bottom-3 left-0 right-0 h-0.5 bg-yellow-400/30" />
                  {/* Headlight */}
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(255,255,100,0.6)]" />
                </div>

                {/* Cowcatcher */}
                <div className="absolute -left-3 bottom-0 w-6 h-6">
                  <div className="w-full h-full bg-gradient-to-r from-gray-500 to-gray-600 clip-triangle border-t border-white/10" style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }} />
                </div>

                {/* Wheels */}
                <div className="absolute -bottom-3 left-3 w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-500 shadow-lg" style={{ animation: "wheel-spin 0.8s linear infinite" }}>
                  <div className="absolute inset-1 rounded-full border border-gray-500/50" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-500/50" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-500/50" />
                </div>
                <div className="absolute -bottom-3 right-3 w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-500 shadow-lg" style={{ animation: "wheel-spin 0.8s linear infinite" }}>
                  <div className="absolute inset-1 rounded-full border border-gray-500/50" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-500/50" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-500/50" />
                </div>
              </div>

              {/* Conductor - on top of locomotive */}
              <div className="absolute -top-[88px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="relative w-20 h-20">
                  <img
                    src={mascotWith}
                    alt="Uplyze Conductor"
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                  {/* Uplyze logo badge on chest */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full overflow-hidden border border-white/20 shadow-lg bg-[hsl(222,35%,8%)]">
                    <img src="/lovable-uploads/uplyze-logo.png" alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>

            {/* Connector loco -> wagons */}
            <div className="flex-shrink-0 w-4 h-2 bg-gray-600 self-center mb-4" />

            {/* Wagons */}
            {services.map((service, idx) => (
              <div key={service.title} className="flex items-end flex-shrink-0">
                {/* Wagon */}
                <div className="relative" style={{ width: "170px" }}>
                  {/* Wagon body */}
                  <div className="h-[100px] rounded-lg bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.1] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.2] transition-all duration-300">
                    {/* Top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${service.color}`} />
                    
                    {/* Content */}
                    <div className="p-3 flex flex-col items-center text-center h-full justify-center">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-1.5 shadow-lg`}>
                        <service.icon className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="text-[11px] font-bold text-white leading-tight mb-0.5">{service.title}</h4>
                      <p className="text-[9px] text-white/40 leading-snug">{service.description}</p>
                    </div>

                    {/* Wagon number */}
                    <div className="absolute top-1.5 right-2 text-[8px] font-mono text-white/20">{String(idx + 1).padStart(2, '0')}</div>
                  </div>

                  {/* Wheels */}
                  <div className="absolute -bottom-2.5 left-4 w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-[1.5px] border-gray-500" style={{ animation: "wheel-spin 0.8s linear infinite" }}>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-500/50" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-500/50" />
                  </div>
                  <div className="absolute -bottom-2.5 right-4 w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-[1.5px] border-gray-500" style={{ animation: "wheel-spin 0.8s linear infinite" }}>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-500/50" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-500/50" />
                  </div>
                </div>

                {/* Connector between wagons */}
                {idx < services.length - 1 && (
                  <div className="flex-shrink-0 w-3 h-1.5 bg-gray-600 self-center mb-5" />
                )}
              </div>
            ))}

            {/* Tail speed particles */}
            <div className="flex-shrink-0 relative w-20 self-center mb-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-[1px] bg-gradient-to-l from-white/20 to-transparent"
                  style={{
                    top: `${-15 + i * 7}px`,
                    left: "8px",
                    width: `${20 + Math.random() * 40}px`,
                    animation: `speed-line ${0.3 + Math.random() * 0.4}s linear infinite`,
                    animationDelay: `${Math.random() * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center gap-3 mt-10"
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
            All Aboard — Start Growing
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

      {/* Keyframe animations */}
      <style>{`
        @keyframes wheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes train-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes speed-line {
          0% { opacity: 0; transform: translateX(0); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translateX(40px); }
        }
        @keyframes smoke-puff {
          0% { opacity: 0.3; transform: translate(0, 0) scale(0.5); }
          50% { opacity: 0.15; }
          100% { opacity: 0; transform: translate(-30px, -40px) scale(2); }
        }
        @keyframes landscape-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes rails-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-40px); }
        }
      `}</style>
    </section>
  );
};

export default Services;

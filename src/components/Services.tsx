import { Send, TrendingUp, Workflow, Network, Crosshair, LineChart, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import conductorImg from "@/assets/train-conductor.png";

const services = [
  {
    title: "Automated Outreach",
    description: "AI handles DMs, follow-ups & conversations 24/7 so you never miss a lead.",
    icon: Send,
    color: "#f97316",
    gradient: "from-orange-500 to-pink-500",
  },
  {
    title: "Growth Pipeline",
    description: "AI-driven pipeline that scores leads, predicts conversions & closes deals.",
    icon: TrendingUp,
    color: "#a855f7",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    title: "Smart Automation",
    description: "No-code workflows that handle scheduling, responses & tasks while you sleep.",
    icon: Workflow,
    color: "#3b82f6",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Digital Presence",
    description: "Manage every platform from one dashboard. AI schedules & maximizes visibility.",
    icon: Network,
    color: "#ec4899",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    title: "Audience Targeting",
    description: "Find ideal audiences with AI-powered discovery. Engage high-value prospects.",
    icon: Crosshair,
    color: "#8b5cf6",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    title: "Revenue Intelligence",
    description: "Real-time analytics, revenue forecasting & performance insights to scale.",
    icon: LineChart,
    color: "#10b981",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? "/pricing" : "/auth";

  return (
    <section id="services" className="py-24 relative overflow-hidden">
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
          className="relative w-full overflow-hidden rounded-2xl border border-white/[0.06]"
          style={{ height: "460px", background: "linear-gradient(180deg, hsl(222 45% 8%) 0%, hsl(222 40% 11%) 30%, hsl(222 35% 9%) 70%, hsl(222 30% 5%) 100%)" }}
        >
          {/* Stars */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(60)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 2.5 + 0.5}px`,
                  height: `${Math.random() * 2.5 + 0.5}px`,
                  top: `${Math.random() * 35}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.15,
                  animation: `star-twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 4}s`,
                }}
              />
            ))}
          </div>

          {/* Moon with glow */}
          <div className="absolute top-10 left-20">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-100 shadow-[0_0_60px_20px_rgba(255,255,200,0.12)]" />
            <div className="absolute top-1 left-3 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200/30 to-transparent" />
          </div>

          {/* Far mountains with snow caps */}
          <svg className="absolute bottom-[120px] left-0 w-[200%]" viewBox="0 0 2800 150" preserveAspectRatio="none" style={{ animation: "landscape-far 60s linear infinite" }}>
            <defs>
              <linearGradient id="mtnFar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(222, 30%, 18%)" />
                <stop offset="100%" stopColor="hsl(222, 30%, 12%)" />
              </linearGradient>
            </defs>
            <polygon points="0,150 80,50 160,90 280,20 400,75 520,35 640,65 760,10 900,60 1020,30 1140,70 1300,15 1400,55 1400,150" fill="url(#mtnFar)" />
            <polygon points="1400,150 1480,50 1560,90 1680,20 1800,75 1920,35 2040,65 2160,10 2300,60 2420,30 2540,70 2700,15 2800,55 2800,150" fill="url(#mtnFar)" />
            {/* Snow caps */}
            <polygon points="280,20 260,35 300,35" fill="hsl(222, 20%, 30%)" opacity="0.5" />
            <polygon points="760,10 740,28 780,28" fill="hsl(222, 20%, 30%)" opacity="0.5" />
            <polygon points="1300,15 1280,32 1320,32" fill="hsl(222, 20%, 30%)" opacity="0.5" />
          </svg>

          {/* Near mountains / hills */}
          <svg className="absolute bottom-[100px] left-0 w-[200%]" viewBox="0 0 2800 100" preserveAspectRatio="none" style={{ animation: "landscape-near 35s linear infinite" }}>
            <defs>
              <linearGradient id="mtnNear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(222, 28%, 12%)" />
                <stop offset="100%" stopColor="hsl(222, 25%, 8%)" />
              </linearGradient>
            </defs>
            <polygon points="0,100 120,35 240,60 360,15 500,50 620,25 780,55 900,20 1060,48 1200,12 1400,40 1400,100" fill="url(#mtnNear)" />
            <polygon points="1400,100 1520,35 1640,60 1760,15 1900,50 2020,25 2180,55 2300,20 2460,48 2600,12 2800,40 2800,100" fill="url(#mtnNear)" />
          </svg>

          {/* Trees silhouettes scrolling */}
          <svg className="absolute bottom-[90px] left-0 w-[200%] h-[50px]" viewBox="0 0 2800 50" preserveAspectRatio="none" style={{ animation: "landscape-trees 20s linear infinite" }}>
            {[...Array(40)].map((_, i) => {
              const x = i * 70 + Math.random() * 30;
              const h = 15 + Math.random() * 25;
              return (
                <polygon
                  key={i}
                  points={`${x},50 ${x + 5},${50 - h} ${x + 10},50`}
                  fill="hsl(222, 25%, 7%)"
                />
              );
            })}
          </svg>

          {/* Ground with grass texture */}
          <div className="absolute bottom-0 left-0 right-0 h-[100px]">
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(140,15%,6%)] via-[hsl(150,12%,8%)] to-[hsl(160,10%,9%)]" />
            {/* Grass tufts */}
            <div className="absolute top-0 left-0 w-[200%] h-3" style={{ animation: "landscape-trees 15s linear infinite" }}>
              {[...Array(80)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 w-1 bg-green-900/30 rounded-t"
                  style={{
                    left: `${i * 2.5}%`,
                    height: `${4 + Math.random() * 8}px`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Gravel bed under rails */}
          <div className="absolute bottom-[56px] left-0 right-0 h-5 bg-gradient-to-t from-amber-950/40 to-amber-900/20 rounded-t-sm" />

          {/* Rails */}
          <div className="absolute bottom-[60px] left-0 right-0">
            {/* Rail ties */}
            <div className="relative h-5 overflow-hidden">
              <div className="flex gap-[18px] absolute w-[200%]" style={{ animation: "rails-scroll 0.6s linear infinite" }}>
                {[...Array(200)].map((_, i) => (
                  <div key={i} className="w-5 h-4 bg-gradient-to-b from-amber-800/70 to-amber-950/50 rounded-[1px] flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                ))}
              </div>
            </div>
            {/* Steel rails */}
            <div className="h-[3px] bg-gradient-to-r from-gray-400/70 via-gray-300/50 to-gray-400/70 shadow-[0_0_4px_rgba(200,200,200,0.15),0_1px_0_rgba(255,255,255,0.1)]" style={{ marginTop: "-2px" }} />
            <div className="h-[3px] bg-gradient-to-r from-gray-400/70 via-gray-300/50 to-gray-400/70 shadow-[0_0_4px_rgba(200,200,200,0.15),0_1px_0_rgba(255,255,255,0.1)]" style={{ marginTop: "10px" }} />
          </div>

          {/* Speed lines at the LEFT (back of train since it faces right) */}
          <div className="absolute bottom-[65px] left-0 w-36 h-24 overflow-hidden pointer-events-none z-10">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute h-[2px] rounded-full"
                style={{
                  top: `${8 + i * 7}%`,
                  left: 0,
                  width: `${30 + Math.random() * 70}%`,
                  background: `linear-gradient(to right, rgba(255,255,255,${0.15 + Math.random() * 0.15}), transparent)`,
                  animation: `speed-line-right ${0.3 + Math.random() * 0.4}s linear infinite`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Spark particles from wheels */}
          <div className="absolute bottom-[60px] left-[15%] pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-yellow-400"
                style={{
                  animation: `spark ${0.4 + Math.random() * 0.3}s ease-out infinite`,
                  animationDelay: `${Math.random() * 0.8}s`,
                }}
              />
            ))}
          </div>

          {/* === THE TRAIN — faces RIGHT === */}
          <div className="absolute bottom-[72px] left-0 right-0 flex items-end flex-row-reverse pr-6" style={{ animation: "train-idle 2.5s ease-in-out infinite" }}>

            {/* ═══ LOCOMOTIVE (rightmost, faces right) ═══ */}
            <div className="relative flex-shrink-0" style={{ width: "140px" }}>
              {/* Smoke stack */}
              <div className="absolute -top-14 right-8 w-6 h-14 bg-gradient-to-t from-gray-600 via-gray-500 to-gray-600 rounded-t-md border border-white/10 shadow-inner">
                <div className="absolute inset-x-0 -top-2 h-3 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg border border-white/10" style={{ width: "130%", left: "-15%" }} />
              </div>

              {/* Steam dome */}
              <div className="absolute -top-6 right-20 w-8 h-6 rounded-t-full bg-gradient-to-t from-red-700 to-red-600 border border-white/10" />

              {/* Boiler (cylindrical look) */}
              <div className="h-[52px] rounded-r-[28px] rounded-l-lg bg-gradient-to-b from-red-500 via-red-700 to-red-900 border border-red-400/20 relative overflow-hidden shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-3px_6px_rgba(0,0,0,0.3)]">
                {/* Boiler bands */}
                <div className="absolute top-3 left-0 right-0 h-[2px] bg-yellow-400/50" />
                <div className="absolute top-[18px] left-0 right-0 h-[1px] bg-yellow-400/30" />
                <div className="absolute bottom-3 left-0 right-0 h-[2px] bg-yellow-400/50" />
                {/* Rivets */}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-yellow-600/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" style={{ top: "6px", left: `${12 + i * 18}px` }} />
                ))}
                {/* Headlight */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-[0_0_20px_6px_rgba(255,255,100,0.4)]">
                  <div className="absolute inset-1 rounded-full bg-yellow-100/80" />
                </div>
                {/* Light beam */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-12 pointer-events-none" style={{ background: "linear-gradient(to right, rgba(255,255,150,0.08), transparent)", clipPath: "polygon(0 30%, 100% 0, 100% 100%, 0 70%)" }} />
              </div>

              {/* Cab */}
              <div className="absolute left-0 -top-[30px] w-[50px] h-[82px] bg-gradient-to-b from-red-600 to-red-800 rounded-t-lg border border-red-400/20 overflow-hidden shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
                {/* Windows */}
                <div className="absolute top-2 left-2 right-2 h-6 rounded-sm bg-sky-400/15 border border-white/10 shadow-[inset_0_0_6px_rgba(100,200,255,0.1)]" />
                {/* Window reflection */}
                <div className="absolute top-2 left-2 w-2 h-5 bg-white/10 rounded-sm" />
                {/* Door line */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1px] h-[42px] bg-white/10" />
                {/* Roof overhang */}
                <div className="absolute -top-1 -left-1 -right-1 h-3 bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-lg border border-white/10" />
              </div>

              {/* Cowcatcher (pilot) on the right */}
              <div className="absolute -right-4 bottom-0 w-8" style={{ height: "20px" }}>
                <svg viewBox="0 0 32 20" className="w-full h-full">
                  <polygon points="0,0 32,10 0,20" fill="hsl(0, 0%, 35%)" />
                  <line x1="0" y1="0" x2="32" y2="10" stroke="hsl(0, 0%, 45%)" strokeWidth="1" />
                  <line x1="0" y1="7" x2="24" y2="10" stroke="hsl(0, 0%, 45%)" strokeWidth="0.5" />
                  <line x1="0" y1="13" x2="24" y2="10" stroke="hsl(0, 0%, 45%)" strokeWidth="0.5" />
                  <line x1="0" y1="20" x2="32" y2="10" stroke="hsl(0, 0%, 45%)" strokeWidth="1" />
                </svg>
              </div>

              {/* Drive wheels - big */}
              {[20, 55, 90].map((pos, i) => (
                <div
                  key={i}
                  className="absolute -bottom-4 rounded-full bg-gradient-to-br from-gray-600 to-gray-900 border-[2.5px] border-gray-400 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                  style={{
                    left: `${pos}px`,
                    width: i === 1 ? "28px" : "24px",
                    height: i === 1 ? "28px" : "24px",
                    animation: "wheel-spin 0.5s linear infinite",
                  }}
                >
                  <div className="absolute inset-[3px] rounded-full border border-gray-500/40" />
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-400/50" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-400/50" />
                  <div className="absolute inset-0 rotate-45">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-400/30" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-400/30" />
                  </div>
                  {/* Hub */}
                  <div className="absolute inset-[35%] rounded-full bg-gray-500 shadow-inner" />
                </div>
              ))}

              {/* Connecting rod between wheels */}
              <div className="absolute bottom-[-2px] left-[28px] w-[72px] h-[3px] bg-gray-500/50 rounded" style={{ animation: "rod-slide 0.5s ease-in-out infinite" }} />

              {/* Conductor image - visible in cab */}
              <div className="absolute -top-[100px] left-[-20px] w-[80px] h-[80px] z-20">
                <img
                  src={conductorImg}
                  alt="Uplyze Train Conductor"
                  className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>

            {/* Coupler loco → tender */}
            <div className="flex-shrink-0 w-4 h-3 bg-gradient-to-b from-gray-500 to-gray-700 rounded self-center mb-5 shadow-md" />

            {/* ═══ WAGONS (trail to the left) ═══ */}
            {services.map((service, idx) => (
              <div key={service.title} className="flex items-end flex-shrink-0">
                {/* Coupler */}
                {idx > 0 && (
                  <div className="flex-shrink-0 w-3 h-2 bg-gradient-to-b from-gray-500 to-gray-700 rounded self-center mb-5 shadow-md" />
                )}

                {/* Wagon */}
                <div className="relative flex-shrink-0" style={{ width: "160px" }}>
                  {/* Wagon body - realistic boxcar shape */}
                  <div className="relative h-[110px] overflow-hidden" style={{
                    background: "linear-gradient(180deg, hsl(222, 30%, 16%) 0%, hsl(222, 25%, 11%) 50%, hsl(222, 20%, 8%) 100%)",
                    borderRadius: "6px 6px 2px 2px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)",
                  }}>
                    {/* Roof with slight curve */}
                    <div className="absolute -top-[2px] -left-[1px] -right-[1px] h-[6px] rounded-t-md" style={{
                      background: "linear-gradient(180deg, hsl(222, 25%, 20%), hsl(222, 28%, 15%))",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }} />

                    {/* Top color accent stripe */}
                    <div className={`absolute top-[6px] left-0 right-0 h-[3px] bg-gradient-to-r ${service.gradient} opacity-70`} />

                    {/* Panel lines (riveted look) */}
                    <div className="absolute top-[6px] left-[53px] w-[1px] h-full bg-white/[0.04]" />
                    <div className="absolute top-[6px] left-[106px] w-[1px] h-full bg-white/[0.04]" />

                    {/* Rivets along top */}
                    <div className="absolute top-[12px] left-2 right-2 flex justify-between">
                      {[...Array(8)].map((_, ri) => (
                        <div key={ri} className="w-1 h-1 rounded-full bg-white/[0.06]" />
                      ))}
                    </div>

                    {/* Content inside wagon */}
                    <div className="relative z-10 p-3 pt-5 flex flex-col items-center text-center h-full justify-center">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${service.color}, ${service.color}88)`,
                          boxShadow: `0 4px 14px ${service.color}30`,
                        }}
                      >
                        <service.icon className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="text-[11px] font-bold text-white leading-tight mb-1 tracking-tight">{service.title}</h4>
                      <p className="text-[8.5px] text-white/35 leading-snug px-1">{service.description}</p>
                    </div>

                    {/* Wagon number plate */}
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                      <span className="text-[7px] font-mono text-white/20">UPL-{String(idx + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Bottom frame */}
                    <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-b from-gray-800/80 to-gray-900 border-t border-white/[0.04]" />
                  </div>

                  {/* Undercarriage / truck frame */}
                  <div className="absolute -bottom-1 left-3 right-3 h-[6px] bg-gradient-to-b from-gray-700 to-gray-800 rounded-b shadow-md" />

                  {/* Wheel trucks (bogies) */}
                  {[16, 116].map((wx) => (
                    <div key={wx} className="absolute -bottom-4 flex gap-1" style={{ left: `${wx}px` }}>
                      {[0, 1].map((wi) => (
                        <div
                          key={wi}
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-600 to-gray-900 border-2 border-gray-400 shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                          style={{ animation: "wheel-spin 0.5s linear infinite" }}
                        >
                          <div className="absolute inset-[2px] rounded-full border border-gray-500/30" />
                          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-400/40" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-400/40" />
                          <div className="absolute inset-[30%] rounded-full bg-gray-500/60" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Caboose end lantern */}
            <div className="flex-shrink-0 relative self-center mb-8 ml-1">
              <div className="w-3 h-4 bg-gradient-to-t from-red-700 to-red-500 rounded-t-full border border-white/10 shadow-[0_0_8px_rgba(255,50,50,0.3)]" />
            </div>
          </div>

          {/* Smoke / Steam from chimney */}
          <div className="absolute right-[85px] bottom-[280px] pointer-events-none z-10">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${10 + i * 8}px`,
                  height: `${10 + i * 8}px`,
                  background: `radial-gradient(circle, rgba(200,200,200,${0.12 - i * 0.012}) 0%, transparent 70%)`,
                  animation: `smoke-puff-right ${2 + i * 0.5}s ease-out infinite`,
                  animationDelay: `${i * 0.35}s`,
                }}
              />
            ))}
          </div>

          {/* Ambient lighting effect */}
          <div className="absolute bottom-[60px] right-[10%] w-40 h-20 bg-yellow-400/[0.03] blur-2xl rounded-full pointer-events-none" />
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

      <style>{`
        @keyframes wheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes train-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes rod-slide {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        @keyframes speed-line-right {
          0% { opacity: 0; transform: translateX(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50px); }
        }
        @keyframes smoke-puff-right {
          0% { opacity: 0.2; transform: translate(0, 0) scale(0.4); }
          40% { opacity: 0.1; }
          100% { opacity: 0; transform: translate(30px, -50px) scale(2.5); }
        }
        @keyframes spark {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(${-10 + Math.random() * -20}px, ${-5 + Math.random() * -15}px) scale(0); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.7; }
        }
        @keyframes landscape-far {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes landscape-near {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes landscape-trees {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes rails-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-23px); }
        }
      `}</style>
    </section>
  );
};

export default Services;

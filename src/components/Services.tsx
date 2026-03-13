import { Send, TrendingUp, Workflow, Crosshair, LineChart, Zap, ArrowRight, Sparkles, Train } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";

const services = [
  { title: "Automated Outreach", description: "AI handles DMs, follow-ups & lead nurturing around the clock", icon: Send, color: "#f97316", glow: "rgba(249,115,22,0.25)" },
  { title: "Growth Pipeline", description: "AI scores leads, qualifies prospects & closes deals automatically", icon: TrendingUp, color: "#a855f7", glow: "rgba(168,85,247,0.25)" },
  { title: "Smart Automation", description: "No-code workflows that run your entire business on autopilot", icon: Workflow, color: "#3b82f6", glow: "rgba(59,130,246,0.25)" },
  { title: "Audience Targeting", description: "Find, engage & convert your ideal audience with AI precision", icon: Crosshair, color: "#8b5cf6", glow: "rgba(139,92,246,0.25)" },
  { title: "Revenue Intelligence", description: "Real-time analytics, forecasting & actionable growth insights", icon: LineChart, color: "#10b981", glow: "rgba(16,185,129,0.25)" },
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? "/pricing" : "/auth";
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" ref={sectionRef} className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">All-in-One Platform</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-white tracking-tight">
            The Uplyze <span className="uplyze-highlight">Express</span>
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto leading-relaxed">
            Hop aboard — 5 powerful features, one unstoppable train. Your growth engine runs 24/7.
          </p>
        </motion.div>

        {/* Browser Window — premium glass panel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(222, 28%, 13%) 0%, hsl(222, 35%, 8%) 100%)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 0 0 rgba(255,255,255,0.05) inset',
          }}
        >
          {/* Premium Chrome Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]" style={{ background: 'linear-gradient(180deg, hsl(222, 28%, 13%) 0%, hsl(222, 30%, 11%) 100%)' }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57', boxShadow: '0 0 6px rgba(255,95,87,0.4)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e', boxShadow: '0 0 6px rgba(254,188,46,0.4)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840', boxShadow: '0 0 6px rgba(40,200,64,0.4)' }} />
              </div>
              <div className="w-px h-4 bg-white/[0.06] ml-2" />
              <div className="flex items-center gap-1.5 ml-1">
                <Train className="w-3.5 h-3.5 text-purple-400/60" />
                <span className="text-white/40 text-[11px] font-semibold tracking-wide">Uplyze Express</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400/80 text-[10px] font-bold tracking-wider uppercase">Live</span>
              </div>
            </div>
          </div>

          {/* Train Scene */}
          <div className="train-scene-v2">
            {isVisible && (
              <>
                {/* SKY — gradient only, no JS */}
                <div className="ts-sky" />

                {/* STARS */}
                <div className="ts-star" style={{ top: '6%', left: '12%' }} />
                <div className="ts-star" style={{ top: '14%', left: '35%' }} />
                <div className="ts-star" style={{ top: '4%', left: '58%' }} />
                <div className="ts-star" style={{ top: '10%', left: '78%' }} />
                <div className="ts-star" style={{ top: '18%', left: '92%' }} />
                <div className="ts-star" style={{ top: '8%', left: '48%' }} />

                {/* MOON */}
                <div className="ts-moon" />

                {/* NYC SKYLINE — far layer (scrolls slowly) */}
                <div className="ts-skyline-wrap">
                  <svg className="ts-skyline" viewBox="0 0 2800 220" preserveAspectRatio="none">
                    {/* Building cluster 1 */}
                    <rect x="30" y="65" width="38" height="155" fill="hsl(222,25%,13%)" rx="2" />
                    <rect x="34" y="72" width="5" height="7" fill="hsl(45,80%,55%)" opacity="0.25" rx="1" />
                    <rect x="44" y="72" width="5" height="7" fill="hsl(45,80%,55%)" opacity="0.15" rx="1" />
                    <rect x="34" y="85" width="5" height="7" fill="hsl(200,60%,45%)" opacity="0.2" rx="1" />

                    <rect x="90" y="28" width="55" height="192" fill="hsl(222,28%,11%)" rx="3" />
                    <rect x="95" y="35" width="7" height="9" fill="hsl(45,80%,55%)" opacity="0.3" rx="1" />
                    <rect x="107" y="35" width="7" height="9" fill="hsl(200,60%,45%)" opacity="0.2" rx="1" />
                    <rect x="119" y="35" width="7" height="9" fill="hsl(45,80%,55%)" opacity="0.15" rx="1" />
                    <rect x="95" y="52" width="7" height="9" fill="hsl(200,60%,45%)" opacity="0.25" rx="1" />
                    <rect x="107" y="52" width="7" height="9" fill="hsl(45,80%,55%)" opacity="0.35" rx="1" />
                    <polygon points="115,28 118,10 121,28" fill="hsl(222,22%,15%)" />
                    <circle cx="118" cy="8" r="2" fill="hsl(0,80%,50%)" opacity="0.5" />

                    <rect x="170" y="50" width="42" height="170" fill="hsl(222,22%,12%)" rx="2" />
                    <rect x="175" y="58" width="6" height="8" fill="hsl(45,80%,55%)" opacity="0.2" rx="1" />
                    <rect x="185" y="58" width="6" height="8" fill="hsl(200,60%,45%)" opacity="0.3" rx="1" />

                    <rect x="235" y="12" width="65" height="208" fill="hsl(222,30%,10%)" rx="3" />
                    <rect x="240" y="20" width="8" height="10" fill="hsl(45,80%,55%)" opacity="0.3" rx="1" />
                    <rect x="254" y="20" width="8" height="10" fill="hsl(200,60%,45%)" opacity="0.15" rx="1" />
                    <rect x="268" y="20" width="8" height="10" fill="hsl(45,80%,55%)" opacity="0.25" rx="1" />
                    <rect x="240" y="38" width="8" height="10" fill="hsl(200,60%,45%)" opacity="0.2" rx="1" />
                    <rect x="254" y="38" width="8" height="10" fill="hsl(45,80%,55%)" opacity="0.35" rx="1" />
                    <rect x="268" y="38" width="8" height="10" fill="hsl(200,60%,45%)" opacity="0.1" rx="1" />
                    <polygon points="262,12 267,0 272,12" fill="hsl(222,25%,14%)" />

                    <rect x="325" y="48" width="48" height="172" fill="hsl(222,26%,11.5%)" rx="2" />
                    <rect x="330" y="55" width="6" height="8" fill="hsl(45,80%,55%)" opacity="0.2" rx="1" />
                    <rect x="340" y="55" width="6" height="8" fill="hsl(200,60%,45%)" opacity="0.25" rx="1" />
                    <rect x="350" y="55" width="6" height="8" fill="hsl(45,80%,55%)" opacity="0.3" rx="1" />

                    <rect x="398" y="72" width="32" height="148" fill="hsl(222,24%,12.5%)" rx="2" />
                    <rect x="403" y="80" width="5" height="7" fill="hsl(45,80%,55%)" opacity="0.2" rx="1" />

                    <rect x="455" y="22" width="58" height="198" fill="hsl(222,28%,10.5%)" rx="3" />
                    <rect x="460" y="30" width="7" height="9" fill="hsl(45,80%,55%)" opacity="0.3" rx="1" />
                    <rect x="472" y="30" width="7" height="9" fill="hsl(200,60%,45%)" opacity="0.2" rx="1" />
                    <rect x="484" y="30" width="7" height="9" fill="hsl(45,80%,55%)" opacity="0.15" rx="1" />

                    <rect x="538" y="58" width="40" height="162" fill="hsl(222,23%,13%)" rx="2" />
                    <rect x="600" y="35" width="52" height="185" fill="hsl(222,27%,11%)" rx="2" />
                    <rect x="605" y="42" width="7" height="9" fill="hsl(45,80%,55%)" opacity="0.2" rx="1" />
                    <rect x="617" y="42" width="7" height="9" fill="hsl(200,60%,45%)" opacity="0.3" rx="1" />

                    {/* Duplicate for seamless loop */}
                    <rect x="700" y="65" width="38" height="155" fill="hsl(222,25%,13%)" rx="2" />
                    <rect x="760" y="28" width="55" height="192" fill="hsl(222,28%,11%)" rx="3" />
                    <rect x="840" y="50" width="42" height="170" fill="hsl(222,22%,12%)" rx="2" />
                    <rect x="905" y="12" width="65" height="208" fill="hsl(222,30%,10%)" rx="3" />
                    <polygon points="932,12 937,0 942,12" fill="hsl(222,25%,14%)" />
                    <rect x="995" y="48" width="48" height="172" fill="hsl(222,26%,11.5%)" rx="2" />
                    <rect x="1068" y="72" width="32" height="148" fill="hsl(222,24%,12.5%)" rx="2" />
                    <rect x="1125" y="22" width="58" height="198" fill="hsl(222,28%,10.5%)" rx="3" />
                    <rect x="1208" y="58" width="40" height="162" fill="hsl(222,23%,13%)" rx="2" />
                    <rect x="1270" y="35" width="52" height="185" fill="hsl(222,27%,11%)" rx="2" />
                    <rect x="1370" y="65" width="38" height="155" fill="hsl(222,25%,13%)" rx="2" />
                  </svg>
                </div>

                {/* NEAR SKYLINE — closer buildings (scrolls faster) */}
                <div className="ts-skyline-near-wrap">
                  <svg className="ts-skyline-near" viewBox="0 0 2400 140" preserveAspectRatio="none">
                    <rect x="20" y="40" width="55" height="100" fill="hsl(222,20%,9%)" rx="2" />
                    <rect x="100" y="20" width="40" height="120" fill="hsl(222,18%,8%)" rx="2" />
                    <rect x="165" y="55" width="35" height="85" fill="hsl(222,22%,9.5%)" rx="2" />
                    <rect x="225" y="10" width="50" height="130" fill="hsl(222,20%,7.5%)" rx="3" />
                    <rect x="300" y="35" width="45" height="105" fill="hsl(222,18%,8.5%)" rx="2" />
                    <rect x="370" y="50" width="30" height="90" fill="hsl(222,22%,9%)" rx="2" />
                    <rect x="425" y="15" width="55" height="125" fill="hsl(222,20%,8%)" rx="3" />
                    <rect x="505" y="45" width="40" height="95" fill="hsl(222,18%,9%)" rx="2" />
                    <rect x="570" y="25" width="48" height="115" fill="hsl(222,22%,8%)" rx="2" />
                    <rect x="645" y="60" width="35" height="80" fill="hsl(222,20%,9.5%)" rx="2" />
                    {/* Duplicate */}
                    <rect x="720" y="40" width="55" height="100" fill="hsl(222,20%,9%)" rx="2" />
                    <rect x="800" y="20" width="40" height="120" fill="hsl(222,18%,8%)" rx="2" />
                    <rect x="865" y="55" width="35" height="85" fill="hsl(222,22%,9.5%)" rx="2" />
                    <rect x="925" y="10" width="50" height="130" fill="hsl(222,20%,7.5%)" rx="3" />
                    <rect x="1000" y="35" width="45" height="105" fill="hsl(222,18%,8.5%)" rx="2" />
                    <rect x="1070" y="50" width="30" height="90" fill="hsl(222,22%,9%)" rx="2" />
                    <rect x="1125" y="15" width="55" height="125" fill="hsl(222,20%,8%)" rx="3" />
                    <rect x="1205" y="45" width="40" height="95" fill="hsl(222,18%,9%)" rx="2" />
                  </svg>
                </div>

                {/* GROUND */}
                <div className="ts-ground" />

                {/* GRAVEL */}
                <div className="ts-gravel" />

                {/* RAILS */}
                <div className="ts-rails">
                  <div className="ts-ties" />
                  <div className="ts-rail ts-rail-t" />
                  <div className="ts-rail ts-rail-b" />
                </div>

                {/* SPEED LINES */}
                <div className="ts-speed">
                  <div className="ts-speed-l" style={{ top: '15%', animationDuration: '0.55s' }} />
                  <div className="ts-speed-l" style={{ top: '35%', animationDuration: '0.4s', animationDelay: '0.12s' }} />
                  <div className="ts-speed-l" style={{ top: '55%', animationDuration: '0.5s', animationDelay: '0.25s' }} />
                  <div className="ts-speed-l" style={{ top: '75%', animationDuration: '0.45s', animationDelay: '0.08s' }} />
                </div>

                {/* SMOKE */}
                <div className="ts-smoke">
                  <div className="ts-puff" style={{ animationDelay: '0s' }} />
                  <div className="ts-puff" style={{ animationDelay: '0.7s' }} />
                  <div className="ts-puff" style={{ animationDelay: '1.4s' }} />
                </div>

                {/* ══════ THE TRAIN ══════ */}
                <div className="ts-train">
                  {/* LOCOMOTIVE */}
                  <div className="ts-loco">
                    {/* Chimney */}
                    <div className="ts-chimney">
                      <div className="ts-chimney-cap" />
                    </div>
                    {/* Steam dome */}
                    <div className="ts-dome" />
                    {/* Bell */}
                    <div className="ts-bell" />
                    {/* Boiler */}
                    <div className="ts-boiler">
                      <div className="ts-band" style={{ top: 6 }} />
                      <div className="ts-band" style={{ top: 20 }} />
                      <div className="ts-band" style={{ bottom: 6 }} />
                      {/* Headlight */}
                      <div className="ts-headlight">
                        <div className="ts-beam" />
                      </div>
                      {/* Boiler rivets */}
                      <div className="ts-rivet" style={{ top: 12, left: 15 }} />
                      <div className="ts-rivet" style={{ top: 12, left: 35 }} />
                      <div className="ts-rivet" style={{ top: 12, left: 55 }} />
                      <div className="ts-rivet" style={{ bottom: 12, left: 25 }} />
                      <div className="ts-rivet" style={{ bottom: 12, left: 45 }} />
                    </div>
                    {/* Cab */}
                    <div className="ts-cab">
                      <div className="ts-cab-roof" />
                      <div className="ts-cab-win" />
                      <div className="ts-cab-win ts-cab-win-2" />
                      {/* Logo */}
                      <div className="ts-cab-logo">
                        <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze" className="ts-cab-logo-img" />
                      </div>
                    </div>
                    {/* Cowcatcher */}
                    <div className="ts-cow">
                      <div className="ts-cow-bar" />
                      <div className="ts-cow-bar ts-cow-bar-2" />
                    </div>
                    {/* Drive wheels — large */}
                    <div className="ts-drv ts-drv-1">
                      <div className="ts-spoke" />
                      <div className="ts-spoke ts-spoke-2" />
                      <div className="ts-hub" />
                    </div>
                    <div className="ts-drv ts-drv-2">
                      <div className="ts-spoke" />
                      <div className="ts-spoke ts-spoke-2" />
                      <div className="ts-hub" />
                    </div>
                    {/* Small front wheel */}
                    <div className="ts-fwh">
                      <div className="ts-hub ts-hub-sm" />
                    </div>
                    {/* Connecting rod */}
                    <div className="ts-rod" />
                    {/* Steam pipe */}
                    <div className="ts-pipe" />
                  </div>

                  {/* Coupler from loco */}
                  <div className="ts-coupler" />

                  {/* WAGONS */}
                  {services.map((service, idx) => (
                    <div key={service.title} className="ts-wagon-grp">
                      {idx > 0 && <div className="ts-coupler" />}
                      <div className="ts-wagon">
                        {/* Wagon body — realistic boxcar */}
                        <div className="ts-wbody">
                          {/* Side panels */}
                          <div className="ts-wpanel" />
                          <div className="ts-wpanel ts-wpanel-2" />
                          {/* Roof ridge */}
                          <div className="ts-wroof" />
                          {/* Feature bubble */}
                          <div className="ts-bubble" style={{ boxShadow: `0 0 20px ${service.glow}, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
                            <div className="ts-bubble-icon" style={{ background: service.color, boxShadow: `0 2px 12px ${service.glow}` }}>
                              <service.icon style={{ width: 14, height: 14, color: 'white' }} />
                            </div>
                            <div className="ts-bubble-title">{service.title}</div>
                            <div className="ts-bubble-desc">{service.description}</div>
                          </div>
                          {/* Serial plate */}
                          <div className="ts-plate">UPL-{String(idx + 1).padStart(2, '0')}</div>
                        </div>
                        {/* Undercarriage */}
                        <div className="ts-under" />
                        {/* Bogie frames */}
                        <div className="ts-bogie ts-bogie-l">
                          <div className="ts-bframe" />
                          <div className="ts-bwh ts-bwh-1"><div className="ts-hub ts-hub-sm" /></div>
                          <div className="ts-bwh ts-bwh-2"><div className="ts-hub ts-hub-sm" /></div>
                        </div>
                        <div className="ts-bogie ts-bogie-r">
                          <div className="ts-bframe" />
                          <div className="ts-bwh ts-bwh-1"><div className="ts-hub ts-hub-sm" /></div>
                          <div className="ts-bwh ts-bwh-2"><div className="ts-hub ts-hub-sm" /></div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* End lantern */}
                  <div className="ts-lantern" />
                </div>
              </>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.05]" style={{ background: 'hsl(222, 30%, 9.5%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-white/25 text-[10px]">Express running</span>
              </div>
              <span className="text-white/10 text-[10px]">•</span>
              <span className="text-white/15 text-[10px]">5 features • 0 manual effort</span>
            </div>
            <span className="text-white/15 text-[10px]">NYC → Growth City</span>
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
          <button onClick={() => navigate("/services")} className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/60 transition-colors duration-300">
            Explore All Features <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </div>

      {/* ═══ ALL STYLES — GPU-accelerated, contain-optimized ═══ */}
      <style>{`
        /* ── SCENE ── */
        .train-scene-v2 {
          position: relative; width: 100%; height: 500px; overflow: hidden;
          contain: layout style paint;
          background: linear-gradient(180deg, hsl(222,40%,7%) 0%, hsl(222,35%,5%) 100%);
        }

        /* ── SKY ── */
        .ts-sky {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, hsl(222,45%,5%) 0%, hsl(222,35%,8%) 50%, transparent 100%);
        }
        .ts-star {
          position: absolute; width: 2px; height: 2px; border-radius: 50%; background: white;
          animation: ts-twinkle 3s ease-in-out infinite alternate;
          will-change: opacity;
        }
        .ts-star:nth-child(3) { animation-delay: 0.6s; width: 1.5px; height: 1.5px; }
        .ts-star:nth-child(5) { animation-delay: 1.2s; }
        @keyframes ts-twinkle { from { opacity: 0.1; } to { opacity: 0.55; } }

        .ts-moon {
          position: absolute; top: 28px; left: 65px; width: 52px; height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, hsl(45,60%,92%), hsl(45,50%,72%));
          box-shadow: 0 0 50px 15px rgba(255,255,200,0.06);
        }

        /* ── SKYLINE FAR ── */
        .ts-skyline-wrap {
          position: absolute; bottom: 130px; left: 0; width: 200%; height: 220px;
          animation: ts-sky-scroll 55s linear infinite;
          will-change: transform;
        }
        .ts-skyline { width: 100%; height: 100%; }
        @keyframes ts-sky-scroll { to { transform: translate3d(-50%, 0, 0); } }

        /* ── SKYLINE NEAR ── */
        .ts-skyline-near-wrap {
          position: absolute; bottom: 115px; left: 0; width: 200%; height: 140px;
          animation: ts-near-scroll 30s linear infinite;
          will-change: transform;
        }
        .ts-skyline-near { width: 100%; height: 100%; }
        @keyframes ts-near-scroll { to { transform: translate3d(-50%, 0, 0); } }

        /* ── GROUND ── */
        .ts-ground {
          position: absolute; bottom: 0; left: 0; right: 0; height: 130px;
          background: linear-gradient(to top, hsl(222,18%,3.5%), hsl(222,16%,6%) 50%, hsl(222,14%,8%));
        }

        /* ── GRAVEL ── */
        .ts-gravel {
          position: absolute; bottom: 78px; left: 0; right: 0; height: 18px;
          background: linear-gradient(to top, hsl(30,8%,10%), hsl(30,6%,14%));
          border-radius: 2px 2px 0 0;
        }

        /* ── RAILS ── */
        .ts-rails { position: absolute; bottom: 82px; left: 0; right: 0; height: 22px; }
        .ts-ties {
          position: absolute; inset: 0; overflow: hidden;
          background: repeating-linear-gradient(90deg, hsl(25,12%,12%) 0px, hsl(25,12%,12%) 7px, transparent 7px, transparent 22px);
          animation: ts-ties-scroll 0.55s linear infinite;
          will-change: transform;
        }
        @keyframes ts-ties-scroll { to { transform: translate3d(-22px, 0, 0); } }
        .ts-rail {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, hsl(0,0%,42%) 0%, hsl(0,0%,52%) 50%, hsl(0,0%,42%) 100%);
          box-shadow: 0 0 4px rgba(200,200,200,0.08), 0 1px 0 rgba(255,255,255,0.06);
        }
        .ts-rail-t { top: 2px; }
        .ts-rail-b { bottom: 2px; }

        /* ── SPEED LINES ── */
        .ts-speed {
          position: absolute; bottom: 78px; left: 0; width: 130px; height: 70px;
          overflow: hidden; pointer-events: none; z-index: 5;
        }
        .ts-speed-l {
          position: absolute; left: 0; height: 2px; width: 65%;
          background: linear-gradient(to right, rgba(255,255,255,0.18), transparent);
          border-radius: 1px;
          animation: ts-spd 0.5s linear infinite;
          will-change: transform, opacity;
        }
        @keyframes ts-spd {
          0% { opacity: 0; transform: translate3d(25px, 0, 0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(-65px, 0, 0); }
        }

        /* ── SMOKE ── */
        .ts-smoke {
          position: absolute; right: 118px; bottom: 400px; pointer-events: none; z-index: 6;
        }
        .ts-puff {
          position: absolute; width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle, rgba(180,180,180,0.1) 0%, transparent 70%);
          animation: ts-smoke-a 2.8s ease-out infinite;
          will-change: transform, opacity;
        }
        @keyframes ts-smoke-a {
          0% { opacity: 0.12; transform: translate3d(0, 0, 0) scale(0.4); }
          100% { opacity: 0; transform: translate3d(30px, -50px, 0) scale(3.5); }
        }

        /* ══════ TRAIN ══════ */
        .ts-train {
          position: absolute; bottom: 96px; right: 20px;
          display: flex; align-items: flex-end; flex-direction: row-reverse;
          animation: ts-bob 2.8s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes ts-bob {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -1.5px, 0); }
        }

        /* ── LOCOMOTIVE ── */
        .ts-loco { position: relative; width: 190px; height: 80px; flex-shrink: 0; }

        .ts-chimney {
          position: absolute; top: -22px; right: 35px; width: 12px; height: 22px;
          background: linear-gradient(to top, hsl(0,0%,28%), hsl(0,0%,38%));
          border-radius: 3px 3px 1px 1px; border: 1px solid rgba(255,255,255,0.06);
        }
        .ts-chimney-cap {
          position: absolute; top: -5px; left: -5px; right: -5px; height: 7px;
          background: linear-gradient(to top, hsl(0,0%,33%), hsl(0,0%,43%));
          border-radius: 5px 5px 0 0; border: 1px solid rgba(255,255,255,0.06);
        }

        .ts-dome {
          position: absolute; top: -12px; right: 68px; width: 18px; height: 12px;
          background: linear-gradient(to top, hsl(0,60%,32%), hsl(0,60%,42%));
          border-radius: 9px 9px 0 0; border: 1px solid rgba(255,255,255,0.06);
        }

        .ts-bell {
          position: absolute; top: -10px; right: 52px; width: 6px; height: 8px;
          background: linear-gradient(to top, hsl(45,60%,40%), hsl(45,70%,55%));
          border-radius: 3px 3px 0 0;
        }

        .ts-boiler {
          position: absolute; top: 0; right: 0; width: 135px; height: 58px;
          background: linear-gradient(180deg, hsl(0,58%,40%), hsl(0,62%,28%));
          border-radius: 0 29px 4px 4px;
          border: 1px solid rgba(255,100,100,0.12);
          box-shadow: inset 0 3px 5px rgba(255,255,255,0.08), inset 0 -4px 8px rgba(0,0,0,0.35);
          overflow: hidden;
        }
        .ts-band {
          position: absolute; left: 0; right: 0; height: 2px;
          background: hsl(45,65%,48%); opacity: 0.3;
        }
        .ts-headlight {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: radial-gradient(circle, hsl(45,100%,88%), hsl(45,90%,58%));
          box-shadow: 0 0 20px 6px rgba(255,255,100,0.3);
          border: 1px solid rgba(255,255,200,0.3);
        }
        .ts-beam {
          position: absolute; top: 50%; right: -60px; transform: translateY(-50%);
          width: 60px; height: 40px;
          background: linear-gradient(90deg, rgba(255,255,150,0.06), transparent);
          clip-path: polygon(0 35%, 100% 0, 100% 100%, 0 65%);
        }
        .ts-rivet {
          position: absolute; width: 3px; height: 3px; border-radius: 50%;
          background: hsl(0,0%,45%); box-shadow: inset 0 1px 1px rgba(255,255,255,0.15);
        }

        .ts-cab {
          position: absolute; top: -14px; left: 0; width: 60px; height: 94px;
          background: linear-gradient(180deg, hsl(0,52%,36%), hsl(0,58%,26%));
          border-radius: 8px 8px 2px 2px;
          border: 1px solid rgba(255,100,100,0.1);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .ts-cab-roof {
          position: absolute; top: -4px; left: -4px; right: -4px; height: 8px;
          background: linear-gradient(180deg, hsl(0,0%,30%), hsl(0,0%,22%));
          border-radius: 5px 5px 0 0;
        }
        .ts-cab-win {
          position: absolute; top: 10px; left: 6px; right: 6px; height: 16px;
          background: rgba(100,180,255,0.08); border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 0 8px rgba(100,200,255,0.06);
        }
        .ts-cab-win-2 { top: 30px; height: 12px; }
        .ts-cab-logo {
          position: absolute; top: 50px; left: 50%; transform: translateX(-50%);
          width: 30px; height: 30px; border-radius: 7px; overflow: hidden;
          background: hsl(222,35%,8%); border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
        }
        .ts-cab-logo-img { width: 100%; height: 100%; object-fit: cover; }

        .ts-cow {
          position: absolute; right: -10px; bottom: 2px; width: 14px; height: 22px;
        }
        .ts-cow-bar {
          position: absolute; bottom: 0; right: 0; width: 14px; height: 2px;
          background: hsl(0,0%,35%); transform: rotate(-25deg); transform-origin: right;
        }
        .ts-cow-bar-2 { transform: rotate(25deg); }

        /* Drive wheels */
        .ts-drv {
          position: absolute; bottom: -10px; width: 30px; height: 30px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(0,0%,38%), hsl(0,0%,12%));
          border: 2.5px solid hsl(0,0%,44%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          animation: ts-wh 0.5s linear infinite;
          will-change: transform;
        }
        .ts-spoke {
          position: absolute; top: 50%; left: 50%; width: 80%; height: 1.5px;
          background: hsl(0,0%,40%); transform: translate(-50%, -50%);
        }
        .ts-spoke-2 { transform: translate(-50%, -50%) rotate(90deg); }
        .ts-hub {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 8px; height: 8px; border-radius: 50%;
          background: radial-gradient(circle, hsl(0,0%,48%), hsl(0,0%,32%));
          border: 1px solid hsl(0,0%,50%);
        }
        .ts-hub-sm { width: 5px; height: 5px; }
        .ts-drv-1 { left: 18px; }
        .ts-drv-2 { left: 58px; }
        @keyframes ts-wh { to { transform: rotate(360deg); } }

        .ts-fwh {
          position: absolute; bottom: -6px; right: 18px; width: 18px; height: 18px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(0,0%,36%), hsl(0,0%,12%));
          border: 2px solid hsl(0,0%,42%);
          animation: ts-wh 0.5s linear infinite;
          will-change: transform;
        }

        .ts-rod {
          position: absolute; bottom: 5px; left: 33px; width: 42px; height: 3px;
          background: linear-gradient(90deg, hsl(0,0%,40%), hsl(0,0%,50%), hsl(0,0%,40%));
          border-radius: 1.5px;
          animation: ts-rod-a 0.5s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes ts-rod-a {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(3px, -1px, 0); }
        }

        .ts-pipe {
          position: absolute; top: 18px; right: 132px; width: 20px; height: 4px;
          background: linear-gradient(180deg, hsl(0,0%,35%), hsl(0,0%,25%));
          border-radius: 2px;
        }

        /* ── COUPLER ── */
        .ts-coupler {
          flex-shrink: 0; width: 12px; height: 7px; align-self: center; margin-bottom: 20px;
          background: linear-gradient(180deg, hsl(0,0%,36%), hsl(0,0%,24%));
          border-radius: 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
        }

        /* ── WAGON ── */
        .ts-wagon-grp { display: flex; align-items: flex-end; flex-shrink: 0; }
        .ts-wagon { position: relative; width: 175px; flex-shrink: 0; }

        .ts-wbody {
          position: relative; height: 130px; overflow: hidden;
          background: linear-gradient(180deg, hsl(222,28%,14%) 0%, hsl(222,24%,10%) 40%, hsl(222,20%,7%) 100%);
          border-radius: 4px 4px 2px 2px;
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: inset 0 1px 3px rgba(255,255,255,0.03), inset 0 -3px 6px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.4);
        }

        /* Panel grooves for realism */
        .ts-wpanel {
          position: absolute; top: 8px; bottom: 8px; width: 1px;
          background: rgba(255,255,255,0.03);
          box-shadow: 1px 0 0 rgba(0,0,0,0.2);
        }
        .ts-wpanel { left: 33%; }
        .ts-wpanel-2 { left: 66%; }

        .ts-wroof {
          position: absolute; top: -2px; left: -2px; right: -2px; height: 5px;
          background: linear-gradient(180deg, hsl(222,15%,18%), hsl(222,18%,14%));
          border-radius: 3px 3px 0 0;
          border: 1px solid rgba(255,255,255,0.04);
        }

        /* Feature bubble — glass-morphism inside wagon */
        .ts-bubble {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 82%; padding: 10px 8px; border-radius: 14px;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          text-align: center; z-index: 2;
        }
        .ts-bubble-icon {
          width: 30px; height: 30px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 6px;
        }
        .ts-bubble-title {
          font-size: 10px; font-weight: 700; color: white;
          line-height: 1.2; margin-bottom: 3px; letter-spacing: -0.01em;
        }
        .ts-bubble-desc {
          font-size: 7.5px; color: rgba(255,255,255,0.35); line-height: 1.4;
        }

        .ts-plate {
          position: absolute; bottom: 4px; right: 5px;
          font-size: 6.5px; font-family: monospace; color: rgba(255,255,255,0.12);
          padding: 1px 4px; border-radius: 2px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03);
        }

        .ts-under {
          position: absolute; bottom: -3px; left: 10px; right: 10px; height: 6px;
          background: linear-gradient(180deg, hsl(0,0%,26%), hsl(0,0%,16%));
          border-radius: 0 0 2px 2px;
        }

        /* Bogie (truck frame) */
        .ts-bogie { position: absolute; bottom: -8px; width: 44px; height: 14px; }
        .ts-bogie-l { left: 10px; }
        .ts-bogie-r { right: 10px; }
        .ts-bframe {
          position: absolute; top: 0; left: 2px; right: 2px; height: 4px;
          background: linear-gradient(180deg, hsl(0,0%,30%), hsl(0,0%,20%));
          border-radius: 1px;
        }
        .ts-bwh {
          position: absolute; bottom: -2px; width: 14px; height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(0,0%,36%), hsl(0,0%,10%));
          border: 1.5px solid hsl(0,0%,40%);
          box-shadow: 0 1px 5px rgba(0,0,0,0.45);
          animation: ts-wh 0.5s linear infinite;
          will-change: transform;
        }
        .ts-bwh-1 { left: 0; }
        .ts-bwh-2 { right: 0; }

        /* ── LANTERN ── */
        .ts-lantern {
          flex-shrink: 0; width: 7px; height: 12px; align-self: center; margin-bottom: 26px; margin-left: 5px;
          background: linear-gradient(to top, hsl(0,65%,38%), hsl(0,55%,52%));
          border-radius: 3px 3px 0 0; border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 0 8px rgba(255,50,50,0.2);
        }

        /* ── PERF: Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ts-star, .ts-skyline-wrap, .ts-skyline-near-wrap, .ts-ties,
          .ts-speed-l, .ts-puff, .ts-train, .ts-drv, .ts-fwh,
          .ts-bwh, .ts-rod { animation: none !important; }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .train-scene-v2 { height: 380px; }
          .ts-loco { width: 145px; height: 64px; }
          .ts-boiler { width: 100px; height: 46px; }
          .ts-cab { width: 48px; height: 78px; top: -10px; }
          .ts-wagon { width: 130px; }
          .ts-wbody { height: 100px; }
          .ts-bubble { padding: 7px 5px; border-radius: 10px; }
          .ts-bubble-icon { width: 24px; height: 24px; border-radius: 7px; margin-bottom: 4px; }
          .ts-bubble-icon svg { width: 11px !important; height: 11px !important; }
          .ts-bubble-title { font-size: 8.5px; }
          .ts-bubble-desc { font-size: 6.5px; }
          .ts-train { right: 10px; }
          .ts-drv { width: 24px; height: 24px; }
          .ts-fwh { width: 14px; height: 14px; }
        }

        @media (max-width: 480px) {
          .train-scene-v2 { height: 320px; }
          .ts-wagon { width: 100px; }
          .ts-wbody { height: 82px; }
          .ts-bubble-desc { display: none; }
          .ts-bubble { padding: 5px 4px; }
          .ts-bubble-icon { width: 20px; height: 20px; margin-bottom: 3px; }
          .ts-loco { width: 110px; height: 52px; }
          .ts-boiler { width: 78px; height: 38px; }
          .ts-cab { width: 38px; height: 62px; }
          .ts-wpanel, .ts-wpanel-2 { display: none; }
          .ts-skyline-near-wrap { display: none; }
        }
      `}</style>
    </section>
  );
};

export default Services;

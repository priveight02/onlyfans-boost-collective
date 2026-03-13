import { Send, TrendingUp, Workflow, Crosshair, LineChart, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";

const services = [
  { title: "Revenue Intelligence", description: "Real-time analytics, forecasting & growth insights", icon: LineChart, color: "#10b981", glow: "rgba(16,185,129,0.35)", accent: "hsl(160,84%,39%)" },
  { title: "Audience Targeting", description: "Find & convert your ideal audience with AI precision", icon: Crosshair, color: "#8b5cf6", glow: "rgba(139,92,246,0.35)", accent: "hsl(258,90%,66%)" },
  { title: "Smart Automation", description: "No-code workflows running your business on autopilot", icon: Workflow, color: "#3b82f6", glow: "rgba(59,130,246,0.35)", accent: "hsl(217,91%,60%)" },
  { title: "Growth Pipeline", description: "AI scores leads, qualifies & closes deals automatically", icon: TrendingUp, color: "#a855f7", glow: "rgba(168,85,247,0.35)", accent: "hsl(270,91%,65%)" },
  { title: "Automated Outreach", description: "AI handles DMs, follow-ups & lead nurturing 24/7", icon: Send, color: "#f97316", glow: "rgba(249,115,22,0.35)", accent: "hsl(25,95%,53%)" },
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
      { threshold: 0.05 }
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

        {/* Train Scene */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <div className="ux-scene">
            {isVisible && (
              <>
                {/* Night sky */}
                <div className="ux-sky" />
                
                {/* Stars */}
                {[
                  { t: '8%', l: '12%', d: 0 }, { t: '5%', l: '30%', d: 0.7 }, { t: '12%', l: '55%', d: 1.2 },
                  { t: '3%', l: '72%', d: 0.3 }, { t: '15%', l: '85%', d: 1.8 }, { t: '10%', l: '45%', d: 2.1 },
                  { t: '6%', l: '92%', d: 0.5 }, { t: '18%', l: '22%', d: 1.5 },
                ].map((s, i) => (
                  <div key={i} className="ux-star" style={{ top: s.t, left: s.l, animationDelay: `${s.d}s` }} />
                ))}

                {/* Moon */}
                <div className="ux-moon">
                  <div className="ux-moon-crater ux-mc1" />
                  <div className="ux-moon-crater ux-mc2" />
                  <div className="ux-moon-crater ux-mc3" />
                </div>

                {/* Distant hills - clean silhouettes */}
                <div className="ux-hills-far" />
                <div className="ux-hills-near" />

                {/* Ground plane */}
                <div className="ux-ground" />

                {/* Track bed */}
                <div className="ux-trackbed" />
                <div className="ux-ties" />
                <div className="ux-rail ux-rail-l" />
                <div className="ux-rail ux-rail-r" />

                {/* ═══════ TRAIN ═══════ */}
                <div className="ux-train">

                  {/* ═══ LOCOMOTIVE ═══ */}
                  <div className="ux-loco">
                    {/* Chimney */}
                    <div className="ux-chimney">
                      <div className="ux-chimney-cap" />
                    </div>
                    {/* Smoke puffs */}
                    <div className="ux-smoke-wrap">
                      <div className="ux-puff" style={{ animationDelay: '0s' }} />
                      <div className="ux-puff ux-puff-2" style={{ animationDelay: '1s' }} />
                      <div className="ux-puff ux-puff-3" style={{ animationDelay: '2s' }} />
                    </div>
                    {/* Steam dome */}
                    <div className="ux-dome" />
                    {/* Boiler */}
                    <div className="ux-boiler">
                      <div className="ux-boiler-band ux-bb1" />
                      <div className="ux-boiler-band ux-bb2" />
                      <div className="ux-boiler-band ux-bb3" />
                      {/* Headlight */}
                      <div className="ux-headlight">
                        <div className="ux-hl-glow" />
                      </div>
                      <div className="ux-beam" />
                    </div>
                    {/* Cab */}
                    <div className="ux-cab">
                      <div className="ux-cab-roof" />
                      <div className="ux-cab-window">
                        <div className="ux-cab-glow" />
                      </div>
                      <div className="ux-cab-logo">
                        <img src="/lovable-uploads/uplyze-logo.png" alt="U" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    {/* Cowcatcher */}
                    <div className="ux-cowcatcher" />
                    {/* Wheels */}
                    <div className="ux-lwheel ux-lw1"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-spoke ux-s3" /><div className="ux-spoke ux-s4" /><div className="ux-hub" /></div>
                    <div className="ux-lwheel ux-lw2"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-spoke ux-s3" /><div className="ux-spoke ux-s4" /><div className="ux-hub" /></div>
                    <div className="ux-lwheel ux-lw3 ux-sm-wheel"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-hub" /></div>
                    {/* Connecting rod */}
                    <div className="ux-rod" />
                  </div>

                  {/* Coupler */}
                  <div className="ux-coupler" />

                  {/* ═══ COAL TENDER ═══ */}
                  <div className="ux-tender">
                    <div className="ux-tender-body">
                      <div className="ux-coal" />
                      <div className="ux-tender-rim" />
                    </div>
                    <div className="ux-twheel ux-tw1"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-hub" /></div>
                    <div className="ux-twheel ux-tw2"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-hub" /></div>
                  </div>

                  {/* ═══ SERVICE WAGONS ═══ */}
                  {services.map((service, idx) => (
                    <div key={service.title} className="ux-wagon-group">
                      <div className="ux-coupler" />
                      <div className="ux-wagon">
                        {/* Wagon body */}
                        <div className="ux-wbody" style={{ borderColor: `${service.color}22` }}>
                          {/* Roof */}
                          <div className="ux-wroof" />
                          {/* Color accent stripe */}
                          <div className="ux-wstripe" style={{ background: service.color, boxShadow: `0 0 20px ${service.glow}` }} />
                          {/* Windows */}
                          <div className="ux-wwin ux-ww1" />
                          <div className="ux-wwin ux-ww2" />
                          <div className="ux-wwin ux-ww3" />

                          {/* ═ SERVICE BUBBLE ═ */}
                          <div className="ux-bubble" style={{ borderColor: `${service.color}40` }}>
                            <div className="ux-bub-bg" style={{ background: `radial-gradient(ellipse at center, ${service.glow}, transparent 70%)` }} />
                            <div className="ux-bub-icon" style={{ background: `linear-gradient(135deg, ${service.color}, ${service.accent})`, boxShadow: `0 4px 20px ${service.glow}` }}>
                              <service.icon style={{ width: 18, height: 18, color: 'white', strokeWidth: 2.5 }} />
                            </div>
                            <div className="ux-bub-title">{service.title}</div>
                            <div className="ux-bub-desc">{service.description}</div>
                          </div>

                          {/* Plate */}
                          <div className="ux-wplate">UPL-0{idx + 1}</div>
                        </div>
                        {/* Undercarriage */}
                        <div className="ux-under" />
                        {/* Wheels */}
                        <div className="ux-wwheel ux-wwl"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-hub" /></div>
                        <div className="ux-wwheel ux-wwr"><div className="ux-spoke" /><div className="ux-spoke ux-s2" /><div className="ux-hub" /></div>
                      </div>
                    </div>
                  ))}

                  {/* End lamp */}
                  <div className="ux-endlamp" />
                </div>
              </>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-2.5 mt-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white/30 text-[10px] font-medium">Express running</span>
              </div>
              <span className="text-white/10 text-[10px]">•</span>
              <span className="text-white/20 text-[10px]">5 services loaded</span>
            </div>
            <span className="text-white/15 text-[10px] font-mono">NYC → Growth City</span>
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

      <style>{`
        /* ═══ SCENE ═══ */
        .ux-scene {
          position: relative; width: 100%; height: 440px; overflow: hidden;
          border-radius: 20px; contain: layout style paint;
        }
        .ux-sky {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, 
            hsl(230,45%,4%) 0%, 
            hsl(225,38%,7%) 35%, 
            hsl(222,32%,10%) 65%,
            hsl(222,28%,12%) 100%
          );
        }

        /* Stars */
        .ux-star {
          position: absolute; width: 2px; height: 2px; border-radius: 50%;
          background: white; animation: ux-twinkle 4s ease-in-out infinite alternate;
        }
        @keyframes ux-twinkle { from { opacity: 0.1; } to { opacity: 0.6; } }

        /* Moon */
        .ux-moon {
          position: absolute; top: 30px; left: 60px; width: 52px; height: 52px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, hsl(48,70%,95%), hsl(45,50%,78%));
          box-shadow: 0 0 40px 12px rgba(255,255,200,0.06), 0 0 80px 25px rgba(255,255,200,0.03);
        }
        .ux-moon-crater {
          position: absolute; border-radius: 50%;
          background: rgba(0,0,0,0.06);
        }
        .ux-mc1 { width: 10px; height: 10px; top: 14px; left: 20px; }
        .ux-mc2 { width: 6px; height: 6px; top: 28px; left: 12px; }
        .ux-mc3 { width: 8px; height: 8px; top: 10px; left: 32px; opacity: 0.5; }

        /* Hills — clean SVG-free approach */
        .ux-hills-far {
          position: absolute; bottom: 110px; left: 0; right: 0; height: 120px;
          background: 
            radial-gradient(ellipse 220px 100px at 10% 100%, hsl(222,22%,7%) 70%, transparent 71%),
            radial-gradient(ellipse 300px 130px at 30% 100%, hsl(222,24%,6.5%) 70%, transparent 71%),
            radial-gradient(ellipse 180px 90px at 55% 100%, hsl(222,20%,7.5%) 70%, transparent 71%),
            radial-gradient(ellipse 350px 140px at 75% 100%, hsl(222,26%,6%) 70%, transparent 71%),
            radial-gradient(ellipse 200px 95px at 95% 100%, hsl(222,22%,7%) 70%, transparent 71%);
        }
        .ux-hills-near {
          position: absolute; bottom: 90px; left: 0; right: 0; height: 80px;
          background:
            radial-gradient(ellipse 280px 70px at 15% 100%, hsl(222,18%,5%) 70%, transparent 71%),
            radial-gradient(ellipse 350px 80px at 45% 100%, hsl(222,20%,4.5%) 70%, transparent 71%),
            radial-gradient(ellipse 250px 65px at 80% 100%, hsl(222,16%,5.5%) 70%, transparent 71%);
        }

        /* Ground */
        .ux-ground {
          position: absolute; bottom: 0; left: 0; right: 0; height: 100px;
          background: linear-gradient(to top, hsl(222,16%,3%), hsl(222,18%,5.5%));
        }

        /* Track */
        .ux-trackbed {
          position: absolute; bottom: 62px; left: 0; right: 0; height: 16px;
          background: linear-gradient(to top, hsl(25,8%,8%), hsl(25,6%,11%));
          border-radius: 2px;
        }
        .ux-ties {
          position: absolute; bottom: 64px; left: 0; right: 0; height: 12px;
          background: repeating-linear-gradient(90deg, hsl(25,12%,12%) 0px, hsl(25,12%,12%) 6px, transparent 6px, transparent 20px);
          animation: ux-tiescroll 0.5s linear infinite;
        }
        @keyframes ux-tiescroll { to { transform: translate3d(-20px, 0, 0); } }
        .ux-rail {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, hsl(0,0%,35%), hsl(0,0%,48%), hsl(0,0%,35%));
          box-shadow: 0 1px 0 rgba(255,255,255,0.05);
        }
        .ux-rail-l { bottom: 73px; }
        .ux-rail-r { bottom: 65px; }

        /* ═══ TRAIN ═══ */
        .ux-train {
          position: absolute; bottom: 72px; right: 20px;
          display: flex; align-items: flex-end; flex-direction: row-reverse;
          animation: ux-chug 2s ease-in-out infinite;
        }
        @keyframes ux-chug {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -1.5px, 0); }
        }

        /* ═══ LOCOMOTIVE ═══ */
        .ux-loco { position: relative; width: 190px; height: 90px; flex-shrink: 0; }

        /* Chimney */
        .ux-chimney {
          position: absolute; top: -22px; right: 32px; width: 16px; height: 22px;
          background: linear-gradient(180deg, hsl(0,0%,38%), hsl(0,0%,22%));
          border-radius: 3px 3px 1px 1px;
        }
        .ux-chimney-cap {
          position: absolute; top: -5px; left: -5px; right: -5px; height: 7px;
          background: linear-gradient(180deg, hsl(0,0%,42%), hsl(0,0%,30%));
          border-radius: 5px 5px 1px 1px;
        }

        /* Smoke */
        .ux-smoke-wrap { position: absolute; top: -50px; right: 28px; pointer-events: none; z-index: 5; }
        .ux-puff {
          position: absolute; width: 18px; height: 18px; border-radius: 50%;
          background: radial-gradient(circle, rgba(200,200,210,0.15), transparent 70%);
          animation: ux-smoke 3.5s ease-out infinite;
        }
        .ux-puff-2 { left: -8px; }
        .ux-puff-3 { left: 6px; }
        @keyframes ux-smoke {
          0% { opacity: 0.2; transform: translate3d(0,0,0) scale(0.4); }
          100% { opacity: 0; transform: translate3d(35px,-55px,0) scale(3.5); }
        }

        /* Dome */
        .ux-dome {
          position: absolute; top: -10px; right: 68px; width: 18px; height: 10px;
          background: linear-gradient(180deg, hsl(42,55%,52%), hsl(42,45%,36%));
          border-radius: 9px 9px 0 0;
        }

        /* Boiler */
        .ux-boiler {
          position: absolute; top: 2px; right: 0; width: 140px; height: 58px;
          background: linear-gradient(180deg, 
            hsl(0,58%,48%) 0%, hsl(0,62%,38%) 35%, hsl(0,65%,28%) 100%);
          border-radius: 0 29px 4px 4px;
          border: 1px solid rgba(255,140,140,0.12);
          box-shadow: 
            inset 0 3px 8px rgba(255,255,255,0.12),
            inset 0 -6px 14px rgba(0,0,0,0.45),
            0 8px 24px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        .ux-boiler-band {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, hsl(42,50%,40%), hsl(42,60%,50%), hsl(42,50%,40%));
          opacity: 0.3;
        }
        .ux-bb1 { top: 8px; }
        .ux-bb2 { top: 22px; }
        .ux-bb3 { bottom: 8px; }

        /* Headlight */
        .ux-headlight {
          position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
          width: 16px; height: 16px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(0,0%,60%), hsl(0,0%,35%));
          border: 2px solid hsl(0,0%,50%);
        }
        .ux-hl-glow {
          position: absolute; inset: 2px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, hsl(48,100%,92%), hsl(48,90%,65%));
          box-shadow: 0 0 20px 6px rgba(255,255,120,0.3);
        }
        .ux-beam {
          position: absolute; top: 50%; right: -70px; transform: translateY(-50%);
          width: 70px; height: 40px;
          background: linear-gradient(90deg, rgba(255,255,140,0.06), transparent);
          clip-path: polygon(0 35%, 100% 0%, 100% 100%, 0 65%);
        }

        /* Cab */
        .ux-cab {
          position: absolute; top: -15px; left: 0; width: 58px; height: 105px;
          background: linear-gradient(180deg, hsl(0,52%,40%) 0%, hsl(0,58%,30%) 50%, hsl(0,62%,22%) 100%);
          border-radius: 8px 8px 2px 2px;
          border: 1px solid rgba(255,110,110,0.1);
          box-shadow: inset 0 2px 6px rgba(255,255,255,0.08), inset 0 -4px 10px rgba(0,0,0,0.35);
          overflow: hidden;
        }
        .ux-cab-roof {
          position: absolute; top: -4px; left: -4px; right: -4px; height: 10px;
          background: linear-gradient(180deg, hsl(0,0%,32%), hsl(0,0%,22%));
          border-radius: 6px 6px 0 0;
        }
        .ux-cab-window {
          position: absolute; top: 12px; left: 7px; right: 7px; height: 22px;
          background: rgba(100,180,255,0.05);
          border-radius: 4px; border: 1.5px solid rgba(255,255,255,0.1);
        }
        .ux-cab-glow {
          position: absolute; inset: 0; border-radius: 3px;
          background: linear-gradient(135deg, rgba(255,200,100,0.06), transparent);
        }
        .ux-cab-logo {
          position: absolute; top: 44px; left: 50%; transform: translateX(-50%);
          width: 30px; height: 30px; border-radius: 8px; overflow: hidden;
          background: hsl(222,35%,8%); border: 1.5px solid rgba(255,255,255,0.12);
          box-shadow: 0 3px 12px rgba(0,0,0,0.5);
        }

        /* Cowcatcher */
        .ux-cowcatcher {
          position: absolute; right: -10px; bottom: 0; width: 0; height: 0;
          border-left: 14px solid hsl(0,0%,30%);
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        }

        /* Locomotive wheels */
        .ux-lwheel {
          position: absolute; bottom: -10px; width: 32px; height: 32px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,42%), hsl(0,0%,14%));
          border: 3px solid hsl(0,0%,48%);
          box-shadow: 0 3px 10px rgba(0,0,0,0.6);
          animation: ux-spin 0.4s linear infinite;
        }
        .ux-lw1 { left: 18px; }
        .ux-lw2 { left: 58px; }
        .ux-lw3 { right: 16px; }
        .ux-sm-wheel { width: 22px; height: 22px; bottom: -5px; border-width: 2px; }

        .ux-spoke {
          position: absolute; top: 50%; left: 50%; width: 80%; height: 1.5px;
          background: hsl(0,0%,45%); transform: translate(-50%, -50%);
        }
        .ux-s2 { transform: translate(-50%,-50%) rotate(60deg); }
        .ux-s3 { transform: translate(-50%,-50%) rotate(120deg); }
        .ux-s4 { transform: translate(-50%,-50%) rotate(45deg); }
        .ux-hub {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 7px; height: 7px; border-radius: 50%;
          background: radial-gradient(circle, hsl(0,0%,55%), hsl(0,0%,35%));
          border: 1px solid hsl(0,0%,50%);
        }
        @keyframes ux-spin { to { transform: rotate(360deg); } }

        /* Rod */
        .ux-rod {
          position: absolute; bottom: 5px; left: 28px; width: 42px; height: 3.5px;
          background: linear-gradient(90deg, hsl(0,0%,36%), hsl(0,0%,48%), hsl(0,0%,36%));
          border-radius: 2px;
          animation: ux-rod-move 0.4s ease-in-out infinite;
        }
        @keyframes ux-rod-move {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(3px,-1px,0); }
        }

        /* ═══ COUPLER ═══ */
        .ux-coupler {
          flex-shrink: 0; width: 10px; height: 6px; align-self: center; margin-bottom: 18px;
          background: linear-gradient(180deg, hsl(0,0%,36%), hsl(0,0%,20%));
          border-radius: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }

        /* ═══ TENDER ═══ */
        .ux-tender { position: relative; width: 62px; height: 54px; flex-shrink: 0; }
        .ux-tender-body {
          position: relative; height: 42px;
          background: linear-gradient(180deg, hsl(0,48%,34%) 0%, hsl(0,54%,24%) 100%);
          border-radius: 3px; border: 1px solid rgba(255,100,100,0.08);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.06), inset 0 -3px 8px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .ux-coal {
          position: absolute; top: 0; left: 2px; right: 2px; height: 16px;
          background: linear-gradient(180deg, hsl(0,0%,6%), hsl(0,0%,12%));
          border-radius: 0 0 3px 3px;
        }
        .ux-tender-rim {
          position: absolute; top: -2px; left: -1px; right: -1px; height: 4px;
          background: hsl(0,0%,28%); border-radius: 2px 2px 0 0;
        }
        .ux-twheel {
          position: absolute; bottom: -6px; width: 16px; height: 16px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,38%), hsl(0,0%,12%));
          border: 2px solid hsl(0,0%,42%);
          animation: ux-spin 0.4s linear infinite;
        }
        .ux-tw1 { left: 4px; }
        .ux-tw2 { right: 4px; }

        /* ═══ WAGONS ═══ */
        .ux-wagon-group { display: flex; align-items: flex-end; flex-shrink: 0; }
        .ux-wagon { position: relative; width: 165px; flex-shrink: 0; }
        .ux-wbody {
          position: relative; height: 120px;
          background: linear-gradient(180deg, 
            hsl(222,24%,14%) 0%, hsl(222,26%,10%) 40%, hsl(222,22%,7%) 100%);
          border-radius: 6px 6px 2px 2px;
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 
            inset 0 2px 6px rgba(255,255,255,0.04),
            inset 0 -4px 12px rgba(0,0,0,0.4),
            0 6px 20px rgba(0,0,0,0.35);
          overflow: visible;
        }

        .ux-wroof {
          position: absolute; top: -3px; left: -2px; right: -2px; height: 6px;
          background: linear-gradient(180deg, hsl(222,12%,20%), hsl(222,16%,15%));
          border-radius: 4px 4px 0 0;
        }

        .ux-wstripe {
          position: absolute; top: 0; left: 0; right: 0; height: 2.5px;
          border-radius: 6px 6px 0 0; opacity: 0.7;
        }

        .ux-wwin {
          position: absolute; top: 12px; width: 28px; height: 18px;
          background: rgba(80,160,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 3px;
        }
        .ux-ww1 { left: 10px; }
        .ux-ww2 { left: 50%; transform: translateX(-50%); }
        .ux-ww3 { right: 10px; }

        /* ═══ SERVICE BUBBLE ═══ */
        .ux-bubble {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 86%; padding: 14px 10px 12px; border-radius: 14px;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.08);
          text-align: center; z-index: 3;
        }
        .ux-bub-bg {
          position: absolute; inset: -12px; border-radius: 26px; opacity: 0.3; pointer-events: none;
        }
        .ux-bub-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 8px;
        }
        .ux-bub-title {
          font-size: 11.5px; font-weight: 800; color: white;
          line-height: 1.2; margin-bottom: 4px; letter-spacing: -0.01em;
        }
        .ux-bub-desc { font-size: 8.5px; color: rgba(255,255,255,0.4); line-height: 1.5; }

        .ux-wplate {
          position: absolute; bottom: 4px; right: 5px;
          font-size: 6.5px; font-family: monospace; font-weight: 700;
          color: rgba(255,255,255,0.12); padding: 1px 4px; border-radius: 2px;
          background: rgba(255,255,255,0.02);
        }

        /* Undercarriage */
        .ux-under {
          position: absolute; bottom: -2px; left: 10px; right: 10px; height: 5px;
          background: linear-gradient(180deg, hsl(0,0%,24%), hsl(0,0%,14%));
          border-radius: 0 0 2px 2px;
        }

        /* Wagon wheels */
        .ux-wwheel {
          position: absolute; bottom: -8px; width: 16px; height: 16px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,38%), hsl(0,0%,12%));
          border: 2px solid hsl(0,0%,42%);
          animation: ux-spin 0.4s linear infinite;
        }
        .ux-wwl { left: 14px; }
        .ux-wwr { right: 14px; }

        /* End lamp */
        .ux-endlamp {
          flex-shrink: 0; width: 6px; height: 12px; align-self: center; margin-bottom: 24px; margin-left: 6px;
          background: linear-gradient(to top, hsl(0,65%,35%), hsl(0,55%,50%));
          border-radius: 3px 3px 0 0;
          box-shadow: 0 0 10px rgba(255,40,40,0.25);
        }

        /* ═══ RESPONSIVE ═══ */
        @media (prefers-reduced-motion: reduce) {
          .ux-star, .ux-ties, .ux-puff, .ux-train, .ux-lwheel, .ux-twheel,
          .ux-wwheel, .ux-rod { animation: none !important; }
        }
        @media (max-width: 768px) {
          .ux-scene { height: 360px; }
          .ux-loco { width: 150px; height: 72px; }
          .ux-boiler { width: 110px; height: 48px; }
          .ux-cab { width: 46px; height: 84px; }
          .ux-wagon { width: 130px; }
          .ux-wbody { height: 96px; }
          .ux-bubble { padding: 10px 8px 8px; border-radius: 11px; }
          .ux-bub-icon { width: 28px; height: 28px; border-radius: 8px; margin-bottom: 5px; }
          .ux-bub-icon svg { width: 14px !important; height: 14px !important; }
          .ux-bub-title { font-size: 10px; }
          .ux-bub-desc { font-size: 7.5px; }
          .ux-tender { width: 50px; height: 44px; }
          .ux-tender-body { height: 34px; }
          .ux-lwheel { width: 26px; height: 26px; }
          .ux-train { right: 10px; }
        }
        @media (max-width: 480px) {
          .ux-scene { height: 290px; }
          .ux-wagon { width: 100px; }
          .ux-wbody { height: 76px; }
          .ux-bub-desc { display: none; }
          .ux-bubble { padding: 6px 4px; border-radius: 9px; }
          .ux-bub-icon { width: 22px; height: 22px; margin-bottom: 3px; }
          .ux-bub-title { font-size: 8.5px; }
          .ux-loco { width: 115px; height: 56px; }
          .ux-boiler { width: 80px; height: 38px; }
          .ux-cab { width: 36px; height: 65px; }
          .ux-wwin { display: none; }
          .ux-hills-near { display: none; }
          .ux-tender { width: 38px; height: 36px; }
          .ux-tender-body { height: 26px; }
        }
      `}</style>
    </section>
  );
};

export default Services;

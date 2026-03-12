import { Send, TrendingUp, Workflow, Crosshair, LineChart, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const services = [
  { title: "Automated Outreach", description: "AI handles DMs & follow-ups 24/7", icon: Send, color: "#f97316", gradient: "from-orange-500 to-pink-500" },
  { title: "Growth Pipeline", description: "AI scores leads & closes deals", icon: TrendingUp, color: "#a855f7", gradient: "from-purple-500 to-indigo-500" },
  { title: "Smart Automation", description: "No-code workflows, always on", icon: Workflow, color: "#3b82f6", gradient: "from-blue-500 to-cyan-500" },
  { title: "Audience Targeting", description: "Find & engage ideal prospects", icon: Crosshair, color: "#8b5cf6", gradient: "from-violet-500 to-purple-500" },
  { title: "Revenue Intelligence", description: "Real-time analytics & forecasting", icon: LineChart, color: "#10b981", gradient: "from-emerald-500 to-teal-500" },
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? "/pricing" : "/auth";

  return (
    <section id="services" className="py-24 relative overflow-hidden">
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

        {/* Train Scene — pure CSS, no JS animations for perf */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="train-scene"
        >
          {/* ── SKY ── */}
          <div className="train-sky">
            {/* Stars - static dots, twinkle via CSS */}
            <div className="train-star" style={{ top: "8%", left: "10%", width: 2, height: 2 }} />
            <div className="train-star" style={{ top: "15%", left: "30%", width: 1.5, height: 1.5 }} />
            <div className="train-star" style={{ top: "5%", left: "55%", width: 2, height: 2 }} />
            <div className="train-star" style={{ top: "12%", left: "75%", width: 1, height: 1 }} />
            <div className="train-star" style={{ top: "20%", left: "90%", width: 1.5, height: 1.5 }} />
            <div className="train-star" style={{ top: "3%", left: "45%", width: 2.5, height: 2.5 }} />
            <div className="train-star" style={{ top: "18%", left: "65%", width: 1, height: 1 }} />
            <div className="train-star" style={{ top: "7%", left: "85%", width: 2, height: 2 }} />

            {/* Moon */}
            <div className="train-moon" />
          </div>

          {/* ── CITY SKYLINE ── */}
          <svg className="train-skyline-far" viewBox="0 0 2800 200" preserveAspectRatio="none">
            <rect x="40" y="60" width="35" height="140" fill="hsl(222,25%,14%)" rx="2" />
            <rect x="42" y="68" width="6" height="8" fill="hsl(45,80%,50%)" opacity="0.3" rx="1" />
            <rect x="52" y="68" width="6" height="8" fill="hsl(45,80%,50%)" opacity="0.15" rx="1" />
            <rect x="42" y="82" width="6" height="8" fill="hsl(45,80%,50%)" opacity="0.2" rx="1" />

            <rect x="100" y="30" width="50" height="170" fill="hsl(222,28%,12%)" rx="2" />
            <rect x="105" y="38" width="8" height="10" fill="hsl(200,60%,40%)" opacity="0.25" rx="1" />
            <rect x="118" y="38" width="8" height="10" fill="hsl(45,80%,50%)" opacity="0.35" rx="1" />
            <rect x="131" y="38" width="8" height="10" fill="hsl(200,60%,40%)" opacity="0.15" rx="1" />
            <rect x="105" y="55" width="8" height="10" fill="hsl(45,80%,50%)" opacity="0.2" rx="1" />
            <rect x="118" y="55" width="8" height="10" fill="hsl(200,60%,40%)" opacity="0.3" rx="1" />
            <rect x="131" y="55" width="8" height="10" fill="hsl(45,80%,50%)" opacity="0.1" rx="1" />
            {/* Antenna */}
            <rect x="124" y="20" width="2" height="12" fill="hsl(222,20%,18%)" />
            <circle cx="125" cy="18" r="2" fill="hsl(0,80%,50%)" opacity="0.6" />

            <rect x="180" y="50" width="40" height="150" fill="hsl(222,22%,13%)" rx="2" />
            <rect x="185" y="58" width="6" height="8" fill="hsl(45,80%,50%)" opacity="0.2" rx="1" />
            <rect x="195" y="58" width="6" height="8" fill="hsl(45,80%,50%)" opacity="0.35" rx="1" />
            <rect x="205" y="58" width="6" height="8" fill="hsl(200,60%,40%)" opacity="0.2" rx="1" />

            <rect x="250" y="15" width="60" height="185" fill="hsl(222,30%,11%)" rx="3" />
            <rect x="255" y="22" width="9" height="11" fill="hsl(45,80%,50%)" opacity="0.3" rx="1" />
            <rect x="269" y="22" width="9" height="11" fill="hsl(200,60%,40%)" opacity="0.15" rx="1" />
            <rect x="283" y="22" width="9" height="11" fill="hsl(45,80%,50%)" opacity="0.25" rx="1" />
            <rect x="255" y="40" width="9" height="11" fill="hsl(200,60%,40%)" opacity="0.2" rx="1" />
            <rect x="269" y="40" width="9" height="11" fill="hsl(45,80%,50%)" opacity="0.35" rx="1" />
            <rect x="283" y="40" width="9" height="11" fill="hsl(200,60%,40%)" opacity="0.1" rx="1" />
            <rect x="255" y="58" width="9" height="11" fill="hsl(45,80%,50%)" opacity="0.15" rx="1" />
            <rect x="269" y="58" width="9" height="11" fill="hsl(200,60%,40%)" opacity="0.3" rx="1" />
            {/* Spire */}
            <polygon points="275,15 280,0 285,15" fill="hsl(222,25%,15%)" />

            <rect x="340" y="45" width="45" height="155" fill="hsl(222,26%,12%)" rx="2" />
            <rect x="345" y="52" width="7" height="9" fill="hsl(45,80%,50%)" opacity="0.25" rx="1" />
            <rect x="357" y="52" width="7" height="9" fill="hsl(200,60%,40%)" opacity="0.2" rx="1" />
            <rect x="369" y="52" width="7" height="9" fill="hsl(45,80%,50%)" opacity="0.3" rx="1" />

            <rect x="410" y="70" width="30" height="130" fill="hsl(222,24%,13%)" rx="2" />
            <rect x="415" y="78" width="6" height="8" fill="hsl(45,80%,50%)" opacity="0.2" rx="1" />
            <rect x="425" y="78" width="6" height="8" fill="hsl(200,60%,40%)" opacity="0.3" rx="1" />

            <rect x="470" y="25" width="55" height="175" fill="hsl(222,28%,11%)" rx="3" />
            <rect x="475" y="33" width="8" height="10" fill="hsl(45,80%,50%)" opacity="0.3" rx="1" />
            <rect x="488" y="33" width="8" height="10" fill="hsl(200,60%,40%)" opacity="0.2" rx="1" />
            <rect x="501" y="33" width="8" height="10" fill="hsl(45,80%,50%)" opacity="0.15" rx="1" />
            <rect x="475" y="50" width="8" height="10" fill="hsl(200,60%,40%)" opacity="0.25" rx="1" />
            <rect x="488" y="50" width="8" height="10" fill="hsl(45,80%,50%)" opacity="0.35" rx="1" />

            <rect x="550" y="55" width="38" height="145" fill="hsl(222,23%,14%)" rx="2" />
            <rect x="620" y="35" width="48" height="165" fill="hsl(222,27%,12%)" rx="2" />
            <rect x="625" y="42" width="7" height="9" fill="hsl(45,80%,50%)" opacity="0.2" rx="1" />
            <rect x="637" y="42" width="7" height="9" fill="hsl(200,60%,40%)" opacity="0.3" rx="1" />
            <rect x="649" y="42" width="7" height="9" fill="hsl(45,80%,50%)" opacity="0.15" rx="1" />

            {/* Repeat for seamless scroll */}
            <rect x="740" y="60" width="35" height="140" fill="hsl(222,25%,14%)" rx="2" />
            <rect x="800" y="30" width="50" height="170" fill="hsl(222,28%,12%)" rx="2" />
            <rect x="880" y="50" width="40" height="150" fill="hsl(222,22%,13%)" rx="2" />
            <rect x="950" y="15" width="60" height="185" fill="hsl(222,30%,11%)" rx="3" />
            <polygon points="975,15 980,0 985,15" fill="hsl(222,25%,15%)" />
            <rect x="1040" y="45" width="45" height="155" fill="hsl(222,26%,12%)" rx="2" />
            <rect x="1110" y="70" width="30" height="130" fill="hsl(222,24%,13%)" rx="2" />
            <rect x="1170" y="25" width="55" height="175" fill="hsl(222,28%,11%)" rx="3" />
            <rect x="1250" y="55" width="38" height="145" fill="hsl(222,23%,14%)" rx="2" />
            <rect x="1320" y="35" width="48" height="165" fill="hsl(222,27%,12%)" rx="2" />
            <rect x="1400" y="60" width="35" height="140" fill="hsl(222,25%,14%)" rx="2" />
          </svg>

          {/* ── GROUND ── */}
          <div className="train-ground" />

          {/* ── GRAVEL BED ── */}
          <div className="train-gravel" />

          {/* ── RAILS ── */}
          <div className="train-rails">
            <div className="train-ties" />
            <div className="train-rail train-rail-top" />
            <div className="train-rail train-rail-bottom" />
          </div>

          {/* ── SPEED LINES (left side = back of train) ── */}
          <div className="train-speed-lines">
            <div className="train-speed-line" style={{ top: "20%", animationDuration: "0.6s" }} />
            <div className="train-speed-line" style={{ top: "35%", animationDuration: "0.45s", animationDelay: "0.15s" }} />
            <div className="train-speed-line" style={{ top: "50%", animationDuration: "0.55s", animationDelay: "0.3s" }} />
            <div className="train-speed-line" style={{ top: "65%", animationDuration: "0.5s", animationDelay: "0.1s" }} />
            <div className="train-speed-line" style={{ top: "80%", animationDuration: "0.65s", animationDelay: "0.25s" }} />
          </div>

          {/* ── SMOKE ── */}
          <div className="train-smoke-container">
            <div className="train-smoke-puff" style={{ animationDelay: "0s" }} />
            <div className="train-smoke-puff" style={{ animationDelay: "0.6s" }} />
            <div className="train-smoke-puff" style={{ animationDelay: "1.2s" }} />
            <div className="train-smoke-puff" style={{ animationDelay: "1.8s" }} />
          </div>

          {/* ══════ THE TRAIN (faces RIGHT) ══════ */}
          <div className="train-body">

            {/* ── LOCOMOTIVE ── */}
            <div className="loco">
              {/* Chimney */}
              <div className="loco-chimney">
                <div className="loco-chimney-cap" />
              </div>
              {/* Steam dome */}
              <div className="loco-dome" />
              {/* Boiler */}
              <div className="loco-boiler">
                <div className="loco-boiler-band" style={{ top: 8 }} />
                <div className="loco-boiler-band" style={{ top: 24 }} />
                <div className="loco-boiler-band" style={{ bottom: 8 }} />
                <div className="loco-headlight" />
              </div>
              {/* Cab */}
              <div className="loco-cab">
                <div className="loco-cab-window" />
                <div className="loco-cab-roof" />
                {/* UPLYZE LOGO on the cab */}
                <div className="loco-logo">
                  <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze" className="loco-logo-img" />
                </div>
              </div>
              {/* Cowcatcher */}
              <div className="loco-cowcatcher" />
              {/* Wheels */}
              <div className="loco-wheel loco-wheel-1" />
              <div className="loco-wheel loco-wheel-2" />
              <div className="loco-wheel loco-wheel-3" />
            </div>

            {/* Coupler */}
            <div className="train-coupler" />

            {/* ── WAGONS ── */}
            {services.map((service, idx) => (
              <div key={service.title} className="wagon-group">
                {idx > 0 && <div className="train-coupler" />}
                <div className="wagon">
                  <div className="wagon-body">
                    <div className={`wagon-stripe bg-gradient-to-r ${service.gradient}`} />
                    <div className="wagon-content">
                      <div className="wagon-icon" style={{ background: `linear-gradient(135deg, ${service.color}, ${service.color}88)`, boxShadow: `0 3px 10px ${service.color}30` }}>
                        <service.icon className="wagon-icon-svg" />
                      </div>
                      <h4 className="wagon-title">{service.title}</h4>
                      <p className="wagon-desc">{service.description}</p>
                    </div>
                    <div className="wagon-plate">UPL-{String(idx + 1).padStart(2, "0")}</div>
                  </div>
                  <div className="wagon-frame" />
                  <div className="wagon-wheel wagon-wheel-l1" />
                  <div className="wagon-wheel wagon-wheel-l2" />
                  <div className="wagon-wheel wagon-wheel-r1" />
                  <div className="wagon-wheel wagon-wheel-r2" />
                </div>
              </div>
            ))}

            {/* End lantern */}
            <div className="train-lantern" />
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

      {/* All train styles — GPU-accelerated, will-change optimized */}
      <style>{`
        /* ── SCENE ── */
        .train-scene {
          position: relative; width: 100%; height: 480px; overflow: hidden;
          border-radius: 16px; border: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(180deg, hsl(222 45% 6%) 0%, hsl(222 40% 9%) 40%, hsl(222 30% 7%) 100%);
          contain: layout style paint;
        }

        /* ── SKY ── */
        .train-sky { position: absolute; inset: 0; }
        .train-star {
          position: absolute; border-radius: 50%; background: white;
          animation: star-tw 3s ease-in-out infinite alternate;
          will-change: opacity;
        }
        .train-star:nth-child(2) { animation-delay: 0.5s; }
        .train-star:nth-child(4) { animation-delay: 1s; }
        .train-star:nth-child(6) { animation-delay: 1.5s; }
        @keyframes star-tw { from { opacity: 0.15; } to { opacity: 0.6; } }

        .train-moon {
          position: absolute; top: 32px; left: 72px; width: 48px; height: 48px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, hsl(45,60%,90%), hsl(45,50%,75%));
          box-shadow: 0 0 40px 12px rgba(255,255,200,0.08);
        }

        /* ── SKYLINE ── */
        .train-skyline-far {
          position: absolute; bottom: 115px; left: 0; width: 200%; height: 200px;
          animation: skyline-scroll 50s linear infinite;
          will-change: transform;
        }
        @keyframes skyline-scroll { to { transform: translate3d(-50%, 0, 0); } }

        /* ── GROUND ── */
        .train-ground {
          position: absolute; bottom: 0; left: 0; right: 0; height: 115px;
          background: linear-gradient(to top, hsl(222,20%,4%), hsl(222,18%,7%) 60%, hsl(222,15%,9%));
        }

        /* ── GRAVEL ── */
        .train-gravel {
          position: absolute; bottom: 68px; left: 0; right: 0; height: 16px;
          background: linear-gradient(to top, hsl(30,10%,12%), hsl(30,8%,16%));
          border-radius: 2px 2px 0 0;
        }

        /* ── RAILS ── */
        .train-rails { position: absolute; bottom: 72px; left: 0; right: 0; height: 20px; }
        .train-ties {
          position: absolute; inset: 0; overflow: hidden;
          background: repeating-linear-gradient(90deg, hsl(30,15%,14%) 0px, hsl(30,15%,14%) 6px, transparent 6px, transparent 20px);
          animation: ties-scroll 0.5s linear infinite;
          will-change: transform;
        }
        @keyframes ties-scroll { to { transform: translate3d(-20px, 0, 0); } }

        .train-rail {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, hsl(0,0%,45%) 0%, hsl(0,0%,55%) 50%, hsl(0,0%,45%) 100%);
          box-shadow: 0 0 3px rgba(200,200,200,0.1), 0 1px 0 rgba(255,255,255,0.08);
        }
        .train-rail-top { top: 2px; }
        .train-rail-bottom { bottom: 2px; }

        /* ── SPEED LINES ── */
        .train-speed-lines {
          position: absolute; bottom: 68px; left: 0; width: 120px; height: 60px;
          overflow: hidden; pointer-events: none; z-index: 5;
        }
        .train-speed-line {
          position: absolute; left: 0; height: 2px; width: 70%;
          background: linear-gradient(to right, rgba(255,255,255,0.2), transparent);
          border-radius: 1px;
          animation: spd-line 0.5s linear infinite;
          will-change: transform, opacity;
        }
        @keyframes spd-line {
          0% { opacity: 0; transform: translate3d(20px, 0, 0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(-60px, 0, 0); }
        }

        /* ── SMOKE ── */
        .train-smoke-container {
          position: absolute; right: 100px; bottom: 370px; pointer-events: none; z-index: 6;
        }
        .train-smoke-puff {
          position: absolute; width: 18px; height: 18px; border-radius: 50%;
          background: radial-gradient(circle, rgba(180,180,180,0.12) 0%, transparent 70%);
          animation: smoke 2.5s ease-out infinite;
          will-change: transform, opacity;
        }
        @keyframes smoke {
          0% { opacity: 0.15; transform: translate3d(0, 0, 0) scale(0.5); }
          100% { opacity: 0; transform: translate3d(25px, -45px, 0) scale(3); }
        }

        /* ══════ TRAIN BODY ══════ */
        .train-body {
          position: absolute; bottom: 84px; right: 16px; display: flex;
          align-items: flex-end; flex-direction: row-reverse;
          animation: train-bob 2.5s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes train-bob {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -1px, 0); }
        }

        /* ── LOCOMOTIVE ── */
        .loco { position: relative; width: 170px; height: 70px; flex-shrink: 0; }

        .loco-chimney {
          position: absolute; top: -18px; right: 30px; width: 10px; height: 18px;
          background: linear-gradient(to top, hsl(0,0%,30%), hsl(0,0%,40%));
          border-radius: 3px 3px 0 0; border: 1px solid rgba(255,255,255,0.08);
        }
        .loco-chimney-cap {
          position: absolute; top: -4px; left: -4px; right: -4px; height: 6px;
          background: linear-gradient(to top, hsl(0,0%,35%), hsl(0,0%,45%));
          border-radius: 4px 4px 0 0; border: 1px solid rgba(255,255,255,0.08);
        }

        .loco-dome {
          position: absolute; top: -10px; right: 60px; width: 16px; height: 10px;
          background: linear-gradient(to top, hsl(0,65%,35%), hsl(0,65%,45%));
          border-radius: 8px 8px 0 0; border: 1px solid rgba(255,255,255,0.08);
        }

        .loco-boiler {
          position: absolute; top: 0; right: 0; width: 120px; height: 52px;
          background: linear-gradient(180deg, hsl(0,60%,42%), hsl(0,65%,30%));
          border-radius: 0 26px 4px 4px;
          border: 1px solid rgba(255,100,100,0.15);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -3px 6px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .loco-boiler-band {
          position: absolute; left: 0; right: 0; height: 2px;
          background: hsl(45,70%,50%); opacity: 0.35;
        }
        .loco-headlight {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 12px; height: 12px; border-radius: 50%;
          background: radial-gradient(circle, hsl(45,100%,85%), hsl(45,90%,60%));
          box-shadow: 0 0 16px 4px rgba(255,255,100,0.35);
        }

        .loco-cab {
          position: absolute; top: -10px; left: 0; width: 55px; height: 80px;
          background: linear-gradient(180deg, hsl(0,55%,38%), hsl(0,60%,28%));
          border-radius: 6px 6px 2px 2px;
          border: 1px solid rgba(255,100,100,0.12);
          box-shadow: inset 0 1px 3px rgba(255,255,255,0.08);
          overflow: hidden;
        }
        .loco-cab-window {
          position: absolute; top: 8px; left: 6px; right: 6px; height: 18px;
          background: rgba(100,180,255,0.1); border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: inset 0 0 6px rgba(100,200,255,0.08);
        }
        .loco-cab-roof {
          position: absolute; top: -3px; left: -3px; right: -3px; height: 6px;
          background: linear-gradient(180deg, hsl(0,0%,32%), hsl(0,0%,25%));
          border-radius: 4px 4px 0 0;
        }
        .loco-logo {
          position: absolute; top: 32px; left: 50%; transform: translateX(-50%);
          width: 28px; height: 28px; border-radius: 6px; overflow: hidden;
          background: hsl(222,35%,8%); border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
        }
        .loco-logo-img { width: 100%; height: 100%; object-fit: cover; }

        .loco-cowcatcher {
          position: absolute; right: -8px; bottom: 4px; width: 0; height: 0;
          border-left: 12px solid hsl(0,0%,35%);
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
        }

        .loco-wheel {
          position: absolute; bottom: -6px; width: 22px; height: 22px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(0,0%,40%), hsl(0,0%,15%));
          border: 2px solid hsl(0,0%,45%);
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          animation: wh-spin 0.5s linear infinite;
          will-change: transform;
        }
        .loco-wheel::after {
          content: ''; position: absolute; inset: 30%; border-radius: 50%;
          background: hsl(0,0%,38%);
        }
        .loco-wheel-1 { left: 10px; width: 26px; height: 26px; bottom: -8px; }
        .loco-wheel-2 { left: 50px; }
        .loco-wheel-3 { right: 20px; }
        @keyframes wh-spin { to { transform: rotate(360deg); } }

        /* ── COUPLER ── */
        .train-coupler {
          flex-shrink: 0; width: 10px; height: 6px; align-self: center; margin-bottom: 16px;
          background: linear-gradient(180deg, hsl(0,0%,38%), hsl(0,0%,28%));
          border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        /* ── WAGON ── */
        .wagon-group { display: flex; align-items: flex-end; flex-shrink: 0; }
        .wagon { position: relative; width: 155px; flex-shrink: 0; }

        .wagon-body {
          position: relative; height: 120px; overflow: hidden;
          background: linear-gradient(180deg, hsl(222,30%,15%) 0%, hsl(222,25%,10%) 50%, hsl(222,20%,7%) 100%);
          border-radius: 5px 5px 2px 2px;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.04), inset 0 -2px 4px rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.35);
        }

        .wagon-stripe {
          position: absolute; top: 0; left: 0; right: 0; height: 3px; opacity: 0.65;
        }

        .wagon-content {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 14px 10px; height: 100%;
        }
        .wagon-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 6px;
        }
        .wagon-icon-svg { width: 16px; height: 16px; color: white; }
        .wagon-title {
          font-size: 11px; font-weight: 700; color: white;
          line-height: 1.2; margin-bottom: 2px; letter-spacing: -0.01em;
        }
        .wagon-desc {
          font-size: 8.5px; color: rgba(255,255,255,0.3); line-height: 1.35;
        }
        .wagon-plate {
          position: absolute; bottom: 4px; right: 5px;
          font-size: 7px; font-family: monospace; color: rgba(255,255,255,0.15);
          padding: 1px 4px; border-radius: 2px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04);
        }

        .wagon-frame {
          position: absolute; bottom: -2px; left: 8px; right: 8px; height: 5px;
          background: linear-gradient(180deg, hsl(0,0%,28%), hsl(0,0%,18%));
          border-radius: 0 0 2px 2px;
        }

        .wagon-wheel {
          position: absolute; bottom: -6px; width: 14px; height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(0,0%,38%), hsl(0,0%,12%));
          border: 1.5px solid hsl(0,0%,42%);
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          animation: wh-spin 0.5s linear infinite;
          will-change: transform;
        }
        .wagon-wheel::after {
          content: ''; position: absolute; inset: 28%; border-radius: 50%;
          background: hsl(0,0%,35%);
        }
        .wagon-wheel-l1 { left: 14px; }
        .wagon-wheel-l2 { left: 30px; }
        .wagon-wheel-r1 { right: 14px; }
        .wagon-wheel-r2 { right: 30px; }

        /* ── LANTERN ── */
        .train-lantern {
          flex-shrink: 0; width: 6px; height: 10px; align-self: center; margin-bottom: 22px; margin-left: 4px;
          background: linear-gradient(to top, hsl(0,70%,40%), hsl(0,60%,55%));
          border-radius: 3px 3px 0 0; border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 6px rgba(255,50,50,0.25);
        }

        /* ── PERF: reduce motion for users who prefer it ── */
        @media (prefers-reduced-motion: reduce) {
          .train-star, .train-skyline-far, .train-ties, .train-speed-line,
          .train-smoke-puff, .train-body, .loco-wheel, .wagon-wheel { animation: none !important; }
        }

        /* ── MOBILE: smaller scene ── */
        @media (max-width: 768px) {
          .train-scene { height: 360px; }
          .loco { width: 130px; height: 56px; }
          .loco-boiler { width: 90px; height: 42px; }
          .loco-cab { width: 44px; height: 66px; top: -8px; }
          .wagon { width: 115px; }
          .wagon-body { height: 90px; }
          .wagon-title { font-size: 9px; }
          .wagon-desc { font-size: 7px; }
          .wagon-icon { width: 24px; height: 24px; }
          .wagon-icon-svg { width: 12px; height: 12px; }
          .train-body { right: 8px; }
        }

        @media (max-width: 480px) {
          .train-scene { height: 300px; }
          .wagon { width: 90px; }
          .wagon-body { height: 75px; }
          .wagon-desc { display: none; }
          .loco { width: 100px; height: 46px; }
          .loco-boiler { width: 70px; height: 36px; }
          .loco-cab { width: 35px; height: 56px; }
        }
      `}</style>
    </section>
  );
};

export default Services;

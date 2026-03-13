import { Send, TrendingUp, Workflow, Crosshair, LineChart, Zap, ArrowRight, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";

const services = [
  { title: "Automated Outreach", description: "AI handles DMs, follow-ups & lead nurturing 24/7", icon: Send, color: "#f97316", glow: "rgba(249,115,22,0.3)", accent: "hsl(25,95%,53%)" },
  { title: "Growth Pipeline", description: "AI scores leads, qualifies & closes deals automatically", icon: TrendingUp, color: "#a855f7", glow: "rgba(168,85,247,0.3)", accent: "hsl(270,91%,65%)" },
  { title: "Smart Automation", description: "No-code workflows running your business on autopilot", icon: Workflow, color: "#3b82f6", glow: "rgba(59,130,246,0.3)", accent: "hsl(217,91%,60%)" },
  { title: "Audience Targeting", description: "Find & convert your ideal audience with AI precision", icon: Crosshair, color: "#8b5cf6", glow: "rgba(139,92,246,0.3)", accent: "hsl(258,90%,66%)" },
  { title: "Revenue Intelligence", description: "Real-time analytics, forecasting & growth insights", icon: LineChart, color: "#10b981", glow: "rgba(16,185,129,0.3)", accent: "hsl(160,84%,39%)" },
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

        {/* Browser Window */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(222, 30%, 12%) 0%, hsl(222, 35%, 9%) 100%)',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            contain: 'layout style paint',
          }}
        >
          {/* Chrome */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]" style={{ background: 'hsl(222, 30%, 10%)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg" style={{ background: 'hsl(222, 30%, 14%)' }}>
              <Lock className="w-3 h-3 text-emerald-500/50" />
              <span className="text-white/35 text-[11px] font-mono">uplyze.ai/express</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400/70 text-[10px] font-semibold tracking-wide">DEPARTING</span>
            </div>
          </div>

          {/* ═══ TRAIN SCENE ═══ */}
          <div className="tx-scene">
            {isVisible && (
              <>
                <div className="tx-sky" />
                {/* Stars */}
                {[
                  { t: '5%', l: '10%' }, { t: '12%', l: '28%' }, { t: '3%', l: '52%' },
                  { t: '9%', l: '72%' }, { t: '16%', l: '88%' }, { t: '7%', l: '42%' },
                  { t: '14%', l: '62%' }, { t: '4%', l: '85%' },
                ].map((s, i) => (
                  <div key={i} className="tx-star" style={{ top: s.t, left: s.l, animationDelay: `${i * 0.4}s` }} />
                ))}
                <div className="tx-moon" />

                {/* Skyline far */}
                <div className="tx-skyline-far">
                  <svg viewBox="0 0 3000 260" preserveAspectRatio="none" className="tx-skyline-svg">
                    {/* Empire State inspired */}
                    <rect x="120" y="15" width="70" height="245" fill="hsl(222,28%,11%)" rx="3" />
                    <rect x="140" y="5" width="30" height="15" fill="hsl(222,25%,13%)" rx="2" />
                    <polygon points="150,5 155,-8 160,5" fill="hsl(222,22%,14%)" />
                    <circle cx="155" cy="-10" r="2" fill="hsl(0,70%,50%)" opacity="0.6" />
                    {/* Windows */}
                    {[25, 40, 55, 70, 85, 100, 115, 130, 145, 160].map((y, i) => (
                      <g key={`w1-${i}`}>
                        <rect x="128" y={y} width="6" height="8" fill="hsl(45,80%,55%)" opacity={0.15 + (i % 3) * 0.1} rx="1" />
                        <rect x="140" y={y} width="6" height="8" fill="hsl(200,60%,50%)" opacity={0.1 + (i % 2) * 0.15} rx="1" />
                        <rect x="152" y={y} width="6" height="8" fill="hsl(45,80%,55%)" opacity={0.2 - (i % 3) * 0.05} rx="1" />
                        <rect x="164" y={y} width="6" height="8" fill="hsl(200,60%,50%)" opacity={0.12 + (i % 2) * 0.1} rx="1" />
                        <rect x="176" y={y} width="6" height="8" fill="hsl(45,80%,55%)" opacity={0.18 - (i % 3) * 0.04} rx="1" />
                      </g>
                    ))}
                    {/* Chrysler-like */}
                    <rect x="280" y="30" width="55" height="230" fill="hsl(222,30%,10%)" rx="3" />
                    <polygon points="295,30 307,8 320,30" fill="hsl(222,26%,12%)" />
                    {[42, 58, 74, 90, 106, 122, 138].map((y, i) => (
                      <g key={`w2-${i}`}>
                        <rect x="288" y={y} width="5" height="7" fill="hsl(45,80%,55%)" opacity={0.12 + (i % 3) * 0.1} rx="1" />
                        <rect x="298" y={y} width="5" height="7" fill="hsl(200,60%,50%)" opacity={0.15 + (i % 2) * 0.08} rx="1" />
                        <rect x="308" y={y} width="5" height="7" fill="hsl(45,80%,55%)" opacity={0.2 - (i % 3) * 0.06} rx="1" />
                        <rect x="318" y={y} width="5" height="7" fill="hsl(200,60%,50%)" opacity={0.1 + (i % 2) * 0.12} rx="1" />
                      </g>
                    ))}
                    {/* Wide office block */}
                    <rect x="400" y="55" width="85" height="205" fill="hsl(222,24%,11.5%)" rx="2" />
                    {[65, 80, 95, 110, 125, 140].map((y, i) => (
                      <g key={`w3-${i}`}>
                        {[408, 420, 432, 444, 456, 468].map((x, j) => (
                          <rect key={j} x={x} y={y} width="5" height="7" fill={j % 2 === 0 ? "hsl(45,80%,55%)" : "hsl(200,60%,50%)"} opacity={0.08 + ((i + j) % 4) * 0.06} rx="1" />
                        ))}
                      </g>
                    ))}
                    {/* More buildings */}
                    <rect x="540" y="70" width="40" height="190" fill="hsl(222,22%,12%)" rx="2" />
                    <rect x="610" y="38" width="50" height="222" fill="hsl(222,26%,10.5%)" rx="3" />
                    <rect x="700" y="60" width="35" height="200" fill="hsl(222,20%,11%)" rx="2" />
                    <rect x="770" y="25" width="60" height="235" fill="hsl(222,28%,10%)" rx="3" />
                    <polygon points="795,25 800,10 805,25" fill="hsl(222,24%,13%)" />
                    <rect x="870" y="50" width="45" height="210" fill="hsl(222,23%,11.5%)" rx="2" />
                    <rect x="950" y="68" width="38" height="192" fill="hsl(222,21%,12%)" rx="2" />
                    {/* Duplicate for loop */}
                    <rect x="1050" y="15" width="70" height="245" fill="hsl(222,28%,11%)" rx="3" />
                    <rect x="1200" y="30" width="55" height="230" fill="hsl(222,30%,10%)" rx="3" />
                    <rect x="1320" y="55" width="85" height="205" fill="hsl(222,24%,11.5%)" rx="2" />
                    <rect x="1470" y="38" width="50" height="222" fill="hsl(222,26%,10.5%)" rx="3" />
                  </svg>
                </div>

                {/* Skyline near */}
                <div className="tx-skyline-near">
                  <svg viewBox="0 0 2400 160" preserveAspectRatio="none" className="tx-skyline-near-svg">
                    <rect x="15" y="35" width="60" height="125" fill="hsl(222,18%,8%)" rx="2" />
                    <rect x="95" y="15" width="48" height="145" fill="hsl(222,20%,7%)" rx="3" />
                    <rect x="170" y="50" width="38" height="110" fill="hsl(222,16%,8.5%)" rx="2" />
                    <rect x="240" y="8" width="55" height="152" fill="hsl(222,22%,7.5%)" rx="3" />
                    <rect x="325" y="30" width="42" height="130" fill="hsl(222,18%,8%)" rx="2" />
                    <rect x="395" y="55" width="35" height="105" fill="hsl(222,20%,9%)" rx="2" />
                    <rect x="460" y="12" width="60" height="148" fill="hsl(222,22%,7%)" rx="3" />
                    <rect x="550" y="40" width="45" height="120" fill="hsl(222,16%,8%)" rx="2" />
                    <rect x="625" y="22" width="52" height="138" fill="hsl(222,20%,7.5%)" rx="2" />
                    <rect x="710" y="58" width="38" height="102" fill="hsl(222,18%,9%)" rx="2" />
                    {/* Dup */}
                    <rect x="790" y="35" width="60" height="125" fill="hsl(222,18%,8%)" rx="2" />
                    <rect x="880" y="15" width="48" height="145" fill="hsl(222,20%,7%)" rx="3" />
                    <rect x="960" y="50" width="38" height="110" fill="hsl(222,16%,8.5%)" rx="2" />
                    <rect x="1030" y="8" width="55" height="152" fill="hsl(222,22%,7.5%)" rx="3" />
                    <rect x="1120" y="30" width="42" height="130" fill="hsl(222,18%,8%)" rx="2" />
                    <rect x="1200" y="12" width="60" height="148" fill="hsl(222,22%,7%)" rx="3" />
                  </svg>
                </div>

                <div className="tx-ground" />
                <div className="tx-gravel" />

                {/* Rails */}
                <div className="tx-rails">
                  <div className="tx-ties" />
                  <div className="tx-rail tx-rail-t" />
                  <div className="tx-rail tx-rail-b" />
                </div>

                {/* Sparks from wheels */}
                <div className="tx-sparks">
                  <div className="tx-spark" style={{ animationDelay: '0s' }} />
                  <div className="tx-spark" style={{ animationDelay: '0.3s' }} />
                  <div className="tx-spark" style={{ animationDelay: '0.6s' }} />
                </div>

                {/* Smoke */}
                <div className="tx-smoke">
                  <div className="tx-puff" style={{ animationDelay: '0s' }} />
                  <div className="tx-puff" style={{ animationDelay: '0.8s' }} />
                  <div className="tx-puff" style={{ animationDelay: '1.6s' }} />
                  <div className="tx-puff tx-puff-lg" style={{ animationDelay: '0.4s' }} />
                </div>

                {/* ══════ TRAIN ══════ */}
                <div className="tx-train">

                  {/* ═══ LOCOMOTIVE ═══ */}
                  <div className="tx-loco">
                    {/* Smokestack */}
                    <div className="tx-stack">
                      <div className="tx-stack-cap" />
                      <div className="tx-stack-ring" />
                    </div>
                    {/* Steam dome */}
                    <div className="tx-sdome" />
                    {/* Safety valve */}
                    <div className="tx-valve" />
                    {/* Sand dome */}
                    <div className="tx-sanddome" />
                    {/* Bell */}
                    <div className="tx-bell"><div className="tx-bell-clap" /></div>

                    {/* Boiler — big cylindrical body */}
                    <div className="tx-boiler">
                      {/* Metal bands */}
                      <div className="tx-mband" style={{ top: 5 }} />
                      <div className="tx-mband" style={{ top: 18 }} />
                      <div className="tx-mband" style={{ top: 31 }} />
                      <div className="tx-mband" style={{ bottom: 5 }} />
                      {/* Rivets row */}
                      {[10, 24, 38, 52, 66, 80, 94, 108].map(x => (
                        <div key={x} className="tx-rv" style={{ top: 13, left: x }} />
                      ))}
                      {[10, 24, 38, 52, 66, 80, 94, 108].map(x => (
                        <div key={`b${x}`} className="tx-rv" style={{ bottom: 13, left: x }} />
                      ))}
                      {/* Headlight */}
                      <div className="tx-hl">
                        <div className="tx-hl-lens" />
                        <div className="tx-hl-beam" />
                      </div>
                      {/* Number plate */}
                      <div className="tx-numplate">U-1</div>
                    </div>

                    {/* Cab — driver compartment */}
                    <div className="tx-cab">
                      <div className="tx-cab-roof" />
                      <div className="tx-cab-side" />
                      {/* Windows with interior glow */}
                      <div className="tx-cab-win"><div className="tx-cab-win-glow" /></div>
                      <div className="tx-cab-win tx-cab-win2"><div className="tx-cab-win-glow" /></div>
                      {/* Uplyze logo on cab */}
                      <div className="tx-cab-logo">
                        <img src="/lovable-uploads/uplyze-logo.png" alt="U" className="tx-cab-logo-img" />
                      </div>
                      {/* Grab rail */}
                      <div className="tx-grab" />
                    </div>

                    {/* Running board */}
                    <div className="tx-runboard" />

                    {/* Cowcatcher */}
                    <div className="tx-cowcatch">
                      <div className="tx-cowbar" />
                      <div className="tx-cowbar tx-cowbar2" />
                      <div className="tx-cowbar tx-cowbar3" />
                      <div className="tx-cowbase" />
                    </div>

                    {/* Pilot truck wheel */}
                    <div className="tx-pilot-wh">
                      <div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-sp tx-sp3" />
                      <div className="tx-whub" />
                    </div>

                    {/* Big drive wheels */}
                    <div className="tx-bigwh tx-bigwh1">
                      <div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-sp tx-sp3" /><div className="tx-sp tx-sp4" />
                      <div className="tx-whub tx-whub-lg" />
                      <div className="tx-crank" />
                    </div>
                    <div className="tx-bigwh tx-bigwh2">
                      <div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-sp tx-sp3" /><div className="tx-sp tx-sp4" />
                      <div className="tx-whub tx-whub-lg" />
                    </div>

                    {/* Connecting rods */}
                    <div className="tx-conrod" />
                    <div className="tx-piston" />

                    {/* Cylinder */}
                    <div className="tx-cyl" />

                    {/* Sandbox */}
                    <div className="tx-sbox" />
                  </div>

                  <div className="tx-couple" />

                  {/* ═══ TENDER (coal car) ═══ */}
                  <div className="tx-tender">
                    <div className="tx-tender-body">
                      <div className="tx-tender-coal" />
                      <div className="tx-tender-rim" />
                      {/* Rivets */}
                      {[8, 22, 36, 50].map(x => (
                        <div key={x} className="tx-rv" style={{ top: 6, left: x }} />
                      ))}
                    </div>
                    <div className="tx-tender-frame" />
                    <div className="tx-twh tx-twh1"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                    <div className="tx-twh tx-twh2"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                    <div className="tx-twh tx-twh3"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                  </div>

                  <div className="tx-couple" />

                  {/* ═══ WAGONS ═══ */}
                  {services.map((service, idx) => (
                    <div key={service.title} className="tx-wgrp">
                      {idx > 0 && <div className="tx-couple" />}
                      <div className="tx-wagon">
                        {/* Wagon body — passenger car style with 3D depth */}
                        <div className="tx-wbody">
                          {/* Top edge highlight */}
                          <div className="tx-wtop-hl" />
                          {/* Roof with curvature */}
                          <div className="tx-wroof">
                            <div className="tx-wroof-vent" />
                          </div>
                          {/* Side metal paneling */}
                          <div className="tx-wside">
                            {/* Windows — real rectangular with frames */}
                            <div className="tx-wwin tx-wwin1" />
                            <div className="tx-wwin tx-wwin2" />
                            <div className="tx-wwin tx-wwin3" />
                            {/* Rivets along bottom */}
                            {[8, 22, 36, 50, 64, 78, 92, 106, 120, 134, 148].map(x => (
                              <div key={x} className="tx-rv tx-wrv" style={{ left: x }} />
                            ))}
                            {/* Color stripe */}
                            <div className="tx-wstripe" style={{ background: service.accent, boxShadow: `0 0 12px ${service.glow}` }} />
                          </div>
                          {/* Bottom skirting */}
                          <div className="tx-wskirt" />

                          {/* ═ SERVICE BUBBLE — floating inside wagon window area ═ */}
                          <div className="tx-bubble" style={{ boxShadow: `0 0 28px ${service.glow}, 0 4px 20px rgba(0,0,0,0.3)` }}>
                            <div className="tx-bub-glow" style={{ background: `radial-gradient(circle, ${service.glow}, transparent 70%)` }} />
                            <div className="tx-bub-icon" style={{ background: `linear-gradient(135deg, ${service.color}, ${service.accent})`, boxShadow: `0 3px 16px ${service.glow}` }}>
                              <service.icon style={{ width: 16, height: 16, color: 'white' }} />
                            </div>
                            <div className="tx-bub-title">{service.title}</div>
                            <div className="tx-bub-desc">{service.description}</div>
                          </div>

                          {/* Serial plate */}
                          <div className="tx-wplate">UPL-{String(idx + 1).padStart(2, '0')}</div>
                        </div>

                        {/* Undercarriage frame */}
                        <div className="tx-uframe">
                          <div className="tx-ubeam" />
                          <div className="tx-ubeam tx-ubeam2" />
                        </div>

                        {/* Bogie L */}
                        <div className="tx-bog tx-bog-l">
                          <div className="tx-bogfr" />
                          <div className="tx-bogwh tx-bogwh1"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                          <div className="tx-bogwh tx-bogwh2"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                        </div>
                        {/* Bogie R */}
                        <div className="tx-bog tx-bog-r">
                          <div className="tx-bogfr" />
                          <div className="tx-bogwh tx-bogwh1"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                          <div className="tx-bogwh tx-bogwh2"><div className="tx-sp" /><div className="tx-sp tx-sp2" /><div className="tx-whub" /></div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* End lantern */}
                  <div className="tx-endlamp" />
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

      <style>{`
        /* ═══ SCENE ═══ */
        .tx-scene {
          position: relative; width: 100%; height: 520px; overflow: hidden;
          contain: layout style paint;
          background: linear-gradient(180deg, hsl(222,42%,6%) 0%, hsl(222,36%,4%) 100%);
        }
        .tx-sky { position: absolute; inset: 0; background: linear-gradient(180deg, hsl(228,50%,4%) 0%, hsl(222,40%,7%) 40%, hsl(222,30%,10%) 80%, transparent 100%); }

        /* Stars */
        .tx-star {
          position: absolute; width: 2px; height: 2px; border-radius: 50%; background: white;
          animation: tx-twk 3.5s ease-in-out infinite alternate; will-change: opacity;
        }
        @keyframes tx-twk { from { opacity: 0.08; } to { opacity: 0.5; } }

        .tx-moon {
          position: absolute; top: 22px; left: 55px; width: 58px; height: 58px; border-radius: 50%;
          background: radial-gradient(circle at 32% 32%, hsl(45,65%,94%), hsl(45,55%,75%));
          box-shadow: 0 0 60px 20px rgba(255,255,200,0.05), 0 0 120px 40px rgba(255,255,200,0.02);
        }

        /* Skylines */
        .tx-skyline-far {
          position: absolute; bottom: 140px; left: 0; width: 200%; height: 260px;
          animation: tx-sfar 60s linear infinite; will-change: transform;
        }
        .tx-skyline-svg { width: 100%; height: 100%; }
        @keyframes tx-sfar { to { transform: translate3d(-50%, 0, 0); } }

        .tx-skyline-near {
          position: absolute; bottom: 125px; left: 0; width: 200%; height: 160px;
          animation: tx-snear 28s linear infinite; will-change: transform;
        }
        .tx-skyline-near-svg { width: 100%; height: 100%; }
        @keyframes tx-snear { to { transform: translate3d(-50%, 0, 0); } }

        /* Ground, gravel, rails */
        .tx-ground {
          position: absolute; bottom: 0; left: 0; right: 0; height: 140px;
          background: linear-gradient(to top, hsl(222,20%,3%), hsl(222,18%,5%) 40%, hsl(222,14%,7.5%));
        }
        .tx-gravel {
          position: absolute; bottom: 82px; left: 0; right: 0; height: 22px;
          background: linear-gradient(to top, hsl(28,10%,8%), hsl(28,8%,12%)); border-radius: 3px 3px 0 0;
        }
        .tx-rails { position: absolute; bottom: 86px; left: 0; right: 0; height: 26px; }
        .tx-ties {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(90deg, hsl(25,14%,14%) 0px, hsl(25,14%,14%) 8px, transparent 8px, transparent 24px);
          animation: tx-tscroll 0.6s linear infinite; will-change: transform;
        }
        @keyframes tx-tscroll { to { transform: translate3d(-24px, 0, 0); } }
        .tx-rail {
          position: absolute; left: 0; right: 0; height: 3.5px;
          background: linear-gradient(90deg, hsl(0,0%,38%) 0%, hsl(0,0%,50%) 50%, hsl(0,0%,38%) 100%);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 -1px 2px rgba(0,0,0,0.3);
        }
        .tx-rail-t { top: 3px; }
        .tx-rail-b { bottom: 3px; }

        /* Sparks */
        .tx-sparks { position: absolute; right: 80px; bottom: 100px; pointer-events: none; z-index: 8; }
        .tx-spark {
          position: absolute; width: 3px; height: 3px; border-radius: 50%;
          background: hsl(45,100%,65%);
          animation: tx-sprk 0.8s ease-out infinite; will-change: transform, opacity;
        }
        @keyframes tx-sprk {
          0% { opacity: 0.8; transform: translate3d(0, 0, 0); }
          100% { opacity: 0; transform: translate3d(-30px, -20px, 0) scale(0.3); }
        }

        /* Smoke */
        .tx-smoke { position: absolute; right: 132px; bottom: 420px; pointer-events: none; z-index: 6; }
        .tx-puff {
          position: absolute; width: 22px; height: 22px; border-radius: 50%;
          background: radial-gradient(circle, rgba(200,200,200,0.12) 0%, transparent 70%);
          animation: tx-smk 3s ease-out infinite; will-change: transform, opacity;
        }
        .tx-puff-lg { width: 30px; height: 30px; }
        @keyframes tx-smk {
          0% { opacity: 0.15; transform: translate3d(0, 0, 0) scale(0.3); }
          100% { opacity: 0; transform: translate3d(40px, -60px, 0) scale(4); }
        }

        /* ═══ TRAIN CONTAINER ═══ */
        .tx-train {
          position: absolute; bottom: 104px; right: 15px;
          display: flex; align-items: flex-end; flex-direction: row-reverse;
          animation: tx-bob 3s ease-in-out infinite; will-change: transform;
        }
        @keyframes tx-bob {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -2px, 0); }
        }

        /* ═══ LOCOMOTIVE ═══ */
        .tx-loco { position: relative; width: 220px; height: 95px; flex-shrink: 0; }

        /* Smokestack */
        .tx-stack {
          position: absolute; top: -30px; right: 40px; width: 14px; height: 30px;
          background: linear-gradient(180deg, hsl(0,0%,42%) 0%, hsl(0,0%,28%) 100%);
          border-radius: 4px 4px 1px 1px; border: 1px solid rgba(255,255,255,0.08);
        }
        .tx-stack-cap {
          position: absolute; top: -6px; left: -6px; right: -6px; height: 8px;
          background: linear-gradient(180deg, hsl(0,0%,46%), hsl(0,0%,36%));
          border-radius: 6px 6px 2px 2px; border: 1px solid rgba(255,255,255,0.08);
        }
        .tx-stack-ring {
          position: absolute; bottom: 4px; left: -3px; right: -3px; height: 4px;
          background: hsl(45,50%,42%); border-radius: 2px; opacity: 0.5;
        }

        /* Domes */
        .tx-sdome {
          position: absolute; top: -16px; right: 78px; width: 22px; height: 16px;
          background: linear-gradient(180deg, hsl(45,55%,50%), hsl(45,45%,35%));
          border-radius: 11px 11px 0 0; border: 1px solid rgba(255,255,200,0.1);
        }
        .tx-valve {
          position: absolute; top: -8px; right: 65px; width: 5px; height: 8px;
          background: linear-gradient(180deg, hsl(45,50%,55%), hsl(45,40%,40%));
          border-radius: 2px 2px 0 0;
        }
        .tx-sanddome {
          position: absolute; top: -10px; right: 105px; width: 16px; height: 10px;
          background: linear-gradient(180deg, hsl(0,55%,38%), hsl(0,60%,30%));
          border-radius: 8px 8px 0 0;
        }
        .tx-bell {
          position: absolute; top: -12px; right: 56px; width: 8px; height: 10px;
          background: linear-gradient(180deg, hsl(45,65%,55%), hsl(45,55%,40%));
          border-radius: 4px 4px 1px 1px;
        }
        .tx-bell-clap {
          position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
          width: 3px; height: 3px; border-radius: 50%; background: hsl(45,55%,38%);
        }

        /* Boiler */
        .tx-boiler {
          position: absolute; top: 0; right: 0; width: 160px; height: 68px;
          background: linear-gradient(180deg, hsl(0,56%,44%) 0%, hsl(0,60%,36%) 30%, hsl(0,64%,26%) 100%);
          border-radius: 0 34px 6px 6px;
          border: 1px solid rgba(255,120,120,0.15);
          box-shadow:
            inset 0 4px 8px rgba(255,255,255,0.1),
            inset 0 -6px 12px rgba(0,0,0,0.4),
            0 6px 20px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        .tx-mband {
          position: absolute; left: 0; right: 0; height: 2.5px;
          background: linear-gradient(90deg, hsl(45,60%,42%) 0%, hsl(45,70%,52%) 50%, hsl(45,60%,42%) 100%);
          opacity: 0.35;
        }
        .tx-rv {
          position: absolute; width: 3px; height: 3px; border-radius: 50%;
          background: hsl(0,0%,50%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.3);
        }
        .tx-hl {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 18px; height: 18px; border-radius: 50%;
          background: linear-gradient(135deg, hsl(0,0%,55%), hsl(0,0%,38%));
          border: 2px solid hsl(0,0%,48%);
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        }
        .tx-hl-lens {
          position: absolute; inset: 3px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, hsl(45,100%,92%), hsl(45,95%,60%));
          box-shadow: 0 0 24px 8px rgba(255,255,100,0.35);
        }
        .tx-hl-beam {
          position: absolute; top: 50%; right: -80px; transform: translateY(-50%);
          width: 80px; height: 50px;
          background: linear-gradient(90deg, rgba(255,255,150,0.08), transparent);
          clip-path: polygon(0 30%, 100% 0, 100% 100%, 0 70%);
        }
        .tx-numplate {
          position: absolute; bottom: 6px; left: 12px;
          font-size: 7px; font-family: monospace; font-weight: 800; color: hsl(45,60%,50%);
          background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 2px;
          border: 1px solid rgba(255,255,200,0.1);
        }

        /* Cab */
        .tx-cab {
          position: absolute; top: -18px; left: 0; width: 68px; height: 113px;
          background: linear-gradient(180deg, hsl(0,50%,38%) 0%, hsl(0,56%,30%) 40%, hsl(0,60%,22%) 100%);
          border-radius: 10px 10px 2px 2px;
          border: 1px solid rgba(255,100,100,0.12);
          box-shadow: inset 0 3px 6px rgba(255,255,255,0.07), inset 0 -4px 10px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .tx-cab-roof {
          position: absolute; top: -6px; left: -6px; right: -6px; height: 12px;
          background: linear-gradient(180deg, hsl(0,0%,35%), hsl(0,0%,24%));
          border-radius: 8px 8px 0 0; border: 1px solid rgba(255,255,255,0.06);
        }
        .tx-cab-side {
          position: absolute; top: 12px; bottom: 0; left: 0; width: 3px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent);
        }
        .tx-cab-win {
          position: absolute; top: 14px; left: 8px; right: 8px; height: 20px;
          background: rgba(100,180,255,0.06);
          border-radius: 4px; border: 1.5px solid rgba(255,255,255,0.1);
          box-shadow: inset 0 0 12px rgba(100,200,255,0.04);
        }
        .tx-cab-win2 { top: 38px; height: 16px; }
        .tx-cab-win-glow {
          position: absolute; inset: 0; border-radius: 3px;
          background: linear-gradient(135deg, rgba(255,200,100,0.04), transparent);
        }
        .tx-cab-logo {
          position: absolute; top: 62px; left: 50%; transform: translateX(-50%);
          width: 34px; height: 34px; border-radius: 9px; overflow: hidden;
          background: hsl(222,35%,8%);
          border: 1.5px solid rgba(255,255,255,0.15);
          box-shadow: 0 3px 14px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        }
        .tx-cab-logo-img { width: 100%; height: 100%; object-fit: cover; }
        .tx-grab {
          position: absolute; top: 8px; right: 3px; width: 2px; height: 30px;
          background: hsl(45,50%,42%); border-radius: 1px; opacity: 0.5;
        }

        .tx-runboard {
          position: absolute; bottom: 22px; left: 60px; right: -5px; height: 3px;
          background: linear-gradient(90deg, hsl(0,0%,30%), hsl(0,0%,38%), hsl(0,0%,30%));
          border-radius: 1px;
        }

        /* Cowcatcher */
        .tx-cowcatch { position: absolute; right: -14px; bottom: 0; width: 20px; height: 30px; }
        .tx-cowbar {
          position: absolute; bottom: 0; right: 0; width: 18px; height: 2.5px;
          background: hsl(0,0%,38%); transform: rotate(-30deg); transform-origin: right bottom;
          border-radius: 1px;
        }
        .tx-cowbar2 { transform: rotate(0deg); bottom: 8px; }
        .tx-cowbar3 { transform: rotate(30deg); }
        .tx-cowbase {
          position: absolute; bottom: -1px; right: -2px; width: 22px; height: 3px;
          background: hsl(0,0%,32%); border-radius: 1px;
        }

        /* Wheels */
        .tx-pilot-wh {
          position: absolute; bottom: -12px; right: 20px; width: 22px; height: 22px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,40%), hsl(0,0%,12%));
          border: 2px solid hsl(0,0%,46%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          animation: tx-whr 0.5s linear infinite; will-change: transform;
        }
        .tx-bigwh {
          position: absolute; bottom: -14px; width: 38px; height: 38px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,42%), hsl(0,0%,14%));
          border: 3px solid hsl(0,0%,48%);
          box-shadow: 0 3px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.06);
          animation: tx-whr 0.5s linear infinite; will-change: transform;
        }
        .tx-bigwh1 { left: 15px; }
        .tx-bigwh2 { left: 62px; }
        .tx-sp {
          position: absolute; top: 50%; left: 50%; width: 82%; height: 1.5px;
          background: hsl(0,0%,42%); transform: translate(-50%, -50%);
        }
        .tx-sp2 { transform: translate(-50%, -50%) rotate(60deg); }
        .tx-sp3 { transform: translate(-50%, -50%) rotate(120deg); }
        .tx-sp4 { transform: translate(-50%, -50%) rotate(45deg); }
        .tx-whub {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 7px; height: 7px; border-radius: 50%;
          background: radial-gradient(circle, hsl(0,0%,52%), hsl(0,0%,35%)); border: 1px solid hsl(0,0%,54%);
        }
        .tx-whub-lg { width: 10px; height: 10px; }
        @keyframes tx-whr { to { transform: rotate(360deg); } }

        .tx-crank {
          position: absolute; top: 50%; right: -6px; transform: translateY(-50%);
          width: 8px; height: 3px; background: hsl(0,0%,45%); border-radius: 1px;
          animation: tx-whr 0.5s linear infinite;
        }
        .tx-conrod {
          position: absolute; bottom: 5px; left: 25px; width: 52px; height: 4px;
          background: linear-gradient(90deg, hsl(0,0%,38%), hsl(0,0%,50%), hsl(0,0%,38%));
          border-radius: 2px;
          animation: tx-rod 0.5s ease-in-out infinite; will-change: transform;
        }
        @keyframes tx-rod {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(4px, -1.5px, 0); }
        }
        .tx-piston {
          position: absolute; bottom: 8px; right: 148px; width: 15px; height: 8px;
          background: linear-gradient(180deg, hsl(0,0%,42%), hsl(0,0%,30%));
          border-radius: 2px; border: 1px solid rgba(255,255,255,0.05);
        }
        .tx-cyl {
          position: absolute; bottom: 10px; right: 155px; width: 18px; height: 14px;
          background: linear-gradient(180deg, hsl(0,0%,36%), hsl(0,0%,24%));
          border-radius: 3px; border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .tx-sbox {
          position: absolute; top: 20px; right: 140px; width: 12px; height: 8px;
          background: hsl(0,55%,32%); border-radius: 2px;
        }
        .tx-pipe {
          position: absolute; top: 20px; right: 155px; width: 24px; height: 5px;
          background: linear-gradient(180deg, hsl(0,0%,38%), hsl(0,0%,26%)); border-radius: 2px;
        }

        /* ═══ COUPLER ═══ */
        .tx-couple {
          flex-shrink: 0; width: 14px; height: 8px; align-self: center; margin-bottom: 24px;
          background: linear-gradient(180deg, hsl(0,0%,38%), hsl(0,0%,22%));
          border-radius: 3px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }

        /* ═══ TENDER ═══ */
        .tx-tender { position: relative; width: 75px; height: 65px; flex-shrink: 0; }
        .tx-tender-body {
          position: relative; height: 50px;
          background: linear-gradient(180deg, hsl(0,50%,34%) 0%, hsl(0,56%,24%) 100%);
          border-radius: 3px; border: 1px solid rgba(255,100,100,0.1);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.06), inset 0 -3px 8px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .tx-tender-coal {
          position: absolute; top: 0; left: 2px; right: 2px; height: 18px;
          background: linear-gradient(180deg, hsl(0,0%,8%), hsl(0,0%,14%));
          border-radius: 0 0 3px 3px;
        }
        .tx-tender-rim {
          position: absolute; top: -2px; left: -2px; right: -2px; height: 5px;
          background: linear-gradient(180deg, hsl(0,0%,32%), hsl(0,0%,24%));
          border-radius: 3px 3px 0 0;
        }
        .tx-tender-frame {
          position: absolute; bottom: 2px; left: 5px; right: 5px; height: 4px;
          background: hsl(0,0%,22%); border-radius: 1px;
        }
        .tx-twh {
          position: absolute; bottom: -8px; width: 16px; height: 16px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,38%), hsl(0,0%,12%));
          border: 2px solid hsl(0,0%,44%);
          animation: tx-whr 0.5s linear infinite; will-change: transform;
        }
        .tx-twh1 { left: 4px; }
        .tx-twh2 { left: 25px; }
        .tx-twh3 { right: 4px; }

        /* ═══ WAGON — premium passenger car ═══ */
        .tx-wgrp { display: flex; align-items: flex-end; flex-shrink: 0; }
        .tx-wagon { position: relative; width: 180px; flex-shrink: 0; }
        .tx-wbody {
          position: relative; height: 140px; overflow: visible;
          background: linear-gradient(180deg, hsl(222,26%,16%) 0%, hsl(222,28%,12%) 30%, hsl(222,24%,9%) 60%, hsl(222,20%,6%) 100%);
          border-radius: 5px 5px 2px 2px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow:
            inset 0 2px 6px rgba(255,255,255,0.04),
            inset 0 -4px 10px rgba(0,0,0,0.4),
            0 6px 20px rgba(0,0,0,0.45);
        }
        .tx-wtop-hl {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        .tx-wroof {
          position: absolute; top: -4px; left: -3px; right: -3px; height: 8px;
          background: linear-gradient(180deg, hsl(222,14%,22%), hsl(222,18%,16%));
          border-radius: 6px 6px 0 0; border: 1px solid rgba(255,255,255,0.05);
        }
        .tx-wroof-vent {
          position: absolute; top: -3px; left: 50%; transform: translateX(-50%);
          width: 14px; height: 5px;
          background: linear-gradient(180deg, hsl(222,10%,26%), hsl(222,14%,20%));
          border-radius: 3px 3px 0 0;
        }
        .tx-wside {
          position: absolute; top: 8px; left: 0; right: 0; bottom: 0; overflow: hidden;
        }
        .tx-wwin {
          position: absolute; top: 10px; width: 35px; height: 22px;
          background: rgba(80,160,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          box-shadow: inset 0 0 10px rgba(100,200,255,0.03), 0 0 6px rgba(0,0,0,0.2);
        }
        .tx-wwin1 { left: 12px; }
        .tx-wwin2 { left: 55px; }
        .tx-wwin3 { left: 98px; }
        .tx-wrv { bottom: 6px !important; top: auto !important; }
        .tx-wstripe {
          position: absolute; bottom: 20px; left: 0; right: 0; height: 3px;
          opacity: 0.6; border-radius: 0;
        }
        .tx-wskirt {
          position: absolute; bottom: -2px; left: -1px; right: -1px; height: 6px;
          background: linear-gradient(180deg, hsl(0,0%,28%), hsl(0,0%,18%));
          border-radius: 0 0 3px 3px;
        }

        /* ═ BUBBLE — the service info floating inside wagon ═ */
        .tx-bubble {
          position: absolute; top: 46%; left: 50%; transform: translate(-50%, -50%);
          width: 85%; padding: 12px 10px; border-radius: 16px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          text-align: center; z-index: 3;
        }
        .tx-bub-glow {
          position: absolute; inset: -8px; border-radius: 24px; opacity: 0.4; pointer-events: none;
        }
        .tx-bub-icon {
          width: 34px; height: 34px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 7px;
        }
        .tx-bub-title {
          font-size: 11px; font-weight: 800; color: white;
          line-height: 1.2; margin-bottom: 3px; letter-spacing: -0.02em;
        }
        .tx-bub-desc { font-size: 8px; color: rgba(255,255,255,0.4); line-height: 1.45; }

        .tx-wplate {
          position: absolute; bottom: 5px; right: 6px;
          font-size: 7px; font-family: monospace; font-weight: 700; color: rgba(255,255,255,0.15);
          padding: 1px 5px; border-radius: 2px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
        }

        /* Undercarriage */
        .tx-uframe {
          position: absolute; bottom: -4px; left: 8px; right: 8px; height: 8px;
          background: linear-gradient(180deg, hsl(0,0%,28%), hsl(0,0%,16%));
          border-radius: 0 0 3px 3px;
        }
        .tx-ubeam {
          position: absolute; top: 3px; left: 20%; width: 3px; height: 5px;
          background: hsl(0,0%,22%);
        }
        .tx-ubeam2 { left: auto; right: 20%; }

        /* Bogies */
        .tx-bog { position: absolute; bottom: -12px; width: 50px; height: 16px; }
        .tx-bog-l { left: 8px; }
        .tx-bog-r { right: 8px; }
        .tx-bogfr {
          position: absolute; top: 0; left: 3px; right: 3px; height: 5px;
          background: linear-gradient(180deg, hsl(0,0%,32%), hsl(0,0%,20%)); border-radius: 2px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .tx-bogwh {
          position: absolute; bottom: -3px; width: 16px; height: 16px; border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, hsl(0,0%,40%), hsl(0,0%,12%));
          border: 2px solid hsl(0,0%,44%);
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          animation: tx-whr 0.5s linear infinite; will-change: transform;
        }
        .tx-bogwh1 { left: 0; }
        .tx-bogwh2 { right: 0; }

        /* End lamp */
        .tx-endlamp {
          flex-shrink: 0; width: 8px; height: 14px; align-self: center; margin-bottom: 30px; margin-left: 6px;
          background: linear-gradient(to top, hsl(0,70%,35%), hsl(0,60%,50%));
          border-radius: 4px 4px 0 0; border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 12px rgba(255,50,50,0.25);
        }

        /* ═══ RESPONSIVE ═══ */
        @media (prefers-reduced-motion: reduce) {
          .tx-star, .tx-skyline-far, .tx-skyline-near, .tx-ties,
          .tx-spark, .tx-puff, .tx-train, .tx-bigwh, .tx-pilot-wh,
          .tx-twh, .tx-bogwh, .tx-conrod, .tx-crank { animation: none !important; }
        }
        @media (max-width: 768px) {
          .tx-scene { height: 420px; }
          .tx-loco { width: 170px; height: 76px; }
          .tx-boiler { width: 120px; height: 54px; }
          .tx-cab { width: 54px; height: 90px; top: -14px; }
          .tx-wagon { width: 140px; }
          .tx-wbody { height: 110px; }
          .tx-bubble { padding: 8px 6px; border-radius: 12px; }
          .tx-bub-icon { width: 28px; height: 28px; border-radius: 9px; margin-bottom: 5px; }
          .tx-bub-icon svg { width: 13px !important; height: 13px !important; }
          .tx-bub-title { font-size: 9.5px; }
          .tx-bub-desc { font-size: 7px; }
          .tx-tender { width: 58px; height: 52px; }
          .tx-tender-body { height: 40px; }
          .tx-bigwh { width: 30px; height: 30px; }
          .tx-train { right: 8px; }
        }
        @media (max-width: 480px) {
          .tx-scene { height: 340px; }
          .tx-wagon { width: 108px; }
          .tx-wbody { height: 88px; }
          .tx-bub-desc { display: none; }
          .tx-bubble { padding: 5px 4px; border-radius: 10px; }
          .tx-bub-icon { width: 22px; height: 22px; margin-bottom: 3px; }
          .tx-bub-title { font-size: 8px; }
          .tx-loco { width: 130px; height: 60px; }
          .tx-boiler { width: 90px; height: 44px; }
          .tx-cab { width: 42px; height: 72px; }
          .tx-wwin { display: none; }
          .tx-skyline-near { display: none; }
          .tx-tender { width: 45px; height: 42px; }
          .tx-tender-body { height: 32px; }
        }
      `}</style>
    </section>
  );
};

export default Services;

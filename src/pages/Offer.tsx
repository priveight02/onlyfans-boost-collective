import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Check, X, Shield, Star, Sparkles, Bot, Globe, Clock, Gift, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import UnifiedBackground from "@/components/UnifiedBackground";

import reviewPhoto1 from "@/assets/review-photo-1.jpg";
import reviewPhoto2 from "@/assets/review-photo-2.jpg";
import reviewPhoto3 from "@/assets/review-photo-3.jpg";
import mascotWith from "@/assets/mascot-with.png";
import mascotWithout from "@/assets/mascot-without.png";

const Offer = () => {
  const { user } = useAuth();
  const { purchaseCount } = useWallet();
  const navigate = useNavigate();

  // Redirect if already purchased
  useEffect(() => {
    if (purchaseCount > 0) {
      navigate("/pricing", { replace: true });
    }
  }, [purchaseCount, navigate]);

  const handleCTA = () => {
    navigate(user ? "/pricing" : "/auth");
  };

  return (
    <UnifiedBackground variant="offer">
      <PageSEO
        title="Exclusive Offer - Start Growing with Uplyze AI Today"
        description="Limited-time offer: Get started with Uplyze AI platform. Automate engagement, close more sales, and scale revenue on autopilot."
      />

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.08] rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative flex flex-col lg:flex-row items-center gap-10">
              <div className="flex-1 text-left">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5"
                >
                  Stop Guessing.
                  <br />
                  <span className="uplyze-highlight">Start Scaling.</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                  className="text-white/55 text-lg leading-relaxed mb-8 max-w-lg"
                >
                  AI platform built for creators, agencies, and businesses to automate engagement, optimize conversions, and scale revenue 24/7.
                </motion.p>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  onClick={handleCTA}
                  className="group inline-flex items-center gap-2.5 rounded-2xl px-10 py-4 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    boxShadow: "0 6px 26px hsl(var(--primary) / 0.35), inset 0 0 0 1px hsl(0 0% 100% / 0.07)",
                  }}
                >
                  Get Started Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.button>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center gap-6 mt-8 flex-wrap"
                >
                  {[
                    { icon: Globe, label: "Any Platform" },
                    { icon: Shield, label: "30-Day Guarantee" },
                    { icon: Zap, label: "Instant Setup" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-white/45 text-sm">
                      <item.icon className="h-3.5 w-3.5 text-primary/70" />
                      {item.label}
                    </div>
                  ))}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative flex-shrink-0"
              >
                <img
                  src={mascotWith}
                  alt="Uplyze AI"
                  className="w-56 sm:w-72 lg:w-80 drop-shadow-2xl"
                />
                <div className="absolute -top-2 -right-2 px-4 py-2 rounded-xl font-black text-lg rotate-6"
                  style={{
                    background: "linear-gradient(135deg, hsl(80 75% 65%), hsl(75 80% 55%))",
                    color: "hsl(222 35% 12%)",
                    boxShadow: "0 4px 16px hsl(80 75% 50% / 0.4)",
                  }}
                >
                  AI-Powered
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-12 tracking-tight">
            Why This Works<br />When Others Couldn't
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fail card */}
            <div className="rounded-2xl bg-white/[0.03] border border-red-500/20 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/40 to-transparent" />
              <div className="flex justify-center mb-6">
                <img src={mascotWithout} alt="Without AI" className="w-32 h-32 object-contain opacity-80" />
              </div>
              <h3 className="text-lg font-bold text-white mb-4">
                <span className="text-red-400">Most people fail</span> at scaling because:
              </h3>
              <ul className="space-y-3">
                {[
                  "They manually respond to DMs and burn out",
                  "They don't know which leads are worth pursuing",
                  "They use 10+ disconnected tools",
                  "They post without strategy or AI insights",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/60 text-sm">
                    <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Win card */}
            <div className="rounded-2xl bg-white/[0.03] border border-emerald-500/20 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
              <div className="flex justify-center mb-6">
                <img src={mascotWith} alt="With Uplyze AI" className="w-32 h-32 object-contain" />
              </div>
              <h3 className="text-lg font-bold text-white mb-4">
                Uplyze wins because it's <span className="text-emerald-400">built on what works:</span>
              </h3>
              <ul className="space-y-3">
                {[
                  "AI handles conversations 24/7 on autopilot",
                  "Smart lead scoring finds your best buyers",
                  "One platform replaces 10+ tools instantly",
                  "AI-powered content and engagement at scale",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/60 text-sm">
                    <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* From Zero to Live */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-14 tracking-tight">
            From ZERO to <span className="inline-flex items-center"><span className="w-4 h-4 bg-emerald-500 rounded-full inline-block mx-2" /></span> LIVE RESULTS
            <br />in under 1 hour
          </h2>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Connect",
                desc: "Link your social accounts in seconds. Uplyze connects to Instagram, TikTok, Facebook, and 14+ platforms automatically.",
              },
              {
                step: "02",
                title: "Configure",
                desc: "Set your AI persona, response style, and conversion goals. Our AI learns your brand voice and adapts naturally.",
              },
              {
                step: "03",
                title: "Scale",
                desc: "Launch autopilot. Uplyze engages, converts, and scales your revenue while you sleep. Track everything in real-time.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex gap-6 items-start"
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-primary/60">{item.step}</span>
                  {i < 2 && <div className="w-px h-16 bg-gradient-to-b from-primary/30 to-transparent mt-2" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed max-w-lg">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote: "We went from burning time on manual DMs to generating $45K in revenue. The AI finds winning angles we never would have thought of.",
                name: "Sarah C.",
                role: "Agency Owner",
                stat: "15x ROI",
                photo: reviewPhoto1,
              },
              {
                quote: "Replaced 8 tools with Uplyze. Better results, 90% less cost, and we actually understand what's happening with our clients.",
                name: "Mike R.",
                role: "Digital Marketer",
                stat: "847% Growth",
                photo: reviewPhoto2,
              },
              {
                quote: "The AI engagement is worth 10x the price. We see exactly what's working in real-time and adapt instantly.",
                name: "Emma T.",
                role: "Content Creator",
                stat: "$2M+ Revenue",
                photo: reviewPhoto3,
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-amber-400" />
                  ))}
                </div>
                <p className="text-white/65 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={t.photo} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-white/35 text-xs">{t.role}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                    {t.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white/[0.03] border border-primary/20 p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Our Guarantee</h3>
                <p className="text-white/55 text-sm leading-relaxed mb-4">
                  Try Uplyze risk-free. If you don't see results in 14 days, we'll work with you to make it right — no questions asked. We believe in our platform because it's built on real data and real results.
                </p>
                <p className="text-white/70 text-sm font-semibold">
                  Your success is our success. No hard feelings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Choices */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-10 tracking-tight">
            You have two choices
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Hard Way */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 text-left">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Option A</p>
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">😓</span> The Hard Way
              </h3>
              <p className="text-white/45 text-sm leading-relaxed">
                Keep doing everything manually. Keep responding to every DM yourself. Keep burning cash on scattered tools that don't talk to each other.
              </p>
            </div>
            {/* Smart Way */}
            <div className="rounded-2xl bg-white/[0.03] border border-primary/30 p-8 text-left relative">
              <div className="absolute -top-3 right-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  Recommended
                </span>
              </div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Option B</p>
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🚀</span> The Uplyze Way
              </h3>
              <p className="text-white/45 text-sm leading-relaxed">
                Automate the grunt work. Let AI handle engagement and conversions. Scale your revenue while you sleep. Join 700+ businesses already growing.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCTA}
            className="mt-10 inline-flex items-center gap-2.5 rounded-2xl px-12 py-4 text-base font-semibold text-white transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
              boxShadow: "0 6px 26px hsl(var(--primary) / 0.35), inset 0 0 0 1px hsl(0 0% 100% / 0.07)",
            }}
          >
            Start Scaling Now
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </section>

      <Footer />
    </UnifiedBackground>
  );
};

export default Offer;

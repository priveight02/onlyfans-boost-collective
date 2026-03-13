import { useState } from "react";
import { Gift, Check, X, Shield, Globe, Clock, Star, ChevronDown, ChevronUp, Zap, ArrowRight, TrendingUp, Target, BarChart3, Bot, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import StickyRedeemPill from "@/components/StickyRedeemPill";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import ComparisonSection from "@/components/ComparisonSection";

const faqs = [
  { q: "Do I need to be a marketing expert to use Uplyze?", a: "Not at all. Uplyze is built for beginners and pros alike. The AI handles the heavy lifting — strategy, optimization, and scaling. You just need a product or service to promote." },
  { q: "How is this different from hiring an agency?", a: "Agencies charge $3K–$10K/month and take weeks to onboard. Uplyze gives you the same (or better) results instantly at a fraction of the cost, running 24/7 without human delays." },
  { q: "Will it waste my budget on bad tests?", a: "No. Uplyze uses Anti-Burn Protection that automatically pauses underperforming campaigns and reallocates budget to winners. Your spend is always optimized." },
  { q: "I already have a marketing team. Can they use this?", a: "Absolutely. Uplyze amplifies your team's output by automating repetitive tasks, providing AI insights, and scaling what works. Most teams see 3–5x productivity gains." },
  { q: "Does Uplyze work in my language and currency?", a: "Yes. Uplyze supports all languages and currencies. The AI generates content and manages campaigns in any language your audience speaks." },
  { q: "What if it doesn't work for me?", a: "Try it for 14 days. If it's not a fit, just ask for a refund. No hard feelings. We only win when you win." },
];

const stats = [
  { value: "847%", label: "Average ROI increase" },
  { value: "10x", label: "Faster than agencies" },
  { value: "24/7", label: "Always-on automation" },
  { value: "$2M+", label: "Revenue generated" },
];

const features = [
  { icon: Bot, title: "AI Copilot", desc: "Strategy, content, and execution — all from one AI brain." },
  { icon: Target, title: "Smart Targeting", desc: "Finds your ideal audience and optimizes in real time." },
  { icon: BarChart3, title: "Revenue Tracking", desc: "See exactly what's working and double down instantly." },
  { icon: TrendingUp, title: "Auto-Scale", desc: "Winners get more budget. Losers get killed. Automatically." },
  { icon: Sparkles, title: "Creative Engine", desc: "Generates ads, videos, and copy that actually convert." },
  { icon: Lock, title: "Anti-Burn Shield", desc: "Pauses bad campaigns before they waste your budget." },
];

const RedeemButton = ({ onClick, size = "default" }: { onClick: () => void; size?: "default" | "large" }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center gap-2.5 rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-[0.98] ${
      size === "large" ? "px-10 py-4 text-sm" : "px-8 py-3.5 text-sm"
    }`}
    style={{
      background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(240, 80%, 55%))",
      color: "white",
      boxShadow: "0 8px 32px hsla(262, 83%, 58%, 0.35), inset 0 1px 0 hsla(0, 0%, 100%, 0.15)",
    }}
  >
    <Gift className="h-4 w-4" />
    Redeem 40% OFF
    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
  </button>
);

const Offer = () => {
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <AnimatedBackground variant="offer">
      <PageSEO
        title="Special Offer - Uplyze AI Platform | 40% OFF Limited Time"
        description="Get 40% off Uplyze AI Platform. Automate your marketing, scale revenue, and crush your competition with AI-powered tools."
      />

      {/* ─── HERO ─── */}
      <section className="pt-28 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium"
              style={{ background: "hsla(262, 83%, 58%, 0.12)", border: "1px solid hsla(262, 83%, 58%, 0.2)", color: "hsl(262, 83%, 72%)" }}>
              <Zap className="h-3 w-3" />
              LIMITED TIME — 40% OFF EVERYTHING
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-2 tracking-tight">
              Stop Guessing.
            </h1>
            <h2 className="text-5xl md:text-7xl font-black leading-[1.05] mb-8 tracking-tight uplyze-highlight">
              Start Crushing.
            </h2>

            <p className="text-white/50 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
              AI Platform trained by world-class growth experts to automate your marketing, optimize your campaigns 24/7, and scale your revenue.
            </p>

            <RedeemButton onClick={() => setShowModal(true)} size="large" />

            <div className="flex items-center justify-center gap-5 mt-8 text-xs text-white/35">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Any Language</span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Any Currency</span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> 14-Day Guarantee</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center py-6 rounded-2xl"
                style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.06)" }}
              >
                <p className="text-2xl md:text-3xl font-black text-white mb-1">{s.value}</p>
                <p className="text-xs text-white/40">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY THIS WORKS (ComparisonSection) ─── */}
      <ComparisonSection />

      {/* ─── WHAT YOU GET ─── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
              Everything You Need.
              <br />
              <span className="text-white/40">Nothing You Don't.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group rounded-2xl p-6 transition-all duration-300 hover:border-purple-500/20"
                style={{ background: "hsla(0, 0%, 100%, 0.025)", border: "1px solid hsla(0, 0%, 100%, 0.06)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
                  style={{ background: "hsla(262, 83%, 58%, 0.1)" }}>
                  <f.icon className="h-5 w-5" style={{ color: "hsl(262, 83%, 68%)" }} />
                </div>
                <h3 className="text-white font-bold text-sm mb-1.5">{f.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FROM ZERO TO LIVE ─── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-white text-center mb-16 tracking-tight"
          >
            From ZERO to{" "}
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span className="text-emerald-400">LIVE</span>
            </span>
            <br />
            in 5 minutes
          </motion.h2>

          <div className="space-y-0">
            {[
              { num: "01", title: "The Scan", desc: "Paste your product URL. Uplyze analyzes your niche and identifies the exact hooks making money right now.", icon: Target },
              { num: "02", title: "The Remix", desc: "We pull your product data and auto-generate 50+ high-converting strategies and creatives in seconds.", icon: Sparkles },
              { num: "03", title: "The Scale", desc: 'Click "Launch." Uplyze tests, optimizes, and scales the winners while you sleep.', icon: TrendingUp },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-6"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "hsla(262, 83%, 58%, 0.1)", border: "1px solid hsla(262, 83%, 58%, 0.15)" }}>
                    <step.icon className="h-5 w-5" style={{ color: "hsl(262, 83%, 68%)" }} />
                  </div>
                  {i < 2 && <div className="w-px h-16 my-2" style={{ background: "linear-gradient(to bottom, hsla(262, 83%, 58%, 0.3), transparent)" }} />}
                </div>
                <div className="pt-2 pb-8">
                  <span className="text-[10px] font-bold tracking-widest text-white/25 uppercase">Step {step.num}</span>
                  <h3 className="text-lg font-bold text-white mb-1.5">{step.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-4">
            <RedeemButton onClick={() => setShowModal(true)} />
          </div>
        </div>
      </section>

      {/* ─── REVIEWS ─── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black text-white text-center mb-12 tracking-tight"
          >
            What Our Users Say
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { quote: "We went from burning $3K/month to generating $45K in revenue. The AI finds winning angles we never would have thought of.", name: "Sarah Chen", title: "Founder, EcoBeauty", badge: "15x ROAS" },
              { quote: "Replaced our $8K/month agency with Uplyze. Better results, 90% less cost, and we actually understand what's happening.", name: "Mike Rodriguez", title: "CEO, TechGear Pro", badge: "847% ROI" },
              { quote: "The competitor tracking alone is worth 10x the price. We see exactly what's working in our market and adapt instantly.", name: "Emma Thompson", title: "Marketing Director, FitLife", badge: "$2M+ generated" },
            ].map((review, i) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl p-6"
                style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.06)" }}
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-white/55 text-sm leading-relaxed mb-5">"{review.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{review.name}</p>
                    <p className="text-white/30 text-xs">{review.title}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: "hsla(262, 83%, 58%, 0.12)", color: "hsl(262, 83%, 72%)" }}>
                    {review.badge}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOUNDER MESSAGE ─── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-5 flex items-center justify-center gap-2">
            <Shield className="h-3 w-3" /> OUR GUARANTEE
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl p-8 md:p-10"
            style={{
              background: "hsla(0, 0%, 100%, 0.025)",
              border: "1px solid hsla(0, 0%, 100%, 0.06)",
              borderTop: "2px solid hsl(262, 83%, 58%)",
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{ background: "hsla(262, 83%, 58%, 0.1)" }}>
                <Sparkles className="h-5 w-5" style={{ color: "hsl(262, 83%, 68%)" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">A message from the Team</h3>
                <p className="text-white/35 text-sm">Co-founders of Uplyze · <span className="font-medium" style={{ color: "hsl(262, 83%, 68%)" }}>$100M+ in growth managed</span></p>
              </div>
            </div>
            <div className="space-y-3.5 text-white/45 text-sm leading-relaxed">
              <p>Hi! We spent the last 8 years helping businesses grow — testing strategies, scaling campaigns, optimizing budgets.</p>
              <p>At some point we had too many clients and not enough hours. So we started building internal tools to automate what we were doing manually.</p>
              <p className="text-white font-semibold">Just to work less and spend more time with people we care about, honestly.</p>
              <p>It worked. Our clients got better results and we weren't burning out. Then we realized — <em className="text-white/60">why are we the only ones using this?</em></p>
              <p>So we turned it into Uplyze. Everything we learned from $100M+ in growth, now automated for anyone looking to scale.</p>
              <p>Uplyze won't fix a bad product or broken website. But if your offer is solid and you just need better marketing and smarter automation — we've got you.</p>
            </div>
            <div className="mt-6 p-4 rounded-xl flex items-start gap-3"
              style={{ background: "hsla(262, 83%, 58%, 0.06)", border: "1px solid hsla(262, 83%, 58%, 0.1)" }}>
              <Shield className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(262, 83%, 68%)" }} />
              <p className="text-sm text-white/50">
                <strong className="text-white/70">Try it for 14 days.</strong> If it's not a fit, just ask for a refund. No hard feelings.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black text-white text-center mb-12 tracking-tight"
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b" style={{ borderColor: "hsla(0, 0%, 100%, 0.06)" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="text-white/80 font-medium text-sm pr-4 group-hover:text-white transition-colors">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-white/30 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-white/20 shrink-0" />}
                </button>
                {openFaq === i && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white/40 text-sm leading-relaxed pb-5 pr-8"
                  >
                    {faq.a}
                  </motion.p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TWO CHOICES ─── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-white text-center mb-12 tracking-tight"
          >
            You have two choices
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl p-8"
              style={{ background: "hsla(0, 0%, 100%, 0.025)", border: "1px solid hsla(0, 0%, 100%, 0.06)" }}
            >
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3.5 h-3.5 border border-white/15 rounded" /> OPTION A
              </p>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-3">The Hard Way</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Keep guessing. Keep staying up until 2 AM staring at dashboards. Keep burning cash on strategies that don't convert.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-2xl p-8"
              style={{ background: "hsla(0, 0%, 100%, 0.025)", border: "1px solid hsla(262, 83%, 58%, 0.2)" }}
            >
              <div className="absolute -top-3 right-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: "hsl(262, 83%, 58%)", color: "white" }}>
                  Recommended
                </span>
              </div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3.5 h-3.5 border border-white/15 rounded" /> OPTION B
              </p>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-3">The Uplyze Way</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Steal the winning strategies. Automate the grunt work. Scale your revenue while you sleep.
              </p>
            </motion.div>
          </div>
          <div className="text-center mt-12">
            <RedeemButton onClick={() => setShowModal(true)} size="large" />
          </div>
        </div>
      </section>

      <Footer />
      <StickyRedeemPill />

      <InsufficientCreditsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        actionName="Add Credits"
      />
    </AnimatedBackground>
  );
};

export default Offer;

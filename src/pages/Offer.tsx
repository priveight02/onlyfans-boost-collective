import { useState } from "react";
import { Gift, Check, X, Shield, Globe, Clock, Star, ChevronDown, ChevronUp } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import StickyRedeemPill from "@/components/StickyRedeemPill";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import ComparisonSection from "@/components/ComparisonSection";

const faqs = [
  { q: "Do I need to be a marketing expert to use Uplyze?", a: "Not at all. Uplyze is built for beginners and pros alike. The AI handles the heavy lifting - strategy, optimization, and scaling. You just need a product or service to promote." },
  { q: "How is this different from hiring an agency?", a: "Agencies charge $3K-$10K/month and take weeks to onboard. Uplyze gives you the same (or better) results instantly at a fraction of the cost, running 24/7 without human delays." },
  { q: "Will it waste my budget on bad tests?", a: "No. Uplyze uses Anti-Burn Protection that automatically pauses underperforming campaigns and reallocates budget to winners. Your spend is always optimized." },
  { q: "I already have a marketing team. Can they use this?", a: "Absolutely. Uplyze amplifies your team's output by automating repetitive tasks, providing AI insights, and scaling what works. Most teams see 3-5x productivity gains." },
  { q: "Does Uplyze work in my language and currency?", a: "Yes. Uplyze supports all languages and currencies. The AI generates content and manages campaigns in any language your audience speaks." },
  { q: "What if it doesn't work for me?", a: "Try it for 14 days. If it's not a fit, just ask for a refund. No hard feelings. We only win when you win." },
];

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
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: "hsla(0, 0%, 100%, 0.97)" }}>
            <div className="grid md:grid-cols-2 gap-0 items-center p-8 md:p-12">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-2">
                  Stop Guessing.
                </h1>
                <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6" style={{ color: "hsl(262, 83%, 58%)" }}>
                  Start Crushing.
                </h2>
                <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                  AI Platform trained by world-class growth experts to automate your marketing, optimize your campaigns 24/7, and scale your revenue.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105"
                  style={{
                    background: "hsl(222, 35%, 12%)",
                    color: "white",
                  }}
                >
                  <Gift className="h-4 w-4" />
                  Redeem 40% OFF
                </button>
                <div className="flex items-center gap-4 mt-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Any Language</span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Any Currency</span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> 30-Day Guarantee</span>
                </div>
              </div>
              <div className="relative flex justify-center items-end">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-purple-100 to-blue-50 flex items-center justify-center">
                  <div className="text-6xl">🥷</div>
                </div>
                <div className="absolute top-4 right-4 md:top-8 md:right-8 rotate-12 px-4 py-2 rounded-lg font-black text-2xl" style={{ background: "hsl(75, 80%, 72%)", color: "hsl(222, 35%, 12%)" }}>
                  $99<span className="text-sm font-semibold block -mt-1">per month</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY THIS WORKS ─── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-12">
            Why This Works<br />When You Couldn't
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fail card */}
            <div className="rounded-2xl p-8 border-2" style={{ background: "hsla(0, 0%, 100%, 0.95)", borderColor: "hsla(0, 70%, 60%, 0.3)" }}>
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-red-100 flex items-center justify-center text-5xl">😞</div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                <span className="text-red-500">Most people fail</span> at marketing because:
              </h3>
              <ul className="space-y-3">
                {[
                  "They test 1-2 strategies, give up when it doesn't work",
                  "They don't know which metrics actually matter",
                  "They scale too fast or too slow",
                  "They use boring content that doesn't stop the scroll",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Win card */}
            <div className="rounded-2xl p-8 border-2" style={{ background: "hsla(0, 0%, 100%, 0.95)", borderColor: "hsla(120, 60%, 50%, 0.3)" }}>
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center text-5xl">💰</div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Uplyze wins because it's trained on what works:
              </h3>
              <ul className="space-y-3">
                {[
                  "$100M+ in proven, winning campaigns",
                  "50,000+ high-performing creatives analyzed",
                  "Every algorithm update since 2019",
                  "Real data, not guesswork - built for consistent conversions.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FROM ZERO TO LIVE ─── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-14">
            From ZERO to <span className="inline-flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-emerald-400 inline-block" /> LIVE RESULTS</span><br />in 5 minutes
          </h2>
          <div className="space-y-12">
            {[
              { num: "01", title: "The Scan", desc: "Paste your product URL. Uplyze analyzes your niche and identifies the exact hooks making money right now." },
              { num: "02", title: "The Remix", desc: "We pull your product data and auto-generate 50+ high-converting strategies and creatives in seconds." },
              { num: "03", title: "The Scale", desc: 'Click "Launch." Uplyze tests, optimizes, and scales the winners while you sleep.' },
            ].map((step, i) => (
              <div key={step.num} className="flex items-start gap-6 md:gap-10">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black" style={{ color: "hsl(262, 70%, 65%)" }}>{step.num}</span>
                  {i < 2 && <div className="w-0.5 h-16 mt-2" style={{ background: "hsl(262, 70%, 65%)" }} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed max-w-md">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ANTI-BURN PROTECTION ─── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center" style={{ background: "hsla(0, 0%, 100%, 0.95)" }}>
            <div>
              <h2 className="text-3xl font-black mb-4" style={{ color: "hsl(35, 90%, 55%)" }}>Anti-Burn Protection</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                If your funnel is broken, Uplyze pauses the campaigns and tells you how to fix it.
              </p>
              <p className="text-gray-900 font-bold text-sm">We never waste budget.</p>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center text-6xl">🛡️</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── REVIEWS ─── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: "We went from burning $3K/month to generating $45K in revenue. The AI finds winning angles we never would have thought of.", name: "Sarah Chen", title: "Founder, EcoBeauty", badge: "15x ROAS" },
              { quote: "Replaced our $8K/month agency with Uplyze. Better results, 90% less cost, and we actually understand what's happening.", name: "Mike Rodriguez", title: "CEO, TechGear Pro", badge: "847% ROI increase" },
              { quote: "The competitor tracking alone is worth 10x the price. We see exactly what's working in our market and adapt instantly.", name: "Emma Thompson", title: "Marketing Director, FitLife", badge: "$2M+ generated" },
            ].map((review) => (
              <div key={review.name} className="rounded-2xl p-6" style={{ background: "hsla(0, 0%, 100%, 0.95)" }}>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{review.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">{review.name}</p>
                    <p className="text-gray-400 text-xs">{review.title}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: "hsl(262, 60%, 92%)", color: "hsl(262, 70%, 50%)" }}>
                    {review.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MESSAGE FROM FOUNDER ─── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
            <Shield className="h-3.5 w-3.5" /> OUR GUARANTEE
          </p>
          <div className="rounded-2xl p-8 md:p-12 text-left" style={{ background: "hsla(0, 0%, 100%, 0.95)", borderTop: "3px solid hsl(262, 83%, 58%)" }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-200 to-blue-100 flex items-center justify-center text-2xl">👨‍💻</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">A message from the Team</h3>
                <p className="text-gray-400 text-sm">Co-founders of Uplyze · <span className="text-purple-600 font-medium">$100M+ in growth managed</span></p>
              </div>
            </div>
            <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>Hi! We spent the last 8 years helping businesses grow - testing strategies, scaling campaigns, optimizing budgets.</p>
              <p>At some point we had too many clients and not enough hours. So we started building internal tools to automate what we were doing manually.</p>
              <p className="text-gray-900 font-semibold">Just to work less and spend more time with people we care about, honestly.</p>
              <p>It worked. Our clients got better results and we weren't burning out. Then we realized — <em>why are we the only ones using this?</em></p>
              <p>So we turned it into Uplyze. Everything we learned from $100M+ in growth, now automated for anyone looking to scale.</p>
              <p>Uplyze won't fix a bad product or broken website. But if your offer is solid and you just need better marketing and smarter automation - we've got you.</p>
            </div>
            <div className="mt-6 p-4 rounded-xl flex items-start gap-3" style={{ background: "hsl(262, 60%, 95%)" }}>
              <Shield className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Try it for 14 days.</strong> If it's not a fit, just ask for a refund. No hard feelings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-10">F.A.Q.</h2>
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b" style={{ borderColor: "hsla(0, 0%, 100%, 0.08)" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span className="text-white font-semibold text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-white/40 shrink-0" /> : <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />}
                </button>
                {openFaq === i && (
                  <p className="text-white/50 text-sm leading-relaxed pb-5 pr-8">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TWO CHOICES ─── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-10">You have two choices</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-8" style={{ background: "hsla(0, 0%, 100%, 0.95)" }}>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-4 border border-gray-300 rounded" /> OPTION A
              </p>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-3">😰 The Hard Way</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Keep guessing. Keep staying up until 2 AM staring at dashboards. Keep burning cash on strategies that don't convert.
              </p>
            </div>
            <div className="relative rounded-2xl p-8" style={{ background: "hsla(0, 0%, 100%, 0.95)" }}>
              <div className="absolute -top-3 right-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: "hsl(262, 60%, 92%)", color: "hsl(262, 70%, 50%)" }}>
                  Recommended
                </span>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-4 border border-gray-300 rounded" /> OPTION B
              </p>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-3">🥷 The Uplyze Way</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Steal the winning strategies. Automate the grunt work. Scale your revenue while you sleep.
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(222, 80%, 50%))",
                color: "white",
                boxShadow: "0 8px 24px hsla(262, 83%, 58%, 0.3)",
              }}
            >
              <Gift className="h-4 w-4" />
              Redeem 40% OFF
            </button>
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

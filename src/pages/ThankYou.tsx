import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, ShieldCheck, Coins, Zap, LayoutDashboard, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageSEO from "@/components/PageSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

import creditsStarter from "@/assets/credits-starter.png";
import creditsPro from "@/assets/credits-pro-new.png";
import creditsStudio from "@/assets/credits-studio-new.png";
import creditsPower from "@/assets/credits-power-new.png";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonus_credits: number;
  price_cents: number;
  stripe_price_id: string;
  is_popular: boolean;
  sort_order: number;
}

const PACKAGE_IMAGES: Record<string, string> = {
  "starter": creditsStarter,
  "pro": creditsPro,
  "studio": creditsStudio,
  "power": creditsPower,
};

const getPackageImage = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(PACKAGE_IMAGES)) {
    if (lower.includes(key)) return img;
  }
  return creditsStarter;
};

const ThankYou = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(30);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  const creditsAdded = parseInt(searchParams.get("credits") || "0");
  const pkgName = searchParams.get("pkg") || "";

  useEffect(() => {
    if (!creditsAdded || creditsAdded <= 0) {
      navigate("/pricing", { replace: true });
    }
  }, [creditsAdded, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data) setPackages(data as CreditPackage[]);
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate("/platform", { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  // Auto-scroll carousel
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let scrollPos = 0;
    const speed = 0.5;
    let animFrame: number;
    const scroll = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth / 2) scrollPos = 0;
      el.scrollLeft = scrollPos;
      animFrame = requestAnimationFrame(scroll);
    };
    animFrame = requestAnimationFrame(scroll);
    const pause = () => cancelAnimationFrame(animFrame);
    const resume = () => { animFrame = requestAnimationFrame(scroll); };
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, [packages]);

  const handleUpsellPurchase = (pkg: CreditPackage) => {
    navigate(`/checkout?pkg=${pkg.id}`);
  };

  if (!creditsAdded || creditsAdded <= 0) return null;

  // Duplicate packages for seamless infinite scroll
  const carouselItems = [...packages, ...packages];

  return (
    <>
      <PageSEO
        title="Purchase Confirmed - Uplyze"
        description="Your credits have been added to your account. Start using Uplyze AI tools right away."
      />
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "hsl(222, 47%, 6%)" }}>
        {/* Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6 py-3"
          style={{
            background: "hsla(222, 35%, 7%, 0.92)",
            borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-4">
            <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze" className="h-7 w-7 object-contain" />
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm text-white/50 font-medium">Purchase Confirmed</span>
            </div>
          </div>
          <Button
            onClick={() => navigate("/platform")}
            variant="ghost"
            className="text-white/40 hover:text-white/70 text-sm"
          >
            Go to Platform <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </header>

        {/* Main content - fits in viewport */}
        <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 md:py-8 min-h-0">
          {/* Thank You Section - compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center space-y-3 flex-shrink-0"
          >
            {/* Glow circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto w-16 h-16 rounded-[18px] flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, hsla(145, 80%, 50%, 0.12), hsla(145, 80%, 50%, 0.04))",
                border: "1px solid hsla(145, 80%, 50%, 0.25)",
                boxShadow: "0 0 60px -20px hsla(145, 80%, 50%, 0.3)",
              }}
            >
              <CheckCircle className="h-8 w-8 text-emerald-400 relative z-10" />
            </motion.div>

            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Thank You for Your Purchase!
              </h1>
              <p className="text-white/40 text-sm max-w-md mx-auto">
                <span className="text-emerald-400 font-semibold">{creditsAdded.toLocaleString()}</span> credits are now in your wallet.
              </p>
            </div>

            {/* Credits badge + trust inline */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, hsla(45, 95%, 55%, 0.1), hsla(35, 95%, 50%, 0.04))",
                  border: "1px solid hsla(45, 95%, 55%, 0.15)",
                }}
              >
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="text-base font-bold text-white">+{creditsAdded.toLocaleString()}</span>
                <span className="text-[10px] text-white/30">credits</span>
              </motion.div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[10px] text-white/25">
                  <ShieldCheck className="h-3 w-3 text-emerald-400/60" /> Secure
                </div>
                <div className="flex items-center gap-1 text-[10px] text-white/25">
                  <Zap className="h-3 w-3 text-amber-400/60" /> Instant
                </div>
              </div>
            </div>

            {/* CTA + redirect */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => navigate("/platform")}
                className="px-5 py-4 rounded-xl text-white font-semibold text-sm border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))",
                  boxShadow: "0 4px 16px hsla(262, 83%, 55%, 0.3), inset 0 1px 0 hsla(0, 0%, 100%, 0.15)",
                }}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" /> Go to Platform
              </Button>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-white/15 animate-pulse" />
                <p className="text-white/15 text-[10px]">Redirecting in {countdown}s</p>
              </div>
            </div>
          </motion.div>

          {/* Upsell Section - carousel fills remaining space */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full flex-shrink-0 mt-6"
          >
            {/* Section header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2" style={{ background: "hsla(262, 83%, 55%, 0.08)", border: "1px solid hsla(262, 83%, 55%, 0.15)" }}>
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">While you're here</span>
              </div>
              <h2 className="text-lg font-bold text-white">Need More Credits?</h2>
            </div>

            {/* Auto-scrolling carousel */}
            <div className="relative">
              {/* Fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, hsl(222, 47%, 6%), transparent)" }} />
              <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, hsl(222, 47%, 6%), transparent)" }} />

              <div
                ref={carouselRef}
                className="flex gap-4 overflow-hidden px-4"
                style={{ scrollBehavior: "auto" }}
              >
                {carouselItems.map((pkg, i) => (
                  <div
                    key={`${pkg.id}-${i}`}
                    onClick={() => handleUpsellPurchase(pkg)}
                    className="flex-shrink-0 w-[260px] group relative rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      background: "hsla(222, 30%, 11%, 0.75)",
                      border: "1px solid hsla(0, 0%, 100%, 0.06)",
                      backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "hsla(262, 83%, 55%, 0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "hsla(0, 0%, 100%, 0.06)")}
                  >
                    {pkg.is_popular && (
                      <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))" }}>
                        Popular
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: "hsla(45, 95%, 55%, 0.06)", border: "1px solid hsla(45, 95%, 55%, 0.1)" }}>
                        <img src={getPackageImage(pkg.name)} alt={pkg.name} className="w-8 h-8 object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{pkg.name}</p>
                        <p className="text-[11px] text-white/30">{pkg.credits.toLocaleString()} credits{pkg.bonus_credits > 0 ? ` + ${pkg.bonus_credits.toLocaleString()} bonus` : ""}</p>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-white">${Math.round(pkg.price_cents / 100)}</span>
                      <span className="text-[10px] text-white/20 uppercase tracking-wider">one-time</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plans link */}
            <div className="text-center mt-4">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, hsla(262, 83%, 55%, 0.06), hsla(45, 95%, 55%, 0.03))",
                  border: "1px solid hsla(262, 83%, 55%, 0.12)",
                }}
                onClick={() => navigate("/profile", { state: { tab: "plan" } })}
              >
                <Crown className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs text-white/50">Looking for a subscription?</span>
                <span className="text-xs font-semibold text-purple-300">View Plans</span>
                <ArrowRight className="h-3 w-3 text-purple-400" />
              </div>
            </div>
          </motion.div>

          {/* Support footer */}
          <p className="text-[10px] text-white/15 mt-4 flex-shrink-0">
            Need help?{" "}
            <a href="mailto:contact@uplyze.ai" className="underline hover:text-white/30 transition-colors">
              contact@uplyze.ai
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default ThankYou;

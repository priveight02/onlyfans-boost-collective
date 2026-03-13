import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, ShieldCheck, Coins, Zap, LayoutDashboard, Crown, Clock, Gift } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);

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

  // Auto-scroll carousel - slower, pauses on hover
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || packages.length === 0) return;
    let scrollPos = 0;
    const speed = 0.3;
    let animFrame: number;
    let paused = false;
    const scroll = () => {
      if (!paused) {
        scrollPos += speed;
        if (scrollPos >= el.scrollWidth / 2) scrollPos = 0;
        el.scrollLeft = scrollPos;
      }
      animFrame = requestAnimationFrame(scroll);
    };
    animFrame = requestAnimationFrame(scroll);
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
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

  const carouselItems = [...packages, ...packages, ...packages];

  const trustItems = [
    { icon: Coins, label: "Credits Added", value: `+${creditsAdded.toLocaleString()}`, color: "hsla(45, 95%, 55%, 0.15)", borderColor: "hsla(45, 95%, 55%, 0.2)", iconColor: "text-amber-400" },
    { icon: ShieldCheck, label: "Secure Payment", value: "256-bit SSL", color: "hsla(145, 80%, 50%, 0.1)", borderColor: "hsla(145, 80%, 50%, 0.2)", iconColor: "text-emerald-400" },
    { icon: Zap, label: "Instant Delivery", value: "Ready to use", color: "hsla(262, 83%, 55%, 0.1)", borderColor: "hsla(262, 83%, 55%, 0.2)", iconColor: "text-purple-400" },
    { icon: Gift, label: "Never Expires", value: "Use anytime", color: "hsla(200, 80%, 55%, 0.1)", borderColor: "hsla(200, 80%, 55%, 0.2)", iconColor: "text-sky-400" },
  ];

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

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-between px-4 py-5 md:py-6 min-h-0">
          {/* Thank You + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center space-y-3 flex-shrink-0"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, hsla(145, 80%, 50%, 0.12), hsla(145, 80%, 50%, 0.04))",
                border: "1px solid hsla(145, 80%, 50%, 0.25)",
                boxShadow: "0 0 60px -20px hsla(145, 80%, 50%, 0.3)",
              }}
            >
              <CheckCircle className="h-7 w-7 text-emerald-400 relative z-10" />
            </motion.div>

            <div className="space-y-0.5">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Thank You for Your Purchase!
              </h1>
              <p className="text-white/40 text-sm">
                <span className="text-emerald-400 font-semibold">{creditsAdded.toLocaleString()}</span> credits are now in your wallet.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
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

          {/* Trust indicators - horizontal row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-3xl flex-shrink-0 mt-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trustItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                  style={{
                    background: item.color,
                    border: `1px solid ${item.borderColor}`,
                  }}
                >
                  <item.icon className={`h-4 w-4 flex-shrink-0 ${item.iconColor}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/35 leading-none">{item.label}</p>
                    <p className="text-xs font-semibold text-white/80 leading-tight mt-0.5">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Upsell Carousel Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full flex-shrink-0 mt-5"
          >
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-1.5" style={{ background: "hsla(262, 83%, 55%, 0.08)", border: "1px solid hsla(262, 83%, 55%, 0.15)" }}>
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">While you're here</span>
              </div>
              <h2 className="text-base font-bold text-white">Need More Credits?</h2>
            </div>

            {/* Carousel */}
            <div
              className="relative"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, hsl(222, 47%, 6%), transparent)" }} />
              <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, hsl(222, 47%, 6%), transparent)" }} />

              <div
                ref={carouselRef}
                className="flex gap-3 overflow-hidden px-6"
                style={{ scrollBehavior: "auto" }}
              >
                {carouselItems.map((pkg, i) => (
                  <motion.div
                    key={`${pkg.id}-${i}`}
                    onClick={() => handleUpsellPurchase(pkg)}
                    whileHover={{ scale: 1.04, y: -2 }}
                    className="flex-shrink-0 w-[240px] group relative rounded-2xl overflow-hidden cursor-pointer transition-colors duration-300"
                    style={{
                      background: "linear-gradient(160deg, hsla(222, 30%, 13%, 0.9), hsla(222, 30%, 9%, 0.95))",
                      border: "1px solid hsla(0, 0%, 100%, 0.07)",
                      backdropFilter: "blur(16px)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "hsla(262, 83%, 55%, 0.35)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "hsla(0, 0%, 100%, 0.07)")}
                  >
                    {/* Subtle gradient overlay on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: "linear-gradient(135deg, hsla(262, 83%, 55%, 0.06), transparent 60%)" }}
                    />

                    {pkg.is_popular && (
                      <div
                        className="absolute top-0 right-0 px-2.5 py-1 rounded-bl-xl text-[9px] font-bold text-white tracking-wide"
                        style={{ background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))" }}
                      >
                        POPULAR
                      </div>
                    )}

                    <div className="relative p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                          style={{ background: "hsla(45, 95%, 55%, 0.06)", border: "1px solid hsla(45, 95%, 55%, 0.1)" }}
                        >
                          <img src={getPackageImage(pkg.name)} alt={pkg.name} className="w-8 h-8 object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{pkg.name}</p>
                          <p className="text-[11px] text-white/30">
                            {pkg.credits.toLocaleString()} credits
                            {pkg.bonus_credits > 0 && <span className="text-emerald-400/70"> +{pkg.bonus_credits.toLocaleString()}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-white">${Math.round(pkg.price_cents / 100)}</span>
                          <span className="text-[10px] text-white/20">USD</span>
                        </div>
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: "hsla(262, 83%, 55%, 0.12)" }}
                        >
                          Buy <ArrowRight className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Plans link */}
            <div className="text-center mt-3">
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
          <p className="text-[10px] text-white/15 mt-3 flex-shrink-0">
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

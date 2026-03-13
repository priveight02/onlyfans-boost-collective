import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, ShieldCheck, Coins, Zap, Crown, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageSEO from "@/components/PageSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

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

const ThankYou = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(20);
  const [packages, setPackages] = useState<CreditPackage[]>([]);

  const creditsAdded = parseInt(searchParams.get("credits") || "0");
  const pkgName = searchParams.get("pkg") || "";

  // Guard: only accessible with valid purchase data
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

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      navigate("/platform", { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  const handleUpsellPurchase = (pkg: CreditPackage) => {
    navigate(`/checkout?pkg=${pkg.id}`);
  };

  if (!creditsAdded || creditsAdded <= 0) return null;

  return (
    <>
      <PageSEO
        title="Purchase Confirmed - Uplyze"
        description="Your credits have been added to your account. Start using Uplyze AI tools right away."
      />
      <div className="min-h-screen flex flex-col" style={{ background: "hsl(222, 47%, 6%)" }}>
        {/* Header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
          style={{
            background: "hsla(222, 35%, 7%, 0.92)",
            borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Uplyze" className="h-7" />
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

        <div className="flex-1 flex flex-col items-center justify-start px-4 py-12 md:py-16">
          {/* Thank You Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center space-y-6 mb-14"
          >
            {/* Glow circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto w-20 h-20 rounded-[22px] flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, hsla(145, 80%, 50%, 0.12), hsla(145, 80%, 50%, 0.04))",
                border: "1px solid hsla(145, 80%, 50%, 0.25)",
                boxShadow: "0 0 60px -20px hsla(145, 80%, 50%, 0.3)",
              }}
            >
              <CheckCircle className="h-10 w-10 text-emerald-400 relative z-10" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Thank You for Your Purchase!
              </h1>
              <p className="text-white/40 text-base max-w-md mx-auto">
                Your transaction has been completed successfully.{" "}
                <span className="text-emerald-400 font-semibold">{creditsAdded.toLocaleString()}</span> credits are now in your wallet.
              </p>
            </div>

            {/* Credits badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl mx-auto"
              style={{
                background: "linear-gradient(135deg, hsla(45, 95%, 55%, 0.1), hsla(35, 95%, 50%, 0.04))",
                border: "1px solid hsla(45, 95%, 55%, 0.15)",
              }}
            >
              <Coins className="h-5 w-5 text-amber-400" />
              <span className="text-lg font-bold text-white">+{creditsAdded.toLocaleString()}</span>
              <span className="text-xs text-white/30">credits added</span>
            </motion.div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-white/25">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/60" /> Secure Payment
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/25">
                <Zap className="h-3.5 w-3.5 text-amber-400/60" /> Instant Delivery
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate("/platform")}
                className="px-6 py-5 rounded-xl text-white font-semibold text-sm border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))",
                  boxShadow: "0 4px 16px hsla(262, 83%, 55%, 0.3), inset 0 1px 0 hsla(0, 0%, 100%, 0.15)",
                }}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" /> Go to Platform
              </Button>
            </div>

            {/* Auto-redirect */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/15 animate-pulse" />
              <p className="text-white/15 text-xs">Redirecting to platform in {countdown}s</p>
            </div>
          </motion.div>

          {/* Upsell Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-4xl"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3" style={{ background: "hsla(262, 83%, 55%, 0.08)", border: "1px solid hsla(262, 83%, 55%, 0.15)" }}>
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">While you're here</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Need More Credits?</h2>
              <p className="text-sm text-white/30">Top up and save more on bulk purchases</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.slice(0, 6).map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  onClick={() => handleUpsellPurchase(pkg)}
                  className="group relative rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: "hsla(222, 30%, 11%, 0.75)",
                    border: "1px solid hsla(0, 0%, 100%, 0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "hsla(262, 83%, 55%, 0.3)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "hsla(0, 0%, 100%, 0.06)")}
                >
                  {pkg.is_popular && (
                    <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))" }}>
                      Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(45, 95%, 55%, 0.08)", border: "1px solid hsla(45, 95%, 55%, 0.12)" }}>
                      <Coins className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{pkg.name}</p>
                      <p className="text-xs text-white/30">{pkg.credits.toLocaleString()} credits{pkg.bonus_credits > 0 ? ` + ${pkg.bonus_credits.toLocaleString()} bonus` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-white">${Math.round(pkg.price_cents / 100)}</span>
                    <span className="text-xs text-white/20">one-time</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Plans upsell */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-8 text-center"
            >
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, hsla(262, 83%, 55%, 0.08), hsla(45, 95%, 55%, 0.04))",
                  border: "1px solid hsla(262, 83%, 55%, 0.15)",
                }}
                onClick={() => navigate("/profile", { state: { tab: "plan" } })}
              >
                <Crown className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white/60">Looking for a subscription plan?</span>
                <span className="text-sm font-semibold text-purple-300">View Plans</span>
                <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
              </div>
            </motion.div>
          </motion.div>

          {/* Support */}
          <p className="text-[11px] text-white/15 pt-10">
            Need help? Contact us at{" "}
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

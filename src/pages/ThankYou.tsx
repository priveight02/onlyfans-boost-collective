import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, ShieldCheck, Coins, Zap, LayoutDashboard, Crown, Gift } from "lucide-react";
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
  const [countdown, setCountdown] = useState(30);
  const [packages, setPackages] = useState<CreditPackage[]>([]);

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

  const handleUpsellPurchase = (pkg: CreditPackage) => {
    navigate(`/checkout?pkg=${pkg.id}`);
  };

  if (!creditsAdded || creditsAdded <= 0) return null;

  const trustItems = [
    { icon: ShieldCheck, label: "Secure Payment", value: "256-bit SSL", color: "hsla(145, 80%, 50%, 0.08)", borderColor: "hsla(145, 80%, 50%, 0.15)", iconColor: "text-emerald-400" },
    { icon: Zap, label: "Instant Delivery", value: "Ready to use", color: "hsla(262, 83%, 55%, 0.08)", borderColor: "hsla(262, 83%, 55%, 0.15)", iconColor: "text-purple-400" },
    { icon: Gift, label: "Never Expires", value: "Use anytime", color: "hsla(200, 80%, 55%, 0.08)", borderColor: "hsla(200, 80%, 55%, 0.15)", iconColor: "text-sky-400" },
  ];

  return (
    <>
      <PageSEO
        title="Purchase Confirmed - Uplyze"
        description="Your credits have been added to your account. Start using Uplyze AI tools right away."
      />
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "hsl(222, 47%, 6%)" }}>
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse, hsla(145, 80%, 50%, 0.04) 0%, transparent 70%)" }} />

        {/* Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6 py-3 relative z-10"
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
        <div className="flex-1 flex flex-col items-center justify-between px-4 py-5 md:py-6 min-h-0 relative z-10">
          {/* Thank You Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center space-y-3 flex-shrink-0"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, hsla(145, 80%, 50%, 0.12), hsla(145, 80%, 50%, 0.04))",
                border: "1px solid hsla(145, 80%, 50%, 0.25)",
                boxShadow: "0 0 80px -20px hsla(145, 80%, 50%, 0.35), inset 0 1px 0 hsla(145, 80%, 50%, 0.1)",
              }}
            >
              <CheckCircle className="h-8 w-8 text-emerald-400 relative z-10" />
            </motion.div>

            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Thank You for Your Purchase!
              </h1>
              <p className="text-white/40 text-sm">
                Your credits are now in your wallet and ready to use.
              </p>
            </div>

            {/* Credits count */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
              className="flex items-center justify-center gap-2"
            >
              <Coins className="h-5 w-5 text-amber-400" />
              <span className="text-3xl font-bold text-white">+{creditsAdded.toLocaleString()}</span>
              <span className="text-sm text-white/30 font-medium">credits</span>
            </motion.div>

            {/* CTA */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                onClick={() => navigate("/platform")}
                className="px-6 py-5 rounded-xl text-white font-semibold text-sm border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))",
                  boxShadow: "0 4px 20px hsla(262, 83%, 55%, 0.35), inset 0 1px 0 hsla(0, 0%, 100%, 0.15)",
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

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-lg flex-shrink-0 mt-4"
          >
            <div className="grid grid-cols-3 gap-3">
              {trustItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: item.color, border: `1px solid ${item.borderColor}` }}
                >
                  <item.icon className={`h-3.5 w-3.5 flex-shrink-0 ${item.iconColor}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/30 leading-none">{item.label}</p>
                    <p className="text-[11px] font-semibold text-white/70 leading-tight mt-0.5">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Static Upsell Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-3xl flex-shrink-0 mt-5"
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-1.5" style={{ background: "hsla(262, 83%, 55%, 0.08)", border: "1px solid hsla(262, 83%, 55%, 0.15)" }}>
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">While you're here</span>
              </div>
              <h2 className="text-base font-bold text-white">Need More Credits?</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {packages.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  onClick={() => handleUpsellPurchase(pkg)}
                  className="group relative rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
                  style={{
                    background: "linear-gradient(160deg, hsla(222, 30%, 14%, 1), hsla(222, 30%, 9%, 1))",
                    border: "1px solid hsla(0, 0%, 100%, 0.07)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "hsla(262, 83%, 55%, 0.4)";
                    e.currentTarget.style.boxShadow = "0 8px 32px -8px hsla(262, 83%, 55%, 0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "hsla(0, 0%, 100%, 0.07)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Hover gradient */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "linear-gradient(135deg, hsla(262, 83%, 55%, 0.08), transparent 60%)" }}
                  />

                  {pkg.is_popular && (
                    <div
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold text-white tracking-wider z-10"
                      style={{ background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))", boxShadow: "0 2px 8px hsla(262, 83%, 55%, 0.3)" }}
                    >
                      POPULAR
                    </div>
                  )}

                  <div className="relative p-4 text-center">
                    {/* Icon */}
                    <div
                      className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{
                        background: "linear-gradient(135deg, hsla(262, 83%, 55%, 0.1), hsla(45, 95%, 55%, 0.06))",
                        border: "1px solid hsla(262, 83%, 55%, 0.12)",
                      }}
                    >
                      <Coins className="h-5 w-5 text-amber-400" />
                    </div>

                    <p className="text-sm font-semibold text-white mb-0.5">{pkg.name}</p>
                    <p className="text-[11px] text-white/30 mb-3">
                      {pkg.credits.toLocaleString()} credits
                      {pkg.bonus_credits > 0 && <span className="text-emerald-400/80"> +{pkg.bonus_credits.toLocaleString()}</span>}
                    </p>

                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-2xl font-bold text-white">${Math.round(pkg.price_cents / 100)}</span>
                      <span className="text-[10px] text-white/20 uppercase">USD</span>
                    </div>

                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-purple-300 transition-all duration-300 group-hover:text-white group-hover:shadow-lg"
                      style={{
                        background: "hsla(262, 83%, 55%, 0.1)",
                        border: "1px solid hsla(262, 83%, 55%, 0.15)",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "hsla(262, 83%, 55%, 0.1)";
                      }}
                    >
                      Purchase <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </motion.div>
              ))}
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

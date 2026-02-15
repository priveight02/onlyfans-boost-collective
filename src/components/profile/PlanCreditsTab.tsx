import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Crown, Zap, Star, Check, ArrowRight, Sparkles, Plus, Minus, CreditCard, TrendingUp, ArrowUpRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

// Plans definition — these match your Stripe products
const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    credits_per_month: 0,
    features: ["Pay-as-you-go credits", "Basic AI tools", "1 managed account", "Community support"],
    current: true,
    yearlyDiscount: 0,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 9,
    credits_per_month: 105,
    features: ["105 credits/month", "Basic AI tools", "1 managed account", "Community support"],
    yearlyDiscount: 0.15,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 29,
    credits_per_month: 500,
    features: ["500 credits/month", "All AI tools", "5 managed accounts", "Priority support", "Credit rollovers", "On-demand top-ups"],
    highlighted: true,
    yearlyDiscount: 0.30,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 79,
    credits_per_month: 2000,
    features: ["2000 credits/month", "All Pro features", "Unlimited accounts", "Dedicated support", "Team workspace", "Advanced analytics", "API access"],
    yearlyDiscount: 0.33,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null, // Custom
    credits_per_month: null,
    features: ["Custom credit allocation", "All Business features", "Dedicated account manager", "SLA guarantees", "Custom integrations", "Audit logs"],
    yearlyDiscount: 0,
  },
];

// Base price per credit in cents (based on smallest package: 999 cents / 100 credits)
const BASE_PRICE_PER_CREDIT_CENTS = 9.99;

// Volume discount tiers — the more you buy, the bigger the discount (max 20%)
const getVolumeDiscount = (credits: number): number => {
  if (credits >= 10000) return 0.40;
  if (credits >= 5000) return 0.35;
  if (credits >= 3000) return 0.30;
  if (credits >= 2000) return 0.25;
  if (credits >= 1000) return 0.20;
  if (credits >= 500) return 0.15;
  if (credits >= 200) return 0.10;
  if (credits >= 100) return 0.05;
  return 0;
};

const calculateCustomPrice = (credits: number): number => {
  const discount = getVolumeDiscount(credits);
  const pricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - discount);
  return Math.round(credits * pricePerCredit);
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const PREDEFINED_TOPUPS = [100, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000];

const PlanCreditsTab = () => {
  const { user } = useAuth();
  const { balance, purchaseCount, totalPurchased, totalSpent, loading: walletLoading, refreshWallet } = useWallet();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showFreeTierPopup, setShowFreeTierPopup] = useState(false);
  const [topUpMode, setTopUpMode] = useState<"predefined" | "custom">("predefined");
  const [selectedTopUp, setSelectedTopUp] = useState<number>(500);
  const [customCredits, setCustomCredits] = useState<string>("1000");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchasingCustom, setPurchasingCustom] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const plansRef = useRef<HTMLDivElement>(null);

  // TODO: Replace with real plan detection from backend
  const currentPlan = PLANS[0]; // Free tier
  const isFreeTier = currentPlan.id === "free";

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTopUpClick = () => {
    if (isFreeTier) {
      setShowFreeTierPopup(true);
      return;
    }
    setShowTopUpDialog(true);
  };

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data) setPackages(data as CreditPackage[]);
      setLoadingPackages(false);
    };
    fetchPackages();
  }, []);

  const handlePackagePurchase = async (pkg: CreditPackage) => {
    if (!user) { toast.error("Please log in first"); return; }
    setPurchasingId(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { packageId: pkg.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCustomPurchase = async (credits: number) => {
    if (!user) { toast.error("Please log in first"); return; }
    if (credits < 10) { toast.error("Minimum 10 credits"); return; }
    setPurchasingCustom(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { customCredits: credits },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingCustom(false);
    }
  };

  const customCreditsNum = parseInt(customCredits) || 0;
  const customPrice = calculateCustomPrice(customCreditsNum);
  const customDiscount = getVolumeDiscount(customCreditsNum);
  const effectiveCredits = topUpMode === "custom" ? customCreditsNum : selectedTopUp;
  const effectivePrice = topUpMode === "custom" ? customPrice : calculateCustomPrice(selectedTopUp);
  const effectiveDiscount = topUpMode === "custom" ? customDiscount : getVolumeDiscount(selectedTopUp);

  // Max credits in existing packages for reference
  const maxPackageCredits = packages.length > 0 ? Math.max(...packages.map(p => p.credits + p.bonus_credits)) : 4750;

  const getPlanDisplayPrice = (plan: typeof PLANS[0]) => {
    if (plan.monthlyPrice === null) return null;
    if (plan.monthlyPrice === 0) return 0;
    if (billingCycle === "yearly") {
      const yearlyMonthly = Math.round(plan.monthlyPrice * (1 - plan.yearlyDiscount));
      return yearlyMonthly;
    }
    return plan.monthlyPrice;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Current Plan Card + Credits Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Current Plan */}
        <div className="rounded-2xl border border-purple-500/10 bg-[hsl(222,28%,11%)] p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Crown className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">You're on {currentPlan.name}</h3>
              <p className="text-white/40 text-sm">{currentPlan.credits_per_month ? `${currentPlan.credits_per_month} credits/month included` : "Top up credits anytime"}</p>
            </div>
          </div>
          <Button size="sm"
            onClick={scrollToPlans}
            className="bg-[hsl(222,25%,18%)] hover:bg-[hsl(222,25%,22%)] text-white border border-white/10 text-sm h-9 px-4">
            Manage Plan
          </Button>
        </div>

        {/* Credits Remaining */}
        <div className="rounded-2xl border border-purple-500/10 bg-[hsl(222,28%,11%)] p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-base">Credits Remaining</h3>
            <span className="text-white text-2xl font-bold">{walletLoading ? "..." : balance.toLocaleString()}</span>
          </div>
          {/* Themed progress bar */}
          <div className="relative h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
              style={{ width: `${Math.min((balance / (currentPlan.credits_per_month || 500)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-white/40">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Never expires</span>
              <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-amber-400" /> {totalPurchased.toLocaleString()} purchased</span>
            </div>
            <Button size="sm"
              onClick={handleTopUpClick}
              className="bg-purple-500 hover:bg-purple-400 text-white text-xs h-8 px-3 font-medium rounded-lg border-0">
              <Plus className="h-3 w-3 mr-0.5" />
              Top Up
            </Button>
          </div>
        </div>
      </div>

      <div ref={plansRef}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Available Plans</h2>
          {/* Monthly / Yearly Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-white/40 hover:text-white/60 border border-transparent"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-white/40 hover:text-white/60 border border-transparent"
              }`}
            >
              Yearly
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[9px] px-1.5 py-0">Save</Badge>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.filter(p => p.id !== "free").map((plan, i) => {
            const isCurrent = false; // No paid plan is current for free-tier users
            const displayPrice = getPlanDisplayPrice(plan);
            const showYearlySavings = billingCycle === "yearly" && plan.yearlyDiscount > 0 && plan.monthlyPrice !== null;
            return (
              <div key={plan.id}
                className={`relative rounded-2xl border p-6 transition-all duration-200 ${
                  plan.highlighted
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-white/[0.06] bg-[hsl(222,28%,11%)]"
                } ${isCurrent ? "ring-1 ring-emerald-500/30" : ""}`}
              >
                {isCurrent && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 mb-3 text-xs">
                    Current Plan
                  </Badge>
                )}
                {plan.highlighted && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white border-0 text-[10px] px-3 py-0.5 shadow-lg shadow-purple-500/20">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                <p className="text-white/40 text-sm mb-4">
                  {plan.credits_per_month ? `${plan.credits_per_month.toLocaleString()} credits/month` : "Custom allocation"}
                </p>
                <div className="mb-5">
                  {displayPrice !== null ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-white">${displayPrice}</span>
                        <span className="text-white/40 text-sm">/ {billingCycle === "yearly" ? "mo" : "month"}</span>
                      </div>
                      {showYearlySavings && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-white/30 text-xs line-through">${plan.monthlyPrice}/mo</span>
                          <span className="text-emerald-400 text-xs font-semibold">-{Math.round(plan.yearlyDiscount * 100)}%</span>
                        </div>
                      )}
                      {billingCycle === "yearly" && displayPrice !== null && displayPrice > 0 && (
                        <p className="text-white/30 text-[10px] mt-0.5">Billed ${displayPrice * 12}/year</p>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-white">Custom</span>
                  )}
                </div>

                {isCurrent ? (
                  <Button className="w-full mb-5 text-sm h-10 bg-[hsl(222,25%,18%)] text-white/50 border border-white/10 cursor-default hover:bg-[hsl(222,25%,18%)]" disabled>
                    Your Plan
                  </Button>
                ) : displayPrice !== null ? (
                  <Button className={`w-full mb-5 text-sm h-10 font-semibold ${
                    plan.highlighted
                      ? "bg-purple-500 hover:bg-purple-400 text-white"
                      : "bg-[hsl(222,25%,18%)] hover:bg-[hsl(222,25%,22%)] text-white border border-white/10"
                  }`}>
                    <ArrowUpRight className="h-4 w-4 mr-1.5" />
                    Upgrade
                  </Button>
                ) : (
                  <Button className="w-full mb-5 text-sm h-10 bg-[hsl(222,25%,18%)] hover:bg-[hsl(222,25%,22%)] text-white border border-white/10 font-semibold">
                    Contact Sales
                  </Button>
                )}

                <div className="space-y-2.5">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2.5 text-sm text-white/60">
                      <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Quick Credit Top-Ups</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {packages.map((pkg) => {
            const isPopular = pkg.is_popular;
            const returningDiscount = purchaseCount === 1 ? 0.30 : purchaseCount === 2 ? 0.20 : purchaseCount === 3 ? 0.10 : 0;
            const isReturning = returningDiscount > 0;
            const displayPrice = isReturning ? Math.round(pkg.price_cents * (1 - returningDiscount)) : pkg.price_cents;
            const totalCredits = pkg.credits + pkg.bonus_credits;

            return (
              <div key={pkg.id}
                className={`relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${
                  isPopular
                    ? "border-emerald-500/30 bg-[hsl(222,30%,12%)]"
                    : "border-white/[0.06] bg-[hsl(222,30%,12%)]"
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-2.5 py-0.5 border-0 shadow-lg shadow-emerald-500/20">
                    POPULAR
                  </Badge>
                )}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span className="text-white font-bold text-lg">{pkg.credits.toLocaleString()}</span>
                  </div>
                  {pkg.bonus_credits > 0 && (
                    <p className="text-amber-300/80 text-[11px]">+{pkg.bonus_credits} bonus</p>
                  )}
                  <div className="mt-3">
                    <span className="text-white font-bold text-xl">{formatPrice(displayPrice)}</span>
                    {isReturning && (
                      <span className="text-emerald-400 text-[10px] font-semibold ml-1.5">-{Math.round(returningDiscount * 100)}%</span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (isFreeTier) { setShowFreeTierPopup(true); return; }
                    handlePackagePurchase(pkg);
                  }}
                  disabled={purchasingId === pkg.id}
                  size="sm"
                  className={`w-full text-sm h-9 font-medium rounded-xl ${
                    isPopular
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                      : "bg-[hsl(222,25%,18%)] hover:bg-[hsl(222,25%,22%)] text-white border border-white/10"
                  }`}
                >
                  {purchasingId === pkg.id ? "..." : "Buy"}
                </Button>
              </div>
            );
          })}

          {/* Custom Amount Card */}
          <div
            onClick={handleTopUpClick}
            className="relative rounded-2xl border border-dashed border-purple-500/30 bg-[hsl(222,30%,12%)] p-5 flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-purple-500/50 hover:bg-purple-500/5 group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center mb-3 group-hover:bg-purple-500/25 transition-colors">
              <Plus className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-white font-semibold text-sm mb-1">Custom Amount</span>
            <span className="text-white/40 text-xs text-center">Choose your own credit amount</span>
          </div>
        </div>
      </div>

      {/* Spending Stats */}
      <div className="rounded-2xl border border-white/[0.06] bg-[hsl(222,28%,11%)] p-5">
        <h3 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          Credit Activity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-white/40 text-sm">Current Balance</p>
            <p className="text-white font-bold text-2xl">{balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-sm">Total Purchased</p>
            <p className="text-white font-bold text-2xl">{totalPurchased.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-sm">Total Spent</p>
            <p className="text-white font-bold text-2xl">{totalSpent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-sm">Purchases</p>
            <p className="text-white font-bold text-2xl">{purchaseCount}</p>
          </div>
        </div>
      </div>

      {/* Free Tier Top-Up Popup */}
      <Dialog open={showFreeTierPopup} onOpenChange={setShowFreeTierPopup}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-[17px] flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Upgrade Required
            </DialogTitle>
            <DialogDescription className="text-white/50 text-[13px]">
              Credit top-ups are available exclusively for paid plan members. Choose a plan that fits your needs to unlock on-demand credit purchases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
              <Zap className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Pro Plan — Recommended</p>
                <p className="text-white/40 text-xs">500 credits/month + unlimited top-ups starting at $29/mo</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Star className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Starter Plan</p>
                <p className="text-white/40 text-xs">105 credits/month + top-ups starting at $9/mo</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setShowFreeTierPopup(false)}
              className="text-white/40 hover:text-white/60 text-[12px] flex-1">
              Maybe Later
            </Button>
            <Button
              onClick={() => { setShowFreeTierPopup(false); scrollToPlans(); }}
              className="bg-purple-500 hover:bg-purple-400 text-white text-[12px] font-semibold flex-1"
            >
              <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Up Dialog */}
      <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-[17px] flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              Add more credits
            </DialogTitle>
            <DialogDescription className="text-white/40 text-[12px]">
              Choose a predefined package or enter a custom amount.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTopUpMode("predefined")}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all border ${
                topUpMode === "predefined"
                  ? "bg-purple-500/15 border-purple-500/30 text-white"
                  : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
              }`}
            >
              Predefined Packages
            </button>
            <button
              onClick={() => setTopUpMode("custom")}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all border ${
                topUpMode === "custom"
                  ? "bg-purple-500/15 border-purple-500/30 text-white"
                  : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
              }`}
            >
              Custom Amount
            </button>
          </div>

          {topUpMode === "predefined" ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {PREDEFINED_TOPUPS.map((credits) => {
                const price = calculateCustomPrice(credits);
                const discount = getVolumeDiscount(credits);
                return (
                  <button
                    key={credits}
                    onClick={() => setSelectedTopUp(credits)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      selectedTopUp === credits
                        ? "border-purple-500/40 bg-purple-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-white text-[13px] font-medium">+{credits.toLocaleString()} credits</span>
                      {discount > 0 && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[9px] px-1.5 py-0">
                          -{Math.round(discount * 100)}%
                        </Badge>
                      )}
                    </div>
                    <span className="text-white/70 text-[13px] font-semibold">{formatPrice(price)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/40">Enter number of credits</label>
                <Input
                  type="number"
                  min="10"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white text-[14px] h-11 rounded-xl"
                  placeholder="e.g. 1000"
                />
              </div>

              {customCreditsNum >= 10 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/50">Credits</span>
                    <span className="text-white font-medium">{customCreditsNum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/50">Base price/credit</span>
                    <span className="text-white/50">{BASE_PRICE_PER_CREDIT_CENTS.toFixed(1)}¢</span>
                  </div>
                  {customDiscount > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-emerald-300">Volume discount</span>
                      <span className="text-emerald-300 font-medium">-{Math.round(customDiscount * 100)}%</span>
                    </div>
                  )}
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex justify-between text-[13px]">
                    <span className="text-white font-medium">Total</span>
                    <span className="text-white font-bold text-[16px]">{formatPrice(customPrice)}</span>
                  </div>
                  <p className="text-white/30 text-[10px]">
                    Effective rate: {((customPrice / customCreditsNum)).toFixed(1)}¢/credit
                    {customDiscount > 0 && ` (save ${formatPrice(Math.round(customCreditsNum * BASE_PRICE_PER_CREDIT_CENTS) - customPrice)})`}
                  </p>
                </div>
              )}

              <div className="text-[10px] text-white/30 space-y-1">
                <p>💡 Buy more to unlock bigger discounts (up to 40% off):</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 ml-3">
                  <span>100+ credits → 5% off</span>
                  <span>200+ credits → 10% off</span>
                  <span>500+ credits → 15% off</span>
                  <span>1,000+ credits → 20% off</span>
                  <span>2,000+ credits → 25% off</span>
                  <span>3,000+ credits → 30% off</span>
                  <span>5,000+ credits → 35% off</span>
                  <span>10,000+ credits → 40% off</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setShowTopUpDialog(false)}
              className="text-white/40 hover:text-white/60 text-[12px] flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleCustomPurchase(effectiveCredits)}
              disabled={purchasingCustom || effectiveCredits < 10}
              className="bg-purple-500 hover:bg-purple-400 text-white text-[12px] font-semibold flex-1"
            >
              {purchasingCustom ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Buy {effectiveCredits.toLocaleString()} credits — {formatPrice(effectivePrice)}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default PlanCreditsTab;

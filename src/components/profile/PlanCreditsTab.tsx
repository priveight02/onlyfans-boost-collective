import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Crown, Zap, Star, Check, ArrowRight, Sparkles, Plus, Minus, CreditCard, TrendingUp, ArrowUpRight } from "lucide-react";
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
    id: "starter",
    name: "Starter",
    price: 0,
    credits_per_month: 50,
    features: ["50 credits/month", "Basic AI tools", "1 managed account", "Community support"],
    current: true, // will be overridden by actual data
  },
  {
    id: "pro",
    name: "Pro",
    price: 2999, // $29.99
    credits_per_month: 500,
    features: ["500 credits/month", "All AI tools", "5 managed accounts", "Priority support", "Credit rollovers", "On-demand top-ups"],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: 7999, // $79.99
    credits_per_month: 2000,
    features: ["2000 credits/month", "All Pro features", "Unlimited accounts", "Dedicated support", "Team workspace", "Advanced analytics", "API access"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null, // Custom
    credits_per_month: null,
    features: ["Custom credit allocation", "All Business features", "Dedicated account manager", "SLA guarantees", "Custom integrations", "Audit logs"],
  },
];

// Base price per credit in cents (based on smallest package: 999 cents / 100 credits)
const BASE_PRICE_PER_CREDIT_CENTS = 9.99;

// Volume discount tiers — the more you buy, the bigger the discount (max 20%)
const getVolumeDiscount = (credits: number): number => {
  if (credits >= 10000) return 0.20;
  if (credits >= 5000) return 0.17;
  if (credits >= 3000) return 0.14;
  if (credits >= 2000) return 0.11;
  if (credits >= 1000) return 0.08;
  if (credits >= 500) return 0.05;
  if (credits >= 200) return 0.02;
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
  const [topUpMode, setTopUpMode] = useState<"predefined" | "custom">("predefined");
  const [selectedTopUp, setSelectedTopUp] = useState<number>(500);
  const [customCredits, setCustomCredits] = useState<string>("1000");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchasingCustom, setPurchasingCustom] = useState(false);

  const currentPlan = PLANS[0]; // Default to Starter for now

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
    if (credits < 50) { toast.error("Minimum 50 credits"); return; }
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Current Plan Card + Credits Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Plan */}
        <div className="rounded-2xl border border-purple-500/10 bg-[hsl(222,28%,11%)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Crown className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-[14px]">You're on {currentPlan.name}</h3>
              <p className="text-white/40 text-[11px]">{currentPlan.credits_per_month} credits/month included</p>
            </div>
          </div>
          <Button variant="outline" size="sm"
            className="text-white/60 border-white/10 hover:bg-white/5 text-[12px] h-8">
            Manage Plan
          </Button>
        </div>

        {/* Credits Remaining */}
        <div className="rounded-2xl border border-purple-500/10 bg-[hsl(222,28%,11%)] p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-[14px]">Credits Remaining</h3>
            <span className="text-white/80 text-[15px] font-bold">{walletLoading ? "..." : balance.toLocaleString()}</span>
          </div>
          <Progress value={Math.min((balance / (currentPlan.credits_per_month || 500)) * 100, 100)} className="h-2 mb-3" />
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Never expires</span>
              <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-amber-400" /> {totalPurchased.toLocaleString()} total purchased</span>
            </div>
            <Button size="sm" variant="outline"
              onClick={() => setShowTopUpDialog(true)}
              className="text-white/70 border-white/10 hover:bg-white/5 text-[11px] h-7 px-3">
              Top up credits
            </Button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div>
        <h2 className="text-white font-semibold text-[15px] mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((plan, i) => {
            const isCurrent = i === 0; // Starter is current for now
            return (
              <div key={plan.id}
                className={`rounded-2xl border p-5 transition-all duration-200 ${
                  plan.highlighted
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-white/[0.06] bg-[hsl(222,28%,11%)]"
                } ${isCurrent ? "ring-1 ring-emerald-500/30" : ""}`}
              >
                {isCurrent && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 mb-3 text-[10px]">
                    Current Plan
                  </Badge>
                )}
                {plan.highlighted && !isCurrent && (
                  <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 mb-3 text-[10px]">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-white font-bold text-[16px] mb-1">{plan.name}</h3>
                <p className="text-white/40 text-[11px] mb-3">
                  {plan.credits_per_month ? `${plan.credits_per_month.toLocaleString()} credits/month` : "Custom allocation"}
                </p>
                <div className="mb-4">
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{formatPrice(plan.price)}</span>
                      <span className="text-white/40 text-[11px]">per month</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-white">Custom</span>
                  )}
                </div>

                {isCurrent ? (
                  <Button variant="outline" className="w-full mb-4 text-[12px] h-9 border-white/10 text-white/60" disabled>
                    Your Plan
                  </Button>
                ) : plan.price !== null ? (
                  <Button className={`w-full mb-4 text-[12px] h-9 font-semibold ${
                    plan.highlighted
                      ? "bg-purple-500 hover:bg-purple-400 text-white"
                      : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  }`}>
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                    Upgrade
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full mb-4 text-[12px] h-9 border-white/10 text-white/60">
                    Contact Sales
                  </Button>
                )}

                <div className="space-y-2">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-[11px] text-white/60">
                      <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Top-Up Packages */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-[15px]">Quick Credit Top-Ups</h2>
          <Button size="sm" variant="ghost"
            onClick={() => setShowTopUpDialog(true)}
            className="text-purple-400 hover:text-purple-300 text-[11px] h-7">
            <Plus className="h-3 w-3 mr-1" /> Custom Amount
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {packages.map((pkg, index) => {
            const isPopular = pkg.is_popular;
            const isReturning = purchaseCount > 0;
            const displayPrice = isReturning ? Math.round(pkg.price_cents * 0.7) : pkg.price_cents;
            const totalCredits = pkg.credits + pkg.bonus_credits;
            const perCredit = ((displayPrice / totalCredits)).toFixed(1);

            return (
              <div key={pkg.id}
                className={`relative rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${
                  isPopular
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/[0.06] bg-[hsl(222,28%,11%)]"
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 right-3 bg-emerald-500 text-white text-[9px] px-2 py-0.5 border-0">
                    POPULAR
                  </Badge>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="text-white font-bold text-[14px]">{totalCredits.toLocaleString()}</span>
                </div>
                {pkg.bonus_credits > 0 && (
                  <p className="text-amber-300 text-[10px] mb-1">+{pkg.bonus_credits} bonus</p>
                )}
                <div className="flex items-baseline gap-1 mb-1">
                  {isReturning && (
                    <span className="text-white/30 text-[11px] line-through">{formatPrice(pkg.price_cents)}</span>
                  )}
                  <span className="text-white font-bold text-[16px]">{formatPrice(displayPrice)}</span>
                </div>
                <p className="text-white/30 text-[10px] mb-3">{perCredit}¢/credit</p>
                <Button
                  onClick={() => handlePackagePurchase(pkg)}
                  disabled={purchasingId === pkg.id}
                  size="sm"
                  className={`w-full text-[11px] h-8 font-medium ${
                    isPopular
                      ? "bg-emerald-500/80 hover:bg-emerald-400 text-white"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  {purchasingId === pkg.id ? "..." : "Buy"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spending Stats */}
      <div className="rounded-2xl border border-white/[0.06] bg-[hsl(222,28%,11%)] p-5">
        <h3 className="text-white font-semibold text-[14px] mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          Credit Activity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-white/40 text-[11px]">Current Balance</p>
            <p className="text-white font-bold text-[18px]">{balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-[11px]">Total Purchased</p>
            <p className="text-white font-bold text-[18px]">{totalPurchased.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-[11px]">Total Spent</p>
            <p className="text-white font-bold text-[18px]">{totalSpent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/40 text-[11px]">Purchases</p>
            <p className="text-white font-bold text-[18px]">{purchaseCount}</p>
          </div>
        </div>
      </div>

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
                <label className="text-[11px] text-white/40">Enter number of credits</label>
                <Input
                  type="number"
                  min="50"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white text-[14px] h-11 rounded-xl"
                  placeholder="e.g. 1000"
                />
              </div>

              {customCreditsNum >= 50 && (
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
                <p>💡 Buy more to unlock bigger discounts (up to 20% off):</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 ml-3">
                  <span>200+ credits → 2% off</span>
                  <span>500+ credits → 5% off</span>
                  <span>1,000+ credits → 8% off</span>
                  <span>2,000+ credits → 11% off</span>
                  <span>3,000+ credits → 14% off</span>
                  <span>5,000+ credits → 17% off</span>
                  <span>10,000+ credits → 20% off</span>
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
              disabled={purchasingCustom || effectiveCredits < 50}
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

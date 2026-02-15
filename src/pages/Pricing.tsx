import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Sparkles, Zap, Crown, Star, Check, ArrowRight, BadgePercent, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";

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

// Base price per credit in cents (matches edge function)
const BASE_PRICE_PER_CREDIT_CENTS = 9.99;

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

const Pricing = () => {
  const { user } = useAuth();
  const { balance, purchaseCount, refreshWallet } = useWallet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [customCredits, setCustomCredits] = useState<number>(500);
  const [purchasingCustom, setPurchasingCustom] = useState(false);

  const isReturning = purchaseCount > 0;

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data) setPackages(data as CreditPackage[]);
      setLoading(false);
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const credits = searchParams.get("credits");
      toast.success(`🎉 ${credits} credits added to your wallet!`);
      supabase.functions.invoke("verify-credit-purchase").then(() => {
        refreshWallet();
      });
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Purchase canceled");
    }
  }, [searchParams, refreshWallet]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
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

  const handleCustomPurchase = async () => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
    if (customCredits < 50) { toast.error("Minimum 50 credits"); return; }
    setPurchasingCustom(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { customCredits },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingCustom(false);
    }
  };

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;

  const getDiscountedPrice = (cents: number) => Math.round(cents * 0.7);

  // Custom plan price calculation
  const customDiscount = getVolumeDiscount(customCredits);
  const customPricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - customDiscount);
  const customTotalCents = Math.round(customCredits * customPricePerCredit);
  const customDisplayCents = isReturning ? Math.round(customTotalCents * 0.7) : customTotalCents;

  const getIcon = (index: number) => {
    const icons = [Coins, Zap, Star, Crown];
    return icons[index] || Coins;
  };

  const getGradient = (index: number) => {
    const gradients = [
      "from-blue-500/20 to-blue-600/5",
      "from-emerald-500/20 to-emerald-600/5",
      "from-violet-500/20 to-violet-600/5",
      "from-amber-500/20 to-amber-600/5",
    ];
    return gradients[index] || gradients[0];
  };

  const getBorderColor = (index: number) => {
    const colors = [
      "border-blue-500/30 hover:border-blue-400/50",
      "border-emerald-500/30 hover:border-emerald-400/50",
      "border-violet-500/30 hover:border-violet-400/50",
      "border-amber-500/30 hover:border-amber-400/50",
    ];
    return colors[index] || colors[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a] text-white pt-24">
      {/* Hero */}
      <div className="text-center px-4 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-white/70">Virtual Currency System</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
          Buy Credits
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Power your account with credits. Use them to unlock plans, perks, boosts, and premium features.
        </p>

        {user && (
          <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <Coins className="h-5 w-5 text-amber-400" />
            <span className="text-2xl font-bold text-white">{balance.toLocaleString()}</span>
            <span className="text-white/50">credits</span>
          </div>
        )}

        {isReturning && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <BadgePercent className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-300 font-medium">Returning customer — 30% OFF all packages!</span>
          </div>
        )}
      </div>

      {/* Packages Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {packages.map((pkg, index) => {
              const Icon = getIcon(index);
              const isPopular = pkg.is_popular;
              const displayPrice = isReturning ? getDiscountedPrice(pkg.price_cents) : pkg.price_cents;
              const perCredit = (displayPrice / (pkg.credits + pkg.bonus_credits)).toFixed(2);

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${getBorderColor(index)} bg-gradient-to-b ${getGradient(index)} ${isPopular ? 'ring-2 ring-emerald-500/50' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-white/80" />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>

                    <div className="flex items-baseline gap-2 mb-1">
                      {isReturning && (
                        <span className="text-sm text-white/40 line-through">{formatPrice(pkg.price_cents)}</span>
                      )}
                      <span className="text-3xl font-bold text-white">{formatPrice(displayPrice)}</span>
                    </div>
                    <span className="text-xs text-white/40 mb-4">{perCredit}¢ per credit</span>

                    <div className="space-y-2 mb-6 flex-1">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{pkg.credits.toLocaleString()} credits</span>
                      </div>
                      {pkg.bonus_credits > 0 && (
                        <div className="flex items-center gap-2 text-sm text-amber-300">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>+{pkg.bonus_credits} bonus credits</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Instant delivery</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Never expires</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasingId === pkg.id}
                      className={`w-full py-5 rounded-xl font-semibold transition-all duration-300 ${
                        isPopular
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                      }`}
                    >
                      {purchasingId === pkg.id ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Buy now <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Custom Credits Card */}
            <div className="relative flex flex-col rounded-2xl border border-rose-500/30 hover:border-rose-400/50 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl bg-gradient-to-b from-rose-500/20 to-rose-600/5 ring-2 ring-rose-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-rose-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                  CUSTOM
                </Badge>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Settings2 className="h-6 w-6 text-white/80" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">Custom Needs</h3>

                <div className="flex items-baseline gap-2 mb-1">
                  {isReturning && customTotalCents !== customDisplayCents && (
                    <span className="text-sm text-white/40 line-through">${Math.round(customTotalCents / 100)}</span>
                  )}
                  <span className="text-3xl font-bold text-white">${Math.round(customDisplayCents / 100)}</span>
                </div>
                <span className="text-xs text-white/40 mb-4">
                  {(customDisplayCents / customCredits).toFixed(2)}¢ per credit
                  {customDiscount > 0 && ` · ${Math.round(customDiscount * 100)}% bulk discount`}
                </span>

                <div className="mb-4">
                  <label className="text-xs text-white/50 mb-1 block">How many credits?</label>
                  <Input
                    type="number"
                    min={50}
                    max={100000}
                    value={customCredits}
                    onChange={(e) => setCustomCredits(Math.max(50, parseInt(e.target.value) || 50))}
                    className="bg-white/5 border-white/10 text-white text-center text-lg font-bold"
                  />
                  <span className="text-[10px] text-white/30 mt-1 block">Min 50 credits</span>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{customCredits.toLocaleString()} credits</span>
                  </div>
                  {customDiscount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-300">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>{Math.round(customDiscount * 100)}% volume discount</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant delivery</span>
                  </div>
                </div>

                <Button
                  onClick={handleCustomPurchase}
                  disabled={purchasingCustom}
                  className="w-full py-5 rounded-xl font-semibold bg-rose-500 hover:bg-rose-400 text-white transition-all duration-300"
                >
                  {purchasingCustom ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Buy now <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Trust section */}
        <div className="mt-20 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <h4 className="font-semibold text-white/90">Secure Payments</h4>
              <p className="text-sm text-white/40">Powered by Stripe</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <h4 className="font-semibold text-white/90">Instant Delivery</h4>
              <p className="text-sm text-white/40">Credits added immediately</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <BadgePercent className="h-5 w-5 text-amber-400" />
              </div>
              <h4 className="font-semibold text-white/90">Loyalty Rewards</h4>
              <p className="text-sm text-white/40">30% off on your next purchase</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;

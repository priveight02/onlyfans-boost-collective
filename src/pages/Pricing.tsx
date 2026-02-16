import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ArrowRight, Sparkles, BadgePercent, ShieldCheck, Zap, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const BASE_PRICE_PER_CREDIT_CENTS = 1.816;

const getVolumeDiscount = (credits: number): number => {
  if (credits >= 100000) return 0.40;
  if (credits >= 75000) return 0.35;
  if (credits >= 50000) return 0.30;
  if (credits >= 30000) return 0.25;
  if (credits >= 20000) return 0.20;
  if (credits >= 15000) return 0.15;
  if (credits >= 10000) return 0.05;
  return 0;
};

const Pricing = () => {
  const { user } = useAuth();
  const { balance, purchaseCount, refreshWallet } = useWallet();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [customCredits, setCustomCredits] = useState<number>(500);
  const [purchasingCustom, setPurchasingCustom] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retentionActive, setRetentionActive] = useState(false);
  const [retentionUsed, setRetentionUsed] = useState(false);

  // Declining discount: 1st repurchase=30%, 2nd=20%, 3rd=10%, then 0%
  const getReturningDiscount = (count: number): number => {
    if (count === 1) return 0.30;
    if (count === 2) return 0.20;
    if (count === 3) return 0.10;
    return 0;
  };
  // If retention is active, loyalty discount is erased (non-stackable)
  const returningDiscount = retentionActive ? 0 : getReturningDiscount(purchaseCount);
  const isReturning = returningDiscount > 0;

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

  // Check if retention discount is active
  useEffect(() => {
    if (!user) return;
    const checkRetention = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("billing-info", {
          body: { action: "info" },
        });
        if (!error && data) {
          setRetentionActive(data.eligible_for_retention && !data.retention_credits_used);
          setRetentionUsed(data.retention_credits_used || false);
        }
      } catch {}
    };
    checkRetention();
  }, [user]);

  // Verification effect — runs once, clears params to prevent re-runs
  useEffect(() => {
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";

    if (!isSuccess && !isCanceled) return;

    if (isCanceled) {
      toast.info("Purchase canceled");
      setSearchParams({}, { replace: true });
      return;
    }

    if (isSuccess && !verifying) {
      setVerifying(true);
      // Immediately clear URL params so this never fires again
      setSearchParams({}, { replace: true });

      const toastId = toast.loading("Verifying your purchase...");
      supabase.functions.invoke("verify-credit-purchase").then(({ data, error }) => {
        if (error) {
          toast.error("Verification failed. Credits will appear shortly — please refresh.", { id: toastId });
          console.error("Verification error:", error);
        } else if (data?.credited && data.credits_added > 0) {
          toast.success(`🎉 ${data.credits_added.toLocaleString()} credits added!`, { id: toastId });
        } else {
          toast.success("Credits already in your wallet!", { id: toastId });
        }
        refreshWallet();
        setVerifying(false);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePurchase = async (pkg: CreditPackage, useRetention = false) => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
    setPurchasingId(pkg.id + (useRetention ? "_ret" : ""));
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { packageId: pkg.id, useRetentionDiscount: useRetention },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      if (useRetention) {
        setRetentionActive(false);
        setRetentionUsed(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCustomPurchase = async () => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
    if (customCredits < 500) { toast.error("Minimum 500 credits"); return; }
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
  const getDiscountedPrice = (cents: number) => Math.round(cents * (1 - returningDiscount));

  const customDiscount = getVolumeDiscount(customCredits);
  const customPricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - customDiscount);
  const customTotalCents = Math.round(customCredits * customPricePerCredit);
  const customDisplayCents = isReturning ? Math.round(customTotalCents * (1 - returningDiscount)) : customTotalCents;

  const cardAccents = [
    { border: "border-purple-500/25", glow: "hover:shadow-purple-500/5", badge: "bg-purple-500", label: "" },
    { border: "border-yellow-500/40", glow: "hover:shadow-yellow-500/10", badge: "bg-yellow-500", label: "Most Popular" },
    { border: "border-white/10", glow: "hover:shadow-white/5", badge: "", label: "" },
    { border: "border-purple-500/30", glow: "hover:shadow-purple-500/5", badge: "bg-purple-500", label: "Best Value" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)] text-white pt-24">
      {/* Hero */}
      <div className="text-center px-4 mb-14">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white tracking-tight">
          Buy Credits
        </h1>
        <p className="text-base text-white/40 max-w-lg mx-auto">
          Choose a plan that fits your needs. Credits are delivered instantly and never expire.
        </p>

        {user && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-xl font-semibold text-white">{balance.toLocaleString()}</span>
              <span className="text-white/40 text-sm">credits available</span>
            </div>
            {isReturning && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <BadgePercent className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">{Math.round(returningDiscount * 100)}% returning customer discount applied</span>
              </div>
            )}
            {retentionActive && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-pink-500/10 border border-pink-500/20">
                <Gift className="h-3.5 w-3.5 text-pink-400" />
                <span className="text-xs text-pink-300 font-medium">🎁 Exclusive 50% OFF available — one-time use</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Packages */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {packages.map((pkg, index) => {
              const accent = cardAccents[index] || cardAccents[0];
              const displayPrice = isReturning ? getDiscountedPrice(pkg.price_cents) : pkg.price_cents;
              const retentionPrice = Math.round(pkg.price_cents * 0.5);
              const perCredit = (displayPrice / (pkg.credits + pkg.bonus_credits)).toFixed(2);
              const isPopular = pkg.is_popular;

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-2xl border ${accent.border} bg-[hsl(222,30%,11%)] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl ${accent.glow} ${isPopular ? 'ring-1 ring-yellow-500/40' : ''} [backface-visibility:hidden] [transform:translateZ(0)]`}
                >
                  {accent.label && (
                    <div className="absolute -top-3 right-4">
                      <span className={`${accent.badge} text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full`}>
                        {accent.label}
                      </span>
                    </div>
                  )}

                    <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-base font-semibold text-white/90 mb-3">{pkg.name}</h3>

                    <div className="flex items-baseline gap-2 mb-0.5">
                      {isReturning && (
                        <span className="text-sm text-white/30 line-through">{formatPrice(pkg.price_cents)}</span>
                      )}
                      <span className="text-4xl font-bold text-white">{formatPrice(displayPrice)}</span>
                    </div>
                    <span className="text-xs text-white/30 mb-5">{perCredit}¢ per credit</span>

                    <div className="space-y-2.5 mb-6 flex-1">
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-amber-400" strokeWidth={2.5} />
                        </div>
                        <span className="text-white/80 font-medium">{pkg.credits.toLocaleString()} credits</span>
                      </div>
                      {pkg.bonus_credits > 0 && (
                        <div className="flex items-center gap-3 text-sm text-amber-300/80">
                          <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                            <Gift className="h-3 w-3 text-amber-400" strokeWidth={2.5} />
                          </div>
                          <span>+{pkg.bonus_credits} bonus</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <div className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-white/70" strokeWidth={2.5} />
                        </div>
                        <span>Instant delivery</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <div className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-white/70" strokeWidth={2.5} />
                        </div>
                        <span>Never expires</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <div className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-white/70" strokeWidth={2.5} />
                        </div>
                        <span>{index === 0 ? "CRM Access" : index === 1 ? "Advanced CRM Access" : index === 2 ? "Full CRM Access" : "Full CRM Access"}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={!!purchasingId}
                      className={`w-full py-5 rounded-xl font-medium transition-all ${
                        isPopular
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                          : 'bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/10'
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

                    {retentionActive && (
                      <Button
                        onClick={() => handlePurchase(pkg, true)}
                        disabled={!!purchasingId}
                        className="w-full py-5 rounded-xl font-semibold transition-all bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white border-0 mt-2"
                      >
                        {purchasingId === pkg.id + "_ret" ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Gift className="h-4 w-4" /> Buy at {formatPrice(retentionPrice)} (50% OFF) <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom Credits Card */}
            <div className="relative flex flex-col rounded-2xl border border-purple-500/30 bg-[hsl(222,30%,11%)] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-purple-500/5 [backface-visibility:hidden] [transform:translateZ(0)]">
              <div className="absolute -top-3 right-4">
                <span className="bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Custom
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-base font-semibold text-white/90 mb-3">Custom Needs</h3>

                <div className="flex items-baseline gap-2 mb-0.5">
                  {isReturning && customTotalCents !== customDisplayCents && (
                    <span className="text-sm text-white/30 line-through">${Math.round(customTotalCents / 100)}</span>
                  )}
                  <span className="text-4xl font-bold text-white">
                    ${(customDisplayCents / 100).toFixed(customDisplayCents < 1000 ? 2 : 0)}
                  </span>
                </div>
                <span className="text-xs text-white/30 mb-4">
                  {(customDisplayCents / customCredits).toFixed(2)}¢/credit
                  {customDiscount > 0 && ` · ${Math.round(customDiscount * 100)}% off`}
                </span>

                <div className="mb-4">
                  <label className="text-xs text-white/40 mb-1.5 block">How many credits?</label>
                  <input
                    type="number"
                    min={500}
                    max={100000}
                    value={customCredits}
                    onChange={(e) => setCustomCredits(Math.max(500, parseInt(e.target.value) || 500))}
                    className="w-full h-11 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-center text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-white/25 mt-1 block">Min 500 · Bulk discounts up to 40%</span>
                </div>

                <div className="space-y-2.5 mb-6 flex-1">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-amber-400" strokeWidth={2.5} />
                    </div>
                    <span className="text-white/80 font-medium">{customCredits.toLocaleString()} credits</span>
                  </div>
                  {customDiscount > 0 && (
                    <div className="flex items-center gap-3 text-sm text-amber-300/80">
                      <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-3 w-3 text-amber-400" strokeWidth={2.5} />
                      </div>
                      <span>{Math.round(customDiscount * 100)}% volume discount</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <div className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-white/70" strokeWidth={2.5} />
                    </div>
                    <span>Instant delivery</span>
                  </div>
                </div>

                <Button
                  onClick={handleCustomPurchase}
                  disabled={purchasingCustom}
                  className="w-full py-5 rounded-xl font-medium bg-purple-500 hover:bg-purple-400 text-white transition-all"
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

        {/* Trust */}
        <div className="mt-16 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-white/30" />
              <h4 className="text-sm font-medium text-white/70">Secure Payments</h4>
              <p className="text-xs text-white/30">256-bit SSL encryption</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Zap className="h-5 w-5 text-white/30" />
              <h4 className="text-sm font-medium text-white/70">Instant Delivery</h4>
              <p className="text-xs text-white/30">Credits added immediately</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Gift className="h-5 w-5 text-white/30" />
              <h4 className="text-sm font-medium text-white/70">Loyalty Rewards</h4>
              <p className="text-xs text-white/30">Up to 30% off repeat purchases</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;

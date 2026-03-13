import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ArrowRight, Sparkles, BadgePercent, ShieldCheck, Zap, Gift, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import AnimatedBackground from "@/components/AnimatedBackground";

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
  const [retentionActive, setRetentionActive] = useState(false);
  const [retentionUsed, setRetentionUsed] = useState(false);
  const [circulationCredits, setCirculationCredits] = useState<number | null>(null);

  const getReturningDiscount = (count: number): number => {
    if (count === 1) return 0.30;
    if (count === 2) return 0.20;
    if (count === 3) return 0.10;
    return 0;
  };
  const isFirstOrder = purchaseCount === 0;
  const firstOrderDiscount = isFirstOrder ? 0.40 : 0;
  const returningDiscount = retentionActive ? 0 : (isFirstOrder ? 0 : getReturningDiscount(purchaseCount));
  const activeDiscount = firstOrderDiscount || returningDiscount;
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
    const fetchCirculation = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("credits-circulation");
        if (!error && data?.total_credits != null) setCirculationCredits(data.total_credits);
      } catch {}
    };
    fetchCirculation();
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkRetention = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("billing-info", { body: { action: "info" } });
        if (!error && data) {
          setRetentionActive(data.eligible_for_retention && !data.retention_credits_used);
          setRetentionUsed(data.retention_credits_used || false);
        }
      } catch {}
    };
    checkRetention();
  }, [user]);

  // Handle success redirect from checkout page
  useEffect(() => {
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";
    if (!isSuccess && !isCanceled) return;
    if (isCanceled) { toast.info("Purchase canceled"); setSearchParams({}, { replace: true }); return; }
    if (isSuccess) {
      setSearchParams({}, { replace: true });
      refreshWallet();
      toast.success("Credits added to your wallet!");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePurchase = async (pkg: CreditPackage, useRetention = false) => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
    const params = new URLSearchParams({ pkg: pkg.id });
    if (useRetention) params.set("retention", "1");
    navigate(`/checkout?${params.toString()}`);
  };

  const handleCustomPurchase = async () => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
    if (customCredits < 500) { toast.error("Minimum 500 credits"); return; }
    navigate(`/checkout?credits=${customCredits}`);
  };

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;
  const getDiscountedPrice = (cents: number) => Math.round(cents * (1 - returningDiscount));

  const customDiscount = getVolumeDiscount(customCredits);
  const customPricePerCredit = BASE_PRICE_PER_CREDIT_CENTS * (1 - customDiscount);
  const customTotalCents = Math.round(customCredits * customPricePerCredit);
  const customDisplayCents = isReturning ? Math.round(customTotalCents * (1 - returningDiscount)) : customTotalCents;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <AnimatedBackground variant="pricing">
      <PageSEO
        title="Uplyze Pricing - Pay As You Go, Scale As You Grow"
        description="No subscriptions, no lock-ins. Grab AI credits when you need them. Flexible plans built for creators, agencies, and businesses at any stage."
      />
      <div className="pt-24 pb-20 px-4">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white tracking-tight">
            Uplyze Credits. Pay As You Grow
          </h1>
          <p className="text-base text-white/40 max-w-lg mx-auto">
            Flexible credit plans for Uplyze AI Platform tools. Credits are delivered instantly and never expire.
          </p>

          {user && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {circulationCredits !== null && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: "hsla(0, 0%, 100%, 0.05)", border: "1px solid hsla(0, 0%, 100%, 0.1)" }}>
                    <Globe className="h-3.5 w-3.5" style={{ color: "hsl(262, 83%, 65%)" }} />
                    <span className="text-sm font-medium text-white/60">{circulationCredits.toLocaleString()}</span>
                    <span className="text-white/30 text-xs">in circulation</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full" style={{ background: "hsla(0, 0%, 100%, 0.05)", border: "1px solid hsla(0, 0%, 100%, 0.1)" }}>
                  <span className="text-white/40 text-sm">Your Credits:</span>
                  <span className="text-xl font-semibold text-white">{balance.toLocaleString()}</span>
                </div>
              </div>
              {isFirstOrder && (
                <div
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, hsla(262, 83%, 58%, 0.18), hsla(240, 75%, 50%, 0.12))",
                    border: "1px solid hsla(262, 83%, 58%, 0.35)",
                    boxShadow: "0 4px 20px hsla(262, 83%, 58%, 0.15), inset 0 1px 0 hsla(0, 0%, 100%, 0.08)",
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(50, 95%, 65%)" }} />
                  <span className="text-xs font-semibold tracking-wide" style={{ color: "hsl(262, 83%, 80%)" }}>
                    Your 40% Welcome Gift is applied at checkout
                  </span>
                </div>
              )}
              {isReturning && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: "hsla(145, 80%, 42%, 0.1)", border: "1px solid hsla(145, 80%, 42%, 0.2)" }}>
                  <BadgePercent className="h-3.5 w-3.5" style={{ color: "hsl(145, 80%, 55%)" }} />
                  <span className="text-xs font-medium" style={{ color: "hsl(145, 70%, 65%)" }}>{Math.round(returningDiscount * 100)}% returning customer discount applied</span>
                </div>
              )}
              {retentionActive && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: "hsla(330, 80%, 55%, 0.1)", border: "1px solid hsla(330, 80%, 55%, 0.2)" }}>
                  <Gift className="h-3.5 w-3.5" style={{ color: "hsl(330, 80%, 65%)" }} />
                  <span className="text-xs font-medium" style={{ color: "hsl(330, 70%, 70%)" }}>🎁 Exclusive 50% OFF available, one-time use</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Packages */}
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-80 rounded-2xl animate-pulse" style={{ background: "hsla(0, 0%, 100%, 0.05)" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {packages.map((pkg, index) => {
                const isPopular = pkg.is_popular;
                const displayPrice = isFirstOrder ? Math.round(pkg.price_cents * 0.6) : isReturning ? getDiscountedPrice(pkg.price_cents) : pkg.price_cents;
                const retentionPrice = Math.round(pkg.price_cents * 0.5);
                const perCredit = (displayPrice / (pkg.credits + pkg.bonus_credits)).toFixed(2);

                return (
                  <div
                    key={pkg.id}
                    onMouseMove={handleMouseMove}
                    className={`group relative flex flex-col rounded-2xl transition-all duration-300 [backface-visibility:hidden] [transform:translateZ(0)] hover:border-purple-500/30`}
                    style={{
                      "--mouse-x": "50%",
                      "--mouse-y": "50%",
                      background: "hsla(222, 30%, 11%, 0.75)",
                      backdropFilter: "blur(12px)",
                      border: isPopular ? "1px solid hsla(45, 100%, 60%, 0.4)" : "1px solid hsla(0, 0%, 100%, 0.08)",
                      boxShadow: isPopular ? "0 0 20px hsla(45, 100%, 60%, 0.08)" : "none",
                    } as React.CSSProperties}
                  >
                    {/* Flashlight overlay */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl overflow-hidden" style={{ background: "radial-gradient(200px circle at var(--mouse-x) var(--mouse-y), hsla(262, 83%, 58%, 0.06), transparent 60%)" }} />

                    {isPopular && (
                      <div className="absolute -top-3 right-4 z-10">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap" style={{ background: "hsl(45, 100%, 50%)", color: "hsl(222, 35%, 12%)" }}>
                          Most Popular
                        </span>
                      </div>
                    )}
                    {index === 3 && !isPopular && (
                      <div className="absolute -top-3 right-4 z-10">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap" style={{ background: "hsl(262, 83%, 58%)" }}>
                          Best Value
                        </span>
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-base font-semibold text-white/90 mb-3">{pkg.name}</h3>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        {(isFirstOrder || isReturning) && <span className="text-sm text-white/30 line-through">{formatPrice(pkg.price_cents)}</span>}
                        <span className="text-4xl font-bold text-white">{formatPrice(displayPrice)}</span>
                      </div>
                      <span className="text-xs text-white/30 mb-5">{perCredit}¢ per credit</span>
                      <div className="space-y-2.5 mb-6 flex-1">
                        <div className="flex items-center gap-3 text-sm text-white/60">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsla(45, 100%, 50%, 0.15)", border: "1px solid hsla(45, 100%, 50%, 0.3)" }}>
                            <Check className="h-3 w-3" style={{ color: "hsl(45, 100%, 55%)" }} strokeWidth={2.5} />
                          </div>
                          <span className="text-white/80 font-medium">{pkg.credits.toLocaleString()} credits</span>
                        </div>
                        {pkg.bonus_credits > 0 && (
                          <div className="flex items-center gap-3 text-sm" style={{ color: "hsla(45, 80%, 65%, 0.8)" }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsla(45, 100%, 50%, 0.15)", border: "1px solid hsla(45, 100%, 50%, 0.3)" }}>
                              <Gift className="h-3 w-3" style={{ color: "hsl(45, 100%, 55%)" }} strokeWidth={2.5} />
                            </div>
                            <span>+{pkg.bonus_credits} bonus</span>
                          </div>
                        )}
                        {["Instant delivery", "Never expires", index === 0 ? "Platform Access" : "Full Platform Access"].map((feat) => (
                          <div key={feat} className="flex items-center gap-3 text-sm text-white/60">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsla(0, 0%, 100%, 0.06)", border: "1px solid hsla(0, 0%, 100%, 0.1)" }}>
                              <Check className="h-3 w-3 text-white/70" strokeWidth={2.5} />
                            </div>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={() => handlePurchase(pkg)}
                        disabled={!!purchasingId}
                        className="group/btn w-full py-5 rounded-xl font-medium transition-colors"
                        style={isPopular ? { background: "hsl(45, 100%, 50%)", color: "hsl(222, 35%, 12%)" } : { background: "hsla(0, 0%, 100%, 0.07)", color: "white", border: "1px solid hsla(0, 0%, 100%, 0.1)" }}
                      >
                        {purchasingId === pkg.id ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Buy now <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                          </span>
                        )}
                      </Button>

                      {retentionActive && (
                        <Button
                          onClick={() => handlePurchase(pkg, true)}
                          disabled={!!purchasingId}
                          className="w-full py-5 rounded-xl font-semibold transition-all text-white border-0 mt-2"
                          style={{ background: "linear-gradient(135deg, hsl(330, 80%, 55%), hsl(262, 83%, 58%))" }}
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
              <div
                onMouseMove={handleMouseMove}
                className="group relative flex flex-col rounded-2xl transition-all duration-300 [backface-visibility:hidden] [transform:translateZ(0)]"
                style={{
                  "--mouse-x": "50%",
                  "--mouse-y": "50%",
                  background: "hsla(222, 30%, 11%, 0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid hsla(262, 83%, 58%, 0.3)",
                } as React.CSSProperties}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl overflow-hidden" style={{ background: "radial-gradient(200px circle at var(--mouse-x) var(--mouse-y), hsla(262, 83%, 58%, 0.06), transparent 60%)" }} />
                <div className="absolute -top-3 right-4 z-10">
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap" style={{ background: "hsl(262, 83%, 58%)" }}>
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
                      className="w-full h-11 rounded-xl text-center text-lg font-semibold transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{
                        background: "hsla(0, 0%, 100%, 0.06)",
                        border: "1px solid hsla(0, 0%, 100%, 0.12)",
                        color: "white",
                        outline: "none",
                      }}
                    />
                    <span className="text-[10px] text-white/25 mt-1 block">Min 500 · Bulk discounts up to 40%</span>
                  </div>
                  <div className="space-y-2.5 mb-6 flex-1">
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsla(45, 100%, 50%, 0.15)", border: "1px solid hsla(45, 100%, 50%, 0.3)" }}>
                        <Check className="h-3 w-3" style={{ color: "hsl(45, 100%, 55%)" }} strokeWidth={2.5} />
                      </div>
                      <span className="text-white/80 font-medium">{customCredits.toLocaleString()} credits</span>
                    </div>
                    {customDiscount > 0 && (
                      <div className="flex items-center gap-3 text-sm" style={{ color: "hsla(45, 80%, 65%, 0.8)" }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsla(45, 100%, 50%, 0.15)", border: "1px solid hsla(45, 100%, 50%, 0.3)" }}>
                          <Gift className="h-3 w-3" style={{ color: "hsl(45, 100%, 55%)" }} strokeWidth={2.5} />
                        </div>
                        <span>{Math.round(customDiscount * 100)}% volume discount</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsla(0, 0%, 100%, 0.06)", border: "1px solid hsla(0, 0%, 100%, 0.1)" }}>
                        <Check className="h-3 w-3 text-white/70" strokeWidth={2.5} />
                      </div>
                      <span>Instant delivery</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleCustomPurchase}
                    disabled={purchasingCustom}
                    className="group/btn w-full py-5 rounded-xl font-medium text-white transition-colors"
                    style={{ background: "hsl(262, 83%, 58%)" }}
                  >
                    {purchasingCustom ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Buy now <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Trust */}
          <div className="mt-10 pb-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-white/30" />
                <h4 className="text-sm font-medium text-white/70">Secure Payments</h4>
                <p className="text-xs text-white/30">256-bit SSL · One-time payment</p>
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
      </div>

      <Footer />
    </AnimatedBackground>
  );
};

export default Pricing;

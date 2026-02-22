import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Coins, ArrowRight, Gift, Zap, Lock, Check, Clock, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import CheckoutModal from "@/components/CheckoutModal";

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

interface InsufficientCreditsModalProps {
  open: boolean;
  onClose: () => void;
  requiredCredits?: number;
  actionName?: string;
}

const cardAccents = [
  { border: "border-purple-500/25", flash: "rgba(168,85,247,0.04)", badge: "", label: "" },
  { border: "border-yellow-500/40", flash: "rgba(234,179,8,0.04)", badge: "bg-yellow-500", label: "Most Popular" },
  { border: "border-white/10", flash: "rgba(255,255,255,0.03)", badge: "", label: "" },
  { border: "border-purple-500/30", flash: "rgba(168,85,247,0.04)", badge: "bg-purple-500", label: "Best Value" },
];

const InsufficientCreditsModal = ({ open, onClose, requiredCredits, actionName }: InsufficientCreditsModalProps) => {
  const { user } = useAuth();
  const { balance, refreshWallet } = useWallet();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const isPurchaseMode = actionName === "Add Credits";

  useEffect(() => {
    if (!open) return;
    const fetchPackages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data) setPackages(data as CreditPackage[]);
      setLoading(false);
    };
    fetchPackages();
  }, [open]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) { toast.error("Please log in first"); navigate("/auth"); return; }
    setPurchasingId(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { packageId: pkg.id },
      });
      if (error) throw error;
      if (data?.checkoutUrl) setCheckoutUrl(data.checkoutUrl);
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCheckoutClose = (purchased: boolean) => {
    setCheckoutUrl(null);
    if (purchased) {
      refreshWallet();
      onClose();
    }
  };

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="w-full max-w-4xl bg-[hsl(222,30%,9%)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Coins className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {isPurchaseMode ? "Purchase Credits" : "Insufficient Credits"}
                </h2>
                <p className="text-xs text-white/40">
                  {isPurchaseMode
                    ? "Power up your account. Credits are delivered instantly and never expire."
                    : actionName
                      ? `"${actionName}" requires ${requiredCredits} credits. You have ${balance}.`
                      : `You need ${requiredCredits} credits. Current balance: ${balance}.`}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-white/30 hover:text-white h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Packages */}
          <div className="p-5">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {packages.map((pkg, index) => {
                  const accent = cardAccents[index] || cardAccents[0];
                  const perCredit = (pkg.price_cents / (pkg.credits + pkg.bonus_credits)).toFixed(2);
                  const isPopular = pkg.is_popular;

                  return (
                    <div
                      key={pkg.id}
                      onMouseMove={handleMouseMove}
                      className={`group relative flex flex-col rounded-2xl border ${accent.border} bg-[hsl(222,30%,11%)] transition-colors duration-300 ${isPopular ? 'ring-1 ring-yellow-500/40' : ''} [backface-visibility:hidden] [transform:translateZ(0)]`}
                      style={{ "--mouse-x": "50%", "--mouse-y": "50%" } as React.CSSProperties}
                    >
                      {/* Flashlight overlay */}
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl overflow-hidden" style={{ background: `radial-gradient(200px circle at var(--mouse-x) var(--mouse-y), ${accent.flash}, transparent 60%)` }} />

                      {accent.label && (
                        <div className="absolute -top-3 right-4 z-10">
                          <span className={`${accent.badge} text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap`}>
                            {accent.label}
                          </span>
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-white/90 mb-2">{pkg.name}</h3>

                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-3xl font-bold text-white">{formatPrice(pkg.price_cents)}</span>
                        </div>
                        <span className="text-[10px] text-white/30 mb-4">{perCredit}¢ per credit</span>

                        <div className="space-y-2 mb-4 flex-1">
                          <div className="flex items-center gap-2.5 text-xs text-white/60">
                            <div className="w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                              <Check className="h-2.5 w-2.5 text-amber-400" strokeWidth={2.5} />
                            </div>
                            <span className="text-white/80 font-medium">{pkg.credits.toLocaleString()} credits</span>
                          </div>
                          {pkg.bonus_credits > 0 && (
                            <div className="flex items-center gap-2.5 text-xs text-amber-300/80">
                              <div className="w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                <Gift className="h-2.5 w-2.5 text-amber-400" strokeWidth={2.5} />
                              </div>
                              <span>+{pkg.bonus_credits} bonus</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2.5 text-xs text-white/60">
                            <div className="w-4 h-4 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                              <Check className="h-2.5 w-2.5 text-white/70" strokeWidth={2.5} />
                            </div>
                            <span>Instant delivery</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-white/60">
                            <div className="w-4 h-4 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                              <Check className="h-2.5 w-2.5 text-white/70" strokeWidth={2.5} />
                            </div>
                            <span>Never expires</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handlePurchase(pkg)}
                          disabled={!!purchasingId}
                          size="sm"
                          className={`group/btn w-full py-4 rounded-xl font-medium transition-colors ${
                            isPopular
                              ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                              : "bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/10"
                          }`}
                        >
                          {purchasingId === pkg.id ? (
                            <span className="animate-pulse">Processing...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-1.5">
                              Buy now <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-8 mt-5 pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Lock className="h-3 w-3" /> Secure Checkout
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Zap className="h-3 w-3" /> Instant Delivery
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Infinity className="h-3 w-3" /> Never Expires
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Clock className="h-3 w-3" /> One-time Payment
              </div>
            </div>

            {/* Full pricing link */}
            <div className="text-center mt-3">
              <button
                onClick={() => { onClose(); navigate("/pricing"); }}
                className="text-xs text-accent/70 hover:text-accent transition-colors underline underline-offset-2"
              >
                View all plans & custom credits →
              </button>
            </div>
          </div>
        </div>
      </div>

      <CheckoutModal checkoutUrl={checkoutUrl} onClose={handleCheckoutClose} />
    </>
  );
};

export default InsufficientCreditsModal;
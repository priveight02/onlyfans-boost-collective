import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Coins, ArrowRight, Gift, Zap, ShieldCheck } from "lucide-react";
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

const InsufficientCreditsModal = ({ open, onClose, requiredCredits, actionName }: InsufficientCreditsModalProps) => {
  const { user } = useAuth();
  const { balance, refreshWallet } = useWallet();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);

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
      if (data?.clientSecret) setCheckoutSecret(data.clientSecret);
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCheckoutClose = (purchased: boolean) => {
    setCheckoutSecret(null);
    if (purchased) {
      refreshWallet();
      onClose();
    }
  };

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="w-full max-w-3xl bg-[hsl(222,30%,9%)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Coins className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Insufficient Credits</h2>
                <p className="text-xs text-white/40">
                  {actionName
                    ? `"${actionName}" requires ${requiredCredits} credits — you have ${balance}.`
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {packages.map((pkg) => {
                  const perCredit = (pkg.price_cents / (pkg.credits + pkg.bonus_credits)).toFixed(2);
                  return (
                    <div
                      key={pkg.id}
                      className={`relative flex flex-col rounded-xl border p-4 transition-all hover:translate-y-[-1px] ${
                        pkg.is_popular
                          ? "border-yellow-500/40 ring-1 ring-yellow-500/30 bg-[hsl(222,30%,12%)]"
                          : "border-white/10 bg-[hsl(222,30%,11%)]"
                      }`}
                    >
                      {pkg.is_popular && (
                        <span className="absolute -top-2 right-3 bg-yellow-500 text-black text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}

                      <h3 className="text-sm font-semibold text-white/90 mb-1">{pkg.name}</h3>
                      <div className="text-2xl font-bold text-white mb-0.5">{formatPrice(pkg.price_cents)}</div>
                      <span className="text-[10px] text-white/30 mb-3">{perCredit}¢ / credit</span>

                      <div className="space-y-1.5 mb-3 flex-1">
                        <p className="text-xs text-white/60">{pkg.credits.toLocaleString()} credits</p>
                        {pkg.bonus_credits > 0 && (
                          <p className="text-xs text-amber-300/70 flex items-center gap-1">
                            <Gift className="h-3 w-3" /> +{pkg.bonus_credits} bonus
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => handlePurchase(pkg)}
                        disabled={!!purchasingId}
                        size="sm"
                        className={`w-full text-xs ${
                          pkg.is_popular
                            ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                            : "bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/10"
                        }`}
                      >
                        {purchasingId === pkg.id ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            Buy <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <ShieldCheck className="h-3 w-3" /> Secure
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Zap className="h-3 w-3" /> Instant
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Gift className="h-3 w-3" /> Never expires
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

      <CheckoutModal clientSecret={checkoutSecret} onClose={handleCheckoutClose} />
    </>
  );
};

export default InsufficientCreditsModal;

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, ArrowRight, Gift, Lock, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  onOpenChange: (open: boolean) => void;
  requiredCredits?: number;
  actionName?: string;
}

const InsufficientCreditsModal = ({
  open,
  onOpenChange,
  requiredCredits,
  actionName,
}: InsufficientCreditsModalProps) => {
  const { user } = useAuth();
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
    if (!user) {
      toast.error("Please log in first");
      navigate("/auth");
      return;
    }
    setPurchasingId(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { packageId: pkg.id },
      });
      if (error) throw error;
      if (data?.clientSecret) {
        setCheckoutSecret(data.clientSecret);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCheckoutClose = (purchased: boolean) => {
    setCheckoutSecret(null);
    if (purchased) {
      onOpenChange(false);
      // Wallet refresh happens via realtime / visibility
    }
  };

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;

  const cardAccents = [
    "border-purple-500/25",
    "border-yellow-500/40 ring-1 ring-yellow-500/30",
    "border-white/10",
    "border-purple-500/30",
  ];

  return (
    <>
      <Dialog open={open && !checkoutSecret} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[hsl(222,30%,8%)] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lock className="h-5 w-5 text-amber-400" />
              </div>
              Insufficient Credits
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Context message */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <p className="text-sm text-white/70">
                {actionName ? (
                  <>
                    <span className="text-amber-300 font-semibold">"{actionName}"</span> requires{" "}
                    <span className="text-amber-300 font-bold">{requiredCredits}</span> credits.
                  </>
                ) : (
                  <>You need more credits to perform this action.</>
                )}{" "}
                Choose a package below to top up instantly.
              </p>
            </div>

            {/* Packages grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-52 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {packages.map((pkg, index) => {
                  const accent = cardAccents[index] || cardAccents[0];
                  const perCredit = (pkg.price_cents / (pkg.credits + pkg.bonus_credits)).toFixed(2);
                  const isPopular = pkg.is_popular;

                  return (
                    <div
                      key={pkg.id}
                      className={`relative flex flex-col rounded-xl border ${accent} bg-[hsl(222,30%,11%)] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg`}
                    >
                      {isPopular && (
                        <div className="absolute -top-2 right-3">
                          <span className="bg-yellow-500 text-black text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-white/90 mb-2">{pkg.name}</h3>
                        <span className="text-2xl font-bold text-white mb-0.5">{formatPrice(pkg.price_cents)}</span>
                        <span className="text-[10px] text-white/30 mb-3">{perCredit}¢/credit</span>

                        <div className="space-y-1.5 mb-4 flex-1">
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <Coins className="h-3 w-3 text-amber-400 shrink-0" />
                            <span className="font-medium">{pkg.credits.toLocaleString()} credits</span>
                          </div>
                          {pkg.bonus_credits > 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-300/80">
                              <Gift className="h-3 w-3 text-amber-400 shrink-0" />
                              <span>+{pkg.bonus_credits} bonus</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <Check className="h-3 w-3 text-white/40 shrink-0" />
                            <span>Instant delivery</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handlePurchase(pkg)}
                          disabled={!!purchasingId}
                          size="sm"
                          className={`w-full rounded-lg text-xs font-medium ${
                            isPopular
                              ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                              : "bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/10"
                          }`}
                        >
                          {purchasingId === pkg.id ? (
                            <span className="animate-pulse">Processing...</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              Buy <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View all link */}
            <div className="text-center pt-1">
              <Button
                variant="link"
                className="text-white/40 hover:text-white/70 text-xs gap-1"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/pricing");
                }}
              >
                <Sparkles className="h-3 w-3" /> View all plans & custom credits
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {checkoutSecret && (
        <CheckoutModal clientSecret={checkoutSecret} onClose={handleCheckoutClose} />
      )}
    </>
  );
};

export default InsufficientCreditsModal;

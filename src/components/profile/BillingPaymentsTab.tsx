import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, FileText, Settings2, AlertTriangle, ExternalLink, RefreshCw,
  Check, X, Gift, ShieldCheck, Sparkles, Clock, Mail, Tag, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subscription {
  id: string;
  status: string;
  product_id: string;
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  discount: { coupon_name: string; percent_off: number | null; amount_off: number | null } | null;
  amount: number;
  currency: string;
  interval: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string | null;
  receipt_email: string | null;
  receipt_url: string | null;
  refunded: boolean;
  amount_refunded: number;
  payment_method_details: { type: string; card: { brand: string; last4: string } | null } | null;
  discount: { coupon_name: string; percent_off: number | null; amount_off: number | null } | null;
  subtotal?: number;
  total?: number;
}

const PLAN_NAME_MAP: Record<string, string> = {
  "prod_TzAqP0zH90vzyR": "Starter (Monthly)",
  "prod_TzAypr06as419B": "Starter (Yearly)",
  "prod_TzArZUF2DIlzHq": "Pro (Monthly)",
  "prod_TzAywFFZ0SdhfZ": "Pro (Yearly)",
  "prod_TzAram9it2Kedf": "Business (Monthly)",
  "prod_TzAzgoteaSHuDB": "Business (Yearly)",
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
};

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (iso: string) => {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const BillingPaymentsTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [eligibleForRetention, setEligibleForRetention] = useState(false);
  const [eligibilityReasons, setEligibilityReasons] = useState<string[]>([]);

  const [showRetentionDialog, setShowRetentionDialog] = useState(false);
  const [retentionStep, setRetentionStep] = useState<"offer" | "confirm-cancel">("offer");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [redirectingToPortal, setRedirectingToPortal] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const fetchBillingInfo = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-info", {
        body: { action: "info" },
      });
      if (error) throw error;
      setSubscription(data.subscription);
      setPayments(data.payments || []);
      setEligibleForRetention(data.eligible_for_retention);
      setEligibilityReasons(data.eligibility_reasons || []);
    } catch (err: any) {
      console.error("Failed to fetch billing info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, [user]);

  const handleManageSubscription = () => {
    if (!subscription) return;
    setRetentionStep("offer");
    setShowRetentionDialog(true);
  };

  const handleAcceptRetention = async () => {
    setApplyingDiscount(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-info", {
        body: { action: "apply_retention_coupon" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("🎉 50% discount applied! Enjoy your savings.");
      setShowRetentionDialog(false);
      fetchBillingInfo();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply discount");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleProceedToCancel = async () => {
    setRedirectingToPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        setShowRetentionDialog(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open subscription management");
    } finally {
      setRedirectingToPortal(false);
    }
  };

  const handleOpenPortalDirect = async () => {
    setRedirectingToPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open management portal");
    } finally {
      setRedirectingToPortal(false);
    }
  };

  const displayedPayments = showAllPayments ? payments : payments.slice(0, 5);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-purple-400 animate-spin" />
          <span className="ml-3 text-white/50 text-sm">Loading billing information...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* ═══════════════ SUBSCRIPTION MANAGEMENT ═══════════════ */}
      <div className="rounded-2xl border border-purple-500/10 bg-[hsl(222,28%,11%)] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Subscription Management</h2>
            <p className="text-white/40 text-xs">View and manage your current subscription</p>
          </div>
        </div>

        {subscription ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Plan */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Current Plan</p>
                <p className="text-white font-semibold text-sm">
                  {PLAN_NAME_MAP[subscription.product_id as string] || "Custom Plan"}
                </p>
                {subscription.discount && (
                  <Badge className="mt-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[10px]">
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    {subscription.discount.coupon_name}
                    {subscription.discount.percent_off && ` (${subscription.discount.percent_off}% off)`}
                  </Badge>
                )}
              </div>

              {/* Billing Amount */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Billing Amount</p>
                <p className="text-white font-semibold text-sm">
                  {formatCurrency(subscription.amount, subscription.currency)}
                  <span className="text-white/40 font-normal text-xs"> / {subscription.interval}</span>
                </p>
              </div>

              {/* Next Billing */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">
                  {subscription.cancel_at_period_end ? "Expires On" : "Next Billing"}
                </p>
                <p className="text-white font-semibold text-sm">
                  {formatDate(subscription.current_period_end)}
                </p>
                {subscription.cancel_at_period_end && (
                  <Badge className="mt-1.5 bg-amber-500/15 text-amber-300 border-amber-500/20 text-[10px]">
                    Cancels at period end
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {eligibleForRetention ? (
                <Button
                  onClick={handleManageSubscription}
                  className="bg-[hsl(222,25%,18%)] hover:bg-[hsl(222,25%,22%)] text-white border border-white/10 text-sm h-9 px-4"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage / Cancel Subscription
                </Button>
              ) : (
                <Button
                  onClick={handleOpenPortalDirect}
                  disabled={redirectingToPortal}
                  className="bg-[hsl(222,25%,18%)] hover:bg-[hsl(222,25%,22%)] text-white border border-white/10 text-sm h-9 px-4"
                >
                  {redirectingToPortal ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Manage Subscription
                </Button>
              )}
              <Button
                onClick={fetchBillingInfo}
                variant="ghost"
                className="text-white/40 hover:text-white/60 text-sm h-9 px-3"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-7 w-7 text-white/20" />
            </div>
            <h3 className="text-white/70 font-medium text-sm mb-1">No Active Subscription</h3>
            <p className="text-white/40 text-xs mb-4 max-w-sm mx-auto">
              You're currently on the free tier. Upgrade to a paid plan to unlock premium features, extra credits, and advanced CRM tools.
            </p>
            <Button
              onClick={() => {
                const el = document.querySelector('[data-tab="plan-credits"]');
                if (el) (el as HTMLButtonElement).click();
              }}
              className="bg-purple-500 hover:bg-purple-400 text-white text-sm h-9 px-5 font-medium"
            >
              <Sparkles className="h-4 w-4 mr-2" /> View Plans
            </Button>
          </div>
        )}
      </div>

      {/* ═══════════════ PAYMENT HISTORY ═══════════════ */}
      <div className="rounded-2xl border border-purple-500/10 bg-[hsl(222,28%,11%)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Payment History</h2>
              <p className="text-white/40 text-xs">{payments.length} payment{payments.length !== 1 ? "s" : ""} found</p>
            </div>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
            <FileText className="h-7 w-7 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedPayments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      payment.status === "succeeded"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : payment.refunded
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {payment.status === "succeeded" && !payment.refunded ? (
                        <Check className="h-4 w-4" />
                      ) : payment.refunded ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white/90 text-sm font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        {payment.refunded && (
                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[9px]">
                            Refunded {payment.amount_refunded < payment.amount ? "Partial" : "Full"}
                          </Badge>
                        )}
                        {payment.discount && (
                          <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 text-[9px]">
                            <Tag className="h-2 w-2 mr-0.5" />
                            {payment.discount.percent_off
                              ? `${payment.discount.percent_off}% off`
                              : payment.discount.amount_off
                              ? `${formatCurrency(payment.discount.amount_off, payment.currency)} off`
                              : payment.discount.coupon_name}
                          </Badge>
                        )}
                        {payment.payment_method_details?.card && (
                          <span className="text-white/30 text-[10px]">
                            {payment.payment_method_details.card.brand.toUpperCase()} ····{payment.payment_method_details.card.last4}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-white/35 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDateTime(payment.created)}
                        </span>
                        {payment.receipt_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" />
                            {payment.receipt_email}
                          </span>
                        )}
                        {payment.description && (
                          <span className="truncate max-w-[200px]">{payment.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400/60 hover:text-purple-300 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {payments.length > 5 && (
              <button
                onClick={() => setShowAllPayments(!showAllPayments)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-purple-300/60 hover:text-purple-300 transition-colors"
              >
                {showAllPayments ? (
                  <><ChevronUp className="h-4 w-4" /> Show Less</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> Show All {payments.length} Payments</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ RETENTION DIALOG ═══════════════ */}
      <Dialog open={showRetentionDialog} onOpenChange={setShowRetentionDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <AnimatePresence mode="wait">
            {retentionStep === "offer" && (
              <motion.div
                key="offer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
                      <Gift className="h-8 w-8 text-purple-300" />
                    </div>
                  </div>
                  <DialogTitle className="text-center text-white text-lg">
                    Wait — We Have Something Special! 🎁
                  </DialogTitle>
                  <DialogDescription className="text-center text-white/50 text-sm mt-2">
                    We'd hate to see you go. As a valued member, we'd like to offer you an exclusive deal.
                  </DialogDescription>
                </DialogHeader>

                <div className="my-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-5">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 bg-purple-500/20 rounded-full px-4 py-1.5 mb-3">
                      <Sparkles className="h-4 w-4 text-purple-300" />
                      <span className="text-purple-200 font-bold text-sm">EXCLUSIVE OFFER</span>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">
                      50<span className="text-purple-400">%</span> OFF
                    </h3>
                    <p className="text-white/50 text-sm">on everything in the Pricing tab</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Applied to your current subscription</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Valid on all future billings</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Keep all your premium features</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleAcceptRetention}
                    disabled={applyingDiscount}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold text-sm h-11 rounded-xl border-0"
                  >
                    {applyingDiscount ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Applying...</>
                    ) : (
                      <><Gift className="h-4 w-4 mr-2" /> Yes! Apply 50% Discount</>
                    )}
                  </Button>
                  <button
                    onClick={() => setRetentionStep("confirm-cancel")}
                    className="w-full text-center text-white/30 hover:text-white/50 text-xs py-2 transition-colors"
                  >
                    No thanks, I still want to cancel
                  </button>
                </div>
              </motion.div>
            )}

            {retentionStep === "confirm-cancel" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-white/90 text-[15px]">Are you sure?</DialogTitle>
                  <DialogDescription className="text-white/40 text-sm">
                    You'll be redirected to the subscription management page where you can cancel or modify your plan.
                  </DialogDescription>
                </DialogHeader>

                <div className="my-5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 p-4 text-sm text-amber-200/60 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400/60" />
                  <div>
                    <p className="font-medium text-amber-200/80 mb-1">You're about to lose:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>Your exclusive 50% discount offer</li>
                      <li>Premium features access</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                  <Button
                    onClick={() => setRetentionStep("offer")}
                    className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl text-sm"
                  >
                    ← Wait, I want the 50% discount
                  </Button>
                  <Button
                    onClick={handleProceedToCancel}
                    disabled={redirectingToPortal}
                    variant="ghost"
                    className="w-full text-red-400/60 hover:text-red-300 hover:bg-red-500/[0.06] text-sm"
                  >
                    {redirectingToPortal ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Redirecting...</>
                    ) : (
                      <><ExternalLink className="h-4 w-4 mr-2" /> Proceed to Cancel</>
                    )}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default BillingPaymentsTab;

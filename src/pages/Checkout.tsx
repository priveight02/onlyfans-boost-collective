import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ShieldCheck, Loader2, CheckCircle2, XCircle,
  Sparkles, LayoutDashboard, AlertTriangle, Coins, Zap, BadgeCheck,
  ChevronLeft, ChevronRight, CreditCard, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PageSEO from "@/components/PageSEO";

type CheckoutState = "loading" | "checkout" | "verifying" | "success" | "failed" | "canceled";

interface OrderInfo {
  name: string;
  credits: number;
  bonus: number;
  originalPriceCents: number;
  finalPriceCents: number;
  discountLabel: string | null;
  discountAmountCents: number;
  isFirstOrder: boolean;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { balance, purchaseCount, refreshWallet } = useWallet();
  const [state, setState] = useState<CheckoutState>("loading");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [verifyStep, setVerifyStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stateRef = useRef<CheckoutState>("loading");
  const verificationStartedRef = useRef(false);
  const baselineBalanceRef = useRef(0);
  const baselinePurchaseCountRef = useRef(0);

  const pkgId = searchParams.get("pkg");
  const customCreditsParam = searchParams.get("credits");
  const useRetention = searchParams.get("retention") === "1";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!user) return;
    const initCheckout = async () => {
      try {
        setState("loading");
        verificationStartedRef.current = false;

        baselineBalanceRef.current = balance;
        baselinePurchaseCountRef.current = purchaseCount;
        const { data: walletSnapshot } = await supabase
          .from("wallets")
          .select("balance, purchase_count")
          .eq("user_id", user.id)
          .maybeSingle();
        if (walletSnapshot) {
          baselineBalanceRef.current = walletSnapshot.balance ?? balance;
          baselinePurchaseCountRef.current = walletSnapshot.purchase_count ?? purchaseCount;
        }

        const body: Record<string, any> = {};
        if (pkgId) {
          body.packageId = pkgId;
        } else if (customCreditsParam) {
          body.customCredits = parseInt(customCreditsParam, 10);
        } else {
          navigate("/pricing");
          return;
        }
        if (useRetention) body.useRetentionDiscount = true;

        if (pkgId) {
          const { data: pkg } = await supabase
            .from("credit_packages")
            .select("*")
            .eq("id", pkgId)
            .maybeSingle();
          if (!pkg) {
            navigate("/pricing", { replace: true });
            return;
          }
          const isFirst = purchaseCount === 0;
          const discountedPrice = isFirst ? Math.round(pkg.price_cents * 0.6) : pkg.price_cents;
          setOrderInfo({
            name: pkg.name,
            credits: pkg.credits,
            bonus: pkg.bonus_credits,
            originalPriceCents: pkg.price_cents,
            finalPriceCents: discountedPrice,
            discountLabel: isFirst ? "First Order · 40% OFF" : null,
            discountAmountCents: isFirst ? pkg.price_cents - discountedPrice : 0,
            isFirstOrder: isFirst,
          });
        } else if (customCreditsParam) {
          const credits = parseInt(customCreditsParam);
          const basePriceCents = Math.round(credits * 1.816);
          const isFirst = purchaseCount === 0;
          const finalPrice = isFirst ? Math.round(basePriceCents * 0.6) : basePriceCents;
          setOrderInfo({
            name: `${credits.toLocaleString()} Custom Credits`,
            credits,
            bonus: 0,
            originalPriceCents: basePriceCents,
            finalPriceCents: finalPrice,
            discountLabel: isFirst ? "First Order · 40% OFF" : null,
            discountAmountCents: isFirst ? basePriceCents - finalPrice : 0,
            isFirstOrder: isFirst,
          });
        }

        const { data, error } = await supabase.functions.invoke("purchase-credits", { body });
        if (error) throw error;
        if (data?.checkoutUrl) {
          setCheckoutUrl(data.checkoutUrl);
          setState("checkout");
        } else {
          throw new Error("No checkout URL received");
        }
      } catch (err: any) {
        navigate("/pricing");
      }
    };
    initCheckout();
  }, [user]); // eslint-disable-line

  const verifyWithRetry = async () => {
    const resolveSuccess = async (verificationData: any, currentStep: number) => {
      const balanceFromVerification = Number(verificationData?.balance ?? baselineBalanceRef.current);
      const purchaseCountFromVerification = Number(verificationData?.purchase_count ?? baselinePurchaseCountRef.current);
      const walletDelta = Math.max(0, balanceFromVerification - baselineBalanceRef.current);
      const purchaseCountIncreased = purchaseCountFromVerification > baselinePurchaseCountRef.current;
      const directCreditsAdded = Number(verificationData?.credits_added ?? 0);

      if (directCreditsAdded <= 0 && !purchaseCountIncreased && walletDelta <= 0) {
        return false;
      }

      const inferredCreditsAdded = directCreditsAdded > 0
        ? directCreditsAdded
        : walletDelta > 0
          ? walletDelta
          : (orderInfo?.credits || 0) + (orderInfo?.bonus || 0);

      setCreditsAdded(inferredCreditsAdded);
      for (let j = currentStep + 1; j < steps.length; j++) {
        setVerifyStep(j + 1);
        setVerifyStatus(steps[j].msg);
        await new Promise(r => setTimeout(r, 800));
      }
      setVerifyStep(steps.length);
      setVerifyStatus("Payment verified successfully!");
      await new Promise(r => setTimeout(r, 600));
      setState("success");
      refreshWallet();
      return true;
    };

    const steps = [
      { delay: 2000, msg: "Connecting to payment provider...", verifyNow: false },
      { delay: 2500, msg: "Payment received, validating transaction...", verifyNow: true },
      { delay: 2000, msg: "Confirming credits allocation...", verifyNow: true },
      { delay: 1800, msg: "Syncing your wallet balance...", verifyNow: true },
      { delay: 1500, msg: "Final confirmation...", verifyNow: true },
    ];

    for (let i = 0; i < steps.length; i++) {
      setVerifyStep(i + 1);
      setVerifyStatus(steps[i].msg);
      await new Promise(r => setTimeout(r, steps[i].delay));

      if (steps[i].verifyNow) {
        try {
          const { data } = await supabase.functions.invoke("verify-credit-purchase");
          const didResolve = await resolveSuccess(data, i);
          if (didResolve) return;
        } catch {}
      }
    }

    for (let retry = 0; retry < 3; retry++) {
      setVerifyStatus("Still waiting for confirmation...");
      await new Promise(r => setTimeout(r, 3000));
      try {
        const { data } = await supabase.functions.invoke("verify-credit-purchase");
        const didResolve = await resolveSuccess(data, steps.length - 1);
        if (didResolve) return;
      } catch {}
    }

    try {
      const { data: latestWallet } = await supabase
        .from("wallets")
        .select("balance, purchase_count")
        .eq("user_id", user?.id)
        .maybeSingle();

      const latestBalance = Number(latestWallet?.balance ?? baselineBalanceRef.current);
      const latestPurchaseCount = Number(latestWallet?.purchase_count ?? baselinePurchaseCountRef.current);
      const latestDelta = Math.max(0, latestBalance - baselineBalanceRef.current);
      if (latestPurchaseCount > baselinePurchaseCountRef.current || latestDelta > 0) {
        setCreditsAdded(latestDelta > 0 ? latestDelta : (orderInfo?.credits || 0) + (orderInfo?.bonus || 0));
        setVerifyStatus("Payment verified successfully!");
        await new Promise(r => setTimeout(r, 600));
        setState("success");
        refreshWallet();
        return;
      }
    } catch {}

    setState("failed");
  };

  useEffect(() => {
    const handleEvent = (eventName: string) => {
      const lower = eventName.toLowerCase();
      const currentState = stateRef.current;

      if (lower.includes("success") || lower.includes("confirmed")) {
        if (verificationStartedRef.current || currentState !== "checkout") return;
        verificationStartedRef.current = true;
        setState("verifying");
        verifyWithRetry();
        return;
      }

      if (verificationStartedRef.current || currentState !== "checkout") return;

      if (lower.includes("fail") || lower.includes("decline") || lower.includes("error")) {
        setState("failed");
      } else if (lower.includes("close") || lower.includes("cancel")) {
        setState("canceled");
      }
    };

    const handler = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event) handleEvent(parsed.event);
        } catch {}
      }
      if (event.data?.event) handleEvent(event.data.event);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [orderInfo, refreshWallet, user?.id]);

  useEffect(() => {
    if (state === "success") {
      // Redirect to thank-you page with order context
      const params = new URLSearchParams();
      params.set("credits", String(creditsAdded));
      if (orderInfo) params.set("pkg", orderInfo.name);
      navigate(`/thank-you?${params.toString()}`, { replace: true });
    }
  }, [state]); // eslint-disable-line

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleBackClick = () => {
    if (state === "checkout") {
      setShowLeaveDialog(true);
    } else {
      navigate("/pricing");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(222, 35%, 7%)" }}>
      <PageSEO title="Secure Checkout | Uplyze" description="Complete your purchase securely." />

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
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
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm text-white/50 font-medium">Secure Checkout</span>
          </div>
        </div>
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </header>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent
          className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0 border-0 [&>button]:hidden"
          style={{
            background: "hsl(222, 30%, 10%)",
            boxShadow: "0 0 0 1px hsla(0, 0%, 100%, 0.08), 0 32px 80px -12px hsla(0, 0%, 0%, 0.7), 0 0 120px -40px hsla(262, 83%, 55%, 0.12)",
          }}
        >
          <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, hsla(45, 95%, 55%, 0.5), transparent)" }} />
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsla(45, 95%, 55%, 0.12), hsla(35, 90%, 50%, 0.06))",
                  border: "1px solid hsla(45, 95%, 55%, 0.18)",
                }}
              >
                <CreditCard className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">Leave checkout?</h3>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  Your transaction hasn't been completed yet. You can return to finish your purchase or browse other plans.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowLeaveDialog(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))",
                  boxShadow: "0 4px 16px hsla(262, 83%, 55%, 0.3), inset 0 1px 0 hsla(0, 0%, 100%, 0.15)",
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Transaction
              </button>
              <button
                onClick={() => { setShowLeaveDialog(false); navigate("/pricing"); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-white/50 hover:text-white/70 transition-colors"
                style={{
                  background: "hsla(0, 0%, 100%, 0.04)",
                  border: "1px solid hsla(0, 0%, 100%, 0.06)",
                }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Browse Plans
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading */}
      {state === "loading" && (
        <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-3 rounded-full"
                style={{ background: "conic-gradient(from 0deg, transparent, hsla(262, 83%, 55%, 0.25), transparent, transparent)" }}
              />
              <div
                className="relative flex items-center justify-center w-14 h-14 rounded-2xl"
                style={{ background: "hsla(262, 83%, 55%, 0.08)", border: "1px solid hsla(262, 83%, 55%, 0.15)" }}
              >
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/60 text-sm font-medium">Preparing your checkout</p>
              <p className="text-white/25 text-xs mt-1">Setting up secure payment session...</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Checkout View */}
      {state === "checkout" && checkoutUrl && (
        <div className="relative flex flex-col lg:flex-row" style={{ height: "calc(100vh - 56px)" }}>
          {/* Polar Iframe */}
          <div className="flex-1 min-h-0">
            <iframe
              ref={iframeRef}
              src={checkoutUrl}
              className="w-full h-full border-0"
              allow="payment *"
              loading="eager"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
              title="Checkout"
              style={{ background: "white" }}
            />
          </div>

          {/* Sidebar Toggle */}
          <AnimatePresence>
            {!sidebarOpen && orderInfo && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(true)}
                className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center justify-center w-5 h-10 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-white/30 hover:text-white/60 transition-colors" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Order Summary Sidebar */}
          <AnimatePresence>
            {orderInfo && sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 400, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="hidden lg:flex flex-shrink-0 overflow-hidden flex-col relative"
                style={{ background: "hsl(222, 30%, 8%)" }}
              >
                <div className="absolute inset-y-0 left-0 w-px" style={{ background: "hsla(0, 0%, 100%, 0.06)" }} />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-5 h-10 transition-colors"
                  title="Collapse"
                >
                  <ChevronRight className="h-4 w-4 text-white/30 hover:text-white/60 transition-colors" />
                </button>

                <div className="w-[400px] p-7 flex-1 flex flex-col overflow-y-auto pl-8">
                  {/* Product Card */}
                  <div
                    className="rounded-2xl p-4 mb-6"
                    style={{
                      background: "hsla(0, 0%, 100%, 0.03)",
                      border: "1px solid hsla(0, 0%, 100%, 0.06)",
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "linear-gradient(135deg, hsla(45, 95%, 55%, 0.15), hsla(35, 95%, 50%, 0.08))",
                          border: "1px solid hsla(45, 95%, 55%, 0.2)",
                        }}
                      >
                        <Coins className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{orderInfo.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {orderInfo.credits.toLocaleString()} credits
                          {orderInfo.bonus > 0 && ` + ${orderInfo.bonus.toLocaleString()} bonus`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full text-white/40" style={{ background: "hsla(0, 0%, 100%, 0.05)" }}>One-time</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full text-white/40" style={{ background: "hsla(0, 0%, 100%, 0.05)" }}>Never expires</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-white/70">{formatPrice(orderInfo.originalPriceCents)}</span>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-3 mb-5 pb-5" style={{ borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)" }}>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Subtotal</span>
                      <span className="text-white/60">{formatPrice(orderInfo.originalPriceCents)}</span>
                    </div>
                    {orderInfo.discountLabel && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400 font-medium">{orderInfo.discountLabel}</span>
                        <span className="text-emerald-400 font-medium">-{formatPrice(orderInfo.discountAmountCents)}</span>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-baseline mb-6">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] text-white/25 uppercase tracking-wider">USD</span>
                      <span className="text-2xl font-bold text-white">{formatPrice(orderInfo.finalPriceCents)}</span>
                    </div>
                  </div>

                  {/* First Order Banner */}
                  {orderInfo.isFirstOrder && (
                    <div
                      className="rounded-xl p-4 mb-6 relative overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, hsla(262, 83%, 58%, 0.12), hsla(145, 80%, 42%, 0.06))",
                        border: "1px solid hsla(262, 83%, 58%, 0.25)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-bold text-white">Welcome Discount Applied</span>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        First-time customers get 40% OFF automatically. This discount is applied once per account.
                      </p>
                    </div>
                  )}

                  {/* Trust Indicators */}
                  <div className="mt-auto space-y-2.5 pt-4" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.04)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsla(145, 80%, 50%, 0.1)" }}>
                        <ShieldCheck className="h-3 w-3 text-emerald-400/80" />
                      </div>
                      <span className="text-xs text-white/40">256-bit SSL Encrypted Payment</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsla(0, 0%, 100%, 0.04)" }}>
                        <Zap className="h-3 w-3 text-white/40" />
                      </div>
                      <span className="text-xs text-white/40">Instant credit delivery after payment</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsla(0, 0%, 100%, 0.04)" }}>
                        <BadgeCheck className="h-3 w-3 text-white/40" />
                      </div>
                      <span className="text-xs text-white/40">30-day money-back guarantee</span>
                    </div>

                    {/* Payment Method Icons */}
                    <div className="flex items-center gap-2 pt-3 mt-1" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.04)" }}>
                      {["VISA", "MC", "AMEX", "GPay", "Apple Pay"].map(card => (
                        <span
                          key={card}
                          className="text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-md"
                          style={{
                            background: "hsla(0, 0%, 100%, 0.04)",
                            color: "hsla(0, 0%, 100%, 0.25)",
                            border: "1px solid hsla(0, 0%, 100%, 0.04)",
                          }}
                        >
                          {card}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile Order Summary */}
          {orderInfo && (
            <div className="lg:hidden border-t overflow-y-auto p-6" style={{ borderColor: "hsla(0, 0%, 100%, 0.06)", background: "hsl(222, 30%, 8%)" }}>
              <h2 className="text-base font-bold text-white/90 mb-4">Order Summary</h2>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/40">Subtotal</span>
                <span className="text-white/60">{formatPrice(orderInfo.originalPriceCents)}</span>
              </div>
              {orderInfo.discountLabel && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-400 font-medium">{orderInfo.discountLabel}</span>
                  <span className="text-emerald-400 font-medium">-{formatPrice(orderInfo.discountAmountCents)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 mt-2" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.06)" }}>
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-white">{formatPrice(orderInfo.finalPriceCents)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verifying — Premium multi-step animation */}
      {state === "verifying" && (
        <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8 max-w-xs"
          >
            {/* Animated icon */}
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-5 rounded-full"
                style={{ background: "conic-gradient(from 0deg, transparent 60%, hsla(145, 80%, 50%, 0.3), transparent)" }}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center w-20 h-20 rounded-3xl"
                style={{
                  background: "linear-gradient(135deg, hsla(145, 80%, 50%, 0.1), hsla(145, 80%, 50%, 0.04))",
                  border: "1px solid hsla(145, 80%, 50%, 0.2)",
                  boxShadow: "0 0 60px -20px hsla(145, 80%, 50%, 0.25)",
                }}
              >
                <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              </motion.div>
            </div>

            {/* Status text */}
            <div className="text-center">
              <motion.h3
                key="verify-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg font-bold text-white mb-1.5"
              >
                Verifying Payment
              </motion.h3>
              <AnimatePresence mode="wait">
                <motion.p
                  key={verifyStatus}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-white/40"
                >
                  {verifyStatus}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(step => (
                <motion.div
                  key={step}
                  className="h-1.5 rounded-full"
                  animate={{
                    width: step <= verifyStep ? 24 : 8,
                    background: step <= verifyStep
                      ? "hsl(145, 80%, 50%)"
                      : step === verifyStep + 1
                        ? "hsla(145, 80%, 50%, 0.2)"
                        : "hsla(0, 0%, 100%, 0.06)",
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              ))}
            </div>

            <p className="text-[10px] text-white/15 tracking-wider uppercase">Step {verifyStep} of 5</p>
          </motion.div>
        </div>
      )}

      {/* Success - redirecting to thank-you page */}
      {state === "success" && (
        <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-white/50 text-sm">Redirecting...</p>
          </motion.div>
        </div>
      )}

      {/* Failed / Canceled */}
      {(state === "failed" || state === "canceled") && (
        <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-7 max-w-sm"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative"
            >
              <div
                className="absolute -inset-8 rounded-full blur-3xl"
                style={{ background: state === "failed" ? "hsla(0, 80%, 50%, 0.06)" : "hsla(45, 95%, 55%, 0.06)" }}
              />
              <div
                className="relative flex items-center justify-center w-24 h-24 rounded-[28px]"
                style={{
                  background: state === "failed"
                    ? "linear-gradient(135deg, hsla(0, 80%, 50%, 0.12), hsla(0, 80%, 50%, 0.04))"
                    : "linear-gradient(135deg, hsla(45, 95%, 55%, 0.12), hsla(45, 95%, 55%, 0.04))",
                  border: `1px solid ${state === "failed" ? "hsla(0, 80%, 50%, 0.2)" : "hsla(45, 95%, 55%, 0.2)"}`,
                }}
              >
                {state === "failed"
                  ? <XCircle className="h-12 w-12 text-red-400" />
                  : <AlertTriangle className="h-12 w-12 text-amber-400" />
                }
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                {state === "failed" ? "Payment Failed" : "Purchase Canceled"}
              </h2>
              <p className="text-white/40 text-sm">
                {state === "failed"
                  ? "Your payment could not be processed. Please try again."
                  : "No charges were made. You can try again anytime."
                }
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3"
            >
              {/* Retry button - retries the exact same transaction */}
              <Button
                onClick={() => window.location.reload()}
                className="px-7 py-5 rounded-xl text-white font-semibold text-sm border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))",
                  boxShadow: "0 4px 16px hsla(262, 83%, 55%, 0.3), inset 0 1px 0 hsla(0, 0%, 100%, 0.15)",
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" /> Retry Transaction
              </Button>
              <Button
                onClick={() => navigate("/pricing")}
                className="px-7 py-5 rounded-xl text-white/50 hover:text-white/70 font-medium text-sm"
                style={{
                  background: "hsla(0, 0%, 100%, 0.04)",
                  border: "1px solid hsla(0, 0%, 100%, 0.06)",
                }}
              >
                Back to Pricing
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

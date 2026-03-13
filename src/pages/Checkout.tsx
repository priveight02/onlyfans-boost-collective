import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ShieldCheck, Loader2, CheckCircle2, XCircle,
  Sparkles, LayoutDashboard, AlertTriangle, Coins, Zap, BadgeCheck,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  const { purchaseCount, refreshWallet } = useWallet();
  const [state, setState] = useState<CheckoutState>("loading");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [verifyStep, setVerifyStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pkgId = searchParams.get("pkg");
  const customCreditsParam = searchParams.get("credits");
  const useRetention = searchParams.get("retention") === "1";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const initCheckout = async () => {
      try {
        setState("loading");
        let body: any = {};
        if (pkgId) {
          body.packageId = pkgId;
        } else if (customCreditsParam) {
          body.customCredits = parseInt(customCreditsParam);
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
            .single();
          if (pkg) {
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
          }
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

  useEffect(() => {
    const handleEvent = (eventName: string) => {
      const lower = eventName.toLowerCase();
      if (lower.includes("success") || lower.includes("confirmed")) {
        setState("verifying");
        verifyWithRetry();
      } else if (lower.includes("fail") || lower.includes("decline") || lower.includes("error")) {
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
  }, []);

  const verifyWithRetry = async () => {
    const delays = [2000, 2500, 3000, 3500, 4000];
    for (let i = 0; i < delays.length; i++) {
      setVerifyStep(i + 1);
      setVerifyStatus(
        i === 0 ? "Connecting to payment provider..." :
        i === 1 ? "Payment received, verifying..." :
        i === 2 ? "Confirming credits allocation..." :
        i === 3 ? "Almost there, finalizing..." :
        "Final confirmation..."
      );
      await new Promise(r => setTimeout(r, delays[i]));
      try {
        const { data } = await supabase.functions.invoke("verify-credit-purchase");
        if (data?.credited && data.credits_added > 0) {
          setCreditsAdded(data.credits_added);
          setState("success");
          refreshWallet();
          return;
        }
      } catch {}
    }
    setCreditsAdded(0);
    setState("success");
    refreshWallet();
  };

  useEffect(() => {
    if (state === "success") {
      const t = setTimeout(() => navigate("/platform"), 4000);
      return () => clearTimeout(t);
    }
  }, [state, navigate]);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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
          <img src="/logo.svg" alt="Uplyze" className="h-7" />
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm text-white/50 font-medium">Secure Checkout</span>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </header>

      {/* Loading */}
      {state === "loading" && (
        <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
            <p className="text-white/40 text-sm">Preparing your checkout...</p>
          </div>
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

          {/* Sidebar Toggle — subtle chevron at middle-left edge of sidebar area */}
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
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden lg:flex flex-shrink-0 overflow-hidden border-l flex-col relative"
                style={{ borderColor: "hsla(0, 0%, 100%, 0.06)", background: "hsl(222, 30%, 8%)" }}
              >
                {/* Collapse button at very middle left of sidebar */}
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

          {/* Mobile Order Summary (always visible on mobile) */}
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

      {/* Verifying */}
      {state === "verifying" && (
        <div className="flex items-center justify-center flex-col gap-6" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent, hsla(145, 80%, 50%, 0.3), transparent, transparent)" }} />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl" style={{ background: "hsla(145, 80%, 50%, 0.08)", border: "1px solid hsla(145, 80%, 50%, 0.15)" }}>
              <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
            </div>
          </motion.div>
          <div className="text-center">
            <p className="text-white/70 text-base font-semibold">Verifying your purchase</p>
            <p className="text-white/30 text-sm mt-1">{verifyStatus}</p>
          </div>
          <div className="w-48">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsla(0, 0%, 100%, 0.06)" }}>
              <motion.div className="h-full rounded-full" style={{ background: "hsl(145, 80%, 50%)" }} initial={{ width: "0%" }} animate={{ width: `${(verifyStep / 5) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="text-[10px] text-white/20 text-center mt-1.5">Step {verifyStep} of 5</p>
          </div>
        </div>
      )}

      {/* Success */}
      {state === "success" && (
        <div className="flex items-center justify-center flex-col gap-6" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="relative">
            <div className="absolute -inset-6 rounded-full blur-2xl" style={{ background: "hsla(145, 80%, 50%, 0.1)" }} />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl" style={{ background: "hsla(145, 80%, 50%, 0.1)", border: "1px solid hsla(145, 80%, 50%, 0.2)" }}>
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Transaction Successful</h2>
            <p className="text-white/40 text-sm">
              {creditsAdded > 0 ? (
                <><span className="text-emerald-400 font-semibold">{creditsAdded.toLocaleString()}</span> credits added to your wallet</>
              ) : (
                <>Your payment was successful! Credits are being processed.</>
              )}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex gap-3">
            <Button onClick={() => navigate("/platform")} className="px-8 py-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
              <LayoutDashboard className="h-4 w-4 mr-2" /> Enter Platform
            </Button>
            <Button onClick={() => navigate("/pricing")} className="px-8 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 border border-white/[0.08]">
              <Sparkles className="h-4 w-4 mr-2" /> Buy More
            </Button>
          </motion.div>
          <p className="text-white/20 text-xs flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Redirecting to platform...
          </p>
        </div>
      )}

      {/* Failed / Canceled */}
      {(state === "failed" || state === "canceled") && (
        <div className="flex items-center justify-center flex-col gap-6" style={{ height: "calc(100vh - 56px)" }}>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="relative">
            <div className="absolute -inset-6 rounded-full blur-2xl" style={{ background: state === "failed" ? "hsla(0, 80%, 50%, 0.05)" : "hsla(45, 95%, 55%, 0.05)" }} />
            <div
              className="relative flex items-center justify-center w-20 h-20 rounded-3xl"
              style={{
                background: state === "failed" ? "hsla(0, 80%, 50%, 0.1)" : "hsla(45, 95%, 55%, 0.1)",
                border: `1px solid ${state === "failed" ? "hsla(0, 80%, 50%, 0.2)" : "hsla(45, 95%, 55%, 0.2)"}`,
              }}
            >
              {state === "failed" ? <XCircle className="h-10 w-10 text-red-400" /> : <AlertTriangle className="h-10 w-10 text-amber-400" />}
            </div>
          </motion.div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {state === "failed" ? "Payment Failed" : "Purchase Canceled"}
            </h2>
            <p className="text-white/40 text-sm">
              {state === "failed" ? "Your payment could not be processed. Please try again." : "No charges were made. You can try again anytime."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/pricing")} className="px-8 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 border border-white/[0.08]">
              Back to Pricing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

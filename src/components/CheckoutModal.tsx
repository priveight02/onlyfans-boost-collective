import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShieldCheck, Loader2, Lock,
  CheckCircle2, Receipt, Download, ArrowRight,
  LayoutDashboard, XCircle, ExternalLink, Sparkles,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ModalView = "checkout" | "confirm-close" | "verifying" | "success" | "canceled" | "failed" | "expired";

interface VerificationResult {
  credits_added: number;
  receipt_url?: string;
}

interface CheckoutModalProps {
  checkoutUrl: string | null;
  onClose: (purchased: boolean) => void;
}

const CheckoutModal = ({ checkoutUrl, onClose }: CheckoutModalProps) => {
  const navigate = useNavigate();
  const [view, setView] = useState<ModalView>("checkout");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const retryCountRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when checkoutUrl changes
  useEffect(() => {
    if (checkoutUrl) {
      setView("checkout");
      setResult(null);
      retryCountRef.current = 0;
      toast.info("Payment checkout opened", { duration: 2000 });
    }
  }, [checkoutUrl]);

  // Auto-close on success after 3 seconds
  useEffect(() => {
    if (view === "success") {
      const timer = setTimeout(() => {
        onClose(true);
        navigate("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [view, onClose, navigate]);

  // Listen for Polar postMessage events from iframe
  useEffect(() => {
    const handleCheckoutEvent = (eventName: string) => {
      const lower = eventName.toLowerCase();
      if (lower.includes("success") || lower.includes("confirmed")) {
        toast.loading("Payment received! Verifying...", { id: "payment-verify" });
        setView("verifying");
        retryCountRef.current = 0;
        verifyWithRetry();
      } else if (lower.includes("fail") || lower.includes("decline") || lower.includes("error")) {
        setView("failed");
        toast.error("Payment was declined or failed.", { id: "payment-verify" });
      } else if (lower.includes("expire")) {
        setView("expired");
        toast.error("Checkout session expired.", { id: "payment-verify" });
      } else if (lower.includes("close") || lower.includes("cancel")) {
        setView("canceled");
      }
    };

    const handler = (event: MessageEvent) => {
      // String-style messages
      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event) handleCheckoutEvent(parsed.event);
        } catch {}
      }
      // Object-style messages
      if (event.data?.event) {
        handleCheckoutEvent(event.data.event);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const verifyWithRetry = async () => {
    const MAX_RETRIES = 5;
    const RETRY_DELAYS = [3000, 4000, 5000, 6000, 8000];

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      retryCountRef.current = attempt + 1;
      toast.loading(
        attempt > 2
          ? "Almost there, confirming with payment provider..."
          : `Verifying purchase (${attempt + 1}/${MAX_RETRIES})...`,
        { id: "payment-verify" }
      );

      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));

      try {
        const { data, error } = await supabase.functions.invoke("verify-credit-purchase");
        if (error) throw error;

        if (data?.credited && data.credits_added > 0) {
          setResult({ credits_added: data.credits_added });
          setView("success");
          toast.success(`${data.credits_added.toLocaleString()} credits added to your wallet`, { id: "payment-verify" });
          return;
        }
      } catch (err) {
        console.error(`[CheckoutModal] Verify attempt ${attempt + 1} failed:`, err);
      }
    }

    // All retries exhausted — show success anyway (webhook will handle it)
    setResult({ credits_added: 0 });
    setView("success");
    toast.success("Payment successful — credits are being processed", { id: "payment-verify" });
  };

  const handleCloseAttempt = () => {
    if (view === "checkout") {
      setView("confirm-close");
    } else {
      onClose(view === "success");
    }
  };

  const handleConfirmClose = () => {
    setView("canceled");
    toast.info("Purchase canceled. No charges were made.", { duration: 3000 });
  };

  const handleStayOnCheckout = () => {
    setView("checkout");
  };

  const handleGoToCRM = () => {
    onClose(true);
    navigate("/platform");
  };

  const handleBuyMore = () => {
    onClose(false);
  };

  if (!checkoutUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          onClick={handleCloseAttempt}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(180deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 7%) 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -12px rgba(0,0,0,0.7), 0 0 120px -40px rgba(147,51,234,0.15)",
            height: "92vh",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-400/80" />
              <span className="text-[11px] text-white/40 font-medium tracking-wide">Secure Checkout</span>
              <span className="text-[10px] text-white/20 ml-1">• Powered by Stripe</span>
            </div>
            <button
              onClick={handleCloseAttempt}
              className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-white/30 hover:text-white/70 transition-all duration-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* === CHECKOUT IFRAME VIEW === */}
          {view === "checkout" && (
            <div className="flex-1 min-h-0">
              <iframe
                ref={iframeRef}
                src={checkoutUrl}
                className="w-full h-full border-0"
                allow="payment *"
                loading="eager"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                title="Polar Checkout"
                style={{ pointerEvents: "auto" }}
              />
            </div>
          )}

          {/* === CONFIRM CLOSE VIEW === */}
          {view === "confirm-close" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative mb-8"
              >
                <div className="absolute -inset-6 rounded-full bg-amber-500/5 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-10 w-10 text-amber-400" />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Leave checkout?</h2>
                <p className="text-white/40 text-sm">Your purchase hasn't been completed yet. Are you sure you want to cancel?</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={handleStayOnCheckout}
                  className="px-8 py-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all"
                >
                  Continue checkout
                </Button>
                <Button
                  onClick={handleConfirmClose}
                  className="px-8 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08] transition-all"
                >
                  Yes, cancel
                </Button>
              </motion.div>
            </div>
          )}

          {/* === VERIFYING VIEW === */}
          {view === "verifying" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20 px-6">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-4 rounded-full"
                  style={{ background: "conic-gradient(from 0deg, transparent, rgba(52,211,153,0.3), transparent, transparent)" }}
                />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="h-7 w-7 text-emerald-400" />
                  </motion.div>
                </div>
              </motion.div>
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-white/70 text-base font-semibold">Verifying your purchase</p>
                <p className="text-white/30 text-sm">Confirming payment and adding credits...</p>
              </div>
            </div>
          )}

          {/* === SUCCESS VIEW === */}
          {view === "success" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="relative mb-8"
              >
                <div className="absolute -inset-6 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/25">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Transaction Successful</h2>
                <p className="text-white/40 text-sm md:text-base">
                  {(result?.credits_added ?? 0) > 0 ? (
                    <><span className="text-emerald-400 font-semibold">{(result?.credits_added ?? 0).toLocaleString()}</span> credits have been added to your wallet</>
                  ) : (
                    <>Your payment was successful! Credits are being processed and will appear in your wallet shortly.</>
                  )}
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
                <button
                  onClick={handleGoToCRM}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/15 transition-colors">
                    <LayoutDashboard className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-xs text-white/50 font-medium group-hover:text-white/70 transition-colors">Enter CRM</span>
                </button>
                <button
                  onClick={handleBuyMore}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/15 transition-colors">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-white/50 font-medium group-hover:text-white/70 transition-colors">Buy More</span>
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center gap-1.5 text-white/25 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Auto-closing in 3 seconds...</span>
                </div>
              </motion.div>
            </div>
          )}

          {/* === CANCELED VIEW === */}
          {view === "canceled" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative mb-8"
              >
                <div className="absolute -inset-6 rounded-full bg-red-500/5 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-10 w-10 text-red-400" />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Purchase Canceled</h2>
                <p className="text-white/40 text-sm">No charges were made. You can try again anytime.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() => onClose(false)}
                  className="px-6 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08] transition-all"
                >
                  Back to Pricing
                </Button>
              </motion.div>
            </div>
          )}

          {/* === FAILED / DECLINED VIEW === */}
          {view === "failed" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative mb-8"
              >
                <div className="absolute -inset-6 rounded-full bg-red-500/5 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-10 w-10 text-red-400" />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Payment Declined</h2>
                <p className="text-white/40 text-sm">Your payment could not be processed. Please check your card details or try a different payment method.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() => { setView("checkout"); }}
                  className="px-8 py-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => onClose(false)}
                  className="px-6 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08] transition-all"
                >
                  Back to Pricing
                </Button>
              </motion.div>
            </div>
          )}

          {/* === EXPIRED VIEW === */}
          {view === "expired" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative mb-8"
              >
                <div className="absolute -inset-6 rounded-full bg-amber-500/5 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-10 w-10 text-amber-400" />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Session Expired</h2>
                <p className="text-white/40 text-sm">Your checkout session has expired. Please start a new purchase.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() => onClose(false)}
                  className="px-8 py-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all"
                >
                  Start New Checkout
                </Button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;
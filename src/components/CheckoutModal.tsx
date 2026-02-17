import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShieldCheck, Loader2, Lock,
  CheckCircle2, Receipt, Download, ArrowRight,
  LayoutDashboard, XCircle, ExternalLink, Sparkles,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe("pk_live_51T1RhzAMkMnyWeZ53N82vzj5W7YrNus0CLub4bD6FnZKVJ2xbF6GleYx80p4hvuJH3UFdFGPpq8dzXTq5iBpRFFO00V0PWhzsL");

type ModalView = "checkout" | "verifying" | "success" | "canceled";

interface VerificationResult {
  credits_added: number;
  receipt_url?: string;
}

interface CheckoutModalProps {
  clientSecret: string | null;
  onClose: (purchased: boolean) => void;
}

const CheckoutModal = ({ clientSecret, onClose }: CheckoutModalProps) => {
  const navigate = useNavigate();
  const [stripeReady, setStripeReady] = useState(false);
  const [view, setView] = useState<ModalView>("checkout");
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Reset state when a new clientSecret arrives
  useEffect(() => {
    if (clientSecret) {
      setView("checkout");
      setStripeReady(false);
      setResult(null);
    }
  }, [clientSecret]);

  const handleComplete = useCallback(async () => {
    setView("verifying");
    try {
      const { data, error } = await supabase.functions.invoke("verify-credit-purchase");
      if (error) throw error;
      if (data?.credited && data.credits_added > 0) {
        setResult({
          credits_added: data.credits_added,
          receipt_url: data.receipt_url || null,
        });
        setView("success");
      } else {
        // Payment may not have completed — treat as no purchase
        setResult({ credits_added: 0 });
        setView("success");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setResult({ credits_added: 0 });
      setView("success");
    }
  }, []);

  const handleCloseModal = () => {
    if (view === "checkout") {
      // Closed without completing — canceled
      setView("canceled");
      return;
    }
    onClose(view === "success" && (result?.credits_added ?? 0) > 0);
  };

  const handleDismissCanceled = () => {
    onClose(false);
  };

  const handleGoToCRM = () => {
    onClose(true);
    navigate("/admin");
  };

  const handleBuyMore = () => {
    onClose(false);
  };

  if (!clientSecret) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          onClick={handleCloseModal}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[1400px] h-[96vh] rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(180deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 7%) 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -12px rgba(0,0,0,0.7), 0 0 120px -40px rgba(147,51,234,0.15)",
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          {/* Header — only show during checkout */}
          {(view === "checkout" || view === "verifying") && (
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Lock className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-white/70">Secure Checkout</span>
              </div>
              <span className="text-[10px] text-white/25 tracking-widest uppercase hidden md:block">Your payment information is secured and encrypted</span>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  <ShieldCheck className="h-3 w-3 text-white/30" />
                  <span className="text-[10px] text-white/30 font-medium tracking-wide">STRIPE</span>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all duration-200 text-white/40 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* === CHECKOUT VIEW === */}
          {view === "checkout" && (
            <>
              {/* Loading overlay */}
              <AnimatePresence>
                {!stripeReady && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
                    style={{
                      top: "57px",
                      background: "linear-gradient(180deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 7%) 100%)",
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                      className="relative"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-3 rounded-full"
                        style={{ background: "conic-gradient(from 0deg, transparent, rgba(147,51,234,0.3), transparent, transparent)" }}
                      />
                      <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                          <Loader2 className="h-6 w-6 text-purple-400" />
                        </motion.div>
                      </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1.5">
                      <p className="text-white/50 text-sm font-medium">Preparing your checkout</p>
                      <p className="text-white/25 text-xs">This will only take a moment</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className="flex-1 min-h-0 overflow-auto bg-white rounded-b-3xl"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.1) transparent" }}
                ref={(el) => {
                  if (el) {
                    const observer = new MutationObserver(() => {
                      if (el.querySelector("iframe")) {
                        setStripeReady(true);
                        observer.disconnect();
                      }
                    });
                    observer.observe(el, { childList: true, subtree: true });
                  }
                }}
              >
                <div
                  className="[&>div]:min-h-full [&>div>div]:min-h-full [&_iframe]:!min-h-full"
                  style={{ transform: "scale(0.92)", transformOrigin: "top center", width: "108.7%", marginLeft: "-4.35%" }}
                >
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      onComplete: handleComplete,
                    }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              </div>
            </>
          )}

          {/* === VERIFYING VIEW === */}
          {view === "verifying" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
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
          {view === "success" && (result?.credits_added ?? 0) > 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="relative mb-8"
              >
                {/* Glow behind icon */}
                <div className="absolute -inset-6 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/25">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Transaction Successful</h2>
                <p className="text-white/40 text-sm md:text-base">
                  <span className="text-emerald-400 font-semibold">{(result?.credits_added ?? 0).toLocaleString()}</span> credits have been added to your wallet
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl mb-8"
              >
                {/* View Receipt */}
                {result?.receipt_url && (
                  <a
                    href={result.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/15 transition-colors">
                      <Receipt className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-xs text-white/50 font-medium group-hover:text-white/70 transition-colors">View Receipt</span>
                    <ExternalLink className="h-3 w-3 text-white/20" />
                  </a>
                )}

                {/* Download Receipt */}
                {result?.receipt_url && (
                  <a
                    href={result.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/15 transition-colors">
                      <Download className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="text-xs text-white/50 font-medium group-hover:text-white/70 transition-colors">Download PDF</span>
                  </a>
                )}

                {/* Enter CRM */}
                <button
                  onClick={handleGoToCRM}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/15 transition-colors">
                    <LayoutDashboard className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-xs text-white/50 font-medium group-hover:text-white/70 transition-colors">Enter CRM</span>
                </button>

                {/* Buy More */}
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

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={() => onClose(true)}
                  className="px-8 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08] transition-all"
                >
                  <span className="flex items-center gap-2">Close <X className="h-3.5 w-3.5" /></span>
                </Button>
              </motion.div>
            </div>
          )}

          {/* === CANCELED VIEW === */}
          {(view === "canceled" || (view === "success" && (result?.credits_added ?? 0) === 0)) && (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
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

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Purchase Canceled</h2>
                <p className="text-white/40 text-sm">No charges were made. You can try again anytime.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-3"
              >
                <Button
                  onClick={() => setView("checkout")}
                  className="px-6 py-5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-purple-200 border border-purple-500/25 hover:border-purple-500/40 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    It was a mistake? Go back to checkout
                  </span>
                </Button>
                <Button
                  onClick={handleDismissCanceled}
                  className="px-6 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08] transition-all"
                >
                  Back to Pricing
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

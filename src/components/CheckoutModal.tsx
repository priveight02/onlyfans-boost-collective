import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShieldCheck, Loader2, Lock,
  CheckCircle2, Receipt, Download, ArrowRight,
  LayoutDashboard, XCircle, ExternalLink, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
      Setup: (config: { eventHandler: (event: any) => void }) => void;
    };
  }
}

type ModalView = "idle" | "verifying" | "success" | "canceled";

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
  const [view, setView] = useState<ModalView>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const successRef = useRef(false);

  // Initialize lemon.js and set up event handler
  useEffect(() => {
    window.createLemonSqueezy?.();

    window.LemonSqueezy?.Setup({
      eventHandler: (event: any) => {
        if (event.event === "Checkout.Success") {
          successRef.current = true;
          setView("verifying");
          verifyPurchase();
        }
      },
    });
  }, []);

  useEffect(() => {
    if (!checkoutUrl) return;

    setView("idle");
    setResult(null);
    successRef.current = false;

    // Re-initialize in case component re-rendered
    window.createLemonSqueezy?.();

    // Small delay to ensure lemon.js is ready
    const timer = setTimeout(() => {
      try {
        window.LemonSqueezy?.Url.Open(checkoutUrl);
      } catch (err) {
        console.error("Failed to open Lemon Squeezy checkout:", err);
        // Fallback: open in new tab
        window.open(checkoutUrl, "_blank");
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [checkoutUrl]);

  const verifyPurchase = async () => {
    try {
      // Small delay for order to propagate
      await new Promise((r) => setTimeout(r, 2000));
      const { data, error } = await supabase.functions.invoke("verify-credit-purchase");
      if (error) throw error;
      if (data?.credited && data.credits_added > 0) {
        setResult({ credits_added: data.credits_added });
      } else {
        setResult({ credits_added: 0 });
      }
      setView("success");
    } catch (err) {
      console.error("Verification error:", err);
      setResult({ credits_added: 0 });
      setView("success");
    }
  };

  const handleGoToCRM = () => {
    onClose(true);
    navigate("/platform");
  };

  const handleBuyMore = () => {
    onClose(false);
  };

  // Don't render during checkout — Lemon Squeezy handles its own overlay
  if (view === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-1 md:p-2"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(180deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 7%) 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -12px rgba(0,0,0,0.7), 0 0 120px -40px rgba(147,51,234,0.15)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

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
          {view === "success" && (result?.credits_added ?? 0) > 0 && (
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
                  <span className="text-emerald-400 font-semibold">{(result?.credits_added ?? 0).toLocaleString()}</span> credits have been added to your wallet
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

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <Button
                  onClick={() => onClose(true)}
                  className="px-8 py-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08] transition-all"
                >
                  <span className="flex items-center gap-2">Close <X className="h-3.5 w-3.5" /></span>
                </Button>
              </motion.div>
            </div>
          )}

          {/* === CANCELED / NO CREDITS VIEW === */}
          {(view === "canceled" || (view === "success" && (result?.credits_added ?? 0) === 0)) && (
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;

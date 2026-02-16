import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Loader2, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_live_51T1RhzAMkMnyWeZ53N82vzj5W7YrNus0CLub4bD6FnZKVJ2xbF6GleYx80p4hvuJH3UFdFGPpq8dzXTq5iBpRFFO00V0PWhzsL");

interface CheckoutModalProps {
  clientSecret: string | null;
  onClose: () => void;
}

const CheckoutModal = ({ clientSecret, onClose }: CheckoutModalProps) => {
  const [stripeReady, setStripeReady] = useState(false);

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
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[1200px] h-[90vh] rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(180deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 7%) 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -12px rgba(0,0,0,0.7), 0 0 120px -40px rgba(147,51,234,0.15)",
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Lock className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white/70">Secure Checkout</span>
                <span className="text-[10px] text-white/30 tracking-wide">256-BIT SSL ENCRYPTED</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                <ShieldCheck className="h-3 w-3 text-white/30" />
                <span className="text-[10px] text-white/30 font-medium tracking-wide">POWERED BY STRIPE</span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all duration-200 text-white/40 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Loading overlay */}
          <AnimatePresence>
            {!stripeReady && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
                style={{
                  top: "61px",
                  background: "linear-gradient(180deg, hsl(222, 35%, 10%) 0%, hsl(222, 35%, 7%) 100%)",
                }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="relative"
                >
                  {/* Glow ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-3 rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, transparent, rgba(147,51,234,0.3), transparent, transparent)",
                    }}
                  />
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-6 w-6 text-purple-400" />
                    </motion.div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <p className="text-white/50 text-sm font-medium">Preparing your checkout</p>
                  <p className="text-white/25 text-xs">This will only take a moment</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Checkout area — scrollable */}
          <div
            className="flex-1 overflow-y-auto min-h-0"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
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
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-center px-6 py-3 border-t border-white/[0.04] flex-shrink-0 bg-white/[0.02]">
            <span className="text-[10px] text-white/20 tracking-wide">YOUR PAYMENT INFORMATION IS SECURED AND ENCRYPTED</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;

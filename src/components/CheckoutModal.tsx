import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Loader2 } from "lucide-react";
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
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Fullscreen horizontal modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-[96vw] h-[92vh] max-w-[1400px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10 flex flex-col"
          style={{ background: "hsl(222, 35%, 8%)" }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-white/[0.03] flex-shrink-0">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span>Secure checkout · Powered by Stripe</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Loading animation */}
          <AnimatePresence>
            {!stripeReady && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[hsl(222,35%,8%)]"
                style={{ top: "49px" }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-8 w-8 text-purple-400" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/40 text-sm font-medium"
                >
                  Loading secure checkout...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stripe Embedded Checkout — full area, no scroll */}
          <div className="flex-1 min-h-0 [&_iframe]:!h-full [&_iframe]:!min-h-full [&_.EmbeddedCheckout]:!h-full">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: () => setStripeReady(true),
              }}
            >
              <div className="h-full" ref={(el) => {
                if (el) {
                  // Mark ready once the iframe appears
                  const observer = new MutationObserver(() => {
                    if (el.querySelector('iframe')) {
                      setStripeReady(true);
                      observer.disconnect();
                    }
                  });
                  observer.observe(el, { childList: true, subtree: true });
                }
              }}>
                <EmbeddedCheckout className="h-full" />
              </div>
            </EmbeddedCheckoutProvider>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;

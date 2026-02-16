import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck } from "lucide-react";
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
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl h-[85vh] mx-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10 flex flex-col"
          style={{ background: "hsl(222, 35%, 8%)" }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span>Secure checkout</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stripe Embedded Checkout */}
          <div className="flex-1 overflow-auto">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;

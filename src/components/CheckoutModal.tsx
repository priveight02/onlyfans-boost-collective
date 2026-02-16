import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ShieldCheck } from "lucide-react";

interface CheckoutModalProps {
  url: string | null;
  onClose: () => void;
}

const CheckoutModal = ({ url, onClose }: CheckoutModalProps) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (url) {
      setLoading(true);
      // Lock body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [url]);

  if (!url) return null;

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
          className="relative w-full max-w-2xl h-[85vh] mx-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10"
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

          {/* Loading overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 top-[49px] z-10 flex flex-col items-center justify-center gap-4"
                style={{ background: "hsl(222, 35%, 8%)" }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-8 w-8 text-purple-400" />
                </motion.div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-white/70 text-sm font-medium">Preparing secure checkout</p>
                  <p className="text-white/30 text-xs">Powered by Stripe</p>
                </div>
                {/* Animated dots */}
                <div className="flex gap-1.5 mt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-purple-400/60"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Iframe */}
          <iframe
            src={url}
            className="w-full h-[calc(100%-49px)] border-0"
            onLoad={() => setLoading(false)}
            allow="payment"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;

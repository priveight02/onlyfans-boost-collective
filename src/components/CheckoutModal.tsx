import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import loadingLogo from "@/assets/ozc-loading-logo.jpg";

interface CheckoutModalProps {
  url: string | null;
  onClose: () => void;
}

const CheckoutModal = ({ url, onClose }: CheckoutModalProps) => {
  useEffect(() => {
    if (url) {
      // Show loading screen briefly, then redirect in same tab
      const timer = setTimeout(() => {
        window.location.href = url;
      }, 1800);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    }
  }, [url]);

  if (!url) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ background: "hsl(222, 35%, 8%)" }}
      >
        {/* Pulsating logo */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-8"
        >
          <img
            src={loadingLogo}
            alt="OZC Agency"
            className="w-28 h-28 rounded-full object-cover shadow-2xl shadow-blue-500/20"
          />
        </motion.div>

        {/* Loading text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-white/60 text-sm font-medium tracking-wide mb-4"
        >
          Preparing secure checkout
        </motion.p>

        {/* Animated dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-purple-400/70"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Subtle glow ring behind logo */}
        <motion.div
          className="absolute w-40 h-40 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(210 100% 50% / 0.08) 0%, transparent 70%)",
            top: "calc(50% - 120px)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutModal;

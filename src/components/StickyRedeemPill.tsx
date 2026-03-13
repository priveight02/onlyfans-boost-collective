import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";

const StickyRedeemPill = () => {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();

  // Don't show if user just came back from checkout (has success/canceled params)
  const searchParams = new URLSearchParams(location.search);
  const fromCheckout = searchParams.has("success") || searchParams.has("canceled");

  useEffect(() => {
    if (fromCheckout) return;
    const handleScroll = () => {
      setVisible(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fromCheckout]);

  if (fromCheckout) return null;

  return (
    <>
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setShowModal(true)}
          className="group relative flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.98] overflow-hidden whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(217, 91%, 50%))",
            color: "white",
            boxShadow:
              "0 6px 24px hsla(262, 83%, 55%, 0.4), 0 2px 8px hsla(0, 0%, 0%, 0.3), inset 0 1px 0 hsla(0, 0%, 100%, 0.25), inset 0 -2px 0 hsla(0, 0%, 0%, 0.15)",
          }}
        >
          {/* Shine sweep */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(105deg, transparent 40%, hsla(0, 0%, 100%, 0.15) 45%, hsla(0, 0%, 100%, 0.05) 55%, transparent 60%)",
            }}
          />
          <Sparkles className="h-4 w-4 relative z-10" style={{ color: "hsl(45, 95%, 65%)" }} />
          <span className="relative z-10 tracking-wide text-[13px]">Claim 40% Welcome Gift</span>
        </button>
      </div>

      <InsufficientCreditsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        actionName="Add Credits"
      />
    </>
  );
};

export default StickyRedeemPill;

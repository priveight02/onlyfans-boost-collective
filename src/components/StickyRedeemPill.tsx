import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";

const StickyRedeemPill = () => {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setShowModal(true)}
          className="group relative flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.98] overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(262, 83%, 55%), hsl(240, 75%, 50%))",
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
          <Sparkles className="h-4 w-4 text-yellow-300 relative z-10" />
          <span className="relative z-10 tracking-wide">Claim Your 40% Welcome Gift</span>
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

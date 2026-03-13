import { useState, useEffect } from "react";
import { Gift } from "lucide-react";
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
          className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-semibold shadow-2xl transition-all duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, hsl(222, 35%, 12%), hsl(222, 35%, 16%))",
            border: "1px solid hsla(0, 0%, 100%, 0.12)",
            color: "white",
            boxShadow: "0 8px 32px hsla(0, 0%, 0%, 0.5), 0 0 0 1px hsla(0, 0%, 100%, 0.04) inset",
          }}
        >
          <Gift className="h-4 w-4 text-yellow-400" />
          Redeem 40% OFF
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

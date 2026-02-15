import { Coins, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";

const CreditsDisplay = () => {
  const { balance, loading } = useWallet();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <button
      onClick={() => navigate("/pricing")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 transition-all duration-200 group"
      title="Buy Credits"
    >
      <Coins className="h-4 w-4 text-amber-400" />
      <span className="text-sm font-bold text-amber-300">
        {loading ? "..." : balance.toLocaleString()}
      </span>
      <Plus className="h-3 w-3 text-amber-400/70 group-hover:text-amber-300 transition-colors" />
    </button>
  );
};

export default CreditsDisplay;

import { Coins } from "lucide-react";

interface CreditCostBannerProps {
  label: string;
  cost: number | string;
  note?: string;
}

const CreditCostBanner = ({ label, cost, note }: CreditCostBannerProps) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
        <Coins className="h-3 w-3" />
        <span>{label}:</span>
        <span className="font-bold text-amber-200">
          {typeof cost === "number" ? `${cost} credit${cost !== 1 ? "s" : ""}` : cost}
        </span>
        {note && <span className="text-amber-300/60 ml-1">· {note}</span>}
      </div>
    </div>
  );
};

export default CreditCostBanner;

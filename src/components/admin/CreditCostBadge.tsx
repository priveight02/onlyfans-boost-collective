import { Coins } from "lucide-react";

interface CreditCostBadgeProps {
  cost: number | string;
  label?: string;
  variant?: "inline" | "header";
}

/**
 * Credit cost indicator.
 * - "inline" (default): tiny badge next to action buttons
 * - "header": prominent label for section headers (top-right)
 */
const CreditCostBadge = ({ cost, label, variant = "inline" }: CreditCostBadgeProps) => {
  if (cost === 0 && variant === "inline") return null;
  if (cost === 0 && variant === "header") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-semibold border border-emerald-500/20 whitespace-nowrap">
        <Coins className="h-3.5 w-3.5" />
        Free{label && <span className="text-emerald-300/60 font-normal">· {label}</span>}
      </span>
    );
  }

  if (variant === "header") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20 whitespace-nowrap">
        <Coins className="h-3.5 w-3.5" />
        Cost: {cost} credits
        {label && <span className="text-amber-300/60 font-normal">· {label}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400/80 border border-amber-500/15 whitespace-nowrap">
      <Coins className="h-2.5 w-2.5" />
      {cost} cr{label ? ` · ${label}` : ""}
    </span>
  );
};

export default CreditCostBadge;

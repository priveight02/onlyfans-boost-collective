import { Coins } from "lucide-react";

interface CreditCostBadgeProps {
  cost: number;
  label?: string;
}

/**
 * Tiny inline badge showing credit cost next to any action button or feature header.
 * Use next to every write action in the CRM.
 */
const CreditCostBadge = ({ cost, label }: CreditCostBadgeProps) => {
  if (cost === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400/80 border border-amber-500/15 whitespace-nowrap">
      <Coins className="h-2.5 w-2.5" />
      {cost} cr{label ? ` · ${label}` : ""}
    </span>
  );
};

export default CreditCostBadge;

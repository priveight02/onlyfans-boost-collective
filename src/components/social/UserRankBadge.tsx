import { useUserRank, getRankInfo } from '@/hooks/useSocial';

interface Props {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function UserRankBadge({ userId, size = 'sm', showLabel = false }: Props) {
  const { rank } = useUserRank(userId);
  if (!rank) return null;

  const info = getRankInfo(rank.rank_tier);
  const sizeClass = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClass}`}
      style={{ color: info.color }}
      title={`${info.label} Rank`}
    >
      <span>{info.icon}</span>
      {showLabel && <span className="font-semibold">{info.label}</span>}
    </span>
  );
}

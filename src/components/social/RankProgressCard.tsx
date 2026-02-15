import { useUserRank, getRankInfo, getNextRank, getRankProgress, RANK_TIERS } from '@/hooks/useSocial';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Zap, Trophy, Coins, Flame } from 'lucide-react';

interface Props {
  userId: string;
}

export default function RankProgressCard({ userId }: Props) {
  const { rank, loading, claimDailyLogin } = useUserRank(userId);

  if (loading || !rank) return null;

  const current = getRankInfo(rank.rank_tier);
  const next = getNextRank(rank.rank_tier);
  const progress = getRankProgress(rank.xp, rank.rank_tier);
  const today = new Date().toISOString().split('T')[0];
  const canClaimDaily = rank.last_daily_login !== today;

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{current.icon}</span>
          <div>
            <h3 className="font-bold text-foreground text-lg">{current.label} Rank</h3>
            <p className="text-muted-foreground text-sm">{rank.xp} XP total</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-500">
            <Coins className="h-4 w-4" />
            <span className="font-bold">{rank.points_balance}</span>
          </div>
          <span className="text-xs text-muted-foreground">Points</span>
        </div>
      </div>

      {/* Progress bar */}
      {next && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{current.icon} {current.label}</span>
            <span>{next.icon} {next.label}</span>
          </div>
          <Progress value={progress} className="h-3 bg-muted/50" />
          <p className="text-xs text-muted-foreground text-center">
            {next.minXp - rank.xp} XP to {next.label}
          </p>
        </div>
      )}
      {!next && (
        <div className="text-center py-2">
          <span className="text-lg font-bold text-foreground">🏆 Maximum Rank Achieved!</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
          <div className="font-bold text-foreground">{rank.daily_login_streak}</div>
          <div className="text-xs text-muted-foreground">Day Streak</div>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="font-bold text-foreground">{rank.xp}</div>
          <div className="text-xs text-muted-foreground">Total XP</div>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <div className="font-bold text-foreground">{rank.points_balance}</div>
          <div className="text-xs text-muted-foreground">Points</div>
        </div>
      </div>

      {/* Daily login claim */}
      {canClaimDaily && (
        <Button onClick={claimDailyLogin} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <Zap className="h-4 w-4 mr-2" /> Claim Daily Login (+10 XP)
        </Button>
      )}

      {/* All tiers */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Ranks</h4>
        <div className="flex gap-2 flex-wrap">
          {RANK_TIERS.map(tier => {
            const isActive = tier.name === rank.rank_tier;
            const isReached = rank.xp >= tier.minXp;
            return (
              <div
                key={tier.name}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                  isActive ? 'border-primary bg-primary/10 font-bold' : isReached ? 'border-border/50 bg-muted/30' : 'border-border/20 opacity-40'
                }`}
                style={{ color: isReached ? tier.color : undefined }}
              >
                <span>{tier.icon}</span>
                <span>{tier.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

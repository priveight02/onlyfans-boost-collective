import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { EngagementMetrics } from "./types";

const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/50">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{
          width: `${value}%`,
          background: value >= 70 ? "linear-gradient(90deg, #34d399, #22d3ee)" : value >= 40 ? "linear-gradient(90deg, #f59e0b, #fb923c)" : "linear-gradient(90deg, #ef4444, #f97316)",
        }}
      />
    </div>
  </div>
);

export default function PerformanceScores({ metrics }: { metrics: EngagementMetrics }) {
  const overall = Math.round(
    (metrics.engagementScore * 0.25 + metrics.monetizationScore * 0.25 + metrics.audienceScore * 0.2 + metrics.contentDiversityScore * 0.15 + metrics.contentFrequency * 0.15)
  );

  return (
    <Card className="bg-white/[0.04] border-white/[0.08]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Performance Scores</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">Overall</span>
            <span className={`text-2xl font-bold ${overall >= 70 ? "text-emerald-400" : overall >= 40 ? "text-amber-400" : "text-red-400"}`}>{overall}</span>
          </div>
        </div>

        <div className="space-y-4">
          <ScoreBar label="Engagement" value={metrics.engagementScore} color="text-cyan-400" />
          <ScoreBar label="Monetization" value={metrics.monetizationScore} color="text-emerald-400" />
          <ScoreBar label="Audience Reach" value={metrics.audienceScore} color="text-blue-400" />
          <ScoreBar label="Content Diversity" value={metrics.contentDiversityScore} color="text-violet-400" />
          <ScoreBar label="Posting Frequency" value={metrics.contentFrequency} color="text-amber-400" />
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/[0.05]">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{metrics.avgPostsPerMonth}</p>
            <p className="text-[10px] text-white/30">Posts/Month</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{metrics.avgMediaPerPost}</p>
            <p className="text-[10px] text-white/30">Media/Post</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{metrics.photoVideoRatio}%</p>
            <p className="text-[10px] text-white/30">Photo Ratio</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

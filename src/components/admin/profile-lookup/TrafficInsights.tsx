import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video, Image, TrendingUp, Activity, AlertTriangle, Heart, Users,
  DollarSign, Crown, Tag, Radio, Award, CheckCircle,
} from "lucide-react";
import type { TrafficInsight } from "./types";

const iconMap: Record<string, any> = {
  video: Video, image: Image, "trending-up": TrendingUp, activity: Activity,
  "alert-triangle": AlertTriangle, heart: Heart, users: Users,
  "dollar-sign": DollarSign, crown: Crown, tag: Tag, radio: Radio,
  award: Award, "check-circle": CheckCircle,
};

const strengthColors = {
  high: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-400" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-400" },
  low: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", badge: "bg-red-500/20 text-red-400" },
};

export default function TrafficInsights({ insights }: { insights: TrafficInsight[] }) {
  return (
    <Card className="bg-white/[0.04] border-white/[0.08]">
      <CardContent className="p-5">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Traffic & Growth Insights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((insight, i) => {
            const Icon = iconMap[insight.icon] || TrendingUp;
            const colors = strengthColors[insight.strength];
            return (
              <div key={i} className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 ${colors.text} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white">{insight.label}</span>
                      <Badge className={`${colors.badge} border-0 text-[9px] px-1.5`}>
                        {insight.strength}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

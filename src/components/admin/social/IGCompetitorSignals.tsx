import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, TrendingUp, Eye, Lightbulb, BarChart3 } from "lucide-react";

interface Props { selectedAccount: string; }

const COMPETITORS = [
  { name: "@competitor_a", posts: "12/week", viral: 3, growth: "+8.2%", topContent: "Behind-the-scenes reels", opportunity: "They don't post carousels — dominate that format" },
  { name: "@competitor_b", posts: "8/week", viral: 1, growth: "+3.1%", topContent: "Tutorial threads", opportunity: "Their engagement drops on weekends — post then" },
  { name: "@competitor_c", posts: "15/week", viral: 5, growth: "+12.4%", topContent: "Controversial takes", opportunity: "High volume but low DM game — outperform on conversions" },
];

const IGCompetitorSignals = ({ selectedAccount }: Props) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-semibold text-foreground">Competitor Signal Monitoring</span>
          <Badge variant="outline" className="text-[9px] border-violet-500/30 text-violet-400">Intel</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10">+ Track Competitor</Button>
      </div>

      <div className="space-y-2">
        {COMPETITORS.map(c => (
          <Card key={c.name} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground">{c.name}</span>
              <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">{c.growth}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center">
                <p className="text-[10px] font-bold text-foreground">{c.posts}</p>
                <p className="text-[8px] text-muted-foreground">Frequency</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-foreground">{c.viral}</p>
                <p className="text-[8px] text-muted-foreground">Viral Posts</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-foreground">{c.topContent}</p>
                <p className="text-[8px] text-muted-foreground">Top Format</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 bg-primary/5 border border-primary/10 rounded-lg p-2">
              <Lightbulb className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-[9px] text-primary">{c.opportunity}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGCompetitorSignals;

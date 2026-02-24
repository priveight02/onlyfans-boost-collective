import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bot, TrendingUp, BarChart3, MessageSquare, Calendar, AlertCircle } from "lucide-react";

interface Props { selectedAccount: string; }

const RECOMMENDATIONS = [
  { category: "Posting", text: "Increase posting frequency from 3/week to 5/week — competitors average 6.2/week", priority: "high", impact: "+18% reach" },
  { category: "DM Volume", text: "Your DM response time is 4.2hrs — reduce to <1hr to increase conversion by 23%", priority: "high", impact: "+23% conversion" },
  { category: "Funnel", text: "Add a free resource CTA in bio — 67% of your traffic bounces without capture", priority: "medium", impact: "+34% leads" },
  { category: "Content", text: "Carousels outperform reels for your niche by 2.1x — shift content mix", priority: "medium", impact: "+2.1x engagement" },
];

const IGGrowthCopilot = ({ selectedAccount }: Props) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Growth Copilot</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Strategy AI</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10">Run Audit</Button>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20 p-3 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-foreground">Growth Stall Detected</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Your follower growth dropped 34% this week. Main cause: reduced posting frequency and lower engagement rate on recent reels. See recommendations below.</p>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Health Score", value: "72/100", color: "text-amber-400" },
          { label: "Growth Rate", value: "+2.1%", color: "text-emerald-400" },
          { label: "Engagement", value: "4.8%", color: "text-primary" },
          { label: "DM Conv.", value: "12%", color: "text-cyan-400" },
        ].map(m => (
          <Card key={m.label} className="bg-white/[0.03] border-white/[0.06] p-2.5 rounded-xl text-center">
            <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[8px] text-muted-foreground">{m.label}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {RECOMMENDATIONS.map((r, i) => (
          <Card key={i} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[8px] ${r.priority === "high" ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400"}`}>{r.priority}</Badge>
                <span className="text-[10px] font-semibold text-foreground">{r.category}</span>
              </div>
              <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">{r.impact}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">{r.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGGrowthCopilot;

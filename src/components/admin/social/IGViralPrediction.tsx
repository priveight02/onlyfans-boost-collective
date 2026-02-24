import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Eye, MousePointer, Clock, Lightbulb, BarChart3 } from "lucide-react";

interface Props { selectedAccount: string; }

const IGViralPrediction = ({ selectedAccount }: Props) => {
  const [analyzing, setAnalyzing] = useState(false);

  const scores = [
    { label: "Hook Strength", value: 82, color: "bg-emerald-500", icon: "🎣" },
    { label: "Retention Probability", value: 67, color: "bg-amber-500", icon: "👀" },
    { label: "CTA Clarity", value: 91, color: "bg-blue-500", icon: "🎯" },
    { label: "Viral Potential", value: 74, color: "bg-primary", icon: "🚀" },
  ];

  const suggestions = [
    { type: "Hook", text: "Lead with a question instead of a statement — 2.3x higher retention", icon: Lightbulb },
    { type: "Caption", text: "Add line breaks after first 2 sentences for mobile readability", icon: Sparkles },
    { type: "Timing", text: "Post at 7:42 PM for this account's peak engagement window", icon: Clock },
  ];

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Pre-Publish Viral Score</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Predictive</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10" onClick={() => setAnalyzing(!analyzing)}>
          {analyzing ? "Analyzing..." : "Score Content"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {scores.map(s => (
          <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">{s.icon} {s.label}</span>
              <span className="text-xs font-bold text-foreground">{s.value}%</span>
            </div>
            <Progress value={s.value} className="h-1.5" />
          </Card>
        ))}
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> AI Suggestions
        </p>
        <div className="space-y-2">
          {suggestions.map(s => (
            <div key={s.type} className="flex items-start gap-2 bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
              <s.icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-primary">{s.type}</p>
                <p className="text-[10px] text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Posts Scored", value: "438", icon: BarChart3, color: "text-primary" },
          { label: "Avg Accuracy", value: "87%", icon: Eye, color: "text-emerald-400" },
          { label: "Viral Hits", value: "23", icon: Sparkles, color: "text-amber-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] p-2.5 rounded-xl text-center">
            <s.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${s.color}`} />
            <p className="text-sm font-bold text-foreground">{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGViralPrediction;

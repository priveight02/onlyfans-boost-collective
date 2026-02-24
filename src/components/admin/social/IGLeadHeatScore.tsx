import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, MessageSquare, Heart, MousePointer, Eye } from "lucide-react";

interface Props { selectedAccount: string; }

const LEADS = [
  { name: "Alex Thompson", score: 92, heat: "🔴", status: "Ready to Buy", dms: 12, comments: 8, clicks: 5, watches: "89%" },
  { name: "Jessica Wang", score: 74, heat: "🟡", status: "Warm", dms: 4, comments: 3, clicks: 2, watches: "62%" },
  { name: "David Kim", score: 45, heat: "🟡", status: "Warm", dms: 2, comments: 1, clicks: 1, watches: "41%" },
  { name: "Emma Roberts", score: 18, heat: "🟢", status: "Cold", dms: 0, comments: 1, clicks: 0, watches: "15%" },
];

const IGLeadHeatScore = ({ selectedAccount }: Props) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="text-xs font-semibold text-foreground">Lead Heat Scoring</span>
        <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400">Social-First CRM</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { heat: "🔴", label: "Ready to Buy", count: 12, color: "border-red-500/20 bg-red-500/5" },
          { heat: "🟡", label: "Warm", count: 34, color: "border-amber-500/20 bg-amber-500/5" },
          { heat: "🟢", label: "Cold", count: 89, color: "border-green-500/20 bg-green-500/5" },
        ].map(h => (
          <Card key={h.label} className={`${h.color} border p-2.5 rounded-xl text-center`}>
            <p className="text-lg">{h.heat}</p>
            <p className="text-sm font-bold text-foreground">{h.count}</p>
            <p className="text-[9px] text-muted-foreground">{h.label}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {LEADS.map(l => (
          <Card key={l.name} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{l.heat}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{l.name}</p>
                  <p className="text-[9px] text-muted-foreground">{l.status}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{l.score}/100</p>
                <Progress value={l.score} className="h-1 w-16" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {[
                { icon: MessageSquare, label: "DMs", value: l.dms },
                { icon: Heart, label: "Comments", value: l.comments },
                { icon: MousePointer, label: "Clicks", value: l.clicks },
                { icon: Eye, label: "Watch", value: l.watches },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <m.icon className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
                  <p className="text-[10px] font-bold text-foreground">{m.value}</p>
                  <p className="text-[8px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGLeadHeatScore;

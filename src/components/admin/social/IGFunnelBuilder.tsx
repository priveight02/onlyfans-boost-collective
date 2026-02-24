import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, MessageSquare, UserCheck, Calendar, ArrowRight, Sparkles } from "lucide-react";

interface Props { selectedAccount: string; }

const FUNNEL_STAGES = [
  { stage: "DM Received", icon: MessageSquare, count: 342, color: "text-blue-400", bg: "bg-blue-500/10" },
  { stage: "Qualified", icon: UserCheck, count: 128, color: "text-purple-400", bg: "bg-purple-500/10" },
  { stage: "Booking", icon: Calendar, count: 47, color: "text-amber-400", bg: "bg-amber-500/10" },
  { stage: "Follow-Up", icon: ArrowRight, count: 23, color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

const AI_INSIGHTS = [
  { action: "Pitch Now", reason: "User asked about pricing 3 times — high intent detected", timing: "Immediate" },
  { action: "Nurture", reason: "Engaged with content but hasn't asked questions yet", timing: "Send value post in 24hrs" },
  { action: "Back Off", reason: "Short replies, delayed responses — interest cooling", timing: "Wait 3-5 days" },
];

const IGFunnelBuilder = ({ selectedAccount }: Props) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Funnel Builder From DMs</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Auto-Funnel</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10">Build Funnel</Button>
      </div>

      <div className="flex items-center gap-1">
        {FUNNEL_STAGES.map((s, i) => (
          <div key={s.stage} className="flex items-center gap-1 flex-1">
            <Card className={`${s.bg} border-white/[0.06] p-2.5 rounded-xl text-center flex-1`}>
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-sm font-bold text-foreground">{s.count}</p>
              <p className="text-[8px] text-muted-foreground">{s.stage}</p>
            </Card>
            {i < FUNNEL_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Decision Engine
        </p>
        <div className="space-y-2">
          {AI_INSIGHTS.map(ins => (
            <div key={ins.action} className="flex items-start gap-2 bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
              <Badge variant="outline" className={`text-[8px] shrink-0 mt-0.5 ${ins.action === "Pitch Now" ? "border-emerald-500/30 text-emerald-400" : ins.action === "Back Off" ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400"}`}>{ins.action}</Badge>
              <div>
                <p className="text-[10px] text-foreground">{ins.reason}</p>
                <p className="text-[9px] text-muted-foreground">⏰ {ins.timing}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default IGFunnelBuilder;

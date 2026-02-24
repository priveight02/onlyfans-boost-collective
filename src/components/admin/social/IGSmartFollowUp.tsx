import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Clock, Brain, UserCheck, MessageSquare, AlertCircle } from "lucide-react";

interface Props { selectedAccount: string; }

const FOLLOW_UPS = [
  { name: "Chris P.", lastMsg: "2 days ago", interest: 87, context: "Asked about premium package pricing", nextAction: "Send case study with ROI data", status: "Scheduled" },
  { name: "Nina S.", lastMsg: "5 days ago", interest: 62, context: "Downloaded free resource, opened 3 times", nextAction: "Ask how the resource helped", status: "Pending" },
  { name: "Tom H.", lastMsg: "1 day ago", interest: 34, context: "Brief replies, no questions asked", nextAction: "Hold — interest level too low", status: "Paused" },
];

const IGSmartFollowUp = ({ selectedAccount }: Props) => {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Smart Follow-Up Engine</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Human-Like</Badge>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-primary" />
          AI sends follow-ups <strong className="text-foreground">only</strong> when: user hasn't replied + interest is high + context is relevant. No more generic "just following up" spam.
        </p>
      </Card>

      <div className="space-y-2">
        {FOLLOW_UPS.map(f => (
          <Card key={f.name} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{f.name}</span>
                <Badge variant="outline" className="text-[8px] border-white/10">{f.lastMsg}</Badge>
              </div>
              <Badge variant="outline" className={`text-[8px] ${f.status === "Scheduled" ? "border-emerald-500/30 text-emerald-400" : f.status === "Paused" ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400"}`}>{f.status}</Badge>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] text-muted-foreground">Interest:</span>
              <div className="flex-1 bg-white/[0.06] rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${f.interest > 70 ? "bg-emerald-500" : f.interest > 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${f.interest}%` }} />
              </div>
              <span className="text-[9px] font-bold text-foreground">{f.interest}%</span>
            </div>
            <p className="text-[9px] text-muted-foreground mb-1">📋 {f.context}</p>
            <p className="text-[9px] text-primary">✨ {f.nextAction}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Follow-Ups Sent", value: "234", color: "text-primary" },
          { label: "Reply Rate", value: "41%", color: "text-emerald-400" },
          { label: "Spam Avoided", value: "89%", color: "text-amber-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] p-2.5 rounded-xl text-center">
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGSmartFollowUp;

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Eye, Check, X, MessageSquare, Shield, Clock } from "lucide-react";

interface Props { selectedAccount: string; }

const DRAFTS = [
  { from: "VIP Client", msg: "Can we reschedule our call?", draft: "Of course! I have openings Thursday 2-4 PM or Friday morning. Which works better for you?", confidence: 94 },
  { from: "New Lead", msg: "What's included in the premium tier?", draft: "Great question! The premium tier includes 1-on-1 coaching, weekly strategy calls, and full content audit. Want me to send the full breakdown?", confidence: 88 },
  { from: "Partner", msg: "Ready to discuss the collab terms", draft: "Excited to move forward! I'll prepare our standard partnership agreement. Can we hop on a quick call this week?", confidence: 91 },
];

const IGShadowMode = ({ selectedAccount }: Props) => {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Shadow Mode</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">AI Assist</Badge>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-foreground">Human-in-the-Loop Mode</span>
        </div>
        <p className="text-[9px] text-muted-foreground">AI drafts responses but <strong className="text-foreground">never sends automatically</strong>. You review and approve each message. Perfect for high-ticket or compliance-sensitive accounts.</p>
      </Card>

      <div className="space-y-2">
        {DRAFTS.map(d => (
          <Card key={d.from} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">{d.from}</span>
              </div>
              <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">{d.confidence}% confidence</Badge>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2 mb-2">
              <p className="text-[9px] text-muted-foreground">📩 "{d.msg}"</p>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 mb-2">
              <p className="text-[9px] text-foreground">✨ {d.draft}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-6 text-[10px] flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"><Check className="h-3 w-3" /> Approve & Send</Button>
              <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1 border-white/10"><Clock className="h-3 w-3" /> Edit</Button>
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"><X className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Drafts Today", value: "47", color: "text-primary" },
          { label: "Approved", value: "38", color: "text-emerald-400" },
          { label: "Edited", value: "9", color: "text-amber-400" },
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

export default IGShadowMode;

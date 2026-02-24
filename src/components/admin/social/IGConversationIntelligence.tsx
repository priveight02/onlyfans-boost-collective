import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Brain, MessageSquare, ShieldCheck, Zap, TrendingUp, AlertTriangle } from "lucide-react";

interface Props { selectedAccount: string; }

const INTENT_TYPES = [
  { label: "Hot Buyer", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: "🔥", route: "Sales Flow" },
  { label: "Lead", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: "🎯", route: "Lead Nurture" },
  { label: "Support", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: "💬", route: "AI Responder" },
  { label: "Objection", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: "🛡️", route: "Persuasion Engine" },
  { label: "Spam", color: "bg-muted text-muted-foreground border-white/10", icon: "🚫", route: "Auto-Archive" },
];

const BUYING_SIGNALS = ["price?", "how much?", "link?", "where to buy", "available?", "cost", "discount"];

const IGConversationIntelligence = ({ selectedAccount }: Props) => {
  const [enabled, setEnabled] = useState(true);
  const [autoRoute, setAutoRoute] = useState(true);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Real-Time Intent Detection</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">AI-Powered</Badge>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="grid grid-cols-5 gap-2">
        {INTENT_TYPES.map(t => (
          <Card key={t.label} className={`${t.color} border text-center p-2 rounded-xl`}>
            <p className="text-lg">{t.icon}</p>
            <p className="text-[10px] font-bold mt-1">{t.label}</p>
            <p className="text-[8px] opacity-70">→ {t.route}</p>
          </Card>
        ))}
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Buying Signal Detection
          </span>
          <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400">Active</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BUYING_SIGNALS.map(s => (
            <Badge key={s} variant="outline" className="text-[9px] border-white/10 bg-white/[0.04]">"{s}"</Badge>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-xs font-semibold text-foreground">Auto-Route Conversations</p>
            <p className="text-[10px] text-muted-foreground">Route by detected intent automatically</p>
          </div>
        </div>
        <Switch checked={autoRoute} onCheckedChange={setAutoRoute} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Intents Detected", value: "1,247", icon: Brain, color: "text-primary" },
          { label: "Hot Buyers Found", value: "89", icon: TrendingUp, color: "text-red-400" },
          { label: "Auto-Routed", value: "94%", icon: MessageSquare, color: "text-emerald-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl text-center">
            <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-sm font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGConversationIntelligence;

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Shield, Clock, Shuffle, AlertTriangle, Activity, Gauge } from "lucide-react";

interface Props { selectedAccount: string; }

const IGSmartThrottling = ({ selectedAccount }: Props) => {
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState([45]);
  const [variation, setVariation] = useState(true);
  const [autoPause, setAutoPause] = useState(true);

  const riskLevel = speed[0] > 70 ? "high" : speed[0] > 40 ? "medium" : "low";
  const riskColors = { low: "text-green-400 border-green-500/30", medium: "text-amber-400 border-amber-500/30", high: "text-red-400 border-red-500/30" };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Anti-Ban Smart Throttling</span>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Sending Speed</span>
          <Badge variant="outline" className={`text-[9px] ${riskColors[riskLevel]}`}>{riskLevel} risk</Badge>
        </div>
        <Slider value={speed} onValueChange={setSpeed} max={100} step={1} className="w-full" />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>🐢 Safe</span><span>⚡ Fast</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shuffle className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] font-semibold text-foreground">Message Variation</span>
            </div>
            <Switch checked={variation} onCheckedChange={setVariation} />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">AI generates semantic variations to avoid pattern detection</p>
        </Card>
        <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-semibold text-foreground">Auto-Pause</span>
            </div>
            <Switch checked={autoPause} onCheckedChange={setAutoPause} />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">Pauses when platform risk is detected</p>
        </Card>
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-cyan-400" /> Platform Limits Learned</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { p: "Instagram", limit: "40/hr", color: "text-pink-400" },
            { p: "TikTok", limit: "25/hr", color: "text-cyan-400" },
            { p: "WhatsApp", limit: "60/hr", color: "text-green-400" },
            { p: "Messenger", limit: "50/hr", color: "text-blue-400" },
          ].map(l => (
            <div key={l.p} className="text-center">
              <p className={`text-[10px] font-bold ${l.color}`}>{l.p}</p>
              <p className="text-xs font-bold text-foreground">{l.limit}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Sent Today", value: "342", icon: Activity, color: "text-primary" },
          { label: "Variations Generated", value: "1.2K", icon: Shuffle, color: "text-violet-400" },
          { label: "Pauses Triggered", value: "3", icon: Shield, color: "text-amber-400" },
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

export default IGSmartThrottling;

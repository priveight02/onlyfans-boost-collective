import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Palette, Crown, Megaphone, Smile, Shield } from "lucide-react";

interface Props { selectedAccount: string; }

const PERSONAS = [
  { name: "Luxury Brand", tone: "Elegant, exclusive, understated", style: "Formal language, premium feel, no slang", icon: Crown, color: "text-amber-400", active: true },
  { name: "Aggressive Sales", tone: "Direct, urgent, high-energy", style: "FOMO triggers, limited-time offers, bold CTAs", icon: Megaphone, color: "text-red-400", active: false },
  { name: "Friendly Creator", tone: "Casual, warm, relatable", style: "Emojis, personal stories, conversational", icon: Smile, color: "text-green-400", active: false },
];

const IGPersonaEngine = ({ selectedAccount }: Props) => {
  const [personas, setPersonas] = useState(PERSONAS);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Persona Engine</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Brand Voice</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10">+ New Persona</Button>
      </div>

      <Card className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Brand Consistency Guard</span>
        </div>
        <p className="text-[9px] text-muted-foreground">AI ensures all DMs, comments, and auto-replies match the active persona's tone. Off-brand messages are flagged before sending.</p>
      </Card>

      <div className="space-y-2">
        {personas.map(p => (
          <Card key={p.name} className={`bg-white/[0.03] border-white/[0.06] p-3 rounded-xl ${p.active ? "border-primary/20 shadow-[0_0_15px_-5px] shadow-primary/10" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center ${p.color}`}>
                  <p.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">{p.tone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.active && <Badge className="text-[8px] bg-primary/20 text-primary border-0">Active</Badge>}
                <Switch checked={p.active} />
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">📝 {p.style}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGPersonaEngine;

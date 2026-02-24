import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, Play, Plus, Trash2 } from "lucide-react";

interface Props { selectedAccount: string; }

const TRIGGERS = [
  { id: 1, type: "Keyword Comment", trigger: "price", dm: "Hey! Saw you commented about pricing — here's the full breakdown 👇", active: true },
  { id: 2, type: "Video Watch", trigger: "80% watched", dm: "Loved that you watched our latest reel! Want the exclusive content? 🔥", active: true },
  { id: 3, type: "Multi-Like", trigger: "3+ likes", dm: "Noticed you've been vibing with our content — thought you'd love this 💎", active: false },
];

const IGEngagementDM = ({ selectedAccount }: Props) => {
  const [triggers, setTriggers] = useState(TRIGGERS);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-400" />
          <span className="text-xs font-semibold text-foreground">Engagement-Triggered DMs</span>
          <Badge variant="outline" className="text-[9px] border-pink-500/30 text-pink-400">Auto</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 gap-1">
          <Plus className="h-3 w-3" /> Add Trigger
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {[
          { icon: MessageCircle, label: "Keyword Comment", desc: "DM when user comments a keyword", color: "text-blue-400" },
          { icon: Play, label: "Video Watch %", desc: "DM when user watches X% of video", color: "text-purple-400" },
          { icon: Heart, label: "Multi-Like", desc: "DM after user likes multiple posts", color: "text-pink-400" },
        ].map(t => (
          <Card key={t.label} className="bg-white/[0.03] border-white/[0.06] p-2.5 rounded-xl text-center">
            <t.icon className={`h-4 w-4 mx-auto mb-1 ${t.color}`} />
            <p className="text-[10px] font-semibold text-foreground">{t.label}</p>
            <p className="text-[8px] text-muted-foreground">{t.desc}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {triggers.map(t => (
          <Card key={t.id} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">{t.type}</Badge>
                <span className="text-[10px] text-muted-foreground">Trigger: <strong className="text-foreground">{t.trigger}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={t.active} />
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400 cursor-pointer" />
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">📩 AI Message:</p>
              <p className="text-[10px] text-foreground mt-0.5">{t.dm}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "DMs Triggered", value: "892", color: "text-primary" },
          { label: "Reply Rate", value: "34%", color: "text-emerald-400" },
          { label: "Conversions", value: "67", color: "text-amber-400" },
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

export default IGEngagementDM;

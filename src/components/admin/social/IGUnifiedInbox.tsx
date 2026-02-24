import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Inbox, Brain, History, Target, MessageSquare, Sparkles } from "lucide-react";

interface Props { selectedAccount: string; }

const CONVERSATIONS = [
  { name: "Sarah M.", platform: "IG", intent: "Hot Buyer", stage: "Ready to Buy", lastMsg: "How much for the bundle?", memory: "Prev. purchased $200 package", suggested: "Send pricing link with 10% returning customer discount", avatar: "🟣" },
  { name: "Jake R.", platform: "TikTok", intent: "Lead", stage: "Warm", lastMsg: "This looks interesting", memory: "Watched 3 videos, commented twice", suggested: "Share free resource to build trust", avatar: "🔵" },
  { name: "Maria L.", platform: "WhatsApp", intent: "Support", stage: "Active", lastMsg: "Having trouble with login", memory: "VIP customer, 6 purchases", suggested: "Prioritize — offer direct call support", avatar: "🟢" },
];

const IGUnifiedInbox = ({ selectedAccount }: Props) => {
  const [aiMemory, setAiMemory] = useState(true);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Unified Inbox + AI Memory</span>
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">Cross-Platform</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">AI Memory</span>
          <Switch checked={aiMemory} onCheckedChange={setAiMemory} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { p: "Instagram", count: 24, color: "text-pink-400" },
          { p: "TikTok", count: 12, color: "text-cyan-400" },
          { p: "WhatsApp", count: 8, color: "text-green-400" },
          { p: "Messenger", count: 5, color: "text-blue-400" },
        ].map(i => (
          <Card key={i.p} className="bg-white/[0.03] border-white/[0.06] p-2 rounded-xl text-center">
            <p className={`text-lg font-bold ${i.color}`}>{i.count}</p>
            <p className="text-[9px] text-muted-foreground">{i.p}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {CONVERSATIONS.map(c => (
          <Card key={c.name} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{c.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground">{c.name}</span>
                  <Badge variant="outline" className="text-[8px] border-white/10">{c.platform}</Badge>
                  <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">{c.intent}</Badge>
                  <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400">{c.stage}</Badge>
                </div>
                <p className="text-[10px] text-foreground mb-1">"{c.lastMsg}"</p>
                <div className="flex items-start gap-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg p-1.5">
                  <History className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[9px] text-muted-foreground">{c.memory}</p>
                </div>
                <div className="flex items-start gap-1.5 bg-primary/5 border border-primary/10 rounded-lg p-1.5 mt-1">
                  <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  <p className="text-[9px] text-primary">{c.suggested}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGUnifiedInbox;

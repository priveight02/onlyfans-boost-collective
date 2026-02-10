import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain, Target, Heart, Shield, Zap, Crown, Eye, MessageSquare,
  DollarSign, Clock, Sparkles, Copy, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

interface PlaybookEntry {
  title: string;
  principle: string;
  description: string;
  examples: string[];
  whenToUse: string;
  effectiveness: "high" | "very_high" | "extreme";
}

const PLAYBOOK: Record<string, PlaybookEntry[]> = {
  opening: [
    {
      title: "The Casual Opener",
      principle: "Lowered Guard",
      description: "Start with something so casual it doesn't feel like a pitch. She's just bored and texting.",
      examples: ["heyy u up? lol just got home ngl im bored", "omg i just saw the funniest thing remind me to tell u later", "wyd rn? i need someone to talk to lol"],
      whenToUse: "Every script — fans respond 3x more to casual openers vs. \"Hey babe!\" style",
      effectiveness: "high",
    },
    {
      title: "The Callback Open",
      principle: "Continuity & Memory",
      description: "Reference something from a previous interaction to create a sense of ongoing relationship.",
      examples: ["remember when u said u liked [thing]? well...", "ok so u know how i told u abt that thing? it happened lol", "i was thinking abt what u said last time ngl"],
      whenToUse: "Returning fans — makes them feel remembered and special",
      effectiveness: "very_high",
    },
    {
      title: "The Mystery Hook",
      principle: "Curiosity Gap",
      description: "Open with something incomplete that DEMANDS a response.",
      examples: ["ok so something crazy just happened...", "i cant believe i just did that lol", "u wont believe what im about to send u"],
      whenToUse: "When fan engagement has been dropping — reignites curiosity",
      effectiveness: "very_high",
    },
  ],
  building: [
    {
      title: "Progressive Reveal",
      principle: "Mental Investment",
      description: "Each message reveals a little more, building a mental picture. The gap between what they see and imagine is where desire lives.",
      examples: ["im wearing something rn ngl", "ok fine ill show u but just a lil bit lol", "do u wanna see the rest or is that too much"],
      whenToUse: "Before first paid content — maximizes willingness to pay",
      effectiveness: "extreme",
    },
    {
      title: "Micro-Commitment Ladder",
      principle: "Consistency Bias",
      description: "Get small \"yes\" answers before the big ask. Once they've said yes 3 times, saying no feels inconsistent.",
      examples: ["do u like me in this color? → did that make u smile? → wanna see what im wearing under this?", "r u somewhere private rn? → ok good bc... → this is just for u ok"],
      whenToUse: "Before ANY PPV drop — dramatically increases purchase rate",
      effectiveness: "extreme",
    },
    {
      title: "Emotional Temperature Check",
      principle: "Investment Anchoring",
      description: "Ask how they're feeling to make them consciously acknowledge their arousal/interest. Once acknowledged, they're committed.",
      examples: ["how does that make u feel? lol", "r u thinking what im thinking rn", "ngl is ur heart racing? bc mine is"],
      whenToUse: "Mid-script, before escalating to premium content",
      effectiveness: "very_high",
    },
  ],
  closing: [
    {
      title: "The Reluctant Share",
      principle: "Scarcity + Vulnerability",
      description: "Act nervous or hesitant before sending premium content. Makes it feel MORE exclusive because she's \"risking\" something.",
      examples: ["ok im nervous to send this ngl", "promise u wont judge me lol i never do this", "idk if i should... but u make me wanna"],
      whenToUse: "Right before the highest-priced PPV — adds massive perceived value",
      effectiveness: "extreme",
    },
    {
      title: "Post-Purchase Warmth",
      principle: "Pavlovian Conditioning",
      description: "Immediately after purchase, flood them with positive emotions. They associate spending with feeling amazing.",
      examples: ["omg u actually got it lol that makes me so happy", "u just made my whole day ngl", "see this is why ur my favorite bc u actually appreciate me"],
      whenToUse: "ALWAYS after every purchase — creates repeat buying behavior",
      effectiveness: "extreme",
    },
    {
      title: "The Sequel Seed",
      principle: "Open Loop",
      description: "End with an unresolved hook that makes them NEED the next script.",
      examples: ["ok next time i wanna try something even crazier ngl", "theres something ive been wanting to show u but im not ready yet", "i have another idea but its... a lot lol"],
      whenToUse: "End of every script — turns one-time buyers into serial purchasers",
      effectiveness: "very_high",
    },
  ],
  recovery: [
    {
      title: "The Gentle Nudge",
      principle: "FOMO Activation",
      description: "If they go quiet, imply the content might disappear or the moment will pass.",
      examples: ["u there? lol i might delete this later tbh", "nvm u prob busy ill send it to someone else", "ok well im gonna go to sleep soon so..."],
      whenToUse: "5-10 min of silence after a PPV drop",
      effectiveness: "high",
    },
    {
      title: "The Vulnerability Play",
      principle: "Guilt + Sympathy",
      description: "Express genuine disappointment (not anger). Makes them feel bad for ignoring.",
      examples: ["oh ok lol ngl i was kinda excited to show u that", "its fine i just thought u'd like it bc u said u liked stuff like that before", "i put a lot into that one ngl"],
      whenToUse: "15-30 min of silence — use sparingly, very powerful",
      effectiveness: "very_high",
    },
    {
      title: "The Free Bait Reset",
      principle: "Reciprocity Reset",
      description: "Send another free item to restart the reciprocity cycle.",
      examples: ["ok here have this one for free bc i want u to see it", "u know what nvm about the price just look at this", "fine ill give u a preview lol but the full thing is..."],
      whenToUse: "When fan stopped responding after a high price — reset with value",
      effectiveness: "high",
    },
  ],
};

const FanPsychologyPlaybook = () => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyExample = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getEffColor = (eff: string) => {
    if (eff === "extreme") return "border-red-500/30 text-red-400 bg-red-500/10";
    if (eff === "very_high") return "border-amber-500/30 text-amber-400 bg-amber-500/10";
    return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 backdrop-blur-sm border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-400" />
            <div>
              <p className="text-sm font-semibold text-white">Fan Psychology Playbook</p>
              <p className="text-xs text-white/50">Copy-paste ready techniques for every stage of the conversation. All messages use natural abbreviation style.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="opening" className="space-y-4">
        <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="opening" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Opening
          </TabsTrigger>
          <TabsTrigger value="building" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Building
          </TabsTrigger>
          <TabsTrigger value="closing" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Crown className="h-3.5 w-3.5" /> Closing
          </TabsTrigger>
          <TabsTrigger value="recovery" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Recovery
          </TabsTrigger>
        </TabsList>

        {Object.entries(PLAYBOOK).map(([phase, entries]) => (
          <TabsContent key={phase} value={phase}>
            <div className="space-y-3">
              {entries.map((entry, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
                      <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400">{entry.principle}</Badge>
                      <Badge variant="outline" className={`text-[9px] ${getEffColor(entry.effectiveness)}`}>
                        {entry.effectiveness === "extreme" ? "🔥 EXTREME" : entry.effectiveness === "very_high" ? "⚡ VERY HIGH" : "✅ HIGH"}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">{entry.description}</p>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Copy-Paste Examples</p>
                      {entry.examples.map((ex, j) => (
                        <button
                          key={j}
                          onClick={() => copyExample(ex, `${phase}-${i}-${j}`)}
                          className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-left group"
                        >
                          <span className="text-xs text-white/70 flex-1 font-mono">{ex}</span>
                          <Copy className={`h-3 w-3 shrink-0 transition-colors ${copiedIndex === `${phase}-${i}-${j}` ? "text-emerald-400" : "text-white/20 group-hover:text-white/50"}`} />
                        </button>
                      ))}
                    </div>

                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-300/70"><strong className="text-amber-400">When to use:</strong> {entry.whenToUse}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default FanPsychologyPlaybook;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Sparkles, Plus, Loader2, ChevronRight, ChevronLeft,
  Save, User, Heart, Shield, Palette, Volume2, Zap, Star, Check,
  Crown, Eye, MessageCircle,
} from "lucide-react";

interface PersonaCreatorDialogProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TONES = ["sweet", "dominant", "playful", "mysterious", "bratty", "innocent", "seductive", "nurturing", "edgy", "sophisticated"];
const VOCAB_STYLES = ["casual", "flirty", "intellectual", "street", "elegant", "cutesy", "confident", "poetic"];
const EMOTIONAL_RANGES = ["low", "medium", "high", "volatile"];

interface PersonaData {
  name: string;
  tone: string;
  vocabStyle: string;
  emotionalRange: string;
  brandIdentity: string;
  boundaries: string;
  traits: string[];
  ageRange: string;
  interests: string;
  flirtLevel: number;
  redirectAggressiveness: number;
  emojiUsage: string;
  messageLength: string;
  responseSpeed: string;
  hookStyle: string;
  objectionHandling: string;
  isDefault: boolean;
}

const STEPS = [
  { id: "identity", label: "Identity", icon: User },
  { id: "voice", label: "Voice & Tone", icon: Volume2 },
  { id: "personality", label: "Personality", icon: Heart },
  { id: "strategy", label: "Chat Strategy", icon: Zap },
  { id: "boundaries", label: "Boundaries", icon: Shield },
  { id: "review", label: "Review & Save", icon: Check },
];

const defaultPersona: PersonaData = {
  name: "",
  tone: "playful",
  vocabStyle: "casual",
  emotionalRange: "medium",
  brandIdentity: "",
  boundaries: "",
  traits: [],
  ageRange: "early 20s",
  interests: "",
  flirtLevel: 70,
  redirectAggressiveness: 60,
  emojiUsage: "minimal",
  messageLength: "short",
  responseSpeed: "natural",
  hookStyle: "curiosity",
  objectionHandling: "soft deflect",
  isDefault: false,
};

const PersonaCreatorDialog = ({ accountId, open, onOpenChange }: PersonaCreatorDialogProps) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);
  const [persona, setPersona] = useState<PersonaData>({ ...defaultPersona });
  const [newTrait, setNewTrait] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPersonas();
      setStep(0);
      setPersona({ ...defaultPersona });
    }
  }, [open, accountId]);

  const loadPersonas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("persona_profiles")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });
    setPersonas(data || []);
    setLoading(false);
  };

  const update = (key: keyof PersonaData, value: any) => setPersona(prev => ({ ...prev, [key]: value }));

  const addTrait = () => {
    if (newTrait.trim() && !persona.traits.includes(newTrait.trim())) {
      update("traits", [...persona.traits, newTrait.trim()]);
      setNewTrait("");
    }
  };

  const removeTrait = (i: number) => update("traits", persona.traits.filter((_, j) => j !== i));

  const savePersona = async () => {
    if (!persona.name.trim()) { toast.error("Give your persona a name"); return; }
    setSaving(true);

    const commRules = {
      emoji_usage: persona.emojiUsage,
      message_length: persona.messageLength,
      response_speed: persona.responseSpeed,
      hook_style: persona.hookStyle,
      objection_handling: persona.objectionHandling,
      flirt_level: persona.flirtLevel,
      redirect_aggressiveness: persona.redirectAggressiveness,
      age_range: persona.ageRange,
      interests: persona.interests,
    };

    const payload = {
      account_id: accountId,
      tone: persona.tone,
      vocabulary_style: persona.vocabStyle,
      emotional_range: persona.emotionalRange,
      brand_identity: `[${persona.name}] ${persona.brandIdentity}`,
      boundaries: persona.boundaries || null,
      personality_traits: persona.traits,
      communication_rules: commRules,
      motivation_level: 70,
      stress_level: 30,
      burnout_risk: 20,
      mood: "neutral",
      last_mood_update: new Date().toISOString(),
    };

    const { error } = await supabase.from("persona_profiles").insert(payload);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Persona "${persona.name}" created!`);
      await loadPersonas();
      setPersona({ ...defaultPersona });
      setStep(0);
    }
    setSaving(false);
  };

  const deletePersona = async (id: string) => {
    await supabase.from("persona_profiles").delete().eq("id", id);
    toast.success("Persona deleted");
    loadPersonas();
  };

  const chipClass = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-[10px] cursor-pointer transition-all ${active ? "bg-purple-500/30 text-purple-300 border border-purple-500/40" : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"}`;

  const defaultProfile = personas[0];
  const extraPersonas = personas.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-[hsl(222,35%,8%)] border-white/10 text-white overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base text-white">
            <Brain className="h-4 w-4 text-purple-400" />
            Persona Manager
            <Badge variant="outline" className="text-[9px] ml-2 text-white/50 border-white/20">
              {personas.length} persona{personas.length !== 1 ? "s" : ""}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Active Personas Cards */}
          <div className="px-5 py-3 border-b border-white/10 flex-shrink-0">
            <p className="text-[10px] text-white/40 mb-2">ACTIVE PERSONAS</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {/* Default persona card */}
              {defaultProfile ? (
                <div className="min-w-[180px] p-3 rounded-lg bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/30 relative">
                  <div className="absolute top-1.5 right-1.5">
                    <Badge className="text-[8px] bg-green-500/20 text-green-400 border-green-500/30 px-1 py-0">DEFAULT</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-white truncate">
                      {defaultProfile.brand_identity?.replace(/^\[.*?\]\s*/, "").substring(0, 25) || defaultProfile.tone}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[8px] border-purple-500/20 text-purple-400 px-1 py-0 capitalize">{defaultProfile.tone}</Badge>
                    <Badge variant="outline" className="text-[8px] border-blue-500/20 text-blue-400 px-1 py-0 capitalize">{defaultProfile.vocabulary_style}</Badge>
                  </div>
                </div>
              ) : (
                <div className="min-w-[180px] p-3 rounded-lg bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                  <span className="text-[10px] text-white/30">No default persona yet</span>
                </div>
              )}

              {/* Extra persona cards */}
              {extraPersonas.map(p => (
                <div key={p.id} className="min-w-[160px] p-3 rounded-lg bg-white/5 border border-white/10 relative group">
                  <button onClick={() => deletePersona(p.id)} className="absolute top-1 right-1 text-red-400/0 group-hover:text-red-400/80 text-[10px] hover:text-red-300 transition-all" title="Delete">×</button>
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="h-3 w-3 text-white/40" />
                    <span className="text-[11px] font-medium text-white/80 truncate">
                      {p.brand_identity?.match(/^\[(.*?)\]/)?.[1] || p.tone}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[8px] border-white/10 text-white/40 px-1 py-0 capitalize">{p.tone}</Badge>
                    <Badge variant="outline" className="text-[8px] border-white/10 text-white/40 px-1 py-0 capitalize">{p.vocabulary_style}</Badge>
                  </div>
                </div>
              ))}

              {/* Create new card hint */}
              <div className="min-w-[80px] p-3 rounded-lg border border-dashed border-white/15 flex items-center justify-center cursor-default">
                <span className="text-[10px] text-white/20">+ below</span>
              </div>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="px-5 py-2 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStep(i)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${step === i ? "bg-purple-500/20 text-purple-300" : i < step ? "text-green-400/60" : "text-white/30 hover:text-white/50"}`}
                  >
                    <Icon className="h-3 w-3" />
                    {s.label}
                    {i < STEPS.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-white/15 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-4">
              {/* Step 0: Identity */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Persona Name *</label>
                    <Input value={persona.name} onChange={e => update("name", e.target.value)}
                      placeholder="e.g. Sweet Bella, Mysterious Luna, Bratty Kira..."
                      className="bg-white/5 border-white/10 text-white text-sm h-9 placeholder:text-white/30 focus:border-purple-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Age Range / Vibe</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["late teens", "early 20s", "mid 20s", "late 20s", "early 30s"].map(a => (
                        <button key={a} className={chipClass(persona.ageRange === a)} onClick={() => update("ageRange", a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Interests & Hobbies (helps AI sound authentic)</label>
                    <Textarea value={persona.interests} onChange={e => update("interests", e.target.value)}
                      placeholder="yoga, anime, traveling, makeup, gaming, fitness, cooking, art..."
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] placeholder:text-white/30 resize-none focus:border-purple-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Brand Identity / Bio</label>
                    <Textarea value={persona.brandIdentity} onChange={e => update("brandIdentity", e.target.value)}
                      placeholder="The girl next door who's secretly wild... Always warm, never desperate..."
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] placeholder:text-white/30 resize-none focus:border-purple-500/50" />
                  </div>
                </div>
              )}

              {/* Step 1: Voice & Tone */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Primary Tone</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TONES.map(t => (
                        <button key={t} className={chipClass(persona.tone === t)} onClick={() => update("tone", t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Vocabulary Style</label>
                    <div className="flex flex-wrap gap-1.5">
                      {VOCAB_STYLES.map(v => (
                        <button key={v} className={chipClass(persona.vocabStyle === v)} onClick={() => update("vocabStyle", v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Emoji Usage</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["none", "minimal", "moderate", "heavy"].map(e => (
                        <button key={e} className={chipClass(persona.emojiUsage === e)} onClick={() => update("emojiUsage", e)}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Message Length Preference</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["ultra-short (1-5 words)", "short (5-15 words)", "medium (15-30 words)", "long (30+ words)"].map(l => (
                        <button key={l} className={chipClass(persona.messageLength === l.split(" ")[0])} onClick={() => update("messageLength", l.split(" ")[0])}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Personality */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Emotional Range</label>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOTIONAL_RANGES.map(e => (
                        <button key={e} className={chipClass(persona.emotionalRange === e)} onClick={() => update("emotionalRange", e)}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Personality Traits</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {persona.traits.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-purple-500/20 text-purple-400 px-2 py-0.5">
                          {t}
                          <button onClick={() => removeTrait(i)} className="ml-1.5 text-red-400 hover:text-red-300">×</button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input value={newTrait} onChange={e => setNewTrait(e.target.value)} onKeyDown={e => e.key === "Enter" && addTrait()}
                        placeholder="witty, sarcastic, caring, teasing, confident..."
                        className="bg-white/5 border-white/10 text-white text-xs h-7 flex-1 placeholder:text-white/30" />
                      <Button size="sm" onClick={addTrait} className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[9px] text-white/30">Quick add:</span>
                      {["witty", "sarcastic", "caring", "teasing", "confident", "mysterious", "warm", "provocative", "attentive", "unpredictable"].map(t => (
                        <button key={t} onClick={() => { if (!persona.traits.includes(t)) update("traits", [...persona.traits, t]); }}
                          className="text-[9px] text-white/30 hover:text-purple-400 px-1">{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Flirt Intensity: {persona.flirtLevel}%</label>
                    <Slider value={[persona.flirtLevel]} onValueChange={([v]) => update("flirtLevel", v)} max={100} step={5}
                      className="w-full" />
                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
                      <span>Friendly</span><span>Suggestive</span><span>🔥 Max</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Chat Strategy */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Response Speed</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["instant", "natural (30s-2min)", "slow (2-5min)", "very slow (5-15min)"].map(s => (
                        <button key={s} className={chipClass(persona.responseSpeed === s.split(" ")[0])} onClick={() => update("responseSpeed", s.split(" ")[0])}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Hook Style (how to grab attention)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["curiosity", "compliment", "challenge", "story", "question", "tease", "vulnerability", "humor"].map(h => (
                        <button key={h} className={chipClass(persona.hookStyle === h)} onClick={() => update("hookStyle", h)}>{h}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Objection Handling</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["soft deflect", "playful reframe", "confident redirect", "emotional appeal", "scarcity push", "ignore & pivot"].map(o => (
                        <button key={o} className={chipClass(persona.objectionHandling === o)} onClick={() => update("objectionHandling", o)}>{o}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Redirect Aggressiveness: {persona.redirectAggressiveness}%</label>
                    <Slider value={[persona.redirectAggressiveness]} onValueChange={([v]) => update("redirectAggressiveness", v)} max={100} step={5}
                      className="w-full" />
                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
                      <span>Subtle hints</span><span>Direct links</span><span>Hard sell</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Boundaries */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1.5 block">Content Boundaries & Rules</label>
                    <Textarea value={persona.boundaries} onChange={e => update("boundaries", e.target.value)}
                      placeholder="No face content, no extreme fetish, max 3 custom videos/week, never share personal info, don't discuss other creators..."
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[100px] placeholder:text-white/30 resize-none focus:border-purple-500/50" />
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      These boundaries are hard-enforced — the AI will never cross them regardless of fan behavior.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {step === 5 && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" /> Persona Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-white/40">Name:</span> <span className="text-white">{persona.name || "—"}</span></div>
                      <div><span className="text-white/40">Tone:</span> <span className="text-purple-400 capitalize">{persona.tone}</span></div>
                      <div><span className="text-white/40">Vocab:</span> <span className="text-blue-400 capitalize">{persona.vocabStyle}</span></div>
                      <div><span className="text-white/40">Emotional:</span> <span className="text-pink-400 capitalize">{persona.emotionalRange}</span></div>
                      <div><span className="text-white/40">Age:</span> <span className="text-white/60">{persona.ageRange}</span></div>
                      <div><span className="text-white/40">Emoji:</span> <span className="text-white/60 capitalize">{persona.emojiUsage}</span></div>
                      <div><span className="text-white/40">Msg Length:</span> <span className="text-white/60 capitalize">{persona.messageLength}</span></div>
                      <div><span className="text-white/40">Hook:</span> <span className="text-amber-400 capitalize">{persona.hookStyle}</span></div>
                      <div><span className="text-white/40">Flirt:</span> <span className="text-pink-400">{persona.flirtLevel}%</span></div>
                      <div><span className="text-white/40">Redirect:</span> <span className="text-orange-400">{persona.redirectAggressiveness}%</span></div>
                    </div>
                    {persona.traits.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {persona.traits.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-purple-500/20 text-purple-300 px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {persona.brandIdentity && <p className="text-[10px] text-white/40 mt-2 italic">"{persona.brandIdentity}"</p>}
                  </div>

                  <Button onClick={savePersona} disabled={saving || !persona.name.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Create Persona
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Step Navigation Footer */}
          <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="h-7 text-[10px] text-white/50 hover:text-white gap-1">
              <ChevronLeft className="h-3 w-3" /> Back
            </Button>
            <span className="text-[10px] text-white/30">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}
                className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700 gap-1">
                Next <ChevronRight className="h-3 w-3" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaCreatorDialog;

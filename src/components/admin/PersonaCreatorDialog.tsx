import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Sparkles, Plus, Loader2, ChevronRight, ChevronLeft,
  Save, User, Heart, Shield, Volume2, Zap, Check,
  Crown, MessageCircle, FileText, Globe, Flame, Target,
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
  secondaryTone: string;
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
  additionalInfo: string;
  backstory: string;
  turnOns: string;
  turnOffs: string;
  catchphrases: string;
  languageStyle: string;
  humor: string;
  attachmentStyle: string;
  contentThemes: string;
  pricingMentality: string;
  competitorMention: string;
  recoveryStyle: string;
  warmth: number;
  mystery: number;
  dominance: number;
}

const STEPS = [
  { id: "identity", label: "Identity", icon: User, color: "text-blue-400" },
  { id: "voice", label: "Voice & Tone", icon: Volume2, color: "text-purple-400" },
  { id: "personality", label: "Personality", icon: Heart, color: "text-pink-400" },
  { id: "strategy", label: "Chat Strategy", icon: Zap, color: "text-amber-400" },
  { id: "advanced", label: "Advanced", icon: Target, color: "text-cyan-400" },
  { id: "boundaries", label: "Boundaries", icon: Shield, color: "text-emerald-400" },
  { id: "review", label: "Review & Save", icon: Check, color: "text-green-400" },
];

const defaultPersona: PersonaData = {
  name: "", tone: "playful", secondaryTone: "", vocabStyle: "casual", emotionalRange: "medium",
  brandIdentity: "", boundaries: "", traits: [], ageRange: "early 20s", interests: "",
  flirtLevel: 70, redirectAggressiveness: 60, emojiUsage: "minimal", messageLength: "short",
  responseSpeed: "natural", hookStyle: "curiosity", objectionHandling: "soft deflect",
  additionalInfo: "", backstory: "", turnOns: "", turnOffs: "", catchphrases: "",
  languageStyle: "", humor: "witty", attachmentStyle: "secure-playful",
  contentThemes: "", pricingMentality: "premium", competitorMention: "ignore",
  recoveryStyle: "playful", warmth: 70, mystery: 50, dominance: 40,
};

const PersonaCreatorDialog = ({ accountId, open, onOpenChange }: PersonaCreatorDialogProps) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);
  const [persona, setPersona] = useState<PersonaData>({ ...defaultPersona });
  const [newTrait, setNewTrait] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { loadPersonas(); setStep(0); setPersona({ ...defaultPersona }); }
  }, [open, accountId]);

  const loadPersonas = async () => {
    setLoading(true);
    const { data } = await supabase.from("persona_profiles").select("*").eq("account_id", accountId).order("created_at", { ascending: true });
    setPersonas(data || []);
    setLoading(false);
  };

  const update = (key: keyof PersonaData, value: any) => setPersona(prev => ({ ...prev, [key]: value }));
  const addTrait = () => { if (newTrait.trim() && !persona.traits.includes(newTrait.trim())) { update("traits", [...persona.traits, newTrait.trim()]); setNewTrait(""); } };
  const removeTrait = (i: number) => update("traits", persona.traits.filter((_, j) => j !== i));

  const savePersona = async () => {
    if (!persona.name.trim()) { toast.error("Give your persona a name"); return; }
    setSaving(true);
    const commRules = {
      emoji_usage: persona.emojiUsage, message_length: persona.messageLength,
      response_speed: persona.responseSpeed, hook_style: persona.hookStyle,
      objection_handling: persona.objectionHandling, flirt_level: persona.flirtLevel,
      redirect_aggressiveness: persona.redirectAggressiveness, age_range: persona.ageRange,
      interests: persona.interests, secondary_tone: persona.secondaryTone,
      backstory: persona.backstory, turn_ons: persona.turnOns, turn_offs: persona.turnOffs,
      catchphrases: persona.catchphrases, language_style: persona.languageStyle,
      humor: persona.humor, attachment_style: persona.attachmentStyle,
      content_themes: persona.contentThemes, pricing_mentality: persona.pricingMentality,
      competitor_mention: persona.competitorMention, recovery_style: persona.recoveryStyle,
      warmth: persona.warmth, mystery: persona.mystery, dominance: persona.dominance,
      additional_info: persona.additionalInfo,
    };
    const payload = {
      account_id: accountId, tone: persona.tone, vocabulary_style: persona.vocabStyle,
      emotional_range: persona.emotionalRange,
      brand_identity: `[${persona.name}] ${persona.brandIdentity}`,
      boundaries: persona.boundaries || null, personality_traits: persona.traits,
      communication_rules: commRules, motivation_level: 70, stress_level: 30,
      burnout_risk: 20, mood: "neutral", last_mood_update: new Date().toISOString(),
    };
    const { error } = await supabase.from("persona_profiles").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(`Persona "${persona.name}" created!`); await loadPersonas(); setPersona({ ...defaultPersona }); setStep(0); }
    setSaving(false);
  };

  const deletePersona = async (id: string) => {
    await supabase.from("persona_profiles").delete().eq("id", id);
    toast.success("Persona deleted"); loadPersonas();
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all duration-200 ${active
      ? "bg-gradient-to-r from-purple-500/30 to-blue-500/20 text-white border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
      : "bg-white/[0.04] text-white/45 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/70 hover:border-white/15"}`;

  const sectionTitle = (icon: React.ReactNode, label: string, hint?: string) => (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-[11px] font-semibold text-white/80 tracking-wide uppercase">{label}</span>
      {hint && <span className="text-[9px] text-white/25 ml-auto italic">{hint}</span>}
    </div>
  );

  const defaultProfile = personas[0];
  const extraPersonas = personas.slice(1);
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[92vh] flex flex-col p-0 gap-0 bg-[hsl(222,35%,7%)] border-white/[0.08] text-white overflow-hidden shadow-2xl shadow-purple-500/5">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0 bg-gradient-to-r from-purple-500/[0.04] to-transparent">
          <DialogTitle className="flex items-center gap-2.5 text-[15px] text-white font-semibold">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/20 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-purple-300" />
            </div>
            Persona Studio
            <Badge variant="outline" className="text-[9px] ml-1 text-white/40 border-white/[0.12] font-normal">
              {personas.length} active
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Active Persona Cards */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
            <p className="text-[9px] text-white/30 mb-2 tracking-widest uppercase font-medium">Active Personas</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {defaultProfile ? (
                <div className="min-w-[190px] p-3 rounded-xl bg-gradient-to-br from-purple-500/15 via-blue-500/10 to-pink-500/5 border border-purple-400/25 relative backdrop-blur-sm">
                  <div className="absolute top-2 right-2">
                    <span className="text-[7px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">DEFAULT</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold text-white truncate">
                      {defaultProfile.brand_identity?.replace(/^\[.*?\]\s*/, "").substring(0, 22) || defaultProfile.tone}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20 capitalize">{defaultProfile.tone}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 capitalize">{defaultProfile.vocabulary_style}</span>
                  </div>
                </div>
              ) : (
                <div className="min-w-[190px] p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/15 flex items-center justify-center">
                  <span className="text-[10px] text-white/25">No default persona yet</span>
                </div>
              )}
              {extraPersonas.map(p => (
                <div key={p.id} className="min-w-[160px] p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] relative group hover:border-white/15 transition-all">
                  <button onClick={() => deletePersona(p.id)} className="absolute top-1.5 right-2 text-red-400/0 group-hover:text-red-400/70 text-xs hover:text-red-300 transition-all">×</button>
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="h-3 w-3 text-white/30" />
                    <span className="text-[10px] font-medium text-white/70 truncate">{p.brand_identity?.match(/^\[(.*?)\]/)?.[1] || p.tone}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/35 capitalize">{p.tone}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/35 capitalize">{p.vocabulary_style}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar + Step Nav */}
          <div className="px-5 pt-3 pb-2 border-b border-white/[0.06] flex-shrink-0 space-y-2.5">
            <div className="relative">
              <Progress value={progressPct} className="h-1 bg-white/[0.06]" />
              <div className="absolute inset-0 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === i;
                const isDone = i < step;
                return (
                  <button key={s.id} onClick={() => setStep(i)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap transition-all duration-200 ${isActive ? "bg-white/[0.08] text-white shadow-sm" : isDone ? "text-emerald-400/60 hover:text-emerald-400/80" : "text-white/25 hover:text-white/40"}`}>
                    <Icon className={`h-3 w-3 ${isActive ? s.color : ""}`} />
                    <span className="hidden sm:inline">{s.label}</span>
                    {i < STEPS.length - 1 && <ChevronRight className="h-2 w-2 text-white/10 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-5">

              {/* ===== STEP 0: IDENTITY ===== */}
              {step === 0 && (
                <div className="space-y-5">
                  {sectionTitle(<User className="h-3.5 w-3.5 text-blue-400" />, "Who is she?", "Define the core identity")}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Persona Name *</label>
                      <Input value={persona.name} onChange={e => update("name", e.target.value)}
                        placeholder="e.g. Sweet Bella, Mysterious Luna..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 placeholder:text-white/20 focus:border-purple-500/40 focus:bg-white/[0.06] transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Age Range</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["late teens", "early 20s", "mid 20s", "late 20s", "early 30s"].map(a => (
                          <button key={a} className={chip(persona.ageRange === a)} onClick={() => update("ageRange", a)}>{a}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Humor Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["witty", "sarcastic", "dry", "goofy", "dark", "wholesome", "none"].map(h => (
                          <button key={h} className={chip(persona.humor === h)} onClick={() => update("humor", h)}>{h}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Backstory <span className="text-white/20">(AI uses this for authentic conversations)</span></label>
                    <Textarea value={persona.backstory} onChange={e => update("backstory", e.target.value)}
                      placeholder="She grew up in a small town, moved to the city for college, loves late nights and deep conversations..."
                      className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[55px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Interests & Hobbies</label>
                      <Textarea value={persona.interests} onChange={e => update("interests", e.target.value)}
                        placeholder="yoga, anime, traveling, gaming, fitness..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[50px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Brand Identity / Bio</label>
                      <Textarea value={persona.brandIdentity} onChange={e => update("brandIdentity", e.target.value)}
                        placeholder="The girl next door who's secretly wild..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[50px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 1: VOICE & TONE ===== */}
              {step === 1 && (
                <div className="space-y-5">
                  {sectionTitle(<Volume2 className="h-3.5 w-3.5 text-purple-400" />, "How does she sound?", "Define voice characteristics")}
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Primary Tone</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TONES.map(t => (
                        <button key={t} className={chip(persona.tone === t)} onClick={() => update("tone", t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Secondary Tone <span className="text-white/20">(blended in 30% of replies)</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {["none", ...TONES.filter(t => t !== persona.tone)].map(t => (
                        <button key={t} className={chip(persona.secondaryTone === t)} onClick={() => update("secondaryTone", t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Vocabulary Style</label>
                      <div className="flex flex-wrap gap-1.5">
                        {VOCAB_STYLES.map(v => (
                          <button key={v} className={chip(persona.vocabStyle === v)} onClick={() => update("vocabStyle", v)}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Language Style</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["gen-z slang", "proper english", "mixed", "abbreviations", "bilingual hints"].map(l => (
                          <button key={l} className={chip(persona.languageStyle === l)} onClick={() => update("languageStyle", l)}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Emoji Usage</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["none", "minimal", "moderate", "heavy"].map(e => (
                          <button key={e} className={chip(persona.emojiUsage === e)} onClick={() => update("emojiUsage", e)}>{e}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Message Length</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["ultra-short", "short", "medium", "long"].map(l => (
                          <button key={l} className={chip(persona.messageLength === l)} onClick={() => update("messageLength", l)}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Catchphrases & Signature Lines</label>
                    <Textarea value={persona.catchphrases} onChange={e => update("catchphrases", e.target.value)}
                      placeholder={`"you're trouble 😏", "hmm let me think about that...", "I don't usually do this but..."`}
                      className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[45px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                  </div>
                </div>
              )}

              {/* ===== STEP 2: PERSONALITY ===== */}
              {step === 2 && (
                <div className="space-y-5">
                  {sectionTitle(<Heart className="h-3.5 w-3.5 text-pink-400" />, "Who is she on the inside?", "Emotional depth & character")}
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Emotional Range</label>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOTIONAL_RANGES.map(e => (
                        <button key={e} className={chip(persona.emotionalRange === e)} onClick={() => update("emotionalRange", e)}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Attachment Style</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["secure-playful", "anxious-clingy", "avoidant-mysterious", "push-pull", "hot-cold"].map(a => (
                        <button key={a} className={chip(persona.attachmentStyle === a)} onClick={() => update("attachmentStyle", a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Personality Traits</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {persona.traits.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-purple-500/20 text-purple-300 px-2 py-0.5 bg-purple-500/5">
                          {t}<button onClick={() => removeTrait(i)} className="ml-1.5 text-red-400/70 hover:text-red-300">×</button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input value={newTrait} onChange={e => setNewTrait(e.target.value)} onKeyDown={e => e.key === "Enter" && addTrait()}
                        placeholder="Add custom trait..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-7 flex-1 placeholder:text-white/20" />
                      <Button size="sm" onClick={addTrait} className="h-7 text-[10px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {["witty", "sarcastic", "caring", "teasing", "confident", "mysterious", "warm", "provocative", "attentive", "unpredictable", "jealous", "loyal"].map(t => (
                        <button key={t} onClick={() => { if (!persona.traits.includes(t)) update("traits", [...persona.traits, t]); }}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${persona.traits.includes(t) ? "text-purple-400 bg-purple-500/10" : "text-white/25 hover:text-purple-300"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  {/* Personality Sliders */}
                  <div className="grid grid-cols-3 gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div>
                      <label className="text-[9px] text-white/35 mb-1 block">🔥 Flirt: {persona.flirtLevel}%</label>
                      <Slider value={[persona.flirtLevel]} onValueChange={([v]) => update("flirtLevel", v)} max={100} step={5} />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/35 mb-1 block">💖 Warmth: {persona.warmth}%</label>
                      <Slider value={[persona.warmth]} onValueChange={([v]) => update("warmth", v)} max={100} step={5} />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/35 mb-1 block">🌙 Mystery: {persona.mystery}%</label>
                      <Slider value={[persona.mystery]} onValueChange={([v]) => update("mystery", v)} max={100} step={5} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">What turns her on (conversation-wise)</label>
                      <Textarea value={persona.turnOns} onChange={e => update("turnOns", e.target.value)}
                        placeholder="confident men, deep conversations, humor, compliments on personality..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[45px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">What turns her off</label>
                      <Textarea value={persona.turnOffs} onChange={e => update("turnOffs", e.target.value)}
                        placeholder="desperate messages, rudeness, being too forward too fast..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[45px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 3: CHAT STRATEGY ===== */}
              {step === 3 && (
                <div className="space-y-5">
                  {sectionTitle(<Zap className="h-3.5 w-3.5 text-amber-400" />, "How does she convert?", "Monetization & engagement tactics")}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Response Speed</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["instant", "natural", "slow", "very slow"].map(s => (
                          <button key={s} className={chip(persona.responseSpeed === s)} onClick={() => update("responseSpeed", s)}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Hook Style</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["curiosity", "compliment", "challenge", "story", "question", "tease", "vulnerability", "humor"].map(h => (
                          <button key={h} className={chip(persona.hookStyle === h)} onClick={() => update("hookStyle", h)}>{h}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Objection Handling</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["soft deflect", "playful reframe", "confident redirect", "emotional appeal", "scarcity push", "ignore & pivot"].map(o => (
                          <button key={o} className={chip(persona.objectionHandling === o)} onClick={() => update("objectionHandling", o)}>{o}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Recovery Style (after rejection)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["playful", "unbothered", "sweet understanding", "curious", "go silent", "change topic"].map(r => (
                          <button key={r} className={chip(persona.recoveryStyle === r)} onClick={() => update("recoveryStyle", r)}>{r}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div>
                      <label className="text-[9px] text-white/35 mb-1 block">🎯 Redirect Aggressiveness: {persona.redirectAggressiveness}%</label>
                      <Slider value={[persona.redirectAggressiveness]} onValueChange={([v]) => update("redirectAggressiveness", v)} max={100} step={5} />
                      <div className="flex justify-between text-[8px] text-white/15 mt-0.5"><span>Subtle</span><span>Direct</span><span>Hard sell</span></div>
                    </div>
                    <div>
                      <label className="text-[9px] text-white/35 mb-1 block">👑 Dominance: {persona.dominance}%</label>
                      <Slider value={[persona.dominance]} onValueChange={([v]) => update("dominance", v)} max={100} step={5} />
                      <div className="flex justify-between text-[8px] text-white/15 mt-0.5"><span>Submissive</span><span>Balanced</span><span>Dominant</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 4: ADVANCED ===== */}
              {step === 4 && (
                <div className="space-y-5">
                  {sectionTitle(<Target className="h-3.5 w-3.5 text-cyan-400" />, "Advanced Configuration", "Fine-tune behavior & context")}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Pricing Mentality</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["premium", "accessible", "value-based", "exclusive", "flexible"].map(p => (
                          <button key={p} className={chip(persona.pricingMentality === p)} onClick={() => update("pricingMentality", p)}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Competitor Mentions</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["ignore", "subtle redirect", "acknowledge & pivot", "friendly comparison"].map(c => (
                          <button key={c} className={chip(persona.competitorMention === c)} onClick={() => update("competitorMention", c)}>{c}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Content Themes <span className="text-white/20">(what she talks about)</span></label>
                    <Textarea value={persona.contentThemes} onChange={e => update("contentThemes", e.target.value)}
                      placeholder="lifestyle, fitness, behind-the-scenes, personal stories, travel, nightlife..."
                      className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[45px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/[0.06] to-purple-500/[0.04] border border-cyan-500/15">
                    <label className="text-[10px] text-white/50 mb-1.5 flex items-center gap-1.5 font-semibold">
                      <FileText className="h-3 w-3 text-cyan-400" />
                      Additional Information for AI <span className="text-white/20 font-normal">(free-form, max 500 lines)</span>
                    </label>
                    <p className="text-[9px] text-white/25 mb-2">Paste anything — scripts, example convos, do's and don'ts, SOPs, CRM notes, funnel logic. The AI will analyze and integrate everything.</p>
                    <Textarea value={persona.additionalInfo} onChange={e => update("additionalInfo", e.target.value)}
                      placeholder={`Paste any additional context here...\n\nExamples:\n- Sample conversations that worked well\n- Specific scripts or funnels to follow\n- "Always mention X when fan says Y"\n- Content pricing tiers\n- Upsell sequences\n- Do's and don'ts\n- Fan segmentation rules\n- Seasonal promotions or themes\n- Anything else the AI should know...`}
                      className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-[180px] placeholder:text-white/15 resize-y focus:border-cyan-500/30 font-mono leading-relaxed"
                      maxLength={50000} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[8px] text-white/20">{persona.additionalInfo.split("\n").length} / 500 lines</span>
                      <span className="text-[8px] text-white/20">{persona.additionalInfo.length.toLocaleString()} chars</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 5: BOUNDARIES ===== */}
              {step === 5 && (
                <div className="space-y-5">
                  {sectionTitle(<Shield className="h-3.5 w-3.5 text-emerald-400" />, "Hard Limits & Rules", "These are never broken")}
                  <div>
                    <label className="text-[10px] text-white/35 mb-1.5 block font-medium">Content Boundaries & Rules</label>
                    <Textarea value={persona.boundaries} onChange={e => update("boundaries", e.target.value)}
                      placeholder="No face content, no extreme fetish, max 3 customs/week, never share personal info, don't discuss other creators, no meet-ups, no personal social media..."
                      className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[120px] placeholder:text-white/20 resize-none focus:border-emerald-500/30" />
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/15">
                    <p className="text-[10px] text-amber-400/70 flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>These boundaries are <strong className="text-amber-300">hard-enforced</strong> — the AI will never cross them regardless of fan pressure, spending level, or conversation context.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ===== STEP 6: REVIEW ===== */}
              {step === 6 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/5 border border-purple-400/20 backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" /> {persona.name || "Unnamed Persona"}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                      {[
                        ["Tone", persona.tone, "text-purple-400"],
                        ["Secondary", persona.secondaryTone || "none", "text-purple-300"],
                        ["Vocab", persona.vocabStyle, "text-blue-400"],
                        ["Emotional", persona.emotionalRange, "text-pink-400"],
                        ["Age", persona.ageRange, "text-white/60"],
                        ["Emoji", persona.emojiUsage, "text-white/60"],
                        ["Msg Length", persona.messageLength, "text-white/60"],
                        ["Hook", persona.hookStyle, "text-amber-400"],
                        ["Humor", persona.humor, "text-cyan-400"],
                        ["Attachment", persona.attachmentStyle, "text-pink-300"],
                        ["Recovery", persona.recoveryStyle, "text-emerald-400"],
                        ["Pricing", persona.pricingMentality, "text-amber-300"],
                      ].map(([label, val, color]) => (
                        <div key={label as string}><span className="text-white/30">{label}:</span> <span className={`${color} capitalize`}>{val}</span></div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 p-2 rounded-lg bg-white/[0.03]">
                      {[
                        ["🔥 Flirt", persona.flirtLevel],
                        ["💖 Warmth", persona.warmth],
                        ["🌙 Mystery", persona.mystery],
                        ["👑 Dom", persona.dominance],
                      ].map(([label, val]) => (
                        <div key={label as string} className="text-center">
                          <div className="text-[9px] text-white/25">{label}</div>
                          <div className="text-xs font-bold text-white">{val}%</div>
                        </div>
                      ))}
                    </div>
                    {persona.traits.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {persona.traits.map((t, i) => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">{t}</span>
                        ))}
                      </div>
                    )}
                    {persona.brandIdentity && <p className="text-[10px] text-white/30 mt-2 italic">"{persona.brandIdentity}"</p>}
                    {persona.additionalInfo && (
                      <div className="mt-2 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                        <p className="text-[9px] text-cyan-400/60 flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> {persona.additionalInfo.split("\n").length} lines of additional context attached</p>
                      </div>
                    )}
                  </div>
                  <Button onClick={savePersona} disabled={saving || !persona.name.trim()}
                    className="w-full h-10 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-purple-500/20 border-0">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Create Persona
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Nav */}
          <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-transparent to-purple-500/[0.02]">
            <Button size="sm" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="h-8 text-[10px] text-white/40 hover:text-white gap-1 px-3">
              <ChevronLeft className="h-3 w-3" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${i === step ? "bg-purple-400 w-4" : i < step ? "bg-emerald-500/50" : "bg-white/10"}`} />
              ))}
            </div>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}
                className="h-8 text-[10px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-1 px-3 border-0 shadow-sm">
                Next <ChevronRight className="h-3 w-3" />
              </Button>
            ) : <div className="w-16" />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaCreatorDialog;

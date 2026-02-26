import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Sparkles, Plus, Loader2, ChevronRight, ChevronLeft,
  Save, User, Heart, Shield, Volume2, Zap, Check,
  Crown, FileText, Target, GitBranch, Pencil, Trash2,
} from "lucide-react";

interface PersonaCreatorDialogProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TONES = ["sweet", "dominant", "playful", "mysterious", "bratty", "innocent", "seductive", "nurturing", "edgy", "sophisticated"];
const VOCAB_STYLES = ["casual", "flirty", "intellectual", "street", "elegant", "cutesy", "confident", "poetic"];
const EMOTIONAL_RANGES = ["low", "medium", "high", "volatile"];

interface FlowPhase {
  phase_number: number;
  name: string;
  goal: string;
  ai_instructions: string;
  transition_trigger: string;
  example_messages: string;
  redirect_url: string;
  is_active: boolean;
}

const DEFAULT_PHASE_NAMES = [
  "Hook & Engage",
  "Build Rapport",
  "Create Desire",
  "Soft Pitch",
  "Close & Convert",
  "Follow Up",
];

const DEFAULT_PHASE_GOALS = [
  "Capture attention and start a genuine conversation. Make the prospect feel seen.",
  "Establish trust and emotional connection. Learn about their interests and desires.",
  "Build anticipation and curiosity about exclusive content. Tease without giving too much.",
  "Introduce your offer naturally. Frame it as something special, not a sales pitch.",
  "Guide them to take action — subscribe, purchase, or visit your link.",
  "Re-engage prospects who didn't convert. Use callbacks to previous conversation points.",
];

const createDefaultPhase = (num: number): FlowPhase => ({
  phase_number: num,
  name: DEFAULT_PHASE_NAMES[num - 1] || `Phase ${num}`,
  goal: DEFAULT_PHASE_GOALS[num - 1] || "",
  ai_instructions: "",
  transition_trigger: "",
  example_messages: "",
  redirect_url: "",
  is_active: true,
});

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
  systemPrompt: string;
  flowPhases: FlowPhase[];
}

const STEPS = [
  { id: "identity", label: "Identity", icon: User, color: "text-blue-400" },
  { id: "voice", label: "Voice & Tone", icon: Volume2, color: "text-purple-400" },
  { id: "personality", label: "Personality", icon: Heart, color: "text-pink-400" },
  { id: "strategy", label: "Strategy", icon: Zap, color: "text-amber-400" },
  { id: "flow", label: "Conversion Flow", icon: GitBranch, color: "text-orange-400" },
  { id: "advanced", label: "Advanced", icon: Target, color: "text-cyan-400" },
  { id: "boundaries", label: "Boundaries", icon: Shield, color: "text-emerald-400" },
  { id: "review", label: "Save", icon: Check, color: "text-green-400" },
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
  systemPrompt: "",
  flowPhases: [],
};

const PersonaCreatorDialog = ({ accountId, open, onOpenChange }: PersonaCreatorDialogProps) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);
  const [persona, setPersona] = useState<PersonaData>({ ...defaultPersona });
  const [newTrait, setNewTrait] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [defaultPersonaType, setDefaultPersonaType] = useState<string>("male");
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [activeFlowPhase, setActiveFlowPhase] = useState(0);

  useEffect(() => {
    if (open) { loadPersonas(); loadActivePersona(); resetForm(); }
  }, [open, accountId]);

  // Realtime sync
  useEffect(() => {
    const ch = supabase.channel("persona-dialog-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "persona_profiles", filter: `account_id=eq.${accountId}` }, () => loadPersonas())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [accountId]);

  const resetForm = () => {
    setStep(0);
    setPersona({ ...defaultPersona });
    setEditingPersonaId(null);
    setActiveFlowPhase(0);
  };

  const loadActivePersona = async () => {
    const { data } = await supabase.from("managed_accounts").select("active_persona_id, default_persona_type").eq("id", accountId).single();
    setActivePersonaId((data as any)?.active_persona_id || null);
    setDefaultPersonaType((data as any)?.default_persona_type || "male");
  };

  const switchDefaultType = async (type: "male" | "female") => {
    await supabase.from("managed_accounts").update({ active_persona_id: null, default_persona_type: type } as any).eq("id", accountId);
    setActivePersonaId(null);
    setDefaultPersonaType(type);
    toast.success(`Switched to ${type} default persona`);
  };

  const activatePersona = async (personaId: string | null) => {
    await supabase.from("managed_accounts").update({ active_persona_id: personaId } as any).eq("id", accountId);
    setActivePersonaId(personaId);
    toast.success(personaId ? "Persona activated — AI will use this persona" : "Switched to default persona");
  };

  const loadPersonas = async () => {
    setLoading(true);
    const { data } = await supabase.from("persona_profiles").select("*").eq("account_id", accountId).order("created_at", { ascending: true });
    setPersonas(data || []);
    setLoading(false);
  };

  const update = (key: keyof PersonaData, value: any) => setPersona(prev => ({ ...prev, [key]: value }));
  const addTrait = () => { if (newTrait.trim() && !persona.traits.includes(newTrait.trim())) { update("traits", [...persona.traits, newTrait.trim()]); setNewTrait(""); } };
  const removeTrait = (i: number) => update("traits", persona.traits.filter((_, j) => j !== i));

  const loadPersonaForEditing = (p: any) => {
    const commRules = (p.communication_rules || {}) as any;
    const rawPhases = (p.conversion_flow_phases as any) || [];
    const phases: FlowPhase[] = Array.isArray(rawPhases) ? rawPhases : [];
    setPersona({
      name: p.brand_identity?.match(/^\[(.*?)\]/)?.[1] || p.tone || "",
      tone: p.tone || "playful",
      secondaryTone: commRules.secondary_tone || "",
      vocabStyle: p.vocabulary_style || "casual",
      emotionalRange: p.emotional_range || "medium",
      brandIdentity: (p.brand_identity?.replace(/^\[.*?\]\s*/, "") || ""),
      boundaries: p.boundaries || "",
      traits: (p.personality_traits as string[]) || [],
      ageRange: commRules.age_range || "early 20s",
      interests: commRules.interests || "",
      flirtLevel: commRules.flirt_level ?? 70,
      redirectAggressiveness: commRules.redirect_aggressiveness ?? 60,
      emojiUsage: commRules.emoji_usage || "minimal",
      messageLength: commRules.message_length || "short",
      responseSpeed: commRules.response_speed || "natural",
      hookStyle: commRules.hook_style || "curiosity",
      objectionHandling: commRules.objection_handling || "soft deflect",
      additionalInfo: commRules.additional_info || "",
      backstory: commRules.backstory || "",
      turnOns: commRules.turn_ons || "",
      turnOffs: commRules.turn_offs || "",
      catchphrases: commRules.catchphrases || "",
      languageStyle: commRules.language_style || "",
      humor: commRules.humor || "witty",
      attachmentStyle: commRules.attachment_style || "secure-playful",
      contentThemes: commRules.content_themes || "",
      pricingMentality: commRules.pricing_mentality || "premium",
      competitorMention: commRules.competitor_mention || "ignore",
      recoveryStyle: commRules.recovery_style || "playful",
      warmth: commRules.warmth ?? 70,
      mystery: commRules.mystery ?? 50,
      dominance: commRules.dominance ?? 40,
      systemPrompt: p.system_prompt || "",
      flowPhases: phases,
    });
    setEditingPersonaId(p.id);
    setStep(0);
    setActiveFlowPhase(0);
  };

  const buildPayload = () => {
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
    return {
      account_id: accountId, tone: persona.tone, vocabulary_style: persona.vocabStyle,
      emotional_range: persona.emotionalRange,
      brand_identity: `[${persona.name}] ${persona.brandIdentity}`,
      boundaries: persona.boundaries || null, personality_traits: persona.traits,
      communication_rules: commRules, motivation_level: 70, stress_level: 30,
      burnout_risk: 20, mood: "neutral", last_mood_update: new Date().toISOString(),
      system_prompt: persona.systemPrompt || null,
      conversion_flow_phases: persona.flowPhases.length > 0 ? persona.flowPhases : [],
    };
  };

  const savePersona = async () => {
    if (!persona.name.trim()) { toast.error("Give your persona a name"); return; }
    setSaving(true);
    const payload = buildPayload();

    if (editingPersonaId) {
      const { error } = await supabase.from("persona_profiles").update(payload as any).eq("id", editingPersonaId);
      if (error) toast.error(error.message);
      else { toast.success(`Persona "${persona.name}" updated!`); await loadPersonas(); }
    } else {
      const { error } = await supabase.from("persona_profiles").insert(payload as any);
      if (error) toast.error(error.message);
      else { toast.success(`Persona "${persona.name}" created!`); await loadPersonas(); resetForm(); }
    }
    setSaving(false);
  };

  const deletePersona = async (id: string) => {
    if (editingPersonaId === id) resetForm();
    await supabase.from("persona_profiles").delete().eq("id", id);
    if (activePersonaId === id) {
      await supabase.from("managed_accounts").update({ active_persona_id: null } as any).eq("id", accountId);
      setActivePersonaId(null);
    }
    toast.success("Persona deleted"); loadPersonas();
  };

  // Flow phase helpers
  const updatePhase = (idx: number, key: keyof FlowPhase, value: any) => {
    const phases = [...persona.flowPhases];
    phases[idx] = { ...phases[idx], [key]: value };
    update("flowPhases", phases);
  };

  const addPhase = () => {
    if (persona.flowPhases.length >= 6) { toast.error("Maximum 6 phases"); return; }
    update("flowPhases", [...persona.flowPhases, createDefaultPhase(persona.flowPhases.length + 1)]);
    setActiveFlowPhase(persona.flowPhases.length);
  };

  const removePhase = (idx: number) => {
    const phases = persona.flowPhases.filter((_, i) => i !== idx).map((p, i) => ({ ...p, phase_number: i + 1 }));
    update("flowPhases", phases);
    if (activeFlowPhase >= phases.length) setActiveFlowPhase(Math.max(0, phases.length - 1));
  };

  const chip = (active: boolean) =>
    `px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all duration-200 ${active
      ? "bg-gradient-to-r from-purple-500/30 to-blue-500/20 text-white border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
      : "bg-white/[0.04] text-white/45 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/70 hover:border-white/15"}`;

  const sectionTitle = (icon: React.ReactNode, label: string, hint?: string) => (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[12px] font-semibold text-white/80 tracking-wide uppercase">{label}</span>
      {hint && <span className="text-[10px] text-white/25 ml-auto italic">{hint}</span>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[88vh] flex flex-col p-0 gap-0 bg-[hsl(222,35%,7%)] border-white/[0.08] text-white overflow-hidden shadow-2xl shadow-purple-500/5">
        {/* Header */}
        <DialogHeader className="px-5 py-2.5 border-b border-white/[0.06] flex-shrink-0 bg-gradient-to-r from-purple-500/[0.04] to-transparent">
          <DialogTitle className="flex items-center gap-2.5 text-[15px] text-white font-semibold">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/20 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-purple-300" />
            </div>
            Persona Studio
            {editingPersonaId && <Badge variant="outline" className="text-[9px] ml-1 text-amber-400 border-amber-500/30 font-normal">EDITING</Badge>}
            <Badge variant="outline" className="text-[9px] ml-1 text-white/40 border-white/[0.12] font-normal">
              {personas.length} active
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Horizontal Layout: Left sidebar + Right content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT SIDEBAR — Personas + Step Nav */}
          <div className="w-[280px] flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
            {/* Default Personas Card */}
            <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
              <p className="text-[9px] text-white/30 mb-2 tracking-widest uppercase font-medium">Default Personas</p>
              {/* Male Default */}
              <button onClick={() => switchDefaultType("male")} className="w-full mb-2">
                <div className={`p-2.5 rounded-xl relative backdrop-blur-sm transition-all ${
                  !activePersonaId && defaultPersonaType === "male"
                    ? "bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-emerald-500/5 border border-blue-400/25"
                    : "bg-white/[0.03] border border-white/[0.08] hover:border-white/15"
                }`}>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <span className="text-[6px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.5 rounded-full">DEFAULT</span>
                    {!activePersonaId && defaultPersonaType === "male" && <span className="text-[6px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded-full">ACTIVE</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Crown className="h-3 w-3 text-blue-400" />
                    <span className="text-[11px] font-semibold text-white">♂ Male (Default)</span>
                  </div>
                  <div className="space-y-0 text-[8px] text-white/50 leading-[1.5] text-left">
                    <p>• Young businessman, late 20s — professional, friendly, direct</p>
                    <p>• No emojis, no fluff, concise answers</p>
                    <p>• Business-oriented, answers product questions directly</p>
                  </div>
                </div>
              </button>
              {/* Female Default */}
              <button onClick={() => switchDefaultType("female")} className="w-full">
                <div className={`p-2.5 rounded-xl relative backdrop-blur-sm transition-all ${
                  !activePersonaId && defaultPersonaType === "female"
                    ? "bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-rose-500/5 border border-purple-400/25"
                    : "bg-white/[0.03] border border-white/[0.08] hover:border-white/15"
                }`}>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <span className="text-[6px] font-bold tracking-wider uppercase bg-pink-500/20 text-pink-400 border border-pink-500/30 px-1 py-0.5 rounded-full">DEFAULT</span>
                    {!activePersonaId && defaultPersonaType === "female" && <span className="text-[6px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded-full">ACTIVE</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Crown className="h-3 w-3 text-pink-400" />
                    <span className="text-[11px] font-semibold text-white">♀ Female (Default)</span>
                  </div>
                  <div className="space-y-0 text-[8px] text-white/50 leading-[1.5] text-left">
                    <p>• Young woman, early 20s — chill, warm, subtly seductive</p>
                    <p>• No emojis, no apostrophes, minimal punctuation</p>
                    <p>• Subtle psychological redirection to bio link</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Persona List — select, edit & apply */}
            <div className="p-3 border-b border-white/[0.06] flex-shrink-0 max-h-[220px] overflow-y-auto">
              <p className="text-[9px] text-white/30 mb-2 tracking-widest uppercase font-medium">Custom Personas</p>
              <div className="space-y-1.5">
                {personas.map(p => {
                  const pName = p.brand_identity?.match(/^\[(.*?)\]/)?.[1] || p.tone;
                  const isActive = activePersonaId === p.id;
                  const isEditing = editingPersonaId === p.id;
                  const phases = Array.isArray(p.conversion_flow_phases) ? p.conversion_flow_phases : [];
                  return (
                    <div key={p.id} className={`p-2 rounded-lg relative group transition-all ${
                      isEditing ? "bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/30" :
                      isActive ? "bg-gradient-to-r from-purple-500/15 to-blue-500/10 border border-purple-400/30" : "bg-white/[0.03] border border-white/[0.08] hover:border-white/15"
                    }`}>
                      <div className="absolute top-1 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => loadPersonaForEditing(p)} className="text-amber-400/70 hover:text-amber-300 text-xs" title="Edit">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => deletePersona(p.id)} className="text-red-400/70 hover:text-red-300 text-xs" title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => activatePersona(p.id)} className="w-full text-left">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-white/30" />
                          <span className="text-[10px] font-medium text-white/70 truncate">{pName}</span>
                          {isActive && <span className="text-[6px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1 py-0.5 rounded-full ml-auto">ACTIVE</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[7px] px-1 py-0.5 rounded-full bg-white/5 text-white/35 capitalize">{p.tone}</span>
                          <span className="text-[7px] px-1 py-0.5 rounded-full bg-white/5 text-white/35 capitalize">{p.vocabulary_style}</span>
                          {phases.length > 0 && (
                            <span className="text-[7px] px-1 py-0.5 rounded-full bg-orange-500/10 text-orange-400/70">
                              <GitBranch className="h-2 w-2 inline mr-0.5" />{phases.length} phases
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
                {personas.length === 0 && <p className="text-[9px] text-white/25 italic">No custom personas yet</p>}
              </div>
            </div>

            {/* Step Navigation — vertical */}
            <div className="p-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-white/30 tracking-widest uppercase font-medium">
                  {editingPersonaId ? "Edit Persona" : "Create New"}
                </p>
                {editingPersonaId && (
                  <button onClick={resetForm} className="text-[8px] text-amber-400/60 hover:text-amber-300 underline">
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = step === i;
                  const isDone = i < step;
                  return (
                    <button key={s.id} onClick={() => setStep(i)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all duration-200 ${isActive ? "bg-white/[0.08] text-white shadow-sm" : isDone ? "text-emerald-400/60 hover:text-emerald-400/80" : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"}`}>
                      <Icon className={`h-3.5 w-3.5 ${isActive ? s.color : ""}`} />
                      {s.label}
                      {isDone && <Check className="h-2.5 w-2.5 ml-auto text-emerald-500/50" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Step Content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Progress */}
            <div className="h-1 flex-shrink-0 bg-white/[0.04] relative">
              <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${Math.round(((step + 1) / STEPS.length) * 100)}%` }} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              <div className="max-w-[800px] space-y-4">

                {/* STEP 0: IDENTITY */}
                {step === 0 && (
                  <div className="space-y-4">
                    {sectionTitle(<User className="h-4 w-4 text-blue-400" />, "Who is she?", "Define the core identity")}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Persona Name *</label>
                        <Input value={persona.name} onChange={e => update("name", e.target.value)}
                          placeholder="e.g. Sweet Bella..."
                          className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 placeholder:text-white/20 focus:border-purple-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Age Range</label>
                        <div className="flex flex-wrap gap-1">
                          {["late teens", "early 20s", "mid 20s", "late 20s", "early 30s"].map(a => (
                            <button key={a} className={chip(persona.ageRange === a)} onClick={() => update("ageRange", a)}>{a}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Humor Type</label>
                        <div className="flex flex-wrap gap-1">
                          {["witty", "sarcastic", "dry", "goofy", "dark", "wholesome", "none"].map(h => (
                            <button key={h} className={chip(persona.humor === h)} onClick={() => update("humor", h)}>{h}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1 block font-medium">Backstory <span className="text-white/20">(AI uses this for authentic conversations)</span></label>
                      <Textarea value={persona.backstory} onChange={e => update("backstory", e.target.value)}
                        placeholder="She grew up in a small town, moved to the city for college..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[50px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Interests & Hobbies</label>
                        <Textarea value={persona.interests} onChange={e => update("interests", e.target.value)}
                          placeholder="yoga, anime, traveling, gaming, fitness..."
                          className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[45px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Brand Identity / Bio</label>
                        <Textarea value={persona.brandIdentity} onChange={e => update("brandIdentity", e.target.value)}
                          placeholder="The girl next door who's secretly wild..."
                          className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[45px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: VOICE & TONE */}
                {step === 1 && (
                  <div className="space-y-4">
                    {sectionTitle(<Volume2 className="h-4 w-4 text-purple-400" />, "How does she sound?", "Define voice characteristics")}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Primary Tone</label>
                        <div className="flex flex-wrap gap-1">{TONES.map(t => (
                          <button key={t} className={chip(persona.tone === t)} onClick={() => update("tone", t)}>{t}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Secondary Tone <span className="text-white/20">(30%)</span></label>
                        <div className="flex flex-wrap gap-1">{["none", ...TONES.filter(t => t !== persona.tone)].map(t => (
                          <button key={t} className={chip(persona.secondaryTone === t)} onClick={() => update("secondaryTone", t)}>{t}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Vocabulary Style</label>
                        <div className="flex flex-wrap gap-1">{VOCAB_STYLES.map(v => (
                          <button key={v} className={chip(persona.vocabStyle === v)} onClick={() => update("vocabStyle", v)}>{v}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Language Style</label>
                        <div className="flex flex-wrap gap-1">{["gen-z slang", "proper english", "mixed", "abbreviations", "bilingual hints"].map(l => (
                          <button key={l} className={chip(persona.languageStyle === l)} onClick={() => update("languageStyle", l)}>{l}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Emoji Usage</label>
                        <div className="flex flex-wrap gap-1">{["none", "minimal", "moderate", "heavy"].map(e => (
                          <button key={e} className={chip(persona.emojiUsage === e)} onClick={() => update("emojiUsage", e)}>{e}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Message Length</label>
                        <div className="flex flex-wrap gap-1">{["ultra-short", "short", "medium", "long"].map(l => (
                          <button key={l} className={chip(persona.messageLength === l)} onClick={() => update("messageLength", l)}>{l}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1 block font-medium">Catchphrases</label>
                      <Textarea value={persona.catchphrases} onChange={e => update("catchphrases", e.target.value)}
                        placeholder={`"you're trouble 😏", "hmm let me think about that..."`}
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[40px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                  </div>
                )}

                {/* STEP 2: PERSONALITY */}
                {step === 2 && (
                  <div className="space-y-4">
                    {sectionTitle(<Heart className="h-4 w-4 text-pink-400" />, "Who is she on the inside?", "Emotional depth & character")}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Emotional Range</label>
                        <div className="flex flex-wrap gap-1">{EMOTIONAL_RANGES.map(e => (
                          <button key={e} className={chip(persona.emotionalRange === e)} onClick={() => update("emotionalRange", e)}>{e}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Attachment Style</label>
                        <div className="flex flex-wrap gap-1">{["secure-playful", "anxious-clingy", "avoidant-mysterious", "push-pull", "hot-cold"].map(a => (
                          <button key={a} className={chip(persona.attachmentStyle === a)} onClick={() => update("attachmentStyle", a)}>{a}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1 block font-medium">Personality Traits</label>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {persona.traits.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-purple-500/20 text-purple-300 px-2 py-0.5 bg-purple-500/5">
                            {t}<button onClick={() => removeTrait(i)} className="ml-1 text-red-400/70 hover:text-red-300">×</button>
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
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {["witty", "sarcastic", "caring", "teasing", "confident", "mysterious", "warm", "provocative", "attentive", "unpredictable", "jealous", "loyal"].map(t => (
                          <button key={t} onClick={() => { if (!persona.traits.includes(t)) update("traits", [...persona.traits, t]); }}
                            className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${persona.traits.includes(t) ? "text-purple-400 bg-purple-500/10" : "text-white/25 hover:text-purple-300"}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
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
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Turn-ons (convo-wise)</label>
                        <Textarea value={persona.turnOns} onChange={e => update("turnOns", e.target.value)}
                          placeholder="confident men, deep conversations..."
                          className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[40px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Turn-offs</label>
                        <Textarea value={persona.turnOffs} onChange={e => update("turnOffs", e.target.value)}
                          placeholder="desperate messages, rudeness..."
                          className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[40px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: CHAT STRATEGY */}
                {step === 3 && (
                  <div className="space-y-4">
                    {sectionTitle(<Zap className="h-4 w-4 text-amber-400" />, "How does she convert?", "Monetization & engagement")}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Response Speed</label>
                        <div className="flex flex-wrap gap-1">{["instant", "natural", "slow", "very slow"].map(s => (
                          <button key={s} className={chip(persona.responseSpeed === s)} onClick={() => update("responseSpeed", s)}>{s}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Hook Style</label>
                        <div className="flex flex-wrap gap-1">{["curiosity", "compliment", "challenge", "story", "question", "tease", "vulnerability", "humor"].map(h => (
                          <button key={h} className={chip(persona.hookStyle === h)} onClick={() => update("hookStyle", h)}>{h}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Objection Handling</label>
                        <div className="flex flex-wrap gap-1">{["soft deflect", "playful reframe", "confident redirect", "emotional appeal", "scarcity push", "ignore & pivot"].map(o => (
                          <button key={o} className={chip(persona.objectionHandling === o)} onClick={() => update("objectionHandling", o)}>{o}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Recovery Style</label>
                        <div className="flex flex-wrap gap-1">{["playful", "unbothered", "sweet understanding", "curious", "go silent", "change topic"].map(r => (
                          <button key={r} className={chip(persona.recoveryStyle === r)} onClick={() => update("recoveryStyle", r)}>{r}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
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

                {/* STEP 4: CONVERSION FLOW PHASES */}
                {step === 4 && (
                  <div className="space-y-4">
                    {sectionTitle(<GitBranch className="h-4 w-4 text-orange-400" />, "Conversion Flow Phases", "Define up to 6 phases the AI follows to convert prospects")}
                    
                    <div className="p-3 rounded-xl bg-orange-500/[0.04] border border-orange-500/15">
                      <p className="text-[10px] text-orange-400/70 flex items-start gap-2">
                        <GitBranch className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>Each phase defines a stage in the conversation funnel. The AI will naturally progress through phases based on <strong className="text-orange-300">transition triggers</strong> you define. This interconnects with your persona's tone, hook style, and redirect settings to create a cohesive conversion strategy.</span>
                      </p>
                    </div>

                    {/* Phase tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {persona.flowPhases.map((phase, idx) => (
                        <button key={idx} onClick={() => setActiveFlowPhase(idx)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                            activeFlowPhase === idx
                              ? "bg-gradient-to-r from-orange-500/25 to-amber-500/15 text-orange-300 border border-orange-400/40 shadow-[0_0_10px_rgba(251,146,60,0.1)]"
                              : "bg-white/[0.04] text-white/40 border border-white/[0.08] hover:text-white/60 hover:border-white/15"
                          }`}>
                          <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">{idx + 1}</span>
                          {phase.name || `Phase ${idx + 1}`}
                          {!phase.is_active && <span className="text-[7px] text-red-400/60">OFF</span>}
                        </button>
                      ))}
                      {persona.flowPhases.length < 6 && (
                        <button onClick={addPhase}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-orange-500/10 text-orange-400/70 border border-orange-500/20 hover:bg-orange-500/20 hover:text-orange-300 transition-all flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add Phase
                        </button>
                      )}
                    </div>

                    {/* Active phase editor */}
                    {persona.flowPhases.length > 0 && persona.flowPhases[activeFlowPhase] && (
                      <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/20 flex items-center justify-center text-[10px] font-bold text-orange-300">
                              {activeFlowPhase + 1}
                            </span>
                            <span className="text-[12px] font-semibold text-white/70">Phase {activeFlowPhase + 1} of {persona.flowPhases.length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <span className="text-[9px] text-white/30">Active</span>
                              <button onClick={() => updatePhase(activeFlowPhase, "is_active", !persona.flowPhases[activeFlowPhase].is_active)}
                                className={`w-8 h-4 rounded-full transition-all ${persona.flowPhases[activeFlowPhase].is_active ? "bg-emerald-500/40" : "bg-white/10"}`}>
                                <div className={`w-3 h-3 rounded-full bg-white transition-all ${persona.flowPhases[activeFlowPhase].is_active ? "ml-4.5 translate-x-0.5" : "ml-0.5"}`} />
                              </button>
                            </label>
                            <button onClick={() => removePhase(activeFlowPhase)} className="text-red-400/50 hover:text-red-400 transition-colors" title="Remove phase">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-white/35 mb-1 block font-medium">Phase Name *</label>
                            <Input value={persona.flowPhases[activeFlowPhase].name}
                              onChange={e => updatePhase(activeFlowPhase, "name", e.target.value)}
                              placeholder="e.g. Hook & Engage"
                              className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8 placeholder:text-white/20" />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/35 mb-1 block font-medium">Redirect URL <span className="text-white/20">(optional)</span></label>
                            <Input value={persona.flowPhases[activeFlowPhase].redirect_url}
                              onChange={e => updatePhase(activeFlowPhase, "redirect_url", e.target.value)}
                              placeholder="https://onlyfans.com/..."
                              className="bg-white/[0.04] border-white/[0.08] text-white text-xs h-8 placeholder:text-white/20" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-white/35 mb-1 block font-medium">
                            Phase Goal <span className="text-white/20">— What is the AI trying to achieve in this phase?</span>
                          </label>
                          <Textarea value={persona.flowPhases[activeFlowPhase].goal}
                            onChange={e => updatePhase(activeFlowPhase, "goal", e.target.value)}
                            placeholder="e.g. Capture attention and start a genuine conversation. Make the prospect feel special and seen."
                            className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[50px] placeholder:text-white/20 resize-none" />
                        </div>

                        <div>
                          <label className="text-[10px] text-white/35 mb-1 block font-medium">
                            AI Instructions <span className="text-white/20">— Exactly how the AI should behave in this phase</span>
                          </label>
                          <Textarea value={persona.flowPhases[activeFlowPhase].ai_instructions}
                            onChange={e => updatePhase(activeFlowPhase, "ai_instructions", e.target.value)}
                            placeholder={`e.g. Be warm and curious. Ask open-ended questions about their interests.\nDon't mention any products or links yet.\nMirror their energy level.\nUse the persona's hook style to open.`}
                            className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[80px] placeholder:text-white/20 resize-y font-mono" />
                        </div>

                        <div>
                          <label className="text-[10px] text-white/35 mb-1 block font-medium">
                            Transition Trigger <span className="text-white/20">— When should the AI move to the next phase?</span>
                          </label>
                          <Textarea value={persona.flowPhases[activeFlowPhase].transition_trigger}
                            onChange={e => updatePhase(activeFlowPhase, "transition_trigger", e.target.value)}
                            placeholder={`e.g. Move to next phase when:\n- Prospect has responded 3+ times\n- They express curiosity about content\n- They ask "what do you do?"\n- Conversation feels warm and engaged`}
                            className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[60px] placeholder:text-white/20 resize-none font-mono" />
                        </div>

                        <div>
                          <label className="text-[10px] text-white/35 mb-1 block font-medium">
                            Example Messages <span className="text-white/20">— Sample responses the AI can draw from</span>
                          </label>
                          <Textarea value={persona.flowPhases[activeFlowPhase].example_messages}
                            onChange={e => updatePhase(activeFlowPhase, "example_messages", e.target.value)}
                            placeholder={`e.g.\n"hey you seem interesting, whats your story"\n"i like your vibe, you seem different from most guys here"\n"so what are you into? like hobbies and stuff"`}
                            className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[60px] placeholder:text-white/20 resize-y font-mono" />
                        </div>

                        {/* Phase flow visualization */}
                        <div className="mt-2 p-2.5 rounded-lg bg-orange-500/[0.04] border border-orange-500/10">
                          <p className="text-[9px] text-orange-400/50 font-medium mb-1.5">FLOW PROGRESSION</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {persona.flowPhases.map((p, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded ${i === activeFlowPhase ? "bg-orange-500/20 text-orange-300 font-bold" : p.is_active ? "bg-white/5 text-white/30" : "bg-red-500/5 text-red-400/30 line-through"}`}>
                                  {p.name || `P${i + 1}`}
                                </span>
                                {i < persona.flowPhases.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-white/15" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {persona.flowPhases.length === 0 && (
                      <div className="text-center py-8 px-4">
                        <GitBranch className="h-8 w-8 text-white/10 mx-auto mb-3" />
                        <p className="text-[11px] text-white/30 mb-1">No conversion phases defined yet</p>
                        <p className="text-[9px] text-white/20 mb-3">Add phases to create a structured AI sales funnel that guides prospects from first message to conversion.</p>
                        <Button size="sm" onClick={addPhase} className="h-7 text-[10px] bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/20">
                          <Plus className="h-3 w-3 mr-1" /> Add First Phase
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: ADVANCED */}
                {step === 5 && (
                  <div className="space-y-4">
                    {sectionTitle(<Target className="h-4 w-4 text-cyan-400" />, "Advanced Configuration", "Fine-tune behavior & context")}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Pricing Mentality</label>
                        <div className="flex flex-wrap gap-1">{["premium", "accessible", "value-based", "exclusive", "flexible"].map(p => (
                          <button key={p} className={chip(persona.pricingMentality === p)} onClick={() => update("pricingMentality", p)}>{p}</button>
                        ))}</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/35 mb-1 block font-medium">Competitor Mentions</label>
                        <div className="flex flex-wrap gap-1">{["ignore", "subtle redirect", "acknowledge & pivot", "friendly comparison"].map(c => (
                          <button key={c} className={chip(persona.competitorMention === c)} onClick={() => update("competitorMention", c)}>{c}</button>
                        ))}</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/35 mb-1 block font-medium">Content Themes <span className="text-white/20">(what she talks about)</span></label>
                      <Textarea value={persona.contentThemes} onChange={e => update("contentThemes", e.target.value)}
                        placeholder="lifestyle, fitness, behind-the-scenes, personal stories..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[40px] placeholder:text-white/20 resize-none focus:border-purple-500/40" />
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/[0.08] to-blue-500/[0.04] border border-purple-500/20">
                      <label className="text-[10px] text-white/50 mb-1 flex items-center gap-1.5 font-semibold">
                        <Brain className="h-3 w-3 text-purple-400" />
                        System Prompt <span className="text-white/20 font-normal">(Full AI override — how this persona talks, behaves, responds)</span>
                      </label>
                      <p className="text-[9px] text-white/25 mb-1.5">When set, this completely replaces the default AI system prompt. Define the persona's character, tone, behavior, rules, and response style here.</p>
                      <Textarea value={persona.systemPrompt} onChange={e => update("systemPrompt", e.target.value)}
                        placeholder={`You are a chill young entrepreneur in your 20s chatting on Instagram DMs.\n\nYour personality:\n- Friendly but professional\n- Casual texting style, no emojis\n- Answer questions directly, never dodge\n- Keep messages short (under 30 words)\n- Never use "ngl" or corporate language\n- Sound real, not like a bot`}
                        className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-[160px] placeholder:text-white/15 resize-y focus:border-purple-500/30 font-mono leading-relaxed"
                        maxLength={50000} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-purple-400/50">When active, this overrides all default persona logic</span>
                        <span className="text-[8px] text-white/20">{persona.systemPrompt.length.toLocaleString()} chars</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/[0.06] to-purple-500/[0.04] border border-cyan-500/15">
                      <label className="text-[10px] text-white/50 mb-1 flex items-center gap-1.5 font-semibold">
                        <FileText className="h-3 w-3 text-cyan-400" />
                        Additional Information for AI <span className="text-white/20 font-normal">(max 500 lines)</span>
                      </label>
                      <p className="text-[9px] text-white/25 mb-1.5">Paste anything — scripts, example convos, SOPs, funnel logic.</p>
                      <Textarea value={persona.additionalInfo} onChange={e => update("additionalInfo", e.target.value)}
                        placeholder="Paste any additional context here..."
                        className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-[120px] placeholder:text-white/15 resize-y focus:border-cyan-500/30 font-mono leading-relaxed"
                        maxLength={50000} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-white/20">{persona.additionalInfo.split("\n").length} / 500 lines</span>
                        <span className="text-[8px] text-white/20">{persona.additionalInfo.length.toLocaleString()} chars</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: BOUNDARIES */}
                {step === 6 && (
                  <div className="space-y-4">
                    {sectionTitle(<Shield className="h-4 w-4 text-emerald-400" />, "Hard Limits & Rules", "These are never broken")}
                    <div>
                      <label className="text-[10px] text-white/35 mb-1 block font-medium">Content Boundaries & Rules</label>
                      <Textarea value={persona.boundaries} onChange={e => update("boundaries", e.target.value)}
                        placeholder="No face content, no extreme fetish, max 3 customs/week, never share personal info..."
                        className="bg-white/[0.04] border-white/[0.08] text-white text-xs min-h-[100px] placeholder:text-white/20 resize-none focus:border-emerald-500/30" />
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/15">
                      <p className="text-[10px] text-amber-400/70 flex items-start gap-2">
                        <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>These boundaries are <strong className="text-amber-300">hard-enforced</strong> — the AI will never cross them regardless of fan pressure, spending level, or conversation context.</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 7: REVIEW */}
                {step === 7 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/5 border border-purple-400/20 backdrop-blur-sm">
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" /> {persona.name || "Unnamed Persona"}
                        {editingPersonaId && <Badge variant="outline" className="text-[8px] text-amber-400 border-amber-500/30">EDITING</Badge>}
                      </h3>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
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
                            <div className="text-sm font-bold text-white">{val}%</div>
                          </div>
                        ))}
                      </div>
                      {persona.traits.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {persona.traits.map((t, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">{t}</span>
                          ))}
                        </div>
                      )}
                      {/* Flow phases summary */}
                      {persona.flowPhases.length > 0 && (
                        <div className="mt-3 p-2.5 rounded-lg bg-orange-500/[0.06] border border-orange-500/15">
                          <p className="text-[9px] text-orange-400/60 flex items-center gap-1 mb-1.5 font-medium">
                            <GitBranch className="h-2.5 w-2.5" /> {persona.flowPhases.filter(p => p.is_active).length} Conversion Phases Active
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {persona.flowPhases.map((p, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded ${p.is_active ? "bg-orange-500/15 text-orange-300" : "bg-white/5 text-white/20 line-through"}`}>
                                  {p.name}
                                </span>
                                {i < persona.flowPhases.length - 1 && <ChevronRight className="h-2 w-2 text-white/15" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {persona.brandIdentity && <p className="text-[11px] text-white/30 mt-2 italic">"{persona.brandIdentity}"</p>}
                      {persona.systemPrompt && (
                        <div className="mt-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                          <p className="text-[9px] text-purple-400/60 flex items-center gap-1"><Brain className="h-2.5 w-2.5" /> Custom system prompt set — will fully override default AI behavior</p>
                        </div>
                      )}
                      {persona.additionalInfo && (
                        <div className="mt-2 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                          <p className="text-[9px] text-cyan-400/60 flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> {persona.additionalInfo.split("\n").length} lines of additional context attached</p>
                        </div>
                      )}
                    </div>
                    <Button onClick={savePersona} disabled={saving || !persona.name.trim()}
                      className="w-full h-10 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-purple-500/20 border-0">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      {editingPersonaId ? "Update Persona" : "Create Persona"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Nav */}
            <div className="px-6 py-2.5 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-transparent to-purple-500/[0.02]">
              <Button size="sm" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
                className="h-8 text-[11px] text-white/40 hover:text-white gap-1 px-3">
                <ChevronLeft className="h-3 w-3" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "bg-purple-400 w-5" : i < step ? "bg-emerald-500/50 w-1.5" : "bg-white/10 w-1.5"}`} />
                ))}
              </div>
              {step < STEPS.length - 1 ? (
                <Button size="sm" onClick={() => setStep(step + 1)}
                  className="h-8 text-[11px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-1 px-4 border-0 shadow-sm">
                  Next <ChevronRight className="h-3 w-3" />
                </Button>
              ) : <div className="w-16" />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaCreatorDialog;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Brain, Sparkles, Heart, Shield, AlertTriangle, Plus, Save,
  Loader2, User, Palette, Volume2, Eye, TrendingUp, Zap, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreditCostBadge from "./CreditCostBadge";
import { useCreditAction } from "@/hooks/useCreditAction";

const TONES = ["sweet", "dominant", "playful", "mysterious", "bratty", "innocent", "seductive", "nurturing", "edgy", "sophisticated"];
const VOCAB_STYLES = ["casual", "flirty", "intellectual", "street", "elegant", "cutesy", "confident", "poetic"];
const EMOTIONAL_RANGES = ["low", "medium", "high", "volatile"];
const MOODS = ["energized", "neutral", "tired", "stressed", "creative", "frustrated", "happy", "withdrawn"];

const PersonaDNAEngine = () => {
  const { performAction } = useCreditAction();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [consistencyChecks, setConsistencyChecks] = useState<any[]>([]);

  // Form state
  const [tone, setTone] = useState("playful");
  const [vocabStyle, setVocabStyle] = useState("casual");
  const [emotionalRange, setEmotionalRange] = useState("medium");
  const [brandIdentity, setBrandIdentity] = useState("");
  const [boundaries, setBoundaries] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [newTrait, setNewTrait] = useState("");
  const [motivation, setMotivation] = useState(70);
  const [stress, setStress] = useState(30);
  const [burnoutRisk, setBurnoutRisk] = useState(20);
  const [mood, setMood] = useState("neutral");
  const [commRules, setCommRules] = useState("");

  useEffect(() => {
    loadData();
    const ch = supabase.channel("persona-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "persona_profiles" }, () => loadProfiles())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    const [accts, profs] = await Promise.all([
      supabase.from("managed_accounts").select("id, username, display_name, avatar_url").order("username"),
      supabase.from("persona_profiles").select("*"),
    ]);
    setAccounts(accts.data || []);
    setProfiles(profs.data || []);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("persona_profiles").select("*");
    setProfiles(data || []);
  };

  useEffect(() => {
    if (!selectedAccount) { setCurrentProfile(null); return; }
    const p = profiles.find(pr => pr.account_id === selectedAccount);
    if (p) {
      setCurrentProfile(p);
      setTone(p.tone); setVocabStyle(p.vocabulary_style); setEmotionalRange(p.emotional_range);
      setBrandIdentity(p.brand_identity || ""); setBoundaries(p.boundaries || "");
      setTraits((p.personality_traits as string[]) || []);
      setMotivation(p.motivation_level); setStress(p.stress_level); setBurnoutRisk(p.burnout_risk);
      setMood(p.mood);
      setCommRules(p.communication_rules ? JSON.stringify(p.communication_rules, null, 2) : "");
    } else {
      setCurrentProfile(null);
      setTone("playful"); setVocabStyle("casual"); setEmotionalRange("medium");
      setBrandIdentity(""); setBoundaries(""); setTraits([]); setMotivation(70);
      setStress(30); setBurnoutRisk(20); setMood("neutral"); setCommRules("");
    }
    loadChecks();
  }, [selectedAccount, profiles]);

  const loadChecks = async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("persona_consistency_checks")
      .select("*").eq("account_id", selectedAccount).order("created_at", { ascending: false }).limit(10);
    setConsistencyChecks(data || []);
  };

  const saveProfile = async () => {
    if (!selectedAccount) return;
    setSaving(true);
    let parsedRules = {};
    try { if (commRules.trim()) parsedRules = JSON.parse(commRules); } catch { toast.error("Invalid JSON in communication rules"); setSaving(false); return; }

    const actionType = currentProfile ? 'update_persona' : 'create_persona';
    await performAction(actionType, async () => {
      const payload = {
        account_id: selectedAccount, tone, vocabulary_style: vocabStyle, emotional_range: emotionalRange,
        brand_identity: brandIdentity || null, boundaries: boundaries || null,
        personality_traits: traits, communication_rules: parsedRules,
        motivation_level: motivation, stress_level: stress, burnout_risk: burnoutRisk, mood,
        last_mood_update: new Date().toISOString(),
      };

      if (currentProfile) {
        const { error } = await supabase.from("persona_profiles").update(payload).eq("id", currentProfile.id);
        if (error) throw error;
        toast.success("Persona updated");
      } else {
        const { error } = await supabase.from("persona_profiles").insert(payload);
        if (error) throw error;
        toast.success("Persona created");
      }
      setEditing(false);
    });
    setSaving(false);
  };

  const runConsistencyCheck = async () => {
    if (!selectedAccount || !currentProfile) { toast.error("Save persona first"); return; }
    setAnalyzing(true);
    try {
      const { data: scripts } = await supabase.from("scripts").select("title, description, category")
        .eq("account_id", selectedAccount).limit(5);
      
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `Analyze persona consistency for this creator. Rate 0-100 and list issues/suggestions as JSON.

PERSONA: Tone=${tone}, Vocabulary=${vocabStyle}, EmotionalRange=${emotionalRange}, Brand="${brandIdentity}", Boundaries="${boundaries}", Traits=${JSON.stringify(traits)}

RECENT SCRIPTS: ${JSON.stringify(scripts || [])}

Respond ONLY with valid JSON: {"consistency_score": number, "issues": ["string"], "suggestions": ["string"]}`
          }],
        },
      });

      // Parse streaming response
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      let fullContent = "";
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          fullContent += parsed.choices?.[0]?.delta?.content || "";
        } catch {}
      }

      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        await supabase.from("persona_consistency_checks").insert({
          account_id: selectedAccount, check_type: "full_analysis",
          content_checked: JSON.stringify(scripts),
          consistency_score: result.consistency_score || 0,
          issues: result.issues || [], suggestions: result.suggestions || [],
        });
        toast.success(`Consistency: ${result.consistency_score}%`);
        loadChecks();
      }
    } catch (e: any) { toast.error(e.message || "Analysis failed"); }
    setAnalyzing(false);
  };

  const addTrait = () => {
    if (newTrait.trim() && !traits.includes(newTrait.trim())) {
      setTraits([...traits, newTrait.trim()]);
      setNewTrait("");
    }
  };

  const riskColor = (v: number) => v >= 70 ? "text-red-400" : v >= 40 ? "text-amber-400" : "text-emerald-400";
  const riskBg = (v: number) => v >= 70 ? "bg-red-500" : v >= 40 ? "bg-amber-500" : "bg-emerald-500";
  const selectedAcct = accounts.find(a => a.id === selectedAccount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" /> Persona DNA Engine
            </h1>
            <CreditCostBadge cost="8–15" variant="header" label="per persona" />
          </div>
          <p className="text-xs text-white/40">AI-powered personality profiles & emotional state tracking</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs w-52">
              <SelectValue placeholder="Select creator..." />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-white text-xs">
                  {a.display_name || a.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAccount ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-16 text-center">
            <User className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Select a creator to view or create their Persona DNA</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Personality Profile */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-400" /> Personality Profile
                  </CardTitle>
                  <div className="flex gap-2">
                    {currentProfile && (
                      <Button size="sm" variant="outline" onClick={runConsistencyCheck} disabled={analyzing}
                        className="h-7 text-[10px] border-white/10 text-white/60 hover:text-white">
                        {analyzing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        AI Consistency Check
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setEditing(!editing)}
                      className="h-7 text-[10px] bg-accent/20 text-accent hover:bg-accent/30">
                      {editing ? "Cancel" : currentProfile ? "Edit" : "Create Profile"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Tone</label>
                    {editing ? (
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                          {TONES.map(t => <SelectItem key={t} value={t} className="text-white text-xs capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <Badge variant="outline" className="border-purple-500/20 text-purple-400 text-xs capitalize">{tone}</Badge>}
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Vocabulary</label>
                    {editing ? (
                      <Select value={vocabStyle} onValueChange={setVocabStyle}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                          {VOCAB_STYLES.map(v => <SelectItem key={v} value={v} className="text-white text-xs capitalize">{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <Badge variant="outline" className="border-blue-500/20 text-blue-400 text-xs capitalize">{vocabStyle}</Badge>}
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Emotional Range</label>
                    {editing ? (
                      <Select value={emotionalRange} onValueChange={setEmotionalRange}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                          {EMOTIONAL_RANGES.map(e => <SelectItem key={e} value={e} className="text-white text-xs capitalize">{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <Badge variant="outline" className="border-pink-500/20 text-pink-400 text-xs capitalize">{emotionalRange}</Badge>}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Brand Identity</label>
                  {editing ? (
                    <Textarea value={brandIdentity} onChange={e => setBrandIdentity(e.target.value)}
                      placeholder="The girl next door who's secretly wild... Always warm, never desperate..."
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[60px]" />
                  ) : <p className="text-xs text-white/60">{brandIdentity || "Not set"}</p>}
                </div>

                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Boundaries</label>
                  {editing ? (
                    <Textarea value={boundaries} onChange={e => setBoundaries(e.target.value)}
                      placeholder="No face content, no extreme fetish, max 3 custom videos/week..."
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[60px]" />
                  ) : <p className="text-xs text-white/60">{boundaries || "Not set"}</p>}
                </div>

                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Personality Traits</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {traits.map((t, i) => (
                      <Badge key={i} variant="outline" className="border-white/10 text-white/60 text-[10px]">
                        {t}
                        {editing && <button onClick={() => setTraits(traits.filter((_, j) => j !== i))} className="ml-1 text-red-400 hover:text-red-300">×</button>}
                      </Badge>
                    ))}
                  </div>
                  {editing && (
                    <div className="flex gap-1.5">
                      <Input value={newTrait} onChange={e => setNewTrait(e.target.value)} onKeyDown={e => e.key === "Enter" && addTrait()}
                        placeholder="Add trait..." className="bg-white/5 border-white/10 text-white text-xs h-7 flex-1" />
                      <Button size="sm" onClick={addTrait} className="h-7 text-[10px]"><Plus className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>

                {editing && (
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Communication Rules (JSON)</label>
                    <Textarea value={commRules} onChange={e => setCommRules(e.target.value)}
                      placeholder='{"max_message_length": 15, "emoji_policy": "none", "shorthand": true}'
                      className="bg-white/5 border-white/10 text-white text-xs min-h-[80px] font-mono" />
                  </div>
                )}

                {editing && (
                  <Button onClick={saveProfile} disabled={saving} className="w-full bg-accent hover:bg-accent/90">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {currentProfile ? "Update Persona" : "Create Persona"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Consistency Checks */}
            {consistencyChecks.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" /> Consistency History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {consistencyChecks.map(check => (
                    <div key={check.id} className="p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${riskColor(100 - check.consistency_score)}`}>
                          {check.consistency_score}% Match
                        </span>
                        <span className="text-[9px] text-white/30">{new Date(check.created_at).toLocaleString()}</span>
                      </div>
                      {(check.issues as string[])?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[9px] text-red-400/60 mb-1">Issues:</p>
                          {(check.issues as string[]).map((issue, i) => (
                            <p key={i} className="text-[10px] text-white/50 flex items-start gap-1">
                              <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0 mt-0.5" /> {issue}
                            </p>
                          ))}
                        </div>
                      )}
                      {(check.suggestions as string[])?.length > 0 && (
                        <div>
                          <p className="text-[9px] text-emerald-400/60 mb-1">Suggestions:</p>
                          {(check.suggestions as string[]).map((sug, i) => (
                            <p key={i} className="text-[10px] text-white/50 flex items-start gap-1">
                              <Sparkles className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" /> {sug}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Emotional State Sidebar */}
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-400" /> Emotional State
                  </CardTitle>
                  {!editing && <Button size="sm" onClick={() => setEditing(true)} className="h-6 text-[9px] bg-white/5 text-white/40 hover:text-white">Update</Button>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-white/40">Motivation</span>
                    <span className={`text-[10px] font-medium ${riskColor(100 - motivation)}`}>{motivation}%</span>
                  </div>
                  {editing ? (
                    <Slider value={[motivation]} onValueChange={v => setMotivation(v[0])} max={100} step={1} className="my-2" />
                  ) : <Progress value={motivation} className="h-1.5" />}
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-white/40">Stress Level</span>
                    <span className={`text-[10px] font-medium ${riskColor(stress)}`}>{stress}%</span>
                  </div>
                  {editing ? (
                    <Slider value={[stress]} onValueChange={v => setStress(v[0])} max={100} step={1} className="my-2" />
                  ) : <Progress value={stress} className="h-1.5" />}
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-white/40">Burnout Risk</span>
                    <span className={`text-[10px] font-medium ${riskColor(burnoutRisk)}`}>{burnoutRisk}%</span>
                  </div>
                  {editing ? (
                    <Slider value={[burnoutRisk]} onValueChange={v => setBurnoutRisk(v[0])} max={100} step={1} className="my-2" />
                  ) : <Progress value={burnoutRisk} className="h-1.5" />}
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Current Mood</label>
                  {editing ? (
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                        {MOODS.map(m => <SelectItem key={m} value={m} className="text-white text-xs capitalize">{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="border-white/10 text-white/60 text-xs capitalize">{mood}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Summary */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" /> Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Burnout", value: burnoutRisk, desc: burnoutRisk >= 70 ? "Critical — reduce workload immediately" : burnoutRisk >= 40 ? "Moderate — monitor closely" : "Low — healthy state" },
                  { label: "Overwork", value: stress, desc: stress >= 70 ? "High stress — schedule breaks" : stress >= 40 ? "Some pressure — manageable" : "Relaxed" },
                  { label: "Motivation Drop", value: 100 - motivation, desc: motivation <= 30 ? "Very low — needs re-engagement" : motivation <= 60 ? "Could improve" : "Motivated" },
                ].map(r => (
                  <div key={r.label} className="p-2 bg-white/[0.02] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/50">{r.label}</span>
                      <span className={`text-xs font-bold ${riskColor(r.value)}`}>{r.value}%</span>
                    </div>
                    <p className="text-[9px] text-white/30">{r.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <p className="text-[10px] text-white/40 mb-2">Profiles Overview</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white/[0.03] rounded-lg text-center">
                    <p className="text-lg font-bold text-white">{profiles.length}</p>
                    <p className="text-[9px] text-white/30">Total Profiles</p>
                  </div>
                  <div className="p-2 bg-white/[0.03] rounded-lg text-center">
                    <p className="text-lg font-bold text-amber-400">
                      {profiles.filter(p => p.burnout_risk >= 60).length}
                    </p>
                    <p className="text-[9px] text-white/30">At Risk</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaDNAEngine;

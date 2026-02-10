import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Trash2, MessageSquare, Image, DollarSign, Clock,
  GitBranch, Save, Copy, Zap, HelpCircle, Send, Film, Tag,
  ChevronDown, ChevronUp, GripVertical, ArrowDown, Play, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ScriptFlowView from "./ScriptFlowView";

interface ScriptStep {
  id?: string;
  step_order: number;
  step_type: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  price: number;
  delay_minutes: number;
  condition_logic: any;
  conversion_rate: number;
  drop_off_rate: number;
  revenue_generated: number;
  impressions: number;
}

interface Script {
  id?: string;
  title: string;
  description: string;
  category: string;
  status: string;
  target_segment: string;
  version: number;
}

const CATEGORIES = ["onboarding", "retention", "upsell", "premium", "reactivation", "general"];
const SEGMENTS = ["all", "new_users", "active_users", "vip", "high_spenders", "inactive", "custom"];

const ScriptBuilder = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"flow" | "edit">("flow");
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [newScript, setNewScript] = useState<Script>({
    title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadScripts(); }, []);

  const loadScripts = async () => {
    const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
    setScripts(data || []);
  };

  const loadSteps = async (scriptId: string) => {
    const { data } = await supabase.from("script_steps").select("*").eq("script_id", scriptId).order("step_order");
    setSteps((data || []).map(s => ({
      ...s,
      conversion_rate: Number(s.conversion_rate) || 0,
      drop_off_rate: Number(s.drop_off_rate) || 0,
      revenue_generated: Number(s.revenue_generated) || 0,
      price: Number(s.price) || 0,
      delay_minutes: s.delay_minutes || 0,
      impressions: s.impressions || 0,
    })));
  };

  const selectScript = async (script: any) => {
    setSelectedScript(script);
    await loadSteps(script.id);
    setEditingStep(null);
  };

  const createScript = async () => {
    if (!newScript.title.trim()) return toast.error("Script title is required");
    const { data, error } = await supabase.from("scripts").insert({
      title: newScript.title, description: newScript.description,
      category: newScript.category, target_segment: newScript.target_segment,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Script created");
    setShowNewDialog(false);
    setNewScript({ title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1 });
    await loadScripts();
    if (data) selectScript(data);
  };

  const addStep = (type: string = "message") => {
    const newStep: ScriptStep = {
      step_order: steps.length, step_type: type, title: "", content: "",
      media_url: "", media_type: "", price: 0, delay_minutes: 0,
      condition_logic: {}, conversion_rate: 0, drop_off_rate: 0,
      revenue_generated: 0, impressions: 0,
    };
    setSteps(prev => [...prev, newStep]);
    setEditingStep(steps.length);
    setViewMode("edit");
  };

  const updateStep = (index: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })));
    setEditingStep(null);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === steps.length - 1)) return;
    const newSteps = [...steps];
    const target = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i })));
  };

  const duplicateStep = (index: number) => {
    const step = { ...steps[index], id: undefined, step_order: steps.length };
    setSteps(prev => [...prev, step].map((s, i) => ({ ...s, step_order: i })));
  };

  const saveScript = async () => {
    if (!selectedScript?.id) return;
    setSaving(true);
    try {
      await supabase.from("script_steps").delete().eq("script_id", selectedScript.id);
      if (steps.length > 0) {
        const { error } = await supabase.from("script_steps").insert(
          steps.map(s => ({
            script_id: selectedScript.id!, step_order: s.step_order, step_type: s.step_type,
            title: s.title || `Step ${s.step_order + 1}`, content: s.content,
            media_url: s.media_url, media_type: s.media_type, price: s.price,
            delay_minutes: s.delay_minutes, condition_logic: s.condition_logic,
          }))
        );
        if (error) throw error;
      }
      await supabase.from("scripts").update({
        title: selectedScript.title, description: selectedScript.description,
        category: selectedScript.category, target_segment: selectedScript.target_segment,
      }).eq("id", selectedScript.id);
      toast.success("Script saved");
      await loadScripts();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const cloneScript = async () => {
    if (!selectedScript?.id) return;
    const { data, error } = await supabase.from("scripts").insert({
      title: `${selectedScript.title} (Copy)`, description: selectedScript.description,
      category: selectedScript.category, target_segment: selectedScript.target_segment,
      parent_script_id: selectedScript.id, version: (selectedScript.version || 1) + 1,
    }).select().single();
    if (error) return toast.error(error.message);
    if (steps.length > 0 && data) {
      await supabase.from("script_steps").insert(
        steps.map(s => ({
          script_id: data.id, step_order: s.step_order, step_type: s.step_type,
          title: s.title, content: s.content, media_url: s.media_url, media_type: s.media_type,
          price: s.price, delay_minutes: s.delay_minutes, condition_logic: s.condition_logic,
        }))
      );
    }
    toast.success("Script cloned");
    await loadScripts();
    if (data) selectScript(data);
  };

  const totalPrice = steps.reduce((s, step) => s + (step.price || 0), 0);
  const paidSteps = steps.filter(s => s.price > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Script Builder</h2>
          <p className="text-xs text-white/40">Design multi-step chat flows with branching & progressive pricing</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/80"><Plus className="h-3.5 w-3.5" /> New Script</Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>Create New Script</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Script title" value={newScript.title} onChange={e => setNewScript(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Description" value={newScript.description} onChange={e => setNewScript(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newScript.category} onValueChange={v => setNewScript(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newScript.target_segment} onValueChange={v => setNewScript(p => ({ ...p, target_segment: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                    {SEGMENTS.map(s => <SelectItem key={s} value={s} className="text-white">{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createScript} className="w-full bg-accent hover:bg-accent/80">Create Script</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Script list sidebar */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs">Scripts ({scripts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[600px] overflow-y-auto p-2">
            {scripts.map(s => (
              <button key={s.id} onClick={() => selectScript(s)}
                className={`w-full text-left p-2.5 rounded-lg transition-all text-xs ${
                  selectedScript?.id === s.id ? "bg-accent/20 border border-accent/30" : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
                }`}>
                <p className="font-medium text-white truncate">{s.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{s.category}</Badge>
                  <Badge variant="outline" className={`text-[9px] ${s.status === "active" ? "border-emerald-500/20 text-emerald-400" : "border-white/10 text-white/40"}`}>{s.status}</Badge>
                </div>
              </button>
            ))}
            {scripts.length === 0 && <p className="text-white/30 text-xs text-center py-4">No scripts yet</p>}
          </CardContent>
        </Card>

        {/* Builder area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedScript ? (
            <>
              {/* Script header */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 mr-4">
                      <Input value={selectedScript.title}
                        onChange={e => setSelectedScript(p => p ? { ...p, title: e.target.value } : p)}
                        className="bg-transparent border-none text-white font-semibold text-base p-0 h-auto focus-visible:ring-0" />
                      <Input value={selectedScript.description || ""}
                        onChange={e => setSelectedScript(p => p ? { ...p, description: e.target.value } : p)}
                        placeholder="Add description..." className="bg-transparent border-none text-white/40 text-xs p-0 h-auto mt-1 focus-visible:ring-0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                        <button onClick={() => setViewMode("flow")} className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${viewMode === "flow" ? "bg-accent text-white" : "text-white/40 hover:text-white"}`}>
                          <Eye className="h-3 w-3 inline mr-1" />Flow
                        </button>
                        <button onClick={() => setViewMode("edit")} className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${viewMode === "edit" ? "bg-accent text-white" : "text-white/40 hover:text-white"}`}>
                          <Zap className="h-3 w-3 inline mr-1" />Edit
                        </button>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">
                        <DollarSign className="h-2.5 w-2.5 mr-0.5" />${totalPrice}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={cloneScript} className="h-7 text-white/40 hover:text-white text-[10px] gap-1">
                        <Copy className="h-3 w-3" /> Clone
                      </Button>
                      <Button size="sm" onClick={saveScript} disabled={saving} className="h-7 bg-accent hover:bg-accent/80 text-[10px] gap-1">
                        <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedScript.category} onValueChange={v => setSelectedScript(p => p ? { ...p, category: v } : p)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] w-32"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedScript.target_segment} onValueChange={v => setSelectedScript(p => p ? { ...p, target_segment: v } : p)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-[10px] w-36"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                        {SEGMENTS.map(s => <SelectItem key={s} value={s} className="text-white text-xs">{s.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Flow View */}
              {viewMode === "flow" ? (
                <ScriptFlowView
                  steps={steps}
                  onEditStep={(i) => { setEditingStep(i); setViewMode("edit"); }}
                  onAddStep={addStep}
                  onRemoveStep={removeStep}
                  onMoveStep={moveStep}
                  onDuplicateStep={duplicateStep}
                />
              ) : (
                /* Edit View */
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <StepEditor
                      key={i}
                      step={step}
                      index={i}
                      isExpanded={editingStep === i}
                      onToggle={() => setEditingStep(editingStep === i ? null : i)}
                      onUpdate={(field, value) => updateStep(i, field, value)}
                      onRemove={() => removeStep(i)}
                      onMoveUp={() => moveStep(i, "up")}
                      onMoveDown={() => moveStep(i, "down")}
                      onDuplicate={() => duplicateStep(i)}
                    />
                  ))}
                  <StepAddButtons onAdd={addStep} />
                </div>
              )}

              {/* Pricing ladder summary */}
              {paidSteps.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-xs flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Pricing Ladder
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      {paidSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="text-center p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                            <p className="text-[9px] text-white/30">Step {step.step_order + 1}</p>
                            <p className="text-sm font-bold text-amber-400">${step.price}</p>
                          </div>
                          {i < paidSteps.length - 1 && <ArrowDown className="h-3 w-3 text-white/15 -rotate-90" />}
                        </div>
                      ))}
                      <div className="ml-auto text-right">
                        <p className="text-[9px] text-white/30">Total Value</p>
                        <p className="text-lg font-bold text-white">${totalPrice}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="py-16 text-center">
                <Zap className="h-8 w-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Select a script or create a new one</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Step Type Config ── */
const STEP_TYPES = [
  { value: "welcome", label: "Welcome Message", icon: Send, color: "bg-cyan-500", textColor: "text-cyan-900" },
  { value: "message", label: "Message", icon: MessageSquare, color: "bg-yellow-400", textColor: "text-yellow-900" },
  { value: "free_content", label: "Free Content", icon: Image, color: "bg-green-500", textColor: "text-green-900" },
  { value: "ppv_content", label: "PPV Content", icon: Film, color: "bg-green-400", textColor: "text-green-900" },
  { value: "question", label: "Question", icon: HelpCircle, color: "bg-yellow-300", textColor: "text-yellow-900" },
  { value: "condition", label: "Condition Branch", icon: GitBranch, color: "bg-blue-400", textColor: "text-blue-900" },
  { value: "followup_purchased", label: "Follow-up (Purchased)", icon: Send, color: "bg-pink-300", textColor: "text-pink-900" },
  { value: "followup_ignored", label: "Follow-up (Ignored)", icon: Send, color: "bg-red-500", textColor: "text-white" },
  { value: "delay", label: "Delay / Wait", icon: Clock, color: "bg-gray-400", textColor: "text-gray-900" },
  { value: "offer", label: "Offer / Premium", icon: DollarSign, color: "bg-amber-400", textColor: "text-amber-900" },
  { value: "content", label: "Content Delivery", icon: Image, color: "bg-emerald-400", textColor: "text-emerald-900" },
  { value: "followup", label: "Follow-up", icon: Send, color: "bg-pink-300", textColor: "text-pink-900" },
  { value: "media", label: "Video / Media", icon: Film, color: "bg-orange-400", textColor: "text-orange-900" },
];

const getStepConfig = (type: string) => STEP_TYPES.find(s => s.value === type) || STEP_TYPES[1];

/* ── Step Add Buttons ── */
const StepAddButtons = ({ onAdd }: { onAdd: (type: string) => void }) => (
  <div className="flex flex-wrap gap-1.5 p-3 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
    <p className="text-[10px] text-white/30 w-full mb-1">Add step:</p>
    {[
      { type: "welcome", label: "Welcome", color: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" },
      { type: "message", label: "Message", color: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" },
      { type: "free_content", label: "Free Content", color: "bg-green-500/20 text-green-400 hover:bg-green-500/30" },
      { type: "ppv_content", label: "PPV Content", color: "bg-green-400/20 text-green-300 hover:bg-green-400/30" },
      { type: "question", label: "Question", color: "bg-yellow-300/20 text-yellow-300 hover:bg-yellow-300/30" },
      { type: "condition", label: "Branch", color: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
      { type: "followup_purchased", label: "Follow-up (Bought)", color: "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30" },
      { type: "followup_ignored", label: "Follow-up (Ignored)", color: "bg-red-500/20 text-red-400 hover:bg-red-500/30" },
      { type: "delay", label: "Delay", color: "bg-white/10 text-white/40 hover:bg-white/20" },
    ].map(b => (
      <button key={b.type} onClick={() => onAdd(b.type)}
        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${b.color}`}>
        {b.label}
      </button>
    ))}
  </div>
);

/* ── Step Editor ── */
const StepEditor = ({ step, index, isExpanded, onToggle, onUpdate, onRemove, onMoveUp, onMoveDown, onDuplicate }: {
  step: any; index: number; isExpanded: boolean;
  onToggle: () => void; onUpdate: (field: string, value: any) => void;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void; onDuplicate: () => void;
}) => {
  const cfg = getStepConfig(step.step_type);
  const Icon = cfg.icon;

  return (
    <div>
      <Card className={`bg-white/5 backdrop-blur-sm border-white/10 transition-all ${isExpanded ? "ring-1 ring-accent/30" : ""}`}>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={onToggle}>
            <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0" />
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${cfg.color} ${cfg.textColor} shrink-0`}>
              {cfg.label}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 font-mono">#{index + 1}</span>
                <span className="text-xs font-medium text-white truncate">{step.title || step.content || "Untitled"}</span>
              </div>
            </div>
            {step.price > 0 && <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400 shrink-0">${step.price}</Badge>}
            {step.delay_minutes > 0 && <Badge variant="outline" className="text-[9px] border-white/10 text-white/30 shrink-0"><Clock className="h-2 w-2 mr-0.5" />{step.delay_minutes}m</Badge>}
            <div className="flex gap-0.5">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); onMoveUp(); }}><ChevronUp className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); onMoveDown(); }}><ChevronDown className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400/50 hover:text-red-400" onClick={e => { e.stopPropagation(); onRemove(); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
          </div>

          {isExpanded && (
            <div className="px-3 pb-3 pt-0 border-t border-white/5 space-y-3">
              <div className="grid grid-cols-2 gap-2 pt-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Step Title</label>
                  <Input value={step.title} onChange={e => onUpdate("title", e.target.value)} placeholder="e.g. Welcome Message" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Step Type</label>
                  <Select value={step.step_type} onValueChange={v => onUpdate("step_type", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10 max-h-60">
                      {STEP_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-white text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${t.color}`} />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 block mb-1">Content / Message / Caption</label>
                <Textarea value={step.content} onChange={e => onUpdate("content", e.target.value)}
                  placeholder="Enter the message text, caption for PPV, or instructions for the chatter..."
                  className="min-h-[60px] bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 resize-none" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Price ($)</label>
                  <Input type="number" value={step.price} onChange={e => onUpdate("price", parseFloat(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Delay (min)</label>
                  <Input type="number" value={step.delay_minutes} onChange={e => onUpdate("delay_minutes", parseInt(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Media Type</label>
                  <Select value={step.media_type || "none"} onValueChange={v => onUpdate("media_type", v === "none" ? "" : v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                      <SelectItem value="none" className="text-white text-xs">None</SelectItem>
                      <SelectItem value="image" className="text-white text-xs">Image(s)</SelectItem>
                      <SelectItem value="video" className="text-white text-xs">Video(s)</SelectItem>
                      <SelectItem value="mixed" className="text-white text-xs">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Media Description</label>
                  <Input value={step.media_url} onChange={e => onUpdate("media_url", e.target.value)} placeholder="e.g. 2 selfies, Video 0:28" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
              </div>

              {step.step_type === "condition" && (
                <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-[10px] text-blue-400 font-medium mb-1">Branching Condition</p>
                  <Input value={step.condition_logic?.condition || ""} onChange={e => onUpdate("condition_logic", { ...step.condition_logic, condition: e.target.value })}
                    placeholder="e.g. Responded to welcome message" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
              )}

              {(step.conversion_rate > 0 || step.impressions > 0) && (
                <div className="grid grid-cols-4 gap-2 p-2 bg-white/[0.02] rounded-lg">
                  <div><p className="text-[9px] text-white/30">Conversion</p><p className="text-xs text-emerald-400">{step.conversion_rate}%</p></div>
                  <div><p className="text-[9px] text-white/30">Drop-off</p><p className="text-xs text-red-400">{step.drop_off_rate}%</p></div>
                  <div><p className="text-[9px] text-white/30">Revenue</p><p className="text-xs text-amber-400">${step.revenue_generated}</p></div>
                  <div><p className="text-[9px] text-white/30">Impressions</p><p className="text-xs text-white/60">{step.impressions}</p></div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {index < 99 && (
        <div className="flex justify-center py-1">
          <ArrowDown className="h-3 w-3 text-white/15" />
        </div>
      )}
    </div>
  );
};

export default ScriptBuilder;

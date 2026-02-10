import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, GripVertical, Trash2, MessageSquare, Image, DollarSign, Clock,
  GitBranch, Play, Save, ArrowDown, ChevronDown, ChevronUp, Copy,
  Eye, Zap, HelpCircle, Send, Film, Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const STEP_TYPES = [
  { value: "message", label: "Message", icon: MessageSquare, color: "text-blue-400" },
  { value: "content", label: "Content Delivery", icon: Image, color: "text-emerald-400" },
  { value: "offer", label: "Offer / Premium", icon: DollarSign, color: "text-amber-400" },
  { value: "question", label: "Question / Poll", icon: HelpCircle, color: "text-purple-400" },
  { value: "followup", label: "Follow-up", icon: Send, color: "text-cyan-400" },
  { value: "delay", label: "Delay / Wait", icon: Clock, color: "text-white/40" },
  { value: "condition", label: "Condition Branch", icon: GitBranch, color: "text-pink-400" },
  { value: "media", label: "Video / Media", icon: Film, color: "text-orange-400" },
];

const CATEGORIES = ["onboarding", "retention", "upsell", "premium", "reactivation", "general"];
const SEGMENTS = ["all", "new_users", "active_users", "vip", "high_spenders", "inactive", "custom"];

const emptyStep = (order: number): ScriptStep => ({
  step_order: order,
  step_type: "message",
  title: "",
  content: "",
  media_url: "",
  media_type: "",
  price: 0,
  delay_minutes: 0,
  condition_logic: {},
  conversion_rate: 0,
  drop_off_rate: 0,
  revenue_generated: 0,
  impressions: 0,
});

const ScriptBuilder = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newScript, setNewScript] = useState<Script>({
    title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadScripts();
  }, []);

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
  };

  const createScript = async () => {
    if (!newScript.title.trim()) return toast.error("Script title is required");
    const { data, error } = await supabase.from("scripts").insert({
      title: newScript.title,
      description: newScript.description,
      category: newScript.category,
      target_segment: newScript.target_segment,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Script created");
    setShowNewDialog(false);
    setNewScript({ title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1 });
    await loadScripts();
    if (data) selectScript(data);
  };

  const addStep = () => {
    setSteps(prev => [...prev, emptyStep(prev.length)]);
    setExpandedStep(steps.length);
  };

  const updateStep = (index: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })));
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
      // Delete old steps
      await supabase.from("script_steps").delete().eq("script_id", selectedScript.id);
      // Insert new steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map(s => ({
          script_id: selectedScript.id!,
          step_order: s.step_order,
          step_type: s.step_type,
          title: s.title || `Step ${s.step_order + 1}`,
          content: s.content,
          media_url: s.media_url,
          media_type: s.media_type,
          price: s.price,
          delay_minutes: s.delay_minutes,
          condition_logic: s.condition_logic,
        }));
        const { error } = await supabase.from("script_steps").insert(stepsToInsert);
        if (error) throw error;
      }
      // Update script metadata
      await supabase.from("scripts").update({
        title: selectedScript.title,
        description: selectedScript.description,
        category: selectedScript.category,
        target_segment: selectedScript.target_segment,
      }).eq("id", selectedScript.id);
      toast.success("Script saved successfully");
      await loadScripts();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const cloneScript = async () => {
    if (!selectedScript?.id) return;
    const { data, error } = await supabase.from("scripts").insert({
      title: `${selectedScript.title} (Copy)`,
      description: selectedScript.description,
      category: selectedScript.category,
      target_segment: selectedScript.target_segment,
      parent_script_id: selectedScript.id,
      version: (selectedScript.version || 1) + 1,
    }).select().single();
    if (error) return toast.error(error.message);
    // Clone steps
    if (steps.length > 0 && data) {
      await supabase.from("script_steps").insert(
        steps.map(s => ({
          script_id: data.id,
          step_order: s.step_order,
          step_type: s.step_type,
          title: s.title,
          content: s.content,
          media_url: s.media_url,
          media_type: s.media_type,
          price: s.price,
          delay_minutes: s.delay_minutes,
          condition_logic: s.condition_logic,
        }))
      );
    }
    toast.success("Script cloned");
    await loadScripts();
    if (data) selectScript(data);
  };

  const getStepIcon = (type: string) => {
    const found = STEP_TYPES.find(s => s.value === type);
    return found || STEP_TYPES[0];
  };

  const totalPrice = steps.reduce((s, step) => s + (step.price || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Script Builder</h2>
          <p className="text-xs text-white/40">Design multi-step storyline flows</p>
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
              <button
                key={s.id}
                onClick={() => selectScript(s)}
                className={`w-full text-left p-2.5 rounded-lg transition-all text-xs ${
                  selectedScript?.id === s.id ? "bg-accent/20 border border-accent/30" : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
                }`}
              >
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
                      <Input
                        value={selectedScript.title}
                        onChange={e => setSelectedScript(p => p ? { ...p, title: e.target.value } : p)}
                        className="bg-transparent border-none text-white font-semibold text-base p-0 h-auto focus-visible:ring-0"
                      />
                      <Input
                        value={selectedScript.description || ""}
                        onChange={e => setSelectedScript(p => p ? { ...p, description: e.target.value } : p)}
                        placeholder="Add description..."
                        className="bg-transparent border-none text-white/40 text-xs p-0 h-auto mt-1 focus-visible:ring-0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">
                        <Tag className="h-2.5 w-2.5 mr-1" />{selectedScript.target_segment?.replace(/_/g, " ")}
                      </Badge>
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

              {/* Steps timeline */}
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const stepType = getStepIcon(step.step_type);
                  const Icon = stepType.icon;
                  const isExpanded = expandedStep === i;
                  return (
                    <div key={i}>
                      <Card className={`bg-white/5 backdrop-blur-sm border-white/10 transition-all ${isExpanded ? "ring-1 ring-accent/30" : ""}`}>
                        <CardContent className="p-0">
                          {/* Step header */}
                          <div
                            className="flex items-center gap-2 p-3 cursor-pointer"
                            onClick={() => setExpandedStep(isExpanded ? null : i)}
                          >
                            <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0" />
                            <div className={`p-1.5 rounded-md bg-white/5 ${stepType.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/30 font-mono">#{i + 1}</span>
                                <span className="text-xs font-medium text-white truncate">{step.title || `${stepType.label} Step`}</span>
                              </div>
                              {step.content && <p className="text-[10px] text-white/30 truncate">{step.content}</p>}
                            </div>
                            {step.price > 0 && <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">${step.price}</Badge>}
                            {step.delay_minutes > 0 && <Badge variant="outline" className="text-[9px] border-white/10 text-white/30"><Clock className="h-2 w-2 mr-0.5" />{step.delay_minutes}m</Badge>}
                            <div className="flex gap-0.5">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); moveStep(i, "up"); }}><ChevronUp className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); moveStep(i, "down"); }}><ChevronDown className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-white" onClick={e => { e.stopPropagation(); duplicateStep(i); }}><Copy className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400/50 hover:text-red-400" onClick={e => { e.stopPropagation(); removeStep(i); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0 border-t border-white/5 mt-0 space-y-3">
                              <div className="grid grid-cols-2 gap-2 pt-3">
                                <div>
                                  <label className="text-[10px] text-white/40 block mb-1">Step Title</label>
                                  <Input value={step.title} onChange={e => updateStep(i, "title", e.target.value)} placeholder="Step title" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/40 block mb-1">Step Type</label>
                                  <Select value={step.step_type} onValueChange={v => updateStep(i, "step_type", v)}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
                                      {STEP_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value} className="text-white text-xs">
                                          <span className="flex items-center gap-1.5"><t.icon className={`h-3 w-3 ${t.color}`} />{t.label}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] text-white/40 block mb-1">Content / Message</label>
                                <textarea
                                  value={step.content}
                                  onChange={e => updateStep(i, "content", e.target.value)}
                                  placeholder="Enter content, message, or instructions..."
                                  className="w-full min-h-[60px] p-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:border-accent focus:outline-none resize-none"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] text-white/40 block mb-1">Price ($)</label>
                                  <Input type="number" value={step.price} onChange={e => updateStep(i, "price", parseFloat(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/40 block mb-1">Delay (min)</label>
                                  <Input type="number" value={step.delay_minutes} onChange={e => updateStep(i, "delay_minutes", parseInt(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/40 block mb-1">Media URL</label>
                                  <Input value={step.media_url} onChange={e => updateStep(i, "media_url", e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white text-xs h-8" />
                                </div>
                              </div>

                              {/* Performance metrics (read-only) */}
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
                      {i < steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-3 w-3 text-white/15" />
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button onClick={addStep} variant="outline" className="w-full border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/20 h-10 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Step
                </Button>
              </div>

              {/* Pricing ladder summary */}
              {steps.filter(s => s.price > 0).length > 0 && (
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-xs flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Pricing Ladder
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {steps.filter(s => s.price > 0).map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="text-center p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                            <p className="text-[9px] text-white/30">Step {step.step_order + 1}</p>
                            <p className="text-sm font-bold text-amber-400">${step.price}</p>
                          </div>
                          {i < steps.filter(s => s.price > 0).length - 1 && <ArrowDown className="h-3 w-3 text-white/15 rotate-[-90deg]" />}
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

export default ScriptBuilder;

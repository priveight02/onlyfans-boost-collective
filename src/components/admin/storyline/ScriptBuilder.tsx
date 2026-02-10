import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, MessageSquare, Image, DollarSign, Clock,
  GitBranch, Save, Copy, Zap, HelpCircle, Send, Film,
  ChevronDown, ChevronUp, GripVertical, ArrowDown, Eye,
  Sparkles, Loader2, Crown, Timer, BookOpen, Lightbulb,
  Download, FileSpreadsheet, FileText,
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
const SCRIPT_LENGTHS = [
  { value: "very_short", label: "Very Short", desc: "5-7 steps, 2-3 media", icon: "⚡" },
  { value: "short", label: "Short", desc: "8-10 steps, 3-4 media", icon: "🔥" },
  { value: "medium", label: "Medium", desc: "12-16 steps, 4-5 media", icon: "📋" },
  { value: "long", label: "Long", desc: "18-22 steps, 5-7 media", icon: "📖" },
  { value: "very_long", label: "Very Long", desc: "25-35 steps, 7-10 media", icon: "📚" },
];

/* ── Script Templates ── */
const SCRIPT_TEMPLATES = [
  {
    name: "Morning Routine",
    description: "Casual morning content in bedroom/bathroom setting, 4 media items",
    icon: "☀️",
    category: "general",
    steps: [
      { step_type: "welcome", title: "Morning greeting", content: "Good morning {NAME}! Just woke up... 🥱", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Casual preview", content: "Just took this for you 😊", media_type: "image", media_url: "1 casual selfie in bed, messy hair, natural look", price: 0, delay_minutes: 2 },
      { step_type: "message", title: "Build rapport", content: "How did you sleep? I had the craziest dream last night 😂", media_type: "", media_url: "", price: 0, delay_minutes: 3 },
      { step_type: "ppv_content", title: "Getting ready 1", content: "Getting ready for the day... want to see? 😏", media_type: "image", media_url: "2 images - getting ready, same bedroom setting", price: 5, delay_minutes: 5 },
      { step_type: "condition", title: "Check response", content: "", media_type: "", media_url: "", price: 0, delay_minutes: 10, condition_logic: { condition: "Responded or purchased" } },
      { step_type: "followup_purchased", title: "Thank + tease", content: "Glad you liked it! 😘 Want to see what I'm wearing today?", media_type: "", media_url: "", price: 0, delay_minutes: 2 },
      { step_type: "ppv_content", title: "Full outfit reveal", content: "Here's the full look 💕", media_type: "mixed", media_url: "2 photos + 15s video - full outfit, same room", price: 10, delay_minutes: 3 },
      { step_type: "followup_ignored", title: "Re-engage", content: "Hey {NAME}, you missed my morning look! 😉", media_type: "image", media_url: "1 teaser image, cropped", price: 0, delay_minutes: 60 },
      { step_type: "ppv_content", title: "Premium set", content: "The complete morning set just for you ✨", media_type: "mixed", media_url: "3 images + 28s video - complete set, same setting", price: 20, delay_minutes: 5 },
    ],
  },
  {
    name: "Workout Session",
    description: "Post-workout content in gym/home gym, progressive 5 media items",
    icon: "💪",
    category: "retention",
    steps: [
      { step_type: "welcome", title: "Workout done", content: "Just finished my workout {NAME}! 💦", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Quick selfie", content: "Proof I actually went 😂", media_type: "image", media_url: "1 mirror selfie in gym clothes", price: 0, delay_minutes: 1 },
      { step_type: "question", title: "Engage", content: "Do you work out too? What's your routine?", media_type: "", media_url: "", price: 0, delay_minutes: 3 },
      { step_type: "ppv_content", title: "Workout clips", content: "Some clips from today 🏋️", media_type: "video", media_url: "Video 0:22 - workout highlights", price: 7, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Post-workout", content: "The post-workout glow 😏", media_type: "image", media_url: "3 images - post-workout, same gym", price: 12, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Exclusive set", content: "Full set - only for favorites ✨", media_type: "mixed", media_url: "4 images + 35s video", price: 25, delay_minutes: 3 },
    ],
  },
  {
    name: "Night Out Prep",
    description: "Getting ready for a night out, 4 media items",
    icon: "🌙",
    category: "upsell",
    steps: [
      { step_type: "welcome", title: "Evening", content: "Hey {NAME}! Getting ready to go out 🥂", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Outfit options", content: "Help me pick? 😊", media_type: "image", media_url: "1 image - holding up outfits", price: 0, delay_minutes: 2 },
      { step_type: "ppv_content", title: "Trying on", content: "Trying them on 😏", media_type: "image", media_url: "2 images - trying outfits", price: 5, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Final look", content: "What do you think? 🔥", media_type: "mixed", media_url: "2 images + 20s video", price: 12, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Exclusive BTS", content: "Full getting-ready experience 💕", media_type: "mixed", media_url: "3 images + 40s video", price: 20, delay_minutes: 5 },
    ],
  },
  {
    name: "Lazy Day",
    description: "Cozy at-home content, living room, 5 media items",
    icon: "🛋️",
    category: "retention",
    steps: [
      { step_type: "welcome", title: "Lazy vibes", content: "Laziest day ever {NAME} 🛋️", media_type: "", media_url: "", price: 0, delay_minutes: 0 },
      { step_type: "free_content", title: "Cozy preview", content: "Current mood 😴", media_type: "image", media_url: "1 cozy selfie on couch", price: 0, delay_minutes: 2 },
      { step_type: "ppv_content", title: "Cozy set", content: "Getting comfy... 😊", media_type: "image", media_url: "2 images - lounging, cozy", price: 5, delay_minutes: 8 },
      { step_type: "ppv_content", title: "Video", content: "Just for you 💕", media_type: "video", media_url: "Video 0:30 - personal message", price: 15, delay_minutes: 5 },
      { step_type: "ppv_content", title: "Full set", content: "Complete lazy day collection ✨", media_type: "mixed", media_url: "4 images + 45s video", price: 25, delay_minutes: 3 },
    ],
  },
];

/* ── Export Utilities ── */
const exportToCSV = (script: Script, steps: ScriptStep[]) => {
  const headers = ["#", "Type", "Title", "Content", "Media Type", "Media Description", "Price ($)", "Delay (min)"];
  const rows = steps.map((s, i) => [
    i + 1, s.step_type, s.title, `"${(s.content || "").replace(/"/g, '""')}"`,
    s.media_type || "", `"${(s.media_url || "").replace(/"/g, '""')}"`,
    s.price || 0, s.delay_minutes || 0,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadFile(`${script.title || "script"}.csv`, csv, "text/csv");
};

const exportToText = (script: Script, steps: ScriptStep[]) => {
  let text = `📋 SCRIPT: ${script.title}\n`;
  text += `📝 ${script.description || ""}\n`;
  text += `📂 Category: ${script.category} | 🎯 Target: ${script.target_segment}\n`;
  text += `💰 Total Value: $${steps.reduce((s, st) => s + (st.price || 0), 0)}\n`;
  text += "═".repeat(60) + "\n\n";
  steps.forEach((s, i) => {
    const typeLabel = s.step_type.toUpperCase().replace(/_/g, " ");
    text += `[${i + 1}] ${typeLabel}${s.price > 0 ? ` — $${s.price}` : ""}\n`;
    if (s.title) text += `    Title: ${s.title}\n`;
    if (s.content) text += `    Message: ${s.content}\n`;
    if (s.media_url) text += `    Media: ${s.media_type ? `(${s.media_type}) ` : ""}${s.media_url}\n`;
    if (s.delay_minutes > 0) text += `    ⏱ Wait ${s.delay_minutes} min\n`;
    if (s.step_type === "condition") text += `    ⑂ Branch: ${s.condition_logic?.condition || "Check response"}\n`;
    text += "\n";
  });
  downloadFile(`${script.title || "script"}.txt`, text, "text/plain");
};

const exportToMarkdown = (script: Script, steps: ScriptStep[]) => {
  let md = `# 📋 ${script.title}\n\n`;
  md += `> ${script.description || ""}\n\n`;
  md += `**Category:** ${script.category} | **Target:** ${script.target_segment} | **Total:** $${steps.reduce((s, st) => s + (st.price || 0), 0)}\n\n`;
  md += "---\n\n";
  md += "| # | Type | Content | Media | Price | Delay |\n";
  md += "|---|------|---------|-------|-------|-------|\n";
  steps.forEach((s, i) => {
    md += `| ${i + 1} | ${s.step_type} | ${(s.content || s.title || "—").substring(0, 50)} | ${s.media_url ? `${s.media_type}: ${s.media_url.substring(0, 30)}` : "—"} | ${s.price > 0 ? `$${s.price}` : "—"} | ${s.delay_minutes > 0 ? `${s.delay_minutes}m` : "—"} |\n`;
  });
  md += "\n---\n\n";
  steps.forEach((s, i) => {
    md += `### Step ${i + 1}: ${s.step_type.toUpperCase().replace(/_/g, " ")}${s.price > 0 ? ` — $${s.price}` : ""}\n\n`;
    if (s.content) md += `${s.content}\n\n`;
    if (s.media_url) md += `📎 *${s.media_type}: ${s.media_url}*\n\n`;
  });
  downloadFile(`${script.title || "script"}.md`, md, "text/markdown");
};

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ScriptBuilder = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [viewMode, setViewMode] = useState<"flow" | "edit">("flow");
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [newScript, setNewScript] = useState<Script>({
    title: "", description: "", category: "general", status: "draft", target_segment: "all", version: 1,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingQuality, setGeneratingQuality] = useState<"fast" | "premium" | null>(null);

  // Generation options
  const [generateRealMessages, setGenerateRealMessages] = useState(true);
  const [scriptLength, setScriptLength] = useState("medium");
  const [includeConditions, setIncludeConditions] = useState(true);
  const [includeFollowups, setIncludeFollowups] = useState(true);
  const [includeDelays, setIncludeDelays] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [messageTone, setMessageTone] = useState<"innocent" | "bold" | "aggressive_innocent" | "submissive" | "bratty" | "dynamic_shift">("innocent");
  const [enableDynamicShift, setEnableDynamicShift] = useState(false);
  const [enableExclusivity, setEnableExclusivity] = useState(true);
  const [enableTypoSimulation, setEnableTypoSimulation] = useState(false);
  const [enableFreeFirst, setEnableFreeFirst] = useState(true);
  const [enableMaxConversion, setEnableMaxConversion] = useState(true);

  const [genTimer, setGenTimer] = useState(0);
  const [genEstimate, setGenEstimate] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { loadScripts(); }, []);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

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

  const applyTemplate = async (template: typeof SCRIPT_TEMPLATES[0]) => {
    const { data, error } = await supabase.from("scripts").insert({
      title: template.name, description: template.description,
      category: template.category, target_segment: "all",
    }).select().single();
    if (error) return toast.error(error.message);

    if (data && template.steps.length > 0) {
      await supabase.from("script_steps").insert(
        template.steps.map((s, i) => ({
          script_id: data.id, step_order: i, step_type: s.step_type,
          title: s.title, content: s.content, media_url: s.media_url, media_type: s.media_type,
          price: s.price, delay_minutes: s.delay_minutes,
          condition_logic: s.step_type === "condition" ? (s as any).condition_logic || {} : {},
        }))
      );
    }
    toast.success(`Template "${template.name}" applied!`);
    setShowTemplates(false);
    await loadScripts();
    if (data) selectScript(data);
  };

  const addStep = (type: string = "message") => {
    setSteps(prev => [...prev, {
      step_order: prev.length, step_type: type, title: "", content: "",
      media_url: "", media_type: "", price: 0, delay_minutes: 0,
      condition_logic: {}, conversion_rate: 0, drop_off_rate: 0,
      revenue_generated: 0, impressions: 0,
    }]);
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

  const reorderSteps = (fromIndex: number, toIndex: number) => {
    const newSteps = [...steps];
    const [moved] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, moved);
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

  // ── ALWAYS creates a NEW script in DB and redirects to it ──
  const generateScript = async (quality: "fast" | "premium") => {
    setGenerating(true);
    setGeneratingQuality(quality);
    const estimateMap: Record<string, number> = { very_short: 6, short: 8, medium: 12, long: 18, very_long: 25 };
    const estimate = (estimateMap[scriptLength] || 12) * (quality === "premium" ? 2 : 1);
    setGenEstimate(estimate);
    setGenTimer(0);
    timerRef.current = setInterval(() => setGenTimer(prev => prev + 1), 1000);

    try {
      const category = selectedScript?.category || newScript.category || "general";
      const segment = selectedScript?.target_segment || newScript.target_segment || "new_users";

      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: {
          category, target_segment: segment, quality,
          generate_real_messages: generateRealMessages,
          script_length: scriptLength,
          include_conditions: includeConditions,
          include_followups: includeFollowups,
          include_delays: includeDelays,
          include_questions: includeQuestions,
          message_tone: enableDynamicShift ? "dynamic_shift" : messageTone,
          enable_exclusivity: enableExclusivity,
          enable_typo_simulation: enableTypoSimulation,
          enable_free_first: enableFreeFirst,
          enable_max_conversion: enableMaxConversion,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // ALWAYS create a new script entry in DB
      const { data: newScriptData, error: createErr } = await supabase.from("scripts").insert({
        title: data.title || `AI ${quality === "premium" ? "Premium" : "Fast"} Script`,
        description: data.description || "",
        category,
        target_segment: segment,
      }).select().single();
      if (createErr) throw createErr;

      // Save all steps to DB
      if (data.steps?.length > 0 && newScriptData) {
        await supabase.from("script_steps").insert(
          data.steps.map((s: any, i: number) => ({
            script_id: newScriptData.id, step_order: i, step_type: s.step_type || "message",
            title: s.title || "", content: s.content || "",
            media_url: s.media_url || "", media_type: s.media_type || "",
            price: s.price || 0, delay_minutes: s.delay_minutes || 0,
            condition_logic: s.condition_logic || {},
          }))
        );
      }

      // Reload scripts list and auto-select the new script
      await loadScripts();
      if (newScriptData) {
        await selectScript(newScriptData);
        setViewMode("flow");
      }

      toast.success(`${quality === "premium" ? "👑 Premium" : "⚡ Fast"} script saved to library!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate script");
    } finally {
      setGenerating(false);
      setGeneratingQuality(null);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const totalPrice = steps.reduce((s, step) => s + (step.price || 0), 0);
  const paidSteps = steps.filter(s => s.price > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Script Builder</h2>
          <p className="text-xs text-white/40">Design structured content scripts with progressive pricing & psychology</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Generate Buttons */}
          <Button size="sm" onClick={() => generateScript("fast")} disabled={generating}
            className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0">
            {generatingQuality === "fast" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {generatingQuality === "fast" ? "Generating..." : "⚡ Fast"}
          </Button>
          <Button size="sm" onClick={() => generateScript("premium")} disabled={generating}
            className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0">
            {generatingQuality === "premium" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
            {generatingQuality === "premium" ? "Generating..." : "👑 Premium"}
          </Button>

          {/* Gen Options */}
          <Dialog open={showGenOptions} onOpenChange={setShowGenOptions}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 border-white/10 text-white/50 hover:text-white text-[10px] h-8">
                <Sparkles className="h-3 w-3" /> Options
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" /> Generation Options</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Length */}
                <div>
                  <Label className="text-xs text-white/60 mb-2 block">Script Length</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {SCRIPT_LENGTHS.map(l => (
                      <button key={l.value} onClick={() => setScriptLength(l.value)}
                        className={`p-2 rounded-lg text-center transition-all border ${
                          scriptLength === l.value ? "bg-accent/20 border-accent/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                        }`}>
                        <span className="text-sm block">{l.icon}</span>
                        <span className="text-[9px] font-semibold block">{l.label}</span>
                        <span className="text-[7px] block text-white/30">{l.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Content Options</Label>
                  <div className="flex items-center gap-2">
                    <Switch id="opt-real" checked={generateRealMessages} onCheckedChange={setGenerateRealMessages} />
                    <Label htmlFor="opt-real" className="text-xs text-white/70 cursor-pointer">Generate real messages (vs placeholders)</Label>
                  </div>
                </div>

                {/* Dynamic Tone Shift */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <Switch id="opt-dynamic" checked={enableDynamicShift} onCheckedChange={(v) => { setEnableDynamicShift(v); if (v) setMessageTone("dynamic_shift"); }} />
                    <div className="flex-1">
                      <Label htmlFor="opt-dynamic" className="text-xs text-white cursor-pointer font-semibold flex items-center gap-1.5">
                        🎭 Dynamic Tone Shift
                        <Badge variant="outline" className="text-[7px] border-purple-500/30 text-purple-300">NEW</Badge>
                      </Label>
                      <p className="text-[8px] text-white/40 mt-0.5">Starts innocent → builds bold/aggressive → goes submissive after media. Mimics real conversation flow.</p>
                    </div>
                  </div>
                </div>

                {/* Exclusivity & Natural Pauses */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <Switch id="opt-exclusivity" checked={enableExclusivity} onCheckedChange={setEnableExclusivity} />
                    <div className="flex-1">
                      <Label htmlFor="opt-exclusivity" className="text-xs text-white cursor-pointer font-semibold flex items-center gap-1.5">
                        ✨ Exclusivity & Natural Pauses
                      </Label>
                      <p className="text-[8px] text-white/40 mt-0.5">"Hold on 2 mins", content shot on the spot, "only for you" — makes it feel real & exclusive.</p>
                    </div>
                  </div>
                </div>

                {/* Message Tone */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Message Tone {enableDynamicShift && <span className="text-purple-400">(overridden by Dynamic Shift)</span>}</Label>
                  <div className={`grid grid-cols-3 gap-2 ${enableDynamicShift ? "opacity-40 pointer-events-none" : ""}`}>
                    <button onClick={() => setMessageTone("innocent")}
                      className={`p-3 rounded-lg text-center transition-all border ${
                        messageTone === "innocent" ? "bg-pink-500/20 border-pink-500/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}>
                      <span className="text-lg block">🥺</span>
                      <span className="text-[10px] font-semibold block">Innocent / Cute</span>
                      <span className="text-[8px] block text-white/30">Shy, sweet, girl-next-door</span>
                    </button>
                    <button onClick={() => setMessageTone("aggressive_innocent")}
                      className={`p-3 rounded-lg text-center transition-all border ${
                        messageTone === "aggressive_innocent" ? "bg-purple-500/20 border-purple-500/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}>
                      <span className="text-lg block">😈</span>
                      <span className="text-[10px] font-semibold block">Spicy / Casual</span>
                      <span className="text-[8px] block text-white/30">Bold words, "u" texting style</span>
                    </button>
                    <button onClick={() => setMessageTone("bold")}
                      className={`p-3 rounded-lg text-center transition-all border ${
                        messageTone === "bold" ? "bg-red-500/20 border-red-500/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}>
                      <span className="text-lg block">🔥</span>
                      <span className="text-[10px] font-semibold block">Bold / Explicit</span>
                      <span className="text-[8px] block text-white/30">Confident, direct, grown-up</span>
                    </button>
                    <button onClick={() => setMessageTone("submissive")}
                      className={`p-3 rounded-lg text-center transition-all border ${
                        messageTone === "submissive" ? "bg-blue-500/20 border-blue-500/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}>
                      <span className="text-lg block">🫣</span>
                      <span className="text-[10px] font-semibold block">Submissive / Needy</span>
                      <span className="text-[8px] block text-white/30">Begging, pleasing, devoted</span>
                    </button>
                    <button onClick={() => setMessageTone("bratty")}
                      className={`p-3 rounded-lg text-center transition-all border ${
                        messageTone === "bratty" ? "bg-orange-500/20 border-orange-500/40 text-white" : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}>
                      <span className="text-lg block">💅</span>
                      <span className="text-[10px] font-semibold block">Bratty / Tease</span>
                      <span className="text-[8px] block text-white/30">Playful attitude, "make me"</span>
                    </button>
                  </div>
                </div>

                {/* Conversion & Realism Boosters */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Conversion & Realism Boosters</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <Switch id="opt-typo" checked={enableTypoSimulation} onCheckedChange={setEnableTypoSimulation} />
                      <div className="flex-1">
                        <Label htmlFor="opt-typo" className="text-xs text-white cursor-pointer font-semibold flex items-center gap-1.5">
                          ✏️ Typo Simulation
                          <Badge variant="outline" className="text-[7px] border-green-500/30 text-green-300">OFF</Badge>
                        </Label>
                        <p className="text-[8px] text-white/40 mt-0.5">Intentionally mistype a word then correct with *asterisk in next message. Makes it feel human.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <Switch id="opt-freefirst" checked={enableFreeFirst} onCheckedChange={setEnableFreeFirst} />
                      <div className="flex-1">
                        <Label htmlFor="opt-freefirst" className="text-xs text-white cursor-pointer font-semibold">
                          🎁 Free Content First
                        </Label>
                        <p className="text-[8px] text-white/40 mt-0.5">Always start with 1-2 free media to lock the fan in before any PPV. Triggers reciprocity.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                      <Switch id="opt-maxconv" checked={enableMaxConversion} onCheckedChange={setEnableMaxConversion} />
                      <div className="flex-1">
                        <Label htmlFor="opt-maxconv" className="text-xs text-white cursor-pointer font-semibold">
                          💰 Max Conversion Mode
                        </Label>
                        <p className="text-[8px] text-white/40 mt-0.5">Optimize every message for conversion: sunk cost, FOMO, urgency, and re-engagement loops.</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Condition checkboxes */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Include in Script</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "conditions", label: "Conditions (branches)", checked: includeConditions, set: setIncludeConditions },
                      { id: "followups", label: "Follow-ups (bought/ignored)", checked: includeFollowups, set: setIncludeFollowups },
                      { id: "delays", label: "Timing delays", checked: includeDelays, set: setIncludeDelays },
                      { id: "questions", label: "Engagement questions", checked: includeQuestions, set: setIncludeQuestions },
                    ].map(opt => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]">
                        <Checkbox checked={opt.checked} onCheckedChange={(v) => opt.set(v === true)} />
                        <span className="text-[10px] text-white/60">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Templates */}
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 border-white/10 text-white/50 hover:text-white text-[10px] h-8">
                <BookOpen className="h-3 w-3" /> Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-lg">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" /> Script Templates</DialogTitle></DialogHeader>
              <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto">
                {SCRIPT_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => applyTemplate(t)}
                    className="w-full text-left p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{t.icon}</span>
                      <span className="font-semibold text-sm text-white">{t.name}</span>
                      <Badge variant="outline" className="text-[9px] border-white/10 text-white/40 ml-auto">{t.steps.length} steps</Badge>
                      <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">
                        ${t.steps.reduce((sum, s) => sum + s.price, 0)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-white/40">{t.description}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/80 h-8"><Plus className="h-3.5 w-3.5" /> New</Button>
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
      </div>

      {/* Generation Loading */}
      {generating && (
        <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse flex items-center justify-center">
                  {generatingQuality === "premium" ? <Crown className="h-5 w-5 text-white" /> : <Zap className="h-5 w-5 text-white" />}
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-spin" style={{ borderTopColor: "transparent" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {generatingQuality === "premium" ? "Generating Premium Script..." : "Generating Fast Script..."}
                </p>
                <p className="text-xs text-white/40">
                  {SCRIPT_LENGTHS.find(l => l.value === scriptLength)?.desc} • Auto-saves to library
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={Math.min((genTimer / genEstimate) * 100, 95)} className="h-1.5 flex-1" />
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Timer className="h-3 w-3" />
                    <span className="text-[10px] font-mono">{genTimer}s / ~{genEstimate}s</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                        <button onClick={() => setViewMode("flow")} className={`px-2 py-1 text-[10px] rounded-md transition-all ${viewMode === "flow" ? "bg-accent text-white" : "text-white/40 hover:text-white"}`}>
                          <Eye className="h-3 w-3 inline mr-1" />Canvas
                        </button>
                        <button onClick={() => setViewMode("edit")} className={`px-2 py-1 text-[10px] rounded-md transition-all ${viewMode === "edit" ? "bg-accent text-white" : "text-white/40 hover:text-white"}`}>
                          <Zap className="h-3 w-3 inline mr-1" />Detail
                        </button>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">
                        <DollarSign className="h-2.5 w-2.5 mr-0.5" />${totalPrice}
                      </Badge>

                      {/* Export dropdown */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 text-white/40 hover:text-white text-[10px] gap-1">
                            <Download className="h-3 w-3" /> Export
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-xs">
                          <DialogHeader><DialogTitle className="text-sm">Export Script</DialogTitle></DialogHeader>
                          <div className="space-y-2">
                            <button onClick={() => { exportToCSV(selectedScript, steps); }} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">Google Sheets / CSV</p>
                                <p className="text-[10px] text-white/40">Opens in Google Sheets, Excel, Numbers</p>
                              </div>
                            </button>
                            <button onClick={() => { exportToText(selectedScript, steps); }} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                              <FileText className="h-5 w-5 text-blue-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">Plain Text / Notes</p>
                                <p className="text-[10px] text-white/40">Apple Notes, Notepad, any text editor</p>
                              </div>
                            </button>
                            <button onClick={() => { exportToMarkdown(selectedScript, steps); }} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                              <FileText className="h-5 w-5 text-purple-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-white">Markdown / Word</p>
                                <p className="text-[10px] text-white/40">Formatted doc, Notion, Google Docs</p>
                              </div>
                            </button>
                          </div>
                        </DialogContent>
                      </Dialog>

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

              {/* Flow / Edit View */}
              {viewMode === "flow" ? (
                <ScriptFlowView
                  steps={steps}
                  onEditStep={(i) => { setEditingStep(i); setViewMode("edit"); }}
                  onAddStep={addStep}
                  onRemoveStep={removeStep}
                  onMoveStep={moveStep}
                  onDuplicateStep={duplicateStep}
                  onUpdateStep={updateStep}
                  onReorderSteps={reorderSteps}
                />
              ) : (
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <StepEditor key={i} step={step} index={i}
                      isExpanded={editingStep === i}
                      onToggle={() => setEditingStep(editingStep === i ? null : i)}
                      onUpdate={(field, value) => updateStep(i, field, value)}
                      onRemove={() => removeStep(i)}
                      onMoveUp={() => moveStep(i, "up")}
                      onMoveDown={() => moveStep(i, "down")}
                      onDuplicate={() => duplicateStep(i)} />
                  ))}
                  <StepAddButtons onAdd={addStep} />
                </div>
              )}

              {/* Pricing ladder */}
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
              <CardContent className="py-16 text-center space-y-4">
                <Zap className="h-8 w-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Select a script, use a template, or generate one with AI</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => setShowTemplates(true)} variant="outline" className="gap-1.5 border-white/10 text-white/50 hover:text-white">
                    <BookOpen className="h-3.5 w-3.5" /> Templates
                  </Button>
                  <Button size="sm" onClick={() => generateScript("fast")} disabled={generating}
                    className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                    <Zap className="h-3.5 w-3.5" /> Generate Fast
                  </Button>
                </div>
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
];

const getStepConfig = (type: string) => STEP_TYPES.find(s => s.value === type) || STEP_TYPES[1];

/* ── Step Add Buttons ── */
const StepAddButtons = ({ onAdd }: { onAdd: (type: string) => void }) => (
  <div className="flex flex-wrap gap-1.5 p-3 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
    <p className="text-[10px] text-white/30 w-full mb-1">Add step:</p>
    {STEP_TYPES.map(t => (
      <button key={t.value} onClick={() => onAdd(t.value)}
        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${t.color}/20 text-white/60 hover:text-white border border-white/5 hover:border-white/10`}>
        {t.label}
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
                <label className="text-[10px] text-white/40 block mb-1">Content / Message</label>
                <Textarea value={step.content} onChange={e => onUpdate("content", e.target.value)}
                  placeholder="Message text, caption, or instructions..."
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
                  <label className="text-[10px] text-white/40 block mb-1">Media Desc.</label>
                  <Input value={step.media_url} onChange={e => onUpdate("media_url", e.target.value)} placeholder="e.g. 2 selfies" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
              </div>

              {step.step_type === "condition" && (
                <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-[10px] text-blue-400 font-medium mb-1">Branching Condition</p>
                  <Input value={step.condition_logic?.condition || ""} onChange={e => onUpdate("condition_logic", { ...step.condition_logic, condition: e.target.value })}
                    placeholder="e.g. Responded to message" className="bg-white/5 border-white/10 text-white text-xs h-8" />
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

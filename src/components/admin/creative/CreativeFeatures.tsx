import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Sparkles, Loader2, Palette, Globe, Languages, Hash, Zap, Target,
  BarChart3, TrendingUp, FileText, Copy, CheckCircle2, Brain,
  Layers, Shield, Clock, ArrowUpRight, DollarSign, Users,
  Megaphone, Star, Search, Eye, Tag, RefreshCw, Wand2,
  PieChart, LineChart, ShieldCheck, Lightbulb, Gauge,
  ImagePlus, Scissors, Paintbrush, Type, MessageSquare,
  GitBranch, Split, History, MapPin, Activity, Flame,
  Crosshair, AlertTriangle, Repeat, ArrowRight, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Helper to save feature data to backend
const saveFeatureData = async (featureKey: string, data: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("copilot_generated_content").delete()
    .eq("content_type", `feature_${featureKey}`).eq("created_by", user.id);
  await supabase.from("copilot_generated_content").insert({
    content_type: `feature_${featureKey}`, url: featureKey,
    metadata: data as any, created_by: user.id,
  });
};

const loadFeatureData = async (featureKey: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("copilot_generated_content")
    .select("metadata").eq("content_type", `feature_${featureKey}`)
    .eq("created_by", user.id).maybeSingle();
  return data?.metadata as any;
};

// ═══════════════════════════════════════════════════
// 1. BRAND KIT MANAGER
// ═══════════════════════════════════════════════════
export const BrandKitPanel = () => {
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [secondaryColor, setSecondaryColor] = useState("#8B5CF6");
  const [accentColor, setAccentColor] = useState("#F59E0B");
  const [brandFont, setBrandFont] = useState("Inter");
  const [brandTone, setBrandTone] = useState("professional");
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const m = await loadFeatureData("brand_kit");
      if (m) {
        setBrandName(m.brandName || ""); setPrimaryColor(m.primaryColor || "#3B82F6");
        setSecondaryColor(m.secondaryColor || "#8B5CF6"); setAccentColor(m.accentColor || "#F59E0B");
        setBrandFont(m.brandFont || "Inter"); setBrandTone(m.brandTone || "professional");
        setTagline(m.tagline || "");
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFeatureData("brand_kit", { brandName, primaryColor, secondaryColor, accentColor, brandFont, brandTone, tagline });
      toast.success("Brand kit saved!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Palette className="w-3.5 h-3.5 text-purple-400" />Brand Kit</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[10px] text-white/35">Brand Name</label><Input value={brandName} onChange={e => setBrandName(e.target.value)} className="mt-0.5 text-xs crm-input h-7" placeholder="Your Brand" /></div>
          <div><label className="text-[10px] text-white/35">Tagline</label><Input value={tagline} onChange={e => setTagline(e.target.value)} className="mt-0.5 text-xs crm-input h-7" placeholder="Your tagline..." /></div>
        </div>
        <div className="flex gap-2">
          {[{ label: "Primary", value: primaryColor, set: setPrimaryColor }, { label: "Secondary", value: secondaryColor, set: setSecondaryColor }, { label: "Accent", value: accentColor, set: setAccentColor }].map(c => (
            <div key={c.label} className="flex-1">
              <label className="text-[9px] text-white/25">{c.label}</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input type="color" value={c.value} onChange={e => c.set(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
                <Input value={c.value} onChange={e => c.set(e.target.value)} className="text-[9px] crm-input h-5 px-1 font-mono" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={brandFont} onValueChange={setBrandFont}>
            <SelectTrigger className="text-xs crm-input h-7"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              {["Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto", "Oswald"].map(f => <SelectItem key={f} value={f} className="text-white text-xs">{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={brandTone} onValueChange={setBrandTone}>
            <SelectTrigger className="text-xs crm-input h-7"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              {["professional", "casual", "luxury", "playful", "bold", "minimalist"].map(t => <SelectItem key={t} value={t} className="text-white text-xs capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.04]" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)` }}>
          <div className="w-4 h-4 rounded-full" style={{ background: primaryColor }} />
          <div className="w-4 h-4 rounded-full" style={{ background: secondaryColor }} />
          <div className="w-4 h-4 rounded-full" style={{ background: accentColor }} />
          <p className="text-[9px] text-white/40 ml-1" style={{ fontFamily: brandFont }}>{brandName || "Brand"} — {tagline || "Tagline"}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full text-xs h-7" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Save Brand Kit
        </Button>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 2. AI COPY TOOLS
// ═══════════════════════════════════════════════════
export const AICopyToolsPanel = ({ productName, productDescription, targetAudience }: { productName: string; productDescription: string; targetAudience: string }) => {
  const [activeAITool, setActiveAITool] = useState<"translate" | "tone" | "hashtags" | "hooks" | "cta">("translate");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("spanish");
  const [selectedTone, setSelectedTone] = useState("urgent");

  const runAITool = async () => {
    setProcessing(true); setOutputText("");
    try {
      let prompt = "";
      const context = `Product: ${productName}\nDescription: ${productDescription}\nAudience: ${targetAudience}`;
      switch (activeAITool) {
        case "translate": prompt = `Translate this ad copy to ${selectedLanguage}. Keep the marketing tone. Return ONLY the translation.\n\nText: ${inputText || productDescription}`; break;
        case "tone": prompt = `Rewrite this ad copy in a ${selectedTone} tone. Return ONLY the rewritten copy.\n\n${context}\n\nOriginal: ${inputText || productDescription}`; break;
        case "hashtags": prompt = `Generate 15 relevant hashtags for this product ad. Return ONLY the hashtags, one per line.\n\n${context}`; break;
        case "hooks": prompt = `Generate 5 powerful ad hook lines for this product. Each under 10 words. Return ONLY the hooks, numbered.\n\n${context}`; break;
        case "cta": prompt = `Generate 8 compelling CTA button text variations for this product. 2-4 words max each. Return ONLY the CTAs, numbered.\n\n${context}`; break;
      }
      const { data, error } = await supabase.functions.invoke("agency-copilot", { body: { messages: [{ role: "user", content: prompt }] } });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      setOutputText(text);
      // Save to history
      await saveFeatureData(`copy_history_${Date.now()}`, { tool: activeAITool, input: inputText, output: text, timestamp: new Date().toISOString() });
      toast.success(`AI ${activeAITool} completed`);
    } catch (e: any) { toast.error(e.message || "AI tool failed"); }
    finally { setProcessing(false); }
  };

  const tools = [
    { id: "translate" as const, label: "Translate", icon: Languages, color: "text-blue-400" },
    { id: "tone" as const, label: "Tone", icon: MessageSquare, color: "text-purple-400" },
    { id: "hashtags" as const, label: "Tags", icon: Hash, color: "text-pink-400" },
    { id: "hooks" as const, label: "Hooks", icon: Zap, color: "text-amber-400" },
    { id: "cta" as const, label: "CTA", icon: Target, color: "text-emerald-400" },
  ];

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-cyan-400" />AI Copy Toolkit</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1">
          {tools.map(t => (
            <button key={t.id} onClick={() => setActiveAITool(t.id)} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium border transition-all ${activeAITool === t.id ? `border-white/20 bg-white/[0.06] ${t.color}` : "border-white/[0.04] text-white/30"}`}>
              <t.icon className="h-2.5 w-2.5" />{t.label}
            </button>
          ))}
        </div>
        {activeAITool === "translate" && (
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="text-xs crm-input h-7"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              {["Spanish", "French", "German", "Portuguese", "Japanese", "Korean", "Chinese", "Arabic"].map(l => <SelectItem key={l.toLowerCase()} value={l.toLowerCase()} className="text-white text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {activeAITool === "tone" && (
          <Select value={selectedTone} onValueChange={setSelectedTone}>
            <SelectTrigger className="text-xs crm-input h-7"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              {["urgent", "luxury", "casual", "professional", "playful", "empathetic", "authoritative"].map(t => <SelectItem key={t} value={t} className="text-white text-xs capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(activeAITool === "translate" || activeAITool === "tone") && (
          <Textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Paste copy or leave empty for product desc..." className="text-xs crm-input min-h-[50px]" />
        )}
        <Button onClick={runAITool} disabled={processing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(200 80% 50%), hsl(260 80% 55%))" }}>
          {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Run {tools.find(t => t.id === activeAITool)?.label}
        </Button>
        {outputText && (
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] relative max-h-[150px] overflow-auto">
            <button onClick={() => { navigator.clipboard.writeText(outputText); toast.success("Copied!"); }} className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-white/[0.06]"><Copy className="h-2.5 w-2.5 text-white/30" /></button>
            <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-sans leading-relaxed">{outputText}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 3. AI PERFORMANCE PREDICTOR
// ═══════════════════════════════════════════════════
export const PerformancePredictorPanel = ({ headline, copy, cta, imageUrl }: { headline: string; copy: string; cta: string; imageUrl?: string }) => {
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);

  const predict = async () => {
    setPredicting(true);
    try {
      const prompt = `Analyze this ad creative and predict performance. Return JSON with: "ctr_prediction" (number %), "engagement_score" (1-100), "conversion_potential" (Low/Medium/High/Very High), "strengths" (3 strings), "weaknesses" (2 strings), "optimization_tips" (3 strings), "best_platform" (string), "best_time" (string), "audience_match" (1-100). Headline: ${headline}, Copy: ${copy}, CTA: ${cta}. Return ONLY valid JSON.`;
      const { data, error } = await supabase.functions.invoke("agency-copilot", { body: { messages: [{ role: "user", content: prompt }] } });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) { setPrediction(JSON.parse(jsonMatch[0])); toast.success("Prediction ready!"); }
    } catch (e: any) { toast.error(e.message || "Prediction failed"); }
    finally { setPredicting(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Gauge className="w-3.5 h-3.5 text-amber-400" />AI Performance Predictor</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={predict} disabled={predicting} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(40 90% 50%), hsl(20 90% 55%))" }}>
          {predicting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}Predict
        </Button>
        {prediction && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-emerald-400">{prediction.ctr_prediction}%</div><div className="text-[8px] text-white/25">CTR</div></div>
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-blue-400">{prediction.engagement_score}</div><div className="text-[8px] text-white/25">Engage</div></div>
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-purple-400">{prediction.audience_match}</div><div className="text-[8px] text-white/25">Match</div></div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded bg-white/[0.03]"><span className="text-[8px] text-white/25">Platform</span><p className="text-[10px] text-white/60 font-medium">{prediction.best_platform}</p></div>
              <div className="p-1.5 rounded bg-white/[0.03]"><span className="text-[8px] text-white/25">Time</span><p className="text-[10px] text-white/60 font-medium">{prediction.best_time}</p></div>
            </div>
            {prediction.optimization_tips && (
              <div className="p-1.5 rounded bg-blue-500/5 border border-blue-500/10">
                <p className="text-[8px] text-blue-400/70 font-medium mb-0.5">Tips</p>
                {prediction.optimization_tips.slice(0, 2).map((t: string, i: number) => <p key={i} className="text-[9px] text-white/40">• {t}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 4. AI AUDIENCE BUILDER
// ═══════════════════════════════════════════════════
export const AIAudienceBuilder = ({ productName, productDescription }: { productName: string; productDescription: string }) => {
  const [generating, setGenerating] = useState(false);
  const [audiences, setAudiences] = useState<any[]>([]);

  useEffect(() => { loadFeatureData("audiences").then(d => { if (d?.audiences) setAudiences(d.audiences); }); }, []);

  const generateAudiences = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Generate 4 target audience segments for: ${productName} - ${productDescription}. Return JSON array with: "name", "size", "age_range", "gender_split", "interests" (5 strings), "platforms" (array), "income_level", "buying_triggers" (3 strings), "match_score" (1-100). Return ONLY valid JSON array.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAudiences(parsed);
        await saveFeatureData("audiences", { audiences: parsed });
        toast.success("Audiences generated & saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Users className="w-3.5 h-3.5 text-indigo-400" />AI Audience Builder</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={generateAudiences} disabled={generating} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(240 60% 55%), hsl(280 60% 55%))" }}>
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}Generate Audiences
        </Button>
        <div className="max-h-[300px] overflow-auto space-y-2">
          {audiences.map((a, i) => (
            <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold text-white/80">{a.name}</h4>
                <Badge className="text-[8px] bg-indigo-500/20 text-indigo-400">{a.match_score}%</Badge>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[9px]">
                <div className="p-1 rounded bg-white/[0.03]"><span className="text-white/25">Size</span><p className="text-white/50">{a.size}</p></div>
                <div className="p-1 rounded bg-white/[0.03]"><span className="text-white/25">Age</span><p className="text-white/50">{a.age_range}</p></div>
                <div className="p-1 rounded bg-white/[0.03]"><span className="text-white/25">Income</span><p className="text-white/50">{a.income_level}</p></div>
              </div>
              <div className="flex flex-wrap gap-0.5">
                {a.platforms?.map((p: string, j: number) => <span key={j} className="px-1 py-0.5 rounded bg-indigo-500/10 text-[8px] text-indigo-400">{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 5. COMPETITOR ANALYZER
// ═══════════════════════════════════════════════════
export const CompetitorAnalyzer = ({ productName, productDescription }: { productName: string; productDescription: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => { loadFeatureData("competitor_analysis").then(d => { if (d) setAnalysis(d); }); }, []);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Analyze competitive landscape for: ${productName} - ${productDescription}. Return JSON: "market_position", "estimated_competitors" (number), "avg_competitor_ctr", "avg_competitor_cpc", "top_competitor_strategies" (4 objects with "strategy" and "effectiveness" 1-10), "untapped_angles" (3 strings), "recommended_budget_split" (object), "differentiation_score" (1-100), "ad_fatigue_risk" (Low/Medium/High). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAnalysis(parsed);
        await saveFeatureData("competitor_analysis", parsed);
        toast.success("Analysis saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Search className="w-3.5 h-3.5 text-orange-400" />Competitor Intel</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={analyze} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(25 90% 50%), hsl(350 80% 55%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />}Analyze
        </Button>
        {analysis && (
          <div className="space-y-2 max-h-[250px] overflow-auto">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-xs font-bold text-orange-400">{analysis.market_position}</div><div className="text-[8px] text-white/25">Position</div></div>
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-xs font-bold text-white">{analysis.differentiation_score}%</div><div className="text-[8px] text-white/25">Differentiation</div></div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="p-1 rounded bg-white/[0.03]"><div className="text-[10px] font-bold text-white/60">{analysis.estimated_competitors}</div><div className="text-[7px] text-white/20">Competitors</div></div>
              <div className="p-1 rounded bg-white/[0.03]"><div className="text-[10px] font-bold text-white/60">{analysis.avg_competitor_ctr}</div><div className="text-[7px] text-white/20">Avg CTR</div></div>
              <div className="p-1 rounded bg-white/[0.03]"><div className="text-[10px] font-bold text-white/60">{analysis.avg_competitor_cpc}</div><div className="text-[7px] text-white/20">Avg CPC</div></div>
            </div>
            {analysis.untapped_angles && (
              <div>
                <p className="text-[9px] text-emerald-400/70 font-medium mb-0.5">Untapped Angles</p>
                {analysis.untapped_angles.map((a: string, i: number) => <p key={i} className="text-[9px] text-white/40">• {a}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 6. PRODUCT SEO OPTIMIZER
// ═══════════════════════════════════════════════════
export const ProductSEOPanel = ({ title, description, tags, onUpdate }: { title: string; description: string; tags?: string[]; onUpdate?: (seo: any) => void }) => {
  const [optimizing, setOptimizing] = useState(false);
  const [seoResult, setSeoResult] = useState<any>(null);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `SEO optimize this product: Title: ${title}, Description: ${description}, Tags: ${tags?.join(", ") || "none"}. Return JSON: "seo_score" (1-100), "optimized_title" (max 70 chars), "meta_description" (max 160 chars), "optimized_tags" (10 strings), "improvement_tips" (4 strings). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) { setSeoResult(JSON.parse(jsonMatch[0])); toast.success("SEO analysis complete!"); }
    } catch (e: any) { toast.error(e.message); }
    finally { setOptimizing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Search className="w-3.5 h-3.5 text-emerald-400" />AI SEO</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={optimize} disabled={optimizing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(145 70% 40%), hsl(170 70% 45%))" }}>
          {optimizing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Optimize SEO
        </Button>
        {seoResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.03]">
              <span className="text-[9px] text-white/35">SEO Score</span>
              <span className={`text-sm font-bold ${seoResult.seo_score > 70 ? "text-emerald-400" : "text-amber-400"}`}>{seoResult.seo_score}</span>
            </div>
            <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[8px] text-emerald-400/70 font-medium">Optimized Title</p>
              <p className="text-[10px] text-white/70">{seoResult.optimized_title}</p>
              {onUpdate && <Button size="sm" variant="ghost" className="text-[8px] h-4 px-1 text-emerald-400" onClick={() => onUpdate({ title: seoResult.optimized_title })}>Apply</Button>}
            </div>
            <div className="flex flex-wrap gap-0.5">
              {seoResult.optimized_tags?.slice(0, 6).map((t: string, i: number) => <span key={i} className="px-1 py-0.5 rounded bg-white/[0.04] text-[8px] text-white/40">{t}</span>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 7. AI PRODUCT WRITER
// ═══════════════════════════════════════════════════
export const AIProductWriter = ({ title, description, onApply }: { title: string; description: string; onApply?: (desc: string) => void }) => {
  const [writing, setWriting] = useState(false);
  const [style, setStyle] = useState("persuasive");
  const [result, setResult] = useState("");

  const write = async () => {
    setWriting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", { body: { messages: [{ role: "user", content: `Write a ${style} product description for "${title}": "${description}". SEO-optimized, under 200 words. Return ONLY the description.` }] } });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      setResult(text.replace(/^["']|["']$/g, "").trim());
      toast.success("Description generated!");
    } catch (e: any) { toast.error(e.message); }
    finally { setWriting(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-purple-400" />AI Writer</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="text-xs crm-input h-7"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
            {["persuasive", "luxury", "technical", "storytelling", "minimalist", "benefit-focused"].map(s => <SelectItem key={s} value={s} className="text-white text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={write} disabled={writing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(262 83% 50%), hsl(300 80% 55%))" }}>
          {writing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}Generate
        </Button>
        {result && (
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1 max-h-[120px] overflow-auto">
            <p className="text-[10px] text-white/70 whitespace-pre-wrap leading-relaxed">{result}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="text-[9px] h-5 text-white/40" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }}><Copy className="h-2.5 w-2.5 mr-0.5" />Copy</Button>
              {onApply && <Button size="sm" className="text-[9px] h-5 bg-purple-500/20 text-purple-400" onClick={() => onApply(result)}><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Apply</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 8. AI BUDGET OPTIMIZER
// ═══════════════════════════════════════════════════
export const AIBudgetOptimizer = ({ totalBudget, platforms }: { totalBudget: number; platforms: string[] }) => {
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);

  useEffect(() => { loadFeatureData("budget_optimization").then(d => { if (d) setOptimization(d); }); }, []);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Optimize $${totalBudget} budget across: ${platforms.join(", ")}. Return JSON: "allocations" (array with "platform", "budget", "percentage", "expected_roas"), "daily_budget_recommendation", "testing_budget", "waste_reduction_tips" (3 strings), "projected_monthly_results" (object with "impressions", "clicks", "conversions", "revenue"). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setOptimization(parsed);
        await saveFeatureData("budget_optimization", parsed);
        toast.success("Budget optimized & saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setOptimizing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-emerald-400" />Budget Optimizer</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={optimize} disabled={optimizing || platforms.length === 0} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(145 60% 40%), hsl(180 60% 45%))" }}>
          {optimizing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <TrendingUp className="h-3 w-3 mr-1" />}Optimize
        </Button>
        {platforms.length === 0 && <p className="text-[9px] text-white/20 text-center">Connect ad platforms first</p>}
        {optimization && (
          <div className="space-y-2 max-h-[200px] overflow-auto">
            {optimization.allocations?.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.02]">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/60">{a.platform}</span>
                    <span className="text-emerald-400 font-bold">${a.budget}</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full mt-0.5"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${a.percentage}%` }} /></div>
                </div>
              </div>
            ))}
            {optimization.projected_monthly_results && (
              <div className="grid grid-cols-4 gap-1 text-center p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                {Object.entries(optimization.projected_monthly_results).map(([k, v]) => (
                  <div key={k}><div className="text-[9px] text-white/60 font-bold">{typeof v === 'number' ? v.toLocaleString() : String(v)}</div><div className="text-[7px] text-white/20 capitalize">{k}</div></div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 9. TEMPLATE LIBRARY
// ═══════════════════════════════════════════════════
export const TemplateLibrary = ({ onApply }: { onApply: (template: any) => void }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("copilot_generated_content")
        .select("*").eq("content_type", "creative_template").eq("created_by", user.id).order("created_at", { ascending: false });
      if (data) setTemplates(data.map((d: any) => ({ id: d.id, ...(d.metadata as any) })));
      setLoading(false);
    };
    load();
  }, []);

  const generateTemplates = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Generate 6 ad templates for e-commerce. Return JSON array: "name", "category", "headline", "copy", "cta", "style", "best_for", "estimated_ctr". Return ONLY valid JSON array.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const t of parsed) {
            await supabase.from("copilot_generated_content").insert({ content_type: "creative_template", url: `template-${Date.now()}-${Math.random()}`, prompt: t.name, metadata: t as any, created_by: user.id });
          }
        }
        setTemplates(prev => [...parsed.map((t: any, i: number) => ({ id: `new-${i}`, ...t })), ...prev]);
        toast.success(`${parsed.length} templates saved!`);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white/80 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-cyan-400" />Templates</CardTitle>
          <Button size="sm" variant="ghost" onClick={generateTemplates} disabled={generating} className="text-[9px] h-5 text-cyan-400">
            {generating ? <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5 mr-0.5" />}Generate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-[250px] overflow-auto">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-white/20 mx-auto" />}
        {!loading && templates.length === 0 && <p className="text-[9px] text-white/20 text-center py-2">No templates yet</p>}
        {templates.slice(0, 6).map((t, i) => (
          <div key={t.id || i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] cursor-pointer" onClick={() => onApply(t)}>
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-white/70">{t.name}</h4>
              <Badge className="text-[7px] bg-cyan-500/10 text-cyan-400">{t.category}</Badge>
            </div>
            <p className="text-[9px] text-white/50 font-bold mt-0.5">{t.headline}</p>
            <p className="text-[8px] text-white/30 line-clamp-1">{t.copy}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 10. ROI CALCULATOR
// ═══════════════════════════════════════════════════
export const ROICalculator = () => {
  const [adSpend, setAdSpend] = useState("1000");
  const [revenue, setRevenue] = useState("5000");
  const [cogs, setCogs] = useState("1500");
  const [avgOrderValue, setAvgOrderValue] = useState("75");

  const spend = parseFloat(adSpend) || 0;
  const rev = parseFloat(revenue) || 0;
  const cost = parseFloat(cogs) || 0;
  const roi = spend > 0 ? ((rev - cost - spend) / spend * 100).toFixed(1) : "0";
  const roas = spend > 0 ? (rev / spend).toFixed(2) : "0";
  const profit = rev - cost - spend;

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><PieChart className="w-3.5 h-3.5 text-green-400" />ROI Calculator</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <div><label className="text-[9px] text-white/30">Spend ($)</label><Input type="number" value={adSpend} onChange={e => setAdSpend(e.target.value)} className="text-xs crm-input h-6 mt-0.5" /></div>
          <div><label className="text-[9px] text-white/30">Revenue ($)</label><Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="text-xs crm-input h-6 mt-0.5" /></div>
          <div><label className="text-[9px] text-white/30">COGS ($)</label><Input type="number" value={cogs} onChange={e => setCogs(e.target.value)} className="text-xs crm-input h-6 mt-0.5" /></div>
          <div><label className="text-[9px] text-white/30">Avg Order ($)</label><Input type="number" value={avgOrderValue} onChange={e => setAvgOrderValue(e.target.value)} className="text-xs crm-input h-6 mt-0.5" /></div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className={`text-sm font-bold ${parseFloat(roi) > 0 ? "text-emerald-400" : "text-red-400"}`}>{roi}%</div><div className="text-[7px] text-white/20">ROI</div></div>
          <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-blue-400">{roas}x</div><div className="text-[7px] text-white/20">ROAS</div></div>
          <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className={`text-sm font-bold ${profit > 0 ? "text-emerald-400" : "text-red-400"}`}>${profit.toFixed(0)}</div><div className="text-[7px] text-white/20">Profit</div></div>
        </div>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 11. A/B TEST MANAGER
// ═══════════════════════════════════════════════════
export const ABTestManager = ({ variants, onSelectWinner }: { variants: any[]; onSelectWinner?: (id: string) => void }) => {
  const [tests, setTests] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadFeatureData("ab_tests").then(d => { if (d?.tests) setTests(d.tests); }); }, []);

  const createTest = async () => {
    if (variants.length < 2) { toast.error("Need at least 2 variants"); return; }
    setCreating(true);
    try {
      const test = {
        id: Date.now().toString(),
        name: `A/B Test ${tests.length + 1}`,
        variants: variants.slice(0, 3).map(v => ({ id: v.id, label: v.label, score: v.score, ctr: v.ctr })),
        status: "running",
        created_at: new Date().toISOString(),
        traffic_split: Math.floor(100 / Math.min(variants.length, 3)),
      };
      const newTests = [test, ...tests];
      setTests(newTests);
      await saveFeatureData("ab_tests", { tests: newTests });
      toast.success("A/B test launched!");
    } catch (e: any) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const endTest = async (testId: string, winnerId: string) => {
    const updated = tests.map(t => t.id === testId ? { ...t, status: "completed", winner: winnerId } : t);
    setTests(updated);
    await saveFeatureData("ab_tests", { tests: updated });
    onSelectWinner?.(winnerId);
    toast.success("Winner selected!");
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Split className="w-3.5 h-3.5 text-violet-400" />A/B Testing</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={createTest} disabled={creating || variants.length < 2} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(270 60% 55%), hsl(300 60% 55%))" }}>
          {creating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <GitBranch className="h-3 w-3 mr-1" />}Launch A/B Test
        </Button>
        {tests.slice(0, 3).map(test => (
          <div key={test.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/70 font-medium">{test.name}</span>
              <Badge className={`text-[8px] ${test.status === "running" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                {test.status === "running" && <span className="h-1 w-1 rounded-full bg-emerald-400 mr-1 animate-pulse inline-block" />}
                {test.status}
              </Badge>
            </div>
            <div className="flex gap-1">
              {test.variants?.map((v: any) => (
                <div key={v.id} className={`flex-1 p-1.5 rounded text-center border ${test.winner === v.id ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/[0.04]"}`}>
                  <div className="text-[9px] text-white/60 font-medium">{v.label}</div>
                  <div className="text-[10px] text-white/80 font-bold">{v.score}</div>
                  {test.status === "running" && (
                    <button onClick={() => endTest(test.id, v.id)} className="text-[7px] text-violet-400 hover:underline mt-0.5">Pick Winner</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 12. COPY HISTORY
// ═══════════════════════════════════════════════════
export const CopyHistoryPanel = ({ onApply }: { onApply?: (text: string) => void }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("copilot_generated_content")
        .select("metadata, created_at").eq("created_by", user.id)
        .like("content_type", "feature_copy_history_%")
        .order("created_at", { ascending: false }).limit(10);
      if (data) setHistory(data.map(d => ({ ...(d.metadata as any), created_at: d.created_at })));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><History className="w-3.5 h-3.5 text-sky-400" />Copy History</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 max-h-[200px] overflow-auto">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-white/20 mx-auto" />}
        {!loading && history.length === 0 && <p className="text-[9px] text-white/20 text-center py-2">No history yet</p>}
        {history.map((h, i) => (
          <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] cursor-pointer" onClick={() => onApply?.(h.output)}>
            <div className="flex items-center justify-between mb-0.5">
              <Badge className="text-[7px] bg-sky-500/10 text-sky-400 capitalize">{h.tool}</Badge>
              <span className="text-[7px] text-white/20">{new Date(h.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-[9px] text-white/50 line-clamp-2">{h.output}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 13. MULTI-PLATFORM COPY ADAPTER
// ═══════════════════════════════════════════════════
export const MultiPlatformAdapter = ({ copy, productName }: { copy: string; productName: string }) => {
  const [adapting, setAdapting] = useState(false);
  const [adapted, setAdapted] = useState<Record<string, string>>({});

  const adaptCopy = async () => {
    setAdapting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Adapt this ad copy for 5 platforms. Return JSON object with keys: "instagram" (max 2200 chars, emoji-rich, hashtags), "tiktok" (casual, trendy, max 150 chars), "facebook" (conversational, max 500 chars), "linkedin" (professional, max 700 chars), "twitter" (max 280 chars, punchy). Product: ${productName}. Copy: "${copy}". Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAdapted(parsed);
        await saveFeatureData("adapted_copy", parsed);
        toast.success("Copy adapted for all platforms!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAdapting(false); }
  };

  const platformColors: Record<string, string> = {
    instagram: "text-pink-400", tiktok: "text-rose-400", facebook: "text-blue-400",
    linkedin: "text-sky-400", twitter: "text-white/70",
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Repeat className="w-3.5 h-3.5 text-teal-400" />Platform Adapter</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={adaptCopy} disabled={adapting || !copy} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(170 60% 40%), hsl(200 60% 50%))" }}>
          {adapting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-1" />}Adapt to All Platforms
        </Button>
        {Object.entries(adapted).length > 0 && (
          <div className="space-y-1.5 max-h-[200px] overflow-auto">
            {Object.entries(adapted).map(([platform, text]) => (
              <div key={platform} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[10px] font-medium capitalize ${platformColors[platform] || "text-white/60"}`}>{platform}</span>
                  <button onClick={() => { navigator.clipboard.writeText(text); toast.success(`${platform} copy copied!`); }} className="p-0.5 rounded hover:bg-white/[0.06]"><Copy className="h-2.5 w-2.5 text-white/25" /></button>
                </div>
                <p className="text-[9px] text-white/50 line-clamp-3">{text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 14. CONVERSION FUNNEL
// ═══════════════════════════════════════════════════
export const ConversionFunnel = () => {
  const [funnel, setFunnel] = useState([
    { stage: "Impressions", value: 50000, color: "bg-blue-500" },
    { stage: "Clicks", value: 2500, color: "bg-cyan-500" },
    { stage: "Add to Cart", value: 750, color: "bg-emerald-500" },
    { stage: "Checkout", value: 300, color: "bg-amber-500" },
    { stage: "Purchase", value: 150, color: "bg-orange-500" },
  ]);

  useEffect(() => { loadFeatureData("conversion_funnel").then(d => { if (d?.funnel) setFunnel(d.funnel); }); }, []);

  const updateStage = async (index: number, value: number) => {
    const updated = funnel.map((f, i) => i === index ? { ...f, value } : f);
    setFunnel(updated);
    await saveFeatureData("conversion_funnel", { funnel: updated });
  };

  const maxVal = Math.max(...funnel.map(f => f.value), 1);

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-cyan-400" />Conversion Funnel</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {funnel.map((stage, i) => {
          const width = (stage.value / maxVal) * 100;
          const dropoff = i > 0 ? (((funnel[i - 1].value - stage.value) / funnel[i - 1].value) * 100).toFixed(1) : null;
          return (
            <div key={stage.stage} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/50">{stage.stage}</span>
                <div className="flex items-center gap-2">
                  {dropoff && <span className="text-[8px] text-red-400/60">-{dropoff}%</span>}
                  <Input type="number" value={stage.value} onChange={e => updateStage(i, parseInt(e.target.value) || 0)} className="w-16 text-[9px] crm-input h-5 px-1 text-right" />
                </div>
              </div>
              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${stage.color} transition-all`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
        <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-center">
          <span className="text-[9px] text-white/30">Overall Conversion</span>
          <div className="text-sm font-bold text-emerald-400">{funnel.length >= 2 ? ((funnel[funnel.length - 1].value / funnel[0].value) * 100).toFixed(2) : 0}%</div>
        </div>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 15. AD FATIGUE MONITOR
// ═══════════════════════════════════════════════════
export const AdFatigueMonitor = ({ variants }: { variants: any[] }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [fatigue, setFatigue] = useState<any>(null);

  useEffect(() => { loadFeatureData("ad_fatigue").then(d => { if (d) setFatigue(d); }); }, []);

  const analyzeFatigue = async () => {
    setAnalyzing(true);
    try {
      const variantInfo = variants.map(v => `${v.label}: score=${v.score}, ctr=${v.ctr}, status=${v.status}`).join("; ");
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Analyze ad fatigue risk for these variants: ${variantInfo}. Return JSON: "overall_fatigue_level" (Low/Medium/High/Critical), "days_until_fatigue" (number), "variant_fatigue" (array with "label", "fatigue_score" 0-100, "recommendation"), "refresh_suggestions" (3 strings), "optimal_rotation_days" (number). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setFatigue(parsed);
        await saveFeatureData("ad_fatigue", parsed);
        toast.success("Fatigue analysis saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  const fatigueColor = (level: string) => {
    if (level === "Low") return "text-emerald-400 bg-emerald-500/20";
    if (level === "Medium") return "text-amber-400 bg-amber-500/20";
    if (level === "High") return "text-orange-400 bg-orange-500/20";
    return "text-red-400 bg-red-500/20";
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" />Ad Fatigue Monitor</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={analyzeFatigue} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(40 80% 45%), hsl(20 80% 50%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Activity className="h-3 w-3 mr-1" />}Analyze Fatigue
        </Button>
        {fatigue && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.03]">
              <span className="text-[9px] text-white/35">Fatigue Level</span>
              <Badge className={`text-[8px] ${fatigueColor(fatigue.overall_fatigue_level)}`}>{fatigue.overall_fatigue_level}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-white/70">{fatigue.days_until_fatigue}d</div><div className="text-[7px] text-white/20">Until Fatigue</div></div>
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-white/70">{fatigue.optimal_rotation_days}d</div><div className="text-[7px] text-white/20">Rotation Cycle</div></div>
            </div>
            {fatigue.refresh_suggestions && (
              <div>
                <p className="text-[8px] text-amber-400/70 font-medium mb-0.5">Refresh Ideas</p>
                {fatigue.refresh_suggestions.map((s: string, i: number) => <p key={i} className="text-[8px] text-white/40">• {s}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 16. SMART SCHEDULING
// ═══════════════════════════════════════════════════
export const SmartScheduler = ({ productName }: { productName: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [schedule, setSchedule] = useState<any>(null);

  useEffect(() => { loadFeatureData("smart_schedule").then(d => { if (d) setSchedule(d); }); }, []);

  const analyzeSchedule = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Determine the optimal ad posting schedule for: ${productName}. Return JSON: "best_days" (array of day names ranked), "best_hours" (array of objects with "hour" 0-23, "engagement_multiplier" number), "timezone_recommendations" (array of 3 objects with "timezone", "peak_hour", "reason"), "weekly_schedule" (object with day names as keys, each having "posts" number and "best_times" array of strings). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSchedule(parsed);
        await saveFeatureData("smart_schedule", parsed);
        toast.success("Schedule optimized & saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-sky-400" />Smart Scheduler</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={analyzeSchedule} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(200 70% 45%), hsl(220 70% 55%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Clock className="h-3 w-3 mr-1" />}Optimize Schedule
        </Button>
        {schedule && (
          <div className="space-y-2 max-h-[200px] overflow-auto">
            {schedule.best_days && (
              <div>
                <p className="text-[8px] text-sky-400/70 font-medium mb-0.5">Best Days</p>
                <div className="flex flex-wrap gap-0.5">
                  {schedule.best_days.slice(0, 5).map((d: string, i: number) => (
                    <span key={d} className={`px-1.5 py-0.5 rounded text-[8px] ${i === 0 ? "bg-sky-500/20 text-sky-400 font-bold" : "bg-white/[0.04] text-white/40"}`}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            {schedule.best_hours && (
              <div>
                <p className="text-[8px] text-emerald-400/70 font-medium mb-0.5">Peak Hours</p>
                <div className="flex flex-wrap gap-0.5">
                  {schedule.best_hours.slice(0, 5).map((h: any, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] text-emerald-400">{h.hour}:00 ({h.engagement_multiplier}x)</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 17. AI HEADLINE SCORER
// ═══════════════════════════════════════════════════
export const HeadlineScorer = ({ onApplyBest }: { onApplyBest?: (headline: string) => void }) => {
  const [headlines, setHeadlines] = useState<string[]>([""]);
  const [scores, setScores] = useState<any[]>([]);
  const [scoring, setScoring] = useState(false);

  const scoreHeadlines = async () => {
    const validHeadlines = headlines.filter(h => h.trim());
    if (validHeadlines.length === 0) { toast.error("Enter at least one headline"); return; }
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Score these ad headlines 1-100 on: clarity, emotional impact, urgency, curiosity, and overall effectiveness. Headlines: ${validHeadlines.map((h, i) => `${i + 1}. "${h}"`).join(", ")}. Return JSON array with: "headline", "overall_score", "clarity", "emotion", "urgency", "curiosity", "suggestion" (improvement tip). Return ONLY valid JSON array.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) { setScores(JSON.parse(jsonMatch[0])); toast.success("Headlines scored!"); }
    } catch (e: any) { toast.error(e.message); }
    finally { setScoring(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-orange-400" />Headline Scorer</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {headlines.map((h, i) => (
          <Input key={i} value={h} onChange={e => { const n = [...headlines]; n[i] = e.target.value; setHeadlines(n); }} className="text-xs crm-input h-7" placeholder={`Headline ${i + 1}...`} />
        ))}
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setHeadlines([...headlines, ""])} className="text-[9px] h-5 text-white/30">+ Add</Button>
          <Button onClick={scoreHeadlines} disabled={scoring} size="sm" className="flex-1 text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(25 90% 50%), hsl(0 80% 55%))" }}>
            {scoring ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Score
          </Button>
        </div>
        {scores.length > 0 && (
          <div className="space-y-1.5 max-h-[150px] overflow-auto">
            {scores.sort((a, b) => b.overall_score - a.overall_score).map((s, i) => (
              <div key={i} className={`p-1.5 rounded-lg border ${i === 0 ? "bg-orange-500/5 border-orange-500/20" : "bg-white/[0.02] border-white/[0.04]"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white/70 font-medium flex-1 truncate">{s.headline}</p>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${s.overall_score > 75 ? "text-emerald-400" : s.overall_score > 50 ? "text-amber-400" : "text-red-400"}`}>{s.overall_score}</span>
                    {i === 0 && onApplyBest && <button onClick={() => onApplyBest(s.headline)} className="text-[7px] text-orange-400 hover:underline">Apply</button>}
                  </div>
                </div>
                {s.suggestion && <p className="text-[8px] text-white/30 mt-0.5">💡 {s.suggestion}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 18. CREATIVE NOTES / BRIEF
// ═══════════════════════════════════════════════════
export const CreativeBrief = () => {
  const [brief, setBrief] = useState({ objective: "", keyMessage: "", tone: "", constraints: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFeatureData("creative_brief").then(d => { if (d) setBrief(d); setLoaded(true); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveFeatureData("creative_brief", brief);
    setSaving(false);
    toast.success("Brief saved!");
  };

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { saveFeatureData("creative_brief", brief); }, 2000);
    return () => clearTimeout(t);
  }, [brief, loaded]);

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white/80 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-indigo-400" />Creative Brief</CardTitle>
          <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving} className="text-[9px] h-5 text-indigo-400">
            {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5 mr-0.5" />}Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div><label className="text-[9px] text-white/30">Objective</label><Input value={brief.objective} onChange={e => setBrief(p => ({ ...p, objective: e.target.value }))} className="text-xs crm-input h-6 mt-0.5" placeholder="Campaign objective..." /></div>
        <div><label className="text-[9px] text-white/30">Key Message</label><Input value={brief.keyMessage} onChange={e => setBrief(p => ({ ...p, keyMessage: e.target.value }))} className="text-xs crm-input h-6 mt-0.5" placeholder="Core message..." /></div>
        <div><label className="text-[9px] text-white/30">Tone & Style</label><Input value={brief.tone} onChange={e => setBrief(p => ({ ...p, tone: e.target.value }))} className="text-xs crm-input h-6 mt-0.5" placeholder="Bold, premium, urgent..." /></div>
        <div><label className="text-[9px] text-white/30">Notes</label><Textarea value={brief.notes} onChange={e => setBrief(p => ({ ...p, notes: e.target.value }))} className="text-xs crm-input min-h-[40px] mt-0.5" placeholder="Additional notes..." /></div>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 19. COMPETITOR AD TRACKER
// ═══════════════════════════════════════════════════
export const CompetitorAdTracker = ({ productName }: { productName: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [competitors, setCompetitors] = useState<any[]>([]);

  useEffect(() => { loadFeatureData("competitor_ads").then(d => { if (d?.competitors) setCompetitors(d.competitors); }); }, []);

  const analyzeCompetitors = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Analyze competitor ad strategies for: ${productName}. Return JSON array of 4 competitors with: "name", "estimated_spend" (string like "$5K-10K/mo"), "top_platform", "ad_frequency" (string), "creative_style" (string), "messaging_angle" (string), "weakness" (string you can exploit), "threat_level" (1-10). Return ONLY valid JSON array.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setCompetitors(parsed);
        await saveFeatureData("competitor_ads", { competitors: parsed });
        toast.success("Competitor ads analyzed & saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-red-400" />Competitor Ad Tracker</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={analyzeCompetitors} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(0 70% 45%), hsl(340 70% 50%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}Track Competitors
        </Button>
        {competitors.length > 0 && (
          <div className="space-y-1.5 max-h-[200px] overflow-auto">
            {competitors.map((c, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/70 font-semibold">{c.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-white/30">{c.estimated_spend}</span>
                    <div className={`w-2 h-2 rounded-full ${c.threat_level > 7 ? "bg-red-500" : c.threat_level > 4 ? "bg-amber-500" : "bg-emerald-500"}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-[8px] text-white/30">Platform: <span className="text-white/50">{c.top_platform}</span></span>
                  <span className="text-[8px] text-white/30">Style: <span className="text-white/50">{c.creative_style}</span></span>
                </div>
                <p className="text-[8px] text-emerald-400/60 mt-0.5">💡 {c.weakness}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 20. ENGAGEMENT BOOSTER
// ═══════════════════════════════════════════════════
export const EngagementBooster = ({ copy, headline }: { copy: string; headline: string }) => {
  const [boosting, setBoosting] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);

  const boost = async () => {
    setBoosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Analyze and boost engagement for this ad. Headline: "${headline}", Copy: "${copy}". Return JSON: "current_engagement_score" (1-100), "improved_headline" (string), "improved_copy" (string), "emotional_hooks" (3 strings), "power_words_to_add" (5 strings), "questions_to_add" (2 strings), "scarcity_elements" (2 strings), "social_proof_ideas" (2 strings), "projected_engagement_boost" (percentage string). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSuggestions(parsed);
        await saveFeatureData("engagement_boost", parsed);
        toast.success("Engagement boost ready!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBoosting(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" />Engagement Booster</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={boost} disabled={boosting} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(150 60% 40%), hsl(180 60% 45%))" }}>
          {boosting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <TrendingUp className="h-3 w-3 mr-1" />}Boost Engagement
        </Button>
        {suggestions && (
          <div className="space-y-2 max-h-[220px] overflow-auto">
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-[9px] text-white/40">Projected Boost</span>
              <span className="text-sm font-bold text-emerald-400">{suggestions.projected_engagement_boost}</span>
            </div>
            {suggestions.improved_headline && (
              <div className="p-1.5 rounded bg-white/[0.03]">
                <span className="text-[8px] text-amber-400/70 font-medium">Better Headline</span>
                <p className="text-[10px] text-white/70 font-semibold mt-0.5">{suggestions.improved_headline}</p>
              </div>
            )}
            {suggestions.power_words_to_add && (
              <div>
                <span className="text-[8px] text-purple-400/70 font-medium">Power Words</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {suggestions.power_words_to_add.map((w: string, i: number) => <span key={i} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-[8px] text-purple-400">{w}</span>)}
                </div>
              </div>
            )}
            {suggestions.emotional_hooks && (
              <div>
                <span className="text-[8px] text-rose-400/70 font-medium">Emotional Hooks</span>
                {suggestions.emotional_hooks.map((h: string, i: number) => <p key={i} className="text-[8px] text-white/40">• {h}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 21. AD SPEND FORECASTER
// ═══════════════════════════════════════════════════
export const AdSpendForecaster = ({ budget }: { budget: number }) => {
  const [forecasting, setForecasting] = useState(false);
  const [forecast, setForecast] = useState<any>(null);

  useEffect(() => { loadFeatureData("spend_forecast").then(d => { if (d) setForecast(d); }); }, []);

  const runForecast = async () => {
    setForecasting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Forecast ad spend efficiency for budget $${budget}. Return JSON: "monthly_projections" (array of 3 months with "month", "spend", "estimated_revenue", "roas"), "break_even_day" (number), "best_allocation" (object with platform names as keys and percentage as values), "risk_factors" (3 strings), "optimization_opportunities" (3 strings), "projected_roas" (number). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setForecast(parsed);
        await saveFeatureData("spend_forecast", parsed);
        toast.success("Forecast generated & saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setForecasting(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><LineChart className="w-3.5 h-3.5 text-blue-400" />Spend Forecaster</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={runForecast} disabled={forecasting} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(220 70% 45%), hsl(250 70% 50%))" }}>
          {forecasting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <LineChart className="h-3 w-3 mr-1" />}Forecast
        </Button>
        {forecast && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-blue-400">{forecast.projected_roas}x</div><div className="text-[7px] text-white/20">ROAS</div></div>
              <div className="p-1.5 rounded bg-white/[0.03] text-center"><div className="text-sm font-bold text-emerald-400">Day {forecast.break_even_day}</div><div className="text-[7px] text-white/20">Break Even</div></div>
            </div>
            {forecast.monthly_projections && (
              <div className="space-y-1">
                {forecast.monthly_projections.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-1 rounded bg-white/[0.02] text-[8px]">
                    <span className="text-white/40">{m.month}</span>
                    <span className="text-white/50">${m.spend}</span>
                    <span className="text-emerald-400">${m.estimated_revenue}</span>
                    <span className="text-blue-400">{m.roas}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 22. LANDING PAGE OPTIMIZER
// ═══════════════════════════════════════════════════
export const LandingPageOptimizer = ({ productName, cta }: { productName: string; cta: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizations, setOptimizations] = useState<any>(null);
  const [landingUrl, setLandingUrl] = useState("");

  useEffect(() => { loadFeatureData("landing_optimizer").then(d => { if (d) { setOptimizations(d.optimizations); setLandingUrl(d.url || ""); } }); }, []);

  const optimize = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Optimize a landing page for: ${productName}, CTA: "${cta}", URL: "${landingUrl || 'generic'}". Return JSON: "headline_suggestions" (3 strings), "above_fold_elements" (5 strings ordered by importance), "trust_signals" (4 strings), "page_speed_tips" (3 strings), "mobile_optimizations" (3 strings), "conversion_score" (1-100), "estimated_conversion_rate" (string percentage). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setOptimizations(parsed);
        await saveFeatureData("landing_optimizer", { optimizations: parsed, url: landingUrl });
        toast.success("Landing page optimized!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-teal-400" />Landing Page Optimizer</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input value={landingUrl} onChange={e => setLandingUrl(e.target.value)} className="text-xs crm-input h-7" placeholder="https://your-landing-page.com" />
        <Button onClick={optimize} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(170 60% 40%), hsl(190 60% 45%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}Optimize
        </Button>
        {optimizations && (
          <div className="space-y-1.5 max-h-[200px] overflow-auto">
            <div className="flex items-center justify-between p-1.5 rounded bg-teal-500/5 border border-teal-500/10">
              <span className="text-[9px] text-white/40">Conversion Score</span>
              <span className="text-sm font-bold text-teal-400">{optimizations.conversion_score}/100</span>
            </div>
            {optimizations.above_fold_elements && (
              <div>
                <span className="text-[8px] text-amber-400/70 font-medium">Above Fold Priority</span>
                {optimizations.above_fold_elements.slice(0, 4).map((e: string, i: number) => <p key={i} className="text-[8px] text-white/40">{i + 1}. {e}</p>)}
              </div>
            )}
            {optimizations.trust_signals && (
              <div>
                <span className="text-[8px] text-emerald-400/70 font-medium">Trust Signals</span>
                {optimizations.trust_signals.slice(0, 3).map((s: string, i: number) => <p key={i} className="text-[8px] text-white/40">✓ {s}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 23. AD QUALITY CHECKER
// ═══════════════════════════════════════════════════
export const AdQualityChecker = ({ headline, copy, cta }: { headline: string; copy: string; cta: string }) => {
  const [checking, setChecking] = useState(false);
  const [quality, setQuality] = useState<any>(null);

  const checkQuality = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Run a quality audit on this ad. Headline: "${headline}", Copy: "${copy}", CTA: "${cta}". Return JSON: "overall_grade" (A-F), "scores" (object with "clarity" 1-10, "persuasion" 1-10, "relevance" 1-10, "grammar" 1-10, "emotional_appeal" 1-10, "uniqueness" 1-10), "policy_risks" (array of strings, things that might get flagged by ad platforms), "improvements" (4 specific actionable strings), "platform_compatibility" (object with "facebook", "google", "tiktok" each being "approved"/"warning"/"rejected"). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) { setQuality(JSON.parse(jsonMatch[0])); toast.success("Quality check complete!"); }
    } catch (e: any) { toast.error(e.message); }
    finally { setChecking(false); }
  };

  const gradeColor = (g: string) => g === "A" ? "text-emerald-400" : g === "B" ? "text-cyan-400" : g === "C" ? "text-amber-400" : "text-red-400";

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />Ad Quality Check</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={checkQuality} disabled={checking} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(190 60% 40%), hsl(210 60% 50%))" }}>
          {checking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}Run Quality Check
        </Button>
        {quality && (
          <div className="space-y-2">
            <div className="flex items-center justify-center p-2 rounded bg-white/[0.03]">
              <span className={`text-3xl font-black ${gradeColor(quality.overall_grade)}`}>{quality.overall_grade}</span>
            </div>
            {quality.scores && (
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(quality.scores).map(([k, v]) => (
                  <div key={k} className="p-1 rounded bg-white/[0.02] text-center">
                    <div className="text-[10px] font-bold text-white/70">{v as number}</div>
                    <div className="text-[7px] text-white/25 capitalize">{k.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            )}
            {quality.platform_compatibility && (
              <div className="flex gap-1.5">
                {Object.entries(quality.platform_compatibility).map(([p, status]) => (
                  <div key={p} className={`flex-1 p-1 rounded text-center text-[8px] border ${status === "approved" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : status === "warning" ? "border-amber-500/20 text-amber-400 bg-amber-500/5" : "border-red-500/20 text-red-400 bg-red-500/5"}`}>
                    <div className="capitalize font-medium">{p}</div>
                    <div className="text-[7px] capitalize">{status as string}</div>
                  </div>
                ))}
              </div>
            )}
            {quality.improvements && (
              <div>
                <span className="text-[8px] text-cyan-400/70 font-medium">Improvements</span>
                {quality.improvements.slice(0, 3).map((s: string, i: number) => <p key={i} className="text-[8px] text-white/40">→ {s}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 24. SEASONAL TRENDS
// ═══════════════════════════════════════════════════
export const SeasonalTrends = ({ productName }: { productName: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [trends, setTrends] = useState<any>(null);

  useEffect(() => { loadFeatureData("seasonal_trends").then(d => { if (d) setTrends(d); }); }, []);

  const analyzeTrends = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Analyze seasonal advertising trends for: ${productName}. Current month: February 2026. Return JSON: "current_season_score" (1-100), "upcoming_opportunities" (array of 3 objects with "event", "date", "relevance_score" 1-100, "suggested_angle"), "best_months" (array of 3 month names), "worst_months" (array of 2 month names), "trending_themes" (5 strings), "action_items" (3 strings for right now). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setTrends(parsed);
        await saveFeatureData("seasonal_trends", parsed);
        toast.success("Seasonal trends analyzed!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-amber-400" />Seasonal Trends</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={analyzeTrends} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(40 80% 45%), hsl(30 80% 50%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <TrendingUp className="h-3 w-3 mr-1" />}Analyze Trends
        </Button>
        {trends && (
          <div className="space-y-1.5 max-h-[200px] overflow-auto">
            <div className="p-1.5 rounded bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
              <span className="text-[9px] text-white/40">Season Score</span>
              <span className="text-sm font-bold text-amber-400">{trends.current_season_score}/100</span>
            </div>
            {trends.upcoming_opportunities && (
              <div>
                <span className="text-[8px] text-emerald-400/70 font-medium">Upcoming</span>
                {trends.upcoming_opportunities.map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[8px] text-white/40 py-0.5">
                    <span>📅 {o.event}</span>
                    <span className="text-emerald-400/60">{o.relevance_score}%</span>
                  </div>
                ))}
              </div>
            )}
            {trends.trending_themes && (
              <div className="flex flex-wrap gap-0.5">
                {trends.trending_themes.map((t: string, i: number) => <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[7px] text-amber-400">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 25. RETARGETING STRATEGY
// ═══════════════════════════════════════════════════
export const RetargetingStrategy = ({ productName }: { productName: string }) => {
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);

  useEffect(() => { loadFeatureData("retargeting").then(d => { if (d) setStrategy(d); }); }, []);

  const generateStrategy = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Create a retargeting strategy for: ${productName}. Return JSON: "audiences" (array of 4 objects with "name", "trigger", "delay_days" number, "message_angle", "expected_conversion" percentage string), "email_sequence" (array of 3 objects with "day" number, "subject", "angle"), "pixel_events" (4 strings to track), "lookalike_suggestions" (3 strings). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setStrategy(parsed);
        await saveFeatureData("retargeting", parsed);
        toast.success("Retargeting strategy saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Crosshair className="w-3.5 h-3.5 text-violet-400" />Retargeting Strategy</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={generateStrategy} disabled={generating} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(270 60% 50%), hsl(290 60% 55%))" }}>
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Crosshair className="h-3 w-3 mr-1" />}Generate Strategy
        </Button>
        {strategy && (
          <div className="space-y-1.5 max-h-[220px] overflow-auto">
            {strategy.audiences && strategy.audiences.map((a: any, i: number) => (
              <div key={i} className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/60 font-medium">{a.name}</span>
                  <span className="text-[8px] text-violet-400">{a.expected_conversion}</span>
                </div>
                <p className="text-[8px] text-white/30 mt-0.5">{a.trigger} → {a.delay_days}d delay</p>
              </div>
            ))}
            {strategy.pixel_events && (
              <div>
                <span className="text-[8px] text-sky-400/70 font-medium">Track Events</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {strategy.pixel_events.map((e: string, i: number) => <span key={i} className="px-1.5 py-0.5 rounded bg-sky-500/10 text-[7px] text-sky-400">{e}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 26. CREATIVE VARIATION GENERATOR
// ═══════════════════════════════════════════════════
export const CreativeVariationGen = ({ headline, copy, cta }: { headline: string; copy: string; cta: string }) => {
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Generate 6 creative variations of this ad. Original Headline: "${headline}", Copy: "${copy}", CTA: "${cta}". Each variation should have a different angle (emotional, logical, urgency, curiosity, social proof, humor). Return JSON array with: "angle", "headline", "copy", "cta", "best_for" (platform name). Return ONLY valid JSON array.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setVariations(parsed);
        await saveFeatureData("creative_variations", { variations: parsed });
        toast.success("Variations generated!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-cyan-400" />Variation Generator</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={generate} disabled={generating} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(190 70% 40%), hsl(210 70% 50%))" }}>
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Layers className="h-3 w-3 mr-1" />}Generate 6 Variations
        </Button>
        {variations.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-auto">
            {variations.map((v, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/20 cursor-pointer transition-colors" onClick={() => { navigator.clipboard.writeText(`${v.headline}\n${v.copy}\n${v.cta}`); toast.success("Variation copied!"); }}>
                <Badge className="text-[7px] bg-cyan-500/10 text-cyan-400 mb-1">{v.angle}</Badge>
                <p className="text-[9px] text-white/70 font-semibold line-clamp-1">{v.headline}</p>
                <p className="text-[8px] text-white/40 line-clamp-2 mt-0.5">{v.copy}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[7px] px-1 py-0.5 rounded bg-white/[0.04] text-white/30">{v.cta}</span>
                  <span className="text-[7px] text-white/20">{v.best_for}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 27. AUDIENCE SENTIMENT ANALYZER
// ═══════════════════════════════════════════════════
export const AudienceSentiment = ({ targetAudience, productName }: { targetAudience: string; productName: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [sentiment, setSentiment] = useState<any>(null);

  useEffect(() => { loadFeatureData("audience_sentiment").then(d => { if (d) setSentiment(d); }); }, []);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Analyze audience sentiment for: ${productName}, targeting: ${targetAudience}. Return JSON: "overall_sentiment" ("positive"/"neutral"/"negative"), "sentiment_score" (1-100), "pain_points" (4 strings), "desires" (4 strings), "objections" (3 strings with counters), "messaging_do" (3 strings), "messaging_dont" (3 strings), "emotional_triggers" (4 strings). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSentiment(parsed);
        await saveFeatureData("audience_sentiment", parsed);
        toast.success("Sentiment analysis saved!");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  const sentimentColor = sentiment?.overall_sentiment === "positive" ? "text-emerald-400" : sentiment?.overall_sentiment === "negative" ? "text-red-400" : "text-amber-400";

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-pink-400" />Audience Sentiment</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={analyze} disabled={analyzing} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(330 60% 45%), hsl(350 60% 50%))" }}>
          {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageSquare className="h-3 w-3 mr-1" />}Analyze Sentiment
        </Button>
        {sentiment && (
          <div className="space-y-1.5 max-h-[200px] overflow-auto">
            <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.03]">
              <span className={`text-sm font-bold capitalize ${sentimentColor}`}>{sentiment.overall_sentiment}</span>
              <span className="text-sm font-bold text-white/50">{sentiment.sentiment_score}/100</span>
            </div>
            {sentiment.pain_points && (
              <div>
                <span className="text-[8px] text-red-400/70 font-medium">Pain Points</span>
                {sentiment.pain_points.slice(0, 3).map((p: string, i: number) => <p key={i} className="text-[8px] text-white/40">😤 {p}</p>)}
              </div>
            )}
            {sentiment.desires && (
              <div>
                <span className="text-[8px] text-emerald-400/70 font-medium">Desires</span>
                {sentiment.desires.slice(0, 3).map((d: string, i: number) => <p key={i} className="text-[8px] text-white/40">✨ {d}</p>)}
              </div>
            )}
            {sentiment.emotional_triggers && (
              <div className="flex flex-wrap gap-0.5">
                {sentiment.emotional_triggers.map((t: string, i: number) => <span key={i} className="px-1.5 py-0.5 rounded bg-pink-500/10 text-[7px] text-pink-400">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// NEW 28. AD COMPLIANCE CHECKER
// ═══════════════════════════════════════════════════
export const AdComplianceChecker = ({ headline, copy }: { headline: string; copy: string }) => {
  const [checking, setChecking] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);

  const checkCompliance = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: `Check this ad for platform policy compliance. Headline: "${headline}", Copy: "${copy}". Return JSON: "overall_status" ("pass"/"warning"/"fail"), "facebook_status" ("pass"/"warning"/"fail"), "google_status" ("pass"/"warning"/"fail"), "tiktok_status" ("pass"/"warning"/"fail"), "issues" (array of objects with "severity" "low"/"medium"/"high", "platform", "issue", "fix"), "safe_words_used" (number), "flagged_words" (array of strings). Return ONLY valid JSON.` }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) { setCompliance(JSON.parse(jsonMatch[0])); toast.success("Compliance check done!"); }
    } catch (e: any) { toast.error(e.message); }
    finally { setChecking(false); }
  };

  const statusIcon = (s: string) => s === "pass" ? "✅" : s === "warning" ? "⚠️" : "❌";

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-1"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-green-400" />Compliance Check</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={checkCompliance} disabled={checking} size="sm" className="w-full text-xs h-7" style={{ background: "linear-gradient(135deg, hsl(140 50% 40%), hsl(160 50% 45%))" }}>
          {checking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Shield className="h-3 w-3 mr-1" />}Check Compliance
        </Button>
        {compliance && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1">
              {[["Facebook", compliance.facebook_status], ["Google", compliance.google_status], ["TikTok", compliance.tiktok_status]].map(([p, s]) => (
                <div key={p as string} className={`p-1.5 rounded text-center border ${s === "pass" ? "border-emerald-500/20 bg-emerald-500/5" : s === "warning" ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                  <div className="text-[10px]">{statusIcon(s as string)}</div>
                  <div className="text-[8px] text-white/50">{p as string}</div>
                </div>
              ))}
            </div>
            {compliance.issues && compliance.issues.length > 0 && (
              <div>
                {compliance.issues.slice(0, 3).map((issue: any, i: number) => (
                  <div key={i} className="flex items-start gap-1 text-[8px] text-white/40 py-0.5">
                    <span className={issue.severity === "high" ? "text-red-400" : "text-amber-400"}>•</span>
                    <span>{issue.issue} — <span className="text-emerald-400/60">{issue.fix}</span></span>
                  </div>
                ))}
              </div>
            )}
            {compliance.flagged_words && compliance.flagged_words.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {compliance.flagged_words.map((w: string, i: number) => <span key={i} className="px-1 py-0.5 rounded bg-red-500/10 text-[7px] text-red-400 line-through">{w}</span>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

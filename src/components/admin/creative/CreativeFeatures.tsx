import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles, Loader2, Palette, Globe, Languages, Hash, Zap, Target,
  BarChart3, TrendingUp, FileText, Copy, CheckCircle2, Brain,
  Layers, Shield, Clock, ArrowUpRight, DollarSign, Users,
  Megaphone, Star, Search, Eye, Tag, RefreshCw, Wand2,
  PieChart, LineChart, ShieldCheck, Lightbulb, Gauge,
  ImagePlus, Scissors, Paintbrush, Type, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("copilot_generated_content")
        .select("metadata").eq("content_type", "brand_kit").eq("created_by", user.id).maybeSingle();
      if (data?.metadata) {
        const m = data.metadata as any;
        setBrandName(m.brandName || "");
        setPrimaryColor(m.primaryColor || "#3B82F6");
        setSecondaryColor(m.secondaryColor || "#8B5CF6");
        setAccentColor(m.accentColor || "#F59E0B");
        setBrandFont(m.brandFont || "Inter");
        setBrandTone(m.brandTone || "professional");
        setTagline(m.tagline || "");
      }
      setLoaded(true);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const kit = { brandName, primaryColor, secondaryColor, accentColor, brandFont, brandTone, tagline };
      await supabase.from("copilot_generated_content").delete().eq("content_type", "brand_kit").eq("created_by", user.id);
      await supabase.from("copilot_generated_content").insert({
        content_type: "brand_kit", url: "brand-kit", prompt: brandName,
        metadata: kit as any, created_by: user.id,
      });
      toast.success("Brand kit saved!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Palette className="w-3.5 h-3.5 text-purple-400" />Brand Kit</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><label className="text-[11px] text-white/35 font-medium">Brand Name</label><Input value={brandName} onChange={e => setBrandName(e.target.value)} className="mt-1 text-xs crm-input" placeholder="Your Brand" /></div>
        <div><label className="text-[11px] text-white/35 font-medium">Tagline</label><Input value={tagline} onChange={e => setTagline(e.target.value)} className="mt-1 text-xs crm-input" placeholder="Your brand tagline..." /></div>
        <div>
          <label className="text-[11px] text-white/35 font-medium">Brand Colors</label>
          <div className="flex gap-2 mt-1.5">
            {[{ label: "Primary", value: primaryColor, set: setPrimaryColor }, { label: "Secondary", value: secondaryColor, set: setSecondaryColor }, { label: "Accent", value: accentColor, set: setAccentColor }].map(c => (
              <div key={c.label} className="flex-1">
                <label className="text-[9px] text-white/25">{c.label}</label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input type="color" value={c.value} onChange={e => c.set(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                  <Input value={c.value} onChange={e => c.set(e.target.value)} className="text-[10px] crm-input h-6 px-1.5 font-mono" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-white/35 font-medium">Font</label>
            <Select value={brandFont} onValueChange={setBrandFont}>
              <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                {["Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto", "Oswald", "Lato", "Raleway"].map(f => <SelectItem key={f} value={f} className="text-white text-xs">{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-white/35 font-medium">Tone</label>
            <Select value={brandTone} onValueChange={setBrandTone}>
              <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                {["professional", "casual", "luxury", "playful", "bold", "minimalist", "edgy", "warm"].map(t => <SelectItem key={t} value={t} className="text-white text-xs capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <div className="flex-1 p-2.5 rounded-lg border border-white/[0.04]" style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}22)` }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{ background: primaryColor }} />
              <div className="w-5 h-5 rounded-full" style={{ background: secondaryColor }} />
              <div className="w-5 h-5 rounded-full" style={{ background: accentColor }} />
            </div>
            <p className="text-[10px] text-white/50 mt-1.5" style={{ fontFamily: brandFont }}>{brandName || "Brand"} — {tagline || "Tagline"}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full text-xs" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}Save Brand Kit
        </Button>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 2. AI COPY TOOLS (Translator, Tone, Hashtags)
// ═══════════════════════════════════════════════════
export const AICopyToolsPanel = ({ productName, productDescription, targetAudience }: { productName: string; productDescription: string; targetAudience: string }) => {
  const [activeAITool, setActiveAITool] = useState<"translate" | "tone" | "hashtags" | "hooks" | "cta">("translate");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("spanish");
  const [selectedTone, setSelectedTone] = useState("urgent");

  const runAITool = async () => {
    setProcessing(true);
    setOutputText("");
    try {
      let prompt = "";
      const context = `Product: ${productName}\nDescription: ${productDescription}\nAudience: ${targetAudience}`;

      switch (activeAITool) {
        case "translate":
          prompt = `Translate this ad copy to ${selectedLanguage}. Keep the marketing tone and impact. Return ONLY the translation.\n\nText: ${inputText || productDescription}`;
          break;
        case "tone":
          prompt = `Rewrite this ad copy in a ${selectedTone} tone. Keep the same meaning but adjust the emotional style. Return ONLY the rewritten copy.\n\n${context}\n\nOriginal: ${inputText || productDescription}`;
          break;
        case "hashtags":
          prompt = `Generate 15 highly relevant hashtags for this product's social media ad campaign. Mix trending, niche, and branded hashtags. Return ONLY the hashtags, one per line, each starting with #.\n\n${context}`;
          break;
        case "hooks":
          prompt = `Generate 5 powerful ad hook lines (opening sentences that stop the scroll) for this product. Each should be under 10 words, attention-grabbing, and create curiosity or urgency. Return ONLY the hooks, numbered 1-5.\n\n${context}`;
          break;
        case "cta":
          prompt = `Generate 8 compelling CTA (Call to Action) button text variations for this product ad. Mix urgency, exclusivity, and benefit-driven CTAs. Each should be 2-4 words max. Return ONLY the CTAs, numbered 1-8.\n\n${context}`;
          break;
      }

      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: prompt }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      setOutputText(text);
      toast.success(`AI ${activeAITool} completed`);
    } catch (e: any) { toast.error(e.message || "AI tool failed"); }
    finally { setProcessing(false); }
  };

  const tools = [
    { id: "translate" as const, label: "Translate", icon: Languages, color: "text-blue-400" },
    { id: "tone" as const, label: "Tone Shift", icon: MessageSquare, color: "text-purple-400" },
    { id: "hashtags" as const, label: "Hashtags", icon: Hash, color: "text-pink-400" },
    { id: "hooks" as const, label: "Hooks", icon: Zap, color: "text-amber-400" },
    { id: "cta" as const, label: "CTA Gen", icon: Target, color: "text-emerald-400" },
  ];

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-cyan-400" />AI Copy Toolkit</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5">
          {tools.map(t => (
            <button key={t.id} onClick={() => setActiveAITool(t.id)} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${activeAITool === t.id ? `border-white/20 bg-white/[0.06] ${t.color}` : "border-white/[0.04] text-white/30 hover:text-white/50"}`}>
              <t.icon className="h-3 w-3" />{t.label}
            </button>
          ))}
        </div>
        {activeAITool === "translate" && (
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="text-xs crm-input h-8"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              {["Spanish", "French", "German", "Portuguese", "Italian", "Japanese", "Korean", "Chinese", "Arabic", "Hindi", "Dutch", "Russian"].map(l => <SelectItem key={l.toLowerCase()} value={l.toLowerCase()} className="text-white text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {activeAITool === "tone" && (
          <Select value={selectedTone} onValueChange={setSelectedTone}>
            <SelectTrigger className="text-xs crm-input h-8"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              {["urgent", "luxury", "casual", "professional", "playful", "empathetic", "authoritative", "inspirational", "humorous", "provocative"].map(t => <SelectItem key={t} value={t} className="text-white text-xs capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(activeAITool === "translate" || activeAITool === "tone") && (
          <Textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Paste copy to process (or leave empty to use product description)..." className="text-xs crm-input min-h-[60px]" />
        )}
        <Button onClick={runAITool} disabled={processing} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(200 80% 50%), hsl(260 80% 55%))" }}>
          {processing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          Run {tools.find(t => t.id === activeAITool)?.label}
        </Button>
        {outputText && (
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] relative">
            <button onClick={() => { navigator.clipboard.writeText(outputText); toast.success("Copied!"); }} className="absolute top-2 right-2 p-1 rounded hover:bg-white/[0.06]"><Copy className="h-3 w-3 text-white/30" /></button>
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans leading-relaxed">{outputText}</pre>
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
      const prompt = `You are an expert ad performance analyst. Analyze this ad creative and predict its performance. Return a JSON object with these exact keys:
- "ctr_prediction": number (predicted CTR as percentage, e.g. 3.5)
- "engagement_score": number (1-100)
- "conversion_potential": string ("Low", "Medium", "High", "Very High")
- "strengths": array of 3 strings
- "weaknesses": array of 2 strings
- "optimization_tips": array of 3 strings
- "best_platform": string (best social platform for this ad)
- "best_time": string (best posting time)
- "audience_match": number (1-100, how well it matches the audience)

Ad Creative:
Headline: ${headline}
Copy: ${copy}
CTA: ${cta}
Has Image: ${imageUrl ? "Yes" : "No"}

Return ONLY valid JSON.`;

      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: prompt }] },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setPrediction(JSON.parse(jsonMatch[0]));
        toast.success("Performance prediction ready!");
      }
    } catch (e: any) { toast.error(e.message || "Prediction failed"); }
    finally { setPredicting(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Gauge className="w-3.5 h-3.5 text-amber-400" />AI Performance Predictor</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={predict} disabled={predicting} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(40 90% 50%), hsl(20 90% 55%))" }}>
          {predicting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1.5" />}
          Predict Performance
        </Button>
        {prediction && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-lg font-bold text-emerald-400">{prediction.ctr_prediction}%</div><div className="text-[9px] text-white/30">Predicted CTR</div></div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-lg font-bold text-blue-400">{prediction.engagement_score}</div><div className="text-[9px] text-white/30">Engagement</div></div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-lg font-bold text-purple-400">{prediction.audience_match}</div><div className="text-[9px] text-white/30">Audience Match</div></div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] flex items-center justify-between">
              <span className="text-[10px] text-white/40">Conversion Potential</span>
              <Badge className={`text-[9px] ${prediction.conversion_potential === "Very High" || prediction.conversion_potential === "High" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{prediction.conversion_potential}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-white/[0.03]"><span className="text-[9px] text-white/30">Best Platform</span><p className="text-[11px] text-white/70 font-medium">{prediction.best_platform}</p></div>
              <div className="p-2 rounded-lg bg-white/[0.03]"><span className="text-[9px] text-white/30">Best Time</span><p className="text-[11px] text-white/70 font-medium">{prediction.best_time}</p></div>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400/70 font-medium mb-1">✓ Strengths</p>
              {prediction.strengths?.map((s: string, i: number) => <p key={i} className="text-[10px] text-white/50 ml-3">• {s}</p>)}
            </div>
            <div>
              <p className="text-[10px] text-amber-400/70 font-medium mb-1">⚠ Weaknesses</p>
              {prediction.weaknesses?.map((w: string, i: number) => <p key={i} className="text-[10px] text-white/50 ml-3">• {w}</p>)}
            </div>
            <div>
              <p className="text-[10px] text-blue-400/70 font-medium mb-1">💡 Optimization Tips</p>
              {prediction.optimization_tips?.map((t: string, i: number) => <p key={i} className="text-[10px] text-white/50 ml-3">• {t}</p>)}
            </div>
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

  const generateAudiences = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are an expert digital ad targeting specialist. Generate 4 highly detailed target audience segments for advertising this product. Return a JSON array of 4 objects, each with:
- "name": string (segment name)
- "size": string (estimated audience size like "2.1M - 4.5M")
- "age_range": string (e.g. "25-34")
- "gender_split": string (e.g. "60% Female, 40% Male")
- "interests": array of 5 strings
- "platforms": array of strings (best platforms)
- "income_level": string
- "pain_points": array of 3 strings
- "buying_triggers": array of 3 strings
- "match_score": number (1-100)

Product: ${productName}
Description: ${productDescription}

Return ONLY valid JSON array.`
          }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setAudiences(JSON.parse(jsonMatch[0]));
        toast.success("AI audiences generated!");
      }
    } catch (e: any) { toast.error(e.message || "Failed to generate audiences"); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Users className="w-3.5 h-3.5 text-indigo-400" />AI Audience Builder</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={generateAudiences} disabled={generating} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(240 60% 55%), hsl(280 60% 55%))" }}>
          {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1.5" />}
          Generate AI Audiences
        </Button>
        {audiences.map((a, i) => (
          <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white/80">{a.name}</h4>
              <Badge className="text-[9px] bg-indigo-500/20 text-indigo-400">{a.match_score}% match</Badge>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded bg-white/[0.03]"><span className="text-white/30">Size</span><p className="text-white/60 font-medium">{a.size}</p></div>
              <div className="p-1.5 rounded bg-white/[0.03]"><span className="text-white/30">Age</span><p className="text-white/60 font-medium">{a.age_range}</p></div>
              <div className="p-1.5 rounded bg-white/[0.03]"><span className="text-white/30">Income</span><p className="text-white/60 font-medium">{a.income_level}</p></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {a.interests?.map((int: string, j: number) => <span key={j} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-white/40">{int}</span>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {a.platforms?.map((p: string, j: number) => <span key={j} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-[9px] text-indigo-400 border border-indigo-500/20">{p}</span>)}
            </div>
            <div>
              <p className="text-[9px] text-white/25 font-medium mb-0.5">Buying Triggers</p>
              {a.buying_triggers?.map((t: string, j: number) => <p key={j} className="text-[9px] text-white/40">• {t}</p>)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 5. AI COMPETITOR ANALYZER
// ═══════════════════════════════════════════════════
export const CompetitorAnalyzer = ({ productName, productDescription }: { productName: string; productDescription: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are a competitive intelligence analyst. Analyze the competitive landscape for this product and provide actionable advertising insights. Return a JSON object with:
- "market_position": string (e.g. "Premium challenger")
- "estimated_competitors": number
- "avg_competitor_ctr": string
- "avg_competitor_cpc": string
- "top_competitor_strategies": array of 4 objects each with "strategy" and "effectiveness" (1-10)
- "untapped_angles": array of 3 strings (unique ad angles competitors aren't using)
- "recommended_budget_split": object with platform names as keys and percentage as values
- "seasonal_opportunities": array of 2 objects each with "period" and "opportunity"
- "differentiation_score": number (1-100)
- "ad_fatigue_risk": string ("Low", "Medium", "High")

Product: ${productName}
Description: ${productDescription}

Return ONLY valid JSON.`
          }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setAnalysis(JSON.parse(jsonMatch[0]));
        toast.success("Competitor analysis complete!");
      }
    } catch (e: any) { toast.error(e.message || "Analysis failed"); }
    finally { setAnalyzing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Search className="w-3.5 h-3.5 text-orange-400" />Competitor Intelligence</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={analyze} disabled={analyzing} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(25 90% 50%), hsl(350 80% 55%))" }}>
          {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
          Analyze Competition
        </Button>
        {analysis && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-sm font-bold text-orange-400">{analysis.market_position}</div><div className="text-[9px] text-white/30">Market Position</div></div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-sm font-bold text-white">{analysis.differentiation_score}%</div><div className="text-[9px] text-white/30">Differentiation</div></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 rounded bg-white/[0.03]"><div className="text-xs font-bold text-white/70">{analysis.estimated_competitors}</div><div className="text-[8px] text-white/25">Competitors</div></div>
              <div className="p-1.5 rounded bg-white/[0.03]"><div className="text-xs font-bold text-white/70">{analysis.avg_competitor_ctr}</div><div className="text-[8px] text-white/25">Avg CTR</div></div>
              <div className="p-1.5 rounded bg-white/[0.03]"><div className="text-xs font-bold text-white/70">{analysis.avg_competitor_cpc}</div><div className="text-[8px] text-white/25">Avg CPC</div></div>
            </div>
            <div>
              <p className="text-[10px] text-orange-400/70 font-medium mb-1">Top Strategies</p>
              {analysis.top_competitor_strategies?.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/50">{s.strategy}</span>
                  <div className="flex gap-0.5">{Array.from({ length: 10 }).map((_, j) => <div key={j} className={`w-1.5 h-3 rounded-sm ${j < s.effectiveness ? "bg-orange-400" : "bg-white/[0.06]"}`} />)}</div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-emerald-400/70 font-medium mb-1">💡 Untapped Angles</p>
              {analysis.untapped_angles?.map((a: string, i: number) => <p key={i} className="text-[10px] text-white/50 ml-2">• {a}</p>)}
            </div>
            <div>
              <p className="text-[10px] text-blue-400/70 font-medium mb-1">Budget Split Recommendation</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.recommended_budget_split && Object.entries(analysis.recommended_budget_split).map(([platform, pct]) => (
                  <span key={platform} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] text-blue-400 border border-blue-500/20">{platform}: {pct as number}%</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 6. AI PRODUCT SEO OPTIMIZER (for Store Manager)
// ═══════════════════════════════════════════════════
export const ProductSEOPanel = ({ title, description, tags, onUpdate }: { title: string; description: string; tags?: string[]; onUpdate?: (seo: any) => void }) => {
  const [optimizing, setOptimizing] = useState(false);
  const [seoResult, setSeoResult] = useState<any>(null);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are an e-commerce SEO expert. Analyze this product listing and provide SEO optimization. Return a JSON object with:
- "seo_score": number (1-100)
- "optimized_title": string (SEO-optimized product title, max 70 chars)
- "meta_description": string (SEO meta description, max 160 chars)
- "optimized_tags": array of 10 strings (SEO-optimized product tags)
- "keyword_density": object with top 5 keywords as keys and recommended density as values
- "title_issues": array of strings (problems with current title)
- "description_issues": array of strings (problems with current description)
- "improvement_tips": array of 4 strings

Current Title: ${title}
Current Description: ${description}
Current Tags: ${tags?.join(", ") || "none"}

Return ONLY valid JSON.`
          }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setSeoResult(result);
        toast.success("SEO analysis complete!");
      }
    } catch (e: any) { toast.error(e.message || "SEO optimization failed"); }
    finally { setOptimizing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Search className="w-3.5 h-3.5 text-emerald-400" />AI SEO Optimizer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={optimize} disabled={optimizing} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(145 70% 40%), hsl(170 70% 45%))" }}>
          {optimizing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          Analyze & Optimize SEO
        </Button>
        {seoResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
              <span className="text-[10px] text-white/40">SEO Score</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${seoResult.seo_score > 70 ? "bg-emerald-500" : seoResult.seo_score > 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${seoResult.seo_score}%` }} />
                </div>
                <span className={`text-sm font-bold ${seoResult.seo_score > 70 ? "text-emerald-400" : seoResult.seo_score > 40 ? "text-amber-400" : "text-red-400"}`}>{seoResult.seo_score}</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[9px] text-emerald-400/70 font-medium">Optimized Title</p>
              <p className="text-[11px] text-white/70 mt-0.5">{seoResult.optimized_title}</p>
              {onUpdate && <Button size="sm" variant="ghost" className="text-[9px] h-5 px-2 mt-1 text-emerald-400" onClick={() => onUpdate({ title: seoResult.optimized_title })}>Apply</Button>}
            </div>
            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-[9px] text-blue-400/70 font-medium">Meta Description</p>
              <p className="text-[11px] text-white/70 mt-0.5">{seoResult.meta_description}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/30 font-medium mb-1">Optimized Tags</p>
              <div className="flex flex-wrap gap-1">
                {seoResult.optimized_tags?.map((t: string, i: number) => <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-white/50">{t}</span>)}
              </div>
              {onUpdate && <Button size="sm" variant="ghost" className="text-[9px] h-5 px-2 mt-1 text-blue-400" onClick={() => onUpdate({ tags: seoResult.optimized_tags })}>Apply Tags</Button>}
            </div>
            <div>
              <p className="text-[10px] text-amber-400/70 font-medium mb-1">⚠ Issues Found</p>
              {seoResult.title_issues?.map((i: string, j: number) => <p key={j} className="text-[9px] text-white/40 ml-2">• {i}</p>)}
              {seoResult.description_issues?.map((i: string, j: number) => <p key={j} className="text-[9px] text-white/40 ml-2">• {i}</p>)}
            </div>
            <div>
              <p className="text-[10px] text-emerald-400/70 font-medium mb-1">💡 Tips</p>
              {seoResult.improvement_tips?.map((t: string, i: number) => <p key={i} className="text-[9px] text-white/40 ml-2">• {t}</p>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 7. AI PRODUCT DESCRIPTION WRITER
// ═══════════════════════════════════════════════════
export const AIProductWriter = ({ title, description, onApply }: { title: string; description: string; onApply?: (desc: string) => void }) => {
  const [writing, setWriting] = useState(false);
  const [style, setStyle] = useState("persuasive");
  const [result, setResult] = useState("");

  const write = async () => {
    setWriting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `Write a ${style} e-commerce product description for "${title}". Current description: "${description}". Make it SEO-optimized, compelling, and ready to publish. Include key features, benefits, and a clear value proposition. Keep it under 200 words. Return ONLY the description text.`
          }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      setResult(text.replace(/^["']|["']$/g, "").trim());
      toast.success("Product description generated!");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setWriting(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-purple-400" />AI Description Writer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="text-xs crm-input h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
            {["persuasive", "luxury", "technical", "storytelling", "minimalist", "benefit-focused", "emotional", "SEO-heavy"].map(s => <SelectItem key={s} value={s} className="text-white text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={write} disabled={writing} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(262 83% 50%), hsl(300 80% 55%))" }}>
          {writing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          Generate Description
        </Button>
        {result && (
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2">
            <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed">{result}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-[10px] h-6 text-white/40" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
              {onApply && <Button size="sm" className="text-[10px] h-6 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" onClick={() => onApply(result)}><CheckCircle2 className="h-3 w-3 mr-1" />Apply</Button>}
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

  const optimize = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `You are a digital advertising budget strategist. Optimize the allocation of a $${totalBudget} monthly ad budget across these platforms: ${platforms.join(", ")}. Return a JSON object with:
- "allocations": array of objects with "platform", "budget", "percentage", "expected_roas", "priority" (1-5)
- "daily_budget_recommendation": number
- "testing_budget": number (recommended amount for A/B testing)
- "scale_strategy": string (when and how to increase budget)
- "waste_reduction_tips": array of 3 strings
- "projected_monthly_results": object with "impressions", "clicks", "conversions", "revenue"

Return ONLY valid JSON.`
          }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setOptimization(JSON.parse(jsonMatch[0]));
        toast.success("Budget optimization ready!");
      }
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setOptimizing(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-emerald-400" />AI Budget Optimizer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={optimize} disabled={optimizing || platforms.length === 0} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(145 60% 40%), hsl(180 60% 45%))" }}>
          {optimizing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
          Optimize Budget Allocation
        </Button>
        {platforms.length === 0 && <p className="text-[10px] text-white/25 text-center">Connect ad platforms first</p>}
        {optimization && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {optimization.allocations?.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/70 font-medium">{a.platform}</span>
                      <span className="text-[11px] text-emerald-400 font-bold">${a.budget}</span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.06] rounded-full mt-1"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${a.percentage}%` }} /></div>
                  </div>
                  <span className="text-[9px] text-white/30">{a.percentage}%</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-white/[0.03]"><span className="text-[9px] text-white/30">Daily Budget</span><p className="text-xs text-white/70 font-bold">${optimization.daily_budget_recommendation}</p></div>
              <div className="p-2 rounded-lg bg-white/[0.03]"><span className="text-[9px] text-white/30">Testing Budget</span><p className="text-xs text-white/70 font-bold">${optimization.testing_budget}</p></div>
            </div>
            {optimization.projected_monthly_results && (
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[9px] text-emerald-400/70 font-medium mb-1">Projected Monthly Results</p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {Object.entries(optimization.projected_monthly_results).map(([k, v]) => (
                    <div key={k}><div className="text-[10px] text-white/60 font-bold">{typeof v === 'number' ? v.toLocaleString() : String(v)}</div><div className="text-[8px] text-white/25 capitalize">{k}</div></div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[9px] text-amber-400/70 font-medium mb-1">Waste Reduction</p>
              {optimization.waste_reduction_tips?.map((t: string, i: number) => <p key={i} className="text-[9px] text-white/40 ml-2">• {t}</p>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════
// 9. CREATIVE TEMPLATES LIBRARY
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
        .select("*").eq("content_type", "creative_template").eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (data) setTemplates(data.map((d: any) => ({ id: d.id, ...(d.metadata as any) })));
      setLoading(false);
    };
    load();
  }, []);

  const generateTemplates = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `Generate 6 ad creative templates for e-commerce products. Return a JSON array of objects, each with:
- "name": string (template name)
- "category": string (e.g. "Product Launch", "Flash Sale", "Testimonial", "Seasonal", "Comparison", "UGC Style")
- "headline": string
- "copy": string  
- "cta": string
- "style": string (visual style description)
- "best_for": string (what type of product/campaign)
- "estimated_ctr": string

Return ONLY valid JSON array.`
          }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const t of parsed) {
            await supabase.from("copilot_generated_content").insert({
              content_type: "creative_template", url: `template-${Date.now()}-${Math.random()}`,
              prompt: t.name, metadata: t as any, created_by: user.id,
            });
          }
        }
        setTemplates(prev => [...parsed.map((t: any, i: number) => ({ id: `new-${i}`, ...t })), ...prev]);
        toast.success(`${parsed.length} templates generated and saved!`);
      }
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white/80 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-cyan-400" />Template Library</CardTitle>
          <Button size="sm" variant="ghost" onClick={generateTemplates} disabled={generating} className="text-[10px] h-6 text-cyan-400">
            {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Generate Templates
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin text-white/20 mx-auto" /></div>}
        {!loading && templates.length === 0 && <p className="text-[10px] text-white/25 text-center py-3">No templates yet. Generate some!</p>}
        {templates.slice(0, 6).map((t, i) => (
          <div key={t.id || i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer group" onClick={() => onApply(t)}>
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-white/70">{t.name}</h4>
              <Badge className="text-[8px] bg-cyan-500/10 text-cyan-400">{t.category}</Badge>
            </div>
            <p className="text-[10px] text-white/80 font-bold mt-1">{t.headline}</p>
            <p className="text-[9px] text-white/40 mt-0.5 line-clamp-1">{t.copy}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">{t.cta}</span>
              <span className="text-[8px] text-white/20">Est. CTR: {t.estimated_ctr}</span>
            </div>
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
  const [conversionRate, setConversionRate] = useState("2.5");
  const [avgOrderValue, setAvgOrderValue] = useState("75");

  const spend = parseFloat(adSpend) || 0;
  const rev = parseFloat(revenue) || 0;
  const cost = parseFloat(cogs) || 0;
  const roi = spend > 0 ? ((rev - cost - spend) / spend * 100).toFixed(1) : "0";
  const roas = spend > 0 ? (rev / spend).toFixed(2) : "0";
  const profit = rev - cost - spend;
  const cpa = spend > 0 && parseFloat(conversionRate) > 0 ? (spend / (parseFloat(conversionRate) / 100 * 1000)).toFixed(2) : "0";

  return (
    <Card className="crm-card border-white/[0.04]">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><PieChart className="w-3.5 h-3.5 text-green-400" />ROI Calculator</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[10px] text-white/35">Ad Spend ($)</label><Input type="number" value={adSpend} onChange={e => setAdSpend(e.target.value)} className="text-xs crm-input h-7 mt-0.5" /></div>
          <div><label className="text-[10px] text-white/35">Revenue ($)</label><Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="text-xs crm-input h-7 mt-0.5" /></div>
          <div><label className="text-[10px] text-white/35">COGS ($)</label><Input type="number" value={cogs} onChange={e => setCogs(e.target.value)} className="text-xs crm-input h-7 mt-0.5" /></div>
          <div><label className="text-[10px] text-white/35">Avg Order ($)</label><Input type="number" value={avgOrderValue} onChange={e => setAvgOrderValue(e.target.value)} className="text-xs crm-input h-7 mt-0.5" /></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className={`text-sm font-bold ${parseFloat(roi) > 0 ? "text-emerald-400" : "text-red-400"}`}>{roi}%</div><div className="text-[8px] text-white/25">ROI</div></div>
          <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-sm font-bold text-blue-400">{roas}x</div><div className="text-[8px] text-white/25">ROAS</div></div>
          <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className={`text-sm font-bold ${profit > 0 ? "text-emerald-400" : "text-red-400"}`}>${profit.toFixed(0)}</div><div className="text-[8px] text-white/25">Profit</div></div>
          <div className="p-2 rounded-lg bg-white/[0.03] text-center"><div className="text-sm font-bold text-amber-400">${cpa}</div><div className="text-[8px] text-white/25">CPA</div></div>
        </div>
      </CardContent>
    </Card>
  );
};

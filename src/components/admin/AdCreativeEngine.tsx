import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Megaphone, Sparkles, Star, TrendingUp, Copy, Download,
  RefreshCw, Image, Palette, BarChart3, Zap, Target,
  DollarSign, Eye, MousePointerClick,
  CheckCircle2, Loader2, Plus, Wand2, Upload, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import adVariantA from "@/assets/showcase-ad-variant-a.png";
import adVariantB from "@/assets/showcase-ad-variant-b.png";
import adVariantC from "@/assets/showcase-ad-variant-c.png";

interface AdVariant {
  id: string;
  label: string;
  headline: string;
  copy: string;
  cta: string;
  imageUrl: string;
  score: number;
  ctr: string;
  status: "draft" | "active" | "paused";
  isGenerated?: boolean;
}

const AD_STYLES = [
  { id: "product-hero", label: "Product Hero", desc: "Clean product shot, premium feel" },
  { id: "lifestyle", label: "Lifestyle", desc: "Product in use, aspirational scene" },
  { id: "minimal", label: "Minimalist", desc: "White space, typography focused" },
  { id: "bold-promo", label: "Bold Promo", desc: "Sale/discount, urgent feel" },
  { id: "social-native", label: "Social Native", desc: "Looks like organic social content" },
];

const AD_FORMATS = [
  { id: "1:1", label: "Square (1:1)", w: 1024, h: 1024 },
  { id: "4:5", label: "IG Feed (4:5)", w: 1024, h: 1280 },
  { id: "9:16", label: "Story (9:16)", w: 768, h: 1344 },
  { id: "16:9", label: "Landscape (16:9)", w: 1344, h: 768 },
];

const defaultVariants: AdVariant[] = [
  { id: "a", label: "Variant A", headline: "THE FUTURE OF SOUND", copy: "Premium sound, redefined. Experience wireless freedom like never before.", cta: "Shop Now", imageUrl: adVariantA, score: 92, ctr: "4.2%", status: "active" },
  { id: "b", label: "Variant B", headline: "ELEVATE YOUR EXPERIENCE", copy: "New collection out now. Premium audio engineered for every moment.", cta: "Shop Now", imageUrl: adVariantB, score: 85, ctr: "3.8%", status: "active" },
  { id: "c", label: "Variant C", headline: "LIMITED DROP", copy: "Exclusive limited edition. Save 40% on our flagship wireless headphones.", cta: "Get Yours", imageUrl: adVariantC, score: 71, ctr: "3.1%", status: "draft" },
];

const AdCreativeEngine = () => {
  const [variants, setVariants] = useState<AdVariant[]>(defaultVariants);
  const [selectedVariant, setSelectedVariant] = useState<string>("a");
  const [productName, setProductName] = useState("Premium Wireless Headphones");
  const [productDescription, setProductDescription] = useState("High-end noise-cancelling wireless headphones with premium build quality and crystal clear sound.");
  const [targetAudience, setTargetAudience] = useState("Tech enthusiasts, audiophiles, professionals 25-45");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [activeTab, setActiveTab] = useState("creatives");

  // AI Image Generation state
  const [adStyle, setAdStyle] = useState("product-hero");
  const [adFormat, setAdFormat] = useState("1:1");
  const [adImagePrompt, setAdImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedAdImages, setGeneratedAdImages] = useState<{ url: string; prompt: string }[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState("");
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const selected = variants.find((v) => v.id === selectedVariant) || variants[0];

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `ad-creatives/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
    if (error) { toast.error("Upload failed"); return null; }
    const { data: pub } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleGenerateCopy = async () => {
    setGeneratingCopy(true);
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{ role: "user", content: `Generate 3 short ad copy variations for this product. Return ONLY a JSON array of 3 objects with "headline" (max 5 words, uppercase), "copy" (max 20 words), and "cta" (max 3 words) keys. Product: ${productName}. Description: ${productDescription}. Target audience: ${targetAudience}.` }],
        },
      });
      if (error) throw error;
      const text = typeof data === "string" ? data : data?.text || data?.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const copies = JSON.parse(jsonMatch[0]);
        setVariants((prev) => prev.map((v, i) => ({ ...v, headline: copies[i]?.headline || v.headline, copy: copies[i]?.copy || v.copy, cta: copies[i]?.cta || v.cta })));
        toast.success("AI copy generated for all variants");
      } else { toast.error("Could not parse AI response"); }
    } catch (err) { console.error(err); toast.error("Failed to generate copy"); } finally { setGeneratingCopy(false); }
  };

  const handleGenerateAdImage = async () => {
    if (generatingImage) return;
    setGeneratingImage(true);
    try {
      const format = AD_FORMATS.find(f => f.id === adFormat) || AD_FORMATS[0];
      const style = AD_STYLES.find(s => s.id === adStyle);

      // Build specialized ad creative prompt via AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [
            { role: "system", content: "You are an expert ad creative director. Generate a detailed image generation prompt for a professional advertising creative. The image MUST look like a polished ad, not a random photo. Include composition, lighting, product placement, text overlay areas, and brand feel. Return ONLY the prompt text." },
            { role: "user", content: `Create an ad creative image prompt:\nProduct: ${productName}\nDescription: ${productDescription}\nAudience: ${targetAudience}\nStyle: ${style?.label} — ${style?.desc}\nFormat: ${format.id}\n${adImagePrompt ? `Direction: ${adImagePrompt}` : ""}\n\nDescribe: product placement, lighting/mood, background, clear text overlay space, color palette, professional commercial photography style.` },
          ],
        },
      });
      if (aiError) throw aiError;
      const generatedPrompt = (typeof aiData === "string" ? aiData : aiData?.text || aiData?.choices?.[0]?.message?.content || "").replace(/^["']|["']$/g, "").trim();

      // Generate image
      const { data: imgData, error: imgError } = await supabase.functions.invoke("agency-copilot", {
        body: { messages: [{ role: "user", content: generatedPrompt }], mode: "image", width: format.w, height: format.h },
      });
      if (imgError) throw imgError;
      const imageUrl = typeof imgData === "string" ? imgData : imgData?.url || imgData?.image_url || imgData?.data?.[0]?.url;
      if (imageUrl) {
        setGeneratedAdImages(prev => [{ url: imageUrl, prompt: generatedPrompt }, ...prev]);
        toast.success("Ad creative image generated!");
      } else { throw new Error("No image URL returned"); }
    } catch (err: any) { console.error(err); toast.error(err.message || "Failed to generate ad image"); } finally { setGeneratingImage(false); }
  };

  const applyGeneratedImageToVariant = (imageUrl: string) => {
    setVariants(prev => prev.map(v => v.id === selectedVariant ? { ...v, imageUrl, isGenerated: true } : v));
    toast.success(`Applied to ${selected.label}`);
  };

  const campaignMetrics = [
    { label: "Impressions", value: "124.5K", change: "+12.3%", icon: Eye },
    { label: "Clicks", value: "5,230", change: "+8.7%", icon: MousePointerClick },
    { label: "CTR", value: "4.2%", change: "+0.6%", icon: TrendingUp },
    { label: "Spend", value: "$1,450", change: "-3.2%", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-orange-400" />
            Ad Creative Engine
          </h2>
          <p className="text-sm text-white/40 mt-1">AI-powered ad creatives, image generation, copy & campaign optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateCopy} disabled={generatingCopy} className="border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-xs">
            {generatingCopy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
            AI Generate Copy
          </Button>
          <Button size="sm" className="text-xs" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Launch Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {campaignMetrics.map((metric) => (
          <Card key={metric.label} className="crm-card border-white/[0.04]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <metric.icon className="h-4 w-4 text-white/30" />
                <span className={`text-[11px] font-medium ${metric.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>{metric.change}</span>
              </div>
              <div className="text-xl font-bold text-white">{metric.value}</div>
              <div className="text-[11px] text-white/35 mt-0.5">{metric.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06]">
          <TabsTrigger value="creatives" className="text-xs data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400"><Palette className="h-3.5 w-3.5 mr-1.5" />Creatives</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"><Image className="h-3.5 w-3.5 mr-1.5" />AI Image Gen</TabsTrigger>
          <TabsTrigger value="copy" className="text-xs data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Copy & CTA</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white/80"><Target className="h-3.5 w-3.5 mr-1.5" />Targeting</TabsTrigger>
        </TabsList>

        {/* CREATIVES TAB */}
        <TabsContent value="creatives" className="mt-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <div className="grid grid-cols-3 gap-4">
                {variants.map((v) => (
                  <motion.div key={v.id} whileHover={{ scale: 1.01 }} onClick={() => setSelectedVariant(v.id)}
                    className={`cursor-pointer rounded-xl overflow-hidden transition-all ${selectedVariant === v.id ? "ring-2 ring-orange-500/40" : "ring-1 ring-white/[0.06]"}`}
                    style={{ background: "hsl(222 47% 8%)" }}>
                    <div className="aspect-square w-full relative overflow-hidden bg-black/30 flex items-center justify-center">
                      <img src={v.imageUrl} alt={v.label} className="w-full h-full object-contain" loading="eager" />
                      {v.score > 90 && <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[10px] font-bold"><Star className="w-2.5 h-2.5" /> AI Pick</div>}
                      <Badge className={`absolute top-2 left-2 text-[9px] ${v.status === "active" ? "bg-emerald-500/20 text-emerald-400" : v.status === "paused" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/50"}`}>{v.status}</Badge>
                      {v.isGenerated && <Badge className="absolute bottom-2 left-2 text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><Sparkles className="w-2 h-2 mr-0.5" /> AI Generated</Badge>}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-xs font-semibold">{v.label}</span>
                        <span className="text-white/30 text-[10px]">Score: <span className={v.score > 85 ? "text-emerald-400" : "text-white/50"}>{v.score}</span></span>
                      </div>
                      <p className="text-white/40 text-[11px] line-clamp-2">{v.headline}</p>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/25">CTR: {v.ctr}</span>
                        <div className="flex gap-1">
                          <button className="p-1 rounded hover:bg-white/[0.05] text-white/25 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                          <button className="p-1 rounded hover:bg-white/[0.05] text-white/25 hover:text-white/60 transition-colors"><Download className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="col-span-4 space-y-4">
              <Card className="crm-card border-white/[0.04]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-orange-400" />{selected.label} Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><label className="text-[11px] text-white/35 font-medium">Headline</label><Input value={selected.headline} onChange={(e) => setVariants(prev => prev.map(v => v.id === selectedVariant ? { ...v, headline: e.target.value } : v))} className="mt-1 text-xs crm-input" /></div>
                  <div><label className="text-[11px] text-white/35 font-medium">Ad Copy</label><Textarea value={selected.copy} onChange={(e) => setVariants(prev => prev.map(v => v.id === selectedVariant ? { ...v, copy: e.target.value } : v))} className="mt-1 text-xs crm-input min-h-[80px]" /></div>
                  <div><label className="text-[11px] text-white/35 font-medium">CTA Button</label><Input value={selected.cta} onChange={(e) => setVariants(prev => prev.map(v => v.id === selectedVariant ? { ...v, cta: e.target.value } : v))} className="mt-1 text-xs crm-input" /></div>
                  <div className="pt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-[11px] border-white/[0.06] text-white/50 hover:text-white/80"><RefreshCw className="w-3 h-3 mr-1" /> Regenerate</Button>
                    <Button size="sm" className="flex-1 text-[11px]" style={{ background: "linear-gradient(135deg, hsl(24 95% 53%), hsl(350 80% 55%))" }}><CheckCircle2 className="w-3 h-3 mr-1" /> Apply</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="crm-card border-white/[0.04]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-blue-400" />Performance</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "AI Score", value: selected.score, color: selected.score > 85 ? "bg-emerald-500" : "bg-amber-500" },
                    { label: "Engagement", value: 78, color: "bg-blue-500" },
                    { label: "Conversion", value: 65, color: "bg-purple-500" },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-[11px] mb-1"><span className="text-white/40">{bar.label}</span><span className="text-white/60">{bar.value}%</span></div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${bar.value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${bar.color}`} /></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* AI IMAGE GENERATION TAB */}
        <TabsContent value="generate" className="mt-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 space-y-4">
              <Card className="crm-card border-white/[0.04]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Wand2 className="w-3.5 h-3.5 text-emerald-400" />Generate Ad Creative</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-[11px] text-white/35 font-medium">Ad Style</label>
                    <Select value={adStyle} onValueChange={setAdStyle}>
                      <SelectTrigger className="mt-1 text-xs crm-input"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                        {AD_STYLES.map(s => <SelectItem key={s.id} value={s.id} className="text-white text-xs"><span className="font-medium">{s.label}</span><span className="text-white/30 ml-1">— {s.desc}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/35 font-medium">Format</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {AD_FORMATS.map(f => <button key={f.id} onClick={() => setAdFormat(f.id)} className={`px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${adFormat === f.id ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-white/30 hover:text-white/50"}`}>{f.label}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/35 font-medium">Reference Image (optional)</label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors min-h-[60px] mt-1" onClick={() => refImageInputRef.current?.click()}>
                      {referenceImage ? (
                        <div className="flex items-center gap-2 w-full">
                          <img src={referenceImage} alt="" className="w-10 h-10 rounded object-cover" />
                          <span className="text-[10px] text-white/50 truncate flex-1">{referenceImageName}</span>
                          <button onClick={(e) => { e.stopPropagation(); setReferenceImage(null); setReferenceImageName(""); }}><X className="h-3 w-3 text-white/30 hover:text-red-400" /></button>
                        </div>
                      ) : (<><Upload className="h-4 w-4 text-white/20" /><p className="text-[9px] text-white/30">Upload product image for reference</p></>)}
                    </div>
                    <input ref={refImageInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFileToStorage(f); if (url) { setReferenceImage(url); setReferenceImageName(f.name); } if (refImageInputRef.current) refImageInputRef.current.value = ""; }} />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/35 font-medium">Additional Direction (optional)</label>
                    <Textarea value={adImagePrompt} onChange={(e) => setAdImagePrompt(e.target.value)} placeholder="e.g. Dark moody lighting, gold accents, floating product..." className="mt-1 text-xs crm-input min-h-[70px]" />
                  </div>
                  <Button onClick={handleGenerateAdImage} disabled={generatingImage} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(145 70% 40%), hsl(170 70% 45%))" }}>
                    {generatingImage ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                    Generate Ad Creative
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="col-span-8">
              {generatedAdImages.length === 0 && !generatingImage ? (
                <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-white/[0.06]">
                  <div className="text-center space-y-2">
                    <Image className="h-8 w-8 text-white/15 mx-auto" />
                    <p className="text-white/30 text-sm">No ad creatives generated yet</p>
                    <p className="text-white/15 text-xs">Configure style & format, then generate</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {generatingImage && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center aspect-square">
                      <div className="text-center space-y-3">
                        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
                        <p className="text-white/40 text-xs">Generating ad creative...</p>
                        <p className="text-white/20 text-[10px]">AI is crafting your ad image</p>
                      </div>
                    </div>
                  )}
                  {generatedAdImages.map((img, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] group relative">
                      <img src={img.url} alt={`Ad Creative ${i + 1}`} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <div className="flex gap-2 w-full">
                          <Button size="sm" className="flex-1 text-[10px] h-7 bg-emerald-500/80 hover:bg-emerald-500" onClick={() => applyGeneratedImageToVariant(img.url)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Apply to {selected.label}
                          </Button>
                          <Button size="sm" variant="outline" className="text-[10px] h-7 border-white/20 text-white/70"><Download className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <div className="p-2"><p className="text-white/30 text-[9px] line-clamp-2">{img.prompt.slice(0, 100)}...</p></div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* COPY TAB */}
        <TabsContent value="copy" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="crm-card border-white/[0.04]">
              <CardHeader><CardTitle className="text-sm text-white/80">Product Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-[11px] text-white/35 font-medium">Product Name</label><Input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 text-xs crm-input" /></div>
                <div><label className="text-[11px] text-white/35 font-medium">Description</label><Textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} className="mt-1 text-xs crm-input min-h-[100px]" /></div>
                <div><label className="text-[11px] text-white/35 font-medium">Target Audience</label><Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="mt-1 text-xs crm-input" /></div>
                <Button onClick={handleGenerateCopy} disabled={generatingCopy} className="w-full text-xs" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                  {generatingCopy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}Generate AI Copy for All Variants
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {variants.map((v) => (
                <Card key={v.id} className="crm-card border-white/[0.04]">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white/80">{v.label}</span><Badge className="text-[9px] bg-orange-500/10 text-orange-400">{v.score} pts</Badge></div>
                    <p className="text-white/70 text-sm font-bold">{v.headline}</p>
                    <p className="text-white/45 text-xs">{v.copy}</p>
                    <div className="flex items-center gap-2 pt-1"><span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">{v.cta}</span><span className="text-white/20 text-[10px] ml-auto">CTR: {v.ctr}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {variants.map((v) => (
              <Card key={v.id} className="crm-card border-white/[0.04]">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white/80">{v.label}</span>{v.score > 90 && <div className="flex items-center gap-1 text-orange-400 text-[10px]"><Star className="w-3 h-3" /> Top Performer</div>}</div>
                  <div className="aspect-[3/2] rounded-lg overflow-hidden bg-black/20"><img src={v.imageUrl} alt={v.label} className="w-full h-full object-contain" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ l: "CTR", v: v.ctr }, { l: "AI Score", v: v.score }, { l: "Clicks", v: Math.floor(Math.random() * 2000 + 500) }, { l: "Conv.", v: `${(Math.random() * 3 + 1).toFixed(1)}%` }].map(m => (
                      <div key={m.l} className="p-2 rounded-lg bg-white/[0.02]"><div className="text-white/30 text-[10px]">{m.l}</div><div className="text-white text-sm font-bold">{m.v}</div></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TARGETING TAB */}
        <TabsContent value="settings" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="crm-card border-white/[0.04]">
              <CardHeader><CardTitle className="text-sm text-white/80 flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" />Audience Targeting</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-[11px] text-white/35 font-medium">Age Range</label><div className="flex gap-2 mt-1"><Input type="number" defaultValue="25" className="text-xs crm-input w-24" /><span className="text-white/25 self-center text-xs">to</span><Input type="number" defaultValue="45" className="text-xs crm-input w-24" /></div></div>
                <div><label className="text-[11px] text-white/35 font-medium">Interests</label><div className="flex flex-wrap gap-1.5 mt-1.5">{["Technology", "Music", "Audio", "Premium", "Lifestyle"].map(tag => <span key={tag} className="px-2 py-1 rounded-md bg-white/[0.04] text-white/50 text-[10px] border border-white/[0.06]">{tag}</span>)}<button className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20 flex items-center gap-1"><Plus className="w-2.5 h-2.5" /> Add</button></div></div>
                <div><label className="text-[11px] text-white/35 font-medium">Platforms</label><div className="flex flex-wrap gap-1.5 mt-1.5">{["Instagram", "Facebook", "TikTok"].map(p => <span key={p} className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">{p}</span>)}</div></div>
              </CardContent>
            </Card>
            <Card className="crm-card border-white/[0.04]">
              <CardHeader><CardTitle className="text-sm text-white/80 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" />Budget & Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-[11px] text-white/35 font-medium">Daily Budget</label><Input type="number" defaultValue="150" className="mt-1 text-xs crm-input" /></div>
                <div><label className="text-[11px] text-white/35 font-medium">Total Budget</label><Input type="number" defaultValue="5000" className="mt-1 text-xs crm-input" /></div>
                <div><label className="text-[11px] text-white/35 font-medium">Duration</label><div className="flex gap-2 mt-1"><Input type="date" className="text-xs crm-input flex-1" /><Input type="date" className="text-xs crm-input flex-1" /></div></div>
                <Button className="w-full text-xs mt-2" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}><Zap className="w-3.5 h-3.5 mr-1.5" />Save & Launch</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdCreativeEngine;

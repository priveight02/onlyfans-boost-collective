import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Target, DollarSign, TrendingUp, Users, Zap, BarChart3,
  ArrowRight, Lightbulb, Calculator, Percent, Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ConversionOptimizer = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");

  // Simulator inputs
  const [simSubCount, setSimSubCount] = useState(100);
  const [simOpenRate, setSimOpenRate] = useState(45);
  const [simBuyRate, setSimBuyRate] = useState(12);
  const [simAvgSpend, setSimAvgSpend] = useState(35);

  useEffect(() => {
    const load = async () => {
      const [s, st, a] = await Promise.all([
        supabase.from("scripts").select("*").order("created_at", { ascending: false }),
        supabase.from("script_steps").select("*").order("step_order"),
        supabase.from("managed_accounts").select("*"),
      ]);
      setScripts(s.data || []);
      setSteps(st.data || []);
      setAccounts(a.data || []);
    };
    load();
  }, []);

  const selectedSteps = useMemo(() => {
    if (!selectedScriptId) return [];
    return steps.filter(s => s.script_id === selectedScriptId);
  }, [steps, selectedScriptId]);

  const scriptValue = useMemo(() => {
    return selectedSteps.reduce((s, st) => s + (Number(st.price) || 0), 0);
  }, [selectedSteps]);

  // Revenue simulator
  const simResults = useMemo(() => {
    const openers = Math.round(simSubCount * (simOpenRate / 100));
    const buyers = Math.round(openers * (simBuyRate / 100));
    const revenue = buyers * simAvgSpend;
    const revenuePerSub = simSubCount > 0 ? revenue / simSubCount : 0;
    const fullConversion = simSubCount > 0 ? (buyers / simSubCount) * 100 : 0;

    return { openers, buyers, revenue, revenuePerSub, fullConversion };
  }, [simSubCount, simOpenRate, simBuyRate, simAvgSpend]);

  // Script analysis
  const scriptAnalysis = useMemo(() => {
    if (selectedSteps.length === 0) return null;
    const freeSteps = selectedSteps.filter(s => s.step_type === "free_content");
    const paidSteps = selectedSteps.filter(s => (Number(s.price) || 0) > 0);
    const messages = selectedSteps.filter(s => ["message", "welcome", "question"].includes(s.step_type));
    const conditions = selectedSteps.filter(s => s.step_type === "condition");
    const followups = selectedSteps.filter(s => s.step_type.startsWith("followup_"));
    const delays = selectedSteps.filter(s => (s.delay_minutes || 0) > 0);
    const totalDelay = delays.reduce((s, d) => s + (d.delay_minutes || 0), 0);
    const prices = paidSteps.map(s => Number(s.price) || 0).sort((a, b) => a - b);
    const priceJumps = prices.map((p, i) => i > 0 ? p / prices[i - 1] : 0).filter(j => j > 0);
    const maxJump = Math.max(...priceJumps, 0);
    const avgJump = priceJumps.length > 0 ? priceJumps.reduce((s, j) => s + j, 0) / priceJumps.length : 0;

    const issues: { level: "good" | "warning" | "critical"; text: string }[] = [];

    if (freeSteps.length === 0) issues.push({ level: "critical", text: "No free content — add at least 1-2 free items to trigger reciprocity" });
    else if (freeSteps.length >= 2) issues.push({ level: "good", text: `${freeSteps.length} free items — great reciprocity setup` });

    if (paidSteps.length === 0) issues.push({ level: "critical", text: "No paid content in this script" });
    else if (paidSteps.length >= 3) issues.push({ level: "good", text: `${paidSteps.length} paid tiers — solid escalation ladder` });

    if (maxJump > 5) issues.push({ level: "warning", text: `Price jump of ${maxJump.toFixed(1)}x detected — may cause drop-off. Keep jumps under 3x.` });
    else if (maxJump > 0 && maxJump <= 3) issues.push({ level: "good", text: `Smooth price escalation (max ${maxJump.toFixed(1)}x jump)` });

    if (messages.length < 3) issues.push({ level: "warning", text: "Few messages between content — add more to build emotional investment" });
    if (conditions.length === 0) issues.push({ level: "warning", text: "No branching — add conditions to handle ignored fans" });
    else issues.push({ level: "good", text: `${conditions.length} branch point(s) for re-engagement` });

    if (followups.length === 0) issues.push({ level: "warning", text: "No follow-ups — you'll lose fans who go quiet" });
    if (totalDelay < 5 && selectedSteps.length > 5) issues.push({ level: "warning", text: "Very short delays — feels rushed. Add natural pauses." });

    const score = Math.min(100, Math.max(0,
      50
      + (freeSteps.length >= 1 ? 10 : -10)
      + (paidSteps.length >= 3 ? 10 : 0)
      + (conditions.length >= 1 ? 8 : -5)
      + (followups.length >= 1 ? 7 : -5)
      + (maxJump <= 3 ? 8 : -5)
      + (messages.length >= 3 ? 7 : 0)
      + (totalDelay >= 5 ? 5 : 0)
      + (selectedSteps.length >= 8 ? 5 : 0)
    ));

    return { freeSteps: freeSteps.length, paidSteps: paidSteps.length, messages: messages.length, conditions: conditions.length, followups: followups.length, totalDelay, maxJump, avgJump, score, issues };
  }, [selectedSteps]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      {/* Revenue Simulator */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-400" /> Revenue Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Subscribers Targeted</label>
              <Input type="number" value={simSubCount} onChange={e => setSimSubCount(parseInt(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-2 block">Open Rate: {simOpenRate}%</label>
              <Slider value={[simOpenRate]} onValueChange={v => setSimOpenRate(v[0])} min={5} max={90} step={1} className="mt-3" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-2 block">Buy Rate: {simBuyRate}%</label>
              <Slider value={[simBuyRate]} onValueChange={v => setSimBuyRate(v[0])} min={1} max={50} step={1} className="mt-3" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Avg Spend ($)</label>
              <Input type="number" value={simAvgSpend} onChange={e => setSimAvgSpend(parseInt(e.target.value) || 0)} className="bg-white/5 border-white/10 text-white text-xs h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Will Open", value: simResults.openers, icon: Users, color: "text-blue-400" },
              { label: "Will Buy", value: simResults.buyers, icon: Target, color: "text-emerald-400" },
              { label: "Est. Revenue", value: `$${simResults.revenue.toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
              { label: "Rev/Subscriber", value: `$${simResults.revenuePerSub.toFixed(2)}`, icon: TrendingUp, color: "text-purple-400" },
              { label: "Full Funnel %", value: `${simResults.fullConversion.toFixed(1)}%`, icon: Percent, color: "text-pink-400" },
            ].map(s => (
              <div key={s.label} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
                <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[9px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Script Health Check */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" /> Script Health Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-64">
              <SelectValue placeholder="Select a script to analyze" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,15%)] border-white/10">
              {scripts.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-white text-xs">{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {scriptAnalysis ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className={`text-4xl font-black ${getScoreColor(scriptAnalysis.score)}`}>{scriptAnalysis.score}</p>
                  <p className="text-[9px] text-white/40">Conversion Score</p>
                </div>
                <div className="flex-1 grid grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { label: "Free Items", value: scriptAnalysis.freeSteps, good: scriptAnalysis.freeSteps >= 1 },
                    { label: "Paid Tiers", value: scriptAnalysis.paidSteps, good: scriptAnalysis.paidSteps >= 3 },
                    { label: "Messages", value: scriptAnalysis.messages, good: scriptAnalysis.messages >= 3 },
                    { label: "Branches", value: scriptAnalysis.conditions, good: scriptAnalysis.conditions >= 1 },
                    { label: "Follow-ups", value: scriptAnalysis.followups, good: scriptAnalysis.followups >= 1 },
                    { label: "Script Value", value: `$${scriptValue}`, good: scriptValue >= 50 },
                  ].map(s => (
                    <div key={s.label} className={`p-2 rounded-lg border text-center ${s.good ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                      <p className={`text-sm font-bold ${s.good ? "text-emerald-400" : "text-red-400"}`}>{s.value}</p>
                      <p className="text-[8px] text-white/40">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                {scriptAnalysis.issues.map((issue, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${
                    issue.level === "good" ? "bg-emerald-500/5 border-emerald-500/15" :
                    issue.level === "warning" ? "bg-amber-500/5 border-amber-500/15" :
                    "bg-red-500/5 border-red-500/15"
                  }`}>
                    <span className="text-xs">{issue.level === "good" ? "✅" : issue.level === "warning" ? "⚠️" : "🚨"}</span>
                    <span className="text-xs text-white/70">{issue.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-white/30 text-xs text-center py-6">Select a script to analyze its conversion potential</p>
          )}
        </CardContent>
      </Card>

      {/* Pricing Strategy Guide */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" /> Pricing Psychology Cheat Sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { price: "FREE", strategy: "Reciprocity Trigger", desc: "Give 1-2 free items first. Fan feels obligated to reciprocate by purchasing.", color: "border-emerald-500/20 bg-emerald-500/5" },
              { price: "$5-$15", strategy: "Payment Barrier Break", desc: "First paid item must be cheap. Once they pay ONCE, they're psychologically invested.", color: "border-blue-500/20 bg-blue-500/5" },
              { price: "$25-$49", strategy: "Sunk Cost Leverage", desc: "\"Since u already got the first one...\" They've invested, quitting feels like a loss.", color: "border-amber-500/20 bg-amber-500/5" },
              { price: "$70-$105", strategy: "Double Stack Bundle", desc: "Bundle 2 items at a \"deal\" price. Perceived value exceeds actual cost.", color: "border-orange-500/20 bg-orange-500/5" },
              { price: "$145-$200", strategy: "Premium Scarcity", desc: "\"I've never shared this before\" + \"might delete later\" = urgency + exclusivity.", color: "border-red-500/20 bg-red-500/5" },
              { price: "$410+", strategy: "VIP Status Reward", desc: "\"Only my top favorites get this.\" Identity-level purchase — they're buying status.", color: "border-purple-500/20 bg-purple-500/5" },
            ].map(tier => (
              <div key={tier.price} className={`p-3 rounded-xl border ${tier.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] border-white/20 text-white font-bold">{tier.price}</Badge>
                  <span className="text-xs font-semibold text-white">{tier.strategy}</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversionOptimizer;

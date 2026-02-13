import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, Loader2, Brain, TrendingUp, AlertCircle,
  RefreshCw, Zap, BarChart3, Target, PieChart, ArrowUp,
  ArrowDown, Pause, Play, Eye, MousePointer,
} from "lucide-react";

interface Props { selectedAccount: string; }

interface AdCreativeAnalysis {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  roas: number;
  hookScore: number;
  fatigueLevel: "low" | "medium" | "high" | "critical";
  winningCta: string;
  recommendation: string;
}

interface BudgetAction {
  type: "increase" | "decrease" | "kill" | "scale";
  campaignId: string;
  campaignName: string;
  currentBudget: number;
  suggestedBudget: number;
  reason: string;
  predictedImpact: string;
  confidence: number;
}

const IGAdOptimizer = ({ selectedAccount }: Props) => {
  const [creatives, setCreatives] = useState<AdCreativeAnalysis[]>([]);
  const [budgetActions, setBudgetActions] = useState<BudgetAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [adAccountId, setAdAccountId] = useState("");

  const callApi = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("instagram-api", {
      body: { ...body, account_id: selectedAccount },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const loadAdAccount = async () => {
    setLoading(true);
    try {
      const result = await callApi({ action: "get_ad_accounts" });
      if (result?.data?.length > 0) {
        setAdAccountId(result.data[0].id);
        toast.success(`Loaded ad account: ${result.data[0].name || result.data[0].id}`);
      } else {
        toast.info("No ad accounts found");
      }
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const analyzeCreatives = async () => {
    if (!adAccountId) { await loadAdAccount(); return; }
    setAnalyzing(true);
    try {
      const [campaigns, insights] = await Promise.all([
        callApi({ action: "get_ad_campaigns", params: { ad_account_id: adAccountId, limit: 20 } }),
        callApi({ action: "get_ad_account_insights", params: { ad_account_id: adAccountId, date_preset: "last_30d" } }),
      ]);

      const campaignData = campaigns?.data || [];
      
      // AI analyze each campaign
      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Analyze these Meta ad campaigns and provide creative intelligence:

Campaigns:
${campaignData.slice(0, 15).map((c: any) => 
  `- ${c.name} (${c.status}): Budget ${c.daily_budget || c.lifetime_budget || 'N/A'}, Objective: ${c.objective}`
).join("\n")}

Account insights: ${JSON.stringify(insights?.data?.[0] || {})}

For each campaign provide:
- hookScore (0-100): How strong is the creative hook
- fatigueLevel: "low", "medium", "high", "critical"
- winningCta: Best performing CTA detected
- recommendation: Specific actionable advice
- estimatedRoas: Estimated ROAS

Return JSON array: [{ name, hookScore, fatigueLevel, winningCta, recommendation, estimatedRoas }]`,
          context: "ad_creative_analysis",
          account_id: selectedAccount,
        },
      });

      let aiAnalysis: any[] = [];
      try {
        const text = aiData?.reply || aiData?.data?.reply || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) aiAnalysis = JSON.parse(jsonMatch[0]);
      } catch {}

      const analyzed: AdCreativeAnalysis[] = campaignData.map((c: any, i: number) => {
        const ai = aiAnalysis[i] || {};
        const spend = parseInt(c.daily_budget || c.lifetime_budget || "0") / 100;
        return {
          id: c.id,
          name: c.name,
          status: c.effective_status || c.status,
          spend,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          cpc: 0,
          roas: ai.estimatedRoas || 0,
          hookScore: ai.hookScore || 50,
          fatigueLevel: ai.fatigueLevel || "low",
          winningCta: ai.winningCta || "N/A",
          recommendation: ai.recommendation || "Analyze more data",
        };
      });

      setCreatives(analyzed);
      toast.success(`Analyzed ${analyzed.length} campaigns`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setAnalyzing(false);
  };

  const optimizeBudgets = async () => {
    if (creatives.length === 0) { toast.error("Analyze creatives first"); return; }
    setOptimizing(true);
    try {
      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `As an autonomous ad budget optimizer, analyze these campaigns and recommend budget shifts:

${creatives.map(c => `- ${c.name}: Status=${c.status}, Spend=$${c.spend}, Hook=${c.hookScore}, Fatigue=${c.fatigueLevel}, ROAS=${c.roas}`).join("\n")}

For each campaign, recommend:
- type: "increase" (performing well), "decrease" (declining), "kill" (waste of money), "scale" (ready to scale)
- currentBudget: number
- suggestedBudget: number  
- reason: Why this change
- predictedImpact: Expected result
- confidence: 0-100

Return JSON array: [{ campaignName, type, currentBudget, suggestedBudget, reason, predictedImpact, confidence }]`,
          context: "budget_optimization",
          account_id: selectedAccount,
        },
      });

      let actions: any[] = [];
      try {
        const text = aiData?.reply || aiData?.data?.reply || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) actions = JSON.parse(jsonMatch[0]);
      } catch {}

      const budgetActs: BudgetAction[] = actions.map((a: any) => {
        const campaign = creatives.find(c => c.name === a.campaignName);
        return {
          type: a.type || "increase",
          campaignId: campaign?.id || "",
          campaignName: a.campaignName,
          currentBudget: a.currentBudget || 0,
          suggestedBudget: a.suggestedBudget || 0,
          reason: a.reason || "",
          predictedImpact: a.predictedImpact || "",
          confidence: a.confidence || 50,
        };
      });

      setBudgetActions(budgetActs);
      toast.success(`Generated ${budgetActs.length} budget recommendations`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setOptimizing(false);
  };

  const applyBudgetAction = async (action: BudgetAction) => {
    if (!action.campaignId) return;
    try {
      await callApi({
        action: "update_campaign_status",
        params: {
          campaign_id: action.campaignId,
          status: action.type === "kill" ? "PAUSED" : "ACTIVE",
        },
      });
      toast.success(`${action.type === "kill" ? "Paused" : "Updated"} ${action.campaignName}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fatigueColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/15 text-red-400";
      case "high": return "bg-orange-500/15 text-orange-400";
      case "medium": return "bg-yellow-500/15 text-yellow-400";
      default: return "bg-green-500/15 text-green-400";
    }
  };

  const actionColor = (type: string) => {
    switch (type) {
      case "scale": return "bg-green-500/15 text-green-400";
      case "increase": return "bg-blue-500/15 text-blue-400";
      case "decrease": return "bg-yellow-500/15 text-yellow-400";
      case "kill": return "bg-red-500/15 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <Tabs defaultValue="creative">
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="creative" className="text-xs data-[state=active]:bg-background"><Eye className="h-3 w-3 mr-1" />Creative Analyzer</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs data-[state=active]:bg-background"><DollarSign className="h-3 w-3 mr-1" />Budget Optimizer</TabsTrigger>
        </TabsList>

        <TabsContent value="creative" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={analyzeCreatives} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
              Analyze Creatives
            </Button>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {creatives.map(c => (
                <Card key={c.id} className={c.fatigueLevel === "critical" ? "border-red-500/30" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                          <Badge className={`${c.status === "ACTIVE" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"} text-[8px]`}>{c.status}</Badge>
                        </div>
                      </div>
                      <Badge className={`${fatigueColor(c.fatigueLevel)} text-[8px]`}>Fatigue: {c.fatigueLevel}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.hookScore}</p><p className="text-[8px] text-muted-foreground">Hook</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">${c.spend.toFixed(0)}</p><p className="text-[8px] text-muted-foreground">Budget</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.roas.toFixed(1)}x</p><p className="text-[8px] text-muted-foreground">ROAS</p></div>
                      <div className="bg-muted/30 rounded p-1.5 text-center"><p className="text-xs font-bold text-foreground">{c.winningCta}</p><p className="text-[8px] text-muted-foreground">CTA</p></div>
                    </div>
                    <p className="text-[9px] text-primary mt-1.5">→ {c.recommendation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {creatives.length === 0 && !analyzing && (
            <div className="text-center py-6">
              <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Analyze ad creatives to detect hooks, fatigue & winning CTAs</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={optimizeBudgets} disabled={optimizing}>
              {optimizing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              AI Budget Optimize
            </Button>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {budgetActions.map((a, i) => (
                <Card key={i} className={a.type === "kill" ? "border-red-500/30" : a.type === "scale" ? "border-green-500/30" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Badge className={`${actionColor(a.type)} text-[8px]`}>
                          {a.type === "scale" ? <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> : a.type === "kill" ? <Pause className="h-2.5 w-2.5 mr-0.5" /> : null}
                          {a.type.toUpperCase()}
                        </Badge>
                        <p className="text-xs font-semibold text-foreground">{a.campaignName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px]">{a.confidence}% conf.</Badge>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => applyBudgetAction(a)}>
                          Apply
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">${a.currentBudget}</span>
                      <span className="text-foreground">→</span>
                      <span className={a.suggestedBudget > a.currentBudget ? "text-green-400" : "text-red-400"}>${a.suggestedBudget}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">{a.reason}</p>
                    <p className="text-[9px] text-primary">{a.predictedImpact}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {budgetActions.length === 0 && !optimizing && (
            <div className="text-center py-6">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Analyze creatives first, then run budget optimization</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGAdOptimizer;

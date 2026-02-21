import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, BookOpen, BarChart3, GitBranch, Brain, Layers, Sparkles, Target, Heart,
} from "lucide-react";
import ScriptBuilder from "./ScriptBuilder";
import ScriptLibrary from "./ScriptLibrary";
import ScriptAnalytics from "./ScriptAnalytics";
import WorkflowEngine from "./WorkflowEngine";
import ScriptIntelligence from "./ScriptIntelligence";
import AutomationEngine from "../AutomationEngine";
import ConversionOptimizer from "./ConversionOptimizer";
import FanPsychologyPlaybook from "./FanPsychologyPlaybook";
import CreditCostBadge from "../CreditCostBadge";

const StorylineHub = ({ subTab, onSubTabChange }: { subTab?: string; onSubTabChange?: (subTab: string) => void }) => {
  const [activeTab, setActiveTabInternal] = useState(subTab || "builder");
  const setActiveTab = (v: string) => { setActiveTabInternal(v); onSubTabChange?.(v); };
  useEffect(() => { if (subTab && subTab !== activeTab) setActiveTabInternal(subTab); }, [subTab]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white font-heading">Storyline & Automation</h1>
            <p className="text-sm text-white/30 mt-0.5">Design, automate, and optimize engagement flows</p>
          </div>
          <CreditCostBadge cost="5-25" variant="header" label="per script" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl h-auto gap-1 flex-wrap">
          <TabsTrigger value="builder" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <Zap className="h-3.5 w-3.5" /> Script Builder
          </TabsTrigger>
          <TabsTrigger value="library" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <BookOpen className="h-3.5 w-3.5" /> Library
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <Target className="h-3.5 w-3.5" /> Conversion Optimizer
          </TabsTrigger>
          <TabsTrigger value="playbook" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <Heart className="h-3.5 w-3.5" /> Psychology Playbook
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="workflows" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <GitBranch className="h-3.5 w-3.5" /> Workflows
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> AI Intelligence
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-[hsl(217,91%,60%)]/10 data-[state=active]:text-[hsl(217,91%,60%)] text-white/35 rounded-lg gap-1.5 text-xs font-medium transition-colors">
            <Brain className="h-3.5 w-3.5" /> Smart Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder"><ScriptBuilder /></TabsContent>
        <TabsContent value="library"><ScriptLibrary /></TabsContent>
        <TabsContent value="optimizer"><ConversionOptimizer /></TabsContent>
        <TabsContent value="playbook"><FanPsychologyPlaybook /></TabsContent>
        <TabsContent value="analytics"><ScriptAnalytics /></TabsContent>
        <TabsContent value="workflows"><WorkflowEngine /></TabsContent>
        <TabsContent value="ai"><ScriptIntelligence /></TabsContent>
        <TabsContent value="alerts"><AutomationEngine /></TabsContent>
      </Tabs>
    </div>
  );
};

export default StorylineHub;

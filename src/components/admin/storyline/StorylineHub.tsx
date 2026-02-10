import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, BookOpen, BarChart3, GitBranch, Brain, Layers, Sparkles,
} from "lucide-react";
import ScriptBuilder from "./ScriptBuilder";
import ScriptLibrary from "./ScriptLibrary";
import ScriptAnalytics from "./ScriptAnalytics";
import WorkflowEngine from "./WorkflowEngine";
import ScriptIntelligence from "./ScriptIntelligence";
import AutomationEngine from "../AutomationEngine";

const StorylineHub = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent" /> Storyline & Automation System
        </h1>
        <p className="text-xs text-white/40">Design, automate, and optimize multi-step engagement flows</p>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="builder" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Script Builder
          </TabsTrigger>
          <TabsTrigger value="library" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Library
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="workflows" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <GitBranch className="h-3.5 w-3.5" /> Workflows
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> AI Intelligence
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" /> Smart Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder"><ScriptBuilder /></TabsContent>
        <TabsContent value="library"><ScriptLibrary /></TabsContent>
        <TabsContent value="analytics"><ScriptAnalytics /></TabsContent>
        <TabsContent value="workflows"><WorkflowEngine /></TabsContent>
        <TabsContent value="ai"><ScriptIntelligence /></TabsContent>
        <TabsContent value="alerts"><AutomationEngine /></TabsContent>
      </Tabs>
    </div>
  );
};

export default StorylineHub;

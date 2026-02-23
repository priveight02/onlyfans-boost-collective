import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Megaphone, PieChart, Star, ChevronDown, ChevronUp,
  Hash, ShoppingBag, CalendarDays, Users, Briefcase, Zap,
  Target, TrendingUp, MessageSquare, DollarSign, Activity, Brain,
} from "lucide-react";
import IGAutoScheduler from "./IGAutoScheduler";
import IGAdsManager from "./IGAdsManager";
import IGAdvancedInsights from "./IGAdvancedInsights";
import IGCreatorDiscovery from "./IGCreatorDiscovery";
import IGHashtagResearch from "./IGHashtagResearch";
import IGShoppingManager from "./IGShoppingManager";
import IGEventsManager from "./IGEventsManager";
import IGBrandedContent from "./IGBrandedContent";
import IGBusinessManager from "./IGBusinessManager";
import IGLeadScoring from "./IGLeadScoring";
import IGViralPredictor from "./IGViralPredictor";
import IGSmartComments from "./IGSmartComments";
import IGAdOptimizer from "./IGAdOptimizer";
import IGCompetitorIntel from "./IGCompetitorIntel";
import IGAccountHealth from "./IGAccountHealth";

interface Props {
  selectedAccount: string;
}

const SECTIONS = [
  // AI Platform Core
  { id: "leads", icon: Target, label: "AI Lead Scoring & Sales Agent", desc: "Score leads 0-100, AI sales agent with 7-day human window", color: "text-red-400", category: "AI Platform" },
  { id: "smart-comments", icon: MessageSquare, label: "Smart Comment Automation", desc: "Detect buying signals, auto-reply & DM hot leads", color: "text-emerald-400", category: "AI Platform" },
  { id: "health", icon: Activity, label: "Account Health & DM Memory", desc: "Shadowban risk, DM memory system & auto funnel builder", color: "text-cyan-400", category: "AI Platform" },
  // Growth & Automation
  { id: "viral", icon: TrendingUp, label: "AI Viral Predictor & Autopilot", desc: "Predict virality, AI content autopilot & post analysis", color: "text-green-400", category: "Growth" },
  { id: "scheduler", icon: Calendar, label: "Smart Scheduler", desc: "AI-powered post scheduling & auto-publishing", color: "text-blue-400", category: "Growth" },
  { id: "competitor", icon: Users, label: "Competitor & Market Intel", desc: "Competitor analysis, hashtag intel & blue ocean finder", color: "text-violet-400", category: "Growth" },
  { id: "hashtags", icon: Hash, label: "Hashtag Research", desc: "Search & analyze trending hashtags, top/recent media", color: "text-lime-400", category: "Growth" },
  // Monetization & Ads
  { id: "ad-optimizer", icon: DollarSign, label: "AI Ad Optimizer", desc: "Creative analyzer, hook detection & budget optimizer", color: "text-amber-400", category: "Ads" },
  { id: "ads", icon: Megaphone, label: "Ads Manager", desc: "Campaign creation, targeting & performance tracking", color: "text-orange-400", category: "Ads" },
  // Commerce & Partnerships
  { id: "creators", icon: Star, label: "Creator Discovery", desc: "Find & analyze influencers, manage partnerships", color: "text-yellow-400", category: "Commerce" },
  { id: "shopping", icon: ShoppingBag, label: "Shopping & Products", desc: "Product catalogs, tagging & shopping features", color: "text-pink-400", category: "Commerce" },
  { id: "branded", icon: Users, label: "Branded Content", desc: "Partnership ads, creator approvals & brand deals", color: "text-rose-400", category: "Commerce" },
  // Platform Management
  { id: "insights", icon: PieChart, label: "Advanced Insights", desc: "Demographics, best posting times & deep analytics", color: "text-purple-400", category: "Platform" },
  { id: "events", icon: CalendarDays, label: "Events Manager", desc: "Create & manage upcoming Instagram events", color: "text-teal-400", category: "Platform" },
  { id: "business", icon: Briefcase, label: "Business Manager", desc: "Business accounts, pages & multi-asset management", color: "text-indigo-400", category: "Platform" },
];

const CATEGORIES = ["AI Platform", "Growth", "Ads", "Commerce", "Platform"];

const IGAutomationSuite = ({ selectedAccount }: Props) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["leads"]));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(SECTIONS.map(s => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  const renderModule = (id: string) => {
    switch (id) {
      case "leads": return <IGLeadScoring selectedAccount={selectedAccount} />;
      case "smart-comments": return <IGSmartComments selectedAccount={selectedAccount} />;
      case "health": return <IGAccountHealth selectedAccount={selectedAccount} />;
      case "viral": return <IGViralPredictor selectedAccount={selectedAccount} />;
      case "scheduler": return <IGAutoScheduler selectedAccount={selectedAccount} />;
      case "competitor": return <IGCompetitorIntel selectedAccount={selectedAccount} />;
      case "hashtags": return <IGHashtagResearch selectedAccount={selectedAccount} />;
      case "ad-optimizer": return <IGAdOptimizer selectedAccount={selectedAccount} />;
      case "ads": return <IGAdsManager selectedAccount={selectedAccount} />;
      case "creators": return <IGCreatorDiscovery selectedAccount={selectedAccount} />;
      case "shopping": return <IGShoppingManager selectedAccount={selectedAccount} />;
      case "branded": return <IGBrandedContent selectedAccount={selectedAccount} />;
      case "insights": return <IGAdvancedInsights selectedAccount={selectedAccount} />;
      case "events": return <IGEventsManager selectedAccount={selectedAccount} />;
      case "business": return <IGBusinessManager selectedAccount={selectedAccount} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">IG Revenue Operating System</h3>
          <Badge variant="outline" className="text-[10px]">{SECTIONS.length} modules</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={expandAll} className="text-xs h-7 text-foreground">Expand All</Button>
          <Button size="sm" variant="ghost" onClick={collapseAll} className="text-xs h-7 text-foreground">Collapse All</Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-3 pr-2">
          {CATEGORIES.map(cat => {
            const catSections = SECTIONS.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">{cat}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-1.5">
                  {catSections.map(section => {
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <Card key={section.id} className={`transition-all ${isExpanded ? "border-primary/30" : ""}`}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-t-xl"
                        >
                          <div className={`h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center ${section.color}`}>
                            <section.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-foreground">{section.label}</p>
                            <p className="text-[10px] text-muted-foreground">{section.desc}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isExpanded && (
                          <CardContent className="p-3 pt-0 border-t border-border">
                            {renderModule(section.id)}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default IGAutomationSuite;

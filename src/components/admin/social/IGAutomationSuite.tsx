import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Megaphone, PieChart, Star, ChevronDown, ChevronUp,
  Hash, ShoppingBag, CalendarDays, Users, Briefcase, Zap,
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

interface Props {
  selectedAccount: string;
}

const SECTIONS = [
  { id: "scheduler", icon: Calendar, label: "Smart Scheduler", desc: "AI-powered post scheduling & auto-publishing", color: "text-blue-400" },
  { id: "ads", icon: Megaphone, label: "Ads Manager", desc: "Campaign creation, targeting & performance tracking", color: "text-orange-400" },
  { id: "insights", icon: PieChart, label: "Advanced Insights", desc: "Demographics, best posting times & deep analytics", color: "text-purple-400" },
  { id: "creators", icon: Star, label: "Creator Discovery", desc: "Find & analyze influencers, manage partnerships", color: "text-yellow-400" },
  { id: "hashtags", icon: Hash, label: "Hashtag Research", desc: "Search & analyze trending hashtags, top/recent media", color: "text-green-400" },
  { id: "shopping", icon: ShoppingBag, label: "Shopping & Products", desc: "Product catalogs, tagging & shopping features", color: "text-pink-400" },
  { id: "events", icon: CalendarDays, label: "Events Manager", desc: "Create & manage upcoming Instagram events", color: "text-cyan-400" },
  { id: "branded", icon: Users, label: "Branded Content", desc: "Partnership ads, creator approvals & brand deals", color: "text-rose-400" },
  { id: "business", icon: Briefcase, label: "Business Manager", desc: "Business accounts, pages & multi-asset management", color: "text-indigo-400" },
];

const IGAutomationSuite = ({ selectedAccount }: Props) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["scheduler"]));

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

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">IG Automation Suite</h3>
          <Badge variant="outline" className="text-[10px]">{SECTIONS.length} modules</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={expandAll} className="text-xs h-7">Expand All</Button>
          <Button size="sm" variant="ghost" onClick={collapseAll} className="text-xs h-7">Collapse All</Button>
        </div>
      </div>

      {/* Sections */}
      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-2 pr-2">
          {SECTIONS.map(section => {
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
                    {section.id === "scheduler" && <IGAutoScheduler selectedAccount={selectedAccount} />}
                    {section.id === "ads" && <IGAdsManager selectedAccount={selectedAccount} />}
                    {section.id === "insights" && <IGAdvancedInsights selectedAccount={selectedAccount} />}
                    {section.id === "creators" && <IGCreatorDiscovery selectedAccount={selectedAccount} />}
                    {section.id === "hashtags" && <IGHashtagResearch selectedAccount={selectedAccount} />}
                    {section.id === "shopping" && <IGShoppingManager selectedAccount={selectedAccount} />}
                    {section.id === "events" && <IGEventsManager selectedAccount={selectedAccount} />}
                    {section.id === "branded" && <IGBrandedContent selectedAccount={selectedAccount} />}
                    {section.id === "business" && <IGBusinessManager selectedAccount={selectedAccount} />}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default IGAutomationSuite;

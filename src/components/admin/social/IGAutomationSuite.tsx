import { useState, useEffect } from "react";
import PlatformAccountSelector from "./PlatformAccountSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Megaphone, PieChart, Star, ChevronDown, ChevronUp,
  Hash, ShoppingBag, CalendarDays, Users, Briefcase, Zap,
  Target, TrendingUp, MessageSquare, DollarSign, Activity, Brain,
  Shield, Sparkles, Heart, Inbox, Bot, Flame, GitBranch, Clock,
  Palette, Radar, Eye, Instagram,
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
import IGBusinessMessaging from "./IGBusinessMessaging";
// Next-Gen Modules
import IGConversationIntelligence from "./IGConversationIntelligence";
import IGSmartThrottling from "./IGSmartThrottling";
import IGViralPrediction from "./IGViralPrediction";
import IGEngagementDM from "./IGEngagementDM";
import IGUnifiedInbox from "./IGUnifiedInbox";
import IGGrowthCopilot from "./IGGrowthCopilot";
import IGLeadHeatScore from "./IGLeadHeatScore";
import IGFunnelBuilder from "./IGFunnelBuilder";
import IGSmartFollowUp from "./IGSmartFollowUp";
import IGRevenueAttribution from "./IGRevenueAttribution";
import IGPersonaEngine from "./IGPersonaEngine";
import IGCompetitorSignals from "./IGCompetitorSignals";
import IGShadowMode from "./IGShadowMode";

interface Props {
  selectedAccount: string;
}

const SECTIONS = [
  // AI Platform Core
  { id: "leads", icon: Target, label: "AI Lead Scoring & Sales Agent", desc: "Score leads 0-100, AI sales agent with 7-day human window", color: "text-red-400", category: "AI Platform" },
  { id: "smart-comments", icon: MessageSquare, label: "Smart Comment Automation", desc: "Detect buying signals, auto-reply & DM hot leads", color: "text-emerald-400", category: "AI Platform" },
  { id: "health", icon: Activity, label: "Account Health & DM Memory", desc: "Shadowban risk, DM memory system & auto funnel builder", color: "text-cyan-400", category: "AI Platform" },
  { id: "conv-intel", icon: Brain, label: "AI Conversation Intelligence", desc: "Real-time DM intent detection — routes leads, support, objections & hot buyers", color: "text-violet-400", category: "AI Platform" },
  // Growth & Automation
  { id: "viral", icon: TrendingUp, label: "AI Viral Predictor & Autopilot", desc: "Predict virality, AI content autopilot & post analysis", color: "text-green-400", category: "Growth" },
  { id: "scheduler", icon: Calendar, label: "Smart Scheduler", desc: "AI-powered post scheduling & auto-publishing", color: "text-blue-400", category: "Growth" },
  { id: "competitor", icon: Users, label: "Competitor & Market Intel", desc: "Competitor analysis, hashtag intel & blue ocean finder", color: "text-violet-400", category: "Growth" },
  { id: "hashtags", icon: Hash, label: "Hashtag Research", desc: "Search & analyze trending hashtags, top/recent media", color: "text-lime-400", category: "Growth" },
  { id: "viral-predict", icon: Sparkles, label: "Viral Content Prediction", desc: "Score hook strength, retention probability & CTA clarity before publishing", color: "text-amber-400", category: "Growth" },
  { id: "growth-copilot", icon: Bot, label: "AI Growth Copilot", desc: "Persistent AI strategist — audits growth, recommends posting & funnel improvements", color: "text-cyan-400", category: "Growth" },
  // Monetization & Ads
  { id: "ad-optimizer", icon: DollarSign, label: "AI Ad Optimizer", desc: "Creative analyzer, hook detection & budget optimizer", color: "text-amber-400", category: "Ads" },
  { id: "ads", icon: Megaphone, label: "Ads Manager", desc: "Campaign creation, targeting & performance tracking", color: "text-orange-400", category: "Ads" },
  // Commerce & Partnerships
  { id: "creators", icon: Star, label: "Creator Discovery", desc: "Find & analyze influencers, manage partnerships", color: "text-yellow-400", category: "Commerce" },
  { id: "shopping", icon: ShoppingBag, label: "Shopping & Products", desc: "Product catalogs, tagging & shopping features", color: "text-pink-400", category: "Commerce" },
  { id: "branded", icon: Users, label: "Branded Content", desc: "Partnership ads, creator approvals & brand deals", color: "text-rose-400", category: "Commerce" },
  { id: "revenue-attr", icon: DollarSign, label: "Content → Revenue Attribution", desc: "Track which post, video or DM directly led to revenue or bookings", color: "text-emerald-400", category: "Commerce" },
  // Platform Management
  { id: "insights", icon: PieChart, label: "Advanced Insights", desc: "Demographics, best posting times & deep analytics", color: "text-purple-400", category: "Platform" },
  { id: "events", icon: CalendarDays, label: "Events Manager", desc: "Create & manage upcoming Instagram events", color: "text-teal-400", category: "Platform" },
  { id: "business", icon: Briefcase, label: "Business Manager", desc: "Business accounts, pages & multi-asset management", color: "text-indigo-400", category: "Platform" },
  { id: "biz-messaging", icon: MessageSquare, label: "Business Messaging", desc: "Manage Instagram DMs via Business Messaging API", color: "text-sky-400", category: "Platform" },
  // Next-Gen: Outreach & DMs
  { id: "smart-throttle", icon: Shield, label: "Smart Outreach Throttling", desc: "Anti-ban AI — dynamic speed, message variation & auto-pause on risk", color: "text-orange-400", category: "Outreach AI" },
  { id: "engagement-dm", icon: Heart, label: "Engagement-Triggered DMs", desc: "Auto-DM users who comment keywords, watch videos or like multiple posts", color: "text-pink-400", category: "Outreach AI" },
  { id: "unified-inbox", icon: Inbox, label: "Unified Inbox + AI Memory", desc: "Cross-platform inbox with conversation memory, intent & lead stage tracking", color: "text-blue-400", category: "Outreach AI" },
  { id: "funnel-builder", icon: GitBranch, label: "AI Funnel Builder", desc: "Auto-build DM → qualification → booking → follow-up funnels", color: "text-purple-400", category: "Outreach AI" },
  { id: "smart-followup", icon: Clock, label: "Smart Follow-Up Engine", desc: "Contextual, human-like follow-ups — no generic spam", color: "text-teal-400", category: "Outreach AI" },
  // Next-Gen: Intelligence
  { id: "lead-heat", icon: Flame, label: "Lead Heat Scoring", desc: "Visual heat indicators — cold 🟢, warm 🟡, ready to buy 🔴", color: "text-orange-400", category: "Intelligence" },
  { id: "persona-engine", icon: Palette, label: "AI Persona Engine", desc: "Adapt tone per brand — luxury, aggressive sales, friendly creator", color: "text-rose-400", category: "Intelligence" },
  { id: "competitor-signals", icon: Radar, label: "Competitor Signal Monitoring", desc: "Watch competitor patterns & get counter-content suggestions", color: "text-violet-400", category: "Intelligence" },
  { id: "shadow-mode", icon: Eye, label: "Shadow Mode", desc: "AI drafts, human approves — perfect for high-ticket & compliance accounts", color: "text-sky-400", category: "Intelligence" },
];

const CATEGORIES = ["AI Platform", "Growth", "Ads", "Commerce", "Platform", "Outreach AI", "Intelligence"];

const IGAutomationSuite = ({ selectedAccount: parentAccount }: Props) => {
  const [platformAccountId, setPlatformAccountId] = useState(parentAccount);
  useEffect(() => { setPlatformAccountId(parentAccount); }, [parentAccount]);
  const selectedAccount = platformAccountId || parentAccount;
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
      case "conv-intel": return <IGConversationIntelligence selectedAccount={selectedAccount} />;
      case "viral": return <IGViralPredictor selectedAccount={selectedAccount} />;
      case "scheduler": return <IGAutoScheduler selectedAccount={selectedAccount} />;
      case "competitor": return <IGCompetitorIntel selectedAccount={selectedAccount} />;
      case "hashtags": return <IGHashtagResearch selectedAccount={selectedAccount} />;
      case "viral-predict": return <IGViralPrediction selectedAccount={selectedAccount} />;
      case "growth-copilot": return <IGGrowthCopilot selectedAccount={selectedAccount} />;
      case "ad-optimizer": return <IGAdOptimizer selectedAccount={selectedAccount} />;
      case "ads": return <IGAdsManager selectedAccount={selectedAccount} />;
      case "creators": return <IGCreatorDiscovery selectedAccount={selectedAccount} />;
      case "shopping": return <IGShoppingManager selectedAccount={selectedAccount} />;
      case "branded": return <IGBrandedContent selectedAccount={selectedAccount} />;
      case "revenue-attr": return <IGRevenueAttribution selectedAccount={selectedAccount} />;
      case "insights": return <IGAdvancedInsights selectedAccount={selectedAccount} />;
      case "events": return <IGEventsManager selectedAccount={selectedAccount} />;
      case "business": return <IGBusinessManager selectedAccount={selectedAccount} />;
      case "biz-messaging": return <IGBusinessMessaging selectedAccount={selectedAccount} />;
      case "smart-throttle": return <IGSmartThrottling selectedAccount={selectedAccount} />;
      case "engagement-dm": return <IGEngagementDM selectedAccount={selectedAccount} />;
      case "unified-inbox": return <IGUnifiedInbox selectedAccount={selectedAccount} />;
      case "funnel-builder": return <IGFunnelBuilder selectedAccount={selectedAccount} />;
      case "smart-followup": return <IGSmartFollowUp selectedAccount={selectedAccount} />;
      case "lead-heat": return <IGLeadHeatScore selectedAccount={selectedAccount} />;
      case "persona-engine": return <IGPersonaEngine selectedAccount={selectedAccount} />;
      case "competitor-signals": return <IGCompetitorSignals selectedAccount={selectedAccount} />;
      case "shadow-mode": return <IGShadowMode selectedAccount={selectedAccount} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Per-platform account selector */}
      <PlatformAccountSelector
        platform="instagram"
        selectedAccountId={selectedAccount}
        onAccountChange={setPlatformAccountId}
        platformIcon={<Instagram className="h-4 w-4 text-pink-400" />}
        platformColor="text-pink-400"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">IG Revenue Operating System</h3>
          <Badge variant="outline" className="text-[10px] border-white/[0.08]">{SECTIONS.length} modules</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={expandAll} className="text-xs h-7 text-foreground hover:bg-white/[0.06]">Expand All</Button>
          <Button size="sm" variant="ghost" onClick={collapseAll} className="text-xs h-7 text-foreground hover:bg-white/[0.06]">Collapse All</Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-4 pr-2">
          {CATEGORIES.map(cat => {
            const catSections = SECTIONS.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-white/[0.08] bg-white/[0.02]">{cat}</Badge>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="space-y-2">
                  {catSections.map(section => {
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <Card key={section.id} className={`bg-white/[0.03] border-white/[0.06] backdrop-blur-sm transition-all duration-200 ${isExpanded ? "border-primary/20 shadow-[0_0_15px_-5px] shadow-primary/10" : "hover:border-white/[0.1]"}`}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full p-3.5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors rounded-t-xl"
                        >
                          <div className={`h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center ${section.color}`}>
                            <section.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-foreground">{section.label}</p>
                            <p className="text-[10px] text-muted-foreground">{section.desc}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isExpanded && (
                          <CardContent className="p-3.5 pt-0 border-t border-white/[0.06]">
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

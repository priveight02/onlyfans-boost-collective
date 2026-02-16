import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CRMAccountsTab from "@/components/admin/CRMAccountsTab";
import ProfileLookup from "@/components/admin/ProfileLookup";
import AudienceIntelligence from "@/components/admin/AudienceIntelligence";
import TeamManagement from "@/components/admin/TeamManagement";
import FinancialModule from "@/components/admin/FinancialModule";
import ContractsManager from "@/components/admin/ContractsManager";
import MessagingHub from "@/components/admin/MessagingHub";
import TaskWorkflow from "@/components/admin/TaskWorkflow";
import IntranetChat from "@/components/admin/IntranetChat";
import CreatorRankingEngine from "@/components/admin/CreatorRankingEngine";
import AdvancedFinancials from "@/components/admin/AdvancedFinancials";
import TeamPerformance from "@/components/admin/TeamPerformance";
import StorylineHub from "@/components/admin/storyline/StorylineHub";
import ReportingExport from "@/components/admin/ReportingExport";
import PersonaDNAEngine from "@/components/admin/PersonaDNAEngine";
import ContentCommandCenter from "@/components/admin/ContentCommandCenter";
import EmotionalHeatmap from "@/components/admin/EmotionalHeatmap";
import AICoPilot from "@/components/admin/AICoPilot";
import FloatingCopilot from "@/components/admin/FloatingCopilot";
import SocialMediaHub from "@/components/admin/SocialMediaHub";
import AdminAPI from "@/components/admin/AdminAPI";
import EnhancedDashboard from "@/components/admin/EnhancedDashboard";
import CreditCostBanner from "@/components/admin/CreditCostBanner";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Contact, Search, BarChart3, Users, DollarSign,
  FileText, MessageSquare, CheckSquare, MessageCircle, Award,
  TrendingUp, Activity, Zap, Download, Brain, Calendar, Heart,
  Bot, Globe, Code2, Coins, Lock, Settings, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Tab config with credit costs
const TAB_CONFIG = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, cost: "Free", note: "Overview" },
  { value: "crm", label: "Accounts", icon: Contact, cost: "2–5 cr", note: "per write action" },
  { value: "rankings", label: "Rankings", icon: Award, cost: "3 cr", note: "per update" },
  { value: "financial", label: "Financials", icon: DollarSign, cost: "2–5 cr", note: "per record" },
  { value: "adv-financials", label: "Intelligence", icon: TrendingUp, cost: "2–5 cr", note: "per record" },
  { value: "messaging", label: "Messaging", icon: MessageSquare, cost: "1–15 cr", note: "per message" },
  { value: "tasks", label: "Tasks", icon: CheckSquare, cost: "1–2 cr", note: "per task" },
  { value: "contracts", label: "Contracts", icon: FileText, cost: "3–8 cr", note: "per action" },
  { value: "team", label: "Team", icon: Users, cost: "1–10 cr", note: "per member action" },
  { value: "team-perf", label: "Performance", icon: Activity, cost: "Free", note: "view only" },
  { value: "automation", label: "Storyline", icon: Zap, cost: "5–25 cr", note: "per script action" },
  { value: "persona", label: "Persona DNA", icon: Brain, cost: "8–15 cr", note: "per persona" },
  { value: "content", label: "Content", icon: Calendar, cost: "3–5 cr", note: "per post" },
  { value: "social", label: "Social Media", icon: Globe, cost: "0–5 cr", note: "connect free (10 min bal)" },
  { value: "emotional", label: "Emotional", icon: Heart, cost: "8 cr", note: "per analysis" },
  { value: "copilot", label: "AI Co-Pilot", icon: Bot, cost: "8–30 cr", note: "per query/gen" },
  { value: "lookup", label: "Lookup", icon: Search, cost: "5 cr", note: "per lookup" },
  { value: "audience", label: "Audience", icon: BarChart3, cost: "8 cr", note: "per analysis" },
  { value: "reports", label: "Reports", icon: Download, cost: "5–8 cr", note: "per report" },
  { value: "chat", label: "Intranet", icon: MessageCircle, cost: "Free", note: "internal comms" },
  { value: "settings", label: "Settings", icon: Settings, cost: "Free", note: "" },
  { value: "api", label: "API", icon: Code2, cost: "Free", note: "docs & playground" },
];

const CRM = () => {
  const { user, loading } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!user) return;
    supabase.from("managed_accounts").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setAccounts(data || []));
  }, [user]);

  const handleTabChange = (newTab: string) => {
    if (balance < 1 && !walletLoading) {
      toast.error("Insufficient credits", {
        description: "You need at least 1 credit to use the CRM.",
        action: { label: "Buy Credits", onClick: () => navigate("/pricing") },
      });
      return;
    }
    setActiveTab(newTab);
  };

  if (loading || walletLoading) {
    return (
      <div className="min-h-screen bg-[hsl(222,35%,5%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-pulse" />
            <div className="relative animate-spin rounded-full h-10 w-10 border-2 border-accent/30 border-t-accent" />
          </div>
          <p className="text-white/40 text-sm animate-pulse">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (balance < 1) {
    return (
      <div className="dark min-h-screen bg-[hsl(222,35%,5%)] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 w-fit mx-auto">
              <Lock className="h-10 w-10 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">CRM Access Locked</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            You need at least <span className="text-amber-400 font-bold">1 credit</span> to access the CRM platform.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/pricing")} className="bg-accent hover:bg-accent/80 text-white gap-2 rounded-xl px-6">
              <Coins className="h-4 w-4" /> Buy Credits
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeConfig = TAB_CONFIG.find(t => t.value === activeTab);

  return (
    <div className="dark min-h-screen bg-[hsl(222,35%,5%)]">
      <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12 space-y-6">
        {/* Header — modern, no logout button */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" />
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-600/10 border border-white/10 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Command Center</h1>
            <p className="text-xs text-white/40">Manage accounts, content & operations</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} className="space-y-5" onValueChange={handleTabChange}>
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-white/[0.02] blur-sm" />
            <TabsList className="relative bg-[hsl(222,25%,8%)] border border-white/[0.06] p-1.5 rounded-2xl flex-wrap h-auto gap-1 w-full">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent/20 data-[state=active]:to-purple-600/10 data-[state=active]:text-white data-[state=active]:border-accent/30 data-[state=active]:border data-[state=active]:shadow-[0_0_12px_rgba(139,92,246,0.15)] text-white/40 hover:text-white/60 hover:bg-white/[0.03] rounded-xl gap-1.5 text-[11px] px-2.5 py-1.5 transition-all duration-200"
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab content with credit cost banners */}
          <TabsContent value="dashboard">
            <CreditCostBanner label="Dashboard" cost="Free" note="View your overview" />
            <EnhancedDashboard />
          </TabsContent>
          <TabsContent value="crm">
            <CreditCostBanner label="Account actions" cost="2–5" note="create: 5cr · update: 2cr · delete: 1cr" />
            <CRMAccountsTab />
          </TabsContent>
          <TabsContent value="rankings">
            <CreditCostBanner label="Ranking update" cost={3} />
            <CreatorRankingEngine accounts={accounts} />
          </TabsContent>
          <TabsContent value="financial">
            <CreditCostBanner label="Financial records" cost="2–5" note="create: 5cr · update: 2cr" />
            <FinancialModule />
          </TabsContent>
          <TabsContent value="adv-financials">
            <CreditCostBanner label="Financial records" cost="2–5" note="create: 5cr · update: 2cr" />
            <AdvancedFinancials />
          </TabsContent>
          <TabsContent value="messaging">
            <CreditCostBanner label="Messaging" cost="1–15" note="single: 1cr · bulk: 15cr" />
            <MessagingHub />
          </TabsContent>
          <TabsContent value="tasks">
            <CreditCostBanner label="Task actions" cost="1–2" note="create: 2cr · update: 1cr · complete: free" />
            <TaskWorkflow />
          </TabsContent>
          <TabsContent value="contracts">
            <CreditCostBanner label="Contract actions" cost="3–8" note="create: 8cr · update: 3cr · sign: 5cr" />
            <ContractsManager />
          </TabsContent>
          <TabsContent value="team">
            <CreditCostBanner label="Team management" cost="1–10" note="add: 10cr · update: 3cr · remove: 1cr" />
            <TeamManagement />
          </TabsContent>
          <TabsContent value="team-perf">
            <CreditCostBanner label="Performance" cost="Free" note="View-only analytics" />
            <TeamPerformance />
          </TabsContent>
          <TabsContent value="automation">
            <CreditCostBanner label="Storyline actions" cost="5–25" note="create script: 10cr · AI generate: 25cr" />
            <StorylineHub />
          </TabsContent>
          <TabsContent value="persona">
            <CreditCostBanner label="Persona DNA" cost="8–15" note="create: 15cr · update: 8cr" />
            <PersonaDNAEngine />
          </TabsContent>
          <TabsContent value="content">
            <CreditCostBanner label="Content actions" cost="3–5" note="create: 5cr · schedule: 3cr · publish: 5cr" />
            <ContentCommandCenter />
          </TabsContent>
          <TabsContent value="social">
            <CreditCostBanner label="Social Media" cost="0–5" note="connect: free (min 10cr balance) · post: 5cr" />
            <SocialMediaHub />
          </TabsContent>
          <TabsContent value="emotional">
            <CreditCostBanner label="Emotional analysis" cost={8} note="per analysis" />
            <EmotionalHeatmap />
          </TabsContent>
          <TabsContent value="copilot">
            <CreditCostBanner label="AI Co-Pilot" cost="8–30" note="chat: 8cr · image: 15cr · video: 30cr · voice: 12cr" />
            <AICoPilot />
          </TabsContent>
          <TabsContent value="lookup">
            <CreditCostBanner label="Profile lookup" cost={5} note="per lookup" />
            <ProfileLookup />
          </TabsContent>
          <TabsContent value="audience">
            <CreditCostBanner label="Audience analysis" cost={8} note="per analysis" />
            <AudienceIntelligence accounts={accounts} />
          </TabsContent>
          <TabsContent value="reports">
            <CreditCostBanner label="Reports" cost="5–8" note="generate: 8cr · export: 5cr" />
            <ReportingExport />
          </TabsContent>
          <TabsContent value="chat">
            <CreditCostBanner label="Intranet Chat" cost="Free" note="Internal communications" />
            <IntranetChat />
          </TabsContent>
          <TabsContent value="settings">
            <CreditCostBanner label="Settings" cost="Free" />
            <Card className="bg-[hsl(222,25%,8%)] border-white/[0.06] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white text-sm">CRM Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/50">Organization Name</label>
                    <Input type="text" placeholder="Your Agency" className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-accent rounded-xl h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/50">Description</label>
                    <textarea className="w-full min-h-[100px] p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/20 focus:border-accent focus:outline-none transition-colors text-sm" placeholder="Enter description..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="api">
            <CreditCostBanner label="API" cost="Free" note="Documentation & playground" />
            <AdminAPI />
          </TabsContent>
        </Tabs>
      </div>

      <FloatingCopilot activeTab={activeTab} />
    </div>
  );
};

export default CRM;

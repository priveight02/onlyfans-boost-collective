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

import CRMHelpWidget from "@/components/crm/CRMHelpWidget";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Contact, Search, BarChart3, Users, DollarSign,
  FileText, MessageSquare, CheckSquare, MessageCircle, Award,
  TrendingUp, Activity, Zap, Download, Brain, Calendar, Heart,
  Bot, Globe, Code2, Coins, Lock, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import { useCreditAction } from "@/hooks/useCreditAction";

const CRM = () => {
  const { user, loading } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const { insufficientModal, closeInsufficientModal } = useCreditAction();
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
        description: "You need at least 1 credit to use the CRM. Purchase credits to continue.",
        action: { label: "Buy Credits", onClick: () => navigate("/pricing") },
      });
      return;
    }
    setActiveTab(newTab);
  };

  if (loading || walletLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(210,100%,12%)] via-[hsl(220,100%,10%)] to-[hsl(230,100%,8%)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (balance < 1) {
    return (
      <div className="dark min-h-screen bg-gradient-to-br from-[hsl(210,100%,12%)] via-[hsl(220,100%,10%)] to-[hsl(230,100%,8%)] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit mx-auto">
            <Lock className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">CRM Access Locked</h1>
          <p className="text-white/60">
            You need at least <span className="text-amber-400 font-bold">1 credit</span> to access the CRM platform.
            Purchase credits to unlock all features.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/pricing")} className="bg-accent hover:bg-accent/80 text-white gap-2">
              <Coins className="h-4 w-4" /> Buy Credits
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white/60 hover:text-white hover:bg-white/10">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-[hsl(210,100%,12%)] via-[hsl(220,100%,10%)] to-[hsl(230,100%,8%)]">
      <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
            <LayoutDashboard className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-white">CRM Platform</h1>
            <p className="text-sm text-white/50">Manage your accounts, content & operations</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} className="space-y-6" onValueChange={handleTabChange}>
          <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="crm" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Contact className="h-3.5 w-3.5" /> Accounts
            </TabsTrigger>
            <TabsTrigger value="rankings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Award className="h-3.5 w-3.5" /> Rankings
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" /> Financials
            </TabsTrigger>
            <TabsTrigger value="adv-financials" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Intelligence
            </TabsTrigger>
            <TabsTrigger value="messaging" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Messaging
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <CheckSquare className="h-3.5 w-3.5" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Contracts
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Team
            </TabsTrigger>
            <TabsTrigger value="team-perf" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> Storyline
            </TabsTrigger>
            <TabsTrigger value="persona" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" /> Persona DNA
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> Content
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Social Media
            </TabsTrigger>
            <TabsTrigger value="emotional" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Heart className="h-3.5 w-3.5" /> Emotional
            </TabsTrigger>
            <TabsTrigger value="copilot" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Bot className="h-3.5 w-3.5" /> AI Co-Pilot
            </TabsTrigger>
            <TabsTrigger value="lookup" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Search className="h-3.5 w-3.5" /> Lookup
            </TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Audience
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <MessageCircle className="h-3.5 w-3.5" /> Intranet
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Code2 className="h-3.5 w-3.5" /> API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><EnhancedDashboard /></TabsContent>
          <TabsContent value="crm"><CRMAccountsTab /></TabsContent>
          <TabsContent value="rankings"><CreatorRankingEngine accounts={accounts} /></TabsContent>
          <TabsContent value="financial"><FinancialModule /></TabsContent>
          <TabsContent value="adv-financials"><AdvancedFinancials /></TabsContent>
          <TabsContent value="messaging"><MessagingHub /></TabsContent>
          <TabsContent value="tasks"><TaskWorkflow /></TabsContent>
          <TabsContent value="contracts"><ContractsManager /></TabsContent>
          <TabsContent value="team"><TeamManagement /></TabsContent>
          <TabsContent value="team-perf"><TeamPerformance /></TabsContent>
          <TabsContent value="automation"><StorylineHub /></TabsContent>
          <TabsContent value="persona"><PersonaDNAEngine /></TabsContent>
          <TabsContent value="content"><ContentCommandCenter /></TabsContent>
          <TabsContent value="social"><SocialMediaHub /></TabsContent>
          <TabsContent value="emotional"><EmotionalHeatmap /></TabsContent>
          <TabsContent value="copilot"><AICoPilot /></TabsContent>
          <TabsContent value="lookup"><ProfileLookup /></TabsContent>
          <TabsContent value="audience"><AudienceIntelligence accounts={accounts} /></TabsContent>
          <TabsContent value="reports"><ReportingExport /></TabsContent>
          <TabsContent value="chat"><IntranetChat /></TabsContent>
          
          <TabsContent value="settings">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">CRM Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Organization Name</label>
                    <Input type="text" placeholder="Your Agency" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Description</label>
                    <textarea className="w-full min-h-[100px] p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-accent focus:outline-none transition-colors" placeholder="Enter description..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="api"><AdminAPI /></TabsContent>
        </Tabs>
      </div>

      <CRMHelpWidget />
      <FloatingCopilot activeTab={activeTab} />
      <InsufficientCreditsModal
        open={insufficientModal.open}
        onClose={closeInsufficientModal}
        requiredCredits={insufficientModal.requiredCredits}
        actionName={insufficientModal.actionName}
      />
    </div>
  );
};

export default CRM;

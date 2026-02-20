import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import { useCreditAction } from "@/hooks/useCreditAction";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Contact, Search, BarChart3, Users, DollarSign,
  FileText, MessageSquare, CheckSquare, MessageCircle, Award,
  TrendingUp, Activity, Zap, Download, Brain, Calendar, Heart,
  Bot, Globe, Code2, Coins, Lock, Settings, ChevronLeft, ChevronRight,
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "crm", label: "Accounts", icon: Contact },
      { id: "rankings", label: "Rankings", icon: Award },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "financial", label: "Financials", icon: DollarSign },
      { id: "adv-financials", label: "Intelligence", icon: TrendingUp },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "messaging", label: "Messaging", icon: MessageSquare },
      { id: "chat", label: "Intranet", icon: MessageCircle },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "tasks", label: "Tasks", icon: CheckSquare },
      { id: "contracts", label: "Contracts", icon: FileText },
      { id: "team", label: "Team", icon: Users },
      { id: "team-perf", label: "Performance", icon: Activity },
    ],
  },
  {
    label: "AI & Automation",
    items: [
      { id: "automation", label: "Storyline", icon: Zap },
      { id: "persona", label: "Persona DNA", icon: Brain },
      { id: "copilot", label: "AI Co-Pilot", icon: Bot },
      { id: "emotional", label: "Emotional", icon: Heart },
    ],
  },
  {
    label: "Content & Social",
    items: [
      { id: "content", label: "Content", icon: Calendar },
      { id: "social", label: "Social Media", icon: Globe },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "lookup", label: "Lookup", icon: Search },
      { id: "audience", label: "Audience", icon: BarChart3 },
      { id: "reports", label: "Reports", icon: Download },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "api", label: "API", icon: Code2 },
    ],
  },
];

const CRM = () => {
  const { user, loading } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const { insufficientModal, closeInsufficientModal } = useCreditAction();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <div className="min-h-screen bg-[hsl(222,47%,6%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[hsl(217,91%,60%)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-white/40 font-medium">Loading platform...</span>
        </div>
      </div>
    );
  }

  if (balance < 1) {
    return (
      <div className="dark min-h-screen bg-[hsl(222,47%,6%)] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(217,91%,60%)]/10 border border-[hsl(217,91%,60%)]/20 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-[hsl(217,91%,60%)]" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Platform Locked</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            You need at least <span className="text-[hsl(217,91%,60%)] font-semibold">1 credit</span> to access the platform. Purchase credits to unlock all features.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/pricing")} className="bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white gap-2 h-10 px-6 rounded-xl font-medium">
              <Coins className="h-4 w-4" /> Buy Credits
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white/50 hover:text-white hover:bg-white/5 h-10 px-6 rounded-xl">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <EnhancedDashboard />;
      case "crm": return <CRMAccountsTab />;
      case "rankings": return <CreatorRankingEngine accounts={accounts} />;
      case "financial": return <FinancialModule />;
      case "adv-financials": return <AdvancedFinancials />;
      case "messaging": return <MessagingHub />;
      case "tasks": return <TaskWorkflow />;
      case "contracts": return <ContractsManager />;
      case "team": return <TeamManagement />;
      case "team-perf": return <TeamPerformance />;
      case "automation": return <StorylineHub />;
      case "persona": return <PersonaDNAEngine />;
      case "content": return <ContentCommandCenter />;
      case "social": return <SocialMediaHub />;
      case "emotional": return <EmotionalHeatmap />;
      case "copilot": return <AICoPilot />;
      case "lookup": return <ProfileLookup />;
      case "audience": return <AudienceIntelligence accounts={accounts} />;
      case "reports": return <ReportingExport />;
      case "chat": return <IntranetChat />;
      case "api": return <AdminAPI />;
      case "settings": return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white font-heading">Settings</h2>
            <p className="text-sm text-white/40 mt-1">Manage your platform configuration</p>
          </div>
          <Card className="crm-card">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/60">Organization Name</label>
                <Input type="text" placeholder="Your Agency" className="crm-input" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/60">Description</label>
                <textarea className="w-full min-h-[100px] p-3 rounded-xl bg-[hsl(222,47%,11%)]/60 border border-white/[0.06] text-white placeholder:text-white/25 focus:border-[hsl(217,91%,60%)]/40 focus:outline-none transition-colors text-sm" placeholder="Enter description..." />
              </div>
            </CardContent>
          </Card>
        </div>
      );
      default: return <EnhancedDashboard />;
    }
  };

  return (
    <div className="dark min-h-screen bg-[hsl(222,47%,6%)] flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-screen z-40 flex flex-col border-r border-white/[0.06] bg-[hsl(222,47%,7%)] transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-[220px]"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
          {!sidebarCollapsed && (
            <span className="text-base font-bold text-white font-heading tracking-tight">Uplyze</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors",
              sidebarCollapsed ? "mx-auto" : "ml-auto"
            )}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-white/20 uppercase tracking-wider">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        sidebarCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                        isActive
                          ? "bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)]"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-[hsl(217,91%,60%)]" : "")} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-white/[0.06]">
            <div className="px-3 py-2 rounded-xl bg-[hsl(217,91%,60%)]/5 border border-[hsl(217,91%,60%)]/10">
              <p className="text-[10px] font-medium text-white/30">Credits</p>
              <p className="text-sm font-bold text-[hsl(217,91%,60%)]">{balance.toLocaleString()}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        sidebarCollapsed ? "ml-[68px]" : "ml-[220px]"
      )}>
        {/* Top bar */}
        <header className="h-16 border-b border-white/[0.06] bg-[hsl(222,47%,6%)]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
          <div>
            <h1 className="text-base font-semibold text-white font-heading">
              {navSections.flatMap(s => s.items).find(i => i.id === activeTab)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-[200px] rounded-xl bg-white/[0.04] border border-white/[0.06] pl-9 pr-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[hsl(217,91%,60%)]/30 transition-colors"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>

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

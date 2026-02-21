import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
import AdCreativeEngine from "@/components/admin/AdCreativeEngine";
import CRMHelpWidget from "@/components/crm/CRMHelpWidget";
import CreditsDisplay from "@/components/CreditsDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import { useCreditAction } from "@/hooks/useCreditAction";
import { cn } from "@/lib/utils";
import PageSEO from "@/components/PageSEO";
import {
  LayoutDashboard, Contact, Search, BarChart3, Users, DollarSign,
  FileText, MessageSquare, CheckSquare, MessageCircle, Award,
  TrendingUp, Activity, Zap, Download, Brain, Calendar, Heart,
  Bot, Globe, Code2, Settings, ChevronLeft, ChevronRight,
  Bell, HelpCircle, Megaphone, LogOut, Plus,
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
    label: "Featured Tools",
    items: [
      { id: "social", label: "Social Media", icon: Globe },
      { id: "copilot", label: "Uplyze AI Copilot", icon: Bot },
      { id: "ad-creatives", label: "Creative Maker", icon: Megaphone },
      { id: "content", label: "Content", icon: Calendar },
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
      { id: "emotional", label: "Emotional", icon: Heart },
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

// Tab ID ↔ URL slug mapping
const TAB_SLUGS: Record<string, string> = {
  dashboard: "dashboard", crm: "accounts", rankings: "rankings",
  financial: "financials", "adv-financials": "intelligence",
  messaging: "messaging", chat: "intranet",
  tasks: "tasks", contracts: "contracts", team: "team", "team-perf": "performance",
  automation: "storyline", persona: "persona-dna", copilot: "uplyze-assistant", emotional: "emotional",
  content: "content", social: "social-media", "ad-creatives": "ad-creatives",
  lookup: "lookup", audience: "audience", reports: "reports",
  settings: "settings", api: "api",
};
const SLUG_TO_TAB: Record<string, string> = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]));

// Sub-tab slug mappings per main tab (internal-id → url-slug)
const SUB_TAB_SLUGS: Record<string, Record<string, string>> = {
  copilot: { chat: "chat", image: "image-gen-v1", video: "video-gen", audio: "audio-gen", motion: "motion-gen", lipsync: "lipsync-gen", faceswap: "faceswap-gen" },
  social: { dashboard: "dashboard", "ai-auto": "auto-dm", "ai-mass": "mass-dm", search: "search", content: "content", engagement: "comments", messaging: "dms", "ai-tools": "ai-tools", analytics: "analytics", biolink: "bio-links", automation: "automation", "social-networks": "networks" },
  automation: { builder: "script-builder", library: "library", optimizer: "conversion-optimizer", playbook: "psychology-playbook", analytics: "analytics", workflows: "workflows", ai: "ai-intelligence", alerts: "smart-alerts" },
  "ad-creatives": { creatives: "creatives", generate: "ai-image-gen", copy: "copy-cta", analytics: "analytics", settings: "targeting" },
  api: { keys: "api-keys", docs: "documentation", playground: "playground", quickstart: "quick-start", history: "key-history" },
  lookup: { overview: "overview", revenue: "revenue", audience: "audience", fans: "fans", content: "content", engagement: "engagement", traffic: "traffic", messaging: "messaging", links: "links", chargebacks: "chargebacks", highlights: "highlights", bio: "bio-strategy", ai: "ai-analysis", raw: "raw-data" },
};
// Reverse: url-slug → internal-id per main tab
const SUB_SLUG_TO_TAB: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(SUB_TAB_SLUGS).map(([mainTab, mapping]) => [mainTab, Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]))])
);

const CRM = () => {
  const { user, profile, loading, logout } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const { insufficientModal, closeInsufficientModal } = useCreditAction();
  const navigate = useNavigate();
  const location = useLocation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // Derive active tab + sub-tab from URL
  const pathAfterPlatform = location.pathname.replace("/platform", "").replace(/^\//, "");
  const pathParts = pathAfterPlatform.split("/").filter(Boolean);
  const mainSlug = pathParts[0] || "";
  const subSlug = pathParts[1] || "";
  const activeTab = SLUG_TO_TAB[mainSlug] || "dashboard";

  // Resolve sub-tab from URL
  const subTabMapping = SUB_SLUG_TO_TAB[activeTab];
  const activeSubTab = subTabMapping && subSlug ? (subTabMapping[subSlug] || undefined) : undefined;

  useEffect(() => {
    if (!user) return;
    supabase.from("managed_accounts").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setAccounts(data || []));
  }, [user]);

  // SEO metadata per route
  const activeItem = navSections.flatMap(s => s.items).find(i => i.id === activeTab);
  const seoMeta = useMemo(() => {
    const base = "Uplyze AI Platform";
    const mainLabel = activeItem?.label || "Dashboard";
    const subLabel = activeSubTab ? activeSubTab.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
    const fullTitle = subLabel ? `${subLabel} — ${mainLabel} | ${base}` : `${mainLabel} | ${base}`;
    const desc = subLabel
      ? `Access ${subLabel} in ${mainLabel} on Uplyze AI — the #1 all-in-one AI platform for marketing, automation, CRM, and business growth.`
      : `Access ${mainLabel} on Uplyze AI — the #1 all-in-one AI platform for marketing automation, AI CRM, content creation, and business scaling.`;
    return { title: fullTitle, description: desc };
  }, [activeTab, activeSubTab, activeItem]);

  const handleTabChange = (newTab: string) => {
    const slug = TAB_SLUGS[newTab] || newTab;
    navigate(`/platform/${slug}`, { replace: true });
  };

  const handleSubTabChange = (subTabId: string) => {
    const mainSlugVal = TAB_SLUGS[activeTab] || activeTab;
    const subSlugs = SUB_TAB_SLUGS[activeTab];
    const subSlugVal = subSlugs?.[subTabId] || subTabId;
    navigate(`/platform/${mainSlugVal}/${subSlugVal}`, { replace: true });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch {}
  };

  const userInitial = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  if (loading || walletLoading) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,4%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-[hsl(217,91%,60%)]/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-[hsl(217,91%,60%)]/60 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-xs text-white/25 font-medium tracking-wider uppercase">Loading platform</span>
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
      case "automation": return <StorylineHub subTab={activeSubTab} onSubTabChange={handleSubTabChange} />;
      case "persona": return <PersonaDNAEngine />;
      case "content": return <ContentCommandCenter />;
      case "social": return <SocialMediaHub subTab={activeSubTab} onSubTabChange={handleSubTabChange} />;
      case "ad-creatives": return <AdCreativeEngine subTab={activeSubTab} onSubTabChange={handleSubTabChange} />;
      case "emotional": return <EmotionalHeatmap />;
      case "copilot": return <AICoPilot onNavigate={(tab: string) => handleTabChange(tab)} subTab={activeSubTab} onSubTabChange={handleSubTabChange} />;
      case "lookup": return <ProfileLookup subTab={activeSubTab} onSubTabChange={handleSubTabChange} />;
      case "audience": return <AudienceIntelligence accounts={accounts} />;
      case "reports": return <ReportingExport />;
      case "chat": return <IntranetChat />;
      case "api": return <AdminAPI subTab={activeSubTab} onSubTabChange={handleSubTabChange} />;
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

  // activeItem already declared above

  return (
    <div className="dark min-h-screen flex overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(222 47% 4%) 0%, hsl(225 50% 6%) 50%, hsl(222 47% 4%) 100%)" }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[15%] w-[60%] h-[60%] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(217 91% 55%), transparent 70%)" }} />
        <div className="absolute -bottom-[25%] -right-[15%] w-[50%] h-[50%] rounded-full opacity-[0.025]" style={{ background: "radial-gradient(circle, hsl(262 83% 58%), transparent 70%)" }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full opacity-[0.015]" style={{ background: "radial-gradient(circle, hsl(200 100% 50%), transparent 70%)" }} />
      </div>

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={cn(
        "fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 ease-out",
        sidebarCollapsed ? "w-[72px]" : "w-[240px]"
      )} style={{
        background: "linear-gradient(180deg, hsl(222 50% 7% / 0.97) 0%, hsl(222 50% 5% / 0.95) 100%)",
        borderRight: "1px solid hsl(217 91% 60% / 0.06)",
        backdropFilter: "blur(40px) saturate(1.5)",
      }}>
        {/* Logo area */}
        <div className={cn("h-[64px] flex items-center justify-center border-b border-white/[0.04]", sidebarCollapsed ? "px-3" : "px-5")}>
          {!sidebarCollapsed && (
            <span className="text-[28px] font-extrabold text-white tracking-tight" style={{ textShadow: "0 0 30px hsl(217 91% 60% / 0.2)" }}>Uplyze</span>
          )}
          {sidebarCollapsed && (
            <span className="text-[22px] font-extrabold text-white">U</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.18em]">{section.label}</p>
              )}
              {sidebarCollapsed && <div className="h-px bg-white/[0.04] mx-2 mb-2" />}
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
                        "w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200 relative group",
                        sidebarCollapsed ? "justify-center px-0 py-2.5 mx-auto" : "px-3 py-[9px]",
                        isActive
                          ? "text-white"
                          : "text-white/35 hover:text-white/65 hover:bg-white/[0.03]"
                      )}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "linear-gradient(180deg, hsl(217 91% 60%), hsl(262 83% 58%))" }} />
                      )}
                      {/* Active background */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl opacity-100" style={{ background: "linear-gradient(90deg, hsl(217 91% 60% / 0.1), hsl(217 91% 60% / 0.03))" }} />
                      )}
                      <Icon className={cn(
                        "h-[18px] w-[18px] flex-shrink-0 relative z-10 transition-colors",
                        isActive ? "text-[hsl(217,91%,60%)]" : "group-hover:text-white/50"
                      )} />
                      {!sidebarCollapsed && <span className="truncate relative z-10">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 py-2 border-t border-white/[0.04]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all text-xs"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
        </div>

        {/* Credits footer */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-4">
            <button
              onClick={() => setShowCreditsModal(true)}
              className="w-full px-4 py-3 rounded-xl relative overflow-hidden text-left cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110"
              style={{ background: "linear-gradient(135deg, hsl(217 91% 55% / 0.08), hsl(262 83% 58% / 0.05))", border: "1px solid hsl(217 91% 60% / 0.08)" }}
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(217 91% 60%), transparent)" }} />
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Credits</p>
                <Plus className="h-3.5 w-3.5 text-white/40" />
              </div>
              <p className="text-lg font-bold text-white mt-0.5" style={{ textShadow: "0 0 20px hsl(217 91% 60% / 0.3)" }}>{balance.toLocaleString()}</p>
            </button>
          </div>
        )}
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen relative z-10",
        sidebarCollapsed ? "ml-[72px]" : "ml-[240px]"
      )}>
        {/* Top bar */}
        <header className="h-[56px] sticky top-0 z-50 flex items-center justify-between px-6" style={{
          background: "hsl(222 47% 4% / 0.7)",
          backdropFilter: "blur(24px) saturate(1.4)",
          borderBottom: "1px solid hsl(217 91% 60% / 0.04)",
        }}>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white/90 tracking-tight">
              {activeItem?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/15 group-focus-within:text-white/30 transition-colors" />
              <input
                type="text"
                placeholder="Search your platform..."
                className="h-8 w-[200px] focus:w-[280px] rounded-lg text-xs text-white placeholder:text-white/15 pl-9 pr-3 transition-all duration-300 outline-none"
                style={{
                  background: "hsl(222 47% 10% / 0.5)",
                  border: "1px solid hsl(217 91% 60% / 0.06)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "hsl(217 91% 60% / 0.2)"; e.target.style.background = "hsl(222 47% 12% / 0.6)"; }}
                onBlur={(e) => { e.target.style.borderColor = "hsl(217 91% 60% / 0.06)"; e.target.style.background = "hsl(222 47% 10% / 0.5)"; }}
              />
            </div>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
              <Bell className="h-4 w-4" />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
              <HelpCircle className="h-4 w-4" />
            </button>
            <div className="border-l border-white/[0.06] pl-2 ml-1 flex items-center gap-1.5">
              <Link to="/profile">
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105"
                  title={`@${profile?.username || 'profile'}`}
                  style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}
                >
                  {userInitial}
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* SEO */}
        <PageSEO
          title={seoMeta.title}
          description={seoMeta.description}
          ogTitle={seoMeta.title}
          ogDescription={seoMeta.description}
        />

        {/* Page content — larger base text for all tabs */}
        <div className="p-6 text-base [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:text-[14px] [&_label]:text-[13px]">
          {renderContent()}
        </div>
      </main>

      <CRMHelpWidget />
      <FloatingCopilot activeTab={activeTab} onNavigate={(tab: string) => handleTabChange(tab)} />
      <InsufficientCreditsModal
        open={insufficientModal.open || showCreditsModal}
        onClose={() => { closeInsufficientModal(); setShowCreditsModal(false); }}
        requiredCredits={insufficientModal.requiredCredits}
        actionName={showCreditsModal ? "Add Credits" : insufficientModal.actionName}
      />
    </div>
  );
};

export default CRM;

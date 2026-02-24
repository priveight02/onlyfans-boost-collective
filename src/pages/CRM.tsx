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
  Bell, HelpCircle, Megaphone, LogOut, Plus, X,
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
  social: { dashboard: "dashboard", "ai-auto": "auto-dm", "ai-mass": "outreach", search: "search", content: "content", engagement: "comments", messaging: "dms", "ai-tools": "ai-tools", analytics: "analytics", biolink: "bio-links", automation: "automation", "social-networks": "networks" },
  automation: { builder: "script-builder", library: "library", optimizer: "conversion-optimizer", playbook: "psychology-playbook", analytics: "analytics", workflows: "workflows", ai: "ai-intelligence", alerts: "smart-alerts" },
  "ad-creatives": { creatives: "creatives", generate: "ai-image-gen", copy: "copy-cta", analytics: "analytics", settings: "targeting", integrations: "integrations", campaigns: "campaigns", store: "store-manager" },
  api: { keys: "api-keys", docs: "documentation", playground: "playground", quickstart: "quick-start", history: "key-history" },
  lookup: { overview: "overview", revenue: "revenue", audience: "audience", fans: "fans", content: "content", engagement: "engagement", traffic: "traffic", messaging: "messaging", links: "links", chargebacks: "chargebacks", highlights: "highlights", bio: "bio-strategy", ai: "ai-analysis", raw: "raw-data" },
};

// Social platform slugs (instagram, tiktok, etc.)
const SOCIAL_PLATFORMS = ["instagram", "tiktok", "threads", "facebook", "connect"];

// TikTok sub-tab slugs
const TK_SUB_TAB_SLUGS: Record<string, string> = {
  dashboard: "dashboard", "auto-dm": "auto-dm", content: "content", comments: "comments",
  dms: "dms", search: "search", "ai-tools": "ai-tools", analytics: "analytics", automation: "automation",
};
const TK_SLUG_TO_TAB: Record<string, string> = Object.fromEntries(Object.entries(TK_SUB_TAB_SLUGS).map(([k, v]) => [v, k]));

// Threads sub-tab slugs
const THREADS_SUB_TAB_SLUGS: Record<string, string> = {
  dashboard: "dashboard", publish: "publish", threads: "threads", replies: "replies",
  mentions: "mentions", search: "search", insights: "insights", "ai-tools": "ai-tools",
};
const THREADS_SLUG_TO_TAB: Record<string, string> = Object.fromEntries(Object.entries(THREADS_SUB_TAB_SLUGS).map(([k, v]) => [v, k]));

// Facebook sub-tab slugs
const FB_SUB_TAB_SLUGS: Record<string, string> = {
  dashboard: "dashboard", pages: "pages", posts: "posts", comments: "comments",
  groups: "groups", events: "events", albums: "albums", inbox: "inbox",
  insights: "insights", search: "search", "ai-tools": "ai-tools",
};
const FB_SLUG_TO_TAB: Record<string, string> = Object.fromEntries(Object.entries(FB_SUB_TAB_SLUGS).map(([k, v]) => [v, k]));
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Icon lookup helper
  const getIconForId = (id: string): any => {
    const found = navSections.flatMap(s => s.items).find(i => i.id === id);
    return found?.icon || null;
  };

  // Sub-tab icon mappings
  const subTabIcons: Record<string, any> = {
    "Chat": MessageCircle, "Image Gen V1": Megaphone, "Video Gen": Activity, "Audio Gen": Activity, "Motion Gen": Zap, "Lipsync Gen": Zap, "Faceswap Gen": Brain,
    "SM Dashboard": LayoutDashboard, "Auto-DM": Bot, "Outreach": MessageSquare, "Search": Search, "Content": Calendar, "Comments": MessageCircle,
    "DMs": MessageSquare, "AI Tools": Brain, "Analytics": BarChart3, "Bio Links": Globe, "Automation": Zap, "Networks": Globe,
    "Script Builder": Zap, "Library": FileText, "Conversion Optimizer": TrendingUp, "Psychology Playbook": Heart, "Workflows": Activity, "AI Intelligence": Brain, "Smart Alerts": Bell,
    "Creatives": Megaphone, "AI Image Gen": Megaphone, "Copy & CTA": FileText, "Ad Analytics": BarChart3, "Targeting": Settings, "Integrations": Code2, "Campaigns": TrendingUp, "Store Manager": DollarSign,
    "API Keys": Code2, "Documentation": FileText, "Playground": Code2, "Quick Start": Zap, "Key History": FileText,
    "Overview": LayoutDashboard, "Revenue": DollarSign, "Audience": BarChart3, "Fans": Users, "Engagement": Activity, "Traffic": TrendingUp, "Messaging": MessageSquare,
    "Links": Globe, "Chargebacks": DollarSign, "Highlights": Award, "Bio Strategy": Globe, "AI Analysis": Brain, "Raw Data": Download,
  };

  const socialFeatureIcons: Record<string, any> = {
    "Dashboard": LayoutDashboard, "Auto-DM": Bot, "Outreach": MessageSquare, "Search": Search, "Content": Calendar,
    "Comments": MessageCircle, "DMs": MessageSquare, "AI Tools": Brain, "Analytics": BarChart3, "Bio Links": Globe,
    "Automation": Zap, "Networks": Globe, "Publish": Calendar, "Posts": FileText, "Replies": MessageCircle,
    "Mentions": Bell, "Insights": BarChart3, "Pages": FileText, "Groups": Users, "Events": Calendar,
    "Albums": FileText, "Inbox": MessageSquare,
  };

  // Build searchable index of all tabs, subtabs, features
  type SearchItem = { label: string; type: "tab" | "subtab" | "feature"; path: string; breadcrumb: string[]; icon: any };
  const searchIndex = useMemo(() => {
    const items: SearchItem[] = [];
    for (const section of navSections) {
      for (const item of section.items) {
        items.push({ label: item.label, type: "tab", path: `/platform/${TAB_SLUGS[item.id] || item.id}`, breadcrumb: ["Platform", item.label], icon: item.icon });
      }
    }
    const subTabLabels: Record<string, Record<string, string>> = {
      copilot: { chat: "Chat", image: "Image Gen V1", video: "Video Gen", audio: "Audio Gen", motion: "Motion Gen", lipsync: "Lipsync Gen", faceswap: "Faceswap Gen" },
      social: { dashboard: "SM Dashboard", "ai-auto": "Auto-DM", "ai-mass": "Outreach", search: "Search", content: "Content", engagement: "Comments", messaging: "DMs", "ai-tools": "AI Tools", analytics: "Analytics", biolink: "Bio Links", automation: "Automation", "social-networks": "Networks" },
      automation: { builder: "Script Builder", library: "Library", optimizer: "Conversion Optimizer", playbook: "Psychology Playbook", analytics: "Analytics", workflows: "Workflows", ai: "AI Intelligence", alerts: "Smart Alerts" },
      "ad-creatives": { creatives: "Creatives", generate: "AI Image Gen", copy: "Copy & CTA", analytics: "Ad Analytics", settings: "Targeting", integrations: "Integrations", campaigns: "Campaigns", store: "Store Manager" },
      api: { keys: "API Keys", docs: "Documentation", playground: "Playground", quickstart: "Quick Start", history: "Key History" },
      lookup: { overview: "Overview", revenue: "Revenue", audience: "Audience", fans: "Fans", content: "Content", engagement: "Engagement", traffic: "Traffic", messaging: "Messaging", links: "Links", chargebacks: "Chargebacks", highlights: "Highlights", bio: "Bio Strategy", ai: "AI Analysis", raw: "Raw Data" },
    };
    for (const [mainTab, subs] of Object.entries(subTabLabels)) {
      const mainLabel = navSections.flatMap(s => s.items).find(i => i.id === mainTab)?.label || mainTab;
      const mainSlugVal = TAB_SLUGS[mainTab] || mainTab;
      for (const [subId, subLabel] of Object.entries(subs)) {
        const subSlugVal = SUB_TAB_SLUGS[mainTab]?.[subId] || subId;
        items.push({ label: subLabel, type: "subtab", path: `/platform/${mainSlugVal}/${subSlugVal}`, breadcrumb: ["Platform", mainLabel, subLabel], icon: subTabIcons[subLabel] || getIconForId(mainTab) || Search });
      }
    }
    const socialPlatformSubs: Record<string, Record<string, string>> = {
      instagram: { dashboard: "Dashboard", "auto-dm": "Auto-DM", outreach: "Outreach", search: "Search", content: "Content", comments: "Comments", dms: "DMs", "ai-tools": "AI Tools", analytics: "Analytics", "bio-links": "Bio Links", automation: "Automation", networks: "Networks" },
      tiktok: { dashboard: "Dashboard", "auto-dm": "Auto-DM", content: "Content", comments: "Comments", dms: "DMs", search: "Search", "ai-tools": "AI Tools", analytics: "Analytics", automation: "Automation" },
      threads: { dashboard: "Dashboard", publish: "Publish", threads: "Posts", replies: "Replies", mentions: "Mentions", search: "Search", insights: "Insights", "ai-tools": "AI Tools" },
      facebook: { dashboard: "Dashboard", pages: "Pages", posts: "Posts", comments: "Comments", groups: "Groups", events: "Events", albums: "Albums", inbox: "Inbox", insights: "Insights", search: "Search", "ai-tools": "AI Tools" },
    };
    for (const [platform, subs] of Object.entries(socialPlatformSubs)) {
      const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
      for (const [slug, label] of Object.entries(subs)) {
        items.push({ label: `${platformLabel} ${label}`, type: "subtab", path: `/platform/social-media/${platform}/${slug}`, breadcrumb: ["Platform", "Social Media", platformLabel, label], icon: socialFeatureIcons[label] || Globe });
      }
    }
    const features: { label: string; breadcrumb: string[]; path: string; icon: any }[] = [
      { label: "AI Caption Generator", breadcrumb: ["Platform", "Social Media", "Instagram", "Content"], path: "/platform/social-media/instagram/content", icon: Calendar },
      { label: "Live AI Conversations", breadcrumb: ["Platform", "Social Media", "Instagram", "Auto-DM"], path: "/platform/social-media/instagram/auto-dm", icon: Bot },
      { label: "Test AI Responder", breadcrumb: ["Platform", "Social Media", "Instagram", "Auto-DM"], path: "/platform/social-media/instagram/auto-dm", icon: Bot },
      { label: "Mass DM Outreach", breadcrumb: ["Platform", "Social Media", "Instagram", "Outreach"], path: "/platform/social-media/instagram/outreach", icon: MessageSquare },
      { label: "Comment Manager", breadcrumb: ["Platform", "Social Media", "Instagram", "Comments"], path: "/platform/social-media/instagram/comments", icon: MessageCircle },
      { label: "Bio Link Builder", breadcrumb: ["Platform", "Social Media", "Instagram", "Bio Links"], path: "/platform/social-media/instagram/bio-links", icon: Globe },
      { label: "Image Generator", breadcrumb: ["Platform", "Uplyze AI Copilot", "Image Gen V1"], path: "/platform/uplyze-assistant/image-gen-v1", icon: Megaphone },
      { label: "Video Generator", breadcrumb: ["Platform", "Uplyze AI Copilot", "Video Gen"], path: "/platform/uplyze-assistant/video-gen", icon: Activity },
      { label: "Audio Generator", breadcrumb: ["Platform", "Uplyze AI Copilot", "Audio Gen"], path: "/platform/uplyze-assistant/audio-gen", icon: Activity },
      { label: "Persona DNA Engine", breadcrumb: ["Platform", "AI & Automation", "Persona DNA"], path: "/platform/persona-dna", icon: Brain },
      { label: "Emotional Heatmap", breadcrumb: ["Platform", "AI & Automation", "Emotional"], path: "/platform/emotional", icon: Heart },
      { label: "Ad Creative Engine", breadcrumb: ["Platform", "Creative Maker", "Creatives"], path: "/platform/ad-creatives/creatives", icon: Megaphone },
    ];
    for (const f of features) {
      items.push({ label: f.label, type: "feature", path: f.path, breadcrumb: f.breadcrumb, icon: f.icon });
    }
    return items;
  }, []);

  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex.filter(item =>
      item.label.toLowerCase().includes(q) || item.breadcrumb.some(b => b.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [searchQuery, searchIndex]);

  // Derive active tab + sub-tab from URL
  const pathAfterPlatform = location.pathname.replace("/platform", "").replace(/^\//, "");
  const pathParts = pathAfterPlatform.split("/").filter(Boolean);
  const mainSlug = pathParts[0] || "";
  const activeTab = SLUG_TO_TAB[mainSlug] || "dashboard";

  // For social tab: /platform/social-media/{platform}/{subtab}
  // For others: /platform/{main}/{subtab}
  let subSlug = "";
  let socialPlatformSlug = "";
  let socialSubSlug = "";
  if (activeTab === "social" && pathParts.length >= 2) {
    // Check if pathParts[1] is a platform slug
    if (SOCIAL_PLATFORMS.includes(pathParts[1])) {
      socialPlatformSlug = pathParts[1];
      socialSubSlug = pathParts[2] || "";
    } else {
      // Legacy: /platform/social-media/{subtab} — treat as instagram platform
      subSlug = pathParts[1];
    }
  } else {
    subSlug = pathParts[1] || "";
  }

  // Resolve sub-tab from URL
  const subTabMapping = SUB_SLUG_TO_TAB[activeTab];
  let activeSubTab: string | undefined;
  if (activeTab === "social" && socialPlatformSlug) {
    if (socialPlatformSlug === "tiktok" && socialSubSlug) {
      activeSubTab = TK_SLUG_TO_TAB[socialSubSlug] || socialSubSlug;
    } else if (socialPlatformSlug === "threads" && socialSubSlug) {
      activeSubTab = THREADS_SLUG_TO_TAB[socialSubSlug] || socialSubSlug;
    } else if (socialPlatformSlug === "facebook" && socialSubSlug) {
      activeSubTab = FB_SLUG_TO_TAB[socialSubSlug] || socialSubSlug;
    } else if (socialSubSlug) {
      activeSubTab = subTabMapping?.[socialSubSlug] || socialSubSlug;
    }
  } else {
    activeSubTab = subTabMapping && subSlug ? (subTabMapping[subSlug] || undefined) : undefined;
  }

  const activeSocialPlatform = socialPlatformSlug || (activeTab === "social" ? "instagram" : "");

  useEffect(() => {
    if (!user) return;
    supabase.from("managed_accounts").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setAccounts(data || []));
  }, [user]);

  // SEO metadata per route
  const activeItem = navSections.flatMap(s => s.items).find(i => i.id === activeTab);
   const seoMeta = useMemo(() => {
    const mainLabel = activeItem?.label || "Dashboard";
    const platformLabel = socialPlatformSlug ? socialPlatformSlug.charAt(0).toUpperCase() + socialPlatformSlug.slice(1) : "";
    const subLabel = activeSubTab ? activeSubTab.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
    const fullTitle = platformLabel && subLabel
      ? `${subLabel} - ${platformLabel} Automation - Uplyze`
      : platformLabel
      ? `${platformLabel} Automation - Uplyze`
      : subLabel
      ? `${subLabel} - ${mainLabel} - Uplyze`
      : `${mainLabel} - Uplyze`;
    const desc = platformLabel
      ? `Run ${subLabel || platformLabel} automation on autopilot. Built for creators, agencies, and digital businesses who want to grow faster.`
      : subLabel
      ? `Use ${subLabel} inside ${mainLabel} to save time and scale. AI-powered tools built for creators, agencies, and businesses.`
      : `Your ${mainLabel} inside Uplyze. AI tools built for creators, digital agencies, and businesses ready to scale.`;
    return { title: fullTitle, description: desc };
  }, [activeTab, activeSubTab, activeItem, socialPlatformSlug]);

  const handleTabChange = (newTab: string) => {
    const slug = TAB_SLUGS[newTab] || newTab;
    navigate(`/platform/${slug}`, { replace: true });
  };

  const handleSubTabChange = (subTabId: string) => {
    const mainSlugVal = TAB_SLUGS[activeTab] || activeTab;
    if (activeTab === "social" && activeSocialPlatform) {
      // For social: /platform/social-media/{platform}/{subtab}
      const subSlugs = activeSocialPlatform === "tiktok" ? TK_SUB_TAB_SLUGS : activeSocialPlatform === "threads" ? THREADS_SUB_TAB_SLUGS : activeSocialPlatform === "facebook" ? FB_SUB_TAB_SLUGS : SUB_TAB_SLUGS[activeTab];
      const subSlugVal = subSlugs?.[subTabId] || subTabId;
      navigate(`/platform/${mainSlugVal}/${activeSocialPlatform}/${subSlugVal}`, { replace: true });
    } else {
      const subSlugs = SUB_TAB_SLUGS[activeTab];
      const subSlugVal = subSlugs?.[subTabId] || subTabId;
      navigate(`/platform/${mainSlugVal}/${subSlugVal}`, { replace: true });
    }
  };

  const handleSocialPlatformChange = (platform: string) => {
    navigate(`/platform/social-media/${platform}`, { replace: true });
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
      case "social": return <SocialMediaHub subTab={activeSubTab} onSubTabChange={handleSubTabChange} urlPlatform={activeSocialPlatform} onPlatformChange={handleSocialPlatformChange} />;
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
            <span className="text-[28px] font-extrabold text-white tracking-tight" style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}>Uplyze</span>
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
              className="w-full px-4 py-3 rounded-xl relative overflow-hidden text-left cursor-pointer transition-colors duration-200 group/credits [transform:translateZ(0)] [backface-visibility:hidden]"
              style={{ background: "linear-gradient(135deg, hsl(217 91% 55% / 0.08), hsl(262 83% 58% / 0.05))", border: "1px solid hsl(217 91% 60% / 0.08)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(217 91% 60% / 0.18)"; e.currentTarget.style.background = "linear-gradient(135deg, hsl(217 91% 55% / 0.12), hsl(262 83% 58% / 0.08))"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(217 91% 60% / 0.08)"; e.currentTarget.style.background = "linear-gradient(135deg, hsl(217 91% 55% / 0.08), hsl(262 83% 58% / 0.05))"; }}
            >
              <Plus className="absolute top-2 right-2 h-3.5 w-3.5 text-white/30 group-hover/credits:text-white/50 transition-colors" />
              <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(217 91% 60%), transparent)" }} />
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Credits</p>
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
          <div className="flex items-center gap-3 h-10">
            <h1 className="text-sm font-semibold text-white/90 tracking-tight leading-10">
              {activeItem?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/15 group-focus-within:text-white/30 transition-colors z-10" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchFocused(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/20 hover:text-white/50">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search your platform..."
                className="h-10 w-[200px] focus:w-[280px] rounded-xl text-xs text-white placeholder:text-white/15 pl-9 pr-8 transition-all duration-300 outline-none"
                style={{
                  background: "hsl(222 47% 10% / 0.75)",
                  border: "1px solid hsl(215 25% 40% / 0.12)",
                }}
                onFocus={(e) => { setSearchFocused(true); e.target.style.borderColor = "hsl(217 91% 60% / 0.2)"; e.target.style.background = "hsl(222 47% 12% / 0.6)"; window.dispatchEvent(new CustomEvent('platform-search-focus', { detail: true })); }}
                onBlur={(e) => { setTimeout(() => setSearchFocused(false), 200); e.target.style.borderColor = "hsl(217 91% 60% / 0.06)"; e.target.style.background = "hsl(222 47% 10% / 0.5)"; window.dispatchEvent(new CustomEvent('platform-search-focus', { detail: false })); }}
              />
              {/* Search dropdown */}
              {searchFocused && filteredSearchResults.length > 0 && (
                <div className="absolute top-full mt-2 right-0 w-[380px] rounded-2xl overflow-hidden z-[100]"
                  style={{ background: "linear-gradient(180deg, hsl(222 50% 8% / 0.98), hsl(222 50% 6% / 0.99))", border: "1px solid hsl(217 91% 60% / 0.1)", backdropFilter: "blur(40px) saturate(1.8)", boxShadow: "0 25px 60px -15px hsl(222 50% 3% / 0.8), 0 0 0 1px hsl(217 91% 60% / 0.05) inset" }}>
                  {/* Search header */}
                  <div className="px-4 pt-3 pb-2 border-b border-white/[0.04]">
                    <p className="text-[10px] text-white/25 font-medium">{filteredSearchResults.length} result{filteredSearchResults.length !== 1 ? "s" : ""} for "<span className="text-white/50">{searchQuery}</span>"</p>
                  </div>
                  <div className="p-2 max-h-[420px] overflow-y-auto scrollbar-thin">
                    {(["tab", "subtab", "feature"] as const).map(type => {
                      const group = filteredSearchResults.filter(r => r.type === type);
                      if (group.length === 0) return null;
                      const typeLabel = type === "tab" ? "TABS" : type === "subtab" ? "SUB-TABS" : "FEATURES";
                      const typeColor = type === "tab" ? "hsl(217,91%,60%)" : type === "subtab" ? "hsl(262,83%,65%)" : "hsl(160,84%,50%)";
                      return (
                        <div key={type} className="mb-1">
                          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${typeColor}20, transparent)` }} />
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] flex-shrink-0" style={{ color: typeColor }}>{typeLabel}</p>
                            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${typeColor}20)` }} />
                          </div>
                          {group.map((item, i) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={`${type}-${i}`}
                                onMouseDown={(e) => { e.preventDefault(); navigate(item.path, { replace: true }); setSearchQuery(""); setSearchFocused(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group/item"
                                style={{ }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${typeColor}08`; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                                  style={{ background: `${typeColor}12`, border: `1px solid ${typeColor}15` }}>
                                  {Icon && <Icon className="h-3.5 w-3.5" style={{ color: typeColor }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-white/85 truncate group-hover/item:text-white transition-colors">{item.label}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {item.breadcrumb.slice(1).map((crumb, ci) => (
                                      <span key={ci} className="flex items-center gap-1 text-[9px] text-white/20">
                                        {ci > 0 && <ChevronRight className="h-2 w-2 text-white/10 flex-shrink-0" />}
                                        <span className="truncate">{crumb}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <ChevronRight className="h-3 w-3 text-white/10 group-hover/item:text-white/30 flex-shrink-0 transition-colors" />
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {searchFocused && searchQuery.trim() && filteredSearchResults.length === 0 && (
                <div className="absolute top-full mt-2 right-0 w-[280px] rounded-xl z-[100] shadow-2xl p-4 text-center"
                  style={{ background: "hsl(222 50% 7% / 0.98)", border: "1px solid hsl(217 91% 60% / 0.12)", backdropFilter: "blur(24px)" }}>
                  <p className="text-[11px] text-white/30">No results for "{searchQuery}"</p>
                </div>
              )}
            </div>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
              <Bell className="h-4 w-4" />
            </button>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all">
              <HelpCircle className="h-4 w-4" />
            </button>
            <div className="border-l border-white/[0.06] pl-2 ml-1 flex items-center gap-1.5">
              <Link to="/profile">
                <button
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105"
                  title={`@${profile?.username || 'profile'}`}
                  style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}
                >
                  {userInitial}
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
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

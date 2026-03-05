import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Megaphone, Building2, Users, TrendingUp, DollarSign, BarChart3,
  Plus, Edit3, Trash2, CheckCircle2, AlertCircle, Loader2, Eye,
  Heart, Share2, MessageSquare, Calendar, Target, Tag, Link2,
  Globe, ShieldCheck, Sparkles, ArrowRight, Handshake, Award,
  FileText, Clock, Zap, Copy, ExternalLink, Filter, Star,
  PieChart, Activity, Layers, Search, Download, Settings,
  UserPlus, Briefcase, Crown, TrendingDown, Package,
  CircleDollarSign, SquareStack, ListChecks, Receipt, Percent,
  LayoutDashboard, FileBarChart, Bookmark, Send, Scale,
  Flame, AlertTriangle, History, Timer, Video,
} from "lucide-react";

interface Props {
  selectedAccount: string;
  callApi: (action: string, params?: any) => Promise<any>;
  loading: boolean;
}

interface Campaign {
  id: string;
  name: string;
  brand_name: string;
  status: string;
  campaign_type: string;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  posts: number;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
  disclosure_type: string;
  notes: string;
  deliverables: string[];
  roi: number;
  cpm: number;
}

interface BrandPartner {
  id: string;
  brand_name: string;
  contact_email: string;
  contact_name: string;
  industry: string;
  status: string;
  total_campaigns: number;
  total_revenue: number;
  last_collaboration: string;
  notes: string;
  tier: string;
}

interface Deliverable {
  id: string;
  campaign_id: string;
  title: string;
  type: string;
  status: string;
  due_date: string;
  posted_at: string | null;
  platform_post_id: string | null;
  engagement: any;
  notes: string;
}

const TKCommercialContent = ({ selectedAccount, callApi, loading }: Props) => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brandPartners, setBrandPartners] = useState<BrandPartner[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  // Campaign form
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "", brand_name: "", campaign_type: "sponsored", budget: 0,
    start_date: "", end_date: "", disclosure_type: "branded_content", notes: "",
  });

  // Brand form
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ brand_name: "", contact_email: "", contact_name: "", industry: "", tier: "standard", notes: "" });

  // Deliverable form
  const [showNewDeliverable, setShowNewDeliverable] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({ campaign_id: "", title: "", type: "video", due_date: "", notes: "" });

  // Filters
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  // Compliance state
  const [complianceChecks, setComplianceChecks] = useState<any[]>([]);
  const [autoDisclose, setAutoDisclose] = useState(true);
  const [autoLabel, setAutoLabel] = useState(true);
  const [musicConfirmation, setMusicConfirmation] = useState(true);

  // AI features
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  // Invoice / payment tracking
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ campaign_id: "", amount: 0, status: "pending", notes: "" });

  // ═══════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════

  const loadCampaigns = useCallback(async () => {
    if (!selectedAccount) return;
    setCampaignsLoading(true);
    const { data } = await supabase.from("ad_campaigns").select("*").eq("user_id", selectedAccount).eq("platform", "tiktok").order("created_at", { ascending: false });
    if (data) {
      setCampaigns(data.map(c => {
        const meta = c.metadata as any || {};
        const imp = c.impressions || 0;
        const spent = c.spend || 0;
        return {
          id: c.id, name: c.name, brand_name: meta.brand_name || c.target_audience || "—",
          status: c.status, campaign_type: meta.campaign_type || "sponsored",
          budget: c.lifetime_budget || c.daily_budget || 0, spent,
          start_date: c.start_date || "", end_date: c.end_date || "",
          posts: meta.posts || 0, impressions: imp, engagement: c.clicks || 0,
          clicks: c.clicks || 0, conversions: meta.conversions || 0,
          disclosure_type: meta.disclosure_type || "branded_content",
          notes: meta.notes || "", deliverables: meta.deliverables || [],
          roi: spent > 0 && meta.revenue ? ((meta.revenue - spent) / spent * 100) : 0,
          cpm: imp > 0 ? (spent / imp * 1000) : 0,
        };
      }));
    }
    setCampaignsLoading(false);
  }, [selectedAccount]);

  const loadBrandPartners = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("account_activities").select("*").eq("account_id", selectedAccount).eq("activity_type", "brand_partner").order("created_at", { ascending: false });
    if (data) {
      setBrandPartners(data.map(d => {
        const meta = d.metadata as any || {};
        return {
          id: d.id, brand_name: meta.brand_name || d.description,
          contact_email: meta.contact_email || "", contact_name: meta.contact_name || "",
          industry: meta.industry || "", status: meta.status || "active",
          total_campaigns: meta.total_campaigns || 0, total_revenue: meta.total_revenue || 0,
          last_collaboration: d.created_at, notes: meta.notes || "", tier: meta.tier || "standard",
        };
      }));
    }
  }, [selectedAccount]);

  const loadDeliverables = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("account_activities").select("*").eq("account_id", selectedAccount).eq("activity_type", "campaign_deliverable").order("created_at", { ascending: false });
    if (data) {
      setDeliverables(data.map(d => {
        const meta = d.metadata as any || {};
        return {
          id: d.id, campaign_id: meta.campaign_id || "", title: d.description || "",
          type: meta.type || "video", status: meta.status || "pending",
          due_date: meta.due_date || "", posted_at: meta.posted_at || null,
          platform_post_id: meta.platform_post_id || null, engagement: meta.engagement || {},
          notes: meta.notes || "",
        };
      }));
    }
  }, [selectedAccount]);

  const loadInvoices = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("account_activities").select("*").eq("account_id", selectedAccount).eq("activity_type", "campaign_invoice").order("created_at", { ascending: false });
    if (data) setInvoices(data);
  }, [selectedAccount]);

  const loadComplianceChecks = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase.from("account_activities").select("*").eq("account_id", selectedAccount).eq("activity_type", "compliance_check").order("created_at", { ascending: false }).limit(20);
    if (data) setComplianceChecks(data);
  }, [selectedAccount]);

  useEffect(() => {
    loadCampaigns(); loadBrandPartners(); loadDeliverables(); loadInvoices(); loadComplianceChecks();
  }, [loadCampaigns, loadBrandPartners, loadDeliverables, loadInvoices, loadComplianceChecks]);

  // ═══════════════════════════════════════════════════
  // CAMPAIGN CRUD
  // ═══════════════════════════════════════════════════
  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.brand_name) { toast.error("Name and brand required"); return; }
    const { error } = await supabase.from("ad_campaigns").insert({
      user_id: selectedAccount, platform: "tiktok", name: newCampaign.name, status: "draft",
      target_audience: newCampaign.brand_name, lifetime_budget: newCampaign.budget,
      start_date: newCampaign.start_date || null, end_date: newCampaign.end_date || null,
      metadata: { brand_name: newCampaign.brand_name, campaign_type: newCampaign.campaign_type, disclosure_type: newCampaign.disclosure_type, notes: newCampaign.notes, posts: 0, conversions: 0, deliverables: [], revenue: 0 },
    });
    if (error) toast.error(error.message);
    else { toast.success("Campaign created"); setShowNewCampaign(false); setNewCampaign({ name: "", brand_name: "", campaign_type: "sponsored", budget: 0, start_date: "", end_date: "", disclosure_type: "branded_content", notes: "" }); loadCampaigns(); }
  };

  const updateCampaignStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("ad_campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Campaign ${status}`); loadCampaigns(); }
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadCampaigns(); }
  };

  const duplicateCampaign = async (c: Campaign) => {
    const { error } = await supabase.from("ad_campaigns").insert({
      user_id: selectedAccount, platform: "tiktok", name: `${c.name} (Copy)`, status: "draft",
      target_audience: c.brand_name, lifetime_budget: c.budget,
      metadata: { brand_name: c.brand_name, campaign_type: c.campaign_type, disclosure_type: c.disclosure_type, notes: c.notes, posts: 0, conversions: 0, deliverables: [], revenue: 0 },
    });
    if (error) toast.error(error.message); else { toast.success("Campaign duplicated"); loadCampaigns(); }
  };

  // ═══════════════════════════════════════════════════
  // BRAND PARTNER CRUD
  // ═══════════════════════════════════════════════════
  const addBrandPartner = async () => {
    if (!newBrand.brand_name) { toast.error("Brand name required"); return; }
    const { error } = await supabase.from("account_activities").insert({
      account_id: selectedAccount, activity_type: "brand_partner", description: newBrand.brand_name,
      metadata: { brand_name: newBrand.brand_name, contact_email: newBrand.contact_email, contact_name: newBrand.contact_name, industry: newBrand.industry, status: "active", tier: newBrand.tier, total_campaigns: 0, total_revenue: 0, notes: newBrand.notes },
    });
    if (error) toast.error(error.message);
    else { toast.success("Brand partner added"); setShowNewBrand(false); setNewBrand({ brand_name: "", contact_email: "", contact_name: "", industry: "", tier: "standard", notes: "" }); loadBrandPartners(); }
  };

  const updateBrandStatus = async (id: string, status: string) => {
    const existing = brandPartners.find(b => b.id === id);
    if (!existing) return;
    const { error } = await supabase.from("account_activities").update({
      metadata: { ...existing, status },
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Partner ${status}`); loadBrandPartners(); }
  };

  // ═══════════════════════════════════════════════════
  // DELIVERABLE CRUD
  // ═══════════════════════════════════════════════════
  const addDeliverable = async () => {
    if (!newDeliverable.title || !newDeliverable.campaign_id) { toast.error("Title and campaign required"); return; }
    const { error } = await supabase.from("account_activities").insert({
      account_id: selectedAccount, activity_type: "campaign_deliverable", description: newDeliverable.title,
      metadata: { campaign_id: newDeliverable.campaign_id, type: newDeliverable.type, status: "pending", due_date: newDeliverable.due_date, notes: newDeliverable.notes },
    });
    if (error) toast.error(error.message);
    else { toast.success("Deliverable added"); setShowNewDeliverable(false); setNewDeliverable({ campaign_id: "", title: "", type: "video", due_date: "", notes: "" }); loadDeliverables(); }
  };

  const updateDeliverableStatus = async (id: string, status: string) => {
    const existing = deliverables.find(d => d.id === id);
    if (!existing) return;
    await supabase.from("account_activities").update({
      metadata: { ...existing, status, ...(status === "completed" ? { posted_at: new Date().toISOString() } : {}) },
    }).eq("id", id);
    toast.success(`Deliverable ${status}`);
    loadDeliverables();
  };

  // ═══════════════════════════════════════════════════
  // INVOICE CRUD
  // ═══════════════════════════════════════════════════
  const createInvoice = async () => {
    if (!newInvoice.campaign_id || !newInvoice.amount) { toast.error("Campaign and amount required"); return; }
    const campaign = campaigns.find(c => c.id === newInvoice.campaign_id);
    const { error } = await supabase.from("account_activities").insert({
      account_id: selectedAccount, activity_type: "campaign_invoice",
      description: `Invoice: $${newInvoice.amount} for ${campaign?.name || "Campaign"}`,
      metadata: { campaign_id: newInvoice.campaign_id, amount: newInvoice.amount, status: newInvoice.status, notes: newInvoice.notes, campaign_name: campaign?.name },
    });
    if (error) toast.error(error.message);
    else { toast.success("Invoice created"); setShowNewInvoice(false); setNewInvoice({ campaign_id: "", amount: 0, status: "pending", notes: "" }); loadInvoices(); }
  };

  // ═══════════════════════════════════════════════════
  // COMPLIANCE CHECK
  // ═══════════════════════════════════════════════════
  const runComplianceCheck = async () => {
    const issues: string[] = [];
    campaigns.filter(c => c.status === "active").forEach(c => {
      if (!c.disclosure_type) issues.push(`${c.name}: Missing disclosure type`);
      if (c.disclosure_type === "branded_content" && c.notes?.toLowerCase().includes("private")) issues.push(`${c.name}: Branded content cannot be private`);
      if (!c.brand_name || c.brand_name === "—") issues.push(`${c.name}: Missing brand name`);
    });
    const result = { checked_at: new Date().toISOString(), campaigns_checked: campaigns.filter(c => c.status === "active").length, issues, all_clear: issues.length === 0 };
    await supabase.from("account_activities").insert({
      account_id: selectedAccount, activity_type: "compliance_check",
      description: `Compliance check: ${issues.length === 0 ? "All clear" : `${issues.length} issues found`}`,
      metadata: result,
    });
    toast.success(issues.length === 0 ? "All campaigns compliant ✓" : `${issues.length} compliance issues found`);
    loadComplianceChecks();
  };

  // ═══════════════════════════════════════════════════
  // AI CAMPAIGN SUGGESTIONS
  // ═══════════════════════════════════════════════════
  const generateCampaignSuggestion = async () => {
    setAiSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_caption", account_id: selectedAccount, params: { topic: "brand collaboration pitch for TikTok creator campaign", platform: "tiktok", include_cta: true, style: "professional" } },
      });
      if (error) throw error;
      if (data?.success && data.data?.caption) setAiSuggestion(data.data.caption);
    } catch (e: any) { toast.error(e.message); }
    setAiSuggesting(false);
  };

  // ═══════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════
  const exportCampaignReport = () => {
    const report = { exported_at: new Date().toISOString(), campaigns, brand_partners: brandPartners, deliverables, invoices: invoices.map(i => i.metadata), summary: { total_campaigns: campaigns.length, active: campaigns.filter(c => c.status === "active").length, total_budget: campaigns.reduce((s, c) => s + c.budget, 0), total_spent: campaigns.reduce((s, c) => s + c.spent, 0), total_partners: brandPartners.length, total_deliverables: deliverables.length } };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `commercial-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Campaign report exported");
  };

  // Stats
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
  const avgCPM = totalImpressions > 0 ? (totalSpent / totalImpressions * 1000).toFixed(2) : "0";
  const totalRevenue = brandPartners.reduce((s, b) => s + b.total_revenue, 0);
  const pendingDeliverables = deliverables.filter(d => d.status === "pending").length;
  const totalInvoiceAmount = invoices.reduce((s, i) => s + ((i.metadata as any)?.amount || 0), 0);
  const paidInvoices = invoices.filter(i => (i.metadata as any)?.status === "paid").length;

  const filteredCampaigns = campaigns.filter(c => campaignFilter === "all" || c.status === campaignFilter);
  const filteredBrands = brandPartners.filter(b => !brandSearch || b.brand_name.toLowerCase().includes(brandSearch.toLowerCase()));

  const statusColor = (s: string) => {
    const map: Record<string, string> = { active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", draft: "bg-amber-500/15 text-amber-400 border-amber-500/30", completed: "bg-blue-500/15 text-blue-400 border-blue-500/30", paused: "bg-red-500/15 text-red-400 border-red-500/30", pending: "bg-amber-500/15 text-amber-400 border-amber-500/30", declined: "bg-red-500/15 text-red-400 border-red-500/30", paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", overdue: "bg-red-500/15 text-red-400 border-red-500/30" };
    return map[s] || "bg-white/10 text-muted-foreground border-white/10";
  };

  const tierColor = (t: string) => {
    const map: Record<string, string> = { gold: "bg-amber-500/15 text-amber-400", platinum: "bg-purple-500/15 text-purple-400", standard: "bg-white/10 text-muted-foreground" };
    return map[t] || "bg-white/10 text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-orange-400" />
            Commercial Content Hub
            <Badge className="bg-orange-500/15 text-orange-400 text-[9px]">API Approved</Badge>
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manage brand partnerships, sponsorships, deliverables, invoicing, and compliance</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={exportCampaignReport} className="text-foreground text-xs">
            <Download className="h-3 w-3 mr-1" /> Export Report
          </Button>
          <Button size="sm" variant="outline" onClick={runComplianceCheck} className="text-foreground text-xs">
            <ShieldCheck className="h-3 w-3 mr-1" /> Run Check
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-lg gap-0.5 flex flex-wrap">
          {[
            { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
            { v: "campaigns", icon: Megaphone, l: "Campaigns" },
            { v: "brands", icon: Building2, l: "Brands" },
            { v: "deliverables", icon: ListChecks, l: "Deliverables" },
            { v: "invoices", icon: Receipt, l: "Invoices" },
            { v: "compliance", icon: ShieldCheck, l: "Compliance" },
            { v: "ai-tools", icon: Sparkles, l: "AI Tools" },
            { v: "analytics", icon: BarChart3, l: "Analytics" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5">
              <t.icon className="h-3.5 w-3.5" />{t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ DASHBOARD ═══ */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Campaigns", value: activeCampaigns.toString(), icon: Megaphone, color: "text-orange-400", bg: "bg-orange-500/10" },
              { label: "Total Budget", value: `$${totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Brand Partners", value: brandPartners.length.toString(), icon: Handshake, color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Pending Deliverables", value: pendingDeliverables.toString(), icon: ListChecks, color: "text-amber-400", bg: "bg-amber-500/10" },
            ].map(kpi => (
              <Card key={kpi.label} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-muted-foreground">{kpi.label}</span><div className={`p-1 rounded ${kpi.bg}`}><kpi.icon className={`h-3 w-3 ${kpi.color}`} /></div></div>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
              { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: CircleDollarSign, color: "text-emerald-400" },
              { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-cyan-400" },
              { label: "Conversions", value: totalConversions.toString(), icon: Target, color: "text-pink-400" },
            ].map(kpi => (
              <Card key={kpi.label} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1"><kpi.icon className={`h-3 w-3 ${kpi.color}`} /><span className="text-[10px] text-muted-foreground">{kpi.label}</span></div>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <h4 className="text-xs font-bold text-foreground mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button size="sm" variant="outline" onClick={() => { setActiveSection("campaigns"); setShowNewCampaign(true); }} className="text-xs text-foreground"><Plus className="h-3 w-3 mr-1" /> New Campaign</Button>
                <Button size="sm" variant="outline" onClick={() => { setActiveSection("brands"); setShowNewBrand(true); }} className="text-xs text-foreground"><UserPlus className="h-3 w-3 mr-1" /> Add Brand</Button>
                <Button size="sm" variant="outline" onClick={() => { setActiveSection("deliverables"); setShowNewDeliverable(true); }} className="text-xs text-foreground"><ListChecks className="h-3 w-3 mr-1" /> Add Deliverable</Button>
                <Button size="sm" variant="outline" onClick={() => { setActiveSection("invoices"); setShowNewInvoice(true); }} className="text-xs text-foreground"><Receipt className="h-3 w-3 mr-1" /> New Invoice</Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-3"><History className="h-3.5 w-3.5 text-muted-foreground" /> Recent Campaign Activity</h4>
              <div className="space-y-1.5">
                {campaigns.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3 w-3 text-orange-400" />
                      <span className="text-[11px] text-foreground">{c.name}</span>
                      <Badge variant="outline" className={`text-[8px] ${statusColor(c.status)}`}>{c.status}</Badge>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{c.brand_name}</span>
                  </div>
                ))}
                {campaigns.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">No campaigns yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ CAMPAIGNS ═══ */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5">
              {["all", "draft", "active", "paused", "completed"].map(f => (
                <Button key={f} size="sm" variant={campaignFilter === f ? "default" : "ghost"} onClick={() => setCampaignFilter(f)} className="text-[10px] h-6 px-2 capitalize">{f}</Button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowNewCampaign(!showNewCampaign)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs"><Plus className="h-3 w-3 mr-1" /> New Campaign</Button>
          </div>

          {showNewCampaign && (
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Create Campaign</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Campaign Name *</label><Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} placeholder="Summer Collection Launch" className="h-8 text-xs bg-white/[0.05]" /></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Brand Name *</label><Input value={newCampaign.brand_name} onChange={e => setNewCampaign(p => ({ ...p, brand_name: e.target.value }))} placeholder="Nike, Adidas..." className="h-8 text-xs bg-white/[0.05]" /></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                    <Select value={newCampaign.campaign_type} onValueChange={v => setNewCampaign(p => ({ ...p, campaign_type: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sponsored">Sponsored</SelectItem><SelectItem value="branded">Branded Content</SelectItem><SelectItem value="affiliate">Affiliate</SelectItem><SelectItem value="organic_promo">Organic Promotion</SelectItem></SelectContent></Select></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Disclosure</label>
                    <Select value={newCampaign.disclosure_type} onValueChange={v => setNewCampaign(p => ({ ...p, disclosure_type: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="branded_content">Branded Content</SelectItem><SelectItem value="paid_partnership">Paid Partnership</SelectItem><SelectItem value="sponsored">Sponsored</SelectItem><SelectItem value="ad">Advertisement</SelectItem></SelectContent></Select></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Budget ($)</label><Input type="number" value={newCampaign.budget || ""} onChange={e => setNewCampaign(p => ({ ...p, budget: parseInt(e.target.value) || 0 }))} className="h-8 text-xs bg-white/[0.05]" /></div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-muted-foreground mb-1 block">Start</label><Input type="date" value={newCampaign.start_date} onChange={e => setNewCampaign(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-xs bg-white/[0.05]" /></div><div><label className="text-[10px] text-muted-foreground mb-1 block">End</label><Input type="date" value={newCampaign.end_date} onChange={e => setNewCampaign(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-xs bg-white/[0.05]" /></div></div>
                </div>
                <Textarea value={newCampaign.notes} onChange={e => setNewCampaign(p => ({ ...p, notes: e.target.value }))} placeholder="Campaign notes, deliverables..." className="text-xs bg-white/[0.05] min-h-[60px]" />
                <div className="flex gap-2"><Button size="sm" onClick={createCampaign} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">Create</Button><Button size="sm" variant="ghost" onClick={() => setShowNewCampaign(false)} className="text-xs">Cancel</Button></div>
              </CardContent>
            </Card>
          )}

          <ScrollArea className="h-[450px]">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12"><Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No campaigns found</p></div>
            ) : (
              <div className="space-y-2">
                {filteredCampaigns.map(c => {
                  const budgetPct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
                  const campaignDeliverables = deliverables.filter(d => d.campaign_id === c.id);
                  return (
                    <Card key={c.id} className={`bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] transition-colors ${selectedCampaign === c.id ? "ring-1 ring-orange-500/30" : ""}`} onClick={() => setSelectedCampaign(selectedCampaign === c.id ? null : c.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2"><p className="text-sm font-semibold text-foreground">{c.name}</p><Badge variant="outline" className={`text-[9px] ${statusColor(c.status)}`}>{c.status}</Badge></div>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5"><Building2 className="h-3 w-3" /> {c.brand_name} <span className="text-white/10">·</span> <Tag className="h-3 w-3" /> {c.disclosure_type.replace("_", " ")}</p>
                          </div>
                          <div className="flex gap-1">
                            {c.status === "draft" && <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); updateCampaignStatus(c.id, "active"); }} className="h-7 text-[10px] text-emerald-400">Activate</Button>}
                            {c.status === "active" && <><Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); updateCampaignStatus(c.id, "paused"); }} className="h-7 text-[10px] text-amber-400">Pause</Button><Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); updateCampaignStatus(c.id, "completed"); }} className="h-7 text-[10px] text-blue-400">Complete</Button></>}
                            {c.status === "paused" && <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); updateCampaignStatus(c.id, "active"); }} className="h-7 text-[10px] text-emerald-400">Resume</Button>}
                            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); duplicateCampaign(c); }} className="h-7 text-[10px]"><Copy className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteCampaign(c.id); }} className="h-7 text-[10px] text-red-400"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          <div><p className="text-[9px] text-muted-foreground">Budget</p><p className="text-xs font-bold text-foreground">${c.budget.toLocaleString()}</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Spent</p><p className="text-xs font-bold text-foreground">${c.spent.toLocaleString()}</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Impressions</p><p className="text-xs font-bold text-foreground">{c.impressions.toLocaleString()}</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Clicks</p><p className="text-xs font-bold text-foreground">{c.clicks.toLocaleString()}</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Deliverables</p><p className="text-xs font-bold text-foreground">{campaignDeliverables.length}</p></div>
                        </div>
                        <Progress value={Math.min(budgetPct, 100)} className="h-1 mt-2" />
                        {c.start_date && <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(c.start_date).toLocaleDateString()} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : "Ongoing"}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ═══ BRANDS ═══ */}
        <TabsContent value="brands" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} placeholder="Search brands..." className="h-7 w-48 text-xs bg-white/[0.03]" />
            <Button size="sm" onClick={() => setShowNewBrand(!showNewBrand)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs"><Plus className="h-3 w-3 mr-1" /> Add Brand</Button>
          </div>

          {showNewBrand && (
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Add Brand Partner</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={newBrand.brand_name} onChange={e => setNewBrand(p => ({ ...p, brand_name: e.target.value }))} placeholder="Brand name *" className="h-8 text-xs bg-white/[0.05]" />
                  <Input value={newBrand.contact_name} onChange={e => setNewBrand(p => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" className="h-8 text-xs bg-white/[0.05]" />
                  <Input value={newBrand.contact_email} onChange={e => setNewBrand(p => ({ ...p, contact_email: e.target.value }))} placeholder="Contact email" className="h-8 text-xs bg-white/[0.05]" />
                  <Input value={newBrand.industry} onChange={e => setNewBrand(p => ({ ...p, industry: e.target.value }))} placeholder="Industry" className="h-8 text-xs bg-white/[0.05]" />
                  <Select value={newBrand.tier} onValueChange={v => setNewBrand(p => ({ ...p, tier: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="gold">Gold</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent></Select>
                  <Textarea value={newBrand.notes} onChange={e => setNewBrand(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." className="text-xs bg-white/[0.05] min-h-[32px]" />
                </div>
                <div className="flex gap-2"><Button size="sm" onClick={addBrandPartner} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">Add</Button><Button size="sm" variant="ghost" onClick={() => setShowNewBrand(false)} className="text-xs">Cancel</Button></div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredBrands.length === 0 ? (
              <div className="col-span-2 text-center py-12"><Handshake className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No brand partners</p></div>
            ) : filteredBrands.map(b => (
              <Card key={b.id} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center"><Building2 className="h-5 w-5 text-purple-400" /></div>
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">{b.brand_name} {b.tier !== "standard" && <Badge className={`text-[8px] ${tierColor(b.tier)}`}>{b.tier}</Badge>}</p>
                        <p className="text-[10px] text-muted-foreground">{b.industry || "General"}{b.contact_name ? ` · ${b.contact_name}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[9px] ${statusColor(b.status)}`}>{b.status}</Badge>
                      {b.status === "active" && <Button size="sm" variant="ghost" onClick={() => updateBrandStatus(b.id, "completed")} className="h-6 text-[9px]">Archive</Button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div><p className="text-[9px] text-muted-foreground">Campaigns</p><p className="text-xs font-bold text-foreground">{b.total_campaigns}</p></div>
                    <div><p className="text-[9px] text-muted-foreground">Revenue</p><p className="text-xs font-bold text-foreground">${b.total_revenue.toLocaleString()}</p></div>
                    <div><p className="text-[9px] text-muted-foreground">Since</p><p className="text-xs font-bold text-foreground">{new Date(b.last_collaboration).toLocaleDateString()}</p></div>
                  </div>
                  {b.contact_email && <p className="text-[9px] text-muted-foreground mt-2 flex items-center gap-1"><Link2 className="h-3 w-3" /> {b.contact_email}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ DELIVERABLES ═══ */}
        <TabsContent value="deliverables" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 text-amber-400" /> Campaign Deliverables</h4>
            <Button size="sm" onClick={() => setShowNewDeliverable(!showNewDeliverable)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs"><Plus className="h-3 w-3 mr-1" /> Add</Button>
          </div>

          {showNewDeliverable && (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Campaign *</label>
                    <Select value={newDeliverable.campaign_id} onValueChange={v => setNewDeliverable(p => ({ ...p, campaign_id: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue placeholder="Select campaign" /></SelectTrigger><SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Title *</label><Input value={newDeliverable.title} onChange={e => setNewDeliverable(p => ({ ...p, title: e.target.value }))} placeholder="Unboxing video" className="h-8 text-xs bg-white/[0.05]" /></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                    <Select value={newDeliverable.type} onValueChange={v => setNewDeliverable(p => ({ ...p, type: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="video">Video</SelectItem><SelectItem value="photo">Photo</SelectItem><SelectItem value="carousel">Carousel</SelectItem><SelectItem value="story">Story</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent></Select></div>
                  <div><label className="text-[10px] text-muted-foreground mb-1 block">Due Date</label><Input type="date" value={newDeliverable.due_date} onChange={e => setNewDeliverable(p => ({ ...p, due_date: e.target.value }))} className="h-8 text-xs bg-white/[0.05]" /></div>
                </div>
                <div className="flex gap-2"><Button size="sm" onClick={addDeliverable} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">Add</Button><Button size="sm" variant="ghost" onClick={() => setShowNewDeliverable(false)} className="text-xs">Cancel</Button></div>
              </CardContent>
            </Card>
          )}

          {deliverables.length === 0 ? (
            <div className="text-center py-12"><ListChecks className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No deliverables yet</p></div>
          ) : (
            <div className="space-y-2">
              {deliverables.map(d => {
                const campaign = campaigns.find(c => c.id === d.campaign_id);
                const isOverdue = d.due_date && new Date(d.due_date) < new Date() && d.status !== "completed";
                return (
                  <Card key={d.id} className={`bg-white/[0.03] border-white/[0.06] ${isOverdue ? "border-red-500/20" : ""}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${d.status === "completed" ? "bg-emerald-500/10" : isOverdue ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                          {d.type === "video" ? <Video className={`h-4 w-4 ${d.status === "completed" ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-amber-400"}`} /> : <Layers className={`h-4 w-4 ${d.status === "completed" ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-amber-400"}`} />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{d.title}</p>
                          <p className="text-[10px] text-muted-foreground">{campaign?.name || "—"} · {d.type} {d.due_date && `· Due ${new Date(d.due_date).toLocaleDateString()}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && <Badge variant="outline" className="text-[8px] bg-red-500/15 text-red-400 border-red-500/30">Overdue</Badge>}
                        <Badge variant="outline" className={`text-[9px] ${statusColor(d.status)}`}>{d.status}</Badge>
                        {d.status === "pending" && <Button size="sm" variant="ghost" onClick={() => updateDeliverableStatus(d.id, "in_progress")} className="h-6 text-[9px] text-blue-400">Start</Button>}
                        {d.status === "in_progress" && <Button size="sm" variant="ghost" onClick={() => updateDeliverableStatus(d.id, "completed")} className="h-6 text-[9px] text-emerald-400">Complete</Button>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ INVOICES ═══ */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-emerald-400" /> Invoice Tracker</h4>
              <p className="text-[10px] text-muted-foreground">${totalInvoiceAmount.toLocaleString()} total · {paidInvoices}/{invoices.length} paid</p>
            </div>
            <Button size="sm" onClick={() => setShowNewInvoice(!showNewInvoice)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><Plus className="h-3 w-3 mr-1" /> New Invoice</Button>
          </div>

          {showNewInvoice && (
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={newInvoice.campaign_id} onValueChange={v => setNewInvoice(p => ({ ...p, campaign_id: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue placeholder="Select campaign *" /></SelectTrigger><SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                  <Input type="number" value={newInvoice.amount || ""} onChange={e => setNewInvoice(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} placeholder="Amount ($) *" className="h-8 text-xs bg-white/[0.05]" />
                  <Select value={newInvoice.status} onValueChange={v => setNewInvoice(p => ({ ...p, status: v }))}><SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent></Select>
                </div>
                <div className="flex gap-2"><Button size="sm" onClick={createInvoice} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Create</Button><Button size="sm" variant="ghost" onClick={() => setShowNewInvoice(false)} className="text-xs">Cancel</Button></div>
              </CardContent>
            </Card>
          )}

          {invoices.length === 0 ? (
            <div className="text-center py-12"><Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No invoices yet</p></div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => {
                const meta = inv.metadata as any || {};
                return (
                  <Card key={inv.id} className="bg-white/[0.03] border-white/[0.06]">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${meta.status === "paid" ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                          <Receipt className={`h-4 w-4 ${meta.status === "paid" ? "text-emerald-400" : "text-amber-400"}`} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{inv.description}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()} · {meta.campaign_name || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">${(meta.amount || 0).toLocaleString()}</span>
                        <Badge variant="outline" className={`text-[9px] ${statusColor(meta.status)}`}>{meta.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ COMPLIANCE ═══ */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-orange-400" /> Commercial Compliance</h4>
            <Button size="sm" variant="outline" onClick={runComplianceCheck} className="text-xs text-foreground"><ShieldCheck className="h-3 w-3 mr-1" /> Run Check</Button>
          </div>

          {/* Auto-compliance toggles */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Automation Settings</h4>
              <div className="space-y-2">
                {[
                  { label: "Auto-disclose branded content", desc: "Automatically add disclosure tags to sponsored posts", checked: autoDisclose, onChange: setAutoDisclose },
                  { label: "Auto-label partnerships", desc: "Auto-apply TikTok branded content labels via API", checked: autoLabel, onChange: setAutoLabel },
                  { label: "Music usage confirmation", desc: "Require music rights confirmation before publishing", checked: musicConfirmation, onChange: setMusicConfirmation },
                ].map(toggle => (
                  <div key={toggle.label} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <div><p className="text-xs text-foreground">{toggle.label}</p><p className="text-[10px] text-muted-foreground">{toggle.desc}</p></div>
                    <Switch checked={toggle.checked} onCheckedChange={toggle.onChange} className="scale-75" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance requirements */}
          <Card className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-500/20">
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Branded Content Labeling", desc: "Automatic tag on all sponsored posts via TikTok API" },
                { label: "Paid Partnership Disclosure", desc: "FTC guidelines compliance for paid partnerships" },
                { label: "Content Disclosure Toggle", desc: "Creators must declare if content promotes a brand" },
                { label: "Music Usage Confirmation", desc: "Commercial music usage rights acknowledgment" },
                { label: "Privacy-Branded Conflict Guard", desc: "Branded content can't be set to private" },
                { label: "Campaign Audit Trail", desc: "All campaigns logged for regulatory compliance" },
                { label: "Attribution Enforcement", desc: "'Posted via Uplyze' on all published content" },
                { label: "Deliverable Tracking", desc: "Full lifecycle tracking for all campaign deliverables" },
                { label: "Invoice Documentation", desc: "Payment tracking for tax and compliance reporting" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div><p className="text-xs font-medium text-foreground">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Compliance check history */}
          {complianceChecks.length > 0 && (
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-foreground mb-3">Check History</h4>
                <div className="space-y-1.5">
                  {complianceChecks.map(c => {
                    const meta = c.metadata as any || {};
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          {meta.all_clear ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                          <span className="text-[11px] text-foreground">{c.description}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-blue-400" /> Compliance Resources</h4>
              {[
                { label: "TikTok Branded Content Policy", url: "https://www.tiktok.com/legal/page/global/bc-policy" },
                { label: "FTC Endorsement Guidelines", url: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides" },
                { label: "TikTok Commercial Content Guidelines", url: "https://www.tiktok.com/community-guidelines" },
              ].map(r => (
                <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <ExternalLink className="h-3 w-3 text-blue-400" /><span className="text-xs text-foreground">{r.label}</span>
                </a>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ AI TOOLS ═══ */}
        <TabsContent value="ai-tools" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" /> AI Campaign Assistant</h4>
              <p className="text-[10px] text-muted-foreground">Generate brand collaboration pitches, campaign briefs, and content strategies.</p>
              <Button size="sm" onClick={generateCampaignSuggestion} disabled={aiSuggesting} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                {aiSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />} Generate Campaign Pitch
              </Button>
              {aiSuggestion && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiSuggestion}</p>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(aiSuggestion); toast.success("Copied"); }} className="text-[10px] mt-2"><Copy className="h-3 w-3 mr-1" /> Copy</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Brand Pitch Generator", desc: "Create professional pitch decks for brand outreach", icon: Briefcase },
              { label: "Campaign Brief Writer", desc: "Auto-generate campaign briefs from requirements", icon: FileText },
              { label: "Content Strategy Planner", desc: "AI-powered content strategy recommendations", icon: Target },
              { label: "ROI Forecaster", desc: "Predict campaign ROI based on historical data", icon: TrendingUp },
              { label: "Hashtag Strategy", desc: "Optimize hashtags for sponsored content reach", icon: Tag },
              { label: "Compliance Checker", desc: "AI-audit content for disclosure compliance", icon: ShieldCheck },
            ].map(tool => (
              <Card key={tool.label} className="bg-white/[0.03] border-white/[0.06] hover:border-purple-500/20 transition-colors cursor-pointer" onClick={generateCampaignSuggestion}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10"><tool.icon className="h-4 w-4 text-purple-400" /></div>
                  <div><p className="text-xs font-medium text-foreground">{tool.label}</p><p className="text-[10px] text-muted-foreground">{tool.desc}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ ANALYTICS ═══ */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Campaigns", value: campaigns.length.toString(), icon: Megaphone, color: "text-orange-400" },
              { label: "Avg CTR", value: `${avgCTR}%`, icon: Target, color: "text-amber-400" },
              { label: "Avg CPM", value: `$${avgCPM}`, icon: DollarSign, color: "text-emerald-400" },
              { label: "Conversions", value: totalConversions.toString(), icon: Zap, color: "text-purple-400" },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1"><s.icon className={`h-3 w-3 ${s.color}`} /><span className="text-[10px] text-muted-foreground">{s.label}</span></div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-orange-400" /> Campaign Breakdown</h4>
              {campaigns.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-8">Create campaigns to see analytics</p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map(c => {
                    const budgetPct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
                    return (
                      <div key={c.id} className="space-y-1.5 p-2 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center justify-between"><p className="text-xs text-foreground font-medium">{c.name}</p><Badge variant="outline" className={`text-[9px] ${statusColor(c.status)}`}>{c.status}</Badge></div>
                        <div className="flex justify-between text-[9px] text-muted-foreground"><span>${c.spent.toLocaleString()} / ${c.budget.toLocaleString()}</span><span>{budgetPct.toFixed(0)}%</span></div>
                        <Progress value={Math.min(budgetPct, 100)} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4"><h4 className="text-xs font-bold text-foreground mb-2">Revenue by Partner</h4>
                {brandPartners.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4">No data</p> : brandPartners.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-[11px] text-foreground">{b.brand_name}</span>
                    <span className="text-xs font-bold text-foreground">${b.total_revenue.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4"><h4 className="text-xs font-bold text-foreground mb-2">Financial Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Total Budget</span><span className="text-foreground">${totalBudget.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Total Spent</span><span className="text-foreground">${totalSpent.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Total Revenue</span><span className="text-emerald-400 font-medium">${totalRevenue.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Invoiced</span><span className="text-foreground">${totalInvoiceAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Budget Remaining</span><span className="text-foreground">${(totalBudget - totalSpent).toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TKCommercialContent;

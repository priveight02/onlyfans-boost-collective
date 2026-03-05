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
  BriefcaseBusiness, PieChart, Activity, Layers,
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
  status: "draft" | "active" | "completed" | "paused";
  campaign_type: "sponsored" | "branded" | "affiliate" | "organic_promo";
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  posts: number;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
  disclosure_type: "branded_content" | "paid_partnership" | "sponsored" | "ad";
  notes: string;
}

interface BrandPartner {
  id: string;
  brand_name: string;
  contact_email: string;
  industry: string;
  status: "active" | "pending" | "completed" | "declined";
  total_campaigns: number;
  total_revenue: number;
  last_collaboration: string;
}

const TKCommercialContent = ({ selectedAccount, callApi, loading }: Props) => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brandPartners, setBrandPartners] = useState<BrandPartner[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // New campaign form
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "", brand_name: "", campaign_type: "sponsored" as Campaign["campaign_type"],
    budget: 0, start_date: "", end_date: "", disclosure_type: "branded_content" as Campaign["disclosure_type"],
    notes: "",
  });

  // New brand form
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ brand_name: "", contact_email: "", industry: "" });

  // Load campaigns from ad_campaigns table
  const loadCampaigns = useCallback(async () => {
    if (!selectedAccount) return;
    setCampaignsLoading(true);
    const { data } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("user_id", selectedAccount)
      .eq("platform", "tiktok")
      .order("created_at", { ascending: false });
    if (data) {
      setCampaigns(data.map(c => ({
        id: c.id,
        name: c.name,
        brand_name: (c.metadata as any)?.brand_name || c.target_audience || "—",
        status: c.status as any,
        campaign_type: (c.metadata as any)?.campaign_type || "sponsored",
        budget: c.lifetime_budget || c.daily_budget || 0,
        spent: c.spend || 0,
        start_date: c.start_date || "",
        end_date: c.end_date || "",
        posts: (c.metadata as any)?.posts || 0,
        impressions: c.impressions || 0,
        engagement: c.clicks || 0,
        clicks: c.clicks || 0,
        conversions: (c.metadata as any)?.conversions || 0,
        disclosure_type: (c.metadata as any)?.disclosure_type || "branded_content",
        notes: (c.metadata as any)?.notes || "",
      })));
    }
    setCampaignsLoading(false);
  }, [selectedAccount]);

  // Load brand partners from managed data
  const loadBrandPartners = useCallback(async () => {
    if (!selectedAccount) return;
    const { data } = await supabase
      .from("account_activities")
      .select("*")
      .eq("account_id", selectedAccount)
      .eq("activity_type", "brand_partner")
      .order("created_at", { ascending: false });
    if (data) {
      setBrandPartners(data.map(d => {
        const meta = d.metadata as any;
        return {
          id: d.id,
          brand_name: meta?.brand_name || d.description,
          contact_email: meta?.contact_email || "",
          industry: meta?.industry || "",
          status: meta?.status || "active",
          total_campaigns: meta?.total_campaigns || 0,
          total_revenue: meta?.total_revenue || 0,
          last_collaboration: d.created_at,
        };
      }));
    }
  }, [selectedAccount]);

  useEffect(() => { loadCampaigns(); loadBrandPartners(); }, [loadCampaigns, loadBrandPartners]);

  // Create campaign
  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.brand_name) {
      toast.error("Campaign name and brand are required");
      return;
    }
    const { error } = await supabase.from("ad_campaigns").insert({
      user_id: selectedAccount,
      platform: "tiktok",
      name: newCampaign.name,
      status: "draft",
      target_audience: newCampaign.brand_name,
      lifetime_budget: newCampaign.budget,
      start_date: newCampaign.start_date || null,
      end_date: newCampaign.end_date || null,
      metadata: {
        brand_name: newCampaign.brand_name,
        campaign_type: newCampaign.campaign_type,
        disclosure_type: newCampaign.disclosure_type,
        notes: newCampaign.notes,
        posts: 0,
        conversions: 0,
      },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Campaign created");
      setShowNewCampaign(false);
      setNewCampaign({ name: "", brand_name: "", campaign_type: "sponsored", budget: 0, start_date: "", end_date: "", disclosure_type: "branded_content", notes: "" });
      loadCampaigns();
    }
  };

  // Update campaign status
  const updateCampaignStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("ad_campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Campaign ${status}`); loadCampaigns(); }
  };

  // Delete campaign
  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Campaign deleted"); loadCampaigns(); }
  };

  // Add brand partner
  const addBrandPartner = async () => {
    if (!newBrand.brand_name) { toast.error("Brand name required"); return; }
    const { error } = await supabase.from("account_activities").insert({
      account_id: selectedAccount,
      activity_type: "brand_partner",
      description: newBrand.brand_name,
      metadata: {
        brand_name: newBrand.brand_name,
        contact_email: newBrand.contact_email,
        industry: newBrand.industry,
        status: "active",
        total_campaigns: 0,
        total_revenue: 0,
      },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Brand partner added");
      setShowNewBrand(false);
      setNewBrand({ brand_name: "", contact_email: "", industry: "" });
      loadBrandPartners();
    }
  };

  // Stats
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "draft": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "completed": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "paused": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "pending": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "declined": return "bg-red-500/15 text-red-400 border-red-500/30";
      default: return "bg-white/10 text-muted-foreground border-white/10";
    }
  };

  const disclosureLabel = (t: string) => {
    switch (t) {
      case "branded_content": return "Branded Content";
      case "paid_partnership": return "Paid Partnership";
      case "sponsored": return "Sponsored";
      case "ad": return "Advertisement";
      default: return t;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-orange-400" />
            Commercial Content
            <Badge className="bg-orange-500/15 text-orange-400 text-[9px]">API Approved</Badge>
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manage brand partnerships, sponsored content, and commercial disclosure compliance</p>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-lg gap-0.5 flex flex-wrap">
          {[
            { v: "dashboard", icon: PieChart, l: "Dashboard" },
            { v: "campaigns", icon: Megaphone, l: "Campaigns" },
            { v: "brands", icon: Building2, l: "Brand Partners" },
            { v: "compliance", icon: ShieldCheck, l: "Compliance" },
            { v: "analytics", icon: BarChart3, l: "Analytics" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5">
              <t.icon className="h-3.5 w-3.5" />{t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Campaigns", value: activeCampaigns.toString(), icon: Megaphone, color: "text-orange-400", bg: "bg-orange-500/10" },
              { label: "Total Budget", value: `$${totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Brand Partners", value: brandPartners.length.toString(), icon: Handshake, color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map(kpi => (
              <Card key={kpi.label} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                    <div className={`p-1 rounded ${kpi.bg}`}><kpi.icon className={`h-3 w-3 ${kpi.color}`} /></div>
                  </div>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-orange-400" /> Campaign Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Total Impressions</span>
                    <span className="text-foreground font-medium">{totalImpressions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Total Clicks</span>
                    <span className="text-foreground font-medium">{totalClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Average CTR</span>
                    <span className="text-foreground font-medium">{avgCTR}%</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className="text-foreground font-medium">{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5 text-purple-400" /> Recent Partners
                </h4>
                {brandPartners.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-4 text-center">No brand partners yet</p>
                ) : (
                  <div className="space-y-2">
                    {brandPartners.slice(0, 5).map(b => (
                      <div key={b.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-purple-500/15 flex items-center justify-center">
                            <Building2 className="h-3 w-3 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-[11px] text-foreground font-medium">{b.brand_name}</p>
                            <p className="text-[9px] text-muted-foreground">{b.industry || "—"}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${statusColor(b.status)}`}>{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CAMPAIGNS */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">Campaign Manager</h4>
            <Button size="sm" onClick={() => setShowNewCampaign(!showNewCampaign)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">
              <Plus className="h-3 w-3 mr-1" /> New Campaign
            </Button>
          </div>

          {/* New Campaign Form */}
          {showNewCampaign && (
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Create Campaign</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Campaign Name *</label>
                    <Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} placeholder="Summer Collection Launch" className="h-8 text-xs bg-white/[0.05]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Brand Name *</label>
                    <Input value={newCampaign.brand_name} onChange={e => setNewCampaign(p => ({ ...p, brand_name: e.target.value }))} placeholder="Nike, Adidas..." className="h-8 text-xs bg-white/[0.05]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                    <Select value={newCampaign.campaign_type} onValueChange={(v: any) => setNewCampaign(p => ({ ...p, campaign_type: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sponsored">Sponsored</SelectItem>
                        <SelectItem value="branded">Branded Content</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="organic_promo">Organic Promotion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Disclosure Type</label>
                    <Select value={newCampaign.disclosure_type} onValueChange={(v: any) => setNewCampaign(p => ({ ...p, disclosure_type: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-white/[0.05]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="branded_content">Branded Content</SelectItem>
                        <SelectItem value="paid_partnership">Paid Partnership</SelectItem>
                        <SelectItem value="sponsored">Sponsored</SelectItem>
                        <SelectItem value="ad">Advertisement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Budget ($)</label>
                    <Input type="number" value={newCampaign.budget || ""} onChange={e => setNewCampaign(p => ({ ...p, budget: parseInt(e.target.value) || 0 }))} placeholder="5000" className="h-8 text-xs bg-white/[0.05]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Start</label>
                      <Input type="date" value={newCampaign.start_date} onChange={e => setNewCampaign(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-xs bg-white/[0.05]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">End</label>
                      <Input type="date" value={newCampaign.end_date} onChange={e => setNewCampaign(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-xs bg-white/[0.05]" />
                    </div>
                  </div>
                </div>
                <Textarea value={newCampaign.notes} onChange={e => setNewCampaign(p => ({ ...p, notes: e.target.value }))} placeholder="Campaign notes, deliverables, requirements..." className="text-xs bg-white/[0.05] min-h-[60px]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={createCampaign} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">Create Campaign</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewCampaign(false)} className="text-xs">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign List */}
          <ScrollArea className="h-[450px]">
            {campaigns.length === 0 && !campaignsLoading ? (
              <div className="text-center py-12">
                <Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No campaigns yet. Create your first campaign above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map(c => (
                  <Card key={c.id} className="bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{c.name}</p>
                            <Badge variant="outline" className={`text-[9px] ${statusColor(c.status)}`}>{c.status}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Building2 className="h-3 w-3" /> {c.brand_name}
                            <span className="text-white/10">·</span>
                            <Tag className="h-3 w-3" /> {disclosureLabel(c.disclosure_type)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {c.status === "draft" && (
                            <Button size="sm" variant="ghost" onClick={() => updateCampaignStatus(c.id, "active")} className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300">
                              Activate
                            </Button>
                          )}
                          {c.status === "active" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => updateCampaignStatus(c.id, "paused")} className="h-7 text-[10px] text-amber-400">Pause</Button>
                              <Button size="sm" variant="ghost" onClick={() => updateCampaignStatus(c.id, "completed")} className="h-7 text-[10px] text-blue-400">Complete</Button>
                            </>
                          )}
                          {c.status === "paused" && (
                            <Button size="sm" variant="ghost" onClick={() => updateCampaignStatus(c.id, "active")} className="h-7 text-[10px] text-emerald-400">Resume</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteCampaign(c.id)} className="h-7 text-[10px] text-red-400 hover:text-red-300">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mt-3">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Budget</p>
                          <p className="text-xs font-bold text-foreground">${c.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Spent</p>
                          <p className="text-xs font-bold text-foreground">${c.spent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Impressions</p>
                          <p className="text-xs font-bold text-foreground">{c.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Clicks</p>
                          <p className="text-xs font-bold text-foreground">{c.clicks.toLocaleString()}</p>
                        </div>
                      </div>
                      {c.start_date && (
                        <p className="text-[9px] text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.start_date).toLocaleDateString()} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : "Ongoing"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* BRAND PARTNERS */}
        <TabsContent value="brands" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">Brand Partners</h4>
            <Button size="sm" onClick={() => setShowNewBrand(!showNewBrand)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Brand
            </Button>
          </div>

          {showNewBrand && (
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Add Brand Partner</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={newBrand.brand_name} onChange={e => setNewBrand(p => ({ ...p, brand_name: e.target.value }))} placeholder="Brand name *" className="h-8 text-xs bg-white/[0.05]" />
                  <Input value={newBrand.contact_email} onChange={e => setNewBrand(p => ({ ...p, contact_email: e.target.value }))} placeholder="Contact email" className="h-8 text-xs bg-white/[0.05]" />
                  <Input value={newBrand.industry} onChange={e => setNewBrand(p => ({ ...p, industry: e.target.value }))} placeholder="Industry (Fashion, Tech...)" className="h-8 text-xs bg-white/[0.05]" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addBrandPartner} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">Add Partner</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewBrand(false)} className="text-xs">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {brandPartners.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No brand partners added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {brandPartners.map(b => (
                <Card key={b.id} className="bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{b.brand_name}</p>
                          <p className="text-[10px] text-muted-foreground">{b.industry || "General"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${statusColor(b.status)}`}>{b.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Campaigns</p>
                        <p className="text-xs font-bold text-foreground">{b.total_campaigns}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Revenue</p>
                        <p className="text-xs font-bold text-foreground">${b.total_revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Last Collab</p>
                        <p className="text-xs font-bold text-foreground">{new Date(b.last_collaboration).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {b.contact_email && (
                      <p className="text-[9px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> {b.contact_email}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* COMPLIANCE */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-500/20">
            <CardContent className="p-4 space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-orange-400" /> Commercial Disclosure Compliance
              </h4>
              <p className="text-[10px] text-muted-foreground">
                TikTok requires proper disclosure on all sponsored and branded content. Our platform automatically handles compliance labeling.
              </p>

              <div className="space-y-3">
                {[
                  { label: "Branded Content Labeling", desc: "Automatic 'Branded Content' tag on all sponsored posts via TikTok's API", status: "active" },
                  { label: "Paid Partnership Disclosure", desc: "Compliance with FTC guidelines for paid partnerships", status: "active" },
                  { label: "Content Disclosure Toggle", desc: "Creators must explicitly declare if content promotes a brand or third party", status: "active" },
                  { label: "Music Usage Confirmation", desc: "Mandatory acknowledgment of commercial music usage rights", status: "active" },
                  { label: "Privacy-Branded Conflict Guard", desc: "Branded content visibility cannot be set to private (SELF_ONLY)", status: "active" },
                  { label: "Campaign Audit Trail", desc: "All campaigns and brand interactions logged for regulatory compliance", status: "active" },
                  { label: "Attribution Enforcement", desc: "'Posted via Uplyze' attribution on all published content", status: "active" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02]">
                    <CheckCircle2 className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" /> Compliance Resources
              </h4>
              <div className="space-y-2">
                {[
                  { label: "TikTok Branded Content Policy", url: "https://www.tiktok.com/legal/page/global/bc-policy" },
                  { label: "FTC Endorsement Guidelines", url: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides" },
                  { label: "TikTok Commercial Content Guidelines", url: "https://www.tiktok.com/community-guidelines" },
                ].map(r => (
                  <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                    <ExternalLink className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-foreground group-hover:text-blue-400 transition-colors">{r.label}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Campaigns", value: campaigns.length.toString(), icon: Megaphone, color: "text-orange-400" },
              { label: "Active", value: activeCampaigns.toString(), icon: Zap, color: "text-emerald-400" },
              { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-blue-400" },
              { label: "Avg CTR", value: `${avgCTR}%`, icon: Target, color: "text-amber-400" },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className={`h-3 w-3 ${s.color}`} />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-orange-400" /> Campaign Breakdown
              </h4>
              {campaigns.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-8">Create campaigns to see analytics breakdown</p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map(c => {
                    const budgetPct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
                    return (
                      <div key={c.id} className="space-y-1.5 p-2 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-foreground font-medium">{c.name}</p>
                          <Badge variant="outline" className={`text-[9px] ${statusColor(c.status)}`}>{c.status}</Badge>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>${c.spent.toLocaleString()} / ${c.budget.toLocaleString()}</span>
                          <span>{budgetPct.toFixed(0)}% utilized</span>
                        </div>
                        <Progress value={Math.min(budgetPct, 100)} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Revenue Summary
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Brand Revenue</p>
                  <p className="text-xl font-bold text-foreground">${brandPartners.reduce((s, b) => s + b.total_revenue, 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Revenue / Partner</p>
                  <p className="text-xl font-bold text-foreground">
                    ${brandPartners.length > 0 ? Math.round(brandPartners.reduce((s, b) => s + b.total_revenue, 0) / brandPartners.length).toLocaleString() : "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TKCommercialContent;

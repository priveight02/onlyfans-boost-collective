import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Megaphone, Plus, Loader2, Play, Pause, Trash2, SquarePen,
  RefreshCw, BarChart3, Eye, MousePointerClick, DollarSign,
  TrendingUp, CheckCircle2, Wifi, WifiOff, AlertCircle,
  Search, Settings2, Zap, X, Globe, Target, Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

// Platform-specific campaign objectives
const PLATFORM_OBJECTIVES: Record<string, { value: string; label: string }[]> = {
  facebook_ads: [
    { value: "OUTCOME_TRAFFIC", label: "Traffic" },
    { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
    { value: "OUTCOME_LEADS", label: "Leads" },
    { value: "OUTCOME_SALES", label: "Sales" },
    { value: "OUTCOME_AWARENESS", label: "Awareness" },
    { value: "OUTCOME_APP_PROMOTION", label: "App Promotion" },
  ],
  instagram_ads: [
    { value: "OUTCOME_TRAFFIC", label: "Traffic" },
    { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
    { value: "OUTCOME_LEADS", label: "Leads" },
    { value: "OUTCOME_SALES", label: "Sales" },
    { value: "OUTCOME_AWARENESS", label: "Awareness" },
  ],
  google_ads: [
    { value: "SEARCH", label: "Search" },
    { value: "DISPLAY", label: "Display" },
    { value: "SHOPPING", label: "Shopping" },
    { value: "VIDEO", label: "Video (YouTube)" },
    { value: "PERFORMANCE_MAX", label: "Performance Max" },
    { value: "DEMAND_GEN", label: "Demand Gen" },
  ],
  youtube_ads: [
    { value: "VIDEO", label: "Video Campaign" },
    { value: "PERFORMANCE_MAX", label: "Performance Max" },
  ],
  tiktok_ads: [
    { value: "TRAFFIC", label: "Traffic" },
    { value: "CONVERSIONS", label: "Conversions" },
    { value: "APP_INSTALL", label: "App Install" },
    { value: "REACH", label: "Reach" },
    { value: "VIDEO_VIEWS", label: "Video Views" },
    { value: "LEAD_GENERATION", label: "Lead Generation" },
    { value: "PRODUCT_SALES", label: "Product Sales" },
  ],
  snapchat_ads: [
    { value: "AWARENESS", label: "Awareness" },
    { value: "CONSIDERATION", label: "Consideration" },
    { value: "CONVERSIONS", label: "Conversions" },
    { value: "CATALOG_SALES", label: "Catalog Sales" },
  ],
  pinterest_ads: [
    { value: "AWARENESS", label: "Awareness" },
    { value: "CONSIDERATION", label: "Consideration" },
    { value: "CONVERSIONS", label: "Conversions" },
    { value: "VIDEO_VIEW", label: "Video Views" },
    { value: "CATALOG_SALES", label: "Catalog Sales" },
  ],
  x_ads: [
    { value: "REACH", label: "Reach" },
    { value: "ENGAGEMENTS", label: "Engagements" },
    { value: "VIDEO_VIEWS", label: "Video Views" },
    { value: "WEBSITE_CLICKS", label: "Website Clicks" },
    { value: "APP_INSTALLS", label: "App Installs" },
    { value: "FOLLOWERS", label: "Followers" },
  ],
  linkedin_ads: [
    { value: "BRAND_AWARENESS", label: "Brand Awareness" },
    { value: "WEBSITE_VISITS", label: "Website Visits" },
    { value: "ENGAGEMENT", label: "Engagement" },
    { value: "VIDEO_VIEWS", label: "Video Views" },
    { value: "LEAD_GENERATION", label: "Lead Generation" },
    { value: "WEBSITE_CONVERSIONS", label: "Conversions" },
    { value: "JOB_APPLICANTS", label: "Job Applicants" },
  ],
};

const PLATFORM_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  impressions?: number;
  clicks?: number;
  spend?: number;
  ctr?: number;
  platform: string;
}

interface ConnectedAccount {
  platform: string;
  name: string;
  credentials: Record<string, string>;
  username?: string;
  avatar?: string;
  accountId?: string;
}

interface CampaignManagerProps {
  connectedPlatforms: Record<string, boolean>;
  connectedDetails: Record<string, { username?: string; avatar?: string; accountId?: string }>;
  integrationKeys: Record<string, Record<string, string>>;
}

const CampaignManager = ({ connectedPlatforms, connectedDetails, integrationKeys }: CampaignManagerProps) => {
  const [activePlatform, setActivePlatform] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create form state
  const [formName, setFormName] = useState("");
  const [formObjective, setFormObjective] = useState("");
  const [formDailyBudget, setFormDailyBudget] = useState("50");
  const [formLifetimeBudget, setFormLifetimeBudget] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState("PAUSED");
  const [formBidStrategy, setFormBidStrategy] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get connected ad platforms
  const adPlatforms = [
    "google_ads", "facebook_ads", "instagram_ads", "tiktok_ads",
    "snapchat_ads", "pinterest_ads", "x_ads", "linkedin_ads", "youtube_ads",
  ].filter(p => connectedPlatforms[p]);

  const PLATFORM_NAMES: Record<string, string> = {
    google_ads: "Google Ads", facebook_ads: "Facebook Ads", instagram_ads: "Instagram Ads",
    tiktok_ads: "TikTok Ads", snapchat_ads: "Snapchat Ads", pinterest_ads: "Pinterest Ads",
    x_ads: "X (Twitter) Ads", linkedin_ads: "LinkedIn Ads", youtube_ads: "YouTube Ads",
  };

  useEffect(() => {
    if (adPlatforms.length > 0 && !activePlatform) {
      setActivePlatform(adPlatforms[0]);
    }
  }, [adPlatforms.length]);

  const getCredentials = (platform: string): Record<string, string> => {
    return integrationKeys[platform] || {};
  };

  const callAdsApi = async (platform: string, action: string, data?: any, campaignId?: string) => {
    const credentials = getCredentials(platform);
    const { data: result, error } = await supabase.functions.invoke("ads-api", {
      body: { platform, action, credentials, data, campaign_id: campaignId },
    });
    if (error) throw error;
    return result;
  };

  const normalizeCampaigns = (platform: string, raw: any): Campaign[] => {
    try {
      // Facebook/Instagram
      if (platform === "facebook_ads" || platform === "instagram_ads") {
        const items = raw?.data?.data || raw?.data || [];
        return (Array.isArray(items) ? items : []).map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status || c.effective_status,
          objective: c.objective,
          daily_budget: c.daily_budget ? parseInt(c.daily_budget) / 100 : undefined,
          lifetime_budget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : undefined,
          start_time: c.start_time,
          end_time: c.stop_time,
          platform,
        }));
      }
      // Google / YouTube
      if (platform === "google_ads" || platform === "youtube_ads") {
        const results = raw?.data?.[0]?.results || raw?.data?.results || [];
        return results.map((r: any) => ({
          id: r.campaign?.id || r.campaign?.resourceName?.split("/").pop(),
          name: r.campaign?.name,
          status: r.campaign?.status,
          objective: r.campaign?.advertisingChannelType,
          daily_budget: r.campaignBudget?.amountMicros ? parseInt(r.campaignBudget.amountMicros) / 1000000 : undefined,
          start_time: r.campaign?.startDate,
          end_time: r.campaign?.endDate,
          platform,
        }));
      }
      // TikTok
      if (platform === "tiktok_ads") {
        const items = raw?.data?.data?.list || [];
        return items.map((c: any) => ({
          id: c.campaign_id,
          name: c.campaign_name,
          status: c.operation_status === "ENABLE" ? "ACTIVE" : c.operation_status === "DISABLE" ? "PAUSED" : c.operation_status,
          objective: c.objective_type,
          daily_budget: c.budget,
          platform,
        }));
      }
      // Snapchat
      if (platform === "snapchat_ads") {
        const items = raw?.data?.campaigns || [];
        return items.map((c: any) => ({
          id: c.campaign?.id || c.id,
          name: c.campaign?.name || c.name,
          status: c.campaign?.status || c.status,
          daily_budget: c.campaign?.daily_budget_micro ? c.campaign.daily_budget_micro / 1000000 : undefined,
          start_time: c.campaign?.start_time,
          end_time: c.campaign?.end_time,
          platform,
        }));
      }
      // Pinterest
      if (platform === "pinterest_ads") {
        const items = raw?.data?.items || [];
        return items.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective_type,
          daily_budget: c.daily_spend_cap ? c.daily_spend_cap / 1000000 : undefined,
          lifetime_budget: c.lifetime_spend_cap ? c.lifetime_spend_cap / 1000000 : undefined,
          start_time: c.start_time ? new Date(c.start_time * 1000).toISOString() : undefined,
          end_time: c.end_time ? new Date(c.end_time * 1000).toISOString() : undefined,
          platform,
        }));
      }
      // X
      if (platform === "x_ads") {
        const items = raw?.data?.data || [];
        return items.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.entity_status,
          daily_budget: c.daily_budget_amount_local_micro ? c.daily_budget_amount_local_micro / 1000000 : undefined,
          lifetime_budget: c.total_budget_amount_local_micro ? c.total_budget_amount_local_micro / 1000000 : undefined,
          start_time: c.start_time,
          end_time: c.end_time,
          platform,
        }));
      }
      // LinkedIn
      if (platform === "linkedin_ads") {
        const items = raw?.data?.elements || [];
        return items.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objectiveType,
          daily_budget: c.dailyBudget?.amount ? parseInt(c.dailyBudget.amount) / 100 : undefined,
          lifetime_budget: c.totalBudget?.amount ? parseInt(c.totalBudget.amount) / 100 : undefined,
          platform,
        }));
      }
    } catch (e) {
      console.error("Normalize error:", e);
    }
    return [];
  };

  const fetchCampaigns = useCallback(async () => {
    if (!activePlatform) return;
    setLoading(true);
    try {
      const result = await callAdsApi(activePlatform, "list_campaigns");
      const normalized = normalizeCampaigns(activePlatform, result);
      setCampaigns(normalized);
    } catch (err: any) {
      console.error("Fetch campaigns error:", err);
      toast.error(`Failed to fetch campaigns: ${err.message || "Unknown error"}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [activePlatform]);

  useEffect(() => {
    if (activePlatform) fetchCampaigns();
  }, [activePlatform, fetchCampaigns]);

  const handleCreate = async () => {
    if (!formName || !activePlatform) return;
    setCreating(true);
    try {
      await callAdsApi(activePlatform, "create_campaign", {
        name: formName,
        objective: formObjective,
        daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined,
        lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : undefined,
        status: formStatus,
        start_time: formStartDate || undefined,
        end_time: formEndDate || undefined,
        bid_strategy: formBidStrategy || undefined,
        channel_type: formObjective, // for Google Ads
      });
      toast.success(`Campaign "${formName}" created on ${PLATFORM_NAMES[activePlatform]}`);
      setCreateOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (err: any) {
      toast.error(`Failed to create campaign: ${err.message || "Unknown error"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (campaign: Campaign, newStatus: string) => {
    setActionLoading(campaign.id);
    try {
      await callAdsApi(activePlatform, "update_campaign", { status: newStatus }, campaign.id);
      toast.success(`Campaign "${campaign.name}" ${newStatus === "ACTIVE" ? "activated" : "paused"}`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async () => {
    if (!editCampaign) return;
    setCreating(true);
    try {
      await callAdsApi(activePlatform, "update_campaign", {
        name: formName,
        status: formStatus,
        daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined,
        lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : undefined,
        bid_strategy: formBidStrategy || undefined,
      }, editCampaign.id);
      toast.success(`Campaign "${formName}" updated`);
      setEditOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    try {
      await callAdsApi(activePlatform, "delete_campaign", {}, campaign.id);
      toast.success(`Campaign "${campaign.name}" deleted`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditCampaign(campaign);
    setFormName(campaign.name);
    setFormStatus(campaign.status);
    setFormDailyBudget(campaign.daily_budget?.toString() || "");
    setFormLifetimeBudget(campaign.lifetime_budget?.toString() || "");
    setFormObjective(campaign.objective || "");
    setFormStartDate(campaign.start_time ? campaign.start_time.split("T")[0] : "");
    setFormEndDate(campaign.end_time ? campaign.end_time.split("T")[0] : "");
    setEditOpen(true);
  };

  const resetForm = () => {
    setFormName(""); setFormObjective(""); setFormDailyBudget("50");
    setFormLifetimeBudget(""); setFormStartDate(""); setFormEndDate("");
    setFormStatus("PAUSED"); setFormBidStrategy(""); setFormTargetAudience("");
    setEditCampaign(null);
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const objectives = PLATFORM_OBJECTIVES[activePlatform] || [];

  if (adPlatforms.length === 0) {
    return (
      <Card className="crm-card border-white/[0.04]">
        <CardContent className="p-12 text-center space-y-3">
          <WifiOff className="h-10 w-10 text-white/15 mx-auto" />
          <h3 className="text-sm font-semibold text-white/60">No Ad Accounts Connected</h3>
          <p className="text-xs text-white/30 max-w-md mx-auto">Connect at least one ad platform in the Integrations tab to start managing campaigns directly from Uplyze.</p>
        </CardContent>
      </Card>
    );
  }

  const renderCampaignForm = (isEdit: boolean) => (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-white/40 font-medium">Campaign Name *</label>
        <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Summer Sale 2026" className="mt-1 text-xs crm-input" />
      </div>
      <div>
        <label className="text-[11px] text-white/40 font-medium">Objective</label>
        <Select value={formObjective} onValueChange={setFormObjective}>
          <SelectTrigger className="mt-1 text-xs crm-input"><SelectValue placeholder="Select objective" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
            {objectives.map(o => <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 font-medium">Daily Budget ($)</label>
          <Input type="number" value={formDailyBudget} onChange={e => setFormDailyBudget(e.target.value)} placeholder="50" className="mt-1 text-xs crm-input" />
        </div>
        <div>
          <label className="text-[11px] text-white/40 font-medium">Lifetime Budget ($)</label>
          <Input type="number" value={formLifetimeBudget} onChange={e => setFormLifetimeBudget(e.target.value)} placeholder="Optional" className="mt-1 text-xs crm-input" />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-white/40 font-medium">Status</label>
        <Select value={formStatus} onValueChange={setFormStatus}>
          <SelectTrigger className="mt-1 text-xs crm-input"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
            {PLATFORM_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-white text-xs">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 font-medium">Start Date</label>
          <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="mt-1 text-xs crm-input" />
        </div>
        <div>
          <label className="text-[11px] text-white/40 font-medium">End Date</label>
          <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="mt-1 text-xs crm-input" />
        </div>
      </div>
      {(activePlatform === "google_ads" || activePlatform === "facebook_ads") && (
        <div>
          <label className="text-[11px] text-white/40 font-medium">Bid Strategy</label>
          <Select value={formBidStrategy} onValueChange={setFormBidStrategy}>
            <SelectTrigger className="mt-1 text-xs crm-input"><SelectValue placeholder="Auto (recommended)" /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
              <SelectItem value="LOWEST_COST" className="text-white text-xs">Lowest Cost</SelectItem>
              <SelectItem value="COST_CAP" className="text-white text-xs">Cost Cap</SelectItem>
              <SelectItem value="BID_CAP" className="text-white text-xs">Bid Cap</SelectItem>
              <SelectItem value="TARGET_CPA" className="text-white text-xs">Target CPA</SelectItem>
              <SelectItem value="TARGET_ROAS" className="text-white text-xs">Target ROAS</SelectItem>
              <SelectItem value="MAXIMIZE_CONVERSIONS" className="text-white text-xs">Maximize Conversions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="text-[11px] text-white/40 font-medium">Target Audience Notes</label>
        <Textarea value={formTargetAudience} onChange={e => setFormTargetAudience(e.target.value)} placeholder="Tech-savvy millennials, 25-34, urban areas..." className="mt-1 text-xs crm-input min-h-[60px]" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 text-xs border-white/10 text-white/50" onClick={() => { isEdit ? setEditOpen(false) : setCreateOpen(false); resetForm(); }}>
          Cancel
        </Button>
        <Button className="flex-1 text-xs" disabled={!formName || creating} onClick={isEdit ? handleEdit : handleCreate} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
          {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
          {isEdit ? "Update Campaign" : "Create Campaign"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Platform selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {adPlatforms.map(p => {
          const details = connectedDetails[p];
          const isActive = activePlatform === p;
          return (
            <button key={p} onClick={() => setActivePlatform(p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-medium ${isActive ? "border-accent/30 bg-accent/10 text-accent" : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-white/10"}`}
            >
              {details?.avatar ? (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={details.avatar} />
                  <AvatarFallback className="text-[8px] bg-white/[0.06]">{(details.username || p)[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <div className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-white/20"}`} />
              )}
              {PLATFORM_NAMES[p]}
              {details?.username && <span className="text-[9px] text-white/25">@{details.username}</span>}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search campaigns..." className="pl-8 text-xs crm-input h-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 text-xs crm-input h-8">
            <Filter className="h-3 w-3 mr-1 text-white/25" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Status</SelectItem>
            <SelectItem value="ACTIVE" className="text-white text-xs">Active</SelectItem>
            <SelectItem value="PAUSED" className="text-white text-xs">Paused</SelectItem>
            <SelectItem value="ARCHIVED" className="text-white text-xs">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="text-xs h-8 border-white/10 text-white/40" onClick={fetchCampaigns} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
        <Button size="sm" className="text-xs h-8" onClick={() => { resetForm(); setCreateOpen(true); }} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
          <Plus className="h-3 w-3 mr-1" />New Campaign
        </Button>
      </div>

      {/* Campaigns list */}
      <ScrollArea className="h-[calc(100vh-420px)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
            <p className="text-xs text-white/30">Loading campaigns from {PLATFORM_NAMES[activePlatform]}...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="crm-card border-white/[0.04]">
            <CardContent className="p-12 text-center space-y-3">
              <Megaphone className="h-8 w-8 text-white/10 mx-auto" />
              <h3 className="text-sm font-semibold text-white/50">
                {campaigns.length === 0 ? "No Campaigns Found" : "No Matching Campaigns"}
              </h3>
              <p className="text-xs text-white/25">
                {campaigns.length === 0
                  ? `Create your first campaign on ${PLATFORM_NAMES[activePlatform]} to get started.`
                  : "Try adjusting your search or filter."}
              </p>
              {campaigns.length === 0 && (
                <Button size="sm" className="text-xs mt-2" onClick={() => { resetForm(); setCreateOpen(true); }} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                  <Plus className="h-3 w-3 mr-1" />Create Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredCampaigns.map(campaign => (
              <Card key={campaign.id} className="crm-card border-white/[0.04] hover:border-white/[0.08] transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status indicator */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${campaign.status === "ACTIVE" ? "bg-emerald-400" : campaign.status === "PAUSED" ? "bg-amber-400" : "bg-white/15"}`} />
                    </div>

                    {/* Campaign info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">{campaign.name}</h3>
                        <Badge className={`text-[8px] shrink-0 ${campaign.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : campaign.status === "PAUSED" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-white/5 text-white/30 border-white/10"}`}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {campaign.objective && <span className="text-[10px] text-white/25">{campaign.objective.replace(/_/g, " ")}</span>}
                        {campaign.daily_budget && <span className="text-[10px] text-white/30">${campaign.daily_budget}/day</span>}
                        {campaign.lifetime_budget && <span className="text-[10px] text-white/30">${campaign.lifetime_budget} total</span>}
                        {campaign.start_time && <span className="text-[10px] text-white/20">{new Date(campaign.start_time).toLocaleDateString()}</span>}
                        <span className="text-[10px] text-white/15 font-mono">ID: {campaign.id}</span>
                      </div>
                    </div>

                    {/* Stats if available */}
                    {(campaign.impressions !== undefined || campaign.clicks !== undefined) && (
                      <div className="flex items-center gap-4">
                        {campaign.impressions !== undefined && (
                          <div className="text-center">
                            <div className="text-xs font-bold text-white">{campaign.impressions.toLocaleString()}</div>
                            <div className="text-[9px] text-white/20">Impressions</div>
                          </div>
                        )}
                        {campaign.clicks !== undefined && (
                          <div className="text-center">
                            <div className="text-xs font-bold text-white">{campaign.clicks.toLocaleString()}</div>
                            <div className="text-[9px] text-white/20">Clicks</div>
                          </div>
                        )}
                        {campaign.spend !== undefined && (
                          <div className="text-center">
                            <div className="text-xs font-bold text-white">${campaign.spend.toFixed(2)}</div>
                            <div className="text-[9px] text-white/20">Spend</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {campaign.status === "ACTIVE" ? (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10"
                          disabled={actionLoading === campaign.id} onClick={() => handleUpdateStatus(campaign, "PAUSED")} title="Pause">
                          {actionLoading === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                          disabled={actionLoading === campaign.id} onClick={() => handleUpdateStatus(campaign, "ACTIVE")} title="Activate">
                          {actionLoading === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
                        onClick={() => openEditDialog(campaign)} title="Edit">
                        <SquarePen className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400 hover:bg-red-500/10"
                        disabled={actionLoading === campaign.id} onClick={() => handleDelete(campaign)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[hsl(222,47%,8%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-accent" />
              New Campaign — {PLATFORM_NAMES[activePlatform]}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="pr-2">
              {renderCampaignForm(false)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[hsl(222,47%,8%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <SquarePen className="h-4 w-4 text-accent" />
              Edit Campaign — {editCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="pr-2">
              {renderCampaignForm(true)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManager;

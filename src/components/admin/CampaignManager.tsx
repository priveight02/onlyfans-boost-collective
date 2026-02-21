import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Megaphone, Plus, Loader2, Play, Pause, Trash2, SquarePen,
  RefreshCw, Eye, DollarSign, TrendingUp, Wifi, WifiOff,
  Search, Zap, Filter, BarChart3, Copy, ExternalLink,
  Calendar, Target, Clock, ArrowUpRight, ArrowDownRight,
  Activity, MousePointerClick,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

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
  db_id?: string;
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
  bid_strategy?: string;
  target_audience?: string;
  synced?: boolean;
}

interface CampaignManagerProps {
  connectedPlatforms: Record<string, boolean>;
  connectedDetails: Record<string, { username?: string; avatar?: string; accountId?: string }>;
  integrationKeys: Record<string, Record<string, string>>;
}

const PLATFORM_NAMES: Record<string, string> = {
  google_ads: "Google Ads", facebook_ads: "Facebook Ads", instagram_ads: "Instagram Ads",
  tiktok_ads: "TikTok Ads", snapchat_ads: "Snapchat Ads", pinterest_ads: "Pinterest Ads",
  x_ads: "X (Twitter) Ads", linkedin_ads: "LinkedIn Ads", youtube_ads: "YouTube Ads",
};

const CampaignManager = ({ connectedPlatforms, connectedDetails, integrationKeys }: CampaignManagerProps) => {
  const [activePlatform, setActivePlatform] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

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

  const adPlatforms = [
    "google_ads", "facebook_ads", "instagram_ads", "tiktok_ads",
    "snapchat_ads", "pinterest_ads", "x_ads", "linkedin_ads", "youtube_ads",
  ].filter(p => connectedPlatforms[p]);

  useEffect(() => {
    if (adPlatforms.length > 0 && !activePlatform) {
      setActivePlatform(adPlatforms[0]);
    }
  }, [adPlatforms.length]);

  const callAdsApi = async (platform: string, action: string, data?: any, campaignId?: string) => {
    const credentials = integrationKeys[platform] || {};
    const { data: result, error } = await supabase.functions.invoke("ads-api", {
      body: { platform, action, credentials, data, campaign_id: campaignId },
    });
    if (error) throw error;
    return result;
  };

  // Load campaigns from local DB + attempt API sync
  const fetchCampaigns = useCallback(async () => {
    if (!activePlatform) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Always load from local DB first
      const { data: localCampaigns } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("platform", activePlatform)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const local: Campaign[] = (localCampaigns || []).map((c: any) => ({
        id: c.external_id || c.id,
        db_id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        daily_budget: c.daily_budget ? Number(c.daily_budget) : undefined,
        lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : undefined,
        start_time: c.start_date,
        end_time: c.end_date,
        impressions: c.impressions ? Number(c.impressions) : 0,
        clicks: c.clicks ? Number(c.clicks) : 0,
        spend: c.spend ? Number(c.spend) : 0,
        ctr: c.ctr ? Number(c.ctr) : 0,
        platform: c.platform,
        bid_strategy: c.bid_strategy,
        target_audience: c.target_audience,
        synced: !!c.synced_at,
      }));

      setCampaigns(local);

      // Try to sync from external API in background
      try {
        const result = await callAdsApi(activePlatform, "list_campaigns");
        const apiCampaigns = normalizeApiCampaigns(activePlatform, result);

        if (apiCampaigns.length > 0) {
          // Merge: update local records with API data
          for (const apiCamp of apiCampaigns) {
            const existing = local.find(l => l.id === apiCamp.id);
            if (existing && existing.db_id) {
              await supabase.from("ad_campaigns").update({
                status: apiCamp.status,
                impressions: apiCamp.impressions || 0,
                clicks: apiCamp.clicks || 0,
                spend: apiCamp.spend || 0,
                ctr: apiCamp.ctr || 0,
                synced_at: new Date().toISOString(),
              }).eq("id", existing.db_id);
            } else if (!existing) {
              // New campaign from API not in local DB — insert
              await supabase.from("ad_campaigns").insert({
                user_id: user.id,
                platform: activePlatform,
                external_id: apiCamp.id,
                name: apiCamp.name,
                status: apiCamp.status,
                objective: apiCamp.objective,
                daily_budget: apiCamp.daily_budget,
                lifetime_budget: apiCamp.lifetime_budget,
                start_date: apiCamp.start_time,
                end_date: apiCamp.end_time,
                impressions: apiCamp.impressions || 0,
                clicks: apiCamp.clicks || 0,
                spend: apiCamp.spend || 0,
                synced_at: new Date().toISOString(),
              });
            }
          }
          // Re-fetch local after sync
          const { data: updated } = await supabase
            .from("ad_campaigns")
            .select("*")
            .eq("platform", activePlatform)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (updated) {
            setCampaigns(updated.map((c: any) => ({
              id: c.external_id || c.id,
              db_id: c.id,
              name: c.name,
              status: c.status,
              objective: c.objective,
              daily_budget: c.daily_budget ? Number(c.daily_budget) : undefined,
              lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : undefined,
              start_time: c.start_date,
              end_time: c.end_date,
              impressions: c.impressions ? Number(c.impressions) : 0,
              clicks: c.clicks ? Number(c.clicks) : 0,
              spend: c.spend ? Number(c.spend) : 0,
              ctr: c.ctr ? Number(c.ctr) : 0,
              platform: c.platform,
              bid_strategy: c.bid_strategy,
              target_audience: c.target_audience,
              synced: !!c.synced_at,
            })));
          }
        }
      } catch {
        // API sync failed silently — local data is still shown
      }
    } catch (err: any) {
      console.error("Fetch campaigns error:", err);
    } finally {
      setLoading(false);
    }
  }, [activePlatform]);

  const normalizeApiCampaigns = (platform: string, raw: any): Campaign[] => {
    try {
      if (platform === "facebook_ads" || platform === "instagram_ads") {
        const items = raw?.data?.data || raw?.data || [];
        return (Array.isArray(items) ? items : []).map((c: any) => ({
          id: c.id, name: c.name, status: c.status || c.effective_status, objective: c.objective,
          daily_budget: c.daily_budget ? parseInt(c.daily_budget) / 100 : undefined,
          lifetime_budget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : undefined,
          start_time: c.start_time, end_time: c.stop_time, platform,
        }));
      }
      if (platform === "google_ads" || platform === "youtube_ads") {
        const results = raw?.data?.[0]?.results || raw?.data?.results || [];
        return results.map((r: any) => ({
          id: r.campaign?.id || r.campaign?.resourceName?.split("/").pop(), name: r.campaign?.name,
          status: r.campaign?.status, objective: r.campaign?.advertisingChannelType,
          daily_budget: r.campaignBudget?.amountMicros ? parseInt(r.campaignBudget.amountMicros) / 1000000 : undefined,
          start_time: r.campaign?.startDate, end_time: r.campaign?.endDate, platform,
        }));
      }
      if (platform === "tiktok_ads") {
        const items = raw?.data?.data?.list || [];
        return items.map((c: any) => ({
          id: c.campaign_id, name: c.campaign_name,
          status: c.operation_status === "ENABLE" ? "ACTIVE" : c.operation_status === "DISABLE" ? "PAUSED" : c.operation_status,
          objective: c.objective_type, daily_budget: c.budget, platform,
        }));
      }
      if (platform === "snapchat_ads") {
        const items = raw?.data?.campaigns || [];
        return items.map((c: any) => ({
          id: c.campaign?.id || c.id, name: c.campaign?.name || c.name, status: c.campaign?.status || c.status,
          daily_budget: c.campaign?.daily_budget_micro ? c.campaign.daily_budget_micro / 1000000 : undefined, platform,
        }));
      }
      if (platform === "pinterest_ads") {
        const items = raw?.data?.items || [];
        return items.map((c: any) => ({
          id: c.id, name: c.name, status: c.status, objective: c.objective_type,
          daily_budget: c.daily_spend_cap ? c.daily_spend_cap / 1000000 : undefined, platform,
        }));
      }
      if (platform === "x_ads") {
        const items = raw?.data?.data || [];
        return items.map((c: any) => ({
          id: c.id, name: c.name, status: c.entity_status,
          daily_budget: c.daily_budget_amount_local_micro ? c.daily_budget_amount_local_micro / 1000000 : undefined, platform,
        }));
      }
      if (platform === "linkedin_ads") {
        const items = raw?.data?.elements || [];
        return items.map((c: any) => ({
          id: c.id, name: c.name, status: c.status, objective: c.objectiveType,
          daily_budget: c.dailyBudget?.amount ? parseInt(c.dailyBudget.amount) / 100 : undefined, platform,
        }));
      }
    } catch (e) { console.error("Normalize error:", e); }
    return [];
  };

  useEffect(() => {
    if (activePlatform) fetchCampaigns();
  }, [activePlatform, fetchCampaigns]);

  const handleCreate = async () => {
    if (!formName || !activePlatform) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call external API
      let externalId: string | null = null;
      try {
        const result = await callAdsApi(activePlatform, "create_campaign", {
          name: formName, objective: formObjective,
          daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined,
          lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : undefined,
          status: formStatus, start_time: formStartDate || undefined, end_time: formEndDate || undefined,
          bid_strategy: formBidStrategy || undefined, channel_type: formObjective,
        });
        externalId = result?.data?.id || result?.data?.results?.[0]?.resourceName?.split("/").pop() || null;
      } catch {
        // API may fail on sandbox — still persist locally
      }

      // Always persist locally
      const { error: dbError } = await supabase.from("ad_campaigns").insert({
        user_id: user.id,
        platform: activePlatform,
        external_id: externalId,
        name: formName,
        status: formStatus,
        objective: formObjective || null,
        daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : null,
        lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : null,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        bid_strategy: formBidStrategy || null,
        target_audience: formTargetAudience || null,
        synced_at: externalId ? new Date().toISOString() : null,
      });

      if (dbError) throw dbError;

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
      // Update locally first
      if (campaign.db_id) {
        await supabase.from("ad_campaigns").update({ status: newStatus }).eq("id", campaign.db_id);
      }
      // Try external API
      try {
        await callAdsApi(activePlatform, "update_campaign", { status: newStatus }, campaign.id);
      } catch { /* silent */ }
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
      if (editCampaign.db_id) {
        await supabase.from("ad_campaigns").update({
          name: formName, status: formStatus, objective: formObjective || null,
          daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : null,
          lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : null,
          start_date: formStartDate || null, end_date: formEndDate || null,
          bid_strategy: formBidStrategy || null, target_audience: formTargetAudience || null,
        }).eq("id", editCampaign.db_id);
      }
      try {
        await callAdsApi(activePlatform, "update_campaign", {
          name: formName, status: formStatus,
          daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined,
          lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : undefined,
          bid_strategy: formBidStrategy || undefined,
        }, editCampaign.id);
      } catch { /* silent */ }
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
      if (campaign.db_id) {
        await supabase.from("ad_campaigns").delete().eq("id", campaign.db_id);
      }
      try {
        await callAdsApi(activePlatform, "delete_campaign", {}, campaign.id);
      } catch { /* silent */ }
      toast.success(`Campaign "${campaign.name}" deleted`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    setDuplicating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("ad_campaigns").insert({
        user_id: user.id, platform: activePlatform,
        name: `${campaign.name} (Copy)`, status: "PAUSED",
        objective: campaign.objective, daily_budget: campaign.daily_budget,
        lifetime_budget: campaign.lifetime_budget, start_date: campaign.start_time,
        end_date: campaign.end_time, bid_strategy: campaign.bid_strategy,
        target_audience: campaign.target_audience,
      });
      toast.success(`Campaign duplicated as "${campaign.name} (Copy)"`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(`Failed to duplicate: ${err.message}`);
    } finally {
      setDuplicating(false);
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
    setFormBidStrategy(campaign.bid_strategy || "");
    setFormTargetAudience(campaign.target_audience || "");
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

  // Aggregate stats
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const avgCtr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + (c.ctr || 0), 0) / campaigns.length : 0;
  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;

  if (adPlatforms.length === 0) {
    return (
      <div className="crm-card p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
          <WifiOff className="h-7 w-7 text-white/15" />
        </div>
        <h3 className="text-base font-semibold text-white/60">No Ad Accounts Connected</h3>
        <p className="text-xs text-white/25 max-w-sm mx-auto leading-relaxed">
          Connect at least one ad platform in the Integrations tab to start managing campaigns directly from Uplyze.
        </p>
      </div>
    );
  }

  const renderCampaignForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Campaign Name *</label>
        <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Summer Sale 2026" className="mt-1.5 text-xs crm-input h-9" />
      </div>
      <div>
        <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Objective</label>
        <Select value={formObjective} onValueChange={setFormObjective}>
          <SelectTrigger className="mt-1.5 text-xs crm-input h-9"><SelectValue placeholder="Select objective" /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">
            {objectives.map(o => <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Daily Budget ($)</label>
          <Input type="number" value={formDailyBudget} onChange={e => setFormDailyBudget(e.target.value)} placeholder="50" className="mt-1.5 text-xs crm-input h-9" />
        </div>
        <div>
          <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Lifetime Budget ($)</label>
          <Input type="number" value={formLifetimeBudget} onChange={e => setFormLifetimeBudget(e.target.value)} placeholder="Optional" className="mt-1.5 text-xs crm-input h-9" />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Status</label>
        <Select value={formStatus} onValueChange={setFormStatus}>
          <SelectTrigger className="mt-1.5 text-xs crm-input h-9"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">
            {PLATFORM_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-white text-xs">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Start Date</label>
          <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="mt-1.5 text-xs crm-input h-9" />
        </div>
        <div>
          <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">End Date</label>
          <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="mt-1.5 text-xs crm-input h-9" />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Bid Strategy</label>
        <Select value={formBidStrategy} onValueChange={setFormBidStrategy}>
          <SelectTrigger className="mt-1.5 text-xs crm-input h-9"><SelectValue placeholder="Auto (recommended)" /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">
            <SelectItem value="LOWEST_COST" className="text-white text-xs">Lowest Cost</SelectItem>
            <SelectItem value="COST_CAP" className="text-white text-xs">Cost Cap</SelectItem>
            <SelectItem value="BID_CAP" className="text-white text-xs">Bid Cap</SelectItem>
            <SelectItem value="TARGET_CPA" className="text-white text-xs">Target CPA</SelectItem>
            <SelectItem value="TARGET_ROAS" className="text-white text-xs">Target ROAS</SelectItem>
            <SelectItem value="MAXIMIZE_CONVERSIONS" className="text-white text-xs">Maximize Conversions</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Target Audience Notes</label>
        <Textarea value={formTargetAudience} onChange={e => setFormTargetAudience(e.target.value)} placeholder="Tech-savvy millennials, 25-34, urban areas..." className="mt-1.5 text-xs crm-input min-h-[60px]" />
      </div>
      <div className="flex gap-2 pt-3">
        <Button variant="outline" className="flex-1 text-xs h-9 border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
          onClick={() => { isEdit ? setEditOpen(false) : setCreateOpen(false); resetForm(); }}>
          Cancel
        </Button>
        <Button className="flex-1 text-xs h-9 border-0 text-white font-medium" disabled={!formName || creating}
          onClick={isEdit ? handleEdit : handleCreate}
          style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
          {creating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
          {isEdit ? "Update Campaign" : "Create Campaign"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Megaphone, color: "hsl(217 91% 60%)" },
          { label: "Active", value: activeCampaigns, icon: Activity, color: "hsl(142 71% 45%)" },
          { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "hsl(262 83% 58%)" },
          { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "hsl(25 95% 53%)" },
          { label: "Total Spend", value: `$${totalSpend.toFixed(2)}`, icon: DollarSign, color: "hsl(330 80% 60%)" },
        ].map((stat, i) => (
          <div key={i} className="crm-stat-card">
            <div className="flex items-center justify-between mb-2">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
              </div>
              {campaigns.length > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-emerald-400/70">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              )}
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{stat.value}</div>
            <div className="text-[10px] text-white/25 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Platform Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {adPlatforms.map(p => {
          const details = connectedDetails[p];
          const isActive = activePlatform === p;
          return (
            <button key={p} onClick={() => setActivePlatform(p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-medium ${isActive
                ? "border-[hsl(217,91%,60%)]/30 bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,80%)]"
                : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/55 hover:border-white/[0.1]"}`}
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
              {details?.username && <span className="text-[9px] text-white/20">@{details.username}</span>}
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
          <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">
            <SelectItem value="all" className="text-white text-xs">All Status</SelectItem>
            <SelectItem value="ACTIVE" className="text-white text-xs">Active</SelectItem>
            <SelectItem value="PAUSED" className="text-white text-xs">Paused</SelectItem>
            <SelectItem value="ARCHIVED" className="text-white text-xs">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="text-xs h-8 border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white/60" onClick={fetchCampaigns} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />Sync
        </Button>
        <Button size="sm" className="text-xs h-8 border-0 text-white font-medium" onClick={() => { resetForm(); setCreateOpen(true); }}
          style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
          <Plus className="h-3 w-3 mr-1" />New Campaign
        </Button>
      </div>

      {/* Campaigns List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-[hsl(217,91%,60%)] animate-spin" />
            <p className="text-xs text-white/25">Loading campaigns from {PLATFORM_NAMES[activePlatform]}...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="crm-card p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
              <Megaphone className="h-6 w-6 text-white/10" />
            </div>
            <h3 className="text-sm font-semibold text-white/50">
              {campaigns.length === 0 ? "No Campaigns Yet" : "No Matching Campaigns"}
            </h3>
            <p className="text-xs text-white/20 max-w-sm mx-auto">
              {campaigns.length === 0
                ? `Create your first campaign on ${PLATFORM_NAMES[activePlatform]} to get started.`
                : "Try adjusting your search or filter."}
            </p>
            {campaigns.length === 0 && (
              <Button size="sm" className="text-xs mt-2 border-0 text-white" onClick={() => { resetForm(); setCreateOpen(true); }}
                style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                <Plus className="h-3 w-3 mr-1" />Create Campaign
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCampaigns.map(campaign => (
              <div key={campaign.db_id || campaign.id}
                className="crm-card p-4 cursor-pointer group"
                onClick={() => { setDetailCampaign(campaign); setDetailOpen(true); }}
              >
                <div className="flex items-center gap-4">
                  {/* Status */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${campaign.status === "ACTIVE" ? "bg-emerald-400 shadow-[0_0_8px_hsl(142,71%,45%,0.4)]"
                      : campaign.status === "PAUSED" ? "bg-amber-400 shadow-[0_0_8px_hsl(45,93%,47%,0.3)]"
                      : "bg-white/15"}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-white/90">{campaign.name}</h3>
                      <Badge className={`text-[8px] px-1.5 py-0 h-4 shrink-0 border ${
                        campaign.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : campaign.status === "PAUSED" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-white/5 text-white/30 border-white/10"}`}>
                        {campaign.status}
                      </Badge>
                      {campaign.synced && (
                        <div className="flex items-center gap-1 text-[8px] text-emerald-400/50">
                          <Wifi className="h-2.5 w-2.5" />Synced
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {campaign.objective && (
                        <span className="text-[10px] text-white/20 flex items-center gap-1">
                          <Target className="h-2.5 w-2.5" />{campaign.objective.replace(/_/g, " ")}
                        </span>
                      )}
                      {campaign.daily_budget !== undefined && campaign.daily_budget > 0 && (
                        <span className="text-[10px] text-white/25 flex items-center gap-1">
                          <DollarSign className="h-2.5 w-2.5" />${campaign.daily_budget}/day
                        </span>
                      )}
                      {campaign.start_time && (
                        <span className="text-[10px] text-white/15 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />{new Date(campaign.start_time).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Stats */}
                  {(campaign.impressions || campaign.clicks || campaign.spend) ? (
                    <div className="hidden lg:flex items-center gap-5">
                      {campaign.impressions !== undefined && campaign.impressions > 0 && (
                        <div className="text-center">
                          <div className="text-xs font-bold text-white">{campaign.impressions.toLocaleString()}</div>
                          <div className="text-[9px] text-white/20">Impressions</div>
                        </div>
                      )}
                      {campaign.clicks !== undefined && campaign.clicks > 0 && (
                        <div className="text-center">
                          <div className="text-xs font-bold text-white">{campaign.clicks.toLocaleString()}</div>
                          <div className="text-[9px] text-white/20">Clicks</div>
                        </div>
                      )}
                      {campaign.spend !== undefined && campaign.spend > 0 && (
                        <div className="text-center">
                          <div className="text-xs font-bold text-white">${campaign.spend.toFixed(2)}</div>
                          <div className="text-[9px] text-white/20">Spend</div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {campaign.status === "ACTIVE" ? (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10"
                        disabled={actionLoading === campaign.id} onClick={() => handleUpdateStatus(campaign, "PAUSED")} title="Pause">
                        {actionLoading === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10"
                        disabled={actionLoading === campaign.id} onClick={() => handleUpdateStatus(campaign, "ACTIVE")} title="Activate">
                        {actionLoading === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/25 hover:text-white/60 hover:bg-white/[0.04]"
                      onClick={() => openEditDialog(campaign)} title="Edit">
                      <SquarePen className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/25 hover:text-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,60%)]/10"
                      disabled={duplicating} onClick={() => handleDuplicate(campaign)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400/30 hover:text-red-400 hover:bg-red-500/10"
                      disabled={actionLoading === campaign.id} onClick={() => handleDelete(campaign)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Campaign Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[hsl(217,91%,60%)]" />
              Campaign Details
            </DialogTitle>
            <DialogDescription className="text-white/30 text-xs">
              {detailCampaign?.name} on {PLATFORM_NAMES[detailCampaign?.platform || ""]}
            </DialogDescription>
          </DialogHeader>
          {detailCampaign && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Status", value: detailCampaign.status, color: detailCampaign.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400" },
                  { label: "Objective", value: detailCampaign.objective?.replace(/_/g, " ") || "—" },
                  { label: "Daily Budget", value: detailCampaign.daily_budget ? `$${detailCampaign.daily_budget}` : "—" },
                  { label: "Lifetime Budget", value: detailCampaign.lifetime_budget ? `$${detailCampaign.lifetime_budget}` : "—" },
                  { label: "Start Date", value: detailCampaign.start_time ? new Date(detailCampaign.start_time).toLocaleDateString() : "—" },
                  { label: "End Date", value: detailCampaign.end_time ? new Date(detailCampaign.end_time).toLocaleDateString() : "—" },
                ].map((field, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[10px] text-white/25 uppercase tracking-wider">{field.label}</div>
                    <div className={`text-sm font-semibold mt-1 ${field.color || "text-white"}`}>{field.value}</div>
                  </div>
                ))}
              </div>
              {(detailCampaign.impressions || detailCampaign.clicks || detailCampaign.spend) ? (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Impressions", value: (detailCampaign.impressions || 0).toLocaleString(), icon: Eye },
                    { label: "Clicks", value: (detailCampaign.clicks || 0).toLocaleString(), icon: MousePointerClick },
                    { label: "CTR", value: `${(detailCampaign.ctr || 0).toFixed(2)}%`, icon: TrendingUp },
                    { label: "Spend", value: `$${(detailCampaign.spend || 0).toFixed(2)}`, icon: DollarSign },
                  ].map((stat, i) => (
                    <div key={i} className="crm-stat-card text-center">
                      <stat.icon className="h-3.5 w-3.5 mx-auto text-[hsl(217,91%,60%)] mb-1" />
                      <div className="text-sm font-bold text-white">{stat.value}</div>
                      <div className="text-[9px] text-white/20">{stat.label}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs h-8 border-0 text-white"
                  onClick={() => { setDetailOpen(false); openEditDialog(detailCampaign); }}
                  style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                  <SquarePen className="h-3 w-3 mr-1.5" />Edit
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 border-white/[0.08] bg-white/[0.02] text-white/40"
                  onClick={() => { handleDuplicate(detailCampaign); setDetailOpen(false); }}>
                  <Copy className="h-3 w-3 mr-1.5" />Duplicate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-[hsl(217,91%,60%)]" />
              New Campaign — {PLATFORM_NAMES[activePlatform]}
            </DialogTitle>
            <DialogDescription className="text-white/30 text-xs">
              Create a new ad campaign on {PLATFORM_NAMES[activePlatform]}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="pr-2">{renderCampaignForm(false)}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <SquarePen className="h-4 w-4 text-[hsl(217,91%,60%)]" />
              Edit Campaign — {editCampaign?.name}
            </DialogTitle>
            <DialogDescription className="text-white/30 text-xs">
              Update campaign settings and configuration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="pr-2">{renderCampaignForm(true)}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManager;

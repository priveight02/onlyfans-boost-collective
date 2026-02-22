import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Megaphone, Plus, Loader2, Play, Pause, Trash2, SquarePen,
  RefreshCw, Eye, DollarSign, TrendingUp, CircleDot, CircleOff,
  Search, Zap, Filter, BarChart3, Copy, ExternalLink,
  Calendar, Target, Clock, ArrowUpRight, ArrowDownRight,
  Activity, MousePointerClick, ChevronLeft, Layers, Image,
  Users, LineChart, Globe, Link2, FileText, Crosshair,
  MapPin, Sliders, Palette, LayoutGrid, ArrowRight,
  PieChart, Gauge, Maximize2, Settings2, Hash,
  Upload, FolderOpen, Sparkles, CheckCircle2, Video,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const PLATFORM_OBJECTIVES: Record<string, { value: string; label: string }[]> = {
  facebook_ads: [
    { value: "OUTCOME_TRAFFIC", label: "Traffic" }, { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
    { value: "OUTCOME_LEADS", label: "Leads" }, { value: "OUTCOME_SALES", label: "Sales" },
    { value: "OUTCOME_AWARENESS", label: "Awareness" }, { value: "OUTCOME_APP_PROMOTION", label: "App Promotion" },
  ],
  instagram_ads: [
    { value: "OUTCOME_TRAFFIC", label: "Traffic" }, { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
    { value: "OUTCOME_LEADS", label: "Leads" }, { value: "OUTCOME_SALES", label: "Sales" },
    { value: "OUTCOME_AWARENESS", label: "Awareness" },
  ],
  google_ads: [
    { value: "SEARCH", label: "Search" }, { value: "DISPLAY", label: "Display" },
    { value: "SHOPPING", label: "Shopping" }, { value: "VIDEO", label: "Video (YouTube)" },
    { value: "PERFORMANCE_MAX", label: "Performance Max" }, { value: "DEMAND_GEN", label: "Demand Gen" },
  ],
  youtube_ads: [{ value: "VIDEO", label: "Video Campaign" }, { value: "PERFORMANCE_MAX", label: "Performance Max" }],
  tiktok_ads: [
    { value: "TRAFFIC", label: "Traffic" }, { value: "CONVERSIONS", label: "Conversions" },
    { value: "APP_INSTALL", label: "App Install" }, { value: "REACH", label: "Reach" },
    { value: "VIDEO_VIEWS", label: "Video Views" }, { value: "LEAD_GENERATION", label: "Lead Generation" },
    { value: "PRODUCT_SALES", label: "Product Sales" },
  ],
  snapchat_ads: [
    { value: "AWARENESS", label: "Awareness" }, { value: "CONSIDERATION", label: "Consideration" },
    { value: "CONVERSIONS", label: "Conversions" }, { value: "CATALOG_SALES", label: "Catalog Sales" },
  ],
  pinterest_ads: [
    { value: "AWARENESS", label: "Awareness" }, { value: "CONSIDERATION", label: "Consideration" },
    { value: "CONVERSIONS", label: "Conversions" }, { value: "VIDEO_VIEW", label: "Video Views" },
    { value: "CATALOG_SALES", label: "Catalog Sales" },
  ],
  x_ads: [
    { value: "REACH", label: "Reach" }, { value: "ENGAGEMENTS", label: "Engagements" },
    { value: "VIDEO_VIEWS", label: "Video Views" }, { value: "WEBSITE_CLICKS", label: "Website Clicks" },
    { value: "APP_INSTALLS", label: "App Installs" }, { value: "FOLLOWERS", label: "Followers" },
  ],
  linkedin_ads: [
    { value: "BRAND_AWARENESS", label: "Brand Awareness" }, { value: "WEBSITE_VISITS", label: "Website Visits" },
    { value: "ENGAGEMENT", label: "Engagement" }, { value: "VIDEO_VIEWS", label: "Video Views" },
    { value: "LEAD_GENERATION", label: "Lead Generation" }, { value: "WEBSITE_CONVERSIONS", label: "Conversions" },
    { value: "JOB_APPLICANTS", label: "Job Applicants" },
  ],
};

const OPTIMIZATION_GOALS = [
  { value: "LINK_CLICKS", label: "Link Clicks" }, { value: "IMPRESSIONS", label: "Impressions" },
  { value: "REACH", label: "Reach" }, { value: "LANDING_PAGE_VIEWS", label: "Landing Page Views" },
  { value: "CONVERSIONS", label: "Conversions" }, { value: "LEAD_GENERATION", label: "Lead Generation" },
  { value: "APP_INSTALLS", label: "App Installs" }, { value: "VIDEO_VIEWS", label: "Video Views" },
];

const BID_STRATEGIES = [
  { value: "LOWEST_COST", label: "Lowest Cost" }, { value: "COST_CAP", label: "Cost Cap" },
  { value: "BID_CAP", label: "Bid Cap" }, { value: "TARGET_CPA", label: "Target CPA" },
  { value: "TARGET_ROAS", label: "Target ROAS" }, { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
  { value: "MAXIMIZE_CLICKS", label: "Maximize Clicks" },
];

const CTA_TYPES = [
  "LEARN_MORE", "SHOP_NOW", "SIGN_UP", "DOWNLOAD", "BOOK_NOW", "CONTACT_US",
  "GET_OFFER", "SUBSCRIBE", "APPLY_NOW", "GET_QUOTE", "WATCH_MORE", "ORDER_NOW",
];

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════
interface Campaign {
  id: string; db_id?: string; name: string; status: string; objective?: string;
  daily_budget?: number; lifetime_budget?: number; start_time?: string; end_time?: string;
  impressions?: number; clicks?: number; spend?: number; ctr?: number;
  platform: string; bid_strategy?: string; target_audience?: string; synced?: boolean;
  metadata?: Record<string, any>;
}

interface AdSet {
  id: string; name: string; status: string; daily_budget?: number; lifetime_budget?: number;
  optimization_goal?: string; billing_event?: string; bid_amount?: number;
  targeting?: any; start_time?: string; end_time?: string; campaign_id?: string;
}

interface Ad {
  id: string; name: string; status: string; creative?: any;
  adset_id?: string; campaign_id?: string;
  headline?: string; body?: string; image_url?: string; link_url?: string; cta?: string;
}

interface CampaignManagerProps {
  connectedPlatforms: Record<string, boolean>;
  connectedDetails: Record<string, { username?: string; avatar?: string; accountId?: string }>;
  integrationKeys: Record<string, Record<string, string>>;
  generatedCreatives?: { url: string; prompt: string }[];
}

const PLATFORM_NAMES: Record<string, string> = {
  google_ads: "Google Ads", facebook_ads: "Facebook Ads", instagram_ads: "Instagram Ads",
  tiktok_ads: "TikTok Ads", snapchat_ads: "Snapchat Ads", pinterest_ads: "Pinterest Ads",
  x_ads: "X (Twitter) Ads", linkedin_ads: "LinkedIn Ads", youtube_ads: "YouTube Ads",
};

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════
const CampaignManager = ({ connectedPlatforms, connectedDetails, integrationKeys, generatedCreatives = [] }: CampaignManagerProps) => {
  const [activePlatform, setActivePlatform] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Campaign form
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [formName, setFormName] = useState("");
  const [formObjective, setFormObjective] = useState("");
  const [formDailyBudget, setFormDailyBudget] = useState("50");
  const [formLifetimeBudget, setFormLifetimeBudget] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState("PAUSED");
  const [formBidStrategy, setFormBidStrategy] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");

  // Campaign detail view
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [detailTab, setDetailTab] = useState("overview");

  // Ad Sets
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [adSetsLoading, setAdSetsLoading] = useState(false);
  const [adSetFormOpen, setAdSetFormOpen] = useState(false);
  const [adSetForm, setAdSetForm] = useState({ name: "", daily_budget: "50", optimization_goal: "LINK_CLICKS", billing_event: "IMPRESSIONS", bid_amount: "5", status: "PAUSED", age_min: "18", age_max: "65", countries: "US", interests: "" });

  // Ads
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adFormOpen, setAdFormOpen] = useState(false);
  const [selectedAdSet, setSelectedAdSet] = useState<string>("");
  const [adForm, setAdForm] = useState({ name: "", headline: "", body: "", image_url: "", link_url: "", cta: "LEARN_MORE", status: "PAUSED" });
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAdFile, setUploadingAdFile] = useState(false);
  const [importCreativeOpen, setImportCreativeOpen] = useState(false);

  // Saved creatives from DB (copilot_generated_content)
  const [savedCreatives, setSavedCreatives] = useState<{ url: string; prompt: string; content_type: string; created_at: string }[]>([]);

  // Audiences
  const [audiences, setAudiences] = useState<any[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [audienceFormOpen, setAudienceFormOpen] = useState(false);
  const [audienceForm, setAudienceForm] = useState({ name: "", description: "" });

  // Creatives library
  const [creatives, setCreatives] = useState<any[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(false);

  // Fetch saved creatives from DB for import
  const fetchSavedCreatives = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("copilot_generated_content").select("url, prompt, content_type, created_at").eq("created_by", user.id).in("content_type", ["image", "video"]).order("created_at", { ascending: false }).limit(50);
      if (data) setSavedCreatives(data.map((d: any) => ({ url: d.url, prompt: d.prompt || "", content_type: d.content_type, created_at: d.created_at })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSavedCreatives(); }, [fetchSavedCreatives]);

  // Upload file for ad creative
  const handleAdFileUpload = async (file: File) => {
    setUploadingAdFile(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `ad-creatives/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
      setAdForm(p => ({ ...p, image_url: pub.publicUrl }));
      toast.success("File uploaded");
    } catch (err: any) { toast.error("Upload failed: " + err.message); }
    finally { setUploadingAdFile(false); }
  };

  const adPlatforms = ["google_ads", "facebook_ads", "instagram_ads", "tiktok_ads", "snapchat_ads", "pinterest_ads", "x_ads", "linkedin_ads", "youtube_ads"].filter(p => connectedPlatforms[p]);

  useEffect(() => { if (adPlatforms.length > 0 && !activePlatform) setActivePlatform(adPlatforms[0]); }, [adPlatforms.length]);

  const callAdsApi = async (platform: string, action: string, data?: any, campaignId?: string, adsetId?: string, adId?: string) => {
    const credentials = integrationKeys[platform] || {};
    const { data: result, error } = await supabase.functions.invoke("ads-api", {
      body: { platform, action, credentials, data, campaign_id: campaignId, adset_id: adsetId, ad_id: adId },
    });
    if (error) throw error;
    return result;
  };

  // ── Campaign CRUD ──
  const fetchCampaigns = useCallback(async () => {
    if (!activePlatform) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: localCampaigns } = await supabase.from("ad_campaigns").select("*").eq("platform", activePlatform).eq("user_id", user.id).order("created_at", { ascending: false });
      const local: Campaign[] = (localCampaigns || []).map((c: any) => ({
        id: c.external_id || c.id, db_id: c.id, name: c.name, status: c.status, objective: c.objective,
        daily_budget: c.daily_budget ? Number(c.daily_budget) : undefined,
        lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : undefined,
        start_time: c.start_date, end_time: c.end_date,
        impressions: c.impressions ? Number(c.impressions) : 0, clicks: c.clicks ? Number(c.clicks) : 0,
        spend: c.spend ? Number(c.spend) : 0, ctr: c.ctr ? Number(c.ctr) : 0,
        platform: c.platform, bid_strategy: c.bid_strategy, target_audience: c.target_audience,
        synced: !!c.synced_at, metadata: c.metadata as any,
      }));
      setCampaigns(local);

      // Background API sync
      try {
        const result = await callAdsApi(activePlatform, "list_campaigns");
        const apiCampaigns = normalizeApiCampaigns(activePlatform, result);
        if (apiCampaigns.length > 0) {
          for (const apiCamp of apiCampaigns) {
            const existing = local.find(l => l.id === apiCamp.id);
            if (existing?.db_id) {
              await supabase.from("ad_campaigns").update({ status: apiCamp.status, impressions: apiCamp.impressions || 0, clicks: apiCamp.clicks || 0, spend: apiCamp.spend || 0, ctr: apiCamp.ctr || 0, synced_at: new Date().toISOString() }).eq("id", existing.db_id);
            } else if (!existing) {
              await supabase.from("ad_campaigns").insert({ user_id: user.id, platform: activePlatform, external_id: apiCamp.id, name: apiCamp.name, status: apiCamp.status, objective: apiCamp.objective, daily_budget: apiCamp.daily_budget, lifetime_budget: apiCamp.lifetime_budget, start_date: apiCamp.start_time, end_date: apiCamp.end_time, synced_at: new Date().toISOString() });
            }
          }
          const { data: updated } = await supabase.from("ad_campaigns").select("*").eq("platform", activePlatform).eq("user_id", user.id).order("created_at", { ascending: false });
          if (updated) setCampaigns(updated.map((c: any) => ({ id: c.external_id || c.id, db_id: c.id, name: c.name, status: c.status, objective: c.objective, daily_budget: c.daily_budget ? Number(c.daily_budget) : undefined, lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : undefined, start_time: c.start_date, end_time: c.end_date, impressions: c.impressions ? Number(c.impressions) : 0, clicks: c.clicks ? Number(c.clicks) : 0, spend: c.spend ? Number(c.spend) : 0, ctr: c.ctr ? Number(c.ctr) : 0, platform: c.platform, bid_strategy: c.bid_strategy, target_audience: c.target_audience, synced: !!c.synced_at })));
        }
      } catch { /* API sync failed silently */ }
    } catch (err: any) { console.error("Fetch campaigns error:", err); }
    finally { setLoading(false); }
  }, [activePlatform]);

  const normalizeApiCampaigns = (platform: string, raw: any): Campaign[] => {
    try {
      if (platform === "facebook_ads" || platform === "instagram_ads") {
        const items = raw?.data?.data || raw?.data || [];
        return (Array.isArray(items) ? items : []).map((c: any) => ({ id: c.id, name: c.name, status: c.status || c.effective_status, objective: c.objective, daily_budget: c.daily_budget ? parseInt(c.daily_budget) / 100 : undefined, lifetime_budget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : undefined, start_time: c.start_time, end_time: c.stop_time, platform }));
      }
      if (platform === "google_ads" || platform === "youtube_ads") {
        const results = raw?.data?.[0]?.results || raw?.data?.results || [];
        return results.map((r: any) => ({ id: r.campaign?.id || r.campaign?.resourceName?.split("/").pop(), name: r.campaign?.name, status: r.campaign?.status, objective: r.campaign?.advertisingChannelType, daily_budget: r.campaignBudget?.amountMicros ? parseInt(r.campaignBudget.amountMicros) / 1000000 : undefined, platform }));
      }
      if (platform === "tiktok_ads") {
        const items = raw?.data?.data?.list || [];
        return items.map((c: any) => ({ id: c.campaign_id, name: c.campaign_name, status: c.operation_status === "ENABLE" ? "ACTIVE" : "PAUSED", objective: c.objective_type, daily_budget: c.budget, platform }));
      }
    } catch (e) { console.error("Normalize error:", e); }
    return [];
  };

  useEffect(() => { if (activePlatform) { fetchCampaigns(); setSelectedCampaign(null); } }, [activePlatform, fetchCampaigns]);

  const handleCreate = async () => {
    if (!formName || !activePlatform) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      let externalId: string | null = null;
      try {
        const result = await callAdsApi(activePlatform, "create_campaign", { name: formName, objective: formObjective, daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined, lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : undefined, status: formStatus, start_time: formStartDate || undefined, end_time: formEndDate || undefined, bid_strategy: formBidStrategy || undefined, channel_type: formObjective });
        externalId = result?.data?.id || result?.data?.results?.[0]?.resourceName?.split("/").pop() || null;
      } catch { /* sandbox may fail */ }
      await supabase.from("ad_campaigns").insert({ user_id: user.id, platform: activePlatform, external_id: externalId, name: formName, status: formStatus, objective: formObjective || null, daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : null, lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : null, start_date: formStartDate || null, end_date: formEndDate || null, bid_strategy: formBidStrategy || null, target_audience: formTargetAudience || null, synced_at: externalId ? new Date().toISOString() : null });
      toast.success(`Campaign "${formName}" created`);
      setCreateOpen(false); resetForm(); fetchCampaigns();
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setCreating(false); }
  };

  const handleEdit = async () => {
    if (!editCampaign) return;
    setCreating(true);
    try {
      if (editCampaign.db_id) {
        await supabase.from("ad_campaigns").update({ name: formName, status: formStatus, objective: formObjective || null, daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : null, lifetime_budget: formLifetimeBudget ? parseFloat(formLifetimeBudget) : null, start_date: formStartDate || null, end_date: formEndDate || null, bid_strategy: formBidStrategy || null, target_audience: formTargetAudience || null }).eq("id", editCampaign.db_id);
      }
      try { await callAdsApi(activePlatform, "update_campaign", { name: formName, status: formStatus, daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined, bid_strategy: formBidStrategy || undefined }, editCampaign.id); } catch { /* silent */ }
      toast.success(`Campaign updated`);
      setEditOpen(false); resetForm(); fetchCampaigns();
      if (selectedCampaign?.db_id === editCampaign.db_id) setSelectedCampaign({ ...selectedCampaign, name: formName, status: formStatus, objective: formObjective, daily_budget: formDailyBudget ? parseFloat(formDailyBudget) : undefined });
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setCreating(false); }
  };

  const handleUpdateStatus = async (campaign: Campaign, newStatus: string) => {
    setActionLoading(campaign.id);
    try {
      if (campaign.db_id) await supabase.from("ad_campaigns").update({ status: newStatus }).eq("id", campaign.db_id);
      try { await callAdsApi(activePlatform, "update_campaign", { status: newStatus }, campaign.id); } catch { /* silent */ }
      toast.success(`Campaign ${newStatus === "ACTIVE" ? "activated" : "paused"}`);
      fetchCampaigns();
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    try {
      if (campaign.db_id) await supabase.from("ad_campaigns").delete().eq("id", campaign.db_id);
      try { await callAdsApi(activePlatform, "delete_campaign", {}, campaign.id); } catch { /* silent */ }
      toast.success(`Campaign deleted`);
      if (selectedCampaign?.id === campaign.id) setSelectedCampaign(null);
      fetchCampaigns();
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("ad_campaigns").insert({ user_id: user.id, platform: activePlatform, name: `${campaign.name} (Copy)`, status: "PAUSED", objective: campaign.objective, daily_budget: campaign.daily_budget, lifetime_budget: campaign.lifetime_budget, bid_strategy: campaign.bid_strategy, target_audience: campaign.target_audience });
      toast.success("Campaign duplicated"); fetchCampaigns();
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditCampaign(campaign); setFormName(campaign.name); setFormStatus(campaign.status);
    setFormDailyBudget(campaign.daily_budget?.toString() || ""); setFormLifetimeBudget(campaign.lifetime_budget?.toString() || "");
    setFormObjective(campaign.objective || ""); setFormStartDate(campaign.start_time?.split("T")[0] || "");
    setFormEndDate(campaign.end_time?.split("T")[0] || ""); setFormBidStrategy(campaign.bid_strategy || "");
    setFormTargetAudience(campaign.target_audience || ""); setEditOpen(true);
  };

  const resetForm = () => { setFormName(""); setFormObjective(""); setFormDailyBudget("50"); setFormLifetimeBudget(""); setFormStartDate(""); setFormEndDate(""); setFormStatus("PAUSED"); setFormBidStrategy(""); setFormTargetAudience(""); setEditCampaign(null); };

  // ── Ad Sets ──
  const fetchAdSets = useCallback(async (campId: string) => {
    setAdSetsLoading(true);
    try {
      const result = await callAdsApi(activePlatform, "list_adsets", undefined, campId);
      const items = result?.data?.data || result?.data?.adsquads || result?.data?.items || result?.data?.[0]?.results || [];
      const normalized: AdSet[] = (Array.isArray(items) ? items : []).map((a: any) => ({
        id: a.id || a.adsquad?.id || a.adGroup?.id || a.ad_group?.id || Math.random().toString(),
        name: a.name || a.adsquad?.name || a.adGroup?.name || a.adgroup_name || "Unnamed",
        status: a.status || a.adsquad?.status || a.adGroup?.status || a.operation_status || "UNKNOWN",
        daily_budget: a.daily_budget ? parseInt(a.daily_budget) / 100 : a.adsquad?.daily_budget_micro ? a.adsquad.daily_budget_micro / 1000000 : a.budget || undefined,
        optimization_goal: a.optimization_goal || a.adsquad?.optimization_goal || a.adGroup?.type || "",
        targeting: a.targeting || a.adsquad?.targeting || {},
        campaign_id: a.campaign_id || campId,
      }));
      setAdSets(normalized);
    } catch { setAdSets([]); }
    finally { setAdSetsLoading(false); }
  }, [activePlatform]);

  const handleCreateAdSet = async () => {
    if (!adSetForm.name || !selectedCampaign) return;
    setCreating(true);
    try {
      await callAdsApi(activePlatform, "create_adset", {
        name: adSetForm.name, campaign_id: selectedCampaign.id,
        daily_budget: parseFloat(adSetForm.daily_budget), optimization_goal: adSetForm.optimization_goal,
        billing_event: adSetForm.billing_event, bid_amount: parseFloat(adSetForm.bid_amount),
        status: adSetForm.status,
        targeting: { geo_locations: { countries: adSetForm.countries.split(",").map(c => c.trim()) }, age_min: parseInt(adSetForm.age_min), age_max: parseInt(adSetForm.age_max) },
      }, selectedCampaign.id);
      toast.success("Ad Set created"); setAdSetFormOpen(false);
      setAdSetForm({ name: "", daily_budget: "50", optimization_goal: "LINK_CLICKS", billing_event: "IMPRESSIONS", bid_amount: "5", status: "PAUSED", age_min: "18", age_max: "65", countries: "US", interests: "" });
      fetchAdSets(selectedCampaign.id);
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setCreating(false); }
  };

  // ── Ads ──
  const fetchAds = useCallback(async (campId: string, adsetId?: string) => {
    setAdsLoading(true);
    try {
      const result = await callAdsApi(activePlatform, "list_ads", undefined, campId, adsetId);
      const items = result?.data?.data || result?.data?.ads || result?.data?.items || result?.data?.[0]?.results || [];
      const normalized: Ad[] = (Array.isArray(items) ? items : []).map((a: any) => ({
        id: a.id || a.ad?.id || Math.random().toString(),
        name: a.name || a.ad?.name || a.ad_name || "Unnamed Ad",
        status: a.status || a.ad?.status || "UNKNOWN",
        creative: a.creative || a.ad?.responsive_search_ad || a.ad?.responsive_display_ad || {},
        adset_id: a.adset_id || a.ad_group?.id || "",
        campaign_id: a.campaign_id || campId,
        headline: a.creative?.title || a.ad?.responsive_search_ad?.headlines?.[0]?.text || "",
        body: a.creative?.body || a.ad?.responsive_search_ad?.descriptions?.[0]?.text || "",
        image_url: a.creative?.image_url || a.creative?.thumbnail_url || "",
        link_url: a.creative?.link_url || "",
      }));
      setAds(normalized);
    } catch { setAds([]); }
    finally { setAdsLoading(false); }
  }, [activePlatform]);

  const handleCreateAd = async () => {
    if (!adForm.name || !selectedCampaign) return;
    setCreating(true);
    try {
      await callAdsApi(activePlatform, "create_ad", {
        name: adForm.name, adset_id: selectedAdSet || adSets[0]?.id,
        headline: adForm.headline, body: adForm.body, image_url: adForm.image_url,
        link_url: adForm.link_url, cta: adForm.cta, status: adForm.status,
        creative: adForm.image_url ? { title: adForm.headline, body: adForm.body, image_url: adForm.image_url, link_url: adForm.link_url, call_to_action_type: adForm.cta } : undefined,
      }, selectedCampaign.id, selectedAdSet || adSets[0]?.id);
      toast.success("Ad created"); setAdFormOpen(false);
      setAdForm({ name: "", headline: "", body: "", image_url: "", link_url: "", cta: "LEARN_MORE", status: "PAUSED" });
      fetchAds(selectedCampaign.id);
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setCreating(false); }
  };

  // ── Audiences ──
  const fetchAudiences = useCallback(async () => {
    setAudiencesLoading(true);
    try {
      const result = await callAdsApi(activePlatform, "list_audiences");
      const items = result?.data?.data || result?.data || [];
      setAudiences(Array.isArray(items) ? items : []);
    } catch { setAudiences([]); }
    finally { setAudiencesLoading(false); }
  }, [activePlatform]);

  const handleCreateAudience = async () => {
    if (!audienceForm.name) return;
    setCreating(true);
    try {
      await callAdsApi(activePlatform, "create_audience", { name: audienceForm.name, description: audienceForm.description });
      toast.success("Audience created"); setAudienceFormOpen(false);
      setAudienceForm({ name: "", description: "" }); fetchAudiences();
    } catch (err: any) { toast.error(`Failed: ${err.message}`); }
    finally { setCreating(false); }
  };

  // ── Creatives Library ──
  const fetchCreatives = useCallback(async () => {
    setCreativesLoading(true);
    try {
      const result = await callAdsApi(activePlatform, "list_creatives");
      const items = result?.data?.data || result?.data || [];
      setCreatives(Array.isArray(items) ? items : []);
    } catch { setCreatives([]); }
    finally { setCreativesLoading(false); }
  }, [activePlatform]);

  // Load detail data when campaign selected
  useEffect(() => {
    if (selectedCampaign) {
      fetchAdSets(selectedCampaign.id);
      fetchAds(selectedCampaign.id);
    }
  }, [selectedCampaign?.id]);

  useEffect(() => {
    if (selectedCampaign && detailTab === "audience") fetchAudiences();
    if (selectedCampaign && detailTab === "creatives") fetchCreatives();
  }, [detailTab, selectedCampaign?.id]);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const objectives = PLATFORM_OBJECTIVES[activePlatform] || [];
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;

  if (adPlatforms.length === 0) {
    return (
      <div className="crm-card p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto"><CircleOff className="h-7 w-7 text-white/15" /></div>
        <h3 className="text-base font-semibold text-white/60">No Ad Accounts Connected</h3>
        <p className="text-xs text-white/25 max-w-sm mx-auto">Connect at least one ad platform in the Integrations tab to start managing campaigns.</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // CAMPAIGN DETAIL VIEW
  // ═══════════════════════════════════════════════
  if (selectedCampaign) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-white/40 hover:text-white hover:bg-white/[0.04] gap-1.5" onClick={() => setSelectedCampaign(null)}>
            <ChevronLeft className="h-3.5 w-3.5" />Back
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">{selectedCampaign.name}</h2>
              <Badge className={`text-[8px] px-1.5 py-0 h-4 border ${selectedCampaign.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{selectedCampaign.status}</Badge>
              {selectedCampaign.synced && <div className="flex items-center gap-1 text-[8px] text-emerald-400/50"><CircleDot className="h-2.5 w-2.5" />Synced</div>}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {selectedCampaign.objective && <span className="text-[10px] text-white/20">{selectedCampaign.objective.replace(/_/g, " ")}</span>}
              <span className="text-[10px] text-white/15">{PLATFORM_NAMES[activePlatform]}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/60" onClick={() => openEditDialog(selectedCampaign)}><SquarePen className="h-3 w-3 mr-1" />Edit</Button>
            {selectedCampaign.status === "ACTIVE" ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px] border-amber-500/20 bg-amber-500/5 text-amber-400/60 hover:text-amber-400" onClick={() => handleUpdateStatus(selectedCampaign, "PAUSED")}><Pause className="h-3 w-3 mr-1" />Pause</Button>
            ) : (
              <Button size="sm" className="h-7 text-[10px] border-0 text-white" style={{ background: "linear-gradient(135deg, hsl(142 71% 35%), hsl(142 71% 45%))" }} onClick={() => handleUpdateStatus(selectedCampaign, "ACTIVE")}><Play className="h-3 w-3 mr-1" />Activate</Button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-5 gap-2.5">
          {[
            { label: "Impressions", value: (selectedCampaign.impressions || 0).toLocaleString(), icon: Eye, color: "hsl(217 91% 60%)" },
            { label: "Clicks", value: (selectedCampaign.clicks || 0).toLocaleString(), icon: MousePointerClick, color: "hsl(262 83% 58%)" },
            { label: "CTR", value: `${(selectedCampaign.ctr || 0).toFixed(2)}%`, icon: TrendingUp, color: "hsl(142 71% 45%)" },
            { label: "Spend", value: `$${(selectedCampaign.spend || 0).toFixed(2)}`, icon: DollarSign, color: "hsl(25 95% 53%)" },
            { label: "Budget/Day", value: selectedCampaign.daily_budget ? `$${selectedCampaign.daily_budget}` : "—", icon: Gauge, color: "hsl(330 80% 60%)" },
          ].map((s, i) => (
            <div key={i} className="crm-stat-card">
              <div className="h-6 w-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: `${s.color}15` }}><s.icon className="h-3 w-3" style={{ color: s.color }} /></div>
              <div className="text-base font-bold text-white">{s.value}</div>
              <div className="text-[9px] text-white/20">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Detail Tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
          <TabsList className="bg-white/[0.02] border border-white/[0.06] p-0.5 h-8">
            {[
              { value: "overview", label: "Overview", icon: BarChart3 },
              { value: "adsets", label: "Ad Sets", icon: Layers },
              { value: "ads", label: "Ads", icon: Image },
              { value: "audience", label: "Audience", icon: Users },
              { value: "creatives", label: "Creatives", icon: Palette },
              { value: "funnel", label: "Funnel", icon: ArrowRight },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-[10px] h-7 px-2.5 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/30 gap-1">
                <t.icon className="h-3 w-3" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Objective", value: selectedCampaign.objective?.replace(/_/g, " ") || "—", icon: Target },
                { label: "Bid Strategy", value: selectedCampaign.bid_strategy?.replace(/_/g, " ") || "Auto", icon: Sliders },
                { label: "Start Date", value: selectedCampaign.start_time ? new Date(selectedCampaign.start_time).toLocaleDateString() : "Not set", icon: Calendar },
                { label: "End Date", value: selectedCampaign.end_time ? new Date(selectedCampaign.end_time).toLocaleDateString() : "Ongoing", icon: Clock },
                { label: "Daily Budget", value: selectedCampaign.daily_budget ? `$${selectedCampaign.daily_budget}` : "—", icon: DollarSign },
                { label: "Lifetime Budget", value: selectedCampaign.lifetime_budget ? `$${selectedCampaign.lifetime_budget}` : "—", icon: DollarSign },
                { label: "Ad Sets", value: adSets.length.toString(), icon: Layers },
                { label: "Ads Running", value: ads.filter(a => a.status === "ACTIVE").length.toString(), icon: Image },
              ].map((f, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0"><f.icon className="h-3.5 w-3.5 text-white/20" /></div>
                  <div><div className="text-[9px] text-white/20 uppercase tracking-wider">{f.label}</div><div className="text-xs font-semibold text-white mt-0.5">{f.value}</div></div>
                </div>
              ))}
            </div>
            {selectedCampaign.target_audience && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-[9px] text-white/20 uppercase tracking-wider mb-1">Target Audience Notes</div>
                <div className="text-xs text-white/60">{selectedCampaign.target_audience}</div>
              </div>
            )}
          </TabsContent>

          {/* AD SETS TAB */}
          <TabsContent value="adsets" className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/30">{adSets.length} ad set{adSets.length !== 1 ? "s" : ""}</div>
              <Button size="sm" className="h-7 text-[10px] border-0 text-white" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }} onClick={() => setAdSetFormOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />New Ad Set
              </Button>
            </div>
            {adSetsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-[hsl(217,91%,60%)] animate-spin" /></div>
            ) : adSets.length === 0 ? (
              <div className="crm-card p-8 text-center">
                <Layers className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No ad sets yet. Create one to define targeting & budget.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adSets.map(as => (
                  <div key={as.id} className="crm-card p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${as.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{as.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {as.daily_budget && <span className="text-[9px] text-white/20">${as.daily_budget}/day</span>}
                          {as.optimization_goal && <span className="text-[9px] text-white/15">{as.optimization_goal.replace(/_/g, " ")}</span>}
                        </div>
                      </div>
                      <Badge className={`text-[7px] px-1 py-0 h-3.5 border ${as.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/30 border-white/10"}`}>{as.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ADS TAB */}
          <TabsContent value="ads" className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/30">{ads.length} ad{ads.length !== 1 ? "s" : ""}</div>
              <Button size="sm" className="h-7 text-[10px] border-0 text-white" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }} onClick={() => setAdFormOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />New Ad
              </Button>
            </div>
            {adsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-[hsl(217,91%,60%)] animate-spin" /></div>
            ) : ads.length === 0 ? (
              <div className="crm-card p-8 text-center">
                <Image className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No ads yet. Create your first ad with creative & copy.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ads.map(ad => (
                  <div key={ad.id} className="crm-card p-3 space-y-2">
                    {ad.image_url && <div className="h-24 rounded-lg bg-white/[0.03] overflow-hidden"><img src={ad.image_url} alt="" className="w-full h-full object-cover" /></div>}
                    <div>
                      <div className="text-xs font-semibold text-white truncate">{ad.name}</div>
                      {ad.headline && <div className="text-[10px] text-white/40 truncate mt-0.5">{ad.headline}</div>}
                      {ad.body && <div className="text-[9px] text-white/20 line-clamp-2 mt-0.5">{ad.body}</div>}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-[7px] px-1 py-0 h-3.5 border ${ad.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/30 border-white/10"}`}>{ad.status}</Badge>
                      {ad.link_url && <a href={ad.link_url} target="_blank" rel="noreferrer" className="text-[9px] text-[hsl(217,91%,60%)]/50 hover:text-[hsl(217,91%,60%)] flex items-center gap-0.5"><ExternalLink className="h-2.5 w-2.5" />URL</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AUDIENCE TAB */}
          <TabsContent value="audience" className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/30">{audiences.length} audience{audiences.length !== 1 ? "s" : ""}</div>
              <Button size="sm" className="h-7 text-[10px] border-0 text-white" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }} onClick={() => setAudienceFormOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />New Audience
              </Button>
            </div>
            {audiencesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-[hsl(217,91%,60%)] animate-spin" /></div>
            ) : audiences.length === 0 ? (
              <div className="crm-card p-8 text-center">
                <Users className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No custom audiences. Create one to target specific user segments.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {audiences.map((aud: any, i: number) => (
                  <div key={aud.id || i} className="crm-card p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[hsl(262,83%,58%)]/10 flex items-center justify-center"><Users className="h-3.5 w-3.5 text-[hsl(262,83%,58%)]" /></div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-white">{aud.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {aud.approximate_count && <span className="text-[9px] text-white/20">{Number(aud.approximate_count).toLocaleString()} users</span>}
                        {aud.subtype && <span className="text-[9px] text-white/15">{aud.subtype}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CREATIVES TAB */}
          <TabsContent value="creatives" className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/30">{creatives.length} creative{creatives.length !== 1 ? "s" : ""} in library</div>
              <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/[0.06] bg-white/[0.02] text-white/30" onClick={fetchCreatives}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
            </div>
            {creativesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-[hsl(217,91%,60%)] animate-spin" /></div>
            ) : creatives.length === 0 ? (
              <div className="crm-card p-8 text-center">
                <Palette className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No ad creatives found. Creatives are generated when you create ads or use the AI Creative Studio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {creatives.map((cr: any, i: number) => (
                  <div key={cr.id || i} className="crm-card p-2 space-y-1.5">
                    {(cr.image_url || cr.thumbnail_url) && <div className="h-20 rounded-lg bg-white/[0.03] overflow-hidden"><img src={cr.image_url || cr.thumbnail_url} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="text-[10px] font-medium text-white truncate">{cr.name || cr.title || "Untitled"}</div>
                    {cr.body && <div className="text-[8px] text-white/20 line-clamp-2">{cr.body}</div>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FUNNEL TAB */}
          <TabsContent value="funnel" className="mt-3">
            <div className="crm-card p-6 space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-sm font-semibold text-white">Campaign Funnel</h3>
                <p className="text-[10px] text-white/25 mt-0.5">Visual hierarchy from campaign to conversion</p>
              </div>
              {/* Funnel visualization */}
              {[
                { label: "Campaign", detail: selectedCampaign.name, count: 1, icon: Megaphone, color: "hsl(217 91% 60%)", width: "100%" },
                { label: "Ad Sets", detail: `${adSets.length} ad set${adSets.length !== 1 ? "s" : ""}`, count: adSets.length, icon: Layers, color: "hsl(262 83% 58%)", width: "85%" },
                { label: "Ads", detail: `${ads.length} ad${ads.length !== 1 ? "s" : ""}`, count: ads.length, icon: Image, color: "hsl(330 80% 60%)", width: "70%" },
                { label: "Impressions", detail: (selectedCampaign.impressions || 0).toLocaleString(), count: selectedCampaign.impressions || 0, icon: Eye, color: "hsl(25 95% 53%)", width: "55%" },
                { label: "Clicks", detail: (selectedCampaign.clicks || 0).toLocaleString(), count: selectedCampaign.clicks || 0, icon: MousePointerClick, color: "hsl(142 71% 45%)", width: "35%" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${step.color}15` }}>
                    <step.icon className="h-3.5 w-3.5" style={{ color: step.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">{step.label}</span>
                      <span className="text-[10px] font-semibold text-white">{step.detail}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: step.width, background: `linear-gradient(90deg, ${step.color}, ${step.color}80)` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Ad Set Form Dialog */}
        <Dialog open={adSetFormOpen} onOpenChange={setAdSetFormOpen}>
          <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-[hsl(217,91%,60%)]" />New Ad Set</DialogTitle>
              <DialogDescription className="text-white/30 text-xs">Define targeting, budget & optimization for this ad set</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]"><div className="space-y-3 pr-2">
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Name *</label><Input value={adSetForm.name} onChange={e => setAdSetForm(p => ({ ...p, name: e.target.value }))} placeholder="US - 18-34 - Interest targeting" className="mt-1 text-xs crm-input h-8" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Daily Budget ($)</label><Input type="number" value={adSetForm.daily_budget} onChange={e => setAdSetForm(p => ({ ...p, daily_budget: e.target.value }))} className="mt-1 text-xs crm-input h-8" /></div>
                <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Bid Amount ($)</label><Input type="number" value={adSetForm.bid_amount} onChange={e => setAdSetForm(p => ({ ...p, bid_amount: e.target.value }))} className="mt-1 text-xs crm-input h-8" /></div>
              </div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Optimization Goal</label>
                <Select value={adSetForm.optimization_goal} onValueChange={v => setAdSetForm(p => ({ ...p, optimization_goal: v }))}>
                  <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">{OPTIMIZATION_GOALS.map(o => <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Age Min</label><Input type="number" value={adSetForm.age_min} onChange={e => setAdSetForm(p => ({ ...p, age_min: e.target.value }))} className="mt-1 text-xs crm-input h-8" /></div>
                <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Age Max</label><Input type="number" value={adSetForm.age_max} onChange={e => setAdSetForm(p => ({ ...p, age_max: e.target.value }))} className="mt-1 text-xs crm-input h-8" /></div>
              </div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Countries (comma-separated)</label><Input value={adSetForm.countries} onChange={e => setAdSetForm(p => ({ ...p, countries: e.target.value }))} placeholder="US, CA, GB" className="mt-1 text-xs crm-input h-8" /></div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Interests (comma-separated)</label><Input value={adSetForm.interests} onChange={e => setAdSetForm(p => ({ ...p, interests: e.target.value }))} placeholder="Fashion, Technology, Music" className="mt-1 text-xs crm-input h-8" /></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 text-xs h-8 border-white/[0.06] bg-white/[0.02] text-white/30" onClick={() => setAdSetFormOpen(false)}>Cancel</Button>
                <Button className="flex-1 text-xs h-8 border-0 text-white" disabled={!adSetForm.name || creating} onClick={handleCreateAdSet} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                  {creating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}Create Ad Set
                </Button>
              </div>
            </div></ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Ad Form Dialog */}
        <Dialog open={adFormOpen} onOpenChange={setAdFormOpen}>
          <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4 text-[hsl(217,91%,60%)]" />New Ad</DialogTitle>
              <DialogDescription className="text-white/30 text-xs">Create an ad with creative content for this campaign</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]"><div className="space-y-3 pr-2">
              {adSets.length > 0 && (
                <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Ad Set</label>
                  <Select value={selectedAdSet || adSets[0]?.id} onValueChange={setSelectedAdSet}>
                    <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">{adSets.map(as => <SelectItem key={as.id} value={as.id} className="text-white text-xs">{as.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Ad Name *</label><Input value={adForm.name} onChange={e => setAdForm(p => ({ ...p, name: e.target.value }))} placeholder="Summer Sale - Image A" className="mt-1 text-xs crm-input h-8" /></div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Headline</label><Input value={adForm.headline} onChange={e => setAdForm(p => ({ ...p, headline: e.target.value }))} placeholder="Discover the difference" className="mt-1 text-xs crm-input h-8" /></div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Body Text</label><Textarea value={adForm.body} onChange={e => setAdForm(p => ({ ...p, body: e.target.value }))} placeholder="Your ad copy here..." className="mt-1 text-xs crm-input min-h-[60px]" /></div>
              
              {/* Creative / Image Section with file upload + import */}
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider">Creative (Image/Video)</label>
                {adForm.image_url ? (
                  <div className="mt-1 relative rounded-lg overflow-hidden border border-white/[0.06]">
                    {adForm.image_url.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={adForm.image_url} className="w-full h-32 object-cover" controls playsInline />
                    ) : (
                      <img src={adForm.image_url} alt="" className="w-full h-32 object-cover" />
                    )}
                    <button onClick={() => setAdForm(p => ({ ...p, image_url: "" }))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white">×</button>
                  </div>
                ) : (
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    <button onClick={() => adFileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-white/[0.1] hover:border-white/20 transition-colors">
                      {uploadingAdFile ? <Loader2 className="h-4 w-4 text-white/30 animate-spin" /> : <Upload className="h-4 w-4 text-white/30" />}
                      <span className="text-[9px] text-white/30">Upload File</span>
                    </button>
                    <button onClick={() => setImportCreativeOpen(true)} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-emerald-500/20 hover:border-emerald-500/30 transition-colors bg-emerald-500/[0.02]">
                      <FolderOpen className="h-4 w-4 text-emerald-400/50" />
                      <span className="text-[9px] text-emerald-400/50">Creative Maker</span>
                    </button>
                    <button onClick={() => {/* paste URL mode */}} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-white/[0.1] hover:border-white/20 transition-colors">
                      <Link2 className="h-4 w-4 text-white/30" />
                      <span className="text-[9px] text-white/30">Paste URL</span>
                    </button>
                  </div>
                )}
                {!adForm.image_url && (
                  <Input value={adForm.image_url} onChange={e => setAdForm(p => ({ ...p, image_url: e.target.value }))} placeholder="Or paste image/video URL here..." className="mt-1.5 text-xs crm-input h-7" />
                )}
                <input ref={adFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAdFileUpload(f); if (adFileInputRef.current) adFileInputRef.current.value = ""; }} />
              </div>

              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Landing Page URL</label><Input value={adForm.link_url} onChange={e => setAdForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://yoursite.com/landing" className="mt-1 text-xs crm-input h-8" /></div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Call to Action</label>
                <Select value={adForm.cta} onValueChange={v => setAdForm(p => ({ ...p, cta: v }))}>
                  <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">{CTA_TYPES.map(c => <SelectItem key={c} value={c} className="text-white text-xs">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 text-xs h-8 border-white/[0.06] bg-white/[0.02] text-white/30" onClick={() => setAdFormOpen(false)}>Cancel</Button>
                <Button className="flex-1 text-xs h-8 border-0 text-white" disabled={!adForm.name || creating} onClick={handleCreateAd} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                  {creating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}Create Ad
                </Button>
              </div>
            </div></ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Import Creative from Creative Maker Dialog */}
        <Dialog open={importCreativeOpen} onOpenChange={setImportCreativeOpen}>
          <DialogContent className="crm-dialog text-white max-w-2xl border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-400" />Import from Creative Maker</DialogTitle>
              <DialogDescription className="text-white/30 text-xs">Select a generated creative to use in your ad</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="grid grid-cols-3 gap-2 pr-2">
                {/* From in-memory generated creatives */}
                {generatedCreatives.map((cr, i) => (
                  <button key={`gen-${i}`} onClick={() => { setAdForm(p => ({ ...p, image_url: cr.url })); setImportCreativeOpen(false); toast.success("Creative imported"); }} className="rounded-lg overflow-hidden border border-white/[0.06] hover:border-emerald-500/30 transition-all group">
                    <img src={cr.url} alt="" className="w-full aspect-square object-cover" />
                    <div className="p-1.5 bg-white/[0.02]">
                      <div className="text-[8px] text-white/30 line-clamp-1">{cr.prompt.slice(0, 60)}...</div>
                      <Badge className="text-[7px] mt-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Session</Badge>
                    </div>
                  </button>
                ))}
                {/* From DB saved creatives */}
                {savedCreatives.map((cr, i) => (
                  <button key={`db-${i}`} onClick={() => { setAdForm(p => ({ ...p, image_url: cr.url })); setImportCreativeOpen(false); toast.success("Creative imported"); }} className="rounded-lg overflow-hidden border border-white/[0.06] hover:border-[hsl(217,91%,60%)]/30 transition-all group">
                    {cr.content_type === "video" ? (
                      <video src={cr.url} className="w-full aspect-square object-cover" playsInline preload="metadata" />
                    ) : (
                      <img src={cr.url} alt="" className="w-full aspect-square object-cover" />
                    )}
                    <div className="p-1.5 bg-white/[0.02]">
                      <div className="text-[8px] text-white/30 line-clamp-1">{cr.prompt.slice(0, 60) || "Untitled"}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge className={`text-[7px] border ${cr.content_type === "video" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                          {cr.content_type === "video" ? <><Video className="h-2 w-2 mr-0.5" />Video</> : <>Image</>}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
                {generatedCreatives.length === 0 && savedCreatives.length === 0 && (
                  <div className="col-span-3 py-12 text-center">
                    <Palette className="h-8 w-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/25">No creatives found. Generate some in the Creative Maker tab first.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Audience Form Dialog */}
        <Dialog open={audienceFormOpen} onOpenChange={setAudienceFormOpen}>
          <DialogContent className="crm-dialog text-white max-w-md border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-[hsl(262,83%,58%)]" />New Custom Audience</DialogTitle>
              <DialogDescription className="text-white/30 text-xs">Create a custom audience for targeting</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Name *</label><Input value={audienceForm.name} onChange={e => setAudienceForm(p => ({ ...p, name: e.target.value }))} placeholder="High-value customers" className="mt-1 text-xs crm-input h-8" /></div>
              <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Description</label><Textarea value={audienceForm.description} onChange={e => setAudienceForm(p => ({ ...p, description: e.target.value }))} placeholder="Customers who purchased in last 90 days" className="mt-1 text-xs crm-input min-h-[60px]" /></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 text-xs h-8 border-white/[0.06] bg-white/[0.02] text-white/30" onClick={() => setAudienceFormOpen(false)}>Cancel</Button>
                <Button className="flex-1 text-xs h-8 border-0 text-white" disabled={!audienceForm.name || creating} onClick={handleCreateAudience} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
                  {creating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2"><SquarePen className="h-4 w-4 text-[hsl(217,91%,60%)]" />Edit Campaign</DialogTitle>
              <DialogDescription className="text-white/30 text-xs">Update campaign settings</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]"><div className="pr-2">{renderCampaignForm(true)}</div></ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // CAMPAIGN LIST VIEW
  // ═══════════════════════════════════════════════
  function renderCampaignForm(isEdit: boolean) {
    return (
      <div className="space-y-3">
        <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Campaign Name *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Summer Sale 2026" className="mt-1 text-xs crm-input h-8" /></div>
        <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Objective</label>
          <Select value={formObjective} onValueChange={setFormObjective}>
            <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue placeholder="Select objective" /></SelectTrigger>
            <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">{objectives.map(o => <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Daily Budget ($)</label><Input type="number" value={formDailyBudget} onChange={e => setFormDailyBudget(e.target.value)} className="mt-1 text-xs crm-input h-8" /></div>
          <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Lifetime Budget ($)</label><Input type="number" value={formLifetimeBudget} onChange={e => setFormLifetimeBudget(e.target.value)} placeholder="Optional" className="mt-1 text-xs crm-input h-8" /></div>
        </div>
        <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Status</label>
          <Select value={formStatus} onValueChange={setFormStatus}>
            <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">
              <SelectItem value="ACTIVE" className="text-white text-xs">Active</SelectItem>
              <SelectItem value="PAUSED" className="text-white text-xs">Paused</SelectItem>
              <SelectItem value="ARCHIVED" className="text-white text-xs">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Start Date</label><Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="mt-1 text-xs crm-input h-8" /></div>
          <div><label className="text-[10px] text-white/30 uppercase tracking-wider">End Date</label><Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="mt-1 text-xs crm-input h-8" /></div>
        </div>
        <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Bid Strategy</label>
          <Select value={formBidStrategy} onValueChange={setFormBidStrategy}>
            <SelectTrigger className="mt-1 text-xs crm-input h-8"><SelectValue placeholder="Auto (recommended)" /></SelectTrigger>
            <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">{BID_STRATEGIES.map(b => <SelectItem key={b.value} value={b.value} className="text-white text-xs">{b.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label className="text-[10px] text-white/30 uppercase tracking-wider">Target Audience Notes</label><Textarea value={formTargetAudience} onChange={e => setFormTargetAudience(e.target.value)} placeholder="Tech-savvy millennials, 25-34..." className="mt-1 text-xs crm-input min-h-[50px]" /></div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 text-xs h-8 border-white/[0.06] bg-white/[0.02] text-white/30" onClick={() => { isEdit ? setEditOpen(false) : setCreateOpen(false); resetForm(); }}>Cancel</Button>
          <Button className="flex-1 text-xs h-8 border-0 text-white" disabled={!formName || creating} onClick={isEdit ? handleEdit : handleCreate} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
            {creating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}{isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-2.5">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Megaphone, color: "hsl(217 91% 60%)" },
          { label: "Active", value: activeCampaigns, icon: Activity, color: "hsl(142 71% 45%)" },
          { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "hsl(262 83% 58%)" },
          { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "hsl(25 95% 53%)" },
          { label: "Total Spend", value: `$${totalSpend.toFixed(2)}`, icon: DollarSign, color: "hsl(330 80% 60%)" },
        ].map((stat, i) => (
          <div key={i} className="crm-stat-card">
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}><stat.icon className="h-3 w-3" style={{ color: stat.color }} /></div>
              {campaigns.length > 0 && <div className="flex items-center gap-0.5 text-[8px] text-emerald-400/70"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</div>}
            </div>
            <div className="text-base font-bold text-white">{stat.value}</div>
            <div className="text-[9px] text-white/20">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Platform Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {adPlatforms.map(p => {
          const details = connectedDetails[p];
          const isActive = activePlatform === p;
          return (
            <button key={p} onClick={() => setActivePlatform(p)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-medium ${isActive ? "border-[hsl(217,91%,60%)]/30 bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,80%)]" : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/55 hover:border-white/[0.1]"}`}>
              {details?.avatar ? <Avatar className="h-4 w-4"><AvatarImage src={details.avatar} /><AvatarFallback className="text-[7px] bg-white/[0.06]">{(details.username || p)[0]?.toUpperCase()}</AvatarFallback></Avatar> : <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-white/20"}`} />}
              {PLATFORM_NAMES[p]}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/15" />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-7 text-xs crm-input h-7" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 text-[10px] crm-input h-7"><Filter className="h-2.5 w-2.5 mr-1 text-white/20" /><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(222,47%,8%)] border-white/[0.08]">
            <SelectItem value="all" className="text-white text-xs">All</SelectItem>
            <SelectItem value="ACTIVE" className="text-white text-xs">Active</SelectItem>
            <SelectItem value="PAUSED" className="text-white text-xs">Paused</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="text-[10px] h-7 border-white/[0.06] bg-white/[0.02] text-white/30" onClick={fetchCampaigns} disabled={loading}>
          <RefreshCw className={`h-2.5 w-2.5 mr-1 ${loading ? "animate-spin" : ""}`} />Sync
        </Button>
        <Button size="sm" className="text-[10px] h-7 border-0 text-white" onClick={() => { resetForm(); setCreateOpen(true); }} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}>
          <Plus className="h-3 w-3 mr-1" />New
        </Button>
      </div>

      {/* Campaign List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-[hsl(217,91%,60%)] animate-spin" />
            <p className="text-xs text-white/25">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="crm-card p-12 text-center space-y-3">
            <Megaphone className="h-8 w-8 text-white/10 mx-auto" />
            <h3 className="text-sm font-semibold text-white/50">{campaigns.length === 0 ? "No Campaigns Yet" : "No Matches"}</h3>
            <p className="text-xs text-white/20 max-w-sm mx-auto">{campaigns.length === 0 ? `Create your first campaign on ${PLATFORM_NAMES[activePlatform]}.` : "Adjust your search or filter."}</p>
            {campaigns.length === 0 && <Button size="sm" className="text-xs mt-2 border-0 text-white" onClick={() => { resetForm(); setCreateOpen(true); }} style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(262 83% 58%))" }}><Plus className="h-3 w-3 mr-1" />Create</Button>}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredCampaigns.map(campaign => (
              <div key={campaign.db_id || campaign.id} className="crm-card p-3.5 cursor-pointer group hover:border-white/[0.1] transition-all" onClick={() => { setSelectedCampaign(campaign); setDetailTab("overview"); }}>
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${campaign.status === "ACTIVE" ? "bg-emerald-400 shadow-[0_0_8px_hsl(142,71%,45%,0.4)]" : campaign.status === "PAUSED" ? "bg-amber-400" : "bg-white/15"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-white truncate group-hover:text-white/90">{campaign.name}</h3>
                      <Badge className={`text-[7px] px-1 py-0 h-3.5 border ${campaign.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : campaign.status === "PAUSED" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-white/30 border-white/10"}`}>{campaign.status}</Badge>
                      {campaign.synced && <div className="flex items-center gap-0.5 text-[7px] text-emerald-400/40"><CircleDot className="h-2 w-2" /></div>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {campaign.objective && <span className="text-[9px] text-white/15">{campaign.objective.replace(/_/g, " ")}</span>}
                      {campaign.daily_budget !== undefined && campaign.daily_budget > 0 && <span className="text-[9px] text-white/20">${campaign.daily_budget}/day</span>}
                    </div>
                  </div>
                  {(campaign.impressions || campaign.clicks || campaign.spend) ? (
                    <div className="hidden lg:flex items-center gap-4">
                      {campaign.impressions !== undefined && campaign.impressions > 0 && <div className="text-center"><div className="text-[10px] font-bold text-white">{campaign.impressions.toLocaleString()}</div><div className="text-[8px] text-white/15">Imp.</div></div>}
                      {campaign.clicks !== undefined && campaign.clicks > 0 && <div className="text-center"><div className="text-[10px] font-bold text-white">{campaign.clicks.toLocaleString()}</div><div className="text-[8px] text-white/15">Clicks</div></div>}
                      {campaign.spend !== undefined && campaign.spend > 0 && <div className="text-center"><div className="text-[10px] font-bold text-white">${campaign.spend.toFixed(2)}</div><div className="text-[8px] text-white/15">Spend</div></div>}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {campaign.status === "ACTIVE" ? (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-400/40 hover:text-amber-400 hover:bg-amber-500/10" disabled={actionLoading === campaign.id} onClick={() => handleUpdateStatus(campaign, "PAUSED")}>{actionLoading === campaign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}</Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-400/40 hover:text-emerald-400 hover:bg-emerald-500/10" disabled={actionLoading === campaign.id} onClick={() => handleUpdateStatus(campaign, "ACTIVE")}>{actionLoading === campaign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}</Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/20 hover:text-white/50 hover:bg-white/[0.04]" onClick={() => openEditDialog(campaign)}><SquarePen className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/20 hover:text-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,60%)]/10" onClick={() => handleDuplicate(campaign)}><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400/25 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(campaign)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4 text-[hsl(217,91%,60%)]" />New Campaign — {PLATFORM_NAMES[activePlatform]}</DialogTitle>
            <DialogDescription className="text-white/30 text-xs">Create a new ad campaign</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]"><div className="pr-2">{renderCampaignForm(false)}</div></ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (list view) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="crm-dialog text-white max-w-lg border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2"><SquarePen className="h-4 w-4 text-[hsl(217,91%,60%)]" />Edit Campaign</DialogTitle>
            <DialogDescription className="text-white/30 text-xs">Update campaign settings</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]"><div className="pr-2">{renderCampaignForm(true)}</div></ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManager;

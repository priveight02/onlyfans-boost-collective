import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCached, setCache, invalidateNamespace } from "@/lib/supabaseCache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Search, DollarSign, TrendingUp, CreditCard, ArrowLeft,
  Crown, AlertTriangle, Clock, ExternalLink, Mail, Calendar,
  Coins, ShieldCheck, Smartphone, Globe, BarChart3, Zap, Target,
  ArrowUpRight, ArrowDownRight, Receipt, RefreshCw, Eye,
  Brain, Pause, Play, Trash2, Bell, MessageSquare, Ban, Gift,
  Minus, StickyNote, History, Shield, UserX, UserCheck, Sparkles,
  Activity, PieChart, TrendingDown, Flame, Snowflake, Star,
  KeyRound, FileDown, Tag, PenLine, ShieldAlert, LogOut,
  Tags, Gauge, MailCheck, UserCog, Lock, Unlock,
  Image, Type, AtSign, RotateCcw, Eraser, Link2, AlertCircle,
  Eye as EyeIcon, Hash, Fingerprint,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───
interface CustomerSummary {
  user_id: string; email: string; display_name: string; username: string;
  avatar_url: string | null; created_at: string; account_status: string;
  credit_balance: number; total_purchased_credits: number; granted_credits: number; grant_count: number;
  purchase_count: number; total_spent_cents: number; tx_purchase_count: number; tx_total_credits: number;
  last_purchase: string | null; first_purchase: string | null;
  ltv: number; avg_order_value: number; days_since_join: number; monthly_velocity: number;
  spender_score: number; engagement_score: number; churn_risk: string;
  last_login: string | null; days_since_last_login: number;
  post_count: number; avg_purchase_credits: number; purchase_trend: string;
  follower_count: number; current_plan?: string; purchase_frequency?: number;
  projected_annual?: number;
}

interface AIAnalysis {
  behavioral_profile: string; spending_pattern: string; engagement_level: string;
  churn_probability: number; upsell_potential: number; predicted_next_action: string;
  revenue_forecast_30d: string; revenue_forecast_90d: string; customer_segment: string;
  recommended_actions: string[]; risk_factors: string[]; opportunities: string[];
  lifetime_value_projection: string; optimal_engagement_time: string;
  personality_tags: string[];
}

// ─── Helpers ───
const getSpenderColor = (score: number) => {
  if (score >= 70) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-white/40 bg-white/5 border-white/10";
};
const getEngagementColor = (score: number) => {
  if (score >= 70) return "text-sky-400 bg-sky-500/10 border-sky-500/20";
  if (score >= 40) return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  return "text-white/40 bg-white/5 border-white/10";
};
const getChurnColor = (risk: string) => {
  if (risk === "Critical") return "text-red-400 bg-red-500/10";
  if (risk === "High") return "text-orange-400 bg-orange-500/10";
  if (risk === "Medium") return "text-amber-400 bg-amber-500/10";
  return "text-emerald-400 bg-emerald-500/10";
};
const getTierColor = (tier: string) => {
  if (tier.includes("Whale")) return "text-purple-300 bg-purple-500/15 border-purple-500/30";
  if (tier === "High") return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  if (tier === "Medium") return "text-sky-300 bg-sky-500/15 border-sky-500/30";
  return "text-white/50 bg-white/5 border-white/10";
};
const getStatusColor = (status: string) => {
  if (status === "active") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (status === "paused") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (status === "suspended") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (status === "deleted") return "bg-white/5 text-white/30 border-white/10";
  return "bg-white/5 text-white/40 border-white/10";
};
const getSegmentIcon = (segment: string) => {
  if (segment === "Champion") return <Crown className="h-4 w-4 text-amber-400" />;
  if (segment === "At Risk") return <AlertTriangle className="h-4 w-4 text-red-400" />;
  if (segment === "Loyal") return <Star className="h-4 w-4 text-purple-400" />;
  if (segment === "Hibernating" || segment === "Lost") return <Snowflake className="h-4 w-4 text-sky-400" />;
  if (segment === "Promising" || segment === "Potential Loyalist") return <Flame className="h-4 w-4 text-orange-400" />;
  return <Users className="h-4 w-4 text-white/40" />;
};
const getTrendIcon = (trend: string) => {
  if (trend === "increasing") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "decreasing") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Activity className="h-3.5 w-3.5 text-white/30" />;
};
const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDateTime = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filtered, setFiltered] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spender_score" | "engagement_score" | "ltv" | "credit_balance" | "created_at">("spender_score");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChurn, setFilterChurn] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Action dialogs
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ action: string; label: string } | null>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState("info");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditAction, setCreditAction] = useState<"grant" | "revoke">("grant");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Quick action states
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showQuickNoteDialog, setShowQuickNoteDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [quickNoteCategory, setQuickNoteCategory] = useState("general");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [planReason, setPlanReason] = useState("");
  const [exportFormat, setExportFormat] = useState("json");
  const [exportSections, setExportSections] = useState<string[]>(["profile", "transactions", "activity"]);

  const [showVerifyEmailDialog, setShowVerifyEmailDialog] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [showTagUserDialog, setShowTagUserDialog] = useState(false);
  const [showCreditLimitDialog, setShowCreditLimitDialog] = useState(false);
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [showBulkGrantDialog, setShowBulkGrantDialog] = useState(false);
  const [showAccountAuditDialog, setShowAccountAuditDialog] = useState(false);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dailyCreditLimit, setDailyCreditLimit] = useState("500");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailCategory, setEmailCategory] = useState("general");
  const [bulkGrantAmount, setBulkGrantAmount] = useState("100");
  const [bulkGrantReason, setBulkGrantReason] = useState("Promotional bonus");

  // New action states
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  const [showChangeUsernameDialog, setShowChangeUsernameDialog] = useState(false);
  const [showChangeDisplayNameDialog, setShowChangeDisplayNameDialog] = useState(false);
  const [showResetCreditsDialog, setShowResetCreditsDialog] = useState(false);
  const [showClearPostsDialog, setShowClearPostsDialog] = useState(false);
  const [showResetFollowersDialog, setShowResetFollowersDialog] = useState(false);
  const [showTogglePrivateDialog, setShowTogglePrivateDialog] = useState(false);
  const [showCreditExpiryDialog, setShowCreditExpiryDialog] = useState(false);
  const [showStripeIntelDialog, setShowStripeIntelDialog] = useState(false);
  const [showSetAvatarDialog, setShowSetAvatarDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [stripeIntelData, setStripeIntelData] = useState<any>(null);
  const [stripeIntelLoading, setStripeIntelLoading] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const CACHE_ACCOUNT = "admin";
  const CACHE_NS_LIST = "customers_list";
  const CACHE_NS_DETAIL = "customer_detail";
  const CACHE_TTL = 5 * 60 * 1000;
  const DETAIL_TTL = 2 * 60 * 1000;

  const fetchCustomers = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached<CustomerSummary[]>(CACHE_ACCOUNT, CACHE_NS_LIST);
      if (cached) { setCustomers(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "list" } });
      if (error) throw error;
      const list = data.customers || [];
      setCustomers(list);
      setCache(CACHE_ACCOUNT, CACHE_NS_LIST, list, undefined, CACHE_TTL);
    } catch (err: any) { toast.error(err.message || "Failed to load customers"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-wallet-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, (payload: any) => {
        if (payload.new) {
          setCustomers(prev => prev.map(c =>
            c.user_id === payload.new.user_id
              ? { ...c, credit_balance: payload.new.balance, total_purchased_credits: payload.new.total_purchased || c.total_purchased_credits }
              : c
          ));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, (payload: any) => {
        if (payload.new && selectedUserId === payload.new.user_id) {
          fetchDetail(payload.new.user_id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    let list = [...customers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.email?.toLowerCase().includes(q) || c.display_name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") list = list.filter(c => c.account_status === filterStatus);
    if (filterChurn !== "all") list = list.filter(c => c.churn_risk === filterChurn);
    list.sort((a, b) => {
      if (sortBy === "ltv") return b.ltv - a.ltv;
      if (sortBy === "spender_score") return b.spender_score - a.spender_score;
      if (sortBy === "engagement_score") return b.engagement_score - a.engagement_score;
      if (sortBy === "credit_balance") return b.credit_balance - a.credit_balance;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setFiltered(list);
  }, [customers, search, sortBy, filterStatus, filterChurn]);

  const fetchDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setAiAnalysis(null);
    const cached = getCached<any>(CACHE_ACCOUNT, CACHE_NS_DETAIL, { userId });
    if (cached) { setDetail(cached); setDetailLoading(false); return; }
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "detail", userId } });
      if (error) throw error;
      setDetail(data);
      setCache(CACHE_ACCOUNT, CACHE_NS_DETAIL, data, { userId }, DETAIL_TTL);
    } catch (err: any) { toast.error(err.message || "Failed to load customer detail"); }
    finally { setDetailLoading(false); }
  };

  const fetchAiAnalysis = async () => {
    if (!selectedUserId) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "ai_analysis", userId: selectedUserId } });
      if (error) throw error;
      setAiAnalysis(data.analysis);
      toast.success("AI analysis complete");
    } catch (err: any) { toast.error(err.message || "AI analysis failed"); }
    finally { setAiLoading(false); }
  };

  const fetchStripeIntel = async () => {
    if (!selectedUserId) return;
    setStripeIntelLoading(true);
    setStripeIntelData(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "stripe_intel", userId: selectedUserId } });
      if (error) throw error;
      setStripeIntelData(data);
    } catch (err: any) { toast.error(err.message || "Stripe intel failed"); }
    finally { setStripeIntelLoading(false); }
  };

  const fetchAudit = async () => {
    if (!selectedUserId) return;
    setAuditLoading(true);
    setAuditData(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "full_audit", userId: selectedUserId } });
      if (error) throw error;
      setAuditData(data);
    } catch (err: any) { toast.error(err.message || "Audit failed"); }
    finally { setAuditLoading(false); }
  };

  const performAction = async (adminAction: string, actionData?: any) => {
    if (!selectedUserId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-customers", {
        body: { action: "admin_action", userId: selectedUserId, adminAction, reason: actionReason, data: actionData },
      });
      if (error) throw error;
      toast.success(`Action "${adminAction}" completed`);
      setActionReason("");
      setShowConfirmDialog(null);
      setShowNotifyDialog(false);
      setShowCreditsDialog(false);
      invalidateNamespace(CACHE_ACCOUNT, CACHE_NS_DETAIL);
      invalidateNamespace(CACHE_ACCOUNT, CACHE_NS_LIST);
      fetchDetail(selectedUserId);
    } catch (err: any) { toast.error(err.message || "Action failed"); }
    finally { setActionLoading(false); }
  };

  // ─── STATS ───
  const totalUsers = customers.length;
  const totalLTV = customers.reduce((s, c) => s + c.ltv, 0);
  const activeSpenders = customers.filter(c => c.spender_score >= 40).length;
  const whales = customers.filter(c => c.spender_score >= 70).length;
  const atRisk = customers.filter(c => c.churn_risk === "Critical" || c.churn_risk === "High").length;
  const avgEngagement = totalUsers > 0 ? Math.round(customers.reduce((s, c) => s + c.engagement_score, 0) / totalUsers) : 0;
  const totalCreditsInSystem = customers.reduce((s, c) => s + c.credit_balance, 0);
  const totalPurchasedCredits = customers.reduce((s, c) => s + c.total_purchased_credits, 0);

  // ─── DETAIL VIEW ───
  if (selectedUserId) {
    const accountStatus = detail?.profile?.account_status || "active";
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setSelectedUserId(null); setDetail(null); setAiAnalysis(null); }} className="text-white/60 hover:text-white gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Button>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
        ) : detail ? (
          <div className="space-y-5">
            {/* Customer Header */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-bold overflow-hidden">
                {detail.profile?.avatar_url ? <img src={detail.profile.avatar_url} className="w-full h-full object-cover" /> : (detail.profile?.display_name || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{detail.profile?.display_name || "Unknown"}</h2>
                <p className="text-sm text-white/40">@{detail.profile?.username} · {detail.profile?.email}</p>
                <p className="text-xs text-white/25 mt-0.5">Joined {formatDate(detail.profile?.created_at)} · {detail.insights.days_since_join} days</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Badge className={`${getStatusColor(accountStatus)} border text-xs px-3 py-1`}>{accountStatus}</Badge>
                <Badge className={`${getTierColor(detail.insights.spender_tier)} border text-xs px-3 py-1`}>{detail.insights.spender_tier}</Badge>
                <Badge className={`${getChurnColor(detail.insights.churn_risk)} text-xs px-3 py-1`}>Churn: {detail.insights.churn_risk}</Badge>
              </div>
            </div>

            {/* Admin Action Bar - 24+ actions */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex-wrap">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-2">Quick Actions:</span>
              
              {/* Status actions */}
              {accountStatus === "active" ? (
                <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 gap-1.5 text-xs h-7"
                  onClick={() => setShowConfirmDialog({ action: "pause", label: "Pause Account" })}>
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              ) : accountStatus === "paused" || accountStatus === "suspended" ? (
                <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 text-xs h-7"
                  onClick={() => performAction("activate")}>
                  <Play className="h-3 w-3" /> Reactivate
                </Button>
              ) : null}
              {accountStatus !== "suspended" && accountStatus !== "deleted" && (
                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 gap-1.5 text-xs h-7"
                  onClick={() => setShowConfirmDialog({ action: "suspend", label: "Suspend Account" })}>
                  <Ban className="h-3 w-3" /> Suspend
                </Button>
              )}
              
              {/* Communication */}
              <Button size="sm" variant="outline" className="text-sky-400 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowNotifyDialog(true)}>
                <Bell className="h-3 w-3" /> Notify
              </Button>
              <Button size="sm" variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setEmailSubject(""); setEmailBody(""); setEmailCategory("general"); setShowSendEmailDialog(true); }}>
                <Mail className="h-3 w-3" /> Send Email
              </Button>

              {/* Credits */}
              <Button size="sm" variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setCreditAction("grant"); setShowCreditsDialog(true); }}>
                <Gift className="h-3 w-3" /> Grant
              </Button>
              <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setCreditAction("revoke"); setShowCreditsDialog(true); }}>
                <Minus className="h-3 w-3" /> Revoke
              </Button>
              <Button size="sm" variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowResetCreditsDialog(true)}>
                <RotateCcw className="h-3 w-3" /> Reset Credits
              </Button>
              <Button size="sm" variant="outline" className="text-lime-400 border-lime-500/30 bg-lime-500/5 hover:bg-lime-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setDailyCreditLimit("500"); setShowCreditLimitDialog(true); }}>
                <Gauge className="h-3 w-3" /> Credit Limit
              </Button>
              <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowCreditExpiryDialog(true)}>
                <AlertCircle className="h-3 w-3" /> Expiry Warn
              </Button>

              {/* Account */}
              <Button size="sm" variant="outline" className="text-pink-400 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setSelectedPlan(detail?.stripe?.current_plan?.toLowerCase() || "free"); setPlanReason(""); setShowChangePlanDialog(true); }}>
                <Tag className="h-3 w-3" /> Plan
              </Button>
              <Button size="sm" variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowResetPasswordDialog(true)}>
                <KeyRound className="h-3 w-3" /> Password
              </Button>
              <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowVerifyEmailDialog(true)}>
                <MailCheck className="h-3 w-3" /> Verify
              </Button>
              <Button size="sm" variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowForceLogoutDialog(true)}>
                <LogOut className="h-3 w-3" /> Logout
              </Button>

              {/* Profile edits */}
              <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setNewEmail(detail?.profile?.email || ""); setShowChangeEmailDialog(true); }}>
                <AtSign className="h-3 w-3" /> Email
              </Button>
              <Button size="sm" variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setNewUsername(detail?.profile?.username || ""); setShowChangeUsernameDialog(true); }}>
                <Hash className="h-3 w-3" /> Username
              </Button>
              <Button size="sm" variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setNewDisplayName(detail?.profile?.display_name || ""); setShowChangeDisplayNameDialog(true); }}>
                <Type className="h-3 w-3" /> Name
              </Button>
              <Button size="sm" variant="outline" className="text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setNewAvatarUrl(""); setShowSetAvatarDialog(true); }}>
                <Image className="h-3 w-3" /> Avatar
              </Button>
              <Button size="sm" variant="outline" className="text-violet-400 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowTogglePrivateDialog(true)}>
                {detail?.profile?.is_private ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {detail?.profile?.is_private ? "Public" : "Private"}
              </Button>

              {/* Data */}
              <Button size="sm" variant="outline" className="text-violet-400 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setUserTags(detail?.admin_tags || []); setTagInput(""); setShowTagUserDialog(true); }}>
                <Tags className="h-3 w-3" /> Tags
              </Button>
              <Button size="sm" variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setQuickNote(""); setQuickNoteCategory("general"); setShowQuickNoteDialog(true); }}>
                <PenLine className="h-3 w-3" /> Note
              </Button>
              <Button size="sm" variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setExportSections(["profile", "transactions", "activity"]); setExportFormat("json"); setShowExportDialog(true); }}>
                <FileDown className="h-3 w-3" /> Export
              </Button>

              {/* Destructive */}
              <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowClearPostsDialog(true)}>
                <Eraser className="h-3 w-3" /> Posts
              </Button>
              <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowResetFollowersDialog(true)}>
                <UserX className="h-3 w-3" /> Followers
              </Button>
              {accountStatus !== "deleted" && (
                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 gap-1.5 text-xs h-7"
                  onClick={() => setShowConfirmDialog({ action: "delete", label: "Delete Account" })}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              )}

              {/* Intelligence */}
              <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 text-xs h-7"
                onClick={() => { setShowStripeIntelDialog(true); fetchStripeIntel(); }}>
                <CreditCard className="h-3 w-3" /> Stripe Intel
              </Button>
              <Button size="sm" variant="outline" className="text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 gap-1.5 text-xs h-7"
                onClick={() => setShowImpersonateDialog(true)}>
                <EyeIcon className="h-3 w-3" /> View User
              </Button>
              <Button size="sm" variant="outline" className="text-white/60 border-white/20 bg-white/[0.03] hover:bg-white/[0.06] gap-1.5 text-xs h-7"
                onClick={() => { setShowAccountAuditDialog(true); fetchAudit(); }}>
                <ShieldAlert className="h-3 w-3" /> Full Audit
              </Button>

              <div className="ml-auto">
                <Button size="sm" onClick={fetchAiAnalysis} disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 gap-1.5 text-xs h-7">
                  {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                  {aiLoading ? "Analyzing..." : "AI Analysis"}
                </Button>
              </div>
            </div>

            {/* AI Analysis Panel */}
            {aiAnalysis && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">AI Behavioral Intelligence</h3>
                  <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">Gemini Pro</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-white/40 uppercase">Segment</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getSegmentIcon(aiAnalysis.customer_segment)}
                        <p className="text-sm font-bold text-white">{aiAnalysis.customer_segment}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-white/40 uppercase">Churn Probability</p>
                      <p className="text-lg font-bold text-red-400 mt-1">{aiAnalysis.churn_probability}%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-white/40 uppercase">Upsell Potential</p>
                      <p className="text-lg font-bold text-emerald-400 mt-1">{aiAnalysis.upsell_potential}%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-white/40 uppercase">30-Day Forecast</p>
                      <p className="text-lg font-bold text-white mt-1">{aiAnalysis.revenue_forecast_30d}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-white/40 uppercase">90-Day Forecast</p>
                      <p className="text-lg font-bold text-white mt-1">{aiAnalysis.revenue_forecast_90d}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-semibold text-white/60 uppercase">Behavioral Profile</p>
                      <p className="text-sm text-white/80 leading-relaxed">{aiAnalysis.behavioral_profile}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {aiAnalysis.personality_tags?.map((tag, i) => (
                          <Badge key={i} className="bg-white/5 text-white/50 border-white/10 text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-semibold text-white/60 uppercase">Spending Pattern</p>
                      <p className="text-sm text-white/80 leading-relaxed">{aiAnalysis.spending_pattern}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-white/30">Engagement: <span className="text-sky-400 font-semibold">{aiAnalysis.engagement_level}</span></span>
                        <span className="text-white/30">LTV Projection: <span className="text-emerald-400 font-semibold">{aiAnalysis.lifetime_value_projection}</span></span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-emerald-400 uppercase mb-2">Recommended Actions</p>
                      <ul className="space-y-1.5">
                        {aiAnalysis.recommended_actions?.map((a, i) => (
                          <li key={i} className="text-xs text-white/70 flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span> {a}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-red-400 uppercase mb-2">Risk Factors</p>
                      <ul className="space-y-1.5">
                        {aiAnalysis.risk_factors?.map((r, i) => (
                          <li key={i} className="text-xs text-white/70 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">!</span> {r}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-amber-400 uppercase mb-2">Opportunities</p>
                      <ul className="space-y-1.5">
                        {aiAnalysis.opportunities?.map((o, i) => (
                          <li key={i} className="text-xs text-white/70 flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">*</span> {o}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/50">
                  <span><strong className="text-white/70">Next Action:</strong> {aiAnalysis.predicted_next_action}</span>
                  <span><strong className="text-white/70">Best Time:</strong> {aiAnalysis.optimal_engagement_time}</span>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: "Lifetime Value", value: `$${detail.insights.ltv.toFixed(2)}`, icon: DollarSign, accent: "text-emerald-400" },
                { label: "Projected Annual", value: `$${detail.insights.projected_annual_ltv.toFixed(0)}`, icon: TrendingUp, accent: "text-purple-400" },
                { label: "Monthly Velocity", value: `$${detail.insights.monthly_velocity.toFixed(2)}/mo`, icon: Zap, accent: "text-amber-400" },
                { label: "Credit Balance", value: (detail.wallet?.balance || 0).toLocaleString(), icon: Coins, accent: "text-sky-400" },
                { label: "Purchased Credits", value: (detail.wallet?.total_purchased || 0).toLocaleString(), icon: CreditCard, accent: "text-emerald-400" },
                { label: "Granted Credits", value: ((detail.transactions || []).filter((t: any) => t.type === "admin_grant").reduce((s: number, t: any) => s + t.amount, 0)).toLocaleString(), icon: Gift, accent: "text-purple-400" },
                { label: "Current Plan", value: detail.stripe?.current_plan || detail.insights?.current_plan || "Free", icon: Crown, accent: "text-pink-400" },
                { label: "Purchase Freq.", value: `${detail.insights.purchase_frequency.toFixed(1)}/mo`, icon: BarChart3, accent: "text-orange-400" },
              ].map(kpi => (
                <Card key={kpi.label} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={`h-3.5 w-3.5 ${kpi.accent}`} />
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <p className="text-lg font-bold text-white">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detail Tabs */}
            <Tabs defaultValue="stripe" className="space-y-4">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl gap-1 h-auto flex-wrap">
                <TabsTrigger value="stripe" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg text-xs gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Stripe
                </TabsTrigger>
                <TabsTrigger value="transactions" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg text-xs gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Credits Log
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg text-xs gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Activity
                </TabsTrigger>
                <TabsTrigger value="devices" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg text-xs gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" /> Devices
                </TabsTrigger>
                <TabsTrigger value="admin_log" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg text-xs gap-1.5">
                  <History className="h-3.5 w-3.5" /> Admin Log
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg text-xs gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </TabsTrigger>
              </TabsList>

              {/* Stripe Tab */}
              <TabsContent value="stripe">
                {detail.stripe?.error ? (
                  <Card className="bg-white/5 border-white/10"><CardContent className="p-6 text-center text-white/40">No Stripe data available</CardContent></Card>
                ) : detail.stripe ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Total Charged", value: formatCurrency(detail.stripe.total_charged_cents || 0), color: "text-emerald-400" },
                        { label: "Refunded", value: formatCurrency(detail.stripe.total_refunded_cents || 0), color: "text-red-400" },
                        { label: "Net Revenue", value: formatCurrency(detail.stripe.net_revenue_cents || 0), color: "text-sky-400" },
                        { label: "Plan", value: detail.stripe.current_plan || "Free", color: "text-purple-400" },
                      ].map(s => (
                        <Card key={s.label} className="bg-white/5 border-white/10">
                          <CardContent className="p-3">
                            <p className="text-[10px] text-white/40 uppercase">{s.label}</p>
                            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {/* Subscription History */}
                    {detail.stripe.all_subscriptions?.length > 0 && (
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <p className="text-xs font-semibold text-white/60 uppercase mb-3">Subscription History</p>
                          <div className="space-y-2">
                            {detail.stripe.all_subscriptions.map((sub: any) => (
                              <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                <div className="flex items-center gap-3">
                                  <Badge className={sub.status === "active" ? "bg-emerald-500/15 text-emerald-400" : sub.status === "canceled" ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/50"}>
                                    {sub.status}
                                  </Badge>
                                  <span className="text-sm text-white font-medium">{sub.plan}</span>
                                  <span className="text-xs text-white/30">{sub.interval}ly</span>
                                </div>
                                <div className="text-xs text-white/40">
                                  {formatDate(sub.start_date)}
                                  {sub.canceled_at && <span className="text-red-400 ml-2">Canceled {formatDate(sub.canceled_at)}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {/* Recent Charges */}
                    {detail.stripe.charges?.length > 0 && (
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <p className="text-xs font-semibold text-white/60 uppercase mb-3">Recent Charges</p>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1.5">
                              {detail.stripe.charges.slice(0, 20).map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={c.refunded ? "text-red-400" : "text-emerald-400"}>{formatCurrency(c.amount)}</span>
                                    {c.card_brand && <span className="text-white/30">{c.card_brand} •••• {c.card_last4}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white/30">{formatDateTime(c.created)}</span>
                                    {c.receipt_url && <a href={c.receipt_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-white/20 hover:text-white/50" /></a>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : <Card className="bg-white/5 border-white/10"><CardContent className="p-6 text-center text-white/40">No Stripe customer found</CardContent></Card>}
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1.5">
                        {(detail.transactions || []).map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs">
                            <div className="flex items-center gap-2">
                              <Badge className={tx.type === "purchase" ? "bg-emerald-500/10 text-emerald-400" : tx.type === "admin_grant" ? "bg-purple-500/10 text-purple-400" : tx.type === "admin_revoke" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/40"}>
                                {tx.type}
                              </Badge>
                              <span className={tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-white/30 max-w-[200px] truncate">{tx.description}</span>
                              <span className="text-white/20">{formatDateTime(tx.created_at)}</span>
                            </div>
                          </div>
                        ))}
                        {(!detail.transactions || detail.transactions.length === 0) && <p className="text-sm text-white/30 text-center py-8">No transactions found</p>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1.5">
                        {(detail.login_activity || []).map((la: any) => (
                          <div key={la.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3 text-white/20" />
                              <span className="text-white/60">{la.ip_address || "Unknown IP"}</span>
                              <span className="text-white/30">{la.device || "Unknown device"}</span>
                            </div>
                            <span className="text-white/20">{formatDateTime(la.login_at)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Devices Tab */}
              <TabsContent value="devices">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {(detail.device_sessions || []).map((ds: any) => (
                        <div key={ds.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <Smartphone className="h-4 w-4 text-white/30" />
                            <div>
                              <p className="text-sm text-white">{ds.device_name}</p>
                              <p className="text-xs text-white/30">{ds.browser} · {ds.os}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={ds.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}>{ds.status}</Badge>
                            <p className="text-[10px] text-white/20 mt-1">{timeAgo(ds.last_active_at)}</p>
                          </div>
                        </div>
                      ))}
                      {(!detail.device_sessions || detail.device_sessions.length === 0) && <p className="text-sm text-white/30 text-center py-8">No device sessions</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admin Log Tab */}
              <TabsContent value="admin_log">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1.5">
                        {(detail.admin_actions || []).map((aa: any) => (
                          <div key={aa.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-white/5 text-white/50">{aa.action_type}</Badge>
                              <span className="text-white/40">{aa.reason}</span>
                            </div>
                            <span className="text-white/20">{formatDateTime(aa.created_at)}</span>
                          </div>
                        ))}
                        {(!detail.admin_actions || detail.admin_actions.length === 0) && <p className="text-sm text-white/30 text-center py-8">No admin actions logged</p>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed">
                      {detail.profile?.admin_notes || "No admin notes for this user."}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {/* ═══════════════════ ALL DIALOGS ═══════════════════ */}

        {/* Notify Dialog */}
        <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>Send In-App Notification</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="Title" className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              <Textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} placeholder="Message..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 min-h-[80px] resize-none" />
              <Select value={notifyType} onValueChange={setNotifyType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNotifyDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => performAction("send_notification", { title: notifyTitle, message: notifyMessage, notification_type: notifyType })} disabled={!notifyTitle.trim() || actionLoading} className="bg-sky-600 text-white hover:bg-sky-700">
                {actionLoading ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credits Dialog */}
        <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>{creditAction === "grant" ? "Grant Credits" : "Revoke Credits"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="Amount..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreditsDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => performAction(creditAction === "grant" ? "grant_credits" : "revoke_credits", { amount: parseInt(creditAmount) })}
                disabled={!creditAmount || parseInt(creditAmount) <= 0 || actionLoading}
                className={creditAction === "grant" ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-red-600 text-white hover:bg-red-700"}>
                {actionLoading ? "Processing..." : creditAction === "grant" ? "Grant" : "Revoke"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>{showConfirmDialog?.label}</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Are you sure? This action will be logged.</p>
            <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason (optional)..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowConfirmDialog(null)} className="text-white/50">Cancel</Button>
              <Button onClick={() => performAction(showConfirmDialog!.action)} disabled={actionLoading} className="bg-red-600 text-white hover:bg-red-700">
                {actionLoading ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-cyan-400" /> Force Password Reset</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">This sends a branded reset email to {detail?.profile?.email}.</p>
            <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowResetPasswordDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("reset_password"); setShowResetPasswordDialog(false); }} disabled={actionLoading} className="bg-cyan-600 text-white hover:bg-cyan-700">Send Reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Note Dialog */}
        <Dialog open={showQuickNoteDialog} onOpenChange={setShowQuickNoteDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-teal-400" /> Quick Note</DialogTitle></DialogHeader>
            <Select value={quickNoteCategory} onValueChange={setQuickNoteCategory}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="behavior">Behavior Flag</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={quickNote} onChange={e => setQuickNote(e.target.value)} placeholder="Note..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 min-h-[100px] resize-none" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowQuickNoteDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("add_note", { note: quickNote, category: quickNoteCategory }); setShowQuickNoteDialog(false); }} disabled={!quickNote.trim() || actionLoading} className="bg-teal-600 text-white hover:bg-teal-700">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Plan Dialog */}
        <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-pink-400" /> Change Plan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                <div><p className="text-xs text-white/40">Current</p><p className="text-sm font-bold text-white">{detail?.stripe?.current_plan || detail?.insights?.current_plan || "Free"}</p></div>
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "free", label: "Free", activeColor: "border-white/40 bg-white/10" },
                  { value: "starter", label: "Starter", activeColor: "border-emerald-500/50 bg-emerald-500/10" },
                  { value: "pro", label: "Pro", activeColor: "border-sky-500/50 bg-sky-500/10" },
                  { value: "business", label: "Business", activeColor: "border-purple-500/50 bg-purple-500/10" },
                ].map(plan => (
                  <button key={plan.value} onClick={() => setSelectedPlan(plan.value)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedPlan === plan.value ? plan.activeColor + " text-white" : "border-white/10 text-white/60 bg-white/[0.02] hover:border-white/20"}`}>
                    {plan.label}
                  </button>
                ))}
              </div>
              <Input value={planReason} onChange={e => setPlanReason(e.target.value)} placeholder="Reason..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              <div className="p-3 rounded-lg bg-pink-500/5 border border-pink-500/15">
                <p className="text-xs text-pink-300/80">This overrides the user's plan immediately. Any active Stripe subscriptions will be canceled.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowChangePlanDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={async () => {
                setShowChangePlanDialog(false);
                setActionLoading(true);
                try {
                  const { error } = await supabase.functions.invoke("admin-customers", {
                    body: { action: "admin_action", userId: selectedUserId, adminAction: "change_plan", reason: planReason || `Plan changed to ${selectedPlan}`, data: { plan: selectedPlan } },
                  });
                  if (error) throw error;
                  toast.success(`Plan changed to ${selectedPlan}`);
                  invalidateNamespace(CACHE_ACCOUNT, CACHE_NS_DETAIL);
                  invalidateNamespace(CACHE_ACCOUNT, CACHE_NS_LIST);
                  if (selectedUserId) fetchDetail(selectedUserId);
                  fetchCustomers(true);
                } catch (err: any) { toast.error(err.message || "Failed"); }
                finally { setActionLoading(false); }
              }} disabled={actionLoading} className="bg-pink-600 text-white hover:bg-pink-700">
                {actionLoading ? "Updating..." : "Update Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><FileDown className="h-5 w-5 text-indigo-400" /> Export Data</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                {["json", "csv"].map(f => (
                  <button key={f} onClick={() => setExportFormat(f)} className={`flex-1 p-2.5 rounded-xl border text-sm font-medium ${exportFormat === f ? "border-indigo-500/50 bg-indigo-500/10 text-white" : "border-white/10 text-white/50"}`}>{f.toUpperCase()}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["profile", "transactions", "activity", "devices", "stripe", "admin_log"].map(s => (
                  <button key={s} onClick={() => setExportSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    className={`p-2 rounded-xl border text-xs font-medium ${exportSections.includes(s) ? "border-indigo-500/40 bg-indigo-500/10 text-white" : "border-white/10 text-white/40"}`}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowExportDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => {
                const exportData: any = {};
                if (exportSections.includes("profile")) exportData.profile = detail?.profile;
                if (exportSections.includes("transactions")) exportData.transactions = detail?.transactions;
                if (exportSections.includes("activity")) exportData.login_activity = detail?.login_activity;
                if (exportSections.includes("devices")) exportData.devices = detail?.device_sessions;
                if (exportSections.includes("stripe")) exportData.stripe = detail?.stripe;
                if (exportSections.includes("admin_log")) exportData.admin_actions = detail?.admin_actions;
                let blob: Blob, filename: string;
                if (exportFormat === "csv") {
                  const rows = Object.entries(exportData).map(([key, val]) => `${key},${JSON.stringify(val)}`);
                  blob = new Blob(["section,data\n" + rows.join("\n")], { type: "text/csv" });
                  filename = `user-${detail?.profile?.username || selectedUserId}-export.csv`;
                } else {
                  blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                  filename = `user-${detail?.profile?.username || selectedUserId}-export.json`;
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported as ${exportFormat.toUpperCase()}`);
                setShowExportDialog(false);
              }} disabled={exportSections.length === 0} className="bg-indigo-600 text-white hover:bg-indigo-700">Export</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verify Email */}
        <Dialog open={showVerifyEmailDialog} onOpenChange={setShowVerifyEmailDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MailCheck className="h-5 w-5 text-emerald-400" /> Verify Email</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Manually confirm {detail?.profile?.email}?</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowVerifyEmailDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("verify_email"); setShowVerifyEmailDialog(false); }} disabled={actionLoading} className="bg-emerald-600 text-white hover:bg-emerald-700">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Force Logout */}
        <Dialog open={showForceLogoutDialog} onOpenChange={setShowForceLogoutDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-rose-400" /> Force Logout</DialogTitle></DialogHeader>
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
              <p className="text-sm text-rose-300 font-medium">This will terminate ALL active sessions globally.</p>
            </div>
            <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowForceLogoutDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("force_logout"); setShowForceLogoutDialog(false); }} disabled={actionLoading} className="bg-rose-600 text-white hover:bg-rose-700">Force Logout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tag User */}
        <Dialog open={showTagUserDialog} onOpenChange={setShowTagUserDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-violet-400" /> Tag User</DialogTitle></DialogHeader>
            <div className="flex flex-wrap gap-2">
              {["VIP", "High Priority", "Whale", "At Risk", "Influencer", "Beta Tester", "Support Issue", "Churning"].map(tag => (
                <button key={tag} onClick={() => setUserTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${userTags.includes(tag) ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-white/10 text-white/40"}`}>{tag}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Custom tag..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { setUserTags(prev => [...prev, tagInput.trim()]); setTagInput(""); } }} />
              <Button size="sm" onClick={() => { if (tagInput.trim()) { setUserTags(prev => [...prev, tagInput.trim()]); setTagInput(""); } }} className="bg-violet-600 text-white hover:bg-violet-700">Add</Button>
            </div>
            {userTags.length > 0 && <div className="flex flex-wrap gap-1.5">{userTags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 text-violet-300 text-xs border border-violet-500/20">{tag}<button onClick={() => setUserTags(prev => prev.filter((_, idx) => idx !== i))} className="text-violet-400 hover:text-white ml-0.5">x</button></span>
            ))}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowTagUserDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("tag_user", { tags: userTags }); setShowTagUserDialog(false); }} disabled={userTags.length === 0 || actionLoading} className="bg-violet-600 text-white hover:bg-violet-700">Apply {userTags.length} Tags</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credit Limit */}
        <Dialog open={showCreditLimitDialog} onOpenChange={setShowCreditLimitDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-lime-400" /> Daily Credit Limit</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Current: {detail?.daily_credit_limit || "unlimited"}</p>
            <div className="grid grid-cols-4 gap-2">
              {["100", "250", "500", "0"].map(v => (
                <button key={v} onClick={() => setDailyCreditLimit(v)} className={`p-2 rounded-xl border text-sm ${dailyCreditLimit === v ? "border-lime-500/50 bg-lime-500/10 text-white" : "border-white/10 text-white/50"}`}>{v === "0" ? "None" : v}</button>
              ))}
            </div>
            <Input type="number" value={dailyCreditLimit} onChange={e => setDailyCreditLimit(e.target.value)} placeholder="Custom..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreditLimitDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("set_credit_limit", { daily_limit: parseInt(dailyCreditLimit) || 0 }); setShowCreditLimitDialog(false); }} disabled={actionLoading} className="bg-lime-600 text-white hover:bg-lime-700">Set Limit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Email */}
        <Dialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-yellow-400" /> Send Email</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/50">To: <span className="text-white">{detail?.profile?.email}</span></div>
              <Select value={emailCategory} onValueChange={setEmailCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="update">Platform Update</SelectItem>
                </SelectContent>
              </Select>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Message..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 min-h-[100px] resize-none" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowSendEmailDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("send_email", { subject: emailSubject, body: emailBody, category: emailCategory }); setShowSendEmailDialog(false); }} disabled={!emailSubject.trim() || !emailBody.trim() || actionLoading} className="bg-yellow-600 text-white hover:bg-yellow-700">Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View As User - ENHANCED */}
        <Dialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><EyeIcon className="h-5 w-5 text-fuchsia-400" /> View As User — Full Snapshot</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Identity */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Identity</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-white/40 text-xs">Display Name</span><p className="text-white font-medium">{detail?.profile?.display_name || "N/A"}</p></div>
                  <div><span className="text-white/40 text-xs">Username</span><p className="text-white font-medium">@{detail?.profile?.username || "N/A"}</p></div>
                  <div><span className="text-white/40 text-xs">Email</span><p className="text-white font-medium text-xs">{detail?.profile?.email || "N/A"}</p></div>
                  <div><span className="text-white/40 text-xs">User ID</span><p className="text-white/60 font-mono text-[10px]">{selectedUserId}</p></div>
                  <div><span className="text-white/40 text-xs">Status</span><p className="text-white font-medium capitalize">{detail?.profile?.account_status || "active"}</p></div>
                  <div><span className="text-white/40 text-xs">Privacy</span><p className="text-white font-medium">{detail?.profile?.is_private ? "Private" : "Public"}</p></div>
                  <div><span className="text-white/40 text-xs">Joined</span><p className="text-white font-medium">{detail?.profile?.created_at ? formatDate(detail.profile.created_at) : "N/A"}</p></div>
                  <div><span className="text-white/40 text-xs">Email Confirmed</span><p className="text-white font-medium">{detail?.auth_meta?.email_confirmed ? "Yes" : "No"}</p></div>
                  <div><span className="text-white/40 text-xs">Auth Provider</span><p className="text-white font-medium">{detail?.auth_meta?.providers?.join(", ") || "email"}</p></div>
                </div>
              </div>
              {/* Financials */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Financial Snapshot</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-white/40 text-xs">Balance</span><p className="text-amber-400 font-bold">{(detail?.wallet?.balance || 0).toLocaleString()} cr</p></div>
                  <div><span className="text-white/40 text-xs">Total Purchased</span><p className="text-emerald-400 font-bold">{(detail?.wallet?.total_purchased || 0).toLocaleString()} cr</p></div>
                  <div><span className="text-white/40 text-xs">Plan</span><p className="text-pink-400 font-bold">{detail?.stripe?.current_plan || detail?.insights?.current_plan || "Free"}</p></div>
                  <div><span className="text-white/40 text-xs">LTV</span><p className="text-white font-bold">${detail?.insights?.ltv?.toFixed(2) || "0.00"}</p></div>
                  <div><span className="text-white/40 text-xs">Monthly Velocity</span><p className="text-white font-medium">${detail?.insights?.monthly_velocity?.toFixed(2) || "0"}/mo</p></div>
                  <div><span className="text-white/40 text-xs">Projected Annual</span><p className="text-white font-medium">${detail?.insights?.projected_annual_ltv?.toFixed(0) || "0"}</p></div>
                  <div><span className="text-white/40 text-xs">Charges</span><p className="text-white font-medium">{detail?.stripe?.charge_count || 0}</p></div>
                  <div><span className="text-white/40 text-xs">Refunds</span><p className="text-red-400 font-medium">{detail?.stripe?.refund_count || 0}</p></div>
                </div>
              </div>
              {/* Social */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Social & Activity</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-white/40 text-xs">Posts</span><p className="text-white font-medium">{detail?.profile?.post_count || 0}</p></div>
                  <div><span className="text-white/40 text-xs">Followers</span><p className="text-white font-medium">{detail?.insights?.follower_count_real || detail?.profile?.follower_count || 0}</p></div>
                  <div><span className="text-white/40 text-xs">Following</span><p className="text-white font-medium">{detail?.insights?.following_count_real || detail?.profile?.following_count || 0}</p></div>
                  <div><span className="text-white/40 text-xs">Rank</span><p className="text-white font-medium capitalize">{detail?.user_rank?.rank_tier || "N/A"}</p></div>
                  <div><span className="text-white/40 text-xs">XP</span><p className="text-white font-medium">{detail?.user_rank?.xp || 0}</p></div>
                  <div><span className="text-white/40 text-xs">Points</span><p className="text-white font-medium">{detail?.user_rank?.points_balance || 0}</p></div>
                  <div><span className="text-white/40 text-xs">Last Login</span><p className="text-white font-medium">{detail?.auth_meta?.last_sign_in_at ? timeAgo(detail.auth_meta.last_sign_in_at) : "Never"}</p></div>
                  <div><span className="text-white/40 text-xs">Devices</span><p className="text-white font-medium">{(detail?.device_sessions || []).length}</p></div>
                </div>
              </div>
              {/* Tags & Limits */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Admin Config</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/40 text-xs">Tags</span><p className="text-white font-medium">{detail?.admin_tags?.length > 0 ? detail.admin_tags.join(", ") : "None"}</p></div>
                  <div><span className="text-white/40 text-xs">Daily Credit Limit</span><p className="text-white font-medium">{detail?.daily_credit_limit || "Unlimited"}</p></div>
                  <div><span className="text-white/40 text-xs">Bio</span><p className="text-white/60 text-xs truncate">{detail?.profile?.bio || "No bio"}</p></div>
                  <div><span className="text-white/40 text-xs">Company</span><p className="text-white font-medium">{detail?.profile?.company || "N/A"}</p></div>
                </div>
              </div>
              {/* Recent Posts */}
              {detail?.recent_posts?.length > 0 && (
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Recent Posts</p>
                  <div className="space-y-2">
                    {detail.recent_posts.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs">
                        <span className="text-white/60 truncate max-w-[60%]">{p.content || "No content"}</span>
                        <div className="flex items-center gap-2 text-white/30">
                          <span>{p.like_count} likes</span>
                          <span>{p.comment_count} comments</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowImpersonateDialog(false)} className="text-white/50">Close</Button>
              <Button onClick={() => { performAction("impersonate_view"); setShowImpersonateDialog(false); toast.success("View logged"); }} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700">Log Audit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Grant Credits */}
        <Dialog open={showBulkGrantDialog} onOpenChange={setShowBulkGrantDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-blue-400" /> Bonus Credits</DialogTitle></DialogHeader>
            <div className="grid grid-cols-4 gap-2">
              {["50", "100", "250", "500"].map(v => (
                <button key={v} onClick={() => setBulkGrantAmount(v)} className={`p-2 rounded-xl border text-sm ${bulkGrantAmount === v ? "border-blue-500/50 bg-blue-500/10 text-white" : "border-white/10 text-white/50"}`}>{v} cr</button>
              ))}
            </div>
            <Input type="number" value={bulkGrantAmount} onChange={e => setBulkGrantAmount(e.target.value)} placeholder="Custom..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <Input value={bulkGrantReason} onChange={e => setBulkGrantReason(e.target.value)} placeholder="Reason..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowBulkGrantDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { setActionReason(bulkGrantReason); performAction("grant_credits", { amount: parseInt(bulkGrantAmount) }); setShowBulkGrantDialog(false); }} disabled={actionLoading} className="bg-blue-600 text-white hover:bg-blue-700">Grant</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ NEW ACTIONS ═══ */}

        {/* Change Email */}
        <Dialog open={showChangeEmailDialog} onOpenChange={setShowChangeEmailDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AtSign className="h-5 w-5 text-blue-400" /> Change Email</DialogTitle></DialogHeader>
            <p className="text-xs text-white/40">Current: {detail?.profile?.email}</p>
            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowChangeEmailDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("change_email", { new_email: newEmail }); setShowChangeEmailDialog(false); }} disabled={!newEmail.includes("@") || actionLoading} className="bg-blue-600 text-white hover:bg-blue-700">Update Email</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Username */}
        <Dialog open={showChangeUsernameDialog} onOpenChange={setShowChangeUsernameDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Hash className="h-5 w-5 text-indigo-400" /> Change Username</DialogTitle></DialogHeader>
            <p className="text-xs text-white/40">Current: @{detail?.profile?.username}</p>
            <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="New username..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowChangeUsernameDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("change_username", { new_username: newUsername }); setShowChangeUsernameDialog(false); }} disabled={!newUsername.trim() || actionLoading} className="bg-indigo-600 text-white hover:bg-indigo-700">Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Display Name */}
        <Dialog open={showChangeDisplayNameDialog} onOpenChange={setShowChangeDisplayNameDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Type className="h-5 w-5 text-teal-400" /> Change Display Name</DialogTitle></DialogHeader>
            <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="New name..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowChangeDisplayNameDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("set_display_name", { display_name: newDisplayName }); setShowChangeDisplayNameDialog(false); }} disabled={!newDisplayName.trim() || actionLoading} className="bg-teal-600 text-white hover:bg-teal-700">Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Credits */}
        <Dialog open={showResetCreditsDialog} onOpenChange={setShowResetCreditsDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-rose-400" /> Reset Credits to Zero</DialogTitle></DialogHeader>
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
              <p className="text-sm text-rose-300">Current balance: <strong>{(detail?.wallet?.balance || 0).toLocaleString()}</strong> credits. This will set it to 0.</p>
            </div>
            <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowResetCreditsDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("reset_credits"); setShowResetCreditsDialog(false); }} disabled={actionLoading} className="bg-rose-600 text-white hover:bg-rose-700">Reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Posts */}
        <Dialog open={showClearPostsDialog} onOpenChange={setShowClearPostsDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Eraser className="h-5 w-5 text-red-400" /> Clear All Posts</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">This permanently deletes all {detail?.profile?.post_count || 0} posts by this user.</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowClearPostsDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("clear_posts"); setShowClearPostsDialog(false); }} disabled={actionLoading} className="bg-red-600 text-white hover:bg-red-700">Delete Posts</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Followers */}
        <Dialog open={showResetFollowersDialog} onOpenChange={setShowResetFollowersDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><UserX className="h-5 w-5 text-red-400" /> Reset Follow Graph</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Removes all followers and following for this user. Counts reset to 0.</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowResetFollowersDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("reset_followers"); setShowResetFollowersDialog(false); }} disabled={actionLoading} className="bg-red-600 text-white hover:bg-red-700">Reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toggle Private */}
        <Dialog open={showTogglePrivateDialog} onOpenChange={setShowTogglePrivateDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2">{detail?.profile?.is_private ? <Unlock className="h-5 w-5 text-emerald-400" /> : <Lock className="h-5 w-5 text-amber-400" />} Toggle Privacy</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Account is currently <strong>{detail?.profile?.is_private ? "Private" : "Public"}</strong>. Switch to <strong>{detail?.profile?.is_private ? "Public" : "Private"}</strong>?</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowTogglePrivateDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("toggle_private"); setShowTogglePrivateDialog(false); }} disabled={actionLoading} className="bg-amber-600 text-white hover:bg-amber-700">Toggle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credit Expiry Warning */}
        <Dialog open={showCreditExpiryDialog} onOpenChange={setShowCreditExpiryDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-400" /> Send Credit Expiry Warning</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Sends a branded email warning that their {(detail?.wallet?.balance || 0).toLocaleString()} credits are expiring soon.</p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreditExpiryDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("send_credits_expiry_warning"); setShowCreditExpiryDialog(false); }} disabled={actionLoading} className="bg-amber-600 text-white hover:bg-amber-700">Send Warning</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Set Avatar */}
        <Dialog open={showSetAvatarDialog} onOpenChange={setShowSetAvatarDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Image className="h-5 w-5 text-fuchsia-400" /> Set Avatar URL</DialogTitle></DialogHeader>
            <Input value={newAvatarUrl} onChange={e => setNewAvatarUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            {newAvatarUrl && <div className="flex justify-center"><img src={newAvatarUrl} className="w-16 h-16 rounded-full object-cover border border-white/10" onError={(e) => (e.currentTarget.style.display = "none")} /></div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowSetAvatarDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => { performAction("set_avatar", { avatar_url: newAvatarUrl }); setShowSetAvatarDialog(false); }} disabled={!newAvatarUrl.trim() || actionLoading} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700">Set Avatar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stripe Intelligence */}
        <Dialog open={showStripeIntelDialog} onOpenChange={setShowStripeIntelDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-400" /> Stripe Intelligence</DialogTitle></DialogHeader>
            {stripeIntelLoading ? (
              <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" /></div>
            ) : stripeIntelData?.error ? (
              <p className="text-sm text-white/40 text-center py-8">{stripeIntelData.error}</p>
            ) : stripeIntelData ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { l: "Total Paid", v: formatCurrency(stripeIntelData.summary.total_paid), c: "text-emerald-400" },
                    { l: "Refunded", v: formatCurrency(stripeIntelData.summary.total_refunded), c: "text-red-400" },
                    { l: "Charges", v: `${stripeIntelData.summary.successful_charges}/${stripeIntelData.summary.total_charges}`, c: "text-sky-400" },
                    { l: "Active Subs", v: stripeIntelData.summary.active_subs, c: "text-purple-400" },
                    { l: "Canceled", v: stripeIntelData.summary.canceled_subs, c: "text-orange-400" },
                  ].map(s => (
                    <Card key={s.l} className="bg-white/5 border-white/10">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-white/40 uppercase">{s.l}</p>
                        <p className={`text-lg font-bold mt-1 ${s.c}`}>{s.v}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Customer */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-white/40 uppercase mb-2">Customer</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-white/30">ID</span><p className="text-white/60 font-mono">{stripeIntelData.customer.id}</p></div>
                      <div><span className="text-white/30">Created</span><p className="text-white/60">{formatDate(stripeIntelData.customer.created)}</p></div>
                      <div><span className="text-white/30">Balance</span><p className="text-white/60">{formatCurrency(Math.abs(stripeIntelData.customer.balance || 0))}</p></div>
                    </div>
                  </CardContent>
                </Card>
                {/* Payment Methods */}
                {stripeIntelData.payment_methods?.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-white/40 uppercase mb-2">Payment Methods</p>
                      <div className="space-y-1.5">
                        {stripeIntelData.payment_methods.map((pm: any) => (
                          <div key={pm.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] text-xs">
                            <CreditCard className="h-3.5 w-3.5 text-white/30" />
                            <span className="text-white capitalize">{pm.brand}</span>
                            <span className="text-white/40">**** {pm.last4}</span>
                            <span className="text-white/30">Exp {pm.exp_month}/{pm.exp_year}</span>
                            <span className="text-white/20">{pm.country}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Subscriptions */}
                {stripeIntelData.subscriptions?.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-white/40 uppercase mb-2">All Subscriptions ({stripeIntelData.subscriptions.length})</p>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1.5">
                          {stripeIntelData.subscriptions.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className={s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : s.status === "canceled" ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/50"}>{s.status}</Badge>
                                <span className="text-white font-medium">{s.plan}</span>
                                <span className="text-white/30">{formatCurrency(s.amount || 0)}/{s.interval}</span>
                              </div>
                              <div className="text-white/30">
                                {formatDate(s.start)}
                                {s.canceled_at && <span className="text-red-400 ml-1"> → {formatDate(s.canceled_at)}</span>}
                                {s.cancel_at_period_end && <span className="text-amber-400 ml-1">(canceling)</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                {/* Charges */}
                {stripeIntelData.charges?.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-white/40 uppercase mb-2">All Charges ({stripeIntelData.charges.length})</p>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1">
                          {stripeIntelData.charges.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs">
                              <div className="flex items-center gap-2">
                                <span className={c.refunded ? "text-red-400 line-through" : c.paid ? "text-emerald-400" : "text-white/40"}>{formatCurrency(c.amount)}</span>
                                {c.card_brand && <span className="text-white/30">{c.card_brand} •{c.card_last4}</span>}
                                {c.description && <span className="text-white/20 truncate max-w-[150px]">{c.description}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white/20">{formatDateTime(c.created)}</span>
                                {c.receipt_url && <a href={c.receipt_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-white/20 hover:text-white/50" /></a>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                {/* Invoices */}
                {stripeIntelData.invoices?.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-white/40 uppercase mb-2">Invoices ({stripeIntelData.invoices.length})</p>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-1">
                          {stripeIntelData.invoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className={inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"}>{inv.status}</Badge>
                                <span className="text-white">{formatCurrency(inv.amount_paid || inv.amount_due)}</span>
                                {inv.number && <span className="text-white/20">#{inv.number}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white/20">{formatDateTime(inv.created)}</span>
                                {inv.hosted_invoice_url && <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-white/20 hover:text-white/50" /></a>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : <p className="text-sm text-white/30 text-center py-8">Loading...</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowStripeIntelDialog(false)} className="text-white/50">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Full Audit */}
        <Dialog open={showAccountAuditDialog} onOpenChange={setShowAccountAuditDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-white/60" /> Full Account Audit</DialogTitle></DialogHeader>
            {auditLoading ? (
              <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" /></div>
            ) : auditData ? (
              <div className="space-y-4">
                {/* Analytics summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { l: "Total Transactions", v: auditData.analytics.total_transactions },
                    { l: "Purchased Credits", v: auditData.analytics.total_purchased_credits.toLocaleString() },
                    { l: "Granted Credits", v: auditData.analytics.total_granted_credits.toLocaleString() },
                    { l: "Deducted Credits", v: auditData.analytics.total_deducted_credits.toLocaleString() },
                    { l: "Total Logins", v: auditData.analytics.total_logins },
                    { l: "Unique IPs", v: auditData.analytics.unique_ips },
                    { l: "Unique Devices", v: auditData.analytics.unique_devices },
                    { l: "Total Posts", v: auditData.analytics.total_posts },
                    { l: "Total Likes", v: auditData.analytics.total_likes_received },
                    { l: "Total Comments", v: auditData.analytics.total_comments_received },
                    { l: "Purchases", v: auditData.analytics.purchase_count },
                    { l: "Grants", v: auditData.analytics.grant_count },
                  ].map(s => (
                    <Card key={s.l} className="bg-white/5 border-white/10">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-white/40 uppercase">{s.l}</p>
                        <p className="text-lg font-bold text-white mt-1">{s.v}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Parsed Notes */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-white/40 uppercase mb-2">Admin Config</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-white/30">Tags</span><p className="text-white">{auditData.parsed_notes.tags.length > 0 ? auditData.parsed_notes.tags.join(", ") : "None"}</p></div>
                      <div><span className="text-white/30">Credit Limit</span><p className="text-white">{auditData.parsed_notes.credit_limit}</p></div>
                      <div><span className="text-white/30">Plan Override</span><p className="text-white">{auditData.parsed_notes.plan_override || "None"}</p></div>
                      <div><span className="text-white/30">Email Confirmed</span><p className="text-white">{auditData.auth_meta?.email_confirmed ? "Yes" : "No"}</p></div>
                      <div><span className="text-white/30">Force Logout At</span><p className="text-white">{auditData.auth_meta?.force_logout_at || "Never"}</p></div>
                      <div><span className="text-white/30">Rank</span><p className="text-white capitalize">{auditData.user_rank?.rank_tier || "N/A"} (XP: {auditData.user_rank?.xp || 0})</p></div>
                    </div>
                  </CardContent>
                </Card>
                {/* Admin Actions */}
                {auditData.admin_actions?.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-white/40 uppercase mb-2">Admin Action Log ({auditData.admin_actions.length})</p>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1">
                          {auditData.admin_actions.map((aa: any) => (
                            <div key={aa.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-white/5 text-white/50">{aa.action_type}</Badge>
                                <span className="text-white/40 truncate max-w-[200px]">{aa.reason}</span>
                              </div>
                              <span className="text-white/20">{formatDateTime(aa.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                {/* Notes */}
                {auditData.parsed_notes.raw_notes && (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-white/40 uppercase mb-2">Raw Notes</p>
                      <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono">{auditData.parsed_notes.raw_notes}</pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : <p className="text-sm text-white/30 text-center py-8">Loading audit data...</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAccountAuditDialog(false)} className="text-white/50">Close</Button>
              <Button onClick={() => {
                if (!auditData) return;
                const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `audit-${selectedUserId}.json`; a.click();
                URL.revokeObjectURL(url);
                toast.success("Audit exported");
              }} className="bg-white/10 text-white hover:bg-white/20"><FileDown className="h-3.5 w-3.5 mr-1.5" />Export Audit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Users", value: totalUsers.toLocaleString(), icon: Users, accent: "text-sky-400" },
          { label: "Total LTV", value: `$${totalLTV.toFixed(0)}`, icon: DollarSign, accent: "text-emerald-400" },
          { label: "Active Spenders", value: activeSpenders, icon: Zap, accent: "text-amber-400" },
          { label: "Whales", value: whales, icon: Crown, accent: "text-purple-400" },
          { label: "At Risk", value: atRisk, icon: AlertTriangle, accent: "text-red-400" },
          { label: "Avg Engagement", value: `${avgEngagement}%`, icon: Target, accent: "text-sky-400" },
          { label: "Credits in System", value: totalCreditsInSystem.toLocaleString(), icon: Coins, accent: "text-amber-400" },
          { label: "Purchased Credits", value: totalPurchasedCredits.toLocaleString(), icon: CreditCard, accent: "text-emerald-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-3.5 w-3.5 ${s.accent}`} />
                <span className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25" />
        </div>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
            <SelectItem value="spender_score">Spender Score</SelectItem>
            <SelectItem value="engagement_score">Engagement</SelectItem>
            <SelectItem value="ltv">LTV</SelectItem>
            <SelectItem value="credit_balance">Balance</SelectItem>
            <SelectItem value="created_at">Newest</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterChurn} onValueChange={setFilterChurn}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => fetchCustomers(true)} className="text-white/50 border-white/10">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.user_id} onClick={() => fetchDetail(c.user_id)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold flex-shrink-0 overflow-hidden">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : (c.display_name || "?")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{c.display_name || "Unknown"}</h3>
                    <Badge className={`${getStatusColor(c.account_status)} border text-[10px] px-1.5 py-0`}>{c.account_status}</Badge>
                    {c.current_plan && c.current_plan !== "Free" && (
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-1.5 py-0">{c.current_plan}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/30 truncate">@{c.username} · {c.email}</p>
                </div>
                <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-white/30">Balance</p>
                    <p className="text-sm font-bold text-amber-400">{c.credit_balance.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/30">LTV</p>
                    <p className="text-sm font-bold text-emerald-400">${c.ltv.toFixed(0)}</p>
                  </div>
                  <div className="w-16">
                    <p className="text-xs text-white/30">Spender</p>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5"><div className={`h-full rounded-full ${c.spender_score >= 70 ? "bg-emerald-500" : c.spender_score >= 40 ? "bg-amber-500" : "bg-white/20"}`} style={{ width: `${c.spender_score}%` }} /></div>
                      <span className="text-[10px] text-white/40">{c.spender_score}</span>
                    </div>
                  </div>
                  <Badge className={`${getChurnColor(c.churn_risk)} text-[10px] px-1.5 py-0`}>{c.churn_risk}</Badge>
                  {getTrendIcon(c.purchase_trend)}
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/10 group-hover:text-white/40 transition-colors flex-shrink-0" />
              </div>
            ))}
            {filtered.length === 0 && !loading && <p className="text-sm text-white/30 text-center py-12">No customers found</p>}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AdminCustomers;

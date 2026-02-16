import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";

// ─── Types ───
interface CustomerSummary {
  user_id: string; email: string; display_name: string; username: string;
  avatar_url: string | null; created_at: string; account_status: string;
  credit_balance: number; total_purchased_credits: number; purchase_count: number;
  total_spent_cents: number; tx_purchase_count: number; tx_total_credits: number;
  last_purchase: string | null; first_purchase: string | null;
  ltv: number; avg_order_value: number; days_since_join: number; monthly_velocity: number;
  spender_score: number; engagement_score: number; churn_risk: string;
  last_login: string | null; days_since_last_login: number;
  post_count: number; avg_purchase_credits: number; purchase_trend: string;
  follower_count: number;
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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "list" } });
      if (error) throw error;
      setCustomers(data.customers || []);
    } catch (err: any) { toast.error(err.message || "Failed to load customers"); }
    finally { setLoading(false); }
  }, []);

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
    setDetailLoading(true);
    setDetail(null);
    setAiAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", { body: { action: "detail", userId } });
      if (error) throw error;
      setDetail(data);
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

            {/* Admin Action Bar */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex-wrap">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-2">Actions:</span>
              {accountStatus === "active" ? (
                <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 gap-1.5 text-xs h-8"
                  onClick={() => setShowConfirmDialog({ action: "pause", label: "Pause Account" })}>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </Button>
              ) : accountStatus === "paused" ? (
                <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 text-xs h-8"
                  onClick={() => performAction("activate")}>
                  <Play className="h-3.5 w-3.5" /> Reactivate
                </Button>
              ) : null}
              {accountStatus !== "suspended" && accountStatus !== "deleted" && (
                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 gap-1.5 text-xs h-8"
                  onClick={() => setShowConfirmDialog({ action: "suspend", label: "Suspend Account" })}>
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </Button>
              )}
              {accountStatus === "suspended" && (
                <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 text-xs h-8"
                  onClick={() => performAction("activate")}>
                  <Play className="h-3.5 w-3.5" /> Unsuspend
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-sky-400 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 gap-1.5 text-xs h-8"
                onClick={() => setShowNotifyDialog(true)}>
                <Bell className="h-3.5 w-3.5" /> Send Message
              </Button>
              <Button size="sm" variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 gap-1.5 text-xs h-8"
                onClick={() => { setCreditAction("grant"); setShowCreditsDialog(true); }}>
                <Gift className="h-3.5 w-3.5" /> Grant Credits
              </Button>
              <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 gap-1.5 text-xs h-8"
                onClick={() => { setCreditAction("revoke"); setShowCreditsDialog(true); }}>
                <Minus className="h-3.5 w-3.5" /> Revoke Credits
              </Button>
              {accountStatus !== "deleted" && (
                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 gap-1.5 text-xs h-8"
                  onClick={() => setShowConfirmDialog({ action: "delete", label: "Delete Account" })}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <div className="ml-auto">
                <Button size="sm" onClick={fetchAiAnalysis} disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 gap-1.5 text-xs h-8">
                  {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                  {aiLoading ? "Analyzing..." : "AI Deep Analysis"}
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
                {/* AI KPI Row */}
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

                {/* AI Deep Insights */}
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
                          <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-red-400 uppercase mb-2">Risk Factors</p>
                      <ul className="space-y-1.5">
                        {aiAnalysis.risk_factors?.map((r, i) => (
                          <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">⚠</span> {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-amber-400 uppercase mb-2">Opportunities</p>
                      <ul className="space-y-1.5">
                        {aiAnalysis.opportunities?.map((o, i) => (
                          <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">★</span> {o}
                          </li>
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Lifetime Value", value: `$${detail.insights.ltv.toFixed(2)}`, icon: DollarSign, accent: "text-emerald-400" },
                { label: "Projected Annual", value: `$${detail.insights.projected_annual_ltv.toFixed(0)}`, icon: TrendingUp, accent: "text-purple-400" },
                { label: "Monthly Velocity", value: `$${detail.insights.monthly_velocity.toFixed(2)}/mo`, icon: Zap, accent: "text-amber-400" },
                { label: "Credit Balance", value: (detail.wallet?.balance || 0).toLocaleString(), icon: Coins, accent: "text-sky-400" },
                { label: "Current Plan", value: detail.stripe?.current_plan || "Free", icon: Crown, accent: "text-pink-400" },
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
                        { label: "Total Charged", value: formatCurrency(detail.stripe.total_charged_cents), color: "text-emerald-400" },
                        { label: "Refunded", value: formatCurrency(detail.stripe.total_refunded_cents), color: "text-red-400" },
                        { label: "Net Revenue", value: formatCurrency(detail.stripe.net_revenue_cents), color: "text-white" },
                        { label: "Charges / Refunds", value: `${detail.stripe.charge_count} / ${detail.stripe.refund_count}`, color: "text-white" },
                      ].map(s => (
                        <Card key={s.label} className="bg-white/5 border-white/10"><CardContent className="p-4">
                          <p className="text-[10px] text-white/40 uppercase mb-1">{s.label}</p>
                          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        </CardContent></Card>
                      ))}
                    </div>
                    {detail.stripe.all_subscriptions?.length > 0 && (
                      <Card className="bg-white/5 border-white/10">
                        <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Subscriptions</CardTitle></CardHeader>
                        <CardContent><div className="space-y-2">
                          {detail.stripe.all_subscriptions.map((sub: any) => (
                            <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                              <div className="flex items-center gap-3">
                                <Badge className={sub.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/40"}>{sub.status}</Badge>
                                <span className="text-sm text-white font-medium">{sub.plan} ({sub.interval}ly)</span>
                                <span className="text-xs text-white/30">{formatCurrency(sub.amount)}/{sub.interval}</span>
                              </div>
                              <div className="text-xs text-white/30">
                                {sub.cancel_at_period_end && <span className="text-red-400 mr-2">Cancels at period end</span>}
                                Ends {formatDate(sub.current_period_end)}
                              </div>
                            </div>
                          ))}
                        </div></CardContent>
                      </Card>
                    )}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Payment History</CardTitle></CardHeader>
                      <CardContent><ScrollArea className="h-[300px]"><div className="space-y-1.5">
                        {(detail.stripe.charges || []).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${c.refunded ? "bg-red-400" : c.paid ? "bg-emerald-400" : "bg-amber-400"}`} />
                              <div>
                                <p className="text-sm text-white">{formatCurrency(c.amount)}</p>
                                <p className="text-[10px] text-white/30">{c.description || c.payment_method_type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/30">{formatDateTime(c.created)}</span>
                              {c.receipt_url && <a href={c.receipt_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80"><ExternalLink className="h-3.5 w-3.5" /></a>}
                            </div>
                          </div>
                        ))}
                        {(!detail.stripe.charges || detail.stripe.charges.length === 0) && <p className="text-center text-white/30 text-sm py-8">No charges found</p>}
                      </div></ScrollArea></CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-white/5 border-white/10"><CardContent className="p-6 text-center text-white/40">No Stripe account</CardContent></Card>
                )}
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Credit Transactions</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[400px]"><div className="space-y-1.5">
                    {(detail.transactions || []).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "purchase" ? "bg-emerald-500/10" : tx.type === "admin_grant" ? "bg-purple-500/10" : tx.type === "admin_revoke" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                            {tx.type === "purchase" ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> :
                             tx.type === "admin_grant" ? <Gift className="h-4 w-4 text-purple-400" /> :
                             tx.type === "admin_revoke" ? <Minus className="h-4 w-4 text-red-400" /> :
                             <ArrowDownRight className="h-4 w-4 text-amber-400" />}
                          </div>
                          <div>
                            <p className="text-sm text-white">{tx.amount > 0 ? "+" : ""}{tx.amount} credits</p>
                            <p className="text-[10px] text-white/30">{tx.description || tx.type}</p>
                          </div>
                        </div>
                        <span className="text-xs text-white/30">{timeAgo(tx.created_at)}</span>
                      </div>
                    ))}
                    {(!detail.transactions || detail.transactions.length === 0) && <p className="text-center text-white/30 text-sm py-8">No transactions</p>}
                  </div></ScrollArea></CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Login Activity</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[300px]"><div className="space-y-1.5">
                    {(detail.login_activity || []).map((la: any) => (
                      <div key={la.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-white/30" />
                          <div>
                            <p className="text-sm text-white">{la.login_type || "Password"}</p>
                            <p className="text-[10px] text-white/30">{la.device || la.ip_address || "Unknown device"}</p>
                          </div>
                        </div>
                        <span className="text-xs text-white/30">{timeAgo(la.login_at)}</span>
                      </div>
                    ))}
                    {(!detail.login_activity || detail.login_activity.length === 0) && <p className="text-center text-white/30 text-sm py-8">No login activity</p>}
                  </div></ScrollArea></CardContent>
                </Card>
              </TabsContent>

              {/* Devices Tab */}
              <TabsContent value="devices">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Device Sessions</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[300px]"><div className="space-y-1.5">
                    {(detail.device_sessions || []).map((ds: any) => (
                      <div key={ds.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-4 w-4 text-white/30" />
                          <div>
                            <p className="text-sm text-white">{ds.device_name} {ds.is_current && <span className="text-emerald-400 text-[10px]">● Active</span>}</p>
                            <p className="text-[10px] text-white/30">{ds.browser} · {ds.os} · {ds.device_type}</p>
                          </div>
                        </div>
                        <span className="text-xs text-white/30">{timeAgo(ds.last_active_at)}</span>
                      </div>
                    ))}
                    {(!detail.device_sessions || detail.device_sessions.length === 0) && <p className="text-center text-white/30 text-sm py-8">No device sessions</p>}
                  </div></ScrollArea></CardContent>
                </Card>
              </TabsContent>

              {/* Admin Log Tab */}
              <TabsContent value="admin_log">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Admin Action History</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[300px]"><div className="space-y-1.5">
                    {(detail.admin_actions || []).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-accent" />
                          <div>
                            <p className="text-sm text-white font-medium">{a.action_type}</p>
                            {a.reason && <p className="text-[10px] text-white/30">{a.reason}</p>}
                          </div>
                        </div>
                        <span className="text-xs text-white/30">{timeAgo(a.created_at)}</span>
                      </div>
                    ))}
                    {(!detail.admin_actions || detail.admin_actions.length === 0) && <p className="text-center text-white/30 text-sm py-8">No admin actions recorded</p>}
                  </div></ScrollArea></CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Admin Notes</CardTitle></CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full min-h-[200px] p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-accent focus:outline-none transition-colors text-sm"
                      placeholder="Write admin notes about this customer..."
                      defaultValue={detail.profile?.admin_notes || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (detail.profile?.admin_notes || "")) {
                          performAction("update_notes", { notes: e.target.value });
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {/* Send Notification Dialog */}
        <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>Send Notification to User</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Type</label>
                <Select value={notifyType} onValueChange={setNotifyType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="urgent">🚨 Urgent</SelectItem>
                    <SelectItem value="success">✅ Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Title</label>
                <Input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="Notification title..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Message</label>
                <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} placeholder="Your message..."
                  className="w-full min-h-[100px] p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNotifyDialog(false)} className="text-white/50">Cancel</Button>
              <Button onClick={() => performAction("send_notification", { title: notifyTitle, message: notifyMessage, notification_type: notifyType })}
                disabled={!notifyTitle || !notifyMessage || actionLoading}
                className="bg-accent text-white hover:bg-accent/80">
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
              <div>
                <label className="text-xs text-white/50 mb-1 block">Amount</label>
                <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="Number of credits..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Reason</label>
                <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              </div>
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

        {/* Confirm Action Dialog */}
        <Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
          <DialogContent className="bg-[hsl(220,30%,12%)] border-white/10 text-white">
            <DialogHeader><DialogTitle>{showConfirmDialog?.label}</DialogTitle></DialogHeader>
            <p className="text-sm text-white/60">Are you sure you want to {showConfirmDialog?.label.toLowerCase()}? This action will be logged.</p>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Reason (optional)</label>
              <Input value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder="Reason for this action..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowConfirmDialog(null)} className="text-white/50">Cancel</Button>
              <Button onClick={() => performAction(showConfirmDialog!.action)} disabled={actionLoading}
                className="bg-red-600 text-white hover:bg-red-700">
                {actionLoading ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, accent: "text-sky-400" },
          { label: "Total LTV", value: `$${totalLTV.toFixed(0)}`, icon: DollarSign, accent: "text-emerald-400" },
          { label: "Active Spenders", value: activeSpenders, icon: TrendingUp, accent: "text-amber-400" },
          { label: "Whales 🐳", value: whales, icon: Crown, accent: "text-purple-400" },
          { label: "At Risk", value: atRisk, icon: AlertTriangle, accent: "text-red-400" },
          { label: "Avg Engagement", value: `${avgEngagement}%`, icon: Activity, accent: "text-pink-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5"><s.icon className={`h-4 w-4 ${s.accent}`} /></div>
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search, Filters & Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input placeholder="Search by email, name, or username..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterChurn} onValueChange={setFilterChurn}>
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white text-xs"><SelectValue placeholder="Churn Risk" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,30%,15%)] border-white/10 text-white">
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {(["spender_score", "engagement_score", "ltv", "credit_balance", "created_at"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${sortBy === s ? "bg-accent/20 text-accent border border-accent/30" : "text-white/40 hover:text-white/60 border border-transparent"}`}>
              {s === "spender_score" ? "Spender" : s === "engagement_score" ? "Engage" : s === "ltv" ? "LTV" : s === "credit_balance" ? "Credits" : "Newest"}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchCustomers} className="text-white/40 hover:text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : (
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="space-y-1.5">
            {filtered.map(c => (
              <div key={c.user_id} onClick={() => fetchDetail(c.user_id)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] cursor-pointer transition-all group">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent text-sm font-bold overflow-hidden flex-shrink-0">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : (c.display_name || c.email || "?")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{c.display_name || "No name"}</p>
                    {c.username && <span className="text-[10px] text-white/25">@{c.username}</span>}
                    <Badge className={`${getStatusColor(c.account_status)} border text-[9px] px-1.5 py-0`}>{c.account_status}</Badge>
                  </div>
                  <p className="text-[10px] text-white/30 truncate">{c.email}</p>
                </div>

                {/* Spender Score */}
                <div className="text-center w-14">
                  <div className={`px-2 py-1 rounded-lg border text-xs font-bold ${getSpenderColor(c.spender_score)}`}>{c.spender_score}</div>
                  <p className="text-[9px] text-white/20 mt-0.5">spend</p>
                </div>

                {/* Engagement Score */}
                <div className="text-center w-14">
                  <div className={`px-2 py-1 rounded-lg border text-xs font-bold ${getEngagementColor(c.engagement_score)}`}>{c.engagement_score}</div>
                  <p className="text-[9px] text-white/20 mt-0.5">engage</p>
                </div>

                {/* Churn Risk */}
                <Badge className={`${getChurnColor(c.churn_risk)} text-[10px] px-2`}>{c.churn_risk}</Badge>

                {/* Trend */}
                <div className="w-8 flex justify-center">{getTrendIcon(c.purchase_trend)}</div>

                {/* LTV */}
                <div className="text-right w-16">
                  <p className="text-sm font-semibold text-white">${c.ltv.toFixed(0)}</p>
                  <p className="text-[9px] text-white/20">LTV</p>
                </div>

                {/* Credits */}
                <div className="text-right w-16">
                  <p className="text-sm font-semibold text-amber-400">{c.credit_balance.toLocaleString()}</p>
                  <p className="text-[9px] text-white/20">credits</p>
                </div>

                {/* Last active */}
                <div className="text-right w-16 hidden lg:block">
                  <p className="text-xs text-white/40">{c.last_login ? timeAgo(c.last_login) : "Never"}</p>
                </div>

                <Eye className="h-4 w-4 text-white/20 group-hover:text-accent transition-colors" />
              </div>
            ))}
            {filtered.length === 0 && !loading && <p className="text-center text-white/30 py-12">No customers found</p>}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AdminCustomers;

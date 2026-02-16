import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Search, DollarSign, TrendingUp, CreditCard, ArrowLeft,
  Crown, AlertTriangle, Clock, ExternalLink, Mail, Calendar,
  Coins, ShieldCheck, Smartphone, Globe, BarChart3, Zap, Target,
  ArrowUpRight, ArrowDownRight, Receipt, RefreshCw, Eye,
} from "lucide-react";

interface CustomerSummary {
  user_id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  credit_balance: number;
  total_purchased_credits: number;
  purchase_count: number;
  total_spent_cents: number;
  tx_purchase_count: number;
  tx_total_credits: number;
  last_purchase: string | null;
  first_purchase: string | null;
  ltv: number;
  avg_order_value: number;
  days_since_join: number;
  monthly_velocity: number;
  spender_score: number;
}

interface CustomerDetail {
  profile: any;
  wallet: any;
  transactions: any[];
  login_activity: any[];
  device_sessions: any[];
  stripe: any;
  insights: {
    ltv: number;
    monthly_velocity: number;
    projected_annual_ltv: number;
    purchase_frequency: number;
    days_since_join: number;
    days_since_last_charge: number;
    spender_tier: string;
    churn_risk: string;
  };
}

const getSpenderColor = (score: number) => {
  if (score >= 70) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
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
  const [sortBy, setSortBy] = useState<"ltv" | "spender_score" | "created_at" | "credit_balance">("spender_score");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", {
        body: { action: "list" },
      });
      if (error) throw error;
      setCustomers(data.customers || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    let list = [...customers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.email?.toLowerCase().includes(q) ||
        c.display_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "ltv") return b.ltv - a.ltv;
      if (sortBy === "spender_score") return b.spender_score - a.spender_score;
      if (sortBy === "credit_balance") return b.credit_balance - a.credit_balance;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setFiltered(list);
  }, [customers, search, sortBy]);

  const fetchDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-customers", {
        body: { action: "detail", userId },
      });
      if (error) throw error;
      setDetail(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load customer detail");
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── STATS ───
  const totalUsers = customers.length;
  const totalLTV = customers.reduce((s, c) => s + c.ltv, 0);
  const avgLTV = totalUsers > 0 ? totalLTV / totalUsers : 0;
  const activeSpenders = customers.filter(c => c.spender_score >= 40).length;
  const whales = customers.filter(c => c.spender_score >= 70).length;

  // ─── DETAIL VIEW ───
  if (selectedUserId) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" onClick={() => { setSelectedUserId(null); setDetail(null); }} className="text-white/60 hover:text-white gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Button>

        {detailLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            {/* Customer Header */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-bold overflow-hidden">
                {detail.profile?.avatar_url ? (
                  <img src={detail.profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  (detail.profile?.display_name || "?")[0]?.toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{detail.profile?.display_name || "Unknown"}</h2>
                <p className="text-sm text-white/40">@{detail.profile?.username} · {detail.profile?.email}</p>
                <p className="text-xs text-white/25 mt-0.5">Joined {formatDate(detail.profile?.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getTierColor(detail.insights.spender_tier)} border text-xs px-3 py-1`}>
                  {detail.insights.spender_tier}
                </Badge>
                <Badge className={`${getChurnColor(detail.insights.churn_risk)} text-xs px-3 py-1`}>
                  Churn: {detail.insights.churn_risk}
                </Badge>
              </div>
            </div>

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
              </TabsList>

              {/* Stripe Tab */}
              <TabsContent value="stripe">
                {detail.stripe?.error ? (
                  <Card className="bg-white/5 border-white/10"><CardContent className="p-6 text-center text-white/40">No Stripe data available</CardContent></Card>
                ) : detail.stripe ? (
                  <div className="space-y-4">
                    {/* Stripe Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Total Charged</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(detail.stripe.total_charged_cents)}</p>
                      </CardContent></Card>
                      <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Refunded</p>
                        <p className="text-lg font-bold text-red-400">{formatCurrency(detail.stripe.total_refunded_cents)}</p>
                      </CardContent></Card>
                      <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Net Revenue</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(detail.stripe.net_revenue_cents)}</p>
                      </CardContent></Card>
                      <Card className="bg-white/5 border-white/10"><CardContent className="p-4">
                        <p className="text-[10px] text-white/40 uppercase mb-1">Charges / Refunds</p>
                        <p className="text-lg font-bold text-white">{detail.stripe.charge_count} / {detail.stripe.refund_count}</p>
                      </CardContent></Card>
                    </div>

                    {/* Subscriptions */}
                    {detail.stripe.all_subscriptions?.length > 0 && (
                      <Card className="bg-white/5 border-white/10">
                        <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Subscriptions</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-2">
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
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Charge History */}
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Payment History</CardTitle></CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1.5">
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
                                  {c.receipt_url && (
                                    <a href={c.receipt_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!detail.stripe.charges || detail.stripe.charges.length === 0) && (
                              <p className="text-center text-white/30 text-sm py-8">No charges found</p>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
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
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1.5">
                        {(detail.transactions || []).map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "purchase" ? "bg-emerald-500/10" : tx.type === "admin_grant" ? "bg-purple-500/10" : "bg-red-500/10"}`}>
                                {tx.type === "purchase" ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> :
                                 tx.type === "admin_grant" ? <Crown className="h-4 w-4 text-purple-400" /> :
                                 <ArrowDownRight className="h-4 w-4 text-red-400" />}
                              </div>
                              <div>
                                <p className="text-sm text-white">{tx.type === "purchase" ? "+" : tx.amount > 0 ? "+" : ""}{tx.amount} credits</p>
                                <p className="text-[10px] text-white/30">{tx.description || tx.type}</p>
                              </div>
                            </div>
                            <span className="text-xs text-white/30">{timeAgo(tx.created_at)}</span>
                          </div>
                        ))}
                        {(!detail.transactions || detail.transactions.length === 0) && (
                          <p className="text-center text-white/30 text-sm py-8">No transactions</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Login Activity</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1.5">
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
                        {(!detail.login_activity || detail.login_activity.length === 0) && (
                          <p className="text-center text-white/30 text-sm py-8">No login activity</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Devices Tab */}
              <TabsContent value="devices">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Device Sessions</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1.5">
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
                        {(!detail.device_sessions || detail.device_sessions.length === 0) && (
                          <p className="text-center text-white/30 text-sm py-8">No device sessions</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, accent: "text-sky-400" },
          { label: "Total LTV", value: `$${totalLTV.toFixed(0)}`, icon: DollarSign, accent: "text-emerald-400" },
          { label: "Active Spenders", value: activeSpenders, icon: TrendingUp, accent: "text-amber-400" },
          { label: "Whales 🐳", value: whales, icon: Crown, accent: "text-purple-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5">
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search by email, name, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {(["spender_score", "ltv", "credit_balance", "created_at"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                sortBy === s ? "bg-accent/20 text-accent border border-accent/30" : "text-white/40 hover:text-white/60 border border-transparent"
              }`}
            >
              {s === "spender_score" ? "Score" : s === "ltv" ? "LTV" : s === "credit_balance" ? "Credits" : "Newest"}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchCustomers} className="text-white/40 hover:text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="space-y-1.5">
            {filtered.map(c => (
              <div
                key={c.user_id}
                onClick={() => fetchDetail(c.user_id)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] cursor-pointer transition-all group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent text-sm font-bold overflow-hidden flex-shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    (c.display_name || c.email || "?")[0]?.toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{c.display_name || "No name"}</p>
                    {c.username && <span className="text-[10px] text-white/25">@{c.username}</span>}
                  </div>
                  <p className="text-[10px] text-white/30 truncate">{c.email}</p>
                </div>

                {/* Spender Score */}
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${getSpenderColor(c.spender_score)}`}>
                  {c.spender_score}
                </div>

                {/* LTV */}
                <div className="text-right w-20">
                  <p className="text-sm font-semibold text-white">${c.ltv.toFixed(0)}</p>
                  <p className="text-[10px] text-white/25">LTV</p>
                </div>

                {/* Credits */}
                <div className="text-right w-20">
                  <p className="text-sm font-semibold text-amber-400">{c.credit_balance.toLocaleString()}</p>
                  <p className="text-[10px] text-white/25">credits</p>
                </div>

                {/* Purchases */}
                <div className="text-right w-16">
                  <p className="text-sm text-white">{c.purchase_count}</p>
                  <p className="text-[10px] text-white/25">orders</p>
                </div>

                {/* Joined */}
                <div className="text-right w-20 hidden lg:block">
                  <p className="text-xs text-white/40">{timeAgo(c.created_at)}</p>
                </div>

                <Eye className="h-4 w-4 text-white/20 group-hover:text-accent transition-colors" />
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="text-center text-white/30 py-12">No customers found</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AdminCustomers;

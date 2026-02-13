import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone, RefreshCw, Plus, Trash2, Play, Pause, BarChart3,
  DollarSign, Target, Eye, MousePointer, Users, TrendingUp,
  Loader2, ChevronRight, AlertCircle, Zap, PieChart,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const IGAdsManager = ({ selectedAccount }: Props) => {
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [accountInsights, setAccountInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("overview");

  // Create campaign form
  const [newCampaign, setNewCampaign] = useState({ name: "", objective: "OUTCOME_TRAFFIC", daily_budget: "1000", status: "PAUSED" });
  // Create ad set form
  const [newAdSet, setNewAdSet] = useState({ name: "", campaign_id: "", daily_budget: "1000", optimization_goal: "LINK_CLICKS", age_min: "18", age_max: "65", countries: "US", interests: "" });
  // Targeting search
  const [targetingQuery, setTargetingQuery] = useState("");
  const [targetingResults, setTargetingResults] = useState<any[]>([]);

  const callApi = async (body: any) => {
    if (!selectedAccount) { toast.error("No account selected"); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", { body: { ...body, account_id: selectedAccount } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      return data.data;
    } catch (e: any) {
      toast.error(e.message || "API error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchAdAccounts = async () => {
    const d = await callApi({ action: "get_ad_accounts" });
    if (d?.data) {
      setAdAccounts(d.data);
      if (d.data.length > 0 && !selectedAdAccount) {
        setSelectedAdAccount(d.data[0].id);
      }
      toast.success(`Found ${d.data.length} ad accounts`);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedAdAccount) { toast.error("Select an ad account first"); return; }
    const d = await callApi({ action: "get_ad_campaigns", params: { ad_account_id: selectedAdAccount, limit: 50 } });
    if (d?.data) { setCampaigns(d.data); toast.success(`${d.data.length} campaigns loaded`); }
  };

  const fetchAdSets = async (campaignId?: string) => {
    const params: any = campaignId ? { campaign_id: campaignId } : { ad_account_id: selectedAdAccount };
    const d = await callApi({ action: "get_ad_sets", params: { ...params, limit: 50 } });
    if (d?.data) { setAdSets(d.data); }
  };

  const fetchAds = async (adSetId?: string) => {
    const params: any = adSetId ? { ad_set_id: adSetId } : { ad_account_id: selectedAdAccount };
    const d = await callApi({ action: "get_ads", params: { ...params, limit: 50 } });
    if (d?.data) { setAds(d.data); }
  };

  const fetchInsights = async (objectId: string, datePreset = "last_30d") => {
    const d = await callApi({ action: "get_ad_insights", params: { object_id: objectId, date_preset: datePreset, time_increment: "1" } });
    if (d) setInsights(d);
  };

  const fetchAccountInsights = async (datePreset = "last_30d") => {
    if (!selectedAdAccount) return;
    const d = await callApi({ action: "get_ad_account_insights", params: { ad_account_id: selectedAdAccount, date_preset: datePreset } });
    if (d) setAccountInsights(d);
  };

  const createCampaign = async () => {
    if (!selectedAdAccount || !newCampaign.name) { toast.error("Fill campaign name"); return; }
    const d = await callApi({
      action: "create_ad_campaign",
      params: {
        ad_account_id: selectedAdAccount,
        name: newCampaign.name,
        objective: newCampaign.objective,
        daily_budget: parseInt(newCampaign.daily_budget),
        status: newCampaign.status,
      },
    });
    if (d) { toast.success("Campaign created!"); fetchCampaigns(); setNewCampaign({ name: "", objective: "OUTCOME_TRAFFIC", daily_budget: "1000", status: "PAUSED" }); }
  };

  const createAdSet = async () => {
    if (!selectedAdAccount || !newAdSet.name || !newAdSet.campaign_id) { toast.error("Fill all fields"); return; }
    const targeting: any = {
      geo_locations: { countries: newAdSet.countries.split(",").map(c => c.trim().toUpperCase()) },
      age_min: parseInt(newAdSet.age_min),
      age_max: parseInt(newAdSet.age_max),
    };
    if (newAdSet.interests) {
      targeting.flexible_spec = [{ interests: newAdSet.interests.split(",").map(i => ({ name: i.trim() })) }];
    }
    const d = await callApi({
      action: "create_ad_set",
      params: {
        ad_account_id: selectedAdAccount,
        campaign_id: newAdSet.campaign_id,
        name: newAdSet.name,
        daily_budget: parseInt(newAdSet.daily_budget),
        optimization_goal: newAdSet.optimization_goal,
        targeting,
        status: "PAUSED",
      },
    });
    if (d) { toast.success("Ad Set created!"); fetchAdSets(newAdSet.campaign_id); }
  };

  const toggleStatus = async (type: string, id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const actionMap: any = { campaign: "update_campaign_status", adset: "update_adset_status", ad: "update_ad_status" };
    const paramKey: any = { campaign: "campaign_id", adset: "adset_id", ad: "ad_id" };
    await callApi({ action: actionMap[type], params: { [paramKey[type]]: id, status: newStatus } });
    toast.success(`${type} ${newStatus.toLowerCase()}`);
    if (type === "campaign") fetchCampaigns();
    else if (type === "adset") fetchAdSets();
    else fetchAds();
  };

  const searchTargeting = async () => {
    if (!targetingQuery) return;
    const d = await callApi({ action: "get_targeting_options", params: { query: targetingQuery, type: "adinterest", limit: 20 } });
    if (d?.data) setTargetingResults(d.data);
  };

  const statusColor = (status: string) => {
    if (status === "ACTIVE") return "bg-green-500/15 text-green-400";
    if (status === "PAUSED") return "bg-yellow-500/15 text-yellow-400";
    return "bg-red-500/15 text-red-400";
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-orange-400" /> Ads Manager
          </h3>
          <p className="text-[10px] text-muted-foreground">Create, manage & optimize ad campaigns via Meta Marketing API</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchAdAccounts} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Load Accounts
          </Button>
        </div>
      </div>

      {/* Ad Account Selector */}
      {adAccounts.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Ad Account:</span>
              <select value={selectedAdAccount} onChange={e => setSelectedAdAccount(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1 text-xs flex-1">
                {adAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name || a.account_id} ({a.currency})</option>
                ))}
              </select>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { fetchCampaigns(); fetchAccountInsights(); }}>
                <BarChart3 className="h-3 w-3 mr-1" />Load Data
              </Button>
            </div>
            {/* Quick stats from selected ad account */}
            {adAccounts.find(a => a.id === selectedAdAccount) && (() => {
              const acct = adAccounts.find(a => a.id === selectedAdAccount);
              return (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-muted/30 rounded p-2 text-center">
                    <p className="text-xs font-bold text-foreground">{formatCurrency(parseInt(acct.amount_spent || "0"))}</p>
                    <p className="text-[9px] text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="bg-muted/30 rounded p-2 text-center">
                    <p className="text-xs font-bold text-foreground">{formatCurrency(parseInt(acct.balance || "0"))}</p>
                    <p className="text-[9px] text-muted-foreground">Balance</p>
                  </div>
                  <div className="bg-muted/30 rounded p-2 text-center">
                    <p className="text-xs font-bold text-foreground">{formatCurrency(parseInt(acct.daily_spend_limit || "0"))}</p>
                    <p className="text-[9px] text-muted-foreground">Daily Limit</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Account-level insights */}
      {accountInsights?.data?.[0] && (
        <Card className="border-orange-500/20">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><PieChart className="h-3.5 w-3.5 text-orange-400" />Account Performance (30d)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["impressions", "reach", "spend", "clicks", "cpc", "cpm", "ctr"].map(metric => {
                const val = accountInsights.data[0][metric];
                if (!val) return null;
                const display = metric === "spend" ? `$${parseFloat(val).toFixed(2)}` : metric === "cpc" || metric === "cpm" ? `$${parseFloat(val).toFixed(2)}` : metric === "ctr" ? `${parseFloat(val).toFixed(2)}%` : parseInt(val).toLocaleString();
                return (
                  <div key={metric} className="bg-muted/30 rounded p-2 text-center">
                    <p className="text-sm font-bold text-foreground">{display}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">{metric}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-background">Campaigns</TabsTrigger>
          <TabsTrigger value="create" className="text-xs data-[state=active]:bg-background">Create</TabsTrigger>
          <TabsTrigger value="targeting" className="text-xs data-[state=active]:bg-background">Targeting</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs data-[state=active]:bg-background">Insights</TabsTrigger>
        </TabsList>

        {/* CAMPAIGNS OVERVIEW */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          {campaigns.length === 0 ? (
            <Card><CardContent className="p-6 text-center"><Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Load ad accounts and campaigns to get started</p></CardContent></Card>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {campaigns.map(c => (
                  <Card key={c.id} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge className={`${statusColor(c.effective_status || c.status)} text-[10px]`}>{c.effective_status || c.status}</Badge>
                          <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toggleStatus("campaign", c.id, c.status)}>
                            {c.status === "ACTIVE" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { fetchAdSets(c.id); fetchInsights(c.id); }}>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span><Target className="h-3 w-3 inline mr-0.5" />{c.objective?.replace("OUTCOME_", "")}</span>
                        {c.daily_budget && <span><DollarSign className="h-3 w-3 inline mr-0.5" />{formatCurrency(parseInt(c.daily_budget))}/day</span>}
                        {c.lifetime_budget && <span><DollarSign className="h-3 w-3 inline mr-0.5" />{formatCurrency(parseInt(c.lifetime_budget))} lifetime</span>}
                        {c.budget_remaining && <span>{formatCurrency(parseInt(c.budget_remaining))} remaining</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Ad Sets */}
          {adSets.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <h4 className="text-xs font-semibold text-foreground mb-2">Ad Sets ({adSets.length})</h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1.5">
                    {adSets.map(as => (
                      <div key={as.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${statusColor(as.effective_status || as.status)} text-[9px]`}>{as.effective_status || as.status}</Badge>
                            <span className="text-xs text-foreground truncate">{as.name}</span>
                          </div>
                          <div className="flex gap-2 text-[9px] text-muted-foreground mt-0.5">
                            {as.daily_budget && <span>{formatCurrency(parseInt(as.daily_budget))}/day</span>}
                            <span>{as.optimization_goal}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => toggleStatus("adset", as.id, as.status)}>
                            {as.status === "ACTIVE" ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => fetchAds(as.id)}>
                            <ChevronRight className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Ads */}
          {ads.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <h4 className="text-xs font-semibold text-foreground mb-2">Ads ({ads.length})</h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1.5">
                    {ads.map(ad => (
                      <div key={ad.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${statusColor(ad.effective_status || ad.status)} text-[9px]`}>{ad.effective_status || ad.status}</Badge>
                            <span className="text-xs text-foreground truncate">{ad.name}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => toggleStatus("ad", ad.id, ad.status)}>
                          {ad.status === "ACTIVE" ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CREATE */}
        <TabsContent value="create" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Create Campaign</h4>
              <Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} placeholder="Campaign name" className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newCampaign.objective} onChange={e => setNewCampaign(p => ({ ...p, objective: e.target.value }))} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-xs">
                  <option value="OUTCOME_TRAFFIC">Traffic</option>
                  <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                  <option value="OUTCOME_AWARENESS">Awareness</option>
                  <option value="OUTCOME_LEADS">Leads</option>
                  <option value="OUTCOME_SALES">Sales</option>
                  <option value="OUTCOME_APP_PROMOTION">App Promotion</option>
                </select>
                <Input value={newCampaign.daily_budget} onChange={e => setNewCampaign(p => ({ ...p, daily_budget: e.target.value }))} placeholder="Daily budget (cents)" className="text-xs" />
              </div>
              <Button size="sm" onClick={createCampaign} disabled={loading || !newCampaign.name}>
                <Zap className="h-3.5 w-3.5 mr-1" />Create Campaign
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Create Ad Set</h4>
              <Input value={newAdSet.name} onChange={e => setNewAdSet(p => ({ ...p, name: e.target.value }))} placeholder="Ad Set name" className="text-sm" />
              <select value={newAdSet.campaign_id} onChange={e => setNewAdSet(p => ({ ...p, campaign_id: e.target.value }))} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-xs">
                <option value="">Select campaign...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <Input value={newAdSet.daily_budget} onChange={e => setNewAdSet(p => ({ ...p, daily_budget: e.target.value }))} placeholder="Budget (cents)" className="text-xs" />
                <Input value={newAdSet.age_min} onChange={e => setNewAdSet(p => ({ ...p, age_min: e.target.value }))} placeholder="Min age" className="text-xs" />
                <Input value={newAdSet.age_max} onChange={e => setNewAdSet(p => ({ ...p, age_max: e.target.value }))} placeholder="Max age" className="text-xs" />
              </div>
              <Input value={newAdSet.countries} onChange={e => setNewAdSet(p => ({ ...p, countries: e.target.value }))} placeholder="Countries (US,GB,CA)" className="text-xs" />
              <Input value={newAdSet.interests} onChange={e => setNewAdSet(p => ({ ...p, interests: e.target.value }))} placeholder="Interests (comma separated)" className="text-xs" />
              <select value={newAdSet.optimization_goal} onChange={e => setNewAdSet(p => ({ ...p, optimization_goal: e.target.value }))} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-xs">
                <option value="LINK_CLICKS">Link Clicks</option>
                <option value="IMPRESSIONS">Impressions</option>
                <option value="REACH">Reach</option>
                <option value="LANDING_PAGE_VIEWS">Landing Page Views</option>
                <option value="LEAD_GENERATION">Lead Generation</option>
                <option value="CONVERSATIONS">Conversations</option>
              </select>
              <Button size="sm" onClick={createAdSet} disabled={loading || !newAdSet.name || !newAdSet.campaign_id}>
                <Zap className="h-3.5 w-3.5 mr-1" />Create Ad Set
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TARGETING */}
        <TabsContent value="targeting" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" />Interest Targeting Search</h4>
              <div className="flex gap-2">
                <Input value={targetingQuery} onChange={e => setTargetingQuery(e.target.value)} placeholder="Search interests..." className="text-sm" onKeyDown={e => e.key === "Enter" && searchTargeting()} />
                <Button size="sm" onClick={searchTargeting} disabled={loading}>Search</Button>
              </div>
              {targetingResults.length > 0 && (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1">
                    {targetingResults.map((t, i) => (
                      <div key={i} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-foreground">{t.name}</p>
                          <p className="text-[9px] text-muted-foreground">{t.type} · {t.audience_size_lower_bound?.toLocaleString()}-{t.audience_size_upper_bound?.toLocaleString()} people</p>
                        </div>
                        <Badge variant="outline" className="text-[9px]">{t.id}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSIGHTS */}
        <TabsContent value="insights" className="space-y-3 mt-3">
          <div className="flex gap-2 flex-wrap">
            {campaigns.slice(0, 5).map(c => (
              <Button key={c.id} size="sm" variant="outline" className="text-xs h-7" onClick={() => fetchInsights(c.id)}>
                <BarChart3 className="h-3 w-3 mr-1" />{c.name.slice(0, 20)}
              </Button>
            ))}
          </div>
          {insights?.data?.length > 0 ? (
            <Card>
              <CardContent className="p-3">
                <h4 className="text-xs font-semibold text-foreground mb-2">Performance Insights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {insights.data.map((row: any, i: number) => (
                    <div key={i} className="space-y-1.5">
                      {["impressions", "reach", "spend", "clicks", "cpc", "cpm", "ctr"].map(metric => {
                        const val = row[metric];
                        if (!val) return null;
                        const display = metric === "spend" || metric === "cpc" || metric === "cpm" ? `$${parseFloat(val).toFixed(2)}` : metric === "ctr" ? `${parseFloat(val).toFixed(2)}%` : parseInt(val).toLocaleString();
                        return (
                          <div key={metric} className="bg-muted/30 rounded p-1.5 text-center">
                            <p className="text-xs font-bold text-foreground">{display}</p>
                            <p className="text-[8px] text-muted-foreground uppercase">{metric}</p>
                          </div>
                        );
                      })}
                      {row.date_start && <p className="text-[9px] text-muted-foreground text-center">{row.date_start} → {row.date_stop}</p>}
                    </div>
                  ))}
                </div>
                {/* Actions breakdown */}
                {insights.data[0]?.actions && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Actions Breakdown</p>
                    <div className="flex gap-2 flex-wrap">
                      {insights.data[0].actions.map((a: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px]">
                          {a.action_type}: {parseInt(a.value).toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-6 text-center"><BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select a campaign to view insights</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
        </div>
      )}
    </div>
  );
};

export default IGAdsManager;

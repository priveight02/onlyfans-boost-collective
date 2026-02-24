import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, RefreshCw, FileText, BarChart3, Settings, Globe, Loader2 } from "lucide-react";

interface Props { selectedAccount: string; selectedPage?: any; }

const FBBusinessManager = ({ selectedAccount, selectedPage }: Props) => {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("businesses");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [adInsights, setAdInsights] = useState<any>(null);
  const [bizPages, setBizPages] = useState<any[]>([]);
  const [bizAdAccounts, setBizAdAccounts] = useState<any[]>([]);
  const [selectedBiz, setSelectedBiz] = useState("");
  // Page settings
  const [pgAbout, setPgAbout] = useState("");
  const [pgWebsite, setPgWebsite] = useState("");
  const [pgPhone, setPgPhone] = useState("");
  // Instant articles
  const [instantArticles, setInstantArticles] = useState<any[]>([]);
  const [iaHtml, setIaHtml] = useState("");

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", { body: { action, account_id: selectedAccount, params } });
      if (error) { toast.info(error.message); return null; }
      if (!data?.success) { toast.info(data?.error || "Action failed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const fetchBusinesses = async () => {
    const d = await callApi("get_businesses");
    if (d?.data) { setBusinesses(d.data); toast.success(`${d.data.length} businesses`); }
  };

  const fetchBizDetails = async (bizId: string) => {
    setSelectedBiz(bizId);
    const [pages, accts] = await Promise.all([
      callApi("get_business_pages", { business_id: bizId }),
      callApi("get_business_ad_accounts", { business_id: bizId }),
    ]);
    if (pages?.data) setBizPages(pages.data);
    if (accts?.data) setBizAdAccounts(accts.data);
  };

  const fetchAdAccounts = async () => {
    const d = await callApi("get_ad_accounts");
    if (d?.data) { setAdAccounts(d.data); toast.success(`${d.data.length} ad accounts`); }
  };

  const fetchAdInsights = async (adAccountId: string) => {
    const d = await callApi("get_ad_insights", { ad_account_id: adAccountId });
    if (d?.data) { setAdInsights(d.data?.[0] || d.data); toast.success("Insights loaded"); }
  };

  const updatePageSettings = async () => {
    if (!selectedPage) { toast.error("Select a page first"); return; }
    const d = await callApi("update_page_settings", {
      page_id: selectedPage.id, page_access_token: selectedPage.access_token,
      about: pgAbout || undefined, website: pgWebsite || undefined, phone: pgPhone || undefined,
    });
    if (d) toast.success("Page settings updated");
  };

  const fetchInstantArticles = async () => {
    if (!selectedPage) { toast.error("Select a page"); return; }
    const d = await callApi("get_instant_articles", { page_id: selectedPage.id, page_access_token: selectedPage.access_token });
    if (d?.data) { setInstantArticles(d.data); toast.success(`${d.data.length} articles`); }
  };

  const createInstantArticle = async () => {
    if (!selectedPage || !iaHtml) { toast.error("Page and HTML required"); return; }
    const d = await callApi("create_instant_article", { page_id: selectedPage.id, page_access_token: selectedPage.access_token, html_source: iaHtml });
    if (d?.id) { toast.success("Article published!"); setIaHtml(""); fetchInstantArticles(); }
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="businesses" className="text-xs px-2 py-1 rounded-md"><Briefcase className="h-3 w-3 mr-1" />Businesses</TabsTrigger>
          <TabsTrigger value="ads" className="text-xs px-2 py-1 rounded-md"><BarChart3 className="h-3 w-3 mr-1" />Ad Accounts</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs px-2 py-1 rounded-md"><Settings className="h-3 w-3 mr-1" />Page Settings</TabsTrigger>
          <TabsTrigger value="articles" className="text-xs px-2 py-1 rounded-md"><FileText className="h-3 w-3 mr-1" />Instant Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses" className="space-y-3 mt-3">
          <Button size="sm" variant="outline" onClick={fetchBusinesses} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Businesses</Button>
          <div className="space-y-2">
            {businesses.map(b => (
              <Card key={b.id} className={`border-border/50 cursor-pointer hover:border-primary/30 ${selectedBiz === b.id ? "border-primary/50" : ""}`} onClick={() => fetchBizDetails(b.id)}>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-foreground">{b.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px]">{b.verification_status}</Badge>
                    <span>{new Date(b.created_time).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedBiz && bizPages.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">Business Pages ({bizPages.length})</h4>
              {bizPages.map(p => (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="p-2 flex items-center gap-2 text-xs">
                    {p.picture?.data?.url && <img src={p.picture.data.url} className="h-6 w-6 rounded-full" alt="" />}
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{(p.fan_count || 0).toLocaleString()} fans</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {selectedBiz && bizAdAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">Business Ad Accounts ({bizAdAccounts.length})</h4>
              {bizAdAccounts.map(a => (
                <Card key={a.id} className="border-border/50">
                  <CardContent className="p-2 flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{a.name}</span>
                    <span className="text-muted-foreground">{a.currency} · Spent: ${((a.amount_spent || 0) / 100).toFixed(2)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ads" className="space-y-3 mt-3">
          <Button size="sm" variant="outline" onClick={fetchAdAccounts} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Ad Accounts</Button>
          <div className="space-y-2">
            {adAccounts.map(a => (
              <Card key={a.id} className="border-border/50 cursor-pointer hover:border-primary/30" onClick={() => fetchAdInsights(a.id)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground">{a.currency} · {a.timezone_name}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{a.account_status === 1 ? "Active" : "Inactive"}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {adInsights && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-foreground mb-2">Ad Insights (Last 30 Days)</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { l: "Impressions", v: adInsights.impressions },
                    { l: "Clicks", v: adInsights.clicks },
                    { l: "Spend", v: `$${((adInsights.spend || 0)).toLocaleString()}` },
                    { l: "CTR", v: `${(adInsights.ctr || 0)}%` },
                    { l: "CPC", v: `$${(adInsights.cpc || 0)}` },
                    { l: "Reach", v: adInsights.reach },
                  ].map(s => (
                    <div key={s.l}>
                      <p className="text-sm font-bold text-foreground">{s.v || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{s.l}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-3 mt-3">
          {!selectedPage ? <p className="text-xs text-muted-foreground">Select a page from Dashboard first.</p> : (
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Update Page Settings: {selectedPage.name}</h4>
                <Input placeholder="About" value={pgAbout} onChange={e => setPgAbout(e.target.value)} className="text-sm" />
                <Input placeholder="Website URL" value={pgWebsite} onChange={e => setPgWebsite(e.target.value)} className="text-sm" />
                <Input placeholder="Phone" value={pgPhone} onChange={e => setPgPhone(e.target.value)} className="text-sm" />
                <Button size="sm" onClick={updatePageSettings} disabled={loading}><Settings className="h-3.5 w-3.5 mr-1" />Update</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="articles" className="space-y-3 mt-3">
          {!selectedPage ? <p className="text-xs text-muted-foreground">Select a page from Dashboard first.</p> : (
            <>
              <Button size="sm" variant="outline" onClick={fetchInstantArticles} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Articles</Button>
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Publish Instant Article</h4>
                  <Textarea placeholder="HTML source..." value={iaHtml} onChange={e => setIaHtml(e.target.value)} className="min-h-[100px] text-sm font-mono" />
                  <Button size="sm" onClick={createInstantArticle} disabled={loading}><FileText className="h-3.5 w-3.5 mr-1" />Publish</Button>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {instantArticles.map(a => (
                  <Card key={a.id} className="border-border/50">
                    <CardContent className="p-2 flex items-center justify-between text-xs">
                      <span className="text-foreground truncate max-w-[200px]">{a.canonical_url || a.id}</span>
                      <Badge variant="outline" className="text-[9px]">{a.published ? "Published" : "Draft"}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FBBusinessManager;

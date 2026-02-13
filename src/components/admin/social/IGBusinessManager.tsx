import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase, RefreshCw, Building2, Instagram, Image, DollarSign, Users } from "lucide-react";

interface Props { selectedAccount: string; }

const IGBusinessManager = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBiz, setSelectedBiz] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [igAccounts, setIgAccounts] = useState<any[]>([]);
  const [pubLimit, setPubLimit] = useState<any>(null);

  const callApi = async (action: string, params: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API error");
      return data.data;
    } finally { setLoading(false); }
  };

  const loadBusinesses = async () => {
    try {
      const result = await callApi("get_business_accounts", {});
      setBusinesses(result?.data || []);
      toast.success(`Found ${result?.data?.length || 0} business accounts`);
    } catch (e: any) { toast.error(e.message); }
  };

  const loadBusinessAssets = async (bizId: string) => {
    setSelectedBiz(bizId);
    try {
      const [pagesRes, adRes, igRes] = await Promise.all([
        callApi("get_business_pages", { business_id: bizId }),
        callApi("get_business_ad_accounts", { business_id: bizId }),
        callApi("get_business_instagram_accounts", { business_id: bizId }),
      ]);
      setPages(pagesRes?.data || []);
      setAdAccounts(adRes?.data || []);
      setIgAccounts(igRes?.data || []);
      toast.success("Business assets loaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const checkPublishingLimit = async () => {
    try {
      const result = await callApi("get_content_publishing_limit", {});
      setPubLimit(result);
      toast.success("Publishing limit checked");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={loadBusinesses} disabled={loading} className="text-xs">
          {loading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
          Load Businesses
        </Button>
        <Button size="sm" variant="outline" onClick={checkPublishingLimit} disabled={loading} className="text-xs">
          <Image className="h-3 w-3 mr-1" />Publishing Limit
        </Button>
      </div>

      {/* Publishing Limit */}
      {pubLimit && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-1">Content Publishing Limit</p>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{JSON.stringify(pubLimit, null, 2)}</pre>
        </div>
      )}

      {/* Businesses */}
      {businesses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Business Accounts</p>
          <div className="space-y-2">
            {businesses.map((biz: any) => (
              <button
                key={biz.id}
                onClick={() => loadBusinessAssets(biz.id)}
                className={`w-full text-left rounded-lg p-3 transition-colors ${
                  selectedBiz === biz.id ? "bg-primary/15 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {biz.profile_picture_uri ? (
                    <img src={biz.profile_picture_uri} alt={biz.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{biz.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {biz.verification_status || "unverified"} · Created {new Date(biz.created_time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assets Grid */}
      {selectedBiz && (
        <div className="grid grid-cols-1 gap-3">
          {/* Pages */}
          {pages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">Pages ({pages.length})</p>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1">
                  {pages.map((p: any) => (
                    <div key={p.id} className="bg-muted/30 rounded-lg p-2 flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span><Users className="h-3 w-3 inline" /> {p.fan_count?.toLocaleString() || 0} fans</span>
                          {p.instagram_business_account && (
                            <Badge variant="outline" className="text-[10px]">
                              <Instagram className="h-2.5 w-2.5 mr-0.5" />@{p.instagram_business_account.username || p.instagram_business_account.id}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Ad Accounts */}
          {adAccounts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">Ad Accounts ({adAccounts.length})</p>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1">
                  {adAccounts.map((a: any) => (
                    <div key={a.id} className="bg-muted/30 rounded-lg p-2">
                      <p className="text-xs font-medium text-foreground">{a.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{a.currency}</span>
                        <span><DollarSign className="h-3 w-3 inline" />{(Number(a.amount_spent || 0) / 100).toFixed(2)} spent</span>
                        <Badge variant="outline" className="text-[10px]">
                          {a.account_status === 1 ? "Active" : a.account_status === 2 ? "Disabled" : `Status ${a.account_status}`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* IG Accounts */}
          {igAccounts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">Instagram Accounts ({igAccounts.length})</p>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1">
                  {igAccounts.map((ig: any) => (
                    <div key={ig.id} className="bg-muted/30 rounded-lg p-2 flex items-center gap-2">
                      {ig.profile_pic && <img src={ig.profile_pic} alt="" className="h-6 w-6 rounded-full" />}
                      <div>
                        <p className="text-xs font-medium text-foreground">@{ig.username || ig.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ig.followers_count?.toLocaleString() || 0} followers · {ig.media_count || 0} posts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {businesses.length === 0 && !loading && (
        <div className="text-center py-4">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Click "Load Businesses" to view your business assets</p>
          <p className="text-[10px] text-muted-foreground mt-1">Requires business_management permission</p>
        </div>
      )}
    </div>
  );
};

export default IGBusinessManager;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, Users, Globe, Clock, TrendingUp, RefreshCw,
  MapPin, PieChart, Eye, Heart, MessageSquare, Share2,
  Loader2, Instagram, ArrowUp, ArrowDown,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const IGAdvancedInsights = ({ selectedAccount }: Props) => {
  const [demographics, setDemographics] = useState<any>(null);
  const [onlineFollowers, setOnlineFollowers] = useState<any>(null);
  const [accountMetrics, setAccountMetrics] = useState<any>(null);
  const [mediaInsights, setMediaInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageData, setPageData] = useState<any>(null);

  const callApi = async (body: any) => {
    if (!selectedAccount) return null;
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

  const fetchAllInsights = async () => {
    toast.info("Syncing all insights...");
    const [demo, online, metrics, page] = await Promise.all([
      callApi({ action: "get_account_insights_demographics" }),
      callApi({ action: "get_account_insights_online_followers" }),
      callApi({ action: "get_account_insights", params: { period: "day" } }),
      callApi({ action: "get_page_followers" }),
    ]);
    if (demo) setDemographics(demo);
    if (online) setOnlineFollowers(online);
    if (metrics) setAccountMetrics(metrics);
    if (page) setPageData(page);
    toast.success("Insights synced!");
  };

  const fetchMediaInsights = async () => {
    const media = await callApi({ action: "get_media", params: { limit: 12 } });
    if (!media?.data) return;
    const results: any[] = [];
    for (const m of media.data.slice(0, 10)) {
      try {
        const action = m.media_type === "VIDEO" ? "get_reel_insights" : "get_media_insights";
        const insights = await callApi({ action, params: { media_id: m.id } });
        results.push({ ...m, insights: insights?.data || [] });
      } catch {
        results.push({ ...m, insights: [] });
      }
    }
    setMediaInsights(results);
    toast.success(`${results.length} posts analyzed`);
  };

  const getMetricValue = (metricName: string) => {
    if (!demographics?.data) return null;
    const metric = demographics.data.find((m: any) => m.name === metricName);
    return metric?.values?.[0]?.value || null;
  };

  const renderGenderAge = () => {
    const data = getMetricValue("audience_gender_age");
    if (!data) return null;
    const sorted = Object.entries(data).sort(([, a]: any, [, b]: any) => b - a).slice(0, 10);
    const max = Math.max(...sorted.map(([, v]) => v as number));
    return (
      <div className="space-y-1">
        {sorted.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12">{key}</span>
            <div className="flex-1 bg-muted/30 rounded-full h-2.5">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full" style={{ width: `${((val as number) / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-foreground w-8 text-right">{(val as number).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderCountries = () => {
    const data = getMetricValue("audience_country");
    if (!data) return null;
    const sorted = Object.entries(data).sort(([, a]: any, [, b]: any) => b - a).slice(0, 8);
    return (
      <div className="flex gap-1.5 flex-wrap">
        {sorted.map(([country, count]) => (
          <Badge key={country} variant="outline" className="text-[9px]">
            {country}: {(count as number).toLocaleString()}
          </Badge>
        ))}
      </div>
    );
  };

  const renderCities = () => {
    const data = getMetricValue("audience_city");
    if (!data) return null;
    const sorted = Object.entries(data).sort(([, a]: any, [, b]: any) => b - a).slice(0, 6);
    return (
      <div className="space-y-1">
        {sorted.map(([city, count]) => (
          <div key={city} className="flex justify-between items-center">
            <span className="text-[10px] text-foreground truncate flex-1">{city}</span>
            <span className="text-[10px] text-muted-foreground">{(count as number).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderOnlineHours = () => {
    if (!onlineFollowers?.data?.[0]?.values?.[0]?.value) return null;
    const hourData = onlineFollowers.data[0].values[0].value;
    const entries = Object.entries(hourData).sort(([a], [b]) => parseInt(a) - parseInt(b));
    const max = Math.max(...entries.map(([, v]) => v as number));
    return (
      <div className="flex items-end gap-[2px] h-16">
        {entries.map(([hour, val]) => (
          <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t" style={{ height: `${((val as number) / max) * 100}%`, minHeight: "2px" }} />
            {parseInt(hour) % 4 === 0 && <span className="text-[7px] text-muted-foreground">{hour}h</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" /> Advanced Insights
          </h3>
          <p className="text-[10px] text-muted-foreground">Demographics, audience intelligence, content performance</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchAllInsights} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Sync All
          </Button>
          <Button size="sm" variant="outline" onClick={fetchMediaInsights} disabled={loading}>
            <Eye className="h-3.5 w-3.5 mr-1" />Analyze Posts
          </Button>
        </div>
      </div>

      {/* Account Metrics */}
      {accountMetrics?.data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {accountMetrics.data.map((m: any) => {
            const val = m.values?.[m.values.length - 1]?.value || 0;
            const prevVal = m.values?.[m.values.length - 2]?.value || 0;
            const change = prevVal ? ((val - prevVal) / prevVal * 100) : 0;
            return (
              <Card key={m.name}>
                <CardContent className="p-2.5 text-center">
                  <p className="text-sm font-bold text-foreground">{typeof val === "number" ? val.toLocaleString() : val}</p>
                  <p className="text-[9px] text-muted-foreground">{m.name.replace(/_/g, " ")}</p>
                  {change !== 0 && (
                    <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${change > 0 ? "text-green-400" : "text-red-400"}`}>
                      {change > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                      <span className="text-[8px]">{Math.abs(change).toFixed(1)}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Page Data */}
      {pageData && (
        <Card className="border-blue-500/20">
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Instagram className="h-3.5 w-3.5 text-pink-400" />Page Stats</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{(pageData.fan_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Page Fans</p></div>
              <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{(pageData.followers_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Followers</p></div>
              <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{(pageData.new_like_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">New Likes</p></div>
              <div className="bg-muted/30 rounded p-2 text-center"><p className="text-sm font-bold text-foreground">{(pageData.talking_about_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Talking About</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Gender & Age */}
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Users className="h-3.5 w-3.5 text-purple-400" />Gender & Age</h4>
            {renderGenderAge() || <p className="text-xs text-muted-foreground text-center py-4">Sync to load demographics</p>}
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-green-400" />Top Countries</h4>
            {renderCountries() || <p className="text-xs text-muted-foreground text-center py-4">Sync to load</p>}
          </CardContent>
        </Card>

        {/* Cities */}
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-red-400" />Top Cities</h4>
            {renderCities() || <p className="text-xs text-muted-foreground text-center py-4">Sync to load</p>}
          </CardContent>
        </Card>

        {/* Online Hours */}
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yellow-400" />Best Posting Times</h4>
            {renderOnlineHours() || <p className="text-xs text-muted-foreground text-center py-4">Sync to load online followers data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Media Performance */}
      {mediaInsights.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-cyan-400" />Content Performance</h4>
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2">
                {mediaInsights.map(m => {
                  const insightMap: any = {};
                  m.insights?.forEach((ins: any) => { insightMap[ins.name] = ins.values?.[0]?.value || 0; });
                  return (
                    <div key={m.id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        {m.thumbnail_url || m.media_url ? (
                          <img src={m.thumbnail_url || m.media_url} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0"><Instagram className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground line-clamp-1">{m.caption || "No caption"}</p>
                          <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground">
                            <Badge variant="outline" className="text-[8px]">{m.media_type}</Badge>
                            <span>{new Date(m.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            {[
                              { k: "impressions", icon: Eye, label: "Imp" },
                              { k: "reach", icon: Users, label: "Reach" },
                              { k: "engagement", icon: Heart, label: "Eng" },
                              { k: "saved", icon: TrendingUp, label: "Saved" },
                              { k: "shares", icon: Share2, label: "Shares" },
                            ].map(({ k, icon: Icon, label }) => {
                              const val = insightMap[k] || m[`${k === "engagement" ? "like" : k}_count`] || 0;
                              if (!val) return null;
                              return (
                                <span key={k} className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <Icon className="h-2.5 w-2.5" />{typeof val === "number" ? val.toLocaleString() : val}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        </div>
      )}
    </div>
  );
};

export default IGAdvancedInsights;

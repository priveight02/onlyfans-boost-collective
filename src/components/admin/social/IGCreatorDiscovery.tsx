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
  Users, Search, Star, TrendingUp, Heart, Eye, MessageSquare,
  RefreshCw, Plus, Trash2, Loader2, Instagram, Calendar,
  ShoppingBag, Tag, ExternalLink, Shield, Sparkles, UserPlus,
  CalendarPlus, Clock,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const IGCreatorDiscovery = ({ selectedAccount }: Props) => {
  const [searchUsernames, setSearchUsernames] = useState("");
  const [creators, setCreators] = useState<any[]>([]);
  const [approvedCreators, setApprovedCreators] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New creator to approve
  const [newCreatorId, setNewCreatorId] = useState("");

  // New event form
  const [eventForm, setEventForm] = useState({ title: "", start_time: "", end_time: "", event_url: "", description: "" });

  // Product search
  const [productQuery, setProductQuery] = useState("");
  const [productCatalogId, setProductCatalogId] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);

  const callApi = async (body: any) => {
    if (!selectedAccount) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", { body: { ...body, account_id: selectedAccount } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      return data.data;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const discoverCreators = async () => {
    if (!searchUsernames) return;
    const usernames = searchUsernames.split(",").map(u => u.trim().replace("@", "")).filter(Boolean);
    const d = await callApi({ action: "discover_creators", params: { usernames } });
    if (d?.creators) {
      setCreators(d.creators);
      toast.success(`Analyzed ${d.total} creators`);
    }
  };

  const fetchApprovedCreators = async () => {
    const d = await callApi({ action: "get_approved_creators" });
    if (d?.data) setApprovedCreators(d.data);
  };

  const addApprovedCreator = async () => {
    if (!newCreatorId) return;
    await callApi({ action: "add_approved_creator", params: { creator_id: newCreatorId } });
    toast.success("Creator approved!");
    setNewCreatorId("");
    fetchApprovedCreators();
  };

  const removeApprovedCreator = async (creatorId: string) => {
    await callApi({ action: "remove_approved_creator", params: { creator_id: creatorId } });
    toast.success("Creator removed");
    fetchApprovedCreators();
  };

  const fetchCatalogs = async () => {
    const d = await callApi({ action: "get_available_catalogs" });
    if (d?.data) { setCatalogs(d.data); toast.success(`${d.data.length} catalogs found`); }
  };

  const searchProducts = async () => {
    if (!productQuery || !productCatalogId) { toast.error("Enter query and select catalog"); return; }
    const d = await callApi({ action: "get_product_catalog", params: { query: productQuery, catalog_id: productCatalogId } });
    if (d?.data) setProductResults(d.data);
  };

  const fetchUpcomingEvents = async () => {
    const d = await callApi({ action: "get_upcoming_events" });
    if (d?.data) setUpcomingEvents(d.data);
  };

  const createEvent = async () => {
    if (!eventForm.title || !eventForm.start_time) { toast.error("Fill title and start time"); return; }
    await callApi({
      action: "create_upcoming_event",
      params: {
        title: eventForm.title,
        start_time: new Date(eventForm.start_time).toISOString(),
        ...(eventForm.end_time ? { end_time: new Date(eventForm.end_time).toISOString() } : {}),
        ...(eventForm.event_url ? { event_url: eventForm.event_url } : {}),
        ...(eventForm.description ? { description: eventForm.description } : {}),
      },
    });
    toast.success("Event created!");
    setEventForm({ title: "", start_time: "", end_time: "", event_url: "", description: "" });
    fetchUpcomingEvents();
  };

  const deleteEvent = async (eventId: string) => {
    await callApi({ action: "delete_upcoming_event", params: { event_id: eventId } });
    toast.success("Event deleted");
    fetchUpcomingEvents();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" /> Creator & Commerce Hub
        </h3>
        <p className="text-[10px] text-muted-foreground">Creator discovery, branded content, shopping & events</p>
      </div>

      <Tabs defaultValue="discover">
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="discover" className="text-xs data-[state=active]:bg-background"><Search className="h-3 w-3 mr-1" />Discover</TabsTrigger>
          <TabsTrigger value="branded" className="text-xs data-[state=active]:bg-background"><Shield className="h-3 w-3 mr-1" />Branded</TabsTrigger>
          <TabsTrigger value="shopping" className="text-xs data-[state=active]:bg-background"><ShoppingBag className="h-3 w-3 mr-1" />Shopping</TabsTrigger>
          <TabsTrigger value="events" className="text-xs data-[state=active]:bg-background"><Calendar className="h-3 w-3 mr-1" />Events</TabsTrigger>
        </TabsList>

        {/* DISCOVER */}
        <TabsContent value="discover" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5 text-purple-400" />Creator Analyzer</h4>
              <p className="text-[10px] text-muted-foreground">Enter Instagram usernames to analyze engagement, reach & content quality</p>
              <div className="flex gap-2">
                <Textarea value={searchUsernames} onChange={e => setSearchUsernames(e.target.value)} placeholder="username1, username2, username3..." rows={2} className="text-sm" />
              </div>
              <Button size="sm" onClick={discoverCreators} disabled={loading || !searchUsernames}>
                {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                Analyze Creators
              </Button>
            </CardContent>
          </Card>

          {creators.length > 0 && (
            <ScrollArea className="max-h-[500px]">
              <div className="grid gap-3 md:grid-cols-2">
                {creators.filter(c => !c.error).map(c => (
                  <Card key={c.id} className="border-purple-500/20">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3 mb-2">
                        {c.profile_picture_url && <img src={c.profile_picture_url} className="h-10 w-10 rounded-full object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{c.name || c.username}</p>
                          <p className="text-[10px] text-muted-foreground">@{c.username}</p>
                        </div>
                        <Badge className={`text-[9px] ${(c.engagement_rate || 0) > 3 ? "bg-green-500/15 text-green-400" : (c.engagement_rate || 0) > 1.5 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                          {c.engagement_rate}% ER
                        </Badge>
                      </div>
                      {c.biography && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{c.biography}</p>}
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="bg-muted/30 rounded p-1.5">
                          <p className="text-xs font-bold text-foreground">{(c.followers_count || 0).toLocaleString()}</p>
                          <p className="text-[8px] text-muted-foreground">Followers</p>
                        </div>
                        <div className="bg-muted/30 rounded p-1.5">
                          <p className="text-xs font-bold text-foreground">{(c.follows_count || 0).toLocaleString()}</p>
                          <p className="text-[8px] text-muted-foreground">Following</p>
                        </div>
                        <div className="bg-muted/30 rounded p-1.5">
                          <p className="text-xs font-bold text-foreground">{(c.media_count || 0).toLocaleString()}</p>
                          <p className="text-[8px] text-muted-foreground">Posts</p>
                        </div>
                      </div>
                      {/* Recent media performance */}
                      {c.media?.data?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-[9px] text-muted-foreground mb-1">Recent posts avg:</p>
                          <div className="flex gap-3 text-[9px] text-muted-foreground">
                            <span><Heart className="h-2.5 w-2.5 inline mr-0.5" />{Math.round(c.media.data.reduce((s: number, m: any) => s + (m.like_count || 0), 0) / c.media.data.length).toLocaleString()}</span>
                            <span><MessageSquare className="h-2.5 w-2.5 inline mr-0.5" />{Math.round(c.media.data.reduce((s: number, m: any) => s + (m.comments_count || 0), 0) / c.media.data.length).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* BRANDED CONTENT */}
        <TabsContent value="branded" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-blue-400" />Approved Creators</h4>
                <Button size="sm" variant="outline" onClick={fetchApprovedCreators} disabled={loading} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />Load
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={newCreatorId} onChange={e => setNewCreatorId(e.target.value)} placeholder="Creator IG User ID" className="text-sm" />
                <Button size="sm" onClick={addApprovedCreator} disabled={!newCreatorId || loading}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />Add
                </Button>
              </div>
              {approvedCreators.length > 0 && (
                <div className="space-y-1.5">
                  {approvedCreators.map((c: any) => (
                    <div key={c.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                      <span className="text-xs text-foreground">@{c.username || c.id}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => removeApprovedCreator(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SHOPPING */}
        <TabsContent value="shopping" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5 text-orange-400" />Product Catalogs</h4>
                <Button size="sm" variant="outline" onClick={fetchCatalogs} disabled={loading} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />Load
                </Button>
              </div>
              {catalogs.length > 0 && (
                <div className="space-y-1.5">
                  {catalogs.map((c: any) => (
                    <div key={c.id} className="bg-muted/30 rounded p-2 flex items-center justify-between" onClick={() => setProductCatalogId(c.id)}>
                      <div>
                        <p className="text-xs font-medium text-foreground">{c.name}</p>
                        <p className="text-[9px] text-muted-foreground">{c.product_count || 0} products</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] cursor-pointer ${productCatalogId === c.id ? "bg-orange-500/15 text-orange-400" : ""}`}>
                        {productCatalogId === c.id ? "Selected" : "Select"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {productCatalogId && (
                <div className="flex gap-2">
                  <Input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Search products..." className="text-sm" />
                  <Button size="sm" onClick={searchProducts} disabled={loading}>
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {productResults.length > 0 && (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {productResults.map((p: any, i: number) => (
                      <div key={i} className="bg-muted/30 rounded p-2">
                        <p className="text-xs text-foreground">{p.product_name || p.name}</p>
                        <p className="text-[9px] text-muted-foreground">{p.retailer_id || ""} · {p.currency}{p.price}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1"><CalendarPlus className="h-3.5 w-3.5 text-green-400" />Upcoming Events</h4>
                <Button size="sm" variant="outline" onClick={fetchUpcomingEvents} disabled={loading} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />Load
                </Button>
              </div>
              
              {/* Create Event */}
              <Input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="datetime-local" value={eventForm.start_time} onChange={e => setEventForm(p => ({ ...p, start_time: e.target.value }))} className="text-sm" />
                <Input type="datetime-local" value={eventForm.end_time} onChange={e => setEventForm(p => ({ ...p, end_time: e.target.value }))} className="text-sm" />
              </div>
              <Input value={eventForm.event_url} onChange={e => setEventForm(p => ({ ...p, event_url: e.target.value }))} placeholder="Event URL (OF link, etc)" className="text-sm" />
              <Textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." rows={2} className="text-sm" />
              <Button size="sm" onClick={createEvent} disabled={loading || !eventForm.title || !eventForm.start_time}>
                <CalendarPlus className="h-3.5 w-3.5 mr-1" />Create Event
              </Button>

              {/* Events list */}
              {upcomingEvents.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  {upcomingEvents.map((e: any) => (
                    <div key={e.id} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">{e.title}</p>
                        <p className="text-[9px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                          {new Date(e.start_time).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {e.event_url && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => window.open(e.event_url, "_blank")}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => deleteEvent(e.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      )}
    </div>
  );
};

export default IGCreatorDiscovery;

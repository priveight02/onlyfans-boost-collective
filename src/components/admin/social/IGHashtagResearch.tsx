import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Search, TrendingUp, RefreshCw, ExternalLink, Heart, MessageSquare, Image } from "lucide-react";

interface Props { selectedAccount: string; }

const IGHashtagResearch = ({ selectedAccount }: Props) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hashtagId, setHashtagId] = useState("");
  const [hashtagName, setHashtagName] = useState("");
  const [topMedia, setTopMedia] = useState<any[]>([]);
  const [recentMedia, setRecentMedia] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"top" | "recent">("top");

  const callApi = async (action: string, params: any) => {
    const { data, error } = await supabase.functions.invoke("instagram-api", {
      body: { action, account_id: selectedAccount, params },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const searchHashtag = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = await callApi("search_hashtag", { hashtag: query.replace("#", "") });
      if (result?.data?.[0]) {
        const ht = result.data[0];
        setHashtagId(ht.id);
        setHashtagName(query.replace("#", ""));
        // Fetch both top and recent
        const [top, recent] = await Promise.all([
          callApi("get_hashtag_top_media", { hashtag_id: ht.id }).catch(() => ({ data: [] })),
          callApi("get_hashtag_recent_media", { hashtag_id: ht.id }).catch(() => ({ data: [] })),
        ]);
        setTopMedia(top?.data || []);
        setRecentMedia(recent?.data || []);
        toast.success(`Found #${query.replace("#", "")} — ${(top?.data?.length || 0)} top, ${(recent?.data?.length || 0)} recent posts`);
      } else {
        toast.error("Hashtag not found");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const displayMedia = activeView === "top" ? topMedia : recentMedia;

  return (
    <div className="space-y-3 pt-3">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search hashtag (e.g. fitness)"
          className="text-sm"
          onKeyDown={e => e.key === "Enter" && searchHashtag()}
        />
        <Button size="sm" onClick={searchHashtag} disabled={loading}>
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {hashtagId && (
        <>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary">
              <Hash className="h-3 w-3 mr-0.5" />#{hashtagName}
            </Badge>
            <div className="flex gap-1">
              <Button size="sm" variant={activeView === "top" ? "default" : "outline"} onClick={() => setActiveView("top")} className="h-6 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />Top ({topMedia.length})
              </Button>
              <Button size="sm" variant={activeView === "recent" ? "default" : "outline"} onClick={() => setActiveView("recent")} className="h-6 text-xs">
                Recent ({recentMedia.length})
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {displayMedia.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No media found</p>
              )}
              {displayMedia.map((post: any) => (
                <div key={post.id} className="bg-muted/30 rounded-lg p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-2">{post.caption || "No caption"}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{post.like_count || 0}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{post.comments_count || 0}</span>
                      <span className="flex items-center gap-0.5"><Image className="h-3 w-3" />{post.media_type}</span>
                      <span>{post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                  {post.permalink && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(post.permalink, "_blank")} className="h-7 w-7 p-0 flex-shrink-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {!hashtagId && !loading && (
        <div className="text-center py-6">
          <Hash className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Search any hashtag to see top & recent posts</p>
          <p className="text-[10px] text-muted-foreground mt-1">Uses Instagram Public Content Access API</p>
        </div>
      )}
    </div>
  );
};

export default IGHashtagResearch;

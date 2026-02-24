import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, RefreshCw, ExternalLink, Users, Loader2 } from "lucide-react";

interface Props { selectedAccount: string; }

const FBCreatorMarketplace = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);
  const [brandedContent, setBrandedContent] = useState<any[]>([]);

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

  const discoverCreators = async () => {
    const d = await callApi("discover_fb_creators");
    if (d?.data) { setCreators(d.data); toast.success(`${d.data.length} eligible creators`); }
  };

  const fetchBrandedContent = async () => {
    const d = await callApi("get_branded_content_posts");
    if (d?.data) { setBrandedContent(d.data); toast.success(`${d.data.length} branded content posts`); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={discoverCreators} disabled={loading}><Star className="h-3.5 w-3.5 mr-1" />Discover Creators</Button>
        <Button size="sm" variant="outline" onClick={fetchBrandedContent} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Branded Content</Button>
      </div>

      {creators.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground">Eligible Creators ({creators.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {creators.map(c => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  {c.picture?.data?.url && <img src={c.picture.data.url} className="h-10 w-10 rounded-full" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.category} · {(c.fan_count || 0).toLocaleString()} fans</p>
                  </div>
                  {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground" /></a>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {brandedContent.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground">Branded Content ({brandedContent.length})</h4>
          {brandedContent.map(p => (
            <Card key={p.id} className="border-border/50">
              <CardContent className="p-3">
                <p className="text-xs text-foreground line-clamp-2">{p.message || "(no text)"}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{p.from?.name}</span>
                  <span>{new Date(p.created_time).toLocaleDateString()}</span>
                  {p.permalink_url && <a href={p.permalink_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View</a>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FBCreatorMarketplace;

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, RefreshCw, Play, Square, ExternalLink, Eye, Loader2 } from "lucide-react";

interface Props { selectedAccount: string; selectedPage?: any; }

const FBLiveVideoManager = ({ selectedAccount, selectedPage }: Props) => {
  const [loading, setLoading] = useState(false);
  const [liveVideos, setLiveVideos] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

  const fetchLiveVideos = async () => {
    const d = await callApi("get_live_videos", { page_id: selectedPage?.id, page_access_token: selectedPage?.access_token });
    if (d?.data) { setLiveVideos(d.data); toast.success(`${d.data.length} live videos loaded`); }
  };

  const createLive = async () => {
    if (!title) { toast.error("Enter a title"); return; }
    const d = await callApi("create_live_video", {
      page_id: selectedPage?.id, page_access_token: selectedPage?.access_token,
      title, description, status: "LIVE_NOW",
    });
    if (d?.id) { toast.success("Live video created!"); setTitle(""); setDescription(""); fetchLiveVideos(); }
  };

  const endLive = async (videoId: string) => {
    await callApi("end_live_video", { video_id: videoId, page_access_token: selectedPage?.access_token });
    toast.success("Live ended"); fetchLiveVideos();
  };

  if (!selectedPage) return <p className="text-xs text-muted-foreground p-4">Select a page from the Dashboard tab first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={fetchLiveVideos} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Live Videos</Button>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400">{selectedPage.name}</Badge>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1"><Play className="h-3.5 w-3.5 text-red-400" />Create Live Video</h4>
          <Input placeholder="Live video title" value={title} onChange={e => setTitle(e.target.value)} className="text-sm" />
          <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[60px] text-sm" />
          <Button size="sm" onClick={createLive} disabled={loading}><Video className="h-3.5 w-3.5 mr-1" />Go Live</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {liveVideos.map(v => (
          <Card key={v.id} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{v.title || "Untitled"}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className={`text-[9px] py-0 px-1 ${v.status === "LIVE" ? "border-red-400/30 text-red-400" : ""}`}>{v.status}</Badge>
                    {v.live_views > 0 && <span><Eye className="h-2.5 w-2.5 inline mr-0.5" />{v.live_views}</span>}
                    <span>{new Date(v.creation_time).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {v.permalink_url && <a href={v.permalink_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>}
                  {v.status === "LIVE" && <Button size="sm" variant="destructive" onClick={() => endLive(v.id)} className="h-6 text-[10px]"><Square className="h-2.5 w-2.5 mr-0.5" />End</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FBLiveVideoManager;

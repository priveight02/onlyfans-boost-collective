import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, RefreshCw, Plus, Trash2, Shield, UserPlus, UserMinus, ExternalLink } from "lucide-react";

interface Props { selectedAccount: string; }

const IGBrandedContent = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [approvedCreators, setApprovedCreators] = useState<any[]>([]);
  const [brandedPosts, setBrandedPosts] = useState<any[]>([]);
  const [newCreatorId, setNewCreatorId] = useState("");

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

  const loadPermissions = async () => {
    try {
      const result = await callApi("get_branded_content_ad_permissions", {});
      setPermissions(result);
      toast.success("Permissions loaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const loadApprovedCreators = async () => {
    try {
      const result = await callApi("get_approved_creators", {});
      setApprovedCreators(result?.data || []);
      toast.success(`Found ${result?.data?.length || 0} approved creators`);
    } catch (e: any) { toast.error(e.message); }
  };

  const loadBrandedPosts = async () => {
    try {
      const result = await callApi("get_branded_content_posts", {});
      setBrandedPosts(result?.data || []);
      toast.success("Branded content posts loaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const addCreator = async () => {
    if (!newCreatorId) { toast.error("Enter creator IG user ID"); return; }
    try {
      await callApi("add_approved_creator", { creator_id: newCreatorId });
      toast.success("Creator approved!");
      setNewCreatorId("");
      loadApprovedCreators();
    } catch (e: any) { toast.error(e.message); }
  };

  const removeCreator = async (creatorId: string) => {
    try {
      await callApi("remove_approved_creator", { creator_id: creatorId });
      toast.success("Creator removed");
      loadApprovedCreators();
    } catch (e: any) { toast.error(e.message); }
  };

  const loadAll = () => {
    loadPermissions();
    loadApprovedCreators();
    loadBrandedPosts();
  };

  return (
    <div className="space-y-4 pt-3">
      <Button size="sm" onClick={loadAll} disabled={loading} className="text-xs">
        {loading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
        Load All Branded Content Data
      </Button>

      {/* Permissions */}
      {permissions && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Ad Permissions</p>
          <div className="bg-muted/30 rounded-lg p-2">
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{JSON.stringify(permissions, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Approved Creators */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">Approved Creators ({approvedCreators.length})</p>
        </div>
        <div className="flex gap-2 mb-2">
          <Input value={newCreatorId} onChange={e => setNewCreatorId(e.target.value)} placeholder="Creator IG User ID" className="text-sm" />
          <Button size="sm" onClick={addCreator} disabled={loading}>
            <UserPlus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {approvedCreators.map((c: any) => (
              <div key={c.id} className="bg-muted/30 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">@{c.username || c.id}</p>
                  <p className="text-[10px] text-muted-foreground">ID: {c.id}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeCreator(c.id)} className="h-6 text-red-400">
                  <UserMinus className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Branded Posts */}
      {brandedPosts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Partnership Posts ({brandedPosts.length})</p>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {brandedPosts.map((p: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{p.permission_type || "partnership"}</Badge>
                    {p.partner && <span className="text-xs text-foreground">@{p.partner.username}</span>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {!permissions && approvedCreators.length === 0 && !loading && (
        <div className="text-center py-4">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Click "Load All" to fetch branded content data</p>
          <p className="text-[10px] text-muted-foreground mt-1">Requires instagram_branded_content_* permissions</p>
        </div>
      )}
    </div>
  );
};

export default IGBrandedContent;

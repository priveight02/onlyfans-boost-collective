import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MousePointer, RefreshCw, Plus, Trash2 } from "lucide-react";

interface Props { selectedAccount: string; selectedPage?: any; }

const CTA_TYPES = [
  "BOOK_NOW", "CALL_NOW", "CONTACT_US", "GET_OFFER", "LEARN_MORE",
  "SHOP_NOW", "SIGN_UP", "WATCH_VIDEO", "SEND_MESSAGE", "ORDER_FOOD",
];

const FBCTAManager = ({ selectedAccount, selectedPage }: Props) => {
  const [loading, setLoading] = useState(false);
  const [ctas, setCtas] = useState<any[]>([]);
  const [ctaType, setCtaType] = useState("LEARN_MORE");
  const [ctaUrl, setCtaUrl] = useState("");

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

  const fetchCTAs = async () => {
    if (!selectedPage) { toast.error("Select a page first"); return; }
    const d = await callApi("get_page_cta", { page_id: selectedPage.id, page_access_token: selectedPage.access_token });
    if (d?.data) { setCtas(d.data); toast.success(`${d.data.length} CTAs`); }
  };

  const createCTA = async () => {
    if (!selectedPage || !ctaUrl) { toast.error("Page and URL required"); return; }
    const d = await callApi("create_page_cta", {
      page_id: selectedPage.id, page_access_token: selectedPage.access_token,
      type: ctaType, web_url: ctaUrl,
    });
    if (d?.id) { toast.success("CTA created!"); setCtaUrl(""); fetchCTAs(); }
  };

  const deleteCTA = async (ctaId: string) => {
    await callApi("delete_page_cta", { cta_id: ctaId, page_access_token: selectedPage?.access_token });
    toast.success("CTA deleted"); fetchCTAs();
  };

  if (!selectedPage) return <p className="text-xs text-muted-foreground p-4">Select a page from the Dashboard tab first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={fetchCTAs} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load CTAs</Button>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400">{selectedPage.name}</Badge>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1"><MousePointer className="h-3.5 w-3.5 text-blue-400" />Create CTA Button</h4>
          <Select value={ctaType} onValueChange={setCtaType}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CTA_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Destination URL" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} className="text-sm" />
          <Button size="sm" onClick={createCTA} disabled={loading}><Plus className="h-3.5 w-3.5 mr-1" />Create CTA</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {ctas.map(c => (
          <Card key={c.id} className="border-border/50">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{c.type?.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{c.web_url}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">{c.status}</Badge>
                <button onClick={() => deleteCTA(c.id)}><Trash2 className="h-3 w-3 text-red-400 hover:text-red-300" /></button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FBCTAManager;

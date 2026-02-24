import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, RefreshCw, FileText, Users, Download, ChevronDown } from "lucide-react";

interface Props { selectedAccount: string; selectedPage?: any; }

const FBLeadsManager = ({ selectedAccount, selectedPage }: Props) => {
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");

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

  const fetchForms = async () => {
    if (!selectedPage) { toast.error("Select a page first"); return; }
    const d = await callApi("get_lead_forms", { page_id: selectedPage.id, page_access_token: selectedPage.access_token });
    if (d?.data) { setForms(d.data); toast.success(`${d.data.length} lead forms`); }
  };

  const fetchLeads = async (formId: string) => {
    setSelectedFormId(formId);
    const d = await callApi("get_leads", { form_id: formId, page_access_token: selectedPage?.access_token });
    if (d?.data) { setLeads(d.data); toast.success(`${d.data.length} leads loaded`); }
  };

  if (!selectedPage) return <p className="text-xs text-muted-foreground p-4">Select a page from the Dashboard tab first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={fetchForms} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Lead Forms</Button>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400">{selectedPage.name}</Badge>
      </div>

      <div className="space-y-2">
        {forms.map(f => (
          <Card key={f.id} className={`border-border/50 cursor-pointer hover:border-orange-500/30 ${selectedFormId === f.id ? "border-orange-500/50 bg-orange-500/5" : ""}`} onClick={() => fetchLeads(f.id)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{f.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] py-0 px-1">{f.status}</Badge>
                    <span><Users className="h-2.5 w-2.5 inline mr-0.5" />{f.leads_count || 0} leads</span>
                    <span>{new Date(f.created_time).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedFormId && leads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5 text-orange-400" />Leads ({leads.length})</h4>
          {leads.map(l => (
            <Card key={l.id} className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {(l.field_data || []).map((f: any, i: number) => (
                      <div key={i} className="text-xs">
                        <span className="text-muted-foreground">{f.name}: </span>
                        <span className="text-foreground font-medium">{f.values?.join(", ") || "—"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    <p>{new Date(l.created_time).toLocaleDateString()}</p>
                    {l.campaign_name && <p className="text-primary">{l.campaign_name}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FBLeadsManager;

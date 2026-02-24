import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, RefreshCw, DollarSign, Users, Plus, Loader2 } from "lucide-react";

interface Props { selectedAccount: string; }

const FBFundraisersManager = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [fundraisers, setFundraisers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [charityId, setCharityId] = useState("");

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

  const fetchFundraisers = async () => {
    const d = await callApi("get_fundraisers");
    if (d?.data) { setFundraisers(d.data); toast.success(`${d.data.length} fundraisers`); }
  };

  const createFundraiser = async () => {
    if (!name || !goalAmount) { toast.error("Name and goal required"); return; }
    const d = await callApi("create_fundraiser", {
      name, description, goal_amount: parseInt(goalAmount) * 100,
      charity_id: charityId || undefined,
      end_time: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    if (d?.id) { toast.success("Fundraiser created!"); setName(""); setDescription(""); setGoalAmount(""); fetchFundraisers(); }
  };

  const fetchDonations = async (fId: string) => {
    setSelectedId(fId);
    const d = await callApi("get_fundraiser_donations", { fundraiser_id: fId });
    if (d?.data) setDonations(d.data);
  };

  return (
    <div className="space-y-4">
      <Button size="sm" variant="outline" onClick={fetchFundraisers} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Fundraisers</Button>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-pink-400" />Create Fundraiser</h4>
          <Input placeholder="Fundraiser name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />
          <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[60px] text-sm" />
          <div className="flex gap-2">
            <Input placeholder="Goal ($)" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} className="text-sm flex-1" type="number" />
            <Input placeholder="Charity ID (optional)" value={charityId} onChange={e => setCharityId(e.target.value)} className="text-sm flex-1" />
          </div>
          <Button size="sm" onClick={createFundraiser} disabled={loading}><Plus className="h-3.5 w-3.5 mr-1" />Create</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {fundraisers.map(f => (
          <Card key={f.id} className={`border-border/50 cursor-pointer hover:border-pink-500/30 ${selectedId === f.id ? "border-pink-500/50" : ""}`} onClick={() => fetchDonations(f.id)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{f.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <DollarSign className="h-2.5 w-2.5" />
                    <span>${((f.amount_raised || 0) / 100).toLocaleString()} / ${((f.goal_amount || 0) / 100).toLocaleString()}</span>
                    <span>{f.currency}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px]">{f.end_time ? new Date(f.end_time).toLocaleDateString() : "Ongoing"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedId && donations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground">Donations ({donations.length})</h4>
          {donations.map(d => (
            <Card key={d.id} className="border-border/50">
              <CardContent className="p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{d.donor?.name || "Anonymous"}</span>
                  <span className="text-green-400 font-semibold">${((d.amount || 0) / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FBFundraisersManager;

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Heart, AlertTriangle, TrendingUp, Users, Plus, Loader2, Search,
  Trash2, Edit2, Brain, Shield, Zap, Eye, DollarSign, Activity,
  ThermometerSun, Flame, Snowflake, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPENDING_MOTIVATIONS = ["emotional", "impulsive", "collector", "relationship", "status", "lonely", "fetish", "supporter"];

const EmotionalHeatmap = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form
  const [formAccount, setFormAccount] = useState("");
  const [formFanId, setFormFanId] = useState("");
  const [formFanName, setFormFanName] = useState("");
  const [formAttachment, setFormAttachment] = useState(50);
  const [formMotivation, setFormMotivation] = useState("emotional");
  const [formObsession, setFormObsession] = useState(0);
  const [formConflict, setFormConflict] = useState(0);
  const [formChurn, setFormChurn] = useState(0);
  const [formSpent, setFormSpent] = useState(0);
  const [formInteractions, setFormInteractions] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formTriggers, setFormTriggers] = useState("");

  useEffect(() => {
    loadData();
    const ch = supabase.channel("emotional-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fan_emotional_profiles" }, () => loadProfiles())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [profsRes, acctsRes] = await Promise.all([
      supabase.from("fan_emotional_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name"),
    ]);
    setProfiles(profsRes.data || []);
    setAccounts(acctsRes.data || []);
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("fan_emotional_profiles").select("*").order("created_at", { ascending: false });
    setProfiles(data || []);
  };

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (accountFilter !== "all" && p.account_id !== accountFilter) return false;
      if (riskFilter === "high" && Math.max(p.obsession_risk, p.conflict_risk, p.churn_risk) < 60) return false;
      if (riskFilter === "medium" && (Math.max(p.obsession_risk, p.conflict_risk, p.churn_risk) < 30 || Math.max(p.obsession_risk, p.conflict_risk, p.churn_risk) >= 60)) return false;
      if (riskFilter === "low" && Math.max(p.obsession_risk, p.conflict_risk, p.churn_risk) >= 30) return false;
      if (search && !(p.fan_name || "").toLowerCase().includes(search.toLowerCase()) && !p.fan_identifier.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [profiles, accountFilter, riskFilter, search]);

  const resetForm = () => {
    setFormAccount(""); setFormFanId(""); setFormFanName(""); setFormAttachment(50);
    setFormMotivation("emotional"); setFormObsession(0); setFormConflict(0); setFormChurn(0);
    setFormSpent(0); setFormInteractions(0); setFormNotes(""); setFormTriggers(""); setEditingId(null);
  };

  const saveProfile = async () => {
    if (!formAccount || !formFanId.trim()) { toast.error("Account and fan ID required"); return; }
    const payload = {
      account_id: formAccount, fan_identifier: formFanId, fan_name: formFanName || null,
      attachment_level: formAttachment, spending_motivation: formMotivation,
      obsession_risk: formObsession, conflict_risk: formConflict, churn_risk: formChurn,
      total_spent: formSpent, interaction_count: formInteractions, notes: formNotes || null,
      emotional_triggers: formTriggers ? formTriggers.split(",").map(t => t.trim()) : [],
      last_interaction_at: new Date().toISOString(),
    };
    if (editingId) {
      const { error } = await supabase.from("fan_emotional_profiles").update(payload).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Profile updated");
    } else {
      const { error } = await supabase.from("fan_emotional_profiles").insert(payload);
      if (error) toast.error(error.message); else toast.success("Fan profile created");
    }
    resetForm(); setShowAdd(false);
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from("fan_emotional_profiles").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Profile deleted");
  };

  const editProfile = (p: any) => {
    setEditingId(p.id); setFormAccount(p.account_id); setFormFanId(p.fan_identifier);
    setFormFanName(p.fan_name || ""); setFormAttachment(p.attachment_level);
    setFormMotivation(p.spending_motivation); setFormObsession(p.obsession_risk);
    setFormConflict(p.conflict_risk); setFormChurn(p.churn_risk); setFormSpent(p.total_spent);
    setFormInteractions(p.interaction_count); setFormNotes(p.notes || "");
    setFormTriggers((p.emotional_triggers as string[] || []).join(", "));
    setShowAdd(true);
  };

  const bulkAnalyze = async () => {
    if (!accountFilter || accountFilter === "all") { toast.error("Select a creator first"); return; }
    setAnalyzing(true);
    try {
      const acctProfiles = profiles.filter(p => p.account_id === accountFilter);
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [{
            role: "user",
            content: `Analyze these fan emotional profiles and provide strategic recommendations. For each fan, assess risk levels and suggest engagement strategies.

FANS: ${JSON.stringify(acctProfiles.map(p => ({
  name: p.fan_name || p.fan_identifier,
  attachment: p.attachment_level,
  spent: p.total_spent,
  obsession_risk: p.obsession_risk,
  churn_risk: p.churn_risk,
  motivation: p.spending_motivation,
})))}

Provide a brief strategic summary with:
1. Overall fan base health assessment
2. Top 3 risks to address
3. Top 3 revenue opportunities
4. Engagement strategy recommendations

Keep it concise and actionable.`
          }],
        },
      });
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      let fullContent = "";
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
        try { const p = JSON.parse(line.slice(6)); fullContent += p.choices?.[0]?.delta?.content || ""; } catch {}
      }
      toast.success("Analysis complete — check AI Co-Pilot for detailed results");
    } catch (e: any) { toast.error(e.message || "Analysis failed"); }
    setAnalyzing(false);
  };

  const riskColor = (v: number) => v >= 60 ? "text-red-400" : v >= 30 ? "text-amber-400" : "text-emerald-400";
  const riskIcon = (v: number) => v >= 60 ? <Flame className="h-3 w-3 text-red-400" /> : v >= 30 ? <ThermometerSun className="h-3 w-3 text-amber-400" /> : <Snowflake className="h-3 w-3 text-emerald-400" />;
  const acctName = (id: string) => { const a = accounts.find(a => a.id === id); return a ? (a.display_name || a.username) : ""; };

  const stats = useMemo(() => {
    const highRisk = profiles.filter(p => Math.max(p.obsession_risk, p.conflict_risk, p.churn_risk) >= 60).length;
    const totalSpent = profiles.reduce((s, p) => s + Number(p.total_spent || 0), 0);
    const avgAttach = profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + p.attachment_level, 0) / profiles.length) : 0;
    return { total: profiles.length, highRisk, totalSpent, avgAttach };
  }, [profiles]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" /> Emotional Heatmap
          </h1>
          <p className="text-xs text-white/40">Fan psychology profiling, risk alerts & emotional intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={bulkAnalyze} disabled={analyzing || accountFilter === "all"}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-8">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
            AI Analyze
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} className="bg-accent text-white text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Fan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Fans Tracked", value: stats.total, icon: Users, color: "text-blue-400" },
          { title: "High Risk", value: stats.highRisk, icon: AlertTriangle, color: "text-red-400" },
          { title: "Total Revenue", value: `$${stats.totalSpent.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
          { title: "Avg Attachment", value: `${stats.avgAttach}%`, icon: Heart, color: "text-pink-400" },
        ].map(s => (
          <Card key={s.title} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fans..."
            className="bg-white/5 border-white/10 text-white text-xs pl-8 h-8" />
        </div>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-36"><SelectValue placeholder="Creator" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Creators</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-white text-xs">{a.display_name || a.username}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-28"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Risk</SelectItem>
            <SelectItem value="high" className="text-white text-xs">🔴 High Risk</SelectItem>
            <SelectItem value="medium" className="text-white text-xs">🟡 Medium</SelectItem>
            <SelectItem value="low" className="text-white text-xs">🟢 Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fan Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-16 text-center">
            <Heart className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No fan profiles yet</p>
            <p className="text-white/20 text-xs mt-1">Add fans to start tracking emotional intelligence</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(fan => {
            const maxRisk = Math.max(fan.obsession_risk, fan.conflict_risk, fan.churn_risk);
            return (
              <Card key={fan.id} className={`bg-white/5 border-white/10 hover:border-white/20 transition-all group ${maxRisk >= 60 ? "ring-1 ring-red-500/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{fan.fan_name || fan.fan_identifier}</p>
                      <p className="text-[10px] text-white/30">{acctName(fan.account_id)} • {fan.spending_motivation}</p>
                    </div>
                    {riskIcon(maxRisk)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-1.5 bg-white/[0.03] rounded text-center">
                      <p className={`text-xs font-bold ${riskColor(fan.obsession_risk)}`}>{fan.obsession_risk}%</p>
                      <p className="text-[8px] text-white/30">Obsession</p>
                    </div>
                    <div className="p-1.5 bg-white/[0.03] rounded text-center">
                      <p className={`text-xs font-bold ${riskColor(fan.conflict_risk)}`}>{fan.conflict_risk}%</p>
                      <p className="text-[8px] text-white/30">Conflict</p>
                    </div>
                    <div className="p-1.5 bg-white/[0.03] rounded text-center">
                      <p className={`text-xs font-bold ${riskColor(fan.churn_risk)}`}>{fan.churn_risk}%</p>
                      <p className="text-[8px] text-white/30">Churn</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/40">Attachment</span>
                      <span className="text-white/60">{fan.attachment_level}%</span>
                    </div>
                    <Progress value={fan.attachment_level} className="h-1" />
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-emerald-400 font-medium">${Number(fan.total_spent || 0).toLocaleString()} spent</span>
                    <span className="text-[10px] text-white/30">{fan.interaction_count} interactions</span>
                  </div>

                  {(fan.emotional_triggers as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(fan.emotional_triggers as string[]).slice(0, 3).map((t, i) => (
                        <Badge key={i} variant="outline" className="text-[8px] border-pink-500/20 text-pink-400">{t}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => editProfile(fan)} className="h-6 text-[10px] text-white/40 hover:text-white flex-1">
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteProfile(fan.id)} className="h-6 text-[10px] text-red-400/50 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) resetForm(); setShowAdd(v); }}>
        <DialogContent className="bg-[hsl(220,40%,13%)] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "Edit Fan Profile" : "Add Fan Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={formAccount} onValueChange={setFormAccount}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue placeholder="Select creator..." /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-white text-xs">{a.display_name || a.username}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input value={formFanId} onChange={e => setFormFanId(e.target.value)} placeholder="Fan ID / Username" className="bg-white/5 border-white/10 text-white text-xs" />
              <Input value={formFanName} onChange={e => setFormFanName(e.target.value)} placeholder="Display Name" className="bg-white/5 border-white/10 text-white text-xs" />
            </div>
            <Select value={formMotivation} onValueChange={setFormMotivation}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,40%,13%)] border-white/10">
                {SPENDING_MOTIVATIONS.map(m => <SelectItem key={m} value={m} className="text-white text-xs capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Attachment Level: {formAttachment}%</label>
              <Slider value={[formAttachment]} onValueChange={v => setFormAttachment(v[0])} max={100} step={1} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Obsession: {formObsession}%</label>
                <Slider value={[formObsession]} onValueChange={v => setFormObsession(v[0])} max={100} step={1} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Conflict: {formConflict}%</label>
                <Slider value={[formConflict]} onValueChange={v => setFormConflict(v[0])} max={100} step={1} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Churn: {formChurn}%</label>
                <Slider value={[formChurn]} onValueChange={v => setFormChurn(v[0])} max={100} step={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={formSpent} onChange={e => setFormSpent(Number(e.target.value))} placeholder="Total Spent ($)" className="bg-white/5 border-white/10 text-white text-xs" />
              <Input type="number" value={formInteractions} onChange={e => setFormInteractions(Number(e.target.value))} placeholder="Interaction Count" className="bg-white/5 border-white/10 text-white text-xs" />
            </div>
            <Input value={formTriggers} onChange={e => setFormTriggers(e.target.value)} placeholder="Emotional triggers (comma-separated)..." className="bg-white/5 border-white/10 text-white text-xs" />
            <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes..." className="bg-white/5 border-white/10 text-white text-xs min-h-[60px]" />
            <Button onClick={saveProfile} className="w-full bg-accent hover:bg-accent/90">
              <Save className="h-4 w-4 mr-2" /> {editingId ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmotionalHeatmap;

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { DollarSign, TrendingUp, ArrowUpRight, Plus, Download, CreditCard, Wallet, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreditCostBadge from "./CreditCostBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(200,100%,50%)", "hsl(260,100%,65%)", "hsl(340,80%,55%)", "hsl(160,70%,45%)", "hsl(30,90%,55%)"];

const FinancialModule = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({ account_id: "", record_type: "subscription", amount: "", description: "" });

  useEffect(() => {
    const load = async () => {
      const [accts, recs] = await Promise.all([
        supabase.from("managed_accounts").select("*").order("monthly_revenue", { ascending: false }),
        supabase.from("financial_records").select("*").order("created_at", { ascending: false }),
      ]);
      setAccounts(accts.data || []);
      setRecords(recs.data || []);
    };
    load();
  }, []);

  const totalMonthly = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
  const totalLifetime = accounts.reduce((s, a) => s + (a.total_revenue || 0), 0);
  const agencyCommission = totalMonthly * 0.3;
  const creatorPayouts = totalMonthly * 0.7;

  const revenueByType = [
    { name: "Subscriptions", value: records.filter((r) => r.record_type === "subscription").reduce((s, r) => s + Number(r.amount), 0) || totalMonthly * 0.5 },
    { name: "PPV", value: records.filter((r) => r.record_type === "ppv").reduce((s, r) => s + Number(r.amount), 0) || totalMonthly * 0.3 },
    { name: "Tips", value: records.filter((r) => r.record_type === "tip").reduce((s, r) => s + Number(r.amount), 0) || totalMonthly * 0.15 },
    { name: "Other", value: totalMonthly * 0.05 },
  ];

  const profitByCreator = accounts.slice(0, 8).map((a) => ({
    name: a.display_name || a.username,
    revenue: a.monthly_revenue || 0,
    commission: (a.monthly_revenue || 0) * 0.3,
  }));

  const handleAddRecord = async () => {
    if (!newRecord.account_id || !newRecord.amount) return toast.error("Fill required fields");
    const { error } = await supabase.from("financial_records").insert({
      account_id: newRecord.account_id,
      record_type: newRecord.record_type,
      amount: parseFloat(newRecord.amount),
      description: newRecord.description,
    });
    if (error) return toast.error("Failed to add record");
    toast.success("Record added");
    setShowAdd(false);
    setNewRecord({ account_id: "", record_type: "subscription", amount: "", description: "" });
    const { data } = await supabase.from("financial_records").select("*").order("created_at", { ascending: false });
    setRecords(data || []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" /> Financials
          </h2>
          <CreditCostBadge cost="2–5" variant="header" label="per record" />
        </div>
      </div>
      {/* Financial KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Monthly Revenue", value: `$${totalMonthly.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
          { title: "Lifetime Revenue", value: `$${totalLifetime.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
          { title: "Agency Commission", value: `$${agencyCommission.toLocaleString()}`, icon: Wallet, color: "text-purple-400" },
          { title: "Creator Payouts", value: `$${creatorPayouts.toLocaleString()}`, icon: CreditCard, color: "text-pink-400" },
        ].map((stat) => (
          <Card key={stat.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[10px] text-white/40">{stat.title}</span>
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: $${value.toLocaleString()}`}>
                  {revenueByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Profitability by Creator</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitByCreator} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: 12 }} />
                <Bar dataKey="revenue" fill="hsl(200,100%,50%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="commission" fill="hsl(260,100%,65%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Add Record + Records Table */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm">Financial Records</CardTitle>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" /> Add Record</Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white">
              <DialogHeader><DialogTitle>Add Financial Record</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-white/70 text-xs">Account</Label>
                  <Select value={newRecord.account_id} onValueChange={(v) => setNewRecord({ ...newRecord, account_id: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Type</Label>
                  <Select value={newRecord.record_type} onValueChange={(v) => setNewRecord({ ...newRecord, record_type: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {["subscription", "ppv", "tip", "payout", "commission"].map((t) => <SelectItem key={t} value={t} className="text-white">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Amount ($)</Label>
                  <Input type="number" value={newRecord.amount} onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Description</Label>
                  <Input value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <Button onClick={handleAddRecord} className="w-full">Add Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-6">No financial records yet</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {records.slice(0, 20).map((r) => {
                const acct = accounts.find((a) => a.id === r.account_id);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[9px] border-white/10 text-white/50">{r.record_type}</Badge>
                      <div>
                        <p className="text-xs text-white">{r.description || r.record_type}</p>
                        <p className="text-[10px] text-white/30">{acct?.display_name || acct?.username || "Unknown"}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${r.record_type === "payout" ? "text-red-400" : "text-emerald-400"}`}>
                      {r.record_type === "payout" ? "-" : "+"}${Number(r.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialModule;

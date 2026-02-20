import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { DollarSign, TrendingUp, Plus, CreditCard, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreditCostBadge from "./CreditCostBadge";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreditAction } from "@/hooks/useCreditAction";

const COLORS = ["hsl(217,91%,60%)", "hsl(262,83%,58%)", "hsl(339,90%,51%)", "hsl(160,84%,39%)", "hsl(38,92%,50%)"];

const chartTooltipStyle = {
  background: "hsl(222 47% 10%)",
  border: "1px solid hsl(217 91% 60% / 0.1)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: 12,
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)",
};

const FinancialModule = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({ account_id: "", record_type: "subscription", amount: "", description: "" });
  const { performAction, insufficientModal, closeInsufficientModal } = useCreditAction();

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
    await performAction('create_financial_record', async () => {
      const { error } = await supabase.from("financial_records").insert({
        account_id: newRecord.account_id,
        record_type: newRecord.record_type,
        amount: parseFloat(newRecord.amount),
        description: newRecord.description,
      });
      if (error) { toast.error("Failed to add record"); throw error; }
      toast.success("Record added");
      setShowAdd(false);
      setNewRecord({ account_id: "", record_type: "subscription", amount: "", description: "" });
      const { data } = await supabase.from("financial_records").select("*").order("created_at", { ascending: false });
      setRecords(data || []);
    });
  };

  const kpiStats = [
    { title: "MONTHLY REVENUE", value: `$${totalMonthly.toLocaleString()}`, color: "hsl(160,84%,39%)" },
    { title: "LIFETIME REVENUE", value: `$${totalLifetime.toLocaleString()}`, color: "hsl(217,91%,60%)" },
    { title: "AGENCY COMMISSION", value: `$${agencyCommission.toLocaleString()}`, color: "hsl(262,83%,58%)" },
    { title: "CREATOR PAYOUTS", value: `$${creatorPayouts.toLocaleString()}`, color: "hsl(339,90%,51%)" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="crm-section-title text-lg">Financials</h2>
          <p className="crm-section-subtitle">Revenue and commission overview</p>
        </div>
        <CreditCostBadge cost="2-5" variant="header" label="per record" />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiStats.map((stat) => (
          <div key={stat.title} className="crm-stat-card">
            <p className="text-[10px] font-semibold tracking-widest mb-2" style={{ color: stat.color }}>{stat.title}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="crm-panel p-5">
          <h3 className="crm-section-title mb-4">Revenue by Source</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0} label={({ name, value }) => `${name}: $${value.toLocaleString()}`}>
                  {revenueByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="crm-panel p-5">
          <h3 className="crm-section-title mb-4">Profitability by Creator</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitByCreator} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.03)" />
                <XAxis type="number" stroke="transparent" tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.25)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.35)" }} width={80} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="revenue" fill="hsl(217,91%,60%)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="commission" fill="hsl(262,83%,58%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Records */}
      <div className="crm-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="crm-section-title">Financial Records</h3>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="crm-btn-primary gap-1.5 h-9"><Plus className="h-3.5 w-3.5" /> Add Record</Button>
            </DialogTrigger>
            <DialogContent className="crm-dialog text-white">
              <DialogHeader><DialogTitle>Add Financial Record</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-white/50 text-xs">Account</Label>
                  <Select value={newRecord.account_id} onValueChange={(v) => setNewRecord({ ...newRecord, account_id: v })}>
                    <SelectTrigger className="crm-input h-10"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/50 text-xs">Type</Label>
                  <Select value={newRecord.record_type} onValueChange={(v) => setNewRecord({ ...newRecord, record_type: v })}>
                    <SelectTrigger className="crm-input h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(222,47%,10%)] border-white/[0.06] rounded-xl">
                      {["subscription", "ppv", "tip", "payout", "commission"].map((t) => <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/50 text-xs">Amount ($)</Label>
                  <Input type="number" value={newRecord.amount} onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })} className="crm-input h-10" />
                </div>
                <div><Label className="text-white/50 text-xs">Description</Label>
                  <Input value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} className="crm-input h-10" />
                </div>
                <Button onClick={handleAddRecord} className="w-full crm-btn-primary h-10">Add Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {records.length === 0 ? (
          <p className="text-white/20 text-sm text-center py-8">No financial records yet</p>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {records.slice(0, 20).map((r) => {
              const acct = accounts.find((a) => a.id === r.account_id);
              return (
                <div key={r.id} className="crm-list-row">
                  <div className="flex items-center gap-3">
                    <span className="crm-badge border border-white/[0.06] bg-white/[0.03] text-white/40">{r.record_type}</span>
                    <div>
                      <p className="text-sm text-white">{r.description || r.record_type}</p>
                      <p className="text-[11px] text-white/25">{acct?.display_name || acct?.username || "Unknown"}</p>
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
      </div>
      <InsufficientCreditsModal open={insufficientModal.open} onClose={closeInsufficientModal} requiredCredits={insufficientModal.requiredCredits} actionName={insufficientModal.actionName} />
    </div>
  );
};

export default FinancialModule;

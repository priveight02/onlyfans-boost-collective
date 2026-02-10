import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, FileText, BarChart3, Users, DollarSign, Calendar, Clock, CheckCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ReportingExport = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [format, setFormat] = useState("csv");
  const [generating, setGenerating] = useState("");

  useEffect(() => {
    const load = async () => {
      const [a, t, m, th, r, c] = await Promise.all([
        supabase.from("managed_accounts").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("team_members").select("*"),
        supabase.from("message_threads").select("*"),
        supabase.from("financial_records").select("*"),
        supabase.from("contracts").select("*"),
      ]);
      setAccounts(a.data || []);
      setTasks(t.data || []);
      setMembers(m.data || []);
      setThreads(th.data || []);
      setRecords(r.data || []);
      setContracts(c.data || []);
    };
    load();
  }, []);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReport = (reportType: string) => {
    setGenerating(reportType);
    const date = new Date().toISOString().split("T")[0];

    try {
      switch (reportType) {
        case "accounts": {
          if (format === "csv") {
            const headers = "Username,Display Name,Status,Tier,Monthly Revenue,Total Revenue,Subscribers,Engagement Rate,Content Count,Created\n";
            const rows = accounts.map(a =>
              `"${a.username}","${a.display_name || ""}","${a.status}","${a.tier || "standard"}",${a.monthly_revenue || 0},${a.total_revenue || 0},${a.subscriber_count || 0},${a.engagement_rate || 0},${a.content_count || 0},"${a.created_at}"`
            ).join("\n");
            downloadFile(headers + rows, `accounts-${date}.csv`, "text/csv");
          } else {
            downloadFile(JSON.stringify(accounts, null, 2), `accounts-${date}.json`, "application/json");
          }
          break;
        }
        case "financial": {
          const totalMonthly = accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0);
          const report = {
            generated: new Date().toISOString(),
            summary: {
              totalMonthlyRevenue: totalMonthly,
              totalLifetimeRevenue: accounts.reduce((s, a) => s + (a.total_revenue || 0), 0),
              agencyCommission: totalMonthly * 0.3,
              creatorPayouts: totalMonthly * 0.7,
              activeAccounts: accounts.filter(a => a.status === "active").length,
              totalSubscribers: accounts.reduce((s, a) => s + (a.subscriber_count || 0), 0),
            },
            accounts: accounts.map(a => ({
              username: a.username,
              revenue: a.monthly_revenue || 0,
              commission: (a.monthly_revenue || 0) * 0.3,
              subscribers: a.subscriber_count || 0,
            })),
            records: records.map(r => ({
              type: r.record_type,
              amount: r.amount,
              description: r.description,
              date: r.created_at,
            })),
          };
          if (format === "csv") {
            const headers = "Type,Amount,Description,Date\n";
            const rows = records.map(r => `"${r.record_type}",${r.amount},"${r.description || ""}","${r.created_at}"`).join("\n");
            downloadFile(headers + rows, `financial-${date}.csv`, "text/csv");
          } else {
            downloadFile(JSON.stringify(report, null, 2), `financial-${date}.json`, "application/json");
          }
          break;
        }
        case "team": {
          if (format === "csv") {
            const headers = "Name,Email,Role,Status,Created\n";
            const rows = members.map(m => `"${m.name}","${m.email}","${m.role}","${m.status}","${m.created_at}"`).join("\n");
            downloadFile(headers + rows, `team-${date}.csv`, "text/csv");
          } else {
            downloadFile(JSON.stringify(members, null, 2), `team-${date}.json`, "application/json");
          }
          break;
        }
        case "tasks": {
          if (format === "csv") {
            const headers = "Title,Status,Priority,Due Date,Created\n";
            const rows = tasks.map(t => `"${t.title}","${t.status}","${t.priority}","${t.due_date || ""}","${t.created_at}"`).join("\n");
            downloadFile(headers + rows, `tasks-${date}.csv`, "text/csv");
          } else {
            downloadFile(JSON.stringify(tasks, null, 2), `tasks-${date}.json`, "application/json");
          }
          break;
        }
        case "full": {
          const fullReport = {
            generated: new Date().toISOString(),
            accounts, tasks, team: members, threads, financialRecords: records, contracts,
            summary: {
              totalAccounts: accounts.length,
              activeAccounts: accounts.filter(a => a.status === "active").length,
              totalRevenue: accounts.reduce((s, a) => s + (a.monthly_revenue || 0), 0),
              totalTasks: tasks.length,
              completedTasks: tasks.filter(t => t.status === "done").length,
              teamMembers: members.length,
              openThreads: threads.filter(t => t.status === "open").length,
              totalContracts: contracts.length,
            },
          };
          downloadFile(JSON.stringify(fullReport, null, 2), `full-report-${date}.json`, "application/json");
          break;
        }
      }
      toast.success("Report generated!");
    } catch {
      toast.error("Failed to generate report");
    }
    setGenerating("");
  };

  const reports = [
    { id: "accounts", title: "Creator Accounts", description: "All managed accounts with metrics", icon: Users, count: accounts.length },
    { id: "financial", title: "Financial Summary", description: "Revenue, commissions, payouts, records", icon: DollarSign, count: records.length },
    { id: "team", title: "Team Members", description: "Staff roster with roles and status", icon: Users, count: members.length },
    { id: "tasks", title: "Tasks & Workflows", description: "All tasks with status and assignments", icon: CheckCircle, count: tasks.length },
    { id: "full", title: "Full Agency Report", description: "Complete data export (all modules)", icon: BarChart3, count: null },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" /> Reports & Exports
          </h3>
          <p className="text-xs text-white/40 mt-0.5">Generate and download data reports</p>
        </div>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
            <SelectItem value="csv" className="text-white">CSV</SelectItem>
            <SelectItem value="json" className="text-white">JSON</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Report Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {reports.map(report => (
          <Card key={report.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/[0.08] transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <report.icon className="h-5 w-5 text-accent" />
                </div>
                {report.count !== null && (
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{report.count} records</Badge>
                )}
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{report.title}</h4>
              <p className="text-xs text-white/40 mb-4">{report.description}</p>
              <Button
                size="sm"
                onClick={() => generateReport(report.id)}
                disabled={generating === report.id}
                className="w-full gap-2 h-8 text-xs"
              >
                <Download className="h-3 w-3" />
                {generating === report.id ? "Generating..." : `Export ${format.toUpperCase()}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {[
              { label: "Accounts", value: accounts.length },
              { label: "Active", value: accounts.filter(a => a.status === "active").length },
              { label: "Tasks", value: tasks.length },
              { label: "Completed", value: tasks.filter(t => t.status === "done").length },
              { label: "Team", value: members.length },
              { label: "Contracts", value: contracts.length },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportingExport;

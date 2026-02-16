import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LoginAttempt {
  id: string;
  email: string | null;
  ip_address: string | null;
  success: boolean;
  user_agent: string | null;
  created_at: string;
}

const AdminSecurity = () => {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [failedLogins, setFailedLogins] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const attemptsRes = await supabase.from("admin_login_attempts").select("*").order("created_at", { ascending: false }).limit(50);
      if (attemptsRes.data) {
        setLoginAttempts(attemptsRes.data);
        setFailedLogins(attemptsRes.data.filter((a) => !a.success).length);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Login Attempts", value: loginAttempts.length.toString(), icon: Shield },
          { title: "Failed Logins", value: failedLogins.toString(), icon: AlertTriangle, destructive: true },
        ].map((stat) => (
          <Card key={stat.title} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.destructive ? "text-red-400" : "text-accent"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.destructive ? "text-red-400" : "text-white"}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Login Attempts */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Admin Login Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/50">Timestamp</TableHead>
                <TableHead className="text-white/50">Email</TableHead>
                <TableHead className="text-white/50">IP Address</TableHead>
                <TableHead className="text-white/50">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginAttempts.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={4} className="text-center text-white/30">
                    No login attempts recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                loginAttempts.map((attempt) => (
                  <TableRow key={attempt.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-xs text-white/60">{formatDate(attempt.created_at)}</TableCell>
                    <TableCell className="text-white/70">{attempt.email || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-white/50">{attempt.ip_address || "—"}</TableCell>
                    <TableCell>
                      <Badge className={attempt.success
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                      }>
                        {attempt.success ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Site visit tracking paused */}
    </div>
  );
};

export default AdminSecurity;

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
import { Shield, Eye, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LoginAttempt {
  id: string;
  email: string | null;
  ip_address: string | null;
  success: boolean;
  user_agent: string | null;
  created_at: string;
}

interface SiteVisit {
  id: string;
  page_path: string;
  visitor_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

const AdminSecurity = () => {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [uniqueIPs, setUniqueIPs] = useState(0);
  const [failedLogins, setFailedLogins] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [attemptsRes, visitsRes, countRes] = await Promise.all([
        supabase
          .from("admin_login_attempts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("site_visits")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("site_visits")
          .select("id", { count: "exact", head: true }),
      ]);

      if (attemptsRes.data) {
        setLoginAttempts(attemptsRes.data);
        setFailedLogins(attemptsRes.data.filter((a) => !a.success).length);
      }
      if (visitsRes.data) {
        setVisits(visitsRes.data);
        const ips = new Set(visitsRes.data.map((v) => v.visitor_ip).filter(Boolean));
        setUniqueIPs(ips.size);
      }
      if (countRes.count !== null) {
        setTotalVisits(countRes.count);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique IPs</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueIPs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Login Attempts</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginAttempts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedLogins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Login Attempts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Login Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginAttempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No login attempts recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                loginAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="text-xs">{formatDate(attempt.created_at)}</TableCell>
                    <TableCell>{attempt.email || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{attempt.ip_address || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={attempt.success ? "default" : "destructive"}>
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

      {/* Recent Visits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Site Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No visits recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-xs">{formatDate(visit.created_at)}</TableCell>
                    <TableCell>{visit.page_path}</TableCell>
                    <TableCell className="font-mono text-xs">{visit.visitor_ip || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurity;

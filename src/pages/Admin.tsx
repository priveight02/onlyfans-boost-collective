import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminSecurity from "@/components/admin/AdminSecurity";
import CRMAccountsTab from "@/components/admin/CRMAccountsTab";
import ProfileLookup from "@/components/admin/ProfileLookup";
import AudienceIntelligence from "@/components/admin/AudienceIntelligence";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LayoutDashboard, Lock, Settings, LogOut, Contact, Search, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { user, loading, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      toast.error("You don't have permission to access the admin panel");
      navigate("/");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    supabase.from("managed_accounts").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setAccounts(data || []));
  }, [user, isAdmin]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(210,100%,12%)] via-[hsl(220,100%,10%)] to-[hsl(230,100%,8%)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(210,100%,12%)] via-[hsl(220,100%,10%)] to-[hsl(230,100%,8%)]">
      <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-white">CRM Dashboard</h1>
              <p className="text-sm text-white/50">Ozc Agency Management</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-white/60 hover:text-white hover:bg-white/10 gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl flex-wrap">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-2">
              <Contact className="h-4 w-4" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="lookup" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-2">
              <Search className="h-4 w-4" />
              Profile Lookup
            </TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-2">
              <BarChart3 className="h-4 w-4" />
              Audience Intel
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <AdminDashboard />
          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            <CRMAccountsTab />
          </TabsContent>
          <TabsContent value="lookup" className="space-y-4">
            <ProfileLookup />
          </TabsContent>
          <TabsContent value="audience" className="space-y-4">
            <AudienceIntelligence accounts={accounts} />
          </TabsContent>
          <TabsContent value="security" className="space-y-4">
            <AdminSecurity />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Site Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Site Title</label>
                    <Input
                      type="text"
                      placeholder="Ozc Agency"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Site Description</label>
                    <textarea
                      className="w-full min-h-[100px] p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-accent focus:outline-none transition-colors"
                      placeholder="Enter site description..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

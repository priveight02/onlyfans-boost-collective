import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedDashboard from "@/components/admin/EnhancedDashboard";
import AdminSecurity from "@/components/admin/AdminSecurity";
import ComplianceCenter from "@/components/admin/ComplianceCenter";
import AdminCredits from "@/components/admin/AdminCredits";
import AdminCustomers from "@/components/admin/AdminCustomers";
import AIControlPanel from "@/components/admin/enterprise/AIControlPanel";
import FeatureFlagsPanel from "@/components/admin/enterprise/FeatureFlagsPanel";
import AuditTrailPanel from "@/components/admin/enterprise/AuditTrailPanel";
import IncidentManager from "@/components/admin/enterprise/IncidentManager";
import SystemOpsPanel from "@/components/admin/enterprise/SystemOpsPanel";
import WorkspaceAdmin from "@/components/admin/WorkspaceAdmin";
import AdminAPIManagement from "@/components/admin/AdminAPIManagement";
import {
  Shield, LayoutDashboard, Lock, LogOut, ShieldCheck, Coins, UserCheck,
  Brain, Flag, FileText, AlertTriangle, Settings, Users, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { user, loading, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-[hsl(210,100%,12%)] via-[hsl(220,100%,10%)] to-[hsl(230,100%,8%)]">
      <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-white">Admin Control Plane</h1>
              <p className="text-sm text-white/50">Enterprise Operations • Security • AI Governance • Compliance</p>
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
          <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent data-[state=active]:border-accent/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <UserCheck className="h-3.5 w-3.5" /> Customers
            </TabsTrigger>
            <TabsTrigger value="workspace" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <Users className="h-3.5 w-3.5" /> Workspace
            </TabsTrigger>
            <TabsTrigger value="credits" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <Coins className="h-3.5 w-3.5" /> Credits
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <Brain className="h-3.5 w-3.5" /> AI Control
            </TabsTrigger>
            <TabsTrigger value="flags" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <Flag className="h-3.5 w-3.5" /> Feature Flags
            </TabsTrigger>
            <TabsTrigger value="incidents" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300 data-[state=active]:border-red-500/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <AlertTriangle className="h-3.5 w-3.5" /> Incidents
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Audit Trail
            </TabsTrigger>
            <TabsTrigger value="ops" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> System Ops
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Compliance
            </TabsTrigger>
            <TabsTrigger value="api-mgmt" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/30 text-white/50 rounded-lg gap-1.5 text-xs border border-transparent">
              <Code2 className="h-3.5 w-3.5" /> API Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><EnhancedDashboard isAdmin={true} /></TabsContent>
          <TabsContent value="customers"><AdminCustomers /></TabsContent>
          <TabsContent value="workspace"><WorkspaceAdmin /></TabsContent>
          <TabsContent value="credits"><AdminCredits /></TabsContent>
          <TabsContent value="ai"><AIControlPanel /></TabsContent>
          <TabsContent value="flags"><FeatureFlagsPanel /></TabsContent>
          <TabsContent value="incidents"><IncidentManager /></TabsContent>
          <TabsContent value="audit"><AuditTrailPanel /></TabsContent>
          <TabsContent value="ops"><SystemOpsPanel /></TabsContent>
          <TabsContent value="security"><AdminSecurity /></TabsContent>
          <TabsContent value="compliance"><ComplianceCenter /></TabsContent>
          <TabsContent value="api-mgmt"><AdminAPIManagement /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Shield, UserPlus, Trash2, RefreshCw, Loader2, Search,
  Crown, ShieldCheck, UserCog, Eye, Mail, Clock, CheckCircle, XCircle,
  Activity, MoreHorizontal, ShieldAlert, Ban, Key,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const roleStyles: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-red-500/15 text-red-400 border-red-500/20", icon: Crown },
  moderator: { label: "Moderator", color: "bg-violet-500/15 text-violet-400 border-violet-500/20", icon: ShieldCheck },
  user: { label: "User", color: "bg-sky-500/15 text-sky-400 border-sky-500/20", icon: Users },
};

const ALL_PERMISSIONS = [
  "grant_credits",
  "revoke_credits",
  "manage_users",
  "manage_roles",
  "view_analytics",
  "manage_accounts",
  "manage_content",
  "send_messages",
  "manage_contracts",
  "manage_billing",
  "view_audit_logs",
  "manage_settings",
  "manage_scripts",
  "manage_social",
  "manage_automations",
  "access_copilot",
  "manage_team",
  "manage_bio_links",
  "view_financials",
  "export_data",
];

const WorkspaceAdmin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("roles");

  // Roles tab
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [roleSearch, setRoleSearch] = useState("");

  // Invitations tab
  const [invLoaded, setInvLoaded] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);

  // Activity tab
  const [actLoaded, setActLoaded] = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Dialogs
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showSetRoleDialog, setShowSetRoleDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [setRoleUserId, setSetRoleUserId] = useState("");
  const [setRoleValue, setSetRoleValue] = useState("user");
  const [setRolePermissions, setSetRolePermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const togglePermission = (perm: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(perm) ? list.filter(p => p !== perm) : [...list, perm]);
  };

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else {
      const userIds = (data || []).map((r: any) => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, display_name, username, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setUserRoles((data || []).map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) || null })));
      } else {
        setUserRoles([]);
      }
    }
    setRolesLoaded(true);
    setRolesLoading(false);
  }, []);

  const fetchInvitations = useCallback(async () => {
    setInvLoading(true);
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else setInvitations(data || []);
    setInvLoaded(true);
    setInvLoading(false);
  }, []);

  const fetchActivity = useCallback(async () => {
    setActLoading(true);
    const { data, error } = await supabase
      .from("workspace_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else setActivities(data || []);
    setActLoaded(true);
    setActLoading(false);
  }, []);

  const logActivity = async (action: string, targetType: string, targetId?: string, details?: any) => {
    await supabase.from("workspace_activity_log").insert({
      actor_id: user?.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  };

  const handleSetRole = async () => {
    if (!setRoleUserId.trim()) { toast.error("User ID or email required"); return; }
    setSaving(true);
    // Find user by ID or email
    let targetUserId = setRoleUserId.trim();
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("email", targetUserId)
      .single();
    
    if (profileByEmail) targetUserId = profileByEmail.user_id;
    
    const { data: profileById } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("user_id", targetUserId)
      .single();

    if (!profileById) {
      toast.error("User not found");
      setSaving(false);
      return;
    }

    await supabase.from("user_roles").delete().eq("user_id", profileById.user_id);
    const { error } = await supabase.from("user_roles").insert(
      { user_id: profileById.user_id, role: setRoleValue as any }
    );
    if (error) { toast.error(error.message); }
    else {
      toast.success(`Role "${setRoleValue}" assigned to ${profileById.email}`);
      await logActivity("set_role", "user", profileById.user_id, { role: setRoleValue, permissions: setRolePermissions });
      setShowSetRoleDialog(false);
      setSetRoleUserId("");
      setSetRolePermissions([]);
      if (rolesLoaded) fetchRoles();
    }
    setSaving(false);
  };

  const handleRemoveRole = async (roleEntry: any) => {
    if (!confirm(`Remove "${roleEntry.role}" role from this user?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", roleEntry.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Role removed");
      await logActivity("remove_role", "user", roleEntry.user_id, { role: roleEntry.role });
      fetchRoles();
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) { toast.error("Email required"); return; }
    setSaving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("send-workspace-invite", {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          permissions: invitePermissions,
        },
      });

      if (res.error) throw new Error(res.error.message);

      toast.success(`Invitation email sent to ${inviteEmail}`);
      setShowInviteDialog(false);
      setInviteEmail("");
      setInvitePermissions([]);
      if (invLoaded) fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    }
    setSaving(false);
  };

  const handleRevokeInvitation = async (inv: any) => {
    const { error } = await supabase.from("workspace_invitations").update({ status: "revoked" }).eq("id", inv.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation revoked");
      await logActivity("invite_revoked", "invitation", inv.id, { email: inv.email });
      fetchInvitations();
    }
  };

  const filteredRoles = roleSearch
    ? userRoles.filter(r =>
        r.profile?.email?.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.profile?.display_name?.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.role?.toLowerCase().includes(roleSearch.toLowerCase())
      )
    : userRoles;

  const LoadButton = ({ onClick, loading: l }: { onClick: () => void; loading: boolean }) => (
    <div className="flex flex-col items-center gap-3 py-12">
      <p className="text-white/30 text-sm">Click to load data</p>
      <Button onClick={onClick} disabled={l} className="gap-1.5 bg-accent hover:bg-accent/80">
        {l ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Load
      </Button>
    </div>
  );

  const PermissionsGrid = ({ selected, onToggle }: { selected: string[]; onToggle: (p: string) => void }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/50 flex items-center gap-1"><Key className="h-3 w-3" /> Permissions</Label>
      <ScrollArea className="h-[180px] rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_PERMISSIONS.map(perm => (
            <label
              key={perm}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                selected.includes(perm) ? "bg-accent/10 text-accent border border-accent/20" : "text-white/50 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Checkbox
                checked={selected.includes(perm)}
                onCheckedChange={() => onToggle(perm)}
                className="h-3.5 w-3.5 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
              />
              {perm.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" /> Workspace Administration
          </h2>
          <p className="text-xs text-white/40 mt-0.5">Manage roles, invitations & activity</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSetRoleDialog(true)} variant="outline" className="gap-2 text-sm h-9 border-white/10 text-white hover:bg-white/10">
            <ShieldAlert className="h-4 w-4" /> Set Role
          </Button>
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2 text-sm h-9 bg-accent hover:bg-accent/80">
            <UserPlus className="h-4 w-4" /> Invite User
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 p-0.5 rounded-lg">
          <TabsTrigger value="roles" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-md gap-1.5 text-xs">
            <Crown className="h-3.5 w-3.5" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="invitations" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-md gap-1.5 text-xs">
            <Mail className="h-3.5 w-3.5" /> Invitations
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-md gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" /> Activity Log
          </TabsTrigger>
        </TabsList>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="mt-4">
          {!rolesLoaded ? <LoadButton onClick={fetchRoles} loading={rolesLoading} /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                    placeholder="Search by email, name, or role..."
                    className="pl-9 bg-white/5 border-white/10 text-white h-9 text-sm"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={fetchRoles} className="h-9 w-9 text-white/40 hover:text-white">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {filteredRoles.length === 0 ? (
                <div className="text-center py-12 text-white/20">
                  <Shield className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-sm">No roles assigned</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredRoles.map(entry => {
                    const style = roleStyles[entry.role] || roleStyles.user;
                    const RIcon = style.icon;
                    return (
                      <div key={entry.id} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/20 to-violet-500/20 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                          {entry.profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{entry.profile?.display_name || entry.profile?.email || entry.user_id}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${style.color}`}>
                              <RIcon className="h-2.5 w-2.5 mr-1" /> {style.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-white/30 truncate">{entry.profile?.email || entry.user_id}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[hsl(220,60%,13%)] border-white/10">
                            <DropdownMenuItem onClick={() => handleRemoveRole(entry)} className="text-red-400 hover:bg-red-500/10 cursor-pointer gap-2">
                              <Trash2 className="h-3.5 w-3.5" /> Remove Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* INVITATIONS TAB */}
        <TabsContent value="invitations" className="mt-4">
          {!invLoaded ? <LoadButton onClick={fetchInvitations} loading={invLoading} /> : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchInvitations} className="h-9 w-9 text-white/40 hover:text-white">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {invitations.length === 0 ? (
                <div className="text-center py-12 text-white/20">
                  <Mail className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-sm">No invitations sent</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-white/30" />
                        <div>
                          <p className="text-sm text-white">{inv.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-white/30">Role: {inv.role}</span>
                            {inv.permissions && inv.permissions.length > 0 && (
                              <span className="text-[10px] text-accent/60">{inv.permissions.length} permissions</span>
                            )}
                            <span className="text-xs text-white/20">{new Date(inv.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                          inv.status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
                          inv.status === "accepted" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" :
                          "bg-red-500/15 text-red-400 border-red-500/20"
                        }`}>
                          {inv.status === "pending" ? <Clock className="h-2.5 w-2.5 mr-1" /> :
                           inv.status === "accepted" ? <CheckCircle className="h-2.5 w-2.5 mr-1" /> :
                           <XCircle className="h-2.5 w-2.5 mr-1" />}
                          {inv.status}
                        </Badge>
                        {inv.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={() => handleRevokeInvitation(inv)} className="text-red-400 hover:bg-red-500/10 text-xs h-7">
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="mt-4">
          {!actLoaded ? <LoadButton onClick={fetchActivity} loading={actLoading} /> : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchActivity} className="h-9 w-9 text-white/40 hover:text-white">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {activities.length === 0 ? (
                <div className="text-center py-12 text-white/20">
                  <Activity className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-sm">No activity recorded</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {activities.map(act => (
                      <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Activity className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-medium">{act.action}</span>
                            <span className="text-white/40"> on {act.target_type}</span>
                          </p>
                          {act.details && (
                            <p className="text-xs text-white/30 mt-0.5 truncate">{JSON.stringify(act.details)}</p>
                          )}
                          <p className="text-[10px] text-white/20 mt-1">{new Date(act.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Set Role Dialog */}
      <Dialog open={showSetRoleDialog} onOpenChange={setShowSetRoleDialog}>
        <DialogContent className="bg-[hsl(220,60%,10%)] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent" /> Assign Role to User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">User ID or Email</Label>
              <Input
                value={setRoleUserId}
                onChange={e => setSetRoleUserId(e.target.value)}
                placeholder="user-uuid or email@example.com"
                className="bg-white/5 border-white/10 text-white h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Role</Label>
              <Select value={setRoleValue} onValueChange={setSetRoleValue}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  <SelectItem value="admin" className="text-white hover:bg-white/10">Admin</SelectItem>
                  <SelectItem value="moderator" className="text-white hover:bg-white/10">Moderator</SelectItem>
                  <SelectItem value="user" className="text-white hover:bg-white/10">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PermissionsGrid selected={setRolePermissions} onToggle={(p) => togglePermission(p, setRolePermissions, setSetRolePermissions)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSetRoleDialog(false)} className="text-white/50 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSetRole} disabled={saving} className="bg-accent hover:bg-accent/80">
              {saving ? "Saving..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-[hsl(220,60%,10%)] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" /> Invite User to Workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-white/5 border-white/10 text-white h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  <SelectItem value="admin" className="text-white hover:bg-white/10">Admin</SelectItem>
                  <SelectItem value="moderator" className="text-white hover:bg-white/10">Moderator</SelectItem>
                  <SelectItem value="user" className="text-white hover:bg-white/10">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PermissionsGrid selected={invitePermissions} onToggle={(p) => togglePermission(p, invitePermissions, setInvitePermissions)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInviteDialog(false)} className="text-white/50 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSendInvitation} disabled={saving} className="bg-accent hover:bg-accent/80">
              {saving ? "Sending..." : "Send Invitation Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspaceAdmin;

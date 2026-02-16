import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, Plus, X, Loader2, MoreHorizontal, UserPlus,
  Shield, MessageSquare, Briefcase, Eye, Trash2, Edit2, Link2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";

const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-red-500/15 text-red-400 border-red-500/20", icon: Shield },
  manager: { label: "Manager", color: "bg-violet-500/15 text-violet-400 border-violet-500/20", icon: Briefcase },
  chatter: { label: "Chatter", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: MessageSquare },
  va: { label: "VA", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: Eye },
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  inactive: "bg-white/5 text-white/40 border-white/10",
  suspended: "bg-red-500/15 text-red-400 border-red-500/20",
};

const TeamManagement = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<any | null>(null);
  const [showAssign, setShowAssign] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const { performAction } = useCreditAction();

  const [form, setForm] = useState({ name: "", email: "", role: "chatter", notes: "" });

  const fetchAll = async () => {
    setLoading(true);
    const [membersRes, accountsRes, assignRes] = await Promise.all([
      supabase.from("team_members").select("*").order("created_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name, avatar_url, status"),
      supabase.from("team_account_assignments").select("*"),
    ]);
    setMembers(membersRes.data || []);
    setAccounts(accountsRes.data || []);
    setAssignments(assignRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = (member?: any) => {
    if (member) {
      setEditMember(member);
      setForm({ name: member.name, email: member.email, role: member.role, notes: member.notes || "" });
    } else {
      setEditMember(null);
      setForm({ name: "", email: "", role: "chatter", notes: "" });
    }
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email required"); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role, notes: form.notes || null };
    const actionType = editMember ? 'update_team_member' : 'add_team_member';
    await performAction(actionType, async () => {
      let error;
      if (editMember) {
        ({ error } = await supabase.from("team_members").update(payload).eq("id", editMember.id));
      } else {
        ({ error } = await supabase.from("team_members").insert(payload));
      }
      if (error) { toast.error(error.message); throw error; }
      toast.success(editMember ? "Member updated" : "Member added");
      setShowAdd(false);
      fetchAll();
    });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    await performAction('remove_team_member', async () => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) { toast.error("Failed"); throw error; }
      toast.success("Removed"); fetchAll();
    });
  };

  const toggleStatus = async (member: any) => {
    const newStatus = member.status === "active" ? "inactive" : "active";
    await supabase.from("team_members").update({ status: newStatus }).eq("id", member.id);
    fetchAll();
  };

  const assignAccount = async (memberId: string, accountId: string, roleOnAccount: string) => {
    const { error } = await supabase.from("team_account_assignments").insert({
      team_member_id: memberId,
      account_id: accountId,
      role_on_account: roleOnAccount,
    });
    if (error) {
      if (error.code === "23505") toast.error("Already assigned");
      else toast.error(error.message);
    } else { toast.success("Account assigned"); fetchAll(); }
  };

  const unassignAccount = async (assignmentId: string) => {
    await supabase.from("team_account_assignments").delete().eq("id", assignmentId);
    toast.success("Unassigned");
    fetchAll();
  };

  const getMemberAssignments = (memberId: string) =>
    assignments.filter(a => a.team_member_id === memberId);

  const getAccountForAssignment = (accountId: string) =>
    accounts.find(a => a.id === accountId);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" /> Team Members
          </h2>
          <p className="text-xs text-white/40 mt-0.5">{members.length} members • {assignments.length} account assignments</p>
        </div>
        <Button onClick={() => openAdd()} className="bg-accent hover:bg-accent/80 gap-2 text-sm h-9">
          <UserPlus className="h-4 w-4" /> Add Member <CreditCostBadge cost={10} />
        </Button>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <Users className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm">No team members yet</p>
          <p className="text-xs mt-1">Add chatters, managers, and VAs to your team</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map(member => {
            const memberAssigns = getMemberAssignments(member.id);
            const RoleIcon = roleConfig[member.role]?.icon || Users;
            return (
              <div key={member.id} className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-violet-500/20 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">{member.name}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${roleConfig[member.role]?.color || ""}`}>
                        <RoleIcon className="h-2.5 w-2.5 mr-1" />
                        {roleConfig[member.role]?.label || member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/40 truncate">{member.email}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[hsl(220,60%,13%)] border-white/10 text-white">
                      <DropdownMenuItem onClick={() => openAdd(member)} className="hover:bg-white/10 cursor-pointer gap-2">
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowAssign(member)} className="hover:bg-white/10 cursor-pointer gap-2">
                        <Link2 className="h-3.5 w-3.5" /> Assign Accounts
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(member)} className="hover:bg-white/10 cursor-pointer gap-2">
                        {member.status === "active" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(member.id)} className="text-red-400 hover:bg-red-500/10 cursor-pointer gap-2">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${statusColors[member.status] || ""}`}>
                    {member.status}
                  </Badge>
                </div>

                {/* Assigned accounts */}
                {memberAssigns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Assigned accounts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {memberAssigns.map(a => {
                        const acc = getAccountForAssignment(a.account_id);
                        return (
                          <div key={a.id} className="flex items-center gap-1.5 bg-white/[0.05] rounded-md px-2 py-1 text-xs">
                            <span className="text-white/70">@{acc?.username || "?"}</span>
                            <span className="text-white/30 text-[10px]">({a.role_on_account})</span>
                            <button onClick={() => unassignAccount(a.id)} className="text-white/20 hover:text-red-400 ml-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {memberAssigns.length === 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <button onClick={() => setShowAssign(member)} className="text-xs text-accent/60 hover:text-accent flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Assign to account
                    </button>
                  </div>
                )}

                {member.notes && (
                  <p className="text-[11px] text-white/25 mt-2 line-clamp-1">{member.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md bg-[hsl(220,60%,10%)] border border-white/10 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-bold text-white">{editMember ? "Edit Member" : "Add Team Member"}</h2>
              <Button size="icon" variant="ghost" onClick={() => setShowAdd(false)} className="text-white/30 hover:text-white h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">Role</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="chatter">Chatter</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">Notes</Label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full min-h-[60px] p-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-accent focus:outline-none" placeholder="Internal notes..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="flex-1 text-white/50 hover:text-white hover:bg-white/10">Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-accent hover:bg-accent/80">
                  {saving ? "Saving..." : editMember ? "Update" : "Add Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign accounts modal */}
      {showAssign && (
        <AssignAccountsModal
          member={showAssign}
          accounts={accounts}
          assignments={assignments.filter(a => a.team_member_id === showAssign.id)}
          onAssign={assignAccount}
          onUnassign={unassignAccount}
          onClose={() => setShowAssign(null)}
        />
      )}
    </div>
  );
};

const AssignAccountsModal = ({ member, accounts, assignments, onAssign, onUnassign, onClose }: any) => {
  const [roleOnAccount, setRoleOnAccount] = useState("chatter");
  const assignedIds = new Set(assignments.map((a: any) => a.account_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[hsl(220,60%,10%)] border border-white/10 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold text-white">Assign Accounts</h2>
            <p className="text-xs text-white/40 mt-0.5">for {member.name}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white/30 hover:text-white h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Role on account</Label>
            <Select value={roleOnAccount} onValueChange={setRoleOnAccount}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="chatter">Chatter</SelectItem>
                <SelectItem value="va">VA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current assignments */}
          {assignments.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2">Currently assigned</p>
              <div className="space-y-1.5">
                {assignments.map((a: any) => {
                  const acc = accounts.find((ac: any) => ac.id === a.account_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-white/[0.05] rounded-lg p-2.5 border border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80">@{acc?.username || "?"}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{a.role_on_account}</Badge>
                      </div>
                      <button onClick={() => onUnassign(a.id)} className="text-white/30 hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available accounts */}
          <div>
            <p className="text-xs text-white/40 mb-2">Available accounts</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {accounts.filter((a: any) => !assignedIds.has(a.id)).map((acc: any) => (
                <div key={acc.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05] hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-2">
                    {acc.avatar_url ? (
                      <img src={acc.avatar_url} alt="" className="w-7 h-7 rounded-md object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-accent/20 flex items-center justify-center text-white text-xs font-bold">
                        {(acc.display_name || acc.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-white/80">@{acc.username}</span>
                  </div>
                  <Button size="sm" onClick={() => onAssign(member.id, acc.id, roleOnAccount)} className="bg-accent/20 hover:bg-accent/40 text-accent text-xs h-7 px-3">
                    <Plus className="h-3 w-3 mr-1" /> Assign
                  </Button>
                </div>
              ))}
              {accounts.filter((a: any) => !assignedIds.has(a.id)).length === 0 && (
                <p className="text-xs text-white/30 text-center py-4">All accounts assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;

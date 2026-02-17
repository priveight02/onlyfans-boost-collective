import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Loader2, CheckCircle, XCircle, Crown, ShieldCheck, Users, Clock, Lock, LogIn,
} from "lucide-react";

const roleStyles: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-red-500/15 text-red-400 border-red-500/20", icon: Crown },
  moderator: { label: "Moderator", color: "bg-violet-500/15 text-violet-400 border-violet-500/20", icon: ShieldCheck },
  user: { label: "User", color: "bg-sky-500/15 text-sky-400 border-sky-500/20", icon: Users },
};

const timezones = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Dubai", "Australia/Sydney", "Pacific/Auckland",
];

const AdminOnboarding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    if (!authLoading) {
      validateToken();
    }
  }, [token, authLoading]);

  const validateToken = async () => {
    if (!token) { setError("Invalid invitation link"); setValidating(false); return; }

    try {
      const { data, error: fetchError } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (fetchError) {
        console.error("Token validation error:", fetchError);
        setError("Failed to validate invitation. Please try again.");
        setValidating(false);
        return;
      }

      if (!data) {
        setError("Invalid or expired invitation link.");
        setValidating(false);
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired. Please contact your administrator for a new invitation.");
        setValidating(false);
        return;
      }

      // Check if already used
      if (data.status !== "pending") {
        setError("This invitation has already been used or revoked.");
        setValidating(false);
        return;
      }

      setInvitation(data);
    } catch (err: any) {
      console.error("Validation error:", err);
      setError("Something went wrong. Please try again.");
    }
    setValidating(false);
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !displayName.trim() || !phone.trim() || !department.trim()) {
      toast.error("All required fields must be filled");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to complete onboarding");
      return;
    }

    setSubmitting(true);

    try {
      // Create onboarding profile
      const { error: profileError } = await supabase
        .from("admin_onboarding_profiles")
        .insert({
          user_id: user.id,
          invitation_id: invitation.id,
          email: invitation.email,
          full_name: fullName.trim(),
          display_name: displayName.trim(),
          phone: phone.trim(),
          department: department.trim(),
          bio: bio.trim() || null,
          role: invitation.role,
          permissions: invitation.permissions || [],
          timezone,
        });

      if (profileError) throw profileError;

      // Assign role
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: invitation.role as any });

      if (roleError) throw roleError;

      // Update profile display name
      await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", user.id);

      // Mark invitation as accepted
      await supabase
        .from("workspace_invitations")
        .update({ status: "accepted", onboarded_at: new Date().toISOString() })
        .eq("id", invitation.id);

      // Log activity
      await supabase.from("workspace_activity_log").insert({
        actor_id: user.id,
        action: "onboarding_completed",
        target_type: "user",
        target_id: user.id,
        details: { role: invitation.role, email: invitation.email },
      });

      toast.success("Onboarding complete! Welcome to the team.");

      if (invitation.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/crm");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || validating) {
    return (
      <div className="min-h-screen bg-[hsl(222,35%,8%)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-white/40 text-sm">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[hsl(222,35%,8%)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-white/50 text-sm mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline" className="border-white/10 text-white hover:bg-white/10">
              Go Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not logged in - prompt login
  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(222,35%,8%)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-white/50 text-sm mb-2">You need to sign in or create an account to complete your onboarding.</p>
            <p className="text-white/30 text-xs mb-6">Your invitation for <span className="text-accent">{invitation?.email}</span> as <span className="text-emerald-400">{invitation?.role}</span> is valid.</p>
            <Link to={`/auth?redirect=/admin-onboarding/${token}`}>
              <Button className="w-full bg-accent hover:bg-accent/80 gap-2">
                <LogIn className="h-4 w-4" /> Sign In to Continue
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const style = roleStyles[invitation?.role] || roleStyles.user;
  const RIcon = style.icon;
  const permissions: string[] = invitation?.permissions || [];

  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)] relative overflow-auto">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-violet-500/20 border border-accent/20 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white">Administrative Onboarding</h1>
            <p className="text-white/40 text-sm">Complete your profile to join the team</p>
          </div>

          {/* Role & Permissions Card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/60">Assigned Role & Permissions</h3>
              <Badge variant="outline" className={`${style.color} gap-1`}>
                <RIcon className="h-3 w-3" /> {style.label}
              </Badge>
            </div>
            {permissions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((p: string) => (
                  <span key={p} className="text-[10px] px-2 py-1 rounded-md bg-accent/10 text-accent/80 border border-accent/10">
                    {p.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
            {invitation?.expires_at && (
              <div className="flex items-center gap-2 mt-3 text-[10px] text-white/20">
                <Clock className="h-3 w-3" />
                Link expires: {new Date(invitation.expires_at).toLocaleString()}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl space-y-5">
            <h3 className="text-sm font-semibold text-white/60 mb-2">Personal Information</h3>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/40 flex items-center gap-1"><Lock className="h-3 w-3" /> Email Address</Label>
              <Input value={invitation?.email || ""} disabled className="bg-white/[0.02] border-white/[0.06] text-white/40 h-10 cursor-not-allowed" />
            </div>

            {/* Role (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/40 flex items-center gap-1"><Lock className="h-3 w-3" /> Assigned Role</Label>
              <Input value={style.label} disabled className="bg-white/[0.02] border-white/[0.06] text-white/40 h-10 cursor-not-allowed" />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Full Name <span className="text-red-400">*</span></Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="bg-white/5 border-white/10 text-white h-10" />
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Display Name <span className="text-red-400">*</span></Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="johnd" className="bg-white/5 border-white/10 text-white h-10" />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Phone Number <span className="text-red-400">*</span></Label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-white/5 border-white/10 text-white h-10" />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Department <span className="text-red-400">*</span></Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  <SelectItem value="management" className="text-white hover:bg-white/10">Management</SelectItem>
                  <SelectItem value="chatting" className="text-white hover:bg-white/10">Chatting</SelectItem>
                  <SelectItem value="content" className="text-white hover:bg-white/10">Content Creation</SelectItem>
                  <SelectItem value="marketing" className="text-white hover:bg-white/10">Marketing</SelectItem>
                  <SelectItem value="analytics" className="text-white hover:bg-white/10">Analytics</SelectItem>
                  <SelectItem value="support" className="text-white hover:bg-white/10">Support</SelectItem>
                  <SelectItem value="operations" className="text-white hover:bg-white/10">Operations</SelectItem>
                  <SelectItem value="finance" className="text-white hover:bg-white/10">Finance</SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-white/10">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Timezone <span className="text-red-400">*</span></Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  {timezones.map(tz => (
                    <SelectItem key={tz} value={tz} className="text-white hover:bg-white/10">{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Short Bio <span className="text-red-400">*</span></Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself and your experience..." className="bg-white/5 border-white/10 text-white min-h-[80px] resize-none" />
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !fullName || !displayName || !phone || !department}
            className="w-full h-12 bg-gradient-to-r from-accent to-violet-600 hover:from-accent/90 hover:to-violet-600/90 text-white font-semibold text-base rounded-xl shadow-lg shadow-accent/20 transition-all"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...</>
            ) : (
              <><CheckCircle className="h-5 w-5 mr-2" /> Confirm Administrative Onboarding</>
            )}
          </Button>

          <p className="text-center text-[10px] text-white/20">
            By completing onboarding, you agree to the organization's policies and terms of service.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminOnboarding;

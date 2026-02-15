import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Mail, AtSign, Save, KeyRound, LogOut, Shield, Bell,
  Activity, ChevronRight, Phone, Building2, MapPin, Trash2,
  Link2, Unlink, AlertTriangle, Eye, EyeOff, Lock
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";

type TabId = "account" | "security" | "activity" | "notifications";

const NOTIFICATION_CATEGORIES = [
  { id: "account_security", label: "Account and Security", desc: "Get notified about changes, issues, or important updates related to your account." },
  { id: "service_updates", label: "Service Status and Changes", desc: "Get alerts about the status, downtime, and other important information." },
  { id: "marketing", label: "Product Updates and Offers", desc: "Be the first to discover about new features, updates, and exclusive offers." },
];

const UserProfile = () => {
  const { user, profile, logout, refreshProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("account");

  // Account info state
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Security state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Google unlink state
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [unlinkStep, setUnlinkStep] = useState<"confirm" | "set-password" | "done">("confirm");
  const [unlinkPassword, setUnlinkPassword] = useState("");
  const [unlinkConfirmPw, setUnlinkConfirmPw] = useState("");
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Activity
  const [loginActivity, setLoginActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Detect if user signed in with Google
  const googleIdentity = user?.identities?.find(i => i.provider === "google");
  const hasPassword = user?.identities?.some(i => i.provider === "email") ?? false;
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
    }
  }, [user, profile, navigate]);

  // Load extra profile fields
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("phone, address, company").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setPhone((data as any).phone || "");
          setAddress((data as any).address || "");
          setCompany((data as any).company || "");
        }
      });
  }, [user]);

  // Load notification prefs
  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id)
      .then(({ data }) => {
        const prefs: Record<string, boolean> = {};
        NOTIFICATION_CATEGORIES.forEach(c => { prefs[c.id] = false; });
        (data || []).forEach((row: any) => { prefs[row.category] = row.email_enabled; });
        setNotifPrefs(prefs);
      });
  }, [user]);

  // Load activity
  useEffect(() => {
    if (!user || activeTab !== "activity") return;
    setLoadingActivity(true);
    supabase.from("login_activity").select("*").eq("user_id", user.id)
      .order("login_at", { ascending: false }).limit(20)
      .then(({ data }) => { setLoginActivity(data || []); setLoadingActivity(false); });
  }, [user, activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (username.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    try {
      setIsSaving(true);
      const { error } = await supabase.from("profiles")
        .update({ username, display_name: displayName, bio, phone, address, company } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated!");
    } catch (error: any) {
      if (error.message?.includes("unique")) toast.error("Username already taken");
      else toast.error(error.message || "Failed to update");
    } finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    try {
      setIsChangingPw(true);
      await updatePassword(newPassword);
      toast.success("Password updated successfully!");
      setShowPasswordDialog(false);
      setNewPassword(""); setConfirmPassword(""); setCurrentPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally { setIsChangingPw(false); }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return;

    if (unlinkStep === "confirm") {
      // Send verification email via magic link
      try {
        setIsUnlinking(true);
        const { error } = await supabase.auth.signInWithOtp({
          email: user?.email || "",
          options: { shouldCreateUser: false }
        });
        if (error) throw error;
        setVerificationSent(true);
        toast.success("Verification email sent! Check your inbox to confirm.");
        // Move to password step since they need one before unlinking
        if (!hasPassword) {
          setUnlinkStep("set-password");
        } else {
          // Has password, proceed to unlink
          await performUnlink();
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to send verification");
      } finally { setIsUnlinking(false); }
      return;
    }

    if (unlinkStep === "set-password") {
      if (unlinkPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
      if (unlinkPassword !== unlinkConfirmPw) { toast.error("Passwords do not match"); return; }
      try {
        setIsUnlinking(true);
        // Set password first
        await updatePassword(unlinkPassword);
        // Then unlink
        await performUnlink();
      } catch (error: any) {
        toast.error(error.message || "Failed to set password");
      } finally { setIsUnlinking(false); }
    }
  };

  const performUnlink = async () => {
    try {
      if (!googleIdentity) return;
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;
      toast.success("Google account unlinked successfully!");
      setShowUnlinkDialog(false);
      setUnlinkStep("confirm");
      setUnlinkPassword(""); setUnlinkConfirmPw("");
    } catch (error: any) {
      toast.error(error.message || "Failed to unlink Google");
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSavingNotifs(true);
    try {
      for (const cat of NOTIFICATION_CATEGORIES) {
        await supabase.from("notification_preferences").upsert({
          user_id: user.id,
          category: cat.id,
          email_enabled: notifPrefs[cat.id] ?? false,
        } as any, { onConflict: "user_id,category" });
      }
      toast.success("Notification preferences saved!");
    } catch (error: any) {
      toast.error("Failed to save preferences");
    } finally { setSavingNotifs(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    toast.error("Please contact liam@ozcagency.com to request account deletion.");
    setShowDeleteDialog(false);
    setDeleteConfirmText("");
  };

  const handleLogout = async () => { await logout(); navigate("/"); toast.success("Logged out"); };

  if (!user) return null;

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "account", label: "Account Information", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "activity", label: "Account Activity", icon: Activity },
    { id: "notifications", label: "Notification Settings", icon: Bell },
  ];

  const userInitial = profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-primary to-blue-900 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold backdrop-blur-sm">
              {userInitial}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile?.display_name || "Your Profile"}</h1>
              <p className="text-white/50 text-sm">@{profile?.username || "..."} · {user.email}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <nav className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-2 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-white/15 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="h-4 w-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                ))}
                <div className="h-px bg-white/10 my-2" />
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* ACCOUNT INFO TAB */}
              {activeTab === "account" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* Personal Information */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-5 w-5 text-white/70" />
                      <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                    </div>
                    <p className="text-white/40 text-xs mb-5">This information will be used for your account profile.</p>

                    <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/60">Display Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                              className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/30 rounded-xl h-11 focus:bg-white/15 focus:border-white/30"
                              placeholder="Your Name" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/60">Username</label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                              className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/30 rounded-xl h-11 focus:bg-white/15 focus:border-white/30"
                              placeholder="username" />
                          </div>
                        </div>
                      </div>

                      <SettingsRow icon={Phone} label="Phone Number" value={phone} onChange={setPhone} placeholder="+1 234 567 8900" />
                      <SettingsRow icon={MapPin} label="Address" value={address} onChange={setAddress} placeholder="Your address" />
                      <SettingsRow icon={Building2} label="Company" value={company} onChange={setCompany} placeholder="Company name (optional)" />

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-white/60">Bio</label>
                        <Input value={bio} onChange={(e) => setBio(e.target.value)}
                          className="bg-white/10 border-white/15 text-white placeholder:text-white/30 rounded-xl h-11 focus:bg-white/15 focus:border-white/30"
                          placeholder="Tell us about yourself" />
                      </div>

                      <Button type="submit" disabled={isSaving}
                        className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 rounded-full font-semibold px-8">
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </div>

                  {/* Account Settings */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="h-5 w-5 text-white/70" />
                      <h2 className="text-lg font-semibold text-white">Account Settings</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                      <InfoRow label="Email" value={user.email || ""} />
                      <InfoRow label="Member since" value={memberSince} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* Password */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <KeyRound className="h-5 w-5 text-white/70" />
                      <h2 className="text-lg font-semibold text-white">Password</h2>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">
                          {hasPassword ? "Change your account password" : "Set a password for your account"}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">Last changed: Unknown</p>
                      </div>
                      <Button onClick={() => setShowPasswordDialog(true)} variant="ghost"
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl gap-2">
                        <Lock className="h-4 w-4" />
                        {hasPassword ? "Change" : "Set Password"}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Social Logins */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="h-5 w-5 text-white/70" />
                      <h2 className="text-lg font-semibold text-white">Social Logins</h2>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">Google</p>
                          <p className="text-white/40 text-xs">
                            {googleIdentity ? `Connected as ${user.email}` : "Not connected"}
                          </p>
                        </div>
                      </div>
                      {googleIdentity ? (
                        <Button onClick={() => { setShowUnlinkDialog(true); setUnlinkStep("confirm"); }}
                          variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl gap-2 text-sm">
                          <Unlink className="h-4 w-4" /> Unlink
                        </Button>
                      ) : (
                        <span className="text-white/30 text-xs px-3 py-1.5 bg-white/5 rounded-full">Disabled</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs mt-2">You can have only one active social login at a time.</p>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-500/5 backdrop-blur-md rounded-2xl border border-red-500/20 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <h2 className="text-lg font-semibold text-red-300">Danger Zone</h2>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm font-medium">Delete account</p>
                        <p className="text-white/40 text-xs">All of your account information will be deleted without the possibility of restoration.</p>
                      </div>
                      <Button onClick={() => setShowDeleteDialog(true)}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === "activity" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-5 w-5 text-white/70" />
                      <h2 className="text-lg font-semibold text-white">Account Activity</h2>
                    </div>
                    <p className="text-white/40 text-xs mb-5">You can log out anytime from any device that has been connected to your account.</p>

                    {loadingActivity ? (
                      <div className="text-center py-8 text-white/40">Loading activity...</div>
                    ) : loginActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="h-10 w-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No login activity recorded yet.</p>
                        <p className="text-white/30 text-xs mt-1">Activity will appear here after your next login.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left text-white/50 font-medium py-2 px-3">Login Date</th>
                              <th className="text-left text-white/50 font-medium py-2 px-3">Device</th>
                              <th className="text-left text-white/50 font-medium py-2 px-3">IP Address</th>
                              <th className="text-left text-white/50 font-medium py-2 px-3">Login Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loginActivity.map((a) => (
                              <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-3 text-white/70">{new Date(a.login_at).toLocaleString()}</td>
                                <td className="py-3 px-3 text-white/60">{a.device || "Unknown"}</td>
                                <td className="py-3 px-3 text-white/50 font-mono text-xs">{a.ip_address || "N/A"}</td>
                                <td className="py-3 px-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    a.login_type === "google" ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/60"
                                  }`}>{a.login_type || "email"}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="h-5 w-5 text-white/70" />
                      <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
                    </div>
                    <p className="text-white/40 text-xs mb-5">
                      By turning on communication permissions, you agree to let us use your email, as outlined in our{" "}
                      <a href="/privacy" className="text-accent underline">Privacy Policy</a>. You can withdraw consent anytime.
                    </p>

                    <div className="space-y-0">
                      <div className="flex items-center justify-end pb-3 border-b border-white/10">
                        <span className="text-white/50 text-xs font-medium w-16 text-center">Email</span>
                      </div>
                      {NOTIFICATION_CATEGORIES.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between py-4 border-b border-white/5">
                          <div>
                            <p className="text-white/80 text-sm font-medium">{cat.label}</p>
                            <p className="text-white/40 text-xs mt-0.5">{cat.desc}</p>
                          </div>
                          <div className="w-16 flex justify-center">
                            <Checkbox
                              checked={notifPrefs[cat.id] ?? false}
                              onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, [cat.id]: !!checked })}
                              className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={handleSaveNotifications} disabled={savingNotifs}
                      className="mt-6 bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 rounded-full font-semibold px-8">
                      <Save className="mr-2 h-4 w-4" />
                      {savingNotifs ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{hasPassword ? "Change Password" : "Set Password"}</DialogTitle>
            <DialogDescription className="text-white/50">
              {hasPassword ? "Enter your new password below." : "Set a password to use email login."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">New Password</label>
              <div className="relative">
                <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/10 border-white/15 text-white rounded-xl h-11 pr-10" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/10 border-white/15 text-white rounded-xl h-11" placeholder="Re-enter password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)} className="text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={handleChangePassword} disabled={isChangingPw}
              className="bg-white text-primary hover:bg-white/90 rounded-full">
              {isChangingPw ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Google Dialog */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Unlink Google Account</DialogTitle>
            <DialogDescription className="text-white/50">
              {unlinkStep === "confirm" && "We will send a verification email to confirm this action. You will then need to set a password for your account."}
              {unlinkStep === "set-password" && "Verification sent! Now set a password before unlinking Google."}
            </DialogDescription>
          </DialogHeader>

          {unlinkStep === "confirm" && (
            <div className="py-2">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-200/80">
                <p className="font-medium text-yellow-200 mb-1">Important</p>
                <p>After unlinking, you will need to use your email and password to sign in. A verification email will be sent to <strong>{user?.email}</strong>.</p>
              </div>
            </div>
          )}

          {unlinkStep === "set-password" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">New Password</label>
                <Input type="password" value={unlinkPassword} onChange={(e) => setUnlinkPassword(e.target.value)}
                  className="bg-white/10 border-white/15 text-white rounded-xl h-11" placeholder="Min 8 characters" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">Confirm Password</label>
                <Input type="password" value={unlinkConfirmPw} onChange={(e) => setUnlinkConfirmPw(e.target.value)}
                  className="bg-white/10 border-white/15 text-white rounded-xl h-11" placeholder="Re-enter password" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlinkDialog(false)} className="text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={handleUnlinkGoogle} disabled={isUnlinking}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full">
              {isUnlinking ? "Processing..." : unlinkStep === "confirm" ? "Send Verification & Continue" : "Set Password & Unlink"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-300">Delete Account</DialogTitle>
            <DialogDescription className="text-white/50">
              This action is permanent and cannot be undone. All your data will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200/80 mb-4">
              All your account information, profile data, and preferences will be permanently removed.
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Type DELETE to confirm</label>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="bg-white/10 border-white/15 text-white rounded-xl h-11" placeholder="DELETE" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white rounded-full">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Reusable row components
const SettingsRow = ({ icon: Icon, label, value, onChange, placeholder }: {
  icon: typeof Phone; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-white/60">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/30 rounded-xl h-11 focus:bg-white/15 focus:border-white/30"
        placeholder={placeholder} />
    </div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-white/50 text-sm">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-white/80 text-sm">{value}</span>
      <ChevronRight className="h-4 w-4 text-white/20" />
    </div>
  </div>
);

export default UserProfile;

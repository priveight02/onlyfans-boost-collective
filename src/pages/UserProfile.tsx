import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, AtSign, Save, KeyRound, LogOut } from "lucide-react";
import BackButton from "@/components/BackButton";

const UserProfile = () => {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
    }
  }, [user, profile, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (username.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ username, display_name: displayName, bio })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated!");
    } catch (error: any) {
      if (error.message?.includes('unique')) {
        toast.error("Username already taken");
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out");
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary via-accent to-primary-accent">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <div className="relative min-h-screen flex items-center justify-center py-20 px-4">
        <div className="absolute top-20 left-4 z-10"><BackButton /></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold">
                  {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              <h1 className="text-2xl font-bold font-heading text-white">Your Profile</h1>
              <p className="text-white/60 text-sm">@{profile?.username || "..."}</p>
              <p className="text-white/40 text-xs mt-1">{user.email}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">Username</label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                  <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                    placeholder="your_username" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                    placeholder="Your Name" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">Bio</label>
                <Input value={bio} onChange={(e) => setBio(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                  placeholder="Tell us about yourself" />
              </div>
              <Button type="submit" disabled={isSaving}
                className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <Button variant="ghost" onClick={() => navigate("/auth?mode=forgot")}
                className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl">
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
              </Button>
              <Button variant="ghost" onClick={handleLogout}
                className="w-full text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-xl">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfile;

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  User, Mail, AtSign, Save, KeyRound, LogOut, Shield, Bell,
  Activity, ChevronRight, Phone, Building2, MapPin, Trash2,
  Link2, Unlink, AlertTriangle, Eye, EyeOff, Lock, CheckCircle2, XCircle, Info,
  Monitor, Smartphone, Tablet, Wifi, WifiOff, Plus, X, Clock,
  Globe, Languages, Download, ShieldCheck, BellRing, Settings2,
  Bookmark, Power, Sparkles, Brain, Zap, Bot, FileText, RefreshCw,
  Palette, LayoutGrid, SlidersHorizontal, Eraser, ToggleLeft,
  Rss, Compass, UserPlus, Camera, ImageIcon, Trophy, Flame, Coins, Star, Award, CreditCard
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useFeed, useNotifications, useUserRank, getRankInfo, getNextRank, getRankProgress, RANK_TIERS } from "@/hooks/useSocial";
import PostCard from "@/components/social/PostCard";
import CreatePostDialog from "@/components/social/CreatePostDialog";
import FollowButton from "@/components/social/FollowButton";
import { UserRankBadge } from "@/components/social/UserRankBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import NotificationBell from "@/components/social/NotificationBell";
import PlanCreditsTab from "@/components/profile/PlanCreditsTab";
import BillingPaymentsTab from "@/components/profile/BillingPaymentsTab";

type TabId = "account" | "security" | "activity" | "devices" | "notifications" | "ai-automation" | "preferences" | "social-feed" | "social-explore" | "social-notifications" | "rank" | "plan-credits" | "billing";

type CardNotification = { type: "success" | "error" | "info"; message: string } | null;

const NOTIFICATION_CATEGORIES = [
  { id: "account_security", label: "Account and Security", desc: "Get notified about changes, issues, or important updates related to your account." },
  { id: "service_updates", label: "Service Status and Changes", desc: "Get alerts about the status, downtime, and other important information." },
  { id: "marketing", label: "Product Updates and Offers", desc: "Be the first to discover about new features, updates, and exclusive offers." },
];

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Australia/Sydney",
  "America/Sao_Paulo", "Africa/Johannesburg", "Asia/Singapore"
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
];

const SESSION_TIMEOUT_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 480, label: "8 hours" },
  { value: 1440, label: "24 hours (default)" },
  { value: 10080, label: "7 days" },
  { value: 43200, label: "30 days" },
];

const RANK_REWARDS = [
  { tier: 'metal', bonus: 0, perks: ['Access to social feed', 'Create posts', 'Follow users'] },
  { tier: 'bronze', bonus: 50, perks: ['Bronze badge on profile', '+50 bonus points', 'Custom bio unlocked'] },
  { tier: 'silver', bonus: 100, perks: ['Silver badge on profile', '+100 bonus points', 'GIF profile pictures'] },
  { tier: 'gold', bonus: 200, perks: ['Gold badge on profile', '+200 bonus points', 'Priority support'] },
  { tier: 'platinum', bonus: 500, perks: ['Platinum badge on profile', '+500 bonus points', 'Profile banner upload'] },
  { tier: 'diamond', bonus: 1000, perks: ['Diamond badge on profile', '+1000 bonus points', 'Verified checkmark'] },
  { tier: 'legend', bonus: 2500, perks: ['Legend badge on profile', '+2500 bonus points', 'Exclusive features access', 'Custom profile theme'] },
];

const Card = ({ children, className = "", danger = false }: { children: React.ReactNode; className?: string; danger?: boolean }) => (
  <div className={`rounded-2xl border p-6 backdrop-blur-xl ${danger ? "bg-red-500/5 border-red-500/15" : "bg-[hsl(222,28%,11%)] border-purple-500/10"} ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle, danger = false }: { icon: any; title: string; subtitle?: string; danger?: boolean }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2.5 mb-1">
      <Icon className={`h-[18px] w-[18px] ${danger ? "text-red-400" : "text-purple-400"}`} />
      <h2 className={`text-[15px] font-semibold tracking-tight ${danger ? "text-red-300" : "text-white"}`}>{title}</h2>
    </div>
    {subtitle && <p className="text-white/50 text-[12px] ml-[30px] leading-relaxed">{subtitle}</p>}
  </div>
);

const parseUA = (ua: string) => {
  let browser = "Unknown";
  let os = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  return { browser, os };
};

const DeviceIcon = ({ type }: { type: string }) => {
  if (type === "mobile") return <Smartphone className="h-5 w-5" />;
  if (type === "tablet") return <Tablet className="h-5 w-5" />;
  return <Monitor className="h-5 w-5" />;
};

const SettingRow = ({ icon: Icon, title, description, checked, onToggle, color = "purple", loading = false }: {
  icon: any; title: string; description: string; checked: boolean; onToggle: (v: boolean) => void; color?: string; loading?: boolean;
}) => (
  <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        checked ? `bg-purple-500/15 text-purple-400` : "bg-white/[0.04] text-white/30"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-white/90 text-[13px] font-medium">{title}</p>
        <p className="text-white/45 text-[11px] leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
      {loading && <RefreshCw className="h-3 w-3 text-white/30 animate-spin" />}
      <Switch checked={checked} onCheckedChange={onToggle}
        className="data-[state=checked]:bg-emerald-500/60" />
    </div>
  </div>
);

const ThemedSaveButton = ({ onClick, disabled, label = "Save Changes" }: { onClick: (e?: any) => void; disabled: boolean; label?: string }) => (
  <Button onClick={onClick} disabled={disabled}
    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl font-medium text-[13px] px-6 h-9 transition-all duration-200">
    <Save className="mr-2 h-3.5 w-3.5" /> {disabled ? "Saving..." : label}
  </Button>
);

const UserProfile = () => {
  const { user, profile, logout, refreshProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("plan-credits");

  // Account info state
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Avatar / Banner
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwNotification, setPwNotification] = useState<CardNotification>(null);

  // Email change state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailStep, setEmailStep] = useState<"verify-current" | "enter-new" | "verify-new" | "done">("verify-current");
  const [emailVerifyPassword, setEmailVerifyPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailNotification, setEmailNotification] = useState<CardNotification>(null);
  const [emailChangeCount, setEmailChangeCount] = useState(0);
  const [originalEmail, setOriginalEmail] = useState("");

  // Google unlink state
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [unlinkStep, setUnlinkStep] = useState<"confirm" | "set-password" | "done">("confirm");
  const [unlinkPassword, setUnlinkPassword] = useState("");
  const [unlinkConfirmPw, setUnlinkConfirmPw] = useState("");
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Activity
  const [loginActivity, setLoginActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Devices
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);
  const [addDeviceName, setAddDeviceName] = useState("");
  const [addDeviceType, setAddDeviceType] = useState("desktop");

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Settings
  const [userSettings, setUserSettings] = useState({
    session_timeout_minutes: 1440,
    two_factor_enabled: false,
    login_alerts_enabled: true,
    timezone: "UTC",
    language: "en",
    activity_logging_enabled: false,
    ai_bio_generator_enabled: false,
    ai_login_anomaly_enabled: false,
    ai_security_digest_enabled: false,
    smart_session_cleanup: false,
    auto_theme_detection: false,
    compact_ui_mode: false,
    ai_email_summary_enabled: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // AI features state
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatedBio, setGeneratedBio] = useState("");
  const [analyzingLogins, setAnalyzingLogins] = useState(false);
  const [loginAnalysis, setLoginAnalysis] = useState("");
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [securityDigest, setSecurityDigest] = useState("");

  // Social explore state
  const [exploreSearch, setExploreSearch] = useState("");
  const [exploreSearchResults, setExploreSearchResults] = useState<any[]>([]);
  const [exploreSuggested, setExploreSuggested] = useState<any[]>([]);
  const [exploreSearching, setExploreSearching] = useState(false);

  const googleIdentity = user?.identities?.find(i => i.provider === "google");
  const hasPassword = user?.identities?.some(i => i.provider === "email") ?? false;
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  // Social hooks
  const { posts: feedPosts, loading: feedLoading, refetch: refetchFeed } = useFeed('home');
  const { posts: explorePosts, loading: exploreLoading, refetch: refetchExplore } = useFeed('explore');
  const { notifications: socialNotifications, unreadCount: socialUnreadCount, markAllRead } = useNotifications();
  const { rank, loading: rankLoading, claimDailyLogin } = useUserRank(user?.id);

  // Load profile data
  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setBannerUrl(profile.banner_url || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setCompany(profile.company || "");
      setEmailChangeCount(profile.email_change_count || 0);
      setOriginalEmail(profile.original_email || "");
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserSettings({
            session_timeout_minutes: (data as any).session_timeout_minutes ?? 1440,
            two_factor_enabled: (data as any).two_factor_enabled ?? false,
            login_alerts_enabled: (data as any).login_alerts_enabled ?? true,
            timezone: (data as any).timezone ?? "UTC",
            language: (data as any).language ?? "en",
            activity_logging_enabled: (data as any).activity_logging_enabled ?? false,
            ai_bio_generator_enabled: (data as any).ai_bio_generator_enabled ?? false,
            ai_login_anomaly_enabled: (data as any).ai_login_anomaly_enabled ?? false,
            ai_security_digest_enabled: (data as any).ai_security_digest_enabled ?? false,
            smart_session_cleanup: (data as any).smart_session_cleanup ?? false,
            auto_theme_detection: (data as any).auto_theme_detection ?? false,
            compact_ui_mode: (data as any).compact_ui_mode ?? false,
            ai_email_summary_enabled: (data as any).ai_email_summary_enabled ?? false,
          });
        } else {
          supabase.from("user_settings").insert({ user_id: user.id } as any).then(() => {});
        }
        setSettingsLoaded(true);
      });
  }, [user]);

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

  // Load explore suggested users
  useEffect(() => {
    if (activeTab !== "social-explore") return;
    supabase.from("profiles").select("user_id, username, display_name, avatar_url, follower_count")
      .order("follower_count", { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setExploreSuggested(data as any); });
  }, [activeTab]);

  // Search users for explore
  useEffect(() => {
    if (!exploreSearch.trim()) { setExploreSearchResults([]); return; }
    setExploreSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id, username, display_name, avatar_url, follower_count")
        .or(`username.ilike.%${exploreSearch}%,display_name.ilike.%${exploreSearch}%`)
        .limit(10);
      setExploreSearchResults((data || []) as any);
      setExploreSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [exploreSearch]);

  useEffect(() => {
    if (!user || activeTab !== "activity") return;
    setLoadingActivity(true);
    supabase.from("login_activity").select("*").eq("user_id", user.id)
      .order("login_at", { ascending: false }).limit(50)
      .then(({ data }) => { setLoginActivity(data || []); setLoadingActivity(false); });
  }, [user, activeTab]);

  const loadDevices = useCallback(async () => {
    if (!user) return;
    setLoadingDevices(true);
    const { data } = await supabase.from("device_sessions").select("*").eq("user_id", user.id)
      .order("last_active_at", { ascending: false });
    setDevices(data || []);
    setLoadingDevices(false);
  }, [user]);

  const registerCurrentDevice = useCallback(async () => {
    if (!user) return;
    const ua = navigator.userAgent;
    const { browser, os } = parseUA(ua);
    const device_type = /Mobile|Android|iPhone/i.test(ua) ? "mobile" : /iPad|Tablet/i.test(ua) ? "tablet" : "desktop";
    const deviceName = `${browser} on ${os}`;
    const { data: existing } = await supabase.from("device_sessions")
      .select("id").eq("user_id", user.id).eq("device_name", deviceName).eq("is_current", true).limit(1);
    if (existing && existing.length > 0) {
      await supabase.from("device_sessions").update({ last_active_at: new Date().toISOString(), status: "online" } as any).eq("id", existing[0].id);
    } else {
      await supabase.from("device_sessions").update({ is_current: false } as any).eq("user_id", user.id).eq("is_current", true);
      await supabase.from("device_sessions").insert({ user_id: user.id, device_name: deviceName, device_type, browser, os, is_current: true, status: "online" } as any);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "devices") { registerCurrentDevice().then(loadDevices); }
  }, [activeTab, registerCurrentDevice, loadDevices]);

  useEffect(() => {
    if (!user || activeTab !== "devices") return;
    const channel = supabase.channel("device-sessions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "device_sessions", filter: `user_id=eq.${user.id}` }, () => { loadDevices(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeTab, loadDevices]);

  useEffect(() => {
    if (!user || activeTab !== "devices") return;
    const interval = setInterval(async () => {
      await supabase.from("device_sessions").update({ last_active_at: new Date().toISOString(), status: "online" } as any).eq("user_id", user.id).eq("is_current", true);
    }, 30000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  // ─── Upload helpers ────────────────────────────────────
  const handleUploadImage = async (file: File, type: 'avatar' | 'banner') => {
    if (!user) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) { toast.error("File too large. Max 10MB."); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { toast.error("Only JPG, PNG, GIF and WebP are supported."); return; }

    const setter = type === 'avatar' ? setUploadingAvatar : setUploadingBanner;
    setter(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('social-media').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const updateField = type === 'avatar' ? { avatar_url: publicUrl } : { banner_url: publicUrl };
      const { error } = await supabase.from("profiles").update(updateField).eq("user_id", user.id);
      if (error) throw error;

      if (type === 'avatar') setAvatarUrl(publicUrl);
      else setBannerUrl(publicUrl);
      await refreshProfile();
      toast.success(`${type === 'avatar' ? 'Profile picture' : 'Banner'} updated!`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${type}`);
    } finally { setter(false); }
  };

  // ─── Save handlers ────────────────────────────────────
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (username.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    try {
      setIsSaving(true);
      const { error } = await supabase.from("profiles")
        .update({
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
          display_name: displayName,
          bio,
          phone,
          address,
          company,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile saved successfully!");
    } catch (error: any) {
      if (error.message?.includes("unique") || error.code === "23505") toast.error("Username already taken");
      else toast.error(error.message || "Failed to update");
    } finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    setPwNotification(null);
    if (!user?.email) return;
    if (hasPassword && !currentPassword) { setPwNotification({ type: "error", message: "Please enter your current password." }); return; }
    if (newPassword.length < 8) { setPwNotification({ type: "error", message: "New password must be at least 8 characters." }); return; }
    if (newPassword !== confirmPassword) { setPwNotification({ type: "error", message: "Passwords do not match." }); return; }
    try {
      setIsChangingPw(true);
      if (hasPassword) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (authError) { setPwNotification({ type: "error", message: "Current password is incorrect." }); return; }
      }
      await updatePassword(newPassword);
      setPwNotification({ type: "success", message: "Password updated successfully!" });
      setTimeout(() => { setShowPasswordDialog(false); setNewPassword(""); setConfirmPassword(""); setCurrentPassword(""); setPwNotification(null); }, 1500);
    } catch (error: any) {
      setPwNotification({ type: "error", message: error.message || "Failed to change password." });
    } finally { setIsChangingPw(false); }
  };

  const handleEmailChange = async () => {
    setEmailNotification(null);
    if (!user?.email) return;
    if (emailStep === "verify-current") {
      if (!emailVerifyPassword) { setEmailNotification({ type: "error", message: "Please enter your current password to verify your identity." }); return; }
      try {
        setIsChangingEmail(true);
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: emailVerifyPassword });
        if (error) { setEmailNotification({ type: "error", message: "Password is incorrect." }); return; }
        setEmailStep("enter-new");
        setEmailNotification({ type: "success", message: "Identity verified! Now enter your new email address." });
      } catch (err: any) { setEmailNotification({ type: "error", message: err.message || "Verification failed." }); }
      finally { setIsChangingEmail(false); }
      return;
    }
    if (emailStep === "enter-new") {
      if (!newEmail || !newEmail.includes("@")) { setEmailNotification({ type: "error", message: "Please enter a valid email address." }); return; }
      if (newEmail.toLowerCase() === user.email?.toLowerCase()) { setEmailNotification({ type: "error", message: "New email must be different from your current email." }); return; }
      try {
        setIsChangingEmail(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        await supabase.from("profiles").update({ email_change_count: emailChangeCount + 1, email: newEmail } as any).eq("user_id", user.id);
        setEmailStep("done");
        setEmailNotification({ type: "success", message: "A confirmation link has been sent to both your current and new email. Please confirm both to complete the change." });
      } catch (err: any) { setEmailNotification({ type: "error", message: err.message || "Failed to initiate email change." }); }
      finally { setIsChangingEmail(false); }
    }
  };

  const handleLinkGoogle = async () => {
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/profile" });
      if (error) throw error;
    } catch (err: any) { toast.error(err.message || "Failed to link Google account"); }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return;
    if (unlinkStep === "confirm") {
      if (!hasPassword) { setUnlinkStep("set-password"); return; }
      await performUnlink();
      return;
    }
    if (unlinkStep === "set-password") {
      if (unlinkPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
      if (unlinkPassword !== unlinkConfirmPw) { toast.error("Passwords do not match"); return; }
      try {
        setIsUnlinking(true);
        await updatePassword(unlinkPassword);
        await performUnlink();
      } catch (error: any) { toast.error(error.message || "Failed to set password"); }
      finally { setIsUnlinking(false); }
    }
  };

  const performUnlink = async () => {
    try {
      if (!googleIdentity) return;
      setIsUnlinking(true);
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;
      toast.success("Google account unlinked successfully!");
      setShowUnlinkDialog(false); setUnlinkStep("confirm"); setUnlinkPassword(""); setUnlinkConfirmPw("");
    } catch (error: any) { toast.error(error.message || "Failed to unlink Google"); }
    finally { setIsUnlinking(false); }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSavingNotifs(true);
    try {
      for (const cat of NOTIFICATION_CATEGORIES) {
        await supabase.from("notification_preferences").upsert({
          user_id: user.id, category: cat.id, email_enabled: notifPrefs[cat.id] ?? false,
        } as any, { onConflict: "user_id,category" });
      }
      toast.success("Notification preferences saved!");
    } catch { toast.error("Failed to save preferences"); }
    finally { setSavingNotifs(false); }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id, ...userSettings,
      } as any, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Settings saved!");
    } catch (err: any) {
      console.error("Settings save error:", err);
      toast.error("Failed to save settings");
    } finally { setSavingSettings(false); }
  };

  const handleKickDevice = async (deviceId: string) => {
    try {
      await supabase.from("device_sessions").update({ status: "kicked" } as any).eq("id", deviceId);
      await supabase.from("device_sessions").delete().eq("id", deviceId);
      toast.success("Device removed and logged out");
      loadDevices();
    } catch { toast.error("Failed to kick device"); }
  };

  const handleAddDevice = async () => {
    if (!user || !addDeviceName.trim()) { toast.error("Please enter a device name"); return; }
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await supabase.from("device_sessions").insert({
        user_id: user.id, device_name: addDeviceName.trim(), device_type: addDeviceType,
        is_manually_added: true, status: "pending", expires_at: expiresAt.toISOString(),
        browser: "Remote", os: "Remote Access",
      } as any);
      toast.success(`Device "${addDeviceName}" added. Auto-login valid for 24 hours.`);
      setShowAddDeviceDialog(false); setAddDeviceName(""); loadDevices();
    } catch { toast.error("Failed to add device"); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    toast.error("Please contact liam@ozcagency.com to request account deletion.");
    setShowDeleteDialog(false); setDeleteConfirmText("");
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const [profileRes, activityRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("login_activity").select("*").eq("user_id", user.id).order("login_at", { ascending: false }).limit(100),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      ]);
      const exportData = { exported_at: new Date().toISOString(), profile: profileRes.data, login_activity: activityRes.data, settings: settingsRes.data };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `account-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch { toast.error("Failed to export data"); }
  };

  const handleClearActivity = async () => {
    if (!user) return;
    try {
      await supabase.from("login_activity").delete().eq("user_id", user.id);
      setLoginActivity([]);
      toast.success("Activity log cleared");
    } catch { toast.error("Failed to clear activity"); }
  };

  const handleToggleActivityLogging = async (enabled: boolean) => {
    if (!user) return;
    const updated = { ...userSettings, activity_logging_enabled: enabled };
    setUserSettings(updated);
    try {
      await supabase.from("user_settings").upsert({ user_id: user.id, ...updated } as any, { onConflict: "user_id" });
      toast.success(enabled ? "Activity logging enabled" : "Activity logging disabled");
    } catch { toast.error("Failed to update setting"); }
  };

  // AI Bio Generator
  const handleGenerateBio = async () => {
    if (!user || !userSettings.ai_bio_generator_enabled) return;
    setGeneratingBio(true);
    setGeneratedBio("");
    try {
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [
            { role: "system", content: "You are a professional bio writer. Write a short, punchy professional bio (2-3 sentences max) for a user profile. Be creative but professional." },
            { role: "user", content: `Write a professional bio for: Name: ${displayName || "User"}, Username: @${username || "user"}, Company: ${company || "N/A"}, Current bio: ${bio || "None"}. Make it sound natural and engaging.` }
          ]
        }
      });
      if (error) throw error;
      const content = data?.choices?.[0]?.message?.content || data?.message || "";
      setGeneratedBio(content);
    } catch (err: any) {
      toast.error("Failed to generate bio. Try again.");
    } finally { setGeneratingBio(false); }
  };

  // AI Login Anomaly Analysis
  const handleAnalyzeLogins = async () => {
    if (!user || !userSettings.ai_login_anomaly_enabled) return;
    setAnalyzingLogins(true);
    setLoginAnalysis("");
    try {
      const { data: activity } = await supabase.from("login_activity").select("*").eq("user_id", user.id).order("login_at", { ascending: false }).limit(20);
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [
            { role: "system", content: "You are a security analyst. Analyze login patterns for anomalies. Be concise (3-5 bullet points). Flag unusual IPs, devices, times, or patterns. If everything looks normal, say so." },
            { role: "user", content: `Analyze these login records for security anomalies:\n${JSON.stringify(activity || [], null, 2)}` }
          ]
        }
      });
      if (error) throw error;
      setLoginAnalysis(data?.choices?.[0]?.message?.content || data?.message || "No analysis available.");
    } catch { toast.error("Failed to analyze logins."); }
    finally { setAnalyzingLogins(false); }
  };

  // AI Security Digest
  const handleSecurityDigest = async () => {
    if (!user || !userSettings.ai_security_digest_enabled) return;
    setGeneratingDigest(true);
    setSecurityDigest("");
    try {
      const [activityRes, devicesRes, settingsRes] = await Promise.all([
        supabase.from("login_activity").select("*").eq("user_id", user.id).order("login_at", { ascending: false }).limit(20),
        supabase.from("device_sessions").select("*").eq("user_id", user.id),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      ]);
      const { data, error } = await supabase.functions.invoke("agency-copilot", {
        body: {
          messages: [
            { role: "system", content: "You are a security advisor. Generate a concise security digest report for the user. Include: account health score (out of 100), active recommendations, risk assessment. Keep it under 200 words. Use bullet points." },
            { role: "user", content: `Generate security digest:\nRecent logins: ${JSON.stringify(activityRes.data?.slice(0, 10))}\nDevices: ${JSON.stringify(devicesRes.data)}\nSettings: ${JSON.stringify(settingsRes.data)}\n2FA: ${(settingsRes.data as any)?.two_factor_enabled ? "enabled" : "disabled"}\nLogin alerts: ${(settingsRes.data as any)?.login_alerts_enabled ? "enabled" : "disabled"}` }
          ]
        }
      });
      if (error) throw error;
      setSecurityDigest(data?.choices?.[0]?.message?.content || data?.message || "Unable to generate digest.");
    } catch { toast.error("Failed to generate security digest."); }
    finally { setGeneratingDigest(false); }
  };

  // Smart Session Cleanup
  const handleSessionCleanup = async () => {
    if (!user) return;
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data: staleDevices } = await supabase.from("device_sessions")
        .select("id").eq("user_id", user.id).eq("is_current", false)
        .lt("last_active_at", cutoff.toISOString());
      if (staleDevices && staleDevices.length > 0) {
        for (const d of staleDevices) {
          await supabase.from("device_sessions").delete().eq("id", d.id);
        }
        toast.success(`Cleaned up ${staleDevices.length} stale device session(s)`);
        loadDevices();
      } else {
        toast.info("No stale sessions to clean up");
      }
    } catch { toast.error("Cleanup failed"); }
  };

  const handleLogout = async () => {
    if (user) {
      await supabase.from("device_sessions").update({ status: "offline", is_current: false } as any)
        .eq("user_id", user.id).eq("is_current", true);
    }
    await logout(); navigate("/"); toast.success("Logged out");
  };

  if (!user) return null;

  const settingsTabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "account", label: "Account Info", icon: User },
    { id: "plan-credits", label: "Plan & Credits", icon: Coins },
    { id: "billing", label: "Billing & Payments", icon: CreditCard },
    { id: "security", label: "Security", icon: Shield },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "devices", label: "Devices", icon: Monitor },
    { id: "ai-automation", label: "AI & Automation", icon: Sparkles },
    { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  const socialTabs: { id: TabId; label: string; icon: typeof User; badge?: number }[] = [
    { id: "social-feed", label: "Feed", icon: Rss },
    { id: "social-explore", label: "Explore", icon: Compass },
    { id: "social-notifications", label: "Social Alerts", icon: Bell, badge: socialUnreadCount },
    { id: "rank", label: "Rank", icon: Trophy },
  ];

  const userInitial = profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  const canChangeEmail = emailChangeCount < 1;

  const getDeviceStatus = (device: any) => {
    if (device.is_current) return "online";
    if (device.status === "kicked") return "kicked";
    if (device.status === "pending") return "pending";
    const lastActive = new Date(device.last_active_at).getTime();
    if (Date.now() - lastActive < 60000) return "online";
    return "offline";
  };

  // Hidden file inputs
  const hiddenInputs = (
    <>
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0], 'avatar'); e.target.value = ''; }} />
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0], 'banner'); e.target.value = ''; }} />
    </>
  );

  const currentRankInfo = rank ? getRankInfo(rank.rank_tier) : null;
  const nextRankInfo = rank ? getNextRank(rank.rank_tier) : null;
  const rankProgress = rank ? getRankProgress(rank.xp, rank.rank_tier) : 0;

  return (
    <div className="min-h-screen bg-[hsl(222,35%,5%)] relative overflow-hidden">
      {hiddenInputs}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header with avatar + rank badge */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar className="h-14 w-14 border-2 border-purple-500/20">
                <AvatarImage src={avatarUrl || ''} />
                <AvatarFallback className="bg-purple-500/20 text-purple-300 text-xl font-bold">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? <RefreshCw className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white tracking-tight">{profile?.display_name || "Your Profile"}</h1>
                {rank && <UserRankBadge userId={user.id} size="md" showLabel />}
              </div>
              <p className="text-white/50 text-[13px]">@{profile?.username || "..."} · {user.email}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-56 flex-shrink-0">
              <nav className="bg-[hsl(222,28%,11%)] backdrop-blur-xl rounded-2xl border border-purple-500/10 p-2 space-y-0.5">
                <p className="px-3.5 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Social</p>
                {socialTabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-purple-500/10 text-white border border-purple-500/15"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}>
                    <tab.icon className="h-4 w-4 flex-shrink-0" />
                    {tab.label}
                    {tab.badge && tab.badge > 0 ? (
                      <span className="ml-auto bg-red-500/80 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">{tab.badge}</span>
                    ) : null}
                  </button>
                ))}
                <div className="h-px bg-white/[0.06] my-2" />
                <p className="px-3.5 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Settings</p>
                {settingsTabs.map((tab) => (
                  <button key={tab.id} data-tab={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-purple-500/10 text-white border border-purple-500/15"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}>
                    <tab.icon className="h-4 w-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                ))}
                <div className="h-px bg-white/[0.06] my-2" />
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/[0.06] transition-all">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ===================== PLAN & CREDITS TAB ===================== */}
              {activeTab === "plan-credits" && <PlanCreditsTab />}

              {/* ===================== BILLING & PAYMENTS TAB ===================== */}
              {activeTab === "billing" && <BillingPaymentsTab />}

              {/* ===================== ACCOUNT INFO TAB ===================== */}
              {activeTab === "account" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {/* Banner upload */}
                  <Card className="p-0 overflow-hidden">
                    <div className="relative h-40 bg-gradient-to-r from-purple-500/20 to-blue-500/10 group cursor-pointer"
                      onClick={() => bannerInputRef.current?.click()}>
                      {bannerUrl && <img src={bannerUrl} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {uploadingBanner ? <RefreshCw className="h-5 w-5 text-white animate-spin" /> : <>
                          <ImageIcon className="h-5 w-5 text-white" />
                          <span className="text-white text-sm font-medium">Change Banner</span>
                        </>}
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <div className="relative -mt-12 flex items-end gap-4 mb-4">
                        <div className="relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}>
                          <Avatar className="h-24 w-24 border-4 border-[hsl(222,28%,11%)]">
                            <AvatarImage src={avatarUrl || ''} />
                            <AvatarFallback className="bg-purple-500/20 text-purple-300 text-3xl font-bold">{userInitial}</AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {uploadingAvatar ? <RefreshCw className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                          </div>
                        </div>
                        <div className="pb-1">
                          <p className="text-white/40 text-[11px]">Click avatar or banner to upload (JPG, PNG, GIF, WebP · max 10MB)</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={User} title="Personal Information" subtitle="This information will be used for your account profile." />
                    <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldInput icon={User} label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your Name" />
                        <FieldInput icon={AtSign} label="Username" value={username}
                          onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="username" />
                      </div>
                      <FieldInput icon={Phone} label="Phone Number" value={phone} onChange={setPhone} placeholder="+1 234 567 8900" />
                      <FieldInput icon={MapPin} label="Address" value={address} onChange={setAddress} placeholder="Your address" />
                      <FieldInput icon={Building2} label="Company" value={company} onChange={setCompany} placeholder="Company name (optional)" />
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-white/60">Bio</label>
                        <Textarea value={bio} onChange={(e) => setBio(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/20 rounded-xl text-[13px] focus:bg-white/[0.06] focus:border-white/[0.15] min-h-[80px]"
                          placeholder="Tell us about yourself" />
                      </div>
                      <ThemedSaveButton onClick={handleSave} disabled={isSaving} />
                    </form>
                  </Card>

                  <Card>
                    <SectionTitle icon={Mail} title="Account Settings" />
                    <div className="divide-y divide-white/[0.04]">
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <span className="text-white/60 text-[12px]">Email</span>
                          <p className="text-white/90 text-[13px]">{user.email}</p>
                          {originalEmail && originalEmail !== user.email && (
                            <p className="text-white/35 text-[11px] mt-0.5">Original: {originalEmail}</p>
                          )}
                        </div>
                        {canChangeEmail ? (
                          <Button onClick={() => { setShowEmailDialog(true); setEmailStep("verify-current"); setEmailNotification(null); setEmailVerifyPassword(""); setNewEmail(""); }}
                            variant="ghost" className="text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-xl gap-2 text-[12px] h-8">
                            Change <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-white/25 text-[11px] px-3 py-1.5 bg-white/[0.03] rounded-full border border-white/[0.06]">Limit reached (1/1)</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-white/50 text-[12px]">Member since</span>
                        <span className="text-white/80 text-[13px]">{memberSince}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ===================== SECURITY TAB ===================== */}
              {activeTab === "security" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <Card>
                    <SectionTitle icon={KeyRound} title="Password" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-[13px]">{hasPassword ? "Change your account password" : "Set a password for your account"}</p>
                        <p className="text-white/40 text-[11px] mt-0.5">Use a strong password with at least 8 characters.</p>
                      </div>
                      <Button onClick={() => { setShowPasswordDialog(true); setPwNotification(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                        variant="ghost" className="text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-xl gap-2 text-[12px] h-8">
                        <Lock className="h-3.5 w-3.5" /> {hasPassword ? "Change" : "Set Password"} <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Link2} title="Social Logins" />
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-white text-[13px] font-medium">Google</p>
                          <p className="text-white/45 text-[11px]">{googleIdentity ? `Connected as ${user.email}` : "Not connected"}</p>
                        </div>
                      </div>
                      {googleIdentity ? (
                        <Button onClick={() => { setShowUnlinkDialog(true); setUnlinkStep("confirm"); }}
                          variant="ghost" className="text-red-400/70 hover:text-red-300 hover:bg-red-500/[0.06] rounded-xl gap-2 text-[12px] h-8">
                          <Unlink className="h-3.5 w-3.5" /> Unlink
                        </Button>
                      ) : (
                        <Button onClick={handleLinkGoogle}
                          variant="ghost" className="text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-xl gap-2 text-[12px] h-8">
                          <Link2 className="h-3.5 w-3.5" /> Connect
                        </Button>
                      )}
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Settings2} title="Security Settings" subtitle="Configure 2FA and login alerts." />
                    <div className="space-y-1">
                      <SettingRow icon={ShieldCheck} title="Two-Factor Authentication" description="Add extra security via email verification on login" checked={userSettings.two_factor_enabled} onToggle={(v) => setUserSettings({ ...userSettings, two_factor_enabled: v })} />
                      <SettingRow icon={BellRing} title="Login Alerts" description="Get notified via email when a new device logs in" checked={userSettings.login_alerts_enabled} onToggle={(v) => setUserSettings({ ...userSettings, login_alerts_enabled: v })} />
                      <SettingRow icon={Clock} title="Session Timeout" description={`Auto-logout after ${SESSION_TIMEOUT_OPTIONS.find(o => o.value === userSettings.session_timeout_minutes)?.label || "24 hours"}`} checked={userSettings.session_timeout_minutes !== 1440} onToggle={() => {}} />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Select value={String(userSettings.session_timeout_minutes)}
                        onValueChange={(v) => setUserSettings({ ...userSettings, session_timeout_minutes: Number(v) })}>
                        <SelectTrigger className="w-48 bg-white/[0.04] border-white/[0.08] text-white/60 text-[12px] h-8 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[hsl(222,30%,12%)] border-white/[0.08]">
                          {SESSION_TIMEOUT_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={String(o.value)} className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ThemedSaveButton onClick={handleSaveSettings} disabled={savingSettings} label="Save" />
                    </div>
                  </Card>

                  <Card danger>
                    <SectionTitle icon={AlertTriangle} title="Danger Zone" danger />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-[13px] font-medium">Delete account</p>
                        <p className="text-white/30 text-[11px]">All data will be permanently deleted.</p>
                      </div>
                      <Button onClick={() => setShowDeleteDialog(true)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 rounded-xl text-[12px] h-8">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Account
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ===================== ACTIVITY TAB ===================== */}
              {activeTab === "activity" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <Card>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle icon={Activity} title="Activity Logging" subtitle="Control whether your login activity is tracked." />
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-medium ${userSettings.activity_logging_enabled ? "text-emerald-400" : "text-white/30"}`}>
                          {userSettings.activity_logging_enabled ? "Enabled" : "Disabled"}
                        </span>
                        <Switch checked={userSettings.activity_logging_enabled}
                          onCheckedChange={handleToggleActivityLogging}
                          className="data-[state=checked]:bg-emerald-500/60" />
                      </div>
                    </div>
                    {!userSettings.activity_logging_enabled && (
                      <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3 text-[11px] text-amber-200/60 flex items-start gap-2">
                        <ToggleLeft className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400/60" />
                        <p>Activity logging is currently <strong className="text-amber-200/80">disabled</strong>. Enable it above to start tracking sign-in events for security monitoring.</p>
                      </div>
                    )}
                  </Card>

                  <Card>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle icon={Activity} title="Login History"
                        subtitle="Sign-in events deduplicated within 2-minute windows." />
                      {loginActivity.length > 0 && (
                        <Button onClick={handleClearActivity} variant="ghost"
                          className="text-red-400/60 hover:text-red-300 hover:bg-red-500/[0.06] rounded-xl text-[12px] h-8 gap-1.5">
                          <Eraser className="h-3.5 w-3.5" /> Clear All
                        </Button>
                      )}
                    </div>
                    {loadingActivity ? (
                      <div className="text-center py-8 text-white/40 text-[13px]">Loading activity...</div>
                    ) : loginActivity.length === 0 ? (
                      <div className="text-center py-10">
                        <Activity className="h-8 w-8 text-white/15 mx-auto mb-3" />
                        <p className="text-white/40 text-[13px]">No login activity recorded yet.</p>
                        {!userSettings.activity_logging_enabled && <p className="text-white/25 text-[11px] mt-1">Enable activity logging to start tracking.</p>}
                      </div>
                    ) : (() => {
                      const deduped: any[] = [];
                      const sorted = [...loginActivity].sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());
                      sorted.forEach((entry) => {
                        const last = deduped[deduped.length - 1];
                        if (last) {
                          const timeDiff = Math.abs(new Date(last.login_at).getTime() - new Date(entry.login_at).getTime());
                          if (timeDiff < 120000 && last.device === entry.device && last.login_type === entry.login_type) return;
                        }
                        deduped.push(entry);
                      });
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="text-white/30 border-b border-white/[0.04]">
                                <th className="text-left py-2.5 font-medium px-2">Date</th>
                                <th className="text-left py-2.5 font-medium px-2">IP</th>
                                <th className="text-left py-2.5 font-medium px-2">Device</th>
                                <th className="text-left py-2.5 font-medium px-2">Method</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deduped.slice(0, 20).map((a: any) => {
                                const methodColor = a.login_type === "google" ? "bg-blue-500/10 text-blue-300 border-blue-500/15" : "bg-purple-500/10 text-purple-300 border-purple-500/15";
                                return (
                                  <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                    <td className="py-3 px-2 text-white/60">{new Date(a.login_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                                    <td className="py-3 px-2 text-white/40 font-mono">{a.ip_address || "—"}</td>
                                    <td className="py-3 px-2">
                                      <span className="flex items-center gap-1.5 text-white/50">
                                        {a.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                        {a.device || "unknown"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-2">
                                      <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${methodColor}`}>
                                        {a.login_type || "email"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </Card>
                </motion.div>
              )}

              {/* ===================== DEVICES TAB ===================== */}
              {activeTab === "devices" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <Card>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle icon={Monitor} title="Connected Devices"
                        subtitle="Manage all devices that have access to your account." />
                      <div className="flex gap-2">
                        {userSettings.smart_session_cleanup && (
                          <Button onClick={handleSessionCleanup} variant="ghost"
                            className="text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-xl text-[12px] h-8 gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" /> Cleanup
                          </Button>
                        )}
                        <Button onClick={() => setShowAddDeviceDialog(true)}
                          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl text-[12px] h-8 gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Add Device
                        </Button>
                      </div>
                    </div>

                    {loadingDevices ? (
                      <div className="text-center py-8 text-white/30 text-[13px]">Loading devices...</div>
                    ) : devices.length === 0 ? (
                      <div className="text-center py-10">
                        <Monitor className="h-8 w-8 text-white/10 mx-auto mb-3" />
                        <p className="text-white/30 text-[13px]">No device sessions recorded.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {devices.map((device) => {
                          const status = getDeviceStatus(device);
                          const isOnline = status === "online";
                          const isPending = status === "pending";
                          return (
                            <div key={device.id}
                              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                device.is_current
                                  ? "bg-emerald-500/[0.04] border-emerald-500/[0.12]"
                                  : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]"
                              }`}>
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isOnline ? "bg-emerald-500/10 text-emerald-400" :
                                  isPending ? "bg-amber-500/10 text-amber-400" :
                                  "bg-white/[0.04] text-white/30"
                                }`}>
                                  <DeviceIcon type={device.device_type} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-white text-[13px] font-medium">{device.device_name}</p>
                                    {device.is_current && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">This device</span>}
                                    {device.is_manually_added && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/70 border border-amber-500/15">Remote</span>}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="flex items-center gap-1 text-[11px]">
                                      {isOnline ? <Wifi className="h-3 w-3 text-emerald-400" /> : isPending ? <Clock className="h-3 w-3 text-amber-400" /> : <WifiOff className="h-3 w-3 text-white/20" />}
                                      <span className={isOnline ? "text-emerald-400/80" : isPending ? "text-amber-400/70" : "text-white/25"}>
                                        {isOnline ? "Online" : isPending ? "Pending" : "Offline"}
                                      </span>
                                    </span>
                                    <span className="text-white/40 text-[11px]">{device.browser && device.os ? `${device.browser} · ${device.os}` : ""}</span>
                                    <span className="text-white/30 text-[11px]">
                                      Last: {new Date(device.last_active_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {!device.is_current && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleKickDevice(device.id)} title="Remove device"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition-all">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => handleKickDevice(device.id)} title="Force logout"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10 transition-all">
                                    <Power className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* ===================== AI & AUTOMATION TAB ===================== */}
              {activeTab === "ai-automation" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <Card>
                    <SectionTitle icon={Sparkles} title="AI & Automation Features"
                      subtitle="Enable AI-powered features to enhance your account experience." />
                    <div className="space-y-0">
                      <SettingRow icon={FileText} title="AI Bio Generator" description="Generate a professional bio using AI based on your profile data" checked={userSettings.ai_bio_generator_enabled} onToggle={(v) => setUserSettings({ ...userSettings, ai_bio_generator_enabled: v })} />
                      <SettingRow icon={Brain} title="AI Login Anomaly Detection" description="Analyze your login patterns for suspicious activity using AI" checked={userSettings.ai_login_anomaly_enabled} onToggle={(v) => setUserSettings({ ...userSettings, ai_login_anomaly_enabled: v })} />
                      <SettingRow icon={Shield} title="AI Security Digest" description="Generate an AI-powered security health report for your account" checked={userSettings.ai_security_digest_enabled} onToggle={(v) => setUserSettings({ ...userSettings, ai_security_digest_enabled: v })} />
                      <SettingRow icon={Zap} title="Smart Session Cleanup" description="Auto-detect and remove stale device sessions older than 7 days" checked={userSettings.smart_session_cleanup} onToggle={(v) => setUserSettings({ ...userSettings, smart_session_cleanup: v })} />
                      <SettingRow icon={Mail} title="AI Email Summary" description="Get AI-generated weekly email summaries of your account activity" checked={userSettings.ai_email_summary_enabled} onToggle={(v) => setUserSettings({ ...userSettings, ai_email_summary_enabled: v })} />
                    </div>
                    <div className="mt-4">
                      <ThemedSaveButton onClick={handleSaveSettings} disabled={savingSettings} label="Save AI Settings" />
                    </div>
                  </Card>

                  {userSettings.ai_bio_generator_enabled && (
                    <Card>
                      <SectionTitle icon={FileText} title="Generate Bio" subtitle="AI will create a professional bio from your profile info." />
                      <Button onClick={handleGenerateBio} disabled={generatingBio}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/15 rounded-xl text-[12px] h-9 gap-2">
                        {generatingBio ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {generatingBio ? "Generating..." : "Generate Bio"}
                      </Button>
                      {generatedBio && (
                        <div className="mt-4 p-4 rounded-xl bg-purple-500/[0.05] border border-purple-500/10">
                          <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">{generatedBio}</p>
                          <Button onClick={() => { setBio(generatedBio); toast.success("Bio applied! Don't forget to save your profile."); }}
                            variant="ghost" className="mt-3 text-purple-300/70 hover:text-purple-200 text-[12px] h-7 gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Use This Bio
                          </Button>
                        </div>
                      )}
                    </Card>
                  )}

                  {userSettings.ai_login_anomaly_enabled && (
                    <Card>
                      <SectionTitle icon={Brain} title="Login Anomaly Analysis" subtitle="AI scans your recent logins for suspicious patterns." />
                      <Button onClick={handleAnalyzeLogins} disabled={analyzingLogins}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/15 rounded-xl text-[12px] h-9 gap-2">
                        {analyzingLogins ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                        {analyzingLogins ? "Analyzing..." : "Run Analysis"}
                      </Button>
                      {loginAnalysis && (
                        <div className="mt-4 p-4 rounded-xl bg-blue-500/[0.05] border border-blue-500/10">
                          <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">{loginAnalysis}</p>
                        </div>
                      )}
                    </Card>
                  )}

                  {userSettings.ai_security_digest_enabled && (
                    <Card>
                      <SectionTitle icon={Shield} title="Security Digest" subtitle="AI-generated overview of your account's security posture." />
                      <Button onClick={handleSecurityDigest} disabled={generatingDigest}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/15 rounded-xl text-[12px] h-9 gap-2">
                        {generatingDigest ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                        {generatingDigest ? "Generating..." : "Generate Digest"}
                      </Button>
                      {securityDigest && (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10">
                          <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">{securityDigest}</p>
                        </div>
                      )}
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ===================== PREFERENCES TAB ===================== */}
              {activeTab === "preferences" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <Card>
                    <SectionTitle icon={Globe} title="Regional Settings" subtitle="Configure your timezone and language preferences." />
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-purple-400/60" />
                          <div>
                            <p className="text-white/90 text-[13px] font-medium">Timezone</p>
                            <p className="text-white/45 text-[11px]">Used for activity logs and timestamps</p>
                          </div>
                        </div>
                        <Select value={userSettings.timezone} onValueChange={(v) => setUserSettings({ ...userSettings, timezone: v })}>
                          <SelectTrigger className="w-52 bg-white/[0.04] border-white/[0.08] text-white/60 text-[12px] h-8 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[hsl(222,30%,12%)] border-white/[0.08] max-h-48">
                            {TIMEZONES.map(tz => (<SelectItem key={tz} value={tz} className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">{tz.replace(/_/g, " ")}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Languages className="h-4 w-4 text-purple-400/60" />
                          <div>
                            <p className="text-white/90 text-[13px] font-medium">Language</p>
                            <p className="text-white/45 text-[11px]">Interface display language</p>
                          </div>
                        </div>
                        <Select value={userSettings.language} onValueChange={(v) => setUserSettings({ ...userSettings, language: v })}>
                          <SelectTrigger className="w-40 bg-white/[0.04] border-white/[0.08] text-white/60 text-[12px] h-8 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[hsl(222,30%,12%)] border-white/[0.08]">
                            {LANGUAGES.map(l => (<SelectItem key={l.code} value={l.code} className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">{l.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Palette} title="Display Preferences" subtitle="Customize the look and feel of your interface." />
                    <div className="space-y-0">
                      <SettingRow icon={Palette} title="Auto Theme Detection" description="Automatically match your OS theme (light/dark)" checked={userSettings.auto_theme_detection} onToggle={(v) => setUserSettings({ ...userSettings, auto_theme_detection: v })} />
                      <SettingRow icon={LayoutGrid} title="Compact UI Mode" description="Reduce spacing and padding for a denser layout" checked={userSettings.compact_ui_mode} onToggle={(v) => setUserSettings({ ...userSettings, compact_ui_mode: v })} />
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Download} title="Data Management" subtitle="Export or manage your personal data." />
                    <Button onClick={handleExportData}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl font-medium text-[13px] px-5 h-9 gap-2">
                      <Download className="h-3.5 w-3.5" /> Export My Data
                    </Button>
                  </Card>

                  <ThemedSaveButton onClick={handleSaveSettings} disabled={savingSettings} label="Save Preferences" />
                </motion.div>
              )}

              {/* ===================== NOTIFICATIONS TAB ===================== */}
              {activeTab === "notifications" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <Card>
                    <SectionTitle icon={Bell} title="Email Notifications" subtitle="Choose which email notifications you'd like to receive." />
                    <div className="space-y-0">
                      {NOTIFICATION_CATEGORIES.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
                          <div className="min-w-0 mr-4">
                            <p className="text-white/90 text-[13px] font-medium">{cat.label}</p>
                            <p className="text-white/45 text-[11px] leading-relaxed">{cat.desc}</p>
                          </div>
                          <Switch checked={notifPrefs[cat.id] ?? false}
                            onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, [cat.id]: v })}
                            className="data-[state=checked]:bg-emerald-500/60" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <ThemedSaveButton onClick={handleSaveNotifications} disabled={savingNotifs} label="Save Notifications" />
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ===================== RANK TAB ===================== */}
              {activeTab === "rank" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {rankLoading || !rank ? (
                    <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-purple-400" /></div>
                  ) : (
                    <>
                      {/* Current rank hero */}
                      <Card className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.08] to-transparent pointer-events-none" />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="text-5xl">{currentRankInfo?.icon}</div>
                            <div>
                              <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Current Rank</p>
                              <h2 className="text-2xl font-bold text-white" style={{ color: currentRankInfo?.color }}>{currentRankInfo?.label}</h2>
                              <p className="text-white/50 text-sm mt-1">{rank.xp} XP total · {rank.points_balance} Points</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Flame className="h-5 w-5" />
                              <span className="text-xl font-bold">{rank.daily_login_streak}</span>
                            </div>
                            <p className="text-white/40 text-[11px]">Day Streak</p>
                          </div>
                        </div>

                        {/* Progress to next rank */}
                        {nextRankInfo ? (
                          <div className="mt-6 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-white/60 flex items-center gap-1.5">
                                <span>{currentRankInfo?.icon}</span> {currentRankInfo?.label}
                              </span>
                              <span className="text-white/60 flex items-center gap-1.5">
                                {nextRankInfo.label} <span>{nextRankInfo.icon}</span>
                              </span>
                            </div>
                            <div className="relative">
                              <Progress value={rankProgress} className="h-4 bg-white/[0.06] rounded-full" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white/80">{rankProgress}%</span>
                              </div>
                            </div>
                            <p className="text-center text-white/40 text-[12px]">
                              <span className="font-semibold text-white/60">{nextRankInfo.minXp - rank.xp} XP</span> needed to reach {nextRankInfo.label}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-6 text-center py-3">
                            <span className="text-lg font-bold text-amber-400">🏆 Maximum Rank Achieved!</span>
                          </div>
                        )}

                        {/* Daily claim */}
                        {(() => {
                          const today = new Date().toISOString().split('T')[0];
                          const canClaim = rank.last_daily_login !== today;
                          return canClaim ? (
                            <Button onClick={claimDailyLogin} className="mt-5 w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl h-10 gap-2 font-medium">
                              <Zap className="h-4 w-4" /> Claim Daily Login (+10 XP)
                            </Button>
                          ) : (
                            <div className="mt-5 text-center py-2.5 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
                              <p className="text-emerald-400/80 text-[12px] font-medium flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Daily login claimed!
                              </p>
                            </div>
                          );
                        })()}
                      </Card>

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <Card className="text-center py-5">
                          <Zap className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{rank.xp}</div>
                          <div className="text-white/40 text-[11px]">Total XP</div>
                        </Card>
                        <Card className="text-center py-5">
                          <Coins className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{rank.points_balance}</div>
                          <div className="text-white/40 text-[11px]">Points Balance</div>
                        </Card>
                        <Card className="text-center py-5">
                          <Flame className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                          <div className="text-xl font-bold text-white">{rank.daily_login_streak}</div>
                          <div className="text-white/40 text-[11px]">Login Streak</div>
                        </Card>
                      </div>

                      {/* XP earning guide */}
                      <Card>
                        <SectionTitle icon={Star} title="How to Earn XP" subtitle="Complete actions to level up your rank." />
                        <div className="space-y-2">
                          {[
                            { action: "Daily Login", xp: "+10 XP", icon: Zap },
                            { action: "Buy 100 Credits", xp: "+50 XP", icon: Coins },
                            { action: "Buy 500 Credits", xp: "+300 XP", icon: Coins },
                            { action: "Buy 1,000+ Credits", xp: "+750 XP", icon: Coins },
                            { action: "Use Platform Features", xp: "+15 XP", icon: Star },
                            { action: "Manage an Account", xp: "+20 XP", icon: UserPlus },
                          ].map((item) => (
                            <div key={item.action} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                  <item.icon className="h-4 w-4 text-purple-400" />
                                </div>
                                <span className="text-white/80 text-[13px]">{item.action}</span>
                              </div>
                              <span className="text-purple-300 text-[12px] font-semibold">{item.xp}</span>
                            </div>
                          ))}
                        </div>
                      </Card>

                      {/* All ranks breakdown */}
                      <Card>
                        <SectionTitle icon={Award} title="All Ranks" subtitle="Your journey through all available ranks and their rewards." />
                        <div className="space-y-3">
                          {RANK_TIERS.map((tier, idx) => {
                            const reward = RANK_REWARDS.find(r => r.tier === tier.name);
                            const isActive = tier.name === rank.rank_tier;
                            const isReached = rank.xp >= tier.minXp;
                            const nextTier = RANK_TIERS[idx + 1];

                            return (
                              <div key={tier.name}
                                className={`p-4 rounded-xl border transition-all ${
                                  isActive ? "bg-purple-500/[0.08] border-purple-500/20 ring-1 ring-purple-500/20" :
                                  isReached ? "bg-white/[0.02] border-white/[0.06]" :
                                  "bg-white/[0.01] border-white/[0.03] opacity-60"
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl">{tier.icon}</span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-[14px]" style={{ color: isReached ? tier.color : 'rgba(255,255,255,0.3)' }}>
                                          {tier.label}
                                        </h4>
                                        {isActive && (
                                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/15 uppercase tracking-wider font-bold">
                                            Current
                                          </span>
                                        )}
                                        {isReached && !isActive && (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        )}
                                      </div>
                                      <p className="text-white/40 text-[11px]">
                                        {tier.minXp} XP required{nextTier ? ` · ${nextTier.minXp - tier.minXp} XP range` : ' · Max rank'}
                                      </p>
                                    </div>
                                  </div>
                                  {reward && reward.bonus > 0 && (
                                    <div className="text-right">
                                      <div className="flex items-center gap-1 text-amber-400">
                                        <Coins className="h-3.5 w-3.5" />
                                        <span className="font-bold text-[13px]">+{reward.bonus}</span>
                                      </div>
                                      <p className="text-white/30 text-[10px]">bonus points</p>
                                    </div>
                                  )}
                                </div>
                                {reward && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {reward.perks.map((perk, i) => (
                                      <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                        isReached ? "bg-white/[0.04] border-white/[0.08] text-white/60" : "bg-white/[0.02] border-white/[0.04] text-white/25"
                                      }`}>
                                        {perk}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </>
                  )}
                </motion.div>
              )}

              {/* ===================== SOCIAL FEED TAB ===================== */}
              {activeTab === "social-feed" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {user && (
                    <CreatePostDialog
                      onCreated={refetchFeed}
                      trigger={
                        <button className="w-full bg-[hsl(222,28%,11%)] border border-purple-500/10 rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/[0.06] transition-colors">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Rss className="h-5 w-5 text-purple-400" />
                          </div>
                          <span className="text-white/40 text-sm">What's on your mind?</span>
                        </button>
                      }
                    />
                  )}
                  {feedLoading ? (
                    <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-purple-400" /></div>
                  ) : feedPosts.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <Compass className="h-14 w-14 text-white/15 mx-auto" />
                      <h3 className="text-lg font-semibold text-white/80">Your feed is empty</h3>
                      <p className="text-white/40 text-sm">Follow people to see their posts here, or explore trending content.</p>
                      <Button onClick={() => setActiveTab("social-explore")}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl">
                        Explore
                      </Button>
                    </div>
                  ) : (
                    feedPosts.map(post => <PostCard key={post.id} post={post} onRefetch={refetchFeed} />)
                  )}
                </motion.div>
              )}

              {/* ===================== SOCIAL EXPLORE TAB ===================== */}
              {activeTab === "social-explore" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="relative">
                    <Compass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      value={exploreSearch}
                      onChange={e => setExploreSearch(e.target.value)}
                      placeholder="Search users..."
                      className="pl-10 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/20 rounded-xl"
                    />
                  </div>

                  {exploreSearch && (
                    <Card>
                      {exploreSearching ? (
                        <div className="flex justify-center py-4"><RefreshCw className="h-5 w-5 animate-spin text-purple-400" /></div>
                      ) : exploreSearchResults.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-4">No users found</p>
                      ) : (
                        <div className="space-y-3">
                          {exploreSearchResults.map((u: any) => (
                            <div key={u.user_id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={u.avatar_url || ''} />
                                  <AvatarFallback className="bg-purple-500/20 text-purple-300 text-sm">{u.display_name?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-white/90 text-sm">{u.display_name}</span>
                                    <UserRankBadge userId={u.user_id} size="sm" />
                                  </div>
                                  <span className="text-white/40 text-xs">@{u.username}</span>
                                </div>
                              </div>
                              <FollowButton targetUserId={u.user_id} />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {!exploreSearch && exploreSuggested.length > 0 && (
                    <Card>
                      <SectionTitle icon={User} title="Suggested for you" />
                      <div className="space-y-3">
                        {exploreSuggested.map((u: any) => (
                          <div key={u.user_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={u.avatar_url || ''} />
                                <AvatarFallback className="bg-purple-500/20 text-purple-300 text-xs">{u.display_name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-white/90 text-xs font-semibold">{u.display_name}</span>
                                  <UserRankBadge userId={u.user_id} size="sm" />
                                </div>
                                <span className="text-white/40 text-[10px]">@{u.username}</span>
                              </div>
                            </div>
                            <FollowButton targetUserId={u.user_id} className="h-7 text-xs px-2" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {exploreLoading ? (
                    <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-purple-400" /></div>
                  ) : explorePosts.length === 0 ? (
                    <div className="text-center py-12">
                      <Compass className="h-12 w-12 text-white/15 mx-auto mb-3" />
                      <p className="text-white/40 text-sm">No posts to explore yet</p>
                    </div>
                  ) : (
                    explorePosts.map(post => <PostCard key={post.id} post={post} onRefetch={refetchExplore} />)
                  )}
                </motion.div>
              )}

              {/* ===================== SOCIAL NOTIFICATIONS TAB ===================== */}
              {activeTab === "social-notifications" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={Bell} title="Social Notifications" />
                    {socialUnreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllRead} className="text-white/40 hover:text-white/60 text-[12px] h-8 gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark all read
                      </Button>
                    )}
                  </div>

                  {socialNotifications.length === 0 ? (
                    <div className="text-center py-16">
                      <Bell className="h-12 w-12 text-white/15 mx-auto mb-3" />
                      <p className="text-white/40 text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    socialNotifications.map((notif: any) => {
                      const textMap: Record<string, string> = { like: 'liked your post', comment: 'commented on your post', follow: 'started following you' };
                      const actor = notif.actor_profile;
                      return (
                        <div
                          key={notif.id}
                          className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                            notif.is_read ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-purple-500/[0.05] border-purple-500/15'
                          }`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={actor?.avatar_url || ''} />
                            <AvatarFallback className="bg-purple-500/20 text-purple-300 text-sm">{actor?.display_name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm text-white/80">
                              <span className="font-semibold">{actor?.display_name || 'Someone'}</span>
                              {' '}{textMap[notif.type] || 'interacted with you'}
                            </p>
                            <span className="text-xs text-white/35">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* Change Password */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 text-[15px]">{hasPassword ? "Change Password" : "Set Password"}</DialogTitle>
            <DialogDescription className="text-white/35 text-[12px]">
              {hasPassword ? "Enter your current and new password below." : "Set a password to use email login."}
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence>
            {pwNotification && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className={`flex items-center gap-2 p-3 rounded-xl text-[12px] ${
                  pwNotification.type === "error" ? "bg-red-500/10 border border-red-500/15 text-red-300/80" :
                  "bg-green-500/10 border border-green-500/15 text-green-300/80"
                }`}>
                {pwNotification.type === "error" ? <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                {pwNotification.message}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-3 py-2">
            {hasPassword && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35">Current Password</label>
                <div className="relative">
                  <Input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 pr-10 text-[13px]" placeholder="Enter current password" />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                    {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35">New Password</label>
              <div className="relative">
                <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 pr-10 text-[13px]" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                  {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder="Re-enter password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)} className="text-white/40 hover:text-white/60 text-[12px]">Cancel</Button>
            <Button onClick={handleChangePassword} disabled={isChangingPw}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl text-[12px]">
              {isChangingPw ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 text-[15px]">Change Email Address</DialogTitle>
            <DialogDescription className="text-white/35 text-[12px]">
              {emailStep === "verify-current" && "First, verify your identity by entering your current password."}
              {emailStep === "enter-new" && "Now enter the new email address you'd like to use."}
              {emailStep === "done" && "Confirmation emails have been sent."}
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence>
            {emailNotification && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className={`flex items-center gap-2 p-3 rounded-xl text-[12px] ${
                  emailNotification.type === "error" ? "bg-red-500/10 border border-red-500/15 text-red-300/80" :
                  emailNotification.type === "info" ? "bg-blue-500/10 border border-blue-500/15 text-blue-300/80" :
                  "bg-green-500/10 border border-green-500/15 text-green-300/80"
                }`}>
                {emailNotification.type === "error" ? <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> :
                 emailNotification.type === "info" ? <Info className="h-3.5 w-3.5 flex-shrink-0" /> :
                 <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                {emailNotification.message}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-3 py-2">
            <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3 text-[11px] text-amber-200/60 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400/60" />
              <div>
                <p className="font-medium text-amber-200/80 text-[11px]">Important</p>
                <p>You can only change your email once. Your original email ({originalEmail || user.email}) will remain for account recovery.</p>
              </div>
            </div>
            {emailStep === "verify-current" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35">Current Password</label>
                <Input type="password" value={emailVerifyPassword} onChange={(e) => setEmailVerifyPassword(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder="Enter your password" />
              </div>
            )}
            {emailStep === "enter-new" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35">New Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 h-3.5 w-3.5" />
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="pl-10 bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder="new@email.com" />
                </div>
              </div>
            )}
            {emailStep === "done" && (
              <div className="bg-green-500/[0.06] border border-green-500/15 rounded-xl p-4 text-[12px] text-green-200/60">
                <p>Confirmation links sent to <strong className="text-green-200/80">{user.email}</strong> and <strong className="text-green-200/80">{newEmail}</strong>. Confirm both to complete.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)} className="text-white/40 hover:text-white/60 text-[12px]">
              {emailStep === "done" ? "Close" : "Cancel"}
            </Button>
            {emailStep !== "done" && (
              <Button onClick={handleEmailChange} disabled={isChangingEmail}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl text-[12px]">
                {isChangingEmail ? "Processing..." : emailStep === "verify-current" ? "Verify Identity" : "Change Email"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Google */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 text-[15px]">Unlink Google Account</DialogTitle>
            <DialogDescription className="text-white/35 text-[12px]">
              {unlinkStep === "confirm" && "After unlinking, you'll need email and password to sign in."}
              {unlinkStep === "set-password" && "Set a password first so you can still sign in."}
            </DialogDescription>
          </DialogHeader>
          {unlinkStep === "confirm" && (
            <div className="py-2">
              <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3 text-[12px] text-amber-200/60">
                <p className="font-medium text-amber-200/80 mb-1 text-[12px]">Important</p>
                <p>You will need email and password to sign in after unlinking Google from <strong className="text-amber-200/80">{user?.email}</strong>.</p>
              </div>
            </div>
          )}
          {unlinkStep === "set-password" && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35">New Password</label>
                <Input type="password" value={unlinkPassword} onChange={(e) => setUnlinkPassword(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder="Min 8 characters" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/35">Confirm Password</label>
                <Input type="password" value={unlinkConfirmPw} onChange={(e) => setUnlinkConfirmPw(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder="Re-enter password" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlinkDialog(false)} className="text-white/40 hover:text-white/60 text-[12px]">Cancel</Button>
            <Button onClick={handleUnlinkGoogle} disabled={isUnlinking}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 rounded-xl text-[12px]">
              {isUnlinking ? "Processing..." : unlinkStep === "confirm" ? "Unlink Google" : "Set Password & Unlink"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-300/90 text-[15px]">Delete Account</DialogTitle>
            <DialogDescription className="text-white/35 text-[12px]">This action is permanent and cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-red-500/[0.06] border border-red-500/15 rounded-xl p-3 text-[12px] text-red-200/60 mb-3">
              All account information, profile data, and preferences will be permanently removed.
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35">Type DELETE to confirm</label>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder="DELETE" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="text-white/40 hover:text-white/60 text-[12px]">Cancel</Button>
            <Button onClick={handleDeleteAccount}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 rounded-xl text-[12px]">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Device Dialog */}
      <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
        <DialogContent className="bg-[hsl(222,35%,7%)] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 text-[15px]">Add Remote Device</DialogTitle>
            <DialogDescription className="text-white/35 text-[12px]">
              Add a device that will be auto-logged in for 24 hours, similar to a magic link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35">Device Name</label>
              <Input value={addDeviceName} onChange={(e) => setAddDeviceName(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white/80 rounded-xl h-10 text-[13px]" placeholder='e.g. "Living Room TV"' />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/35">Device Type</label>
              <Select value={addDeviceType} onValueChange={setAddDeviceType}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white/60 text-[12px] h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(222,30%,12%)] border-white/[0.08]">
                  <SelectItem value="desktop" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Desktop / Laptop</SelectItem>
                  <SelectItem value="mobile" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Mobile Phone</SelectItem>
                  <SelectItem value="tablet" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-500/[0.06] border border-blue-500/15 rounded-xl p-3 text-[11px] text-blue-200/60 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-400/60" />
              <p>The device will appear as "Pending" until it connects. Auto-login expires after 24 hours.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDeviceDialog(false)} className="text-white/40 hover:text-white/60 text-[12px]">Cancel</Button>
            <Button onClick={handleAddDevice}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/20 rounded-xl text-[12px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const FieldInput = ({ icon: Icon, label, value, onChange, placeholder, type = "text" }: {
  icon: any; label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-[12px] font-medium text-white/60">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 h-3.5 w-3.5" />
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="pl-10 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/20 rounded-xl h-10 text-[13px] focus:bg-white/[0.06] focus:border-white/[0.15]"
        placeholder={placeholder} />
    </div>
  </div>
);

export default UserProfile;

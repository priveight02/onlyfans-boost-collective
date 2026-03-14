import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { trackAdminLogin } from "@/hooks/useVisitorTracking";
import authHeroFull from "@/assets/auth-side-hero.png";
import AnimatedBackground from "@/components/AnimatedBackground";
import {
  Eye, EyeOff, LogIn, Lock, Mail, User, ArrowLeft,
  Sparkles, KeyRound, Send, UserPlus,
  CheckCircle2, AlertCircle, XCircle, X, Shield
} from "lucide-react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

type CardNotification = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type AuthMode = "login" | "register" | "forgot" | "magic";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().trim().min(1, "Password is required").max(128),
});

const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().trim().min(8, "Password must be at least 8 characters").max(128),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  displayName: z.string().trim().min(1, "Display name is required").max(100),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get("mode") as AuthMode) || "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<CardNotification>(null);
  const { signIn, signUp, signInWithMagicLink, resetPassword, user } = useAuth();
  const { settings: siteSettings } = useSiteSettings();
  const navigate = useNavigate();

  useEffect(() => { setNotification(null); }, [mode]);

  useEffect(() => {
    if (user) navigate("/pricing");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (siteSettings.maintenance_mode || siteSettings.logins_paused) {
      setNotification({ type: "error", message: siteSettings.maintenance_mode ? "The site is currently under maintenance. Logins are temporarily disabled." : "Logins have been temporarily disabled by an administrator." });
      return;
    }
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setNotification({ type: "error", message: result.error.errors[0].message });
      return;
    }
    try {
      setIsSubmitting(true);
      await signIn(email, password, rememberMe);
      trackAdminLogin(email, true);
      setNotification({ type: "success", message: "Welcome back! Redirecting..." });
      navigate("/pricing");
    } catch (error: any) {
      trackAdminLogin(email, false);
      setNotification({ type: "error", message: error.message || "Invalid credentials" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (siteSettings.maintenance_mode || siteSettings.registrations_paused) {
      setNotification({ type: "error", message: siteSettings.maintenance_mode ? "The site is currently under maintenance. Registrations are temporarily disabled." : "Registrations have been temporarily disabled by an administrator." });
      return;
    }
    const result = registerSchema.safeParse({ email, password, username, displayName });
    if (!result.success) {
      setNotification({ type: "error", message: result.error.errors[0].message });
      return;
    }
    try {
      setIsSubmitting(true);
      await signUp(email, password, username, displayName);
      setNotification({ type: "success", message: "Account created! Check your email to verify." });
      setMode("login");
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Registration failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkAccountExists = async (emailToCheck: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('check_email_exists', { email_input: emailToCheck.trim().toLowerCase() });
    if (error) { console.error("Email check error:", error); return true; }
    return !!data;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!email) { setNotification({ type: "error", message: "Please enter your email" }); return; }
    try {
      setIsSubmitting(true);
      const exists = await checkAccountExists(email);
      if (!exists) { setNotification({ type: "error", message: "No account found with this email address." }); return; }
      await resetPassword(email);
      setNotification({ type: "success", message: "Password reset link sent! Check your email." });
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Failed to send reset link" });
    } finally { setIsSubmitting(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!email) { setNotification({ type: "error", message: "Please enter your email" }); return; }
    try {
      setIsSubmitting(true);
      const exists = await checkAccountExists(email);
      if (!exists) { setNotification({ type: "error", message: "No account found with this email address." }); return; }
      await signInWithMagicLink(email);
      setNotification({ type: "success", message: "Magic link sent! Check your email (expires in 24h)." });
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Failed to send magic link" });
    } finally { setIsSubmitting(false); }
  };

  const handleGoogleLogin = async () => {
    if (siteSettings.maintenance_mode || siteSettings.logins_paused) {
      setNotification({ type: "error", message: siteSettings.maintenance_mode ? "The site is currently under maintenance." : "Logins have been temporarily disabled." });
      return;
    }
    if (mode === "register" && (siteSettings.maintenance_mode || siteSettings.registrations_paused)) {
      setNotification({ type: "error", message: "Registrations have been temporarily disabled." });
      return;
    }
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) throw error;
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Google login failed" });
    }
  };

  const titles: Record<AuthMode, { title: string; subtitle: string; icon: typeof LogIn }> = {
    login: { title: "Welcome back", subtitle: "Sign in to continue growing with AI-powered tools", icon: LogIn },
    register: { title: "Get started", subtitle: "Create your account and start scaling", icon: UserPlus },
    forgot: { title: "Reset password", subtitle: "We'll send you a reset link", icon: KeyRound },
    magic: { title: "Magic link", subtitle: "Login with a one-time link (24h)", icon: Sparkles },
  };

  const current = titles[mode];
  const inputClass = "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/10 rounded-2xl h-[52px] px-4 text-sm transition-all duration-300 backdrop-blur-sm shadow-[inset_0_1px_0_hsla(0,0%,100%,0.03)]";

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Full bleed image, straight edge */}
      <div className="hidden lg:block lg:w-[42%] relative overflow-hidden">
        <img
          src={authHeroFull}
          alt="Uplyze AI Platform"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right Side - Form with unified animated background */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatedBackground variant="default">
          <div className="min-h-screen flex flex-col relative">

        {/* Mobile logo */}
        <div className="lg:hidden relative z-10 p-6 pb-0">
          <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze" className="h-8 w-auto" />
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[400px]"
          >
            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="mb-8"
              >
                <h1 className="text-[30px] font-bold text-white tracking-tight leading-tight">
                  {current.title}
                </h1>
                <p className="text-white/40 text-[15px] mt-2 leading-relaxed">{current.subtitle}</p>
              </motion.div>
            </AnimatePresence>

            {/* Notification */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`relative flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
                    notification.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
                      : notification.type === "error"
                      ? "bg-red-500/10 border border-red-500/15 text-red-400"
                      : "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  }`}
                >
                  {notification.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    : notification.type === "error" ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span className="flex-1 leading-snug">{notification.message}</span>
                  <button onClick={() => setNotification(null)} className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google OAuth - Primary CTA */}
            {(mode === "login" || mode === "register") && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="group w-full flex items-center justify-center gap-3 h-[52px] rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-[1.015] active:scale-[0.99]"
                  style={{
                    background: "linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 70%, 50%) 50%, hsl(262, 70%, 48%) 100%)",
                    boxShadow: "0 6px 24px hsla(262, 83%, 58%, 0.3), 0 2px 8px hsla(262, 83%, 58%, 0.15), 0 0 0 1px hsla(262, 83%, 68%, 0.15) inset, 0 1px 0 hsla(0,0%,100%,0.12) inset",
                    color: "white",
                  }}
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm">
                    <GoogleIcon />
                  </div>
                  Continue with Google
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                  <span className="text-white/20 text-[11px] uppercase tracking-[0.2em] font-medium">or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                </div>
              </div>
            )}

            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-white/60">Email address</label>
                  <Input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-white/60">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className={`${inputClass} pr-11`}
                      placeholder="Enter your password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                    <div className={`relative w-9 h-5 rounded-full transition-all duration-300 ${rememberMe ? 'bg-purple-600 shadow-[0_0_12px_hsla(262,83%,58%,0.4)]' : 'bg-white/[0.08]'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${rememberMe ? 'left-[18px] bg-white' : 'left-0.5 bg-white/40'}`} />
                    </div>
                    <label className="text-[13px] text-white/40 cursor-pointer select-none group-hover:text-white/55 transition-colors">Remember me</label>
                  </div>
                  <button type="button" onClick={() => setMode("forgot")} className="text-[13px] text-purple-400/60 hover:text-purple-400 transition-colors font-medium">
                    Forgot?
                  </button>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full h-[52px] rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-[1.015] active:scale-[0.99] hover:bg-white/[0.12]"
                  style={{
                    background: "hsla(0, 0%, 100%, 0.06)",
                    border: "1px solid hsla(0, 0%, 100%, 0.08)",
                    boxShadow: "0 1px 0 hsla(0,0%,100%,0.04) inset",
                    color: "white",
                  }}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}

            {/* Register Form */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-white/60">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">@</span>
                      <Input
                        value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required
                        className={`${inputClass} pl-8`}
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-white/60">Display name</label>
                    <Input
                      value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                      className={inputClass}
                      placeholder="John"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-white/60">Email address</label>
                  <Input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-white/60">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className={`${inputClass} pr-11`}
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full h-[52px] rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-[1.015] active:scale-[0.99] hover:bg-white/[0.12]"
                  style={{
                    background: "hsla(0, 0%, 100%, 0.06)",
                    border: "1px solid hsla(0, 0%, 100%, 0.08)",
                    boxShadow: "0 1px 0 hsla(0,0%,100%,0.04) inset",
                    color: "white",
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Forgot Password */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-white/60">Email address</label>
                  <Input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass}
                    placeholder="your@email.com"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01]"
                  style={{ background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 70%, 48%))", color: "white" }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}

            {/* Magic Link */}
            {mode === "magic" && (
              <form onSubmit={handleMagicLink} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-white/60">Email address</label>
                  <Input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass}
                    placeholder="your@email.com"
                  />
                </div>
                <p className="text-white/25 text-xs">We'll send a one-time login link that expires after 24 hours.</p>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01]"
                  style={{ background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 70%, 48%))", color: "white" }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>
            )}

            {/* Mode Switchers */}
            <div className="mt-8 space-y-3 text-center">
              {mode !== "login" && (
                <button onClick={() => setMode("login")} className="flex items-center justify-center gap-2 w-full text-[13px] text-white/35 hover:text-white/60 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </button>
              )}
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("register")} className="block w-full text-[14px] text-white/35 hover:text-white/55 transition-colors">
                    New to Uplyze? <span className="font-semibold text-purple-400">Get Started</span>
                  </button>
                  <button onClick={() => setMode("magic")} className="block w-full text-[13px] text-white/25 hover:text-white/40 transition-colors">
                    <Sparkles className="inline h-3 w-3 mr-1 opacity-50" /> Login with magic link
                  </button>
                </>
              )}
              {mode === "register" && (
                <button onClick={() => setMode("login")} className="block w-full text-[14px] text-white/35 hover:text-white/55 transition-colors">
                  Already have an account? <span className="font-semibold text-purple-400">Sign In</span>
                </button>
              )}
            </div>

            {/* Security badge */}
            <div className="mt-8 flex items-center justify-center gap-2 text-white/20 text-xs">
              <Shield className="h-3.5 w-3.5" />
              <span>Secure encrypted login</span>
            </div>
          </motion.div>
        </div>
          </div>
        </AnimatedBackground>
      </div>
    </div>
  );
};

export default Auth;

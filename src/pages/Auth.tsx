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
import AnimatedBackground from "@/components/AnimatedBackground";
import Navigation from "@/components/Navigation";
import {
  Eye, EyeOff, LogIn, Lock, Mail, User, ArrowLeft,
  Sparkles, KeyRound, Send, UserPlus, Chrome,
  CheckCircle2, AlertCircle, XCircle, X
} from "lucide-react";

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
    if (error) {
      console.error("Email check error:", error);
      return true;
    }
    return !!data;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!email) { setNotification({ type: "error", message: "Please enter your email" }); return; }
    try {
      setIsSubmitting(true);
      const exists = await checkAccountExists(email);
      if (!exists) {
        setNotification({ type: "error", message: "No account found with this email address." });
        return;
      }
      await resetPassword(email);
      setNotification({ type: "success", message: "Password reset link sent! Check your email." });
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Failed to send reset link" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!email) { setNotification({ type: "error", message: "Please enter your email" }); return; }
    try {
      setIsSubmitting(true);
      const exists = await checkAccountExists(email);
      if (!exists) {
        setNotification({ type: "error", message: "No account found with this email address." });
        return;
      }
      await signInWithMagicLink(email);
      setNotification({ type: "success", message: "Magic link sent! Check your email (expires in 24h)." });
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Failed to send magic link" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (siteSettings.maintenance_mode || siteSettings.logins_paused) {
      setNotification({ type: "error", message: siteSettings.maintenance_mode ? "The site is currently under maintenance. Logins are temporarily disabled." : "Logins have been temporarily disabled by an administrator." });
      return;
    }
    if (mode === "register" && (siteSettings.maintenance_mode || siteSettings.registrations_paused)) {
      setNotification({ type: "error", message: siteSettings.maintenance_mode ? "The site is currently under maintenance. Registrations are temporarily disabled." : "Registrations have been temporarily disabled by an administrator." });
      return;
    }
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      setNotification({ type: "error", message: error.message || "Google login failed" });
    }
  };

  const titles: Record<AuthMode, { title: string; subtitle: string; icon: typeof LogIn }> = {
    login: { title: "Welcome Back", subtitle: "Sign in to your account", icon: LogIn },
    register: { title: "Create Account", subtitle: "Join the community", icon: UserPlus },
    forgot: { title: "Reset Password", subtitle: "We'll send you a reset link", icon: KeyRound },
    magic: { title: "Magic Link", subtitle: "Login with a one-time link (24h)", icon: Sparkles },
  };

  const current = titles[mode];

  const inputClass = "pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/25 focus:border-purple-500/40 focus:bg-white/[0.06] rounded-xl h-11 text-sm transition-all duration-200";

  return (
    <AnimatedBackground variant="default">
      <Navigation />
      <div className="relative min-h-screen flex items-center justify-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Outer glow */}
          <div className="absolute -inset-px rounded-[20px] bg-gradient-to-b from-purple-500/20 via-transparent to-blue-500/10 blur-sm pointer-events-none" />
          
          <div
            className="relative rounded-[20px] overflow-hidden"
            style={{
              background: "linear-gradient(180deg, hsla(222, 35%, 13%, 0.9) 0%, hsla(222, 35%, 9%, 0.95) 100%)",
              backdropFilter: "blur(40px) saturate(1.5)",
              border: "1px solid hsla(0, 0%, 100%, 0.07)",
              boxShadow: "0 24px 64px -12px hsla(0, 0%, 0%, 0.5), 0 0 0 1px hsla(0, 0%, 100%, 0.03) inset, 0 1px 0 hsla(0, 0%, 100%, 0.05) inset",
            }}
          >
            {/* Top accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            
            <div className="p-7">
              {/* Header */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className="text-center mb-7"
                >
                  <div className="flex justify-center mb-4">
                    <div
                      className="rounded-2xl p-3.5"
                      style={{
                        background: "linear-gradient(135deg, hsla(262, 83%, 58%, 0.15), hsla(217, 91%, 55%, 0.1))",
                        border: "1px solid hsla(262, 83%, 58%, 0.2)",
                        boxShadow: "0 0 24px hsla(262, 83%, 58%, 0.1)",
                      }}
                    >
                      <current.icon className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <h1 className="text-[22px] font-bold font-heading text-white tracking-tight">
                    {current.title}
                  </h1>
                  <p className="text-white/40 text-sm mt-1">{current.subtitle}</p>
                </motion.div>
              </AnimatePresence>

              {/* Inline Notification */}
              <AnimatePresence>
                {notification && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
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
                    {notification.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : notification.type === "error" ? (
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <span className="flex-1 leading-snug">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Google OAuth */}
              {(mode === "login" || mode === "register") && (
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/[0.08]"
                    style={{
                      background: "hsla(0, 0%, 100%, 0.04)",
                      border: "1px solid hsla(0, 0%, 100%, 0.08)",
                    }}
                  >
                    <Chrome className="h-[18px] w-[18px] text-white/70" />
                    Continue with Google
                  </button>
                  <div className="flex items-center gap-4 my-5">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="text-white/30 text-[11px] uppercase tracking-[0.15em] font-medium">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                </div>
              )}

              {/* Login Form */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                      <Input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className={inputClass}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                      <Input
                        type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                        className={`${inputClass} pr-10`}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(c) => setRememberMe(!!c)}
                        className="border-white/15 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-500 h-3.5 w-3.5"
                      />
                      <label htmlFor="remember" className="text-[12px] text-white/40 cursor-pointer">
                        Remember me (30 days)
                      </label>
                    </div>
                    <button type="button" onClick={() => setMode("forgot")} className="text-[12px] text-purple-400/60 hover:text-purple-400 transition-colors">
                      Forgot?
                    </button>
                  </div>
                  <Button type="submit" disabled={isSubmitting}
                    className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-[1.01]"
                    style={{
                      background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 70%, 50%))",
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
                      <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Username</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">@</span>
                        <Input
                          value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required
                          className="pl-8 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/25 focus:border-purple-500/40 focus:bg-white/[0.06] rounded-xl h-11 text-sm transition-all duration-200"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Display Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                        <Input
                          value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                          className={inputClass}
                          placeholder="John"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                      <Input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className={inputClass}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                      <Input
                        type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                        className={`${inputClass} pr-10`}
                        placeholder="Min 8 characters"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}
                    className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-[1.01]"
                    style={{
                      background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 70%, 50%))",
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              )}

              {/* Forgot Password */}
              {mode === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                      <Input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className={inputClass}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}
                    className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-[1.01]"
                    style={{
                      background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 70%, 50%))",
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}

              {/* Magic Link */}
              {mode === "magic" && (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-[0.12em]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
                      <Input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className={inputClass}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <p className="text-white/30 text-xs">We'll send a one-time login link that expires after 24 hours.</p>
                  <Button type="submit" disabled={isSubmitting}
                    className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-[1.01]"
                    style={{
                      background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 70%, 50%))",
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Sending..." : "Send Magic Link"}
                  </Button>
                </form>
              )}

              {/* Mode Switchers */}
              <div className="mt-6 space-y-2.5 text-center">
                {mode !== "login" && (
                  <button onClick={() => setMode("login")} className="flex items-center justify-center gap-2 w-full text-[13px] text-white/40 hover:text-white/70 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                  </button>
                )}
                {mode === "login" && (
                  <>
                    <button onClick={() => setMode("register")} className="block w-full text-[13px] text-white/40 hover:text-white/60 transition-colors">
                      Don't have an account? <span className="font-semibold text-purple-400">Sign Up</span>
                    </button>
                    <button onClick={() => setMode("magic")} className="block w-full text-[13px] text-white/30 hover:text-white/50 transition-colors">
                      <Sparkles className="inline h-3 w-3 mr-1 opacity-60" /> Login with magic link
                    </button>
                  </>
                )}
                {mode === "register" && (
                  <button onClick={() => setMode("login")} className="block w-full text-[13px] text-white/40 hover:text-white/60 transition-colors">
                    Already have an account? <span className="font-semibold text-purple-400">Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
};

export default Auth;

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { trackAdminLogin } from "@/hooks/useVisitorTracking";
import {
  Eye, EyeOff, LogIn, Lock, Mail, User, ArrowLeft,
  Sparkles, KeyRound, Send, UserPlus, Chrome,
  CheckCircle2, AlertCircle, XCircle, X
} from "lucide-react";
import BackButton from "@/components/BackButton";

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
  const navigate = useNavigate();

  // Clear notification on mode change
  useEffect(() => { setNotification(null); }, [mode]);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
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
      navigate("/");
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
      return true; // fail open so auth flow isn't blocked
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[hsl(222,35%,8%)] via-[hsl(220,35%,10%)] to-[hsl(225,35%,6%)]">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center py-20 px-4">
        <div className="absolute top-20 left-4 z-10">
          <BackButton />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div
            className="bg-[hsl(222,30%,12%)] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8"
          >
            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-center mb-6"
              >
                <div className="flex justify-center mb-4">
                  <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                    <current.icon className="w-7 h-7 text-purple-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold font-heading mb-1 text-white">
                  {current.title}
                </h1>
                <p className="text-white/50 text-sm">{current.subtitle}</p>
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
                  className={`relative flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                    notification.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : notification.type === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
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
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg h-11 border border-white/10 gap-3 transition-colors"
                >
                  <Chrome className="h-5 w-5" />
                  Continue with Google
                </Button>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/40 text-xs uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </div>
            )}

            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                    <Input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                    <Input
                      type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors">
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
                      className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-500"
                    />
                    <label htmlFor="remember" className="text-sm text-white/50 cursor-pointer">
                      Remember me (30 days)
                    </label>
                  </div>
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-purple-400/70 hover:text-purple-400 underline-offset-4 hover:underline transition-colors">
                    Forgot?
                  </button>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg h-10 text-sm shadow-lg">
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
                    <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">@</span>
                      <Input
                        value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required
                        className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                      <Input
                        value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                        placeholder="John"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                    <Input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                    <Input
                      type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg h-10 text-sm shadow-lg">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Forgot Password */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                    <Input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-lg h-10 text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg h-10 text-sm shadow-lg">
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}

            {/* Magic Link */}
            {mode === "magic" && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                    <Input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <p className="text-white/40 text-xs">We'll send a one-time login link that expires after 24 hours.</p>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg h-10 text-sm shadow-lg">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>
            )}

            {/* Mode Switchers */}
            <div className="mt-6 space-y-2 text-center">
              {mode !== "login" && (
                <button onClick={() => setMode("login")} className="flex items-center justify-center gap-2 w-full text-sm text-white/50 hover:text-white transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </button>
              )}
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("register")} className="block w-full text-sm text-white/50 hover:text-white transition-colors">
                    Don't have an account? <span className="font-semibold text-purple-400 underline-offset-4 hover:underline">Sign Up</span>
                  </button>
                  <button onClick={() => setMode("magic")} className="block w-full text-sm text-white/40 hover:text-white/60 transition-colors">
                    <Sparkles className="inline h-3 w-3 mr-1" /> Login with magic link
                  </button>
                </>
              )}
              {mode === "register" && (
                <button onClick={() => setMode("login")} className="block w-full text-sm text-white/50 hover:text-white transition-colors">
                  Already have an account? <span className="font-semibold text-purple-400 underline-offset-4 hover:underline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

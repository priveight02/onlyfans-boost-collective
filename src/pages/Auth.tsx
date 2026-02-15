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
import { trackAdminLogin } from "@/hooks/useVisitorTracking";
import {
  Eye, EyeOff, LogIn, Lock, Mail, User, ArrowLeft,
  Sparkles, KeyRound, Send, UserPlus, Chrome
} from "lucide-react";
import BackButton from "@/components/BackButton";

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
  const { signIn, signUp, signInWithMagicLink, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      result.error.errors.forEach((err) => toast.error(err.message));
      return;
    }
    try {
      setIsSubmitting(true);
      await signIn(email, password, rememberMe);
      trackAdminLogin(email, true);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      trackAdminLogin(email, false);
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = registerSchema.safeParse({ email, password, username, displayName });
    if (!result.success) {
      result.error.errors.forEach((err) => toast.error(err.message));
      return;
    }
    try {
      setIsSubmitting(true);
      await signUp(email, password, username, displayName);
      toast.success("Account created! Please check your email to verify your account.");
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email"); return; }
    try {
      setIsSubmitting(true);
      await resetPassword(email);
      toast.success("Password reset link sent! Check your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email"); return; }
    try {
      setIsSubmitting(true);
      await signInWithMagicLink(email);
      toast.success("Magic link sent! Check your email (link expires in 24h).");
    } catch (error: any) {
      toast.error(error.message || "Failed to send magic link");
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
      toast.error(error.message || "Google login failed");
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary via-accent to-primary-accent">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-70">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4], rotate: [0, 180, 360] }}
            transition={{ duration: 75, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/50 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.7, 0.5], rotate: [360, 180, 0] }}
            transition={{ duration: 70, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/50 rounded-full mix-blend-multiply filter blur-xl"
          />
        </div>
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
            className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}
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
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <current.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold font-heading mb-1 text-white drop-shadow-lg">
                  {current.title}
                </h1>
                <p className="text-white/70 text-sm">{current.subtitle}</p>
              </motion.div>
            </AnimatePresence>

            {/* Google OAuth */}
            {(mode === "login" || mode === "register") && (
              <div className="mb-5">
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl h-12 border border-white/30 backdrop-blur-sm gap-3"
                >
                  <Chrome className="h-5 w-5" />
                  Continue with Google
                </Button>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/50 text-xs uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>
              </div>
            )}

            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
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
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                    <Input
                      type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="pl-12 pr-14 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(!!c)}
                      className="border-white/40 data-[state=checked]:bg-white/30 data-[state=checked]:border-white/50"
                    />
                    <label htmlFor="remember" className="text-sm text-white/70 cursor-pointer">
                      Remember me (30 days)
                    </label>
                  </div>
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-white/70 hover:text-white underline-offset-4 hover:underline">
                    Forgot?
                  </button>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}

            {/* Register Form */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/90">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-sm font-medium">@</span>
                      <Input
                        value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required
                        className="pl-8 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/90">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 h-4 w-4" />
                      <Input
                        value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                        className="pl-9 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                        placeholder="John"
                      />
                    </div>
                  </div>
                </div>
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
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                    <Input
                      type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="pl-12 pr-14 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Forgot Password */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
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
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm">
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
                <p className="text-white/50 text-xs">We'll send a one-time login link that expires after 24 hours.</p>
                <Button type="submit" disabled={isSubmitting}
                  className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>
            )}

            {/* Mode Switchers */}
            <div className="mt-6 space-y-2 text-center">
              {mode !== "login" && (
                <button onClick={() => setMode("login")} className="flex items-center justify-center gap-2 w-full text-sm text-white/70 hover:text-white transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </button>
              )}
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("register")} className="block w-full text-sm text-white/70 hover:text-white transition-colors">
                    Don't have an account? <span className="font-semibold underline-offset-4 hover:underline">Sign Up</span>
                  </button>
                  <button onClick={() => setMode("magic")} className="block w-full text-sm text-white/50 hover:text-white/80 transition-colors">
                    <Sparkles className="inline h-3 w-3 mr-1" /> Login with magic link
                  </button>
                </>
              )}
              {mode === "register" && (
                <button onClick={() => setMode("login")} className="block w-full text-sm text-white/70 hover:text-white transition-colors">
                  Already have an account? <span className="font-semibold underline-offset-4 hover:underline">Sign In</span>
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

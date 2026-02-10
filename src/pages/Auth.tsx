import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, LogIn, Lock, Mail, Shield } from "lucide-react";
import BackButton from "@/components/BackButton";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().trim().min(1, "Password is required").max(128),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      result.error.errors.forEach((err) => toast.error(err.message));
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email, password);
      toast.success("Successfully logged in!");
      navigate("/admin");
    } catch (error) {
      toast.error("Invalid credentials. Access denied.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-primary via-accent to-primary-accent">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-70">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4], rotate: [0, 180, 360] }}
            transition={{ duration: 75, repeat: Infinity, ease: [0.4, 0, 0.2, 1], times: [0, 0.5, 1] }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/50 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.7, 0.5], rotate: [360, 180, 0] }}
            transition={{ duration: 70, repeat: Infinity, ease: [0.4, 0, 0.2, 1], times: [0, 0.5, 1] }}
            className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/50 rounded-full mix-blend-multiply filter blur-xl"
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute top-2 left-2 z-10">
          <BackButton />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md px-4"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold font-heading mb-2 text-white drop-shadow-lg">
                Admin Login
              </h1>
              <p className="text-white/70 text-sm">
                Authorized personnel only
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="email" className="block text-sm font-semibold text-white/90">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 transition-all duration-300 rounded-xl h-12"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="password" className="block text-sm font-semibold text-white/90">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 pr-14 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 transition-all duration-300 rounded-xl h-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold transition-all duration-300 rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

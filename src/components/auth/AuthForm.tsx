import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, LogIn, UserPlus, DoorClosed, DoorOpen, Mail, Lock } from "lucide-react";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { AuthFormProps } from "./AuthTypes";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const AuthForm = ({ isLogin, setIsLogin }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success("Successfully logged in!");
      } else {
        await signUp(email, password);
        toast.success("Account created successfully!");
      }
      
      // Check for redirect path after login
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsResetting(true);
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reset email");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 animate-scale-in hover:bg-white/15 transition-all duration-500"
      style={{ 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
      }}
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-heading mb-3 text-white drop-shadow-lg">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-white/80 text-sm">
          {isLogin
            ? "Sign in to access your account"
            : "Register to join our platform"}
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
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold transition-all duration-300 relative group rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className="flex items-center justify-center gap-2">
            {isLogin ? (
              <>
                <LogIn className={`h-4 w-4 transition-transform duration-300 ${
                  isHovered ? "translate-x-1" : ""
                }`} />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className={`h-4 w-4 transition-transform duration-300 ${
                  isHovered ? "translate-x-1" : ""
                }`} />
                Create Account
              </>
            )}
            <span className="absolute right-4 transition-all duration-300">
              {isHovered ? <DoorOpen className="h-4 w-4" /> : <DoorClosed className="h-4 w-4" />}
            </span>
          </span>
        </Button>
      </form>

      <div className="mt-8">
        <div className="relative flex items-center">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/40 to-white/20"></div>
          <span className="px-6 py-2 mx-4 bg-gradient-to-r from-white/20 to-white/10 text-white font-medium backdrop-blur-md rounded-full border border-white/30 shadow-lg">
            Or
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/40 to-white/20"></div>
        </div>

        <div className="mt-6 flex flex-col space-y-3">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-center text-white hover:text-white/80 text-sm font-medium transition-colors p-3 bg-white/10 rounded-xl border border-white/20 hover:bg-white/15"
          >
            {isLogin ? "Need an account? Register" : "Already have an account? Login"}
          </button>
          
          {isLogin && (
            <button
              onClick={handlePasswordReset}
              disabled={isResetting}
              className="text-center text-white/80 hover:text-white text-sm font-medium transition-colors p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"
            >
              {isResetting ? "Sending reset email..." : "Forgot your password?"}
            </button>
          )}
        </div>
      </div>

      {!isLogin && (
        <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white/90 mb-3">Password Requirements:</h3>
          <ul className="text-xs text-white/70 space-y-1">
            <li>• Minimum 8 characters</li>
            <li>• At least one uppercase letter</li>
            <li>• At least one lowercase letter</li>
            <li>• At least one number</li>
            <li>• At least one special character</li>
          </ul>
        </div>
      )}
    </div>
  );
};
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { ArrowRight, DoorClosed, DoorOpen, Mail, Lock, UserPlus, LogIn, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

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

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary-light to-primary/10">
        <div className="absolute inset-0 animate-float opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-accent/20 rounded-full filter blur-3xl"></div>
          <div className="absolute top-3/4 left-2/3 w-96 h-96 bg-purple-400/20 rounded-full filter blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-400/20 rounded-full filter blur-3xl animate-float-reverse"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-screen pt-24 pb-12 px-4">
        <BackButton />
        
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Features */}
          <div className="space-y-8 p-8">
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-primary mb-4">Why Choose Us?</h2>
              <div className="space-y-4">
                <Feature
                  icon="🔒"
                  title="Secure Platform"
                  description="Enterprise-grade security with advanced encryption"
                />
                <Feature
                  icon="⚡"
                  title="Fast Onboarding"
                  description="Get started in minutes with our streamlined process"
                />
                <Feature
                  icon="💰"
                  title="Maximize Earnings"
                  description="Proven strategies to increase your revenue"
                />
                <Feature
                  icon="🌟"
                  title="24/7 Support"
                  description="Dedicated team ready to help you succeed"
                />
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <Stat number="10k+" label="Active Models" />
              <Stat number="95%" label="Success Rate" />
              <Stat number="24/7" label="Support" />
              <Stat number="$50k+" label="Avg. Monthly" />
            </div>
          </div>

          {/* Right side - Auth Form */}
          <div className="flex justify-center">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 animate-scale-in">
              <h1 className="text-3xl font-bold text-center mb-2 text-primary">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-center text-gray-600 mb-8">
                {isLogin
                  ? "Sign in to access your account"
                  : "Register to join our platform"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

                <Button
                  type="submit"
                  className="w-full bg-primary-accent hover:bg-primary-accent/90 transition-all duration-300 relative group"
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

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="mt-4 w-full text-center text-primary-accent hover:text-primary-accent/80 text-sm font-medium transition-colors"
                >
                  {isLogin ? "Need an account? Register" : "Already have an account? Login"}
                </button>
              </div>

              {/* Password requirements hint */}
              {!isLogin && (
                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Minimum 8 characters</li>
                    <li>• At least one uppercase letter</li>
                    <li>• At least one lowercase letter</li>
                    <li>• At least one number</li>
                    <li>• At least one special character</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Feature Component
const Feature = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="flex items-start space-x-3">
    <div className="text-2xl">{icon}</div>
    <div>
      <h3 className="font-medium text-primary">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

// Stat Component
const Stat = ({ number, label }: { number: string; label: string }) => (
  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 text-center">
    <div className="text-2xl font-bold text-primary-accent">{number}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

export default Auth;

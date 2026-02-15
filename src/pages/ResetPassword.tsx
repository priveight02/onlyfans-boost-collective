import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import BackButton from "@/components/BackButton";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    try {
      setIsSubmitting(true);
      await updatePassword(password);
      toast.success("Password updated successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold font-heading mb-1 text-white">Set New Password</h1>
              <p className="text-white/70 text-sm">Choose a strong password for your account</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="pl-12 pr-14 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                    placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 h-5 w-5" />
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                    className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-xl h-12"
                    placeholder="Confirm password" />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting}
                className="w-full bg-white/25 hover:bg-white/35 text-white font-semibold rounded-xl h-12 border border-white/30 shadow-lg backdrop-blur-sm">
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;

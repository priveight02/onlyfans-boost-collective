import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "laflare18@protonmail.com";
const CORRECT_PASSPHRASE = "QZDl(fGZ1mC-7?q)T_Xk+]a)H$Qr9<A2&,.B`vl=xe79Fvv1xJNGzP}K~[$P(]L%}Mz4457X'i>}CTo[r$K:vM6vDzx(%#?*1/=@";
const MAX_ATTEMPTS = 3;
const BLOCK_DURATION = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

const AdminPassphrase = () => {
  const [passphrase, setPassphrase] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get stored attempts from localStorage
  const getStoredAttempts = () => {
    const stored = localStorage.getItem("adminAttempts");
    return stored ? JSON.parse(stored) : { count: 0, timestamp: Date.now() };
  };

  useEffect(() => {
    console.log("AdminPassphrase: Checking authorization");
    console.log("Current user:", user?.email);
    
    // Check if user is authorized
    if (!user) {
      console.log("No user found, redirecting to login");
      toast.error("Please login to access the admin panel");
      navigate("/auth");
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      console.log("Unauthorized user attempted access:", user.email);
      toast.error("You don't have permission to access this page");
      navigate("/");
      return;
    }

    // Check if user is blocked
    const attempts = getStoredAttempts();
    if (attempts.count >= MAX_ATTEMPTS) {
      const timeElapsed = Date.now() - attempts.timestamp;
      if (timeElapsed < BLOCK_DURATION) {
        console.log("Blocked user attempted access");
        toast.error("You have been blocked from accessing the admin panel due to too many failed attempts");
        navigate("/");
        return;
      } else {
        // Reset attempts after block duration
        localStorage.setItem("adminAttempts", JSON.stringify({ count: 0, timestamp: Date.now() }));
      }
    }

    console.log("Authorization check passed for admin user");
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const attempts = getStoredAttempts();

    if (passphrase === CORRECT_PASSPHRASE) {
      console.log("Correct passphrase entered");
      // Reset attempts on successful entry
      localStorage.setItem("adminAttempts", JSON.stringify({ count: 0, timestamp: Date.now() }));
      toast.success("Access granted");
      navigate("/admin");
    } else {
      const newAttempts = {
        count: attempts.count + 1,
        timestamp: Date.now()
      };
      localStorage.setItem("adminAttempts", JSON.stringify(newAttempts));
      
      if (newAttempts.count >= MAX_ATTEMPTS) {
        console.log("User blocked after maximum attempts");
        toast.error("You have been blocked from accessing the admin panel due to too many failed attempts");
        navigate("/");
      } else {
        console.log(`Incorrect passphrase attempt ${newAttempts.count} of ${MAX_ATTEMPTS}`);
        toast.error(`Incorrect passphrase. ${MAX_ATTEMPTS - newAttempts.count} attempts remaining`);
        setPassphrase("");
      }
    }
  };

  // Only render the form if the user is authorized
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-primary-light to-primary/10 pt-20 px-4">
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Admin Verification</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700">
              Enter Admin Passphrase
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pl-10"
                placeholder="Enter the admin passphrase"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Verify Access
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminPassphrase;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const CustomerPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const openPortal = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const res = await supabase.functions.invoke("customer-portal", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.error || res.data?.error) {
          throw new Error(res.data?.error || res.error?.message || "Failed to load portal");
        }

        if (res.data?.url) {
          window.location.href = res.data.url;
        } else {
          throw new Error("No portal URL returned");
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      }
    };

    openPortal();
  }, [user, authLoading, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-destructive text-lg font-medium">Unable to open Customer Portal</p>
        <p className="text-muted-foreground text-sm max-w-md text-center">{error}</p>
        <button
          onClick={() => navigate("/profile")}
          className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Redirecting to Customer Portal…</p>
    </div>
  );
};

export default CustomerPortal;

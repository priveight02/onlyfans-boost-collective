import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageSEO from "@/components/PageSEO";

const ThankYou = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <PageSEO
        title="Thank You | Uplyze"
        description="Your purchase was successful. Thank you for choosing Uplyze."
      />
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] px-4 py-20">
        <div className="w-full max-w-lg text-center space-y-8">
          {/* Glow circle */}
          <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping" />
            <CheckCircle className="h-12 w-12 text-emerald-400 relative z-10" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Thank You for Your Purchase!
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-md mx-auto">
              Your transaction has been completed successfully. Your credits have been added to your account.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <ShieldCheck className="h-4 w-4 text-emerald-400/60" /> Secure Payment
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Sparkles className="h-4 w-4 text-amber-400/60" /> Instant Delivery
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              onClick={() => navigate("/platform")}
              className="bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 px-6"
            >
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigate("/pricing")}
              variant="ghost"
              className="text-white/40 hover:text-white/70"
            >
              View More Plans
            </Button>
          </div>

          {/* Order support */}
          <p className="text-[11px] text-white/20 pt-6">
            Need help? Contact us at{" "}
            <a href="mailto:contact@uplyze.ai" className="underline hover:text-white/40 transition-colors">
              contact@uplyze.ai
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default ThankYou;

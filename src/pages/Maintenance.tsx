import { useState, useEffect } from "react";
import { Shield, Wrench, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Maintenance = () => {
  const { settings } = useSiteSettings();
  const endTime = settings.maintenance_end_time;
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endTime) { setTimeLeft(""); return; }
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Any moment now..."); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`
      );
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222,35%,8%)] via-[hsl(220,35%,10%)] to-[hsl(225,35%,6%)] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center max-w-lg"
      >
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Wrench className="h-16 w-16 text-purple-400" />
            </div>
            <div className="absolute -top-2 -right-2 p-2 rounded-full bg-amber-500/20 border border-amber-500/30">
              <Shield className="h-4 w-4 text-amber-400" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold font-heading text-white mb-4">
          Under Maintenance
        </h1>
        <p className="text-lg text-white/50 mb-6 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience.
          We'll be back shortly.
        </p>

        {/* Countdown */}
        {endTime && (
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10">
              <Clock className="h-5 w-5 text-purple-400" />
              <div className="text-left">
                <p className="text-xs text-white/40 uppercase tracking-wider">Estimated time remaining</p>
                <p className="text-2xl font-bold text-white font-mono tracking-wider">{timeLeft}</p>
              </div>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-sm">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Maintenance in progress
        </div>

        <p className="mt-8 text-white/30 text-sm">
          If you believe this is an error, please contact support.
        </p>
      </motion.div>
    </div>
  );
};

export default Maintenance;

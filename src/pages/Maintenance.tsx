import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Maintenance = () => {
  const { settings } = useSiteSettings();
  const endTime = settings.maintenance_end_time;
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!endTime) { setTimeLeft(null); setExpired(false); return; }
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); setExpired(true); return; }
      setExpired(false);
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222,35%,8%)] via-[hsl(220,35%,10%)] to-[hsl(225,35%,6%)] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center max-w-lg"
      >
        <h1 className="text-5xl md:text-6xl font-bold font-heading text-white mb-4 tracking-tight">
          We'll be right back
        </h1>
        <p className="text-lg text-white/40 mb-10 leading-relaxed max-w-md mx-auto">
          We're making some improvements. Everything will be back to normal shortly.
        </p>

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-white/30 uppercase tracking-widest">Maintenance in progress</span>
        </div>

        {/* Countdown */}
        {timeLeft && !expired && (
          <div className="mb-10">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-4">Estimated time remaining</p>
            <div className="flex items-center justify-center gap-4">
              {[
                { val: timeLeft.h, label: "hours" },
                { val: timeLeft.m, label: "min" },
                { val: timeLeft.s, label: "sec" },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-4xl md:text-5xl font-bold text-white font-mono tabular-nums">
                      {String(unit.val).padStart(2, "0")}
                    </span>
                    <p className="text-[10px] text-white/20 uppercase tracking-wider mt-1">{unit.label}</p>
                  </div>
                  {i < 2 && <span className="text-2xl text-white/15 font-light -mt-4">:</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {expired && (
          <p className="text-white/40 text-sm mb-10">
            Should be back any moment now. Try refreshing.
          </p>
        )}

        <p className="text-white/15 text-xs">
          If this persists, reach out to support.
        </p>
      </motion.div>
    </div>
  );
};

export default Maintenance;

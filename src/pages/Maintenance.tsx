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
        <div className="text-6xl mb-6">🔧</div>

        <h1 className="text-5xl md:text-6xl font-bold font-heading text-white mb-4 tracking-tight">
          We'll be right back
        </h1>
        <p className="text-lg text-white/40 mb-10 leading-relaxed max-w-md mx-auto">
          We're making some improvements. Everything will be back to normal shortly.
        </p>

        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-5 py-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-amber-300/80 font-medium">🛠️ Maintenance in progress</span>
        </div>

        {timeLeft && !expired && (
          <div className="mb-10">
            <p className="text-xs text-white/25 uppercase tracking-widest mb-4">⏳ Estimated time remaining</p>
            <div className="flex items-center justify-center gap-3">
              {[
                { val: timeLeft.h, label: "hours" },
                { val: timeLeft.m, label: "min" },
                { val: timeLeft.s, label: "sec" },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-3">
                  <div className="text-center bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl px-4 py-3 min-w-[72px] md:min-w-[85px]">
                    <span className="text-3xl md:text-4xl font-bold text-white font-mono tabular-nums">
                      {String(unit.val).padStart(2, "0")}
                    </span>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mt-1">{unit.label}</p>
                  </div>
                  {i < 2 && <span className="text-xl text-white/15 font-light">:</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {expired && (
          <p className="text-white/40 text-sm mb-10">
            ✅ Should be back any moment now. Try refreshing.
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

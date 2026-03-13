import { ArrowRight, Zap, Globe, Shield, Star, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    navigate(user ? "/pricing" : "/auth");
  };

  const handleScrollToReviews = () => {
    const el = document.getElementById("reviews-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    { icon: Globe, label: "Multi-Platform AI" },
    { icon: Bot, label: "24/7 Autopilot" },
    { icon: Shield, label: "Enterprise Security" },
  ];

  const avatars = [
    "https://i.pravatar.cc/80?img=1",
    "https://i.pravatar.cc/80?img=2",
    "https://i.pravatar.cc/80?img=3",
    "https://i.pravatar.cc/80?img=4",
    "https://i.pravatar.cc/80?img=5",
  ];

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="mb-6 text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl lg:text-[5.5rem]"
          >
            Turn Followers Into
            <br />
            Paying{" "}
            <span className="relative inline-block pb-14 md:pb-20">
              <span className="uplyze-highlight pb-2">
                Customers
              </span>
              <motion.span
                initial={{ opacity: 0, scale: 0.7, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                transition={{ duration: 0.6, delay: 0.6, type: "spring", stiffness: 180, damping: 10 }}
                 className="absolute -right-10 top-[55%] md:-right-16 md:top-[50%] z-20 inline-flex items-center gap-2.5 rounded-2xl px-5 py-2.5 md:px-7 md:py-3.5 text-xs md:text-base font-black whitespace-nowrap"
                 style={{
                   background: 'linear-gradient(135deg, hsl(260,80%,65%), hsl(275,82%,58%), hsl(255,78%,62%))',
                   color: 'white',
                   boxShadow: '0 2px 0 0 hsl(260,70%,45%)',
                   letterSpacing: '-0.01em',
                   WebkitFontSmoothing: 'antialiased',
                   MozOsxFontSmoothing: 'grayscale',
                   textRendering: 'geometricPrecision',
                 }}
               >
                <Zap className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" />
                On complete autopilot
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg"
          >
            Automate engagement, close more sales, and scale revenue on autopilot.
            <br className="hidden sm:block" />
            Replace 10+ tools with one AI-powered platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mb-6 flex flex-wrap justify-center gap-3"
          >
            {features.map((feature) => (
              <div
                key={feature.label}
                className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/40 px-4 py-2 text-sm font-medium text-white/75"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                {feature.label}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mb-6 flex justify-center"
          >
            <button
              onClick={handleGetStarted}
              className="group inline-flex transform items-center rounded-2xl px-10 py-4 text-base font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                boxShadow: "0 6px 26px hsl(var(--primary) / 0.35), inset 0 0 0 1px hsl(0 0% 100% / 0.07)",
              }}
            >
              Get Started Free
              <ArrowRight className="ml-2.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-border/40 bg-card/35 px-5 py-2.5 transition-all duration-300 hover:scale-[1.02]"
            onClick={handleScrollToReviews}
            title="See reviews"
          >
            <div className="flex -space-x-2.5">
              {avatars.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="relative h-8 w-8 rounded-full border-2 border-background object-cover"
                  style={{ zIndex: avatars.length - i }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-current text-primary" />
              <span className="text-sm font-semibold text-white">4.9/5</span>
              <span className="text-sm text-white/50">from 700+ users</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5 text-white/50" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

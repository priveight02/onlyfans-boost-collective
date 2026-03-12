import { ArrowRight, Sparkles, Globe, Zap, Shield, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    navigate(user ? '/pricing' : '/auth');
  };

  const features = [
    { icon: Globe, label: "Multi-Platform AI" },
    { icon: Zap, label: "24/7 Autopilot" },
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
    <div className="relative flex items-center min-h-screen pt-16 overflow-hidden">
      {/* Warm gradient glow - inspired by reference */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] pointer-events-none"
        style={{
          width: "900px",
          height: "700px",
          background: "radial-gradient(ellipse at center, hsla(270, 80%, 65%, 0.15) 0%, hsla(200, 90%, 55%, 0.08) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute top-[30%] left-[35%] pointer-events-none"
        style={{
          width: "500px",
          height: "500px",
          background: "radial-gradient(ellipse at center, hsla(50, 90%, 65%, 0.08) 0%, hsla(140, 70%, 50%, 0.04) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Announcement pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: "hsla(270, 80%, 65%, 0.1)",
              border: "1px solid hsla(270, 80%, 65%, 0.2)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(270, 80%, 70%)" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(270, 80%, 80%)" }}>
              Trusted by 700+ creators & agencies
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-[5.2rem] font-bold mb-6 font-heading tracking-tight leading-[1.05]"
            style={{ color: "hsla(0, 0%, 100%, 0.95)" }}
          >
            The #1 AI Platform
            <br />
            <span className="relative inline-block">
              for Creators & Agencies
              {/* Highlighted callout badge */}
              <motion.span
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 2 }}
                transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
                className="absolute -right-4 md:-right-12 -bottom-2 md:bottom-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap"
                style={{
                  background: "hsl(52, 95%, 72%)",
                  color: "hsl(222, 35%, 12%)",
                  boxShadow: "0 4px 20px hsla(52, 95%, 55%, 0.3)",
                  transform: "rotate(2deg)",
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                10x faster growth
              </motion.span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: "hsla(215, 25%, 65%, 0.9)" }}
          >
            Automate engagement, close more sales, and scale revenue on autopilot.
            <br className="hidden sm:block" />
            Replace 10+ tools with one AI-powered platform.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            {features.map((feature, i) => (
              <div
                key={feature.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: "hsla(215, 25%, 50%, 0.08)",
                  border: "1px solid hsla(215, 25%, 50%, 0.12)",
                  color: "hsla(215, 25%, 75%, 0.9)",
                }}
              >
                <feature.icon className="h-4 w-4" style={{ color: "hsl(217, 91%, 65%)" }} />
                {feature.label}
              </div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex justify-center mb-10"
          >
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center px-10 py-4 text-base font-semibold rounded-2xl text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "hsl(222, 35%, 12%)",
                border: "1px solid hsla(215, 25%, 40%, 0.2)",
                boxShadow: "0 4px 24px hsla(222, 35%, 4%, 0.5), 0 0 0 1px hsla(215, 25%, 50%, 0.05) inset",
              }}
            >
              Get Started Free
              <ArrowRight className="ml-2.5 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </motion.div>

          {/* Social proof bar */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full"
            style={{
              background: "hsla(215, 25%, 50%, 0.06)",
              border: "1px solid hsla(215, 25%, 50%, 0.1)",
            }}
          >
            {/* Avatar stack */}
            <div className="flex -space-x-2.5">
              {avatars.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                  style={{
                    border: "2px solid hsl(222, 35%, 12%)",
                    zIndex: avatars.length - i,
                    position: "relative",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-current" style={{ color: "hsl(45, 93%, 58%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsla(0, 0%, 100%, 0.9)" }}>
                4.9/5
              </span>
              <span className="text-sm" style={{ color: "hsla(215, 25%, 65%, 0.7)" }}>
                from 700+ users
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;

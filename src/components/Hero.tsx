import { ArrowRight, Zap, Globe, Shield, Star, TrendingUp, Bot, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    navigate(user ? '/pricing' : '/auth');
  };

  const handleScrollToReviews = () => {
    const el = document.getElementById('reviews-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    { icon: Globe, label: "Multi-Platform AI" },
    { icon: Bot, label: "24/7 Autopilot" },
    { icon: Shield, label: "Enterprise Security" },
  ];

  const stats = [
    { value: "10x", label: "Faster Growth" },
    { value: "700+", label: "Active Users" },
    { value: "24/7", label: "AI Automation" },
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold mb-4 font-heading tracking-tight leading-[1.05]"
            style={{ color: "hsla(0, 0%, 100%, 0.95)" }}
          >
            The #1 AI Platform
            <br />
            for Creators & Agencies
          </motion.h1>

          {/* 10x faster growth badge - below heading */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6, type: "spring" }}
            className="flex justify-center mb-6"
          >
            <span
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: "hsl(52, 95%, 72%)",
                color: "hsl(222, 35%, 12%)",
                boxShadow: "0 4px 20px hsla(52, 95%, 55%, 0.3)",
              }}
            >
              <Zap className="h-4 w-4" />
              10x faster growth
            </span>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8"
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
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            {features.map((feature) => (
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
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex justify-center mb-8"
          >
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center px-10 py-4 text-base font-semibold rounded-2xl text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(217, 91%, 55%))",
                boxShadow: "0 4px 24px hsla(262, 83%, 58%, 0.3), 0 0 0 1px hsla(0, 0%, 100%, 0.05) inset",
              }}
            >
              Get Started Free
              <ArrowRight className="ml-2.5 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex justify-center gap-8 md:gap-12 mb-8"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: "hsla(0, 0%, 100%, 0.95)" }}>
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm mt-1" style={{ color: "hsla(215, 25%, 65%, 0.7)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Social proof bar - clickable to scroll to reviews */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full cursor-pointer transition-all duration-300 hover:scale-[1.03]"
            onClick={handleScrollToReviews}
            style={{
              background: "hsla(215, 25%, 50%, 0.06)",
              border: "1px solid hsla(215, 25%, 50%, 0.1)",
            }}
            title="See reviews"
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
              <ArrowRight className="h-3.5 w-3.5 ml-1" style={{ color: "hsla(215, 25%, 65%, 0.5)" }} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
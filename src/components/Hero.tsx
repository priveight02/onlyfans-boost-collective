import { ArrowRight, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    navigate(user ? '/pricing' : '/auth');
  };

  return (
    <div className="relative flex items-center overflow-hidden min-h-screen pt-16"
      style={{ background: 'linear-gradient(160deg, hsl(222,35%,8%) 0%, hsl(240,25%,12%) 30%, hsl(260,20%,10%) 60%, hsl(222,35%,8%) 100%)' }}
    >
      {/* Animated gradient orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.18, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[10%] w-[700px] h-[700px] bg-purple-600 rounded-full blur-[160px]"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-5%] right-[5%] w-[600px] h-[600px] bg-blue-600 rounded-full blur-[140px]"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute top-[40%] right-[30%] w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[120px]"
      />
      
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(222,35%,8%)_75%)] opacity-40" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] text-purple-300 text-sm font-medium backdrop-blur-sm">
              <Rocket className="h-3.5 w-3.5" />
              AI-Powered Business Growth Platform
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="text-5xl md:text-8xl font-bold text-white mb-6 font-heading tracking-tight leading-[1.05]"
          >
            The AI-Powered CRM
            <br />
            <motion.span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #c084fc 0%, #818cf8 25%, #60a5fa 50%, #818cf8 75%, #c084fc 100%)',
                backgroundSize: '200% auto',
              }}
              animate={{ backgroundPosition: ['0% center', '200% center'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              That Grows Your Business
            </motion.span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/45 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Automate workflows, engage customers with AI, and unlock data-driven insights, all from one intelligent platform built for modern businesses.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex justify-center"
          >
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center px-12 py-4 text-lg font-semibold rounded-xl text-white transition-all duration-300 transform hover:scale-105 shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40"
              style={{
                background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 50%, #3b82f6 100%)',
              }}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;

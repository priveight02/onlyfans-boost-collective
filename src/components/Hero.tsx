import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <div className="relative flex items-center bg-gradient-to-br from-[#7c4dff] via-[#c592ff] to-[#ff9de3] overflow-hidden py-32">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        
        {/* Ultra-smooth background patterns with optimized animations */}
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 90, // Increased for ultra-smooth motion
            repeat: Infinity,
            ease: [0.4, 0.0, 0.2, 1], // Custom easing for fluid motion
            times: [0, 0.5, 1]
          }}
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '400px 400px',
          }}
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 85, // Increased for ultra-smooth motion
            repeat: Infinity,
            ease: [0.4, 0.0, 0.2, 1], // Custom easing for fluid motion
            times: [0, 0.5, 1]
          }}
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '300px 300px',
          }}
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading tracking-tight drop-shadow-lg [text-wrap:balance] leading-[1.1]"
          >
            Unlock Your Full Potential
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white mb-8 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-md bg-black/10 backdrop-blur-sm rounded-lg px-6 py-3 [text-wrap:balance]"
          >
            We help content creators grow their brand, maximize earnings, and succeed in the competitive digital space.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <a
              href="#contact"
              className="group inline-flex items-center px-8 py-3 text-lg font-medium rounded-full bg-white text-primary hover:bg-primary-light transition-all duration-500 transform hover:scale-105 shadow-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-500" />
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Ultra-smooth animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-70">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.6, 0.4],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 75,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1],
              times: [0, 0.5, 1]
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c592ff]/50 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.7, 0.5],
              rotate: [360, 180, 0]
            }}
            transition={{ 
              duration: 70,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1],
              times: [0, 0.5, 1]
            }}
            className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#7c4dff]/50 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
              rotate: [0, -180, -360]
            }}
            transition={{ 
              duration: 80,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1],
              times: [0, 0.5, 1]
            }}
            className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[#ff9de3]/50 rounded-full mix-blend-multiply filter blur-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default Hero;

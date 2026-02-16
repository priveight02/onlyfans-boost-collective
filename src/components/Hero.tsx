import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGetStarted = () => {
    navigate(user ? '/pricing' : '/auth');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    // Mesh gradient nodes
    const nodes = [
      { x: 0.12, y: 0.15, r: 450, color: [124, 58, 237], speed: 0.0002, phase: 0 },      // rich purple
      { x: 0.85, y: 0.75, r: 400, color: [37, 99, 235], speed: 0.00018, phase: 2 },       // royal blue
      { x: 0.5, y: 0.4, r: 500, color: [79, 70, 229], speed: 0.00015, phase: 4 },         // indigo
      { x: 0.2, y: 0.8, r: 350, color: [139, 92, 246], speed: 0.00025, phase: 1 },        // violet
      { x: 0.9, y: 0.1, r: 320, color: [59, 130, 246], speed: 0.0002, phase: 3 },         // blue
      { x: 0.6, y: 0.9, r: 280, color: [168, 85, 247], speed: 0.00022, phase: 5 },        // bright violet
    ];

    const draw = () => {
      time++;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear with base color
      ctx.fillStyle = 'hsl(222, 35%, 8%)';
      ctx.fillRect(0, 0, w, h);

      // Draw animated mesh gradient blobs
      for (const node of nodes) {
        const nx = node.x + Math.sin(time * node.speed + node.phase) * 0.08;
        const ny = node.y + Math.cos(time * node.speed * 0.7 + node.phase) * 0.06;
        const pulse = 1 + Math.sin(time * node.speed * 1.5 + node.phase) * 0.15;

        const gradient = ctx.createRadialGradient(
          nx * w, ny * h, 0,
          nx * w, ny * h, node.r * pulse
        );
        gradient.addColorStop(0, `rgba(${node.color[0]}, ${node.color[1]}, ${node.color[2]}, 0.18)`);
        gradient.addColorStop(0.5, `rgba(${node.color[0]}, ${node.color[1]}, ${node.color[2]}, 0.06)`);
        gradient.addColorStop(1, `rgba(${node.color[0]}, ${node.color[1]}, ${node.color[2]}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // Floating particles
      for (let i = 0; i < 40; i++) {
        const px = ((Math.sin(time * 0.0005 * (i + 1) + i * 1.7) + 1) / 2) * w;
        const py = ((Math.cos(time * 0.0004 * (i + 1) + i * 2.3) + 1) / 2) * h;
        const size = 1 + Math.sin(time * 0.002 + i) * 0.5;
        const alpha = 0.15 + Math.sin(time * 0.003 + i * 0.5) * 0.1;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 181, 253, ${alpha})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative flex items-center overflow-hidden min-h-screen pt-16">
      {/* GPU-accelerated animated canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 [backface-visibility:hidden] [transform:translateZ(0)]"
        style={{ willChange: 'transform' }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Noise texture for depth */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(222,35%,6%)_80%)] opacity-50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
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
            className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Automate your workflows, engage customers with AI, and unlock data-driven insights. Built for businesses, content creators, freelancers, and anyone ready to grow their digital presence.
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

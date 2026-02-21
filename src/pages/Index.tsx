import Hero from "@/components/Hero";
import ComparisonSection from "@/components/ComparisonSection";
import AutopilotShowcase from "@/components/AutopilotShowcase";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import { useEffect, useRef, useCallback } from "react";

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = parent.scrollWidth;
    const h = parent.scrollHeight;
    if (sizeRef.current.w === w && sizeRef.current.h === h && sizeRef.current.dpr === dpr) return;
    sizeRef.current = { w, h, dpr };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const nodes = [
      { x: 0.12, y: 0.05, r: 500, color: [124, 58, 237], speed: 0.0002, phase: 0 },
      { x: 0.85, y: 0.25, r: 450, color: [37, 99, 235], speed: 0.00018, phase: 2 },
      { x: 0.5, y: 0.15, r: 550, color: [79, 70, 229], speed: 0.00015, phase: 4 },
      { x: 0.2, y: 0.4, r: 400, color: [139, 92, 246], speed: 0.00025, phase: 1 },
      { x: 0.9, y: 0.55, r: 380, color: [59, 130, 246], speed: 0.0002, phase: 3 },
      { x: 0.6, y: 0.7, r: 350, color: [168, 85, 247], speed: 0.00022, phase: 5 },
      { x: 0.3, y: 0.85, r: 420, color: [99, 102, 241], speed: 0.00016, phase: 1.5 },
      { x: 0.75, y: 0.9, r: 380, color: [124, 58, 237], speed: 0.00019, phase: 3.5 },
    ];

    const draw = () => {
      time++;
      const { w, h, dpr } = sizeRef.current;
      if (w === 0 || h === 0) { animationId = requestAnimationFrame(draw); return; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'hsl(222, 35%, 8%)';
      ctx.fillRect(0, 0, w, h);

      for (const node of nodes) {
        const nx = node.x + Math.sin(time * node.speed + node.phase) * 0.06;
        const ny = node.y + Math.cos(time * node.speed * 0.7 + node.phase) * 0.04;
        const pulse = 1 + Math.sin(time * node.speed * 1.5 + node.phase) * 0.12;
        const gradient = ctx.createRadialGradient(nx * w, ny * h, 0, nx * w, ny * h, node.r * pulse);
        gradient.addColorStop(0, `rgba(${node.color[0]}, ${node.color[1]}, ${node.color[2]}, 0.14)`);
        gradient.addColorStop(0.5, `rgba(${node.color[0]}, ${node.color[1]}, ${node.color[2]}, 0.04)`);
        gradient.addColorStop(1, `rgba(${node.color[0]}, ${node.color[1]}, ${node.color[2]}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      for (let i = 0; i < 50; i++) {
        const px = ((Math.sin(time * 0.0005 * (i + 1) + i * 1.7) + 1) / 2) * w;
        const py = ((Math.cos(time * 0.0004 * (i + 1) + i * 2.3) + 1) / 2) * h;
        const size = 1 + Math.sin(time * 0.002 + i) * 0.5;
        const alpha = 0.12 + Math.sin(time * 0.003 + i * 0.5) * 0.08;
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
      resizeObserver.disconnect();
    };
  }, [syncSize]);

  return (
    <div className="relative min-h-screen" style={{ background: 'hsl(222, 35%, 8%)' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="relative z-10">
        <PageSEO
           title="Uplyze — #1 AI Platform, AI Tool & All-in-One AI Suite for Business Growth"
           description="Uplyze is the best AI platform, AI tool, and all-in-one AI suite trusted by 700+ businesses. AI marketing, AI CRM, growth AI, business scaling AI, marketing automation, social media AI, content creation, and revenue optimization at uplyze.ai."
           ogTitle="Uplyze — #1 AI Platform & Best AI Tool for Marketing, Growth & Business Scaling"
           ogDescription="The ultimate AI platform trusted by 700+ businesses. AI CRM, marketing automation, social media AI, content creation, lead generation, DM automation, and revenue scaling — all in one AI suite at uplyze.ai."
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Uplyze — Best AI Platform, AI Tool, AI CRM & All-in-One AI Suite",
            "description": "Uplyze is the #1 AI platform, AI tool, and all-in-one AI suite for creators, agencies, entrepreneurs, and businesses.",
            "url": "https://uplyze.ai",
            "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" },
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "Uplyze",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "AggregateOffer", "lowPrice": "0", "highPrice": "499.99", "priceCurrency": "USD" }
            }
          }}
        />
        <Hero />
        <ComparisonSection />
        <AutopilotShowcase />
        <Services />
        <Footer />
      </div>
    </div>
  );
};

export default Index;

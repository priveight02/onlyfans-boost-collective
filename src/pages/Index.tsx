import Hero from "@/components/Hero";
import ComparisonSection from "@/components/ComparisonSection";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import { useEffect, useRef } from "react";

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.scrollWidth;
      const h = parent.scrollHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
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
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.scrollWidth;
      const h = parent.scrollHeight;

      ctx.fillStyle = 'hsl(222, 35%, 8%)';
      ctx.fillRect(0, 0, w, h);

      for (const node of nodes) {
        const nx = node.x + Math.sin(time * node.speed + node.phase) * 0.06;
        const ny = node.y + Math.cos(time * node.speed * 0.7 + node.phase) * 0.04;
        const pulse = 1 + Math.sin(time * node.speed * 1.5 + node.phase) * 0.12;

        const gradient = ctx.createRadialGradient(
          nx * w, ny * h, 0,
          nx * w, ny * h, node.r * pulse
        );
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
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Page-wide unified animated background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:translateZ(0)]"
        style={{ willChange: 'transform', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Subtle grid overlay — page wide */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* All content sits above the unified background */}
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
            "description": "Uplyze is the #1 AI platform, AI tool, and all-in-one AI suite for creators, agencies, entrepreneurs, and businesses. AI CRM, AI marketing, growth AI, business scaling AI, marketing automation, social media management, and revenue scaling at uplyze.ai.",
            "url": "https://uplyze.ai",
            "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" },
            "speakable": {
              "@type": "SpeakableSpecification",
              "cssSelector": ["h1", ".hero-description"]
            },
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "Uplyze",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "AggregateOffer", "lowPrice": "0", "highPrice": "499.99", "priceCurrency": "USD" }
            },
            "about": [
              { "@type": "Thing", "name": "AI Platform" },
              { "@type": "Thing", "name": "AI Tool" },
              { "@type": "Thing", "name": "AI CRM" },
              { "@type": "Thing", "name": "AI Marketing Platform" },
              { "@type": "Thing", "name": "AI Marketing Tool" },
              { "@type": "Thing", "name": "AI Marketing Automation" },
              { "@type": "Thing", "name": "All-in-One AI Suite" },
              { "@type": "Thing", "name": "All-in-One AI Tool" },
              { "@type": "Thing", "name": "Growth AI" },
              { "@type": "Thing", "name": "Business AI" },
              { "@type": "Thing", "name": "Business Scaling AI" },
              { "@type": "Thing", "name": "Upscale AI" },
              { "@type": "Thing", "name": "AI Automation" },
              { "@type": "Thing", "name": "Social Media AI" },
              { "@type": "Thing", "name": "AI Content Creation" },
              { "@type": "Thing", "name": "AI Lead Generation" },
              { "@type": "Thing", "name": "AI Sales Automation" },
              { "@type": "Thing", "name": "AI Analytics" },
              { "@type": "Thing", "name": "AI Workflow Automation" },
              { "@type": "Thing", "name": "Marketing Automation Platform" },
              { "@type": "Thing", "name": "AI for Small Business" },
              { "@type": "Thing", "name": "AI for Entrepreneurs" },
              { "@type": "Thing", "name": "AI for Agencies" },
              { "@type": "Thing", "name": "AI for Creators" },
              { "@type": "Thing", "name": "Revenue Optimization AI" },
              { "@type": "Thing", "name": "AI Customer Engagement" },
              { "@type": "Thing", "name": "AI Outreach Tool" },
              { "@type": "Thing", "name": "Smart Marketing Tool" },
              { "@type": "Thing", "name": "Digital Marketing AI" },
              { "@type": "Thing", "name": "AI Chatbot" },
              { "@type": "Thing", "name": "AI Copilot" },
              { "@type": "Thing", "name": "AI Virtual Assistant" },
              { "@type": "Thing", "name": "AI Dashboard" },
              { "@type": "Thing", "name": "AI Reporting" },
              { "@type": "Thing", "name": "AI Pipeline Management" },
              { "@type": "Thing", "name": "AI Deal Tracking" },
              { "@type": "Thing", "name": "AI Email Marketing" },
              { "@type": "Thing", "name": "AI DM Automation" },
              { "@type": "Thing", "name": "AI Instagram Tool" },
              { "@type": "Thing", "name": "AI TikTok Tool" },
              { "@type": "Thing", "name": "AI Video Generator" },
              { "@type": "Thing", "name": "AI Voice Generator" },
              { "@type": "Thing", "name": "AI Script Builder" },
              { "@type": "Thing", "name": "AI Ad Optimizer" },
              { "@type": "Thing", "name": "AI Competitor Analysis" },
              { "@type": "Thing", "name": "AI Hashtag Research" },
              { "@type": "Thing", "name": "AI Trend Analysis" },
              { "@type": "Thing", "name": "AI Scheduling Tool" },
              { "@type": "Thing", "name": "AI Team Management" },
              { "@type": "Thing", "name": "AI Project Management" },
              { "@type": "Thing", "name": "AI Invoicing" },
              { "@type": "Thing", "name": "AI Billing" },
              { "@type": "Thing", "name": "SaaS AI Tool" },
              { "@type": "Thing", "name": "Cloud AI Platform" },
              { "@type": "Thing", "name": "Best AI Tool 2026" },
              { "@type": "Thing", "name": "Top AI Platform 2026" },
              { "@type": "Thing", "name": "AI for Freelancers" },
              { "@type": "Thing", "name": "AI for Solopreneurs" },
              { "@type": "Thing", "name": "AI Side Hustle Tool" },
              { "@type": "Thing", "name": "AI Monetization Platform" },
              { "@type": "Thing", "name": "AI Fan Management" },
              { "@type": "Thing", "name": "Creator Economy AI" },
              { "@type": "Thing", "name": "Influencer Marketing AI" }
            ]
          }}
        />
        <Hero />
        <ComparisonSection />
        <Services />
        <Footer />
      </div>
    </div>
  );
};

export default Index;

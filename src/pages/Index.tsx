import Hero from "@/components/Hero";
import ComparisonSection from "@/components/ComparisonSection";
import AutopilotShowcase from "@/components/AutopilotShowcase";
import WorkflowSection from "@/components/WorkflowSection";
import Services from "@/components/Services";
import ReviewsSection from "@/components/ReviewsSection";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import { useEffect, useRef, useCallback } from "react";

// Pre-compute static gradient color strings to avoid per-frame allocations
const nodes = [
  { x: 0.12, y: 0.05, r: 500, cs: ["rgba(124,58,237,0.14)", "rgba(124,58,237,0.04)", "rgba(124,58,237,0)"], speed: 0.0002, phase: 0 },
  { x: 0.85, y: 0.25, r: 450, cs: ["rgba(37,99,235,0.14)", "rgba(37,99,235,0.04)", "rgba(37,99,235,0)"], speed: 0.00018, phase: 2 },
  { x: 0.5, y: 0.15, r: 550, cs: ["rgba(79,70,229,0.14)", "rgba(79,70,229,0.04)", "rgba(79,70,229,0)"], speed: 0.00015, phase: 4 },
  { x: 0.2, y: 0.4, r: 400, cs: ["rgba(139,92,246,0.14)", "rgba(139,92,246,0.04)", "rgba(139,92,246,0)"], speed: 0.00025, phase: 1 },
  { x: 0.9, y: 0.55, r: 380, cs: ["rgba(59,130,246,0.14)", "rgba(59,130,246,0.04)", "rgba(59,130,246,0)"], speed: 0.0002, phase: 3 },
  { x: 0.6, y: 0.7, r: 350, cs: ["rgba(168,85,247,0.14)", "rgba(168,85,247,0.04)", "rgba(168,85,247,0)"], speed: 0.00022, phase: 5 },
  { x: 0.3, y: 0.85, r: 420, cs: ["rgba(99,102,241,0.14)", "rgba(99,102,241,0.04)", "rgba(99,102,241,0)"], speed: 0.00016, phase: 1.5 },
  { x: 0.75, y: 0.9, r: 380, cs: ["rgba(124,58,237,0.14)", "rgba(124,58,237,0.04)", "rgba(124,58,237,0)"], speed: 0.00019, phase: 3.5 },
] as const;

// Pre-compute particle seed values
const PARTICLE_COUNT = 50;
const particleSeeds = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  xMul: 0.0005 * (i + 1),
  xOff: i * 1.7,
  yMul: 0.0004 * (i + 1),
  yOff: i * 2.3,
  sOff: i,
  aOff: i * 0.5,
}));

const BG_COLOR = "hsl(222, 35%, 8%)";
const PARTICLE_BASE = "rgba(196,181,253,";

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const content = contentRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(parent.clientWidth, 1);
    const contentHeight = content
      ? content.getBoundingClientRect().height
      : parent.getBoundingClientRect().height;
    const h = Math.max(Math.ceil(contentHeight), window.innerHeight);

    if (sizeRef.current.w === w && sizeRef.current.h === h && sizeRef.current.dpr === dpr) return;

    sizeRef.current = { w, h, dpr };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let lastDrawTime = 0;
    const FRAME_INTERVAL = 1000 / 60; // 60fps for smooth rendering

    syncSize();

    const resizeObserver = new ResizeObserver(syncSize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    window.addEventListener("resize", syncSize);

    // Pause when tab is hidden
    let isTabVisible = true;
    const handleVisibility = () => { isTabVisible = !document.hidden; };
    document.addEventListener("visibilitychange", handleVisibility);

    const draw = (now: number) => {
      animationId = requestAnimationFrame(draw);

      // Skip if tab hidden or too soon (30fps throttle)
      if (!isTabVisible) return;
      if (now - lastDrawTime < FRAME_INTERVAL) return;
      lastDrawTime = now;

      time++;
      const { w, h, dpr } = sizeRef.current;
      if (w === 0 || h === 0) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      // Gradient blobs — pre-computed color strings
      for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        const t = time * node.speed + node.phase;
        const nx = (node.x + Math.sin(t) * 0.06) * w;
        const ny = (node.y + Math.cos(t * 0.7) * 0.04) * h;
        const pulse = node.r * (1 + Math.sin(t * 1.5) * 0.12);
        const gradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, pulse);
        gradient.addColorStop(0, node.cs[0]);
        gradient.addColorStop(0.5, node.cs[1]);
        gradient.addColorStop(1, node.cs[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // Particles — batch into single path, pre-computed seeds
      ctx.beginPath();
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const s = particleSeeds[i];
        const px = ((Math.sin(time * s.xMul + s.xOff) + 1) * 0.5) * w;
        const py = ((Math.cos(time * s.yMul + s.yOff) + 1) * 0.5) * h;
        const size = 1 + Math.sin(time * 0.002 + s.sOff) * 0.5;
        // For batched path we use a uniform alpha — saves per-particle fillStyle changes
        ctx.moveTo(px + size, py);
        ctx.arc(px, py, size, 0, Math.PI * 2);
      }
      ctx.fillStyle = PARTICLE_BASE + "0.14)";
      ctx.fill();
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncSize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncSize]);

  return (
    <div className="dark relative min-h-screen overflow-x-clip" style={{ background: BG_COLOR }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10" ref={contentRef}>
        <PageSEO
          title="Uplyze - All-in-One Growth AI for Creators, Agencies & Businesses"
          description="Automate marketing, close more deals, and scale revenue with one AI platform. Trusted by 700+ creators, agencies, and businesses to replace 10+ tools."
          ogTitle="Uplyze - AI Platform for Marketing & Business Growth"
          ogDescription="Automate marketing, manage customers, and scale revenue with Uplyze. AI CRM, content creation, social media automation, DM outreach, and analytics in one platform."
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Uplyze - AI Platform, AI Tool, AI CRM & All-in-One AI Suite",
            description:
              "Uplyze is the best AI platform, AI tool, and all-in-one AI suite for creators, agencies, entrepreneurs, and businesses.",
            url: "https://uplyze.ai",
            isPartOf: { "@type": "WebSite", name: "Uplyze", url: "https://uplyze.ai" },
            mainEntity: {
              "@type": "SoftwareApplication",
              name: "Uplyze",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: { "@type": "AggregateOffer", lowPrice: "0", highPrice: "499.99", priceCurrency: "USD" },
            },
          }}
        />
        <Hero />
        <ComparisonSection />
        <AutopilotShowcase />
        <WorkflowSection />
        <Services />
        <ReviewsSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;

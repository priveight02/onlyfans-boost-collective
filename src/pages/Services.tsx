import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import PageSEO from "@/components/PageSEO";
import { Users, HeartHandshake, Shield, Zap, Bot, BarChart3, BrainCircuit, Workflow, Mail, Globe, CheckCircle2, Instagram, MessageCircle, Rocket, Eye, Send } from "lucide-react";

const featureSections = [
  {
    title: "AI Instagram Auto-Responder",
    subtitle: "Never miss a DM. Convert followers into customers on autopilot.",
    icon: Instagram,
    highlight: "24/7 intelligent engagement",
    gradient: "from-orange-500/20 to-pink-500/20",
    accentColor: "text-orange-400",
    borderColor: "hover:border-orange-500/40",
    description: "Our AI-powered Instagram responder engages your audience around the clock with human-like conversations. It analyzes fan profiles, adapts its tone naturally, and follows a proven multi-phase engagement flow that builds rapport before guiding followers toward your products, services, or offers.",
    bullets: [
      "Human-like conversation engine with natural typing delays",
      "Automated fan profile scanning for personalized interactions",
      "Multi-phase engagement flow from casual to conversion",
      "Smart media handling with image analysis and reactions",
      "Real-time pipeline visibility with live status tracking"
    ]
  },
  {
    title: "AI-Powered Platform",
    subtitle: "Close deals faster with intelligent relationship management",
    icon: BrainCircuit,
    highlight: "3x faster deal closing",
    gradient: "from-purple-500/20 to-indigo-500/20",
    accentColor: "text-purple-400",
    borderColor: "hover:border-purple-500/40",
    description: "Our Platform goes beyond contact management. Powered by advanced AI, it scores every lead in real time, predicts deal outcomes, and recommends your next best action. From first touch to closed deal, every interaction is tracked, analyzed, and optimized automatically.",
    bullets: [
      "AI lead scoring with 0 to 100 intent analysis",
      "Smart pipeline automation with deal stage predictions",
      "Full contact history with interaction timelines",
      "Custom deal stages, tags, and priority levels",
      "Automatic data enrichment from public sources"
    ]
  },
  {
    title: "Workflow Automation Engine",
    subtitle: "Eliminate repetitive tasks and scale your operations",
    icon: Workflow,
    highlight: "Save 20+ hours per week",
    gradient: "from-blue-500/20 to-cyan-500/20",
    accentColor: "text-blue-400",
    borderColor: "hover:border-blue-500/40",
    description: "Build powerful no-code automations that trigger smart sequences based on customer actions, time delays, or custom conditions. From onboarding flows to follow-up campaigns, automate the busywork so your team can focus on strategy and growth.",
    bullets: [
      "Visual drag and drop workflow builder",
      "Event-based triggers (signups, purchases, inactivity)",
      "Conditional logic with branching paths",
      "Scheduled automations and recurring tasks",
      "Anomaly detection and smart strategy alerts"
    ]
  },
  {
    title: "Social Media Command Center",
    subtitle: "Manage 14+ platforms from one powerful dashboard",
    icon: Globe,
    highlight: "360° social strategy",
    gradient: "from-pink-500/20 to-rose-500/20",
    accentColor: "text-pink-400",
    borderColor: "hover:border-pink-500/40",
    description: "Take full control of your social presence across Instagram, TikTok, X, LinkedIn, YouTube, Reddit, Telegram, and more. Our AI analyzes competitors, researches trending hashtags, predicts viral potential, and auto-schedules content for maximum reach and engagement.",
    bullets: [
      "14-platform management (IG, TikTok, X, LinkedIn, YouTube, Reddit, and more)",
      "Competitor analysis with engagement rate benchmarking",
      "Hashtag research and viral content prediction engine",
      "AI auto-scheduler with optimal posting times",
      "Content calendar with cross-platform strategy planner"
    ]
  },
  {
    title: "Multi-Channel Outreach",
    subtitle: "Engage your audience wherever they are",
    icon: Mail,
    highlight: "5x engagement rate",
    gradient: "from-emerald-500/20 to-teal-500/20",
    accentColor: "text-emerald-400",
    borderColor: "hover:border-emerald-500/40",
    description: "Reach leads and customers across email, social media, SMS, and messaging platforms from a single unified inbox. Every conversation is centralized, searchable, and connected to the customer profile for full context. Bulk outreach with personalization at scale.",
    bullets: [
      "Unified inbox for all channels (email, DM, SMS, chat)",
      "AI-suggested replies based on conversation context",
      "Bulk messaging hub with up to 100K contacts",
      "Automated follow-up sequences per channel",
      "Read receipts, open tracking, and engagement metrics"
    ]
  },
  {
    title: "AI Content Generation",
    subtitle: "Create professional content at scale in seconds",
    icon: Bot,
    highlight: "10x content output",
    gradient: "from-violet-500/20 to-purple-500/20",
    accentColor: "text-violet-400",
    borderColor: "hover:border-violet-500/40",
    description: "Generate marketing copy, email campaigns, social media posts, scripts, proposals, and business documents powered by cutting-edge AI models. Maintain brand voice consistency across all content with customizable persona profiles and tone settings.",
    bullets: [
      "AI copywriting for emails, ads, and social posts",
      "Script builder with step-by-step conversation flows",
      "Brand voice and persona consistency engine",
      "Multi-language content generation",
      "Template library with proven high-converting formats"
    ]
  },
  {
    title: "Revenue Analytics and Forecasting",
    subtitle: "Make data-driven decisions with real-time intelligence",
    icon: BarChart3,
    highlight: "Data-driven growth",
    gradient: "from-cyan-500/20 to-blue-500/20",
    accentColor: "text-cyan-400",
    borderColor: "hover:border-cyan-500/40",
    description: "Real-time dashboards give you complete visibility into revenue streams, team performance, and customer behavior. Forecast future revenue with AI-powered predictions, identify trends before your competitors, and allocate resources where they matter most.",
    bullets: [
      "Real-time revenue dashboards and KPI tracking",
      "AI-powered revenue forecasting and trend analysis",
      "Team performance heatmaps and productivity scores",
      "Customer lifetime value predictions",
      "Exportable reports in CSV, JSON, and PDF formats"
    ]
  },
  {
    title: "Customer Engagement Hub",
    subtitle: "Build lasting relationships that drive repeat business",
    icon: HeartHandshake,
    highlight: "85% retention increase",
    gradient: "from-rose-500/20 to-pink-500/20",
    accentColor: "text-rose-400",
    borderColor: "hover:border-rose-500/40",
    description: "Turn one-time buyers into lifelong customers with AI-driven engagement strategies. Automatically segment your audience, deliver personalized messaging at the perfect moment, and monitor satisfaction scores to catch churn risks before they escalate.",
    bullets: [
      "Behavioral segmentation and audience profiling",
      "Personalized messaging with dynamic content",
      "Churn risk detection and recovery automations",
      "Customer satisfaction and sentiment tracking",
      "Loyalty program and reward system integrations"
    ]
  },
  {
    title: "Team Performance and Collaboration",
    subtitle: "Full visibility into your team's output and impact",
    icon: Users,
    highlight: "Full team visibility",
    gradient: "from-amber-500/20 to-orange-500/20",
    accentColor: "text-amber-400",
    borderColor: "hover:border-amber-500/40",
    description: "Track individual and team KPIs, manage tasks with priority workflows, and collaborate in real-time with built-in chat, file sharing, and contract management. Every team member knows exactly what to do, when to do it, and how they are performing.",
    bullets: [
      "Individual KPI dashboards and performance scores",
      "Task management with priority and deadline tracking",
      "Built-in team chat and internal communication",
      "Contract creation, signing, and management",
      "Role-based access control and permission management"
    ]
  },
  {
    title: "Security, Compliance, and Data Protection",
    subtitle: "Enterprise-grade security your clients can trust",
    icon: Shield,
    highlight: "Enterprise-grade protection",
    gradient: "from-slate-500/20 to-zinc-500/20",
    accentColor: "text-slate-300",
    borderColor: "hover:border-slate-500/40",
    description: "Protect your business and your customers' data with bank-level encryption, role-based access controls, comprehensive audit trails, and full GDPR/CCPA compliance. Every action is logged, every access is controlled, and every record is encrypted.",
    bullets: [
      "End-to-end encryption for all stored data",
      "Role-based access with granular permissions",
      "Full audit trail and login activity monitoring",
      "GDPR and CCPA compliance built in",
      "Two-factor authentication and device session management"
    ]
  }
];

const Services = () => {
  const { user } = useAuth();
  const ctaPath = user ? '/pricing' : '/auth';

  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)] relative overflow-hidden">
      <PageSEO
        title="Uplyze Features | AI CRM, Automation & Social Media Tools | uplyze.ai"
        description="Explore Uplyze features — AI CRM, workflow automation, social media management, revenue analytics, and more. See why 500+ creators choose Uplyze at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Uplyze Platform Features",
          "url": "https://uplyze.ai/services",
          "numberOfItems": featureSections.length,
          "itemListElement": featureSections.map((s, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": s.title,
            "description": s.description
          }))
        }}
      />
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-pink-600/6 rounded-full blur-[100px]" />

      {/* Hero */}
      <div className="relative pt-28 md:pt-36 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
            <Rocket className="h-3.5 w-3.5" />
            AI-Powered Business Growth Platform
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-5 leading-tight">
            Everything You Need to{" "}<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Scale with Uplyze</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8">
            One platform to manage customers, automate workflows, dominate social media, and grow your revenue with the power of AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={ctaPath}>
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/20 text-lg px-10 py-6 rounded-xl font-semibold">
                Get Started
              </Button>
            </Link>
            <Link to="/faq">
              <Button variant="outline" size="lg" className="border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-lg px-10 py-6 rounded-xl font-semibold bg-transparent">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <section className="pb-12 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-5">
          {featureSections.map((section, index) => {
            const isReversed = index % 2 !== 0;
            return (
              <div
                key={section.title}
                className={`group bg-[hsl(222,30%,12%)]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 md:p-8 ${section.borderColor} transition-all duration-500 hover:bg-[hsl(222,30%,14%)]/80`}
              >
                <div className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} gap-6 md:gap-10 items-start`}>
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 bg-gradient-to-br ${section.gradient} rounded-xl flex items-center justify-center shrink-0 border border-white/10`}>
                        <section.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white leading-tight">{section.title}</h3>
                        <p className="text-white/40 text-sm">{section.subtitle}</p>
                      </div>
                    </div>
                    <div className={`flex items-center ${section.accentColor} font-semibold text-xs uppercase tracking-wider mb-3`}>
                      <Zap className="h-3 w-3 mr-1.5" />
                      {section.highlight}
                    </div>
                    <p className="text-white/55 text-sm leading-relaxed">
                      {section.description}
                    </p>
                  </div>

                  {/* Right: Bullet points */}
                  <div className="flex-1 min-w-0">
                    <ul className="space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5 text-white/70 text-sm group-hover:text-white/80 transition-colors duration-300">
                          <CheckCircle2 className={`h-4 w-4 ${section.accentColor} mt-0.5 shrink-0 opacity-70`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5">
            Ready to Scale with Uplyze?
          </h2>
          <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
            Join 500+ creators and agencies already growing with Uplyze AI CRM at uplyze.ai. Free to start, no credit card required.
          </p>
          <Link to={ctaPath}>
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white hover:scale-105 transition-all duration-300 shadow-xl shadow-purple-500/20 text-xl px-16 py-6 rounded-xl font-bold">
              Start Growing Today
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone, Target, Shield, Zap, Crown, Bot, BarChart3, BrainCircuit, Workflow, Mail, Globe, Sparkles, LineChart, Bell, FileText, Palette, Search, Layers, Lock, CheckCircle2 } from "lucide-react";

const featureSections = [
  {
    title: "AI-Powered CRM",
    subtitle: "Close deals faster with intelligent relationship management",
    icon: BrainCircuit,
    highlight: "3x faster deal closing",
    description: "Our CRM goes beyond contact management. Powered by advanced AI, it scores every lead in real time, predicts deal outcomes, and recommends your next best action. From first touch to closed deal, every interaction is tracked, analyzed, and optimized automatically.",
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
    title: "Multi-Channel Outreach",
    subtitle: "Engage your audience wherever they are",
    icon: Mail,
    highlight: "5x engagement rate",
    description: "Reach leads and customers across email, social media, SMS, and messaging platforms from a single unified inbox. No more switching between apps. Every conversation is centralized, searchable, and connected to the customer profile for full context.",
    bullets: [
      "Unified inbox for all channels (email, DM, SMS, chat)",
      "AI-suggested replies based on conversation context",
      "Bulk messaging with personalization tokens",
      "Automated follow-up sequences per channel",
      "Read receipts, open tracking, and engagement metrics"
    ]
  },
  {
    title: "AI Content Generation",
    subtitle: "Create professional content at scale in seconds",
    icon: Bot,
    highlight: "10x content output",
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
    title: "Social Media Intelligence",
    subtitle: "Dominate every platform with AI-powered strategy",
    icon: Globe,
    highlight: "360° social strategy",
    description: "Manage all your social accounts from one command center. Our AI analyzes competitors, researches trending hashtags, predicts viral potential, and auto-schedules content for maximum reach. From Instagram to LinkedIn, every post is optimized for engagement.",
    bullets: [
      "Multi-platform management (IG, TikTok, X, LinkedIn, YouTube)",
      "Competitor analysis with engagement benchmarking",
      "Hashtag research and viral content prediction",
      "AI auto-scheduler with optimal posting times",
      "Comment monitoring with smart reply suggestions"
    ]
  },
  {
    title: "Team Performance and Collaboration",
    subtitle: "Full visibility into your team's output and impact",
    icon: Users,
    highlight: "Full team visibility",
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-primary to-blue-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(168,85,247,0.4),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.2),transparent_60%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />

      {/* Hero */}
      <div className="relative pt-24 md:pt-28 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 animate-fade-in">
            Everything You Need to Grow
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-6 animate-fade-in">
            One platform to manage customers, automate workflows, generate content, and scale your business with the power of AI.
          </p>
          <Link to={ctaPath}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-lg text-lg px-10 py-5 rounded-full font-bold">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative py-2">
        <div className="max-w-3xl mx-auto px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      </div>

      {/* Feature Sections */}
      <section className="pb-8 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 mt-8">
          {featureSections.map((section, index) => {
            const isReversed = index % 2 !== 0;
            return (
              <div
                key={section.title}
                className="bg-white/[0.07] backdrop-blur-sm border border-white/15 rounded-2xl p-6 md:p-8 hover:border-white/30 transition-all duration-300"
              >
                <div className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} gap-6 md:gap-10 items-start`}>
                  {/* Left: Icon + Title + Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <section.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white leading-tight">{section.title}</h3>
                        <p className="text-white/60 text-sm">{section.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-purple-300 font-semibold text-sm mb-3">
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      {section.highlight}
                    </div>
                    <p className="text-white/75 text-sm leading-relaxed">
                      {section.description}
                    </p>
                  </div>

                  {/* Right: Bullet points */}
                  <div className="flex-1 min-w-0">
                    <ul className="space-y-2.5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5 text-white/80 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
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
      <section className="py-16 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-white/80 mb-10 animate-fade-in">
            Join thousands of businesses already scaling with our AI-powered platform.
          </p>
          <Link to={ctaPath}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-white/20 text-xl px-16 py-6 rounded-2xl font-bold">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;

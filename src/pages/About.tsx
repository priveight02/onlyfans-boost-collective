import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, Users, BarChart3, Bot, Globe, Sparkles } from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import PageSEO from "@/components/PageSEO";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Conversations",
    description: "Our AI learns your voice and handles fan conversations at scale — authentically, 24/7, with zero burnout.",
  },
  {
    icon: BarChart3,
    title: "Revenue Intelligence",
    description: "Track PPV conversions, tip patterns, subscription churn, and lifetime fan value in real-time dashboards.",
  },
  {
    icon: Users,
    title: "Fan Psychology Engine",
    description: "Understand every fan's emotional state, spending motivation, and churn risk with AI behavioral profiling.",
  },
  {
    icon: Globe,
    title: "Multi-Platform Unified",
    description: "Instagram, OnlyFans, TikTok, Twitter — one dashboard, one source of truth for your entire business.",
  },
  {
    icon: Shield,
    title: "Agency-Grade Security",
    description: "Role-based permissions, audit trails, and encrypted credentials. Built for teams managing sensitive accounts.",
  },
  {
    icon: Zap,
    title: "Automation at Scale",
    description: "Keyword triggers, scheduled content, smart escalation, and automated upsells — all running while you sleep.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      <PageSEO
        title="About Uplyze | AI CRM for Creators & Agencies | uplyze.ai"
        description="Learn about Uplyze — the #1 AI-powered CRM built for creators and agencies. Trusted by 500+ professionals to automate growth and 10x revenue at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About Uplyze",
          "description": "Uplyze is the #1 AI CRM for creators and agencies, helping 500+ professionals automate growth and scale revenue.",
          "url": "https://uplyze.ai/about",
          "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" }
        }}
      />
      {/* Hero */}
      <div className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/[0.06] rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 text-xs font-medium uppercase tracking-widest mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            About Uplyze
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            The AI CRM Built for
            <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Creators & Agencies</span>
          </h1>
          <p className="text-[hsl(215,25%,70%)] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Uplyze is the intelligent platform that helps creators automate growth, manage fan relationships with AI, and scale revenue — without scaling headcount.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/80 font-medium hover:bg-white/[0.1] hover:text-white transition-all duration-300">
              View Features
            </Link>
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Why We Built Uplyze</h2>
            <p className="text-[hsl(215,25%,70%)] leading-relaxed mb-4">
              The creator economy generates over $100 billion annually, yet creators and their agencies still rely on spreadsheets, scattered DMs, and gut instinct to manage their business.
            </p>
            <p className="text-[hsl(215,25%,70%)] leading-relaxed mb-4">
              Traditional CRMs like HubSpot and Salesforce were built for enterprise sales teams — not for creators managing thousands of fan relationships across multiple platforms.
            </p>
            <p className="text-[hsl(215,25%,70%)] leading-relaxed">
              We built Uplyze to close that gap. An AI-native platform designed from the ground up for how creators and agencies actually work.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-6">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">500+</span>
              <span className="text-white/50 text-sm">Creators & agencies trust Uplyze</span>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">10x</span>
              <span className="text-white/50 text-sm">Average revenue increase in 6 months</span>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">24/7</span>
              <span className="text-white/50 text-sm">AI handles conversations while you sleep</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">What Uplyze Does</h2>
          <p className="text-[hsl(215,25%,65%)] text-lg max-w-xl mx-auto">
            Everything you need to manage, grow, and monetize your creator business — powered by AI.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div key={feature.title} className="group p-6 rounded-2xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-[hsl(215,25%,65%)] text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="p-10 sm:p-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-purple-500/[0.03] pointer-events-none" />
          <div className="relative">
            <Sparkles className="h-7 w-7 text-primary/60 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Transform Your Business?</h2>
            <p className="text-[hsl(215,25%,65%)] text-base mb-8 max-w-md mx-auto">
              Join 500+ creators and agencies already scaling with Uplyze. Free to start, no credit card required.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;

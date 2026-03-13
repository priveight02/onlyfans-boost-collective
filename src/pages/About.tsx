import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, Users, BarChart3, Bot, Globe, Sparkles } from "lucide-react";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";
import AnimatedBackground from "@/components/AnimatedBackground";

const features = [
  { icon: Bot, title: "AI-Powered Conversations", description: "Our AI learns your voice and handles fan conversations at scale — authentically, 24/7, with zero burnout." },
  { icon: BarChart3, title: "Revenue Intelligence", description: "Track PPV conversions, tip patterns, subscription churn, and lifetime fan value in real-time dashboards." },
  { icon: Users, title: "Fan Psychology Engine", description: "Understand every fan's emotional state, spending motivation, and churn risk with AI behavioral profiling." },
  { icon: Globe, title: "Multi-Platform Unified", description: "Instagram, OnlyFans, TikTok, Twitter — one dashboard, one source of truth for your entire business." },
  { icon: Shield, title: "Agency-Grade Security", description: "Role-based permissions, audit trails, and encrypted credentials. Built for teams managing sensitive accounts." },
  { icon: Zap, title: "Automation at Scale", description: "Keyword triggers, scheduled content, smart escalation, and automated upsells — all running while you sleep." },
];

const About = () => {
  return (
    <AnimatedBackground variant="about">
      <PageSEO
        title="About Uplyze - The AI Platform Behind 700+ Growing Businesses"
        description="See how creators, agencies, and businesses use Uplyze to automate growth, manage fans, and scale revenue without hiring more people."
        ogTitle="About Uplyze - AI-Powered Growth for Creators"
        ogDescription="Discover why 700+ creators and agencies trust Uplyze to automate engagement, manage fans with AI, and scale revenue."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About Uplyze",
          "description": "Uplyze is the best AI Platform for creators, agencies, entrepreneurs, and businesses.",
          "url": "https://uplyze.ai/about",
          "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" },
        }}
      />

      {/* Hero */}
      <div className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white/50 text-xs font-medium uppercase tracking-widest mb-6" style={{ background: "hsla(0, 0%, 100%, 0.05)", border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(210, 90%, 50%)" }} />
            About Uplyze
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.15] mb-6">
            The AI Platform Built for
            <span className="block pb-2" style={{ background: "linear-gradient(90deg, hsl(210, 90%, 50%), hsl(200, 90%, 60%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Creators & Agencies</span>
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: "hsl(215, 25%, 70%)" }}>
            Uplyze is the intelligent platform that helps creators automate growth, manage fan relationships with AI, and scale revenue without scaling headcount.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold transition-all duration-300" style={{ background: "hsl(210, 90%, 43%)" }}>
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white/80 font-medium transition-all duration-300" style={{ background: "hsla(0, 0%, 100%, 0.06)", border: "1px solid hsla(0, 0%, 100%, 0.1)" }}>
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
            <p className="leading-relaxed mb-4" style={{ color: "hsl(215, 25%, 70%)" }}>
              The creator economy generates over $100 billion annually, yet creators and their agencies still rely on spreadsheets, scattered DMs, and gut instinct to manage their business.
            </p>
            <p className="leading-relaxed mb-4" style={{ color: "hsl(215, 25%, 70%)" }}>
              Traditional CRMs like HubSpot and Salesforce were built for enterprise sales teams — not for creators managing thousands of fan relationships across multiple platforms.
            </p>
            <p className="leading-relaxed" style={{ color: "hsl(215, 25%, 70%)" }}>
              We built Uplyze to close that gap. An AI-native platform designed from the ground up for how creators and agencies actually work.
            </p>
          </div>
          <div className="p-8 rounded-2xl space-y-6" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.07)" }}>
            {[
              { val: "700+", label: "Creators & agencies trust Uplyze" },
              { val: "10x", label: "Average revenue increase in 6 months" },
              { val: "24/7", label: "AI handles conversations while you sleep" },
            ].map((stat) => (
              <div key={stat.val}>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold" style={{ background: "linear-gradient(90deg, hsl(210, 90%, 50%), hsl(200, 90%, 60%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{stat.val}</span>
                  <span className="text-white/50 text-sm">{stat.label}</span>
                </div>
                <div className="h-px mt-4" style={{ background: "hsla(0, 0%, 100%, 0.06)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">What Uplyze Does</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "hsl(215, 25%, 65%)" }}>
            Everything you need to manage, grow, and monetize your creator business — powered by AI.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div key={feature.title} className="group p-6 rounded-2xl transition-all duration-300" style={{ background: "hsla(0, 0%, 100%, 0.025)", border: "1px solid hsla(0, 0%, 100%, 0.07)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsla(210, 90%, 50%, 0.1)", border: "1px solid hsla(210, 90%, 50%, 0.2)" }}>
                <feature.icon className="h-5 w-5" style={{ color: "hsl(210, 90%, 50%)" }} />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(215, 25%, 65%)" }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="p-10 sm:p-14 rounded-2xl text-center relative overflow-hidden" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
          <div className="relative">
            <Sparkles className="h-7 w-7 mx-auto mb-4" style={{ color: "hsla(210, 90%, 50%, 0.6)" }} />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Transform Your Business?</h2>
            <p className="text-base mb-8 max-w-md mx-auto" style={{ color: "hsl(215, 25%, 65%)" }}>
              Join 700+ creators and agencies already scaling with Uplyze. Free to start, no credit card required.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold transition-all duration-300" style={{ background: "hsl(210, 90%, 43%)" }}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </AnimatedBackground>
  );
};

export default About;

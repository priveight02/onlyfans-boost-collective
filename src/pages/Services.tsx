import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone, Target, Shield, Zap, Crown, Bot, BarChart3, BrainCircuit, Workflow, Mail, Globe } from "lucide-react";

const services = [
  {
    title: "AI-Powered CRM",
    description: "Intelligent customer relationship management with AI lead scoring, smart pipeline automation, and predictive deal insights that help you close faster.",
    icon: BrainCircuit,
    highlight: "3x faster deal closing"
  },
  {
    title: "Workflow Automation",
    description: "Build powerful no-code automations that eliminate repetitive tasks, trigger smart sequences, and keep your team focused on what matters.",
    icon: Workflow,
    highlight: "Save 20+ hours per week"
  },
  {
    title: "Multi-Channel Outreach",
    description: "Engage leads and customers across email, social media, SMS, and messaging platforms — all managed from a single unified inbox.",
    icon: Mail,
    highlight: "5x engagement rate"
  },
  {
    title: "AI Content Generation",
    description: "Generate marketing copy, email campaigns, scripts, social posts, and business documents powered by cutting-edge AI models.",
    icon: Bot,
    highlight: "10x content output"
  },
  {
    title: "Revenue Analytics & Forecasting",
    description: "Real-time dashboards with revenue forecasting, team performance heatmaps, and actionable business intelligence to drive growth.",
    icon: BarChart3,
    highlight: "Data-driven decisions"
  },
  {
    title: "Customer Engagement Hub",
    description: "Build lasting relationships with AI-driven engagement strategies, personalized messaging, and smart follow-up sequences.",
    icon: HeartHandshake,
    highlight: "85% retention increase"
  },
  {
    title: "Team Performance & Collaboration",
    description: "Track team KPIs, manage tasks, share insights, and collaborate in real-time with built-in chat, contracts, and workflow tools.",
    icon: Users,
    highlight: "Full team visibility"
  },
  {
    title: "Security & Compliance",
    description: "Enterprise-grade security with role-based access, audit trails, GDPR compliance, and encrypted data protection for your business.",
    icon: Shield,
    highlight: "Enterprise-grade security"
  },
  {
    title: "Social Media Intelligence",
    description: "AI-powered social media management with competitor analysis, hashtag research, viral prediction, and automated scheduling across platforms.",
    icon: Globe,
    highlight: "360° social strategy"
  }
];

const gradients = [
  "from-purple-500/30 to-blue-500/30",
  "from-blue-500/30 to-cyan-500/30",
  "from-pink-500/30 to-purple-500/30",
  "from-cyan-500/30 to-blue-500/30",
  "from-purple-500/30 to-pink-500/30",
  "from-blue-500/30 to-purple-500/30",
  "from-pink-500/30 to-cyan-500/30",
  "from-cyan-500/30 to-purple-500/30",
  "from-purple-500/30 to-cyan-500/30"
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
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl" />

      {/* Hero Section */}
      <div className="relative pt-24 md:pt-28 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-3 animate-fade-in">
            Powerful Tools, Real Results
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-4 animate-fade-in">
            Everything your business needs to automate, engage, and grow — powered by AI.
          </p>
          <Link to={ctaPath} className="mt-3 inline-block">
            <button className="group inline-flex items-center px-8 py-3 text-lg font-medium rounded-full bg-white text-primary hover:bg-primary-light transition-all duration-500 transform hover:scale-105 shadow-lg">
              Start Free Trial
            </button>
          </Link>
        </div>
      </div>

      <div className="relative py-2">
        <div className="max-w-3xl mx-auto px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      </div>

      {/* Services Grid */}
      <section className="pb-6 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-8 mt-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
              Our Platform Features
            </h2>
            <p className="text-white/80 text-base max-w-2xl mx-auto animate-fade-in">
              A comprehensive suite of AI-powered tools designed to streamline operations and maximize your business growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <div
                key={service.title}
                className={`bg-gradient-to-br ${gradients[index]} backdrop-blur-sm p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 group border border-white/20 hover:border-white/40`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-12 h-12 bg-white/25 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white/90 transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-white/70 mb-4 text-sm leading-relaxed">
                  {service.description}
                </p>
                <div className="flex items-center text-white font-semibold text-sm">
                  <Zap className="h-3 w-3 mr-2" />
                  {service.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
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

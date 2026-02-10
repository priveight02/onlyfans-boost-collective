import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone, Target, Shield, Zap, Crown } from "lucide-react";

const services = [
  {
    title: "Social Media Management",
    description: "Complete management of your Instagram, TikTok, Twitter, and other social platforms to drive massive traffic to your OnlyFans.",
    icon: Megaphone,
    highlight: "300% increase in social media traffic"
  },
  {
    title: "Traffic Generation",
    description: "Strategic campaigns across multiple platforms to bring high-quality, converting subscribers directly to your OnlyFans profile.",
    icon: Target,
    highlight: "5x subscriber conversion rate"
  },
  {
    title: "Buyer Acquisition",
    description: "Targeted marketing to attract premium subscribers who spend more and stay longer, maximizing your revenue per fan.",
    icon: DollarSign,
    highlight: "400% increase in premium subscribers"
  },
  {
    title: "OnlyFans Message Management",
    description: "Professional management of your OnlyFans DMs, fan engagement, and upselling to maximize earnings from every subscriber.",
    icon: MessageSquare,
    highlight: "200% increase in message revenue"
  },
  {
    title: "Content Strategy & Optimization",
    description: "Data-driven content strategies that keep subscribers engaged and willing to pay premium prices for your exclusive content.",
    icon: TrendingUp,
    highlight: "90% subscriber retention rate"
  },
  {
    title: "Fan Relationship Management",
    description: "Build lasting relationships with your top spenders through personalized engagement strategies and exclusive offerings.",
    icon: HeartHandshake,
    highlight: "85% fan loyalty increase"
  },
  {
    title: "Revenue Optimization",
    description: "Strategic pricing, premium offerings, and multiple revenue streams to maximize your monthly earnings potential.",
    icon: Crown,
    highlight: "Up to 500% revenue growth"
  },
  {
    title: "Brand Protection & Growth",
    description: "Protect your personal brand while scaling your business with professional management and strategic positioning.",
    icon: Shield,
    highlight: "Complete brand management"
  },
  {
    title: "24/7 Support & Analytics",
    description: "Round-the-clock support with real-time analytics and performance tracking to optimize every aspect of your business.",
    icon: Users,
    highlight: "Always available expert support"
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-primary to-blue-900 relative overflow-hidden">
      {/* Global background effects with more color variety */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(168,85,247,0.4),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.2),transparent_60%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl" />

      {/* Hero Section */}
      <div className="relative pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 animate-fade-in">
            Premium OnlyFans Management
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10 animate-fade-in">
            We handle everything so you can focus on creating. Let's grow together, babe.
          </p>
          <Link to="/onboarding">
            <button className="group inline-flex items-center px-8 py-3 text-lg font-medium rounded-full bg-white text-primary hover:bg-primary-light transition-all duration-500 transform hover:scale-105 shadow-lg">
              Start Evolving Today
            </button>
          </Link>
        </div>
      </div>

      {/* Services Grid */}
      <section className="py-6 relative">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
              Our Exclusive Services
            </h2>
            <p className="text-white/80 text-base max-w-2xl mx-auto animate-fade-in">
              Comprehensive solutions designed to elevate your content creation and maximize your earnings potential.
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
            Ready to Level Up, gorgeous? ;)
          </h2>
          <p className="text-xl text-white/80 mb-10 animate-fade-in">
            Join our crew of top creators and start earning what you truly deserve.
          </p>

          <Link to="/onboarding">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-white/20 text-xl px-16 py-6 rounded-2xl font-bold">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Services;

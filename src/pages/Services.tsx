import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone, Star, Sparkles, Target, Shield } from "lucide-react";
import BackButton from "@/components/BackButton";

const Services = () => {
  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      
      {/* Hero Section */}
      <div className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-accent to-accent">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
              <Sparkles className="h-12 w-12 text-white animate-pulse" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 animate-fade-in">
            Premium OnlyFans Management
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10 animate-fade-in">
            Transform your content creation journey with our comprehensive management services designed to maximize your success and earnings.
          </p>
          <Button size="lg" className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
            Start Growing Today
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 animate-fade-in">
              Our Exclusive Services
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto animate-fade-in">
              Comprehensive solutions designed to elevate your content creation and maximize your earnings potential.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
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
                icon: Star,
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
            ].map((service, index) => (
              <div
                key={service.title}
                className="bg-card p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 hover:scale-105 group border hover:border-primary/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg">
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {service.description}
                </p>
                <div className="flex items-center text-primary font-semibold">
                  <Star className="h-4 w-4 mr-2 fill-current" />
                  {service.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary-accent to-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
            Ready to Transform Your Success?
          </h2>
          <p className="text-xl text-white/80 mb-10 animate-fade-in">
            Join our exclusive network of top-performing creators and unlock your full earning potential.
          </p>
          
          <Link to="/onboarding">
            <Button size="lg" className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-110 transition-all duration-300 shadow-2xl hover:shadow-white/20 text-lg px-12 py-4 rounded-2xl font-bold group">
              <span className="flex items-center gap-3">
                Start Your Journey
                <div className="w-8 h-8 bg-primary group-hover:bg-white rounded-full flex items-center justify-center transition-all duration-300">
                  <Sparkles className="h-4 w-4 text-white group-hover:text-primary" />
                </div>
              </span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Services;

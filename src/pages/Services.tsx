import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";
import BackButton from "@/components/BackButton";

const Services = () => {
  return (
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 bg-gradient-to-r from-primary to-primary-accent overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 font-heading relative">
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
              Premium OnlyFans Management Services
            </span>
            <span className="invisible">Premium OnlyFans Management Services</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 animate-fade-in">
            Join the elite community of top-earning creators. Our proven strategies have helped models increase their earnings by up to 300%.
          </p>
          <Link to="/join">
            <Button size="lg" className="bg-white text-primary hover:bg-primary-light hover:text-primary animate-fade-in">
              Start Growing Today
            </Button>
          </Link>
        </div>
      </div>

      {/* Services Grid */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary font-heading mb-4">
              Premium OnlyFans Management Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We provide comprehensive solutions designed to maximize your earnings and grow your OnlyFans presence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Professional Content Creation",
                description: "High-quality photo and video production that keeps subscribers coming back for more. Our expert team ensures your content stands out.",
                icon: Camera,
                highlight: "Up to 200% increase in subscriber retention"
              },
              {
                title: "Brand Development",
                description: "Build a powerful personal brand that attracts and retains high-paying subscribers. Stand out in the competitive OnlyFans space.",
                icon: Users,
                highlight: "Average 150% growth in follower base"
              },
              {
                title: "Strategic Marketing",
                description: "Multi-platform marketing strategies that drive subscriber growth and engagement across all your social media channels.",
                icon: Megaphone,
                highlight: "3x average subscriber growth"
              },
              {
                title: "Revenue Optimization",
                description: "Maximize your earnings through strategic pricing, premium content, and multiple revenue streams optimization.",
                icon: DollarSign,
                highlight: "Up to 300% increase in monthly revenue"
              },
              {
                title: "Growth Analytics",
                description: "Data-driven strategies to understand your audience and optimize your content for maximum engagement and earnings.",
                icon: TrendingUp,
                highlight: "Real-time performance tracking"
              },
              {
                title: "24/7 Support",
                description: "Round-the-clock support from our dedicated team of OnlyFans management experts. We're here whenever you need us.",
                icon: HeartHandshake,
                highlight: "Always available support"
              },
              {
                title: "Fan Engagement",
                description: "Proven strategies to increase engagement, maintain loyal subscribers, and maximize your earning potential.",
                icon: MessageSquare,
                highlight: "90% subscriber retention rate"
              }
            ].map((service) => (
              <div
                key={service.title}
                className="bg-white p-8 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <service.icon className="h-6 w-6 text-primary-accent" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <p className="text-primary-accent font-semibold">{service.highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading">
            Ready to Maximize Your OnlyFans Potential?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Join our elite community of successful creators and start growing your OnlyFans income today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join">
              <Button size="lg" className="bg-white text-primary hover:bg-primary-light hover:text-primary w-full sm:w-auto">
                Apply Now
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                Schedule a Call
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
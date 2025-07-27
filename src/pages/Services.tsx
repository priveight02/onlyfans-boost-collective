import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone, Star, Sparkles } from "lucide-react";
import BackButton from "@/components/BackButton";

const Services = () => {
  return (
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgMGgxNDQwdjE4N0wxNzIuOCA0NjEuOCAwIDIyN3oiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbC1vcGFjaXR5PSIuNCIvPjwvc3ZnPg==')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl transform -translate-y-1/2" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <Sparkles className="h-16 w-16 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300 animate-fade-in">
            Premium OnlyFans Management
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 hover:text-white transition-colors duration-200 animate-fade-in">
            Transform your content creation journey with our comprehensive management services designed to maximize your success and earnings.
          </p>
          <Link to="/join">
            <Button size="lg" className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 animate-fade-in shadow-lg hover:shadow-xl">
              Start Growing Today
            </Button>
          </Link>
        </div>
      </div>
      {/* Services Grid */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4 animate-fade-in">
              Our Exclusive Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto animate-fade-in">
              Comprehensive solutions designed to elevate your content creation and maximize your earnings potential.
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
            ].map((service, index) => (
              <div
                key={service.title}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group border border-gray-100 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-accent rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-primary-accent transition-colors duration-300">{service.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{service.description}</p>
                <div className="flex items-center text-primary-accent font-semibold">
                  <Star className="h-4 w-4 mr-2" />
                  {service.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading animate-fade-in">
            Ready to Transform Your Success?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 animate-fade-in">
            Join our exclusive network of top-performing creators and unlock your full earning potential.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join">
              <Button size="lg" className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 w-full sm:w-auto shadow-lg hover:shadow-xl">
                Apply Now
              </Button>
            </Link>
            <Link to="/models">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary hover:scale-105 transition-all duration-300 w-full sm:w-auto">
                View Success Stories
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;

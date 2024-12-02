import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";
import BackButton from "@/components/BackButton";

const services = [
  {
    title: "Content Creation",
    description: "High-quality, custom photo and video shoots tailored to your brand.",
    icon: Camera,
  },
  {
    title: "Brand Development",
    description: "Build your personal brand and connect with your audience through expert guidance.",
    icon: Users,
  },
  {
    title: "Marketing Strategy",
    description: "Expert marketing strategies across multiple platforms to grow your fanbase.",
    icon: Megaphone,
  },
  {
    title: "Revenue Optimization",
    description: "Maximize your earnings through strategic pricing and multiple revenue streams.",
    icon: DollarSign,
  },
  {
    title: "Growth Analytics",
    description: "Data-driven strategies to maximize your reach and revenue potential.",
    icon: TrendingUp,
  },
  {
    title: "24/7 Support",
    description: "Dedicated team supporting your success every step of the way.",
    icon: HeartHandshake,
  },
  {
    title: "Fan Engagement",
    description: "Strategies to increase engagement and maintain loyal subscribers.",
    icon: MessageSquare,
  }
];

const Services = () => {
  return (
    <div className="min-h-screen">
      <BackButton />
      <div className="relative py-24 bg-gradient-to-r from-primary to-primary-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
            Our Services
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Comprehensive solutions designed to elevate your digital presence and maximize your success.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-6">
                  <service.icon className="h-6 w-6 text-primary-accent" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6 font-heading">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our community of successful content creators and take your career to the next level.
          </p>
          <a
            href="/join"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-accent transition-colors duration-200"
          >
            Get Started Today
          </a>
        </div>
      </section>
    </div>
  );
};

export default Services;

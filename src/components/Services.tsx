import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";

const services = [
  {
    title: "Content Creation & Photography",
    description: "High-quality, custom photo and video shoots tailored to your OnlyFans brand.",
    icon: Camera,
  },
  {
    title: "Brand Development",
    description: "Build your personal brand and connect with your audience through expert OnlyFans guidance.",
    icon: Users,
  },
  {
    title: "Marketing Strategy",
    description: "Expert marketing strategies across multiple platforms to grow your OnlyFans following.",
    icon: Megaphone,
  },
  {
    title: "Revenue Optimization",
    description: "Maximize your OnlyFans earnings through strategic pricing and multiple revenue streams.",
    icon: DollarSign,
  },
  {
    title: "Growth Analytics",
    description: "Data-driven strategies to maximize your reach and revenue potential on OnlyFans.",
    icon: TrendingUp,
  },
  {
    title: "24/7 Support",
    description: "Dedicated team supporting your OnlyFans success every step of the way.",
    icon: HeartHandshake,
  },
  {
    title: "Fan Engagement",
    description: "Proven strategies to increase engagement and maintain loyal subscribers.",
    icon: MessageSquare,
  }
];

const Services = () => {
  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary font-heading mb-4">
            Premier OnlyFans Management Services
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive solutions designed to elevate your OnlyFans presence and maximize your success in the competitive digital space.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
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
  );
};

export default Services;
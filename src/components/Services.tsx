import { Camera, Users, TrendingUp, HeartHandshake } from "lucide-react";

const services = [
  {
    title: "Content Creation",
    description: "Professional photo and video production tailored to your brand.",
    icon: Camera,
  },
  {
    title: "Brand Development",
    description: "Build your personal brand and connect with your audience.",
    icon: Users,
  },
  {
    title: "Growth Strategy",
    description: "Data-driven strategies to maximize your reach and revenue.",
    icon: TrendingUp,
  },
  {
    title: "24/7 Support",
    description: "Dedicated team supporting your success every step of the way.",
    icon: HeartHandshake,
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary font-heading mb-4">
            Our Services
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive solutions designed to elevate your digital presence and maximize your success.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <service.icon className="h-6 w-6 text-primary-accent" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
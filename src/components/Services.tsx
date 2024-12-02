import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

const services = [
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
    title: "Fan Engagement",
    description: "Proven strategies to increase engagement, maintain loyal subscribers, and maximize your earning potential.",
    icon: MessageSquare,
    highlight: "90% subscriber retention rate"
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const Services = () => {
  return (
    <section id="services" className="py-12 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-grid-primary/[0.02] bg-[size:20px_20px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6 relative">
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
              Premier OnlyFans Management Services
            </span>
            <span className="invisible">Premier OnlyFans Management Services</span>
          </h2>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive solutions designed to maximize your earnings and grow your OnlyFans presence.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={item}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <service.icon className="h-6 w-6 text-primary-accent" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">{service.title}</h3>
              <p className="text-gray-600 mb-4 text-sm">{service.description}</p>
              <p className="text-primary-accent font-semibold text-sm">{service.highlight}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
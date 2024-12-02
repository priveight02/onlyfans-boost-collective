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
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={item}
              className="bg-white p-8 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <service.icon className="h-6 w-6 text-primary-accent" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{service.title}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <p className="text-primary-accent font-semibold">{service.highlight}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
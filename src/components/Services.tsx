import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    title: "Content Creation & Photography",
    description: "Professional photo and video production that keeps subscribers coming back. Our expert team ensures your content stands out with studio-quality results.",
    icon: Camera,
    highlight: "Up to 200% increase in subscriber retention",
    color: "from-purple-400/20 to-pink-400/20"
  },
  {
    title: "Brand Development",
    description: "Build a powerful personal brand that attracts high-paying subscribers. Stand out in the competitive OnlyFans space with our proven strategies.",
    icon: Users,
    highlight: "Average 150% growth in follower base",
    color: "from-blue-400/20 to-purple-400/20"
  },
  {
    title: "Marketing Strategy",
    description: "Multi-platform marketing strategies that drive explosive subscriber growth. We handle promotion while you focus on creating amazing content.",
    icon: Megaphone,
    highlight: "3x average subscriber growth",
    color: "from-pink-400/20 to-rose-400/20"
  },
  {
    title: "Revenue Optimization",
    description: "Maximize your earnings through strategic pricing and multiple revenue streams. Our experts help you unlock your full earning potential.",
    icon: DollarSign,
    highlight: "Up to 300% increase in monthly revenue",
    color: "from-green-400/20 to-emerald-400/20"
  },
  {
    title: "Growth Analytics",
    description: "Data-driven strategies to understand your audience and optimize your content for maximum engagement and earnings.",
    icon: TrendingUp,
    highlight: "Real-time performance tracking",
    color: "from-blue-400/20 to-cyan-400/20"
  },
  {
    title: "Fan Engagement",
    description: "Proven strategies to increase engagement, maintain loyal subscribers, and maximize your earning potential on OnlyFans.",
    icon: MessageSquare,
    highlight: "90% subscriber retention rate",
    color: "from-rose-400/20 to-pink-400/20"
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
    <section id="services" className="py-8 pb-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-x-0 top-12 bottom-0 bg-grid-primary/[0.02] bg-[size:20px_20px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-[2.75rem] font-bold font-heading mb-6 relative">
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
              Premier OnlyFans Management Services
            </span>
            <span className="invisible">Premier OnlyFans Management Services</span>
          </h2>

          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive solutions designed to elevate your OnlyFans presence and maximize your success in the competitive digital space.
          </p>
        </motion.div>
        
        {/* Services Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              variants={item}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                   style={{ backgroundImage: `linear-gradient(to right, ${service.color})` }} />
              
              <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-light to-primary-accent rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="h-7 w-7 text-primary" />
                </div>
                
                <h3 className="text-xl font-bold text-primary mb-4 group-hover:text-primary-accent transition-colors duration-300">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 mb-6 line-clamp-3">
                  {service.description}
                </p>
                
                <div className="text-primary-accent font-semibold text-sm py-2 px-4 bg-primary-light/30 rounded-full inline-block">
                  {service.highlight}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;

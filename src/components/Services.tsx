import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    title: "Elite Content Production",
    description: "Studio-quality content that drives massive growth.",
    icon: Camera,
    highlight: "$50K+ monthly average",
    metric: "Models earn"
  },
  {
    title: "Personal Brand Empire",
    description: "Build an irresistible brand that attracts premium subscribers.",
    icon: Users,
    highlight: "300% growth",
    metric: "Follower increase"
  },
  {
    title: "Viral Marketing Campaigns",
    description: "Multi-platform marketing that makes you #1 trending.",
    icon: Megaphone,
    highlight: "10x acquisition",
    metric: "Subscriber rate"
  },
  {
    title: "Revenue Maximization",
    description: "Multiple 6-figure income streams through strategic pricing.",
    icon: DollarSign,
    highlight: "$100K+ monthly",
    metric: "Average revenue"
  },
  {
    title: "Elite Analytics Dashboard",
    description: "Real-time insights that optimize your OnlyFans strategy.",
    icon: TrendingUp,
    highlight: "500% ROI growth",
    metric: "Data-driven"
  },
  {
    title: "VIP Fan Management",
    description: "Professional engagement creating loyal subscribers.",
    icon: MessageSquare,
    highlight: "98% retention",
    metric: "Subscriber rate"
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
    <section id="services" className="py-24 bg-gradient-to-br from-primary via-accent to-primary relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-heading">
            Elite Model Management Services
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Join the top 1% of OnlyFans creators. Our proven system has helped models achieve 6-figure monthly earnings.
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              variants={item}
              className="relative group"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                  {service.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">
                      {service.metric}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {service.highlight}
                    </div>
                  </div>
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

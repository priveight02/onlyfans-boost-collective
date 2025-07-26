import { Camera, Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    title: "Elite Content Production",
    description: "Studio-quality photo and video content that drives massive subscriber growth. Our professional team creates viral-worthy content that converts.",
    icon: Camera,
    highlight: "Models earn $50K+ monthly average",
    color: "from-blue-400/20 to-cyan-400/20"
  },
  {
    title: "Personal Brand Empire",
    description: "Build an irresistible personal brand that attracts premium subscribers willing to pay top dollar. Become the model everyone talks about.",
    icon: Users,
    highlight: "300% follower growth in 90 days",
    color: "from-blue-500/20 to-blue-400/20"
  },
  {
    title: "Viral Marketing Campaigns",
    description: "Explosive multi-platform marketing that makes you the #1 trending creator. We handle all promotion while you focus on content creation.",
    icon: Megaphone,
    highlight: "10x subscriber acquisition rate",
    color: "from-cyan-400/20 to-blue-500/20"
  },
  {
    title: "Revenue Maximization",
    description: "Unlock multiple 6-figure income streams through strategic pricing, premium content tiers, and exclusive offerings that maximize your earnings.",
    icon: DollarSign,
    highlight: "Average $100K+ monthly revenue",
    color: "from-blue-600/20 to-blue-400/20"
  },
  {
    title: "Elite Analytics Dashboard",
    description: "Real-time data insights that optimize every aspect of your OnlyFans strategy. Track performance and scale what works best.",
    icon: TrendingUp,
    highlight: "Data-driven 500% ROI growth",
    color: "from-blue-400/20 to-cyan-500/20"
  },
  {
    title: "VIP Fan Management",
    description: "Professional fan engagement strategies that create obsessed, loyal subscribers who stay subscribed and spend more every month.",
    icon: MessageSquare,
    highlight: "98% subscriber retention rate",
    color: "from-cyan-500/20 to-blue-600/20"
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
      <div className="absolute inset-y-8 inset-x-0 bg-grid-primary/[0.02] bg-[size:20px_20px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6 relative">
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
              Elite Model Management Services
            </span>
            <span className="invisible">Elite Model Management Services</span>
          </h2>

          <p className="text-lg text-gray-600 mt-12 max-w-3xl mx-auto">
            Join the top 1% of OnlyFans creators. Our proven system has helped models achieve 6-figure monthly earnings through strategic management and optimization.
          </p>
        </motion.div>
        
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

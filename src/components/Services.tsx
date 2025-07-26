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
    <section id="services" className="py-24 bg-gradient-to-br from-primary via-primary-accent to-accent relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-heading mb-6 text-white">
            Elite Model Management Services
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Join the top 1% of creators. Our proven system delivers 6-figure monthly earnings.
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
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-all duration-300">
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  {service.title}
                </h3>
                
                <p className="text-white/80 mb-6 text-sm leading-relaxed">
                  {service.description.split('.')[0]}.
                </p>
                
                <div className="bg-white/20 text-white font-bold text-lg py-3 px-6 rounded-xl text-center border border-white/30">
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

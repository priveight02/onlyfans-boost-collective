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
    <section id="services" className="relative overflow-hidden">
      {/* Clean modern transition */}
      <div className="h-16 bg-gradient-to-b from-primary to-primary relative">
        <div className="absolute bottom-0 w-full h-px bg-white/20"></div>
      </div>

      <div className="py-16 bg-gradient-to-br from-primary via-primary-accent to-accent relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
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
              Build Your Empire With Us
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Growing together. Scaling together. Succeeding together.
            </p>
          </motion.div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                title: "Content Creation",
                description: "Professional studio content that converts",
                icon: Camera,
                highlight: "Start Growing Today",
                color: "from-blue-400/20 to-cyan-400/20"
              },
              {
                title: "Brand Building",
                description: "Build your personal brand empire",
                icon: Users,
                highlight: "Build Together",
                color: "from-blue-500/20 to-blue-400/20"
              },
              {
                title: "Marketing Strategy",
                description: "Multi-platform viral campaigns",
                icon: Megaphone,
                highlight: "Scale Together",
                color: "from-cyan-400/20 to-blue-500/20"
              },
              {
                title: "Revenue Growth",
                description: "Optimize earnings & income streams",
                icon: DollarSign,
                highlight: "Earn Together",
                color: "from-blue-600/20 to-blue-400/20"
              },
              {
                title: "Analytics & Data",
                description: "Real-time performance insights",
                icon: TrendingUp,
                highlight: "Grow Together",
                color: "from-blue-400/20 to-cyan-500/20"
              },
              {
                title: "Fan Management",
                description: "Engagement strategies that work",
                icon: MessageSquare,
                highlight: "Connect Together",
                color: "from-cyan-500/20 to-blue-600/20"
              }
            ].map((service, index) => (
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
                    {service.description}
                  </p>
                  
                  <div className="bg-white/20 text-white font-bold text-base py-3 px-6 rounded-xl text-center border border-white/30 hover:bg-white/30 transition-colors duration-300 cursor-pointer">
                    {service.highlight}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-16"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
              <HeartHandshake className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">Partner With Us</h3>
              <p className="text-white/90 mb-6">
                We're building something amazing. Join our growing community of successful creators.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="bg-white/20 text-white font-semibold py-2 px-4 rounded-lg border border-white/30">
                  Growing Agency
                </div>
                <div className="bg-white/20 text-white font-semibold py-2 px-4 rounded-lg border border-white/30">
                  Fresh Approach
                </div>
                <div className="bg-white/20 text-white font-semibold py-2 px-4 rounded-lg border border-white/30">
                  Personal Touch
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Services;

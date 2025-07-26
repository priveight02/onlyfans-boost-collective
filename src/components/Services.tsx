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
    <section id="services" className="py-12 bg-gradient-to-br from-primary via-primary-accent to-accent relative overflow-hidden min-h-screen flex items-center">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_40%)]" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/8 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-white/6 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-2/3 w-64 h-64 bg-white/10 rounded-full blur-2xl animate-pulse delay-500" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-white">
            Build Your Empire With Us
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Growing together. Scaling together. Succeeding together.
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          {[
            {
              title: "Content Creation",
              description: "Professional studio content that converts",
              icon: Camera,
              highlight: "Start Growing Today",
              gradient: "from-blue-400/30 to-cyan-400/30"
            },
            {
              title: "Brand Building",
              description: "Build your personal brand empire",
              icon: Users,
              highlight: "Build Together",
              gradient: "from-purple-400/30 to-blue-400/30"
            },
            {
              title: "Marketing Strategy",
              description: "Multi-platform viral campaigns",
              icon: Megaphone,
              highlight: "Scale Together",
              gradient: "from-cyan-400/30 to-blue-500/30"
            },
            {
              title: "Revenue Growth",
              description: "Optimize earnings & income streams",
              icon: DollarSign,
              highlight: "Earn Together",
              gradient: "from-green-400/30 to-blue-400/30"
            },
            {
              title: "Analytics & Data",
              description: "Real-time performance insights",
              icon: TrendingUp,
              highlight: "Grow Together",
              gradient: "from-orange-400/30 to-cyan-500/30"
            },
            {
              title: "Fan Management",
              description: "Engagement strategies that work",
              icon: MessageSquare,
              highlight: "Connect Together",
              gradient: "from-pink-400/30 to-blue-600/30"
            }
          ].map((service, index) => (
            <motion.div
              key={service.title}
              variants={item}
              className="relative group"
            >
              <div className={`bg-gradient-to-br ${service.gradient} backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:border-white/50 transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 shadow-lg hover:shadow-2xl hover:shadow-white/10`}>
                <div className="w-12 h-12 bg-white/25 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/35 transition-all duration-300 group-hover:scale-110">
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-3">
                  {service.title}
                </h3>
                
                <p className="text-white/85 mb-4 text-sm leading-relaxed">
                  {service.description}
                </p>
                
                <div className="bg-white/25 text-white font-semibold text-sm py-2 px-4 rounded-lg text-center border border-white/20 hover:bg-white/35 transition-all duration-300 cursor-pointer hover:scale-105">
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
          className="text-center"
        >
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/30 max-w-4xl mx-auto shadow-xl">
            <HeartHandshake className="h-10 w-10 text-white mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-3">Partner With Us</h3>
            <p className="text-white/90 mb-4 text-sm">
              We're building something amazing. Join our growing community of successful creators.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="bg-white/20 text-white font-medium py-2 px-4 rounded-lg border border-white/30 text-sm hover:bg-white/30 transition-colors duration-300">
                Growing Agency
              </div>
              <div className="bg-white/20 text-white font-medium py-2 px-4 rounded-lg border border-white/30 text-sm hover:bg-white/30 transition-colors duration-300">
                Fresh Approach
              </div>
              <div className="bg-white/20 text-white font-medium py-2 px-4 rounded-lg border border-white/30 text-sm hover:bg-white/30 transition-colors duration-300">
                Personal Touch
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;

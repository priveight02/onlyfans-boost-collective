import { Users, TrendingUp, HeartHandshake, MessageSquare, DollarSign, Megaphone, Bot, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-12 bg-gradient-to-br from-[hsl(220,90%,42%)] via-[hsl(210,95%,40%)] to-[hsl(200,90%,44%)] relative overflow-hidden min-h-screen flex items-center">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_40%)]" />
      
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
            Everything You Need to Scale
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            AI-powered tools, smart automation, and deep analytics — unified in one platform.
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
              title: "AI CRM & Pipeline",
              description: "Smart customer management with AI-driven lead scoring, pipeline automation, and predictive insights.",
              icon: Users,
              highlight: "Close 3x More Deals",
              gradient: "from-blue-400/30 to-cyan-400/30"
            },
            {
              title: "Workflow Automation",
              description: "Automate repetitive tasks, trigger smart sequences, and let AI handle your busywork.",
              icon: Bot,
              highlight: "Save 20+ Hours/Week",
              gradient: "from-purple-400/30 to-blue-400/30"
            },
            {
              title: "Multi-Channel Outreach",
              description: "Engage prospects across email, social, and messaging — all managed from one inbox.",
              icon: Megaphone,
              highlight: "5x Engagement Rate",
              gradient: "from-cyan-400/30 to-blue-500/30"
            },
            {
              title: "Revenue Analytics",
              description: "Real-time dashboards, forecasting, and performance tracking to optimize every revenue stream.",
              icon: DollarSign,
              highlight: "Data-Driven Growth",
              gradient: "from-green-400/30 to-blue-400/30"
            },
            {
              title: "AI Content & Copywriting",
              description: "Generate scripts, captions, emails, and marketing copy powered by advanced AI models.",
              icon: MessageSquare,
              highlight: "10x Content Output",
              gradient: "from-orange-400/30 to-cyan-500/30"
            },
            {
              title: "Advanced Reporting",
              description: "Custom reports, team performance heatmaps, and exportable business intelligence.",
              icon: BarChart3,
              highlight: "Full Visibility",
              gradient: "from-pink-400/30 to-blue-600/30"
            }
          ].map((service) => (
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
                
                <button 
                  onClick={() => navigate('/services')}
                  className="w-full bg-white/25 text-white font-semibold text-sm py-2 px-4 rounded-lg text-center border border-white/20 hover:bg-white/35 transition-all duration-300 cursor-pointer hover:scale-105"
                >
                  {service.highlight}
                </button>
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
            <h3 className="text-xl font-bold text-white mb-3">Built for Growing Businesses</h3>
            <p className="text-white/90 mb-4 text-sm">
              Whether you're a startup or scaling enterprise, our AI-powered platform adapts to your needs.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="bg-white/20 text-white font-medium py-2 px-4 rounded-lg border border-white/30 text-sm hover:bg-white/30 transition-colors duration-300">
                AI-First Platform
              </div>
              <div className="bg-white/20 text-white font-medium py-2 px-4 rounded-lg border border-white/30 text-sm hover:bg-white/30 transition-colors duration-300">
                No-Code Automation
              </div>
              <div className="bg-white/20 text-white font-medium py-2 px-4 rounded-lg border border-white/30 text-sm hover:bg-white/30 transition-colors duration-300">
                Enterprise Ready
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;

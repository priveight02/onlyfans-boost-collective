import { Users, HeartHandshake, Bot, BarChart3, Globe, Workflow, CheckCircle2, Instagram, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const services = [
  {
    title: "AI Instagram Auto-Responder",
    description: "24/7 human-like DM conversations that convert followers into customers on autopilot.",
    icon: Instagram,
    bullets: ["Smart DM engine", "Profile scanning", "Auto-conversion"],
    gradient: "from-orange-500/20 to-pink-500/20",
    accentColor: "text-orange-400",
    borderHover: "hover:border-orange-500/30",
    featured: true
  },
  {
    title: "AI CRM & Pipeline",
    description: "Smart customer management with AI-driven lead scoring, pipeline automation, and predictive insights.",
    icon: Users,
    bullets: ["Lead scoring", "Deal predictions", "Smart follow-ups"],
    gradient: "from-purple-500/15 to-indigo-500/15",
    accentColor: "text-purple-400",
    borderHover: "hover:border-purple-500/30"
  },
  {
    title: "Workflow Automation",
    description: "Automate repetitive tasks, trigger smart sequences, and let AI handle your busywork.",
    icon: Workflow,
    bullets: ["No-code builder", "Smart triggers", "24/7 automations"],
    gradient: "from-blue-500/15 to-cyan-500/15",
    accentColor: "text-blue-400",
    borderHover: "hover:border-blue-500/30"
  },
  {
    title: "Social Media Intelligence",
    description: "14-platform management with competitor analysis, viral prediction, and AI auto-scheduling.",
    icon: Globe,
    bullets: ["14+ platforms", "Viral predictor", "Auto-scheduler"],
    gradient: "from-pink-500/15 to-rose-500/15",
    accentColor: "text-pink-400",
    borderHover: "hover:border-pink-500/30"
  },
  {
    title: "AI Content Engine",
    description: "Generate scripts, captions, emails, and marketing copy powered by advanced AI models.",
    icon: Bot,
    bullets: ["Brand voice AI", "Script builder", "Multi-language"],
    gradient: "from-violet-500/15 to-purple-500/15",
    accentColor: "text-violet-400",
    borderHover: "hover:border-violet-500/30"
  },
  {
    title: "Revenue Analytics",
    description: "Real-time dashboards, forecasting, and performance tracking to optimize every revenue stream.",
    icon: BarChart3,
    bullets: ["Revenue forecasting", "Team heatmaps", "Export reports"],
    gradient: "from-cyan-500/15 to-blue-500/15",
    accentColor: "text-cyan-400",
    borderHover: "hover:border-cyan-500/30"
  }
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? '/pricing' : '/auth';

  return (
    <section id="services" className="py-24 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, hsl(222,35%,8%) 0%, hsl(240,22%,10%) 50%, hsl(222,35%,8%) 100%)' }}
    >
      {/* Ambient glows */}
      <motion.div
        animate={{ opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[140px]"
      />
      <motion.div
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 10, repeat: Infinity, delay: 3 }}
        className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[120px]"
      />
      
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0">
        <div className="max-w-4xl mx-auto px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-white">
            Everything You Need to{" "}
            <motion.span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #c084fc 0%, #818cf8 25%, #60a5fa 50%, #818cf8 75%, #c084fc 100%)',
                backgroundSize: '200% auto',
              }}
              animate={{ backgroundPosition: ['0% center', '200% center'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              Scale
            </motion.span>
          </h2>
          <p className="text-lg text-white/35 max-w-2xl mx-auto">
            AI-powered tools, smart automation, and deep analytics, unified in one platform.
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-14"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={item}
              className="group"
            >
              <div className={`relative bg-[hsl(222,30%,11%)]/90 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.06] ${service.borderHover} transition-all duration-500 hover:bg-[hsl(222,28%,13%)]/90 h-full hover:-translate-y-1 ${service.featured ? 'ring-1 ring-orange-500/20' : ''}`}>
                {service.featured && (
                  <div className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    Featured
                  </div>
                )}
                <div className={`w-11 h-11 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center mb-4 border border-white/[0.08]`}>
                  <service.icon className="h-5 w-5 text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">
                  {service.title}
                </h3>
                
                <p className="text-white/40 mb-4 text-sm leading-relaxed">
                  {service.description}
                </p>
                
                <ul className="space-y-1.5">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2 text-white/50 text-xs group-hover:text-white/60 transition-colors">
                      <CheckCircle2 className={`h-3 w-3 ${service.accentColor} shrink-0 opacity-60`} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={() => navigate(ctaPath)}
            className="inline-flex items-center px-10 py-4 text-lg font-semibold rounded-xl text-white transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 50%, #3b82f6 100%)' }}
          >
            Start Growing Today
          </button>
          <button
            onClick={() => navigate('/services')}
            className="inline-flex items-center px-10 py-4 text-lg font-semibold rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-300"
          >
            Explore Features
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;

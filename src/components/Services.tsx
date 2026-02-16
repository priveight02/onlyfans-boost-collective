import { Users, HeartHandshake, Bot, BarChart3, Globe, Workflow, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const services = [
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
  },
  {
    title: "Customer Engagement",
    description: "AI-driven engagement strategies, churn detection, and personalized messaging at scale.",
    icon: HeartHandshake,
    bullets: ["Churn detection", "Smart segments", "Auto follow-ups"],
    gradient: "from-rose-500/15 to-pink-500/15",
    accentColor: "text-rose-400",
    borderHover: "hover:border-rose-500/30"
  }
];

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? '/pricing' : '/auth';

  return (
    <section id="services" className="py-24 bg-[hsl(222,35%,8%)] relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
      
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0">
        <div className="max-w-4xl mx-auto px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
            Everything You Need to <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Scale</span>
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            AI-powered tools, smart automation, and deep analytics, unified in one platform.
          </p>
        </motion.div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={item}
              className="group"
            >
              <div className={`bg-[hsl(222,30%,12%)]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] ${service.borderHover} transition-all duration-500 hover:bg-[hsl(222,30%,14%)]/80 h-full`}>
                <div className={`w-11 h-11 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center mb-4 border border-white/10`}>
                  <service.icon className="h-5 w-5 text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">
                  {service.title}
                </h3>
                
                <p className="text-white/45 mb-4 text-sm leading-relaxed">
                  {service.description}
                </p>
                
                <ul className="space-y-1.5">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2 text-white/55 text-xs">
                      <CheckCircle2 className={`h-3 w-3 ${service.accentColor} shrink-0 opacity-70`} />
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
          className="text-center"
        >
          <button 
            onClick={() => navigate(ctaPath)}
            className="inline-flex items-center px-10 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/20"
          >
            Start Growing Today
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;

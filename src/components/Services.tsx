import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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
      <div className="absolute inset-y-8 inset-x-0 bg-grid-primary/[0.02] bg-[size:20px_20px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary font-heading mb-4 pt-4">
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
              Premier OnlyFans Management Services
            </span>
            <span className="invisible">Premier OnlyFans Management Services</span>
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8"
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

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-r from-primary to-primary-accent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading">
              Ready to Maximize Your OnlyFans Potential?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Join our elite community of successful creators and start growing your OnlyFans income today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join">
                <Button size="lg" className="bg-white text-primary hover:bg-primary-light hover:text-primary w-full sm:w-auto">
                  Apply Now
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                  Schedule a Call
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default Services;

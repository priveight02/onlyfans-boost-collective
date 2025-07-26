import { Shield, Zap, DollarSign, Headphones } from "lucide-react";
import type { Feature, Stat } from "./AuthTypes";

const Feature = ({ icon: Icon, title, description }: Feature) => (
  <div className="group flex items-start space-x-4 p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
    <div className="flex-shrink-0 bg-gradient-to-br from-white/20 to-white/10 rounded-xl p-3 backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
      <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-white/90 transition-colors">{title}</h3>
      <p className="text-white/70 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const Stat = ({ number, label }: Stat) => (
  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center border border-white/30 hover:bg-white/20 transition-all duration-300">
    <div className="text-2xl font-bold text-white">{number}</div>
    <div className="text-sm text-white/70">{label}</div>
  </div>
);

export const AuthFeatures = () => (
  <div className="space-y-3">
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-1 font-heading tracking-tight">Why Choose Us?</h2>
      <div className="space-y-1">
        <Feature
          icon={Shield}
          title="Secure Platform"
          description="Enterprise-grade security with advanced encryption"
        />
        <Feature
          icon={Zap}
          title="Fast Onboarding"
          description="Get started in minutes with our streamlined process"
        />
        <Feature
          icon={DollarSign}
          title="Maximize Earnings"
          description="Proven strategies to increase your revenue"
        />
        <Feature
          icon={Headphones}
          title="24/7 Support"
          description="Dedicated team ready to help you succeed"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <Stat number="10k+" label="Active Models" />
      <Stat number="95%" label="Success Rate" />
      <Stat number="24/7" label="Support" />
      <Stat number="$50k+" label="Avg. Monthly" />
    </div>
  </div>
);
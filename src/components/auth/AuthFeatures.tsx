import type { Feature, Stat } from "./AuthTypes";
import { Shield, Zap, DollarSign, Star } from "lucide-react";

const Feature = ({ icon, title, description }: Feature) => (
  <div className="group flex items-start space-x-5 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
      <div className="text-white">{icon}</div>
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-white text-xl mb-2 font-heading">{title}</h3>
      <p className="text-white/70 text-base leading-relaxed">{description}</p>
    </div>
  </div>
);

const Stat = ({ number, label }: Stat) => (
  <div className="group bg-white/8 backdrop-blur-md rounded-xl p-5 text-center border border-white/15 hover:bg-white/15 hover:border-white/25 transition-all duration-400">
    <div className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{number}</div>
    <div className="text-sm text-white/60 font-medium uppercase tracking-wider">{label}</div>
  </div>
);

export const AuthFeatures = () => (
  <div className="space-y-10">
    <div className="animate-fade-in">
      <h2 className="text-4xl font-bold text-white mb-8 font-heading tracking-tight">Why Choose Us?</h2>
      <div className="space-y-5">
        <Feature
          icon={<Shield size={24} />}
          title="Secure Platform"
          description="Enterprise-grade security with advanced encryption and data protection"
        />
        <Feature
          icon={<Zap size={24} />}
          title="Fast Onboarding"
          description="Get started in minutes with our streamlined verification process"
        />
        <Feature
          icon={<DollarSign size={24} />}
          title="Maximize Earnings"
          description="Proven strategies and tools to optimize your revenue potential"
        />
        <Feature
          icon={<Star size={24} />}
          title="24/7 Support"
          description="Dedicated team ready to help you succeed at any time"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <Stat number="10k+" label="Active Models" />
      <Stat number="95%" label="Success Rate" />
      <Stat number="24/7" label="Support" />
      <Stat number="$50k+" label="Avg. Monthly" />
    </div>
  </div>
);
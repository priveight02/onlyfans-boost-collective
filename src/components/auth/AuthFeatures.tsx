import { Shield, Zap, TrendingUp, Headphones } from "lucide-react";
import type { Feature, Stat } from "./AuthTypes";

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature = ({ icon, title, description }: FeatureProps) => (
  <div className="group flex items-start space-x-5 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
    <div className="flex-shrink-0 bg-gradient-to-br from-white/25 to-white/15 rounded-xl p-4 backdrop-blur-sm border border-white/20 group-hover:from-white/30 group-hover:to-white/20 transition-all duration-300">
      {icon}
    </div>
    <div className="flex-1 pt-1">
      <h3 className="font-bold text-white text-lg mb-2 group-hover:text-white/95 transition-colors">{title}</h3>
      <p className="text-white/75 text-sm leading-relaxed group-hover:text-white/85 transition-colors">{description}</p>
    </div>
  </div>
);

const Stat = ({ number, label }: Stat) => (
  <div className="group bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/25 hover:from-white/20 hover:to-white/15 hover:border-white/35 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl">
    <div className="text-3xl font-black text-white mb-2 group-hover:text-white/95 transition-colors">{number}</div>
    <div className="text-sm font-medium text-white/70 group-hover:text-white/80 transition-colors">{label}</div>
  </div>
);

export const AuthFeatures = () => (
  <div className="space-y-10">
    <div className="animate-fade-in">
      <h2 className="text-4xl font-black text-white mb-8 font-heading drop-shadow-lg">Why Choose Us?</h2>
      <div className="space-y-6">
        <Feature
          icon={<Shield className="h-6 w-6 text-white" strokeWidth={2.5} />}
          title="Enterprise Security"
          description="Bank-level encryption and security protocols to protect your data and earnings"
        />
        <Feature
          icon={<Zap className="h-6 w-6 text-white" strokeWidth={2.5} />}
          title="Instant Setup"
          description="Get started immediately with our streamlined onboarding process"
        />
        <Feature
          icon={<TrendingUp className="h-6 w-6 text-white" strokeWidth={2.5} />}
          title="Revenue Optimization"
          description="Proven strategies and tools to maximize your earning potential"
        />
        <Feature
          icon={<Headphones className="h-6 w-6 text-white" strokeWidth={2.5} />}
          title="Premium Support"
          description="Dedicated account managers available 24/7 to ensure your success"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <Stat number="10k+" label="Active Creators" />
      <Stat number="98%" label="Success Rate" />
      <Stat number="24/7" label="Live Support" />
      <Stat number="$75k+" label="Avg. Monthly" />
    </div>
  </div>
);
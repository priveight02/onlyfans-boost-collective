import type { Feature, Stat } from "./AuthTypes";

const Feature = ({ icon, title, description }: Feature) => (
  <div className="flex items-start space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300">
    <div className="text-3xl bg-white/20 rounded-lg p-3 backdrop-blur-sm">{icon}</div>
    <div>
      <h3 className="font-semibold text-white text-lg mb-1">{title}</h3>
      <p className="text-white/80 text-sm leading-relaxed">{description}</p>
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
  <div className="space-y-8">
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-white mb-6 font-heading">Why Choose Us?</h2>
      <div className="space-y-4">
        <Feature
          icon="🔒"
          title="Secure Platform"
          description="Enterprise-grade security with advanced encryption"
        />
        <Feature
          icon="⚡"
          title="Fast Onboarding"
          description="Get started in minutes with our streamlined process"
        />
        <Feature
          icon="💰"
          title="Maximize Earnings"
          description="Proven strategies to increase your revenue"
        />
        <Feature
          icon="🌟"
          title="24/7 Support"
          description="Dedicated team ready to help you succeed"
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
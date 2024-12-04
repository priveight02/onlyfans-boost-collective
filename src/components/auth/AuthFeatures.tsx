import type { Feature, Stat } from "./AuthTypes";

const Feature = ({ icon, title, description }: Feature) => (
  <div className="flex items-start space-x-3">
    <div className="text-2xl">{icon}</div>
    <div>
      <h3 className="font-medium text-primary">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

const Stat = ({ number, label }: Stat) => (
  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 text-center">
    <div className="text-2xl font-bold text-primary-accent">{number}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

export const AuthFeatures = () => (
  <div className="space-y-8 p-8">
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-primary mb-4">Why Choose Us?</h2>
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
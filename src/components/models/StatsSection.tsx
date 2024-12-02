import { FC } from 'react';
import { Users, DollarSign, Instagram, TrendingUp } from 'lucide-react';

const StatsSection: FC = () => {
  const stats = [
    { icon: Users, value: "500+", label: "Active Models" },
    { icon: DollarSign, value: "$40M+", label: "Monthly Revenue" },
    { icon: Instagram, value: "50M+", label: "Combined Followers" },
    { icon: TrendingUp, value: "300%", label: "Average Growth" }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="p-6 bg-gray-50 rounded-lg transform hover:scale-105 transition-all duration-300 hover:shadow-lg"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <stat.icon className="h-8 w-8 text-purple-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</h3>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
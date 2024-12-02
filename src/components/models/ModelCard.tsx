import { FC } from 'react';
import { Star } from 'lucide-react';

interface ModelCardProps {
  model: {
    name: string;
    image: string;
    stats: string;
    followers: string;
    revenue: string;
    testimonial: string;
  };
}

const ModelCard: FC<ModelCardProps> = ({ model }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mx-2 transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
      <div className="relative group">
        <img
          src={model.image}
          alt={model.name}
          className="w-32 h-32 rounded-full mx-auto mb-4 object-cover group-hover:ring-4 ring-purple-400 transition-all duration-300"
        />
        <div className="absolute inset-0 bg-purple-600 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4 text-center hover:text-purple-600 transition-colors duration-200">
        {model.name}
      </h3>
      <div className="flex items-center justify-center mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-5 w-5 text-yellow-400 fill-current animate-pulse" />
        ))}
      </div>
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <p className="hover:text-purple-600 transition-colors duration-200">Followers: {model.followers}</p>
        <p className="hover:text-purple-600 transition-colors duration-200">Monthly Revenue: {model.revenue}</p>
        <p className="hover:text-purple-600 transition-colors duration-200">Growth: {model.stats}</p>
      </div>
      <p className="text-gray-700 italic hover:text-purple-600 transition-colors duration-200">
        "{model.testimonial}"
      </p>
    </div>
  );
};

export default ModelCard;
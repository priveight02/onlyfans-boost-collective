import { Star, TrendingUp, Award } from "lucide-react";

const models = [
  {
    name: "Sarah J.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    stats: "500% growth in 6 months",
    testimonial: "Working with this agency has transformed my career. The support and guidance are incredible!"
  },
  {
    name: "Emma R.",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",
    stats: "10x revenue increase",
    testimonial: "The team's expertise in content strategy and marketing has been game-changing."
  },
  {
    name: "Jessica M.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    stats: "100k+ new followers",
    testimonial: "I've found a true partner in growing my brand and reaching new heights."
  }
];

const Models = () => {
  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <div className="relative py-24 bg-gradient-to-r from-primary to-primary-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
            Our Success Stories
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Meet the talented individuals who have transformed their careers with our guidance.
          </p>
        </div>
      </div>

      {/* Models Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {models.map((model) => (
              <div
                key={model.name}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <img
                  src={model.image}
                  alt={model.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-primary mb-2">{model.name}</h3>
                  <div className="flex items-center text-primary-accent mb-4">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    <span>{model.stats}</span>
                  </div>
                  <p className="text-gray-600 italic">{model.testimonial}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <Star className="h-8 w-8 text-primary-accent mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-primary mb-2">500+</h3>
              <p className="text-gray-600">Successful Models</p>
            </div>
            <div className="p-6">
              <TrendingUp className="h-8 w-8 text-primary-accent mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-primary mb-2">300%</h3>
              <p className="text-gray-600">Average Growth</p>
            </div>
            <div className="p-6">
              <Award className="h-8 w-8 text-primary-accent mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-primary mb-2">50M+</h3>
              <p className="text-gray-600">Total Reach</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Models;
import { Star, TrendingUp, Award, Users, DollarSign, Instagram } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const models = [
  {
    name: "Sarah J.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    stats: "500% growth in 6 months",
    followers: "1.2M+",
    revenue: "$50k+/month",
    testimonial: "This agency transformed my career completely. Their strategic guidance and dedicated support helped me achieve financial freedom I never thought possible.",
    instagramHandle: "@sarah.j.official"
  },
  {
    name: "Emma R.",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",
    stats: "10x revenue increase",
    followers: "800k+",
    revenue: "$35k+/month",
    testimonial: "The team's expertise in content strategy and marketing has been game-changing. They helped me build a sustainable business model that keeps growing.",
    instagramHandle: "@emma.rose"
  },
  {
    name: "Jessica M.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    stats: "100k+ new followers",
    followers: "950k+",
    revenue: "$42k+/month",
    testimonial: "I've found a true partner in growing my brand. Their personalized approach and industry expertise are unmatched.",
    instagramHandle: "@jessica.m"
  },
  {
    name: "Sophia L.",
    image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=400&fit=crop",
    stats: "400% growth in 3 months",
    followers: "750k+",
    revenue: "$38k+/month",
    testimonial: "The support and guidance from this agency have been invaluable. They truly understand the industry and how to maximize success.",
    instagramHandle: "@sophia.lifestyle"
  },
  {
    name: "Victoria K.",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop",
    stats: "300% revenue growth",
    followers: "600k+",
    revenue: "$30k+/month",
    testimonial: "Joining this agency was the best decision for my career. Their expertise and support system are second to none.",
    instagramHandle: "@victoria.k"
  }
];

const Models = () => {
  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <div className="relative py-24 bg-gradient-to-r from-purple-600 to-pink-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
            Our Success Stories
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join the ranks of successful creators who have transformed their careers with our expert guidance and support.
          </p>
        </div>
      </div>

      {/* Success Metrics */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="p-6 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">500+</h3>
              <p className="text-gray-600">Active Models</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">$40M+</h3>
              <p className="text-gray-600">Monthly Revenue</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <Instagram className="h-8 w-8 text-purple-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">50M+</h3>
              <p className="text-gray-600">Combined Followers</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">300%</h3>
              <p className="text-gray-600">Average Growth</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Models Carousel */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Featured Success Stories</h2>
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {models.map((model) => (
                <CarouselItem key={model.name} className="md:basis-1/2 lg:basis-1/3">
                  <div className="bg-white rounded-xl shadow-sm p-6 mx-2">
                    <img
                      src={model.image}
                      alt={model.name}
                      className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{model.name}</h3>
                    <p className="text-purple-500 font-medium mb-2">{model.instagramHandle}</p>
                    <div className="flex items-center justify-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <p>Followers: {model.followers}</p>
                      <p>Monthly Revenue: {model.revenue}</p>
                      <p>Growth: {model.stats}</p>
                    </div>
                    <p className="text-gray-700 italic">&quot;{model.testimonial}&quot;</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Career?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join our community of successful creators and take your content to the next level.
          </p>
          <a
            href="/join"
            className="inline-block bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Apply Now
          </a>
        </div>
      </section>
    </div>
  );
};

export default Models;
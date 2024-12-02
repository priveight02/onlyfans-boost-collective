import { Star, TrendingUp, Award, Users, DollarSign, Instagram, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link with form data
    const subject = `Model Inquiry from ${formData.name}`;
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
    const mailtoLink = `mailto:protekticorp@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open default email client
    window.location.href = mailtoLink;
    
    // Show success message
    toast({
      title: "Email client opened!",
      description: "Please send the pre-filled email to complete your message submission.",
    });
    
    // Reset form
    setFormData({ name: "", email: "", message: "" });
  };

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
                    <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{model.name}</h3>
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

      {/* Contact Form */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Get in Touch</h2>
          <p className="text-center text-gray-600 mb-8">
            Interested in working with us? Send us a message and we'll get back to you shortly.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-accent transition-colors duration-200"
            >
              Send Message
              <Send className="ml-2 h-5 w-5" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Models;
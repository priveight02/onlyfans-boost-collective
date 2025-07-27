import { models } from '@/data/models';
import HeroSection from '@/components/models/HeroSection';
import StatsSection from '@/components/models/StatsSection';
import ModelCard from '@/components/models/ModelCard';
import ContactForm from '@/components/models/ContactForm';
import TestimonialsCarousel from '@/components/models/TestimonialsCarousel';
import BackButton from "@/components/BackButton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Models = () => {
  return (
    <div className="min-h-screen">
      <BackButton />
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgMGgxNDQwdjE4N0wxNzIuOCA0NjEuOCAwIDIyN3oiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbC1vcGFjaXR5PSIuNCIvPjwvc3ZnPg==')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
          {/* Add decorative shapes */}
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl transform -translate-y-1/2" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300 animate-fade-in">
            Our Success Stories
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto hover:text-white transition-colors duration-200 animate-fade-in">
            Join the ranks of successful creators who have transformed their careers with our expert guidance and support.
          </p>
        </div>
      </div>

      <StatsSection />
      
      {/* Featured Models Carousel */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16 animate-fade-in">Featured Success Stories</h2>
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {models.map((model) => (
                <CarouselItem key={model.name} className="md:basis-1/2 lg:basis-1/3">
                  <ModelCard model={model} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hover:scale-110 transition-transform duration-200" />
            <CarouselNext className="hover:scale-110 transition-transform duration-200" />
          </Carousel>
        </div>
      </section>

      {/* Simple CTA Section */}
      <section className="py-24 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading animate-fade-in">
            Ready to Join Our Success Stories?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 animate-fade-in">
            Start your journey with our proven strategies and expert guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join">
              <Button size="lg" className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 w-full sm:w-auto shadow-lg hover:shadow-xl">
                Apply Now
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary hover:scale-105 transition-all duration-300 w-full sm:w-auto">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Models;
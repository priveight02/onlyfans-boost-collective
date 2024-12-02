import { models } from '@/data/models';
import HeroSection from '@/components/models/HeroSection';
import StatsSection from '@/components/models/StatsSection';
import ModelCard from '@/components/models/ModelCard';
import ContactForm from '@/components/models/ContactForm';
import TestimonialsCarousel from '@/components/models/TestimonialsCarousel';
import BackButton from "@/components/BackButton";
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
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300">
            Our Success Stories
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto hover:text-white transition-colors duration-200">
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

      {/* Testimonials Section */}
      <TestimonialsCarousel />

      <ContactForm />
    </div>
  );
};

export default Models;

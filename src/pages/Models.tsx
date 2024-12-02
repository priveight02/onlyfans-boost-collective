import { models } from '@/data/models';
import HeroSection from '@/components/models/HeroSection';
import StatsSection from '@/components/models/StatsSection';
import ModelCard from '@/components/models/ModelCard';
import ContactForm from '@/components/models/ContactForm';
import TestimonialsCarousel from '@/components/models/TestimonialsCarousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Models = () => {
  return (
    <div className="min-h-screen pt-16">
      <HeroSection />
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
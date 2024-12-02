import { MessageSquareQuote } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const testimonials = [
  {
    quote: "This agency transformed my career completely. Their strategic guidance helped me achieve financial freedom I never thought possible.",
    author: "Sarah J.",
    stats: "500% growth in 6 months",
  },
  {
    quote: "The team's expertise in content strategy and marketing has been game-changing. They helped me build a sustainable business model.",
    author: "Emma R.",
    stats: "10x revenue increase",
  },
  {
    quote: "I've found a true partner in growing my brand. Their personalized approach and industry expertise are unmatched.",
    author: "Jessica M.",
    stats: "100k+ new followers",
  }
];

const TestimonialsCarousel = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-16 relative">
          <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
            Get in Touch
          </span>
          <span className="invisible">Get in Touch</span>
        </h2>
        
        <Carousel className="w-full max-w-4xl mx-auto">
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index}>
                <div className="bg-gray-50 rounded-xl p-8 mx-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <MessageSquareQuote className="h-10 w-10 text-purple-500 mb-6" />
                  <blockquote className="text-xl text-gray-700 italic mb-6">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex flex-col items-start">
                    <cite className="text-lg font-semibold text-gray-900 not-italic">
                      {testimonial.author}
                    </cite>
                    <span className="text-purple-600 font-medium">
                      {testimonial.stats}
                    </span>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hover:scale-110 transition-transform duration-200" />
          <CarouselNext className="hover:scale-110 transition-transform duration-200" />
        </Carousel>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
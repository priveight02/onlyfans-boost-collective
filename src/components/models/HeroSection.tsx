import { FC } from 'react';

const HeroSection: FC = () => {
  return (
    <div className="relative py-24 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300">
          Our Success Stories
        </h1>
        <p className="text-xl text-white/90 max-w-2xl mx-auto hover:text-white transition-colors duration-200">
          Join the ranks of successful creators who have transformed their careers with our expert guidance and support.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;
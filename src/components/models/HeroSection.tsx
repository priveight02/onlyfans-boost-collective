import { FC } from 'react';

const HeroSection: FC = () => {
  return (
    <div className="relative py-24 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgMGgxNDQwdjE4N0wxNzIuOCA0NjEuOCAwIDIyN3oiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbC1vcGFjaXT0iLjQiLz48L3N2Zz4=')] bg-cover bg-center opacity-50" />
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
        {/* Decorative shapes */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl transform rotate-135" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-2/3 w-96 h-96 bg-white/10 rounded-full blur-3xl transform -rotate-135" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300 animate-fade-in">
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
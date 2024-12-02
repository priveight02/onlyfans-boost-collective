import { useState } from "react";
import { X } from "lucide-react";

const TopBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-primary-accent text-white py-2 relative animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
        <span className="font-medium">
          🎉 Special Offer: Sign up this month and get 30% more exposure! Limited time only.
        </span>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
          aria-label="Close banner"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default TopBanner;
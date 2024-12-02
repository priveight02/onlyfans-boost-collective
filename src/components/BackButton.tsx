import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const BackButton = () => {
  return (
    <Link
      to="/"
      className="fixed left-4 top-20 flex items-center gap-1.5 bg-white/80 backdrop-blur-[2px] px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 z-40 text-primary/80 text-sm font-medium"
      aria-label="Back to home"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Link>
  );
};

export default BackButton;
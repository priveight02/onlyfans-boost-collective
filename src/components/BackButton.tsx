import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const BackButton = () => {
  return (
    <Link
      to="/"
      className="fixed left-4 top-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 z-40 text-primary font-medium"
      aria-label="Back to home"
    >
      <ArrowLeft className="h-5 w-5" />
      Back
    </Link>
  );
};

export default BackButton;
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const BackButton = () => {
  return (
    <Link
      to="/"
      className="fixed left-4 bottom-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 z-40"
      aria-label="Back to home"
    >
      <ArrowLeft className="h-6 w-6 text-primary" />
    </Link>
  );
};

export default BackButton;
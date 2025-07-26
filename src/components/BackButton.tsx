import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/30 text-white font-medium animate-fade-in group hover:scale-105"
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
      Back
    </button>
  );
};

export default BackButton;
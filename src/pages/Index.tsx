import Hero from "@/components/Hero";
import Services from "@/components/Services";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen">
      <div>
        <Hero />
        <Services />
        <footer className="bg-primary/95 border-t border-white/10 py-8 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">© {new Date().getFullYear()} Ozc Agency. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-white/50 hover:text-white text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-white/50 hover:text-white text-sm transition-colors">Terms & Conditions</Link>
              <a href="mailto:liam@ozcagency.com" className="text-white/50 hover:text-white text-sm transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;

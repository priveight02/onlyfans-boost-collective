import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import About from "./pages/About";
import Services from "./pages/Services";
import Models from "./pages/Models";
import Join from "./pages/Join";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className={isHomePage ? "" : "pt-[104px]"}>
      <div className={isHomePage ? "fixed w-full z-50" : "relative w-full z-50"}>
        <Navigation />
      </div>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/models" element={<Models />} />
        <Route path="/join" element={<Join />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
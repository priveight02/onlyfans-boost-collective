import Navigation from "@/components/Navigation";
import TopBanner from "@/components/TopBanner";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Contact from "@/components/Contact";

const Index = () => {
  return (
    <div className="min-h-screen">
      <TopBanner />
      <Navigation />
      <Hero />
      <Services />
      <Contact />
    </div>
  );
};

export default Index;
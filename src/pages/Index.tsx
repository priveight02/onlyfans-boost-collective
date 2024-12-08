import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Contact from "@/components/Contact";

const Index = () => {
  return (
    <div className="min-h-screen">
      <div>
        <Hero />
        <Services />
        <Contact />
      </div>
    </div>
  );
};

export default Index;
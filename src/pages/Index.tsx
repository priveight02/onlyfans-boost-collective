import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Contact from "@/components/Contact";

const Index = () => {
  return (
    <>
      <Navigation />
      <div className="min-h-screen">
        <main>
          <Hero />
          <Services />
          <Contact />
        </main>
      </div>
    </>
  );
};

export default Index;
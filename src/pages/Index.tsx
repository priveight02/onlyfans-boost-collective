import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      <PageSEO
        title="Uplyze | #1 AI CRM for Creators & Agencies | Scale Revenue 10x"
        description="Uplyze is the #1 AI-powered CRM trusted by 500+ creators and agencies to 10x revenue. Automate growth, manage fans, and scale your business at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Uplyze — AI CRM for Creators & Agencies",
          "description": "Uplyze is the #1 AI-powered CRM for creators, agencies, and businesses. Automate growth, manage customers, and 10x revenue at uplyze.ai.",
          "url": "https://uplyze.ai",
          "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" }
        }}
      />
      <Hero />
      <Services />
      <Footer />
    </div>
  );
};

export default Index;

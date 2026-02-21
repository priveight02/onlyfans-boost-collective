import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      <PageSEO
         title="Uplyze — #1 AI Marketing Platform & All-in-One AI Suite for Creators"
         description="Uplyze is the best AI marketing platform, AI CRM, and all-in-one AI suite trusted by 700+ creators and agencies. AI marketing automation, social media management, DM automation, and revenue scaling at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Uplyze — Best AI Marketing Platform, AI CRM & All-in-One AI Suite",
          "description": "Uplyze is the #1 AI marketing platform and all-in-one AI suite for creators, agencies, and businesses. AI CRM, marketing automation, social media management, and revenue scaling at uplyze.ai.",
          "url": "https://uplyze.ai",
          "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" },
          "about": [
            { "@type": "Thing", "name": "AI CRM" },
            { "@type": "Thing", "name": "AI Marketing Platform" },
            { "@type": "Thing", "name": "AI Marketing Automation" },
            { "@type": "Thing", "name": "All-in-One AI Suite" },
            { "@type": "Thing", "name": "Social Media Management" },
            { "@type": "Thing", "name": "Marketing Automation Platform" }
          ]
        }}
      />
      <Hero />
      <Services />
      <Footer />
    </div>
  );
};

export default Index;

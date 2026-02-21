import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      <PageSEO
         title="Uplyze — #1 AI Platform, AI Tool & All-in-One AI Suite for Business Growth"
         description="Uplyze is the best AI platform, AI tool, and all-in-one AI suite trusted by 700+ businesses. AI marketing, AI CRM, growth AI, business scaling AI, marketing automation, social media AI, content creation, and revenue optimization at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Uplyze — Best AI Platform, AI Tool, AI CRM & All-in-One AI Suite",
          "description": "Uplyze is the #1 AI platform, AI tool, and all-in-one AI suite for creators, agencies, entrepreneurs, and businesses. AI CRM, AI marketing, growth AI, business scaling AI, marketing automation, social media management, and revenue scaling at uplyze.ai.",
          "url": "https://uplyze.ai",
          "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" },
          "about": [
            { "@type": "Thing", "name": "AI Platform" },
            { "@type": "Thing", "name": "AI Tool" },
            { "@type": "Thing", "name": "AI CRM" },
            { "@type": "Thing", "name": "AI Marketing Platform" },
            { "@type": "Thing", "name": "AI Marketing Tool" },
            { "@type": "Thing", "name": "AI Marketing Automation" },
            { "@type": "Thing", "name": "All-in-One AI Suite" },
            { "@type": "Thing", "name": "All-in-One AI Tool" },
            { "@type": "Thing", "name": "Growth AI" },
            { "@type": "Thing", "name": "Business AI" },
            { "@type": "Thing", "name": "Business Scaling AI" },
            { "@type": "Thing", "name": "Upscale AI" },
            { "@type": "Thing", "name": "AI Automation" },
            { "@type": "Thing", "name": "Social Media AI" },
            { "@type": "Thing", "name": "AI Content Creation" },
            { "@type": "Thing", "name": "AI Lead Generation" },
            { "@type": "Thing", "name": "AI Sales Automation" },
            { "@type": "Thing", "name": "AI Analytics" },
            { "@type": "Thing", "name": "AI Workflow Automation" },
            { "@type": "Thing", "name": "Marketing Automation Platform" },
            { "@type": "Thing", "name": "AI for Small Business" },
            { "@type": "Thing", "name": "AI for Entrepreneurs" },
            { "@type": "Thing", "name": "AI for Agencies" },
            { "@type": "Thing", "name": "AI for Creators" },
            { "@type": "Thing", "name": "Revenue Optimization AI" },
            { "@type": "Thing", "name": "AI Customer Engagement" },
            { "@type": "Thing", "name": "AI Outreach Tool" },
            { "@type": "Thing", "name": "Smart Marketing Tool" },
            { "@type": "Thing", "name": "Digital Marketing AI" }
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

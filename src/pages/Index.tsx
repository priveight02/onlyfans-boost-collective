import Hero from "@/components/Hero";
import ComparisonSection from "@/components/ComparisonSection";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      <PageSEO
         title="Uplyze — #1 AI Platform, AI Tool & All-in-One AI Suite for Business Growth"
         description="Uplyze is the best AI platform, AI tool, and all-in-one AI suite trusted by 700+ businesses. AI marketing, AI CRM, growth AI, business scaling AI, marketing automation, social media AI, content creation, and revenue optimization at uplyze.ai."
         ogTitle="Uplyze — #1 AI Platform & Best AI Tool for Marketing, Growth & Business Scaling"
         ogDescription="The ultimate AI platform trusted by 700+ businesses. AI CRM, marketing automation, social media AI, content creation, lead generation, DM automation, and revenue scaling — all in one AI suite at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Uplyze — Best AI Platform, AI Tool, AI CRM & All-in-One AI Suite",
          "description": "Uplyze is the #1 AI platform, AI tool, and all-in-one AI suite for creators, agencies, entrepreneurs, and businesses. AI CRM, AI marketing, growth AI, business scaling AI, marketing automation, social media management, and revenue scaling at uplyze.ai.",
          "url": "https://uplyze.ai",
          "isPartOf": { "@type": "WebSite", "name": "Uplyze", "url": "https://uplyze.ai" },
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".hero-description"]
          },
          "mainEntity": {
            "@type": "SoftwareApplication",
            "name": "Uplyze",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": { "@type": "AggregateOffer", "lowPrice": "0", "highPrice": "499.99", "priceCurrency": "USD" }
          },
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
            { "@type": "Thing", "name": "Digital Marketing AI" },
            { "@type": "Thing", "name": "AI Chatbot" },
            { "@type": "Thing", "name": "AI Copilot" },
            { "@type": "Thing", "name": "AI Virtual Assistant" },
            { "@type": "Thing", "name": "AI Dashboard" },
            { "@type": "Thing", "name": "AI Reporting" },
            { "@type": "Thing", "name": "AI Pipeline Management" },
            { "@type": "Thing", "name": "AI Deal Tracking" },
            { "@type": "Thing", "name": "AI Email Marketing" },
            { "@type": "Thing", "name": "AI DM Automation" },
            { "@type": "Thing", "name": "AI Instagram Tool" },
            { "@type": "Thing", "name": "AI TikTok Tool" },
            { "@type": "Thing", "name": "AI Video Generator" },
            { "@type": "Thing", "name": "AI Voice Generator" },
            { "@type": "Thing", "name": "AI Script Builder" },
            { "@type": "Thing", "name": "AI Ad Optimizer" },
            { "@type": "Thing", "name": "AI Competitor Analysis" },
            { "@type": "Thing", "name": "AI Hashtag Research" },
            { "@type": "Thing", "name": "AI Trend Analysis" },
            { "@type": "Thing", "name": "AI Scheduling Tool" },
            { "@type": "Thing", "name": "AI Team Management" },
            { "@type": "Thing", "name": "AI Project Management" },
            { "@type": "Thing", "name": "AI Invoicing" },
            { "@type": "Thing", "name": "AI Billing" },
            { "@type": "Thing", "name": "SaaS AI Tool" },
            { "@type": "Thing", "name": "Cloud AI Platform" },
            { "@type": "Thing", "name": "Best AI Tool 2026" },
            { "@type": "Thing", "name": "Top AI Platform 2026" },
            { "@type": "Thing", "name": "AI for Freelancers" },
            { "@type": "Thing", "name": "AI for Solopreneurs" },
            { "@type": "Thing", "name": "AI Side Hustle Tool" },
            { "@type": "Thing", "name": "AI Monetization Platform" },
            { "@type": "Thing", "name": "AI Fan Management" },
            { "@type": "Thing", "name": "Creator Economy AI" },
            { "@type": "Thing", "name": "Influencer Marketing AI" }
          ]
        }}
      />
      <Hero />
      <ComparisonSection />
      <Services />
      <Footer />
    </div>
  );
};

export default Index;

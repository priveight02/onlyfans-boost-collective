import { useState } from "react";
import { HelpCircle, Search, MessageCircle, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const ctaPath = user ? '/pricing' : '/auth';

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What is Ozc Agency's CRM platform?",
          answer: "Ozc Agency provides an AI-powered CRM and business growth platform. We combine intelligent customer management, workflow automation, multi-channel outreach, and advanced analytics into one unified system, designed to help businesses of all sizes scale faster and smarter."
        },
        {
          question: "How do I get started?",
          answer: "Simply create a free account to access the platform. You'll get a guided onboarding experience that walks you through setting up your CRM pipeline, connecting your channels, and configuring your first automations. No credit card required to start."
        },
        {
          question: "Do I need technical skills to use the platform?",
          answer: "Not at all. Our platform is built with a no-code approach. You can set up automations, build workflows, and generate AI content without writing a single line of code. If you can use a spreadsheet, you can use our CRM."
        },
        {
          question: "What makes Ozc Agency different from other CRMs?",
          answer: "We're AI-first. While other CRMs bolt on AI as an afterthought, our entire platform is built around intelligent automation. From AI lead scoring and predictive deal insights to automated content generation and smart engagement sequences, AI powers everything we do."
        }
      ]
    },
    {
      category: "AI & Automation",
      questions: [
        {
          question: "What AI features are included?",
          answer: "Our platform includes AI lead scoring, predictive analytics, automated content generation (emails, social posts, scripts), smart workflow triggers, sentiment analysis, competitor intelligence, and an AI co-pilot that provides strategic recommendations based on your data."
        },
        {
          question: "How does workflow automation work?",
          answer: "You can create no-code automations using our visual builder. Set triggers (e.g., new lead, deal stage change, time-based), add conditions, and define actions (send email, update record, notify team, etc.). Automations run 24/7 so your business never sleeps."
        },
        {
          question: "Can the AI generate content for my business?",
          answer: "Yes! Our AI content engine can generate marketing emails, social media posts, ad copy, sales scripts, follow-up messages, and more. It learns your brand voice and adapts to your industry, so every piece of content sounds authentically you."
        },
        {
          question: "Is my data used to train AI models?",
          answer: "Never. Your data is yours and stays yours. We use enterprise-grade AI providers with strict data privacy agreements. Your business data is never used to train third-party models and is encrypted both in transit and at rest."
        }
      ]
    },
    {
      category: "CRM & Pipeline",
      questions: [
        {
          question: "How does the CRM pipeline work?",
          answer: "Our CRM provides a visual pipeline where you can track every deal from first contact to close. AI automatically scores leads, suggests next actions, and predicts close probability. You can customize stages, add custom fields, and set up automated follow-ups."
        },
        {
          question: "Can I manage my team in the platform?",
          answer: "Absolutely. You can add team members with role-based permissions, track individual and team performance with KPI dashboards, assign tasks, manage contracts, and collaborate in real-time with built-in chat and notification systems."
        },
        {
          question: "Does it integrate with my existing tools?",
          answer: "Yes, we support integrations with popular platforms including email providers, social media channels, messaging apps, and more. Our API allows custom integrations with virtually any tool in your tech stack."
        }
      ]
    },
    {
      category: "Analytics & Reporting",
      questions: [
        {
          question: "What kind of analytics are available?",
          answer: "You get real-time dashboards covering revenue analytics, team performance heatmaps, engagement metrics, pipeline health, conversion rates, and customer lifetime value tracking. All data can be exported as CSV or JSON for further analysis."
        },
        {
          question: "Can I create custom reports?",
          answer: "Yes! Our reporting engine lets you build custom reports with filters, date ranges, and visualization options. Schedule automated report delivery to your inbox, or share live dashboards with your team and stakeholders."
        },
        {
          question: "How accurate are the AI predictions?",
          answer: "Our predictive models improve over time as they learn from your business data. Most customers see meaningful accuracy within the first 30 days. The AI considers deal size, engagement patterns, historical close rates, and dozens of other signals to generate forecasts."
        }
      ]
    },
    {
      category: "Pricing & Security",
      questions: [
        {
          question: "What plans do you offer?",
          answer: "We offer flexible plans starting with a free tier that includes core CRM features. Our paid plans unlock advanced AI capabilities, unlimited automations, priority support, and enterprise features. Visit our pricing page for full details."
        },
        {
          question: "Is my data secure?",
          answer: "Security is our top priority. We use enterprise-grade encryption, role-based access controls, audit trails, and are fully GDPR compliant. Your data is hosted on secure cloud infrastructure with 99.9% uptime guarantee."
        },
        {
          question: "Can I cancel anytime?",
          answer: "Yes, no long-term contracts required. You can upgrade, downgrade, or cancel your plan at any time. If you cancel, your data remains accessible for 30 days so you can export everything you need."
        },
        {
          question: "Do you offer enterprise solutions?",
          answer: "Yes! For larger teams and custom requirements, we offer enterprise plans with dedicated support, custom integrations, SSO, advanced security features, and SLA guarantees. Contact our team to discuss your needs."
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      faq => 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/6 rounded-full blur-[100px]" />
        <div className="absolute top-2/3 left-1/2 w-[300px] h-[300px] bg-pink-600/4 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
            <HelpCircle className="h-3.5 w-3.5" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 font-heading animate-fade-in">
            Frequently Asked <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Questions</span>
          </h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto mb-2 animate-fade-in">
            Find answers about our AI-powered CRM platform, automation features, and how we help businesses grow.
          </p>
        </div>
      </div>

      {/* Search Section */}
      <section className="py-2 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative animate-fade-in">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[hsl(222,30%,12%)]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all duration-200 text-lg text-white placeholder-white/30"
            />
          </div>
        </div>
      </section>
      
      {/* FAQ Categories */}
      <section className="py-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFaqs.map((category, categoryIndex) => (
            <div key={category.category} className="mb-8 animate-fade-in" style={{ animationDelay: `${categoryIndex * 100}ms` }}>
              <h2 className="text-xl font-bold text-white/80 mb-4 uppercase tracking-wider text-sm">{category.category}</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`${category.category}-${index}`}
                    className="group bg-[hsl(222,30%,12%)]/80 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/15 overflow-hidden transition-all duration-300"
                  >
                    <AccordionTrigger 
                      className="px-6 py-4 text-left text-base font-semibold text-white/90 hover:text-white transition-all duration-300 [&[data-state=open]>svg]:rotate-180"
                    >
                      <div className="flex items-center w-full pr-4">
                        <span className="flex-1">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="text-white/50 leading-relaxed text-base">
                        {faq.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
          
          {filteredFaqs.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <HelpCircle className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white/60 mb-2">No results found</h3>
              <p className="text-white/30">Try searching with different keywords or browse our categories above.</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Clock, value: "24/7", label: "Platform Uptime", gradient: "from-purple-500/15 to-indigo-500/15", accent: "text-purple-400" },
              { icon: MessageCircle, value: "<2hrs", label: "Support Response", gradient: "from-blue-500/15 to-cyan-500/15", accent: "text-blue-400" },
              { icon: Shield, value: "100%", label: "GDPR Compliant", gradient: "from-emerald-500/15 to-teal-500/15", accent: "text-emerald-400" }
            ].map((stat) => (
              <div key={stat.label} className="p-6 rounded-xl bg-[hsl(222,30%,12%)]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/15 transition-all duration-300 text-center">
                <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/10`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-white/40 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-8 pb-20 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-heading animate-fade-in">
            Ready to Start Growing?
          </h2>
          <p className="text-lg text-white/40 mb-8 max-w-xl mx-auto animate-fade-in">
            Join thousands of businesses already scaling with Ozc Agency's AI-powered platform.
          </p>
          <Button
            size="lg"
            onClick={() => navigate(ctaPath)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white hover:scale-105 transition-all duration-300 px-14 py-6 text-lg font-bold rounded-xl shadow-lg shadow-purple-500/20"
          >
            Get Started
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQ;

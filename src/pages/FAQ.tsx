import { useState } from "react";
import { HelpCircle, Plus, Minus, Search, MessageCircle, Clock, Shield } from 'lucide-react';
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What does your agency offer to content creators?",
          answer: "Our agency provides comprehensive services including professional content creation, brand development, strategic marketing across all platforms, revenue optimization strategies, 24/7 dedicated support, and personalized growth plans tailored to your unique goals and audience."
        },
        {
          question: "How do I apply to join your agency?",
          answer: "Getting started is simple! Fill out our detailed application form on the Join page with your information, social media handles, and goals. Our team reviews every application within 24 hours and will contact you to discuss the next steps and answer any questions you may have."
        },
        {
          question: "What are the requirements to work with your agency?",
          answer: "We welcome creators at all levels! Whether you're just starting out or already established, we look for individuals who are committed to their success, open to professional guidance, and ready to implement our proven strategies consistently."
        }
      ]
    },
    {
      category: "Services & Support",
      questions: [
        {
          question: "What kind of support do you provide to your models?",
          answer: "We provide comprehensive 24/7 support including content strategy development, technical assistance, marketing guidance, personal coaching sessions, crisis management, and ongoing optimization of your entire online presence across all platforms."
        },
        {
          question: "Do you help with content creation and photography?",
          answer: "Absolutely! We offer professional content creation services including high-quality photography, videography, strategic content planning, editing services, and creative direction to ensure your content consistently stands out and engages your audience."
        },
        {
          question: "How do you help increase my earnings?",
          answer: "We use proven revenue optimization strategies including strategic pricing models, premium content development, multiple income stream creation, subscriber retention techniques, and data-driven insights to maximize your earning potential across all platforms."
        }
      ]
    },
    {
      category: "Results & Timeline",
      questions: [
        {
          question: "How long does it take to see results?",
          answer: "While results vary based on starting point and consistency, most of our creators see significant improvements within the first 30 days, with substantial growth typically occurring within the first 3 months. We focus on sustainable, long-term growth strategies."
        },
        {
          question: "What kind of growth can I expect?",
          answer: "Our creators typically experience 200-500% growth in their first year, with many achieving 6-figure monthly earnings. Individual results depend on consistency, market positioning, and implementation of our strategies."
        },
        {
          question: "Do you guarantee specific results?",
          answer: "While we can't guarantee specific numbers due to market variables, we do guarantee our full commitment to your success with proven strategies, dedicated support, and continuous optimization based on performance data and industry best practices."
        }
      ]
    },
    {
      category: "Pricing & Contracts",
      questions: [
        {
          question: "How much do your services cost?",
          answer: "Our pricing is customized based on your specific needs, current status, and growth goals. We offer flexible packages and revenue-sharing models to ensure our services are accessible and aligned with your success. All details are discussed during your consultation."
        },
        {
          question: "Are there any long-term contracts?",
          answer: "We believe in earning your trust through results, not binding contracts. Our partnerships are built on mutual success and satisfaction, with flexible terms that can be adjusted as your business grows and evolves."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept various payment methods including bank transfers, credit cards, and cryptocurrency. We also offer revenue-sharing models where our success is directly tied to your growth and earnings."
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
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgMGgxNDQwdjE4N0wxNzIuOCA0NjEuOCAwIDIyN3oiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbC1vcGFjaXR5PSIuNCIvPjwvc3ZnPg==')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl transform -translate-y-1/2" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <HelpCircle className="h-16 w-16 text-white animate-bounce" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300 animate-fade-in">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto animate-fade-in">
            Find answers to common questions about our services and how we can help you achieve success in content creation.
          </p>
        </div>
      </div>

      {/* Search Section */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative animate-fade-in">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-lg"
            />
          </div>
        </div>
      </section>
      
      {/* FAQ Categories */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFaqs.map((category, categoryIndex) => (
            <div key={category.category} className="mb-12 animate-fade-in" style={{ animationDelay: `${categoryIndex * 100}ms` }}>
              <h2 className="text-2xl font-bold text-primary mb-8 text-center">{category.category}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {category.questions.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`${category.category}-${index}`}
                    className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-none overflow-hidden"
                  >
                    <AccordionTrigger 
                      className="px-8 py-6 text-left text-lg font-semibold text-primary group-hover:text-primary-accent transition-all duration-300 [&[data-state=open]>svg]:rotate-180"
                    >
                      <div className="flex items-center w-full pr-4">
                        <span className="flex-1">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-8 pb-6">
                      <div className="text-gray-600 leading-relaxed text-base">
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
              <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No results found</h3>
              <p className="text-gray-500">Try searching with different keywords or browse our categories above.</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary-accent/10 animate-fade-in">
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-primary mb-2">24/7</h3>
              <p className="text-gray-600">Support Available</p>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary-accent/10 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-primary mb-2">&lt;24hrs</h3>
              <p className="text-gray-600">Response Time</p>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary-accent/10 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-primary mb-2">100%</h3>
              <p className="text-gray-600">Confidential</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading animate-fade-in">
            Still Have Questions?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in">
            Our team is here to help you succeed. Get personalized answers and start your journey with us today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Contact Support
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary hover:scale-105 transition-all duration-300"
            >
              Schedule a Call
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
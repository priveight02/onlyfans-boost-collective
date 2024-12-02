import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from 'lucide-react';
import BackButton from "@/components/BackButton";

const faqs = [
  {
    question: "What does your agency offer?",
    answer: "Our agency provides comprehensive services including content creation, brand development, marketing strategy, revenue optimization, and 24/7 support to help content creators maximize their success."
  },
  {
    question: "How do I get started with your agency?",
    answer: "Getting started is easy! Simply fill out our application form on the Join page, and our team will review your submission and contact you within 48 hours to discuss the next steps."
  },
  {
    question: "How much do you charge?",
    answer: "Our pricing is customized based on your specific needs and goals. We'll discuss all details during your initial consultation to ensure we create a package that works for you."
  },
  {
    question: "What kind of support do you provide?",
    answer: "We provide 24/7 support to our models, including content strategy, technical assistance, marketing support, and personal guidance to help you achieve your goals."
  },
  {
    question: "How long does it take to see results?",
    answer: "While results vary, most of our models see significant growth within the first 3 months of working with us. We focus on sustainable, long-term growth strategies."
  },
  {
    question: "Do you help with content creation?",
    answer: "Yes! We offer professional content creation services, including photography, videography, and strategic content planning to help you maintain a consistent, high-quality presence."
  }
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary-light/20">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjEwMCUiIHgyPSIxMDAlIiB5Mj0iMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTAgNTAwaDE0NDBWMzEzbC0xMjY3LjItMjc0LjhMMCA0NzN6IiBmaWxsPSJ1cmwoI2EpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGZpbGwtb3BhY2l0eT0iLjQiLz48L3N2Zz4=')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <HelpCircle className="h-16 w-16 mx-auto mb-6 text-white animate-bounce" />
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading animate-fade-in">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto animate-fade-in">
            Find answers to common questions about our services and how we can help you succeed.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="group animate-fade-in bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-500 border-none transform hover:-translate-y-1"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  transform: "perspective(1000px)",
                }}
              >
                <AccordionTrigger 
                  className="px-6 py-4 text-left text-lg font-medium text-primary group-hover:text-primary-accent transition-all duration-300 ease-out"
                >
                  <div className="flex items-center w-full group-hover:translate-x-1 transition-transform duration-300">
                    {faq.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent 
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                >
                  <div className="px-6 pb-4 text-gray-600 leading-relaxed transform transition-all duration-500 ease-out hover:text-gray-800">
                    {faq.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-primary-light/20 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6 font-heading animate-fade-in">
            Still Have Questions?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in">
            Contact us anytime. Our team is here to help you succeed.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-primary hover:bg-primary-accent transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
};

export default FAQ;

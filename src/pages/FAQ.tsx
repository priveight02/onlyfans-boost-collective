import { useState } from "react";
import { HelpCircle, Search, MessageCircle, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What does Ozc Agency actually do for models?",
          answer: "We handle everything that drives your revenue — from our dedicated chatting team engaging your fans 24/7 to maximize lifetime value, to our marketing team driving traffic and new subscribers to your page. We also take care of leak removal, problem-solving, content strategy, and buyer acquisition so you can focus on creating while we handle the business side."
        },
        {
          question: "How do I apply to join Ozc Agency?",
          answer: "Simply fill out our onboarding form with your basic info, current platforms, and goals. Our team reviews every application within 24 hours. We'll hop on a quick call to understand your situation, explain how we work, and see if we're a good fit for each other."
        },
        {
          question: "Do I need to already have an OF page to join?",
          answer: "Not necessarily! We work with models at all stages — whether you're brand new and need help setting everything up, or you're already established and looking to scale. If you're starting fresh, we'll guide you through the entire setup process and build your page for success from day one."
        },
        {
          question: "What makes Ozc Agency different from other management agencies?",
          answer: "We're not just managers — we're a full team working around the clock for your success. Our chatting team works 24/7 to engage your fans and increase their lifetime value, our marketing team constantly drives new traffic, and we actively monitor and remove any leaked content. Every decision we make is focused on maximizing your earnings."
        }
      ]
    },
    {
      category: "Chatting & Fan Engagement",
      questions: [
        {
          question: "How does your chatting team work?",
          answer: "Our professional chatting team operates 24/7 in shifts so your fans are never left waiting. They're trained in proven engagement strategies to build genuine connections with your subscribers, upsell premium content, and maximize the lifetime value of every single fan on your page."
        },
        {
          question: "Will the chatting feel authentic to my fans?",
          answer: "Absolutely. We take time to learn your personality, tone, and style so every conversation feels natural and on-brand. Your fans won't notice a difference — they'll just feel more engaged and valued, which keeps them subscribed longer and spending more."
        },
        {
          question: "What is fan lifetime value and why does it matter?",
          answer: "Fan lifetime value (LTV) is the total amount a subscriber spends over their entire time on your page — not just the subscription fee. Our chatting strategies focus on building relationships that increase tips, PPV purchases, and custom requests, turning casual subscribers into loyal high-spending fans."
        },
        {
          question: "Do I have control over what my chatting team says?",
          answer: "100%. You set the boundaries and guidelines, and we operate strictly within them. You'll have full visibility into conversations, and we regularly check in with you to make sure everything aligns with your comfort level and brand image."
        }
      ]
    },
    {
      category: "Marketing & Traffic",
      questions: [
        {
          question: "How do you drive traffic to my page?",
          answer: "Our marketing team uses a combination of social media strategies, content promotion, platform-specific growth tactics, and targeted campaigns across multiple channels. We constantly test and optimize what works best for your niche to bring in a steady flow of new, paying subscribers."
        },
        {
          question: "Do you handle my social media accounts?",
          answer: "Yes — our social media management team handles posting schedules, content repurposing, engagement strategies, and growth tactics across platforms like Instagram, Twitter/X, TikTok, and Reddit. Everything is tailored to your brand and designed to funnel traffic to your page."
        },
        {
          question: "How quickly will I see new subscribers coming in?",
          answer: "Most models start seeing increased traffic within the first 1-2 weeks as our marketing strategies kick in. Significant subscriber growth typically happens within the first 30 days, with consistent scaling over the following months as we refine what works best for your audience."
        }
      ]
    },
    {
      category: "Content Protection & Problem Solving",
      questions: [
        {
          question: "What do you do about leaked content?",
          answer: "We actively monitor the internet for any leaked content and take immediate action to get it removed through DMCA takedowns and direct platform requests. Protecting your content is a top priority — we treat every leak as urgent and handle it so you don't have to stress about it."
        },
        {
          question: "What kind of problems can your team help me solve?",
          answer: "From account issues and chargebacks to dealing with difficult subscribers, platform policy questions, payment problems, and any unexpected situations — our team has seen it all. We handle the headaches so you can stay focused on creating and growing."
        },
        {
          question: "Is my personal information kept confidential?",
          answer: "Absolutely. Privacy and confidentiality are non-negotiable for us. Your personal details, earnings, strategies, and any sensitive information are kept strictly between you and our team. We operate with full discretion at all times."
        }
      ]
    },
    {
      category: "Earnings & Growth",
      questions: [
        {
          question: "How do you help increase my earnings?",
          answer: "We attack revenue from every angle — our chatting team maximizes fan spending through strategic engagement, our marketing team brings in fresh subscribers daily, and we optimize your pricing, PPV strategy, and content schedule based on real data. Most models see a significant income jump within the first month."
        },
        {
          question: "What kind of results can I realistically expect?",
          answer: "Results vary based on your starting point and consistency, but most of our models see 3-10x growth in their first 3 months. Some of our top performers have gone from a few hundred dollars to consistent five-figure months. We set realistic goals together and work relentlessly to hit them."
        },
        {
          question: "How does the revenue split work?",
          answer: "Our pricing is performance-based with a revenue share model — meaning we only win when you win. The exact split depends on the services you need and your current level. We'll discuss all the details transparently during your onboarding call so there are no surprises."
        },
        {
          question: "Are there any upfront costs or long-term contracts?",
          answer: "We don't believe in locking you into long contracts or charging hefty upfront fees. Our model is built on mutual success — if we're not delivering results, you're free to walk. We earn your trust through performance, not paperwork."
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-primary to-blue-900">
      {/* Decorative backgrounds */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-24 pb-16 overflow-hidden">
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
      <section className="py-4 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative animate-fade-in">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200 text-lg text-white placeholder-white/50"
            />
          </div>
        </div>
      </section>
      
      {/* FAQ Categories */}
      <section className="py-6 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFaqs.map((category, categoryIndex) => (
            <div key={category.category} className="mb-6 animate-fade-in" style={{ animationDelay: `${categoryIndex * 100}ms` }}>
              <h2 className="text-2xl font-bold text-white mb-4 text-center">{category.category}</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`${category.category}-${index}`}
                    className="group bg-white/10 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 overflow-hidden"
                  >
                    <AccordionTrigger 
                      className="px-6 py-4 text-left text-base font-semibold text-white group-hover:text-white/80 transition-all duration-300 [&[data-state=open]>svg]:rotate-180"
                    >
                      <div className="flex items-center w-full pr-4">
                        <span className="flex-1">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="text-white/70 leading-relaxed text-base">
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
              <HelpCircle className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white/80 mb-2">No results found</h3>
              <p className="text-white/60">Try searching with different keywords or browse our categories above.</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 animate-fade-in">
              <Clock className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">24/7</h3>
              <p className="text-white/70">Support Available</p>
            </div>
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <MessageCircle className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">&lt;24hrs</h3>
              <p className="text-white/70">Response Time</p>
            </div>
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <Shield className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">100%</h3>
              <p className="text-white/70">Confidential</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading animate-fade-in">
            Still Have Questions?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in">
            Our team is here to help you succeed. Get personalized answers and start your journey with us today.
          </p>
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/onboarding')}
              className="relative group bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white hover:text-primary hover:scale-105 transition-all duration-500 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] px-12 py-4 text-lg font-semibold rounded-xl overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10">Start Your Journey</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
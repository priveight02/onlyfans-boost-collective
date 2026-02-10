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
          answer: "We become your full business team. Our chatting specialists engage your fans around the clock to keep them spending and coming back, while our marketing crew drives fresh subscribers to your page every single day. On top of that, we handle leak removal, solve any problems that come up, and fine-tune your content strategy — so all you have to do is create and enjoy the results."
        },
        {
          question: "How do I apply to join Ozc Agency?",
          answer: "It's really easy — just fill out our quick onboarding form and tell us a bit about yourself. We review every single application within 24 hours, then we'll set up a friendly call to get to know you, answer all your questions, and figure out the best game plan together. No pressure, just a conversation."
        },
        {
          question: "Do I need to already have an OF page to join?",
          answer: "Not at all! Whether you're completely new or already have an established page, we've got you covered. If you're just getting started, we'll walk you through everything step by step — from setting up your page to building your brand. No experience needed, just the willingness to grow."
        },
        {
          question: "What makes Ozc Agency different from other agencies?",
          answer: "Most agencies just \"manage\" — we actually build your business. You get an entire team working for you 24/7: chatters keeping your fans engaged and spending, marketers bringing in new subs daily, and a support team that handles leaks, issues, and everything in between. We treat your page like our own because your success is literally our success."
        }
      ]
    },
    {
      category: "Chatting & Fan Engagement",
      questions: [
        {
          question: "How does your chatting team work?",
          answer: "Think of them as your fan relationship experts. They work in shifts around the clock so your DMs are never sitting unanswered. Every conversation is designed to make your fans feel special, build real connections, and naturally encourage tips, PPV purchases, and custom requests — all while staying true to your voice and personality."
        },
        {
          question: "Will the chatting feel authentic to my fans?",
          answer: "That's one of our top priorities. Before we start, we spend time learning how you talk, your vibe, your humor — everything that makes you, you. Your fans will feel like they're talking directly to you, just with way faster response times. The result? Happier fans who stick around longer and spend more."
        },
        {
          question: "What is fan lifetime value and why should I care?",
          answer: "It's the total amount a fan spends over their entire time on your page — way beyond just the monthly sub. Most models leave a ton of money on the table because they don't nurture their fans properly. Our chatting strategies turn one-time visitors into loyal, high-spending supporters who keep coming back month after month."
        },
        {
          question: "Do I have control over what my chatting team says?",
          answer: "Always. You set the rules, and we follow them — no exceptions. You'll have full access to see every conversation, and we check in regularly to make sure everything feels right. Your boundaries and comfort always come first. If something doesn't sit well with you, we adjust immediately."
        }
      ]
    },
    {
      category: "Marketing & Traffic",
      questions: [
        {
          question: "How do you drive traffic to my page?",
          answer: "We use a mix of proven strategies across Instagram, Twitter/X, TikTok, Reddit, and other platforms to get eyes on your content. Our team constantly tests new approaches, doubles down on what's working, and adapts to trends so you always have a fresh stream of potential subscribers finding you."
        },
        {
          question: "Do you handle my social media accounts?",
          answer: "Yes! We take care of your posting schedule, content repurposing, captions, engagement, and growth tactics across all your socials. Everything stays on-brand and is designed to funnel people straight to your page. You stay in control of what goes out — we just make sure it's consistent, strategic, and getting results."
        },
        {
          question: "How quickly will I start seeing new subscribers?",
          answer: "Most models notice a bump in traffic within the first week or two. Real, consistent growth usually kicks in within the first month as our strategies build momentum. From there, it just keeps compounding — the longer we work together, the stronger the results get."
        }
      ]
    },
    {
      category: "Content Protection & Problem Solving",
      questions: [
        {
          question: "What do you do about leaked content?",
          answer: "We take leaks seriously and act fast. Our team actively scans the internet for any unauthorized content and handles DMCA takedowns and removal requests immediately. You should never have to deal with that stress — we've got your back and we treat every situation with urgency and discretion."
        },
        {
          question: "What kind of problems can your team help me with?",
          answer: "Honestly, pretty much anything. Account issues, chargebacks, difficult subscribers, platform questions, payment hiccups — you name it. We've seen it all and know how to handle it quickly. Our job is to remove the stress from your plate so you can focus on what you do best."
        },
        {
          question: "Is my personal information kept confidential?",
          answer: "1000%. Your privacy is sacred to us. Everything — your real name, earnings, strategies, personal details — stays strictly between you and our team. We operate with complete discretion and will never share your information with anyone. Period."
        }
      ]
    },
    {
      category: "Earnings & Growth",
      questions: [
        {
          question: "How do you help increase my earnings?",
          answer: "We work every angle. Our chatters keep your fans engaged and spending, our marketers bring in fresh subscribers every day, and we constantly optimize your pricing, PPV strategy, and content schedule based on what the data tells us. Most models notice a real difference in their income within the very first month of working with us."
        },
        {
          question: "What kind of results can I realistically expect?",
          answer: "Every model is different, but here's what we typically see: most of our girls experience 3-10x growth within the first 3 months. Some have gone from making a few hundred dollars to consistent five-figure months. We'll set honest, realistic goals together and then do everything in our power to crush them."
        },
        {
          question: "How does the revenue split work?",
          answer: "We keep it simple and fair. Our model is performance-based — we take a percentage of the revenue we help generate, so we only make money when you make money. The exact split depends on what services you need, and we'll go over everything openly during your onboarding call. No hidden fees, no surprises."
        },
        {
          question: "Are there any upfront costs or long-term contracts?",
          answer: "Nope. We don't do long contracts or upfront fees. We believe the best way to earn your trust is by delivering results, not trapping you in paperwork. If at any point you feel it's not the right fit, you're free to go — but we're confident you'll want to stay once you see what we can do."
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
      <div className="relative pt-24 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <HelpCircle className="h-16 w-16 text-white animate-bounce" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300 animate-fade-in">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-2 animate-fade-in">
            Find answers to common questions about our services and how we can help you achieve success in content creation.
          </p>
        </div>
      </div>

      {/* Search Section */}
      <section className="py-2 relative z-10">
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
              <h2 className="text-2xl font-bold text-white mb-5 text-center">{category.category}</h2>
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
                      <div className="text-white/90 leading-relaxed text-base">
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
      <section className="py-8 relative z-10">
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
      <section className="pt-4 pb-16 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-heading animate-fade-in">
            Ready to Start Earning More?
          </h2>
          <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto animate-fade-in">
            Join the models already growing with Ozc Agency. Apply now and let's build your success together.
          </p>
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/onboarding')}
              className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 px-14 py-5 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl"
            >
              Apply Now — It's Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
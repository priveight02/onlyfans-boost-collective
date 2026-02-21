import { Link } from "react-router-dom";
import { ArrowRight, Clock, User, Calendar, BookOpen } from "lucide-react";
import Footer from "@/components/Footer";
import PageSEO from "@/components/PageSEO";

const blogPosts = [
  {
    slug: "what-is-uplyze",
    title: "What is Uplyze? The AI Platform for Creators",
    excerpt: "Discover how Uplyze combines artificial intelligence with smart tools to help creators automate growth, manage fans, and scale revenue like never before.",
    date: "February 18, 2026",
    readTime: "6 min read",
    author: "Uplyze Team",
    category: "Product",
  },
  {
    slug: "uplyze-vs-hubspot",
    title: "Uplyze vs HubSpot: Why Creators Choose Uplyze",
    excerpt: "HubSpot is built for enterprise sales teams. Uplyze is built for creators and agencies. Here's a side-by-side comparison of why top creators are making the switch.",
    date: "February 15, 2026",
    readTime: "8 min read",
    author: "Uplyze Team",
    category: "Comparison",
  },
  {
    slug: "scale-to-100k",
    title: "How Uplyze AI Helps Agencies Scale to $100K/mo",
    excerpt: "Learn the exact strategies and AI-powered workflows that agencies use inside Uplyze to go from $10K to $100K per month in managed revenue.",
    date: "February 12, 2026",
    readTime: "10 min read",
    author: "Uplyze Team",
    category: "Growth",
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      <PageSEO
        title="Uplyze Blog | AI Platform Insights & Growth Strategies | uplyze.ai"
        description="Read the Uplyze blog for AI Platform tips, creator growth strategies, and agency scaling guides. Learn how Uplyze helps you automate and 10x revenue at uplyze.ai."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Uplyze Blog",
          "url": "https://uplyze.ai/blog",
          "description": "AI Platform insights, creator growth strategies, and agency scaling guides from Uplyze.",
          "publisher": { "@type": "Organization", "name": "Uplyze", "url": "https://uplyze.ai" }
        }}
      />
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-primary/[0.05] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 text-xs font-medium uppercase tracking-widest mb-5">
            <BookOpen className="h-3.5 w-3.5" />
            Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Insights & Strategies
          </h1>
          <p className="text-[hsl(215,25%,65%)] text-lg max-w-2xl mx-auto leading-relaxed">
            Learn how top creators and agencies use AI to scale revenue, automate growth, and dominate their niche.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="space-y-5">
          {blogPosts.map((post, index) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block p-6 sm:p-8 rounded-2xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle gradient accent on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/20 text-primary text-xs font-semibold tracking-wide">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/35 text-xs">
                    <Clock className="h-3 w-3" /> {post.readTime}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors duration-300 mb-2.5">
                  {post.title}
                </h2>
                <p className="text-[hsl(215,25%,65%)] text-sm leading-relaxed mb-5">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-white/30 text-xs">
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {post.author}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {post.date}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    Read article <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Blog;

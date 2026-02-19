import { Link } from "react-router-dom";
import { ArrowRight, Clock, User, Calendar } from "lucide-react";
import Footer from "@/components/Footer";

const blogPosts = [
  {
    slug: "what-is-uplyze",
    title: "What is Uplyze? The AI CRM for Creators",
    excerpt: "Discover how Uplyze combines artificial intelligence with CRM to help creators automate growth, manage fans, and scale revenue like never before.",
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
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/60 text-xs font-medium uppercase tracking-widest mb-4">
            Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Insights & Strategies
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Learn how top creators and agencies use AI to scale revenue, automate growth, and dominate their niche.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-white/40 text-xs">
                  <Clock className="h-3 w-3" /> {post.readTime}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors mb-2">
                {post.title}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/30 text-xs">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.date}</span>
                </div>
                <span className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read <ArrowRight className="h-4 w-4" />
                </span>
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

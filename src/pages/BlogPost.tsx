import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, User, Calendar, Sparkles } from "lucide-react";
import Footer from "@/components/Footer";

const articles: Record<string, { title: string; date: string; readTime: string; author: string; category: string; content: string }> = {
  "what-is-uplyze": {
    title: "What is Uplyze? The AI Platform for Creators",
    date: "February 18, 2026",
    readTime: "6 min read",
    author: "Uplyze Team",
    category: "Product",
    content: `
## The Creator Economy Needs a New Kind of Platform

Traditional platforms were built for B2B sales teams chasing enterprise deals. They weren't designed for creators managing thousands of fans, running DM campaigns, and optimizing content across multiple platforms.

**Uplyze changes that.**

Uplyze is an AI-powered platform built specifically for creators, influencers, and the agencies that manage them. It combines intelligent automation, fan psychology insights, and revenue optimization into one unified platform.

## What Makes Uplyze Different?

### 1. AI-Powered Fan Management
Unlike traditional platforms that track "leads," Uplyze understands your fans. Our AI analyzes conversation patterns, spending behavior, and emotional engagement to help you build deeper connections that convert.

### 2. Automated DM Campaigns
Stop manually responding to hundreds of DMs. Uplyze's AI learns your voice and tone, then handles conversations at scale while maintaining authenticity. The AI adapts its approach based on each fan's behavior type.

### 3. Multi-Platform Intelligence
Instagram, OnlyFans, TikTok, Twitter — Uplyze unifies your audience data across every platform. One dashboard. One source of truth. Complete visibility into your creator business.

### 4. Revenue Analytics That Matter
Track PPV conversions, tip patterns, subscription churn, and lifetime fan value. Uplyze doesn't just show you numbers — it tells you exactly what to do to increase revenue.

## Who Is Uplyze For?

- **Solo Creators** looking to automate growth and maximize earnings
- **Agencies** managing multiple creator accounts at scale
- **Content Teams** collaborating on strategy and execution

## Getting Started

Uplyze offers a free tier so you can explore the platform before committing. Sign up, connect your accounts, and let the AI start working for you within minutes.

The future of creator management is here. It's intelligent. It's automated. It's Uplyze.
    `,
  },
  "uplyze-vs-hubspot": {
    title: "Uplyze vs HubSpot: Why Creators Choose Uplyze",
    date: "February 15, 2026",
    readTime: "8 min read",
    author: "Uplyze Team",
    category: "Comparison",
    content: `
## HubSpot Is Great — Just Not for Creators

HubSpot is one of the best platforms on the market. But it was built for SaaS companies, real estate firms, and enterprise sales teams. If you're a creator or agency managing talent, HubSpot will feel like trying to fit a square peg into a round hole.

Here's a detailed comparison of why creators and agencies are choosing Uplyze over HubSpot.

## Feature Comparison

### Fan Psychology vs Lead Scoring
**HubSpot** uses traditional lead scoring based on email opens, form fills, and website visits.

**Uplyze** uses AI-powered fan psychology profiling. We analyze conversation sentiment, spending patterns, attachment levels, and churn risk to give you a complete picture of every fan's emotional state and buying potential.

### DM Automation vs Email Marketing
**HubSpot** excels at email marketing sequences.

**Uplyze** automates DM conversations across Instagram, OnlyFans, and other platforms. Our AI doesn't just send templates — it adapts in real-time based on fan responses, using learned strategies from thousands of successful conversations.

### Creator Metrics vs Sales Pipeline
**HubSpot** tracks deals through sales pipelines.

**Uplyze** tracks PPV revenue, tip frequency, subscription retention, content performance, and fan lifetime value. Every metric is designed for the creator economy.

### Pricing: Built for Creators
**HubSpot** starts free but scales to $800-$3,600/month for meaningful features.

**Uplyze** offers a credit-based system where you only pay for what you use. No surprise bills. No enterprise minimums.

## The Verdict

If you're selling SaaS subscriptions to Fortune 500 companies, use HubSpot. If you're a creator or agency scaling revenue through fan engagement and content, **Uplyze is the clear choice**.

Both are excellent products. The difference is who they were built for. Uplyze was built for you.
    `,
  },
  "scale-to-100k": {
    title: "How Uplyze AI Helps Agencies Scale to $100K/mo",
    date: "February 12, 2026",
    readTime: "10 min read",
    author: "Uplyze Team",
    category: "Growth",
    content: `
## The $100K/Month Agency Playbook

Scaling a creator management agency is one of the most rewarding — and challenging — business models in the digital economy. The agencies that hit $100K/month all share one thing in common: **systems that scale without adding proportional headcount**.

Uplyze is the operating system behind many of these agencies. Here's exactly how they use it.

## Step 1: Centralize All Accounts

The first step is bringing every managed creator into one Uplyze workspace. Each account gets its own profile with dedicated:

- AI persona settings
- Revenue tracking
- Fan databases
- Content calendars
- DM automation rules

Most agencies manage 10-50+ accounts. Without centralization, you're drowning in browser tabs and spreadsheets.

## Step 2: Deploy AI Chat at Scale

The biggest bottleneck for agencies isn't finding creators — it's managing fan conversations. A single popular creator can receive 500+ DMs per day.

Uplyze's AI handles the volume:

- **Persona DNA Engine**: Each creator gets a unique AI voice trained on their communication style
- **Keyword Triggers**: Automated responses based on specific fan messages
- **Smart Escalation**: The AI knows when to hand off to a human chatter
- **Revenue Redirects**: Automated PPV offers and subscription upsells within natural conversation flow

## Step 3: Optimize Revenue Per Fan

Uplyze's analytics dashboard shows agencies exactly where money is being left on the table:

- Which fans haven't been contacted in 7+ days (churn risk)
- Which fans respond to PPV offers (high-value targets)
- Optimal posting times for maximum engagement
- Content types that drive the most tips and purchases

## Step 4: Scale the Team with Permissions

As your agency grows, you need team members with different access levels:

- **Chatters**: Can manage DMs but can't see financials
- **Managers**: Can see analytics and manage multiple accounts
- **Admins**: Full access to billing, settings, and team management

Uplyze's workspace system makes this effortless.

## Step 5: Track Everything

At $100K/month, you need bulletproof financial tracking:

- Revenue per account per month
- Agency commission calculations
- Chatter performance metrics
- Content ROI analysis

Uplyze generates these reports automatically.

## The Math

Here's the simplified math:
- 20 managed accounts
- Average $5,000/month revenue per account
- 20% agency commission = $1,000/account
- **$20,000/month in commissions**

Now scale to 40 accounts with Uplyze's automation handling the workload: **$40,000-$100,000/month** depending on account performance.

The agencies that win aren't working harder. They're working smarter with AI. That's what Uplyze enables.
    `,
  },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articles[slug] : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-[hsl(222,35%,8%)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Article not found</h1>
          <Link to="/blog" className="text-primary hover:underline">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(222,35%,8%)]">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.06] rounded-full blur-[150px] pointer-events-none" />

      <article className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <Link to="/blog" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-10 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Blog
        </Link>

        {/* Category & meta */}
        <div className="flex items-center gap-3 mb-5">
          <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/20 text-primary text-xs font-semibold tracking-wide">{article.category}</span>
          <span className="flex items-center gap-1.5 text-white/40 text-xs"><Clock className="h-3.5 w-3.5" /> {article.readTime}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">{article.title}</h1>

        {/* Author bar */}
        <div className="flex items-center gap-5 text-white/40 text-sm mb-12 pb-8 border-b border-white/[0.06]">
          <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {article.author}</span>
          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {article.date}</span>
        </div>

        {/* Article content */}
        <div className="space-y-5">
          {article.content.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('## ')) return (
              <h2 key={i} className="text-[1.65rem] font-bold text-white mt-14 mb-5 tracking-tight flex items-center gap-3">
                <span className="w-1 h-7 rounded-full bg-gradient-to-b from-primary to-blue-400 flex-shrink-0" />
                {trimmed.replace('## ', '')}
              </h2>
            );
            if (trimmed.startsWith('### ')) return (
              <h3 key={i} className="text-lg font-semibold text-white/90 mt-8 mb-3 pl-4 border-l-2 border-primary/30">{trimmed.replace('### ', '')}</h3>
            );
            if (trimmed.startsWith('- **')) {
              const match = trimmed.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
              if (match) return (
                <li key={i} className="text-[hsl(215,25%,76%)] leading-relaxed text-[15px] ml-5 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                  <span><strong className="text-white/90 font-semibold">{match[1]}</strong>{match[2] ? `: ${match[2]}` : ''}</span>
                </li>
              );
            }
            if (trimmed.startsWith('- ')) return (
              <li key={i} className="text-[hsl(215,25%,76%)] leading-relaxed text-[15px] ml-5 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 flex-shrink-0" />
                <span>{trimmed.replace('- ', '')}</span>
              </li>
            );
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) return (
              <p key={i} className="text-white/90 font-semibold leading-relaxed text-[15px] py-2 px-4 rounded-lg bg-primary/[0.06] border-l-2 border-primary/30">{trimmed.replace(/\*\*/g, '')}</p>
            );
            // Handle inline bold
            const parts = trimmed.split(/(\*\*.+?\*\*)/g);
            return (
              <p key={i} className="text-[hsl(215,25%,76%)] leading-[1.8] text-[15px]">
                {parts.map((part, j) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={j} className="text-white/90 font-semibold">{part.replace(/\*\*/g, '')}</strong>
                    : part
                )}
              </p>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-20 p-8 sm:p-10 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent pointer-events-none" />
          <div className="relative">
            <Sparkles className="h-6 w-6 text-primary/60 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Ready to scale with AI?</h3>
            <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">Join 700+ creators and agencies already using Uplyze to automate growth.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;

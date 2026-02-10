import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profileData } = await req.json();
    if (!profileData) {
      return new Response(JSON.stringify({ error: "Missing profile data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a comprehensive data summary for the AI to analyze
    const profile = profileData.profile || {};
    const earnings = profileData.earnings;
    const earningsByType = profileData.earningsByType;
    const subscriberStats = profileData.subscriberStats;
    const subscriberMetrics = profileData.subscriberMetrics;
    const topPercentage = profileData.topPercentage;
    const chargebackRatio = profileData.chargebackRatio;
    const massMessagingOverview = profileData.massMessagingOverview;
    const topMessage = profileData.topMessage;
    const trackingLinks = profileData.trackingLinks;
    const trialLinks = profileData.trialLinks;
    const promotions = profileData.promotions;
    const payoutBalances = profileData.payoutBalances;
    const transactions = profileData.transactions;
    const posts = profileData.posts;
    const stories = profileData.stories;
    const vaultMedia = profileData.vaultMedia;
    const chats = profileData.chats;
    const directMessages = profileData.directMessages;
    const socialMediaButtons = profileData.socialMediaButtons;
    const settings = profileData.settings;
    const yearlyEarnings = profileData.yearlyEarnings;
    const profileVisitors = profileData.profileVisitors;
    const activeFans = profileData.activeFans;
    const topFansTotal = profileData.topFansTotal;
    const expiredFans = profileData.expiredFans;
    const latestFans = profileData.latestFans;
    const queueCounts = profileData.queueCounts;
    const subscriptionBundles = profileData.subscriptionBundles;
    const notificationCounts = profileData.notificationCounts;
    const chargebacks = profileData.chargebacks;
    const chargebackStats = profileData.chargebackStats;
    const userLists = profileData.userLists;

    const systemPrompt = `You are an elite creator economy analyst, growth strategist, and agency management consultant. You have access to comprehensive API data from 60+ endpoints. Analyze EVERYTHING available and provide the most thorough, actionable intelligence report possible.

Your analysis MUST cover ALL of these sections in depth:

## 1. EXECUTIVE SUMMARY
- One-paragraph overview of the creator's position, strengths, and biggest opportunities
- Overall health score (1-10) with justification

## 2. REVENUE ANALYSIS
- Current earnings breakdown (subscriptions, tips, PPV, messages, streams)
- Revenue per subscriber calculation
- Monthly/yearly trends and growth trajectory
- Revenue concentration risk (how dependent on one income stream)
- Payout balance analysis and cash flow health
- Chargeback ratio assessment and risk level
- Transaction pattern analysis

## 3. SUBSCRIBER & FAN INTELLIGENCE
- Subscriber count analysis and growth rate
- New vs renewed subscriber ratio
- Fan retention and churn signals
- Top fan spending patterns
- Expired fan analysis and win-back opportunities
- Free vs paid subscriber distribution
- Subscriber lifetime value estimation

## 4. CONTENT STRATEGY DEEP DIVE
- Photo vs video ratio optimization
- Posting frequency and optimal cadence
- Media per post analysis
- Content library depth and perceived value
- Story usage and engagement
- Vault organization assessment
- Content queue and scheduling patterns
- Pinned post strategy

## 5. PRICING & MONETIZATION
- Subscription price positioning vs market
- Bundle strategy effectiveness
- Tip range optimization
- PPV pricing signals from top messages
- Free trial link strategy analysis
- Promotion effectiveness
- Revenue per content piece estimation

## 6. ENGAGEMENT & MESSAGING
- Engagement rate analysis (favorites/posts ratio)
- Mass messaging performance (sent, viewed, purchased)
- Direct message strategy
- Top performing message analysis
- Chat activity levels
- Notification patterns

## 7. TRAFFIC & GROWTH
- Profile visitor trends
- Visit-to-subscriber conversion rate
- Social media presence (linked platforms)
- Bio optimization score
- Cross-platform traffic funnel analysis
- Tracking link performance
- SEO and discoverability signals

## 8. COMPETITIVE POSITIONING
- Top percentage ranking analysis
- Price positioning relative to content volume
- Content quality signals from engagement data
- Market niche identification from bio and content

## 9. RISK ASSESSMENT
- Chargeback risk level
- Revenue concentration risk
- Content sustainability (posting rate vs burnout)
- Platform dependency risks
- Subscriber churn risk
- Red flags or warning signs

## 10. MANAGEMENT ACTION PLAN
- Top 10 prioritized, specific actions to take THIS WEEK
- Top 5 actions for THIS MONTH
- Long-term (90-day) strategic goals
- Each action must include expected impact and difficulty level

## 11. REPLICABLE PLAYBOOK
- The exact strategies other creators should copy from this profile
- What NOT to copy
- Customization recommendations based on different niches

## 12. FINANCIAL PROJECTIONS
- Estimated monthly revenue trajectory
- Growth scenarios (conservative, moderate, aggressive)
- Key metrics to track weekly

Use ONLY the data provided. Mark inferences clearly with [Inferred]. Be direct, specific, and brutally honest. Use numbers and percentages wherever possible. Format with markdown headers, bullet points, and bold for key insights.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this creator profile with ALL available data. Leave no data point unexamined:\n\n${JSON.stringify(profileData, null, 2)}` },
        ],
        stream: true,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

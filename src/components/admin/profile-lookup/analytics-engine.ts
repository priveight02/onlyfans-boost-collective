import type { ProfileData, EstimatedEarnings, EngagementMetrics, TrafficInsight } from "./types";

export function computeEstimatedEarnings(p: ProfileData): EstimatedEarnings {
  const subs = p.subscribersCount ?? estimateSubscribers(p);
  const price = p.subscribePrice;
  const isFree = price === 0;

  // Base subscription revenue
  const subRevMonthly = subs * price * 0.8; // 80% OF cut

  // Tip revenue estimation based on engagement signals
  const tipMultiplier = p.tipsEnabled ? (p.favoritedCount > 10000 ? 0.35 : p.favoritedCount > 1000 ? 0.25 : 0.15) : 0.05;
  const estimatedTipRevMonthly = isFree ? subs * 2.5 * tipMultiplier : subRevMonthly * tipMultiplier;

  // PPV / message revenue estimation
  const ppvMultiplier = p.videosCount > 100 ? 0.3 : p.videosCount > 30 ? 0.2 : 0.1;
  const ppvRevMonthly = isFree ? subs * 5 * ppvMultiplier : subRevMonthly * ppvMultiplier;

  // Stream revenue
  const streamRev = p.finishedStreamsCount > 0 ? p.finishedStreamsCount * 50 : 0;

  const totalMonthlyMid = subRevMonthly + estimatedTipRevMonthly + ppvRevMonthly + streamRev;
  const variance = 0.35;

  return {
    daily: {
      low: Math.round((totalMonthlyMid * (1 - variance)) / 30),
      mid: Math.round(totalMonthlyMid / 30),
      high: Math.round((totalMonthlyMid * (1 + variance)) / 30),
    },
    monthly: {
      low: Math.round(totalMonthlyMid * (1 - variance)),
      mid: Math.round(totalMonthlyMid),
      high: Math.round(totalMonthlyMid * (1 + variance)),
    },
    yearly: {
      low: Math.round(totalMonthlyMid * 12 * (1 - variance)),
      mid: Math.round(totalMonthlyMid * 12),
      high: Math.round(totalMonthlyMid * 12 * (1 + variance)),
    },
  };
}

function estimateSubscribers(p: ProfileData): number {
  // Heuristic: favorited count correlates with subscriber count
  if (p.favoritedCount > 0) {
    return Math.round(p.favoritedCount * 0.15);
  }
  return Math.round(p.mediasCount * 0.5);
}

export function computeEngagementMetrics(p: ProfileData): EngagementMetrics {
  const accountAge = Math.max(1, Math.floor((Date.now() - new Date(p.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const avgPostsPerMonth = p.postsCount / accountAge;
  const avgMediaPerPost = p.postsCount > 0 ? p.mediasCount / p.postsCount : 0;
  const subs = p.subscribersCount ?? estimateSubscribers(p);

  // Engagement score (0-100)
  const favPerSub = subs > 0 ? p.favoritedCount / subs : 0;
  const engagementScore = Math.min(100, Math.round(
    (Math.min(favPerSub, 5) / 5) * 40 +
    (Math.min(avgPostsPerMonth, 30) / 30) * 30 +
    (p.isActive ? 20 : 0) +
    (p.hasStories ? 10 : 0)
  ));

  // Content frequency score
  const contentFrequency = Math.min(100, Math.round((avgPostsPerMonth / 30) * 100));

  // Media ratio
  const mediaRatio = p.postsCount > 0 ? Math.round((p.mediasCount / p.postsCount) * 100) / 100 : 0;

  // Photo to video ratio
  const totalMedia = p.photosCount + p.videosCount;
  const photoVideoRatio = totalMedia > 0 ? Math.round((p.photosCount / totalMedia) * 100) : 50;

  // Monetization score
  const hasPrice = p.subscribePrice > 0;
  const hasTips = p.tipsEnabled;
  const hasStreams = p.finishedStreamsCount > 0;
  const monetizationScore = Math.min(100,
    (hasPrice ? 30 : 10) +
    (hasTips ? 20 : 0) +
    (hasStreams ? 15 : 0) +
    (p.videosCount > 50 ? 20 : p.videosCount > 10 ? 10 : 0) +
    (p.favoritedCount > 5000 ? 15 : p.favoritedCount > 500 ? 10 : 5)
  );

  // Audience score
  const audienceScore = Math.min(100, Math.round(
    (Math.min(subs, 10000) / 10000) * 40 +
    (Math.min(p.favoritedCount, 50000) / 50000) * 40 +
    (p.isVerified ? 20 : 0)
  ));

  // Content diversity
  const contentDiversityScore = Math.min(100,
    (p.photosCount > 0 ? 20 : 0) +
    (p.videosCount > 0 ? 25 : 0) +
    (p.finishedStreamsCount > 0 ? 20 : 0) +
    (p.hasStories ? 15 : 0) +
    (p.hasPinnedPosts ? 10 : 0) +
    (p.tipsEnabled ? 10 : 0)
  );

  return {
    engagementScore,
    contentFrequency,
    mediaRatio,
    photoVideoRatio,
    monetizationScore,
    audienceScore,
    contentDiversityScore,
    accountAge,
    avgPostsPerMonth: Math.round(avgPostsPerMonth * 10) / 10,
    avgMediaPerPost: Math.round(avgMediaPerPost * 10) / 10,
  };
}

export function computeTrafficInsights(p: ProfileData, metrics: EngagementMetrics): TrafficInsight[] {
  const insights: TrafficInsight[] = [];

  // Content strategy
  if (p.videosCount > p.photosCount * 0.5) {
    insights.push({
      label: "Video-Heavy Strategy",
      description: "Strong video content presence drives higher engagement and PPV potential. Videos generate 3-5x more revenue per view than photos.",
      strength: "high",
      icon: "video",
    });
  } else if (p.photosCount > 0) {
    insights.push({
      label: "Photo-Dominant Content",
      description: "Primarily photo-based content. Consider increasing video output for higher monetization and engagement.",
      strength: p.photosCount > 500 ? "medium" : "low",
      icon: "image",
    });
  }

  // Posting consistency
  if (metrics.avgPostsPerMonth >= 20) {
    insights.push({
      label: "High Posting Frequency",
      description: `Averaging ${metrics.avgPostsPerMonth} posts/month indicates a consistent content machine. This drives algorithm visibility and subscriber retention.`,
      strength: "high",
      icon: "trending-up",
    });
  } else if (metrics.avgPostsPerMonth >= 8) {
    insights.push({
      label: "Moderate Posting Cadence",
      description: `${metrics.avgPostsPerMonth} posts/month is sustainable but increasing to 20+ could significantly boost visibility and earnings.`,
      strength: "medium",
      icon: "activity",
    });
  } else {
    insights.push({
      label: "Low Content Velocity",
      description: `Only ${metrics.avgPostsPerMonth} posts/month. Increasing posting frequency is the single highest-impact growth lever.`,
      strength: "low",
      icon: "alert-triangle",
    });
  }

  // Audience loyalty
  const favRatio = (p.subscribersCount ?? 0) > 0 ? p.favoritedCount / (p.subscribersCount ?? 1) : p.favoritedCount / 100;
  if (favRatio > 3) {
    insights.push({
      label: "Strong Audience Loyalty",
      description: "High favorite-to-subscriber ratio suggests strong word-of-mouth and organic discovery. Audience is highly engaged and likely to convert.",
      strength: "high",
      icon: "heart",
    });
  } else if (favRatio > 1) {
    insights.push({
      label: "Growing Audience",
      description: "Moderate engagement signals. Focus on interactive content (polls, DMs, custom requests) to deepen fan relationships.",
      strength: "medium",
      icon: "users",
    });
  }

  // Pricing strategy
  if (p.subscribePrice === 0) {
    insights.push({
      label: "Free Profile — Funnel Model",
      description: "Free subscription acts as a top-of-funnel acquisition tool. Revenue is driven by PPV, tips, and custom content upsells.",
      strength: "medium",
      icon: "dollar-sign",
    });
  } else if (p.subscribePrice > 15) {
    insights.push({
      label: "Premium Pricing",
      description: `$${p.subscribePrice}/mo positions as premium. Works well with high-quality, exclusive content but may limit volume growth.`,
      strength: p.favoritedCount > 5000 ? "high" : "medium",
      icon: "crown",
    });
  } else {
    insights.push({
      label: "Competitive Pricing",
      description: `$${p.subscribePrice}/mo is accessible. Good balance between volume acquisition and per-subscriber revenue.`,
      strength: "medium",
      icon: "tag",
    });
  }

  // Live streaming
  if (p.finishedStreamsCount > 10) {
    insights.push({
      label: "Active Live Streamer",
      description: `${p.finishedStreamsCount} completed streams. Live content builds real-time connection and generates significant tip revenue.`,
      strength: "high",
      icon: "radio",
    });
  } else if (p.finishedStreamsCount > 0) {
    insights.push({
      label: "Occasional Streamer",
      description: "Some live streaming activity. Increasing stream frequency could unlock a significant untapped revenue channel.",
      strength: "low",
      icon: "radio",
    });
  }

  // Account maturity
  if (metrics.accountAge > 24) {
    insights.push({
      label: "Established Creator",
      description: `${Math.floor(metrics.accountAge / 12)}+ years on platform. Established accounts benefit from algorithmic trust and accumulated audience.`,
      strength: "high",
      icon: "award",
    });
  } else if (metrics.accountAge > 6) {
    insights.push({
      label: "Growing Creator",
      description: `${metrics.accountAge} months on platform. In the growth phase where consistent content and promotion matter most.`,
      strength: "medium",
      icon: "trending-up",
    });
  }

  // Verification status
  if (p.isVerified) {
    insights.push({
      label: "Verified Account",
      description: "Verification badge increases trust, click-through rates, and conversion from social media traffic.",
      strength: "high",
      icon: "check-circle",
    });
  }

  return insights;
}

export function generateMonthlyProjection(earnings: EstimatedEarnings, months: number = 12) {
  return Array.from({ length: months }, (_, i) => {
    const growthFactor = 1 + (i * 0.02); // 2% monthly growth assumption
    return {
      month: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      low: Math.round(earnings.monthly.low * growthFactor),
      mid: Math.round(earnings.monthly.mid * growthFactor),
      high: Math.round(earnings.monthly.high * growthFactor),
    };
  });
}

export function generateContentBreakdown(p: ProfileData) {
  return [
    { name: "Photos", value: p.photosCount, color: "#60a5fa" },
    { name: "Videos", value: p.videosCount, color: "#f59e0b" },
    { name: "Streams", value: p.finishedStreamsCount, color: "#a78bfa" },
  ].filter(c => c.value > 0);
}

export function generateRevenueBreakdown(p: ProfileData, earnings: EstimatedEarnings) {
  const price = p.subscribePrice;
  const subs = p.subscribersCount ?? Math.round(p.favoritedCount * 0.15);
  const subRev = subs * price * 0.8;
  const totalMid = earnings.monthly.mid;

  if (totalMid === 0) return [];

  const tipsShare = p.tipsEnabled ? (price === 0 ? 0.3 : 0.2) : 0.05;
  const ppvShare = p.videosCount > 100 ? 0.25 : 0.15;
  const subsShare = Math.max(0, 1 - tipsShare - ppvShare - (p.finishedStreamsCount > 0 ? 0.1 : 0));

  const result = [
    { name: "Subscriptions", value: Math.round(totalMid * subsShare), color: "#34d399" },
    { name: "Tips", value: Math.round(totalMid * tipsShare), color: "#f472b6" },
    { name: "PPV / Messages", value: Math.round(totalMid * ppvShare), color: "#60a5fa" },
  ];

  if (p.finishedStreamsCount > 0) {
    result.push({ name: "Streams", value: Math.round(totalMid * 0.1), color: "#a78bfa" });
  }

  return result;
}

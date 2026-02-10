export interface ProfileData {
  name: string;
  username: string;
  about: string;
  avatar: string;
  header: string;
  subscribersCount: number | null;
  subscribePrice: number;
  mediasCount: number;
  photosCount: number;
  videosCount: number;
  postsCount: number;
  favoritedCount: number;
  isVerified: boolean;
  joinDate: string;
  location: string;
  website: string;
  isActive: boolean;
  tipsEnabled: boolean;
  tipsMin: number;
  tipsMax: number;
  finishedStreamsCount: number;
  hasPinnedPosts: boolean;
  hasStories: boolean;
  ofapi_gender: string;
  ofapi_gender_confidence: number;
}

export interface EstimatedEarnings {
  daily: { low: number; mid: number; high: number };
  monthly: { low: number; mid: number; high: number };
  yearly: { low: number; mid: number; high: number };
}

export interface EngagementMetrics {
  engagementScore: number;
  contentFrequency: number;
  mediaRatio: number;
  photoVideoRatio: number;
  monetizationScore: number;
  audienceScore: number;
  contentDiversityScore: number;
  accountAge: number;
  avgPostsPerMonth: number;
  avgMediaPerPost: number;
}

export interface TrafficInsight {
  label: string;
  description: string;
  strength: "high" | "medium" | "low";
  icon: string;
}

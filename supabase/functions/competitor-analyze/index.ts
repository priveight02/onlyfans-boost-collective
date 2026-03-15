import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX = 20;
const NO_ESTIMATE_PATTERN = /\b(estimate|estimated|approx|approximately|around|about|projected|forecast|modeled|assumed|inferred)\b/i;

/** Strip markdown fences and extract clean JSON from AI text responses */
const cleanJsonResponse = (text: string): string => {
  if (!text || typeof text !== "string") return text;
  // Remove markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find JSON boundaries
  const startIdx = cleaned.search(/[\{\[]/);
  if (startIdx === -1) return cleaned;
  const startChar = cleaned[startIdx];
  const endChar = startChar === "{" ? "}" : "]";
  // Find matching end using stack
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length === 0) return cleaned.slice(startIdx, i + 1);
    }
  }
  // Unbalanced - try to repair truncated JSON
  let truncated = cleaned.slice(startIdx);
  // Remove trailing commas
  truncated = truncated.replace(/,\s*$/, "");
  // Close open braces/brackets
  while (stack.length > 0) {
    const open = stack.pop();
    truncated += open === "{" ? "}" : "]";
  }
  return truncated;
};
const UNVERIFIED_PATTERN = /\b(no verified data|not available|unknown|n\/a|unverified|insufficient data|no public data)\b/i;

const sanitizeFinancialValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return "Not publicly disclosed";

  if (Array.isArray(value)) return value.map((item) => sanitizeFinancialValue(item));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeFinancialValue(v);
    }
    return out;
  }

  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return "Not publicly disclosed";
  if (NO_ESTIMATE_PATTERN.test(trimmed) || UNVERIFIED_PATTERN.test(trimmed)) {
    return "Not publicly disclosed";
  }

  return trimmed;
};

const sanitizeFinancialPayload = <T>(payload: T): T => sanitizeFinancialValue(payload) as T;

const financialTool = {
  type: "function" as const,
  function: {
    name: "financial_report",
    description: "Return a factual financial intelligence report with latest verifiable values only.",
    parameters: {
      type: "object",
      properties: {
        companyOverview: {
          type: "object",
          properties: {
            estimatedEmployees: { type: "string", description: "Latest verifiable employee count with source/date." },
            foundedYear: { type: "string" },
            businessModel: { type: "string" },
            stage: { type: "string" },
            industry: { type: "string" },
          },
          required: ["estimatedEmployees", "foundedYear", "businessModel", "stage", "industry"],
        },
        trafficEstimates: {
          type: "object",
          properties: {
            dailyVisitors: { type: "string", description: "Latest verified value (or derived from verified monthly value)." },
            weeklyVisitors: { type: "string", description: "Latest verified value (or derived from verified monthly value)." },
            monthlyVisitors: { type: "string", description: "Latest verified value with source/date." },
            yearlyVisitors: { type: "string", description: "Latest verified value with source/date." },
            bounceRate: { type: "string" },
            avgSessionDuration: { type: "string" },
            topTrafficSources: {
              type: "array",
              items: {
                type: "object",
                properties: { source: { type: "string" }, percentage: { type: "string" } },
                required: ["source", "percentage"],
              },
            },
            topCountries: {
              type: "array",
              items: {
                type: "object",
                properties: { country: { type: "string" }, percentage: { type: "string" } },
                required: ["country", "percentage"],
              },
            },
            growthTrend: { type: "string" },
          },
          required: ["dailyVisitors", "weeklyVisitors", "monthlyVisitors", "yearlyVisitors", "bounceRate", "avgSessionDuration", "growthTrend"],
        },
        revenueEstimates: {
          type: "object",
          properties: {
            dailyRevenue: { type: "string", description: "Latest verified value (or derived from verified annual/quarterly value)." },
            weeklyRevenue: { type: "string", description: "Latest verified value (or derived from verified annual/quarterly value)." },
            monthlyRevenue: { type: "string", description: "Latest verified value (or derived from verified annual/quarterly value)." },
            yearlyRevenue: { type: "string", description: "Latest verified annual/TTM revenue with source/date." },
            revenueModel: { type: "string" },
            averageOrderValue: { type: "string" },
            estimatedConversionRate: { type: "string" },
            mrr: { type: "string" },
            arr: { type: "string" },
            ltv: { type: "string" },
            cac: { type: "string" },
            churnRate: { type: "string" },
          },
          required: ["dailyRevenue", "weeklyRevenue", "monthlyRevenue", "yearlyRevenue", "revenueModel", "averageOrderValue", "mrr", "arr", "ltv", "cac", "churnRate"],
        },
        incomeSources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              estimatedShare: { type: "string", description: "Verified share or 'Not publicly disclosed'." },
              type: { type: "string" },
              details: { type: "string" },
            },
            required: ["source", "estimatedShare", "type", "details"],
          },
        },
        pricingAnalysis: {
          type: "object",
          properties: {
            plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "string" },
                  billing: { type: "string" },
                  features: { type: "string" },
                },
                required: ["name", "price", "billing", "features"],
              },
            },
            creditPackages: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, credits: { type: "string" }, price: { type: "string" } },
                required: ["name", "credits", "price"],
              },
            },
            hasFreeTrialOrTier: { type: "string" },
            upsells: { type: "string" },
            crossSells: { type: "string" },
            downsells: { type: "string" },
          },
          required: ["plans", "hasFreeTrialOrTier"],
        },
        competitivePosition: {
          type: "object",
          properties: {
            marketShare: { type: "string" },
            mainCompetitors: { type: "array", items: { type: "string" } },
            competitiveAdvantage: { type: "string" },
            vulnerabilities: { type: "array", items: { type: "string" } },
          },
          required: ["marketShare", "mainCompetitors", "competitiveAdvantage", "vulnerabilities"],
        },
        growthIndicators: {
          type: "object",
          properties: {
            techMaturity: { type: "string" },
            marketingEfficiency: { type: "string" },
            productMarketFit: { type: "string" },
            scalabilityScore: { type: "string" },
            overallHealthScore: { type: "string" },
          },
          required: ["techMaturity", "marketingEfficiency", "productMarketFit", "scalabilityScore", "overallHealthScore"],
        },
        dataFreshness: {
          type: "object",
          properties: {
            generatedOn: { type: "string" },
            latestFinancialPeriod: { type: "string" },
            latestTrafficPeriod: { type: "string" },
            recencyCheck: { type: "string" },
          },
          required: ["generatedOn", "latestFinancialPeriod", "latestTrafficPeriod", "recencyCheck"],
        },
        sourceLedger: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string" },
              value: { type: "string" },
              sourceName: { type: "string" },
              sourceUrl: { type: "string" },
              sourceType: { type: "string" },
              publishedOn: { type: "string" },
            },
            required: ["metric", "value", "sourceName", "sourceUrl", "sourceType", "publishedOn"],
          },
        },
        confidenceLevel: { type: "string" },
        methodology: { type: "string" },
      },
      required: [
        "companyOverview",
        "trafficEstimates",
        "revenueEstimates",
        "incomeSources",
        "pricingAnalysis",
        "competitivePosition",
        "growthIndicators",
        "dataFreshness",
        "sourceLedger",
        "confidenceLevel",
        "methodology",
      ],
    },
  },
};

/** Scraped platform metric shape */
type ScrapedMetrics = {
  followers?: number;
  following?: number;
  description?: string;
  posts?: number;
  engagementRate?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  avgShares?: number;
  totalLikes?: number;
  totalViews?: number;
  postFrequency?: number;
  growthRate?: number;
  followerGain30d?: number;
  viewGain30d?: number;
  likeGain30d?: number;
};

/** Batch-scrape social profiles via Jina Reader → SocialBlade for accurate metrics */
const scrapeSocialProfiles = async (
  socialPresence: Record<string, string | null>,
): Promise<Record<string, ScrapedMetrics>> => {
  const results: Record<string, ScrapedMetrics> = {};

  const fetchWithTimeout = async (
    url: string,
    options?: { ms?: number; maxChars?: number; headers?: Record<string, string> },
  ): Promise<string> => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), options?.ms ?? 12000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          ...(options?.headers || {}),
        },
      });
      if (!res.ok) return "";
      const text = await res.text();
      return text.slice(0, options?.maxChars ?? 400000);
    } catch {
      return "";
    } finally {
      clearTimeout(tid);
    }
  };

  /** Fetch via Jina Reader for rendered markdown (bypasses bot protection) */
  const fetchJina = async (url: string): Promise<string> => {
    return fetchWithTimeout(`https://r.jina.ai/${url}`, { ms: 15000, maxChars: 400000 });
  };

  /** Parse "Last 30 days" row from SocialBlade markdown table */
  const extractLast30Row = (text: string): number[] => {
    const row = text.match(/Last\s*30\s*days\s*\|\s*([^\n\r]+)/i)?.[1] || "";
    if (!row) return [];
    return [...row.matchAll(/[-+]?\s*\d[\d,.]*\s*[KMBkmb]?/g)]
      .map((m) => parseHumanNumber(m[0].replace(/\s/g, "")))
      .filter((n) => Number.isFinite(n));
  };

  /** Parse SocialBlade markdown for Instagram metrics */
  const parseInstagramSB = (md: string): ScrapedMetrics => {
    const out: ScrapedMetrics = {};

    const followersMatch = md.match(/followers\s*\n\s*([\d,]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);

    const followingMatch = md.match(/following\s*\n\s*([\d,]+)/i);
    if (followingMatch) out.following = parseHumanNumber(followingMatch[1]);

    const mediaMatch = md.match(/media\s*count\s*\n\s*([\d,]+)/i);
    if (mediaMatch) out.posts = parseHumanNumber(mediaMatch[1]);

    const erMatch = md.match(/engagement\s*rate\s*\n\s*([\d.,]+%)/i);
    if (erMatch) {
      const er = parseFloat(erMatch[1].replace(/%/, ""));
      if (Number.isFinite(er)) out.engagementRate = er;
    }

    const likesMatch = md.match(/average\s*likes\s*\n\s*([\d,.\sKMBkmb]+)/i);
    if (likesMatch) {
      const v = parseHumanNumber(likesMatch[1].replace(/,/g, ""));
      if (v > 0) out.avgLikes = v;
    }

    const commentsMatch = md.match(/average\s*comments\s*\n\s*([\d,.\sKMBkmb]+)/i);
    if (commentsMatch) {
      const v = parseHumanNumber(commentsMatch[1].replace(/,/g, ""));
      if (v >= 0) out.avgComments = v;
    }

    // Total likes from profile if available
    const totalLikesMatch = md.match(/total\s*likes\s*\n\s*([\d,.KMBkmb]+)/i);
    if (totalLikesMatch) out.totalLikes = parseHumanNumber(totalLikesMatch[1]);

    // Last 30 days: followerGain, followingGain, mediaGain
    const gains = extractLast30Row(md);
    if (gains.length >= 3) {
      const followerGain = gains[0];
      const mediaGain = gains[2];
      out.followerGain30d = followerGain;
      if (Number.isFinite(mediaGain) && mediaGain !== 0) {
        out.postFrequency = Math.abs((mediaGain / 30) * 7);
      }
      if (out.followers && out.followers > 0) {
        out.growthRate = (followerGain / out.followers) * 100;
      }
    }

    return out;
  };

  /** Parse SocialBlade markdown for TikTok metrics */
  const parseTikTokSB = (md: string): typeof results[string] => {
    const out: typeof results[string] = {};

    // Followers
    const followersMatch = md.match(/followers\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);

    // Total likes
    let totalLikes = 0;
    const likesMatch = md.match(/likes\s*\n\s*([\d,.KMBkmb]+)/i);
    if (likesMatch) totalLikes = parseHumanNumber(likesMatch[1]);

    // Videos
    const videosMatch = md.match(/videos\s*\n\s*([\d,.KMBkmb]+)/i);
    if (videosMatch) out.posts = parseHumanNumber(videosMatch[1]);

    // Avg likes = total likes / total videos
    if (totalLikes > 0 && out.posts && out.posts > 0) {
      out.avgLikes = Math.round(totalLikes / out.posts);
    }

    // Last 30 days: followerGain, followingGain, likesGain, videoGain
    const gains = extractLast30Row(md);
    if (gains.length >= 4) {
      const followerGain = gains[0];
      const videoGain = gains[3];
      if (Number.isFinite(videoGain) && videoGain !== 0) {
        out.postFrequency = Math.abs((videoGain / 30) * 7);
      }
      if (out.followers && out.followers > 0) {
        out.growthRate = (followerGain / out.followers) * 100;
      }
    }

    // Derive ER from avg likes / followers
    if (out.avgLikes && out.followers && out.followers > 0) {
      out.engagementRate = (out.avgLikes / out.followers) * 100;
    }

    return out;
  };

  /** Parse SocialBlade markdown for YouTube metrics */
  const parseYouTubeSB = (md: string): typeof results[string] => {
    const out: typeof results[string] = {};

    // Subscribers
    const subMatch = md.match(/(?:subscribers?|subs?)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (subMatch) out.followers = parseHumanNumber(subMatch[1]);

    // Videos
    const vidMatch = md.match(/(?:videos?|uploads?)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (vidMatch) out.posts = parseHumanNumber(vidMatch[1]);

    // Last 30 days: subGain, viewGain, videoGain (YouTube format varies)
    const gains = extractLast30Row(md);
    if (gains.length >= 3) {
      const subGain = gains[0];
      const videoGain = gains[gains.length - 1]; // last column is usually videos
      if (Number.isFinite(videoGain) && videoGain !== 0) {
        out.postFrequency = Math.abs((videoGain / 30) * 7);
      }
      if (out.followers && out.followers > 0) {
        out.growthRate = (subGain / out.followers) * 100;
      }
    }

    return out;
  };

  /** Parse SocialBlade markdown for Twitter/X metrics */
  const parseTwitterSB = (md: string): typeof results[string] => {
    const out: typeof results[string] = {};

    const followersMatch = md.match(/followers\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);

    const tweetsMatch = md.match(/(?:tweets?|posts?)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (tweetsMatch) out.posts = parseHumanNumber(tweetsMatch[1]);

    const gains = extractLast30Row(md);
    if (gains.length >= 1) {
      const followerGain = gains[0];
      if (out.followers && out.followers > 0) {
        out.growthRate = (followerGain / out.followers) * 100;
      }
    }

    return out;
  };

  /** Parse SocialBlade markdown for Facebook metrics */
  const parseFacebookSB = (md: string): typeof results[string] => {
    const out: typeof results[string] = {};

    const followersMatch = md.match(/(?:total\s+page\s+likes|followers|page\s+likes)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);

    const postsMatch = md.match(/(?:posts?)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (postsMatch) out.posts = parseHumanNumber(postsMatch[1]);

    const gains = extractLast30Row(md);
    if (gains.length >= 1) {
      const followerGain = gains[0];
      if (out.followers && out.followers > 0) {
        out.growthRate = (followerGain / out.followers) * 100;
      }
    }

    return out;
  };

  /** Enrich YouTube with real video-level engagement from RSS + watch pages */
  const enrichYoutubeFromRecentVideos = async (
    handle: string,
    knownFollowers: number,
    current: typeof results[string],
  ) => {
    if (current.avgLikes && current.postFrequency && current.engagementRate) return current;

    let channelId = "";
    const channelPage = await fetchWithTimeout(`https://www.youtube.com/@${handle}`, { ms: 8000, maxChars: 450000 });
    if (channelPage) {
      channelId = channelPage.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i)?.[1]
        || channelPage.match(/"channelId":"(UC[\w-]{20,})"/i)?.[1]
        || "";
    }
    if (!channelId) return current;

    const rss = await fetchWithTimeout(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { ms: 8000, maxChars: 220000 });
    if (!rss) return current;

    const videos: { id: string; published: string }[] = [];
    for (const match of rss.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]{0,260}?<published>([^<]+)<\/published>/g)) {
      videos.push({ id: match[1], published: match[2] });
      if (videos.length >= 4) break;
    }
    if (videos.length === 0) return current;

    const details = await Promise.allSettled(videos.map(async (v) => {
      const watch = await fetchWithTimeout(`https://www.youtube.com/watch?v=${v.id}`, { ms: 8000, maxChars: 500000 });
      if (!watch) return { likes: 0, comments: 0 };
      const likesRaw = watch.match(/"likeCount":"(\d+)"/i)?.[1] || "";
      const commentsRaw = watch.match(/"commentCount":"(\d+)"/i)?.[1] || "";
      return {
        likes: parseHumanNumber(likesRaw),
        comments: parseHumanNumber(commentsRaw),
      };
    }));

    const likes = details.map(d => d.status === "fulfilled" ? d.value.likes : 0).filter(n => n > 0);
    const comments = details.map(d => d.status === "fulfilled" ? d.value.comments : 0).filter(n => n > 0);

    if (!current.avgLikes && likes.length) current.avgLikes = Math.round(likes.reduce((a, b) => a + b, 0) / likes.length);
    if (!current.avgComments && comments.length) current.avgComments = Math.round(comments.reduce((a, b) => a + b, 0) / comments.length);

    if (!current.postFrequency && videos.length >= 2) {
      const first = new Date(videos[videos.length - 1].published).getTime();
      const last = new Date(videos[0].published).getTime();
      const days = Math.max((last - first) / (1000 * 60 * 60 * 24), 1);
      current.postFrequency = (videos.length / days) * 7;
    }

    if (!current.engagementRate && knownFollowers > 0 && current.avgLikes) {
      current.engagementRate = ((current.avgLikes + (current.avgComments || 0)) / knownFollowers) * 100;
    }

    return current;
  };

  const scrapeOnePlatform = async (platform: string, rawHandle: string) => {
    const handle = rawHandle.replace(/^@/, "").trim();
    if (!handle) return;

    const key = platform.toLowerCase() === "x" ? "twitter" : platform.toLowerCase();
    const merged: typeof results[string] = {};

    // ── PRIMARY: Jina Reader → SocialBlade (renders JS, returns clean markdown) ──
    let sbUrl = "";
    let sbParser: ((md: string) => typeof results[string]) | null = null;

    if (key === "instagram") {
      sbUrl = `https://socialblade.com/instagram/user/${encodeURIComponent(handle)}`;
      sbParser = parseInstagramSB;
    } else if (key === "tiktok") {
      sbUrl = `https://socialblade.com/tiktok/user/${encodeURIComponent(handle)}`;
      sbParser = parseTikTokSB;
    } else if (key === "youtube") {
      sbUrl = `https://socialblade.com/youtube/c/${encodeURIComponent(handle)}`;
      sbParser = parseYouTubeSB;
    } else if (key === "twitter") {
      sbUrl = `https://socialblade.com/twitter/user/${encodeURIComponent(handle)}`;
      sbParser = parseTwitterSB;
    } else if (key === "facebook") {
      sbUrl = `https://socialblade.com/facebook/page/${encodeURIComponent(handle)}`;
      sbParser = parseFacebookSB;
    }

    if (sbUrl && sbParser) {
      console.log(`[SCRAPE] Fetching SocialBlade via Jina for ${key}/@${handle}`);
      const md = await fetchJina(sbUrl);
      if (md && md.length > 200) {
        const parsed = sbParser(md);
        Object.assign(merged, parsed);
        console.log(`[SCRAPE] ${key}/@${handle} SocialBlade result:`, JSON.stringify(parsed));
      }
    }

    // ── SECONDARY: LinkedIn via Jina (no SocialBlade page) ──
    if (key === "linkedin") {
      console.log(`[SCRAPE] Fetching LinkedIn via Jina for @${handle}`);
      const md = await fetchJina(`https://www.linkedin.com/company/${handle}/`);
      if (md && md.length > 100) {
        const followersMatch = md.match(/([\d,.KMBkmb]+)\s*followers/i);
        if (followersMatch) merged.followers = parseHumanNumber(followersMatch[1]);

        // Extract reactions from posts
        const reactionValues = [...md.matchAll(/(\d[\d,]*)\s*(?:reactions?|likes?)\b/gi)]
          .map(m => parseHumanNumber(m[1]))
          .filter(n => n > 0)
          .slice(0, 10);
        const commentValues = [...md.matchAll(/(\d[\d,]*)\s*(?:comments?)\b/gi)]
          .map(m => parseHumanNumber(m[1]))
          .filter(n => n >= 0)
          .slice(0, 10);

        if (!merged.avgLikes && reactionValues.length) merged.avgLikes = Math.round(reactionValues.reduce((a, b) => a + b, 0) / reactionValues.length);
        if (!merged.avgComments && commentValues.length) merged.avgComments = Math.round(commentValues.reduce((a, b) => a + b, 0) / commentValues.length);

        // Post frequency from recency markers
        const recency = [...md.matchAll(/(\d+)\s*(d|w|mo)\s/gi)]
          .map(m => ({ n: Number(m[1]), u: m[2].toLowerCase() }))
          .filter(r => Number.isFinite(r.n) && r.n > 0)
          .slice(0, 10);
        if (!merged.postFrequency && recency.length) {
          const maxDays = Math.max(...recency.map(r => r.u === "mo" ? r.n * 30 : r.u === "w" ? r.n * 7 : r.n));
          if (maxDays > 0) merged.postFrequency = (recency.length / maxDays) * 7;
        }
      }
    }

    // ── TERTIARY: YouTube RSS enrichment for real engagement ──
    if (key === "youtube" && merged.followers) {
      await enrichYoutubeFromRecentVideos(handle, merged.followers, merged);
    }

    // ── FALLBACK: Direct platform page scraping (for followers/posts if SB failed) ──
    if (!merged.followers) {
      let directUrl = "";
      let directHeaders: Record<string, string> = {};
      const followerPatterns: RegExp[] = [];
      const postPatterns: RegExp[] = [];

      if (key === "instagram") {
        directUrl = `https://www.instagram.com/${handle}/?hl=en`;
        followerPatterns.push(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i, /"followers_count"\s*:\s*(\d+)/i, /([\d,.KMBkmb]+)\s*followers/i);
        postPatterns.push(/"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i, /"media_count"\s*:\s*(\d+)/i);
      } else if (key === "tiktok") {
        directUrl = `https://www.tiktok.com/@${handle}?lang=en`;
        followerPatterns.push(/"followerCount"\s*:\s*(\d+)/i, /([\d,.KMBkmb]+)\s*followers/i);
        postPatterns.push(/"videoCount"\s*:\s*(\d+)/i, /([\d,.KMBkmb]+)\s*videos/i);
      } else if (key === "youtube") {
        directUrl = `https://www.youtube.com/@${handle}`;
        followerPatterns.push(/"subscriberCount"\s*:\s*"?(\d+)/i, /([\d,.KMBkmb]+)\s*subscribers/i);
        postPatterns.push(/"videoCount"\s*:\s*"?(\d+)/i);
      } else if (key === "twitter") {
        directUrl = `https://nitter.net/${handle}`;
        followerPatterns.push(/([\d,.KMBkmb]+)\s*followers/i);
        postPatterns.push(/([\d,.KMBkmb]+)\s*tweets/i);
      } else if (key === "facebook") {
        directUrl = `https://www.facebook.com/${handle}/`;
        followerPatterns.push(/([\d,.KMBkmb]+)\s*followers/i);
      }

      if (directUrl) {
        const raw = await fetchWithTimeout(directUrl, { headers: directHeaders, ms: 10000, maxChars: 400000 });
        if (raw) {
          for (const p of followerPatterns) {
            const m = raw.match(p);
            if (m?.[1]) {
              const v = parseHumanNumber(m[1]);
              if (v > 0) { merged.followers = v; break; }
            }
          }
          if (!merged.posts) {
            for (const p of postPatterns) {
              const m = raw.match(p);
              if (m?.[1]) {
                const v = parseHumanNumber(m[1]);
                if (v >= 0) { merged.posts = v; break; }
              }
            }
          }
          // Try og:description for profile description
          if (!merged.description) {
            const desc = raw.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
              || raw.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || "";
            if (desc.trim()) merged.description = desc.trim();
          }
        }
      }
    }

    // ── Derive ER if still missing ──
    if (!merged.engagementRate && merged.followers && merged.followers > 0 && (merged.avgLikes || merged.avgComments)) {
      merged.engagementRate = (((merged.avgLikes || 0) + (merged.avgComments || 0)) / merged.followers) * 100;
    }

    if (Object.keys(merged).length > 0) {
      results[key] = merged;
    }
  };

  const tasks = Object.entries(socialPresence || {})
    .filter(([, handle]) => typeof handle === "string" && handle.trim().length > 0)
    .map(([platform, handle]) => scrapeOnePlatform(platform, String(handle)));

  await Promise.allSettled(tasks);

  console.log("[SCRAPE] Social profile results:", JSON.stringify(results));
  return results;
};

/** Parse human-readable numbers like 2.2M, 380K, 9,579,516 */
const parseHumanNumber = (s: string): number => {
  if (!s) return 0;

  const cleaned = String(s)
    .replace(/\u00A0/g, " ")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  const match = cleaned.match(/(-?[\d.\s]+)\s*([KMBkmb])?/);
  if (!match) return 0;

  const num = parseFloat(match[1].replace(/\s+/g, ""));
  if (!Number.isFinite(num)) return 0;

  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(num * 1_000);
  if (suffix === "M") return Math.round(num * 1_000_000);
  if (suffix === "B") return Math.round(num * 1_000_000_000);
  return Math.round(num);
};

const HANDLE_PLACEHOLDER_PATTERN = /^(?:null|none|n\/a|na|unknown|handle(?:\s*or\s*null)?|not\s+available)$/i;
const METRIC_PLACEHOLDER_PATTERN = /^(?:nan|null|undefined|n\/a|na|none|unknown|not\s+available)$/i;

const normalizePlatformKey = (platform: string): string => {
  const key = String(platform || "").trim().toLowerCase();
  if (key === "x") return "twitter";
  return key;
};

const parseMetricNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const raw = value.trim();
  if (!raw || METRIC_PLACEHOLDER_PATTERN.test(raw)) return 0;

  const compact = raw
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\/(wk|week)/gi, "")
    .replace(/per\s+week/gi, "")
    .trim();

  if (/^-?[\d.]+[KMBkmb]$/.test(compact)) return parseHumanNumber(compact);

  const asNumber = Number(compact);
  return Number.isFinite(asNumber) ? asNumber : 0;
};

const normalizeSocialHandleValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || HANDLE_PLACEHOLDER_PATTERN.test(raw)) return null;

  const urlMatch = raw.match(/(?:instagram\.com|tiktok\.com\/@?|twitter\.com|x\.com|linkedin\.com\/company|youtube\.com\/(?:@|channel\/|c\/)|facebook\.com)\/([a-zA-Z0-9_.-]+)/i);
  const extracted = urlMatch?.[1] || raw;

  const cleaned = extracted
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();

  if (!cleaned || HANDLE_PLACEHOLDER_PATTERN.test(cleaned)) return null;
  return cleaned;
};

const normalizeSocialPresence = (input: Record<string, unknown>): Record<string, string | null> => {
  const out: Record<string, string | null> = {};
  for (const [platform, handle] of Object.entries(input || {})) {
    const key = normalizePlatformKey(platform);
    if (!key) continue;
    const normalizedHandle = normalizeSocialHandleValue(handle);
    out[key] = normalizedHandle;
  }
  return out;
};

const normalizePlatformMetric = (metric: Record<string, unknown>) => ({
  followers: parseMetricNumber(metric?.followers),
  posts: parseMetricNumber(metric?.posts),
  engagementRate: parseMetricNumber(metric?.engagementRate),
  avgLikes: parseMetricNumber(metric?.avgLikes),
  avgComments: parseMetricNumber(metric?.avgComments),
  postFrequency: parseMetricNumber(metric?.postFrequency),
  growthRate: parseMetricNumber(metric?.growthRate),
});

/** Extract social handles from a website homepage */
const extractSocialHandlesFromWebsite = async (websiteUrl: string): Promise<Record<string, string>> => {
  const handles: Record<string, string> = {};
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(websiteUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentAnalyzer/1.0)" },
    });
    clearTimeout(tid);
    if (!res.ok) return handles;

    const html = (await res.text()).slice(0, 120000);

    const normalizeHandle = (raw: string) => raw.replace(/^@/, "").replace(/[/?#].*$/, "").trim();

    const ig = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i)?.[1];
    if (ig) handles.instagram = normalizeHandle(ig);

    const tt = html.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/i)?.[1];
    if (tt) handles.tiktok = normalizeHandle(tt);

    const tw = html.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i)?.[1];
    if (tw) handles.twitter = normalizeHandle(tw);

    const yt = html.match(/youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]+)/i)?.[1];
    if (yt) handles.youtube = normalizeHandle(yt);

    const li = html.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i)?.[1];
    if (li) handles.linkedin = normalizeHandle(li);

    const fb = html.match(/facebook\.com\/([a-zA-Z0-9_.]+)/i)?.[1];
    if (fb) handles.facebook = normalizeHandle(fb);
  } catch {
    // noop
  }
  return handles;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    let parsedBody: Record<string, any> = {};

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = parsedBody?.body && typeof parsedBody.body === "object" ? parsedBody.body : parsedBody;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const analysisType = typeof body?.analysisType === "string" ? body.analysisType : undefined;
    const competitors = Array.isArray(body?.competitors) ? body.competitors : [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error("Missing required environment variables", {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceKey,
        hasAnonKey: !!anonKey,
      });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const today = new Date().toISOString().slice(0, 10);

    const runBatchPlatformRefresh = async (items: any[]) => {
      const results = await Promise.all(items.map(async (item: any) => {
        const websiteUrl = item?.websiteUrl ? String(item.websiteUrl) : "";

        const existingPresenceRaw = (item?.socialPresence && typeof item.socialPresence === "object")
          ? item.socialPresence as Record<string, unknown>
          : {};
        const existingMetricsRaw = (item?.platformMetrics && typeof item.platformMetrics === "object")
          ? item.platformMetrics as Record<string, unknown>
          : {};

        let socialPresence = normalizeSocialPresence(existingPresenceRaw);

        if (websiteUrl) {
          const extracted = normalizeSocialPresence(await extractSocialHandlesFromWebsite(websiteUrl));
          // Keep valid existing handles, but never let null placeholders overwrite discovered handles.
          const merged: Record<string, string | null> = { ...extracted };
          for (const [platform, handle] of Object.entries(socialPresence)) {
            if (typeof handle === "string" && handle.trim().length > 0) {
              merged[platform] = handle;
            } else if (!(platform in merged)) {
              merged[platform] = null;
            }
          }
          socialPresence = merged;
        }

        const platformMetrics: Record<string, ReturnType<typeof normalizePlatformMetric>> = {};
        for (const [platform, metric] of Object.entries(existingMetricsRaw)) {
          const key = normalizePlatformKey(platform);
          if (!key || !metric || typeof metric !== "object") continue;
          platformMetrics[key] = normalizePlatformMetric(metric as Record<string, unknown>);
        }

        const scraped = await scrapeSocialProfiles(socialPresence);

        for (const [platform, scrapedData] of Object.entries(scraped)) {
          const key = normalizePlatformKey(platform);
          if (!key) continue;
          const prev = normalizePlatformMetric((platformMetrics[key] || {}) as Record<string, unknown>);

          const nextFollowers = typeof scrapedData.followers === "number" && scrapedData.followers > 0
            ? scrapedData.followers
            : prev.followers;
          const nextPosts = typeof scrapedData.posts === "number" && scrapedData.posts >= 0
            ? scrapedData.posts
            : prev.posts;

          const derivedGrowth = prev.followers > 0 && nextFollowers > 0 && nextFollowers !== prev.followers
            ? ((nextFollowers - prev.followers) / prev.followers) * 100
            : undefined;

          platformMetrics[key] = {
            ...prev,
            followers: nextFollowers,
            posts: nextPosts,
            engagementRate: typeof scrapedData.engagementRate === "number" && Number.isFinite(scrapedData.engagementRate)
              ? scrapedData.engagementRate
              : prev.engagementRate,
            avgLikes: typeof scrapedData.avgLikes === "number" && scrapedData.avgLikes > 0
              ? scrapedData.avgLikes
              : prev.avgLikes,
            avgComments: typeof scrapedData.avgComments === "number" && scrapedData.avgComments >= 0
              ? scrapedData.avgComments
              : prev.avgComments,
            postFrequency: typeof scrapedData.postFrequency === "number" && scrapedData.postFrequency > 0
              ? scrapedData.postFrequency
              : prev.postFrequency,
            growthRate: typeof scrapedData.growthRate === "number" && Number.isFinite(scrapedData.growthRate)
              ? scrapedData.growthRate
              : (derivedGrowth ?? prev.growthRate),
          };

          if (platformMetrics[key].engagementRate <= 0 && platformMetrics[key].followers > 0 && platformMetrics[key].avgLikes > 0) {
            platformMetrics[key].engagementRate = ((platformMetrics[key].avgLikes + (platformMetrics[key].avgComments || 0)) / platformMetrics[key].followers) * 100;
          }
        }

        const followers = Object.values(platformMetrics).reduce((sum: number, pm) => sum + parseMetricNumber(pm?.followers), 0);

        return {
          id: item?.id,
          followers: followers > 0 ? followers : parseMetricNumber(item?.followers),
          socialPresence,
          platformMetrics,
          scrapedPlatforms: Object.keys(scraped),
        };
      }));

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    if (action === "check_usage") {
      const { data: row } = await sb
        .from("competitor_ai_usage")
        .select("call_count, reset_by_admin")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      const count = row?.reset_by_admin ? 0 : row?.call_count || 0;
      return new Response(JSON.stringify({ count, limit: RATE_LIMIT_MAX, limited: count >= RATE_LIMIT_MAX }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shouldBatchRefresh = action === "batch_platform_refresh" || (competitors.length > 0 && !prompt);
    if (shouldBatchRefresh) {
      return await runBatchPlatformRefresh(competitors);
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: usageRow } = await sb
      .from("competitor_ai_usage")
      .select("id, call_count, reset_by_admin")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usageRow?.reset_by_admin ? 0 : usageRow?.call_count || 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Daily AI analysis limit reached (20/day).", limited: true, count: currentCount }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isFinancial = analysisType === "financial";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    let reply = "";

    try {
      if (isFinancial) {
        // === TWO-PASS FINANCIAL RESEARCH ===
        const currentDate = new Date().toISOString().slice(0, 10);
        const currentYear = new Date().getUTCFullYear();

        // Pass 1: Source-first factual research with strongest reasoning model
        const researchPrompt = `You are a forensic financial intelligence researcher.

TASK DATE: ${currentDate}
TARGET: ${prompt}

Your goal is to collect ONLY latest verifiable facts from trusted internet sources.

TRUSTED SOURCE PRIORITY (highest to lowest):
1) Official filings/reports: SEC 10-K/10-Q/8-K, annual/interim reports, investor relations releases
2) Official registers/tax/government databases: company registers, tax disclosures, regulator databases
3) Trusted analytics datasets for traffic: SimilarWeb, Semrush, Cloudflare Radar
4) Reputable financial publications/databases: Bloomberg, Reuters, Financial Times, WSJ

MANDATORY RULES:
- Never estimate, infer, project, or use synthetic ranges.
- If a metric has no verifiable source, return "Not publicly disclosed".
- Use the newest available period (prefer ${currentYear}, then ${currentYear - 1}).
- Do not use old periods when a newer reported period exists.
- Every numeric metric must include source + publication/report date.
- Cross-check key metrics (revenue, monthly traffic, employees) against at least 2 trusted sources when available.

RESEARCH OUTPUT FORMAT:
A structured factual brief with sections:
1. Company identity (legal entity, ticker if any, founding, HQ, employee count)
2. Financials (latest reported annual/TTM revenue, latest quarter, net income/margins if disclosed)
3. Traffic (latest month, bounce rate/session, sources/countries)
4. Revenue model and pricing facts
5. Competition and market position
6. Growth indicators
7. Source ledger (metric, value, source name, source URL, publication date)

Strictly avoid any estimate language.`;
        const researchRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-pro-preview",
            temperature: 0,
            max_tokens: 3500,
            messages: [{ role: "user", content: researchPrompt }],
          }),
          signal: controller.signal,
        });

        if (!researchRes.ok) {
          const t = await researchRes.text();
          console.error("Research pass error:", researchRes.status, t);
          if (researchRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (researchRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`Research pass failed: ${researchRes.status}`);
        }

        const researchData = await researchRes.json();
        const researchBrief = researchData.choices?.[0]?.message?.content || "";
        console.log("Research brief length:", researchBrief.length);

        // Pass 2: Strictly structure factual output with tool calling
        const structurePrompt = `Use ONLY the verified research below to fill the financial report schema.

=== VERIFIED RESEARCH ===
${researchBrief}
=== END RESEARCH ===

TARGET: ${prompt}
DATE: ${currentDate}

STRICT OUTPUT RULES:
- Do NOT estimate, infer, project, approximate, or provide synthetic ranges.
- Every numeric value must be tied to a source and period in the value text.
- If a metric has no verifiable source, set it to "Not publicly disclosed".
- Prefer newest available periods (${currentYear} then ${currentYear - 1}); do not fallback to older years if newer data exists.
- If deriving daily/weekly/monthly from verified annual/quarterly values, explicitly tag as "Derived from [source period]".
- dataFreshness must reflect the latest financial and traffic period actually used.
- sourceLedger must include as many trusted citations as available (minimum 6 when available), each with URL and publication date.
- For non-subscription companies, mrr/arr/churn should be "Not subscription-based".
- confidenceLevel must be one of: high, medium, low.`;

        const structRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0,
            max_tokens: 4096,
            messages: [
              { role: "system", content: "Return strictly factual, latest, source-grounded financial intelligence. No estimates." },
              { role: "user", content: structurePrompt },
            ],
            tools: [financialTool],
            tool_choice: { type: "function", function: { name: "financial_report" } },
          }),
          signal: controller.signal,
        });

        if (!structRes.ok) {
          const t = await structRes.text();
          console.error("Structure pass error:", structRes.status, t);
          if (structRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (structRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`Structure pass failed: ${structRes.status}`);
        }

        const structData = await structRes.json();
        const toolCall = structData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            const sanitized = sanitizeFinancialPayload(parsed);
            reply = JSON.stringify(sanitized);
          } catch {
            reply = toolCall.function.arguments;
          }
        } else {
          reply = structData.choices?.[0]?.message?.content || "";
        }
      } else {
        // Non-financial: single pass with tool calling for reliable structured output
        const isInternetAnalysis = prompt.includes("WEBSITE:") || prompt.includes("competitor business/website");

        // === BATCH SCRAPE social profiles if this is an internet analysis ===
        let scrapedData: Record<string, { followers?: number; description?: string; posts?: number }> = {};
        let scrapeContext = "";
        if (isInternetAnalysis) {
          try {
            // Extract social handles from the prompt to pre-scrape
            // First do a quick AI pass to get social handles, then scrape them
            // But we can also try to extract from the website directly
            const websiteMatch = prompt.match(/WEBSITE:\s*(\S+)/i);
            if (websiteMatch) {
              const siteUrl = websiteMatch[1].startsWith("http") ? websiteMatch[1] : `https://${websiteMatch[1]}`;
              try {
                const siteCtrl = new AbortController();
                const siteTid = setTimeout(() => siteCtrl.abort(), 6000);
                const siteRes = await fetch(siteUrl, {
                  signal: siteCtrl.signal,
                  headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentAnalyzer/1.0)" },
                });
                clearTimeout(siteTid);
                if (siteRes.ok) {
                  const siteHtml = (await siteRes.text()).slice(0, 80000);
                  // Extract social links from the website
                  const socialHandles: Record<string, string> = {};
                  const igMatch = siteHtml.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
                  if (igMatch) socialHandles.instagram = igMatch[1];
                  const ttMatch = siteHtml.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/i);
                  if (ttMatch) socialHandles.tiktok = ttMatch[1];
                  const twMatch = siteHtml.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
                  if (twMatch) socialHandles.twitter = twMatch[1];
                  const ytMatch = siteHtml.match(/youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]+)/i);
                  if (ytMatch) socialHandles.youtube = ytMatch[1];
                  const liMatch = siteHtml.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i);
                  if (liMatch) socialHandles.linkedin = liMatch[1];
                  const fbMatch = siteHtml.match(/facebook\.com\/([a-zA-Z0-9_.]+)/i);
                  if (fbMatch) socialHandles.facebook = fbMatch[1];

                  if (Object.keys(socialHandles).length > 0) {
                    console.log("[SCRAPE] Found social handles on website:", JSON.stringify(socialHandles));
                    scrapedData = await scrapeSocialProfiles(socialHandles);
                    if (Object.keys(scrapedData).length > 0) {
                      scrapeContext = "\n\n=== VERIFIED SOCIAL PROFILE DATA (scraped directly from platform pages - USE THESE EXACT NUMBERS for platformMetrics) ===\n";
                      for (const [plat, data] of Object.entries(scrapedData)) {
                        const parts = [];
                        if (data.followers) parts.push(`followers: ${data.followers.toLocaleString()}`);
                        if (data.posts) parts.push(`posts: ${data.posts.toLocaleString()}`);
                        if (data.description) parts.push(`bio: "${data.description.slice(0, 200)}"`);
                        scrapeContext += `${plat}: ${parts.join(", ")}\n`;
                      }
                      scrapeContext += "=== END VERIFIED DATA ===\nIMPORTANT: Use the above VERIFIED follower counts in platformMetrics. Do NOT make up different numbers.\n";
                    }
                  }
                }
              } catch (e) {
                console.log("[SCRAPE] Website fetch failed:", e);
              }
            }
          } catch (e) {
            console.log("[SCRAPE] Social scrape error:", e);
          }
        }
        
        const competitorTool = {
          type: "function" as const,
          function: {
            name: "competitor_profile",
            description: "Return structured competitor profile data.",
            parameters: {
              type: "object",
              properties: {
                displayName: { type: "string" },
                companyDescription: { type: "string" },
                industry: { type: "string" },
                foundedYear: { type: "string" },
                headquarters: { type: "string" },
                teamSize: { type: "string" },
                websiteTraffic: { type: "number" },
                domainAuthority: { type: "number" },
                socialPresence: {
                  type: "object",
                  properties: {
                    instagram: { type: "string" },
                    twitter: { type: "string" },
                    linkedin: { type: "string" },
                    tiktok: { type: "string" },
                    youtube: { type: "string" },
                    facebook: { type: "string" },
                  },
                },
                platformMetrics: {
                  type: "object",
                  description: "Per-platform follower counts, engagement rates, avg likes, post frequency, and growth rates. Keys are platform names (instagram, tiktok, twitter, youtube, linkedin, facebook). Only include platforms the competitor actually uses. EACH PLATFORM MUST HAVE DIFFERENT NUMBERS.",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      followers: { type: "number", description: "Follower/subscriber count on this specific platform - MUST be different per platform" },
                      engagementRate: { type: "number", description: "Average engagement rate on this platform as percentage - varies by platform" },
                      avgLikes: { type: "number", description: "Average likes per post on this platform" },
                      avgComments: { type: "number", description: "Average comments per post on this platform" },
                      postFrequency: { type: "number", description: "Posts per week on this platform" },
                      growthRate: { type: "number", description: "Weekly follower growth rate as percentage" },
                      posts: { type: "number", description: "Total post count on this platform" },
                    },
                  },
                },
                followers: { type: "number" },
                following: { type: "number" },
                posts: { type: "number" },
                engagementRate: { type: "number" },
                avgLikes: { type: "number" },
                avgComments: { type: "number" },
                growthRate: { type: "number" },
                postFrequency: { type: "number" },
                topHashtags: { type: "array", items: { type: "string" } },
                contentTypes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { type: { type: "string" }, pct: { type: "number" } },
                    required: ["type", "pct"],
                  },
                },
                niche: { type: "string" },
                revenueEstimate: { type: "string" },
                pricingModel: { type: "string" },
                mainProducts: { type: "array", items: { type: "string" } },
                targetAudience: { type: "string" },
                competitiveStrengths: { type: "array", items: { type: "string" } },
                competitiveWeaknesses: { type: "array", items: { type: "string" } },
                techStack: { type: "array", items: { type: "string" } },
                seoKeywords: { type: "array", items: { type: "string" } },
                fundingStatus: { type: "string" },
                score: { type: "number" },
                bestPostingTimes: { type: "array", items: { type: "string" } },
                audienceDemo: { type: "string" },
                contentStyle: { type: "string" },
              },
              required: ["displayName", "followers", "engagementRate", "score", "topHashtags", "contentTypes", "platformMetrics"],
            },
          },
        };

        const enrichedPrompt = prompt + scrapeContext;

        const bodyPayload: any = {
          model: "google/gemini-2.5-flash",
          temperature: 0.2,
          max_tokens: 4000,
          messages: [
            { role: "system", content: `You are a social media analytics and competitive intelligence expert. Return accurate, realistic data based on your latest knowledge.

CRITICAL RULES FOR platformMetrics:
1. EACH platform MUST have DIFFERENT follower counts, engagement rates, and posting frequencies
2. If verified scraped data is provided, use those EXACT follower counts
3. Instagram typically has higher followers than TikTok for established brands, but TikTok often has higher engagement rates
4. YouTube subscribers are usually lower than Instagram followers for most brands
5. LinkedIn followers are typically the lowest for B2C brands
6. Twitter/X followers vary but engagement rates are usually lower (0.1-0.5%)
7. NEVER copy the same numbers across platforms - each platform has genuinely different metrics
8. The top-level "followers" field should be the SUM of all individual platform followers` },
            { role: "user", content: enrichedPrompt },
          ],
        };

        // Use tool calling for internet competitors (larger schema) to guarantee structured output
        if (isInternetAnalysis) {
          bodyPayload.tools = [competitorTool];
          bodyPayload.tool_choice = { type: "function", function: { name: "competitor_profile" } };
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const t = await response.text();
          console.error("AI gateway error:", response.status, t);
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI gateway returned ${response.status}`);
        }

        const data = await response.json();
        
        // Check for tool call response first
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            // Merge scraped data into platformMetrics to override AI hallucinations
            if (Object.keys(scrapedData).length > 0) {
              parsed.platformMetrics = parsed.platformMetrics || {};
              for (const [plat, scraped] of Object.entries(scrapedData)) {
                const prev = parsed.platformMetrics[plat] || {};
                parsed.platformMetrics[plat] = {
                  ...prev,
                  followers: scraped.followers ?? prev.followers ?? 0,
                  posts: scraped.posts ?? prev.posts ?? 0,
                  engagementRate: prev.engagementRate ?? 0,
                  avgLikes: prev.avgLikes ?? 0,
                  avgComments: prev.avgComments ?? 0,
                  postFrequency: prev.postFrequency ?? 0,
                  growthRate: prev.growthRate ?? 0,
                };
              }
              // Recalculate total followers from platform metrics
              const totalFromPlatforms = Object.values(parsed.platformMetrics as Record<string, any>)
                .reduce((sum: number, pm: any) => sum + (pm?.followers || 0), 0);
              if (totalFromPlatforms > 0) parsed.followers = totalFromPlatforms;
            }
            reply = JSON.stringify(parsed);
          } catch {
            reply = toolCall.function.arguments;
          }
        } else {
          reply = data.choices?.[0]?.message?.content || "";
        }
      }
    } catch (fetchError: any) {
      if (fetchError?.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Financial analysis timed out. Please retry." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    const newCount = currentCount + 1;

    if (usageRow && !usageRow.reset_by_admin) {
      await sb
        .from("competitor_ai_usage")
        .update({ call_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", usageRow.id);
    } else {
      await sb
        .from("competitor_ai_usage")
        .upsert(
          { user_id: user.id, usage_date: today, call_count: 1, reset_by_admin: false, updated_at: new Date().toISOString() },
          { onConflict: "user_id,usage_date" },
        );
    }

    // Always clean the reply to ensure valid JSON reaches the client
    const cleanedReply = cleanJsonResponse(reply);
    
    return new Response(JSON.stringify({ reply: cleanedReply, usage: { count: newCount, limit: RATE_LIMIT_MAX } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("competitor-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

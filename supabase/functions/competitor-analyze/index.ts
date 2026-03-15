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
  _sources?: string[];
};

/** Batch-scrape social profiles using 7-layer real-time APIs + deep HTML/JS extraction */
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
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          ...(options?.headers || {}),
        },
      });
      if (!res.ok) return "";
      const text = await res.text();
      return text.slice(0, options?.maxChars ?? 500000);
    } catch {
      return "";
    } finally {
      clearTimeout(tid);
    }
  };

  const fetchJson = async (url: string, ms = 10000): Promise<any> => {
    const raw = await fetchWithTimeout(url, { ms, maxChars: 200000, headers: { Accept: "application/json" } });
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const fetchJina = async (url: string): Promise<string> => {
    return fetchWithTimeout(`https://r.jina.ai/${url}`, { ms: 18000, maxChars: 500000 });
  };

  /** Parse "Last 30 days" row from SocialBlade markdown table */
  const extractLast30Row = (text: string): number[] => {
    const row = text.match(/Last\s*30\s*days\s*\|\s*([^\n\r]+)/i)?.[1] || "";
    if (!row) return [];
    return [...row.matchAll(/[-+]?\s*\d[\d,.]*\s*[KMBkmb]?/g)]
      .map((m) => parseHumanNumber(m[0].replace(/\s/g, "")))
      .filter((n) => Number.isFinite(n));
  };

  // ═══════════════════════════════════════════════════════════════════
  // DEEP HTML/JS SCRAPER - Extract data from embedded JSON structures
  // ═══════════════════════════════════════════════════════════════════

  /** Extract structured data from HTML: JSON-LD, __NEXT_DATA__, window.__data, meta tags, microdata */
  const deepExtractFromHTML = (html: string, platform: string): ScrapedMetrics => {
    const out: ScrapedMetrics = { _sources: [] };

    // 1) JSON-LD extraction (Schema.org structured data)
    const jsonLdBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const block of jsonLdBlocks.slice(0, 5)) {
      try {
        const ld = JSON.parse(block[1]);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item?.interactionStatistic) {
            const stats = Array.isArray(item.interactionStatistic) ? item.interactionStatistic : [item.interactionStatistic];
            for (const stat of stats) {
              const type = String(stat?.interactionType || stat?.["@type"] || "").toLowerCase();
              const count = parseHumanNumber(String(stat?.userInteractionCount || ""));
              if (count > 0) {
                if (type.includes("follow") || type.includes("subscribe")) { if (!out.followers) out.followers = count; }
                else if (type.includes("like") || type.includes("love")) { if (!out.totalLikes) out.totalLikes = count; }
                else if (type.includes("view") || type.includes("watch")) { if (!out.totalViews) out.totalViews = count; }
                else if (type.includes("comment")) { if (!out.avgComments) out.avgComments = count; }
                else if (type.includes("share")) { if (!out.avgShares) out.avgShares = count; }
              }
            }
          }
          if (item?.mainEntityOfPage?.interactionStatistic) {
            const stats = Array.isArray(item.mainEntityOfPage.interactionStatistic) ? item.mainEntityOfPage.interactionStatistic : [item.mainEntityOfPage.interactionStatistic];
            for (const stat of stats) {
              const count = parseHumanNumber(String(stat?.userInteractionCount || ""));
              if (count > 0 && !out.followers) out.followers = count;
            }
          }
          if (item?.description && !out.description) out.description = String(item.description).slice(0, 200);
          if (item?.name && !out.description) out.description = String(item.name).slice(0, 200);
        }
      } catch { /* skip malformed JSON-LD */ }
    }

    // 2) __NEXT_DATA__ extraction (Next.js apps - many modern social platforms)
    const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const walkForMetrics = (obj: any, depth = 0) => {
          if (!obj || typeof obj !== "object" || depth > 8) return;
          if (Array.isArray(obj)) { obj.slice(0, 20).forEach(item => walkForMetrics(item, depth + 1)); return; }
          // Look for follower/subscriber counts
          for (const [key, val] of Object.entries(obj)) {
            const k = key.toLowerCase();
            if (typeof val === "number" && val > 0) {
              if ((k.includes("follower") || k.includes("subscriber")) && k.includes("count") && !out.followers) out.followers = val;
              else if (k.includes("following") && k.includes("count") && !out.following) out.following = val;
              else if ((k.includes("video") || k.includes("post") || k.includes("media")) && k.includes("count") && !out.posts) out.posts = val;
              else if (k.includes("like") && k.includes("count") && !out.totalLikes) out.totalLikes = val;
              else if (k.includes("view") && k.includes("count") && !out.totalViews) out.totalViews = val;
              else if (k === "heartcount" || k === "heart_count" || k === "diggcount" || k === "digg_count") { if (!out.totalLikes) out.totalLikes = val; }
            }
            if (typeof val === "string" && val.length > 10 && val.length < 300 && (k === "bio" || k === "biography" || k === "description" || k === "signature") && !out.description) {
              out.description = val.slice(0, 200);
            }
            if (typeof val === "object") walkForMetrics(val, depth + 1);
          }
        };
        walkForMetrics(nextData.props?.pageProps);
      } catch { /* skip */ }
    }

    // 3) window.__data / window.__INITIAL_STATE__ / window.__PRELOADED_STATE__
    const globalStatePatterns = [
      /window\.__data__?\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|window\.|var\s|const\s|let\s)/i,
      /window\.__INITIAL_STATE__?\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|window\.|var\s)/i,
      /window\.__PRELOADED_STATE__?\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|window\.|var\s)/i,
      /window\["__UNIVERSAL_DATA_FOR_REHYDRATION__"\]\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>)/i,
      /window\.__playwr(?:ight)?_data__?\s*=\s*(\{[\s\S]*?\});/i,
    ];
    for (const pat of globalStatePatterns) {
      const m = html.match(pat);
      if (m?.[1]) {
        try {
          const state = JSON.parse(m[1].slice(0, 200000));
          const extractFromState = (obj: any, depth = 0) => {
            if (!obj || typeof obj !== "object" || depth > 6) return;
            if (Array.isArray(obj)) { obj.slice(0, 10).forEach(item => extractFromState(item, depth + 1)); return; }
            for (const [key, val] of Object.entries(obj)) {
              const k = key.toLowerCase();
              if (typeof val === "number" && val > 0) {
                if ((k.includes("follower") || k.includes("fan")) && (k.includes("count") || k.includes("num")) && !out.followers) out.followers = val;
                if (k.includes("following") && (k.includes("count") || k.includes("num")) && !out.following) out.following = val;
                if ((k.includes("video") || k.includes("aweme")) && (k.includes("count") || k.includes("num")) && !out.posts) out.posts = val;
                if ((k === "heartcount" || k === "heart_count" || k === "diggcount" || k === "totalfavorited") && !out.totalLikes) out.totalLikes = val;
              }
              if (typeof val === "object") extractFromState(val, depth + 1);
            }
          };
          extractFromState(state);
        } catch { /* skip */ }
      }
    }

    // 4) Inline JSON objects in scripts (common in TikTok, Instagram, etc.)
    const inlineJsonPatterns = [
      /"followerCount"\s*:\s*(\d+)/i,
      /"followingCount"\s*:\s*(\d+)/i,
      /"heartCount"\s*:\s*(\d+)/i,
      /"videoCount"\s*:\s*(\d+)/i,
      /"diggCount"\s*:\s*(\d+)/i,
      /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
      /"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
      /"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
      /"subscriberCount"\s*:\s*"?(\d+)/i,
      /"viewCount"\s*:\s*"?(\d+)/i,
      /"media_count"\s*:\s*(\d+)/i,
      /"followers_count"\s*:\s*(\d+)/i,
      /"following_count"\s*:\s*(\d+)/i,
      /"statuses_count"\s*:\s*(\d+)/i,
    ];
    const inlineFields = [
      { patterns: [0], field: "followers" as const },
      { patterns: [1], field: "following" as const },
      { patterns: [2, 4], field: "totalLikes" as const },
      { patterns: [3], field: "posts" as const },
      { patterns: [5], field: "followers" as const },
      { patterns: [6], field: "following" as const },
      { patterns: [7, 11], field: "posts" as const },
      { patterns: [8], field: "followers" as const },
      { patterns: [9], field: "totalViews" as const },
      { patterns: [10, 12], field: "followers" as const },
      { patterns: [13], field: "posts" as const },
    ];
    for (const { patterns, field } of inlineFields) {
      if (out[field]) continue;
      for (const idx of patterns) {
        const m = html.match(inlineJsonPatterns[idx]);
        if (m?.[1]) {
          const v = parseHumanNumber(m[1]);
          if (v > 0) { (out as any)[field] = v; break; }
        }
      }
    }

    // 5) Open Graph / meta tag extraction
    if (!out.description) {
      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i)?.[1]
        || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)?.[1];
      if (ogDesc) out.description = ogDesc.trim().slice(0, 200);
    }

    // 6) Human-readable text patterns (last resort from HTML)
    const textFollowers = html.match(/([\d,.KMBkmb]+)\s*(?:Followers|Subscribers|Abonnés|Abonnenten|seguidores)/i);
    if (textFollowers && !out.followers) { const v = parseHumanNumber(textFollowers[1]); if (v > 0) out.followers = v; }

    const textFollowing = html.match(/([\d,.KMBkmb]+)\s*Following/i);
    if (textFollowing && !out.following) { const v = parseHumanNumber(textFollowing[1]); if (v > 0) out.following = v; }

    const textPosts = html.match(/([\d,.KMBkmb]+)\s*(?:Posts|Videos|Pins|Tweets|Media|Photos|Tracks)/i);
    if (textPosts && !out.posts) { const v = parseHumanNumber(textPosts[1]); if (v > 0) out.posts = v; }

    // 7) Engagement from visible post stats in HTML
    const likeMatches = [...html.matchAll(/"likeCount"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n > 0).slice(0, 20);
    const commentMatches = [...html.matchAll(/"commentCount"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n >= 0).slice(0, 20);
    const viewMatches = [...html.matchAll(/"viewCount"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n > 0).slice(0, 20);
    
    if (!out.avgLikes && likeMatches.length >= 2) out.avgLikes = Math.round(likeMatches.reduce((a, b) => a + b, 0) / likeMatches.length);
    if (!out.avgComments && commentMatches.length >= 2) out.avgComments = Math.round(commentMatches.reduce((a, b) => a + b, 0) / commentMatches.length);
    if (!out.avgViews && viewMatches.length >= 2) out.avgViews = Math.round(viewMatches.reduce((a, b) => a + b, 0) / viewMatches.length);

    if (out.followers || out.totalLikes || out.posts) out._sources!.push(`deep-html-${platform}`);
    return out;
  };

  // ═══════════════════════════════════════════════════════════
  // LAYER 0: OEMBED / EMBED APIs (instant, no auth, exact data)
  // ═══════════════════════════════════════════════════════════

  const fetchOembedData = async (platform: string, handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    try {
      if (platform === "youtube") {
        const data = await fetchJson(`https://www.youtube.com/oembed?url=https://www.youtube.com/@${encodeURIComponent(handle)}&format=json`, 6000);
        if (data?.author_name) { if (!out.description) out.description = data.author_name; out._sources!.push("youtube-oembed"); }
      }
      if (platform === "tiktok") {
        const data = await fetchJson(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${encodeURIComponent(handle)}`, 6000);
        if (data?.author_name) { if (!out.description) out.description = data.author_name; out._sources!.push("tiktok-oembed"); }
      }
      if (platform === "twitter") {
        // Try multiple Nitter instances for public data
        const nitterInstances = ["nitter.net", "nitter.privacydev.net", "nitter.poast.org", "nitter.cz", "nitter.1d4.us"];
        for (const inst of nitterInstances) {
          try {
            const html = await fetchWithTimeout(`https://${inst}/${handle}`, { ms: 6000, maxChars: 200000 });
            if (html && html.length > 500) {
              const fMatch = html.match(/([\d,.KMBkmb]+)\s*Followers/i);
              if (fMatch) { const v = parseHumanNumber(fMatch[1]); if (v > 0) { out.followers = v; out._sources!.push(`nitter-${inst}`); } }
              const twMatch = html.match(/([\d,.KMBkmb]+)\s*Tweets/i) || html.match(/([\d,.KMBkmb]+)\s*Posts/i);
              if (twMatch) { const v = parseHumanNumber(twMatch[1]); if (v > 0) out.posts = v; }
              const flwMatch = html.match(/([\d,.KMBkmb]+)\s*Following/i);
              if (flwMatch) { const v = parseHumanNumber(flwMatch[1]); if (v > 0) out.following = v; }
              if (out.followers) break;
            }
          } catch { continue; }
        }
      }
    } catch { /* noop */ }
    return out;
  };

  // ═══════════════════════════════════════════════════════════
  // DEDICATED TWITTER/X SCRAPER (multi-approach, aggressive)
  // ═══════════════════════════════════════════════════════════

  const fetchTwitterDedicated = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    console.log(`[SCRAPE][Twitter] Starting dedicated Twitter scraper for @${handle}`);

    // Approach 1: Syndication API (public, no auth needed, works for most accounts)
    try {
      const syndicationUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}`;
      const html = await fetchWithTimeout(syndicationUrl, { ms: 10000, maxChars: 500000 });
      if (html && html.length > 200) {
        // Extract from embedded JSON in syndication HTML
        const dataMatch = html.match(/window\.__INITIAL_PROPS__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i)
          || html.match(/data-props="([^"]+)"/i);
        if (dataMatch?.[1]) {
          try {
            let jsonStr = dataMatch[1];
            if (jsonStr.includes("&quot;")) jsonStr = jsonStr.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
            const parsed = JSON.parse(jsonStr);
            // Walk for user metrics
            const walkTwitter = (obj: any, depth = 0) => {
              if (!obj || typeof obj !== "object" || depth > 8) return;
              if (Array.isArray(obj)) { obj.slice(0, 10).forEach(item => walkTwitter(item, depth + 1)); return; }
              for (const [k, v] of Object.entries(obj)) {
                const kl = k.toLowerCase();
                if (typeof v === "number" && v > 0) {
                  if ((kl === "followers_count" || kl === "followerscount") && !out.followers) out.followers = v;
                  if ((kl === "friends_count" || kl === "friendscount" || kl === "following_count") && !out.following) out.following = v;
                  if ((kl === "statuses_count" || kl === "statusescount" || kl === "tweet_count") && !out.posts) out.posts = v;
                  if ((kl === "favourites_count" || kl === "likescount" || kl === "favorites_count") && !out.totalLikes) out.totalLikes = v;
                  if ((kl === "media_count" || kl === "listed_count") && !out.posts && v > 10) out.posts = v;
                }
                if (typeof v === "string" && v.length > 10 && v.length < 300 && (kl === "description" || kl === "bio") && !out.description) out.description = v.slice(0, 200);
                if (typeof v === "object") walkTwitter(v, depth + 1);
              }
            };
            walkTwitter(parsed);
            if (out.followers) { out._sources!.push("twitter-syndication-api"); console.log(`[SCRAPE][Twitter] Syndication API: followers=${out.followers}, posts=${out.posts}`); }
          } catch { /* parse error */ }
        }
        // Regex fallback on syndication HTML
        if (!out.followers) {
          const deep = deepExtractFromHTML(html, "twitter");
          if (deep.followers && deep.followers > 0) {
            if (!out.followers) out.followers = deep.followers;
            if (!out.following && deep.following) out.following = deep.following;
            if (!out.posts && deep.posts) out.posts = deep.posts;
            out._sources!.push("twitter-syndication-html");
          }
        }
      }
    } catch (e) { console.log(`[SCRAPE][Twitter] Syndication failed:`, e); }

    // Approach 2: Twitter embeds API (works for public tweets count/followers)
    if (!out.followers) {
      try {
        const embedHtml = await fetchWithTimeout(`https://publish.twitter.com/oembed?url=https://x.com/${encodeURIComponent(handle)}&omit_script=true`, { ms: 6000, maxChars: 50000, headers: { Accept: "application/json" } });
        if (embedHtml) {
          try {
            const embedData = JSON.parse(embedHtml);
            if (embedData?.author_name && !out.description) out.description = embedData.author_name;
            out._sources!.push("twitter-oembed");
          } catch { /* not JSON */ }
        }
      } catch { /* noop */ }
    }

    // Approach 3: Direct x.com page with deep HTML/JS extraction
    if (!out.followers) {
      try {
        const xHtml = await fetchWithTimeout(`https://x.com/${encodeURIComponent(handle)}`, { ms: 10000, maxChars: 500000 });
        if (xHtml && xHtml.length > 500) {
          const deep = deepExtractFromHTML(xHtml, "twitter");
          if (deep.followers && deep.followers > 0) {
            if (!out.followers) out.followers = deep.followers;
            if (!out.following && deep.following) out.following = deep.following;
            if (!out.posts && deep.posts) out.posts = deep.posts;
            if (!out.description && deep.description) out.description = deep.description;
            out._sources!.push("twitter-xcom-html-js");
          }
          // Manual regex patterns specifically for X/Twitter
          if (!out.followers) {
            const fPatterns = [
              /"followers_count"\s*:\s*(\d+)/i,
              /"followersCount"\s*:\s*(\d+)/i,
              /"normal_followers_count"\s*:\s*(\d+)/i,
              /data-testid="[^"]*[Ff]ollow[^"]*"[^>]*>([\d,.KMBkmb]+)/i,
              /([\d,.KMBkmb]+)\s*Followers/gi,
            ];
            for (const p of fPatterns) {
              const m = xHtml.match(p);
              if (m?.[1]) { const v = parseHumanNumber(m[1]); if (v > 0) { out.followers = v; out._sources!.push("twitter-xcom-regex"); break; } }
            }
          }
          if (!out.posts) {
            const pMatch = xHtml.match(/"statuses_count"\s*:\s*(\d+)/i) || xHtml.match(/([\d,.KMBkmb]+)\s*(?:posts|tweets)/i);
            if (pMatch?.[1]) { const v = parseHumanNumber(pMatch[1]); if (v > 0) out.posts = v; }
          }
          if (!out.following) {
            const fgMatch = xHtml.match(/"friends_count"\s*:\s*(\d+)/i) || xHtml.match(/([\d,.KMBkmb]+)\s*Following/i);
            if (fgMatch?.[1]) { const v = parseHumanNumber(fgMatch[1]); if (v > 0) out.following = v; }
          }
        }
      } catch { /* noop */ }
    }

    // Approach 4: twitter.com fallback (legacy URL still works sometimes)
    if (!out.followers) {
      try {
        const twHtml = await fetchWithTimeout(`https://twitter.com/${encodeURIComponent(handle)}`, { ms: 8000, maxChars: 500000 });
        if (twHtml && twHtml.length > 500) {
          const deep = deepExtractFromHTML(twHtml, "twitter");
          if (deep.followers) { out.followers = deep.followers; if (deep.following) out.following = deep.following; if (deep.posts) out.posts = deep.posts; out._sources!.push("twitter-legacy-html"); }
        }
      } catch { /* noop */ }
    }

    // Approach 5: Jina-rendered X page (renders JS)
    if (!out.followers) {
      try {
        console.log(`[SCRAPE][Twitter] Trying Jina rendered page for @${handle}`);
        const md = await fetchJina(`https://x.com/${handle}`);
        if (md && md.length > 100) {
          const fMatch = md.match(/([\d,.KMBkmb]+)\s*Followers/i);
          if (fMatch) { const v = parseHumanNumber(fMatch[1]); if (v > 0) { out.followers = v; out._sources!.push("twitter-jina-xcom"); } }
          const pMatch = md.match(/([\d,.KMBkmb]+)\s*(?:posts|tweets)/i);
          if (pMatch && !out.posts) { const v = parseHumanNumber(pMatch[1]); if (v > 0) out.posts = v; }
          const flwMatch = md.match(/([\d,.KMBkmb]+)\s*Following/i);
          if (flwMatch && !out.following) { const v = parseHumanNumber(flwMatch[1]); if (v > 0) out.following = v; }
          if (!out.description) {
            const bio = md.match(/(?:bio|description)[:\s]*\n?\s*([^\n]{10,200})/i)?.[1];
            if (bio) out.description = bio.trim().slice(0, 200);
          }
        }
      } catch { /* noop */ }
    }

    // Approach 6: Third-party Twitter analytics scrapers
    if (!out.followers) {
      // Try social-searcher / tweetstats style services
      const thirdPartyUrls = [
        `https://www.socialstatus.io/api/twitter/${encodeURIComponent(handle)}`,
        `https://www.speakrj.com/audit/report/${encodeURIComponent(handle)}/twitter`,
      ];
      for (const url of thirdPartyUrls) {
        try {
          const resp = await fetchWithTimeout(url, { ms: 6000, maxChars: 200000 });
          if (resp && resp.length > 200) {
            const fMatch = resp.match(/([\d,.KMBkmb]+)\s*(?:Followers|followers)/i);
            if (fMatch) { const v = parseHumanNumber(fMatch[1]); if (v > 0) { out.followers = v; out._sources!.push("twitter-third-party"); break; } }
          }
        } catch { continue; }
      }
    }

    // Extract engagement from recent tweets if we have followers
    if (out.followers && out.followers > 0 && !out.engagementRate) {
      // Try to get recent tweet engagement via syndication
      try {
        const timelineHtml = await fetchWithTimeout(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}?count=10`, { ms: 8000, maxChars: 500000 });
        if (timelineHtml && timelineHtml.length > 500) {
          const likeMatches = [...timelineHtml.matchAll(/"(?:favorite_count|likeCount)"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n > 0).slice(0, 10);
          const replyMatches = [...timelineHtml.matchAll(/"(?:reply_count|replyCount)"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n >= 0).slice(0, 10);
          const rtMatches = [...timelineHtml.matchAll(/"(?:retweet_count|retweetCount)"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n >= 0).slice(0, 10);
          const viewMatches = [...timelineHtml.matchAll(/"(?:views?_count|viewCount)"\s*:\s*"?(\d+)/gi)].map(m => parseHumanNumber(m[1])).filter(n => n > 0).slice(0, 10);
          if (likeMatches.length >= 2) {
            out.avgLikes = Math.round(likeMatches.reduce((a, b) => a + b, 0) / likeMatches.length);
            out._sources!.push("twitter-syndication-engagement");
          }
          if (replyMatches.length >= 2) out.avgComments = Math.round(replyMatches.reduce((a, b) => a + b, 0) / replyMatches.length);
          if (rtMatches.length >= 2) out.avgShares = Math.round(rtMatches.reduce((a, b) => a + b, 0) / rtMatches.length);
          if (viewMatches.length >= 2) out.avgViews = Math.round(viewMatches.reduce((a, b) => a + b, 0) / viewMatches.length);
          if (out.avgLikes && out.followers > 0) {
            out.engagementRate = (((out.avgLikes || 0) + (out.avgComments || 0) + (out.avgShares || 0)) / out.followers) * 100;
          }
        }
      } catch { /* noop */ }
    }

    console.log(`[SCRAPE][Twitter] Final for @${handle}: followers=${out.followers}, posts=${out.posts}, ER=${out.engagementRate?.toFixed(2)}%, sources=[${(out._sources || []).join(",")}]`);
    return out;
  };

  // ═══════════════════════════════════════════════════════════
  // LAYER 1: FREE REAL-TIME APIS (no key, exact counts)
  // ═══════════════════════════════════════════════════════════

  /** TikTok: Multiple free APIs for redundancy */
  const fetchTikTokFreeAPI = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    // Try primary free API
    try {
      const data = await fetchJson(`https://faas-sgp1-18bc02ac.doserverless.co/api/v1/web/fn-67a396e1-78e9-4dff-8f6a-0f07c2d80c56/default/sm-t/?username=${encodeURIComponent(handle)}`, 12000);
      if (data?.stats) {
        const s = data.stats;
        if (s.Followers) out.followers = parseHumanNumber(String(s.Followers));
        if (s.Hearts) out.totalLikes = parseHumanNumber(String(s.Hearts));
        if (s.Videos) out.posts = parseHumanNumber(String(s.Videos));
        if (s.Following) out.following = parseHumanNumber(String(s.Following));
        if (out.totalLikes && out.posts && out.posts > 0) out.avgLikes = Math.round(out.totalLikes / out.posts);
        if (out.avgLikes && out.followers && out.followers > 0) out.engagementRate = (out.avgLikes / out.followers) * 100;
        out._sources!.push("tiktok-free-api");
        console.log(`[SCRAPE][L1] TikTok Free API: followers=${out.followers}, hearts=${out.totalLikes}, videos=${out.posts}`);
      }
      if (data?.profile?.Nickname && !out.description) out.description = data.profile.Nickname;
    } catch (e) { console.log(`[SCRAPE][L1] TikTok Free API failed:`, e); }
    // If primary failed, try TikTok direct page with deep JS extraction
    if (!out.followers) {
      try {
        const html = await fetchWithTimeout(`https://www.tiktok.com/@${handle}?lang=en`, { ms: 10000, maxChars: 500000 });
        if (html && html.length > 1000) {
          const deep = deepExtractFromHTML(html, "tiktok");
          if (deep.followers && deep.followers > 0) {
            if (!out.followers) out.followers = deep.followers;
            if (!out.following && deep.following) out.following = deep.following;
            if (!out.posts && deep.posts) out.posts = deep.posts;
            if (!out.totalLikes && deep.totalLikes) out.totalLikes = deep.totalLikes;
            if (!out.description && deep.description) out.description = deep.description;
            out._sources!.push("tiktok-direct-html-js");
            console.log(`[SCRAPE][L1b] TikTok Direct HTML/JS: followers=${deep.followers}`);
          }
        }
      } catch { /* noop */ }
    }
    return out;
  };

  /** Instagram: Multiple approaches for exact public counts */
  const fetchInstagramGraphQL = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    // Approach 1: web_profile_info endpoint
    try {
      const raw = await fetchWithTimeout(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`, {
        ms: 10000, maxChars: 300000,
        headers: { "X-IG-App-ID": "936619743392459", "X-Requested-With": "XMLHttpRequest" },
      });
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const user = data?.data?.user;
          if (user) {
            if (user.edge_followed_by?.count != null) out.followers = user.edge_followed_by.count;
            if (user.edge_follow?.count != null) out.following = user.edge_follow.count;
            if (user.edge_owner_to_timeline_media?.count != null) out.posts = user.edge_owner_to_timeline_media.count;
            if (user.biography) out.description = user.biography.slice(0, 200);
            const edges = user.edge_owner_to_timeline_media?.edges || [];
            if (edges.length > 0) {
              const likes = edges.map((e: any) => e.node?.edge_liked_by?.count || e.node?.edge_media_preview_like?.count || 0).filter((n: number) => n > 0);
              const comments = edges.map((e: any) => e.node?.edge_media_to_comment?.count || 0).filter((n: number) => n >= 0);
              const views = edges.map((e: any) => e.node?.video_view_count || 0).filter((n: number) => n > 0);
              if (likes.length > 0) out.avgLikes = Math.round(likes.reduce((a: number, b: number) => a + b, 0) / likes.length);
              if (comments.length > 0) out.avgComments = Math.round(comments.reduce((a: number, b: number) => a + b, 0) / comments.length);
              if (views.length > 0) out.avgViews = Math.round(views.reduce((a: number, b: number) => a + b, 0) / views.length);
              if (out.followers && out.followers > 0 && out.avgLikes) out.engagementRate = ((out.avgLikes + (out.avgComments || 0)) / out.followers) * 100;
              if (edges.length >= 2) {
                const timestamps = edges.map((e: any) => e.node?.taken_at_timestamp).filter((t: any) => t > 0).sort((a: number, b: number) => b - a);
                if (timestamps.length >= 2) {
                  const days = Math.max((timestamps[0] - timestamps[timestamps.length - 1]) / 86400, 1);
                  out.postFrequency = (timestamps.length / days) * 7;
                }
              }
            }
            out._sources!.push("instagram-graphql-api");
            console.log(`[SCRAPE][L1] Instagram GraphQL: followers=${out.followers}, posts=${out.posts}, avgLikes=${out.avgLikes}`);
          }
        } catch { /* JSON parse fail */ }
      }
    } catch (e) { console.log(`[SCRAPE][L1] Instagram GraphQL failed:`, e); }
    // Approach 2: Direct page with deep HTML/JS extraction if GraphQL failed
    if (!out.followers) {
      try {
        const html = await fetchWithTimeout(`https://www.instagram.com/${handle}/?hl=en`, { ms: 10000, maxChars: 500000 });
        if (html && html.length > 1000) {
          const deep = deepExtractFromHTML(html, "instagram");
          if (deep.followers && deep.followers > 0) {
            if (!out.followers) out.followers = deep.followers;
            if (!out.following && deep.following) out.following = deep.following;
            if (!out.posts && deep.posts) out.posts = deep.posts;
            if (!out.description && deep.description) out.description = deep.description;
            if (!out.avgLikes && deep.avgLikes) out.avgLikes = deep.avgLikes;
            if (!out.avgComments && deep.avgComments) out.avgComments = deep.avgComments;
            out._sources!.push("instagram-direct-html-js");
            console.log(`[SCRAPE][L1b] Instagram Direct HTML/JS: followers=${deep.followers}`);
          }
        }
      } catch { /* noop */ }
    }
    return out;
  };

  /** GitHub: Free API (no key needed, 60 req/hr) */
  const fetchGitHubAPI = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    try {
      const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(handle)}`, 8000);
      if (data && !data.message) {
        if (data.followers != null) out.followers = data.followers;
        if (data.following != null) out.following = data.following;
        if (data.public_repos != null) out.posts = data.public_repos;
        if (data.bio) out.description = data.bio.slice(0, 200);
        out._sources!.push("github-api");
        console.log(`[SCRAPE][L1] GitHub API: followers=${out.followers}, repos=${out.posts}`);
      }
    } catch { /* noop */ }
    return out;
  };

  /** Bluesky: Free AT Protocol API */
  const fetchBlueskyAPI = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    try {
      const data = await fetchJson(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`, 8000);
      if (data && !data.error) {
        if (data.followersCount != null) out.followers = data.followersCount;
        if (data.followsCount != null) out.following = data.followsCount;
        if (data.postsCount != null) out.posts = data.postsCount;
        if (data.description) out.description = data.description.slice(0, 200);
        out._sources!.push("bluesky-at-api");
        console.log(`[SCRAPE][L1] Bluesky API: followers=${out.followers}, posts=${out.posts}`);
      }
    } catch { /* noop */ }
    return out;
  };

  /** Mastodon: Free API */
  const fetchMastodonAPI = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    let instance = "mastodon.social";
    let username = handle;
    if (handle.includes("@")) {
      const parts = handle.split("@").filter(Boolean);
      if (parts.length >= 2) { username = parts[0]; instance = parts[1]; }
    }
    try {
      const searchData = await fetchJson(`https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`, 8000);
      if (searchData && searchData.id) {
        if (searchData.followers_count != null) out.followers = searchData.followers_count;
        if (searchData.following_count != null) out.following = searchData.following_count;
        if (searchData.statuses_count != null) out.posts = searchData.statuses_count;
        if (searchData.note) out.description = searchData.note.replace(/<[^>]*>/g, "").slice(0, 200);
        out._sources!.push("mastodon-api");
      }
    } catch { /* noop */ }
    return out;
  };

  /** Twitch: Sullygnome public stats page (no API key needed) */
  const fetchTwitchStats = async (handle: string): Promise<ScrapedMetrics> => {
    const out: ScrapedMetrics = { _sources: [] };
    try {
      const md = await fetchJina(`https://sullygnome.com/channel/${encodeURIComponent(handle)}`);
      if (md && md.length > 200) {
        const fMatch = md.match(/([\d,.KMBkmb]+)\s*followers/i);
        if (fMatch) { const v = parseHumanNumber(fMatch[1]); if (v > 0) out.followers = v; }
        const vMatch = md.match(/([\d,.KMBkmb]+)\s*(?:total\s*)?views/i);
        if (vMatch) { const v = parseHumanNumber(vMatch[1]); if (v > 100) out.totalViews = v; }
        const avgViewersMatch = md.match(/average\s*(?:viewers?|viewership)\s*[:\s]*([\d,.KMBkmb]+)/i);
        if (avgViewersMatch) { const v = parseHumanNumber(avgViewersMatch[1]); if (v > 0) out.avgViews = v; }
        if (out.followers) out._sources!.push("sullygnome-twitch");
      }
    } catch { /* noop */ }
    return out;
  };

  // ═══════════════════════════════════════════════════════════
  // LAYER 2: SOCIALBLADE (30d historical + engagement rates)
  // ═══════════════════════════════════════════════════════════

  const parseInstagramSB = (md: string): ScrapedMetrics => {
    const out: ScrapedMetrics = { _sources: [] };
    const followersMatch = md.match(/followers\s*\n\s*([\d,]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);
    const followingMatch = md.match(/following\s*\n\s*([\d,]+)/i);
    if (followingMatch) out.following = parseHumanNumber(followingMatch[1]);
    const mediaMatch = md.match(/media\s*count\s*\n\s*([\d,]+)/i);
    if (mediaMatch) out.posts = parseHumanNumber(mediaMatch[1]);
    const erMatch = md.match(/engagement\s*rate\s*\n\s*([\d.,]+%)/i);
    if (erMatch) { const er = parseFloat(erMatch[1].replace(/%/, "")); if (Number.isFinite(er)) out.engagementRate = er; }
    const likesMatch = md.match(/average\s*likes\s*\n\s*([\d,.\sKMBkmb]+)/i);
    if (likesMatch) { const v = parseHumanNumber(likesMatch[1].replace(/,/g, "")); if (v > 0) out.avgLikes = v; }
    const commentsMatch = md.match(/average\s*comments\s*\n\s*([\d,.\sKMBkmb]+)/i);
    if (commentsMatch) { const v = parseHumanNumber(commentsMatch[1].replace(/,/g, "")); if (v >= 0) out.avgComments = v; }
    const totalLikesMatch = md.match(/total\s*likes\s*\n\s*([\d,.KMBkmb]+)/i);
    if (totalLikesMatch) out.totalLikes = parseHumanNumber(totalLikesMatch[1]);
    const gains = extractLast30Row(md);
    if (gains.length >= 3) {
      out.followerGain30d = gains[0];
      const mediaGain = gains[2];
      if (Number.isFinite(mediaGain) && mediaGain !== 0) out.postFrequency = Math.abs((mediaGain / 30) * 7);
      if (out.followers && out.followers > 0) out.growthRate = (gains[0] / out.followers) * 100;
    }
    if (out.followers || out.avgLikes) out._sources!.push("socialblade-instagram");
    return out;
  };

  const parseTikTokSB = (md: string): ScrapedMetrics => {
    const out: ScrapedMetrics = { _sources: [] };
    const followersMatch = md.match(/followers\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);
    const followingMatch = md.match(/following\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followingMatch) out.following = parseHumanNumber(followingMatch[1]);
    let totalLikes = 0;
    const likesMatch = md.match(/(?:total\s*)?likes\s*\n\s*([\d,.KMBkmb]+)/i);
    if (likesMatch) { totalLikes = parseHumanNumber(likesMatch[1]); out.totalLikes = totalLikes; }
    const videosMatch = md.match(/videos\s*\n\s*([\d,.KMBkmb]+)/i);
    if (videosMatch) out.posts = parseHumanNumber(videosMatch[1]);
    if (totalLikes > 0 && out.posts && out.posts > 0) out.avgLikes = Math.round(totalLikes / out.posts);
    const gains = extractLast30Row(md);
    if (gains.length >= 4) {
      out.followerGain30d = gains[0];
      out.likeGain30d = gains[2];
      const videoGain = gains[3];
      if (Number.isFinite(videoGain) && videoGain !== 0) out.postFrequency = Math.abs((videoGain / 30) * 7);
      if (out.followers && out.followers > 0) out.growthRate = (gains[0] / out.followers) * 100;
    }
    if (out.avgLikes && out.followers && out.followers > 0) out.engagementRate = (out.avgLikes / out.followers) * 100;
    if (out.followers || out.totalLikes) out._sources!.push("socialblade-tiktok");
    return out;
  };

  const parseYouTubeSB = (md: string): ScrapedMetrics => {
    const out: ScrapedMetrics = { _sources: [] };
    const subPatterns = [/(?:subscribers?|subs?)\s*\n\s*([\d,.KMBkmb]+)/i, /([\d,.KMBkmb]+)\s*(?:subscribers?|subs?)/i, /subscriber\s*count[:\s]*([\d,.KMBkmb]+)/i];
    for (const p of subPatterns) { const m = md.match(p); if (m) { const v = parseHumanNumber(m[1]); if (v > 0) { out.followers = v; break; } } }
    const vidPatterns = [/(?:videos?|uploads?)\s*\n\s*([\d,.KMBkmb]+)/i, /([\d,.KMBkmb]+)\s*(?:videos?|uploads?)/i];
    for (const p of vidPatterns) { const m = md.match(p); if (m) { const v = parseHumanNumber(m[1]); if (v > 0) { out.posts = v; break; } } }
    const viewPatterns = [/(?:total\s*)?video\s*views?\s*\n\s*([\d,.KMBkmb]+)/i, /total\s*views?\s*[:\n]\s*([\d,.KMBkmb]+)/i, /views?\s*\n\s*([\d,.KMBkmb]+)/i];
    for (const p of viewPatterns) { const m = md.match(p); if (m) { const v = parseHumanNumber(m[1]); if (v > 1000) { out.totalViews = v; break; } } }
    if (out.totalViews && out.posts && out.posts > 0) out.avgViews = Math.round(out.totalViews / out.posts);
    const gains = extractLast30Row(md);
    if (gains.length >= 2) {
      out.followerGain30d = gains[0]; out.viewGain30d = gains[1];
      if (gains.length >= 3) { const vg = gains[gains.length - 1]; if (Number.isFinite(vg) && vg !== 0) out.postFrequency = Math.abs((vg / 30) * 7); }
      if (out.followers && out.followers > 0) out.growthRate = (gains[0] / out.followers) * 100;
    }
    if (!out.viewGain30d) { const m = md.match(/(?:monthly|30\s*day)\s*(?:video\s*)?views?\s*[:\n]\s*([-+]?\s*[\d,.KMBkmb]+)/i); if (m) out.viewGain30d = parseHumanNumber(m[1]); }
    const gradeMatch = md.match(/(?:subscriber|channel)\s*(?:rank|grade)\s*\n\s*([A-Z][+-]?)/i);
    if (gradeMatch) out.description = (out.description ? out.description + " | " : "") + "Grade: " + gradeMatch[1];
    const earningsMatch = md.match(/estimated\s*(?:monthly\s*)?earnings?\s*[:\n]\s*\$?([\d,.KMBkmb]+)/i);
    if (earningsMatch) out.description = (out.description ? out.description + " | " : "") + "Est. Earnings: $" + earningsMatch[1];
    if (out.followers || out.totalViews) out._sources!.push("socialblade-youtube");
    return out;
  };

  const parseTwitterSB = (md: string): ScrapedMetrics => {
    const out: ScrapedMetrics = { _sources: [] };
    const followersMatch = md.match(/followers\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);
    const followingMatch = md.match(/following\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followingMatch) out.following = parseHumanNumber(followingMatch[1]);
    const tweetsMatch = md.match(/(?:tweets?|posts?)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (tweetsMatch) out.posts = parseHumanNumber(tweetsMatch[1]);
    const gains = extractLast30Row(md);
    if (gains.length >= 1) { out.followerGain30d = gains[0]; if (out.followers && out.followers > 0) out.growthRate = (gains[0] / out.followers) * 100; }
    if (out.followers) out._sources!.push("socialblade-twitter");
    return out;
  };

  const parseFacebookSB = (md: string): ScrapedMetrics => {
    const out: ScrapedMetrics = { _sources: [] };
    const followersMatch = md.match(/(?:total\s+page\s+likes|followers|page\s+likes)\s*\n\s*([\d,.KMBkmb]+)/i);
    if (followersMatch) out.followers = parseHumanNumber(followersMatch[1]);
    const gains = extractLast30Row(md);
    if (gains.length >= 1) { out.followerGain30d = gains[0]; if (out.followers && out.followers > 0) out.growthRate = (gains[0] / out.followers) * 100; }
    if (out.followers) out._sources!.push("socialblade-facebook");
    return out;
  };

  // ═══════════════════════════════════════════════════════════
  // LAYER 3: YOUTUBE RSS + WATCH PAGE ENRICHMENT
  // ═══════════════════════════════════════════════════════════

  const enrichYoutubeFromRecentVideos = async (handle: string, knownFollowers: number, current: ScrapedMetrics) => {
    let channelId = "";
    // Try direct page first for channelId (faster than Jina)
    const channelPage = await fetchWithTimeout(`https://www.youtube.com/@${handle}`, { ms: 8000, maxChars: 500000 });
    if (channelPage) {
      channelId = channelPage.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i)?.[1]
        || channelPage.match(/"channelId":"(UC[\w-]{20,})"/i)?.[1]
        || channelPage.match(/"externalId":"(UC[\w-]{20,})"/i)?.[1]
        || "";
      // Extract additional data from page HTML via deep JS extraction
      if (!current.followers || !current.totalViews) {
        const deep = deepExtractFromHTML(channelPage, "youtube");
        if (!current.followers && deep.followers) current.followers = deep.followers;
        if (!current.totalViews && deep.totalViews) current.totalViews = deep.totalViews;
        if (!current.posts && deep.posts) current.posts = deep.posts;
        if (!current.description && deep.description) current.description = deep.description;
        if (deep.followers || deep.totalViews) current._sources = [...(current._sources || []), "youtube-direct-html-js"];
      }
      if (!current.followers) {
        const subRaw = channelPage.match(/"subscriberCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/i)?.[1]
          || channelPage.match(/"subscriberCount"\s*:\s*"?(\d+)/i)?.[1] || "";
        if (subRaw) { const v = parseHumanNumber(subRaw); if (v > 0) current.followers = v; }
      }
      if (!current.totalViews) {
        const viewsRaw = channelPage.match(/"viewCount"\s*:\s*"(\d+)"/i)?.[1] || "";
        if (viewsRaw) { const v = parseHumanNumber(viewsRaw); if (v > 0) current.totalViews = v; }
      }
    }
    // Jina fallback for channelId
    if (!channelId) {
      const jinaPage = await fetchJina(`https://www.youtube.com/@${handle}`);
      if (jinaPage) {
        channelId = jinaPage.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i)?.[1]
          || jinaPage.match(/"channelId":"(UC[\w-]{20,})"/i)?.[1]
          || jinaPage.match(/UC[\w-]{20,}/)?.[0] || "";
        if (!current.followers) { const subMatch = jinaPage.match(/([\d,.KMBkmb]+)\s*subscribers/i); if (subMatch) current.followers = parseHumanNumber(subMatch[1]); }
        if (!current.posts) { const vidMatch = jinaPage.match(/([\d,.KMBkmb]+)\s*videos/i); if (vidMatch) current.posts = parseHumanNumber(vidMatch[1]); }
        if (current.followers) current._sources = [...(current._sources || []), "youtube-jina-channel"];
      }
    }
    if (!channelId) { console.log(`[SCRAPE] YouTube: Could not find channelId for @${handle}`); return current; }
    console.log(`[SCRAPE] YouTube: Found channelId=${channelId} for @${handle}`);

    const rss = await fetchWithTimeout(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { ms: 8000, maxChars: 220000 });
    if (!rss) return current;
    const videos: { id: string; published: string }[] = [];
    for (const match of rss.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]{0,500}?<published>([^<]+)<\/published>/g)) {
      videos.push({ id: match[1], published: match[2] });
      if (videos.length >= 8) break;
    }
    if (videos.length === 0) return current;
    console.log(`[SCRAPE][L3] YouTube: Scraping ${videos.length} recent videos for real engagement...`);

    // Parallel video page fetches with deep JS extraction
    const details = await Promise.allSettled(videos.map(async (v) => {
      // Try direct HTML first (faster, and deep extractor gets JSON data)
      const rawWatch = await fetchWithTimeout(`https://www.youtube.com/watch?v=${v.id}`, { ms: 8000, maxChars: 500000 });
      if (rawWatch && rawWatch.length > 1000) {
        return {
          likes: parseHumanNumber(rawWatch.match(/"likeCount":"(\d+)"/i)?.[1] || rawWatch.match(/"likes"\s*:\s*"?(\d+)/i)?.[1] || ""),
          comments: parseHumanNumber(rawWatch.match(/"commentCount":"(\d+)"/i)?.[1] || ""),
          views: parseHumanNumber(rawWatch.match(/"viewCount":"(\d+)"/i)?.[1] || ""),
        };
      }
      // Jina fallback
      const watch = await fetchJina(`https://www.youtube.com/watch?v=${v.id}`);
      if (!watch) return { likes: 0, comments: 0, views: 0 };
      return {
        likes: parseHumanNumber(watch.match(/([\d,.KMBkmb]+)\s*likes?/i)?.[1] || watch.match(/"likeCount":"(\d+)"/i)?.[1] || ""),
        comments: parseHumanNumber(watch.match(/([\d,.KMBkmb]+)\s*comments?/i)?.[1] || watch.match(/"commentCount":"(\d+)"/i)?.[1] || ""),
        views: parseHumanNumber(watch.match(/([\d,.KMBkmb]+)\s*views/i)?.[1] || watch.match(/"viewCount":"(\d+)"/i)?.[1] || ""),
      };
    }));

    const likes = details.map(d => d.status === "fulfilled" ? d.value.likes : 0).filter(n => n > 0);
    const comments = details.map(d => d.status === "fulfilled" ? d.value.comments : 0).filter(n => n > 0);
    const views = details.map(d => d.status === "fulfilled" ? d.value.views : 0).filter(n => n > 0);
    console.log(`[SCRAPE][L3] YouTube @${handle} video stats: likes=[${likes.join(",")}] comments=[${comments.join(",")}] views=[${views.join(",")}]`);

    if (likes.length) { current.avgLikes = Math.round(likes.reduce((a, b) => a + b, 0) / likes.length); current._sources = [...(current._sources || []), "youtube-rss-videos"]; }
    if (comments.length) current.avgComments = Math.round(comments.reduce((a, b) => a + b, 0) / comments.length);
    if (views.length) current.avgViews = Math.round(views.reduce((a, b) => a + b, 0) / views.length);
    if (videos.length >= 2) {
      const first = new Date(videos[videos.length - 1].published).getTime();
      const last = new Date(videos[0].published).getTime();
      const days = Math.max((last - first) / (1000 * 60 * 60 * 24), 1);
      if (!current.postFrequency || current.postFrequency === 0) current.postFrequency = (videos.length / days) * 7;
    }
    const effectiveFollowers = current.followers || knownFollowers;
    if (effectiveFollowers > 0 && current.avgLikes) current.engagementRate = ((current.avgLikes + (current.avgComments || 0)) / effectiveFollowers) * 100;
    return current;
  };

  // ═══════════════════════════════════════════════════════════
  // LAYER 4: JINA READER FOR REMAINING PLATFORMS
  // ═══════════════════════════════════════════════════════════

  const extractFromJinaProfile = (md: string, platform: string, merged: ScrapedMetrics) => {
    const followerPatterns = [/([\d,.KMBkmb]+)\s*followers/i, /([\d,.KMBkmb]+)\s*subscribers/i, /([\d,.KMBkmb]+)\s*members/i, /([\d,.KMBkmb]+)\s*monthly\s*listeners/i];
    for (const p of followerPatterns) { const m = md.match(p); if (m) { const v = parseHumanNumber(m[1]); if (v > 0 && !merged.followers) { merged.followers = v; break; } } }
    const followingMatch = md.match(/([\d,.KMBkmb]+)\s*following/i);
    if (followingMatch && !merged.following) merged.following = parseHumanNumber(followingMatch[1]);
    const postPatterns = [/([\d,.KMBkmb]+)\s*(?:posts|pins|videos|tweets|toots|tracks|photos|boards|shots|projects)/i];
    for (const p of postPatterns) { const m = md.match(p); if (m) { const v = parseHumanNumber(m[1]); if (v > 0 && !merged.posts) { merged.posts = v; break; } } }
    const likeValues = [...md.matchAll(/(\d[\d,]*)\s*(?:likes?|reactions?|♥|❤️|hearts?)\b/gi)].map(m => parseHumanNumber(m[1])).filter(n => n > 0 && n < 1e9).slice(0, 15);
    const commentValues = [...md.matchAll(/(\d[\d,]*)\s*(?:comments?|replies)\b/gi)].map(m => parseHumanNumber(m[1])).filter(n => n >= 0 && n < 1e8).slice(0, 15);
    const viewValues = [...md.matchAll(/(\d[\d,.KMBkmb]*)\s*(?:views?|plays?|impressions?|listens?|streams?)\b/gi)].map(m => parseHumanNumber(m[1])).filter(n => n > 0).slice(0, 15);
    if (!merged.avgLikes && likeValues.length) merged.avgLikes = Math.round(likeValues.reduce((a, b) => a + b, 0) / likeValues.length);
    if (!merged.avgComments && commentValues.length) merged.avgComments = Math.round(commentValues.reduce((a, b) => a + b, 0) / commentValues.length);
    if (!merged.avgViews && viewValues.length) merged.avgViews = Math.round(viewValues.reduce((a, b) => a + b, 0) / viewValues.length);
    if (!merged.description) {
      const bio = md.match(/(?:bio|about|description)[:\s]*\n?\s*([^\n]{10,200})/i)?.[1];
      if (bio) merged.description = bio.trim().slice(0, 200);
    }
    if (merged.followers) merged._sources = [...(merged._sources || []), `jina-${platform}`];
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN ORCHESTRATOR: 7-layer merge with source priority
  // ═══════════════════════════════════════════════════════════

  const scrapeOnePlatform = async (platform: string, rawHandle: string) => {
    const handle = rawHandle.replace(/^@/, "").trim();
    if (!handle) return;
    const key = platform.toLowerCase() === "x" ? "twitter" : platform.toLowerCase();
    const merged: ScrapedMetrics = { _sources: [] };

    const mergeFrom = (src: ScrapedMetrics, overrideCore = false) => {
      if (overrideCore || !merged.followers) { if (src.followers && src.followers > 0) merged.followers = src.followers; }
      if (overrideCore || !merged.following) { if (src.following && src.following > 0) merged.following = src.following; }
      if (overrideCore || !merged.posts) { if (src.posts && src.posts > 0) merged.posts = src.posts; }
      if (overrideCore || !merged.description) { if (src.description) merged.description = src.description; }
      if (!merged.avgLikes && src.avgLikes && src.avgLikes > 0) merged.avgLikes = src.avgLikes;
      if (!merged.avgComments && src.avgComments && src.avgComments >= 0) merged.avgComments = src.avgComments;
      if (!merged.avgViews && src.avgViews && src.avgViews > 0) merged.avgViews = src.avgViews;
      if (!merged.avgShares && src.avgShares && src.avgShares > 0) merged.avgShares = src.avgShares;
      if (!merged.totalLikes && src.totalLikes && src.totalLikes > 0) merged.totalLikes = src.totalLikes;
      if (!merged.totalViews && src.totalViews && src.totalViews > 0) merged.totalViews = src.totalViews;
      if (!merged.engagementRate && src.engagementRate && src.engagementRate > 0) merged.engagementRate = src.engagementRate;
      if (!merged.postFrequency && src.postFrequency && src.postFrequency > 0) merged.postFrequency = src.postFrequency;
      if (!merged.growthRate && src.growthRate && Number.isFinite(src.growthRate)) merged.growthRate = src.growthRate;
      if (!merged.followerGain30d && src.followerGain30d && Number.isFinite(src.followerGain30d)) merged.followerGain30d = src.followerGain30d;
      if (!merged.viewGain30d && src.viewGain30d && Number.isFinite(src.viewGain30d)) merged.viewGain30d = src.viewGain30d;
      if (!merged.likeGain30d && src.likeGain30d && Number.isFinite(src.likeGain30d)) merged.likeGain30d = src.likeGain30d;
      merged._sources = [...(merged._sources || []), ...(src._sources || [])];
    };

    // ── LAYER 0: OEmbed / Nitter (instant, exact) ──
    const l0 = await fetchOembedData(key, handle);
    mergeFrom(l0);

    // ── LAYER 1: Free Real-Time APIs (exact counts) ──
    if (key === "tiktok") {
      const l1 = await fetchTikTokFreeAPI(handle);
      mergeFrom(l1, true);
    }
    if (key === "instagram") {
      const l1 = await fetchInstagramGraphQL(handle);
      mergeFrom(l1, true);
    }
    if (key === "github") {
      const l1 = await fetchGitHubAPI(handle);
      mergeFrom(l1, true);
      if (merged.followers) { results[key] = merged; return; }
    }
    if (key === "bluesky") {
      const l1 = await fetchBlueskyAPI(handle);
      mergeFrom(l1, true);
      if (merged.followers) { results[key] = merged; return; }
    }
    if (key === "mastodon") {
      const l1 = await fetchMastodonAPI(handle);
      mergeFrom(l1, true);
      if (merged.followers) { results[key] = merged; return; }
    }
    if (key === "twitch") {
      const l1 = await fetchTwitchStats(handle);
      mergeFrom(l1);
    }
    if (key === "reddit") {
      const isSubreddit = !handle.startsWith("u_") && !handle.startsWith("u/");
      const redditUrls = isSubreddit
        ? [`https://www.reddit.com/r/${handle}/about.json`, `https://www.reddit.com/user/${handle}/about.json`]
        : [`https://www.reddit.com/user/${handle.replace(/^u[_/]/, "")}/about.json`];
      for (const rUrl of redditUrls) {
        const data = await fetchJson(rUrl, 8000);
        if (data?.data) {
          const d = data.data;
          if (d.subscribers) merged.followers = d.subscribers;
          if (d.active_user_count) merged.avgViews = d.active_user_count;
          if (d.total_karma) merged.totalLikes = d.total_karma;
          if (d.public_description) merged.description = d.public_description.slice(0, 200);
          if (d.created_utc && d.subscribers) {
            const ageDays = (Date.now() / 1000 - d.created_utc) / 86400;
            if (ageDays > 30) merged.growthRate = (d.subscribers / ageDays) * 7 / d.subscribers * 100;
          }
          merged._sources = [...(merged._sources || []), "reddit-json-api"];
          break;
        }
      }
    }
    if (key === "discord") {
      const data = await fetchJson(`https://discord.com/api/v9/invites/${handle}?with_counts=true`, 6000);
      if (data) {
        if (data.approximate_member_count) merged.followers = data.approximate_member_count;
        if (data.approximate_presence_count) merged.avgViews = data.approximate_presence_count;
        if (data.guild?.description) merged.description = data.guild.description.slice(0, 200);
        merged._sources = [...(merged._sources || []), "discord-invite-api"];
      }
    }

    // ── LAYER 2: SocialBlade via Jina (30d historical gains + secondary counts) ──
    let sbUrl = "";
    let sbParser: ((md: string) => ScrapedMetrics) | null = null;
    if (key === "instagram") { sbUrl = `https://socialblade.com/instagram/user/${encodeURIComponent(handle)}`; sbParser = parseInstagramSB; }
    else if (key === "tiktok") { sbUrl = `https://socialblade.com/tiktok/user/${encodeURIComponent(handle)}`; sbParser = parseTikTokSB; }
    else if (key === "youtube") { sbParser = parseYouTubeSB; }
    else if (key === "twitter") { sbUrl = `https://socialblade.com/twitter/user/${encodeURIComponent(handle)}`; sbParser = parseTwitterSB; }
    else if (key === "facebook") { sbUrl = `https://socialblade.com/facebook/page/${encodeURIComponent(handle)}`; sbParser = parseFacebookSB; }
    else if (key === "twitch") {
      sbUrl = `https://socialblade.com/twitch/user/${encodeURIComponent(handle)}`;
      sbParser = (md: string) => {
        const out: ScrapedMetrics = { _sources: [] };
        const fMatch = md.match(/followers\s*\n\s*([\d,.KMBkmb]+)/i);
        if (fMatch) out.followers = parseHumanNumber(fMatch[1]);
        const vMatch = md.match(/(?:total\s*)?views?\s*\n\s*([\d,.KMBkmb]+)/i);
        if (vMatch) { const v = parseHumanNumber(vMatch[1]); if (v > 1000) out.totalViews = v; }
        const gains = extractLast30Row(md);
        if (gains.length >= 1) { out.followerGain30d = gains[0]; if (out.followers && out.followers > 0) out.growthRate = (gains[0] / out.followers) * 100; }
        if (gains.length >= 2) out.viewGain30d = gains[1];
        if (out.followers) out._sources!.push("socialblade-twitch");
        return out;
      };
    }

    if (key === "youtube" && sbParser) {
      const ytUrls = [
        `https://socialblade.com/youtube/c/${encodeURIComponent(handle)}`,
        `https://socialblade.com/youtube/@${encodeURIComponent(handle)}`,
        `https://socialblade.com/youtube/user/${encodeURIComponent(handle)}`,
      ];
      for (const tryUrl of ytUrls) {
        console.log(`[SCRAPE][L2] Trying YouTube SocialBlade: ${tryUrl}`);
        const md = await fetchJina(tryUrl);
        if (md && md.length > 300) {
          const parsed = sbParser(md);
          if (parsed.followers && parsed.followers > 0) { mergeFrom(parsed); break; }
        }
      }
    } else if (sbUrl && sbParser) {
      console.log(`[SCRAPE][L2] Fetching SocialBlade via Jina for ${key}/@${handle}`);
      const md = await fetchJina(sbUrl);
      if (md && md.length > 200) { const parsed = sbParser(md); mergeFrom(parsed); }
    }

    // ── LAYER 3: YouTube RSS + video-level enrichment ──
    if (key === "youtube") await enrichYoutubeFromRecentVideos(handle, merged.followers || 0, merged);

    // ── LAYER 4: Jina Reader for remaining platforms ──
    if (key === "linkedin" && !merged.followers) {
      const md = await fetchJina(`https://www.linkedin.com/company/${handle}/`);
      if (md && md.length > 100) extractFromJinaProfile(md, "linkedin", merged);
    }
    if (key === "threads" && !merged.followers) {
      const md = await fetchJina(`https://www.threads.net/@${handle}`);
      if (md && md.length > 100) extractFromJinaProfile(md, "threads", merged);
    }
    if (key === "pinterest" && !merged.followers) {
      const md = await fetchJina(`https://www.pinterest.com/${handle}/`);
      if (md && md.length > 100) {
        extractFromJinaProfile(md, "pinterest", merged);
        const monthlyViews = md.match(/([\d,.KMBkmb]+)\s*monthly\s*views/i)?.[1];
        if (monthlyViews) { const v = parseHumanNumber(monthlyViews); if (v > 0) merged.avgViews = Math.round(v / 30); }
        const pinsMatch = md.match(/([\d,.KMBkmb]+)\s*pins/i)?.[1];
        if (pinsMatch && !merged.posts) merged.posts = parseHumanNumber(pinsMatch);
      }
    }
    if (key === "snapchat" && !merged.followers) {
      const md = await fetchJina(`https://www.snapchat.com/add/${handle}`);
      if (md && md.length > 50) extractFromJinaProfile(md, "snapchat", merged);
    }
    if (key === "spotify" && !merged.followers) {
      const md = await fetchJina(`https://open.spotify.com/artist/${handle}`);
      if (md && md.length > 100) {
        const listenersMatch = md.match(/([\d,.KMBkmb]+)\s*monthly\s*listeners/i)?.[1];
        if (listenersMatch) merged.followers = parseHumanNumber(listenersMatch);
        extractFromJinaProfile(md, "spotify", merged);
      }
    }
    const jinaFallbackPlatforms: Record<string, string> = {
      tumblr: `https://${handle}.tumblr.com`,
      vimeo: `https://vimeo.com/${handle}`,
      medium: `https://medium.com/@${handle}`,
      soundcloud: `https://soundcloud.com/${handle}`,
      patreon: `https://www.patreon.com/${handle}`,
      dribbble: `https://dribbble.com/${handle}`,
      behance: `https://www.behance.net/${handle}`,
      telegram: `https://t.me/${handle}`,
      clubhouse: `https://www.clubhouse.com/@${handle}`,
    };
    if (key in jinaFallbackPlatforms && !merged.followers) {
      const md = await fetchJina(jinaFallbackPlatforms[key]);
      if (md && md.length > 50) extractFromJinaProfile(md, key, merged);
    }

    // ── LAYER 5: Direct platform page with DEEP HTML/JS scraping ──
    if (!merged.followers) {
      let directUrl = "";
      if (key === "instagram") directUrl = `https://www.instagram.com/${handle}/?hl=en`;
      else if (key === "tiktok") directUrl = `https://www.tiktok.com/@${handle}?lang=en`;
      else if (key === "youtube") directUrl = `https://www.youtube.com/@${handle}`;
      else if (key === "twitter") directUrl = `https://nitter.net/${handle}`;
      else if (key === "facebook") directUrl = `https://www.facebook.com/${handle}/`;
      else if (key === "threads") directUrl = `https://www.threads.net/@${handle}`;

      if (directUrl) {
        const raw = await fetchWithTimeout(directUrl, { ms: 10000, maxChars: 500000 });
        if (raw && raw.length > 500) {
          // Deep JS/HTML extraction
          const deep = deepExtractFromHTML(raw, key);
          mergeFrom(deep);

          // Fallback regex patterns for specific platforms
          if (!merged.followers) {
            const followerPatterns = [
              /([\d,.KMBkmb]+)\s*(?:Followers|Subscribers|followers|subscribers)/i,
              /"(?:followers_count|followerCount|edge_followed_by)"[:\s]*[{\s]*"?(?:count"?[:\s]*)?(\d+)/i,
            ];
            for (const p of followerPatterns) {
              const m = raw.match(p);
              if (m?.[1]) { const v = parseHumanNumber(m[1]); if (v > 0) { merged.followers = v; merged._sources = [...(merged._sources || []), `direct-regex-${key}`]; break; } }
            }
          }
          if (!merged.description) {
            const desc = raw.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
              || raw.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || "";
            if (desc.trim()) merged.description = desc.trim().slice(0, 200);
          }
        }
      }
    }

    // ── LAYER 6: Jina-rendered deep page as absolute last resort ──
    if (!merged.followers) {
      let profileUrl = "";
      if (key === "instagram") profileUrl = `https://www.instagram.com/${handle}/`;
      else if (key === "tiktok") profileUrl = `https://www.tiktok.com/@${handle}`;
      else if (key === "twitter") profileUrl = `https://x.com/${handle}`;
      else if (key === "facebook") profileUrl = `https://www.facebook.com/${handle}`;
      else if (key === "threads") profileUrl = `https://www.threads.net/@${handle}`;

      if (profileUrl) {
        console.log(`[SCRAPE][L6] Jina rendered page for ${key}/@${handle}`);
        const md = await fetchJina(profileUrl);
        if (md && md.length > 100) {
          extractFromJinaProfile(md, key, merged);
        }
      }
    }

    // ── FINAL: Derive ER only if all other layers failed to provide it ──
    if (!merged.engagementRate && merged.followers && merged.followers > 0 && (merged.avgLikes || merged.avgComments)) {
      merged.engagementRate = (((merged.avgLikes || 0) + (merged.avgComments || 0)) / merged.followers) * 100;
      merged._sources = [...(merged._sources || []), "derived-er"];
    }
    // Derive avgLikes from totalLikes/posts if not yet available
    if (!merged.avgLikes && merged.totalLikes && merged.posts && merged.posts > 0) {
      merged.avgLikes = Math.round(merged.totalLikes / merged.posts);
      merged._sources = [...(merged._sources || []), "derived-avglikes"];
    }
    // Derive avgViews from totalViews/posts if not yet available
    if (!merged.avgViews && merged.totalViews && merged.posts && merged.posts > 0) {
      merged.avgViews = Math.round(merged.totalViews / merged.posts);
      merged._sources = [...(merged._sources || []), "derived-avgviews"];
    }

    console.log(`[SCRAPE] ═══ ${key}/@${handle} FINAL: followers=${merged.followers}, ER=${merged.engagementRate?.toFixed(2)}%, sources=[${(merged._sources || []).join(",")}] ═══`);

    if (Object.keys(merged).filter(k => k !== "_sources").length > 0) {
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
  following: parseMetricNumber(metric?.following),
  posts: parseMetricNumber(metric?.posts),
  engagementRate: parseMetricNumber(metric?.engagementRate),
  avgLikes: parseMetricNumber(metric?.avgLikes),
  avgComments: parseMetricNumber(metric?.avgComments),
  avgViews: parseMetricNumber(metric?.avgViews),
  avgShares: parseMetricNumber(metric?.avgShares),
  totalLikes: parseMetricNumber(metric?.totalLikes),
  totalViews: parseMetricNumber(metric?.totalViews),
  postFrequency: parseMetricNumber(metric?.postFrequency),
  growthRate: parseMetricNumber(metric?.growthRate),
  followerGain30d: parseMetricNumber(metric?.followerGain30d),
  viewGain30d: parseMetricNumber(metric?.viewGain30d),
  likeGain30d: parseMetricNumber(metric?.likeGain30d),
});

/** Extract social handles from a website homepage — uses Jina for JS-heavy sites + direct fetch */
const extractSocialHandlesFromWebsite = async (websiteUrl: string): Promise<Record<string, string>> => {
  const handles: Record<string, string> = {};
  const normalizeHandle = (raw: string) => raw.replace(/^@/, "").replace(/[/?#].*$/, "").trim();
  const excludeHandles = new Set(["share", "sharer", "intent", "hashtag", "search", "home", "watch", "channel", "embed", "privacy", "terms", "help", "login", "signup", "about", "explore", "settings", "p", "reel", "stories", "live", "company", "in", "pages", "groups", "events", "marketplace", "jobs", "feed", "notifications", "messages", "ads", "create", "profile", "tag", "direct", "accounts", "oauth", "api", "developers", "policies", "legal"]);
  const isValidHandle = (h: string) => {
    const clean = normalizeHandle(h);
    return clean.length >= 2 && clean.length <= 60 && !excludeHandles.has(clean.toLowerCase()) && !/^[\d]+$/.test(clean) && !/^[a-f0-9]{32,}$/i.test(clean);
  };

  const extractFromHtml = (html: string) => {
    // Core 6 platforms - multiple regex patterns for each
    const igPatterns = [
      /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]{2,30})(?:[/?#]|$)/gi,
      /href=["'][^"']*instagram\.com\/([a-zA-Z0-9_.]{2,30})/gi,
    ];
    for (const p of igPatterns) {
      for (const m of html.matchAll(p)) {
        if (m[1] && isValidHandle(m[1]) && !handles.instagram) { handles.instagram = normalizeHandle(m[1]); break; }
      }
      if (handles.instagram) break;
    }

    const ttPatterns = [
      /tiktok\.com\/@?([a-zA-Z0-9_.]{2,30})(?:[/?#]|$)/gi,
      /href=["'][^"']*tiktok\.com\/@?([a-zA-Z0-9_.]{2,30})/gi,
    ];
    for (const p of ttPatterns) {
      for (const m of html.matchAll(p)) {
        if (m[1] && isValidHandle(m[1]) && !handles.tiktok) { handles.tiktok = normalizeHandle(m[1]); break; }
      }
      if (handles.tiktok) break;
    }

    const twPatterns = [
      /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})(?:[/?#]|$)/gi,
      /href=["'][^"']*(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/gi,
    ];
    for (const p of twPatterns) {
      for (const m of html.matchAll(p)) {
        if (m[1] && isValidHandle(m[1]) && !handles.twitter) { handles.twitter = normalizeHandle(m[1]); break; }
      }
      if (handles.twitter) break;
    }

    const ytPatterns = [
      /youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]{2,50})(?:[/?#]|$)/gi,
      /href=["'][^"']*youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]{2,50})/gi,
      /youtu\.be\/([a-zA-Z0-9_-]{2,50})/gi,
    ];
    for (const p of ytPatterns) {
      for (const m of html.matchAll(p)) {
        if (m[1] && isValidHandle(m[1]) && !handles.youtube) { handles.youtube = normalizeHandle(m[1]); break; }
      }
      if (handles.youtube) break;
    }

    const liPatterns = [
      /linkedin\.com\/(?:company|in|school)\/([a-zA-Z0-9_-]{2,50})(?:[/?#]|$)/gi,
      /href=["'][^"']*linkedin\.com\/(?:company|in|school)\/([a-zA-Z0-9_-]{2,50})/gi,
    ];
    for (const p of liPatterns) {
      for (const m of html.matchAll(p)) {
        if (m[1] && isValidHandle(m[1]) && !handles.linkedin) { handles.linkedin = normalizeHandle(m[1]); break; }
      }
      if (handles.linkedin) break;
    }

    const fbPatterns = [
      /facebook\.com\/([a-zA-Z0-9_.]{2,50})(?:[/?#]|$)/gi,
      /fb\.com\/([a-zA-Z0-9_.]{2,50})(?:[/?#]|$)/gi,
      /href=["'][^"']*facebook\.com\/([a-zA-Z0-9_.]{2,50})/gi,
    ];
    for (const p of fbPatterns) {
      for (const m of html.matchAll(p)) {
        if (m[1] && isValidHandle(m[1]) && !handles.facebook) { handles.facebook = normalizeHandle(m[1]); break; }
      }
      if (handles.facebook) break;
    }

    // Extended platforms
    const pin = html.match(/pinterest\.com\/([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (pin && isValidHandle(pin) && !handles.pinterest) handles.pinterest = normalizeHandle(pin);

    const snap = html.match(/snapchat\.com\/add\/([a-zA-Z0-9_.]{2,30})(?:[/?#]|$)/i)?.[1];
    if (snap && isValidHandle(snap) && !handles.snapchat) handles.snapchat = normalizeHandle(snap);

    const threads = html.match(/threads\.net\/@?([a-zA-Z0-9_.]{2,30})(?:[/?#]|$)/i)?.[1];
    if (threads && isValidHandle(threads) && !handles.threads) handles.threads = normalizeHandle(threads);

    const discord = html.match(/discord\.(?:gg|com\/invite)\/([a-zA-Z0-9_-]{2,30})(?:[/?#]|$)/i)?.[1];
    if (discord && !handles.discord) handles.discord = discord;

    const twitch = html.match(/twitch\.tv\/([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (twitch && isValidHandle(twitch) && !handles.twitch) handles.twitch = normalizeHandle(twitch);

    const reddit = html.match(/reddit\.com\/(?:r|u|user)\/([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (reddit && isValidHandle(reddit) && !handles.reddit) handles.reddit = normalizeHandle(reddit);

    const spotify = html.match(/open\.spotify\.com\/(?:artist|show|user)\/([a-zA-Z0-9]{22})(?:[/?#]|$)/i)?.[1];
    if (spotify && !handles.spotify) handles.spotify = spotify;

    const whatsapp = html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\+?(\d{7,15})(?:[/?#]|$)/i)?.[1];
    if (whatsapp && !handles.whatsapp) handles.whatsapp = whatsapp;

    const telegram = html.match(/t\.me\/([a-zA-Z0-9_]{2,32})(?:[/?#]|$)/i)?.[1];
    if (telegram && isValidHandle(telegram) && !handles.telegram) handles.telegram = normalizeHandle(telegram);

    // Additional platforms
    const tumblr = html.match(/([a-zA-Z0-9_-]+)\.tumblr\.com/i)?.[1];
    if (tumblr && isValidHandle(tumblr) && !handles.tumblr) handles.tumblr = normalizeHandle(tumblr);

    const vimeo = html.match(/vimeo\.com\/([a-zA-Z0-9_-]{2,30})(?:[/?#]|$)/i)?.[1];
    if (vimeo && isValidHandle(vimeo) && !handles.vimeo) handles.vimeo = normalizeHandle(vimeo);

    const medium = html.match(/medium\.com\/@?([a-zA-Z0-9_.]{2,30})(?:[/?#]|$)/i)?.[1];
    if (medium && isValidHandle(medium) && !handles.medium) handles.medium = normalizeHandle(medium);

    const github = html.match(/github\.com\/([a-zA-Z0-9_-]{2,40})(?:[/?#]|$)/i)?.[1];
    if (github && isValidHandle(github) && !handles.github) handles.github = normalizeHandle(github);

    const clubhouse = html.match(/(?:joinclubhouse|clubhouse)\.com\/@?([a-zA-Z0-9_.]{2,30})(?:[/?#]|$)/i)?.[1];
    if (clubhouse && isValidHandle(clubhouse) && !handles.clubhouse) handles.clubhouse = normalizeHandle(clubhouse);

    const mastodon = html.match(/(?:mastodon\.social|mstdn\.social)\/@([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (mastodon && isValidHandle(mastodon) && !handles.mastodon) handles.mastodon = normalizeHandle(mastodon);

    const bluesky = html.match(/bsky\.app\/profile\/([a-zA-Z0-9_.-]{2,60})(?:[/?#]|$)/i)?.[1];
    if (bluesky && !handles.bluesky) handles.bluesky = bluesky;

    const soundcloud = html.match(/soundcloud\.com\/([a-zA-Z0-9_-]{2,30})(?:[/?#]|$)/i)?.[1];
    if (soundcloud && isValidHandle(soundcloud) && !handles.soundcloud) handles.soundcloud = normalizeHandle(soundcloud);

    const patreon = html.match(/patreon\.com\/([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (patreon && isValidHandle(patreon) && !handles.patreon) handles.patreon = normalizeHandle(patreon);

    const dribbble = html.match(/dribbble\.com\/([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (dribbble && isValidHandle(dribbble) && !handles.dribbble) handles.dribbble = normalizeHandle(dribbble);

    const behance = html.match(/behance\.net\/([a-zA-Z0-9_]{2,30})(?:[/?#]|$)/i)?.[1];
    if (behance && isValidHandle(behance) && !handles.behance) handles.behance = normalizeHandle(behance);
  };

  try {
    // 1) Try direct fetch first (faster)
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(websiteUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" },
    });
    clearTimeout(tid);
    if (res.ok) {
      const html = (await res.text()).slice(0, 250000);
      extractFromHtml(html);
    }
  } catch { /* noop */ }

  // 2) ALWAYS also try Jina (renders JS, catches dynamically loaded links and footer links)
  try {
    const jinaCtrl = new AbortController();
    const jinaTid = setTimeout(() => jinaCtrl.abort(), 15000);
    const jinaRes = await fetch(`https://r.jina.ai/${websiteUrl}`, {
      signal: jinaCtrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentAnalyzer/1.0)" },
    });
    clearTimeout(jinaTid);
    if (jinaRes.ok) {
      const md = (await jinaRes.text()).slice(0, 250000);
      extractFromHtml(md);
    }
  } catch { /* noop */ }

  // 3) Also try common subpages where social links live (about, contact, footer)
  const subpages = ["/about", "/contact", "/links"];
  const baseUrl = websiteUrl.replace(/\/$/, "");
  for (const sub of subpages) {
    if (Object.keys(handles).length >= 6) break; // already found enough
    try {
      const sp = await fetch(`https://r.jina.ai/${baseUrl}${sub}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentAnalyzer/1.0)" },
      });
      if (sp.ok) {
        const txt = (await sp.text()).slice(0, 100000);
        extractFromHtml(txt);
      }
    } catch { /* noop */ }
  }

  console.log(`[SCRAPE] Extracted ${Object.keys(handles).length} social handles from ${websiteUrl}:`, JSON.stringify(handles));
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

          const pickBetter = (scraped: number | undefined, prev: number, minVal = 0) =>
            typeof scraped === "number" && Number.isFinite(scraped) && scraped > minVal ? scraped : prev;

          platformMetrics[key] = {
            ...prev,
            followers: nextFollowers,
            following: pickBetter(scrapedData.following, prev.following),
            posts: nextPosts,
            engagementRate: typeof scrapedData.engagementRate === "number" && Number.isFinite(scrapedData.engagementRate) && scrapedData.engagementRate > 0
              ? scrapedData.engagementRate
              : prev.engagementRate,
            avgLikes: pickBetter(scrapedData.avgLikes, prev.avgLikes),
            avgComments: typeof scrapedData.avgComments === "number" && Number.isFinite(scrapedData.avgComments) && scrapedData.avgComments >= 0
              ? scrapedData.avgComments
              : prev.avgComments,
            avgViews: pickBetter(scrapedData.avgViews, prev.avgViews),
            avgShares: pickBetter(scrapedData.avgShares, prev.avgShares),
            totalLikes: pickBetter(scrapedData.totalLikes, prev.totalLikes),
            totalViews: pickBetter(scrapedData.totalViews, prev.totalViews),
            postFrequency: pickBetter(scrapedData.postFrequency, prev.postFrequency),
            growthRate: typeof scrapedData.growthRate === "number" && Number.isFinite(scrapedData.growthRate)
              ? scrapedData.growthRate
              : (derivedGrowth ?? prev.growthRate),
            followerGain30d: typeof scrapedData.followerGain30d === "number" && Number.isFinite(scrapedData.followerGain30d)
              ? scrapedData.followerGain30d
              : prev.followerGain30d,
            viewGain30d: pickBetter(scrapedData.viewGain30d, prev.viewGain30d),
            likeGain30d: typeof scrapedData.likeGain30d === "number" && Number.isFinite(scrapedData.likeGain30d)
              ? scrapedData.likeGain30d
              : prev.likeGain30d,
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
                // Use the enhanced extractSocialHandlesFromWebsite (Jina + direct)
                const socialHandles = await extractSocialHandlesFromWebsite(siteUrl);

                if (Object.keys(socialHandles).length > 0) {
                  console.log("[SCRAPE] Found social handles on website:", JSON.stringify(socialHandles));
                  // Scrape ALL platforms that have scraping support (not just SocialBlade 6)
                  const scrapeable: Record<string, string> = {};
                  const supportedScrape = ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin", "reddit", "threads", "pinterest", "twitch", "snapchat", "discord", "spotify", "mastodon", "bluesky", "tumblr", "vimeo", "medium", "soundcloud", "patreon", "dribbble", "behance", "github", "telegram"];
                  for (const [k, v] of Object.entries(socialHandles)) {
                    if (supportedScrape.includes(k)) {
                      scrapeable[k] = v;
                    }
                  }
                  scrapedData = await scrapeSocialProfiles(scrapeable);
                  if (Object.keys(scrapedData).length > 0 || Object.keys(socialHandles).length > 0) {
                    scrapeContext = "\n\n=== VERIFIED SOCIAL PROFILE DATA (scraped in real-time via multi-layer APIs - USE THESE EXACT NUMBERS) ===\n";
                    for (const [plat, data] of Object.entries(scrapedData)) {
                      const parts = [];
                      if (data.followers) parts.push(`followers: ${data.followers.toLocaleString()}`);
                      if (data.following) parts.push(`following: ${data.following.toLocaleString()}`);
                      if (data.posts) parts.push(`posts: ${data.posts.toLocaleString()}`);
                      if (data.avgLikes) parts.push(`avgLikes: ${data.avgLikes.toLocaleString()}`);
                      if (data.avgComments) parts.push(`avgComments: ${data.avgComments.toLocaleString()}`);
                      if (data.avgViews) parts.push(`avgViews: ${data.avgViews.toLocaleString()}`);
                      if (data.engagementRate) parts.push(`engagementRate: ${data.engagementRate.toFixed(2)}%`);
                      if (data.totalLikes) parts.push(`totalLikes: ${data.totalLikes.toLocaleString()}`);
                      if (data.totalViews) parts.push(`totalViews: ${data.totalViews.toLocaleString()}`);
                      if (data.postFrequency) parts.push(`postFrequency: ${data.postFrequency.toFixed(1)}/week`);
                      if (data.growthRate) parts.push(`growthRate30d: ${data.growthRate.toFixed(3)}%`);
                      if (data.followerGain30d) parts.push(`followerGain30d: ${data.followerGain30d.toLocaleString()}`);
                      if (data.description) parts.push(`bio: "${data.description.slice(0, 150)}"`);
                      const sources = (data._sources || []).join(", ");
                      scrapeContext += `${plat}: ${parts.join(", ")} [sources: ${sources}]\n`;
                    }
                    for (const [plat, handle] of Object.entries(socialHandles)) {
                      if (!scrapedData[plat]) {
                        scrapeContext += `${plat}: handle found = @${handle} (no detailed metrics scraped)\n`;
                      }
                    }
                    scrapeContext += "=== END VERIFIED DATA ===\n";
                    scrapeContext += "CRITICAL: Use the above VERIFIED numbers EXACTLY in platformMetrics. These are real-time scraped, not estimates.\n";
                    scrapeContext += `ALL DISCOVERED SOCIAL PLATFORMS: ${JSON.stringify(socialHandles)}\n`;
                    scrapeContext += "Include ALL discovered platforms in socialPresence even if no metrics were scraped.\n";
                  }
                }
              } catch (e) {
                console.log("[SCRAPE] Website social extraction failed:", e);
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
                    pinterest: { type: "string" },
                    snapchat: { type: "string" },
                    threads: { type: "string" },
                    discord: { type: "string" },
                    twitch: { type: "string" },
                    reddit: { type: "string" },
                    spotify: { type: "string" },
                    telegram: { type: "string" },
                    whatsapp: { type: "string" },
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
            // Merge ALL scraped data into platformMetrics to override AI hallucinations with real data
            if (Object.keys(scrapedData).length > 0) {
              parsed.platformMetrics = parsed.platformMetrics || {};
              for (const [plat, scraped] of Object.entries(scrapedData)) {
                const prev = parsed.platformMetrics[plat] || {};
                parsed.platformMetrics[plat] = {
                  ...prev,
                  // Real-time API data always wins over AI guesses
                  followers: scraped.followers ?? prev.followers ?? 0,
                  following: scraped.following ?? prev.following ?? 0,
                  posts: scraped.posts ?? prev.posts ?? 0,
                  engagementRate: scraped.engagementRate ?? prev.engagementRate ?? 0,
                  avgLikes: scraped.avgLikes ?? prev.avgLikes ?? 0,
                  avgComments: scraped.avgComments ?? prev.avgComments ?? 0,
                  avgViews: scraped.avgViews ?? prev.avgViews ?? 0,
                  avgShares: scraped.avgShares ?? prev.avgShares ?? 0,
                  totalLikes: scraped.totalLikes ?? prev.totalLikes ?? 0,
                  totalViews: scraped.totalViews ?? prev.totalViews ?? 0,
                  postFrequency: scraped.postFrequency ?? prev.postFrequency ?? 0,
                  growthRate: scraped.growthRate ?? prev.growthRate ?? 0,
                  followerGain30d: scraped.followerGain30d ?? prev.followerGain30d ?? 0,
                  viewGain30d: scraped.viewGain30d ?? prev.viewGain30d ?? 0,
                  likeGain30d: scraped.likeGain30d ?? prev.likeGain30d ?? 0,
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

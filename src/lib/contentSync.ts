/**
 * Inter-Tab Content Sync Utility
 * Flow: Competitor Intel → Content Plan (content_calendar) → Social Hub (social_posts)
 *
 * CORE FEATURES:
 *  - exportSandboxToDrafts, pushToSocialHub, pullContentPlanForPlatform
 *  - importCompetitorIntelToPlan, distributeToAllPlatforms
 *  - syncMediaPlanIdeas, cloneAsTemplate, pullAllContentForPlatform
 *
 * 5 NEW INTER FEATURES (v2):
 *  F6  orchestratePlanToPlatforms – full 3-step flow with platform selection + execution mode
 *  F7  detectPlanPlatforms        – scan content plan to find all platforms present
 *  F8  batchPrepareContent        – prepare content (assign schedule, group by platform) without posting
 *  F9  generateMediaPlaceholders  – create media generation tasks from plan descriptions
 *  F10 getSyncDashboard           – real-time sync status across all platforms
 */
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
export interface ContentPlanItem {
  id?: string;
  title: string;
  caption: string;
  platform: string;
  content_type: string;
  hashtags?: string[];
  scheduled_at?: string | null;
  media_urls?: string[] | null;
  description?: string | null;
  viral_score?: number;
  cta?: string | null;
  metadata?: Record<string, any>;
  status?: string;
  account_id?: string | null;
}

export interface SocialPostPayload {
  account_id: string;
  platform: string;
  post_type: string;
  caption: string;
  media_urls?: string[];
  hashtags?: string[] | null;
  scheduled_at?: string | null;
  status: string;
  metadata?: Record<string, any>;
}

export interface SyncEvent {
  action: string;
  source: string;
  destination: string;
  item_count: number;
  timestamp: string;
  details?: Record<string, any>;
}

export type ExecutionMode = "manual" | "automated";

export interface OrchestrationResult {
  mode: ExecutionMode;
  platforms_processed: string[];
  per_platform: Record<string, { created: number; scheduled: number; errors: string[] }>;
  total_created: number;
  total_scheduled: number;
}

export interface PlatformSyncStatus {
  platform: string;
  plan_count: number;
  pushed_count: number;
  scheduled_count: number;
  has_account: boolean;
  account_username?: string;
}

/* ─── Audit trail ─── */
const syncLog: SyncEvent[] = [];

export const logSyncEvent = (
  action: string, source: string, destination: string, itemCount: number, details?: Record<string, any>
): SyncEvent => {
  const evt: SyncEvent = { action, source, destination, item_count: itemCount, timestamp: new Date().toISOString(), details };
  syncLog.push(evt);
  if (syncLog.length > 200) syncLog.splice(0, syncLog.length - 200);
  return evt;
};

export const getSyncLog = (): SyncEvent[] => [...syncLog];

/* ─── 1. Export Sandbox cards → content_calendar drafts ─── */
export const exportSandboxToDrafts = async (
  cards: { title?: string; caption?: string; platform?: string; type?: string; hashtags?: string[]; annotation?: string }[]
): Promise<number> => {
  let created = 0;
  for (const card of cards) {
    const { error } = await supabase.from("content_calendar").insert({
      title: card.title || "Sandbox Export",
      caption: card.caption || "",
      platform: card.platform || "instagram",
      content_type: card.type || "post",
      hashtags: card.hashtags || [],
      description: card.annotation || "Exported from Sandbox",
      status: "draft",
      metadata: { source: "sandbox_export", exported_at: new Date().toISOString() },
    });
    if (!error) created++;
  }
  logSyncEvent("export_sandbox", "sandbox", "content_calendar", created);
  return created;
};

/* ─── 2. Push content_calendar items → social_posts ─── */
export const pushToSocialHub = async (
  items: ContentPlanItem[], accountId: string, autoSchedule = false, bestTimes?: string[]
): Promise<{ created: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let scheduledAt = item.scheduled_at || null;

    if (autoSchedule && !scheduledAt && bestTimes?.length) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + Math.floor(i / bestTimes.length) + 1);
      const timeStr = bestTimes[i % bestTimes.length];
      const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const mins = parseInt(timeParts[2]) || 0;
        const ampm = timeParts[3]?.toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        baseDate.setHours(hours, mins, 0, 0);
      }
      scheduledAt = baseDate.toISOString();
    }

    const payload: SocialPostPayload = {
      account_id: accountId,
      platform: item.platform || "instagram",
      post_type: item.content_type || "post",
      caption: item.caption || "",
      media_urls: item.media_urls || [],
      hashtags: item.hashtags || null,
      scheduled_at: scheduledAt,
      status: scheduledAt ? "scheduled" : "draft",
      metadata: {
        ...(item.metadata || {}),
        synced_from_content_plan: true,
        content_calendar_id: item.id || null,
        synced_at: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from("social_posts").insert(payload);
    if (error) {
      errors.push(`${item.title}: ${error.message}`);
    } else {
      created++;
      if (item.id && scheduledAt) {
        await supabase.from("content_calendar").update({
          status: "scheduled",
          scheduled_at: scheduledAt,
          metadata: { ...(item.metadata || {}), pushed_to_social: true, social_account_id: accountId },
        }).eq("id", item.id);
      }
    }
  }

  logSyncEvent("push_to_social", "content_calendar", `social_posts/${items[0]?.platform || "unknown"}`, created, { errors_count: errors.length });
  return { created, errors };
};

/* ─── 3. Pull content_calendar items for a specific platform ─── */
export const pullContentPlanForPlatform = async (
  platform: string, statuses: string[] = ["draft", "planned", "scheduled"]
): Promise<ContentPlanItem[]> => {
  const { data, error } = await supabase
    .from("content_calendar").select("*")
    .eq("platform", platform).in("status", statuses)
    .order("scheduled_at", { ascending: true, nullsFirst: false }).limit(100);
  if (error || !data) return [];
  return data as ContentPlanItem[];
};

/* ─── 4. Get connected accounts for a platform ─── */
export const getConnectedAccounts = async (platform: string) => {
  const { data } = await supabase
    .from("social_connections")
    .select("id, account_id, platform_username, is_connected")
    .eq("platform", platform).eq("is_connected", true);
  return data || [];
};

/* ─── 5. Default best posting times per platform ─── */
export const DEFAULT_BEST_TIMES: Record<string, string[]> = {
  instagram: ["9:00 AM", "12:00 PM", "3:00 PM", "7:00 PM"],
  tiktok: ["7:00 AM", "10:00 AM", "2:00 PM", "9:00 PM"],
  twitter: ["8:00 AM", "12:00 PM", "5:00 PM"],
  facebook: ["9:00 AM", "1:00 PM", "4:00 PM"],
  threads: ["8:00 AM", "12:00 PM", "6:00 PM"],
  onlyfans: ["10:00 PM", "11:00 PM", "8:00 PM"],
};

/* ─── 6. Batch auto-schedule ─── */
export const autoScheduleBatch = async (
  items: ContentPlanItem[], accountId: string, platform: string,
  customBestTimes?: string[], startDaysFromNow = 1
): Promise<{ created: number; errors: string[] }> => {
  const times = customBestTimes || DEFAULT_BEST_TIMES[platform] || ["12:00 PM"];
  const scheduled = items.map((item) => ({ ...item, platform, scheduled_at: null as string | null }));
  return pushToSocialHub(scheduled, accountId, true, times);
};

/* ═══ F1 – Import Competitor Intel → Content Plan Drafts ═══ */
export const importCompetitorIntelToPlan = async (
  userId: string, platforms: string[] = ["instagram", "tiktok", "facebook", "threads"]
): Promise<{ created: number; competitors: number }> => {
  const { data: competitors } = await supabase
    .from("competitor_profiles")
    .select("username, platform, top_hashtags, content_types, engagement_rate, avg_likes, post_frequency, metadata")
    .eq("user_id", userId).in("platform", platforms);

  if (!competitors?.length) return { created: 0, competitors: 0 };

  let created = 0;
  for (const comp of competitors) {
    const contentTypes = (comp.content_types as any[]) || [];
    const topType = contentTypes.sort((a: any, b: any) => (b.pct || 0) - (a.pct || 0))[0];
    const hashtags = (comp.top_hashtags || []).slice(0, 10);
    const bestType = topType?.type || "post";

    const { error } = await supabase.from("content_calendar").insert({
      title: `Inspired by @${comp.username} – ${comp.platform}`,
      caption: `Engagement strategy inspired by @${comp.username} (${(comp.engagement_rate || 0).toFixed(1)}% ER, ~${comp.avg_likes || 0} avg likes). Post frequency: ${comp.post_frequency || 0}/week.`,
      platform: comp.platform,
      content_type: bestType,
      hashtags,
      status: "draft",
      metadata: { source: "competitor_intel", competitor_username: comp.username, engagement_rate: comp.engagement_rate, imported_at: new Date().toISOString() },
    });
    if (!error) created++;
  }

  logSyncEvent("import_competitor_intel", "competitor_profiles", "content_calendar", created, { competitors: competitors.length });
  return { created, competitors: competitors.length };
};

/* ═══ F2 – Distribute to ALL Connected Platforms ═══ */
export const distributeToAllPlatforms = async (
  items: ContentPlanItem[], autoSchedule = true
): Promise<{ total_created: number; per_platform: Record<string, number>; errors: string[] }> => {
  const allPlatforms = Object.keys(DEFAULT_BEST_TIMES);
  const allErrors: string[] = [];
  const perPlatform: Record<string, number> = {};
  let totalCreated = 0;

  for (const platform of allPlatforms) {
    const accounts = await getConnectedAccounts(platform);
    if (!accounts.length) continue;
    const accountId = accounts[0].account_id;
    const platformItems = items.map(item => ({ ...item, platform }));
    const { created, errors } = await pushToSocialHub(platformItems, accountId, autoSchedule, DEFAULT_BEST_TIMES[platform]);
    perPlatform[platform] = created;
    totalCreated += created;
    allErrors.push(...errors);
  }

  logSyncEvent("distribute_all_platforms", "content_calendar", "social_posts/*", totalCreated, { per_platform: perPlatform });
  return { total_created: totalCreated, per_platform: perPlatform, errors: allErrors };
};

/* ═══ F3 – Sync Media Plan Ideas (grouped by week) ═══ */
export interface MediaPlanWeek {
  weekLabel: string;
  startDate: string;
  items: ContentPlanItem[];
  totalViral: number;
}

export const syncMediaPlanIdeas = async (platform?: string): Promise<MediaPlanWeek[]> => {
  let query = supabase.from("content_calendar").select("*")
    .in("status", ["draft", "planned", "scheduled"])
    .order("scheduled_at", { ascending: true, nullsFirst: false }).limit(200);
  if (platform) query = query.eq("platform", platform);
  const { data } = await query;
  if (!data?.length) return [];

  const weeks: Record<string, ContentPlanItem[]> = {};
  for (const item of data) {
    const d = item.scheduled_at ? new Date(item.scheduled_at) : new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(item as ContentPlanItem);
  }

  return Object.entries(weeks).map(([key, items]) => ({
    weekLabel: key, startDate: items[0]?.scheduled_at || new Date().toISOString(), items,
    totalViral: items.reduce((sum, i) => sum + (i.viral_score || 0), 0),
  }));
};

/* ═══ F4 – Clone as Template ═══ */
export const cloneAsTemplate = async (
  sourceId: string, source: "content_calendar" | "social_posts" = "content_calendar"
): Promise<string | null> => {
  if (source === "content_calendar") {
    const { data } = await supabase.from("content_calendar").select("*").eq("id", sourceId).single();
    if (!data) return null;
    const { error, data: inserted } = await supabase.from("content_calendar").insert({
      title: `[Template] ${data.title}`, caption: data.caption, platform: data.platform,
      content_type: data.content_type, hashtags: data.hashtags, description: data.description,
      media_urls: data.media_urls, cta: data.cta, status: "draft",
      metadata: { ...(typeof data.metadata === "object" && data.metadata ? data.metadata : {}), source: "template_clone", cloned_from: sourceId, cloned_at: new Date().toISOString() },
    }).select("id").single();
    if (error) return null;
    logSyncEvent("clone_template", "content_calendar", "content_calendar", 1, { source_id: sourceId });
    return inserted?.id || null;
  } else {
    const { data } = await supabase.from("social_posts").select("*").eq("id", sourceId).single();
    if (!data) return null;
    const { error, data: inserted } = await supabase.from("content_calendar").insert({
      title: `[Template] ${data.platform} post`, caption: data.caption, platform: data.platform,
      content_type: data.post_type, hashtags: data.hashtags, media_urls: data.media_urls, status: "draft",
      metadata: { source: "template_clone", cloned_from_social: sourceId, cloned_at: new Date().toISOString() },
    }).select("id").single();
    if (error) return null;
    logSyncEvent("clone_template", "social_posts", "content_calendar", 1, { source_id: sourceId });
    return inserted?.id || null;
  }
};

/* ═══ F5b – Pull all content for a platform ═══ */
export const pullAllContentForPlatform = async (
  platform: string
): Promise<{ planItems: ContentPlanItem[]; competitorItems: ContentPlanItem[]; totalCount: number }> => {
  const { data } = await supabase.from("content_calendar").select("*")
    .eq("platform", platform).in("status", ["draft", "planned", "scheduled"])
    .order("created_at", { ascending: false }).limit(150);
  if (!data?.length) return { planItems: [], competitorItems: [], totalCount: 0 };

  const planItems: ContentPlanItem[] = [];
  const competitorItems: ContentPlanItem[] = [];
  for (const item of data) {
    const meta = typeof item.metadata === "object" && item.metadata ? item.metadata : {};
    const src = (meta as any).source || "";
    if (["competitor_intel", "swot_analysis", "gap_analysis"].includes(src)) {
      competitorItems.push(item as ContentPlanItem);
    } else {
      planItems.push(item as ContentPlanItem);
    }
  }
  return { planItems, competitorItems, totalCount: data.length };
};

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE F6 – Detect All Platforms in Content Plan
   ══════════════════════════════════════════════════════════════════ */
export const detectPlanPlatforms = async (): Promise<{
  platform: string;
  count: number;
  hasAccount: boolean;
  accountId?: string;
  accountUsername?: string;
}[]> => {
  const { data: planItems } = await supabase.from("content_calendar").select("platform")
    .in("status", ["draft", "planned", "scheduled"]);

  if (!planItems?.length) return [];

  // Count items per platform
  const platformCounts: Record<string, number> = {};
  for (const item of planItems) {
    const p = item.platform || "instagram";
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }

  // Check connected accounts for each platform
  const results = [];
  for (const [platform, count] of Object.entries(platformCounts)) {
    const accounts = await getConnectedAccounts(platform);
    results.push({
      platform,
      count,
      hasAccount: accounts.length > 0,
      accountId: accounts[0]?.account_id,
      accountUsername: accounts[0]?.platform_username,
    });
  }

  return results.sort((a, b) => b.count - a.count);
};

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE F7 – Full Orchestration: Plan → Platforms
   Supports Manual (prepare-only) and Automated (schedule+post) modes
   ══════════════════════════════════════════════════════════════════ */
export const orchestratePlanToPlatforms = async (
  selectedPlatforms: string[],
  mode: ExecutionMode,
  itemFilter: "all" | "drafts" | "competitor" | "selected",
  selectedItemIds?: string[],
): Promise<OrchestrationResult> => {
  const result: OrchestrationResult = {
    mode,
    platforms_processed: [],
    per_platform: {},
    total_created: 0,
    total_scheduled: 0,
  };

  for (const platform of selectedPlatforms) {
    const accounts = await getConnectedAccounts(platform);
    if (!accounts.length) {
      result.per_platform[platform] = { created: 0, scheduled: 0, errors: [`No connected ${platform} account`] };
      continue;
    }

    const accountId = accounts[0].account_id;

    // Fetch items for this platform
    let platformItems: ContentPlanItem[] = [];
    if (itemFilter === "selected" && selectedItemIds?.length) {
      const { data } = await supabase.from("content_calendar").select("*")
        .in("id", selectedItemIds).eq("platform", platform);
      platformItems = (data || []) as ContentPlanItem[];
    } else {
      const statuses = ["draft", "planned"];
      const { data } = await supabase.from("content_calendar").select("*")
        .eq("platform", platform).in("status", statuses)
        .order("scheduled_at", { ascending: true, nullsFirst: false }).limit(100);

      let items = (data || []) as ContentPlanItem[];
      if (itemFilter === "competitor") {
        items = items.filter(i => {
          const meta = typeof i.metadata === "object" && i.metadata ? i.metadata : {};
          const src = (meta as any).source || "";
          return ["competitor_intel", "swot_analysis", "gap_analysis"].includes(src);
        });
      }
      platformItems = items;
    }

    if (!platformItems.length) {
      result.per_platform[platform] = { created: 0, scheduled: 0, errors: [] };
      continue;
    }

    const isAutoSchedule = mode === "automated";
    const bestTimes = DEFAULT_BEST_TIMES[platform] || ["12:00 PM"];

    // Push items to social_posts
    const { created, errors } = await pushToSocialHub(platformItems, accountId, isAutoSchedule, bestTimes);

    const scheduledCount = isAutoSchedule ? created : 0;

    result.platforms_processed.push(platform);
    result.per_platform[platform] = { created, scheduled: scheduledCount, errors };
    result.total_created += created;
    result.total_scheduled += scheduledCount;

    // In automated mode, also mark the content_calendar items as pushed
    if (mode === "automated") {
      for (const item of platformItems) {
        if (item.id) {
          await supabase.from("content_calendar").update({
            status: "scheduled",
            metadata: { ...(item.metadata || {}), orchestrated: true, orchestration_mode: mode, pushed_at: new Date().toISOString() },
          }).eq("id", item.id);
        }
      }
    }
  }

  logSyncEvent("orchestrate_plan", "content_calendar", `social_posts/${selectedPlatforms.join(",")}`, result.total_created, {
    mode, platforms: selectedPlatforms, total_scheduled: result.total_scheduled,
  });

  return result;
};

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE F8 – Batch Prepare Content (no posting, just organize)
   ══════════════════════════════════════════════════════════════════ */
export const batchPrepareContent = async (
  platforms: string[]
): Promise<Record<string, { items: ContentPlanItem[]; suggestedSchedule: { time: string; item: ContentPlanItem }[] }>> => {
  const result: Record<string, { items: ContentPlanItem[]; suggestedSchedule: { time: string; item: ContentPlanItem }[] }> = {};

  for (const platform of platforms) {
    const items = await pullContentPlanForPlatform(platform, ["draft", "planned"]);
    const bestTimes = DEFAULT_BEST_TIMES[platform] || ["12:00 PM"];

    const suggestedSchedule = items.map((item, i) => {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + Math.floor(i / bestTimes.length) + 1);
      const timeStr = bestTimes[i % bestTimes.length];
      const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const mins = parseInt(timeParts[2]) || 0;
        const ampm = timeParts[3]?.toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        baseDate.setHours(hours, mins, 0, 0);
      }
      return { time: baseDate.toISOString(), item };
    });

    result[platform] = { items, suggestedSchedule };
  }

  logSyncEvent("batch_prepare", "content_calendar", "preview", platforms.length, { platforms });
  return result;
};

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE F9 – Generate Media Placeholders from Plan
   Creates media generation tasks for items needing visuals
   ══════════════════════════════════════════════════════════════════ */
export const generateMediaPlaceholders = async (
  items: ContentPlanItem[]
): Promise<{ queued: number; skipped: number }> => {
  let queued = 0;
  let skipped = 0;

  for (const item of items) {
    // Skip if already has media
    if (item.media_urls && item.media_urls.length > 0) { skipped++; continue; }

    // Create a generation prompt from the item
    const prompt = `Create a ${item.content_type} visual for ${item.platform}: ${item.title}. ${item.caption?.slice(0, 200) || ""}`;

    const { error } = await supabase.from("active_generation_tasks").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id || "",
      task_id: `media_plan_${item.id || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generation_type: item.content_type === "reel" || item.content_type === "story" ? "video" : "image",
      provider: "ai",
      prompt,
      status: "pending",
      metadata: { source: "media_plan_sync", content_calendar_id: item.id, platform: item.platform },
    });

    if (!error) queued++;
    else skipped++;
  }

  logSyncEvent("generate_media_placeholders", "content_calendar", "active_generation_tasks", queued, { skipped });
  return { queued, skipped };
};

/* ══════════════════════════════════════════════════════════════════
   NEW FEATURE F10 – Sync Dashboard Status
   Real-time overview of sync state across all platforms
   ══════════════════════════════════════════════════════════════════ */
export const getSyncDashboard = async (): Promise<PlatformSyncStatus[]> => {
  const platforms = Object.keys(DEFAULT_BEST_TIMES);
  const results: PlatformSyncStatus[] = [];

  // Fetch all plan items counts
  const { data: planData } = await supabase.from("content_calendar").select("platform, status")
    .in("status", ["draft", "planned", "scheduled"]);

  // Fetch all pushed social posts
  const { data: socialData } = await supabase.from("social_posts").select("platform, status")
    .in("status", ["draft", "scheduled", "published"]);

  for (const platform of platforms) {
    const planCount = (planData || []).filter(i => i.platform === platform).length;
    const pushedCount = (socialData || []).filter(i => i.platform === platform).length;
    const scheduledCount = (socialData || []).filter(i => i.platform === platform && i.status === "scheduled").length;
    const accounts = await getConnectedAccounts(platform);

    results.push({
      platform,
      plan_count: planCount,
      pushed_count: pushedCount,
      scheduled_count: scheduledCount,
      has_account: accounts.length > 0,
      account_username: accounts[0]?.platform_username,
    });
  }

  return results;
};

/**
 * Inter-Tab Content Sync Utility
 * Flow: Competitor Intel → Content Plan (content_calendar) → Social Hub (social_posts)
 *
 * 5 EXTRA FEATURES:
 *  F1  importCompetitorIntelToPlan – pull competitor_profiles intel → content_calendar drafts
 *  F2  distributeToAllPlatforms   – push one item to every connected platform at once
 *  F3  syncMediaPlanIdeas         – pull media-plan metadata from content_calendar and group by week
 *  F4  cloneAsTemplate            – duplicate a published/scheduled post as a reusable draft template
 *  F5  logSyncEvent               – lightweight audit trail for every sync action (stored in metadata)
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

/* ─── F5  logSyncEvent – audit trail ─── */
const syncLog: SyncEvent[] = [];

export const logSyncEvent = (
  action: string,
  source: string,
  destination: string,
  itemCount: number,
  details?: Record<string, any>
): SyncEvent => {
  const evt: SyncEvent = {
    action,
    source,
    destination,
    item_count: itemCount,
    timestamp: new Date().toISOString(),
    details,
  };
  syncLog.push(evt);
  // Keep last 200 events in memory
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

/* ─── 2. Push content_calendar items → social_posts for a specific platform ─── */
export const pushToSocialHub = async (
  items: ContentPlanItem[],
  accountId: string,
  autoSchedule: boolean = false,
  bestTimes?: string[]
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
  platform: string,
  statuses: string[] = ["draft", "planned", "scheduled"]
): Promise<ContentPlanItem[]> => {
  const { data, error } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("platform", platform)
    .in("status", statuses)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(100);

  if (error || !data) return [];
  return data as ContentPlanItem[];
};

/* ─── 4. Get connected accounts for a platform ─── */
export const getConnectedAccounts = async (platform: string) => {
  const { data } = await supabase
    .from("social_connections")
    .select("id, account_id, platform_username, is_connected")
    .eq("platform", platform)
    .eq("is_connected", true);
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
  items: ContentPlanItem[],
  accountId: string,
  platform: string,
  customBestTimes?: string[],
  startDaysFromNow: number = 1
): Promise<{ created: number; errors: string[] }> => {
  const times = customBestTimes || DEFAULT_BEST_TIMES[platform] || ["12:00 PM"];
  const scheduled = items.map((item) => ({
    ...item,
    platform,
    scheduled_at: null as string | null,
  }));
  return pushToSocialHub(scheduled, accountId, true, times);
};

/* ════════════════════════════════════════════════════════════════
   FEATURE F1 – Import Competitor Intel → Content Plan Drafts
   ════════════════════════════════════════════════════════════════ */
export const importCompetitorIntelToPlan = async (
  userId: string,
  platforms: string[] = ["instagram", "tiktok", "facebook", "threads"]
): Promise<{ created: number; competitors: number }> => {
  const { data: competitors } = await supabase
    .from("competitor_profiles")
    .select("username, platform, top_hashtags, content_types, engagement_rate, avg_likes, post_frequency, metadata")
    .eq("user_id", userId)
    .in("platform", platforms);

  if (!competitors?.length) return { created: 0, competitors: 0 };

  let created = 0;
  for (const comp of competitors) {
    const contentTypes = (comp.content_types as any[]) || [];
    const topType = contentTypes.sort((a: any, b: any) => (b.pct || 0) - (a.pct || 0))[0];
    const hashtags = (comp.top_hashtags || []).slice(0, 10);
    const bestType = topType?.type || "post";

    // Create a strategy draft inspired by each competitor
    const drafts = [
      {
        title: `Inspired by @${comp.username} – ${comp.platform}`,
        caption: `Engagement strategy inspired by @${comp.username} (${(comp.engagement_rate || 0).toFixed(1)}% ER, ~${comp.avg_likes || 0} avg likes). Post frequency: ${comp.post_frequency || 0}/week.`,
        platform: comp.platform,
        content_type: bestType,
        hashtags,
        status: "draft",
        metadata: {
          source: "competitor_intel",
          competitor_username: comp.username,
          engagement_rate: comp.engagement_rate,
          imported_at: new Date().toISOString(),
        },
      },
    ];

    for (const draft of drafts) {
      const { error } = await supabase.from("content_calendar").insert(draft);
      if (!error) created++;
    }
  }

  logSyncEvent("import_competitor_intel", "competitor_profiles", "content_calendar", created, { competitors: competitors.length });
  return { created, competitors: competitors.length };
};

/* ════════════════════════════════════════════════════════════════
   FEATURE F2 – Distribute to ALL Connected Platforms at once
   ════════════════════════════════════════════════════════════════ */
export const distributeToAllPlatforms = async (
  items: ContentPlanItem[],
  autoSchedule: boolean = true
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
    const times = DEFAULT_BEST_TIMES[platform];
    const { created, errors } = await pushToSocialHub(platformItems, accountId, autoSchedule, times);
    perPlatform[platform] = created;
    totalCreated += created;
    allErrors.push(...errors);
  }

  logSyncEvent("distribute_all_platforms", "content_calendar", "social_posts/*", totalCreated, { per_platform: perPlatform });
  return { total_created: totalCreated, per_platform: perPlatform, errors: allErrors };
};

/* ════════════════════════════════════════════════════════════════
   FEATURE F3 – Sync Media Plan Ideas (grouped by week)
   ════════════════════════════════════════════════════════════════ */
export interface MediaPlanWeek {
  weekLabel: string;
  startDate: string;
  items: ContentPlanItem[];
  totalViral: number;
}

export const syncMediaPlanIdeas = async (
  platform?: string
): Promise<MediaPlanWeek[]> => {
  let query = supabase
    .from("content_calendar")
    .select("*")
    .in("status", ["draft", "planned", "scheduled"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(200);

  if (platform) query = query.eq("platform", platform);

  const { data } = await query;
  if (!data?.length) return [];

  // Group by ISO week
  const weeks: Record<string, ContentPlanItem[]> = {};
  for (const item of data) {
    const d = item.scheduled_at ? new Date(item.scheduled_at) : new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(item as ContentPlanItem);
  }

  const result: MediaPlanWeek[] = Object.entries(weeks).map(([key, items]) => ({
    weekLabel: key,
    startDate: items[0]?.scheduled_at || new Date().toISOString(),
    items,
    totalViral: items.reduce((sum, i) => sum + (i.viral_score || 0), 0),
  }));

  logSyncEvent("sync_media_plan", "content_calendar", "memory", result.length, { total_items: data.length });
  return result;
};

/* ════════════════════════════════════════════════════════════════
   FEATURE F4 – Clone as Template (duplicate post as reusable draft)
   ════════════════════════════════════════════════════════════════ */
export const cloneAsTemplate = async (
  sourceId: string,
  source: "content_calendar" | "social_posts" = "content_calendar"
): Promise<string | null> => {
  if (source === "content_calendar") {
    const { data } = await supabase.from("content_calendar").select("*").eq("id", sourceId).single();
    if (!data) return null;
    const { error, data: inserted } = await supabase.from("content_calendar").insert({
      title: `[Template] ${data.title}`,
      caption: data.caption,
      platform: data.platform,
      content_type: data.content_type,
      hashtags: data.hashtags,
      description: data.description,
      media_urls: data.media_urls,
      cta: data.cta,
      status: "draft",
      metadata: { ...(typeof data.metadata === "object" && data.metadata ? data.metadata : {}), source: "template_clone", cloned_from: sourceId, cloned_at: new Date().toISOString() },
    }).select("id").single();
    if (error) return null;
    logSyncEvent("clone_template", "content_calendar", "content_calendar", 1, { source_id: sourceId });
    return inserted?.id || null;
  } else {
    const { data } = await supabase.from("social_posts").select("*").eq("id", sourceId).single();
    if (!data) return null;
    const { error, data: inserted } = await supabase.from("content_calendar").insert({
      title: `[Template] ${data.platform} post`,
      caption: data.caption,
      platform: data.platform,
      content_type: data.post_type,
      hashtags: data.hashtags,
      media_urls: data.media_urls,
      status: "draft",
      metadata: { source: "template_clone", cloned_from_social: sourceId, cloned_at: new Date().toISOString() },
    }).select("id").single();
    if (error) return null;
    logSyncEvent("clone_template", "social_posts", "content_calendar", 1, { source_id: sourceId });
    return inserted?.id || null;
  }
};

/* ════════════════════════════════════════════════════════════════
   FEATURE F5b – Pull all content for a platform (any source)
   Combines plan items + competitor intel items in one call
   ════════════════════════════════════════════════════════════════ */
export const pullAllContentForPlatform = async (
  platform: string
): Promise<{ planItems: ContentPlanItem[]; competitorItems: ContentPlanItem[]; totalCount: number }> => {
  const { data } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("platform", platform)
    .in("status", ["draft", "planned", "scheduled"])
    .order("created_at", { ascending: false })
    .limit(150);

  if (!data?.length) return { planItems: [], competitorItems: [], totalCount: 0 };

  const planItems: ContentPlanItem[] = [];
  const competitorItems: ContentPlanItem[] = [];

  for (const item of data) {
    const meta = typeof item.metadata === "object" && item.metadata ? item.metadata : {};
    const src = (meta as any).source || "";
    if (src === "competitor_intel" || src === "swot_analysis" || src === "gap_analysis") {
      competitorItems.push(item as ContentPlanItem);
    } else {
      planItems.push(item as ContentPlanItem);
    }
  }

  return { planItems, competitorItems, totalCount: data.length };
};

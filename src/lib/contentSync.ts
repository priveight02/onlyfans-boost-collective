/**
 * Inter-Tab Content Sync Utility
 * Flow: Competitor Intel → Content Plan (content_calendar) → Social Hub (social_posts)
 */
import { supabase } from "@/integrations/supabase/client";

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

    // Auto-schedule at best times if enabled
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
      // Update content_calendar status if we have the id
      if (item.id && scheduledAt) {
        await supabase.from("content_calendar").update({
          status: "scheduled",
          scheduled_at: scheduledAt,
          metadata: { ...(item.metadata || {}), pushed_to_social: true, social_account_id: accountId },
        }).eq("id", item.id);
      }
    }
  }

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

/* ─── 6. Batch auto-schedule: distribute items across best times over N days ─── */
export const autoScheduleBatch = async (
  items: ContentPlanItem[],
  accountId: string,
  platform: string,
  customBestTimes?: string[],
  startDaysFromNow: number = 1
): Promise<{ created: number; errors: string[] }> => {
  const times = customBestTimes || DEFAULT_BEST_TIMES[platform] || ["12:00 PM"];
  const scheduled = items.map((item, i) => ({
    ...item,
    platform,
    scheduled_at: null as string | null, // will be calculated by pushToSocialHub
  }));
  return pushToSocialHub(scheduled, accountId, true, times);
};

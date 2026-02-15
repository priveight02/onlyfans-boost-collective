import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────
export interface SocialProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
}

export interface UserPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  visibility: string;
  like_count: number;
  comment_count: number;
  save_count: number;
  hashtags: string[];
  created_at: string;
  updated_at: string;
  // joined
  profiles?: SocialProfile;
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles?: SocialProfile;
}

export interface UserRank {
  user_id: string;
  xp: number;
  rank_tier: string;
  points_balance: number;
  daily_login_streak: number;
  last_daily_login: string | null;
  profile_completed: boolean;
}

export interface SocialNotification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
  actor_profile?: SocialProfile;
}

// ─── Rank config ─────────────────────────────────────────
export const RANK_TIERS = [
  { name: 'metal', label: 'Metal', minXp: 0, color: '#71717a', icon: '⚙️' },
  { name: 'bronze', label: 'Bronze', minXp: 100, color: '#cd7f32', icon: '🥉' },
  { name: 'silver', label: 'Silver', minXp: 300, color: '#c0c0c0', icon: '🥈' },
  { name: 'gold', label: 'Gold', minXp: 600, color: '#ffd700', icon: '🥇' },
  { name: 'platinum', label: 'Platinum', minXp: 1000, color: '#e5e4e2', icon: '💎' },
  { name: 'diamond', label: 'Diamond', minXp: 2000, color: '#b9f2ff', icon: '💠' },
  { name: 'legend', label: 'Legend', minXp: 5000, color: '#ff6b35', icon: '🔥' },
] as const;

export function getRankInfo(tier: string) {
  return RANK_TIERS.find(r => r.name === tier) || RANK_TIERS[0];
}

export function getNextRank(tier: string) {
  const idx = RANK_TIERS.findIndex(r => r.name === tier);
  return idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function getRankProgress(xp: number, tier: string) {
  const current = getRankInfo(tier);
  const next = getNextRank(tier);
  if (!next) return 100;
  const range = next.minXp - current.minXp;
  const progress = xp - current.minXp;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ─── Hook: useUserRank ───────────────────────────────────
export function useUserRank(userId?: string) {
  const [rank, setRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('user_ranks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setRank(data as any);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const claimDailyLogin = useCallback(async () => {
    if (!userId || !rank) return;
    const today = new Date().toISOString().split('T')[0];
    if (rank.last_daily_login === today) {
      toast.info('Daily login already claimed today!');
      return;
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = rank.last_daily_login === yesterday ? rank.daily_login_streak + 1 : 1;
    const { error } = await supabase
      .from('user_ranks')
      .update({
        xp: rank.xp + 10,
        daily_login_streak: newStreak,
        last_daily_login: today,
      })
      .eq('user_id', userId);
    if (!error) {
      setRank(prev => prev ? { ...prev, xp: prev.xp + 10, daily_login_streak: newStreak, last_daily_login: today } : prev);
      toast.success(`+10 XP! Daily login streak: ${newStreak} 🔥`);
    }
  }, [userId, rank]);

  return { rank, loading, claimDailyLogin, setRank };
}

// ─── Hook: useSocialProfile ──────────────────────────────
export function useSocialProfile(username?: string) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, banner_url, bio, is_private, follower_count, following_count, post_count')
        .eq('username', username)
        .maybeSingle();
      if (data) setProfile(data as any);
      setLoading(false);
    };
    fetch();
  }, [username]);

  return { profile, loading };
}

// ─── Hook: useFollow ─────────────────────────────────────
export function useFollow(targetUserId?: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) { setLoading(false); return; }
    supabase
      .from('social_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        setIsFollowing(!!data);
        setLoading(false);
      });
  }, [user, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!user || !targetUserId) return;
    if (isFollowing) {
      await supabase.from('social_follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      setIsFollowing(false);
    } else {
      await supabase.from('social_follows').insert({ follower_id: user.id, following_id: targetUserId });
      // Send notification
      await supabase.from('social_notifications').insert({
        user_id: targetUserId,
        actor_id: user.id,
        type: 'follow',
        entity_type: 'user',
      });
      setIsFollowing(true);
    }
  }, [user, targetUserId, isFollowing]);

  return { isFollowing, loading, toggleFollow };
}

// ─── Hook: useFeed ───────────────────────────────────────
export function useFeed(mode: 'home' | 'explore' | 'profile', profileUserId?: string) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('user_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (mode === 'profile' && profileUserId) {
      query = query.eq('user_id', profileUserId);
    } else if (mode === 'home' && user) {
      // Get following ids
      const { data: follows } = await supabase
        .from('social_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      const followingIds = follows?.map(f => f.following_id) || [];
      followingIds.push(user.id); // Include own posts
      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      }
    }
    // explore = all public posts (default RLS handles it)

    const { data } = await query;
    if (!data) { setPosts([]); setLoading(false); return; }

    // Enrich with profiles and like/save status
    const userIds = [...new Set((data as any[]).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', userIds);

    let likedPostIds: string[] = [];
    let savedPostIds: string[] = [];
    if (user) {
      const postIds = (data as any[]).map(p => p.id);
      const [likesRes, savesRes] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('post_saves').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      ]);
      likedPostIds = likesRes.data?.map(l => l.post_id) || [];
      savedPostIds = savesRes.data?.map(s => s.post_id) || [];
    }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const enriched = (data as any[]).map(post => ({
      ...post,
      profiles: profileMap.get(post.user_id),
      is_liked: likedPostIds.includes(post.id),
      is_saved: savedPostIds.includes(post.id),
    }));

    setPosts(enriched);
    setLoading(false);
  }, [mode, profileUserId, user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
}

// ─── Post actions ────────────────────────────────────────
export async function createPost(userId: string, caption: string, mediaFile?: File, visibility = 'public') {
  let mediaUrl: string | null = null;
  if (mediaFile) {
    const ext = mediaFile.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('social-media').upload(path, mediaFile);
    if (uploadError) { toast.error('Upload failed'); return null; }
    const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(path);
    mediaUrl = urlData.publicUrl;
  }

  const hashtags = (caption.match(/#\w+/g) || []).map(h => h.slice(1));
  const { data, error } = await supabase.from('user_posts').insert({
    user_id: userId,
    caption,
    media_url: mediaUrl,
    media_type: mediaFile ? (mediaFile.type.startsWith('video') ? 'video' : 'image') : 'text',
    visibility,
    hashtags,
  }).select().single();

  if (error) { toast.error('Failed to create post'); return null; }
  toast.success('Post published! +25 XP');
  return data;
}

export async function toggleLike(userId: string, postId: string, isLiked: boolean, postOwnerId: string) {
  if (isLiked) {
    await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
  } else {
    await supabase.from('post_likes').insert({ user_id: userId, post_id: postId });
    if (userId !== postOwnerId) {
      await supabase.from('social_notifications').insert({
        user_id: postOwnerId,
        actor_id: userId,
        type: 'like',
        entity_id: postId,
        entity_type: 'post',
      });
    }
  }
}

export async function toggleSave(userId: string, postId: string, isSaved: boolean) {
  if (isSaved) {
    await supabase.from('post_saves').delete().eq('user_id', userId).eq('post_id', postId);
  } else {
    await supabase.from('post_saves').insert({ user_id: userId, post_id: postId });
  }
}

export async function addComment(userId: string, postId: string, content: string, postOwnerId: string) {
  const { data, error } = await supabase.from('post_comments').insert({
    user_id: userId,
    post_id: postId,
    content,
  }).select().single();
  if (error) { toast.error('Failed to comment'); return null; }
  if (userId !== postOwnerId) {
    await supabase.from('social_notifications').insert({
      user_id: postOwnerId,
      actor_id: userId,
      type: 'comment',
      entity_id: postId,
      entity_type: 'post',
    });
  }
  return data;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('user_posts').delete().eq('id', postId);
  if (error) { toast.error('Failed to delete'); return false; }
  toast.success('Post deleted');
  return true;
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (!data || data.length === 0) return [];
  const userIds = [...new Set(data.map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url')
    .in('user_id', userIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  return data.map(c => ({ ...c, profiles: profileMap.get(c.user_id) as any }));
}

// ─── Notifications ───────────────────────────────────────
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('social_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        // Enrich with actor profiles
        const actorIds = [...new Set(data.map(n => n.actor_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', actorIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const enriched = data.map(n => ({ ...n, actor_profile: profileMap.get(n.actor_id) as any }));
        setNotifications(enriched);
        setUnreadCount(enriched.filter(n => !n.is_read).length);
      }
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel('social-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('social_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  return { notifications, unreadCount, markAllRead };
}

// ─── Block / Report ──────────────────────────────────────
export async function blockUser(blockerId: string, blockedId: string) {
  // Also unfollow both ways
  await Promise.all([
    supabase.from('social_follows').delete().eq('follower_id', blockerId).eq('following_id', blockedId),
    supabase.from('social_follows').delete().eq('follower_id', blockedId).eq('following_id', blockerId),
    supabase.from('user_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId }),
  ]);
  toast.success('User blocked');
}

export async function reportContent(reporterId: string, targetType: string, targetId: string, reason: string, description?: string) {
  await supabase.from('user_reports').insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason, description });
  toast.success('Report submitted. Thank you.');
}

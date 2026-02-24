import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PLATFORM_LOGOS: Record<string, string> = {
  instagram: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/132px-Instagram_logo_2016.svg.png',
  tiktok: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/100px-TikTok_logo.svg.png',
  threads: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Threads_%28app%29.svg/100px-Threads_%28app%29.svg.png',
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/100px-Facebook_Logo_%282019%29.png',
  twitter: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/100px-Logo_of_Twitter.svg.png',
  youtube: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/100px-YouTube_full-color_icon_%282017%29.svg.png',
};

// Priority order for which logo to show when multiple are connected
const PLATFORM_PRIORITY = ['instagram', 'tiktok', 'threads', 'facebook', 'twitter', 'youtube'];

export function useConnectedPlatform(userId?: string) {
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('social_connections')
      .select('platform')
      .eq('user_id', userId)
      .eq('is_connected', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const platforms = data.map(d => d.platform.toLowerCase());
          const best = PLATFORM_PRIORITY.find(p => platforms.includes(p)) || platforms[0];
          setPlatform(best);
        }
      });
  }, [userId]);

  return platform;
}

interface PlatformBadgeProps {
  userId: string;
  size?: number; // badge size in px
}

export default function PlatformBadge({ userId, size = 18 }: PlatformBadgeProps) {
  const platform = useConnectedPlatform(userId);
  if (!platform || !PLATFORM_LOGOS[platform]) return null;

  return (
    <img
      src={PLATFORM_LOGOS[platform]}
      alt={platform}
      title={`Connected via ${platform}`}
      className="absolute bottom-0 right-0 rounded-full bg-background border border-border/50 p-[2px] object-contain"
      style={{ width: size, height: size }}
    />
  );
}

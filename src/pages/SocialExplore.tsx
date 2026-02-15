import { useState, useEffect } from 'react';
import { useFeed } from '@/hooks/useSocial';
import { supabase } from '@/integrations/supabase/client';
import PostCard from '@/components/social/PostCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, Search, TrendingUp, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import FollowButton from '@/components/social/FollowButton';
import { UserRankBadge } from '@/components/social/UserRankBadge';

interface SuggestedUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
}

export default function SocialExplore() {
  const { posts, loading, refetch } = useFeed('explore');
  const [searchParams] = useSearchParams();
  const tagFilter = searchParams.get('tag');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch suggested users
  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, follower_count')
      .order('follower_count', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setSuggestedUsers(data as any);
      });
  }, []);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, follower_count')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);
      setSearchResults((data || []) as any);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredPosts = tagFilter
    ? posts.filter(p => p.hashtags?.includes(tagFilter))
    : posts;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Main content */}
        <div className="flex-1 max-w-xl mx-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-10 bg-card/60 border-border/50"
            />
          </div>

          {/* Search results */}
          {searchQuery && (
            <div className="bg-card/60 border border-border/50 rounded-2xl p-4 space-y-3">
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              ) : searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center">No users found</p>
              ) : (
                searchResults.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between">
                    <Link to={`/social/u/${u.username}`} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">{u.display_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground text-sm">{u.display_name}</span>
                          <UserRankBadge userId={u.user_id} size="sm" />
                        </div>
                        <span className="text-muted-foreground text-xs">@{u.username}</span>
                      </div>
                    </Link>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))
              )}
            </div>
          )}

          {tagFilter && (
            <div className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold">#{tagFilter}</span>
              <span className="text-muted-foreground text-sm">({filteredPosts.length} posts)</span>
            </div>
          )}

          {/* Posts */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground">No posts to explore</h3>
              <p className="text-muted-foreground">Be the first to post something!</p>
            </div>
          ) : (
            filteredPosts.map(post => <PostCard key={post.id} post={post} onRefetch={refetch} />)
          )}
        </div>

        {/* Sidebar: Suggested users */}
        <div className="hidden lg:block w-80">
          <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Suggested for you
            </h3>
            {suggestedUsers.map(u => (
              <div key={u.user_id} className="flex items-center justify-between">
                <Link to={`/social/u/${u.username}`} className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{u.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-foreground text-xs font-semibold">{u.display_name}</span>
                      <UserRankBadge userId={u.user_id} size="sm" />
                    </div>
                    <span className="text-muted-foreground text-[10px]">@{u.username}</span>
                  </div>
                </Link>
                <FollowButton targetUserId={u.user_id} className="h-7 text-xs px-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

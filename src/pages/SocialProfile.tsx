import { useParams } from 'react-router-dom';
import { useSocialProfile, useFeed } from '@/hooks/useSocial';
import { useAuth } from '@/hooks/useAuth';
import FollowButton from '@/components/social/FollowButton';
import { UserRankBadge } from '@/components/social/UserRankBadge';
import RankProgressCard from '@/components/social/RankProgressCard';
import PostCard from '@/components/social/PostCard';
import CreatePostDialog from '@/components/social/CreatePostDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Grid3X3, Lock } from 'lucide-react';

export default function SocialProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useSocialProfile(username);
  const { posts, loading: postsLoading, refetch } = useFeed('profile', profile?.user_id);

  if (profileLoading) {
    return <div className="min-h-screen bg-background pt-20 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pt-20 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-foreground">User not found</h2>
        <p className="text-muted-foreground mt-2">@{username} doesn't exist.</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.user_id;
  const initial = profile.display_name?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-primary/30 to-accent/20 relative">
        {profile.banner_url && <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Profile info */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-16 flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6">
          <Avatar className="h-32 w-32 border-4 border-background">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
              <UserRankBadge userId={profile.user_id} size="md" showLabel />
              {profile.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="text-foreground mt-2 text-sm max-w-md">{profile.bio}</p>}
          </div>
          <div className="flex gap-2">
            {isOwnProfile ? (
              <CreatePostDialog onCreated={refetch} />
            ) : (
              <FollowButton targetUserId={profile.user_id} />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mb-6 border-b border-border/30 pb-4">
          <div className="text-center">
            <div className="font-bold text-foreground text-lg">{profile.post_count}</div>
            <div className="text-muted-foreground text-sm">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-foreground text-lg">{profile.follower_count}</div>
            <div className="text-muted-foreground text-sm">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-foreground text-lg">{profile.following_count}</div>
            <div className="text-muted-foreground text-sm">Following</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          <div className="flex-1 space-y-4 max-w-xl">
            {postsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-10">
                <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              posts.map(post => <PostCard key={post.id} post={post} onRefetch={refetch} />)
            )}
          </div>

          {/* Sidebar with rank */}
          <div className="hidden lg:block w-80">
            <RankProgressCard userId={profile.user_id} />
          </div>
        </div>
      </div>
    </div>
  );
}

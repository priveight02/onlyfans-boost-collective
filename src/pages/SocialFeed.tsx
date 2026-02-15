import { useFeed } from '@/hooks/useSocial';
import { useAuth } from '@/hooks/useAuth';
import PostCard from '@/components/social/PostCard';
import CreatePostDialog from '@/components/social/CreatePostDialog';
import RankProgressCard from '@/components/social/RankProgressCard';
import { Loader2, Compass, PenSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function SocialFeed() {
  const { user } = useAuth();
  const { posts, loading, refetch } = useFeed('home');

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Main feed */}
        <div className="flex-1 max-w-xl mx-auto space-y-4">
          {/* Create post bar */}
          {user && (
            <CreatePostDialog
              onCreated={refetch}
              trigger={
                <button className="w-full bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-card/80 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <PenSquare className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-sm">What's on your mind?</span>
                </button>
              }
            />
          )}

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Compass className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold text-foreground">Your feed is empty</h3>
              <p className="text-muted-foreground">Follow people to see their posts here, or explore trending content.</p>
              <Link to="/social/explore"><Button variant="outline" className="border-border/50">Explore</Button></Link>
            </div>
          ) : (
            posts.map(post => <PostCard key={post.id} post={post} onRefetch={refetch} />)
          )}
        </div>

        {/* Sidebar */}
        {user && (
          <div className="hidden lg:block w-80 space-y-4">
            <RankProgressCard userId={user.id} />
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-4">
              <h4 className="font-semibold text-foreground text-sm mb-3">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/social/explore" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Compass className="h-4 w-4" /> Explore
                </Link>
                <Link to="/social/notifications" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  🔔 Notifications
                </Link>
                <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  👤 My Profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

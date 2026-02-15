import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserPost, toggleLike, toggleSave, deletePost } from '@/hooks/useSocial';
import { useAuth } from '@/hooks/useAuth';
import { UserRankBadge } from './UserRankBadge';
import CommentSection from './CommentSection';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: UserPost;
  onRefetch: () => void;
}

export default function PostCard({ post, onRefetch }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.is_liked || false);
  const [saved, setSaved] = useState(post.is_saved || false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    await toggleLike(user.id, post.id, liked, post.user_id);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaved(!saved);
    await toggleSave(user.id, post.id, saved);
  };

  const handleDelete = async () => {
    const ok = await deletePost(post.id);
    if (ok) onRefetch();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/social/post/${post.id}`);
  };

  const profile = post.profiles;
  const initial = profile?.display_name?.[0]?.toUpperCase() || '?';

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/social/u/${profile?.username}`} className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/30">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initial}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{profile?.display_name || 'User'}</span>
              <UserRankBadge userId={post.user_id} size="sm" />
            </div>
            <span className="text-muted-foreground text-xs">@{profile?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </Link>
        {user?.id === post.user_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Media */}
      {post.media_url && (
        <div className="w-full aspect-square bg-muted/30">
          {post.media_type === 'video' ? (
            <video src={post.media_url} controls className="w-full h-full object-cover" />
          ) : (
            <img src={post.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleLike} className={`h-9 w-9 ${liked ? 'text-red-500' : 'text-foreground'}`}>
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowComments(!showComments)} className="h-9 w-9 text-foreground">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} className="h-9 w-9 text-foreground">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSave} className={`h-9 w-9 ${saved ? 'text-primary' : 'text-foreground'}`}>
            <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Counts */}
        <div className="text-sm font-semibold text-foreground">{likeCount} likes</div>

        {/* Caption */}
        {post.caption && (
          <div className="text-sm text-foreground">
            <Link to={`/social/u/${profile?.username}`} className="font-semibold mr-1">{profile?.username}</Link>
            {post.caption}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map(tag => (
              <Link key={tag} to={`/social/explore?tag=${tag}`} className="text-primary text-xs hover:underline">#{tag}</Link>
            ))}
          </div>
        )}

        {/* Comments toggle */}
        {post.comment_count > 0 && !showComments && (
          <button onClick={() => setShowComments(true)} className="text-muted-foreground text-sm hover:text-foreground">
            View all {post.comment_count} comments
          </button>
        )}

        {showComments && <CommentSection postId={post.id} postOwnerId={post.user_id} />}
      </div>
    </div>
  );
}

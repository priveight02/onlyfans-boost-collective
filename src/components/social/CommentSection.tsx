import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchComments, addComment, PostComment } from '@/hooks/useSocial';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  postId: string;
  postOwnerId: string;
}

export default function CommentSection({ postId, postOwnerId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments(postId).then(data => { setComments(data); setLoading(false); });
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    const result = await addComment(user.id, postId, newComment.trim(), postOwnerId);
    if (result) {
      setComments(prev => [...prev, { ...result, profiles: { user_id: user.id, username: null, display_name: null, avatar_url: null } as any }]);
      setNewComment('');
    }
  };

  if (loading) return <div className="text-muted-foreground text-xs py-2">Loading comments...</div>;

  return (
    <div className="space-y-3 pt-2 border-t border-border/30">
      {comments.map(comment => (
        <div key={comment.id} className="flex gap-2">
          <Link to={`/social/u/${comment.profiles?.username}`}>
            <Avatar className="h-7 w-7">
              <AvatarImage src={comment.profiles?.avatar_url || ''} />
              <AvatarFallback className="bg-muted text-xs">{comment.profiles?.display_name?.[0] || '?'}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="text-sm">
              <Link to={`/social/u/${comment.profiles?.username}`} className="font-semibold text-foreground mr-1">
                {comment.profiles?.username || 'user'}
              </Link>
              <span className="text-foreground">{comment.content}</span>
            </div>
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      ))}

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="bg-muted/30 border-border/30 text-sm h-9"
          />
          <Button type="submit" size="icon" variant="ghost" disabled={!newComment.trim()} className="h-9 w-9 text-primary">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

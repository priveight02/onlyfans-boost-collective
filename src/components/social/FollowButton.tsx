import { useFollow } from '@/hooks/useSocial';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  targetUserId: string;
  className?: string;
}

export default function FollowButton({ targetUserId, className }: Props) {
  const { user } = useAuth();
  const { isFollowing, loading, toggleFollow } = useFollow(targetUserId);

  if (!user || user.id === targetUserId) return null;
  if (loading) return <Button variant="outline" size="sm" disabled className={className}><Loader2 className="h-4 w-4 animate-spin" /></Button>;

  return (
    <Button
      onClick={toggleFollow}
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      className={`${isFollowing ? 'border-border/50 text-foreground hover:text-destructive hover:border-destructive' : 'bg-primary text-primary-foreground'} ${className}`}
    >
      {isFollowing ? <><UserMinus className="h-4 w-4 mr-1" /> Unfollow</> : <><UserPlus className="h-4 w-4 mr-1" /> Follow</>}
    </Button>
  );
}

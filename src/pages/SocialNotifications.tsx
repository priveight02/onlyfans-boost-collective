import { useNotifications } from '@/hooks/useSocial';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, Heart, MessageCircle, UserPlus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
};

const TEXT_MAP: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
};

export default function SocialNotifications() {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="border-border/50 text-foreground">
              <Check className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notif => {
            const Icon = ICON_MAP[notif.type] || Bell;
            const text = TEXT_MAP[notif.type] || 'interacted with you';
            const actor = notif.actor_profile;

            return (
              <div
                key={notif.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                  notif.is_read ? 'bg-card/40 border-border/30' : 'bg-primary/5 border-primary/20'
                }`}
              >
                <Link to={`/social/u/${actor?.username}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={actor?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">{actor?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <Link to={`/social/u/${actor?.username}`} className="font-semibold hover:underline">{actor?.display_name || 'Someone'}</Link>
                    {' '}{text}
                  </p>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                </div>
                <Icon className={`h-5 w-5 ${notif.type === 'like' ? 'text-red-500' : notif.type === 'follow' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

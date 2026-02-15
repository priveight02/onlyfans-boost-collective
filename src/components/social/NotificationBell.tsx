import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useSocial';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <Link to="/social/notifications" className="relative">
      <button className="w-9 h-9 rounded-full bg-muted/50 border border-border/30 flex items-center justify-center text-foreground hover:bg-muted transition-colors">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
}

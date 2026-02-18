import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

const getIcon = (type: string) => {
  if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  if (type === "urgent") return <AlertCircle className="h-4 w-4 text-red-400" />;
  if (type === "success") return <CheckCircle className="h-4 w-4 text-emerald-400" />;
  return <Info className="h-4 w-4 text-sky-400" />;
};

const getAccentColor = (type: string) => {
  if (type === "warning") return "border-amber-500/20 shadow-amber-500/5";
  if (type === "urgent") return "border-red-500/20 shadow-red-500/5";
  if (type === "success") return "border-emerald-500/20 shadow-emerald-500/5";
  return "border-sky-500/20 shadow-sky-500/5";
};

const getIconBg = (type: string) => {
  if (type === "warning") return "bg-amber-500/10";
  if (type === "urgent") return "bg-red-500/10";
  if (type === "success") return "bg-emerald-500/10";
  return "bg-sky-500/10";
};

const AdminNotificationPopup = () => {
  const { user } = useAuth();
  const [notification, setNotification] = useState<AdminNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch unread notifications on mount
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("admin_user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setNotification(data[0] as AdminNotification);
      }
    };
    fetchUnread();

    // Subscribe to realtime
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_user_notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotification(payload.new as AdminNotification);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const dismiss = async () => {
    if (notification) {
      await supabase
        .from("admin_user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notification.id);
    }
    setNotification(null);
  };

  if (!notification) return null;

  return (
    <Dialog open={!!notification} onOpenChange={() => dismiss()}>
      <DialogContent className={`bg-[hsl(222,30%,8%)]/95 backdrop-blur-xl ${getAccentColor(notification.notification_type)} text-white max-w-sm rounded-2xl shadow-2xl shadow-black/40 border p-0 overflow-hidden gap-0 [&>button]:hidden`}>
        {/* Accent stripe */}
        <div className={`h-0.5 w-full ${notification.notification_type === "warning" ? "bg-gradient-to-r from-amber-500/60 to-amber-500/0" : notification.notification_type === "urgent" ? "bg-gradient-to-r from-red-500/60 to-red-500/0" : notification.notification_type === "success" ? "bg-gradient-to-r from-emerald-500/60 to-emerald-500/0" : "bg-gradient-to-r from-sky-500/60 to-sky-500/0"}`} />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${getIconBg(notification.notification_type)} flex-shrink-0`}>
              {getIcon(notification.notification_type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white leading-tight">{notification.title}</h4>
              <p className="text-xs text-white/50 leading-relaxed mt-1.5">{notification.message}</p>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={dismiss} size="sm" className="h-7 px-4 text-[11px] bg-white/8 hover:bg-white/12 text-white/70 hover:text-white border border-white/8 rounded-lg transition-all">
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationPopup;

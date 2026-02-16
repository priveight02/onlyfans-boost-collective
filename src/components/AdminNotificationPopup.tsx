import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

const getIcon = (type: string) => {
  if (type === "warning") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  if (type === "urgent") return <AlertCircle className="h-5 w-5 text-red-400" />;
  if (type === "success") return <CheckCircle className="h-5 w-5 text-emerald-400" />;
  return <Info className="h-5 w-5 text-sky-400" />;
};

const getBg = (type: string) => {
  if (type === "warning") return "border-amber-500/30";
  if (type === "urgent") return "border-red-500/30";
  if (type === "success") return "border-emerald-500/30";
  return "border-sky-500/30";
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
      <DialogContent className={`bg-[hsl(220,30%,10%)] ${getBg(notification.notification_type)} text-white max-w-md`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon(notification.notification_type)}
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-white/70 leading-relaxed">{notification.message}</p>
        <div className="flex justify-end">
          <Button onClick={dismiss} className="bg-accent text-white hover:bg-accent/80">Dismiss</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationPopup;

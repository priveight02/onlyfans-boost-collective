import { useEffect, useState, useCallback, useRef } from "react";
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

const getIconBg = (type: string) => {
  if (type === "warning") return "bg-amber-500/10";
  if (type === "urgent") return "bg-red-500/10";
  if (type === "success") return "bg-emerald-500/10";
  return "bg-sky-500/10";
};

const AdminNotificationPopup = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<AdminNotification[]>([]);
  const current = queue[0] || null;
  const seenIds = useRef(new Set<string>());

  const enqueue = useCallback((n: AdminNotification) => {
    if (seenIds.current.has(n.id)) return;
    seenIds.current.add(n.id);
    setQueue(prev => [...prev, n]);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch unread on mount
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("admin_user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) {
        data.reverse().forEach(n => enqueue(n as AdminNotification));
      }
    };
    fetchUnread();

    // Realtime — fires instantly when a new row is inserted
    const channel = supabase
      .channel("admin-notifications-live")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_user_notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        enqueue(payload.new as AdminNotification);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, enqueue]);

  const dismiss = async () => {
    if (current) {
      await supabase
        .from("admin_user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", current.id);
    }
    setQueue(prev => prev.slice(1));
  };

  if (!current) return null;

  return (
    <Dialog open={!!current} onOpenChange={() => dismiss()}>
      <DialogContent className="bg-[hsl(222,35%,8%)]/95 backdrop-blur-xl border-white/[0.06] text-white max-w-sm rounded-2xl shadow-2xl shadow-black/50 p-0 overflow-hidden gap-0 [&>button]:hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -12px rgba(0,0,0,0.7), 0 0 120px -40px rgba(147,51,234,0.15)" }}>
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${getIconBg(current.notification_type)} flex-shrink-0`}>
              {getIcon(current.notification_type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white leading-tight">{current.title}</h4>
              <p className="text-xs text-white/50 leading-relaxed mt-1.5">{current.message}</p>
            </div>
          </div>
          <div className="flex justify-end pt-1 items-center gap-2">
            {queue.length > 1 && (
              <span className="text-[10px] text-white/30">{queue.length - 1} more</span>
            )}
            <Button onClick={dismiss} size="sm" className="h-7 px-4 text-[11px] bg-white/[0.06] hover:bg-white/[0.1] text-white/50 hover:text-white/80 border border-white/[0.08] rounded-lg transition-all duration-200">
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationPopup;

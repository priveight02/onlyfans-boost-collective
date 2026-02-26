import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Plus, RefreshCw, User, Wifi, WifiOff, Clock } from "lucide-react";

interface ConnectedAccount {
  id: string;
  account_id: string;
  platform_user_id: string;
  platform_username: string;
  is_connected: boolean;
  connected_at: string;
  avatar_url?: string;
  display_name?: string;
  metadata?: any;
}

interface Props {
  platform: string;
  connections: any[]; // kept for backward compat but not used for counting
  onAddAccount: () => void;
  onDisconnect: (id: string) => void;
  onReconnect: (account: ConnectedAccount) => void;
  maxAccounts?: number;
  platformColor?: string;
}

const ConnectCardAccountManager = ({
  platform,
  connections,
  onAddAccount,
  onDisconnect,
  onReconnect,
  maxAccounts = 5,
}: Props) => {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [allAccounts, setAllAccounts] = useState<ConnectedAccount[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load ALL connections for this platform & user (across all managed accounts)
  const loadAllPlatformConnections = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("social_connections")
      .select("id, account_id, platform_user_id, platform_username, is_connected, connected_at, metadata")
      .eq("platform", platform)
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false })
      .limit(20);

    const mapped: ConnectedAccount[] = (data || []).map((c: any) => ({
      id: c.id,
      account_id: c.account_id,
      platform_user_id: c.platform_user_id,
      platform_username: c.platform_username,
      is_connected: c.is_connected,
      connected_at: c.connected_at,
      avatar_url: c.metadata?.profile_picture_url || c.metadata?.avatar_url || c.metadata?.threads_profile_picture_url || c.metadata?.picture_url,
      display_name: c.metadata?.name || c.metadata?.display_name || c.platform_username,
      metadata: c.metadata,
    }));
    setAllAccounts(mapped);
    setActiveCount(mapped.filter(a => a.is_connected).length);
  };

  // Initial load + reload when parent connections change
  useEffect(() => {
    loadAllPlatformConnections();
  }, [user?.id, platform, connections]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`ccam-${platform}-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "social_connections",
        filter: `user_id=eq.${user.id}`,
      }, () => loadAllPlatformConnections())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, platform]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    if (showSettings) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  const canAddMore = activeCount < maxAccounts;

  return (
    <>
      {/* + icon top-left: add more accounts (show when at least 1 connected) */}
      {activeCount >= 1 && canAddMore && (
        <button
          className="absolute top-1.5 left-1.5 h-4 w-4 rounded-full bg-white/[0.08] border border-white/[0.15] flex items-center justify-center hover:bg-white/[0.15] hover:border-white/[0.25] transition-all z-10 group/add"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAddAccount(); }}
          title={`Add another ${platform} account (${activeCount}/${maxAccounts})`}
        >
          <Plus className="h-2.5 w-2.5 text-muted-foreground group-hover/add:text-foreground transition-colors" />
        </button>
      )}

      {/* Settings wheel bottom-right: account management (when 2+ connected) */}
      {allAccounts.length >= 1 && (
        <div className="absolute bottom-1.5 right-1.5 z-10" ref={settingsRef}>
          <button
            className="h-4 w-4 rounded-full bg-white/[0.08] border border-white/[0.15] flex items-center justify-center hover:bg-white/[0.15] hover:border-white/[0.25] transition-all group/settings"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowSettings(!showSettings); }}
            title={`Manage ${platform} accounts`}
          >
            <Settings className="h-2.5 w-2.5 text-muted-foreground group-hover/settings:text-foreground transition-colors" />
          </button>

          {/* Settings dropdown */}
          {showSettings && (
            <div className="absolute bottom-6 right-0 w-72 bg-popover/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-200 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2.5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {platform} Accounts
                  </span>
                  <Badge variant="outline" className="text-[8px] border-white/[0.1] text-muted-foreground">
                    {activeCount}/{maxAccounts}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="max-h-[300px]">
                <div className="p-1.5 space-y-0.5">
                  {allAccounts.map(a => (
                    <div key={a.id} className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${a.is_connected ? "bg-white/[0.04]" : "bg-white/[0.02] opacity-60"}`}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {a.avatar_url ? (
                          <img src={a.avatar_url} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/[0.08]" alt="" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        {/* Status dot */}
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background ${a.is_connected ? "bg-green-400" : "bg-zinc-500"}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">@{a.platform_username}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[7px] px-1 py-0 ${a.is_connected ? "border-green-500/30 text-green-400" : "border-zinc-500/30 text-zinc-400"}`}>
                            {a.is_connected ? (
                              <><Wifi className="h-2 w-2 mr-0.5" />ONLINE</>
                            ) : (
                              <><WifiOff className="h-2 w-2 mr-0.5" />OFFLINE</>
                            )}
                          </Badge>
                          <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2 w-2" />
                            {new Date(a.connected_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {a.is_connected ? (
                          <button
                            className="h-6 w-6 rounded-md bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            onClick={() => onDisconnect(a.id)}
                            title="Disconnect"
                          >
                            <WifiOff className="h-3 w-3 text-red-400" />
                          </button>
                        ) : (
                          <button
                            className="h-6 px-2 rounded-md bg-green-500/10 hover:bg-green-500/20 flex items-center justify-center gap-1 transition-colors"
                            onClick={() => { onReconnect(a); setShowSettings(false); }}
                            title="Reconnect"
                          >
                            <RefreshCw className="h-2.5 w-2.5 text-green-400" />
                            <span className="text-[8px] text-green-400 font-medium">Reconnect</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer */}
              {canAddMore && (
                <div className="px-3 py-2 border-t border-white/[0.06]">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => { onAddAccount(); setShowSettings(false); }}
                  >
                    <Plus className="h-3 w-3" /> Add {platform} Account ({activeCount}/{maxAccounts})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Account count badge (when 2+) */}
      {allAccounts.length >= 2 && (
        <div className="absolute top-1.5 right-5 z-[5]">
          <Badge variant="outline" className="text-[7px] px-1 py-0 border-white/[0.12] text-muted-foreground bg-white/[0.04]">
            {activeCount}
          </Badge>
        </div>
      )}
    </>
  );
};

export default ConnectCardAccountManager;

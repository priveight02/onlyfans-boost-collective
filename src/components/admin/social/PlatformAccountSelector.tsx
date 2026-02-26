import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlatformAccount {
  connection_id: string;
  account_id: string;
  platform_user_id: string;
  platform_username: string;
  avatar_url?: string;
  display_name?: string;
  is_connected: boolean;
}

interface Props {
  platform: string;
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  maxAccounts?: number;
  platformIcon?: React.ReactNode;
  platformColor?: string;
}

const PlatformAccountSelector = ({
  platform,
  selectedAccountId,
  onAccountChange,
  maxAccounts = 5,
  platformIcon,
  platformColor = "text-primary",
}: Props) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const loadAccounts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("social_connections")
        .select("id, account_id, platform_user_id, platform_username, metadata, is_connected")
        .eq("platform", platform)
        .eq("is_connected", true)
        .eq("user_id", user.id)
        .order("connected_at", { ascending: true })
        .limit(maxAccounts);

      const mapped: PlatformAccount[] = (data || []).map((c: any) => ({
        connection_id: c.id,
        account_id: c.account_id,
        platform_user_id: c.platform_user_id,
        platform_username: c.platform_username,
        avatar_url: c.metadata?.profile_picture_url || c.metadata?.avatar_url || c.metadata?.threads_profile_picture_url,
        display_name: c.metadata?.name || c.metadata?.display_name || c.platform_username,
        is_connected: c.is_connected,
      }));
      setAccounts(mapped);
      setLoading(false);

      // Auto-select first if current selection not in list
      if (mapped.length > 0 && !mapped.find(a => a.account_id === selectedAccountId)) {
        onAccountChange(mapped[0].account_id);
      }
    };

    loadAccounts();

    // Realtime updates
    const channel = supabase
      .channel(`platform-accounts-${platform}-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "social_connections",
        filter: `user_id=eq.${user.id}`,
      }, () => loadAccounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, platform]);

  if (loading || accounts.length <= 1) return null;

  const selected = accounts.find(a => a.account_id === selectedAccountId);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {platformIcon}
        <Badge variant="outline" className="text-[9px] border-white/[0.08] bg-white/[0.02]">
          {accounts.length}/{maxAccounts} accounts
        </Badge>
      </div>
      <Select value={selectedAccountId} onValueChange={onAccountChange}>
        <SelectTrigger className="h-8 w-auto min-w-[180px] max-w-[280px] bg-white/[0.03] border-white/[0.08] text-xs gap-2">
          <SelectValue>
            {selected ? (
              <div className="flex items-center gap-2">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} className="h-5 w-5 rounded-full object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className={`h-5 w-5 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 ${platformColor}`}>
                    <Users className="h-3 w-3" />
                  </div>
                )}
                <span className="truncate text-foreground font-medium">@{selected.platform_username}</span>
              </div>
            ) : (
              "Select account"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-white/[0.08]">
          {accounts.map(a => (
            <SelectItem key={a.account_id} value={a.account_id} className="text-xs">
              <div className="flex items-center gap-2">
                {a.avatar_url ? (
                  <img src={a.avatar_url} className="h-5 w-5 rounded-full object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className={`h-5 w-5 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 ${platformColor}`}>
                    <Users className="h-3 w-3" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">@{a.platform_username}</span>
                  {a.display_name && a.display_name !== a.platform_username && (
                    <span className="text-[10px] text-muted-foreground">{a.display_name}</span>
                  )}
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 ml-auto flex-shrink-0" />
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PlatformAccountSelector;

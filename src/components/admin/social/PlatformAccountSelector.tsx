import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Users, CheckCheck, User } from "lucide-react";

// Platform icon SVGs
const PLATFORM_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  instagram: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs><linearGradient id="ig-sel" x1="0" y1="24" x2="24" y2="0"><stop offset="0%" stopColor="#feda75"/><stop offset="25%" stopColor="#fa7e1e"/><stop offset="50%" stopColor="#d62976"/><stop offset="75%" stopColor="#962fbf"/><stop offset="100%" stopColor="#4f5bd5"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-sel)" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="url(#ig-sel)" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-sel)"/>
    </svg>
  ),
  tiktok: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/>
    </svg>
  ),
  threads: ({ className }) => (
    <svg viewBox="0 0 192 192" className={className} fill="currentColor">
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.398c-15.09 0-27.535 6.395-35.182 18.07l13.633 9.358c5.687-8.635 14.52-10.482 21.549-10.482h.266c8.336.048 14.627 2.479 18.697 7.222 2.963 3.449 4.95 8.242 5.95 14.328a93.537 93.537 0 0 0-24.939-2.674c-25.247 0-41.47 13.596-41.47 34.766 0 14.572 8.283 28.07 22.178 36.118 11.79 6.838 26.985 10.045 42.596 9.042 12.758-.82 24.076-4.138 33.617-9.865 7.816-4.69 14.286-11.017 19.231-18.82 6.608-10.43 10.098-23.373 10.098-37.356 0-.633-.016-1.269-.042-1.898 8.247 4.975 13.614 12.318 13.614 21.164 0 26.087-30.292 47.293-67.557 47.293-41.393 0-67.557-24.454-67.557-63.116 0-36.908 27.07-64.95 62.914-65.125h.266c18.705.088 34.473 5.94 45.638 16.925 5.374 5.284 9.552 11.68 12.442 19.036l14.276-5.713c-3.553-9.032-8.786-17.058-15.579-23.743-13.711-13.49-33.002-20.607-55.777-20.71h-.306c-42.34.206-76.85 33.162-76.912 78.87 0 46.217 31.174 77.116 77.557 77.116 43.34 0 81.557-25.676 81.557-61.293 0-18.926-11.368-35.189-29.463-44.862z"/>
    </svg>
  ),
  facebook: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "from-pink-500/20 to-purple-500/20 border-pink-500/30",
  tiktok: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  threads: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
  facebook: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
};

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
  /** Multi-select: callback receives array of selected account IDs */
  onMultiAccountChange?: (accountIds: string[]) => void;
  maxAccounts?: number;
  platformIcon?: React.ReactNode;
  platformColor?: string;
}

const PlatformAccountSelector = ({
  platform,
  selectedAccountId,
  onAccountChange,
  onMultiAccountChange,
  maxAccounts = 5,
  platformIcon,
  platformColor = "text-primary",
}: Props) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([selectedAccountId]));
  const dropdownRef = useRef<HTMLDivElement>(null);

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

      if (mapped.length > 0 && !mapped.find(a => a.account_id === selectedAccountId)) {
        onAccountChange(mapped[0].account_id);
        setSelectedIds(new Set([mapped[0].account_id]));
      }
    };

    loadAccounts();

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Sync selectedIds when single-mode selection changes externally
  useEffect(() => {
    if (!multiMode) setSelectedIds(new Set([selectedAccountId]));
  }, [selectedAccountId, multiMode]);

  if (loading || accounts.length <= 1) return null;

  const selected = accounts.find(a => a.account_id === selectedAccountId);
  const PlatformSvg = PLATFORM_ICONS[platform];
  const colorClass = PLATFORM_COLORS[platform] || "from-primary/20 to-primary/10 border-primary/30";

  const handleToggleAccount = (accountId: string) => {
    if (multiMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(accountId)) { next.delete(accountId); if (next.size === 0) next.add(accountId); }
        else next.add(accountId);
        const arr = Array.from(next);
        onMultiAccountChange?.(arr);
        onAccountChange(arr[0]);
        return next;
      });
    } else {
      onAccountChange(accountId);
      setSelectedIds(new Set([accountId]));
      setOpen(false);
    }
  };

  const toggleMultiMode = () => {
    const newMode = !multiMode;
    setMultiMode(newMode);
    if (!newMode) {
      // Switching back to single mode: keep only current primary
      setSelectedIds(new Set([selectedAccountId]));
      onMultiAccountChange?.([selectedAccountId]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r ${colorClass} border backdrop-blur-sm hover:brightness-110 transition-all cursor-pointer group`}
      >
        {/* Platform icon */}
        <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
          {PlatformSvg ? <PlatformSvg className="h-5 w-5" /> : platformIcon}
        </div>

        {/* Selected account info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {selected?.avatar_url ? (
            <img src={selected.avatar_url} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/[0.1] flex-shrink-0" alt="" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">
                {multiMode && selectedIds.size > 1 ? `${selectedIds.size} accounts selected` : `@${selected?.platform_username || "Select"}`}
              </span>
              {multiMode && <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400 px-1 py-0">MULTI</Badge>}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {selected?.display_name && selected.display_name !== selected.platform_username ? selected.display_name : `${accounts.length}/${maxAccounts} connected`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] border-white/[0.08] bg-white/[0.02] text-muted-foreground">
            {accounts.length}/{maxAccounts}
          </Badge>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {platform} Accounts
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMultiMode}
              className={`h-6 text-[10px] gap-1 px-2 ${multiMode ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-foreground"}`}
            >
              {multiMode ? <CheckCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {multiMode ? "Multi-Select" : "Single"}
            </Button>
          </div>

          <ScrollArea className="max-h-[280px]">
            <div className="p-1.5 space-y-0.5">
              {accounts.map(a => {
                const isSelected = multiMode ? selectedIds.has(a.account_id) : a.account_id === selectedAccountId;
                return (
                  <button
                    key={a.account_id}
                    onClick={() => handleToggleAccount(a.account_id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      isSelected
                        ? "bg-white/[0.06] border border-white/[0.1]"
                        : "hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    {/* Checkbox in multi mode */}
                    {multiMode && (
                      <Checkbox
                        checked={isSelected}
                        className="border-white/[0.2] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => handleToggleAccount(a.account_id)}
                      />
                    )}

                    {/* Avatar with platform badge */}
                    <div className="relative flex-shrink-0">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/[0.06]" alt="" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {/* Platform mini icon badge */}
                      {PlatformSvg && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border border-white/[0.1] flex items-center justify-center">
                          <PlatformSvg className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Account info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-foreground truncate">@{a.platform_username}</p>
                      {a.display_name && a.display_name !== a.platform_username && (
                        <p className="text-[10px] text-muted-foreground truncate">{a.display_name}</p>
                      )}
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      {isSelected && !multiMode && (
                        <Badge variant="outline" className="text-[8px] border-primary/30 text-primary px-1 py-0">Active</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Multi-select action bar */}
          {multiMode && selectedIds.size > 1 && (
            <div className="px-3 py-2 border-t border-white/[0.06] bg-amber-500/[0.04]">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">
                  Actions will apply to {selectedIds.size} accounts simultaneously
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlatformAccountSelector;

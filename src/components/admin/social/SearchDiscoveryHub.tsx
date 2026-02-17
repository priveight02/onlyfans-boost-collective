import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cachedFetch, invalidateNamespace } from "@/lib/supabaseCache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Search, Loader2, Users, Bot, Sparkles, CheckCheck,
  RefreshCw, UserPlus, XCircle, Zap, MessageCircle,
  Clock, Shuffle, Heart, Star, ArrowUpDown,
  Download, Copy, Eye, Globe, Send,
  Trash2, BarChart3, Filter, Hash, Target,
  Compass, Instagram, Music2, AtSign,
  Square, ListFilter, Tag, Shield,
} from "lucide-react";

interface SearchDiscoveryHubProps {
  accountId: string;
}

interface DiscoveredUser {
  id: string;
  name: string;
  username: string;
  profile_pic: string | null;
  source: string;
  gender?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_verified?: boolean;
  is_private?: boolean;
  bio?: string;
  platform?: string;
}

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const VerifiedBadge = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className="inline-block flex-shrink-0">
    <defs><linearGradient id="sd-verified" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4FC3F7" /><stop offset="100%" stopColor="#2196F3" /></linearGradient></defs>
    <circle cx="20" cy="20" r="20" fill="url(#sd-verified)" />
    <polygon points="20,2 23.5,8 30,5 28,12 35,14 30,18.5 35,23 28.5,24 31,31 24,29 22,36 20,30 18,36 16,29 9,31 11.5,24 5,23 10,18.5 5,14 12,12 10,5 16.5,8" fill="url(#sd-verified)" />
    <path d="M15 20.5L18.5 24L26 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const UserAvatar = ({ src, name, username, size = 8 }: { src: string | null; name: string; username: string; size?: number }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name || username || "?")[0]?.toUpperCase();
  const sizeClass = size === 10 ? "h-10 w-10" : size === 9 ? "h-9 w-9" : "h-8 w-8";
  const textSize = size >= 10 ? "text-sm" : "text-xs";
  if (!src || failed) {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0`}>
        <span className={`text-white ${textSize} font-bold`}>{initial}</span>
      </div>
    );
  }
  return <img src={src} alt="" className={`${sizeClass} rounded-full object-cover flex-shrink-0`} onError={() => setFailed(true)} referrerPolicy="no-referrer" crossOrigin="anonymous" />;
};

const SearchDiscoveryHub = ({ accountId }: SearchDiscoveryHubProps) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"username" | "hashtag" | "keyword" | "similar" | "competitors">("username");
  const [searchPlatform, setSearchPlatform] = useState<"instagram" | "tiktok" | "all">("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [expandedSearch, setExpandedSearch] = useState(false);
  const [expanderTarget, setExpanderTarget] = useState(500);
  const searchTimeout = useRef<any>(null);

  // List state
  const [userList, setUserList] = useState<DiscoveredUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listFilter, setListFilter] = useState("");
  const [sortMode, setSortMode] = useState<"name" | "followers" | "recent">("name");

  // Actions state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; failed: number } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [personalizeMode, setPersonalizeMode] = useState(false);
  const [autoChat, setAutoChat] = useState(true);
  const [delayBetweenMs, setDelayBetweenMs] = useState(1500);
  const cancelRef = useRef(false);
  const messageRef = useRef(message);

  useEffect(() => { messageRef.current = message; }, [message]);

  // Load persisted list from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`search_list_${accountId}`);
      if (saved) setUserList(JSON.parse(saved));
    } catch {}
  }, [accountId]);

  // Save list to localStorage
  useEffect(() => {
    if (userList.length > 0) {
      try { localStorage.setItem(`search_list_${accountId}`, JSON.stringify(userList)); } catch {}
    }
  }, [userList, accountId]);

  const userIdSet = useMemo(() => new Set(userList.map(u => u.id)), [userList]);

  // ===== SEARCH =====
  const performSearch = useCallback(async (query?: string) => {
    const q = query ?? searchQuery;
    if (!q || q.length < 1) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      if (searchMode === "username") {
        // Use session-based search if available, fallback to discover_user
        const { data: connData } = await supabase
          .from("social_connections")
          .select("metadata")
          .eq("account_id", accountId)
          .eq("platform", "instagram")
          .single();
        const savedSession = (connData?.metadata as any)?.ig_session_id;

        if (savedSession && (searchPlatform === "instagram" || searchPlatform === "all")) {
          const { data, error } = await supabase.functions.invoke("instagram-api", {
            body: {
              action: "search_users",
              account_id: accountId,
              params: { query: q, session_id: savedSession, max_results: expandedSearch ? expanderTarget : 200, expanded: expandedSearch },
            },
          });
          if (!error && data?.data?.users) {
            setSearchResults(data.data.users.map((u: any) => ({ ...u, platform: "instagram" })));
          }
        } else if (searchPlatform === "instagram" || searchPlatform === "all") {
          // Fallback to Graph API discover
          const { data } = await supabase.functions.invoke("instagram-api", {
            body: { action: "discover_user", account_id: accountId, params: { username: q, media_limit: 3 } },
          });
          if (data?.success && data.data?.business_discovery) {
            const bd = data.data.business_discovery;
            setSearchResults([{
              id: bd.id, username: bd.username, full_name: bd.name,
              profile_pic_url: bd.profile_picture_url, follower_count: bd.followers_count,
              following_count: bd.follows_count, media_count: bd.media_count,
              is_verified: false, is_private: false, platform: "instagram",
            }]);
          } else {
            setSearchResults([]);
          }
        }

        // Also search TikTok if connected
        if (searchPlatform === "tiktok" || searchPlatform === "all") {
          try {
            const { data } = await supabase.functions.invoke("tiktok-api", {
              body: { action: "research_user", account_id: accountId, params: { username: q } },
            });
            if (data?.success && data.data) {
              const tt = data.data;
              setSearchResults(prev => [...prev, {
                id: tt.id || tt.user_id || q,
                username: tt.username || q,
                full_name: tt.display_name || tt.nickname || q,
                profile_pic_url: tt.avatar_url || tt.avatar_thumb,
                follower_count: tt.follower_count,
                following_count: tt.following_count,
                media_count: tt.video_count,
                is_verified: tt.is_verified || false,
                is_private: false,
                platform: "tiktok",
              }]);
            }
          } catch {}
        }
      } else if (searchMode === "hashtag") {
        // Search users by hashtag - find top media creators
        const { data } = await supabase.functions.invoke("instagram-api", {
          body: { action: "search_hashtag", account_id: accountId, params: { hashtag: q } },
        });
        if (data?.success && data.data?.data?.[0]) {
          const hashId = data.data.data[0].id;
          const { data: topData } = await supabase.functions.invoke("instagram-api", {
            body: { action: "get_hashtag_top_media", account_id: accountId, params: { hashtag_id: hashId } },
          });
          if (topData?.success) {
            // Extract unique users from top media
            const userMap = new Map<string, any>();
            for (const m of (topData.data?.data || [])) {
              if (m.username && !userMap.has(m.username)) {
                userMap.set(m.username, {
                  id: m.user?.id || m.username,
                  username: m.username,
                  full_name: m.user?.name || m.username,
                  profile_pic_url: m.user?.profile_picture_url || null,
                  follower_count: null,
                  is_verified: false,
                  is_private: false,
                  platform: "instagram",
                  _source: `#${q}`,
                });
              }
            }
            setSearchResults(Array.from(userMap.values()));
          }
        }
      } else if (searchMode === "keyword") {
        // Use Instagram search_users with keyword
        const { data: connData } = await supabase
          .from("social_connections")
          .select("metadata")
          .eq("account_id", accountId)
          .eq("platform", "instagram")
          .single();
        const savedSession = (connData?.metadata as any)?.ig_session_id;
        if (savedSession) {
          const { data } = await supabase.functions.invoke("instagram-api", {
            body: {
              action: "search_users",
              account_id: accountId,
              params: { query: q, session_id: savedSession, max_results: expandedSearch ? expanderTarget : 200 },
            },
          });
          if (data?.data?.users) {
            setSearchResults(data.data.users.map((u: any) => ({ ...u, platform: "instagram" })));
          }
        } else {
          toast.error("Session cookie required for keyword search");
          setSearchResults([]);
        }
      } else if (searchMode === "similar" || searchMode === "competitors") {
        // First discover the user, then search by their name/bio keywords
        const { data } = await supabase.functions.invoke("instagram-api", {
          body: { action: "discover_user", account_id: accountId, params: { username: q, media_limit: 0 } },
        });
        if (data?.success) {
          const bd = data.data?.business_discovery || data.data;
          const bio = bd?.biography || "";
          const keywords = bio.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3).join(" ");
          if (keywords) {
            const { data: connData } = await supabase
              .from("social_connections")
              .select("metadata")
              .eq("account_id", accountId)
              .eq("platform", "instagram")
              .single();
            const savedSession = (connData?.metadata as any)?.ig_session_id;
            if (savedSession) {
              const { data: searchData } = await supabase.functions.invoke("instagram-api", {
                body: { action: "search_users", account_id: accountId, params: { query: keywords, session_id: savedSession, max_results: 100 } },
              });
              if (searchData?.data?.users) {
                setSearchResults(searchData.data.users.filter((u: any) => u.username !== q).map((u: any) => ({ ...u, platform: "instagram", _source: `similar to @${q}` })));
              }
            }
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [accountId, searchQuery, searchMode, searchPlatform, expandedSearch, expanderTarget]);

  const onSearchQueryChange = (val: string) => {
    setSearchQuery(val);
    if (searchMode === "username" || searchMode === "keyword") {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => performSearch(val), 500);
    }
  };

  // ===== LIST MANAGEMENT =====
  const addUserToList = async (user: any) => {
    const userId = String(user.id || user.pk);
    const newUser: DiscoveredUser = {
      id: userId,
      name: user.full_name || user.username,
      username: user.username,
      profile_pic: user.profile_pic_url || null,
      source: "discovered",
      gender: user.gender || undefined,
      follower_count: user.follower_count,
      following_count: user.following_count,
      media_count: user.media_count,
      is_verified: user.is_verified || false,
      is_private: user.is_private || false,
      bio: user.biography || user.bio || undefined,
      platform: user.platform || "instagram",
    };
    setUserList(prev => {
      if (prev.some(u => u.id === newUser.id)) {
        toast.info(`@${user.username} already in list`);
        return prev;
      }
      return [...prev, newUser];
    });
    setSelectedIds(prev => new Set([...prev, newUser.id]));
    // Persist to fetched_followers
    try {
      await supabase.from("fetched_followers").upsert({
        account_id: accountId, ig_user_id: userId, username: user.username,
        full_name: user.full_name || null, profile_pic_url: user.profile_pic_url || null,
        is_verified: user.is_verified || false, is_private: user.is_private || false,
        gender: user.gender || null, source: "discovered",
        metadata: { follower_count: user.follower_count, following_count: user.following_count, media_count: user.media_count },
      }, { onConflict: "account_id,ig_user_id" });
    } catch {}
    toast.success(`Added @${user.username}`);
  };

  const addAllToList = async () => {
    let added = 0;
    const toUpsert: any[] = [];
    setUserList(prev => {
      const seen = new Set(prev.map(u => u.id));
      const merged = [...prev];
      for (const user of searchResults) {
        const id = String(user.id || user.pk);
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push({
          id, name: user.full_name || user.username, username: user.username,
          profile_pic: user.profile_pic_url || null, source: "discovered",
          gender: user.gender, follower_count: user.follower_count,
          following_count: user.following_count, media_count: user.media_count,
          is_verified: user.is_verified || false, is_private: user.is_private || false,
          platform: user.platform || "instagram",
        });
        toUpsert.push({
          account_id: accountId, ig_user_id: id, username: user.username,
          full_name: user.full_name || null, profile_pic_url: user.profile_pic_url || null,
          is_verified: user.is_verified || false, is_private: user.is_private || false,
          source: "discovered", metadata: { follower_count: user.follower_count },
        });
        added++;
      }
      return merged;
    });
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const u of searchResults) next.add(String(u.id || u.pk));
      return next;
    });
    if (toUpsert.length > 0) {
      try {
        for (let i = 0; i < toUpsert.length; i += 500) {
          await supabase.from("fetched_followers").upsert(toUpsert.slice(i, i + 500), { onConflict: "account_id,ig_user_id" });
        }
      } catch {}
    }
    toast.success(`Added ${added} accounts to list`);
  };

  const removeUser = (id: string) => {
    setUserList(prev => prev.filter(u => u.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const clearList = () => {
    setUserList([]);
    setSelectedIds(new Set());
    localStorage.removeItem(`search_list_${accountId}`);
    toast.success("List cleared");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredList.map(u => u.id)));
  };

  const invertSelection = () => {
    const inverted = new Set<string>();
    filteredList.forEach(u => { if (!selectedIds.has(u.id)) inverted.add(u.id); });
    setSelectedIds(inverted);
  };

  const selectRandom = (count: number) => {
    const shuffled = [...filteredList].sort(() => Math.random() - 0.5);
    setSelectedIds(new Set(shuffled.slice(0, count).map(u => u.id)));
    toast.success(`Selected ${Math.min(count, filteredList.length)}`);
  };

  const exportCSV = () => {
    const csv = `username,name,followers,platform\n` + filteredList.map(u => `${u.username},${u.name},${u.follower_count || ""},${u.platform || "instagram"}`).join("\n");
    navigator.clipboard.writeText(csv);
    toast.success(`Copied ${filteredList.length} contacts as CSV`);
  };

  const filteredList = useMemo(() => {
    let result = userList;
    if (listFilter) {
      const q = listFilter.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    }
    if (sortMode === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === "followers") result = [...result].sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    return result;
  }, [userList, listFilter, sortMode]);

  // ===== ACTIONS =====
  const generateAIMessage = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_opener", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (data?.data?.message) { setMessage(data.data.message); toast.success("AI opener generated"); }
    } catch (e: any) { toast.error(e.message || "AI failed"); }
    finally { setGeneratingAI(false); }
  };

  const sendBulkMessages = async () => {
    const recipients = userList.filter(u => selectedIds.has(u.id));
    if (!messageRef.current.trim() || recipients.length === 0) {
      toast.error("Select recipients and enter a message");
      return;
    }
    setSending(true);
    cancelRef.current = false;
    setSendProgress({ sent: 0, total: recipients.length, failed: 0 });
    let sent = 0, failed = 0;
    for (const r of recipients) {
      if (cancelRef.current) break;
      try {
        let msg = messageRef.current.trim();
        if (personalizeMode) msg = msg.replace(/\{name\}/gi, r.name || "babe");
        const { data, error } = await supabase.functions.invoke("instagram-api", {
          body: { action: "send_message", account_id: accountId, params: { recipient_id: r.id, message: msg } },
        });
        if (error || !data?.success) throw new Error(data?.error || "Failed");
        sent++;
      } catch { failed++; }
      setSendProgress({ sent, total: recipients.length, failed });
      if (!cancelRef.current) await new Promise(r => setTimeout(r, delayBetweenMs));
    }
    if (autoChat) {
      for (const r of recipients.filter(r => selectedIds.has(r.id))) {
        try {
          const { data: existing } = await supabase.from("ai_dm_conversations").select("id").eq("account_id", accountId).eq("participant_id", r.id).limit(1);
          if (existing?.length) {
            await supabase.from("ai_dm_conversations").update({ ai_enabled: true, last_message_at: new Date().toISOString() }).eq("id", existing[0].id);
          } else {
            await supabase.from("ai_dm_conversations").insert({
              account_id: accountId, participant_id: r.id, participant_name: r.name,
              participant_username: r.username, participant_avatar_url: r.profile_pic,
              platform: "instagram", ai_enabled: true, status: "active", folder: "primary",
              is_read: false, last_message_at: new Date().toISOString(),
              last_message_preview: `You: ${messageRef.current.substring(0, 80)}`,
            });
          }
        } catch {}
      }
    }
    setSending(false);
    toast.success(`Done: ${sent} sent, ${failed} failed`);
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-280px)] min-h-[500px] border border-border rounded-xl overflow-hidden bg-card">
      {/* LEFT: Search Panel */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
        {/* Search Header */}
        <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold text-foreground">Discovery Engine</span>
            <Badge variant="outline" className="text-[9px] ml-auto">{searchResults.length} results</Badge>
          </div>

          {/* Search mode pills */}
          <div className="flex gap-1 flex-wrap">
            {([
              { v: "username" as const, icon: Users, l: "Username" },
              { v: "hashtag" as const, icon: Hash, l: "Hashtag" },
              { v: "keyword" as const, icon: Search, l: "Keyword" },
              { v: "similar" as const, icon: Compass, l: "Similar" },
              { v: "competitors" as const, icon: Target, l: "Competitors" },
            ]).map(t => (
              <button key={t.v} onClick={() => setSearchMode(t.v)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${searchMode === t.v ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                <t.icon className="h-3 w-3" />{t.l}
              </button>
            ))}
          </div>

          {/* Platform selector */}
          <div className="flex gap-1">
            {(["all", "instagram", "tiktok"] as const).map(p => (
              <button key={p} onClick={() => setSearchPlatform(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${searchPlatform === p ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "all" ? "All" : p === "instagram" ? "IG" : "TT"}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={searchMode === "username" ? "Search @username..." : searchMode === "hashtag" ? "Search #hashtag..." : searchMode === "similar" ? "@username to find similar..." : "Search keywords..."}
              value={searchQuery}
              onChange={e => onSearchQueryChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && performSearch()}
              className="pl-8 h-8 text-xs"
              autoFocus
            />
            {searchLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-purple-400" />}
          </div>

          {/* Expander */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Switch checked={expandedSearch} onCheckedChange={setExpandedSearch} className="h-4 w-7" />
              <span className="text-[10px] text-muted-foreground">List Expander</span>
              {expandedSearch && <Zap className="h-3 w-3 text-purple-400" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{expandedSearch ? `Target: ${expanderTarget.toLocaleString()}` : "Standard (200)"}</span>
          </div>
          {expandedSearch && (
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={100000} step={100} value={expanderTarget}
                onChange={e => setExpanderTarget(Number(e.target.value))} className="flex-1 h-1.5 accent-purple-500 cursor-pointer" />
              <Input type="number" min={1} max={100000} value={expanderTarget}
                onChange={e => setExpanderTarget(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
                className="w-20 h-6 text-[10px] text-center" />
            </div>
          )}

          {/* Action buttons */}
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" onClick={addAllToList} className="h-6 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <UserPlus className="h-3 w-3" /> Add All ({searchResults.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => performSearch()} className="h-6 text-[10px] gap-1">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Search Results */}
        <ScrollArea className="flex-1">
          {searchResults.length === 0 && searchQuery.length > 0 && !searchLoading && (
            <p className="text-[11px] text-muted-foreground text-center py-6">No results for "{searchQuery}"</p>
          )}
          {searchResults.length === 0 && searchQuery.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Globe className="h-8 w-8 text-muted-foreground mx-auto opacity-30" />
              <p className="text-[11px] text-muted-foreground">Search to discover accounts</p>
            </div>
          )}
          {searchResults.map((user: any) => {
            const isAdded = userIdSet.has(String(user.id || user.pk));
            return (
              <div key={`${user.id || user.pk}-${user.username}`}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-muted/30 transition-colors border-b border-border/50 ${isAdded ? "bg-emerald-500/5" : ""}`}>
                <UserAvatar src={user.profile_pic_url} name={user.full_name || user.username} username={user.username} size={10} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{user.full_name || user.username}</span>
                    {user.is_verified && <VerifiedBadge size={14} />}
                    {user.is_private && <span className="text-amber-400 text-[9px]">🔒</span>}
                    {user.platform === "tiktok" && <Music2 className="h-3 w-3 text-cyan-400" />}
                    {isAdded && <span className="text-[8px] text-emerald-400">✓ added</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">@{user.username}</span>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    {user.follower_count != null && <span className="text-[9px] text-muted-foreground"><span className="font-semibold text-foreground">{fmtNum(user.follower_count)}</span> followers</span>}
                    {user.following_count != null && <span className="text-[9px] text-muted-foreground"><span className="font-semibold text-foreground">{fmtNum(user.following_count)}</span> following</span>}
                    {user.media_count != null && <span className="text-[9px] text-muted-foreground"><span className="font-semibold text-foreground">{fmtNum(user.media_count)}</span> posts</span>}
                  </div>
                  {user._source && <span className="text-[9px] text-purple-400 mt-0.5 block">{user._source}</span>}
                </div>
                <button onClick={() => addUserToList(user)}
                  className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors flex-shrink-0">
                  <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                </button>
              </div>
            );
          })}
        </ScrollArea>
      </div>

      {/* CENTER: User List */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="p-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-foreground" />
            <span className="text-sm font-semibold text-foreground">My List</span>
            <Badge variant="outline" className="text-[9px]">{userList.length}</Badge>
            <Badge className="text-[9px] bg-purple-500/15 text-purple-400 border-purple-500/30">{selectedIds.size} selected</Badge>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={selectAll} className="h-6 text-[10px] gap-1">
                {selectedIds.size === filteredList.length && filteredList.length > 0 ? <><Square className="h-2.5 w-2.5" /> Deselect</> : <><CheckCheck className="h-2.5 w-2.5" /> All</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={invertSelection} className="h-6 text-[10px] gap-1">
                <ArrowUpDown className="h-2.5 w-2.5" /> Invert
              </Button>
              <Button size="sm" variant="ghost" onClick={() => selectRandom(50)} className="h-6 text-[10px] gap-1">
                <Shuffle className="h-2.5 w-2.5" /> 50
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input placeholder="Filter list..." value={listFilter} onChange={e => setListFilter(e.target.value)} className="pl-7 h-7 text-[11px]" />
            </div>
            <select value={sortMode} onChange={e => setSortMode(e.target.value as any)} className="bg-card text-card-foreground border border-border rounded px-2 py-1 text-[10px] h-7">
              <option value="name">A-Z</option>
              <option value="followers">Followers</option>
              <option value="recent">Recent</option>
            </select>
            <Button size="sm" variant="ghost" onClick={exportCSV} className="h-7 text-[10px]" title="Export CSV">
              <Copy className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={clearList} className="h-7 text-[10px] text-destructive" title="Clear all">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* User list */}
        <ScrollArea className="flex-1">
          {filteredList.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto opacity-30" />
              <p className="text-xs text-muted-foreground">Search and add accounts to your list</p>
            </div>
          )}
          {filteredList.map(user => (
            <div key={user.id}
              className={`flex items-center gap-2.5 px-3 py-2 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer ${selectedIds.has(user.id) ? "bg-purple-500/5" : ""}`}
              onClick={() => toggleSelect(user.id)}>
              <div className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(user.id) ? "bg-purple-500 border-purple-500" : "border-border"}`}>
                {selectedIds.has(user.id) && <CheckCheck className="h-2.5 w-2.5 text-white" />}
              </div>
              <UserAvatar src={user.profile_pic} name={user.name} username={user.username} size={8} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground truncate">{user.name}</span>
                  {user.is_verified && <VerifiedBadge size={12} />}
                  {user.platform === "tiktok" && <Music2 className="h-3 w-3 text-cyan-400" />}
                </div>
                <span className="text-[10px] text-muted-foreground">@{user.username}</span>
              </div>
              <div className="text-right flex-shrink-0">
                {user.follower_count != null && <p className="text-[10px] font-semibold text-foreground">{fmtNum(user.follower_count)}</p>}
                <p className="text-[9px] text-muted-foreground">{user.platform || "IG"}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); removeUser(user.id); }}
                className="p-1 rounded hover:bg-destructive/20 transition-colors flex-shrink-0">
                <XCircle className="h-3 w-3 text-destructive/60" />
              </button>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* RIGHT: Actions Panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col border-l border-border overflow-y-auto">
        {/* Message Composer */}
        <div className="p-3 border-b border-border space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bulk Message</label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder={personalizeMode ? "hey {name} noticed u..." : "Type message or use AI..."}
            className="min-h-[80px] max-h-[120px] text-xs resize-none" />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={generateAIMessage} disabled={generatingAI} className="h-7 text-[10px] gap-1 border-purple-500/30 text-purple-400">
              {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Personalize</span>
              <Switch checked={personalizeMode} onCheckedChange={setPersonalizeMode} className="scale-[0.65]" />
            </div>
          </div>
        </div>

        {/* Send Actions */}
        <div className="p-3 border-b border-border space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Send</label>
          <Button size="sm" onClick={sendBulkMessages} disabled={sending || selectedIds.size === 0 || !message.trim()}
            className="w-full h-8 text-[11px] gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send to {selectedIds.size} selected
          </Button>
          {sending && (
            <Button size="sm" variant="outline" onClick={() => { cancelRef.current = true; }} className="w-full h-7 text-[10px] text-destructive border-destructive/30">
              Cancel
            </Button>
          )}
        </div>

        {/* Send Progress */}
        {sendProgress && (
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs mb-1">
              {sending ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-green-400" />}
              <span className={sending ? "text-blue-400" : "text-green-400"}>
                {sending ? `Sending ${sendProgress.sent}/${sendProgress.total}` : `Done: ${sendProgress.sent} sent`}
              </span>
              {sendProgress.failed > 0 && <span className="text-destructive text-[10px]">({sendProgress.failed} failed)</span>}
            </div>
            <Progress value={sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0} className="h-1.5" />
          </div>
        )}

        {/* Settings */}
        <div className="p-3 border-b border-border space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Settings</label>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Bot className="h-3 w-3" /> Auto AI chat</span>
            <Switch checked={autoChat} onCheckedChange={setAutoChat} className="scale-[0.65]" />
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Delay:</span>
            <div className="flex gap-1">
              {[500, 1500, 3000, 5000].map(ms => (
                <button key={ms} onClick={() => setDelayBetweenMs(ms)}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${delayBetweenMs === ms ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:text-foreground bg-muted/30"}`}>
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Select */}
        <div className="p-3 border-b border-border space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Quick Select</label>
          <div className="grid grid-cols-3 gap-1">
            {[10, 50, 100, 500, 1000, 5000].map(n => (
              <Button key={n} size="sm" variant="outline" onClick={() => selectRandom(n)} disabled={userList.length === 0}
                className="h-6 text-[9px] gap-1">
                <Shuffle className="h-2.5 w-2.5" /> {n >= 1000 ? `${n / 1000}K` : n}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="p-3 mt-auto">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{userList.length}</p>
              <p className="text-[9px] text-muted-foreground">In List</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-400">{selectedIds.size}</p>
              <p className="text-[9px] text-muted-foreground">Selected</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{sendProgress?.sent || 0}</p>
              <p className="text-[9px] text-muted-foreground">Sent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchDiscoveryHub;

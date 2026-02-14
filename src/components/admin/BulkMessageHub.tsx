import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cachedFetch, invalidateNamespace } from "@/lib/supabaseCache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Send, Search, Loader2, Users, Bot, Sparkles, CheckCheck,
  RefreshCw, User, XCircle, Square, Zap, MessageCircle,
  Filter, Clock, Shuffle, Heart, Star, ArrowUpDown, UserPlus,
  Download, Key, Eye, EyeOff, AlertTriangle, Globe, Copy,
  ListFilter, Tag, Trash2, FileDown, BarChart3, Shield,
} from "lucide-react";

interface BulkMessageHubProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Follower {
  id: string;
  name: string;
  username: string;
  profile_pic: string | null;
  source: string;
  gender?: string;
}

type SortMode = "name" | "recent" | "source";

// Instagram Verified Badge SVG (exact replica)
const VerifiedBadge = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className="inline-block flex-shrink-0">
    <defs>
      <linearGradient id="ig-verified-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4FC3F7" />
        <stop offset="100%" stopColor="#2196F3" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="20" fill="url(#ig-verified-grad)" />
    {/* Spiky border points */}
    <polygon points="20,2 23.5,8 30,5 28,12 35,14 30,18.5 35,23 28.5,24 31,31 24,29 22,36 20,30 18,36 16,29 9,31 11.5,24 5,23 10,18.5 5,14 12,12 10,5 16.5,8" fill="url(#ig-verified-grad)" />
    {/* White checkmark */}
    <path d="M15 20.5L18.5 24L26 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Robust avatar with graceful fallback for expired CDN URLs
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

  return (
    <img
      src={src}
      alt=""
      className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
    />
  );
};

const BulkMessageHub = ({ accountId, open, onOpenChange }: BulkMessageHubProps) => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; failed: number } | null>(null);
  const [autoChat, setAutoChat] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const [sendResults, setSendResults] = useState<any[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "conversations" | "followers" | "fetched">("all");
  const [fetchingFollowers, setFetchingFollowers] = useState(false);
  const [delayBetweenMs, setDelayBetweenMs] = useState(1500);
  const [personalizeMode, setPersonalizeMode] = useState(false);
  const [showFetchSetup, setShowFetchSetup] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [fetchedCount, setFetchedCount] = useState(0);
  const [fetchGoal, setFetchGoal] = useState(0);
  const [fetchStartTime, setFetchStartTime] = useState(0);
  const [fetchChunkCount, setFetchChunkCount] = useState(0);
  const [fetchPhase, setFetchPhase] = useState<"idle" | "connecting" | "fetching" | "saving" | "paused" | "done">("idle");
  const [sessionId, setSessionId] = useState("");
  const [dsUserId, setDsUserId] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [showSessionId, setShowSessionId] = useState(false);
  const [maxFollowersInput, setMaxFollowersInput] = useState("");
  const [turboMode, setTurboMode] = useState(false);
  const [classifyingGender, setClassifyingGender] = useState(false);
  const [genderStats, setGenderStats] = useState<{ female: number; male: number; unknown: number } | null>(null);
  const cancelRef = useRef(false);
  const messageRef = useRef(message);
  // Search/Discover state
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const discoverTimeout = useRef<any>(null);

  useEffect(() => { messageRef.current = message; }, [message]);

  // Real-time follower count sync from Instagram
  const syncFollowerCount = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_profile_basic", account_id: accountId },
      });
      if (data?.success && data.data?.followers_count) {
        const newCount = data.data.followers_count;
        setFollowersCount(newCount);
        setFollowsCount(data.data?.follows_count || 0);
        await supabase.from("managed_accounts").update({
          subscriber_count: newCount,
          content_count: data.data?.media_count || undefined,
        }).eq("id", accountId);
        invalidateNamespace(accountId, "account_stats");
      }
    } catch {}
  }, [accountId]);

  useEffect(() => {
    if (!open) return;
    syncFollowerCount();
    const interval = setInterval(syncFollowerCount, 60000);
    return () => clearInterval(interval);
  }, [open, syncFollowerCount]);

  // Classify gender for all followers
  const classifyGender = async () => {
    setClassifyingGender(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "classify_gender", account_id: accountId, params: { batch_size: 10000 } },
      });
      if (error) throw error;
      if (data?.success) {
        setGenderStats({ female: data.data.female, male: data.data.male, unknown: data.data.unknown });
        // Update local followers with gender
        setFollowers(prev => prev.map(f => {
          const name = f.name || f.username;
          // Simple client-side re-classify to update UI instantly
          return { ...f, gender: f.gender || "unknown" };
        }));
        toast.success(`Gender classified: ${data.data.female} ♀ · ${data.data.male} ♂ · ${data.data.unknown} unknown`);
        // Reload to get updated gender from DB
        invalidateNamespace(accountId, "persisted_followers");
        loadPersistedFollowers();
      }
    } catch (e: any) {
      toast.error(e.message || "Gender classification failed");
    } finally {
      setClassifyingGender(false);
    }
  };

  const loadPersistedFollowers = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const accountInfo = await cachedFetch<{ subscriber_count: number; content_count: number }>(accountId, "account_stats", async () => {
        const { data: acct } = await supabase
          .from("managed_accounts")
          .select("subscriber_count, content_count")
          .eq("id", accountId)
          .single();
        return { subscriber_count: acct?.subscriber_count || 0, content_count: acct?.content_count || 0 };
      }, undefined, { ttlMs: 10 * 60 * 1000 });

      setFollowersCount(accountInfo.subscriber_count);

      const persisted = await cachedFetch<Follower[]>(accountId, "persisted_followers", async () => {
        const { data: persistedData } = await supabase.functions.invoke("instagram-api", {
          body: { action: "get_persisted_followers", account_id: accountId, params: { limit: 10000 } },
        });
        return persistedData?.data?.followers || [];
      }, undefined, { ttlMs: 10 * 60 * 1000 });

      const seen = new Set<string>(persisted.map((f: Follower) => f.id));

      const live = await cachedFetch<Follower[]>(accountId, "live_followers", async () => {
        const { data: liveData } = await supabase.functions.invoke("instagram-api", {
          body: { action: "get_followers_list", account_id: accountId, params: { limit: 500, source_filter: "all" } },
        });
        return liveData?.data?.followers || [];
      }, undefined, { ttlMs: 3 * 60 * 1000 });

      const merged = [...persisted];
      for (const f of live) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          merged.push(f);
        }
      }

      setFollowers(merged);
      
      // Count genders from loaded data
      const fc = merged.filter(f => f.gender === "female").length;
      const mc = merged.filter(f => f.gender === "male").length;
      const uc = merged.filter(f => !f.gender || f.gender === "unknown").length;
      if (fc > 0 || mc > 0) setGenderStats({ female: fc, male: mc, unknown: uc });
      
      toast.success(`Loaded ${merged.length} contacts (${persisted.length} saved · ${accountInfo.subscriber_count.toLocaleString()} total followers)`);
    } catch (e: any) {
      toast.error(e.message || "Failed to load followers");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchRealFollowers = async () => {
    if (!accountId) return;
    setFetchingFollowers(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_followers_list", account_id: accountId, params: { limit: 500, source_filter: "follower" } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch followers");

      const newFollowers = data.data?.followers || [];
      setFollowers(prev => {
        const seen = new Set(prev.map(f => f.id));
        const merged = [...prev];
        for (const f of newFollowers) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            merged.push(f);
          }
        }
        return merged;
      });
      setFollowsCount(data.data?.follows_count || 0);
      toast.success(`Discovered ${newFollowers.length} followers/engaged users`);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch followers");
    } finally {
      setFetchingFollowers(false);
    }
  };

  const fetchAllFollowers = async () => {
    if (!sessionId.trim()) {
      toast.error("Session ID cookie is required");
      return;
    }
    setFetching(true);
    cancelRef.current = false;
    const maxCount = maxFollowersInput ? parseInt(maxFollowersInput) : 0;
    const goal = maxCount > 0 ? maxCount : (followersCount || 29000);
    setFetchGoal(goal);
    setFetchedCount(0);
    setFetchChunkCount(0);
    setFetchStartTime(Date.now());
    setFetchPhase("connecting");
    setFetchProgress("Connecting to Instagram...");

    let cursor: string | null = null;
    let totalFetched = 0;
    let chunkNum = 0;

    try {
      while (!cancelRef.current) {
        chunkNum++;
        setFetchChunkCount(chunkNum);
        setFetchPhase("fetching");
        setFetchProgress(`Chunk ${chunkNum}: requesting followers...`);

        const { data, error } = await supabase.functions.invoke("instagram-api", {
          body: {
            action: "scrape_followers",
            account_id: accountId,
            params: {
              session_id: sessionId.trim(),
              ds_user_id: dsUserId.trim() || undefined,
              csrf_token: csrfToken.trim() || undefined,
              max_followers: maxCount > 0 ? maxCount - totalFetched : 0,
              pages_per_chunk: 20,
              batch_size: 200,
              cursor,
              turbo: turboMode,
            },
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Fetch failed");

        const chunk = data.data?.followers || [];
        const persisted = data.data?.total_persisted || 0;
        const skipped = data.data?.skipped_duplicates || 0;
        totalFetched += chunk.length + skipped;
        
        const displayCount = Math.max(persisted, totalFetched);
        setFetchedCount(displayCount);
        setFetchPhase("saving");
        setFetchProgress(`Chunk ${chunkNum}: +${chunk.length} new, ${skipped} skipped (${displayCount.toLocaleString()} total)`);

        if (chunk.length > 0) {
          setFollowers(prev => {
            const seen = new Set(prev.map(f => f.id));
            const merged = [...prev];
            for (const f of chunk) {
              if (!seen.has(f.id)) { seen.add(f.id); merged.push(f); }
            }
            return merged;
          });
        }

        if (data.data?.fetch_complete || !data.data?.next_cursor) {
          setFetchPhase("done");
          setFetchProgress(`✅ Complete! ${displayCount.toLocaleString()} followers saved`);
          toast.success(`🔥 Fetched all followers! ${displayCount.toLocaleString()} total saved.`);
          break;
        }

        if (maxCount > 0 && totalFetched >= maxCount) {
          setFetchPhase("done");
          setFetchProgress(`✅ Reached limit: ${displayCount.toLocaleString()} saved`);
          toast.success(`Fetched ${totalFetched} followers (limit: ${maxCount})`);
          break;
        }

        if (data.data?.rate_limited) {
          setFetchPhase("paused");
          setFetchProgress(`⏳ Rate limited — cooling down 30s...`);
          await new Promise(r => setTimeout(r, 30000));
        } else {
          await new Promise(r => setTimeout(r, turboMode ? 1000 : 2000));
        }

        cursor = data.data.next_cursor;
      }

      if (cancelRef.current) {
        setFetchPhase("done");
        setFetchProgress(`Cancelled after ${totalFetched} followers`);
        toast.info(`Cancelled. ${totalFetched} followers saved so far.`);
      }

      invalidateNamespace(accountId, "persisted_followers");
      invalidateNamespace(accountId, "live_followers");
      setShowFetchSetup(false);
      setActiveTab("fetched");
    } catch (e: any) {
      toast.error(e.message || "Fetch failed");
      setFetchPhase("idle");
      setFetchProgress(`Error: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  // ===== INSTAGRAM USER SEARCH (Discover) =====
  const searchInstagramUsers = useCallback(async (query: string) => {
    if (!query || query.length < 1) { setDiscoverResults([]); return; }
    setDiscoverLoading(true);
    try {
      const { data: connData } = await supabase
        .from("social_connections")
        .select("metadata")
        .eq("account_id", accountId)
        .eq("platform", "instagram")
        .single();
      const savedSession = (connData?.metadata as any)?.ig_session_id || sessionId.trim();
      if (!savedSession) {
        const { data } = await supabase.functions.invoke("instagram-api", {
          body: { action: "discover_user", account_id: accountId, params: { username: query, media_limit: 3 } },
        });
        if (data?.success && data.data?.business_discovery) {
          const bd = data.data.business_discovery;
          setDiscoverResults([{
            id: bd.id, username: bd.username, full_name: bd.name,
            profile_pic_url: bd.profile_picture_url, follower_count: bd.followers_count,
            is_verified: false, is_private: false,
          }]);
        } else {
          setDiscoverResults([]);
        }
        return;
      }

      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: {
          action: "search_users",
          account_id: accountId,
          params: { query, session_id: savedSession, max_results: 200 },
        },
      });
      if (error) throw error;
      setDiscoverResults(data?.data?.users || []);
    } catch (e: any) {
      console.error("Search failed:", e.message);
      setDiscoverResults([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, [accountId, sessionId]);

  const onDiscoverQueryChange = (val: string) => {
    setDiscoverQuery(val);
    if (discoverTimeout.current) clearTimeout(discoverTimeout.current);
    discoverTimeout.current = setTimeout(() => searchInstagramUsers(val), 400);
  };

  const addDiscoveredUser = (user: any) => {
    const newFollower: Follower = {
      id: user.id || user.pk,
      name: user.full_name || user.username,
      username: user.username,
      profile_pic: user.profile_pic_url || null,
      source: "discovered",
      gender: user.gender || undefined,
    };
    setFollowers(prev => {
      if (prev.some(f => f.id === newFollower.id)) {
        toast.info(`${user.username} already in list`);
        return prev;
      }
      return [...prev, newFollower];
    });
    setSelectedIds(prev => new Set([...prev, newFollower.id]));
    toast.success(`Added @${user.username}`);
  };

  const addAllDiscovered = () => {
    let added = 0;
    setFollowers(prev => {
      const seen = new Set(prev.map(f => f.id));
      const merged = [...prev];
      for (const user of discoverResults) {
        const id = user.id || user.pk;
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push({
          id,
          name: user.full_name || user.username,
          username: user.username,
          profile_pic: user.profile_pic_url || null,
          source: "discovered",
          gender: user.gender || undefined,
        });
        added++;
      }
      return merged;
    });
    // Select all newly added
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const user of discoverResults) next.add(user.id || user.pk);
      return next;
    });
    toast.success(`Added ${added} accounts from search`);
  };

  // Quick-add random accounts from fetched list
  const quickAddRandom = (count: number) => {
    const unselected = followers.filter(f => !selectedIds.has(f.id));
    if (unselected.length === 0) {
      // If all are selected, just shuffle from all
      const shuffled = [...followers].sort(() => Math.random() - 0.5);
      setSelectedIds(new Set(shuffled.slice(0, Math.min(count, shuffled.length)).map(f => f.id)));
    } else {
      const shuffled = [...unselected].sort(() => Math.random() - 0.5);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const f of shuffled.slice(0, count)) next.add(f.id);
        return next;
      });
    }
    toast.success(`Randomly added ${Math.min(count, followers.length)} to selection`);
  };

  useEffect(() => {
    if (open && followers.length === 0) loadPersistedFollowers();
  }, [open, loadPersistedFollowers]);

  const sortedFollowers = [...followers].sort((a, b) => {
    if (sortMode === "name") return a.name.localeCompare(b.name);
    if (sortMode === "source") return a.source.localeCompare(b.source);
    return 0;
  });

  const filteredFollowers = sortedFollowers.filter(f => {
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSource === "all" || f.source === filterSource;
    const matchesTab = activeTab === "all" || 
      (activeTab === "conversations" && (f.source === "conversation" || f.source === "ig_api")) ||
      (activeTab === "followers" && (f.source === "follower" || f.source === "engaged")) ||
      (activeTab === "fetched" && (f.source === "fetched" || f.source === "discovered"));
    return matchesSearch && matchesFilter && matchesTab;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredFollowers.length && filteredFollowers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFollowers.map(f => f.id)));
    }
  };

  const selectRandom = (count: number) => {
    const shuffled = [...filteredFollowers].sort(() => Math.random() - 0.5);
    setSelectedIds(new Set(shuffled.slice(0, count).map(f => f.id)));
    toast.success(`Randomly selected ${Math.min(count, filteredFollowers.length)} contacts`);
  };

  const selectByGender = (gender: "female" | "male") => {
    const matching = followers.filter(f => f.gender === gender);
    if (matching.length === 0) {
      toast.error(`No ${gender} accounts detected. Run "Classify Gender" first.`);
      return;
    }
    setSelectedIds(new Set(matching.map(f => f.id)));
    toast.success(`Selected ${matching.length} ${gender === "female" ? "♀ female" : "♂ male"} accounts`);
  };

  const invertSelection = () => {
    const inverted = new Set<string>();
    filteredFollowers.forEach(f => {
      if (!selectedIds.has(f.id)) inverted.add(f.id);
    });
    setSelectedIds(inverted);
  };

  const generateAIMessage = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_opener", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (data?.data?.message) {
        setMessage(data.data.message);
        toast.success("AI opener generated from persona");
      } else {
        throw new Error("No message returned");
      }
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setGeneratingAI(false);
    }
  };

  const cancelSend = () => {
    cancelRef.current = true;
    toast.info("Cancelling... will stop after current message");
  };

  const sendBulkMessages = async (recipients: Follower[]) => {
    if (!messageRef.current.trim() || recipients.length === 0) {
      toast.error("Select recipients and enter a message");
      return;
    }
    setSending(true);
    cancelRef.current = false;
    setSendProgress({ sent: 0, total: recipients.length, failed: 0 });
    setSendResults(null);

    const results: any[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      if (cancelRef.current) {
        toast.info(`Cancelled after ${sent}/${recipients.length}`);
        break;
      }

      try {
        let currentMessage = messageRef.current.trim();
        if (!currentMessage) { results.push({ id: recipient.id, name: recipient.name, success: false, error: "Empty" }); failed++; continue; }

        if (personalizeMode) {
          currentMessage = currentMessage.replace(/\{name\}/gi, recipient.name || "babe");
        }

        const { data, error } = await supabase.functions.invoke("instagram-api", {
          body: {
            action: "send_message",
            account_id: accountId,
            params: { recipient_id: recipient.id, message: currentMessage },
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Send failed");

        results.push({ id: recipient.id, name: recipient.name, success: true });
        sent++;
      } catch (e: any) {
        results.push({ id: recipient.id, name: recipient.name, success: false, error: e.message });
        failed++;
      }

      setSendProgress({ sent, total: recipients.length, failed });
      setSendResults([...results]);

      if (!cancelRef.current) {
        await new Promise(r => setTimeout(r, delayBetweenMs));
      }
    }

    setSendResults(results);
    setSendProgress({ sent, total: recipients.length, failed });

    if (!cancelRef.current) {
      toast.success(`Done: ${sent} sent, ${failed} failed`);
    }

    if (autoChat) {
      for (const r of results) {
        if (!r.success) continue;
        const { data: existing } = await supabase
          .from("ai_dm_conversations")
          .select("id")
          .eq("account_id", accountId)
          .eq("participant_id", r.id)
          .limit(1);

        const recipient = recipients.find(rec => rec.id === r.id);
        if (existing && existing.length > 0) {
          await supabase.from("ai_dm_conversations").update({
            ai_enabled: true, is_read: false, last_message_at: new Date().toISOString(),
          }).eq("id", existing[0].id);
        } else {
          await supabase.from("ai_dm_conversations").insert({
            account_id: accountId,
            participant_id: r.id,
            participant_name: recipient?.name || r.name,
            participant_username: recipient?.username || r.name,
            participant_avatar_url: recipient?.profile_pic || null,
            platform: "instagram",
            ai_enabled: true,
            status: "active",
            folder: "primary",
            is_read: false,
            last_message_at: new Date().toISOString(),
            last_message_preview: `You: ${messageRef.current.substring(0, 80)}`,
          });
        }
      }
    }

    setSending(false);
  };

  const selectedFollowers = followers.filter(f => selectedIds.has(f.id));
  const sources = [...new Set(followers.map(f => f.source))];

  const exportContacts = () => {
    const data = filteredFollowers.map(f => `${f.username},${f.name},${f.source},${f.gender || "unknown"}`).join("\n");
    navigator.clipboard.writeText(`username,name,source,gender\n${data}`);
    toast.success(`Copied ${filteredFollowers.length} contacts to clipboard as CSV`);
  };

  const removeSelected = () => {
    setFollowers(prev => prev.filter(f => !selectedIds.has(f.id)));
    toast.success(`Removed ${selectedIds.size} contacts from list`);
    setSelectedIds(new Set());
  };

  const selectBySource = (source: string) => {
    const ids = new Set(followers.filter(f => f.source === source).map(f => f.id));
    setSelectedIds(ids);
    toast.success(`Selected ${ids.size} ${source} contacts`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[88vh] flex flex-col p-0 gap-0 bg-[hsl(222,35%,8%)] border-white/10 text-white overflow-hidden">
        <DialogHeader className="px-6 py-3 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-lg text-white">
            <Send className="h-5 w-5 text-purple-400" />
            Bulk Message Hub
            <Badge variant="outline" className="text-[10px] ml-2 text-white/50 border-white/20">
              {followersCount.toLocaleString()} followers · {followers.length.toLocaleString()} fetched
            </Badge>
            {genderStats && (
              <Badge variant="outline" className="text-[10px] text-white/40 border-white/15">
                ♀{genderStats.female} · ♂{genderStats.male}
              </Badge>
            )}
            <button onClick={syncFollowerCount} className="ml-1 text-white/30 hover:text-emerald-400 transition-colors" title="Sync follower count from Instagram">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {/* HORIZONTAL LAYOUT: Left = Composer + Actions | Right = Contact List */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT PANEL — Message Composer + Actions */}
          <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-white/10 overflow-y-auto">
            {/* Message Composer */}
            <div className="px-5 py-4 border-b border-white/10 space-y-3">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Message</label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={personalizeMode ? "hey {name} 💕 noticed u following me..." : "Type your message... or generate with AI"}
                className="min-h-[100px] max-h-[160px] text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none focus:border-purple-500/50"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={generateAIMessage} disabled={generatingAI} className="h-8 text-[11px] gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent">
                  {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Opener
                </Button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40">Personalize</span>
                  <Switch checked={personalizeMode} onCheckedChange={setPersonalizeMode} className="scale-[0.7]" />
                </div>
                {personalizeMode && (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20 bg-amber-500/5">
                    {"{name}"} = recipient name
                  </Badge>
                )}
              </div>
              {sending && (
                <Badge variant="outline" className="text-[11px] text-amber-400 border-amber-500/30 animate-pulse w-full justify-center py-1">
                  ✏️ Edit message — applies in real-time to unsent
                </Badge>
              )}
            </div>

            {/* Send Actions */}
            <div className="px-5 py-3 border-b border-white/10 space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Actions</label>
              {sending ? (
                <Button size="sm" variant="destructive" onClick={cancelSend} className="h-8 text-[11px] gap-1.5 w-full">
                  <XCircle className="h-3.5 w-3.5" /> Cancel Send
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" disabled={selectedIds.size === 0 || !message.trim()} onClick={() => sendBulkMessages(selectedFollowers)} className="h-8 text-[11px] gap-1 bg-purple-600 hover:bg-purple-700">
                    <Send className="h-3 w-3" /> Selected ({selectedIds.size})
                  </Button>
                  <Button size="sm" variant="outline" disabled={followers.length === 0 || !message.trim()} onClick={() => sendBulkMessages(followers)} className="h-8 text-[11px] gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10 bg-transparent">
                    <Users className="h-3 w-3" /> All ({followers.length})
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Add to Selection */}
            <div className="px-5 py-3 border-b border-white/10 space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Quick Add</label>
              <div className="grid grid-cols-3 gap-1">
                {[10, 50, 100, 500, 1000, 10000].map(n => (
                  <Button key={n} size="sm" variant="outline" onClick={() => quickAddRandom(n)} disabled={followers.length === 0} className="h-7 text-[10px] gap-1 bg-transparent border-white/10 text-white/60 hover:bg-white/5">
                    <Shuffle className="h-2.5 w-2.5" /> {n >= 1000 ? `${n / 1000}K` : n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selection Tools */}
            <div className="px-5 py-3 border-b border-white/10 space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Selection</label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-[10px] gap-1 text-white/50 hover:text-white hover:bg-white/5 justify-start">
                  {selectedIds.size === filteredFollowers.length && filteredFollowers.length > 0 ? (
                    <><Square className="h-2.5 w-2.5" /> Deselect All</>
                  ) : (
                    <><CheckCheck className="h-2.5 w-2.5" /> Select All</>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={invertSelection} className="h-7 text-[10px] gap-1 text-white/50 hover:text-white hover:bg-white/5 justify-start">
                  <ArrowUpDown className="h-2.5 w-2.5" /> Invert
                </Button>
                
                {/* Gender Selection */}
                <Button size="sm" variant="ghost" onClick={() => selectByGender("female")} className="h-7 text-[10px] gap-1 text-pink-400/70 hover:text-pink-400 hover:bg-pink-500/5 justify-start">
                  <span className="text-sm leading-none">♀</span> All Women
                </Button>
                <Button size="sm" variant="ghost" onClick={() => selectByGender("male")} className="h-7 text-[10px] gap-1 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/5 justify-start">
                  <span className="text-sm leading-none">♂</span> All Men
                </Button>
                
                <Button size="sm" variant="ghost" onClick={() => selectBySource("fetched")} className="h-7 text-[10px] gap-1 text-orange-400/60 hover:text-orange-400 hover:bg-orange-500/5 justify-start">
                  <Download className="h-2.5 w-2.5" /> Fetched Only
                </Button>
                <Button size="sm" variant="ghost" onClick={() => selectBySource("conversation")} className="h-7 text-[10px] gap-1 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/5 justify-start">
                  <MessageCircle className="h-2.5 w-2.5" /> DM Only
                </Button>
                <Button size="sm" variant="ghost" onClick={exportContacts} className="h-7 text-[10px] gap-1 text-white/50 hover:text-white hover:bg-white/5 justify-start">
                  <Copy className="h-2.5 w-2.5" /> Export CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={removeSelected} disabled={selectedIds.size === 0} className="h-7 text-[10px] gap-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/5 justify-start">
                  <Trash2 className="h-2.5 w-2.5" /> Remove Selected
                </Button>
              </div>
              
              {/* Gender Classify Button */}
              <Button size="sm" variant="outline" onClick={classifyGender} disabled={classifyingGender || followers.length === 0} className="h-7 text-[10px] gap-1.5 w-full border-purple-500/20 text-purple-400/70 hover:bg-purple-500/10 bg-transparent mt-1">
                {classifyingGender ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
                {classifyingGender ? "Classifying..." : "Classify Gender (AI)"}
              </Button>
            </div>

            {/* Settings */}
            <div className="px-5 py-3 border-b border-white/10 space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Settings</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50 flex items-center gap-1.5"><Bot className="h-3 w-3" /> Auto-enable AI chat</span>
                  <Switch checked={autoChat} onCheckedChange={setAutoChat} className="scale-[0.7]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-white/30" />
                  <span className="text-[11px] text-white/40">Delay:</span>
                  <div className="flex gap-1">
                    {[500, 1500, 3000, 5000].map(ms => (
                      <button
                        key={ms}
                        onClick={() => setDelayBetweenMs(ms)}
                        className={`text-[10px] px-2 py-0.5 rounded ${delayBetweenMs === ms ? "bg-purple-500/20 text-purple-400" : "text-white/30 hover:text-white/60 bg-white/5"}`}
                      >
                        {ms / 1000}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Send Progress */}
            {sendProgress && (
              <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" /> : <CheckCheck className="h-3.5 w-3.5 text-green-400" />}
                  <span className={sending ? "text-blue-400" : "text-green-400"}>
                    {sending ? `Sending... ${sendProgress.sent}/${sendProgress.total}` : `Done: ${sendProgress.sent}/${sendProgress.total} sent`}
                  </span>
                  {sendProgress.failed > 0 && <span className="text-red-400 text-[11px]">({sendProgress.failed} failed)</span>}
                </div>
                <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats Footer */}
            <div className="px-5 py-3 mt-auto bg-white/[0.02]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{followersCount.toLocaleString()}</div>
                  <div className="text-[9px] text-white/30 uppercase">IG Followers</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-400">{followers.length.toLocaleString()}</div>
                  <div className="text-[9px] text-white/30 uppercase">Fetched</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-400">{selectedIds.size.toLocaleString()}</div>
                  <div className="text-[9px] text-white/30 uppercase">Selected</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Contacts List */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Source Tabs + Discover + Fetch */}
            <div className="px-5 py-2 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-1 flex-wrap">
                {([
                  { key: "all" as const, label: "All", icon: Users },
                  { key: "conversations" as const, label: "DMs", icon: MessageCircle },
                  { key: "followers" as const, label: "Engaged", icon: Heart },
                  { key: "fetched" as const, label: "Fetched", icon: Download },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      activeTab === tab.key 
                        ? "bg-purple-500/20 text-purple-400" 
                        : "text-white/40 hover:text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="h-3 w-3" />
                    {tab.label}
                    <span className="text-[9px] opacity-60">
                      ({followers.filter(f => 
                        tab.key === "all" ? true : 
                        tab.key === "conversations" ? (f.source === "conversation" || f.source === "ig_api") :
                        tab.key === "followers" ? (f.source === "follower" || f.source === "engaged") :
                        (f.source === "fetched" || f.source === "discovered")
                      ).length})
                    </span>
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  {/* DISCOVER — Instagram Search Popover */}
                  <Popover open={showDiscover} onOpenChange={setShowDiscover}>
                    <PopoverTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                      >
                        <Globe className="h-3 w-3" />
                        Discover
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0 bg-[hsl(222,35%,10%)] border-white/10" align="end" sideOffset={4}>
                      <div className="p-3 border-b border-white/10">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                          <Input
                            placeholder="Search Instagram users..."
                            value={discoverQuery}
                            onChange={e => onDiscoverQueryChange(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            autoFocus
                          />
                          {discoverLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-emerald-400" />}
                        </div>
                        {discoverResults.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" onClick={addAllDiscovered} className="h-6 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700">
                              <UserPlus className="h-3 w-3" /> Add All ({discoverResults.length})
                            </Button>
                            <span className="text-[10px] text-white/30">{discoverResults.length} results</span>
                          </div>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {discoverResults.length === 0 && discoverQuery.length > 0 && !discoverLoading && (
                          <p className="text-[11px] text-white/30 text-center py-4">No results for "{discoverQuery}"</p>
                        )}
                        {discoverResults.length === 0 && discoverQuery.length === 0 && (
                          <p className="text-[11px] text-white/30 text-center py-4">Type a username or keyword to search</p>
                        )}
                        {discoverResults.map((user: any) => (
                          <div
                            key={user.id || user.username}
                            className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors border-b border-white/[0.04]"
                          >
                            <UserAvatar src={user.profile_pic_url} name={user.full_name || user.username} username={user.username} size={9} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-white truncate">{user.full_name || user.username}</span>
                                {user.is_verified && <VerifiedBadge size={14} />}
                                {user.is_private && <span className="text-amber-400 text-[9px]">🔒</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/35">@{user.username}</span>
                                {user.gender && user.gender !== "unknown" && (
                                  <span className={`text-[9px] ${user.gender === "female" ? "text-pink-400" : "text-blue-400"}`}>
                                    {user.gender === "female" ? "♀" : "♂"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex items-center gap-2">
                              {user.follower_count != null && (
                                <span className="text-[10px] text-white/40">{user.follower_count >= 1000000 ? `${(user.follower_count / 1000000).toFixed(1)}M` : user.follower_count >= 1000 ? `${(user.follower_count / 1000).toFixed(1)}K` : user.follower_count}</span>
                              )}
                              <button
                                onClick={() => addDiscoveredUser(user)}
                                className="p-1 rounded hover:bg-emerald-500/20 transition-colors"
                              >
                                <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={fetchRealFollowers} 
                    disabled={fetchingFollowers}
                    className="h-7 text-[10px] gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                  >
                    {fetchingFollowers ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                    Engaged
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowFetchSetup(!showFetchSetup)} 
                    disabled={fetching}
                    className="h-7 text-[10px] gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 bg-transparent"
                  >
                    {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    Fetch All
                  </Button>
                </div>
              </div>
            </div>

            {/* Fetch Setup Panel */}
            {showFetchSetup && (
              <div className="px-5 py-3 border-b border-orange-500/20 bg-orange-500/[0.03] flex-shrink-0 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-orange-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="font-medium">Instagram Session Cookie Required</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Open <span className="text-white/70">instagram.com</span> → Right-click → Inspect → Application → Cookies → Copy <span className="text-orange-400 font-mono">sessionid</span>, <span className="text-orange-400 font-mono">ds_user_id</span>, and <span className="text-orange-400 font-mono">csrftoken</span>.
                </p>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type={showSessionId ? "text" : "password"}
                      placeholder="sessionid (required)"
                      value={sessionId}
                      onChange={e => setSessionId(e.target.value)}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 pr-8 font-mono"
                    />
                    <button onClick={() => setShowSessionId(!showSessionId)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showSessionId ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="ds_user_id (optional)"
                      value={dsUserId}
                      onChange={e => setDsUserId(e.target.value)}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono"
                    />
                    <Input
                      placeholder="csrftoken (optional)"
                      value={csrfToken}
                      onChange={e => setCsrfToken(e.target.value)}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 font-mono"
                    />
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <Input
                      type="number"
                      placeholder="Max followers (empty = ALL)"
                      value={maxFollowersInput}
                      onChange={e => setMaxFollowersInput(e.target.value)}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25 w-[200px]"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/30">Turbo</span>
                      <Switch checked={turboMode} onCheckedChange={setTurboMode} className="scale-[0.6]" />
                    </div>
                    <span className="text-[10px] text-white/30">{turboMode ? "⚡ Fast (higher risk)" : "🛡️ Safe"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={fetchAllFollowers}
                    disabled={fetching || !sessionId.trim()}
                    className="h-8 text-[11px] gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {fetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {fetching ? "Fetching..." : maxFollowersInput ? `Fetch ${parseInt(maxFollowersInput || "0").toLocaleString()}` : "Fetch All Followers"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowFetchSetup(false)} className="h-8 text-[11px] text-white/40 hover:text-white/60">
                    Cancel
                  </Button>

                  {/* Live Progress Dashboard */}
                  {(fetching || fetchPhase === "done") && fetchGoal > 0 && (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" opacity="0.3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={fetchPhase === "done" ? "hsl(142, 76%, 50%)" : fetchPhase === "paused" ? "hsl(45, 93%, 55%)" : "hsl(30, 90%, 55%)"}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={`${Math.min((fetchedCount / fetchGoal) * 94.25, 94.25)} 94.25`}
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-sm font-bold ${fetchPhase === "done" ? "text-green-400" : fetchPhase === "paused" ? "text-yellow-400" : "text-orange-400"}`}>
                            {fetchGoal > 0 ? Math.min(Math.round((fetchedCount / fetchGoal) * 100), 100) : 0}%
                          </span>
                        </div>
                        {fetching && fetchPhase !== "paused" && fetchPhase !== "done" && (
                          <div className="absolute inset-0 rounded-full border-2 border-orange-400/30 animate-ping" style={{ animationDuration: "2s" }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${fetchPhase === "done" ? "text-green-400" : fetchPhase === "paused" ? "text-yellow-400" : "text-orange-400"}`}>
                            {fetchedCount.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-white/30">/ {fetchGoal.toLocaleString()}</span>
                          {fetching && fetchPhase !== "done" && (
                            <Loader2 className="h-3 w-3 animate-spin text-orange-400/60" />
                          )}
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              fetchPhase === "done" ? "bg-green-500" : fetchPhase === "paused" ? "bg-yellow-500" : "bg-gradient-to-r from-orange-500 to-pink-500"
                            }`}
                            style={{ width: `${Math.min((fetchedCount / fetchGoal) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-white/35">
                          <span>Chunk #{fetchChunkCount}</span>
                          {fetchStartTime > 0 && (
                            <span>
                              {(() => {
                                const elapsed = Math.round((Date.now() - fetchStartTime) / 1000);
                                const mins = Math.floor(elapsed / 60);
                                const secs = elapsed % 60;
                                return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                              })()}
                            </span>
                          )}
                          {fetchedCount > 0 && fetching && fetchStartTime > 0 && (
                            <span className="text-orange-400/60">
                              ETA: {(() => {
                                const elapsed = (Date.now() - fetchStartTime) / 1000;
                                const rate = fetchedCount / elapsed;
                                const remaining = Math.max(0, fetchGoal - fetchedCount);
                                const etaSecs = rate > 0 ? Math.round(remaining / rate) : 0;
                                const etaMins = Math.floor(etaSecs / 60);
                                return etaMins > 0 ? `~${etaMins}m` : `~${etaSecs}s`;
                              })()}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 ${
                            fetchPhase === "connecting" ? "text-blue-400 border-blue-500/20" :
                            fetchPhase === "fetching" ? "text-orange-400 border-orange-500/20" :
                            fetchPhase === "saving" ? "text-purple-400 border-purple-500/20" :
                            fetchPhase === "paused" ? "text-yellow-400 border-yellow-500/20" :
                            fetchPhase === "done" ? "text-green-400 border-green-500/20" :
                            "text-white/20 border-white/10"
                          }`}>
                            {fetchPhase === "connecting" ? "Connecting" : fetchPhase === "fetching" ? "Fetching" : fetchPhase === "saving" ? "Saving" : fetchPhase === "paused" ? "Rate Limited" : fetchPhase === "done" ? "Complete" : "Idle"}
                          </Badge>
                        </div>
                      </div>

                      {fetching && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { cancelRef.current = true; }}
                          className="h-8 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Square className="h-3 w-3 mr-1" /> Stop
                        </Button>
                      )}
                    </div>
                  )}

                  {!fetching && fetchPhase !== "done" && fetchProgress && (
                    <span className="text-[10px] text-white/40">{fetchProgress}</span>
                  )}
                </div>
                <p className="text-[9px] text-white/25 leading-relaxed">
                  ⚡ Upgraded chunked fetch (20 pages/chunk). Skips already-scraped profiles. Auto gender detection. {turboMode ? "TURBO: faster delays." : "Safe mode: conservative delays."}
                </p>
              </div>
            )}

            {/* Search + Sort */}
            <div className="px-5 py-2 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  />
                </div>
                <button onClick={() => setSortMode(sortMode === "name" ? "source" : "name")} className="text-[10px] text-white/40 hover:text-white/70 flex items-center gap-1 px-2.5 py-1.5 rounded bg-white/5">
                  <ArrowUpDown className="h-3 w-3" />
                  {sortMode === "name" ? "A-Z" : "Source"}
                </button>
                <Button size="sm" variant="ghost" disabled={loading} onClick={() => { invalidateNamespace(accountId, "persisted_followers"); invalidateNamespace(accountId, "live_followers"); loadPersistedFollowers(); }} className="h-8 text-[10px] gap-1 text-white/40 hover:text-white hover:bg-white/5 px-2">
                  <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Reload
                </Button>
              </div>
            </div>

            {/* Follower List — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-10 text-center">
                  <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-white/20" />
                  <p className="text-sm text-white/40">Loading contacts...</p>
                </div>
              ) : filteredFollowers.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-white/10" />
                  <p className="text-sm text-white/40">
                    {followers.length === 0 ? "No contacts — use Discover or Fetch All to get started" : "No matches"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {filteredFollowers.map(f => {
                    const isSelected = selectedIds.has(f.id);
                    const sendResult = sendResults?.find(r => r.id === f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleSelect(f.id)}
                        className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/[0.04] cursor-pointer ${isSelected ? "bg-purple-500/[0.08]" : ""}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(f.id)}
                          className="flex-shrink-0 border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                        />
                        <UserAvatar src={f.profile_pic} name={f.name} username={f.username} size={9} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-white truncate">{f.name}</p>
                            {f.gender && f.gender !== "unknown" && (
                              <span className={`text-[10px] ${f.gender === "female" ? "text-pink-400" : "text-blue-400"}`}>
                                {f.gender === "female" ? "♀" : "♂"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/35 truncate">@{f.username}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] px-1.5 ${
                          f.source === "fetched" ? "text-orange-400 border-orange-500/20" : 
                          f.source === "discovered" ? "text-emerald-400 border-emerald-500/20" :
                          f.source === "follower" || f.source === "engaged" ? "text-cyan-400 border-cyan-500/20" : 
                          "text-white/25 border-white/10"
                        }`}>
                          {f.source === "conversation" ? "DM" : f.source === "fetched" ? "Fetched" : f.source === "discovered" ? "Found" : f.source === "engaged" ? "Engaged" : f.source === "follower" ? "Follower" : "IG"}
                        </Badge>
                        {sendResult && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${sendResult.success ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}
                          >
                            {sendResult.success ? "✓ Sent" : "✗ Failed"}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2 border-t border-white/10 bg-white/[0.02] text-[11px] text-white/40 flex items-center justify-between flex-shrink-0">
              <span>{filteredFollowers.length} shown · {selectedIds.size} selected</span>
              <div className="flex items-center gap-3">
                {autoChat && <span className="text-blue-400 flex items-center gap-1"><Bot className="h-3 w-3" />AI Auto-chat</span>}
                <span className="text-white/25">Delay: {delayBetweenMs / 1000}s</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMessageHub;

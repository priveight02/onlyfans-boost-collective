import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cachedFetch, invalidateNamespace, invalidateAccount } from "@/lib/supabaseCache";
import SocialAITools from "./SocialAITools";
import LiveDMConversations from "./LiveDMConversations";
import IGAutomationSuite from "./social/IGAutomationSuite";
import TKAutomationSuite from "./social/TKAutomationSuite";
import ThreadsAutomationSuite from "./social/ThreadsAutomationSuite";
import FBAutomationSuite from "./social/FBAutomationSuite";
import SocialNetworksTab from "./social/SocialNetworksTab";
import BioLinksManager from "./social/BioLinksManager";
import AIMassDMOutreach from "./social/AIMassDMOutreach";
import SearchDiscoveryHub from "./social/SearchDiscoveryHub";
import CommentsHub from "./social/CommentsHub";
import { toast } from "sonner";
import CreditCostBadge from "./CreditCostBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  Instagram, Music2, Link2, Send, BarChart3, MessageSquare, Plus,
  Calendar, ExternalLink, RefreshCw, Trash2, Eye, TrendingUp,
  Globe, Users, Heart, Share2, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  Search, Hash, Zap, Shield, Download,
  Image, Video, Play, Pause, Radio, Star, Target,
  Activity, Copy, Wifi, WifiOff,
  MessageCircle, LayoutDashboard, Compass,
  Sparkles, Bot, Brain, Wand2, AtSign, Megaphone, FolderOpen,
  PieChart, Layers, Twitter, Phone, Camera, Gamepad2, ArrowRight,
  Key, Loader2,
} from "lucide-react";

const VerifiedBadge = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className="inline-block flex-shrink-0">
    <defs><linearGradient id="smh-verified-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4FC3F7" /><stop offset="100%" stopColor="#2196F3" /></linearGradient></defs>
    <circle cx="20" cy="20" r="20" fill="url(#smh-verified-grad)" />
    <polygon points="20,2 23.5,8 30,5 28,12 35,14 30,18.5 35,23 28.5,24 31,31 24,29 22,36 20,30 18,36 16,29 9,31 11.5,24 5,23 10,18.5 5,14 12,12 10,5 16.5,8" fill="url(#smh-verified-grad)" />
    <path d="M15 20.5L18.5 24L26 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const SocialMediaHub = ({ subTab: urlSubTab, onSubTabChange, urlPlatform, onPlatformChange }: { subTab?: string; onSubTabChange?: (subTab: string) => void; urlPlatform?: string; onPlatformChange?: (platform: string) => void }) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTabInternal] = useState(urlSubTab || "dashboard");
  const setActiveSubTab = (v: string) => { setActiveSubTabInternal(v); onSubTabChange?.(v); };
  useEffect(() => { if (urlSubTab && urlSubTab !== activeSubTab) setActiveSubTabInternal(urlSubTab); }, [urlSubTab]);
  const [platformTab, setPlatformTabInternal] = useState(urlPlatform || "instagram");
  const setPlatformTab = (v: string) => { setPlatformTabInternal(v); onPlatformChange?.(v); };
  useEffect(() => { if (urlPlatform && urlPlatform !== platformTab) setPlatformTabInternal(urlPlatform); }, [urlPlatform]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [connections, setConnections] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [bioLinks, setBioLinks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [commentReplies, setCommentReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // Profiles
  const [igProfile, setIgProfile] = useState<any>(null);
  const [ttProfile, setTtProfile] = useState<any>(null);
  const [xProfile, setXProfile] = useState<any>(null);
  const [redditProfile, setRedditProfile] = useState<any>(null);
  const [telegramProfile, setTelegramProfile] = useState<any>(null);

  // Discovery
  const [discoveryUsername, setDiscoveryUsername] = useState("");

  // Search
  const [searchType, setSearchType] = useState("username");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPlatform, setSearchPlatform] = useState("both");
  const [searchResults, setSearchResults] = useState<any>(null);

  // Media
  const [igMedia, setIgMedia] = useState<any[]>([]);
  const [ttVideos, setTtVideos] = useState<any[]>([]);

  // Comments
  const [commentsMediaId, setCommentsMediaId] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [commentsPlatform, setCommentsPlatform] = useState("instagram");

  // DMs
  const [dmRecipientId, setDmRecipientId] = useState("");
  const [dmMessage, setDmMessage] = useState("");

  // AI Auto-Respond - Play/Pause
  const [autoRespondActive, setAutoRespondActive] = useState(false);
  const [autoRespondLoading, setAutoRespondLoading] = useState(false);
  const [aiDmRedirectUrl, setAiDmRedirectUrl] = useState("");
  const [aiDmKeywords, setAiDmKeywords] = useState("");
  const [aiTestMessage, setAiTestMessage] = useState("");
  const [aiTestReply, setAiTestReply] = useState("");
  const [aiTestSender, setAiTestSender] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [aiTypingDelay, setAiTypingDelay] = useState(0);
  const [aiLifePause, setAiLifePause] = useState(false);

  // AI Comment Reply
  const [aiAutoReplyRedirect, setAiAutoReplyRedirect] = useState("");
  const [bulkAiReplies, setBulkAiReplies] = useState<any[]>([]);

  // AI Caption
  const [aiCaptionTopic, setAiCaptionTopic] = useState("");
  const [aiCaptionPlatform, setAiCaptionPlatform] = useState("instagram");
  const [aiCaptionResult, setAiCaptionResult] = useState("");
  const [aiCaptionCta, setAiCaptionCta] = useState(true);

  // AI Analyze
  const [aiAnalyzeCaption, setAiAnalyzeCaption] = useState("");
  const [aiAnalyzeResult, setAiAnalyzeResult] = useState("");

  // Post form
  const [newPost, setNewPost] = useState({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "", alt_text: "" });

  // Bio link form
  const [newBioLink, setNewBioLink] = useState({ slug: "", title: "", bio: "", of_link: "", theme: "dark", links: [{ title: "", url: "", enabled: true }], social_links: { instagram: "", tiktok: "", twitter: "" } });

  // Connect form
  const [connectForm, setConnectForm] = useState({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" });

  // Direct OAuth link
  const [oauthAppId, setOauthAppId] = useState("");
  const [oauthRedirectUri, setOauthRedirectUri] = useState(window.location.origin + "/admin");
  const [oauthListening, setOauthListening] = useState(false);

   // TikTok OAuth
   const [ttClientKey, setTtClientKey] = useState("");
   const [ttClientSecret, setTtClientSecret] = useState("");
   const [ttOauthListening, setTtOauthListening] = useState(false);

   // Twitter/X OAuth
   const [xClientId, setXClientId] = useState("");
   const [xClientSecret, setXClientSecret] = useState("");

   // Reddit OAuth
   const [redditClientId, setRedditClientId] = useState("");
   const [redditClientSecret, setRedditClientSecret] = useState("");

   // Telegram
   const [telegramBotToken, setTelegramBotToken] = useState("");

   // Snapchat OAuth
   const [snapClientId, setSnapClientId] = useState("");
   const [snapClientSecret, setSnapClientSecret] = useState("");

   // Threads (Meta) OAuth
   const [threadsAppId, setThreadsAppId] = useState("");
   const [threadsAppSecret, setThreadsAppSecret] = useState("");

   // WhatsApp Business
   const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
   const [waAccessToken, setWaAccessToken] = useState("");
   const [waBusinessId, setWaBusinessId] = useState("");

   // Signal
   const [signalApiUrl, setSignalApiUrl] = useState("");
   const [signalPhoneNumber, setSignalPhoneNumber] = useState("");

   // YouTube OAuth
   const [ytClientId, setYtClientId] = useState("");
   const [ytClientSecret, setYtClientSecret] = useState("");

   // Pinterest OAuth
   const [pinAppId, setPinAppId] = useState("");
   const [pinAppSecret, setPinAppSecret] = useState("");

   // Discord Bot
   const [discordBotToken, setDiscordBotToken] = useState("");

   // Facebook OAuth
   const [fbAppId, setFbAppId] = useState("");
   const [fbAppSecret, setFbAppSecret] = useState("");

   // Automated connect loading
   const [autoConnectLoading, setAutoConnectLoading] = useState<string | null>(null);

   // Session cookie management
   const [igSessionId, setIgSessionId] = useState("");
   const [igCsrfToken, setIgCsrfToken] = useState("");
   const [igDsUserId, setIgDsUserId] = useState("");
   const [igSessionSavedAt, setIgSessionSavedAt] = useState<string | null>(null);
   const [igSessionLoading, setIgSessionLoading] = useState(false);
   const [igSessionStatus, setIgSessionStatus] = useState<"unknown" | "valid" | "expired">("unknown");
   const [igSessionPulse, setIgSessionPulse] = useState(false);
   const [highlightTiktok, setHighlightTiktok] = useState(false);
   const [highlightInstagram, setHighlightInstagram] = useState(false);
   const [highlightThreads, setHighlightThreads] = useState(false);
   const [highlightFacebook, setHighlightFacebook] = useState(false);

   // Navigate to connect tab and pulse the session card
   const navigateToSessionCard = () => {
     setActiveSubTab("connect");
     setIgSessionPulse(true);
      // No scrollIntoView to avoid triggering scrollbar visibility
     setTimeout(() => setIgSessionPulse(false), 3000);
   };

   // Generic: navigate to connect tab and highlight a specific platform card
   const navigateToPlatformConnect = (platform: string) => {
     setPlatformTab("connect");
     const setters: Record<string, (v: boolean) => void> = {
       tiktok: setHighlightTiktok,
       instagram: setHighlightInstagram,
       threads: setHighlightThreads,
       facebook: setHighlightFacebook,
     };
     const setter = setters[platform];
     if (setter) setter(true);
      // No scrollIntoView to avoid triggering scrollbar visibility
     // 3 pulses × 1.2s = ~3.6s
     if (setter) setTimeout(() => setter(false), 4000);
   };

   const navigateToTiktokConnect = () => navigateToPlatformConnect("tiktok");

  // Track if auto-sync has already run this session
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => {
    if (selectedAccount) {
      loadData();
      loadAutoRespondState();
    }
  }, [selectedAccount]);

  // Restore profile data and session from stored connection metadata on session load
  useEffect(() => {
    if (connections.length > 0) {
      const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
      const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
      if (igConn?.metadata && !igProfile) {
        const meta = igConn.metadata as any;
        if (meta.profile_picture_url || meta.name) {
          setIgProfile({
            profile_picture_url: meta.profile_picture_url,
            name: meta.name,
            username: igConn.platform_username,
            followers_count: meta.followers_count,
            media_count: meta.media_count,
          });
        }
      }
      // Load session cookie data from IG connection metadata
      if (igConn?.metadata) {
        const meta = igConn.metadata as any;
        // Only load actual session cookies, NOT OAuth tokens
        const sessionValue = meta.ig_session_id;
        // Check if the stored ig_session_id is actually an OAuth token (shouldn't be used as cookie)
        const isOAuthToken = sessionValue && (sessionValue.startsWith("IGQV") || sessionValue.startsWith("IGQ"));
        const realSession = isOAuthToken ? "" : (sessionValue || "");
        if (realSession) setIgSessionId(realSession);
        if (meta.ig_csrf_token) setIgCsrfToken(meta.ig_csrf_token);
        if (meta.ig_ds_user_id) setIgDsUserId(meta.ig_ds_user_id);
        if (meta.ig_session_saved_at && realSession) setIgSessionSavedAt(meta.ig_session_saved_at);
        if (realSession) {
          setIgSessionStatus("valid");
        } else if (meta.ig_session_source === "oauth_token" || meta.ig_access_token) {
          // OAuth connected but no session cookie — show as "oauth" status
          setIgSessionStatus("unknown");
        }
      }
      if (ttConn?.metadata && !ttProfile) {
        const meta = ttConn.metadata as any;
        if (meta.avatar_url || meta.display_name) {
          setTtProfile({
            avatar_url: meta.avatar_url,
            display_name: meta.display_name,
            username: ttConn.platform_username,
          });
        }
      }
    }
  }, [connections]);

  // Auto-sync profiles on page load (once per session, silently in background)
  useEffect(() => {
    if (autoSyncDone || !selectedAccount || connections.length === 0) return;
    const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
    const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
    const threadsConn = connections.find(c => c.platform === "threads" && c.is_connected);
    if (!igConn && !ttConn && !threadsConn) return;
    
    setAutoSyncDone(true);
    const syncSilently = async () => {
      // Instagram
      try {
        if (igConn) {
          const { data } = await supabase.functions.invoke("instagram-api", { 
            body: { action: "get_profile", account_id: selectedAccount } 
          });
          if (data?.success && data.data) {
            setIgProfile(data.data);
            await supabase.from("social_connections").update({
              metadata: { 
                profile_picture_url: data.data.profile_picture_url, 
                name: data.data.name, 
                followers_count: data.data.followers_count, 
                follows_count: data.data.follows_count,
                media_count: data.data.media_count, 
                connected_via: "social_hub",
                auto_synced_at: new Date().toISOString(),
              },
            }).eq("account_id", selectedAccount).eq("platform", "instagram");
            await supabase.from("managed_accounts").update({
              subscriber_count: data.data.followers_count || 0,
              content_count: data.data.media_count || 0,
              last_activity_at: new Date().toISOString(),
            }).eq("id", selectedAccount);
          }
        }
      } catch (e) { console.error("Auto-sync IG:", e); }
      // TikTok
      try {
        if (ttConn) {
          const { data } = await supabase.functions.invoke("tiktok-api", { 
            body: { action: "get_user_info", account_id: selectedAccount } 
          });
          const ttUser = data?.data?.data?.user || data?.data?.user;
          if (ttUser) {
            setTtProfile(ttUser);
            await supabase.from("social_connections").update({
              metadata: { 
                avatar_url: ttUser.avatar_url, 
                display_name: ttUser.display_name, 
                connected_via: "social_hub",
                auto_synced_at: new Date().toISOString(),
              },
            }).eq("account_id", selectedAccount).eq("platform", "tiktok");
          }
        }
      } catch (e) { console.error("Auto-sync TT:", e); }
      // Threads
      try {
        if (threadsConn) {
          const { data, error: fnErr } = await supabase.functions.invoke("threads-api", { 
            body: { action: "get_profile", account_id: selectedAccount } 
          });
          if (!fnErr && data?.success && data.data) {
            const tp = data.data;
            await supabase.from("social_connections").update({
              platform_username: tp.username || threadsConn.platform_username,
              metadata: { 
                name: tp.name,
                username: tp.username,
                threads_profile_picture_url: tp.threads_profile_picture_url,
                profile_picture_url: tp.threads_profile_picture_url,
                threads_biography: tp.threads_biography,
                is_verified: tp.is_verified,
                connected_via: "social_hub",
                auto_synced_at: new Date().toISOString(),
              },
            }).eq("account_id", selectedAccount).eq("platform", "threads");
            await supabase.from("managed_accounts").update({
              avatar_url: tp.threads_profile_picture_url || undefined,
              display_name: tp.name || tp.username || undefined,
              bio: tp.threads_biography || undefined,
              last_activity_at: new Date().toISOString(),
            }).eq("id", selectedAccount);
          }
        }
      } catch (e) { console.error("Auto-sync Threads:", e); }
    };
    syncSilently();
  }, [connections, selectedAccount, autoSyncDone]);

  // Real-time sync for social_connections (instant UI update on connect/disconnect)
  useEffect(() => {
    if (!selectedAccount) return;
    const channel = supabase
      .channel(`social-connections-rt-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections", filter: `account_id=eq.${selectedAccount}` }, async () => {
        // Invalidate cache and force fresh load
        invalidateNamespace(selectedAccount, "social_connections");
        const { data: freshConns } = await supabase.from("social_connections").select("*").eq("account_id", selectedAccount);
        setConnections(freshConns || []);
        setAutoSyncDone(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  // Real-time sync for auto_respond_state
  useEffect(() => {
    if (!selectedAccount) return;
    const channel = supabase
      .channel(`auto-respond-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_respond_state", filter: `account_id=eq.${selectedAccount}` }, (payload: any) => {
        if (payload.new) {
          setAutoRespondActive(payload.new.is_active);
          setAiDmRedirectUrl(payload.new.redirect_url || "");
          setAiDmKeywords(payload.new.trigger_keywords || "");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const loadAccounts = async () => {
    const uid = user?.id;
    if (!uid) return;
    const data = await cachedFetch("global", `smh_accounts_${uid}`, async () => {
      const { data } = await supabase.from("managed_accounts").select("id, username, display_name, avatar_url").eq("user_id", uid).order("created_at", { ascending: false });
      return data || [];
    }, undefined, { ttlMs: 5 * 60 * 1000 });
    setAccounts(data);
    if (data?.length) {
      const currentExists = data.some((a: any) => a.id === selectedAccount);
      if (!selectedAccount || !currentExists) {
        setSelectedAccount(data[0].id);
      }
    }
  };

  const loadData = async (overrideAccountId?: string) => {
    const acctId = overrideAccountId || selectedAccount;
    if (!acctId) return;
    setLoading(true);
    const [connsData, socialPostsData, linksData, statsData, repliesData] = await Promise.all([
      cachedFetch(acctId, "social_connections", async () => {
        const { data } = await supabase.from("social_connections").select("*").eq("account_id", acctId);
        return data || [];
      }, undefined, { ttlMs: 3 * 60 * 1000 }),
      cachedFetch(acctId, "social_posts", async () => {
        const { data } = await supabase.from("social_posts").select("*").eq("account_id", acctId).order("created_at", { ascending: false }).limit(50);
        return data || [];
      }, undefined, { ttlMs: 2 * 60 * 1000 }),
      cachedFetch(acctId, "bio_links", async () => {
        const { data } = await supabase.from("bio_links").select("*").eq("account_id", acctId).order("created_at", { ascending: false });
        return data || [];
      }, undefined, { ttlMs: 5 * 60 * 1000 }),
      cachedFetch(acctId, "social_analytics", async () => {
        const { data } = await supabase.from("social_analytics").select("*").eq("account_id", acctId).order("fetched_at", { ascending: false }).limit(50);
        return data || [];
      }, undefined, { ttlMs: 2 * 60 * 1000 }),
      cachedFetch(acctId, "social_comment_replies", async () => {
        const { data } = await supabase.from("social_comment_replies").select("*").eq("account_id", acctId).order("created_at", { ascending: false }).limit(50);
        return data || [];
      }, undefined, { ttlMs: 2 * 60 * 1000 }),
    ]);
    setConnections(connsData);
    setPosts(socialPostsData);
    setBioLinks(linksData);
    setAnalytics(statsData);
    setCommentReplies(repliesData);
    setLoading(false);
  };

  const loadAutoRespondState = async () => {
    const { data } = await supabase.from("auto_respond_state").select("*").eq("account_id", selectedAccount).maybeSingle();
    if (data) {
      setAutoRespondActive(data.is_active);
      setAiDmRedirectUrl(data.redirect_url || "");
      setAiDmKeywords(data.trigger_keywords || "");
    } else {
      setAutoRespondActive(false);
    }
  };

  const toggleAutoRespond = async () => {
    setAutoRespondLoading(true);
    const newState = !autoRespondActive;
    const { error } = await supabase.from("auto_respond_state").upsert({
      account_id: selectedAccount,
      is_active: newState,
      redirect_url: aiDmRedirectUrl || null,
      trigger_keywords: aiDmKeywords || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" });
    if (error) toast.error(error.message);
    else {
      setAutoRespondActive(newState);
      toast.success(newState ? "Auto-respond ACTIVE — AI is now answering DMs" : "Auto-respond PAUSED");
    }
    setAutoRespondLoading(false);
  };

  const saveAutoRespondConfig = async () => {
    const { error } = await supabase.from("auto_respond_state").upsert({
      account_id: selectedAccount,
      is_active: autoRespondActive,
      redirect_url: aiDmRedirectUrl || null,
      trigger_keywords: aiDmKeywords || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" });
    if (error) toast.error(error.message);
    else toast.success("Config saved");
  };

  const callApi = async (funcName: string, body: any, overrideAccountId?: string) => {
    const acctId = overrideAccountId || selectedAccount;
    if (!acctId) { toast.error("No account selected"); return null; }
    setApiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(funcName, { body: { ...body, account_id: acctId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      // Auto-redirect to session tab if private API feature needs session cookie
      if (data.data?.needs_session) {
        toast.info("This feature requires a session cookie. Redirecting to connection setup…");
        navigateToSessionCard();
        return null;
      }
      return data.data;
    } catch (e: any) {
      toast.error(e.message || "API error");
      return null;
    } finally {
      setApiLoading(false);
    }
  };

  const connectPlatform = async () => {
    if (!connectForm.access_token || !connectForm.platform_username) { toast.error("Fill in username and access token"); return; }
    
    // Auto-create managed account if none selected or none exist
    let accountId = selectedAccount;
    if (!accountId) {
      const { data: newAccount, error: createErr } = await supabase.from("managed_accounts").insert({
        username: connectForm.platform_username,
        display_name: connectForm.platform_username,
        platform: connectForm.platform,
        status: "active",
        user_id: user?.id,
      }).select("id").single();
      if (createErr || !newAccount) { toast.error(createErr?.message || "Failed to create account"); return; }
      accountId = newAccount.id;
      setSelectedAccount(accountId);
      await loadAccounts();
      toast.success(`Account @${connectForm.platform_username} created`);
    }

    const { error } = await supabase.from("social_connections").upsert({
      account_id: accountId, platform: connectForm.platform, platform_user_id: connectForm.platform_user_id,
      platform_username: connectForm.platform_username, access_token: connectForm.access_token,
      refresh_token: connectForm.refresh_token || null, is_connected: true, scopes: [],
      metadata: { connected_via: "social_hub", connected_at_readable: new Date().toLocaleString() },
      user_id: user?.id,
    }, { onConflict: "account_id,platform,user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(`${connectForm.platform} connected!`);
    setSelectedAccount(accountId);
    await loadData(accountId);
    const savedForm = { ...connectForm };
    setConnectForm({ platform: "instagram", platform_user_id: "", platform_username: "", access_token: "", refresh_token: "" });
    // Auto-fetch profile to get avatar & sync to managed_accounts
    try {
      if (savedForm.platform === "instagram") {
        const profileData = await callApi("instagram-api", { action: "get_profile" }, accountId);
        if (profileData) {
          setIgProfile(profileData);
          await supabase.from("social_connections").update({
            metadata: { profile_picture_url: profileData.profile_picture_url, name: profileData.name, followers_count: profileData.followers_count, media_count: profileData.media_count, connected_via: "social_hub" },
          }).eq("account_id", accountId).eq("platform", "instagram");
          await supabase.from("managed_accounts").update({
            avatar_url: profileData.profile_picture_url || undefined,
            display_name: profileData.name || savedForm.platform_username,
            subscriber_count: profileData.followers_count || 0,
            content_count: profileData.media_count || 0,
            social_links: { instagram: `https://instagram.com/${profileData.username}`, ig_user_id: savedForm.platform_user_id },
            last_activity_at: new Date().toISOString(),
          }).eq("id", accountId);
          await loadAccounts();
          await loadData(accountId);
        }
      }
    } catch (e) { console.error("Auto-sync after connect:", e); }
  };

  const disconnectPlatform = async (id: string) => {
    const conn = connections.find(c => c.id === id);
    const platform = conn?.platform;
    
    // Revoke token on platform side before deleting
    if (platform === "tiktok" && conn?.access_token) {
      try {
        await supabase.functions.invoke("tiktok-api", {
          body: { action: "revoke_token", account_id: selectedAccount, params: { client_key: ttClientKey } },
        });
      } catch (e) { console.warn("TikTok token revoke failed:", e); }
    }
    if (platform === "threads" && conn?.access_token) {
      try {
        await supabase.functions.invoke("threads-api", {
          body: { action: "refresh_token", account_id: selectedAccount },
        });
      } catch (e) { console.warn("Threads token invalidation failed:", e); }
    }
    
    const { error } = await supabase.from("social_connections").delete().eq("id", id);
    if (error) { toast.error("Failed to disconnect: " + error.message); return; }
    
    // DM data is preserved in DB (tagged by platform_user_id per platform) — NOT deleted on disconnect
    // It will only be loaded when the same platform account reconnects (IG, TikTok, Threads, Facebook)
    console.log(`Disconnected ${platform} for account ${conn?.account_id} — DM data preserved in DB (platform_user_id: ${conn?.platform_user_id})`);
    
    // Immediately remove from local state for instant UI update
    setConnections(prev => prev.filter(c => c.id !== id));
    
    // Clear ALL local profile state for the disconnected platform
    if (platform === "instagram") setIgProfile(null);
    if (platform === "tiktok") setTtProfile(null);
    
    // Reset sync flag so remaining platforms can re-sync
    setAutoSyncDone(false);
    
    // Nuke entire account cache to prevent any stale data
    if (selectedAccount) {
      invalidateAccount(selectedAccount);
    }
    invalidateNamespace("global", "smh_accounts");
    
    // Force fresh DB fetch (bypass cache entirely)
    const acctId = selectedAccount;
    if (acctId) {
      const { data: freshConns } = await supabase.from("social_connections").select("*").eq("account_id", acctId);
      setConnections(freshConns || []);
    }
    
    toast.success("Disconnected & credentials wiped");
  };

  // ===== AUTOMATED ONE-CLICK CONNECT =====
  const automatedInstagramConnect = () => {
    if (!oauthAppId) { toast.error("Enter your Meta App ID first"); return; }
    const scopes = [
      "instagram_basic", "instagram_manage_messages", "instagram_manage_comments",
      "instagram_manage_insights", "instagram_content_publish", "pages_show_list",
      "pages_read_engagement", "business_management", "ads_read", "ads_management",
      "instagram_shopping_tag_products", "instagram_manage_upcoming_events",
      "instagram_branded_content_ads_brand", "instagram_branded_content_brand",
      "catalog_management", "email", "public_profile",
    ].join(",");
    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${oauthAppId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&scope=${scopes}&response_type=token`;
    const authWindow = window.open(authUrl, "meta_oauth", "width=600,height=700,scrollbars=yes");
    setAutoConnectLoading("instagram");
    toast.info("Authenticate in the popup window...");

    const interval = setInterval(async () => {
      try {
        if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
        const url = authWindow.location.href;
        if (url.includes("access_token=")) {
          const hash = authWindow.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const token = params.get("access_token");
          authWindow.close();
          clearInterval(interval);
          if (!token) { setAutoConnectLoading(null); toast.error("No token received"); return; }
          toast.info("Token captured! Fetching profile...");
          try {
            const profileRes = await fetch(`https://graph.instagram.com/v24.0/me?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count&access_token=${token}`);
            let profileData = await profileRes.json();
            if (profileData.error) {
              const pagesRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${token}`);
              const pagesData = await pagesRes.json();
              const igAccount = pagesData.data?.find((p: any) => p.instagram_business_account)?.instagram_business_account;
              if (igAccount) profileData = igAccount;
              else { toast.error("No Instagram Business account found"); setAutoConnectLoading(null); return; }
            }
            const username = profileData.username || profileData.name || "instagram_user";
            const userId = profileData.id || "";
            let accountId = selectedAccount;
            if (!accountId) {
              const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({
                username, display_name: profileData.name || username, platform: "instagram", status: "active",
                avatar_url: profileData.profile_picture_url || null, subscriber_count: profileData.followers_count || 0, content_count: profileData.media_count || 0, user_id: user?.id,
              }).select("id").single();
              if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
              accountId = newAcct.id; setSelectedAccount(accountId);
            }
            // DM data is preserved — platform_user_id filtering handles isolation
            const { data: existingConn2 } = await supabase.from("social_connections").select("platform_user_id").eq("account_id", accountId).eq("platform", "instagram").maybeSingle();
            if (existingConn2?.platform_user_id && existingConn2.platform_user_id !== userId) {
              console.log(`IG account changed (legacy flow): ${existingConn2.platform_user_id} → ${userId} — old DM data preserved, will load only matching`);
            }
            await supabase.from("social_connections").upsert({
              account_id: accountId, platform: "instagram", platform_user_id: userId, platform_username: username, access_token: token, is_connected: true, scopes: [],
              metadata: { profile_picture_url: profileData.profile_picture_url, name: profileData.name, followers_count: profileData.followers_count, media_count: profileData.media_count, connected_via: "automated_oauth" },
              user_id: user?.id,
            }, { onConflict: "account_id,platform,user_id" });
            await supabase.from("managed_accounts").update({
              username, avatar_url: profileData.profile_picture_url || undefined, display_name: profileData.name || username,
              subscriber_count: profileData.followers_count || 0, content_count: profileData.media_count || 0,
              social_links: { instagram: `https://instagram.com/${username}`, ig_user_id: userId }, last_activity_at: new Date().toISOString(),
            }).eq("id", accountId);
            setIgProfile(profileData);
            await loadAccounts(); await loadData(accountId);
            toast.success(`✅ @${username} connected automatically!`);
          } catch (e: any) { toast.error("Profile fetch failed: " + e.message); }
          setAutoConnectLoading(null);
        }
      } catch { /* cross-origin polling */ }
    }, 500);
  };

   const automatedTikTokConnect = () => {
     if (!ttClientKey) { toast.error("Enter your TikTok Client Key first"); return; }
     if (!ttClientSecret) { toast.error("Enter your TikTok Client Secret first"); return; }
     const csrfState = Math.random().toString(36).substring(2);
     sessionStorage.setItem("tt_csrf", csrfState);
     const ttRedirectUri = "https://uplyze.ai/tt-login";
     const scopes = "user.info.basic,user.info.profile,user.info.stats,video.list,video.publish,video.upload";
     const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${ttClientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(ttRedirectUri)}&state=${csrfState}`;
     const authWindow = window.open(authUrl, "tiktok_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("tiktok");
     toast.info("Authenticate with TikTok in the popup...");

     const handleTTMessage = async (event: MessageEvent) => {
       if (event.data?.type !== "TT_OAUTH_RESULT") return;
       window.removeEventListener("message", handleTTMessage);
       const { code, redirect_uri } = event.data.payload;
       if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
       toast.info("Auth code captured! Exchanging for token...");
       try {
         const { data, error } = await supabase.functions.invoke("tiktok-api", {
           body: { action: "exchange_code", params: { code, client_key: ttClientKey, client_secret: ttClientSecret, redirect_uri: redirect_uri || ttRedirectUri } },
         });
         if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
         const tokenData = data.data;
         const accessToken = tokenData?.access_token;
         const openId = tokenData?.open_id;
         if (!accessToken) { toast.error("No access token in response"); setAutoConnectLoading(null); return; }
         toast.info("Fetching TikTok profile...");
         const profileRes = await supabase.functions.invoke("tiktok-api", {
           body: { action: "get_user_info", account_id: selectedAccount || "temp", params: { access_token_override: accessToken } },
         });
         const ttUser = profileRes.data?.data?.data?.user || profileRes.data?.data?.user || {};
         const username = ttUser.username || ttUser.display_name || "tiktok_user";
         let accountId = selectedAccount;
         if (!accountId) {
           const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({
              username, display_name: ttUser.display_name || username, platform: "tiktok", status: "active", avatar_url: ttUser.avatar_url || null, user_id: user?.id,
            }).select("id").single();
           if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
           accountId = newAcct.id; setSelectedAccount(accountId);
         }
         await supabase.from("social_connections").upsert({
           account_id: accountId, platform: "tiktok", platform_user_id: openId || "", platform_username: username, access_token: accessToken,
           refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
           metadata: { avatar_url: ttUser.avatar_url, display_name: ttUser.display_name, connected_via: "automated_oauth" },
           user_id: user?.id,
         }, { onConflict: "account_id,platform,user_id" });
         await supabase.from("managed_accounts").update({
           avatar_url: ttUser.avatar_url || undefined, display_name: ttUser.display_name || username, last_activity_at: new Date().toISOString(),
         }).eq("id", accountId);
         setTtProfile(ttUser); await loadAccounts(); await loadData(accountId);
         toast.success(`✅ @${username} TikTok connected automatically!`);
       } catch (err: any) { toast.error(err.message || "TikTok connection failed"); }
       setAutoConnectLoading(null);
     };
     window.addEventListener("message", handleTTMessage);

     // Fallback: detect window closed without message
     const closeCheck = setInterval(() => {
       if (authWindow && authWindow.closed) {
         clearInterval(closeCheck);
         // Give a moment for postMessage to arrive
         setTimeout(() => { if (autoConnectLoading === "tiktok") setAutoConnectLoading(null); }, 2000);
       }
     }, 1000);
    };

   // ===== AUTOMATED TWITTER/X CONNECT =====
   const automatedTwitterConnect = () => {
     if (!xClientId) { toast.error("Enter your X/Twitter Client ID first"); return; }
     const codeVerifier = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
     sessionStorage.setItem("x_code_verifier", codeVerifier);
     const state = Math.random().toString(36).substring(2);
     sessionStorage.setItem("x_csrf", state);
     const scopes = "tweet.read tweet.write users.read follows.read follows.write offline.access like.read like.write";
     const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${xClientId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeVerifier}&code_challenge_method=plain`;
     const authWindow = window.open(authUrl, "x_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("twitter");
     toast.info("Authenticate with X/Twitter in the popup...");

     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("code=")) {
           const urlParams = new URL(url).searchParams;
           const code = urlParams.get("code");
           authWindow.close(); clearInterval(interval);
           if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
           toast.info("Auth code captured! Exchanging for token...");
           const storedVerifier = sessionStorage.getItem("x_code_verifier") || codeVerifier;
           const { data, error } = await supabase.functions.invoke("twitter-api", {
             body: { action: "exchange_code", params: { code, client_id: xClientId, client_secret: xClientSecret, redirect_uri: oauthRedirectUri, code_verifier: storedVerifier } },
           });
           if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
           const tokenData = data.data;
           const accessToken = tokenData?.access_token;
           if (!accessToken) { toast.error("No access token in response"); setAutoConnectLoading(null); return; }
           toast.info("Fetching X profile...");
           const profileRes = await fetch(`https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,public_metrics`, {
             headers: { "Authorization": `Bearer ${accessToken}` },
           });
           const profileJson = await profileRes.json();
           const xUser = profileJson.data || {};
           const username = xUser.username || "x_user";
           let accountId = selectedAccount;
           if (!accountId) {
              const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({
                username, display_name: xUser.name || username, platform: "twitter", status: "active", avatar_url: xUser.profile_image_url || null, user_id: user?.id,
              }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
            await supabase.from("social_connections").upsert({
              account_id: accountId, platform: "twitter", platform_user_id: xUser.id || "", platform_username: username, access_token: accessToken,
              refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
              metadata: { profile_image_url: xUser.profile_image_url, name: xUser.name, public_metrics: xUser.public_metrics, connected_via: "automated_oauth" },
              user_id: user?.id,
            }, { onConflict: "account_id,platform,user_id" });
           setXProfile(xUser); await loadAccounts(); await loadData(accountId);
           toast.success(`✅ @${username} X/Twitter connected!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin polling */ }
     }, 500);
   };

   // ===== AUTOMATED REDDIT CONNECT =====
   const automatedRedditConnect = () => {
     if (!redditClientId) { toast.error("Enter your Reddit App ID first"); return; }
     const state = Math.random().toString(36).substring(2);
     sessionStorage.setItem("reddit_csrf", state);
     const scopes = "identity edit flair history modconfig modflair modlog modposts modwiki mysubreddits privatemessages read report save submit subscribe vote wikiedit wikiread";
     const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${redditClientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&duration=permanent&scope=${encodeURIComponent(scopes)}`;
     const authWindow = window.open(authUrl, "reddit_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("reddit");
     toast.info("Authenticate with Reddit in the popup...");

     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("code=")) {
           const urlParams = new URL(url).searchParams;
           const code = urlParams.get("code");
           authWindow.close(); clearInterval(interval);
           if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
           toast.info("Auth code captured! Exchanging for token...");
           const { data, error } = await supabase.functions.invoke("reddit-api", {
             body: { action: "exchange_code", params: { code, client_id: redditClientId, client_secret: redditClientSecret, redirect_uri: oauthRedirectUri } },
           });
           if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
           const tokenData = data.data;
           const accessToken = tokenData?.access_token;
           if (!accessToken) { toast.error("No access token in response"); setAutoConnectLoading(null); return; }
           toast.info("Fetching Reddit profile...");
            const profileRes = await fetch("https://oauth.reddit.com/api/v1/me", {
              headers: { "Authorization": `Bearer ${accessToken}`, "User-Agent": "Uplyze-Hub/1.0" },
            });
           const redditUser = await profileRes.json();
           const username = redditUser.name || "reddit_user";
           let accountId = selectedAccount;
           if (!accountId) {
              const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({
                username, display_name: username, platform: "reddit", status: "active", avatar_url: redditUser.icon_img || null, user_id: user?.id,
              }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
            await supabase.from("social_connections").upsert({
              account_id: accountId, platform: "reddit", platform_user_id: redditUser.id || "", platform_username: username, access_token: accessToken,
              refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
              metadata: { icon_img: redditUser.icon_img, link_karma: redditUser.link_karma, comment_karma: redditUser.comment_karma, connected_via: "automated_oauth" },
              user_id: user?.id,
            }, { onConflict: "account_id,platform,user_id" });
           setRedditProfile(redditUser); await loadAccounts(); await loadData(accountId);
           toast.success(`✅ u/${username} Reddit connected!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin polling */ }
     }, 500);
   };

   // ===== AUTOMATED TELEGRAM CONNECT (Bot Token) =====
   const automatedTelegramConnect = async () => {
     if (!telegramBotToken) { toast.error("Enter your Telegram Bot Token first"); return; }
     setAutoConnectLoading("telegram");
     try {
       const { data, error } = await supabase.functions.invoke("telegram-api", {
         body: { action: "validate_token", params: { bot_token: telegramBotToken } },
       });
       if (error || !data?.success) { toast.error(data?.error || error?.message || "Invalid bot token"); setAutoConnectLoading(null); return; }
       const botInfo = data.data;
       const username = botInfo.username || "telegram_bot";
       let accountId = selectedAccount;
       if (!accountId) {
          const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({
            username, display_name: botInfo.first_name || username, platform: "telegram", status: "active", user_id: user?.id,
          }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
        await supabase.from("social_connections").upsert({
          account_id: accountId, platform: "telegram", platform_user_id: String(botInfo.id), platform_username: username, access_token: telegramBotToken,
          is_connected: true, scopes: [],
          metadata: { first_name: botInfo.first_name, is_bot: botInfo.is_bot, can_join_groups: botInfo.can_join_groups, connected_via: "automated_bot_token" },
          user_id: user?.id,
        }, { onConflict: "account_id,platform,user_id" });
       setTelegramProfile(botInfo); await loadAccounts(); await loadData(accountId);
       toast.success(`✅ @${username} Telegram bot connected!`);
     } catch (e: any) { toast.error(e.message); }
     setAutoConnectLoading(null);
   };


   // ===== AUTOMATED SNAPCHAT CONNECT =====
   const automatedSnapchatConnect = () => {
     if (!snapClientId) { toast.error("Enter your Snapchat Client ID first"); return; }
     const state = Math.random().toString(36).substring(2);
     const scopes = "snapchat-marketing-api";
     const authUrl = `https://accounts.snapchat.com/login/oauth2/authorize?client_id=${snapClientId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;
     const authWindow = window.open(authUrl, "snap_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("snapchat");
     toast.info("Authenticate with Snapchat in the popup...");
     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("code=")) {
           const urlParams = new URL(url).searchParams;
           const code = urlParams.get("code");
           authWindow.close(); clearInterval(interval);
           if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
           toast.info("Exchanging for token...");
           const { data, error } = await supabase.functions.invoke("snapchat-api", { body: { action: "exchange_code", params: { code, client_id: snapClientId, client_secret: snapClientSecret, redirect_uri: oauthRedirectUri } } });
           if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
           const accessToken = data.data?.access_token;
           if (!accessToken) { toast.error("No access token"); setAutoConnectLoading(null); return; }
           let accountId = selectedAccount;
           if (!accountId) {
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username: "snapchat_user", display_name: "Snapchat", platform: "snapchat", status: "active", user_id: user?.id }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "snapchat", platform_user_id: "", platform_username: "snapchat_user", access_token: accessToken, refresh_token: data.data?.refresh_token || null, is_connected: true, scopes: [], metadata: { connected_via: "automated_oauth" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
           await loadAccounts(); await loadData(accountId);
           toast.success("✅ Snapchat connected!");
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin */ }
     }, 500);
   };

   // ===== AUTOMATED THREADS CONNECT =====
   const automatedThreadsConnect = async () => {
     let appId = threadsAppId || cachedThreadsAppId;
     if (!appId) {
       try {
         const { data } = await supabase.functions.invoke("threads-api", { body: { action: "get_app_id" } });
         if (data?.app_id) { appId = data.app_id; setCachedThreadsAppId(data.app_id); setThreadsAppId(data.app_id); }
       } catch {}
     }
     if (!appId) { toast.error("Configure THREADS_APP_ID in backend secrets"); return; }
     const threadsRedirectUri = "https://uplyze.ai/threads-login";
     const scopes = "threads_basic,threads_content_publish,threads_delete,threads_keyword_search,threads_location_tagging,threads_manage_insights,threads_manage_mentions,threads_manage_replies,threads_profile_discovery,threads_read_replies";
     const authUrl = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(threadsRedirectUri)}&scope=${scopes}&response_type=code`;
     const w = 520, h = 620;
     const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
     const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
     const popup = window.open(authUrl, "threads_login_popup", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
     if (!popup) { toast.info("Popup blocked — opening in current tab."); window.location.href = authUrl; return; }
     setAutoConnectLoading("threads");
     toast.info("Authenticate with Threads in the popup...");

     const handleThreadsMessage = async (event: MessageEvent) => {
       if (event.data?.type !== "THREADS_OAUTH_RESULT") return;
       window.removeEventListener("message", handleThreadsMessage);
       const { code, redirect_uri } = event.data.payload;
       if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
       toast.info("Auth code captured! Exchanging for token...");
       try {
         const { data, error } = await supabase.functions.invoke("threads-api", { body: { action: "exchange_code", params: { code, client_id: appId, client_secret: threadsAppSecret || undefined, redirect_uri: redirect_uri || threadsRedirectUri } } });
         if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
         const accessToken = data.data?.access_token;
         if (!accessToken) { toast.error("No access token in response"); setAutoConnectLoading(null); return; }
          toast.info("Fetching Threads profile...");
          const profileRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography,is_verified&access_token=${accessToken}`);
          const profile = await profileRes.json();
          const username = profile.username || "threads_user";
          const threadsProfilePic = profile.threads_profile_picture_url || null;
          let accountId = selectedAccount;
          if (!accountId) {
            const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.name || username, platform: "threads", status: "active", avatar_url: threadsProfilePic, bio: profile.threads_biography || null, user_id: user?.id }).select("id").single();
            if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
            accountId = newAcct.id; setSelectedAccount(accountId);
          }
          await supabase.from("social_connections").upsert({ account_id: accountId, platform: "threads", platform_user_id: profile.id || "", platform_username: username, access_token: accessToken, is_connected: true, scopes: [], metadata: { name: profile.name, username: profile.username, threads_profile_picture_url: threadsProfilePic, profile_picture_url: threadsProfilePic, threads_biography: profile.threads_biography, is_verified: profile.is_verified, connected_via: "threads_oauth_popup" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
          await supabase.from("managed_accounts").update({ avatar_url: threadsProfilePic || undefined, display_name: profile.name || username, bio: profile.threads_biography || undefined, last_activity_at: new Date().toISOString() }).eq("id", accountId);
          // Invalidate cache so fresh data loads
          if (accountId) invalidateAccount(accountId);
          invalidateNamespace("global", "smh_accounts");
          setAutoSyncDone(false);
          await loadAccounts(); await loadData(accountId);
         toast.success(`✅ @${username} Threads connected!`);
       } catch (err: any) { toast.error(err.message || "Threads connection failed"); }
       setAutoConnectLoading(null);
     };
     window.addEventListener("message", handleThreadsMessage);
     const check = setInterval(() => {
       try {
         if (popup.closed) { clearInterval(check); setAutoConnectLoading(null); window.removeEventListener("message", handleThreadsMessage); }
       } catch {}
     }, 500);
   };

   // ===== AUTOMATED WHATSAPP CONNECT =====
   const automatedWhatsAppConnect = async () => {
     if (!waAccessToken || !waPhoneNumberId) { toast.error("Enter Phone Number ID and Access Token"); return; }
     setAutoConnectLoading("whatsapp");
     try {
       const profileRes = await fetch(`https://graph.facebook.com/v24.0/${waPhoneNumberId}?fields=verified_name,display_phone_number,quality_rating&access_token=${waAccessToken}`);
       const profile = await profileRes.json();
       if (profile.error) throw new Error(profile.error.message);
       const username = profile.display_phone_number || waPhoneNumberId;
       let accountId = selectedAccount;
       if (!accountId) {
         const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.verified_name || username, platform: "whatsapp", status: "active", user_id: user?.id }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({ account_id: accountId, platform: "whatsapp", platform_user_id: waPhoneNumberId, platform_username: username, access_token: waAccessToken, is_connected: true, scopes: [], metadata: { verified_name: profile.verified_name, display_phone_number: profile.display_phone_number, quality_rating: profile.quality_rating, waba_id: waBusinessId, connected_via: "automated_token" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
       await loadAccounts(); await loadData(accountId);
       toast.success(`✅ WhatsApp ${profile.verified_name || username} connected!`);
     } catch (e: any) { toast.error(e.message); }
     setAutoConnectLoading(null);
   };

   // ===== AUTOMATED SIGNAL CONNECT =====
   const automatedSignalConnect = async () => {
     if (!signalApiUrl || !signalPhoneNumber) { toast.error("Enter Signal API URL and phone number"); return; }
     setAutoConnectLoading("signal");
     try {
       let accountId = selectedAccount;
       if (!accountId) {
         const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username: signalPhoneNumber, display_name: signalPhoneNumber, platform: "signal", status: "active", user_id: user?.id }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({ account_id: accountId, platform: "signal", platform_user_id: signalPhoneNumber, platform_username: signalPhoneNumber, access_token: signalApiUrl, is_connected: true, scopes: [], metadata: { api_url: signalApiUrl, phone_number: signalPhoneNumber, connected_via: "automated_api" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
       await loadAccounts(); await loadData(accountId);
       toast.success(`✅ Signal ${signalPhoneNumber} connected!`);
     } catch (e: any) { toast.error(e.message); }
     setAutoConnectLoading(null);
   };

   // ===== AUTOMATED YOUTUBE CONNECT =====
   const automatedYouTubeConnect = () => {
     if (!ytClientId) { toast.error("Enter your YouTube/Google Client ID first"); return; }
     const scopes = "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly";
     const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${ytClientId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&state=${Math.random().toString(36).substring(2)}&prompt=consent`;
     const authWindow = window.open(authUrl, "youtube_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("youtube");
     toast.info("Authenticate with Google/YouTube...");
     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("code=")) {
           const urlParams = new URL(url).searchParams;
           const code = urlParams.get("code");
           authWindow.close(); clearInterval(interval);
           if (!code) { setAutoConnectLoading(null); toast.error("No auth code"); return; }
           const { data, error } = await supabase.functions.invoke("youtube-api", { body: { action: "exchange_code", params: { code, client_id: ytClientId, client_secret: ytClientSecret, redirect_uri: oauthRedirectUri } } });
           if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); setAutoConnectLoading(null); return; }
           const accessToken = data.data?.access_token;
           if (!accessToken) { toast.error("No token"); setAutoConnectLoading(null); return; }
           const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", { headers: { Authorization: `Bearer ${accessToken}` } });
           const channelData = await channelRes.json();
           const channel = channelData.items?.[0];
           const username = channel?.snippet?.title || "youtube_user";
           let accountId = selectedAccount;
           if (!accountId) {
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: username, platform: "youtube", status: "active", avatar_url: channel?.snippet?.thumbnails?.default?.url || null, user_id: user?.id }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "youtube", platform_user_id: channel?.id || "", platform_username: username, access_token: accessToken, refresh_token: data.data?.refresh_token || null, is_connected: true, scopes: [], metadata: { title: channel?.snippet?.title, thumbnail: channel?.snippet?.thumbnails?.default?.url, subscribers: channel?.statistics?.subscriberCount, connected_via: "automated_oauth" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
           await loadAccounts(); await loadData(accountId);
           toast.success(`✅ ${username} YouTube connected!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin */ }
     }, 500);
   };

   // ===== AUTOMATED PINTEREST CONNECT =====
   const automatedPinterestConnect = () => {
     if (!pinAppId) { toast.error("Enter your Pinterest App ID first"); return; }
     const scopes = "boards:read,boards:write,pins:read,pins:write,user_accounts:read,ads:read,ads:write,catalogs:read,catalogs:write";
     const authUrl = `https://www.pinterest.com/oauth/?client_id=${pinAppId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${Math.random().toString(36).substring(2)}`;
     const authWindow = window.open(authUrl, "pinterest_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("pinterest");
     toast.info("Authenticate with Pinterest...");
     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("code=")) {
           const urlParams = new URL(url).searchParams;
           const code = urlParams.get("code");
           authWindow.close(); clearInterval(interval);
           if (!code) { setAutoConnectLoading(null); toast.error("No auth code"); return; }
           const { data, error } = await supabase.functions.invoke("pinterest-api", { body: { action: "exchange_code", params: { code, client_id: pinAppId, client_secret: pinAppSecret, redirect_uri: oauthRedirectUri } } });
           if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); setAutoConnectLoading(null); return; }
           const accessToken = data.data?.access_token;
           if (!accessToken) { toast.error("No token"); setAutoConnectLoading(null); return; }
           const profileRes = await fetch("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${accessToken}` } });
           const profile = await profileRes.json();
           const username = profile.username || "pinterest_user";
           let accountId = selectedAccount;
           if (!accountId) {
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.business_name || username, platform: "pinterest", status: "active", avatar_url: profile.profile_image || null, user_id: user?.id }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "pinterest", platform_user_id: profile.id || "", platform_username: username, access_token: accessToken, refresh_token: data.data?.refresh_token || null, is_connected: true, scopes: [], metadata: { business_name: profile.business_name, profile_image: profile.profile_image, connected_via: "automated_oauth" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
           await loadAccounts(); await loadData(accountId);
           toast.success(`✅ @${username} Pinterest connected!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin */ }
     }, 500);
   };

   // ===== AUTOMATED DISCORD CONNECT =====
   const automatedDiscordConnect = async () => {
     if (!discordBotToken) { toast.error("Enter your Discord Bot Token first"); return; }
     setAutoConnectLoading("discord");
     try {
       const resp = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bot ${discordBotToken}` } });
       const botInfo = await resp.json();
       if (botInfo.code) throw new Error(botInfo.message || "Invalid token");
       const username = botInfo.username || "discord_bot";
       let accountId = selectedAccount;
       if (!accountId) {
         const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: username, platform: "discord", status: "active", avatar_url: botInfo.avatar ? `https://cdn.discordapp.com/avatars/${botInfo.id}/${botInfo.avatar}.png` : null, user_id: user?.id }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({ account_id: accountId, platform: "discord", platform_user_id: botInfo.id || "", platform_username: username, access_token: discordBotToken, is_connected: true, scopes: [], metadata: { username: botInfo.username, discriminator: botInfo.discriminator, avatar: botInfo.avatar, connected_via: "automated_bot_token" }, user_id: user?.id }, { onConflict: "account_id,platform,user_id" });
       await loadAccounts(); await loadData(accountId);
       toast.success(`✅ ${username} Discord bot connected!`);
     } catch (e: any) { toast.error(e.message); }
     setAutoConnectLoading(null);
   };

   // ===== AUTOMATED FACEBOOK CONNECT =====
   const automatedFacebookConnect = async () => {
     let appId = fbAppId || cachedFbAppId;
     if (!appId) {
       try {
         const { data } = await supabase.functions.invoke("facebook-api", { body: { action: "get_app_id" } });
         if (data?.app_id) { appId = data.app_id; setCachedFbAppId(data.app_id); setFbAppId(data.app_id); }
       } catch {}
     }
     if (!appId) { toast.error("Configure FACEBOOK_APP_ID in backend secrets"); return; }
     const fbRedirectUri = "https://uplyze.ai/fb-login";
     const scopes = "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,pages_read_user_content,pages_messaging,publish_video,business_management";
     const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(fbRedirectUri)}&scope=${scopes}&response_type=code`;
     const w = 520, h = 620;
     const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
     const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
     const popup = window.open(authUrl, "fb_login_popup", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
     if (!popup) { toast.info("Popup blocked — opening in current tab."); window.location.href = authUrl; return; }
     setAutoConnectLoading("facebook");
     toast.info("Authenticate with Facebook in the popup...");

     const handleFbMessage = async (event: MessageEvent) => {
       if (event.data?.type !== "FB_OAUTH_RESULT") return;
       window.removeEventListener("message", handleFbMessage);
       const { code, redirect_uri } = event.data.payload;
       if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
       toast.info("Auth code captured! Exchanging for token...");
       try {
         const { data, error } = await supabase.functions.invoke("facebook-api", { body: { action: "exchange_code", params: { code, redirect_uri: redirect_uri || fbRedirectUri } } });
         if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
         const accessToken = data.data?.access_token;
         if (!accessToken) { toast.error("No access token in response"); setAutoConnectLoading(null); return; }
          toast.info("Fetching Facebook profile & pages...");
          const profileRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name,email,picture.width(200)&access_token=${accessToken}`);
          const profile = await profileRes.json();
          if (profile.error) { toast.error(profile.error.message); setAutoConnectLoading(null); return; }

          // Fetch Facebook Pages to get page access tokens (needed for IG messaging)
          let fbPages: any[] = [];
          let primaryPageToken: string | null = null;
          let primaryPageId: string | null = null;
          let primaryPageName: string | null = null;
           try {
             const pagesRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,category,fan_count,picture,instagram_business_account&limit=25&access_token=${accessToken}`);
             const pagesData = await pagesRes.json();
             if (pagesData.data && pagesData.data.length > 0) {
               fbPages = pagesData.data;
               // Try to find the page linked to the currently connected IG account
               const { data: igConn } = await supabase.from("social_connections").select("platform_user_id, platform_username").eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true).maybeSingle();
               let bestPage = fbPages[0];
               let igLinked = false;
               let igLinkedUsername = "";
               if (igConn?.platform_user_id) {
                 // Try exact IGBA match first
                 const exactMatch = fbPages.find(p => p.instagram_business_account?.id === igConn.platform_user_id);
                 if (exactMatch) { bestPage = exactMatch; igLinked = true; }
                 // If no exact match, try pages with any IG account and verify by username
                 if (!igLinked && igConn.platform_username) {
                   for (const page of fbPages.filter(p => p.instagram_business_account?.id)) {
                     try {
                       const igbaResp = await fetch(`https://graph.instagram.com/v24.0/${page.instagram_business_account.id}?fields=username&access_token=${page.access_token}`);
                       const igbaData = await igbaResp.json();
                       if (igbaData?.username?.toLowerCase() === igConn.platform_username.toLowerCase()) {
                         bestPage = page; igLinked = true; igLinkedUsername = igbaData.username;
                         break;
                       }
                     } catch {}
                   }
                 }
                 // If only one page has IG link, assume it's correct
                 if (!igLinked) {
                   const pagesWithIg = fbPages.filter(p => p.instagram_business_account?.id);
                   if (pagesWithIg.length === 1) { bestPage = pagesWithIg[0]; igLinked = true; }
                 }
               }
               primaryPageToken = bestPage.access_token;
               primaryPageId = bestPage.id;
               primaryPageName = bestPage.name;
               // Store IG link info for chain icon verification
               if (igLinked) {
                 igLinkedUsername = igLinkedUsername || igConn?.platform_username || "";
               }
             }
           } catch (pageErr) {
             console.warn("Could not fetch Facebook pages:", pageErr);
           }

           const username = profile.name || "facebook_user";
           let accountId = selectedAccount;
           if (!accountId) {
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.name, platform: "facebook", status: "active", avatar_url: profile.picture?.data?.url || null, user_id: user?.id }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           const igLinkedToPage = fbPages.some(p => p.instagram_business_account?.id);
           const fbMetadata: any = {
             name: profile.name,
             picture_url: profile.picture?.data?.url,
             email: profile.email,
             connected_via: "facebook_oauth_popup",
             fb_pages: fbPages.map(p => ({ id: p.id, name: p.name, category: p.category, fan_count: p.fan_count, has_ig: !!p.instagram_business_account?.id })),
             ig_linked: igLinkedToPage,
           };
           if (primaryPageToken) {
             fbMetadata.fb_page_token = primaryPageToken;
             fbMetadata.fb_page_id = primaryPageId;
             fbMetadata.fb_page_name = primaryPageName;
           }
          await supabase.from("social_connections").upsert({
            account_id: accountId, platform: "facebook", platform_user_id: profile.id || "",
            platform_username: username, access_token: accessToken, is_connected: true,
            scopes: ["public_profile","email","pages_show_list","pages_read_engagement","pages_manage_posts","pages_manage_metadata","pages_read_user_content","pages_messaging","publish_video","business_management"],
            metadata: fbMetadata, user_id: user?.id,
          }, { onConflict: "account_id,platform,user_id" });
          await supabase.from("managed_accounts").update({ avatar_url: profile.picture?.data?.url || undefined, display_name: profile.name || username, last_activity_at: new Date().toISOString() }).eq("id", accountId);

          // Invalidate caches so fresh data loads in UI
          invalidateNamespace(accountId, "social_connections");
          invalidateNamespace("global", "smh_accounts");
          await loadAccounts(); await loadData(accountId);
          toast.success(`✅ ${username} Facebook connected!${primaryPageName ? ` Page: ${primaryPageName}` : ""}`);
        } catch (err: any) { toast.error(err.message || "Facebook connection failed"); }
        setAutoConnectLoading(null);
     };
     window.addEventListener("message", handleFbMessage);
     const check = setInterval(() => {
       try {
         if (popup.closed) { clearInterval(check); setAutoConnectLoading(null); window.removeEventListener("message", handleFbMessage); }
       } catch {}
     }, 500);
   };


  const schedulePost = async () => {
    if (!newPost.caption && !newPost.media_url) { toast.error("Add caption or media"); return; }
    const { error } = await supabase.from("social_posts").insert({
      account_id: selectedAccount, platform: newPost.platform, post_type: newPost.post_type,
      caption: newPost.caption, media_urls: newPost.media_url ? [newPost.media_url] : [],
      scheduled_at: newPost.scheduled_at || null, status: newPost.scheduled_at ? "scheduled" : "draft",
      auto_reply_enabled: newPost.auto_reply_enabled, auto_reply_message: newPost.auto_reply_message || null,
      redirect_url: newPost.redirect_url || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Post created!"); setNewPost({ platform: "instagram", post_type: "feed", caption: "", media_url: "", scheduled_at: "", auto_reply_enabled: false, auto_reply_message: "", redirect_url: "", alt_text: "" }); loadData(); }
  };

  const publishPost = async (post: any) => {
    const funcName = post.platform === "instagram" ? "instagram-api" : "tiktok-api";
    let action = ""; let params: any = { post_id: post.id };
    if (post.platform === "instagram") {
      if (post.post_type === "reel") { action = "create_reel"; params.video_url = post.media_urls?.[0]; params.caption = post.caption; }
      else if (post.post_type === "story") { action = "create_story"; params.image_url = post.media_urls?.[0]; }
      else { action = "create_photo_post"; params.image_url = post.media_urls?.[0]; params.caption = post.caption; }
    } else {
      action = "publish_video_by_url"; params.video_url = post.media_urls?.[0]; params.title = post.caption; params.privacy_level = "PUBLIC_TO_EVERYONE";
    }
    toast.info("Publishing...");
    const result = await callApi(funcName, { action, params });
    if (result) { toast.success("Published!"); loadData(); }
  };

  const deletePost = async (id: string) => { await supabase.from("social_posts").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  const createBioLink = async () => {
    if (!newBioLink.slug || !newBioLink.title) { toast.error("Fill slug and title"); return; }
    const { error } = await supabase.from("bio_links").insert({ account_id: selectedAccount, slug: newBioLink.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""), title: newBioLink.title, bio: newBioLink.bio || null, of_link: newBioLink.of_link || null, theme: newBioLink.theme, links: newBioLink.links.filter(l => l.title && l.url), social_links: newBioLink.social_links, is_active: true });
    if (error) toast.error(error.message);
    else { toast.success("Bio link created!"); loadData(); }
  };
  const deleteBioLink = async (id: string) => { await supabase.from("bio_links").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  // API Actions
  const fetchProfiles = async () => {
    const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
    const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
    const threadsConn = connections.find(c => c.platform === "threads" && c.is_connected);
    if (igConn) { const d = await callApi("instagram-api", { action: "get_profile" }); if (d) setIgProfile(d); }
    if (ttConn) { const d = await callApi("tiktok-api", { action: "get_user_info" }); if (d) setTtProfile(d?.data?.user || d); }
    if (threadsConn) {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("threads-api", { body: { action: "get_profile", account_id: selectedAccount } });
        if (!fnErr && data?.success && data.data) {
          const tp = data.data;
          await supabase.from("social_connections").update({
            platform_username: tp.username || threadsConn.platform_username,
            metadata: { name: tp.name, username: tp.username, threads_profile_picture_url: tp.threads_profile_picture_url, profile_picture_url: tp.threads_profile_picture_url, threads_biography: tp.threads_biography, is_verified: tp.is_verified, connected_via: "social_hub", auto_synced_at: new Date().toISOString() },
          }).eq("account_id", selectedAccount).eq("platform", "threads");
        }
      } catch (e) { console.error("Threads profile fetch:", e); }
    }
  };

  const fetchMedia = async () => {
    const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
    const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
    if (igConn) { const d = await callApi("instagram-api", { action: "get_media", params: { limit: 50 } }); if (d) setIgMedia(d.data || []); }
    if (ttConn) { const d = await callApi("tiktok-api", { action: "get_videos", params: { limit: 20 } }); if (d) setTtVideos(d.data?.videos || []); }
  };

  const fetchComments = async () => {
    if (!commentsMediaId) return;
    if (commentsPlatform === "instagram") {
      const d = await callApi("instagram-api", { action: "get_comments", params: { media_id: commentsMediaId, limit: 50 } });
      if (d) setCommentsList(d.data || []);
    } else {
      const d = await callApi("tiktok-api", { action: "get_comments", params: { video_id: commentsMediaId, limit: 50 } });
      if (d) setCommentsList(d.data?.comments || []);
    }
  };

  const replyToComment = async (commentId: string, commentText: string, author: string) => {
    if (!replyText) return;
    if (commentsPlatform === "instagram") await callApi("instagram-api", { action: "reply_to_comment", params: { comment_id: commentId, media_id: commentsMediaId, message: replyText, comment_text: commentText, comment_author: author } });
    else await callApi("tiktok-api", { action: "reply_to_comment", params: { video_id: commentsMediaId, comment_id: commentId, message: replyText, comment_text: commentText, comment_author: author } });
    setReplyText(""); toast.success("Reply sent!"); loadData();
  };

  const sendDM = async () => {
    if (!dmRecipientId || !dmMessage) return;
    await callApi("instagram-api", { action: "send_message", params: { recipient_id: dmRecipientId, message: dmMessage } });
    toast.success("Message sent!"); setDmMessage("");
  };

  // AI Functions
  const generateAiDmReply = async () => {
    if (!aiTestMessage) return;
    setAiTestReply("");
    const d = await callApi("social-ai-responder", {
      action: "generate_dm_reply",
      params: { message_text: aiTestMessage, sender_name: aiTestSender || "fan", auto_redirect_url: aiDmRedirectUrl, keywords_trigger: aiDmKeywords },
    });
    if (d) {
      const typingDelay = d.typing_delay_ms || 2000;
      const lifePauseMs = d.life_pause_ms || 0;
      
      // Show life pause first if applicable
      if (lifePauseMs > 0) {
        setAiLifePause(true);
        setAiTypingDelay(Math.round(lifePauseMs / 1000));
        // Simulate the pause with a countdown (show seconds)
        const pauseSeconds = Math.round(lifePauseMs / 1000);
        for (let i = pauseSeconds; i > 0; i--) {
          setAiTypingDelay(i);
          await new Promise(r => setTimeout(r, 1000));
        }
        setAiLifePause(false);
      }
      
      // Then show typing indicator
      setAiTyping(true);
      await new Promise(r => setTimeout(r, typingDelay));
      setAiTyping(false);
      setAiTestReply(d.reply);
    }
  };

  const bulkGenerateReplies = async () => {
    if (commentsList.length === 0) { toast.error("Load comments first"); return; }
    toast.info("Generating AI replies...");
    const d = await callApi("social-ai-responder", {
      action: "bulk_generate_replies",
      params: { comments: commentsList.slice(0, 20), redirect_url: aiAutoReplyRedirect },
    });
    if (d) { setBulkAiReplies(d.replies || []); toast.success(`Generated ${d.total} replies`); }
  };

  const sendBulkReply = async (reply: any) => {
    if (commentsPlatform === "instagram") {
      await callApi("instagram-api", { action: "reply_to_comment", params: { comment_id: reply.comment_id, media_id: commentsMediaId, message: reply.generated_reply, comment_text: reply.comment_text, comment_author: reply.username } });
    }
    toast.success("Sent!"); loadData();
    setBulkAiReplies(prev => prev.filter(r => r.comment_id !== reply.comment_id));
  };

  const sendAllBulkReplies = async () => {
    for (const reply of bulkAiReplies) {
      await sendBulkReply(reply);
      await new Promise(r => setTimeout(r, 1000));
    }
    toast.success("All replies sent!");
  };

  const generateAiCaption = async () => {
    if (!aiCaptionTopic) return;
    const d = await callApi("social-ai-responder", {
      action: "generate_caption",
      params: { topic: aiCaptionTopic, platform: aiCaptionPlatform, include_cta: aiCaptionCta },
    });
    if (d) setAiCaptionResult(d.caption);
  };

  const analyzeContent = async () => {
    if (!aiAnalyzeCaption) return;
    const d = await callApi("social-ai-responder", {
      action: "analyze_content",
      params: { caption: aiAnalyzeCaption, platform: "instagram", content_type: "post" },
    });
    if (d) setAiAnalyzeResult(d.analysis);
  };

  const performSearch = async () => {
    if (!searchQuery) return;
    setSearchResults(null);
    const igConn = connections.some(c => c.platform === "instagram" && c.is_connected);
    const ttConn = connections.some(c => c.platform === "tiktok" && c.is_connected);

    if (searchType === "username") {
      const results: any = {};
      if (searchPlatform !== "tiktok" && igConn) { const d = await callApi("instagram-api", { action: "discover_user", params: { username: searchQuery, media_limit: 12 } }); if (d) results.instagram = d; }
      if (searchPlatform !== "instagram" && ttConn) { const d = await callApi("tiktok-api", { action: "research_user", params: { username: searchQuery } }); if (d) results.tiktok = d; }
      setSearchResults({ type: "username", data: results });
    } else if (searchType === "hashtag") {
      const results: any = {};
      if (searchPlatform !== "tiktok" && igConn) {
        const d = await callApi("instagram-api", { action: "search_hashtag", params: { hashtag: searchQuery } });
        if (d?.data?.[0]) {
          const [top, recent] = await Promise.all([
            callApi("instagram-api", { action: "get_hashtag_top_media", params: { hashtag_id: d.data[0].id } }),
            callApi("instagram-api", { action: "get_hashtag_recent_media", params: { hashtag_id: d.data[0].id } }),
          ]);
          results.instagram = { id: d.data[0].id, top: top?.data || [], recent: recent?.data || [] };
        }
      }
      if (searchPlatform !== "instagram" && ttConn) { const d = await callApi("tiktok-api", { action: "research_hashtag", params: { hashtags: [searchQuery] } }); if (d) results.tiktok = d; }
      setSearchResults({ type: "hashtag", data: results });
    } else if (searchType === "keyword") {
      const results: any = {};
      if (ttConn) { const d = await callApi("tiktok-api", { action: "research_videos", params: { keywords: searchQuery.split(",").map(k => k.trim()), limit: 20 } }); if (d) results.tiktok = d; }
      setSearchResults({ type: "keyword", data: results });
    } else if (searchType === "content") {
      const localResults = posts.filter(p => p.caption?.toLowerCase().includes(searchQuery.toLowerCase()));
      const mediaResults = igMedia.filter(m => m.caption?.toLowerCase().includes(searchQuery.toLowerCase()));
      setSearchResults({ type: "content", data: { posts: localResults, media: mediaResults } });
    }
  };

  const igConnected = connections.some(c => c.platform === "instagram" && c.is_connected);
  const ttConnected = connections.some(c => c.platform === "tiktok" && c.is_connected);
  const xConnected = connections.some(c => c.platform === "twitter" && c.is_connected);
  const redditConnected = connections.some(c => c.platform === "reddit" && c.is_connected);
  const telegramConnected = connections.some(c => c.platform === "telegram" && c.is_connected);
  const snapchatConnected = connections.some(c => c.platform === "snapchat" && c.is_connected);
  const threadsConnected = connections.some(c => c.platform === "threads" && c.is_connected);
  const whatsappConnected = connections.some(c => c.platform === "whatsapp" && c.is_connected);
  const signalConnected = connections.some(c => c.platform === "signal" && c.is_connected);
  const youtubeConnected = connections.some(c => c.platform === "youtube" && c.is_connected);
  const pinterestConnected = connections.some(c => c.platform === "pinterest" && c.is_connected);
  const discordConnected = connections.some(c => c.platform === "discord" && c.is_connected);
  const facebookConnected = connections.some(c => c.platform === "facebook" && c.is_connected);
  // Check if FB page is actually linked to the IG account (ig_linked flag or page has instagram_business_account)
  const igFbPageLinked = (() => {
    if (!igConnected || !facebookConnected) return false;
    const fbConn = connections.find(c => c.platform === "facebook" && c.is_connected);
    const fbMeta = (fbConn?.metadata as any) || {};
    // Check ig_linked flag set during connect
    if (fbMeta.ig_linked) return true;
    // Check if any stored page has has_ig flag
    if (fbMeta.fb_pages?.some((p: any) => p.has_ig)) return true;
    // Check if fb_page_id exists (page token stored)
    if (fbMeta.fb_page_id && fbMeta.fb_page_token) return true;
    return false;
  })();

  const navigateToConnect = (platform: string) => {
    setPlatformTab("connect");
  };

  const saveIgSessionData = async () => {
    if (!igSessionId.trim()) { toast.error("Session ID is required"); return; }
    setIgSessionLoading(true);
    try {
      const { data: existing } = await supabase.from("social_connections").select("metadata").eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true).single();
      const currentMeta = (existing?.metadata as any) || {};
      // Reject OAuth tokens being saved as session cookies — they won't work
      const trimmedSession = igSessionId.trim();
      const isOAuthToken = trimmedSession.startsWith("IGQV") || trimmedSession.startsWith("IGQ") || (!trimmedSession.includes("%3A") && !trimmedSession.includes(":") && trimmedSession.length > 150);
      if (isOAuthToken) {
        toast.error("This looks like an OAuth access token, not a session cookie. Session cookies contain '%3A' and come from browser DevTools → Cookies → sessionid.");
        setIgSessionLoading(false);
        return;
      }
      const updatedMeta = { 
        ...currentMeta, 
        ig_session_id: trimmedSession, 
        ig_csrf_token: igCsrfToken.trim() || undefined, 
        ig_ds_user_id: igDsUserId.trim() || undefined, 
        ig_session_saved_at: new Date().toISOString(),
        ig_session_source: "manual_cookie",
      };
      const { error } = await supabase.from("social_connections").update({ metadata: updatedMeta }).eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true);
      if (error) throw error;
      setIgSessionSavedAt(updatedMeta.ig_session_saved_at);
      setIgSessionStatus("valid");
      toast.success("Session saved and synced across all features!");
    } catch (e: any) { toast.error("Failed to save: " + e.message); }
    setIgSessionLoading(false);
  };

  const testIgSession = async () => {
    setIgSessionLoading(true);
    try {
      const d = await callApi("instagram-api", { action: "explore_feed", params: { limit: 1 } });
      const posts = d?.posts || [];
      if (posts.length > 0) { setIgSessionStatus("valid"); toast.success("Session is valid! ✅"); }
      else { setIgSessionStatus("expired"); toast.error("Session may be expired. Update with a fresh cookie."); }
    } catch { setIgSessionStatus("expired"); toast.error("Session expired or invalid."); }
    setIgSessionLoading(false);
  };

  const [findSessionsLoading, setFindSessionsLoading] = useState(false);
  const [sessionAutoConnectLoading, setSessionAutoConnectLoading] = useState(false);
  const [igLoginPopupLoading, setIgLoginPopupLoading] = useState(false);
  const [cachedIgAppId, setCachedIgAppId] = useState<string | null>(null);
  const [ttLoginPopupLoading, setTtLoginPopupLoading] = useState(false);
  const [cachedTtClientKey, setCachedTtClientKey] = useState<string | null>(null);
   const [cachedThreadsAppId, setCachedThreadsAppId] = useState<string | null>(null);
   const [cachedFbAppId, setCachedFbAppId] = useState<string | null>(null);

   // Pre-fetch Instagram App ID, TikTok Client Key, Threads App ID, and Facebook App ID from backend on mount
   useEffect(() => {
     supabase.functions.invoke("ig-oauth-callback", { body: { action: "get_app_id" } })
       .then(({ data }) => { if (data?.app_id) setCachedIgAppId(data.app_id); })
       .catch(() => {});
     supabase.functions.invoke("tiktok-api", { body: { action: "get_client_key" } })
       .then(({ data }) => { if (data?.client_key) setCachedTtClientKey(data.client_key); })
       .catch(() => {});
     supabase.functions.invoke("threads-api", { body: { action: "get_app_id" } })
       .then(({ data }) => { if (data?.app_id) { setCachedThreadsAppId(data.app_id); setThreadsAppId(data.app_id); } })
       .catch(() => {});
     supabase.functions.invoke("facebook-api", { body: { action: "get_app_id" } })
       .then(({ data }) => { if (data?.app_id) { setCachedFbAppId(data.app_id); setFbAppId(data.app_id); } })
       .catch(() => {});
   }, []);
  const [foundSessions, setFoundSessions] = useState<Array<{ id: string; source: string; sessionId: string; csrfToken?: string; dsUserId?: string; savedAt?: string; status: "active" | "expired" | "unknown" }>>([]);

  type FoundSession = typeof foundSessions[number];

  // NOTE: IG_SESSION_RESULT messages are now handled in the unified popup handler inside handleIGLoginPopup

  // Open the IG login popup — directly open Instagram OAuth to avoid iframe blocking
  const openIgLoginPopup = () => {
    const appId = oauthAppId || cachedIgAppId;
    if (!appId) { toast.error("Enter your Meta App ID in the One-Click Connect section, or configure INSTAGRAM_APP_ID in backend secrets"); return; }
    setIgLoginPopupLoading(true);
    const redirectUri = "https://uplyze.ai/ig-login";
    const scope = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights";
    const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    // Open as a centered popup window
    const w = 520, h = 620;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(authUrl, "ig_login_popup", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    if (!popup) {
      toast.info("Popup blocked — opening in current tab. You'll be redirected back after login.");
      window.location.href = authUrl;
      return;
    }
    // Listen for the postMessage result from the popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "IG_SESSION_RESULT") {
        window.removeEventListener("message", handleMessage);
        setIgLoginPopupLoading(false);
        const payload = event.data.payload || {};
        const { access_token, user_id, username: rawUsername, expires_in, name: rawName, profile_picture_url, session_id, csrf_token, ds_user_id, followers_count, media_count } = payload;
        const username = rawUsername || rawName || `ig_${user_id || "user"}`;
        const name = rawName || rawUsername || username;
        
        if (!access_token && !session_id) return;

        // v25 API: No Facebook Page linking needed for IG messaging

        // ========================================================
        // STEP 2: Do all IG DB work in the background while user
        // is on the Facebook login screen in the same popup.
        // ========================================================
        try {
          const tokenExpiresAt = expires_in 
            ? new Date(Date.now() + expires_in * 1000).toISOString() 
            : null;
          const savedAt = new Date().toISOString();
          
          // Auto-create managed account if none selected (same as main connect form)
          let accountId = selectedAccount;
          if (!accountId) {
             const { data: newAccount, error: createErr } = await supabase.from("managed_accounts").insert({
               username: username || "instagram_user",
               display_name: name || username || "Instagram User",
               platform: "instagram",
               status: "active",
               avatar_url: profile_picture_url || null,
               subscriber_count: 0,
               content_count: 0,
               user_id: user?.id,
             }).select("id").single();
            if (createErr || !newAccount) { toast.error(createErr?.message || "Failed to create account"); return; }
            accountId = newAccount.id;
            setSelectedAccount(accountId);
            toast.success(`Account @${username} created`);
          }
          
           // Get existing connection to check if IG account changed (different platform_user_id = different IG account)
           const { data: existingConn } = await supabase
             .from("social_connections")
             .select("metadata, platform_user_id")
             .eq("account_id", accountId)
             .eq("platform", "instagram")
             .maybeSingle();
           
           const existingMeta = (existingConn?.metadata as any) || {};
           const newPlatformUserId = String(user_id || ds_user_id);
           
           // DM data is preserved — platform_user_id filtering handles isolation
           if (existingConn?.platform_user_id && existingConn.platform_user_id !== newPlatformUserId) {
             console.log(`IG account changed: ${existingConn.platform_user_id} → ${newPlatformUserId} — old DM data preserved, filtering by platform_user_id`);
             toast.info("Switched IG account — previous account's DM history preserved");
           }
          
          const updatedMeta = {
            ...existingMeta,
            profile_picture_url: profile_picture_url || existingMeta.profile_picture_url,
            name: name || existingMeta.name,
            connected_via: "ig_oauth_popup",
            // OAuth data
            ...(access_token && {
              ig_access_token: access_token,
              ig_account_type: payload.account_type,
              ig_name: name,
              ig_profile_pic: profile_picture_url,
              ig_token_expires_at: tokenExpiresAt,
              ig_oauth_connected_at: savedAt,
            }),
            // Session data (for private API features)
            ...(session_id && {
              ig_session_id: session_id,
              ig_session_saved_at: savedAt,
            }),
            ...(csrf_token && { ig_csrf_token: csrf_token }),
            ig_ds_user_id: ds_user_id || String(user_id) || existingMeta.ig_ds_user_id,
          };

          // Upsert social connection (same as main connect form)
           await supabase.from("social_connections").upsert({
             account_id: accountId,
             platform: "instagram",
             access_token: access_token || existingMeta.ig_access_token || null,
             platform_user_id: String(user_id || ds_user_id),
             platform_username: username,
             is_connected: true,
             connected_at: savedAt,
             token_expires_at: tokenExpiresAt,
             scopes: ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_comments", "instagram_business_manage_messages", "instagram_business_manage_insights"],
             metadata: updatedMeta,
             user_id: user?.id,
            }, { onConflict: "account_id,platform,user_id" });
          
          // Sync managed account with profile data (same as main connect form)
          await supabase.from("managed_accounts").update({
             username: username || undefined,
             avatar_url: profile_picture_url || undefined,
             display_name: name || username,
             social_links: { instagram: `https://instagram.com/${username}`, ig_user_id: String(user_id || ds_user_id) },
             last_activity_at: savedAt,
           }).eq("id", accountId);
          
          // Update local state for session fields
          if (session_id) {
            setIgSessionId(session_id);
            setIgSessionSavedAt(savedAt);
            setIgSessionStatus("valid");
          }
          if (csrf_token) setIgCsrfToken(csrf_token);
          if (ds_user_id || user_id) setIgDsUserId(ds_user_id || String(user_id));
          
          // If OAuth succeeded but no session_id was captured, mark as oauth-only
          if (!session_id && access_token) {
            const oauthOnlyMeta = {
              ...updatedMeta,
              ig_session_source: "oauth_token",
            };
            await supabase.from("social_connections").update({ metadata: oauthOnlyMeta }).eq("account_id", accountId).eq("platform", "instagram").eq("is_connected", true);
          }
          
          // Set profile state for dashboard/username pill
          setIgProfile({
            profile_picture_url,
            name: name || username,
            username,
            followers_count: 0,
            media_count: 0,
          });
          
          // Auto-fetch full profile from Graph API to get follower counts etc.
          try {
            const { data: profileResp } = await supabase.functions.invoke("instagram-api", {
              body: { action: "get_profile", account_id: accountId },
            });
            const profileData = profileResp?.success ? profileResp.data : null;
            if (profileData) {
              setIgProfile(profileData);
              await supabase.from("social_connections").update({
                metadata: { ...updatedMeta, profile_picture_url: profileData.profile_picture_url, name: profileData.name, followers_count: profileData.followers_count, media_count: profileData.media_count },
              }).eq("account_id", accountId).eq("platform", "instagram");
              await supabase.from("managed_accounts").update({
                avatar_url: profileData.profile_picture_url || profile_picture_url || undefined,
                display_name: profileData.name || name || username,
                subscriber_count: profileData.followers_count || 0,
                content_count: profileData.media_count || 0,
              }).eq("id", accountId);
            }
          } catch (e) { console.log("Auto profile sync after OAuth (will retry on next load):", e); }
          
          // Invalidate caches so fresh data loads
          invalidateNamespace(accountId, "social_connections");
          invalidateNamespace("global", "smh_accounts");
          
          // Reload accounts list and data to show in UI
          await loadAccounts();
          await loadData(accountId);
          
           toast.success(`✅ @${username} connected via Instagram Login — synced across all features.`);
           
            // Close popup — no FB chain needed with v25 API
            try { if (popup && !popup.closed) popup.close(); } catch {}
        } catch (e: any) {
           toast.error("Failed to save connection: " + e.message);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    // Only clean up if popup is truly closed
    const check = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(check);
          setIgLoginPopupLoading(false);
          window.removeEventListener("message", handleMessage);
        }
      } catch {
        // Cross-origin — ignore
      }
    }, 1000);
  };

  // Open TikTok login popup — mirrors the Instagram one-click flow
  const openTtLoginPopup = async () => {
    let clientKey = ttClientKey || cachedTtClientKey;
    // If not cached yet, try fetching on-demand
    if (!clientKey) {
      try {
        const { data } = await supabase.functions.invoke("tiktok-api", { body: { action: "get_client_key" } });
        if (data?.client_key) { clientKey = data.client_key; setCachedTtClientKey(data.client_key); }
      } catch {}
    }
    if (!clientKey) { toast.error("Configure TIKTOK_CLIENT_KEY in backend secrets or enter your Client Key"); return; }
    setTtLoginPopupLoading(true);
    const csrfState = Math.random().toString(36).substring(2);
    sessionStorage.setItem("tt_csrf", csrfState);
    const ttRedirectUri = "https://uplyze.ai/tt-login";
    const scopes = "user.info.basic,user.info.profile,user.info.stats,video.list,video.publish,video.upload";
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(ttRedirectUri)}&state=${csrfState}`;
    const w = 520, h = 620;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(authUrl, "tt_login_popup", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    if (!popup) {
      toast.info("Popup blocked — opening in current tab.");
      window.location.href = authUrl;
      return;
    }
    setAutoConnectLoading("tiktok");
    toast.info("Authenticate with TikTok in the popup...");

    const handleTTMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "TT_OAUTH_RESULT") return;
      window.removeEventListener("message", handleTTMessage);
      setTtLoginPopupLoading(false);
      const { code, redirect_uri } = event.data.payload;
      if (!code) { setAutoConnectLoading(null); toast.error("No auth code received"); return; }
      toast.info("Auth code captured! Exchanging for token...");
      try {
        const { data, error } = await supabase.functions.invoke("tiktok-api", {
          body: { action: "exchange_code", params: { code, client_key: clientKey, client_secret: ttClientSecret || undefined, redirect_uri: redirect_uri || ttRedirectUri } },
        });
        if (error || !data?.success) { toast.error(data?.error || error?.message || "Token exchange failed"); setAutoConnectLoading(null); return; }
        const tokenData = data.data;
        const accessToken = tokenData?.access_token;
        const openId = tokenData?.open_id;
        if (!accessToken) { toast.error("No access token in response"); setAutoConnectLoading(null); return; }
        toast.info("Fetching TikTok profile...");
        const profileRes = await supabase.functions.invoke("tiktok-api", {
          body: { action: "get_user_info", account_id: selectedAccount || "temp", params: { access_token_override: accessToken } },
        });
        const ttUser = profileRes.data?.data?.data?.user || profileRes.data?.data?.user || {};
        const username = ttUser.username || ttUser.display_name || "tiktok_user";
        let accountId = selectedAccount;
        if (!accountId) {
           const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({
             username, display_name: ttUser.display_name || username, platform: "tiktok", status: "active", avatar_url: ttUser.avatar_url || null, user_id: user?.id,
          }).select("id").single();
          if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
          accountId = newAcct.id; setSelectedAccount(accountId);
        }
         await supabase.from("social_connections").upsert({
           account_id: accountId, platform: "tiktok", platform_user_id: openId || "", platform_username: username, access_token: accessToken,
           refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
           metadata: { avatar_url: ttUser.avatar_url, display_name: ttUser.display_name, connected_via: "tt_oauth_popup" },
           user_id: user?.id,
         }, { onConflict: "account_id,platform,user_id" });
        await supabase.from("managed_accounts").update({
          avatar_url: ttUser.avatar_url || undefined, display_name: ttUser.display_name || username, last_activity_at: new Date().toISOString(),
        }).eq("id", accountId);
        setTtProfile(ttUser); await loadAccounts(); await loadData(accountId);
        toast.success(`✅ @${username} TikTok connected!`);
      } catch (err: any) { toast.error(err.message || "TikTok connection failed"); }
      setAutoConnectLoading(null);
    };
    window.addEventListener("message", handleTTMessage);
    const check = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(check);
          setTtLoginPopupLoading(false);
          setAutoConnectLoading(null);
          window.removeEventListener("message", handleTTMessage);
        }
      } catch {
        clearInterval(check);
        setTtLoginPopupLoading(false);
        setAutoConnectLoading(null);
        window.removeEventListener("message", handleTTMessage);
      }
    }, 500);
  };

  // Parse Instagram cookies from a raw cookie string (e.g. pasted from DevTools)
  const parseIgCookies = (raw: string): { sessionId?: string; csrfToken?: string; dsUserId?: string } => {
    const result: { sessionId?: string; csrfToken?: string; dsUserId?: string } = {};
    // Handle "name=value; name=value" format (cookie header) or just a raw sessionid value
    if (raw.includes("sessionid=")) {
      const parts = raw.split(/[;\n]/).map(s => s.trim());
      for (const p of parts) {
        if (p.startsWith("sessionid=")) result.sessionId = p.split("=").slice(1).join("=");
        if (p.startsWith("csrftoken=")) result.csrfToken = p.split("=").slice(1).join("=");
        if (p.startsWith("ds_user_id=")) result.dsUserId = p.split("=").slice(1).join("=");
      }
    } else if (raw.includes("%3A") && raw.length > 20) {
      // Looks like a raw sessionid value
      result.sessionId = raw.trim();
    }
    return result;
  };

  const gatherSessions = async (): Promise<FoundSession[]> => {
    const sessions: FoundSession[] = [];
    const seenIds = new Set<string>();

    const addSession = (sessionId: string, source: string, csrf?: string, dsUser?: string, savedAt?: string, forceStatus?: "active" | "expired" | "unknown") => {
      const key = sessionId.trim().slice(0, 30);
      if (!key || seenIds.has(key)) return;
      seenIds.add(key);
      let status: "active" | "expired" | "unknown" = forceStatus || "unknown";
      if (!forceStatus && savedAt) {
        const age = Date.now() - new Date(savedAt).getTime();
        status = age < 48 * 60 * 60 * 1000 ? "active" : age < 7 * 24 * 60 * 60 * 1000 ? "unknown" : "expired";
      }
      sessions.push({ id: `${source}-${sessions.length}`, source, sessionId: sessionId.trim(), csrfToken: csrf?.trim(), dsUserId: dsUser?.trim(), savedAt, status });
    };

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: INPUT FIELD — highest priority (user pasted fresh session)
    // ═══════════════════════════════════════════════════════════════
    if (igSessionId && igSessionId.length > 20 && igSessionId.includes("%3A")) {
      addSession(igSessionId, "✏️ Input Field (Fresh)", igCsrfToken || undefined, igDsUserId || undefined, undefined, "active");
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: CLIPBOARD (user may have copied sessionid)
    // ═══════════════════════════════════════════════════════════════
    try {
      const clipText = await Promise.race([
        navigator.clipboard.readText(),
        new Promise<string>((_, rej) => setTimeout(() => rej("timeout"), 2000))
      ]);
      if (clipText && clipText.length > 10) {
        const parsed = parseIgCookies(clipText);
        if (parsed.sessionId) {
          addSession(parsed.sessionId, "📋 Clipboard", parsed.csrfToken, parsed.dsUserId, undefined, "active");
        }
      }
    } catch {}

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: DATABASE (saved sessions — fallback)
    // ═══════════════════════════════════════════════════════════════
    try {
      const { data } = await Promise.race([
        supabase.from("social_connections").select("metadata").eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true).single(),
        new Promise<any>((_, rej) => setTimeout(() => rej("timeout"), 3000))
      ]);
      const meta = (data?.metadata as any) || {};
      if (meta.ig_session_id) addSession(meta.ig_session_id, "💾 Saved Session", meta.ig_csrf_token, meta.ig_ds_user_id, meta.ig_session_saved_at);
    } catch {}

    // Other managed accounts
    try {
      const { data: allConns } = await Promise.race([
        supabase.from("social_connections").select("metadata, account_id").eq("platform", "instagram").eq("is_connected", true),
        new Promise<any>((_, rej) => setTimeout(() => rej("timeout"), 3000))
      ]);
      if (allConns) {
        for (const conn of allConns) {
          if (conn.account_id === selectedAccount) continue;
          const meta = (conn.metadata as any) || {};
          if (meta.ig_session_id) addSession(meta.ig_session_id, `💾 Account ${String(conn.account_id).slice(0, 6)}…`, meta.ig_csrf_token, meta.ig_ds_user_id, meta.ig_session_saved_at);
        }
      }
    } catch {}

    // Sort: active first, then unknown, then expired
    const order = { active: 0, unknown: 1, expired: 2 };
    sessions.sort((a, b) => order[a.status] - order[b.status]);
    return sessions;
  };

  // Button 1: Find Sessions — quick scan, shows pills
  const findSessions = async () => {
    setFindSessionsLoading(true);
    setFoundSessions([]);
    try {
      const sessions = await Promise.race([
        gatherSessions(),
        new Promise<FoundSession[]>((resolve) => setTimeout(() => resolve([]), 8000))
      ]);
      setFoundSessions(sessions);
      if (sessions.length === 0) {
        toast.error("No sessions found. Copy your sessionid cookie from instagram.com → DevTools → Application → Cookies, then paste it in the field or copy to clipboard and retry.");
      } else {
        toast.success(`Found ${sessions.length} session${sessions.length > 1 ? "s" : ""} — click one to use it.`);
      }
    } catch {
      toast.error("Scan timed out. Try again or paste cookies manually.");
    }
    setFindSessionsLoading(false);
  };

  // Button 2: Auto Connect — input field first, then clipboard, then saved
  const autoConnectSession = async () => {
    setSessionAutoConnectLoading(true);
    setFoundSessions([]);
    toast.info("Scanning for sessions…");

    try {
      const sessions = await Promise.race([
        gatherSessions(),
        new Promise<FoundSession[]>((resolve) => setTimeout(() => resolve([]), 8000))
      ]);

      if (sessions.length === 0) {
        toast.error("No sessions found. Paste your sessionid in the field above, then click Auto Connect.");
        setSessionAutoConnectLoading(false);
        return;
      }

      toast.info(`Found ${sessions.length} — testing…`);

      // Backup current metadata before testing
      const { data: existingConn } = await supabase.from("social_connections").select("metadata").eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true).single();
      const originalMeta = (existingConn?.metadata as any) || {};

      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        toast.info(`Testing ${i + 1}/${sessions.length} — "${session.source}"…`);
        try {
          const testMeta = { ...originalMeta, ig_session_id: session.sessionId, ig_csrf_token: session.csrfToken || originalMeta.ig_csrf_token, ig_ds_user_id: session.dsUserId || originalMeta.ig_ds_user_id };
          await supabase.from("social_connections").update({ metadata: testMeta }).eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true);

          // Use profile_info for validation — it returns actual user data only with a valid session
          // Also try explore_feed as fallback
          let isValid = false;

          // Test 1: Try getting own profile (most reliable validation)
          try {
            const profileResult = await Promise.race([
              callApi("instagram-api", { action: "profile_info", params: { username: connections.find(c => c.platform === "instagram")?.platform_username || "" } }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
            ]);
            const profileData = (profileResult as any)?.data || profileResult;
            // If we get a username or user object back, session is valid
            if (profileData?.user || profileData?.username || profileData?.full_name || profileData?.pk) {
              isValid = true;
            }
          } catch {}

          // Test 2: Fallback to explore_feed but check for actual content
          if (!isValid) {
            try {
              const d = await Promise.race([
                callApi("instagram-api", { action: "explore_feed", params: { limit: 3 } }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
              ]);
              const posts = (d as any)?.posts || (d as any)?.data?.posts || [];
              if (Array.isArray(posts) && posts.length > 0) {
                isValid = true;
              }
            } catch {}
          }

          // Test 3: Try timeline feed as another validation
          if (!isValid) {
            try {
              const tf = await Promise.race([
                callApi("instagram-api", { action: "timeline_feed", params: { limit: 1 } }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
              ]);
              const items = (tf as any)?.items || (tf as any)?.data?.items || (tf as any)?.feed_items || [];
              if ((Array.isArray(items) && items.length > 0) || (tf as any)?.num_results > 0) {
                isValid = true;
              }
            } catch {}
          }

          if (isValid) {
            const savedAt = new Date().toISOString();
            const finalMeta = { ...testMeta, ig_session_saved_at: savedAt };
            await supabase.from("social_connections").update({ metadata: finalMeta }).eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true);

            setIgSessionId(session.sessionId);
            if (session.csrfToken) setIgCsrfToken(session.csrfToken);
            if (session.dsUserId) setIgDsUserId(session.dsUserId);
            setIgSessionSavedAt(savedAt);
            setIgSessionStatus("valid");
            toast.success(`✅ Connected via "${session.source}" — session is live!`);
            setSessionAutoConnectLoading(false);
            return;
          } else {
            // Revert to original metadata before trying next
            await supabase.from("social_connections").update({ metadata: originalMeta }).eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true);
          }
        } catch {
          // Revert on error too
          await supabase.from("social_connections").update({ metadata: originalMeta }).eq("account_id", selectedAccount).eq("platform", "instagram").eq("is_connected", true);
        }
      }

      const markedExpired = sessions.map(s => ({ ...s, status: "expired" as const }));
      setFoundSessions(markedExpired);
      toast.error("No working session found. Paste a fresh sessionid in the field above and try again.");
    } catch {
      toast.error("Auto-connect failed. Paste sessionid in the field and try again.");
    }
    setSessionAutoConnectLoading(false);
  };

  const selectFoundSession = (session: FoundSession) => {
    setIgSessionId(session.sessionId);
    if (session.csrfToken) setIgCsrfToken(session.csrfToken);
    if (session.dsUserId) setIgDsUserId(session.dsUserId);
    setFoundSessions([]);
    toast.success(`Session from "${session.source}" applied. Click Save Session to persist.`);
  };

  return (
    <div className="dark space-y-4 text-[13px]" style={{ '--foreground': '215 25% 82%', '--muted-foreground': '215 18% 56%', '--muted': '220 50% 16%', '--background': '220 100% 10%', '--border': '220 40% 20%', '--card': '220 80% 12%', '--card-foreground': '215 25% 82%', '--popover': '220 80% 12%', '--popover-foreground': '215 25% 82%', '--input': '220 40% 20%', '--secondary': '220 60% 18%', '--secondary-foreground': '215 25% 82%', '--accent-foreground': '215 25% 82%', color: 'hsl(215, 25%, 82%)', fontSize: '13px' } as React.CSSProperties}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">Social Media</h2>
            <CreditCostBadge cost="0–10" variant="header" label="per action" />
          </div>
          <p className="text-xs text-muted-foreground">AI Auto-DM · Multi-Platform · Full API</p>
        </div>
        <div className="flex items-center gap-2">
          {apiLoading && <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 animate-pulse"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />API</Badge>}
        </div>
      </div>

      {/* Connection chips + connected accounts mini bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <Badge className={igConnected ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}>
          <Instagram className="h-3 w-3 mr-1" />{igConnected ? "IG Live" : "IG Offline"}
        </Badge>
        <Badge className={ttConnected ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}>
          <Music2 className="h-3 w-3 mr-1" />{ttConnected ? "TT Live" : "TT Offline"}
        </Badge>
        <Badge className={xConnected ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}>
          <Twitter className="h-3 w-3 mr-1" />{xConnected ? "X Live" : "X Offline"}
        </Badge>
        <Badge className={redditConnected ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}>
          <Globe className="h-3 w-3 mr-1" />{redditConnected ? "Reddit Live" : "Reddit Offline"}
        </Badge>
        <Badge className={telegramConnected ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}>
          <Phone className="h-3 w-3 mr-1" />{telegramConnected ? "TG Live" : "TG Offline"}
        </Badge>
        {autoRespondActive && (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 animate-pulse">
            <Radio className="h-3 w-3 mr-1" />AI Auto-Responding
          </Badge>
        )}
        {/* Mini avatars of connected accounts */}
        {connections.filter(c => c.is_connected).map(c => (
          <div key={c.id} className="flex items-center gap-1.5 bg-muted/40 rounded-full pl-1 pr-2 py-0.5 border border-border">
            <div className="relative">
              {(c.metadata as any)?.profile_picture_url || (c.metadata as any)?.threads_profile_picture_url || (c.metadata as any)?.profile_image_url || (c.metadata as any)?.icon_img || (c.metadata as any)?.avatar_url ? (
                <img src={(c.metadata as any).profile_picture_url || (c.metadata as any).threads_profile_picture_url || (c.metadata as any).profile_image_url || (c.metadata as any).icon_img || (c.metadata as any).avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  {c.platform === "instagram" ? <Instagram className="h-3 w-3 text-pink-400" /> : c.platform === "tiktok" ? <Music2 className="h-3 w-3 text-cyan-400" /> : c.platform === "twitter" ? <Twitter className="h-3 w-3 text-blue-400" /> : c.platform === "reddit" ? <Globe className="h-3 w-3 text-orange-400" /> : <Phone className="h-3 w-3 text-blue-400" />}
                </div>
              )}
              {c.platform === "instagram" && <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/132px-Instagram_logo_2016.svg.png" alt="IG" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background border border-border/50 p-[1px] object-contain" />}
              {c.platform === "tiktok" && <img src="https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/100px-TikTok_logo.svg.png" alt="TT" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background border border-border/50 p-[1px] object-contain" />}
              {c.platform === "threads" && <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Threads_%28app%29.svg/100px-Threads_%28app%29.svg.png" alt="TH" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background border border-border/50 p-[1px] object-contain" />}
              {c.platform === "facebook" && <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/100px-Facebook_Logo_%282019%29.png" alt="FB" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background border border-border/50 p-[1px] object-contain" />}
              {c.platform === "twitter" && <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/100px-Logo_of_Twitter.svg.png" alt="TW" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background border border-border/50 p-[1px] object-contain" />}
            </div>
            <span className="text-xs text-foreground font-medium">@{c.platform_username}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 flex-wrap mb-3">
        {[
          { v: "instagram", icon: Instagram, l: "Instagram Automation", activeClasses: "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border-pink-500/30 shadow-[0_0_12px_-3px] shadow-pink-500/20", requiresConnection: true, connected: igConnected },
          { v: "tiktok", icon: Music2, l: "TikTok Automation", activeClasses: "bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-foreground border-cyan-500/30 shadow-[0_0_12px_-3px] shadow-cyan-500/20", requiresConnection: true, connected: ttConnected },
          { v: "threads", icon: AtSign, l: "Threads Automation", activeClasses: "bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-foreground border-purple-500/30 shadow-[0_0_12px_-3px] shadow-purple-500/20", requiresConnection: true, connected: threadsConnected },
          { v: "facebook", icon: Globe, l: "Facebook Automation", activeClasses: "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-foreground border-blue-500/30 shadow-[0_0_12px_-3px] shadow-blue-500/20", requiresConnection: true, connected: facebookConnected },
          { v: "connect", icon: Plus, l: "Connect", activeClasses: "bg-muted text-foreground border-border", requiresConnection: false, connected: true },
        ].map(t => (
          <button
            key={t.v}
            onClick={() => {
              if (t.requiresConnection && !t.connected) {
                navigateToPlatformConnect(t.v);
                return;
              }
              setPlatformTab(t.v);
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-semibold transition-all ${
              platformTab === t.v
                ? t.activeClasses
                : "text-muted-foreground border-transparent hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.l}
          </button>
        ))}
      </div>

      {platformTab === "tiktok" ? (
        <TKAutomationSuite selectedAccount={selectedAccount} onNavigateToConnect={navigateToTiktokConnect} subTab={activeSubTab} onSubTabChange={onSubTabChange} />
      ) : platformTab === "threads" ? (
        <ThreadsAutomationSuite selectedAccount={selectedAccount} onNavigateToConnect={() => navigateToPlatformConnect("threads")} subTab={activeSubTab} onSubTabChange={onSubTabChange} />
      ) : platformTab === "facebook" ? (
        <FBAutomationSuite selectedAccount={selectedAccount} onNavigateToConnect={() => navigateToPlatformConnect("facebook")} subTab={activeSubTab} onSubTabChange={onSubTabChange} />
      ) : platformTab !== "connect" ? (
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex flex-wrap w-full">
            {[
              { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
              { v: "ai-auto", icon: Brain, l: "Auto-DM" },
              { v: "ai-mass", icon: Megaphone, l: "Mass DM" },
              { v: "search", icon: Search, l: "Search" },
              { v: "content", icon: Layers, l: "Content" },
              { v: "engagement", icon: MessageSquare, l: "Comments" },
              { v: "messaging", icon: Send, l: "DMs" },
              { v: "ai-tools", icon: Wand2, l: "AI Tools" },
              { v: "analytics", icon: BarChart3, l: "Analytics" },
              { v: "biolink", icon: Link2, l: "Bio Links" },
              { v: "automation", icon: Zap, l: "Automation" },
              { v: "social-networks", icon: Globe, l: "Networks" },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <t.icon className="h-3.5 w-3.5" />{t.l}
              </TabsTrigger>
            ))}
          </TabsList>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={fetchProfiles} className="text-foreground"><RefreshCw className="h-3.5 w-3.5 mr-1" />Sync Profiles</Button>
            <Button size="sm" variant="outline" onClick={fetchMedia} className="text-foreground"><Download className="h-3.5 w-3.5 mr-1" />Pull Media</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {igProfile && (
              <Card className="border-pink-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {igProfile.profile_picture_url && <img src={igProfile.profile_picture_url} className="h-10 w-10 rounded-full" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{igProfile.name || igProfile.username}</p>
                      <p className="text-xs text-muted-foreground">@{igProfile.username}</p>
                    </div>
                    <Instagram className="h-4 w-4 text-pink-400" />
                  </div>
                  {igProfile._source === "cached_fallback" && igProfile._error && (
                    <div className="mb-2 p-2 rounded bg-destructive/10 border border-destructive/30">
                      <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Live stats unavailable — Meta API error</p>
                      <p className="text-[9px] text-destructive/70 mt-0.5 break-all">{igProfile._error}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Try disconnecting & reconnecting, or ensure this account is a Tester in the Meta Developer Portal if your app is in Development mode.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(igProfile.followers_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(igProfile.follows_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Following</p></div>
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(igProfile.media_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Posts</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
            {ttProfile && (
              <Card className="border-cyan-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {ttProfile.avatar_url && <img src={ttProfile.avatar_url} className="h-10 w-10 rounded-full" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ttProfile.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{ttProfile.username || "tiktok"}</p>
                    </div>
                    <Music2 className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(ttProfile.follower_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(ttProfile.following_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Following</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(ttProfile.likes_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(ttProfile.video_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Videos</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{posts.filter(p => p.status === "published").length}</p><p className="text-[10px] text-muted-foreground">Published</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{posts.filter(p => p.status === "scheduled").length}</p><p className="text-[10px] text-muted-foreground">Scheduled</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{bioLinks.length}</p><p className="text-[10px] text-muted-foreground">Bio Links</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{commentReplies.length}</p><p className="text-[10px] text-muted-foreground">Replies</p></CardContent></Card>
          </div>
        </TabsContent>

        {/* ===== AI AUTO-DM (Play/Pause) ===== */}
        <TabsContent value="ai-auto" className="space-y-4 mt-4">
          {/* Test AI */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" />Test AI Responder</h4>
              <div className="grid grid-cols-3 gap-2">
                <Input value={aiTestSender} onChange={e => setAiTestSender(e.target.value)} placeholder="Sender name" className="text-sm" />
                <Input value={aiTestMessage} onChange={e => setAiTestMessage(e.target.value)} placeholder="Type a test DM..." className="text-sm col-span-2" onKeyDown={e => e.key === "Enter" && generateAiDmReply()} />
              </div>
              <Button onClick={generateAiDmReply} disabled={apiLoading || aiTyping || aiLifePause || !aiTestMessage} size="sm"><Brain className="h-3.5 w-3.5 mr-1.5" />Generate Reply</Button>
              {aiLifePause && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                  <p className="text-sm text-muted-foreground italic">away for {aiTypingDelay}s... (simulating natural pause)</p>
                </div>
              )}
              {aiTyping && !aiLifePause && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-muted-foreground italic">typing...</p>
                </div>
              )}
              {aiTestReply && !aiTyping && !aiLifePause && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">AI Reply:</p>
                  <p className="text-sm text-foreground">{aiTestReply}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(aiTestReply); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                    <Button size="sm" variant="outline" onClick={() => { setDmMessage(aiTestReply); setActiveSubTab("messaging"); toast.success("Pasted to DM"); }}><Send className="h-3 w-3 mr-1" />Send as DM</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Live Conversations Panel */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-blue-400" />
                Live AI Conversations
              </h4>
              <LiveDMConversations
                accountId={selectedAccount}
                autoRespondActive={autoRespondActive}
                onToggleAutoRespond={toggleAutoRespond}
                onNavigateToSession={navigateToSessionCard}
                igSessionId={igSessionId}
                igSessionStatus={igSessionStatus}
                igPlatformUserId={connections.find(c => c.platform === "instagram" && c.is_connected)?.platform_user_id || ""}
                platformUserId={
                  connections.find(c => c.platform === platformTab && c.is_connected)?.platform_user_id || 
                  connections.find(c => c.platform === "instagram" && c.is_connected)?.platform_user_id || ""
                }
                platform={platformTab || "instagram"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AI MASS DM ===== */}
        <TabsContent value="ai-mass" className="space-y-4 mt-4">
          <AIMassDMOutreach accountId={selectedAccount} />
        </TabsContent>

        {/* ===== SEARCH ===== */}
        <TabsContent value="search" className="mt-4">
          <SearchDiscoveryHub accountId={selectedAccount} />
        </TabsContent>

        {/* ===== CONTENT ===== */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {/* AI Content Assistant */}
          <Card className="border-purple-500/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" />AI Content Assistant</h4>
                <CreditCostBadge cost="5–10" variant="header" label="/gen" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={aiCaptionTopic} onChange={e => setAiCaptionTopic(e.target.value)} placeholder="Topic: fitness motivation, beach vibes..." className="text-sm" />
                <div className="flex gap-1">
                  <select value={aiCaptionPlatform} onChange={e => setAiCaptionPlatform(e.target.value)} className="bg-card text-card-foreground border border-border rounded-lg px-2 py-1.5 text-sm w-24">
                    <option value="instagram">IG</option><option value="tiktok">TT</option><option value="twitter">X</option>
                  </select>
                  <Button size="sm" onClick={generateAiCaption} disabled={apiLoading || !aiCaptionTopic} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />Generate
                  </Button>
                </div>
              </div>
              {aiCaptionResult && (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiCaptionResult}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(aiCaptionResult); toast.success("Copied"); }}><Copy className="h-2.5 w-2.5 mr-0.5" />Copy</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setNewPost(p => ({ ...p, caption: aiCaptionResult })); toast.success("Pasted to composer"); }}><ArrowRight className="h-2.5 w-2.5 mr-0.5" />Use</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post Composer */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-blue-400" />Post Composer & Scheduler</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} className="bg-card text-card-foreground border border-border rounded-lg px-2 py-1.5 text-sm">
                  <option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="twitter">X / Twitter</option><option value="reddit">Reddit</option><option value="telegram">Telegram</option>
                </select>
                <select value={newPost.post_type} onChange={e => setNewPost(p => ({ ...p, post_type: e.target.value }))} className="bg-card text-card-foreground border border-border rounded-lg px-2 py-1.5 text-sm">
                  <option value="feed">Photo</option><option value="reel">Reel</option><option value="story">Story</option><option value="carousel">Carousel</option>
                </select>
              </div>
              <Textarea value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Write your caption... (or use AI above)" rows={4} className="text-sm" />
              <Input value={newPost.media_url} onChange={e => setNewPost(p => ({ ...p, media_url: e.target.value }))} placeholder="Media URL (image/video link)..." className="text-sm" />
              <Input value={newPost.alt_text} onChange={e => setNewPost(p => ({ ...p, alt_text: e.target.value }))} placeholder="Alt text for accessibility..." className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Schedule</label>
                  <Input type="datetime-local" value={newPost.scheduled_at} onChange={e => setNewPost(p => ({ ...p, scheduled_at: e.target.value }))} className="text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Redirect URL</label>
                  <Input value={newPost.redirect_url} onChange={e => setNewPost(p => ({ ...p, redirect_url: e.target.value }))} placeholder="https://..." className="text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={newPost.auto_reply_enabled} onCheckedChange={v => setNewPost(p => ({ ...p, auto_reply_enabled: v }))} /><span className="text-xs text-muted-foreground">Auto-reply comments</span></div>
                <div className="flex items-center gap-2"><Switch checked={aiCaptionCta} onCheckedChange={setAiCaptionCta} /><span className="text-xs text-muted-foreground">Include CTA</span></div>
              </div>
              {newPost.auto_reply_enabled && (
                <Input value={newPost.auto_reply_message} onChange={e => setNewPost(p => ({ ...p, auto_reply_message: e.target.value }))} placeholder="Auto-reply message for comments..." className="text-sm" />
              )}
              <div className="flex gap-2">
                <Button onClick={schedulePost} size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                  {newPost.scheduled_at ? <><Calendar className="h-3.5 w-3.5 mr-1" />Schedule</> : <><Send className="h-3.5 w-3.5 mr-1" />Save Draft</>}
                </Button>
                {newPost.caption && <Button size="sm" variant="outline" onClick={() => publishPost({ ...newPost, media_urls: newPost.media_url ? [newPost.media_url] : [] })} disabled={apiLoading}><Zap className="h-3.5 w-3.5 mr-1" />Publish Now</Button>}
              </div>
            </CardContent>
          </Card>

          {/* Content Analyzer */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" />Content Analyzer</h4>
              <Textarea value={aiAnalyzeCaption} onChange={e => setAiAnalyzeCaption(e.target.value)} placeholder="Paste a caption to analyze performance potential..." rows={2} className="text-sm" />
              <Button size="sm" onClick={analyzeContent} disabled={apiLoading || !aiAnalyzeCaption}><Brain className="h-3.5 w-3.5 mr-1" />Analyze</Button>
              {aiAnalyzeResult && (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{aiAnalyzeResult}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts list */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Posts Queue ({posts.length})</h4>
                <div className="flex gap-1.5 text-[10px] text-muted-foreground">
                  <Badge className="bg-green-500/15 text-green-400">{posts.filter(p => p.status === "published").length} published</Badge>
                  <Badge className="bg-yellow-500/15 text-yellow-400">{posts.filter(p => p.status === "scheduled").length} scheduled</Badge>
                  <Badge className="bg-muted text-muted-foreground">{posts.filter(p => p.status === "draft").length} drafts</Badge>
                </div>
              </div>
              {posts.length > 0 ? (
                <ScrollArea className="max-h-[350px]">
                  <div className="space-y-2">
                    {posts.map(p => (
                      <div key={p.id} className="bg-muted/30 rounded-lg p-3 flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            {p.platform === "instagram" ? <Instagram className="h-3 w-3 text-pink-400" /> : p.platform === "tiktok" ? <Music2 className="h-3 w-3 text-cyan-400" /> : p.platform === "twitter" ? <Twitter className="h-3 w-3 text-blue-400" /> : p.platform === "reddit" ? <Globe className="h-3 w-3 text-orange-400" /> : <Phone className="h-3 w-3 text-blue-400" />}
                            <Badge variant="outline" className="text-[10px]">{p.post_type}</Badge>
                            <Badge className={`text-[10px] ${p.status === "published" ? "bg-green-500/15 text-green-400" : p.status === "scheduled" ? "bg-yellow-500/15 text-yellow-400" : "bg-muted text-muted-foreground"}`}>{p.status}</Badge>
                          </div>
                          <p className="text-xs text-foreground line-clamp-2">{p.caption || "No caption"}</p>
                          {p.scheduled_at && <p className="text-[10px] text-muted-foreground mt-1"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{new Date(p.scheduled_at).toLocaleString()}</p>}
                        </div>
                        <div className="flex gap-1">
                          {p.status !== "published" && <Button size="sm" variant="ghost" onClick={() => publishPost(p)} className="h-7 w-7 p-0 text-green-400"><Send className="h-3 w-3" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)} className="h-7 w-7 p-0 text-red-400"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6"><Layers className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No posts yet — create your first one above</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ENGAGEMENT / COMMENTS ===== */}
        <TabsContent value="engagement" className="mt-4">
          <CommentsHub accountId={selectedAccount} connections={connections} callApi={callApi} apiLoading={apiLoading} onNavigateToSession={navigateToSessionCard} igSessionId={igSessionId} igSessionStatus={igSessionStatus} />
        </TabsContent>

        {/* ===== DMs ===== */}
        <TabsContent value="messaging" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Send className="h-4 w-4" />Send DM</h4>
              <Input value={dmRecipientId} onChange={e => setDmRecipientId(e.target.value)} placeholder="Recipient User ID / Conversation ID" className="text-sm" />
              <Textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} placeholder="Your message..." rows={3} className="text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={sendDM} disabled={apiLoading || !dmRecipientId || !dmMessage}><Send className="h-3.5 w-3.5 mr-1" />Send</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!dmMessage) return;
                  const d = await callApi("social-ai-responder", { action: "generate_dm_reply", params: { message_text: dmMessage, sender_name: "fan", auto_redirect_url: aiDmRedirectUrl, keywords_trigger: aiDmKeywords } });
                  if (d?.reply) { setDmMessage(d.reply); toast.success("AI generated — review and send"); }
                }} disabled={apiLoading}><Brain className="h-3.5 w-3.5 mr-1" />AI Reply</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AI TOOLS ===== */}
        <TabsContent value="ai-tools" className="mt-4">
          <SocialAITools selectedAccount={selectedAccount} />
        </TabsContent>

        {/* ===== ANALYTICS ===== */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-foreground" onClick={async () => {
              const d = await callApi("instagram-api", { action: "get_account_insights", params: { period: "day", metrics: "reach,impressions,profile_views,follower_count,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks,website_clicks" } });
              if (d) { toast.success("IG insights synced"); loadData(); }
            }} disabled={!igConnected || apiLoading}><Instagram className="h-3.5 w-3.5 mr-1" />Sync IG Insights</Button>
            <Button size="sm" variant="outline" className="text-foreground" onClick={async () => { await callApi("tiktok-api", { action: "get_user_info" }); toast.success("Updated"); loadData(); }} disabled={!ttConnected || apiLoading}><Music2 className="h-3.5 w-3.5 mr-1" />Sync TT</Button>
            <Button size="sm" variant="outline" className="text-foreground" onClick={async () => { await callApi("twitter-api", { action: "get_profile" }); toast.success("Updated"); loadData(); }} disabled={!xConnected || apiLoading}><Twitter className="h-3.5 w-3.5 mr-1" />Sync X</Button>
            <Button size="sm" variant="outline" className="text-foreground" onClick={async () => { await callApi("reddit-api", { action: "get_profile" }); toast.success("Updated"); loadData(); }} disabled={!redditConnected || apiLoading}><Globe className="h-3.5 w-3.5 mr-1" />Sync Reddit</Button>
            <Button size="sm" variant="outline" className="text-foreground" onClick={async () => { await callApi("telegram-api", { action: "get_me" }); toast.success("Updated"); loadData(); }} disabled={!telegramConnected || apiLoading}><Phone className="h-3.5 w-3.5 mr-1" />Sync TG</Button>
            <Button size="sm" variant="outline" className="text-foreground" onClick={async () => {
              const d = await callApi("instagram-api", { action: "get_media_insights", params: { limit: 10 } });
              if (d) toast.success("Media insights fetched");
            }} disabled={!igConnected || apiLoading}><BarChart3 className="h-3.5 w-3.5 mr-1" />Media Insights</Button>
          </div>

          {/* Platform overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {igProfile && (
              <Card className="border-pink-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1"><Instagram className="h-3 w-3 text-pink-400" /><span className="text-[10px] text-muted-foreground">Instagram</span></div>
                  <p className="text-lg font-bold text-foreground">{(igProfile.followers_count || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">followers · {(igProfile.media_count || 0)} posts</p>
                </CardContent>
              </Card>
            )}
            {ttProfile && (
              <Card className="border-cyan-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1"><Music2 className="h-3 w-3 text-cyan-400" /><span className="text-[10px] text-muted-foreground">TikTok</span></div>
                  <p className="text-lg font-bold text-foreground">{(ttProfile.follower_count || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">followers · {(ttProfile.likes_count || 0).toLocaleString()} likes</p>
                </CardContent>
              </Card>
            )}
            {xProfile && (
              <Card className="border-blue-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1"><Twitter className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">X/Twitter</span></div>
                  <p className="text-lg font-bold text-foreground">{(xProfile.public_metrics?.followers_count || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">followers</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1"><Activity className="h-3 w-3 text-green-400" /><span className="text-[10px] text-muted-foreground">Total Activity</span></div>
                <p className="text-lg font-bold text-foreground">{posts.length}</p>
                <p className="text-[9px] text-muted-foreground">posts · {commentReplies.length} replies</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics data */}
          {analytics.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Metrics History</h4>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-1.5">
                    {analytics.map(a => (
                      <div key={a.id} className="bg-muted/30 rounded-lg p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {a.platform === "instagram" ? <Instagram className="h-3 w-3 text-pink-400" /> : a.platform === "tiktok" ? <Music2 className="h-3 w-3 text-cyan-400" /> : <Globe className="h-3 w-3 text-blue-400" />}
                          <div>
                            <p className="text-xs font-medium text-foreground">{a.metric_type}</p>
                            <p className="text-[10px] text-muted-foreground">{a.platform} · {new Date(a.fetched_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-foreground">{a.metric_value?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-8 text-center"><BarChart3 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No analytics data yet</p><p className="text-xs text-muted-foreground/60 mt-1">Click the sync buttons above to pull real-time data from connected platforms</p></CardContent></Card>
          )}
        </TabsContent>

        {/* ===== BIO LINKS ===== */}
        <TabsContent value="biolink" className="mt-4">
          <BioLinksManager selectedAccount={selectedAccount} />
        </TabsContent>

        {/* ===== IG AUTOMATION SUITE ===== */}
        <TabsContent value="automation" className="mt-4">
          <IGAutomationSuite selectedAccount={selectedAccount} />
        </TabsContent>

        {/* ===== SOCIAL NETWORKS (X, Reddit, TG, TikTok) ===== */}
        <TabsContent value="social-networks" className="mt-4">
          <SocialNetworksTab selectedAccount={selectedAccount} onNavigateToConnect={navigateToConnect} />
        </TabsContent>

      </Tabs>
      ) : (
        <div className="space-y-4">
          <Tabs defaultValue="one-click" className="space-y-4">
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="one-click" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Zap className="h-3.5 w-3.5" /> One-Click Connect
              </TabsTrigger>
              <TabsTrigger value="session" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Key className="h-3.5 w-3.5" /> Session & Credentials
              </TabsTrigger>
            </TabsList>

            {/* ===== SESSION & CREDENTIALS SUBTAB ===== */}
            <TabsContent value="session" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Manual Connection</h4>
                  <p className="text-[10px] text-muted-foreground">Paste credentials directly if you already have them.</p>
                  <select value={connectForm.platform} onChange={e => setConnectForm(p => ({ ...p, platform: e.target.value }))} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                    {["instagram","facebook","tiktok","twitter","reddit","telegram","snapchat","threads","whatsapp","signal","youtube","pinterest","discord"].map(pl => (
                      <option key={pl} value={pl}>{pl.charAt(0).toUpperCase() + pl.slice(1)}</option>
                    ))}
                  </select>
                  {["instagram","facebook","threads","whatsapp"].includes(connectForm.platform) ? (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder={connectForm.platform === "whatsapp" ? "Phone Number" : "Username"} className="text-sm" />
                      <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder={connectForm.platform === "whatsapp" ? "Phone Number ID" : connectForm.platform === "facebook" ? "User/Page ID" : "User ID"} className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token" type="password" className="text-sm" />
                      <Button onClick={connectPlatform} disabled={loading} className="w-full"><Plus className="h-3.5 w-3.5 mr-1" />Connect {connectForm.platform}</Button>
                    </>
                  ) : (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Username / Handle" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token / API Key" type="password" className="text-sm" />
                      <Button onClick={connectPlatform} disabled={loading} className="w-full"><Plus className="h-3.5 w-3.5 mr-1" />Connect {connectForm.platform}</Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* IG Session Management */}
              <Card id="ig-session-section" className={`border-pink-500/20 transition-all ${igSessionPulse ? "ring-2 ring-pink-500/50 animate-pulse" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Key className="h-4 w-4 text-pink-400" />Instagram Session Cookie</h4>
                    <Badge className={igSessionStatus === "valid" ? "bg-green-500/15 text-green-400 text-[10px]" : igSessionStatus === "expired" ? "bg-red-500/15 text-red-400 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                      {igSessionStatus === "valid" ? "● Active" : igSessionStatus === "expired" ? "Expired" : "Not Set"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Required for private API features (follower fetching, story viewing, DM sending).</p>
                  <Input value={igSessionId} onChange={e => setIgSessionId(e.target.value)} placeholder="sessionid cookie value" type="password" className="text-sm font-mono" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={igCsrfToken} onChange={e => setIgCsrfToken(e.target.value)} placeholder="csrftoken (optional)" type="password" className="text-sm font-mono" />
                    <Input value={igDsUserId} onChange={e => setIgDsUserId(e.target.value)} placeholder="ds_user_id (optional)" className="text-sm font-mono" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveIgSessionData} disabled={igSessionLoading || !igSessionId}>{igSessionLoading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Save Session</Button>
                    <Button size="sm" variant="outline" onClick={testIgSession} disabled={igSessionLoading || !igSessionId}><Zap className="h-3 w-3 mr-1" />Test</Button>
                  </div>
                  {igSessionSavedAt && <p className="text-[10px] text-muted-foreground">Last saved: {new Date(igSessionSavedAt).toLocaleString()}</p>}
                </CardContent>
              </Card>

              {/* Connected accounts list */}
              {connections.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Wifi className="h-4 w-4 text-green-400" />Connected Accounts ({connections.filter(c => c.is_connected).length}/{connections.length})</h4>
                    <div className="space-y-3">
                      {connections.map(c => {
                        const meta = (c.metadata || {}) as any;
                        const profilePic = meta.profile_picture_url || meta.threads_profile_picture_url || meta.avatar_url || meta.profile_image_url || meta.icon_img || meta.picture_url || meta.thumbnail;
                        const name = meta.name || meta.display_name || meta.verified_name || meta.title || c.platform_username;
                        return (
                          <div key={c.id} className={`rounded-xl p-4 border ${c.is_connected ? "bg-green-500/5 border-green-500/20" : "bg-muted/20 border-border"}`}>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {profilePic ? (
                                  <img src={profilePic} alt={name} className="h-12 w-12 rounded-full object-cover border-2 border-green-500/30" />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-foreground truncate">{name}</p>
                                  {c.is_connected && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground">@{c.platform_username} · {c.platform}</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Badge className={c.is_connected ? "bg-green-500/15 text-green-400 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                                  {c.is_connected ? "● Live" : "Offline"}
                                </Badge>
                                {c.is_connected && (
                                  <Button size="sm" variant="ghost" onClick={() => disconnectPlatform(c.id)} className="text-red-400 text-xs h-6 px-2">
                                    <WifiOff className="h-3 w-3 mr-1" />Disconnect
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>ID: {c.platform_user_id || "—"}</span>
                              <span>·</span>
                              <span>Connected: {new Date(c.connected_at).toLocaleDateString()}</span>
                              {(meta.connected_via) && <><span>·</span><span>Via: {meta.connected_via}</span></>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ===== ONE-CLICK CONNECT SUBTAB ===== */}
            <TabsContent value="one-click" className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Connect Platforms</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tap to link your accounts instantly</p>
              </div>
              <div className="grid grid-cols-5 gap-2.5">
                {/* 1. Instagram - available */}
                {(() => {
                  const isLoading = igLoginPopupLoading;
                  return (
                    <button
                      id="instagram-connect-card"
                      onClick={openIgLoginPopup}
                      disabled={isLoading}
                      className={`group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-pink-500/40 hover:bg-pink-500/5 hover:shadow-[0_0_24px_-5px] hover:shadow-pink-500/20 disabled:opacity-50 disabled:pointer-events-none aspect-square ${highlightInstagram ? "border-pink-500/60 animate-connect-highlight" : "border-border/50"}`}
                      style={highlightInstagram ? { '--highlight-color': 'rgba(236,72,153,0.4)' } as React.CSSProperties : undefined}
                    >
                      {igConnected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                      {/* Disconnect button */}
                      {igConnected && (() => {
                        const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
                        return igConn ? (
                          <button
                            className="absolute bottom-1.5 left-1.5 text-red-400/60 hover:text-red-400 transition-colors z-10"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); disconnectPlatform(igConn.id); }}
                            title="Disconnect Instagram"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null;
                      })()}
                      <div className="relative">
                        {isLoading ? <Loader2 className="h-8 w-8 text-pink-400 animate-spin" /> : <Instagram className="h-8 w-8 text-pink-400 transition-all duration-300 group-hover/cube:text-pink-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]" />}
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">Connect Instagram</span>
                    </button>
                  );
                })()}

                {/* 2. TikTok - available (one-click like Instagram) */}
                {(() => {
                  const isLoading = autoConnectLoading === "tiktok" || ttLoginPopupLoading;
                  return (
                    <button
                      id="tiktok-connect-card"
                      onClick={openTtLoginPopup}
                      disabled={isLoading}
                      className={`group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/5 hover:shadow-[0_0_24px_-5px] hover:shadow-cyan-400/20 disabled:opacity-50 disabled:pointer-events-none aspect-square ${highlightTiktok ? "border-cyan-400/60 animate-connect-highlight" : "border-border/50"}`}
                      style={highlightTiktok ? { '--highlight-color': 'rgba(34,211,238,0.4)' } as React.CSSProperties : undefined}
                    >
                      {ttConnected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                      {ttConnected && (() => {
                        const ttConn = connections.find(c => c.platform === "tiktok" && c.is_connected);
                        return ttConn ? (
                          <button
                            className="absolute bottom-1.5 left-1.5 text-red-400/60 hover:text-red-400 transition-colors z-10"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); disconnectPlatform(ttConn.id); }}
                            title="Disconnect TikTok"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null;
                      })()}
                      <div className="relative">
                        {isLoading ? <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" /> : <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" fill="#00f2ea"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/></svg>}
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">Connect TikTok</span>
                    </button>
                  );
                })()}

                {/* 3. Facebook - available */}
                {(() => {
                  const isLoading = autoConnectLoading === "facebook";
                  return (
                    <div className="group/wrap relative" id="facebook-connect-card">
                      <button
                        onClick={() => automatedFacebookConnect()}
                        disabled={isLoading}
                        className={`group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/5 hover:shadow-[0_0_24px_-5px] hover:shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none aspect-square w-full ${highlightFacebook ? "border-blue-500/60 animate-connect-highlight" : "border-border/50"}`}
                        style={highlightFacebook ? { '--highlight-color': 'rgba(59,130,246,0.4)' } as React.CSSProperties : undefined}
                      >
                        {facebookConnected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                        {/* Disconnect button */}
                        {facebookConnected && (() => {
                          const fbConn = connections.find(c => c.platform === "facebook" && c.is_connected);
                          return fbConn ? (
                            <button
                              className="absolute bottom-1.5 left-1.5 text-red-400/60 hover:text-red-400 transition-colors z-10"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); disconnectPlatform(fbConn.id); }}
                              title="Disconnect Facebook"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null;
                        })()}
                        <div className="relative">
                          {isLoading ? <Loader2 className="h-8 w-8 text-blue-500 animate-spin" /> : (
                            <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">Connect Facebook</span>
                      </button>
                    </div>
                  );
                })()}

                {/* 4. Threads - available */}
                {(() => {
                  const p = { id: "threads", label: "Connect Threads", svgIcon: <svg viewBox="0 0 192 192" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(192,132,252,0.5)]" fill="currentColor"><path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C82.2364 44.745 69.7731 51.1399 62.1022 62.6747L75.7727 71.3821C81.1761 63.5292 89.268 59.6122 97.222 59.6122L97.278 59.6122C106.338 59.6665 113.17 62.4629 117.586 67.8906C120.755 71.7552 122.829 76.9676 123.793 83.4466C117.929 82.4062 111.534 81.9825 104.665 82.1792C82.4856 82.8102 68.1467 94.7389 69.0766 111.163C69.5497 119.502 73.5604 126.721 80.3757 131.552C86.1847 135.684 93.6258 137.742 101.379 137.363C111.344 136.866 119.239 132.871 124.654 125.607C128.641 120.289 131.219 113.485 132.553 104.854C137.467 107.83 141.145 111.752 143.251 116.533C146.886 124.647 147.068 138.247 136.398 148.917C127.051 158.265 115.818 162.697 97.364 162.837C76.7819 162.681 61.5251 156.296 51.2819 143.763C41.6667 131.989 36.6012 115.282 36.4329 94C36.6012 72.7178 41.6667 56.0107 51.2819 44.2365C61.5251 31.7035 76.7819 25.3185 97.364 25.1627C118.093 25.3197 133.627 31.7688 144.198 44.3827C149.359 50.5355 153.27 58.165 155.89 66.9742L170.186 63.0565C167.07 52.5024 162.307 43.4419 156.056 35.9973C142.95 20.4105 124.452 12.4483 97.406 12.2617L97.322 12.2617C70.4367 12.4471 52.17 20.4758 39.3082 36.0914C27.0166 51.012 20.7267 71.2753 20.5331 94.0419L20.5331 94.0419C20.7267 116.725 27.0166 136.988 39.3082 151.909C52.17 167.524 70.4367 175.553 97.322 175.738L97.406 175.738C119.394 175.572 133.776 169.793 145.684 157.885C161.961 141.608 161.496 121.068 156.384 109.483C152.716 101.175 146.059 94.3498 141.537 88.9883ZM100.885 123.532C90.3552 124.072 82.5765 118.403 82.1001 108.85C81.7364 101.638 86.6254 93.2956 104.962 92.7273C107.887 92.6432 110.734 92.7217 113.491 92.957C112.222 107.725 107.531 123.194 100.885 123.532Z"/></svg>, hoverBorder: "hover:border-purple-400/40", hoverBg: "hover:bg-purple-400/5", hoverShadow: "hover:shadow-purple-400/20", connected: threadsConnected, action: automatedThreadsConnect };
                  const isLoading = autoConnectLoading === p.id;
                  return (
                    <div className="group/wrap relative" id="threads-connect-card">
                      <button
                        onClick={() => p.action()}
                        disabled={isLoading}
                        className={`group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-300 ${p.hoverBorder} ${p.hoverBg} hover:shadow-[0_0_24px_-5px] ${p.hoverShadow} disabled:opacity-50 disabled:pointer-events-none aspect-square w-full ${highlightThreads ? "border-purple-400/60 animate-connect-highlight" : "border-border/50"}`}
                        style={highlightThreads ? { '--highlight-color': 'rgba(192,132,252,0.4)' } as React.CSSProperties : undefined}
                      >
                        {p.connected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                        {p.connected && (() => {
                          const thConn = connections.find(c => c.platform === "threads" && c.is_connected);
                          return thConn ? (
                            <button
                              className="absolute bottom-1.5 left-1.5 text-red-400/60 hover:text-red-400 transition-colors z-10"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); disconnectPlatform(thConn.id); }}
                              title="Disconnect Threads"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null;
                        })()}
                        <div className="relative">{isLoading ? <Loader2 className="h-8 w-8 animate-spin opacity-60" /> : p.svgIcon}</div>
                        <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">{p.label}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* 5. WhatsApp + all others - greyed out / Available Soon */}
                {[
                  { label: "WhatsApp", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
                  { label: "X", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                  { label: "Reddit", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#FF4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg> },
                  { label: "Telegram", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                  { label: "Snapchat", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#FFFC00"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.032.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .299.04.382.076a.647.647 0 0 1 .3.3c.063.132.079.291.044.451-.075.389-.477.63-.815.771a5.1 5.1 0 0 1-.362.12c-.122.036-.244.075-.387.15-.19.1-.316.278-.396.528-.079.24-.048.481.045.714a6.7 6.7 0 0 0 .316.57c.015.024.03.045.046.068.54.825 1.23 1.473 2.051 1.932.273.149.57.27.865.361.166.049.361.119.46.2a.553.553 0 0 1 .179.293c.06.285-.09.478-.235.586-.232.166-.567.26-.78.3-.346.064-.654.118-.939.328-.165.122-.32.306-.48.509a9.186 9.186 0 0 1-.371.433c-.36.4-.825.6-1.395.6-.304 0-.636-.054-.965-.161-.578-.191-1.068-.307-1.494-.36-1.694.27-3.16 1.337-3.88 1.793-.157.1-.27.168-.378.229-.387.211-.742.319-1.085.319-.349 0-.71-.111-1.104-.328a6.15 6.15 0 0 1-.331-.198c-.69-.43-2.146-1.5-3.867-1.793-.422.053-.909.169-1.482.36-.335.107-.672.161-.98.161a2.29 2.29 0 0 1-1.371-.576c-.159-.13-.291-.3-.372-.436-.284-.465-.272-.689-.479-.809a5.15 5.15 0 0 0-.938-.328c-.213-.04-.547-.134-.779-.3-.143-.107-.294-.3-.234-.587.022-.11.075-.211.179-.293.098-.08.293-.149.458-.2.293-.09.59-.21.863-.36.821-.457 1.513-1.106 2.053-1.932.016-.023.032-.045.046-.07.105-.16.21-.33.316-.569.093-.233.124-.474.046-.714-.08-.25-.206-.427-.396-.528a3.022 3.022 0 0 0-.387-.15 5.1 5.1 0 0 1-.363-.12c-.338-.14-.74-.382-.815-.77a.565.565 0 0 1 .044-.452.645.645 0 0 1 .3-.3c.084-.036.199-.076.382-.076.12 0 .299.015.463.104.376.182.735.317 1.034.3.199 0 .326-.044.401-.088l-.033-.51-.003-.06c-.104-1.63-.23-3.654.3-4.848C7.46 1.07 10.804.793 11.794.793h.412z"/></svg> },
                  { label: "YouTube", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                  { label: "Pinterest", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/></svg> },
                  { label: "Discord", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#5865F2"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg> },
                  { label: "LinkedIn", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                ].map(p => (
                  <div key={p.label} className="relative">
                    <div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/30 bg-card/20 aspect-square w-full opacity-40 cursor-not-allowed select-none">
                      <div className="relative grayscale">{p.svgIcon}</div>
                      <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">{p.label}</span>
                      <span className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider">Available Soon</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default SocialMediaHub;
